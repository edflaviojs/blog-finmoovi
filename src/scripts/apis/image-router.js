/**
 * Multi-Provider AI Image Generation Router
 *
 * Strategy: Try providers in order until one succeeds.
 * If all fail, falls back to local SVG (always works).
 *
 * Providers:
 * 1. Cloudflare Workers AI (FLUX.1-schnell) — free, fast global edge
 * 2. Together.ai (Qwen-Image) — reliable backup
 * 3. Pollinations.ai (FLUX) — free, keyless reinforcement before SVG
 * 4. SVG fallback — always works, no external dependency
 *
 * Adding a new provider: just add an entry to PROVIDERS array.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ A REGRA Nº1 DESTE FICHEIRO: A CAPA NÃO PODE TER LETRAS
 * ─────────────────────────────────────────────────────────────────────────────
 * A mesma imagem serve os três idiomas (pt/en/es). Uma capa com palavras fica
 * errada em dois deles. Isto já falhou QUATRO vezes (11/06, 13/06, 18/08 e
 * 19/08/2026) e por isso a regra deixou de viver só no pedido ao modelo:
 *
 *   1. O pedido NUNCA nomeia o que é proibido. Escrever "sem texto, sem letras"
 *      num modelo FLUX faz o modelo DESENHAR texto — ele não tem negação. Ver o
 *      comentário gigante no corpo da chamada da Cloudflare.
 *   2. O título do post NUNCA entra no pedido. Vai só um assunto visual curto e
 *      neutro, em inglês (`assuntoVisual`). Mandar a frase do título é convidar
 *      o modelo a escrevê-la — foi exactamente o que aconteceu em 19/08.
 *   3. A imagem gerada é MEDIDA antes de ser gravada (`guardiao-da-capa.js`).
 *      Com letras ou borrada, é recusada e feita outra vez com outra semente.
 *
 * As três camadas são independentes de propósito: a 3 continua a valer mesmo que
 * alguém, um dia, estrague a 1 ou a 2.
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import sharp from 'sharp';
import { saveSVGImage } from './svg-generator.js';
import { config } from '../../../site.config.ts';
import { medir } from '../lib/medidor.js';
import { aprovarCapa } from '../lib/guardiao-da-capa.js';

// --- Configuration ---

const PROVIDERS = [
  {
    name: 'Cloudflare Workers AI',
    enabled: !!(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_AI_TOKEN),
    endpoint: `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/black-forest-labs/flux-1-schnell`,
    apiKey: process.env.CLOUDFLARE_AI_TOKEN,
    model: '@cf/black-forest-labs/flux-1-schnell',
    maxWidth: 1024,
    maxHeight: 640,
    /**
     * 8 é o MÁXIMO que este modelo aceita (esquema oficial: `steps`, inteiro,
     * omissão 4, máximo 8) — confirmado na documentação da Cloudflare em
     * 19/08/2026.
     *
     * CUSTO, sem embelezar: a Cloudflare cobra POR PASSO neste modelo
     * ($0.0001056/passo + $0.0000528 por bloco 512x512). Dobrar os passos dobra
     * essa parte da conta — de ~$0.0004 para ~$0.0008 por imagem. Com ~18
     * imagens/dia dá menos de $0.50 por mês, e o blog costuma caber na cota
     * diária gratuita. Vale o detalhe.
     *
     * ⚠️ `steps` NUNCA foi enviado a este endpoint antes (até 18/08 mandava-se
     * `num_steps`, que ele recusava). O esquema diz que é aceite, mas quem manda
     * é o servidor — por isso a chamada tem rede de segurança: se responder 400
     * a queixar-se dos campos, repete só com o `prompt`. Ver callProvider.
     */
    steps: 8,
    format: 'cloudflare',
  },
  {
    name: 'Together.ai',
    enabled: !!process.env.TOGETHER_API_KEY,
    endpoint: 'https://api.together.xyz/v1/images/generations',
    apiKey: process.env.TOGETHER_API_KEY,
    /**
     * ⚠️ ERA `black-forest-labs/FLUX.1-schnell`, DESLIGADO PELA TOGETHER EM
     * 19/08/2026 (aviso por e-mail: "Descontinuação do black-forest-labs/
     * FLUX.1-schnell amanhã"). `Qwen/Qwen-Image` é o substituto que eles
     * próprios recomendam no aviso.
     *
     * ⚠️ NÃO CONFUNDIR com a linha da Cloudflare aqui em cima, que também diz
     * "flux-1-schnell": essa é a cópia da CLOUDFLARE, na infraestrutura dela, e
     * não foi tocada pelo aviso. O Whisper da Together (voz, em
     * youtube/lib/tts-client.js) também é outro modelo e continua igual.
     *
     * ✅ CONFIRMADO em 19/08/2026: o nome pega. O registo das corridas desse dia
     * mostra "[Together.ai] Image saved" cinco vezes (ex.: corrida 32246419301).
     */
    model: 'Qwen/Qwen-Image',
    maxWidth: 1152,
    maxHeight: 640,
    /**
     * ⚠️ 28, NÃO 4 — E É AQUI QUE ESTAVA O BORRÃO.
     *
     * O 4 era o ajuste do FLUX.1-schnell, que é um modelo DESTILADO: foi treinado
     * para dar imagem pronta em 4 passos. O Qwen-Image não é destilado — precisa
     * do número normal de passos (28 é o valor dos exemplos oficiais da própria
     * Together). Ao trocar o modelo em 19/08 o 4 ficou para trás e todas as
     * imagens deste fornecedor passaram a sair a um sétimo do caminho, ou seja
     * BORRADAS. Medido: a capa de "como-manter-as-contas-do-dia-sob-controle"
     * mede 14 de nitidez, quando uma capa boa mede entre 400 e 900.
     *
     * CUSTO: $0.053 por imagem, e a Together só documenta acréscimo por passo
     * ACIMA do valor por omissão — 28 é o valor dos exemplos dela, logo isto
     * corrige o defeito sem mudar a conta. Este fornecedor é o plano B: só entra
     * quando a Cloudflare recusa (5 de 18 imagens em 19/08).
     *
     * ⚠️ AO TROCAR DE MODELO AQUI, VERIFICAR SEMPRE OS PASSOS. Modelo destilado
     * (schnell, lightning, turbo, LCM) quer 4 a 8; modelo normal quer 28 a 50.
     * Herdar o número do modelo anterior é o defeito desta linha.
     */
    steps: 28,
    format: 'openai',
  },
  {
    // Grátis e SEM chave — reforço independente antes de cair no SVG.
    name: 'Pollinations.ai',
    enabled: true,
    endpoint: 'https://image.pollinations.ai/prompt/',
    apiKey: null,
    model: 'flux',
    maxWidth: 1152,
    maxHeight: 640,
    steps: 4,
    format: 'pollinations',
  },
];

