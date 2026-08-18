/**
 * AS FOTOGRAFIAS DO VÍDEO LONGO, ESCOLHIDAS E FEITAS SOZINHAS (05/08/2026).
 *
 * ═══ A PERGUNTA DO DONO, E O QUE ESTAVA TRAVADO ═══
 * *"E como ficaria automático para os próximos vídeos?"* — até hoje **não ficava**. A
 * tabela das fotografias tinha três linhas escritas à mão, com os caminhos e as pistas do
 * vídeo piloto. **Um vídeo novo saía sem fotografia nenhuma** — e isso estava travado de
 * propósito, com prova: *"um vídeo sem fotografias suas não leva as de outro"*.
 *
 * ═══ O DESENHO (IMPL20 §44.2), E A ORDEM DAS PEÇAS IMPORTA ═══
 *   1. **escolher as cenas pelo PAPEL, não pela frase.** Uma regra por frase só serve o
 *      vídeo para que foi escrita; uma regra por papel serve qualquer vídeo. O guião já
 *      sabe dizer o papel de cada cena (`parte`, `capitulo`).
 *   2. **procurar no BANCO antes de pagar.** Uma fotografia que já existe e não é usada há
 *      oito vídeos custa ZERO.
 *   3. **medir os créditos ANTES** e gerar só o que couber.
 *   4. escrever o pedido **a partir da própria narração** daquela cena.
 *   5. descarregar, **conferir com um leitor de texto**, encolher para 1920×1080.
 *   6. escrever a pista **tirada da mesma cena** — para a fotografia aterrar exatamente
 *      onde foi pensada, e para a prova *"cada fotografia cai numa cena cujo TEXTO a
 *      chamou"* continuar a querer dizer alguma coisa.
 *
 * ═══ 🔴 A REGRA QUE NÃO SE NEGOCEIA ═══
 * **As fotografias não podem ter uma única letra ou dígito legível.** A primeira que se
 * gerou saiu com uma fatura **em inglês e em dólares** ($23.11, "LATE PAYMENT FEE") e o
 * script disse ✅ — só se viu OLHANDO para o ficheiro (§42.5). O conserto não foi
 * traduzir: foi **apagar**. *Um papel que não se lê não pode contradizer a voz.*
 *
 * Desde 05/08, por decisão do dono, isso deixou de ser uma regra escrita e passou a ser
 * **medida**: a máquina LÊ a imagem. Se encontrar letras numa fotografia, ela é recusada.
 * E no cartaz faz o contrário — **confirma que o número que lá está é o do caderno**.
 *
 * ═══ 🔴 AS DUAS PRATELEIRAS DO BANCO (§44.2-bis) ═══
 * · **as FOTOGRAFIAS entram** e reaproveitam-se: umas mãos a abrir uma conta servem para
 *   sempre. Regra do dono: não repetir nos últimos **8** vídeos (dois meses).
 * · 🔴 **os CARTAZES COM NÚMEROS NÃO ENTRAM.** O cartaz diz *"16% ao mês — fonte Banco
 *   Central"* e **essa taxa muda**. Reaproveitá-lo daqui a seis meses é pôr no ecrã um
 *   número falso com a chancela do Banco Central por baixo. Refaz-se a cada vídeo.
 *
 * ⚠️ **NÃO TOCA EM NADA DO SHORT.**
 *
 * Uso:
 *   node --env-file=.env.local src/scripts/youtube/fotos-longo.js --slug=... --ensaio
 *   node --env-file=.env.local src/scripts/youtube/fotos-longo.js --slug=...
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import * as fs from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import {
  pedirAgente, descarregar, CUSTO_POR_IMAGEM, custoPorImagem, quantasCabem, saldos, cabemAoTodo,
} from './lib/manus-client.js';
import { medir } from '../lib/medidor.js';

const ROOT = process.cwd();
const ROTEIRO_DIR = join(ROOT, 'youtube-render', 'public', 'roteiro');
const OUTPUT_DIR = join(ROOT, 'src', 'scripts', 'youtube', 'output');
const MANUS_DIR = join(ROOT, 'youtube-render', 'public', 'manus');
const CATALOGO = join(ROOT, '.github', 'data', 'fotos-do-longo.json');
const BANCO = join(ROOT, '.github', 'data', 'banco-de-imagens.json');

/**
 * ⚠️ **O CUSTO SAIU DAQUI — 10/08/2026.** Era um `const 52` local, e havia outras três
 * cópias do mesmo número noutros ficheiros. Medido em 10/08: **~82 créditos por imagem**,
 * e com o 52 esta conta prometia 6 imagens onde cabiam 4 — foi assim que o orçamento
 * acabou a meio sem avisar. Agora vem do `manus-client.js`, que é quem fala com a conta.
 */
/** A regra do dono: não repetir nos últimos N vídeos. Com um por semana, são dois meses. */
const NAO_REPETIR_EM = 8;

const args = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => {
    const [k, ...v] = a.slice(2).split('=');
    return [k, v.join('=') || true];
  }),
);
const valor = (n) => (args[n] && args[n] !== true ? String(args[n]) : null);
const ENSAIO = Boolean(args.ensaio || args['dry-run']);

