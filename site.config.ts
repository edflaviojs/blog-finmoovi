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
      background: '#0d1117',
      primary: '#58a6ff',
      secondary: '#bc8cff',
      ctaGradientStart: '#00F0FF',
      ctaGradientEnd: '#A91079',
      accentGreen: '#3fb950',
      accentRed: '#f85149',
      // Gradiente do portal (barras de seção, eyebrows, chips) — vira o token
      // CSS --portal-grad via `npm run generate`
      portalGradientStart: '#00c8d7',
      portalGradientEnd: '#A91079',
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
    // Ferramentas exibidas no rail da home portal (páginas em /ferramentas/*).
    // Adicionar/remover ferramenta aqui reflete na home automaticamente.
    tools: [
      { href: '/ferramentas/conversor-moedas', label: { pt: 'Conversor de moedas', en: 'Currency converter', es: 'Conversor de monedas' } },
      { href: '/ferramentas/calculadora-juros-compostos', label: { pt: 'Juros compostos', en: 'Compound interest', es: 'Interés compuesto' } },
      { href: '/ferramentas/calculadora-orcamento', label: { pt: 'Orçamento 50-30-20', en: '50-30-20 budget', es: 'Presupuesto 50-30-20' } },
      { href: '/ferramentas/calculadora-reserva', label: { pt: 'Reserva ideal', en: 'Emergency fund', es: 'Fondo de emergencia' } },
      { href: '/ferramentas/simulador-investimento', label: { pt: 'Simulador de investimentos', en: 'Investment simulator', es: 'Simulador de inversiones' } },
      { href: '/ferramentas/calculadora-financiamento', label: { pt: 'Financiamento', en: 'Loan calculator', es: 'Financiación' } },
      { href: '/ferramentas/calculadora-aposentadoria', label: { pt: 'Aposentadoria', en: 'Retirement', es: 'Jubilación' } },
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
    schemaCategory: 'FinanceApplication', // Schema.org SoftwareApplication category
    priceCurrency: 'BRL',
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

  // ─── PUBLICIDADE PRÓPRIA (home portal) ─────────────────────────────
  // Banners 100% estáticos (zero JS de terceiros → zero impacto no PageSpeed).
  // Trocar campanha = editar aqui. theme define o clima visual do slide
  // (voz | moedas | funil | offline — gradientes animados no BillboardCarousel).
  ads: {
    billboard: [
      {
        theme: 'voz', icon: '🎙️', href: 'https://finmoovi.com',
        title: { pt: 'Fale.', en: 'Speak.', es: 'Habla.' },
        highlight: { pt: 'Está lançado.', en: "It's logged.", es: 'Está registrado.' },
        text: {
          pt: 'Smart Capture por voz: "gastei 87 reais no mercado" vira um lançamento completo no FinMoovi.',
          en: 'Voice Smart Capture: "spent 87 on groceries" becomes a complete entry in FinMoovi.',
          es: 'Smart Capture por voz: "gasté 87 en el mercado" se convierte en un registro completo en FinMoovi.',
        },
        cta: { pt: 'Testar grátis por 7 dias →', en: 'Try free for 7 days →', es: 'Probar gratis 7 días →' },
      },
      {
        theme: 'moedas', icon: '💱', href: 'https://finmoovi.com',
        title: { pt: '3 moedas.', en: '3 currencies.', es: '3 monedas.' },
        highlight: { pt: '1 app.', en: '1 app.', es: '1 app.' },
        text: {
          pt: 'Real, dólar e euro convivendo na mesma carteira, com conversão automática em tempo real.',
          en: 'Real, dollar and euro living in the same wallet, with automatic real-time conversion.',
          es: 'Real, dólar y euro conviviendo en la misma cartera, con conversión automática en tiempo real.',
        },
        cta: { pt: 'Conhecer o multi-moeda →', en: 'See multi-currency →', es: 'Conocer multi-moneda →' },
      },
      {
        theme: 'funil', icon: '🎯', href: 'https://app.finmoovi.com/funil-interativo',
        title: { pt: 'Qual é o seu', en: "What's your", es: '¿Cuál es tu' },
        highlight: { pt: 'perfil financeiro?', en: 'financial profile?', es: 'perfil financiero?' },
        text: {
          pt: 'Responda o funil interativo e receba um diagnóstico personalizado em 2 minutos.',
          en: 'Answer the interactive funnel and get a personalized diagnosis in 2 minutes.',
          es: 'Responde el embudo interactivo y recibe un diagnóstico personalizado en 2 minutos.',
        },
        cta: { pt: 'Fazer o teste →', en: 'Take the test →', es: 'Hacer el test →' },
      },
      {
        theme: 'offline', icon: '📶', href: 'https://finmoovi.com',
        title: { pt: 'Sem sinal?', en: 'No signal?', es: '¿Sin señal?' },
        highlight: { pt: 'Sem problema.', en: 'No problem.', es: 'Sin problema.' },
        text: {
          pt: 'O FinMoovi funciona 100% offline e sincroniza tudo quando você voltar a ter internet.',
          en: 'FinMoovi works 100% offline and syncs everything when you are back online.',
          es: 'FinMoovi funciona 100% offline y sincroniza todo cuando vuelvas a tener internet.',
        },
        cta: { pt: 'Ver como funciona →', en: 'See how it works →', es: 'Ver cómo funciona →' },
      },
    ],
    rail: {
      theme: 'funil', icon: '🎯', href: 'https://app.finmoovi.com/funil-interativo',
      title: { pt: 'Qual é o seu perfil financeiro?', en: "What's your financial profile?", es: '¿Cuál es tu perfil financiero?' },
      text: { pt: 'Funil interativo · resultado em 2 minutos', en: 'Interactive funnel · results in 2 minutes', es: 'Embudo interactivo · resultado en 2 minutos' },
      cta: { pt: 'Descobrir agora →', en: 'Find out now →', es: 'Descubrir ahora →' },
    },
    mid: {
      theme: 'voz', icon: '📱', href: 'https://finmoovi.com',
      title: { pt: 'Cansado de planilhas? O FinMoovi organiza tudo por você.', en: 'Tired of spreadsheets? FinMoovi organizes everything for you.', es: '¿Cansado de planillas? FinMoovi organiza todo por ti.' },
      text: { pt: 'Multi-moeda · Offline · Categorização automática', en: 'Multi-currency · Offline · Auto-categorization', es: 'Multi-moneda · Offline · Categorización automática' },
      cta: { pt: 'Experimentar →', en: 'Try it →', es: 'Probar →' },
    },
  },

  // ─── SAZONAL (banners por data comemorativa) ───────────────────────
  // Eventos com janela EXPLÍCITA (start/end, inclusive): dentro dela o slide
  // entra no BillboardCarousel (à frente das campanhas fixas) e o ticker ganha
  // a contagem regressiva. Fora da janela o evento é ignorado no build (o bot
  // rebuilda diariamente → entrada/saída automáticas). Datas móveis (Carnaval,
  // Páscoa, Dia das Mães) mudam por ano — RENOVAR as ocorrências anualmente;
  // manter eventos passados aqui não quebra nada.
  seasonal: {
    events: [
      // ⚠️⚠️ DEMO PARA VALIDAÇÃO NO PREVIEW (Fases B+C) — REMOVER ANTES DO MERGE ⚠️⚠️
      // Mostra: gorro de Natal na logo (decor) + slide com arte de fundo (art
      // aponta p/ uma capa existente só para validar o layout do véu/legibilidade)
      {
        id: 'DEMO-faseBC-REMOVER', theme: 'natal', icon: '🎄',
        start: '2026-07-01', end: '2026-07-31', eventDate: '2026-07-25',
        decor: {},
        art: '/images/posts/voce-perde-o-controle-dos-gastos-quando-viaja-usando-moedas-.webp',
        locales: ['pt', 'en', 'es'],
        href: { pt: '/categorias/dicas', en: '/en/categorias/dicas', es: '/es/categorias/dicas' },
        title: { pt: 'Natal no azul.', en: 'Holidays in the green.', es: 'Navidad sin deudas.' },
        highlight: { pt: 'Presenteie sem dívida.', en: 'Gift without debt.', es: 'Regala sin deuda.' },
        text: {
          pt: 'DEMO Fases B+C: gorro na logo + slide com arte de fundo e véu de legibilidade.',
          en: 'DEMO phases B+C: logo hat + slide with background art.',
          es: 'DEMO fases B+C.',
        },
        cta: { pt: 'Organizar o fim de ano →', en: 'Plan the holidays →', es: 'Organizar el fin de año →' },
      },
      // ⚠️⚠️ FIM DO DEMO ⚠️⚠️
      {
        id: 'black-friday-2026', theme: 'blackfriday', icon: '🛍️',
        start: '2026-11-12', end: '2026-11-28', eventDate: '2026-11-27',
        locales: ['pt', 'en', 'es'],
        href: { pt: '/ferramentas/calculadora-orcamento', en: '/ferramentas/calculadora-orcamento', es: '/ferramentas/calculadora-orcamento' },
        title: { pt: 'Black Friday.', en: 'Black Friday.', es: 'Black Friday.' },
        highlight: { pt: 'Sem cilada.', en: 'No traps.', es: 'Sin trampas.' },
        text: {
          pt: 'Defina o orçamento antes das ofertas: a calculadora 50-30-20 mostra quanto você pode gastar sem se endividar.',
          en: 'Set your budget before the deals drop: the 50-30-20 calculator shows how much you can spend without going into debt.',
          es: 'Define tu presupuesto antes de las ofertas: la calculadora 50-30-20 muestra cuánto puedes gastar sin endeudarte.',
        },
        cta: { pt: 'Planejar minhas compras →', en: 'Plan my shopping →', es: 'Planificar mis compras →' },
        ticker: { pt: '🛍️ Faltam {dias} dias para a Black Friday — planeje as compras', en: '🛍️ {dias} days until Black Friday — plan your shopping', es: '🛍️ Faltan {dias} días para el Black Friday — planifica tus compras' },
        tickerToday: { pt: '🛍️ Black Friday é HOJE — compre com orçamento, não por impulso', en: '🛍️ Black Friday is TODAY — shop with a budget, not on impulse', es: '🛍️ El Black Friday es HOY — compra con presupuesto, no por impulso' },
      },
      {
        id: 'natal-2026', theme: 'natal', icon: '🎄',
        start: '2026-12-10', end: '2026-12-26', eventDate: '2026-12-25',
        decor: { start: '2026-11-25' }, // gorro na logo 30 dias antes
        locales: ['pt', 'en', 'es'],
        href: { pt: '/categorias/dicas', en: '/en/categorias/dicas', es: '/es/categorias/dicas' },
        title: { pt: 'Natal no azul.', en: 'Holidays in the green.', es: 'Navidad sin deudas.' },
        highlight: { pt: 'Presenteie sem dívida.', en: 'Gift without debt.', es: 'Regala sin deuda.' },
        text: {
          pt: 'Décimo terceiro, presentes e ceia: organize os gastos de dezembro antes que eles organizem você.',
          en: 'Bonus, gifts and dinner: organize your December spending before it organizes you.',
          es: 'Aguinaldo, regalos y cena: organiza los gastos de diciembre antes de que te organicen a ti.',
        },
        cta: { pt: 'Organizar o fim de ano →', en: 'Plan the holidays →', es: 'Organizar el fin de año →' },
        ticker: { pt: '🎄 Faltam {dias} dias para o Natal — planeje os presentes sem estourar o orçamento', en: '🎄 {dias} days until Christmas — plan your gifts without breaking the budget', es: '🎄 Faltan {dias} días para Navidad — planifica los regalos sin romper el presupuesto' },
        tickerToday: { pt: '🎄 Feliz Natal! Celebre com quem importa — as contas já estão planejadas', en: '🎄 Merry Christmas! Celebrate with the ones who matter', es: '🎄 ¡Feliz Navidad! Celebra con quienes importan' },
      },
      {
        id: 'ano-novo-2027', theme: 'anonovo', icon: '✨',
        start: '2026-12-27', end: '2027-01-05', eventDate: '2027-01-01',
        decor: {}, // brilhos na logo, mesma janela do banner (emenda com o Natal)
        locales: ['pt', 'en', 'es'],
        href: { pt: '/ferramentas/calculadora-reserva', en: '/ferramentas/calculadora-reserva', es: '/ferramentas/calculadora-reserva' },
        title: { pt: '2027 começa agora.', en: '2027 starts now.', es: '2027 empieza ahora.' },
        highlight: { pt: 'Metas no papel.', en: 'Goals on paper.', es: 'Metas en papel.' },
        text: {
          pt: 'Comece o ano com reserva de emergência e metas claras — a virada financeira começa no planejamento.',
          en: 'Start the year with an emergency fund and clear goals — the financial turnaround starts with a plan.',
          es: 'Empieza el año con fondo de emergencia y metas claras — el cambio financiero empieza en el plan.',
        },
        cta: { pt: 'Definir minhas metas →', en: 'Set my goals →', es: 'Definir mis metas →' },
        ticker: { pt: '✨ Faltam {dias} dias para 2027 — comece o ano com metas financeiras', en: '✨ {dias} days until 2027 — start the year with financial goals', es: '✨ Faltan {dias} días para 2027 — empieza el año con metas financieras' },
        tickerToday: { pt: '✨ Feliz 2027! Primeiro dia é dia de planejar o ano', en: '✨ Happy 2027! Day one is planning day', es: '✨ ¡Feliz 2027! El primer día es día de planear el año' },
      },
      {
        id: 'carnaval-2027', theme: 'carnaval', icon: '🎭',
        start: '2027-01-25', end: '2027-02-10', eventDate: '2027-02-09',
        decor: { start: '2027-01-10' }, // confetes na logo 30 dias antes
        locales: ['pt'],
        href: { pt: '/categorias/orcamento', en: '/categorias/orcamento', es: '/categorias/orcamento' },
        title: { pt: 'Carnaval é folia.', en: 'Carnival.', es: 'Carnaval.' },
        highlight: { pt: 'Não é fatura.', en: 'On budget.', es: 'Con presupuesto.' },
        text: {
          pt: 'Fantasia, bloco e viagem cabem no orçamento — se você reservar a grana antes de cair na folia.',
          en: 'Costumes, parades and travel fit the budget — if you set the money aside first.',
          es: 'Disfraz, desfile y viaje caben en el presupuesto — si reservas el dinero antes.',
        },
        cta: { pt: 'Curtir sem estourar →', en: 'Enjoy on budget →', es: 'Disfrutar sin pasarse →' },
        ticker: { pt: '🎭 Faltam {dias} dias para o Carnaval — reserve a grana da folia', en: '🎭 {dias} days until Carnival', es: '🎭 Faltan {dias} días para el Carnaval' },
        tickerToday: { pt: '🎭 É Carnaval! Curta com a grana já reservada', en: '🎭 It’s Carnival!', es: '🎭 ¡Es Carnaval!' },
      },
      {
        id: 'imposto-de-renda-2027', theme: 'ir', icon: '🦁',
        start: '2027-03-01', end: '2027-04-30', eventDate: '2027-04-30',
        locales: ['pt'],
        href: { pt: '/categorias/dicas', en: '/categorias/dicas', es: '/categorias/dicas' },
        title: { pt: 'Imposto de Renda.', en: 'Income tax.', es: 'Impuesto de renta.' },
        highlight: { pt: 'Sem susto.', en: 'No stress.', es: 'Sin sustos.' },
        text: {
          pt: 'Declare com calma: separe os comprovantes agora e fuja da multa por atraso no fim do prazo.',
          en: 'File calmly: gather your documents now and avoid the late fee at the deadline.',
          es: 'Declara con calma: junta tus comprobantes ahora y evita la multa por atraso.',
        },
        cta: { pt: 'Ver o passo a passo →', en: 'See the guide →', es: 'Ver la guía →' },
        ticker: { pt: '🦁 Faltam {dias} dias para o prazo do IR — declare sem correria', en: '🦁 {dias} days until the tax deadline', es: '🦁 Faltan {dias} días para el plazo fiscal' },
        tickerToday: { pt: '🦁 ÚLTIMO DIA do prazo do IR — declare agora e fuja da multa', en: '🦁 Tax deadline is TODAY', es: '🦁 HOY vence el plazo fiscal' },
      },
      {
        id: 'dia-das-maes-2027', theme: 'maes', icon: '💐',
        start: '2027-04-24', end: '2027-05-09', eventDate: '2027-05-09',
        decor: { start: '2027-04-09' }, // flor na logo 30 dias antes
        locales: ['pt'],
        href: { pt: '/ferramentas/calculadora-orcamento', en: '/ferramentas/calculadora-orcamento', es: '/ferramentas/calculadora-orcamento' },
        title: { pt: 'Dia das Mães.', en: "Mother's Day.", es: 'Día de la Madre.' },
        highlight: { pt: 'Sem aperto.', en: 'No squeeze.', es: 'Sin apuros.' },
        text: {
          pt: 'Homenagem não precisa virar dívida: planeje o presente com antecedência e presenteie sem culpa.',
          en: "A tribute shouldn't become debt: plan the gift ahead and give guilt-free.",
          es: 'El homenaje no debe volverse deuda: planifica el regalo con anticipación.',
        },
        cta: { pt: 'Planejar o presente →', en: 'Plan the gift →', es: 'Planificar el regalo →' },
        ticker: { pt: '💐 Faltam {dias} dias para o Dia das Mães — planeje o presente', en: "💐 {dias} days until Mother's Day", es: '💐 Faltan {dias} días para el Día de la Madre' },
        tickerToday: { pt: '💐 Feliz Dia das Mães — celebre sem estourar o orçamento', en: "💐 Happy Mother's Day!", es: '💐 ¡Feliz Día de la Madre!' },
      },
    ],
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
