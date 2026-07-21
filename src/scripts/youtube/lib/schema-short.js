/**
 * Schema + validador do ROTEIRO DE SHORT (fábrica de Shorts — F1, IMPLEMENTACAO20).
 *
 * O roteirista (roteiro-short.js) transforma um termo do glossário num roteiro
 * por CENAS em JSON. Este módulo define o formato esperado e REJEITA roteiros
 * fora do padrão editorial do PRD (seção 3b — Funil de Retenção, adaptado para
 * Shorts de motion graphics). Nada de vídeo de estoque: só visuais próprios.
 *
 * CONTRATO v2 (Shorts 2.0):
 * {
 *   slug, term, category, keyword,             // metadados
 *   intro: { big, sub, style },                // abertura + arquétipo de gancho
 *   scenes: [ { id, role, narration, onScreenText, cues, visual, durationSec } ],
 *   cta: { text, target },                     // 'app' | 'blog'
 *   totalDurationSec
 * }
 *
 * Regras duras (viram erro): 1 cena 'hook' no início (keyword FALADA nela, visual
 * != 'number'), ≥1 'beat', 1 'cta' no PENÚLTIMO lugar, 1 'outro' no fim, duração
 * total 30–58s, cues 1–4 palavras EXATAS da narração, visual 'app' só na 'cta'.
 * Regras leves viram aviso (alvo 45–55s, bordão 1×, etc).
 */

// Bordão oficial do canal (PRD 3b — inserir 1× por vídeo)
export const BORDAO = 'Dinheiro sem controle é dinheiro dos outros.';

// Papéis de cena, na ordem editorial do funil de retenção
export const SHORT_ROLES = ['hook', 'beat', 'cta', 'outro'];

// Tipos de visual — MOTION GRAPHICS apenas (decisão do dono 20/07). 'broll'
// (vídeo de estoque) fica FORA da F1 de propósito.
export const VISUAL_TYPES = ['title', 'number', 'chart', 'list', 'formula', 'statement'];

// 'app' (mockup do app FinMoovi) só é válido na cena 'cta'.
export const CTA_ONLY_VISUAL_TYPES = ['app'];

// Arquétipos de gancho da abertura (o renderer implementa cada um).
export const INTRO_STYLES = ['contraste', 'contagem', 'timer', 'meio', 'objeto'];

// Limites de duração (YouTube Short: máx 60s). Alvo editorial 45–55s.
export const MIN_TOTAL_SEC = 30;   // erro duro abaixo disso
export const MAX_TOTAL_SEC = 58;   // erro duro acima disso
export const TARGET_MIN_SEC = 45;  // aviso fora da janela-alvo
export const TARGET_MAX_SEC = 55;

// Texto em tela deve ser curto/legível (regra language-neutral do PRD 3c)
const MAX_ONSCREEN_CHARS = 42;

// Normaliza para comparar ignorando acento/caixa
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

  // --- Abertura (intro) ---
  const intro = script.intro;
  if (!intro || typeof intro !== 'object') {
    errors.push('campo "intro" ausente (objeto { big, sub, style })');
  } else {
    if (!intro.big || typeof intro.big !== 'string') errors.push('intro.big ausente ou inválido');
    if (!intro.sub || typeof intro.sub !== 'string') errors.push('intro.sub ausente ou inválido');
    if (!intro.style || !INTRO_STYLES.includes(intro.style)) {
      errors.push(`intro.style inválido (use ${INTRO_STYLES.join('/')})`);
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
  // Hook não pode repetir o soco de número da intro (variedade de abertura)
  if (hook && hook.visual && hook.visual.type === 'number') {
    errors.push('a cena "hook" não pode ter visual.type "number" (a intro já entrega o número; varie o gancho)');
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

    // visual.type: base sempre válido; 'app' só na cta
    const vType = s.visual && s.visual.type;
    if (!s.visual || typeof s.visual !== 'object') {
      errors.push(`${tag}: visual ausente`);
    } else if (VISUAL_TYPES.includes(vType)) {
      // ok
    } else if (CTA_ONLY_VISUAL_TYPES.includes(vType)) {
      if (s.role !== 'cta') errors.push(`${tag}: visual.type "${vType}" só é permitido na cena "cta"`);
    } else {
      errors.push(`${tag}: visual.type inválido (use ${VISUAL_TYPES.join('/')} — 'app' só na cta, sem b-roll)`);
    }

    // cues: 1–4 palavras EXATAS da narração (compat: aceita legado "cue" string)
    let cues = Array.isArray(s.cues) ? s.cues : null;
    if (!cues && typeof s.cue === 'string') cues = [s.cue];
    if (!cues || cues.length === 0) {
      errors.push(`${tag}: sem "cues" (1–4 palavras exatas da narração)`);
    } else {
      if (cues.length > 4) errors.push(`${tag}: "cues" tem ${cues.length} itens (máx 4)`);
      const narr = norm(s.narration);
      cues.forEach((c) => {
        if (!c || typeof c !== 'string') {
          errors.push(`${tag}: cue vazio/inválido`);
        } else if (!narr.includes(norm(c))) {
          errors.push(`${tag}: cue "${c}" não aparece na narração desta cena`);
        }
      });
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
  if (totalRounded < MIN_TOTAL_SEC) {
    errors.push(`duração ${totalRounded}s abaixo do mínimo (${MIN_TOTAL_SEC}s)`);
  } else if (totalRounded > MAX_TOTAL_SEC) {
    errors.push(`duração ${totalRounded}s excede o máximo de Short (${MAX_TOTAL_SEC}s)`);
  } else if (totalRounded < TARGET_MIN_SEC || totalRounded > TARGET_MAX_SEC) {
    warnings.push(`duração ${totalRounded}s fora da janela-alvo (${TARGET_MIN_SEC}–${TARGET_MAX_SEC}s)`);
  }
  if (script.totalDurationSec && Math.abs(script.totalDurationSec - total) > 1) {
    warnings.push(`totalDurationSec (${script.totalDurationSec}) não bate com a soma das cenas (${totalRounded})`);
  }

  return { ok: errors.length === 0, errors, warnings };
}
