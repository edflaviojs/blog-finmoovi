/**
 * A CAPA E AS IMAGENS DO VÍDEO LONGO, PELA MANUS (04/08/2026).
 *
 * ═══ O PEDIDO DO DONO ═══
 * *"A thumbnail teria que ser muito mais profissional e elegante… temos que ter mais
 * artifícios para ganharmos mais cliques… algo mais sensacionalista"* e *"até 3 imagens
 * nessa mesma pegada para intercalarmos no vídeo e deixá-lo mais dinâmico"*.
 * Ele mandou o modelo de pedido que já lhe dá bons resultados noutro nicho e disse:
 * *"adapte-o"* — **sem pessoa nenhuma**, no ecossistema do canal, com o antes/depois em
 * vermelho e verde.
 *
 * ═══ O QUE SE APRENDEU ANTES, E ESTÁ AQUI DENTRO ═══
 * Em 04/08 (§37.8) tentámos imagens com um gerador grátis e saiu mal — e a lição medida
 * foi: **o ASSUNTO primeiro, o estilo depois, e o estilo curto.** O modelo divide a
 * atenção pelo pedido todo; um contrato de estilo comprido afoga o que interessa. O
 * pedido do dono é comprido de propósito, mas está ARRUMADO: composição → metades →
 * fundo → letras → selos → proibições. Cada bloco diz uma coisa.
 *
 * ⚠️ **O NÚMERO DO CARTAZ É VERDADEIRO.** O "recorte" não imita jornal nenhum e não
 * inventa notícia: é um cartaz nosso, e o número que traz é a **mediana do rotativo
 * publicada pelo Banco Central** — o mesmo número que o guião já usa, lido do caderno do
 * vídeo, nunca escrito à mão aqui. Um cartaz com um número inventado seria pior do que
 * cartaz nenhum.
 *
 * ⚠️ **NÃO ENTRA NO ROBÔ DIÁRIO (o do Short) — mas ENTRA no do vídeo longo, desde
 * 10/08/2026.** O `youtube-longo.yml` chama-o com `--so=capa` entre as fotografias e o
 * commit. Antes disso o programa existia e **nenhum workflow o corria**: todas as capas
 * do canal tinham sido feitas à mão, e os vídeos automáticos subiam sem miniatura própria
 * com a corrida a acabar a verde.
 *
 * Uso:
 *   node --env-file=.env.local src/scripts/youtube/capa-manus.js --slug=sair-do-vermelho
 *   node --env-file=.env.local src/scripts/youtube/capa-manus.js --slug=... --so=capa
 *   node --env-file=.env.local src/scripts/youtube/capa-manus.js --creditos
 */

import { readFileSync, existsSync, mkdirSync } from 'fs';
import * as fs from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
/**
 * 🔴 ESTA LINHA FALTAVA, E POR ISSO O ENCOLHIMENTO NUNCA FUNCIONOU (achado a 05/08).
 *
 * O código lá em baixo chama o `ffmpeg` para fazer a cópia a 1920×1080 que o vídeo usa —
 * **e a peça que lança comandos nunca foi importada**. O resultado não era um erro: era um
 * aviso discreto dentro de um resguardo, e o programa seguia em frente a dizer que tinha
 * corrido bem. **As três imagens do primeiro vídeo foram encolhidas à mão**, e as horas
 * dos ficheiros provam-no: os PNG às 15h44-15h52, os JPEG só às 16h34.
 *
 * ⚠️ Enquanto isto esteve partido, **automatizar as imagens era impossível**: cada vídeo
 * novo deixava um PNG de 5 MB fora do repositório e nada dentro dele.
 * É a §42.5 noutro sítio: *o script correu, disse quase-✅, e não fez o trabalho.*
 */
import { execFileSync } from 'child_process';
import {
  creditos, pedirAgente, descarregar, CUSTO_POR_IMAGEM, custoPorImagem, quantasCabem,
} from './lib/manus-client.js';
import { primeiraFrase, MAX_PALAVRAS_CAPA_LONGO } from './lib/palavras.js';
import {
  MOLDES, escolherMolde, cenaDoFio, moldesGastos, guardarMolde,
} from './lib/capas-do-longo.js';
/**
 * ⚠️ IMPORTADO, NÃO COPIADO. O leitor de texto e o caminho do banco de imagens já vivem
 * no `fotos-longo.js`; uma segunda cópia divergia no dia em que alguém mexesse numa
 * delas — o modo de falha crónico desta casa. E `fotos-longo.js` só corre sozinho
 * quando é chamado pelo nome, portanto importá-lo não gera imagem nenhuma nem gasta um
 * único crédito.
 */
import { haLeitor, lerTextoDaImagem, BANCO as BANCO_DE_IMAGENS } from './fotos-longo.js';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, '..', '..', '..');

const args = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => {
    const [k, ...v] = a.slice(2).split('=');
    return [k, v.join('=') || true];
  }),
);

/** A paleta do canal, do `youtube-render/src/theme.ts`. Escrita aqui porque um pedido em
 *  texto não importa ficheiros — mas se ela mudar lá, muda aqui. */
const PALETA = {
  fundo: '#0d1117',
  painel: '#161b22',
  ciano: '#22d3ee',
  violeta: '#8b5cf6',
  magenta: '#d6219c',
  vermelho: '#ef4444',
  verde: '#22c55e',
};

/** A fila de temas — é dela que sai o título que o dono aprovou. Nunca lança. */
function lerFilaDeTemas() {
  try {
    const p = join(RAIZ, '.github', 'data', 'youtube-longos.json');
    return existsSync(p) ? JSON.parse(readFileSync(p, 'utf-8')) : { videos: [] };
  } catch { return { videos: [] }; }
}

const REGRAS_FIXAS = `
STRICT RULES — no human figures, no faces, no hands unless explicitly asked for, no brand logos, no watermarks, no signature, no extra text beyond the words specified above, no placeholder or lorem-ipsum text. Every Portuguese word must be spelled EXACTLY as written, with the accents shown. Extreme contrast, punchy, and readable at 300 pixels wide on a phone.

🔴 NUMBERS ARE FACTS, NOT DESIGN. Every digit in this brief comes from the video's own script. Reproduce each number DIGIT BY DIGIT, exactly as written. Do NOT round it, do NOT make it "look better", do NOT invent a nearby figure, do NOT change the word that follows it. A thumbnail showing a number the video never says is a lie to the viewer, and the image will be rejected and thrown away.

Generate the image and ATTACH the final PNG file to your reply. Do not ask me any questions — if something is ambiguous, choose the boldest option.`;

