/**
 * Brand Mention Monitor - FinMoovi Blog
 * Searches for unlinked brand mentions across the web.
 * Identifies outreach opportunities where FinMoovi is mentioned but not linked.
 *
 * Usage: node --import tsx scripts/mention-monitor.js
 *
 * Environment variables (optional):
 *   GOOGLE_API_KEY  - Google Custom Search API key
 *   GOOGLE_CSE_ID   - Google Custom Search Engine ID
 *
 * Falls back to Google scraping if API keys are not configured.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { BRAND_NAME, MAIN_DOMAIN, BLOG_HOST } from './lib/site.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// --- Configuration ---
const BRAND_TERMS = [BRAND_NAME, BRAND_NAME.toLowerCase()];
const SITE_DOMAIN = MAIN_DOMAIN;
const BLOG_DOMAIN = BLOG_HOST;
const MAX_RESULTS = 20;
const REQUEST_DELAY_MIN_MS = 3000;
const REQUEST_DELAY_MAX_MS = 5000;
const TIMEOUT_MS = 10000;
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Paths
const DATA_DIR = join(__dirname, '..', '.github', 'data');
const MENTIONS_FILE = join(DATA_DIR, 'brand-mentions.json');

// --- Helpers ---

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomDelay() {
  const ms = REQUEST_DELAY_MIN_MS + Math.random() * (REQUEST_DELAY_MAX_MS - REQUEST_DELAY_MIN_MS);
  return sleep(ms);
}

function extractContext(html, term) {
  const textOnly = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const idx = textOnly.toLowerCase().indexOf(term.toLowerCase());
  if (idx === -1) return '';
  const start = Math.max(0, idx - 80);
  const end = Math.min(textOnly.length, idx + term.length + 80);
  let context = textOnly.slice(start, end).trim();
  if (start > 0) context = '...' + context;
  if (end < textOnly.length) context = context + '...';
  return context;
}

function hasLinkToSite(html) {
  const escaped = (d) => d.replace(/\./g, '\\.');
  const linkPatterns = [
    new RegExp(`href\\s*=\\s*["'][^"']*${escaped(SITE_DOMAIN)}[^"']*["']`, 'i'),
    new RegExp(`href\\s*=\\s*["'][^"']*${escaped(BLOG_DOMAIN)}[^"']*["']`, 'i'),
  ];
  return linkPatterns.some((pattern) => pattern.test(html));
}

function extractTitle(html) {
  const match = html.match(/<title[^>]*>(.*?)<\/title>/is);
  if (match) {
    return match[1].replace(/<[^>]+>/g, '').trim().slice(0, 200);
  }
  return '';
}

// --- Google Custom Search API ---

async function searchViaAPI(apiKey, cseId) {
  log('Using Google Custom Search API...');
  const results = [];
  const query = `${BRAND_NAME.toLowerCase()} -site:${SITE_DOMAIN} -site:github.com`;

  // dateRestrict=w1 limits to past week
  const url = new URL('https://www.googleapis.com/customsearch/v1');
  url.searchParams.set('key', apiKey);
  url.searchParams.set('cx', cseId);
  url.searchParams.set('q', query);
  url.searchParams.set('dateRestrict', 'w1');
  url.searchParams.set('num', String(Math.min(MAX_RESULTS, 10)));

  try {
    const response = await fetch(url.toString(), {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      log(`API Error: ${response.status} ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    const items = data.items || [];
    log(`API returned ${items.length} results`);

    for (const item of items.slice(0, MAX_RESULTS)) {
      results.push({
        url: item.link,
        title: item.title || '',
        snippet: item.snippet || '',
      });
    }
  } catch (err) {
    log(`API request failed: ${err.message}`);
  }

  // If we need more results and there's a second page
  if (results.length < MAX_RESULTS) {
    try {
      url.searchParams.set('start', '11');
      await randomDelay();
      const response = await fetch(url.toString(), {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (response.ok) {
        const data = await response.json();
        const items = data.items || [];
        for (const item of items.slice(0, MAX_RESULTS - results.length)) {
          results.push({
            url: item.link,
            title: item.title || '',
            snippet: item.snippet || '',
          });
        }
      }
    } catch (err) {
      log(`API page 2 failed: ${err.message}`);
    }
  }

  return results;
}

// --- Google Scraping Fallback ---

async function searchViaFallback() {
  log('Using Google scraping fallback (no API key configured)...');
  const results = [];
  const query = `${BRAND_NAME.toLowerCase()} -site:${SITE_DOMAIN} -site:github.com`;
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&tbs=qdr:w&num=${MAX_RESULTS}`;

  try {
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      log(`Google scraping failed: ${response.status}`);
      return [];
    }

    const html = await response.text();

    // Parse search results - Google uses various patterns
    // Pattern 1: <a href="/url?q=URL&...">
    const urlPattern = /href="\/url\?q=(https?:\/\/[^&"]+)/g;
    let match;
    const seenUrls = new Set();

    while ((match = urlPattern.exec(html)) !== null && results.length < MAX_RESULTS) {
      const decodedUrl = decodeURIComponent(match[1]);
      // Skip Google/YouTube/cache URLs
      if (
        decodedUrl.includes('google.com') ||
        decodedUrl.includes('youtube.com') ||
        decodedUrl.includes('webcache.') ||
        decodedUrl.includes(SITE_DOMAIN) ||
        decodedUrl.includes('github.com') ||
        seenUrls.has(decodedUrl)
      ) {
        continue;
      }
      seenUrls.add(decodedUrl);
      results.push({ url: decodedUrl, title: '', snippet: '' });
    }

    // Pattern 2: data-href="URL" (newer Google layout)
    const dataHrefPattern = /data-href="(https?:\/\/[^"]+)"/g;
    while ((match = dataHrefPattern.exec(html)) !== null && results.length < MAX_RESULTS) {
      const decodedUrl = decodeURIComponent(match[1]);
      if (
        decodedUrl.includes('google.com') ||
        decodedUrl.includes('youtube.com') ||
        decodedUrl.includes(SITE_DOMAIN) ||
        decodedUrl.includes('github.com') ||
        seenUrls.has(decodedUrl)
      ) {
        continue;
      }
      seenUrls.add(decodedUrl);
      results.push({ url: decodedUrl, title: '', snippet: '' });
    }

    log(`Fallback scraping found ${results.length} results`);
  } catch (err) {
    log(`Fallback scraping error: ${err.message}`);
  }

  return results;
}

// --- Check individual pages for links ---

async function checkPage(pageUrl) {
  try {
    const response = await fetch(pageUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: 'follow',
    });

    if (!response.ok) {
      log(`  Page returned ${response.status}: ${pageUrl}`);
      return null;
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      log(`  Skipping non-HTML content: ${pageUrl}`);
      return null;
    }

    const html = await response.text();

    // Check if page actually mentions FinMoovi
    const mentionsBrand = BRAND_TERMS.some(
      (term) => html.toLowerCase().includes(term.toLowerCase())
    );

    if (!mentionsBrand) {
      log(`  No brand mention found on page: ${pageUrl}`);
      return null;
    }

    const hasLink = hasLinkToSite(html);
    const title = extractTitle(html);
    const context = extractContext(html, BRAND_NAME.toLowerCase());

    return {
      foundAt: new Date().toISOString(),
      pageUrl,
      pageTitle: title,
      mentionContext: context,
      hasLink,
      outreachSent: false,
    };
  } catch (err) {
    log(`  Error checking page ${pageUrl}: ${err.message}`);
    return null;
  }
}

// --- Main ---

async function main() {
  log(`=== ${BRAND_NAME} Brand Mention Monitor ===`);
  log(`Looking for unlinked mentions of "${BRAND_TERMS.join('", "')}"`);

  // Ensure data directory exists
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }

  // Load existing mentions
  let existingMentions = [];
  if (existsSync(MENTIONS_FILE)) {
    try {
      existingMentions = JSON.parse(readFileSync(MENTIONS_FILE, 'utf-8'));
    } catch {
      log('Warning: Could not parse existing mentions file, starting fresh');
      existingMentions = [];
    }
  }

  const existingUrls = new Set(existingMentions.map((m) => m.pageUrl));
  log(`Loaded ${existingMentions.length} existing mentions`);

  // Search for mentions
  const apiKey = process.env.GOOGLE_API_KEY;
  const cseId = process.env.GOOGLE_CSE_ID;

  let searchResults = [];

  if (apiKey && cseId) {
    searchResults = await searchViaAPI(apiKey, cseId);
  } else {
    log('No GOOGLE_API_KEY/GOOGLE_CSE_ID configured');
    searchResults = await searchViaFallback();
  }

  if (searchResults.length === 0) {
    log('No search results found. Exiting.');
    return;
  }

  log(`\nChecking ${searchResults.length} pages for brand mentions and links...`);

  let newMentions = 0;
  let linkedMentions = 0;
  let unlinkedMentions = 0;

  for (const result of searchResults) {
    // Skip already known URLs
    if (existingUrls.has(result.url)) {
      log(`  Skipping already tracked: ${result.url}`);
      continue;
    }

    await randomDelay();
    log(`  Checking: ${result.url}`);

    const mention = await checkPage(result.url);
    if (!mention) continue;

    // Use search result title if page title extraction failed
    if (!mention.pageTitle && result.title) {
      mention.pageTitle = result.title;
    }

    existingMentions.push(mention);
    existingUrls.add(result.url);
    newMentions++;

    if (mention.hasLink) {
      linkedMentions++;
      log(`    Has link to ${SITE_DOMAIN}`);
    } else {
      unlinkedMentions++;
      log(`    NO link - outreach opportunity!`);
    }
  }

  // Save updated mentions
  writeFileSync(MENTIONS_FILE, JSON.stringify(existingMentions, null, 2), 'utf-8');

  // Summary
  log('\n=== Summary ===');
  log(`Total mentions tracked: ${existingMentions.length}`);
  log(`New mentions found: ${newMentions}`);
  log(`  - With link: ${linkedMentions}`);
  log(`  - Without link (outreach opportunities): ${unlinkedMentions}`);

  const totalUnlinked = existingMentions.filter((m) => !m.hasLink && !m.outreachSent).length;
  log(`Total pending outreach opportunities: ${totalUnlinked}`);
  log(`\nResults saved to: ${MENTIONS_FILE}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
