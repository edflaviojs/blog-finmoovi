/**
 * O ESQUELETO DO VÍDEO LONGO — só VERDADE, medida por código (04/08/2026).
 *
 * ═══ O QUE ESTE FICHEIRO É ═══
 * As travas do roteiro de ~6 minutos. Nada aqui julga GOSTO: quem julga se a frase
 * soa a pessoa é o segundo leitor (`lib/segundo-leitor.js`), que já serve o Short.
 * A regra é a de [[verdade-versus-gosto]]: *o que se calcula não se pede ao modelo;
 * o que é gosto não se mede com regex.*
 *
 * ═══ A FORMA, E DE ONDE ELA VEM (não é palpite) ═══
 * `.github/data/youtube-capitulos.json` — 64 capítulos REAIS de 7 vídeos longos de
 * finanças brasileiros, colhidos pela API oficial (IMPLEMENTACAO20 §33.5). Medido:
 *  · 9 capítulos por vídeo (6 a 11), ~106s cada, o 1º com 74s;
 *  · as aberturas boas NOMEIAM a promessa ("O plano para juntar R$ 10 mil do zero
 *    absoluto"); as fracas chamam-se "Introdução" (4 dos 64 títulos);
 *  · os fechos bons são LAÇO ABERTO ("Como passar dos R$ 10 mil para os R$ 100 mil");
 *  · títulos: mínimo 1 palavra, mediana 7, MÁXIMO REAL 13.
 * Daí o esqueleto de 6 minutos: abertura 30-40s → 3 capítulos de ~90s → fecho ~40s.
 * ⚠️ O 1º capítulo deles (74s) é longo de mais para nós: nos NOSSOS Shorts metade da
 * audiência sai aos 14s (§33.2). Por isso a abertura são 30-40s, não 74.
 *
 * ═══ POR QUE OS BLOCOS SÃO SEIS, E NÃO CINCO ═══
 * A chamada (a CTA) é um BLOCO PRÓPRIO, o penúltimo. Ordem do dono: *"a CTA aparece
 * UMA vez (penúltimo bloco) e o bordão UMA vez (no fim). Repetir em cada capítulo é
 * o erro que mata o formato longo."* Sendo bloco próprio, "aparece uma vez" deixa de
 * ser uma contagem de palavras num texto corrido e passa a ser ESTRUTURA — e não há
 * forma barata de a cumprir sem fazer o que se quer. Ver a nota do dono no §3b: a CTA
 * no penúltimo capítulo, nunca no fim.
 *
 * ═══ O ORÇAMENTO DE PALAVRAS É POR BLOCO, E O TOTAL É SÓ INFORMAÇÃO ═══
 * ⚠️ É a lição das ÂNCORAS (§26.3 L1) aplicada ao tamanho, e é deliberada.
 * Se houvesse um teto GLOBAL a reprovar, um vídeo com os seis blocos todos dentro do
 * orçamento podia ser reprovado no fim — e o corretivo não saberia a QUEM pedir corte.
 * É o pêndulo do §19.4 num texto dez vezes maior. Cada bloco responde pelo seu
 * tamanho, ninguém responde pelo dos outros, e o total sai calculado no ecrã.
 */

import { METAPHORS, BORDAO, longestSharedWordRun } from './schema-short.js';
import { keywordFalada, MAX_PALAVRAS_CAPA, semAcento } from './palavras.js';

// ─── a forma ─────────────────────────────────────────────────────────────────

/** Os seis blocos, na ordem em que são falados. */
export const BLOCOS_LONGO = ['abertura', 'capitulo1', 'capitulo2', 'capitulo3', 'chamada', 'fecho'];

/**
 * AS PARTES DE UM CAPÍTULO — e a demonstração do app deixou de estar em todos.
 *
 * ⚠️ MUDANÇA DE 04/08/2026, depois de o dono ver o primeiro vídeo:
 * *"eu joguei na calculadora do FinMoovi… não me parece ser apenas 1 ideia central"*.
 * Ele tinha razão, e a culpa era do desenho: eu tinha tornado a demonstração do app
 * um parágrafo OBRIGATÓRIO nos três capítulos. Num vídeo de 50 segundos uma
 * demonstração é o certo; em seis minutos, três demonstrações é a mesma cena contada
 * três vezes — e o pior é que os dados dos concorrentes (§33.5) já diziam que o app
 * merece UM capítulo, não uma menção em todos. Eu li isso e fiz o contrário.
 *
 * Agora: as três partes de baixo existem sempre, e a **demonstração vive num capítulo
 * só**, escolhido no mapa. Nos outros dois o nome do produto nem pode ser dito.
 */
export const PARTES_DO_CAPITULO = ['pergunta', 'desenvolvimento', 'regancho'];

/** A parte extra, que só o capítulo da demonstração tem. */
export const PARTE_DEMO = 'demonstracao';

/** Tudo o que pode existir num capítulo, pela ordem em que é falado. */
export const PARTES_POSSIVEIS = ['pergunta', 'desenvolvimento', 'demonstracao', 'regancho'];

export const NUM_CAPITULOS = 3;

/**
 * A velocidade da voz é a MEDIDA do pipeline, não um palpite: 2,6 palavras/s saíram
 * do log real do TTS (§19 / roteiro-narrativa.js). Reaproveitada aqui à letra para
 * os dois formatos falarem a mesma língua — se um dia se medir outra, muda-se lá e
 * aqui, e o comentário obriga a lembrar dos dois.
 */
export const PALAVRAS_POR_SEGUNDO = 2.6;

/**
 * O ORÇAMENTO POR BLOCO. A conta que os produziu (a 2,6 palavras/s):
 *   abertura  90-120 →  35-46s   (alvo do dono: 30-40s)
 *   capítulo 190-240 →  73-92s   (alvo: ~90s · a média real dos concorrentes é 106s)
 *   chamada    22-40 →   8-15s
 *   fecho     85-115 →  33-44s   (alvo: ~40s)
 * Somando os alvos: ~880 palavras ≈ 5min39 de fala + respiros ≈ 6 minutos.
 * O dono fechou ~6 min (~800 palavras); só cresce para 8-10 DEPOIS de haver
 * retenção medida.
 */
export const ORCAMENTO = {
  abertura: { min: 90, max: 120 },
  capitulo: { min: 190, max: 240 },
  /**
   * ⚠️ O ATO QUE LEVA A DEMONSTRAÇÃO TEM ORÇAMENTO PRÓPRIO — e a 19ª ocorrência do
   * defeito nº1 desta casa mora aqui, medida na 1ª corrida do modelo novo.
   * Esse ato tem QUATRO partes em vez de três, e o prompt pede-lhe a pergunta, ~50s
   * de história, ~25s de demonstração e o re-gancho. Isso não cabe em 240 palavras.
   * Resultado: o capítulo 2 saiu com 243 e foi reprovado por três palavras — o prompt
   * a pedir mais do que a trava deixa, outra vez.
   * A conta: 240 + os ~25s da demonstração a 2,6 palavras/s ≈ 65 palavras.
   */
  capituloComDemo: { min: 215, max: 285 },
  chamada: { min: 22, max: 40 },
  fecho: { min: 85, max: 115 },
};

/**
 * ═══ OS TRÊS MOVIMENTOS DA HISTÓRIA ═══
 *
 * ⚠️ NASCEU DE UM DEFEITO MEDIDO NA 1ª CORRIDA DO MODELO NOVO (04/08/2026).
 * Eu tinha dito ao modelo "três atos da mesma história" e nunca lhe disse QUAIS. Ele
 * fez o que era previsível: dois atos a contar a mesma cena. No vídeo que saiu, o
 * ato 1 e o ato 2 eram **o mesmo domingo, a mesma fatura na mão e a mesma soma** —
 * mudavam as palavras, mas quem via ouvia duas vezes a mesma descoberta. Isto é a
 * outra cara do defeito que o dono apontou: antes eram três histórias, agora era uma
 * história contada três vezes.
 *
 * A cura é dar nome aos movimentos. Não é uma trava (medir se um ato "avança" é
 * gosto), é **desenho**: o ato 2 tem de trazer um MECANISMO — a coisa que a pessoa
 * não sabia e que explica por que o problema não se resolve sozinho. É aí que mora o
 * "um único ensinamento" que o dono pediu.
 */
