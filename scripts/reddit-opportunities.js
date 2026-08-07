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
//
// 📌 07/08/2026 — lista revista junto com a troca para RSS. Saíram `brasileiros`
// (não confirmado que exista) e `budget` (substituído por `budgeting`); entrou
// `literaciafinanceira`, o maior de língua portuguesa sobre o tema (114 mil).
// ⚠️ Subreddit inexistente aparece como **404 no registro da corrida** — é lá
// que se confere a lista, não aqui.
const SUBREDDITS = [
  'financaspessoais',
  'investimentos',
  'literaciafinanceira',
  'personalfinance',
  'FinancialPlanning',
  'povertyfinance'
];
// ⚠️ `budgeting` foi tentado e REMOVIDO em 07/08: devolve **403 sempre** — na
// máquina do dono e no GitHub, mesmo depois das 3 tentativas. Não é limite de
// ritmo (isso seria 429); aquele subreddit não serve o RSS. Cada tentativa dele
// custava ~60s à corrida. Não voltar a pôr sem medir de novo.

const MAX_OPPORTUNITIES = 50;
const MAX_AGE_DAYS = 30;
const HOURS_48 = 48 * 60 * 60; // 48h in seconds

/**
 * 🔴 07/08/2026 — AS ESPERAS SUBIRAM DE 2-3s PARA 8-15s, E NÃO É EXAGERO.
 *
 * O RSS do Reddit corta o ritmo com **429** muito mais cedo do que a antiga API
 * de JSON. Medido: com 1s entre pedidos, 10 de 11 subreddits vieram 429; com 12s,
 * ainda houve 429. Por isso, além da espera maior, há **repetição com recuo**
 * (`fetchSubreddit`) — só desiste depois de 3 tentativas.
 */
const DELAY_MIN = 8000;
const DELAY_MAX = 15000;
const MAX_TENTATIVAS = 3;
const ESPERA_APOS_429 = 20000;

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

/**
 * 🔴 07/08/2026 — POR QUE ISTO DEIXOU DE SER `new.json` E PASSOU A SER RSS.
 *
 * Este robô rodou **28 dias seguidos sem achar nada** e a corrida ficava **verde**,
 * porque o `catch` do laço principal engolia o erro. O registro da corrida de
 * 07/08 mostrou a verdade: **os 6 subreddits devolveram `HTTP 403`**, todos os dias.
 *
 * ⚠️ E não era o IP do GitHub: o mesmo endereço devolve **403 na máquina do dono
 * também**. O Reddit fechou o `.json` sem autenticação para todo mundo — a mesma
 * política que, em 07/08, impediu criar um app novo (o cadastro automático da API
 * do Reddit está fechado desde 2026, ver IMPLEMENTACAO26 §10).
 *
 * ✅ **O RSS continua aberto e sem chave** (`/new/.rss`, medido: `200`). É Atom, e
 * traz o que este robô precisa: título, link, data e o corpo do post.
 *
 * ⚠️ Em troca, ele **corta o ritmo com 429** com muito mais facilidade. Daí as
 * esperas maiores e a repetição abaixo.
 */
function decodificarEntidades(texto) {
  return String(texto)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&');
}

function semEtiquetas(html) {
  return decodificarEntidades(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Converte uma entrada do Atom no mesmo formato que o laço principal já esperava
 * (`{ data: { title, selftext, created_utc, permalink } }`), para que a troca do
 * RSS não obrigue a mexer no resto do robô.
 */
function entradaParaPost(bloco) {
  const titulo = bloco.match(/<title>([\s\S]*?)<\/title>/);
  const link = bloco.match(/<link[^>]*href="([^"]+)"/);
  const data = bloco.match(/<published>([\s\S]*?)<\/published>/) || bloco.match(/<updated>([\s\S]*?)<\/updated>/);
  const corpo = bloco.match(/<content[^>]*>([\s\S]*?)<\/content>/);

  if (!titulo || !link || !data) return null;

  const quando = Date.parse(data[1].trim());
  if (Number.isNaN(quando)) return null;

  // O laço principal monta `https://reddit.com${permalink}` — guardamos só o caminho.
  let caminho;
  try {
    caminho = new URL(link[1]).pathname;
  } catch {
    return null;
  }

  return {
    data: {
      title: decodificarEntidades(titulo[1].trim()),
      selftext: corpo ? semEtiquetas(corpo[1]) : '',
      created_utc: Math.floor(quando / 1000),
      permalink: caminho
    }
  };
}

async function fetchSubreddit(subreddit) {
  const url = `https://www.reddit.com/r/${subreddit}/new/.rss`;
  let ultimoErro = '';

  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/atom+xml, application/xml' }
    });

    if (response.ok) {
      const xml = await response.text();
      const blocos = xml.split('<entry>').slice(1);
      return blocos.map(entradaParaPost).filter(Boolean);
    }

    ultimoErro = `HTTP ${response.status} for r/${subreddit}`;

    // 429 = "devagar". Só isso vale repetir; 404 (subreddit inexistente) não.
    if (response.status !== 429 || tentativa === MAX_TENTATIVAS) break;

    console.log(`[Reddit Monitor] 429 em r/${subreddit} — tentativa ${tentativa}/${MAX_TENTATIVAS}, esperando ${ESPERA_APOS_429 / 1000}s...`);
    await sleep(ESPERA_APOS_429 * tentativa);
  }

  throw new Error(ultimoErro);
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
  const falhas = [];

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
      falhas.push(`r/${subreddit}: ${error.message}`);
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

  /**
   * 🔴 O RESUMO DE FALHAS EXISTE PORQUE ELE FALTOU DURANTE 28 DIAS.
   *
   * Sem esta linha, uma corrida em que **todos** os subreddits recusam termina
   * exatamente igual a uma corrida em que simplesmente não houve post novo:
   * verde, "0 oportunidades", e a página `/status` dizendo "o monitor segue
   * vigiando". Foi assim que o 403 passou quatro semanas despercebido.
   */
  console.log(`[Reddit Monitor] Subreddits com falha: ${falhas.length} de ${SUBREDDITS.length}`);
  for (const f of falhas) console.log(`[Reddit Monitor]   ✗ ${f}`);
  if (falhas.length === SUBREDDITS.length) {
    console.log('[Reddit Monitor] 🔴 ATENÇÃO: NENHUM subreddit respondeu. O "0 oportunidades" acima NÃO quer dizer que não havia posts — quer dizer que o robô não conseguiu ler nada.');
  }
}

main().catch(error => {
  console.error('[Reddit Monitor] Fatal error:', error.message);
  process.exit(1);
});
