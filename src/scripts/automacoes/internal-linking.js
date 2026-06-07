/**
 * Internal Linking: adiciona links para o glossário E entre posts
 * Identifica termos do glossário e posts relacionados no texto
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

  return terms.sort((a, b) => b.term.length - a.term.length);
}

function getPostLinks(locale, excludeSlug) {
  const files = readdirSync(POSTS_DIR).filter(f => {
    if (!f.endsWith('.md')) return false;
    if (locale === 'pt') return !f.startsWith('en-') && !f.startsWith('es-');
    return f.startsWith(`${locale}-`);
  });

  const posts = [];
  for (const file of files) {
    const slug = file.replace('.md', '');
    if (slug === excludeSlug) continue;
    const content = readFileSync(join(POSTS_DIR, file), 'utf-8');
    const titleMatch = content.match(/^title:\s*"?([^"\n]+)"?/m);
    const tagsMatch = content.match(/^tags:\s*\[([^\]]*)\]/m);
    if (titleMatch) {
      const title = titleMatch[1].trim().replace(/\\"/g, '"');
      const tags = tagsMatch ? tagsMatch[1].replace(/"/g, '').split(',').map(t => t.trim()).filter(Boolean) : [];
      const basePath = locale === 'pt' ? '' : `/${locale}`;
      const baseSlug = locale === 'pt' ? slug : slug.replace(`${locale}-`, '');
      posts.push({ title, slug: baseSlug, tags, url: `${basePath}/posts/${baseSlug}` });
    }
  }
  return posts;
}

function addLinksToBody(body, terms, postLinks, maxGlossaryLinks = 3, maxPostLinks = 2) {
  let glossaryLinked = 0;
  let postLinked = 0;
  let result = body;

  // Glossary links first
  for (const { term, url } of terms) {
    if (glossaryLinked >= maxGlossaryLinks) break;
    if (result.includes(`(${url})`)) continue;

    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(
      `(?<![\\[#])\\b(${escapedTerm})\\b(?![\\]\\(])`,
      'i'
    );

    const match = result.match(regex);
    if (match) {
      result = result.replace(regex, `[${match[1]}](${url})`);
      glossaryLinked++;
    }
  }

  // Cross-post links (match post titles or key phrases from tags)
  for (const post of postLinks) {
    if (postLinked >= maxPostLinks) break;
    if (result.includes(`(${post.url})`)) continue;

    // Try to match significant tags (3+ chars) in the body
    for (const tag of post.tags.filter(t => t.length >= 5)) {
      const escapedTag = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(
        `(?<![\\[#])\\b(${escapedTag})\\b(?![\\]\\(])`,
        'i'
      );
      const match = result.match(regex);
      if (match) {
        result = result.replace(regex, `[${match[1]}](${post.url})`);
        postLinked++;
        break;
      }
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
  console.log('🔗 Adicionando internal links (glossário + posts) ...\n');

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
    const slug = file.replace('.md', '');
    const postLinks = getPostLinks(locale, slug);

    if (!terms || terms.length === 0) continue;

    const newBody = addLinksToBody(body, terms, postLinks);

    if (newBody !== body) {
      writeFileSync(filePath, fm + newBody, 'utf-8');
      modified++;
      console.log(`✅ ${file} — links adicionados`);
    }
  }

  console.log(`\n📊 Resultado: ${modified} posts modificados de ${postFiles.length} total`);
}

main();
