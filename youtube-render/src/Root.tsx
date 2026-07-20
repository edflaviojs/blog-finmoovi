import { Composition } from 'remotion';
import { Test } from './Test';
import { Short, ShortScript, totalFrames } from './Short';
import { AppBrollLong, AppBrollShort } from './AppBroll';
import { AppScrollLong, AppScrollShort } from './AppScroll';
import { Cards3DLong, Cards3DShort } from './Cards3D';
import { AppScreen3DLong, AppScreen3DShort } from './AppScreen3D';
import roteiro from '../../src/scripts/youtube/output/juros-compostos.script.json';

const FPS = 30;
const script = roteiro as ShortScript;

// Formato Short: vertical 1080×1920, 30fps.
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Short"
        component={Short}
        durationInFrames={totalFrames(script, FPS)}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{ script }}
      />
      <Composition
        id="AppBrollLong"
        component={AppBrollLong}
        durationInFrames={240}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{ trimBefore: 150 }}
      />
      <Composition
        id="AppBrollShort"
        component={AppBrollShort}
        durationInFrames={240}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{ trimBefore: 150 }}
      />
      <Composition
        id="AppScrollLong"
        component={AppScrollLong}
        durationInFrames={360}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{ trimBefore: 120 }}
      />
      <Composition
        id="AppScrollShort"
        component={AppScrollShort}
        durationInFrames={360}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{ trimBefore: 120 }}
      />
      <Composition
        id="Cards3DShort"
        component={Cards3DShort}
        durationInFrames={210}
        fps={FPS}
        width={1080}
        height={1920}
      />
      <Composition
        id="Cards3DLong"
        component={Cards3DLong}
        durationInFrames={210}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="AppScreen3DShort"
        component={AppScreen3DShort}
        durationInFrames={240}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{ trimBefore: 150 }}
      />
      <Composition
        id="AppScreen3DLong"
        component={AppScreen3DLong}
        durationInFrames={240}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{ trimBefore: 150 }}
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
