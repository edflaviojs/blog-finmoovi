import { Composition } from 'remotion';
import { Test } from './Test';
import { Short, ShortScript, totalFrames } from './Short';
import { AppBrollLong, AppBrollShort } from './AppBroll';
import { AppScrollLong, AppScrollShort } from './AppScroll';
import { Cards3DLong, Cards3DShort } from './Cards3D';
import { CreditCards3DLong, CreditCards3DShort } from './CreditCards3D';
import { CartoesCountUpLong, CartoesCountUpShort } from './CartoesCountUp';
import { FluxoCaixa3DLong, FluxoCaixa3DShort } from './FluxoCaixa3D';
import { FluxoBarrasLong, FluxoBarrasShort } from './FluxoBarras';
import { AppScreen3DLong, AppScreen3DShort } from './AppScreen3D';
import { cartoes } from './broll/cartoes';
import { fluxo } from './broll/fluxo';
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
        id="CreditCards3DShort"
        component={CreditCards3DShort}
        durationInFrames={210}
        fps={FPS}
        width={1080}
        height={1920}
      />
      <Composition
        id="CreditCards3DLong"
        component={CreditCards3DLong}
        durationInFrames={210}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="CartoesCountUpShort"
        component={CartoesCountUpShort}
        durationInFrames={210}
        fps={FPS}
        width={1080}
        height={1920}
      />
      <Composition
        id="CartoesCountUpLong"
        component={CartoesCountUpLong}
        durationInFrames={210}
        fps={FPS}
        width={1920}
        height={1080}
      />
      {/* Cartões nos estilos FOOTAGE (mesmos componentes, trimBefore da tela de Cartões) */}
      <Composition
        id="CartoesFrameShort"
        component={AppBrollShort}
        durationInFrames={240}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{ trimBefore: cartoes.footageFrame }}
      />
      <Composition
        id="CartoesFrameLong"
        component={AppBrollLong}
        durationInFrames={240}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{ trimBefore: cartoes.footageFrame }}
      />
      <Composition
        id="CartoesScrollShort"
        component={AppScrollShort}
        durationInFrames={360}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{ trimBefore: cartoes.footageFrame }}
      />
      <Composition
        id="CartoesScrollLong"
        component={AppScrollLong}
        durationInFrames={360}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{ trimBefore: cartoes.footageFrame }}
      />
      <Composition
        id="CartoesScreen3DShort"
        component={AppScreen3DShort}
        durationInFrames={240}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{ trimBefore: cartoes.footageFrame }}
      />
      <Composition
        id="CartoesScreen3DLong"
        component={AppScreen3DLong}
        durationInFrames={240}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{ trimBefore: cartoes.footageFrame }}
      />
      {/* ── TELA 2: FLUXO DE CAIXA ── */}
      <Composition
        id="FluxoCaixa3DShort"
        component={FluxoCaixa3DShort}
        durationInFrames={210}
        fps={FPS}
        width={1080}
        height={1920}
      />
      <Composition
        id="FluxoCaixa3DLong"
        component={FluxoCaixa3DLong}
        durationInFrames={210}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="FluxoBarrasShort"
        component={FluxoBarrasShort}
        durationInFrames={210}
        fps={FPS}
        width={1080}
        height={1920}
      />
      <Composition
        id="FluxoBarrasLong"
        component={FluxoBarrasLong}
        durationInFrames={210}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="FluxoFrameShort"
        component={AppBrollShort}
        durationInFrames={240}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{ trimBefore: fluxo.footageFrame }}
      />
      <Composition
        id="FluxoFrameLong"
        component={AppBrollLong}
        durationInFrames={240}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{ trimBefore: fluxo.footageFrame }}
      />
      <Composition
        id="FluxoScrollShort"
        component={AppScrollShort}
        durationInFrames={360}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{ trimBefore: fluxo.footageFrame }}
      />
      <Composition
        id="FluxoScrollLong"
        component={AppScrollLong}
        durationInFrames={360}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{ trimBefore: fluxo.footageFrame }}
      />
      <Composition
        id="FluxoScreen3DShort"
        component={AppScreen3DShort}
        durationInFrames={240}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{ trimBefore: fluxo.footageFrame }}
      />
      <Composition
        id="FluxoScreen3DLong"
        component={AppScreen3DLong}
        durationInFrames={240}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{ trimBefore: fluxo.footageFrame }}
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
