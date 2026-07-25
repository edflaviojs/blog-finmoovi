/**
 * benchmark-youtube-trends.js — Weekly YouTube trend intelligence collector.
 *
 * Uses YouTube Data API v3 to discover high-performing finance videos,
 * extract title/hook/duration patterns, and save structured intelligence
 * to .github/data/youtube-trends.json for consumption by the Shorts pipeline.
 *
 * Quota: ~404 units per run (free tier = 10,000/day).
 * Runs weekly via .github/workflows/youtube-benchmark.yml (Sundays 04:00 UTC).
 *
 * Env: YOUTUBE_API_KEY (Data API key, read-only — NOT the OAuth upload key).
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const API_BASE = 'https://www.googleapis.com/youtube/v3';
const API_KEY = process.env.YOUTUBE_API_KEY;
const OUTPUT = join(process.cwd(), '.github', 'data', 'youtube-trends.json');

// Search queries — one per content pillar
const QUERIES = [
  { q: 'finanças pessoais dicas', pillar: 'controle' },
  { q: 'como investir pouco dinheiro', pillar: 'investimento' },
  { q: 'educação financeira', pillar: 'mindset' },
  { q: 'controle de gastos app', pillar: 'ferramentas' },
];

// Filters
const MIN_VIEWS_PER_DAY = 100;
const MIN_LIKE_RATIO = 0.02;
const MAX_AGE_DAYS = 60;
const RESULTS_PER_QUERY = 50;

/**
 * Makes a GET request to the YouTube Data API v3.
 * @param {string} endpoint - API endpoint (e.g. 'search', 'videos')
 * @param {Record<string, string>} params - Query parameters
 * @returns {Promise<object>} Parsed JSON response
 */
