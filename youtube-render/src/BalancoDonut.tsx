import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Background } from './scenes';
import { BRAND, DISPLAY, BODY } from './theme';
import { RoamingWatermark } from './broll/watermark';
import { balanco } from './broll/balanco';

// Estilo NOVO da tela de Balanço: ROSCA (donut) das Maiores Despesas por
// categoria, com os segmentos desenhando um a um + total no centro + legenda.
// Dados reais de ./broll/balanco.

const R = 210, STROKE = 62, CX = 260, CY = 260;
const C = 2 * Math.PI * R;

const Segment: React.FC<{ startPct: number; pct: number; cor: string; delay: number }> = ({ startPct, pct, cor, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const g = spring({ frame, fps, delay, config: { damping: 18, mass: 0.8 } });
  const arc = (pct / 100) * C * g;                  // comprimento visível (anima)
  const rot = (startPct / 100) * 360 - 90;          // início no topo
  return (
    <circle
      cx={CX} cy={CY} r={R} fill="none" stroke={cor} strokeWidth={STROKE}
      strokeDasharray={`${arc} ${C}`}
      transform={`rotate(${rot} ${CX} ${CY})`}
      strokeLinecap="butt"
    />
  );
};

const Donut: React.FC = () => {
  let cum = 0;
  return (
    <svg width={520} height={520} viewBox="0 0 520 520">
      {balanco.categorias.map((c, i) => {
        const seg = <Segment key={i} startPct={cum} pct={c.pct} cor={c.cor} delay={i * 5} />;
        cum += c.pct;
        return seg;
      })}
      <text x={CX} y={CY - 14} textAnchor="middle" fill={BRAND.sub} fontFamily={BODY} fontSize={30}>Despesas</text>
      <text x={CX} y={CY + 44} textAnchor="middle" fill={BRAND.text} fontFamily={DISPLAY} fontWeight={900} fontSize={58}>{balanco.totalDespesas}</text>
    </svg>
  );
};

const Legend: React.FC = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 20 }}>
    {balanco.categorias.filter((c) => c.nome !== 'Outros').map((c, i) => (
      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, width: 640, fontFamily: BODY }}>
        <div style={{ width: 22, height: 22, borderRadius: 6, background: c.cor }} />
        <div style={{ flex: 1, fontSize: 30, fontWeight: 700, color: BRAND.text }}>{c.nome}</div>
        <div style={{ fontSize: 28, color: BRAND.sub, marginRight: 18 }}>{c.pct}%</div>
        <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 30, color: '#ef4444' }}>{c.valor}</div>
      </div>
    ))}
  </div>
);

const Scene: React.FC = () => (
  <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
    <div style={{ textAlign: 'center', marginBottom: 10 }}>
      <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 46, color: BRAND.text }}>Maiores Despesas</div>
      <div style={{ color: BRAND.sub, fontFamily: BODY, fontSize: 28 }}>Balanço · {balanco.mes}</div>
    </div>
    <Donut />
    <Legend />
  </AbsoluteFill>
);

export const BalancoDonutShort: React.FC = () => (
  <AbsoluteFill><Background /><Scene /><RoamingWatermark /></AbsoluteFill>
);
export const BalancoDonutLong: React.FC = () => (
  <AbsoluteFill><Background /><Scene /><RoamingWatermark /></AbsoluteFill>
);
