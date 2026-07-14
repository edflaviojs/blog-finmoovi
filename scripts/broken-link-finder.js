/**
 * Broken Link Finder - FinMoovi Blog
 * Crawls competitor/reference sites looking for broken external links
 * that could be replaced with FinMoovi blog content.
 *
 * Usage: node --import tsx scripts/broken-link-finder.js
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { SITE_URL, BRAND_NAME, userAgent } from './lib/site.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// --- Configuration ---
const MAX_SITES_PER_RUN = 3;
const MAX_PAGES_PER_SITE = 20;
const MAX_LINKS_PER_PAGE = 50;
const TIMEOUT_MS = 8000;
const MAX_TOTAL_REQUESTS = 100;
const DELAY_MIN_MS = 1000;
const DELAY_MAX_MS = 2000;
const USER_AGENT = `${userAgent('LinkChecker')} (${SITE_URL})`;

// ⚙️ AJUSTE POR NICHO: sites concorrentes/referência do novo tema ao replicar.
const COMPETITOR_SITES = [
  'https://www.mobills.com.br/blog/',
  'https://www.organizze.com.br/blog/',
  'https://www.nfraldas.com.br/',
  'https://www.infomoney.com.br/guias/',
  'https://www.nubank.com.br/blog/',
  'https://blog.rico.com.vc/',
  'https://investnews.com.br/',
];

// Paths
const DATA_DIR = join(__dirname, '..', '.github', 'data');
const OPPORTUNITIES_FILE = join(DATA_DIR, 'broken-links-opportunities.json');
const TOPICS_FILE = join(__dirname, 'data', 'blog-topics.json');

// --- Helpers ---
let totalRequests = 0;

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomDelay() {
  const ms = DELAY_MIN_MS + Math.random() * (DELAY_MAX_MS - DELAY_MIN_MS);
  return sleep(ms);
}

async function safeFetch(url, options = {}) {
  if (totalRequests >= MAX_TOTAL_REQUESTS) {
    log(`  [SKIP] Max total requests (${MAX_TOTAL_REQUESTS}) reached`);
    return null;
  }
  totalRequests++;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout || TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        ...(options.headers || {}),
      },
      redirect: 'follow',
    });
    clearTimeout(timeout);
    return res;
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      log(`  [TIMEOUT] ${url}`);
    } else {
      log(`  [ERROR] ${url}: ${err.message}`);
    }
    return null;
  }
}

// --- Sitemap parsing ---
async function fetchSitemap(baseUrl) {
  const sitemapPaths = ['/sitemap.xml', '/sitemap-index.xml', '/sitemap_index.xml', '/post-sitemap.xml'];
  const origin = new URL(baseUrl).origin;

  for (const path of sitemapPaths) {
    const url = origin + path;
    log(`  Trying sitemap: ${url}`);
    const res = await safeFetch(url);
    await randomDelay();

    if (res && res.ok) {
      const text = await res.text();
      // Check if it's a sitemap index (contains other sitemaps)
      const subSitemaps = [...text.matchAll(/<loc>\s*(https?:\/\/[^<]+sitemap[^<]*\.xml)\s*<\/loc>/gi)];
      if (subSitemaps.length > 0) {
        log(`  Found sitemap index with ${subSitemaps.length} sub-sitemaps`);
        // Fetch first sub-sitemap that looks like posts
        for (const match of subSitemaps.slice(0, 2)) {
          const subRes = await safeFetch(match[1]);
          await randomDelay();
          if (subRes && subRes.ok) {
            const subText = await subRes.text();
            const urls = extractUrlsFromSitemap(subText, baseUrl);
            if (urls.length > 0) return urls;
          }
        }
      }
      // Direct sitemap
      const urls = extractUrlsFromSitemap(text, baseUrl);
      if (urls.length > 0) return urls;
    }
  }

  log(`  No sitemap found for ${baseUrl}, falling back to homepage links`);
  return await extractLinksFromPage(baseUrl, true);
}

function extractUrlsFromSitemap(xml, baseUrl) {
  const urls = [];
  const matches = [...xml.matchAll(/<loc>\s*(https?:\/\/[^<]+)\s*<\/loc>/gi)];

  for (const match of matches) {
    const url = match[1].trim();
    // Skip non-content pages
    if (
      url.endsWith('.xml') ||
      url.endsWith('/feed/') ||
      url.match(/\/(tag|category|autor|author|page)\//i)
    ) {
      continue;
    }
    // Prefer URLs that look like articles
    if (url.split('/').length > 4 || url.includes('/blog/') || url.includes('/guias/')) {
      urls.push(url);
    }
  }

  return urls.slice(0, MAX_PAGES_PER_SITE);
}

// --- HTML link extraction ---
async function extractLinksFromPage(url, internalOnly = false) {
  const res = await safeFetch(url);
  await randomDelay();

  if (!res || !res.ok) return [];

  const html = await res.text();
  return parseLinksFromHtml(html, url, internalOnly);
}

function parseLinksFromHtml(html, pageUrl, internalOnly = false) {
  const links = [];
  const origin = new URL(pageUrl).origin;
  // Regex to extract <a href="..."> with optional anchor text
  const regex = /<a\s[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = regex.exec(html)) !== null && links.length < MAX_LINKS_PER_PAGE) {
    let href = match[1].trim();
    const anchorHtml = match[2];
    // Strip HTML tags from anchor text
    const anchorText = anchorHtml.replace(/<[^>]+>/g, '').trim();

    // Resolve relative URLs
    try {
      if (href.startsWith('/')) {
        href = origin + href;
      } else if (!href.startsWith('http')) {
        continue;
      }
    } catch {
      continue;
    }

    // Skip javascript:, mailto:, tel:
    if (href.match(/^(javascript|mailto|tel):/i)) continue;

    if (internalOnly) {
      if (href.startsWith(origin) && href !== pageUrl) {
        links.push({ href, anchorText });
      }
    } else {
      // Only external links
      if (!href.startsWith(origin)) {
        links.push({ href, anchorText });
      }
    }
  }

  return links;
}

// --- Link checking ---
async function checkLink(url) {
  const res = await safeFetch(url, { method: 'HEAD', timeout: TIMEOUT_MS });
  await randomDelay();

  if (!res) {
    // Timeout or network error - try GET as fallback
    const getRes = await safeFetch(url, { method: 'GET', timeout: TIMEOUT_MS });
    await randomDelay();
    if (!getRes) return { status: 0, broken: true };
    return { status: getRes.status, broken: getRes.status >= 400 };
  }

  // Some servers return 405 for HEAD, retry with GET
  if (res.status === 405) {
    const getRes = await safeFetch(url, { method: 'GET', timeout: TIMEOUT_MS });
    await randomDelay();
    if (!getRes) return { status: 0, broken: true };
    return { status: getRes.status, broken: getRes.status >= 400 };
  }

  return { status: res.status, broken: res.status >= 400 };
}

// --- Topic matching ---
function loadTopics() {
  if (!existsSync(TOPICS_FILE)) {
    log('[WARN] blog-topics.json not found');
    return [];
  }
  return JSON.parse(readFileSync(TOPICS_FILE, 'utf-8'));
}

function findMatchingTopic(anchorText, pageUrl) {
  const topics = loadTopics();
  const searchText = `${anchorText} ${pageUrl}`.toLowerCase();

  for (const topic of topics) {
    for (const keyword of topic.keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        return topic;
      }
    }
  }
  return null;
}

// --- Load existing opportunities ---
function loadOpportunities() {
  if (!existsSync(OPPORTUNITIES_FILE)) {
    return [];
  }
  try {
    return JSON.parse(readFileSync(OPPORTUNITIES_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function saveOpportunities(opportunities) {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  writeFileSync(OPPORTUNITIES_FILE, JSON.stringify(opportunities, null, 2), 'utf-8');
}

// --- Main execution ---
async function main() {
  log(`=== ${BRAND_NAME} Broken Link Finder ===`);
  log(`Max sites per run: ${MAX_SITES_PER_RUN}`);
  log(`Max pages per site: ${MAX_PAGES_PER_SITE}`);
  log(`Max total requests: ${MAX_TOTAL_REQUESTS}`);
  log('');

  const opportunities = loadOpportunities();
  const existingBrokenUrls = new Set(opportunities.map((o) => o.brokenUrl));

  // Shuffle and pick sites for this run
  const shuffled = [...COMPETITOR_SITES].sort(() => Math.random() - 0.5);
  const sitesThisRun = shuffled.slice(0, MAX_SITES_PER_RUN);

  log(`Sites this run: ${sitesThisRun.join(', ')}`);
  log('');

  let newOpportunities = 0;

  for (const siteUrl of sitesThisRun) {
    if (totalRequests >= MAX_TOTAL_REQUESTS) {
      log(`[STOP] Max total requests reached (${MAX_TOTAL_REQUESTS})`);
      break;
    }

    log(`--- Crawling: ${siteUrl} ---`);

    try {
      // Step 1: Get article URLs from sitemap
      const articleUrls = await fetchSitemap(siteUrl);
      log(`  Found ${articleUrls.length} article URLs`);

      if (articleUrls.length === 0) continue;

      // Step 2: For each article, extract external links
      for (const articleUrl of articleUrls.slice(0, MAX_PAGES_PER_SITE)) {
        if (totalRequests >= MAX_TOTAL_REQUESTS) break;

        const pageUrl = typeof articleUrl === 'string' ? articleUrl : articleUrl.href;
        log(`  Scanning: ${pageUrl}`);

        const res = await safeFetch(pageUrl);
        await randomDelay();

        if (!res || !res.ok) continue;

        const html = await res.text();
        const externalLinks = parseLinksFromHtml(html, pageUrl, false);
        log(`    External links found: ${externalLinks.length}`);

        // Step 3: Check each external link
        for (const link of externalLinks) {
          if (totalRequests >= MAX_TOTAL_REQUESTS) break;
          if (existingBrokenUrls.has(link.href)) continue;

          // Skip common always-valid domains
          if (link.href.match(/\.(gov\.br|google\.com|youtube\.com|facebook\.com|instagram\.com|twitter\.com)/)) {
            continue;
          }

          const { status, broken } = await checkLink(link.href);

          if (broken && status >= 400) {
            log(`    [BROKEN ${status}] ${link.href}`);
            log(`      Anchor: "${link.anchorText}"`);

            // Check if relevant to our blog
            const topic = findMatchingTopic(link.anchorText, link.href);

            if (topic) {
              log(`      MATCH: ${topic.title} -> ${topic.url}`);
              const opportunity = {
                foundAt: new Date().toISOString(),
                sourcePage: pageUrl,
                brokenUrl: link.href,
                anchorText: link.anchorText,
                httpStatus: status,
                suggestedReplacement: topic.url,
                outreachSent: false,
              };
              opportunities.push(opportunity);
              existingBrokenUrls.add(link.href);
              newOpportunities++;
            }
          }
        }
      }
    } catch (err) {
      log(`  [SITE ERROR] ${siteUrl}: ${err.message}`);
      continue;
    }

    log('');
  }

  // Save results
  saveOpportunities(opportunities);

  log('=== Summary ===');
  log(`Total requests made: ${totalRequests}`);
  log(`New opportunities found: ${newOpportunities}`);
  log(`Total opportunities stored: ${opportunities.length}`);
  log(`Results saved to: ${OPPORTUNITIES_FILE}`);
}

main().catch((err) => {
  console.error('[FATAL]', err);
  process.exit(1);
});