const log = (m) => console.log(m);
const lerJson = (p, d) => { try { return existsSync(p) ? JSON.parse(readFileSync(p, 'utf-8')) : d; } catch { return d; } };
const semAcento = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// ═══════════════════════════════════════════════════════════════════════════════
// 1. AS CENAS, ESCOLHIDAS PELO PAPEL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * OS TRÊS PAPÉIS, e cada um diz **o que a fotografia tem de fazer ali** — não o que ela
 * mostra. É essa a diferença entre uma regra que serve este vídeo e uma que serve todos.
 *
 * ⚠️ `significado` é a etiqueta da prateleira do banco. É por ela que uma fotografia se
 * reaproveita num guião que ainda não existe — e é por isso que o banco **não pode** ser
 * arrumado por vídeo (*"as do sair-do-vermelho"* não diz nada a ninguém).
 */
export const PAPEIS = [
  {
    chave: 'susto',
    significado: 'o susto de olhar a conta',
    tipo: 'foto',
    movimento: 'aproxima',
    // O pico emocional: a pergunta que abre o primeiro ato — é onde dói.
    procurar: (cenas) => cenas.find((c) => c.capitulo === 1 && c.parte === 'pergunta')
      || cenas.find((c) => c.parte === 'abertura' && c.id > 1),
  },
  {
    chave: 'numero',
    significado: null, // 🔴 O CARTAZ NÃO TEM PRATELEIRA — não entra no banco. Ver abaixo.
    tipo: 'cartaz',
    movimento: 'cartaz',
    // O ensinamento: o ato do meio é onde se explica o mecanismo, e é lá que o número
    // com fonte faz sentido. Nunca no ato 1 (que só pode assustar) nem no 3 (a virada).
    procurar: (cenas) => cenas.find((c) => c.capitulo === 2 && c.parte === 'desenvolvimento')
      || cenas.find((c) => c.capitulo === 2),
  },
  {
    chave: 'virada',
    significado: 'a saída que se abre',
    tipo: 'foto',
    movimento: 'aproxima-lento',
    procurar: (cenas) => cenas.find((c) => c.capitulo === 3 && c.parte === 'desenvolvimento')
      || cenas.find((c) => c.parte === 'fecho'),
  },
];

/**
 * A PISTA — uma frase distintiva da própria cena escolhida.
 *
 * ⚠️ **É isto que faz a fotografia aterrar onde foi pensada.** O diretor de imagem coloca
 * as fotografias por pista de texto (era assim que o piloto funcionava, escrito à mão).
 * Ao tirar a pista da MESMA cena de onde saiu o pedido, duas coisas ficam garantidas: a
 * imagem cai no sítio certo, e a prova *"cada fotografia cai numa cena cujo TEXTO a
 * chamou"* continua a medir alguma coisa em vez de ser uma formalidade.
 *
 * Escolhe-se a sequência de 4 a 6 palavras mais longa e mais rara da cena; palavras
 * curtas e comuns não distinguem nada.
 */
