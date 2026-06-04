import { defineCollection, z } from 'astro:content';

const posts = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    image: z.string().optional(),
    category: z.enum(['dicas', 'orcamento', 'investimentos', 'cotacoes', 'ferramentas', 'glossario']),
    tags: z.array(z.string()).default([]),
    author: z.string().default('FinMoovi'),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    readingTime: z.number().optional(),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
    translate: z.boolean().default(true),
    locale: z.enum(['pt', 'en', 'es']).default('pt'),
    translationKey: z.string().optional(),
    seo: z.object({
      metaTitle: z.string().optional(),
      metaDescription: z.string().optional(),
      keywords: z.array(z.string()).default([]),
    }).optional(),
  }),
});

const glossario = defineCollection({
  type: 'content',
  schema: z.object({
    term: z.string(),
    definition: z.string().optional(),
    category: z.enum(['basico', 'investimentos', 'credito', 'impostos', 'mercado']),
    relatedTerms: z.array(z.string()).default([]),
    publishedAt: z.coerce.date(),
    locale: z.enum(['pt', 'en', 'es']).default('pt'),
    translationKey: z.string().optional(),
    image: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    tags: z.array(z.string()).default([]),
    author: z.string().default('FinMoovi'),
    readingTime: z.number().optional(),
    seo: z.object({
      metaTitle: z.string().optional(),
      metaDescription: z.string().optional(),
      keywords: z.array(z.string()).default([]),
    }).optional(),
  }),
});

export const collections = { posts, glossario };
