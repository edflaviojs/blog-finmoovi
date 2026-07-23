// Traduções do Blog — Geradas dinamicamente via site.config.ts
import { config } from '../../site.config';

export type Lang = 'pt' | 'en' | 'es';

const brand = config.brand.name;
const appName = config.app.name;
const appFeatures = config.app.features;
const ctaText = config.app.ctaText;
const ctaNote = config.app.ctaNote;
const niche = config.content.niche;

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
    'sidebar.newsletter.desc': `Receba dicas de ${niche.pt} toda semana no seu email.`,
    'sidebar.newsletter.placeholder': 'Seu melhor email',
    'sidebar.newsletter.btn': 'Inscrever-se',
    'sidebar.popular': 'Posts Populares',
    'sidebar.categorias': 'Categorias',

    // CTA
    'cta.badge': 'App Gratuito',
    'cta.title': config.app.ctaTitle.pt,
    'cta.desc': appFeatures.pt.slice(0, 3).join('. ') + '.',
    'cta.feature1': `✓ ${appFeatures.pt[0]}`,
    'cta.feature2': `✓ ${appFeatures.pt[1]}`,
    'cta.feature3': `✓ ${appFeatures.pt[2]}`,
    'cta.feature4': `✓ ${appFeatures.pt[3]}`,
    'cta.btn': ctaText.pt,
    'cta.note': ctaNote.pt,

    // Footer
    'footer.desc': config.siteDescription.pt,
    'footer.navegacao': 'Navegação',
    'footer.recursos': 'Recursos',
    'footer.legal': 'Legal',
    'footer.privacidade': 'Privacidade',
    'footer.termos': 'Termos de Uso',
    'footer.cookies': 'Cookies',
    'footer.copyright': `© ${new Date().getFullYear()} ${brand}. Todos os direitos reservados.`,
    'footer.disclaimer': 'O conteúdo deste blog é educativo e não constitui recomendação de investimento.',

    // Glossario
    'glossario.title': 'Glossário',
    'glossario.desc': 'Termos explicados de forma simples. Clique na pergunta para ver a resposta.',
    'glossario.oQueE': 'O que é',
    'glossario.lerMais': 'Ler explicação completa →',
    'glossario.termosRelacionados': 'Termos Relacionados',

    // Sobre
    'sobre.title': `Sobre o ${brand} Blog`,
    'sobre.subtitle': `${config.brand.tagline.pt}`,

    // Post
    'post.compartilhar': 'Compartilhar',
    'post.relacionados': 'Posts Relacionados',

    // Cotacoes
    'cotacoes.titulo': 'Cotações em tempo real',

    // Ferramentas
    'ferramentas.title': 'Ferramentas',
    'ferramentas.desc': 'Calculadoras e simuladores gratuitos para te ajudar a tomar melhores decisões.',
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
    'sobre.missao.p1': `O ${brand} Blog nasceu com um objetivo claro: democratizar a educação sobre ${niche.pt}. Acreditamos que todo mundo merece ter acesso a informações claras, práticas e sem jargão.`,
    'sobre.missao.p2': 'Aqui você encontra dicas testadas, ferramentas gratuitas e conteúdo educativo que vai direto ao ponto. Sem enrolação, sem promessas milagrosas — apenas conhecimento prático que funciona no dia a dia.',
    'sobre.oque': 'O que você encontra aqui',
    'sobre.card1.title': 'Dicas Práticas',
    'sobre.card1.desc': `Artigos práticos sobre ${niche.pt} e controle de gastos.`,
    'sobre.card2.title': 'Ferramentas Gratuitas',
    'sobre.card2.desc': 'Calculadoras, simuladores e conversores para te ajudar a tomar melhores decisões.',
    'sobre.card3.title': 'Glossário',
    'sobre.card3.desc': 'Termos explicados de forma simples. De A a Z, sem complicação.',
    'sobre.card4.title': 'Cotações & Mercado',
    'sobre.card4.desc': 'Resumos semanais do mercado com análises acessíveis.',
    'sobre.sobreApp': `Sobre o ${appName}`,
    'sobre.sobreApp.p1': `O ${appName} é um app inteligente criado para te ajudar com ${niche.pt}. ${appFeatures.pt.join('. ')}.`,
    'sobre.sobreApp.p2': 'O blog é uma extensão do nosso compromisso com educação. Mesmo que você não use o app, o conteúdo aqui é 100% gratuito e feito para te ajudar.',
    'sobre.cta.title': `Quer organizar suas ${niche.pt}?`,
    'sobre.cta.desc': `Teste o ${appName} grátis. ${ctaNote.pt}`,
    'sobre.cta.btn': ctaText.pt,
    'sobre.cta.blog': 'Ver o Blog',
    'sobre.contato': 'Contato',
    'sobre.contato.p1': 'Tem sugestões de conteúdo, encontrou algum erro ou quer colaborar? Entre em contato pelo email',
    'sobre.contato.p2': `Siga o ${brand} nas redes sociais para mais dicas rápidas:`,
    'sobre.editorial': 'Política editorial',
    'sobre.editorial.p1': 'Os artigos e os termos do glossário são produzidos com apoio de inteligência artificial e passam por curadoria e por sistemas automáticos de verificação, que revisam informações, links e datas antes e depois da publicação.',
    'sobre.editorial.p2': 'Encontrou um erro ou algo desatualizado? Avise pela nossa',
    'sobre.editorial.p2.link': 'página de contato',
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
    'sidebar.newsletter.desc': `Get weekly ${niche.en} tips delivered to your inbox.`,
    'sidebar.newsletter.placeholder': 'Your best email',
    'sidebar.newsletter.btn': 'Subscribe',
    'sidebar.popular': 'Popular Posts',
    'sidebar.categorias': 'Categories',

    // CTA
    'cta.badge': 'Free App',
    'cta.title': config.app.ctaTitle.en,
    'cta.desc': appFeatures.en.slice(0, 3).join('. ') + '.',
    'cta.feature1': `✓ ${appFeatures.en[0]}`,
    'cta.feature2': `✓ ${appFeatures.en[1]}`,
    'cta.feature3': `✓ ${appFeatures.en[2]}`,
    'cta.feature4': `✓ ${appFeatures.en[3]}`,
    'cta.btn': ctaText.en,
    'cta.note': ctaNote.en,

    // Footer
    'footer.desc': config.siteDescription.en,
    'footer.navegacao': 'Navigation',
    'footer.recursos': 'Resources',
    'footer.legal': 'Legal',
    'footer.privacidade': 'Privacy',
    'footer.termos': 'Terms of Use',
    'footer.cookies': 'Cookies',
    'footer.copyright': `© ${new Date().getFullYear()} ${brand}. All rights reserved.`,
    'footer.disclaimer': 'The content of this blog is educational and does not constitute investment advice.',

    // Glossario
    'glossario.title': 'Glossary',
    'glossario.desc': 'Terms explained simply. Click the question to see the answer.',
    'glossario.oQueE': 'What is',
    'glossario.lerMais': 'Read full explanation →',
    'glossario.termosRelacionados': 'Related Terms',

    // Sobre
    'sobre.title': `About ${brand} Blog`,
    'sobre.subtitle': `${config.brand.tagline.en}`,

    // Post
    'post.compartilhar': 'Share',
    'post.relacionados': 'Related Posts',

    // Cotacoes
    'cotacoes.titulo': 'Real-time quotes',

    // Ferramentas
    'ferramentas.title': 'Tools',
    'ferramentas.desc': 'Free calculators and simulators to help you make better decisions.',
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
    'sobre.missao.p1': `${brand} Blog was born with a clear goal: to democratize ${niche.en} education. We believe everyone deserves access to clear, practical, jargon-free information.`,
    'sobre.missao.p2': 'Here you will find tested tips, free tools and educational content that gets straight to the point. No fluff, no miracle promises — just practical knowledge that works in everyday life.',
    'sobre.oque': 'What you will find here',
    'sobre.card1.title': 'Practical Tips',
    'sobre.card1.desc': `Practical articles about ${niche.en} and expense tracking.`,
    'sobre.card2.title': 'Free Tools',
    'sobre.card2.desc': 'Calculators, simulators and converters to help you make better decisions.',
    'sobre.card3.title': 'Glossary',
    'sobre.card3.desc': 'Terms explained simply. From A to Z, no complications.',
    'sobre.card4.title': 'Quotes & Market',
    'sobre.card4.desc': 'Weekly market summaries with accessible analysis.',
    'sobre.sobreApp': `About ${appName}`,
    'sobre.sobreApp.p1': `${appName} is a smart app built to help you with ${niche.en}. ${appFeatures.en.join('. ')}.`,
    'sobre.sobreApp.p2': 'The blog is an extension of our commitment to education. Even if you don\'t use the app, the content here is 100% free and made to help you.',
    'sobre.cta.title': `Want to organize your ${niche.en}?`,
    'sobre.cta.desc': `Try ${appName} for free. ${ctaNote.en}`,
    'sobre.cta.btn': ctaText.en,
    'sobre.cta.blog': 'See the Blog',
    'sobre.contato': 'Contact',
    'sobre.contato.p1': 'Have content suggestions, found an error or want to collaborate? Get in touch at',
    'sobre.contato.p2': `Follow ${brand} on social media for more quick tips:`,
    'sobre.editorial': 'Editorial policy',
    'sobre.editorial.p1': 'Articles and glossary terms are produced with the support of artificial intelligence and go through curation and automated checks that review facts, links and dates before and after publication.',
    'sobre.editorial.p2': 'Found an error or something outdated? Let us know through our',
    'sobre.editorial.p2.link': 'contact page',
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
    'sidebar.newsletter.desc': `Recibe consejos de ${niche.es} cada semana en tu email.`,
    'sidebar.newsletter.placeholder': 'Tu mejor email',
    'sidebar.newsletter.btn': 'Suscribirse',
    'sidebar.popular': 'Posts Populares',
    'sidebar.categorias': 'Categorías',

    // CTA
    'cta.badge': 'App Gratuita',
    'cta.title': config.app.ctaTitle.es,
    'cta.desc': appFeatures.es.slice(0, 3).join('. ') + '.',
    'cta.feature1': `✓ ${appFeatures.es[0]}`,
    'cta.feature2': `✓ ${appFeatures.es[1]}`,
    'cta.feature3': `✓ ${appFeatures.es[2]}`,
    'cta.feature4': `✓ ${appFeatures.es[3]}`,
    'cta.btn': ctaText.es,
    'cta.note': ctaNote.es,

    // Footer
    'footer.desc': config.siteDescription.es,
    'footer.navegacao': 'Navegación',
    'footer.recursos': 'Recursos',
    'footer.legal': 'Legal',
    'footer.privacidade': 'Privacidad',
    'footer.termos': 'Términos de Uso',
    'footer.cookies': 'Cookies',
    'footer.copyright': `© ${new Date().getFullYear()} ${brand}. Todos los derechos reservados.`,
    'footer.disclaimer': 'El contenido de este blog es educativo y no constituye una recomendación de inversión.',

    // Glossario
    'glossario.title': 'Glosario',
    'glossario.desc': 'Términos explicados de forma simple. Haz clic en la pregunta para ver la respuesta.',
    'glossario.oQueE': 'Qué es',
    'glossario.lerMais': 'Leer explicación completa →',
    'glossario.termosRelacionados': 'Términos Relacionados',

    // Sobre
    'sobre.title': `Acerca del ${brand} Blog`,
    'sobre.subtitle': `${config.brand.tagline.es}`,

    // Post
    'post.compartilhar': 'Compartir',
    'post.relacionados': 'Posts Relacionados',

    // Cotacoes
    'cotacoes.titulo': 'Cotizaciones en tiempo real',

    // Ferramentas
    'ferramentas.title': 'Herramientas',
    'ferramentas.desc': 'Calculadoras y simuladores gratuitos para ayudarte a tomar mejores decisiones.',
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
    'sobre.missao.p1': `El ${brand} Blog nació con un objetivo claro: democratizar la educación sobre ${niche.es}. Creemos que todos merecen acceso a información clara, práctica y sin jerga.`,
    'sobre.missao.p2': 'Aquí encontrarás consejos probados, herramientas gratuitas y contenido educativo que va directo al punto. Sin rodeos, sin promesas milagrosas — solo conocimiento práctico que funciona en el día a día.',
    'sobre.oque': 'Lo que encontrarás aquí',
    'sobre.card1.title': 'Consejos Prácticos',
    'sobre.card1.desc': `Artículos prácticos sobre ${niche.es} y control de gastos.`,
    'sobre.card2.title': 'Herramientas Gratuitas',
    'sobre.card2.desc': 'Calculadoras, simuladores y conversores para ayudarte a tomar mejores decisiones.',
    'sobre.card3.title': 'Glosario',
    'sobre.card3.desc': 'Términos explicados de forma simple. De la A a la Z, sin complicaciones.',
    'sobre.card4.title': 'Cotizaciones & Mercado',
    'sobre.card4.desc': 'Resúmenes semanales del mercado con análisis accesibles.',
    'sobre.sobreApp': `Sobre ${appName}`,
    'sobre.sobreApp.p1': `${appName} es una app inteligente creada para ayudarte con ${niche.es}. ${appFeatures.es.join('. ')}.`,
    'sobre.sobreApp.p2': 'El blog es una extensión de nuestro compromiso con la educación. Aunque no uses la app, el contenido aquí es 100% gratuito y hecho para ayudarte.',
    'sobre.cta.title': `¿Quieres organizar tus ${niche.es}?`,
    'sobre.cta.desc': `Prueba ${appName} gratis. ${ctaNote.es}`,
    'sobre.cta.btn': ctaText.es,
    'sobre.cta.blog': 'Ver el Blog',
    'sobre.contato': 'Contacto',
    'sobre.contato.p1': '¿Tienes sugerencias de contenido, encontraste un error o quieres colaborar? Contáctanos por email',
    'sobre.contato.p2': `Sigue a ${brand} en redes sociales para más consejos rápidos:`,
    'sobre.editorial': 'Política editorial',
    'sobre.editorial.p1': 'Los artículos y los términos del glosario se producen con apoyo de inteligencia artificial y pasan por curaduría y por sistemas automáticos de verificación que revisan datos, enlaces y fechas antes y después de la publicación.',
    'sobre.editorial.p2': '¿Encontraste un error o algo desactualizado? Avísanos a través de nuestra',
    'sobre.editorial.p2.link': 'página de contacto',
  },
};

export function t(lang: Lang, key: string): string {
  return translations[lang]?.[key] || translations['pt'][key] || key;
}