const POSTS_IMAGES_DIR = join(process.cwd(), 'public', 'images', 'posts');
const GLOSSARIO_IMAGES_DIR = join(process.cwd(), 'public', 'images', 'glossario');
const SAZONAL_IMAGES_DIR = join(process.cwd(), 'public', 'images', 'sazonal');

// --- Prompt Templates ---

/**
 * ⚠️ ISTO SÓ PODE VIAJAR EM CAMPO PRÓPRIO (`negative_prompt`), NUNCA DENTRO DO
 * TEXTO DO PEDIDO.
 *
 * Em 18/08/2026 (`e25332ae`) esta lista foi colada no fim do prompt da Cloudflare
 * porque aquele modelo não tem campo negativo. Resultado no dia seguinte: capas
 * cobertas de letras gigantes. O FLUX é destilado, não tem prompt negativo nem
 * CFG — ele não sabe recusar, só sabe desenhar o que lhe aparece escrito. Uma
 * lista com "text, letters, words, titles, typography, alphabet" é, para ele,
 * uma ENCOMENDA de tipografia.
 *
 * Quem não tem campo negativo não recebe nada disto. Em vez de proibir, os
 * estilos abaixo descrevem em POSITIVO um mundo onde não há nada escrito
 * ("clean unmarked surfaces", "screen off", "blank"). É a única forma que
 * funciona: mostrar, não proibir.
 */
const NEGATIVE_PROMPT = 'text, letters, words, numbers, writing, labels, watermarks, logos, signatures, captions, titles, subtitles, typography, font, alphabet, characters, inscriptions, stamps, badges, icons with letters, readable content, handwriting';

