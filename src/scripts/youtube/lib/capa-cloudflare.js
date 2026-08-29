/**
 * 🔴 O PLANO B DA CAPA DO VÍDEO LONGO — 29/08/2026.
 *
 * ═══ POR QUE ISTO EXISTE ═══
 * Queixa do dono, 29/08: *"Mais uma vez a capa do vídeo longo do youtube sai iguais às
 * anteriores, já não sei mais o que fazer pra vocês corrigirem isso, já vão quase 1 mês
 * e isso não se resolve"*.
 *
 * E a causa **não estava no programa que escolhe a capa** — esse funciona. Estava no
 * dinheiro: as DUAS chaves da Manus responderam, na corrida 33243763180 e já na de
 * 24/08, com estas palavras exactas:
 *
 *     /v2/usage.availableCredits: unauthenticated — api key has been deleted or does not exist
 *     cabem 0 imagem(ns) ao todo
 *
 * Sem crédito não há desenho. E aí acontecia o pior dos dois mundos:
 *   · o vídeo de 24/08 encontrou na pasta dele uma `capa-canal-youtube.jpg` feita à mão
 *     em Agosto e **subiu com ela** — a MESMA miniatura pela terceira vez;
 *   · o vídeo de 29/08, pasta nova e vazia, subiu **sem miniatura nenhuma** e o YouTube
 *     escolheu um fotograma sozinho.
 * Nos dois casos a corrida acabou **verde**.
 *
 * ═══ A REGRA QUE ISTO DEIXA ═══
 * **Um fornecedor pago sozinho não é um plano — é uma aposta.** A capa é a primeira
 * coisa que se vê do canal e não pode depender de uma única chave estar viva. Portanto:
 * quando a Manus não desenha, desenha a Cloudflare, que é o mesmo fornecedor que faz as
 * capas do blog todos os dias e já está ligado nesta casa.
 *
 * ═══ 🔴 E A DIVISÃO DO TRABALHO MUDA, DE PROPÓSITO ═══
 * A Manus é um AGENTE e sabe escrever texto dentro da imagem. O FLUX da Cloudflare é um
 * modelo DESTILADO e **não sabe** — escreve torto, inventa letras e não tem campo
 * negativo. Ver o aviso grande em `apis/image-router.js`: em 18/08 pôs-se
 * *"no text, no letters"* dentro do pedido e no dia seguinte as capas do blog saíram
 * **cobertas de letras**, porque o modelo leu a proibição como encomenda. É a memória
 * `o-exemplo-pesa-mais-que-a-proibicao` medida em produção.
 *
 * Então aqui:
 *   · a Cloudflare desenha **só a arte** — pedido em POSITIVO, sem uma única proibição,
 *     e sem lhe pedir letra nenhuma;
 *   · o **texto é escrito por nós**, com `sharp`, por cima da arte.
 *
 * ⚠️ Isto não é um remendo pior do que o original: é melhor. O título passa a sair
 * **sempre** com a ortografia certa, com os acentos certos e no mesmo sítio — três
 * coisas que nenhum gerador de imagem garante.
 *
 * ⚠️ **O MOLDE E A METÁFORA SÃO OS MESMOS.** Este ficheiro não escolhe nada: recebe o
 * molde e a cena que `capas-do-longo.js` já decidiu. Se decidisse por si, haveria duas
 * regras de anti-repetição a discutir uma com a outra — que é a família de defeito nº1
 * desta casa (`regra-velha-a-correr-em-estrutura-nova`).
 */

import sharp from 'sharp';
import { aprovarCapa } from '../../lib/guardiao-da-capa.js';
import { medir } from '../../lib/medidor.js';

/** A paleta do canal, do `youtube-render/src/theme.ts`. */
const PALETA = {
  fundo: '#0d1117',
  painel: '#161b22',
  ciano: '#22d3ee',
  violeta: '#8b5cf6',
  magenta: '#d6219c',
  vermelho: '#ef4444',
};

