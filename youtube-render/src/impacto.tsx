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

/**
 * 🔴 O SOCO PASSOU A CABER NOS DOIS FORMATOS — 08/08/2026.
 *
 * Nasceu para o Short de 16s (1080×1920) e todos os números aqui eram desse formato.
 * O dono mandou levá-lo ao vídeo longo, que é 1920×1080 — **outra tela, outros
 * números**. Copiar tal e qual dava: faixas de cor de 190px a comerem 18% de um ecrã
 * que só tem 1080 de altura, e o ícone a aterrar em cima da legenda.
 *
 * ⚠️ **O valor por omissão é o VERTICAL**, de propósito: assim a chamada do Short de
 * 16s — que publica duas vezes por dia — fica byte a byte igual, e prova-se com um
 * fotograma que nada mudou lá.
 */
export type FormatoDoSoco = 'vertical' | 'deitado';

const GEOMETRIA: Record<FormatoDoSoco, {
  /** altura das faixas de cor em cima e em baixo */
  faixa: number;
  /** quanto o ícone se desvia do centro vertical (px, para baixo) */
  desvioDoIcone: number;
  /** o tamanho do ícone e do anel */
  palco: number;
}> = {
  /**
   * O 9:16. `desvioDoIcone: 100` põe o ícone no corredor livre y 945..1175 — medido
   * três vezes no fotograma (ver o comentário em `IconeQueBate`).
   */
  vertical: { faixa: 190, desvioDoIcone: 100, palco: 300 },
  /**
   * O 16:9. As faixas descem de 190 para 120 porque 190px de 1080 seriam 18% do ecrã
   * (no vertical são 10%). E o ícone fica no CENTRO exacto: com 300px de palco ele
   * ocupa y 390..690, e a legenda do vídeo longo vive em y ~880..935 — passa longe.
   * Subir ou descer o ícone daqui seria trocar um sítio livre por um ocupado.
   */
  deitado: { faixa: 120, desvioDoIcone: 0, palco: 300 },
};

/** O clarão de cor. É ele que quebra o azul. */
const ClaraoDeCor: React.FC<{ cor: string; halo: string; faixa: number }> = ({ cor, halo, faixa }) => {
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
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: faixa, opacity: moldura, background: `linear-gradient(${cor} 0%, transparent 100%)` }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: faixa, opacity: moldura, background: `linear-gradient(transparent 0%, ${halo} 100%)` }} />
      {/* o estalo branco */}
      <AbsoluteFill style={{ opacity: estouro, background: '#ffffff' }} />
    </AbsoluteFill>
  );
};

