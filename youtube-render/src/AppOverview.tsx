import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { slide } from '@remotion/transitions/slide';
import { fade } from '@remotion/transitions/fade';
import { Background } from './scenes';
import { BRAND, DISPLAY, BODY } from './theme';
import { Phone } from './AppBroll';
import { brl } from './broll/cartoes';
import { DashboardHero } from './DashboardHero';
import { CreditCards3DShort } from './CreditCards3D';
import { FluxoBarrasShort } from './FluxoBarras';
import { ExtratoListaShort } from './ExtratoLista';
import { BalancoDonutShort } from './BalancoDonut';
import { ComprasCarrinhoShort } from './ComprasCarrinho';
import { SmartCapture3DShort } from './SmartCapture3D';

// APANHADO GERAL DO APP — 5 estilos que JUNTAM todas as telas (montagem/vitrine).

// timestamps (frames 30fps) de cada tela na gravação
const SHOTS = [900, 15750, 17700, 14400, 19200, 22350, 23250, 10800];

// ── 1. APP TOUR: passa por todas as telas nativas com transições ──
const Tour: React.FC = () => (
  <TransitionSeries>
    <TransitionSeries.Sequence durationInFrames={70}><DashboardHero theme="dark" lang="pt" currency="BRL" /></TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={slide({ direction: 'from-right' })} timing={linearTiming({ durationInFrames: 14 })} />
    <TransitionSeries.Sequence durationInFrames={70}><CreditCards3DShort /></TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={slide({ direction: 'from-right' })} timing={linearTiming({ durationInFrames: 14 })} />
    <TransitionSeries.Sequence durationInFrames={70}><FluxoBarrasShort /></TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 14 })} />
    <TransitionSeries.Sequence durationInFrames={70}><ExtratoListaShort /></TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={slide({ direction: 'from-bottom' })} timing={linearTiming({ durationInFrames: 14 })} />
    <TransitionSeries.Sequence durationInFrames={70}><BalancoDonutShort /></TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={slide({ direction: 'from-right' })} timing={linearTiming({ durationInFrames: 14 })} />
    <TransitionSeries.Sequence durationInFrames={70}><ComprasCarrinhoShort /></TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 14 })} />
    <TransitionSeries.Sequence durationInFrames={80}><SmartCapture3DShort /></TransitionSeries.Sequence>
  </TransitionSeries>
);

// ── 2. MOSAICO FLUTUANTE: colagem 3D de telas do app ──
const Mosaico: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const ph = Math.round(height * 0.27);
  const enter = spring({ frame, fps, config: { damping: 18, mass: 0.9 } });
  // posições espalhadas (x%, y%, rot, delay)
  const layout = [
    { x: 22, y: 24, r: -8 }, { x: 74, y: 20, r: 7 },
    { x: 20, y: 55, r: 6 }, { x: 76, y: 54, r: -7 },
    { x: 30, y: 84, r: -5 }, { x: 70, y: 86, r: 6 },
  ];
  return (
    <AbsoluteFill style={{ perspective: 1400 }}>
      {layout.map((p, i) => {
        const float = Math.sin(frame / 26 + i) * 12;
        const op = interpolate(enter, [0, 1], [0, 1]);
        const tz = interpolate(enter, [0, 1], [-500 - i * 60, 0]);
        return (
          <div key={i} style={{
            position: 'absolute', left: `${p.x}%`, top: `${p.y}%`,
            transform: `translate(-50%,-50%) translateY(${float}px) translateZ(${tz}px) rotate(${p.r}deg)`,
            opacity: op, transformStyle: 'preserve-3d',
          }}>
            <Phone h={ph} trimBefore={SHOTS[i]} />
          </div>
        );
      })}
      <AbsoluteFill style={{ justifyContent: 'flex-start', alignItems: 'center', paddingTop: 40 }}>
        <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 56, color: BRAND.text, textShadow: '0 4px 24px rgba(0,0,0,0.6)' }}>Tudo em um só app</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── 3. CARROSSEL 3D (coverflow) ──
