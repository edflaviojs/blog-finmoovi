import { createContext, useContext } from 'react';
import { AbsoluteFill, Audio, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import { BRAND, DISPLAY, BODY, gradientText } from './theme';
import { FinMooviIcon } from './icon';
import { KaraokeCaption } from './captions';
import { IconBurst } from './icons-fx';
import { SceneSfx } from './audio/sfx';
import { Pop3D } from './broll/card3d-kit';

// ─────────────────────────────────────────────────────────────────────────────
// Fundo vivo: gradiente escuro + manchas de luz que respiram + partículas subindo
// + grade sutil em movimento. Dá "muito motion" mesmo sem b-roll.
// ─────────────────────────────────────────────────────────────────────────────
const Particles: React.FC = () => {
  const frame = useCurrentFrame();
  const dots = new Array(24).fill(0);
  return (
    <AbsoluteFill>
      {dots.map((_, i) => {
        const x = random(`x${i}`) * 1080;
        const speed = 0.4 + random(`s${i}`) * 1.1;
        const size = 3 + random(`z${i}`) * 6;
        const y = (1920 - ((frame * speed * 6) + random(`o${i}`) * 1920)) % 1920;
        const twinkle = 0.15 + 0.35 * (0.5 + 0.5 * Math.sin(frame / 12 + i));
        const color = i % 2 === 0 ? BRAND.cyan : BRAND.magenta;
        // sem filter:blur — pontinhos pequenos ficam ok crus (e o render voa).
        return (
          <div key={i} style={{
            position: 'absolute', left: x, top: y, width: size, height: size,
            borderRadius: '50%', background: color, opacity: twinkle,
          }} />
        );
      })}
    </AbsoluteFill>
  );
};

// Manchas de luz da marca. Usam radial-gradient (glow suave NATIVO, barato) no lugar
// de filter:blur() gigante — MESMO visual bokeh, mas SEM o custo de reblur por frame.
// Ganho grande de velocidade de render (era o gargalo no runner do Actions).
const glow = (color: string) => `radial-gradient(circle at center, ${color} 0%, transparent 66%)`;

export const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 40) * 40;
  const pulse = 0.16 + 0.05 * Math.sin(frame / 30);
  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: -180 + drift, left: -260, width: 1100, height: 1100,
        background: glow(BRAND.cyan), opacity: pulse + 0.05,
      }} />
      <div style={{
        position: 'absolute', bottom: -280 - drift, right: -320, width: 1240, height: 1240,
        background: glow(BRAND.magenta), opacity: pulse,
      }} />
      <div style={{
        position: 'absolute', top: '28%', left: '16%', width: 840, height: 840,
        background: glow(BRAND.violet), opacity: 0.13,
      }} />
      <Particles />
    </AbsoluteFill>
  );
};

// Marca d'água: ÍCONE + wordmark (o ícone estava faltando antes)
export const Watermark: React.FC = () => {
  const frame = useCurrentFrame();
  const float = Math.sin(frame / 24) * 3;
  return (
    <div style={{
      position: 'absolute', top: 66, width: '100%',
      display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 14,
      transform: `translateY(${float}px)`,
    }}>
      <FinMooviIcon size={46} idSuffix="wm" />
      <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 40, letterSpacing: -0.5 }}>
        <span style={{ color: BRAND.text }}>Fin</span>
        <span style={gradientText}>Moovi</span>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CINEMA FINISH (R6): grão de filme (SVG noise ≤0.05) + vinheta suave nas bordas.
// Grão via background-image de um SVG feTurbulence tileável (rasterizado UMA vez e
// repetido) — SEM filter:blur nem recomputo por frame; só a posição desliza (GPU).
// ─────────────────────────────────────────────────────────────────────────────
const GRAIN_SVG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'>" +
      "<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter>" +
      "<rect width='100%' height='100%' filter='url(#n)'/></svg>",
  );

export const CinemaGrain: React.FC = () => {
  const frame = useCurrentFrame();
  const shift = (frame * 13) % 160;
  return (
    <AbsoluteFill style={{
      pointerEvents: 'none', opacity: 0.045, mixBlendMode: 'overlay',
      backgroundImage: `url("${GRAIN_SVG}")`, backgroundRepeat: 'repeat',
      backgroundPosition: `${shift}px ${-shift}px`,
    }} />
  );
};

export const Vignette: React.FC = () => (
  <AbsoluteFill style={{
    pointerEvents: 'none',
    background: 'radial-gradient(ellipse at center, transparent 52%, rgba(0,0,0,0.45) 100%)',
  }} />
);

// ─────────────────────────────────────────────────────────────────────────────
// HERO BRIDGE (R4b): um orbe/moeda da marca que VIAJA entre as posições-âncora de
// cada cena. Fica atrás do conteúdo e sobe à tona nas transições (crossfade), então
// o CENTRO nunca fica vazio no cruzamento. Barato: gradiente + rotação, sem blur.
// ─────────────────────────────────────────────────────────────────────────────
const orbAnchorFor = (type: string, role: string): { x: number; y: number } => {
  if (role === 'cta' || role === 'outro') return { x: 0.5, y: 0.46 };
  switch (type) {
    case 'number': return { x: 0.5, y: 0.42 };
    case 'chart': return { x: 0.3, y: 0.6 }; // rumo à origem do eixo Y do gráfico
    case 'formula': return { x: 0.5, y: 0.4 };
    case 'title': return { x: 0.5, y: 0.4 };
    case 'list': return { x: 0.36, y: 0.44 };
    default: return { x: 0.5, y: 0.45 };
  }
};

