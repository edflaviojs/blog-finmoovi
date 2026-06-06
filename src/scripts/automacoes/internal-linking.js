/**
 * Internal Linking: adiciona links para o glossário dentro dos posts
 * Identifica termos do glossário no texto e insere links automaticamente
 *
 * Uso: node src/scripts/automacoes/internal-linking.js
 * Seguro para re-executar: não duplica links existentes
 */

import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const POSTS_DIR = join(process.cwd(), 'src', 'content', 'posts');
const GLOSSARIO_DIR = join(process.cwd(), 'src', 'content', 'glossario');

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { fm: '', body: content };
  return { fm: match[0], body: content.slice(match[0].length) };
}

function getGlossaryTerms(locale) {
  const prefix = locale === 'pt' ? '' : `${locale}-`;
  const files = readdirSync(GLOSSARIO_DIR).filter(f => {
    if (!f.endsWith('.md')) return false;
    if (locale === 'pt') return !f.startsWith('en-') && !f.startsWith('es-');
    return f.startsWith(prefix);
  });

  const terms = [];
  for (const file of files) {
    const content = readFileSync(join(GLOSSARIO_DIR, file), 'utf-8');
    const termMatch = content.match(/^term:\s*"?([^"\n]+)"?/m);
    if (termMatch) {
      const slug = file.replace('.md', '');
      const basePath = locale === 'pt' ? '/glossario' : `/${locale}/glossario`;
      terms.push({
        term: termMatch[1].trim(),
        slug,
        url: `${basePath}/${slug}`
      });
    }
  }

  // Sort by term length descending (link longer terms first to avoid partial matches)
  return terms.sort((a, b) => b.term.length - a.term.length);
}

function addLinksToBody(body, terms, maxLinks = 3) {
  let linked = 0;
  let result = body;

  for (const { term, url } of terms) {
    if (linked >= maxLinks) break;

    // Skip if this term is already linked in the body
    if (result.includes(`(${url})`)) continue;

    // Match term as whole word, case-insensitive, not inside markdown links or headings
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(
      `(?<![\\[#])\\b(${escapedTerm})\\b(?![\\]\\(])`,
      'i'
    );

    const match = result.match(regex);
    if (match) {
      // Only link the first occurrence
      result = result.replace(regex, `[${match[1]}](${url})`);
      linked++;
    }
  }

  return result;
}

function getPostLocale(filename) {
  if (filename.startsWith('en-')) return 'en';
  if (filename.startsWith('es-')) return 'es';
  return 'pt';
}

function main() {
  console.log('🔗 Adicionando internal links (glossário) nos posts...\n');

  const postFiles = readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));
  let modified = 0;

  const termsByLocale = {
    pt: getGlossaryTerms('pt'),
    en: getGlossaryTerms('en'),
    es: getGlossaryTerms('es')
  };

  console.log(`📚 Termos: PT=${termsByLocale.pt.length}, EN=${termsByLocale.en.length}, ES=${termsByLocale.es.length}`);

  for (const file of postFiles) {
    const filePath = join(POSTS_DIR, file);
    const content = readFileSync(filePath, 'utf-8');
    const { fm, body } = parseFrontmatter(content);

    const locale = getPostLocale(file);
    const terms = termsByLocale[locale];

    if (!terms || terms.length === 0) continue;

    const newBody = addLinksToBody(body, terms);

    if (newBody !== body) {
      writeFileSync(filePath, fm + newBody, 'utf-8');
      modified++;
      console.log(`✅ ${file} — links adicionados`);
    }
  }

  console.log(`\n📊 Resultado: ${modified} posts modificados de ${postFiles.length} total`);
}

main();
