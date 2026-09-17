/**
 * O ESCRITOR DO SHORT DE 16 SEGUNDOS EM LOOP (07/08/2026).
 *
 * ═══ O QUE O DONO PEDIU, nas palavras dele ═══
 *   *"O vídeo já deve iniciar com o conteúdo direto, objetivo, rápido, com uma
 *   pergunta que incomoda o espectador ou dizendo para o espectador nunca, jamais
 *   faça isso… Temos que retirar a tela final do FinMoovi, o vídeo deve acabar do
 *   nada, não pedir inscrição, sem enrolação. A intenção é a pessoa entrar num loop,
 *   fazer igual aqueles vídeos que o vídeo reinicia sem a pessoa perceber."*
 *
 * E a linguagem: *"tem que ser linguagem simples de uma família brasileira, coisas do
 * dia a dia, de homens e mulheres casados que precisam controlar gastos… classe baixa
 * e média"*.
 *
 * ═══ O QUE ESTE FICHEIRO NÃO FAZ, E É O MAIS IMPORTANTE ═══
 * **Não pede o visual à IA.** No formato de 50s são precisas DUAS passagens — uma
 * escreve, outra coreografa — porque o modelo inventava âncoras (cinco dos últimos
 * seis vídeos tiveram esse erro, e em dois deles um plano foi APAGADO do vídeo).
 *
 * Aqui a coreografia é CALCULADA: a ilustração vem do catálogo fixo da situação
 * (`temas-vida.js`) e a âncora é escolhida por código de entre as palavras que estão
 * REALMENTE escritas na fala. Inventar deixa de ser possível — não por o prompt pedir,
 * mas por não haver caminho.
 *
 * Efeito colateral bem-vindo: uma chamada de IA por vídeo em vez de duas.
 *
 * ═══ O CÍRCULO ═══
 * A última fala tem de devolver a pessoa ao princípio, e o ÚLTIMO PLANO é o MESMO
 * plano do início. É isso que faz o vídeo reiniciar sem se notar. As duas coisas são
 * travas duras: a fala mede-se por palavras partilhadas com a abertura, e o plano
 * final é montado por código a partir do primeiro.
 *
 * Uso:
 *   node src/scripts/youtube/roteiro-loop.js --id=VIDA:fatura-maior:nunca-faca
 *   node src/scripts/youtube/roteiro-loop.js --id=VIDA:conta-de-luz:e-serio-que --gravar
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { generateText } from '../apis/kie-ai.js';
import { limparFala, numerosPorExtenso } from './roteiro-narrativa.js';
import { PERSONA, VICIOS_ESSENCIAIS, O_QUE_PRESERVAR } from './lib/voz-do-canal.js';
import { METAPHOR_MEANINGS, BORDAO } from './lib/schema-short.js';
import { escolherTrilha } from './lib/musica.js';
import { SITUACOES, GANCHOS, lerId } from './temas-vida.js';

const OUTPUT_DIR = join(process.cwd(), 'src', 'scripts', 'youtube', 'output');

/** O alvo do formato. 16s é a ordem do dono; o resto sai daqui por conta. */
export const DURACAO_ALVO_SEC = 16;

/**
 * Palavras por segundo desta voz. **Medido**, não estimado: é o mesmo 2,76 que já
 * dimensiona a capa do Short de 50s (ver `Short.tsx`, o cálculo dos 7,4s).
 * 16s × 2,76 ≈ 44 palavras. É POUCO — e é justamente essa a disciplina do formato.
 */
const PALAVRAS_POR_SEGUNDO = 2.76;

/**
 * ⚠️ **OS 16 SEGUNDOS NÃO SÃO TODOS DE FALA.** O vídeo montado é:
 *   fala + 3 respiros (0,40s) + 4 caudas (0,10s) − 3 sobreposições de transição (0,267s)
 *   = fala + 1,20 + 0,40 − 0,80 = fala + 0,80s
 * Logo o orçamento de FALA são 15,2s, e não 16 — o que dá 42 palavras, não 44.
 * Sem esta subtracção o vídeo saía sistematicamente ~1s acima do que o dono pediu.
 */
