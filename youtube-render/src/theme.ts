import { loadFont as loadDisplay } from '@remotion/google-fonts/Unbounded';
import { loadFont as loadBody } from '@remotion/google-fonts/Inter';

// Fontes da marca: Unbounded (display/números — mesma do app) + Inter (legendas/corpo).
export const DISPLAY = loadDisplay('normal', { weights: ['700', '800', '900'], subsets: ['latin'] }).fontFamily;
export const BODY = loadBody('normal', { weights: ['600', '700', '800'], subsets: ['latin'] }).fontFamily;

// Paleta Elite Hybrid + gradiente do canal.
export const BRAND = {
  bg: '#0d1117',
  panel: '#161b22',
  cyan: '#22d3ee',
  violet: '#8b5cf6',
  magenta: '#d6219c',
  yellow: '#fde047', // destaque quente p/ legenda karaokê (contraste TikTok)
  text: '#f0f6fc',
  sub: '#9ca3af',
  gradient: 'linear-gradient(100deg, #22d3ee 0%, #8b5cf6 50%, #d6219c 100%)',
};

// Texto com preenchimento em gradiente (números/títulos)
export const gradientText = {
  background: BRAND.gradient,
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
} as const;
