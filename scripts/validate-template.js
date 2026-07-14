/**
 * Template Validation Script
 * Checks that no old brand references leaked into the build output
 * and that all config references are properly resolved.
 *
 * Usage: npm run validate-template
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { config } from '../site.config.ts';

const DIST_DIR = join(process.cwd(), 'dist');
const SRC_DIR = join(process.cwd(), 'src');

// Files/dirs to skip
const SKIP = ['node_modules', '.git', 'dist', 'package-lock.json', 'site.config.ts', '_config.json', 'brand-tokens.css'];
const SKIP_CONTENT = ['src/content/posts', 'src/content/glossario'];
// Scripts that intentionally write '${...}' into generated files — not broken interpolation
const SKIP_TEMPLATE_CHECK = ['setup.js', 'generate-brand-css.js', 'generate-i18n-client.js', 'validate-template.js'];

let errors = 0;
let warnings = 0;

function walkDir(dir, callback) {
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      if (SKIP.some(s => fullPath.includes(s))) continue;
      if (SKIP_CONTENT.some(s => fullPath.includes(s))) continue;

      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        walkDir(fullPath, callback);
      } else if (/\.(html|js|css|xml|json|txt)$/.test(entry)) {
        callback(fullPath);
      }
    }
  } catch (e) {
    // skip unreadable dirs
  }
}

console.log(`
╔══════════════════════════════════════════════════════════════╗
║  🔍 Template Validation                                      ║
║  Brand: ${config.brand.name.padEnd(49)}║
║  Site: ${config.siteUrl.padEnd(50)}║
╚══════════════════════════════════════════════════════════════╝
`);

// === CHECK 1: Build output (dist/) for old brand leaks ===
console.log('━━━ Check 1: Build output (dist/) ━━━━━━━━━━━━━━━━━━━━━━━\n');

const oldBrandPatterns = [
  /finmoovi/gi,  // any case
  /blog\.finmoovi\.com/g,
  /https:\/\/finmoovi\.com/g,
];

let distLeaks = 0;

if (statSync(DIST_DIR, { throwIfNoEntry: false })) {
  walkDir(DIST_DIR, (filePath) => {
    const content = readFileSync(filePath, 'utf-8');
    for (const pattern of oldBrandPatterns) {
      pattern.lastIndex = 0;
      const matches = content.match(pattern);
      if (matches) {
        // Ignore if it's the actual configured brand name
        if (config.brand.name.toLowerCase() === 'finmoovi') continue;
        const relativePath = filePath.replace(process.cwd() + '\\', '').replace(process.cwd() + '/', '');
        console.log(`  ❌ LEAK: ${relativePath} — found "${matches[0]}" (${matches.length}x)`);
        distLeaks += matches.length;
        errors++;
      }
    }
  });

  if (distLeaks === 0) {
    console.log('  ✅ No old brand references in build output\n');
  } else {
    console.log(`\n  ❌ Found ${distLeaks} leaks in dist/\n`);
  }
} else {
  console.log('  ⚠️  dist/ not found — run npm run build first\n');
  warnings++;
}

// === CHECK 1B (T9): SOURCE scan for old brand leaks (scripts, components, functions) ===
// Só ativa quando a marca configurada NÃO é FinMoovi (i.e., num blog filho após setup).
console.log('━━━ Check 1B: Source scan (scripts/, src/, functions/) ━━━\n');

if (config.brand.name.toLowerCase() !== 'finmoovi') {
  let srcLeaks = 0;
  const SRC_SCAN_SKIP = [...SKIP, 'validate-template.js', '.claude', 'press', 'social', 'reports', '.github'];

  function scanSource(dir) {
    try {
      const entries = readdirSync(dir);
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        if (SRC_SCAN_SKIP.some(s => fullPath.includes(s))) continue;
        if (SKIP_CONTENT.some(s => fullPath.includes(s))) continue;
        const stat = statSync(fullPath);
        if (stat.isDirectory()) { scanSource(fullPath); continue; }
        if (!/\.(js|ts|astro|css|json|mjs)$/.test(entry)) continue;
        const content = readFileSync(fullPath, 'utf-8');
        for (const pattern of oldBrandPatterns) {
          pattern.lastIndex = 0;
          const matches = content.match(pattern);
          if (matches) {
            const rel = fullPath.replace(process.cwd() + '\\', '').replace(process.cwd() + '/', '');
            console.log(`  ❌ SOURCE LEAK: ${rel} — "${matches[0]}" (${matches.length}x)`);
            srcLeaks += matches.length;
            errors++;
          }
        }
      }
    } catch (e) { /* skip */ }
  }

  scanSource(join(process.cwd(), 'scripts'));
  scanSource(SRC_DIR);
  scanSource(join(process.cwd(), 'functions'));
  scanSource(join(process.cwd(), 'public'));

  if (srcLeaks === 0) {
    console.log('  ✅ No old brand references in source files\n');
  } else {
    console.log(`\n  ❌ Found ${srcLeaks} source leaks — a marca antiga ainda está no código\n`);
  }
} else {
  console.log('  ⏭️  Pulado (marca ainda é FinMoovi — blog-mãe)\n');
}

