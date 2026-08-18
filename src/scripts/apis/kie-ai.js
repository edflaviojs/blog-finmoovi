/**
 * Groq API Wrapper + AI Image Generation (Multi-Provider)
 * Handles text generation for blog posts and AI-generated cover images
 * Image providers: Together.ai → SiliconFlow → SVG fallback
 */

import { generateCoverImage, generateCoverImageSync, generateInlineImage } from './image-router.js';
import { saveSVGImage } from './svg-generator.js';
import { config } from '../../../site.config.ts';
import { FACT_GUARD_PROMPT } from '../lib/fact-guard.js';
import { CURRENT_YEAR } from '../lib/year-guard.js';
import { postCoreRules, seedKeywordRules } from '../lib/prompt-post.js';

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
      tpmLimit: 60000,
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
      tpmLimit: 8000,
    });
  }

  // 3. Cloudflare Workers AI — rede de segurança (credenciais já existentes)
  //    sem tpmLimit: o teto do Cloudflare é neurons/dia, não tokens por requisição.
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
 * O PROVEDOR PAGO — kie.ai, e só para quem PEDIR (02/08/2026).
 *
 * ⚠️ ISTO É OPT-IN, E A RAZÃO É DINHEIRO. Esta mesma `generateText` serve os 27 robôs
 * do blog. Se o pago entrasse por omissão, **todos os posts do blog passavam a ser
 * pagos** — e um post é ~10× maior que um vídeo. Só quem passar `pago:` o usa; hoje
 * são dois sítios, ambos do vídeo curto: o escritor e o segundo leitor.
 *
 * ⚠️ A CHAVE CHAMA-SE `KIE_AI_KEY` E NÃO `KIE_API_KEY`. A segunda já existe em ~25
 * workflows deste repositório e aponta para o **Groq** (ver `getTextProviders`).
 * Reaproveitar o nome mandaria a chave do kie.ai para a porta do Groq.
 *
 * QUEM FAZ O QUÊ, e é decisão medida em 02/08 (IMPLEMENTACAO20 §25.6), não gosto:
 *  · ESCRITOR = gpt-5-2. Num duelo de 5 rondas contra 3, o Sonnet foi reprovado
 *    SEMPRE por tamanho (187, 181, 176, 159 e 152 palavras, com o limite em 140);
 *    o GPT saiu com 140 e 137. O escritor tem de caber no número.
 *  · LEITOR = claude-sonnet-5. Ele não tem número para cumprir (só pode crescer 5%),
 *    é ele que julga o tom, e se a versão dele partir uma trava fica o original.
 *
 * As duas famílias falam LÍNGUAS diferentes (o kie revende cada uma ao dono original),
 * daí o campo `formato`. A chave é a mesma para as duas.
 */
/**
 * ♦ O LEITOR GANHOU SUBSTITUTOS (03/08/2026, ordem do dono) — e a causa foi vivida
 * no próprio dia: o claude-sonnet-5 do kie.ai ficou AVARIADO (HTTP 500 em 16+
 * pedidos, duas verificações com horas de intervalo) e as duas gerações do dia
 * saíram SEM polimento, porque a rede por baixo era só o Groq gratuito (que no
 * ambiente local nem chave válida tem). Num dia de avaria, o robô diário
 * publicaria texto áspero sem ninguém saber.
 *
 * A fila do leitor: claude-sonnet-5 → gemini-3-pro → gpt-5-2.
 *  · O Gemini vem ANTES do GPT de propósito: o escritor É o gpt-5-2, e quem relê
 *    não deve ser da família de quem escreveu (o aluno a corrigir a própria
 *    prova). O Gemini mantém o olhar independente e ainda é mais barato que o
 *    Sonnet (0,38 vs 0,72 cêntimos por leitura).
 *  · O GPT fica como último recurso pago: reler com o mesmo modelo ainda é melhor
 *    do que publicar sem releitura.
 * O ESCRITOR continua um só (gpt-5-2, decisão medida em §25.6 — o Sonnet estourava
 * o tamanho 5 vezes em 5); a rede gratuita continua por baixo, como sempre.
 */