export const MOVIMENTOS = [
  {
    nome: 'O SUSTO',
    faz: 'o número aparece. O narrador conta como o descobriu, e quem ouve sente o baque com ele.',
    proibido: 'explicar a causa — isso é do ato 2. Aqui só se DESCOBRE.',
  },
  {
    nome: 'A ARMADILHA',
    faz: 'o ENSINAMENTO do vídeo: o mecanismo que a pessoa não conhece e que faz o problema continuar mesmo quando ela se esforça. É a parte que ela vai repetir a alguém.',
    proibido: 'voltar a descobrir o número — ele já foi descoberto no ato 1. Aqui ele já se sabe, e o que é novo é POR QUE ele não desaparece.',
  },
  {
    nome: 'A VIRADA',
    faz: 'o que o narrador fez de diferente depois de perceber a armadilha, e o que mudou no mês seguinte.',
    proibido: 'prometer que é fácil, ou repetir a descoberta. Aqui já se AGE.',
  },
];

/**
 * ⚠️ O TETO DO TÍTULO DE CAPÍTULO SAI DOS DADOS REAIS, NÃO DE GOSTO.
 * Medido nos 64 títulos reais: mínimo 1, mediana 7, **máximo 13**. Com 13, nenhum
 * título que os concorrentes publicaram seria reprovado — a trava existe só para
 * impedir que uma FRASE inteira vá parar ao título, não para julgar o estilo deles.
 * É a regra da 14ª ocorrência: antes de pôr um número numa trava, verificar se ele
 * deixa passar o exemplo que veio de fora. (`validar-roteiro-longo.js` prova 64/64.)
 */
export const MAX_PALAVRAS_TITULO = 13;

/**
 * OS TÍTULOS QUE NÃO DIZEM NADA — o achado do §33.5, virado regra.
 * "as aberturas boas nomeiam a promessa; as fracas chamam-se Introdução."
 * Nos 64 títulos reais, quatro caem aqui. É VERDADE mecânica (o título é ou não é
 * uma destas palavras), não julgamento de qualidade.
 */
const TITULOS_GENERICOS = [
  'introducao', 'intro', 'conclusao', 'consideracoes finais', 'resumo', 'sumario',
  'apresentacao', 'sobre o tema', 'o comeco', 'final', 'fim', 'encerramento',
  'parte 1', 'parte 2', 'parte 3', 'capitulo 1', 'capitulo 2', 'capitulo 3',
];

/**
 * AS PALAVRAS DA CHAMADA. Só podem existir no bloco `chamada` — é a trava que
 * garante o "CTA uma vez" do dono. Repare que `finmoovi` NÃO está aqui de propósito:
 * o app tem o seu momento no capítulo da demonstração, e é lá que o nome se diz. Quem
 * cuida de "o app aparece uma vez só" é a trava própria em `validarLongo`, não esta.
 * O que só pode acontecer uma vez é o PEDIDO: comentar, inscrever, curtir, ir ao link.
 *
 * ⚠️ TRÊS PALAVRAS ÓBVIAS FICARAM DE FORA, E CADA UMA POR UM CASO REAL DO APP:
 *  · "clicar/clique" — a demonstração do app é alguém a CLICAR num botão. Bani-la
 *    seria punir exatamente o que o prompt manda escrever (a 16ª ocorrência).
 *  · "compartilhar" — o FinMoovi TEM partilha de conta (IMPLEMENTACAO8); um capítulo
 *    sobre dividir despesas diria a palavra com toda a legitimidade.
 *  · "descrição" solta — no app, cada lançamento tem uma descrição. Só o sentido de
 *    "link lá na descrição" é que é chamada, e é esse que a expressão apanha.
 */
const PALAVRAS_DE_CHAMADA = /\b(comenta\p{L}*|coment[áa]ri\p{L}*|inscrev\p{L}*|inscri[çc]\p{L}*|inscrit\p{L}*|curte|curtir|likes?|links?|sininho)\b|\b(na|d[ao]) (descri[çc][ãa]o|bio)\b/iu;

/**
 * O QUE O FECHO NÃO PODE CITAR — copiado em ESPÍRITO da trava do Short (a razão está
 * escrita lá): o fecho é a RESPOSTA à promessa mais a assinatura. O app teve os três
 * capítulos, o pedido teve o bloco da chamada.
 * ⚠️ Aqui NÃO se pode reutilizar a função do Short: ela vive dentro de
 * `validarNarrativa`, em `roteiro-narrativa.js` — ficheiro que o robô diário corre
 * todos os dias e que esta noite está proibido de tocar. Está registado no §34 como
 * dívida: quando o longo for aprovado, as duas pontas vão para um sítio só.
 */
const FONTE_NO_FECHO = /\b(blogs?|coment\p{L}*|links?|canal|canais|inscri\p{L}*|inscrev\p{L}*|finmoovi|apps?|aplicativos?)\b/iu;

/**
 * PROMESSA DE VÍDEO FUTURO — proibida, e é VERDADE, não gosto.
 * O "próximo vídeo" só pode ser nomeado quando a ESTEIRA existir (F2 do §14, ainda
 * por fazer): sem ela, dizer o próximo tema é mentira, e foi por isso que a cena
 * "PRÓXIMO ▶" foi removida do Short. O laço aberto do fecho é uma provocação no
 * PRÓPRIO tema, nunca um título que ainda não existe.
 */
const PROMESSA_DE_PROXIMO = /\b(pr[óo]ximo v[íi]deo|no pr[óo]ximo|parte dois|parte 2|semana que vem|pr[óo]xima semana|amanh[ãa] eu (te )?mostro)\b/iu;

/** Brindes que o canal NÃO tem (mesma lista do Short — promessa falsa é o pior defeito). */
const BRINDES_PROIBIDOS = /\b(planilha|ebook|e-book|pdf|apostila|curso|aula|checklist|mapa mental|template|guia completo)\b/i;

/** Diminutivo que tira o valor do dinheiro (mesma razão do Short). */
const REBAIXA_GRANDEZA = /\b(centavos?|dinheirinho|trocadinho|moedinha|mixaria|migalha)\b/i;

/**
 * RADICAL DE RENDIMENTO — a mesma lista do Short, e com as MESMAS ausências
 * deliberadas: "vira" e "juro" (singular) ficaram de fora porque o próprio prompt
 * manda "o pequeno vira grande" e porque "Juro que…" é o verbo jurar. O buraco que
 * isso deixa está assumido no §31.3 e continua assumido aqui.
 */
const RADICAL_RENDIMENTO = /\b(rend\p{L}*|juros|selic|cdi|tesouro|poupanc\p{L}*|invest\p{L}*)\b/u;

const EXTENSO_VALOR = {
  um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9,
  dez: 10, onze: 11, doze: 12, treze: 13, catorze: 14, quatorze: 14, quinze: 15,
  dezesseis: 16, dezessete: 17, dezoito: 18, dezenove: 19,
  vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60,
  setenta: 70, oitenta: 80, noventa: 90,
  cem: 100, cento: 100, duzentos: 200, duzentas: 200, trezentos: 300, trezentas: 300,
  quatrocentos: 400, quatrocentas: 400, quinhentos: 500, quinhentas: 500,
  seiscentos: 600, seiscentas: 600, setecentos: 700, setecentas: 700,
  oitocentos: 800, oitocentas: 800, novecentos: 900, novecentas: 900,
};

/**
 * LÊ OS NÚMEROS DE UMA FRASE, em algarismo E por extenso composto.
 * "dois mil seiscentos e noventa e nove" é UM número (2699), não quatro pedaços —
 * a versão ingénua reprovava o valor CERTO dito como o canal manda (§31.3-b).
 * "por cento" corta a leitura: "catorze por cento" é percentagem, não o número 14.
 *
 * ⚠️ DUPLICAÇÃO CONSCIENTE. O gémeo desta função vive dentro de `validarNarrativa`
 * (roteiro-narrativa.js). Extraí-la para um sítio só obrigaria a EDITAR o ficheiro
 * que o robô diário corre — proibido nesta noite. Registado no §34 com o conserto.
 */
