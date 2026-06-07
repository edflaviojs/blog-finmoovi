/**
 * Groq API Wrapper + AI Image Generation (Multi-Provider)
 * Handles text generation for blog posts and AI-generated cover images
 * Image providers: Together.ai → SiliconFlow → SVG fallback
 */

import { generateCoverImage, generateCoverImageSync, generateInlineImage } from './image-router.js';
import { saveSVGImage } from './svg-generator.js';
import { config } from '../../../site.config.ts';

const GROQ_API_BASE = 'https://api.groq.com/openai/v1';
const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.KIE_API_KEY;

if (!GROQ_API_KEY) {
  console.warn('⚠️ GROQ_API_KEY not configured - text generation will fail');
}

// Re-export image functions for backward compatibility
export { generateCoverImage, generateCoverImageSync, generateInlineImage };

/**
 * Generate text content using Groq (with retry on rate limit)
 */
export async function generateText(prompt, options = {}) {
  const {
    maxTokens = 4000,
    temperature = 0.7,
    model = 'llama-3.3-70b-versatile',
    retries = 3,
  } = options;

  for (let attempt = 1; attempt <= retries; attempt++) {
    const response = await fetch(`${GROQ_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: `Você é um redator experiente de finanças pessoais que escreve para brasileiros comuns. Seu estilo é direto, prático e conversacional — como se estivesse explicando para um amigo. Nunca use estruturas genéricas de IA como "Introdução", "Conclusão", "Neste artigo vamos explorar". Nunca comece com "Você já se perguntou" ou "No mundo atual". Vá direto ao ponto. Use exemplos reais com valores em Reais. Escreva como um blog de verdade, não como um artigo acadêmico.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: maxTokens,
        temperature,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.choices?.[0]?.message?.content || '';
    }

    if (response.status === 429 && attempt < retries) {
      const retryAfter = Math.ceil(30 * attempt);
      console.log(`⏳ Rate limit atingido. Aguardando ${retryAfter}s antes de tentar novamente (tentativa ${attempt}/${retries})...`);
      await new Promise(r => setTimeout(r, retryAfter * 1000));
      continue;
    }

    const error = await response.text();
    throw new Error(`Groq text generation failed (HTTP ${response.status}): ${error}`);
  }
}

/**
 * Generate a complete blog post (text + cover image)
 */
export async function generateBlogPost(topic, options = {}) {
  const {
    category = 'dicas',
    keywords = [],
  } = options;

  const ctaVariations = [
    `Quer colocar isso em prática? [Teste o ${config.app.name} grátis por 7 dias](${config.app.url}) e veja como é fácil controlar suas finanças com categorização automática e relatórios visuais.`,
    `Pronto para organizar suas finanças? [Experimente o ${config.app.name} grátis](${config.app.url}) — em 5 minutos você já tem uma visão clara de para onde vai seu dinheiro.`,
    `Quer sair da teoria? [Baixe o ${config.app.name} grátis por 7 dias](${config.app.url}) e comece a registrar seus gastos hoje. Sem cartão, sem compromisso.`,
    `Cansado de planilha? [Teste o ${config.app.name} grátis](${config.app.url}) e controle seus gastos com IA, multi-moeda e relatórios que fazem sentido.`,
    `Quer ver isso funcionando na prática? [Comece grátis com o ${config.app.name}](${config.app.url}) — 7 dias para organizar suas finanças sem complicação.`,
    `O próximo passo é seu. [Teste o ${config.app.name} grátis por 7 dias](${config.app.url}) e descubra para onde seu dinheiro está indo de verdade.`,
  ];

  const ctaIndex = Math.floor(Math.random() * ctaVariations.length);
  const selectedCta = ctaVariations[ctaIndex];

  const textPrompt = `
Escreva um artigo de blog sobre: "${topic}"

REGRAS DE ESTILO (obrigatórias):
- NÃO use "Introdução" ou "Conclusão" como títulos de seção
- NÃO comece com frases genéricas tipo "Você já se perguntou", "No cenário atual", "Neste artigo"
- Comece direto com o conteúdo, como se estivesse no meio de uma conversa
- Use tom conversacional mas informativo — como um amigo que entende de finanças
- Inclua pelo menos uma "Dica prática" destacada com negrito (ex: **Dica prática:** ...)
- Use exemplos com valores reais em R$ (salários de R$3.000 a R$8.000, gastos do dia a dia)
- Pode usar listas, mas não abuse — alterne com parágrafos densos
- Headers H2 devem ser frases curtas e diretas, não perguntas genéricas
- O último H2 deve ser "Comece hoje" com um parágrafo motivacional curto e direto
- Após o último parágrafo, inclua esta CTA exata (com a linha horizontal antes):

---

**${selectedCta}**

ESTRUTURA:
- Título SEO (50-60 caracteres, keyword no início)
- Meta descrição (150-160 caracteres)
- Conteúdo com 800-1200 palavras, 4-6 seções com H2
- Keywords para SEO: ${keywords.join(', ')}

Formato de saída (use exatamente este formato):
---TITULO---
[título aqui]
---META---
[meta descrição aqui]
---KEYWORDS---
[keyword1, keyword2, keyword3]
---CONTEUDO---
[conteúdo em markdown aqui]
`;

  const textResult = await generateText(textPrompt, { maxTokens: 4000, temperature: 0.7 });

  const parsed = parsePostContent(textResult);

  // No longer generate images here — caller handles SVG generation
  // after knowing the slug

  return {
    ...parsed,
    category,
  };
}

/**
 * Parse the structured post content from AI response
 */
function parsePostContent(text) {
  const sections = {
    title: '',
    meta: '',
    keywords: [],
    content: '',
  };

  const titleMatch = text.match(/---TITULO---\s*([\s\S]*?)(?=---META---|$)/);
  const metaMatch = text.match(/---META---\s*([\s\S]*?)(?=---KEYWORDS---|$)/);
  const keywordsMatch = text.match(/---KEYWORDS---\s*([\s\S]*?)(?=---CONTEUDO---|$)/);
  const contentMatch = text.match(/---CONTEUDO---\s*([\s\S]*?)$/);

  if (titleMatch) sections.title = titleMatch[1].trim();
  if (metaMatch) sections.meta = metaMatch[1].trim();
  if (keywordsMatch) sections.keywords = keywordsMatch[1].trim().split(',').map(k => k.trim());
  if (contentMatch) sections.content = contentMatch[1].trim();

  if (!sections.title && !sections.content) {
    const lines = text.split('\n').filter(l => l.trim());
    sections.title = lines[0]?.replace(/^#\s*/, '') || 'Post sem título';
    sections.content = text;
    sections.meta = text.substring(0, 155);
  }

  return sections;
}

/**
 * Generate SEO-optimized title variations
 */
export async function generateTitleVariations(topic, count = 5) {
  const prompt = `
Gere ${count} variações de títulos SEO para um artigo sobre: "${topic}"

Requisitos:
- 50-60 caracteres cada
- Keyword principal no início
- Use números quando possível
- Inclua power words (guia, completo, definitivo, simples, prático)
- Um título com colchetes [2025] ou [Guia Completo]

Formato: um título por linha, sem numeração.
`;

  const result = await generateText(prompt, { maxTokens: 500, temperature: 0.8 });
  return result.split('\n').filter(line => line.trim().length > 10).slice(0, count);
}

export default {
  generateText,
  generateBlogPost,
  generateTitleVariations,
};
