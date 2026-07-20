// Dados REAIS do Smart Capture = "FinMoovi Quick" (gravação app-rec.mp4, ~775s):
// 4 modos de captura de despesa. Fonte única p/ estilos nativos; footage usa footageFrame.
export const smartCapture = {
  titulo: 'FinMoovi Quick',
  subtitulo: 'Registre uma despesa em segundos',
  modos: [
    { nome: 'Texto', desc: 'Digite e pronto', cor: '#2563eb', icon: 'T' },
    { nome: 'Voz', desc: 'Só falar', cor: '#8b5cf6', icon: '🎤' },
    { nome: 'Imagem', desc: 'Foto do recibo', cor: '#ea580c', icon: '🖼️' },
    { nome: 'Compras', desc: 'No mercado', cor: '#16a34a', icon: '🛒' },
  ],
  // exemplo do fluxo de voz
  vozFala: '"Almoço 32 reais"',
  vozResultado: 'R$ 32,00',
  // trimBefore (frames, 30fps) p/ footage mostrar o menu FinMoovi Quick
  footageFrame: 23250,
};
