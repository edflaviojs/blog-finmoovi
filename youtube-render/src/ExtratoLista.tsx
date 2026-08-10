import { AbsoluteFill, spring, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { Background } from './scenes';
import { BRAND, DISPLAY, BODY } from './theme';
import { RoamingWatermark } from './broll/watermark';
import { useDados } from './broll/valores-da-historia';
import { extrato } from './broll/extrato';
import { brl } from './broll/cartoes';

// Estilo NOVO da tela de Extrato: os lançamentos ENTRAM UM A UM (deslizando) e o
// SALDO vai CORRENDO até o total real. Reveal limpo e ritmado. Dados de ./broll/extrato.

/**
 * ═══ 🔴 UM TERCEIRO SINAL: `neutro` — 10/08/2026 ═══
 *
 * ═══ O DEFEITO QUE ISTO CONSERTA ═══
 * As linhas de lançamento desta tela tinham os valores GRAVADOS (R$ 1.500,00 de aluguel,
 * R$ 159,20 de luz, R$ 235,89 de supermercado). Num vídeo longo, o saldo grande já
 * recebia o número da história — mas **as linhas por baixo continuavam a mostrar dinheiro
 * que a voz nunca diz**. É a queixa nº 1 do dono, um andar abaixo de onde ela foi
 * consertada em 10/08 de manhã.
 *
 * ═══ ⚠️ POR QUE UM SINAL NOVO, E NÃO REAPROVEITAR O VERDE ═══
 * Os valores que a história dá são **saldos**, não movimentos: *"o saldo que estava na
 * outra conta: R$ 300"*. Pintá-lo de verde com um ▲ e um `+` diria que entrou dinheiro —
 * uma coisa que a voz não disse. **Inventar o sinal é inventar informação**, e é a mesma
 * família do número inventado.
 *
 * `neutro` mostra o valor como ele é: sem sinal, sem seta para cima nem para baixo, na
 * cor do texto normal.
 *
 * ⚠️ **O Short não muda um pixel:** `'in'` e `'out'` continuam a fazer exactamente o que
 * faziam, e o Short nunca passa `'neutro'`. É a mesma forma do envelope — uma opção nova
 * com o comportamento antigo por omissão.
 */
type SinalDaLinha = 'in' | 'out' | 'neutro';

const Row: React.FC<{ nome: string; cat: string; valor: string; tipo: SinalDaLinha; delay: number }> = ({ nome, cat, valor, tipo, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, delay, config: { damping: 16, mass: 0.7 } });
  const x = interpolate(s, [0, 1], [90, 0]);
  const op = interpolate(s, [0, 1], [0, 1]);
  return (
    <div style={{
      opacity: op, transform: `translateX(${x}px)`,
      width: 760, padding: '22px 30px', borderRadius: 20,
      background: 'linear-gradient(160deg, #1b2230, #12161f)',
      border: '1px solid rgba(255,255,255,0.08)',
      display: 'flex', alignItems: 'center', gap: 20,
    }}>
      {/* ⚠️ As três expressões abaixo têm de ficar IDÊNTICAS para 'in' e 'out' — é isso
          que garante que o Short não muda um pixel. `neutro` é o ramo novo. */}
      <div style={{
        width: 46, height: 46, borderRadius: 12,
        background: tipo === 'neutro' ? 'rgba(255,255,255,0.08)' : (tipo === 'in' ? 'rgba(34,197,94,0.16)' : 'rgba(239,68,68,0.16)'),
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
        color: tipo === 'neutro' ? BRAND.sub : (tipo === 'in' ? '#22c55e' : '#ef4444'), fontWeight: 900,
      }}>{tipo === 'neutro' ? '•' : (tipo === 'in' ? '▲' : '▼')}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 32, color: BRAND.text }}>{nome}</div>
        {/* ⚠️ Sem categoria, a linha não fica com um espaço vazio a fingir que há uma. */}
        {cat ? <div style={{ color: BRAND.sub, fontFamily: BODY, fontSize: 24 }}>{cat}</div> : null}
      </div>
      <div style={{
        fontFamily: DISPLAY, fontWeight: 800, fontSize: 36,
        color: tipo === 'neutro' ? BRAND.text : (tipo === 'in' ? '#22c55e' : '#ef4444'),
      }}>{valor}</div>
    </div>
  );
};

const SaldoCorrendo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // ⚠️ Envelope vazio (= o Short) devolve o objeto `extrato` original. Ver
  //    `broll/valores-da-historia.tsx`: sem provider, `useDados` devolve o padrão.
  const d = useDados(extrato, 'extrato');
  const s = spring({ frame, fps, delay: 6, config: { damping: 200, mass: 1.2 } });
  const val = d.saldoAtualValue * s;
  return (
    <div style={{ textAlign: 'center', marginBottom: 30 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'center' }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: d.contaCor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: DISPLAY, fontWeight: 900, fontSize: 24, color: '#fff' }}>{d.contaIniciais}</div>
        <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 44, color: BRAND.text }}>{d.conta}</div>
      </div>
      <div style={{ color: BRAND.sub, fontFamily: BODY, fontSize: 28, marginTop: 14 }}>Saldo Atual</div>
      <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 84, letterSpacing: -1, color: BRAND.text }}>{brl(val)}</div>
    </div>
  );
};

const Scene: React.FC = () => {
  const d = useDados(extrato, 'extrato');
  return (
  <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
    <SaldoCorrendo />
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {d.transacoes.map((t, i) => (
        <Row key={i} nome={t.nome} cat={t.cat} valor={t.valor} tipo={t.tipo} delay={18 + i * 12} />
      ))}
    </div>
  </AbsoluteFill>
  );
};

export const ExtratoListaShort: React.FC = () => (
  <AbsoluteFill><Background /><Scene /><RoamingWatermark /></AbsoluteFill>
);
export const ExtratoListaLong: React.FC = () => (
  <AbsoluteFill><Background /><Scene /><RoamingWatermark /></AbsoluteFill>
);
