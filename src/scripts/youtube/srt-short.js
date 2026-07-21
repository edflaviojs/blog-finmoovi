/**
 * Gerador de LEGENDAS SRT ×3 (pt/en/es) de um Short (F1.2 parte 4 — IMPLEMENTACAO20).
 *
 * Lê o `timing.json` (gerado por tts-short.js) e produz 3 arquivos .srt:
 *   - PT  → direto dos timestamps REAIS por palavra (fonte de verdade = roteiro),
 *           agrupados em blocos de legenda.
 *   - EN/ES → traduz a narração de cada cena com o LLM grátis (generateText) e
 *             distribui o tempo proporcionalmente dentro do intervalo da cena.
 *
 * Os tempos são OFFSETADOS para o timeline GLOBAL do vídeo, contando a
 * sobreposição das transições (TransitionSeries, 8 frames) — assim a legenda
 * casa com o MP4 final. Soft subs (nunca queimadas), enviadas como faixas de
 * legenda no upload (F1.4).
 *
 * Uso: node --import tsx src/scripts/youtube/srt-short.js --slug=juros-compostos
 */

import { generateText } from '../apis/kie-ai.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const FPS = 30;
const TRANSITION_FRAMES = 8;
const AUDIO_ROOT = join(process.cwd(), 'youtube-render', 'public', 'audio');

const args = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => {
    const [k, ...v] = a.slice(2).split('=');
    return [k, v.join('=') || true];
  }),
);

// segundos → "HH:MM:SS,mmm"
export function fmtTime(sec) {
  const ms = Math.max(0, Math.round(sec * 1000));
  const p = (n, l = 2) => String(n).padStart(l, '0');
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor((ms % 3600000) / 60000))}:${p(Math.floor((ms % 60000) / 1000))},${p(ms % 1000, 3)}`;
}

// Início de cada cena (seg) no timeline global, descontando as transições.
export function masterStarts(scenes) {
  const frames = scenes.map((s) => Math.max(1, Math.round(s.durationSec * FPS)));
  const starts = [];
  let prefix = 0;
  for (let i = 0; i < frames.length; i++) {
    starts.push(Math.max(0, prefix - i * TRANSITION_FRAMES) / FPS);
    prefix += frames[i];
  }
  return starts;
}

// Agrupa palavras (com start/end global) em blocos de legenda legíveis.
export function chunkCues(words, { maxWords = 8, maxDur = 4.0, maxGap = 0.8 } = {}) {
  const cues = [];
  let cur = [];
  const flush = () => {
    if (!cur.length) return;
    cues.push({ start: cur[0].start, end: cur[cur.length - 1].end, text: cur.map((w) => w.word).join(' ') });
    cur = [];
  };
  for (const w of words) {
    if (cur.length && (cur.length >= maxWords || w.end - cur[0].start > maxDur || w.start - cur[cur.length - 1].end > maxGap)) flush();
    cur.push(w);
  }
  flush();
  return cues;
}

// Distribui as palavras de um texto uniformemente (por peso) num intervalo [start,end].
export function distributeWords(text, startSec, endSec) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const span = Math.max(0.1, endSec - startSec);
  const weights = words.map((w) => w.replace(/[^\p{L}\p{N}]/gu, '').length + 2);
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  let acc = startSec;
  return words.map((word, i) => {
    const dur = (weights[i] / total) * span;
    const t = { word, start: acc, end: acc + dur };
    acc += dur;
    return t;
  });
}

export function toSrt(cues) {
  return cues.map((c, i) => `${i + 1}\n${fmtTime(c.start)} --> ${fmtTime(c.end)}\n${c.text}\n`).join('\n');
}

const LABEL = { en: 'inglês (en-US)', es: 'espanhol (es-ES)' };
async function translate(text, lang) {
  const prompt = `Traduza para ${LABEL[lang]} o texto de narração abaixo (é legenda de vídeo curto de finanças). Mantenha o tom coloquial e direto. Responda APENAS com a tradução, sem aspas nem comentários.\n\n${text}`;
  const out = await generateText(prompt, { maxTokens: 500, temperature: 0.3 });
  return out.trim().replace(/^["']|["']$/g, '');
}

async function main() {
  const slug = args.slug && args.slug !== true ? String(args.slug) : 'juros-compostos';
  const timingPath = join(AUDIO_ROOT, slug, 'timing.json');
  if (!existsSync(timingPath)) throw new Error(`timing.json não encontrado (${timingPath}) — rode tts-short.js antes`);
  const timing = JSON.parse(readFileSync(timingPath, 'utf-8'));
  const scenes = timing.scenes || [];
  const starts = masterStarts(scenes);
  const dir = join(AUDIO_ROOT, slug);

  // PT — timestamps reais offsetados p/ o global.
  const ptWords = [];
  scenes.forEach((s, i) => (s.words || []).forEach((w) => ptWords.push({ word: w.word, start: starts[i] + w.start, end: starts[i] + w.end })));
  writeFileSync(join(dir, `${slug}.pt.srt`), toSrt(chunkCues(ptWords)), 'utf-8');
  console.log(`✓ pt — ${chunkCues(ptWords).length} blocos`);

  // EN/ES — tradução por cena + tempo proporcional dentro da cena.
  for (const lang of ['en', 'es']) {
    try {
      const langWords = [];
      for (let i = 0; i < scenes.length; i++) {
        const s = scenes[i];
        if (!s.words?.length || !s.narration) continue;
        const speechStart = starts[i] + s.words[0].start;
        const speechEnd = starts[i] + s.words[s.words.length - 1].end;
        const translated = await translate(s.narration, lang);
        distributeWords(translated, speechStart, speechEnd).forEach((w) => langWords.push(w));
      }
      writeFileSync(join(dir, `${slug}.${lang}.srt`), toSrt(chunkCues(langWords)), 'utf-8');
      console.log(`✓ ${lang} — ${chunkCues(langWords).length} blocos`);
    } catch (err) {
      console.log(`⚠️ ${lang} pulado: ${err.message}`);
    }
  }

  console.log(`📄 SRTs em ${dir}`);
}

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('youtube/srt-short.js')) {
  main().catch((err) => { console.error(`\n❌ ${err.message}`); process.exit(1); });
}