function provedoresPagos(papel) {
  const chave = process.env.KIE_AI_KEY;
  if (!chave || !papel) return [];
  if (papel === 'leitor') {
    return [
      {
        name: 'kie/claude-sonnet-5',
        url: 'https://api.kie.ai/claude/v1/messages',
        apiKey: chave,
        model: 'claude-sonnet-5',
        formato: 'anthropic',
        insistir: 8,
      },
      {
        name: 'kie/gemini-3-pro',
        url: 'https://api.kie.ai/gemini-3-pro/v1/chat/completions',
        apiKey: chave,
        model: 'gemini-3-pro',
        formato: 'openai',
        insistir: 8,
      },
      {
        name: 'kie/gpt-5-2',
        url: 'https://api.kie.ai/gpt-5-2/v1/chat/completions',
        apiKey: chave,
        model: 'gpt-5-2',
        formato: 'openai',
        insistir: 8,
      },
    ];
  }
  return [{
    name: 'kie/gpt-5-2',
    url: 'https://api.kie.ai/gpt-5-2/v1/chat/completions',
    apiKey: chave,
    model: 'gpt-5-2',
    formato: 'openai',
    insistir: 8,
  }];
}

/**
 * Provedores que já recusaram por CONTA/CHAVE nesta corrida. Vive no módulo de
 * propósito: vale para todas as chamadas do mesmo processo, e morre com ele —
 * a corrida seguinte volta a experimentar (a conta pode ter sido paga).
 */
const contasFechadas = new Set();

/**
 * O provedor recusou por conta/chave, e não por avaria ou excesso de pedidos?
 *   401 chave inválida · 402 sem créditos · 403 sem permissão
 * Nenhum destes muda de resposta por se tentar outra vez a seguir.
 * 429 (limite de taxa) e 5xx (avaria) ficam DE FORA: esses passam.
 */
