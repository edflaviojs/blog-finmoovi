/**
 * A INTENÇÃO DA VOZ — as respirações, as vírgulas e os pontos (04/08/2026).
 *
 * ═══ O PEDIDO ═══
 * *"temos que passar um sentimento pro locutor… ele tem que entender as respirações,
 * as vírgulas, pontos. Para não deixar nada mecanizado."*
 *
 * ═══ O QUE FALTAVA, E NÃO ERA O LOCUTOR ═══
 * O `limparFala()` já arruma a pontuação e o prompt já manda *"pontuação é respiração,
 * não gramática"*. Mas depois disso o texto seguia para o motor **de uma vez só**, e um
 * pedido único é lido com a mesma cara do princípio ao fim: mesma velocidade em todas as
 * frases, a mesma pausa em todos os pontos, nenhum peso no número que é o assunto do
 * vídeo. Não é o locutor que é mecânico — é o que lhe damos a ler.
 *
 * ═══ 🔴 O CAMINHO ÓBVIO NÃO FUNCIONA, E ISSO FOI MEDIDO ═══
 * A documentação do `msedge-tts` diz, com todas as letras, que o texto *"can include
 * SSML elements"*. Escrevi a camada inteira em SSML — `<break>`, `<prosody>`, `<emphasis>`
 * — e o motor **recusou todas as variantes**, incluindo a mais simples possível:
 *
 * | o que se enviou | resultado |
 * |---|---|
 * | `Primeira frase.<break time="400ms"/> Segunda.` | ✗ ligação fechada sem terminar |
 * | `<prosody rate="-5%">uma frase</prosody>` | ✗ idem |
 * | `<prosody rate="+3%">…</prosody>` | ✗ idem |
 * | prosódia aninhada | ✗ idem |
 * | **texto puro** | ✓ |
 *
 * O ponto de leitura em voz alta gratuito do Edge aceita **só a prosódia do próprio
 * pedido** — não deixa marcar nada por dentro. Quatro tentativas, todas com o mesmo
 * erro, antes de eu mudar de caminho.
 *
 * ═══ O CAMINHO QUE FUNCIONA, E É MELHOR ═══
 * Sintetiza-se **frase a frase**, cada uma com o SEU ritmo, e as pausas passam a ser
 * **silêncio de verdade** colado entre os pedaços. Medido no motor real, com a mesma
 * frase: **5,35s** normal · **5,83s** a -8% · **4,97s** a +8% · e o tom desce com o
 * `pitch`. Ou seja: o controlo existe, só não é por marcas.
 *
 * E acaba por ser melhor do que o SSML dava: uma pausa de 320ms marcada é uma sugestão
 * ao motor; 320ms de silêncio colado **são 320ms**.
 *
 * ═══ AS DUAS DECISÕES DE DESENHO ═══
 *
 * **1. A PROSÓDIA É POR FRASE, NÃO POR PALAVRA.** Marcar *"mil e duzentos reais"* com
 * ênfase obrigava a saber onde, no texto, está o número por extenso — e errar o alvo põe
 * a ênfase na palavra errada, que soa pior do que não ter ênfase nenhuma. **Abrandar a
 * frase inteira que traz o número** dá-lhe o mesmo peso, é impossível de falhar, e é o
 * que um locutor humano faz.
 *
 * **2. AS VÍRGULAS SÓ CORTAM ONDE HÁ MESMO UMA VIRAGEM.** Cortar em TODAS as vírgulas
 * daria ~150 pedidos por vídeo e, pior, cada pedaço ganharia entoação de fim de frase —
 * a fala ficaria picada, que é o contrário do que se quer. Cortam-se só as vírgulas
 * seguidas de uma palavra de viragem (*mas*, *só que*, *porque*, *e aí*, *então*), que é
 * onde uma pessoa respiraria mesmo.
 */

