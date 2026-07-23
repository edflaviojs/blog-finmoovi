import { config } from '../../../site.config.ts';
/**
 * Gerador Inteligente de Posts Baseado em Analytics
 * Usa dados do relatório semanal para gerar posts sobre temas que performam
 * Executa após o relatório semanal (terças)
 */

import { generateText, generateCoverImage, generateInlineImage } from '../apis/kie-ai.js';
import { isThemeCovered, coveredThemesBlock, warnSkip } from '../lib/seo-guard.js';
import { takeKeyword, markUsed, QUEUE_FILE } from '../lib/keyword-queue.js';
import { guardedTranslate } from '../lib/lang-guard.js';
import { analyzeContent } from '../lib/fact-guard.js';
import { fixStaleYear, CURRENT_YEAR } from '../lib/year-guard.js';
import { writeFileSync, mkdirSync, existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const POSTS_DIR = join(process.cwd(), 'src', 'content', 'posts');
const IMAGES_DIR = join(process.cwd(), 'public', 'images', 'posts');

if (!GROQ_API_KEY) {
  console.error('Missing GROQ_API_KEY');
  process.exit(1);
}

/**
 * Topics pool — dynamically prioritized based on analytics
 * These are long-tail SEO keywords with high search volume in Brazil
 */
const TOPICS_BY_CATEGORY = {
  high_traffic: [
    'como investir 100 reais por mês e ter renda passiva',
    `renda fixa vs renda variável: onde investir em ${CURRENT_YEAR}`,
    'como montar carteira de investimentos para iniciante',
    'quanto rende 1000 reais no Tesouro Direto por mês',
    'como usar cashback e cupons para economizar de verdade',
    'como funciona o CDB e quanto ele rende',
    'melhores investimentos para quem ganha pouco',
    'como calcular quanto preciso para aposentar',
    'como fazer seu dinheiro render mais que a poupança',
    'como investir em dólar morando no Brasil',
  ],
  seasonal: {
    0: ['metas financeiras para o ano novo: guia prático', 'como organizar finanças após as festas'],
    1: ['como economizar no carnaval sem perder a diversão', `imposto de renda ${CURRENT_YEAR}: documentos necessários`],
    2: ['declaração imposto de renda passo a passo', 'como conseguir maior restituição do IR'],
    3: ['como economizar na Páscoa com a família', 'revisão financeira do primeiro trimestre'],
    4: ['presente dia das mães sem estourar orçamento', 'como investir o adiantamento do 13º'],
    5: ['presente dia dos namorados econômico e criativo', 'meio do ano: hora de revisar seu orçamento'],
    6: ['como economizar nas férias de julho', 'investimentos para o segundo semestre'],
    7: ['presente dia dos pais com economia', 'como se preparar financeiramente para Black Friday'],
    8: ['como aproveitar promoções de setembro', 'planejamento financeiro para o fim do ano'],
    9: ['Black Friday: como preparar sua lista de compras', 'como não cair em falsas promoções'],
    10: ['Black Friday: o que realmente vale a pena comprar', 'como financiar presentes de Natal sem dívidas'],
    11: ['como controlar gastos no Natal e Réveillon', 'como investir o 13º salário', 'retrospectiva financeira do ano']
  },
  evergreen: [
    'como sair do cheque especial de uma vez por todas',
    'como criar um fundo de emergência do zero',
    'como negociar aumento de salário com sucesso',
    'como ensinar crianças sobre dinheiro por idade',
    'como economizar morando sozinho pela primeira vez',
    'como lidar com dinheiro em relacionamento',
    'como reduzir conta de luz em até 40%',
    'como fazer um planejamento financeiro para comprar imóvel',
    'como identificar e eliminar gastos invisíveis',
    'como usar a técnica dos envelopes digitais',
    'PIX: golpes mais comuns e como se proteger',
    'como viver bem gastando menos que seus amigos',
    'como fazer orçamento doméstico em 15 minutos',
    'como superar o medo de investir',
    'como criar múltiplas fontes de renda',
  ]
};

/**
 * Read analytics report to determine topic priority
 */
function getAnalyticsInsights() {
  const reportPath = join(process.cwd(), 'reports', 'latest.md');
  if (!existsSync(reportPath)) {
    console.log('ℹ️ Sem relatório de analytics — usando tópicos padrão');
    return { topCategory: 'dicas', totalViews: 0 };
  }

  const report = readFileSync(reportPath, 'utf-8');

  // Parse top pages to determine what category performs best
  let topCategory = 'dicas';
  if (report.includes('cotac') || report.includes('dolar') || report.includes('euro')) {
    topCategory = 'cotacoes';
  }
  if (report.includes('investi') || report.includes('rend')) {
    topCategory = 'investimentos';
  }

  const viewsMatch = report.match(/Total de Pageviews:\*\*\s*(\d+)/);
  const totalViews = viewsMatch ? parseInt(viewsMatch[1]) : 0;

  return { topCategory, totalViews };
}

/**
 * Get existing post slugs to avoid duplicates
 */
function getExistingSlugs() {
  if (!existsSync(POSTS_DIR)) return new Set();
  return new Set(
    readdirSync(POSTS_DIR)
      .filter(f => f.endsWith('.md') || f.endsWith('.mdx'))
      .map(f => f.replace(/\.(md|mdx)$/, '').toLowerCase())
  );
}

/**
 * Choose topic based on analytics + seasonality + gaps
 */
function chooseTopic(insights) {
  const existingSlugs = getExistingSlugs();
  const month = new Date().getMonth();

  // Priority: seasonal > high_traffic (if category matches) > evergreen
  let pool = [];

  // Add seasonal topics first
  const seasonalTopics = TOPICS_BY_CATEGORY.seasonal[month] || [];
  pool.push(...seasonalTopics);

  // Add high traffic topics
  pool.push(...TOPICS_BY_CATEGORY.high_traffic);

  // Add evergreen
  pool.push(...TOPICS_BY_CATEGORY.evergreen);

  // Filter out already written topics (check by slug similarity)
  const available = pool.filter(topic => {
    const slug = topic
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60);

    // Check if any existing slug contains key parts of this topic
    const keywords = slug.split('-').filter(w => w.length > 3).slice(0, 3);
    return !Array.from(existingSlugs).some(existing =>
      keywords.every(kw => existing.includes(kw))
    );
  });

  if (available.length === 0) {
    console.log('⚠️ Todos os tópicos já foram cobertos. Usando evergreen aleatório.');
    return TOPICS_BY_CATEGORY.evergreen[Math.floor(Math.random() * TOPICS_BY_CATEGORY.evergreen.length)];
  }

  // Pick first available (already prioritized)
  return available[0];
}

