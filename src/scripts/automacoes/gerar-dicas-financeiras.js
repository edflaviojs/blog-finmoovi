/**
 * Gerador de Dicas Financeiras (PT + EN + ES)
 * Executa via GitHub Actions diariamente às 6h BRT
 * Gera um post completo em 3 idiomas com imagens SVG locais via Groq
 */

import { generateBlogPost, generateText, generateCoverImage, generateInlineImage } from '../apis/kie-ai.js';
import { writeFileSync, mkdirSync, existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const POSTS_DIR = join(process.cwd(), 'src', 'content', 'posts');
const IMAGES_DIR = join(process.cwd(), 'public', 'images', 'posts');

// Topics pool — rotates through these
const TOPICS = [
  'como economizar dinheiro no supermercado',
  'como negociar dívidas com o banco',
  'como montar um orçamento familiar',
  'como usar cartão de crédito sem se endividar',
  'como começar a investir com pouco dinheiro',
  'como criar o hábito de poupar',
  'como reduzir gastos fixos mensais',
  'como organizar finanças de casal',
  'como fazer renda extra em 2025',
  'como sair das dívidas em 6 meses',
  'como ensinar finanças para crianças',
  'como planejar uma viagem sem se endividar',
  'como montar uma reserva de emergência rápido',
  'como controlar gastos com delivery e apps',
  'como fazer um detox financeiro',
  'como usar a regra dos 30 dias para compras',
  'como economizar na conta de energia',
  'como organizar finanças sendo autônomo',
  'como definir prioridades financeiras',
  'como evitar compras por impulso',
];

/**
 * Translate a post to another language using Groq
 */
async function translatePost(post, targetLang) {
  const langNames = { en: 'English', es: 'Spanish' };
  const langName = langNames[targetLang];

  const prompt = `
Translate the following blog post to ${langName}. Keep the same tone, style, and structure.
Do NOT translate brand names (FinMoovi). Keep markdown formatting intact.
Keep all image markdown (![alt](url)) exactly as-is, do not modify image paths.
Keep the CTA link to finmoovi.com as-is.

Respond in this exact format:
---TITULO---
[translated title]
---META---
[translated meta description]
---KEYWORDS---
[translated keywords, comma separated]
---CONTEUDO---
[translated content in markdown]

Original post:

Title: ${post.title}
Meta: ${post.meta}
Keywords: ${(post.keywords || []).join(', ')}
Content:
${post.processedContent}
`;

  const result = await generateText(prompt, { maxTokens: 5000, temperature: 0.3 });

  // Parse translated content
  const titleMatch = result.match(/---TITULO---\s*([\s\S]*?)(?=---META---|$)/);
  const metaMatch = result.match(/---META---\s*([\s\S]*?)(?=---KEYWORDS---|$)/);
  const keywordsMatch = result.match(/---KEYWORDS---\s*([\s\S]*?)(?=---CONTEUDO---|$)/);
  const contentMatch = result.match(/---CONTEUDO---\s*([\s\S]*?)$/);

  return {
    title: titleMatch ? titleMatch[1].trim() : post.title,
    meta: metaMatch ? metaMatch[1].trim() : post.meta,
    keywords: keywordsMatch ? keywordsMatch[1].trim().split(',').map(k => k.trim()) : post.keywords,
    content: contentMatch ? contentMatch[1].trim() : post.processedContent,
  };
}

/**
 * Create slug from title
 */
function createSlug(title) {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 60);
}

/**
 * Download image from URL and save locally (fallback, rarely used now)
 */
async function downloadImage(url, filename) {
  // If it's our SVG marker, skip download
  if (url && url.startsWith('__SVG_GENERATE__')) return '';
  try {
    const response = await fetch(url);
    if (response.ok) {
      const buffer = Buffer.from(await response.arrayBuffer());
      const fullPath = join(IMAGES_DIR, filename);
      if (!existsSync(IMAGES_DIR)) {
        mkdirSync(IMAGES_DIR, { recursive: true });
      }
      writeFileSync(fullPath, buffer);
      return `/images/posts/${filename}`;
    }
  } catch (err) {
    console.warn(`⚠️ Falha ao baixar imagem: ${err.message}`);
  }
  return '';
}

/**
 * Insert inline SVG images into content (1 image every 2 H2 sections)
 */
