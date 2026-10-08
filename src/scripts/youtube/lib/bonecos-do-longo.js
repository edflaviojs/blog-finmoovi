/**
 * ♦ O CATÁLOGO DOS BONECOS DO VÍDEO LONGO — 08/10/2026, ordem do dono: *"Já quero que
 * trabalhe nos bonecos novos! Quero o vídeo todo remodelado!"*
 *
 * Os 32 movimentos foram gerados pelo dono na Manus e conferidos um a um em 01/10
 * (memória `finmoovi-boneco-stickman-video`, plano em `docs/BONECO-NO-VIDEO-LONGO.md`).
 * Vivem em `youtube-render/public/manus/_teste-boneco/` e ESTÃO NO GIT (commit `cac71744`)
 * — sem isso o robô renderizava cenas vazias com a corrida verde.
 *
 * ═══ AS COLUNAS ═══
 *  · `significado` — o que o movimento QUER DIZER numa história de dinheiro. É isto que o
 *    leitor (`bonecos-longo.js`) lê para escolher, e não o nome do ficheiro;
 *  · `estagio` — em que momento da história ele cabe. Um boneco a comemorar no gancho
 *    contradiz a voz; ver `ESTAGIOS_POR_PARTE` e `bonecoCabeNaCena`;
 *  · `segundos` — medido com ffprobe (720×1280 a 24fps: 4s, 8s ou 10s);
 *  · `ciclo` — se pode RECOMEÇAR quando a cena é mais comprida do que o clipe. Andar,
 *    morder unhas, olhar o relógio repetem-se bem; uma QUEDA a recomeçar lê-se como
 *    defeito — esses congelam no último fotograma (ver `Boneco` em `longo/telas.tsx`).
 *
 * ⚠️ O nº30 tem uma lista em inglês inventada nos primeiros 3s — o dono viu e mandou usar
 * assim mesmo (01/10). Não voltar a levantar.
 */
export const PASTA_DOS_BONECOS = 'manus/_teste-boneco';

