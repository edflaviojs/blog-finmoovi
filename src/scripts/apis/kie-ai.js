/**
 * Kie.AI API Wrapper
 * Handles text generation and image generation for blog posts
 */

const KIE_API_BASE = 'https://api.kie.ai/v1';
const KIE_API_KEY = process.env.KIE_API_KEY;

if (!KIE_API_KEY) {
  throw new Error('KIE_API_KEY environment variable is required');
}

/**
 * Generate text content using Kie.AI
 */
export async function generateText(prompt, options = {}) {
  const {
    maxTokens = 4000,
    temperature = 0.7,
    model = 'default'
  } = options;

  const response = await fetch(`${KIE_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${KIE_API_KEY}`,
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
    throw new Error(`Kie.AI text generation failed: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || data.content || data.text || '';
}

/**
 * Generate an image using Kie.AI
 */
export async function generateImage(prompt, options = {}) {
  const {
    width = 1200,
    height = 630,
    style = 'digital-art'
  } = options;

  const response = await fetch(`${KIE_API_BASE}/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${KIE_API_KEY}`,
    },
    body: JSON.stringify({
      prompt: `${prompt}. Style: modern, dark theme with blue and purple accents, professional financial illustration, minimalist, clean design`,
      size: `${width}x${height}`,
      style,
      n: 1,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Kie.AI image generation failed: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.data?.[0]?.url || data.url || data.image_url || '';
}

/**
 * Generate a complete blog post (text + image)
 */
export async function generateBlogPost(topic, options = {}) {
  const {
    category = 'dicas',
    keywords = [],
    includeImage = true
  } = options;

  // Generate the post content
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

  // Parse the result
  const parsed = parsePostContent(textResult);

  // Generate cover image
  let imageUrl = '';
  if (includeImage) {
    try {
      imageUrl = await generateImage(
        `Blog cover image about ${topic}, financial education, money management`,
        { width: 1200, height: 630 }
      );
    } catch (err) {
      console.warn('Image generation failed, continuing without image:', err.message);
    }
  }

  return {
    ...parsed,
    category,
    image: imageUrl,
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

  // Fallback: if structured format wasn't followed, use the whole text
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
  generateImage,
  generateBlogPost,
  generateTitleVariations,
};