async function insertInlineImages(content, slugBase) {
  const h2Matches = content.match(/^## .+$/gm) || [];
  if (h2Matches.length < 2) return content;

  const headings = h2Matches.map(h => h.replace('## ', ''));
  let result = content;

  // Insert images after every 2nd heading (counting from 1)
  for (let i = headings.length - 1; i >= 1; i -= 2) {
    const sectionTopic = `${slugBase} - ${headings[i]}`;
    const imgPath = await generateInlineImage(sectionTopic, `${slugBase}-${i}`, 'posts');
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

/**
 * Save a post file with frontmatter
 */
function savePost(slug, data, isFeatured = false) {
  const frontmatter = `---
title: "${data.title.replace(/"/g, '\\"')}"
description: "${data.meta.replace(/"/g, '\\"')}"
image: "${data.imagePath}"
category: "dicas"
locale: "${data.locale}"
tags: ${JSON.stringify(data.keywords || [])}
author: "FinMoovi"
publishedAt: ${data.today}
readingTime: ${Math.ceil(data.content.split(/\s+/).length / 200)}
featured: ${isFeatured}
translationKey: "${data.translationKey || ''}"
seo:
  metaTitle: "${data.title.replace(/"/g, '\\"')}"
  metaDescription: "${data.meta.replace(/"/g, '\\"')}"
  keywords: ${JSON.stringify(data.keywords || [])}
---

${data.content}
`;

  const postPath = join(POSTS_DIR, `${slug}.md`);
  if (!existsSync(POSTS_DIR)) {
    mkdirSync(POSTS_DIR, { recursive: true });
  }
  writeFileSync(postPath, frontmatter, 'utf-8');
  return postPath;
}

async function main() {
  console.log('🚀 Gerando post de dica financeira (PT + EN + ES)...');

  // Pick topic based on day of year (rotates through pool)
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const topicIndex = dayOfYear % TOPICS.length;
  const topic = TOPICS[topicIndex];

  console.log(`📝 Tópico: ${topic}`);

  // Guard: check if a dica was already generated today (prevent duplicates)
  const today = new Date().toISOString().split('T')[0];
  const existingFiles = readdirSync(POSTS_DIR).filter(f => f.endsWith('.md') && !f.startsWith('en-') && !f.startsWith('es-'));
  for (const file of existingFiles) {
    const content = readFileSync(join(POSTS_DIR, file), 'utf-8');
    const hasToday = content.includes(`publishedAt: ${today}`);
    const isDica = content.includes('category: "dicas"');
    if (hasToday && isDica) {
      console.log(`⚠️ Já existe uma dica gerada hoje (${file}). Abortando para evitar duplicata.`);
      return;
    }
  }

  try {
    // 1. Generate PT post
    const post = await generateBlogPost(topic, {
      category: 'dicas',
      keywords: [topic, 'finanças pessoais', 'economia', 'dinheiro'],
    });

    if (!post.title || !post.content) {
      throw new Error('API retornou post vazio ou incompleto.');
    }

    console.log(`✅ Post PT gerado: ${post.title}`);

    const slugPt = createSlug(post.title);
    const today = new Date().toISOString().split('T')[0];

    // 2. Generate cover image (AI-powered with SVG fallback)
    console.log('🖼️ Gerando imagem de capa...');
    const imagePath = await generateCoverImage(post.title, slugPt, 'posts');
    console.log(`🖼️ Capa salva: ${imagePath}`);

    // 3. Insert inline images for PT
    console.log('🖼️ Inserindo imagens inline PT...');
    const processedContentPt = await insertInlineImages(post.content, slugPt);

    // 4. Save PT post
    const ptPath = savePost(slugPt, {
      title: post.title,
      meta: post.meta,
      keywords: post.keywords,
      content: processedContentPt,
      imagePath,
      locale: 'pt',
      today,
      translationKey: slugPt,
    }, true); // Mark PT post as featured
    console.log(`📄 PT salvo: ${ptPath}`);

    // 5. Translate to EN (wait 30s to avoid rate limit)
    console.log('⏳ Aguardando 30s para evitar rate limit...');
    await new Promise(r => setTimeout(r, 30000));
    console.log('🌐 Traduzindo para inglês...');
    const enPost = await translatePost({
      title: post.title,
      meta: post.meta,
      keywords: post.keywords,
      processedContent: processedContentPt,
    }, 'en');

    const slugEn = 'en-' + createSlug(enPost.title);
    const enPath = savePost(slugEn, {
      title: enPost.title,
      meta: enPost.meta,
      keywords: enPost.keywords,
      content: enPost.content,
      imagePath, // same cover image
      locale: 'en',
      today,
      translationKey: slugPt,
    });
    console.log(`📄 EN salvo: ${enPath}`);

    // 6. Translate to ES (wait 30s to avoid rate limit)
    console.log('⏳ Aguardando 30s para evitar rate limit...');
    await new Promise(r => setTimeout(r, 30000));
    console.log('🌐 Traduzindo para espanhol...');
    const esPost = await translatePost({
      title: post.title,
      meta: post.meta,
      keywords: post.keywords,
      processedContent: processedContentPt,
    }, 'es');

    const slugEs = 'es-' + createSlug(esPost.title);
    const esPath = savePost(slugEs, {
      title: esPost.title,
      meta: esPost.meta,
      keywords: esPost.keywords,
      content: esPost.content,
      imagePath, // same cover image
      locale: 'es',
      today,
      translationKey: slugPt,
    });
    console.log(`📄 ES salvo: ${esPath}`);

    // 7. Git commit all
    execSync(`git add "${POSTS_DIR}" "${IMAGES_DIR}"`, { stdio: 'inherit' });
    execSync(`git commit -m "post: ${post.title.substring(0, 40)} [PT/EN/ES]"`, { stdio: 'inherit' });

    console.log('✅ Commit criado com sucesso! (3 idiomas)');
  } catch (error) {
    console.error('❌ Erro ao gerar post:', error.message);
    process.exit(1);
  }
}

main();
