import { AbsoluteFill, Series, useVideoConfig } from 'remotion';
import { Background, Watermark, SceneRenderer } from './scenes';

export type ShortScript = {
  slug: string;
  term: string;
  keyword: string;
  scenes: Array<{
    role: string;
    narration: string;
    onScreenText?: string;
    visual: { type: string; note?: string };
    durationSec: number;
  }>;
};

// Compõe o roteiro (JSON do roteirista) numa timeline de cenas 9:16.
// O roteiro chega por inputProps (defaultProps no Root).
export const Short: React.FC<{ script: ShortScript }> = ({ script }) => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      <Background />
      <Watermark />
      <Series>
        {script.scenes.map((scene, i) => (
          <Series.Sequence key={i} durationInFrames={Math.max(1, Math.round(scene.durationSec * fps))}>
            <SceneRenderer scene={scene} />
          </Series.Sequence>
        ))}
      </Series>
    </AbsoluteFill>
  );
};
