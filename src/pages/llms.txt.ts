import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { config } from '../../site.config';

export const prerender = true;

/**
 * llms.txt — mapa do site para assistentes de IA (padrão https://llmstxt.org).
 * Gerado 100% no build a partir do site.config + collections: zero manutenção.
 */
export const GET: APIRoute = async () => {
  const site = config.siteUrl;

  const posts = await getCollection('posts', ({ data }) => !data.draft);
  const glossario = await getCollection('glossario');

  const ptPosts = posts.filter(
    p => p.data.locale === 'pt' || (!p.data.locale && !p.slug.startsWith('en-') && !p.slug.startsWith('es-'))
  );
  const ptGlossario = glossario.filter(
    t => t.data.locale === 'pt' || (!t.data.locale && !t.slug.startsWith('en-') && !t.slug.startsWith('es-'))
  );

  const recentes = [...ptPosts]
    .sort((a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime())
    .slice(0, 20);

  // Só categorias com pelo menos 1 post PT publicado (evita link vazio)
  const categorias = config.content.categories.filter(cat =>
    ptPosts.some(p => p.data.category === cat)
  );

  const lines = [
    `# ${config.siteName}`,
    '',
    `> ${config.siteDescription.pt} Blog oficial do ${config.app.name} (${config.app.url}), aplicativo de gestão financeira pessoal com: ${config.app.features.pt.join(' · ')}. Conteúdo em português (principal), inglês e espanhol sobre ${config.content.niche.pt}.`,
    '',
    '## Categorias',
    '',
    ...categorias.map(cat => `- [${cat.charAt(0).toUpperCase() + cat.slice(1)}](${site}/categorias/${cat}/)`),
    '',
    '## Ferramentas',
    '',
    ...config.content.tools.map(tool => `- [${tool.label.pt}](${site}${tool.href}/)`),
    '',
    '## Glossário',
    '',
    `- [Glossário de finanças pessoais](${site}/glossario/): ${ptGlossario.length} termos explicados em linguagem simples`,
    '',
    '## Posts recentes',
    '',
    ...recentes.map(post => `- [${post.data.title}](${site}/posts/${post.slug}/)`),
    '',
    '## Feeds e sitemaps',
    '',
    `- [RSS](${site}/rss.xml)`,
    `- [Sitemap](${site}/sitemap-index.xml)`,
    `- [Sitemap de notícias](${site}/sitemap-news.xml)`,
    '',
  ];

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
