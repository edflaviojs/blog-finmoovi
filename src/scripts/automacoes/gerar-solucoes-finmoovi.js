/**
 * Gerador de Posts "Soluções FinMoovi" (PT + EN + ES)
 * Executa via GitHub Actions toda quarta-feira às 8h BRT
 * Gera posts mostrando como o FinMoovi resolve problemas reais do dia a dia
 * Formato: problema real → solução com o app → CTA
 */

import { generateText, generateCoverImage, generateInlineImage } from '../apis/kie-ai.js';
import { writeFileSync, mkdirSync, existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const POSTS_DIR = join(process.cwd(), 'src', 'content', 'posts');
const IMAGES_DIR = join(process.cwd(), 'public', 'images', 'posts');

const SOLUCOES_TOPICS = [
  {
    problem: 'Dificuldade em anotar todas as despesas do dia',
    feature: 'Smart Capture por voz',
    scenario: 'Você está no ônibus, comprou um café, almoçou fora... e esqueceu de anotar. Com o FinMoovi, basta dizer "café 5 reais" ou "almoço 28 reais" e a despesa é registrada automaticamente por comando de voz.',
    keywords: ['controle de gastos por voz', 'anotar despesas automaticamente', 'app financeiro por voz', 'smart capture finmoovi']
  },
  {
    problem: 'Fazer lista de supermercado na mão e perder o controle do total',
    feature: 'Smart Capture para lista de compras',
    scenario: 'Imagine estar no supermercado e simplesmente dizer: "1 kg de feijão 8,99" ou "leite integral 6,50". O FinMoovi vai criando sua lista com os valores em tempo real. Quando chegar no caixa, você sabe exatamente quanto vai pagar.',
    keywords: ['lista de supermercado automática', 'controle gastos supermercado', 'app lista compras', 'quanto gastei no mercado']
  },
  {
    problem: 'Receber comprovantes e notas em papel e nunca organizar',
    feature: 'Smart Capture por imagem (OCR)',
    scenario: 'Tirou foto do cupom fiscal? O FinMoovi lê automaticamente o valor, a data e o estabelecimento. Sem digitar nada. Funciona com notas fiscais, recibos, extratos impressos e até comprovantes de Pix.',
    keywords: ['escanear nota fiscal', 'app que lê cupom fiscal', 'ocr finanças pessoais', 'digitalizar recibos']
  },
  {
    problem: 'Não saber pra onde está indo o dinheiro todo mês',
    feature: 'Categorização automática e relatórios inteligentes',
    scenario: 'O FinMoovi categoriza cada gasto automaticamente (alimentação, transporte, lazer, contas fixas). No fim do mês, você vê gráficos claros mostrando exatamente onde seu dinheiro foi — sem precisar classificar nada manualmente.',
    keywords: ['para onde vai meu dinheiro', 'categorizar gastos automaticamente', 'relatório financeiro pessoal', 'controle gastos mensais']
  },
  {
    problem: 'Ter dinheiro em várias moedas e não conseguir acompanhar',
    feature: 'Multi-moeda com conversão automática',
    scenario: 'Trabalha com dólar, recebe em real, tem euros guardados? O FinMoovi consolida tudo em um único dashboard com conversão automática em tempo real. Você vê seu patrimônio total sem precisar fazer contas.',
    keywords: ['controle financeiro multi moeda', 'app dólar real euro', 'converter moedas automaticamente', 'finanças pessoais multi currency']
  },
  {
    problem: 'Medo de colocar dados financeiros em apps online',
    feature: '100% offline e criptografia local',
    scenario: 'O FinMoovi funciona 100% offline. Seus dados ficam no SEU dispositivo, com criptografia de ponta a ponta. Nenhum servidor externo tem acesso às suas informações financeiras. Privacidade total.',
    keywords: ['app financeiro offline', 'app financeiro seguro', 'privacidade dados financeiros', 'controle gastos sem internet']
  },
  {
    problem: 'Esquecer de pagar contas e levar multas',
    feature: 'Alertas inteligentes e lembretes',
    scenario: 'O FinMoovi te avisa antes do vencimento: aluguel, cartão, internet, academia. Você define as datas uma vez e o app cuida do resto. Chega de multas por esquecimento.',
    keywords: ['lembrete contas a pagar', 'app avisa vencimento', 'não esquecer boleto', 'alerta conta atrasada']
  },
  {
    problem: 'Ter metas financeiras mas nunca acompanhar o progresso',
    feature: 'Metas com acompanhamento visual',
    scenario: 'Quer juntar para uma viagem? Comprar um carro? Montar reserva de emergência? O FinMoovi mostra o progresso visual de cada meta, quanto falta e quanto tempo vai levar no ritmo atual.',
    keywords: ['app meta financeira', 'acompanhar objetivo financeiro', 'juntar dinheiro para viagem', 'quanto falta para minha meta']
  },
  {
    problem: 'Digitar gastos é chato e você sempre desiste',
    feature: 'Lançamento por texto natural (digitação inteligente)',
    scenario: 'Sem formulários complicados. No FinMoovi você digita como fala: "uber 23,50", "netflix mensal", "presente mãe 150". A IA entende o valor, a categoria e a data automaticamente.',
    keywords: ['app financeiro fácil de usar', 'lançar gastos rápido', 'controle financeiro simples', 'app intuitivo finanças']
  },
  {
    problem: 'Querer entender seus padrões de gastos mas não ter tempo',
    feature: 'Insights automáticos com IA',
    scenario: 'O FinMoovi analisa seus padrões e te mostra: "Você gastou 40% mais em delivery este mês", "Seu gasto com transporte caiu 15%", "Se manter esse ritmo, atinge sua meta em 3 meses".',
    keywords: ['insights financeiros automáticos', 'análise gastos inteligente', 'padrão de gastos', 'onde economizar dinheiro']
  },
  {
    problem: 'Usar planilha Excel mas esquecer de atualizar',
    feature: 'Substitui planilhas com zero esforço',
    scenario: 'Planilhas exigem disciplina diária. O FinMoovi é tão fácil que você usa sem perceber — um comando de voz no café, uma foto do recibo, um texto rápido. Os relatórios se geram sozinhos.',
    keywords: ['substituir planilha financeira', 'app melhor que excel finanças', 'controle gastos sem planilha', 'alternativa planilha financeira']
  },
  {
    problem: 'Dividir despesas com parceiro/roommate e sempre ter confusão',
    feature: 'Contas compartilhadas e split',
    scenario: 'Quem pagou a conta de luz? Quanto cada um deve do mercado? O FinMoovi permite marcar gastos compartilhados e calcular automaticamente quem deve o quê, sem discussão.',
    keywords: ['dividir despesas casal', 'app dividir contas', 'split gastos roommate', 'quem deve quanto']
  },
];

function createSlug(title) {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 60);
}