/**
 * Estilos de capa. O `peso` decide a frequência do sorteio.
 *
 * ⚠️ FOI DAQUI QUE SAIU UM ESTILO EM 19/08/2026, e vale registar porquê. Havia um
 * "Abstract glowing data visualization, modern dashboard aesthetic with blurred
 * colorful light streaks and bokeh dots" que produzia as DUAS queixas do dono ao
 * mesmo tempo:
 *   - pedia desfoque ("blurred") → essas capas medem 9 a 20 de nitidez, quando
 *     as boas medem 400 a 900. Eram os "borrões" de que ele se queixava, e não
 *     eram de agora.
 *   - pedia "dashboard" → um painel tem rótulos e números, então o modelo
 *     desenhava texto-lixo. Medido no acervo: "2070", "PLANNS", "CHANGE".
 * Não se recupera um estilo assim afinando palavras — a própria ideia dele exige
 * o que não podemos ter. Foi removido.
 *
 * PESOS (pedido do dono em 19/08: *"sim, reduzir"* os abstratos): antes eram 5
 * estilos sorteados por igual, 2 deles abstratos = 40% das capas sem gente nem
 * objecto. Agora as fotográficas pesam 3 e a abstracta pesa 1 → 1 em 10.
 */
const COVER_STYLES = [
  { peso: 3, plana: false, texto: (topic) => `Ultra-realistic professional lifestyle photography related to ${config.content.niche.en} and ${topic}, featuring real people in natural settings, warm authentic moments, modern clean aesthetic, soft natural lighting, shallow depth of field, editorial quality, neutral soft background, all surfaces clean and unmarked` },
  { peso: 1, plana: false, texto: (topic) => `Abstract geometric composition representing ${config.content.niche.en} and ${topic}, flowing shapes symbolizing growth and stability, gold and deep blue tones, minimalist premium quality, soft gradient lighting, professional editorial style, clean unmarked surfaces` },
  { peso: 3, plana: false, texto: (topic) => `Flat lay photography of financial planning objects related to ${topic}, closed leather notebook, calculator with screen off, scattered coins and green plants on marble surface, top-down view, organized aesthetic, soft natural lighting, warm tones, editorial magazine quality, all surfaces completely clean and unmarked` },
  { peso: 3, plana: false, texto: (topic) => `Cinematic wide shot of a modern workspace related to ${config.content.niche.en} and ${topic}, laptop showing abstract colorful gradient wallpaper, coffee cup, morning light through window, shallow depth of field, cozy productive atmosphere, all screens show only colors and gradients` },
];

/**
 * Sorteio ponderado pelo campo `peso`. Devolve o estilo inteiro (não só o texto)
 * porque quem chama precisa também do `plana` para decidir a trava de nitidez.
 */
function sortearPonderado(estilos) {
  const total = estilos.reduce((s, e) => s + e.peso, 0);
  let n = Math.random() * total;
  for (const e of estilos) {
    n -= e.peso;
    if (n <= 0) return e;
  }
  return estilos[estilos.length - 1];
}

/**
 * `plana: true` = ilustração de áreas lisas de cor, onde NÃO se espera detalhe
 * fino. Medido em 19/08/2026: estas ilustrações medem 13 a 54 de nitidez, o mesmo
 * intervalo de um borrão — cobrar-lhes detalhe manda refazer imagens que estão
 * boas. Ver o comentário da régua em guardiao-da-capa.js.
 */
