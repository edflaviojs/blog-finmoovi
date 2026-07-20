import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { BRAND, BODY } from './theme';

// ─────────────────────────────────────────────────────────────────────────────
// Legenda KARAOKÊ estilo TikTok — palavra por vez, sincronizada com a fala.
// Sem áudio real ainda (F1.2), então o tempo de cada palavra é distribuído pela
// duração da cena, proporcional ao tamanho da palavra. Quando o TTS entrar,
// trocamos por timestamps reais (word-level) sem mexer no visual.
// ─────────────────────────────────────────────────────────────────────────────

type WordTiming = { word: string; start: number; end: number; line: number };

const WORDS_PER_LINE = 3;

function layoutWords(narration: string, totalFrames: number): WordTiming[] {
  const words = narration.trim().split(/\s+/).filter(Boolean);
  const lead = Math.min(6, totalFrames * 0.06); // pequena entrada antes da 1ª palavra
  const usable = Math.max(1, totalFrames - lead);
  const weights = words.map(w => w.replace(/[^\p{L}\p{N}]/gu, '').length + 3);
  const totalW = weights.reduce((a, b) => a + b, 0);
  let acc = lead;
  return words.map((word, i) => {
    const dur = (weights[i] / totalW) * usable;
    const t = { word, start: acc, end: acc + dur, line: Math.floor(i / WORDS_PER_LINE) };
    acc += dur;
    return t;
  });
}

export const KaraokeCaption: React.FC<{ narration: string; totalFrames: number }> = ({ narration, totalFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const timings = layoutWords(narration, totalFrames);

  // palavra ativa = última cujo start já passou
  let active = 0;
  for (let i = 0; i < timings.length; i++) {
    if (frame >= timings[i].start) active = i;
  }
  const currentLine = timings[active]?.line ?? 0;
  const lineWords = timings.filter(t => t.line === currentLine);

  // entrada da linha (quando troca de linha)
  const lineStart = lineWords[0]?.start ?? 0;
  const lineIn = spring({ frame: frame - lineStart, fps, config: { damping: 18, mass: 0.5 } });
  const lineY = interpolate(lineIn, [0, 1], [26, 0]);

  return (
    <div style={{
      position: 'absolute', bottom: 300, left: 60, right: 60,
      display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center',
      gap: '14px 16px', transform: `translateY(${lineY}px)`,
      fontFamily: BODY, fontWeight: 800, fontSize: 58, lineHeight: 1.1,
    }}>
      {lineWords.map((t) => {
        const idx = timings.indexOf(t);
        const isActive = idx === active;
        const pop = spring({ frame: frame - t.start, fps, config: { damping: 12, mass: 0.4 } });
        const scale = isActive ? interpolate(pop, [0, 1], [0.7, 1.16]) : 1;
        const spoken = frame >= t.start;
        return (
          <span
            key={idx}
            style={{
              display: 'inline-block',
              transform: `scale(${scale})`,
              padding: isActive ? '4px 18px' : '4px 0',
              borderRadius: 16,
              background: isActive ? BRAND.gradient : 'transparent',
              color: isActive ? '#0d1117' : spoken ? BRAND.text : 'rgba(148,163,184,0.55)',
              textShadow: isActive ? 'none' : '0 3px 14px rgba(0,0,0,0.7)',
              boxShadow: isActive ? '0 8px 30px rgba(139,92,246,0.45)' : 'none',
              transition: 'none',
            }}
          >
            {t.word}
          </span>
        );
      })}
    </div>
  );
};
