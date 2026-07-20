import { AbsoluteFill, spring, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { Background } from './scenes';
import { BRAND, DISPLAY, BODY } from './theme';
import { RoamingWatermark } from './broll/watermark';
import { fluxo } from './broll/fluxo';
import { brl } from './broll/cartoes';

// Estilo NOVO da tela de Fluxo: BARRAS de Receitas × Despesas SUBINDO (verde vs
// vermelho) + o saldo do período contando. Reveal punchy que "explica" fluxo de
// caixa visualmente. Dados reais de ./broll/fluxo. Marca d'água passeando embutida.

const MAX = fluxo.receitasValue;   // escala das barras (a maior)
const BAR_MAX_H = 620;             // altura da barra cheia (px)

const Bar: React.FC<{ target: number; color: string; glow: string; label: string; delay: number }> = ({ target, color, glow, label, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const g = spring({ frame, fps, delay, config: { damping: 18, mass: 0.9 } });
  const h = interpolate(g, [0, 1], [0, (target / MAX) * BAR_MAX_H]);
  const val = target * g;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 210 }}>
      {/* valor no topo */}
      <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 40, color, marginBottom: 14 }}>{brl(val)}</div>
      {/* trilho + barra */}
      <div style={{ height: BAR_MAX_H, display: 'flex', alignItems: 'flex-end' }}>
        <div style={{
          width: 150, height: Math.max(6, h), borderRadius: 20,
          background: `linear-gradient(180deg, ${color}, ${glow})`,
          boxShadow: `0 0 40px ${color}66, inset 0 2px 0 rgba(255,255,255,0.25)`,
        }} />
      </div>
      <div style={{ marginTop: 20, fontFamily: BODY, fontWeight: 800, fontSize: 30, color: BRAND.text }}>{label}</div>
    </div>
  );
};

const Net: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const g = spring({ frame, fps, delay: 34, config: { damping: 200, mass: 1.2 } });
  const val = fluxo.liquidoValue * g;
  return (
    <div style={{ textAlign: 'center', marginTop: 40 }}>
      <div style={{ color: BRAND.sub, fontFamily: BODY, fontSize: 28 }}>Saldo do período</div>
      <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 76, letterSpacing: -1, color: '#22c55e' }}>{brl(val)}</div>
    </div>
  );
};

const Scene: React.FC = () => (
  <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
    <div style={{ textAlign: 'center', marginBottom: 26 }}>
      <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 46, ...({ color: BRAND.text }) }}>{fluxo.title}</div>
      <div style={{ color: BRAND.sub, fontFamily: BODY, fontSize: 28 }}>Julho 2026</div>
    </div>
    <div style={{ display: 'flex', gap: 90, alignItems: 'flex-end' }}>
      <Bar target={fluxo.receitasValue} color="#22c55e" glow="#15803d" label="Receitas" delay={4} />
      <Bar target={fluxo.despesasValue} color="#ef4444" glow="#991b1b" label="Despesas" delay={12} />
    </div>
    <Net />
  </AbsoluteFill>
);

export const FluxoBarrasShort: React.FC = () => (
  <AbsoluteFill><Background /><Scene /><RoamingWatermark /></AbsoluteFill>
);
export const FluxoBarrasLong: React.FC = () => (
  <AbsoluteFill><Background /><Scene /><RoamingWatermark /></AbsoluteFill>
);
