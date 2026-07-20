import { AbsoluteFill, interpolate, random, spring, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import { BRAND, DISPLAY, BODY, gradientText } from './theme';
import { FinMooviIcon } from './icon';
import { KaraokeCaption } from './captions';
import { IconBurst } from './icons-fx';

// ─────────────────────────────────────────────────────────────────────────────
// Fundo vivo: gradiente escuro + manchas de luz que respiram + partículas subindo
// + grade sutil em movimento. Dá "muito motion" mesmo sem b-roll.
// ─────────────────────────────────────────────────────────────────────────────
const Particles: React.FC = () => {
  const frame = useCurrentFrame();
  const dots = new Array(28).fill(0);
  return (
    <AbsoluteFill>
      {dots.map((_, i) => {
        const x = random(`x${i}`) * 1080;
        const speed = 0.4 + random(`s${i}`) * 1.1;
        const size = 3 + random(`z${i}`) * 6;
        const y = (1920 - ((frame * speed * 6) + random(`o${i}`) * 1920)) % 1920;
        const twinkle = 0.15 + 0.35 * (0.5 + 0.5 * Math.sin(frame / 12 + i));
        const color = i % 2 === 0 ? BRAND.cyan : BRAND.magenta;
        return (
          <div key={i} style={{
            position: 'absolute', left: x, top: y, width: size, height: size,
            borderRadius: '50%', background: color, opacity: twinkle, filter: 'blur(1px)',
          }} />
        );
      })}
    </AbsoluteFill>
  );
};

export const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 40) * 40;
  const pulse = 0.13 + 0.05 * Math.sin(frame / 30);
  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: 180 + drift, left: -160, width: 720, height: 720,
        borderRadius: '50%', background: BRAND.cyan, opacity: pulse + 0.04, filter: 'blur(170px)',
      }} />
      <div style={{
        position: 'absolute', bottom: 120 - drift, right: -200, width: 800, height: 800,
        borderRadius: '50%', background: BRAND.magenta, opacity: pulse, filter: 'blur(180px)',
      }} />
      <div style={{
        position: 'absolute', top: '38%', left: '30%', width: 500, height: 500,
        borderRadius: '50%', background: BRAND.violet, opacity: 0.10, filter: 'blur(160px)',
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
// Casca de cena: Ken Burns contínuo no miolo + legenda karaokê embaixo.
// ─────────────────────────────────────────────────────────────────────────────
type Scene = {
  role: string;
  narration: string;
  onScreenText?: string;
  visual: { type: string; note?: string };
  durationSec: number;
};

const SceneShell: React.FC<{ scene: Scene; children: React.ReactNode }> = ({ scene, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const totalFrames = Math.max(1, Math.round(scene.durationSec * fps));
  // Ken Burns: leve zoom-in contínuo + deriva — nada fica parado.
  const kb = interpolate(frame, [0, totalFrames], [1.0, 1.08], { extrapolateRight: 'clamp' });
  const enter = spring({ frame, fps, config: { damping: 16, mass: 0.6 } });
  const enterScale = interpolate(enter, [0, 1], [0.9, 1]);
  const enterY = interpolate(enter, [0, 1], [40, 0]);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', paddingBottom: 380, paddingLeft: 60, paddingRight: 60 }}>
        <div style={{ transform: `scale(${kb * enterScale}) translateY(${enterY}px)`, textAlign: 'center' }}>
          {children}
        </div>
      </AbsoluteFill>
      <IconBurst narration={scene.narration} totalFrames={totalFrames} />
      <KaraokeCaption narration={scene.narration} totalFrames={totalFrames} />
    </AbsoluteFill>
  );
};

// Conta um número (0 → alvo) — usado nas cenas para dar dinamismo.
const useCountUp = (target: number, durationFrames = 40) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [0, durationFrames], [0, 1], { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  return Math.round(target * p);
};

// ─────────────────────────────────────────────────────────────────────────────
// Cenas por tipo de visual (motion graphics)
// ─────────────────────────────────────────────────────────────────────────────

const SceneNumber: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const glow = 24 + Math.sin(frame / 7) * 12;
  const float = Math.sin(frame / 20) * 8;
  return (
    <div style={{ transform: `translateY(${float}px)`, maxWidth: 980 }}>
      <div style={{ ...gradientText, fontFamily: DISPLAY, fontSize: 108, fontWeight: 900, lineHeight: 1.12, filter: `drop-shadow(0 0 ${glow}px rgba(139,92,246,0.55))` }}>
        {scene.onScreenText}
      </div>
    </div>
  );
};

const SceneChart: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const W = 920, H = 560, pad = 44;
  const p = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 50 });
  const N = 40;
  const drawN = Math.floor(p * N);
  const exp: string[] = [], lin: string[] = [];
  for (let i = 0; i <= drawN; i++) {
    const x = pad + (i / N) * (W - pad * 2);
    const yExp = H - pad - Math.pow(i / N, 2.2) * (H - pad * 2);
    const yLin = H - pad - (i / N) * (H - pad * 2) * 0.55;
    exp.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${yExp.toFixed(1)}`);
    lin.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${yLin.toFixed(1)}`);
  }
  const hx = pad + (drawN / N) * (W - pad * 2);
  const hy = H - pad - Math.pow(drawN / N, 2.2) * (H - pad * 2);
  const pulse = 12 + Math.sin(frame / 5) * 4;
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
        <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke={BRAND.sub} strokeWidth={2} opacity={0.35} />
        <path d={lin.join(' ')} fill="none" stroke={BRAND.sub} strokeWidth={5} opacity={0.55} strokeDasharray="10 12" />
        <path d={exp.join(' ')} fill="none" stroke="url(#cg)" strokeWidth={10} strokeLinecap="round" />
        {drawN > 0 && <circle cx={hx} cy={hy} r={pulse} fill={BRAND.magenta} opacity={0.35} />}
        {drawN > 0 && <circle cx={hx} cy={hy} r={13} fill={BRAND.magenta} />}
      </svg>
      {scene.onScreenText && (
        <div style={{ ...gradientText, fontFamily: DISPLAY, fontSize: 60, fontWeight: 900, marginTop: 6 }}>{scene.onScreenText}</div>
      )}
    </div>
  );
};

