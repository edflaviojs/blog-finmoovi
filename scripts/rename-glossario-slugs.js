/**
 * rename-glossario-slugs.js
 *
 * Scans en-* and es-* glossary files, compares current filename slug with the
 * ideal slug derived from the frontmatter `term` field, and optionally renames them.
 *
 * Usage:
 *   node scripts/rename-glossario-slugs.js          # DRY RUN — prints mapping
 *   APPLY=1 node scripts/rename-glossario-slugs.js  # Actually renames + redirects + link updates
 */

import { readdirSync, readFileSync, writeFileSync, renameSync, existsSync, appendFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const GLOSSARIO_DIR = join(__dirname, '..', 'src', 'content', 'glossario');
const POSTS_DIR = join(__dirname, '..', 'src', 'content', 'posts');
const REDIRECTS_FILE = join(__dirname, '..', 'public', '_redirects');
const MAPPING_OUTPUT = join(__dirname, 'rename-mapping-glossario.json');
const APPLY = process.env.APPLY === '1';

// ---------------------------------------------------------------------------
// Slug generation
// ---------------------------------------------------------------------------

function createSlug(term) {
  return term
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 60);
}

// ---------------------------------------------------------------------------
// PT stopwords (same as posts script)
// ---------------------------------------------------------------------------

const ptStopwords = ['para','como','nas','nos','sua','seu','voce','dicas','financeiro','financeira',
  'orcamento','investimentos','quando','onde','metodo','planilha','economize','migrando',
  'tambem','ferias','namorados','previdencia','privada','investir','conta','propria','qual',
  'vale','mais','pena','gastos','renda','fixa','variavel','fundos','imobiliarios','carteira',
  'diversificada','envelopes','digitais','alternativas','guia','completo','pratico','praticas',
  'montando','tecnica','revisao','segundo','semestre','estrategias','salario','minimo',
  'cartao','credito','debito','economizar','poupar','reorganizar','financas','dinheiro',
  'presentear','gastando','pouco','ideias','orcamento','dia','dos','pais','mae',
  'amortizacao','alavancagem','cheque','especial','consorcio','debentures','dividendos',
  'educacao','financiamento','ganho','capital','garantia','independencia','inflacao',
  'juros','compostos','simples','liquidez','margem','lucro','meta','pessoal','patrimonio',
  'liquido','quitacao','antecipada','reserva','emergencia','score','spread','bancario',
  'tabela','urgencia','valor','presente','volatilidade','zona','conforto'];

// ---------------------------------------------------------------------------
// Frontmatter parsing
// ---------------------------------------------------------------------------

/**
 * Extracts the `term` field from YAML frontmatter.
 * Handles quoted (single/double) and unquoted terms.
 */
function extractTerm(content) {
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fmMatch) return null;

  const frontmatter = fmMatch[1];
  const termMatch = frontmatter.match(/^term:\s*(?:"([^"]+)"|'([^']+)'|(.+))\s*$/m);
  if (!termMatch) return null;

  return (termMatch[1] || termMatch[2] || termMatch[3]).trim();
}

// ---------------------------------------------------------------------------
// Main logic
// ---------------------------------------------------------------------------

