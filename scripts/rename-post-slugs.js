/**
 * rename-post-slugs.js
 *
 * Scans en-* and es-* posts, compares current filename slug with the ideal
 * slug derived from the frontmatter title, and optionally renames them.
 *
 * Usage:
 *   node scripts/rename-post-slugs.js          # DRY RUN — prints mapping
 *   APPLY=1 node scripts/rename-post-slugs.js  # Actually renames + redirects + link updates
 */

import { readdirSync, readFileSync, writeFileSync, renameSync, existsSync, appendFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const POSTS_DIR = join(__dirname, '..', 'src', 'content', 'posts');
const GLOSSARIO_DIR = join(__dirname, '..', 'src', 'content', 'glossario');
const REDIRECTS_FILE = join(__dirname, '..', 'public', '_redirects');
const MAPPING_OUTPUT = join(__dirname, 'rename-mapping-posts.json');
const APPLY = process.env.APPLY === '1';

// ---------------------------------------------------------------------------
// Slug generation (same logic as gerar-dicas-financeiras.js and other automations)
// ---------------------------------------------------------------------------

function createSlug(title) {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 60);
}

// ---------------------------------------------------------------------------
// Frontmatter parsing
// ---------------------------------------------------------------------------

/**
 * Extracts the title field from YAML frontmatter.
 * Handles quoted (single/double) and unquoted titles.
 */
function extractTitle(content) {
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fmMatch) return null;

  const frontmatter = fmMatch[1];
  // Match title with double quotes, single quotes, or unquoted
  const titleMatch = frontmatter.match(/^title:\s*(?:"([^"]+)"|'([^']+)'|(.+))\s*$/m);
  if (!titleMatch) return null;

  return (titleMatch[1] || titleMatch[2] || titleMatch[3]).trim();
}

/**
 * Extracts the locale field from frontmatter.
 */
function extractLocale(content) {
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fmMatch) return null;

  const frontmatter = fmMatch[1];
  const localeMatch = frontmatter.match(/^locale:\s*(?:"([^"]+)"|'([^']+)'|(.+))\s*$/m);
  if (!localeMatch) return null;

  return (localeMatch[1] || localeMatch[2] || localeMatch[3]).trim();
}

// ---------------------------------------------------------------------------
// Main logic
// ---------------------------------------------------------------------------