export const LARGURA = 1280;
export const ALTURA = 720;

/**
 * OS DESENHISTAS, POR ORDEM.
 *
 * ⚠️ **A ordem é a mesma do blog**, e não por preguiça: é a ordem que já foi medida ao
 * longo de meses de capas publicadas. A Cloudflare acerta na maioria; a Together entra
 * quando ela recusa; o Pollinations é grátis e sem chave, e existe para o caso em que
 * não há chave nenhuma — que é exactamente o buraco em que caímos com a Manus.
 */
function desenhistas() {
  return [
    {
      nome: 'Cloudflare Workers AI',
      ligado: !!(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_AI_TOKEN),
      url: `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/black-forest-labs/flux-1-schnell`,
      chave: process.env.CLOUDFLARE_AI_TOKEN,
      modelo: '@cf/black-forest-labs/flux-1-schnell',
      // 8 é o MÁXIMO deste modelo (esquema oficial da Cloudflare, confirmado em 19/08).
      passos: 8,
      formato: 'cloudflare',
    },
    {
      nome: 'Together.ai',
      ligado: !!process.env.TOGETHER_API_KEY,
      url: 'https://api.together.xyz/v1/images/generations',
      chave: process.env.TOGETHER_API_KEY,
      modelo: 'Qwen/Qwen-Image',
      // ⚠️ 28, e NUNCA 4: o Qwen não é destilado. Com 4 sai borrado — foi o defeito
      //    de 19/08 no blog, medido (nitidez 14 quando uma capa boa mede 400 a 900).
      passos: 28,
      formato: 'openai',
    },
    {
      nome: 'Pollinations.ai',
      ligado: true, // grátis e sem chave
      url: 'https://image.pollinations.ai/prompt/',
      chave: null,
      modelo: 'flux',
      passos: 4,
      formato: 'pollinations',
    },
  ];
}

/**
 * O PEDIDO DA ARTE — em POSITIVO, e sem uma única proibição.
 *
 * 🔴 **NÃO ACRESCENTAR AQUI UMA LISTA DE "NO ...".** É a linha que partiu as capas do
 * blog em 19/08 e está escrita por extenso no `image-router.js`. Um modelo destilado não
 * tem prompt negativo: tudo o que aparece no texto é matéria-prima, incluindo aquilo que
 * se lhe manda evitar. O que aqui não se quer, não se nomeia.
 *
 * ⚠️ **E não se pede texto nenhum.** O título é escrito por `escreverTexto()`, depois.
 * Pedir letras a este modelo é pedir letras tortas — e o `guardiao-da-capa.js` recusa a
 * imagem por causa delas, o que gastaria a tentativa duas vezes.
 */
/**
 * 🔴 AS PROIBIÇÕES DO MOLDE SÃO CORTADAS ANTES DE IREM PARA A CLOUDFLARE — 29/08/2026.
 *
 * Os seis moldes de `capas-do-longo.js` acabam com frases como *"NO split, NO second
 * half, NO before-and-after"*. Foram escritas para a **Manus**, que é um agente, percebe
 * negação e obedece — e lá estão certas.
 *
 * ⚠️ **Mandadas ao FLUX, fazem o contrário.** É um modelo destilado, sem prompt negativo:
 * o que aparece no texto é matéria-prima. Dizer-lhe *"NO before-and-after"* é a maneira
 * mais fiável de lhe pedir um antes-e-depois — e o antes/depois em todas as capas é
 * **exactamente a queixa original do dono**, de 09/08. Seria fechar o defeito num sítio e
 * reabri-lo no outro.
 *
 * Ver o aviso em `apis/image-router.js`: em 18/08 pôs-se a lista de proibições no texto e
 * no dia seguinte as capas do blog saíram cobertas de letras.
 *
 * ⚠️ **Corta-se aqui e não nos moldes**, porque os moldes servem os dois caminhos e na
 * Manus a frase faz falta. Uma regra que muda de sítio conforme quem a lê é a única forma
 * honesta de servir dois leitores diferentes.
 */