/** O ícone que bate na tela: entra grande, esmaga, assenta, e sai. */
const IconeQueBate: React.FC<{ tipo: TipoDeImpacto; cor: string; desvio: number; palco: number }> = ({ tipo, cor, desvio, palco }) => {
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
      <div style={{ position: 'relative', top: desvio, width: palco, height: palco, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          position: 'absolute', width: palco, height: palco, borderRadius: '50%',
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
export const Impacto: React.FC<{ tipo: TipoDeImpacto; som: string; formato?: FormatoDoSoco }> = ({ tipo, som, formato = 'vertical' }) => {
  const cor = tipo === 'alerta' ? CORES_DE_IMPACTO.alerta : CORES_DE_IMPACTO.virada;
  const halo = tipo === 'alerta' ? CORES_DE_IMPACTO.quente : CORES_DE_IMPACTO.virada;
  const g = GEOMETRIA[formato];
  return (
    <>
      <ClaraoDeCor cor={cor} halo={halo} faixa={g.faixa} />
      <IconeQueBate tipo={tipo} cor={cor} desvio={g.desvioDoIcone} palco={g.palco} />
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
export const PalavraFantasma: React.FC<{ palavra: string; formato?: FormatoDoSoco }> = ({ palavra, formato = 'vertical' }) => {
  const frame = useCurrentFrame();
  const texto = String(palavra || '').trim().toUpperCase().slice(0, 12);
  if (!texto) return null;

  /**
   * ⚠️ NO 16:9 A LARGURA ÚTIL É OUTRA e a faixa vazia também. Medido nos fotogramas do
   * vídeo longo que foi ao ar: o conteúdo vive em y 360..719 e a legenda em y ~880..935;
   * o que estava deserto era o resto. A palavra ocupa y 250..810 por trás de tudo, a 7%
   * — não se lê, preenche.
   */
  const util = formato === 'deitado' ? 1700 : 1180;
  const tamanho = Math.max(110, Math.min(300, Math.round(util / (texto.length * 0.78))));
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
      position: 'absolute', left: 0, right: 0,
      top: formato === 'deitado' ? 250 : 230,
      height: formato === 'deitado' ? 560 : 400,
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
export const MolduraDeCanto: React.FC<{ formato?: FormatoDoSoco }> = ({ formato = 'vertical' }) => {
  const frame = useCurrentFrame();
  const respira = 0.22 + 0.10 * Math.sin(frame / 26);
  const canto = (estilo: React.CSSProperties) => (
    <div style={{ position: 'absolute', width: 74, height: 74, opacity: respira, ...estilo }} />
  );
  const linha = `3px solid ${BRAND.cyan}`;
  /**
   * ⚠️ NO 16:9 A MOLDURA FECHA NOUTRO SÍTIO, e os números do vertical dariam disparate:
   * `bottom: 470` num ecrã de 1080 fecharia a moldura **a meio do quadro**.
   * `bottom: 130` põe a linha de baixo em y=950 — acima do corte da barra do YouTube
   * (972, ver `zonas.ts`) e abaixo da legenda (~935). `top: 120` fica logo abaixo do
   * trilho de progresso, que agora vive no topo.
   */
  const g = formato === 'deitado'
    ? { cima: 120, baixo: 130, lado: 60, cabelo: 220 }
    : { cima: 300, baixo: 470, lado: 44, cabelo: 150 };
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {canto({ top: g.cima, left: g.lado, borderTop: linha, borderLeft: linha, borderTopLeftRadius: 10 })}
      {canto({ top: g.cima, right: g.lado, borderTop: linha, borderRight: linha, borderTopRightRadius: 10 })}
      {canto({ bottom: g.baixo, left: g.lado, borderBottom: linha, borderLeft: linha, borderBottomLeftRadius: 10 })}
      {canto({ bottom: g.baixo, right: g.lado, borderBottom: linha, borderRight: linha, borderBottomRightRadius: 10 })}
      {/* duas linhas de cabelo, uma de cada lado do miolo */}
      <div style={{ position: 'absolute', top: g.cima, left: g.cabelo, right: g.cabelo, height: 1, background: BRAND.text, opacity: respira * 0.35 }} />
      <div style={{ position: 'absolute', bottom: g.baixo, left: g.cabelo, right: g.cabelo, height: 1, background: BRAND.text, opacity: respira * 0.35 }} />
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

/**
 * ⚠️ A POEIRA DO 16:9 É OUTRA CONSTELAÇÃO, e não podia ser a mesma: os pontos do
 * vertical vão até x=950 (de 1080) e y=1400 (de 1920). Postos num quadro de 1920×1080
 * ficariam **todos amontoados na metade esquerda e sete dos onze fora da tela**.
 *
 * Estes estão espalhados pelas faixas que a medição mostrou vazias — as margens
 * laterais largas e as bandas de cima e de baixo — e nenhum entra na zona da legenda
 * (y ~880..935) nem abaixo do corte da barra do YouTube (972).
 */
const POEIRA_DEITADA = [
  { x: 150, y: 200, r: 6, cor: BRAND.cyan, fase: 0 },
  { x: 420, y: 130, r: 4, cor: BRAND.violet, fase: 2.4 },
  { x: 880, y: 170, r: 5, cor: BRAND.magenta, fase: 1.1 },
  { x: 1380, y: 140, r: 4, cor: BRAND.cyan, fase: 3.0 },
  { x: 1720, y: 240, r: 6, cor: BRAND.violet, fase: 0.5 },
  { x: 90, y: 520, r: 5, cor: BRAND.magenta, fase: 1.4 },
  { x: 1830, y: 560, r: 5, cor: BRAND.cyan, fase: 2.7 },
  { x: 210, y: 810, r: 4, cor: BRAND.violet, fase: 0.8 },
  { x: 640, y: 860, r: 5, cor: BRAND.cyan, fase: 2.1 },
  { x: 1290, y: 845, r: 4, cor: BRAND.magenta, fase: 3.3 },
  { x: 1760, y: 800, r: 6, cor: BRAND.violet, fase: 1.9 },
  { x: 1010, y: 120, r: 4, cor: BRAND.cyan, fase: 1.2 },
];

export const PoeiraDaMarca: React.FC<{ formato?: FormatoDoSoco }> = ({ formato = 'vertical' }) => {
  const frame = useCurrentFrame();
  const pontos = formato === 'deitado' ? POEIRA_DEITADA : POEIRA;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {pontos.map((p, i) => {
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
export const TexturaDoLoop: React.FC<{ palavra: string; formato?: FormatoDoSoco }> = ({ palavra, formato = 'vertical' }) => (
  <>
    <MolduraDeCanto formato={formato} />
    <PalavraFantasma palavra={palavra} formato={formato} />
    <PoeiraDaMarca formato={formato} />
  </>
);

/** Reexportado para o Short16 e para o vídeo longo montarem as sequências sem repetir a conta. */
export const SequenciaDeImpacto: React.FC<{ from: number; tipo: TipoDeImpacto; som: string; formato?: FormatoDoSoco }> = ({ from, tipo, som, formato = 'vertical' }) => (
  <Sequence from={from} durationInFrames={IMPACTO_FRAMES}>
    <Impacto tipo={tipo} som={som} formato={formato} />
  </Sequence>
);

/**
 * ═══ ONDE BATEM OS SOCOS DO VÍDEO LONGO ═══
 *
 * Ordem do dono, 08/08/2026: *"um soco de cor a cada 12 a 15 segundos"*, alternando
 * 🔴 vermelho no problema e 🟢 verde no ganho — *"o que faz o efeito é o contraste,
 * não a repetição"*. Num vídeo de ~6 minutos dão-se **cerca de 24**.
 *
 * ⚠️ **O soco cai sempre no ARRANQUE DE UMA CENA, nunca a meio de uma frase.** É a
 * diferença entre um soco e um susto: a meio de uma fala ele interrompe quem está a
 * ouvir; no arranque, ele SUBLINHA a coisa nova que acabou de entrar.
 *
 * ⚠️ E há um mínimo de 6 segundos entre socos. Sem ele, duas cenas curtas seguidas
 * podiam levar dois socos a 1 segundo de distância — e aí o vermelho deixa de assustar
 * e passa a ser papel de parede, que é exactamente o que o dono não quer.
 */
export const INTERVALO_DO_SOCO_SEC = 15;
const MINIMO_ENTRE_SOCOS_SEC = 6;

export function socosDoVideoLongo(
  iniciosDeCena: number[],
  totalDeFrames: number,
  fps: number,
): Array<{ frame: number; tipo: TipoDeImpacto; som: string }> {
  if (!iniciosDeCena.length) return [];
  const passo = Math.round(INTERVALO_DO_SOCO_SEC * fps);
  const minimo = Math.round(MINIMO_ENTRE_SOCOS_SEC * fps);
  // Nunca nos últimos 4 segundos: aí já mandam as telas de marca.
  const limite = totalDeFrames - fps * 4;
  const escolhidos: Array<{ frame: number; tipo: TipoDeImpacto; som: string }> = [];

  for (let alvo = passo; alvo < limite; alvo += passo) {
    const perto = iniciosDeCena.reduce(
      (a, b) => (Math.abs(b - alvo) < Math.abs(a - alvo) ? b : a),
      iniciosDeCena[0],
    );
    if (perto <= 0 || perto >= limite) continue;
    if (escolhidos.some((s) => Math.abs(s.frame - perto) < minimo)) continue;
    const tipo: TipoDeImpacto = escolhidos.length % 2 === 0 ? 'alerta' : 'virada';
    escolhidos.push({ frame: perto, tipo, som: tipo === 'alerta' ? 'warning.ogg' : 'kaching.ogg' });
  }
  return escolhidos;
}
