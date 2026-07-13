/**
 * gsc-oportunidades.js — FASE 1 do Motor de Conteúdo guiado por GSC (Seção 42.10).
 *
 * Puxa métricas REAIS do Google Search Console (últimos 28 dias) e calcula um
 * digest priorizado de OPORTUNIDADES — sem gerar nem otimizar conteúdo (isso é
 * Fase 2/3). Escreve:
 *   - .github/data/gsc-oportunidades.json  (saída estruturada, consumida pelas próximas fases)
 *   - press/gsc-oportunidades.md           (relatório legível)
 *
 * Categorias de oportunidade:
 *   1. striking-distance  → queries na posição 5–20 com impressões (perto da 1ª página).
 *   2. CTR baixo          → boa posição (≤10) mas CTR abaixo do esperado (heurística).
 *   3. lacunas (gaps)     → query com impressão SEM página dedicada (reusa seo-guard).
 *   4. canibalização      → ≥2 páginas competindo pela MESMA query no GSC.
 *
 * SKIP GRACIOSO: sem GSC_SERVICE_ACCOUNT_JSON, sai com exit 0 SEM sobrescrever os
 * outputs existentes (padrão do repo). Não fabrica dados: se o GSC voltar vazio
 * (blog novo, dados magros), marca hasData=false e diz "aguardando dados".
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { hasGscCredentials, querySearchAnalytics, GSC_SITE_URL } from '../apis/gsc.js';
import { slugifyTheme, coreTokens, jaccardSim, getExistingPtSlugs } from '../lib/seo-guard.js';

// ── Config / thresholds (baixos de propósito: GSC recém-ativado, dados magros) ──
const LOOKBACK_DAYS = 28;
const IMP_MIN = 3;                 // impressões mínimas p/ considerar uma query relevante
const STRIKING_MIN_POS = 5;        // posição mínima da faixa striking-distance
const STRIKING_MAX_POS = 20;       // posição máxima da faixa striking-distance
const GOOD_POS_MAX = 10;           // "boa posição" p/ análise de CTR
const CTR_RATIO_FLAG = 0.5;        // CTR abaixo de 50% do esperado = oportunidade
const CANNIBAL_MIN_IMP = 2;        // impressões mínimas por página p/ contar na canibalização
const TOP_N = 25;                  // teto de itens por categoria no output

const DATA_DIR = join(process.cwd(), '.github', 'data');
const PRESS_DIR = join(process.cwd(), 'press');
const JSON_OUT = join(DATA_DIR, 'gsc-oportunidades.json');
const MD_OUT = join(PRESS_DIR, 'gsc-oportunidades.md');

/** CTR esperado por posição (heurística de priorização — NÃO é dado do GSC). */
function expectedCtr(position) {
  const p = Math.round(position);
  const curve = {
    1: 0.28, 2: 0.15, 3: 0.11, 4: 0.08, 5: 0.06,
    6: 0.05, 7: 0.04, 8: 0.032, 9: 0.028, 10: 0.025,
  };
  if (p <= 0) return curve[1];
  if (p <= 10) return curve[p];
  return 0.02; // posições 11+ com baixa expectativa
}

function fmtDate(d) {
  return d.toISOString().split('T')[0];
}

function dateRange() {
  const end = new Date();
  const start = new Date(end.getTime() - LOOKBACK_DAYS * 86400000);
  return { startDate: fmtDate(start), endDate: fmtDate(end) };
}

/** Uma query já tem página dedicada? (reusa a lógica de tokens do seo-guard) */
function hasDedicatedPage(query, slugs) {
  const qSlug = slugifyTheme(query);
  if (!qSlug) return true; // query vazia/estranha: não tratar como lacuna
  const qCore = coreTokens(qSlug);
  if (qCore.size === 0) return true;
  // Queries de 1 token (head terms: "dolar", "pix") não alcançam 2 compartilhados;
  // exige min(2, nº de tokens) para não marcá-las como lacuna indevidamente.
  const need = Math.min(2, qCore.size);
  for (const slug of slugs) {
    const core = coreTokens(slug);
    const shared = [...qCore].filter(x => core.has(x));
    if (shared.length >= need || jaccardSim(qCore, core) >= 0.5) return true;
  }
  return false;
}

