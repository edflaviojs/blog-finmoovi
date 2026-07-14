/**
 * Generate Brand CSS Tokens
 * Reads site.config.ts and outputs CSS custom properties for brand colors
 *
 * Run: node --import tsx scripts/generate-brand-css.js
 */

import { writeFileSync } from 'fs';
import { join } from 'path';
import { config } from '../site.config.ts';

/** Converte #RRGGBB em triplet "R, G, B" (para uso em rgba(var(--x), a)). */
function hexToRgbTriplet(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const n = parseInt(full, 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

const background = config.brand.colors.background || '#0d1117';

const css = `/* ═══════════════════════════════════════════════════════════
 * BRAND TOKENS — Auto-generated from site.config.ts
 * DO NOT EDIT MANUALLY — run: npm run generate
 * ═══════════════════════════════════════════════════════════ */

:root {
  --brand-name: '${config.brand.name}';
  --brand-gradient-start: ${config.brand.colors.ctaGradientStart};
  --brand-gradient-end: ${config.brand.colors.ctaGradientEnd};
  --brand-primary: ${config.brand.colors.primary};
  --brand-primary-rgb: ${hexToRgbTriplet(config.brand.colors.primary)};
  --brand-cyan-rgb: ${hexToRgbTriplet(config.brand.colors.ctaGradientStart)};
  --brand-secondary: ${config.brand.colors.secondary};
  --brand-accent-green: ${config.brand.colors.accentGreen};
  --brand-accent-red: ${config.brand.colors.accentRed};
  --brand-background: ${background};
  --brand-gradient: linear-gradient(135deg, ${config.brand.colors.ctaGradientStart} 0%, ${config.brand.colors.ctaGradientEnd} 100%);
}
`;

const outputPath = join(process.cwd(), 'src', 'styles', 'brand-tokens.css');
writeFileSync(outputPath, css, 'utf-8');
console.log(`✅ Generated: ${outputPath}`);
