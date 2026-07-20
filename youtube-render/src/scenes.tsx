import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { BRAND, gradientText } from './theme';

// ─────────────────────────────────────────────────────────────────────────────
// Peças compartilhadas
// ─────────────────────────────────────────────────────────────────────────────

// Fundo persistente: gradiente escuro + duas manchas de luz desfocadas (bokeh).
export const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 40) * 30;
  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: 200 + drift, left: -150, width: 700, height: 700,
        borderRadius: '50%', background: BRAND.cyan, opacity: 0.16, filter: 'blur(160px)',
      }} />
      <div style={{
        position: 'absolute', bottom: 150 - drift, right: -180, width: 760, height: 760,
        borderRadius: '50%', background: BRAND.magenta, opacity: 0.14, filter: 'blur(170px)',
      }} />
    </AbsoluteFill>
  );
};

// Marca d'água discreta (PRD: exibir no vídeo todo)
export const Watermark: React.FC = () => (
  <div style={{
    position: 'absolute', top: 70, width: '100%', textAlign: 'center',
    fontFamily: BRAND.font, fontWeight: 800, fontSize: 40, letterSpacing: 1,
  }}>
    <span style={{ color: BRAND.text }}>Fin</span>
    <span style={gradientText}>Moovi</span>
  </div>
);

// Legenda queimada (narração) na faixa inferior — entra por baixo com fade.
const Caption: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const y = interpolate(frame, [0, 12], [40, 0], { extrapolateRight: 'clamp' });
  const opacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <div style={{
      position: 'absolute', bottom: 220, left: 70, right: 70, transform: `translateY(${y}px)`,
      opacity, textAlign: 'center', fontFamily: BRAND.font, fontWeight: 700, fontSize: 46,
      lineHeight: 1.25, color: BRAND.text, textShadow: '0 4px 24px rgba(0,0,0,0.6)',
    }}>
      {text}
    </div>
  );
};

// Casca de cena: centraliza o "miolo" (visual) na metade de cima e põe a legenda embaixo.
const SceneShell: React.FC<{ narration: string; children: React.ReactNode }> = ({ narration, children }) => (
  <AbsoluteFill style={{ fontFamily: BRAND.font }}>
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', paddingBottom: 360, paddingLeft: 60, paddingRight: 60 }}>
      {children}
    </AbsoluteFill>
    <Caption text={narration} />
  </AbsoluteFill>
);

// ─────────────────────────────────────────────────────────────────────────────
// Cenas por tipo de visual
// ─────────────────────────────────────────────────────────────────────────────

type Scene = {
  role: string;
  narration: string;
  onScreenText?: string;
  visual: { type: string; note?: string };
};

const SceneNumber: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 14, mass: 0.6 } });
  const scale = interpolate(s, [0, 1], [0.6, 1]);
  const glow = 20 + Math.sin(frame / 8) * 10;
  return (
    <div style={{ transform: `scale(${scale})`, textAlign: 'center', maxWidth: 960 }}>
      <div style={{ ...gradientText, fontSize: 112, fontWeight: 900, lineHeight: 1.08, filter: `drop-shadow(0 0 ${glow}px rgba(139,92,246,0.5))` }}>
        {scene.onScreenText}
      </div>
    </div>
  );
};

const SceneChart: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const W = 900, H = 560, pad = 40;
  const p = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 45 });
  // Curva exponencial (composto) vs reta (simples)
  const expPath: string[] = [];
  const linPath: string[] = [];
  const N = 40;
  const drawN = Math.floor(p * N);
  for (let i = 0; i <= drawN; i++) {
    const x = pad + (i / N) * (W - pad * 2);
    const yExp = H - pad - Math.pow(i / N, 2.2) * (H - pad * 2);
    const yLin = H - pad - (i / N) * (H - pad * 2) * 0.55;
    expPath.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${yExp.toFixed(1)}`);
    linPath.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${yLin.toFixed(1)}`);
  }
  const headX = pad + (drawN / N) * (W - pad * 2);
  const headY = H - pad - Math.pow(drawN / N, 2.2) * (H - pad * 2);
  return (
    <div style={{ textAlign: 'center' }}>
      <svg width={W} height={H}>
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={BRAND.cyan} />
            <stop offset="50%" stopColor={BRAND.violet} />
            <stop offset="100%" stopColor={BRAND.magenta} />
          </linearGradient>
        </defs>
        <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke={BRAND.sub} strokeWidth={2} opacity={0.4} />
        <path d={linPath.join(' ')} fill="none" stroke={BRAND.sub} strokeWidth={5} opacity={0.6} strokeDasharray="10 10" />
        <path d={expPath.join(' ')} fill="none" stroke="url(#g)" strokeWidth={9} strokeLinecap="round" />
        {drawN > 0 && <circle cx={headX} cy={headY} r={14} fill={BRAND.magenta} />}
      </svg>
      {scene.onScreenText && (
        <div style={{ ...gradientText, fontSize: 64, fontWeight: 900, marginTop: 10 }}>{scene.onScreenText}</div>
      )}
    </div>
  );
};

const SceneFormula: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tokens = (scene.onScreenText || '').split(' ');
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 24, maxWidth: 900 }}>
      {tokens.map((tk, i) => {
        const s = spring({ frame, fps, delay: i * 6, config: { damping: 12 } });
        const scale = interpolate(s, [0, 1], [0.2, 1]);
        const isOp = /^[÷×+=-]$/.test(tk);
        return (
          <span key={i} style={{
            transform: `scale(${scale})`, fontSize: 96, fontWeight: 900,
            ...(isOp ? { color: BRAND.sub } : gradientText),
          }}>{tk}</span>
        );
      })}
    </div>
  );
};

const SceneStatement: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 16 } });
  const y = interpolate(s, [0, 1], [30, 0]);
  const opacity = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: 'clamp' });
  const w = interpolate(s, [0, 1], [0, 260]);
  return (
    <div style={{ transform: `translateY(${y}px)`, opacity, textAlign: 'center' }}>
      <div style={{ color: BRAND.text, fontSize: 92, fontWeight: 900, lineHeight: 1.1 }}>{scene.onScreenText}</div>
      <div style={{ height: 10, width: w, margin: '30px auto 0', borderRadius: 6, background: BRAND.gradient }} />
    </div>
  );
};

const SceneTitle: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 18 } });
  const scale = interpolate(s, [0, 1], [0.7, 1]);
  return (
    <div style={{ transform: `scale(${scale})`, ...gradientText, fontSize: 120, fontWeight: 900, textAlign: 'center', lineHeight: 1.05 }}>
      {scene.onScreenText}
    </div>
  );
};

// Dispatcher: escolhe a cena pelo visual.type (motion graphics apenas).
export const SceneRenderer: React.FC<{ scene: Scene }> = ({ scene }) => {
  const inner = (() => {
    switch (scene.visual.type) {
      case 'number': return <SceneNumber scene={scene} />;
      case 'chart': return <SceneChart scene={scene} />;
      case 'formula': return <SceneFormula scene={scene} />;
      case 'title': return <SceneTitle scene={scene} />;
      case 'list':
      case 'statement':
      default: return <SceneStatement scene={scene} />;
    }
  })();
  return <SceneShell narration={scene.narration}>{inner}</SceneShell>;
};
