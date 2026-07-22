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
 *
 * CONTRATO v3.3 — SHOTS "app" (b-roll nativo do app FinMoovi, regra do dono
 * 21/07: "em todos os shorts colocar ao menos 2 b-rolls do nosso app"):
 * visual.type "app" exige "app" ∈ APP_SCREENS. ERRO se o vídeo tiver 0 shots
 * "app"; AVISO se tiver só 1 (meta ≥2); AVISO se a cena "cta" não tiver
 * nenhum shot "app".
 *
 * CONTRATO v3.4 (feedback do dono 22/07 depois de assistir o vídeo v3.3):
 * (1) TEMPO DE TELA DO APP — estimateShotScreenTimes() calcula quanto tempo
 * cada shot fica em tela (posição da âncora → posição da âncora seguinte,
 * proporcional ao durationSec da cena; o último shot segura até o fim da
 * cena). Shots "app" com tempo estimado < 2.5s → ERRO; < 4.0s → AVISO
 * (meta ~4.5s de tela).
 * (2) SONS QUASE-ÚNICOS — reforça a variedade sonora: AVISO quando algum
 * sfx chega ao limite (MAX_SFX_REPEATS); AVISO quando mais de 1 sfx
 * distinto se repete (≥2× cada) — a meta é NO MÁXIMO 1 som repetindo no
 * vídeo inteiro.
 * (3) MOMENTO-HISTÓRIA — AVISO leve se o vídeo tiver menos de 2 shots
 * "metaphor" — o padrão-ouro do canal é uma mini-história física narrada E
 * animada em ≥2 shots de metáfora conectados (ex.: bola-neve → avalanche).
 */

// Bordão oficial do canal (PRD 3b — inserir 1× por vídeo)
export const BORDAO = 'Dinheiro sem controle é dinheiro dos outros.';

// Papéis de cena, na ordem editorial do funil de retenção
export const SHORT_ROLES = ['hook', 'beat', 'cta', 'outro'];

// Tipos de visual de um SHOT — MOTION GRAPHICS apenas (decisão do dono 20/07).
// 'broll' (vídeo de estoque) fica FORA da F1 de propósito.
// 'app' (v3.3): NÃO é vídeo de estoque — é a tela NATIVA do app FinMoovi
// recriada (b-roll do produto). Exige o campo "app" ∈ APP_SCREENS.
export const VISUAL_TYPES = ['number', 'counter', 'chart', 'icon', 'metaphor', 'statement', 'formula', 'list', 'app'];

// Tipo legado 'title' (formato antigo) — mapeado para 'statement' na normalização.
const LEGACY_VISUAL_TYPES = ['title', 'number', 'chart', 'list', 'formula', 'statement'];

// Catálogo de METÁFORAS animadas (o dono quer a metáfora LITERAL na tela + som)
// 'clique-link' (v3.2): mãozinha/cursor percorre a tela, acha o botão do link e CLICA — pareia com sfx 'click'.
export const METAPHORS = ['bola-neve', 'avalanche', 'escorregao', 'clique-link'];

// Ícones disponíveis para shots do tipo 'icon'
export const ICONS = [
  'money', 'coins', 'growth', 'clock', 'card', 'warning', 'question', 'mind',
  'piggy', 'bank', 'target', 'trophy', 'bulb', 'hourglass', 'wallet', 'fire', 'chart-down', 'shield',
];

// Telas do app FinMoovi disponíveis para shots do tipo 'app' (v3.3 — b-roll
// nativo do produto, regra do dono 21/07: ≥2 por vídeo, 1 sempre na CTA).
export const APP_SCREENS = [
  'dashboard', 'cartoes', 'fluxo', 'extrato', 'balanco', 'compras', 'smartcapture', 'calculadora',
];

// Efeitos sonoros do catálogo (sfx do shot)
// v3.2 adiciona: 'click' (clique de mouse — cliques/links), 'ding' (sininho suave — insights),
// 'thud' (impacto seco — quedas/perdas), 'sparkle' (brilho/cintilado — revelações).
export const SFX = ['boom', 'whoosh', 'coin', 'alert', 'avalanche', 'slide', 'kaching', 'typewriter', 'keyboard', 'pop', 'click', 'ding', 'thud', 'sparkle'];