export const HeroOrb: React.FC<{
  starts: number[];
  types: string[];
  roles: string[];
}> = ({ starts, types, roles }) => {
  const frame = useCurrentFrame();
  if (!starts.length) return null;
  const anchors = types.map((t, i) => orbAnchorFor(t, roles[i] || ''));
  const xs = anchors.map((a) => a.x);
  const ys = anchors.map((a) => a.y);
  // interpolate exige entrada estritamente crescente (starts já é); 1 cena → estático.
  const x = starts.length > 1
    ? interpolate(frame, starts, xs, { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : xs[0];
  const y = starts.length > 1
    ? interpolate(frame, starts, ys, { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : ys[0];
  const bob = Math.sin(frame / 18) * 10;
  const spin = frame * 1.1;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div style={{
        position: 'absolute', left: `${x * 100}%`, top: `${y * 100}%`,
        transform: `translate(-50%, -50%) translateY(${bob}px)`,
      }}>
        <div style={{
          width: 96, height: 96, borderRadius: '50%', background: BRAND.gradient, opacity: 0.5,
          boxShadow: '0 0 60px rgba(139,92,246,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transform: `rotate(${spin}deg)`,
        }}>
          <div style={{ transform: `rotate(${-spin}deg)` }}>
            <FinMooviIcon size={46} idSuffix="orb" mono="#0d1117" />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Utilidades de valor (odômetro / intros): extrai prefixo + número pt-BR + sufixo.
// "R$ 3.200.000" → {prefix:"R$ ", value:3200000, decimals:0}; "R$ 3,2 mi" → 3,2/1 casa.
// ─────────────────────────────────────────────────────────────────────────────
function parseAmount(text: string): { prefix: string; value: number; decimals: number; suffix: string; ok: boolean } {
  const m = text.match(/(\d[\d.\s]*(?:,\d+)?)/);
  if (!m || m.index === undefined) return { prefix: text, value: 0, decimals: 0, suffix: '', ok: false };
  const raw = m[1];
  const prefix = text.slice(0, m.index);
  const suffix = text.slice(m.index + raw.length);
  const commaPart = raw.split(',')[1];
  const decimals = commaPart ? commaPart.replace(/\D/g, '').length : 0;
  const num = parseFloat(raw.replace(/\./g, '').replace(/\s/g, '').replace(',', '.'));
  return { prefix, value: Number.isFinite(num) ? num : 0, decimals, suffix, ok: Number.isFinite(num) };
}

function formatPtBR(value: number, decimals: number): string {
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
}

// ─────────────────────────────────────────────────────────────────────────────
// ABERTURA DISRUPTIVA v2 (R5): 5 arquétipos escolhidos por intro.style. Todos ~45f,
// terminam ENTREGANDO limpo para a cena 1 (nada de frame morto). 'classic' = legado.
// Todos reusam boom.ogg + flash branco + tokens da marca.
// ─────────────────────────────────────────────────────────────────────────────
type IntroStyle = 'contraste' | 'contagem' | 'timer' | 'meio' | 'objeto' | 'classic';

const FlashBoom: React.FC<{ frame: number; at?: number; window?: [number, number, number] }> = ({ frame, window = [0, 2, 12] }) => {
  const flash = interpolate(frame, window, [1, 0.7, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <>
      <Audio src={staticFile('sfx/boom.ogg')} volume={0.9} />
      <AbsoluteFill style={{ background: '#fff', opacity: flash, pointerEvents: 'none' }} />
    </>
  );
};

const ClassicIntro: React.FC<{ big: string; sub: string }> = ({ big, sub }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const slam = spring({ frame, fps, config: { damping: 9, mass: 0.7 } });
  const scale = interpolate(slam, [0, 1], [2.6, 1]);
  const shake = frame < 10 ? Math.sin(frame * 3) * (1 - frame / 10) * 10 : 0;
  const subIn = spring({ frame: frame - 14, fps, config: { damping: 14 } });
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
      <FlashBoom frame={frame} />
      <div style={{
        ...gradientText, fontFamily: DISPLAY, fontWeight: 900, fontSize: 132, lineHeight: 1,
        transform: `scale(${scale}) translateX(${shake}px)`, textAlign: 'center', padding: '0 40px',
        filter: 'drop-shadow(0 0 50px rgba(139,92,246,0.6))',
      }}>{big}</div>
      <div style={{
        marginTop: 34, fontFamily: BODY, fontWeight: 800, fontSize: 56, color: BRAND.text, textAlign: 'center',
        opacity: interpolate(subIn, [0, 1], [0, 1]), transform: `translateY(${interpolate(subIn, [0, 1], [24, 0])}px)`,
      }}>{sub}</div>
    </AbsoluteFill>
  );
};

// 'contraste' — tela dividida: dois contadores CORRENDO em velocidades diferentes.
const ContrasteIntro: React.FC<{ big: string; sub: string }> = ({ big, sub }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const amt = parseAmount(big);
  const target = amt.ok ? amt.value : 1000;
  const fast = interpolate(frame, [4, 34], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  const slow = interpolate(frame, [4, 44], [0, 0.34], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const enter = spring({ frame, fps, config: { damping: 16 } });
  const split = interpolate(enter, [0, 1], [40, 0]);
  const fmt = (p: number) => (amt.ok ? `${amt.prefix}${formatPtBR(target * p, amt.decimals)}${amt.suffix}` : big);
  const Half: React.FC<{ side: 'l' | 'r'; p: number; label: string; color: string }> = ({ side, p, label, color }) => (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
      transform: `translateX(${side === 'l' ? -split : split}px)`, padding: '0 24px',
    }}>
      <div style={{ fontFamily: BODY, fontWeight: 800, fontSize: 34, color: BRAND.sub, marginBottom: 14 }}>{label}</div>
      <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 74, color, textAlign: 'center', filter: `drop-shadow(0 0 26px ${color}66)` }}>{fmt(p)}</div>
    </div>
  );
  return (
    <AbsoluteFill style={{ flexDirection: 'row', alignItems: 'stretch' }}>
      <FlashBoom frame={frame} />
      <Half side="l" p={slow} label="devagar" color={BRAND.sub} />
      <div style={{ width: 4, background: BRAND.gradient, opacity: 0.7 }} />
      <Half side="r" p={fast} label={sub} color={BRAND.cyan} />
    </AbsoluteFill>
  );
};

// 'contagem' — valor GRANDE contando para BAIXO + partículas sugadas + linha de urgência.
const ContagemIntro: React.FC<{ big: string; sub: string }> = ({ big, sub }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const amt = parseAmount(big);
  const target = amt.ok ? amt.value : 1000;
  const p = interpolate(frame, [2, 40], [1, 0.08], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic) });
  const slam = spring({ frame, fps, config: { damping: 11 } });
  const scale = interpolate(slam, [0, 1], [1.8, 1]);
  const subIn = interpolate(frame, [16, 26], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const dots = new Array(16).fill(0);
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
      <FlashBoom frame={frame} />
      {/* partículas sendo SUGADAS para o centro */}
      <AbsoluteFill style={{ pointerEvents: 'none' }}>
        {dots.map((_, i) => {
          const a = (i / dots.length) * Math.PI * 2;
          const t = interpolate(frame, [0, 40], [1, 0], { extrapolateRight: 'clamp' });
          const r = 60 + t * 620;
          return (
            <div key={i} style={{
              position: 'absolute', left: `calc(50% + ${Math.cos(a) * r}px)`, top: `calc(46% + ${Math.sin(a) * r}px)`,
              width: 8, height: 8, borderRadius: '50%', background: i % 2 ? BRAND.magenta : BRAND.cyan, opacity: 0.7 * t,
            }} />
          );
        })}
      </AbsoluteFill>
      <div style={{
        ...gradientText, fontFamily: DISPLAY, fontWeight: 900, fontSize: 120, lineHeight: 1, transform: `scale(${scale})`,
        textAlign: 'center', padding: '0 30px', filter: 'drop-shadow(0 0 44px rgba(214,33,156,0.6))',
      }}>{amt.ok ? `${amt.prefix}${formatPtBR(target * p, amt.decimals)}${amt.suffix}` : big}</div>
      <div style={{
        marginTop: 28, fontFamily: BODY, fontWeight: 800, fontSize: 50, color: BRAND.yellow, textAlign: 'center',
        opacity: subIn, textShadow: '0 3px 16px rgba(0,0,0,0.6)',
      }}>{sub}</div>
    </AbsoluteFill>
  );
};

// 'timer' — pergunta (sub) + contagem 3-2-1 num anel que se esvazia.
const TimerIntro: React.FC<{ big: string; sub: string }> = ({ big, sub }) => {
  const frame = useCurrentFrame();
  const R = 150, C = 2 * Math.PI * R;
  const p = interpolate(frame, [4, 44], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const count = Math.max(1, 3 - Math.floor(p * 3 + 0.0001));
  const beat = spring({ frame: frame - (3 - count) * 13, fps: useVideoConfig().fps, config: { damping: 10 } });
  const numScale = interpolate(beat, [0, 1], [1.6, 1]);
  const subIn = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
      <FlashBoom frame={frame} window={[0, 3, 14]} />
      <div style={{ fontFamily: BODY, fontWeight: 800, fontSize: 52, color: BRAND.text, textAlign: 'center', padding: '0 50px', opacity: subIn, marginBottom: 44 }}>{sub || big}</div>
      <div style={{ position: 'relative', width: 360, height: 360, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <svg width={360} height={360} style={{ position: 'absolute', transform: 'rotate(-90deg)' }}>
          <defs>
            <linearGradient id="timerg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={BRAND.cyan} />
              <stop offset="100%" stopColor={BRAND.magenta} />
            </linearGradient>
          </defs>
          <circle cx={180} cy={180} r={R} fill="none" stroke={BRAND.panel} strokeWidth={14} />
          <circle cx={180} cy={180} r={R} fill="none" stroke="url(#timerg)" strokeWidth={14} strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={C * p} />
        </svg>
        <div style={{ ...gradientText, fontFamily: DISPLAY, fontWeight: 900, fontSize: 200, transform: `scale(${numScale})` }}>{count}</div>
      </div>
    </AbsoluteFill>
  );
};

// 'meio' — o gráfico exponencial JÁ correndo no meio do traço + contador vivo, corte flash.
const MeioIntro: React.FC<{ big: string; sub: string }> = ({ big, sub }) => {
  const frame = useCurrentFrame();
  const amt = parseAmount(big);
  const W = 900, H = 620, pad = 60, N = 40;
  // começa JÁ adiantado (meio do traço) e completa rápido.
  const p = interpolate(frame, [0, 40], [0.45, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  const drawN = Math.floor(p * N);
  const exp: string[] = [];
  for (let i = 0; i <= drawN; i++) {
    const x = pad + (i / N) * (W - pad * 2);
    const y = H - pad - Math.pow(i / N, 2.2) * (H - pad * 2);
    exp.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`);
  }
  const hx = pad + (drawN / N) * (W - pad * 2);
  const hy = H - pad - Math.pow(drawN / N, 2.2) * (H - pad * 2);
  const counter = amt.ok ? `${amt.prefix}${formatPtBR(amt.value * p, amt.decimals)}${amt.suffix}` : big;
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
      <FlashBoom frame={frame} window={[0, 2, 10]} />
      <svg width={W} height={H}>
        <defs>
          <linearGradient id="meiog" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={BRAND.cyan} />
            <stop offset="50%" stopColor={BRAND.violet} />
            <stop offset="100%" stopColor={BRAND.magenta} />
          </linearGradient>
        </defs>
        <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke={BRAND.sub} strokeWidth={2} opacity={0.35} />
        <path d={exp.join(' ')} fill="none" stroke="url(#meiog)" strokeWidth={12} strokeLinecap="round" />
        <circle cx={hx} cy={hy} r={12 + Math.sin(frame / 4) * 4} fill={BRAND.magenta} opacity={0.35} />
        <circle cx={hx} cy={hy} r={15} fill={BRAND.magenta} />
      </svg>
      <div style={{ ...gradientText, fontFamily: DISPLAY, fontWeight: 900, fontSize: 88, marginTop: 8, filter: 'drop-shadow(0 0 30px rgba(139,92,246,0.5))' }}>{counter}</div>
      {sub && <div style={{ fontFamily: BODY, fontWeight: 800, fontSize: 40, color: BRAND.sub, marginTop: 6 }}>{sub}</div>}
    </AbsoluteFill>
  );
};

// 'objeto' — moeda/cartão 3D SLAM com shake de impacto (reusa Pop3D do card3d-kit).
const ObjetoIntro: React.FC<{ big: string; sub: string }> = ({ big, sub }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const shake = frame < 12 ? Math.sin(frame * 3.2) * (1 - frame / 12) * 14 : 0;
  const subIn = spring({ frame: frame - 16, fps, config: { damping: 14 } });
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column', perspective: 1200 }}>
      <FlashBoom frame={frame} />
      <div style={{ transform: `translateX(${shake}px)`, transformStyle: 'preserve-3d' }}>
        <Pop3D delay={0} rotY={0}>
          <div style={{
            width: 300, height: 300, borderRadius: '50%',
            background: 'conic-gradient(from 45deg, #22d3ee, #8b5cf6, #d6219c, #22d3ee)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 40px 90px rgba(0,0,0,0.6), inset 0 0 40px rgba(255,255,255,0.25)',
            border: '10px solid rgba(255,255,255,0.18)',
          }}>
            <div style={{ width: 220, height: 220, borderRadius: '50%', background: BRAND.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FinMooviIcon size={150} idSuffix="obj" />
            </div>
          </div>
        </Pop3D>
      </div>
      <div style={{
        marginTop: 30, fontFamily: DISPLAY, fontWeight: 900, fontSize: 84, ...gradientText, textAlign: 'center', padding: '0 30px',
        opacity: interpolate(subIn, [0, 1], [0, 1]), transform: `translateY(${interpolate(subIn, [0, 1], [22, 0])}px)`,
      }}>{big}</div>
      {sub && <div style={{ fontFamily: BODY, fontWeight: 800, fontSize: 44, color: BRAND.text, opacity: interpolate(subIn, [0, 1], [0, 1]), marginTop: 8 }}>{sub}</div>}
    </AbsoluteFill>
  );
};

export const ShockIntro: React.FC<{ big: string; sub: string; style?: IntroStyle }> = ({ big, sub, style }) => {
  switch (style) {
    case 'contraste': return <ContrasteIntro big={big} sub={sub} />;
    case 'contagem': return <ContagemIntro big={big} sub={sub} />;
    case 'timer': return <TimerIntro big={big} sub={sub} />;
    case 'meio': return <MeioIntro big={big} sub={sub} />;
    case 'objeto': return <ObjetoIntro big={big} sub={sub} />;
    case 'classic':
    default: return <ClassicIntro big={big} sub={sub} />;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Casca de cena: Ken Burns contínuo + camada PALCO (sempre visível) + entrada do
// CONTEÚDO no tempo REAL da fala. O centro NUNCA fica vazio.
// ─────────────────────────────────────────────────────────────────────────────
type Scene = {
  role: string;
  narration: string;
  onScreenText?: string;
  cue?: string;
  cues?: string[];
  visual: { type: string; note?: string };
  durationSec: number;
};

type SceneTiming = { audioFile?: string; durationSec?: number; words?: { word: string; start: number; end: number }[] };

const normSync = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

// cues[] tem prioridade sobre o legado cue (string). cues[0] = revelação PRINCIPAL.
function cueList(scene: Scene): string[] {
  if (scene.cues && scene.cues.length) return scene.cues;
  if (scene.cue) return [scene.cue];
  return [];
}

// Frame (local) em que uma palavra-gatilho é FALADA (timing real). null se não casar.
function matchWordFrame(words: { word: string; start: number; end: number }[], cue: string, fps: number): number | null {
  const c = normSync(cue);
  if (!c) return null;
  const w = words.find((x) => normSync(x.word) === c || (c.length >= 2 && normSync(x.word).includes(c)));
  return w ? Math.max(0, Math.round(w.start * fps)) : null;
}

// Frame (local da cena) da revelação PRINCIPAL — sincronizado com a FALA.
// Prioridade: cues[0] → 1ª palavra de ênfase (número/R$/%) → 0 (fallback proporcional
// de hoje, ou seja, aparece já no início — nunca vazio).
function revealFrameFor(scene: Scene, timing: SceneTiming | null | undefined, fps: number): number {
  const words = timing?.words;
  if (!words || !words.length) return 0;
  const cues = cueList(scene);
  if (cues.length) {
    const f = matchWordFrame(words, cues[0], fps);
    if (f !== null) return f;
  }
  const emph = words.find((x) => /\d/.test(x.word) || /[%×]/.test(x.word) || /r\$/i.test(x.word));
  if (emph) return Math.max(0, Math.round(emph.start * fps));
  return 0;
}

// Frames das revelações ESCALONADAS (cues[1..]) p/ gráfico e lista (R2). Ordenados.
function cueFramesFor(scene: Scene, timing: SceneTiming | null | undefined, fps: number): number[] {
  const words = timing?.words;
  const cues = cueList(scene);
  if (!words || !words.length || !cues.length) return [];
  const out: number[] = [];
  for (const c of cues) {
    const f = matchWordFrame(words, c, fps);
    if (f !== null) out.push(f);
  }
  return out.sort((a, b) => a - b);
}

// Contexto: frame (local) da revelação principal, já com clamp p/ dar tela ao conteúdo.
const RevealCtx = createContext(0);
const useReveal = () => useContext(RevealCtx);

// Entrada do CONTEÚDO ancorada na revelação: invisível antes, spring decisivo NO
// instante da palavra; `antic` é o "charge-up" que sobe ~9f antes (R1).
function useContentEntrance() {
  const reveal = useReveal();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - reveal, fps, config: { damping: 14, mass: 0.6 } });
  const scale = interpolate(enter, [0, 1], [0.86, 1]);
  const y = interpolate(enter, [0, 1], [46, 0]);
  const opacity = interpolate(frame, [reveal - 2, reveal + 5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const antic = interpolate(frame, [reveal - 9, reveal], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return { reveal, frame, enter, scale, y, opacity, antic };
}

const SceneShell: React.FC<{ scene: Scene; timing?: SceneTiming | null; children: React.ReactNode }> = ({ scene, timing, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationSec = timing?.durationSec ?? scene.durationSec;
  const totalFrames = Math.max(1, Math.round(durationSec * fps));
  // Ken Burns: leve zoom-in contínuo — nada fica parado (roda a cena inteira).
  const kb = interpolate(frame, [0, totalFrames], [1.0, 1.08], { extrapolateRight: 'clamp' });
  // Revelação real da fala, com clamp: se cairia nos últimos 20% da cena, antecipa
  // p/ o conteúdo ter tempo de tela (R1).
  let reveal = revealFrameFor(scene, timing, fps);
  const maxReveal = Math.floor(totalFrames * 0.8);
  if (reveal > maxReveal) reveal = maxReveal;
  // SOCO sincronizado (pulse + flash) no instante da palavra.
  const punch = reveal > 2 ? interpolate(frame, [reveal - 1, reveal + 4, reveal + 16], [1, 1.13, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 1;
  const flash = reveal > 2 ? interpolate(frame, [reveal, reveal + 3, reveal + 14], [0, 0.5, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 0;
  // Parallax 3ª camada: leve contra-deriva do conteúdo (bg blobs = mais lento).
  const drift = Math.sin(frame / 46) * -6;
  // ANTICIPAÇÃO (R1): anel de "charge-up" que cresce ~9f antes e some ao revelar.
  const charge = interpolate(frame, [reveal - 9, reveal], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const chargeOut = interpolate(frame, [reveal, reveal + 8], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const chargeVis = reveal > 2 ? charge * chargeOut : 0;
  // Light sweep (R6): faixa de luz cruzando o conteúdo no momento do soco.
  const sweep = interpolate(frame, [reveal - 2, reveal + 14], [-140, 140], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const sweepOn = reveal > 2 && frame >= reveal - 2 && frame <= reveal + 16;
  return (
    <AbsoluteFill>
      {/* PALCO: brilho ambiente atrás do centro — o miolo nunca fica vazio. */}
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', paddingBottom: 380 }}>
        <div style={{ width: 760, height: 760, borderRadius: '50%', background: glow(BRAND.violet), opacity: 0.1, transform: `translateX(${drift}px)` }} />
      </AbsoluteFill>
      {chargeVis > 0.01 && (
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', paddingBottom: 380 }}>
          <div style={{
            width: 120 + charge * 220, height: 120 + charge * 220, borderRadius: '50%',
            border: `3px solid ${BRAND.cyan}`, opacity: 0.5 * chargeVis, boxShadow: `0 0 ${Math.round(40 * charge)}px ${BRAND.cyan}`,
          }} />
        </AbsoluteFill>
      )}
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', paddingBottom: 380, paddingLeft: 60, paddingRight: 60 }}>
        <div style={{
          position: 'relative', transform: `scale(${kb * punch}) translateX(${drift}px)`, textAlign: 'center',
          filter: flash > 0 ? `drop-shadow(0 0 ${Math.round(flash * 50)}px ${BRAND.cyan})` : undefined,
        }}>
          <RevealCtx.Provider value={reveal}>{children}</RevealCtx.Provider>
          {sweepOn && (
            <div style={{
              position: 'absolute', inset: -30, pointerEvents: 'none', mixBlendMode: 'overlay',
              background: 'linear-gradient(105deg, transparent 42%, rgba(255,255,255,0.35) 50%, transparent 58%)',
              transform: `translateX(${sweep}%)`,
            }} />
          )}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// Camada de ÁUDIO (narração + SFX) de UMA cena. Vai no trilho MESTRE com a duração
// DESCONTADA das transições, p/ a voz NÃO empilhar com a cena vizinha no cruzamento.
export const SceneAudioTrack: React.FC<{ scene: Scene; timing?: SceneTiming | null }> = ({ scene, timing }) => {
  const { fps } = useVideoConfig();
  const durationSec = timing?.durationSec ?? scene.durationSec;
  const totalFrames = Math.max(1, Math.round(durationSec * fps));
  return (
    <AbsoluteFill>
      {timing?.audioFile && <Audio src={staticFile(timing.audioFile)} />}
      <SceneSfx narration={scene.narration} totalFrames={totalFrames} words={timing?.words} />
    </AbsoluteFill>
  );
};

// Camada VISUAL (legenda karaokê + ícones) de UMA cena. Vai no trilho MESTRE com a
// duração CHEIA (R4a): sem o desconto das transições → a legenda NÃO abre buraco no
// cruzamento. Como as palavras têm timing real, não há risco de "falar em dobro".
export const SceneCaptionTrack: React.FC<{ scene: Scene; timing?: SceneTiming | null }> = ({ scene, timing }) => {
  const { fps } = useVideoConfig();
  const durationSec = timing?.durationSec ?? scene.durationSec;
  const totalFrames = Math.max(1, Math.round(durationSec * fps));
  return (
    <AbsoluteFill>
      <IconBurst narration={scene.narration} totalFrames={totalFrames} words={timing?.words} />
      <KaraokeCaption narration={scene.narration} totalFrames={totalFrames} words={timing?.words} />
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Cenas por tipo de visual (motion graphics)
// ─────────────────────────────────────────────────────────────────────────────

// NÚMERO = ODÔMETRO (R3): conta de 0 até o alvo (eased ~1s) a partir da revelação,
// formatado pt-BR (R$, separador de milhar). Mantém glow/float depois.
const SceneNumber: React.FC<{ scene: Scene }> = ({ scene }) => {
  const { reveal, frame, scale, y, opacity, antic } = useContentEntrance();
  const text = scene.onScreenText || '';
  const amt = parseAmount(text);
  const glowV = 24 + Math.sin(frame / 7) * 12;
  const float = Math.sin(frame / 20) * 8;
  const DUR = 30; // ~1s de contagem
  const p = interpolate(frame, [reveal, reveal + DUR], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  const shown = amt.ok ? `${amt.prefix}${formatPtBR(amt.value * p, amt.decimals)}${amt.suffix}` : text;
  return (
    <div style={{ transform: `translateY(${float + y}px) scale(${scale})`, opacity, maxWidth: 980 }}>
      {/* PALCO: pedestal/painel sutil sempre presente atrás do número. */}
      <div style={{
        ...gradientText, fontFamily: DISPLAY, fontSize: 132, fontWeight: 900, lineHeight: 1.12,
        filter: `drop-shadow(0 0 ${Math.round(glowV + antic * 26)}px rgba(139,92,246,0.55))`, fontVariantNumeric: 'tabular-nums',
      }}>
        {shown}
      </div>
    </div>
  );
};

// Progresso ESCALONADO (R2): draw avança até o marco N na cue N; entre cues, eased.
function stagedProgress(frame: number, reveals: number[], reveal: number, endFrame: number, defaultDur = 46): number {
  if (!reveals.length) {
    return interpolate(frame, [reveal, reveal + defaultDur], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  }
  const n = reveals.length;
  let p = 0;
  for (let k = 0; k < n; k++) {
    if (frame < reveals[k]) break;
    const from = k / n;
    const to = (k + 1) / n;
    const nextR = k + 1 < n ? reveals[k + 1] : endFrame;
    const seg = Math.max(6, Math.min(defaultDur, nextR - reveals[k]));
    const s = interpolate(frame, [reveals[k], reveals[k] + seg], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
    p = from + (to - from) * s;
  }
  return p;
}

const SceneChart: React.FC<{ scene: Scene; timing?: SceneTiming | null; sceneFrames: number }> = ({ scene, timing, sceneFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const reveal = useReveal();
  const W = 920, H = 560, pad = 44, N = 40;
  const reveals = cueFramesFor(scene, timing, fps);
  const p = stagedProgress(frame, reveals, reveal, sceneFrames, 46);
  const drawN = Math.max(0, Math.floor(p * N));
  // FURNITURE (sempre): eixos + reta linear tracejada (contexto/comparação).
  const linFull: string[] = [];
  for (let i = 0; i <= N; i++) {
    const x = pad + (i / N) * (W - pad * 2);
    const y = H - pad - (i / N) * (H - pad * 2) * 0.55;
    linFull.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`);
  }
  // CONTEÚDO: exponencial escalonado.
  const exp: string[] = [];
  for (let i = 0; i <= drawN; i++) {
    const x = pad + (i / N) * (W - pad * 2);
    const y = H - pad - Math.pow(i / N, 2.2) * (H - pad * 2);
    exp.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`);
  }
  const hx = pad + (drawN / N) * (W - pad * 2);
  const hy = H - pad - Math.pow(drawN / N, 2.2) * (H - pad * 2);
  const pulse = 12 + Math.sin(frame / 5) * 4;
  const nStages = reveals.length;
  const labelOpacity = interpolate(frame, [reveal, reveal + 6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{ textAlign: 'center' }}>
      <svg width={W} height={H}>
        <defs>
          <linearGradient id="cg" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={BRAND.cyan} />
            <stop offset="50%" stopColor={BRAND.violet} />
            <stop offset="100%" stopColor={BRAND.magenta} />
          </linearGradient>
        </defs>
        {/* FURNITURE sempre visível: eixos X/Y + reta linear tracejada. */}
        <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke={BRAND.sub} strokeWidth={2} opacity={0.35} />
        <line x1={pad} y1={pad} x2={pad} y2={H - pad} stroke={BRAND.sub} strokeWidth={2} opacity={0.25} />
        <path d={linFull.join(' ')} fill="none" stroke={BRAND.sub} strokeWidth={5} opacity={0.45} strokeDasharray="10 12" />
        {/* CONTEÚDO: curva exponencial escalonada. */}
        {drawN > 0 && <path d={exp.join(' ')} fill="none" stroke="url(#cg)" strokeWidth={10} strokeLinecap="round" />}
        {/* marcos: pontos que "pipocam" exatamente na sua palavra (R2). */}
        {nStages > 1 && reveals.map((mf, k) => {
          const f = (k + 1) / nStages;
          const mx = pad + f * (W - pad * 2);
          const my = H - pad - Math.pow(f, 2.2) * (H - pad * 2);
          const pop = spring({ frame: frame - mf, fps, config: { damping: 12, mass: 0.4 } });
          const r = interpolate(pop, [0, 1], [0, 12]);
          return <circle key={k} cx={mx} cy={my} r={Math.max(0, r)} fill={BRAND.cyan} opacity={0.95} />;
        })}
        {drawN > 0 && <circle cx={hx} cy={hy} r={pulse} fill={BRAND.magenta} opacity={0.35} />}
        {drawN > 0 && <circle cx={hx} cy={hy} r={13} fill={BRAND.magenta} />}
      </svg>
      {scene.onScreenText && (
        <div style={{ ...gradientText, fontFamily: DISPLAY, fontSize: 60, fontWeight: 900, marginTop: 6, opacity: labelOpacity }}>{scene.onScreenText}</div>
      )}
    </div>
  );
};

const SceneFormula: React.FC<{ scene: Scene }> = ({ scene }) => {
  const { reveal, frame, opacity } = useContentEntrance();
  const { fps } = useVideoConfig();
  const tokens = (scene.onScreenText || '').split(' ');
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 22, maxWidth: 940, opacity }}>
      {tokens.map((tk, i) => {
        const s = spring({ frame: frame - reveal, fps, delay: i * 5, config: { damping: 11, mass: 0.5 } });
        const scale = interpolate(s, [0, 1], [0.1, 1]);
        const rot = interpolate(s, [0, 1], [-12, 0]);
        const isOp = /^[÷×+=\-]$/.test(tk);
        return (
          <span key={i} style={{
            transform: `scale(${scale}) rotate(${rot}deg)`, fontFamily: DISPLAY, fontSize: 92, fontWeight: 900,
            ...(isOp ? { color: BRAND.sub } : gradientText),
          }}>{tk}</span>
        );
      })}
    </div>
  );
};

const SceneStatement: React.FC<{ scene: Scene }> = ({ scene }) => {
  const { reveal, frame, opacity, y } = useContentEntrance();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - reveal, fps, config: { damping: 15 } });
  const w = interpolate(s, [0, 1], [0, 280]);
  const float = Math.sin(frame / 18) * 6;
  return (
    <div style={{ transform: `translateY(${float + y}px)`, textAlign: 'center', maxWidth: 940, opacity }}>
      {/* FURNITURE: barra fantasma da underline sempre insinuada. */}
      <div style={{ position: 'relative' }}>
        <div style={{ color: BRAND.text, fontFamily: DISPLAY, fontSize: 82, fontWeight: 900, lineHeight: 1.12 }}>{scene.onScreenText}</div>
      </div>
      <div style={{ height: 12, width: w, margin: '30px auto 0', borderRadius: 8, background: BRAND.gradient }} />
    </div>
  );
};

// LISTA (R2): revela um item por cue; se houver menos cues que itens, distribui os
// restantes pelo tempo que sobra da cena.
const SceneList: React.FC<{ scene: Scene; timing?: SceneTiming | null; sceneFrames: number }> = ({ scene, timing, sceneFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const reveal = useReveal();
  const items = (scene.onScreenText || '').split(/\n|•|\|/).map((s) => s.trim()).filter(Boolean);
  const reveals = cueFramesFor(scene, timing, fps);
  const itemFrame = (i: number): number => {
    if (reveals.length) {
      if (i < reveals.length) return reveals[i];
      const last = reveals[reveals.length - 1];
      const extra = items.length - reveals.length;
      const span = Math.max(1, sceneFrames - last - 6);
      return last + Math.round(span * ((i - reveals.length + 1) / (extra + 1)));
    }
    return reveal + Math.round((Math.max(1, sceneFrames - reveal - 6)) * (i / Math.max(1, items.length)));
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 26, maxWidth: 940, textAlign: 'left' }}>
      {items.map((it, i) => {
        const rf = itemFrame(i);
        const s = spring({ frame: frame - rf, fps, config: { damping: 15, mass: 0.6 } });
        const op = interpolate(frame, [rf - 2, rf + 5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        const x = interpolate(s, [0, 1], [-40, 0]);
        return (
          <div key={i} style={{ opacity: op, transform: `translateX(${x}px)`, display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', background: BRAND.gradient, flex: '0 0 auto' }} />
            <div style={{ color: BRAND.text, fontFamily: DISPLAY, fontSize: 56, fontWeight: 800, lineHeight: 1.1 }}>{it}</div>
          </div>
        );
      })}
    </div>
  );
};

const SceneTitle: React.FC<{ scene: Scene }> = ({ scene }) => {
  const { reveal, frame, opacity } = useContentEntrance();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - reveal, fps, config: { damping: 18 } });
  const scale = interpolate(s, [0, 1], [0.7, 1]);
  return (
    <div style={{ transform: `scale(${scale})`, opacity, ...gradientText, fontFamily: DISPLAY, fontSize: 104, fontWeight: 900, lineHeight: 1.08, maxWidth: 960 }}>
      {scene.onScreenText}
    </div>
  );
};

// Pílula "Link na descrição" + seta descendo — linguagem compartilhada entre
// SceneCta e SceneApp (extraída p/ manter as duas cenas de CTA consistentes).
const LinkNaDescricaoPill: React.FC<{ bounce: number }> = ({ bounce }) => (
  <>
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 16,
      padding: '18px 34px', borderRadius: 999, border: `3px solid ${BRAND.cyan}`,
      background: 'rgba(34,211,238,0.10)', fontFamily: BODY, fontWeight: 800, fontSize: 46, color: BRAND.text,
    }}>
      Link na descrição
    </div>
    <div style={{ marginTop: 20 + bounce, display: 'flex', justifyContent: 'center' }}>
      <svg width="90" height="90" viewBox="0 0 100 100" fill="none">
        <path d="M50 12 L50 74 M28 54 L50 78 L72 54" stroke="url(#cta-grad)" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
        <defs>
          <linearGradient id="cta-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={BRAND.cyan} />
            <stop offset="100%" stopColor={BRAND.magenta} />
          </linearGradient>
        </defs>
      </svg>
    </div>
  </>
);

// CTA chamativa: título + linha "Link na descrição" + seta descendo animada.
const SceneCta: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 15 } });
  const scale = interpolate(s, [0, 1], [0.75, 1]);
  const bounce = Math.abs(Math.sin(frame / 9)) * 22;
  return (
    <div style={{ transform: `scale(${scale})`, textAlign: 'center' }}>
      <div style={{ fontFamily: DISPLAY, fontSize: 76, fontWeight: 900, ...gradientText, lineHeight: 1.1 }}>
        {scene.onScreenText}
      </div>
      <div style={{ marginTop: 34 }}>
        <LinkNaDescricaoPill bounce={bounce} />
      </div>
    </div>
  );
};

// APP (R7): mockup 3D do FinMoovi com a calculadora animada — cena de CTA premium.
// Entra no cue[0] ("calculadora"), badge GRÁTIS pipoca no cue[1], gráfico acelera/brilha
// no cue[2] ("gráfico"). Sem cues/timing → mesmo padrão de fallback proporcional já usado
// em SceneList/SceneChart (nunca fica travado).
const SceneApp: React.FC<{ scene: Scene; timing?: SceneTiming | null; sceneFrames: number }> = ({ scene, timing, sceneFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const reveal = useReveal(); // entrada do telefone/UI — cue[0] ("calculadora")
  const reveals = cueFramesFor(scene, timing, fps); // frames reais casados (ascendente)
  const revealSpan = Math.max(1, sceneFrames - reveal);
  // badge "GRÁTIS" no cue[1]; aceleração/brilho do gráfico no cue[2]. Sem casar palavra
  // real (timing ausente), cai numa distribuição proporcional do tempo restante da cena.
  const badgeFrame = reveals.length > 1 ? reveals[1] : reveal + Math.round(revealSpan * 0.32);
  const chartBoostFrame = reveals.length > 2 ? reveals[2] : reveal + Math.round(revealSpan * 0.62);
  const glowOn = frame >= chartBoostFrame;

  // Entrada do telefone: sobe de "longe" (translateZ) girando, mesma linguagem do Pop3D
  // do card3d-kit, mas ancorada na revelação real da fala (não no frame 0 da cena).
  const enter = spring({ frame: frame - reveal, fps, config: { damping: 13, mass: 0.7 } });
  const phoneOpacity = interpolate(frame, [reveal - 2, reveal + 6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const tz = interpolate(enter, [0, 1], [-560, 0]);
  const settleTilt = interpolate(enter, [0, 1], [-30, 0]);
  const drift = Math.sin((frame - reveal) / 60) * 4; // deriva lenta contínua (nunca estático)
  const riseY = interpolate(enter, [0, 1], [70, 0]);
  const scale = interpolate(enter, [0, 1], [0.82, 1]);

  // Headline (onScreenText) acima do telefone, sincronizada com a mesma revelação.
  const headlineOp = interpolate(frame, [reveal - 4, reveal + 4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const headlineY = interpolate(frame, [reveal - 4, reveal + 10], [26, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Badge GRÁTIS: pop com spring, começa em 0 (invisível) antes do seu frame.
  const badgeS = spring({ frame: frame - badgeFrame, fps, config: { damping: 11, mass: 0.5 } });
  const badgeScale = interpolate(badgeS, [0, 1], [0, 1]);
  const badgeRot = interpolate(badgeS, [0, 1], [-14, -6]);

  // Mini gráfico da calculadora: progresso escalonado (mesmo helper do SceneChart),
  // com um "boost" extra a partir do cue[2] p/ a curva acelerar/brilhar.
  const W = 260, H = 150, pad = 16, N = 28;
  const baseP = stagedProgress(frame, reveals, reveal, sceneFrames, 60);
  const boostP = interpolate(frame, [chartBoostFrame, sceneFrames - 4], [0, 0.35], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  const p = Math.min(1, baseP + boostP);
  const drawN = Math.max(0, Math.floor(p * N));
  const path: string[] = [];
  for (let i = 0; i <= drawN; i++) {
    const x = pad + (i / N) * (W - pad * 2);
    const y = H - pad - Math.pow(i / N, 2.1) * (H - pad * 2);
    path.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`);
  }
  const hx = pad + (drawN / N) * (W - pad * 2);
  const hy = H - pad - Math.pow(drawN / N, 2.1) * (H - pad * 2);
  // Contador ilustrativo (chrome de UI da calculadora, não vem da narração) subindo
  // junto com a cabeça da linha — "quanto o SEU dinheiro faz".
  const COUNTER_TARGET = 12480;
  const counterShown = `R$ ${formatPtBR(Math.round(p * COUNTER_TARGET), 0)}`;
  const bounce = Math.abs(Math.sin(frame / 9)) * 22;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26 }}>
      <div style={{
        opacity: headlineOp, transform: `translateY(${headlineY}px)`, fontFamily: DISPLAY, fontWeight: 900,
        fontSize: 64, ...gradientText, textAlign: 'center', maxWidth: 920, lineHeight: 1.14,
      }}>
        {scene.onScreenText}
      </div>
      <div style={{ perspective: 1400 }}>
        <div style={{
          position: 'relative', opacity: phoneOpacity, transformStyle: 'preserve-3d',
          transform: `translateZ(${tz}px) translateY(${riseY}px) rotateY(${settleTilt + drift}deg) rotateX(4deg) scale(${scale})`,
        }}>
          {/* moldura do telefone */}
          <div style={{
            width: 380, height: 620, borderRadius: 54, position: 'relative', overflow: 'hidden',
            background: 'linear-gradient(165deg, #1b2230, #0d1117)', border: '10px solid rgba(255,255,255,0.08)',
            boxShadow: '0 40px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(139,92,246,0.18)', padding: '24px 20px',
          }}>
            {/* notch */}
            <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 120, height: 22, background: '#000', borderRadius: '0 0 16px 16px' }} />
            {/* header: ícone + wordmark FinMoovi */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 18 }}>
              <FinMooviIcon size={28} idSuffix="phoneapp" />
              <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 20 }}>
                <span style={{ color: BRAND.text }}>Fin</span><span style={gradientText}>Moovi</span>
              </div>
            </div>
            {/* tela da calculadora */}
            <div style={{ marginTop: 18, background: BRAND.panel, borderRadius: 24, padding: '16px 14px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 15, color: BRAND.sub, marginBottom: 8 }}>Juros compostos</div>
              <svg width={W} height={H}>
                <defs>
                  <linearGradient id="app-chart-g" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={BRAND.cyan} />
                    <stop offset="50%" stopColor={BRAND.violet} />
                    <stop offset="100%" stopColor={BRAND.magenta} />
                  </linearGradient>
                </defs>
                <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke={BRAND.sub} strokeWidth={2} opacity={0.3} />
                {drawN > 0 && (
                  <path d={path.join(' ')} fill="none" stroke="url(#app-chart-g)" strokeWidth={glowOn ? 8 : 6} strokeLinecap="round"
                    style={{ filter: glowOn ? `drop-shadow(0 0 10px ${BRAND.magenta})` : undefined }} />
                )}
                {drawN > 0 && <circle cx={hx} cy={hy} r={glowOn ? 11 : 8} fill={BRAND.magenta} opacity={0.35} />}
                {drawN > 0 && <circle cx={hx} cy={hy} r={glowOn ? 8 : 6} fill={BRAND.magenta} />}
              </svg>
              <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: 13, color: BRAND.sub }}>seu dinheiro</div>
                <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 24, ...gradientText, fontVariantNumeric: 'tabular-nums' }}>{counterShown}</div>
              </div>
            </div>
          </div>
          {/* badge GRÁTIS — pipoca no cue[1] */}
          <div style={{
            position: 'absolute', top: -14, right: -10, transform: `scale(${badgeScale}) rotate(${badgeRot}deg)`,
            opacity: badgeScale, background: BRAND.gradient, color: BRAND.bg, fontFamily: DISPLAY, fontWeight: 900,
            fontSize: 24, letterSpacing: 0.5, padding: '10px 20px', borderRadius: 999, boxShadow: '0 10px 30px rgba(214,33,156,0.5)',
          }}>
            GRÁTIS
          </div>
        </div>
      </div>
      <LinkNaDescricaoPill bounce={bounce} />
    </div>
  );
};

