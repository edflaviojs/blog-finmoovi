import { AbsoluteFill, Sequence, useVideoConfig } from 'remotion';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { Background, Watermark, SceneRenderer, SceneAudioLayer, ShockIntro, DynamicIntro, SignatureOutro } from './scenes';
import { BackgroundMusic } from './audio/music';

export const TRANSITION_FRAMES = 8;
export const INTRO_FRAMES = 45; // abertura disruptiva legada (~1,5s) antes das cenas
export const INTRO_FRAMES_V3 = 120; // intro dinâmica v3 (~4s): frase + contador crescente
export const SIGNATURE_FRAMES = 75; // assinatura final da marca (~2,5s) depois da última cena

// ── CONTRACT v3 — "SHOTS" ────────────────────────────────────────────────────
export type ShotVisual = {
  type: 'number' | 'counter' | 'chart' | 'icon' | 'metaphor' | 'statement' | 'formula' | 'list';
  text?: string;
  from?: number;
  to?: number;
  prefix?: string;
  icon?: 'money' | 'coins' | 'growth' | 'clock' | 'card' | 'warning' | 'question' | 'mind'
    | 'piggy' | 'bank' | 'target' | 'trophy' | 'bulb' | 'hourglass' | 'wallet' | 'fire' | 'chart-down' | 'shield';
  metaphor?: 'bola-neve' | 'avalanche' | 'escorregao' | 'clique-link';
  note?: string;
};
export type Shot = {
  anchor: string;
  visual: ShotVisual;
  sfx?: 'boom' | 'whoosh' | 'coin' | 'alert' | 'avalanche' | 'slide'
    | 'kaching' | 'typewriter' | 'keyboard' | 'pop'
    | 'click' | 'ding' | 'thud' | 'sparkle';
};

// intro: legada { big, sub } OU v3 { frase, counter? }. Ambas convivem (backward compat).
export type IntroSpec = {
  big?: string;
  sub?: string;
  frase?: string;
  counter?: { from: number; to: number; prefix?: string };
};

// intro v3 = tem `frase`. Só então usamos a DynamicIntro / INTRO_FRAMES_V3.
export const isV3Intro = (intro?: IntroSpec | null): boolean => !!intro && typeof intro.frase === 'string' && intro.frase.length > 0;

// Frames da abertura conforme o tipo de intro (v3 ~4s, legada ~1,5s, nenhuma 0).
export const introFramesFor = (script: ShortScript): number =>
  !script.intro ? 0 : isV3Intro(script.intro) ? INTRO_FRAMES_V3 : INTRO_FRAMES;

export type ShortScript = {
  slug: string;
  term: string;
  keyword: string;
  nextVideoTitle?: string;
  intro?: IntroSpec;
  scenes: Array<{
    id?: number;
    role: string;
    narration: string;
    onScreenText?: string;
    cue?: string;
    visual?: { type: string; note?: string };
    shots?: Shot[];
    durationSec: number;
  }>;
};

// Timing REAL gerado pelo TTS (tts-short.js): áudio + palavras com start/end da fala.
export type SceneTiming = {
  id: number;
  role?: string;
  narration?: string;
  audioFile: string;
  durationSec: number;
  words: { word: string; start: number; end: number }[];
};

export type ShortTiming = {
  slug: string;
  provider?: string;
  voice?: string;
  scenes: SceneTiming[];
  totalDurationSec: number;
} | null;

// Timing da cena i (casa por id, com fallback por índice).
const sceneTimingFor = (
  timing: ShortTiming,
  scene: ShortScript['scenes'][number],
  i: number,
): SceneTiming | null => {
  if (!timing?.scenes?.length) return null;
  const id = scene.id ?? i + 1;
  return timing.scenes.find((s) => String(s.id) === String(id)) ?? timing.scenes[i] ?? null;
};

