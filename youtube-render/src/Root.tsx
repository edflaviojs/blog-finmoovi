import { Composition } from 'remotion';
import { Test } from './Test';
import { Short, ShortScript } from './Short';
import roteiro from '../../src/scripts/youtube/output/juros-compostos.script.json';

const FPS = 30;
const script = roteiro as ShortScript;
const totalSec = script.scenes.reduce((a, s) => a + s.durationSec, 0);

// Formato Short: vertical 1080×1920, 30fps.
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Short"
        component={Short}
        durationInFrames={Math.round(totalSec * FPS)}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{ script }}
      />
      <Composition
        id="Test"
        component={Test}
        durationInFrames={90}
        fps={FPS}
        width={1080}
        height={1920}
      />
    </>
  );
};
