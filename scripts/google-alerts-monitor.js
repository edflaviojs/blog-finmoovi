/**
 * Google Alerts Monitor - Phase 4 Backlinks
 *
 * Monitors Google for new publications about financial topics.
 * Finds opportunities for comments, social shares, and outreach.
 *
 * Usage: node scripts/google-alerts-monitor.js
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { BLOG_HOST, NICHE_KEYWORDS } from './lib/site.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

// Queries derivadas das keywords do nicho no config (mesmo tamanho de pool: 6)
const YEAR = new Date().getFullYear();
const QUERIES = [
  ...NICHE_KEYWORDS.slice(0, 4).map(k => `"${k}"`),
  `"${NICHE_KEYWORDS[0]}" dicas ${YEAR}`,
  `"${NICHE_KEYWORDS[1] || NICHE_KEYWORDS[0]}" ${YEAR}`,
];

const MAX_RESULTS_PER_QUERY = 5;
const MAX_TOTAL_RESULTS = 30;
const MAX_AGE_DAYS = 30;
const DELAY_MIN = 5000;
const DELAY_MAX = 8000;

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

// Paths
const OUTPUT_DIR = join(ROOT, '.github', 'data');
const OUTPUT_PATH = join(OUTPUT_DIR, 'google-alerts-results.json');

// Own domain to exclude from results
const OWN_DOMAIN = BLOG_HOST;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomDelay() {
  return DELAY_MIN + Math.random() * (DELAY_MAX - DELAY_MIN);
}

function loadExistingResults() {
  if (!existsSync(OUTPUT_PATH)) return [];
  try {
    const raw = readFileSync(OUTPUT_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveResults(results) {
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2), 'utf-8');
}

function cleanOldResults(results) {
  const cutoff = Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  return results.filter(r => {
    const date = new Date(r.foundAt).getTime();
    return date >= cutoff;
  });
}

/**
 * Classify opportunity type based on URL and content
 */
function classifyOpportunity(url, title, snippet) {
  const lower = `${url} ${title} ${snippet}`.toLowerCase();

  // Blog-like URLs that likely have comments
  if (
    lower.includes('blog') ||
    lower.includes('artigo') ||
    lower.includes('post') ||
    url.includes('/blog/') ||
    url.includes('/artigos/')
  ) {
    return 'comment';
  }

  // News/media sites - good for social sharing
  if (
    lower.includes('noticia') ||
    lower.includes('news') ||
    lower.includes('revista') ||
    lower.includes('jornal') ||
    url.includes('uol.com') ||
    url.includes('globo.com') ||
    url.includes('folha.')
  ) {
    return 'share';
  }

  // Other finance blogs/sites - potential partnerships
  if (
    lower.includes('financ') ||
    lower.includes('invest') ||
    lower.includes('econom')
  ) {
    return 'outreach';
  }

  return 'share';
}

/**
 * Parse Google search results HTML to extract links
 */
function parseGoogleResults(html) {
  const results = [];

  // Match result blocks - Google wraps results in divs with links
  // Pattern: find <a href="/url?q=ACTUAL_URL&..."> followed by title text
  const linkRegex = /<a[^>]+href="\/url\?q=([^&"]+)[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    const url = decodeURIComponent(match[1]);
    const titleHtml = match[2];

    // Skip Google's own URLs and non-http
    if (!url.startsWith('http')) continue;
    if (url.includes('google.com')) continue;
    if (url.includes('youtube.com')) continue;
    if (url.includes(OWN_DOMAIN)) continue;

    // Clean title from HTML tags
    const title = titleHtml.replace(/<[^>]+>/g, '').trim();

    if (title && url) {
      results.push({ url, title });
    }
  }

  // Fallback: try alternate pattern for modern Google HTML
  if (results.length === 0) {
    const altRegex = /href="(https?:\/\/(?!www\.google)[^"]+)"[^>]*>([^<]+)</gi;
    while ((match = altRegex.exec(html)) !== null) {
      const url = match[1];
      const title = match[2].trim();

      if (url.includes('google.com')) continue;
      if (url.includes('youtube.com')) continue;
      if (url.includes(OWN_DOMAIN)) continue;
      if (!title || title.length < 5) continue;

      results.push({ url, title });
    }
  }

  // Extract snippets - text near results
  const snippetRegex = /<span[^>]*class="[^"]*"[^>]*>([^<]{30,200})<\/span>/gi;
  const snippets = [];
  while ((match = snippetRegex.exec(html)) !== null) {
    const text = match[1].replace(/<[^>]+>/g, '').trim();
    if (text.length > 30) {
      snippets.push(text);
    }
  }

  // Attach snippets to results
  results.forEach((r, i) => {
    r.snippet = snippets[i] || '';
  });

  return results;
}

async function searchGoogle(query) {
  // Google search with last 7 days filter (tbs=qdr:w)
  const params = new URLSearchParams({
    q: query,
    tbs: 'qdr:w',
    hl: 'pt-BR',
    gl: 'br',
    num: '10'
  });

  const url = `https://www.google.com/search?${params.toString()}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      'Cache-Control': 'no-cache'
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for query "${query}"`);
  }

  const html = await response.text();
  return parseGoogleResults(html);
}

async function main() {
  console.log('[Google Monitor] Starting...');
  console.log(`[Google Monitor] Running ${QUERIES.length} queries`);

  let existing = loadExistingResults();
  existing = cleanOldResults(existing);
  console.log(`[Google Monitor] ${existing.length} existing results (after cleanup)`);

  // Track existing URLs to avoid duplicates
  const existingUrls = new Set(existing.map(r => r.url));

  let newResults = [];

  for (let i = 0; i < QUERIES.length; i++) {
    const query = QUERIES[i];
    console.log(`\n[Google Monitor] Searching: "${query}"`);

    try {
      const results = await searchGoogle(query);
      console.log(`[Google Monitor] Got ${results.length} raw results`);

      let added = 0;

      for (const result of results) {
        if (added >= MAX_RESULTS_PER_QUERY) break;
        if (existingUrls.has(result.url)) continue;

        const type = classifyOpportunity(result.url, result.title, result.snippet);

        const entry = {
          foundAt: new Date().toISOString().split('T')[0],
          url: result.url,
          title: result.title.slice(0, 200),
          snippet: (result.snippet || '').slice(0, 300),
          query,
          type,
          actioned: false
        };

        newResults.push(entry);
        existingUrls.add(result.url);
        added++;
      }

      console.log(`[Google Monitor] Added ${added} new results for this query`);
    } catch (error) {
      console.error(`[Google Monitor] Error searching "${query}": ${error.message}`);
    }

    // Delay between requests
    if (i < QUERIES.length - 1) {
      const delay = randomDelay();
      console.log(`[Google Monitor] Waiting ${Math.round(delay)}ms...`);
      await sleep(delay);
    }
  }

  // Merge and cap at MAX_TOTAL_RESULTS
  const allResults = [...newResults, ...existing].slice(0, MAX_TOTAL_RESULTS);

  saveResults(allResults);

  console.log(`\n[Google Monitor] Done!`);
  console.log(`[Google Monitor] New results found: ${newResults.length}`);
  console.log(`[Google Monitor] Total saved: ${allResults.length}`);
}

main().catch(error => {
  console.error('[Google Monitor] Fatal error:', error.message);
  process.exit(1);
});
