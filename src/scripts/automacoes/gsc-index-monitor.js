/**
 * gsc-index-monitor.js — Monitor diário de indexação (Search Console API oficial).
 *
 * NÃO força indexação (a Indexing API do Google é restrita por ToS a
 * JobPosting/BroadcastEvent — usar para posts de blog violaria os termos e o
 * Google ignora). Este script faz o que É legítimo e útil:
 *
 *   1. Garante que o sitemap está REGISTRADO na propriedade do GSC (sitemaps.list
 *      + sitemaps.submit se ausente) — sem isso o Google pode nem saber que as
 *      páginas existem, mesmo com o arquivo publicado no servidor.
 *   2. Inspeciona TODAS as URLs do sitemap via URL Inspection API oficial
 *      (mesmo dado da ferramenta "Inspecionar URL" do painel), sem scraping.
 *   3. Rastreia há quantos dias cada URL não-raiz está fora do índice.
 *   4. Abre/atualiza UMA issue no GitHub (→ e-mail) quando algo exige atenção:
 *      sitemap não registrado, ou páginas de CONTEÚDO (não a raiz "/") fora do
 *      índice por mais de INDEX_ALERT_DAYS dias.
 *
 * SKIP GRACIOSO: sem GSC_SERVICE_ACCOUNT_JSON, sai com exit 0.
 *
 * Saída: .github/data/gsc-index-status.json (histórico por URL) +
 *        press/gsc-index-monitor.md (relatório legível).
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import {
  hasGscCredentials,
  listSitemaps,
  submitSitemap,
  inspectUrl,
  GSC_SITE_URL,
} from '../apis/gsc.js';

const DATA_DIR = join(process.cwd(), '.github', 'data');
const PRESS_DIR = join(process.cwd(), 'press');
const JSON_OUT = join(DATA_DIR, 'gsc-index-status.json');
const MD_OUT = join(PRESS_DIR, 'gsc-index-monitor.md');

const SITEMAP_URL = `${GSC_SITE_URL.replace(/\/$/, '')}/sitemap-index.xml`;
const BATCH_SIZE = 8; // chamadas concorrentes por lote (bem abaixo do ~600/min documentado)
const BATCH_DELAY_MS = 300; // pausa entre lotes
const INDEX_ALERT_DAYS = 7; // dias fora do índice antes de alertar (home de cada locale é isenta)

const INDEXED_VERDICTS = new Set(['PASS']);

function fmtDate(d) {
  return new Date(d).toISOString().slice(0, 10);
}

/** Busca o sitemap publicado no servidor e extrai as <loc> (sem depender de auth). */
async function fetchSitemapUrls() {
  const res = await fetch(SITEMAP_URL);
  if (!res.ok) throw new Error(`Não consegui baixar o sitemap (${res.status}): ${SITEMAP_URL}`);
  const xml = await res.text();
  const matches = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  return [...new Set(matches)];
}

/** Garante que o sitemap está registrado no GSC; retorna { alreadyRegistered, submitted, error }. */
async function ensureSitemapRegistered() {
  let sitemaps = [];
  try {
    sitemaps = await listSitemaps();
  } catch (err) {
    return { alreadyRegistered: false, submitted: false, error: `listar sitemaps falhou: ${err.message}` };
  }

  const already = sitemaps.some(s => s.path === SITEMAP_URL);
  if (already) return { alreadyRegistered: true, submitted: false, error: null };

  try {
    await submitSitemap(SITEMAP_URL);
    console.log(`✅ Sitemap registrado agora no GSC: ${SITEMAP_URL}`);
    return { alreadyRegistered: false, submitted: true, error: null };
  } catch (err) {
    console.error(`❌ Não consegui registrar o sitemap automaticamente: ${err.message}`);
    return {
      alreadyRegistered: false,
      submitted: false,
      error:
        'Sitemap NÃO estava registrado e o registro automático falhou (provável causa: a service ' +
        'account está como usuário "Restrito" na propriedade — precisa ser "Completo" para poder ' +
        'registrar sitemaps). Registrar manualmente em Search Console → Sitemaps.',
    };
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

/**
 * A URL Inspection API costuma levar ~6-7s por chamada (latência normal dela,
 * não é rate limit) — sequencial demoraria ~45min para 439 URLs. Processa em
 * lotes concorrentes (ainda bem dentro do limite documentado de ~600/min).
 */
async function inspectAll(urls) {
  const results = [];
  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    const batch = urls.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async url => {
        try {
          const r = await inspectUrl(url);
          return { url, ...r, checkedAt: new Date().toISOString(), error: null };
        } catch (err) {
          return { url, error: err.message, checkedAt: new Date().toISOString() };
        }
      }),
    );
    results.push(...batchResults);
    console.log(`  ...inspecionadas ${Math.min(i + BATCH_SIZE, urls.length)}/${urls.length}`);
    if (i + BATCH_SIZE < urls.length) await sleep(BATCH_DELAY_MS);
  }
  return results;
}

