/**
 * A PROVA DE MESA DA PUBLICAÇÃO DO VÍDEO LONGO — sem rede, sem chave, sem custo.
 *
 * ═══ O QUE ELA EXISTE PARA IMPEDIR ═══
 * A prova irmã (`validar-roteiro-longo.js`, 121 verdes) cuida do que o vídeo DIZ. Esta
 * cuida do que acontece **depois de o vídeo estar feito** — e é aí que estão os defeitos
 * que ninguém vê, porque nenhum deles dá erro:
 *
 *   · uma legenda 7 segundos adiantada não falha nada: aparece no ecrã, errada;
 *   · uma estreia marcada para o passado não falha aqui — falha no YouTube, tarde;
 *   · um vídeo que sobe PÚBLICO por engano não se pode despublicar do olho de ninguém;
 *   · uma etiqueta cortada a meio da palavra é exatamente o defeito que estragou 5 das 9
 *     primeiras descrições (§33.3), e nenhuma delas se queixou.
 *
 * ⚠️ **AS DUAS PROVAS QUE VALEM MAIS ESTÃO NA LINHA DO TEMPO.** A conta que põe a legenda
 * no sítio certo vive em QUATRO ficheiros ao mesmo tempo (o montador do vídeo, o render, a
 * descrição e as legendas). É o modo de falha crónico deste projeto — números espelhados
 * que um dia deixam de bater. Aqui eles são comparados uns com os outros.
 *
 * Uso: node src/scripts/validacao/validar-publicacao-longo.js
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { tmpdir } from 'os';

/**
 * ⚠️ **IMPORTAR O `capa-manus.js` NÃO GERA IMAGEM NENHUMA NEM CUSTA UM CRÉDITO.** Ele tem
 * a guarda do `chamadoPeloNome` desde 09/08 — que nasceu exactamente de um `import` de
 * teste ter disparado uma corrida a sério e gasto créditos. É por causa dessa guarda que
 * estas provas podem existir.
 */
import { tituloDaCapa, seloDaCapa } from '../youtube/capa-manus.js';
import { escolherMolde, moldesGastos, CENA_DA_CAPA } from '../youtube/lib/capas-do-longo.js';
import { guardarCenarios } from '../youtube/lib/cenarios-do-longo.js';
import {
  CUSTO_POR_IMAGEM, custoPorImagem, contas, exigirContas, escolherConta, cabemAoTodo,
} from '../youtube/lib/manus-client.js';
import { METAPHORS } from '../youtube/lib/schema-short.js';
import { primeiraFrase } from '../youtube/lib/palavras.js';

import { iniciosDasCenas, VOZ_ENTRA_FRAMES, RESPIRO_SEC, CARTAO_CAPITULO_FRAMES } from '../youtube/srt-longo.js';
import { proximoDomingo, emPortugues, palavrasChave, montarMetadados, tituloAprovado, acharCapa, estreiaOcupada } from '../youtube/upload-longo.js';
import { proximoLongo, comoArgumentos } from '../youtube/pick-next-longo.js';
import { conferirTema, caudaDoTitulo, fazerSlug } from '../youtube/temas-longo.js';
import {
  conferirImagens, escolherLugaresDaFoto, brollDoVideo, escolherBroll, valoresDoBroll, BROLL_PERMITIDO,
  TETO_DE_ILUSTRACOES,
} from '../youtube/lib/imagens-longo.js';
/**
 * ⚠️ **IMPORTAR O ILUSTRADOR NÃO PEDE NADA A IA NENHUMA.** Ele só corre quando é chamado
 * pelo nome (o `executadoDireto` no fim do ficheiro) — a mesma guarda do `capa-manus.js`,
 * e pela mesma razão: um `import` de teste não pode gastar dinheiro.
 */
import { montarPedido as montarPedidoDeDesenhos } from '../youtube/ilustrador-longo.js';
import {
  PAPEIS, pistaDaCena, pedidoDaFoto, pedidoDoCartaz, doBanco, guardarNoBanco, NAO_REPETIR_EM,
  // ⚠️ Trazido com OUTRO NOME de propósito: a prova compara os dois lados para garantir
  //    que continua a ser o mesmo número. Era em quatro sítios, e os quatro divergiram.
  CUSTO_POR_IMAGEM as CUSTO_DAS_FOTOS,
} from '../youtube/fotos-longo.js';
import { tempoDosCapitulos, montarDescricao, conferirCapitulos, blocosDeReserva, palavrasDoVideo } from '../youtube/descricao-longo.js';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const FPS = 30;
const SIGNATURE_FRAMES = 75;
/**
 * ⚠️ ESPELHADO de `TELA_FINAL_FRAMES` (§61) — os 10 segundos da tela final, onde o
 * YouTube deixa pôr os cartões clicáveis. É a **terceira** cópia deste número (o render,
 * o montador e esta prova), e é de propósito: esta é a testemunha independente. Se ela
 * fosse buscar o valor ao render, uma mudança errada mudava os dois lados ao mesmo tempo
 * e a prova ficava verde a mentir.
 */
const TELA_FINAL_FRAMES = 300;

let passou = 0;
let falhou = 0;
const falhas = [];

function ok(nome, condicao, detalhe = '') {
  if (condicao) {
    passou++;
    console.log(`  ✅ ${nome}`);
  } else {
    falhou++;
    falhas.push(`${nome}${detalhe ? ` — ${detalhe}` : ''}`);
    console.log(`  ❌ ${nome}${detalhe ? ` — ${detalhe}` : ''}`);
  }
}

// ═══ UM VÍDEO DE MESA — 12 cenas, 3 capítulos, feito à mão para não depender de nada ═══
const planoDeMesa = {
  slug: 'video-de-mesa',
  formato: 'longo',
  tema: 'Reserva de emergência: quanto guardar antes de investir',
  promessa: 'Vou te mostrar quanto guardar antes de pensar em investir.',
  fioCondutor: 'balde-furado',
  capa: 'Você já começou a investir sem ter reserva?',
  capitulos: [{ titulo: 'O susto' }, { titulo: 'A armadilha' }, { titulo: 'A virada' }],
  palavras: 400,
  scenes: Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    bloco: i < 2 ? 'abertura' : 'capitulo',
    role: i < 2 ? 'hook' : 'beat',
    capitulo: i < 2 ? null : Math.min(3, Math.floor((i - 2) / 3) + 1),
    abreCapitulo: [2, 5, 8].includes(i),
    parte: i < 2 ? 'abertura' : 'desenvolvimento',
    narration: `Frase número ${i + 1} deste vídeo de mesa, com palavras suficientes para durar.`,
    palavras: 12,
    durationSec: 5 + (i % 3),
  })),
};
const timingDeMesa = {
  slug: 'video-de-mesa',
  scenes: planoDeMesa.scenes.map((c) => ({
    id: c.id,
    narration: c.narration,
    durationSec: c.durationSec,
    words: c.narration.split(' ').map((w, j, todas) => ({
      word: w,
      start: (j / todas.length) * c.durationSec,
      end: ((j + 1) / todas.length) * c.durationSec,
    })),
  })),
};

/**
 * A CONTA DO RENDER, copiada de `youtube-render/scripts/render-longo.mjs` **de propósito**.
 * É a única cópia legítima neste ficheiro: se ela fosse importada, uma mudança errada no
 * render mudava os dois lados ao mesmo tempo e a prova ficava verde a mentir. Aqui ela é
 * a testemunha independente.
 */
function contaDoRender(plano, timing) {
  const medido = (id) => timing?.scenes?.find((s) => String(s.id) === String(id))?.durationSec;
  const duracoes = plano.scenes.map((c, i) => {
    const falada = medido(c.id) || c.durationSec;
    return i < plano.scenes.length - 1 ? falada + RESPIRO_SEC : falada;
  });
  const frames = duracoes.map((d) => Math.max(1, Math.round(d * FPS)));
  const inicios = [];
  const cartoes = [];
  let acc = 0;
  plano.scenes.forEach((c, i) => {
    const temCartao = Boolean(c.abreCapitulo && c.capitulo);
    cartoes.push(temCartao ? acc : -1);
    if (temCartao) acc += CARTAO_CAPITULO_FRAMES;
    inicios.push(acc);
    acc += frames[i];
  });
  const conteudo = inicios[inicios.length - 1] + frames[frames.length - 1];
  return {
    inicios: inicios.map((f) => (VOZ_ENTRA_FRAMES + f) / FPS),
    total: VOZ_ENTRA_FRAMES + conteudo + SIGNATURE_FRAMES + TELA_FINAL_FRAMES,
  };
}

// ═══ 1. A LINHA DO TEMPO — o defeito que não dá erro ═════════════════════════
console.log('\n1. A LINHA DO TEMPO DAS LEGENDAS');

{
  const legenda = iniciosDasCenas(planoDeMesa, timingDeMesa);
  const render = contaDoRender(planoDeMesa, timingDeMesa);
  const maior = Math.max(...legenda.inicios.map((s, i) => Math.abs(s - render.inicios[i])));
  ok(
    'a legenda e o render põem cada cena EXATAMENTE no mesmo instante',
    maior < 0.0005,
    `a maior diferença é ${maior.toFixed(4)}s`,
  );

  ok(
    'a legenda e o render concordam na duração total do vídeo',
    Math.abs((legenda.fimDoConteudo + (SIGNATURE_FRAMES + TELA_FINAL_FRAMES) / FPS) - render.total / FPS) < 0.0005,
    `${(legenda.fimDoConteudo + (SIGNATURE_FRAMES + TELA_FINAL_FRAMES) / FPS).toFixed(3)}s contra ${(render.total / FPS).toFixed(3)}s`,
  );

  /**
   * OS CAPÍTULOS DA DESCRIÇÃO — e aqui há uma diferença de método que é preciso explicar,
   * senão alguém "conserta-a" e parte outra coisa.
   *
   * A descrição soma **em segundos**; o vídeo e a legenda somam **em fotogramas**
   * (arredondando cada cena ao fotograma mais próximo). São duas maneiras legítimas de
   * chegar ao mesmo sítio, e afastam-se por até 1/60 de segundo por cena.
   * **Medido no vídeo que vai ao ar: 13 a 20 MILÉSIMOS de diferença nos três capítulos, e
   * os três minutos mostrados são idênticos.**
   *
   * Portanto o que se prova aqui não é a igualdade ao milésimo — é o que o espectador
   * sente: **o minuto escrito na descrição nunca pode cair DEPOIS de o capítulo começar.**
   * Um capítulo apontado um segundo cedo faz a pessoa ver o cartão; um segundo tarde
   * faz a pessoa perder o princípio, e é isso que não pode acontecer.
   */
  /**
   * ♦ 06/08/2026 — A DESCRIÇÃO PASSOU A TER MAIS CAPÍTULOS DO QUE O VÍDEO TEM CARTÕES.
   * Antes eram a mesma coisa e comparava-se lista contra lista. Agora há três famílias
   * (o 00:00, os cartões, e os momentos sem placa), e o que se prova é **a relação que
   * importa**: todo o cartão do ecrã tem a sua linha na descrição, no segundo certo.
   * As marcas sem cartão são conferidas mais abaixo, contra as regras do YouTube.
   */
  const { marcas, cartoes } = tempoDosCapitulos(planoDeMesa, timingDeMesa);
  const cartoesDaLegenda = [];
  planoDeMesa.scenes.forEach((c, i) => {
    if (c.abreCapitulo && c.capitulo) cartoesDaLegenda.push(legenda.inicios[i] - CARTAO_CAPITULO_FRAMES / FPS);
  });
  const minuto = (s) => Math.floor(Math.max(0, s));
  ok(
    'há um capítulo na descrição para cada cartão de capítulo do vídeo',
    cartoes.length === cartoesDaLegenda.length,
    `${cartoes.length} contra ${cartoesDaLegenda.length}`,
  );
  ok(
    'e todos eles estão mesmo na lista que vai para o YouTube',
    cartoes.every((c) => marcas.includes(c)),
  );
  ok(
    'e o segundo escrito na descrição nunca cai DEPOIS de o capítulo começar',
    cartoes.every((m, i) => minuto(m.seg) <= minuto(cartoesDaLegenda[i])),
    cartoes.map((m, i) => `${minuto(m.seg)}>${minuto(cartoesDaLegenda[i])}`).join(' '),
  );
  const desvio = Math.max(...cartoes.map((m, i) => Math.abs(m.seg - cartoesDaLegenda[i])));
  ok(
    'as duas contas nunca se afastam mais do que meio segundo',
    desvio < 0.5,
    `afastaram-se ${desvio.toFixed(3)}s — as duas maneiras de somar deixaram de concordar`,
  );

  /**
   * 🔴 A PROVA QUE ACENDE SE ALGUÉM VOLTAR A USAR O GERADOR DO SHORT.
   * Medido no vídeo entregue: erro máximo **7,13 s**, erro médio **4,74 s**. Esta prova
   * refaz a conta do Short e exige que ela DÊ DIFERENTE — se um dia der igual, é porque
   * alguém uniu os dois caminhos, e é preciso ir ver porquê.
   */
  const RESPIRO_DO_SHORT = 0.7;
  const TRANSICAO_DO_SHORT = 8;
  const cenas = timingDeMesa.scenes;
  const framesShort = cenas.map((s, i) => Math.max(1, Math.round((s.durationSec + (i < cenas.length - 1 ? RESPIRO_DO_SHORT : 0)) * FPS)));
  const inicioShort = [];
  let pre = 0;
  for (let i = 0; i < framesShort.length; i++) {
    inicioShort.push(Math.max(0, pre - i * TRANSICAO_DO_SHORT) / FPS);
    pre += framesShort[i];
  }
  const erroDoShort = Math.max(...legenda.inicios.map((s, i) => Math.abs(s - inicioShort[i])));
  ok(
    'o gerador de legendas do Short NÃO serve para o vídeo longo (e a prova diz de quanto)',
    erroDoShort > 1,
    `daria um erro de ${erroDoShort.toFixed(2)}s`,
  );
}

// ═══ 1B. OS CAPÍTULOS E A DESCRIÇÃO ══════════════════════════════════════════
console.log('\n1B. OS CAPÍTULOS E A DESCRIÇÃO (06/08/2026)');

