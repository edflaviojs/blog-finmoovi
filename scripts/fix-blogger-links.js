/**
 * fix-blogger-links.js — reaponta para a URL FINAL os links das cópias que nós
 * próprios publicámos no Blogger.
 *
 * ═══ O DEFEITO (medido em 16/09/2026) ═══
 *
 * O Search Console diz que 5 páginas do blog NÃO estão indexadas, e diz porquê:
 * "Duplicate, Google chose different canonical than user". O endereço que o
 * Google escolheu em vez do nosso é, nas cinco, o endereço ANTIGO — o que foi
 * aposentado quando os slugs decepados foram arrumados.
 *
 * Do nosso lado estava tudo certo, e foi tudo conferido um a um: o endereço
 * antigo responde 301 para o novo, o `<link rel=canonical>` aponta para o novo,
 * o novo está no sitemap, o antigo não está, e nenhum link interno aponta para
 * origem de redirect (o `validate-internal-links` trava isso no build).
 *
 * O que sobrou a apontar para o endereço morto fomos NÓS, cá fora: em julho de
 * 2026 sindicámos estes posts para o Blogger, Pinterest, Raindrop, Flipboard,
 * Mix e pingbacks — ANTES de os slugs mudarem. Como o blog quase não tem links
 * de fora (4 dofollow no total), estas cópias pesam muito na escolha do Google.
 * Conferido na página do Blogger que está no ar: ela linka mesmo o endereço
 * velho, com o traço solto no fim.
 *
 * Das plataformas, o Blogger é a única onde temos chave E o conteúdo é
 * editável. Pinterest/Raindrop/Flipboard/Mix ficam como estão.
 *
 * ═══ AS DUAS REGRAS DESTE SCRIPT ═══
 *
 * 1. **O registo não é prova.** O `synced-blogger.json` diz o que foi publicado,
 *    não o que está no ar hoje. O script vai BUSCAR o conteúdo de cada post ao
 *    Blogger e só altera se encontrar mesmo o endereço velho lá dentro. Se não
 *    encontrar, não toca e diz-o — a pergunta "há registo de X?" e a pergunta
 *    "X está no ar?" são diferentes, e esta casa já foi mordida por confundi-las.
 *
 * 2. **Relatar antes de escrever.** Sem `--aplicar` não faz um único pedido de
 *    escrita: lista o que mudaria, com o antes e o depois.
 *
 * Uso:
 *   node scripts/fix-blogger-links.js              # só relata
 *   node scripts/fix-blogger-links.js --aplicar    # relata E corrige
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE_URL } from './lib/site.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const REDIRECTS_FILE = path.join(ROOT, 'public', '_redirects');
const SYNCED_FILE = path.join(ROOT, '.github', 'data', 'synced-blogger.json');

const APLICAR = process.argv.includes('--aplicar');

const CLIENT_ID = process.env.BLOGGER_CLIENT_ID;
const CLIENT_SECRET = process.env.BLOGGER_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.BLOGGER_REFRESH_TOKEN;
const BLOG_ID = process.env.BLOGGER_BLOG_ID;

/**
 * Mapa das URLs aposentadas: caminho de origem (sem barra final) → caminho final.
 * A barra final é ignorada na CHAVE porque o ficheiro declara as duas formas;
 * no VALOR é preservada, porque é a URL para onde queremos apontar.
 */
function mapaDeAposentadas() {
  const mapa = new Map();
  for (const linha of fs.readFileSync(REDIRECTS_FILE, 'utf-8').split('\n')) {
    const l = linha.trim();
    if (!l || l.startsWith('#')) continue;
    const [origem, destino] = l.split(/\s+/);
    if (!origem || !destino || !origem.startsWith('/')) continue;
    mapa.set(origem.replace(/\/+$/, ''), destino);
  }
  return mapa;
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

async function lerPost(id, token) {
  const res = await fetch(`https://www.googleapis.com/blogger/v3/blogs/${BLOG_ID}/posts/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (res.status >= 400) throw new Error(`GET ${res.status}: ${JSON.stringify(json).slice(0, 200)}`);
  return json;
}

async function escreverConteudo(id, conteudo, token) {
  // PATCH e não PUT: o PUT exige o recurso inteiro e apagaria campos que não
  // enviássemos (etiquetas, data de publicação). Aqui só o conteúdo muda.
  const res = await fetch(`https://www.googleapis.com/blogger/v3/blogs/${BLOG_ID}/posts/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ content: conteudo }),
  });
  const json = await res.json();
  if (res.status >= 400) throw new Error(`PATCH ${res.status}: ${JSON.stringify(json).slice(0, 200)}`);
  return json;
}

