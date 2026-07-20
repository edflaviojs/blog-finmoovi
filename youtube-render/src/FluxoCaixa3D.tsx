import { AbsoluteFill } from 'remotion';
import { Background } from './scenes';
import { BRAND, DISPLAY, BODY } from './theme';
import { Pop3D, panel } from './broll/card3d-kit';
import { RoamingWatermark } from './broll/watermark';
import { fluxo } from './broll/fluxo';

// Estilo 3D "data-driven" (padrão Cards3D): recria a tela de FLUXO DE CAIXA do
// FinMoovi nativamente (dados reais em ./broll/fluxo) e faz os cards SALTAREM em
// 3D. Layout CENTRALIZADO. Helpers do kit compartilhado.

// Ícone de pulso (mesma vibe do ícone cyan da tela de Fluxo do app)
const PulseIcon: React.FC<{ size?: number }> = ({ size = 56 }) => (
  <div style={{ width: size, height: size, borderRadius: 16, background: 'linear-gradient(135deg, #22d3ee, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 100 100" fill="none">
      <path d="M6 54 H30 L42 24 L58 78 L70 54 H94" stroke="#fff" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </div>
);

// Card do topo: título + Saldo Atual grande
const HeaderCard: React.FC = () => (
  <div style={panel({ width: 640, padding: 36 })}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 20 }}>
      <PulseIcon />
      <div>
        <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 44, letterSpacing: -0.5 }}>{fluxo.title}</div>
        <div style={{ color: BRAND.sub, fontSize: 24 }}>{fluxo.subtitle}</div>
      </div>
    </div>
    <div style={{ color: BRAND.sub, fontSize: 26 }}>Saldo Atual</div>
    <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 78, letterSpacing: -1, color: BRAND.text }}>{fluxo.saldoAtual}</div>
  </div>
);

// Card de estatística (receitas/despesas)
const FlowStat: React.FC<{ label: string; value: string; color: string; arrow: string }> = ({ label, value, color, arrow }) => (
  <div style={panel({ width: 308, padding: '24px 28px' })}>
    <div style={{ color: BRAND.sub, fontSize: 24, marginBottom: 6 }}>{label}</div>
    <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 40, color }}>{arrow} {value}</div>
  </div>
);

const Scene3D: React.FC = () => (
  <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', perspective: 1600 }}>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, transformStyle: 'preserve-3d' }}>
      <Pop3D delay={0} rotY={-7}><HeaderCard /></Pop3D>
      <Pop3D delay={12} rotY={9}>
        <div style={{ display: 'flex', gap: 24, transformStyle: 'preserve-3d' }}>
          <FlowStat label="Receitas do período" value={fluxo.receitas} color="#22c55e" arrow="▲" />
          <FlowStat label="Despesas do período" value={fluxo.despesas} color="#ef4444" arrow="▼" />
        </div>
      </Pop3D>
      <Pop3D delay={20} rotY={-9}>
        <div style={panel({ width: 640, padding: '24px 34px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' })}>
          <div style={{ color: BRAND.sub, fontSize: 26, fontFamily: BODY }}>Saldo Projetado</div>
          <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 48, color: '#22c55e' }}>{fluxo.saldoProjetado}</div>
        </div>
      </Pop3D>
    </div>
  </AbsoluteFill>
);

export const FluxoCaixa3DShort: React.FC = () => (
  <AbsoluteFill><Background /><Scene3D /><RoamingWatermark /></AbsoluteFill>
);
export const FluxoCaixa3DLong: React.FC = () => (
  <AbsoluteFill><Background /><Scene3D /><RoamingWatermark /></AbsoluteFill>
);
