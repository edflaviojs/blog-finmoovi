import { config } from '../../site.config';

/**
 * Registro de autores do blog (E-E-A-T / YMYL).
 * Fonte única para: assinatura visível (PostLayout), Person schema
 * (SchemaArticle) e a página /autor/<slug>. Assim schema e conteúdo visível
 * ficam SEMPRE consistentes (o Google compara os dois).
 */

export interface Credential {
  level: string;   // ex.: "Graduação", "Pós-graduação"
  name: string;    // ex.: "Administração de Empresas"
}

export interface Author {
  slug: string;
  name: string;
  jobTitle: string;
  description: string;
  credentials: Credential[];
  knowsAbout: string[];
  url: string;      // URL absoluta canônica (PT) — usada como @id da entidade Person
  i18nPaths: Record<'pt' | 'en' | 'es', string>; // caminho da página de autor por idioma
  sameAs: string[]; // perfis oficiais (LinkedIn etc.) — preencher quando houver
  image?: string;
}

const base = config.siteUrl;

/** Caminho da página de política editorial (E-E-A-T / confiança YMYL). */
export const EDITORIAL_POLICY_PATH = '/politica-editorial';

export const authors: Record<string, Author> = {
  'ed-flavio': {
    slug: 'ed-flavio',
    name: 'Ed Flávio',
    jobTitle: 'Editor de finanças pessoais',
    description:
      'Ed Flávio é o editor do FinMoovi Blog. Graduado em Administração de Empresas e pós-graduado em Gestão Financeira, escreve sobre finanças pessoais, orçamento e investimentos com o objetivo de tornar a educação financeira acessível para todos os brasileiros.',
    credentials: [
      { level: 'Graduação', name: 'Administração de Empresas' },
      { level: 'Pós-graduação', name: 'Gestão Financeira' },
    ],
    knowsAbout: [
      'finanças pessoais',
      'orçamento',
      'investimentos',
      'educação financeira',
      'controle de gastos',
    ],
    url: `${base}/autor/ed-flavio`,
    i18nPaths: {
      pt: '/autor/ed-flavio',
      en: '/en/author/ed-flavio',
      es: '/es/autor/ed-flavio',
    },
    sameAs: [
      'https://www.linkedin.com/in/edflaviojs/',
    ], // adicionar YouTube/X quando disponível (também alimenta o Person schema)
  },
};

/** Autor editor padrão do blog. */
export const defaultAuthor: Author = authors['ed-flavio'];

function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Resolve um nome de autor (ex.: vindo do frontmatter, incluindo o padrão
 * "FinMoovi" da marca) para o Author real. Nomes conhecidos casam pelo slug;
 * qualquer outro (incl. a marca) cai no editor padrão do blog.
 */
export function resolveAuthor(name?: string): Author {
  if (name) {
    const bySlug = authors[slugifyName(name)];
    if (bySlug) return bySlug;
  }
  return defaultAuthor;
}

/** Caminho (relativo) da página de autor no idioma dado. */
export function authorHref(author: Author, locale: string = 'pt'): string {
  return author.i18nPaths[(locale as 'pt' | 'en' | 'es')] || author.i18nPaths.pt;
}

/** JSON-LD Person para um autor (usado na página de autor e no Article). */
export function personSchema(author: Author) {
  return {
    '@type': 'Person',
    '@id': `${author.url}#person`,
    name: author.name,
    url: author.url,
    jobTitle: author.jobTitle,
    description: author.description,
    knowsAbout: author.knowsAbout,
    ...(author.image ? { image: author.image } : {}),
    ...(author.sameAs.length ? { sameAs: author.sameAs } : {}),
    hasCredential: author.credentials.map(c => ({
      '@type': 'EducationalOccupationalCredential',
      credentialCategory: 'degree',
      educationalLevel: c.level,
      name: c.name,
    })),
    worksFor: {
      '@type': 'Organization',
      name: config.brand.name,
      url: config.app.url,
    },
  };
}
