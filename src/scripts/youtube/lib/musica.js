/**
 * A MÚSICA DO CANAL — o SÍTIO ÚNICO que diz qual é a faixa, o que ela obriga, e
 * qual delas toca em cada vídeo.
 *
 * ═══ POR QUE ESTE FICHEIRO EXISTE (02/08/2026) ═══
 * A faixa anterior era um placeholder com licença CC BY, que obriga a creditar o autor
 * na descrição do vídeo. Esse aviso estava escrito — em português, em maiúsculas — no
 * `public/music/CREDITS.md`, desde 21/07. **Nove vídeos foram ao ar sem o crédito**,
 * porque nada no código lia esse aviso. É o mesmo padrão de sempre neste repositório:
 * *o que não é verificado por código não acontece* (IMPLEMENTACAO20 §23.1).
 *
 * A cura não é lembrarmo-nos melhor. É a informação da licença viver AQUI, ao lado de
 * quem monta a descrição — e a descrição passar a lê-la. Foi essa máquina que depois
 * permitiu escolher faixas com licença sem medo nenhum.
 */

/**
 * AS TRÊS FAIXAS — escolhidas pelo OUVIDO do dono, não pelo meu.
 *
 * A 1ª tentativa foi gerá-las por código (`gerar-trilha.js`), para não haver licença
 * nenhuma. O dono ouviu duas versões e reprovou as duas: *"achei muito triste"* e
 * depois *"está desanimador! A outra tinha tipo uma guitarra dando um peso, um ritmo
 * a mais… tem que ser uma música que se adapta a apps financeiros, estilo comercial
 * de televisão"*. Uma trilha profissional tem produção — guitarra, baixo e bateria
 * tocados — e isso não se sintetiza com senos.
 *
 * ⚠️ A lição de método: **eu não oiço.** Meço tom, andamento e brilho — e foi assim
 * que se descobriu que a minha 1ª estava em tom MENOR e a metade da velocidade, e que
 * uma candidata que parecia boa ("B-Roll") também estava em menor. Mas *"soa a
 * comercial de banco"* é ouvido, e o ouvido é do dono.
 *
 * Cortadas aos 75s (um Short nunca passa de 60) e recomprimidas: as três juntas pesam
 * o mesmo que a faixa única inteira pesava.
 */
export const TRILHAS = [
  {
    id: 'rock',
    ficheiro: 'music/bg-rock.mp3',
    titulo: 'Cool Rock',
    autor: 'Kevin MacLeod (incompetech.com)',
    licenca: 'CC BY 4.0',
    exigeCredito: true,
    linhaDeCredito: 'Música: "Cool Rock" by Kevin MacLeod (incompetech.com) — Licensed under CC BY 4.0',
    clima: 'alerta',   // guitarra elétrica, baixo e bateria · 128 bpm · tom maior
  },
  {
    id: 'leve',
    ficheiro: 'music/bg-leve.mp3',
    titulo: 'Guiton Sketch',
    autor: 'Kevin MacLeod (incompetech.com)',
    licenca: 'CC BY 4.0',
    exigeCredito: true,
    linhaDeCredito: 'Música: "Guiton Sketch" by Kevin MacLeod (incompetech.com) — Licensed under CC BY 4.0',
    clima: 'leve',     // violão, baixo e bateria · 112 bpm · tom maior
  },
  {
    id: 'serio',
    ficheiro: 'music/bg-serio.mp3',
    titulo: 'Inspired',
    autor: 'Kevin MacLeod (incompetech.com)',
    licenca: 'CC BY 4.0',
    exigeCredito: true,
    linhaDeCredito: 'Música: "Inspired" by Kevin MacLeod (incompetech.com) — Licensed under CC BY 4.0',
    clima: 'serio',    // guitarra, sintetizadores e percussão · 120 bpm · "para filmes corporativos"
  },
];