async function insertInlineImages(content, slugBase) {
  const h2Matches = content.match(/^## .+$/gm) || [];
  if (h2Matches.length < 2) return content;

  const headings = h2Matches.map(h => h.replace('## ', ''));
  let result = content;

  let imagePositions = [];
  if (headings.length >= 6) {
    imagePositions = [1, 3, 5];
  } else if (headings.length >= 4) {
    imagePositions = [1, 2, 3];
  } else if (headings.length >= 2) {
    imagePositions = [0, 1];
  }

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

async function translatePost(post, targetLang) {
  const langNames = { en: 'English', es: 'Spanish' };
  const langName = langNames[targetLang];

  const prompt = `
Translate the following blog post to ${langName}. Keep the same tone, style, and structure.
Do NOT translate brand names (FinMoovi, Smart Capture). Keep markdown formatting intact.
Keep all image markdown (![alt](url)) exactly as-is, do not modify image paths.
Keep the CTA link to finmoovi.com as-is.

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
${post.processedContent}
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
    content: contentMatch ? contentMatch[1].trim() : post.processedContent,
  };
}

function savePost(slug, data) {
  const frontmatter = `---
title: "${data.title.replace(/"/g, '\\"')}"
description: "${data.meta.replace(/"/g, '\\"')}"
image: "${data.imagePath}"
category: "dicas"
locale: "${data.locale}"
tags: ${JSON.stringify(data.keywords || [])}
author: "FinMoovi"
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
  if (!existsSync(POSTS_DIR)) {
    mkdirSync(POSTS_DIR, { recursive: true });
  }
  writeFileSync(postPath, frontmatter, 'utf-8');
  return postPath;
}

