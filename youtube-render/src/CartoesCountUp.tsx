import { AbsoluteFill, spring, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { Background } from './scenes';
import { BRAND, DISPLAY, BODY } from './theme';
import { Pop3D, panel } from './broll/card3d-kit';
import { HeroCard } from './CreditCards3D';
import { cartoes, brl, signColor } from './broll/cartoes';
import { RoamingWatermark } from './broll/watermark';
import { useDados } from './broll/valores-da-historia';

// Estilo NOVO "count-up": o cartão (Mastercard Itaú) salta em 3D e a FATURA
// conta de R$ 0 até o valor real, com a barra de limite enchendo. Reveal punchy
// (ótimo p/ short). Reusa o kit compartilhado e os dados reais de ./broll/cartoes.

/**
 * ⚠️ **A CONTA SAIU DE FORA DO COMPONENTE — 10/08/2026.** Estava aqui, calculada uma vez
 * quando o módulo carrega, e por isso NÃO PODIA mudar com a história. Dentro, ela é
 * recalculada a cada render — e com o envelope vazio dá exactamente o mesmo número de
 * sempre, porque `d` é o objeto `cartoes` original. Ver `broll/valores-da-historia.tsx`.
 */
const FaturaCountUp: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const d = useDados(cartoes, 'cartoes');
  const usage = d.faturaValue / d.limiteTotalValue; // 0..1
  // count-up com easing do spring (começa após o card aterrissar)
  const s = spring({ frame, fps, delay: 14, config: { damping: 200, mass: 1.2 } });
  const value = d.faturaValue * s;
  const barPct = interpolate(s, [0, 1], [0, usage * 100]);
  return (
    <div style={panel({ width: 620, padding: 36 })}>
      <div style={{ color: BRAND.sub, fontSize: 28, marginBottom: 6, fontFamily: BODY }}>Fatura Atual a Pagar (BRL)</div>
      <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 92, letterSpacing: -1.5, color: '#ef4444', lineHeight: 1.05 }}>
        {brl(value)}
      </div>
      {/* barra de utilização do limite */}
      <div style={{ marginTop: 26 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: BODY, fontSize: 24, color: BRAND.sub, marginBottom: 10 }}>
          <span>Limite usado</span>
          <span style={{ color: BRAND.text, fontWeight: 800 }}>{Math.round(barPct)}%</span>
        </div>
        <div style={{ width: '100%', height: 20, borderRadius: 10, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          <div style={{ width: `${barPct}%`, height: '100%', borderRadius: 10, background: 'linear-gradient(90deg, #22c55e, #a3e635)' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: BODY, fontSize: 24, marginTop: 12 }}>
          <span style={{ color: BRAND.sub }}>Disponível <span style={{ color: signColor(d.limiteDisponivelValue), fontWeight: 800 }}>{d.limiteDisponivel}</span></span>
          <span style={{ color: BRAND.sub }}>Limite <span style={{ color: '#22d3ee', fontWeight: 800 }}>{d.limiteTotal}</span></span>
        </div>
      </div>
    </div>
  );
};

const Scene: React.FC = () => (
  <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', perspective: 1600 }}>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26, transformStyle: 'preserve-3d' }}>
      <Pop3D delay={0} rotY={-6}><HeroCard /></Pop3D>
      <Pop3D delay={10} rotY={7}><FaturaCountUp /></Pop3D>
    </div>
  </AbsoluteFill>
);

export const CartoesCountUpShort: React.FC = () => (
  <AbsoluteFill><Background /><Scene /><RoamingWatermark /></AbsoluteFill>
);
export const CartoesCountUpLong: React.FC = () => (
  <AbsoluteFill><Background /><Scene /><RoamingWatermark /></AbsoluteFill>
);