/**
 * O CLIMA DE CADA IMAGEM — é isto que liga o TEMA à música.
 *
 * O dono: *"um vídeo usa uma, no outro usa outra, ou a IA vê o que mais se adapta
 * conforme o tema"*.
 *
 * ⚠️ **NÃO se pergunta ao modelo.** Está MEDIDO neste projeto que, com 8 imagens para
 * escolher, **8 gerações em 8 escolheram a mesma** (§19.9). Com três músicas o modelo
 * arranjaria uma preferida e o canal voltava a ter sempre a mesma — o contrário do
 * que se quer — e ainda custava mais uma chamada por vídeo. É a regra de sempre:
 * *o que se calcula não se pede ao modelo.*
 *
 * A imagem do vídeo já nasce da família do tema (dívida, queda, crescer…), por isso
 * ela é o melhor atalho para o assunto — e vem de graça, já está no roteiro.
 */
const CLIMA_DA_IMAGEM = {
  // dívida, queda, coisas a fugir → ALERTA (a guitarra)
  'bola-de-ferro': 'alerta', ratoeira: 'alerta', 'mochila-pedras': 'alerta', 'areia-movedica': 'alerta',
  escorregao: 'alerta', avalanche: 'alerta', domino: 'alerta', 'castelo-cartas': 'alerta',
  ralo: 'alerta', 'balde-furado': 'alerta', buraco: 'alerta', fumaca: 'alerta',
  // crescer e proteger → LEVE (o violão)
  'bola-neve': 'leve', foguete: 'leve', semente: 'leve', escada: 'leve',
  'guarda-chuva': 'leve', cofre: 'leve', escudo: 'leve', boia: 'leve',
  // decidir, medir, o tempo a passar → SÉRIO (o corporativo)
  balanca: 'serio', bifurcacao: 'serio', 'duas-portas': 'serio', semaforo: 'serio',
  ampulheta: 'serio', relogio: 'serio', vela: 'serio', 'trem-perdido': 'serio',
  'montanha-russa': 'serio', bolha: 'serio', gangorra: 'serio', 'corda-bamba': 'serio',
};

/**
 * Escolhe a faixa deste vídeo.
 *
 * @param fioCondutor  a imagem do vídeo (já escolhida pela família do tema)
 * @param jaPublicados quantos vídeos o canal já publicou — é o que faz a volta girar
 *
 * Duas regras, por esta ordem:
 *  1. **o CLIMA manda** — o tema puxa a música;
 *  2. **mas nunca duas vezes a mesma coisa para sempre**: quando o clima não decide
 *     (imagem desconhecida), roda-se pela contagem de vídeos já publicados, o que
 *     garante que as três saem por igual sem guardar estado novo em lado nenhum.
 */
export function escolherTrilha(fioCondutor, jaPublicados = 0) {
  const clima = CLIMA_DA_IMAGEM[String(fioCondutor || '').trim()];
  const doClima = TRILHAS.filter((t) => t.clima === clima);
  if (doClima.length) return doClima[0];
  // sem clima conhecido: roda, para não cair sempre na primeira
  return TRILHAS[Math.abs(Number(jaPublicados) || 0) % TRILHAS.length];
}

/** A faixa por omissão, para roteiros antigos que não têm o campo `music`. */
export const TRILHA = TRILHAS[0];

/**
 * A FAIXA ANTERIOR — fica registada porque **os vídeos publicados entre 21/07 e
 * 02/08 contêm-na**, e continuam a dever-lhe o crédito. Já foram todos corrigidos
 * por `corrigir-creditos-musica.js`, que lê o texto daqui.
 */
export const TRILHA_ANTERIOR = {
  ficheiro: 'music/bg.mp3',
  titulo: 'Deliberate Thought',
  autor: 'Kevin MacLeod (incompetech.com)',
  licenca: 'CC BY 4.0',
  exigeCredito: true,
  linhaDeCredito: 'Música: "Deliberate Thought" by Kevin MacLeod (incompetech.com) — Licensed under CC BY 4.0',
  ate: '2026-08-02',
};

/**
 * A linha a acrescentar à descrição, ou vazio quando não é devida.
 * ⚠️ Recebe a faixa DESTE vídeo (vem no roteiro): com três faixas a rodar, creditar
 * uma faixa fixa creditaria a música errada em dois vídeos em cada três.
 */
export function creditoDaMusica(trilha = TRILHA) {
  return trilha && trilha.exigeCredito ? String(trilha.linhaDeCredito || '').trim() : '';
}