function analyze(queryRows, queryPageRows) {
  const slugs = getExistingPtSlugs();

  // 1. Striking distance — posição 5–20 com impressões.
  const strikingDistance = queryRows
    .filter(r => r.impressions >= IMP_MIN && r.position >= STRIKING_MIN_POS && r.position <= STRIKING_MAX_POS)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, TOP_N)
    .map(r => ({
      query: r.keys[0],
      impressions: r.impressions,
      clicks: r.clicks,
      position: Number(r.position.toFixed(1)),
      ctr: Number((r.ctr * 100).toFixed(2)),
    }));

  // 2. CTR baixo — boa posição, CTR muito abaixo do esperado.
  const lowCtr = queryRows
    .filter(r => r.impressions >= IMP_MIN && r.position <= GOOD_POS_MAX && r.ctr < expectedCtr(r.position) * CTR_RATIO_FLAG)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, TOP_N)
    .map(r => ({
      query: r.keys[0],
      impressions: r.impressions,
      clicks: r.clicks,
      position: Number(r.position.toFixed(1)),
      ctr: Number((r.ctr * 100).toFixed(2)),
      expectedCtr: Number((expectedCtr(r.position) * 100).toFixed(2)),
    }));

  // 3. Lacunas — query com impressão sem página dedicada.
  const gaps = queryRows
    .filter(r => r.impressions >= IMP_MIN && !hasDedicatedPage(r.keys[0], slugs))
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, TOP_N)
    .map(r => ({
      query: r.keys[0],
      impressions: r.impressions,
      clicks: r.clicks,
      position: Number(r.position.toFixed(1)),
      suggestedSlug: slugifyTheme(r.keys[0]),
    }));

  // 4. Canibalização por query — ≥2 páginas competindo pela mesma query.
  const byQuery = new Map();
  for (const r of queryPageRows) {
    if (r.impressions < CANNIBAL_MIN_IMP) continue;
    const [query, page] = r.keys;
    if (!byQuery.has(query)) byQuery.set(query, []);
    byQuery.get(query).push({ page, impressions: r.impressions, clicks: r.clicks, position: Number(r.position.toFixed(1)) });
  }
  const cannibalization = [...byQuery.entries()]
    .filter(([, pages]) => pages.length >= 2)
    .map(([query, pages]) => ({
      query,
      totalImpressions: pages.reduce((s, p) => s + p.impressions, 0),
      pages: pages.sort((a, b) => b.impressions - a.impressions),
    }))
    .sort((a, b) => b.totalImpressions - a.totalImpressions)
    .slice(0, TOP_N);

  return { strikingDistance, lowCtr, gaps, cannibalization };
}

