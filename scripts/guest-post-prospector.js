import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config, MAIN_DOMAIN } from './lib/site.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OPPORTUNITIES_FILE = path.join(ROOT, '.github', 'data', 'guest-post-opportunities.json');

const MAX_RESULTS_PER_QUERY = 5;
const MAX_TOTAL = 30;
const DELAY_MIN_MS = 5000;
const DELAY_MAX_MS = 8000;

// Queries derivadas do nicho no config (fórmulas clássicas de prospecção de guest post)
const QUERIES = [
  { query: `${config.content.niche.pt} escreva para nós`, language: 'pt' },
  { query: `${config.content.niche.en} write for us`, language: 'en' },
  { query: `${config.content.niche.es} escribe para nosotros`, language: 'es' },
  { query: `${config.content.niche.pt} colabore conosco`, language: 'pt' },
  { query: `${config.content.niche.en} blog guest post`, language: 'en' },
  { query: `${config.content.niche.en} contribute`, language: 'en' },
];

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0',
];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomDelay() {
  return DELAY_MIN_MS + Math.random() * (DELAY_MAX_MS - DELAY_MIN_MS);
}

function randomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function loadOpportunities() {
  try {
    const raw = fs.readFileSync(OPPORTUNITIES_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveOpportunities(data) {
  const dir = path.dirname(OPPORTUNITIES_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(OPPORTUNITIES_FILE, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

function extractResultsFromHtml(html, maxResults) {
  const results = [];

  // Extract search result links and snippets from Google HTML
  // Pattern: <a href="/url?q=ACTUAL_URL&...">...<h3>TITLE</h3>...</a>
  const linkPattern = /<a[^>]+href="\/url\?q=([^&"]+)[^"]*"[^>]*>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>/gi;
  let match;

  while ((match = linkPattern.exec(html)) !== null && results.length < maxResults) {
    try {
      const url = decodeURIComponent(match[1]);
      const title = match[2].replace(/<[^>]+>/g, '').trim();

      // Skip Google internal URLs
      if (url.includes('google.com')) continue;
      if (url.includes('youtube.com')) continue;
      if (!url.startsWith('http')) continue;

      results.push({ url, title, snippet: '' });
    } catch {
      continue;
    }
  }

  // If first pattern didn't work, try alternative pattern
  if (results.length === 0) {
    const altPattern = /<div class="[^"]*"[^>]*><a href="(https?:\/\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    while ((match = altPattern.exec(html)) !== null && results.length < maxResults) {
      try {
        const url = match[1];
        const title = match[2].replace(/<[^>]+>/g, '').trim();

        if (url.includes('google.com')) continue;
        if (url.includes('youtube.com')) continue;
        if (!title) continue;

        results.push({ url, title, snippet: '' });
      } catch {
        continue;
      }
    }
  }

  // Try to extract snippets
  const snippetPattern = /<span[^>]*class="[^"]*"[^>]*>([\s\S]*?)<\/span>/gi;
  const snippets = [];
  while ((match = snippetPattern.exec(html)) !== null) {
    const text = match[1].replace(/<[^>]+>/g, '').trim();
    if (text.length > 40 && text.length < 500) {
      snippets.push(text);
    }
  }

  // Assign snippets to results (best effort)
  for (let i = 0; i < results.length && i < snippets.length; i++) {
    results[i].snippet = snippets[i];
  }

  return results;
}

async function searchGoogle(query) {
  const encodedQuery = encodeURIComponent(query);
  const url = `https://www.google.com/search?q=${encodedQuery}&num=10&hl=pt-BR`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': randomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7,es;q=0.6',
        'Accept-Encoding': 'identity',
        'Cache-Control': 'no-cache',
      },
      signal: AbortSignal.timeout(20000),
      redirect: 'follow',
    });

    if (!response.ok) {
      console.warn(`  [warn] Google returned HTTP ${response.status} for query: "${query}"`);
      return [];
    }

    const html = await response.text();

    // Check for CAPTCHA / block
    if (html.includes('unusual traffic') || html.includes('captcha')) {
      console.warn(`  [warn] Google CAPTCHA detected. Skipping query: "${query}"`);
      return [];
    }

    return extractResultsFromHtml(html, MAX_RESULTS_PER_QUERY);
  } catch (err) {
    console.error(`  [error] Search failed for "${query}": ${err.message}`);
    return [];
  }
}

function extractSiteName(url) {
  try {
    const parsed = new URL(url);
    // Remove www. and get domain
    let hostname = parsed.hostname.replace(/^www\./, '');
    // Capitalize first letter of each part
    return hostname
      .split('.')
      .slice(0, -1)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ') || hostname;
  } catch {
    return url;
  }
}

async function main() {
  console.log('=== Guest Post Prospector ===\n');

  const opportunities = loadOpportunities();
  const existingUrls = new Set(opportunities.map(o => o.siteUrl));
  const today = new Date().toISOString().split('T')[0];

  let totalFound = 0;
  let newCount = 0;

  for (const { query, language } of QUERIES) {
    if (totalFound >= MAX_TOTAL) break;

    console.log(`Searching: "${query}" (${language})`);

    const results = await searchGoogle(query);
    console.log(`  Found ${results.length} results.`);

    for (const result of results) {
      if (totalFound >= MAX_TOTAL) break;

      totalFound++;

      // Skip if already tracked
      if (existingUrls.has(result.url)) {
        console.log(`  [skip] Already tracked: ${result.url}`);
        continue;
      }

      // Skip o próprio domínio
      if (result.url.includes(MAIN_DOMAIN)) continue;

      const opportunity = {
        foundAt: today,
        siteUrl: result.url,
        siteName: result.title || extractSiteName(result.url),
        language,
        query,
        status: 'pending',
        pitchSent: false,
      };

      opportunities.push(opportunity);
      existingUrls.add(result.url);
      newCount++;
      console.log(`  [new] ${opportunity.siteName} - ${result.url}`);
    }

    // Delay between queries to avoid rate limiting
    if (totalFound < MAX_TOTAL) {
      const delay = randomDelay();
      console.log(`  Waiting ${Math.round(delay / 1000)}s before next query...\n`);
      await sleep(delay);
    }
  }

  saveOpportunities(opportunities);
  console.log(`\nDone. Total results processed: ${totalFound}. New opportunities: ${newCount}.`);
  console.log(`Total opportunities tracked: ${opportunities.length}.`);
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