const SOBRECARGA_SEC = 0.80;
const PALAVRAS_ALVO = Math.round((DURACAO_ALVO_SEC - SOBRECARGA_SEC) * PALAVRAS_POR_SEGUNDO); // 42
const PALAVRAS_MIN = 32;
const PALAVRAS_MAX = 46;

/** Quatro falas = quatro batidas visuais em 16s, uma a cada ~4s. */
const N_FALAS = 4;

/** O texto grande na tela, para quem vê sem som (que é quase toda a gente). */
const MAX_CHARS_TELA = 28;

/**
 * ⚠️ AS PALAVRAS QUE MATAM O LOOP. O dono foi explícito: sem pedir inscrição, sem
 * tela final, sem enrolação. Um "comenta aí" no fim é meio segundo de conversa que
 * quebra o círculo — e o motor de comentários do canal vive no vídeo de 50s, não
 * neste. Por isso é ERRO, não aviso.
 */
const PROIBIDO_CTA = /\b(se\s+inscrev|inscreva|inscri[çc][ãa]o|link\s+na\s+(bio|descri)|comenta\s+a[íi]|comente|deixa\s+o\s+like|curte\s+a[íi]|compartilh|segue\s+o\s+canal|siga\s+o\s+canal|salva\s+esse)/i;

/**
 * ♦ 17/09/2026 — O NÚMERO VOLTOU, MAS JÁ VEM ESCOLHIDO.
 *
 * ═══ O QUE ESTAVA AQUI ANTES, E POR QUÊ ═══
 * Até hoje esta constante proibia QUALQUER número: *"o vídeo conta uma história de
 * casa; não faz conta nenhuma. O que não existe não envenena — e de brinde some a
 * classe inteira de número inventado"*. Nasceu a 07/08, no dia em que o canal ficou sem
 * vídeo porque as travas de número tornaram um roteiro impossível de escrever.
 *
 * ═══ POR QUE MUDA ═══
 * 🔴 **MEDIDO a 17/09, nos 124 vídeos do canal:** metade da audiência sai ao **segundo
 * 6**. Aos 3s ainda lá estão todos (92%–143%) — o gancho funciona. E a retenção manda
 * nas visualizações: abaixo de 50% a mediana é 7 views; entre 100% e 199% é 26. **68 dos
 * 115 vídeos com audiência estão abaixo de 50%.**
 *
 * O segundo 6 é a FALA 2 (fala 1 ≈ 3,6s, fala 2 vai daí aos ~7,6s). E varridos os 80
 * roteiros deste formato, **80 em 80 não tinham um único número, valor ou dado**. Quem
 * chega ao segundo 6 não recebeu nada, e sai. A proibição não era um detalhe: era o
 * conteúdo.
 *
 * ⚠️ E a outra ponta da casa mandava o CONTRÁRIO — `lib/youtube-marketing.js:129`:
 * *"OBRIGATÓRIO: um NÚMERO concreto ou DADO real"*. Duas regras opostas; ganhava a do
 * formato que faz 73 dos 124 vídeos.
 *
 * ═══ COMO SE DEVOLVE O NÚMERO SEM DEVOLVER O PROBLEMA ═══
 * **A IA não escolhe o número: recebe-o.** O valor vem de `temas-vida.js`, já escrito à
 * mão para cada situação. É a mesma disciplina da metáfora (ver o topo deste ficheiro):
 * *"inventar deixa de ser possível — não por o prompt pedir, mas por não haver caminho"*.
 *
 * E o medo de 07/08 fica coberto pelos dois lados: o número já vem pronto (escrever
 * ficou mais FÁCIL, não mais difícil), e o plano B do workflow — três voltas, saltando
 * de situação — continua intacto por cima disto.
 */

/** Qualquer algarismo, cifrão ou percentagem. Só o valor do dia escapa a isto. */
const MARCA_DE_NUMERO = /[0-9]|R\$|%/;

/**
 * O valor do dia, nas duas formas que se lêem exactamente igual depois do
 * `numerosPorExtenso`: "R$ 130" e "130 reais". Aceitar as duas poupa uma reprovação
 * que não melhorava uma vírgula do vídeo.
 */
