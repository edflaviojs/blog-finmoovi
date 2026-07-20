// Dados REAIS da tela de Extrato (gravação app-rec.mp4, ~480s: Nubank conciliado).
// Fonte única p/ estilos nativos; footage usa `footageFrame`.
export const extrato = {
  conta: 'Nubank',
  contaCor: '#820ad1',
  contaIniciais: 'nu',
  saldoAtual: 'R$ 3.754,91',
  saldoAtualValue: 3754.91,
  receitas: 'R$ 6.500,00',
  despesas: 'R$ 3.395,09',
  // transações conciliadas (mais recente primeiro), como no app
  transacoes: [
    { nome: 'Saldo inicial', cat: 'Saldo Inicial', valor: '+R$ 1.500,00', tipo: 'in' as const },
    { nome: 'Energia Elétrica', cat: 'Moradia', valor: '-R$ 159,20', tipo: 'out' as const },
    { nome: 'Aluguel', cat: 'Moradia', valor: '-R$ 1.500,00', tipo: 'out' as const },
    { nome: 'Supermercado', cat: 'Alimentação', valor: '-R$ 235,89', tipo: 'out' as const },
  ],
  // trimBefore (frames, 30fps) p/ estilos footage mostrarem o Extrato
  footageFrame: 14400,
};
