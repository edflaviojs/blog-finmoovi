import { getCollection } from 'astro:content';
import type { Locale, HomeCard } from './home-data';

/**
 * Dados das páginas de categoria — UMA fonte para pt/en/es (mesmo padrão do
 * getHomeData). Cada wrapper /categorias/[categoria].astro chama
 * getCategoryPaths(locale) no getStaticPaths e repassa ao <PortalCategory/>.
 * Só gera página para categoria com ≥1 post no idioma (evita página vazia),
 * e o hreflang só aponta para os idiomas que também têm a categoria.
 */
export async function getCategoryPaths(locale: Locale) {
  const all = await getCollection('posts', ({ data }) => !data.draft);
  const prefix = locale === 'pt' ? '' : `/${locale}`;

  const posts = all
    .filter(p => p.data.locale === locale)
    .sort((a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime());

  const categories = [...new Set(posts.map(p => p.data.category))];

  return categories.map(category => {
    const alternates: Record<string, string> = {};
    for (const l of ['pt', 'en', 'es'] as Locale[]) {
      if (all.some(p => p.data.locale === l && p.data.category === category)) {
        alternates[l] = `${l === 'pt' ? '' : `/${l}`}/categorias/${category}`;
      }
    }

    const cards: HomeCard[] = posts
      .filter(p => p.data.category === category)
      .map(p => ({
        title: p.data.title,
        description: p.data.description,
        image: p.data.image,
        imageAlt: p.data.imageAlt,
        href: `${prefix}/posts/${p.slug}`,
        category: p.data.category,
        date: p.data.publishedAt,
        readingTime: p.data.readingTime,
      }));

    return { params: { categoria: category }, props: { category, posts: cards, alternates } };
  });
}
