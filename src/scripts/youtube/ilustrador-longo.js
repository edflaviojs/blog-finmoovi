/**
 * O ILUSTRADOR DO VÍDEO LONGO — quem escolhe o desenho de cada cena (10/08/2026).
 *
 * ═══ 🔴 O QUE O DONO VIU, E O NÚMERO QUE LHE DEU RAZÃO ═══
 * *"Esses trechos só têm letras, não tem socos, não tem mudança de imagens, isso é ponto
 * de fuga dos espectadores… quero cenas mudando toda hora."*
 *
 * Medido no vídeo de 10/08: **70% do tempo em `palavras`** (letra na tela) contra **6% em
 * ilustração**. Os dois piores buracos que ele apontou — 01:13 e 02:36, trinta e vinte e
 * sete segundos sem nada acontecer — eram os dois cenas de `palavras`.
 *
 * ═══ POR QUE ISTO EXISTE EM VEZ DE MAIS PALAVRAS-GATILHO ═══
 * A escolha da ilustração era feita por `regex`: cada figura tinha uma pista escrita à
 * mão e ganhava a cena cuja narração calhasse de a conter. Em 10/08 abriram-se as 33
 * figuras (só 14 tinham pista) e subiu-se o teto de 6 para 14. **Resultado medido: 3
 * ilustrações passaram a 5, em 55 cenas.**
 *
 * O travão nunca foi o teto: é o casamento por palavra que não escala. Uma pista só
 * apanha a cena que use aquelas palavras exactas, e seis minutos de fala quase nunca as
 * usam. Escrever mais pistas era continuar a adivinhar como as pessoas falam — a lição
 * do `ralo`, pela terceira vez.
 *
 * ⚠️ **E é julgamento, não conta.** Regra da casa (`verdade-versus-gosto`): o que se mede
 * mede-se com código, o que se julga mede-se com um SEGUNDO LEITOR de IA. *"Esta figura
 * combina com esta frase?"* sempre foi julgamento; escrevê-lo em `regex` era fingir que
 * era conta. O significado das 33 figuras já está escrito há meses em
 * `METAPHOR_MEANINGS` — o leitor lê a narração, lê os significados, e escolhe.
 *
 * ═══ 🔴 E DEPOIS FALTAVA DIZER-LHE QUANTOS (12/08/2026) ═══
 * O leitor resolveu o "qual figura" e deixou o "quantas" por dizer: escolheu **10** com
 * teto para 14, e o vídeo ficou em **41% de letra** contra os 35% pedidos. O pedido não
 * trazia número nenhum. Ver a nota em `montarPedido`.
 *
 * ═══ ⚠️ O QUE ESTE PROGRAMA NÃO FAZ ═══
 * · **Não monta nada.** Escreve `.github/data/ilustracoes-do-longo.json` e sai. Quem
 *   monta é o `montar-longo.js`, que continua determinista e de graça — a MESMA forma
 *   das fotografias, e pela mesma razão.
 * · **Não manda na montagem.** As três guardas de `escolherLugaresDaIlustracao` mandam
 *   sempre: nunca a figura do fio condutor, nunca a mesma figura duas vezes, nunca duas
 *   coladas. Uma escolha dele que parta uma delas é descartada em silêncio, e está certo:
 *   ele escolhe a FIGURA, não o RITMO.
 * · **Não trava o vídeo.** Sem chave de IA, sem resposta, ou com resposta estragada, ele
 *   sai a verde e o vídeo faz-se com as pistas de sempre. Um vídeo com menos desenhos é
 *   melhor do que vídeo nenhum — regra do dono, 09/08.
 *
 * Uso:
 *   node --env-file=.env.local src/scripts/youtube/ilustrador-longo.js --slug=...
 *   node --env-file=.env.local src/scripts/youtube/ilustrador-longo.js --slug=... --ensaio
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { generateText } from '../apis/kie-ai.js';
import { METAPHOR_MEANINGS } from './lib/schema-short.js';
import { TETO_DE_ILUSTRACOES } from './lib/imagens-longo.js';

const RAIZ = process.cwd();
const ROTEIRO_DIR = join(RAIZ, 'youtube-render', 'public', 'roteiro');
const CATALOGO = join(RAIZ, '.github', 'data', 'ilustracoes-do-longo.json');

/**
 * ⚠️ **A FIGURA DA CHAMADA ESTÁ FORA, e não é arrumação.** `clique-link` é a mãozinha do
 * clique e pertence à chamada à ação; posta no meio de uma história vira um anúncio.
 */
const FORA = new Set(['clique-link']);
const FIGURAS = Object.entries(METAPHOR_MEANINGS).filter(([f]) => !FORA.has(f));

