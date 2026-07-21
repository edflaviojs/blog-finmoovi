import { Composition, staticFile } from 'remotion';
import { Test } from './Test';
import { Short, ShortScript, ShortTiming, totalFrames, totalFramesFrom, sceneDurationsSec, INTRO_FRAMES } from './Short';
import { AppBrollLong, AppBrollShort } from './AppBroll';
import { AppScrollLong, AppScrollShort } from './AppScroll';
import { Cards3DLong, Cards3DShort } from './Cards3D';
import { CreditCards3DLong, CreditCards3DShort } from './CreditCards3D';
import { CartoesCountUpLong, CartoesCountUpShort } from './CartoesCountUp';
import { FluxoCaixa3DLong, FluxoCaixa3DShort } from './FluxoCaixa3D';
import { FluxoBarrasLong, FluxoBarrasShort } from './FluxoBarras';
import { Extrato3DLong, Extrato3DShort } from './Extrato3D';
import { ExtratoListaLong, ExtratoListaShort } from './ExtratoLista';
import { Balanco3DShort, Balanco3DLong } from './Balanco3D';
import { BalancoDonutShort, BalancoDonutLong } from './BalancoDonut';
import { Compras3DShort, Compras3DLong } from './Compras3D';
import { ComprasCarrinhoShort, ComprasCarrinhoLong } from './ComprasCarrinho';
import { DashboardHero } from './DashboardHero';
import { SmartCapture3DShort, SmartCapture3DLong } from './SmartCapture3D';
import { SmartCaptureVozShort, SmartCaptureVozLong } from './SmartCaptureVoz';
import { AppTourShort, AppMosaicoShort, AppCarrosselShort, AppNumerosShort, AppQuadShort, AppTourLong, AppMosaicoLong, AppCarrosselLong, AppNumerosLong, AppQuadLong } from './AppOverview';
import { AppScreen3DLong, AppScreen3DShort } from './AppScreen3D';
import { cartoes } from './broll/cartoes';
import { fluxo } from './broll/fluxo';
import { extrato } from './broll/extrato';
import { balanco } from './broll/balanco';
import { compras } from './broll/compras';
import { smartCapture } from './broll/smartcapture';
import roteiro from '../../src/scripts/youtube/output/juros-compostos.script.json';

const FPS = 30;
const script = roteiro as ShortScript;

// Carrega o timing.json do TTS (se existir) → voz + timing real no Short.
// Sem o arquivo (preview local sem áudio gerado), cai no timing autoral do roteiro.
const introFrames = script.intro ? INTRO_FRAMES : 0;
const shortMetadata = async () => {
  try {
    const res = await fetch(staticFile(`audio/${script.slug}/timing.json`));
    if (!res.ok) throw new Error('sem timing');
    const timing = (await res.json()) as ShortTiming;
    const durationInFrames = Math.max(1, totalFramesFrom(sceneDurationsSec(script, timing), FPS)) + introFrames;
    return { durationInFrames, props: { script, timing } };
  } catch {
    return { durationInFrames: totalFrames(script, FPS) + introFrames, props: { script, timing: null as ShortTiming } };
  }
};

