/**
 * gsc-otimizar-ctr.js — FASE 2 #1: reescritor de título/meta por CTR baixo.
 *
 * Páginas com BOA posição (≤10) mas CTR muito abaixo do esperado → a IA reescreve
 * SOMENTE title/description/seo.* no frontmatter (nunca o corpo). Full-auto, mas
 * com travas: comprimento de title (20–65) e meta (80–165), tema preservado
 * (≥1 token do título original), rollback se o gate i18n falhar, e cap por run.
 *
 * SKIP GRACIOSO: sem GSC → exit 0; sem provedor de IA → exit 0. GSC_DRY_RUN=1
 * mostra o que faria sem escrever/commitar.
 */

import {
  hasGscCredentials, querySearchAnalytics, GSC_SITE_URL, dateRange,
  pageUrlToFile, readRaw, getScalar, writePatched, splitPeriods,
  validateTitle, validateDescription, sanitizeLine,
  i18nGatePasses, revertFiles, commitFiles, DRY_RUN,
} from '../lib/gsc-posts.js';
import { splitFrontmatter } from '../lib/i18n-sync.js';
import { generateText } from '../apis/kie-ai.js';

const IMP_MIN = 10;         // impressões mínimas p/ a página valer otimização
const GOOD_POS_MAX = 10;    // "boa posição"
const CTR_RATIO_FLAG = 0.6; // CTR abaixo de 60% do esperado = candidata
const MAX_PER_RUN = 5;      // cap de páginas otimizadas por execução

const LANG = { pt: 'português do Brasil', en: 'inglês', es: 'espanhol' };

function expectedCtr(position) {
  const p = Math.round(position);
  const curve = { 1: 0.28, 2: 0.15, 3: 0.11, 4: 0.08, 5: 0.06, 6: 0.05, 7: 0.04, 8: 0.032, 9: 0.028, 10: 0.025 };
  if (p <= 0) return curve[1];
  return p <= 10 ? curve[p] : 0.02;
}

async function topQueryForPage(period, pageUrl) {
  const rows = await querySearchAnalytics({
    ...period, dimensions: ['query'], rowLimit: 1,
    filters: [{ filters: [{ dimension: 'page', operator: 'equals', expression: pageUrl }] }],
  });
  return rows[0]?.keys?.[0] || null;
}

function parseRewrite(text) {
  const t = text.match(/---TITULO---\s*([\s\S]*?)(?=---META---|$)/);
  const m = text.match(/---META---\s*([\s\S]*?)$/);
  return { title: t ? sanitizeLine(t[1]) : '', meta: m ? sanitizeLine(m[1]) : '' };
}

async function main() {
  if (!hasGscCredentials()) {
    console.log('ℹ️ GSC: sem credenciais. Pulando otimização de CTR (exit 0).');
    return;
  }
  const period = dateRange(28);
  console.log(`🔎 CTR: analisando ${GSC_SITE_URL} (${period.startDate} → ${period.endDate})...`);

  const rows = await querySearchAnalytics({ ...period, dimensions: ['page'], rowLimit: 5000 });
  if (!rows.length) { console.log('   Sem impressões ainda (GSC magro). Nada a fazer (exit 0).'); return; }

  const candidates = rows
    .filter(r => r.impressions >= IMP_MIN && r.position <= GOOD_POS_MAX && r.ctr < expectedCtr(r.position) * CTR_RATIO_FLAG)
    .sort((a, b) => b.impressions - a.impressions);

  console.log(`   ${candidates.length} página(s) com CTR baixo. Cap: ${MAX_PER_RUN}.`);

  const editedFiles = [];   // caminhos relativos p/ commit
  const editedNames = [];   // filenames p/ rollback
  let done = 0, skipped = 0;

  for (const cand of candidates) {
    if (done >= MAX_PER_RUN) { skipped++; continue; }
    const file = pageUrlToFile(cand.keys[0]);
    if (!file) { console.log(`   ⏭️ sem arquivo p/ ${cand.keys[0]}`); skipped++; continue; }

    const raw = readRaw(file);
    const split = splitFrontmatter(raw);
    if (!split) { skipped++; continue; }
    const locale = file.startsWith('en-') ? 'en' : file.startsWith('es-') ? 'es' : 'pt';
    const oldTitle = getScalar(split.fm, 'title') || '';
    const query = (await topQueryForPage(period, cand.keys[0])) || oldTitle;

    let ai;
    try {
      ai = await generateText(
        `Você é editor de SEO. Reescreva o TÍTULO e a META DESCRIÇÃO de um artigo para AUMENTAR o CTR na busca do Google, em ${LANG[locale]}.\n` +
        `Busca principal que traz esta página: "${query}"\nTítulo atual: "${oldTitle}"\n\n` +
        `REGRAS: mantenha o MESMO tema/assunto (não invente novo); título com 50–60 caracteres, keyword no início, atraente e honesto (sem clickbait falso, sem inventar números/estatísticas); meta com 150–160 caracteres, clara e com chamada para ação suave. Não use aspas.\n\n` +
        `Formato EXATO:\n---TITULO---\n[título]\n---META---\n[meta]`,
        { maxTokens: 400, temperature: 0.7 },
      );
    } catch (e) {
      if (/Nenhum provedor/.test(e.message)) { console.log('ℹ️ Sem provedor de IA. Encerrando (exit 0).'); break; }
      console.log(`   ⚠️ IA falhou p/ ${file}: ${e.message}`); skipped++; continue;
    }

    const { title, meta } = parseRewrite(ai);
    const vt = validateTitle(title, oldTitle);
    const vd = validateDescription(meta);
    if (!vt.ok) { console.log(`   ⏭️ ${file}: título rejeitado (${vt.reason})`); skipped++; continue; }
    if (!vd.ok) { console.log(`   ⏭️ ${file}: meta rejeitada (${vd.reason})`); skipped++; continue; }

    const today = new Date().toISOString().split('T')[0];
    const { changed } = writePatched(file, split, {
      title: vt.value, description: vd.value, seoTitle: vt.value, seoDescription: vd.value, updatedAt: today,
    });
    if (!changed) { console.log(`   ⏭️ ${file}: sem mudança efetiva`); skipped++; continue; }

    console.log(`   ✏️ ${file}: "${oldTitle}" → "${vt.value}"${DRY_RUN ? ' [dry-run]' : ''}`);
    editedFiles.push(`src/content/posts/${file}`);
    editedNames.push(file);
    done++;
  }

  if (!editedFiles.length) { console.log('   Nenhuma otimização aplicada.'); return; }

  if (!DRY_RUN && !i18nGatePasses()) {
    console.log('   ❌ Gate i18n falhou — revertendo todas as edições.');
    revertFiles(editedNames);
    return;
  }
  commitFiles(editedFiles, `seo(gsc): otimizar title/meta por CTR em ${done} página(s) [bot]`);
  console.log(`✅ CTR: ${done} otimizada(s), ${skipped} pulada(s).`);
}

main().catch(err => { console.error('❌ CTR:', err.message); process.exit(1); });
