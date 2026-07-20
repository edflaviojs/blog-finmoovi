// Dados REAIS do Dashboard (coração do app) — extraídos da gravação app-rec.mp4.
// BRL (~0-2min, tema escuro) e EUR (~6min). O dashboard nativo é parametrizado
// por tema (dark/light), idioma (pt/en/es) e moeda (BRL/EUR).

export type Theme = 'dark' | 'light';
export type Lang = 'pt' | 'en' | 'es';
export type Currency = 'BRL' | 'EUR';

// Conjuntos de valores reais por moeda
export const DASH_DATA: Record<Currency, {
  saldo: string; receitas: string; despesas: string;
  contas: { nome: string; valor: string; cor: string; iniciais: string }[];
}> = {
  BRL: {
    saldo: 'R$ 6.604,93',
    receitas: 'R$ 10.000',
    despesas: 'R$ 5.044',
    contas: [
      { nome: 'Nubank', valor: 'R$ 3.754,91', cor: '#820ad1', iniciais: 'nu' },
      { nome: 'Banco do Brasil', valor: 'R$ 2.000,00', cor: '#f9dd16', iniciais: 'BB' },
      { nome: 'Carteira', valor: 'R$ 850,02', cor: '#334155', iniciais: '₩' },
    ],
  },
  EUR: {
    saldo: '1.065,31 €',
    receitas: '1.612,91 €',
    despesas: '813,73 €',
    contas: [
      { nome: 'Nubank', valor: '605,63 €', cor: '#820ad1', iniciais: 'nu' },
      { nome: 'Banco do Brasil', valor: '322,58 €', cor: '#f9dd16', iniciais: 'BB' },
      { nome: 'Carteira', valor: '137,10 €', cor: '#334155', iniciais: '₩' },
    ],
  },
};

// Rótulos por idioma
export const DASH_LABELS: Record<Lang, {
  saldo: string; receitas: string; despesas: string; contas: string;
}> = {
  pt: { saldo: 'Saldo Atual das Contas', receitas: 'Receitas', despesas: 'Despesas', contas: 'Contas' },
  en: { saldo: 'Current Account Balance', receitas: 'Income', despesas: 'Expenses', contas: 'Accounts' },
  es: { saldo: 'Saldo Actual de las Cuentas', receitas: 'Ingresos', despesas: 'Gastos', contas: 'Cuentas' },
};

// Paletas por tema
export const DASH_THEME: Record<Theme, {
  bg: string; grad1: string; grad2: string; text: string; sub: string;
  panelFrom: string; panelTo: string; border: string; shadow: string;
}> = {
  dark: {
    bg: '#0d1117', grad1: '#22d3ee', grad2: '#d6219c', text: '#f0f6fc', sub: '#9ca3af',
    panelFrom: '#1b2230', panelTo: '#12161f', border: 'rgba(255,255,255,0.08)',
    shadow: '0 30px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(139,92,246,0.15)',
  },
  light: {
    bg: '#eef1f6', grad1: '#0891b2', grad2: '#be185d', text: '#0d1117', sub: '#5b6472',
    panelFrom: '#ffffff', panelTo: '#f4f6fa', border: 'rgba(13,17,23,0.08)',
    shadow: '0 24px 60px rgba(31,41,55,0.16), 0 0 0 1px rgba(13,17,23,0.05)',
  },
};

export const dashboard = {
  // trimBefore (frames, 30fps) p/ estilos footage (dashboard BRL escuro ~30s)
  footageFrame: 900,
};
