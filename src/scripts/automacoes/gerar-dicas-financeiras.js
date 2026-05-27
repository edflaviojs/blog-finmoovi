/**
 * Gerador de Dicas Financeiras
 * Executa via GitHub Actions 3x/semana (seg, qua, sex às 6h)
 * Gera um post completo com texto + imagem de capa via Groq + Pollinations
 */

import { generateBlogPost } from '../apis/kie-ai.js';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
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

async function main() {
  console.log('🚀 Gerando post de dica financeira...');

  // Pick topic based on day of year (rotates through pool)
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const topicIndex = dayOfYear % TOPICS.length;
  const topic = TOPICS[topicIndex];

  console.log(`📝 Tópico: ${topic}`);

  try {
    // Generate the post
    const post = await generateBlogPost(topic, {
      category: 'dicas',
      keywords: [topic, 'finanças pessoais', 'economia', 'dinheiro'],
    });

    if (!post.title || !post.content) {
      throw new Error('API retornou post vazio ou incompleto. Verifique se GROQ_API_KEY está válida.');
    }

    console.log(`✅ Post gerado: ${post.title}`);

    // Create slug from title
    const slug = post.title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 60);

    const today = new Date().toISOString().split('T')[0];

    // Download and save cover image from Pollinations
    let imagePath = '';
    if (post.image) {
      try {
        console.log('🖼️ Gerando imagem de capa...');
        const imageResponse = await fetch(post.image);
        if (imageResponse.ok) {
          const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
          const imageFilename = `${slug}.jpg`;
          const imageFullPath = join(IMAGES_DIR, imageFilename);

          if (!existsSync(IMAGES_DIR)) {
            mkdirSync(IMAGES_DIR, { recursive: true });
          }

          writeFileSync(imageFullPath, imageBuffer);
          imagePath = `/images/posts/${imageFilename}`;
          console.log(`🖼️ Imagem de capa salva: ${imagePath}`);
        }
      } catch (imgErr) {
        console.warn('⚠️ Falha ao salvar imagem de capa, continuando sem:', imgErr.message);
      }
    }

    // Download and save inline images from content
    let processedContent = post.content;
    const inlineImageRegex = /!\[([^\]]*)\]\((https:\/\/image\.pollinations\.ai[^)]+)\)/g;
    let match;
    let inlineIndex = 0;
    const inlineMatches = [];

    while ((match = inlineImageRegex.exec(post.content)) !== null) {
      inlineMatches.push({ full: match[0], alt: match[1], url: match[2] });
    }

    for (const img of inlineMatches) {
      inlineIndex++;
      try {
        console.log(`🖼️ Gerando imagem inline ${inlineIndex}...`);
        const imgResponse = await fetch(img.url);
        if (imgResponse.ok) {
          const imgBuffer = Buffer.from(await imgResponse.arrayBuffer());
          const imgFilename = `${slug}-${inlineIndex}.jpg`;
          const imgFullPath = join(IMAGES_DIR, imgFilename);

          if (!existsSync(IMAGES_DIR)) {
            mkdirSync(IMAGES_DIR, { recursive: true });
          }

          writeFileSync(imgFullPath, imgBuffer);
          const localPath = `/images/posts/${imgFilename}`;
          processedContent = processedContent.replace(img.full, `![${img.alt}](${localPath})`);
          console.log(`🖼️ Imagem inline ${inlineIndex} salva: ${localPath}`);
        }
      } catch (imgErr) {
        console.warn(`⚠️ Falha na imagem inline ${inlineIndex}, removendo:`, imgErr.message);
        processedContent = processedContent.replace(img.full, '');
      }
    }

    // Create frontmatter
    const frontmatter = `---
title: "${post.title.replace(/"/g, '\\"')}"
description: "${post.meta.replace(/"/g, '\\"')}"
image: "${imagePath}"
category: "dicas"
locale: "pt"
tags: ${JSON.stringify(post.keywords || [topic, 'finanças pessoais'])}
author: "FinMoovi"
publishedAt: ${today}
readingTime: ${Math.ceil(processedContent.split(/\s+/).length / 200)}
featured: false
seo:
  metaTitle: "${post.title.replace(/"/g, '\\"')}"
  metaDescription: "${post.meta.replace(/"/g, '\\"')}"
  keywords: ${JSON.stringify(post.keywords || [])}
---

${processedContent}
`;

    // Save post file
    const postPath = join(POSTS_DIR, `${slug}.md`);
    if (!existsSync(POSTS_DIR)) {
      mkdirSync(POSTS_DIR, { recursive: true });
    }
    writeFileSync(postPath, frontmatter, 'utf-8');
    console.log(`📄 Post salvo: ${postPath}`);

    // Git commit - add post file and all generated images
    execSync(`git add "${postPath}"`, { stdio: 'inherit' });
    execSync(`git add "${IMAGES_DIR}"`, { stdio: 'inherit' });
    execSync(`git commit -m "post: ${post.title.substring(0, 50)}"`, { stdio: 'inherit' });

    console.log('✅ Commit criado com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao gerar post:', error.message);
    process.exit(1);
  }
}

main();