/**
 * As pausas, em milissegundos de SILÊNCIO REAL colado entre os pedaços.
 *
 * ⚠️ ESTES VALORES FORAM AFINADOS COM A RÉGUA, e a primeira volta ficou curta.
 * Com 200ms entre frases, o vídeo passou de 345s de fala para **289s** — os pedaços
 * são aparados nas pontas (ver `apararSilencio` no `tts-short.js`), e o que sobrava de
 * ar natural desapareceu todo de uma vez. Medido: 3,33 palavras por segundo, quando um
 * narrador de audiolivro anda nas 2,5-3,0. Ficava a ler depressa, que é o defeito do
 * lado oposto ao que estamos a consertar.
 * Estes valores são os de uma pessoa a contar uma história: ~0,34s a fechar uma frase,
 * quase meio segundo depois de uma pergunta.
 */
export const PAUSAS = {
  /** depois de `?` — uma pergunta precisa de um tempo para quem ouve responder por dentro */
  pergunta: 480,
  /** depois de `.` ou `!` numa frase normal */
  frase: 340,
  /** depois de uma frase CURTA (≤5 palavras). *"Eu já."* é um soco, e um soco precisa de eco */
  soco: 460,
  /** depois de `…` — a suspensão é o próprio sentido */
  suspensao: 420,
  /** na vírgula que antecede uma viragem */
  viragem: 240,
  /**
   * ⚠️ A ATERRAGEM, no fim da cena. Não é enfeite: ao aparar as pontas, o silêncio que
   * o motor punha no fim de cada cena (0,85s, medido) desapareceu, e a distância entre
   * cenas caiu de ~1,55s para os 0,7s que a montagem já acrescenta. Ficava um corte
   * seco a seguir à última palavra. Isto devolve-lhe o fôlego.
   */
  aterragem: 220,
};

/**
 * A velocidade de cada frase. São valores ABSOLUTOS (já com o abrandamento de base
 * lá dentro): um narrador que conta uma história não corre.
 */
export const RITMOS = {
  /** a frase que traz dinheiro abranda: é o número a assentar */
  comNumero: '-9%',
  /** a última frase da cena abranda: é a aterragem antes do corte */
  ultima: '-7%',
  /** a pergunta anda no ritmo normal — a curiosidade tem pressa */
  pergunta: '0%',
  /** o resto alterna, para duas frases seguidas nunca terem a mesma cara */
  alterna: ['-3%', '-5%'],
};

/** O tom. Mexe-se pouco: muito `pitch` faz o locutor soar a desenho animado. */
export const TONS = {
  pergunta: '+3%',
  ultima: '-4%',
  normal: '0%',
};

const MAX_PALAVRAS_SOCO = 5;

/** Pistas de que a frase traz dinheiro — a mesma família que o resto do projeto usa. */
const TEM_DINHEIRO = /R\$|\d|\breais?\b|\bmil\b|\bcentos?\b|\bcem\b/i;

/** As palavras de viragem: onde uma pessoa respira mesmo a meio de uma frase. */
const VIRAGEM = /^(mas|só que|so que|porque|e aí|e ai|então|entao|ou seja|sabe|só|so)\b/i;

const contar = (t) => String(t).trim().split(/\s+/).filter(Boolean).length;

/** Parte um texto em frases, guardando a pontuação com que cada uma acaba. */
export function frasesComPontuacao(texto) {
  const bruto = String(texto || '').trim();
  if (!bruto) return [];
  return (bruto.match(/[^.!?…]+[.!?…]+(\s|$)|[^.!?…]+$/g) || [bruto])
    .map((f) => f.trim()).filter(Boolean);
}

