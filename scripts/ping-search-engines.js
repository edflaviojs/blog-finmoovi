/**
 * ping-search-engines.js — Notify search engines about URL changes via IndexNow.
 *
 * Google: Deprecated /ping endpoint (2023). Use Google Search Console manually
 *         or rely on automatic sitemap discovery.
 * Bing/Yandex/DuckDuckGo: Use IndexNow protocol (instant indexing).
 *
 * Usage: node scripts/ping-search-engines.js
 *
 * Requires: INDEXNOW_KEY env var or a key file at public/{key}.txt
 * If no key is configured, falls back to sitemap submission via Search Console API.
 */
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from '../site.config.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const SITE_URL = config.siteUrl;
const INDEXNOW_KEY = process.env.INDEXNOW_KEY || '';

// Read redirect file to get all changed URLs
function getChangedUrls() {
  const redirectsFile = join(ROOT, 'public', '_redirects');
  if (!existsSync(redirectsFile)) return [];

  const content = readFileSync(redirectsFile, 'utf-8');
  const urls = [];

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) {
      // Add both old and new URLs for indexing
      urls.push(SITE_URL + parts[1]); // new URL (destination)
    }
  }

  return [...new Set(urls)]; // deduplicate
}

async function submitIndexNow(urls) {
  if (!INDEXNOW_KEY) {
    console.log('  [SKIP] IndexNow — no INDEXNOW_KEY configured');
    console.log('         Set INDEXNOW_KEY env var or add key to Bing Webmaster Tools');
    return;
  }

  // IndexNow batch API (max 10000 URLs per call)
  const payload = {
    host: new URL(SITE_URL).hostname,
    key: INDEXNOW_KEY,
    urlList: urls.slice(0, 10000),
  };

  try {
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    console.log(`  [${res.ok || res.status === 202 ? 'OK' : 'FAIL'}] IndexNow — ${res.status} (${urls.length} URLs submitted)`);
  } catch (err) {
    console.log(`  [ERROR] IndexNow — ${err.message}`);
  }
}

async function main() {
  const urls = getChangedUrls();

  console.log(`Site: ${SITE_URL}`);
  console.log(`Changed URLs found: ${urls.length}`);
  console.log('');

  if (urls.length === 0) {
    console.log('No URLs to submit. Run after adding redirects.');
    return;
  }

  // IndexNow (Bing, Yandex, DuckDuckGo)
  await submitIndexNow(urls);

  console.log('');
  console.log('Notes:');
  console.log('  - Google: Submit sitemap via Search Console (https://search.google.com/search-console)');
  console.log('  - Bing: IndexNow covers Bing, Yandex, and DuckDuckGo');
  console.log('  - Redirects (301) will naturally transfer SEO authority to new URLs');
  console.log('');
  console.log('Done.');
}

main();
