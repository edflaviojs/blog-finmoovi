/**
 * AS TRÊS CAIXAS DO 9:16 — onde a interface do celular tapa o nosso vídeo.
 *
 * ═══ POR QUE ISTO EXISTE (07/08/2026) ═══
 * Ninguém tinha medido. Renderizou-se um fotograma real do Short do dia
 * (`erros-cartao-credito`, frame 300) e pintou-se por cima o diagrama oficial do
 * Instagram. O resultado, que o dono viu e aprovou consertar:
 *
 *   · a LEGENDA QUEIMADA ficava em y≈1580 — dentro da faixa que a interface tapa;
 *   · a marca d'água, a etiqueta do tema e o selo "APP GRÁTIS" ficavam em y<220 —
 *     também tapados;
 *   · e o miolo da tela, onde a informação devia estar, estava vazio.
 *
 * Fonte dos números: diagrama oficial do Instagram em 1080×1920 — 220px de interface
 * no topo, 450px em baixo, 35px de cada lado, e um trilho de botões (curtir/comentar/
 * partilhar) de 100px à direita, de y≈1160 para baixo. As margens usadas aqui são
 * MAIS conservadoras que as dele no topo (384 > 220) e nos lados (64 > 35).
 *
 * ⚠️ No YouTube Shorts a faixa de baixo é MENOR que a do Instagram, mas existe (o
 * título e o nome do canal moram lá). Como o mesmo MP4 vai aos dois sítios, vale o
 * mais apertado dos dois — respeitar o Instagram serve o YouTube de borla.
 *
 * ═══ COMO SE USA ═══
 * ARTE sangra a tela inteira — o fundo, o brilho, o chão, o corpo do boneco podem e
 * devem passar pelas bordas. **A regra é de POSIÇÃO, não de enquadramento.** Compor
 * "numa janelinha" no meio com faixas mortas em cima e em baixo é o erro oposto, e
 * fica pior que o corte.
 *
 * O que se restringe é só o que a pessoa precisa de LER ou ENTENDER: texto, número,
 * rosto, o ícone-herói, a virada. Isso vive dentro de INFO.
 *
 * A LEGENDA tem faixa própria e ninguém mais entra nela.
 */

/** A tela toda. A arte sangra até aqui — é para isso que ela existe. */
export const ARTE = { x: 0, y: 0, w: 1080, h: 1920 } as const;

/**
 * Onde mora o que precisa de ser LIDO. 952×768 no miolo alto da tela.
 * Fora daqui, texto e número correm o risco de ficar por baixo da interface.
 */
export const INFO = { x: 64, y: 384, w: 952, h: 768 } as const;

/**
 * A faixa da legenda queimada. Nada de informação principal entra aqui.
 *
 * `maxW` de 760 centralizado (x 160..920) é o que desvia do TRILHO DE BOTÕES, que
 * ocupa x 945..1045 a partir de y≈1160 — uma legenda larga e centrada bate nele.
 */
export const LEGENDA = { y: 1152, h: 318, maxW: 760 } as const;

/** O limite de baixo: abaixo disto a interface do celular tapa tudo. */
export const CORTE_INFERIOR = 1470;

/** O limite de cima: acima disto (nome do perfil, estado do telemóvel) idem. */
export const CORTE_SUPERIOR = 220;

/**
 * A distância do fundo da tela até ao fim da faixa de legenda — o número que se
 * escreve num `bottom:` de CSS.
 *
 * ⚠️ **QUEM MANDA NESTE NÚMERO NÃO É A INTERFACE DO CELULAR — SÃO OS NOSSOS PRÓPRIOS
 * ELEMENTOS.** Abaixo da legenda vivem, por esta ordem:
 *
 *   y 1310..1406 → o CARTÃO DE RESULTADO (`CartaoResultado`, em scenes.tsx). Aparece
 *                  em 10 dos 17 roteiros — todos os que têm `intro.counter`.
 *   y 1430..1440 → o TRILHO DE PROGRESSO.
 *   y 1470       → aí sim, o corte da interface.
 *
 * Duas tentativas falhadas, as duas vistas no fotograma e não supostas:
 *   · 520 (fim em y=1400) → a legenda encostava no trilho de progresso;
 *   · 560 (fim em y=1360) → a legenda ficava POR BAIXO do cartão de resultado, que
 *     começa em 1310. Nos 10 vídeos que têm cartão, a legenda ficava tapada — trocar
 *     um sítio mau por outro sítio mau.
 *
 * 630 põe o fim da legenda em **y=1290**, 20px acima do cartão. Com duas linhas ela
 * começa em y≈1100, um pouco acima da faixa teórica, mas bem dentro do que se vê.
 */
export const LEGENDA_BOTTOM = 630; // fim da legenda em y=1290, acima do cartão (1310)
