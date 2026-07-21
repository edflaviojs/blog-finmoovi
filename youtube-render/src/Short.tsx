import React from 'react';
import { AbsoluteFill, Sequence, useVideoConfig } from 'remotion';
import { TransitionSeries, linearTiming, TransitionPresentation } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { Background, Watermark, SceneRenderer, SceneAudioTrack, SceneCaptionTrack, ShockIntro, HeroOrb, CinemaGrain, Vignette } from './scenes';
import { BackgroundMusic } from './audio/music';

export const TRANSITION_FRAMES = 8;
export const INTRO_FRAMES = 45; // abertura disruptiva (~1,5s) antes das cenas

type IntroStyle = 'contraste' | 'contagem' | 'timer' | 'meio' | 'objeto' | 'classic';

export type ShortScript = {
  slug: string;
  term: string;
  keyword: string;
  nextVideoTitle?: string;
  intro?: { big: string; sub: string; style?: IntroStyle };
  scenes: Array<{
    id?: number;
    role: string;
    narration: string;
    onScreenText?: string;
    cue?: string;
    cues?: string[];
    visual: { type: string; note?: string };
    durationSec: number;
  }>;
};

// Transição informada pelo PAR de cenas (R4c): continuidade direcional em vez de
// alternância cega. Ex.: número→gráfico desliza p/ baixo (rumo à origem do eixo Y).
const pickTransition = (a: ShortScript['scenes'][number], b: ShortScript['scenes'][number]): TransitionPresentation<Record<string, unknown>> => {
  const at = a.visual.type, bt = b.visual.type;
  if (at === 'number' && bt === 'chart') return slide({ direction: 'from-bottom' });
  if (bt === 'chart') return slide({ direction: 'from-right' });
  if (bt === 'number') return slide({ direction: 'from-left' });
  if (at === 'chart') return slide({ direction: 'from-bottom' });
  if (b.role === 'outro' || b.role === 'cta') return fade();
  return fade();
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
          presentation={pickTransition(scene, script.scenes[i + 1])}
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

  const introFrames = script.intro ? INTRO_FRAMES : 0;
  const sceneTypes = script.scenes.map((s) => s.visual.type);
  const sceneRoles = script.scenes.map((s) => s.role);

  return (
    <AbsoluteFill>
      <Background />
      <BackgroundMusic />
      <Watermark />
      {script.intro && (
        <Sequence durationInFrames={INTRO_FRAMES}>
          <ShockIntro big={script.intro.big} sub={script.intro.sub} style={script.intro.style} />
        </Sequence>
      )}
      <Sequence from={introFrames}>
        {/* HERO BRIDGE (R4b): orbe da marca que viaja entre âncoras — atrás do conteúdo,
            aparece nas transições p/ o centro nunca ficar vazio. */}
        <HeroOrb starts={masterStarts} types={sceneTypes} roles={sceneRoles} />
        <TransitionSeries>{children}</TransitionSeries>
        {/* Trilho MESTRE de ÁUDIO (narração + SFX): duração DESCONTADA das transições,
            p/ a voz não empilhar no cruzamento. */}
        {script.scenes.map((scene, i) => (
          <Sequence
            key={`au${i}`}
            from={masterStarts[i]}
            durationInFrames={Math.max(1, frames[i] - (i < script.scenes.length - 1 ? TRANSITION_FRAMES : 0))}
          >
            <SceneAudioTrack scene={scene} timing={sceneTimingFor(timing, scene, i)} />
          </Sequence>
        ))}
        {/* Trilho MESTRE VISUAL (legenda + ícones): duração CHEIA (R4a) — sem o desconto,
            então a legenda NÃO abre buraco na transição (palavras têm timing real). */}
        {script.scenes.map((scene, i) => (
          <Sequence key={`cap${i}`} from={masterStarts[i]} durationInFrames={frames[i]}>
            <SceneCaptionTrack scene={scene} timing={sceneTimingFor(timing, scene, i)} />
          </Sequence>
        ))}
      </Sequence>
      {/* CINEMA FINISH (R6): grão + vinheta por cima de tudo, bem sutis. */}
      <CinemaGrain />
      <Vignette />
    </AbsoluteFill>
  );
};
