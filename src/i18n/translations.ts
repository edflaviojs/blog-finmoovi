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

    // Ferramentas
    'ferramentas.title': 'Ferramentas Financeiras',
    'ferramentas.desc': 'Calculadoras e simuladores gratuitos para te ajudar a tomar melhores decisões financeiras.',
    'ferramentas.juros.title': 'Calculadora de Juros Compostos',
    'ferramentas.juros.desc': 'Simule quanto seu dinheiro pode render ao longo do tempo com juros compostos.',
    'ferramentas.orcamento.title': 'Calculadora de Orçamento',
    'ferramentas.orcamento.desc': 'Monte seu orçamento usando a regra 50-30-20 de forma rápida e visual.',
    'ferramentas.conversor.title': 'Conversor de Moedas',
    'ferramentas.conversor.desc': 'Converta entre BRL, USD, EUR e outras moedas com cotação atualizada.',
    'ferramentas.simulador.title': 'Simulador de Investimento',
    'ferramentas.simulador.desc': 'Descubra quanto precisa investir por mês para alcançar seu objetivo.',
    'ferramentas.emergencia.title': 'Calculadora de Reserva',
    'ferramentas.emergencia.desc': 'Calcule o valor ideal da sua reserva de emergência baseado nos seus gastos.',
    'ferramentas.cdb.title': 'Comparador de CDB',
    'ferramentas.cdb.desc': 'Compare rendimentos de CDBs com diferentes taxas e prazos.',

    // Sobre
    'sobre.missao': 'Nossa Missão',
    'sobre.missao.p1': 'O FinMoovi Blog nasceu com um objetivo claro: democratizar a educação financeira no Brasil. Acreditamos que todo mundo merece ter acesso a informações claras, práticas e sem jargão sobre como organizar suas finanças pessoais.',
    'sobre.missao.p2': 'Aqui você encontra dicas testadas, ferramentas gratuitas e conteúdo educativo que vai direto ao ponto. Sem enrolação, sem promessas milagrosas — apenas conhecimento prático que funciona no dia a dia.',
    'sobre.oque': 'O que você encontra aqui',
    'sobre.card1.title': 'Dicas Financeiras',
    'sobre.card1.desc': 'Artigos práticos sobre orçamento, economia, investimentos e controle de gastos.',
    'sobre.card2.title': 'Ferramentas Gratuitas',
    'sobre.card2.desc': 'Calculadoras, simuladores e conversores para te ajudar a tomar melhores decisões.',
    'sobre.card3.title': 'Glossário Financeiro',
    'sobre.card3.desc': 'Termos financeiros explicados de forma simples. De A a Z, sem complicação.',
    'sobre.card4.title': 'Cotações & Mercado',
    'sobre.card4.desc': 'Resumos semanais do mercado financeiro com análises acessíveis.',
    'sobre.sobreApp': 'Sobre o FinMoovi',
    'sobre.sobreApp.p1': 'O FinMoovi é um app de controle financeiro inteligente, criado no Brasil para brasileiros (e para quem vive com múltiplas moedas). Com ele você controla gastos, acompanha investimentos e alcança objetivos financeiros — tudo offline, com IA e multi-moeda.',
    'sobre.sobreApp.p2': 'O blog é uma extensão do nosso compromisso com a educação financeira. Mesmo que você não use o app, o conteúdo aqui é 100% gratuito e feito para te ajudar.',
    'sobre.cta.title': 'Quer organizar suas finanças?',
    'sobre.cta.desc': 'Teste o FinMoovi grátis por 7 dias. Sem cartão de crédito. Cancele quando quiser.',
    'sobre.cta.btn': 'Experimentar Grátis',
    'sobre.cta.blog': 'Ver o Blog',
    'sobre.contato': 'Contato',
    'sobre.contato.p1': 'Tem sugestões de conteúdo, encontrou algum erro ou quer colaborar? Entre em contato pelo email',
    'sobre.contato.p2': 'Siga o FinMoovi nas redes sociais para mais dicas rápidas:',
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

    // Ferramentas
    'ferramentas.title': 'Financial Tools',
    'ferramentas.desc': 'Free calculators and simulators to help you make better financial decisions.',
    'ferramentas.juros.title': 'Compound Interest Calculator',
    'ferramentas.juros.desc': 'Simulate how much your money can grow over time with compound interest.',
    'ferramentas.orcamento.title': 'Budget Calculator',
    'ferramentas.orcamento.desc': 'Build your budget using the 50-30-20 rule quickly and visually.',
    'ferramentas.conversor.title': 'Currency Converter',
    'ferramentas.conversor.desc': 'Convert between BRL, USD, EUR and other currencies with updated rates.',
    'ferramentas.simulador.title': 'Investment Simulator',
    'ferramentas.simulador.desc': 'Find out how much you need to invest monthly to reach your goal.',
    'ferramentas.emergencia.title': 'Emergency Fund Calculator',
    'ferramentas.emergencia.desc': 'Calculate the ideal amount for your emergency fund based on your expenses.',
    'ferramentas.cdb.title': 'CD Comparator',
    'ferramentas.cdb.desc': 'Compare returns from CDs with different rates and terms.',

    // Sobre
    'sobre.missao': 'Our Mission',
    'sobre.missao.p1': 'FinMoovi Blog was born with a clear goal: to democratize financial education. We believe everyone deserves access to clear, practical, jargon-free information about managing personal finances.',
    'sobre.missao.p2': 'Here you will find tested tips, free tools and educational content that gets straight to the point. No fluff, no miracle promises — just practical knowledge that works in everyday life.',
    'sobre.oque': 'What you will find here',
    'sobre.card1.title': 'Financial Tips',
    'sobre.card1.desc': 'Practical articles about budgeting, saving, investing and expense tracking.',
    'sobre.card2.title': 'Free Tools',
    'sobre.card2.desc': 'Calculators, simulators and converters to help you make better decisions.',
    'sobre.card3.title': 'Financial Glossary',
    'sobre.card3.desc': 'Financial terms explained simply. From A to Z, no complications.',
    'sobre.card4.title': 'Quotes & Market',
    'sobre.card4.desc': 'Weekly financial market summaries with accessible analysis.',
    'sobre.sobreApp': 'About FinMoovi',
    'sobre.sobreApp.p1': 'FinMoovi is a smart financial control app, built for people who live with multiple currencies. Track expenses, monitor investments and reach financial goals — all offline, with AI and multi-currency.',
    'sobre.sobreApp.p2': 'The blog is an extension of our commitment to financial education. Even if you don\'t use the app, the content here is 100% free and made to help you.',
    'sobre.cta.title': 'Want to organize your finances?',
    'sobre.cta.desc': 'Try FinMoovi free for 7 days. No credit card. Cancel anytime.',
    'sobre.cta.btn': 'Try Free',
    'sobre.cta.blog': 'See the Blog',
    'sobre.contato': 'Contact',
    'sobre.contato.p1': 'Have content suggestions, found an error or want to collaborate? Get in touch at',
    'sobre.contato.p2': 'Follow FinMoovi on social media for more quick tips:',
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

    // Ferramentas
    'ferramentas.title': 'Herramientas Financieras',
    'ferramentas.desc': 'Calculadoras y simuladores gratuitos para ayudarte a tomar mejores decisiones financieras.',
    'ferramentas.juros.title': 'Calculadora de Interés Compuesto',
    'ferramentas.juros.desc': 'Simula cuánto puede rendir tu dinero a lo largo del tiempo con interés compuesto.',
    'ferramentas.orcamento.title': 'Calculadora de Presupuesto',
    'ferramentas.orcamento.desc': 'Arma tu presupuesto usando la regla 50-30-20 de forma rápida y visual.',
    'ferramentas.conversor.title': 'Conversor de Monedas',
    'ferramentas.conversor.desc': 'Convierte entre BRL, USD, EUR y otras monedas con cotización actualizada.',
    'ferramentas.simulador.title': 'Simulador de Inversión',
    'ferramentas.simulador.desc': 'Descubre cuánto necesitas invertir por mes para alcanzar tu objetivo.',
    'ferramentas.emergencia.title': 'Calculadora de Reserva',
    'ferramentas.emergencia.desc': 'Calcula el valor ideal de tu reserva de emergencia basado en tus gastos.',
    'ferramentas.cdb.title': 'Comparador de CDT',
    'ferramentas.cdb.desc': 'Compara rendimientos de CDTs con diferentes tasas y plazos.',

    // Sobre
    'sobre.missao': 'Nuestra Misión',
    'sobre.missao.p1': 'El Blog FinMoovi nació con un objetivo claro: democratizar la educación financiera. Creemos que todos merecen acceso a información clara, práctica y sin jerga sobre cómo organizar sus finanzas personales.',
    'sobre.missao.p2': 'Aquí encontrarás consejos probados, herramientas gratuitas y contenido educativo que va directo al punto. Sin rodeos, sin promesas milagrosas — solo conocimiento práctico que funciona en el día a día.',
    'sobre.oque': 'Lo que encontrarás aquí',
    'sobre.card1.title': 'Consejos Financieros',
    'sobre.card1.desc': 'Artículos prácticos sobre presupuesto, ahorro, inversiones y control de gastos.',
    'sobre.card2.title': 'Herramientas Gratuitas',
    'sobre.card2.desc': 'Calculadoras, simuladores y conversores para ayudarte a tomar mejores decisiones.',
    'sobre.card3.title': 'Glosario Financiero',
    'sobre.card3.desc': 'Términos financieros explicados de forma simple. De la A a la Z, sin complicaciones.',
    'sobre.card4.title': 'Cotizaciones & Mercado',
    'sobre.card4.desc': 'Resúmenes semanales del mercado financiero con análisis accesibles.',
    'sobre.sobreApp': 'Sobre FinMoovi',
    'sobre.sobreApp.p1': 'FinMoovi es una app de control financiero inteligente, creada para personas que viven con múltiples monedas. Controla gastos, acompaña inversiones y alcanza objetivos financieros — todo offline, con IA y multi-moneda.',
    'sobre.sobreApp.p2': 'El blog es una extensión de nuestro compromiso con la educación financiera. Aunque no uses la app, el contenido aquí es 100% gratuito y hecho para ayudarte.',
    'sobre.cta.title': '¿Quieres organizar tus finanzas?',
    'sobre.cta.desc': 'Prueba FinMoovi gratis por 7 días. Sin tarjeta de crédito. Cancela cuando quieras.',
    'sobre.cta.btn': 'Probar Gratis',
    'sobre.cta.blog': 'Ver el Blog',
    'sobre.contato': 'Contacto',
    'sobre.contato.p1': '¿Tienes sugerencias de contenido, encontraste un error o quieres colaborar? Contáctanos por email',
    'sobre.contato.p2': 'Sigue a FinMoovi en redes sociales para más consejos rápidos:',
  },
};

export function t(lang: Lang, key: string): string {
  return translations[lang]?.[key] || translations['pt'][key] || key;
}
