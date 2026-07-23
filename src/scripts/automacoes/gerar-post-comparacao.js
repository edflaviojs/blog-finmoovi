import { config } from '../../../site.config.ts';
/**
 * Gerador de Posts de Comparação (PT + EN + ES)
 * Executa sextas-feiras às 9h BRT via GitHub Actions
 * Gera posts tipo "CDB vs Tesouro: qual rende mais?"
 * Altíssimo valor SEO — keywords de comparação têm alta intenção de busca
 */

import { generateText, generateCoverImage, generateInlineImage } from '../apis/kie-ai.js';
import { isThemeCovered, coveredThemesBlock } from '../lib/seo-guard.js';
import { analyzeContent } from '../lib/fact-guard.js';
import { fixStaleYear, CURRENT_YEAR } from '../lib/year-guard.js';
import { writeFileSync, mkdirSync, existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const POSTS_DIR = join(process.cwd(), 'src', 'content', 'posts');

const COMPARACOES = [
  { a: 'CDB', b: 'Tesouro Selic', keywords: ['cdb vs tesouro selic', 'onde investir', 'renda fixa comparação', 'qual rende mais cdb ou tesouro'] },
  { a: 'Poupança', b: 'CDB com liquidez diária', keywords: ['poupança vs cdb', 'vale a pena poupança', 'melhor que poupança', 'onde guardar dinheiro'] },
  { a: 'Nubank', b: 'Inter', keywords: ['nubank vs inter', 'melhor conta digital', 'conta digital gratuita', `nubank ou inter ${CURRENT_YEAR}`] },
  { a: 'Cartão de crédito', b: 'Cartão de débito', keywords: ['crédito vs débito', 'vantagens cartão crédito', 'quando usar débito'] },
  { a: 'Aluguel', b: 'Financiamento', keywords: ['alugar ou financiar', 'vale a pena financiar imóvel', `aluguel vs financiamento ${CURRENT_YEAR}`] },
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
---HEADLINE---
[translated ticker headline, max 40 characters]
---KEYWORDS---
[translated keywords, comma separated]
---CONTEUDO---
[translated content]

Original:
Title: ${post.title}
Meta: ${post.meta}
Ticker headline: ${post.headline || post.title.slice(0, 40)}
Keywords: ${(post.keywords || []).join(', ')}
Content:
${post.content}
`;
  const result = await generateText(prompt, { maxTokens: 5000, temperature: 0.3 });
  const t = result.match(/---TITULO---\s*([\s\S]*?)(?=---META---|$)/);
  const m = result.match(/---META---\s*([\s\S]*?)(?=---HEADLINE---|---KEYWORDS---|$)/);
  const h = result.match(/---HEADLINE---\s*([\s\S]*?)(?=---KEYWORDS---|$)/);
  const k = result.match(/---KEYWORDS---\s*([\s\S]*?)(?=---CONTEUDO---|$)/);
  const c = result.match(/---CONTEUDO---\s*([\s\S]*?)$/);
  return {
    title: t ? t[1].trim() : post.title,
    meta: m ? m[1].trim() : post.meta,
    headline: (h ? h[1].trim().replace(/^["']|["']$/g, '') : '').slice(0, 40),
    keywords: k ? k[1].trim().split(',').map(x => x.trim()) : post.keywords,
    content: c ? c[1].trim() : post.content,
  };
}

function savePost(slug, data) {
  const frontmatter = `---
title: "${data.title.replace(/"/g, '\\"')}"
description: "${data.meta.replace(/"/g, '\\"')}"
${data.headline ? `tickerHeadline: "${data.headline.replace(/"/g, '\\"')}"\n` : ''}image: "${data.imagePath}"
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
  // T2: pool do config tem precedência ({a, b, keywords}); o hardcoded vira fallback/exemplo.
  const pool = (config.ai?.comparisonTopics?.length ? config.ai.comparisonTopics : COMPARACOES)
    .filter(c => c && c.a && c.b && Array.isArray(c.keywords));
  const topicIndex = weekOfYear % pool.length;
  const comp = pool[topicIndex];

  console.log(`📝 ${comp.a} vs ${comp.b}`);
  const today = new Date().toISOString().split('T')[0];

  // Guard
  const existingFiles = readdirSync(POSTS_DIR).filter(f => f.endsWith('.md') && !f.startsWith('en-') && !f.startsWith('es-'));
  const checkSlug = createSlug(`${comp.a} vs ${comp.b}`);
  if (existingFiles.some(f => f.includes(checkSlug))) {
    console.log('⚠️ Post de comparação já existe. Abortando.');
    return;
  }

  // Anti-canibalização: pula sem gastar API se o tema já está coberto.
  const canibal = isThemeCovered(`${comp.a} vs ${comp.b}`, POSTS_DIR);
  if (canibal.covered) {
    console.log(`⚠️ Anti-canibalização: "${comp.a} vs ${comp.b}" conflita com "${canibal.conflictSlug}" (${canibal.shared.join(', ')}). Abortando sem gastar API.`);
    return;
  }
  const avoidBlock = coveredThemesBlock(POSTS_DIR);

  const prompt = `
${avoidBlock}
Escreva um post comparativo detalhado em português brasileiro: "${comp.a} vs ${comp.b}: qual é melhor para você?"

REGRAS:
1. Título no formato: "X vs Y: qual vale mais a pena em ${CURRENT_YEAR}?"
2. Seja imparcial — mostre prós e contras de AMBOS
3. Inclua uma tabela comparativa em markdown (| Critério | ${comp.a} | ${comp.b} |)
4. Mínimo 1000 palavras
5. Use ## para subtítulos (mínimo 5): Introdução, Como funciona X, Como funciona Y, Tabela comparativa, Quando escolher X, Quando escolher Y, Veredicto
6. No veredicto, recomende com base no perfil do leitor
7. Mencione o ${config.app.name} como ferramenta para acompanhar qualquer que seja a escolha
8. Tom: educativo, claro, sem jargão técnico excessivo
9. Inclua números reais quando possível (taxas, rendimentos)
10. Inclua 1-2 links externos para fontes autoritativas relevantes ao tema (ex: Banco Central do Brasil https://www.bcb.gov.br, Tesouro Direto https://www.tesourodireto.com.br, CVM https://www.cvm.gov.br, Investopedia https://www.investopedia.com). Use formato markdown [texto](url). Escolha fontes reais e URLs que existam.
11. Headline de ticker: chamada ultra curta (MÁXIMO 40 caracteres) estilo manchete que desperta curiosidade sem entregar a resposta (ex: "O erro que suga seu salário")

Responda neste formato:
---TITULO---
[título]
---META---
[meta description, max 155 chars]
---HEADLINE---
[headline de ticker, máximo 40 caracteres]
---KEYWORDS---
[5-7 keywords]
---CONTEUDO---
[conteúdo markdown com tabela]
`;

  try {
    let result;
    let titleMatch, metaMatch, headlineMatch, keywordsMatch, contentMatch;

    for (let attempt = 1; attempt <= 3; attempt++) {
      result = await generateText(prompt, { maxTokens: 5000, temperature: attempt === 1 ? 0.7 : 0.5 });

      if (!result || result.trim().length < 100) {
        console.log(`⚠️ Tentativa ${attempt}/3: Resposta vazia ou muito curta (${(result || '').length} chars)`);
        if (attempt < 3) {
          await new Promise(r => setTimeout(r, 15000));
          continue;
        }
        throw new Error(`Groq retornou resposta insuficiente após 3 tentativas.`);
      }

      titleMatch = result.match(/---TITULO---\s*([\s\S]*?)(?=---META---|$)/);
      metaMatch = result.match(/---META---\s*([\s\S]*?)(?=---HEADLINE---|---KEYWORDS---|$)/);
      headlineMatch = result.match(/---HEADLINE---\s*([\s\S]*?)(?=---KEYWORDS---|$)/);
      keywordsMatch = result.match(/---KEYWORDS---\s*([\s\S]*?)(?=---CONTEUDO---|$)/);
      contentMatch = result.match(/---CONTEUDO---\s*([\s\S]*?)$/);

      if (titleMatch && contentMatch) break;

      console.log(`⚠️ Tentativa ${attempt}/3: Formato inválido. Resposta (primeiros 300 chars): ${result.substring(0, 300)}`);
      if (attempt < 3) {
        await new Promise(r => setTimeout(r, 15000));
      }
    }

    let title, meta, headline, keywords, content;
    if (titleMatch && contentMatch) {
      title = titleMatch[1].trim();
      meta = metaMatch ? metaMatch[1].trim() : '';
      // Headline do ticker: opcional, com teto rígido de 40 chars
      headline = (headlineMatch ? headlineMatch[1].trim().replace(/^["']|["']$/g, '') : '').slice(0, 40);
      keywords = keywordsMatch ? keywordsMatch[1].trim().split(',').map(k => k.trim()) : comp.keywords;
      content = contentMatch[1].trim();
    } else if (result && result.trim().length > 300 && /^#{1,2}\s/m.test(result)) {
      // Fallback: modelo respondeu em markdown puro (ex.: "# Título") sem os delimitadores.
      // Mesmo comportamento tolerante de parsePostContent() em kie-ai.js.
      const h1 = result.match(/^#\s+(.+)$/m);
      title = (h1 ? h1[1] : result.split('\n').find(l => l.trim()).replace(/^#+\s*/, '')).trim();
      content = result.replace(/^#\s+.+\r?\n?/m, '').trim();
      meta = '';
      headline = '';
      keywords = comp.keywords;
      console.log('ℹ️ Delimitadores ausentes — usando fallback markdown (título do primeiro H1).');
    } else {
      throw new Error(`Formato inválido após 3 tentativas. Última resposta (500 chars): ${(result || '').substring(0, 500)}`);
    }
    // Fact-guard: limpa alucinação antes de salvar; bloqueia se mutilaria.
    const fg = analyzeContent(content);
    if (fg.blocked) {
      console.log(`⛔ Fact-guard bloqueou (${fg.reason}). Não publica; regenera no próximo ciclo.`);
      return;
    }
    if (fg.cuts.length || fg.linkStrips.length) console.log(`🛡️ Fact-guard: ${fg.cuts.length} corte(s), ${fg.linkStrips.length} link(s) removido(s).`);
    content = fg.cleaned;

    // Year-guard: corrige ano defasado no título antes do slug.
    const yg = fixStaleYear(title);
    if (yg.changed) { console.log(`[year-guard] título corrigido: "${yg.original}" → "${yg.text}"`); title = yg.text; }

    const allKeywords = [...new Set([...keywords, ...comp.keywords])];
    const slugPt = createSlug(title);

    console.log(`✅ PT: ${title}`);
    const imagePath = await generateCoverImage(title, slugPt, 'posts');
    const processed = await insertInlineImages(content, slugPt);

    savePost(slugPt, { title, meta, headline, keywords: allKeywords, content: processed, imagePath, locale: 'pt', today, translationKey: slugPt });

    if (config.locales.includes('en')) {
      await new Promise(r => setTimeout(r, 30000));
      console.log('🌐 EN...');
      const en = await translatePost({ title, meta, headline, keywords: allKeywords, content: processed }, 'en');
      const ygEn = fixStaleYear(en.title);
      if (ygEn.changed) { console.log(`[year-guard] título corrigido: "${ygEn.original}" → "${ygEn.text}"`); en.title = ygEn.text; }
      savePost(`en-${slugPt}`, { ...en, imagePath, locale: 'en', today, translationKey: slugPt });
    }

    if (config.locales.includes('es')) {
      await new Promise(r => setTimeout(r, 30000));
      console.log('🌐 ES...');
      const es = await translatePost({ title, meta, headline, keywords: allKeywords, content: processed }, 'es');
      const ygEs = fixStaleYear(es.title);
      if (ygEs.changed) { console.log(`[year-guard] título corrigido: "${ygEs.original}" → "${ygEs.text}"`); es.title = ygEs.text; }
      savePost(`es-${slugPt}`, { ...es, imagePath, locale: 'es', today, translationKey: slugPt });
    }

    // Commit por whitelist (push fica com o workflow).
    execSync('git add src/content/posts public/images/posts', { stdio: 'inherit' });
    const safeA = comp.a.replace(/"/g, '');
    const safeB = comp.b.replace(/"/g, '');
    execSync(`git -c commit.gpgsign=false commit -m "feat: post comparação — ${safeA} vs ${safeB}"`, { stdio: 'inherit' });
    console.log('🎉 Post gerado com sucesso (push fica com o workflow).');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

main();
