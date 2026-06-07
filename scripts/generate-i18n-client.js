/**
 * Generate public/scripts/i18n.js from src/i18n/translations.ts
 * This creates the client-side i18n file with brand-specific values
 * Run: node --import tsx scripts/generate-i18n-client.js
 */

import { config } from '../site.config.ts';

const brand = config.brand.name;
const appName = config.app.name;
const appUrl = config.app.url;
const niche = config.content.niche;
const year = new Date().getFullYear();

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
    'sidebar.newsletter.desc': `Receba dicas de ${niche.pt} toda semana no seu email.`,
    'sidebar.newsletter.placeholder': 'Seu melhor email',
    'sidebar.newsletter.btn': 'Inscrever-se',
    'sidebar.newsletter.privacy': 'Sem spam. Cancele quando quiser.',
    'sidebar.popular': 'Posts Populares',
    'sidebar.categorias': 'Categorias',
    'cta.badge': 'App Gratuito',
    'cta.title': `Organize suas finanças com o ${appName}`,
    'cta.desc': config.app.features.pt.slice(0, 3).join('. ') + '.',
    'cta.feature1': `✓ ${config.app.features.pt[0]}`,
    'cta.feature2': `✓ ${config.app.features.pt[1]}`,
    'cta.feature3': `✓ ${config.app.features.pt[2]}`,
    'cta.feature4': `✓ ${config.app.features.pt[3]}`,
    'cta.btn': config.app.ctaText.pt,
    'cta.note': config.app.ctaNote.pt,
    'footer.desc': config.siteDescription.pt,
    'footer.navegacao': 'Navegação',
    'footer.recursos': 'Recursos',
    'footer.legal': 'Legal',
    'footer.privacidade': 'Privacidade',
    'footer.termos': 'Termos de Uso',
    'footer.cookies': 'Cookies',
    'footer.copyright': `© ${year} ${brand}. Todos os direitos reservados.`,
    'footer.disclaimer': 'Este blog tem caráter educativo. Não constitui recomendação.',
    'footer.blog': 'Blog',
    'footer.app': 'App',
    'footer.link.dicas': 'Dicas',
    'footer.link.cotacoes': 'Cotações',
    'footer.link.glossario': 'Glossário',
    'footer.link.ferramentas': 'Ferramentas',
    'footer.link.baixar': `Baixar ${appName}`,
    'footer.link.funcionalidades': 'Funcionalidades',
    'footer.link.precos': 'Preços',
    'footer.link.suporte': 'Suporte',
    'footer.link.privacidade': 'Privacidade',
    'footer.link.termos': 'Termos de Uso',
    'footer.link.cookies': 'Cookies',
    'glossario.title': 'Glossário',
    'glossario.desc': 'Termos explicados de forma simples. Clique na pergunta para ver a resposta.',
    'glossario.oQueE': 'O que é',
    'glossario.lerMais': 'Ler explicação completa →',
    'sobre.title': `Sobre o ${brand} Blog`,
    'sobre.subtitle': config.brand.tagline.pt,
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
    'popup.desc': `Receba as melhores dicas de ${niche.pt} toda semana. Grátis.`,
    'popup.btn': 'Quero receber!',
    'popup.privacy': 'Sem spam. Cancele quando quiser.',
    'popular.1': 'Post popular 1',
    'popular.2': 'Post popular 2',
    'popular.3': 'Post popular 3',
    'popular.4': 'Post popular 4',
    'cat.dicas': 'Dicas',
    'cat.guias': 'Guias',
    'cat.cotacoes': 'Cotações',
    'cat.ferramentas': 'Ferramentas',
    'cat.noticias': 'Notícias',
    'cat.glossario': 'Glossário',
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
    'sidebar.newsletter.desc': `Get weekly ${niche.en} tips delivered to your inbox.`,
    'sidebar.newsletter.placeholder': 'Your best email',
    'sidebar.newsletter.btn': 'Subscribe',
    'sidebar.newsletter.privacy': 'No spam. Unsubscribe anytime.',
    'sidebar.popular': 'Popular Posts',
    'sidebar.categorias': 'Categories',
    'cta.badge': 'Free App',
    'cta.title': `Organize your finances with ${appName}`,
    'cta.desc': config.app.features.en.slice(0, 3).join('. ') + '.',
    'cta.feature1': `✓ ${config.app.features.en[0]}`,
    'cta.feature2': `✓ ${config.app.features.en[1]}`,
    'cta.feature3': `✓ ${config.app.features.en[2]}`,
    'cta.feature4': `✓ ${config.app.features.en[3]}`,
    'cta.btn': config.app.ctaText.en,
    'cta.note': config.app.ctaNote.en,
    'footer.desc': config.siteDescription.en,
    'footer.navegacao': 'Navigation',
    'footer.recursos': 'Resources',
    'footer.legal': 'Legal',
    'footer.privacidade': 'Privacy',
    'footer.termos': 'Terms of Use',
    'footer.cookies': 'Cookies',
    'footer.copyright': `© ${year} ${brand}. All rights reserved.`,
    'footer.disclaimer': 'This blog is for educational purposes only.',
    'footer.blog': 'Blog',
    'footer.app': 'App',
    'footer.link.dicas': 'Tips',
    'footer.link.cotacoes': 'Quotes',
    'footer.link.glossario': 'Glossary',
    'footer.link.ferramentas': 'Tools',
    'footer.link.baixar': `Get ${appName}`,
    'footer.link.funcionalidades': 'Features',
    'footer.link.precos': 'Pricing',
    'footer.link.suporte': 'Support',
    'footer.link.privacidade': 'Privacy',
    'footer.link.termos': 'Terms of Use',
    'footer.link.cookies': 'Cookies',
    'glossario.title': 'Glossary',
    'glossario.desc': 'Terms explained simply. Click the question to see the answer.',
    'glossario.oQueE': 'What is',
    'glossario.lerMais': 'Read full explanation →',
    'sobre.title': `About ${brand} Blog`,
    'sobre.subtitle': config.brand.tagline.en,
    'post.compartilhar': 'Share',
    'post.relacionados': 'Related Posts',
    'post.rateLabel': 'Was this article helpful?',
    'post.rateThank': 'Thanks for your feedback!',
    'post.toc': 'In this article',
    'post.share': 'Share:',
    'post.comments': 'Comments',
    'post.commentsNote': 'Comments via GitHub Discussions. Sign in with GitHub to participate.',
    'post.commentsPlaceholder': 'Comments coming soon!',
    'popup.title': "Don't miss any tips!",
    'popup.desc': `Get the best ${niche.en} tips every week. Free.`,
    'popup.btn': 'Subscribe!',
    'popup.privacy': 'No spam. Unsubscribe anytime.',
    'popular.1': 'Popular post 1',
    'popular.2': 'Popular post 2',
    'popular.3': 'Popular post 3',
    'popular.4': 'Popular post 4',
    'cat.dicas': 'Tips',
    'cat.guias': 'Guides',
    'cat.cotacoes': 'Quotes',
    'cat.ferramentas': 'Tools',
    'cat.noticias': 'News',
    'cat.glossario': 'Glossary',
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
    'sidebar.newsletter.desc': `Recibe consejos de ${niche.es} cada semana en tu email.`,
    'sidebar.newsletter.placeholder': 'Tu mejor email',
    'sidebar.newsletter.btn': 'Suscribirse',
    'sidebar.newsletter.privacy': 'Sin spam. Cancela cuando quieras.',
    'sidebar.popular': 'Posts Populares',
    'sidebar.categorias': 'Categorías',
    'cta.badge': 'App Gratuita',
    'cta.title': `Organiza tus finanzas con ${appName}`,
    'cta.desc': config.app.features.es.slice(0, 3).join('. ') + '.',
    'cta.feature1': `✓ ${config.app.features.es[0]}`,
    'cta.feature2': `✓ ${config.app.features.es[1]}`,
    'cta.feature3': `✓ ${config.app.features.es[2]}`,
    'cta.feature4': `✓ ${config.app.features.es[3]}`,
    'cta.btn': config.app.ctaText.es,
    'cta.note': config.app.ctaNote.es,
    'footer.desc': config.siteDescription.es,
    'footer.navegacao': 'Navegación',
    'footer.recursos': 'Recursos',
    'footer.legal': 'Legal',
    'footer.privacidade': 'Privacidad',
    'footer.termos': 'Términos de Uso',
    'footer.cookies': 'Cookies',
    'footer.copyright': `© ${year} ${brand}. Todos los derechos reservados.`,
    'footer.disclaimer': 'Este blog es educativo. No constituye recomendación.',
    'footer.blog': 'Blog',
    'footer.app': 'App',
    'footer.link.dicas': 'Consejos',
    'footer.link.cotacoes': 'Cotizaciones',
    'footer.link.glossario': 'Glosario',
    'footer.link.ferramentas': 'Herramientas',
    'footer.link.baixar': `Descargar ${appName}`,
    'footer.link.funcionalidades': 'Funcionalidades',
    'footer.link.precos': 'Precios',
    'footer.link.suporte': 'Soporte',
    'footer.link.privacidade': 'Privacidad',
    'footer.link.termos': 'Términos de Uso',
    'footer.link.cookies': 'Cookies',
    'glossario.title': 'Glosario',
    'glossario.desc': 'Términos explicados de forma simple. Haz clic en la pregunta para ver la respuesta.',
    'glossario.oQueE': 'Qué es',
    'glossario.lerMais': 'Leer explicación completa →',
    'sobre.title': `Acerca del ${brand} Blog`,
    'sobre.subtitle': config.brand.tagline.es,
    'post.compartilhar': 'Compartir',
    'post.relacionados': 'Posts Relacionados',
    'post.rateLabel': '¿Te fue útil este artículo?',
    'post.rateThank': '¡Gracias por tu opinión!',
    'post.toc': 'En este artículo',
    'post.share': 'Compartir:',
    'post.comments': 'Comentarios',
    'post.commentsNote': 'Comentarios vía GitHub Discussions. Inicia sesión con tu cuenta de GitHub.',
    'post.commentsPlaceholder': '¡Comentarios próximamente!',
    'popup.title': '¡No te pierdas ningún consejo!',
    'popup.desc': `Recibe los mejores consejos de ${niche.es} cada semana. Gratis.`,
    'popup.btn': '¡Quiero recibirlos!',
    'popup.privacy': 'Sin spam. Cancela cuando quieras.',
    'popular.1': 'Post popular 1',
    'popular.2': 'Post popular 2',
    'popular.3': 'Post popular 3',
    'popular.4': 'Post popular 4',
    'cat.dicas': 'Consejos',
    'cat.guias': 'Guías',
    'cat.cotacoes': 'Cotizaciones',
    'cat.ferramentas': 'Herramientas',
    'cat.noticias': 'Noticias',
    'cat.glossario': 'Glosario',
  },
};

// Generate the client-side i18n.js file
import { writeFileSync } from 'fs';
import { join } from 'path';

const output = `// Client-side i18n — Auto-generated by scripts/generate-i18n-client.js
// DO NOT EDIT MANUALLY — run: npm run generate

const translations = ${JSON.stringify(translations, null, 2)};

(function() {
  function getLocale() {
    const path = window.location.pathname;
    if (path.startsWith('/en/') || path === '/en') return 'en';
    if (path.startsWith('/es/') || path === '/es') return 'es';
    return 'pt';
  }

  function applyTranslations() {
    const locale = getLocale();
    const t = translations[locale] || translations.pt;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (t[key]) {
        if (el.tagName === 'INPUT' && el.hasAttribute('placeholder')) {
          el.placeholder = t[key];
        } else {
          el.textContent = t[key];
        }
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyTranslations);
  } else {
    applyTranslations();
  }
})();
`;

const outputPath = join(process.cwd(), 'public', 'scripts', 'i18n.js');
writeFileSync(outputPath, output, 'utf-8');
console.log('✅ Gerado: public/scripts/i18n.js');
