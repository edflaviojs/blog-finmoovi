import { AbsoluteFill } from 'remotion';
import { Background } from './scenes';
import { BRAND, DISPLAY, BODY } from './theme';
import { Pop3D, panel } from './broll/card3d-kit';
import { cartoes, signColor } from './broll/cartoes';

// Estilo 3D "data-driven" (padrão Cards3D): recria a tela de CARTÕES DE CRÉDITO
// do FinMoovi nativamente (dados reais em ./broll/cartoes) e faz os cards
// SALTAREM em 3D (perspectiva + profundidade + float). Layout CENTRALIZADO.
// Helpers Pop3D/panel vêm do kit compartilhado ./broll/card3d-kit.

// Logo Mastercard (dois círculos sobrepostos) — reutilizado por outros estilos.
export const Mastercard: React.FC<{ size?: number }> = ({ size = 58 }) => (
  <div style={{ position: 'relative', width: size * 1.55, height: size }}>
    <div style={{ position: 'absolute', left: 0, top: 0, width: size, height: size, borderRadius: '50%', background: '#eb001b' }} />
    <div style={{ position: 'absolute', left: size * 0.55, top: 0, width: size, height: size, borderRadius: '50%', background: '#f79e1b', mixBlendMode: 'screen' }} />
  </div>
);

// Cartão de crédito realista (Mastercard Itaú) — o herói da cena. Exportado
// p/ reuso no estilo count-up.
export const HeroCard: React.FC = () => (
  <div style={{
    width: 620, height: 372, borderRadius: 28, padding: 34,
    background: 'linear-gradient(135deg, #2a1005 0%, #7a2f0a 42%, #e8730f 100%)',
    border: '1px solid rgba(255,255,255,0.14)',
    boxShadow: '0 40px 100px rgba(232,115,15,0.35), 0 0 0 1px rgba(255,255,255,0.06)',
    fontFamily: BODY, color: '#fff', position: 'relative', overflow: 'hidden',
    display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
  }}>
    {/* brilho suave */}
    <div style={{ position: 'absolute', top: -120, right: -80, width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.18), transparent 62%)' }} />
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 40, letterSpacing: -0.5 }}>{cartoes.cardName}</div>
        <div style={{ opacity: 0.82, fontSize: 24, marginTop: 4 }}>{cartoes.subtitle}</div>
      </div>
      {/* chip dourado */}
      <div style={{ width: 66, height: 50, borderRadius: 10, background: 'linear-gradient(135deg, #f7e08a, #b8912f)', boxShadow: 'inset 0 0 0 2px rgba(0,0,0,0.18)' }} />
    </div>
    <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 40, letterSpacing: 6, opacity: 0.95 }}>
      •••• •••• •••• {cartoes.last4}
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
      <div>
        <div style={{ fontSize: 20, opacity: 0.7 }}>{cartoes.fechamento}</div>
      </div>
      <Mastercard />
    </div>
  </div>
);

// Card grande da fatura
const FaturaCard: React.FC = () => (
  <div style={panel({ width: 620, padding: 34 })}>
    <div style={{ color: BRAND.sub, fontSize: 28, marginBottom: 6 }}>Fatura Atual a Pagar (BRL)</div>
    <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 80, letterSpacing: -1, color: '#ef4444' }}>{cartoes.fatura}</div>
  </div>
);

// Linha de dois: limite total x disponível
const StatCard: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
  <div style={panel({ width: 298, padding: '24px 28px' })}>
    <div style={{ color: BRAND.sub, fontSize: 24, marginBottom: 6 }}>{label}</div>
    <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 42, color }}>{value}</div>
  </div>
);

const Scene3D: React.FC = () => (
  <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', perspective: 1600 }}>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, transformStyle: 'preserve-3d' }}>
      <Pop3D delay={0} rotY={-7}><HeroCard /></Pop3D>
      <Pop3D delay={12} rotY={8}><FaturaCard /></Pop3D>
      <Pop3D delay={20} rotY={-9}>
        <div style={{ display: 'flex', gap: 24, transformStyle: 'preserve-3d' }}>
          <StatCard label="Limite Total" value={cartoes.limiteTotal} color="#22d3ee" />
          <StatCard label="Limite Disponível" value={cartoes.limiteDisponivel} color={signColor(cartoes.limiteDisponivelValue)} />
        </div>
      </Pop3D>
    </div>
  </AbsoluteFill>
);

export const CreditCards3DShort: React.FC = () => (
  <AbsoluteFill><Background /><Scene3D /></AbsoluteFill>
);
export const CreditCards3DLong: React.FC = () => (
  <AbsoluteFill><Background /><Scene3D /></AbsoluteFill>
);
