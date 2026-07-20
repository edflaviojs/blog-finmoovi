import { AbsoluteFill, spring, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { Background } from './scenes';
import { BRAND, DISPLAY, BODY } from './theme';
import { RoamingWatermark } from './broll/watermark';
import { extrato } from './broll/extrato';
import { brl } from './broll/cartoes';

// Estilo NOVO da tela de Extrato: os lançamentos ENTRAM UM A UM (deslizando) e o
// SALDO vai CORRENDO até o total real. Reveal limpo e ritmado. Dados de ./broll/extrato.

const Row: React.FC<{ nome: string; cat: string; valor: string; tipo: 'in' | 'out'; delay: number }> = ({ nome, cat, valor, tipo, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, delay, config: { damping: 16, mass: 0.7 } });
  const x = interpolate(s, [0, 1], [90, 0]);
  const op = interpolate(s, [0, 1], [0, 1]);
  return (
    <div style={{
      opacity: op, transform: `translateX(${x}px)`,
      width: 760, padding: '22px 30px', borderRadius: 20,
      background: 'linear-gradient(160deg, #1b2230, #12161f)',
      border: '1px solid rgba(255,255,255,0.08)',
      display: 'flex', alignItems: 'center', gap: 20,
    }}>
      <div style={{ width: 46, height: 46, borderRadius: 12, background: tipo === 'in' ? 'rgba(34,197,94,0.16)' : 'rgba(239,68,68,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, color: tipo === 'in' ? '#22c55e' : '#ef4444', fontWeight: 900 }}>{tipo === 'in' ? '▲' : '▼'}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 32, color: BRAND.text }}>{nome}</div>
        <div style={{ color: BRAND.sub, fontFamily: BODY, fontSize: 24 }}>{cat}</div>
      </div>
      <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 36, color: tipo === 'in' ? '#22c55e' : '#ef4444' }}>{valor}</div>
    </div>
  );
};

const SaldoCorrendo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, delay: 6, config: { damping: 200, mass: 1.2 } });
  const val = extrato.saldoAtualValue * s;
  return (
    <div style={{ textAlign: 'center', marginBottom: 30 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'center' }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: extrato.contaCor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: DISPLAY, fontWeight: 900, fontSize: 24, color: '#fff' }}>{extrato.contaIniciais}</div>
        <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 44, color: BRAND.text }}>{extrato.conta}</div>
      </div>
      <div style={{ color: BRAND.sub, fontFamily: BODY, fontSize: 28, marginTop: 14 }}>Saldo Atual</div>
      <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 84, letterSpacing: -1, color: BRAND.text }}>{brl(val)}</div>
    </div>
  );
};

const Scene: React.FC = () => (
  <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
    <SaldoCorrendo />
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {extrato.transacoes.map((t, i) => (
        <Row key={i} nome={t.nome} cat={t.cat} valor={t.valor} tipo={t.tipo} delay={18 + i * 12} />
      ))}
    </div>
  </AbsoluteFill>
);

export const ExtratoListaShort: React.FC = () => (
  <AbsoluteFill><Background /><Scene /><RoamingWatermark /></AbsoluteFill>
);
export const ExtratoListaLong: React.FC = () => (
  <AbsoluteFill><Background /><Scene /><RoamingWatermark /></AbsoluteFill>
);
