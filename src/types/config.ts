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
  /** Portal gradient start (section bars, eyebrows, chips). Default: ctaGradientStart */
  portalGradientStart?: string;
  /** Portal gradient end. Default: ctaGradientEnd */
  portalGradientEnd?: string;
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

export interface ToolItem {
  /** Tool page path (e.g., /ferramentas/conversor-moedas) */
  href: string;
  /** Display label per locale */
  label: LocaleStrings;
}

export interface ContentConfig {
  /** Post categories for this niche (used in frontmatter schema) */
  categories: readonly string[];
  /** Glossary/term categories */
  glossaryCategories: readonly string[];
  /** Single source of truth for the "Categorias" menu (header + mobile + footer) */
  categoryNav: readonly CategoryNavItem[];
  /** Tools listed in the home portal rail (and anywhere else tools are promoted) */
  tools: readonly ToolItem[];
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

/** Visual theme of a promo slide/slot (drives the animated gradient) */
export type AdTheme = 'voz' | 'moedas' | 'funil' | 'offline';

/** Visual theme of a seasonal billboard slide (CSS in BillboardCarousel) */
export type SeasonalTheme = 'natal' | 'anonovo' | 'carnaval' | 'blackfriday' | 'maes' | 'ir';

export interface SeasonalEvent {
  /** Unique id, include the year (e.g. 'natal-2026') — occurrences are explicit */
  id: string;
  theme: SeasonalTheme;
  icon: string;
  /** Display window (inclusive), YYYY-MM-DD. Outside it the event is ignored at build. */
  start: string;
  end: string;
  /** Date of the event itself (drives the ticker countdown) */
  eventDate: string;
  /** Locales where the event shows (e.g. Carnaval = ['pt']) */
  locales: readonly string[];
  /** Destination per locale (post, category or tool related to the date) */
  href: LocaleStrings;
  title: LocaleStrings;
  highlight: LocaleStrings;
  text: LocaleStrings;
  cta: LocaleStrings;
  /** Ticker countdown message; '{dias}' is replaced client-side */
  ticker?: LocaleStrings;
  /** Ticker message shown on the event day itself */
  tickerToday?: LocaleStrings;
  /**
   * Site-wide decoration (Fase B): curated SVG touch on the logo (Santa hat,
   * sparkle, confetti...) driven by the event theme. Window defaults to the
   * banner window; set start earlier (e.g. 30 days before) if desired.
   */
  decor?: { start?: string; end?: string };
  /**
   * Approved AI art (Fase C): background image path for the billboard slide
   * (e.g. /images/sazonal/natal-2026-candidato-2.webp). The weekly workflow
   * generates CANDIDATES; a human approves by setting this field. Unset = the
   * slide uses the CSS gradient theme only.
   */
  art?: string;
}

export interface SeasonalConfig {
  /** Explicit occurrences (moving dates change per year — renew annually; past events are ignored) */
  events: SeasonalEvent[];
}

export interface AdBillboardSlide {
  theme: AdTheme;
  icon: string;
  href: string;
  title: LocaleStrings;
  highlight: LocaleStrings;
  text: LocaleStrings;
  cta: LocaleStrings;
}

export interface AdSlotItem {
  theme: AdTheme;
  icon: string;
  href: string;
  title: LocaleStrings;
  text: LocaleStrings;
  cta: LocaleStrings;
}

export interface AdsConfig {
  /** Full-bleed billboard carousel slides (home top/bottom) */
  billboard: AdBillboardSlide[];
  /** Vertical promo in the home rail */
  rail: AdSlotItem;
  /** Horizontal promo strip (home middle, category pages, mid-article) */
  mid: AdSlotItem;
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
  ads: AdsConfig;
  seasonal: SeasonalConfig;
  social: SocialConfig;
  analytics: AnalyticsConfig;
  giscus: GiscusConfig;
  email: EmailConfig;
  ai: AIConfig;
  bot: BotConfig;
  cloudflare: CloudflareConfig;
}
