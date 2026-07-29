import { defineConfig } from 'astro/config';
import { config } from './site.config.ts';
import { remarkCanonicalLinks } from './src/utils/remark-canonical-links.ts';

export default defineConfig({
  site: config.siteUrl,
  output: 'static',
  // Inlina o CSS (pequeno, ~9KB) no HTML — remove requests render-blocking do caminho crítico.
  build: {
    inlineStylesheets: 'always',
  },
  i18n: {
    defaultLocale: config.defaultLocale,
    locales: [...config.locales],
    routing: {
      prefixDefaultLocale: false
    }
  },
  markdown: {
    // Links internos do corpo do markdown saem com barra final (evita o 308
    // do Cloudflare em cada link interno). Não desativa gfm/smartypants.
    remarkPlugins: [remarkCanonicalLinks],
    shikiConfig: {
      theme: 'github-dark'
    }
  },
  vite: {
    build: {
      cssMinify: true
    }
  }
});
