import { config } from '../../../site.config.ts';
import { generateText, generateCoverImage, generateInlineImage } from '../apis/kie-ai.js';
import { writeFileSync, mkdirSync, existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const POSTS_DIR = join(process.cwd(), 'src', 'content', 'posts');
const IMAGES_DIR = join(process.cwd(), 'public', 'images', 'posts');

const TOPICS = [
  { topic: 'como montar um orçamento familiar do zero', keywords: ['orçamento familiar', 'como fazer orçamento', 'controle financeiro família'] },
  { topic: 'método 50-30-20 aplicado ao salário brasileiro', keywords: ['regra 50 30 20', 'como dividir salário', 'método orçamento'] },
  { topic: 'como fazer orçamento ganhando salário mínimo', keywords: ['orçamento salário mínimo', 'economizar ganhando pouco', 'controle gastos'] },
  { topic: 'como controlar gastos com cartão de crédito sem se endividar', keywords: ['controlar cartão crédito', 'gastos cartão', 'não se endividar'] },
  { topic: 'orçamento para casal: como dividir despesas de forma justa', keywords: ['orçamento casal', 'dividir despesas casal', 'finanças a dois'] },
  { topic: 'como reduzir gastos fixos mensais em até 30%', keywords: ['reduzir gastos fixos', 'cortar despesas', 'economizar contas'] },
  { topic: 'técnica dos envelopes digitais: guia prático', keywords: ['envelopes digitais', 'método envelopes', 'controle gastos categorias'] },
  { topic: 'planejamento financeiro para autônomos e freelancers', keywords: ['finanças autônomo', 'orçamento freelancer', 'renda variável planejamento'] },
  { topic: 'orçamento base zero: como funciona e por que usar', keywords: ['orçamento base zero', 'zero based budget', 'cada real tem destino'] },
  { topic: 'como acompanhar gastos diários sem esquecer de anotar', keywords: ['anotar gastos diários', 'controle diário', 'registrar despesas'] },
  { topic: 'orçamento para quem mora sozinho pela primeira vez', keywords: ['morar sozinho gastos', 'orçamento sozinho', 'primeiro apartamento'] },
  { topic: 'como planejar financeiramente a chegada de um filho', keywords: ['planejar filho finanças', 'custo ter filho', 'orçamento bebê'] },
  { topic: 'como reorganizar finanças após uma demissão', keywords: ['demissão finanças', 'reorganizar após perder emprego', 'reserva emergência'] },
  { topic: 'como reduzir conta de energia e água em casa', keywords: ['economizar energia', 'reduzir conta luz', 'economizar água'] },
  { topic: 'planejamento financeiro para comprar o primeiro imóvel', keywords: ['comprar imóvel planejamento', 'juntar dinheiro casa', 'entrada imóvel'] },
  { topic: 'como criar um fundo de emergência em 6 meses', keywords: ['fundo emergência', 'reserva emergência rápido', 'como juntar dinheiro'] },
  { topic: 'como fazer orçamento para viagem internacional', keywords: ['orçamento viagem', 'quanto custa viajar', 'planejar viagem dinheiro'] },
  { topic: 'como controlar gastos variáveis sem neurose', keywords: ['gastos variáveis', 'controlar lazer', 'gastar sem culpa'] },
  { topic: 'quanto gastar em cada categoria: guia de percentuais', keywords: ['percentual orçamento', 'quanto gastar aluguel', 'divisão orçamento'] },
  { topic: 'gastos invisíveis que drenam seu salário todo mês', keywords: ['gastos invisíveis', 'gastos desnecessários', 'onde vai meu dinheiro'] },
  { topic: 'planejamento financeiro para aposentadoria: comece agora', keywords: ['planejar aposentadoria', 'quanto guardar aposentar', 'previdência'] },
  { topic: 'como separar finanças de microempresa e pessoa física', keywords: ['separar finanças pj pf', 'mei finanças', 'conta pj pessoa física'] },
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

async function main() {
  console.log('💰 Gerando post de orçamento...');

  const weekOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (86400000 * 7));
  const topicIndex = weekOfYear % TOPICS.length;
  const { topic, keywords: topicKeywords } = TOPICS[topicIndex];

  console.log(`📝 ${topic}`);
  const today = new Date().toISOString().split('T')[0];

  const existingFiles = readdirSync(POSTS_DIR).filter(f => f.endsWith('.md') && !f.startsWith('en-') && !f.startsWith('es-'));
  for (const file of existingFiles) {
    const content = readFileSync(join(POSTS_DIR, file), 'utf-8');
    if (content.includes(`publishedAt: ${today}`) && content.includes('category: "orcamento"')) {
      console.log(`⚠️ Já existe post orçamento hoje (${file}). Abortando.`);
      return;
    }
  }

  const prompt = `
Escreva um artigo prático sobre: "${topic}"

REGRAS DE ESTILO:
- Tom: coach financeiro amigo, direto e motivador
- Use exemplos com salários reais brasileiros (R$2.000 a R$8.000)
- Inclua passo-a-passo numerado quando fizer sentido
- Pelo menos uma "**Dica prática:**" destacada em negrito
- Tabelas de exemplo quando relevante (divisão de orçamento, categorias de gastos)
- NÃO comece com frases genéricas tipo "Você já se perguntou", "No cenário atual"
- Comece direto com o conteúdo prático
- Headers H2 como ações (verbos no imperativo ou infinitivo)
- Mínimo 800 palavras, 4-6 seções H2
- O último H2: "Comece com 5 minutos por dia"
- Após o último parágrafo, inclua:

---

**Quer automatizar esse controle? [Teste o ${config.app.name} grátis por 7 dias](${config.app.url}) — ele categoriza gastos automaticamente e gera relatórios sem esforço.**

ESTRUTURA DE RESPOSTA:
---TITULO---
[título SEO, 50-60 chars, keyword no início]
---META---
[meta description, 150-160 chars]
---KEYWORDS---
[5-7 keywords separadas por vírgula]
---CONTEUDO---
[conteúdo markdown completo]
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
    console.log('🎉 Post orçamento publicado!');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

main();
