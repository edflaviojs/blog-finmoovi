import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { SITE_URL, MAIN_DOMAIN, userAgent, config } from './lib/site.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const POSTS_DIR = path.join(ROOT, 'src', 'content', 'posts');
const WEBMENTIONS_FILE = path.join(ROOT, '.github', 'data', 'sent-webmentions.json');
const UA = `${userAgent('Webmention')} (${SITE_URL})`;
const DAYS_THRESHOLD = 7;
const MAX_SENDS = 10;
const DELAY_MS = 2000;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function loadSentWebmentions() {
  try {
    const raw = fs.readFileSync(WEBMENTIONS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveSentWebmentions(data) {
  const dir = path.dirname(WEBMENTIONS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(WEBMENTIONS_FILE, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

function getRecentPosts() {
  const now = new Date();
  const threshold = new Date(now.getTime() - DAYS_THRESHOLD * 24 * 60 * 60 * 1000);
  const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));
  const posts = [];

  for (const file of files) {
    try {
      const filePath = path.join(POSTS_DIR, file);
      const raw = fs.readFileSync(filePath, 'utf-8');
      const { data: frontmatter, content } = matter(raw);

      const publishedAt = frontmatter.publishedAt ? new Date(frontmatter.publishedAt) : null;
      if (!publishedAt || publishedAt < threshold) continue;

      let locale = frontmatter.locale || 'pt';
      let slug = file.replace(/\.md$/, '');
      if (slug.startsWith('en-')) {
        locale = 'en';
        slug = slug.replace(/^en-/, '');
      } else if (slug.startsWith('es-')) {
        locale = 'es';
        slug = slug.replace(/^es-/, '');
      }

      // Locale padrão NÃO tem prefixo na URL (prefixDefaultLocale: false)
      const sourceUrl = locale === config.defaultLocale
        ? `${SITE_URL}/posts/${slug}/`
        : `${SITE_URL}/${locale}/posts/${slug}/`;

      posts.push({ file, sourceUrl, content });
    } catch (err) {
      console.warn(`Warning: Could not parse ${file}: ${err.message}`);
    }
  }

  return posts;
}

function extractExternalLinks(markdownContent) {
  const urlRegex = /https?:\/\/[^\s\)\]>"'`]+/g;
  const matches = markdownContent.match(urlRegex) || [];

  return [...new Set(matches)].filter(url => {
    try {
      const parsed = new URL(url);
      if (parsed.hostname.includes(MAIN_DOMAIN)) return false;
      if (parsed.hostname.includes('github.com')) return false;
      if (parsed.hostname.includes('googleapis.com')) return false;
      if (parsed.pathname.match(/\.(png|jpg|jpeg|gif|svg|css|js|woff|ico)$/i)) return false;
      return true;
    } catch {
      return false;
    }
  });
}

async function discoverWebmentionEndpoint(targetUrl) {
  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': UA,
        'Accept': 'text/html',
      },
      signal: AbortSignal.timeout(15000),
      redirect: 'follow',
    });

    // Check Link header for rel="webmention"
    const linkHeader = response.headers.get('link');
    if (linkHeader) {
      const match = linkHeader.match(/<([^>]+)>;\s*rel=["']?webmention["']?/i);
      if (match) return match[1];
      // Also check reversed order
      const matchAlt = linkHeader.match(/<([^>]+)>;\s*rel=["']?[^"']*webmention[^"']*["']?/i);
      if (matchAlt) return matchAlt[1];
    }

    if (!response.ok) return null;

    const html = await response.text();

    // Check <link rel="webmention" href="...">
    const linkMatch = html.match(/<link[^>]+rel=["']webmention["'][^>]+href=["']([^"']+)["']/i);
    if (linkMatch) return linkMatch[1];

    // Check reversed attribute order
    const linkMatchAlt = html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']webmention["']/i);
    if (linkMatchAlt) return linkMatchAlt[1];

    // Check <a rel="webmention" href="...">
    const aMatch = html.match(/<a[^>]+rel=["']webmention["'][^>]+href=["']([^"']+)["']/i);
    if (aMatch) return aMatch[1];

    const aMatchAlt = html.match(/<a[^>]+href=["']([^"']+)["'][^>]+rel=["']webmention["']/i);
    if (aMatchAlt) return aMatchAlt[1];

    return null;
  } catch {
    return null;
  }
}

function resolveEndpointUrl(endpoint, targetUrl) {
  try {
    // If endpoint is absolute, return as-is
    new URL(endpoint);
    return endpoint;
  } catch {
    // Relative URL - resolve against target
    try {
      return new URL(endpoint, targetUrl).href;
    } catch {
      return null;
    }
  }
}

async function sendWebmention(endpoint, sourceUrl, targetUrl) {
  const body = new URLSearchParams({ source: sourceUrl, target: targetUrl });

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': UA,
    },
    body: body.toString(),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status}: ${text.slice(0, 200)}`);
  }

  return true;
}

async function main() {
  console.log('=== Webmention Sender Script ===\n');

  const sentWebmentions = loadSentWebmentions();
  const sentKeys = new Set(sentWebmentions.map(w => `${w.source}|${w.target}`));

  const recentPosts = getRecentPosts();
  console.log(`Found ${recentPosts.length} recent posts (last ${DAYS_THRESHOLD} days).\n`);

  if (recentPosts.length === 0) {
    console.log('No recent posts found. Exiting.');
    return;
  }

  let sentCount = 0;
  let skippedCount = 0;

  for (const post of recentPosts) {
    if (sentCount >= MAX_SENDS) break;

    const links = extractExternalLinks(post.content);
    if (links.length === 0) continue;

    console.log(`Processing: ${post.file} (${links.length} external links)`);

    for (const targetUrl of links) {
      if (sentCount >= MAX_SENDS) break;

      const key = `${post.sourceUrl}|${targetUrl}`;
      if (sentKeys.has(key)) {
        skippedCount++;
        continue;
      }

      try {
        console.log(`  [discover] Checking webmention endpoint: ${targetUrl}`);
        const rawEndpoint = await discoverWebmentionEndpoint(targetUrl);

        if (!rawEndpoint) {
          console.log(`  [skip] No webmention endpoint found.`);
          sentWebmentions.push({
            source: post.sourceUrl,
            target: targetUrl,
            status: 'no-endpoint',
            sentAt: new Date().toISOString(),
          });
          sentKeys.add(key);
          continue;
        }

        const endpoint = resolveEndpointUrl(rawEndpoint, targetUrl);
        if (!endpoint) {
          console.log(`  [skip] Could not resolve endpoint URL: ${rawEndpoint}`);
          continue;
        }

        console.log(`  [send] Webmention to ${endpoint}`);
        await sendWebmention(endpoint, post.sourceUrl, targetUrl);

        sentWebmentions.push({
          source: post.sourceUrl,
          target: targetUrl,
          endpoint,
          status: 'sent',
          sentAt: new Date().toISOString(),
        });
        sentKeys.add(key);
        sentCount++;
        console.log(`  [ok] Webmention sent successfully.`);

        // Delay between sends
        if (sentCount < MAX_SENDS) {
          await sleep(DELAY_MS);
        }
      } catch (err) {
        console.error(`  [error] Failed for ${targetUrl}: ${err.message}`);
        sentWebmentions.push({
          source: post.sourceUrl,
          target: targetUrl,
          status: 'error',
          error: err.message,
          sentAt: new Date().toISOString(),
        });
        sentKeys.add(key);
      }
    }
  }

  saveSentWebmentions(sentWebmentions);
  console.log(`\nDone. Sent: ${sentCount}, Skipped (already processed): ${skippedCount}.`);
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
