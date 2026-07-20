import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { BRAND, BODY } from '../theme';

// KIT compartilhado dos estilos 3D nativos (Cartões, Fluxo, Extrato, Balanço…).
// Extraído do padrão Cards3D.tsx p/ evitar copy-paste e manter consistência.

// Painel base dos cards (fundo, borda, sombra, tipografia da marca).
export const panel = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  background: 'linear-gradient(160deg, #1b2230, #12161f)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 28,
  boxShadow: '0 30px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(139,92,246,0.15)',
  fontFamily: BODY,
  color: BRAND.text,
  ...extra,
});

// Card que "salta" em 3D: vem de longe (translateZ) girando, e flutua suave.
export const Pop3D: React.FC<{ delay: number; rotY: number; children: React.ReactNode }> = ({ delay, rotY, children }) => {
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
