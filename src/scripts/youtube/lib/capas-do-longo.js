/**
 * 🔴 A CAPA DE CADA VÍDEO LONGO TEM DE SER OUTRA CAPA — 09/08/2026.
 *
 * ═══ POR QUE ISTO EXISTE ═══
 * Palavras do dono, ao ver a segunda miniatura: *"vejo que ele gerou uma thumb muito
 * parecida com a thumb do vídeo passado… ou seja, ele não está diversificando!"*
 *
 * E estava certo. Postas lado a lado, as duas primeiras capas do canal são **a mesma
 * imagem com outro texto**:
 *
 * | | vídeo 1 | vídeo 2 |
 * |---|---|---|
 * | composição | divisória vertical ao centro | idêntica |
 * | seta vermelha a descer à esquerda | sim | sim |
 * | seta verde a subir à direita | sim | sim |
 * | selo verde à direita | "3 PASSOS" | "3 PASSOS" |
 * | objeto | notas de cem reais | notas de cem reais |
 *
 * A causa é a mesma família de defeito que já mordeu o título e as fotografias: **o
 * pedido estava escrito à mão, uma vez, e servia para todos os vídeos.**
 *
 * ═══ A SOLUÇÃO ESTAVA JÁ CONSTRUÍDA, E NINGUÉM A USAVA ═══
 * Cada vídeo longo **já escolhe uma metáfora** (`fioCondutor`) de um catálogo de 33,
 * cada uma com o significado escrito — e a janela anti-repetição **já garante** que ela
 * é diferente das dos últimos 6 vídeos. O vídeo 1 escolheu `mochila-pedras`, o vídeo 2
 * escolheu `ampulheta`. **Nenhuma das duas apareceu na capa.**
 *
 * Portanto a regra nova é uma frase: **a capa É a metáfora do vídeo.** Não é preciso
 * inventar um sistema anti-repetição novo — herda-se o que já existe e já funciona.
 *
 * ═══ E O MOLDE TAMBÉM RODA — INCLUINDO O "ANTES E DEPOIS" ═══
 * Só trocar o objeto não chegava: 32 objetos dentro do mesmo enquadramento continuariam
 * a parecer-se. E o dono foi mais longe, na mesma conversa: *"essa capa também está com
 * o molde de comparação tipo antes e depois, e isso também tem que ser dinâmico — **não
 * é toda capa que vai dar certo nesse estilo**"*.
 *
 * Ele tem razão e é a peça que faltava: **o antes/depois é ele próprio a coisa
 * repetitiva**. Por isso há **seis moldes**, e **só um deles compara**. 32 × 6 = 192
 * capas possíveis antes de a primeira se repetir.
 *
 * ⚠️ **A ESCOLHA É DETERMINISTA, e isso não é preciosismo.** O mesmo vídeo pedido duas
 * vezes tem de dar a mesma capa — senão refazer um vídeo muda-lhe a cara, e é a mesma
 * regra que governa as fotografias. O molde sai do NOME do vídeo, não de um sorteio.
 *
 * ═══ O QUE NÃO RODA, E É DE PROPÓSITO ═══
 * A paleta do canal, a logo, o contraste extremo e a legibilidade a 300 px num telemóvel.
 * Isso é a MARCA — se variar, o canal deixa de se reconhecer na lista. O que varia é a
 * cena; o que fica é a assinatura.
 */

import { writeFileSync } from 'node:fs';
import { lerCaderno, CADERNO_DE_CENARIOS } from './cenarios-do-longo.js';

/**
 * A CENA DE CADA METÁFORA — o que a capa mostra quando o vídeo escolhe esse fio.
 *
 * ⚠️ **Escritas à mão, uma por uma, e em inglês** porque é a língua em que o gerador de
 * imagem entende melhor o que se lhe pede. O texto que aparece NA imagem é sempre
 * português, e isso está no pedido principal.
 *
 * ⚠️ **Nenhuma tem pessoas**, e é regra do canal desde 04/08: o ecossistema é anónimo.
 * Mãos só quando o pedido as pedir de propósito.
 */
