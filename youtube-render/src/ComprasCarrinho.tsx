import { AbsoluteFill, spring, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { Background } from './scenes';
import { BRAND, DISPLAY, BODY } from './theme';
import { RoamingWatermark } from './broll/watermark';
import { compras } from './broll/compras';
import { brl } from './broll/cartoes';

// Estilo NOVO da tela de Compras: os itens ENTRAM NO CARRINHO um a um (deslizando)
// e o TOTAL vai SUBINDO conforme cada item entra + barra de progresso enchendo.
// Dados reais de ./broll/compras.

const ROW_DELAY = 16; // atraso base entre itens

const Item: React.FC<{ nome: string; qtd: string; valor: string; delay: number }> = ({ nome, qtd, valor, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, delay, config: { damping: 16, mass: 0.7 } });
  const x = interpolate(s, [0, 1], [90, 0]);
  return (
    <div style={{
      opacity: interpolate(s, [0, 1], [0, 1]), transform: `translateX(${x}px)`,
      width: 720, padding: '20px 28px', borderRadius: 18,
      background: 'linear-gradient(160deg, #16251c, #101a15)',
      border: '1px solid rgba(34,197,94,0.22)',
      display: 'flex', alignItems: 'center', gap: 18,
    }}>
      <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(34,197,94,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#22c55e', fontWeight: 900 }}>✓</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 32, color: BRAND.text }}>{nome}</div>
        <div style={{ color: BRAND.sub, fontFamily: BODY, fontSize: 22 }}>{qtd}</div>
      </div>
      <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 34, color: '#22c55e' }}>{valor}</div>
    </div>
  );
};

const CartHeader: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // total sobe acompanhando a entrada dos itens
  const n = compras.itens.length;
  let acc = 0;
  for (let i = 0; i < n; i++) {
    const g = spring({ frame, fps, delay: 8 + i * ROW_DELAY, config: { damping: 200, mass: 1 } });
    acc += compras.itens[i].v * g;
  }
  const prog = Math.min(100, (acc / compras.totalValue) * 100);
  return (
    <div style={{ textAlign: 'center', marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'center' }}>
        <div style={{ fontSize: 44 }}>🛒</div>
        <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 44, color: BRAND.text }}>{compras.titulo}</div>
      </div>
      <div style={{ color: BRAND.sub, fontFamily: BODY, fontSize: 26, marginTop: 12 }}>Total da compra</div>
      <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 84, letterSpacing: -1, color: '#22c55e' }}>{brl(acc)}</div>
      <div style={{ width: 520, height: 16, borderRadius: 8, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', margin: '14px auto 0' }}>
        <div style={{ width: `${prog}%`, height: '100%', borderRadius: 8, background: 'linear-gradient(90deg, #22c55e, #a3e635)' }} />
      </div>
    </div>
  );
};

const Scene: React.FC = () => (
  <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
    <CartHeader />
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {compras.itens.map((it, i) => (
        <Item key={i} nome={it.nome} qtd={`${it.qtd} • ${it.unidade}`} valor={it.valor} delay={12 + i * ROW_DELAY} />
      ))}
    </div>
  </AbsoluteFill>
);

export const ComprasCarrinhoShort: React.FC = () => (
  <AbsoluteFill><Background /><Scene /><RoamingWatermark /></AbsoluteFill>
);
export const ComprasCarrinhoLong: React.FC = () => (
  <AbsoluteFill><Background /><Scene /><RoamingWatermark /></AbsoluteFill>
);
