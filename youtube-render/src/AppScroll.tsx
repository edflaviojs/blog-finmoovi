import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { Background } from './scenes';
import { Phone, Halo } from './AppBroll';
import { RoamingWatermark } from './broll/watermark';

// B-roll estilo SCROLL: usa um trecho da gravação em que a tela rola (o próprio
// footage já contém a rolagem). Sem inclinação, movimento mínimo — a rolagem é a
// estrela. `trimBefore` (frames) escolhe o trecho (ex.: 120 = dashboard rolando).

// Short (9:16): celular grande centralizado
export const AppScrollShort: React.FC<{ trimBefore?: number }> = ({ trimBefore = 120 }) => {
  const frame = useCurrentFrame();
  const zoom = interpolate(frame, [0, 360], [1.0, 1.02]); // respiro sutil
  return (
    <AbsoluteFill>
      <Background />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <Halo />
        <div style={{ transform: `scale(${zoom})` }}>
          <Phone h={1560} trimBefore={trimBefore} />
        </div>
      </AbsoluteFill>
      <RoamingWatermark />
    </AbsoluteFill>
  );
};

// Vídeo longo (16:9): celular em pé (sem inclinação) p/ a leitura da rolagem
export const AppScrollLong: React.FC<{ trimBefore?: number }> = ({ trimBefore = 120 }) => {
  const frame = useCurrentFrame();
  const zoom = interpolate(frame, [0, 360], [1.0, 1.03]);
  return (
    <AbsoluteFill>
      <Background />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <Halo />
        <div style={{ transform: `scale(${zoom})` }}>
          <Phone h={1000} trimBefore={trimBefore} />
        </div>
      </AbsoluteFill>
      <RoamingWatermark />
    </AbsoluteFill>
  );
};
