/**
 * IndexNow — indexação instantânea no Bing, Copilot, Yandex, Seznam, Naver, Yep.
 *
 * Lê o sitemap ao vivo, compara com o registro de URLs já enviadas
 * (.github/data/indexnow-submitted.json) e pinga APENAS as URLs novas.
 * Roda de forma independente (workflow indexnow.yml) — não depende dos geradores.
 *
 * OBS: Google NÃO suporta IndexNow (a descoberta dele é via sitemap/links).
 *
 * Uso: node scripts/notify-indexnow.js        (envia de verdade)
 *      node scripts/notify-indexnow.js --dry   (só mostra, não envia)
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const HOST = 'blog.finmoovi.com';
const KEY = '9759488a420163b008fa2ca312612541';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const SITEMAP_URL = `https://${HOST}/sitemap-index.xml`;
const TRACKING = '.github/data/indexnow-submitted.json';
const ENDPOINT = 'https://api.indexnow.org/indexnow';
const MAX_PER_BATCH = 10000; // limite do protocolo IndexNow

const DRY = process.argv.includes('--dry');

async function fetchSitemapUrls() {
  const res = await fetch(SITEMAP_URL);
  if (!res.ok) throw new Error(`Sitemap HTTP ${res.status}`);
  const xml = await res.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].trim());
}

function loadSubmitted() {
  try { return new Set(JSON.parse(readFileSync(TRACKING, 'utf-8'))); }
  catch { return new Set(); }
}

function saveSubmitted(set) {
  if (!existsSync(dirname(TRACKING))) mkdirSync(dirname(TRACKING), { recursive: true });
  writeFileSync(TRACKING, JSON.stringify([...set].sort(), null, 2) + '\n', 'utf-8');
}

async function main() {
  console.log(`=== IndexNow ===${DRY ? ' (DRY RUN)' : ''}`);
  const urls = await fetchSitemapUrls();
  console.log(`Sitemap: ${urls.length} URLs`);

  const submitted = loadSubmitted();
  const firstRun = submitted.size === 0;
  const fresh = urls.filter(u => !submitted.has(u));
  console.log(`Novas para enviar: ${fresh.length}${firstRun ? ' (primeira carga — todo o acervo)' : ''}`);

  if (fresh.length === 0) { console.log('Nada novo. Saindo.'); return; }

  const batch = fresh.slice(0, MAX_PER_BATCH);
  if (DRY) {
    console.log('DRY — enviaria:');
    batch.slice(0, 10).forEach(u => console.log('  ' + u));
    if (batch.length > 10) console.log(`  ... e mais ${batch.length - 10}`);
    return;
  }

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList: batch }),
  });
  console.log(`IndexNow respondeu: HTTP ${res.status}`);

  // 200 = ok, 202 = aceito (validando). 403 = key não encontrada. 422 = url inválida. 429 = rate limit.
  if (res.status === 200 || res.status === 202) {
    batch.forEach(u => submitted.add(u));
    saveSubmitted(submitted);
    console.log(`✅ ${batch.length} URLs enviadas ao IndexNow.`);
  } else {
    const body = await res.text().catch(() => '');
    console.log(`⚠️ Falha (HTTP ${res.status}): ${body.slice(0, 300)}`);
    process.exit(1);
  }
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