function buildReport({ period, totals, opportunities, hasData, generatedAt }) {
  let md = `# 🔎 GSC — Digest de Oportunidades (Fase 1)\n\n`;
  md += `**Propriedade:** ${GSC_SITE_URL}\n`;
  md += `**Período:** ${period.startDate} → ${period.endDate} (${LOOKBACK_DAYS} dias)\n`;
  md += `**Gerado em:** ${generatedAt}\n\n`;

  if (!hasData) {
    md += `> ⏳ **Aguardando dados do GSC.** A propriedade foi verificada recentemente e ainda não há impressões suficientes no período. Este relatório se preenche sozinho conforme o blog ganha tráfego (motor de médio prazo — ver Seção 42.10). Nenhum dado foi inventado.\n`;
    return md;
  }

  md += `**Totais no período:** ${totals.queries} queries · ${totals.impressions} impressões · ${totals.clicks} cliques\n\n`;

  md += `## 1. 🎯 Striking distance (posição ${STRIKING_MIN_POS}–${STRIKING_MAX_POS} — perto da 1ª página)\n\n`;
  if (opportunities.strikingDistance.length) {
    md += `| Query | Impr. | Cliques | Posição | CTR |\n|---|---|---|---|---|\n`;
    for (const o of opportunities.strikingDistance) md += `| ${o.query} | ${o.impressions} | ${o.clicks} | ${o.position} | ${o.ctr}% |\n`;
  } else md += `_Nenhuma no período._\n`;

  md += `\n## 2. 📉 CTR baixo (boa posição, poucos cliques — reescrever title/meta na Fase 2)\n\n`;
  if (opportunities.lowCtr.length) {
    md += `| Query | Impr. | Posição | CTR | CTR esperado |\n|---|---|---|---|---|\n`;
    for (const o of opportunities.lowCtr) md += `| ${o.query} | ${o.impressions} | ${o.position} | ${o.ctr}% | ~${o.expectedCtr}% |\n`;
  } else md += `_Nenhuma no período._\n`;

  md += `\n## 3. 🕳️ Lacunas (busca com impressão SEM página dedicada — candidatas à Fase 3)\n\n`;
  if (opportunities.gaps.length) {
    md += `| Query | Impr. | Posição | Slug sugerido |\n|---|---|---|---|\n`;
    for (const o of opportunities.gaps) md += `| ${o.query} | ${o.impressions} | ${o.position} | \`${o.suggestedSlug}\` |\n`;
  } else md += `_Nenhuma no período._\n`;

  md += `\n## 4. 🔀 Canibalização por query (≥2 páginas na mesma busca — consolidar na Fase 2)\n\n`;
  if (opportunities.cannibalization.length) {
    for (const o of opportunities.cannibalization) {
      md += `- **${o.query}** (${o.totalImpressions} impr.): ${o.pages.map(p => `${p.page} (${p.impressions})`).join(' · ')}\n`;
    }
  } else md += `_Nenhuma no período._\n`;

  md += `\n---\n_CTR esperado é heurística de priorização, não dado do GSC. Gerado automaticamente pelo motor GSC (Fase 1)._\n`;
  return md;
}

async function main() {
  // Skip gracioso: sem credenciais, não sobrescreve nada e sai 0.
  if (!hasGscCredentials()) {
    console.log('ℹ️ GSC: credenciais ausentes (GSC_SERVICE_ACCOUNT_JSON). Pulando análise de oportunidades (exit 0).');
    return;
  }

  const period = dateRange();
  console.log(`🔎 GSC: consultando ${GSC_SITE_URL} (${period.startDate} → ${period.endDate})...`);

  const [queryRows, queryPageRows] = await Promise.all([
    querySearchAnalytics({ ...period, dimensions: ['query'], rowLimit: 5000 }),
    querySearchAnalytics({ ...period, dimensions: ['query', 'page'], rowLimit: 10000 }),
  ]);

  const hasData = queryRows.length > 0;
  const opportunities = hasData
    ? analyze(queryRows, queryPageRows)
    : { strikingDistance: [], lowCtr: [], gaps: [], cannibalization: [] };

  const totals = {
    queries: queryRows.length,
    pages: new Set(queryPageRows.map(r => r.keys[1])).size,
    impressions: queryRows.reduce((s, r) => s + (r.impressions || 0), 0),
    clicks: queryRows.reduce((s, r) => s + (r.clicks || 0), 0),
  };

  const generatedAt = new Date().toISOString();
  const payload = { generatedAt, siteUrl: GSC_SITE_URL, period, hasData, totals, opportunities };

  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(PRESS_DIR)) mkdirSync(PRESS_DIR, { recursive: true });
  writeFileSync(JSON_OUT, JSON.stringify(payload, null, 2) + '\n');
  writeFileSync(MD_OUT, buildReport(payload));

  console.log(`✅ GSC: ${totals.queries} queries · ${totals.impressions} impressões.`);
  console.log(`   Oportunidades → striking:${opportunities.strikingDistance.length} · ctr-baixo:${opportunities.lowCtr.length} · lacunas:${opportunities.gaps.length} · canibalização:${opportunities.cannibalization.length}`);
  console.log(`   Escrito: ${JSON_OUT} + ${MD_OUT}`);
  if (!hasData) console.log('   (Sem impressões ainda — relatório marcado como "aguardando dados". Normal p/ GSC recém-ativado.)');
}

main().catch(err => {
  console.error('❌ GSC: erro na análise de oportunidades:', err.message);
  process.exit(1);
});