export function regexDoValor(valor) {
  const num = String(valor || '').replace(/^\s*R\$\s*/i, '').trim();
  if (!num) return null;
  const esc = num.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:R\\$\\s*${esc}|${esc}\\s*reais)`, 'gi');
}

/**
 * Procura um número que NÃO seja o do dia — é esta a trava que substitui a proibição
 * antiga e mata a mesma classe de defeito ("número inventado").
 *
 * ⚠️ Os algarismos que já estão no TÍTULO da situação são autorizados: a situação
 * `decimo-terceiro` chama-se *"O 13º antes que suma"*, e reprovar a fala por dizer "13º"
 * seria um falso alarme contra a própria lista do dono.
 */
export function numeroNaoAutorizado(texto, situacao) {
  let t = String(texto || '');
  const re = regexDoValor(situacao && situacao.valor);
  if (re) t = t.replace(re, ' ');
  for (const n of String((situacao && situacao.titulo) || '').match(/\d+/g) || []) {
    t = t.split(n).join(' ');
  }
  const m = t.match(MARCA_DE_NUMERO);
  return m ? m[0] : null;
}

const PARADAS = new Set([
  'para', 'pela', 'pelo', 'como', 'mais', 'mas', 'que', 'com', 'uma', 'meu', 'minha', 'seu', 'sua',
  'isso', 'esse', 'essa', 'este', 'esta', 'aquele', 'aquela', 'quando', 'porque', 'todo', 'toda',
  'ainda', 'depois', 'antes', 'sempre', 'nunca', 'muito', 'pouco', 'gente', 'você', 'voce', 'onde',
  'tem', 'ter', 'fazer', 'faz', 'ser', 'estar', 'está', 'esta', 'foi', 'era', 'vai', 'ficou', 'fica',
  // ligações e advérbios: passam no filtro de tamanho mas não dizem nada, e uma âncora
  // em cima de "então" põe a imagem a nascer numa palavra que ninguém ouve.
  'entao', 'então', 'desde', 'todo', 'toda', 'agora', 'hoje', 'assim', 'mesmo', 'tambem', 'também', 'entre', 'sobre', 'sem',
]);

/** Só letras, minúsculas, sem pontuação — a forma de comparar duas palavras. */
const nu = (w) => String(w).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');

const palavrasDe = (t) => String(t || '').trim().split(/\s+/).filter(Boolean);

/** As palavras que CARREGAM sentido — as que valem para medir o círculo. */
function palavrasFortes(texto) {
  return [...new Set(palavrasDe(texto).map(nu).filter((w) => w.length >= 4 && !PARADAS.has(w)))];
}

// ─── o pedido à IA ────────────────────────────────────────────────────────────

export function buildPromptLoop(situacao, gancho) {
  const significado = METAPHOR_MEANINGS[situacao.metafora] || '';
  return `${PERSONA}

Mas com UMA diferença que manda em tudo: aqui você NÃO explica nada. Você CONTA O QUE ACONTECEU COM VOCÊ. Fala na primeira pessoa — "eu", "meu", "comigo", "a gente lá em casa".

É um vídeo de ${DURACAO_ALVO_SEC} SEGUNDOS. Isso são ${PALAVRAS_ALVO} palavras no total. Não são ${PALAVRAS_ALVO + 20}. São ${PALAVRAS_ALVO}.

═══ QUEM VAI OUVIR ═══
Um casal brasileiro de classe média ou baixa, com filhos, que precisa fechar as contas do mês. Eles falam de conta de luz, mercado, parcela, boleto, aluguel, escola das crianças. Não falam de "rentabilidade", "estratégia" nem "planejamento financeiro".

═══ A SITUAÇÃO DE HOJE ═══
${situacao.titulo} — ${situacao.cena}

═══ COMO O VÍDEO ABRE (obrigatório) ═══
A PRIMEIRA fala tem de usar este gancho, com estas palavras dentro dela:
    "${gancho.molde}"

⚠️ O gancho fica MELHOR como uma frase CURTA sozinha, e a história começa na frase logo a seguir. Não torça a frase para o gancho caber no meio dela:
    ✓ "Nunca faça isso com a fatura do cartão. Comigo aconteceu no mês passado."
    ✗ "Nunca faça a fatura fechar sem eu conferir meu aplicativo." (a frase ficou torta só para o gancho caber)
O gancho fala COM quem está a ver ("você"); a história a seguir é sua ("eu").

