// Dados REAIS da tela de Balanço Mensal (gravação app-rec.mp4, ~640s).
// Fonte única p/ estilos nativos; footage usa `footageFrame`.
export const balanco = {
  mes: 'Julho 2026',
  totalReceitas: 'R$ 10.000,00',
  receitasValue: 10000,
  totalDespesas: 'R$ 5.044,99',
  despesasValue: 5044.99,
  saldoFinal: 'R$ 4.955,01',
  saldoFinalValue: 4955.01,
  saldoContas: 'R$ 6.604,93',
  // Maiores despesas por categoria (% do total de despesas)
  categorias: [
    { nome: 'Aluguel', pct: 29.7, valor: 'R$ 1.500,00', cor: '#22d3ee' },
    { nome: 'Faculdade', pct: 29.7, valor: 'R$ 1.500,00', cor: '#84cc16' },
    { nome: 'iPhone', pct: 18.8, valor: 'R$ 950,00', cor: '#8b5cf6' },
    { nome: 'Seguro Carro', pct: 6.9, valor: 'R$ 350,00', cor: '#ef4444' },
    { nome: 'Supermercado', pct: 4.7, valor: 'R$ 235,89', cor: '#d6219c' },
    { nome: 'Outros', pct: 10.2, valor: '', cor: '#475569' },
  ],
  // trimBefore (frames, 30fps) p/ estilos footage mostrarem o Balanço
  footageFrame: 19200,
};