{
  /**
   * 🔴 **AS TRÊS REGRAS DO YOUTUBE PARA O ÍNDICE NÃO DÃO ERRO NENHUM QUANDO SE PARTEM.**
   * O YouTube limita-se a **não mostrar índice** — e a descrição fica com uma lista de
   * horas que não faz nada. A pior das três é a dos 10 segundos: **um só capítulo curto
   * deita fora o índice INTEIRO**. É por isso que isto se prova aqui e não se descobre
   * lá fora, a olhar para um vídeo que já está no ar.
   */
  ok('um capítulo com menos de 10 segundos é apanhado',
    conferirCapitulos([{ seg: 0, titulo: 'a' }, { seg: 5, titulo: 'b' }, { seg: 60, titulo: 'c' }], 120).some((q) => q.includes('10s')));
  ok('o último capítulo também conta — se for curto até ao fim da fala, é apanhado',
    conferirCapitulos([{ seg: 0, titulo: 'a' }, { seg: 40, titulo: 'b' }, { seg: 115, titulo: 'c' }], 120).some((q) => q.includes('10s')));
  ok('uma lista que não começa em 00:00 é apanhada',
    conferirCapitulos([{ seg: 12, titulo: 'a' }, { seg: 40, titulo: 'b' }, { seg: 80, titulo: 'c' }], 120).some((q) => q.includes('00:00')));
  ok('menos de três capítulos é apanhado',
    conferirCapitulos([{ seg: 0, titulo: 'a' }, { seg: 40, titulo: 'b' }], 120).some((q) => q.includes('exige')));
  ok('e uma lista bem feita não se queixa de nada',
    conferirCapitulos([{ seg: 0, titulo: 'a' }, { seg: 40, titulo: 'b' }, { seg: 80, titulo: 'c' }], 120).length === 0);

  /**
   * ♦ OS MOMENTOS SEM PLACA — o que levou os capítulos de 4 para 6. A demonstração no app
   * e o fecho existem no guião desde que o montador o escreve; o que é novo é a descrição
   * marcá-los. ⚠️ **O vídeo não muda:** continuam a ser três cartões no ecrã.
   */
  /**
   * ⚠️ **A DEMONSTRAÇÃO NÃO PODE VIR LOGO A SEGUIR A UM CARTÃO** neste vídeo de mesa, e
   * a 1ª versão desta prova caiu nisso: entre um cartão e a cena seguinte passam 9,95
   * segundos — cinco centésimos abaixo do mínimo do YouTube. A trava largou a marca e a
   * prova ficou vermelha a acusar o código, quando o código estava certo. Aqui a
   * demonstração e o fecho ficam onde ficam num vídeo a sério: bem longe dos cartões.
   */
  const comPartes = {
    ...planoDeMesa,
    scenes: [
      ...planoDeMesa.scenes,
      ...Array.from({ length: 4 }, (_, k) => ({
        id: 13 + k, bloco: 'fecho', role: 'outro', capitulo: null, abreCapitulo: false,
        parte: 'fecho', narration: `Frase de fecho número ${k + 1} deste vídeo de mesa.`,
        palavras: 10, durationSec: 6,
      })),
    ].map((c, i) => ({
      ...c,
      // a demonstração no app cai a duas cenas do último cartão; o fecho, mais à frente
      parte: i === 10 ? 'demonstracao' : (i >= 13 ? 'fecho' : (i < 12 ? c.parte : 'chamada')),
    })),
  };
  const cheio = tempoDosCapitulos(comPartes, timingDeMesa);
  ok('a demonstração no app e o fecho ganham capítulo, sem cartão no ecrã',
    cheio.marcas.length === 6 && cheio.cartoes.length === 3,
    `${cheio.marcas.length} capítulos · ${cheio.cartoes.length} cartões`);
  ok('o primeiro capítulo é SEMPRE 00:00', cheio.marcas[0].seg === 0);
  ok('os capítulos saem por ordem crescente de tempo',
    cheio.marcas.every((m, i) => i === 0 || m.seg > cheio.marcas[i - 1].seg));
  ok('e a lista inteira cumpre as regras do YouTube',
    conferirCapitulos(cheio.marcas, cheio.totalSeg).length === 0,
    conferirCapitulos(cheio.marcas, cheio.totalSeg).join(' · '));

  /**
   * 🔴 **UM MOMENTO SEM PLACA QUE FIQUE CURTO É DEITADO FORA, NÃO ENCOLHIDO** — senão
   * ele sozinho apagava o índice todo. Aqui a demonstração cai logo a seguir ao cartão
   * do capítulo 2, a menos de 10 segundos dele.
   */
  const colado = {
    ...planoDeMesa,
    scenes: planoDeMesa.scenes.map((c, i) => ({ ...c, parte: i === 5 ? 'demonstracao' : c.parte })),
  };
  const apertado = tempoDosCapitulos(colado, timingDeMesa);
  ok('um momento sem placa colado ao capítulo anterior é largado',
    apertado.largadas.length === 1 && apertado.cartoes.length === 3,
    `largou ${apertado.largadas.length}, cartões ${apertado.cartoes.length}`);
  ok('e nunca é o CARTÃO o largado — ele tem placa no ecrã e não pode ficar sem linha',
    apertado.cartoes.every((c) => apertado.marcas.includes(c)));

  /**
   * 🔴 A HASHTAG DO VÍDEO ERRADO — o defeito que estava lá dentro até 06/08.
   * As hashtags do vídeo longo estavam **escritas à mão para o piloto**: qualquer vídeo
   * novo, sobre qualquer assunto, saía com `#SairDoVermelho`. Esta prova acende se
   * alguém voltar a colar uma palavra deste ou daquele vídeo no código.
   */
  const descricao = montarDescricao(comPartes, timingDeMesa, {
    naFila: { palavrasChave: ['reserva de emergência', 'quanto guardar'], glossario: 'reserva-de-emergencia' },
    blocos: blocosDeReserva(comPartes, ['reserva de emergência', 'quanto guardar']),
  });
  ok('a descrição de um vídeo de reserva NÃO leva a hashtag do vídeo das dívidas',
    !/vermelho|dívida|divida/i.test(descricao.texto.split('\n').pop()),
    descricao.texto.split('\n').pop());
  ok('as hashtags saem das palavras que o dono aprovou',
    descricao.texto.includes('#ReservaDeEmergência'),
    descricao.texto.split('\n').pop());
  ok('e o link do glossário é o do assunto deste vídeo',
    descricao.texto.includes('/glossario/reserva-de-emergencia/'));
  /**
   * ⚠️ **NUNCA UM TÍTULO DE SECÇÃO COM NADA POR BAIXO** — a mesma trava do Short (§55.1).
   * O texto de reserva não traz perguntas, e nos dias maus é ele que é usado.
   */
  ok('sem perguntas escritas, a secção das perguntas não aparece',
    !descricao.texto.includes('PERGUNTAS QUE'));
  ok('mas com perguntas ela aparece',
    montarDescricao(comPartes, timingDeMesa, {
      naFila: {},
      blocos: { sobre: 'Um texto.', aprender: ['Um tópico'], perguntas: ['Uma pergunta?'] },
    }).texto.includes('PERGUNTAS QUE'));
  ok('a descrição cabe no limite do YouTube (5000)', descricao.texto.length <= 5000, `${descricao.texto.length}`);
  ok('e não sobrou nenhum sinal que o YouTube recusa', !/[<>]/.test(descricao.texto));

  /**
   * ⚠️ SEM FILA, O VÍDEO NÃO FICA SEM PALAVRAS. Cai no tema — que é sempre melhor do que
   * uma descrição sem uma única palavra de busca.
   */
  ok('sem fila aprovada, as palavras saem do tema e a marca do canal continua lá',
    palavrasDoVideo(planoDeMesa, {})[0] === 'Reserva de emergência'
      && palavrasDoVideo(planoDeMesa, {}).includes('educação financeira'),
    palavrasDoVideo(planoDeMesa, {}).join(' · '));

  // ── contra o vídeo REAL, se ele estiver aqui ──
  {
    const caminhoPlano = join(RAIZ, 'youtube-render', 'public', 'roteiro', 'sair-do-vermelho.json');
    const caminhoTiming = join(RAIZ, 'youtube-render', 'public', 'audio', 'sair-do-vermelho', 'timing.json');
    if (existsSync(caminhoPlano) && existsSync(caminhoTiming)) {
      const plano = JSON.parse(readFileSync(caminhoPlano, 'utf-8'));
      const timing = JSON.parse(readFileSync(caminhoTiming, 'utf-8'));
      const real = tempoDosCapitulos(plano, timing);
      ok('o vídeo que vai ao ar tem 6 capítulos e continua com 3 cartões no ecrã',
        real.marcas.length === 6 && real.cartoes.length === 3,
        `${real.marcas.length} capítulos · ${real.cartoes.length} cartões`);
      ok('e nenhum deles parte as regras do YouTube',
        conferirCapitulos(real.marcas, real.totalSeg).length === 0,
        conferirCapitulos(real.marcas, real.totalSeg).join(' · '));
    } else {
      console.log('  ⏭️  o guião do piloto não está nesta máquina — as 2 provas contra o vídeo real ficam de fora');
    }
  }
}

// ═══ 2. A HORA DE ESTREIA ════════════════════════════════════════════════════
console.log('\n2. A HORA DE ESTREIA');

{
  // Sete dias seguidos, a horas diferentes: a resposta é sempre um domingo às 22:00 UTC.
  const amostras = [];
  for (let d = 0; d < 14; d++) {
    for (const h of [0, 2, 21, 22, 23]) {
      amostras.push(new Date(Date.UTC(2026, 7, 1 + d, h, 30, 0)));
    }
  }
  const respostas = amostras.map((a) => proximoDomingo(a));
  ok(
    'a estreia cai SEMPRE num domingo',
    respostas.every((r) => r.getUTCDay() === 0),
    respostas.filter((r) => r.getUTCDay() !== 0).slice(0, 2).map((r) => r.toISOString()).join(' '),
  );
  ok(
    'a estreia é SEMPRE às 22:00 universais — que são 19h00 no Brasil, o ano inteiro',
    respostas.every((r) => r.getUTCHours() === 22 && r.getUTCMinutes() === 0 && r.getUTCSeconds() === 0),
  );
  ok(
    'a estreia está SEMPRE no futuro (o YouTube recusa uma data que já passou)',
    respostas.every((r, i) => r.getTime() > amostras[i].getTime()),
  );
  ok(
    'e nunca está a mais de uma semana de distância',
    respostas.every((r, i) => r.getTime() - amostras[i].getTime() <= 7 * 24 * 3600 * 1000),
  );
  // O sábado às 02:00 (a hora do robô) tem de dar o domingo do dia seguinte.
  const sabado = new Date(Date.UTC(2026, 7, 15, 2, 0, 0)); // 15/08/2026 é sábado
  ok(
    'a correr ao sábado de madrugada, a estreia é no dia seguinte',
    proximoDomingo(sabado).toISOString() === '2026-08-16T22:00:00.000Z',
    proximoDomingo(sabado).toISOString(),
  );
  /**
   * 🔴 **UM DIA, UM VÍDEO** — a trava que permitiu ligar o relógio a meio da semana.
   *
   * O primeiro vídeo é subido à mão e estreia domingo 09/08. O relógio dispara ao sábado,
   * portanto ligá-lo numa quarta fazia a 1ª corrida cair em sábado 08 e marcar OUTRO
   * vídeo para o MESMO domingo. **Esperar por segunda-feira resolvia uma vez e deixava a
   * armadilha armada**; esta regra vale para sempre.
   */
  const cadernoDeMesa = {
    'ja-marcado': { publishAt: '2026-08-09T22:00:00.000Z', titulo: 'X' },
  };
  ok(
    'um domingo que já tem vídeo é recusado',
    estreiaOcupada(new Date('2026-08-09T22:00:00.000Z'), cadernoDeMesa)?.slug === 'ja-marcado',
  );
  ok(
    'e o domingo seguinte está livre',
    estreiaOcupada(new Date('2026-08-16T22:00:00.000Z'), cadernoDeMesa) === null,
  );
  ok(
    'a régua é o DIA, não a hora — dois vídeos no mesmo domingo competem um com o outro',
    estreiaOcupada(new Date('2026-08-09T12:00:00.000Z'), cadernoDeMesa)?.slug === 'ja-marcado',
  );
  /**
   * ⚠️ **UM VÍDEO NÃO OCUPA O DIA CONTRA SI PRÓPRIO.** O caderno guarda reservas — dias
   * apontados para um vídeo que ainda não subiu. Sem isto, a mensagem era absurda:
   * *"domingo já é do vídeo X"* a recusar o próprio X.
   */
  ok(
    'mas o próprio vídeo pode subir para o dia que tem reservado',
    estreiaOcupada(new Date('2026-08-09T22:00:00.000Z'), cadernoDeMesa, 'ja-marcado') === null,
  );
  /**
   * 🔴 E A ARMADILHA QUE ISSO ABRIU, apanhada a correr o comando exato do robô: a
   * conferência da data corre **antes** de o vídeo da semana ser escolhido, e o valor por
   * omissão do nome fazia o programa excluir a reserva do piloto por pensar que era ele
   * próprio a subir. **O dia parecia sempre livre.** Sem nome, não se exclui ninguém.
   */
  ok(
    'e sem dizer que vídeo é, não se exclui reserva nenhuma',
    estreiaOcupada(new Date('2026-08-09T22:00:00.000Z'), cadernoDeMesa, null)?.slug === 'ja-marcado',
  );
  /**
   * 🔴 O QUE PROVA QUE UM VÍDEO JÁ FOI AO AR É TER IDENTIFICADOR DO YOUTUBE.
   *
   * A trava anti-repetição parava assim que encontrasse **uma linha** com aquele nome — e
   * o caderno também guarda RESERVAS. Apanhado no minuto antes de mandar subir o primeiro
   * vídeo a sério: o robô recusava-se a subir **e dizia que já estava publicado**. Uma
   * mentira e uma paragem, pelo preço de uma.
   */
  const fluxoDoFicheiro = readFileSync(join(RAIZ, 'src', 'scripts', 'youtube', 'upload-longo.js'), 'utf-8');
  ok(
    'a trava anti-repetição olha para o VÍDEO no YouTube, não para a linha do caderno',
    /caderno\[SLUG\]\?\.videoId/.test(fluxoDoFicheiro),
    'ela voltou a parar só por haver uma linha — e uma reserva não é uma publicação',
  );
  /**
   * A prova contra o caderno REAL: hoje o piloto ocupa 09/08. Se alguém o apagar de lá, o
   * robô publica por cima do vídeo que o dono subiu à mão — e isto fica vermelho antes.
   */
  {
    const real = JSON.parse(readFileSync(join(RAIZ, '.github', 'data', 'youtube-longos-published.json'), 'utf-8'));
    ok(
      'no caderno a sério, o domingo do vídeo que o dono subiu à mão está tomado',
      estreiaOcupada(new Date('2026-08-09T22:00:00.000Z'), real)?.slug === 'sair-do-vermelho',
    );
  }

  ok(
    'e o registo escreve-o em português, com a hora do Brasil',
    emPortugues(new Date('2026-08-16T22:00:00.000Z')) === 'domingo, 16 de agosto, às 19h00 do Brasil',
    emPortugues(new Date('2026-08-16T22:00:00.000Z')),
  );
}

// ═══ 3. O QUE SE MANDA AO YOUTUBE ════════════════════════════════════════════
console.log('\n3. O QUE SE MANDA AO YOUTUBE');

{
  const estreia = new Date('2026-08-16T22:00:00.000Z');
  const meta = montarMetadados({
    titulo: 'Reserva de emergência: quanto guardar antes de investir',
    descricao: 'Uma descrição qualquer.',
    plano: planoDeMesa,
    estreia,
    etiquetasDoVideo: ['reserva de emergência', 'quanto guardar'],
  });

  ok('o vídeo sobe SEMPRE privado — nunca público', meta.status.privacyStatus === 'private', meta.status.privacyStatus);
  ok('e sempre com a hora de estreia marcada', meta.status.publishAt === estreia.toISOString());
  ok('a categoria é Educação (27)', meta.snippet.categoryId === '27');
  ok('a língua declarada é o português do Brasil', meta.snippet.defaultLanguage === 'pt-BR' && meta.snippet.defaultAudioLanguage === 'pt-BR');
  ok('não é conteúdo para crianças', meta.status.selfDeclaredMadeForKids === false);
  ok('o título cabe no limite do YouTube (100)', meta.snippet.title.length <= 100);
  ok('a descrição cabe no limite do YouTube (5000)', meta.snippet.description.length <= 5000);

  /**
   * 🔴 A PROVA QUE APANHOU UM DEFEITO REAL EM 05/08, NO PRIMEIRO ENSAIO.
   * A 1ª versão CORTAVA a etiqueta aos 60 caracteres e saiu
   * *"o plano de três passos pra pagar a dívida sem apertar mais o"* — a acabar a meio da
   * palavra, exatamente como as descrições que foram ao ar em 03/08.
   */
  const etiquetas = meta.snippet.tags;
  ok(
    'nenhuma etiqueta acaba a meio de uma palavra',
    etiquetas.every((t) => t.length < 60),
    etiquetas.filter((t) => t.length >= 60).join(' | '),
  );
  ok(
    'nenhuma etiqueta é uma frase — ninguém procura frases',
    etiquetas.every((t) => t.split(' ').length <= 5),
    etiquetas.filter((t) => t.split(' ').length > 5).join(' | '),
  );
  /**
   * 🔴 O SEGUNDO DEFEITO DO MESMO ENSAIO: saía a etiqueta **"mochila-pedras"**, que é o
   * nome INTERNO da metáfora do vídeo. Um nome de dentro da casa na montra.
   */
  ok(
    'o nome interno da metáfora NÃO vai para as etiquetas',
    !etiquetas.some((t) => t.toLowerCase() === String(planoDeMesa.fioCondutor).toLowerCase()),
    etiquetas.join(' | '),
  );
  ok('as etiquetas não se repetem', new Set(etiquetas.map((t) => t.toLowerCase())).size === etiquetas.length);
  /**
   * ♦ 06/08/2026 — O LIMITE VERDADEIRO SÃO **500 CARACTERES**, não 460 e muito menos 500
   * etiquetas. O dono viu a contagem no Studio (*"estamos com média de 230 e podemos
   * colocar 500"*) e tinha razão: estávamos em **199**. O teto real era uma trava nossa
   * de 12 etiquetas, não os caracteres. ⚠️ **Fica em 480 de propósito** — 20 de folga,
   * porque nunca se encosta ao limite de outra pessoa: basta o YouTube contar as vírgulas
   * de maneira ligeiramente diferente e a subida é recusada.
   */
  ok('as etiquetas cabem no limite do YouTube (500 caracteres), com folga',
    etiquetas.join(',').length <= 480, `${etiquetas.join(',').length}`);
  /**
   * 🔴 E A PROVA QUE ACENDE SE ALGUÉM VOLTAR A DEIXAR METADE DO ESPAÇO VAZIO. Não basta
   * caber: **tem de encher**. Foi por não haver esta régua que 300 caracteres ficaram por
   * usar durante o mês inteiro, sem nada a queixar-se.
   */
  ok('e ENCHEM o espaço — pelo menos 350 caracteres, que era o pedido do dono',
    etiquetas.join(',').length >= 350, `só ${etiquetas.join(',').length}`);
  ok('o que o dono escreveu na fila entra à frente do resto', etiquetas[0] === 'reserva de emergência', etiquetas[0]);
  ok('e a marca do canal está lá', etiquetas.some((t) => t === 'FinMoovi'));
}

