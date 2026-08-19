/**
 * guardiao-da-capa.js — as duas TRAVAS que uma capa tem de passar antes de ser
 * publicada: não pode ter LETRAS e não pode estar BORRADA.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PORQUE EXISTE (a queixa que voltava sempre)
 * ─────────────────────────────────────────────────────────────────────────────
 * A mesma imagem serve os três idiomas (pt/en/es). Uma capa com palavras
 * escritas fica errada em dois deles. A regra é antiga e a queixa também:
 * *"vira e mexe acontece o mesmo problema"*.
 *
 * A regra "sem letras" já tinha sido tentada TRÊS vezes, sempre pelo lado do
 * PEDIDO ao modelo, e nunca medindo o resultado:
 *   11/06/2026 `201f4f10` — prompts "robustos" a pedir para não escrever
 *   13/06/2026 `21e51a39` — campo `negative_prompt` separado
 *   18/08/2026 `e25332ae` — a lista dobrada no fim do prompt. Foi a PIOR: o
 *     FLUX.1-schnell não tem prompt negativo (é modelo destilado, sem CFG),
 *     logo leu as 20 palavras — "text, letters, words, titles, typography…" —
 *     como conteúdo PEDIDO. Em 19/08 saiu uma capa com o título do post escrito
 *     por cima em letras gigantes e trocadas.
 *
 * Pedir ao modelo é esperança, não garantia: nenhum gerador de imagem promete
 * obedecer a "não escrevas". A cura é a TRAVA, não a leitura — gera-se, MEDE-SE
 * o que saiu, e o que não passa é feito outra vez. Aí deixa de importar se o
 * modelo obedeceu.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * AS DUAS TRAVAS
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. LETRAS — precisa de IA de visão (não há como ver texto sem olhar).
 * 2. NITIDEZ — puramente local, com o `sharp` que já está no projecto. Não
 *    depende de rede, chave, cota nem fornecedor: é aritmética. Apanha o defeito
 *    de 19/08 em que o modelo novo da Together ficou com os 4 passos do modelo
 *    antigo e devolvia imagem inacabada.
 *
 * A trava 2 é a mais valiosa das duas justamente por não depender de ninguém.
 */

import sharp from 'sharp';
import { medir, fichasDaResposta } from './medidor.js';

// ─────────────────────────────────────────────────────────────────────────────
// TRAVA 2 — NITIDEZ (local, sem rede)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Limite de nitidez. MEDIDO, não escolhido a olho — a lição de
 * `regua-grossa-demais-inventa-defeito` é que régua mal calibrada inventa
 * defeito onde não há.
 *
 * Medição de 19/08/2026 sobre o acervo real (420 capas de posts + 324 do
 * glossário), com a energia de bordas que `medirNitidez` devolve:
 *
 *   borrão de 19/08 (Qwen-Image com 4 passos) ......  14   ← o defeito
 *   capas boas, 5º percentil do glossário .......... 126
 *   capas boas, mediana ............................ 654 a 718
 *   capa mais nítida do acervo .................... 3488
 *
 * 60 fica 4x acima do defeito e 2x abaixo da capa boa mais fraca. Folga dos
 * dois lados de propósito.
 *
 * ⚠️⚠️ ESTA RÉGUA SÓ VALE ONDE SE ESPERA DETALHE — não é uma trava universal.
 *
 * Medido em 19/08/2026, e foi uma surpresa: uma ILUSTRAÇÃO PLANA boa (o estilo
 * "minimalist flat illustration, pastel colors" das imagens de secção) mede 13,
 * praticamente o mesmo que o borrão que mede 14. E não há métrica local que os
 * separe — tentou-se o percentil 99, o 99,9 e o máximo da força das bordas:
 *
 *   borrão real ............. média  14 | p99,9  41 | máx  90
 *   ilustração plana boa .... média  13 | p99,9  46 | máx  76   ← indistinguível
 *   foto boa ................ média 687 | p99,9 191 | máx 312
 *
 * Faz sentido: uma ilustração de áreas lisas e um borrão têm ambos pouca
 * informação fina. Insistir numa régua única mandaria refazer dezenas de
 * ilustrações que estão boas — é o defeito de `regua-grossa-demais-inventa-defeito`.
 *
 * Por isso quem manda é o ESTILO PEDIDO, que só o image-router conhece:
 *   - estilos fotográficos e 3D  → `exigirNitidez: true`  (esperam detalhe)
 *   - estilos de ilustração plana → `exigirNitidez: false` (não esperam)
 * E para as capas ANTIGAS, em que já não se sabe que estilo as gerou, a nitidez
 * não serve: quem julga é a IA de visão (ver `olharCapa`, campo `borrada`).
 */
