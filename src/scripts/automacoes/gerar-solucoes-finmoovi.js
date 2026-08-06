import { config } from '../../../site.config.ts';
/**
 * Gerador de Posts "Soluções ${config.app.name}" (PT + EN + ES)
 * Executa via GitHub Actions toda quarta-feira às 8h BRT
 * Gera posts mostrando como o ${config.app.name} resolve problemas reais do dia a dia
 * Formato: problema real → solução com o app → CTA
 */

import { generateText, generateCoverImage, generateInlineImage } from '../apis/kie-ai.js';
import { isThemeCovered, coveredThemesBlock, warnSkip, trimSlug } from '../lib/seo-guard.js';
import { guardedTranslate } from '../lib/lang-guard.js';
import { analyzeContent } from '../lib/fact-guard.js';
import { fixStaleYear, CURRENT_YEAR } from '../lib/year-guard.js';
import { getTranslationInstructions } from '../lib/translation-prompt.js';
import { postCoreRules } from '../lib/prompt-post.js';
import { writeFileSync, mkdirSync, existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const POSTS_DIR = join(process.cwd(), 'src', 'content', 'posts');
const IMAGES_DIR = join(process.cwd(), 'public', 'images', 'posts');

/**
 * Se config.ai.solutionTopics tem itens, gera scenarios dinamicamente via IA.
 * Se não, usa os exemplos hardcoded (finance-specific como fallback/exemplo).
 */
async function getSolutionTopics(forbiddenThemes = [], seedIndex = 0) {
  const dynamicTopics = config.ai?.solutionTopics || [];

  if (dynamicTopics.length > 0) {
    // Generate scenarios from AI using the solutionTopics as seeds.
    // Shape no site.config.ts: { topic: string, keywords: string[] }.
    // A semente avança pela FILA a cada tentativa (seedIndex) em vez de sortear:
    // com sorteio, uma tentativa rejeitada podia cair na MESMA semente e repetir
    // o mesmo tema; percorrendo a fila, cada retentativa ataca um tema diferente.
    const seed = dynamicTopics[seedIndex % dynamicTopics.length];
    const seedTopic = typeof seed === 'string' ? seed : seed.topic;
    const seedKeywords = (seed && Array.isArray(seed.keywords)) ? seed.keywords : [];
    const avoidBlock = coveredThemesBlock(POSTS_DIR);
    const forbiddenBlock = forbiddenThemes.length
      ? `\nTEMAS PROIBIDOS (já rejeitados pelo guard anti-canibalização — NÃO use estes nem variações próximas):\n${forbiddenThemes.map(t => `- ${t}`).join('\n')}\n`
      : '';
    const prompt = `${avoidBlock}${forbiddenBlock}
Crie um cenário de post para o blog ${config.brand.name} no nicho de ${config.content.niche.pt}.

O app se chama ${config.app.name} e está em ${config.app.url}.
Funcionalidades do app: ${config.app.features.pt.join(', ')}.

Tópico de solução: "${seedTopic}"
Keywords semente (inclua-as no array "keywords"): ${seedKeywords.join(', ')}

O campo "problem" NÃO pode repetir o núcleo de palavras de nenhum tema já publicado listado acima.

Responda em JSON com esta estrutura (sem markdown, só JSON):
{
  "problem": "Problema real que o usuário enfrenta (1 frase)",
  "feature": "Funcionalidade do app que resolve (2-3 palavras)",
  "scenario": "Cenário detalhado mostrando como o app resolve (3-4 frases, mencionando ${config.app.name} naturalmente)",
  "keywords": ["keyword 1", "keyword 2", "keyword 3", "keyword 4"]
}`;

    try {
      const response = await generateText(prompt);
      const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      // Seed keywords do config entram como base das keywords do post.
      parsed.keywords = [...new Set([...(Array.isArray(parsed.keywords) ? parsed.keywords : []), ...seedKeywords])];
      return [parsed];
    } catch (e) {
      console.log('⚠️  Falha ao gerar cenário com IA, usando fallback');
    }
  }

  // Fallback: finance-specific examples (will be used until user configures solutionTopics)
  return FALLBACK_TOPICS;
}

const FALLBACK_TOPICS = [
  {
    problem: 'Dificuldade em anotar todas as despesas do dia',
    feature: 'Smart Capture por voz',
    scenario: `Você está no ônibus, comprou um café, almoçou fora... e esqueceu de anotar. Com o ${config.app.name}, basta dizer "café 5 reais" ou "almoço 28 reais" e a despesa é registrada automaticamente por comando de voz.`,
    keywords: ['controle de gastos por voz', 'anotar despesas automaticamente', 'app financeiro por voz', `smart capture ${config.app.name.toLowerCase()}`]
  },
  {
    problem: 'Fazer lista de supermercado na mão e perder o controle do total',
    feature: 'Smart Capture para lista de compras',
    scenario: `Imagine estar no supermercado e simplesmente dizer: "1 kg de feijão 8,99" ou "leite integral 6,50". O ${config.app.name} vai criando sua lista com os valores em tempo real. Quando chegar no caixa, você sabe exatamente quanto vai pagar.`,
    keywords: ['lista de supermercado automática', 'controle gastos supermercado', 'app lista compras', 'quanto gastei no mercado']
  },
  {
    problem: 'Receber comprovantes e notas em papel e nunca organizar',
    feature: 'Smart Capture por imagem (OCR)',
    scenario: `Tirou foto do cupom fiscal? O ${config.app.name} lê automaticamente o valor, a data e o estabelecimento. Sem digitar nada. Funciona com notas fiscais, recibos, extratos impressos e até comprovantes de Pix.`,
    keywords: ['escanear nota fiscal', 'app que lê cupom fiscal', 'ocr finanças pessoais', 'digitalizar recibos']
  },
  {
    problem: 'Não saber pra onde está indo o dinheiro todo mês',
    feature: 'Categorização automática e relatórios inteligentes',
    scenario: `O ${config.app.name} categoriza cada gasto automaticamente (alimentação, transporte, lazer, contas fixas). No fim do mês, você vê gráficos claros mostrando exatamente onde seu dinheiro foi — sem precisar classificar nada manualmente.`,
    keywords: ['para onde vai meu dinheiro', 'categorizar gastos automaticamente', 'relatório financeiro pessoal', 'controle gastos mensais']
  },
  {
    problem: 'Ter dinheiro em várias moedas e não conseguir acompanhar',
    feature: 'Multi-moeda com conversão automática',
    scenario: `Trabalha com dólar, recebe em real, tem euros guardados? O ${config.app.name} consolida tudo em um único dashboard com conversão automática em tempo real. Você vê seu patrimônio total sem precisar fazer contas.`,
    keywords: ['controle financeiro multi moeda', 'app dólar real euro', 'converter moedas automaticamente', 'finanças pessoais multi currency']
  },
  {
    problem: 'Medo de colocar dados financeiros em apps online',
    feature: '100% offline e criptografia local',
    scenario: `O ${config.app.name} funciona 100% offline. Seus dados ficam no SEU dispositivo, com criptografia de ponta a ponta. Nenhum servidor externo tem acesso às suas informações financeiras. Privacidade total.`,
    keywords: ['app financeiro offline', 'app financeiro seguro', 'privacidade dados financeiros', 'controle gastos sem internet']
  },
  {
    problem: 'Esquecer de pagar contas e levar multas',
    feature: 'Alertas inteligentes e lembretes',
    scenario: `O ${config.app.name} te avisa antes do vencimento: aluguel, cartão, internet, academia. Você define as datas uma vez e o app cuida do resto. Chega de multas por esquecimento.`,
    keywords: ['lembrete contas a pagar', 'app avisa vencimento', 'não esquecer boleto', 'alerta conta atrasada']
  },
  {
    problem: 'Ter metas financeiras mas nunca acompanhar o progresso',
    feature: 'Metas com acompanhamento visual',
    scenario: `Quer juntar para uma viagem? Comprar um carro? Montar reserva de emergência? O ${config.app.name} mostra o progresso visual de cada meta, quanto falta e quanto tempo vai levar no ritmo atual.`,
    keywords: ['app meta financeira', 'acompanhar objetivo financeiro', 'juntar dinheiro para viagem', 'quanto falta para minha meta']
  },
  {
    problem: 'Digitar gastos é chato e você sempre desiste',
    feature: 'Lançamento por texto natural (digitação inteligente)',
    scenario: `Sem formulários complicados. No ${config.app.name} você digita como fala: "uber 23,50", "netflix mensal", "presente mãe 150". A IA entende o valor, a categoria e a data automaticamente.`,
    keywords: ['app financeiro fácil de usar', 'lançar gastos rápido', 'controle financeiro simples', 'app intuitivo finanças']
  },
  {
    problem: 'Querer entender seus padrões de gastos mas não ter tempo',
    feature: 'Insights automáticos com IA',
    scenario: `O ${config.app.name} analisa seus padrões e te mostra: "Você gastou 40% mais em delivery este mês", "Seu gasto com transporte caiu 15%", "Se manter esse ritmo, atinge sua meta em 3 meses".`,
    keywords: ['insights financeiros automáticos', 'análise gastos inteligente', 'padrão de gastos', 'onde economizar dinheiro']
  },
  {
    problem: 'Usar planilha Excel mas esquecer de atualizar',
    feature: 'Substitui planilhas com zero esforço',
    scenario: `Planilhas exigem disciplina diária. O ${config.app.name} é tão fácil que você usa sem perceber — um comando de voz no café, uma foto do recibo, um texto rápido. Os relatórios se geram sozinhos.`,
    keywords: ['substituir planilha financeira', 'app melhor que excel finanças', 'controle gastos sem planilha', 'alternativa planilha financeira']
  },
  {
    problem: 'Dividir despesas com parceiro/roommate e sempre ter confusão',
    feature: 'Contas compartilhadas e split',
    scenario: `Quem pagou a conta de luz? Quanto cada um deve do mercado? O ${config.app.name} permite marcar gastos compartilhados e calcular automaticamente quem deve o quê, sem discussão.`,
    keywords: ['dividir despesas casal', 'app dividir contas', 'split gastos roommate', 'quem deve quanto']
  },
];

function createSlug(title) {
  return trimSlug(title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, ''));
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

  const instructions = getTranslationInstructions(langName, {
    brandName: config.brand.name || config.app?.name || 'FinMoovi',
    appUrl: config.app?.url?.replace('https://', '') || 'app.finmoovi.com',
    extraInstructions: `Do NOT translate feature names (Smart Capture).`,
  });

  const prompt = `${instructions}

---ORIGINAL POST---
Title: ${post.title}
Meta: ${post.meta}
Ticker headline: ${post.headline || post.title.slice(0, 40)}
Keywords: ${(post.keywords || []).join(', ')}
Content:
${post.processedContent}
`;

  const result = await generateText(prompt, { maxTokens: 5000, temperature: 0.3 });

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

function savePost(slug, data) {
  const frontmatter = `---
title: "${data.title.replace(/"/g, '\\"')}"
description: "${data.meta.replace(/"/g, '\\"')}"
${data.headline ? `tickerHeadline: "${data.headline.replace(/"/g, '\\"')}"\n` : ''}image: "${data.imagePath}"
category: "ferramentas"
locale: "${data.locale}"
tags: ${JSON.stringify(data.keywords || [])}
author: "${config.content.defaultAuthor}"
publishedAt: ${data.today}
readingTime: ${Math.ceil(data.content.split(/\s+/).length / 200)}
featured: false
translationKey: "${data.translationKey || ''}"
scope: "universal"
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