function main() {
  console.log('='.repeat(70));
  console.log(APPLY ? '  APPLY MODE — files WILL be renamed' : '  DRY RUN — no files will be changed');
  console.log('='.repeat(70));
  console.log('');

  const allFiles = readdirSync(GLOSSARIO_DIR).filter(f => f.endsWith('.md'));
  const targetFiles = allFiles.filter(f => f.startsWith('en-') || f.startsWith('es-'));

  console.log(`Total .md files in glossario/: ${allFiles.length}`);
  console.log(`Files with en-/es- prefix: ${targetFiles.length}`);
  console.log('');

  const mapping = [];
  const conflicts = new Map();
  let alreadyCorrect = 0;
  let needsRename = 0;
  let skippedNoTerm = 0;

  for (const file of targetFiles) {
    const filePath = join(GLOSSARIO_DIR, file);
    const content = readFileSync(filePath, 'utf-8');
    const term = extractTerm(content);
    const oldSlug = file.replace(/\.md$/, '');

    if (!term) {
      console.log(`  [WARN] ${file} — could not extract term, skipping`);
      skippedNoTerm++;
      continue;
    }

    // Determine locale from filename prefix
    const locale = file.startsWith('en-') ? 'en' : 'es';
    const idealSlug = `${locale}-${createSlug(term)}`;

    if (oldSlug === idealSlug) {
      alreadyCorrect++;
      continue;
    }

    // Safety: skip if current slug is already in target language (no PT stopwords)
    // and the ideal slug would be longer (truncated or worse)
    const slugBody = oldSlug.replace(/^(en|es)-/, '');
    const slugParts = slugBody.split('-');
    const hasPtWord = slugParts.some(w => ptStopwords.includes(w));

    if (!hasPtWord && idealSlug.length > oldSlug.length) {
      alreadyCorrect++;
      continue;
    }

    // Track for conflict detection
    if (!conflicts.has(idealSlug)) {
      conflicts.set(idealSlug, []);
    }
    conflicts.get(idealSlug).push(oldSlug);

    mapping.push({ old: oldSlug, new: idealSlug, locale, term });
    needsRename++;
  }

  // ---------------------------------------------------------------------------
  // Conflict detection
  // ---------------------------------------------------------------------------

  const conflictEntries = [...conflicts.entries()].filter(([, files]) => files.length > 1);

  if (conflictEntries.length > 0) {
    console.log('');
    console.log('!!! CONFLICTS DETECTED !!!');
    for (const [slug, files] of conflictEntries) {
      console.log(`  Target slug "${slug}" claimed by:`);
      for (const f of files) {
        console.log(`    - ${f}.md`);
      }
    }
    console.log('');
    console.log('Resolve conflicts before applying. Conflicting entries are still in the mapping.');
  }

  // ---------------------------------------------------------------------------
  // Report
  // ---------------------------------------------------------------------------

  console.log('');
  console.log('-'.repeat(70));
  console.log('  SUMMARY');
  console.log('-'.repeat(70));
  console.log(`  Total scanned:      ${targetFiles.length}`);
  console.log(`  Already correct:    ${alreadyCorrect}`);
  console.log(`  Needs rename:       ${needsRename}`);
  console.log(`  Skipped (no term):  ${skippedNoTerm}`);
  console.log(`  Conflicts:          ${conflictEntries.length}`);
  console.log('-'.repeat(70));
  console.log('');

  // ---------------------------------------------------------------------------
  // Write mapping JSON (always, even in dry run)
  // ---------------------------------------------------------------------------

  writeFileSync(MAPPING_OUTPUT, JSON.stringify(mapping, null, 2), 'utf-8');
  console.log(`Mapping written to: ${MAPPING_OUTPUT}`);
  console.log(`  (${mapping.length} entries)`);
  console.log('');

  // ---------------------------------------------------------------------------
  // Dry run preview
  // ---------------------------------------------------------------------------

  if (!APPLY) {
    console.log('To apply renames, run:  APPLY=1 node scripts/rename-glossario-slugs.js');
    console.log('');
    const preview = mapping.slice(0, 10);
    if (preview.length > 0) {
      console.log('Preview (first 10):');
      for (const m of preview) {
        console.log(`  ${m.old}.md  ->  ${m.new}.md`);
      }
    }
    return;
  }

  // ---------------------------------------------------------------------------
  // Apply mode
  // ---------------------------------------------------------------------------

  if (conflictEntries.length > 0) {
    console.log('ABORTING: Cannot apply while conflicts exist. Resolve them first.');
    process.exit(1);
  }

  const redirectLines = [];
  const renamedPairs = [];

  for (const entry of mapping) {
    const oldPath = join(GLOSSARIO_DIR, `${entry.old}.md`);
    const newPath = join(GLOSSARIO_DIR, `${entry.new}.md`);

    // Safety: never overwrite existing file
    if (existsSync(newPath)) {
      console.log(`  [WARN] Target already exists, skipping: ${entry.new}.md`);
      continue;
    }

    renameSync(oldPath, newPath);
    console.log(`  [RENAMED] ${entry.old}.md -> ${entry.new}.md`);

    renamedPairs.push(entry);

    // Generate redirect rule (Cloudflare Pages format)
    const localePrefix = `/${entry.locale}/glossario`;
    redirectLines.push(`${localePrefix}/${entry.old}  ${localePrefix}/${entry.new}  301`);
  }

  // Append redirects to _redirects
  if (redirectLines.length > 0) {
    const header = '\n# Glossary slug renames (automated by rename-glossario-slugs.js)\n';
    const redirectContent = header + redirectLines.join('\n') + '\n';
    appendFileSync(REDIRECTS_FILE, redirectContent, 'utf-8');
    console.log('');
    console.log(`Appended ${redirectLines.length} redirect rules to public/_redirects`);
  }

  // Update internal links in all .md files (posts + glossario)
  if (renamedPairs.length > 0) {
    console.log('');
    console.log('Updating internal links...');
    updateInternalLinks(renamedPairs);
  }

  console.log('');
  console.log('Done.');
}

// ---------------------------------------------------------------------------
// Internal link updater
// ---------------------------------------------------------------------------

function updateInternalLinks(renamedPairs) {
  const dirs = [GLOSSARIO_DIR];
  if (existsSync(POSTS_DIR)) {
    dirs.push(POSTS_DIR);
  }

  let totalUpdates = 0;

  for (const dir of dirs) {
    const files = readdirSync(dir).filter(f => f.endsWith('.md'));

    for (const file of files) {
      const filePath = join(dir, file);
      let content = readFileSync(filePath, 'utf-8');
      let modified = false;

      for (const pair of renamedPairs) {
        const pattern = new RegExp(
          `(/)${escapeRegex(pair.old)}(?=[/)\\s"'\\])]|$)`,
          'g'
        );

        const newContent = content.replace(pattern, `$1${pair.new}`);
        if (newContent !== content) {
          content = newContent;
          modified = true;
        }
      }

      if (modified) {
        writeFileSync(filePath, content, 'utf-8');
        totalUpdates++;
      }
    }
  }

  console.log(`  Updated links in ${totalUpdates} files`);
}

/**
 * Escapes special regex characters in a string.
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

main();