/**
 * ═══ 🎨 O QUE FALTAVA NA 1ª CAPA, E O DONO VIU ANTES DE MIM ═══
 *
 * *"Achei que faltou um pouco das cores do nosso canal, ou será que isso não tem nada a
 * ver?"* — **tem tudo a ver, e ele tem razão.**
 *
 * A 1ª capa é vermelha à esquerda e verde à direita, e isso está certo: é o vermelho e o
 * verde que contam a história do antes e do depois num relance. **O que faltava era
 * outra coisa: nada naquela imagem dizia FinMoovi.** Sem a marca, sem o fundo do canal,
 * sem a faixa diagonal, aquela capa podia ser de qualquer canal de finanças do mundo — e
 * um canal que quer audiência precisa de ser **reconhecido na lista** antes de ser lido.
 *
 * Portanto o conserto não é tirar o vermelho e o verde. É acrescentar o que nos
 * identifica: o fundo quase-preto azulado do canal, a faixa diagonal, o gradiente
 * ciano→violeta→magenta e a assinatura no canto.
 *
 * Há duas maneiras de o fazer, e a diferença entre elas é de gosto — por isso são duas
 * variantes e quem escolhe é ele:
 *   · `marca`  — o vermelho/verde continua a mandar, e a marca do canal entra por cima;
 *   · `canal`  — as cores do canal mandam, e o vermelho/verde fica só nas setas e selos.
 */
const ASSINATURA_DO_CANAL = `
BRAND SIGNATURE — this must read as a FinMoovi thumbnail at a glance:
· the background is the channel's near-black blue (#0d1117) with darker panels (#161b22), never plain black;
· a wide diagonal band sweeps from the top-right corner down to the left, filled with the channel gradient (#22d3ee cyan → #8b5cf6 violet → #d6219c magenta), semi-transparent over the scene;
· faint concentric rings and a fine dot grid in the darkness, in the same violet;
· in the TOP-LEFT corner, a small clean wordmark in a modern bold sans-serif reading exactly "FinMoovi", where "Fin" is white and "Moovi" is filled with the cyan-to-magenta gradient, preceded by a tiny rising-arrow spark icon in cyan and magenta.`;

/**
 * 🔴 A CAPA É A METÁFORA DO VÍDEO, DENTRO DE UM MOLDE QUE RODA — 09/08/2026.
 *
 * ═══ O QUE ESTAVA AQUI, E POR QUE ESTAVA ERRADO ═══
 * Duas funções gémeas, `promptDaCapa` e `promptDaCapaDoCanal`, com a composição escrita
 * à mão: **sempre** um antes/depois com divisória ao centro, **sempre** uma seta
 * vermelha a descer à esquerda e uma verde a subir à direita, **sempre** notas de cem
 * reais, **sempre** um selo a dizer "3 PASSOS". Postas lado a lado, as duas primeiras
 * capas do canal eram a mesma imagem com outro texto.
 *
 * Palavras do dono: *"vejo que ele gerou uma thumb muito parecida com a thumb do vídeo
 * passado… ele não está diversificando!"* E, quando lhe mostrei a primeira correcção:
 * *"essa capa também está com o molde de comparação tipo antes e depois, e isso também
 * tem que ser dinâmico — não é toda capa que vai dar certo nesse estilo."*
 *
 * ═══ O QUE ENTRA NO LUGAR ═══
 * Duas coisas rodam, e são independentes uma da outra:
 *   · **A CENA** é a metáfora que o vídeo já escolheu (`fioCondutor`). São 32, e a
 *     janela anti-repetição do roteiro **já garante** que ela é diferente das dos
 *     últimos 6 vídeos. Não foi preciso inventar sistema nenhum — herdou-se o que já
 *     existia e nunca tinha sido usado na capa.
 *   · **O MOLDE** é o enquadramento, e são seis — dos quais **só um compara**. Sai do
 *     NOME do vídeo (determinista: o mesmo vídeo dá sempre a mesma capa) e evita os
 *     moldes dos vídeos recentes.
 *
 * ⚠️ **O "3 PASSOS" saiu.** Era verdade, mas estava em todas as capas — e uma coisa
 * verdadeira repetida em todas as capas é exactamente o que as faz parecerem-se. O selo
 * do número fica, porque ele muda de vídeo para vídeo e é o que trava o dedo.
 *
 * ⚠️ **A ASSINATURA DO CANAL não roda**, e é de propósito: a paleta, a logo, o contraste
 * e a legibilidade a 300 px são a MARCA. Se isso variar, o canal deixa de se reconhecer
 * na lista. Varia a cena; fica a assinatura.
 */
function promptDaCapa({ titulo, selo, molde, cena }) {
  const badge = selo
    ? `BADGE — ${molde.selos}, in dark glass outlined in red, reading exactly "R$ ${selo.valor} ${selo.rotulo}". Exactly ONE badge in the whole image.`
    : 'BADGES — none. Do not add any badge, label, sticker or price tag anywhere.';
  return `An ultra-high-definition 16K resolution cinematic YouTube thumbnail, 16:9 aspect ratio, 1280x720 pixels minimum, designed for maximum click-through rate on mobile. Dark premium tech aesthetic, glassmorphism, neon edge lighting, cinematic depth of field.

${molde.desenho(cena)}

TYPOGRAPHY — bold heavy condensed sans-serif, ALL CAPS, across the upper third, in pure white with the last word filled by the cyan-to-magenta gradient (${PALETA.ciano} → ${PALETA.magenta}), reading exactly: "${titulo}"

${badge}
${ASSINATURA_DO_CANAL}
${REGRAS_FIXAS}`;
}


