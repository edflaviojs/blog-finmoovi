/**
 * fact-guard.js — "Fact Firewall" anti-alucinacao para conteudo YMYL (Secao 42.13).
 *
 * Um unico dado inventado (ex.: "segundo um estudo da Caixa..." inexistente) pode
 * derrubar a confianca do SITE inteiro. Principio: rascunho de IA e materia-prima,
 * nao produto. O que nao tem fonte confiavel, CORTA (nao suaviza).
 *
 * Modulo PURO (sem IA, sem rede). Detecta e limpa:
 *   1. LINKS externos fabricados — dominio fora da allowlist de fontes confiaveis.
 *   2. CITACOES nao verificaveis — frase que cita estudo/pesquisa + porcentagem OU
 *      atribuicao a uma fonte, MAS sem link para uma fonte confiavel (o padrao exato
 *      da alucinacao YMYL).
 *
 * Filosofia "corta, nao suaviza": remove a FRASE/o link ofensor. Se depois o texto
 * seguir integro -> ok; se ficar capenga (encolheu demais) -> sinaliza BLOQUEIO.
 * NAO conserta inventando; so corta ou bloqueia. Nao toca em numeros que sao
 * exemplos didaticos (ex.: "um salario de R$ 3.000") — so o que cita estudo/fonte.
 */

// Dominios externos confiaveis (oficiais/autoritativos) — os realmente usados no
// acervo + fontes oficiais. Link para fora daqui e tratado como nao verificado.
export const ALLOWED_DOMAINS = new Set([
  'bcb.gov.br', 'gov.br', 'tesourodireto.com.br', 'tesouronacional.gov.br',
  'ibge.gov.br', 'receita.fazenda.gov.br', 'serasa.com.br', 'b3.com.br',
  'cvm.gov.br', 'fgc.org.br', 'previdencia.gov.br', 'caixa.gov.br', 'bb.com.br',
  'investopedia.com', 'nerdwallet.com', 'finmoovi.com', 'finmoovi.com.br',
]);

/** O dominio de uma URL esta na allowlist (compara sufixo, ignora www/subdominio)? */
export function isAllowedUrl(url) {
  let host;
  try { host = new URL(url).hostname.toLowerCase().replace(/^www\./, ''); }
  catch { return false; }
  for (const d of ALLOWED_DOMAINS) {
    if (host === d || host.endsWith(`.${d}`)) return true;
  }
  return false;
}

// Palavras que indicam CITACAO de estudo/dado (risco de fabricacao). Estreito de
// proposito: "relatorio/indice/report" ficaram FORA (casavam com features do produto,
// ex.: "relatorios inteligentes" nas CTAs).
const STUDY_RE = /\b(estudos?|pesquisas?|levantamentos?|surveys?|study|studies|research)\b/i;
// Verbos/expressoes de atribuicao a uma fonte.
const ATTR_RE = /\b(de acordo com|segundo (?:o|a|os|as|um|uma|dados|estudos?|pesquisas?)|conforme (?:o|a|os|as|um|uma|dados)|apontou|revelou|mostrou que|according to|based on a|seg[uu]n (?:un|una|el|la|datos|estudios?)|de acuerdo con)\b/i;
// Porcentagem explicita (o formato classico da estatistica inventada).
const PCT_RE = /\d+([.,]\d+)?\s*%/;
// Placeholder de link mascarado (nao aparece em markdown nem colide com numeros).
const PH_RE = /@@L(\d+)@@/g;

const wordCount = t => (String(t).trim().match(/\S+/g) || []).length;

/**
 * Analisa e limpa um corpo de post.
 * @returns {{cleaned:string, linkStrips:Array, cuts:Array, flags:Array, blocked:boolean, reason?:string}}
 * - linkStrips: links externos fora da allowlist removidos (viram texto).
 * - cuts: frases citando estudo/pesquisa + %/atribuicao SEM link confiavel (removidas).
 * - flags: atribuicoes "de acordo com X" sem link confiavel — so reportadas.
 */
