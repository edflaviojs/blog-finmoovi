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
    translate: z.boolean().default(false),
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
    definition: z.string(),
    category: z.enum(['basico', 'investimentos', 'credito', 'impostos', 'mercado']),
    relatedTerms: z.array(z.string()).default([]),
    publishedAt: z.coerce.date(),
  }),
});

export const collections = { posts, glossario };
