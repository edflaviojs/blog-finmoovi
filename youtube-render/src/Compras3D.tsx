import { AbsoluteFill } from 'remotion';
import { Background } from './scenes';
import { BRAND, DISPLAY, BODY } from './theme';
import { Pop3D, panel } from './broll/card3d-kit';
import { RoamingWatermark } from './broll/watermark';
import { compras } from './broll/compras';

// Estilo 3D "data-driven" (padrão Cards3D): recria a tela de MODO COMPRAS do
// FinMoovi nativamente (carrinho + itens) que SALTAM em 3D. Layout CENTRALIZADO.

// Header verde do carrinho com total
const HeaderCard: React.FC = () => (
  <div style={{
    width: 660, padding: '26px 34px', borderRadius: 24,
    background: 'linear-gradient(120deg, #16a34a, #22c55e)',
    border: '1px solid rgba(255,255,255,0.14)',
    boxShadow: '0 30px 80px rgba(34,197,94,0.4), 0 0 0 1px rgba(255,255,255,0.06)',
    fontFamily: BODY, color: '#fff', display: 'flex', alignItems: 'center', gap: 22,
  }}>
    <div style={{ width: 62, height: 62, borderRadius: 16, background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>🛒</div>
    <div style={{ flex: 1 }}>
      <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 38 }}>{compras.titulo}</div>
      <div style={{ opacity: 0.85, fontSize: 24 }}>{compras.itens.length} itens no carrinho</div>
    </div>
    <div style={{ textAlign: 'right' }}>
      <div style={{ opacity: 0.85, fontSize: 22 }}>Total</div>
      <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 50 }}>{compras.total}</div>
    </div>
  </div>
);

// Card de item do carrinho
const ItemCard: React.FC<{ nome: string; qtd: string; unidade: string; valor: string }> = ({ nome, qtd, unidade, valor }) => (
  <div style={panel({ width: 660, padding: '22px 30px', display: 'flex', alignItems: 'center', gap: 20 })}>
    <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'rgba(34,197,94,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#22c55e', fontWeight: 900 }}>✓</div>
    <div style={{ flex: 1 }}>
      <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 32, color: BRAND.text }}>{nome}</div>
      <div style={{ color: BRAND.sub, fontSize: 22 }}>{qtd} • {unidade}</div>
    </div>
    <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 36, color: '#22c55e' }}>{valor}</div>
  </div>
);

const Scene3D: React.FC = () => (
  <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', perspective: 1600 }}>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, transformStyle: 'preserve-3d' }}>
      <Pop3D delay={0} rotY={-6}><HeaderCard /></Pop3D>
      {compras.itens.map((it, i) => (
        <Pop3D key={i} delay={10 + i * 8} rotY={i % 2 === 0 ? 8 : -8}>
          <ItemCard nome={it.nome} qtd={it.qtd} unidade={it.unidade} valor={it.valor} />
        </Pop3D>
      ))}
    </div>
  </AbsoluteFill>
);

export const Compras3DShort: React.FC = () => (
  <AbsoluteFill><Background /><Scene3D /><RoamingWatermark /></AbsoluteFill>
);
export const Compras3DLong: React.FC = () => (
  <AbsoluteFill><Background /><Scene3D /><RoamingWatermark /></AbsoluteFill>
);
