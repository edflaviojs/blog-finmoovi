import { getCollection } from 'astro:content';
import { config } from '../../site.config';

/**
 * Categorias visíveis no menu "Categorias" (header + mobile) e no rodapé.
 * Fonte única: `config.content.categoryNav` (em site.config.ts).
 * Só retorna categorias que já têm ≥1 post publicado (pt) — evita link para
 * página de categoria vazia / 404.
 */
export async function getNavCategories() {
  const posts = await getCollection('posts', ({ data }) => !data.draft && data.locale === 'pt');
  const catSet = new Set(posts.map(p => p.data.category));
  return config.content.categoryNav
    .filter(c => catSet.has(c.slug))
    .map(c => ({ slug: c.slug, label: c.label, href: `/categorias/${c.slug}` }));
}
