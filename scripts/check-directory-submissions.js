/**
 * check-directory-submissions.js
 *
 * Lê o JSON de submissões em diretórios e reporta status.
 * Uso: node scripts/check-directory-submissions.js
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { BRAND_NAME } from './lib/site.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dataPath = join(__dirname, 'data', 'directory-submissions.json');
const data = JSON.parse(readFileSync(dataPath, 'utf-8'));

const { updatedAt, submissions } = data;

// Contagem por status
const statusCount = submissions.reduce((acc, s) => {
  acc[s.status] = (acc[s.status] || 0) + 1;
  return acc;
}, {});

const pending = submissions.filter(s => s.status === 'pending');
const submitted = submissions.filter(s => s.status === 'submitted');
const approved = submissions.filter(s => s.status === 'approved');

// Ordenar pending por DR (maior primeiro)
pending.sort((a, b) => b.dr - a.dr);

// Output formatado
console.log('═══════════════════════════════════════════════════════');
console.log(`  DIRECTORY SUBMISSIONS — ${BRAND_NAME}`);
console.log('═══════════════════════════════════════════════════════');
console.log(`  Última atualização: ${updatedAt}`);
console.log(`  Total: ${submissions.length} diretórios`);
console.log('');
console.log('  STATUS:');
console.log(`    ⏳ Pending:   ${statusCount.pending || 0}`);
console.log(`    📤 Submitted: ${statusCount.submitted || 0}`);
console.log(`    ✅ Approved:  ${statusCount.approved || 0}`);
console.log('');

if (pending.length > 0) {
  console.log('───────────────────────────────────────────────────────');
  console.log('  PENDING (ordenado por DR — prioridade)');
  console.log('───────────────────────────────────────────────────────');
  console.log('');

  pending.forEach((s, i) => {
    const typeTag = `[${s.type.toUpperCase()}]`;
    console.log(`  ${String(i + 1).padStart(2)}. ${s.name} (DR ${s.dr}) ${typeTag}`);
    console.log(`      URL: ${s.url}`);
    console.log(`      Nota: ${s.notes}`);
    console.log('');
  });
}

if (submitted.length > 0) {
  console.log('───────────────────────────────────────────────────────');
  console.log('  SUBMITTED (aguardando aprovação)');
  console.log('───────────────────────────────────────────────────────');
  console.log('');

  submitted.forEach((s, i) => {
    console.log(`  ${String(i + 1).padStart(2)}. ${s.name} (DR ${s.dr}) [${s.type.toUpperCase()}]`);
    if (s.submittedAt) console.log(`      Submetido em: ${s.submittedAt}`);
    console.log('');
  });
}

if (approved.length > 0) {
  console.log('───────────────────────────────────────────────────────');
  console.log('  APPROVED');
  console.log('───────────────────────────────────────────────────────');
  console.log('');

  approved.forEach((s, i) => {
    console.log(`  ${String(i + 1).padStart(2)}. ${s.name} (DR ${s.dr}) [${s.type.toUpperCase()}]`);
    console.log('');
  });
}

console.log('═══════════════════════════════════════════════════════');
console.log('  Próximos passos: submeta os de maior DR primeiro.');
console.log('  Atualize o status no JSON após cada submissão.');
console.log('═══════════════════════════════════════════════════════');
