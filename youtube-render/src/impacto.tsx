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
 * 🔴 OS GLIFOS RODAM — 09/08/2026, ordem do dono.
 *
 * *"Achei que os ícones estão muito repetitivos, tem que mudar os ícones e deixar isso
 * como padrão para os outros."*
 *
 * E ele tem razão: até aqui **havia UM glifo por tipo**. Todo soco de alerta era o mesmo
 * triângulo, no mesmo sítio, com o mesmo vermelho. No Short de 50s eles chegam a bater a
 * **1,8 segundos de distância** — dois desenhos idênticos tão perto lêem-se como um
 * defeito, não como ritmo.
 *
 * ⚠️ **É o mesmo defeito que ele apanhou hoje na capa dos vídeos**, noutro sítio: uma
 * coisa boa, repetida sem variar, deixa de ser boa. A cura é a mesma — um catálogo e
 * uma rotação.
 *
 * ⚠️ **O QUE NÃO MUDA, E É O QUE FAZ O EFEITO:** a cor. `#ff1f3d` continua a ser o
 * intruso que não está na paleta da marca, e o verde continua a ser só da virada. O que
 * roda é o DESENHO; o significado (vermelho = problema, verde = ganho) é sagrado.
 *
 * ⚠️ **Todos com o mesmo peso visual:** traço branco de 4, preenchimento cheio, e a
 * mesma caixa de 100×100. Um glifo mais leve que os outros faria o soco parecer mais
 * fraco naquela vez — e o ritmo mede-se pela batida, não pelo desenho.
 */
