/**
 * A CAPA DISRUPTIVA (IMPLEMENTACAO20 §21.2 — T1, 01/08/2026).
 *
 * ═══ POR QUE ESTE FICHEIRO EXISTE ═══
 * A abertura tinha 1,5s, era TEXTO MUDO e a voz só começava depois dela. O dono:
 * *"a primeira tela está impossível de entender… só tem 1 segundo e não fala nada."*
 * Quem passa o dedo via um cartaz parado e seguia em frente.
 *
 * Agora a abertura tem 3,5s, a voz entra aos 0,9s (DENTRO da capa) e há uma AÇÃO:
 * uma figura humana que anda, se cansa, tropeça, cai, corre, hesita ou se equilibra
 * — conforme a imagem daquele vídeo.
 *
 * ═══ POR QUE 32 CAPAS E NÃO 8 ═══
 * Decisão do dono em 31/07: *"somente 8 vai ter muita repetição, e o público que
 * acompanha diariamente vai pensar: já vi esse vídeo, vou passar."* Com um vídeo
 * por dia, 8 capas repetiriam a cada 8 dias — e a capa é a ÚNICA coisa que decide
 * se a pessoa para no scroll. É o pior sítio possível para repetir.
 *
 * ═══ O QUE TORNA AS 32 VIÁVEIS ═══
 * O ATOR. É desenhado UMA vez, com articulações de verdade (ombro/cotovelo,
 * anca/joelho), e cada capa é só uma COREOGRAFIA curta sobre peças que já existem.
 * Sem ele, cada capa seria uma figura humana desenhada de novo — trabalho de outra
 * ordem de grandeza e com qualidade desigual.
 *
 * ═══ AS REGRAS DE COMPOSIÇÃO (§20.2, aprendidas na marra em 31/07) ═══
 * 1. Nada quase-preto — o fundo do canal já é #0d1117.
 * 2. O chão tem de SANGRAR para fora do quadro, ou desvanecer. Corte reto lê-se
 *    como caixa.
 * 3. O INSTANTE-CHAVE ACONTECE NO PRIMEIRO TERÇO. Aqui isso é literal: a capa dura
 *    3,5s e o momento (a queda, o susto, o estouro) cai por volta de 1,2s — antes
 *    disso a pessoa ainda está a decidir se fica.
 * 4. Nada de duas formas simétricas por cima de um corpo — o cérebro lê uma cara.
 *    (Foi assim que as alças de uma mochila viraram orelhas de coelho.)
 * 5. Uma curva de Bézier não passa pelo ponto de controlo.
 * 6. Ao tombar peças, o que está deitado não roda como o que está de pé.
 * 7. Um degradê NÃO pinta uma <line> vertical (caixa de largura zero) — usar <rect>.
 *    Mordeu 3× num só dia.
 * 8. Porta que abre não se faz com scale — dobradiça fixa e aresta livre a recuar.
 *
 * ⚠️ OLHE O QUADRO ANTES DE CONFIAR NO CÓDIGO. Das 24 imagens desenhadas em 31/07,
 * ONZE precisaram de correção só depois de VISTAS na galeria — e nenhuma dessas
 * correções teria sido apanhada por teste automático. Para estas capas existe a
 * composição "Capas" (npm run capas).
 */

import React from 'react';
import { interpolate, Easing, useCurrentFrame } from 'remotion';
import { BRAND } from './theme';

// ─── O PALCO ────────────────────────────────────────────────────────────────
// Largura MAIOR que o vídeo (1080) de propósito: o chão tem de sangrar pelos lados
// (regra 2). O que sobra é cortado pelo enquadramento e é isso que se quer.
export const PALCO_W = 1240;
/**
 * ⚠️ A ALTURA É 1400, NÃO 1000 — e isso foi medido, não escolhido. Com 1000 o topo
 * do palco ficava logo acima da cabeça do ator: assim que ele saltava, era atirado
 * ou levantava um braço, a figura era CORTADA pela borda do desenho (visto na
 * galeria: o foguete decapitava o ator). Tudo o que passa do topo desaparece — não
 * há aviso nenhum, o SVG simplesmente corta.
 */
