import { AbsoluteFill } from 'remotion';
import { Background } from './scenes';
import { BRAND, DISPLAY, BODY } from './theme';
import { Pop3D, panel } from './broll/card3d-kit';
import { RoamingWatermark } from './broll/watermark';
import { extrato } from './broll/extrato';

// Estilo 3D "data-driven" (padrão Cards3D): recria a tela de EXTRATO (Nubank
// conciliado) nativamente e faz os cards SALTAREM em 3D. Layout CENTRALIZADO.

// Header roxo do Nubank com saldo
const HeaderCard: React.FC = () => (
  <div style={{
    width: 660, padding: 34, borderRadius: 28,
    background: `linear-gradient(135deg, ${extrato.contaCor}, #4a0a7a)`,
    border: '1px solid rgba(255,255,255,0.14)',
    boxShadow: '0 34px 90px rgba(130,10,209,0.45), 0 0 0 1px rgba(255,255,255,0.06)',
    fontFamily: BODY, color: '#fff', display: 'flex', alignItems: 'center', gap: 22,
  }}>
    <div style={{ width: 72, height: 72, borderRadius: 18, background: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 30 }}>{extrato.contaIniciais}</div>
    <div style={{ flex: 1 }}>
      <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 40 }}>{extrato.conta}</div>
      <div style={{ opacity: 0.85, fontSize: 24 }}>Saldo Atual</div>
    </div>
    <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 52 }}>{extrato.saldoAtual}</div>
  </div>
);

// Card de transação
const TxCard: React.FC<{ nome: string; cat: string; valor: string; tipo: 'in' | 'out' }> = ({ nome, cat, valor, tipo }) => (
  <div style={panel({ width: 660, padding: '22px 30px', display: 'flex', alignItems: 'center', gap: 20 })}>
    <div style={{ width: 46, height: 46, borderRadius: 12, background: tipo === 'in' ? 'rgba(34,197,94,0.16)' : 'rgba(239,68,68,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, color: tipo === 'in' ? '#22c55e' : '#ef4444', fontWeight: 900 }}>{tipo === 'in' ? '▲' : '▼'}</div>
    <div style={{ flex: 1 }}>
      <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 32, color: BRAND.text }}>{nome}</div>
      <div style={{ color: BRAND.sub, fontSize: 24 }}>{cat}</div>
    </div>
    <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 36, color: tipo === 'in' ? '#22c55e' : '#ef4444' }}>{valor}</div>
  </div>
);

const Scene3D: React.FC = () => (
  <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', perspective: 1600 }}>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, transformStyle: 'preserve-3d' }}>
      <Pop3D delay={0} rotY={-6}><HeaderCard /></Pop3D>
      {extrato.transacoes.map((t, i) => (
        <Pop3D key={i} delay={10 + i * 7} rotY={i % 2 === 0 ? 8 : -8}>
          <TxCard nome={t.nome} cat={t.cat} valor={t.valor} tipo={t.tipo} />
        </Pop3D>
      ))}
    </div>
  </AbsoluteFill>
);

export const Extrato3DShort: React.FC = () => (
  <AbsoluteFill><Background /><Scene3D /><RoamingWatermark /></AbsoluteFill>
);
export const Extrato3DLong: React.FC = () => (
  <AbsoluteFill><Background /><Scene3D /><RoamingWatermark /></AbsoluteFill>
);
