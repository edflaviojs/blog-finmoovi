import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { BRAND, DISPLAY } from './theme';

/**
 * ═══ O IMPACTO — os socos de cor do Short de 16s (07/08/2026) ═══
 *
 * Ordem do dono, depois de ver a primeira prévia:
 *   *"deveria ter alguma animação, ícones… quando falar de algo negativo aparece um
 *   ícone de atenção em vermelho e nesse momento aparece som de travamento, de
 *   emergência… isso tudo para dar aquele impacto de cores, pois está tudo azul, tudo
 *   combinando, tudo certinho. E isso tem que acontecer umas 2 a 3 vezes muito rápido,
 *   pois isso faz o espectador querer voltar pra ver o que é."*
 *
 * Ele tem razão e o diagnóstico é preciso: a paleta do canal é ciano→violeta→magenta,
 * tudo do mesmo lado do círculo de cores. É bonito e é **previsível** — e o que não
 * surpreende não faz ninguém voltar atrás.
 *
 * ⚠️ **O VERMELHO É UM INTRUSO DE PROPÓSITO.** `#ff1f3d` não está na paleta da marca.
 * Não é um descuido: é a única cor do vídeo que não combina com nada, e é isso que a
 * faz saltar. Se um dia alguém a "harmonizar", o efeito morre.
 *
 * ⚠️ **DURA 0,4 SEGUNDO E ACABA.** Um alerta que fica é decoração; um alerta que passa
 * antes de a pessoa perceber é o que faz ela arrastar o dedo para trás. Por isso são
 * 12 fotogramas, não 60.
 *
 * ⚠️ **O PRIMEIRO SOCO É AOS 0,1s DO VÍDEO** — ou seja, bate outra vez a cada volta do
 * loop. É a peça que transforma "vi de novo por acaso" em "voltei para ver o que era".
 */

/** As três cores que NÃO são da marca. Vivem só aqui, e é assim que têm de ficar. */
export const CORES_DE_IMPACTO = {
  alerta: '#ff1f3d',   // o intruso vermelho
  quente: '#ff7a00',   // o halo do alerta
  virada: '#22c55e',   // o verde da solução (só no momento da virada)
} as const;

/** Quantos fotogramas dura um soco. 12 = 0,4s. */
export const IMPACTO_FRAMES = 12;

export type TipoDeImpacto = 'alerta' | 'virada';

/**
 * ⚠️ **OS GLIFOS SÃO DESENHADOS AQUI, E NÃO VIERAM DO CATÁLOGO DE 18 ÍCONES.**
 * Não foi por gosto: os ícones novos do `icons-fx.tsx` estão declarados como
 * `React.FC` **sem props** — a cor deles é fixa dentro do SVG e ignoram em silêncio o
 * `color` que se lhes passe. Como a cor É o efeito aqui (o vermelho intruso), usá-los
 * daria um alerta da cor da marca, que é exactamente o problema que o dono apontou.
 * São 20 linhas de SVG e ficam sob controlo total.
 */
const TrianguloDeAlerta: React.FC<{ cor: string }> = ({ cor }) => (
  <svg width="230" height="230" viewBox="0 0 100 100" fill="none">
    <path d="M50 8 L95 88 H5 Z" fill={cor} stroke="#ffffff" strokeWidth="4" strokeLinejoin="round" />
    <rect x="44" y="34" width="12" height="30" rx="6" fill="#ffffff" />
    <circle cx="50" cy="74" r="7" fill="#ffffff" />
  </svg>
);

