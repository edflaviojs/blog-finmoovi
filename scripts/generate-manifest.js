/**
 * Generate PWA Manifest
 * Reads site.config.ts and outputs public/manifest.json
 *
 * Run: node --import tsx scripts/generate-manifest.js
 */

import { writeFileSync } from 'fs';
import { join } from 'path';
import { config } from '../site.config.ts';

const manifest = {
  name: `${config.brand.name} ${config.brand.blogSuffix}`,
  short_name: config.brand.name,
  description: config.siteDescription.pt,
  start_url: '/',
  display: 'standalone',
  background_color: '#0d1117',
  theme_color: '#0d1117',
  icons: [
    {
      src: '/favicon.svg',
      sizes: 'any',
      type: 'image/svg+xml',
    },
  ],
};

const outputPath = join(process.cwd(), 'public', 'manifest.json');
writeFileSync(outputPath, JSON.stringify(manifest, null, 2), 'utf-8');
console.log(`✅ Generated: ${outputPath}`);