export const CENA_DA_CAPA = {
  'bola-neve': 'a colossal snowball made of crumpled banknotes and coins, thundering downhill and growing as it goes, leaving a deep trail carved behind it',
  avalanche: 'a mountainside of stacked bills and paper statements collapsing all at once in a roaring white-and-red avalanche',
  escorregao: 'a glossy floor of scattered coins where a single banknote slips out from under a stack, the whole pile beginning to tip',
  foguete: 'a rocket built from tightly rolled banknotes blasting off a launch pad of stacked coins, exhaust flaring cyan and violet',
  semente: 'a single sprouting seedling pushing out of dark soil, its leaves formed from folded banknotes, one small coin half-buried beside it',
  'montanha-russa': 'a roller-coaster track made of a jagged financial line chart, a cart of coins cresting the highest peak about to plunge',
  bolha: 'a giant iridescent soap bubble with banknotes suspended inside it, its surface already splitting at one point',
  ralo: 'a wide-open drain in a dark reflective floor, banknotes and coins spiralling down into it in a tight vortex',
  ampulheta: 'a towering hourglass whose falling sand is made of tiny gold coins, the upper chamber almost empty and the lower one overflowing',
  balanca: 'an old brass balance scale, one pan heaped with coins and the other holding a single glowing folded banknote, tilting hard',
  'bola-de-ferro': 'a heavy iron ball and chain resting on a cracked floor, the chain links formed from interlocking credit cards',
  'guarda-chuva': 'a wide open umbrella of glowing cyan glass shielding a neat stack of banknotes from a hard downpour of falling coins',
  ratoeira: 'a steel mousetrap snapping shut on a single folded banknote used as bait, on a dark reflective surface',
  'mochila-pedras': 'a worn backpack split open, spilling heavy grey stones, each stone marked with a faint currency symbol',
  'areia-movedica': 'a stack of banknotes sinking into swirling quicksand, only the top corner still above the surface',
  domino: 'a long curving line of domino tiles made from credit cards, the first three already toppling into the next',
  'castelo-cartas': 'a tall fragile house of cards built entirely from credit cards, the bottom card sliding out',
  gangorra: 'a seesaw with a heap of coins on one end and a single large banknote on the other, caught mid-swing',
  'corda-bamba': 'a tightrope stretched across a dark chasm, a stack of coins balanced precariously at its centre with no safety net below',
  relogio: 'a huge wall clock whose hands are made of banknotes, sweeping fast, with coins falling out of its face',
  vela: 'a thick candle burning down fast, its wax dripping as molten coins onto a dark surface',
  'trem-perdido': 'an empty station platform at night, the tail lights of a departing train streaking away, a dropped banknote left on the platform',
  bifurcacao: 'a road splitting in two at a sharp fork, one branch cracked and dark red, the other smooth and glowing green',
  'duas-portas': 'two heavy doors side by side in a dark wall, one ajar with red light spilling out, the other ajar with green light',
  semaforo: 'a traffic light standing alone on a dark reflective street, the red and the green lamps both blazing at once',
  cofre: 'a heavy steel safe with its door swinging open, warm light and neat stacks of banknotes glowing inside',
  escudo: 'a broad glowing shield of cyan glass absorbing a barrage of red arrows, coins stacked safely behind it',
  boia: 'a bright life ring floating on dark choppy water, a bundle of banknotes held safely inside its centre',
  escada: 'a staircase climbing out of darkness, each step a thicker stack of banknotes than the one before',
  'balde-furado': 'a metal bucket being filled with coins from above while a stream of them pours out through a hole near its base',
  buraco: 'a deep hole dug into dark ground, a shovel stuck upright beside it and banknotes scattered around the rim',
  fumaca: 'banknotes curling and dissolving into thick drifting smoke, only ash falling to the dark floor below',
};

/**
 * OS SEIS MOLDES — o enquadramento.
 *
 * 🔴 **SÓ UM DELES É UMA COMPARAÇÃO, e essa é a correcção mais importante deste ficheiro.**
 *
 * Palavras do dono, 09/08/2026: *"essa capa também está com o molde de comparação tipo
 * antes e depois, e isso também tem que ser dinâmico — não é toda capa que vai dar certo
 * nesse estilo."*
 *
 * A minha primeira versão tinha **dois moldes de comparação em quatro** (o `antes-depois`
 * e um `duas-vias` que era a mesma ideia com outro nome). Ele apanhou-a antes de eu a
 * mandar. **O antes/depois é ele próprio a coisa repetitiva** — não basta trocar o
 * objeto dentro dele.
 *
 * ⚠️ **E o vermelho-mau / verde-bom é parte do mesmo vício.** Só dois moldes o usam. Uma
 * ampulheta a esvaziar-se não tem "lado bom"; um cofre a abrir não tem "lado mau".
 * Forçar a dualidade em toda a capa é o que as faz parecerem-se todas.
 *
 * ⚠️ `antes-depois` **fica**, e de propósito: funciona, e é o que o dono aprovou. O
 * defeito não era ele existir — era ser o único.
 *
 * Cada molde traz também os seus **selos**, porque a arrumação deles é parte do
 * enquadramento: dois selos nos cantos de cima ficam bem numa comparação e estragam um
 * grande plano.
 */