// Formato Short: vertical 1080×1920, 30fps.
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Short"
        component={Short}
        durationInFrames={totalFrames(script, FPS) + introFrames}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{ script, timing: null as ShortTiming }}
        calculateMetadata={shortMetadata}
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
      {/* ── TELA 3: EXTRATO ── */}
      <Composition
        id="Extrato3DShort"
        component={Extrato3DShort}
        durationInFrames={210}
        fps={FPS}
        width={1080}
        height={1920}
      />
      <Composition
        id="Extrato3DLong"
        component={Extrato3DLong}
        durationInFrames={210}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="ExtratoListaShort"
        component={ExtratoListaShort}
        durationInFrames={210}
        fps={FPS}
        width={1080}
        height={1920}
      />
      <Composition
        id="ExtratoListaLong"
        component={ExtratoListaLong}
        durationInFrames={210}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="ExtratoFrameShort"
        component={AppBrollShort}
        durationInFrames={240}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{ trimBefore: extrato.footageFrame }}
      />
      <Composition
        id="ExtratoFrameLong"
        component={AppBrollLong}
        durationInFrames={240}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{ trimBefore: extrato.footageFrame }}
      />
      <Composition
        id="ExtratoScrollShort"
        component={AppScrollShort}
        durationInFrames={360}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{ trimBefore: extrato.footageFrame }}
      />
      <Composition
        id="ExtratoScrollLong"
        component={AppScrollLong}
        durationInFrames={360}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{ trimBefore: extrato.footageFrame }}
      />
      <Composition
        id="ExtratoScreen3DShort"
        component={AppScreen3DShort}
        durationInFrames={240}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{ trimBefore: extrato.footageFrame }}
      />
      <Composition
        id="ExtratoScreen3DLong"
        component={AppScreen3DLong}
        durationInFrames={240}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{ trimBefore: extrato.footageFrame }}
      />
      {/* ── TELA 4: BALANÇO MENSAL (só vertical/Short, 5 clipes) ── */}
      <Composition
        id="Balanco3DShort"
        component={Balanco3DShort}
        durationInFrames={210}
        fps={FPS}
        width={1080}
        height={1920}
      />
      <Composition
        id="BalancoDonutShort"
        component={BalancoDonutShort}
        durationInFrames={210}
        fps={FPS}
        width={1080}
        height={1920}
      />
      <Composition
        id="BalancoFrameShort"
        component={AppBrollShort}
        durationInFrames={240}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{ trimBefore: balanco.footageFrame }}
      />
      <Composition
        id="BalancoScrollShort"
        component={AppScrollShort}
        durationInFrames={360}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{ trimBefore: balanco.footageFrame }}
      />
      <Composition
        id="BalancoScreen3DShort"
        component={AppScreen3DShort}
        durationInFrames={240}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{ trimBefore: balanco.footageFrame }}
      />
      {/* Balanço horizontais (long) — completar 10/10 */}
      <Composition
        id="Balanco3DLong"
        component={Balanco3DLong}
        durationInFrames={210}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="BalancoDonutLong"
        component={BalancoDonutLong}
        durationInFrames={210}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="BalancoFrameLong"
        component={AppBrollLong}
        durationInFrames={240}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{ trimBefore: balanco.footageFrame }}
      />
      <Composition
        id="BalancoScrollLong"
        component={AppScrollLong}
        durationInFrames={360}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{ trimBefore: balanco.footageFrame }}
      />
      <Composition
        id="BalancoScreen3DLong"
        component={AppScreen3DLong}
        durationInFrames={240}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{ trimBefore: balanco.footageFrame }}
      />
      {/* ── TELA 5: COMPRAS (Modo Compras) ── */}
      <Composition
        id="Compras3DShort"
        component={Compras3DShort}
        durationInFrames={210}
        fps={FPS}
        width={1080}
        height={1920}
      />
      <Composition
        id="Compras3DLong"
        component={Compras3DLong}
        durationInFrames={210}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="ComprasCarrinhoShort"
        component={ComprasCarrinhoShort}
        durationInFrames={210}
        fps={FPS}
        width={1080}
        height={1920}
      />
      <Composition
        id="ComprasCarrinhoLong"
        component={ComprasCarrinhoLong}
        durationInFrames={210}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="ComprasFrameShort"
        component={AppBrollShort}
        durationInFrames={240}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{ trimBefore: compras.footageFrame }}
      />
      <Composition
        id="ComprasFrameLong"
        component={AppBrollLong}
        durationInFrames={240}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{ trimBefore: compras.footageFrame }}
      />
      <Composition
        id="ComprasScrollShort"
        component={AppScrollShort}
        durationInFrames={360}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{ trimBefore: compras.footageFrame }}
      />
      <Composition
        id="ComprasScrollLong"
        component={AppScrollLong}
        durationInFrames={360}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{ trimBefore: compras.footageFrame }}
      />
      <Composition
        id="ComprasScreen3DShort"
        component={AppScreen3DShort}
        durationInFrames={240}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{ trimBefore: compras.footageFrame }}
      />
      <Composition
        id="ComprasScreen3DLong"
        component={AppScreen3DLong}
        durationInFrames={240}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{ trimBefore: compras.footageFrame }}
      />
      {/* ── DASHBOARD (coração do app) — 20 clipes: dark/light · pt/en/es · BRL/EUR + transições ── */}
      <Composition id="DashDarkPtBrlShort" component={DashboardHero} durationInFrames={210} fps={FPS} width={1080} height={1920} defaultProps={{ theme: 'dark', lang: 'pt', currency: 'BRL' }} />
      <Composition id="DashDarkPtBrlLong" component={DashboardHero} durationInFrames={210} fps={FPS} width={1920} height={1080} defaultProps={{ theme: 'dark', lang: 'pt', currency: 'BRL' }} />
      <Composition id="DashLightPtBrlShort" component={DashboardHero} durationInFrames={210} fps={FPS} width={1080} height={1920} defaultProps={{ theme: 'light', lang: 'pt', currency: 'BRL' }} />
      <Composition id="DashLightPtBrlLong" component={DashboardHero} durationInFrames={210} fps={FPS} width={1920} height={1080} defaultProps={{ theme: 'light', lang: 'pt', currency: 'BRL' }} />
      <Composition id="DashDarkEnBrlShort" component={DashboardHero} durationInFrames={210} fps={FPS} width={1080} height={1920} defaultProps={{ theme: 'dark', lang: 'en', currency: 'BRL' }} />
      <Composition id="DashDarkEnBrlLong" component={DashboardHero} durationInFrames={210} fps={FPS} width={1920} height={1080} defaultProps={{ theme: 'dark', lang: 'en', currency: 'BRL' }} />
      <Composition id="DashLightEnBrlShort" component={DashboardHero} durationInFrames={210} fps={FPS} width={1080} height={1920} defaultProps={{ theme: 'light', lang: 'en', currency: 'BRL' }} />
      <Composition id="DashLightEnBrlLong" component={DashboardHero} durationInFrames={210} fps={FPS} width={1920} height={1080} defaultProps={{ theme: 'light', lang: 'en', currency: 'BRL' }} />
      <Composition id="DashDarkEsEurShort" component={DashboardHero} durationInFrames={210} fps={FPS} width={1080} height={1920} defaultProps={{ theme: 'dark', lang: 'es', currency: 'EUR' }} />
      <Composition id="DashDarkEsEurLong" component={DashboardHero} durationInFrames={210} fps={FPS} width={1920} height={1080} defaultProps={{ theme: 'dark', lang: 'es', currency: 'EUR' }} />
      <Composition id="DashLightEsEurShort" component={DashboardHero} durationInFrames={210} fps={FPS} width={1080} height={1920} defaultProps={{ theme: 'light', lang: 'es', currency: 'EUR' }} />
      <Composition id="DashLightEsEurLong" component={DashboardHero} durationInFrames={210} fps={FPS} width={1920} height={1080} defaultProps={{ theme: 'light', lang: 'es', currency: 'EUR' }} />
      <Composition id="DashDarkPtEurShort" component={DashboardHero} durationInFrames={210} fps={FPS} width={1080} height={1920} defaultProps={{ theme: 'dark', lang: 'pt', currency: 'EUR' }} />
      <Composition id="DashDarkPtEurLong" component={DashboardHero} durationInFrames={210} fps={FPS} width={1920} height={1080} defaultProps={{ theme: 'dark', lang: 'pt', currency: 'EUR' }} />
      <Composition id="DashMorphThemeShort" component={DashboardHero} durationInFrames={240} fps={FPS} width={1080} height={1920} defaultProps={{ theme: 'dark', lang: 'pt', currency: 'BRL', morph: 'theme' }} />
      <Composition id="DashMorphThemeLong" component={DashboardHero} durationInFrames={240} fps={FPS} width={1920} height={1080} defaultProps={{ theme: 'dark', lang: 'pt', currency: 'BRL', morph: 'theme' }} />
      <Composition id="DashMorphCurrencyShort" component={DashboardHero} durationInFrames={240} fps={FPS} width={1080} height={1920} defaultProps={{ theme: 'dark', lang: 'pt', currency: 'BRL', morph: 'currency' }} />
      <Composition id="DashMorphCurrencyLong" component={DashboardHero} durationInFrames={240} fps={FPS} width={1920} height={1080} defaultProps={{ theme: 'dark', lang: 'pt', currency: 'BRL', morph: 'currency' }} />
      <Composition id="DashMorphLangShort" component={DashboardHero} durationInFrames={300} fps={FPS} width={1080} height={1920} defaultProps={{ theme: 'dark', lang: 'pt', currency: 'BRL', morph: 'lang' }} />
      <Composition id="DashMorphLangLong" component={DashboardHero} durationInFrames={300} fps={FPS} width={1920} height={1080} defaultProps={{ theme: 'dark', lang: 'pt', currency: 'BRL', morph: 'lang' }} />
      {/* ── TELA SMART CAPTURE (FinMoovi Quick) ── */}
      <Composition id="SmartCapture3DShort" component={SmartCapture3DShort} durationInFrames={210} fps={FPS} width={1080} height={1920} />
      <Composition id="SmartCapture3DLong" component={SmartCapture3DLong} durationInFrames={210} fps={FPS} width={1920} height={1080} />
      <Composition id="SmartCaptureVozShort" component={SmartCaptureVozShort} durationInFrames={240} fps={FPS} width={1080} height={1920} />
      <Composition id="SmartCaptureVozLong" component={SmartCaptureVozLong} durationInFrames={240} fps={FPS} width={1920} height={1080} />
      <Composition id="SmartFrameShort" component={AppBrollShort} durationInFrames={240} fps={FPS} width={1080} height={1920} defaultProps={{ trimBefore: smartCapture.footageFrame }} />
      <Composition id="SmartFrameLong" component={AppBrollLong} durationInFrames={240} fps={FPS} width={1920} height={1080} defaultProps={{ trimBefore: smartCapture.footageFrame }} />
      <Composition id="SmartScrollShort" component={AppScrollShort} durationInFrames={360} fps={FPS} width={1080} height={1920} defaultProps={{ trimBefore: smartCapture.footageFrame }} />
      <Composition id="SmartScrollLong" component={AppScrollLong} durationInFrames={360} fps={FPS} width={1920} height={1080} defaultProps={{ trimBefore: smartCapture.footageFrame }} />
      <Composition id="SmartScreen3DShort" component={AppScreen3DShort} durationInFrames={240} fps={FPS} width={1080} height={1920} defaultProps={{ trimBefore: smartCapture.footageFrame }} />
      <Composition id="SmartScreen3DLong" component={AppScreen3DLong} durationInFrames={240} fps={FPS} width={1920} height={1080} defaultProps={{ trimBefore: smartCapture.footageFrame }} />
      {/* ── APANHADO GERAL DO APP (5 montagens combinando telas) ── */}
      <Composition id="AppTour" component={AppTourShort} durationInFrames={416} fps={FPS} width={1080} height={1920} />
      <Composition id="AppMosaico" component={AppMosaicoShort} durationInFrames={210} fps={FPS} width={1080} height={1920} />
      <Composition id="AppCarrossel" component={AppCarrosselShort} durationInFrames={300} fps={FPS} width={1080} height={1920} />
      <Composition id="AppNumeros" component={AppNumerosShort} durationInFrames={188} fps={FPS} width={1080} height={1920} />
      <Composition id="AppQuad" component={AppQuadShort} durationInFrames={210} fps={FPS} width={1080} height={1920} />
      <Composition id="AppTourLong" component={AppTourLong} durationInFrames={416} fps={FPS} width={1920} height={1080} />
      <Composition id="AppMosaicoLong" component={AppMosaicoLong} durationInFrames={210} fps={FPS} width={1920} height={1080} />
      <Composition id="AppCarrosselLong" component={AppCarrosselLong} durationInFrames={300} fps={FPS} width={1920} height={1080} />
      <Composition id="AppNumerosLong" component={AppNumerosLong} durationInFrames={188} fps={FPS} width={1920} height={1080} />
      <Composition id="AppQuadLong" component={AppQuadLong} durationInFrames={210} fps={FPS} width={1920} height={1080} />
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
