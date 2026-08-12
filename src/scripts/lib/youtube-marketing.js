/**
 * youtube-marketing.js — Marketing intelligence library for the FinMoovi YouTube channel.
 *
 * Pure functions, zero side effects, zero external dependencies.
 * Same pattern as translation-prompt.js — exported and consumed by content generators
 * (roteiro-short.js, upload-short.js, future longo/influencer generators).
 *
 * Exports 9 functions:
 *   1. getChannelPersona()        — channel identity, audience, pillars, voice
 *   2. getHookFormulas(type, opt)  — proven hook formulas with psychological triggers
 *   3. getTitlePatterns(type, loc) — CTR-optimized title patterns
 *   4. getCTAStrategies(type)      — CTA formulas by content type
 *   5. getRetentionTechniques()    — retention/pacing techniques
 *   6. getThumbnailRules(type)     — thumbnail design rules
 *   7. getNarrationStyle(type)     — TTS-friendly narration guidelines
 *   8. getVisualRules(type)        — motion graphics rules
 *   9. buildMarketingPromptBlock() — composes all above into compact LLM block
 *
 * @module youtube-marketing
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. Channel Persona
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the FinMoovi channel identity used by all content generators for tone consistency.
 * @returns {{ name: string, tagline: string, audience: object, pillars: Array, voice: object, positioning: string, competitors: Array }}
 */
