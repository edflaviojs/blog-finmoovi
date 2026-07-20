import { AbsoluteFill } from 'remotion';
import { Background } from './scenes';
import { BRAND, DISPLAY, BODY } from './theme';
import { Pop3D } from './broll/card3d-kit';
import { RoamingWatermark } from './broll/watermark';
import { balanco } from './broll/balanco';

// Estilo 3D "data-driven" (padrão Cards3D): recria a tela de BALANÇO MENSAL do
// FinMoovi nativamente (cards coloridos: receitas/despesas/saldo/contas) que
// SALTAM em 3D. Layout CENTRALIZADO.

// Card colorido no estilo dos blocos do Balanço do app
const ColorCard: React.FC<{ label: string; sub: string; value: string; from: string; to: string; icon: string }> = ({ label, sub, value, from, to, icon }) => (
  <div style={{
    width: 660, padding: '26px 34px', borderRadius: 24,
    background: `linear-gradient(120deg, ${from}, ${to})`,
    border: '1px solid rgba(255,255,255,0.14)',
    boxShadow: `0 30px 80px ${from}55, 0 0 0 1px rgba(255,255,255,0.06)`,
    fontFamily: BODY, color: '#fff', display: 'flex', alignItems: 'center', gap: 22,
  }}>
    <div style={{ width: 58, height: 58, borderRadius: 16, background: 'rgba(0,0,0,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30 }}>{icon}</div>
    <div style={{ flex: 1 }}>
      <div style={{ fontWeight: 800, fontSize: 30 }}>{label}</div>
      <div style={{ opacity: 0.82, fontSize: 22 }}>{sub}</div>
    </div>
    <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 52, letterSpacing: -0.5 }}>{value}</div>
  </div>
);

const Scene3D: React.FC = () => (
  <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', perspective: 1600 }}>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, transformStyle: 'preserve-3d' }}>
      <div style={{ textAlign: 'center', marginBottom: 6 }}>
        <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 46, color: BRAND.text }}>Balanço Mensal</div>
        <div style={{ color: BRAND.sub, fontFamily: BODY, fontSize: 28 }}>{balanco.mes}</div>
      </div>
      <Pop3D delay={0} rotY={-6}><ColorCard label="Total de Receitas" sub="Todas as fontes" value={balanco.totalReceitas} from="#16a34a" to="#22c55e" icon="↗" /></Pop3D>
      <Pop3D delay={9} rotY={8}><ColorCard label="Total de Despesas" sub="Todos os gastos" value={balanco.totalDespesas} from="#b91c1c" to="#ef4444" icon="↘" /></Pop3D>
      <Pop3D delay={17} rotY={-8}><ColorCard label="Saldo Final" sub="Economia positiva" value={balanco.saldoFinal} from="#1d4ed8" to="#3b82f6" icon="$" /></Pop3D>
      <Pop3D delay={25} rotY={7}><ColorCard label="Saldo em Contas" sub="3 contas ativas" value={balanco.saldoContas} from="#7c3aed" to="#a855f7" icon="▤" /></Pop3D>
    </div>
  </AbsoluteFill>
);

export const Balanco3DShort: React.FC = () => (
  <AbsoluteFill><Background /><Scene3D /><RoamingWatermark /></AbsoluteFill>
);
export const Balanco3DLong: React.FC = () => (
  <AbsoluteFill><Background /><Scene3D /><RoamingWatermark /></AbsoluteFill>
);