const INLINE_STYLES = [
  { peso: 1, plana: false, texto: (topic) => `Authentic lifestyle photo related to ${topic}, real people in everyday ${config.content.niche.en} situations, warm natural lighting, candid moments, modern clean composition, soft bokeh background, editorial magazine quality, clean unmarked environment` },
  { peso: 1, plana: true, texto: (topic) => `Minimalist flat illustration of ${topic} concept, clean vector style, pastel colors, simple geometric shapes representing finance, modern and friendly aesthetic, purely abstract symbols` },
  { peso: 1, plana: false, texto: (topic) => `Close-up detail shot related to ${topic}, coins stacked, plant growing from jar, or hands holding phone showing abstract colorful gradient, macro photography, warm tones, soft bokeh, clean unmarked surfaces` },
];

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * O TÍTULO DO POST NÃO PODE CHEGAR AO GERADOR DE IMAGEM
 * ─────────────────────────────────────────────────────────────────────────────
 * Esta é a causa RAIZ do defeito de 19/08/2026, e não estava em lado nenhum à
 * vista. Os oito robôs de conteúdo chamam `generateCoverImage(post.title, …)`,
 * ou seja mandavam a frase inteira, em português, com pergunta e tudo:
 *
 *   topic = "Cansado de anotar cada gasto à mão e perder a noção do seu dinheiro"
 *
 * O prompt ficava "…photography related to personal finance and Cansado de
 * anotar cada gasto à mão…". Para o modelo, uma frase entre aspas no meio de um
 * pedido de imagem parece legenda a desenhar — e ele desenhou-a, ao contrário e
 * mal escrita: *"Cansarlose de a1ot cer gasts b ta l a'o mae tor esu dinieriee?"*
 *
 * A cura é não lhe dar a frase. Daqui para a frente vai só um ASSUNTO VISUAL:
 * duas a quatro palavras em inglês, sem pontuação, sem pergunta, sem ano, sem
 * pronomes. O robô que chama não precisa de saber disto — a limpeza é feita aqui,
 * num ponto só, e protege também qualquer robô que venha a ser escrito.
 *
 * (É a lição de `next-task-10-08`: a cura é a trava, não a leitura. Não serve
 * pedir aos oito robôs que se portem bem.)
 */

/**
 * Assunto visual a partir de um título. Determinístico, sem rede e sem IA — a
 * defesa contra letras não pode depender de um fornecedor estar de pé.
 *
 * Procura um tema conhecido na tabela abaixo; se nenhum casar, devolve o assunto
 * do nicho. Nunca devolve pedaços do título.
 *
 * Cobertura medida em 19/08/2026 sobre os 108 títulos em português do blog:
 * 104 casam um tema (22 assuntos diferentes, logo a variedade fica) e só 4 caem
 * no genérico. Zero saídas com palavra portuguesa.
 */
export function assuntoVisual(topic) {
  const cru = String(topic || '').toLowerCase();
  // Sem acentos, para a comparação não falhar por "orçamento" vs "orcamento".
  const limpo = cru.normalize('NFD').replace(/\p{M}/gu, '');

  const TEMAS = [
    [/orcament|budget|planilha|excel|spreadsheet/, 'monthly budgeting'],
    [/investi|invest|etf|fundo|renda variavel|acoes|bolsa|tesouro|cdb|selic/, 'long term investing'],
    // ⚠️ CARTÃO ANTES DE DÍVIDA, de propósito: "gastos no cartão de CRÉDITO"
    // casava com `credito` e virava "paying off debt". Apanhado pelo teste.
    // A tabela é lida por ordem — o padrão mais específico vem primeiro.
    [/cartao|card/, 'credit card management'],
    [/divida|debt|emprestimo|credito|financiamento|consorcio|juros/, 'paying off debt'],
    [/poupan|guardar|reserva|emergencia|saving|economizar|economia/, 'saving money'],
    [/aposentad|previdencia|retirement/, 'retirement planning'],
    [/imposto|tributo|ir |declaracao|tax/, 'personal taxes'],
    [/cambio|dolar|euro|moeda|currency|exchange/, 'currency exchange'],
    [/gasto|despesa|expense|conta|bill|fatura/, 'tracking expenses'],
    [/app|aplicativo|celular|mobile|digital/, 'mobile finance app'],
    [/salario|renda|income|freelanc|autonomo|mei/, 'personal income'],
    [/casa|imovel|aluguel|moradia|home/, 'home finances'],
    [/familia|filho|crianca|escolar|volta as aulas|family/, 'family finances'],
    [/viagem|ferias|travel|holiday/, 'travel budgeting'],
    [/meta|objetivo|goal|sonho|planejamento|plano/, 'financial goals'],
    [/mercado|cotacao|indice|inflacao|ipca|market/, 'financial market'],
    [/volatil|risco|crise|incerteza|oscila|queda|instabil/, 'market volatility'],
    [/compra|impulso|consumo|gastar|shopping|black friday|promocao|desconto|cashback/, 'mindful spending'],
    [/presente|natal|dia dos|namorados|criancas|aniversario|festa|gift|pascoa/, 'holiday gift budget'],
    [/amortiza|price|sac|prestacao|parcela/, 'loan amortization'],
    [/alternativa|organizze|mobills|guiabolso|versus| vs |comparacao|comparar/, 'comparing finance apps'],
    [/erro|iniciante|comecar|primeiro|aprender|educacao financeira|entenda/, 'learning about money'],
    [/semestre|balanco|revisao|organizar|organizacao|controle|caos|habito|rotina/, 'organizing finances'],
    [/prosper|liberdade|patrimonio|riqueza|independencia|tranquilidade/, 'building wealth'],
  ];
  for (const [padrao, assunto] of TEMAS) {
    if (padrao.test(limpo)) return assunto;
  }

  /**
   * ⚠️ NÃO CAI PARA AS PALAVRAS DO TÍTULO, E É DE PROPÓSITO.
   *
   * A primeira versão desta função, escrita hoje mesmo, limpava o título e
   * mandava as 4 palavras que sobravam. Medido contra os 108 títulos reais do
   * blog: 18,5% escapavam em PORTUGUÊS ("lidar volatilidade financas pessoais",
   * "presentear dia pais gastando"). Isso é exactamente o material que faz um
   * modelo de imagem tentar escrever — palavras soltas numa língua estrangeira,
   * no meio de um pedido em inglês.
   *
   * Perde-se alguma ligação entre a capa e o assunto do post nesses casos. É um
   * preço barato: a variedade visual vem dos estilos, e uma capa genérica correcta
   * é melhor que uma capa com letras erradas em dois dos três idiomas. Se um tema
   * novo começar a aparecer no blog, acrescenta-se à tabela acima — não se
   * afrouxa esta linha.
   */
  return config.content.niche.en;
}

