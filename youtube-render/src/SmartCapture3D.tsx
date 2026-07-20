import { AbsoluteFill } from 'remotion';
import { Background } from './scenes';
import { BRAND, DISPLAY, BODY } from './theme';
import { Pop3D } from './broll/card3d-kit';
import { RoamingWatermark } from './broll/watermark';
import { smartCapture } from './broll/smartcapture';

// Estilo 3D "data-driven": recria o menu SMART CAPTURE (FinMoovi Quick) — os 4
// modos de captura (Texto/Voz/Imagem/Compras) em tiles que SALTAM em 3D.

const Tile: React.FC<{ nome: string; desc: string; cor: string; icon: string }> = ({ nome, desc, cor, icon }) => (
  <div style={{
    width: 300, height: 240, borderRadius: 26, padding: 26,
    background: `linear-gradient(150deg, ${cor}, ${cor}bb)`,
    border: '1px solid rgba(255,255,255,0.16)',
    boxShadow: `0 26px 70px ${cor}55, 0 0 0 1px rgba(255,255,255,0.06)`,
    fontFamily: BODY, color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
  }}>
    <div style={{ width: 78, height: 78, borderRadius: 20, background: 'rgba(0,0,0,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 42, fontFamily: DISPLAY, fontWeight: 900 }}>{icon}</div>
    <div>
      <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 40 }}>{nome}</div>
      <div style={{ opacity: 0.9, fontSize: 24 }}>{desc}</div>
    </div>
  </div>
);

const Scene3D: React.FC = () => (
  <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', perspective: 1600 }}>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 34, transformStyle: 'preserve-3d' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 54, color: BRAND.text }}>{smartCapture.titulo}</div>
        <div style={{ color: BRAND.sub, fontFamily: BODY, fontSize: 28 }}>{smartCapture.subtitulo}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '300px 300px', gap: 28, transformStyle: 'preserve-3d' }}>
        {smartCapture.modos.map((m, i) => (
          <Pop3D key={i} delay={i * 7} rotY={i % 2 === 0 ? 7 : -7}>
            <Tile nome={m.nome} desc={m.desc} cor={m.cor} icon={m.icon} />
          </Pop3D>
        ))}
      </div>
    </div>
  </AbsoluteFill>
);

export const SmartCapture3DShort: React.FC = () => (
  <AbsoluteFill><Background /><Scene3D /><RoamingWatermark /></AbsoluteFill>
);
export const SmartCapture3DLong: React.FC = () => (
  <AbsoluteFill><Background /><Scene3D /><RoamingWatermark /></AbsoluteFill>
);
