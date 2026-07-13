/**
 * gsc-striking-distance.js — FASE 2 #2: impulso "striking distance".
 *
 * Buscas na posição 5–20 (perto da 1ª página) com impressões → a IA ACRESCENTA
 * uma seção nova respondendo exatamente àquela busca, reforçando a página. É
 * APPEND-ONLY: nunca reescreve/apaga conteúdo existente (a seção entra antes do
 * marcador <!-- SCHEMA_AUTO --> ou no fim). Full-auto, mas com travas:
 *  - heading não duplicado; seção com 80–320 palavras; corpo sempre CRESCE;
 *  - BLOQUEIO de números financeiros (R$/%/ano) que não existam já no post
 *    (anti-fabricação de estatística — YMYL);
 *  - rollback total se o gate i18n falhar; cap por run.
 *
 * SKIP GRACIOSO: sem GSC → exit 0; sem IA → exit 0. GSC_DRY_RUN=1 = simulação.
 */

import {
  hasGscCredentials, querySearchAnalytics, GSC_SITE_URL, dateRange,
  pageUrlToFile, readRaw, getScalar, writePatched,
  buildSafeSection, appendSection, sanitizeLine,
  i18nGatePasses, revertFiles, commitFiles, DRY_RUN,
} from '../lib/gsc-posts.js';
import { splitFrontmatter } from '../lib/i18n-sync.js';
import { generateText } from '../apis/kie-ai.js';

const IMP_MIN = 10;
const MIN_POS = 5;
const MAX_POS = 20;
const MAX_PER_RUN = 3; // conteúdo de corpo: cap conservador

const LANG = { pt: 'português do Brasil', en: 'inglês', es: 'espanhol' };

async function topQueryForPage(period, pageUrl) {
  const rows = await querySearchAnalytics({
    ...period, dimensions: ['query'], rowLimit: 3,
    filters: [{ filters: [{ dimension: 'page', operator: 'equals', expression: pageUrl }] }],
  });
  return rows.find(r => r.position >= MIN_POS && r.position <= MAX_POS)?.keys?.[0] || rows[0]?.keys?.[0] || null;
}

function parseSection(text) {
  const h = text.match(/---HEADING---\s*([\s\S]*?)(?=---TEXTO---|$)/);
  const t = text.match(/---TEXTO---\s*([\s\S]*?)$/);
  return { heading: h ? sanitizeLine(h[1]) : '', body: t ? t[1].trim() : '' };
}

async function main() {
  if (!hasGscCredentials()) { console.log('ℹ️ GSC: sem credenciais. Pulando striking-distance (exit 0).'); return; }
  const period = dateRange(28);
  console.log(`🔎 Striking: analisando ${GSC_SITE_URL} (${period.startDate} → ${period.endDate})...`);

  const rows = await querySearchAnalytics({ ...period, dimensions: ['page'], rowLimit: 5000 });
  if (!rows.length) { console.log('   Sem impressões ainda (GSC magro). Nada a fazer (exit 0).'); return; }

  const candidates = rows
    .filter(r => r.impressions >= IMP_MIN && r.position >= MIN_POS && r.position <= MAX_POS)
    .sort((a, b) => b.impressions - a.impressions);
  console.log(`   ${candidates.length} página(s) em striking distance. Cap: ${MAX_PER_RUN}.`);

  const editedFiles = [], editedNames = [];
  let done = 0, skipped = 0;

  for (const cand of candidates) {
    if (done >= MAX_PER_RUN) { skipped++; continue; }
    const file = pageUrlToFile(cand.keys[0]);
    if (!file) { console.log(`   ⏭️ sem arquivo p/ ${cand.keys[0]}`); skipped++; continue; }

    const raw = readRaw(file);
    const split = splitFrontmatter(raw);
    if (!split) { skipped++; continue; }
    const locale = file.startsWith('en-') ? 'en' : file.startsWith('es-') ? 'es' : 'pt';
    const title = getScalar(split.fm, 'title') || '';
    const query = await topQueryForPage(period, cand.keys[0]);
    if (!query) { skipped++; continue; }

    let ai;
    try {
      ai = await generateText(
        `Você é editor do blog FinMoovi (finanças pessoais). O artigo "${title}" já aparece na busca do Google para "${query}", mas na posição ${Math.round(cand.position)}. ` +
        `Escreva UMA seção NOVA e COMPLEMENTAR (não repita o que já foi dito) que responda diretamente a "${query}", em ${LANG[locale]}.\n\n` +
        `REGRAS: 120–220 palavras; um heading H2 curto e direto; conteúdo prático e honesto; NÃO invente números, percentuais, valores em R$ nem estatísticas; sem clickbait; markdown simples (parágrafos e no máximo uma lista curta).\n\n` +
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

    console.log(`   ➕ ${file}: +seção "${heading}" (query "${query}", pos ${Math.round(cand.position)})${DRY_RUN ? ' [dry-run]' : ''}`);
    editedFiles.push(`src/content/posts/${file}`);
    editedNames.push(file);
    done++;
  }

  if (!editedFiles.length) { console.log('   Nenhum reforço aplicado.'); return; }
  if (!DRY_RUN && !i18nGatePasses()) {
    console.log('   ❌ Gate i18n falhou — revertendo todas as edições.');
    revertFiles(editedNames);
    return;
  }
  commitFiles(editedFiles, `content(gsc): reforço striking-distance em ${done} página(s) [bot]`);
  console.log(`✅ Striking: ${done} reforçada(s), ${skipped} pulada(s).`);
}

main().catch(err => { console.error('❌ Striking:', err.message); process.exit(1); });
