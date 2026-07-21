import { AbsoluteFill, Audio, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import { BRAND, DISPLAY, BODY, gradientText } from './theme';
import { FinMooviIcon } from './icon';
import { KaraokeCaption } from './captions';
import { IconBurst } from './icons-fx';
import { SceneSfx } from './audio/sfx';

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
// ABERTURA DISRUPTIVA (#1): o número-choque SLAM na tela com boom + flash + shake,
// e a pergunta de curiosidade surge embaixo. Para o dedo do usuário nos 1,5s iniciais.
// ─────────────────────────────────────────────────────────────────────────────
export const ShockIntro: React.FC<{ big: string; sub: string }> = ({ big, sub }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const slam = spring({ frame, fps, config: { damping: 9, mass: 0.7 } });
  const scale = interpolate(slam, [0, 1], [2.6, 1]);
  const flash = interpolate(frame, [0, 2, 12], [1, 0.7, 0], { extrapolateRight: 'clamp' });
  const shake = frame < 10 ? Math.sin(frame * 3) * (1 - frame / 10) * 10 : 0;
  const subIn = spring({ frame: frame - 14, fps, config: { damping: 14 } });
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
      <Audio src={staticFile('sfx/boom.ogg')} volume={0.9} />
      <div style={{
        ...gradientText, fontFamily: DISPLAY, fontWeight: 900, fontSize: 132, lineHeight: 1,
        transform: `scale(${scale}) translateX(${shake}px)`, textAlign: 'center', padding: '0 40px',
        filter: 'drop-shadow(0 0 50px rgba(139,92,246,0.6))',
      }}>{big}</div>
      <div style={{
        marginTop: 34, fontFamily: BODY, fontWeight: 800, fontSize: 56, color: BRAND.text, textAlign: 'center',
        opacity: interpolate(subIn, [0, 1], [0, 1]), transform: `translateY(${interpolate(subIn, [0, 1], [24, 0])}px)`,
      }}>{sub}</div>
      <AbsoluteFill style={{ background: '#fff', opacity: flash, pointerEvents: 'none' }} />
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Casca de cena: Ken Burns contínuo no miolo (o visual central nunca fica vazio).
// ─────────────────────────────────────────────────────────────────────────────
type Scene = {
  role: string;
  narration: string;
  onScreenText?: string;
  cue?: string;
  visual: { type: string; note?: string };
  durationSec: number;
};

type SceneTiming = { audioFile?: string; durationSec?: number; words?: { word: string; start: number; end: number }[] };

const normSync = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

// Frame (local da cena) em que o VISUAL central deve SURGIR — sincronizado com a
// FALA. Prioridade: "cue" do roteiro (palavra-gatilho) → 1ª palavra de ênfase
// (número/R$/%) → 0. Assim o gráfico dos "25 anos" só entra quando a voz diz "25".
function revealFrameFor(scene: Scene, timing: SceneTiming | null | undefined, fps: number): number {
  const words = timing?.words;
  if (!words || !words.length) return 0;
  if (scene.cue) {
    const c = normSync(scene.cue);
    const w = words.find((x) => normSync(x.word) === c || (c.length >= 2 && normSync(x.word).includes(c)));
    if (w) return Math.max(0, Math.round(w.start * fps));
  }
  const emph = words.find((x) => /\d/.test(x.word) || /[%×]/.test(x.word) || /r\$/i.test(x.word));
  if (emph) return Math.max(0, Math.round(emph.start * fps));
  return 0;
}

const SceneShell: React.FC<{ scene: Scene; timing?: SceneTiming | null; children: React.ReactNode }> = ({ scene, timing, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationSec = timing?.durationSec ?? scene.durationSec;
  const totalFrames = Math.max(1, Math.round(durationSec * fps));
  // Ken Burns: leve zoom-in contínuo — nada fica parado (roda a cena inteira).
  const kb = interpolate(frame, [0, totalFrames], [1.0, 1.08], { extrapolateRight: 'clamp' });
  // Entrada no INÍCIO da cena → o centro NUNCA fica vazio.
  const enter = spring({ frame, fps, config: { damping: 16, mass: 0.6 } });
  const enterScale = interpolate(enter, [0, 1], [0.9, 1]);
  const enterY = interpolate(enter, [0, 1], [40, 0]);
  // O cue não ESCONDE mais o visual; ele dá um SOCO sincronizado (pulse + flash)
  // no instante em que a palavra é falada. Assim: sincronia + nunca vazio.
  const reveal = revealFrameFor(scene, timing, fps);
  const punch = reveal > 2 ? interpolate(frame, [reveal - 1, reveal + 4, reveal + 16], [1, 1.13, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 1;
  const flash = reveal > 2 ? interpolate(frame, [reveal, reveal + 3, reveal + 14], [0, 0.5, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 0;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', paddingBottom: 380, paddingLeft: 60, paddingRight: 60 }}>
        <div style={{
          transform: `scale(${kb * enterScale * punch}) translateY(${enterY}px)`, textAlign: 'center',
          filter: flash > 0 ? `drop-shadow(0 0 ${Math.round(flash * 50)}px ${BRAND.cyan})` : undefined,
        }}>
          {children}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// Camada de ÁUDIO + LEGENDA + ícones + SFX de UMA cena. Vai num trilho MESTRE
// (Sequence sequencial, sem a sobreposição de 8f das transições) para a legenda e o
// áudio NÃO empilharem com a cena vizinha no cruzamento. O visual segue com crossfade.
export const SceneAudioLayer: React.FC<{ scene: Scene; timing?: SceneTiming | null }> = ({ scene, timing }) => {
  const { fps } = useVideoConfig();
  const durationSec = timing?.durationSec ?? scene.durationSec;
  const totalFrames = Math.max(1, Math.round(durationSec * fps));
  return (
    <AbsoluteFill>
      {timing?.audioFile && <Audio src={staticFile(timing.audioFile)} />}
      <SceneSfx narration={scene.narration} totalFrames={totalFrames} words={timing?.words} />
      <IconBurst narration={scene.narration} totalFrames={totalFrames} words={timing?.words} />
      <KaraokeCaption narration={scene.narration} totalFrames={totalFrames} words={timing?.words} />
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

// A curva exponencial só entra quando a FALA chega no cue (revealFrame, calculado
// pelo SceneRenderer com o mesmo revealFrameFor do SceneShell). Antes disso, só a
// régua (eixo + linha tracejada de referência) desenha devagar — o centro nunca
// fica vazio, mas o "resultado" (curva) só aparece com a voz. Depois de completa,
// mantém micro-vida (dot pulsando + glow respirando) pro resto da cena.
const SceneChart: React.FC<{ scene: Scene; revealFrame?: number; durationFrames?: number }> = ({ scene, revealFrame = 0, durationFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const W = 920, H = 560, pad = 44;
  const total = durationFrames ?? Math.max(1, Math.round(scene.durationSec * fps));

  // Início do desenho da curva: no cue, com clamp em 70% (cue tarde demais →
  // antecipa) para sempre sobrar espaço de desenho até o fim.
  const curveStart = Math.min(revealFrame, Math.round(total * 0.7));
  // Fim do desenho: ~90% da cena, com mínimo de 40 frames de janela.
  const curveEnd = Math.max(curveStart + 40, Math.round(total * 0.9));

  // Linha tracejada de referência: desenha devagar ANTES do cue (motion sutil
  // enquanto a curva ainda não entrou).
  const linProgress = curveStart > 4
    ? interpolate(frame, [0, curveStart], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : 1;
  // Curva exponencial: praticamente ausente antes do cue (stub de 2%), desenha
  // suave do cue até curveEnd com ease-out.
  const curveProgress = interpolate(frame, [curveStart, curveEnd], [0.02, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic),
  });

  const N = 40;
  const drawN = Math.max(0, Math.floor(curveProgress * N));
  const drawLinN = Math.max(0, Math.floor(linProgress * N));
  const exp: string[] = [], lin: string[] = [];
  for (let i = 0; i <= N; i++) {
    const x = pad + (i / N) * (W - pad * 2);
    const yExp = H - pad - Math.pow(i / N, 2.2) * (H - pad * 2);
    const yLin = H - pad - (i / N) * (H - pad * 2) * 0.55;
    if (i <= drawLinN) lin.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${yLin.toFixed(1)}`);
    if (i <= drawN) exp.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${yExp.toFixed(1)}`);
  }
  const hx = pad + (drawN / N) * (W - pad * 2);
  const hy = H - pad - Math.pow(drawN / N, 2.2) * (H - pad * 2);
  const pulse = 12 + Math.sin(frame / 5) * 4;
  // Depois de completa, a curva respira (glow sutil) pra nunca ler como "parada".
  const isComplete = frame >= curveEnd;
  const breathe = isComplete ? 0.5 + 0.5 * Math.sin((frame - curveEnd) / 14) : 0;
  const glowStd = 3 + breathe * 3;
  return (
    <div style={{ textAlign: 'center' }}>
      <svg width={W} height={H}>
        <defs>
          <linearGradient id="cg" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={BRAND.cyan} />
            <stop offset="50%" stopColor={BRAND.violet} />
            <stop offset="100%" stopColor={BRAND.magenta} />
          </linearGradient>
          {isComplete && (
            <filter id="chart-glow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation={glowStd} result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          )}
        </defs>
        <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke={BRAND.sub} strokeWidth={2} opacity={0.35} />
        <path d={lin.join(' ')} fill="none" stroke={BRAND.sub} strokeWidth={5} opacity={0.55} strokeDasharray="10 12" />
        <path d={exp.join(' ')} fill="none" stroke="url(#cg)" strokeWidth={10} strokeLinecap="round" filter={isComplete ? 'url(#chart-glow)' : undefined} />
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
export const SceneRenderer: React.FC<{ scene: Scene; nextTitle?: string; timing?: SceneTiming | null }> = ({ scene, nextTitle, timing }) => {
  const { fps } = useVideoConfig();
  // Mesmo cue (revealFrameFor) que o SceneShell usa pro punch — repassado ao
  // SceneChart pra sincronizar o DESENHO da curva com a fala, não só o soco.
  const revealFrame = revealFrameFor(scene, timing, fps);
  const durationFrames = Math.max(1, Math.round((timing?.durationSec ?? scene.durationSec) * fps));
  const inner = (() => {
    if (scene.role === 'cta') return <SceneCta scene={scene} />;
    if (scene.role === 'outro') return <SceneOutro scene={scene} nextTitle={nextTitle} />;
    switch (scene.visual.type) {
      case 'number': return <SceneNumber scene={scene} />;
      case 'chart': return <SceneChart scene={scene} revealFrame={revealFrame} durationFrames={durationFrames} />;
      case 'formula': return <SceneFormula scene={scene} />;
      case 'title': return <SceneTitle scene={scene} />;
      case 'list':
      case 'statement':
      default: return <SceneStatement scene={scene} />;
    }
  })();
  return <SceneShell scene={scene} timing={timing}>{inner}</SceneShell>;
};