export function pistaDaCena(cena, outrasCenas = []) {
  /**
   * 🔴 A PISTA TEM DE SER UM PEDAÇO LITERAL DA FRASE, e a 1ª versão não era.
   *
   * Ela deitava fora as palavras curtas ("a", "do", "e") para a pista ficar "mais
   * distintiva" — e o resultado foi uma expressão que **não existe em lado nenhum do
   * texto**: *"voce tambem abriu fatura"* nunca casaria com *"você também já abriu a
   * fatura"*. A prova apanhou-o à primeira: a fotografia não aterrava em cena nenhuma.
   *
   * ⚠️ E o defeito era invisível de outra maneira: como quem procura a fotografia engole
   * o "não encontrei" em silêncio, o vídeo sairia **sem fotografias** e nada se queixaria.
   *
   * Portanto: corta-se a frase nos sinais de pontuação (uma pista não pode atravessar uma
   * vírgula, senão deixa de ser contígua) e tira-se uma sequência de 4 a 6 palavras
   * SEGUIDAS, **tal como estão escritas**.
   */
  const normal = (t) => semAcento(t).replace(/\s+/g, ' ').trim();
  const outros = outrasCenas.filter((c) => c.id !== cena.id).map((c) => normal(c.narration)).join(' ¦ ');

  // Os pedaços entre pontuação, do mais comprido para o mais curto: quanto mais palavras
  // seguidas houver, mais provável é encontrar uma sequência que só exista nesta cena.
  const pedacos = normal(cena.narration)
    .split(/[.,;:!?…]+/).map((p) => p.trim()).filter(Boolean)
    .sort((a, b) => b.split(' ').length - a.split(' ').length);

  for (const pedaco of pedacos) {
    const palavras = pedaco.split(' ');
    for (let n = 6; n >= 4; n--) {
      for (let i = 0; i + n <= palavras.length; i++) {
        const trecho = palavras.slice(i, i + n).join(' ');
        // ⚠️ A pista tem de ser ÚNICA no vídeo: se outra cena disser o mesmo, a fotografia
        // podia aterrar nela — e seria a imagem de um momento a ilustrar outro.
        if (!outros.includes(trecho)) return trecho;
      }
    }
  }
  // Sem nada único (frases curtíssimas e repetidas), devolve o pedaço mais comprido —
  // e a prova da unicidade acende, que é o que se quer.
  return pedacos[0] || normal(cena.narration);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. OS PEDIDOS — o assunto primeiro, o estilo depois, e o estilo curto
// ═══════════════════════════════════════════════════════════════════════════════

const PALETA = { fundo: '#0d1117', ciano: '#22d3ee', violeta: '#8b5cf6', vermelho: '#ef4444' };

/**
 * ⚠️ A PROIBIÇÃO DE TEXTO É O BLOCO MAIS COMPRIDO DO PEDIDO, e é de propósito.
 * A primeira fotografia saiu com uma fatura escrita em inglês e em dólares. Dizer "sem
 * texto" uma vez não chegou — teve de se dizer o que fazer em vez disso (o ritmo das
 * linhas, desfocado) e o que fazer se alguma letra escapar (apagá-la).
 */
const SEM_UMA_LETRA = `
🔴 CRITICAL — THE IMAGE MUST CARRY NO READABLE TEXT AND NO NUMBERS AT ALL. Any printed matter is rendered as soft grey blur: the RHYTHM of rows and columns is visible, but not a single legible word, digit, date or currency symbol anywhere. No dollar signs, no English words, no headings, no logos, no watermarks, no signature. If any character would be readable, blur it out.`;

const REGRAS_FIXAS = `
STRICT RULES — no faces, no brand logos, no watermarks, no placeholder text. Cinematic, extreme contrast, readable at 300 pixels wide on a phone.

Generate the image and ATTACH the final PNG file to your reply. Do not ask me any questions — if something is ambiguous, choose the boldest option.`;

/**
 * O PEDIDO DE UMA FOTOGRAFIA, escrito a partir do que a voz diz naquele segundo.
 * ⚠️ A narração entra como **o que está a acontecer**, nunca como texto a ilustrar: o
 * modelo não vê português, vê a cena descrita em inglês pelo contrato de estilo.
 */
/**
 * 🔴 AS FOTOGRAFIAS DEIXARAM DE SER SEMPRE A MESMA — 08/08/2026, queixa do dono.
 *
 * *"As 3 imagens que são geradas pela Manus também estão sendo repetidas do vídeo
 * anterior. Essa regra também tem que mudar, não pode usar as mesmas imagens do vídeo
 * anterior."*
 *
 * ⚠️ **E a trava que ele lembrava EXISTE e estava a funcionar** (`doBanco` +
 * `NAO_REPETIR_EM = 8`): nenhum FICHEIRO se repetia. O que se repetia era o PEDIDO.
 * Havia **uma descrição de cena cravada por papel**, igual em todos os vídeos — mãos a
 * segurar um papel à luz do telemóvel, sempre; um corredor vermelho a abrir para uma
 * sala clara, sempre. Gerava-se uma imagem nova de cada vez, e ela saía igual à
 * anterior porque o pedido era o mesmo.
 *
 * Agora cada papel tem SEIS cenas possíveis e elas rodam por vídeo. Seis é mais do que
 * o raio de não-repetição do banco, portanto duas iguais nunca ficam perto uma da
 * outra. E rodam por CONTA, não por sorteio: o mesmo vídeo pedido duas vezes dá a
 * mesma imagem, que é o que permite refazer um vídeo sem ele mudar de cara.
 */
const CENAS_POR_PAPEL = {
  susto: [
    'A pair of hands holding an open paper document in a dark room, lit only by the cold blue-white glow of a phone screen from below, throwing hard shadows upward. Shallow depth of field, fine film grain. Hands only — no face, no person visible above the wrists.',
    'A kitchen table at night seen from above: a mug gone cold, a pen, and a single sheet of paper face down. One hand rests flat beside it, still. Warm lamp light from one side, deep shadow on the other. No face.',
    'A supermarket checkout belt seen low and close, a few everyday items on it, and a hand hovering over a wallet without opening it. Fluorescent light overhead, cool and unflattering. Motion blur of people passing behind. No faces.',
    'The inside of a car at dawn, seen from the passenger seat: hands resting on the steering wheel, engine off, windscreen fogged. Cold blue light before sunrise. No face above the shoulders.',
    'A bedside table at 3am: a phone face up glowing, an alarm clock, a glass of water. The bed edge is out of focus in the foreground. Everything else is dark. No people.',
    'A narrow hallway with a small pile of unopened envelopes on the floor under the door slot, seen at eye level from a distance. Late afternoon light through frosted glass. Empty, quiet, no people.',
  ],
  virada: [
    'Seen from inside a narrow dark corridor lit in deep crimson red, opening onto a wide bright space lit in cool cyan and violet. Silhouetted stacks of paper and boxes crowd the red walls; the bright side beyond is empty and airy. Volumetric light beams through dust. No people.',
    'A window being opened from inside a dim room: the shutter half up, a hard blade of cool morning light cutting across a bare floor. Dust in the air. Architectural, symbolic, no people.',
    'A single clean desk under a warm pool of light, with everything else in darkness: one notebook open, one pen, nothing else. Order after chaos. No people.',
    'A path of stepping stones across still dark water, lit from ahead in cyan, leading toward a soft violet glow on the far bank. Wide, calm, cinematic. No people.',
    'A wall of tangled dark cables on the left resolving into a single straight illuminated line on the right. Macro, shallow depth of field, cool key light. Abstract, no people.',
    'An open front door seen from inside a dark hallway, warm daylight flooding in across the threshold, keys still in the lock. Nobody in frame.',
  ],
};

export function pedidoDaFoto(papel, cena, indiceDoVideo = 0) {
  const lista = CENAS_POR_PAPEL[papel.chave] || [];
  const cenario = lista.length ? lista[Math.abs(indiceDoVideo) % lista.length] : undefined;

  return `A cinematic photorealistic still, 16:9 aspect ratio, 1920x1080 pixels, for a Brazilian personal-finance explainer video.

THE MOMENT — this is what the narrator is saying over this image: "${cena.narration}"

THE SHOT — ${cenario}

COLOUR — near-black background (${PALETA.fundo}), a soft violet (${PALETA.violeta}) rim-light on the edges, and a single cold cyan (${PALETA.ciano}) light source.
${SEM_UMA_LETRA}
${REGRAS_FIXAS}`;
}

/**
 * O PEDIDO DO CARTAZ — o único que leva texto, e **o número vem do caderno do vídeo**.
 * ⚠️ Nunca escrito à mão aqui. Se o caderno não trouxer a taxa, o cartaz não se faz — em
 * vez de sair com um número inventado. *Um cartaz com um número inventado é pior do que
 * cartaz nenhum.*
 */
export function pedidoDoCartaz({ taxa, rotulo, fonte }) {
  const numero = String(taxa).replace('.', ',');
  return `A stylised editorial poster, 16:9 aspect ratio, 1920x1080 pixels, in the visual language of a modern explainer channel. IMPORTANT — this is an original poster, NOT a reproduction of any real newspaper: no masthead, no publication name, no dateline, no columns of fake news copy.

A torn-paper panel in warm off-white sits at an angle on a near-black (${PALETA.fundo}) background, with a thin cyan-to-magenta gradient bar across its top edge. On the panel, in huge heavy black condensed type, reading exactly: "${numero}% AO MÊS". Directly beneath, in smaller black type, reading exactly: "${rotulo}". At the bottom edge of the panel, in small grey type, reading exactly: "Fonte: ${fonte}". A rough red ink circle drawn by hand around the big number, and a red underline beneath it.

⚠️ Every Portuguese word must be spelled EXACTLY as written above, with the accents shown. No other text anywhere.
${REGRAS_FIXAS}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. O LEITOR DE TEXTO — o que transforma a regra em medida
// ═══════════════════════════════════════════════════════════════════════════════

/** Há leitor de texto nesta máquina? */
/**
 * ═══ 🔴 O LEITOR ESTAVA INSTALADO E O PROGRAMA NÃO O ENCONTRAVA — 10/08/2026 ═══
 *
 * ═══ O QUE ACONTECEU, E QUANTO CUSTAVA ═══
 * `haLeitor()` chamava `tesseract` a seco. Na nuvem (Linux) isso acha-o, porque o `apt`
 * o põe no caminho. **Na máquina do dono ele está em `C:\Program Files\Tesseract-OCR\` e
 * não está no caminho** — portanto `haLeitor()` dizia **não**, e o programa das
 * fotografias **paga a imagem, descarrega-a, encolhe-a, e SÓ ENTÃO** descobre que não a
 * pode conferir e deita-a fora. **Duas fotografias = 164 créditos no lixo**, com o
 * tesseract instalado a dois passos.
 *
 * ⚠️ **É a família de defeito nº 1 desta casa noutro sítio:** uma regra escrita para uma
 * estrutura (o Linux da nuvem) a correr calada noutra (o Windows do dono).
 *
 * ⚠️ **E O IDIOMA TAMBÉM ESTAVA ERRADO.** Pedia-se `-l por+eng`, mas esta instalação só
 * traz `eng` e `osd` — `tesseract` recusa-se a correr com um idioma que não tem, e
 * rebentava com um erro que ninguém ligaria à fotografia. Agora pergunta-se-lhe quais
 * tem e usam-se os que existem.
 */
const CAMINHOS_DO_LEITOR = [
  'tesseract',
  'C:\\Program Files\\Tesseract-OCR\\tesseract.exe',
  'C:\\Program Files (x86)\\Tesseract-OCR\\tesseract.exe',
];

/** O leitor desta máquina, ou `null`. Lembra-se da resposta — é a mesma a corrida toda. */
let leitorAchado;
export function ondeEstaOLeitor() {
  if (leitorAchado !== undefined) return leitorAchado;
  for (const c of CAMINHOS_DO_LEITOR) {
    try { execFileSync(c, ['--version'], { stdio: 'ignore' }); leitorAchado = c; return c; } catch { /* o próximo */ }
  }
  leitorAchado = null;
  return null;
}

/** Os idiomas que ESTA instalação tem, dos que nos interessam. Nunca devolve vazio. */
function idiomasDoLeitor(exe) {
  try {
    const saida = String(execFileSync(exe, ['--list-langs'], { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }));
    const tem = (l) => new RegExp(`^${l}$`, 'm').test(saida);
    const querem = ['por', 'eng'].filter(tem);
    return querem.length ? querem.join('+') : 'eng';
  } catch { return 'eng'; }
}

export function haLeitor() {
  return ondeEstaOLeitor() !== null;
}

/**
 * O QUE A MÁQUINA CONSEGUE LER NA IMAGEM.
 *
 * ⚠️ **O que interessa não é "há alguma letra": é "há alguma coisa LEGÍVEL".** Um leitor
 * de texto encontra fantasmas em qualquer textura — uma letra solta no meio de um borrão
 * não é texto, é ruído. Por isso conta-se apenas o que forma **palavras de três ou mais
 * caracteres** ou **números de dois ou mais dígitos**, que é o que uma pessoa lê e o que
 * pode contradizer a voz.
 */
export function lerTextoDaImagem(caminho) {
  const exe = ondeEstaOLeitor();
  if (!exe) throw new Error('não há leitor de texto nesta máquina');
  const bruto = execFileSync(exe, [caminho, 'stdout', '-l', idiomasDoLeitor(exe)], {
    encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'],
  });
  const achados = String(bruto).match(/[\p{L}]{3,}|\d{2,}/gu) || [];
  return { bruto: String(bruto).trim(), legiveis: achados };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. O BANCO — arrumado por SIGNIFICADO, nunca por vídeo
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Uma fotografia do banco que sirva este significado e **não seja usada há N vídeos**.
 * Devolve nada se não houver — e então gera-se uma nova.
 */
export function doBanco(significado, { banco = lerJson(BANCO, { imagens: [] }), historico = [] } = {}) {
  const recentes = new Set(historico.slice(-NAO_REPETIR_EM));
  const candidatas = (banco.imagens || [])
    .filter((i) => i.significado === significado)
    // 🔴 CARTAZES NÃO ENTRAM NO BANCO — e se algum lá estiver por engano, não sai de lá.
    .filter((i) => i.tipo !== 'cartaz')
    .filter((i) => !(i.usadoEm || []).some((s) => recentes.has(s)));
  if (!candidatas.length) return null;
  // A menos usada primeiro, para o banco rodar em vez de gastar sempre a mesma.
  return candidatas.sort((a, b) => (a.usadoEm || []).length - (b.usadoEm || []).length)[0];
}

/**
 * 🔴 A TERCEIRA PRATELEIRA: A QUARENTENA — 09/08/2026, ordem do dono.
 *
 * *"essa capa que gerou tem que ir pro nosso banco de imagens que poderá ser usada no
 * futuro, e tem que gerar outra"*.
 *
 * Uma imagem recusada **custou 52 créditos na mesma** e continua no disco. Deitá-la fora
 * sem registo é queimar dinheiro e perder a memória do que já se tentou.
 *
 * ⚠️ **E ELA NÃO PODE ENTRAR NA PRATELEIRA DE ONDE SE ESCOLHE.** `doBanco()` lê
 * `banco.imagens`, e uma fotografia foi recusada precisamente por ter letras legíveis —
 * reaproveitá-la seria repor no ecrã o defeito que a recusou. Por isso vive numa lista
 * PRÓPRIA (`banco.recusadas`), com o motivo escrito ao lado. Fica catalogada para quem
 * quiser ir lá buscar à mão; nenhum robô a escolhe sozinho.
 */
function guardarNaQuarentena(banco, { ficheiro, significado, tipo, motivo }, slug) {
  const recusadas = [...(banco.recusadas || [])];
  const existente = recusadas.find((i) => i.ficheiro === ficheiro);
  if (existente) {
    if (!existente.recusadaEm.includes(slug)) existente.recusadaEm.push(slug);
    existente.motivo = motivo;
  } else {
    recusadas.push({
      ficheiro, significado, tipo, motivo, recusadaEm: [slug], em: new Date().toISOString().slice(0, 10),
    });
  }
  return { ...banco, recusadas };
}

/** Regista no banco que esta imagem foi usada neste vídeo. */
function guardarNoBanco(banco, imagem, slug) {
  // 🔴 A PRATELEIRA QUE NÃO EXISTE. Ver o aviso no cabeçalho: o cartaz traz um número com
  // fonte, e essa taxa muda. Guardá-lo seria preparar o dia em que ele volta ao ecrã com
  // um número que já não é verdade — com a chancela do Banco Central por baixo.
  if (imagem.tipo === 'cartaz') return banco;
  const existente = (banco.imagens || []).find((i) => i.ficheiro === imagem.ficheiro);
  if (existente) {
    if (!existente.usadoEm.includes(slug)) existente.usadoEm.push(slug);
  } else {
    banco.imagens = [...(banco.imagens || []), {
      ficheiro: imagem.ficheiro,
      significado: imagem.significado,
      tipo: imagem.tipo,
      pistas: [imagem.pista],
      usadoEm: [slug],
    }];
  }
  return banco;
}

// ═══════════════════════════════════════════════════════════════════════════════
async function principal() {
  const slug = valor('slug');
  if (!slug) throw new Error('falta dizer de que vídeo se trata (--slug=...)');

  const plano = lerJson(join(ROTEIRO_DIR, `${slug}.json`), null);
  if (!plano) throw new Error(`não há guião montado para "${slug}" — corra o montador antes`);
  const caderno = lerJson(join(OUTPUT_DIR, `${slug}.caderno.json`), null)
    || lerJson(join(OUTPUT_DIR, `${slug}.longo.json`), null);
  const ficha = caderno?.mapa?.fichaDeDivida || null;

  const catalogo = lerJson(CATALOGO, { videos: {} });
  const banco = lerJson(BANCO, { imagens: [] });
  const historico = Object.keys(catalogo.videos || {});

  log(`\n📸 AS FOTOGRAFIAS DE "${plano.tema}"`);

  /**
   * 🔴 SE ESTE VÍDEO JÁ TEM FOTOGRAFIAS, NÃO SE PAGA POR OUTRAS.
   *
   * Apanhado antes de custar dinheiro: o vídeo piloto tem as três fotografias escritas à
   * mão, e o diretor de imagem prefere-as sempre. Mandar o robô refazê-lo geraria três
   * imagens novas — **156 créditos, metade do que a conta dá por dia** — que nunca
   * apareceriam no ecrã, porque as escritas à mão ganham.
   *
   * ⚠️ E não é só dinheiro: seria o robô a trabalhar e a entregar nada, com a corrida a
   * acabar a verde. O modo de falha desta casa.
   */
  const { escolherLugaresDaFoto } = await import('./lib/imagens-longo.js');
  const jaTem = escolherLugaresDaFoto(plano.scenes, new Set(), slug);
  if (jaTem.size) {
    log(`   ♻️  este vídeo já tem ${jaTem.size} fotografia(s) suas — não se paga por outras.`);
    for (const f of jaTem.values()) log(`      · ${f.ficheiro}`);
    return;
  }

  // ── escolher as cenas pelo papel ──
  const escolhas = [];
  for (const papel of PAPEIS) {
    const cena = papel.procurar(plano.scenes);
    if (!cena) { log(`   ⏭️  ${papel.chave}: não há cena com esse papel neste guião`); continue; }
    if (papel.tipo === 'cartaz' && !ficha?.taxas?.rotativoAoMes) {
      log('   ⏭️  o cartaz do número fica de fora: não há taxa no caderno deste vídeo');
      continue;
    }
    if (escolhas.some((e) => e.cena.id === cena.id)) { log(`   ⏭️  ${papel.chave}: a cena ${cena.id} já foi levada por outro papel`); continue; }
    escolhas.push({ papel, cena, pista: pistaDaCena(cena, plano.scenes) });
  }
  if (!escolhas.length) { log('   nada a fazer.'); return; }

  // ── o banco primeiro: o que já existe não se paga ──
  const paraGerar = [];
  const doArquivo = [];
  for (const e of escolhas) {
    const reaproveitada = e.papel.significado ? doBanco(e.papel.significado, { banco, historico }) : null;
    if (reaproveitada) {
      doArquivo.push({ ...e, imagem: reaproveitada });
      log(`   ♻️  ${e.papel.chave}: vem do banco (${reaproveitada.ficheiro}) — zero créditos`);
    } else {
      paraGerar.push(e);
    }
  }

  // ── medir os créditos ANTES, e gerar só o que couber ──
  let cabem = paraGerar.length;
  /**
   * ⚠️ **O SALDO DE ANTES GUARDA-SE PARA SE MEDIR O CUSTO REAL NO FIM** — 10/08/2026.
   * O `CUSTO_POR_IMAGEM` esteve dois meses errado (52 contra os 82 reais) porque nada
   * voltava a medi-lo. Agora cada corrida diz quanto custou de verdade.
   */
  let livresAntes = null;
  let pagas = 0;
  if (paraGerar.length) {
    /**
     * ⚠️ **AS CONTAS TODAS, e a soma do `total` — não do `livres`.** Com duas contas, a
     * corrida pode começar numa e acabar noutra; somando, a medição do custo continua
     * certa aconteça o que acontecer. E numa conta paga o `free_credits` pode estar a
     * zero e o gasto sair do saldo comprado — a diferença dos "livres" daria zero e o
     * programa escreveria que as imagens saíram de graça.
     */
    /**
     * 🔴 **O LEITOR CONFERE-SE ANTES DE PAGAR — 10/08/2026.**
     *
     * A verificação existia, mas **lá em baixo, depois de a imagem estar comprada,
     * descarregada e encolhida**. Sem leitor, o programa pagava tudo e deitava fora:
     * duas fotografias são 164 créditos, mais de metade da renovação de um dia.
     *
     * ⚠️ **E sai a ZERO, não a vermelho** — regra do dono, `nunca-parar-o-video-tem-de-sair`:
     * um vídeo sem fotografias é um vídeo; uma corrida morta não é nada. As ilustrações e
     * o b-roll entram na mesma.
     */
    if (!haLeitor()) {
      log('\n🔴 NÃO HÁ LEITOR DE TEXTO NESTA MÁQUINA — nenhuma fotografia vai ser pedida.');
      log('   A regra "nem uma letra legível na fotografia" não se pode garantir sem a ler,');
      log('   e pedi-las às cegas era pagar para deitar fora. O vídeo sai com as ilustrações.');
      log(`   Procurei em: ${CAMINHOS_DO_LEITOR.join(' · ')}`);
      return;
    }
    const lidos = await saldos();
    livresAntes = lidos.reduce((a, s) => a + s.total, 0);
    cabem = cabemAoTodo(lidos, paraGerar.length);
    for (const s of lidos) {
      log(s.erro
        ? `\n💳 ${s.nome}: ❌ não respondeu — ${s.erro}`
        : `\n💳 ${s.nome}: ${s.total} créditos (${s.restaHoje} da renovação de hoje) → ${quantasCabem(s.total)} imagem(ns)`);
    }
    log(`   a ${CUSTO_POR_IMAGEM} créditos por imagem, dá para ${cabemAoTodo(lidos)} ao todo`);
    // ⚠️ O saldo pode vir NEGATIVO (visto: -2). Sem isto o aviso saía a falar de "-1".
    if (!cabemAoTodo(lidos)) log('   ⚠️ nenhuma conta tem para uma imagem — hoje não sai nenhuma. A renovação diária ainda não caiu.');
    if (cabem < paraGerar.length) {
      log(`   ⚠️ faltam créditos para ${paraGerar.length - cabem} — este vídeo sai com menos fotografias, e isso é melhor do que ficar à espera.`);
    }
  }

  const feitas = [...doArquivo.map((e) => ({ ...e.imagem, pista: e.pista, movimento: e.papel.movimento }))];
  const destino = join(MANUS_DIR, slug);
  if (!ENSAIO) mkdirSync(destino, { recursive: true });

  /**
   * 🔴 UMA IMAGEM RECUSADA JÁ NÃO É O FIM DA LINHA — 09/08/2026, ordem do dono:
   * *"se existe algum bloqueio ele pula para a próxima imagem… mas nunca parar"*.
   *
   * A 1ª versão pedia UMA vez por papel e, se a máquina lesse letras, seguia em frente
   * sem essa fotografia — o vídeo saía mais pobre e ninguém tentava outra vez. Agora
   * pede-se outra, e a recusada vai para a quarentena do banco em vez de se perder.
   *
   * ⚠️ **DUAS, e não mais.** Cada tentativa custa 52 créditos de verdade. Duas é a
   * diferença entre "o modelo escorregou" e "este pedido está mal feito" — e o segundo
   * caso não se resolve pagando três vezes: resolve-se emendando o pedido.
   */
  const TENTATIVAS_POR_IMAGEM = 2;
  /** ⚠️ O orçamento é de imagens PEDIDAS, não de papéis — senão as repetições estouram. */
  let porGastar = cabem;
  let bancoVivo = banco;
  const recusadas = [];

  for (const e of paraGerar) {
    if (porGastar <= 0) { log(`\n   ⚠️ acabaram os créditos antes de "${e.papel.chave}" — este vídeo sai com menos fotografias.`); break; }
    const nome = `${e.papel.chave}`;
    log(`\n🖼️  ${e.papel.chave} — cena ${e.cena.id}`);
    log(`   a voz diz: "${String(e.cena.narration).slice(0, 90)}…"`);
    log(`   pista: "${e.pista}"`);

    for (let tentativa = 1; tentativa <= TENTATIVAS_POR_IMAGEM && porGastar > 0; tentativa++) {
      if (tentativa > 1) log(`   🔁 tentativa ${tentativa} de ${TENTATIVAS_POR_IMAGEM} — a recusada ficou guardada no banco`);
      const pedido = e.papel.tipo === 'cartaz'
        ? pedidoDoCartaz({
          taxa: ficha.taxas.rotativoAoMes,
          rotulo: 'juro do rotativo do cartão',
          fonte: 'Banco Central do Brasil',
        })
        /**
         * ⚠️ O ÍNDICE É QUANTOS VÍDEOS JÁ TÊM FOTOGRAFIAS — é ele que faz a cena rodar
         * de vídeo para vídeo. Sai do catálogo, não de um sorteio: o mesmo vídeo pedido
         * duas vezes tem de dar a mesma imagem, senão refazer um vídeo muda-lhe a cara.
         */
        : pedidoDaFoto(e.papel, e.cena, historico.length);

      if (ENSAIO) { log('   (ensaio — não se pediu nada)'); break; }

      /** A recusa: guarda o que se pagou, escreve porquê, e deixa tentar outra vez. */
      const recusar = (motivo, ficheiro = null) => {
        log(`   ❌ ${motivo}`);
        recusadas.push({ papel: e.papel.chave, motivo, tentativa });
        if (ficheiro) {
          bancoVivo = guardarNaQuarentena(bancoVivo, {
            ficheiro, significado: e.papel.significado, tipo: e.papel.tipo, motivo,
          }, slug);
        }
      };

      porGastar -= 1;
      // ⚠️ Conta-se a TENTATIVA, e não a imagem que ficou boa: uma recusada custou
      //    exactamente o mesmo. Dividir o gasto pelas boas dava um custo inflacionado.
      pagas += 1;
      let r;
      try {
        r = await pedirAgente(pedido, { titulo: `FinMoovi · ${slug} · ${nome} · ${tentativa}`, aoAndar: (m) => log(`      ${m}`) });
      } catch (err) { recusar(err.message.split('\n')[0]); continue; }

      const imagens = r.anexos.filter((a) => a.type === 'image' || /^image\//.test(a.content_type || ''));
      if (!imagens.length) { recusar(`voltou sem imagem. O agente disse: ${String(r.texto).slice(0, 140)}`); continue; }

      const ext = (imagens[0].filename || '').split('.').pop() || 'png';
      // ⚠️ O nome leva a tentativa a partir da 2ª: sem isso, a repetição escrevia por
      // cima da recusada e a quarentena ficava a apontar para a imagem BOA.
      const base = tentativa === 1 ? nome : `${nome}-t${tentativa}`;
      const grande = join(destino, `${base}.${ext}`);
      await descarregar(imagens[0].url, grande, fs);

      // ── encolher para o tamanho que o vídeo usa ──
      const pequena = join(destino, `${base}.jpg`);
      try {
        execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', grande, '-vf', 'scale=1920:1080:flags=lanczos', '-q:v', '3', pequena], { stdio: 'ignore' });
      } catch (err) { recusar(`não deu para encolher (${err.message.split('\n')[0]}) — a imagem não entra`); continue; }
      log(`   ✅ ${base}.jpg (${Math.round(statSync(pequena).size / 1024)} KB)`);

      // ── 🔴 A MÁQUINA LÊ A IMAGEM ──
      if (!haLeitor()) {
        log('   🔴 NÃO HÁ LEITOR DE TEXTO NESTA MÁQUINA — a imagem NÃO entra no vídeo.');
        log('      A regra "nem uma letra legível" não pode ser garantida sem a ler. Corra na nuvem.');
        break;
      }
      const { legiveis } = lerTextoDaImagem(pequena);
      if (e.papel.tipo === 'cartaz') {
        const esperado = String(ficha.taxas.rotativoAoMes).replace('.', ',');
        const temNumero = legiveis.some((t) => t.includes(String(Math.trunc(ficha.taxas.rotativoAoMes))));
        const temFonte = /banco|central/i.test(legiveis.join(' '));
        if (!temNumero || !temFonte) {
          recusar(`o cartaz não mostra o que devia (esperava ${esperado}% e a fonte). Leu-se: ${legiveis.slice(0, 12).join(' ')}`, `manus/${slug}/${base}.jpg`);
          continue;
        }
        log(`   ✅ conferido: o cartaz diz ${esperado}% e traz a fonte`);
      } else if (legiveis.length) {
        recusar(`RECUSADA — a máquina leu texto nesta fotografia: ${legiveis.slice(0, 10).join(' ')}`, `manus/${slug}/${base}.jpg`);
        log('      É a queixa nº 1 do dono: o ecrã a dizer uma coisa enquanto a voz diz outra.');
        continue;
      } else {
        log('   ✅ conferido: não há uma letra legível');
      }

      feitas.push({
        ficheiro: `manus/${slug}/${base}.jpg`,
        nome: e.papel.significado || 'o cartaz do número',
        significado: e.papel.significado,
        tipo: e.papel.tipo,
        movimento: e.papel.movimento,
        pista: e.pista,
      });
      break; // esta ficou boa — o papel está resolvido
    }
  }

  if (ENSAIO) { log('\n(ensaio — nada foi escrito)\n'); return; }

  /**
   * 🔴 A QUARENTENA GRAVA-SE MESMO QUE NENHUMA FOTOGRAFIA TENHA ENTRADO — e isto é o
   * ponto todo. A 1ª versão saía aqui com um `return` quando `feitas` estava vazio, e
   * era exactamente nesse caso — o das recusas todas — que havia mais para guardar.
   * Sair sem escrever era pagar os créditos e deitar fora a única coisa que sobrava
   * deles: o registo do que se tentou e porque não serviu.
   */
  let b = bancoVivo;
  for (const f of feitas) b = guardarNoBanco(b, f, slug);
  writeFileSync(BANCO, `${JSON.stringify(b, null, 2)}\n`, 'utf-8');

  if (recusadas.length) {
    log(`\n🚧 ${recusadas.length} imagem(ns) recusada(s) — guardadas na quarentena do banco, não se perderam:`);
    for (const r of recusadas) log(`   · ${r.papel} (tentativa ${r.tentativa}): ${r.motivo}`);
  }

  /**
   * 🔴 QUANTO CUSTOU DE VERDADE — 10/08/2026, e é o que impede o `CUSTO_POR_IMAGEM` de
   * envelhecer outra vez em silêncio.
   *
   * ⚠️ **Vem ANTES do `return` das zero fotografias, de propósito:** é justamente na
   * corrida em que tudo foi recusado que mais se gastou sem nada a mostrar. Sair antes de
   * escrever isto seria pagar e não registar.
   *
   * ⚠️ **Nunca parte a corrida.** Se a leitura do saldo falhar, fica sem o número — não
   * fica sem as fotografias que já estão em disco.
   */
  if (livresAntes !== null && pagas) {
    try {
      const fim = (await saldos()).reduce((a, s) => a + s.total, 0);
      const real = custoPorImagem(livresAntes, fim, pagas);
      // Medidor: créditos REALMENTE gastos (saldo antes − saldo depois).
      medir({ fornecedor: 'manus', tipo: 'imagem', modelo: 'fotografias', unidades: Math.max(0, livresAntes - fim) });
      if (real) {
        log(`\n💳 custou ${livresAntes - fim} créditos em ${pagas} pedido(s) → ${real} por imagem (a régua diz ${CUSTO_POR_IMAGEM})`);
        if (Math.abs(real - CUSTO_POR_IMAGEM) > 15) {
          log(`   ⚠️ a régua está a ${Math.abs(real - CUSTO_POR_IMAGEM)} créditos da realidade — corrija CUSTO_POR_IMAGEM em lib/manus-client.js.`);
        }
      }
    } catch { /* sem saldo lido, fica sem o número — as imagens já estão feitas */ }
  }

  if (!feitas.length) {
    log('\n📭 nenhuma fotografia entrou neste vídeo — ele sai com as ilustrações e as palavras.');
    log('   ⚠️ isto NÃO é uma falha: um vídeo sem fotografias é melhor do que não haver vídeo.\n');
    return;
  }

  // ── escrever o catálogo ──
  catalogo.videos = { ...(catalogo.videos || {}), [slug]: feitas };
  writeFileSync(CATALOGO, `${JSON.stringify(catalogo, null, 2)}\n`, 'utf-8');

  log(`\n💾 ${feitas.length} fotografia(s) em ${destino}`);
  log(`📒 catálogo: ${CATALOGO}`);
  log(`🏦 banco: ${(b.imagens || []).length} por significado · ${(b.recusadas || []).length} em quarentena\n`);
}

const chamadoPeloNome = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (chamadoPeloNome) {
  principal().catch((err) => { console.error(`\n❌ ${err.message}\n`); process.exit(1); });
}

export { CATALOGO, BANCO, CUSTO_POR_IMAGEM, NAO_REPETIR_EM, guardarNoBanco };