// OUTRO = gancho EXPLÍCITO para o próximo vídeo (card + "próximo vídeo" + seta →).
const SceneOutro: React.FC<{ scene: Scene; nextTitle?: string }> = ({ scene, nextTitle }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 16 } });
  const cardX = interpolate(s, [0, 1], [120, 0]);
  const opacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: 'clamp' });
  const arrow = Math.sin(frame / 8) * 12;
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: DISPLAY, fontSize: 62, fontWeight: 900, color: BRAND.text, lineHeight: 1.15 }}>
        {scene.onScreenText}
      </div>
      <div style={{ marginTop: 20, fontFamily: BODY, fontWeight: 800, fontSize: 40, ...gradientText }}>
        Te explico no próximo vídeo
      </div>
      {/* card do próximo vídeo */}
      <div style={{
        marginTop: 40, display: 'flex', alignItems: 'center', gap: 24, justifyContent: 'center',
        transform: `translateX(${cardX}px)`, opacity,
      }}>
        <div style={{
          width: 360, height: 200, borderRadius: 22, background: BRAND.panel,
          border: `2px solid ${BRAND.violet}`, boxShadow: '0 14px 50px rgba(139,92,246,0.4)',
          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 12, padding: 20,
        }}>
          <FinMooviIcon size={54} idSuffix="next" />
          <div style={{ fontFamily: BODY, fontWeight: 800, fontSize: 30, color: BRAND.text }}>{nextTitle || 'Próximo vídeo'}</div>
          <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 22, color: BRAND.sub }}>PRÓXIMO ▶</div>
        </div>
        <svg width="90" height="90" viewBox="0 0 100 100" style={{ transform: `translateX(${arrow}px)` }}>
          <path d="M20 50 L74 50 M52 28 L78 50 L52 72" stroke={BRAND.cyan} strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      </div>
    </div>
  );
};

