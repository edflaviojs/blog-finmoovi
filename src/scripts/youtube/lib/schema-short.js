/**
 * Schema + validador do ROTEIRO DE SHORT (fábrica de Shorts — F1, IMPLEMENTACAO20).
 *
 * O roteirista (roteiro-short.js) transforma um termo do glossário num roteiro
 * por CENAS em JSON. Este módulo define o formato esperado e REJEITA roteiros
 * fora do padrão editorial do PRD (seção 3b — Funil de Retenção, adaptado para
 * Shorts de motion graphics). Nada de vídeo de estoque: só visuais próprios.
 *
 * Estrutura de um roteiro:
 * {
 *   slug, term, category, keyword,        // metadados
 *   scenes: [ { id, role, narration, onScreenText, visual, durationSec } ],
 *   cta: { text, target },                // 'app' | 'blog'
 *   totalDurationSec
 * }
 *
 * Regras duras (viram erro): 1 cena 'hook' no início (keyword FALADA nela),
 * ≥1 'beat', 1 'cta' no PENÚLTIMO lugar, 1 'outro' no fim, duração 30–60s,
 * bordão presente 1×, visual sem 'broll'. Regras leves viram aviso.
 */

// Bordão oficial do canal (PRD 3b — inserir 1× por vídeo)
export const BORDAO = 'Dinheiro sem controle é dinheiro dos outros.';

// Papéis de cena, na ordem editorial do funil de retenção
export const SHORT_ROLES = ['hook', 'beat', 'cta', 'outro'];

// Tipos de visual — MOTION GRAPHICS apenas (decisão do dono 20/07). 'broll'
// (vídeo de estoque) fica FORA da F1 de propósito.
export const VISUAL_TYPES = ['title', 'number', 'chart', 'list', 'formula', 'statement'];

// Limites de duração de um Short (YouTube: máx 60s)
export const MIN_TOTAL_SEC = 30;
export const MAX_TOTAL_SEC = 60;

// Texto em tela deve ser curto/legível (regra language-neutral do PRD 3c)
const MAX_ONSCREEN_CHARS = 42;

// Normaliza para comparar keyword ignorando acento/caixa
function norm(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/**
 * Valida um objeto de roteiro. Retorna { ok, errors, warnings }.
 * `errors` bloqueiam a produção; `warnings` são avisos de qualidade.
 */
export function validateShortScript(script) {
  const errors = [];
  const warnings = [];

  if (!script || typeof script !== 'object') {
    return { ok: false, errors: ['roteiro não é um objeto JSON'], warnings };
  }

  // Metadados obrigatórios
  for (const field of ['slug', 'term', 'keyword']) {
    if (!script[field] || typeof script[field] !== 'string') {
      errors.push(`campo "${field}" ausente ou inválido`);
    }
  }

  const scenes = Array.isArray(script.scenes) ? script.scenes : null;
  if (!scenes || scenes.length === 0) {
    errors.push('roteiro sem "scenes" (array de cenas)');
    return { ok: errors.length === 0, errors, warnings };
  }

  // --- Estrutura de papéis (funil de retenção) ---
  const roles = scenes.map(s => s.role);

  if (roles[0] !== 'hook') errors.push('a 1ª cena precisa ter role "hook" (cold open)');
  if (roles.filter(r => r === 'hook').length !== 1) errors.push('deve haver exatamente 1 cena "hook"');

  if (roles[roles.length - 1] !== 'outro') errors.push('a última cena precisa ter role "outro" (open loop)');
  if (roles.filter(r => r === 'outro').length !== 1) errors.push('deve haver exatamente 1 cena "outro"');

  const ctaCount = roles.filter(r => r === 'cta').length;
  if (ctaCount !== 1) {
    errors.push('deve haver exatamente 1 cena "cta"');
  } else if (roles[roles.length - 2] !== 'cta') {
    // PRD 3b: CTA no PENÚLTIMO capítulo, nunca no fim
    errors.push('a cena "cta" precisa ser a PENÚLTIMA (logo antes do "outro")');
  }

  if (!roles.includes('beat')) errors.push('deve haver ≥1 cena "beat" (desenvolvimento)');

  // --- Keyword falada no cold open (PRD 3b: garantida por código) ---
  const hook = scenes.find(s => s.role === 'hook');
  if (hook && script.keyword && !norm(hook.narration).includes(norm(script.keyword))) {
    errors.push('a palavra-chave precisa ser FALADA na narração da cena "hook"');
  }

  // --- Bordão 1× no vídeo inteiro ---
  const allNarration = norm(scenes.map(s => s.narration).join(' '));
  const bordaoHits = allNarration.split(norm(BORDAO)).length - 1;
  if (bordaoHits < 1) warnings.push('bordão do canal não encontrado na narração (esperado 1×)');
  if (bordaoHits > 1) warnings.push('bordão aparece mais de 1× (esperado 1×)');

  // --- Validação por cena ---
  let total = 0;
  scenes.forEach((s, i) => {
    const tag = `cena ${i + 1} (${s.role || '?'})`;
    if (!SHORT_ROLES.includes(s.role)) errors.push(`${tag}: role inválido`);
    if (!s.narration || typeof s.narration !== 'string') errors.push(`${tag}: sem narração`);
    if (!s.visual || !VISUAL_TYPES.includes(s.visual.type)) {
      errors.push(`${tag}: visual.type inválido (use ${VISUAL_TYPES.join('/')} — sem b-roll)`);
    }
    const dur = Number(s.durationSec);
    if (!Number.isFinite(dur) || dur <= 0) errors.push(`${tag}: durationSec inválido`);
    else total += dur;

    if (s.onScreenText && s.onScreenText.length > MAX_ONSCREEN_CHARS) {
      warnings.push(`${tag}: texto em tela longo (${s.onScreenText.length} chars > ${MAX_ONSCREEN_CHARS})`);
    }
  });

  // --- Duração total ---
  const totalRounded = Math.round(total);
  if (totalRounded < MIN_TOTAL_SEC) warnings.push(`duração ${totalRounded}s abaixo do ideal (${MIN_TOTAL_SEC}s)`);
  if (totalRounded > MAX_TOTAL_SEC) errors.push(`duração ${totalRounded}s excede o máximo de Short (${MAX_TOTAL_SEC}s)`);
  if (script.totalDurationSec && Math.abs(script.totalDurationSec - total) > 1) {
    warnings.push(`totalDurationSec (${script.totalDurationSec}) não bate com a soma das cenas (${totalRounded})`);
  }

  return { ok: errors.length === 0, errors, warnings };
}
