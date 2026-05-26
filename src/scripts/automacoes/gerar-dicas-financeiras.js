/**
 * Gerador de Dicas Financeiras
 * Executa via GitHub Actions 3x/semana (seg, qua, sex às 6h)
 * Gera um post completo com texto + imagem via Kie.AI
 */

import { generateBlogPost } from '../apis/kie-ai.js';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const POSTS_DIR = join(process.cwd(), 'src', 'content', 'posts');

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
      throw new Error('API retornou post vazio ou incompleto. Verifique se KIE_API_KEY está válida.');
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

    // Create frontmatter
    const frontmatter = `---
title: "${post.title.replace(/"/g, '\\"')}"
description: "${post.meta.replace(/"/g, '\\"')}"
image: ""
category: "dicas"
tags: ${JSON.stringify(post.keywords || [topic, 'finanças pessoais'])}
author: "FinMoovi"
publishedAt: ${today}
readingTime: ${Math.ceil(post.content.split(/\s+/).length / 200)}
featured: false
seo:
  metaTitle: "${post.title.replace(/"/g, '\\"')}"
  metaDescription: "${post.meta.replace(/"/g, '\\"')}"
  keywords: ${JSON.stringify(post.keywords || [])}
---

${post.content}
`;

    // Save post file
    const postPath = join(POSTS_DIR, `${slug}.md`);
    if (!existsSync(POSTS_DIR)) {
      mkdirSync(POSTS_DIR, { recursive: true });
    }
    writeFileSync(postPath, frontmatter, 'utf-8');
    console.log(`📄 Post salvo: ${postPath}`);

    // Git commit
    execSync(`git add "${postPath}"`, { stdio: 'inherit' });
    execSync(`git commit -m "post: ${post.title.substring(0, 50)}"`, { stdio: 'inherit' });

    console.log('✅ Commit criado com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao gerar post:', error.message);
    process.exit(1);
  }
}

main();