export function valoresDaFrase(frase) {
  const achados = new Set();
  for (const m of String(frase).matchAll(/\d[\d.]*\d|\d+/g)) {
    const v = Number(String(m[0]).replace(/\./g, ''));
    if (Number.isFinite(v)) achados.add(v);
  }
  const tokens = semAcento(frase).split(/[^\p{L}]+/u).filter(Boolean);
  let acc = 0;
  let total = 0;
  let lendo = false;
  const fechar = () => {
    if (lendo && total + acc > 0) achados.add(total + acc);
    acc = 0; total = 0; lendo = false;
  };
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === 'mil') { total += (acc || 1) * 1000; acc = 0; lendo = true; continue; }
    if (Object.prototype.hasOwnProperty.call(EXTENSO_VALOR, t)) {
      if (tokens[i + 1] === 'por' && tokens[i + 2] === 'cento') { acc = 0; total = 0; lendo = false; i += 2; continue; }
      acc += EXTENSO_VALOR[t];
      lendo = true;
      continue;
    }
    if (t === 'e' && lendo) continue;
    fechar();
  }
  fechar();
  return [...achados].filter((v) => v >= 10);
}

/**
 * ═══ OS NÚMEROS QUE NÃO SÃO DINHEIRO ═══
 *
 * ⚠️ ESTA LISTA É A DIFERENÇA ENTRE UMA TRAVA ÚTIL E UMA TRAVA INSUPORTÁVEL.
 * A trava nova exige que **todo valor em dinheiro dito no vídeo esteja declarado no
 * mapa**. Mas o leitor de números não sabe o que é dinheiro: para ele, "dez anos",
 * "quinze dias" e "vinte minutos" são números como os outros, e reprovariam frases
 * perfeitamente inocentes.
 * A regra: um número seguido de uma destas palavras é MEDIDA, não dinheiro. Tudo o
 * resto, num canal de finanças, é dinheiro na prática.
 * ⚠️ Não se pode exigir a palavra "reais" a seguir ao número, e isto foi medido: na
 * fala natural ela cai a partir do segundo item — *"Foram oitenta reais de verdura.
 * Cento e vinte de carne."* O 120 não tem "reais" nenhum ao lado e é dinheiro na
 * mesma. Por isso a lista é de EXCEÇÕES, não de confirmações.
 */
const UNIDADES_QUE_NAO_SAO_DINHEIRO = [
  'ano', 'anos', 'mes', 'meses', 'dia', 'dias', 'semana', 'semanas',
  'hora', 'horas', 'minuto', 'minutos', 'segundo', 'segundos',
  'vez', 'vezes', 'passo', 'passos', 'por cento', 'graus', 'quilo', 'quilos',
];

/**
 * Os valores em DINHEIRO ditos num texto.
 *
 * ⚠️ A DECISÃO É PELA PALAVRA QUE VEM LOGO A SEGUIR AO NÚMERO, e a 1ª versão desta
 * função errava exatamente aí: ela procurava a palavra de medida em QUALQUER sítio da
 * frase. Numa frase como *"Trinta e nove reais de um streaming que ninguém abria
 * desde o ano passado"*, o "ano" lá no fim fazia os trinta e nove passarem por medida
 * de tempo e desaparecerem da conta. Apanhado a escrever o exemplo, antes de correr.
 *
 * Por isso este leitor tem o seu próprio contador de palavras: quando um número
 * fecha, olha-se para o token IMEDIATAMENTE a seguir. Só esse decide.
 */
export function valoresEmDinheiro(texto) {
  const tokens = semAcento(texto).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const achados = new Set();
  let acc = 0;
  let total = 0;
  let lendo = false;

  const fechar = (proxima) => {
    if (lendo && total + acc >= 10) {
      const medida = UNIDADES_QUE_NAO_SAO_DINHEIRO.includes(proxima)
        // "por cento" são dois tokens: o "por" sozinho não chega
        || (proxima === 'por');
      if (!medida) achados.add(total + acc);
    }
    acc = 0; total = 0; lendo = false;
  };

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (/^\d+$/.test(t)) { acc += Number(t); lendo = true; continue; }
    if (t === 'mil') { total += (acc || 1) * 1000; acc = 0; lendo = true; continue; }
    if (Object.prototype.hasOwnProperty.call(EXTENSO_VALOR, t)) { acc += EXTENSO_VALOR[t]; lendo = true; continue; }
    if (t === 'e' && lendo) continue;
    fechar(t);
  }
  fechar('');
  return [...achados];
}

// ─── utilitários de contagem ─────────────────────────────────────────────────

export const contarPalavras = (txt) => String(txt || '').trim().split(/\s+/).filter(Boolean).length;

/**
 * A QUEIXA DE TAMANHO DIZ QUANTAS PALAVRAS FALTAM OU SOBRAM — e isso não é cosmética.
 * MEDIDO na 1ª corrida real (04/08): o capítulo 2 veio com 266 palavras, depois 252,
 * depois 242, e esgotou as tentativas a DOIS do teto. Ele estava a convergir às
 * cegas, porque a queixa só dizia a faixa. Dizer-lhe "corte 26 palavras" transforma
 * três tentativas de adivinha numa instrução que se cumpre à primeira.
 * ⚠️ A expressão "palavras — o orçamento" tem de continuar aqui: é por ela que o
 * corretivo reconhece a queixa de tamanho e a SUBSTITUI em vez de a acumular (senão
 * "curta demais" e "longa demais" chegam juntas e não há como acertar).
 */
function queixaDeTamanho(onde, n, faixa) {
  const alvo = Math.round((faixa.min + faixa.max) / 2);
  const ajuste = n > faixa.max
    ? `**CORTE ${n - faixa.max} palavras** (o ideal é ficar perto de ${alvo}).`
    : `**ACRESCENTE ${faixa.min - n} palavras** (o ideal é ficar perto de ${alvo}).`;
  return `${onde}: ${n} palavras — o orçamento deste bloco é ${faixa.min} a ${faixa.max} `
    + `(≈${Math.round(faixa.min / PALAVRAS_POR_SEGUNDO)}-${Math.round(faixa.max / PALAVRAS_POR_SEGUNDO)}s). ${ajuste}`;
}

export const frasesDe = (txt) => String(txt || '').split(/(?<=[.!?…])\s+/).map((f) => f.trim()).filter(Boolean);

const soPalavras = (s) => semAcento(s).replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();

const BORDAO_EM_PALAVRAS = soPalavras(BORDAO);
const ANCORA_DO_BORDAO = semAcento('dinheiro sem controle');

const VAZIAS_DE_ASSUNTO = new Set([
  'para', 'pelo', 'pela', 'como', 'quando', 'onde', 'quanto', 'porque', 'porquê', 'que', 'com', 'sem',
  'você', 'voce', 'seu', 'sua', 'seus', 'suas', 'mais', 'menos', 'todo', 'toda', 'todos', 'todas',
  'isso', 'esse', 'essa', 'este', 'esta', 'aquilo', 'ainda', 'nunca', 'sempre', 'muito', 'pouco',
  'agora', 'depois', 'antes', 'entre', 'sobre', 'cada', 'mesmo', 'mesma', 'ser', 'estar', 'fazer',
  'tem', 'tinha', 'vai', 'vou', 'está', 'esta', 'dele', 'dela', 'meu', 'minha',
]);

/** As palavras de ASSUNTO de um texto (4+ letras, sem as vazias). Sem acento, minúsculas. */
export function palavrasDeAssunto(txt) {
  return [...new Set(
    String(txt || '')
      .split(/[^\p{L}\p{N}]+/u)
      .map((w) => w.toLocaleLowerCase('pt-BR'))
      .filter((w) => w.length >= 4 && !VAZIAS_DE_ASSUNTO.has(w))
      .map((w) => semAcento(w)),
  )];
}

/**
 * 🔴 O SINGULAR DE UMA PALAVRA — e por que isto existe (08/08/2026).
 *
 * O primeiro vídeo longo automático MORREU por causa de uma letra. A trava do fecho
 * (mais abaixo) exige que a resposta fale do MESMO assunto que a promessa, e media
 * isso comparando palavras por igualdade. Estas duas frases deram ZERO em comum:
 *
 *   promessa: "...duas pessoas com a mesma vida chegam a aposentadoriaS diferentes"
 *   resposta: "...o jeito de lidar com os quinhentos reais antes de chegar a aposentadoria"
 *
 * A resposta estava certa. O "s" é que não estava. As três tentativas reprovaram
 * pelo mesmo motivo, a corrida morreu, e o canal ficou sem o vídeo da semana — o
 * robô semanal só volta a correr no sábado seguinte.
 *
 * ⚠️ Isto NÃO é um radical de verdade nem quer ser. É só o plural desfeito, que é o
 * que fazia a trava disparar em falso. Cortar mais (sufixos de grau, de verbo) seria
 * medir SIGNIFICADO com expressões regulares — e essa é a regra da casa que já custou
 * oito tentativas seguidas noutro ficheiro. Quem julga significado é o segundo leitor.
 *
 * Chega aqui já sem acentos (`palavrasDeAssunto` tira-os antes).
 * Medido em 24 pares: 24 acertos, zero falso positivo, zero falso negativo.
 */