/**
 * Generate post via Groq
 */
async function generatePost(topic) {
  const avoidBlock = coveredThemesBlock(POSTS_DIR);
  const prompt = `Você é um redator especialista em finanças pessoais para o blog ${config.brand.name}.
${avoidBlock}
Escreva um artigo completo e profissional sobre: "${topic}"

REGRAS:
- Título criativo e otimizado para SEO (máximo 65 caracteres; se mencionar ano, use ${CURRENT_YEAR})
- Meta description (máximo 155 caracteres)
- Headline de ticker: chamada ultra curta (MÁXIMO 40 caracteres) estilo manchete que desperta curiosidade sem entregar a resposta (ex: "O erro que suga seu salário", "Férias baratas? O truque é este")
- 5-7 keywords relevantes separadas por vírgula
- Conteúdo com 800-1200 palavras
- Use headers H2 e H3 para estruturar
- Inclua exemplos práticos com números reais (salários brasileiros)
- Tom conversacional mas profissional
- O primeiro parágrafo deve responder diretamente à pergunta principal do tema em 40-60 palavras, de forma autossuficiente e citável (sem "neste artigo você verá")
- Mencione o app ${config.app.name} naturalmente 1-2 vezes como ferramenta útil
- Termine com uma conclusão motivacional, seguida da seção final "## Perguntas frequentes" com 3-4 perguntas como H3 (###) e respostas diretas de 2-3 frases cada
- NÃO use emojis no conteúdo (exceto em listas de dicas se fizer sentido)
- NÃO invente estatísticas falsas — use dados gerais conhecidos
- Inclua 1-2 links externos para fontes autoritativas relevantes ao tema (ex: Banco Central do Brasil https://www.bcb.gov.br, Tesouro Direto https://www.tesourodireto.com.br, Investopedia https://www.investopedia.com, IBGE https://www.ibge.gov.br, NerdWallet https://www.nerdwallet.com). Use formato markdown [texto](url). Escolha fontes reais e URLs que existam.

Responda EXATAMENTE neste formato:
---TITULO---
[título aqui — se mencionar ano, use ${CURRENT_YEAR}]
---META---
[meta description]
---HEADLINE---
[headline de ticker, máximo 40 caracteres]
---KEYWORDS---
[keywords separadas por vírgula]
---CONTEUDO---
[conteúdo markdown completo]`;

  const response = await generateText(prompt);
  return response;
}

