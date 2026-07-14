/**
 * Sindicação para o Tumblr (API v2 / OAuth2) — backlink dofollow (DR alto).
 * Auto-habilitável: só roda se as 4 credenciais existirem.
 * Sindica posts em PORTUGUÊS (público primário) — resumo + link canônico.
 *
 * Secrets necessários:
 *   TUMBLR_CLIENT_ID      - OAuth consumer key (tumblr.com/oauth/apps)
 *   TUMBLR_CLIENT_SECRET  - OAuth consumer secret
 *   TUMBLR_REFRESH_TOKEN  - refresh token obtido no fluxo OAuth2
 *   TUMBLR_BLOG           - identificador do blog (ex.: finmoovi.tumblr.com)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { SITE_URL, BRAND_NAME, BLOG_NAME } from './lib/site.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const POSTS_DIR = path.join(ROOT, 'src', 'content', 'posts');
const SYNCED_FILE = path.join(ROOT, '.github', 'data', 'synced-tumblr.json');
const MAX_PER_RUN = 2;

const CLIENT_ID = process.env.TUMBLR_CLIENT_ID;
const CLIENT_SECRET = process.env.TUMBLR_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.TUMBLR_REFRESH_TOKEN;
const BLOG = process.env.TUMBLR_BLOG;

function loadSynced() {
  try { return JSON.parse(fs.readFileSync(SYNCED_FILE, 'utf-8')); } catch { return []; }
}
function saveSynced(data) {
  fs.mkdirSync(path.dirname(SYNCED_FILE), { recursive: true });
  fs.writeFileSync(SYNCED_FILE, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

function getPtPosts() {
  return fs.readdirSync(POSTS_DIR)
    .filter(f => f.endsWith('.md') && !f.startsWith('en-') && !f.startsWith('es-'))
    .map(file => {
      try {
        const { data: fm } = matter(fs.readFileSync(path.join(POSTS_DIR, file), 'utf-8'));
        if (fm.draft === true) return null;
        return {
          file,
          slug: file.replace(/\.md$/, ''),
          title: fm.title || '',
          description: fm.description || '',
          tags: (fm.tags || []).slice(0, 10),
        };
      } catch { return null; }
    })
    .filter(Boolean);
}

async function getAccessToken() {
  const res = await fetch('https://api.tumblr.com/v2/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: REFRESH_TOKEN,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });
  const json = await res.json();
  if (!json.access_token) throw new Error(`Tumblr OAuth: ${JSON.stringify(json).slice(0, 200)}`);
  return json.access_token;
}

// Frases de chamada variadas (evita pegada de link repetido/automático)
const ANCHORS = [
  `Leia o artigo completo no ${BLOG_NAME}`,
  `Continue lendo no ${BRAND_NAME}`,
  `Veja o guia completo no ${BLOG_NAME}`,
  'Confira o post completo',
  `Saiba mais no ${BLOG_NAME}`,
  `Leia mais sobre isso no ${BRAND_NAME}`,
];
function pickAnchor(slug) {
  const h = [...slug].reduce((a, c) => a + c.charCodeAt(0), 0);
  return ANCHORS[h % ANCHORS.length];
}

async function publishToTumblr(post, accessToken) {
  const canonical = `${SITE_URL}/posts/${post.slug}/`;
  const tags = post.tags.map(t => String(t).replace(/,/g, '')).join(',');

  const body = {
    content: [
      { type: 'text', subtype: 'heading1', text: post.title },
      { type: 'text', text: post.description },
      { type: 'text', text: `${pickAnchor(post.slug)}: ${canonical}` },
    ],
    state: 'published',
    tags,
  };

  const res = await fetch(`https://api.tumblr.com/v2/blog/${encodeURIComponent(BLOG)}/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (res.status >= 400) throw new Error(`Tumblr API ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
  return json.response || {};
}

async function main() {
  console.log('=== Sindicação Tumblr ===');
  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN || !BLOG) {
    console.log('⏭️  Credenciais do Tumblr não configuradas — pulando.');
    return;
  }

  const synced = loadSynced();
  const done = new Set(synced.map(s => s.file));
  const unsynced = getPtPosts().filter(p => !done.has(p.file));
  console.log(`Posts não sincronizados: ${unsynced.length}`);
  if (!unsynced.length) { console.log('Nada a fazer.'); return; }

  let accessToken;
  try { accessToken = await getAccessToken(); }
  catch (e) { console.error(`❌ ${e.message}`); process.exit(1); }

  const toSync = unsynced.slice(0, MAX_PER_RUN);
  let ok = 0;
  for (const post of toSync) {
    try {
      console.log(`Publicando: "${post.title}"`);
      const r = await publishToTumblr(post, accessToken);
      synced.push({ file: post.file, tumblrId: r.id || r.display_text || 'unknown', syncedAt: new Date().toISOString() });
      ok++;
      console.log('  -> OK');
    } catch (e) { console.error(`  -> FALHOU: ${e.message}`); }
  }
  saveSynced(synced);
  console.log(`Feito. ${ok}/${toSync.length} sincronizados.`);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