const semPlural = (w) => w
  .replace(/oes$/, 'ao') // cartoes → cartao
  .replace(/aes$/, 'ao') // paes → pao
  .replace(/ais$/, 'al') // reais → real
  .replace(/eis$/, 'el') // papeis → papel
  .replace(/ois$/, 'ol') // lencois → lencol
  .replace(/ns$/, 'm') // homens → homem
  .replace(/([rzs])es$/, '$1') // mulheres → mulher · meses → mes · luzes → luz
  .replace(/s$/, ''); // contas → conta

const temBordao = (txt) => soPalavras(txt).includes(BORDAO_EM_PALAVRAS);

// ─── ANDAR 0 — o MAPA ────────────────────────────────────────────────────────

/**
 * O MAPA é o contrato do vídeo inteiro, e é validado ANTES de existir uma linha de
 * guião. É aqui que se apanha, por dez cêntimos de texto, o defeito que custaria
 * seis minutos de roteiro: dois capítulos com o mesmo número, um título que não
 * promete nada, um fecho que não responde ao que a abertura prometeu.
 *
 * Forma esperada:
 * { promessa, fioCondutor, numeroEspinha, valores:[{nome,valor}], somas?:[{de:[nomes],da:nome}],
 *   capituloDaDemonstracao, capitulos:[{titulo, oQueAcrescenta, oQueFicaEmAberto}], respostaDaPromessa, lacoAberto }
 */
export function validarMapa(mapa) {
  const erros = [];
  const avisos = [];
  if (!mapa || typeof mapa !== 'object') return { ok: false, erros: ['o mapa não é um objeto'], avisos };

  // 1. A PROMESSA — uma frase, dita, que não é pergunta.
  const promessa = String(mapa.promessa || '').trim();
  const nPromessa = contarPalavras(promessa);
  if (!promessa) {
    erros.push('sem "promessa" — o vídeo tem de prometer uma coisa numa frase');
  } else {
    if (nPromessa < 5 || nPromessa > 25) {
      erros.push(`a promessa tem ${nPromessa} palavras — precisa de ter entre 5 e 25 (é UMA frase, não um parágrafo)`);
    }
    if (/\?\s*$/.test(promessa)) {
      erros.push('a promessa termina em "?" — a pergunta é a CAPA (a 1ª frase da abertura); a promessa é o que o vídeo ENTREGA');
    }
    if (frasesDe(promessa).length > 1) {
      erros.push('a promessa tem mais de uma frase — resuma-a numa só');
    }
  }

  // 2. A IMAGEM DA CAPA — tem de existir no catálogo (mesma regra do Short).
  const fio = String(mapa.fioCondutor || '').trim();
  if (!fio) erros.push('sem "fioCondutor" (a imagem da capa)');
  else if (!METAPHORS.includes(fio)) erros.push(`fioCondutor "${fio}" fora do catálogo`);

  // 3. OS CAPÍTULOS
  const caps = Array.isArray(mapa.capitulos) ? mapa.capitulos : [];
  if (caps.length !== NUM_CAPITULOS) {
    erros.push(`precisa de ${NUM_CAPITULOS} capítulos (veio ${caps.length}) — é a forma que os dados reais mandam para 6 minutos`);
  }

  const titulosVistos = [];
  const numerosVistos = [];
  caps.forEach((c, i) => {
    const n = i + 1;
    const titulo = String((c && c.titulo) || '').trim();
    if (!titulo) {
      erros.push(`capítulo ${n}: sem título`);
    } else {
      const p = contarPalavras(titulo);
      if (p > MAX_PALAVRAS_TITULO) {
        erros.push(`capítulo ${n}: o título tem ${p} palavras (máximo ${MAX_PALAVRAS_TITULO}) — é um título, não uma frase do guião`);
      }
      const chave = semAcento(titulo).replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
      if (TITULOS_GENERICOS.some((g) => chave === g || chave.startsWith(`${g} `))) {
        erros.push(
          `capítulo ${n}: "${titulo}" é um título que não promete nada. Nos vídeos longos reais, as aberturas fracas `
          + 'chamam-se assim e as boas NOMEIAM o que a pessoa vai levar dali. Escreva o que o capítulo entrega.',
        );
      }
      if (titulosVistos.includes(chave)) erros.push(`capítulo ${n}: o título repete o de um capítulo anterior`);
      titulosVistos.push(chave);
    }

    // 4. O QUE ESTE ATO ACRESCENTA à mesma história (substituiu o número por capítulo).
    const acrescenta = String((c && c.oQueAcrescenta) || '').trim();
    if (!acrescenta) {
      erros.push(`capítulo ${n}: sem "oQueAcrescenta" — cada ato tem de trazer um facto NOVO sobre a MESMA história, senão o vídeo dá voltas`);
    }

    const aberto = String((c && c.oQueFicaEmAberto) || '').trim();
    if (!aberto) {
      erros.push(`capítulo ${n}: sem "oQueFicaEmAberto" — cada capítulo acaba a deixar uma ponta que o seguinte agarra`);
    }
  });

  /**
   * ═══ 5. O NÚMERO-ESPINHA E A LISTA FECHADA DE VALORES ═══
   *
   * 🔴 ISTO SUBSTITUI A REGRA QUE CAUSOU O DEFEITO Nº1 DO PRIMEIRO VÍDEO.
   *
   * A regra antiga dizia: *"cada capítulo tem o SEU número, nenhum repete o do
   * outro"*. A intenção era impedir que os três capítulos contassem a mesma coisa.
   * O que saiu, medido no vídeo entregue ao dono:
   *   capítulo 1 → a dívida da pessoa são 450 reais
   *   capítulo 2 → a dívida da pessoa são 1.280 reais
   *   capítulo 3 → sobram 300 reais
   * **Três pessoas diferentes no mesmo vídeo.** É a trava a ensinar o atalho outra
   * vez: a maneira mais barata de obedecer a "número diferente" é INVENTAR UMA
   * HISTÓRIA NOVA. O dono viu logo — *"me parece que abre várias ideias no mesmo
   * vídeo"* — e tinha razão.
   *
   * A regra nova é o contrário, e é o que ele pediu (uma ideia, uma história):
   *  · **UM número-espinha** para o vídeo inteiro, dito nos TRÊS capítulos;
   *  · **uma lista FECHADA de valores** — tudo o que se pode dizer em dinheiro neste
   *    vídeo está declarado aqui, com nome, e a aritmética entre eles é conferida.
   *    Um valor que não esteja na lista é, por definição, de outra história.
   */
  const valores = Array.isArray(mapa.valores) ? mapa.valores : [];
  if (!valores.length) {
    erros.push('sem "valores" — a lista de TODO o dinheiro que este vídeo pode dizer. Nada fora dela pode ser falado.');
  }
  const numeros = valores.map((v) => Number(v && v.valor));
  valores.forEach((v, i) => {
    if (!v || !String(v.nome || '').trim()) erros.push(`valores[${i}]: sem "nome" (o que este dinheiro é)`);
    if (!Number.isFinite(numeros[i]) || numeros[i] < 10) {
      erros.push(`valores[${i}] ("${(v && v.nome) || '?'}"): o valor tem de ser um número de 10 para cima (veio ${JSON.stringify(v && v.valor)})`);
    }
  });

  const espinha = Number(mapa.numeroEspinha);
  if (!Number.isFinite(espinha) || espinha < 10) {
    erros.push(`sem "numeroEspinha" válido — é O número do vídeo, o que os três atos têm de dizer (veio ${JSON.stringify(mapa.numeroEspinha)})`);
  } else if (numeros.length && !numeros.some((v) => Math.abs(v - espinha) <= 0.001)) {
    erros.push(`o "numeroEspinha" (${espinha}) não está na lista de valores — ele é um deles, não um número à parte`);
  }

  // A ARITMÉTICA ENTRE OS VALORES. Tolerância ZERO: somar números que o próprio mapa
  // declarou não tem folga nenhuma (a folga de ±1 existe só ao PROCURAR o número na
  // fala, onde o narrador pode arredondar).
  const somas = Array.isArray(mapa.somas) ? mapa.somas : [];
  somas.forEach((s, i) => {
    const partes = Array.isArray(s && s.de) ? s.de : [];
    const nomeTotal = String((s && s.da) || '').trim();
    const acharValor = (nome) => {
      const achado = valores.find((v) => String(v && v.nome).trim().toLowerCase() === String(nome).trim().toLowerCase());
      return achado ? Number(achado.valor) : NaN;
    };
    if (partes.length < 2 || !nomeTotal) {
      erros.push(`somas[${i}]: precisa de "de" (dois ou mais nomes da lista) e "da" (o nome do total)`);
      return;
    }
    const parcelas = partes.map(acharValor);
    const total = acharValor(nomeTotal);
    const emFalta = partes.filter((nome, k) => !Number.isFinite(parcelas[k]));
    if (emFalta.length || !Number.isFinite(total)) {
      erros.push(`somas[${i}]: estes nomes não existem na lista de valores: ${[...emFalta, Number.isFinite(total) ? null : nomeTotal].filter(Boolean).join(', ')}`);
      return;
    }
    const soma = parcelas.reduce((a, b) => a + b, 0);
    if (Math.abs(soma - total) > 0.001) {
      erros.push(`somas[${i}]: ${partes.join(' + ')} dá ${soma}, mas "${nomeTotal}" vale ${total}. A conta tem de bater — o narrador está a somar à frente de quem ouve.`);
    }
  });

  /**
   * 6. O APP APARECE UMA VEZ, E O MAPA DIZ ONDE.
   * O dono ouviu "eu joguei no FinMoovi" três vezes e reclamou. Agora a demonstração
   * é de UM capítulo só, e qual deles é decisão do mapa — não do modelo, que
   * escolheria "todos" se pudesse.
   */
  /**
   * ⚠️ QUAL DOS VALORES É UMA FATURA DE CARTÃO — e por que isto tem de ser declarado.
   *
   * A ficha de dívida aplica a taxa do ROTATIVO DO CARTÃO. Aplicá-la ao total de uma
   * história que junta cartão, empréstimo e dinheiro devido a um amigo seria dizer que
   * o amigo cobra 16% ao mês. É falso, e é o género de falsidade que ninguém repara e
   * que destrói um canal de finanças. Por isso o mapa tem de apontar com o dedo QUAL
   * dos valores é a fatura — e só sobre esse se faz a conta dos juros.
   * Sem `contaDoCartao`, não há ficha, e o vídeo segue sem falar de juros.
   */
  const nomeDoCartao = String(mapa.contaDoCartao || '').trim();
  if (nomeDoCartao && !valores.some((v) => String(v && v.nome).trim().toLowerCase() === nomeDoCartao.toLowerCase())) {
    erros.push(`"contaDoCartao" aponta para "${nomeDoCartao}", que não está na lista de valores`);
  }

  const ondeDemo = Number(mapa.capituloDaDemonstracao);
  if (!Number.isInteger(ondeDemo) || ondeDemo < 1 || ondeDemo > NUM_CAPITULOS) {
    erros.push(`"capituloDaDemonstracao" tem de ser 1, 2 ou 3 — o app é demonstrado num capítulo só (veio ${JSON.stringify(mapa.capituloDaDemonstracao)})`);
  } else if (ondeDemo === 1) {
    avisos.push('a demonstração do app está no capítulo 1 — funciona, mas quem prende costuma mostrar o problema antes da ferramenta');
  }

  // 6. O FECHO RESPONDE À PROMESSA. Mede-se por partilha de assunto: a resposta tem
  //    de falar da MESMA coisa que foi prometida. Não se julga se responde BEM —
  //    isso é gosto, e é o segundo leitor que o faz.
  const resposta = String(mapa.respostaDaPromessa || '').trim();
  if (!resposta) {
    erros.push('sem "respostaDaPromessa" — o fim do vídeo tem de responder ao que a abertura prometeu');
  } else if (promessa) {
    // ⚠️ Compara-se pelo SINGULAR de cada palavra. "aposentadorias" e "aposentadoria"
    //    são o mesmo assunto; comparadas à letra davam zero em comum, e foi assim que
    //    o vídeo longo de 08/08 morreu. Ver `semPlural`, mais acima.
    const daPromessa = palavrasDeAssunto(promessa).map(semPlural);
    const daResposta = palavrasDeAssunto(resposta).map(semPlural);
    if (!daPromessa.some((w) => daResposta.includes(w))) {
      erros.push(
        `a "respostaDaPromessa" não fala de nada do que a promessa prometeu. `
        + `Prometeu: "${promessa}" · Responde: "${resposta}"`,
      );
    }
  }

  const lacoFinal = String(mapa.lacoAberto || '').trim();
  if (!lacoFinal) {
    avisos.push('sem "lacoAberto" no mapa — o fecho vai ter de inventar a provocação final sozinho');
  } else if (PROMESSA_DE_PROXIMO.test(lacoFinal)) {
    erros.push('o "lacoAberto" promete um próximo vídeo — hoje não há fila travada, então isso é mentira. O laço é uma provocação DENTRO deste tema.');
  }

  return { ok: erros.length === 0, erros, avisos };
}