/** Parte uma frase nas vírgulas que antecedem uma viragem. */
export function partirNasViragens(frase) {
  const pedacos = [];
  let resto = frase.trim();
  for (;;) {
    const m = resto.match(/,\s+/);
    if (!m) break;
    const antes = resto.slice(0, m.index + 1); // guarda a vírgula
    const depois = resto.slice(m.index + m[0].length);
    // só corta se o que vem a seguir é uma viragem E os dois lados têm corpo
    if (VIRAGEM.test(depois) && contar(antes) >= 3 && contar(depois) >= 3) {
      pedacos.push({ texto: antes, viragem: true });
      resto = depois;
      continue;
    }
    // não é viragem: procura a vírgula seguinte sem cortar aqui
    const salto = resto.indexOf(m[0], m.index + 1);
    if (salto < 0) break;
    const cabeca = resto.slice(0, salto + 1);
    const cauda = resto.slice(salto + m[0].length);
    if (VIRAGEM.test(cauda) && contar(cabeca) >= 3 && contar(cauda) >= 3) {
      pedacos.push({ texto: cabeca, viragem: true });
      resto = cauda;
      continue;
    }
    break;
  }
  pedacos.push({ texto: resto, viragem: false });
  return pedacos;
}

/** A pausa que se acrescenta DEPOIS desta frase, pelo que ela é. */
export function pausaDepoisDe(frase) {
  const fim = frase.trim().slice(-1);
  if (fim === '?') return PAUSAS.pergunta;
  if (fim === '…') return PAUSAS.suspensao;
  if (contar(frase) <= MAX_PALAVRAS_SOCO) return PAUSAS.soco;
  return PAUSAS.frase;
}

/**
 * ═══ O PLANO DE LEITURA ═══
 * Recebe a narração de uma cena e devolve os pedaços a sintetizar, cada um com o seu
 * ritmo, o seu tom e o silêncio que vem a seguir. Determinístico.
 */
export function planoDeLeitura(narracao) {
  const frases = frasesComPontuacao(narracao);
  if (!frases.length) return [{ texto: String(narracao), rate: '0%', pitch: '0%', pausaMs: 0 }];

  const plano = [];
  frases.forEach((frase, i) => {
    const ehUltima = i === frases.length - 1;
    const ehPergunta = frase.trim().endsWith('?');
    const rate = TEM_DINHEIRO.test(frase) ? RITMOS.comNumero
      : ehUltima ? RITMOS.ultima
        : ehPergunta ? RITMOS.pergunta
          : RITMOS.alterna[i % RITMOS.alterna.length];
    const pitch = ehPergunta ? TONS.pergunta : ehUltima ? TONS.ultima : TONS.normal;

    const partes = partirNasViragens(frase);
    partes.forEach((p, j) => {
      const ultimaParte = j === partes.length - 1;
      plano.push({
        texto: p.texto,
        rate,
        pitch,
        pausaMs: ultimaParte ? (ehUltima ? PAUSAS.aterragem : pausaDepoisDe(frase)) : PAUSAS.viragem,
      });
    });
  });
  return plano;
}

/**
 * A CONFERÊNCIA DE MESA — corre sem rede e sem gastar nada.
 * Ela não julga se soa bem (isso ouve-se); julga o que é VERDADE: que o texto falado é
 * **exatamente** o mesmo, palavra por palavra.
 *
 * ⚠️ É a prova que mais importa deste ficheiro. Um pedaço perdido pelo caminho dá um
 * vídeo com uma frase a menos — e ninguém dá por isso a ler código.
 */
export function conferirPlano(narracao) {
  const plano = planoDeLeitura(narracao);
  const erros = [];

  const junto = plano.map((p) => p.texto).join(' ').replace(/\s+/g, ' ').trim();
  const original = String(narracao).replace(/\s+/g, ' ').trim();
  if (junto !== original) {
    erros.push(`o texto falado mudou:\n     antes: ${original.slice(0, 90)}\n     depois: ${junto.slice(0, 90)}`);
  }
  if (plano.some((p) => !p.texto.trim())) erros.push('há um pedaço vazio no plano');
  if (plano.length > 24) erros.push(`${plano.length} pedaços numa cena — são pedidos a mais ao motor`);

  return erros;
}
