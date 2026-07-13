import { config } from '../../../site.config.ts';
/**
 * Gerador de Posts Sazonais (PT + EN + ES)
 * Executa via GitHub Actions nas sextas-feiras às 7h BRT
 * Gera posts baseados em calendário financeiro brasileiro
 * Publica 2 semanas antes de cada data importante
 */

import { generateText, generateCoverImage, generateInlineImage } from '../apis/kie-ai.js';
import { isThemeCovered, coveredThemesBlock } from '../lib/seo-guard.js';
import { writeFileSync, mkdirSync, existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const POSTS_DIR = join(process.cwd(), 'src', 'content', 'posts');
const IMAGES_DIR = join(process.cwd(), 'public', 'images', 'posts');

const CALENDARIO_FINANCEIRO = [
  { month: 1, day: 5, topic: 'como pagar IPVA sem comprometer o orçamento', keywords: ['ipva parcelado', 'pagar ipva', 'ipva desconto'] },
  { month: 1, day: 10, topic: 'como organizar as finanças no começo do ano', keywords: ['planejamento financeiro anual', 'metas financeiras ano novo'] },
  { month: 1, day: 20, topic: 'material escolar barato: como economizar na volta às aulas', keywords: ['economia volta às aulas', 'material escolar barato', 'lista escolar'] },
  { month: 2, day: 1, topic: 'carnaval econômico: como curtir sem estourar o cartão', keywords: ['carnaval barato', 'economizar carnaval', 'viagem carnaval'] },
  { month: 2, day: 15, topic: 'como declarar imposto de renda de forma simples', keywords: ['declarar imposto de renda', 'irpf', 'restituição imposto'] },
  { month: 3, day: 1, topic: 'guia completo da declaração do imposto de renda', keywords: ['irpf passo a passo', 'imposto de renda 2026', 'declaração ir'] },
  { month: 3, day: 15, topic: 'como organizar finanças para o Dia das Mães', keywords: ['presente dia das mães', 'economizar dia das mães'] },
  { month: 4, day: 15, topic: 'Páscoa econômica: como aproveitar sem gastar demais', keywords: ['páscoa barata', 'economizar páscoa', 'ovo de páscoa caseiro'] },
  { month: 5, day: 1, topic: 'como aproveitar o Dia das Mães sem se endividar', keywords: ['presente mãe barato', 'dia das mães econômico'] },
  { month: 5, day: 15, topic: 'como planejar férias de julho com antecedência', keywords: ['férias baratas', 'viagem econômica julho', 'planejar férias'] },
  { month: 6, day: 1, topic: 'Dia dos Namorados econômico: presentes criativos', keywords: ['presente namorados barato', 'dia dos namorados econômico'] },
  { month: 6, day: 15, topic: 'festas juninas: como curtir arraial gastando pouco', keywords: ['festa junina barata', 'arraial econômico', 'comidas juninas'] },
  { month: 7, day: 1, topic: 'como usar as férias para reorganizar suas finanças', keywords: ['organizar finanças férias', 'planejamento financeiro meio do ano'] },
  { month: 7, day: 15, topic: 'como se preparar financeiramente para o segundo semestre', keywords: ['segundo semestre financeiro', 'revisão metas financeiras'] },
  { month: 8, day: 1, topic: 'Dia dos Pais econômico: ideias de presentes', keywords: ['presente dia dos pais barato', 'dia dos pais econômico'] },
  { month: 8, day: 15, topic: 'como economizar para a Black Friday (começa agora!)', keywords: ['economizar black friday', 'preparar black friday', 'lista black friday'] },
  { month: 9, day: 15, topic: 'Dia das Crianças: presentes que educam financeiramente', keywords: ['presente dia das crianças', 'educação financeira crianças'] },
  { month: 10, day: 1, topic: 'como não cair em armadilhas da Black Friday', keywords: ['golpes black friday', 'black friday falsa', 'desconto real'] },
  { month: 10, day: 15, topic: 'como planejar compras de Natal com antecedência', keywords: ['compras natal antecipadas', 'lista natal', 'economizar natal'] },
  { month: 11, day: 1, topic: 'guia definitivo da Black Friday: o que realmente vale a pena', keywords: ['black friday', 'melhores ofertas', 'black friday dicas'] },
  { month: 11, day: 15, topic: 'como usar o 13º salário de forma inteligente', keywords: ['13º salário', 'como usar décimo terceiro', 'investir 13'] },
  { month: 12, day: 1, topic: 'como organizar as finanças para o Natal sem dívidas', keywords: ['natal sem dívidas', 'presente natal barato', 'orçamento natal'] },
  { month: 12, day: 15, topic: 'como planejar as finanças para o próximo ano', keywords: ['planejamento financeiro próximo ano', 'metas 2027', 'revisão anual'] },
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
  let imagePositions = [];
  if (headings.length >= 6) imagePositions = [1, 3, 5];
  else if (headings.length >= 4) imagePositions = [1, 2, 3];
  else if (headings.length >= 2) imagePositions = [0, 1];

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
  const prompt = `
Translate the following blog post to ${langNames[targetLang]}. Keep the same tone, style, and structure.
Do NOT translate brand names (${config.brand.name}). Keep markdown formatting and image paths intact.

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
${post.content}
`;
  const result = await generateText(prompt, { maxTokens: 5000, temperature: 0.3 });
  const titleMatch = result.match(/---TITULO---\s*([\s\S]*?)(?=---META---|$)/);
  const metaMatch = result.match(/---META---\s*([\s\S]*?)(?=---KEYWORDS---|$)/);
  const keywordsMatch = result.match(/---KEYWORDS---\s*([\s\S]*?)(?=---CONTEUDO---|$)/);
  const contentMatch = result.match(/---CONTEUDO---\s*([\s\S]*?)$/);
  return {
    title: titleMatch ? titleMatch[1].trim() : post.title,
    meta: metaMatch ? metaMatch[1].trim() : post.meta,
    keywords: keywordsMatch ? keywordsMatch[1].trim().split(',').map(k => k.trim()) : post.keywords,
    content: contentMatch ? contentMatch[1].trim() : post.content,
  };
}

function savePost(slug, data) {
  const frontmatter = `---
title: "${data.title.replace(/"/g, '\\"')}"
description: "${data.meta.replace(/"/g, '\\"')}"
image: "${data.imagePath}"
category: "orcamento"
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

function getUpcomingTopic() {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentDay = now.getDate();

  // Find topic whose date is 10-20 days from now
  for (const item of CALENDARIO_FINANCEIRO) {
    const targetDate = new Date(now.getFullYear(), item.month - 1, item.day);
    const daysUntil = Math.ceil((targetDate - now) / 86400000);
    if (daysUntil >= 10 && daysUntil <= 20) {
      return item;
    }
  }

  // Fallback: next upcoming event
  const sorted = CALENDARIO_FINANCEIRO.map(item => {
    const targetDate = new Date(now.getFullYear(), item.month - 1, item.day);
    if (targetDate < now) targetDate.setFullYear(targetDate.getFullYear() + 1);
    return { ...item, daysUntil: Math.floor((targetDate - now) / 86400000) };
  }).sort((a, b) => a.daysUntil - b.daysUntil);

  return sorted[0];
}

async function main() {
  console.log('📅 Gerando post sazonal...');

  const topic = getUpcomingTopic();
  if (!topic) {
    console.log('⚠️ Nenhum tópico sazonal encontrado para as próximas semanas.');
    return;
  }

  console.log(`📝 Tópico: ${topic.topic}`);
  const today = new Date().toISOString().split('T')[0];

  // Guard: avoid duplicate
  const existingFiles = readdirSync(POSTS_DIR).filter(f => f.endsWith('.md') && !f.startsWith('en-') && !f.startsWith('es-'));
  const slugCheck = createSlug(topic.topic);
  if (existingFiles.some(f => f.includes(slugCheck))) {
    console.log(`⚠️ Post sazonal sobre "${topic.topic}" já existe. Abortando.`);
    return;
  }

  // Anti-canibalização: pula sem gastar API se o tema já está coberto.
  const canibal = isThemeCovered(topic.topic, POSTS_DIR);
  if (canibal.covered) {
    console.log(`⚠️ Anti-canibalização: "${topic.topic}" conflita com "${canibal.conflictSlug}" (${canibal.shared.join(', ')}). Abortando sem gastar API.`);
    return;
  }
  const avoidBlock = coveredThemesBlock(POSTS_DIR);

  const prompt = `
${avoidBlock}
Escreva um post de blog em português brasileiro sobre: ${topic.topic}

REGRAS:
1. Título atrativo com número ou pergunta (SEO-friendly)
2. Tom prático e acessível, como um amigo dando dicas
3. Mínimo 900 palavras, máximo 1500
4. Use ## para subtítulos (mínimo 5 subtítulos)
5. Inclua dicas acionáveis numeradas quando aplicável
6. Mencione o ${config.app.name} naturalmente como ferramenta que ajuda
7. Termine com CTA: "Use o ${config.app.name} para controlar seus gastos e não se surpreender no fim do mês."
8. Inclua dados reais brasileiros quando possível (IBGE, Bacen, Serasa)
9. Inclua 1-2 links externos para fontes autoritativas relevantes ao tema (ex: Banco Central do Brasil https://www.bcb.gov.br, IBGE https://www.ibge.gov.br, Receita Federal https://www.gov.br/receitafederal, Serasa https://www.serasa.com.br). Use formato markdown [texto](url). Escolha fontes reais e URLs que existam.

Responda neste formato:
---TITULO---
[título]
---META---
[meta description, max 155 chars]
---KEYWORDS---
[5-7 keywords]
---CONTEUDO---
[conteúdo markdown]
`;

  try {
    const result = await generateText(prompt, { maxTokens: 4000, temperature: 0.7 });
    const titleMatch = result.match(/---TITULO---\s*([\s\S]*?)(?=---META---|$)/);
    const metaMatch = result.match(/---META---\s*([\s\S]*?)(?=---KEYWORDS---|$)/);
    const keywordsMatch = result.match(/---KEYWORDS---\s*([\s\S]*?)(?=---CONTEUDO---|$)/);
    const contentMatch = result.match(/---CONTEUDO---\s*([\s\S]*?)$/);

    let title, meta, keywords, content;
    if (titleMatch && contentMatch) {
      title = titleMatch[1].trim();
      meta = metaMatch ? metaMatch[1].trim() : '';
      keywords = keywordsMatch ? keywordsMatch[1].trim().split(',').map(k => k.trim()) : topic.keywords;
      content = contentMatch[1].trim();
    } else if (result && result.trim().length > 300 && /^#{1,2}\s/m.test(result)) {
      // Fallback: modelo respondeu em markdown puro sem os delimitadores.
      // Mesmo comportamento tolerante de parsePostContent() em kie-ai.js.
      const h1 = result.match(/^#\s+(.+)$/m);
      title = (h1 ? h1[1] : result.split('\n').find(l => l.trim()).replace(/^#+\s*/, '')).trim();
      content = result.replace(/^#\s+.+\r?\n?/m, '').trim();
      meta = '';
      keywords = topic.keywords;
      console.log('ℹ️ Delimitadores ausentes — usando fallback markdown (título do primeiro H1).');
    } else {
      throw new Error('Formato inválido da API.');
    }
    const allKeywords = [...new Set([...keywords, ...topic.keywords])];
    const slugPt = createSlug(title);

    console.log(`✅ PT: ${title}`);

    const imagePath = await generateCoverImage(title, slugPt, 'posts');
    const processedContent = await insertInlineImages(content, slugPt);

    savePost(slugPt, { title, meta, keywords: allKeywords, content: processedContent, imagePath, locale: 'pt', today, translationKey: slugPt });

    // EN
    await new Promise(r => setTimeout(r, 30000));
    console.log('🌐 Traduzindo EN...');
    const enPost = await translatePost({ title, meta, keywords: allKeywords, content: processedContent }, 'en');
    savePost(`en-${slugPt}`, { ...enPost, keywords: enPost.keywords, content: enPost.content, imagePath, locale: 'en', today, translationKey: slugPt });

    // ES
    await new Promise(r => setTimeout(r, 30000));
    console.log('🌐 Traduzindo ES...');
    const esPost = await translatePost({ title, meta, keywords: allKeywords, content: processedContent }, 'es');
    savePost(`es-${slugPt}`, { ...esPost, keywords: esPost.keywords, content: esPost.content, imagePath, locale: 'es', today, translationKey: slugPt });

    // Git
    execSync('git add -A', { stdio: 'inherit' });
    const safeTitle = title.substring(0, 50).replace(/"/g, '\\"').replace(/`/g, '');
    execSync(`git commit -m "feat: post sazonal — ${safeTitle}"`, { stdio: 'inherit' });
    execSync('git push', { stdio: 'inherit' });
    console.log('🎉 Post sazonal publicado!');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

main();
