// Client-side i18n for FinMoovi Blog
// Translates all elements with data-i18n attribute

const translations = {
  pt: {
    'nav.inicio': 'Início',
    'nav.home': 'Início',
    'nav.dicas': 'Dicas',
    'nav.ferramentas': 'Ferramentas',
    'nav.glossario': 'Glossário',
    'nav.sobre': 'Sobre',
    'nav.baixarApp': 'Baixar App',
    'hero.destaque': 'Destaque',
    'hero.minLeitura': 'min de leitura',
    'section.ultimosPosts': 'Últimos Posts',
    'section.destaques': 'Destaques',
    'section.verTodos': 'Ver todos',
    'sidebar.newsletter.title': 'Newsletter Gratuita',
    'sidebar.newsletter.desc': 'Receba dicas de finanças toda semana no seu email.',
    'sidebar.newsletter.placeholder': 'Seu melhor email',
    'sidebar.newsletter.btn': 'Inscrever-se',
    'sidebar.newsletter.privacy': 'Sem spam. Cancele quando quiser.',
    'sidebar.popular': 'Posts Populares',
    'sidebar.categorias': 'Categorias',
    'cta.badge': 'App Gratuito',
    'cta.title': 'Organize suas finanças com o FinMoovi',
    'cta.desc': 'Controle gastos, acompanhe investimentos e alcance seus objetivos financeiros. Multi-moeda, offline e inteligente.',
    'cta.feature1': '✓ Multi-moeda (BRL, USD, EUR)',
    'cta.feature2': '✓ Smart Capture com IA',
    'cta.feature3': '✓ Relatórios inteligentes',
    'cta.feature4': '✓ 100% offline e seguro',
    'cta.btn': 'Experimentar Grátis — 7 dias',
    'cta.note': 'Sem cartão de crédito. Cancele quando quiser.',
    'footer.desc': 'Educação financeira acessível para todos. Dicas práticas, ferramentas gratuitas e conteúdo que transforma sua relação com o dinheiro.',
    'footer.navegacao': 'Navegação',
    'footer.recursos': 'Recursos',
    'footer.legal': 'Legal',
    'footer.privacidade': 'Privacidade',
    'footer.termos': 'Termos de Uso',
    'footer.cookies': 'Cookies',
    'footer.copyright': '© 2025 FinMoovi. Todos os direitos reservados.',
    'footer.disclaimer': 'Este blog tem caráter educativo. Não constitui recomendação de investimento.',
    'footer.blog': 'Blog',
    'footer.app': 'App',
    'footer.link.dicas': 'Dicas Financeiras',
    'footer.link.cotacoes': 'Cotações',
    'footer.link.glossario': 'Glossário',
    'footer.link.ferramentas': 'Ferramentas',
    'footer.link.baixar': 'Baixar FinMoovi',
    'footer.link.funcionalidades': 'Funcionalidades',
    'footer.link.precos': 'Preços',
    'footer.link.suporte': 'Suporte',
    'footer.link.privacidade': 'Privacidade',
    'footer.link.termos': 'Termos de Uso',
    'footer.link.cookies': 'Cookies',
    'glossario.title': 'Glossário Financeiro',
    'glossario.desc': 'Termos financeiros explicados de forma simples. Clique na pergunta para ver a resposta.',
    'glossario.oQueE': 'O que é',
    'glossario.lerMais': 'Ler explicação completa →',
    'sobre.title': 'Sobre o FinMoovi Blog',
    'sobre.subtitle': 'Educação financeira acessível para todos os brasileiros',
    'post.compartilhar': 'Compartilhar',
    'post.relacionados': 'Posts Relacionados',
    'post.rateLabel': 'Este artigo foi útil?',
    'post.rateThank': 'Obrigado pela avaliação!',
    'post.toc': 'Neste artigo',
    'post.share': 'Compartilhar:',
    'post.comments': 'Comentários',
    'post.commentsNote': 'Comentários via GitHub Discussions. Faça login com sua conta GitHub para participar.',
    'post.commentsPlaceholder': 'Comentários serão ativados em breve. Volte depois!',
    'popup.title': 'Não perca nenhuma dica!',
    'popup.desc': 'Receba as melhores dicas de finanças pessoais toda semana. Grátis.',
    'popup.btn': 'Quero receber!',
    'popup.privacy': 'Sem spam. Cancele quando quiser.',
  },
  en: {
    'nav.inicio': 'Home',
    'nav.home': 'Home',
    'nav.dicas': 'Tips',
    'nav.ferramentas': 'Tools',
    'nav.glossario': 'Glossary',
    'nav.sobre': 'About',
    'nav.baixarApp': 'Get App',
    'hero.destaque': 'Featured',
    'hero.minLeitura': 'min read',
    'section.ultimosPosts': 'Latest Posts',
    'section.destaques': 'Featured',
    'section.verTodos': 'View all',
    'sidebar.newsletter.title': 'Free Newsletter',
    'sidebar.newsletter.desc': 'Get weekly finance tips delivered to your inbox.',
    'sidebar.newsletter.placeholder': 'Your best email',
    'sidebar.newsletter.btn': 'Subscribe',
    'sidebar.newsletter.privacy': 'No spam. Cancel anytime.',
    'sidebar.popular': 'Popular Posts',
    'sidebar.categorias': 'Categories',
    'cta.badge': 'Free App',
    'cta.title': 'Organize your finances with FinMoovi',
    'cta.desc': 'Track expenses, monitor investments and reach your financial goals. Multi-currency, offline and smart.',
    'cta.feature1': '✓ Multi-currency (BRL, USD, EUR)',
    'cta.feature2': '✓ AI Smart Capture',
    'cta.feature3': '✓ Smart Reports',
    'cta.feature4': '✓ 100% offline & secure',
    'cta.btn': 'Try Free — 7 days',
    'cta.note': 'No credit card required. Cancel anytime.',
    'footer.desc': 'Accessible financial education for everyone. Practical tips, free tools and content that transforms your relationship with money.',
    'footer.navegacao': 'Navigation',
    'footer.recursos': 'Resources',
    'footer.legal': 'Legal',
    'footer.privacidade': 'Privacy',
    'footer.termos': 'Terms of Use',
    'footer.cookies': 'Cookies',
    'footer.copyright': '© 2025 FinMoovi. All rights reserved.',
    'footer.disclaimer': 'This blog is for educational purposes only. It does not constitute investment advice.',
    'footer.blog': 'Blog',
    'footer.app': 'App',
    'footer.link.dicas': 'Finance Tips',
    'footer.link.cotacoes': 'Exchange Rates',
    'footer.link.glossario': 'Glossary',
    'footer.link.ferramentas': 'Tools',
    'footer.link.baixar': 'Download FinMoovi',
    'footer.link.funcionalidades': 'Features',
    'footer.link.precos': 'Pricing',
    'footer.link.suporte': 'Support',
    'footer.link.privacidade': 'Privacy',
    'footer.link.termos': 'Terms of Use',
    'footer.link.cookies': 'Cookies',
    'glossario.title': 'Financial Glossary',
    'glossario.desc': 'Financial terms explained simply. Click the question to see the answer.',
    'glossario.oQueE': 'What is',
    'glossario.lerMais': 'Read full explanation →',
    'sobre.title': 'About FinMoovi Blog',
    'sobre.subtitle': 'Accessible financial education for everyone',
    'post.compartilhar': 'Share',
    'post.relacionados': 'Related Posts',
    'post.rateLabel': 'Was this article helpful?',
    'post.rateThank': 'Thanks for your feedback!',
    'post.toc': 'In this article',
    'post.share': 'Share:',
    'post.comments': 'Comments',
    'post.commentsNote': 'Comments via GitHub Discussions. Log in with your GitHub account to participate.',
    'post.commentsPlaceholder': 'Comments will be enabled soon. Check back later!',
    'popup.title': "Don't miss any tips!",
    'popup.desc': 'Get the best personal finance tips every week. Free.',
    'popup.btn': 'I want to receive!',
    'popup.privacy': 'No spam. Cancel anytime.',
  },
  es: {
    'nav.inicio': 'Inicio',
    'nav.home': 'Inicio',
    'nav.dicas': 'Consejos',
    'nav.ferramentas': 'Herramientas',
    'nav.glossario': 'Glosario',
    'nav.sobre': 'Acerca de',
    'nav.baixarApp': 'Descargar App',
    'hero.destaque': 'Destacado',
    'hero.minLeitura': 'min de lectura',
    'section.ultimosPosts': 'Últimos Posts',
    'section.destaques': 'Destacados',
    'section.verTodos': 'Ver todos',
    'sidebar.newsletter.title': 'Newsletter Gratuita',
    'sidebar.newsletter.desc': 'Recibe consejos de finanzas cada semana en tu email.',
    'sidebar.newsletter.placeholder': 'Tu mejor email',
    'sidebar.newsletter.btn': 'Suscribirse',
    'sidebar.newsletter.privacy': 'Sin spam. Cancela cuando quieras.',
    'sidebar.popular': 'Posts Populares',
    'sidebar.categorias': 'Categorías',
    'cta.badge': 'App Gratuita',
    'cta.title': 'Organiza tus finanzas con FinMoovi',
    'cta.desc': 'Controla gastos, acompaña inversiones y alcanza tus objetivos financieros. Multi-moneda, offline e inteligente.',
    'cta.feature1': '✓ Multi-moneda (BRL, USD, EUR)',
    'cta.feature2': '✓ Smart Capture con IA',
    'cta.feature3': '✓ Informes inteligentes',
    'cta.feature4': '✓ 100% offline y seguro',
    'cta.btn': 'Probar Gratis — 7 días',
    'cta.note': 'Sin tarjeta de crédito. Cancela cuando quieras.',
    'footer.desc': 'Educación financiera accesible para todos. Consejos prácticos, herramientas gratuitas y contenido que transforma tu relación con el dinero.',
    'footer.navegacao': 'Navegación',
    'footer.recursos': 'Recursos',
    'footer.legal': 'Legal',
    'footer.privacidade': 'Privacidad',
    'footer.termos': 'Términos de Uso',
    'footer.cookies': 'Cookies',
    'footer.copyright': '© 2025 FinMoovi. Todos los derechos reservados.',
    'footer.disclaimer': 'Este blog tiene carácter educativo. No constituye recomendación de inversión.',
    'footer.blog': 'Blog',
    'footer.app': 'App',
    'footer.link.dicas': 'Consejos Financieros',
    'footer.link.cotacoes': 'Cotizaciones',
    'footer.link.glossario': 'Glosario',
    'footer.link.ferramentas': 'Herramientas',
    'footer.link.baixar': 'Descargar FinMoovi',
    'footer.link.funcionalidades': 'Funcionalidades',
    'footer.link.precos': 'Precios',
    'footer.link.suporte': 'Soporte',
    'footer.link.privacidade': 'Privacidad',
    'footer.link.termos': 'Términos de Uso',
    'footer.link.cookies': 'Cookies',
    'glossario.title': 'Glosario Financiero',
    'glossario.desc': 'Términos financieros explicados de forma simple. Haz clic en la pregunta para ver la respuesta.',
    'glossario.oQueE': 'Qué es',
    'glossario.lerMais': 'Leer explicación completa →',
    'sobre.title': 'Acerca del Blog FinMoovi',
    'sobre.subtitle': 'Educación financiera accesible para todos',
    'post.compartilhar': 'Compartir',
    'post.relacionados': 'Posts Relacionados',
    'post.rateLabel': '¿Te fue útil este artículo?',
    'post.rateThank': '¡Gracias por tu valoración!',
    'post.toc': 'En este artículo',
    'post.share': 'Compartir:',
    'post.comments': 'Comentarios',
    'post.commentsNote': 'Comentarios vía GitHub Discussions. Inicia sesión con tu cuenta de GitHub para participar.',
    'post.commentsPlaceholder': 'Los comentarios se activarán pronto. ¡Vuelve después!',
    'popup.title': '¡No te pierdas ningún consejo!',
    'popup.desc': 'Recibe los mejores consejos de finanzas personales cada semana. Gratis.',
    'popup.btn': '¡Quiero recibir!',
    'popup.privacy': 'Sin spam. Cancela cuando quieras.',
  },
};

function applyTranslations(lang) {
  const dict = translations[lang] || translations['pt'];

  // Translate all elements with data-i18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) {
      if (el.tagName === 'INPUT') {
        el.setAttribute('placeholder', dict[key]);
      } else {
        el.textContent = dict[key];
      }
    }
  });

  // Translate placeholder attributes via data-i18n-placeholder
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (dict[key]) {
      el.setAttribute('placeholder', dict[key]);
    }
  });

  // Update html lang attribute
  document.documentElement.lang = lang === 'pt' ? 'pt-BR' : lang;
}

// Apply on load
const savedLang = localStorage.getItem('fm-lang') || 'pt';
applyTranslations(savedLang);

// Listen for language changes
const observer = new MutationObserver((mutations) => {
  mutations.forEach(m => {
    if (m.type === 'attributes' && m.attributeName === 'data-lang') {
      const newLang = document.documentElement.getAttribute('data-lang') || 'pt';
      applyTranslations(newLang);
    }
  });
});
observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-lang'] });

// Export for use in other scripts
window.__fmI18n = { applyTranslations, translations };