export function analyzeContent(body, { minKeepRatio = 0.6, minWords = 250 } = {}) {
  const linkStrips = [], cuts = [], flags = [];
  const original = body;

  // 1) Remove links externos fora da allowlist (mantem o texto do link).
  let out = body.replace(/(!?)\[([^\]\[]*)\]\((https?:\/\/[^)]+)\)/g, (m, bang, text, url) => {
    if (bang === '!') return m;
    if (isAllowedUrl(url)) return m;
    linkStrips.push({ url, text });
    return text; // desembrulha: fonte nao confiavel nao vira link
  });

  // 2) Varre linha a linha; corta frases com citacao de estudo/dado sem link confiavel.
  const lines = out.split('\n');
  const kept = [];
  for (const line of lines) {
    // Nao mexe em headings, imagens, tabelas, comentario de schema, codigo, citacoes.
    if (/^\s*(#|!\[|<!--|\||```|>)/.test(line) || line.trim() === '') { kept.push(line); continue; }

    // Mascara TODOS os links markdown (a URL nao pode quebrar a divisao de frases nem
    // casar gatilhos). Guarda se cada link aponta p/ FONTE externa confiavel.
    const links = [];
    const masked = line.replace(/!?\[[^\]\[]*\]\([^)]*\)/g, (mm) => {
      const um = mm.match(/\(([^)]*)\)/);
      const url = um ? um[1] : '';
      const trusted = /^https?:\/\//i.test(url) ? isAllowedUrl(url) : false;
      links.push({ raw: mm, trusted });
      return `@@L${links.length - 1}@@`;
    });
    const restore = s => s.replace(PH_RE, (m, i) => links[+i].raw);
    const trustedIn = s => [...s.matchAll(PH_RE)].some(m => links[+m[1]].trusted);

    const sentences = masked.match(/[^.!?]+[.!?]*/g) || [masked];
    const rebuilt = [];
    for (const s of sentences) {
      const isClaim = STUDY_RE.test(s) && (PCT_RE.test(s) || ATTR_RE.test(s));
      if (isClaim && !trustedIn(s)) { cuts.push(restore(s).trim()); continue; }          // CORTA
      if (ATTR_RE.test(s) && !trustedIn(s) && /[A-ZA-Y]/.test(s)) flags.push(restore(s).trim()); // sinaliza
      rebuilt.push(s);
    }
    kept.push(restore(rebuilt.join('')));
  }
  out = kept.join('\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n');

  // 3) Integridade: encolheu demais? -> bloqueia (nao publica).
  const ratio = wordCount(original) ? wordCount(out) / wordCount(original) : 1;
  const blocked = wordCount(out) < minWords || ratio < minKeepRatio;
  const reason = blocked ? `pos-corte com ${wordCount(out)} palavras (ratio ${ratio.toFixed(2)})` : undefined;

  return { cleaned: out, linkStrips, cuts, flags, blocked, reason };
}

/** Bloco de instrucoes anti-alucinacao para injetar em prompts de geracao. */
export const FACT_GUARD_PROMPT =
  'REGRAS ANTIALUCINACAO (YMYL — obrigatorias): NAO invente estatisticas, numeros, ' +
  'taxas, aliquotas nem cite estudos/pesquisas/relatorios de instituicoes especificas ' +
  '(ex.: "segundo um estudo da Caixa"). So afirme dado duro se vier de fonte oficial e ' +
  'voce incluir o link real (bcb.gov.br, tesourodireto.com.br, ibge.gov.br, gov.br, ' +
  'cvm.gov.br, serasa.com.br). Sem fonte confiavel, escreva de forma qualitativa ou ' +
  'omita. Estrutura answer-first. Prefira sua experiencia pratica a numeros fabricados.';

export default { ALLOWED_DOMAINS, isAllowedUrl, analyzeContent, FACT_GUARD_PROMPT };
