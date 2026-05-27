/**
 * Script one-time: Traduzir todos os termos do glossário para EN e ES
 * Executar manualmente: node src/scripts/automacoes/traduzir-glossario.js
 */

import { generateText } from '../apis/kie-ai.js';
import { writeFileSync, readFileSync, readdirSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const GLOSSARIO_DIR = join(process.cwd(), 'src', 'content', 'glossario');

function createSlug(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function translateTerm(term, definition, content, targetLang) {
  const langNames = { en: 'English', es: 'Spanish' };
  const langName = langNames[targetLang];

  const prompt = `
Translate this financial glossary entry to ${langName}. Keep the same structure.
Keep universal financial acronyms (CDI, ETF, IPCA, CDB, LCI, LCA, IOF, PIX) as-is.
For English: convert R$ to approximate USD. For Spanish: keep R$.

Term: ${term}
Definition: ${definition}
Content:
${content}

Respond EXACTLY in this format (no extra text):
---TERM---
[translated term name]
---DEFINITION---
[translated definition, 1-2 sentences]
---CONTENT---
[translated markdown content]
`;

  const result = await generateText(prompt, { maxTokens: 2000, temperature: 0.3 });

  const termMatch = result.match(/---TERM---\s*([\s\S]*?)(?=---DEFINITION---|$)/);
  const defMatch = result.match(/---DEFINITION---\s*([\s\S]*?)(?=---CONTENT---|$)/);
  const contentMatch = result.match(/---CONTENT---\s*([\s\S]*?)$/);

  return {
    term: termMatch ? termMatch[1].trim() : term,
    definition: defMatch ? defMatch[1].trim() : definition,
    content: contentMatch ? contentMatch[1].trim() : content,
  };
}

function parseFrontmatter(fileContent) {
  const match = fileContent.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return null;

  const frontmatter = match[1];
  const content = match[2].trim();

  const term = frontmatter.match(/term:\s*"([^"]+)"/)?.[1] || '';
  const definition = frontmatter.match(/definition:\s*"([^"]+)"/)?.[1] || '';
  const category = frontmatter.match(/category:\s*"([^"]+)"/)?.[1] || 'basico';
  const relatedTerms = frontmatter.match(/relatedTerms:\s*(\[.*\])/)?.[1] || '[]';
  const publishedAt = frontmatter.match(/publishedAt:\s*(.+)/)?.[1] || new Date().toISOString().split('T')[0];

  return { term, definition, category, relatedTerms, publishedAt, content };
}

async function main() {
  console.log('🌐 Traduzindo glossário completo para EN e ES...\n');

  const files = readdirSync(GLOSSARIO_DIR)
    .filter(f => f.endsWith('.md') && !f.startsWith('en-') && !f.startsWith('es-'));

  console.log(`📚 ${files.length} termos para traduzir\n`);

  let translated = 0;
  let skipped = 0;
  let errors = 0;

  for (const file of files) {
    const slug = file.replace('.md', '');
    const enSlug = `en-${slug}`;
    const esSlug = `es-${slug}`;

    // Skip if already translated
    if (existsSync(join(GLOSSARIO_DIR, `${enSlug}.md`)) && existsSync(join(GLOSSARIO_DIR, `${esSlug}.md`))) {
      skipped++;
      continue;
    }

    const fileContent = readFileSync(join(GLOSSARIO_DIR, file), 'utf-8');
    const parsed = parseFrontmatter(fileContent);

    if (!parsed) {
      console.warn(`⚠️ Não consegui parsear: ${file}`);
      errors++;
      continue;
    }

    console.log(`📝 Traduzindo: ${parsed.term}...`);

    try {
      // Translate to EN
      if (!existsSync(join(GLOSSARIO_DIR, `${enSlug}.md`))) {
        const en = await translateTerm(parsed.term, parsed.definition, parsed.content, 'en');
        const enContent = `---
term: "${en.term.replace(/"/g, '\\"')}"
definition: "${en.definition.replace(/"/g, '\\"')}"
category: "${parsed.category}"
locale: "en"
relatedTerms: ${parsed.relatedTerms}
publishedAt: ${parsed.publishedAt}
---

${en.content}
`;
        writeFileSync(join(GLOSSARIO_DIR, `${enSlug}.md`), enContent, 'utf-8');
        console.log(`  ✅ EN: ${en.term}`);
      }

      // Translate to ES
      if (!existsSync(join(GLOSSARIO_DIR, `${esSlug}.md`))) {
        const es = await translateTerm(parsed.term, parsed.definition, parsed.content, 'es');
        const esContent = `---
term: "${es.term.replace(/"/g, '\\"')}"
definition: "${es.definition.replace(/"/g, '\\"')}"
category: "${parsed.category}"
locale: "es"
relatedTerms: ${parsed.relatedTerms}
publishedAt: ${parsed.publishedAt}
---

${es.content}
`;
        writeFileSync(join(GLOSSARIO_DIR, `${esSlug}.md`), esContent, 'utf-8');
        console.log(`  ✅ ES: ${es.term}`);
      }

      translated++;

      // Rate limit: wait 1s between terms to avoid Groq limits
      await new Promise(r => setTimeout(r, 1000));
    } catch (err) {
      console.error(`  ❌ Erro: ${err.message}`);
      errors++;
    }
  }

  console.log(`\n📊 Resultado: ${translated} traduzidos, ${skipped} já existiam, ${errors} erros`);
}

main();
