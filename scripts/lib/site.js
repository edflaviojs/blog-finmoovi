/**
 * scripts/lib/site.js — Fonte ÚNICA de identidade do site para os scripts raiz.
 *
 * Deriva tudo do site.config.ts (T1 da Templatização): nenhum script raiz deve
 * hardcodar domínio, marca, autor ou User-Agent. Requer Node >= 22.18 (type
 * stripping nativo p/ importar .ts) — os workflows já usam node-version: '22'.
 */
import { config } from '../../site.config.ts';

export { config };

/** URL canônica do blog, sem barra final (ex.: https://blog.finmoovi.com) */
export const SITE_URL = config.siteUrl.replace(/\/$/, '');

/** Host do blog (ex.: blog.finmoovi.com) */
export const BLOG_HOST = new URL(config.siteUrl).hostname;

/** Nome da marca (ex.: FinMoovi) */
export const BRAND_NAME = config.brand.name;

/** Nome completo do blog (ex.: FinMoovi Blog) */
export const BLOG_NAME = `${config.brand.name} ${config.brand.blogSuffix}`.trim();

/** Domínio principal do produto (ex.: finmoovi.com) */
export const MAIN_DOMAIN = config.brand.domains.main;

/** URL do app/produto (ex.: https://finmoovi.com) */
export const APP_URL = config.app.url;

/** Autor padrão (E-E-A-T) */
export const AUTHOR = config.content.defaultAuthor;

/** Bot de commits automáticos */
export const BOT_NAME = config.bot.name;
export const BOT_EMAIL = config.bot.email;

/** Nicho por idioma + keywords núcleo */
export const NICHE = config.content.niche;
export const NICHE_KEYWORDS = config.ai.nicheKeywords;

/** User-Agent padronizado (ex.: FinMoovi-Webmention/1.0) */
export const userAgent = (feature) => `${BRAND_NAME}-${feature}/1.0`;

/** Slug de tag simples (sem acento/espaço), p/ dev.to, hashtags etc. */
export const tagSlug = (s) =>
  String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '');
