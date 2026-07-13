import { defineConfig } from 'astro/config';
import { config } from './site.config.ts';

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
