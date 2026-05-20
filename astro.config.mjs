import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://blog.finmoovi.com',
  output: 'static',
  i18n: {
    defaultLocale: 'pt',
    locales: ['pt', 'en', 'es'],
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
