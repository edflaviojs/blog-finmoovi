/**
 * gsc-refresh-decay.js — FASE 2 #3: refresh de conteúdo em decaimento.
 *
 * Compara a metade RECENTE vs. a ANTERIOR de uma janela de 56 dias e detecta
 * posts perdendo cliques/posição. Para cada um, a IA acrescenta uma seção de
 * atualização COMPLEMENTAR (append-only) e sobe o `updatedAt`. A data de
 * atualização só muda quando o conteúdo realmente muda (nada de "freshness"
 * falso). Mesmas travas do #2 (append-only, sem número fabricado, rollback, cap).
 *
 * SKIP GRACIOSO: sem GSC → exit 0; sem IA → exit 0. GSC_DRY_RUN=1 = simulação.
 */

import {
  hasGscCredentials, querySearchAnalytics, GSC_SITE_URL, splitPeriods,
  pageUrlToFile, readRaw, getScalar, writePatched,
  buildSafeSection, appendSection, sanitizeLine,
  i18nGatePasses, revertFiles, commitFiles, DRY_RUN,
} from '../lib/gsc-posts.js';
import { splitFrontmatter } from '../lib/i18n-sync.js';
import { generateText } from '../apis/kie-ai.js';

const IMP_MIN = 15;          // impressões no período ANTERIOR p/ valer refresh
const CLICK_DROP_RATIO = 0.6; // cliques recentes < 60% dos anteriores = decay
const POS_DROP_MIN = 3;       // ou piora de ≥3 posições
const MAX_PER_RUN = 3;

const LANG = { pt: 'português do Brasil', en: 'inglês', es: 'espanhol' };

async function metricsByPage(period) {
  const rows = await querySearchAnalytics({ ...period, dimensions: ['page'], rowLimit: 5000 });
  const map = new Map();
  for (const r of rows) map.set(r.keys[0], { clicks: r.clicks, impressions: r.impressions, position: r.position });
  return map;
}

function parseSection(text) {
  const h = text.match(/---HEADING---\s*([\s\S]*?)(?=---TEXTO---|$)/);
  const t = text.match(/---TEXTO---\s*([\s\S]*?)$/);
  return { heading: h ? sanitizeLine(h[1]) : '', body: t ? t[1].trim() : '' };
}

async function main() {
  if (!hasGscCredentials()) { console.log('ℹ️ GSC: sem credenciais. Pulando refresh/decay (exit 0).'); return; }
  const { recent, older } = splitPeriods(56);
  console.log(`🔎 Decay: comparando ${older.startDate}…${older.endDate} vs ${recent.startDate}…${recent.endDate} (${GSC_SITE_URL})`);

  const [recentM, olderM] = await Promise.all([metricsByPage(recent), metricsByPage(older)]);
  if (!olderM.size) { console.log('   Sem histórico ainda (GSC magro). Nada a fazer (exit 0).'); return; }

  const candidates = [];
  for (const [url, o] of olderM) {
    if (o.impressions < IMP_MIN) continue;
    const r = recentM.get(url) || { clicks: 0, impressions: 0, position: 100 };
    const clickDecay = o.clicks > 0 && r.clicks < o.clicks * CLICK_DROP_RATIO;
    const posDecay = r.position - o.position >= POS_DROP_MIN;
    if (clickDecay || posDecay) candidates.push({ url, older: o, recent: r });
  }
  candidates.sort((a, b) => b.older.impressions - a.older.impressions);
  console.log(`   ${candidates.length} página(s) em decaimento. Cap: ${MAX_PER_RUN}.`);

  const editedFiles = [], editedNames = [];
  let done = 0, skipped = 0;

  for (const cand of candidates) {
    if (done >= MAX_PER_RUN) { skipped++; continue; }
    const file = pageUrlToFile(cand.url);
    if (!file) { console.log(`   ⏭️ sem arquivo p/ ${cand.url}`); skipped++; continue; }

    const raw = readRaw(file);
    const split = splitFrontmatter(raw);
    if (!split) { skipped++; continue; }
    const locale = file.startsWith('en-') ? 'en' : file.startsWith('es-') ? 'es' : 'pt';
    const title = getScalar(split.fm, 'title') || '';

    let ai;
    try {
      ai = await generateText(
        `Você é editor do blog FinMoovi (finanças pessoais). O artigo "${title}" está perdendo relevância na busca do Google. ` +
        `Escreva UMA seção de ATUALIZAÇÃO curta e COMPLEMENTAR (não repita o que já existe) que agregue algo útil e atual ao tema, em ${LANG[locale]}.\n\n` +
        `REGRAS: 100–200 palavras; um heading H2 curto; conteúdo prático e honesto; NÃO invente números, percentuais, valores em R$, datas nem estatísticas; sem clickbait; markdown simples.\n\n` +
        `Formato EXATO:\n---HEADING---\n[título da seção, sem "##"]\n---TEXTO---\n[texto]`,
        { maxTokens: 700, temperature: 0.7 },
      );
    } catch (e) {
      if (/Nenhum provedor/.test(e.message)) { console.log('ℹ️ Sem provedor de IA. Encerrando (exit 0).'); break; }
      console.log(`   ⚠️ IA falhou p/ ${file}: ${e.message}`); skipped++; continue;
    }

    const { heading, body } = parseSection(ai);
    const safe = buildSafeSection(heading, body, split.body);
    if (!safe.ok) { console.log(`   ⏭️ ${file}: seção rejeitada (${safe.reason})`); skipped++; continue; }
    const appended = appendSection(split.body, safe.section);
    if (!appended.ok) { console.log(`   ⏭️ ${file}: append rejeitado (${appended.reason})`); skipped++; continue; }

    const today = new Date().toISOString().split('T')[0];
    const { changed } = writePatched(file, split, { newBody: appended.newBody, updatedAt: today });
    if (!changed) { skipped++; continue; }

    console.log(`   🔄 ${file}: refresh "+${heading}" (cliques ${cand.older.clicks}→${cand.recent.clicks})${DRY_RUN ? ' [dry-run]' : ''}`);
    editedFiles.push(`src/content/posts/${file}`);
    editedNames.push(file);
    done++;
  }

  if (!editedFiles.length) { console.log('   Nenhum refresh aplicado.'); return; }
  if (!DRY_RUN && !i18nGatePasses()) {
    console.log('   ❌ Gate i18n falhou — revertendo todas as edições.');
    revertFiles(editedNames);
    return;
  }
  commitFiles(editedFiles, `content(gsc): refresh de conteúdo em decaimento em ${done} página(s) [bot]`);
  console.log(`✅ Decay: ${done} atualizada(s), ${skipped} pulada(s).`);
}

main().catch(err => { console.error('❌ Decay:', err.message); process.exit(1); });
