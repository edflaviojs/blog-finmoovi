/**
 * Script: Traduzir body completo do glossário para EN e ES
 * Executa via GitHub Actions: workflow "Traduzir Glossário"
 * Lê cada arquivo en-*.md e es-*.md, traduz o body via Groq, e salva
 */

import { generateText } from '../apis/kie-ai.js';
import { writeFileSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const GLOSSARIO_DIR = join(process.cwd(), 'src', 'content', 'glossario');

async function translateBody(body, termName, targetLang) {
  const langNames = { en: 'English', es: 'Spanish' };
  const langName = langNames[targetLang];

  const prompt = `
Translate the following financial glossary article body to ${langName}.
This is about the term "${termName}".
Keep all markdown formatting (##, **, -, etc.) intact.
Keep financial acronyms (CDI, ETF, IPCA, CDB, LCI, LCA, IOF, PIX, FGC, B3) as-is.
Keep R$ currency values as-is (they are Brazilian Reais).
Do NOT add any extra text, just translate the content.

Content to translate:
${body}
`;

  const result = await generateText(prompt, { maxTokens: 2000, temperature: 0.2 });
  return result.trim();
}

async function main() {
  console.log('🌐 Traduzindo body completo do glossário...\n');

  // Process EN files
  const enFiles = readdirSync(GLOSSARIO_DIR).filter(f => f.startsWith('en-') && f.endsWith('.md'));
  console.log(`📚 ${enFiles.length} termos EN para traduzir\n`);

  let translated = 0;
  let errors = 0;

  for (const file of enFiles) {
    const filePath = join(GLOSSARIO_DIR, file);
    const content = readFileSync(filePath, 'utf-8');

    const parts = content.split('---');
    if (parts.length < 3) continue;

    const frontmatter = parts[1];
    const body = parts.slice(2).join('---').trim();

    // Skip if body is already in English (check for common PT patterns)
    if (!body.match(/[ãõçáéíóú]/i) && !body.match(/\b(que|como|para|uma|não|são|pode|mais)\b/i)) {
      console.log(`  ⏭️ ${file} - already translated`);
      continue;
    }

    const termMatch = frontmatter.match(/term:\s*"([^"]+)"/);
    const termName = termMatch ? termMatch[1] : file.replace('en-', '').replace('.md', '');

    try {
      console.log(`📝 EN: ${termName}...`);
      const translatedBody = await translateBody(body, termName, 'en');
      const newContent = '---' + frontmatter + '---\n\n' + translatedBody + '\n';
      writeFileSync(filePath, newContent, 'utf-8');
      translated++;
      // Rate limit - wait 10s between calls to avoid Groq TPM limit
      await new Promise(r => setTimeout(r, 10000));
    } catch (err) {
      console.error(`  ❌ ${file}: ${err.message}`);
      errors++;
      // Wait longer on error (rate limit)
      await new Promise(r => setTimeout(r, 15000));
    }
  }

  // Process ES files
  const esFiles = readdirSync(GLOSSARIO_DIR).filter(f => f.startsWith('es-') && f.endsWith('.md'));
  console.log(`\n📚 ${esFiles.length} termos ES para traduzir\n`);

  for (const file of esFiles) {
    const filePath = join(GLOSSARIO_DIR, file);
    const content = readFileSync(filePath, 'utf-8');

    const parts = content.split('---');
    if (parts.length < 3) continue;

    const frontmatter = parts[1];
    const body = parts.slice(2).join('---').trim();

    // Skip if body is already in Spanish
    if (!body.match(/[ãõç]/i) && body.match(/[ñ¿¡]/)) {
      console.log(`  ⏭️ ${file} - already translated`);
      continue;
    }

    const termMatch = frontmatter.match(/term:\s*"([^"]+)"/);
    const termName = termMatch ? termMatch[1] : file.replace('es-', '').replace('.md', '');

    try {
      console.log(`📝 ES: ${termName}...`);
      const translatedBody = await translateBody(body, termName, 'es');
      const newContent = '---' + frontmatter + '---\n\n' + translatedBody + '\n';
      writeFileSync(filePath, newContent, 'utf-8');
      translated++;
      // Rate limit - wait 10s between calls to avoid Groq TPM limit
      await new Promise(r => setTimeout(r, 10000));
    } catch (err) {
      console.error(`  ❌ ${file}: ${err.message}`);
      errors++;
      // Wait longer on error (rate limit)
      await new Promise(r => setTimeout(r, 15000));
    }
  }

  console.log(`\n📊 Resultado: ${translated} traduzidos, ${errors} erros`);
}

main();
