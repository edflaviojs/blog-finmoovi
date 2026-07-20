import { AbsoluteFill, useVideoConfig } from 'remotion';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { Background, Watermark, SceneRenderer } from './scenes';

export const TRANSITION_FRAMES = 8;

export type ShortScript = {
  slug: string;
  term: string;
  keyword: string;
  nextVideoTitle?: string;
  scenes: Array<{
    role: string;
    narration: string;
    onScreenText?: string;
    visual: { type: string; note?: string };
    durationSec: number;
  }>;
};

export const sceneFrames = (script: ShortScript, fps: number) =>
  script.scenes.map((s) => Math.max(1, Math.round(s.durationSec * fps)));

// Duração total já descontando as sobreposições das transições.
export const totalFrames = (script: ShortScript, fps: number) => {
  const frames = sceneFrames(script, fps);
  const transitions = Math.max(0, script.scenes.length - 1) * TRANSITION_FRAMES;
  return frames.reduce((a, b) => a + b, 0) - transitions;
};

export const Short: React.FC<{ script: ShortScript }> = ({ script }) => {
  const { fps } = useVideoConfig();
  const frames = sceneFrames(script, fps);

  const children: React.ReactNode[] = [];
  script.scenes.forEach((scene, i) => {
    children.push(
      <TransitionSeries.Sequence key={`s${i}`} durationInFrames={frames[i]}>
        <SceneRenderer scene={scene} nextTitle={script.nextVideoTitle} />
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

  return (
    <AbsoluteFill>
      <Background />
      <Watermark />
      <TransitionSeries>{children}</TransitionSeries>
    </AbsoluteFill>
  );
};