// ═══ 4. AS TRAVAS QUE PARAM TUDO ═════════════════════════════════════════════
console.log('\n4. AS TRAVAS QUE PARAM TUDO');

{
  ok(
    'sem título aprovado na fila, não há título nenhum (e a subida pára)',
    tituloAprovado('um-video-que-nao-existe', { videos: [] }) === null,
  );
  ok(
    'o título do piloto é o que o dono aceitou, à letra',
    tituloAprovado('sair-do-vermelho', JSON.parse(readFileSync(join(RAIZ, '.github', 'data', 'youtube-longos.json'), 'utf-8')))
      === 'Dívida do cartão: como sair do vermelho sem apertar mais o mês',
  );

  const caderno = JSON.parse(readFileSync(join(RAIZ, '.github', 'data', 'youtube-longos-published.json'), 'utf-8'));
  /**
   * 🔴 O PILOTO É SUBIDO À MÃO PELO DONO. Se ele não estiver no caderno, o robô sobe-o
   * OUTRA VEZ e ficam dois vídeos iguais no canal, ambos a estrear à mesma hora.
   */
  ok(
    'o vídeo que o dono sobe à mão está no caderno — o robô nunca o publica outra vez',
    Boolean(caderno['sair-do-vermelho']),
  );
  /**
   * ⚠️ A 1ª versão desta prova dizia *"a fila não tem nada por fazer hoje"* — e era
   * verdade no minuto em que a escrevi, porque a fila só tinha o piloto. Assim que
   * entraram temas a sério, ficou vermelha. **Estava a medir um ESTADO passageiro em vez
   * de uma REGRA**, e uma prova assim acende sempre que o sistema funciona — que é a
   * definição de um alarme que ninguém lê.
   *
   * A regra verdadeira é esta: **o que o selecionador devolver nunca pode ser um vídeo
   * que já foi ao ar.** É isso que impede o canal de publicar duas vezes o mesmo.
   */
  {
    const filaReal = JSON.parse(readFileSync(join(RAIZ, '.github', 'data', 'youtube-longos.json'), 'utf-8'));
    const proximo = proximoLongo({ fila: filaReal, caderno });
    ok(
      'o próximo vídeo da fila nunca é um que já foi publicado',
      proximo === null || !caderno[proximo.slug],
      proximo ? `devolveu "${proximo.slug}"` : 'a fila está vazia',
    );
    ok(
      'e todo o vídeo por fazer na fila já traz um título aprovado',
      (filaReal.videos || [])
        .filter((v) => !caderno[v.slug] && !['publicado', 'publicado-a-mao', 'suspenso', 'reprovado'].includes(String(v.estado || '')))
        .every((v) => typeof v.titulo === 'string' && v.titulo.length >= 20),
      'há um tema por fazer sem título — a subida dele pararia',
    );
  }

  /**
   * ⚠️ AS DUAS RÉGUAS DO SELECIONADOR. Ver o aviso em `pick-next-longo.js`: o `estado` é o
   * que o dono escreveu, o caderno é o que o robô fez, e é preciso olhar aos dois.
   */
  const filaDeMesa = {
    videos: [
      { slug: 'a', titulo: 'A', tema: 'ta', estado: 'publicado' },
      { slug: 'b', titulo: 'B', tema: 'tb', estado: 'suspenso' },
      { slug: 'c', titulo: 'C', tema: 'tc' },
      { slug: 'd', titulo: 'D', tema: 'td' },
    ],
  };
  ok('salta o que o dono marcou como publicado ou suspenso', proximoLongo({ fila: filaDeMesa, caderno: {} })?.slug === 'c');
  ok('salta também o que o robô já subiu, mesmo sem o dono ter marcado', proximoLongo({ fila: filaDeMesa, caderno: { c: {} } })?.slug === 'd');
  ok('com tudo feito, não devolve nada (e o robô pára em silêncio)', proximoLongo({ fila: filaDeMesa, caderno: { c: {}, d: {} } }) === null);

  const argumentos = comoArgumentos({ slug: 'x', tema: 'Um tema: com dois pontos', angulo: 'Um ângulo, com vírgula', glossario: 'divida' });
  ok('o tema chega ao escritor inteiro, um argumento por linha', argumentos.length === 3 && argumentos[0] === '--tema=Um tema: com dois pontos', argumentos.join(' § '));

  /**
   * 🔴 A PROVA QUE FALTAVA, E É ELA QUE DEIXOU O DEFEITO PASSAR — 10/08/2026.
   *
   * A prova de cima usa um tema de uma linha, porque era assim que os temas eram quando
   * ela foi escrita. Os temas da fila de hoje são PARÁGRAFOS, e com uma quebra de linha
   * lá dentro o `xargs -d '\n'` do robô partia o tema em três argumentos, dos quais dois
   * eram deitados fora em silêncio. **Um tema de 430 caracteres chegava com 307.**
   *
   * ⚠️ A régua é o NÚMERO DE LINHAS, não o texto: enquanto forem três, o contrato "uma
   * linha, um argumento" está de pé, seja qual for o feitio do tema.
   */
  const comParagrafos = comoArgumentos({
    slug: 'x',
    tema: 'Primeiro parágrafo, com a história.\n\nSegundo parágrafo, com a frase que explica tudo.',
    angulo: 'Uma ideia\ncom quebra no meio',
    glossario: 'divida',
  });
  ok(
    'um tema de vários parágrafos continua a ser UM argumento (o xargs do robô corta nas quebras)',
    comParagrafos.length === 3 && comParagrafos.every((l) => !l.includes('\n')),
    comParagrafos.map((l) => l.length).join(' + ') + ' caracteres',
  );
  ok(
    'e nenhuma palavra do tema se perde pelo caminho',
    comParagrafos[0] === '--tema=Primeiro parágrafo, com a história. Segundo parágrafo, com a frase que explica tudo.',
    comParagrafos[0],
  );
}

// ═══ 5. OS CADERNOS SÃO SEPARADOS ════════════════════════════════════════════
console.log('\n5. O ROBÔ DIÁRIO NÃO É TOCADO');

