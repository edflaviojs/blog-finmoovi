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

import { readFileSync, existsSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

import { iniciosDasCenas, VOZ_ENTRA_FRAMES, RESPIRO_SEC, CARTAO_CAPITULO_FRAMES } from '../youtube/srt-longo.js';
import { proximoDomingo, emPortugues, palavrasChave, montarMetadados, tituloAprovado, acharCapa, estreiaOcupada } from '../youtube/upload-longo.js';
import { proximoLongo, comoArgumentos } from '../youtube/pick-next-longo.js';
import { conferirTema, caudaDoTitulo, fazerSlug } from '../youtube/temas-longo.js';
import { conferirImagens, escolherLugaresDaFoto } from '../youtube/lib/imagens-longo.js';
import { PAPEIS, pistaDaCena, pedidoDaFoto, pedidoDoCartaz, doBanco, guardarNoBanco, NAO_REPETIR_EM } from '../youtube/fotos-longo.js';
import { tempoDosCapitulos } from '../youtube/descricao-longo.js';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const FPS = 30;
const SIGNATURE_FRAMES = 75;

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
    total: VOZ_ENTRA_FRAMES + conteudo + SIGNATURE_FRAMES,
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
    Math.abs((legenda.fimDoConteudo + SIGNATURE_FRAMES / FPS) - render.total / FPS) < 0.0005,
    `${(legenda.fimDoConteudo + SIGNATURE_FRAMES / FPS).toFixed(3)}s contra ${(render.total / FPS).toFixed(3)}s`,
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
  const { marcas } = tempoDosCapitulos(planoDeMesa, timingDeMesa);
  const cartoesDaLegenda = [];
  planoDeMesa.scenes.forEach((c, i) => {
    if (c.abreCapitulo && c.capitulo) cartoesDaLegenda.push(legenda.inicios[i] - CARTAO_CAPITULO_FRAMES / FPS);
  });
  const minuto = (s) => Math.floor(Math.max(0, s));
  ok(
    'há um capítulo na descrição para cada cartão de capítulo do vídeo',
    marcas.length === cartoesDaLegenda.length,
    `${marcas.length} contra ${cartoesDaLegenda.length}`,
  );
  ok(
    'e o segundo escrito na descrição nunca cai DEPOIS de o capítulo começar',
    marcas.every((m, i) => minuto(m.seg) <= minuto(cartoesDaLegenda[i])),
    marcas.map((m, i) => `${minuto(m.seg)}>${minuto(cartoesDaLegenda[i])}`).join(' '),
  );
  const desvio = Math.max(...marcas.map((m, i) => Math.abs(m.seg - cartoesDaLegenda[i])));
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
  ok('as etiquetas cabem no limite do YouTube (~460 caracteres)', etiquetas.join(',').length <= 460);
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
  ok(
    'o robô dá 5 horas ao vídeo (são dez mil fotogramas)',
    /timeout-minutes:\s*300/.test(fluxo),
  );
  ok(
    'e confirma que o costureiro do som existe antes de começar',
    /ffmpeg/.test(fluxo) && /ffprobe/.test(fluxo),
  );
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
    /** O que foi medido no ficheiro entregue: **10131 fotogramas, 337,700 s** (§44.4). */
    ok(
      'a conta dá os 10131 fotogramas exatos do vídeo que vai ao ar',
      render.total === 10131,
      `deu ${render.total}`,
    );
    ok(
      'e a legenda acaba onde o vídeo acaba (a menos da assinatura)',
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
    ok(
      'e cai no mesmo sítio que a escolha feita à mão (a duas cenas de distância, no máximo)',
      aMao.length === 3 && porRegra.every((id, i) => Math.abs(id - aMao[i]) <= 2),
      `à mão ${aMao.join(' · ')} · por regra ${porRegra.join(' · ')}`,
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

// ═══ RESULTADO ═══════════════════════════════════════════════════════════════
console.log(`\n${'═'.repeat(72)}`);
console.log(`  ${passou} provas verdes · ${falhou} vermelhas`);
if (falhou) {
  console.log('\n  ❌ AS QUE FALHARAM:');
  falhas.forEach((f) => console.log(`     · ${f}`));
}
console.log(`${'═'.repeat(72)}\n`);
process.exit(falhou ? 1 : 0);