export const BONECOS = [
  { id: 'carregar-peso', ficheiro: '1-carregar-peso.mp4', segundos: 4, ciclo: true, estagio: 'consequencia', significado: 'carregar um saco pesado, curvado — as contas que pesam todo mês' },
  { id: 'susto', ficheiro: '2-susto.mp4', segundos: 4, ciclo: false, estagio: 'gancho', significado: 'levar um susto ao ver alguma coisa — descobrir que o dinheiro não está lá' },
  { id: 'facepalm', ficheiro: '3-facepalm.mp4', segundos: 4, ciclo: false, estagio: 'virada', significado: 'bater a mão na testa — perceber um erro óbvio que estava à frente o tempo todo' },
  { id: 'ombros', ficheiro: '4-ombros.mp4', segundos: 4, ciclo: false, estagio: 'gancho', significado: 'encolher os ombros sem saber — não fazer ideia de para onde o dinheiro foi' },
  { id: 'apontar', ficheiro: '5-apontar.mp4', segundos: 4, ciclo: false, estagio: 'solucao', significado: 'apontar para alguma coisa — mostrar onde está o culpado ou a saída' },
  { id: 'comemorar', ficheiro: '6-comemorar.mp4', segundos: 4, ciclo: false, estagio: 'fechamento', significado: 'pular de alegria com os braços no ar — a conquista, a conta que finalmente bateu' },
  { id: 'correr', ficheiro: '7-correr.mp4', segundos: 4, ciclo: true, estagio: 'consequencia', significado: 'correr com pressa — correr atrás do dinheiro, viver apagando incêndio' },
  { id: 'sentar-derrotado', ficheiro: '8-sentar-derrotado.mp4', segundos: 4, ciclo: false, estagio: 'consequencia', significado: 'sentado no chão, desanimado — a sensação de ter perdido de novo' },
  { id: 'cair', ficheiro: '9-cair.mp4', segundos: 10, ciclo: false, estagio: 'consequencia', significado: 'cair de cara no chão — o tombo financeiro, quando tudo dá errado' },
  { id: 'levantar', ficheiro: '10-levantar.mp4', segundos: 4, ciclo: false, estagio: 'virada', significado: 'levantar-se com esforço e seguir em frente — recomeçar depois do tombo' },
  { id: 'pensando', ficheiro: '11-pensando.mp4', segundos: 4, ciclo: true, estagio: 'virada', significado: 'mão no queixo, a pensar — tentar entender a conta, procurar a explicação' },
  { id: 'proteger', ficheiro: '12-proteger.mp4', segundos: 4, ciclo: true, estagio: 'solucao', significado: 'abraçar alguma coisa com cuidado — proteger o próprio dinheiro' },
  { id: 'peso-leve', ficheiro: '13-peso-leve.mp4', segundos: 4, ciclo: true, estagio: 'fechamento', significado: 'andar tranquilo, leve — viver sem o aperto do fim do mês' },
  { id: 'contar-moedas', ficheiro: '14-contar-moedas.mp4', segundos: 4, ciclo: true, estagio: 'consequencia', significado: 'contar moedas na palma da mão — fazer as contas, ver quanto sobra' },
  { id: 'rasgar-papel', ficheiro: '15-rasgar-papel.mp4', segundos: 4, ciclo: false, estagio: 'consequencia', significado: 'puxar e rasgar um papel com raiva — a irritação com a conta que não fecha' },
  { id: 'bolsos-vazios', ficheiro: '16-bolsos-vazios.mp4', segundos: 4, ciclo: false, estagio: 'consequencia', significado: 'olhar os bolsos vazios — chegar ao fim do mês sem dinheiro' },
  { id: 'bocejar', ficheiro: '17-bocejar.mp4', segundos: 4, ciclo: true, estagio: 'consequencia', significado: 'braços no ar, a bocejar de cansaço — o cansaço de trabalhar e não ver o dinheiro' },
  { id: 'abracar-cofrinho', ficheiro: '18-abracar-cofrinho.mp4', segundos: 4, ciclo: true, estagio: 'solucao', significado: 'abraçar o cofrinho — guardar dinheiro, começar a reserva' },
  { id: 'morder-unhas', ficheiro: '19-morder-unhas.mp4', segundos: 4, ciclo: true, estagio: 'consequencia', significado: 'morder as unhas — a ansiedade com o dinheiro, o medo do saldo' },
  { id: 'bracos-cruzados', ficheiro: '20-bracos-cruzados.mp4', segundos: 8, ciclo: true, estagio: 'consequencia', significado: 'braços cruzados, desconfiado — achar que está tudo sob controle, recusar ver' },
  { id: 'puxar-cabelo', ficheiro: '21-puxar-cabelo.mp4', segundos: 8, ciclo: true, estagio: 'consequencia', significado: 'puxar os cabelos — o desespero de não entender para onde o dinheiro vai' },
  { id: 'relogio', ficheiro: '22-relogio.mp4', segundos: 8, ciclo: true, estagio: 'consequencia', significado: 'olhar o relógio no pulso — o tempo a passar, mês após mês' },
  { id: 'suspiro-alivio', ficheiro: '23-suspiro-alivio.mp4', segundos: 8, ciclo: false, estagio: 'fechamento', significado: 'soltar o ar de alívio — respirar, a folga no orçamento' },
  { id: 'super-heroi', ficheiro: '24-super-heroi.mp4', segundos: 4, ciclo: true, estagio: 'fechamento', significado: 'mãos na cintura, confiante — estar no controle do próprio dinheiro' },
  { id: 'ideia', ficheiro: '25-ideia.mp4', segundos: 4, ciclo: false, estagio: 'virada', significado: 'dedo no ar, ter uma ideia — o momento em que se descobre a saída' },
  { id: 'afogando-dividas', ficheiro: '26-afogando-dividas.mp4', segundos: 10, ciclo: true, estagio: 'consequencia', significado: 'afogar-se rodeado de tubarões e percentagens — ser engolido pelas dívidas e juros' },
  { id: 'escorregar-banana', ficheiro: '27-escorregar-banana.mp4', segundos: 4, ciclo: false, estagio: 'consequencia', significado: 'escorregar numa casca de banana — um deslize pequeno que derruba' },
  { id: 'bravo-carteira-vazia', ficheiro: '28-bravo-carteira-vazia.mp4', segundos: 8, ciclo: false, estagio: 'consequencia', significado: 'a carteira a rasgar-se ao meio — o dinheiro que se perde, a carteira vazia' },
  { id: 'mesa-faturas', ficheiro: '29-mesa-faturas.mp4', segundos: 4, ciclo: true, estagio: 'consequencia', significado: 'mãos na cabeça numa mesa cheia de contas — afogado em boletos e papéis' },
  { id: 'nervoso-dividas-pc', ficheiro: '30-nervoso-dividas-pc.mp4', segundos: 8, ciclo: false, estagio: 'consequencia', significado: 'cara nervosa, a suar, em primeiro plano — o nervoso de olhar os números' },
  { id: 'pesadelo-dividas', ficheiro: '31-pesadelo-dividas.mp4', segundos: 8, ciclo: false, estagio: 'consequencia', significado: 'acordar assustado na cama — perder o sono por causa do dinheiro' },
  { id: 'saltitar-felicidade', ficheiro: '32-saltitar-felicidade.mp4', segundos: 4, ciclo: true, estagio: 'fechamento', significado: 'braços abertos, feliz — a leveza de quem resolveu a vida financeira' },
];

export const BONECO_POR_ID = new Map(BONECOS.map((b) => [b.id, b]));

/**
 * ⚠️ O ESTÁGIO QUE CADA PARTE DO GUIÃO ACEITA — a guarda do plano (§6): *"um boneco de
 * comemorar não entra no gancho do vídeo"*. A virada e a solução só a partir do último
 * ato; o fechamento só no fecho. O problema (gancho/consequência) cabe em qualquer sítio
 * ANTES da virada.
 */
export function bonecoCabeNaCena(boneco, cena, ultimoAto) {
  if (!boneco || !cena) return false;
  if (cena.parte === 'demonstracao' || cena.parte === 'chamada') return false;
  const naVirada = Number(cena.capitulo) >= ultimoAto && ultimoAto > 0;
  if (cena.parte === 'fecho') return ['fechamento', 'solucao', 'virada'].includes(boneco.estagio);
  if (naVirada) return ['virada', 'solucao', 'fechamento'].includes(boneco.estagio);
  // Antes da virada: o problema. Dos movimentos de virada, só os que são DÚVIDA (pensar,
  // bater na testa) cabem aqui — levantar-se ou ter a ideia já seria contar o fim.
  return ['gancho', 'consequencia'].includes(boneco.estagio) || ['pensando', 'facepalm'].includes(boneco.id);
}

/**
 * Quantos bonecos num vídeo. O plano (§6) começou com 8; 🔴 **8 → 16 em 08/10/2026**, o
 * dono a ver o primeiro vídeo com eles: *"Achei que você está usando poucos bonecos!"*.
 * A ilustração desceu para 6 (ver `TETO_DE_ILUSTRACOES`) — disputam o mesmo espaço.
 */
export const TETO_DE_BONECOS = 16;
