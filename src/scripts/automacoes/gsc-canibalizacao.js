/**
 * gsc-canibalizacao.js — FASE 2 #4: canibalização por query (dados reais do GSC).
 *
 * Detecta ≥2 páginas do MESMO idioma competindo pela MESMA busca no GSC.
 * Ação AUTOMÁTICA (segura, reversível): consolida o sinal adicionando no post
 * mais FRACO um link "Veja também" para o post mais FORTE daquela busca
 * (append-only, dedup, sem fabricar nada). Ação DESTRUTIVA (mesclar/redirecionar/
 * apagar página) NÃO é automatizada — vira PROPOSTA em press/gsc-canibalizacao.md
 * para revisão humana (apagar conteúdo é exatamente o que "degrada" o site).
 *
 * SKIP GRACIOSO: sem GSC → exit 0. GSC_DRY_RUN=1 = simulação.
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import {
  hasGscCredentials, querySearchAnalytics, GSC_SITE_URL, dateRange,
  pageUrlToFile, readRaw, getScalar, writePatched, appendSection,
  i18nGatePasses, revertFiles, commitFiles, DRY_RUN,
} from '../lib/gsc-posts.js';
import { splitFrontmatter, localeFromFilename } from '../lib/i18n-sync.js';

const IMP_MIN = 2;      // impressões mínimas por página p/ contar na disputa
const MAX_PER_RUN = 3;  // cap de links de consolidação por execução
const PRESS_DIR = join(process.cwd(), 'press');
const REPORT = join(PRESS_DIR, 'gsc-canibalizacao.md');

const LEIA = { pt: 'Veja também', en: 'See also', es: 'Vea también' };
const PROCURA = {
  pt: q => `Se você procura por **${q}**, veja nosso conteúdo mais completo sobre o tema:`,
  en: q => `If you're looking for **${q}**, see our more complete guide on the topic:`,
  es: q => `Si busca **${q}**, vea nuestro contenido más completo sobre el tema:`,
};

function pathOf(url) { try { return new URL(url).pathname; } catch { return String(url); } }

async function main() {
  if (!hasGscCredentials()) { console.log('ℹ️ GSC: sem credenciais. Pulando canibalização (exit 0).'); return; }
  const period = dateRange(28);
  console.log(`🔎 Canibalização: analisando ${GSC_SITE_URL} (${period.startDate} → ${period.endDate})...`);

  const rows = await querySearchAnalytics({ ...period, dimensions: ['query', 'page'], rowLimit: 10000 });
  if (!rows.length) { console.log('   Sem impressões ainda (GSC magro). Nada a fazer (exit 0).'); return; }

  // Agrupa por query as páginas do MESMO idioma que a disputam.
  const byQuery = new Map();
  for (const r of rows) {
    if (r.impressions < IMP_MIN) continue;
    const [query, page] = r.keys;
    const file = pageUrlToFile(page);
    if (!file) continue;
    const locale = localeFromFilename(file);
    const key = `${locale}::${query}`;
    if (!byQuery.has(key)) byQuery.set(key, { query, locale, pages: [] });
    byQuery.get(key).pages.push({ page, file, clicks: r.clicks, impressions: r.impressions, position: r.position });
  }

  const conflicts = [...byQuery.values()]
    .filter(g => new Set(g.pages.map(p => p.file)).size >= 2)
    .map(g => {
      const pages = g.pages.sort((a, b) => (b.clicks - a.clicks) || (a.position - b.position));
      return { ...g, winner: pages[0], losers: pages.slice(1), total: pages.reduce((s, p) => s + p.impressions, 0) };
    })
    .sort((a, b) => b.total - a.total);

  console.log(`   ${conflicts.length} conflito(s) de canibalização detectado(s).`);

  // ── Ação automática segura: link de consolidação no post mais fraco ──
  const editedFiles = [], editedNames = [];
  let linked = 0;
  for (const c of conflicts) {
    if (linked >= MAX_PER_RUN) break;
    const winnerPath = pathOf(c.winner.page);
    for (const loser of c.losers) {
      if (linked >= MAX_PER_RUN) break;
      if (loser.file === c.winner.file) continue;
      const raw = readRaw(loser.file);
      const split = splitFrontmatter(raw);
      if (!split) continue;
      if (split.body.includes(winnerPath)) continue; // já linka → dedup
      const winnerTitle = getScalar(splitFrontmatter(readRaw(c.winner.file)).fm, 'title') || c.query;
      const section = `## ${LEIA[c.locale]}\n\n${PROCURA[c.locale](c.query)} [${winnerTitle}](${winnerPath})\n`;
      const appended = appendSection(split.body, section);
      if (!appended.ok) continue;
      const { changed } = writePatched(loser.file, split, { newBody: appended.newBody });
      if (!changed) continue;
      console.log(`   🔗 ${loser.file} → ${winnerPath} (query "${c.query}")${DRY_RUN ? ' [dry-run]' : ''}`);
      editedFiles.push(`src/content/posts/${loser.file}`);
      editedNames.push(loser.file);
      linked++;
    }
  }

  // ── Proposta (sempre): relatório para consolidação/redirect manual ──
  let md = `# 🔀 Canibalização por query (GSC) — propostas de consolidação\n\n`;
  md += `**Propriedade:** ${GSC_SITE_URL}\n**Período:** ${period.startDate} → ${period.endDate}\n**Gerado em:** ${new Date().toISOString()}\n\n`;
  if (!conflicts.length) {
    md += `_Nenhuma canibalização por query no período._\n`;
  } else {
    md += `> A automação já adicionou links de consolidação (post mais fraco → mais forte) onde seguro. A CONSOLIDAÇÃO destrutiva (mesclar/redirecionar/apagar) é decisão sua — abaixo, as sugestões.\n\n`;
    for (const c of conflicts) {
      md += `## "${c.query}" (${c.locale}) — ${c.total} impressões\n`;
      md += `- 🏆 mais forte: \`${c.winner.file}\` (${c.winner.clicks} cliques, pos ${c.winner.position.toFixed(1)})\n`;
      for (const l of c.losers) md += `- ⚠️ mais fraco: \`${l.file}\` (${l.clicks} cliques, pos ${l.position.toFixed(1)}) → considere consolidar/redirecionar para o mais forte\n`;
      md += `\n`;
    }
  }
  if (!DRY_RUN) { if (!existsSync(PRESS_DIR)) mkdirSync(PRESS_DIR, { recursive: true }); writeFileSync(REPORT, md); }

  // ── Gate + commit ──
  if (!DRY_RUN && editedNames.length && !i18nGatePasses()) {
    console.log('   ❌ Gate i18n falhou — revertendo edições de link (mantém só o relatório).');
    revertFiles(editedNames);
    editedFiles.length = 0;
  }
  const toCommit = [...editedFiles];
  if (!DRY_RUN) toCommit.push('press/gsc-canibalizacao.md');
  commitFiles(toCommit, `seo(gsc): consolidar canibalização (${linked} link[s]) + relatório [bot]`);
  console.log(`✅ Canibalização: ${linked} link(s) de consolidação, ${conflicts.length} conflito(s) reportado(s).`);
}

main().catch(err => { console.error('❌ Canibalização:', err.message); process.exit(1); });
