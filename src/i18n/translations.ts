// Traduções do Blog FinMoovi — PT, EN, ES
export type Lang = 'pt' | 'en' | 'es';

export const translations: Record<Lang, Record<string, string>> = {
  pt: {
    // Nav
    'nav.inicio': 'Início',
    'nav.dicas': 'Dicas',
    'nav.ferramentas': 'Ferramentas',
    'nav.glossario': 'Glossário',
    'nav.sobre': 'Sobre',
    'nav.baixarApp': 'Baixar App',

    // Hero
    'hero.destaque': 'Destaque',
    'hero.minLeitura': 'min de leitura',

    // Sections
    'section.ultimosPosts': 'Últimos Posts',
    'section.destaques': 'Destaques',
    'section.verTodos': 'Ver todos',

    // Sidebar
    'sidebar.newsletter.title': 'Newsletter Gratuita',
    'sidebar.newsletter.desc': 'Receba dicas de finanças toda semana no seu email.',
    'sidebar.newsletter.placeholder': 'Seu melhor email',
    'sidebar.newsletter.btn': 'Inscrever-se',
    'sidebar.popular': 'Posts Populares',
    'sidebar.categorias': 'Categorias',

    // CTA
    'cta.badge': 'App Gratuito',
    'cta.title': 'Organize suas finanças com o FinMoovi',
    'cta.desc': 'Controle gastos, acompanhe investimentos e alcance seus objetivos financeiros. Multi-moeda, offline e inteligente.',
    'cta.feature1': '✓ Multi-moeda (BRL, USD, EUR)',
    'cta.feature2': '✓ Smart Capture com IA',
    'cta.feature3': '✓ Relatórios inteligentes',
    'cta.feature4': '✓ 100% offline e seguro',
    'cta.btn': 'Experimentar Grátis — 7 dias',
    'cta.note': 'Sem cartão de crédito. Cancele quando quiser.',

    // Footer
    'footer.desc': 'Educação financeira acessível para todos. Dicas práticas, ferramentas gratuitas e conteúdo que transforma sua relação com o dinheiro.',
    'footer.navegacao': 'Navegação',
    'footer.recursos': 'Recursos',
    'footer.legal': 'Legal',
    'footer.privacidade': 'Privacidade',
    'footer.termos': 'Termos de Uso',
    'footer.cookies': 'Cookies',
    'footer.copyright': '© 2025 FinMoovi. Todos os direitos reservados.',

    // Glossario
    'glossario.title': 'Glossário Financeiro',
    'glossario.desc': 'Termos financeiros explicados de forma simples. Clique na pergunta para ver a resposta.',
    'glossario.oQueE': 'O que é',
    'glossario.lerMais': 'Ler explicação completa →',
    'glossario.termosRelacionados': 'Termos Relacionados',

    // Sobre
    'sobre.title': 'Sobre o FinMoovi Blog',
    'sobre.subtitle': 'Educação financeira acessível para todos os brasileiros',

    // Post
    'post.compartilhar': 'Compartilhar',
    'post.relacionados': 'Posts Relacionados',

    // Cotacoes
    'cotacoes.titulo': 'Cotações em tempo real',
  },

  en: {
    // Nav
    'nav.inicio': 'Home',
    'nav.dicas': 'Tips',
    'nav.ferramentas': 'Tools',
    'nav.glossario': 'Glossary',
    'nav.sobre': 'About',
    'nav.baixarApp': 'Get App',

    // Hero
    'hero.destaque': 'Featured',
    'hero.minLeitura': 'min read',

    // Sections
    'section.ultimosPosts': 'Latest Posts',
    'section.destaques': 'Featured',
    'section.verTodos': 'View all',

    // Sidebar
    'sidebar.newsletter.title': 'Free Newsletter',
    'sidebar.newsletter.desc': 'Get weekly finance tips delivered to your inbox.',
    'sidebar.newsletter.placeholder': 'Your best email',
    'sidebar.newsletter.btn': 'Subscribe',
    'sidebar.popular': 'Popular Posts',
    'sidebar.categorias': 'Categories',

    // CTA
    'cta.badge': 'Free App',
    'cta.title': 'Organize your finances with FinMoovi',
    'cta.desc': 'Track expenses, monitor investments and reach your financial goals. Multi-currency, offline and smart.',
    'cta.feature1': '✓ Multi-currency (BRL, USD, EUR)',
    'cta.feature2': '✓ AI Smart Capture',
    'cta.feature3': '✓ Smart Reports',
    'cta.feature4': '✓ 100% offline & secure',
    'cta.btn': 'Try Free — 7 days',
    'cta.note': 'No credit card required. Cancel anytime.',

    // Footer
    'footer.desc': 'Accessible financial education for everyone. Practical tips, free tools and content that transforms your relationship with money.',
    'footer.navegacao': 'Navigation',
    'footer.recursos': 'Resources',
    'footer.legal': 'Legal',
    'footer.privacidade': 'Privacy',
    'footer.termos': 'Terms of Use',
    'footer.cookies': 'Cookies',
    'footer.copyright': '© 2025 FinMoovi. All rights reserved.',

    // Glossario
    'glossario.title': 'Financial Glossary',
    'glossario.desc': 'Financial terms explained simply. Click the question to see the answer.',
    'glossario.oQueE': 'What is',
    'glossario.lerMais': 'Read full explanation →',
    'glossario.termosRelacionados': 'Related Terms',

    // Sobre
    'sobre.title': 'About FinMoovi Blog',
    'sobre.subtitle': 'Accessible financial education for everyone',

    // Post
    'post.compartilhar': 'Share',
    'post.relacionados': 'Related Posts',

    // Cotacoes
    'cotacoes.titulo': 'Real-time quotes',
  },

  es: {
    // Nav
    'nav.inicio': 'Inicio',
    'nav.dicas': 'Consejos',
    'nav.ferramentas': 'Herramientas',
    'nav.glossario': 'Glosario',
    'nav.sobre': 'Acerca de',
    'nav.baixarApp': 'Descargar App',

    // Hero
    'hero.destaque': 'Destacado',
    'hero.minLeitura': 'min de lectura',

    // Sections
    'section.ultimosPosts': 'Últimos Posts',
    'section.destaques': 'Destacados',
    'section.verTodos': 'Ver todos',

    // Sidebar
    'sidebar.newsletter.title': 'Newsletter Gratuita',
    'sidebar.newsletter.desc': 'Recibe consejos de finanzas cada semana en tu email.',
    'sidebar.newsletter.placeholder': 'Tu mejor email',
    'sidebar.newsletter.btn': 'Suscribirse',
    'sidebar.popular': 'Posts Populares',
    'sidebar.categorias': 'Categorías',

    // CTA
    'cta.badge': 'App Gratuita',
    'cta.title': 'Organiza tus finanzas con FinMoovi',
    'cta.desc': 'Controla gastos, acompaña inversiones y alcanza tus objetivos financieros. Multi-moneda, offline e inteligente.',
    'cta.feature1': '✓ Multi-moneda (BRL, USD, EUR)',
    'cta.feature2': '✓ Smart Capture con IA',
    'cta.feature3': '✓ Informes inteligentes',
    'cta.feature4': '✓ 100% offline y seguro',
    'cta.btn': 'Probar Gratis — 7 días',
    'cta.note': 'Sin tarjeta de crédito. Cancela cuando quieras.',

    // Footer
    'footer.desc': 'Educación financiera accesible para todos. Consejos prácticos, herramientas gratuitas y contenido que transforma tu relación con el dinero.',
    'footer.navegacao': 'Navegación',
    'footer.recursos': 'Recursos',
    'footer.legal': 'Legal',
    'footer.privacidade': 'Privacidad',
    'footer.termos': 'Términos de Uso',
    'footer.cookies': 'Cookies',
    'footer.copyright': '© 2025 FinMoovi. Todos los derechos reservados.',

    // Glossario
    'glossario.title': 'Glosario Financiero',
    'glossario.desc': 'Términos financieros explicados de forma simple. Haz clic en la pregunta para ver la respuesta.',
    'glossario.oQueE': 'Qué es',
    'glossario.lerMais': 'Leer explicación completa →',
    'glossario.termosRelacionados': 'Términos Relacionados',

    // Sobre
    'sobre.title': 'Acerca del Blog FinMoovi',
    'sobre.subtitle': 'Educación financiera accesible para todos',

    // Post
    'post.compartilhar': 'Compartir',
    'post.relacionados': 'Posts Relacionados',

    // Cotacoes
    'cotacoes.titulo': 'Cotizaciones en tiempo real',
  },
};

export function t(lang: Lang, key: string): string {
  return translations[lang]?.[key] || translations['pt'][key] || key;
}