/**
 * Cada tipo devolve `{ prompt, plana }`. O `plana` viaja daqui até à trava: é o
 * único lugar que sabe que estilo foi sorteado, e sem ele a trava de nitidez
 * reprovaria as ilustrações planas por engano.
 */
const PROMPT_TEMPLATES = {
  cover: (topic) => {
    const estilo = sortearPonderado(COVER_STYLES);
    return { prompt: estilo.texto(topic), plana: estilo.plana };
  },
  glossary: (topic) => ({
    // 3D com "high detail" — espera detalhe, logo a nitidez é cobrada.
    prompt: `Premium 3D editorial illustration representing the ${config.content.niche.en} concept of ${topic}, concrete symbolic objects as the main subject (choose what best fits the concept: stacked golden coins, rising 3D bar chart, glass piggy bank, balance scale, vault, growing plant in a coin jar), centered composition with strong focal point and depth of field, dark navy premium background, cyan and magenta rim lighting, soft studio light, glossy materials, high detail, professional financial magazine cover style, clean unmarked surfaces`,
    plana: false,
  }),
  inline: (topic) => {
    const estilo = sortearPonderado(INLINE_STYLES);
    return { prompt: estilo.texto(topic), plana: estilo.plana };
  },
  // Fase C — key visual de campanha sazonal (fundo do slide billboard):
  // cena escura e cinematográfica, assunto à DIREITA (o texto do slide fica
  // à esquerda), sem pessoas em close, sem texto
  seasonal: (topic) => ({
    prompt: `Premium advertising campaign key visual for ${topic}, cinematic 3D still-life scene, elegant symbolic objects arranged on the RIGHT side of a wide dark scene, left half mostly empty dark background for copy space, deep dark navy background, dramatic rim lighting with subtle festive accents, glossy high-end materials, luxury brand aesthetic, international agency quality, wide banner composition, clean unmarked surfaces`,
    plana: false,
  }),
};

// --- Core Functions ---

/**
 * Generate a professional cover image using AI providers
 * Falls back to local SVG if all providers fail
 *
 * @param {string} topic - Topic/title for the image prompt
 * @param {string} slug - Filename slug (without extension)
 * @param {string} destination - 'posts' or 'glossario'
 * @param {string} promptType - 'cover', 'glossary', or 'inline'
 * @returns {Promise<string>} local path like /images/posts/slug.webp
 */
