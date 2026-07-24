/**
 * ping-search-engines.js — Notify Google and Bing about sitemap updates.
 * Run after slug renames or major content changes.
 *
 * Usage: node scripts/ping-search-engines.js
 */
import { config } from '../site.config.ts';

const SITEMAP_URL = `${config.siteUrl}/sitemap-index.xml`;

const endpoints = [
  `https://www.google.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`,
  `https://www.bing.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`,
];

async function main() {
  console.log(`Pinging search engines with sitemap: ${SITEMAP_URL}`);
  console.log('');

  for (const url of endpoints) {
    try {
      const res = await fetch(url);
      console.log(`  [${res.ok ? 'OK' : 'FAIL'}] ${url.split('?')[0]} — ${res.status}`);
    } catch (err) {
      console.log(`  [ERROR] ${url.split('?')[0]} — ${err.message}`);
    }
  }

  console.log('');
  console.log('Done. Search engines will recrawl updated URLs within 24-48h.');
}

main();
