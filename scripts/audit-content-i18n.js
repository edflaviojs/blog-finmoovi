#!/usr/bin/env node
/**
 * audit-content-i18n.js
 *
 * Scans EN and ES posts + glossary files and reports content quality issues
 * related to Brazilian Portuguese content that was not properly translated.
 *
 * Checks: currency symbols (R$), BR institution references, BR product names,
 * geographic BR references, and PT words in EN files.
 *
 * Usage: node scripts/audit-content-i18n.js
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, basename } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

// --- Configuration ---

const DIRS_TO_SCAN = [
  { path: join(ROOT, 'src/content/posts'), label: 'posts' },
  { path: join(ROOT, 'src/content/glossario'), label: 'glossario' },
];

const BR_INSTITUTIONS = [
  'Receita Federal',
  'Serasa',
  'SPC',
  'IBGE',
  'Banco Central do Brasil',
  'BCB',
];

const BR_PRODUCTS = [
  'Tesouro Direto',
  'CDB',
  'CDI',
  'FGTS',
  'IPVA',
  'IPTU',
  'Selic',
];

const GEO_BR_REFS = [
  'no Brasil',
  'brasileiros',
  'brasileiro',
  'brasileiras',
  'no mercado brasileiro',
  'economia brasileira',
];

const PT_WORDS = [
  'voce', 'tambem', 'nao', 'sao', 'porque',
  'quando', 'onde', 'pode', 'mais', 'muito', 'como',
];

// --- Helper Functions ---

/**
 * Extracts the body content after the closing `---` of frontmatter.
 * @param {string} content - Full file content
 * @returns {string} Body text after frontmatter
 */
function extractBody(content) {
  const lines = content.split('\n');
  let dashCount = 0;
  let bodyStartIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      dashCount++;
      if (dashCount === 2) {
        bodyStartIndex = i + 1;
        break;
      }
    }
  }

  return lines.slice(bodyStartIndex).join('\n');
}

/**
 * Counts occurrences of a pattern in text (case-sensitive).
 * @param {string} text - Text to search
 * @param {string} term - Term to find
 * @returns {number} Count of occurrences
 */