Sem apresentação, sem "oi gente", sem dizer o nome do canal. Começa no conteúdo.

═══ COMO O VÍDEO FECHA (é a alma do formato) ═══
O vídeo acaba DO NADA — sem despedida, sem conselho final, sem frase bonita.
A ÚLTIMA fala tem de devolver quem ouve ao COMEÇO: ela repete a ideia da primeira fala por outro lado, de forma que, quando o vídeo reiniciar sozinho, a primeira frase faça sentido outra vez.
Use pelo menos DUAS palavras que já apareceram na primeira fala.

═══ O NÚMERO DE HOJE — OBRIGATÓRIO, E É ESTE ═══
    ${situacao.valor}  —  ${situacao.valorDoQue}

Ele tem de aparecer na SEGUNDA fala, escrito assim: "${situacao.valor}" (ou "${String(situacao.valor).replace(/^R\$\s*/, '')} reais" — tanto faz).

⚠️ **NÃO INVENTE OUTRO NÚMERO. NÃO ARREDONDE. NÃO ACRESCENTE NENHUM OUTRO.** Nem preço, nem percentagem, nem prazo, nem "três vezes", nem "dois anos". Em todo o vídeo existe UM número, e é o de cima. Qualquer outro reprova o roteiro.

**Por que na segunda fala:** é o segundo 6 do vídeo, e é onde metade das pessoas está a desistir. Elas saem porque até ali não receberam nada de concreto. Este número é o que elas vieram buscar — conte-o como quem conta o que lhe aconteceu, não como quem dá uma aula.
    ✓ "Quando vi, ${situacao.valor} tinham ido embora só nisso."
    ✗ "Estudos mostram que ${situacao.valor} é a média nacional." (isto é aula, e é mentira)

⚠️ Ao contar as palavras, lembre-se de que este número é FALADO por extenso — "${situacao.valor}" vale umas 4 palavras, não 2.

═══ AS QUATRO FALAS ═══
1. O GANCHO + a cena (o que você viu, onde, quando). ~10 palavras.
2. **O NÚMERO** — o que aconteceu com você, com ${situacao.valor} lá dentro. ~12 palavras.
3. A VIRADA — o que você percebeu, ou o que faz agora. ~10 palavras.
4. O FECHO EM CÍRCULO, que devolve ao começo. ~11 palavras.

═══ A IMAGEM DO VÍDEO ═══
A ilustração já está escolhida: **${situacao.metafora}** (${significado}). Não precisa dizer o nome dela nem descrever visual nenhum — só escreva a fala. Se a imagem couber naturalmente na sua história, melhor; se não couber, deixe estar.

═══ PROIBIDO (reprova o roteiro) ═══
⛔ QUALQUER número que não seja "${situacao.valor}". Nem por extenso ("quinhentos reais", "dez por cento", "trinta dias", "dois anos"), nem em algarismo. UM número no vídeo, e é o de hoje.
⛔ Dizer que o número é média, estatística, pesquisa ou "dado do Brasil". É o que aconteceu COM VOCÊ, e mais nada.
⛔ Nada de pedir inscrição, comentário, like ou partilha. Nada de "link na descrição". Nada de tela final.
⛔ Nada de "${BORDAO}" — esse bordão é do outro formato.
⛔ Nada de despedida ("é isso", "fica a dica", "espero ter ajudado").
${VICIOS_ESSENCIAIS}

═══ O QUE VALE OURO ═══
${O_QUE_PRESERVAR}

═══ O TEXTO DA TELA ═══
Para cada fala, escreva também um texto CURTO que aparece grande na tela — no máximo ${MAX_CHARS_TELA} caracteres. Muita gente vê sem som: esse texto tem de contar a história sozinho.

⚠️ **A SEGUNDA TELA TEM DE TER "${situacao.valor}" ESCRITO NELA**, e quanto mais sozinho o número estiver, melhor — é ele que trava o dedo de quem passa sem som. As outras três telas não levam número nenhum.
    ✓ "${situacao.valor} só nisso"
    ✗ "eu gastei demais no mês" (o número sumiu, e era o que segurava)

