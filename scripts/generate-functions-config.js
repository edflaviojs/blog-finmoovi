/**
 * Generate Functions Config
 * Reads site.config.ts and outputs a JSON file for Cloudflare Functions
 * (CF Functions cannot import TypeScript at runtime)
 *
 * Run: node --import tsx scripts/generate-functions-config.js
 */

import { writeFileSync } from 'fs';
import { join } from 'path';
import { config } from '../site.config.ts';

const output = {
  brandName: config.brand.name,
  blogTitle: `${config.brand.name} ${config.brand.blogSuffix}`,
  siteUrl: config.siteUrl,
  appUrl: config.app.url,
  appName: config.app.name,
  allowedOrigins: [
    `https://${config.brand.domains.blog}`,
    `https://${config.brand.domains.cfPages}`,
    'http://localhost:4321',
  ],
  emailFrom: config.email.from,
  emailReplyTo: config.email.replyTo,
  domains: config.brand.domains,
  colors: {
    gradientStart: config.brand.colors.ctaGradientStart,
    gradientEnd: config.brand.colors.ctaGradientEnd,
    primary: config.brand.colors.primary,
  },
  app: {
    name: config.app.name,
    url: config.app.url,
    ctaText: config.app.ctaText,
    ctaNote: config.app.ctaNote,
    features: config.app.features,
  },
};

const outputPath = join(process.cwd(), 'functions', '_config.json');
writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
console.log(`✅ Generated: ${outputPath}`);
