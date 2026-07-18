/**
 * Pinterest Auto-Publish Script
 *
 * Reads recent posts (last 14 days) from src/content/posts/
 * and publishes them as pins via Pinterest API v5.
 *
 * Env vars (preferencial — token renovado a cada execução, nunca expira):
 *   PINTEREST_CLIENT_ID + PINTEREST_CLIENT_SECRET + PINTEREST_REFRESH_TOKEN
 *   PINTEREST_BOARD_ID - Target board ID
 * Fallback (access token estático — expira em ~30 dias, evitar):
 *   PINTEREST_ACCESS_TOKEN
 *
 * Autorização única para obter o refresh token: scripts/pinterest-auth.js
 *
 * Tracking: .github/data/pinterest-published.json
 * Max: 3 pins per execution
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE_URL, NICHE_KEYWORDS, tagSlug } from './lib/site.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..');
const POSTS_DIR = join(ROOT, 'src', 'content', 'posts');
const TRACKING_FILE = join(ROOT, '.github', 'data', 'pinterest-published.json');
const MAX_PINS_PER_RUN = 3;
const DAYS_LOOKBACK = 14;

// Pinterest API config
const PINTEREST_API_BASE = 'https://api.pinterest.com/v5';
const PINTEREST_BOARD_ID = process.env.PINTEREST_BOARD_ID;
const PINTEREST_CLIENT_ID = process.env.PINTEREST_CLIENT_ID;
const PINTEREST_CLIENT_SECRET = process.env.PINTEREST_CLIENT_SECRET;
const PINTEREST_REFRESH_TOKEN = process.env.PINTEREST_REFRESH_TOKEN;

// Preenchido em main(): via refresh token (preferencial) ou env estática
let PINTEREST_ACCESS_TOKEN = process.env.PINTEREST_ACCESS_TOKEN || null;

/**
 * Dias restantes até o refresh token expirar. O token do Pinterest é um JWT
 * cujo payload traz iat (emissão) e exp (DURAÇÃO em segundos, ~60 dias).
 * Retorna null se não der para decodificar.
 */
function refreshTokenDaysLeft() {
  try {
    // Formato: pinr.<header>.<payload>.<assinatura> — payload é a parte [2]
    const payload = JSON.parse(
      Buffer.from(PINTEREST_REFRESH_TOKEN.split('.')[2], 'base64').toString('utf-8'),
    );
    if (!payload.iat || !payload.exp) return null;
    const expiresAtMs = (payload.iat + payload.exp) * 1000;
    return Math.floor((expiresAtMs - Date.now()) / 86400000);
  } catch {
    return null;
  }
}

/**
 * Lembrete automático de renovação: com ≤7 dias de validade restante, abre uma
 * issue no GitHub (que dispara e-mail ao dono) com o passo a passo. Deduplica
 * por título para não abrir issue repetida a cada execução.
 */
async function openRenewalIssueIfNeeded(daysLeft) {
  const ghToken = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY; // ex.: edflaviojs/blog-finmoovi
  if (!ghToken || !repo) return;

  const title = '📌 Renovar o refresh token do Pinterest (vence em breve)';
  const headers = {
    Authorization: `Bearer ${ghToken}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
  };

  // Já existe issue aberta com esse título? Então não duplica.
  const existing = await fetch(
    `https://api.github.com/repos/${repo}/issues?state=open&per_page=50`,
    { headers },
  ).then(r => (r.ok ? r.json() : []));
  if (Array.isArray(existing) && existing.some(i => i.title === title)) return;

  const body = [
    `O refresh token do Pinterest expira em **~${daysLeft} dia(s)**. Sem renovação, a publicação automática de pins para de funcionar.`,
    '',
    '**Renovar (≈2 minutos):**',
    '```powershell',
    'cd "C:\\Users\\Ed Flávio\\Desktop\\CLAUDE-CODE\\FINMOOVI\\blog-finmoovi"',
    '$env:PINTEREST_CLIENT_SECRET = "<App secret — portal Pinterest, botão Gerenciar>"',
    'node scripts/pinterest-auth.js',
    '```',
    '1. Abrir a URL que o script imprimir (logado na conta da marca) → **Aprovar**;',
    '2. Colar o comando `gh secret set PINTEREST_REFRESH_TOKEN ...` que o script imprime pronto;',
    '3. Fechar esta issue.',
    '',
    'Alternativa: abrir o Claude Code na pasta FINMOOVI e pedir "renove o token do Pinterest".',
    'Guia completo: `docs/HISTORICO-IMPLEMENTACAO.md` (seção Pinterest).',
  ].join('\n');

  const res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ title, body, labels: ['manutencao'] }),
  });
  if (res.ok) console.log('🔔 Issue de renovação do token aberta (e-mail a caminho).');
  else console.error(`Aviso: falha ao abrir issue de renovação (${res.status}).`);
}

