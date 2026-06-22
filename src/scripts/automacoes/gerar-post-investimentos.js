import { config } from '../../../site.config.ts';
import { generateText, generateCoverImage, generateInlineImage } from '../apis/kie-ai.js';
import { writeFileSync, mkdirSync, existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const POSTS_DIR = join(process.cwd(), 'src', 'content', 'posts');
const IMAGES_DIR = join(process.cwd(), 'public', 'images', 'posts');

const TOPICS = [
  { topic: 'como investir com pouco dinheiro em 2026', keywords: ['investir pouco dinheiro', 'investir 100 reais', 'começar investir'] },
  { topic: 'Tesouro Direto para iniciantes: guia completo', keywords: ['tesouro direto iniciante', 'como investir tesouro direto', 'tesouro selic'] },
  { topic: 'como montar uma carteira diversificada com R$500', keywords: ['carteira diversificada', 'diversificar investimentos', 'investir 500 reais'] },
  { topic: 'CDB vs Tesouro Selic: qual rende mais em 2026', keywords: ['cdb vs tesouro selic', 'qual rende mais', 'renda fixa comparação'] },
  { topic: 'fundos imobiliários para iniciantes: como começar', keywords: ['fundos imobiliários iniciante', 'fii como investir', 'renda passiva fii'] },
  { topic: 'como investir em dólar morando no Brasil', keywords: ['investir dólar brasil', 'comprar dólar investimento', 'dolarizar carteira'] },
  { topic: 'ETFs: o que são e como investir', keywords: ['etf o que é', 'como investir etf', 'etf para iniciantes'] },
  { topic: 'previdência privada vale a pena em 2026?', keywords: ['previdência privada vale a pena', 'pgbl ou vgbl', 'previdência ou investir'] },
  { topic: 'como calcular quanto preciso para me aposentar', keywords: ['quanto preciso aposentar', 'calculadora aposentadoria', 'independência financeira'] },
  { topic: 'renda fixa: melhores opções para conservadores', keywords: ['renda fixa conservador', 'investimento seguro', 'melhor renda fixa 2026'] },
  { topic: 'como investir o 13º salário de forma inteligente', keywords: ['investir 13 salário', 'o que fazer com 13', 'aplicar décimo terceiro'] },
  { topic: 'ações para iniciantes: primeiros passos na bolsa', keywords: ['ações iniciante', 'começar investir bolsa', 'comprar primeira ação'] },
  { topic: 'como viver de renda passiva com investimentos', keywords: ['renda passiva', 'viver de dividendos', 'investir para renda'] },
  { topic: 'LCI e LCA: investimentos isentos de imposto de renda', keywords: ['lci lca', 'investimento isento ir', 'lci ou cdb'] },
  { topic: 'como escolher uma corretora de investimentos', keywords: ['melhor corretora', 'corretora para iniciante', 'abrir conta corretora'] },
  { topic: 'investir em criptomoedas vale a pena em 2026?', keywords: ['criptomoeda vale a pena', 'investir bitcoin', 'cripto para iniciantes'] },
  { topic: 'como proteger seus investimentos da inflação', keywords: ['proteger inflação', 'investimento acima inflação', 'tesouro ipca'] },
  { topic: 'quanto rende 10 mil reais por mês em renda fixa', keywords: ['quanto rende 10 mil', 'rendimento renda fixa', 'simulação investimento'] },
  { topic: 'como reinvestir dividendos de forma automática', keywords: ['reinvestir dividendos', 'juros compostos prática', 'dividendo composto'] },
  { topic: 'debêntures: o que são e quando investir', keywords: ['debêntures o que é', 'investir debêntures', 'debênture incentivada'] },
  { topic: 'como declarar investimentos no imposto de renda', keywords: ['declarar investimentos ir', 'imposto renda investimento', 'irpf investimentos'] },
  { topic: 'fundos de investimento vs ETF: qual escolher', keywords: ['fundo vs etf', 'etf ou fundo', 'taxa administração fundo'] },
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
Do NOT translate brand names (${config.brand.name}). Keep all image markdown (![alt](url)) exactly as-is.

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
  console.log('📈 Gerando post de investimentos...');

  const weekOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (86400000 * 7));
  const topicIndex = weekOfYear % TOPICS.length;
  const { topic, keywords: topicKeywords } = TOPICS[topicIndex];

  console.log(`📝 ${topic}`);
  const today = new Date().toISOString().split('T')[0];

  const existingFiles = readdirSync(POSTS_DIR).filter(f => f.endsWith('.md') && !f.startsWith('en-') && !f.startsWith('es-'));
  for (const file of existingFiles) {
    const content = readFileSync(join(POSTS_DIR, file), 'utf-8');
    if (content.includes(`publishedAt: ${today}`) && content.includes('category: "investimentos"')) {
      console.log(`⚠️ Já existe post investimentos hoje (${file}). Abortando.`);
      return;
    }
  }

  const prompt = `
Escreva um artigo educativo sobre: "${topic}"

Responda OBRIGATORIAMENTE neste formato exato (use os delimitadores):
---TITULO---
[título SEO, 50-60 chars, keyword no início]
---META---
[meta description, 150-160 chars]
---KEYWORDS---
[5-7 keywords separadas por vírgula]
---CONTEUDO---
[conteúdo markdown completo]

REGRAS DE ESTILO:
- Tom: educador financeiro acessível, sem jargão desnecessário
- Sempre explique termos técnicos na primeira aparição
- Use exemplos com valores reais (investindo R$500, R$1.000, R$5.000)
- Inclua simulações de rendimento quando relevante
- NÃO dê recomendações de investimento específicas ("invista em X")
- Use frases como "considere", "avalie se faz sentido para seu perfil"
- Inclua uma seção "Riscos" ou "Cuidados"
- NÃO comece com frases genéricas tipo "No cenário atual", "Você já se perguntou"
- Comece direto com o conteúdo, como se estivesse no meio de uma conversa
- Headers H2 curtos e diretos
- Mínimo 900 palavras, 5-6 seções H2
- O último H2: "Próximos passos" com ação prática
- Inclua 1-2 links externos para fontes autoritativas relevantes ao tema (ex: Banco Central do Brasil https://www.bcb.gov.br, Tesouro Direto https://www.tesourodireto.com.br, CVM https://www.cvm.gov.br, Investopedia https://www.investopedia.com). Use formato markdown [texto](url). Escolha fontes reais e URLs que existam.
- Após o último parágrafo, inclua:

---

**Para acompanhar seus investimentos em um só lugar, [teste o ${config.app.name} grátis por 7 dias](${config.app.url}) — multi-moeda, relatórios inteligentes e 100% offline.**
`;

  try {
    let result;
    let titleMatch, metaMatch, keywordsMatch, contentMatch;

    for (let attempt = 1; attempt <= 3; attempt++) {
      result = await generateText(prompt, { maxTokens: 5000, temperature: attempt === 1 ? 0.7 : 0.5 });

      if (!result || result.trim().length < 100) {
        console.log(`⚠️ Tentativa ${attempt}/3: Resposta muito curta (${(result || '').length} chars)`);
        if (attempt < 3) { await new Promise(r => setTimeout(r, 15000)); continue; }
        throw new Error('Groq retornou resposta insuficiente após 3 tentativas.');
      }

      titleMatch = result.match(/---TITULO---\s*([\s\S]*?)(?=---META---|$)/);
      metaMatch = result.match(/---META---\s*([\s\S]*?)(?=---KEYWORDS---|$)/);
      keywordsMatch = result.match(/---KEYWORDS---\s*([\s\S]*?)(?=---CONTEUDO---|$)/);
      contentMatch = result.match(/---CONTEUDO---\s*([\s\S]*?)$/);

      if (titleMatch && contentMatch) break;
      console.log(`⚠️ Tentativa ${attempt}/3: Formato inválido. Resposta: ${result.substring(0, 300)}`);
      if (attempt < 3) { await new Promise(r => setTimeout(r, 15000)); }
    }

    if (!titleMatch || !contentMatch) {
      throw new Error(`Formato inválido após 3 tentativas. Última resposta: ${(result || '').substring(0, 500)}`);
    }

    const title = titleMatch[1].trim();
    const meta = metaMatch ? metaMatch[1].trim() : '';
    const keywords = keywordsMatch ? keywordsMatch[1].trim().split(',').map(k => k.trim()) : topicKeywords;
    const content = contentMatch[1].trim();
    const allKeywords = [...new Set([...keywords, ...topicKeywords])];
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

    execSync('node src/scripts/automacoes/internal-linking.js', { stdio: 'inherit' });
    execSync(`git add "${POSTS_DIR}" "${IMAGES_DIR}"`, { stdio: 'inherit' });
    execSync(`git commit -m "post: ${title.substring(0, 40)} [PT/EN/ES]"`, { stdio: 'inherit' });
    console.log('🎉 Post investimentos publicado!');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

main();
