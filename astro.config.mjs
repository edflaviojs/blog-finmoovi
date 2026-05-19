import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://blog.finmoovi.com',
  output: 'static',
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