/** AS IMAGENS DO MEIO DO VÍDEO — as três que o dono aprovou, cada uma presa a uma cena. */
function promptsDasImagens({ rotativoAoMes }) {
  const juro = String(rotativoAoMes).replace('.', ',');
  return [
    {
      ficheiro: 'imagem-1-o-susto',
      onde: 'a cena do susto — "abriu a fatura e o estômago gelou"',
      prompt: `A cinematic photorealistic close-up, 16:9 aspect ratio, 1920x1080 pixels. A pair of hands holding an open paper bill in a dark room. The only light is the cold blue-white glow of a phone screen from below, throwing hard shadows upward across the paper. Background near-black (${PALETA.fundo}), a soft violet (${PALETA.violeta}) rim-light on the edges. Shallow depth of field, fine film grain, heavy atmosphere of dread. Hands only — no face, no person visible above the wrists.

🔴 CRITICAL — THE PAPER MUST CARRY NO READABLE TEXT AND NO NUMBERS AT ALL. Render the printing as soft grey blur: the RHYTHM of rows and columns is visible, but not a single legible word, digit, date or currency symbol anywhere on the sheet. No dollar signs, no "$", no English words, no headings. If any character would be readable, blur it out. One horizontal band near the middle glows faint red, and that band is also blurred.
${REGRAS_FIXAS}`,
    },
    {
      ficheiro: 'imagem-2-o-numero',
      onde: 'a cena em que se diz quanto se paga a mais',
      prompt: `A stylised editorial poster, 16:9 aspect ratio, 1920x1080 pixels, in the visual language of a modern explainer channel. IMPORTANT — this is an original poster, NOT a reproduction of any real newspaper: no masthead, no publication name, no dateline, no columns of fake news copy.

A torn-paper panel in warm off-white sits at an angle on a near-black (${PALETA.fundo}) background, with a thin cyan-to-magenta gradient bar (${PALETA.ciano} → ${PALETA.magenta}) across its top edge. On the panel, in huge heavy black condensed type, reading exactly: "${juro}% AO MÊS". Directly beneath, in smaller black type, reading exactly: "juro do rotativo do cartão". At the bottom edge of the panel, in small grey type, reading exactly: "Fonte: Banco Central do Brasil". A rough red ink circle drawn by hand around the big number, and a red underline beneath it.
${REGRAS_FIXAS}`,
    },
    {
      ficheiro: 'imagem-3-a-virada',
      onde: 'o fecho — a promessa de que dá para sair',
      prompt: `A cinematic wide shot, 16:9 aspect ratio, 1920x1080 pixels, seen from inside a narrow dark corridor lit in deep crimson red (${PALETA.vermelho}), opening onto a wide bright space lit in cool cyan (${PALETA.ciano}) and violet (${PALETA.violeta}). Silhouetted stacks of paper, boxes and folders crowd the red corridor walls; the bright side beyond the opening is empty, clean and airy. Strong volumetric light beams cutting through dust, near-black (${PALETA.fundo}) surfaces, extreme contrast between the two halves. Architectural, symbolic, no people.
${REGRAS_FIXAS}`,
    },
  ];
}

/**
 * 🔴 UM TÍTULO DE UMA PALAVRA JÁ CHEGOU A SAIR DAQUI — 10/08/2026.
 *
 * ═══ O QUE SE MEDIU ═══
 * No vídeo `onde-o-salario-some`, o `tema` do guião é a palavra **"Onde"** — o resto
 * perdeu-se na altura em que a corrida foi lançada à mão. Metido nesta conta, o resultado
 * era uma miniatura com a palavra **"ONDE"** escrita a toda a largura, paga a ~82
 * créditos, e o programa **não se queixava**: "Onde" cabe no limite de palavras, portanto
 * passava por boa.
 *
 * ⚠️ **`assuntoCurto` escolhe o primeiro candidato que CABE, e caber não é ser um
 * título.** Ela está certa para o que faz — é a conta do ASSUNTO, o que vai à descrição e
 * às etiquetas — e não se mexe nela sem mexer no Short. O que faltava era **julgar o
 * resultado antes de o pagar**, e é isso que esta função é.
 *
 * ═══ 🔴 E ELA NÃO SERVE PARA A CAPA, POR UMA SEGUNDA RAZÃO, MEDIDA ═══
 * `assuntoCurto` corta às **seis palavras**. Posta a trabalhar sobre a frase da capa deste
 * vídeo, devolveu **"POR QUE O DINHEIRO SOME ANTES"** — uma frase pendurada, cortada a
 * meio, para pôr em letras enormes na miniatura do canal. Um título cortado a meio é tão
 * mau como um título de uma palavra; só é mais difícil de ver.
 *
 * ⚠️ **Portanto aqui não se corta nada.** Usa-se a MESMA limpeza (`primeiraFrase`, que
 * saiu de dentro do `assuntoCurto` para não haver duas cópias da regra) e aceita-se a
 * frase **inteira** — ou não se aceita. O teto é `MAX_PALAVRAS_CAPA_LONGO`, que é o mesmo
 * teto que a frase da capa já obedece dentro do vídeo: se cabe na tela, cabe na miniatura.
 *
 * ═══ A ORDEM DAS FONTES, E PORQUÊ ═══
 *   1. **o título da fila** — é a frase que o dono escreveu e aprovou;
 *   2. **o tema do guião** — o que o robô recebeu como tarefa;
 *   3. **a frase da capa do vídeo** — a pergunta que já aparece ESCRITA no ecrã aos
 *      primeiros segundos. Nunca passa de 12 palavras (lei desde 10/08) e é, à letra, a
 *      manchete do vídeo. É a rede por baixo das outras duas, e a que nunca falha.
 *
 * Ganha a primeira que der uma frase inteira entre três e doze palavras.
 *
 * ⚠️ **Se nenhuma der, devolve vazio e NÃO SE PAGA A CAPA.** Uma miniatura a dizer "ONDE"
 * fica na lista do canal para sempre; sem miniatura, o YouTube escolhe um fotograma do
 * próprio vídeo. Das duas, a segunda é a menos má — e no robô isto vira um aviso, não uma
 * corrida morta (o passo do workflow acaba em `|| echo ::warning`).
 *
 * ⚠️ **VIVE FORA DO `main` de propósito.** Estava lá dentro, e por isso nenhuma prova lhe
 * chegava — foi assim que o "ONDE" atravessou 153 provas verdes sem tocar em nenhuma.
 */