/**
 * Quantas vezes se tenta o MESMO fornecedor quando a imagem é recusada pela
 * trava. Duas: a segunda vai com outra semente, portanto é uma imagem diferente
 * e não a mesma outra vez. Mais do que duas atrasa a corrida sem ganho — se um
 * fornecedor erra duas vezes seguidas no mesmo pedido, o problema é dele.
 */
const TENTATIVAS_POR_FORNECEDOR = 2;

export async function generateAIImage(topic, slug, destination = 'posts', promptType = 'cover') {
  const dir = destination === 'posts' ? POSTS_IMAGES_DIR
    : destination === 'sazonal' ? SAZONAL_IMAGES_DIR
    : GLOSSARIO_IMAGES_DIR;
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // ⚠️ O título NUNCA vai inteiro para o modelo — ver assuntoVisual().
  const assunto = assuntoVisual(topic);
  const { prompt, plana } = (PROMPT_TEMPLATES[promptType] || PROMPT_TEMPLATES.cover)(assunto);
  const activeProviders = PROVIDERS.filter(p => p.enabled);

  let recusadas = 0;

  // Try each provider in order
  for (const provider of activeProviders) {
    for (let tentativa = 1; tentativa <= TENTATIVAS_POR_FORNECEDOR; tentativa++) {
      try {
        // A imagem é gerada e normalizada mas NÃO gravada: primeiro passa pelas
        // travas. Assim uma capa reprovada nunca chega ao disco e não há risco de
        // ficar a substituir uma capa boa que já lá estava.
        const imageBuffer = await callProvider(provider, prompt);

        // `exigirNitidez: !plana` — a régua local só é cobrada a quem promete
        // detalhe. Numa ilustração de áreas lisas ela reprovaria imagem boa.
        const veredito = await aprovarCapa(imageBuffer, { mime: 'image/webp', exigirNitidez: !plana });
        if (!veredito.aprovada) {
          recusadas++;
          console.warn(`   🚫 [${provider.name}] capa RECUSADA (tentativa ${tentativa}/${TENTATIVAS_POR_FORNECEDOR}): ${veredito.motivo}`);
          medir({ fornecedor: provider.name, tipo: 'imagem', modelo: provider.model, unidades: 1 });
          continue; // outra semente, imagem diferente
        }

        const imagePath = await gravarImagem(imageBuffer, slug, destination, dir);
        console.log(`✅ [${provider.name}] Image saved: ${imagePath}`);
        if (veredito.cega) {
          // Não é motivo para recusar, mas tem de ficar dito: houve uma capa
          // publicada sem ninguém olhar para ela. A nitidez sai sempre, porque
          // essa metade da trava é local e nunca fica cega.
          console.warn(`   ⚠️ nitidez ${veredito.nitidez} OK, mas publicada SEM a trava de letras (nenhuma IA de visão respondeu)`);
        } else {
          console.log(`   🛡️ trava OK — nitidez ${veredito.nitidez}, letras: ${veredito.letras.nivel} (${veredito.letras.quem})`);
        }
        medir({ fornecedor: provider.name, tipo: 'imagem', modelo: provider.model, unidades: 1 });
        return imagePath;
      } catch (err) {
        console.warn(`⚠️ [${provider.name}] Failed: ${err.message}`);
        medir({ fornecedor: provider.name, tipo: 'imagem', modelo: provider.model, falhou: true });
        break; // erro de chamada → próximo fornecedor, não insiste neste
      }
    }
  }

  // All providers failed — fallback to SVG
  if (recusadas > 0) {
    // O desenho de reserva é feito por nós, com tipografia nossa e nenhuma letra
    // inventada: para o problema das letras ele é sempre uma saída segura.
    console.log(`📐 ${recusadas} capa(s) recusada(s) pelas travas e nenhum fornecedor deu imagem boa — generating SVG fallback`);
  } else if (activeProviders.length > 0) {
    console.log('📐 All AI providers failed — generating SVG fallback');
  } else {
    console.log('📐 No AI providers configured — generating SVG');
  }
  return saveSVGImage(topic, slug, destination);
}

/**
 * Padroniza em 1200x750 (>=1200px p/ og:image e rich results) + webp q78 e grava,
 * com as variantes responsivas 400w/800w para o srcset.
 *
 * Separado de callProvider de propósito: só se grava DEPOIS de a imagem passar
 * pelas travas.
 */
