import { Composition } from 'remotion';
import { Test } from './Test';

// Formato Short: vertical 1080×1920, 30fps. A composição de teste (F1.3a) só
// prova que o toolchain renderiza; as cenas reais entram na F1.3b.
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Test"
        component={Test}
        durationInFrames={90}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
