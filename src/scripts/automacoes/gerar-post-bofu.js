import { config } from '../../../site.config.ts';
import { generateText, generateCoverImage, generateInlineImage } from '../apis/kie-ai.js';
import { isThemeCovered, coveredThemesBlock } from '../lib/seo-guard.js';
import { writeFileSync, mkdirSync, existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const POSTS_DIR = join(process.cwd(), 'src', 'content', 'posts');
const IMAGES_DIR = join(process.cwd(), 'public', 'images', 'posts');

const TOPICS = [
  { type: 'alternativas', title: '5 Alternativas ao Mobills em 2026', keywords: ['alternativa mobills', 'app controle financeiro', 'substituir mobills', 'melhor que mobills'] },
  { type: 'alternativas', title: '5 Alternativas ao Organizze em 2026', keywords: ['alternativa organizze', 'app finanças pessoais', 'organizze alternativa', 'app como organizze'] },
  { type: 'alternativas', title: '5 Alternativas ao GuiaBolso em 2026', keywords: ['alternativa guiabolso', 'app orçamento', 'guiabolso alternativa', 'substituir guiabolso'] },
  { type: 'alternativas', title: '7 Alternativas à Planilha Google para Finanças', keywords: ['alternativa planilha google', 'controle gastos sem planilha', 'app financeiro vs planilha'] },
  { type: 'alternativas', title: '5 Alternativas ao Minhas Economias', keywords: ['alternativa minhas economias', 'app controle gastos grátis', 'minhas economias alternativa'] },
  { type: 'melhores', title: '7 Melhores Apps de Controle Financeiro 2026', keywords: ['melhor app finanças', 'app controle gastos', 'app financeiro 2026', 'melhor app financeiro'] },
  { type: 'melhores', title: '5 Melhores Apps para Orçamento Familiar', keywords: ['app orçamento familiar', 'controle gastos família', 'app financeiro família'] },
  { type: 'melhores', title: '6 Melhores Apps Financeiros para Freelancers', keywords: ['app financeiro freelancer', 'controle gastos autônomo', 'app finanças pj'] },
  { type: 'melhores', title: '5 Melhores Apps Financeiros que Funcionam Offline', keywords: ['app financeiro offline', 'controle gastos sem internet', 'app offline seguro'] },
  { type: 'melhores', title: '7 Melhores Apps com Controle por Voz', keywords: ['app financeiro por voz', 'smart capture finanças', 'registrar gastos voz'] },
  { type: 'comparacao', title: 'FinMoovi vs Organizze: Qual o Melhor em 2026?', keywords: ['finmoovi vs organizze', 'comparação app financeiro', 'organizze ou finmoovi'] },
  { type: 'comparacao', title: 'FinMoovi vs Mobills: Qual Escolher?', keywords: ['finmoovi vs mobills', 'melhor app controle gastos', 'mobills ou finmoovi'] },
  { type: 'comparacao', title: 'FinMoovi vs GuiaBolso: Diferenças Completas', keywords: ['finmoovi vs guiabolso', 'app finanças comparação', 'guiabolso ou finmoovi'] },
  { type: 'comparacao', title: 'FinMoovi vs Minhas Economias: Qual Vale Mais?', keywords: ['finmoovi vs minhas economias', 'app controle dinheiro', 'minhas economias ou finmoovi'] },
  { type: 'comparacao', title: 'Planilha vs App Financeiro: Qual é Melhor para Você?', keywords: ['planilha vs app financeiro', 'controle gastos planilha ou app', 'excel ou app'] },
  { type: 'feature', title: 'Como Controlar Gastos em Várias Moedas com um App', keywords: ['app multi moeda', 'controle dólar euro real', 'gastos moeda estrangeira'] },
  { type: 'feature', title: 'Smart Capture: Registre Gastos por Voz em Segundos', keywords: ['controle gastos voz', 'app financeiro por voz', 'registrar despesa voz'] },
  { type: 'feature', title: 'App Financeiro Offline: Por Que Importa em 2026', keywords: ['app offline seguro', 'privacidade dados financeiros', 'app sem internet'] },
  { type: 'feature', title: 'Categorização Automática de Gastos com IA', keywords: ['categorizar gastos automático', 'ia finanças pessoais', 'app inteligente gastos'] },
  { type: 'feature', title: 'OCR para Notas Fiscais: Digitalize Recibos em 1 Toque', keywords: ['ocr nota fiscal', 'escanear recibo app', 'digitalizar nota fiscal'] },
  { type: 'planilha_vs_app', title: 'Por Que Trocar a Planilha por um App em 2026', keywords: ['substituir planilha', 'app melhor que excel', 'trocar planilha app'] },
  { type: 'planilha_vs_app', title: '5 Sinais de Que Você Precisa de um App Financeiro', keywords: ['quando usar app finanças', 'planilha não funciona', 'preciso app financeiro'] },
  { type: 'planilha_vs_app', title: 'Excel vs Apps de Finanças: Prós e Contras', keywords: ['excel finanças pessoais', 'excel vs app financeiro', 'planilha excel gastos'] },
  { type: 'planilha_vs_app', title: 'Como Migrar da Planilha para um App Financeiro', keywords: ['migrar planilha app', 'começar usar app finanças', 'sair da planilha'] },
  { type: 'planilha_vs_app', title: 'Planilha de Gastos Grátis: Quando Ela Deixa de Funcionar', keywords: ['planilha gastos grátis', 'limitações planilha', 'planilha vs app quando trocar'] },
];

const PROMPTS_BY_TYPE = {
  alternativas: (topic) => `
Escreva um post de blog: "${topic.title}"

REGRAS:
1. Liste 5 alternativas reais ao app mencionado no título, incluindo o ${config.app.name} como uma delas
2. Para cada alternativa: nome, descrição em 2 frases, 3 prós, 2 contras, se é grátis ou pago
3. ${config.app.name} deve aparecer na posição 2 ou 3 (nunca primeiro — pareceria propaganda)
4. Seja honesto sobre prós/contras de TODOS incluindo ${config.app.name}
5. Destaque do ${config.app.name}: multi-moeda, offline, smart capture por voz, categorização com IA
6. Inclua uma tabela comparativa resumo ao final
7. Tom: review imparcial de tech blogger
8. Mínimo 1000 palavras, 5+ seções H2
9. O último H2: "Qual escolher?" com recomendação por perfil
10. Inclua 1-2 links externos para fontes autoritativas (ex: Investopedia https://www.investopedia.com, NerdWallet https://www.nerdwallet.com, Banco Central https://www.bcb.gov.br). Use formato markdown [texto](url). Escolha fontes reais e URLs que existam.

Responda neste formato:
---TITULO---
[título SEO, 50-60 chars, keyword no início]
---META---
[meta description, max 155 chars]
---KEYWORDS---
[5-7 keywords separadas por vírgula]
---CONTEUDO---
[conteúdo markdown completo com tabela]
`,

  melhores: (topic) => `
Escreva um post de blog: "${topic.title}"

REGRAS:
1. Liste os apps mencionados no título com análise honesta de cada um
2. ${config.app.name} aparece na lista (posição 2-4, nunca primeiro)
3. Critérios de avaliação claros: facilidade de uso, preço, funcionalidades, segurança, suporte
4. Para cada app: nome, nota (X/10), prós, contras, preço, destaque
5. Inclua tabela comparativa e "Veredicto: qual escolher por perfil"
6. Tom: jornalista de tecnologia testando apps
7. Mínimo 1000 palavras, 5+ seções H2
8. CTA final: "Quer testar o que funciona offline e por voz? ${config.app.name} tem 7 dias grátis"
9. Inclua 1-2 links externos para fontes autoritativas (ex: Investopedia https://www.investopedia.com, NerdWallet https://www.nerdwallet.com, Banco Central https://www.bcb.gov.br). Use formato markdown [texto](url). Escolha fontes reais e URLs que existam.

Responda neste formato:
---TITULO---
[título SEO, 50-60 chars]
---META---
[meta description, max 155 chars]
---KEYWORDS---
[5-7 keywords]
---CONTEUDO---
[conteúdo markdown com tabela]
`,

  comparacao: (topic) => `
Escreva um post comparativo detalhado: "${topic.title}"

REGRAS:
1. Análise imparcial — mostre onde ${config.app.name} ganha E onde o outro pode ser melhor
2. Categorias de comparação: preço, funcionalidades, plataformas, segurança/privacidade, offline, interface
3. Tabela comparativa detalhada em markdown
4. Seção "Escolha X se..." / "Escolha Y se..." baseada no perfil do usuário
5. Seja honesto — credibilidade gera mais conversão que propaganda
6. Mínimo 1200 palavras, 6+ seções H2
7. CTA final: "Teste você mesmo — ${config.app.name} tem 7 dias grátis sem cartão"
8. Inclua 1-2 links externos para fontes autoritativas (ex: Investopedia https://www.investopedia.com, NerdWallet https://www.nerdwallet.com, Banco Central https://www.bcb.gov.br). Use formato markdown [texto](url). Escolha fontes reais e URLs que existam.

Responda neste formato:
---TITULO---
[título SEO, 50-60 chars]
---META---
[meta description, max 155 chars]
---KEYWORDS---
[5-7 keywords]
---CONTEUDO---
[conteúdo markdown com tabela comparativa]
`,

  feature: (topic) => `
Escreva um post educativo: "${topic.title}"

REGRAS:
1. Foco 80% no PROBLEMA que a feature resolve, 20% na solução
2. Comece com cenário real do dia a dia que o leitor se identifique
3. Explique como a tecnologia funciona de forma acessível
4. Mostre 3 cenários práticos de uso
5. Seção "antes vs depois" mostrando o ganho de tempo/praticidade
6. ${config.app.name} aparece como exemplo natural (não propaganda)
7. Cite que outros apps também oferecem features similares (honestidade)
8. Tom: tech explainer acessível
9. Mínimo 800 palavras, 4-5 seções H2
10. CTA sutil no final
11. Inclua 1-2 links externos para fontes autoritativas (ex: Investopedia https://www.investopedia.com, NerdWallet https://www.nerdwallet.com, Banco Central https://www.bcb.gov.br). Use formato markdown [texto](url). Escolha fontes reais e URLs que existam.

Responda neste formato:
---TITULO---
[título SEO, 50-60 chars]
---META---
[meta description, max 155 chars]
---KEYWORDS---
[5-7 keywords]
---CONTEUDO---
[conteúdo markdown]
`,

  planilha_vs_app: (topic) => `
Escreva um post: "${topic.title}"

REGRAS:
1. Reconheça que planilhas TÊM vantagens (flexibilidade, gratuitas, customizáveis)
2. Mostre quando um app faz mais sentido (consistência, mobilidade, automação, voz)
3. Use dados reais: "pesquisas mostram que 70% desiste da planilha em 30 dias por falta de consistência"
4. ${config.app.name} como exemplo de app moderno, mas cite Mobills e Organizze também
5. Tom: equilibrado, sem demonizar planilhas
6. Inclua checklist "Planilha é para você se..." / "App é para você se..."
7. Mínimo 800 palavras, 4-5 seções H2
8. CTA: "Se a planilha não está funcionando, teste o ${config.app.name} por 7 dias"
9. Inclua 1-2 links externos para fontes autoritativas (ex: Investopedia https://www.investopedia.com, NerdWallet https://www.nerdwallet.com, Banco Central https://www.bcb.gov.br). Use formato markdown [texto](url). Escolha fontes reais e URLs que existam.

Responda neste formato:
---TITULO---
[título SEO, 50-60 chars]
---META---
[meta description, max 155 chars]
---KEYWORDS---
[5-7 keywords]
---CONTEUDO---
[conteúdo markdown]
`,
};

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
Do NOT translate app names (${config.app.name}, Mobills, Organizze, GuiaBolso, etc).
Keep all image markdown (![alt](url)) exactly as-is.

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
category: "ferramentas"
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
  console.log('🛠️ Gerando post BOFU (ferramentas)...');

  const weekOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (86400000 * 7));
  const topicIndex = weekOfYear % TOPICS.length;
  const topic = TOPICS[topicIndex];

  console.log(`📝 [${topic.type}] ${topic.title}`);
  const today = new Date().toISOString().split('T')[0];

  const existingFiles = readdirSync(POSTS_DIR).filter(f => f.endsWith('.md') && !f.startsWith('en-') && !f.startsWith('es-'));
  for (const file of existingFiles) {
    const content = readFileSync(join(POSTS_DIR, file), 'utf-8');
    if (content.includes(`publishedAt: ${today}`) && content.includes('category: "ferramentas"')) {
      console.log(`⚠️ Já existe post ferramentas hoje (${file}). Abortando.`);
      return;
    }
  }

  // Anti-canibalização: pula sem gastar API se o tema já está coberto.
  const canibal = isThemeCovered(topic.title, POSTS_DIR);
  if (canibal.covered) {
    console.log(`⚠️ Anti-canibalização: "${topic.title}" conflita com "${canibal.conflictSlug}" (${canibal.shared.join(', ')}). Abortando sem gastar API.`);
    return;
  }
  const avoidBlock = coveredThemesBlock(POSTS_DIR);

  const promptFn = PROMPTS_BY_TYPE[topic.type] || PROMPTS_BY_TYPE.feature;
  const prompt = `${avoidBlock}\n` + promptFn(topic);

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

    let title, meta, keywords, content;
    if (titleMatch && contentMatch) {
      title = titleMatch[1].trim();
      meta = metaMatch ? metaMatch[1].trim() : '';
      keywords = keywordsMatch ? keywordsMatch[1].trim().split(',').map(k => k.trim()) : topic.keywords;
      content = contentMatch[1].trim();
    } else if (result && result.trim().length > 300 && /^#{1,2}\s/m.test(result)) {
      // Fallback: modelo respondeu em markdown puro (ex.: "# Título") sem os delimitadores.
      const h1 = result.match(/^#\s+(.+)$/m);
      title = (h1 ? h1[1] : result.split('\n').find(l => l.trim()).replace(/^#+\s*/, '')).trim();
      content = result.replace(/^#\s+.+\r?\n?/m, '').trim();
      meta = '';
      keywords = topic.keywords;
      console.log('ℹ️ Delimitadores ausentes — usando fallback markdown (título do primeiro H1).');
    } else {
      throw new Error(`Formato inválido após 3 tentativas. Última resposta: ${(result || '').substring(0, 500)}`);
    }
    const allKeywords = [...new Set([...keywords, ...topic.keywords])];
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
    execSync(`git commit -m "feat: post BOFU — ${title.substring(0, 50)} [PT/EN/ES]"`, { stdio: 'inherit' });
    console.log('🎉 Post BOFU publicado!');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

main();