function countOccurrences(text, term) {
  const regex = new RegExp(escapeRegex(term), 'g');
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

/**
 * Counts occurrences of a word-boundary pattern (case-insensitive).
 * Used for PT words detection to avoid false positives in longer words.
 * @param {string} text - Text to search
 * @param {string} word - Word to find
 * @returns {number} Count of occurrences
 */
function countWordOccurrences(text, word) {
  const regex = new RegExp(`\\b${escapeRegex(word)}\\b`, 'gi');
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

/**
 * Escapes special regex characters in a string.
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Calculates severity score based on issues found.
 * @param {object} issues - Issues object
 * @param {boolean} isEN - Whether the file is EN locale
 * @returns {number} Severity: 0=clean, 1=minor, 2=moderate, 3=severe
 */
function calculateSeverity(issues, isEN) {
  const { currency, brInstitutions, brProducts, geoRefs, ptWordsCount } = issues;

  // Severity 3: body appears to be in wrong language
  if (isEN && ptWordsCount >= 5) return 3;

  const totalCurrency = currency;
  const totalBrRefs = brInstitutions.length + brProducts.length + geoRefs.length;

  // Severity 3: 6+ R$ occurrences
  if (totalCurrency >= 6) return 3;

  // Severity 2: 3-5 R$ or 2+ BR references
  if (totalCurrency >= 3 || totalBrRefs >= 2) return 2;

  // Severity 1: 1-2 R$ or 1 BR reference
  if (totalCurrency >= 1 || totalBrRefs >= 1) return 1;

  // Severity 0: clean
  return 0;
}

// --- Main Scan Logic ---

function scanFile(filePath, dir) {
  const fileName = basename(filePath);
  const isEN = fileName.startsWith('en-');
  const content = readFileSync(filePath, 'utf-8');
  const body = extractBody(content);

  // 1. Currency issues: count R$
  const currency = countOccurrences(body, 'R$');

  // 2. BR institution references
  const brInstitutions = BR_INSTITUTIONS.filter(
    (inst) => countOccurrences(body, inst) > 0
  );

  // 3. BR product names (context-aware)
  const brProducts = BR_PRODUCTS.filter((product) => {
    const count = countOccurrences(body, product);
    if (count === 0) return false;
    // For CDB/CDI/Selic: only flag if used without explanation context
    // Simple heuristic: if the term appears but the file is EN, flag it
    if (['CDB', 'CDI', 'Selic'].includes(product)) {
      // Check if there's an explanation nearby (e.g., "CDB (Certificate of...")
      const hasExplanation = body.includes(`${product} (`) || body.includes(`${product} is `);
      return !hasExplanation;
    }
    return true;
  });

  // 4. Geographic BR references
  const geoRefs = GEO_BR_REFS.filter(
    (ref) => countOccurrences(body, ref) > 0
  );

  // 5. PT words in body (EN files only)
  let ptWordsCount = 0;
  if (isEN) {
    let ptWordsFound = 0;
    for (const word of PT_WORDS) {
      if (countWordOccurrences(body, word) > 0) {
        ptWordsFound++;
      }
    }
    // Only count if 5+ distinct PT words appear
    ptWordsCount = ptWordsFound >= 5 ? ptWordsFound : 0;
  }

  const issues = { currency, brInstitutions, brProducts, geoRefs, ptWordsCount };
  const severity = calculateSeverity(issues, isEN);

  return {
    file: fileName,
    dir,
    severity,
    issues,
  };
}

function main() {
  const results = [];

  for (const { path: dirPath, label } of DIRS_TO_SCAN) {
    let files;
    try {
      files = readdirSync(dirPath);
    } catch {
      console.warn(`[WARN] Directory not found: ${dirPath}`);
      continue;
    }

    const targetFiles = files.filter(
      (f) => f.endsWith('.md') && (f.startsWith('en-') || f.startsWith('es-'))
    );

    for (const file of targetFiles) {
      const filePath = join(dirPath, file);
      const result = scanFile(filePath, label);
      results.push(result);
    }
  }

  // Sort by severity descending, then file name
  results.sort((a, b) => b.severity - a.severity || a.file.localeCompare(b.file));

  // --- Summary ---
  const total = results.length;
  const clean = results.filter((r) => r.severity === 0).length;
  const minor = results.filter((r) => r.severity === 1).length;
  const moderate = results.filter((r) => r.severity === 2).length;
  const severe = results.filter((r) => r.severity === 3).length;

  console.log('\n=== AUDIT CONTENT i18n ===\n');
  console.log('Summary:');
  console.log(`  Total files scanned: ${total}`);
  console.log(`  Clean (severity 0):  ${clean}`);
  console.log(`  Minor (severity 1):  ${minor}`);
  console.log(`  Moderate (severity 2): ${moderate}`);
  console.log(`  Severe (severity 3):  ${severe}`);
  console.log('');

  // --- Top 20 Worst Offenders ---
  const worst = results.filter((r) => r.severity > 0).slice(0, 20);
  if (worst.length > 0) {
    console.log('TOP 20 WORST OFFENDERS:');
    console.log('-'.repeat(90));
    console.log(
      'File'.padEnd(60) +
      'Dir'.padEnd(12) +
      'Sev'.padEnd(5) +
      'R$'.padEnd(5) +
      'Issues'
    );
    console.log('-'.repeat(90));

    for (const r of worst) {
      const issueDetails = [];
      if (r.issues.currency > 0) issueDetails.push(`R$:${r.issues.currency}`);
      if (r.issues.brInstitutions.length > 0) issueDetails.push(`inst:[${r.issues.brInstitutions.join(',')}]`);
      if (r.issues.brProducts.length > 0) issueDetails.push(`prod:[${r.issues.brProducts.join(',')}]`);
      if (r.issues.geoRefs.length > 0) issueDetails.push(`geo:[${r.issues.geoRefs.join(',')}]`);
      if (r.issues.ptWordsCount > 0) issueDetails.push(`ptWords:${r.issues.ptWordsCount}`);

      console.log(
        r.file.substring(0, 58).padEnd(60) +
        r.dir.padEnd(12) +
        String(r.severity).padEnd(5) +
        String(r.issues.currency).padEnd(5) +
        issueDetails.join(' | ')
      );
    }
    console.log('-'.repeat(90));
  } else {
    console.log('No issues found! All files are clean.');
  }

  // --- Write detailed JSON results ---
  const outputPath = join(__dirname, 'audit-content-results.json');
  writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`\nDetailed results written to: ${outputPath}`);
}

main();