Devolva SÓ este JSON, sem mais nada:
{
  "falas": ["...", "...", "...", "..."],
  "telas": ["...", "...", "...", "..."]
}`;
}

// ─── as travas ────────────────────────────────────────────────────────────────

/**
 * As checagens DURAS. Todas medem VERDADE ou ESTRUTURA — nenhuma mede gosto.
 * (Gosto mede-se com um segundo leitor, nunca com regex. É a regra da casa.)
 */
export function validarLoop(n, situacao, gancho) {
  const erros = [];
  const avisos = [];

  const falas = Array.isArray(n && n.falas) ? n.falas.map((f) => String(f || '').trim()) : [];
  const telas = Array.isArray(n && n.telas) ? n.telas.map((t) => String(t || '').trim()) : [];

  if (falas.length !== N_FALAS) {
    erros.push(`são ${N_FALAS} falas, recebi ${falas.length}`);
    return { ok: false, erros, avisos, palavras: 0 };
  }
  if (falas.some((f) => !f)) erros.push('há fala vazia');
  if (telas.length !== N_FALAS) erros.push(`são ${N_FALAS} textos de tela, recebi ${telas.length}`);

  const tudo = falas.join(' ');
  /**
   * ⚠️ **AS PALAVRAS CONTAM-SE COMO A VOZ AS DIZ, NÃO COMO ESTÃO ESCRITAS** — 17/09.
   * "R$ 3.200" são 2 palavras no papel e CINCO na boca ("três mil e duzentos reais"),
   * porque `montarRoteiro` passa a fala por `numerosPorExtenso` antes de a gravar.
   * Contar sobre o cru subestimava a fala e punha o vídeo ~1s acima dos 16s — o mesmo
   * erro que a SOBRECARGA_SEC aqui em cima já veio consertar uma vez.
   */
  const palavras = palavrasDe(numerosPorExtenso(tudo)).length;

  // 1. o tamanho — é o que faz caber em 16 segundos
  if (palavras < PALAVRAS_MIN) erros.push(`só ${palavras} palavras: o vídeo fica curto demais (alvo ${PALAVRAS_ALVO}, mínimo ${PALAVRAS_MIN})`);
  if (palavras > PALAVRAS_MAX) erros.push(`${palavras} palavras não cabem em ${DURACAO_ALVO_SEC}s (alvo ${PALAVRAS_ALVO}, máximo ${PALAVRAS_MAX}) — CORTE IDEIAS, não encolha as frases`);

  // 2. o gancho tem de estar lá, com as palavras dele
  if (!gancho.assinatura.test(falas[0])) {
    erros.push(`a 1ª fala não usa o gancho "${gancho.molde}" — a expressão tem de aparecer inteira`);
  }

  // 3. primeira pessoa — é o que os números de retenção pediram
  const marcasEu = (tudo.match(/\b(eu|meu|minha|meus|minhas|comigo|mim|a gente|nosso|nossa)\b/gi) || []).length;
  if (marcasEu < 2) erros.push(`isto está a explicar, não a contar: só ${marcasEu} marca(s) de primeira pessoa (mínimo 2 — "eu", "meu", "comigo", "a gente")`);

  // 4. O CÍRCULO — a última fala devolve ao princípio
  const fortesAbertura = palavrasFortes(falas[0]);
  const fortesFecho = palavrasFortes(falas[N_FALAS - 1]);
  const partilhadas = fortesFecho.filter((w) => fortesAbertura.includes(w));
  if (partilhadas.length < 2) {
    erros.push(`o círculo não fecha: a última fala partilha ${partilhadas.length} palavra(s) com a primeira (mínimo 2). Sem isso o vídeo não reinicia sozinho.`);
  }

  // 5. nada de chamada à ação
  const cta = tudo.match(PROIBIDO_CTA);
  if (cta) erros.push(`"${cta[0]}" é chamada à ação e este formato não tem nenhuma`);

  /**
   * 6. O NÚMERO DO DIA — 17/09. São DUAS travas, e as duas são precisas:
   *    (a) ele TEM de estar na 2ª fala — é o segundo 6, onde metade sai;
   *    (b) nenhum OUTRO número pode existir — é o que herda a protecção da proibição
   *        antiga contra "número inventado", sem herdar o vídeo vazio.
   */
  const reValor = regexDoValor(situacao.valor);
  if (!reValor) {
    erros.push(`a situação "${situacao.id}" não tem \`valor\` em temas-vida.js — sem número não há segundo 6`);
  } else if (!falas[1].match(reValor)) { // `.match`, não `.test`: o regex tem flag `g` e `.test` guarda lastIndex
    erros.push(`a 2ª fala não diz "${situacao.valor}" — é o número do dia (${situacao.valorDoQue}) e é ele que segura quem chega ao segundo 6`);
  }

  const intruso = numeroNaoAutorizado(tudo, situacao);
  if (intruso) erros.push(`"${intruso}": o único número deste vídeo é "${situacao.valor}" — não invente nem acrescente outro`);

  // 7. o bordão é do outro formato
  if (nu(tudo).includes(nu(BORDAO).slice(0, 24))) erros.push('o bordão do canal não entra neste formato');

  // 8. o texto da tela — a 2ª leva o número grande, as outras não levam nenhum
  telas.forEach((t, i) => {
    if (t.length > MAX_CHARS_TELA) erros.push(`tela ${i + 1}: ${t.length} caracteres (máximo ${MAX_CHARS_TELA}) — "${t}"`);
    if (i === 1) {
      if (!MARCA_DE_NUMERO.test(t)) erros.push(`tela 2: tem de mostrar "${situacao.valor}" — é o que trava o dedo de quem vê sem som`);
      else if (numeroNaoAutorizado(t, situacao)) erros.push(`tela 2: o número tem de ser "${situacao.valor}" e mais nenhum — "${t}"`);
    } else if (MARCA_DE_NUMERO.test(t)) {
      erros.push(`tela ${i + 1}: só a 2ª tela leva número — "${t}"`);
    }
  });

  // avisos (não reprovam)
  if (palavras > PALAVRAS_ALVO + 3) avisos.push(`${palavras} palavras: vai ficar apertado nos ${DURACAO_ALVO_SEC}s`);
  if (/[?]/.test(falas[0]) === false && /pergunta/i.test(gancho.molde)) avisos.push('o gancho é uma pergunta e a fala não tem ponto de interrogação');

  return { ok: erros.length === 0, erros, avisos, palavras };
}

