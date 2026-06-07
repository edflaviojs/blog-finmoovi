import { config } from '../../../site.config.ts';
/**
 * Gerador de Posts de Comparação (PT + EN + ES)
 * Executa sextas-feiras às 9h BRT via GitHub Actions
 * Gera posts tipo "CDB vs Tesouro: qual rende mais?"
 * Altíssimo valor SEO — keywords de comparação têm alta intenção de busca
 */

import { generateText, generateCoverImage, generateInlineImage } from '../apis/kie-ai.js';
import { writeFileSync, mkdirSync, existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const POSTS_DIR = join(process.cwd(), 'src', 'content', 'posts');

const COMPARACOES = [
  { a: 'CDB', b: 'Tesouro Selic', keywords: ['cdb vs tesouro selic', 'onde investir', 'renda fixa comparação', 'qual rende mais cdb ou tesouro'] },
  { a: 'Poupança', b: 'CDB com liquidez diária', keywords: ['poupança vs cdb', 'vale a pena poupança', 'melhor que poupança', 'onde guardar dinheiro'] },
  { a: 'Nubank', b: 'Inter', keywords: ['nubank vs inter', 'melhor conta digital', 'conta digital gratuita', 'nubank ou inter 2026'] },
  { a: 'Cartão de crédito', b: 'Cartão de débito', keywords: ['crédito vs débito', 'vantagens cartão crédito', 'quando usar débito'] },
  { a: 'Aluguel', b: 'Financiamento', keywords: ['alugar ou financiar', 'vale a pena financiar imóvel', 'aluguel vs financiamento 2026'] },
  { a: 'Renda fixa', b: 'Renda variável', keywords: ['renda fixa vs variável', 'onde investir iniciante', 'diferença renda fixa variável'] },
  { a: 'PIX', b: 'TED e DOC', keywords: ['pix vs ted', 'diferença pix ted', 'pix é melhor que ted'] },
  { a: 'Tesouro IPCA+', b: 'Tesouro Prefixado', keywords: ['ipca vs prefixado', 'tesouro direto qual escolher', 'proteção inflação'] },
  { a: 'Investir', b: 'Quitar dívidas', keywords: ['investir ou pagar dívida', 'prioridade financeira', 'dívida ou investimento'] },
  { a: 'Fundo de investimento', b: 'ETF', keywords: ['fundo vs etf', 'etf vale a pena', 'taxa administração fundo'] },
  { a: 'Consórcio', b: 'Financiamento de carro', keywords: ['consórcio vs financiamento', 'comprar carro consórcio', 'melhor forma comprar carro'] },
  { a: 'Previdência privada', b: 'Investir por conta própria', keywords: ['previdência privada vale a pena', 'pgbl vs vgbl', 'aposentadoria investir sozinho'] },
];

function createSlug(title) {
  return title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 60);
}