const SetaQueDesce: React.FC<{ cor: string }> = ({ cor }) => (
  <svg width="230" height="230" viewBox="0 0 100 100" fill="none">
    <circle cx="50" cy="50" r="44" fill={cor} stroke="#ffffff" strokeWidth="4" />
    <path d="M50 22 V64 M32 48 L50 68 L68 48" stroke="#ffffff" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

const CruzDoErro: React.FC<{ cor: string }> = ({ cor }) => (
  <svg width="230" height="230" viewBox="0 0 100 100" fill="none">
    <rect x="8" y="8" width="84" height="84" rx="22" fill={cor} stroke="#ffffff" strokeWidth="4" />
    <path d="M34 34 L66 66 M66 34 L34 66" stroke="#ffffff" strokeWidth="12" strokeLinecap="round" />
  </svg>
);

const RaioDoSusto: React.FC<{ cor: string }> = ({ cor }) => (
  <svg width="230" height="230" viewBox="0 0 100 100" fill="none">
    <circle cx="50" cy="50" r="44" fill={cor} stroke="#ffffff" strokeWidth="4" />
    <path d="M56 16 L30 54 H47 L44 84 L70 46 H53 Z" fill="#ffffff" />
  </svg>
);

const SetaQueSobe: React.FC<{ cor: string }> = ({ cor }) => (
  <svg width="230" height="230" viewBox="0 0 100 100" fill="none">
    <circle cx="50" cy="50" r="44" fill={cor} stroke="#ffffff" strokeWidth="4" />
    <path d="M50 78 V36 M32 52 L50 32 L68 52" stroke="#ffffff" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

const CertoNoCirculo: React.FC<{ cor: string }> = ({ cor }) => (
  <svg width="230" height="230" viewBox="0 0 100 100" fill="none">
    <circle cx="50" cy="50" r="44" fill={cor} stroke="#ffffff" strokeWidth="4" />
    <path d="M30 51 L44 66 L71 34" stroke="#ffffff" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

/** ⚠️ A ORDEM É A DA RODA. O primeiro de cada lista é o que já existia — assim o
 *  primeiro soco de qualquer vídeo continua a ser o desenho que o dono já aprovou. */
export const GLIFOS_DE_ALERTA = [TrianguloDeAlerta, CruzDoErro, SetaQueDesce, RaioDoSusto];
export const GLIFOS_DE_VIRADA = [EscudoDaVirada, CertoNoCirculo, SetaQueSobe];

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
 * 🔴 OS SOCOS DO SHORT DE 50 SEGUNDOS — 09/08/2026, ordem do dono.
 *
 * ═══ POR QUE POR PAPEL, E NÃO POR RELÓGIO ═══
 * O vídeo longo usa `socosDoVideoLongo`, que conta segundos, e faz sentido lá: ele tem
 * seis minutos e um número variável de cenas. **O de 50s não precisa disso** — ele tem
 * sempre a MESMA forma dramática, imposta pelo gerador de roteiro:
 *
 *     1 hook · 2 beat · 3 beat · 4 beat · 5 cta · 6 outro
 *
 * Logo o sítio de cada soco sai da ESTRUTURA, exactamente como no de 16s. É a mesma
 * razão escrita ali em cima: pedir ao modelo "marque o momento negativo" seria abrir
 * outra vez a porta que já custou planos apagados.
 *
 * ═══ POR QUE TRÊS, E POR QUE ESTES TRÊS ═══
 * A regra da casa é **um soco a cada 12-15 segundos**; em 52 segundos isso dá 3.
 *
 * · **hook** 🔴 — o susto que abre. ⚠️ Ele NÃO pode bater no fotograma 2 como no de
 *   16s: aqui a CAPA fica no ecrã 223 fotogramas (7,4s) e um soco por baixo dela era
 *   um soco que ninguém via. Quem o adia é o `Short.tsx`, para o instante em que ela
 *   levanta.
 *
 *   ⚠️ **E isso quer dizer que ele quase nunca cai na cena 1 — cai na 2.** O hook tem
 *   5 a 7 segundos e a capa tem 7,4: quando ela sai, o hook já acabou. **Não é um
 *   defeito, é o objectivo:** o soco tem de bater onde a pessoa decide se fica, e nos
 *   nossos Shorts **metade sai aos 14 segundos** (medido, §33.2). Medido no roteiro
 *   `inflacao-rouba`: bate aos **7,6s**. A cena é secundária; o segundo é que não.
 * · **beat 2** — sem soco PRÓPRIO, e é por isso que a lista o marca `null`: ele já
 *   recebe, na prática, o soco adiado do hook. Dois na mesma cena e o vermelho deixa
 *   de assustar e passa a papel de parede.
 * · **beat 3** 🔴 — o custo. É aqui que o roteiro diz quanto se perde.
 * · **beat 4** 🟢 — a virada, onde o app entra e resolve. O verde só tem força porque
 *   vem depois de dois vermelhos: **é o contraste que faz o efeito, não a repetição.**
 * · **cta** e **outro** — LIMPOS. A chamada é o único momento do vídeo em que se pede
 *   alguma coisa, e o fecho é o bordão da marca. Um clarão por cima de qualquer um dos
 *   dois rouba a atenção de exactamente aquilo que eles existem para conseguir.
 *
 * ⚠️ Um roteiro com mais ou menos cenas do que seis não parte nada: quem usa isto lê
 * pelo índice e ignora o que passar do fim da lista.
 */
export const IMPACTO_POR_CENA_50S: Array<{ tipo: TipoDeImpacto; som: string } | null> = [
  { tipo: 'alerta', som: 'warning.ogg' },  // 1 hook  — o susto que abre
  null,                                     // 2 beat  — deixa respirar
  { tipo: 'alerta', som: 'thud.ogg' },     // 3 beat  — o custo
  { tipo: 'virada', som: 'kaching.ogg' },  // 4 beat  — o app resolve
  null,                                     // 5 cta   — não se rouba a chamada
  null,                                     // 6 outro — o bordão fecha sozinho
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
const IconeQueBate: React.FC<{ tipo: TipoDeImpacto; cor: string; desvio: number; palco: number; glifo?: number }> = ({ tipo, cor, desvio, palco, glifo = 0 }) => {
  const frame = useCurrentFrame();
  // A RODA DOS GLIFOS: o indice vem de quem chama (a posicao do soco no video), e o
  // resto garante que nunca sai da lista por mais socos que haja.
  const lista = tipo === 'alerta' ? GLIFOS_DE_ALERTA : GLIFOS_DE_VIRADA;
  const Comp = lista[((glifo % lista.length) + lista.length) % lista.length];

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
export const Impacto: React.FC<{ tipo: TipoDeImpacto; som: string; formato?: FormatoDoSoco; glifo?: number }> = ({ tipo, som, formato = 'vertical', glifo = 0 }) => {
  const cor = tipo === 'alerta' ? CORES_DE_IMPACTO.alerta : CORES_DE_IMPACTO.virada;
  const halo = tipo === 'alerta' ? CORES_DE_IMPACTO.quente : CORES_DE_IMPACTO.virada;
  const g = GEOMETRIA[formato];
  return (
    <>
      <ClaraoDeCor cor={cor} halo={halo} faixa={g.faixa} />
      <IconeQueBate tipo={tipo} cor={cor} desvio={g.desvioDoIcone} palco={g.palco} glifo={glifo} />
      {/* ⚠️ O som vive DENTRO da mesma sequência do visual: assim a batida e o estalo
          caem no MESMO fotograma. Separá-los foi o que já pôs som fora do sítio.
          ⚠️ **`som` VAZIO É UM CASO LEGÍTIMO — 10/08/2026.** O soco da abertura do vídeo
          longo cai no mesmo fotograma do baque que a capa já toca; dois ficheiros de som
          ao mesmo tempo não fazem um soco mais forte, fazem um soco sujo. Sem esta
          guarda, `sfx/` seria pedido como ficheiro e o render morria — ou pior, ficava
          com um erro de áudio que ninguém liga ao soco. */}
      {som ? <Audio src={staticFile(`sfx/${som}`)} volume={0.85} /> : null}
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
export const SequenciaDeImpacto: React.FC<{
  from: number; tipo: TipoDeImpacto; som: string; formato?: FormatoDoSoco;
  /** A posição deste soco no vídeo. É ela que roda o glifo — ver `GLIFOS_DE_ALERTA`. */
  glifo?: number;
}> = ({ from, tipo, som, formato = 'vertical', glifo = 0 }) => (
  <Sequence from={from} durationInFrames={IMPACTO_FRAMES}>
    <Impacto tipo={tipo} som={som} formato={formato} glifo={glifo} />
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

/**
 * ═══ 🔴 O SOCO PASSA A PROCURAR O TRECHO PARADO — 10/08/2026, ordem do dono ═══
 *
 * ═══ O QUE ELE VIU, E O QUE ERA VERDADE ═══
 * *"Esses trechos só têm letras, não tem socos, não tem mudança de imagens."*
 *
 * A parte dos socos **estava errada, e o erro era meu de medição**: a régua tirava duas
 * amostras por segundo e o soco dura 0,4s, portanto ela passava por cima dele. Remedido a
 * dez amostras por segundo, o trecho que eu tinha dado como *"trinta segundos parados"*
 * tinha três momentos fortes, um deles com pico 69. **O soco estava lá.**
 *
 * O que era verdade era a outra metade: **entre um soco e outro, a tela era letra o tempo
 * todo**. O soco batia e não sublinhava nada, porque nada tinha mudado.
 *
 * ═══ POR QUE UM RELÓGIO FIXO NÃO CHEGA ═══
 * De 15 em 15 segundos, o soco cai onde calhar. Se calhar num sítio onde a imagem já
 * mudou, ele soma-se a uma coisa que já estava a acontecer; se o vídeo tiver um trecho de
 * vinte segundos com a mesma família de imagem, ele pode passar ao lado dela.
 *
 * ⚠️ **O RELÓGIO FICA, e é de propósito.** Ele é o piso: garante que o vídeo nunca passa
 * muito tempo sem um soco, mesmo que as imagens estejam a mudar bem. O que se acrescenta
 * é uma PRIMEIRA PASSAGEM que reserva os lugares onde a tela mais tempo fica na mesma
 * família — e essa manda, porque é a queixa que temos medida.
 *
 * ⚠️ **O mínimo de 6 segundos continua a valer para tudo.** Ele é o que impede o soco de
 * deixar de assustar: a lição da metáfora, que a quatro aparições virou papel de parede.
 */
const PARADO_DEMAIS_SEC = 12;

export function socosDoVideoLongo(
  iniciosDeCena: number[],
  totalDeFrames: number,
  fps: number,
  /** A família de imagem de cada cena, na mesma ordem dos arranques. Sem ela, só o relógio. */
  familias: string[] = [],
  /**
   * ═══ 🔴 O PAPEL DE CADA CENA NA HISTÓRIA — 10/08/2026, queixa do dono ═══
   *
   * *"Os socos têm que ser condizente com o que se fala, às vezes percebo que um soco
   * verde está falando de coisas negativas e vice-versa, isso não pode acontecer."*
   *
   * ⚠️ **E ele tem razão porque a cor NUNCA olhou para o texto.** Ela alternava
   * 🔴🟢🔴🟢 por CONTAGEM (`i % 2`), o que dá metade dos socos com a cor errada por
   * construção. Medido neste vídeo: aos 56s um soco VERDE em *"ela lembrou de uma outra
   * conta mais antiga"*, e aos 86s outro verde em *"cada pedaço ficava separado"*.
   *
   * ⚠️ **Isto é VERDADE e não gosto** (`verdade-versus-gosto`): não se pergunta a
   * ninguém se a frase é positiva. O mapa deste canal IMPÕE três atos — o susto, a
   * armadilha e a virada — e cada cena já sabe em que ato vive. A cor lê-se daí.
   *
   * Sem esta lista, volta-se à alternância de antes.
   */
  papeis: Array<'problema' | 'ganho'> = [],
): Array<{ frame: number; tipo: TipoDeImpacto; som: string }> {
  if (!iniciosDeCena.length) return [];
  const passo = Math.round(INTERVALO_DO_SOCO_SEC * fps);
  const minimo = Math.round(MINIMO_ENTRE_SOCOS_SEC * fps);
  // Nunca nos últimos 4 segundos: aí já mandam as telas de marca.
  const limite = totalDeFrames - fps * 4;
  const escolhidos: Array<{ frame: number; tipo: TipoDeImpacto; som: string }> = [];

  const cabe = (f: number) => f > 0 && f < limite && !escolhidos.some((s) => Math.abs(s.frame - f) < minimo);
  const pôr = (f: number) => { escolhidos.push({ frame: f, tipo: 'alerta', som: '' }); };

  /**
   * PRIMEIRA PASSAGEM — os trechos em que a família de imagem não muda.
   * O soco vai para o MEIO do trecho, e não para o princípio: o princípio já é uma
   * mudança (a família acabou de trocar ali) e não precisa de ajuda. Quem precisa é o
   * meio, que é onde quem vê começa a achar que o vídeo parou.
   */
  if (familias.length === iniciosDeCena.length) {
    const trechos: Array<{ de: number; ate: number; meio: number }> = [];
    let inicio = 0;
    for (let i = 1; i <= familias.length; i++) {
      if (i === familias.length || familias[i] !== familias[inicio]) {
        const fimDoTrecho = i < iniciosDeCena.length ? iniciosDeCena[i] : totalDeFrames;
        trechos.push({ de: iniciosDeCena[inicio], ate: fimDoTrecho, meio: iniciosDeCena[Math.floor((inicio + i - 1) / 2)] });
        inicio = i;
      }
    }
    trechos
      .filter((t) => t.ate - t.de >= PARADO_DEMAIS_SEC * fps)
      // ⚠️ Os mais parados primeiro: com o mínimo de 6s, quem chega primeiro fica com o
      //    lugar, e quem tem de ficar com ele é o trecho mais longo.
      .sort((a, b) => (b.ate - b.de) - (a.ate - a.de))
      .forEach((t) => { if (cabe(t.meio)) pôr(t.meio); });
  }

  /** SEGUNDA PASSAGEM — o relógio de sempre, a encher o que sobrou. */
  for (let alvo = passo; alvo < limite; alvo += passo) {
    const perto = iniciosDeCena.reduce(
      (a, b) => (Math.abs(b - alvo) < Math.abs(a - alvo) ? b : a),
      iniciosDeCena[0],
    );
    if (!cabe(perto)) continue;
    pôr(perto);
  }

  /**
   * ⚠️ **A COR DECIDE-SE NO FIM, e tem de ser assim.** Ela alterna 🔴/🟢 pela ORDEM EM QUE
   * OS SOCOS APARECEM no vídeo — se fosse decidida na hora de escolher, a primeira
   * passagem (que escolhe fora de ordem, do trecho mais parado para o menos) daria dois
   * vermelhos seguidos no ecrã. E o que faz o efeito é o contraste, não a repetição.
   */
  escolhidos.sort((a, b) => a.frame - b.frame);
  return escolhidos.map((s, i) => {
    /**
     * ⚠️ **A COR VEM DA CENA EM QUE O SOCO CAI, e não da contagem.** Procura-se a cena
     * cujo arranque é o deste soco (ele cai sempre num arranque, por construção) e
     * lê-se o papel dela. Só quando não há lista de papéis é que se volta a alternar —
     * e aí é uma degradação honesta, não o comportamento normal.
     */
    const cena = iniciosDeCena.indexOf(s.frame);
    const papel = cena >= 0 ? papeis[cena] : undefined;
    const tipo: TipoDeImpacto = papel
      ? (papel === 'ganho' ? 'virada' : 'alerta')
      : (i % 2 === 0 ? 'alerta' : 'virada');
    return { frame: s.frame, tipo, som: tipo === 'alerta' ? 'warning.ogg' : 'kaching.ogg' };
  });
}

/** A versão antiga, guardada só para a prova poder comparar as duas. */
export function socosSoPeloRelogio(
  iniciosDeCena: number[],
  totalDeFrames: number,
  fps: number,
): Array<{ frame: number; tipo: TipoDeImpacto; som: string }> {
  if (!iniciosDeCena.length) return [];
  const passo = Math.round(INTERVALO_DO_SOCO_SEC * fps);
  const minimo = Math.round(MINIMO_ENTRE_SOCOS_SEC * fps);
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