export const LIMITE_NITIDEZ = 60;

/**
 * Energia de bordas (variância do laplaciano) numa versão pequena e cinza da
 * imagem. Quanto mais alto, mais detalhe; imagem inacabada tende a zero.
 *
 * A imagem é reduzida a 400x250 antes de medir para que o número não dependa do
 * tamanho do ficheiro nem do fornecedor.
 *
 * @param {Buffer} imageBuffer
 * @returns {Promise<number>} 0 se não foi possível medir (nunca lança)
 */
export async function medirNitidez(imageBuffer) {
  try {
    const { data, info } = await sharp(imageBuffer)
      .greyscale()
      .resize(400, 250, { fit: 'cover' })
      .raw()
      .toBuffer({ resolveWithObject: true });

    let soma = 0;
    let n = 0;
    for (let y = 1; y < info.height - 1; y++) {
      for (let x = 1; x < info.width - 1; x++) {
        const i = y * info.width + x;
        const lap = 4 * data[i] - data[i - 1] - data[i + 1] - data[i - info.width] - data[i + info.width];
        soma += lap * lap;
        n++;
      }
    }
    return n > 0 ? Math.round(soma / n) : 0;
  } catch {
    // Não conseguir medir não pode reprovar uma imagem: devolve 0 e quem chama
    // trata 0 como "não medido" (ver aprovarCapa).
    return 0;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TRAVA 1 — LETRAS (precisa de IA de visão)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fornecedores de visão, na ordem. Mesmo formato do `gerar-alt-imagens.js`, que
 * corre 3x/dia há semanas — caminho provado, não inventado aqui.
 *
 * ⚠️ A ORDEM É AO CONTRÁRIO DA DO `gerar-alt-imagens.js`, E É DE PROPÓSITO. Lá o
 * Groq vem primeiro. Aqui a Cloudflare vem primeiro, porque foi medido na primeira
 * corrida real desta trava (19/08/2026, corrida 32255948526): o Groq respondeu
 * **HTTP 429, cota esgotada** — a chave dele está repartida por 38 workflows e o
 * robô dos textos alternativos consome-a três vezes ao dia. Uma trava que depende
 * de uma cota disputada fica cega justamente nos dias movimentados.
 *
 * A Cloudflare tem cota própria (é a mesma conta que gera as imagens) e nessa
 * corrida respondeu 200. Fica primeiro; o Groq fica como reserva.
 *
 * Sondado na máquina do dono, também em 19/08: `GEMINI_API_KEY` responde 403
 * ("Your project has been denied access") e `KIE_API_KEY` começa por "test" e é
 * inválida. Não há olhos locais — esta trava só se prova a correr no GitHub, com
 * `gh workflow run diagnostico-ia.yml`.
 */
function fornecedores() {
  return [
    {
      name: 'Cloudflare Workers AI',
      enabled: !!(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_AI_TOKEN),
      url: `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/meta/llama-3.2-11b-vision-instruct`,
      apiKey: process.env.CLOUDFLARE_AI_TOKEN,
      model: '@cf/meta/llama-3.2-11b-vision-instruct',
      formato: 'cloudflare',
    },
    {
      name: 'Groq',
      enabled: !!process.env.GROQ_API_KEY,
      url: 'https://api.groq.com/openai/v1/chat/completions',
      apiKey: process.env.GROQ_API_KEY,
      model: process.env.GROQ_VISION_MODEL || 'qwen/qwen3.6-27b',
      // qwen3.6 raciocina por omissão e o <think> sai dentro do content.
      extraBody: { reasoning_effort: 'none' },
      formato: 'openai',
    },
    {
      name: 'Gemini',
      enabled: !!process.env.GEMINI_API_KEY,
      url: `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_VISION_MODEL || 'gemini-flash-latest'}:generateContent`,
      apiKey: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_VISION_MODEL || 'gemini-flash-latest',
      formato: 'gemini',
    },
  ];
}

/**
 * A pergunta à IA de visão. Pede JSON para a resposta ser LIDA e não adivinhada
 * (`resposta-ia-cortada-em-silencio`), e explica cada gaveta com exemplos porque
 * o exemplo pesa mais que a regra (`o-exemplo-pesa-mais-que-a-proibicao`).
 *
 * ⚠️ O CRITÉRIO NÃO É "ZERO LETRAS", E É DE PROPÓSITO. Uma foto de teclado tem
 * letras nas teclas; uma de rua tem placas ao longe. Reprovar isso mandava quase
 * tudo para o desenho de reserva. Reprova-se texto **proeminente** — o que o
 * leitor LÊ. Foi esse o defeito de 19/08: o título do post escrito por cima.
 */
const PERGUNTA =
  'You are a strict quality gate for stock cover images. Report two things.\n' +
  '\n' +
  '(1) WRITTEN TEXT visible in the image. Exactly one level:\n' +
  '- "proeminente": readable words, a headline, a sentence, a caption, a big ' +
  'number or a logo wordmark that a reader would actually read. This INCLUDES ' +
  'garbled, misspelled or nonsense words when rendered in large letters.\n' +
  '- "incidental": only tiny or unreadable marks nobody would read, such as ' +
  'letters on keyboard keys, blurred distant signage, or texture that merely ' +
  'resembles writing.\n' +
  '- "nenhuma": no writing at all.\n' +
  '\n' +
  '(2) TECHNICAL QUALITY. Exactly one value:\n' +
  '- "borrada": the image looks unfinished, smeared or out of focus overall — ' +
  'faces and objects melting or unrecognisable, as if generation stopped early.\n' +
  '- "boa": anything intentional and finished. A FLAT VECTOR ILLUSTRATION with ' +
  'large areas of solid colour is "boa", not "borrada". A sharp photo with a ' +
  'deliberately soft background (bokeh) is also "boa".\n' +
  '\n' +
  'Answer ONLY with compact JSON, no markdown fence: ' +
  '{"nivel":"proeminente|incidental|nenhuma","amostra":"the text you can read, or empty","qualidade":"boa|borrada"}';

/** Extrai o primeiro objecto JSON de uma resposta, mesmo suja de cerca ou prosa. */
function lerJson(texto) {
  if (!texto) return null;
  const limpo = String(texto).replace(/<think>[\s\S]*?<\/think>/gi, '');
  const m = limpo.match(/\{[\s\S]*?\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
}

/** Pergunta a UMA IA de visão. Devolve `{nivel, amostra}` ou lança. */
async function perguntar(provider, imageBuffer, mime) {
  const base64 = imageBuffer.toString('base64');
  let url = provider.url;
  let body;
  const headers = { 'Content-Type': 'application/json' };

  if (provider.formato === 'gemini') {
    // O Gemini leva a chave na URL e a imagem em `inline_data`.
    url += `?key=${provider.apiKey}`;
    body = {
      contents: [{ parts: [{ text: PERGUNTA }, { inline_data: { mime_type: mime, data: base64 } }] }],
      generationConfig: { temperature: 0, maxOutputTokens: 2048 },
    };
  } else if (provider.formato === 'cloudflare') {
    // ⚠️ Este modelo NÃO aceita imagem pelo endpoint compatível com OpenAI —
    // sondado em 28/07/2026: responde 400 (code 3030). Só o /ai/run nativo com
    // { prompt, image: [bytes] } responde 200. Igual ao gerar-alt-imagens.js.
    headers.Authorization = `Bearer ${provider.apiKey}`;
    // 200 e não 120: a pergunta pede JSON com três campos e uma amostra de texto.
    // Régua curta demais inventa avaria — foi o que aconteceu com o `maxTokens: 10`
    // do diagnóstico dos textos, que fez o Groq parecer avariado sem estar.
    body = { prompt: PERGUNTA, image: [...imageBuffer], max_tokens: 200, temperature: 0 };
  } else {
    headers.Authorization = `Bearer ${provider.apiKey}`;
    body = {
      model: provider.model,
      max_tokens: 120,
      temperature: 0,
      ...(provider.extraBody || {}),
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: PERGUNTA },
          { type: 'image_url', image_url: { url: `data:${mime};base64,${base64}` } },
        ],
      }],
    };
  }

  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(60000) });

  if (!res.ok) {
    medir({ fornecedor: provider.name, tipo: 'visao', modelo: provider.model, falhou: true });
    throw new Error(`${provider.name} HTTP ${res.status}: ${(await res.text()).slice(0, 120)}`);
  }

  const json = await res.json();
  medir({ fornecedor: provider.name, tipo: 'visao', modelo: provider.model, unidades: 1, ...(fichasDaResposta(json) || {}) });

  const bruto = provider.formato === 'gemini'
    ? json.candidates?.[0]?.content?.parts?.map(p => p.text).join('')
    : provider.formato === 'cloudflare'
      ? (json.result?.response ?? json.result)
      : json.choices?.[0]?.message?.content;

  /**
   * ⚠️ A RESPOSTA PODE NÃO SER TEXTO. Medido em 19/08/2026, na primeira corrida
   * real desta trava: o modelo de visão da Cloudflare devolveu um OBJECTO e o
   * código, que esperava string, registou apenas «resposta sem nível legível
   * ("[object Object]")» — e a trava ficou cega com a chave a funcionar.
   *
   * Como este pedido manda responder em JSON, o objecto devolvido já pode SER a
   * resposta. Por isso: se vier objecto com `nivel`, usa-se directamente; se vier
   * outro objecto, passa a texto para o `lerJson` procurar o JSON lá dentro.
   */
  let lido = null;
  if (bruto && typeof bruto === 'object' && !Array.isArray(bruto) && bruto.nivel) {
    lido = bruto;
  } else {
    lido = lerJson(typeof bruto === 'string' ? bruto : JSON.stringify(bruto));
  }

  if (!lido || !lido.nivel) {
    // A mensagem mostra o FORMATO, não só o valor: foi a falta disso que fez a
    // primeira falha custar uma corrida inteira para ser entendida.
    const forma = bruto && typeof bruto === 'object' ? `objecto com chaves [${Object.keys(bruto).join(', ')}]` : `"${String(bruto).slice(0, 80)}"`;
    throw new Error(`${provider.name}: resposta sem nível legível — ${forma}`);
  }

  const nivel = String(lido.nivel).toLowerCase();
  if (!['proeminente', 'incidental', 'nenhuma'].includes(nivel)) {
    throw new Error(`${provider.name}: nível desconhecido "${nivel}"`);
  }
  // A qualidade é secundária: se o modelo não a devolver, não se inventa defeito.
  const borrada = String(lido.qualidade || '').toLowerCase() === 'borrada';
  return { nivel, amostra: String(lido.amostra || '').slice(0, 80), borrada };
}

