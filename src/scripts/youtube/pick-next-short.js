/**
 * Escolhe o PRÓXIMO tema a virar Short (F1.5 — cron diário).
 *
 * Lê DUAS fontes de temas:
 *   1. .github/data/youtube-topics.json (editoriais — prioridade)
 *   2. Glossário PT src/content/glossario/*.md (fallback)
 *
 * Lógica de selecção:
 *   - Se há temas editoriais com status "pending" → usa esses primeiro
 *   - Score por trend (igual ao anterior) + bonus +30 para editoriais
 *   - Quando editorial é escolhido, output inclui o `angle` para o roteiro
 *   - Se não há editoriais pending → fallback para glossário (como antes)
 *
 * Read-only: nunca escreve nada. Serve só de "próximo da fila" pro workflow.
 *
 * Uso:
 *   node src/scripts/youtube/pick-next-short.js            → imprime o slug/id
 *   node src/scripts/youtube/pick-next-short.js --verbose  → + contagens
 *
 * Saída pro workflow:
 *   - Se editorial: imprime `EDITORIAL:<id>` na ÚLTIMA linha do stdout
 *   - Se glossário: imprime o slug (como antes)
 *   - GITHUB_OUTPUT: `slug=<valor>`, `remaining=<n>`, `source=editorial|glossario`
 *
 * Código de saída:
 *   0  → achou um tema (impresso).
 *   78 → ambas as fontes esgotadas (nada a fazer). Código distinto p/ o workflow
 *        tratar como "sucesso neutro" (não é falha).
 *   1  → erro real (diretório/arquivo ausente etc.).
 */

import { readdirSync, readFileSync, existsSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const GLOSSARIO_DIR = join(ROOT, 'src', 'content', 'glossario');
const TRACKING = join(ROOT, '.github', 'data', 'youtube-published.json');
const TOPICS_PATH = join(ROOT, '.github', 'data', 'youtube-topics.json');
const TRENDS_PATH = join(ROOT, '.github', 'data', 'youtube-trends.json');

const NOTHING_TO_DO = 78;

const args = new Set(process.argv.slice(2));
const VERBOSE = args.has('--verbose');

// ─── Editoriais ───────────────────────────────────────────────────────────────

/** Lê os temas editoriais pendentes de youtube-topics.json */
function listPendingEditorials() {
  if (!existsSync(TOPICS_PATH)) return [];
  try {
    const data = JSON.parse(readFileSync(TOPICS_PATH, 'utf-8'));
    const topics = Array.isArray(data?.topics) ? data.topics : [];
    return topics.filter((t) => t.status === 'pending');
  } catch {
    return [];
  }
}

// ─── Glossário ────────────────────────────────────────────────────────────────

/** Termos PT = *.md SEM prefixo de tradução (en-/es-). */
function listPtSlugs() {
  if (!existsSync(GLOSSARIO_DIR)) {
    throw new Error(`glossário não encontrado: ${GLOSSARIO_DIR}`);
  }
  return readdirSync(GLOSSARIO_DIR)
    .filter((f) => f.endsWith('.md'))
    .filter((f) => !/^(en|es)-/.test(f))
    .map((f) => f.slice(0, -3))
    .sort();
}

/** Slugs já publicados (chaves do tracking). */
function listPublished() {
  if (!existsSync(TRACKING)) return new Set();
  try {
    const data = JSON.parse(readFileSync(TRACKING, 'utf-8')) || {};
    return new Set(Object.keys(data));
  } catch {
    return new Set();
  }
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

/** Carrega trend data uma vez. */
function loadTrends() {
  if (!existsSync(TRENDS_PATH)) return null;
  try {
    return JSON.parse(readFileSync(TRENDS_PATH, 'utf-8'));
  } catch {
    return null;
  }
}

/** Score a term/topic by trend relevance. */
function scoreTerm(slug, trendData) {
  let score = 0;
  if (trendData?.aggregate?.sampleTitles) {
    const slugWords = slug.replace(/-/g, ' ').toLowerCase();
    const inTrending = trendData.aggregate.sampleTitles.some(
      (t) => slugWords.split(' ').some((w) => w.length > 4 && t.toLowerCase().includes(w))
    );
    if (inTrending) score += 50;
  }
  if (trendData?.aggregate?.pillarHeat) {
    const totalHeat = Object.values(trendData.aggregate.pillarHeat).reduce((a, b) => a + b, 0);
    if (totalHeat > 0) score += 10;
  }
  // Small random factor for variety
  score += Math.random() * 10;
  return score;
}

/** Score editorial topic (uses id as slug for trend matching + bonus). */
function scoreEditorial(topic, trendData) {
  const baseScore = scoreTerm(topic.id, trendData);
  // Bonus fixo para editoriais (prioridade sobre glossário)
  return baseScore + 30;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const published = listPublished();
  const trendData = loadTrends();

  // 1. Tentar editoriais pendentes primeiro
  const pendingEditorials = listPendingEditorials().filter((t) => !published.has(t.id));

  if (pendingEditorials.length > 0) {
    const scored = pendingEditorials.map((t) => ({ topic: t, score: scoreEditorial(t, trendData) }));
    scored.sort((a, b) => b.score - a.score);
    const chosen = scored[0].topic;

    if (VERBOSE) {
      console.error(`📋 temas editoriais pending: ${pendingEditorials.length}`);
      console.error(`🔥 seleção editorial: ${chosen.id} (score: ${scored[0].score.toFixed(1)})`);
      console.error(`📐 ângulo: ${chosen.angle}`);
      console.error(`➡️  fonte: editorial`);
    }

    // GITHUB_OUTPUT
    if (process.env.GITHUB_OUTPUT) {
      appendFileSync(
        process.env.GITHUB_OUTPUT,
        `slug=EDITORIAL:${chosen.id}\nremaining=${pendingEditorials.length}\nsource=editorial\n`
      );
    }

    // Última linha do stdout: EDITORIAL:<id>
    console.log(`EDITORIAL:${chosen.id}`);
    return;
  }

  // 2. Fallback para glossário
  const all = listPtSlugs();
  const remaining = all.filter((s) => !published.has(s));

  if (VERBOSE) {
    console.error(`📋 temas editoriais pending: 0 (fallback glossário)`);
    console.error(`📚 termos PT no glossário : ${all.length}`);
    console.error(`✅ já publicados          : ${published.size}`);
    console.error(`🎬 restantes na fila      : ${remaining.length}`);
  }

  if (remaining.length === 0) {
    console.error('glossário esgotado 🎉 — todos os termos PT já viraram Short.');
    process.exit(NOTHING_TO_DO);
  }

  // Trend-scored selection (fallback to alphabetical if no trend data)
  let next;
  if (trendData) {
    try {
      const scored = remaining.map((slug) => ({ slug, score: scoreTerm(slug, trendData) }));
      scored.sort((a, b) => b.score - a.score);
      next = scored[0].slug;
      if (VERBOSE) console.error(`🔥 seleção por tendência: ${next} (score: ${scored[0].score.toFixed(1)})`);
    } catch {
      next = remaining[0];
    }
  } else {
    next = remaining[0];
  }

  if (VERBOSE) {
    console.error(`➡️  próximo termo         : ${next}`);
    console.error(`➡️  fonte: glossario`);
  }

  // GITHUB_OUTPUT
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      `slug=${next}\nremaining=${remaining.length}\nsource=glossario\n`
    );
  }

  // Slug puro na última linha do stdout
  console.log(next);
}

try {
  main();
} catch (err) {
  console.error(`❌ ${err.message}`);
  process.exit(1);
}