async function main() {
  console.log('🚀 Gerando post "Soluções FinMoovi"...');

  const weekOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (86400000 * 7));
  const topicIndex = weekOfYear % SOLUCOES_TOPICS.length;
  const topic = SOLUCOES_TOPICS[topicIndex];

  console.log(`📝 Problema: ${topic.problem}`);
  console.log(`🔧 Feature: ${topic.feature}`);

  const today = new Date().toISOString().split('T')[0];

  // Guard: check if a solucoes post was already generated this week
  const existingFiles = readdirSync(POSTS_DIR).filter(f => f.endsWith('.md') && !f.startsWith('en-') && !f.startsWith('es-'));
  for (const file of existingFiles) {
    const content = readFileSync(join(POSTS_DIR, file), 'utf-8');
    if (content.includes(`publishedAt: ${today}`) && content.includes('"finmoovi"') && content.includes('"smart capture"')) {
      console.log(`⚠️ Já existe um post de soluções gerado hoje (${file}). Abortando.`);
      return;
    }
  }

  const prompt = `
Escreva um post de blog em português brasileiro sobre o seguinte problema financeiro do dia a dia e como o app FinMoovi resolve:

PROBLEMA: ${topic.problem}
FUNCIONALIDADE: ${topic.feature}
CENÁRIO: ${topic.scenario}

REGRAS DO POST:
1. Título: pergunta empática que o leitor se identifica (ex: "Você também esquece de anotar seus gastos?")
2. Começa mostrando o PROBLEMA (empatia, "eu te entendo")
3. Explica a dor de forma real e relatable (com exemplos do dia a dia)
4. Apresenta a SOLUÇÃO (FinMoovi) de forma natural, sem parecer propaganda
5. Mostra cenários práticos de uso (passo a passo simples)
6. Inclui dados ou estatísticas relevantes quando possível
7. Tom: conversacional, amigável, como um amigo que descobriu algo incrível
8. Mínimo 800 palavras
9. Use ## para subtítulos (mínimo 4 subtítulos)
10. Termina com CTA natural: "Experimente o FinMoovi grátis por 7 dias e veja a diferença."
11. NÃO use "em conclusão" ou "para finalizar"
12. Inclua uma seção comparando "antes vs depois" do FinMoovi

Responda EXATAMENTE neste formato:
---TITULO---
[título do post]
---META---
[meta description para SEO, max 155 caracteres]
---KEYWORDS---
[5-7 keywords separadas por vírgula]
---CONTEUDO---
[conteúdo completo em markdown]
`;

  try {
    const result = await generateText(prompt, { maxTokens: 4000, temperature: 0.7 });

    const titleMatch = result.match(/---TITULO---\s*([\s\S]*?)(?=---META---|$)/);
    const metaMatch = result.match(/---META---\s*([\s\S]*?)(?=---KEYWORDS---|$)/);
    const keywordsMatch = result.match(/---KEYWORDS---\s*([\s\S]*?)(?=---CONTEUDO---|$)/);
    const contentMatch = result.match(/---CONTEUDO---\s*([\s\S]*?)$/);

    if (!titleMatch || !contentMatch) {
      throw new Error('API retornou formato inválido.');
    }

    const title = titleMatch[1].trim();
    const meta = metaMatch ? metaMatch[1].trim() : '';
    const keywords = keywordsMatch ? keywordsMatch[1].trim().split(',').map(k => k.trim()) : topic.keywords;
    const content = contentMatch[1].trim();

    // Merge topic keywords with AI-generated ones
    const allKeywords = [...new Set([...keywords, ...topic.keywords, 'finmoovi', 'smart capture'])];

    console.log(`✅ Post PT gerado: ${title}`);

    const slugPt = createSlug(title);

    // Generate cover image
    console.log('🖼️ Gerando imagem de capa...');
    const imagePath = await generateCoverImage(title, slugPt, 'posts');
    console.log(`🖼️ Capa: ${imagePath}`);

    // Insert inline images
    console.log('🖼️ Inserindo imagens inline PT...');
    const processedContentPt = await insertInlineImages(content, slugPt);

    // Save PT
    const ptPath = savePost(slugPt, {
      title,
      meta,
      keywords: allKeywords,
      content: processedContentPt,
      imagePath,
      locale: 'pt',
      today,
      translationKey: slugPt,
    });
    console.log(`📄 PT: ${ptPath}`);

    // Translate EN
    console.log('⏳ Aguardando 30s (rate limit)...');
    await new Promise(r => setTimeout(r, 30000));
    console.log('🌐 Traduzindo EN...');
    const enPost = await translatePost({ title, meta, keywords: allKeywords, processedContent: processedContentPt }, 'en');
    savePost(`en-${slugPt}`, {
      title: enPost.title,
      meta: enPost.meta,
      keywords: enPost.keywords,
      content: enPost.content,
      imagePath,
      locale: 'en',
      today,
      translationKey: slugPt,
    });
    console.log('✅ EN salvo');

    // Translate ES
    console.log('⏳ Aguardando 30s (rate limit)...');
    await new Promise(r => setTimeout(r, 30000));
    console.log('🌐 Traduzindo ES...');
    const esPost = await translatePost({ title, meta, keywords: allKeywords, processedContent: processedContentPt }, 'es');
    savePost(`es-${slugPt}`, {
      title: esPost.title,
      meta: esPost.meta,
      keywords: esPost.keywords,
      content: esPost.content,
      imagePath,
      locale: 'es',
      today,
      translationKey: slugPt,
    });
    console.log('✅ ES salvo');

    // Git commit & push
    console.log('📦 Fazendo commit...');
    execSync('git add -A', { stdio: 'inherit' });
    execSync(`git commit -m "feat: post solução FinMoovi — ${title.substring(0, 50)}"`, { stdio: 'inherit' });
    execSync('git push', { stdio: 'inherit' });
    console.log('🎉 Post publicado com sucesso!');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

main();
