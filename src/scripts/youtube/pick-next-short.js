/**
 * Escolhe o PRÓXIMO termo do glossário a virar Short (F1.5 — cron diário).
 *
 * Lê os termos PT do glossário (src/content/glossario/*.md, ignorando as
 * traduções com prefixo en-/es-), remove os que já foram publicados
 * (.github/data/youtube-published.json) e devolve o PRÓXIMO em ordem
 * ALFABÉTICA (determinístico — sem sorteio, sem estado extra).
 *
 * Read-only: nunca escreve nada. Serve só de "próximo da fila" pro workflow.
 *
 * Uso:
 *   node src/scripts/youtube/pick-next-short.js            → imprime o slug
 *   node src/scripts/youtube/pick-next-short.js --verbose  → + contagens
 *
 * Saída pro workflow:
 *   - imprime o slug puro na ÚLTIMA linha do stdout (fácil de capturar com $(...));
 *   - se existir a env GITHUB_OUTPUT, também grava `slug=<slug>` e
 *     `remaining=<n>` lá (consumível por steps.<id>.outputs.*).
 *
 * Código de saída:
 *   0  → achou um termo (slug impresso).
 *   78 → glossário esgotado (nada a fazer). Código distinto p/ o workflow
 *        tratar como "sucesso neutro" (não é falha).
 *   1  → erro real (diretório/arquivo ausente etc.).
 */

import { readdirSync, readFileSync, existsSync, appendFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.cwd();
const GLOSSARIO_DIR = join(ROOT, 'src', 'content', 'glossario');
const TRACKING = join(ROOT, '.github', 'data', 'youtube-published.json');

const NOTHING_TO_DO = 78; // convenção: "sucesso neutro", nada a publicar hoje.

const args = new Set(process.argv.slice(2));
const VERBOSE = args.has('--verbose');

// Termos PT = *.md SEM prefixo de tradução (en-/es-).
function listPtSlugs() {
  if (!existsSync(GLOSSARIO_DIR)) {
    throw new Error(`glossário não encontrado: ${GLOSSARIO_DIR}`);
  }
  return readdirSync(GLOSSARIO_DIR)
    .filter((f) => f.endsWith('.md'))
    .filter((f) => !/^(en|es)-/.test(f))
    .map((f) => f.slice(0, -3)) // tira ".md"
    .sort(); // ordem alfabética determinística (lexicográfica, ASCII).
}

// Slugs já publicados (chaves do tracking). Se o arquivo não existe, nada foi.
function listPublished() {
  if (!existsSync(TRACKING)) return new Set();
  try {
    const data = JSON.parse(readFileSync(TRACKING, 'utf-8')) || {};
    return new Set(Object.keys(data));
  } catch {
    // tracking corrompido → trata como "nada publicado" (não vamos bloquear
    // a fábrica por um JSON quebrado; o pior caso é re-tentar um slug, e o
    // upload-short.js tem dedup próprio).
    return new Set();
  }
}

function main() {
  const all = listPtSlugs();
  const published = listPublished();
  const remaining = all.filter((s) => !published.has(s));

  if (VERBOSE) {
    console.error(`📚 termos PT no glossário : ${all.length}`);
    console.error(`✅ já publicados          : ${published.size}`);
    console.error(`🎬 restantes na fila      : ${remaining.length}`);
  }

  if (remaining.length === 0) {
    console.error('glossário esgotado 🎉 — todos os termos PT já viraram Short.');
    process.exit(NOTHING_TO_DO);
  }

  const next = remaining[0]; // próximo alfabético.

  if (VERBOSE) {
    console.error(`➡️  próximo termo         : ${next}`);
  }

  // Saída estruturada pro workflow (se disponível).
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `slug=${next}\nremaining=${remaining.length}\n`);
  }

  // Slug puro na última linha do stdout (para $(...) no shell).
  console.log(next);
}

try {
  main();
} catch (err) {
  console.error(`❌ ${err.message}`);
  process.exit(1);
}
