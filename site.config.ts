import type { SiteConfig } from './src/types/config';

/**
 * ═══════════════════════════════════════════════════════════════════════
 * SITE CONFIGURATION — Edite este arquivo para customizar o blog
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Este é o ÚNICO arquivo que você precisa editar para mudar a marca,
 * cores, nicho, domínio e comportamento de todo o blog.
 *
 * Após editar, rode: npm run generate
 * Isso atualiza todos os arquivos derivados (CSS, manifest, functions config).
 */

export const config: SiteConfig = {

  // ─── IDENTIDADE DO SITE ────────────────────────────────────────────
  siteName: 'FinMoovi Blog',
  siteUrl: 'https://blog.finmoovi.com',
  siteDescription: {
    pt: 'Dicas práticas de finanças pessoais, controle de gastos e educação financeira para organizar sua vida.',
    en: 'Practical personal finance tips, expense tracking and financial education to organize your life.',
    es: 'Consejos prácticos de finanzas personales, control de gastos y educación financiera para organizar tu vida.',
  },
  defaultLocale: 'pt',
  locales: ['pt', 'en', 'es'],

  // ─── MARCA ─────────────────────────────────────────────────────────
  brand: {
    name: 'FinMoovi',
    blogSuffix: 'Blog',
    tagline: {
      pt: 'Educação financeira acessível',
      en: 'Accessible financial education',
      es: 'Educación financiera accesible',
    },
    logo: {
      // Path SVG do ícone no header (chart line)
      svgPath: 'M12 44 L24 28 L34 38 L44 20 L52 28',
      gradientStart: '#00F0FF',
      gradientEnd: '#A91079',
    },
    colors: {
      primary: '#58a6ff',
      secondary: '#bc8cff',
      ctaGradientStart: '#00F0FF',
      ctaGradientEnd: '#A91079',
      accentGreen: '#3fb950',
      accentRed: '#f85149',
    },
    domains: {
      main: 'finmoovi.com',
      blog: 'blog.finmoovi.com',
      email: 'email.finmoovi.com',
      cfPages: 'blog-finmoovi.pages.dev',
    },
  },

  // ─── CONTEÚDO (NICHO) ──────────────────────────────────────────────
  content: {
    categories: ['dicas', 'orcamento', 'investimentos', 'cotacoes', 'ferramentas', 'glossario'] as const,
    glossaryCategories: ['basico', 'investimentos', 'credito', 'impostos', 'mercado'] as const,
    // Fonte ÚNICA das categorias exibidas no menu "Categorias" (header + mobile) e no
    // rodapé. Adicione uma categoria aqui e ela aparece automaticamente nos 3 lugares
    // (desde que já tenha ao menos 1 post publicado — evita link para página vazia/404).
    // UX: mantenha ~6-8 categorias no máximo. O dropdown do header rola se passar disso,
    // mas listas muito longas confundem — prefira curar as mais importantes aqui.
    categoryNav: [
      { slug: 'dicas', label: 'Dicas' },
      { slug: 'orcamento', label: 'Orçamento' },
      { slug: 'investimentos', label: 'Investimentos' },
      { slug: 'cotacoes', label: 'Cotações' },
    ],
    niche: {
      pt: 'finanças pessoais',
      en: 'personal finance',
      es: 'finanzas personales',
    },
    defaultAuthor: 'FinMoovi',
    defaultKeywords: {
      pt: 'finanças pessoais, controle financeiro, educação financeira, orçamento',
      en: 'personal finance, financial control, financial education, budget',
      es: 'finanzas personales, control financiero, educación financiera, presupuesto',
    },
  },

  // ─── APP/PRODUTO PROMOVIDO (CTA) ──────────────────────────────────
  app: {
    name: 'FinMoovi',
    url: 'https://finmoovi.com',
    features: {
      pt: ['Multi-moeda (BRL, USD, EUR)', 'Smart Capture por voz e OCR', 'Relatórios inteligentes com IA', '100% offline e seguro', 'Categorização automática'],
      en: ['Multi-currency (BRL, USD, EUR)', 'Voice & OCR Smart Capture', 'AI-powered smart reports', '100% offline & secure', 'Auto-categorization'],
      es: ['Multi-moneda (BRL, USD, EUR)', 'Smart Capture por voz y OCR', 'Reportes inteligentes con IA', '100% offline y seguro', 'Categorización automática'],
    },
    ctaText: {
      pt: 'Experimentar Grátis — 7 dias',
      en: 'Try Free — 7 days',
      es: 'Probar Gratis — 7 días',
    },
    ctaTitle: {
      pt: 'Organize suas finanças com o FinMoovi',
      en: 'Organize your finances with FinMoovi',
      es: 'Organiza tus finanzas con FinMoovi',
    },
    ctaNote: {
      pt: 'Sem cartão de crédito. Cancele quando quiser.',
      en: 'No credit card required. Cancel anytime.',
      es: 'Sin tarjeta de crédito. Cancela cuando quieras.',
    },
  },

  // ─── REDES SOCIAIS ─────────────────────────────────────────────────
  social: {
    twitter: 'https://x.com/finmoovi',
    instagram: 'https://www.instagram.com/finmoovi/',
    linkedin: 'https://www.linkedin.com/company/finmoovi',
    github: 'edflaviojs/blog-finmoovi',
    youtube: 'https://www.youtube.com/@FinMoovi',
    facebook: 'https://www.facebook.com/finmoovi',
    pinterest: 'https://pt.pinterest.com/finmoovi/',
    bluesky: 'https://bsky.app/profile/finmoovi.bsky.social',
    substack: 'https://finmoovi.substack.com/',
  },

  // ─── ANALYTICS ─────────────────────────────────────────────────────
  analytics: {
    cloudflareBeaconToken: '4db00f52892749c780db1a824b4f6124',
  },

  // ─── COMENTÁRIOS (GISCUS) ──────────────────────────────────────────
  giscus: {
    repo: 'edflaviojs/blog-finmoovi',
    repoId: 'R_kgDOShiqMg',
    category: 'Announcements',
    categoryId: 'DIC_kwDOShiqMs4DBKbU',
  },

  // ─── EMAIL ─────────────────────────────────────────────────────────
  email: {
    from: 'FinMoovi Blog <blog@email.finmoovi.com>',
    replyTo: 'contato@finmoovi.com',
  },

  // ─── IA (GERAÇÃO DE CONTEÚDO) ─────────────────────────────────────
  ai: {
    personality: `Você é um redator experiente de finanças pessoais que escreve para pessoas comuns. Seu estilo é direto, prático e conversacional. Você evita jargões técnicos e sempre dá exemplos reais do dia a dia. Quando menciona o app, faz de forma natural, como uma recomendação de amigo.`,

    nicheKeywords: ['finanças pessoais', 'controle financeiro', 'educação financeira', 'orçamento', 'investimentos', 'economia', 'dinheiro'],

    dailyTopics: [
      'como economizar nas compras do supermercado',
      'dicas para controlar gastos no cartão de crédito',
      'como criar uma reserva de emergência',
      'diferença entre investir e poupar',
      'como negociar descontos em contas fixas',
      'planejamento financeiro para autônomos',
      'como evitar compras por impulso',
      'educação financeira para crianças',
      'como usar cashback de forma inteligente',
      'planejamento financeiro para casais',
    ],

    seasonalCalendar: [
      { month: 1, day: 5, topic: 'como pagar IPVA sem comprometer o orçamento', keywords: ['ipva', 'ipva parcelado'] },
      { month: 1, day: 20, topic: 'como economizar na volta às aulas', keywords: ['volta às aulas', 'material escolar'] },
      { month: 2, day: 15, topic: 'como declarar imposto de renda', keywords: ['irpf', 'imposto de renda'] },
      { month: 3, day: 1, topic: 'guia completo da declaração do imposto de renda', keywords: ['irpf', 'declaração'] },
      { month: 5, day: 1, topic: 'como aproveitar o Dia das Mães sem se endividar', keywords: ['dia das mães'] },
      { month: 6, day: 1, topic: 'Dia dos Namorados econômico', keywords: ['dia dos namorados'] },
      { month: 7, day: 1, topic: 'como usar as férias de julho para revisar seu orçamento', keywords: ['férias julho finanças', 'revisar orçamento meio do ano'] },
      { month: 7, day: 10, topic: 'como economizar nas férias de inverno com a família', keywords: ['férias inverno econômicas', 'viagem barata julho'] },
      { month: 7, day: 20, topic: 'revisão financeira do primeiro semestre: checklist completo', keywords: ['revisão financeira semestral', 'metas meio do ano'] },
      { month: 8, day: 1, topic: 'presente Dia dos Pais sem comprometer o orçamento', keywords: ['presente dia dos pais barato', 'dia dos pais econômico'] },
      { month: 8, day: 10, topic: 'como começar a poupar para a Black Friday agora', keywords: ['poupar black friday', 'preparar black friday antecipado'] },
      { month: 8, day: 20, topic: 'volta às aulas segundo semestre: como economizar', keywords: ['volta aulas segundo semestre', 'material escolar barato'] },
      { month: 9, day: 1, topic: 'como economizar para o Dia das Crianças com antecedência', keywords: ['dia das crianças barato', 'presente econômico crianças'] },
      { month: 9, day: 15, topic: 'sprint financeiro: últimos 100 dias para fechar o ano no azul', keywords: ['sprint financeiro', 'metas financeiras fim de ano'] },
      { month: 10, day: 15, topic: 'como planejar compras de Natal com antecedência', keywords: ['natal', 'compras'] },
      { month: 11, day: 1, topic: 'guia definitivo da Black Friday', keywords: ['black friday', 'ofertas'] },
      { month: 11, day: 15, topic: 'como usar o 13º salário de forma inteligente', keywords: ['13 salário', 'décimo terceiro'] },
      { month: 12, day: 1, topic: 'finanças para o Natal sem dívidas', keywords: ['natal', 'dívidas'] },
      { month: 12, day: 15, topic: 'como planejar finanças para o próximo ano', keywords: ['planejamento', 'ano novo'] },
    ],

    comparisonTopics: [
      { a: 'CDB', b: 'Tesouro Selic', keywords: ['cdb vs tesouro', 'renda fixa'] },
      { a: 'Poupança', b: 'CDB', keywords: ['poupança vs cdb', 'onde guardar dinheiro'] },
      { a: 'Nubank', b: 'Inter', keywords: ['nubank vs inter', 'conta digital'] },
      { a: 'Aluguel', b: 'Financiamento', keywords: ['alugar ou financiar'] },
      { a: 'Renda fixa', b: 'Renda variável', keywords: ['renda fixa vs variável'] },
      { a: 'PIX', b: 'TED', keywords: ['pix vs ted'] },
      { a: 'Investir', b: 'Quitar dívidas', keywords: ['investir ou pagar dívida'] },
      { a: 'Consórcio', b: 'Financiamento', keywords: ['consórcio vs financiamento'] },
    ],

    solutionTopics: [
      { topic: 'Dificuldade em anotar gastos diários', keywords: ['anotar gastos', 'controle diário'] },
      { topic: 'Não saber para onde vai o dinheiro', keywords: ['categorizar gastos', 'relatórios'] },
      { topic: 'Esquecer de pagar contas', keywords: ['alertas', 'contas a pagar'] },
      { topic: 'Planilha que nunca atualiza', keywords: ['substituir planilha', 'app financeiro'] },
      { topic: 'Metas financeiras sem acompanhamento', keywords: ['metas', 'progresso'] },
    ],
  },

  // ─── BOT (COMMITS AUTOMÁTICOS) ────────────────────────────────────
  bot: {
    name: 'FinMoovi Bot',
    email: 'bot@finmoovi.com',
  },

  // ─── CLOUDFLARE ────────────────────────────────────────────────────
  cloudflare: {
    projectName: 'blog-finmoovi',
    kvNamespaceId: 'b5ea6ea0f36c40a6a3ae264e3c717750',
  },
};
