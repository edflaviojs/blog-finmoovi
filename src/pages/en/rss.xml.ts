import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const posts = await getCollection('posts', ({ data }) => !data.draft && data.locale === 'en');
  const sorted = posts.sort((a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime());

  return rss({
    title: 'FinMoovi Blog — Personal Finance',
    description: 'Practical personal finance tips, expense tracking, and financial education.',
    site: context.site,
    items: sorted.slice(0, 20).map(post => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.publishedAt,
      link: `/en/posts/${post.slug}/`,
      categories: [post.data.category, ...(post.data.tags || [])],
    })),
    customData: `<language>en</language>`,
  });
}
