/**
 * Site Configuration Type Definitions
 * This file defines the shape of the central config used across the entire template.
 */

export interface LocaleStrings {
  pt: string;
  en: string;
  es: string;
}

export interface BrandLogo {
  /** SVG path data for the logo icon */
  svgPath: string;
  /** Gradient start color (hex) */
  gradientStart: string;
  /** Gradient end color (hex) */
  gradientEnd: string;
}

export interface BrandColors {
  /** Primary accent color (links, highlights) */
  primary: string;
  /** Secondary accent */
  secondary: string;
  /** CTA gradient start */
  ctaGradientStart: string;
  /** CTA gradient end */
  ctaGradientEnd: string;
  /** Success/positive color */
  accentGreen: string;
  /** Error/negative color */
  accentRed: string;
  /** Dark background base (PWA manifest theme/background). Default: #0d1117 */
  background?: string;
}

export interface BrandDomains {
  /** Main product/app domain (e.g., myapp.com) */
  main: string;
  /** Blog domain (e.g., blog.myapp.com) */
  blog: string;
  /** Email sending domain (e.g., email.myapp.com) */
  email: string;
  /** Cloudflare Pages preview domain */
  cfPages: string;
}

export interface Brand {
  name: string;
  blogSuffix: string;
  tagline: LocaleStrings;
  logo: BrandLogo;
  colors: BrandColors;
  domains: BrandDomains;
}

export interface CategoryNavItem {
  /** Category slug (must exist in `categories`) */
  slug: string;
  /** Display label shown in header/mobile/footer menus */
  label: string;
}

export interface ContentConfig {
  /** Post categories for this niche (used in frontmatter schema) */
  categories: readonly string[];
  /** Glossary/term categories */
  glossaryCategories: readonly string[];
  /** Single source of truth for the "Categorias" menu (header + mobile + footer) */
  categoryNav: readonly CategoryNavItem[];
  /** Niche description per locale (used in AI prompts and meta) */
  niche: LocaleStrings;
  /** Default author name for posts */
  defaultAuthor: string;
  /** Default SEO keywords per locale */
  defaultKeywords: LocaleStrings;
}

export interface AppConfig {
  /** Name of the product/app being promoted */
  name: string;
  /** URL of the product/app */
  url: string;
  /** Key features of the app (shown in CTAs) */
  features: { pt: string[]; en: string[]; es: string[] };
  /** CTA button text */
  ctaText: LocaleStrings;
  /** CTA card/banner title */
  ctaTitle: LocaleStrings;
  /** Small note below CTA */
  ctaNote: LocaleStrings;
  /** Schema.org SoftwareApplication applicationCategory (e.g., FinanceApplication) */
  schemaCategory?: string;
  /** Schema.org offer priceCurrency (e.g., BRL, USD) */
  priceCurrency?: string;
}

export interface SocialConfig {
  twitter?: string;
  instagram?: string;
  linkedin?: string;
  github?: string;
  youtube?: string;
  facebook?: string;
  pinterest?: string;
  bluesky?: string;
  substack?: string;
}

export interface AnalyticsConfig {
  /** Cloudflare Web Analytics beacon token */
  cloudflareBeaconToken?: string;
}

export interface GiscusConfig {
  repo: string;
  repoId: string;
  category: string;
  categoryId: string;
}

export interface EmailConfig {
  /** From address for transactional emails */
  from: string;
  /** Reply-to address */
  replyTo: string;
}

export interface SeasonalTopic {
  month: number;
  day: number;
  topic: string;
  keywords: string[];
}

export interface ComparisonTopic {
  a: string;
  b: string;
  keywords: string[];
}

export interface AIConfig {
  /** System prompt personality for AI content generation */
  personality: string;
  /** Core niche keywords for SEO and content generation */
  nicheKeywords: string[];
  /** Daily tips topics pool */
  dailyTopics: string[];
  /** Seasonal calendar (for auto seasonal posts) */
  seasonalCalendar: SeasonalTopic[];
  /** Comparison topics (X vs Y posts) */
  comparisonTopics: ComparisonTopic[];
  /** Product solutions topics (how the app solves problems) */
  solutionTopics: Array<{ topic: string; keywords: string[] }>;
}

export interface BotConfig {
  /** Git bot name for automated commits */
  name: string;
  /** Git bot email */
  email: string;
}

export interface CloudflareConfig {
  /** Cloudflare Pages project name */
  projectName: string;
  /** KV namespace ID for newsletter (optional) */
  kvNamespaceId?: string;
}

export interface SiteConfig {
  /** Site display name */
  siteName: string;
  /** Full production URL (with https://) */
  siteUrl: string;
  /** Site description per locale */
  siteDescription: LocaleStrings;
  /** Default locale */
  defaultLocale: 'pt' | 'en' | 'es';
  /** All supported locales */
  locales: readonly string[];

  brand: Brand;
  content: ContentConfig;
  app: AppConfig;
  social: SocialConfig;
  analytics: AnalyticsConfig;
  giscus: GiscusConfig;
  email: EmailConfig;
  ai: AIConfig;
  bot: BotConfig;
  cloudflare: CloudflareConfig;
}
