import { getCollection } from 'astro:content';
import { config } from '../../site.config';

/**
 * Dados da home portal — UMA fonte para pt/en/es (mata a triplicação das
 * antigas index.astro). Cada wrapper de página chama getHomeData(locale)
 * e repassa ao <PortalHome/>.
 */

export type Locale = 'pt' | 'en' | 'es';

export interface HomeCard {
  title: string;
  description?: string;
  image?: string;
  imageAlt?: string;
  href: string;
  category: string;
  date: Date;
  readingTime?: number;
}

const CATEGORY_LABELS: Record<Locale, Record<string, string>> = {
  pt: { dicas: 'Dicas', orcamento: 'Orçamento', investimentos: 'Investimentos', cotacoes: 'Cotações', ferramentas: 'Ferramentas', glossario: 'Glossário' },
  en: { dicas: 'Tips', orcamento: 'Budget', investimentos: 'Investments', cotacoes: 'Quotes', ferramentas: 'Tools', glossario: 'Glossary' },
  es: { dicas: 'Consejos', orcamento: 'Presupuesto', investimentos: 'Inversiones', cotacoes: 'Cotizaciones', ferramentas: 'Herramientas', glossario: 'Glosario' },
};

export function categoryLabel(locale: Locale, slug: string): string {
  return CATEGORY_LABELS[locale][slug] || slug;
}

function toCard(prefix: string, post: any): HomeCard {
  return {
    title: post.data.title,
    description: post.data.description,
    image: post.data.image,
    imageAlt: post.data.imageAlt,
    href: `${prefix}/posts/${post.slug}`,
    category: post.data.category,
    date: post.data.publishedAt,
    readingTime: post.data.readingTime,
  };
}

export async function getHomeData(locale: Locale) {
  const prefix = locale === 'pt' ? '' : `/${locale}`;

  const posts = (await getCollection('posts', ({ data }) => !data.draft && data.locale === locale))
    .sort((a, b) => {
      const d = b.data.publishedAt.getTime() - a.data.publishedAt.getTime();
      return d !== 0 ? d : (a.data.translationKey || '').localeCompare(b.data.translationKey || '');
    });

  const glossario = (await getCollection('glossario', ({ data }) => data.locale === locale))
    .sort((a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime());

  // Hero: post mais recente (título curto do ticker não se aplica aqui)
  const hero = posts[0] ? toCard(prefix, posts[0]) : null;
  const used = new Set<string>(hero ? [hero.href] : []);

  // 2 cards secundários ao lado do hero: mais recentes de categorias diferentes
  const secondary: HomeCard[] = [];
  for (const p of posts) {
    if (secondary.length >= 2) break;
    const card = toCard(prefix, p);
    if (used.has(card.href)) continue;
    if (secondary.some(c => c.category === card.category)) continue;
    secondary.push(card);
    used.add(card.href);
  }

  // Rail "Em destaque": 5 mais recentes ainda não usados
  const destaque = posts
    .map(p => toCard(prefix, p))
    .filter(c => !used.has(c.href))
    .slice(0, 5);
  destaque.forEach(c => used.add(c.href));

  // Manchetes-respiro: título grande + 3 sub-chamadas da mesma categoria
  function manchete(category: string) {
    const list = posts.filter(p => p.data.category === category);
    if (list.length < 2) return null;
    return {
      main: toCard(prefix, list[0]),
      subs: list.slice(1, 4).map(p => toCard(prefix, p)),
    };
  }
  const mancheteInvestimentos = manchete('investimentos');
  const mancheteCotacoes = manchete('cotacoes');

  // Fileiras por categoria (dados do config — categoria nova entra sozinha):
  // até 2 fileiras com ≥2 posts, priorizando a ordem do categoryNav
  const rows: { slug: string; label: string; href: string; cards: HomeCard[] }[] = [];
  for (const cat of config.content.categoryNav) {
    if (rows.length >= 2) break;
    // até 8 cards: as fileiras são carrosséis-esteira e precisam de estoque p/ girar
    const cards = posts.filter(p => p.data.category === cat.slug).slice(0, 8).map(p => toCard(prefix, p));
    if (cards.length >= 2) {
      rows.push({ slug: cat.slug, label: categoryLabel(locale, cat.slug), href: `${prefix}/categorias/${cat.slug}`, cards });
    }
  }

  // "Últimas do blog": 6 recentes ainda não exibidos acima
  const shown = new Set<string>([
    ...(hero ? [hero.href] : []),
    ...secondary.map(c => c.href),
    ...rows.flatMap(r => r.cards.map(c => c.href)),
  ]);
  const ultimas = posts.map(p => toCard(prefix, p)).filter(c => !shown.has(c.href)).slice(0, 6);

  // Glossário: termo do dia + chips dos termos recentes
  const termoDia = glossario[0]
    ? { term: glossario[0].data.term, href: `${prefix}/glossario/${glossario[0].slug}` }
    : null;
  const termoChips = glossario.slice(1, 7).map(g => ({ term: g.data.term, href: `${prefix}/glossario/${g.slug}` }));

  // Faixa "AGORA": só quando há conteúdo fresco (<48h) — evita portal parado
  const fresh = hero && (Date.now() - hero.date.getTime()) < 48 * 60 * 60 * 1000 ? hero : null;

  return { locale, prefix, hero, secondary, destaque, mancheteInvestimentos, mancheteCotacoes, rows, ultimas, termoDia, termoChips, fresh };
}
