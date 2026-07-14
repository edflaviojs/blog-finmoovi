import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { SITE_URL, MAIN_DOMAIN, userAgent, config } from './lib/site.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const POSTS_DIR = path.join(ROOT, 'src', 'content', 'posts');
const PINGBACKS_FILE = path.join(ROOT, '.github', 'data', 'sent-pingbacks.json');
const UA = userAgent('Pingback');
const DAYS_THRESHOLD = 7;

function loadSentPingbacks() {
  try {
    const raw = fs.readFileSync(PINGBACKS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveSentPingbacks(data) {
  fs.writeFileSync(PINGBACKS_FILE, JSON.stringify(data, null, 2) + '\n', 'utf-8');
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

      // Determine locale and slug for canonical URL
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

      posts.push({
        file,
        sourceUrl,
        content,
      });
    } catch (err) {
      console.warn(`Warning: Could not parse ${file}: ${err.message}`);
    }
  }

  return posts;
}

function extractExternalLinks(markdownContent) {
  const urlRegex = /https?:\/\/[^\s\)\]>"'`]+/g;
  const matches = markdownContent.match(urlRegex) || [];

  // Filter out internal links and common non-article URLs
  return [...new Set(matches)].filter(url => {
    try {
      const parsed = new URL(url);
      // Exclude internal links
      if (parsed.hostname.includes(MAIN_DOMAIN)) return false;
      // Exclude common non-content URLs
      if (parsed.hostname.includes('github.com')) return false;
      if (parsed.hostname.includes('googleapis.com')) return false;
      if (parsed.pathname.match(/\.(png|jpg|jpeg|gif|svg|css|js|woff|ico)$/i)) return false;
      return true;
    } catch {
      return false;
    }
  });
}

async function discoverPingbackEndpoint(targetUrl) {
  try {
    const response = await fetch(targetUrl, {
      method: 'HEAD',
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(10000),
    });

    // Check X-Pingback header
    const xPingback = response.headers.get('x-pingback');
    if (xPingback) return xPingback;

    // Check Link header for rel="pingback"
    const linkHeader = response.headers.get('link');
    if (linkHeader) {
      const match = linkHeader.match(/<([^>]+)>;\s*rel=["']?pingback["']?/i);
      if (match) return match[1];
    }

    // If HEAD didn't reveal it, try GET and parse HTML for <link rel="pingback">
    const getResponse = await fetch(targetUrl, {
      method: 'GET',
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(15000),
    });

    if (!getResponse.ok) return null;

    const html = await getResponse.text();
    const linkMatch = html.match(/<link[^>]+rel=["']pingback["'][^>]+href=["']([^"']+)["']/i);
    if (linkMatch) return linkMatch[1];

    const linkMatchAlt = html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']pingback["']/i);
    if (linkMatchAlt) return linkMatchAlt[1];

    return null;
  } catch {
    return null;
  }
}

function buildPingbackXml(sourceUrl, targetUrl) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<methodCall>
  <methodName>pingback.ping</methodName>
  <params>
    <param><value><string>${sourceUrl}</string></value></param>
    <param><value><string>${targetUrl}</string></value></param>
  </params>
</methodCall>`;
}

async function sendPingback(endpoint, sourceUrl, targetUrl) {
  const xml = buildPingbackXml(sourceUrl, targetUrl);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/xml',
      'User-Agent': UA,
    },
    body: xml,
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const responseText = await response.text();

  // Check for XML-RPC fault
  if (responseText.includes('<fault>')) {
    const faultMatch = responseText.match(/<string>([^<]+)<\/string>/);
    throw new Error(`XML-RPC fault: ${faultMatch ? faultMatch[1] : 'unknown'}`);
  }

  return true;
}

async function main() {
  console.log('=== Pingback Sender Script ===\n');

  const sentPingbacks = loadSentPingbacks();
  const sentKeys = new Set(sentPingbacks.map(p => `${p.source}|${p.target}`));

  const recentPosts = getRecentPosts();
  console.log(`Found ${recentPosts.length} recent posts (last ${DAYS_THRESHOLD} days).\n`);

  if (recentPosts.length === 0) {
    console.log('No recent posts found. Exiting.');
    return;
  }

  let totalLinks = 0;
  let sentCount = 0;
  let skippedCount = 0;

  for (const post of recentPosts) {
    const links = extractExternalLinks(post.content);
    if (links.length === 0) continue;

    console.log(`Processing: ${post.file} (${links.length} external links)`);

    for (const targetUrl of links) {
      const key = `${post.sourceUrl}|${targetUrl}`;
      if (sentKeys.has(key)) {
        skippedCount++;
        continue;
      }

      totalLinks++;

      try {
        const endpoint = await discoverPingbackEndpoint(targetUrl);
        if (!endpoint) {
          console.log(`  [skip] No pingback endpoint: ${targetUrl}`);
          // Record as attempted so we don't retry
          sentPingbacks.push({
            source: post.sourceUrl,
            target: targetUrl,
            status: 'no-endpoint',
            sentAt: new Date().toISOString(),
          });
          sentKeys.add(key);
          continue;
        }

        console.log(`  [send] Pingback to ${endpoint} for ${targetUrl}`);
        await sendPingback(endpoint, post.sourceUrl, targetUrl);

        sentPingbacks.push({
          source: post.sourceUrl,
          target: targetUrl,
          endpoint,
          status: 'sent',
          sentAt: new Date().toISOString(),
        });
        sentKeys.add(key);
        sentCount++;
        console.log(`  [ok] Pingback sent successfully.`);
      } catch (err) {
        console.error(`  [error] Failed for ${targetUrl}: ${err.message}`);
        sentPingbacks.push({
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

  saveSentPingbacks(sentPingbacks);
  console.log(`\nDone. Processed ${totalLinks} links. Sent: ${sentCount}, Skipped (already sent): ${skippedCount}.`);
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
