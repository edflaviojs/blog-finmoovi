import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { BRAND } from './theme';
import { layoutWords, activeIndex, wordTimingsFromReal } from './captions';

// ─────────────────────────────────────────────────────────────────────────────
// Ícones sincronizados com a fala: quando uma palavra-gatilho é dita (dinheiro,
// anos, dívida, crescer...), o ícone correspondente entra com pop perto do topo.
// Vetores (sem depender de fonte de emoji, que falha no Chromium headless).
// NA F1.2 (áudio) esses mesmos gatilhos vão disparar EFEITOS SONOROS (caixa
// registradora p/ dinheiro, relógio p/ tempo etc.) usando o MESMO timing.
// ─────────────────────────────────────────────────────────────────────────────

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}]/gu, '');

type IconKey = 'money' | 'coins' | 'growth' | 'clock' | 'card' | 'warning';

// palavra normalizada → ícone (a 1ª que casar vence). SFX associado vem na F1.2.
const TRIGGERS: Array<{ words: string[]; icon: IconKey }> = [
  { words: ['dinheiro', 'poupar', 'poupa', 'reais', 'real', 'grana', 'salario', 'conta'], icon: 'money' },
  { words: ['milhoes', 'milhao', 'mil', 'bilhoes', 'fortuna', 'rico'], icon: 'coins' },
  { words: ['cresce', 'crescem', 'crescer', 'render', 'rende', 'rendem', 'investir', 'investe', 'exponencial', 'juros'], icon: 'growth' },
  { words: ['anos', 'ano', 'tempo', 'cedo', 'agora', 'hoje'], icon: 'clock' },
  { words: ['divida', 'dividas', 'cartao', 'emprestimo', 'parcela'], icon: 'card' },
  { words: ['contra', 'erro', 'cuidado', 'perde', 'perder', 'armadilha'], icon: 'warning' },
];

function iconFor(word: string): IconKey | null {
  if (/R\$/i.test(word)) return 'money'; // "R$" sozinho vira só "r" ao normalizar
  const n = norm(word);
  for (const t of TRIGGERS) if (t.words.includes(n)) return t.icon;
  return null;
}

const G = () => (
  <defs>
    <linearGradient id="fxg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor={BRAND.cyan} />
      <stop offset="50%" stopColor={BRAND.violet} />
      <stop offset="100%" stopColor={BRAND.magenta} />
    </linearGradient>
  </defs>
);

const Icons: Record<IconKey, React.FC> = {
  money: () => (
    <svg width="150" height="150" viewBox="0 0 100 100"><G />
      <rect x="12" y="26" width="76" height="48" rx="8" fill="none" stroke="url(#fxg)" strokeWidth="6" />
      <circle cx="50" cy="50" r="15" fill="none" stroke="url(#fxg)" strokeWidth="6" />
      <text x="50" y="60" fontSize="26" fontWeight="900" textAnchor="middle" fill={BRAND.cyan}>$</text>
    </svg>
  ),
  coins: () => (
    <svg width="150" height="150" viewBox="0 0 100 100"><G />
      <ellipse cx="50" cy="30" rx="26" ry="10" fill={BRAND.cyan} opacity="0.9" />
      <ellipse cx="50" cy="46" rx="26" ry="10" fill={BRAND.violet} opacity="0.9" />
      <ellipse cx="50" cy="62" rx="26" ry="10" fill={BRAND.magenta} opacity="0.95" />
      <text x="50" y="68" fontSize="16" fontWeight="900" textAnchor="middle" fill="#0d1117">$</text>
    </svg>
  ),
  growth: () => (
    <svg width="150" height="150" viewBox="0 0 100 100"><G />
      <path d="M16 78 L40 54 L56 66 L86 24" fill="none" stroke="url(#fxg)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M70 24 L86 24 L86 40" fill="none" stroke="url(#fxg)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  clock: () => (
    <svg width="150" height="150" viewBox="0 0 100 100"><G />
      <circle cx="50" cy="52" r="34" fill="none" stroke="url(#fxg)" strokeWidth="6" />
      <path d="M50 52 L50 32 M50 52 L66 60" stroke={BRAND.cyan} strokeWidth="6" strokeLinecap="round" />
    </svg>
  ),
  card: () => (
    <svg width="150" height="150" viewBox="0 0 100 100"><G />
      <rect x="14" y="30" width="72" height="46" rx="8" fill="none" stroke="url(#fxg)" strokeWidth="6" />
      <rect x="14" y="42" width="72" height="10" fill={BRAND.violet} />
    </svg>
  ),
  warning: () => (
    <svg width="150" height="150" viewBox="0 0 100 100"><G />
      <path d="M50 18 L86 80 L14 80 Z" fill="none" stroke="url(#fxg)" strokeWidth="6" strokeLinejoin="round" />
      <path d="M50 42 L50 62 M50 70 L50 72" stroke={BRAND.magenta} strokeWidth="7" strokeLinecap="round" />
    </svg>
  ),
};

const HOLD = 40; // ~1,3s: quanto o ícone fica na tela após o gatilho

export const IconBurst: React.FC<{ narration: string; totalFrames: number; words?: { word: string; start: number; end: number }[] }> = ({ narration, totalFrames, words }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const timings = words && words.length ? wordTimingsFromReal(words, fps) : layoutWords(narration, totalFrames);

  // Gatilho mais recente ainda "vivo" (dentro da janela HOLD) — segura o ícone
  // por ~1,3s em vez de só no frame da palavra (senão pisca e some).
  let chosen: { key: IconKey; start: number } | null = null;
  for (const w of timings) {
    const k = iconFor(w.word);
    if (k && w.start <= frame && frame - w.start < HOLD) chosen = { key: k, start: w.start };
  }
  if (!chosen) return null;

  const local = frame - chosen.start;
  const pop = spring({ frame: local, fps, config: { damping: 12, mass: 0.4 } });
  const scale = interpolate(pop, [0, 1], [0.3, 1]);
  const fade = interpolate(local, [0, 5, HOLD - 8, HOLD], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const float = Math.sin(local / 6) * 8;
  const Icon = Icons[chosen.key];

  return (
    <div style={{
      position: 'absolute', top: 300, width: '100%', display: 'flex', justifyContent: 'center',
      transform: `translateY(${float}px) scale(${scale})`, opacity: fade,
      filter: 'drop-shadow(0 8px 30px rgba(139,92,246,0.5))',
    }}>
      <Icon />
    </div>
  );
};