// Duração de cada cena (seg): a MEDIDA do TTS (timing) ou a autoral do roteiro.
export const sceneDurationsSec = (script: ShortScript, timing: ShortTiming): number[] =>
  script.scenes.map((s, i) => sceneTimingFor(timing, s, i)?.durationSec || s.durationSec);

export const sceneFramesFrom = (durationsSec: number[], fps: number) =>
  durationsSec.map((d) => Math.max(1, Math.round(d * fps)));

// Total já descontando as sobreposições das transições.
export const totalFramesFrom = (durationsSec: number[], fps: number) => {
  const frames = sceneFramesFrom(durationsSec, fps);
  const transitions = Math.max(0, durationsSec.length - 1) * TRANSITION_FRAMES;
  return frames.reduce((a, b) => a + b, 0) - transitions;
};

// Compat: duração total só pelo roteiro (sem áudio/timing).
export const totalFrames = (script: ShortScript, fps: number) =>
  totalFramesFrom(sceneDurationsSec(script, null), fps);

export const Short: React.FC<{ script: ShortScript; timing?: ShortTiming }> = ({ script, timing = null }) => {
  const { fps } = useVideoConfig();
  const durations = sceneDurationsSec(script, timing);
  const frames = sceneFramesFrom(durations, fps);
  // Comprimento do conteúdo (cenas + transições) — a assinatura entra logo após.
  const contentFrames = totalFramesFrom(durations, fps);

  const children: React.ReactNode[] = [];
  script.scenes.forEach((scene, i) => {
    children.push(
      <TransitionSeries.Sequence key={`s${i}`} durationInFrames={frames[i]}>
        <SceneRenderer scene={scene} nextTitle={script.nextVideoTitle} timing={sceneTimingFor(timing, scene, i)} />
      </TransitionSeries.Sequence>,
    );
    if (i < script.scenes.length - 1) {
      children.push(
        <TransitionSeries.Transition
          key={`t${i}`}
          presentation={i % 2 === 0 ? fade() : slide({ direction: 'from-right' })}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />,
      );
    }
  });

  // Início de cada cena no timeline global (desconta as sobreposições das transições).
  const masterStarts: number[] = [];
  {
    let prefix = 0;
    for (let i = 0; i < frames.length; i++) {
      masterStarts.push(Math.max(0, prefix - i * TRANSITION_FRAMES));
      prefix += frames[i];
    }
  }

  const introFrames = introFramesFor(script);

  return (
    <AbsoluteFill>
      <Background />
      <BackgroundMusic />
      <Watermark />
      {script.intro && (
        <Sequence durationInFrames={introFrames}>
          {isV3Intro(script.intro) ? (
            <DynamicIntro frase={script.intro.frase || ''} counter={script.intro.counter} frames={introFrames} />
          ) : (
            <ShockIntro big={script.intro.big || ''} sub={script.intro.sub || ''} />
          )}
        </Sequence>
      )}
      <Sequence from={introFrames}>
        <TransitionSeries>{children}</TransitionSeries>
        {/* Trilho MESTRE: áudio + legenda + ícones + SFX, sequencial e SEM sobreposição. */}
        {script.scenes.map((scene, i) => (
          <Sequence
            key={`al${i}`}
            from={masterStarts[i]}
            durationInFrames={Math.max(1, frames[i] - (i < script.scenes.length - 1 ? TRANSITION_FRAMES : 0))}
          >
            <SceneAudioLayer scene={scene} timing={sceneTimingFor(timing, scene, i)} />
          </Sequence>
        ))}
      </Sequence>
      {/* Assinatura final da marca (~2,5s) — entra após a última cena. A duração da
          composição é estendida em +SIGNATURE_FRAMES no Root (calculateMetadata). */}
      <Sequence from={introFrames + contentFrames} durationInFrames={SIGNATURE_FRAMES}>
        <SignatureOutro />
      </Sequence>
    </AbsoluteFill>
  );
};