export const MINIMO_DE_PALAVRAS_NO_TITULO = 3;

export function tituloDaCapa({ tituloDaFila = '', tema = '', fraseDaCapa = '' } = {}, aoSaltar = () => {}) {
  const fontes = [
    { de: 'o título da fila', texto: tituloDaFila },
    { de: 'o tema do guião', texto: tema },
    { de: 'a frase da capa do vídeo', texto: fraseDaCapa },
  ];
  for (const f of fontes) {
    if (!f.texto) continue;
    const t = primeiraFrase(f.texto);
    const n = t.split(/\s+/).filter(Boolean).length;
    if (n >= MINIMO_DE_PALAVRAS_NO_TITULO && n <= MAX_PALAVRAS_CAPA_LONGO) {
      return { titulo: t.toLocaleUpperCase('pt-BR'), de: f.de };
    }
    aoSaltar(
      n < MINIMO_DE_PALAVRAS_NO_TITULO
        ? `${f.de} dava "${t}" — ${n} palavra(s), curto demais para uma miniatura`
        : `${f.de} dava ${n} palavras — comprido demais, e cortá-lo deixaria a frase pendurada`,
    );
  }
  return { titulo: '', de: '' };
}

/**
 * 🔴 O NÚMERO-ESPINHA ESTAVA A SER PROCURADO NO FICHEIRO ERRADO — 10/08/2026.
 *
 * ═══ O DEFEITO, E ELE NÃO SE QUEIXAVA ═══
 * Isto lia `roteiro.mapa.numeroEspinha` do guião **montado**
 * (`youtube-render/public/roteiro/<slug>.json`) — e esse ficheiro **não tem `mapa`
 * nenhum**. As chaves dele são `slug, formato, tema, promessa, fioCondutor, capa,
 * capitulos, scenes, palavras`. O montador não o copia para lá.
 *
 * Portanto a rede de segurança escrita em 09/08 — *"sem ficha usa-se o número-espinha do
 * próprio vídeo"* — **nunca chegou a apanhar nada**. `Number(undefined)` dá `NaN`,
 * `Number.isFinite(NaN)` dá falso, e a capa saía **sem selo**, em silêncio, com uma linha
 * a dizer "sem número no guião" que não era verdade.
 *
 * ⚠️ **Medido no vídeo `onde-o-salario-some`:** `fichaDeDivida: null` (não é história de
 * cartão) e `numeroEspinha: 1200` no caderno. O número existia, estava a dois passos
 * daqui, e a capa ia sair sem o selo que trava o dedo de quem passa.
 *
 * ⚠️ **É a mesma família do defeito §67.7 nº 4:** uma regra a ler um número de um ficheiro
 * que não é o que o tem. O conserto é ler onde ele vive — o caderno, que o programa **já
 * abre** para tirar a ficha de juros. Não se abre ficheiro novo nenhum.
 *
 * ⚠️ **E o caderno só vale com o guião ao lado** (ver a nota do caderno órfão): quem
 * chama já entrega `caderno = null` quando é sobra de uma corrida antiga. Sem os dois,
 * fica sem selo — que é a regra certa: **nunca se inventa número**.
 */
export function seloDaCapa({ ficha = null, caderno = null, roteiro = {} } = {}) {
  const aMais = ficha?.aMais || null;
  if (aMais) return { valor: aMais, rotulo: 'A MAIS' };
  const espinha = Number(
    caderno?.mapa?.numeroEspinha
    ?? caderno?.numeroEspinha
    ?? roteiro?.mapa?.numeroEspinha
    ?? roteiro?.numeroEspinha,
  );
  // ⚠️ O piso de 10 existe para um "3" solto no guião não virar um selo a dizer "R$ 3".
  return Number.isFinite(espinha) && espinha >= 10 ? { valor: espinha, rotulo: 'POR MÊS' } : null;
}