const args = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => {
    const [k, ...v] = a.slice(2).split('=');
    return [k, v.join('=') || true];
  }),
);

const log = (...m) => console.log(...m);

/**
 * As cenas que precisam de desenho: as de HISTÓRIA, sem número para mostrar nem frase
 * declarada para citar.
 *
 * ⚠️ **A demonstração e a chamada ficam de fora** — a primeira é o app a aparecer, a
 * segunda é o pedido de comentário. As duas têm dono e um desenho por cima seria roubar
 * o lugar a uma coisa que o vídeo precisa de dizer.
 */
export function cenasQuePrecisamDeDesenho(plano) {
  return plano.scenes.filter((c) => {
    if (c.parte === 'demonstracao' || c.parte === 'chamada') return false;
    const t = c.visual?.tipo;
    // `palavras` é o cavalo de carga — é exactamente onde a letra na tela se acumula.
    return !t || t === 'palavras';
  });
}

/**
 * ⚠️ **QUANTOS SE PEDEM — e por que o número tem de estar escrito (12/08/2026).**
 *
 * O pedido não dizia quantos desenhos se queriam. Medido no vídeo de 10/08: o leitor
 * escolheu **10**, o teto é o `TETO_DE_ILUSTRACOES` (que vem de `imagens-longo.js` e é a
 * conta dos 35%), e o vídeo saiu com **22 de 54 cenas só com letra na tela (41%)**.
 *
 * 🔴 **E as vagas estavam livres:** as regras de espaçamento barraram **uma** das dez
 * (10 escolhidas → 9 montadas). O travão era o pedido, não o espaço.
 *
 * ⚠️ **O alvo é o número de ESCOLHAS, e não a ordem da lista** — é esta a frase que faz
 * o trabalho. O leitor ia trecho a trecho e respondia "nenhuma" nos que não encaixavam,
 * e cada "nenhuma" era um desenho a menos. Dizendo-lhe que o alvo é o TOTAL, saltar um
 * trecho mau deixa de custar um desenho: ele procura outro trecho.
 *
 * ⚠️ **A regra da figura errada NÃO foi enfraquecida.** Uma figura que contradiz a voz
 * continua a ser pior do que nenhuma — é o nº 3 e continua lá. O que mudou é que ser
 * cauteloso deixou de ser de graça: cada trecho sem desenho é letra na tela.
 */
export function montarPedido(plano, cenas) {
  const catalogo = FIGURAS.map(([f, sentido]) => `  ${f} — ${sentido}`).join('\n');
  const lista = cenas.map((c) => `[${c.id}] ${String(c.narration).replace(/\s+/g, ' ').trim()}`).join('\n\n');
  const alvo = Math.min(TETO_DE_ILUSTRACOES, cenas.length);
  return `Você escolhe a ILUSTRAÇÃO ANIMADA que acompanha cada trecho de um vídeo de finanças pessoais em português do Brasil.

════════ AS FIGURAS QUE EXISTEM, E O QUE CADA UMA QUER DIZER ════════
${catalogo}

════════ OS TRECHOS ════════
${lista}

════════ QUANTOS ESCOLHER ════════
🔴 **Escolha ${alvo} trechos**, dos ${cenas.length} da lista.

Cada trecho que fica sem desenho aparece no vídeo como LETRA NA TELA, e é essa a queixa nº 1 de quem manda fazer este vídeo. Escolher a menos não é ser cuidadoso — é deixar o vídeo mais parado.

⚠️ **O alvo é o número de ESCOLHAS, não a ordem da lista.** Se um trecho não tiver figura que sirva, salte-o e escolha outro. Saltar um trecho não custa um desenho; parar antes de chegar a ${alvo} custa.

════════ COMO ESCOLHER ════════
1. Leia o trecho e pergunte: **o que está a acontecer com o dinheiro desta pessoa, aqui?**
2. Escolha a figura cujo SIGNIFICADO é essa coisa. A figura ilustra a IDEIA do trecho, não uma palavra solta dele.
3. 🔴 **Se nenhuma encaixar de verdade, responda "nenhuma" — e escolha outro trecho no lugar dele.** Uma figura errada é pior do que nenhuma: ela contradiz o que a voz está a dizer, e quem vê repara. Não force a figura; procure o trecho.
4. ⛔ **Nunca repita a mesma figura** em dois trechos. Há ${FIGURAS.length} e elas chegam.
5. ⛔ Não escolha pelo objeto citado. Se o trecho fala em "guardar dinheiro", a figura é a do que ACONTECE (paciência? proteção? subir um degrau?), não a primeira que tenha a ver com guardar.

Responda APENAS com JSON válido, sem markdown, uma linha por trecho:
{ "escolhas": [ { "cena": "<o número entre colchetes>", "figura": "<o nome exacto da figura, ou nenhuma>" } ] }`;
}

