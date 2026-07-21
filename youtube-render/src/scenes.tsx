import { AbsoluteFill, Audio, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig, Easing, Sequence } from 'remotion';
import { BRAND, DISPLAY, BODY, gradientText } from './theme';
import { FinMooviIcon } from './icon';
import { KaraokeCaption } from './captions';
import { IconBurst, SHOT_ICONS, ShotIconKey } from './icons-fx';
import { SceneSfx, resolveShotSfx } from './audio/sfx';
import type { Shot } from './Short';

// Formatação pt-BR de números (contadores): 3200000 → "3.200.000".
const nfBR = new Intl.NumberFormat('pt-BR');

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
// ABERTURA DINÂMICA v3 — frase com tipografia GIGANTE nas palavras de ênfase
// (marcadas com *asterisco*), ícones de curiosidade (interrogação + mind-blown)
// flutuando, e então um CONTADOR que sobe de `from` até `to` com a FONTE CRESCENDO
// junto do valor (aceleração eased), terminando num soco/flash. ~4s, algo mudando
// a cada ~1,5s, com boom + whoosh.
// ─────────────────────────────────────────────────────────────────────────────
type FraseToken = { text: string; emph: boolean };
function parseFrase(frase: string): FraseToken[] {
  const out: FraseToken[] = [];
  const re = /\*([^*]+)\*|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(frase))) {
    if (m[1] != null) {
      // grupo de ênfase: quebra em PALAVRAS (cada uma gigante) p/ poder quebrar
      // linha e nunca estourar a largura da tela num único span.
      for (const w of m[1].trim().split(/\s+/).filter(Boolean)) out.push({ text: w, emph: true });
    } else {
      out.push({ text: m[2], emph: false });
    }
  }
  return out;
}

