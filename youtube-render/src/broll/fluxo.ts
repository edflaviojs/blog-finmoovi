// Dados REAIS da tela de Fluxo de Caixa (gravação app-rec.mp4, ~590s:
// "Fluxo de Caixa — Análise completa do seu fluxo financeiro"). Fonte única
// p/ os estilos nativos; footage usa `footageFrame`.
export const fluxo = {
  title: 'Fluxo de Caixa',
  subtitle: 'Análise completa do seu fluxo financeiro',
  periodo: '01/07 — 31/07/2026',
  saldoAtual: 'R$ 6.604,93',
  saldoAtualValue: 6604.93,
  saldoProjetado: 'R$ 4.955,03',
  saldoProjetadoValue: 4955.03,
  receitas: 'R$ 10.000,00',
  receitasValue: 10000,
  despesas: 'R$ 5.044,99',
  despesasValue: 5044.99,
  transferencias: 'R$ 850,00',
  // saldo líquido do período = receitas - despesas
  liquidoValue: 4955.01,
  // trimBefore (frames, 30fps) p/ estilos footage mostrarem a tela de Fluxo
  footageFrame: 17700,
};