// Dispatcher — o role tem prioridade (cta/outro têm cena própria); senão usa visual.type.
// visual.type 'app' no role 'cta' usa a cena dedicada SceneApp (mockup 3D + calculadora);
// 'app' fora do cta (ou cta sem visual.type 'app') cai graciosamente no SceneCta.
export const SceneRenderer: React.FC<{ scene: Scene; nextTitle?: string; timing?: SceneTiming | null }> = ({ scene, nextTitle, timing }) => {
  const { fps } = useVideoConfig();
  const durationSec = timing?.durationSec ?? scene.durationSec;
  const sceneFrames = Math.max(1, Math.round(durationSec * fps));
  const inner = (() => {
    if (scene.role === 'cta' && scene.visual.type === 'app') return <SceneApp scene={scene} timing={timing} sceneFrames={sceneFrames} />;
    if (scene.role === 'cta') return <SceneCta scene={scene} />;
    if (scene.role === 'outro') return <SceneOutro scene={scene} nextTitle={nextTitle} />;
    switch (scene.visual.type) {
      case 'number': return <SceneNumber scene={scene} />;
      case 'chart': return <SceneChart scene={scene} timing={timing} sceneFrames={sceneFrames} />;
      case 'formula': return <SceneFormula scene={scene} />;
      case 'title': return <SceneTitle scene={scene} />;
      case 'app': return <SceneCta scene={scene} />;
      case 'list': return <SceneList scene={scene} timing={timing} sceneFrames={sceneFrames} />;
      case 'statement':
      default: return <SceneStatement scene={scene} />;
    }
  })();
  return <SceneShell scene={scene} timing={timing}>{inner}</SceneShell>;
};
