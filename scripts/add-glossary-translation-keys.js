import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const DIR = join(process.cwd(), 'src/content/glossario');
const files = readdirSync(DIR).filter(f => f.endsWith('.md'));

let modified = 0;
let skipped = 0;

for (const file of files) {
  const filePath = join(DIR, file);
  const content = readFileSync(filePath, 'utf-8');

  // Skip if already has translationKey
  if (content.includes('translationKey:')) {
    skipped++;
    continue;
  }

  // Compute base slug
  const base = file.replace(/^(en|es)-/, '').replace(/\.md$/, '');
  const key = `glossario-${base}`;

  // Insert after locale: line
  const lines = content.split('\n');
  let inserted = false;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('locale:')) {
      lines.splice(i + 1, 0, `translationKey: "${key}"`);
      inserted = true;
      break;
    }
  }

  if (!inserted) {
    // Fallback: insert before the closing ---
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === '---') {
        lines.splice(i, 0, `translationKey: "${key}"`);
        inserted = true;
        break;
      }
    }
  }

  if (inserted) {
    writeFileSync(filePath, lines.join('\n'), 'utf-8');
    modified++;
    console.log(`+ ${file} → translationKey: "${key}"`);
  } else {
    console.error(`ERROR: Could not process ${file}`);
  }
}

console.log(`\nDone: ${modified} modified, ${skipped} skipped (already had translationKey)`);