/** Mescla o resultado de hoje com o histórico anterior (para saber "há quantos dias"). */
function mergeWithHistory(today) {
  let prev = [];
  if (existsSync(JSON_OUT)) {
    try {
      prev = JSON.parse(readFileSync(JSON_OUT, 'utf-8')).urls || [];
    } catch {
      prev = [];
    }
  }
  const prevByUrl = new Map(prev.map(u => [u.url, u]));

  return today.map(u => {
    const indexed = INDEXED_VERDICTS.has(u.verdict);
    const before = prevByUrl.get(u.url);

    // notIndexedSince: null se indexada hoje; senão mantém a data já registrada
    // (continua contando os dias) ou começa hoje (1ª vez que a vemos fora do índice).
    const notIndexedSince = indexed ? null : (before?.notIndexedSince || fmtDate(Date.now()));

    return { ...u, indexed, notIndexedSince };
  });
}

async function openOrUpdateAlertIssue({ sitemapError, staleContentPages }) {
  const ghToken = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY;
  if (!ghToken || !repo) return;
  if (!sitemapError && staleContentPages.length === 0) return;

  const title = '🔎 GSC: páginas fora do índice há mais de 7 dias';
  const headers = {
    Authorization: `Bearer ${ghToken}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
  };

  const existing = await fetch(
    `https://api.github.com/repos/${repo}/issues?state=open&per_page=50`,
    { headers },
  ).then(r => (r.ok ? r.json() : []));
  const openIssue = Array.isArray(existing) ? existing.find(i => i.title === title) : null;

  const lines = [];
  if (sitemapError) lines.push(`⚠️ **Sitemap:** ${sitemapError}`, '');
  if (staleContentPages.length > 0) {
    lines.push(
      `**${staleContentPages.length} página(s) de conteúdo** fora do índice há mais de ${INDEX_ALERT_DAYS} dias ` +
        '(a home "/" não conta aqui — é normal ela oscilar):',
      '',
      ...staleContentPages
        .slice(0, 30)
        .map(p => `- \`${p.url}\` — ${p.coverageState} (fora do índice desde ${p.notIndexedSince})`),
    );
    if (staleContentPages.length > 30) lines.push(`- ...e mais ${staleContentPages.length - 30}.`);
  }
  lines.push(
    '',
    'Isso é só monitoramento (a API de indexação do Google não permite forçar a inclusão de ' +
      'posts de blog). Verifique manualmente no painel se persistir, ou avalie: links internos ' +
      'apontando para essas páginas, conteúdo raso/duplicado, ou aguardar mais alguns dias.',
    '',
    `Relatório completo: \`press/gsc-index-monitor.md\` no repositório.`,
  );
  const body = lines.join('\n');

  if (openIssue) {
    await fetch(`https://api.github.com/repos/${repo}/issues/${openIssue.number}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ body }),
    });
    console.log('🔔 Issue de alerta do GSC atualizada.');
  } else {
    const res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ title, body, labels: ['seo', 'monitoramento'] }),
    });
    if (res.ok) console.log('🔔 Issue de alerta do GSC aberta (e-mail a caminho).');
    else console.error(`Aviso: falha ao abrir issue de alerta (${res.status}).`);
  }
}

async function main() {
  console.log('=== GSC Index Monitor ===\n');

  if (!hasGscCredentials()) {
    console.log('⏭️  GSC_SERVICE_ACCOUNT_JSON não configurado — pulando.');
    process.exit(0);
  }

  mkdirSync(DATA_DIR, { recursive: true });
  mkdirSync(PRESS_DIR, { recursive: true });

  console.log(`Propriedade: ${GSC_SITE_URL}`);
  const sitemapCheck = await ensureSitemapRegistered();
  console.log(
    sitemapCheck.alreadyRegistered
      ? '✅ Sitemap já estava registrado no GSC.'
      : sitemapCheck.submitted
        ? '✅ Sitemap registrado agora (não estava antes).'
        : `❌ ${sitemapCheck.error}`,
  );

  const urls = await fetchSitemapUrls();
  console.log(`\nInspecionando ${urls.length} URLs (URL Inspection API)...`);
  const results = await inspectAll(urls);
  const merged = mergeWithHistory(results);

  const indexedCount = merged.filter(u => u.indexed).length;
  const notIndexed = merged.filter(u => !u.indexed && !u.error);
  const errored = merged.filter(u => u.error);

  const HOME_PATHS = new Set(['/', '/en/', '/es/']); // home de cada locale — oscila, não conta pro alerta
  const staleContentPages = notIndexed.filter(u => {
    if (HOME_PATHS.has(new URL(u.url).pathname)) return false;
    const days = Math.floor((Date.now() - new Date(u.notIndexedSince).getTime()) / 86400000);
    return days >= INDEX_ALERT_DAYS;
  });

  writeFileSync(JSON_OUT, JSON.stringify({ generatedAt: new Date().toISOString(), site: GSC_SITE_URL, urls: merged }, null, 2));

  const byReason = new Map();
  for (const u of notIndexed) byReason.set(u.coverageState, (byReason.get(u.coverageState) ?? 0) + 1);

  const md = [
    `# GSC — Monitor de Indexação`,
    '',
    `Gerado em: ${new Date().toISOString()}`,
    `Propriedade: ${GSC_SITE_URL}`,
    '',
    `## Resumo`,
    '',
    `- **${indexedCount}/${merged.length}** URLs indexadas`,
    `- **${notIndexed.length}** não indexadas`,
    `- **${errored.length}** com erro na inspeção`,
    `- **${staleContentPages.length}** página(s) de conteúdo fora do índice há ≥${INDEX_ALERT_DAYS} dias`,
    '',
    `## Sitemap`,
    '',
    sitemapCheck.alreadyRegistered
      ? '✅ Já registrado no GSC.'
      : sitemapCheck.submitted
        ? '✅ Não estava registrado — registrado automaticamente nesta execução.'
        : `❌ ${sitemapCheck.error}`,
    '',
    `## Por motivo (não indexadas)`,
    '',
    ...(byReason.size > 0
      ? [...byReason.entries()].map(([reason, n]) => `- ${reason}: ${n}`)
      : ['(nenhuma)']),
    '',
    `## Páginas de conteúdo há mais tempo fora do índice`,
    '',
    ...(staleContentPages.length > 0
      ? staleContentPages
          .slice(0, 50)
          .map(p => `- \`${p.url}\` — ${p.coverageState} (desde ${p.notIndexedSince})`)
      : ['(nenhuma — ótimo sinal)']),
  ].join('\n');

  writeFileSync(MD_OUT, md);
  console.log(`\n${md.split('\n').slice(4, 10).join('\n')}`);

  await openOrUpdateAlertIssue({ sitemapError: sitemapCheck.error, staleContentPages });

  console.log('\n=== Concluído ===');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
