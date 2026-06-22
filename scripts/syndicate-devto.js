import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const POSTS_DIR = path.join(ROOT, 'src', 'content', 'posts');
const SYNCED_FILE = path.join(ROOT, '.github', 'data', 'synced-devto.json');
const SITE_URL = 'https://blog.finmoovi.com';
const MAX_PER_RUN = 2;

const DEVTO_API_KEY = process.env.DEVTO_API_KEY;

if (!DEVTO_API_KEY) {
  console.error('ERROR: DEVTO_API_KEY environment variable is not set.');
  process.exit(1);
}

function loadSyncedData() {
  try {
    const raw = fs.readFileSync(SYNCED_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveSyncedData(data) {
  fs.writeFileSync(SYNCED_FILE, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

function getEnglishPosts() {
  const files = fs.readdirSync(POSTS_DIR).filter(f => f.startsWith('en-') && f.endsWith('.md'));
  const posts = [];

  for (const file of files) {
    try {
      const filePath = path.join(POSTS_DIR, file);
      const raw = fs.readFileSync(filePath, 'utf-8');
      const { data: frontmatter, content } = matter(raw);

      posts.push({
        file,
        slug: file.replace(/\.md$/, ''),
        title: frontmatter.title || '',
        description: frontmatter.description || '',
        tags: (frontmatter.tags || []).slice(0, 4),
        publishedAt: frontmatter.publishedAt || '',
        content,
      });
    } catch (err) {
      console.warn(`Warning: Could not parse ${file}: ${err.message}`);
    }
  }

  return posts;
}

function buildCanonicalUrl(slug) {
  // Remove 'en-' prefix for the URL path
  const urlSlug = slug.replace(/^en-/, '');
  return `${SITE_URL}/en/posts/${urlSlug}/`;
}

function buildDevtoBody(post) {
  const canonicalUrl = buildCanonicalUrl(post.slug);
  const footer = `\n\n---\n\n*Originally published at [FinMoovi Blog](${canonicalUrl})*`;
  return post.content.trim() + footer;
}

function sanitizeTag(tag) {
  // Dev.to tags: lowercase, no spaces, alphanumeric and hyphens only, max 30 chars
  return tag
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '')
    .slice(0, 30);
}

async function postToDevto(post) {
  const canonicalUrl = buildCanonicalUrl(post.slug);
  const tags = post.tags.map(sanitizeTag).filter(t => t.length > 0);
  const body = buildDevtoBody(post);

  const payload = {
    article: {
      title: post.title,
      body_markdown: body,
      published: true,
      canonical_url: canonicalUrl,
      description: post.description,
      tags,
    },
  };

  const response = await fetch('https://dev.to/api/articles', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': DEVTO_API_KEY,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Dev.to API error ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  return {
    id: result.id,
    url: result.url,
    slug: result.slug,
  };
}

async function main() {
  console.log('=== Dev.to Syndication Script ===\n');

  const synced = loadSyncedData();
  const syncedFiles = new Set(synced.map(s => s.file));

  const allPosts = getEnglishPosts();
  console.log(`Found ${allPosts.length} English posts total.`);

  const unsynced = allPosts.filter(p => !syncedFiles.has(p.file));
  console.log(`Found ${unsynced.length} posts not yet synced to Dev.to.`);

  if (unsynced.length === 0) {
    console.log('Nothing to sync. Exiting.');
    return;
  }

  const toSync = unsynced.slice(0, MAX_PER_RUN);
  console.log(`Will sync ${toSync.length} post(s) this run.\n`);

  let successCount = 0;

  for (const post of toSync) {
    try {
      console.log(`Syndicating: "${post.title}" (${post.file})`);
      const result = await postToDevto(post);

      synced.push({
        file: post.file,
        slug: post.slug,
        devtoId: result.id,
        devtoUrl: result.url,
        syncedAt: new Date().toISOString(),
      });

      successCount++;
      console.log(`  -> Published: ${result.url}\n`);
    } catch (err) {
      console.error(`  -> FAILED: ${err.message}\n`);
    }
  }

  saveSyncedData(synced);
  console.log(`\nDone. Successfully synced ${successCount}/${toSync.length} posts.`);
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
