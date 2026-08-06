/**
 * termo-guard.js — guarda de FORMA do termo de glossário.
 *
 * Um glossário define SUBSTANTIVOS ("juros compostos", "liquidez"). Keyword de
 * SEO vem noutros formatos, e cada um deles virava um verbete com nome quebrado
 * — dívida permanente no site, porque a URL fica:
 *   pergunta     "como poupar dinheiro"          -> recusa
 *   listicle     "melhores investimentos"        -> recusa
 *   telegráfico  "poupar dinheiro dicas"         -> recusa (listicle)
 *   AÇÃO         "meios de economizar energia"   -> recusa (06/08/2026)
 *   AÇÃO         "guardar dinheiro"              -> recusa (06/08/2026)
 *
 * Os dois últimos formatos passavam. Não são temas maus — "economizar na conta
 * de luz" é assunto legítimo de finanças pessoais — são maus VERBETES. O sítio
 * deles é um artigo, e é para lá que voltam (a rotação A-Z assume a vez).
 *
 * Vivia dentro de glossario-auto-diario.js, que chama `main()` no fim do
 * ficheiro: importá-lo num teste correria o gerador inteiro (com chamadas de
 * IA). Mudou-se para cá em 06/08/2026 para poder ter prova automática, sem pôr
 * guarda no `main()` — guarda de arranque que falha deixa o robô a não fazer
 * nada em silêncio, e este projeto já foi mordido por isso.
 *
 * Módulo PURO (sem IA, sem rede, sem fs, determinístico, nunca lança), no mesmo
 * estilo de year-guard.js, link-guard.js e seo-guard.js.
 * Custo zero de propósito: a cota de IA é o gargalo do projeto.
 */

/**
 * Keyword da fila → termo do glossário: remove prefixos/sufixos de pergunta
 * ("o que é X" → "X"), preservando acentos/grafia do restante. Mesma família de
 * prefixos do coveredByGlossario (keyword-queue.js).
 *
 * @param {string} keyword
 * @returns {string}
 */
export function glossaryTermFromKeyword(keyword) {
  const kw = String(keyword || '').replace(/\s+/g, ' ').trim();
  const core = kw
    .replace(/^(o que (é|e|são|sao|significa)|que (é|e)|significado de|defini[çc][ãa]o de)\s+/i, '')
    .replace(/\s+(o que (é|e)|significado|defini[çc][ãa]o)$/i, '')
    .trim();
  return core || kw;
}

/**
 * True se o termo PARECE um conceito de glossário. Heurística de custo zero
 * (sem chamada de IA). Na dúvida recusa: publicar verbete com nome quebrado é
 * dívida permanente; recusar só devolve a vez à rotação A-Z.
 *
 * @param {string} term  Termo já limpo por glossaryTermFromKeyword.
 * @returns {boolean}
 */
export function keywordLooksLikeConcept(term) {
  const t = String(term || '').trim().toLowerCase();
  if (!t) return false;
  const startsWithQuestion = /^(como|o que|quando|por que|porque|qual|quais|onde|vale a pena)\b/.test(t);
  const hasListicleModifier = /\b(dicas|melhores|passo a passo|guia|truques|erros)\b/.test(t);
  const tooManyWords = t.split(/\s+/).filter(Boolean).length > 5;
  // AÇÃO, não conceito. Dois formatos: "formas/meios/maneiras/jeitos de X", e
  // frase que começa por verbo. A lista de verbos é CURADA de propósito: regra
  // genérica por terminação (-ar/-er/-ir) apanharia substantivos legítimos como
  // "dólar", "lastro" ou "poder de compra".
  const isActionPhrase = /^(formas?|meios?|maneiras?|jeitos?)\s+de\b/.test(t);
  const startsWithVerb = /^(guardar|gastar|economizar|poupar|investir|juntar|comprar|pagar|ganhar|controlar|organizar|reduzir|cortar|sair|fazer|montar|escolher|conseguir)\b/.test(t);
  return !startsWithQuestion && !hasListicleModifier && !tooManyWords
    && !isActionPhrase && !startsWithVerb;
}

export default { glossaryTermFromKeyword, keywordLooksLikeConcept };