export function getChannelPersona() {
  return {
    name: 'FinMoovi',
    tagline: 'Educação financeira acessível',
    audience: {
      primary: 'Brasileiros 22-40 anos, CLT ou autônomo, renda R$ 2k-10k/mês',
      painPoints: [
        'Não sabe pra onde vai o dinheiro',
        'Acha investimento complicado demais',
        'Já tentou planilha e desistiu',
        'Vergonha de falar de dinheiro',
      ],
      psychographics: 'Quer controle sem abrir mão de viver; prefere visual e prático a técnico',
    },
    pillars: [
      { id: 'controle', label: 'Controle de gastos', weight: 0.35 },
      { id: 'investimento', label: 'Investimento acessível', weight: 0.30 },
      { id: 'mindset', label: 'Mindset financeiro', weight: 0.20 },
      { id: 'ferramentas', label: 'Ferramentas práticas', weight: 0.15 },
    ],
    voice: {
      tone: 'Amigo que manja — informal, fluido, com gírias leves, NUNCA formal ou robótico',
      register: 'Coloquial brasileiro (sem regionalismos fortes)',
      pacing: 'Rápido porém claro — cada frase puxa a próxima',
      humor: 'Leve, pontual (metáfora engraçada, escorregão cômico) — nunca stand-up',
      forbidden: ['Fala meu povo', 'E aí galera', 'Bora lá', 'Sem mais delongas'],
    },
    positioning: 'O canal que MOSTRA (motion graphics + app real) em vez de só FALAR. Diferente de canais talking-head.',
    competitors: [
      { name: 'Me Poupe!', diff: 'Nós somos mais visual/tech, menos personalidade-centrismo' },
      { name: 'Primo Rico', diff: 'Nós focamos no básico acessível, não em trader/crypto' },
      { name: 'O Primo Rico', diff: 'Linguagem mais casual, sem guru de palco' },
      { name: 'Nath Finanças', diff: 'Mais ferramentas práticas, menos lifestyle' },
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Hook Formulas
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns proven hook formulas categorized by psychological trigger.
 * @param {'short'|'longo'|'influencer'} type - Content format
 * @param {{ locale?: string, category?: string, keyword?: string }} options
 * @returns {{ formulas: Array<{ id: string, trigger: string, template: string, example: string, why: string }>, rules: string }}
 */
export function getHookFormulas(type = 'short', options = {}) {
  const universal = [
    {
      id: 'curiosity-gap',
      trigger: 'curiosidade',
      template: '[Fato surpreendente sobre X]... e o motivo vai te [emoção].',
      example: 'R$ 500 por mês viram R$ 3,2 milhões... e o motivo é mais simples do que você pensa.',
      why: 'Open loop cognitivo — o cérebro PRECISA fechar a lacuna',
    },
    {
      id: 'contrarian',
      trigger: 'contrariedade',
      template: '[Crença comum sobre X] é mentira. O que ninguém te conta é...',
      example: 'Guardar dinheiro na poupança é "seguro"? Mentira. O que ninguém te conta é...',
      why: 'Violação de expectativa — ativa amígdala, scroll-stop imediato',
    },
    {
      id: 'stakes-personal',
      trigger: 'perda/dor',
      template: 'Se você [ação comum], está [perdendo/pagando/jogando fora] [valor concreto].',
      example: 'Se você deixa o cartão no rotativo, está pagando 15% de juros TODO MÊS.',
      why: 'Loss aversion — 2x mais forte que ganho equivalente (Kahneman)',
    },
    {
      id: 'social-proof-negative',
      trigger: 'prova social',
      template: '[X]% das pessoas [erro comum]. Você é uma delas?',
      example: '76% dos brasileiros não têm reserva de emergência. Você é um deles?',
      why: 'Identidade ameaçada + comparação social = engajamento',
    },
    {
      id: 'time-pressure',
      trigger: 'urgência',
      template: '[Ação] antes dos [marco temporal] muda tudo. Depois... [consequência].',
      example: 'Começar a investir antes dos 30 muda tudo. Depois... custa o triplo.',
      why: 'Deadline psicológico — ativa modo "agir agora"',
    },
    {
      id: 'absurd-contrast',
      trigger: 'contraste',
      template: '[Valor pequeno] viram [valor enorme] — sem [objeção comum].',
      example: 'R$ 1 por dia vira R$ 100 mil — sem ser rico, sem mágica.',
      why: 'Dissonância numérica — o cérebro calcula "impossível" e precisa resolver',
    },
  ];

  if (type === 'short') {
    return {
      formulas: universal,
      rules: `HOOK em ≤5s. Fórmula: [trigger emocional] + [keyword falada] + [open loop].
A frase de hook É a narração da cena 1 — curta, coloquial, com a keyword "${options.keyword || 'TERMO'}" nos primeiros 3 segundos.
PROIBIDO: definição, enrolação, "hoje vamos falar sobre", saudação.
OBRIGATÓRIO: um NÚMERO concreto ou DADO real do conteúdo de apoio.`,
    };
  }

  if (type === 'longo') {
    return {
      formulas: [...universal, {
        id: 'story-cold-open',
        trigger: 'narrativa',
        template: '[Situação real/relatable] → [turning point] → "e foi aí que..."',
        example: 'Eu ganhava R$ 3 mil e achava que investir era coisa de rico. Até que vi meu extrato e...',
        why: 'Story loop — narrativa pessoal + cliffhanger prende por minutos',
      }],
      rules: `HOOK em ≤30s. Pode usar micro-história. Deve criar um OPEN LOOP que só fecha no minuto 3+.
Mencione o BENEFÍCIO concreto que o viewer ganha ao assistir até o fim.`,
    };
  }

  return { formulas: universal, rules: '' };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Title Patterns
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns proven title copywriting patterns with psychological triggers.
 * @param {'short'|'longo'|'influencer'} type - Content format
 * @param {'pt'|'en'|'es'} locale - Target locale
 * @returns {{ patterns: Array<{ id: string, formula: string, example: string, ctrBoost: string }>, constraints: object }}
 */
export function getTitlePatterns(type = 'short', locale = 'pt') {
  const patterns = [
    {
      id: 'keyword-first-number',
      formula: '[Keyword]: [número surpreendente] em [tempo]',
      example: 'Juros Compostos: R$ 500 viram R$ 3,2 milhões em 30 anos',
      ctrBoost: 'Alto — keyword no início (SEO) + número concreto (curiosidade)',
    },
    {
      id: 'how-without-objection',
      formula: 'Como [resultado desejado] sem [objeção comum]',
      example: 'Como investir todo mês sem ser rico',
      ctrBoost: 'Alto — remove barreira psicológica principal',
    },
    {
      id: 'mistake-you-make',
      formula: '[N] erros de [keyword] que te custam [valor]',
      example: '3 erros de cartão de crédito que te custam R$ 500/mês',
      ctrBoost: 'Alto — loss aversion + número específico',
    },
    {
      id: 'in-n-seconds',
      formula: '[Keyword] explicado em [tempo curto]',
      example: 'Tesouro Direto explicado em 1 minuto',
      ctrBoost: 'Médio — promessa de rapidez (Shorts = micro-compromisso)',
    },
    {
      id: 'why-x-instead-of-y',
      formula: 'Por que [opção A] e não [opção B] (a resposta [emoção])',
      example: 'Por que CDB e não poupança (a resposta assusta)',
      ctrBoost: 'Alto — comparação + emotion teaser',
    },
    {
      id: 'nobody-told-you',
      formula: 'O que ninguém te conta sobre [keyword]',
      example: 'O que ninguém te conta sobre financiamento imobiliário',
      ctrBoost: 'Médio-alto — exclusividade + curiosity gap',
    },
  ];

  const constraints = type === 'short'
    ? { maxChars: 90, keywordPosition: 'start', emojis: false, allCaps: false }
    : { maxChars: 70, keywordPosition: 'first-half', emojis: true, allCaps: false };

  return { patterns, constraints };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. CTA Strategies
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns CTA formulas by content type (when to push app vs blog vs subscribe).
 * @param {'short'|'longo'|'influencer'} contentType - Content format
 * @returns {{ strategies: Array<{ id: string, when: string, script: string, target: string, placement: string }> }}
 */
export function getCTAStrategies(contentType = 'short') {
  if (contentType === 'short') {
    return {
      strategies: [
        {
          id: 'tool-bridge',
          when: 'O tema tem uma calculadora/ferramenta no blog',
          script: 'Quer ver isso funcionando na prática? Link na bio — calculadora grátis.',
          target: 'blog',
          placement: 'Penúltima cena (slot "cta"), com shot "app" type="calculadora"',
        },
        {
          id: 'app-demo',
          when: 'O tema envolve controle/acompanhamento (gastos, saldo, fatura)',
          script: 'Quer controlar isso no automático? FinMoovi, 7 dias grátis — link na bio.',
          target: 'app',
          placement: 'Penúltima cena, com shot "app" mostrando a tela relevante',
        },
        {
          id: 'next-video-hook',
          when: 'Sempre (outro/última cena — open loop)',
          script: '[Reflexão forte] + [gancho do próximo vídeo]',
          target: 'engagement',
          placement: 'Última cena (slot "outro") — SEM "tchau/obrigado"',
        },
      ],
    };
  }

  if (contentType === 'longo') {
    return {
      strategies: [
        {
          id: 'mid-roll-soft',
          when: 'Após entregar valor concreto (min 3-4)',
          script: 'Se você tá gostando, se inscreve — 70% de quem assiste não é inscrito.',
          target: 'subscribe',
          placement: 'Após pico de valor, antes de aprofundar',
        },
        {
          id: 'end-card-tool',
          when: 'Sempre (encerramento)',
          script: 'Pra botar isso em prática: [ferramenta] grátis, link na descrição.',
          target: 'blog|app',
          placement: 'Últimos 20s + end screen card',
        },
      ],
    };
  }

  return { strategies: [] };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Retention Techniques
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns retention/pacing techniques for keeping viewers watching.
 * @returns {{ techniques: Array<{ id: string, name: string, description: string, example: string, applicableTo: string[] }> }}
 */
export function getRetentionTechniques() {
  return {
    techniques: [
      {
        id: 'pattern-interrupt',
        name: 'Pattern interrupt a cada 3s',
        description: 'Mudança visual a cada 2-3 segundos de narração — novo shot, novo ângulo, novo elemento',
        example: 'Âncoras espaçadas por ~8-10 palavras; nunca mais de 3s de visual estático',
        applicableTo: ['short', 'longo'],
      },
      {
        id: 'open-loops',
        name: 'Open loops encadeados',
        description: 'Cada cena termina com uma promessa que só fecha na próxima',
        example: '"...e é aí que entra o truque." (corta pra próxima cena)',
        applicableTo: ['short', 'longo', 'influencer'],
      },
      {
        id: 'number-anchoring',
        name: 'Ancoragem numérica progressiva',
        description: 'Apresentar números em escala crescente: pequeno → médio → impactante',
        example: 'R$ 1/dia → R$ 365/ano → R$ 100 mil em 20 anos',
        applicableTo: ['short', 'longo'],
      },
      {
        id: 'metaphor-payoff',
        name: 'Metáfora com payoff visual',
        description: 'Metáfora física narrada + animada em ≥2 shots (o "momento-história")',
        example: '"Que nem bola de neve..." → shot bola-neve → "...vira avalanche" → shot avalanche',
        applicableTo: ['short', 'longo'],
      },
      {
        id: 'curiosity-teaser',
        name: 'Teaser do resultado antes de explicar',
        description: 'Mostrar o RESULTADO primeiro (número choque), depois explicar como',
        example: 'Hook: "R$ 3,2 milhões" → Beats: "começou com R$ 500/mês"',
        applicableTo: ['short', 'longo', 'influencer'],
      },
      {
        id: 'identity-mirror',
        name: 'Espelho de identidade',
        description: 'Fazer o viewer se ver na situação — "se você faz X, então Y"',
        example: '"Se você ganha entre 3 e 8 mil reais... isso aqui é sobre você."',
        applicableTo: ['short', 'longo', 'influencer'],
      },
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Thumbnail Rules
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns thumbnail design rules for the FinMoovi channel.
 * @param {'short'|'longo'|'influencer'} type - Content format
 * @returns {{ rules: Array<{ id: string, rule: string, why: string }>, colorScheme: object, typography: object }}
 */
export function getThumbnailRules(type = 'short') {
  return {
    rules: [
      { id: 'contrast', rule: 'Fundo escuro (#0d1117 ou gradiente) + texto claro', why: 'Legibilidade no feed escuro do YouTube' },
      { id: 'max-3-words', rule: 'Máximo 3 palavras no texto overlay', why: 'Leitura em <1s no scroll' },
      { id: 'number-hero', rule: 'Se tiver número, ele é o MAIOR elemento visual', why: 'Números concretos = +37% CTR (VidIQ study)' },
      { id: 'face-emotion', rule: 'Se usar rosto: emoção exagerada (surpresa/choque)', why: 'Amígdala reconhece emoção em 13ms' },
      { id: 'brand-element', rule: 'Logo FinMoovi pequeno (canto inferior)', why: 'Reconhecimento de marca sem poluir' },
      { id: 'no-text-duplication', rule: 'Texto da thumbnail ≠ título (complementam, não repetem)', why: 'Dobra a informação visível no feed' },
    ],
    colorScheme: {
      background: ['#0d1117', '#161b22', 'gradiente #00F0FF→#A91079'],
      text: ['#FFFFFF', '#00F0FF', '#3fb950'],
      accent: ['#f85149', '#bc8cff'],
    },
    typography: {
      primary: 'Bold/Black, sans-serif, ~72-96pt equivalente',
      secondary: 'Medium, sans-serif, ~36pt equivalente',
      numbers: 'Extra-bold, destaque em cor accent (#00F0FF ou #3fb950)',
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Narration Style
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns narration/voice rules for TTS and script quality.
 * @param {'short'|'longo'|'influencer'} type - Content format
 * @returns {{ style: object, forbidden: string[], pacing: object }}
 */
export function getNarrationStyle(type = 'short') {
  return {
    style: {
      register: 'Conversa de amigo brasileiro — informal, fluido, gírias leves',
      punctuation: 'Vírgula/ponto = respiração da voz (TTS). Só pontuar onde faria pausa natural.',
      emphasis: 'Palavras-chave com ênfase natural (o TTS do Together/Edge respeita pontuação)',
      numbers: 'Primeira menção: unidade por extenso. Seguintes: só o número se contexto é claro.',
      referToContent: 'Sempre "vídeo", NUNCA "Short/Shorts" na fala (hashtag só nos metadados)',
    },
    forbidden: [
      'Fala formal/acadêmica ("destarte", "outrossim", "no que tange")',
      'Saudações genéricas ("E aí pessoal", "Fala galera")',
      'Despedidas ("Tchau", "Obrigado por assistir", "Até a próxima")',
      'Enrolação ("Hoje vamos falar sobre", "Sem mais delongas")',
      'Clickbait vazio sem payoff',
    ],
    pacing: type === 'short'
      ? { wordsPerSec: 3.0, targetDuration: '45-55s', maxSilenceMs: 500 }
      : { wordsPerSec: 2.5, targetDuration: '8-12min', maxSilenceMs: 1000 },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. Visual Rules
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns motion graphics / visual design rules for FinMoovi content.
 * @param {'short'|'longo'|'influencer'} type - Content format
 * @returns {{ rules: Array<{ id: string, rule: string, detail: string }>, colorPalette: object }}
 */
export function getVisualRules(type = 'short') {
  return {
    rules: [
      { id: 'dark-bg', rule: 'Fundo sempre escuro (#0d1117)', detail: 'Identidade Elite Hybrid — nunca fundo branco/claro' },
      { id: 'max-3s-static', rule: 'Nenhum visual parado >3s (exceto app shots ~4-5s)', detail: 'Ritmo constante = retenção' },
      { id: 'text-max-40', rule: 'Texto em tela ≤40 caracteres', detail: 'Legibilidade mobile vertical' },
      { id: 'numbers-as-digits', rule: 'Números SEMPRE em algarismos na tela', detail: 'R$ 50, 75%, 3x — nunca "cinquenta"' },
      { id: 'app-broll-min2', rule: 'Mínimo 2 shots "app" por Short', detail: 'B-roll do produto = prova de qualidade' },
      { id: 'app-screen-time', rule: 'Shot "app" segura ~4-5s', detail: 'Tempo suficiente pra viewer reconhecer a interface' },
      { id: 'metaphor-animated', rule: 'Metáforas são LITERALMENTE animadas', detail: 'bola-neve = bola ROLANDO, avalanche = neve CAINDO' },
      { id: 'no-stock-video', rule: 'Zero vídeo de estoque/filmagem', detail: 'Só motion graphics + telas do app' },
    ],
    colorPalette: {
      background: '#0d1117',
      surface: '#161b22',
      primary: '#58a6ff',
      secondary: '#bc8cff',
      accent: ['#00F0FF', '#A91079', '#3fb950', '#f85149'],
      text: '#FFFFFF',
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. Build Marketing Prompt Block (integration function)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds a compact marketing intelligence block for injection into LLM prompts.
 * Composes persona, hooks, retention, and narration into a single block.
 * @param {'short'|'longo'|'influencer'} type - Content format
 * @param {{ keyword?: string, category?: string, locale?: string, trends?: object }} options
 * @returns {string} Prompt block (compact for LLM prompt injection)
 */
export function buildMarketingPromptBlock(type = 'short', options = {}) {
  const hooks = getHookFormulas(type, options);
  const retention = getRetentionTechniques();
  const narration = getNarrationStyle(type);

  // Compact: only inject formula IDs + templates (not full examples) to save tokens
  const hookMenu = hooks.formulas.map(f => `• ${f.id}: ${f.template}`).join('\n');
  const trendHint = options.trends
    ? `\n🔥 TENDÊNCIA ATUAL: ${options.trends.topPattern || 'N/A'} (${options.trends.avgViews || '?'} views/dia médio no nicho)`
    : '';

  return `════════ INTELIGÊNCIA DE MARKETING (use como referência) ════════
FÓRMULAS DE HOOK (escolha UMA e adapte ao termo):
${hookMenu}
${hooks.rules}
${trendHint}

RETENÇÃO: ${retention.techniques.filter(t => t.applicableTo.includes(type)).map(t => t.name).join(' · ')}

NARRAÇÃO: ${narration.style.register}. ${narration.style.punctuation}`;
}
