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
 * ⚠️ **NÃO ENTRA NO ROBÔ DIÁRIO.** Corre-se à mão, e conta os créditos gastos.
 *
 * Uso:
 *   node --env-file=.env.local src/scripts/youtube/capa-manus.js --slug=sair-do-vermelho
 *   node --env-file=.env.local src/scripts/youtube/capa-manus.js --slug=... --so=capa
 *   node --env-file=.env.local src/scripts/youtube/capa-manus.js --creditos
 */

import { readFileSync, existsSync, mkdirSync } from 'fs';
import * as fs from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
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
import { creditos, pedirAgente, descarregar } from './lib/manus-client.js';
import { assuntoCurto } from './lib/palavras.js';

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

/** A CAPA. É o pedido do dono, adaptado: sem pessoa, antes/depois, vermelho contra verde. */
/**
 * 🔴 O QUE ESTÁ NA CAPA TEM DE SER A HISTÓRIA DESTE VÍDEO — 09/08/2026.
 *
 * A 1ª versão trazia, escrito à mão, *"unpaid credit-card bills and bank statements"* e
 * um selo a dizer **"3 PASSOS"**. Eram os do vídeo PILOTO. Correr isto para um vídeo
 * sobre dois homens num ponto de ônibus dava uma miniatura de faturas de cartão — e,
 * como sempre nesta família de defeito, **o programa não falhava: devolvia uma imagem
 * bonita e errada**. É irmão do título cravado que se apanhou em 08/08.
 *
 * · o OBJETO só é uma fatura de cartão quando a história tem uma (`contaDoCartao`);
 * · o SELO do número vem do vídeo, e não existe se o vídeo não tiver número;
 * · o selo verde continua a dizer "3 PASSOS" porque isso é VERDADE em todos: o esqueleto
 *   da casa são três capítulos, e eles são os três passos. Se um dia deixarem de ser,
 *   é aqui que se muda.
 */
const seloVermelho = (selo) => (selo
  ? `a small burning red badge on the left half reading exactly "R$ ${selo.valor} ${selo.rotulo}"`
  : 'no badge on the left half');

const objetoDaHistoria = (temCartao) => (temCartao
  ? 'unpaid credit-card bills and bank statements'
  : 'household bills and banknotes');

function promptDaCapa({ titulo, selo, variante = 'marca', temCartao = false }) {
  if (variante === 'canal') return promptDaCapaDoCanal({ titulo, selo, temCartao });
  const objeto = objetoDaHistoria(temCartao);
  return `An ultra-high-definition 16K resolution cinematic YouTube thumbnail, 16:9 aspect ratio, 1280x720 pixels minimum, designed for maximum click-through rate on mobile.

COMPOSITION — a dramatic BEFORE / AFTER split, divided by a thin diagonal beam of light running from top-right to bottom-left, glowing with a cyan-to-violet-to-magenta gradient (${PALETA.ciano} → ${PALETA.violeta} → ${PALETA.magenta}).

LEFT HALF, THE BEFORE — a chaotic avalanche of ${objeto} tumbling out of a dark void, a heavy jagged red downward arrow smashing through them, cracked glass shards, angry crimson (${PALETA.vermelho}) neon rim-light, deep black shadows, a red alarm glow bleeding into the background.

RIGHT HALF, THE AFTER — the same ${objeto}, now a single clean stack on a calm reflective surface, a bright emerald green (${PALETA.verde}) upward arrow rising out of it like a new shoot, soft green neon rim-light, orderly, a sense of relief and open air.

BACKGROUND — near-black (${PALETA.fundo}) with subtle darker panels (${PALETA.painel}), a fine dot-grid texture, cinematic depth of field.

TYPOGRAPHY — bold, heavy, minimalist condensed sans-serif, ALL CAPS, across the upper third, pure white with a thin red-to-green gradient underline, reading exactly: "${titulo}"

BADGES — ${seloVermelho(selo)}; a small glowing green badge on the right half reading exactly "3 PASSOS".
${ASSINATURA_DO_CANAL}
${REGRAS_FIXAS}`;
}

/**
 * A VARIANTE EM QUE AS CORES DO CANAL MANDAM.
 * O vermelho e o verde ficam só onde carregam sentido — as duas setas e os dois selos —
 * e tudo o resto é a paleta do canal. É a capa mais "nossa" das duas, e a pergunta que
 * ela põe ao ouvido do dono é se continua a gritar o suficiente para ganhar o clique.
 */
