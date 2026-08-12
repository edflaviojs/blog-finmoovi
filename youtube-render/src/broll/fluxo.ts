// Dados REAIS da tela de Fluxo de Caixa (gravação app-rec.mp4, ~590s:
// "Fluxo de Caixa — Análise completa do seu fluxo financeiro"). Fonte única
// p/ os estilos nativos; footage usa `footageFrame`.
export const fluxo = {
  /**
   * ⚠️ **O SUBTÍTULO E A COR SÃO DADOS — 12/08/2026.**
   *
   * O mês (*"Julho 2026"*) é da gravação e nenhuma história o diz. E o saldo do período
   * estava pintado de VERDE fixo: numa história em que sai mais do que entra, verde diz
   * *"sobrou dinheiro"* — a mentira mais cara que esta tela podia contar.
   *
   * Ficam aqui com o valor de sempre; o vídeo longo põe os seus por cima e **o Short lê
   * estes**. Ver `broll/valores-da-historia`.
   */
  subtitulo: 'Julho 2026',
  liquidoCor: '#22c55e',
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
