import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { BRAND, BODY } from './theme';

// ─────────────────────────────────────────────────────────────────────────────
// Legenda KARAOKÊ estilo TikTok — palavra por vez, sincronizada com a fala.
// Palavras "importantes" (números, R$, %, MAIÚSCULAS) saem MAIORES p/ dar ênfase.
// Sem áudio real ainda (F1.2): o tempo de cada palavra é distribuído pela duração
// da cena. Quando o TTS entrar, trocamos por timestamps reais sem mexer no visual.
// ─────────────────────────────────────────────────────────────────────────────

export type WordTiming = { word: string; start: number; end: number; line: number; emphasis: boolean };

const WORDS_PER_LINE = 3;

// Palavra de destaque = tem número, moeda/%/×, ou está em MAIÚSCULAS (ex.: CONTRA).
export function isEmphasisWord(w: string): boolean {
  const clean = w.replace(/[^\p{L}\p{N}$%×]/gu, '');
  if (/\d/.test(clean)) return true;
  if (/[%×]/.test(w) || /^R\$?$/i.test(clean)) return true;
  if (clean.length > 1 && /\p{L}/u.test(clean) && clean === clean.toLocaleUpperCase('pt-BR') && clean !== clean.toLocaleLowerCase('pt-BR')) return true;
  return false;
}

export function layoutWords(narration: string, totalFrames: number): WordTiming[] {
  const words = narration.trim().split(/\s+/).filter(Boolean);
  const lead = Math.min(6, totalFrames * 0.06);
  const usable = Math.max(1, totalFrames - lead);
  const weights = words.map(w => w.replace(/[^\p{L}\p{N}]/gu, '').length + 3);
  const totalW = weights.reduce((a, b) => a + b, 0);
  let acc = lead;
  return words.map((word, i) => {
    const dur = (weights[i] / totalW) * usable;
    const t: WordTiming = { word, start: acc, end: acc + dur, line: Math.floor(i / WORDS_PER_LINE), emphasis: isEmphasisWord(word) };
    acc += dur;
    return t;
  });
}

export function activeIndex(timings: WordTiming[], frame: number): number {
  let active = 0;
  for (let i = 0; i < timings.length; i++) if (frame >= timings[i].start) active = i;
  return active;
}

// Converte os timestamps REAIS do TTS/Whisper (segundos) em WordTiming (frames).
// Usado quando o timing.json existe — no lugar da distribuição sintética acima.
export function wordTimingsFromReal(
  words: { word: string; start: number; end: number }[],
  fps: number,
): WordTiming[] {
  return words.map((w, i) => ({
    word: w.word,
    start: Math.round(w.start * fps),
    end: Math.round(w.end * fps),
    line: Math.floor(i / WORDS_PER_LINE),
    emphasis: isEmphasisWord(w.word),
  }));
}

const BASE = 56;
const EMPHASIS = 88; // destaque bem maior

export const KaraokeCaption: React.FC<{ narration: string; totalFrames: number; words?: { word: string; start: number; end: number }[] }> = ({ narration, totalFrames, words }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const timings = words && words.length ? wordTimingsFromReal(words, fps) : layoutWords(narration, totalFrames);
  const active = activeIndex(timings, frame);

  const currentLine = timings[active]?.line ?? 0;
  const lineWords = timings.filter(t => t.line === currentLine);
  const lineStart = lineWords[0]?.start ?? 0;
  const lineIn = spring({ frame: frame - lineStart, fps, config: { damping: 18, mass: 0.5 } });
  const lineY = interpolate(lineIn, [0, 1], [26, 0]);

  return (
    <div style={{
      position: 'absolute', bottom: 300, left: 50, right: 50,
      display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center',
      gap: '14px 16px', transform: `translateY(${lineY}px)`,
      fontFamily: BODY, fontWeight: 800, lineHeight: 1.05,
    }}>
      {lineWords.map((t) => {
        const idx = timings.indexOf(t);
        const isActive = idx === active;
        const pop = spring({ frame: frame - t.start, fps, config: { damping: 12, mass: 0.4 } });
        const emphScale = t.emphasis && isActive ? interpolate(pop, [0, 1], [0.6, 1.05]) : (isActive ? interpolate(pop, [0, 1], [0.7, 1.14]) : 1);
        const spoken = frame >= t.start;
        const size = t.emphasis ? EMPHASIS : BASE;
        return (
          <span
            key={idx}
            style={{
              display: 'inline-block',
              fontSize: size,
              transform: `scale(${emphScale})`,
              padding: isActive ? '4px 18px' : '4px 0',
              borderRadius: 16,
              background: isActive ? BRAND.gradient : 'transparent',
              color: isActive ? '#0d1117' : t.emphasis ? BRAND.yellow : spoken ? BRAND.text : 'rgba(148,163,184,0.55)',
              textShadow: isActive ? 'none' : '0 3px 14px rgba(0,0,0,0.7)',
              boxShadow: isActive ? '0 8px 30px rgba(139,92,246,0.45)' : 'none',
            }}
          >
            {t.word}
          </span>
        );
      })}
    </div>
  );
};
