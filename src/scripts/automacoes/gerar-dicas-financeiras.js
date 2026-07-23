import { config } from '../../../site.config.ts';
/**
 * Gerador de Dicas Financeiras (PT + EN + ES)
 * Executa via GitHub Actions diariamente às 6h BRT
 * Gera um post completo em 3 idiomas com imagens SVG locais via Groq
 */

import { generateBlogPost, generateText, generateCoverImage, generateInlineImage } from '../apis/kie-ai.js';
import { isThemeCovered, coveredThemesBlock, warnSkip } from '../lib/seo-guard.js';
import { analyzeContent } from '../lib/fact-guard.js';
import { fixStaleYear } from '../lib/year-guard.js';
import { writeFileSync, mkdirSync, existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const POSTS_DIR = join(process.cwd(), 'src', 'content', 'posts');
const IMAGES_DIR = join(process.cwd(), 'public', 'images', 'posts');

// Fallback pool (niche defaults) — sempre combinado com config.ai.dailyTopics
// para a seleção resiliente ter mais opções quando os temas do config esgotam.
const FALLBACK_TOPICS = [
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
  // Long-tail SEO: perguntas específicas de alto volume
  'quanto guardar por mês ganhando salário mínimo',
  'vale a pena investir em CDB ou Tesouro Direto',
  'como dividir o salário quando se ganha pouco',
  'quanto preciso para me aposentar aos 50 anos',
  'como economizar ganhando 2 mil reais por mês',
  'qual a diferença entre poupar e investir',
  'como fazer controle financeiro pelo celular',
  'como calcular quanto posso gastar com aluguel',
  'como usar juros compostos a seu favor',
  'o que fazer com o primeiro salário',
  'como organizar finanças após divórcio',
  'como economizar para comprar um carro',
  'quanto custa viver sozinho no Brasil',
  'como fazer orçamento para casamento',
  'como parar de viver no limite do cartão',
  'como investir 100 reais por mês',
  'quando vale a pena fazer empréstimo',
  'como criar uma planilha de gastos simples',
  'como economizar na conta do mercado toda semana',
  'como lidar com dinheiro quando se é jovem',
];

// Pool COMBINADO (config primeiro, depois o fallback interno), com dedupe exato.
const TOPICS = [...new Set([...(config.ai?.dailyTopics || []), ...FALLBACK_TOPICS])];

/**
 * Translate a post to another language using Groq
 */
async function translatePost(post, targetLang) {
  const langNames = { en: 'English', es: 'Spanish' };
  const langName = langNames[targetLang];

  const prompt = `
Translate the following blog post to ${langName}. Keep the same tone, style, and structure.
Do NOT translate brand names (${config.brand.name}). Keep markdown formatting intact.
Keep all image markdown (![alt](url)) exactly as-is, do not modify image paths.
Keep the CTA link to ${config.app.url.replace("https://","")} as-is.

Respond in this exact format:
---TITULO---
[translated title]
---META---
[translated meta description]
---HEADLINE---
[translated ticker headline, max 40 characters]
---KEYWORDS---
[translated keywords, comma separated]
---CONTEUDO---
[translated content in markdown]

Original post:

Title: ${post.title}
Meta: ${post.meta}
Ticker headline: ${post.headline || post.title.slice(0, 40)}
Keywords: ${(post.keywords || []).join(', ')}
Content:
${post.processedContent}
`;

  const result = await generateText(prompt, { maxTokens: 5000, temperature: 0.3 });

  // Parse translated content
  const titleMatch = result.match(/---TITULO---\s*([\s\S]*?)(?=---META---|$)/);
  const metaMatch = result.match(/---META---\s*([\s\S]*?)(?=---HEADLINE---|---KEYWORDS---|$)/);
  const headlineMatch = result.match(/---HEADLINE---\s*([\s\S]*?)(?=---KEYWORDS---|$)/);
  const keywordsMatch = result.match(/---KEYWORDS---\s*([\s\S]*?)(?=---CONTEUDO---|$)/);
  const contentMatch = result.match(/---CONTEUDO---\s*([\s\S]*?)$/);

  return {
    title: titleMatch ? titleMatch[1].trim() : post.title,
    meta: metaMatch ? metaMatch[1].trim() : post.meta,
    // Headline do ticker: opcional, com teto rígido de 40 chars
    headline: (headlineMatch ? headlineMatch[1].trim().replace(/^["']|["']$/g, '') : '').slice(0, 40),
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
 * Insert inline images into content (2-3 images distributed through the post)
 */
async function insertInlineImages(content, slugBase) {
  const h2Matches = content.match(/^## .+$/gm) || [];
  if (h2Matches.length < 2) return content;

  const headings = h2Matches.map(h => h.replace('## ', ''));
  let result = content;

  // Determine which headings get images (target 2-3 images)
  let imagePositions = [];
  if (headings.length >= 6) {
    imagePositions = [1, 3, 5];
  } else if (headings.length >= 4) {
    imagePositions = [1, 2, 3];
  } else if (headings.length >= 2) {
    imagePositions = [0, 1];
  }

  // Insert from last to first (to preserve indices)
  for (let idx = imagePositions.length - 1; idx >= 0; idx--) {
    const i = imagePositions[idx];
    if (i >= headings.length) continue;

    const sectionTopic = `${slugBase} - ${headings[i]}`;
    const imgPath = await generateInlineImage(sectionTopic, `${slugBase}-${i + 1}`, 'posts');
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
${data.headline ? `tickerHeadline: "${data.headline.replace(/"/g, '\\"')}"\n` : ''}image: "${data.imagePath}"
category: "dicas"
locale: "${data.locale}"
tags: ${JSON.stringify(data.keywords || [])}
author: "${config.content.defaultAuthor}"
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

  // Seleção resiliente: parte do índice do dia e itera o pool combinado até
  // achar o 1º tema NÃO coberto (mesmo isThemeCovered do guard/validador).
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const topicIndex = dayOfYear % TOPICS.length;
  let topic = null;
  let skippedCovered = 0;
  for (let i = 0; i < TOPICS.length; i++) {
    const cand = TOPICS[(topicIndex + i) % TOPICS.length];
    const canibal = isThemeCovered(cand, POSTS_DIR);
    if (!canibal.covered) { topic = cand; break; }
    skippedCovered++;
  }
  if (skippedCovered > 0) {
    console.log(`ℹ️ Anti-canibalização: ${skippedCovered} tema(s) do pool já coberto(s) foram pulados na seleção.`);
  }

  // Pool esgotado: pede ao LLM um tema INÉDITO (injetando os temas já cobertos)
  // e valida a resposta contra o mesmo guard — 2 tentativas.
  if (!topic) {
    console.log(`⚠️ Todos os ${TOPICS.length} temas do pool já estão cobertos. Pedindo tema inédito ao LLM...`);
    const avoid = coveredThemesBlock(POSTS_DIR);
    for (let attempt = 1; attempt <= 2 && !topic; attempt++) {
      try {
        const resp = await generateText(`${avoid}
Sugira UM tema inédito de finanças pessoais para um post de blog em português brasileiro, no formato prático "como fazer X" ou pergunta específica (ex: "como economizar na farmácia todo mês").
O tema NÃO pode repetir o núcleo de palavras de nenhum tema listado acima.
Responda APENAS com o tema, em uma única linha, sem aspas e sem explicação.`, { maxTokens: 60, temperature: 0.9 });
        const cand = String(resp || '').trim().split('\n')[0].replace(/^["'\-\s]+|["'\s.]+$/g, '');
        if (cand && !isThemeCovered(cand, POSTS_DIR).covered) {
          topic = cand;
          console.log(`💡 Tema inédito sugerido pelo LLM (tentativa ${attempt}/2): "${cand}"`);
        } else {
          console.log(`⚠️ Tentativa ${attempt}/2: tema sugerido pelo LLM ("${cand}") também está coberto ou é inválido.`);
        }
      } catch (e) {
        console.log(`⚠️ Tentativa ${attempt}/2: falha ao pedir tema ao LLM (${e.message}).`);
      }
    }
  }

  // Skip final: pool esgotado E LLM não trouxe tema válido — visível no Actions.
  if (!topic) {
    console.log('⚠️ Anti-canibalização: nenhum tema livre no pool combinado e o LLM não sugeriu tema inédito válido. Pulando hoje sem publicar.');
    warnSkip('dicas: pool combinado esgotado', 'LLM não sugeriu tema inédito válido em 2 tentativas');
    return;
  }

  console.log(`📝 Tópico: ${topic}`);

  try {
    // 1. Generate PT post
    const post = await generateBlogPost(topic, {
      category: 'dicas',
      keywords: [topic, 'finanças pessoais', 'economia', 'dinheiro'],
      avoidThemes: coveredThemesBlock(POSTS_DIR),
    });

    if (!post.title || !post.content) {
      throw new Error('API retornou post vazio ou incompleto.');
    }

    // Fact-guard: limpa alucinação antes de salvar; bloqueia se mutilaria.
    const fg = analyzeContent(post.content);
    if (fg.blocked) {
      console.log(`⛔ Fact-guard bloqueou (${fg.reason}). Não publica; regenera no próximo ciclo.`);
      return;
    }
    if (fg.cuts.length || fg.linkStrips.length) console.log(`🛡️ Fact-guard: ${fg.cuts.length} corte(s), ${fg.linkStrips.length} link(s) removido(s).`);
    post.content = fg.cleaned;

    // Year-guard: corrige ano defasado no título antes do slug.
    const yg = fixStaleYear(post.title);
    if (yg.changed) { console.log(`[year-guard] título corrigido: "${yg.original}" → "${yg.text}"`); post.title = yg.text; }

    console.log(`✅ Post PT gerado: ${post.title}`);

    const slugPt = createSlug(post.title);

    // Guard: evita duplicar translationKey já existente (o validador i18n bloquearia o push).
    if (existsSync(join(POSTS_DIR, `${slugPt}.md`))) {
      console.log(`⚠️ Post "${slugPt}" já existe — pulando para evitar duplicata de translationKey.`);
      return;
    }

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
      headline: post.headline || '',
      keywords: post.keywords,
      content: processedContentPt,
      imagePath,
      locale: 'pt',
      today,
      translationKey: slugPt,
    }, true); // Mark PT post as featured
    console.log(`📄 PT salvo: ${ptPath}`);

    // 5. Translate to EN (wait 30s to avoid rate limit)
    if (config.locales.includes('en')) {
      console.log('⏳ Aguardando 30s para evitar rate limit...');
      await new Promise(r => setTimeout(r, 30000));
      console.log('🌐 Traduzindo para inglês...');
      const enPost = await translatePost({
        title: post.title,
        meta: post.meta,
        headline: post.headline || '',
        keywords: post.keywords,
        processedContent: processedContentPt,
      }, 'en');

      const ygEn = fixStaleYear(enPost.title);
      if (ygEn.changed) { console.log(`[year-guard] título corrigido: "${ygEn.original}" → "${ygEn.text}"`); enPost.title = ygEn.text; }

      const slugEn = 'en-' + createSlug(enPost.title);
      const enPath = savePost(slugEn, {
        title: enPost.title,
        meta: enPost.meta,
        headline: enPost.headline,
        keywords: enPost.keywords,
        content: enPost.content,
        imagePath, // same cover image
        locale: 'en',
        today,
        translationKey: slugPt,
      });
      console.log(`📄 EN salvo: ${enPath}`);
    }

    // 6. Translate to ES (wait 30s to avoid rate limit)
    if (config.locales.includes('es')) {
      console.log('⏳ Aguardando 30s para evitar rate limit...');
      await new Promise(r => setTimeout(r, 30000));
      console.log('🌐 Traduzindo para espanhol...');
      const esPost = await translatePost({
        title: post.title,
        meta: post.meta,
        headline: post.headline || '',
        keywords: post.keywords,
        processedContent: processedContentPt,
      }, 'es');

      const ygEs = fixStaleYear(esPost.title);
      if (ygEs.changed) { console.log(`[year-guard] título corrigido: "${ygEs.original}" → "${ygEs.text}"`); esPost.title = ygEs.text; }

      const slugEs = 'es-' + createSlug(esPost.title);
      const esPath = savePost(slugEs, {
        title: esPost.title,
        meta: esPost.meta,
        headline: esPost.headline,
        keywords: esPost.keywords,
        content: esPost.content,
        imagePath, // same cover image
        locale: 'es',
        today,
        translationKey: slugPt,
      });
      console.log(`📄 ES salvo: ${esPath}`);
    }

    // 6.5. Add internal links (glossary terms)
    console.log('🔗 Adicionando internal links...');
    execSync('node src/scripts/automacoes/internal-linking.js', { stdio: 'inherit' });

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
