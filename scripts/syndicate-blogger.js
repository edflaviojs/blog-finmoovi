/**
 * Sindicação para o Blogger (Google API v3 / OAuth2) — backlink dofollow (DR 90+).
 * Auto-habilitável: só roda se as 4 credenciais existirem.
 * Sindica posts em PORTUGUÊS — resumo + link canônico (evita duplicate content).
 *
 * Secrets necessários:
 *   BLOGGER_CLIENT_ID      - OAuth2 client id (Google Cloud Console)
 *   BLOGGER_CLIENT_SECRET  - OAuth2 client secret
 *   BLOGGER_REFRESH_TOKEN  - refresh token (fluxo OAuth2, scope blogger)
 *   BLOGGER_BLOG_ID        - ID numérico do blog no Blogger
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const POSTS_DIR = path.join(ROOT, 'src', 'content', 'posts');
const SYNCED_FILE = path.join(ROOT, '.github', 'data', 'synced-blogger.json');
const SITE_URL = 'https://blog.finmoovi.com';
const MAX_PER_RUN = 2;

const CLIENT_ID = process.env.BLOGGER_CLIENT_ID;
const CLIENT_SECRET = process.env.BLOGGER_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.BLOGGER_REFRESH_TOKEN;
const BLOG_ID = process.env.BLOGGER_BLOG_ID;

function loadSynced() {
  try { return JSON.parse(fs.readFileSync(SYNCED_FILE, 'utf-8')); } catch { return []; }
}
function saveSynced(data) {
  fs.mkdirSync(path.dirname(SYNCED_FILE), { recursive: true });
  fs.writeFileSync(SYNCED_FILE, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
          tags: (fm.tags || []).slice(0, 10).map(String),
        };
      } catch { return null; }
    })
    .filter(Boolean);
}

async function getAccessToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  const json = await res.json();
  if (!json.access_token) throw new Error(`Blogger OAuth: ${JSON.stringify(json).slice(0, 200)}`);
  return json.access_token;
}

async function publishToBlogger(post, accessToken) {
  const canonical = `${SITE_URL}/posts/${post.slug}/`;
  const content = `<p>${esc(post.description)}</p>` +
    `<p><a href="${canonical}" rel="canonical">Leia o artigo completo no FinMoovi Blog »</a></p>`;

  const res = await fetch(`https://www.googleapis.com/blogger/v3/blogs/${BLOG_ID}/posts/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
    body: JSON.stringify({ title: post.title, content, labels: post.tags }),
  });
  const json = await res.json();
  if (res.status >= 400) throw new Error(`Blogger API ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
  return json;
}

async function main() {
  console.log('=== Sindicação Blogger ===');
  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN || !BLOG_ID) {
    console.log('⏭️  Credenciais do Blogger não configuradas — pulando.');
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
      const r = await publishToBlogger(post, accessToken);
      synced.push({ file: post.file, bloggerId: r.id, bloggerUrl: r.url, syncedAt: new Date().toISOString() });
      ok++;
      console.log(`  -> ${r.url || 'OK'}`);
    } catch (e) { console.error(`  -> FALHOU: ${e.message}`); }
  }
  saveSynced(synced);
  console.log(`Feito. ${ok}/${toSync.length} sincronizados.`);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
