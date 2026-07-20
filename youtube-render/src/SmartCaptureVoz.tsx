import { AbsoluteFill, spring, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { Background } from './scenes';
import { BRAND, DISPLAY, BODY } from './theme';
import { RoamingWatermark } from './broll/watermark';
import { smartCapture } from './broll/smartcapture';

// Estilo NOVO do Smart Capture: fluxo de CAPTURA POR VOZ — microfone pulsando +
// ondas de áudio + a fala reconhecida → card "Despesa criada!". Mostra a mágica
// do Smart Capture (falar vira lançamento).

const VIOLET = '#8b5cf6';

const Waveform: React.FC = () => {
  const frame = useCurrentFrame();
  const bars = new Array(23).fill(0);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 90 }}>
      {bars.map((_, i) => {
        const h = 16 + Math.abs(Math.sin(frame / 6 + i * 0.6)) * 70;
        return <div key={i} style={{ width: 8, height: h, borderRadius: 4, background: `linear-gradient(180deg, ${BRAND.cyan}, ${VIOLET})` }} />;
      })}
    </div>
  );
};

const Mic: React.FC = () => {
  const frame = useCurrentFrame();
  const pulse = 1 + Math.sin(frame / 8) * 0.06;
  const ring = (interpolate(frame % 40, [0, 40], [1, 1.7]));
  const ringOp = interpolate(frame % 40, [0, 40], [0.4, 0]);
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 200, height: 200 }}>
      <div style={{ position: 'absolute', width: 160, height: 160, borderRadius: '50%', border: `4px solid ${VIOLET}`, transform: `scale(${ring})`, opacity: ringOp }} />
      <div style={{ width: 160, height: 160, borderRadius: '50%', background: `linear-gradient(135deg, ${VIOLET}, #6d28d9)`, transform: `scale(${pulse})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 76, boxShadow: `0 0 60px ${VIOLET}88` }}>🎤</div>
    </div>
  );
};

const Result: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, delay: fps * 2.6, config: { damping: 14, mass: 0.8 } });
  const y = interpolate(s, [0, 1], [60, 0]);
  return (
    <div style={{
      opacity: s, transform: `translateY(${y}px) scale(${interpolate(s, [0, 1], [0.85, 1])})`,
      marginTop: 40, width: 640, padding: '26px 34px', borderRadius: 24,
      background: 'linear-gradient(160deg, #16251c, #101a15)', border: '1px solid rgba(34,197,94,0.3)',
      display: 'flex', alignItems: 'center', gap: 22, fontFamily: BODY,
    }}>
      <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, color: '#fff', fontWeight: 900 }}>✓</div>
      <div style={{ flex: 1 }}>
        <div style={{ color: '#22c55e', fontFamily: DISPLAY, fontWeight: 800, fontSize: 30 }}>Despesa criada!</div>
        <div style={{ color: BRAND.sub, fontSize: 24 }}>Almoço • Alimentação</div>
      </div>
      <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 46, color: BRAND.text }}>{smartCapture.vozResultado}</div>
    </div>
  );
};

const Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const falaOp = interpolate(frame, [20, 40], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 46, color: BRAND.text, marginBottom: 8 }}>Capturar por voz</div>
      <div style={{ color: BRAND.sub, fontFamily: BODY, fontSize: 28, marginBottom: 30 }}>{smartCapture.titulo}</div>
      <Mic />
      <div style={{ marginTop: 24 }}><Waveform /></div>
      <div style={{ opacity: falaOp, marginTop: 24, fontFamily: DISPLAY, fontWeight: 800, fontSize: 44, color: VIOLET }}>{smartCapture.vozFala}</div>
      <Result />
    </AbsoluteFill>
  );
};

export const SmartCaptureVozShort: React.FC = () => (
  <AbsoluteFill><Background /><Scene /><RoamingWatermark /></AbsoluteFill>
);
export const SmartCaptureVozLong: React.FC = () => (
  <AbsoluteFill><Background /><Scene /><RoamingWatermark /></AbsoluteFill>
);
