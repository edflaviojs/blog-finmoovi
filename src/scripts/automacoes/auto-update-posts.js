/**
 * Auto-Update de Posts Antigos
 * Identifica posts com +90 dias sem update e atualiza o frontmatter
 * Adiciona updatedAt para sinalizar ao Google que o conteúdo está fresh
 *
 * Uso: node src/scripts/automacoes/auto-update-posts.js
 * Executa mensalmente via GitHub Actions
 */

import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const POSTS_DIR = join(process.cwd(), 'src', 'content', 'posts');
const MAX_AGE_DAYS = 90;

function main() {
  console.log('🔄 Verificando posts antigos para atualização...\n');

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const postFiles = readdirSync(POSTS_DIR).filter(f => f.endsWith('.md') && !f.startsWith('en-') && !f.startsWith('es-'));
  let updated = 0;

  for (const file of postFiles) {
    const filePath = join(POSTS_DIR, file);
    const content = readFileSync(filePath, 'utf-8');

    // Extract publishedAt and updatedAt
    const publishedMatch = content.match(/publishedAt:\s*(\d{4}-\d{2}-\d{2})/);
    const updatedMatch = content.match(/updatedAt:\s*(\d{4}-\d{2}-\d{2})/);

    if (!publishedMatch) continue;

    const lastDate = updatedMatch ? new Date(updatedMatch[1]) : new Date(publishedMatch[1]);
    const daysSince = Math.floor((today - lastDate) / 86400000);

    if (daysSince < MAX_AGE_DAYS) continue;

    // Add or update the updatedAt field
    let newContent;
    if (updatedMatch) {
      newContent = content.replace(/updatedAt:\s*\d{4}-\d{2}-\d{2}/, `updatedAt: ${todayStr}`);
    } else {
      // Insert updatedAt after publishedAt
      newContent = content.replace(
        /(publishedAt:\s*\d{4}-\d{2}-\d{2})/,
        `$1\nupdatedAt: ${todayStr}`
      );
    }

    if (newContent !== content) {
      writeFileSync(filePath, newContent, 'utf-8');
      updated++;
      console.log(`✅ ${file} — atualizado (${daysSince} dias desde última edição)`);

      // Also update EN and ES versions
      const enFile = `en-${file}`;
      const esFile = `es-${file}`;
      for (const localeFile of [enFile, esFile]) {
        const localePath = join(POSTS_DIR, localeFile);
        try {
          const localeContent = readFileSync(localePath, 'utf-8');
          let newLocaleContent;
          if (localeContent.includes('updatedAt:')) {
            newLocaleContent = localeContent.replace(/updatedAt:\s*\d{4}-\d{2}-\d{2}/, `updatedAt: ${todayStr}`);
          } else {
            newLocaleContent = localeContent.replace(
              /(publishedAt:\s*\d{4}-\d{2}-\d{2})/,
              `$1\nupdatedAt: ${todayStr}`
            );
          }
          if (newLocaleContent !== localeContent) {
            writeFileSync(localePath, newLocaleContent, 'utf-8');
            console.log(`  ↳ ${localeFile} — atualizado`);
          }
        } catch (e) {
          // Locale version doesn't exist, skip
        }
      }
    }
  }

  if (updated > 0) {
    console.log(`\n📊 ${updated} posts atualizados com nova data`);
  } else {
    console.log('\n✅ Nenhum post precisa de atualização no momento.');
  }
}

main();
