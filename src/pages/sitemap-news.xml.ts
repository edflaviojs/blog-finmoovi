import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { config } from '../../site.config';

export const prerender = true;

/**
 * Google News Sitemap.
 * Spec: https://developers.google.com/search/docs/crawling-indexing/sitemaps/news-sitemap
 * Contém APENAS artigos publicados nas últimas 48h (exigência do Google News).
 * Regenera a cada deploy — como o bot publica várias vezes ao dia, a janela
 * fica sempre fresca. Ajuda Google News/Discover a descobrir conteúdo novo.
 */

const PUBLICATION_NAME = `${config.brand.name} ${config.brand.blogSuffix}`;
const LANG = { pt: 'pt', en: 'en', es: 'es' } as const;
const PREFIX = { pt: '', en: '/en', es: '/es' } as const;

function xmlEscape(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function localeOf(post: any): 'pt' | 'en' | 'es' {
  if (post.data.locale) return post.data.locale;
  if (post.slug.startsWith('en-')) return 'en';
  if (post.slug.startsWith('es-')) return 'es';
  return 'pt';
}

export const GET: APIRoute = async () => {
  const site = config.siteUrl;
  const posts = await getCollection('posts', ({ data }) => !data.draft);

  const cutoff = Date.now() - 48 * 60 * 60 * 1000; // últimas 48h
  const recent = posts.filter(p => p.data.publishedAt.getTime() >= cutoff);

  const entries = recent.map(post => {
    const locale = localeOf(post);
    const loc = `${site}${PREFIX[locale]}/posts/${post.slug}`;
    return `  <url>
    <loc>${xmlEscape(loc)}</loc>
    <news:news>
      <news:publication>
        <news:name>${xmlEscape(PUBLICATION_NAME)}</news:name>
        <news:language>${LANG[locale]}</news:language>
      </news:publication>
      <news:publication_date>${post.data.publishedAt.toISOString()}</news:publication_date>
      <news:title>${xmlEscape(post.data.title)}</news:title>
    </news:news>
  </url>`;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${entries.join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
