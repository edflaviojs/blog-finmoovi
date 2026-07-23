/**
 * lang-guard.js — Trava de idioma para conteúdo EN/ES (fonte única)
 *
 * Contexto: 111 arquivos EN/ES foram publicados silenciosamente com corpo em
 * português ao longo de meses. Esta lib centraliza a heurística de detecção
 * que antes vivia inline em traduzir-glossario.js e a expõe em 3 camadas:
 *
 *   1. looksWrongLanguage(body, expectedLocale) — função PURA (só regex),
 *      usada por: traduzir-glossario.js (skip), traducao-sweep.js (autocura),
 *      validar-i18n.js (aviso) e status.astro (visibilidade em build time).
 *   2. guardedTranslate(fn, locale, label) — wrapper de PREVENÇÃO nos
 *      geradores: 1 retry se a tradução reprovar; se reprovar de novo, grava
 *      mesmo assim MAS emite ::warning:: visível no Actions (nunca bloqueia
 *      a publicação PT).
 *
 * Heurística (adaptada da original de traduzir-glossario.js, calibrada contra
 * o acervo real — o glossário EN/ES cita termos PT como "poupança"/"Ações" e
 * cidades como "São Paulo" legitimamente, então acento sozinho NÃO reprova):
 *   - EN errado se stopwords PT aparecem em VOLUME (≥6) ou em volume menor
 *     combinado com muitos acentos (≥3 stopwords E ≥15 acentos).
 *   - ES errado se stopwords EXCLUSIVAS de PT (não/são/uma/mais/também/...)
 *     aparecem em volume, OU se o corpo não tem NENHUM marcador de espanhol
 *     (ñ/¿/¡/qué/cómo/más/dinero/...).
 *   - "são"/"sao" só conta em minúsculo ("São Paulo"/"São José" não contam).
 *   - Imagens markdown, URLs e code blocks são removidos antes da análise
 *     (alt text PT é mantido de propósito pelos geradores e não pode contar).
 *
 * Módulo sem dependências (fs/apis) — importável do Astro em build time.
 */

/** Remove trechos que não são prosa (imagens, URLs, code blocks). */
function stripNonProse(text) {
  return String(text || '')
    .replace(/```[\s\S]*?```/g, ' ')          // code blocks
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')    // imagens inteiras (alt pode ser PT de propósito)
    .replace(/\]\(([^)]*)\)/g, '] ')          // URLs de links (mantém o texto do link)
    .replace(/https?:\/\/\S+/g, ' ');
}

// Acentos PT/ES (só apoiam a decisão — nunca reprovam sozinhos).
const PT_ACCENTS_RE = /[ãõçáàâéêíóôú]/gi;
// Stopwords PT para o check de EN (que/como/para também são ES — igualmente
// erradas num corpo EN). "são/sao" fica FORA daqui: conta só em minúsculo.
const PT_STOPWORDS_EN_RE = /\b(que|não|nao|como|para|uma|pode|mais|também|você|voce|dinheiro)\b/gi;
// Stopwords EXCLUSIVAS de PT para o check de ES (nada que exista em espanhol).
const PT_ONLY_STOPWORDS_ES_RE = /\b(não|nao|uma|pode|mais|também|você|voce|dinheiro|isso|muito)\b/gi;
// "são/sao" minúsculo (case-sensitive): "São Paulo"/"São José" não contam.
const SAO_LOWER_RE = /\b(são|sao)\b/g;
// Marcadores exclusivos de PT (não existem em ES): ã, õ, ç ("ção", "não"...).
const PT_ONLY_MARKS_RE = /[ãõç]/gi;
// Marcadores de espanhol: pontuação exclusiva + palavras comuns com grafia ES.
const ES_PUNCT_RE = /[ñ¿¡]/g;
const ES_WORDS_RE = /\b(qué|cómo|más|también|según|así|dinero|inversión|ahorro|años?)\b/gi;

// Thresholds calibrados no acervo real: um corpo genuinamente em PT dispara
// dezenas de stopwords; um corpo EN/ES legítimo citando "poupança", "Ações"
// ou "São Paulo" fica bem abaixo.
const MIN_STOPS_ALONE = 6;   // stopwords PT bastam sozinhas
const MIN_STOPS_COMBO = 3;   // ...ou menos stopwords + muitos acentos (EN)
const MIN_ACCENTS_COMBO = 15;
const MIN_PT_ONLY_ES = 5;    // ES: stopwords exclusivas de PT
const MIN_PT_COMBO_ES = 2;   // ...ou menos stopwords + muitos ã/õ/ç
const MIN_MARKS_COMBO_ES = 10;
const MIN_BODY_LEN = 80;