function main() {
  console.log('='.repeat(70));
  console.log(APPLY ? '  APPLY MODE — files WILL be renamed' : '  DRY RUN — no files will be changed');
  console.log('='.repeat(70));
  console.log('');

  const allFiles = readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));
  const targetFiles = allFiles.filter(f => f.startsWith('en-') || f.startsWith('es-'));

  console.log(`Total .md files in posts/: ${allFiles.length}`);
  console.log(`Files with en-/es- prefix: ${targetFiles.length}`);
  console.log('');

  const mapping = [];
  const conflicts = new Map(); // newSlug -> array of old filenames
  let alreadyCorrect = 0;
  let needsRename = 0;
  let skippedNoTitle = 0;

  for (const file of targetFiles) {
    const filePath = join(POSTS_DIR, file);
    const content = readFileSync(filePath, 'utf-8');
    const title = extractTitle(content);
    const oldSlug = file.replace(/\.md$/, '');

    if (!title) {
      console.log(`  [SKIP] ${file} — could not extract title`);
      skippedNoTitle++;
      continue;
    }

    // Determine locale from prefix (more reliable than frontmatter for this purpose)
    const locale = file.startsWith('en-') ? 'en' : 'es';
    const idealSlug = `${locale}-${createSlug(title)}`;

    if (oldSlug === idealSlug) {
      alreadyCorrect++;
      continue;
    }

    // Skip if the current slug is already in the correct language (no PT words)
    // and the new slug would be truncated (worse). Keep clean manual slugs.
    const ptStopwords = ['para','como','nas','nos','sua','seu','voce','dicas','financeiro','financeira',
      'orcamento','investimentos','quando','onde','metodo','planilha','economize','migrando',
      'tambem','ferias','namorados','previdencia','privada','investir','conta','propria','qual',
      'vale','mais','pena','gastos','renda','fixa','variavel','fundos','imobiliarios','carteira',
      'diversificada','envelopes','digitais','alternativas','guia','completo','pratico','praticas',
      'montando','tecnica','revisao','segundo','semestre','estrategias','salario','minimo',
      'cartao','credito','debito','economizar','poupar','reorganizar','financas','dinheiro',
      'presentear','gastando','pouco','ideias','orcamento','dia','dos','pais','mae'];
    const slugBody = oldSlug.replace(/^(en|es)-/, '');
    const slugParts = slugBody.split('-');
    const hasPtWord = slugParts.some(w => ptStopwords.includes(w));

    if (!hasPtWord && idealSlug.length > oldSlug.length) {
      // Current slug is already in target language and shorter — keep it
      alreadyCorrect++;
      continue;
    }

    // Track for conflict detection
    if (!conflicts.has(idealSlug)) {
      conflicts.set(idealSlug, []);
    }
    conflicts.get(idealSlug).push(oldSlug);

    mapping.push({ old: oldSlug, new: idealSlug, locale, title });
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
  console.log(`  Total scanned:    ${targetFiles.length}`);
  console.log(`  Already correct:  ${alreadyCorrect}`);
  console.log(`  Needs rename:     ${needsRename}`);
  console.log(`  Skipped (no title): ${skippedNoTitle}`);
  console.log(`  Conflicts:        ${conflictEntries.length}`);
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
  // Apply mode
  // ---------------------------------------------------------------------------

  if (!APPLY) {
    console.log('To apply renames, run:  APPLY=1 node scripts/rename-post-slugs.js');
    console.log('');
    // Print first 10 mappings as preview
    const preview = mapping.slice(0, 10);
    if (preview.length > 0) {
      console.log('Preview (first 10):');
      for (const m of preview) {
        console.log(`  ${m.old}.md  ->  ${m.new}.md`);
      }
    }
    return;
  }

  // If there are conflicts, refuse to apply
  if (conflictEntries.length > 0) {
    console.log('ABORTING: Cannot apply while conflicts exist. Resolve them first.');
    process.exit(1);
  }

  // Perform renames
  const redirectLines = [];
  const renamedPairs = []; // { old, new, locale } for link updating

  for (const entry of mapping) {
    const oldPath = join(POSTS_DIR, `${entry.old}.md`);
    const newPath = join(POSTS_DIR, `${entry.new}.md`);

    // Safety: never overwrite existing file
    if (existsSync(newPath)) {
      console.log(`  [WARN] Target already exists, skipping: ${entry.new}.md`);
      continue;
    }

    renameSync(oldPath, newPath);
    console.log(`  [RENAMED] ${entry.old}.md -> ${entry.new}.md`);

    renamedPairs.push(entry);

    // Generate redirect rule (Cloudflare Pages format)
    const localePrefix = `/${entry.locale}/posts`;
    redirectLines.push(`${localePrefix}/${entry.old}  ${localePrefix}/${entry.new}  301`);
  }

  // Append redirects to _redirects
  if (redirectLines.length > 0) {
    const header = '\n# Slug renames (automated by rename-post-slugs.js)\n';
    const content = header + redirectLines.join('\n') + '\n';
    appendFileSync(REDIRECTS_FILE, content, 'utf-8');
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
  const dirs = [POSTS_DIR];
  if (existsSync(GLOSSARIO_DIR)) {
    dirs.push(GLOSSARIO_DIR);
  }

  let totalUpdates = 0;

  for (const dir of dirs) {
    const files = readdirSync(dir).filter(f => f.endsWith('.md'));

    for (const file of files) {
      const filePath = join(dir, file);
      let content = readFileSync(filePath, 'utf-8');
      let modified = false;

      for (const pair of renamedPairs) {
        // Word-boundary safe replacement: match the old slug when it appears
        // as a path segment (preceded by / and followed by ) or end-of-path chars)
        // This avoids partial replacements within longer strings
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
 * Escapes special regex characters in a string
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

main();
