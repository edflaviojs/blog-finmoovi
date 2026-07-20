import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Background } from './scenes';
import { BRAND, DISPLAY, BODY, gradientText } from './theme';

// Estilo 3D "data-driven": recria os cards do app FinMoovi nativamente (dados
// reais) e os faz SALTAR em 3D (perspectiva + profundidade + float). Controle
// total, sem depender do vídeo achatado — e escala nítido em qualquer formato.

const card = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  background: 'linear-gradient(160deg, #1b2230, #12161f)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 28,
  boxShadow: '0 30px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(139,92,246,0.15)',
  fontFamily: BODY,
  color: BRAND.text,
  ...extra,
});

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

// Um card que "salta" em 3D: vem de longe (translateZ) girando, e flutua.
const Pop3D: React.FC<{ delay: number; rotY: number; children: React.ReactNode }> = ({ delay, rotY, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, delay, config: { damping: 14, mass: 0.8 } });
  const tz = interpolate(s, [0, 1], [-900, 0]);
  const op = interpolate(s, [0, 1], [0, 1]);
  const float = Math.sin((frame - delay) / 28) * 10;
  const ry = interpolate(s, [0, 1], [rotY - 25, rotY]) + Math.sin((frame - delay) / 45) * 2.5;
  return (
    <div style={{
      opacity: op,
      transform: `translateY(${float}px) translateZ(${tz}px) rotateY(${ry}deg) rotateX(5deg)`,
      transformStyle: 'preserve-3d',
    }}>
      {children}
    </div>
  );
};

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
  <AbsoluteFill><Background /><Scene3D /></AbsoluteFill>
);
export const Cards3DLong: React.FC = () => (
  <AbsoluteFill><Background /><Scene3D /></AbsoluteFill>
);