const EscudoDaVirada: React.FC<{ cor: string }> = ({ cor }) => (
  <svg width="230" height="230" viewBox="0 0 100 100" fill="none">
    <path d="M50 6 L88 20 V50 C88 72 70 88 50 94 C30 88 12 72 12 50 V20 Z" fill={cor} stroke="#ffffff" strokeWidth="4" strokeLinejoin="round" />
    <path d="M32 50 L45 63 L70 36" stroke="#ffffff" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

/**
 * O QUE ACONTECE EM CADA CENA — e repare que NÃO é a IA que decide.
 *
 * O Short de 16s tem sempre a mesma forma dramática (é o `roteiro-loop.js` que a
 * impõe): 1 o aviso · 2 a dor · 3 a virada · 4 o círculo. Logo o sítio de cada soco
 * sai da ESTRUTURA, não do texto — pedir ao modelo "marque o momento negativo" seria
 * abrir outra vez a porta que já custou planos apagados noutros vídeos.
 *
 * A cena 4 fica LIMPA de propósito: é a emenda do loop, e nada pode dar nas vistas ali.
 */
export const IMPACTO_POR_CENA: Array<{ tipo: TipoDeImpacto; som: string } | null> = [
  { tipo: 'alerta', som: 'warning.ogg' },  // cena 1 — o aviso
  { tipo: 'alerta', som: 'thud.ogg' },     // cena 2 — a dor
  { tipo: 'virada', som: 'ding.ogg' },     // cena 3 — a solução
  null,                                     // cena 4 — a emenda, limpa
];

/**
 * O TREMOR. Uma sacudidela que decai — o mesmo princípio de um impacto de verdade:
 * bate forte, ressoa, pára. Devolve-se em pixels para quem chama aplicar num
 * `transform`, porque o tremor tem de abanar o CONTEÚDO, não o efeito.
 */
export function tremorNoFrame(frameLocal: number): { x: number; y: number } {
  if (frameLocal < 0 || frameLocal >= IMPACTO_FRAMES) return { x: 0, y: 0 };
  const decaimento = interpolate(frameLocal, [0, IMPACTO_FRAMES], [1, 0], { extrapolateRight: 'clamp' });
  const forca = 16 * decaimento * decaimento; // ao quadrado: morre depressa
  return {
    x: Math.sin(frameLocal * 2.7) * forca,
    y: Math.cos(frameLocal * 3.9) * forca * 0.6,
  };
}

/** O clarão de cor. É ele que quebra o azul. */
const ClaraoDeCor: React.FC<{ cor: string; halo: string }> = ({ cor, halo }) => {
  const frame = useCurrentFrame();

  // O estouro branco: 2 fotogramas e desaparece. Dá o "estalo" ao olho.
  const estouro = interpolate(frame, [0, 1, 3], [0, 0.45, 0], { extrapolateRight: 'clamp' });
  // A moldura de cor: entra num fotograma, sai em doze.
  const moldura = interpolate(frame, [0, 1, IMPACTO_FRAMES], [0, 0.85, 0], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {/* vinheta de cor a entrar pelas bordas — o centro fica legível */}
      <AbsoluteFill style={{
        opacity: moldura,
        background: `radial-gradient(ellipse 78% 62% at 50% 50%, transparent 34%, ${cor}66 72%, ${cor}dd 100%)`,
      }} />
      {/* faixas de cor em cima e em baixo: é o que se vê de relance no scroll */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 190, opacity: moldura, background: `linear-gradient(${cor} 0%, transparent 100%)` }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 190, opacity: moldura, background: `linear-gradient(transparent 0%, ${halo} 100%)` }} />
      {/* o estalo branco */}
      <AbsoluteFill style={{ opacity: estouro, background: '#ffffff' }} />
    </AbsoluteFill>
  );
};

