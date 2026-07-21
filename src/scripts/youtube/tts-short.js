/**
 * Gerador de ÁUDIO + TIMING de um Short (F1.2 — IMPLEMENTACAO20).
 *
 * Lê o roteiro (`output/<slug>.script.json`), e para CADA cena:
 *   1. sintetiza a narração (tts-client: edge-tts primário → piper → azure);
 *   2. roda o Whisper (Together) p/ obter o start/end REAL de cada palavra;
 *   3. ALINHA as palavras do ROTEIRO (fonte de verdade do texto exibido) aos
 *      timestamps do Whisper — assim o karaokê/ícones/SFX passam a usar o tempo
 *      real da fala, no lugar do timing sintético (layoutWords em captions.tsx).
 *
 * Saída:
 *   - áudio por cena → `youtube-render/public/audio/<slug>/scene-<id>.<ext>` (gitignored)
 *   - `youtube-render/public/audio/<slug>/timing.json` com, por cena:
 *       { id, role, narration, audioFile, durationSec (medido), words:[{word,start,end}] }
 *
 * O provedor de voz é escolhido UMA vez por vídeo (não mistura vozes). As chaves
 * (TOGETHER_TTS_API_KEY p/ Whisper) vivem como secrets do GitHub — rodar em CI ou
 * com a env local. O endpoint do Edge pode dar throttle em geração local em lote;
 * em produção (Actions, espaçado) funciona normal.
 *
 * Uso: node --import tsx src/scripts/youtube/tts-short.js --slug=juros-compostos
 */

import { synthesizeSpeech, transcribeWords, pickProvider } from './lib/tts-client.js';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const OUTPUT_DIR = join(dirname(fileURLToPath(import.meta.url)), 'output');
const AUDIO_ROOT = join(process.cwd(), 'youtube-render', 'public', 'audio');
const TAIL_PAD = 0.35; // seg. de silêncio somados ao fim da fala p/ a cena respirar

const args = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => {
    const [k, ...v] = a.slice(2).split('=');
    return [k, v.join('=') || true];
  }),
);

// Correções de PRONÚNCIA aplicadas só ao texto que vai pro TTS (a legenda/roteiro
// e o SRT mantêm a grafia real). Ex.: o Edge lê "FinMoovi" como "fin-moví"; a
// grafia "Fin Múvi" faz ele falar "fin-múuvi" (correto).
export function pronounce(text) {
  return String(text).replace(/finmoovi/gi, 'Fin Múvi');
}

// Normaliza p/ comparar palavra do roteiro × palavra do Whisper (sem acento/pontuação/caixa).
export function normalizeWord(w) {
  return String(w).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
}

// Distribui as palavras uniformemente (por peso de letras) numa duração — fallback
// quando o alinhamento com o Whisper casa pouco (mantém o timing sempre utilizável).
function proportional(words, durationSec) {
  const weights = words.map((w) => normalizeWord(w).length + 2);
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  let acc = 0;
  return words.map((word, i) => {
    const dur = (weights[i] / total) * durationSec;
    const t = { word, start: +acc.toFixed(3), end: +(acc + dur).toFixed(3) };
    acc += dur;
    return t;
  });
}

// Preenche os buracos entre âncoras (palavras casadas) por distribuição proporcional,
// garantindo tempos monotônicos não-decrescentes.
function fillGaps(words, anchors, durationSec) {
  const idxs = anchors.map((a, i) => (a ? i : -1)).filter((i) => i >= 0);
  const out = words.map((word) => ({ word, start: 0, end: 0 }));

  const distribute = (from, to, lo, hi) => {
    // preenche words[from..to] (inclusive) dentro de [lo, hi] por peso
    const slice = [];
    for (let i = from; i <= to; i++) slice.push(i);
    const weights = slice.map((i) => normalizeWord(words[i]).length + 2);
    const total = weights.reduce((a, b) => a + b, 0) || 1;
    let acc = lo;
    slice.forEach((i, k) => {
      const dur = (weights[k] / total) * (hi - lo);
      out[i] = { word: words[i], start: +acc.toFixed(3), end: +(acc + dur).toFixed(3) };
      acc += dur;
    });
  };

  // antes da 1ª âncora
  if (idxs[0] > 0) distribute(0, idxs[0] - 1, 0, anchors[idxs[0]].start);
  // âncoras + buracos entre elas
  for (let a = 0; a < idxs.length; a++) {
    const i = idxs[a];
    out[i] = { word: words[i], start: +anchors[i].start.toFixed(3), end: +anchors[i].end.toFixed(3) };
    const next = idxs[a + 1];
    if (next != null && next > i + 1) distribute(i + 1, next - 1, anchors[i].end, anchors[next].start);
  }
  // depois da última âncora
  const last = idxs[idxs.length - 1];
  if (last < words.length - 1) distribute(last + 1, words.length - 1, anchors[last].end, durationSec);

  // monotonicidade defensiva
  for (let i = 1; i < out.length; i++) {
    if (out[i].start < out[i - 1].start) out[i].start = out[i - 1].start;
    if (out[i].end < out[i].start) out[i].end = out[i].start;
  }
  return out;
}

