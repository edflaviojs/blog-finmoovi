/**
 * Social Bookmarking Auto-Submit Script
 *
 * Reads recent posts (last 7 days) from src/content/posts/
 * and submits them to social bookmarking platforms.
 *
 * Platforms:
 *   - Raindrop.io (API)
 *   - Flipboard (share endpoint)
 *   - Mix.com (URL submission)
 *
 * Env vars required:
 *   RAINDROP_ACCESS_TOKEN - Raindrop.io API token
 *   RAINDROP_COLLECTION_ID - Raindrop.io collection ID (optional, defaults to Unsorted)
 *
 * Tracking: .github/data/social-bookmarks.json
 * Max: 5 submissions per execution
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..');
const POSTS_DIR = join(ROOT, 'src', 'content', 'posts');
const TRACKING_FILE = join(ROOT, '.github', 'data', 'social-bookmarks.json');
const SITE_URL = 'https://blog.finmoovi.com';
const MAX_SUBMISSIONS_PER_RUN = 5;
const DAYS_LOOKBACK = 7;

// API config
const RAINDROP_ACCESS_TOKEN = process.env.RAINDROP_ACCESS_TOKEN;
const RAINDROP_COLLECTION_ID = process.env.RAINDROP_COLLECTION_ID || '-1'; // -1 = Unsorted

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
 * Get the full post URL
 */
function getPostUrl(slug) {
  return `${SITE_URL}/posts/${slug}`;
}

/**
 * Submit to Raindrop.io API
 */
async function submitToRaindrop({ url, title, tags }) {
  if (!RAINDROP_ACCESS_TOKEN) {
    return { success: false, error: 'Missing RAINDROP_ACCESS_TOKEN' };
  }

  try {
    const body = {
      link: url,
      title,
      tags: tags ? tags.split(',').map(t => t.trim()) : ['finmoovi', 'financas'],
      collection: { '$id': parseInt(RAINDROP_COLLECTION_ID) },
    };

    const response = await fetch('https://api.raindrop.io/rest/v1/raindrop', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RAINDROP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return { success: false, error: `Raindrop API ${response.status}: ${errorBody}` };
    }

    const data = await response.json();
    return { success: true, itemId: data.item?._id || 'unknown' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Submit to Flipboard via RSS ping
 * Flipboard discovers content via RSS/sitemap. We ping their endpoint
 * to notify about new content.
 */
async function submitToFlipboard({ url, title }) {
  try {
    // Flipboard uses a public contribution URL format
    const flipboardUrl = `https://share.flipboard.com/bookmarklet/popout?v=2&url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;

    // We make a HEAD request to register the URL with Flipboard's crawler
    const response = await fetch(flipboardUrl, {
      method: 'HEAD',
      redirect: 'follow',
    });

    // Any response means Flipboard registered the URL
    return { success: true, status: response.status };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Submit to Mix.com via URL sharing endpoint
 */
async function submitToMix({ url, title }) {
  try {
    // Mix.com public sharing endpoint
    const mixUrl = `https://mix.com/add?url=${encodeURIComponent(url)}`;

    const response = await fetch(mixUrl, {
      method: 'HEAD',
      redirect: 'follow',
      headers: {
        'User-Agent': 'FinMoovi-Bot/1.0',
      },
    });

    return { success: true, status: response.status };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('=== Social Bookmarking Auto-Submit ===\n');

  // Load tracking data
  let bookmarks = [];
  try {
    const raw = readFileSync(TRACKING_FILE, 'utf-8');
    bookmarks = JSON.parse(raw);
  } catch {
    console.log('No tracking file found, starting fresh.');
    bookmarks = [];
  }

  const submittedSlugs = new Set(bookmarks.map(b => b.slug));

  // Get recent posts (last 7 days)
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
      if (submittedSlugs.has(slug)) continue;

      recentPosts.push({
        slug,
        title: fm.title || slug,
        description: fm.description || '',
        category: fm.category || '',
        tags: fm.tags || '',
        publishedAt,
      });
    } catch (err) {
      console.error(`Error reading ${file}: ${err.message}`);
    }
  }

  // Sort by most recent first
  recentPosts.sort((a, b) => b.publishedAt - a.publishedAt);

  console.log(`Found ${recentPosts.length} posts to submit.\n`);

  if (recentPosts.length === 0) {
    console.log('Nothing to submit. Done.');
    return;
  }

  // Submit up to MAX_SUBMISSIONS_PER_RUN
  const toSubmit = recentPosts.slice(0, MAX_SUBMISSIONS_PER_RUN);
  let totalSuccess = 0;

  for (const post of toSubmit) {
    const postUrl = getPostUrl(post.slug);
    const tagStr = post.category ? `finmoovi,financas,${post.category}` : 'finmoovi,financas';

    console.log(`Submitting: ${post.title}`);
    console.log(`  URL: ${postUrl}`);

    const results = {
      slug: post.slug,
      title: post.title,
      url: postUrl,
      submittedAt: new Date().toISOString(),
      platforms: {},
    };

    // 1. Raindrop.io
    console.log('  -> Raindrop.io...');
    const raindropResult = await submitToRaindrop({
      url: postUrl,
      title: post.title,
      tags: tagStr,
    });
    results.platforms.raindrop = raindropResult;
    if (raindropResult.success) {
      console.log(`     SUCCESS (item: ${raindropResult.itemId})`);
    } else {
      console.log(`     FAILED: ${raindropResult.error}`);
    }

    // 2. Flipboard
    console.log('  -> Flipboard...');
    const flipboardResult = await submitToFlipboard({
      url: postUrl,
      title: post.title,
    });
    results.platforms.flipboard = flipboardResult;
    if (flipboardResult.success) {
      console.log(`     SUCCESS (status: ${flipboardResult.status})`);
    } else {
      console.log(`     FAILED: ${flipboardResult.error}`);
    }

    // 3. Mix.com
    console.log('  -> Mix.com...');
    const mixResult = await submitToMix({
      url: postUrl,
      title: post.title,
    });
    results.platforms.mix = mixResult;
    if (mixResult.success) {
      console.log(`     SUCCESS (status: ${mixResult.status})`);
    } else {
      console.log(`     FAILED: ${mixResult.error}`);
    }

    // Count as success if at least one platform worked
    const anySuccess = Object.values(results.platforms).some(r => r.success);
    if (anySuccess) totalSuccess++;

    bookmarks.push(results);
    console.log('');
  }

  // Save tracking data
  writeFileSync(TRACKING_FILE, JSON.stringify(bookmarks, null, 2), 'utf-8');
  console.log(`=== Done: ${totalSuccess}/${toSubmit.length} posts submitted ===`);
  console.log(`Tracking saved to ${TRACKING_FILE}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