const Carrossel: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const ph = Math.round(height * 0.57);
  const shots = SHOTS.slice(0, 6);
  const step = Math.round(width * 0.34); // px entre celulares
  const scroll = (frame / 3) % (step * shots.length);
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', perspective: 1600 }}>
      <div style={{ position: 'relative', width: 1, height: 1, transformStyle: 'preserve-3d' }}>
        {shots.map((t, i) => {
          const x = i * step - scroll;
          const wrapped = ((x + step * shots.length + step) % (step * shots.length)) - step;
          const dist = Math.abs(wrapped) / step;
          const ry = interpolate(wrapped, [-step, 0, step], [45, 0, -45], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          const scale = interpolate(dist, [0, 1.5], [1, 0.7], { extrapolateRight: 'clamp' });
          const op = interpolate(dist, [0, 1.5, 2], [1, 0.6, 0], { extrapolateRight: 'clamp' });
          return (
            <div key={i} style={{ position: 'absolute', left: 0, top: 0, transform: `translate(-50%,-50%) translateX(${wrapped}px) rotateY(${ry}deg) scale(${scale})`, opacity: op, zIndex: Math.round(100 - dist * 10) }}>
              <Phone h={ph} trimBefore={t} />
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ── 4. O APP EM NÚMEROS ──
const NUMS = [
  { label: 'Saldo nas contas', v: 6604.93, color: '#f0f6fc' },
  { label: 'Receitas do mês', v: 10000, color: '#22c55e' },
  { label: 'Despesas do mês', v: 5044.99, color: '#ef4444' },
  { label: 'Fatura do cartão', v: 1240, color: '#ef4444' },
  { label: 'Sobrou no mês', v: 4955.01, color: '#22c55e' },
];
const NumberCard: React.FC<{ label: string; v: number; color: string }> = ({ label, v, color }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 200, mass: 1 } });
  const pop = spring({ frame, fps, config: { damping: 12, mass: 0.6 } });
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ transform: `scale(${interpolate(pop, [0, 1], [0.6, 1])})`, textAlign: 'center' }}>
        <div style={{ color: BRAND.sub, fontFamily: BODY, fontSize: 40, marginBottom: 14 }}>{label}</div>
        <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 120, letterSpacing: -2, color }}>{brl(v * s)}</div>
      </div>
    </AbsoluteFill>
  );
};
const Numeros: React.FC = () => (
  <TransitionSeries>
    {NUMS.map((n, i) => (
      <React.Fragment key={i}>
        {i > 0 && <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 8 })} />}
        <TransitionSeries.Sequence durationInFrames={44}><NumberCard label={n.label} v={n.v} color={n.color} /></TransitionSeries.Sequence>
      </React.Fragment>
    ))}
  </TransitionSeries>
);

// ── 5. QUADRO 4 TELAS ──
const Quad: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const ph = Math.round(height * 0.44);
  const enter = spring({ frame, fps, config: { damping: 16 } });
  const cells = [SHOTS[0], SHOTS[1], SHOTS[3], SHOTS[5]];
  const pos = [{ x: 27, y: 28 }, { x: 73, y: 28 }, { x: 27, y: 72 }, { x: 73, y: 72 }];
  return (
    <AbsoluteFill>
      {cells.map((t, i) => {
        const float = Math.sin(frame / 30 + i * 1.5) * 8;
        const sc = interpolate(enter, [0, 1], [0.8, 1]);
        return (
          <div key={i} style={{ position: 'absolute', left: `${pos[i].x}%`, top: `${pos[i].y}%`, transform: `translate(-50%,-50%) translateY(${float}px) scale(${sc})`, opacity: enter }}>
            <Phone h={ph} trimBefore={t} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const wrap = (Inner: React.FC, bg = true) => {
  const C: React.FC = () => (bg ? <AbsoluteFill><Background /><Inner /></AbsoluteFill> : <Inner />);
  return C;
};

export const AppTourShort = wrap(Tour, false);
export const AppTourLong = wrap(Tour, false);
export const AppMosaicoShort = wrap(Mosaico);
export const AppMosaicoLong = wrap(Mosaico);
export const AppCarrosselShort = wrap(Carrossel);
export const AppCarrosselLong = wrap(Carrossel);
export const AppNumerosShort = wrap(Numeros);
export const AppNumerosLong = wrap(Numeros);
export const AppQuadShort = wrap(Quad);
export const AppQuadLong = wrap(Quad);
