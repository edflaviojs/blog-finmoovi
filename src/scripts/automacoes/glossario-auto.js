/**
 * Glossário Automático (PT + EN + ES)
 * Executa via GitHub Actions 3x/semana (terça, quinta, sábado às 4h)
 * Gera termos do glossário financeiro em 3 idiomas via Groq
 */

import { config } from '../../../site.config.ts';
import { generateText, generateCoverImage, generateInlineImage } from '../apis/kie-ai.js';
import { writeFileSync, mkdirSync, existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const GLOSSARIO_DIR = join(process.cwd(), 'src', 'content', 'glossario');

// Pool of financial terms to generate
const TERMS_POOL = [
  { term: 'Tesouro Direto', category: 'investimentos' },
  { term: 'CDB', category: 'investimentos' },
  { term: 'LCI e LCA', category: 'investimentos' },
  { term: 'Fundos Imobiliários', category: 'investimentos' },
  { term: 'Ações', category: 'investimentos' },
  { term: 'Dividendos', category: 'investimentos' },
  { term: 'ETF', category: 'investimentos' },
  { term: 'Renda Fixa', category: 'investimentos' },
  { term: 'Renda Variável', category: 'investimentos' },
  { term: 'IPCA', category: 'basico' },
  { term: 'Selic', category: 'basico' },
  { term: 'IOF', category: 'impostos' },
  { term: 'Imposto de Renda', category: 'impostos' },
  { term: 'Come-Cotas', category: 'impostos' },
  { term: 'Spread Bancário', category: 'credito' },
  { term: 'Score de Crédito', category: 'credito' },
  { term: 'Amortização', category: 'credito' },
  { term: 'Tabela SAC vs Price', category: 'credito' },
  { term: 'Diversificação', category: 'investimentos' },
  { term: 'Volatilidade', category: 'mercado' },
  { term: 'Bull Market e Bear Market', category: 'mercado' },
  { term: 'P/L (Preço/Lucro)', category: 'mercado' },
  { term: 'Dividend Yield', category: 'mercado' },
  { term: 'Alavancagem', category: 'mercado' },
  { term: 'Hedge', category: 'mercado' },
  { term: 'Câmbio', category: 'basico' },
  { term: 'Poupança', category: 'basico' },
  { term: 'Cheque Especial', category: 'credito' },
  { term: 'Consórcio', category: 'credito' },
  { term: 'Previdência Privada', category: 'investimentos' },
];

function createSlug(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function generateTermContent(termData) {
  const prompt = `
Escreva uma explicação completa para o glossário financeiro sobre: "${termData.term}"

Requisitos:
- Definição curta (1-2 frases) para o campo "definition"
- Explicação detalhada (300-500 palavras)
- Use headers H2 para organizar
- Inclua exemplos práticos com valores em R$
- Inclua uma tabela comparativa se relevante
- Tom: educativo, simples, sem jargão desnecessário
- Sugira 3 termos relacionados

Formato de saída:
---DEFINICAO---
[definição curta aqui]
---RELACIONADOS---
[termo1, termo2, termo3]
---CONTEUDO---
[conteúdo em markdown aqui]
`;

  const result = await generateText(prompt, { maxTokens: 2000, temperature: 0.6 });

  const defMatch = result.match(/---DEFINICAO---\s*([\s\S]*?)(?=---RELACIONADOS---|---CONTEUDO---|$)/);
  const relMatch = result.match(/---RELACIONADOS---\s*([\s\S]*?)(?=---CONTEUDO---|$)/);
  const contentMatch = result.match(/---CONTEUDO---\s*([\s\S]*?)$/);

  return {
    definition: defMatch ? defMatch[1].trim() : `Explicação sobre ${termData.term} no contexto financeiro brasileiro.`,
    relatedTerms: relMatch ? relMatch[1].trim().split(',').map(t => t.trim()) : [],
    content: contentMatch ? contentMatch[1].trim() : result,
  };
}

async function translateTerm(termData, ptContent, targetLang) {
  const langNames = { en: 'English', es: 'Spanish' };
  const langName = langNames[targetLang];

  const prompt = `
Translate the following financial glossary entry to ${langName}.
Keep the same structure and formatting. Keep financial term names that are universal (CDI, ETF, IPCA) as-is.
Convert R$ examples to approximate USD equivalents for English, or keep R$ for Spanish.

Original term: ${termData.term}
Original definition: ${ptContent.definition}
Original content:
${ptContent.content}

Respond in this exact format:
---TERM---
[translated term name, or keep original if it's a universal acronym]
---DEFINICAO---
[translated definition]
---CONTEUDO---
[translated content in markdown]
`;

  const result = await generateText(prompt, { maxTokens: 2000, temperature: 0.3 });

  const termMatch = result.match(/---TERM---\s*([\s\S]*?)(?=---DEFINICAO---|$)/);
  const defMatch = result.match(/---DEFINICAO---\s*([\s\S]*?)(?=---CONTEUDO---|$)/);
  const contentMatch = result.match(/---CONTEUDO---\s*([\s\S]*?)$/);

  return {
    term: termMatch ? termMatch[1].trim() : termData.term,
    definition: defMatch ? defMatch[1].trim() : ptContent.definition,
    content: contentMatch ? contentMatch[1].trim() : ptContent.content,
  };
}

function saveGlossaryTerm(slug, data) {
  const frontmatter = `---
term: "${data.term.replace(/"/g, '\\"')}"
definition: "${data.definition.replace(/"/g, '\\"')}"
title: "${data.term.replace(/"/g, '\\"')}"
description: "${data.definition.replace(/"/g, '\\"')}"
category: "${data.category}"
locale: "${data.locale}"
image: "${data.image || ''}"
relatedTerms: ${JSON.stringify(data.relatedTerms || [])}
author: "${config.content.defaultAuthor}"
publishedAt: ${data.today}
readingTime: 5
translationKey: "${data.translationKey || ''}"
seo:
  metaTitle: "${data.term.replace(/"/g, '\\"')}"
  metaDescription: "${data.definition.replace(/"/g, '\\"')}"
  keywords: ${JSON.stringify(data.relatedTerms || [])}
---

${data.content}
`;

  const filePath = join(GLOSSARIO_DIR, `${slug}.md`);
  writeFileSync(filePath, frontmatter, 'utf-8');
  return filePath;
}

async function insertInlineImages(content, slugBase) {
  const h2Matches = content.match(/^## .+$/gm) || [];
  if (h2Matches.length < 2) return content;

  const headings = h2Matches.map(h => h.replace('## ', ''));
  let result = content;

  // Insert 2 images: after 1st and 3rd heading (or last available)
  const positions = [0, Math.min(2, headings.length - 1)];

  for (let idx = positions.length - 1; idx >= 0; idx--) {
    const i = positions[idx];
    const sectionTopic = `financial glossary ${headings[i]}`;
    const imgPath = await generateInlineImage(sectionTopic, `${slugBase}-inline-${i + 1}`, 'glossario');
    const headingText = headings[i];
    const headingPattern = `## ${headingText}`;
    const headingIndex = result.indexOf(headingPattern);

    if (headingIndex !== -1) {
      const afterHeading = result.indexOf('\n\n', headingIndex + headingPattern.length);
      if (afterHeading !== -1) {
        const nextParagraphEnd = result.indexOf('\n\n', afterHeading + 2);
        const insertAt = nextParagraphEnd !== -1 ? nextParagraphEnd : afterHeading;
        const imgMarkdown = `\n\n![${headingText}](${imgPath})\n\n`;
        result = result.slice(0, insertAt) + imgMarkdown + result.slice(insertAt);
      }
    }
  }

  return result;
}

async function main() {
  console.log('🚀 Gerando termo do glossário (PT + EN + ES)...');

  try {
    if (!existsSync(GLOSSARIO_DIR)) {
      mkdirSync(GLOSSARIO_DIR, { recursive: true });
    }

    const existingFiles = readdirSync(GLOSSARIO_DIR).map(f => f.replace('.md', ''));

    // Guard: check if a glossário term was already generated today (prevent duplicates)
    const todayStr = new Date().toISOString().split('T')[0];
    const ptFiles = readdirSync(GLOSSARIO_DIR).filter(f => f.endsWith('.md') && !f.startsWith('en-') && !f.startsWith('es-'));
    for (const file of ptFiles) {
      const content = readFileSync(join(GLOSSARIO_DIR, file), 'utf-8');
      if (content.includes(`publishedAt: ${todayStr}`)) {
        console.log(`⚠️ Já existe um termo gerado hoje (${file}). Abortando para evitar duplicata.`);
        return;
      }
    }

    // Find next term to generate (check PT slug only)
    const pendingTerms = TERMS_POOL.filter(t => {
      const slug = createSlug(t.term);
      return !existingFiles.includes(slug);
    });

    if (pendingTerms.length === 0) {
      console.log('✅ Todos os termos já foram gerados!');
      return;
    }

    const termData = pendingTerms[0];
    const slugPt = createSlug(termData.term);
    const today = new Date().toISOString().split('T')[0];

    console.log(`📝 Gerando: ${termData.term}`);

    // 1. Generate PT content
    const ptContent = await generateTermContent(termData);
    console.log(`✅ PT gerado: ${termData.term}`);

    // 2. Generate cover image
    console.log('🖼️ Gerando imagem de capa...');
    const imagePath = await generateCoverImage(termData.term, slugPt, 'glossario');
    console.log(`🖼️ Capa salva: ${imagePath}`);

    // 3. Insert 2 inline AI images into PT content
    console.log('🖼️ Inserindo imagens inline...');
    const contentWithImages = await insertInlineImages(ptContent.content, slugPt);

    // 4. Save PT
    const ptPath = saveGlossaryTerm(slugPt, {
      term: termData.term,
      definition: ptContent.definition,
      category: termData.category,
      locale: 'pt',
      image: imagePath,
      relatedTerms: ptContent.relatedTerms,
      today,
      content: contentWithImages,
      translationKey: `glossario-${slugPt}`,
    });
    console.log(`📄 PT salvo: ${ptPath}`);

    // 5. Translate to EN
    console.log('🌐 Traduzindo para inglês...');
    const enContent = await translateTerm(termData, ptContent, 'en');
    // Filename SEMPRE derivado do slug PT (nunca do termo traduzido) — invariante do i18n-sync.
    const slugEn = `en-${slugPt}`;
    const enContentWithImages = await insertInlineImages(enContent.content, slugEn);

    const enPath = saveGlossaryTerm(slugEn, {
      term: enContent.term,
      definition: enContent.definition,
      category: termData.category,
      locale: 'en',
      image: imagePath,
      relatedTerms: ptContent.relatedTerms,
      today,
      content: enContentWithImages,
      translationKey: `glossario-${slugPt}`,
    });
    console.log(`📄 EN salvo: ${enPath}`);

    // 6. Translate to ES
    console.log('🌐 Traduzindo para espanhol...');
    const esContent = await translateTerm(termData, ptContent, 'es');
    const slugEs = `es-${slugPt}`;
    const esContentWithImages = await insertInlineImages(esContent.content, slugEs);

    const esPath = saveGlossaryTerm(slugEs, {
      term: esContent.term,
      definition: esContent.definition,
      category: termData.category,
      locale: 'es',
      image: imagePath,
      relatedTerms: ptContent.relatedTerms,
      today,
      content: esContentWithImages,
      translationKey: `glossario-${slugPt}`,
    });
    console.log(`📄 ES salvo: ${esPath}`);

    // 7. Git commit all
    const IMAGES_DIR = join(process.cwd(), 'public', 'images', 'glossario');
    execSync(`git add "${GLOSSARIO_DIR}"`, { stdio: 'inherit' });
    execSync(`git add "${IMAGES_DIR}"`, { stdio: 'inherit' });

    // Add internal links to posts (new glossary term may match existing posts)
    console.log('🔗 Adicionando internal links...');
    execSync('node src/scripts/automacoes/internal-linking.js', { stdio: 'inherit' });
    const postsDir = join(process.cwd(), 'src', 'content', 'posts');
    execSync(`git add "${postsDir}"`, { stdio: 'inherit' });

    execSync(`git commit -m "glossário: ${termData.term} [PT/EN/ES]"`, { stdio: 'inherit' });

    console.log(`✅ Termo "${termData.term}" publicado em 3 idiomas!`);
  } catch (error) {
    console.error('❌ Erro ao gerar glossário:', error.message);
    process.exit(1);
  }
}

main();