// === CHECK 2: Source files for unresolved ${config...} in single-quoted strings ===
console.log('━━━ Check 2: Broken template literals in source ━━━━━━━━━\n');

const srcExtensions = /\.(js|ts|astro)$/;
let brokenTemplates = 0;

function checkBrokenTemplates(dir) {
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      if (SKIP.some(s => fullPath.includes(s))) continue;

      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        checkBrokenTemplates(fullPath);
      } else if (srcExtensions.test(entry)) {
        // Skip scripts that intentionally write template strings to files
        if (SKIP_TEMPLATE_CHECK.some(s => entry === s)) continue;
        const content = readFileSync(fullPath, 'utf-8');
        // Find '${...}' inside single-quoted strings (broken interpolation)
        const lines = content.split('\n');
        lines.forEach((line, i) => {
          // Match single-quoted strings containing ${
          if (/'\$\{[^}]+\}'/.test(line) && !line.includes('`')) {
            const relativePath = fullPath.replace(process.cwd() + '\\', '').replace(process.cwd() + '/', '');
            console.log(`  ⚠️  ${relativePath}:${i + 1} — possible broken interpolation in single quotes`);
            brokenTemplates++;
            warnings++;
          }
        });
      }
    }
  } catch (e) { /* skip */ }
}

checkBrokenTemplates(SRC_DIR);
checkBrokenTemplates(join(process.cwd(), 'functions'));
checkBrokenTemplates(join(process.cwd(), 'scripts'));

if (brokenTemplates === 0) {
  console.log('  ✅ No broken template literals found\n');
}

// === CHECK 3: Config completeness ===
console.log('━━━ Check 3: Config completeness ━━━━━━━━━━━━━━━━━━━━━━━\n');

const requiredFields = [
  ['brand.name', config.brand?.name],
  ['brand.blogSuffix', config.brand?.blogSuffix],
  ['brand.tagline.pt', config.brand?.tagline?.pt],
  ['brand.colors.primary', config.brand?.colors?.primary],
  ['brand.domains.blog', config.brand?.domains?.blog],
  ['content.niche.pt', config.content?.niche?.pt],
  ['content.niche.en', config.content?.niche?.en],
  ['content.niche.es', config.content?.niche?.es],
  ['content.defaultAuthor', config.content?.defaultAuthor],
  ['app.name', config.app?.name],
  ['app.url', config.app?.url],
  ['app.ctaTitle.pt', config.app?.ctaTitle?.pt],
  ['app.ctaText.pt', config.app?.ctaText?.pt],
  ['app.features.pt', config.app?.features?.pt?.length > 0],
  ['email.from', config.email?.from],
  ['ai.personality', config.ai?.personality],
  ['siteUrl', config.siteUrl],
  ['siteDescription.pt', config.siteDescription?.pt],
  ['content.categoryNav', config.content?.categoryNav?.length > 0],
  ['locales', config.locales?.length > 0],
];

let missingFields = 0;
for (const [name, value] of requiredFields) {
  if (!value) {
    console.log(`  ❌ Missing: config.${name}`);
    missingFields++;
    errors++;
  }
}

if (missingFields === 0) {
  console.log('  ✅ All required config fields are set\n');
}

// === CHECK 4: Generated files exist ===
console.log('━━━ Check 4: Generated files ━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const generatedFiles = [
  'src/styles/brand-tokens.css',
  'functions/_config.json',
  'public/manifest.json',
  'public/scripts/i18n.js',
];

for (const file of generatedFiles) {
  const fullPath = join(process.cwd(), file);
  if (statSync(fullPath, { throwIfNoEntry: false })) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ Missing: ${file} — run npm run generate`);
    errors++;
  }
}

// === SUMMARY ===
console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  RESULT: ${errors === 0 ? '✅ TEMPLATE VALID' : `❌ ${errors} ERROR(S) FOUND`}
  ${warnings > 0 ? `⚠️  ${warnings} warning(s)` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

process.exit(errors > 0 ? 1 : 0);