/**
 * Alinha as palavras do roteiro aos timestamps do Whisper.
 * @param {string} narration  texto do roteiro (fonte de verdade)
 * @param {{word,start,end}[]} whisperWords
 * @param {number} durationSec  duração medida da fala (p/ escalar buracos/fallback)
 * @returns {{word,start,end}[]}
 */
export function alignWords(narration, whisperWords, durationSec) {
  const words = narration.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const anchors = new Array(words.length).fill(null);
  let wi = 0;
  for (let ri = 0; ri < words.length; ri++) {
    const rn = normalizeWord(words[ri]);
    if (!rn) continue;
    for (let k = wi; k < Math.min(whisperWords.length, wi + 6); k++) {
      if (normalizeWord(whisperWords[k].word) === rn) {
        anchors[ri] = { start: whisperWords[k].start, end: whisperWords[k].end };
        wi = k + 1;
        break;
      }
    }
  }
  const withLetters = words.filter((w) => normalizeWord(w)).length;
  const matched = anchors.filter(Boolean).length;
  if (withLetters === 0 || matched / withLetters < 0.5) {
    return proportional(words, durationSec);
  }
  return fillGaps(words, anchors, durationSec);
}

function readScript(slug) {
  const path = join(OUTPUT_DIR, `${slug}.script.json`);
  if (!existsSync(path)) throw new Error(`roteiro não encontrado: ${path}`);
  return JSON.parse(readFileSync(path, 'utf-8'));
}

async function main() {
  const slug = args.slug && args.slug !== true ? String(args.slug) : 'juros-compostos';
  const script = readScript(slug);
  const scenes = script.scenes || [];
  if (!scenes.length) throw new Error('roteiro sem cenas');

  const provider = pickProvider();
  if (!provider) throw new Error('nenhum provedor de TTS disponível');
  console.log(`🎙️  TTS do Short "${slug}" — ${scenes.length} cenas · provedor: ${provider}\n`);

  const audioDir = join(AUDIO_ROOT, slug);
  mkdirSync(audioDir, { recursive: true });

  const outScenes = [];
  let voiceUsed = null;

  for (const scene of scenes) {
    const id = scene.id ?? outScenes.length + 1;
    const narration = (scene.narration || '').trim();
    if (!narration) { console.log(`  cena ${id}: sem narração — pulada`); continue; }

    // 1) voz (mesmo provedor p/ todas as cenas; grafia fonética só no áudio)
    const { audio, ext, voice } = await synthesizeSpeech(pronounce(narration), { providerName: provider });
    voiceUsed = voice;
    const audioName = `scene-${id}.${ext}`;
    writeFileSync(join(audioDir, audioName), audio);

    // 2) timestamps reais + 3) alinhamento com o roteiro
    const whisper = await transcribeWords(audio, { ext });
    const speechEnd = whisper.length ? whisper[whisper.length - 1].end : (scene.durationSec || 3);
    const durationSec = +(speechEnd + TAIL_PAD).toFixed(3);
    const words = alignWords(narration, whisper, speechEnd);

    outScenes.push({
      id,
      role: scene.role || '',
      narration,
      audioFile: `audio/${slug}/${audioName}`, // relativo a youtube-render/public
      durationSec,
      words,
    });
    console.log(`  ✓ cena ${id} [${scene.role || '-'}] — ${durationSec}s · ${words.length} palavras (${whisper.length} do Whisper)`);
  }

  const totalDurationSec = +outScenes.reduce((a, s) => a + s.durationSec, 0).toFixed(3);
  const timing = { slug, provider, voice: voiceUsed, scenes: outScenes, totalDurationSec };
  writeFileSync(join(audioDir, 'timing.json'), JSON.stringify(timing, null, 2), 'utf-8');

  console.log(`\n✅ ${outScenes.length} cenas · ${totalDurationSec}s total`);
  console.log(`📄 timing: ${join(audioDir, 'timing.json')}`);
  console.log(`🔊 áudio: ${audioDir}`);
}

// Só executa se chamado direto (permite importar alignWords/normalizeWord nos testes).
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('youtube/tts-short.js')) {
  main().catch((err) => { console.error(`\n❌ ${err.message}`); process.exit(1); });
}
