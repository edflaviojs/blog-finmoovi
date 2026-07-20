import { BRAND } from './theme';

// Ícone oficial do FinMoovi: 3 pontos conectados formando uma linha ascendente,
// com o gradiente da marca (ciano→violeta→magenta). Vetor — escala sem perda.
export const FinMooviIcon: React.FC<{ size?: number; idSuffix?: string }> = ({ size = 44, idSuffix = 'ic' }) => {
  const gid = `finmoovi-grad-${idSuffix}`;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" style={{ display: 'block' }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="100" x2="100" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={BRAND.cyan} />
          <stop offset="50%" stopColor={BRAND.violet} />
          <stop offset="100%" stopColor={BRAND.magenta} />
        </linearGradient>
      </defs>
      {/* linha ascendente conectando os pontos */}
      <path d="M18 74 L50 46 L82 22" stroke={`url(#${gid})`} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      {/* 3 nós */}
      <circle cx="18" cy="74" r="11" fill={BRAND.cyan} />
      <circle cx="50" cy="46" r="11" fill={BRAND.violet} />
      <circle cx="82" cy="22" r="12" fill={BRAND.magenta} />
    </svg>
  );
};