async function main() {
  if (args.creditos) {
    const c = await creditos();
    console.log(`\n💳 créditos: ${c.total} ao todo · ${c.restaHoje} ainda por gastar hoje (de ${c.porDia}/dia) · ${c.livres} de saldo próprio`);
    // ⚠️ O 52 estava escrito à mão AQUI e num `const` noutro ficheiro — duas cópias do
    //    mesmo número, e as duas erradas. Agora é o do `manus-client.js`, medido em 10/08.
    console.log(`   a ${CUSTO_POR_IMAGEM} créditos por imagem, dá para mais ${quantasCabem(c.total)} imagem(ns)`);
    // ⚠️ O saldo PODE vir negativo (visto: -2 em 10/08). Antes desta linha saía
    //    "dá para mais -1 imagem(ns)", que não é uma resposta.
    if (c.total <= 0) console.log('   ⚠️ hoje NÃO dá para nenhuma — a renovação diária ainda não caiu.\n');
    else console.log('');
    return;
  }

  const slug = String(args.slug && args.slug !== true ? args.slug : 'sair-do-vermelho');
  const so = args.so && args.so !== true ? String(args.so) : null; // 'capa' | 'imagens'

  const caminhoRoteiro = join(RAIZ, 'youtube-render', 'public', 'roteiro', `${slug}.json`);
  const caminhoCaderno = join(RAIZ, 'src', 'scripts', 'youtube', 'output', `${slug}.caderno.json`);
  if (!existsSync(caminhoRoteiro)) throw new Error(`não há guião montado para "${slug}"`);
  const roteiro = JSON.parse(readFileSync(caminhoRoteiro, 'utf-8'));

  // ⚠️ Os números vêm do caderno do vídeo, NUNCA escritos à mão aqui. Se o caderno não
  // existir, o cartaz do número não se faz — em vez de sair com um número inventado.
  /**
   * 🔴 O CADERNO ÓRFÃO — 09/08/2026, e custou-me três capas pagas a perceber.
   *
   * ═══ O QUE ACONTECEU ═══
   * Pedi a capa do vídeo 2 três vezes. As três vieram com o selo **"R$ 614 A MAIS"**,
   * quando o vídeo diz seiscentos reais e não tem fatura de cartão nenhuma. Acusei a
   * Manus de inventar números e de reaproveitar tarefas. **Estava errado nas duas.**
   *
   * O 614 estava num ficheiro NOSSO: `<slug>.caderno.json`, com data de 08/08 10:32 —
   * sobra de uma das corridas que falharam naquela manhã. Lá dentro: fatura 780,
   * numeroEspinha 1280, aMais 614. **Nada disso é o vídeo que foi feito.** O programa
   * leu-o, montou o selo com 614 e a Manus escreveu 614, obedecendo.
   *
   * ═══ POR QUE O ROBÔ NÃO SOFRE DISTO, E ESTA MÁQUINA SIM ═══
   * O caderno e o guião são escritos pela MESMA corrida do `roteiro-longo.js`, e os dois
   * estão no `.gitignore`. Na nuvem, cada corrida parte de um clone limpo: ou existem os
   * dois e batem certo, ou não existe nenhum. **Aqui não** — o disco guarda tudo o que
   * as corridas falhadas deixaram para trás, e nada as limpa.
   *
   * ═══ A REGRA ═══
   * **Um caderno sem o guião ao lado é uma sobra, e não se acredita nele.** É a única
   * prova barata de que os dois vieram da mesma corrida. Sem ficha, a capa cai no
   * número-espinha do guião — e sem esse, sai sem selo. Nunca inventa.
   */
  const caminhoGuiao = join(RAIZ, 'src', 'scripts', 'youtube', 'output', `${slug}.longo.json`);
  const caderno = existsSync(caminhoCaderno) && existsSync(caminhoGuiao)
    ? JSON.parse(readFileSync(caminhoCaderno, 'utf-8'))
    : null;
  if (existsSync(caminhoCaderno) && !existsSync(caminhoGuiao)) {
    console.log(`   ⚠️ há um "${slug}.caderno.json" sem o guião ao lado — é sobra de uma corrida antiga, e não se usa.`);
  }
  const ficha = caderno?.mapa?.fichaDeDivida || caderno?.fichaDeDivida || null;

  const destino = join(RAIZ, 'youtube-render', 'public', 'manus', slug);
  mkdirSync(destino, { recursive: true });

  const antes = await creditos();
  console.log(`\n🎨 MANUS — "${roteiro.tema}"`);
  console.log(`   créditos antes: ${antes.livres} livres de ${antes.total}\n`);

  const trabalhos = [];
  /** As capas que a máquina leu e recusou — vão para a quarentena do banco no fim. */
  const recusadas = [];
  /**
   * ⚠️ **DECLARADO AQUI FORA, e não dentro do `if` — 09/08/2026.** Estava com `const`
   * dentro do bloco que monta o pedido da capa, e quem precisa dele é a CONFERÊNCIA, que
   * corre lá em baixo. Resultado: `selo is not defined` no meio da corrida, depois de a
   * imagem já estar paga e descarregada. `node --check` não apanha isto — só correr.
   */
  let selo = null;
  /**
   * ⚠️ **AQUI FORA, pela MESMA razão do `selo` — e eu voltei a cair nela hoje.** Quem
   * precisa do molde é o registo do caderno, que corre lá em baixo, depois de a imagem
   * estar feita. Declarado dentro do `if`, dava `molde is not defined` no meio da
   * corrida, com a capa já paga. `node --check` não apanha isto; só correr apanha.
   */
  let molde = MOLDES[0];
  if (so !== 'imagens') {
    /**
     * 🔴 O TÍTULO ESTAVA CRAVADO EM 'SAIR DO VERMELHO' — 08/08/2026.
     *
     * Era o título do vídeo PILOTO, escrito à mão quando só existia um vídeo. Correr
     * isto para qualquer outro slug dava uma miniatura com o título de outro vídeo —
     * e ninguém daria por isso, porque o programa não falha: devolve uma imagem bonita
     * e errada. É o mesmo defeito de família que o `FOTOS_POR_VIDEO` tinha em
     * `imagens-longo.js`, e que reprovava todos os vídeos menos o piloto.
     *
     * Passou então a sair do TEMA do guião, cortado às seis palavras pelo `assuntoCurto`
     * — a mesma conta da descrição e das etiquetas, para não haver três cópias da regra.
     *
     * ⚠️ **E EM 10/08 ISSO MOSTROU-SE ERRADO PARA A CAPA, com duas medições:** um tema de
     * uma palavra dava a miniatura **"ONDE"**, e o corte às seis palavras dava
     * **"POR QUE O DINHEIRO SOME ANTES"** — pendurada a meio. A conta do ASSUNTO não é a
     * conta do TÍTULO. A escolha vive agora em `tituloDaCapa`, fora do `main`, com as
     * três fontes por ordem e o teto de 12 palavras. Ver a nota lá em cima.
     */
    const naFila = (lerFilaDeTemas().videos || []).find((v) => v.slug === slug) || {};
    // A conta e o porquê estão em `tituloDaCapa`, lá em cima — fora do `main` para a
    // prova lhe poder chegar, que é o que faltava quando o "ONDE" passou.
    const { titulo, de: deOnde } = tituloDaCapa(
      { tituloDaFila: naFila.titulo, tema: roteiro.tema, fraseDaCapa: roteiro.capa },
      (m) => console.log(`   ⏭️  ${m}`),
    );
    if (!titulo) {
      throw new Error(
        'nenhuma fonte deu um título com mais de duas palavras (fila, tema, frase da capa) '
        + '— a capa NÃO se faz, para não gastar créditos numa miniatura que não diz nada',
      );
    }
    console.log(`   ✍️  título da capa: "${titulo}" (de ${deOnde})`);
    /**
     * 🔴 SEM A FICHA DE JUROS, A CAPA JÁ NÃO PARA — 09/08/2026, ordem do dono:
     * *"nunca parar e não gerar"*.
     *
     * A ficha só existe quando a história TEM uma fatura de cartão (é ela que leva a
     * taxa do Banco Central). Um vídeo sobre dois homens num ponto de ônibus não tem
     * nenhuma — e a capa dele morria aqui, com um erro, quando o que faltava era só
     * um dos dois selos.
     *
     * ⚠️ **E continua sem inventar número nenhum**, que era a razão certa do erro
     * antigo: sem ficha usa-se o NÚMERO-ESPINHA do próprio vídeo (o que os três atos
     * são obrigados a dizer, e que já está no guião), e o selo passa a dizer "POR MÊS"
     * em vez de "A MAIS". Se nem espinha houver, a capa sai **sem o selo** — uma capa
     * com um selo a menos é uma capa; uma capa com um número inventado é uma mentira.
     */
    // ⚠️ A conta, e o defeito que ela conserta, estão em `seloDaCapa`, lá em cima: o
    //    número-espinha era procurado no guião montado, que NÃO o tem. Ver a nota lá.
    selo = seloDaCapa({ ficha, caderno, roteiro });
    if (!selo) console.log('   ⚠️ sem número no guião nem no caderno — a capa sai sem o selo vermelho (nada é inventado).');
    else console.log(`   🔖 selo: R$ ${selo.valor} ${selo.rotulo}`);
    /**
     * 🔴 A CENA SAI DA METÁFORA DO VÍDEO, E O MOLDE RODA — 09/08/2026.
     *
     * ⚠️ **O `fioCondutor` está no plano montado desde sempre e nunca foi usado aqui.**
     * É a peça que faltava: cada vídeo já escolhe uma das 32 metáforas, e a janela
     * anti-repetição do roteiro já garante que ela não se repete em 6 vídeos. A capa
     * herda isso de graça.
     *
     * ⚠️ **`--variante` mudou de significado, e é um upgrade honesto.** Antes escolhia
     * entre duas capas escritas à mão ("marca" e "canal"); agora **força um molde** pelo
     * nome (`--variante=o-detalhe`), para o dono poder pedir outro enquadramento sem
     * mexer em código. Sem ela, quem escolhe é o nome do vídeo.
     */
    const fio = roteiro.fioCondutor || roteiro.mapa?.fioCondutor || null;
    const forcado = args.variante && args.variante !== true ? String(args.variante) : null;
    // ⚠️ `slug` vai lá dentro para o vídeo não contar o molde DELE PRÓPRIO como gasto —
    //    ver a nota de `moldesGastos`. Sem ele, pedir a capa outra vez mudava o molde.
    molde = (forcado && MOLDES.find((m) => m.nome === forcado)) || escolherMolde(slug, moldesGastos({ slug }));
    if (forcado && !MOLDES.find((m) => m.nome === forcado)) {
      console.log(`   ⚠️ não há molde "${forcado}". Os que existem: ${MOLDES.map((m) => m.nome).join(', ')}. Vai o escolhido pelo nome do vídeo.`);
    }
    const cena = cenaDoFio(fio);
    console.log(`   🎭 metáfora do vídeo: ${fio || '(nenhuma — vai a cena de reserva)'}`);
    console.log(`   🖼️  molde: ${molde.nome}`);
    trabalhos.push({
      ficheiro: `capa-${molde.nome}`,
      onde: `a miniatura do YouTube (molde "${molde.nome}", metáfora "${fio || 'reserva'}")`,
      prompt: promptDaCapa({ titulo, selo, molde, cena }),
    });
  }
  if (so !== 'capa') {
    const juro = ficha?.taxas?.rotativoAoMes;
    for (const im of promptsDasImagens({ rotativoAoMes: juro })) {
      if (im.ficheiro === 'imagem-2-o-numero' && !juro) {
        console.log('   ⏭️  o cartaz do número fica de fora: não há a taxa do Banco Central no caderno');
        continue;
      }
      trabalhos.push(im);
    }
  }

  // ⚠️ Refazer UMA imagem sem pagar as outras outra vez. Cada pedido custa ~82 créditos
  // (medido em 10/08 — aqui dizia "~48", que era a terceira cópia errada do mesmo número)
  // dos 300 que a conta grátis renova por dia: refazer as quatro por causa de uma seria
  // MAIS do que o orçamento do dia inteiro deitado fora.
  const apenas = args.apenas && args.apenas !== true ? String(args.apenas) : null;
  const fila = apenas ? trabalhos.filter((t) => t.ficheiro.includes(apenas)) : trabalhos;
  if (apenas && !fila.length) throw new Error(`"--apenas=${apenas}" não bate com nenhum pedido`);

  /**
   * 🔴 A MÁQUINA LÊ A CAPA — 09/08/2026, e nasceu de uma capa errada em cima da mesa.
   *
   * ═══ O QUE ACONTECEU ═══
   * Pediu-se uma capa com o selo **"R$ 600 POR MÊS"** — o número-espinha do vídeo, o
   * único que a narração diz. A Manus devolveu uma capa bonita a dizer **"R$ 614 A
   * MAIS"**. Nem o número nem o rótulo eram os pedidos. **O programa não deu erro
   * nenhum**: descarregou, encolheu, escreveu ✅ e seguiu.
   *
   * ⚠️ É a mesma família do defeito §42.5: *o script correu, disse quase-✅, e pôs no
   * ecrã um número que o vídeo nunca diz*. Numa miniatura isso é pior do que no meio do
   * vídeo — é a primeira coisa que se vê do canal, e fica na lista para sempre.
   *
   * ═══ A REGRA ═══
   * Se houver leitor de texto, lê-se a capa e confere-se que **o número do selo está lá**.
   * Não está → a capa vai para a quarentena (foi paga) e pede-se outra.
   *
   * ⚠️ **SEM LEITOR NÃO SE RECUSA NADA**, e é deliberado: a regra não se pode garantir
   * sem a ler, e recusar às cegas seria queimar créditos por suspeita. Fica um aviso a
   * dizer que ninguém conferiu — que é a verdade.
   *
   * ⚠️ **E ISTO NÃO CONFERE SE A CAPA É BONITA.** Isso é gosto, e gosto mede-se com o
   * dono a olhar. O que se mede aqui é VERDADE: o número que lá está é o do vídeo.
   */
  const conferirSelo = (caminhoJpg) => {
    if (!selo) return { ok: true, porque: 'esta capa não leva selo de número' };
    if (!haLeitor()) return { ok: true, porque: '⚠️ não há leitor de texto nesta máquina — ninguém conferiu o número' };
    let lido;
    try { lido = lerTextoDaImagem(caminhoJpg).legiveis.join(' '); } catch (err) { return { ok: true, porque: `⚠️ o leitor falhou (${err.message}) — ninguém conferiu` }; }
    // O número inteiro, sem separadores — é assim que o OCR o costuma devolver.
    const alvo = String(Math.trunc(Number(selo.valor)));
    if (lido.replace(/[.\s]/g, '').includes(alvo)) return { ok: true, porque: `conferido: a capa diz ${alvo}` };
    return { ok: false, porque: `o selo devia dizer R$ ${alvo} ${selo.rotulo} e leu-se: ${lido.slice(0, 120)}` };
  };

  /** Quantos pedidos foram mesmo pagos — é o divisor da conta do custo real, lá em baixo.
   *  ⚠️ Conta-se a TENTATIVA e não a imagem boa: uma recusada custou o mesmo. */
  let pedidos = 0;
  for (const t of fila) {
    console.log(`🖼️  ${t.ficheiro} — ${t.onde}`);
    try {
      pedidos += 1;
      /**
       * A tentativa vai no título da tarefa, como já vai no `fotos-longo.js`. Serve para
       * distinguir corridas no painel da Manus.
       *
       * ⚠️ Não se usa a hora: o mesmo pedido tem de dar sempre a mesma imagem, senão
       * refazer um vídeo muda-lhe a cara. Usa-se **quantas já existem em disco**.
       *
       * ⚠️ **E NÃO FOI ISTO QUE RESOLVEU O 614** — fica escrito para ninguém repetir o
       * meu erro. Eu vi a mesma capa errada sair três vezes, concluí que a Manus estava
       * a reaproveitar a tarefa e escrevi esta linha. **A Manus estava a fazer
       * exactamente o que se lhe pedia.** O número errado vinha de um ficheiro NOSSO —
       * ver a nota do caderno órfão, mais abaixo. Acusar a ferramenta antes de imprimir
       * o que se lhe manda custou-me duas imagens pagas.
       */
      const jaTentadas = fs.readdirSync(destino).filter((f) => f.startsWith(`${t.ficheiro}`) && f.endsWith('.png')).length;
      const r = await pedirAgente(t.prompt, {
        titulo: `FinMoovi · ${slug} · ${t.ficheiro}${jaTentadas ? ` · tentativa ${jaTentadas + 1}` : ''}`,
        aoAndar: (m) => console.log(`      ${m}`),
      });
      const imagens = r.anexos.filter((a) => a.type === 'image' || /^image\//.test(a.content_type || ''));
      if (!imagens.length) {
        console.log(`      ❌ voltou sem imagem. O agente disse: ${String(r.texto).slice(0, 160)}`);
        continue;
      }
      for (const [i, im] of imagens.entries()) {
        const ext = (im.filename || '').split('.').pop() || 'png';
        let base = imagens.length > 1 ? `${t.ficheiro}-${i + 1}` : t.ficheiro;
        /**
         * 🔴 A CAPA DE ANTES NÃO SE APAGA — 09/08/2026, ordem do dono:
         * *"essa capa que gerou tem que ir pro nosso banco de imagens que poderá ser
         * usada no futuro, e tem que gerar outra"*.
         *
         * Correr isto outra vez escrevia POR CIMA da anterior. Cada capa custa ~82
         * créditos; uma que não agradou hoje pode servir noutro vídeo, e a que era boa
         * desaparecia sem ninguém dar por nada. Agora a nova ganha um número e as
         * antigas ficam todas na pasta.
         *
         * ⚠️ **A que vai ao YouTube continua a ser `capa.jpg`** — o `upload-longo.js`
         * procura nomes fixos. Quando o dono escolher outra, renomeia-se; enquanto
         * ninguém escolher, a primeira é a que manda. Mudar isso sozinho seria trocar
         * a miniatura do canal sem ninguém pedir.
         */
        let versao = 1;
        while (existsSync(join(destino, `${base}.${ext}`)) || existsSync(join(destino, `${base}.jpg`))) {
          versao += 1;
          base = `${imagens.length > 1 ? `${t.ficheiro}-${i + 1}` : t.ficheiro}-v${versao}`;
        }
        if (versao > 1) console.log(`      📚 já havia uma "${t.ficheiro}" — esta fica como "${base}" e a de antes não se perde`);
        const nome = `${base}.${ext}`;
        const bytes = await descarregar(im.url, join(destino, nome), fs);
        console.log(`      ✅ ${nome} (${Math.round(bytes / 1024)} KB)`);
        /**
         * ⚠️ A VERSÃO QUE O VÍDEO USA É OUTRA, e por uma razão de arrumação: a Manus
         * devolve PNG de 2560×1440 com 4 a 6 MB. O vídeo é 1920×1080, portanto **os
         * pixels a mais não aparecem em lado nenhum** — só engordavam o repositório
         * cinco vezes mais do que o maior ficheiro que lá está hoje (1,2 MB).
         * Em JPEG, à medida certa, são ~250 KB e **essa** vai para o repositório: sem
         * ela, um clone limpo não conseguia renderizar o vídeo.
         */
        /**
         * 🔴 A CAPA TAMBÉM PRECISA DA VERSÃO JPG — e não a tinha, até 08/08/2026.
         *
         * Esta conversão só corria para os ficheiros `imagem-*`. A capa saía em PNG…
         * e o `upload-longo.js:85` só procura `.jpg` (`capa-canal-youtube.jpg`,
         * `capa-youtube.jpg`, `capa-canal.jpg`, `capa.jpg`). Ou seja: mesmo correndo
         * este programa à mão, a miniatura recém-feita **nunca seria encontrada** e o
         * YouTube continuava a escolher um fotograma sozinho.
         *
         * ⚠️ A capa vai a 1280×720, que é a medida do YouTube, e não a 1920×1080 como
         * as imagens do meio do vídeo — essas são para o RENDER, esta é para a lista
         * de vídeos.
         */
        const paraOVideo = join(destino, `${base}.jpg`);
        const ehCapa = t.ficheiro === 'capa' || t.ficheiro.startsWith('capa-');
        if (t.ficheiro.startsWith('imagem-') || ehCapa) {
          try {
            const medida = ehCapa ? 'scale=1280:720:flags=lanczos' : 'scale=1920:1080:flags=lanczos';
            execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', join(destino, nome),
              '-vf', medida, '-q:v', '3', paraOVideo], { stdio: 'ignore' });
            const kb = Math.round(fs.statSync(paraOVideo).size / 1024);
            console.log(`         → ${base}.jpg (${kb} KB) — ${ehCapa ? 'é esta que vai ao YouTube' : 'é esta que o vídeo usa'}`);
            /**
             * 🔴 A CONFERÊNCIA DO NÚMERO — ver `conferirSelo`, mais acima.
             * ⚠️ Ela corre sobre o **JPEG**, que é o ficheiro que vai mesmo ao YouTube,
             * e não sobre o PNG de 2560 px. Conferir uma imagem e publicar outra seria
             * conferir coisa nenhuma — e é um erro que esta casa já cometeu.
             */
            if (ehCapa) {
              const v = conferirSelo(paraOVideo);
              if (v.ok) {
                console.log(`         ${v.porque.startsWith('⚠️') ? v.porque : `✅ ${v.porque}`}`);
                /**
                 * ⚠️ O molde só se dá por gasto quando a capa FICA — é o mesmo princípio
                 * do caderno de cenas: guarda-se depois de a coisa existir, senão o
                 * caderno passa a dizer que saiu um molde que ninguém chegou a ver.
                 */
                if (guardarMolde(slug, molde.nome)) console.log(`         📓 molde "${molde.nome}" guardado — os próximos vídeos vão evitá-lo`);
              } else {
                console.log(`         ❌ RECUSADA — ${v.porque}`);
                console.log('            Uma miniatura é a primeira coisa que se vê do canal; um número que o vídeo não diz fica lá para sempre.');
                recusadas.push({ ficheiro: `manus/${slug}/${base}.jpg`, motivo: v.porque });
              }
            }
          } catch (err) {
            console.log(`         ⚠️ não deu para fazer a versão do vídeo (${err.message.split('\n')[0]})`);
          }
        }
      }
    } catch (err) {
      console.log(`      ❌ ${err.message.split('\n')[0]}`);
    }
  }

  /**
   * 🔴 O QUE FOI RECUSADO VAI PARA O BANCO — ordem do dono: *"essa capa que gerou tem
   * que ir pro nosso banco de imagens que poderá ser usada no futuro, e tem que gerar
   * outra"*. Custou ~82 créditos; não se deita fora sem registo.
   *
   * ⚠️ **Vai para `recusadas`, a prateleira de onde nenhum robô escolhe sozinho** — a
   * mesma que o `fotos-longo.js` usa. Uma capa com o número errado não pode voltar a
   * entrar por acidente; o que ela guarda é a memória de que se tentou e porque não deu.
   */
  if (recusadas.length) {
    const banco = existsSync(BANCO_DE_IMAGENS) ? JSON.parse(readFileSync(BANCO_DE_IMAGENS, 'utf-8')) : {};
    const lista = [...(banco.recusadas || [])];
    for (const r of recusadas) {
      if (lista.some((x) => x.ficheiro === r.ficheiro)) continue;
      lista.push({
        ficheiro: r.ficheiro, significado: 'a miniatura do YouTube', tipo: 'capa', motivo: r.motivo, recusadaEm: [slug], em: new Date().toISOString().slice(0, 10),
      });
    }
    fs.writeFileSync(BANCO_DE_IMAGENS, `${JSON.stringify({ ...banco, recusadas: lista }, null, 2)}\n`, 'utf-8');
    console.log(`\n🚧 ${recusadas.length} capa(s) recusada(s) — guardadas na quarentena do banco, não se perderam.`);
    console.log('   Para pedir outra: o mesmo comando outra vez (a anterior não é apagada).');
  }

  const depois = await creditos();
  console.log(`\n💳 créditos depois: ${depois.livres} livres — gastou ${antes.livres - depois.livres}`);
  /**
   * ⚠️ **QUANTO CUSTOU POR IMAGEM, MEDIDO** — 10/08/2026. O `CUSTO_POR_IMAGEM` esteve
   * errado em 30 créditos durante dois meses porque ninguém o voltou a medir. Esta linha
   * é o que faz o erro aparecer da próxima vez, em vez de esperar por outra corrida
   * interrompida a meio.
   */
  const real = custoPorImagem(antes.livres, depois.livres, pedidos);
  if (real) {
    console.log(`   → ${real} por imagem em ${pedidos} pedido(s) (a régua diz ${CUSTO_POR_IMAGEM})`);
    if (Math.abs(real - CUSTO_POR_IMAGEM) > 15) {
      console.log(`   ⚠️ a régua está a ${Math.abs(real - CUSTO_POR_IMAGEM)} créditos da realidade — corrija CUSTO_POR_IMAGEM em lib/manus-client.js.`);
    }
  }
  console.log(`📁 ${destino}\n`);
}

