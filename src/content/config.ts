import { defineCollection, z } from 'astro:content';
import { config } from '../../site.config';

const posts = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    tickerHeadline: z.string().max(40).optional(),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    category: z.enum(config.content.categories as unknown as [string, ...string[]]),
    tags: z.array(z.string()).default([]),
    author: z.string().default(config.content.defaultAuthor),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    readingTime: z.number().optional(),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
    translate: z.boolean().default(true),
    locale: z.enum(config.locales as unknown as [string, ...string[]]).default(config.defaultLocale),
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
    category: z.enum(config.content.glossaryCategories as unknown as [string, ...string[]]),
    relatedTerms: z.array(z.string()).default([]),
    publishedAt: z.coerce.date(),
    locale: z.enum(config.locales as unknown as [string, ...string[]]).default(config.defaultLocale),
    translationKey: z.string().optional(),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    tags: z.array(z.string()).default([]),
    author: z.string().default(config.content.defaultAuthor),
    readingTime: z.number().optional(),
    seo: z.object({
      metaTitle: z.string().optional(),
      metaDescription: z.string().optional(),
      keywords: z.array(z.string()).default([]),
    }).optional(),
  }),
});

export const collections = { posts, glossario };