async function apiGet(endpoint, params) {
  const url = new URL(`${API_BASE}/${endpoint}`);
  url.searchParams.set('key', API_KEY);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`YouTube API ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

/**
 * Searches for recent short-form finance videos in pt-BR.
 * @param {string} query - Search query string
 * @returns {Promise<object>} YouTube search response
 */
async function searchVideos(query) {
  return apiGet('search', {
    part: 'snippet',
    q: query,
    type: 'video',
    order: 'viewCount',
    publishedAfter: new Date(Date.now() - MAX_AGE_DAYS * 86400000).toISOString(),
    regionCode: 'BR',
    relevanceLanguage: 'pt',
    maxResults: String(RESULTS_PER_QUERY),
  });
}

/**
 * Fetches statistics for a batch of video IDs.
 * @param {string[]} videoIds - Array of YouTube video IDs (max 50)
 * @returns {Promise<object>} YouTube videos response with statistics
 */
async function getVideoStats(videoIds) {
  return apiGet('videos', {
    part: 'statistics,contentDetails,snippet',
    id: videoIds.join(','),
  });
}

/**
 * Extracts title patterns and performance metrics from a video.
 * @param {object} video - Search result item
 * @param {object} stats - Video statistics item
 * @returns {object} Structured pattern data
 */
function extractPatterns(video, stats) {
  const title = video.snippet.title;
  const published = new Date(video.snippet.publishedAt);
  const ageDays = Math.max(1, (Date.now() - published) / 86400000);
  const views = Number(stats.statistics.viewCount) || 0;
  const likes = Number(stats.statistics.likeCount) || 0;
  const viewsPerDay = views / ageDays;
  const likeRatio = views > 0 ? likes / views : 0;

  // Title pattern detection
  const hasNumber = /\d/.test(title);
  const hasQuestion = /\?/.test(title);
  const hasEmoji = /[\u{1F600}-\u{1F9FF}]/u.test(title);
  const wordCount = title.split(/\s+/).length;
  const charCount = title.length;

  return {
    videoId: video.id.videoId || video.id,
    title,
    channel: video.snippet.channelTitle,
    publishedAt: video.snippet.publishedAt,
    views,
    likes,
    viewsPerDay,
    likeRatio,
    titlePatterns: {
      hasNumber,
      hasQuestion,
      hasEmoji,
      wordCount,
      charCount,
    },
  };
}

/**
 * Computes aggregate patterns from collected video data.
 * @param {Array<object>} videos - Array of extracted video patterns
 * @returns {object} Aggregate intelligence (topPattern, pillarHeat, sampleTitles, etc.)
 */
function computeAggregatePatterns(videos) {
  if (!videos.length) {
    return { topPattern: 'N/A', avgViewsPerDay: 0 };
  }

  const total = videos.length;
  const withNumber = videos.filter(v => v.titlePatterns.hasNumber).length;
  const withQuestion = videos.filter(v => v.titlePatterns.hasQuestion).length;
  const avgWordCount = videos.reduce((s, v) => s + v.titlePatterns.wordCount, 0) / total;
  const avgCharCount = videos.reduce((s, v) => s + v.titlePatterns.charCount, 0) / total;
  const avgViewsPerDay = videos.reduce((s, v) => s + v.viewsPerDay, 0) / total;

  // Top pattern = most common among top 10
  const top10 = videos.slice(0, 10);
  const patterns = top10.map(v => {
    if (v.titlePatterns.hasNumber && v.titlePatterns.hasQuestion) return 'number+question';
    if (v.titlePatterns.hasNumber) return 'number-focused';
    if (v.titlePatterns.hasQuestion) return 'question';
    return 'statement';
  });
  const freq = {};
  patterns.forEach(p => { freq[p] = (freq[p] || 0) + 1; });
  const topPattern = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] || 'mixed';

  // Pillar distribution (sum of viewsPerDay per pillar)
  const pillarHeat = {};
  videos.forEach(v => {
    pillarHeat[v.pillar] = (pillarHeat[v.pillar] || 0) + v.viewsPerDay;
  });

  return {
    topPattern,
    avgViewsPerDay: Math.round(avgViewsPerDay),
    titleStats: {
      percentWithNumber: Math.round((withNumber / total) * 100),
      percentWithQuestion: Math.round((withQuestion / total) * 100),
      avgWordCount: Math.round(avgWordCount),
      avgCharCount: Math.round(avgCharCount),
    },
    pillarHeat,
    sampleTitles: videos.slice(0, 5).map(v => v.title),
  };
}

/**
 * Main entry point — collects trends and saves structured JSON output.
 */
async function main() {
  if (!API_KEY) {
    console.log('ℹ️ YOUTUBE_API_KEY ausente. Pulando benchmark (exit 0).');
    return;
  }

  console.log('🔍 Coletando tendências do YouTube (finanças BR)...');
  const allVideos = [];

  for (const { q, pillar } of QUERIES) {
    console.log(`  📊 Query: "${q}" (pilar: ${pillar})`);
    try {
      const searchResult = await searchVideos(q);
      const items = searchResult.items || [];
      if (!items.length) continue;

      const ids = items.map(i => i.id.videoId).filter(Boolean);

      // Batch in groups of 50
      for (let i = 0; i < ids.length; i += 50) {
        const batch = ids.slice(i, i + 50);
        const statsResult = await getVideoStats(batch);

        for (const stat of statsResult.items || []) {
          const searchItem = items.find(it => it.id.videoId === stat.id);
          if (!searchItem) continue;

          const pattern = extractPatterns(searchItem, stat);
          if (pattern.viewsPerDay >= MIN_VIEWS_PER_DAY && pattern.likeRatio >= MIN_LIKE_RATIO) {
            allVideos.push({ ...pattern, pillar });
          }
        }
      }
    } catch (err) {
      console.error(`  ⚠️ Falha na query "${q}": ${err.message}`);
    }
  }

  // Sort by views/day descending
  allVideos.sort((a, b) => b.viewsPerDay - a.viewsPerDay);

  // Aggregate patterns
  const aggregate = computeAggregatePatterns(allVideos);

  // Save output
  const output = {
    generatedAt: new Date().toISOString(),
    periodDays: MAX_AGE_DAYS,
    totalAnalyzed: allVideos.length,
    aggregate,
    topVideos: allVideos.slice(0, 20),
  };

  const outputDir = join(process.cwd(), '.github', 'data');
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(OUTPUT, JSON.stringify(output, null, 2));
  console.log(`✅ Salvo ${OUTPUT} (${allVideos.length} vídeos analisados, top ${output.topVideos.length} gravados).`);
}

main().catch(err => {
  console.error(`❌ ${err.message}`);
  process.exit(1);
});