/**
 * 🔴 SÓ CORRE QUANDO É CHAMADO PELO NOME — 09/08/2026, e custou créditos a aprender.
 *
 * Esta linha era `main().catch(...)` à solta. Isso quer dizer que **bastava alguém
 * IMPORTAR este ficheiro para ele começar a gerar imagens** — e foi o que aconteceu
 * hoje: um `import()` escrito só para provar que os imports novos resolviam disparou
 * uma corrida a sério, com o slug por omissão (o do piloto) e sem `--so`, ou seja **as
 * quatro imagens**. Deu para travar a meio, e mesmo assim foram-se créditos.
 *
 * ⚠️ O `fotos-longo.js` e o `upload-longo.js` já tinham esta guarda, com o comentário
 * a explicar porquê: *"importar não é publicar"*. Este ficheiro é o que gasta dinheiro
 * de verdade e era o único sem ela.
 *
 * ⚠️ **E foi a trava das versões, escrita uma hora antes, que salvou a capa do piloto:**
 * em vez de escrever por cima de `capa.png`, a corrida acidental deixou `capa-v2`. O
 * conserto de hoje pagou-se a si próprio no mesmo dia.
 */
const chamadoPeloNome = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (chamadoPeloNome) {
  main().catch((err) => { console.error(`\n❌ ${err.message}\n`); process.exit(1); });
}