async function insertInlineImages(content, slugBase) {
  const h2Matches = content.match(/^## .+$/gm) || [];
  if (h2Matches.length < 2) return content;
  const headings = h2Matches.map(h => h.replace('## ', ''));
  let result = content;
  let imagePositions = headings.length >= 6 ? [1, 3, 5] : headings.length >= 4 ? [1, 2, 3] : [0, 1];

  for (let idx = imagePositions.length - 1; idx >= 0; idx--) {
    const i = imagePositions[idx];
    if (i >= headings.length) continue;
    const imgPath = await generateInlineImage(`${slugBase} - ${headings[i]}`, `${slugBase}-${i + 1}`, 'posts');
    const headingText = headings[i];
    const headingIndex = result.indexOf(`## ${headingText}`);
    if (headingIndex !== -1) {
      const afterHeading = result.indexOf('\n\n', headingIndex + headingText.length + 3);
      if (afterHeading !== -1) {
        const nextEnd = result.indexOf('\n\n', afterHeading + 2);
        const insertAt = nextEnd !== -1 ? nextEnd : afterHeading;
        result = result.slice(0, insertAt) + `\n\n![${headingText}](${imgPath})\n\n` + result.slice(insertAt);
      }
    }
  }
  return result;
}

async function translatePost(post, targetLang) {
  const langNames = { en: 'English', es: 'Spanish' };
  const prompt = `Translate the following blog post to ${langNames[targetLang]}. Keep tone, style, markdown, image paths, and brand names intact.

Respond in this format:
---TITULO---
[translated title]
---META---
[translated meta description]
---KEYWORDS---
[translated keywords, comma separated]
---CONTEUDO---
[translated content]

Original:
Title: ${post.title}
Meta: ${post.meta}
Keywords: ${(post.keywords || []).join(', ')}
Content:
${post.content}
`;
  const result = await generateText(prompt, { maxTokens: 5000, temperature: 0.3 });
  const t = result.match(/---TITULO---\s*([\s\S]*?)(?=---META---|$)/);
  const m = result.match(/---META---\s*([\s\S]*?)(?=---KEYWORDS---|$)/);
  const k = result.match(/---KEYWORDS---\s*([\s\S]*?)(?=---CONTEUDO---|$)/);
  const c = result.match(/---CONTEUDO---\s*([\s\S]*?)$/);
  return {
    title: t ? t[1].trim() : post.title,
    meta: m ? m[1].trim() : post.meta,
    keywords: k ? k[1].trim().split(',').map(x => x.trim()) : post.keywords,
    content: c ? c[1].trim() : post.content,
  };
}

function savePost(slug, data) {
  const frontmatter = `---
title: "${data.title.replace(/"/g, '\\"')}"
description: "${data.meta.replace(/"/g, '\\"')}"
image: "${data.imagePath}"
category: "investimentos"
locale: "${data.locale}"
tags: ${JSON.stringify(data.keywords || [])}
author: "${config.content.defaultAuthor}"
publishedAt: ${data.today}
readingTime: ${Math.ceil(data.content.split(/\s+/).length / 200)}
featured: false
translationKey: "${data.translationKey || ''}"
seo:
  metaTitle: "${data.title.replace(/"/g, '\\"')}"
  metaDescription: "${data.meta.replace(/"/g, '\\"')}"
  keywords: ${JSON.stringify(data.keywords || [])}
---

${data.content}
`;
  const postPath = join(POSTS_DIR, `${slug}.md`);
  if (!existsSync(POSTS_DIR)) mkdirSync(POSTS_DIR, { recursive: true });
  writeFileSync(postPath, frontmatter, 'utf-8');
  return postPath;
}

async function main() {
  console.log('⚖️ Gerando post de comparação...');

  const weekOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (86400000 * 7));
  const topicIndex = weekOfYear % COMPARACOES.length;
  const comp = COMPARACOES[topicIndex];

  console.log(`📝 ${comp.a} vs ${comp.b}`);
  const today = new Date().toISOString().split('T')[0];

  // Guard
  const existingFiles = readdirSync(POSTS_DIR).filter(f => f.endsWith('.md') && !f.startsWith('en-') && !f.startsWith('es-'));
  const checkSlug = createSlug(`${comp.a} vs ${comp.b}`);
  if (existingFiles.some(f => f.includes(checkSlug))) {
    console.log('⚠️ Post de comparação já existe. Abortando.');
    return;
  }

  const prompt = `
Escreva um post comparativo detalhado em português brasileiro: "${comp.a} vs ${comp.b}: qual é melhor para você?"

REGRAS:
1. Título no formato: "X vs Y: qual vale mais a pena em 2026?"
2. Seja imparcial — mostre prós e contras de AMBOS
3. Inclua uma tabela comparativa em markdown (| Critério | ${comp.a} | ${comp.b} |)
4. Mínimo 1000 palavras
5. Use ## para subtítulos (mínimo 5): Introdução, Como funciona X, Como funciona Y, Tabela comparativa, Quando escolher X, Quando escolher Y, Veredicto
6. No veredicto, recomende com base no perfil do leitor
7. Mencione o FinMoovi como ferramenta para acompanhar qualquer que seja a escolha
8. Tom: educativo, claro, sem jargão técnico excessivo
9. Inclua números reais quando possível (taxas, rendimentos)

Responda neste formato:
---TITULO---
[título]
---META---
[meta description, max 155 chars]
---KEYWORDS---
[5-7 keywords]
---CONTEUDO---
[conteúdo markdown com tabela]
`;

  try {
    const result = await generateText(prompt, { maxTokens: 5000, temperature: 0.7 });
    const titleMatch = result.match(/---TITULO---\s*([\s\S]*?)(?=---META---|$)/);
    const metaMatch = result.match(/---META---\s*([\s\S]*?)(?=---KEYWORDS---|$)/);
    const keywordsMatch = result.match(/---KEYWORDS---\s*([\s\S]*?)(?=---CONTEUDO---|$)/);
    const contentMatch = result.match(/---CONTEUDO---\s*([\s\S]*?)$/);

    if (!titleMatch || !contentMatch) throw new Error('Formato inválido.');

    const title = titleMatch[1].trim();
    const meta = metaMatch ? metaMatch[1].trim() : '';
    const keywords = keywordsMatch ? keywordsMatch[1].trim().split(',').map(k => k.trim()) : comp.keywords;
    const content = contentMatch[1].trim();
    const allKeywords = [...new Set([...keywords, ...comp.keywords])];
    const slugPt = createSlug(title);

    console.log(`✅ PT: ${title}`);
    const imagePath = await generateCoverImage(title, slugPt, 'posts');
    const processed = await insertInlineImages(content, slugPt);

    savePost(slugPt, { title, meta, keywords: allKeywords, content: processed, imagePath, locale: 'pt', today, translationKey: slugPt });

    await new Promise(r => setTimeout(r, 30000));
    console.log('🌐 EN...');
    const en = await translatePost({ title, meta, keywords: allKeywords, content: processed }, 'en');
    savePost(`en-${slugPt}`, { ...en, imagePath, locale: 'en', today, translationKey: slugPt });

    await new Promise(r => setTimeout(r, 30000));
    console.log('🌐 ES...');
    const es = await translatePost({ title, meta, keywords: allKeywords, content: processed }, 'es');
    savePost(`es-${slugPt}`, { ...es, imagePath, locale: 'es', today, translationKey: slugPt });

    execSync('git add -A', { stdio: 'inherit' });
    const safeA = comp.a.replace(/"/g, '');
    const safeB = comp.b.replace(/"/g, '');
    execSync(`git commit -m "feat: post comparação — ${safeA} vs ${safeB}"`, { stdio: 'inherit' });
    execSync('git push', { stdio: 'inherit' });
    console.log('🎉 Publicado!');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

main();
