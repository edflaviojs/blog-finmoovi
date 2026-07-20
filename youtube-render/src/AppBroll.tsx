import { AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame, interpolate } from 'remotion';
import { Background, Watermark } from './scenes';
import { BRAND } from './theme';

// B-roll do APP FinMoovi: a gravação real (formato de celular ~624×914) montada
// numa moldura de celular flutuante com brilho da marca. Serve pros dois formatos.
// `trimBefore` (frames) escolhe o trecho da gravação (30fps).

const REC_W = 624, REC_H = 914; // dimensões da gravação

export const Phone: React.FC<{ h: number; trimBefore: number }> = ({ h, trimBefore }) => {
  const w = Math.round((h * REC_W) / REC_H);
  return (
    <div style={{
      width: w, height: h, borderRadius: 46, padding: 12, background: '#05070a',
      boxShadow: '0 45px 130px rgba(139,92,246,0.5), 0 0 0 2px rgba(255,255,255,0.06), inset 0 0 0 2px rgba(255,255,255,0.03)',
    }}>
      <div style={{ width: '100%', height: '100%', borderRadius: 34, overflow: 'hidden', background: '#000' }}>
        <OffthreadVideo
          src={staticFile('app-rec.mp4')}
          trimBefore={trimBefore}
          muted
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
    </div>
  );
};

// Brilho radial atrás do celular
export const Halo: React.FC = () => (
  <div style={{
    position: 'absolute', width: 900, height: 900, borderRadius: '50%',
    background: `radial-gradient(circle, ${BRAND.violet}55 0%, transparent 60%)`, filter: 'blur(40px)',
  }} />
);

// Vídeo longo (16:9): celular flutuante levemente inclinado + zoom lento
export const AppBrollLong: React.FC<{ trimBefore?: number }> = ({ trimBefore = 150 }) => {
  const frame = useCurrentFrame();
  const zoom = interpolate(frame, [0, 240], [1.0, 1.06]);
  const float = Math.sin(frame / 30) * 10;
  return (
    <AbsoluteFill>
      <Background />
      <Watermark />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <Halo />
        <div style={{ transform: `translateY(${float}px) scale(${zoom}) rotate(-4deg)` }}>
          <Phone h={920} trimBefore={trimBefore} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// Short (9:16): celular grande centralizado, zoom lento
export const AppBrollShort: React.FC<{ trimBefore?: number }> = ({ trimBefore = 150 }) => {
  const frame = useCurrentFrame();
  const zoom = interpolate(frame, [0, 240], [1.0, 1.05]);
  const float = Math.sin(frame / 30) * 8;
  return (
    <AbsoluteFill>
      <Background />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <Halo />
        <div style={{ transform: `translateY(${float}px) scale(${zoom})` }}>
          <Phone h={1480} trimBefore={trimBefore} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
