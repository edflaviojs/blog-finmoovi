/**
 * year-guard.js — guarda anti-ano-defasado para títulos gerados por LLM.
 *
 * Problema: o modelo escreve o ano do seu training data (ex.: "Guia Prático
 * para 2024") em títulos, mesmo com o prompt pedindo conteúdo atual. Um título
 * com ano velho mata o CTR e a credibilidade do post no dia em que nasce.
 *
 * Módulo PURO (sem IA, sem rede, determinístico, nunca lança exceção):
 *   - fixStaleYear(text): substitui qualquer ano 20xx MENOR que o ano atual
 *     pelo ano atual. Anos >= atual (inclusive futuros) ficam intactos. Também
 *     remove o ano PENDURADO no fim (ver stripDanglingYear).
 *   - stripDanglingYear(text): remove o ano solto no fim do título quando a
 *     frase já acabou em pontuação.
 *   - CURRENT_YEAR: ano atual, para injetar em prompts via template literal.
 *
 * Mesmo estilo/module-system (ESM) de fact-guard.js e seo-guard.js.
 */

/** Ano atual (avaliado no load do módulo) — para injetar em prompts. */
export const CURRENT_YEAR = new Date().getFullYear();

// Ano 20xx isolado por word boundary (não casa "12024" nem "2024a").
const YEAR_RE = /\b(20\d{2})\b/g;

// Ano PENDURADO: a frase já fechou e o ano vem depois, solto.
// Ex.: "Como evitar perder o prazo das contas e acabar no aperto? 2026"
// O sinal antes do ano é a prova de que a frase acabou — sem ele o ano faz
// parte do título e é legítimo ("Investimentos para o segundo semestre de 2026",
// "Guia de finanças 2026"), por isso NÃO é tocado.
//
// Dois casos, com destinos diferentes:
//   FIM DE FRASE (? ! . : ; …) — a pontuação FICA, só o ano sai.
//   SEPARADOR (— – | -)        — sai TAMBÉM, senão fica um traço órfão a apontar
//                                para nada ("Guia de orçamento —").
//
// O separador EXIGE espaço antes dele. Sem essa exigência, "Retrospectiva
// 2025-2026" perdia o segundo ano e virava "Retrospectiva 2025": hífen colado
// entre dois números é INTERVALO, não separador.
const DANGLING_YEAR_RE = /([?!.:;…])\s*20\d{2}\s*$/;
const DANGLING_YEAR_SEP_RE = /\s+[—–|-]\s*20\d{2}\s*$/;

/**
 * Remove o ano solto no fim do título quando a frase já terminou em pontuação.
 * Conserva a pontuação. Determinístico, nunca lança.
 *
 * O modelo produz isto quando o prompt diz "se mencionar ano, use 2026": em vez
 * de escrever o ano DENTRO da frase, cola-o no fim como apêndice. Observado em
 * 06/08/2026 no gerador de Soluções, em PT e ES (o EN escapou por acaso).
 *
 * @param {string} text
 * @returns {{text:string, changed:boolean, original:string}}
 */
export function stripDanglingYear(text) {
  const original = text;
  try {
    if (typeof text !== 'string' || text === '') {
      return { text: original, changed: false, original };
    }
    const fixed = text
      .replace(DANGLING_YEAR_SEP_RE, '')
      .replace(DANGLING_YEAR_RE, '$1')
      .trimEnd();
    return { text: fixed, changed: fixed !== original, original };
  } catch {
    return { text: original, changed: false, original };
  }
}

/**
 * Corrige anos defasados (20xx < ano atual) em um texto, trocando pelo ano atual.
 * Anos iguais ou maiores que o atual (ex.: retrospectivas do ano corrente ou
 * projeções para o ano seguinte) NÃO são tocados.
 *
 * Determinístico, sem rede, nunca lança: em qualquer erro, devolve o texto
 * original com changed=false.
 *
 * @param {string} text  Texto (tipicamente um título) a verificar.
 * @param {Date}   [now] Data de referência (default: agora) — facilita teste.
 * @returns {{text:string, changed:boolean, original:string}}
 */
export function fixStaleYear(text, now = new Date()) {
  const original = text;
  try {
    if (typeof text !== 'string' || text === '') {
      return { text: original, changed: false, original };
    }
    const currentYear = now.getFullYear();
    if (!Number.isFinite(currentYear)) {
      return { text: original, changed: false, original };
    }
    let changed = false;
    const fixed = text.replace(YEAR_RE, (match) => {
      const year = Number(match);
      if (year < currentYear) { changed = true; return String(currentYear); }
      return match; // ano atual ou futuro: intacto
    });
    // Ano pendurado no fim entra AQUI, e não numa chamada nova em cada gerador:
    // os 10 geradores já passam o título por esta função, então o conserto
    // chega a todos sem tocar em 10 ficheiros. Corre DEPOIS da troca do ano
    // velho, para apanhar também o caso "…aperto? 2024" → "…aperto? 2026" → "…aperto?".
    const dangling = stripDanglingYear(fixed);
    return { text: dangling.text, changed: changed || dangling.changed, original };
  } catch {
    return { text: original, changed: false, original };
  }
}

export default { fixStaleYear, stripDanglingYear, CURRENT_YEAR };