/**
 * Olha a imagem com IA de visão: diz se tem texto proeminente e se parece
 * inacabada. Uma só chamada responde às duas perguntas.
 *
 * @returns {Promise<{reprovada: boolean, nivel: string|null, amostra: string,
 *                    borrada: boolean, indisponivel: boolean, quem: string|null}>}
 *   `reprovada` refere-se às LETRAS (é o nome herdado da trava principal).
 *   `indisponivel: true` quando nenhuma IA de visão respondeu. Nesse caso nada é
 *   reprovado, de propósito: sem prova não se joga fora uma imagem que pode estar
 *   boa. Publicar é o trabalho; medir é acessório.
 */
export async function olharCapa(imageBuffer, mime = 'image/webp') {
  const ativos = fornecedores().filter(p => p.enabled);
  const cego = { reprovada: false, nivel: null, amostra: '', borrada: false, indisponivel: true, quem: null };
  if (ativos.length === 0) return cego;

  const erros = [];
  for (const provider of ativos) {
    try {
      const { nivel, amostra, borrada } = await perguntar(provider, imageBuffer, mime);
      return { reprovada: nivel === 'proeminente', nivel, amostra, borrada, indisponivel: false, quem: provider.name };
    } catch (e) {
      erros.push(e.message);
    }
  }

  console.warn(`   ⚠️ TRAVA ANTI-LETRAS CEGA — nenhuma IA de visão respondeu: ${erros.join(' | ')}`);
  return cego;
}

