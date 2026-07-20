import { AbsoluteFill } from 'remotion';
import { Background } from './scenes';
import { BRAND, DISPLAY } from './theme';
import { Pop3D, panel as card } from './broll/card3d-kit';
import { RoamingWatermark } from './broll/watermark';

// Estilo 3D "data-driven": recria os cards do app FinMoovi nativamente (dados
// reais) e os faz SALTAR em 3D (perspectiva + profundidade + float). Controle
// total, sem depender do vídeo achatado — e escala nítido em qualquer formato.
// Helpers Pop3D/card(panel) vêm do kit compartilhado ./broll/card3d-kit.

// Card grande do saldo
const BalanceCard: React.FC = () => (
  <div style={card({ width: 640, padding: 40 })}>
    <div style={{ color: BRAND.sub, fontSize: 30, marginBottom: 8 }}>Saldo Atual das Contas</div>
    <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 76, letterSpacing: -1 }}>R$ 6.604,93</div>
    <div style={{ display: 'flex', gap: 22, marginTop: 26 }}>
      <div style={{ flex: 1, background: 'rgba(34,197,94,0.12)', borderRadius: 18, padding: '16px 20px' }}>
        <div style={{ color: '#22c55e', fontWeight: 800, fontSize: 34 }}>▲ R$ 10.000</div>
        <div style={{ color: BRAND.sub, fontSize: 24 }}>Receitas</div>
      </div>
      <div style={{ flex: 1, background: 'rgba(239,68,68,0.12)', borderRadius: 18, padding: '16px 20px' }}>
        <div style={{ color: '#ef4444', fontWeight: 800, fontSize: 34 }}>▼ R$ 5.044</div>
        <div style={{ color: BRAND.sub, fontSize: 24 }}>Despesas</div>
      </div>
    </div>
  </div>
);

const AccountCard: React.FC<{ name: string; value: string; color: string; initials: string }> = ({ name, value, color, initials }) => (
  <div style={card({ width: 460, padding: '24px 28px', display: 'flex', alignItems: 'center', gap: 20 })}>
    <div style={{ width: 60, height: 60, borderRadius: 16, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 26, color: '#fff' }}>{initials}</div>
    <div style={{ flex: 1 }}>
      <div style={{ fontWeight: 800, fontSize: 32 }}>{name}</div>
      <div style={{ color: '#22c55e', fontWeight: 800, fontSize: 30 }}>{value}</div>
    </div>
  </div>
);

const Scene3D: React.FC = () => (
  <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', perspective: 1600 }}>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26, transformStyle: 'preserve-3d' }}>
      <Pop3D delay={0} rotY={-6}><BalanceCard /></Pop3D>
      <Pop3D delay={10} rotY={9}><AccountCard name="Nubank" value="R$ 3.754,91" color="#820ad1" initials="nu" /></Pop3D>
      <Pop3D delay={18} rotY={-11}><AccountCard name="Banco do Brasil" value="R$ 2.000,00" color="#f9dd16" initials="BB" /></Pop3D>
      <Pop3D delay={26} rotY={12}><AccountCard name="Carteira" value="R$ 850,02" color="#334155" initials="₩" /></Pop3D>
    </div>
  </AbsoluteFill>
);

export const Cards3DShort: React.FC = () => (
  <AbsoluteFill><Background /><Scene3D /><RoamingWatermark /></AbsoluteFill>
);
export const Cards3DLong: React.FC = () => (
  <AbsoluteFill><Background /><Scene3D /><RoamingWatermark /></AbsoluteFill>
);
