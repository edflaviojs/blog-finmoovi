/**
 * Reddit Opportunities Monitor - Phase 4 Backlinks
 *
 * Monitors Reddit subreddits for posts matching blog keywords.
 * Does NOT post automatically - only finds opportunities for manual engagement.
 *
 * Usage: node scripts/reddit-opportunities.js
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

// ⚙️ AJUSTE POR NICHO: subreddits não são deriváveis do config — ao replicar o
// template para outro nicho, edite esta lista com os subreddits do novo tema.
const SUBREDDITS = [
  'financaspessoais',
  'investimentos',
  'brasileiros',
  'personalfinance',
  'FinancialPlanning',
  'budget'
];

const MAX_OPPORTUNITIES = 50;
const MAX_AGE_DAYS = 30;
const HOURS_48 = 48 * 60 * 60; // 48h in seconds
const DELAY_MIN = 2000;
const DELAY_MAX = 3000;

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

// Paths
const TOPICS_PATH = join(ROOT, 'scripts', 'data', 'blog-topics.json');
const OUTPUT_DIR = join(ROOT, '.github', 'data');
const OUTPUT_PATH = join(OUTPUT_DIR, 'reddit-opportunities.json');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomDelay() {
  return DELAY_MIN + Math.random() * (DELAY_MAX - DELAY_MIN);
}

function loadTopics() {
  const raw = readFileSync(TOPICS_PATH, 'utf-8');
  return JSON.parse(raw);
}

function loadExistingOpportunities() {
  if (!existsSync(OUTPUT_PATH)) return [];
  try {
    const raw = readFileSync(OUTPUT_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveOpportunities(opportunities) {
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  writeFileSync(OUTPUT_PATH, JSON.stringify(opportunities, null, 2), 'utf-8');
}

function cleanOldOpportunities(opportunities) {
  const cutoff = Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  return opportunities.filter(opp => {
    const date = new Date(opp.foundAt).getTime();
    return date >= cutoff;
  });
}

function matchKeywords(text, topics) {
  const lower = text.toLowerCase();
  const matches = [];

  for (const topic of topics) {
    for (const keyword of topic.keywords) {
      if (lower.includes(keyword.toLowerCase())) {
        matches.push({ keyword, url: topic.url, title: topic.title });
        break; // one match per topic is enough
      }
    }
  }

  return matches;
}

async function fetchSubreddit(subreddit) {
  const url = `https://www.reddit.com/r/${subreddit}/new.json?limit=25`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for r/${subreddit}`);
  }

  const data = await response.json();
  return data?.data?.children || [];
}

async function main() {
  console.log('[Reddit Monitor] Starting...');
  console.log(`[Reddit Monitor] Monitoring ${SUBREDDITS.length} subreddits`);

  const topics = loadTopics();
  console.log(`[Reddit Monitor] Loaded ${topics.length} blog topics`);

  let existing = loadExistingOpportunities();
  existing = cleanOldOpportunities(existing);
  console.log(`[Reddit Monitor] ${existing.length} existing opportunities (after cleanup)`);

  // Track existing Reddit URLs to avoid duplicates
  const existingUrls = new Set(existing.map(o => o.redditUrl));

  const nowSec = Math.floor(Date.now() / 1000);
  let newOpportunities = [];

  for (const subreddit of SUBREDDITS) {
    console.log(`\n[Reddit Monitor] Fetching r/${subreddit}...`);

    try {
      const posts = await fetchSubreddit(subreddit);
      console.log(`[Reddit Monitor] Got ${posts.length} posts from r/${subreddit}`);

      let matchCount = 0;

      for (const post of posts) {
        const { title, selftext, created_utc, permalink } = post.data;

        // Only posts from last 48h
        if (nowSec - created_utc > HOURS_48) continue;

        const fullText = `${title} ${selftext || ''}`;
        const matches = matchKeywords(fullText, topics);

        if (matches.length === 0) continue;

        const redditUrl = `https://reddit.com${permalink}`;

        // Skip duplicates
        if (existingUrls.has(redditUrl)) continue;

        const opportunity = {
          foundAt: new Date().toISOString().split('T')[0],
          redditUrl,
          subreddit,
          title: title.slice(0, 200),
          matchedKeywords: matches.map(m => m.keyword),
          suggestedBlogPost: matches[0].url,
          responded: false
        };

        newOpportunities.push(opportunity);
        existingUrls.add(redditUrl);
        matchCount++;
      }

      console.log(`[Reddit Monitor] Found ${matchCount} new opportunities in r/${subreddit}`);
    } catch (error) {
      console.error(`[Reddit Monitor] Error fetching r/${subreddit}: ${error.message}`);
    }

    // Delay between subreddit requests
    if (subreddit !== SUBREDDITS[SUBREDDITS.length - 1]) {
      const delay = randomDelay();
      console.log(`[Reddit Monitor] Waiting ${Math.round(delay)}ms...`);
      await sleep(delay);
    }
  }

  // Merge and cap at MAX_OPPORTUNITIES
  const allOpportunities = [...newOpportunities, ...existing].slice(0, MAX_OPPORTUNITIES);

  saveOpportunities(allOpportunities);

  console.log(`\n[Reddit Monitor] Done!`);
  console.log(`[Reddit Monitor] New opportunities found: ${newOpportunities.length}`);
  console.log(`[Reddit Monitor] Total saved: ${allOpportunities.length}`);
}

main().catch(error => {
  console.error('[Reddit Monitor] Fatal error:', error.message);
  process.exit(1);
});
