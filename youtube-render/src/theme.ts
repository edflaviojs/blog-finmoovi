// Tokens da marca FinMoovi para o render (paleta Elite Hybrid + gradiente do canal).
// Fonte: system stack pesada por ora; upgrade p/ Inter/Unbounded fica p/ o polimento.
export const BRAND = {
  bg: '#0d1117',
  panel: '#161b22',
  cyan: '#22d3ee',
  violet: '#8b5cf6',
  magenta: '#d6219c',
  text: '#f0f6fc',
  sub: '#9ca3af',
  gradient: 'linear-gradient(100deg, #22d3ee 0%, #8b5cf6 50%, #d6219c 100%)',
  font: '"Segoe UI", Arial, sans-serif',
};

// Texto com preenchimento em gradiente (usado em números/títulos)
export const gradientText = {
  background: BRAND.gradient,
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
} as const;