export const DynamicIntro: React.FC<{
  frase: string;
  counter?: { from: number; to: number; prefix?: string };
  frames: number;
}> = ({ frase, counter, frames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tokens = parseFrase(frase);

  // Fase A: frase + ícones de curiosidade. Fase B (se houver contador): contador crescente.
  const counterStart = counter ? Math.round(frames * 0.46) : frames + 1; // ~2,2s
  const hasCounter = !!counter && frame >= counterStart - 8;

  // slam inicial (boom) + flash de entrada e flash final (soco do contador).
  const slamFlash = interpolate(frame, [0, 2, 12], [0.9, 0.5, 0], { extrapolateRight: 'clamp' });
  const endFlash = counter ? interpolate(frame, [frames - 8, frames - 4, frames], [0, 0.6, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 0;

  // A frase sobe e diminui um pouco quando o contador entra (dá lugar ao número).
  const shift = counter
    ? interpolate(frame, [counterStart - 8, counterStart + 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : 0;
  const fraseScale = interpolate(shift, [0, 1], [1, 0.72]);
  const fraseY = interpolate(shift, [0, 1], [0, -260]);

  // Contador: valor sobe de from→to com aceleração; a FONTE cresce junto do valor.
  let counterEl: React.ReactNode = null;
  if (counter) {
    const cl = frame - counterStart;
    const p = interpolate(cl, [0, frames - counterStart - 6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic) });
    const val = Math.round(counter.from + (counter.to - counter.from) * p);
    const size = interpolate(p, [0, 1], [96, 210]);
    const punch = interpolate(frame, [frames - 10, frames - 4, frames], [1, 1.12, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const glow = 30 + Math.sin(frame / 5) * 14;
    const appear = spring({ frame: cl, fps, config: { damping: 13, mass: 0.5 } });
    counterEl = (
      <div style={{
        opacity: interpolate(appear, [0, 1], [0, 1]),
        transform: `scale(${interpolate(appear, [0, 1], [0.6, 1]) * punch})`,
        ...gradientText, fontFamily: DISPLAY, fontWeight: 900, fontSize: size, lineHeight: 1.02,
        filter: `drop-shadow(0 0 ${glow}px rgba(139,92,246,0.55))`, textAlign: 'center',
      }}>
        {counter.prefix || ''}{nfBR.format(val)}
      </div>
    );
  }

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 40 }}>
      <Audio src={staticFile('sfx/boom.ogg')} volume={0.9} />
      {counter && (
        <Sequence from={counterStart - 6} durationInFrames={Math.round(fps * 1.5)}>
          <Audio src={staticFile(resolveShotSfx('whoosh'))} volume={0.55} />
        </Sequence>
      )}

      {/* ícones de curiosidade flutuando (somem quando o contador entra) */}
      <CuriosityIcon which="question" x={110} y={430} delay={8} fadeAt={counterStart - 4} />
      <CuriosityIcon which="mind" x={760} y={330} delay={16} fadeAt={counterStart - 4} />

      {/* frase com ênfase */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'baseline',
        gap: '10px 22px', width: 940, maxWidth: '92%', textAlign: 'center',
        transform: `translateY(${fraseY}px) scale(${fraseScale})`,
      }}>
        {tokens.map((tk, i) => {
          const s = spring({ frame: frame - i * 2, fps, config: { damping: 14, mass: 0.5 } });
          const sc = tk.emph ? interpolate(s, [0, 1], [1.35, 1]) : interpolate(s, [0, 1], [0.75, 1]);
          const y = interpolate(s, [0, 1], [26, 0]);
          return (
            <span key={i} style={{
              display: 'inline-block', transform: `scale(${sc}) translateY(${y}px)`,
              fontFamily: DISPLAY, fontWeight: 900, lineHeight: 1.05,
              fontSize: tk.emph ? 90 : 50,
              ...(tk.emph ? gradientText : { color: BRAND.text }),
              filter: tk.emph ? 'drop-shadow(0 0 34px rgba(139,92,246,0.5))' : undefined,
            }}>{tk.text}</span>
          );
        })}
      </div>

      {hasCounter && counterEl}

      <AbsoluteFill style={{ background: '#fff', opacity: Math.max(slamFlash, endFlash), pointerEvents: 'none' }} />
    </AbsoluteFill>
  );
};

// Ícone de curiosidade que POPa e flutua num canto da intro.
const CuriosityIcon: React.FC<{ which: ShotIconKey; x: number; y: number; delay: number; fadeAt?: number }> = ({ which, x, y, delay, fadeAt }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: frame - delay, fps, config: { damping: 11, mass: 0.4 } });
  const scale = interpolate(pop, [0, 1], [0, 1.15]);
  const float = Math.sin((frame - delay) / 7) * 12;
  const rot = Math.sin((frame - delay) / 11) * 8;
  const inOpacity = interpolate(pop, [0, 0.4], [0, 1], { extrapolateRight: 'clamp' });
  const outOpacity = fadeAt != null ? interpolate(frame, [fadeAt, fadeAt + 10], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 1;
  const Comp = SHOT_ICONS[which];
  return (
    <div style={{
      position: 'absolute', left: x, top: y,
      transform: `translateY(${float}px) scale(${scale}) rotate(${rot}deg)`,
      opacity: Math.min(inOpacity, outOpacity),
      filter: 'drop-shadow(0 8px 30px rgba(34,211,238,0.45))',
    }}>
      <Comp />
    </div>
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
  visual?: { type: string; note?: string };
  shots?: Shot[];
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
      {scene.shots && scene.shots.length ? <ShotSfxTrack scene={scene} timing={timing} totalFrames={totalFrames} /> : null}
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

// ═════════════════════════════════════════════════════════════════════════════
// MOTOR DE SHOTS (contract v3) — quando a cena traz `shots`, o miolo troca a cada
// palavra-âncora: cada shot COMEÇA no frame REAL da sua âncora (timing.json), com
// corte snappy (spring pop + leve slide). O 1º shot abre em 0 (miolo nunca vazio);
// os seguintes entram na sua âncora (sincronia semântica: "500" aparece quando a
// voz diz "500"). Sem timing.json → distribui as âncoras pela posição da palavra
// na narração. Preserva a cena de visual único (backward compat) intacta.
// ═════════════════════════════════════════════════════════════════════════════
const SHOT_MIN_GAP = 5; // frames mínimos entre shots (corte perceptível)

function findAnchorIndex(normWords: string[], anchor: string, from: number): number {
  const a = normSync(anchor || '');
  if (!a) return -1;
  for (let j = Math.max(0, from); j < normWords.length; j++) {
    const wn = normWords[j];
    if (wn === a || (a.length >= 2 && wn.includes(a)) || (wn.length >= 2 && a.includes(wn))) return j;
  }
  return -1;
}

// Frame inicial (local da cena) de cada shot.
function shotStartFrames(scene: Scene, timing: SceneTiming | null | undefined, fps: number, totalFrames: number): number[] {
  const shots = scene.shots || [];
  const n = shots.length;
  if (!n) return [];
  const words = timing?.words;
  const raw: number[] = new Array(n).fill(-1);

  if (words && words.length) {
    const normWords = words.map((w) => normSync(w.word));
    let searchFrom = 0;
    for (let i = 0; i < n; i++) {
      const idx = findAnchorIndex(normWords, shots[i].anchor, searchFrom);
      if (idx >= 0) { raw[i] = Math.round(words[idx].start * fps); searchFrom = idx + 1; }
    }
  } else {
    // Fallback sem timing: proporcional à posição da palavra na narração.
    const nw = (scene.narration || '').trim().split(/\s+/).filter(Boolean).map(normSync);
    let searchFrom = 0;
    for (let i = 0; i < n; i++) {
      const idx = findAnchorIndex(nw, shots[i].anchor, searchFrom);
      if (idx >= 0) { raw[i] = Math.round((idx / Math.max(1, nw.length)) * totalFrames); searchFrom = idx + 1; }
    }
  }

  // Âncoras não encontradas → palpite proporcional pelo índice do shot.
  for (let i = 0; i < n; i++) if (raw[i] < 0) raw[i] = Math.round((i / n) * totalFrames);

  // 1º shot abre a cena (miolo nunca vazio); depois: estritamente crescente c/ gap.
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    let v = i === 0 ? 0 : Math.max(raw[i], out[i - 1] + SHOT_MIN_GAP);
    v = Math.min(v, Math.max(0, totalFrames - 1));
    if (i > 0) v = Math.max(v, out[i - 1] + SHOT_MIN_GAP);
    out.push(v);
  }
  return out;
}

// Cena-pseudo para reaproveitar SceneStatement/SceneFormula/SceneChart dentro do shot.
const pseudoScene = (base: Scene, text?: string): Scene => ({
  role: base.role, narration: base.narration, visual: base.visual,
  durationSec: base.durationSec, onScreenText: text,
});

// ── Visuais de shot (vida = duração do shot) ─────────────────────────────────
const ShotNumber: React.FC<{ text?: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const glow = 24 + Math.sin(frame / 7) * 12;
  return (
    <div style={{ ...gradientText, fontFamily: DISPLAY, fontSize: 148, fontWeight: 900, lineHeight: 1.05, filter: `drop-shadow(0 0 ${glow}px rgba(139,92,246,0.55))` }}>
      {text}
    </div>
  );
};

const ShotCounter: React.FC<{ from?: number; to?: number; prefix?: string; life: number }> = ({ from = 0, to = 0, prefix = '', life }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [0, Math.max(1, life - 4)], [0, 1], { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  const val = Math.round(from + (to - from) * p);
  const size = interpolate(p, [0, 1], [112, 168]);
  const glow = 24 + Math.sin(frame / 6) * 12;
  return (
    <div style={{ ...gradientText, fontFamily: DISPLAY, fontWeight: 900, fontSize: size, lineHeight: 1.05, filter: `drop-shadow(0 0 ${glow}px rgba(139,92,246,0.5))` }}>
      {prefix}{nfBR.format(val)}
    </div>
  );
};

const ShotIcon: React.FC<{ icon?: ShotIconKey }> = ({ icon }) => {
  const frame = useCurrentFrame();
  const float = Math.sin(frame / 8) * 12;
  const Comp = SHOT_ICONS[icon || 'money'] || SHOT_ICONS.money;
  return (
    <div style={{ transform: `translateY(${float}px) scale(2.2)`, filter: 'drop-shadow(0 12px 44px rgba(139,92,246,0.5))' }}>
      <Comp />
    </div>
  );
};

// ── Metáforas animadas (SVG nativo, literais) ────────────────────────────────
// bola-neve: bola desce a ladeira crescendo e derruba blocos no fim.
const MetaSnowball: React.FC<{ life: number }> = ({ life }) => {
  const frame = useCurrentFrame();
  const W = 900, H = 520;
  const p = interpolate(frame, [0, life], [0, 1], { extrapolateRight: 'clamp', easing: Easing.in(Easing.quad) });
  const x0 = 110, x1 = 720, y0 = 130, y1 = 380;
  const cx = x0 + (x1 - x0) * p, cy = y0 + (y1 - y0) * p;
  const r = 20 + p * 74;
  const blocks = [{ bx: 748, by: 392 }, { bx: 792, by: 392 }, { bx: 770, by: 356 }];
  return (
    <svg width={W} height={H}>
      <line x1={60} y1={110} x2={820} y2={400} stroke={BRAND.sub} strokeWidth={10} opacity={0.5} strokeLinecap="round" />
      {blocks.map((b, i) => {
        const kp = interpolate(frame, [life * 0.78, life], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        const tx = kp * (46 + i * 22), ty = -kp * (110 + i * 20), rr = kp * (200 + i * 90);
        return <rect key={i} x={b.bx} y={b.by} width={30} height={30} rx={6} fill={i % 2 ? BRAND.violet : BRAND.magenta} transform={`translate(${tx} ${ty}) rotate(${rr} ${b.bx + 15} ${b.by + 15})`} />;
      })}
      <circle cx={cx} cy={cy} r={r} fill="#eaf6ff" stroke={BRAND.cyan} strokeWidth={4} />
      <circle cx={cx - r * 0.3} cy={cy - r * 0.32} r={r * 0.26} fill="#ffffff" opacity={0.85} />
      <circle cx={cx + r * 0.25} cy={cy + r * 0.2} r={r * 0.14} fill={BRAND.cyan} opacity={0.5} />
    </svg>
  );
};

// avalanche: rajada de partículas de neve caindo do topo + tremor de tela.
const MetaAvalanche: React.FC<{ life: number }> = ({ life }) => {
  const frame = useCurrentFrame();
  const W = 900, H = 560;
  const shake = Math.sin(frame * 2.3) * interpolate(frame, [0, life], [18, 3], { extrapolateRight: 'clamp' });
  const flakes = new Array(64).fill(0);
  return (
    <div style={{ transform: `translateX(${shake}px)` }}>
      <svg width={W} height={H}>
        {flakes.map((_, i) => {
          const x = random('ax' + i) * W;
          const speed = 0.6 + random('as' + i) * 1.7;
          const size = 4 + random('az' + i) * 11;
          const y = (((frame * speed * 15) + random('ao' + i) * H) % (H + 80)) - 40;
          const op = 0.45 + 0.5 * random('aq' + i);
          return <circle key={i} cx={x} cy={y} r={size} fill={i % 3 ? '#eaf6ff' : BRAND.cyan} opacity={op} />;
        })}
      </svg>
    </div>
  );
};

// escorregão: figura escorrega (casca de banana), pernas pro alto, cai e quica.
const MetaSlip: React.FC<{ life: number }> = ({ life }) => {
  const frame = useCurrentFrame();
  const tilt = interpolate(frame, [0, life * 0.25, life * 0.5], [0, -14, -98], { extrapolateRight: 'clamp' });
  const fallY = interpolate(frame, [life * 0.35, life * 0.62], [0, 150], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const bounce = frame > life * 0.62 ? Math.abs(Math.sin((frame - life * 0.62) / 5)) * Math.max(0, 34 - (frame - life * 0.62)) : 0;
  return (
    <svg width={700} height={560}>
      <defs>
        <linearGradient id="slip-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={BRAND.cyan} />
          <stop offset="100%" stopColor={BRAND.magenta} />
        </linearGradient>
      </defs>
      <line x1={80} y1={452} x2={620} y2={452} stroke={BRAND.sub} strokeWidth={8} opacity={0.4} strokeLinecap="round" />
      <path d="M300 442 q34 -22 66 -4 q-12 18 -38 15 q-20 -3 -28 -11 Z" fill={BRAND.yellow} stroke="#b59b00" strokeWidth={3} />
      <g transform={`translate(0 ${fallY - bounce}) rotate(${tilt} 360 448)`}>
        <circle cx={360} cy={252} r={34} fill="none" stroke="url(#slip-g)" strokeWidth={8} />
        <line x1={360} y1={286} x2={360} y2={382} stroke="url(#slip-g)" strokeWidth={11} strokeLinecap="round" />
        <line x1={360} y1={312} x2={306} y2={278} stroke="url(#slip-g)" strokeWidth={9} strokeLinecap="round" />
        <line x1={360} y1={312} x2={420} y2={286} stroke="url(#slip-g)" strokeWidth={9} strokeLinecap="round" />
        <line x1={360} y1={382} x2={316} y2={430} stroke="url(#slip-g)" strokeWidth={10} strokeLinecap="round" />
        <line x1={360} y1={382} x2={404} y2={430} stroke="url(#slip-g)" strokeWidth={10} strokeLinecap="round" />
      </g>
    </svg>
  );
};

const ShotMetaphor: React.FC<{ metaphor?: string; life: number }> = ({ metaphor, life }) => {
  if (metaphor === 'avalanche') return <MetaAvalanche life={life} />;
  if (metaphor === 'escorregao') return <MetaSlip life={life} />;
  return <MetaSnowball life={life} />; // 'bola-neve' (default)
};

// Texto DIGITADO (máquina de escrever): aparece caractere a caractere ao longo de
// ~0,5–0,8s do início do shot, com um caret piscando durante a digitação (some ao
// terminar). Usado em shots statement/list/formula cujo sfx é 'typewriter'/'keyboard'
// — o som e a digitação entram JUNTOS (o pop das transições dá lugar a este efeito).
const ShotTypewriter: React.FC<{ text: string; life: number; gradient?: boolean }> = ({ text, life, gradient }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const chars = Array.from(text);
  // Janela de digitação: ~0,65s, limitada pela vida do shot (deixa folga pra ler).
  const typeFrames = Math.max(1, Math.min(Math.round(fps * 0.65), life - 4));
  const shown = Math.round(
    interpolate(frame, [0, typeFrames], [0, chars.length], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
  );
  const typing = frame < typeFrames && shown < chars.length;
  const blinkOn = Math.floor(frame / 7) % 2 === 0; // pisca ~4×/s
  const visible = chars.slice(0, shown).join('');
  return (
    <div style={{ textAlign: 'center', maxWidth: 940, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
      <span style={{
        fontFamily: DISPLAY, fontSize: 82, fontWeight: 900, lineHeight: 1.12,
        whiteSpace: 'pre-wrap', ...(gradient ? gradientText : { color: BRAND.text }),
      }}>{visible}</span>
      {typing && (
        <span style={{
          display: 'inline-block', width: 8, height: 74, marginLeft: 6,
          background: BRAND.cyan, borderRadius: 3, opacity: blinkOn ? 1 : 0.12,
          alignSelf: 'center',
        }} />
      )}
    </div>
  );
};

// Um shot: entra com pop+slide e mostra seu visual pela sua vida.
const ShotView: React.FC<{ shot: Shot; life: number; base: Scene; revealFrame: number; durationFrames: number }> = ({ shot, life, base, revealFrame, durationFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 12, mass: 0.5 } });
  const scale = interpolate(pop, [0, 1], [0.7, 1]);
  const tx = interpolate(pop, [0, 1], [40, 0]);
  const kb = interpolate(frame, [0, life], [1, 1.05], { extrapolateRight: 'clamp' });
  const v = shot.visual;
  // Entrada DIGITADA quando o shot de texto tem sfx de teclado/máquina de escrever.
  const typed = shot.sfx === 'typewriter' || shot.sfx === 'keyboard';
  const isTextShot = v.type === 'statement' || v.type === 'list' || v.type === 'formula';
  const inner = (() => {
    if (typed && isTextShot) {
      return <ShotTypewriter text={v.text ?? base.onScreenText ?? ''} life={life} gradient={v.type === 'formula'} />;
    }
    switch (v.type) {
      case 'number': return <ShotNumber text={v.text ?? base.onScreenText} />;
      case 'counter': return <ShotCounter from={v.from} to={v.to} prefix={v.prefix} life={life} />;
      case 'chart': return <SceneChart scene={pseudoScene(base, v.text ?? base.onScreenText)} revealFrame={Math.min(revealFrame, 4)} durationFrames={life} />;
      case 'icon': return <ShotIcon icon={v.icon} />;
      case 'metaphor': return <ShotMetaphor metaphor={v.metaphor} life={life} />;
      case 'formula': return <SceneFormula scene={pseudoScene(base, v.text ?? base.onScreenText)} />;
      case 'list':
      case 'statement':
      default: return <SceneStatement scene={pseudoScene(base, v.text ?? base.onScreenText)} />;
    }
  })();
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', paddingBottom: 380, paddingLeft: 60, paddingRight: 60 }}>
      <div style={{ transform: `translateX(${tx}px) scale(${scale * kb})`, textAlign: 'center' }}>
        {inner}
      </div>
    </AbsoluteFill>
  );
};

// Sequência de shots da cena — cada um no seu frame-âncora, contíguos (sem vazio).
const SceneShots: React.FC<{ scene: Scene; timing?: SceneTiming | null; durationFrames: number }> = ({ scene, timing, durationFrames }) => {
  const { fps } = useVideoConfig();
  const shots = scene.shots || [];
  const starts = shotStartFrames(scene, timing, fps, durationFrames);
  return (
    <AbsoluteFill>
      {shots.map((shot, i) => {
        const start = starts[i];
        const end = i < shots.length - 1 ? starts[i + 1] : durationFrames;
        const life = Math.max(1, end - start);
        return (
          <Sequence key={i} from={start} durationInFrames={life}>
            <ShotView shot={shot} life={life} base={scene} revealFrame={0} durationFrames={life} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

// Trilho de SFX dos shots (no trilho MESTRE de áudio): cada shot com `sfx` dispara
// seu som no frame de início do shot (volume abafado sob a narração).
const SHOT_SFX_VOLUME = 0.45;
const ShotSfxTrack: React.FC<{ scene: Scene; timing?: SceneTiming | null; totalFrames: number }> = ({ scene, timing, totalFrames }) => {
  const { fps } = useVideoConfig();
  const shots = scene.shots || [];
  const starts = shotStartFrames(scene, timing, fps, totalFrames);
  // Guarda anti-repetição (belt-and-suspenders): se o som deste shot for IDÊNTICO
  // ao ÚLTIMO som DISPARADO, pula (silêncio) — evita cansar com o mesmo efeito em
  // shots seguidos. Compara o ARQUIVO resolvido (o que realmente toca), então dois
  // nomes de contrato que caem no mesmo .ogg também são deduplicados. Shots sem sfx
  // não contam como "disparo" (não alteram o último som).
  let prevFile: string | null = null;
  const fires: { i: number; from: number; file: string }[] = [];
  shots.forEach((shot, i) => {
    if (!shot.sfx) return;
    const file = resolveShotSfx(shot.sfx);
    if (file === prevFile) return;
    prevFile = file;
    fires.push({ i, from: starts[i], file });
  });
  return (
    <>
      {fires.map((f) => (
        <Sequence key={f.i} from={f.from} durationInFrames={Math.round(fps * 2)}>
          <Audio src={staticFile(f.file)} volume={SHOT_SFX_VOLUME} />
        </Sequence>
      ))}
    </>
  );
};

// Dispatcher — o role tem prioridade (cta/outro têm cena própria); senão usa visual.type.
export const SceneRenderer: React.FC<{ scene: Scene; nextTitle?: string; timing?: SceneTiming | null }> = ({ scene, nextTitle, timing }) => {
  const { fps } = useVideoConfig();
  // Mesmo cue (revealFrameFor) que o SceneShell usa pro punch — repassado ao
  // SceneChart pra sincronizar o DESENHO da curva com a fala, não só o soco.
  const revealFrame = revealFrameFor(scene, timing, fps);
  const durationFrames = Math.max(1, Math.round((timing?.durationSec ?? scene.durationSec) * fps));
  // v3: se a cena traz `shots`, o motor de shots substitui o visual único central.
  if (scene.shots && scene.shots.length) {
    return <SceneShots scene={scene} timing={timing} durationFrames={durationFrames} />;
  }
  const inner = (() => {
    if (scene.role === 'cta') return <SceneCta scene={scene} />;
    if (scene.role === 'outro') return <SceneOutro scene={scene} nextTitle={nextTitle} />;
    switch (scene.visual?.type) {
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
