/**
 * Schema + validador do ROTEIRO DE SHORT (fábrica de Shorts — F1, IMPLEMENTACAO20).
 *
 * O roteirista (roteiro-short.js) transforma um termo do glossário num roteiro
 * por CENAS em JSON. Este módulo define o formato esperado e REJEITA roteiros
 * fora do padrão editorial do PRD (seção 3b — Funil de Retenção, adaptado para
 * Shorts de motion graphics). Nada de vídeo de estoque: só visuais próprios.
 *
 * CONTRATO v3 — "SHOTS" (coreografia por palavra):
 * Cada cena tem `shots: [...]` (1 a 6) — uma sequência de visuais rápidos que
 * ENTRAM na tela QUANDO a palavra-âncora é FALADA (sincronia semântica dura).
 * {
 *   slug, term, category, keyword, nextVideoTitle,   // metadados
 *   intro: { frase, counter? },                       // abertura disruptiva
 *   scenes: [ {
 *     id, role, narration, durationSec,
 *     shots: [ { anchor, visual:{type,...}, sfx? } ]  // coreografia (v3)
 *   } ],
 *   cta: { text, target },                            // 'app' | 'blog'
 *   totalDurationSec
 * }
 *
 * Um SHOT:
 *   anchor  — palavra EXATA da narração DESTA cena (âncoras em ordem de fala)
 *   visual  — { type, text?, from?, to?, prefix?, icon?, metaphor?, note? }
 *   sfx?    — efeito sonoro do catálogo
 *
 * Compatibilidade: cena legada com `visual`+`cue` (sem `shots`) é NORMALIZADA
 * internamente para `shots=[{ anchor: cue, visual }]` (aceita, com aviso).
 * `intro` legado `{ big, sub }` é normalizado para `{ frase }`.
 *
 * Regras duras (viram erro): 1 cena 'hook' no início (keyword FALADA nela),
 * ≥1 'beat', 1 'cta' no PENÚLTIMO lugar, 1 'outro' no fim, duração 30–60s,
 * bordão presente 1×, shots 1–6/cena com âncoras que aparecem na narração e em
 * ordem de fala, tipos/ícones/metáforas/sfx do catálogo. Regras leves = aviso.
 */

// Bordão oficial do canal (PRD 3b — inserir 1× por vídeo)
export const BORDAO = 'Dinheiro sem controle é dinheiro dos outros.';

// Papéis de cena, na ordem editorial do funil de retenção
export const SHORT_ROLES = ['hook', 'beat', 'cta', 'outro'];

// Tipos de visual de um SHOT — MOTION GRAPHICS apenas (decisão do dono 20/07).
// 'broll' (vídeo de estoque) fica FORA da F1 de propósito.
export const VISUAL_TYPES = ['number', 'counter', 'chart', 'icon', 'metaphor', 'statement', 'formula', 'list'];

// Tipo legado 'title' (formato antigo) — mapeado para 'statement' na normalização.
const LEGACY_VISUAL_TYPES = ['title', 'number', 'chart', 'list', 'formula', 'statement'];

// Catálogo de METÁFORAS animadas (o dono quer a metáfora LITERAL na tela + som)
export const METAPHORS = ['bola-neve', 'avalanche', 'escorregao'];

// Ícones disponíveis para shots do tipo 'icon'
export const ICONS = [
  'money', 'coins', 'growth', 'clock', 'card', 'warning', 'question', 'mind',
  'piggy', 'bank', 'target', 'trophy', 'bulb', 'hourglass', 'wallet', 'fire', 'chart-down', 'shield',
];

// Efeitos sonoros do catálogo (sfx do shot)
export const SFX = ['boom', 'whoosh', 'coin', 'alert', 'avalanche', 'slide', 'kaching', 'typewriter', 'keyboard', 'pop'];

// Limites de shots por cena (movimento constante, sem poluir)
export const MIN_SHOTS = 1;
export const MAX_SHOTS = 6;

// Limites de duração de um Short (YouTube: máx 60s)
export const MIN_TOTAL_SEC = 30;
export const MAX_TOTAL_SEC = 60;

// Texto em tela deve ser curto/legível (regra language-neutral do PRD 3c)
const MAX_SHOT_TEXT_CHARS = 40;

