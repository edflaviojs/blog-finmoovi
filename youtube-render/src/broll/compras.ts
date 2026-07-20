// Dados REAIS da tela de Compras / Modo Compras (gravação app-rec.mp4, ~745s).
// Fonte única p/ estilos nativos; footage usa `footageFrame`.
export const compras = {
  titulo: 'Modo Compras',
  data: '20/07/2026',
  itens: [
    { nome: 'Feijão', qtd: '1 kg', unidade: 'R$ 1,99/kg', valor: 'R$ 1,99', v: 1.99 },
    { nome: 'Bolacha', qtd: '2 un', unidade: 'R$ 3,99/un', valor: 'R$ 7,98', v: 7.98 },
    { nome: 'Açúcar', qtd: '2 kg', unidade: 'R$ 0,99/kg', valor: 'R$ 1,98', v: 1.98 },
  ],
  total: 'R$ 11,95',
  totalValue: 11.95,
  // trimBefore (frames, 30fps) p/ estilos footage mostrarem o Modo Compras
  footageFrame: 22350,
};