/**
 * Escreve o rascunho (título + meta + conteúdo) de um cenário, SEM gastar
 * imagem nem tradução. Devolve null se a IA responder em formato inválido ou se
 * o fact-guard bloquear. Separado de main() para que a checagem de
 * canibalização POR TÍTULO possa rejeitar e pedir outro cenário barato — o
 * caro (4 imagens + 2 traduções) só acontece depois do título aprovado.
 */
async function generateDraft(topic, rejectedTitles = []) {
  const avoidBlock = coveredThemesBlock(POSTS_DIR);
  const rejectedBlock = rejectedTitles.length
    ? `\nTÍTULOS JÁ REJEITADOS nesta corrida por canibalizarem um post existente — NÃO escreva estes nem variações próximas:\n${rejectedTitles.map(t => `- ${t}`).join('\n')}\n`
    : '';

  const prompt = `
${avoidBlock}${rejectedBlock}
Escreva um post de blog em português brasileiro sobre o seguinte problema financeiro do dia a dia e como o app ${config.app.name} resolve:

PROBLEMA: ${topic.problem}
FUNCIONALIDADE: ${topic.feature}
CENÁRIO: ${topic.scenario}

${postCoreRules({ appName: config.app.name })}

REGRAS DE FORMA (mantidas):
1. Título: pergunta empática em que o leitor se identifica, construída a partir do PROBLEMA acima; se mencionar ano, use ${CURRENT_YEAR}
1b. O TÍTULO não pode repetir o núcleo de palavras de nenhum tema já publicado listado acima. Acrescentar o ano NÃO torna o título diferente — se o núcleo de palavras coincide, o post é rejeitado.
2. Começa mostrando o PROBLEMA (empatia, "eu te entendo")
3. Explica a dor de forma real e relatable (com exemplos do dia a dia)
4. Apresenta a SOLUÇÃO (${config.app.name}) de forma natural, sem parecer propaganda
5. Mostra cenários práticos de uso (passo a passo simples)
6. Inclui dados ou estatísticas relevantes quando possível
7. Tom: conversacional, amigável, como um amigo que descobriu algo incrível
8. Mínimo 800 palavras
9. Use ## para subtítulos (mínimo 4 subtítulos)
10. Termina com CTA natural: "Experimente o ${config.app.name} grátis por 7 dias e veja a diferença."
11. NÃO use "em conclusão" ou "para finalizar"
12. Inclua uma seção comparando "antes vs depois" do ${config.app.name}
13. Inclua 1-2 links externos para fontes autoritativas UNIVERSAIS relevantes ao tema (ex: Investopedia https://www.investopedia.com, OECD https://www.oecd.org, World Bank https://www.worldbank.org). Use formato markdown [texto](url). Escolha fontes reais e URLs que existam.
14. Headline de ticker: chamada ultra curta (MÁXIMO 40 caracteres) estilo manchete que desperta curiosidade sem entregar a resposta (ex: "O erro que suga seu salário")
15. O primeiro parágrafo deve responder diretamente à pergunta principal do problema em 40-60 palavras, de forma autossuficiente e citável (sem "neste artigo você verá")
16. Encerre com a seção "## Perguntas frequentes": 3-4 perguntas como H3 (###) com respostas diretas de 2-3 frases cada

Responda EXATAMENTE neste formato:
---TITULO---
[título do post]
---META---
[meta description para SEO, max 155 caracteres]
---HEADLINE---
[headline de ticker, máximo 40 caracteres]
---KEYWORDS---
[5-7 keywords separadas por vírgula]
---CONTEUDO---
[conteúdo completo em markdown]
`;

  const result = await generateText(prompt, { maxTokens: 4000, temperature: 0.7 });

  const titleMatch = result.match(/---TITULO---\s*([\s\S]*?)(?=---META---|$)/);
  const metaMatch = result.match(/---META---\s*([\s\S]*?)(?=---HEADLINE---|---KEYWORDS---|$)/);
  const headlineMatch = result.match(/---HEADLINE---\s*([\s\S]*?)(?=---KEYWORDS---|$)/);
  const keywordsMatch = result.match(/---KEYWORDS---\s*([\s\S]*?)(?=---CONTEUDO---|$)/);
  const contentMatch = result.match(/---CONTEUDO---\s*([\s\S]*?)$/);

  if (!titleMatch || !contentMatch) {
    throw new Error('API retornou formato inválido.');
  }

  let title = titleMatch[1].trim();
  const meta = metaMatch ? metaMatch[1].trim() : '';
  // Headline do ticker: opcional, com teto rígido de 40 chars
  const headline = (headlineMatch ? headlineMatch[1].trim().replace(/^["']|["']$/g, '') : '').slice(0, 40);
  const keywords = keywordsMatch ? keywordsMatch[1].trim().split(',').map(k => k.trim()) : topic.keywords;
  const contentRaw = contentMatch[1].trim();

  // Fact-guard: limpa alucinação antes de salvar; bloqueia se mutilaria.
  const fg = analyzeContent(contentRaw);
  if (fg.blocked) {
    console.log(`⛔ Fact-guard bloqueou (${fg.reason}). Não publica; regenera no próximo ciclo.`);
    return null;
  }
  if (fg.cuts.length || fg.linkStrips.length) console.log(`🛡️ Fact-guard: ${fg.cuts.length} corte(s), ${fg.linkStrips.length} link(s) removido(s).`);

  // Year-guard: corrige ano defasado no título antes do slug.
  const yg = fixStaleYear(title);
  if (yg.changed) { console.log(`[year-guard] título corrigido: "${yg.original}" → "${yg.text}"`); title = yg.text; }

  return { title, meta, headline, keywords, content: fg.cleaned };
}

async function main() {
  console.log(`🚀 Gerando post "Soluções ${config.app.name}"...`);

  const today = new Date().toISOString().split('T')[0];

  // Guard: check if a solucoes post was already generated this week
  const existingFiles = readdirSync(POSTS_DIR).filter(f => f.endsWith('.md') && !f.startsWith('en-') && !f.startsWith('es-'));
  for (const file of existingFiles) {
    const content = readFileSync(join(POSTS_DIR, file), 'utf-8');
    if (content.includes(`publishedAt: ${today}`) && content.includes('category: "ferramentas"') && content.includes(`"${config.app.name.toLowerCase()}"`)) {
      console.log(`⚠️ Já existe um post de soluções gerado hoje (${file}). Abortando.`);
      return;
    }
  }

  // Seleção do cenário + escrita do rascunho, com anti-canibalização medida
  // também pelo TÍTULO — a MESMA régua do validador (validar-i18n.js) que barra
  // o push. Antes o guard media só `topic.problem`: o problema passava, a IA
  // escrevia um título com o mesmo núcleo de palavras de um post já publicado, e
  // o validador reprovava DEPOIS de já terem sido gastas 4 imagens e 2 traduções
  // — o post da semana ia inteiro para o lixo (29/07 e 05/08 de 2026, o mesmo
  // tema nas duas vezes). Agora, rejeitado o título, marca o tema E o título como
  // proibidos, avança para o PRÓXIMO da fila de sementes e escreve outro. Só
  // desiste depois de 4 voltas, para não ficar semana sem conteúdo.
  const weekOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (86400000 * 7));
  const MAX_ATTEMPTS = 4;
  const forbiddenThemes = [];
  const rejectedTitles = [];
  let topic = null;
  let draft = null;

  try {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS && !draft; attempt++) {
      const topics = await getSolutionTopics(forbiddenThemes, weekOfYear + (attempt - 1));
      // Cenário dinâmico retorna 1 item (índice 0); no fallback estático, avança
      // o índice a cada tentativa para não repetir o mesmo tema rejeitado.
      const cand = topics[(weekOfYear + (attempt - 1)) % topics.length];

      // Trava 1 (barata): o PROBLEMA já está coberto? Nem escreve o post.
      const canibalTema = isThemeCovered(cand.problem, POSTS_DIR);
      if (canibalTema.covered) {
        console.log(`⚠️ Anti-canibalização ${attempt}/${MAX_ATTEMPTS} (tema): "${cand.problem}" conflita com "${canibalTema.conflictSlug}" (${canibalTema.shared.join(', ')}). Próximo da fila.`);
        forbiddenThemes.push(cand.problem);
        continue;
      }

      console.log(`📝 Problema: ${cand.problem}`);
      console.log(`🔧 Feature: ${cand.feature}`);

      // Uma resposta malformada da IA não pode custar a semana inteira: cai
      // para o próximo cenário da fila em vez de derrubar a corrida.
      let candDraft = null;
      try {
        candDraft = await generateDraft(cand, rejectedTitles);
      } catch (e) {
        console.log(`⚠️ Tentativa ${attempt}/${MAX_ATTEMPTS} falhou ao escrever ("${e.message}"). Próximo da fila.`);
      }
      if (!candDraft) { forbiddenThemes.push(cand.problem); continue; }

      // Trava 2 (a que faltava): o TÍTULO já está coberto? Mesma função que o
      // validador usa para bloquear o push — medir aqui com régua diferente foi
      // exatamente o que deixou passar o post repetido.
      const canibalTitulo = isThemeCovered(candDraft.title, POSTS_DIR);
      if (canibalTitulo.covered) {
        console.log(`⚠️ Anti-canibalização ${attempt}/${MAX_ATTEMPTS} (título): "${candDraft.title}" conflita com "${canibalTitulo.conflictSlug}" (${canibalTitulo.shared.join(', ')}). Descartado ANTES das imagens; próximo da fila.`);
        forbiddenThemes.push(cand.problem);
        rejectedTitles.push(candDraft.title);
        continue;
      }

      topic = cand;
      draft = candDraft;
    }

    if (!draft) {
      console.log(`⚠️ Anti-canibalização: ${MAX_ATTEMPTS} cenários seguidos conflitaram com posts existentes. Abortando sem publicar.`);
      warnSkip(`soluções: ${forbiddenThemes[forbiddenThemes.length - 1] || 'nenhum cenário viável'}`, `${MAX_ATTEMPTS} cenários rejeitados pelo guard`);
      return;
    }

    const { title, meta, headline, keywords, content } = draft;

    // Merge topic keywords with AI-generated ones
    const allKeywords = [...new Set([...keywords, ...topic.keywords, config.app.name.toLowerCase(), config.content.niche.pt])];

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
      headline,
      keywords: allKeywords,
      content: processedContentPt,
      imagePath,
      locale: 'pt',
      today,
      translationKey: slugPt,
    });
    console.log(`📄 PT: ${ptPath}`);

    // Translate EN
    if (config.locales.includes('en')) {
      console.log('⏳ Aguardando 30s (rate limit)...');
      await new Promise(r => setTimeout(r, 30000));
      console.log('🌐 Traduzindo EN...');
      const enPost = await guardedTranslate(() => translatePost({ title, meta, headline, keywords: allKeywords, processedContent: processedContentPt }, 'en'), 'en', `${slugPt} (en)`);
      const ygEn = fixStaleYear(enPost.title);
      if (ygEn.changed) { console.log(`[year-guard] título corrigido: "${ygEn.original}" → "${ygEn.text}"`); enPost.title = ygEn.text; }
      savePost('en-' + createSlug(enPost.title), {
        title: enPost.title,
        meta: enPost.meta,
        headline: enPost.headline,
        keywords: enPost.keywords,
        content: enPost.content,
        imagePath,
        locale: 'en',
        today,
        translationKey: slugPt,
      });
      console.log('✅ EN salvo');
    }

    // Translate ES
    if (config.locales.includes('es')) {
      console.log('⏳ Aguardando 30s (rate limit)...');
      await new Promise(r => setTimeout(r, 30000));
      console.log('🌐 Traduzindo ES...');
      const esPost = await guardedTranslate(() => translatePost({ title, meta, headline, keywords: allKeywords, processedContent: processedContentPt }, 'es'), 'es', `${slugPt} (es)`);
      const ygEs = fixStaleYear(esPost.title);
      if (ygEs.changed) { console.log(`[year-guard] título corrigido: "${ygEs.original}" → "${ygEs.text}"`); esPost.title = ygEs.text; }
      savePost('es-' + createSlug(esPost.title), {
        title: esPost.title,
        meta: esPost.meta,
        headline: esPost.headline,
        keywords: esPost.keywords,
        content: esPost.content,
        imagePath,
        locale: 'es',
        today,
        translationKey: slugPt,
      });
      console.log('✅ ES salvo');
    }

    // Commit por whitelist (push fica com o workflow).
    console.log('📦 Fazendo commit...');
    execSync('git add src/content/posts public/images/posts', { stdio: 'inherit' });
    const safeTitle = title.substring(0, 50).replace(/"/g, '\\"').replace(/`/g, '');
    execSync(`git -c commit.gpgsign=false commit -m "feat: post solução ${config.app.name} — ${safeTitle}"`, { stdio: 'inherit' });
    console.log('🎉 Post gerado com sucesso (push fica com o workflow).');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

main();