// Normaliza para comparar ignorando acento/caixa
function norm(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

// Um número finito? (aceita "500" string ou 500)
function asNumber(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  return null;
}

/**
 * Resolve os shots de uma cena. Cena v3 usa `shots`; cena legada (`visual`+`cue`,
 * sem shots) é normalizada para 1 shot. Retorna { shots, legacy }.
 */
function resolveShots(scene) {
  if (Array.isArray(scene.shots) && scene.shots.length > 0) {
    return { shots: scene.shots, legacy: false };
  }
  if (scene.visual && typeof scene.visual === 'object') {
    const type = scene.visual.type === 'title' ? 'statement' : scene.visual.type;
    const visual = { ...scene.visual, type };
    const anchor = scene.cue || (String(scene.narration || '').trim().split(/\s+/)[0] || '');
    return { shots: [{ anchor, visual }], legacy: true };
  }
  return { shots: [], legacy: false };
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

  // --- intro (abertura disruptiva) — v3 { frase, counter? } ou legado { big, sub } ---
  if (script.intro && typeof script.intro === 'object') {
    const intro = script.intro;
    let frase = typeof intro.frase === 'string' ? intro.frase : null;
    if (!frase && intro.big) {
      frase = intro.sub ? `${intro.big}. ${intro.sub}` : String(intro.big);
    }
    if (!frase || !frase.trim()) {
      errors.push('intro: sem "frase" (nem "big" legado)');
    }
    if (intro.counter) {
      const from = asNumber(intro.counter.from);
      const to = asNumber(intro.counter.to);
      if (from === null || to === null || !(from < to)) {
        errors.push('intro.counter: precisa de "from" e "to" numéricos com from < to');
      }
    }
  } else {
    warnings.push('roteiro sem "intro" (abertura disruptiva recomendada)');
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

  // --- Validação por cena (+ coreografia de shots) ---
  let total = 0;
  const allShotsInOrder = [];
  scenes.forEach((s, i) => {
    const tag = `cena ${i + 1} (${s.role || '?'})`;
    if (!SHORT_ROLES.includes(s.role)) errors.push(`${tag}: role inválido`);
    if (!s.narration || typeof s.narration !== 'string') errors.push(`${tag}: sem narração`);

    const dur = Number(s.durationSec);
    if (!Number.isFinite(dur) || dur <= 0) errors.push(`${tag}: durationSec inválido`);
    else total += dur;

    // --- SHOTS (coreografia por palavra) ---
    const { shots, legacy } = resolveShots(s);
    if (legacy) warnings.push(`${tag}: formato legado (visual+cue) — normalizado para 1 shot`);
    allShotsInOrder.push(...shots);

    if (shots.length < MIN_SHOTS) {
      errors.push(`${tag}: sem shots (esperado ${MIN_SHOTS}–${MAX_SHOTS})`);
    } else if (shots.length > MAX_SHOTS) {
      errors.push(`${tag}: ${shots.length} shots excede o máximo (${MAX_SHOTS})`);
    }

    const narr = norm(s.narration);
    let cursor = 0; // garante âncoras em ordem de fala
    shots.forEach((shot, j) => {
      const stag = `${tag} shot ${j + 1}`;
      // anchor
      if (!shot || typeof shot.anchor !== 'string' || !shot.anchor.trim()) {
        errors.push(`${stag}: "anchor" ausente (palavra exata da narração)`);
      } else {
        const a = norm(shot.anchor);
        const at = narr.indexOf(a, cursor);
        if (at === -1) {
          if (narr.includes(a)) errors.push(`${stag}: âncora "${shot.anchor}" fora de ordem de fala`);
          else errors.push(`${stag}: âncora "${shot.anchor}" não aparece na narração desta cena`);
        } else {
          cursor = at + a.length;
        }
      }
      // visual
      const v = shot && shot.visual;
      if (!v || typeof v !== 'object' || !VISUAL_TYPES.includes(v.type)) {
        errors.push(`${stag}: visual.type inválido (use ${VISUAL_TYPES.join('/')} — sem b-roll)`);
      } else {
        if (v.type === 'metaphor' && !METAPHORS.includes(v.metaphor)) {
          errors.push(`${stag}: metáfora precisa de "metaphor" do catálogo (${METAPHORS.join('/')})`);
        }
        if (v.type === 'icon' && !ICONS.includes(v.icon)) {
          errors.push(`${stag}: ícone precisa de "icon" do catálogo (${ICONS.join('/')})`);
        }
        if (v.type === 'counter') {
          const from = asNumber(v.from);
          const to = asNumber(v.to);
          if (from === null || to === null || !(from < to)) {
            errors.push(`${stag}: counter precisa de "from" e "to" numéricos com from < to`);
          }
        }
        if (typeof v.text === 'string' && v.text.length > MAX_SHOT_TEXT_CHARS) {
          warnings.push(`${stag}: texto longo (${v.text.length} chars > ${MAX_SHOT_TEXT_CHARS})`);
        }
      }
      // sfx
      if (shot && shot.sfx != null && !SFX.includes(shot.sfx)) {
        errors.push(`${stag}: sfx "${shot.sfx}" fora do catálogo (${SFX.join('/')})`);
      }
    });
  });

  // --- Variedade de som/ícone (feedback do dono pós-v3 — SEMPRE aviso, nunca erro) ---
  const shotsWithSfx = allShotsInOrder.filter(sh => sh && sh.sfx);
  for (let i = 1; i < shotsWithSfx.length; i++) {
    if (shotsWithSfx[i].sfx === shotsWithSfx[i - 1].sfx) {
      warnings.push(`sfx "${shotsWithSfx[i].sfx}" repetido em dois shots consecutivos (som é tempero, intercale)`);
    }
  }
  if (allShotsInOrder.length > 0) {
    const sfxRatio = shotsWithSfx.length / allShotsInOrder.length;
    if (sfxRatio > 0.6) {
      warnings.push(`${Math.round(sfxRatio * 100)}% dos shots têm sfx (ideal ≤ ~metade — nem todo shot precisa de som)`);
    }
  }
  const iconCounts = {};
  allShotsInOrder.forEach(sh => {
    if (sh && sh.visual && sh.visual.type === 'icon' && sh.visual.icon) {
      iconCounts[sh.visual.icon] = (iconCounts[sh.visual.icon] || 0) + 1;
    }
  });
  Object.entries(iconCounts).forEach(([icon, count]) => {
    if (count > 1) warnings.push(`ícone "${icon}" repetido ${count}× no vídeo (varie — há ${ICONS.length} ícones no catálogo)`);
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
