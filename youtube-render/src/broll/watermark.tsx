import { useCurrentFrame, useVideoConfig } from 'remotion';
import { BRAND, DISPLAY, gradientText } from '../theme';
import { FinMooviIcon } from '../icon';

// Marca d'água do b-roll. A "plaquinha" de vidro fosco (premium) é o lockup padrão.
// RoamingWatermark = a plaquinha PEQUENA passeando devagar pela tela (resolve o
// problema do "canto limpo" e é mais difícil de recortar). BrollWatermark = versão
// fixa num canto (fallback/uso pontual).

// Lockup visual reutilizado (ícone + wordmark FinMoovi na plaquinha de vidro).
const PillLockup: React.FC<{ scale?: number }> = ({ scale = 1 }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 12 * scale,
    padding: `${13 * scale}px ${22 * scale}px ${13 * scale}px ${16 * scale}px`, borderRadius: 999,
    background: 'rgba(13,17,23,0.42)',
    backdropFilter: 'blur(9px)', WebkitBackdropFilter: 'blur(9px)',
    border: '1px solid rgba(255,255,255,0.14)',
    boxShadow: '0 10px 34px rgba(0,0,0,0.4), 0 0 22px rgba(139,92,246,0.28)',
  }}>
    <FinMooviIcon size={34 * scale} idSuffix="wm-pill" />
    <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 30 * scale, letterSpacing: -0.5, lineHeight: 1 }}>
      <span style={{ color: BRAND.text }}>Fin</span>
      <span style={gradientText}>Moovi</span>
    </div>
  </div>
);

// PASSEANDO: a plaquinha pequena flutua devagar pela tela toda, em vários sentidos
// (trajetória suave tipo Lissajous — X e Y com frequências diferentes). Nunca sai
// da tela. Elegante e discreta; sempre visível; sem canto fixo.
export const RoamingWatermark: React.FC<{ scale?: number }> = ({ scale = 0.82 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const wmW = 250 * scale, wmH = 66 * scale, margin = 44;
  const rangeX = Math.max(0, width - wmW - margin * 2);
  const rangeY = Math.max(0, height - wmH - margin * 2);
  // frequências lentas e diferentes → passeia sem repetir cedo (mais lento p/ elegância)
  const px = margin + (0.5 + 0.5 * Math.sin(frame / 165)) * rangeX;
  const py = margin + (0.5 + 0.5 * Math.sin(frame / 108 + 1.3)) * rangeY;
  return (
    <div style={{ position: 'absolute', left: px, top: py, opacity: 0.9 }}>
      <PillLockup scale={scale} />
    </div>
  );
};

// FIXA num canto (fallback). Mantida caso seja útil em algum layout específico.
type Corner = 'br' | 'bl' | 'tr' | 'tl';
export const BrollWatermark: React.FC<{ corner?: Corner }> = ({ corner = 'br' }) => {
  const frame = useCurrentFrame();
  const float = Math.sin(frame / 26) * 3;
  const pos: React.CSSProperties =
    corner === 'br' ? { bottom: 52, right: 52 } :
    corner === 'bl' ? { bottom: 52, left: 52 } :
    corner === 'tr' ? { top: 52, right: 52 } : { top: 52, left: 52 };
  return (
    <div style={{ position: 'absolute', ...pos, transform: `translateY(${float}px)`, opacity: 0.94 }}>
      <PillLockup />
    </div>
  );
};