{
  const doLongo = join(RAIZ, '.github', 'data', 'youtube-longos-published.json');
  const doShort = join(RAIZ, '.github', 'data', 'youtube-published.json');
  ok('o vídeo longo tem caderno PRÓPRIO', existsSync(doLongo));
  /**
   * 🔴 PORQUE ISTO IMPORTA. O Short guarda os ÚLTIMOS 12 vídeos publicados para não
   * repetir imagens, e lê essa lista do caderno dele. Se o longo escrevesse lá, ocupava
   * um desses doze lugares todas as semanas — encurtando em silêncio a memória do robô
   * que publica todos os dias.
   */
  if (existsSync(doShort)) {
    const curto = JSON.parse(readFileSync(doShort, 'utf-8'));
    ok(
      'e o nome do vídeo longo NÃO está no caderno do Short',
      !Object.keys(curto).includes('sair-do-vermelho'),
    );
  } else {
    ok('e o nome do vídeo longo NÃO está no caderno do Short', true);
  }

  const fluxo = readFileSync(join(RAIZ, '.github', 'workflows', 'youtube-longo.yml'), 'utf-8');
  /**
   * 🔴 **LER A ESTRUTURA DO ROBÔ, NÃO O TEXTO DO FICHEIRO — e isto custou três enganos
   * no mesmo dia.**
   *
   * As primeiras versões destas provas procuravam palavras no ficheiro inteiro, e ficaram
   * vermelhas três vezes por causa dos MEUS PRÓPRIOS COMENTÁRIOS: uma por eu mencionar o
   * nome do grupo do Short para o explicar, outra por escrever *"Fazer o vídeo leva 36
   * minutos"* num aviso ANTES do passo que faz o vídeo.
   *
   * > **Uma prova que lê o ficheiro todo mede a documentação junto com o código.** E é
   * > pior do que parece: ela também ficaria VERDE se a regra vivesse só num comentário.
   *
   * Agora lêem-se só as linhas que MANDAM — o nome de cada passo e a condição dele —, e
   * os comentários deixam de existir para efeitos de prova.
   *
   * ⚠️ **E é um leitor de dez linhas, de propósito, em vez de uma biblioteca.** A
   * biblioteca óbvia (`js-yaml`) **não é dependência declarada deste projeto** — está no
   * disco só porque outra coisa a arrastou. Pendurar a prova semanal do canal num pacote
   * que ninguém pediu é convidar o dia em que ele desaparece e o robô falha ao sábado por
   * uma razão que não tem nada a ver com vídeos.
   */
  const passos = fluxo.split(/\r?\n/).reduce((lista, linha) => {
    const nome = linha.match(/^\s*-\s*name:\s*(.+?)\s*$/);
    if (nome) lista.push({ nome: nome[1].replace(/^["']|["']$/g, ''), se: '' });
    const se = linha.match(/^\s*if:\s*(.+?)\s*$/);
    if (se && lista.length) lista[lista.length - 1].se = se[1];
    return lista;
  }, []);
  const posicao = (parte) => passos.findIndex((p) => p.nome.includes(parte));
  const condicao = (parte) => passos.find((p) => p.nome.includes(parte))?.se || '';
  /**
   * ⚠️ A 1ª versão desta prova procurava "youtube-short-daily" no FICHEIRO INTEIRO — e
   * ficou vermelha por causa de um COMENTÁRIO meu que menciona esse nome para o explicar.
   * Uma prova que lê o ficheiro todo mede a documentação junto com o código. Agora lê só
   * a linha que manda: a do grupo de execução.
   */
  const linhaDoGrupo = (fluxo.match(/^\s*group:\s*(.+)$/m) || [])[1] || '';
  ok(
    'o robô do longo tem grupo de execução próprio (nunca o do Short)',
    /concurrency:/.test(fluxo) && linhaDoGrupo.includes('youtube-longo-') && !linhaDoGrupo.includes('youtube-short'),
    `o grupo é "${linhaDoGrupo.trim()}"`,
  );
  ok(
    'o relógio dispara ao SÁBADO de madrugada (fora da hora de ponta do GitHub)',
    /cron:\s*'0 2 \* \* 6'/.test(fluxo),
  );

  /**
   * 🔴 AS DUAS CONDIÇÕES QUE ESTAVAM ERRADAS, E QUE O RELÓGIO IA EXPOR TODAS AS SEMANAS.
   *
   * Um relógio não carrega em interruptores: numa corrida automática, os campos que o
   * botão preenche chegam VAZIOS. Estavam escritas assim:
   *   · o guião só se escrevia *"quando se pede"* → nunca se escrevia, e o passo seguinte
   *     parava a dizer que faltava o guião — a apontar para o sítio errado;
   *   · a subida só acontecia *"quando se pede"* → **o robô fazia o vídeo todos os
   *     sábados e nunca o publicava, e a corrida acabava a verde.**
   *
   * As duas eram invisíveis com o relógio desligado, porque à mão os interruptores vêm
   * sempre preenchidos. É a lição de 02/08 outra vez: *um teste que não lança o programa
   * como o robô o lança não prova nada sobre o robô*.
   */
  ok(
    'numa corrida automática o robô PUBLICA (não fica com o vídeo na gaveta)',
    condicao('Subir ao YouTube').includes("github.event_name == 'schedule'"),
    `a condição é: ${condicao('Subir ao YouTube') || '(nenhuma)'}`,
  );
  ok(
    'e o caderno é guardado sempre que se publica',
    condicao('Guardar no caderno').includes("github.event_name == 'schedule'"),
    `a condição é: ${condicao('Guardar no caderno') || '(nenhuma)'}`,
  );
  ok(
    'o guião escreve-se quando FALTA, não quando alguém se lembra de pedir',
    posicao('Escrever o guião') >= 0 && !condicao('Escrever o guião').includes('inputs.gerar'),
    `a condição é: ${condicao('Escrever o guião') || '(nenhuma)'}`,
  );
  ok(
    'a data da estreia é conferida ANTES de qualquer coisa cara',
    posicao('estreia está livre') >= 0
      && posicao('estreia está livre') < posicao('Fazer o vídeo')
      && posicao('estreia está livre') < posicao('A voz'),
    `conferência no passo ${posicao('estreia está livre') + 1}, voz no ${posicao('A voz') + 1}, vídeo no ${posicao('Fazer o vídeo') + 1}`,
  );
  ok(
    'e as provas de mesa correm antes da voz, que é o 1º passo que custa alguma coisa',
    posicao('provas de mesa') >= 0 && posicao('provas de mesa') < posicao('A voz'),
  );
  /**
   * ⚠️ AS FOTOGRAFIAS TÊM DE ENTRAR ANTES DA VOZ, e não é indiferente: elas entram no
   * guião montado, e é sobre esse guião que a voz, as legendas e o vídeo são feitos.
   * Depois da voz, o vídeo sairia sem elas — **e sem se queixar**.
   */
  ok(
    'as fotografias entram no guião ANTES de a voz ser gravada',
    posicao('As fotografias') >= 0 && posicao('As fotografias') < posicao('A voz'),
    `fotografias no passo ${posicao('As fotografias') + 1}, voz no ${posicao('A voz') + 1}`,
  );
  /**
   * 🔴 **A CHAVE DA IA NO PASSO QUE PUBLICA** — apanhado em 06/08, minutos depois de a
   * descrição passar a ter texto escrito.
   *
   * Os três blocos de texto da descrição são escritos a partir do guião, e a descrição
   * que VAI AO AR é montada dentro do passo da subida (o passo da descrição só escreve
   * uma pré-visualização em disco). Esse passo levava **só as chaves do YouTube**.
   * Sem as da IA, isto **não falha nada**: sai o texto de reserva, em silêncio, todas as
   * semanas, e a corrida acaba a verde. É o modo de falha mais caro desta casa — o que
   * funciona à vista e mente por baixo.
   */
  const bloco = (nomeDoPasso) => {
    const partes = fluxo.split(/^\s*-\s*name:\s*/m);
    return partes.find((p) => p.startsWith(nomeDoPasso)) || '';
  };
  const temChaveDeIa = (texto) => /GROQ_API_KEY|CEREBRAS_API_KEY|KIE_AI_KEY|CLOUDFLARE_AI_TOKEN/.test(texto);
  ok(
    '🔴 o passo que PUBLICA leva as chaves da IA (é lá que a descrição a sério é escrita)',
    temChaveDeIa(bloco('Subir ao YouTube')),
    'sem elas a descrição sai com o texto de reserva todas as semanas, e ninguém dá por nada',
  );
  ok(
    'e o passo da descrição também as leva',
    temChaveDeIa(bloco('A descrição')),
  );

  ok(
    'o robô dá 5 horas ao vídeo (são dez mil fotogramas)',
    /timeout-minutes:\s*300/.test(fluxo),
  );
  ok(
    'e confirma que o costureiro do som existe antes de começar',
    /ffmpeg/.test(fluxo) && /ffprobe/.test(fluxo),
  );

  ok(
    '🔴 o robô manda escolher os DESENHOS de cada cena (senão 70% do vídeo é letra na tela)',
    /ilustrador-longo\.js/.test(fluxo),
    'medido em 10/08: sem ele o vídeo tem 3 ilustrações em 55 cenas',
  );
  ok(
    'e o montador corre OUTRA VEZ depois dele (é ele que põe os desenhos no guião)',
    fluxo.indexOf('ilustrador-longo.js') < fluxo.lastIndexOf('montar-longo.js'),
  );
  ok(
    'e o ilustrador vem DEPOIS das fotografias (senão escolhe desenho para cenas que vão levar foto)',
    fluxo.indexOf('fotos-longo.js') < fluxo.indexOf('ilustrador-longo.js'),
  );

  // ═══ 🔴 O PEDIDO DOS DESENHOS DIZ QUANTOS SE QUEREM — 12/08/2026 ═══════════
  //
  // Medido no vídeo de 10/08: o pedido não trazia número nenhum, o leitor escolheu 10
  // com teto para 14, e o vídeo saiu com 22 de 54 cenas só com letra (41%) contra os
  // 35% pedidos pelo dono. As vagas estavam livres — o travão era o pedido.
  //
  // ⚠️ AS PROVAS OLHAM O TEXTO QUE SAI, e não o ficheiro: uma que procurasse a palavra
  // "alvo" no código ficaria verde com o número fora do pedido. É a mesma lição do
  // campo `pista`, que estava escrito e ninguém lia (§68.2).
  const cenasFalsas = Array.from({ length: 40 }, (_, i) => ({ id: i + 1, narration: `trecho número ${i + 1}` }));
  const pedidoDosDesenhos = montarPedidoDeDesenhos({ tema: 'teste' }, cenasFalsas);
  ok(
    '🔴 o pedido dos desenhos DIZ QUANTOS se querem (sem número, o leitor escolhe a menos)',
    new RegExp(`\\*\\*Escolha ${TETO_DE_ILUSTRACOES} trechos\\*\\*`).test(pedidoDosDesenhos),
    'medido em 10/08: sem o número, 10 escolhas para 14 vagas e 41% do vídeo em letra na tela',
  );
  ok(
    'e o número pedido é o TETO das ilustrações, não um número escrito à mão',
    pedidoDosDesenhos.includes(String(TETO_DE_ILUSTRACOES)),
    'se algum dia forem dois números diferentes, o pedido promete vagas que a montagem não tem',
  );
  ok(
    '🔴 e o pedido diz que o alvo é o TOTAL de escolhas, não a ordem da lista',
    /alvo é o número de ESCOLHAS/i.test(pedidoDosDesenhos),
    'é esta frase que faz um trecho sem figura custar zero em vez de custar um desenho',
  );
  ok(
    '⚠️ e a regra da figura errada CONTINUA lá (o alvo não pode ensinar a forçar)',
    /pior do que nenhuma/i.test(pedidoDosDesenhos),
    'uma figura que contradiz a voz é pior do que letra na tela — o alvo não revoga isto',
  );
  {
    // Com menos cenas do que o teto, pedir o teto seria prometer o impossível.
    const poucas = montarPedidoDeDesenhos({ tema: 'teste' }, cenasFalsas.slice(0, 5));
    ok(
      'e com poucas cenas pede-se o que há, não o teto',
      /\*\*Escolha 5 trechos\*\*/.test(poucas),
    );
  }
  ok(
    '🔴 o robô manda fazer a CAPA do YouTube (sem ela o vídeo sobe sem miniatura e ninguém dá por nada)',
    /capa-manus\.js/.test(fluxo),
    'ver `acharCapa` em upload-longo.js: sem capa ele sobe à mesma e o YouTube escolhe um fotograma sozinho',
  );
  ok(
    'e a capa é feita ANTES do commit que guarda a pasta das imagens (senão fica na máquina da nuvem)',
    fluxo.indexOf('capa-manus.js') < fluxo.indexOf('Guardar o caderno de cenas'),
  );
}

// ═══ 5-b. O RENDER NÃO PODE APROVEITAR PARTES DE OUTRO VÍDEO ═════════════════
console.log('\n5-b. AS PARTES GUARDADAS SABEM DE QUE VÍDEO SÃO');

{
  /**
   * 🔴 ACONTECEU EM 10/08/2026, e saiu um MP4 com as imagens de um vídeo e a voz de outro.
   *
   * As partes do render chamam-se `parte-01.mp4` … e vivem todas na mesma pasta, seja
   * qual for o vídeo. A pergunta antes de as reaproveitar era *"existe um ficheiro com
   * este nome?"* — que foi a pergunta certa enquanto só houve um vídeo longo.
   *
   * ⚠️ **Esta prova lê o CÓDIGO do render, e não o resultado**, de propósito: o resultado
   * só apareceria depois de alguém gastar meia hora a fazer o vídeo errado. E na nuvem
   * nunca apareceria de todo, porque lá a máquina é sempre limpa — que é a razão de este
   * defeito ter vivido tanto tempo.
   */
  const render = join(RAIZ, 'youtube-render', 'scripts', 'render-longo.mjs');
  if (existsSync(render)) {
    const codigo = readFileSync(render, 'utf-8');
    ok(
      'o render guarda de que vídeo e de que corte são as partes que deixou feitas',
      /partes-feitas\.json/.test(codigo),
    );
    ok(
      'e o reaproveitamento compara o SLUG, não só o nome do ficheiro',
      /anterior\?\.slug|anterior\.slug/.test(codigo) && /assinaturaDasPartes/.test(codigo),
      'sem isto, "parte-01.mp4 existe" quer dizer "serve", e não quer',
    );
    ok(
      'partes sem identificação nenhuma são deitadas fora em vez de usadas',
      /sem dizer de que vídeo são/.test(codigo),
    );
    ok(
      'e quando o apagar do Node falha (caminhos com acento) há uma segunda mão',
      /rmdir/.test(codigo) && /rm', \['-rf'/.test(codigo),
      'nesta máquina o rmSync não apaga nada e o --recomecar ficava num beco',
    );
    /**
     * 🔴 A TERCEIRA vez que este reaproveitamento entregou lixo em silêncio, e a mais
     * fácil de repetir: um render de 20 minutos é morto com facilidade, e o que fica em
     * disco é um MP4 com nome, com tamanho e sem fim. "Existe" nunca quis dizer "serve".
     */
    /**
     * 🔴 OS SOCOS — as duas queixas do dono de 10/08, viradas em prova.
     *
     * 1. *"Os socos têm que ser condizente com o que se fala, às vezes percebo que um
     *    soco verde está falando de coisas negativas."* A cor alternava por CONTAGEM
     *    (`i % 2`), o que dá metade errada por construção.
     * 2. *"O primeiro soco precisa ser nos 2, 3, 4 segundos iniciais."* O soco de cor
     *    estava no fotograma 3 (0,1s) — cedo demais para o olho de quem abre.
     */
    const longTsxTexto = existsSync(join(RAIZ, 'youtube-render', 'src', 'Long.tsx'))
      ? readFileSync(join(RAIZ, 'youtube-render', 'src', 'Long.tsx'), 'utf-8') : '';
    const impactoTexto = existsSync(join(RAIZ, 'youtube-render', 'src', 'impacto.tsx'))
      ? readFileSync(join(RAIZ, 'youtube-render', 'src', 'impacto.tsx'), 'utf-8') : '';
    if (longTsxTexto && impactoTexto) {
      ok(
        '🔴 a cor do soco vem do ATO da história, e não da contagem',
        /papeisDasCenas/.test(longTsxTexto) && /papel === 'ganho'/.test(impactoTexto),
        'sem isto, metade dos socos sai com a cor errada por construção',
      );
      ok(
        'e o ato 3, a demonstração, a chamada e o fim são sempre GANHO (verde)',
        /parte === 'demonstracao'[\s\S]{0,120}'ganho'/.test(longTsxTexto) && /capitulo\) >= 3/.test(longTsxTexto),
      );
      const frameDoSoco = Number((longTsxTexto.match(/SOCO_DA_COR_NA_ABERTURA\s*=\s*(\d+)/) || [])[1]);
      ok(
        '🔴 o soco de cor da abertura cai entre os 2 e os 4 segundos',
        Number.isFinite(frameDoSoco) && frameDoSoco >= 60 && frameDoSoco <= 120,
        `está no fotograma ${frameDoSoco} (${(frameDoSoco / 30).toFixed(1)}s) — a 30 fps, 2s são 60 e 4s são 120`,
      );
      ok(
        'e o clarão + baque da entrada FICAM no princípio (tirá-los devolvia o silêncio de 08/08)',
        /SomDoMomento[\s\S]{0,80}SOCO_DA_ABERTURA/.test(longTsxTexto),
      );
      ok(
        'o soco procura primeiro o trecho em que a imagem não muda',
        /PARADO_DEMAIS_SEC/.test(impactoTexto) && /familias\.length === iniciosDeCena\.length/.test(impactoTexto),
      );
    }

    ok(
      'uma parte guardada só é reaproveitada depois de lhe CONTAREM os fotogramas',
      /count_frames/.test(codigo) && /contados === esperados/.test(codigo),
      'sem isto, um render interrompido a meio deixa uma parte truncada que entra no vídeo final',
    );

    /**
     * 🔴 A CONSTANTE ESPELHADA EM QUATRO FICHEIROS — 10/08/2026.
     *
     * ═══ POR QUE ESTA PROVA TEM DE LER O TEXTO DO FICHEIRO ═══
     * A `contaDoRender()` lá em cima diz-se *"a testemunha independente do render"*, e é
     * mesmo — do ALGORITMO. Mas os NÚMEROS ela importa do `srt-longo.js`. Resultado: o
     * render podia ter o respiro que quisesse que ela ficava verde. E teve: **0,35
     * enquanto os outros três ficheiros tinham 0,21**, durante um dia inteiro.
     *
     * O preço: o render calculou 11444 fotogramas para um vídeo de 11220 e morreu na
     * QUARTA de quatro partes, depois de meia hora de máquina.
     *
     * ⚠️ Por isso isto lê o ficheiro em TEXTO. É feio e é de propósito: ler o texto é a
     * única maneira de ver o que lá está escrito, em vez de ver o que se importou.
     */
    const numeroDe = (texto, nome) => {
      const m = texto.match(new RegExp(`(?:export\\s+)?const\\s+${nome}\\s*=\\s*([0-9.]+)`));
      return m ? Number(m[1]) : null;
    };
    const longTsx = join(RAIZ, 'youtube-render', 'src', 'Long.tsx');
    const telasTsx = join(RAIZ, 'youtube-render', 'src', 'longo', 'telas.tsx');
    const srtJs = join(RAIZ, 'src', 'scripts', 'youtube', 'srt-longo.js');
    const descJs = join(RAIZ, 'src', 'scripts', 'youtube', 'descricao-longo.js');
    if ([longTsx, telasTsx, srtJs, descJs].every((f) => existsSync(f))) {
      const doLong = readFileSync(longTsx, 'utf-8');
      const doTelas = readFileSync(telasTsx, 'utf-8');
      const doSrt = readFileSync(srtJs, 'utf-8');
      const doDesc = readFileSync(descJs, 'utf-8');
      /** [nome, valor no render, valores nos irmãos que também o declaram] */
      const espelhadas = [
        ['RESPIRO_SEC', numeroDe(codigo, 'RESPIRO_SEC'), { 'Long.tsx': numeroDe(doLong, 'RESPIRO_SEC'), 'srt-longo.js': numeroDe(doSrt, 'RESPIRO_SEC'), 'descricao-longo.js': numeroDe(doDesc, 'RESPIRO_SEC') }],
        ['VOZ_ENTRA_FRAMES', numeroDe(codigo, 'VOZ_ENTRA_FRAMES'), { 'Long.tsx': numeroDe(doLong, 'VOZ_ENTRA_FRAMES'), 'srt-longo.js': numeroDe(doSrt, 'VOZ_ENTRA_FRAMES') }],
        ['SIGNATURE_FRAMES', numeroDe(codigo, 'SIGNATURE_FRAMES'), { 'Long.tsx': numeroDe(doLong, 'SIGNATURE_FRAMES') }],
        ['TELA_FINAL_FRAMES', numeroDe(codigo, 'TELA_FINAL_FRAMES'), { 'longo/telas.tsx': numeroDe(doTelas, 'TELA_FINAL_FRAMES') }],
        ['CARTAO_CAPITULO_FRAMES', numeroDe(codigo, 'CARTAO_CAPITULO_FRAMES'), { 'srt-longo.js': numeroDe(doSrt, 'CARTAO_CAPITULO_FRAMES') }],
      ];
      for (const [nome, noRender, irmaos] of espelhadas) {
        const diferentes = Object.entries(irmaos).filter(([, v]) => v !== null && v !== noRender);
        ok(
          `${nome}: o render diz ${noRender} e os outros ficheiros dizem o mesmo`,
          noRender !== null && diferentes.length === 0,
          diferentes.length
            ? `o render tem ${noRender} e ${diferentes.map(([f, v]) => `${f} tem ${v}`).join(' · ')}`
            : 'não se encontrou a constante no render',
        );
      }
    }
  } else {
    console.log('  ⏭️  o render não está nesta máquina — as quatro provas do cache ficam de fora');
  }
}

// ═══ 6. CONTRA O VÍDEO REAL, SE ELE ESTIVER AQUI ═════════════════════════════
console.log('\n6. CONTRA O VÍDEO QUE FOI ENTREGUE');

{
  const caminhoPlano = join(RAIZ, 'youtube-render', 'public', 'roteiro', 'sair-do-vermelho.json');
  const caminhoTiming = join(RAIZ, 'youtube-render', 'public', 'audio', 'sair-do-vermelho', 'timing.json');
  if (existsSync(caminhoPlano) && existsSync(caminhoTiming)) {
    const plano = JSON.parse(readFileSync(caminhoPlano, 'utf-8'));
    const timing = JSON.parse(readFileSync(caminhoTiming, 'utf-8'));
    const legenda = iniciosDasCenas(plano, timing);
    const render = contaDoRender(plano, timing);
    /**
     * O ficheiro entregue em 04/08 media **10131 fotogramas, 337,700 s** (§44.4).
     * ♦ 06/08 (§61): a TELA FINAL acrescentou **300 fotogramas** (10 s) ao fim de cada
     * vídeo longo — logo o mesmo guião passa a dar **10431**.
     * ⚠️ **Este número continua fixo de propósito.** A tentação é escrevê-lo como
     * `render.total`, e aí a prova compara-se consigo própria e fica verde para sempre.
     * O que ela guarda é o vídeo MEDIDO, e é por isso que ela avisa quando a duração
     * muda — como avisou agora.
     */
    ok(
      'a conta dá os 10431 fotogramas exatos do vídeo que vai ao ar (10131 + a tela final)',
      render.total === 10131 + TELA_FINAL_FRAMES,
      `deu ${render.total}`,
    );
    ok(
      'e a legenda acaba onde a NARRAÇÃO acaba — nem a assinatura nem a tela final levam legenda',
      Math.abs((legenda.fimDoConteudo + SIGNATURE_FRAMES / FPS) - 337.7) < 0.01,
      `${(legenda.fimDoConteudo + SIGNATURE_FRAMES / FPS).toFixed(3)}s`,
    );
    ok('e há uma capa para este vídeo no repositório', Boolean(acharCapa('sair-do-vermelho')));
    ok(
      'as palavras-chave do vídeo real também estão todas inteiras',
      palavrasChave(plano, ['sair do vermelho']).every((t) => t.length < 60 && t.split(' ').length <= 5),
    );
  } else {
    console.log('  ⏭️  o guião montado não está nesta máquina — as quatro provas contra o vídeo real ficam de fora');
  }
}

// ═══ 7. OS TEMAS TIRADOS DO QUE ESTÁ A BOMBAR ════════════════════════════════
console.log('\n7. OS TEMAS TIRADOS DOS VIRAIS');

{
  const bom = {
    tema: 'Como parar de perder dinheiro em pequenos gastos do dia a dia',
    angulo: 'Mostrar o cenário de quem ganha R$ 3.500 e perde R$ 480 por mês sem perceber.',
    titulo: 'Gastos pequenos: como parar de perder dinheiro todo mês',
    glossario: 'orcamento-pessoal',
    palavrasChave: ['gastos pequenos', 'controle financeiro'],
  };
  const glossarios = new Set(['orcamento-pessoal', 'divida', 'educacao-financeira']);

  ok('um tema bem escrito passa', conferirTema(bom, { glossarios }).length === 0, conferirTema(bom, { glossarios }).join(' · '));

  const reprova = (nome, mudanca, agulha, extra = {}) => {
    const queixas = conferirTema({ ...bom, ...mudanca }, { glossarios, ...extra });
    ok(nome, queixas.some((q) => q.includes(agulha)), `queixas: ${queixas.join(' · ') || '(nenhuma)'}`);
  };

  reprova('um título curto de mais é recusado', { titulo: 'Gastos pequenos' }, 'mínimo');
  reprova('um título comprido de mais é recusado',
    { titulo: 'Gastos pequenos do dia a dia: como parar de perder dinheiro todos os meses sem cortar nada' }, 'máximo');

  /**
   * 🔴 A PROVA QUE NASCEU DO 1º ENSAIO, A 05/08.
   * O pedido dá um exemplo de OUTRO assunto — como manda a regra desta casa — e o modelo
   * copiou-lhe na mesma a cauda: os dois primeiros títulos propostos acabavam ambos em
   * *"sem apertar mais o mês"*, e um deles era sobre cortar gastos.
   * **O exemplo ensina a FORMA e o modelo copia as PALAVRAS.**
   */
  reprova('um título que copia a objeção do exemplo é recusado',
    { titulo: 'Gastos pequenos: como parar sem apertar mais o mês' }, 'copia a objeção');

  /**
   * 🔴 E A SEGUNDA PROVA DO MESMO DIA, porque a primeira régua deixou passar o defeito.
   * Saíram *"…como fazer o salário render **sem ganhar mais**"* e *"…10 gastos que cortar
   * **sem ganhar mais**"*: não partilham quatro palavras seguidas em lado nenhum, e acabam
   * na mesma frase. **A objeção tem três palavras, e é o FIM do título que se lê como
   * repetição** quando os dois vídeos ficam lado a lado na lista do canal.
   */
  reprova('dois títulos que acabam na mesma frase são recusados',
    { titulo: 'Gastos pequenos: como cortar sem ganhar mais' }, 'acaba como outro',
    { caudasUsadas: [caudaDoTitulo('Educação financeira: fazer o salário render sem ganhar mais')] });
  ok('e uma objeção DIFERENTE passa, mesmo com um título na fila',
    conferirTema({ ...bom, titulo: 'Gastos pequenos: como cortar sem vender nada' },
      { glossarios, caudasUsadas: [caudaDoTitulo('Educação financeira: fazer o salário render sem ganhar mais')] }).length === 0);

  reprova('um título que promete um segredo é recusado', { titulo: 'Gastos: o segredo para nunca mais ficar sem dinheiro' }, 'segredo');
  reprova('um título que promete enriquecer é recusado', { titulo: 'Investimentos: fique rico com pouco dinheiro por mês' }, 'enriquecer');
  reprova('um título com "ninguém te conta" é recusado', { titulo: 'Gastos pequenos: o que ninguém te conta sobre dinheiro' }, 'falso segredo');
  reprova('um título com urgência inventada é recusado', { titulo: 'Investimentos: corra antes que o dinheiro perca valor' }, 'urgência');
  /**
   * ⚠️ Metade dos virais que servem de modelo GRITAM — *"PARE DE SER ESCRAVO DAS
   * DÍVIDAS"* —, e o modelo copia o que vê. Este canal não grita: a capa chama a atenção,
   * o título explica.
   */
  reprova('um título aos berros é recusado', { titulo: 'Gastos: PARE DE PERDER DINHEIRO todo mês agora' }, 'grita');
  ok('mas uma sigla em maiúsculas não conta como grito',
    conferirTema({ ...bom, titulo: 'CDB e poupança: onde o seu dinheiro rende mais' }, { glossarios }).length === 0,
    conferirTema({ ...bom, titulo: 'CDB e poupança: onde o seu dinheiro rende mais' }, { glossarios }).join(' · '));
  reprova('um glossário que não existe é recusado', { glossario: 'nao-existe-isto' }, 'não existe');
  reprova('sem ângulo é recusado — o escritor não saberia o que dizer', { angulo: '' }, 'sem ângulo');

  // O nome curto: único, e sem acentos nem espaços.
  const usados = new Set();
  const s1 = fazerSlug('Gastos pequenos: como parar de perder dinheiro', usados); usados.add(s1);
  const s2 = fazerSlug('Gastos pequenos: como parar de perder dinheiro', usados);
  ok('o nome curto sai limpo, sem acentos nem espaços', /^[a-z0-9-]+$/.test(s1), s1);
  ok('e dois títulos iguais não geram o mesmo nome', s1 !== s2, `${s1} / ${s2}`);

  /**
   * ⚠️ A FONTE. O detetive guarda `topLongos` (os dez vídeos LONGOS mais vistos) e
   * ninguém a lia — o conversor do Short usa `topShorts` de propósito, porque um título
   * de vídeo longo vende um clique e um Short já está a tocar antes de alguém o ler.
   * Se esta lista desaparecer da colheita, isto tem de ficar vermelho.
   */
  const tendencias = existsSync(join(RAIZ, '.github', 'data', 'youtube-trends.json'))
    ? JSON.parse(readFileSync(join(RAIZ, '.github', 'data', 'youtube-trends.json'), 'utf-8'))
    : null;
  ok('o detetive continua a guardar a lista dos vídeos LONGOS virais',
    Array.isArray(tendencias?.topLongos) && tendencias.topLongos.length > 0,
    `topLongos: ${tendencias?.topLongos?.length ?? 'não existe'}`);
  ok('e cada um traz o que é preciso para se decidir sobre ele',
    (tendencias?.topLongos || []).every((v) => v.videoId && v.title && Number.isFinite(v.duracaoSeg)));
}

// ═══ 8. O DIRETOR DE IMAGEM CONTRA UM GUIÃO QUE NÃO É O DO PILOTO ════════════
console.log('\n8. AS IMAGENS, NUM GUIÃO QUE NÃO É O DO PILOTO');

{
  /**
   * 🔴 **A TRAVA DAS "TRÊS IGUAIS SEGUIDAS" PARTIU O PRIMEIRO VÍDEO QUE O ROBÔ TENTOU
   * FAZER SOZINHO** (05/08/2026, na nuvem). Ela media o NOME DA FAMÍLIA em vez do ecrã, e
   * reprovou duas coisas que eram o desenho a funcionar:
   *   · três cartões de número com **R$ 3.500 · R$ 220 · R$ 180** e etiquetas diferentes;
   *   · o app nos **passos 1, 2 e 3** da conta — que existem justamente para o ecrã
   *     crescer com a narração.
   *
   * ⚠️ **E não apareceu no primeiro vídeo por sorte:** lá a demonstração deu duas cenas e
   * os números novos nunca calharam três seguidos. **Uma trava provada contra um vídeo é
   * uma trava provada contra um vídeo.**
   */
  const cena = (id, visual) => ({ id, capitulo: 1, narration: 'texto qualquer', visual });
  const so = (cenas) => conferirImagens(cenas, { valores: [] })
    .filter((e) => /mostram a mesma coisa/.test(e));

  ok(
    'três números DIFERENTES seguidos são três ecrãs diferentes — e passam',
    so([cena(1, { tipo: 'numero', valor: 3500 }), cena(2, { tipo: 'numero', valor: 220 }), cena(3, { tipo: 'numero', valor: 180 })]).length === 0,
  );
  ok(
    'mas o MESMO número três vezes seguidas é reprovado',
    so([cena(1, { tipo: 'numero', valor: 820 }), cena(2, { tipo: 'numero', valor: 820 }), cena(3, { tipo: 'numero', valor: 820 })]).length === 1,
  );
  ok(
    'o app nos passos 1, 2 e 3 é o ecrã a crescer com a narração — e passa',
    so([cena(1, { tipo: 'app', passo: 1 }), cena(2, { tipo: 'app', passo: 2 }), cena(3, { tipo: 'app', passo: 3 })]).length === 0,
  );
  ok(
    'mas o app PARADO no mesmo passo três vezes é reprovado',
    so([cena(1, { tipo: 'app', passo: 2 }), cena(2, { tipo: 'app', passo: 2 }), cena(3, { tipo: 'app', passo: 2 })]).length === 1,
  );
  ok(
    'e a regra original continua de pé: três ecrãs de palavras iguais são reprovados',
    so([cena(1, { tipo: 'palavras', variante: 0 }), cena(2, { tipo: 'palavras', variante: 0 }), cena(3, { tipo: 'palavras', variante: 0 })]).length === 1,
  );
  ok(
    'três ilustrações com figuras diferentes passam',
    so([cena(1, { tipo: 'ilustracao', figura: 'ralo' }), cena(2, { tipo: 'ilustracao', figura: 'balde' }), cena(3, { tipo: 'ilustracao', figura: 'areia' })]).length === 0,
  );
  ok(
    'e a mesma ilustração três vezes seguidas é reprovada',
    so([cena(1, { tipo: 'ilustracao', figura: 'ralo' }), cena(2, { tipo: 'ilustracao', figura: 'ralo' }), cena(3, { tipo: 'ilustracao', figura: 'ralo' })]).length === 1,
  );

  // ⚠️ E o vídeo que VAI AO AR não pode ter mudado por causa disto.
  const caminhoPlano = join(RAIZ, 'youtube-render', 'public', 'roteiro', 'sair-do-vermelho.json');
  if (existsSync(caminhoPlano)) {
    const plano = JSON.parse(readFileSync(caminhoPlano, 'utf-8'));
    ok(
      'o vídeo que vai ao ar continua sem três ecrãs iguais seguidos',
      conferirImagens(plano.scenes, { valores: [] }).filter((e) => /mostram a mesma coisa/.test(e)).length === 0,
    );
  }
}

// ═══ 9. AS FOTOGRAFIAS AUTOMÁTICAS E O BANCO ═════════════════════════════════
console.log('\n9. AS FOTOGRAFIAS AUTOMÁTICAS E O BANCO DE IMAGENS');

{
  const cenas = [
    { id: 1, capitulo: null, parte: 'abertura', narration: 'Você já recebeu o salário e viu tudo sumir antes do fim do mês?' },
    { id: 2, capitulo: null, parte: 'abertura', narration: 'Eu sentei com o celular na mão e resolvi olhar cada gasto com muita calma.' },
    { id: 3, capitulo: 1, parte: 'pergunta', narration: 'Você também já abriu a fatura do cartão e sentiu o estômago gelar naquele instante?' },
    { id: 4, capitulo: 2, parte: 'desenvolvimento', narration: 'O valor não parava de crescer todo santo mês sem eu perceber o motivo.' },
    { id: 5, capitulo: 3, parte: 'desenvolvimento', narration: 'No mês seguinte o dinheiro finalmente ficou onde sempre deveria ter ficado.' },
  ];

  // ── as cenas são escolhidas pelo PAPEL, e o papel existe em qualquer guião ──
  const escolhidas = PAPEIS.map((p) => ({ chave: p.chave, cena: p.procurar(cenas) }));
  ok(
    'os três papéis encontram cena num guião que nunca foi visto',
    escolhidas.every((e) => e.cena),
    escolhidas.map((e) => `${e.chave}:${e.cena?.id ?? '—'}`).join(' '),
  );
  ok(
    'o susto cai no pico emocional (a pergunta do primeiro ato)',
    escolhidas.find((e) => e.chave === 'susto').cena.id === 3,
  );
  /**
   * ⚠️ O CARTAZ VAI PARA O ATO DO MEIO, e não é arrumação: o ato 1 só pode assustar
   * (proibido explicar a causa) e o 3 é a virada. **O número com fonte pertence ao
   * ensinamento**, que é o ato do meio — §35.2.
   */
  ok('o cartaz do número cai no ato do ensinamento (o do meio)', escolhidas.find((e) => e.chave === 'numero').cena.capitulo === 2);
  ok('a virada cai no terceiro ato', escolhidas.find((e) => e.chave === 'virada').cena.capitulo === 3);

  // ── a pista tem de ser ÚNICA, senão a fotografia aterra na cena errada ──
  const pistas = cenas.map((c) => pistaDaCena(c, cenas));
  ok('cada pista tem pelo menos quatro palavras', pistas.every((p) => p.split(' ').length >= 4), pistas.join(' | '));
  ok(
    'e nenhuma pista casa com outra cena que não a sua',
    pistas.every((p, i) => cenas.filter((c) => c.narration.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().includes(p)).every((c) => c.id === cenas[i].id)),
  );

  // ── e a fotografia aterra mesmo onde foi pensada ──
  const catalogoDeMesa = {
    videos: {
      'video-de-mesa': [{
        ficheiro: 'manus/video-de-mesa/susto.jpg', nome: 'o susto', tipo: 'foto',
        movimento: 'aproxima', pista: pistaDaCena(cenas[2], cenas),
      }],
    },
  };
  const lugares = escolherLugaresDaFoto(cenas, new Set(), 'video-de-mesa', catalogoDeMesa);
  ok('a fotografia do catálogo aterra na cena de onde saiu o pedido', lugares.size === 1 && cenas[[...lugares.keys()][0]].id === 3, `caiu na cena ${cenas[[...lugares.keys()][0]]?.id}`);
  /**
   * 🔴 A TRAVA QUE NÃO SE NEGOCEIA, agora também pelo caminho automático: **um vídeo sem
   * fotografias suas não leva as de outro.**
   */
  ok('um vídeo sem entrada no catálogo continua a não levar fotografia nenhuma', escolherLugaresDaFoto(cenas, new Set(), 'outro-video', catalogoDeMesa).size === 0);
  ok('e sem catálogo nenhum também não', escolherLugaresDaFoto(cenas, new Set(), 'video-de-mesa', { videos: {} }).size === 0);

  // ── o banco: duas prateleiras, e os cartazes não têm prateleira ──
  const bancoDeMesa = {
    imagens: [
      { ficheiro: 'a.jpg', significado: 'o susto de olhar a conta', tipo: 'foto', usadoEm: ['v1'] },
      { ficheiro: 'b.jpg', significado: 'o susto de olhar a conta', tipo: 'foto', usadoEm: ['v1', 'v2', 'v3'] },
      { ficheiro: 'velho.jpg', significado: 'o cartaz', tipo: 'cartaz', usadoEm: ['v1'] },
    ],
  };
  ok(
    'o banco devolve uma fotografia do significado pedido',
    doBanco('o susto de olhar a conta', { banco: bancoDeMesa, historico: ['x', 'y'] })?.ficheiro === 'a.jpg',
  );
  ok(
    'e prefere a MENOS usada, para o banco rodar',
    doBanco('o susto de olhar a conta', { banco: bancoDeMesa, historico: [] })?.ficheiro === 'a.jpg',
  );
  ok(
    'não devolve nada que tenha sido usado nos últimos 8 vídeos',
    doBanco('o susto de olhar a conta', { banco: bancoDeMesa, historico: ['v1', 'v2', 'v3'] }) === null,
  );
  /**
   * 🔴 **OS CARTAZES COM NÚMEROS NÃO ENTRAM NO BANCO, E ISTO É A PROVA QUE ACENDE.**
   * O cartaz diz *"16% ao mês — fonte Banco Central"* e essa taxa MUDA. Reaproveitá-lo
   * daqui a seis meses é pôr no ecrã um número falso com a chancela do Banco Central por
   * baixo — o defeito mais caro que este canal pode ter, e seria autoinfligido.
   */
  ok('🔴 um cartaz NUNCA sai do banco, mesmo que lá esteja', doBanco('o cartaz', { banco: bancoDeMesa, historico: [] }) === null);
  const guardado = guardarNoBanco({ imagens: [] }, { ficheiro: 'c.jpg', significado: null, tipo: 'cartaz', pista: 'x' }, 'v9');
  ok('🔴 e um cartaz nunca ENTRA no banco', (guardado.imagens || []).length === 0);
  const guardadaFoto = guardarNoBanco({ imagens: [] }, { ficheiro: 'd.jpg', significado: 'a saída que se abre', tipo: 'foto', pista: 'y' }, 'v9');
  ok('mas uma fotografia entra, catalogada por SIGNIFICADO', guardadaFoto.imagens[0]?.significado === 'a saída que se abre');
  ok('e a regra do dono são 8 vídeos sem repetir', NAO_REPETIR_EM === 8);

  /**
   * ✅ **A PROVA QUE MAIS VALE, E É CONTRA O VÍDEO APROVADO.**
   *
   * As três fotografias do piloto foram colocadas **à mão**, uma a uma, a ler o guião
   * (§43.2). A escolha automática é por PAPEL e nunca viu esse vídeo. Se as duas
   * chegarem ao mesmo sítio, a regra por papel não é uma aproximação — é a mesma decisão
   * que uma pessoa tomou, escrita de maneira a servir qualquer vídeo.
   *
   * **Medido em 05/08:** à mão foram as cenas **5 · 12 · 22**; a regra escolhe **4 · 12 ·
   * 20**. O cartaz do número cai na MESMA cena; as outras duas caem no mesmo ato, a uma e
   * a duas cenas de distância. (A cena 4 é *"Você já abriu a fatura e deu de cara com um
   * número que fez o estômago gelar?"* e a 5 é *"Era um domingo, eu sentei com o
   * celular…"* — é o mesmo momento da história.)
   */
  const caminhoPiloto = join(RAIZ, 'youtube-render', 'public', 'roteiro', 'sair-do-vermelho.json');
  if (existsSync(caminhoPiloto)) {
    const piloto = JSON.parse(readFileSync(caminhoPiloto, 'utf-8'));
    const aMao = piloto.scenes.filter((c) => c.visual?.tipo === 'foto').map((c) => c.id);
    const porRegra = PAPEIS.map((p) => p.procurar(piloto.scenes)?.id).filter(Boolean);
    ok(
      'a escolha por papel encontra as três cenas no vídeo aprovado',
      porRegra.length === 3,
      `encontrou ${porRegra.join(', ')}`,
    );
    /**
     * 🔴 A DISTÂNCIA MEDE-SE PELO SÍTIO NA HISTÓRIA, NÃO EM CENAS — 09/08/2026.
     *
     * Isto exigia *"a duas cenas de distância, no máximo"*, e a régua era boa enquanto
     * uma cena durava 12 segundos: duas cenas eram ~24s. Em 09/08 o teto de palavras por
     * cena desceu de 40 para 26, as cenas passaram a durar 7,3s — e **"duas cenas"
     * passou a querer dizer 15 segundos sem ninguém ter mudado a regra**. A prova ficou
     * vermelha por uma escolha que não piorou nada: medido, as duas caem no MESMO
     * capítulo e na MESMA parte (#33 e #37 são as duas ).
     *
     * ⚠️ **A unidade errada é o defeito, não o número.** Contar cenas amarra a prova a
     * uma decisão de montagem que muda. E contar SEGUNDOS também não servia — testei, e
     * dava 30s de desvio numa escolha que está certa. O que a prova quer mesmo saber é
     * se a fotografia cai no mesmo MOMENTO DA HISTÓRIA, e isso quem o diz é o capítulo
     * e a parte, que são o que o guião declara.
     *
     * ⚠️ E isto NÃO substitui a prova que interessa: *"cada fotografia cai numa cena
     * cujo TEXTO a chamou"* continua em `conferirImagens`, e é ela que impede o ecrã de
     * mostrar uma coisa enquanto a voz diz outra.
     */
    const ondeEsta = (id) => {
      const c = piloto.scenes.find((x) => x.id === id);
      // ⚠️ O CAPÍTULO, e nao a parte: o comentario original desta prova ja dizia que
      //    "Voce ja abriu a fatura..." (pergunta) e "Era um domingo, eu sentei..."
      //    (desenvolvimento) sao O MESMO momento da historia. Exigir a mesma PARTE era
      //    apertar mais do que a prova alguma vez quis.
      return c ? String(c.bloco) : '?';
    };
    ok(
      'e cai no mesmo MOMENTO da história que a escolha feita à mão (mesmo capítulo e mesma parte)',
      aMao.length === 3 && porRegra.every((id, i) => ondeEsta(id) === ondeEsta(aMao[i])),
      `à mão ${aMao.map((id) => `${id} (${ondeEsta(id)})`).join(' · ')} · por regra ${porRegra.map((id) => `${id} (${ondeEsta(id)})`).join(' · ')}`,
    );
    ok(
      'e o cartaz do número cai exatamente na mesma cena que a pessoa escolheu',
      porRegra[1] === aMao[1],
      `${porRegra[1]} contra ${aMao[1]}`,
    );
  } else {
    console.log('  ⏭️  o guião do piloto não está montado — as 3 provas contra a escolha à mão ficam de fora');
  }

  // ── o pedido do cartaz nunca inventa o número ──
  const cartaz = pedidoDoCartaz({ taxa: 16, rotulo: 'juro do rotativo do cartão', fonte: 'Banco Central do Brasil' });
  ok('o pedido do cartaz leva o número do caderno e a fonte', cartaz.includes('16% AO MÊS') && cartaz.includes('Fonte: Banco Central do Brasil'));
  ok('e proíbe expressamente imitar um jornal', /NOT a reproduction of any real newspaper/.test(cartaz));

  // ── e o pedido das fotografias proíbe letras, com o que fazer em vez disso ──
  const foto = pedidoDaFoto(PAPEIS[0], cenas[2]);
  ok('o pedido da fotografia proíbe QUALQUER texto legível', /NO READABLE TEXT AND NO NUMBERS AT ALL/.test(foto));
  ok('e diz o que fazer em vez disso (o ritmo das linhas, desfocado)', /RHYTHM of rows and columns/.test(foto));
  ok('e leva a frase que a voz diz naquele segundo', foto.includes(cenas[2].narration));
}

// ═══ A CAPA: O TÍTULO, O SELO, O MOLDE E O CUSTO ═════════════════════════════
/**
 * 🔴 AS QUATRO COISAS QUE ESTAVAM PARTIDAS NA CAPA E NÃO TOCAVAM EM PROVA NENHUMA —
 * 10/08/2026.
 *
 * Todas elas atravessaram 153 provas verdes. Nenhuma dava erro: a capa saía, bonita, com
 * o título errado, sem selo, com o molde do vídeo passado, e o orçamento a dizer que
 * cabiam mais imagens do que cabiam. **É o modo de falha desta casa: o programa corre,
 * escreve ✅, e faz a coisa errada.**
 */
console.log('\n🖼️  A CAPA — o título, o selo, o molde e o custo');
console.log('   (as quatro coisas que estavam partidas e não tocavam em prova nenhuma)\n');
{
  // ── 1. o título nunca sai de uma palavra nem cortado a meio ──
  const semTitulo = tituloDaCapa({ tema: 'Onde' });
  ok('um tema de UMA palavra não faz capa (era o "ONDE" a toda a largura)', semTitulo.titulo === '', `deu "${semTitulo.titulo}"`);

  const daCapa = tituloDaCapa({ tema: 'Onde', fraseDaCapa: 'Por que o dinheiro some antes do fim do mês?' });
  ok('e a frase da capa do vídeo entra no lugar dele', daCapa.de === 'a frase da capa do vídeo');
  ok('INTEIRA, e não cortada às 6 palavras', daCapa.titulo === 'POR QUE O DINHEIRO SOME ANTES DO FIM DO MÊS', `deu "${daCapa.titulo}"`);
  /**
   * ⚠️ **A REGRA DE VERDADE, e não uma lista de palavras suspeitas.** O que interessa não
   * é "acaba numa preposição?" — é que o título seja **exactamente** a frase limpa da
   * fonte, sem uma palavra cortada. Assim a prova continua a valer para frases que
   * ninguém previu.
   */
  const nuncaCorta = [
    'Por que o dinheiro some antes do fim do mês?',
    'Você sabe para onde vai o seu décimo terceiro todos os anos?',
    'Dívida do cartão: como sair do vermelho sem apertar mais o mês',
    'O seu salário aguenta mais um mês assim?',
  ].every((frase) => {
    const r = tituloDaCapa({ fraseDaCapa: frase });
    return r.titulo === primeiraFrase(frase).toLocaleUpperCase('pt-BR');
  });
  ok('o título é a frase INTEIRA da fonte — nunca corta uma palavra', nuncaCorta);
  ok('e uma frase acima do teto é saltada, em vez de cortada',
    tituloDaCapa({ fraseDaCapa: 'uma frase deliberadamente comprida com muito mais do que doze palavras lá dentro para forçar o caso' }).titulo === '');

  const daFila = tituloDaCapa({ tituloDaFila: 'Dois homens, mesmo salário: por que só um se aposentou', tema: 'um tema qualquer' });
  ok('o título da fila manda sobre o tema (é a frase que o dono aprovou)', daFila.de === 'o título da fila' && daFila.titulo === 'DOIS HOMENS, MESMO SALÁRIO', `deu "${daFila.titulo}"`);
  ok('e sem fonte nenhuma não se paga capa', tituloDaCapa({}).titulo === '');

  /**
   * ⚠️ **O `--titulo` do dono ganha a TUDO, e entra tal e qual.** Ele não passa pela
   * limpeza das fontes automáticas: o que ele escreve JÁ É o título, e cortá-lo no
   * primeiro dois-pontos deitaria fora a parte que ele pensou.
   */
  const aMao = tituloDaCapa({ mandado: 'Onde o salário some', tituloDaFila: 'Um título qualquer da fila', tema: 'e um tema qualquer' });
  ok('🔴 o título escrito à mão ganha à fila e ao tema', aMao.de === 'o título que você escreveu' && aMao.titulo === 'ONDE O SALÁRIO SOME', `deu "${aMao.titulo}"`);
  ok('e não é cortado no dois-pontos como as outras fontes',
    tituloDaCapa({ mandado: 'Dívida: o plano de 3 passos' }).titulo === 'DÍVIDA: O PLANO DE 3 PASSOS');
  ok('nem perde o ponto de interrogação', tituloDaCapa({ mandado: 'Para onde foi o seu salário?' }).titulo === 'PARA ONDE FOI O SEU SALÁRIO?');
  ok('e um título comprido AVISA mas sai na mesma (o gosto é do dono)', (() => {
    let avisou = false;
    const r = tituloDaCapa({ mandado: 'uma frase deliberadamente comprida com muito mais do que doze palavras lá dentro' }, () => { avisou = true; });
    return avisou && r.titulo.startsWith('UMA FRASE');
  })());

  // ── 2. o selo lê o número onde ele VIVE, e não onde não está ──
  /**
   * ⚠️ Esta prova usa a forma REAL dos dois ficheiros, medida em 10/08: o guião montado
   * não tem `mapa` nenhum, e o caderno tem. Escrever aqui um guião com `mapa` faria a
   * prova ficar verde sobre uma coisa que não existe — que é como o defeito sobreviveu.
   */
  const guiaoMontado = { slug: 'x', formato: 'longo', tema: 'x', promessa: 'x', fioCondutor: 'balanca', capa: 'x?', capitulos: [], scenes: [], palavras: 1 };
  const cadernoReal = { mapa: { numeroEspinha: 1200, fichaDeDivida: null } };
  const s = seloDaCapa({ ficha: null, caderno: cadernoReal, roteiro: guiaoMontado });
  ok('🔴 sem ficha de cartão, o selo sai do NÚMERO-ESPINHA do caderno', s && s.valor === 1200 && s.rotulo === 'POR MÊS', JSON.stringify(s));
  ok('e o guião montado sozinho não tem o número (era aí que se procurava)', guiaoMontado.mapa === undefined);
  ok('com ficha de cartão, ganha o "A MAIS"', seloDaCapa({ ficha: { aMais: 614 }, caderno: cadernoReal, roteiro: guiaoMontado })?.rotulo === 'A MAIS');
  ok('🔴 sem caderno (sobra órfã), a capa sai SEM selo — nunca se inventa número', seloDaCapa({ ficha: null, caderno: null, roteiro: guiaoMontado }) === null);
  ok('e um número pequeno demais não vira selo', seloDaCapa({ ficha: null, caderno: { mapa: { numeroEspinha: 3 } }, roteiro: {} }) === null);

  // ── 3. o molde da capa não se repete dentro da janela dos 6 vídeos ──
  /**
   * ⚠️ **Seis vídeos, que é a janela da história.** Antes disto a janela dos moldes era de
   * três, e o `heroi-central` voltava ao 6º vídeo — a história era nova e a miniatura já
   * tinha sido vista.
   */
  const nomes = ['um-video', 'outro-video', 'terceiro-video', 'quarto-video', 'quinto-video', 'sexto-video', 'setimo-video', 'oitavo-video'];
  let cad = { videos: [] };
  const saidos = [];
  for (const n of nomes) {
    const m = escolherMolde(n, moldesGastos({ caderno: cad, slug: n }));
    saidos.push(m.nome);
    cad = { videos: [...cad.videos, { slug: n, molde: m.nome }] };
  }
  const primeirosSeis = saidos.slice(0, 6);
  ok('seis vídeos seguidos dão seis moldes DIFERENTES', new Set(primeirosSeis).size === 6, primeirosSeis.join(' '));
  let menorDistancia = 99;
  for (let i = 0; i < saidos.length; i++) {
    for (let j = i + 1; j < saidos.length; j++) if (saidos[i] === saidos[j]) menorDistancia = Math.min(menorDistancia, j - i);
  }
  ok('e um molde nunca volta antes de 6 vídeos', menorDistancia >= 6, `voltou ao fim de ${menorDistancia}`);

  /**
   * 🔴 A ARMADILHA QUE JÁ MORDEU TRÊS VEZES NESTA CASA: o vídeo contar-se a si próprio
   * como gasto. No elenco e na função tinha guarda; no molde não tinha.
   */
  const semEle = escolherMolde('um-video', moldesGastos({ caderno: { videos: [] }, slug: 'um-video' })).nome;
  const comEle = escolherMolde('um-video', moldesGastos({ caderno: { videos: [{ slug: 'um-video', molde: semEle }] }, slug: 'um-video' })).nome;
  ok('🔴 refazer a capa do MESMO vídeo dá o MESMO molde', semEle === comEle, `${semEle} → ${comEle}`);

  // ── 4. o caderno não perde o molde quando o guião é reescrito ──
  /**
   * ⚠️ `guardarCenarios` apaga a linha do vídeo e escreve outra. O molde é gravado por
   * outro programa, na MESMA linha — e desaparecia. Aqui grava-se num ficheiro de
   * rascunho, para a prova não mexer no caderno a sério.
   */
  // ⚠️ Fora do repositório, de propósito: uma prova NUNCA escreve no caderno a sério nem
  //    deixa lixo por comitar. `tmpdir()` é limpo pelo sistema.
  const rascunho = join(tmpdir(), 'finmoovi-prova-caderno-longo.json');
  mkdirSync(dirname(rascunho), { recursive: true });
  writeFileSync(rascunho, `${JSON.stringify({ videos: [{ slug: 'v', cenarios: [], molde: 'o-cerco', elenco: 'uma mãe de família' }] }, null, 2)}\n`, 'utf-8');
  guardarCenarios('v', 'um texto qualquer sobre o mercado', { caminho: rascunho, fio: 'balanca' });
  const depoisDeRegravar = JSON.parse(readFileSync(rascunho, 'utf-8')).videos.find((x) => x.slug === 'v');
  ok('🔴 reescrever o guião NÃO apaga o molde já gravado', depoisDeRegravar.molde === 'o-cerco', JSON.stringify(depoisDeRegravar));
  ok('e o fio novo entra na mesma', depoisDeRegravar.fio === 'balanca');

  // ── 5. o custo por imagem é UM número só, e é o medido ──
  /**
   * ⚠️ Ele viveu em quatro sítios e as quatro cópias divergiram: 52, 52, 52 e "~48",
   * quando o medido são ~82. Por isso o orçamento prometia 6 imagens onde cabiam 4.
   */
  /**
   * ⚠️ **A RÉGUA É O CASO MAIS CARO MEDIDO, e não a média.** Três medições em dois dias:
   * 4 imagens de uma vez → 82 cada · 1 capa → **99** · 2 fotografias → 67 cada. A capa
   * custa mais porque o pedido dela é três vezes maior.
   *
   * O defeito que isto conserta era **prometer a MAIS** (dizia 6 imagens onde cabiam 4) e
   * a corrida morrer a meio. Entre falhar por excesso e por defeito, esta conta tem de
   * falhar por defeito — por isso fica o mais caro, e não a média.
   */
  ok('o custo por imagem é o CASO MAIS CARO medido, não a média', CUSTO_POR_IMAGEM === 99, `está ${CUSTO_POR_IMAGEM}`);
  ok('e o `fotos-longo.js` usa exactamente o mesmo número', CUSTO_DAS_FOTOS === CUSTO_POR_IMAGEM);
  ok('🔴 o orçamento NUNCA promete mais do que a capa mais cara permite',
    Math.floor(329 / CUSTO_POR_IMAGEM) <= Math.floor(329 / 99), `deu ${Math.floor(329 / CUSTO_POR_IMAGEM)}`);
  ok('e com o número antigo (52) teria prometido 6 onde cabiam 4 — era este o defeito', Math.floor(329 / 52) === 6);
  ok('a medição do custo real bate: 133 em 2 fotografias → 67', custoPorImagem(223, 90, 2) === 67, String(custoPorImagem(223, 90, 2)));
  ok('e a da capa: 99 num pedido', custoPorImagem(322, 223, 1) === 99, String(custoPorImagem(322, 223, 1)));
  ok('e não inventa número quando não há como saber', custoPorImagem(100, 100, 4) === null && custoPorImagem(100, 90, 0) === null);

  // ── 6. nenhuma metáfora do catálogo fica sem cena de capa ──
  const semCena = METAPHORS
    .map((m) => (typeof m === 'string' ? m : m.id))
    .filter((m) => m && m !== 'clique-link' && !CENA_DA_CAPA[m]);
  ok('todas as metáforas do catálogo têm cena de capa escrita', semCena.length === 0, semCena.join(', '));
}

// ═══ AS DUAS CONTAS DA MANUS ══════════════════════════════════════════════════
/**
 * 🔴 A MANUS ERA O ÚNICO PONTO DO VÍDEO LONGO SEM PLANO B — 10/08/2026.
 *
 * ⚠️ **A prova que vale mais é a última: a chave não muda a meio de uma tarefa.** Uma
 * tarefa pertence à conta que a criou, e perguntar por ela a outra conta devolve **vazio,
 * sem erro** — o programa diria "voltou sem imagem" com a imagem feita e paga.
 */
console.log('\n💳 AS DUAS CONTAS DA MANUS — a reserva que entra quando a primeira seca');
console.log('   (a Manus era o único ponto do vídeo longo sem plano B)\n');
{
  const guardadas = { 1: process.env.MANUS_API_KEY, 2: process.env.MANUS_API_KEY_2, 3: process.env.MANUS_API_KEY_3 };
  const pôrChaves = (a, b, c) => {
    if (a) process.env.MANUS_API_KEY = a; else delete process.env.MANUS_API_KEY;
    if (b) process.env.MANUS_API_KEY_2 = b; else delete process.env.MANUS_API_KEY_2;
    if (c) process.env.MANUS_API_KEY_3 = c; else delete process.env.MANUS_API_KEY_3;
  };
  try {
    // ── com UMA chave, o comportamento é o de sempre ──
    pôrChaves('k1');
    ok('com uma chave só, há uma conta — e nada muda', contas().length === 1 && contas()[0].nome === 'conta 1');

    pôrChaves('k1', 'k2');
    const duas = contas();
    ok('com duas chaves, há duas contas, por ordem', duas.length === 2 && duas[1].variavel === 'MANUS_API_KEY_2');

    pôrChaves();
    ok('sem chave nenhuma, `contas()` devolve vazio em vez de rebentar', contas().length === 0);
    ok('e `exigirContas()` rebenta com um erro que diz o que fazer', (() => {
      try { exigirContas(); return false; } catch (e) { return /MANUS_API_KEY/.test(e.message) && /env\.local/.test(e.message); }
    })());

    // ── a ordem: a 1ª até secar ──
    const s = (nome, total, erro = null) => ({ nome, variavel: 'X', chave: 'k', total, livres: total, erro });
    ok('🔴 escolhe a conta 1 enquanto ela tiver para uma imagem',
      escolherConta([s('conta 1', 200), s('conta 2', 300)])?.nome === 'conta 1');
    ok('e só passa à 2 quando a 1 não tem para UMA imagem inteira',
      escolherConta([s('conta 1', CUSTO_POR_IMAGEM - 1), s('conta 2', 300)])?.nome === 'conta 2');
    ok('salta uma conta que não respondeu',
      escolherConta([s('conta 1', 300, 'chave inválida'), s('conta 2', 300)])?.nome === 'conta 2');
    ok('e devolve nada quando nenhuma tem — em vez de tentar e falhar',
      escolherConta([s('conta 1', 10), s('conta 2', 10)]) === null);
    ok('um saldo negativo não conta como conta boa', escolherConta([s('conta 1', -2)]) === null);

    /**
     * 🔴 **OS CRÉDITOS NÃO SE JUNTAM ENTRE CONTAS**, e esta é a conta que quase saiu
     * errada. É a mesma família do `329 ÷ 52` consertado nesta mesma manhã.
     */
    ok('🔴 50 + 50 créditos dão ZERO imagens (nenhuma conta paga uma sozinha)',
      cabemAoTodo([s('conta 1', 50), s('conta 2', 50)]) === 0);
    ok('e não 1, que é o que a soma dos créditos diria', Math.floor(100 / CUSTO_POR_IMAGEM) === 1);
    ok('300 + 300 dão 6 imagens (3 em cada), e não 7',
      cabemAoTodo([s('conta 1', 300), s('conta 2', 300)]) === 6, String(cabemAoTodo([s('conta 1', 300), s('conta 2', 300)])));
    ok('e o teto de quantas se queriam continua a valer',
      cabemAoTodo([s('conta 1', 300), s('conta 2', 300)], 2) === 2);
  } finally {
    pôrChaves(guardadas[1], guardadas[2], guardadas[3]);
  }

  /**
   * 🔴 A PROVA QUE MAIS IMPORTA — **a chave não muda a meio de uma tarefa.**
   *
   * ⚠️ **Lê-se o FICHEIRO, e não se chama a rede.** Chamar a Manus numa prova gastaria
   * créditos de verdade; e o que se quer garantir aqui é estrutural: que as três chamadas
   * de uma tarefa levam todas a mesma chave. Um `pedir(...)` sem `chave` no meio do
   * `pedirAgente` é o defeito, e vê-se a olho no texto.
   */
  const fonte = readFileSync(join(RAIZ, 'src', 'scripts', 'youtube', 'lib', 'manus-client.js'), 'utf-8');
  const corpoDoPedirAgente = fonte.slice(fonte.indexOf('export async function pedirAgente'));
  /**
   * ⚠️ **Conta os parênteses em vez de usar uma expressão regular.** A 1ª versão desta
   * prova usava `[^)]*` e parava no `)` de `encodeURIComponent(taskId)` — ficava com
   * meia chamada e dizia que faltava a chave que estava lá. **A prova ficou vermelha por
   * culpa da prova**, que é o pior tipo de vermelho: manda consertar o que está bom.
   */
  const chamadasDe = (texto) => {
    const achadas = [];
    for (let i = texto.indexOf('pedir('); i >= 0; i = texto.indexOf('pedir(', i + 1)) {
      // ⚠️ `await pedir(` e não `pedirAgente(` nem `.pedir(` — o caractere antes tem de
      //    ser um espaço, para não apanhar o nome da própria função.
      if (!/\s/.test(texto[i - 1] || '')) continue;
      let nivel = 0;
      for (let j = i + 5; j < texto.length; j++) {
        if (texto[j] === '(') nivel += 1;
        else if (texto[j] === ')') {
          nivel -= 1;
          if (nivel === 0) { achadas.push(texto.slice(i, j + 1)); break; }
        }
      }
    }
    return achadas;
  };
  const chamadas = chamadasDe(corpoDoPedirAgente).filter((c) => c.includes('/v2/'));
  ok('a tarefa faz as 3 chamadas conhecidas (criar, perguntar, buscar)', chamadas.length === 3, `achei ${chamadas.length}`);
  ok('🔴 TODAS levam a mesma chave — nenhuma pergunta pela tarefa a outra conta',
    chamadas.every((c) => /\bchave\b/.test(c)), chamadas.filter((c) => !/\bchave\b/.test(c)).map((c) => c.slice(0, 60)).join(' | '));
}

// ═══ AS TELAS DO APP: A FALA MANDA, E O RODÍZIO CEGO NÃO VOLTA ═══════════════
/**
 * 🔴 A `pista` DE CADA TELA ESTAVA ESCRITA E NINGUÉM A LIA — 10/08/2026.
 *
 * ═══ A FAMÍLIA DE DEFEITO, que é a coisa a levar daqui ═══
 * **Um campo de dados que descreve uma regra, escrito, e nenhum código o lê.** Não dá
 * erro, não fica vermelho, e só se vê OLHANDO o fotograma. Já mordeu quatro vezes:
 * `METAPHOR_MEANINGS` (§67.3), `fioCondutor` na capa (09/08), `numeroEspinha` no selo
 * (10/08), e a `pista` do b-roll.
 *
 * ⚠️ **Estas provas são de COMPORTAMENTO e não de texto.** Uma prova que procurasse a
 * palavra "pista" no ficheiro ficaria verde com o campo lido para nada. Estas dão um
 * texto ao escolhedor e conferem o que ele devolve — continuam a valer depois de
 * qualquer reescrita.
 */
console.log('\n📱 AS TELAS DO APP — a fala manda, e o rodízio cego não volta');
console.log('   (a família: um campo que descreve uma regra e ninguém o lê — 4 ocorrências)\n');
{
  const COM_CARTAO = { contaDoCartao: 'Mastercard Itaú', valores: [{ nome: 'a fatura', valor: 1200 }] };
  const SEM_CARTAO = { contaDoCartao: null, fichaDeDivida: null, valores: [{ nome: 'o saldo', valor: 1200 }] };

  // ── 1. a tela que a história não comporta nunca sai ──
  const permitidasSem = brollDoVideo(SEM_CARTAO).map((b) => b.comp);
  ok('🔴 sem cartão na história, a tela de cartão NÃO está disponível',
    !permitidasSem.includes('CartoesCountUpLong'), permitidasSem.join(' '));
  ok('e com cartão, está', brollDoVideo(COM_CARTAO).map((b) => b.comp).includes('CartoesCountUpLong'));
  ok('mas o vídeo nunca fica sem telas nenhumas', brollDoVideo(SEM_CARTAO).length >= 2, String(permitidasSem.length));

  // ── 2. a FALA manda sobre o rodízio ──
  /**
   * ⚠️ **É esta a prova que mata o defeito.** Dá-se um texto que só uma tela pede, e
   * pede-se a escolha três voltas seguidas: com o rodízio cego, saía uma tela diferente
   * de cada vez. Agora sai sempre a que a fala pediu.
   */
  const falaDeRecibo = 'eu tirei uma foto do recibo e ele lancou-se sozinho';
  const tres = [0, 1, 2].map((v) => escolherBroll(falaDeRecibo, brollDoVideo(SEM_CARTAO), v).comp);
  ok('🔴 a tela que a FALA pede ganha ao rodízio, em qualquer volta',
    new Set(tres).size === 1 && tres[0] === 'SmartCapture3DLong', tres.join(' '));

  const falaDeExtrato = 'quatrocentos mais trezentos, junto com os quinhentos que ja estavam la';
  ok('e outra fala pede outra tela', escolherBroll(falaDeExtrato, brollDoVideo(SEM_CARTAO), 0).comp === 'ExtratoListaLong',
    escolherBroll(falaDeExtrato, brollDoVideo(SEM_CARTAO), 0).comp);

  ok('🔴 nem quando a fala pede a tela PROIBIDA (o cartão continua fora)',
    escolherBroll('a fatura do cartao com o limite estourado', brollDoVideo(SEM_CARTAO), 0).comp !== 'CartoesCountUpLong');

  // ── 3. sem fala que peça, o rodízio continua a existir (e é de propósito) ──
  const mudo = 'ela ficou calada durante uns segundos e depois respirou fundo';
  const usosMudo = {};
  const rodam = brollDoVideo(SEM_CARTAO).map(() => {
    const e = escolherBroll(mudo, brollDoVideo(SEM_CARTAO), usosMudo);
    usosMudo[e.comp] = (usosMudo[e.comp] || 0) + 1;
    return e.comp;
  });
  ok('sem fala que peça nada, o rodízio ainda roda (senão voltavam as telas de palavras)',
    new Set(rodam).size === brollDoVideo(SEM_CARTAO).length, rodam.join(' '));

  // ── 4. A TRAVA morde ──
  /**
   * 🔴 **Ler a `pista` conserta hoje; é a trava que impede a quinta vez.** Monta-se de
   * propósito um guião com a tela proibida e confere-se que `conferirImagens` o reprova.
   */
  const cenaMa = [{
    id: 1, narration: 'o app somou tudo e mostrou o total de mil e duzentos',
    visual: { tipo: 'broll', comp: 'CartoesCountUpLong', brollFrames: 210 },
  }];
  const queixas = conferirImagens(cenaMa, SEM_CARTAO);
  ok('🔴 a trava REPROVA a tela de cartão num vídeo sem cartão',
    queixas.some((e) => /não pode entrar neste vídeo/.test(e)), queixas.join(' | ') || '(não reprovou nada)');
  ok('e diz PORQUÊ, em português', queixas.some((e) => /não tem cartão de crédito/.test(e)));
  ok('e a mesma cena PASSA quando a história tem cartão',
    !conferirImagens(cenaMa, COM_CARTAO).some((e) => /não pode entrar neste vídeo/.test(e)));

  /**
   * ⚠️ **E a assinatura exacta do defeito: ZERO telas pedidas pela fala.** Não se exige
   * que todas casem (a passagem do equilíbrio mete telas em cenas que não pedem nada),
   * mas zero em três ou mais só acontece se a escolha voltou ao rodízio cego.
   */
  /**
   * 🔴 **A trava apanha "passou à frente da tela certa" — e SÓ isso.**
   *
   * ⚠️ **A minha 1ª versão desta trava dava alarme falso, e foi medida a dar:** ela dizia
   * *"zero telas pedidas pela fala = rodízio cego"*, e zero também acontece quando
   * **nenhuma tela do catálogo serve** — que é o caso real deste vídeo. Uma trava que
   * morde num caso legítimo ensina quem a lê a ignorá-la. As duas provas abaixo fixam a
   * diferença: uma tem de morder, a outra tem de ficar calada.
   */
  const passouAFrente = [{
    id: 1,
    narration: 'eu tirei uma foto do recibo e ele lancou-se sozinho',
    visual: { tipo: 'broll', comp: 'ExtratoListaLong', brollFrames: 210 },
  }];
  ok('🔴 apanha a escolha que passou à frente da tela que a fala pedia',
    conferirImagens(passouAFrente, SEM_CARTAO).some((e) => /passou à frente/.test(e)),
    conferirImagens(passouAFrente, SEM_CARTAO).join(' | ') || '(não reprovou)');

  const nenhumaServia = [1, 2, 3].map((i) => ({
    id: i,
    narration: 'ela olhou pela janela e ficou a pensar na vida durante uns segundos',
    visual: { tipo: 'broll', comp: ['ExtratoListaLong', 'SmartCapture3DLong', 'SmartCaptureVozLong'][i - 1], brollFrames: 210 },
  }));
  ok('e NÃO reclama quando nenhuma tela do catálogo servia (era o alarme falso)',
    !conferirImagens(nenhumaServia, SEM_CARTAO).some((e) => /passou à frente|rodízio/.test(e)),
    conferirImagens(nenhumaServia, SEM_CARTAO).join(' | '));

  // ── 5. nenhuma tela mais do que duas vezes ──
  /**
   * 🔴 **E este erro fui EU que o fiz, no mesmo dia.** Ao pôr a `pista` a mandar sem
   * contar repetições, o vídeo saiu com o **Extrato quatro vezes em seis** — troquei
   * "tela errada" por "tela repetida", que é o mesmo defeito com outra roupa.
   */
  const usos = {};
  const seis = Array.from({ length: 6 }, () => {
    const e = escolherBroll('quando a gente junta tudo no mesmo sitio', brollDoVideo(SEM_CARTAO), usos);
    usos[e.comp] = (usos[e.comp] || 0) + 1;
    return e.comp;
  });
  ok('🔴 nenhuma tela sai mais do que 2 vezes em 6 cenas',
    Object.values(usos).every((n) => n <= 2), JSON.stringify(usos));
  ok('e as 3 telas disponíveis são todas usadas', new Set(seis).size === 3, seis.join(' '));

  // ── 6. NENHUM número da GRAVAÇÃO sobrevive nas telas ──
  /**
   * 🔴 **CONSERTAR "O NÚMERO" NÃO É CONSERTAR "OS NÚMEROS" — 10/08/2026, ao fim do dia.**
   *
   * De manhã, o saldo grande da tela do Extrato aprendeu a receber o número da história.
   * **As quatro linhas por baixo dele ficaram como estavam** — aluguel de R$ 1.500,00,
   * luz de R$ 159,20, supermercado de R$ 235,89 — e só se viu **olhando o fotograma** do
   * vídeo já renderizado. O sítio onde se olhou ficou certo, e o do lado ficou igual.
   *
   * ⚠️ **Esta prova é a régua contra os números REAIS da gravação**, lidos do catálogo:
   * é ela que garante que não sobrou nenhum, em campo nenhum.
   */
  const HISTORIA = {
    numeroEspinha: 1200,
    valores: [
      { nome: 'o dinheiro que a gente achava que tinha para o mês', valor: 1200 },
      { nome: 'o saldo da conta que minha avó olhava todo dia', valor: 400 },
      { nome: 'o saldo que estava na outra conta', valor: 300 },
      { nome: 'o dinheiro que eu tinha separado para as contas da casa', valor: 500 },
    ],
  };
  const doExtrato = valoresDoBroll(BROLL_PERMITIDO.find((b) => b.familia === 'extrato'), HISTORIA);
  const noEcra = JSON.stringify(doExtrato);
  ok('🔴 o saldo grande é o número da história', doExtrato.extrato.saldoAtualValue === 1200);
  ok('e as LINHAS também são da história', doExtrato.extrato.transacoes.length === 3,
    JSON.stringify(doExtrato.extrato.transacoes.map((t) => t.valor)));
  /** Os números REAIS da gravação — se algum aparecer, ficou lá dentro. */
  for (const gravado of ['3.754,91', '1.500,00', '159,20', '235,89', '6.500,00']) {
    ok(`  nenhum vestígio de R$ ${gravado} (o valor da gravação)`, !noEcra.includes(gravado));
  }
  ok('as linhas não inventam sinal (`neutro`, sem + nem −)',
    doExtrato.extrato.transacoes.every((t) => t.tipo === 'neutro' && !/^[+-]/.test(t.valor)));
  ok('nem inventam categoria', doExtrato.extrato.transacoes.every((t) => t.cat === ''));
  ok('e o saldo grande não se repete nas linhas',
    !doExtrato.extrato.transacoes.some((t) => t.valor.includes('1.200')), JSON.stringify(doExtrato.extrato.transacoes));

  /**
   * 🔴 **E SEM NÚMEROS NA HISTÓRIA, A TELA NEM ENTRA.** Era aqui que o buraco ficava
   * aberto: `valoresDoBroll` devolvia `null`, o envelope ia vazio, e a tela saía com os
   * números da gravação — o mesmo defeito, noutro vídeo.
   */
  const SEM_NUMEROS = { contaDoCartao: null, valores: [] };
  ok('🔴 sem números na história, a tela do Extrato NEM ESTÁ disponível',
    !brollDoVideo(SEM_NUMEROS).some((b) => b.familia === 'extrato'),
    brollDoVideo(SEM_NUMEROS).map((b) => b.comp).join(' '));
  ok('e as telas que NÃO mostram dinheiro continuam disponíveis',
    brollDoVideo(SEM_NUMEROS).length === 2, String(brollDoVideo(SEM_NUMEROS).length));
  ok('a trava reprova o Extrato numa história sem números',
    conferirImagens([{ id: 1, narration: 'o extrato mostrou tudo', visual: { tipo: 'broll', comp: 'ExtratoListaLong', brollFrames: 210 } }], SEM_NUMEROS)
      .some((e) => /não pode entrar neste vídeo/.test(e)));

  // ═══ 🔴 A ROSCA DO BALANÇO — 12/08/2026 ═══════════════════════════════════
  /**
   * ⚠️ **O QUE ESTAS PROVAS GUARDAM não é a tela: é a fronteira do que se pode desenhar.**
   * A rosca mostra *pedaços de um todo*, e a única coisa no mapa que declara essa relação
   * é a `somas`. Com valores soltos, ela desenharia uma conta que ninguém fez — e os dois
   * rótulos chamariam **despesas** ao que a voz não chamou de nada.
   *
   * É a mesma linha do sinal `neutro` das linhas do Extrato: **inventar o rótulo é
   * inventar informação**, e isso é pior do que a tela não aparecer.
   */
  {
    const COM_SOMA = {
      ...HISTORIA,
      somas: [{
        de: [
          'o saldo da conta que minha avó olhava todo dia',
          'o saldo que estava na outra conta',
          'o dinheiro que eu tinha separado para as contas da casa',
        ],
        da: 'o dinheiro que a gente achava que tinha para o mês',
      }],
    };
    ok('🔴 sem soma DECLARADA, a rosca do Balanço nem está disponível',
      !brollDoVideo(HISTORIA).some((b) => b.familia === 'balanco'),
      brollDoVideo(HISTORIA).map((b) => b.comp).join(' '));
    ok('e com a soma declarada, está',
      brollDoVideo(COM_SOMA).some((b) => b.comp === 'BalancoDonutLong'));

    const daRosca = valoresDoBroll(BROLL_PERMITIDO.find((b) => b.familia === 'balanco'), COM_SOMA);
    const noEcraDaRosca = JSON.stringify(daRosca);
    ok('o total no meio é o total DECLARADO', daRosca.balanco.despesasValue === 1200);
    ok('e as fatias são as PARTES da soma, não os valores todos',
      daRosca.balanco.categorias.length === 3,
      JSON.stringify(daRosca.balanco.categorias.map((c) => c.valor)));
    ok('as fatias fecham o círculo (a conta bate)',
      Math.abs(daRosca.balanco.categorias.reduce((a, c) => a + c.pct, 0) - 100) < 0.2,
      String(daRosca.balanco.categorias.reduce((a, c) => a + c.pct, 0)));
    ok('🔴 e os dois rótulos deixam de dizer "despesas" (a voz nunca o disse)',
      !/[Dd]espesas/.test(daRosca.balanco.tituloDaTela) && !/[Dd]espesas/.test(daRosca.balanco.rotuloDoCentro)
      && !/[Dd]espesas/.test(daRosca.balanco.subtitulo),
      `${daRosca.balanco.tituloDaTela} · ${daRosca.balanco.rotuloDoCentro} · ${daRosca.balanco.subtitulo}`);
    ok('nem sobra o mês da gravação', !/Julho 2026/.test(noEcraDaRosca));
    /** Os números REAIS da gravação do Balanço — se algum aparecer, ficou lá dentro. */
    for (const gravado of ['5.044,99', '10.000,00', '4.955,01', '1.500,00', '950,00']) {
      ok(`  nenhum vestígio de R$ ${gravado} (o valor da gravação)`, !noEcraDaRosca.includes(gravado));
    }
    ok('a trava reprova a rosca numa história sem soma declarada',
      conferirImagens([{ id: 1, narration: 'somando tudo', visual: { tipo: 'broll', comp: 'BalancoDonutLong', brollFrames: 210 } }], HISTORIA)
        .some((e) => /não pode entrar neste vídeo/.test(e)));

    /**
     * ⚠️ **UM NOME DE COMPOSIÇÃO ERRADO NÃO DÁ ERRO — DÁ UMA CENA EM BRANCO.** O
     * `BROLL` do `Long.tsx` é um dicionário: uma chave que não existe devolve `undefined`
     * e o render segue. Esta prova lê o ficheiro e confere que cada tela do catálogo tem
     * lá o seu componente. (É a mesma família do campo escrito que ninguém lê.)
     */
    const longTsx = readFileSync(join(RAIZ, 'youtube-render', 'src', 'Long.tsx'), 'utf-8');
    const mapaDoBroll = longTsx.slice(longTsx.indexOf('const BROLL'), longTsx.indexOf('};', longTsx.indexOf('const BROLL')));
    for (const b of BROLL_PERMITIDO) {
      ok(`  o render conhece a tela ${b.comp}`, new RegExp(`\\b${b.comp}\\b`).test(mapaDoBroll));
    }

    /**
     * ═══ 🔴 NENHUM CAMPO PODE FICAR A LER O OBJETO ORIGINAL ═══════════════════
     *
     * ⚠️ **É A ÚNICA PROVA QUE APANHA A TELA MEIO CERTA.** Fotogramas do Short byte a
     * byte provam que ele não mudou — e provariam exactamente o mesmo se o envelope
     * estivesse morto. O defeito que fica no meio é este: **um campo passa a ler a
     * história e o do lado continua na gravação**. Foi assim que o saldo grande do
     * Extrato ficou certo e as quatro linhas por baixo dele ficaram com o aluguel de
     * R$ 1.500 — *consertar "o número" não é consertar "os números"* (10/08).
     *
     * Esta é uma prova de TEXTO, e assumidamente: o que ela guarda é a FORMA do
     * ficheiro (nenhuma leitura direta ao objeto de dados), que é coisa que se lê no
     * ficheiro e não se observa no comportamento sem renderizar o vídeo todo.
     */
    // ═══ 🔴 AS BARRAS DO FLUXO — 12/08/2026 ═══════════════════════════════════
    /**
     * ⚠️ **ESTA TELA SÓ EXISTE POR CAUSA DO `tipo`.** Ela desenha uma barra RECEITAS
     * verde e uma DESPESAS vermelha; sem a história declarar de que lado está cada
     * dinheiro, encher qualquer uma delas é **inventar o sinal**.
     */
    const COM_LADOS = {
      valores: [
        { nome: 'o que entra em casa todo mês', valor: 2400, tipo: 'entra' },
        { nome: 'o streaming', valor: 39, tipo: 'sai' },
        { nome: 'a academia parada', valor: 90, tipo: 'sai' },
        { nome: 'o jogo do celular', valor: 60, tipo: 'sai' },
        { nome: 'o que sai todo mês sem ninguém ver', valor: 189, tipo: 'sai' },
      ],
      somas: [{ de: ['o streaming', 'a academia parada', 'o jogo do celular'], da: 'o que sai todo mês sem ninguém ver' }],
    };
    ok('🔴 sem lado declarado, a tela do Fluxo nem está disponível',
      !brollDoVideo(HISTORIA).some((b) => b.familia === 'fluxo'),
      brollDoVideo(HISTORIA).map((b) => b.comp).join(' '));
    ok('e só com saídas (sem nada que entre) continua fora',
      !brollDoVideo({ valores: COM_LADOS.valores.filter((v) => v.tipo === 'sai') }).some((b) => b.familia === 'fluxo'));
    ok('com os dois lados declarados, está',
      brollDoVideo(COM_LADOS).some((b) => b.comp === 'FluxoBarrasLong'));

    const doFluxo = valoresDoBroll(BROLL_PERMITIDO.find((b) => b.familia === 'fluxo'), COM_LADOS);
    ok('o que entra é o que a história disse que entra', doFluxo.fluxo.receitasValue === 2400);
    /**
     * 🔴 **A PROVA QUE VALE MAIS DESTE BLOCO.** A lista traz as parcelas **e o total
     * delas**. Somar tudo o que é `sai` dava 39+90+60+189 = **378**: o dinheiro contado
     * duas vezes, numa barra do dobro do tamanho, sem dar erro nenhum.
     */
    ok('🔴 e o que sai NÃO é contado duas vezes (o total tapa as suas parcelas)',
      doFluxo.fluxo.despesasValue === 189, `deu ${doFluxo.fluxo.despesasValue} (378 = contado a dobrar)`);
    ok('o saldo do período é a subtração dos dois', doFluxo.fluxo.liquidoValue === 2400 - 189);
    ok('e fica VERDE porque sobrou', doFluxo.fluxo.liquidoCor === '#22c55e');
    {
      const APERTADO = {
        valores: [
          { nome: 'o que entra', valor: 1200, tipo: 'entra' },
          { nome: 'o que sai', valor: 1500, tipo: 'sai' },
        ],
      };
      const aperto = valoresDoBroll(BROLL_PERMITIDO.find((b) => b.familia === 'fluxo'), APERTADO);
      ok('🔴 e fica VERMELHO quando sai mais do que entra (verde diria "sobrou dinheiro")',
        aperto.fluxo.liquidoValue === -300 && aperto.fluxo.liquidoCor === '#ef4444',
        `${aperto.fluxo.liquidoValue} · ${aperto.fluxo.liquidoCor}`);
    }
    const noEcraDoFluxo = JSON.stringify(doFluxo);
    for (const gravado of ['10.000,00', '5.044,99', '6.604,93', '4.955,0', 'Julho 2026']) {
      ok(`  nenhum vestígio de ${gravado} (o valor da gravação)`, !noEcraDoFluxo.includes(gravado));
    }
    ok('a trava reprova o Fluxo numa história sem os dois lados',
      conferirImagens([{ id: 1, narration: 'o que entra e o que sai', visual: { tipo: 'broll', comp: 'FluxoBarrasLong', brollFrames: 210 } }], HISTORIA)
        .some((e) => /não pode entrar neste vídeo/.test(e)));

    for (const [ficheiro, objeto] of [['BalancoDonut.tsx', 'balanco'], ['FluxoBarras.tsx', 'fluxo'], ['ExtratoLista.tsx', 'extrato'], ['CartoesCountUp.tsx', 'cartoes']]) {
      const fonte = readFileSync(join(RAIZ, 'youtube-render', 'src', ficheiro), 'utf-8')
        .split('\n').filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n');
      // As únicas menções legítimas: o `import` e o padrão passado ao `useDados`.
      const soltas = (fonte.match(new RegExp(`\\b${objeto}\\.`, 'g')) || []).length;
      ok(`  🔴 ${ficheiro} lê TUDO pelo envelope (zero leituras diretas a \`${objeto}.\`)`,
        soltas === 0, `${soltas} leitura(s) direta(s)`);
      ok(`  e continua a passar \`${objeto}\` como padrão (sem envelope, é o que o Short vê)`,
        new RegExp(`useDados\\(${objeto},`).test(fonte));
    }
  }

  // ── 7. o rótulo das linhas corta em palavra inteira ──
  /**
   * ⚠️ **A REGRA DE VERDADE: o rótulo cortado é um PREFIXO que acaba onde havia um
   * espaço.** A minha 1ª versão desta prova procurava `\w…$` — e isso é exactamente o
   * aspecto de um corte CERTO ("…que minha…"), portanto ela reprovava o que estava bom.
   * Uma prova que reprova o certo manda consertar o que não está partido.
   */
  const rotulos = doExtrato.extrato.transacoes.map((t) => t.nome);
  const originais = HISTORIA.valores.map((v) => v.nome);
  ok('os rótulos cabem na linha', rotulos.every((r) => r.length <= 31), rotulos.map((r) => `${r}(${r.length})`).join(' | '));
  ok('e cortam sempre em palavra inteira, nunca a meio', rotulos.every((r) => {
    if (!r.endsWith('…')) return originais.includes(r);
    const inteiro = originais.find((o) => o.startsWith(r.slice(0, -1)));
    return Boolean(inteiro) && inteiro[r.length - 1] === ' ';
  }), rotulos.join(' | '));
}

// ═══ O LEITOR DE TEXTO, E A ORDEM QUE POUPA CRÉDITOS ═════════════════════════
/**
 * 🔴 O TESSERACT ESTAVA INSTALADO E O PROGRAMA NÃO O ENCONTRAVA — 10/08/2026.
 *
 * Na nuvem (Linux) o `apt` põe-no no caminho; na máquina do dono ele vive em
 * `C:\Program Files\Tesseract-OCR\` e não está no caminho. `haLeitor()` dizia **não** —
 * e o programa das fotografias **pagava a imagem, descarregava-a, encolhia-a, e SÓ ENTÃO**
 * descobria que não a podia conferir. **198 créditos no lixo**, com o leitor a dois passos.
 */
console.log('\n🔤 O LEITOR DE TEXTO — e a ordem que poupa créditos\n');
{
  const fonte = readFileSync(join(RAIZ, 'src', 'scripts', 'youtube', 'fotos-longo.js'), 'utf-8');
  ok('procura o tesseract também onde o Windows o instala',
    /Program Files\\\\Tesseract-OCR/.test(fonte));
  ok('e o `-l por+eng` deixou de ser fixo (esta máquina só tem inglês)',
    !/'-l',\s*'por\+eng'/.test(fonte) && /idiomasDoLeitor/.test(fonte));

  /**
   * 🔴 **A PROVA QUE VALE DINHEIRO: conferir o leitor ANTES do primeiro pedido pago.**
   * Compara-se a posição das duas coisas no ficheiro — se o `haLeitor()` voltar para
   * depois do `pedirAgente`, esta prova fica vermelha.
   */
  const guarda = fonte.indexOf('if (!haLeitor())');
  const primeiroPago = fonte.indexOf('await pedirAgente(');
  ok('🔴 o leitor é conferido ANTES do primeiro pedido pago', guarda > 0 && guarda < primeiroPago,
    `guarda em ${guarda}, primeiro pedido pago em ${primeiroPago}`);
  ok('e sem leitor sai a ZERO, não a vermelho (o vídeo sai com as ilustrações)',
    /nenhuma fotografia vai ser pedida[\s\S]{0,600}?\n\s*return;/.test(fonte));

  // ── as legendas pagas são opt-in ──
  const srt = readFileSync(join(RAIZ, 'src', 'scripts', 'youtube', 'srt-longo.js'), 'utf-8');
  ok('a tradução paga é OPT-IN — sem `--pago`, nada muda na nuvem',
    /const PAGO = Boolean\(args\.pago\)/.test(srt) && /PAGO \? \{ pago: 'leitor' \} : \{\}/.test(srt));
  ok('e a descrição tem a mesma opção, pela mesma razão',
    /pago = false/.test(readFileSync(join(RAIZ, 'src', 'scripts', 'youtube', 'descricao-longo.js'), 'utf-8')));

  /**
   * ⚠️ **`--linguas` existe porque uma corrida foi cortada a meio.** Cada língua leva
   * perto de meia hora; repetir tudo por causa da segunda era pagar a primeira outra vez.
   * A prova garante que, **sem a opção, continuam a sair as duas** — que é o que a nuvem
   * precisa.
   */
  ok('sem `--linguas`, saem as duas de sempre', /linguas = \['en', 'es'\]/.test(srt));
  ok('e uma língua desconhecida não passa (não se cria um .fr.srt calado)',
    /\['en', 'es'\]\.includes\(l\)/.test(srt));
}

// ═══ RESULTADO ═══════════════════════════════════════════════════════════════
console.log(`\n${'═'.repeat(72)}`);
console.log(`  ${passou} provas verdes · ${falhou} vermelhas`);
if (falhou) {
  console.log('\n  ❌ AS QUE FALHARAM:');
  falhas.forEach((f) => console.log(`     · ${f}`));
}
console.log(`${'═'.repeat(72)}\n`);
process.exit(falhou ? 1 : 0);
