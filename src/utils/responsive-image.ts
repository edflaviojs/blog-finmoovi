import { existsSync } from 'fs';
import { join } from 'path';

/**
 * Monta o `srcset` responsivo (400w / 800w / 1200w) de uma capa .webp em /images/...
 * Inclui apenas as variantes que realmente existem no disco (evita 404 em imagens
 * antigas sem variante). Retorna undefined se não houver variante — aí o <img> usa
 * só o `src` normal (sem regressão).
 *
 * Variantes geradas em build/batch: `nome-400.webp`, `nome-800.webp` (base = 1200w).
 */
export function imgSrcset(src?: string): string | undefined {
  if (!src || !src.toLowerCase().endsWith('.webp')) return undefined;
  const base = src.replace(/\.webp$/i, '');
  const parts: string[] = [];
  for (const w of [400, 800]) {
    if (existsSync(join(process.cwd(), 'public', `${base}-${w}.webp`))) {
      parts.push(`${base}-${w}.webp ${w}w`);
    }
  }
  if (parts.length === 0) return undefined;
  parts.push(`${src} 1200w`);
  return parts.join(', ');
}
