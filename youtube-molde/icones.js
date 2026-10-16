// OS ÍCONES DA MARCA — traço desenhado por nós (grade 24×24, traço redondo), no lugar dos emojis.
// O robô corre em Linux sem fonte de emoji colorido: um desenho nosso sai igual em qualquer máquina.
// icone(nome, tamanho, cor) devolve um <svg>.
const ICONES = {
  chave: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z',
  tijolo: 'M3 5h18v14H3zM3 9.7h18M3 14.3h18M9 5v4.7M15 9.7v4.6M9 14.3V19',
  escudo: 'M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z',
  cofrinho: 'M5 11a7 6 0 0 1 13-2h2v4l-2 1v3h-3v2h-2v-2H9v2H7v-3a6 6 0 0 1-2-5zM15 9.5h.01M9 7.5h4',
  livro: 'M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2zM4 21a2 2 0 0 1 2-2h12v2',
  geladeira: 'M7 2h10v20H7zM7 10h10M10 5v2M10 13v3',
  broto: 'M12 21v-9M12 12c0-4 3-6 7-6 0 4-3 6-7 6zM12 15c0-3-2-5-6-5 0 3 2 5 6 5zM6 21h12',
  casa: 'M3 11l9-8 9 8M5 9.5V21h14V9.5M10 21v-6h4v6',
  sol: 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  presente: 'M3 8h18v4H3zM5 12v9h14v-9M12 8v13M12 8C10 4 6.5 4 7 6.5S12 8 12 8zM12 8c2-4 5.5-4 5-1.5S12 8 12 8z',
  guardachuva: 'M12 3a9 9 0 0 1 9 9H3a9 9 0 0 1 9-9zM12 12v7a2 2 0 0 1-4 0',
  documento: 'M6 2h9l5 5v15H6zM14 2v6h6M9 13h8M9 17h5',
  balanca: 'M12 3v18M7 21h10M5 7h14M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z',
  raio: 'M13 2 4 14h7l-1 8 9-12h-7z',
  coracao: 'M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z',
  pulso: 'M3 12h4l2-5 4 10 2-5h6',
  etiqueta: 'M3 3h8l10 10-8 8L3 11zM7.5 7.5h.01',
  caixa: 'M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10',
  ampulheta: 'M6 2h12M6 22h12M7 2c0 6 10 6 10 10S7 16 7 22M17 2c0 6-10 6-10 10s10 4 10 10',
  cartao: 'M2 5h20v14H2zM2 10h20M6 15h4',
  carrinho: 'M3 3h2l2.5 12h11l2-8H6.2M9 20a1 1 0 1 0 0 .01M18 20a1 1 0 1 0 0 .01',
  carro: 'M5 17h14v-5l-2-5H7l-2 5zM5 12h14M7.5 17v2M16.5 17v2M8 14.5h.01M16 14.5h.01',
  dente: 'M7 3c-2.5 0-4 2-3.5 5 .5 3 1.5 4 2 8s1.5 5 2.5 5 1.5-2 2-4 1-3 2-3 1.5 1 2 3 1 4 2 4 2-1 2.5-5 1.5-5 2-8S19.5 3 17 3c-2 0-3 1-5 1S9 3 7 3z',
  telefone: 'M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2z',
  comprimido: 'M10.5 20.5a5 5 0 0 1-7-7l10-10a5 5 0 0 1 7 7zM8.5 8.5l7 7',
  calendario: 'M3 5h18v16H3zM3 10h18M8 3v4M16 3v4',
  lapis: 'M4 20l4-1 11-11-3-3L5 16zM14 6l3 3',
  chama: 'M12 2c3 4 6 7 6 11a6 6 0 0 1-12 0c0-3 2-5 3-7 1 2 2 3 3 3 0-3-1-5 0-7z',
  bolo: 'M4 21V12h16v9M2 21h20M4 16c2 1.5 4 1.5 6 0s4-1.5 6 0 3 1 4 0M12 12V8M12 5.5a1 1 0 1 0 0 .01',
  sacola: 'M5 8h14l-1 13H6zM9 8V6a3 3 0 0 1 6 0v2',
  tela: 'M3 4h18v12H3zM8 20h8M12 16v4M10 8l4 2-4 2z',
  troca: 'M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7',
  setaBaixo: 'M12 3v15M6 12l6 6 6-6M4 21h16',
  nota: 'M2 6h20v12H2zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM6 9v.01M18 15v.01',
}
function icone(nome, tam = 44, cor = 'currentColor') {
  const d = ICONES[nome] || ICONES.nota
  return `<svg width="${tam}" height="${tam}" viewBox="0 0 24 24"><path d="${d}" fill="none" stroke="${cor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
}
if (typeof module !== 'undefined') module.exports = { ICONES, icone }
