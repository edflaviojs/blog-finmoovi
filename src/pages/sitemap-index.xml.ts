import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const prerender = true;

export const GET: APIRoute = async () => {
  const posts = await getCollection('posts', ({ data }) => !data.draft);
  const glossario = await getCollection('glossario');

  const site = 'https://blog.finmoovi.com';
  const today = new Date().toISOString().split('T')[0];

  const staticPages = [
    { url: '/', priority: '1.0', changefreq: 'daily' },
    { url: '/app', priority: '0.9', changefreq: 'monthly' },
    { url: '/ferramentas', priority: '0.8', changefreq: 'weekly' },
    { url: '/glossario', priority: '0.8', changefreq: 'weekly' },
    { url: '/categorias/dicas', priority: '0.7', changefreq: 'daily' },
    { url: '/categorias/orcamento', priority: '0.7', changefreq: 'weekly' },
  ];

  const postPages = posts.map(post => ({
    url: `/posts/${post.slug}`,
    lastmod: (post.data.updatedAt || post.data.publishedAt).toISOString().split('T')[0],
    priority: post.data.featured ? '0.9' : '0.7',
    changefreq: 'monthly',
  }));

  const glossarioPages = glossario.map(term => ({
    url: `/glossario/${term.slug}`,
    lastmod: term.data.publishedAt.toISOString().split('T')[0],
    priority: '0.5',
    changefreq: 'monthly',
  }));

  const allPages = [...staticPages, ...postPages, ...glossarioPages];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages.map(page => `  <url>
    <loc>${site}${page.url}</loc>
    <lastmod>${(page as any).lastmod || today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
};