function promptDaCapaDoCanal({ titulo, selo, temCartao = false }) {
  const objeto = temCartao ? 'credit-card bills and glass cards' : 'household bills and banknotes';
  return `An ultra-high-definition 16K resolution cinematic YouTube thumbnail, 16:9 aspect ratio, 1280x720 pixels minimum, designed for maximum click-through rate on mobile. Dark premium tech aesthetic, glassmorphism, neon edge lighting.

COMPOSITION — a BEFORE / AFTER split told almost entirely in the channel's own colours, divided by a bright vertical shard of light in the cyan-to-magenta gradient (${PALETA.ciano} → ${PALETA.violeta} → ${PALETA.magenta}) that flares where it meets the floor.

LEFT HALF, THE BEFORE — a chaotic tumbling stack of ${objeto} rendered in cold dark violet and deep indigo, dissolving into shadow, lit from below by a single angry red (${PALETA.vermelho}) glow. One heavy jagged RED downward arrow cutting through them — the only strongly red object on this side.

RIGHT HALF, THE AFTER — the same ${objeto}, now one clean orderly stack on a glossy reflective surface, rendered in the channel's cyan and violet neon, calm and precise. One bright GREEN (${PALETA.verde}) upward arrow rising out of the stack — the only strongly green object on this side.

BACKGROUND — the channel's near-black blue (${PALETA.fundo}) with darker glass panels (${PALETA.painel}), concentric rings, a fine dot grid, and volumetric violet haze. Cinematic depth of field.

TYPOGRAPHY — bold heavy condensed sans-serif, ALL CAPS, across the upper third, in pure white with the last word filled by the cyan-to-magenta gradient, reading exactly: "${titulo}"

BADGES — ${selo ? `a compact glass badge outlined in red on the left reading exactly "R$ ${selo.valor} ${selo.rotulo}"` : 'no badge on the left'}; a compact glass badge outlined in green on the right reading exactly "3 PASSOS".
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

async function main() {
  if (args.creditos) {
    const c = await creditos();
    console.log(`\n💳 créditos: ${c.total} ao todo · ${c.restaHoje} ainda por gastar hoje (de ${c.porDia}/dia) · ${c.livres} de saldo próprio`);
    console.log(`   a 52 créditos por imagem, dá para mais ${Math.floor(c.total / 52)} imagem(ns)\n`);
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
  const caderno = existsSync(caminhoCaderno) ? JSON.parse(readFileSync(caminhoCaderno, 'utf-8')) : null;
  const ficha = caderno?.mapa?.fichaDeDivida || caderno?.fichaDeDivida
    || JSON.parse(JSON.stringify(caderno || {}))?.mapa?.fichaDeDivida || null;

  const destino = join(RAIZ, 'youtube-render', 'public', 'manus', slug);
  mkdirSync(destino, { recursive: true });

  const antes = await creditos();
  console.log(`\n🎨 MANUS — "${roteiro.tema}"`);
  console.log(`   créditos antes: ${antes.livres} livres de ${antes.total}\n`);

  const trabalhos = [];
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
     * Agora sai do TEMA do guião, que é a frase que o dono aprovou na fila. Corta-se
     * no primeiro dois-pontos (o tema tem a forma "Título: a explicação") e limita-se a
     * seis palavras — uma miniatura com uma frase inteira não se lê no telemóvel.
     */
    /**
     * ⚠️ **`assuntoCurto`, A MESMA CONTA DA DESCRIÇÃO E DAS ETIQUETAS** — 09/08/2026.
     * Aqui estava escrito à mão "as 6 primeiras palavras do tema até ao dois-pontos", o
     * que num tema de um parágrafo dava uma capa a dizer
     * **"DOIS HOMENS, MESMA IDADE, MESMO TRABALHO,"**. Três sítios com a mesma regra
     * escrita três vezes divergem sempre; agora é uma conta só, e o título da fila entra
     * como segunda hipótese.
     */
    const naFila = (lerFilaDeTemas().videos || []).find((v) => v.slug === slug) || {};
    const titulo = assuntoCurto({ tema: roteiro.tema, titulo: naFila.titulo })
      .toLocaleUpperCase('pt-BR');
    if (!titulo) throw new Error('o guião não tem "tema" — sem título não se faz a capa');
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
    const aMais = ficha?.aMais || null;
    const espinha = Number(roteiro.mapa?.numeroEspinha ?? roteiro.numeroEspinha);
    const selo = aMais
      ? { valor: aMais, rotulo: 'A MAIS' }
      : (Number.isFinite(espinha) && espinha >= 10 ? { valor: espinha, rotulo: 'POR MÊS' } : null);
    if (!selo) console.log('   ⚠️ sem número no guião — a capa sai sem o selo vermelho (nada é inventado).');
    const variante = args.variante && args.variante !== true ? String(args.variante) : 'marca';
    trabalhos.push({
      ficheiro: variante === 'marca' ? 'capa' : `capa-${variante}`,
      onde: `a miniatura do YouTube (variante "${variante}")`,
      // ⚠️ As faturas de cartão só entram na capa se a HISTÓRIA tiver uma fatura de cartão.
      prompt: promptDaCapa({ titulo, selo, variante, temCartao: Boolean(roteiro.mapa?.contaDoCartao) }),
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

  // ⚠️ Refazer UMA imagem sem pagar as outras outra vez. Cada pedido custa ~48 créditos
  // dos 300 que a conta grátis renova por dia — refazer as quatro por causa de uma seria
  // metade do orçamento do dia deitado fora.
  const apenas = args.apenas && args.apenas !== true ? String(args.apenas) : null;
  const fila = apenas ? trabalhos.filter((t) => t.ficheiro.includes(apenas)) : trabalhos;
  if (apenas && !fila.length) throw new Error(`"--apenas=${apenas}" não bate com nenhum pedido`);

  for (const t of fila) {
    console.log(`🖼️  ${t.ficheiro} — ${t.onde}`);
    try {
      const r = await pedirAgente(t.prompt, {
        titulo: `FinMoovi · ${slug} · ${t.ficheiro}`,
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
         * Correr isto outra vez escrevia POR CIMA da anterior. Cada capa custa 52
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
          } catch (err) {
            console.log(`         ⚠️ não deu para fazer a versão do vídeo (${err.message.split('\n')[0]})`);
          }
        }
      }
    } catch (err) {
      console.log(`      ❌ ${err.message.split('\n')[0]}`);
    }
  }

  const depois = await creditos();
  console.log(`\n💳 créditos depois: ${depois.livres} livres — gastou ${antes.livres - depois.livres}`);
  console.log(`📁 ${destino}\n`);
}

main().catch((err) => { console.error(`\n❌ ${err.message}\n`); process.exit(1); });