// ─── a coreografia, CALCULADA (nunca pedida) ──────────────────────────────────

/**
 * A âncora é uma palavra que está MESMO escrita na fala. Escolhe-se a n-ésima
 * palavra "forte" — se não houver, cai na mais longa da frase. Nunca devolve algo
 * que não esteja no texto, e é essa a diferença entre isto e pedir à IA.
 */
function ancora(fala, ordem = 0) {
  const cruas = palavrasDe(fala);
  const fortes = cruas.filter((w) => nu(w).length >= 5 && !PARADAS.has(nu(w)));
  const menu = fortes.length ? fortes : cruas;
  const escolhida = menu[Math.min(ordem, menu.length - 1)] || cruas[0] || '';
  const limpa = escolhida.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
  /**
   * ⚠️ NUNCA DEVOLVER VAZIO. Uma fala só com pontuação (ou vazia, se algum dia uma
   * trava deixar passar) fazia esta função devolver `''`, e um shot com `anchor: ""`
   * é um plano que nunca chega a nascer no render — em silêncio, que é o pior modo.
   * A rede é a primeira palavra crua; se nem isso houver, a própria fala.
   */
  return limpa || (cruas[0] || String(fala || '').trim() || 'isso');
}

/**
 * Monta o roteiro no MESMO formato do Short de 50s — mesmas chaves, mesmos nomes —
 * para que TTS, legendas e render não precisem de saber que este vídeo é diferente.
 *
 * ⚠️ **SEM `intro`, e é de propósito.** `introSecondsFor()` (em `srt-short.js`)
 * devolve 0 quando não há `intro`, que é exactamente o que este formato precisa: o
 * vídeo começa no conteúdo, no fotograma zero, sem capa nenhuma por cima.
 * ⚠️ **SEM cena de `cta`.** É a ordem do dono, e é o que distingue os dois formatos.
 */