export const MOLDES = [
  {
    nome: 'antes-depois',
    // O único que compara. Um em seis.
    desenho: (cena) => `COMPOSITION — a dramatic BEFORE / AFTER split divided by a bright vertical shard of light down the centre. LEFT HALF, THE BEFORE: ${cena}, lit hard from below in angry red, dissolving into shadow. RIGHT HALF, THE AFTER: the same subject resolved, calm and orderly on a glossy reflective surface, lit in the channel's cyan and violet, with one bright green upward arrow rising out of it.`,
    selos: 'one badge in the upper-left corner and one in the upper-right, small and tight',
  },
  {
    nome: 'heroi-central',
    desenho: (cena) => `COMPOSITION — ONE hero object filling the centre of the frame, enormous and unmissable: ${cena}. Rimmed in cyan and violet neon against near-black. Everything around it reacts to it — shockwave rings in the floor, drifting particles, a faint grid bending toward it. NO split, NO second half, NO before-and-after: the object IS the image.`,
    selos: 'a single badge low in the left third, resting on the floor plane',
  },
  {
    nome: 'a-queda',
    desenho: (cena) => `COMPOSITION — a strong top-left to bottom-right diagonal of falling motion. ${cena}, entering high on the left and cascading down across the frame, breaking apart as it falls, with motion blur along the diagonal. The bottom-right corner is dark, deep and empty — the place it is falling into. NO split, NO comparison.`,
    selos: 'a single badge in the lower-left, tilted slightly with the fall',
  },
  {
    nome: 'o-detalhe',
    desenho: (cena) => `COMPOSITION — an extreme macro close-up, shallow depth of field, of ONE small telling detail of this scene: ${cena}. Fill the frame with that detail — texture, edge, fibre, the exact point where it gives way. The rest of the scene is a soft dark bokeh behind it. Cinematic, quiet, uncomfortable. NO split, NO arrows, NO comparison.`,
    selos: 'a single badge in the upper-left, floating clear of the subject',
  },
  {
    nome: 'o-cerco',
    desenho: (cena) => `COMPOSITION — one small subject alone at the centre, dwarfed and closed in on: ${cena}, but rendered SMALL, and around it, filling the whole frame and pressing inward from every edge, a dense encircling mass of banknotes, statements and coins in cold violet and indigo. Deep vignette. The centre is the only lit thing. NO split, NO before-and-after.`,
    selos: 'a single badge tight in the upper-right corner',
  },
  {
    nome: 'a-revelacao',
    desenho: (cena) => `COMPOSITION — something being uncovered. ${cena}, shown at the exact instant it is opened, lifted or broken into, with warm light pouring out of the opening and cutting across the dark frame in hard volumetric beams. The light is the subject as much as the object is. NO split, NO red-versus-green.`,
    selos: 'a single badge in the lower-right, catching the edge of the light',
  },
];

/**
 * Qual molde este vídeo usa.
 *
 * ⚠️ **Determinista pelo nome do vídeo**, e nunca por sorteio nem pela hora: o mesmo
 * vídeo pedido duas vezes tem de dar a mesma capa. É a mesma regra que já governa as
 * fotografias, e existe porque refazer um vídeo não pode mudar-lhe a cara.
 *
 * ⚠️ Os moldes gastos nos vídeos recentes são **evitados, não proibidos**. Se todos
 * estiverem gastos, escolhe-se à mesma — uma capa parecida é melhor do que capa nenhuma,
 * e é a regra da casa desde 09/08.
 */
export function escolherMolde(slug, gastos = []) {
  const livres = MOLDES.filter((m) => !gastos.includes(m.nome));
  const lista = livres.length ? livres : MOLDES;
  let soma = 0;
  for (const c of String(slug || '')) soma = (soma + c.codePointAt(0)) % 100000;
  return lista[soma % lista.length];
}

