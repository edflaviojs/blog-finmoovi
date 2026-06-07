import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { config } from '../../site.config';

export const prerender = true;

export const GET: APIRoute = async () => {
  const posts = await getCollection('posts', ({ data }) => !data.draft);
  const glossario = await getCollection('glossario');

  const site = config.siteUrl;
  const today = new Date().toISOString().split('T')[0];

  const locales = ['pt', 'en', 'es'];
  const localePrefixes = { pt: '', en: '/en', es: '/es' };

  const staticPages = [
    { path: '/', priority: '1.0', changefreq: 'daily' },
    { path: '/ferramentas', priority: '0.8', changefreq: 'weekly' },
    { path: '/glossario', priority: '0.8', changefreq: 'weekly' },
    { path: '/sobre', priority: '0.5', changefreq: 'monthly' },
  ];

  const ptStaticOnly = [
    { url: '/app', priority: '0.9', changefreq: 'monthly', lastmod: today },
    { url: '/como-organizar-financas', priority: '0.9', changefreq: 'monthly', lastmod: today },
    { url: '/orcamento-pessoal', priority: '0.9', changefreq: 'monthly', lastmod: today },
    { url: '/como-sair-das-dividas', priority: '0.9', changefreq: 'monthly', lastmod: today },
    { url: '/guia-30-dias', priority: '0.8', changefreq: 'monthly', lastmod: today },
    { url: '/checklist-financeiro', priority: '0.8', changefreq: 'monthly', lastmod: today },
    { url: '/ferramentas/calculadora-juros-compostos', priority: '0.8', changefreq: 'monthly', lastmod: today },
    { url: '/ferramentas/calculadora-orcamento', priority: '0.8', changefreq: 'monthly', lastmod: today },
    { url: '/ferramentas/conversor-moedas', priority: '0.8', changefreq: 'monthly', lastmod: today },
    { url: '/ferramentas/simulador-investimento', priority: '0.8', changefreq: 'monthly', lastmod: today },
    { url: '/ferramentas/calculadora-reserva', priority: '0.8', changefreq: 'monthly', lastmod: today },
    { url: '/categorias/dicas', priority: '0.7', changefreq: 'daily', lastmod: today },
    { url: '/categorias/orcamento', priority: '0.7', changefreq: 'weekly', lastmod: today },
    { url: '/categorias/cotacoes', priority: '0.7', changefreq: 'weekly', lastmod: today },
  ];

  const i18nStaticPages = staticPages.flatMap(page =>
    locales.map(locale => ({
      url: `${localePrefixes[locale]}${page.path}`,
      priority: page.priority,
      changefreq: page.changefreq,
      lastmod: today,
      alternates: locales.map(l => ({
        hreflang: l,
        href: `${site}${localePrefixes[l]}${page.path}`
      }))
    }))
  );

  const ptPosts = posts.filter(p => p.data.locale === 'pt' || (!p.data.locale && !p.slug.startsWith('en-') && !p.slug.startsWith('es-')));
  const enPosts = posts.filter(p => p.data.locale === 'en' || p.slug.startsWith('en-'));
  const esPosts = posts.filter(p => p.data.locale === 'es' || p.slug.startsWith('es-'));

  const postPages = [
    ...ptPosts.map(post => ({
      url: `/posts/${post.slug}`,
      lastmod: (post.data.updatedAt || post.data.publishedAt).toISOString().split('T')[0],
      priority: post.data.featured ? '0.9' : '0.7',
      changefreq: 'monthly',
    })),
    ...enPosts.map(post => ({
      url: `/en/posts/${post.slug}`,
      lastmod: (post.data.updatedAt || post.data.publishedAt).toISOString().split('T')[0],
      priority: post.data.featured ? '0.9' : '0.7',
      changefreq: 'monthly',
    })),
    ...esPosts.map(post => ({
      url: `/es/posts/${post.slug}`,
      lastmod: (post.data.updatedAt || post.data.publishedAt).toISOString().split('T')[0],
      priority: post.data.featured ? '0.9' : '0.7',
      changefreq: 'monthly',
    })),
  ];

  const ptGlossario = glossario.filter(t => t.data.locale === 'pt' || (!t.data.locale && !t.slug.startsWith('en-') && !t.slug.startsWith('es-')));
  const enGlossario = glossario.filter(t => t.data.locale === 'en' || t.slug.startsWith('en-'));
  const esGlossario = glossario.filter(t => t.data.locale === 'es' || t.slug.startsWith('es-'));

  const glossarioPages = [
    ...ptGlossario.map(term => ({
      url: `/glossario/${term.slug}`,
      lastmod: term.data.publishedAt.toISOString().split('T')[0],
      priority: '0.5',
      changefreq: 'monthly',
    })),
    ...enGlossario.map(term => ({
      url: `/en/glossario/${term.slug}`,
      lastmod: term.data.publishedAt.toISOString().split('T')[0],
      priority: '0.5',
      changefreq: 'monthly',
    })),
    ...esGlossario.map(term => ({
      url: `/es/glossario/${term.slug}`,
      lastmod: term.data.publishedAt.toISOString().split('T')[0],
      priority: '0.5',
      changefreq: 'monthly',
    })),
  ];

  const allPages = [...i18nStaticPages, ...ptStaticOnly, ...postPages, ...glossarioPages];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${allPages.map(page => `  <url>
    <loc>${site}${page.url}</loc>
    <lastmod>${page.lastmod || today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>${
      (page as any).alternates ? (page as any).alternates.map((alt: any) =>
        `\n    <xhtml:link rel="alternate" hreflang="${alt.hreflang}" href="${alt.href}" />`
      ).join('') : ''
    }
  </url>`).join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
};