/** O ícone que bate na tela: entra grande, esmaga, assenta, e sai. */
const IconeQueBate: React.FC<{ tipo: TipoDeImpacto; cor: string }> = ({ tipo, cor }) => {
  const frame = useCurrentFrame();
  const Comp = tipo === 'alerta' ? TrianguloDeAlerta : EscudoDaVirada;

  // chegada: de 2,6× para 1× em 4 fotogramas (rápido = peso)
  const escala = interpolate(frame, [0, 4, 6, IMPACTO_FRAMES], [2.6, 1, 1.1, 0.86], { extrapolateRight: 'clamp' });
  // o esmagamento do impacto — larga e baixa no fotograma da batida
  const esmagaX = interpolate(frame, [3, 4, 7], [1, 1.18, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const esmagaY = interpolate(frame, [3, 4, 7], [1, 0.84, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const giro = interpolate(frame, [0, 4, IMPACTO_FRAMES], [-14, 0, 6], { extrapolateRight: 'clamp' });
  const opacidade = interpolate(frame, [0, 1, IMPACTO_FRAMES - 3, IMPACTO_FRAMES], [0, 1, 1, 0], { extrapolateRight: 'clamp' });
  // o anel de choque
  const anel = interpolate(frame, [3, IMPACTO_FRAMES], [0.7, 2.4], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const anelOp = interpolate(frame, [3, 5, IMPACTO_FRAMES], [0, 0.8, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
      {/* ⚠️ **A CORREDOR LIVRE: y 945..1175.** O sítio do ícone foi medido no fotograma,
          três vezes, e as duas primeiras estavam erradas:
            · centro exacto (y 810..1110) → comia o fim da palavra no cartão de texto
              ("Achei um erri▮▮▮", fotograma 260);
            · 150px abaixo (y 1095..1325) → tapava a LEGENDA, e a legenda é a fala.
          A faixa entre o fim do cartão (~y 904) e o início da legenda (~y 1210) tem
          306px livres. O ícone tem 230. Cabe com folga dos dois lados — e é justamente
          a faixa que estava vazia, por isso o soco também a preenche.
          ⚠️ Mexer no `LEGENDA_BOTTOM` de `zonas.ts` mexe neste corredor. */}
      <div style={{ position: 'relative', top: 100, width: 300, height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          position: 'absolute', width: 300, height: 300, borderRadius: '50%',
          border: `10px solid ${cor}`, opacity: anelOp, transform: `scale(${anel})`,
        }} />
        <div style={{
          transform: `scale(${escala}) scale(${esmagaX}, ${esmagaY}) rotate(${giro}deg)`,
          opacity: opacidade,
          filter: `drop-shadow(0 0 42px ${cor}) drop-shadow(0 0 14px ${cor})`,
        }}>
          <Comp cor={cor} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

/**
 * UM SOCO COMPLETO: cor + ícone + som. O tremor NÃO vem daqui — quem abana é o
 * conteúdo, e por isso quem chama é que aplica o `tremorNoFrame`.
 */
export const Impacto: React.FC<{ tipo: TipoDeImpacto; som: string }> = ({ tipo, som }) => {
  const cor = tipo === 'alerta' ? CORES_DE_IMPACTO.alerta : CORES_DE_IMPACTO.virada;
  const halo = tipo === 'alerta' ? CORES_DE_IMPACTO.quente : CORES_DE_IMPACTO.virada;
  return (
    <>
      <ClaraoDeCor cor={cor} halo={halo} />
      <IconeQueBate tipo={tipo} cor={cor} />
      {/* ⚠️ O som vive DENTRO da mesma sequência do visual: assim a batida e o estalo
          caem no MESMO fotograma. Separá-los foi o que já pôs som fora do sítio. */}
      <Audio src={staticFile(`sfx/${som}`)} volume={0.85} />
    </>
  );
};

/**
 * ═══ A TELA VAZIA ═══
 *
 * A outra queixa do dono na mesma mensagem. Metade de baixo do vídeo era roxo liso —
 * o formato de 50s disfarça com a etiqueta, o selo e o trilho de progresso, e os três
 * foram tirados daqui de propósito.
 *
 * A resposta não é acrescentar informação (16 segundos não têm espaço para mais nada).
 * É acrescentar TEXTURA: o que preenche a tela sem pedir para ser lido.
 */

/**
 * A PALAVRA FANTASMA — a palavra-chave em letras gigantes, quase apagada, por trás de
 * tudo. Enche o vazio sem competir com nada.
 *
 * ⚠️ O tamanho é CALCULADO, não escolhido a olho. A Unbounded é larga (~0,78em por
 * letra); uma palavra de 8 letras a 300px daria 1.870px numa tela de 1.080 e o texto
 * saía cortado ao meio pelos dois lados. A conta é `largura útil ÷ (letras × 0,78)`.
 */
export const PalavraFantasma: React.FC<{ palavra: string }> = ({ palavra }) => {
  const frame = useCurrentFrame();
  const texto = String(palavra || '').trim().toUpperCase().slice(0, 12);
  if (!texto) return null;

  const tamanho = Math.max(110, Math.min(300, Math.round(1180 / (texto.length * 0.78))));
  const deriva = Math.sin(frame / 90) * 18;

  /**
   * ⚠️ **MUDOU DE SÍTIO DEPOIS DE ALGUÉM OLHAR OS FOTOGRAMAS.** Nasceu em `top: 1010`
   * — mesmo por trás da legenda. O robô de QA apanhou-o à primeira: *"o grande FATURA
   * de fundo compete um pouco com as legendas menores"*, e a grelha de 8 fotogramas
   * confirmou a olho. Ao mesmo tempo dizia *"há bastante espaço vazio na metade
   * superior"*. As duas queixas tinham a mesma resposta: subir a palavra.
   * Agora vive em y 230..630 — acima do cartão de texto (que começa em ~634) e no
   * único sítio que estava mesmo vazio.
   */
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, top: 230, height: 400,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', pointerEvents: 'none',
    }}>
      <span style={{
        fontFamily: DISPLAY, fontWeight: 900, fontSize: tamanho, letterSpacing: -tamanho * 0.04,
        color: BRAND.text, opacity: 0.07, whiteSpace: 'nowrap',
        transform: `translateX(${deriva}px)`,
      }}>
        {texto}
      </span>
    </div>
  );
};

/**
 * A MOLDURA DE CANTO — quatro cantoneiras finas e duas linhas de cabelo.
 * Custa nada, não tapa nada, e é a diferença entre "uma tela com coisas em cima" e
 * "uma tela composta". Desenhada nos limites da zona segura, por isso também serve de
 * lembrete visual de onde o conteúdo pode viver.
 */
export const MolduraDeCanto: React.FC = () => {
  const frame = useCurrentFrame();
  const respira = 0.22 + 0.10 * Math.sin(frame / 26);
  const canto = (estilo: React.CSSProperties) => (
    <div style={{ position: 'absolute', width: 74, height: 74, opacity: respira, ...estilo }} />
  );
  const linha = `3px solid ${BRAND.cyan}`;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {canto({ top: 300, left: 44, borderTop: linha, borderLeft: linha, borderTopLeftRadius: 10 })}
      {canto({ top: 300, right: 44, borderTop: linha, borderRight: linha, borderTopRightRadius: 10 })}
      {canto({ bottom: 470, left: 44, borderBottom: linha, borderLeft: linha, borderBottomLeftRadius: 10 })}
      {canto({ bottom: 470, right: 44, borderBottom: linha, borderRight: linha, borderBottomRightRadius: 10 })}
      {/* duas linhas de cabelo, uma de cada lado do miolo */}
      <div style={{ position: 'absolute', top: 300, left: 150, right: 150, height: 1, background: BRAND.text, opacity: respira * 0.35 }} />
      <div style={{ position: 'absolute', bottom: 470, left: 150, right: 150, height: 1, background: BRAND.text, opacity: respira * 0.35 }} />
    </AbsoluteFill>
  );
};

/**
 * A POEIRA — pontos da marca a flutuar na faixa que estava vazia.
 * Posições FIXAS (nada de aleatório: o render é feito fora de ordem e um
 * `Math.random()` daria uma constelação diferente em cada fotograma).
 */
/**
 * ⚠️ Espalhada de y 320 a y 1400, e não só no miolo. Na primeira versão vivia toda na
 * faixa 1090..1380 — ou seja, em cima da legenda e mais nada. A grelha de fotogramas
 * mostrou o topo e o fundo às moscas. Nenhuma entra na faixa que o telemóvel tapa
 * (abaixo de 1470): pontinho tapado é pixel deitado fora.
 */
const POEIRA = [
  { x: 120, y: 360, r: 6, cor: BRAND.cyan, fase: 0 },
  { x: 890, y: 430, r: 5, cor: BRAND.violet, fase: 2.4 },
  { x: 260, y: 700, r: 4, cor: BRAND.magenta, fase: 1.1 },
  { x: 950, y: 760, r: 5, cor: BRAND.cyan, fase: 3.0 },
  { x: 120, y: 1090, r: 7, cor: BRAND.cyan, fase: 0.5 },
  { x: 300, y: 1240, r: 5, cor: BRAND.violet, fase: 1.4 },
  { x: 520, y: 1160, r: 4, cor: BRAND.magenta, fase: 2.7 },
  { x: 760, y: 1290, r: 6, cor: BRAND.cyan, fase: 0.8 },
  { x: 930, y: 1120, r: 5, cor: BRAND.violet, fase: 2.1 },
  { x: 200, y: 1390, r: 4, cor: BRAND.magenta, fase: 3.3 },
  { x: 860, y: 1400, r: 4, cor: BRAND.cyan, fase: 1.9 },
];

export const PoeiraDaMarca: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {POEIRA.map((p, i) => {
        const sobe = Math.sin(frame / 34 + p.fase) * 14;
        const brilha = 0.30 + 0.22 * Math.sin(frame / 22 + p.fase);
        return (
          <div key={i} style={{
            position: 'absolute', left: p.x, top: p.y + sobe,
            width: p.r * 2, height: p.r * 2, borderRadius: '50%',
            background: p.cor, opacity: brilha,
            boxShadow: `0 0 ${p.r * 4}px ${p.cor}`,
          }} />
        );
      })}
    </AbsoluteFill>
  );
};

/** Empacota a textura toda — é uma linha só em quem usa. */
export const TexturaDoLoop: React.FC<{ palavra: string }> = ({ palavra }) => (
  <>
    <MolduraDeCanto />
    <PalavraFantasma palavra={palavra} />
    <PoeiraDaMarca />
  </>
);

/** Reexportado para o Short16 montar as sequências sem repetir a conta. */
export const SequenciaDeImpacto: React.FC<{ from: number; tipo: TipoDeImpacto; som: string }> = ({ from, tipo, som }) => (
  <Sequence from={from} durationInFrames={IMPACTO_FRAMES}>
    <Impacto tipo={tipo} som={som} />
  </Sequence>
);
