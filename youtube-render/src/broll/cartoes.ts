// Dados REAIS da tela de Cartões de Crédito (extraídos da gravação app-rec.mp4,
// ~525s: Mastercard Itaú). Fonte única de verdade — todos os estilos NATIVOS
// (3D cards, count-up, …) consomem daqui. Estilos FOOTAGE usam `footageFrame`.
export const cartoes = {
  cardName: 'Mastercard Itaú',
  subtitle: 'Cartão de Crédito • BRL',
  last4: '4820',
  fechamento: 'Fecha dia 17 • Vence dia 25',
  fatura: 'R$ 1.240,00',
  faturaValue: 1240,
  limiteTotal: 'R$ 5.000,00',
  limiteTotalValue: 5000,
  limiteDisponivel: 'R$ 3.760,00',
  limiteDisponivelValue: 3760,
  // trimBefore (frames, 30fps) p/ os estilos footage mostrarem a tela de Cartões
  footageFrame: 15750,
};

// Cor por sinal: verde se ≥0, vermelho se negativo (ex.: estouro de limite).
export const signColor = (n: number): string => (n >= 0 ? '#22c55e' : '#ef4444');

// Formata número em BRL (usado no count-up).
export const brl = (n: number): string =>
  'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