// ─── travas que valem em QUALQUER bloco falado ───────────────────────────────

/**
 * As proibições que não dependem do papel do bloco. Todas são VERDADE:
 * ou a fala tem a coisa, ou não tem.
 */
function proibicoesGerais(fala, ondeEstou) {
  const erros = [];

  if (/\bshorts?\b/i.test(fala)) erros.push(`${ondeEstou}: a fala diz "Short" — o canal fala sempre "vídeo"`);

  /**
   * 🔴 O CANAL TRATA POR "VOCÊ", NUNCA POR "O SENHOR" — e isto foi MEDIDO no roteiro
   * de 04/08, não é gosto.
   *
   * A persona do canal diz que o tom é *"um gerente de banco a explicar a um senhor
   * humilde"*. O modelo leu "senhor" como a FORMA DE TRATAMENTO e começou a dirigir-se
   * a quem assiste assim: *"E o senhor sabe por que parecia que nada andava?"*,
   * *"o senhor para de bater cabeça"*. O vídeo abria em "você" e mudava para "o
   * senhor" a meio — duas pessoas diferentes a falar com quem vê.
   *
   * ⚠️ A raiz está em `voz-do-canal.js`, que é PARTILHADO com o Short e por isso não
   * se mexe sem ordem do dono (o Short pode ter o mesmo risco latente). O que se faz
   * aqui é fechar a porta do lado do vídeo longo: a regra está no prompt E na trava.
   */
  const tratamento = fala.match(/\b(o|ao|do|pro|para o|com o) senhor(?!a)\b/i);
  if (tratamento) {
    erros.push(
      `${ondeEstou}: trata quem assiste por "${tratamento[0]}" — neste canal fala-se sempre por "VOCÊ". `
      + 'O "senhor humilde" da persona é a pessoa que se IMAGINA do outro lado, não a forma de a tratar.',
    );
  }

  const brinde = fala.match(BRINDES_PROIBIDOS);
  if (brinde) erros.push(`${ondeEstou}: promete "${brinde[0]}", que NÃO EXISTE — só há o app FinMoovi (grátis) e as calculadoras do blog`);

  const rebaixa = fala.match(REBAIXA_GRANDEZA);
  if (rebaixa) erros.push(`${ondeEstou}: rebaixa o dinheiro com "${rebaixa[0]}" — diga que PARECE pouco, mas chame-o pelo nome`);

  /**
   * PERCENTAGEM: PROIBIDA NO VÍDEO LONGO, sem exceção.
   * O Short deixa passar percentagem quando a ficha ou o material de apoio trazem
   * uma — e nesse desenho há um furo medido: o glossário está cheio de "%", o que
   * satisfaz a busca de fonte e deixa entrar QUALQUER percentagem inventada
   * (limitação registada no §31.3-b). Neste vídeo o tema é DÍVIDA, e a ficha de
   * dívida ainda não existe (é a fase 2 do §31.5). Sem conta calculada, uma taxa dita
   * ao microfone é informação financeira que ninguém conferiu.
   * O prompt diz exatamente isto, com as mesmas palavras — as duas pontas no mesmo
   * commit, que é a regra desta casa.
   */
  if (/%/.test(fala) || /\bpor cento\b/.test(semAcento(fala))) {
    erros.push(`${ondeEstou}: cita uma PERCENTAGEM. Este vídeo não tem conta calculada, e taxa que ninguém conferiu é o defeito mais perigoso deste canal. Conte a história sem percentagem nenhuma.`);
  }

  /**
   * CONTA DE RENDIMENTO SEM FICHA — frase a frase, como no Short.
   * Sem ficha (que é o caso deste tema), qualquer valor colado a um radical de
   * rendimento é uma promessa que o canal não pode fazer.
   */
  for (const frase of frasesDe(fala)) {
    const gatilho = semAcento(frase).match(RADICAL_RENDIMENTO);
    if (!gatilho) continue;
    const valores = valoresDaFrase(frase);
    if (!valores.length) continue;
    /**
     * ⚠️ A MENSAGEM DIZ QUAL FOI A PALAVRA, e isso não é cosmética.
     * MEDIDO na 3ª corrida: o gatilho foi **"renda"** (o dinheiro que a pessoa GANHA),
     * numa frase que não prometia rendimento nenhum — *"mil duzentos e oitenta reais
     * que ainda precisam sair da sua renda"*. A queixa dizia "conta de rendimento" e
     * o modelo não tinha como adivinhar que o problema era aquela palavra.
     *
     * 🔴 E FICA REGISTADO QUE ISTO É UM FALSO POSITIVO CONHECIDO, não um descuido.
     * "renda" cai na mesma família de "rende"/"rendimento", e num vídeo de dívida a
     * palavra aparece com toda a legitimidade. **Optei por NÃO estreitar a trava:**
     * ela protege o número financeiro, que é a coisa mais perigosa deste canal, e o
     * preço de a manter é uma tentativa a mais — enquanto o preço de a afrouxar é
     * uma promessa de rendimento no ar. Estreitá-la é decisão editorial do dono.
     * (O prompt, note-se, já empurra para "do seu salário" em vez de "da sua renda".)
     */
    erros.push(
      `${ondeEstou}: a frase "${frase}" junta a palavra "${gatilho[0]}" a um valor (${valores.join(', ')}), `
      + 'e este vídeo NÃO tem conta calculada — qualquer coisa que soe a rendimento com número é proibida aqui. '
      + `Troque a palavra "${gatilho[0]}" (por exemplo, "o seu salário" ou "o que entra em casa") ou tire o número dessa frase.`,
    );
  }

  return erros;
}

