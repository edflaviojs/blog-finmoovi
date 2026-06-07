import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { config } from '../../site.config';

export async function GET(context) {
  const posts = await getCollection('posts', ({ data }) => !data.draft && data.locale === 'pt');
  const sorted = posts.sort((a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime());

  return rss({
    title: `${config.brand.name} ${config.brand.blogSuffix} — ${config.content.niche.pt}`,
    description: config.siteDescription.pt,
    site: context.site,
    items: sorted.slice(0, 20).map(post => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.publishedAt,
      link: `/posts/${post.slug}/`,
      categories: [post.data.category, ...(post.data.tags || [])],
    })),
    customData: `<language>pt-BR</language>`,
  });
}