/**
 * Parse AI response into structured post
 */
function parseResponse(response) {
  const titleMatch = response.match(/---TITULO---\n(.+)/);
  const metaMatch = response.match(/---META---\n(.+)/);
  const headlineMatch = response.match(/---HEADLINE---\n(.+)/);
  const keywordsMatch = response.match(/---KEYWORDS---\n(.+)/);
  const contentMatch = response.match(/---CONTEUDO---\n([\s\S]+)/);

  if (!titleMatch || !contentMatch) {
    throw new Error('Failed to parse AI response');
  }

  // Headline do ticker: opcional (posts antigos/respostas sem o campo caem
  // no corte automático do título no CotacaoBar); teto rígido de 40 chars
  const headline = headlineMatch
    ? headlineMatch[1].trim().replace(/^["']|["']$/g, '').slice(0, 40)
    : '';

  return {
    title: titleMatch[1].trim().replace(/^["']|["']$/g, ''),
    description: (metaMatch ? metaMatch[1].trim() : '').replace(/^["']|["']$/g, ''),
    headline,
    keywords: keywordsMatch ? keywordsMatch[1].split(',').map(k => k.trim()) : [],
    content: contentMatch[1].trim()
  };
}

/**
 * Insert inline images into content (2-3 images distributed through the post)
 * Same pattern as gerar-dicas-financeiras.js
 */
async function insertInlineImages(content, slugBase) {
  const h2Matches = content.match(/^## .+$/gm) || [];
  if (h2Matches.length < 2) return content;

  const headings = h2Matches.map(h => h.replace('## ', ''));
  let result = content;

  // Determine which headings get images (target 2-3 images)
  let imagePositions = [];
  if (headings.length >= 6) {
    // 3 images: after headings 1, 3, 5
    imagePositions = [1, 3, 5];
  } else if (headings.length >= 4) {
    // 3 images: after headings 1, 2, 3
    imagePositions = [1, 2, 3];
  } else if (headings.length >= 2) {
    // 2 images: after headings 0, 1
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
 * Generate slug from title
 */
function slugify(title) {
  return title
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

/**
 * Translate post
 */
async function translatePost(post, targetLang) {
  const langNames = { en: 'English', es: 'Spanish' };
  const langName = langNames[targetLang];

  const prompt = `Translate the following blog post to ${langName}. Keep same tone and style.
Do NOT translate brand names (${config.brand.name}). Keep markdown formatting intact.

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
Ticker headline: ${post.headline || post.title.slice(0, 40)}
Content:
${post.content}`;

  const response = await generateText(prompt);
  return parseResponse(response);
}

/**
 * Create frontmatter and save post file
 */
function savePost(post, slug, locale, imagePath) {
  const date = new Date().toISOString().split('T')[0];
  const translationKey = slug;
  const localeSlug = locale === 'pt' ? slug : `${locale}-${slug}`;

  const frontmatter = `---
title: "${post.title.replace(/"/g, '\\"')}"
description: "${post.description.replace(/"/g, '\\"')}"
${post.headline ? `tickerHeadline: "${post.headline.replace(/"/g, '\\"')}"\n` : ''}image: "${imagePath}"
category: "dicas"
tags:
${post.keywords.slice(0, 5).map(k => `  - "${k.trim()}"`).join('\n')}
author: "${config.content.defaultAuthor}"
publishedAt: ${date}
readingTime: ${Math.ceil(post.content.split(/\s+/).length / 200)}
locale: "${locale}"
translationKey: "${translationKey}"
featured: false
draft: false
translate: true
seo:
  metaTitle: "${post.title.replace(/"/g, '\\"')}"
  metaDescription: "${post.description.replace(/"/g, '\\"')}"
  keywords: ${JSON.stringify(post.keywords.slice(0, 7).map(k => k.trim()))}
---

${post.content}
`;

  if (!existsSync(POSTS_DIR)) mkdirSync(POSTS_DIR, { recursive: true });
  writeFileSync(join(POSTS_DIR, `${localeSlug}.md`), frontmatter);
  console.log(`  ✅ Salvo: ${localeSlug}.md (${locale})`);
}

/**
 * Main execution
 */
async function main() {
  console.log('🤖 Gerador Inteligente de Posts (baseado em Analytics)\n');

  // 1. Read analytics insights
  const insights = getAnalyticsInsights();
  console.log(`📊 Insights: categoria top = ${insights.topCategory}, views = ${insights.totalViews}`);

  // 2. Choose topic — Fase 3: fila de keywords tem prioridade sobre o pool.
  // takeKeyword já pula temas cobertos; markUsed só após publicar com sucesso.
  const queueEntry = takeKeyword({ categories: ['dicas'] });
  if (queueEntry) {
    console.log(`📥 Tema vindo da fila de keywords: "${queueEntry.keyword}" (fonte: ${queueEntry.source})`);
  }
  const topic = queueEntry ? queueEntry.keyword : chooseTopic(insights);
  console.log(`📝 Tópico escolhido: "${topic}"\n`);

  // Anti-canibalização: pula sem gastar API se o tema já está coberto.
  const canibal = isThemeCovered(topic, POSTS_DIR);
  if (canibal.covered) {
    console.log(`⚠️ Anti-canibalização: "${topic}" conflita com "${canibal.conflictSlug}" (${canibal.shared.join(', ')}). Abortando sem gastar API.`);
    warnSkip(topic, `conflita com ${canibal.conflictSlug}`);
    return;
  }

  // 3. Generate post in PT
  console.log('🇧🇷 Gerando post em português...');
  const response = await generatePost(topic);
  const post = parseResponse(response);

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

  const slug = slugify(post.title);
  console.log(`  Título: ${post.title}`);

  // 4. Generate cover image (same system as normal posts)
  const imagePath = await generateCoverImage(post.title, slug, 'posts');
  console.log(`  Imagem: ${imagePath}`);

  // 5. Insert inline images into content
  console.log('  Inserindo imagens inline...');
  post.content = await insertInlineImages(post.content, slug);

  // 6. Save PT version
  savePost(post, slug, 'pt', imagePath);

  // 7. Translate and save EN
  if (config.locales.includes('en')) {
    console.log('🇺🇸 Traduzindo para inglês...');
    const enPost = await guardedTranslate(() => translatePost(post, 'en'), 'en', `${slug} (en)`);
    const ygEn = fixStaleYear(enPost.title);
    if (ygEn.changed) { console.log(`[year-guard] título corrigido: "${ygEn.original}" → "${ygEn.text}"`); enPost.title = ygEn.text; }
    savePost(enPost, slug, 'en', imagePath);
  }

  // 8. Translate and save ES
  if (config.locales.includes('es')) {
    console.log('🇪🇸 Traduzindo para espanhol...');
    const esPost = await guardedTranslate(() => translatePost(post, 'es'), 'es', `${slug} (es)`);
    const ygEs = fixStaleYear(esPost.title);
    if (ygEs.changed) { console.log(`[year-guard] título corrigido: "${ygEs.original}" → "${ygEs.text}"`); esPost.title = ygEs.text; }
    savePost(esPost, slug, 'es', imagePath);
  }

  // 8.5. Fila de keywords: marca como usada SÓ após salvar+traduzir com sucesso.
  if (queueEntry) markUsed(queueEntry.keyword, 'gerar-post-inteligente');

  // 9. Git commit (inclui a fila quando o tema veio dela)
  try {
    const queueGitPath = queueEntry && existsSync(QUEUE_FILE) ? ` "${QUEUE_FILE}"` : '';
    execSync(`git add src/content/posts/ public/images/posts/${queueGitPath}`, { stdio: 'pipe' });
    execSync(`git commit -m "post: ${post.title} (analytics-driven)"`, { stdio: 'pipe' });
    console.log('\n✅ Post commitado com sucesso!');
  } catch (e) {
    console.log('\nℹ️ Nenhuma mudança para commitar');
  }
}

main().catch(err => {
  console.error('Erro:', err);
  process.exit(1);
});