/**
 * Troca o refresh token por um access token novo (access tokens do Pinterest
 * expiram em ~30 dias — o refresh garante que a automação nunca morra).
 */
async function refreshAccessToken() {
  const basic = Buffer.from(`${PINTEREST_CLIENT_ID}:${PINTEREST_CLIENT_SECRET}`).toString('base64');
  const res = await fetch(`${PINTEREST_API_BASE}/oauth/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: PINTEREST_REFRESH_TOKEN,
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Refresh do token falhou (${res.status}): ${text}`);
  return JSON.parse(text).access_token;
}

/**
 * Parse frontmatter from a markdown file
 */
function parseFrontmatter(content) {
  // CRLF-safe (mesmo padrão do internal-linking)
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;

  const frontmatter = {};
  const lines = match[1].split('\n');

  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim();
    let value = line.slice(colonIndex + 1).trim();

    // Remove quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    frontmatter[key] = value;
  }

  return frontmatter;
}

/**
 * Generate Pinterest-optimized description (max 150 chars with hashtags)
 */
function generatePinDescription(title, category, tags) {
  // Hashtags base derivadas das keywords do nicho no config
  const hashtags = NICHE_KEYWORDS.slice(0, 4).map(k => `#${tagSlug(k)}`);

  // Hashtag específica da categoria do post
  if (category) {
    hashtags.unshift(`#${tagSlug(category)}`);
  }

  // Build description: title + hashtags, max 150 chars
  const hashtagStr = hashtags.slice(0, 3).join(' ');
  const maxTitleLength = 150 - hashtagStr.length - 3; // 3 for " | "

  let desc = title;
  if (desc.length > maxTitleLength) {
    desc = desc.slice(0, maxTitleLength - 3) + '...';
  }

  return `${desc} | ${hashtagStr}`;
}

/**
 * Get the full image URL for a post
 */
function getImageUrl(imagePath) {
  if (!imagePath) return null;
  if (imagePath.startsWith('http')) return imagePath;
  return `${SITE_URL}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
}

/**
 * Get the full post URL
 */
function getPostUrl(slug) {
  return `${SITE_URL}/posts/${slug}`;
}

/**
 * Publish a pin to Pinterest via API v5
 */
async function publishPin({ title, description, link, imageUrl, boardId }) {
  const body = {
    board_id: boardId,
    title: title.slice(0, 100), // Pinterest title max 100 chars
    description: description,
    link: link,
    media_source: {
      source_type: 'image_url',
      url: imageUrl,
    },
  };

  const response = await fetch(`${PINTEREST_API_BASE}/pins`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PINTEREST_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Pinterest API error ${response.status}: ${errorBody}`);
  }

  return await response.json();
}

/**
 * Main execution
 */
