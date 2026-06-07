/**
 * Generate Brand CSS Tokens
 * Reads site.config.ts and outputs CSS custom properties for brand colors
 *
 * Run: node --import tsx scripts/generate-brand-css.js
 */

import { writeFileSync } from 'fs';
import { join } from 'path';
import { config } from '../site.config.ts';

const css = `/* ═══════════════════════════════════════════════════════════
 * BRAND TOKENS — Auto-generated from site.config.ts
 * DO NOT EDIT MANUALLY — run: npm run generate
 * ═══════════════════════════════════════════════════════════ */

:root {
  --brand-name: '${config.brand.name}';
  --brand-gradient-start: ${config.brand.colors.ctaGradientStart};
  --brand-gradient-end: ${config.brand.colors.ctaGradientEnd};
  --brand-primary: ${config.brand.colors.primary};
  --brand-secondary: ${config.brand.colors.secondary};
  --brand-accent-green: ${config.brand.colors.accentGreen};
  --brand-accent-red: ${config.brand.colors.accentRed};
  --brand-gradient: linear-gradient(135deg, ${config.brand.colors.ctaGradientStart} 0%, ${config.brand.colors.ctaGradientEnd} 100%);
}
`;

const outputPath = join(process.cwd(), 'src', 'styles', 'brand-tokens.css');
writeFileSync(outputPath, css, 'utf-8');
console.log(`✅ Generated: ${outputPath}`);