/** Nome antigo, mantido porque o diagnóstico o usa e lê melhor lá. */
export const temLetras = olharCapa;

// ─────────────────────────────────────────────────────────────────────────────
// AS DUAS TRAVAS JUNTAS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Passa a capa pelas duas travas. NUNCA lança.
 *
 * A nitidez é medida PRIMEIRO de propósito: é local e de graça, enquanto a de
 * letras gasta uma chamada de IA. Imagem borrada é recusada sem pagar nada.
 *
 * @param {Buffer} imageBuffer
 * @param {object} [opcoes]
 * @param {string} [opcoes.mime] tipo dos bytes (por omissão webp)
 * @param {boolean} [opcoes.exigirNitidez] false para estilos desfocados de propósito
 * @param {boolean} [opcoes.verLetras] false para saltar a IA de visão
 * @returns {Promise<{aprovada: boolean, motivo: string|null, nitidez: number,
 *                    letras: object, cega: boolean}>}
 */
export async function aprovarCapa(imageBuffer, opcoes = {}) {
  const { mime = 'image/webp', exigirNitidez = true, verLetras = true } = opcoes;
  const semOlhos = { reprovada: false, nivel: null, amostra: '', borrada: false, indisponivel: true, quem: null };

  const nitidez = await medirNitidez(imageBuffer);
  // nitidez 0 = não foi possível medir; não é prova de defeito, logo não reprova.
  if (exigirNitidez && nitidez > 0 && nitidez < LIMITE_NITIDEZ) {
    return {
      aprovada: false,
      motivo: `borrada (nitidez ${nitidez}, mínimo ${LIMITE_NITIDEZ})`,
      nitidez,
      letras: semOlhos,
      cega: false,
    };
  }

  if (!verLetras) {
    return { aprovada: true, motivo: null, nitidez, letras: semOlhos, cega: false };
  }

  const letras = await olharCapa(imageBuffer, mime);

  // As LETRAS primeiro: é a regra que não se pode quebrar.
  if (letras.reprovada) {
    return {
      aprovada: false,
      motivo: `tem texto escrito${letras.amostra ? ` ("${letras.amostra}")` : ''}`,
      nitidez,
      letras,
      cega: false,
    };
  }

  // O parecer de "borrada" da visão vale mesmo quando a régua local não se
  // aplica — e é ele que serve para as capas ANTIGAS, cujo estilo já não se sabe.
  // A visão distingue ilustração plana de borrão; a aritmética local não.
  if (letras.borrada) {
    return {
      aprovada: false,
      motivo: `borrada segundo a IA de visão (nitidez local ${nitidez})`,
      nitidez,
      letras,
      cega: false,
    };
  }

  return { aprovada: true, motivo: null, nitidez, letras, cega: letras.indisponivel };
}

/** Diagnóstico: que olhos de visão estão disponíveis neste arranque. */
export function olhosDisponiveis() {
  return fornecedores().filter(p => p.enabled).map(p => p.name);
}