async function main() {
  console.log('=== Blogger: reapontar links para a URL final ===');
  console.log(APLICAR ? '⚠️  modo: APLICAR (vai escrever)' : 'modo: só relatar (não escreve nada)');

  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN || !BLOG_ID) {
    console.log('⏭️  Credenciais do Blogger não configuradas — nada feito.');
    return;
  }

  const aposentadas = mapaDeAposentadas();
  console.log(`URLs aposentadas no _redirects: ${aposentadas.size}`);

  const sincronizados = JSON.parse(fs.readFileSync(SYNCED_FILE, 'utf-8'));
  console.log(`Cópias registadas no Blogger: ${sincronizados.length}\n`);

  // Candidatos: o que o registo DIZ que pode estar errado. Ainda não é prova.
  const candidatos = [];
  for (const entrada of sincronizados) {
    const slug = String(entrada.file || '').replace(/\.md$/, '');
    if (!slug || !entrada.bloggerId) continue;
    const caminhoAntigo = `/posts/${slug}`;
    const destino = aposentadas.get(caminhoAntigo);
    if (!destino) continue;
    candidatos.push({
      slug,
      id: entrada.bloggerId,
      url: entrada.bloggerUrl,
      velha: `${SITE_URL}${caminhoAntigo}`,
      nova: `${SITE_URL}${destino}`,
    });
  }
  console.log(`Candidatos pelo registo: ${candidatos.length}`);
  if (!candidatos.length) { console.log('Nada a fazer.'); return; }

  let token;
  try { token = await getAccessToken(); }
  catch (e) { console.error(`❌ ${e.message}`); process.exit(1); }

  let corrigidos = 0, jaCertos = 0, falhados = 0;

  for (const c of candidatos) {
    console.log(`\n── ${c.slug}`);
    console.log(`   blogger: ${c.url}`);
    let post;
    try { post = await lerPost(c.id, token); }
    catch (e) { console.error(`   ❌ não consegui ler: ${e.message}`); falhados++; continue; }

    const antes = String(post.content || '');
    // Tanto a forma com barra como a sem: o post foi escrito com barra, mas a
    // origem do redirect existe nas duas e não quero depender disso.
    const comBarra = `${c.velha}/`;
    const temVelha = antes.includes(comBarra) || antes.includes(c.velha);
    if (!temVelha) {
      // O registo dizia que sim; a página diz que não. Ganha a página.
      console.log('   ✅ já não tem a URL velha — não tocado.');
      jaCertos++;
      continue;
    }

    const depois = antes.split(comBarra).join(c.nova).split(c.velha).join(c.nova);
    if (depois === antes) { console.log('   ⚠️ nada mudou na substituição — não tocado.'); jaCertos++; continue; }

    console.log(`   antes : ${c.velha}/`);
    console.log(`   depois: ${c.nova}`);

    if (!APLICAR) { corrigidos++; continue; }

    try {
      await escreverConteudo(c.id, depois, token);
      console.log('   ✏️  gravado no Blogger.');
      corrigidos++;
    } catch (e) { console.error(`   ❌ não consegui gravar: ${e.message}`); falhados++; }
  }

  console.log('\n─────────────');
  console.log(`${APLICAR ? 'corrigidos' : 'a corrigir'}: ${corrigidos}`);
  console.log(`já certos (o registo mentia): ${jaCertos}`);
  console.log(`falhados: ${falhados}`);
  if (falhados) process.exit(1);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
