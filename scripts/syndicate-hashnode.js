/**
 * Sindicação para o Hashnode (GraphQL API) — gera backlink com canonical.
 * Auto-habilitável: só roda se HASHNODE_TOKEN + HASHNODE_PUBLICATION_ID existirem.
 * Sindica posts em INGLÊS (en-) com canonical apontando para o original (sem duplicate content).
 *
 * Secrets necessários:
 *   HASHNODE_TOKEN          - Personal Access Token (hashnode.com/settings/developer)
 *   HASHNODE_PUBLICATION_ID - (opcional) ID da publication; se ausente, é
 *                             descoberto automaticamente a partir do token.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const POSTS_DIR = path.join(ROOT, 'src', 'content', 'posts');
const SYNCED_FILE = path.join(ROOT, '.github', 'data', 'synced-hashnode.json');
const SITE_URL = 'https://blog.finmoovi.com';
const MAX_PER_RUN = 2;

const TOKEN = process.env.HASHNODE_TOKEN;
let PUBLICATION_ID = process.env.HASHNODE_PUBLICATION_ID;

async function hashnodeGraphQL(query, variables) {
  const res = await fetch('https://gql.hashnode.com/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': TOKEN },
    body: JSON.stringify({ query, variables }),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); }
  catch { throw new Error(`Resposta não-JSON (HTTP ${res.status}) — endpoint bloqueado? ${text.slice(0, 120)}`); }
  if (json.errors) throw new Error(JSON.stringify(json.errors).slice(0, 300));
  return json.data;
}

async function resolvePublicationId() {
  const data = await hashnodeGraphQL(`query { me { publications(first: 1) { edges { node { id title } } } } }`);
  const node = data?.me?.publications?.edges?.[0]?.node;
  if (!node) throw new Error('Nenhuma publication encontrada na conta.');
  console.log(`Publication descoberta: "${node.title}" (${node.id})`);
  return node.id;
}

function loadSynced() {
  try { return JSON.parse(fs.readFileSync(SYNCED_FILE, 'utf-8')); } catch { return []; }
}
function saveSynced(data) {
  fs.mkdirSync(path.dirname(SYNCED_FILE), { recursive: true });
  fs.writeFileSync(SYNCED_FILE, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

function getEnglishPosts() {
  return fs.readdirSync(POSTS_DIR)
    .filter(f => f.startsWith('en-') && f.endsWith('.md'))
    .map(file => {
      try {
        const { data: fm, content } = matter(fs.readFileSync(path.join(POSTS_DIR, file), 'utf-8'));
        if (fm.draft === true) return null;
        return {
          file,
          slug: file.replace(/\.md$/, ''),
          title: fm.title || '',
          description: fm.description || '',
          tags: (fm.tags || []).slice(0, 5),
          content,
        };
      } catch { return null; }
    })
    .filter(Boolean);
}

function canonicalUrl(slug) {
  return `${SITE_URL}/en/posts/${slug.replace(/^en-/, '')}/`;
}

function tagObjects(tags) {
  const objs = tags
    .map(t => ({ name: t, slug: t.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().split(/\s+/).join('-').slice(0, 40) }))
    .filter(t => t.slug.length >= 2);
  return objs.length ? objs.slice(0, 5) : [{ name: 'Personal Finance', slug: 'personal-finance' }];
}

async function publishToHashnode(post) {
  const canonical = canonicalUrl(post.slug);
  const body = post.content.trim() + `\n\n---\n\n*Originally published at [FinMoovi Blog](${canonical})*`;

  const query = `mutation PublishPost($input: PublishPostInput!) {
    publishPost(input: $input) { post { id url slug } }
  }`;
  const variables = {
    input: {
      title: post.title,
      contentMarkdown: body,
      tags: tagObjects(post.tags),
      publicationId: PUBLICATION_ID,
      originalArticleURL: canonical,
      metaTags: { description: post.description },
    },
  };

  const data = await hashnodeGraphQL(query, variables);
  const p = data?.publishPost?.post;
  if (!p) throw new Error('Hashnode: resposta inesperada (sem post)');
  return p;
}

async function main() {
  console.log('=== Sindicação Hashnode ===');
  if (!TOKEN) {
    console.log('⏭️  HASHNODE_TOKEN não configurado — pulando.');
    return;
  }

  const synced = loadSynced();
  const done = new Set(synced.map(s => s.file));
  const unsynced = getEnglishPosts().filter(p => !done.has(p.file));
  console.log(`Posts não sincronizados: ${unsynced.length}`);
  if (!unsynced.length) { console.log('Nada a fazer.'); return; }

  if (!PUBLICATION_ID) {
    try { PUBLICATION_ID = await resolvePublicationId(); }
    catch (e) {
      // A API GraphQL do Hashnode passou a exigir plano Pro (desde 13/05/2026).
      // No plano free ela retorna HTML/erro — pulamos sem derrubar o workflow.
      console.log(`⏭️  Hashnode indisponível no plano free (a API GraphQL exige Pro desde 05/2026). Pulando. Detalhe: ${e.message}`);
      return;
    }
  }

  const toSync = unsynced.slice(0, MAX_PER_RUN);
  let ok = 0;
  for (const post of toSync) {
    try {
      console.log(`Publicando: "${post.title}"`);
      const r = await publishToHashnode(post);
      synced.push({ file: post.file, hashnodeId: r.id, hashnodeUrl: r.url, syncedAt: new Date().toISOString() });
      ok++;
      console.log(`  -> ${r.url}`);
    } catch (e) { console.error(`  -> FALHOU: ${e.message}`); }
  }
  saveSynced(synced);
  console.log(`Feito. ${ok}/${toSync.length} sincronizados.`);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
