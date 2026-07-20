import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { Background } from './scenes';
import { Phone, Halo } from './AppBroll';
import { RoamingWatermark } from './broll/watermark';

// Estilo 3D com a TELA ORIGINAL do app (o vídeo real): o celular flutua no
// espaço e gira suavemente em 3D (rotateY/rotateX), com entrada em profundidade
// e brilho da marca. Complementa o estilo 3D "cards recriados".

const Rotating: React.FC<{ h: number; trimBefore: number; amp?: number }> = ({ h, trimBefore, amp = 15 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 16, mass: 0.9 } });
  const tz = interpolate(enter, [0, 1], [-750, 0]);
  const scaleIn = interpolate(enter, [0, 1], [0.8, 1]);
  const ry = Math.sin(frame / 50) * amp;             // gira suave
  const rx = 6 + Math.sin(frame / 70) * 2;
  const float = Math.sin(frame / 30) * 12;
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', perspective: 1700 }}>
      <Halo />
      <div style={{
        transformStyle: 'preserve-3d',
        transform: `translateY(${float}px) translateZ(${tz}px) scale(${scaleIn}) rotateY(${ry}deg) rotateX(${rx}deg)`,
      }}>
        <Phone h={h} trimBefore={trimBefore} />
      </div>
    </AbsoluteFill>
  );
};

export const AppScreen3DShort: React.FC<{ trimBefore?: number }> = ({ trimBefore = 150 }) => (
  <AbsoluteFill><Background /><Rotating h={1360} trimBefore={trimBefore} amp={13} /><RoamingWatermark /></AbsoluteFill>
);

export const AppScreen3DLong: React.FC<{ trimBefore?: number }> = ({ trimBefore = 150 }) => (
  <AbsoluteFill><Background /><Rotating h={900} trimBefore={trimBefore} amp={16} /><RoamingWatermark /></AbsoluteFill>
);