async function gravarImagem(outBuffer, slug, destination, dir) {
  const filename = `${slug}.webp`;
  writeFileSync(join(dir, filename), outBuffer);

  // Variantes responsivas (srcset): 400w e 800w a partir da base 1200w
  for (const w of [400, 800]) {
    try {
      const variant = await sharp(outBuffer).resize(w, null, { withoutEnlargement: true }).webp({ quality: 78, effort: 6 }).toBuffer();
      writeFileSync(join(dir, `${slug}-${w}.webp`), variant);
    } catch (e) { /* variante é opcional */ }
  }

  const sizeKB = (outBuffer.length / 1024).toFixed(0);
  console.log(`   📸 ${sizeKB}KB saved → /images/${destination}/${filename}`);
  return `/images/${destination}/${filename}`;
}

/**
 * Call a single provider's API.
 *
 * Devolve os BYTES da imagem já normalizada a 1200x750 webp — não grava nada.
 * Ver o comentário no fim desta função.
 */
async function callProvider(provider, prompt) {
  console.log(`🎨 [${provider.name}] Generating image...`);

  let imageBuffer;

  if (provider.format === 'pollinations') {
    // Provedor grátis SEM chave: o prompt vai na própria URL e a resposta são
    // os bytes da imagem (GET, não POST). Sem negative_prompt (não suportado).
    const seed = Math.floor(Math.random() * 1_000_000_000);
    const url = `${provider.endpoint}${encodeURIComponent(prompt)}?width=${provider.maxWidth}&height=${provider.maxHeight}&model=${provider.model}&nologo=true&seed=${seed}`;
    const response = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(90000) });
    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      throw new Error(`HTTP ${response.status}: ${errBody.substring(0, 150)}`);
    }
    imageBuffer = Buffer.from(await response.arrayBuffer());
  } else {
    let body;
    let headers;

    if (provider.format === 'cloudflare') {
      // ⚠️ O FLUX.1-schnell da Cloudflare aceita SÓ `prompt`, `steps` e `seed`.
      // Mandávamos também negative_prompt/width/height/num_steps e ele recusava
      // TODAS as chamadas, sempre, com HTTP 400:
      //   «Additional or unevaluated properties '/negative_prompt, /width,
      //    /height, /num_steps' at '/' not allowed»
      // Como há Together e Pollinations por baixo, as imagens continuavam a
      // sair e ninguém reparou — o primeiro fornecedor estava morto há tempo
      // indeterminado, a gastar uma chamada e um aviso por imagem (medido em
      // 18/08/2026: 6 recusas numa só corrida do glossário).
      //
      // ⚠️⚠️ NUNCA VOLTAR A DOBRAR AS EXCLUSÕES NO TEXTO. Foi o que se fez em
      // 18/08 (`body = { prompt: \`${prompt}. Avoid: ${NEGATIVE_PROMPT}\` }`) por
      // não haver campo negativo neste modelo, e no dia seguinte as capas saíram
      // COBERTAS DE LETRAS — o modelo é destilado, não tem CFG nem prompt
      // negativo, logo leu "text, letters, words, titles, typography…" como
      // encomenda. A regra está agora onde não depende da boa vontade do modelo:
      // nos estilos escritos em positivo, no assuntoVisual() e na trava do
      // guardiao-da-capa.js.
      //
      // O tamanho é o do modelo (quadrado); o sharp lá em baixo normaliza a
      // 1200x750. A `seed` é aleatória de propósito: é ela que faz a segunda
      // tentativa dar uma imagem DIFERENTE quando a trava recusa a primeira.
      body = { prompt, steps: provider.steps, seed: Math.floor(Math.random() * 1_000_000_000) };
      headers = {
        'Authorization': `Bearer ${provider.apiKey}`,
        'Content-Type': 'application/json',
      };
    } else {
      // Aqui o negativo VAI em campo próprio, que é o único lugar onde ele
      // funciona. Este endpoint aceita-o (Together, formato OpenAI).
      body = {
        model: provider.model,
        prompt,
        negative_prompt: NEGATIVE_PROMPT,
        width: provider.maxWidth,
        height: provider.maxHeight,
        steps: provider.steps,
        seed: Math.floor(Math.random() * 1_000_000_000),
        n: 1,
        response_format: 'b64_json',
      };
      headers = {
        'Authorization': `Bearer ${provider.apiKey}`,
        'Content-Type': 'application/json',
      };
    }

    let response = await fetch(provider.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    });

    /**
     * REDE DE SEGURANÇA — se o servidor recusar um campo, repete com o mínimo.
     *
     * Existe porque `steps` e `seed` nunca foram enviados a este endpoint antes
     * de 19/08/2026 e não há chave da Cloudflare nesta máquina para ensaiar. O
     * esquema oficial diz que são aceites, mas quem decide é o servidor. Sem esta
     * rede, se eu estiver errado o fornecedor nº1 morre em silêncio — e é
     * exactamente esse o defeito que se está a consertar.
     *
     * Só reage à recusa de CAMPOS (a mensagem de esquema do Cloudflare). 400 por
     * outro motivo, 429 e 5xx seguem o caminho normal e caem no fornecedor
     * seguinte.
     */
    if (response.status === 400 && Object.keys(body).length > 1) {
      const errBody = await response.clone().text().catch(() => '');
      if (/not allowed|unevaluated properties|additional propert/i.test(errBody)) {
        console.warn(`   ↩️ [${provider.name}] recusou campos do pedido — repetindo só com o prompt`);
        const minimo = provider.format === 'cloudflare' ? { prompt } : { model: provider.model, prompt, n: 1, response_format: 'b64_json' };
        response = await fetch(provider.endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(minimo),
          signal: AbortSignal.timeout(60000),
        });
      }
    }

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      throw new Error(`HTTP ${response.status}: ${errBody.substring(0, 150)}`);
    }

    if (provider.format === 'cloudflare') {
      const data = await response.json();
      if (data.result && data.result.image) {
        imageBuffer = Buffer.from(data.result.image, 'base64');
      } else {
        throw new Error('Cloudflare AI returned no image data');
      }
    } else {
      const data = await response.json();
      if (data.data && data.data[0]) {
        if (data.data[0].b64_json) {
          imageBuffer = Buffer.from(data.data[0].b64_json, 'base64');
        } else if (data.data[0].url) {
          const imgResponse = await fetch(data.data[0].url);
          if (!imgResponse.ok) throw new Error('Failed to download image from URL');
          imageBuffer = Buffer.from(await imgResponse.arrayBuffer());
        }
      }
    }
  }

  if (!imageBuffer || imageBuffer.length < 1000) {
    throw new Error('Invalid or empty image data received');
  }

  // Padroniza em 1200x750 (>=1200px p/ og:image e rich results) + webp q78
  // (reduz ~80% o peso, melhora LCP). Fallback: devolve o original.
  //
  // ⚠️ NÃO GRAVA. Devolver os bytes em vez de escrever no disco é o que permite
  // às travas do guardiao-da-capa.js recusarem uma capa ANTES de ela existir —
  // e assim uma capa reprovada nunca substitui uma capa boa que já lá estava.
  // Quem grava é gravarImagem(), chamado só depois do veredito.
  try {
    return await sharp(imageBuffer).resize(1200, 750, { fit: 'cover' }).webp({ quality: 78, effort: 6 }).toBuffer();
  } catch (err) {
    console.warn(`   ⚠️ Falha ao otimizar imagem (${err.message}) — seguindo com o original`);
    return imageBuffer;
  }
}

/**
 * Convenience function: generate cover image (async)
 * This is what scripts should call
 */
export async function generateCoverImage(topic, slug, destination = 'posts') {
  const promptType = destination === 'glossario' ? 'glossary' : 'cover';
  return generateAIImage(topic, slug, destination, promptType);
}

/**
 * Generate inline section image (async)
 */
export async function generateInlineImage(topic, slug, destination = 'posts') {
  return generateAIImage(topic, slug, destination, 'inline');
}

/**
 * Sync fallback — returns SVG immediately (no API call)
 * Use when you can't await (backward compatibility)
 */
export function generateCoverImageSync(topic, slug, destination = 'posts') {
  return saveSVGImage(topic, slug, destination);
}

/**
 * Check which providers are configured
 */
export function getProviderStatus() {
  return PROVIDERS.map(p => ({
    name: p.name,
    enabled: p.enabled,
    model: p.model,
  }));
}
