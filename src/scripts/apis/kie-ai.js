/**
 * Groq API Wrapper + AI Image Generation (Multi-Provider)
 * Handles text generation for blog posts and AI-generated cover images
 * Image providers: Together.ai → SiliconFlow → SVG fallback
 */

import { generateCoverImage, generateCoverImageSync, generateInlineImage } from './image-router.js';
import { saveSVGImage } from './svg-generator.js';
import { config } from '../../../site.config.ts';
import { FACT_GUARD_PROMPT } from '../lib/fact-guard.js';

// Provedores de geração de texto (todos compatíveis com a API OpenAI), em
// ordem de prioridade/fallback. Cada um se auto-habilita conforme as
// credenciais presentes no ambiente. Ver getTextProviders() abaixo.

// Re-export image functions for backward compatibility
export { generateCoverImage, generateCoverImageSync, generateInlineImage };

/**
 * Retorna a lista ordenada de provedores de texto habilitados.
 * Ordem = prioridade de fallback: Cerebras → Groq → Cloudflare.
 * Um provedor só entra na lista se suas credenciais existirem — assim,
 * adicionar/remover um secret ativa/desativa o provedor sem mudar código.
 */
function getTextProviders() {
  const providers = [];

  // 1. Cerebras — gpt-oss-120b, 1M tokens/dia e 60K TPM (requer CEREBRAS_API_KEY)
  //    (llama-3.3-70b saiu do endpoint gratuito padrão — retornava 404)
  if (process.env.CEREBRAS_API_KEY) {
    providers.push({
      name: 'cerebras',
      url: 'https://api.cerebras.ai/v1/chat/completions',
      apiKey: process.env.CEREBRAS_API_KEY,
      model: 'gpt-oss-120b',
    });
  }

  // 2. Groq — substituto oficial do llama-3.3-70b (desligado em 16/08/2026)
  const groqKey = process.env.GROQ_API_KEY || process.env.KIE_API_KEY;
  if (groqKey) {
    providers.push({
      name: 'groq',
      url: 'https://api.groq.com/openai/v1/chat/completions',
      apiKey: groqKey,
      model: 'openai/gpt-oss-120b',
    });
  }

  // 3. Cloudflare Workers AI — rede de segurança (credenciais já existentes)
  if (process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_AI_TOKEN) {
    providers.push({
      name: 'cloudflare',
      url: `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/v1/chat/completions`,
      apiKey: process.env.CLOUDFLARE_AI_TOKEN,
      model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
    });
  }

  return providers;
}

/**
 * Gera texto com roteamento entre múltiplos provedores (API compatível OpenAI).
 * Tenta cada provedor na ordem; em rate limit (429) faz backoff curto e retenta
 * o mesmo; em erro/queda ou 429 esgotado, cai para o próximo provedor. Só lança
 * exceção se TODOS falharem. Mesma assinatura/retorno de antes (string).
 */
export async function generateText(prompt, options = {}) {
  const {
    maxTokens = 4000,
    temperature = 0.7,
    model,             // override opcional — aplicado apenas ao provedor primário
    retries = 2,       // tentativas por provedor em caso de 429
  } = options;

  const providers = getTextProviders();
  if (providers.length === 0) {
    throw new Error('Nenhum provedor de IA configurado (defina CEREBRAS_API_KEY, GROQ_API_KEY/KIE_API_KEY ou CLOUDFLARE_ACCOUNT_ID+CLOUDFLARE_AI_TOKEN).');
  }

  const errors = [];

  for (let p = 0; p < providers.length; p++) {
    const provider = providers[p];
    const useModel = (p === 0 && model) ? model : provider.model;

    for (let attempt = 1; attempt <= retries; attempt++) {
      let response;
      try {
        response = await fetch(provider.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${provider.apiKey}`,
          },
          body: JSON.stringify({
            model: useModel,
            messages: [
              { role: 'system', content: config.ai.personality },
              { role: 'user', content: prompt },
            ],
            max_tokens: maxTokens,
            temperature,
          }),
        });
      } catch (err) {
        errors.push(`${provider.name}: erro de rede (${err.message})`);
        console.log(`⚠️ ${provider.name}: erro de rede — tentando próximo provedor...`);
        break; // queda de rede → próximo provedor
      }

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        if (content) {
          const via = p > 0 ? ` (fallback #${p})` : ' (primário)';
          console.log(`🤖 Texto gerado via ${provider.name} — ${useModel}${via}`);
          return content;
        }
        errors.push(`${provider.name}: resposta vazia`);
        break; // resposta vazia → próximo provedor
      }

      if (response.status === 429 && attempt < retries) {
        const wait = Math.ceil(20 * attempt);
        console.log(`⏳ ${provider.name}: rate limit (429). Aguardando ${wait}s (tentativa ${attempt}/${retries})...`);
        await new Promise(r => setTimeout(r, wait * 1000));
        continue; // retenta o MESMO provedor
      }

      const errText = await response.text().catch(() => '');
      errors.push(`${provider.name}: HTTP ${response.status} ${errText.slice(0, 200)}`);
      console.log(`⚠️ ${provider.name} falhou (HTTP ${response.status}) — tentando próximo provedor...`);
      break; // erro não-recuperável nesse provedor → próximo
    }
  }

  throw new Error(`Todos os provedores de IA falharam:\n- ${errors.join('\n- ')}`);
}

/**
 * Generate a complete blog post (text + cover image)
 */
export async function generateBlogPost(topic, options = {}) {
  const {
    category = 'dicas',
    keywords = [],
    avoidThemes = '',   // bloco anti-canibalização opcional (temas já cobertos)
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
${avoidThemes}
${FACT_GUARD_PROMPT}
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
- Inclua 1-2 links externos para fontes autoritativas relevantes ao tema (ex: Banco Central do Brasil https://www.bcb.gov.br, Tesouro Direto https://www.tesourodireto.com.br, IBGE https://www.ibge.gov.br, Serasa https://www.serasa.com.br, Investopedia https://www.investopedia.com). Use formato markdown [texto](url). Escolha fontes reais e URLs que existam.
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