/** Lê a resposta do leitor. Nunca lança: resposta estragada = nenhuma escolha. */
export function lerResposta(bruto) {
  try {
    const texto = String(bruto).replace(/```json|```/g, '').trim();
    const inicio = texto.indexOf('{');
    const fim = texto.lastIndexOf('}');
    if (inicio < 0 || fim < 0) return [];
    const obj = JSON.parse(texto.slice(inicio, fim + 1));
    if (!Array.isArray(obj?.escolhas)) return [];
    const vistas = new Set();
    const saida = [];
    for (const e of obj.escolhas) {
      const figura = String(e?.figura || '').trim();
      const cena = String(e?.cena ?? '').trim();
      if (!cena || !figura || /^nenhuma$/i.test(figura)) continue;
      // ⚠️ A não-repetição é garantida AQUI também, e não só na montagem: o leitor às
      // vezes repete, e deixar passar seria empurrar a decisão para quem não a pode tomar.
      if (vistas.has(figura)) continue;
      vistas.add(figura);
      saida.push({ cena, figura });
    }
    return saida;
  } catch {
    return [];
  }
}

async function principal() {
  const slug = String(args.slug && args.slug !== true ? args.slug : '');
  if (!slug) { log('❌ falta --slug'); process.exit(1); }

  const caminho = join(ROTEIRO_DIR, `${slug}.json`);
  if (!existsSync(caminho)) {
    log(`⚠️ não há guião montado para "${slug}" — corra primeiro o montar-longo.js.`);
    return;
  }
  const plano = JSON.parse(readFileSync(caminho, 'utf-8'));
  const cenas = cenasQuePrecisamDeDesenho(plano);
  log(`\n🎨 O ILUSTRADOR — "${plano.tema}"`);
  log(`   ${cenas.length} de ${plano.scenes.length} cenas estão só com letra na tela.`);
  if (!cenas.length) { log('   nada a fazer.'); return; }

  const pedido = montarPedido(plano, cenas);
  if (args.ensaio) {
    log(`\n(ensaio — não se pediu nada à IA)\n${pedido.slice(0, 1200)}…`);
    return;
  }

  let escolhas = [];
  try {
    /**
     * ⚠️ **UM PEDIDO SÓ, e não um por cena.** Cinquenta pedidos seriam cinquenta
     * oportunidades de repetir a mesma figura — o leitor não se lembra do que respondeu
     * noutra chamada. Junto, ele vê a lista inteira e distribui.
     * `pago: 'leitor'` porque é exactamente isso que ele é.
     */
    const bruto = await generateText(pedido, { maxTokens: 2500, temperature: 0.3, pago: 'leitor' });
    escolhas = lerResposta(bruto);
  } catch (err) {
    log(`⚠️ o leitor não respondeu (${err.message}) — o vídeo sai com as pistas escritas à mão.`);
    return;
  }

  if (!escolhas.length) {
    log('⚠️ o leitor não escolheu nenhuma figura — o vídeo sai com as pistas escritas à mão.');
    return;
  }

  const catalogo = existsSync(CATALOGO) ? JSON.parse(readFileSync(CATALOGO, 'utf-8')) : { videos: {} };
  catalogo.videos = catalogo.videos || {};
  catalogo.videos[slug] = escolhas;
  mkdirSync(dirname(CATALOGO), { recursive: true });
  writeFileSync(CATALOGO, `${JSON.stringify(catalogo, null, 2)}\n`, 'utf-8');

  log(`\n✅ ${escolhas.length} desenhos escolhidos (de ${cenas.length} cenas possíveis):`);
  for (const e of escolhas.slice(0, 40)) {
    const c = plano.scenes.find((s) => String(s.id) === String(e.cena));
    log(`   cena ${String(e.cena).padStart(2)} · ${e.figura.padEnd(16)} "${String(c?.narration || '').slice(0, 52)}…"`);
  }
  log(`\n📒 ${CATALOGO}`);
  log(`▶️  a seguir: node src/scripts/youtube/montar-longo.js --slug=${slug}`);
}

const executadoDireto = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('youtube/ilustrador-longo.js');
if (executadoDireto) {
  principal().catch((err) => {
    // ⚠️ NUNCA derruba nada. Ver o cabeçalho: um vídeo com menos desenhos > vídeo nenhum.
    console.log(`⚠️ o ilustrador falhou (${err.message}) — o vídeo sai com as pistas escritas à mão.`);
  });
}
