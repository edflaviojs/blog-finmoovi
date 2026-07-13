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
    model: process.env.GROQ_VISION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct',
  },
  {
    name: 'Cloudflare Workers AI',
    enabled: !!(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_AI_TOKEN),
    url: `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/v1/chat/completions`,
    apiKey: process.env.CLOUDFLARE_AI_TOKEN,
    model: '@cf/meta/llama-3.2-11b-vision-instruct',
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
          body: JSON.stringify({
            model: provider.model,
            max_tokens: 80,
            temperature: 0.4,
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
        let alt = json.choices?.[0]?.message?.content?.trim();
        if (!alt) throw new Error(`${provider.name} sem conteúdo`);
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
  let processed = 0, skipped = 0, errors = 0;

  for (const col of COLLECTIONS) {
    if (!existsSync(col.dir)) continue;
    for (const file of readdirSync(col.dir)) {
      if (!file.endsWith('.md')) continue;
      if (processed >= LIMIT) break;

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
        console.log(`✅ [${locale}] ${file}\n   → ${alt}`);
        await sleep(THROTTLE_MS);
      } catch (e) {
        errors++;
        console.warn(`❌ ${file}: ${e.message}`);
      }
    }
  }

  console.log(`\n=== RESUMO ===\nGerados: ${processed} | Pulados: ${skipped} | Erros: ${errors}`);
}

run();