function contaFechada(status) {
  return status === 401 || status === 402 || status === 403;
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
    pago = null,       // 'escritor' | 'leitor' — opt-in dos modelos pagos (ver provedoresPagos)
  } = options;

  const providers = getTextProviders();
  // Os pagos entram à FRENTE (na ordem da fila), e os gratuitos ficam como rede
  // por baixo: se todos falharem, o vídeo sai à mesma com um gratuito.
  const pagos = provedoresPagos(pago);
  if (pagos.length) providers.unshift(...pagos);
  const oPago = pagos.length > 0;
  if (providers.length === 0) {
    throw new Error('Nenhum provedor de IA configurado (defina CEREBRAS_API_KEY, GROQ_API_KEY/KIE_API_KEY ou CLOUDFLARE_ACCOUNT_ID+CLOUDFLARE_AI_TOKEN).');
  }

  const errors = [];

  for (let p = 0; p < providers.length; p++) {
    const provider = providers[p];

    // Provedor que já disse "a tua conta não paga isto" nesta mesma corrida não
    // é tentado outra vez. 401/402/403 não muda de resposta em cinco minutos —
    // muda quando o dono acerta a conta ou a chave, e isso não acontece a meio
    // de uma corrida. Medido em 18/08/2026: o Cerebras devolveu HTTP 402 em
    // TODAS as chamadas de todas as corridas, uma por cada texto gerado, só
    // para cair no Groq a seguir. Ver contaFechada() mais abaixo.
    if (contasFechadas.has(provider.name)) {
      errors.push(`${provider.name}: pulado — já recusou por conta/chave nesta corrida`);
      console.log(`⏭️ ${provider.name}: pulado — já recusou por conta/chave nesta corrida.`);
      continue;
    }
    // o override de modelo continua a valer só para o primário GRATUITO — com o pago
    // à frente, `p === 0` deixaria de ser quem o chamador julga que é.
    const useModel = (p === 0 && model && !oPago) ? model : provider.model;
    /**
     * ⚠️ INSISTIR MUITO NO PAGO, e é medição: em 16 pedidos iguais ao kie.ai, 15
     * falharam com HTTP 500 ("Network error") — avaria do lado deles, nunca um 429 de
     * limite de taxa. E **as falhas NÃO consomem créditos** (medido: 15 falhas = 0).
     * Logo insistir custa tempo e não dinheiro. Sem isto, o vídeo caía no gratuito
     * quase sempre e o pago não servia para nada.
     */
    const maxTentativas = provider.insistir || retries;

    // Orçamento por requisição: provedores com tier de tokens-por-minuto contam
    // prompt + max_tokens contra o MESMO teto. Estimar antes evita queimar uma
    // chamada (e um 413 opaco) num provedor que comprovadamente não cabe.
    // O divisor 8 é deliberadamente generoso: os prompts REAIS deste projeto
    // comprimem a ~3,3 chars/token (medido pelo 413 do Groq em 26/07 — 21.362
    // chars de prompt = 6.408 tokens), então /8 SUBestima com folga e nunca
    // pula um provedor que caberia. O preço é o inverso: pode deixar passar
    // uma chamada que estoura de verdade — mas aí o 413 cai no tratamento de
    // erro logo abaixo e segue pro próximo provedor, como já era antes.
    if (provider.tpmLimit) {
      const estPrompt = Math.ceil((config.ai.personality.length + prompt.length) / 8);
      const estRequest = estPrompt + maxTokens;
      if (estRequest > provider.tpmLimit) {
        errors.push(`${provider.name}: pulado — request ~${estRequest} tok excede o teto de ${provider.tpmLimit} tok`);
        console.log(`⏭️ ${provider.name}: pulado — request ~${estRequest} tok > teto ${provider.tpmLimit} tok do plano`);
        continue;
      }
    }

    for (let attempt = 1; attempt <= maxTentativas; attempt++) {
      let response;
      try {
        // Cada família fala a sua língua. A do Claude no kie.ai exige `max_tokens`,
        // `stream:false` e `thinkingFlag:false`, e leva o sistema num campo próprio.
        const corpo = provider.formato === 'anthropic'
          ? {
            model: useModel,
            system: config.ai.personality,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: maxTokens,
            temperature,
            thinkingFlag: false,
            stream: false,
          }
          : {
            model: useModel,
            messages: [
              { role: 'system', content: config.ai.personality },
              { role: 'user', content: prompt },
            ],
            max_tokens: maxTokens,
            temperature,
          };
        response = await fetch(provider.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${provider.apiKey}`,
          },
          body: JSON.stringify(corpo),
        });
      } catch (err) {
        errors.push(`${provider.name}: erro de rede (${err.message})`);
        console.log(`⚠️ ${provider.name}: erro de rede — tentando próximo provedor...`);
        break; // queda de rede → próximo provedor
      }

      if (response.ok) {
        const data = await response.json();
        // ⚠️ O kie.ai devolve HTTP 200 com um corpo de erro quando a chave é inválida
        // (medido: `{"code":401,...}` com estado 200). Sem esta linha, uma chave errada
        // parecia "resposta vazia" e caía em silêncio para o gratuito — a conta certa
        // seria descobrir isso semanas depois, a olhar para vídeos piores.
        if (provider.formato === 'anthropic' && data.code && Number(data.code) !== 200) {
          errors.push(`${provider.name}: ${data.msg || `código ${data.code}`}`);
          console.log(`⚠️ ${provider.name} recusou (${data.msg || data.code}) — tentando próximo provedor...`);
          break;
        }
        const content = provider.formato === 'anthropic'
          ? (data.content || []).filter((c) => c && c.type === 'text').map((c) => c.text).join('')
          : (data.choices?.[0]?.message?.content || '');
        if (content) {
          const via = p > 0 ? ` (fallback #${p})` : ' (primário)';
          console.log(`🤖 Texto gerado via ${provider.name} — ${useModel}${via}`);
          return content;
        }
        errors.push(`${provider.name}: resposta vazia`);
        console.log(`⚠️ ${provider.name}: resposta vazia — tentando próximo provedor...`);
        break; // resposta vazia → próximo provedor
      }

      if (response.status === 429 && attempt < maxTentativas) {
        const wait = Math.ceil(20 * attempt);
        console.log(`⏳ ${provider.name}: rate limit (429). Aguardando ${wait}s (tentativa ${attempt}/${maxTentativas})...`);
        await new Promise(r => setTimeout(r, wait * 1000));
        continue; // retenta o MESMO provedor
      }
      // Avaria do fornecedor (5xx): retentar o MESMO, e depressa. Só para quem declara
      // `insistir` — ou seja, hoje só o pago. Nos gratuitos um 5xx continua a saltar
      // para o seguinte, que é o que sempre fez.
      if (provider.insistir && response.status >= 500 && attempt < maxTentativas) {
        console.log(`🔁 ${provider.name}: avaria do fornecedor (HTTP ${response.status}). Tentativa ${attempt}/${maxTentativas} — falhas não custam créditos.`);
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }

      const errText = await response.text().catch(() => '');
      errors.push(`${provider.name}: HTTP ${response.status} ${errText.slice(0, 200)}`);
      if (contaFechada(response.status)) {
        contasFechadas.add(provider.name);
        console.log(`⚠️ ${provider.name} recusou por conta/chave (HTTP ${response.status}) — não volta a ser tentado nesta corrida.`);
      } else {
        console.log(`⚠️ ${provider.name} falhou (HTTP ${response.status}) — tentando próximo provedor...`);
      }
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
    // Keyword CRUA da fila, quando o `topic` veio de lá. Nesse caso `topic` É a
    // semente de busca (ex.: "poupar dinheiro dicas") e, sem tratamento, o LLM
    // a cola literalmente no título. Ausente = tema do pool interno (já em
    // português natural), e a regra não é injetada.
    seedKeyword = '',
  } = options;

  const ctaVariations = [
    `Quer colocar isso em prática? [Teste o ${config.app.name} grátis por 7 dias](${config.app.url}) e veja como é fácil controlar suas finanças com categorização automática e relatórios visuais.`,
    `Pronto para organizar suas finanças? [Experimente o ${config.app.name} grátis por 7 dias](${config.app.url}) — em 5 minutos você já tem uma visão clara de para onde vai seu dinheiro.`,
    `Quer sair da teoria? [Baixe o ${config.app.name} grátis por 7 dias](${config.app.url}) e comece a registrar seus gastos hoje. Sem cartão, sem compromisso.`,
    `Cansado de planilha? [Teste o ${config.app.name} grátis por 7 dias](${config.app.url}) e controle seus gastos com IA, multi-moeda e relatórios que fazem sentido.`,
    `Quer ver isso funcionando na prática? [Comece grátis com o ${config.app.name}](${config.app.url}) — 7 dias para organizar suas finanças sem complicação.`,
    `O próximo passo é seu. [Teste o ${config.app.name} grátis por 7 dias](${config.app.url}) e descubra para onde seu dinheiro está indo de verdade.`,
  ];

  const ctaIndex = Math.floor(Math.random() * ctaVariations.length);
  const selectedCta = ctaVariations[ctaIndex];

  const textPrompt = `
${avoidThemes}
${FACT_GUARD_PROMPT}
Escreva um artigo de blog sobre: "${topic}"

${postCoreRules({ appName: config.app.name })}
${seedKeywordRules(seedKeyword)}

REGRAS DE FORMA (mantidas):
- NÃO use "Introdução" ou "Conclusão" como títulos de seção
- Inclua pelo menos uma "Dica prática" destacada com negrito (ex: **Dica prática:** ...)
- Pode usar listas, mas não abuse — alterne com parágrafos densos
- Headers H2 devem ser frases curtas e diretas, não perguntas genéricas
- O último H2 deve ser "Comece hoje" com um parágrafo motivacional curto e direto
- Depois de "Comece hoje", encerre com a seção "## Perguntas frequentes": 3-4 perguntas como H3 (###) com respostas diretas de 2-3 frases cada
- Inclua 1-2 links externos para fontes autoritativas UNIVERSAIS relevantes ao tema (ex: Investopedia https://www.investopedia.com, OECD https://www.oecd.org, World Bank https://www.worldbank.org). Use formato markdown [texto](url). Escolha fontes reais e URLs que existam.
- Após o último parágrafo, inclua esta CTA exata (com a linha horizontal antes):

---

**${selectedCta}**

ESTRUTURA:
- Título SEO (50-60 caracteres${seedKeyword ? ' — o título NÃO pode COMEÇAR pela keyword-semente (ver a regra acima); reescreva-a em português natural' : ', keyword no início'}; se mencionar ano, use ${CURRENT_YEAR})
- Meta descrição (150-160 caracteres)
- Headline de ticker: chamada ultra curta (MÁXIMO 40 caracteres) estilo manchete que desperta curiosidade sem entregar a resposta (ex: "O erro que suga seu salário")
- Conteúdo com 800-1200 palavras, 4-6 seções com H2
- Keywords para SEO: ${keywords.join(', ')}

Formato de saída (use exatamente este formato):
---TITULO---
[título aqui — se mencionar ano, use ${CURRENT_YEAR}]
---META---
[meta descrição aqui]
---HEADLINE---
[headline de ticker, máximo 40 caracteres]
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
    headline: '',
    keywords: [],
    content: '',
  };

  const titleMatch = text.match(/---TITULO---\s*([\s\S]*?)(?=---META---|$)/);
  // lookahead para HEADLINE (novo bloco entre META e KEYWORDS); respostas
  // antigas sem o bloco caem no |$ e a headline fica '' (opcional)
  const metaMatch = text.match(/---META---\s*([\s\S]*?)(?=---HEADLINE---|---KEYWORDS---|$)/);
  const headlineMatch = text.match(/---HEADLINE---\s*([\s\S]*?)(?=---KEYWORDS---|$)/);
  const keywordsMatch = text.match(/---KEYWORDS---\s*([\s\S]*?)(?=---CONTEUDO---|$)/);
  const contentMatch = text.match(/---CONTEUDO---\s*([\s\S]*?)$/);

  if (titleMatch) sections.title = titleMatch[1].trim();
  if (metaMatch) sections.meta = metaMatch[1].trim();
  if (headlineMatch) sections.headline = headlineMatch[1].trim().replace(/^["']|["']$/g, '').slice(0, 40);
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