export const PALCO_H = 1560;
// 345px ABAIXO do chão, também de propósito: o buraco, a areia movediça e a água
// precisam de espaço para descer sem baterem na borda de baixo do desenho.
export const CHAO = 1215;
export const MEIO = PALCO_W / 2;

/**
 * O PREENCHIMENTO DAS PEÇAS. Mais claro que o `#2b3242` das imagens do catálogo, e
 * de propósito: ali a peça vive 1-2s no meio do vídeo e o escuro ajuda a não roubar
 * a atenção da fala. Aqui é o contrário — é a peça que tem de parar o dedo de quem
 * está a passar, e a `#2b3242` grande lê-se como um buraco preto no fundo #0d1117
 * (regra 1: nada quase-preto).
 */
export const PECA = '#3a4459';

/** Halo à volta de uma forma — é o que faz a peça "acender" no fundo escuro. */
export const brilho = (cor: string, r = 26) => ({ filter: `drop-shadow(0 0 ${r}px ${cor})` });

/** Progresso 0→1 ao longo da vida da capa. */
export const prog = (frame: number, life: number, de = 0, ate = 1) =>
  interpolate(frame, [life * de, life * ate], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

/** Ponto a partir de uma origem, num ângulo em GRAUS (0 = a apontar para baixo). */
const ponta = (x: number, y: number, ang: number, len: number): [number, number] => {
  const r = (ang * Math.PI) / 180;
  return [x + Math.sin(r) * len, y + Math.cos(r) * len];
};

// ─── O CHÃO ─────────────────────────────────────────────────────────────────
/**
 * REGRA 2 com dentes. Um <line> daria um traço com pontas — e as pontas dentro do
 * quadro leem-se como "isto acabou aqui". Este chão é um <rect> que começa FORA do
 * palco de cada lado e desvanece nas bordas, então nunca há aresta visível.
 */
export const Chao: React.FC<{ y?: number; cor?: string; opacidade?: number }> = ({ y = CHAO, cor = BRAND.cyan, opacidade = 0.8 }) => (
  <>
    <defs>
      <linearGradient id="chao-fade" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor={cor} stopOpacity={0} />
        <stop offset="18%" stopColor={cor} stopOpacity={opacidade} />
        <stop offset="82%" stopColor={cor} stopOpacity={opacidade} />
        <stop offset="100%" stopColor={cor} stopOpacity={0} />
      </linearGradient>
    </defs>
    {/* grosso e aceso: a capa é para PARAR o dedo de quem passa, não para ser discreta */}
    <rect x={-120} y={y} width={PALCO_W + 240} height={16} rx={8} fill="url(#chao-fade)" style={{ filter: `drop-shadow(0 0 22px ${cor})` }} />
  </>
);

// ─── O PALCO COM IMPACTO ────────────────────────────────────────────────────
/**
 * O ENVELOPE DE TODAS AS CAPAS — e é aqui que vive a "extravagância" que o dono
 * pediu em 01/08: *"elas serão algo pra causar disrupção de quem scrola. Então tudo
 * aqui deve ser muito chamativo… o ator tem que ser grande, os ícones e animações,
 * tudo tem que ser meio extravagante."*
 *
 * Faz quatro coisas que nenhuma capa precisa de repetir:
 *  1. ZOOM sobre o ponto de contacto com o chão — tudo cresce sem sair do sítio.
 *  2. HALO por trás da ação, para a figura não morrer no fundo escuro (regra 1).
 *  3. TREMOR de câmara no instante-chave.
 *  4. CLARÃO e ONDA DE CHOQUE no mesmo instante.
 *
 * O instante-chave é `em` (0,34 por omissão = ~1,2s numa capa de 3,5s), que é a
 * regra 3: no primeiro terço, ou a pessoa já passou o dedo.
 */
export const ZOOM_DO_PALCO = 1.22;

export const Palco: React.FC<{
  life: number;
  em?: number;
  focoX?: number;
  focoY?: number;
  children: React.ReactNode;
}> = ({ life, em = 0.34, focoX = MEIO, focoY = CHAO - 300, children }) => {
  const frame = useCurrentFrame();
  const t = life > 0 ? frame / life : 0;

  // tremor: nasce no impacto e morre depressa (quadrático), nunca é ruído de fundo
  const perto = Math.max(0, 1 - Math.abs(t - em) / 0.11);
  const forca = perto * perto;
  const dx = Math.sin(frame * 3.1) * 22 * forca;
  const dy = Math.cos(frame * 2.7) * 17 * forca;

  // clarão: MUITO curto (~4 frames) e FRACO.
  // ⚠️ Medido na galeria: a 0,34 de opacidade sobre o palco inteiro, o clarão LAVAVA
  // exatamente o frame que interessa — o instante-chave ficava leitoso e não se via
  // nem o ator nem o objeto. O efeito que era para dar soco estava a apagar o soco.
  // Agora é um brilho RADIAL centrado na ação, fraco, e nunca um retângulo cheio.
  const clarao = Math.max(0, 1 - Math.abs(t - em) / 0.04);
  /**
   * ⚠️ NÃO HÁ ONDA DE CHOQUE, e a ausência é deliberada.
   * Tentei um anel a expandir a partir do impacto. Na galeria, nas 32 capas, ele
   * lia-se como um ARO AMARELO PARADO no meio do ecrã — um objeto a mais na cena,
   * não um choque. Um anel perfeito e centrado é sempre lido como coisa, nunca como
   * energia. O soco vem do TREMOR e do CLARÃO, que não desenham forma nenhuma.
   */

  return (
    <svg width={PALCO_W} height={PALCO_H}>
      <defs>
        <radialGradient id="palco-halo">
          <stop offset="0%" stopColor={BRAND.violet} stopOpacity={0.34} />
          <stop offset="60%" stopColor={BRAND.violet} stopOpacity={0.1} />
          <stop offset="100%" stopColor={BRAND.violet} stopOpacity={0} />
        </radialGradient>
        <radialGradient id="palco-clarao">
          <stop offset="0%" stopColor={BRAND.yellow} stopOpacity={0.85} />
          <stop offset="45%" stopColor={BRAND.yellow} stopOpacity={0.25} />
          <stop offset="100%" stopColor={BRAND.yellow} stopOpacity={0} />
        </radialGradient>
      </defs>
      <ellipse cx={MEIO} cy={CHAO - 380} rx={720} ry={620} fill="url(#palco-halo)" />

      {/* o zoom é ancorado no chão: tudo cresce mas ninguém levita */}
      <g transform={`translate(${MEIO + dx} ${CHAO + dy}) scale(${ZOOM_DO_PALCO}) translate(${-MEIO} ${-CHAO})`}>
        {children}
      </g>

      {clarao > 0 && (
        <ellipse cx={focoX} cy={focoY} rx={620} ry={560} fill="url(#palco-clarao)" opacity={0.55 * clarao * clarao} />
      )}
    </svg>
  );
};

// ─── O ATOR ─────────────────────────────────────────────────────────────────
/**
 * Medidas, com o PÉ em y=0 (o ator é sempre desenhado a partir do chão):
 *   cabeça r 56 · ombro y = -435 · anca y = -220 · pé y = 0 → ~547px de altura.
 * Braço: ombro → cotovelo (98) → mão (98).  Perna: anca → joelho (110) → pé (110).
 *
 * ⚠️ O TAMANHO FOI MEDIDO NA GALERIA, não escolhido. A 1ª versão tinha 392px: num
 * ecrã de 1920 isso são 19% da altura, e na folha de contacto o ator lia-se como um
 * insetozinho ao lado do objeto. A 547px fica em ~27%, que é o que faz uma pessoa
 * parecer uma pessoa a passar o dedo no telemóvel.
 *
 * Todos os ângulos em GRAUS, **0 = a pender a direito para BAIXO**, positivo = para
 * a DIREITA (o sentido em que o ator caminha por omissão).
 *
 * ⚠️ ERRO JÁ PAGO, não o repita: na 1ª versão os membros eram calculados a partir de
 * `180 - ângulo`, o que os fazia sair da anca e do ombro **para CIMA**, por cima do
 * tronco. As 32 capas saíram com figuras que pareciam rabiscos a flutuar — e
 * compilava tudo na perfeição. Só se viu ao OLHAR a galeria.
 *
 * ⚠️ REGRA 4: nada de duas formas simétricas por cima do tronco. Por isso os braços
 * NUNCA recebem o mesmo ângulo por omissão — há sempre uma diferença de fase — e
 * qualquer adereço que se ponha nos ombros (mochila, guarda-chuva) tem de ser
 * assimétrico ou ficar de um lado só.
 */
export type Pose = {
  x?: number;          // posição no palco (centro dos pés)
  chaoY?: number;      // y dos pés (por omissão, o chão)
  sobe?: number;       // sobe o corpo todo (saltar, ser atirado, afundar com sinal -)
  inclina?: number;    // rotação do corpo inteiro, em torno dos pés
  escala?: number;
  // braço A = o de TRÁS (desenhado antes do tronco, fica por baixo)
  ombroA?: number; cotoveloA?: number;
  ombroB?: number; cotoveloB?: number;
  ancaA?: number; joelhoA?: number;
  ancaB?: number; joelhoB?: number;
  cabeca?: number;     // inclinação da cabeça
  encolhe?: number;    // 0..1 — agacha (encurta pernas e baixa o tronco)
  opacidade?: number;
};

const POSE_BASE: Required<Omit<Pose, 'x' | 'chaoY'>> = {
  sobe: 0, inclina: 0, escala: 1,
  ombroA: 14, cotoveloA: 10, ombroB: -12, cotoveloB: 16,
  ancaA: 8, joelhoA: 4, ancaB: -8, joelhoB: 6,
  cabeca: 0, encolhe: 0, opacidade: 1,
};

export const Ator: React.FC<Pose & { id?: string }> = (p) => {
  const o = { ...POSE_BASE, ...p };
  const x = p.x ?? MEIO;
  const chaoY = p.chaoY ?? CHAO;
  const uid = p.id || 'ator';

  // o agachamento encurta as pernas e baixa a anca: é o que faz o "peso"
  const encolhe = Math.max(0, Math.min(1, o.encolhe));
  const coxa = 130 - encolhe * 40;
  const canela = 130 - encolhe * 40;
  const ancaY = -(coxa + canela);
  const troncoLen = 265;
  const ombroY = ancaY - troncoLen;
  const cabecaY = ombroY - 74;
  const BRACO = 118;

  // ⚠️ ÂNGULO DIRETO (0 = para baixo). Ver o aviso do erro já pago, acima.
  // O joelho dobra para TRÁS (calcanhar em direção ao rabo) → `anca - joelho`.
  // O cotovelo dobra para a FRENTE (mão em direção ao peito) → `ombro + cotovelo`.
  const [joelhoAx, joelhoAy] = ponta(0, ancaY, o.ancaA, coxa);
  const [peAx, peAy] = ponta(joelhoAx, joelhoAy, o.ancaA - o.joelhoA, canela);
  const [joelhoBx, joelhoBy] = ponta(0, ancaY, o.ancaB, coxa);
  const [peBx, peBy] = ponta(joelhoBx, joelhoBy, o.ancaB - o.joelhoB, canela);

  const [cotAx, cotAy] = ponta(0, ombroY, o.ombroA, BRACO);
  const [maoAx, maoAy] = ponta(cotAx, cotAy, o.ombroA + o.cotoveloA, BRACO);
  const [cotBx, cotBy] = ponta(0, ombroY, o.ombroB, BRACO);
  const [maoBx, maoBy] = ponta(cotBx, cotBy, o.ombroB + o.cotoveloB, BRACO);

  // ⚠️ O NOME DO DEGRADÊ LEVA O PREFIXO "ator-" DE PROPÓSITO.
  // Na 1ª versão era `${uid}-g`, e como cada capa chama o ator com as iniciais da
  // imagem ("es" no escorregão) o nome batia certo com o degradê do PRÓPRIO objeto
  // ("es-g", a mancha escorregadia). Num SVG o último com o mesmo nome ganha: o ator
  // saía pintado com a cor do objeto. Acontecia em 27 das 32 capas.
  const grad = `ator-${uid}`;
  const membro = { fill: 'none', stroke: `url(#${grad})`, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  /**
   * A SOMBRA DE CONTACTO — a correção com mais efeito de todo o dia.
   *
   * MEDIDO na galeria: em quase metade das 32 capas o ator parecia FLUTUAR. A culpa
   * não era das poses: é que uma figura inclinada, num fundo escuro, sem nada a
   * ligá-la ao chão, lê-se sempre como suspensa no ar. Bastou uma elipse escura
   * debaixo dos pés para o corpo "assentar".
   * Fica FORA da rotação de propósito — uma sombra não se inclina com o corpo, ela
   * vive no chão. E encolhe/desvanece quando ele salta (`sobe`), que é o que diz ao
   * olho a que altura ele está.
   */
  const alturaSalto = Math.max(0, o.sobe);
  const sombraFade = Math.max(0.12, 1 - alturaSalto / 420);
  const sombraR = 150 * o.escala * (0.6 + 0.4 * sombraFade);

  return (
    <g opacity={o.opacidade}>
      <ellipse cx={x} cy={chaoY + 14} rx={sombraR} ry={sombraR * 0.2} fill="#05070b" opacity={0.55 * sombraFade} />
      <g
      transform={`translate(${x} ${chaoY - o.sobe}) rotate(${o.inclina}) scale(${o.escala})`}
      // ⚠️ O halo destaca a figura do fundo escuro, mas COM CONTA: a 30px+70px a
      // silhueta perdia-se dentro do próprio brilho e o ator lia-se como um tubo de
      // néon sem forma. É a diferença entre "chamativo" e "borrado".
      style={{ filter: `drop-shadow(0 0 14px rgba(34,211,238,0.75))` }}
    >
      <defs>
        {/**
         * ⚠️ `gradientUnits="userSpaceOnUse"` NÃO É DETALHE — É A REGRA 7.
         *
         * Por omissão um degradê é medido pela CAIXA da forma que ele pinta. O TRONCO
         * é uma linha perfeitamente vertical: a caixa dela tem largura ZERO, o degradê
         * colapsa e o tronco NÃO É PINTADO. Resultado, visto na galeria: o ator tinha
         * cabeça, braços e pernas (todos diagonais, logo com caixa) e um VAZIO no meio.
         * Parecia uma cabeça a flutuar por cima de umas pernas — e compilava, e passava
         * em qualquer teste.
         *
         * É a mesma regra que já tinha apagado a estrada da bifurcação e o traço do
         * escudo em 31/07. Aí resolveu-se trocando a linha por um <rect>; aqui, como
         * são membros com articulações, resolve-se fixando o degradê ao ESPAÇO do
         * desenho em vez de à caixa de cada forma. Uma vez, para todos os membros.
         */}
        <linearGradient id={grad} gradientUnits="userSpaceOnUse" x1={-140} y1={0} x2={140} y2={ombroY}>
          <stop offset="0%" stopColor={BRAND.cyan} />
          <stop offset="100%" stopColor={BRAND.violet} />
        </linearGradient>
      </defs>
      {/* braço e perna de TRÁS primeiro, mais apagados — dá profundidade sem cor nova */}
      <g opacity={0.55}>
        <path d={`M0,${ancaY} L${joelhoAx},${joelhoAy} L${peAx},${peAy}`} {...membro} strokeWidth={38} />
        <path d={`M0,${ombroY} L${cotAx},${cotAy} L${maoAx},${maoAy}`} {...membro} strokeWidth={29} />
      </g>
      {/* tronco */}
      <path d={`M0,${ancaY} L0,${ombroY}`} {...membro} strokeWidth={50} />
      {/* perna e braço da FRENTE */}
      <path d={`M0,${ancaY} L${joelhoBx},${joelhoBy} L${peBx},${peBy}`} {...membro} strokeWidth={38} />
      <path d={`M0,${ombroY} L${cotBx},${cotBy} L${maoBx},${maoBy}`} {...membro} strokeWidth={29} />
      {/* cabeça — UMA forma só (regra 4: sem par de olhos, sem duas manchas iguais) */}
      <circle cx={Math.sin((o.cabeca * Math.PI) / 180) * 22} cy={cabecaY} r={68} fill={`url(#${grad})`} />
      </g>
    </g>
  );
};

// ─── OS ANDAMENTOS (poses reutilizáveis) ────────────────────────────────────
// Cada um devolve uma Pose parcial. A capa junta-lhes a posição e os adereços.

/** Andar normal. `f` = fase contínua (frame/6 costuma dar um passo natural). */
export const andar = (f: number): Pose => ({
  ancaA: Math.sin(f) * 26, joelhoA: 10 + Math.max(0, Math.sin(f)) * 22,
  ancaB: -Math.sin(f) * 26, joelhoB: 10 + Math.max(0, -Math.sin(f)) * 22,
  ombroA: -Math.sin(f) * 20, cotoveloA: 14,
  ombroB: Math.sin(f) * 20, cotoveloB: 14,
  inclina: 2,
});

/** Andar CANSADO, curvado sob peso. `peso` 0→1 dobra as costas e encurta o passo. */
export const arrastar = (f: number, peso = 1): Pose => ({
  ancaA: Math.sin(f) * 15, joelhoA: 16 + Math.max(0, Math.sin(f)) * 16,
  ancaB: -Math.sin(f) * 15, joelhoB: 16 + Math.max(0, -Math.sin(f)) * 16,
  ombroA: -6 - Math.sin(f) * 8, cotoveloA: 26,
  ombroB: 4 + Math.sin(f) * 8, cotoveloB: 30,
  inclina: 10 + peso * 12,
  cabeca: 8,
  encolhe: 0.18 + peso * 0.22,
});

/** Correr — passada aberta, tronco à frente, braços a bombear. */
export const correr = (f: number): Pose => ({
  ancaA: Math.sin(f) * 46, joelhoA: 18 + Math.max(0, Math.sin(f)) * 46,
  ancaB: -Math.sin(f) * 46, joelhoB: 18 + Math.max(0, -Math.sin(f)) * 46,
  ombroA: -30 - Math.sin(f) * 42, cotoveloA: 62,
  ombroB: 30 + Math.sin(f) * 42, cotoveloB: 62,
  inclina: 16,
  cabeca: -4,
});

/** Tropeçar: pé da frente travado, tronco a passar à frente dos pés, braços a subir. */
export const tropecar = (t: number): Pose => ({
  ancaB: 28, joelhoB: 10,          // perna da frente PLANTADA (é ela que trava)
  ancaA: -34, joelhoA: 40,         // a de trás fica para trás, calcanhar no ar
  ombroA: -110 - t * 30, cotoveloA: -20,
  ombroB: 78 + t * 34, cotoveloB: 24,
  inclina: 14 + t * 26,
  cabeca: -10,
  encolhe: 0.1,
});

/**
 * CAIR. `t` 0→1. Roda o corpo em torno dos pés até ficar deitado e desce a anca.
 * ⚠️ Regra 6: quem está a cair NÃO roda como quem está de pé — por isso a rotação
 * acelera (ease-in), como um corpo que perde o apoio, e não é linear.
 */
export const cair = (t: number): Pose => {
  const e = Easing.in(Easing.quad)(Math.max(0, Math.min(1, t)));
  return {
    /**
     * ⚠️ A INCLINAÇÃO PÁRA NOS 42°, e isto foi medido no vídeo, não escolhido.
     * A 1ª versão ia até 86°. Como o corpo roda em torno dos PÉS, um tronco de 750px
     * deitado a 86° manda a cabeça ~750px para o lado — e o ator saía LITERALMENTE
     * fora do quadro. Na galeria via-se a mochila a cair sozinha, sem ninguém.
     * Uma queda lê-se pelo AGACHAMENTO (as ancas a bater no chão) tanto quanto pela
     * rotação — por isso `encolhe` vai a 0,85 e a inclinação fica pelos 42°.
     */
    inclina: 24 + e * 8,
    ancaA: -10 + e * 30, joelhoA: 30 + e * 84,
    ancaB: 20 - e * 4, joelhoB: 34 + e * 90,
    // os braços vão à frente para amparar a queda
    ombroA: 46 + e * 52, cotoveloA: -14,
    ombroB: 70 + e * 34, cotoveloB: 18,
    cabeca: -14,
    encolhe: 0.15 + e * 0.77,
  };
};

/** Hesitar — o peso passa de um pé ao outro, mão ao queixo. */
export const hesitar = (f: number): Pose => ({
  ancaA: 12 + Math.sin(f / 2) * 6, joelhoA: 10,
  ancaB: -14 + Math.sin(f / 2) * 6, joelhoB: 14,
  ombroA: 10, cotoveloA: 10,
  ombroB: 54, cotoveloB: 96,     // a mão sobe ao queixo
  inclina: Math.sin(f / 2) * 4,
  cabeca: 6,
  encolhe: 0.06,
});

/** Equilibrar-se — braços abertos na horizontal, um pé à frente do outro. */
export const equilibrar = (f: number): Pose => ({
  ancaA: 16, joelhoA: 6,
  ancaB: -10, joelhoB: 10,
  ombroA: -92 + Math.sin(f / 3) * 12, cotoveloA: 4,
  ombroB: 92 + Math.sin(f / 3 + 1) * 12, cotoveloB: -4,
  inclina: Math.sin(f / 4) * 5,
  encolhe: 0.12,
});

/** Empurrar / esforçar-se contra alguma coisa à frente. */
export const empurrar = (t: number): Pose => ({
  ancaA: -30, joelhoA: 6,          // perna de trás ESTICADA a fazer força
  ancaB: 22, joelhoB: 34,          // perna da frente dobrada
  ombroA: 74 + t * 8, cotoveloA: -6,
  ombroB: 84 + t * 8, cotoveloB: -10,
  inclina: 22 + t * 6,
  cabeca: -6,
  encolhe: 0.2,
});

/** Subir um degrau — joelho da frente ALTO, tronco à frente. */
export const subir = (f: number): Pose => ({
  ancaA: -14, joelhoA: 8,                                    // perna de apoio
  ancaB: 52 + Math.max(0, Math.sin(f)) * 14, joelhoB: 82,    // joelho alto à frente
  ombroA: -40, cotoveloA: 30,
  ombroB: 44, cotoveloB: 24,
  inclina: 13,
  encolhe: 0.14,
});

/** Levar um golpe / ser atirado para trás. */
export const atingido = (t: number): Pose => ({
  // ⚠️ UM PÉ FICA NO CHÃO. Na 1ª versão as duas pernas voavam para a frente e o
  // corpo caía 36° para trás: o conjunto lia-se como alguém a LEVITAR, não a levar
  // um encontrão. Agora só a perna da frente é projetada; a de trás trava.
  ancaA: -18 - t * 10, joelhoA: 12,
  ancaB: 30 + t * 24, joelhoB: 40,
  ombroA: -54 - t * 62, cotoveloA: -30,   // os braços para TRÁS
  ombroB: -26 - t * 48, cotoveloB: -40,
  inclina: -10 - t * 14,
  cabeca: -18,
  encolhe: 0.14,
});

/** Afundar — braços para cima, corpo a descer a direito.
 *  ⚠️ Regra 4: os dois braços NÃO são o espelho um do outro — dois arcos iguais por
 *  cima de um corpo leem-se como uma cara. */
export const afundar = (t: number): Pose => ({
  ancaA: 10, joelhoA: 6, ancaB: -10, joelhoB: 8,
  ombroA: -158, cotoveloA: -14,
  ombroB: 132, cotoveloB: 26,
  inclina: Math.sin(t * 9) * 4,
  cabeca: -8,
});

/** Esticar-se para alcançar alguma coisa em cima/à frente. */
export const alcancar = (t: number): Pose => ({
  ancaA: 24, joelhoA: 8, ancaB: -20, joelhoB: 22,
  ombroA: -30, cotoveloA: 20,
  ombroB: 132 + t * 16, cotoveloB: 8,
  inclina: 12 + t * 6,
  cabeca: -12,
  encolhe: 0.08,
});

/** Olhar para cima, parado, de braços caídos (assombro / a ver passar). */
export const olharCima = (f: number): Pose => ({
  ancaA: 8, joelhoA: 4, ancaB: -8, joelhoB: 6,
  ombroA: 16 + Math.sin(f / 6) * 3, cotoveloA: 8,
  ombroB: -14, cotoveloB: 12,
  inclina: -6,
  cabeca: -22,
});

/** Encolher-se sob alguma coisa (chuva, golpe iminente). */
export const encolherSe = (t: number): Pose => ({
  ancaA: 14, joelhoA: 18, ancaB: -14, joelhoB: 22,
  // ⚠️ Regra 4: propositadamente desiguais (ângulos e dobras diferentes) — dois
  // braços em espelho por cima da cabeça formam a silhueta de umas orelhas.
  ombroA: -26, cotoveloA: 96,
  ombroB: 30, cotoveloB: 78,
  inclina: 8,
  cabeca: 14,
  encolhe: 0.3 + t * 0.14,
});