/** A cena da metáfora deste vídeo, ou a de reserva se o fio não for conhecido. */
export function cenaDoFio(fio) {
  return CENA_DA_CAPA[String(fio || '')]
    // ⚠️ A reserva NÃO é o vazio: é uma cena que serve a qualquer tema de dinheiro.
    // Uma capa sem objeto nenhum seria pior do que uma capa genérica.
    || 'a tall stack of banknotes and coins on a dark reflective surface, half of it lit red and half of it lit green';
}

/**
 * O CADERNO DOS MOLDES — vive no MESMO ficheiro que o das cenas.
 *
 * ⚠️ **Um caderno só, e não dois.** Dois ficheiros a dizer coisas sobre os mesmos vídeos
 * divergem no dia em que um deles não for gravado — e foi exactamente isso que aconteceu
 * com `longo-cenarios.json`, que o robô escrevia e nunca comitava. Um sítio, um `git add`.
 */
/**
 * ═══ 🔴 O MOLDE REPETIA DENTRO DA JANELA — 10/08/2026, medido ═══
 *
 * ═══ O QUE SE MEDIU ═══
 * Simulados seis vídeos seguidos a partir do caderno real, o molde `heroi-central` saiu
 * no **1º e no 6º**. A história (cena, elenco, função, metáfora) não repetia nenhuma vez;
 * só a capa é que repetia. Ou seja: **o vídeo era novo e a miniatura já tinha sido vista.**
 *
 * ═══ A CAUSA, E ERA UM NÚMERO ═══
 * Esta janela olhava **três** vídeos para trás enquanto tudo o resto olha
 * `RAIO_DE_CENARIOS` (**seis**) — e há exactamente **seis moldes**. Com três proibidos,
 * sobravam três livres e um deles voltava cedo demais.
 *
 * ⚠️ **Fica em CINCO e não em seis, e a diferença importa.** Com cinco proibidos sobra
 * sempre um molde livre, e é esse que sai: os seis moldes passam a rodar em ciclo e
 * **nenhum se repete dentro de seis vídeos**. Com seis proibidos não sobraria nenhum, a
 * lista caía toda para "então escolhe à mesma", e voltava-se ao princípio.
 *
 * **Medido depois do conserto:** a menor distância entre duas capas do mesmo molde passou
 * de **5** para **6** vídeos. Doze vídeos simulados, zero repetições dentro da janela.
 */
const RAIO_DE_MOLDES = 5;

export function moldesGastos({ caderno = lerCaderno(), raio = RAIO_DE_MOLDES, slug = null } = {}) {
  /**
   * ═══ 🔴 O VÍDEO NÃO CONTA CONTRA SI PRÓPRIO — 10/08/2026 ═══
   *
   * ⚠️ **É a armadilha que o comentário do elenco diz que "já mordeu duas vezes nesta
   * casa" — e esta função era a terceira vez, por falta da mesma linha.**
   *
   * Pedir a capa do mesmo vídeo outra vez lia o caderno **com a linha dele lá dentro**, e
   * via como gasto o molde que ele próprio tinha escolhido na tentativa anterior.
   * Medido: `heroi-central` na 1ª vez, `antes-depois` na 2ª — o que contradiz, com a capa
   * já paga, a regra escrita em cima nesta mesma função: *"o mesmo vídeo pedido duas
   * vezes tem de dar a mesma capa, senão refazer um vídeo muda-lhe a cara"*.
   *
   * ⚠️ Isto **não** impede pedir uma capa nova de propósito: para isso há `--variante`,
   * que força o molde pelo nome. O que se conserta é a mudança que acontecia **sozinha**.
   */
  const anteriores = (caderno.videos || []).filter((v) => v.slug !== slug).slice(-raio);
  return [...new Set(anteriores.map((v) => v.molde).filter(Boolean))];
}

/** Regista o molde que este vídeo usou. Nunca lança: uma capa vale mais do que um registo. */
export function guardarMolde(slug, molde, { caminho = CADERNO_DE_CENARIOS } = {}) {
  try {
    const caderno = lerCaderno(caminho);
    const videos = caderno.videos || [];
    const ja = videos.find((v) => v.slug === slug);
    if (ja) ja.molde = molde;
    else videos.push({ slug, cenarios: [], molde, em: new Date().toISOString().slice(0, 10) });
    writeFileSync(caminho, `${JSON.stringify({ videos }, null, 2)}\n`, 'utf-8');
    return true;
  } catch { return false; }
}