async function main() {
  console.log('=== Pinterest Auto-Publish ===\n');

  // Preferencial: refresh token → access token fresco a cada execução
  if (PINTEREST_REFRESH_TOKEN && PINTEREST_CLIENT_ID && PINTEREST_CLIENT_SECRET) {
    // Lembrete automático: issue no GitHub (→ e-mail) quando faltar ≤7 dias
    const daysLeft = refreshTokenDaysLeft();
    if (daysLeft !== null) {
      console.log(`🗓️  Refresh token válido por mais ~${daysLeft} dia(s).`);
      if (daysLeft <= 7) await openRenewalIssueIfNeeded(daysLeft);
    }
    try {
      PINTEREST_ACCESS_TOKEN = await refreshAccessToken();
      console.log('🔑 Access token renovado via refresh token.');
    } catch (err) {
      console.error(`❌ ${err.message}`);
      console.error('   Refresh token expirado/revogado? Rode scripts/pinterest-auth.js de novo e atualize o secret PINTEREST_REFRESH_TOKEN.');
      process.exit(1);
    }
  }

  // Validate env vars
  if (!PINTEREST_ACCESS_TOKEN) {
    console.log('⏭️  Credenciais Pinterest não configuradas (PINTEREST_REFRESH_TOKEN+CLIENT_ID+CLIENT_SECRET ou PINTEREST_ACCESS_TOKEN) — pulando publicação.');
    process.exit(0);
  }
  if (!PINTEREST_BOARD_ID) {
    console.log('⏭️  PINTEREST_BOARD_ID não configurado — pulando publicação no Pinterest.');
    process.exit(0);
  }

  // Load tracking data
  let published = [];
  try {
    const raw = readFileSync(TRACKING_FILE, 'utf-8');
    published = JSON.parse(raw);
  } catch {
    console.log('No tracking file found, starting fresh.');
    published = [];
  }

  const publishedSlugs = new Set(published.map(p => p.slug));

  // Get recent posts (last 14 days)
  const now = new Date();
  const cutoffDate = new Date(now.getTime() - DAYS_LOOKBACK * 24 * 60 * 60 * 1000);

  const files = readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));
  const recentPosts = [];

  for (const file of files) {
    try {
      const content = readFileSync(join(POSTS_DIR, file), 'utf-8');
      const fm = parseFrontmatter(content);
      if (!fm) continue;

      const publishedAt = fm.publishedAt ? new Date(fm.publishedAt) : null;
      if (!publishedAt || publishedAt < cutoffDate) continue;

      // Only Portuguese posts (or posts without locale specified)
      if (fm.locale && fm.locale !== 'pt') continue;

      const slug = file.replace('.md', '');
      if (publishedSlugs.has(slug)) continue;

      // Must have an image
      const image = fm.image || fm.heroImage;
      if (!image) {
        console.log(`SKIP: ${slug} - no image`);
        continue;
      }

      recentPosts.push({
        slug,
        title: fm.title || slug,
        description: fm.description || '',
        category: fm.category || '',
        tags: fm.tags || '',
        image,
        publishedAt,
      });
    } catch (err) {
      console.error(`Error reading ${file}: ${err.message}`);
    }
  }

  // Sort by most recent first
  recentPosts.sort((a, b) => b.publishedAt - a.publishedAt);

  console.log(`Found ${recentPosts.length} unpublished recent posts.\n`);

  if (recentPosts.length === 0) {
    console.log('Nothing to publish. Done.');
    return;
  }

  // Publish up to MAX_PINS_PER_RUN
  const toPublish = recentPosts.slice(0, MAX_PINS_PER_RUN);
  let successCount = 0;

  for (const post of toPublish) {
    const pinDescription = generatePinDescription(post.title, post.category, post.tags);
    const imageUrl = getImageUrl(post.image);
    const postUrl = getPostUrl(post.slug);

    console.log(`Publishing: ${post.title}`);
    console.log(`  URL: ${postUrl}`);
    console.log(`  Image: ${imageUrl}`);
    console.log(`  Description: ${pinDescription}`);

    try {
      const result = await publishPin({
        title: post.title,
        description: pinDescription,
        link: postUrl,
        imageUrl,
        boardId: PINTEREST_BOARD_ID,
      });

      published.push({
        slug: post.slug,
        title: post.title,
        pinId: result.id || 'unknown',
        publishedAt: new Date().toISOString(),
        postUrl,
      });

      successCount++;
      console.log(`  SUCCESS: Pin created (ID: ${result.id || 'unknown'})\n`);
    } catch (err) {
      console.error(`  FAILED: ${err.message}\n`);
      // Continue processing other posts
    }
  }

  // Save tracking data
  writeFileSync(TRACKING_FILE, JSON.stringify(published, null, 2), 'utf-8');
  console.log(`\n=== Done: ${successCount}/${toPublish.length} pins published ===`);
  console.log(`Tracking saved to ${TRACKING_FILE}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