export function montarRoteiro(n, situacao, gancho, { jaPublicados = 0 } = {}) {
  const falas = n.falas.map((f) => limparFala(numerosPorExtenso(String(f).trim()), situacao.titulo));
  const telas = n.telas.map((t) => String(t).trim());

  /**
   * A duração de cada cena sai do PESO da fala. ⚠️ A soma é normalizada para o tempo
   * de FALA (15,2s), não para os 16s do vídeo: o `durationSec` de uma cena é o que ela
   * DIZ, e os silêncios são somados depois, pelo render. Normalizar para 16 aqui punha
   * o vídeo a ~16,8s. (Na produção este número é só a rede: quem manda é a medição do
   * Whisper. Mas é ele que vale no preview sem voz, e é preciso estar certo.)
   */
  const pesos = falas.map((f) => Math.max(1, palavrasDe(f).length));
  const somaPesos = pesos.reduce((a, b) => a + b, 0);
  const tempoDeFala = DURACAO_ALVO_SEC - SOBRECARGA_SEC;
  const duracoes = pesos.map((p) => Number(((p / somaPesos) * tempoDeFala).toFixed(2)));

  // O PRIMEIRO plano do vídeo. O último será a cópia dele — é o círculo visual.
  const planoDeAbertura = { anchor: ancora(falas[0], 0), visual: { type: 'statement', text: telas[0] }, sfx: 'boom' };

  const cenas = [
    {
      id: 1,
      role: 'hook',
      narration: falas[0],
      durationSec: duracoes[0],
      shots: [
        planoDeAbertura,
        { anchor: ancora(falas[0], 1), visual: { type: 'metaphor', metaphor: situacao.metafora } },
      ],
    },
    {
      id: 2,
      role: 'beat',
      narration: falas[1],
      durationSec: duracoes[1],
      shots: [
        { anchor: ancora(falas[1], 0), visual: { type: 'metaphor', metaphor: situacao.metafora }, sfx: 'thud' },
        { anchor: ancora(falas[1], 1), visual: { type: 'statement', text: telas[1] } },
      ],
    },
    {
      id: 3,
      role: 'beat',
      narration: falas[2],
      durationSec: duracoes[2],
      shots: [
        { anchor: ancora(falas[2], 0), visual: { type: 'statement', text: telas[2] }, sfx: 'sparkle' },
        { anchor: ancora(falas[2], 1), visual: { type: 'metaphor', metaphor: situacao.metafora } },
      ],
    },
    {
      id: 4,
      role: 'outro',
      narration: falas[3],
      durationSec: duracoes[3],
      shots: [
        { anchor: ancora(falas[3], 0), visual: { type: 'statement', text: telas[3] } },
        /* ⚠️ O ÚLTIMO PLANO É O PRIMEIRO. É isto que faz o corte fechar o círculo: o
           fotograma final e o fotograma inicial mostram a mesma coisa, e o olho não
           vê o salto quando o vídeo reinicia. Sem `sfx` — o fim é seco, de propósito. */
        { anchor: ancora(falas[3], 1), visual: { ...planoDeAbertura.visual } },
      ],
    },
  ];

  const total = Number(cenas.reduce((a, c) => a + c.durationSec, 0).toFixed(2));

  return {
    slug: `loop-${situacao.id}-${gancho.id}`,
    formato: 'loop16',
    term: situacao.titulo,
    category: 'vida',
    keyword: situacao.chave,
    /**
     * ♦ 17/09/2026 — O VALOR VAI NO ROTEIRO, e é a CAPA que o vem cá buscar.
     *
     * 🔴 **MEDIDO:** `capa-texto.js` desenha três linhas — assunto, NÚMERO EM GRANDE,
     * consequência — e tem um plano B para quando não encontra número ("o título sobe
     * para o lugar dele, para a capa não ficar oca"). Varridas as capas deste formato,
     * **81 em 81 caíram no plano B.** O plano A nunca correu uma única vez, porque o
     * número era procurado no `term` e o `term` deste formato nunca teve nenhum.
     *
     * É a mesma raiz do vazio do segundo 6, a sair pela outra ponta: sem número no
     * roteiro, nem a fala nem a capa tinham o que mostrar.
     */
    valor: situacao.valor,
    situacao: situacao.id,
    gancho: gancho.id,
    ganchoFamilia: gancho.familia,
    turno: situacao.turno,
    nextVideoTitle: '',
    music: escolherTrilha(situacao.metafora, jaPublicados),
    fioCondutor: situacao.metafora,
    scenes: cenas,
    totalDurationSec: total,
  };
}