const count = (text, re) => (text.match(re) || []).length;

/**
 * Detecta se `body` parece estar no idioma ERRADO para `expectedLocale`.
 * Pura (só regex) — nunca lança. Retorna { wrong: boolean, reason: string }.
 */
export function looksWrongLanguage(body, expectedLocale) {
  const text = stripNonProse(body);
  if (text.replace(/\s+/g, ' ').trim().length < MIN_BODY_LEN) {
    return { wrong: false, reason: 'corpo curto demais para avaliar' };
  }

  if (expectedLocale === 'en') {
    const stops = count(text, PT_STOPWORDS_EN_RE) + count(text, SAO_LOWER_RE);
    const accents = count(text, PT_ACCENTS_RE);
    if (stops >= MIN_STOPS_ALONE || (stops >= MIN_STOPS_COMBO && accents >= MIN_ACCENTS_COMBO)) {
      return { wrong: true, reason: `corpo parece PT/ES (${stops} stopword(s) PT, ${accents} acento(s))` };
    }
    return { wrong: false, reason: 'ok' };
  }

  if (expectedLocale === 'es') {
    const ptStops = count(text, PT_ONLY_STOPWORDS_ES_RE) + count(text, SAO_LOWER_RE);
    const ptMarks = count(text, PT_ONLY_MARKS_RE);
    if (ptStops >= MIN_PT_ONLY_ES || (ptStops >= MIN_PT_COMBO_ES && ptMarks >= MIN_MARKS_COMBO_ES)) {
      return { wrong: true, reason: `corpo parece PT (${ptStops} stopword(s) exclusivas de PT, ${ptMarks} marcador(es) ã/õ/ç)` };
    }
    const esMarks = count(text, ES_PUNCT_RE) + count(text, ES_WORDS_RE);
    if (esMarks === 0) {
      return { wrong: true, reason: 'sem nenhum marcador de espanhol (ñ/¿/¡/qué/cómo/dinero/...)' };
    }
    return { wrong: false, reason: 'ok' };
  }

  return { wrong: false, reason: `locale "${expectedLocale}" sem heurística (só en/es)` };
}

/** Extrai o corpo verificável de um resultado de tradução (string ou objeto). */
function pickBody(out) {
  if (typeof out === 'string') return out;
  if (out && typeof out === 'object') return String(out.content ?? out.body ?? '');
  return '';
}

/**
 * PREVENÇÃO nos geradores: executa `translateFn` (closure sem argumentos que
 * refaz a tradução), valida com looksWrongLanguage e dá 1 retry se reprovar.
 * Se reprovar de novo, DEVOLVE o resultado mesmo assim (a publicação PT nunca
 * é bloqueada) e emite ::warning:: bem visível no GitHub Actions.
 * Nunca lança por causa do guard — só propaga erro da PRIMEIRA tentativa.
 */
export async function guardedTranslate(translateFn, expectedLocale, label) {
  let result = await translateFn();
  let check = looksWrongLanguage(pickBody(result), expectedLocale);
  if (!check.wrong) return result;

  console.log(`⚠️ lang-guard: tradução ${expectedLocale.toUpperCase()} suspeita em "${label}" (${check.reason}) — refazendo (1 retry)...`);
  try {
    const retry = await translateFn();
    const recheck = looksWrongLanguage(pickBody(retry), expectedLocale);
    if (!recheck.wrong) {
      console.log(`✅ lang-guard: retry da tradução ${expectedLocale.toUpperCase()} passou.`);
      return retry;
    }
    result = retry;
    check = recheck;
  } catch (e) {
    console.log(`⚠️ lang-guard: retry falhou (${e.message}) — mantendo a 1ª tradução.`);
  }
  console.log(`::warning::tradução suspeita: ${label} (${expectedLocale}: ${check.reason}) — publicada mesmo assim; o sweep semanal (traducao-sweep) tentará corrigir.`);
  return result;
}