// Máximo de vezes que o MESMO sfx pode aparecer no vídeo inteiro (regra do dono 21/07).
export const MAX_SFX_REPEATS = 3;

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
 * Estima o tempo de tela (screen time) de cada shot de uma cena, com base na
 * posição da palavra-âncora na narração, proporcional ao durationSec da cena
 * (regra do dono 22/07: shots "app" precisam segurar ~4,5s, não ~2,5s).
 * Um shot "segura a tela" até a âncora do PRÓXIMO shot; o ÚLTIMO shot da cena
 * segura até o fim da narração. Retorna um array paralelo a `shots`:
 * { anchor, ok, estSec } — `ok=false`/`estSec=null` quando a âncora não foi
 * localizada na narração (nesse caso o erro já é reportado em outro ponto).
 */
export function estimateShotScreenTimes(scene) {
  const { shots } = resolveShots(scene || {});
  const dur = Number(scene && scene.durationSec) || 0;
  const narr = norm(scene && scene.narration);
  const words = [...narr.matchAll(/\S+/g)];
  const totalWords = words.length;

  const positions = [];
  let cursor = 0;
  let wordCursor = 0;
  for (const shot of shots) {
    const a = shot && typeof shot.anchor === 'string' ? norm(shot.anchor) : '';
    const at = a ? narr.indexOf(a, cursor) : -1;
    if (at === -1) {
      positions.push(null);
      continue;
    }
    cursor = at + a.length;
    while (wordCursor + 1 < words.length && words[wordCursor + 1].index <= at) wordCursor++;
    positions.push(wordCursor);
  }

  return shots.map((shot, j) => {
    const pos = positions[j];
    if (pos == null || totalWords === 0 || dur <= 0) {
      return { anchor: shot && shot.anchor, ok: false, estSec: null };
    }
    const nextPos = j + 1 < shots.length ? positions[j + 1] : null;
    const endWords = j === shots.length - 1 || nextPos == null ? totalWords : nextPos;
    const wordSpan = Math.max(0, endWords - pos);
    const estSec = (wordSpan / totalWords) * dur;
    return { anchor: shot.anchor, ok: true, estSec };
  });
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
  let ctaSceneHasApp = false;
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
    if (s.role === 'cta' && shots.some(sh => sh && sh.visual && sh.visual.type === 'app')) {
      ctaSceneHasApp = true;
    }

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
        if (v.type === 'app' && !APP_SCREENS.includes(v.app)) {
          errors.push(`${stag}: shot "app" precisa de "app" do catálogo (${APP_SCREENS.join('/')})`);
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

    // --- Tempo de tela dos shots "app" (regra do dono 22/07: "sempre que for
    // usar os nossos b-rolls o tempo de tela não pode ser 2,5s — tem que ser
    // o dobro, tipo 4,5 segundos") ---
    const shotTimes = estimateShotScreenTimes(s);
    shots.forEach((shot, j) => {
      if (!shot || !shot.visual || shot.visual.type !== 'app') return;
      const est = shotTimes[j] && shotTimes[j].ok ? shotTimes[j].estSec : null;
      if (est == null) return;
      const estRounded = Math.round(est * 10) / 10;
      if (est < 2.5) {
        errors.push(`${tag} shot ${j + 1}: app "${shot.visual.app}" segura só ~${estRounded}s de tela (mínimo 2.5s — meta ~4.5s)`);
      } else if (est < 4.0) {
        warnings.push(`${tag} shot ${j + 1}: app "${shot.visual.app}" segura ~${estRounded}s de tela (abaixo do ideal de ~4.5s — dê mais narração após a âncora ou torne-o o último shot da cena)`);
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

  // --- Repetição de SFX (regra do dono 21/07 — "o mesmo som só pode repetir no
  // máximo 3 vezes por vídeo... quando aparecer 3 vezes tem que ser início, meio
  // e fim... bem espaçado") ---
  const totalShots = allShotsInOrder.length;
  if (totalShots > 0) {
    const sfxIndices = {};
    allShotsInOrder.forEach((sh, idx) => {
      if (sh && sh.sfx) (sfxIndices[sh.sfx] = sfxIndices[sh.sfx] || []).push(idx);
    });
    Object.entries(sfxIndices).forEach(([sfx, idxs]) => {
      const count = idxs.length;
      if (count > MAX_SFX_REPEATS) {
        errors.push(`sfx "${sfx}" repete ${count}× no vídeo (máximo ${MAX_SFX_REPEATS}× — varie o som)`);
      } else if (count === MAX_SFX_REPEATS) {
        // v3.4: a meta é 1 som por vídeo, no máximo — chegar ao teto de 3 já é aviso
        warnings.push(`sfx "${sfx}" chegou ao limite de ${MAX_SFX_REPEATS}× no vídeo (a meta v3.4 é NO MÁXIMO 1 som repetindo por vídeo, 2-3× bem espaçado — todo o resto deveria aparecer só 1×)`);
        // posição de cada ocorrência = índice do shot / total de shots (0..1), dividida em 3 terços
        const thirds = new Set(idxs.map(i => Math.min(2, Math.floor((i / totalShots) * 3))));
        if (thirds.size < 3) {
          warnings.push(`sfx "${sfx}" aparece ${MAX_SFX_REPEATS}× mas mal espaçado (precisa 1 no início, 1 no meio e 1 no fim do vídeo — não concentrado na mesma parte)`);
        }
      } else if (count === 2 && Math.abs(idxs[1] - idxs[0]) <= 3) {
        warnings.push(`sfx "${sfx}" aparece 2× muito perto uma da outra (${Math.abs(idxs[1] - idxs[0])} shots de distância — espace mais)`);
      }
    });
    // v3.4: no máximo 1 som distinto pode repetir no vídeo inteiro (feedback do
    // dono 22/07: "ainda tem som repetindo demais... cansativo")
    const repeatingSfx = Object.entries(sfxIndices).filter(([, idxs]) => idxs.length >= 2).map(([sfx]) => sfx);
    if (repeatingSfx.length > 1) {
      warnings.push(`mais de 1 som se repete no vídeo (${repeatingSfx.join(', ')}) — a meta v3.4 é NO MÁXIMO 1 som repetindo (2-3×, bem espaçado); todos os outros devem aparecer só 1 vez`);
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

  // --- Momento-história (regra do dono 22/07 — o padrão-ouro do canal: uma
  // mini-história física narrada E animada em ≥2 shots "metaphor" conectados,
  // ex.: bola-neve → avalanche. Catálogo de metáforas é pequeno, então isso é
  // SEMPRE aviso, nunca erro) ---
  const metaphorShotsCount = allShotsInOrder.filter(sh => sh && sh.visual && sh.visual.type === 'metaphor').length;
  if (metaphorShotsCount < 2) {
    warnings.push('menos de 2 shots "metaphor" no vídeo — o padrão-ouro do canal é o "momento-história": uma mini-história física narrada E animada em ≥2 shots de metáfora conectados (ex.: bola-neve → avalanche)');
  }

  // --- Shots "app" (regra do dono 21/07: "em todos os shorts colocar ao menos
  // 2 b-rolls do nosso app") ---
  const appShotsCount = allShotsInOrder.filter(sh => sh && sh.visual && sh.visual.type === 'app').length;
  if (appShotsCount === 0) {
    errors.push('nenhum shot "app" no vídeo (regra do dono: todo Short precisa de ≥2 b-rolls nativos do app FinMoovi)');
  } else if (appShotsCount === 1) {
    warnings.push('apenas 1 shot "app" no vídeo (meta: ≥2 b-rolls do app por vídeo)');
  }
  if (!ctaSceneHasApp) {
    warnings.push('a cena "cta" não tem nenhum shot "app" (ideal: o app/calculadora aparecendo antes do clique no link)');
  }

  // --- Duração total ---
  const totalRounded = Math.round(total);
  if (totalRounded < MIN_TOTAL_SEC) warnings.push(`duração ${totalRounded}s abaixo do ideal (${MIN_TOTAL_SEC}s)`);
  if (totalRounded > MAX_TOTAL_SEC) errors.push(`duração ${totalRounded}s excede o máximo de Short (${MAX_TOTAL_SEC}s)`);
  if (script.totalDurationSec && Math.abs(script.totalDurationSec - total) > 1) {
    warnings.push(`totalDurationSec (${script.totalDurationSec}) não bate com a soma das cenas (${totalRounded})`);
  }

  return { ok: errors.length === 0, errors, warnings };
}

// Mapas de confusão comum entre catálogos (o LLM às vezes troca som por ícone,
// ou usa um sinônimo próximo). Aplicados ANTES de deletar/rebaixar o campo.
const SFX_ALIASES = { warning: 'alert', tick: 'keyboard' };
const ICON_ALIASES = { alert: 'warning' };

/**
 * SANITIZADOR — resgata quase-erros ÓBVIOS antes da validação, sem afrouxar as
 * regras de verdade. Chamado por roteiro-short.js ANTES de validateShortScript.
 * Cada correção é registrada como uma linha de aviso no console. Mutação in-place
 * do objeto recebido (também é retornado).
 *
 * O que corrige (apenas near-misses seguros):
 *   - shot.sfx fora do catálogo SFX → mapeia confusões conhecidas
 *     ('warning'→'alert', 'tick'→'keyboard'); senão DELETA o campo (som é opcional).
 *   - shot.anchor com VÁRIAS palavras → se a 1ª palavra (≥3 chars, sem acento/caixa)
 *     aparece na narração da cena, vira essa palavra; senão tenta a ÚLTIMA;
 *     senão deixa para o validador rejeitar.
 *   - shot.visual.icon fora do catálogo ICONS → mapa reverso ('alert'→'warning');
 *     senão vira 'question'.
 *   - totalDurationSec ≠ soma das cenas → recalcula a partir da soma.
 *
 * NÃO auto-corrige (continuam erros duros p/ o retry corretivo resolver):
 *   sincronia semântica, momento-história, contagem/tempo de shots "app", regras do hook.
 */
export function sanitizeScript(script) {
  if (!script || typeof script !== 'object') return script;
  const log = (msg) => console.log(`🧼 sanitizer: ${msg}`);
  const scenes = Array.isArray(script.scenes) ? script.scenes : [];

  scenes.forEach((scene, i) => {
    const tag = `cena ${i + 1} (${(scene && scene.role) || '?'})`;
    const narr = norm(scene && scene.narration);
    const shots = Array.isArray(scene && scene.shots) ? scene.shots : [];
    shots.forEach((shot, j) => {
      if (!shot || typeof shot !== 'object') return;
      const stag = `${tag} shot ${j + 1}`;

      // 1. sfx fora do catálogo → mapear confusão conhecida, senão remover
      if (shot.sfx != null && !SFX.includes(shot.sfx)) {
        const mapped = SFX_ALIASES[String(shot.sfx).toLowerCase()];
        if (mapped && SFX.includes(mapped)) {
          log(`${stag}: sfx "${shot.sfx}" → "${mapped}" (confusão comum de catálogo)`);
          shot.sfx = mapped;
        } else {
          log(`${stag}: sfx "${shot.sfx}" fora do catálogo — removido (som é opcional)`);
          delete shot.sfx;
        }
      }

      // 2. anchor com múltiplas palavras → 1 palavra que aparece na narração
      if (typeof shot.anchor === 'string' && shot.anchor.trim().split(/\s+/).length > 1) {
        const words = shot.anchor.trim().split(/\s+/);
        const first = words[0];
        const last = words[words.length - 1];
        let pick = null;
        if (first.length >= 3 && narr.includes(norm(first))) pick = first;
        else if (last.length >= 3 && narr.includes(norm(last))) pick = last;
        if (pick) {
          log(`${stag}: anchor "${shot.anchor}" tem várias palavras → "${pick}" (uma palavra que aparece na narração)`);
          shot.anchor = pick;
        }
      }

      // 2b. anchor de UMA "palavra" mas com hífen/underscore (ex.: o LLM usou o
      // NOME DO CATÁLOGO da metáfora/ícone, tipo "bola-neve", em vez da palavra
      // falada "bola") e não aparece como está na narração → tenta cada segmento
      if (typeof shot.anchor === 'string' && shot.anchor.trim() &&
          !narr.includes(norm(shot.anchor.trim())) && /[-_]/.test(shot.anchor)) {
        const segments = shot.anchor.trim().split(/[-_]+/).filter(Boolean);
        if (segments.length > 1) {
          const first = segments[0];
          const last = segments[segments.length - 1];
          let pick = null;
          if (first.length >= 3 && narr.includes(norm(first))) pick = first;
          else if (last.length >= 3 && narr.includes(norm(last))) pick = last;
          if (pick) {
            log(`${stag}: anchor "${shot.anchor}" (nome de catálogo com hífen) não está na narração → "${pick}" (segmento que aparece na narração)`);
            shot.anchor = pick;
          }
        }
      }

      // 3. icon fora do catálogo → mapa reverso, senão 'question'
      const v = shot.visual;
      if (v && typeof v === 'object' && v.type === 'icon' && v.icon != null && !ICONS.includes(v.icon)) {
        const mapped = ICON_ALIASES[String(v.icon).toLowerCase()];
        if (mapped && ICONS.includes(mapped)) {
          log(`${stag}: icon "${v.icon}" → "${mapped}" (confusão comum de catálogo)`);
          v.icon = mapped;
        } else {
          log(`${stag}: icon "${v.icon}" fora do catálogo → "question"`);
          v.icon = 'question';
        }
      }
    });
  });

  // 4. totalDurationSec ≠ soma das cenas → recalcula a partir da soma
  const sum = scenes.reduce((a, s) => a + (Number(s && s.durationSec) || 0), 0);
  if (Number.isFinite(sum) && sum > 0 && script.totalDurationSec != null &&
      Math.abs(Number(script.totalDurationSec) - sum) > 1) {
    log(`totalDurationSec ${script.totalDurationSec} ≠ soma das cenas (${sum}) — corrigido para ${sum}`);
    script.totalDurationSec = sum;
  }

  return script;
}
