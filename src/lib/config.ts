/**
 * Config Helper Layer
 * Bridge module that all code imports to access site configuration.
 * Provides typed helper functions and the raw config object.
 */

import { config } from '../../site.config';
export { config };

// ─── Brand Helpers ───────────────────────────────────────────────────

export const getSiteName = () => config.siteName;
export const getBrandName = () => config.brand.name;
export const getBlogTitle = () => `${config.brand.name} ${config.brand.blogSuffix}`;
export const getSiteUrl = () => config.siteUrl;
export const getAppUrl = () => config.app.url;
export const getAppName = () => config.app.name;

// ─── Domain Helpers ──────────────────────────────────────────────────

export const getAllowedOrigins = () => [
  `https://${config.brand.domains.blog}`,
  `https://${config.brand.domains.cfPages}`,
  'http://localhost:4321',
];

export const getBlogDomain = () => config.brand.domains.blog;
export const getEmailDomain = () => config.brand.domains.email;

// ─── Content Helpers ─────────────────────────────────────────────────

export const getCategories = () => config.content.categories;
export const getGlossaryCategories = () => config.content.glossaryCategories;
export const getDefaultAuthor = () => config.content.defaultAuthor;
export const getNiche = (locale: string = 'pt') =>
  config.content.niche[locale as keyof typeof config.content.niche] || config.content.niche.pt;

// ─── Locale Helpers ──────────────────────────────────────────────────

export const getDefaultLocale = () => config.defaultLocale;
export const getLocales = () => config.locales;
export const getSiteDescription = (locale: string = 'pt') =>
  config.siteDescription[locale as keyof typeof config.siteDescription] || config.siteDescription.pt;

// ─── CTA Helpers ─────────────────────────────────────────────────────

export const getCtaText = (locale: string = 'pt') =>
  config.app.ctaText[locale as keyof typeof config.app.ctaText] || config.app.ctaText.pt;

export const getCtaNote = (locale: string = 'pt') =>
  config.app.ctaNote[locale as keyof typeof config.app.ctaNote] || config.app.ctaNote.pt;

export const getAppFeatures = (locale: string = 'pt') =>
  config.app.features[locale as keyof typeof config.app.features] || config.app.features.pt;

// ─── Email Helpers ───────────────────────────────────────────────────

export const getEmailFrom = () => config.email.from;
export const getEmailReplyTo = () => config.email.replyTo;

// ─── Bot Helpers ─────────────────────────────────────────────────────

export const getBotName = () => config.bot.name;
export const getBotEmail = () => config.bot.email;

// ─── AI Helpers ──────────────────────────────────────────────────────

export const getAIPersonality = () => config.ai.personality;
export const getAINicheKeywords = () => config.ai.nicheKeywords;
export const getDailyTopics = () => config.ai.dailyTopics;
export const getSeasonalCalendar = () => config.ai.seasonalCalendar;
export const getComparisonTopics = () => config.ai.comparisonTopics;
export const getSolutionTopics = () => config.ai.solutionTopics;

// ─── Colors Helpers ──────────────────────────────────────────────────

export const getBrandColors = () => config.brand.colors;
export const getGradient = () =>
  `linear-gradient(135deg, ${config.brand.colors.ctaGradientStart}, ${config.brand.colors.ctaGradientEnd})`;

// ─── Analytics Helpers ───────────────────────────────────────────────

export const getCloudflareBeacon = () => config.analytics.cloudflareBeaconToken;
export const getGiscusConfig = () => config.giscus;
