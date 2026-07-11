/**
 * Pinterest Auto-Publish Script
 *
 * Reads recent posts (last 14 days) from src/content/posts/
 * and publishes them as pins via Pinterest API v5.
 *
 * Env vars required:
 *   PINTEREST_ACCESS_TOKEN - Pinterest API access token
 *   PINTEREST_BOARD_ID - Target board ID
 *
 * Tracking: .github/data/pinterest-published.json
 * Max: 3 pins per execution
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..');
const POSTS_DIR = join(ROOT, 'src', 'content', 'posts');
const TRACKING_FILE = join(ROOT, '.github', 'data', 'pinterest-published.json');
const SITE_URL = 'https://blog.finmoovi.com';
const MAX_PINS_PER_RUN = 3;
const DAYS_LOOKBACK = 14;

// Pinterest API config
const PINTEREST_API_BASE = 'https://api.pinterest.com/v5';
const PINTEREST_ACCESS_TOKEN = process.env.PINTEREST_ACCESS_TOKEN;
const PINTEREST_BOARD_ID = process.env.PINTEREST_BOARD_ID;

/**
 * Parse frontmatter from a markdown file
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
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
  const hashtags = [
    '#financaspessoais',
    '#educacaofinanceira',
    '#dinheiro',
    '#economia',
  ];

  // Add category-specific hashtag
  const categoryHashtags = {
    orcamento: '#orcamento',
    investimentos: '#investimentos',
    dicas: '#dicasfinanceiras',
    cotacoes: '#cotacoes',
    ferramentas: '#ferramentas',
    glossario: '#glossariofinanceiro',
  };

  if (category && categoryHashtags[category]) {
    hashtags.unshift(categoryHashtags[category]);
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

  // Validate env vars
  if (!PINTEREST_ACCESS_TOKEN) {
    console.log('⏭️  PINTEREST_ACCESS_TOKEN não configurado — pulando publicação no Pinterest (app pendente de aprovação).');
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