export const semProibicoes = (texto) => String(texto)
  .replace(/\bNO\s+[^.]*\./g, '')
  .replace(/\s{2,}/g, ' ')
  .trim();

export function promptDaArte({ molde, cena }) {
  return [
    'Cinematic 16:9 YouTube thumbnail artwork, ultra sharp, high detail, dramatic studio lighting.',
    semProibicoes(molde.desenho(cena)),
    /**
     * ⚠️ **EM POSITIVO, e é a única forma que funciona neste modelo.** A regra do canal
     * desde 04/08 é *sem pessoa nenhuma* — o ecossistema é anónimo. Escrita como
     * proibição (*"no people, no faces"*), este modelo desenha gente; escrita como o
     * ASSUNTO da imagem (*"deserted", "still life", "objects alone"*), não desenha.
     */
    'SUBJECT — a deserted still-life: objects, surfaces and light alone in an empty place, untouched, nobody around.',
    `PALETTE — near-black blue background ${PALETA.fundo} with darker panels ${PALETA.painel}, neon edge lighting in cyan ${PALETA.ciano}, violet ${PALETA.violeta} and magenta ${PALETA.magenta}. A wide translucent diagonal band of that gradient sweeps from the top-right corner down to the left. Faint concentric rings and a fine violet dot grid in the darkness.`,
    'STYLE — dark premium tech aesthetic, glassmorphism, volumetric light, shallow depth of field, extreme contrast, crisp focus, clean empty space across the upper third of the frame and along the bottom-left corner.',
  ].join('\n\n');
}

