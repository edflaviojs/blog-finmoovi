/**
 * Gera `imageAlt` descritivo (acessibilidade/SEO) para as capas dos posts e do
 * glossário, usando IA de visão. Descreve a CENA visível (não repete o título).
 *
 * - Idempotente: pula arquivos que já têm `imageAlt`.
 * - Localizado: descreve no idioma do próprio arquivo (pt/en/es).
 * - Provedores de visão (na ordem): Cloudflare Workers AI → Groq. Ambos
 *   OpenAI-compatíveis (chat/completions com image_url em base64).
 *
 * Uso:
 *   node --import tsx src/scripts/automacoes/gerar-alt-imagens.js            # tudo
 *   node --import tsx src/scripts/automacoes/gerar-alt-imagens.js --limit 5  # amostra
 *   node --import tsx src/scripts/automacoes/gerar-alt-imagens.js --force    # regenera
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';
import sharp from 'sharp';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const THROTTLE_MS = 2500; // ~24 req/min, abaixo do limite do Groq free

const ROOT = process.cwd();
const COLLECTIONS = [
  { dir: join(ROOT, 'src/content/posts'), key: 'title' },
  { dir: join(ROOT, 'src/content/glossario'), key: 'term' },
];

const args = process.argv.slice(2);
const LIMIT = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1], 10) : Infinity;
const FORCE = args.includes('--force');

const LANG = { pt: 'Portuguese (Brazil)', en: 'English', es: 'Spanish' };

// --- Provedores de visão (OpenAI-compatível). Groq primário (confiável);
// Cloudflare como fallback (o modelo exige aceite de "agreement" → costuma dar 403). ---
const VISION = [
  {
    name: 'Groq',
    enabled: !!process.env.GROQ_API_KEY,
    url: 'https://api.groq.com/openai/v1/chat/completions',
    apiKey: process.env.GROQ_API_KEY,
    // llama-4-scout foi aposentado pelo Groq em 17/06/2026 (respondia 404 e
    // derrubava o job inteiro no circuit breaker). qwen3.6-27b e o substituto
    // oficial e o unico modelo de visao do Groq hoje.
    model: process.env.GROQ_VISION_MODEL || 'qwen/qwen3.6-27b',
    // qwen3.6 raciocina por padrao e o <think> sai DENTRO do content — com
    // max_tokens 80 o raciocinio consome a cota toda e o alt vira o rascunho
    // do modelo. 'none' entrega so a resposta final.
    extraBody: { reasoning_effort: 'none' },
  },
  {
    name: 'Cloudflare Workers AI',
    enabled: !!(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_AI_TOKEN),
    // ATENCAO: este modelo NAO aceita imagem pelo endpoint compativel com
    // OpenAI. Sondado em 28/07/2026 — content array com image_url responde
    // 400 "Unable to add image when there are no user-supplied nor
    // system-supplied messages" (code 3030), tanto com a imagem antes do
    // texto quanto com uma mensagem system junto. So o endpoint NATIVO
    // /ai/run com { prompt, image: [bytes] } responde 200. Por isso o
    // native: true — ver o if em describeImage().
    url: `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/meta/llama-3.2-11b-vision-instruct`,
    apiKey: process.env.CLOUDFLARE_AI_TOKEN,
    model: '@cf/meta/llama-3.2-11b-vision-instruct',
    native: true,
  },
];

function detectLocale(data, filename) {
  if (data.locale) return data.locale;
  if (filename.startsWith('en-')) return 'en';
  if (filename.startsWith('es-')) return 'es';
  return 'pt';
}

async function describeImage(imageBuffer, mime, locale, topic) {
  const dataUrl = `data:${mime};base64,${imageBuffer.toString('base64')}`;
  const language = LANG[locale] || LANG.pt;
  const prompt =
    `Write a concise, factual ALT text in ${language} for this cover image of a ` +
    `personal-finance article titled "${topic}". Describe only what is visibly in ` +
    `the scene (objects, setting, colors), max 14 words. Do NOT start with "image of" ` +
    `or "photo of". Return ONLY the alt text, no quotes.`;

  const providers = VISION.filter(p => p.enabled);
  if (providers.length === 0) throw new Error('Nenhum provedor de visão configurado (CLOUDFLARE_* ou GROQ_API_KEY)');

  let lastErr;
  for (const provider of providers) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(provider.url, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${provider.apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(provider.native
            // Endpoint nativo do Cloudflare: imagem como array de bytes.
            ? { prompt, image: [...imageBuffer], max_tokens: 80, temperature: 0.4 }
            // Padrao compativel com OpenAI (Groq): imagem como data URL.
            : {
              model: provider.model,
              max_tokens: 80,
              temperature: 0.4,
              ...(provider.extraBody || {}),
              messages: [{
                role: 'user',
                content: [
                  { type: 'text', text: prompt },
                  { type: 'image_url', image_url: { url: dataUrl } },
                ],
              }],
            }),
          signal: AbortSignal.timeout(60000),
        });
        // Rate limit / indisponível → espera e tenta de novo
        if (res.status === 429 || res.status === 503) {
          const wait = 20000 * (attempt + 1);
          console.warn(`   ⏳ ${provider.name} ${res.status} — aguardando ${wait / 1000}s`);
          await sleep(wait);
          continue;
        }
        if (!res.ok) throw new Error(`${provider.name} HTTP ${res.status}: ${(await res.text()).slice(0, 120)}`);
        const json = await res.json();
        // O nativo devolve result.response; o compativel devolve choices[].
        let alt = (provider.native
          ? json.result?.response
          : json.choices?.[0]?.message?.content)?.trim();
        if (!alt) throw new Error(`${provider.name} sem conteúdo`);
        // Rede de seguranca p/ modelos de raciocinio: remove o bloco <think>…</think>
        // se ele vier junto do content. Se o bloco veio TRUNCADO (abriu e nao
        // fechou, por causa do max_tokens), nao ha resposta final — falhar aqui
        // e melhor que gravar o rascunho do modelo como alt.
        alt = alt.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
        if (/<\/?think>/i.test(alt)) throw new Error(`${provider.name}: raciocínio truncado no content (sem resposta final)`);
        if (!alt) throw new Error(`${provider.name} sem conteúdo após limpar o raciocínio`);
        alt = alt.replace(/^["']|["']$/g, '').replace(/\s+/g, ' ').trim();
        if (alt.length > 160) alt = alt.slice(0, 157).trimEnd() + '…';
        return alt;
      } catch (e) {
        lastErr = e;
        console.warn(`   ⚠️ ${e.message}`);
        break; // erro não-429 → próximo provedor
      }
    }
  }
  throw lastErr;
}

async function run() {
  let processed = 0, skipped = 0, errors = 0, consecutiveErrors = 0;
  let aborted = false;

  for (const col of COLLECTIONS) {
    if (aborted || !existsSync(col.dir)) continue;
    for (const file of readdirSync(col.dir)) {
      if (!file.endsWith('.md')) continue;
      if (processed >= LIMIT) break;
      // Circuit breaker: muitas falhas seguidas = provável teto diário → para
      // (a agenda 3x/dia retoma depois, de forma idempotente).
      if (consecutiveErrors >= 8) {
        console.warn('\n🛑 8 falhas seguidas — provável limite diário de API. Abortando; a agenda retoma depois.');
        aborted = true;
        break;
      }

      const full = join(col.dir, file);
      const raw = readFileSync(full, 'utf-8');
      const parsed = matter(raw);
      const data = parsed.data;

      if (!data.image) { skipped++; continue; }
      if (data.imageAlt && !FORCE) { skipped++; continue; }

      const imgPath = join(ROOT, 'public', data.image);
      if (!existsSync(imgPath)) { console.warn(`   ⚠️ imagem ausente: ${data.image}`); skipped++; continue; }

      const locale = detectLocale(data, file);
      const topic = data[col.key] || data.title || '';

      try {
        // Converte p/ JPEG 768px: compatível com toda API de visão e reduz o consumo de tokens
        const jpeg = await sharp(readFileSync(imgPath)).resize(768, null, { withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
        const alt = await describeImage(jpeg, 'image/jpeg', locale, topic);
        // Inserção cirúrgica: adiciona a linha imageAlt logo após a linha image,
        // preservando todo o resto do frontmatter (sem re-serializar).
        const yamlAlt = `imageAlt: "${alt.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
        let out;
        if (/^imageAlt:/m.test(raw)) {
          out = raw.replace(/^imageAlt:.*$/m, yamlAlt); // --force: substitui
        } else {
          out = raw.replace(/^(image:.*)$/m, `$1\n${yamlAlt}`); // adiciona após image:
        }
        if (out === raw) { console.warn(`   ⚠️ não encontrei a linha image: em ${file}`); errors++; continue; }
        writeFileSync(full, out, 'utf-8');
        processed++;
        consecutiveErrors = 0;
        console.log(`✅ [${locale}] ${file}\n   → ${alt}`);
        await sleep(THROTTLE_MS);
      } catch (e) {
        errors++;
        consecutiveErrors++;
        console.warn(`❌ ${file}: ${e.message}`);
      }
    }
  }

  console.log(`\n=== RESUMO ===\nGerados: ${processed} | Pulados: ${skipped} | Erros: ${errors}`);

  // Falhar ALTO quando nada foi gerado E houve erro. Sem isto o job saia com
  // exit 0 e o GitHub marcava "success" mesmo com Gerados: 0 — foi o que
  // escondeu por semanas o modelo aposentado do Groq (404) somado ao 403 do
  // Cloudflare. Regra deliberadamente estreita:
  //   processed > 0            -> sucesso, mesmo com erros avulsos (rodada
  //                               parcial e o comportamento normal ao bater
  //                               no teto diario da API; a agenda retoma);
  //   processed 0 e errors 0   -> sucesso (nada a fazer, tudo ja tem alt);
  //   processed 0 e errors > 0 -> falha: tentou e NADA funcionou.
  if (processed === 0 && errors > 0) {
    console.error(`\n🚨 Nenhum imageAlt gerado em ${errors} tentativa(s) — provedores de visão indisponíveis (modelo aposentado, chave inválida ou teto atingido). Veja os erros acima.`);
    process.exitCode = 1;
  }
}

run();
