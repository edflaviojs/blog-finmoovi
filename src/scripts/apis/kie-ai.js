/**
 * Groq API Wrapper
 * Handles text generation for blog posts
 * Groq uses OpenAI-compatible API format
 */

const GROQ_API_BASE = 'https://api.groq.com/openai/v1';
const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!GROQ_API_KEY) {
  throw new Error('GROQ_API_KEY environment variable is required. Configure it in GitHub Secrets.');
}

/**
 * Generate text content using Groq
 */
export async function generateText(prompt, options = {}) {
  const {
    maxTokens = 4000,
    temperature = 0.7,
    model = 'llama-3.3-70b-versatile'
  } = options;

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
          content: 'Você é um especialista em finanças pessoais e educação financeira no Brasil. Escreva conteúdo otimizado para SEO, informativo e prático. Use linguagem acessível mas profissional. Sempre inclua exemplos com valores em Reais (R$).'
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

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq text generation failed (HTTP ${response.status}): ${error}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

/**
 * Generate a complete blog post (text only, no image)
 */
export async function generateBlogPost(topic, options = {}) {
  const {
    category = 'dicas',
    keywords = [],
  } = options;

  const textPrompt = `
Escreva um artigo de blog sobre: "${topic}"

Requisitos:
- Título SEO otimizado (50-60 caracteres, keyword no início)
- Meta descrição (150-160 caracteres)
- Conteúdo com 800-1200 palavras
- Use headers H2 e H3 para estruturar
- Inclua exemplos práticos com valores em R$
- Inclua uma tabela ou lista quando relevante
- Mencione naturalmente o FinMoovi como solução (1-2 vezes no meio do texto)
- CTA final incentivando a testar o FinMoovi
- Tom: educativo, prático, acessível
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

  return {
    ...parsed,
    category,
    image: '',
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