/** Pede a arte a um desenhista. Devolve os bytes (PNG/JPEG), nunca grava. */
async function pedirArte(d, prompt, semente) {
  if (d.formato === 'pollinations') {
    const url = `${d.url}${encodeURIComponent(prompt)}?width=${LARGURA}&height=${ALTURA}`
      + `&model=${d.modelo}&nologo=true&seed=${semente}`;
    const r = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(90000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return Buffer.from(await r.arrayBuffer());
  }

  const cabecalhos = { Authorization: `Bearer ${d.chave}`, 'Content-Type': 'application/json' };
  const corpo = d.formato === 'cloudflare'
    // ⚠️ SÓ `prompt`, `steps` e `seed`. Este endpoint recusa com HTTP 400 tudo o resto
    //    (`width`, `height`, `negative_prompt`, `num_steps`) — medido em 18/08 no blog,
    //    onde o fornecedor nº1 esteve morto em silêncio durante semanas por causa disso.
    ? { prompt, steps: d.passos, seed: semente }
    : {
      model: d.modelo, prompt, width: LARGURA, height: ALTURA, steps: d.passos, seed: semente, n: 1, response_format: 'b64_json',
    };

  let r = await fetch(d.url, {
    method: 'POST', headers: cabecalhos, body: JSON.stringify(corpo), signal: AbortSignal.timeout(60000),
  });

  // A mesma rede de segurança do blog: se o servidor recusar CAMPOS, repete com o mínimo.
  if (r.status === 400) {
    const texto = await r.clone().text().catch(() => '');
    if (/not allowed|unevaluated propert|additional propert/i.test(texto)) {
      const minimo = d.formato === 'cloudflare'
        ? { prompt }
        : { model: d.modelo, prompt, n: 1, response_format: 'b64_json' };
      r = await fetch(d.url, {
        method: 'POST', headers: cabecalhos, body: JSON.stringify(minimo), signal: AbortSignal.timeout(60000),
      });
    }
  }
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${(await r.text().catch(() => '')).slice(0, 120)}`);

  const dados = await r.json();
  if (d.formato === 'cloudflare') {
    if (!dados?.result?.image) throw new Error('a Cloudflare respondeu sem imagem');
    return Buffer.from(dados.result.image, 'base64');
  }
  const primeira = dados?.data?.[0];
  if (primeira?.b64_json) return Buffer.from(primeira.b64_json, 'base64');
  if (primeira?.url) {
    const img = await fetch(primeira.url);
    if (!img.ok) throw new Error('não deu para descarregar a imagem');
    return Buffer.from(await img.arrayBuffer());
  }
  throw new Error('a resposta veio sem imagem');
}

// ═══════════════════════════════════════════════════════════════════════════════
// O TEXTO — escrito por nós, e é esta a parte que a Manus fazia e agora é nossa.
// ═══════════════════════════════════════════════════════════════════════════════

/** O que quebra o SVG se não for escapado. Um título com "&" é raro, mas basta um. */
const escapar = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

/** O tipo de letra do título, num sítio só — o mesmo que a medição usa e que o SVG usa. */
const FONTE = '"DejaVu Sans", "Liberation Sans", sans-serif';
/** A moldura escura à volta das letras. Conta para a largura, e por isso está aqui. */
const CONTORNO = 8;

/**
 * 🔴 A LARGURA DE UMA LINHA É MEDIDA, NÃO ESTIMADA — 29/08/2026, e eu aprendi-o a olhar.
 *
 * ═══ O QUE ACONTECEU ═══
 * A primeira versão desta peça multiplicava o número de letras por `tamanho × 0,58`, com
 * um comentário meu a garantir que o factor *"está do lado seguro: erra por cortar cedo,
 * nunca por deixar transbordar"*. Gerei a capa de prova e **as duas primeiras linhas
 * saíam pela borda direita**: lia-se "COMO PEQUENOS HÁBITOS FAZ" e "O SALÁRIO
 * DESAPARECER ANT". O 0,58 era o passo médio de um sans-serif NORMAL; a nossa letra é
 * `font-weight: 800` e leva um contorno de 8 px de cada lado. O passo real anda nos 0,75.
 *
 * ⚠️ **E nada se queixou.** A nitidez deu 658, o guardião aprovou, o programa escreveu
 * ✅ e gravou 133 KB. É a §42.5 outra vez, à letra: *o script correu, disse ✅, e não fez
 * o trabalho.* **Só se viu OLHANDO para o ficheiro** — e é por isso que a régua deixou de
 * ser um número escrito por mim.
 *
 * ═══ COMO SE MEDE ═══
 * Desenha-se a linha numa tira larga, com a MESMA fonte, o MESMO peso e o MESMO contorno
 * do SVG final, e corta-se o preto à volta. O que sobra é a largura verdadeira, em
 * pixels, dada por quem vai desenhar a capa — e não por uma conta minha sobre ela.
 *
 * ⚠️ **O `letter-spacing` NÃO entra aqui, e é de propósito:** o `librsvg` ignora-o na
 * medição mas aplica-o no desenho, o que daria uma régua diferente do resultado. Por isso
 * saiu também do SVG final — uma régua e um desenho que discordam é o defeito que se está
 * a consertar, noutra forma.
 */
async function larguraDoTexto(texto, tamanho) {
  const tira = `<svg xmlns="http://www.w3.org/2000/svg" width="4000" height="${Math.ceil(tamanho * 2.2)}">
    <rect width="100%" height="100%" fill="#000000"/>
    <text x="20" y="${Math.round(tamanho * 1.4)}" font-family='${FONTE}' font-weight="800"
          font-size="${tamanho}px" fill="#ffffff" paint-order="stroke" stroke="#ffffff"
          stroke-width="${CONTORNO}px" stroke-linejoin="round">${escapar(texto)}</text>
  </svg>`;
  const { info } = await sharp(Buffer.from(tira)).trim({ threshold: 10 }).toBuffer({ resolveWithObject: true });
  return info.width;
}

/**
 * Parte o título em linhas que cabem, e escolhe o tamanho da letra.
 *
 * ⚠️ **O tamanho desce, o número de linhas sobe — por esta ordem.** Um título de doze
 * palavras em letras enormes com sete linhas é ilegível a 300 px; o mesmo título um pouco
 * mais pequeno em três linhas lê-se. O teto de três linhas é o que cabe no terço de cima
 * sem tapar a arte que se acabou de pagar.
 *
 * ⚠️ **É `async` porque medir é desenhar**, e desenhar é assíncrono no `sharp`. Vale o
 * incómodo: a alternativa é um número escrito à mão que já cortou um título ao meio.
 */
export async function quebrarTitulo(titulo, { largura = LARGURA - 96, maxLinhas = 3 } = {}) {
  const palavras = String(titulo).trim().split(/\s+/).filter(Boolean);
  /** A medida de cada pedaço, guardada — o mesmo pedaço aparece em vários tamanhos. */
  const cache = new Map();
  const medir = async (t, tam) => {
    const chave = `${tam}·${t}`;
    if (!cache.has(chave)) cache.set(chave, await larguraDoTexto(t, tam));
    return cache.get(chave);
  };

  let ultimo = null;
  for (const tamanho of [104, 96, 88, 80, 72, 64, 58, 52, 46, 40]) {
    const linhas = [];
    let atual = '';
    for (const p of palavras) {
      const tentativa = atual ? `${atual} ${p}` : p;
      // eslint-disable-next-line no-await-in-loop
      if (await medir(tentativa, tamanho) <= largura) { atual = tentativa; continue; }
      if (atual) linhas.push(atual);
      atual = p;
    }
    if (atual) linhas.push(atual);
    ultimo = { linhas, tamanho };
    /**
     * ⚠️ **Uma palavra sozinha pode ser maior do que a linha inteira** (um "DESAPARECER"
     * a 104 px não cabe em 1184 px). Nesse caso ela fica sozinha na sua linha e continua
     * a transbordar — desce-se mais um degrau em vez de a deixar sair pela borda, que é
     * exactamente o defeito que esta função passou a existir para apanhar.
     */
    // eslint-disable-next-line no-await-in-loop
    const larguras = await Promise.all(linhas.map((l) => medir(l, tamanho)));
    if (linhas.length <= maxLinhas && larguras.every((w) => w <= largura)) return { linhas, tamanho };
  }
  /**
   * Último recurso: vai no mais pequeno que se tentou. Uma capa com o título apertado é
   * melhor do que capa nenhuma — regra da casa desde 09/08 (*"nunca parar"*).
   */
  return ultimo || { linhas: [String(titulo)], tamanho: 40 };
}

/**
 * Escreve o título, o selo e a assinatura por cima da arte.
 *
 * ⚠️ **A ASSINATURA NÃO RODA**, e é de propósito — está escrito em `capas-do-longo.js`:
 * a paleta, a logo e o contraste são a MARCA. O que varia é a cena; o que fica é a
 * assinatura. Se isto variasse, o canal deixava de se reconhecer na lista.
 *
 * ⚠️ **O véu escuro por cima da arte não é enfeite.** Sem ele, um título branco em cima
 * de uma zona clara da imagem desaparece — e a única maneira de dar por isso seria
 * alguém abrir o Studio e olhar.
 */
export async function escreverTexto(arte, { titulo, selo }) {
  const { linhas, tamanho } = await quebrarTitulo(titulo);
  const alturaLinha = Math.round(tamanho * 1.06);
  /**
   * 🔴 A PRIMEIRA LINHA COMEÇAVA NUM SÍTIO FIXO, E COM LETRA GRANDE TAPAVA O LOGO —
   * 29/08/2026, visto na segunda capa de prova: lia-se "Fin▊oovi", com o "M" por baixo
   * do "Í" de "DÍVIDA".
   *
   * ⚠️ **O 148 estava certo para 58 px e errado para 104 px**, que é a diferença entre um
   * título comprido e um curto — ou seja, estava errado precisamente nos títulos que o
   * dono mais gosta. Um número fixo não pode servir uma letra que muda de tamanho.
   *
   * Agora conta-se a partir do TOPO DAS MAIÚSCULAS: elas começam sempre em `y = 106`,
   * logo abaixo da assinatura, seja qual for o tamanho da letra. A altura de uma
   * maiúscula neste tipo de letra é ~0,73 do corpo — medido, não adivinhado.
   */
  const TOPO_DAS_MAIUSCULAS = 106;
  const topo = Math.round(TOPO_DAS_MAIUSCULAS + tamanho * 0.73);

  const linhasSvg = linhas.map((linha, i) => {
    const ultima = i === linhas.length - 1;
    const palavras = linha.split(' ');
    // Na última linha, a última palavra leva o gradiente do canal — é o mesmo
    // tratamento que a Manus recebia no pedido, para a capa continuar a parecer-se
    // com as que já estão no ar.
    if (ultima && palavras.length > 1) {
      const fim = palavras.pop();
      return `<text x="48" y="${topo + i * alturaLinha}" class="t">${escapar(palavras.join(' '))} <tspan fill="url(#g)">${escapar(fim)}</tspan></text>`;
    }
    if (ultima) {
      return `<text x="48" y="${topo + i * alturaLinha}" class="t" fill="url(#g)">${escapar(linha)}</text>`;
    }
    return `<text x="48" y="${topo + i * alturaLinha}" class="t">${escapar(linha)}</text>`;
  }).join('\n    ');

  const textoDoSelo = selo ? `R$ ${selo.valor} ${selo.rotulo}` : null;
  // ⚠️ Medido, e não estimado, pela mesma razão do título: um selo com a caixa curta
  //    demais deixa as letras a sair pela borda vermelha. 40 px de folga de cada lado.
  const larguraSelo = textoDoSelo ? (await larguraDoTexto(textoDoSelo, 38)) + 80 : 0;
  const svgSelo = textoDoSelo ? `
    <g transform="translate(48, ${ALTURA - 132})">
      <rect x="0" y="0" rx="14" ry="14" width="${larguraSelo}" height="84"
            fill="#0d1117" fill-opacity="0.82" stroke="${PALETA.vermelho}" stroke-width="4"/>
      <text x="${Math.round(larguraSelo / 2)}" y="57" class="s" text-anchor="middle">${escapar(textoDoSelo)}</text>
    </g>` : '';

  const svg = `<svg width="${LARGURA}" height="${ALTURA}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${PALETA.ciano}"/>
      <stop offset="100%" stop-color="${PALETA.magenta}"/>
    </linearGradient>
    <linearGradient id="veu" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0d1117" stop-opacity="0.94"/>
      <stop offset="70%" stop-color="#0d1117" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#0d1117" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="pe" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0%" stop-color="#0d1117" stop-opacity="0.88"/>
      <stop offset="100%" stop-color="#0d1117" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <style>
    /* SEM letter-spacing: o librsvg aplica-o ao desenhar mas ignora-o ao medir, e uma
       régua que discorda do desenho é o defeito que esta peça existe para fechar. */
    .t { font-family: ${FONTE}; font-weight: 800;
         font-size: ${tamanho}px; fill: #ffffff;
         paint-order: stroke; stroke: #0d1117; stroke-width: ${CONTORNO}px; stroke-linejoin: round; }
    .s { font-family: ${FONTE}; font-weight: 800; font-size: 38px; fill: #ffffff; }
    .m { font-family: ${FONTE}; font-weight: 800; font-size: 34px; }
  </style>
  <rect x="0" y="0" width="${LARGURA}" height="${Math.round(ALTURA * 0.62)}" fill="url(#veu)"/>
  <rect x="0" y="${Math.round(ALTURA * 0.68)}" width="${LARGURA}" height="${Math.round(ALTURA * 0.32)}" fill="url(#pe)"/>
  <g>
    <path d="M48 70 L64 50 L80 70 L64 62 Z" fill="url(#g)"/>
    <text x="92" y="72" class="m" fill="#ffffff">Fin<tspan fill="url(#g)">Moovi</tspan></text>
  </g>
  <g>
    ${linhasSvg}
  </g>${svgSelo}
</svg>`;

  return sharp(arte)
    .resize(LARGURA, ALTURA, { fit: 'cover', position: 'attention' })
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .jpeg({ quality: 88, chromaSubsampling: '4:4:4' })
    .toBuffer();
}

/**
 * A CAPA INTEIRA, PELO PLANO B. Devolve os bytes do JPEG a 1280×720, ou `null`.
 *
 * ⚠️ **NUNCA LANÇA.** Quem chama é o passo da capa do robô do vídeo, e a regra do dono
 * de 09/08 continua a valer à letra: *uma capa é um enfeite caro, mas um vídeo sem capa
 * continua a ser um vídeo, e um vídeo que não existe não é nada.* O que este plano B
 * muda é que a falta de capa deixa de ser **silenciosa** — quem chama grita.
 *
 * ⚠️ **A arte é julgada ANTES de lhe escrever o texto por cima**, e a ordem importa: o
 * `guardiao-da-capa.js` recusa imagens com letras, e o nosso título é letras. Julgar
 * depois seria reprovar sempre a nossa própria escrita.
 */
export async function capaDeReserva({
  titulo, selo = null, molde, cena, tentativas = 3, aoAndar = () => {},
} = {}) {
  const prompt = promptDaArte({ molde, cena });
  const ligados = desenhistas().filter((d) => d.ligado);
  if (!ligados.length) {
    aoAndar('❌ não há desenhista nenhum ligado — nem Cloudflare, nem Together, nem o grátis.');
    return null;
  }
  aoAndar(`🎨 plano B: ${ligados.map((d) => d.nome).join(' → ')}`);

  for (const d of ligados) {
    for (let t = 1; t <= tentativas; t += 1) {
      /**
       * ⚠️ **A SEMENTE MUDA A CADA TENTATIVA, e é ela que faz a 2ª ser DIFERENTE.**
       * Sem isto, repetir depois de uma recusa pedia exactamente a mesma imagem e a
       * trava recusava-a exactamente pela mesma razão, três vezes, a pagar as três.
       *
       * ⚠️ E não é sorteada: sai do MOLDE e da TENTATIVA. O mesmo vídeo pedido duas
       * vezes tem de dar a mesma capa — é a regra que governa o molde, as fotografias
       * e as cenas, e não se quebra aqui.
       */
      let semente = t * 7919;
      for (const c of `${molde.nome}·${titulo}`) semente = (semente * 31 + c.codePointAt(0)) % 2_000_000_000;
      try {
        const arte = await pedirArte(d, prompt, semente);
        if (!arte || arte.length < 1000) throw new Error('veio vazia');
        medir({
          fornecedor: d.nome, tipo: 'imagem', modelo: d.modelo, unidades: 1,
        });

        const veredito = await aprovarCapa(arte, { mime: 'image/png' });
        if (!veredito.aprovada) {
          aoAndar(`   ↻ ${d.nome} tentativa ${t}: recusada — ${veredito.motivo}`);
          continue;
        }
        aoAndar(`   ✅ arte aprovada por ${d.nome} (nitidez ${veredito.nitidez}${veredito.cega ? ', sem IA de visão' : ''})`);
        const capa = await escreverTexto(arte, { titulo, selo });
        aoAndar(`   ✍️  título escrito por nós — ortografia e acentos garantidos`);
        return capa;
      } catch (err) {
        aoAndar(`   ⚠️ ${d.nome} tentativa ${t}: ${String(err.message).split('\n')[0]}`);
      }
    }
  }
  aoAndar('❌ nenhum desenhista entregou uma arte aprovada.');
  return null;
}
