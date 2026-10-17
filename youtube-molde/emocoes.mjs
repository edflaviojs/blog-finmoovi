// AS EMOÇÕES DO BONECO, pelas palavras da frase — partilhadas pelo plano do Short (plano.mjs) e do longo (plano-longo.mjs).
// 17/10/2026, pedido do Ed: o boneco tem de passar sentimento. Cada lista é sem acento e em minúsculas.
// "dinheiro" está em quase toda frase deste canal: vale metade, e só ganha quando não há mais nada.
export const EMOCOES = [
  ['triste', ['faltou', 'faltava', 'faltavam', 'falta', 'perdi', 'perdeu', 'divida', 'dividas', 'chorar', 'chorei', 'triste', 'sozinho', 'apertado', 'apertou', 'sumiu', 'sumia', 'vazio', 'acabou', 'negativo', 'vermelho']],
  ['nervoso', ['raiva', 'nervoso', 'juros', 'multa', 'cobranca', 'cobrou', 'cobra', 'cobram', 'atrasada', 'atrasou', 'atraso', 'caro', 'absurdo', 'irritado', 'estresse', 'briga', 'culpado']],
  ['susto', ['susto', 'assustei', 'assustadora', 'choque', 'vibrou', 'inacreditavel', 'assustou', 'gritou', 'escaparem', 'escapando', 'tremi', 'quebrou', 'estragou']],
  ['feliz', ['sobrou', 'sobra', 'sobrava', 'consegui', 'guardei', 'guardar', 'alivio', 'tranquilo', 'feliz', 'livre', 'liberdade', 'aposentar', 'aposenta', 'economizei', 'reserva', 'mudou', 'paz', 'leve']],
  ['pensativo', ['pensei', 'pensava', 'achava', 'achei', 'entender', 'entendi', 'descobrir', 'descobri', 'procurar', 'procurava', 'procurando', 'sera', 'duvida', 'ideia', 'perguntei', 'pergunta', 'lembrava', 'lembrar', 'imaginei']],
  ['vergonha', ['vergonha', 'culpa', 'culpei', 'arrependo', 'arrependi', 'esqueci', 'esquecidas', 'esquecida', 'admitir', 'confesso']],
  ['sono', ['rotina', 'repetia', 'repete', 'cansado', 'cansei', 'chato', 'devagar']],
  ['suor', ['conta', 'contas', 'boleto', 'boletos', 'fatura', 'pagar', 'paguei', 'pagava', 'parcela', 'parcelas', 'aluguel', 'cartao']],
  ['dinheiro', ['dinheiro', 'salario', 'ganho', 'ganhar', 'investir', 'rendeu', 'rende', 'lucro', 'pix']],
]
// a emoção de uma frase (palavras já sem acento), nunca igual à de antes
export function escolherEmocao(palavras, antes) {
  const nota = EMOCOES.map(([nome, lista]) => [nome, palavras.filter((w) => lista.includes(w)).length * (nome === 'dinheiro' ? 0.5 : 1)]).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1])
  const escolha = nota.find(([nome]) => nome !== antes)
  if (escolha) return escolha[0]
  return antes === 'fala' ? 'neutra' : 'fala'
}