// ─── ANDAR 1 — os blocos, um a um ────────────────────────────────────────────

/**
 * A ABERTURA (30-40s). É o bloco que decide o vídeo: nos nossos Shorts metade da
 * audiência sai aos 14 segundos.
 * · a 1ª frase é a CAPA — uma PERGUNTA que dói, e é ela que vai à miniatura;
 * · a resposta vem colada, no mesmo bloco (pergunta pendurada é proibida no canal);
 * · a PROMESSA é dita com todas as letras — é o achado dos vídeos reais.
 */
export function validarAbertura(fala, { promessa = '', exemploParaComparar = '' } = {}) {
  const erros = [];
  const avisos = [];
  const txt = String(fala || '').trim();
  if (!txt) return { ok: false, erros: ['abertura: sem fala'], avisos };

  const n = contarPalavras(txt);
  if (n < ORCAMENTO.abertura.min || n > ORCAMENTO.abertura.max) {
    erros.push(queixaDeTamanho('abertura', n, ORCAMENTO.abertura));
  }

  const frases = frasesDe(txt);
  const capa = frases[0] || '';
  if (!/\?[!…]*$/.test(capa)) {
    erros.push(`abertura: a 1ª frase é a CAPA do vídeo e tem de ser uma PERGUNTA que dói, terminada em "?". (veio: "${capa}")`);
  }
  const nCapa = contarPalavras(capa);
  if (nCapa > MAX_PALAVRAS_CAPA) {
    erros.push(`abertura: a pergunta da capa tem ${nCapa} palavras (máximo ${MAX_PALAVRAS_CAPA}) — ela aparece ESCRITA na tela enquanto é dita, e mais do que isto não cabe`);
  }
  if (frases.length < 3) {
    erros.push('abertura: precisa de pelo menos três frases — a pergunta, a resposta colada nela, e a promessa do vídeo');
  }

  // A PROMESSA TEM DE SER DITA. Mede-se com a mesma função que o Short usa para
  // saber se o tema foi falado (`keywordFalada`): casa por palavra inteira,
  // singular/plural ou radical comum. Uma regra, um sítio.
  if (promessa && !keywordFalada(promessa, txt)) {
    erros.push(
      `abertura: nenhuma palavra da promessa é dita. Os vídeos longos que prendem NOMEIAM a promessa logo no início. `
      + `Prometido: "${promessa}"`,
    );
  }

  if (temBordao(txt)) erros.push('abertura: diz o bordão do canal — ele é a assinatura e só pode aparecer no FECHO');
  const chamada = txt.match(PALAVRAS_DE_CHAMADA);
  if (chamada) erros.push(`abertura: pede "${chamada[0]}" — o pedido é UMA vez só, no bloco da chamada. Repetir em cada bloco é o erro que mata o vídeo longo.`);

  // ANTI-CÓPIA — a mesma razão do Short, e a mesma calibração de seis palavras.
  // Registado 13 vezes neste repositório: **todo exemplo escrito num prompt é
  // copiado à letra pelo modelo.** O exemplo só é seguro se copiá-lo custar caro.
  if (exemploParaComparar) {
    const copiado = longestSharedWordRun(txt, exemploParaComparar, 6);
    if (copiado.length) erros.push(`abertura: copiou o exemplo — "${copiado.join(' ')}". O exemplo mostra a forma; as palavras têm de ser suas.`);
  }

  erros.push(...proibicoesGerais(txt, 'abertura'));
  return { ok: erros.length === 0, erros, avisos, palavras: n };
}

/**
 * UM CAPÍTULO (~90s). É a célula do padrão aprovado pelo dono (§31), com as quatro
 * partes que o Short já provou: pergunta que dói → o número que se transforma →
 * o app FAZ a conta na 1ª pessoa → re-gancho para o capítulo seguinte.
 *
 * ⚠️ A parte que aqui é ESTRUTURA e no Short era só prompt: a demonstração é um
 * PARÁGRAFO PRÓPRIO. Foi decisão do dono (*"a demonstração do app merece momento
 * próprio, não uma menção de passagem"*) e confirmada pelos dados: um concorrente
 * dedica um capítulo inteiro a "Apresentando o App" (§33.5).
 */
