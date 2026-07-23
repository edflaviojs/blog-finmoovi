/**
 * year-guard.js — guarda anti-ano-defasado para títulos gerados por LLM.
 *
 * Problema: o modelo escreve o ano do seu training data (ex.: "Guia Prático
 * para 2024") em títulos, mesmo com o prompt pedindo conteúdo atual. Um título
 * com ano velho mata o CTR e a credibilidade do post no dia em que nasce.
 *
 * Módulo PURO (sem IA, sem rede, determinístico, nunca lança exceção):
 *   - fixStaleYear(text): substitui qualquer ano 20xx MENOR que o ano atual
 *     pelo ano atual. Anos >= atual (inclusive futuros) ficam intactos.
 *   - CURRENT_YEAR: ano atual, para injetar em prompts via template literal.
 *
 * Mesmo estilo/module-system (ESM) de fact-guard.js e seo-guard.js.
 */

/** Ano atual (avaliado no load do módulo) — para injetar em prompts. */
export const CURRENT_YEAR = new Date().getFullYear();

// Ano 20xx isolado por word boundary (não casa "12024" nem "2024a").
const YEAR_RE = /\b(20\d{2})\b/g;

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
    return { text: fixed, changed, original };
  } catch {
    return { text: original, changed: false, original };
  }
}

export default { fixStaleYear, CURRENT_YEAR };