const SceneFormula: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tokens = (scene.onScreenText || '').split(' ');
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 22, maxWidth: 940 }}>
      {tokens.map((tk, i) => {
        const s = spring({ frame, fps, delay: i * 5, config: { damping: 11, mass: 0.5 } });
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
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 15 } });
  const w = interpolate(s, [0, 1], [0, 280]);
  const float = Math.sin(frame / 18) * 6;
  return (
    <div style={{ transform: `translateY(${float}px)`, textAlign: 'center', maxWidth: 940 }}>
      <div style={{ color: BRAND.text, fontFamily: DISPLAY, fontSize: 82, fontWeight: 900, lineHeight: 1.12 }}>{scene.onScreenText}</div>
      <div style={{ height: 12, width: w, margin: '30px auto 0', borderRadius: 8, background: BRAND.gradient }} />
    </div>
  );
};

const SceneTitle: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 18 } });
  const scale = interpolate(s, [0, 1], [0.7, 1]);
  return (
    <div style={{ transform: `scale(${scale})`, ...gradientText, fontFamily: DISPLAY, fontSize: 104, fontWeight: 900, lineHeight: 1.08, maxWidth: 960 }}>
      {scene.onScreenText}
    </div>
  );
};

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
      <div style={{
        marginTop: 34, display: 'inline-flex', alignItems: 'center', gap: 16,
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
export const SceneRenderer: React.FC<{ scene: Scene; nextTitle?: string }> = ({ scene, nextTitle }) => {
  const inner = (() => {
    if (scene.role === 'cta') return <SceneCta scene={scene} />;
    if (scene.role === 'outro') return <SceneOutro scene={scene} nextTitle={nextTitle} />;
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
  return <SceneShell scene={scene}>{inner}</SceneShell>;
};