// ─── o gerador ────────────────────────────────────────────────────────────────

function extrairJson(bruto) {
  const t = String(bruto || '').trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const i = t.indexOf('{');
  const f = t.lastIndexOf('}');
  if (i < 0 || f <= i) throw new Error('não veio JSON nenhum na resposta');
  return JSON.parse(t.slice(i, f + 1));
}

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

export async function gerarLoop(situacao, gancho, { tentativas = 4 } = {}) {
  const base = buildPromptLoop(situacao, gancho);
  const exigencias = [];

  for (let i = 1; i <= tentativas; i++) {
    if (i > 1) await dormir(20000); // o mesmo respiro do gerador de 50s (token bucket)
    const corretivo = exigencias.length
      ? `\n\n⚠️ A versão anterior foi REPROVADA. Corrija exactamente isto e devolva o JSON outra vez:\n${[...new Set(exigencias)].join('\n')}`
      : '';

    const bruto = await generateText(base + corretivo, { maxTokens: 1200, temperature: 0.8, pago: 'escritor' });

    let n;
    try {
      n = extrairJson(bruto);
    } catch (err) {
      exigencias.push(`- devolva JSON válido (${err.message})`);
      continue;
    }

    const v = validarLoop(n, situacao, gancho);
    if (v.ok) return { narrativa: n, avisos: v.avisos, palavras: v.palavras, tentativa: i };

    for (const e of v.erros) exigencias.push(`- ${e}`);
    console.log(`  ⚠ tentativa ${i}/${tentativas} reprovada: ${v.erros.join(' | ')}`);
  }

  throw new Error(`o roteiro de 16s não passou nas travas após ${tentativas} tentativas`);
}

// ─── execução directa ─────────────────────────────────────────────────────────

const executadoDireto = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('roteiro-loop.js');
if (executadoDireto) {
  const flags = Object.fromEntries(
    process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => {
      const [k, ...v] = a.slice(2).split('=');
      return [k, v.join('=') || true];
    }),
  );

  const alvo = flags.id
    ? lerId(flags.id)
    : (flags.situacao && flags.gancho
      ? {
        situacao: SITUACOES.find((s) => s.id === flags.situacao),
        gancho: GANCHOS.find((g) => g.id === flags.gancho),
      }
      : null);

  if (!alvo || !alvo.situacao || !alvo.gancho) {
    console.error('❌ diga qual vídeo: --id=VIDA:<situacao>:<gancho>  (ou --situacao= --gancho=)');
    process.exit(1);
  }

  const { situacao, gancho } = alvo;
  console.log(`\n🔁 SHORT DE ${DURACAO_ALVO_SEC}s EM LOOP`);
  console.log(`   situação : ${situacao.titulo} (${situacao.turno})`);
  console.log(`   gancho   : ${gancho.molde}`);
  console.log(`   imagem   : ${situacao.metafora} — ${METAPHOR_MEANINGS[situacao.metafora]}\n`);

  gerarLoop(situacao, gancho)
    .then((r) => {
      const roteiro = montarRoteiro(r.narrativa, situacao, gancho);
      console.log(`✅ passou à ${r.tentativa}ª tentativa · ${r.palavras} palavras · ${roteiro.totalDurationSec}s\n`);
      roteiro.scenes.forEach((c) => {
        console.log(`  [${c.role}] ${c.durationSec}s — ${c.narration}`);
        c.shots.forEach((s) => console.log(`        ↳ "${s.anchor}" → ${s.visual.type}${s.visual.text ? `: ${s.visual.text}` : ''}${s.visual.metaphor ? `: ${s.visual.metaphor}` : ''}`));
      });
      if (r.avisos.length) console.log(`\n⚠️  ${r.avisos.join(' | ')}`);

      if (flags.gravar) {
        if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });
        const caminho = join(OUTPUT_DIR, `${roteiro.slug}.script.json`);
        writeFileSync(caminho, `${JSON.stringify(roteiro, null, 2)}\n`);
        console.log(`\n💾 ${caminho}`);
      } else {
        console.log('\n(não gravei — junte --gravar para escrever o ficheiro)');
      }
    })
    .catch((err) => {
      console.error(`❌ ${err.message}`);
      process.exit(1);
    });
}