export function validarCapitulo(cap, indice, { plano = {}, exemploParaComparar = '' } = {}) {
  const erros = [];
  const avisos = [];
  const n = indice + 1;
  const onde = `capítulo ${n}`;
  if (!cap || typeof cap !== 'object') return { ok: false, erros: [`${onde}: não é um objeto`], avisos };

  const temDemo = !!plano.temDemonstracao;

  for (const parte of PARTES_DO_CAPITULO) {
    if (!cap[parte] || typeof cap[parte] !== 'string' || !cap[parte].trim()) {
      erros.push(`${onde}: falta a parte "${parte}" — as três são obrigatórias e cada uma é um parágrafo`);
    }
  }
  const demoEscrita = String(cap[PARTE_DEMO] || '').trim();
  if (temDemo && !demoEscrita) {
    erros.push(`${onde}: é ESTE o capítulo que demonstra o app, e falta a parte "demonstracao"`);
  }
  if (!temDemo && demoEscrita) {
    erros.push(`${onde}: escreveu uma "demonstracao" e o app não é demonstrado aqui — ele aparece num capítulo só do vídeo inteiro`);
  }
  const fala = PARTES_POSSIVEIS.map((p) => String(cap[p] || '').trim()).filter(Boolean).join(' ');
  if (!fala) return { ok: false, erros, avisos };

  // O ato com demonstração tem uma parte a mais, logo um orçamento a mais (ver ORCAMENTO).
  const orcamento = temDemo ? ORCAMENTO.capituloComDemo : ORCAMENTO.capitulo;
  const palavras = contarPalavras(fala);
  if (palavras < orcamento.min || palavras > orcamento.max) {
    erros.push(queixaDeTamanho(onde, palavras, orcamento));
  }

  // A PERGUNTA que abre o capítulo é mesmo uma pergunta.
  const pergunta = String(cap.pergunta || '').trim();
  if (pergunta && !/\?[!…]*$/.test(frasesDe(pergunta)[0] || '')) {
    erros.push(`${onde}: a parte "pergunta" tem de ABRIR com uma pergunta terminada em "?" — é o que faz o capítulo pegar. (veio: "${frasesDe(pergunta)[0] || ''}")`);
  }

  /**
   * 🔴 O NÚMERO-ESPINHA TEM DE SER DITO EM TODOS OS TRÊS ATOS.
   * É o contrário exato da regra antiga (um número diferente por capítulo), e é o
   * que faz o vídeo ser UMA história em vez de três. Ver o porquê em `validarMapa`.
   */
  const dinheiroDito = valoresEmDinheiro(fala);
  const espinha = Number(plano.numeroEspinha);
  if (Number.isFinite(espinha) && !dinheiroDito.some((v) => Math.abs(v - espinha) <= 1)) {
    erros.push(
      `${onde}: o número deste vídeo é ${espinha} e ele NÃO é dito neste ato. `
      + `Dinheiro ouvido aqui: ${dinheiroDito.length ? dinheiroDito.join(', ') : 'nenhum'}. `
      + 'Os três atos falam do MESMO dinheiro, visto de ângulos diferentes — é isso que faz o vídeo ter uma ideia só.',
    );
  }

  /**
   * 🔴 E NENHUM VALOR PODE VIR DE FORA DA LISTA DO MAPA.
   * Foi assim que o primeiro vídeo acabou com três dívidas diferentes: nada impedia
   * cada capítulo de inventar o seu próprio dinheiro. Agora o mapa declara TUDO o que
   * se pode dizer, e o que não estiver lá é, por definição, de outra história.
   */
  const permitidos = Array.isArray(plano.valoresPermitidos) ? plano.valoresPermitidos.map(Number).filter(Number.isFinite) : [];
  if (permitidos.length) {
    const forasteiros = dinheiroDito.filter((v) => !permitidos.some((p) => Math.abs(p - v) <= 1));
    if (forasteiros.length) {
      erros.push(
        `${onde}: fala em ${forasteiros.join(', ')} e esse dinheiro NÃO existe nesta história. `
        + `Só pode dizer: ${permitidos.join(', ')}. Inventar um valor novo é começar uma história nova a meio do vídeo.`,
      );
    }
  }

  /**
   * A DEMONSTRAÇÃO — e o nome do produto vive SÓ nela.
   * O dono ouviu "eu joguei no FinMoovi" três vezes no primeiro vídeo. Agora o app é
   * demonstrado num capítulo e os outros dois nem o nome dizem.
   */
  if (temDemo) {
    if (demoEscrita && !/finmoovi/i.test(demoEscrita)) {
      erros.push(`${onde}: a parte "demonstracao" não diz FinMoovi — é o parágrafo em que o app FAZ a conta, na primeira pessoa`);
    }
    const foraDaDemo = PARTES_DO_CAPITULO.map((p) => String(cap[p] || '')).join(' ');
    if (/finmoovi/i.test(foraDaDemo)) {
      erros.push(`${onde}: diz FinMoovi fora da parte "demonstracao" — o app tem o seu momento, e é só esse`);
    }
  } else if (/finmoovi/i.test(fala)) {
    erros.push(
      `${onde}: diz FinMoovi, e o app NÃO é demonstrado neste capítulo. `
      + 'Ele aparece uma vez no vídeo inteiro, com peso. Repetir o nome em todos os atos foi o defeito que o dono apanhou no primeiro vídeo.',
    );
  }

  if (temBordao(fala)) erros.push(`${onde}: diz o bordão do canal — ele é a assinatura e só pode aparecer no FECHO, uma vez`);
  const pedido = fala.match(PALAVRAS_DE_CHAMADA);
  if (pedido) {
    erros.push(`${onde}: pede "${pedido[0]}" — o pedido acontece UMA vez, no bloco da chamada. Repetir a cada capítulo é o erro que mata o formato longo.`);
  }

  // ANTI-CÓPIA: o exemplo do prompt serve para ver a FORMA, não para reaproveitar
  // frases. Seis palavras seguidas, o número calibrado no Short (§ da trava).
  if (exemploParaComparar) {
    const copiado = longestSharedWordRun(fala, exemploParaComparar, 6);
    if (copiado.length) {
      erros.push(`${onde}: copiou o exemplo — "${copiado.join(' ')}". O exemplo mostra a forma; as palavras têm de ser suas.`);
    }
  }

  erros.push(...proibicoesGerais(fala, onde));
  return { ok: erros.length === 0, erros, avisos, palavras };
}

/** A CHAMADA (penúltimo bloco) — o único sítio do vídeo onde se pede alguma coisa. */
export function validarChamada(fala) {
  const erros = [];
  const avisos = [];
  const txt = String(fala || '').trim();
  if (!txt) return { ok: false, erros: ['chamada: sem fala'], avisos };

  const n = contarPalavras(txt);
  if (n < ORCAMENTO.chamada.min || n > ORCAMENTO.chamada.max) {
    erros.push(`${queixaDeTamanho('chamada', n, ORCAMENTO.chamada)} É um recado rápido, não um capítulo.`);
  }
  if (!/finmoovi/i.test(txt)) erros.push('chamada: não diz FINMOOVI — é a palavra que a pessoa tem de escrever no comentário');
  if (!PALAVRAS_DE_CHAMADA.test(txt)) erros.push('chamada: não pede nada — é o único bloco do vídeo em que se pede, e ele tem de pedir');
  if (/link (na|no|aqui)|clica no link|na bio|na descri/i.test(txt)) {
    // No vídeo LONGO o link até é clicável na descrição — mas a nossa CTA provada é o
    // comentário, e a descrição dos Shorts já mostrou que o link genérico não converte
    // (§33.3). Fica o comentário, que é o que sabemos que funciona.
    avisos.push('chamada: manda ir ao link — no vídeo longo isso é possível, mas a chamada provada deste canal é o comentário');
  }
  if (temBordao(txt)) erros.push('chamada: diz o bordão — ele fecha o vídeo, não a chamada');
  erros.push(...proibicoesGerais(txt, 'chamada'));
  return { ok: erros.length === 0, erros, avisos, palavras: n };
}

/**
 * O FECHO (~40s) — responde à promessa, deixa o laço aberto, assina com o bordão.
 * Nada de fontes (app, blog, comentário): o app teve três capítulos e o pedido teve
 * o bloco anterior. Aqui só cabe a resposta e a assinatura.
 */
export function validarFecho(fala, { promessa = '', exemploParaComparar = '' } = {}) {
  const erros = [];
  const avisos = [];
  const txt = String(fala || '').trim();
  if (!txt) return { ok: false, erros: ['fecho: sem fala'], avisos };

  const n = contarPalavras(txt);
  if (n < ORCAMENTO.fecho.min || n > ORCAMENTO.fecho.max) {
    erros.push(queixaDeTamanho('fecho', n, ORCAMENTO.fecho));
  }

  // O BORDÃO, à letra e no fim. A comparação é por palavras sem acento nem pontuação:
  // uma vírgula a mais não dá falso alarme, trocar uma palavra dá — que é o que se quer.
  if (!temBordao(txt)) {
    erros.push(
      semAcento(txt).includes(ANCORA_DO_BORDAO)
        ? `fecho: o bordão do canal foi ALTERADO. Ele não se reescreve, diz-se à letra: "${BORDAO}"`
        : `fecho: o bordão do canal não foi dito — ele é a última frase do vídeo, à letra: "${BORDAO}"`,
    );
  } else {
    const frases = frasesDe(txt);
    const ultima = frases[frases.length - 1] || '';
    if (!temBordao(ultima)) {
      avisos.push('fecho: o bordão não é a ÚLTIMA frase — é a assinatura do canal e o vídeo devia acabar nele');
    }
  }

  const intruso = txt.match(FONTE_NO_FECHO);
  if (intruso) {
    erros.push(
      `fecho: fala de "${intruso[0]}" — o fecho é a RESPOSTA à promessa mais a assinatura. `
      + 'O app teve os três capítulos e o pedido teve a chamada; repetir aqui rouba o lugar da resposta.',
    );
  }

  const promete = txt.match(PROMESSA_DE_PROXIMO);
  if (promete) {
    erros.push(`fecho: promete "${promete[0]}" — não há fila de vídeos travada, então isso seria mentira. O laço aberto é uma provocação DENTRO deste tema.`);
  }

  // O FECHO RESPONDE À PROMESSA (a mesma medida do mapa, agora no texto real).
  if (promessa && !keywordFalada(promessa, txt)) {
    erros.push(`fecho: não fala de nada do que a abertura prometeu ("${promessa}") — é aqui que a promessa se cumpre`);
  }

  // ANTI-CÓPIA. ⚠️ O BORDÃO fica FORA da comparação, e a razão é a de sempre: ele é
  // obrigatório e vai à letra. Puni-lo seria reprovar quem obedece — a inversão exata
  // do defeito crónico desta casa. Quem monta `exemploParaComparar` tira-o de lá.
  if (exemploParaComparar) {
    const copiado = longestSharedWordRun(txt, exemploParaComparar, 6);
    if (copiado.length) erros.push(`fecho: copiou o exemplo — "${copiado.join(' ')}". O exemplo mostra a forma; as palavras têm de ser suas.`);
  }

  erros.push(...proibicoesGerais(txt, 'fecho'));
  return { ok: erros.length === 0, erros, avisos, palavras: n };
}

