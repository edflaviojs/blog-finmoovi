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

/** As quatro partes de um capítulo — a célula do padrão aprovado (§31). */
export const PARTES_DO_CAPITULO = ['pergunta', 'desenvolvimento', 'demonstracao', 'regancho'];

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
  chamada: { min: 22, max: 40 },
  fecho: { min: 85, max: 115 },
};

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
 * o app é DEMONSTRADO em todos os capítulos (é o padrão app-first, §3b-bis), e puni-lo
 * seria reprovar quem obedece ao prompt — o modo de falha crónico deste repositório.
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

const temBordao = (txt) => soPalavras(txt).includes(BORDAO_EM_PALAVRAS);

// ─── ANDAR 0 — o MAPA ────────────────────────────────────────────────────────

/**
 * O MAPA é o contrato do vídeo inteiro, e é validado ANTES de existir uma linha de
 * guião. É aqui que se apanha, por dez cêntimos de texto, o defeito que custaria
 * seis minutos de roteiro: dois capítulos com o mesmo número, um título que não
 * promete nada, um fecho que não responde ao que a abertura prometeu.
 *
 * Forma esperada:
 * { promessa, fioCondutor, capitulos: [{ titulo, numeroChave, somaDe?, oQueFicaEmAberto }], respostaDaPromessa }
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

    // 4. O NÚMERO-CHAVE — próprio, e diferente do dos outros.
    const num = Number(c && c.numeroChave);
    if (!Number.isFinite(num) || num < 10) {
      erros.push(`capítulo ${n}: "numeroChave" tem de ser um número de 10 para cima (veio ${JSON.stringify(c && c.numeroChave)}) — cada capítulo carrega UM número que se transforma`);
    } else {
      if (numerosVistos.some((v) => Math.abs(v - num) <= 1)) {
        erros.push(`capítulo ${n}: o número ${num} já é o número-chave de outro capítulo — cada capítulo tem o seu, senão os três contam a mesma história`);
      }
      numerosVistos.push(num);
    }

    // 5. A SOMA TEM DE BATER. É a única conta que este vídeo pode fazer sem ficha:
    //    o narrador soma o que diz ter visto. Se as parcelas não dão o total, é
    //    número inventado — e isso mede-se, não se opina.
    if (c && c.somaDe !== undefined && c.somaDe !== null) {
      const partes = Array.isArray(c.somaDe) ? c.somaDe.map(Number) : null;
      if (!partes || partes.length < 2 || partes.some((v) => !Number.isFinite(v))) {
        erros.push(`capítulo ${n}: "somaDe" tem de ser uma lista de pelo menos dois números (ou não vir de todo)`);
      } else {
        const soma = partes.reduce((a, b) => a + b, 0);
        /**
         * ⚠️ AQUI A TOLERÂNCIA É ZERO, e é diferente de propósito da tolerância de ±1
         * que existe mais abaixo (quando se procura o número DITO na fala).
         * São duas coisas diferentes: ler um número numa frase falada admite folga
         * (o narrador pode dizer "quase duzentos"); mas somar três números que o
         * próprio mapa declarou é aritmética, e aritmética não tem folga nenhuma.
         * A 1ª versão desta trava aceitava ±1 e deixava passar uma conta errada por
         * um real — apanhado na prova de mesa, antes de gastar um cêntimo.
         */
        if (Number.isFinite(num) && Math.abs(soma - num) > 0.001) {
          erros.push(`capítulo ${n}: a soma de ${partes.join(' + ')} dá ${soma}, e o número-chave é ${num}. A conta tem de bater — o narrador está a somar à frente de quem ouve.`);
        }
      }
    }

    const aberto = String((c && c.oQueFicaEmAberto) || '').trim();
    if (!aberto) {
      erros.push(`capítulo ${n}: sem "oQueFicaEmAberto" — cada capítulo acaba a deixar uma ponta que o seguinte agarra`);
    }
  });

  // 6. O FECHO RESPONDE À PROMESSA. Mede-se por partilha de assunto: a resposta tem
  //    de falar da MESMA coisa que foi prometida. Não se julga se responde BEM —
  //    isso é gosto, e é o segundo leitor que o faz.
  const resposta = String(mapa.respostaDaPromessa || '').trim();
  if (!resposta) {
    erros.push('sem "respostaDaPromessa" — o fim do vídeo tem de responder ao que a abertura prometeu');
  } else if (promessa) {
    const daPromessa = palavrasDeAssunto(promessa);
    const daResposta = palavrasDeAssunto(resposta);
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

  for (const parte of PARTES_DO_CAPITULO) {
    if (!cap[parte] || typeof cap[parte] !== 'string' || !cap[parte].trim()) {
      erros.push(`${onde}: falta a parte "${parte}" — as quatro são obrigatórias e cada uma é um parágrafo`);
    }
  }
  const fala = PARTES_DO_CAPITULO.map((p) => String(cap[p] || '').trim()).filter(Boolean).join(' ');
  if (!fala) return { ok: false, erros, avisos };

  const palavras = contarPalavras(fala);
  if (palavras < ORCAMENTO.capitulo.min || palavras > ORCAMENTO.capitulo.max) {
    erros.push(queixaDeTamanho(onde, palavras, ORCAMENTO.capitulo));
  }

  // A PERGUNTA que abre o capítulo é mesmo uma pergunta.
  const pergunta = String(cap.pergunta || '').trim();
  if (pergunta && !/\?[!…]*$/.test(frasesDe(pergunta)[0] || '')) {
    erros.push(`${onde}: a parte "pergunta" tem de ABRIR com uma pergunta terminada em "?" — é o que faz o capítulo pegar. (veio: "${frasesDe(pergunta)[0] || ''}")`);
  }

  // O NÚMERO-CHAVE DO MAPA TEM DE SER DITO. É o que liga o mapa ao guião: sem isto,
  // o mapa promete um número e o capítulo escreve outro, e ninguém dá por nada.
  const numerosDitos = valoresDaFrase(fala);
  const chave = Number(plano.numeroChave);
  if (Number.isFinite(chave) && !numerosDitos.some((v) => Math.abs(v - chave) <= 1)) {
    erros.push(
      `${onde}: o número-chave deste capítulo é ${chave} e ele NÃO é dito na fala. `
      + `Números ouvidos: ${numerosDitos.length ? numerosDitos.join(', ') : 'nenhum'}. Diga-o por extenso, na virada.`,
    );
  }
  // E as parcelas da soma também, senão a conta acontece fora do ecrã.
  if (Array.isArray(plano.somaDe) && plano.somaDe.length >= 2) {
    const emFalta = plano.somaDe.map(Number).filter((v) => Number.isFinite(v) && !numerosDitos.some((d) => Math.abs(d - v) <= 1));
    if (emFalta.length) {
      erros.push(`${onde}: a soma que o mapa marcou (${plano.somaDe.join(' + ')}) não aparece toda na fala — falta dizer ${emFalta.join(', ')}. Quem ouve tem de conseguir somar junto.`);
    }
  }

  // A DEMONSTRAÇÃO NOMEIA O PRODUTO. É estrutura: ou o parágrafo do app diz o nome
  // do app, ou não é uma demonstração.
  const demo = String(cap.demonstracao || '');
  if (demo && !/finmoovi/i.test(demo)) {
    erros.push(`${onde}: a parte "demonstracao" não diz FinMoovi — é o parágrafo em que o app FAZ a conta, na primeira pessoa`);
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
  const falaDoCapitulo = (c) => PARTES_DO_CAPITULO.map((p) => String((c && c[p]) || '').trim()).filter(Boolean).join(' ');

  // 1. NADA REPETIDO ENTRE CAPÍTULOS.
  //    Num Short isto não fazia falta: 50 segundos não chegam para alguém se repetir.
  //    Em seis minutos, repetir é o defeito mais provável — e é o que faz a pessoa
  //    sentir que já ouviu aquilo e sair.
  // ⚠️ As repetições saem TAMBÉM em forma de lista, e não só de texto. Quem chama
  // precisa de saber QUAL capítulo reescrever — e ler isso de dentro da mensagem
  // seria depender do texto de um erro, que muda ao primeiro retoque de redação.
  const repeticoes = [];
  for (let a = 0; a < caps.length; a++) {
    for (let b = a + 1; b < caps.length; b++) {
      const repetido = longestSharedWordRun(falaDoCapitulo(caps[a]), falaDoCapitulo(caps[b]), 6);
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

  // 4. AS CONTAS DOS TRÊS CAPÍTULOS SÃO DIFERENTES (o mapa já o exigia; aqui é o
  //    texto real que o confirma, porque é o texto que vai ao ar).
  const chaves = caps.map((c) => Number(c && c.numeroChave)).filter((v) => Number.isFinite(v));
  for (let a = 0; a < chaves.length; a++) {
    for (let b = a + 1; b < chaves.length; b++) {
      if (Math.abs(chaves[a] - chaves[b]) <= 1) {
        erros.push(`os capítulos ${a + 1} e ${b + 1} giram à volta do mesmo número (${chaves[a]}) — cada um tem de trazer o seu`);
      }
    }
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
    ...caps.map((c) => PARTES_DO_CAPITULO.map((p) => String((c && c[p]) || '').trim()).filter(Boolean).join(' ')),
    String(roteiro.chamada || '').trim(),
    String(roteiro.fecho || '').trim(),
  ].filter(Boolean);
}