// ─── ANDAR 4 — as travas GLOBAIS ─────────────────────────────────────────────

/**
 * O QUE SÓ SE VÊ OLHANDO O VÍDEO INTEIRO. São as travas que não existiam no Short
 * porque num vídeo de 50 segundos não há espaço para se repetir.
 *
 * 1. Nada repetido entre capítulos (seis palavras seguidas, o número já calibrado).
 * 2. O pedido acontece UMA vez, e é no bloco da chamada.
 * 3. O bordão acontece UMA vez, e é no fecho.
 * 4. A promessa é dita na abertura e cumprida no fecho.
 */
export function validarLongo(roteiro) {
  const erros = [];
  const avisos = [];
  if (!roteiro || typeof roteiro !== 'object') return { ok: false, erros: ['o roteiro não é um objeto'], avisos };

  const caps = Array.isArray(roteiro.capitulos) ? roteiro.capitulos : [];
  const falaDoCapitulo = (c) => PARTES_POSSIVEIS.map((p) => String((c && c[p]) || '').trim()).filter(Boolean).join(' ');

  // 1. NADA REPETIDO ENTRE CAPÍTULOS.
  //    Num Short isto não fazia falta: 50 segundos não chegam para alguém se repetir.
  //    Em seis minutos, repetir é o defeito mais provável — e é o que faz a pessoa
  //    sentir que já ouviu aquilo e sair.
  // ⚠️ As repetições saem TAMBÉM em forma de lista, e não só de texto. Quem chama
  // precisa de saber QUAL capítulo reescrever — e ler isso de dentro da mensagem
  // seria depender do texto de um erro, que muda ao primeiro retoque de redação.
  const repeticoes = [];
  /**
   * 🔴 OS NÚMEROS SAEM DA COMPARAÇÃO, E ISTO É A 18ª OCORRÊNCIA DO DEFEITO Nº1 DESTA
   * CASA — apanhada pela prova de mesa, antes de gastar um cêntimo.
   *
   * O desenho novo ORDENA que os três atos digam o mesmo número-espinha (é isso que
   * faz o vídeo ter uma história só). E esta trava, tal como estava, PUNIA-OS por
   * isso: "cento e oitenta e nove reais" são seis palavras seguidas iguais nos três.
   * O prompt a mandar exatamente o que o validador reprova, outra vez.
   *
   * A cura é a mesma de sempre — tirar da comparação aquilo que é obrigatório, como
   * já se faz com o bordão e com o molde da chamada. Cada numeral é trocado por uma
   * marca ÚNICA, que por isso nunca casa com nada. Sobra a ESCRITA, que é o que tem
   * de ser diferente entre atos.
   */
  let marca = 0;
  const semNumeros = (txt) => String(txt || '')
    .split(/(\s+)/)
    .map((p) => {
      const limpo = semAcento(p).replace(/[^\p{L}\p{N}]/gu, '');
      const eNumero = /^\d+$/.test(limpo)
        || limpo === 'mil'
        || Object.prototype.hasOwnProperty.call(EXTENSO_VALOR, limpo);
      return eNumero ? `¤${marca++}` : p;
    })
    .join('');

  for (let a = 0; a < caps.length; a++) {
    for (let b = a + 1; b < caps.length; b++) {
      const repetido = longestSharedWordRun(semNumeros(falaDoCapitulo(caps[a])), semNumeros(falaDoCapitulo(caps[b])), 6);
      if (repetido.length) {
        repeticoes.push({ a, b, frase: repetido.join(' ') });
        erros.push(
          `os capítulos ${a + 1} e ${b + 1} repetem a mesma frase — "${repetido.join(' ')}". `
          + 'Cada capítulo tem de trazer coisa nova: quem ouve a mesma frase duas vezes acha que já viu o vídeo e sai.',
        );
      }
    }
  }

  const blocos = [
    ['abertura', String(roteiro.abertura || '')],
    ...caps.map((c, i) => [`capítulo ${i + 1}`, falaDoCapitulo(c)]),
    ['chamada', String(roteiro.chamada || '')],
    ['fecho', String(roteiro.fecho || '')],
  ];
  const falaToda = blocos.map(([, t]) => t).join(' ');

  // 2. O PEDIDO, UMA VEZ SÓ, E NA CHAMADA.
  const ondePede = blocos.filter(([nome, t]) => nome !== 'chamada' && PALAVRAS_DE_CHAMADA.test(t)).map(([nome]) => nome);
  if (ondePede.length) {
    erros.push(`o pedido (comentar/inscrever/clicar) aparece em ${ondePede.join(', ')} — ele existe UMA vez no vídeo, e é no bloco da chamada`);
  }

  // 3. O BORDÃO, UMA VEZ SÓ, E NO FECHO.
  const ondeAssina = blocos.filter(([nome, t]) => nome !== 'fecho' && temBordao(t)).map(([nome]) => nome);
  if (ondeAssina.length) {
    erros.push(`o bordão do canal aparece em ${ondeAssina.join(', ')} — ele é a assinatura e diz-se UMA vez, no fecho`);
  }

  /**
   * 🔴 4. O NOME DO PRODUTO APARECE UMA VEZ NA HISTÓRIA (mais a chamada).
   *
   * Aqui vivia o contrário disto: uma trava que exigia que os três capítulos tivessem
   * números DIFERENTES. Foi ela que produziu o defeito nº1 do primeiro vídeo — três
   * dívidas diferentes na mesma história. Saiu, e no seu lugar entrou a regra que o
   * dono pediu: **uma ideia, uma história, e o app com um momento só.**
   * A chamada fica de fora da contagem de propósito: é lá que se pede, e pedir sem
   * dizer o nome do app não faz sentido nenhum.
   */
  const capitulosComApp = caps
    .map((c, i) => (/finmoovi/i.test(falaDoCapitulo(c)) ? i + 1 : 0))
    .filter(Boolean);
  if (capitulosComApp.length > 1) {
    erros.push(
      `o FinMoovi é nomeado nos capítulos ${capitulosComApp.join(' e ')} — ele tem UM momento no vídeo, com peso. `
      + 'Foi ouvir "eu joguei no FinMoovi" três vezes que fez o dono reprovar o primeiro vídeo.',
    );
  }
  if (/finmoovi/i.test(String(roteiro.abertura || '')) || /finmoovi/i.test(String(roteiro.fecho || ''))) {
    erros.push('o FinMoovi é nomeado na abertura ou no fecho — a abertura é o problema e o fecho é a lição; o produto vive no seu capítulo e na chamada');
  }

  const palavras = contarPalavras(falaToda);
  const segundos = palavras / PALAVRAS_POR_SEGUNDO;

  return { ok: erros.length === 0, erros, avisos, palavras, segundos, repeticoes };
}

/** Junta tudo o que se fala, na ordem, para a voz e para as legendas. */
export function falaCorrida(roteiro) {
  const caps = Array.isArray(roteiro.capitulos) ? roteiro.capitulos : [];
  return [
    String(roteiro.abertura || '').trim(),
    ...caps.map((c) => PARTES_POSSIVEIS.map((p) => String((c && c[p]) || '').trim()).filter(Boolean).join(' ')),
    String(roteiro.chamada || '').trim(),
    String(roteiro.fecho || '').trim(),
  ].filter(Boolean);
}
