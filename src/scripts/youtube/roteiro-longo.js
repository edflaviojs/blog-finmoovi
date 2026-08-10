/**
 * O ROTEIRO DO VÍDEO LONGO — cinco andares, e nenhum deles escreve o vídeo todo.
 * (IMPLEMENTACAO20 §14 F3 · a lição das ÂNCORAS do §26.3 · o esqueleto medido do §33.5)
 *
 * ═══ A REGRA QUE MANDA EM TUDO AQUI ═══
 * **Um guião de seis minutos NÃO se escreve de uma vez.** Escreve-se por blocos
 * ancorados: cada bloco começa e acaba num estado definido, e o seguinte agarra-se a
 * esse estado. É a tradução do que o LTX-Video faz com fotogramas-âncora (§26.3 L1) e
 * é o que torna possível corrigir UM bloco sem partir os outros — sem isso, o pêndulo
 * que já nos custou dias num Short de 50 segundos repete-se num texto dez vezes maior,
 * onde é fatal.
 *
 * ═══ OS CINCO ANDARES ═══
 *  0. O MAPA      — promessa + 3 capítulos (título, número-chave, o que fica em aberto)
 *                   + a resposta do fim. **Validado por CÓDIGO antes de existir guião.**
 *  1. OS BLOCOS   — um de cada vez, cada chamada recebendo o mapa, o ÚLTIMO PARÁGRAFO
 *                   LITERAL do bloco anterior, os números já usados e as comparações
 *                   já gastas. Modelo barato (o escritor).
 *  2. AS COSTURAS — uma passagem que lê SÓ as junções (as duas frases finais e as duas
 *                   iniciais de cada emenda) e conserta a ponte.
 *  3. O POLIDOR   — modelo bom, CAPÍTULO A CAPÍTULO, nunca o vídeo inteiro (lib/leitor-longo.js).
 *  4. AS TRAVAS   — as do bloco + as GLOBAIS: nada repetido entre capítulos, chamada
 *                   uma vez, bordão uma vez, promessa cumprida no fim (lib/schema-longo.js).
 *
 * ═══ O QUE ESTE FICHEIRO NÃO FAZ, DE PROPÓSITO ═══
 * Não toca em NADA do Short. Não lê nem escreve a fila de temas (`youtube-topics.json`),
 * não entra na fila de saída, não publica. O tema entra pela linha de comando. O robô
 * diário publica Shorts públicos ao meio-dia e não pode ser perturbado por isto.
 *
 * Uso:
 *   node src/scripts/youtube/roteiro-longo.js
 *   node src/scripts/youtube/roteiro-longo.js --tema="..." --angulo="..." --glossario=divida
 *   node src/scripts/youtube/roteiro-longo.js --so-mapa      (só o andar 0, para ver o desenho)
 */

import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { generateText } from '../apis/kie-ai.js';
import { BORDAO, METAPHORS, METAPHOR_MEANINGS } from './lib/schema-short.js';
import { MAX_PALAVRAS_CAPA } from './lib/palavras.js';
import { PERSONA, VICIOS_ESSENCIAIS, O_QUE_PRESERVAR } from './lib/voz-do-canal.js';
import { montarFichaDeNumeros, montarFichaDeDivida } from './lib/simulador.js';
import { polirCapitulo, polirBloco } from './lib/leitor-longo.js';
import {
  ORCAMENTO, MOVIMENTOS, PARTES_DO_CAPITULO, PARTES_POSSIVEIS, NUM_CAPITULOS, MAX_PALAVRAS_TITULO, PALAVRAS_POR_SEGUNDO,
  validarMapa, validarAbertura, validarCapitulo, validarChamada, validarFecho, validarLongo,
  contarPalavras, frasesDe, falaCorrida, consertarMapa,
} from './lib/schema-longo.js';
/**
 * ⚠️ IMPORTADO DO SHORT DE PROPÓSITO, E NÃO COPIADO.
 * `limparFala` é a limpeza MECÂNICA (algarismos viram palavras, travessão vira
 * vírgula, dois-pontos vira frase nova, grafia inventada de numeral corrigida). Ela
 * custou meses de defeitos a afinar. Copiá-la para aqui era garantir que um dia as
 * duas versões divergiam — o modo de falha crónico desta casa. Importar não é tocar:
 * `roteiro-narrativa.js` só corre sozinho quando é chamado pelo nome, e não é.
 * `montarCorretivo` vem do mesmo sítio pela mesma razão.
 */
import { limparFala, montarCorretivo } from './roteiro-narrativa.js';
import { loadRecentPublishedContext } from './roteiro-short.js';
// ♦ O caderno que impede dois vídeos seguidos de contarem a mesma cena (08/08/2026).
import {
  cenariosGastos, guardarCenarios, fiosGastos, promessasGastas, RAIO_DE_CENARIOS,
  escolherElenco, escolherFuncaoDoApp, elencosGastos, funcoesGastas,
} from './lib/cenarios-do-longo.js';

const AQUI = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(AQUI, 'output');
const GLOSSARIO_DIR = join(process.cwd(), 'src', 'content', 'glossario');

const args = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => {
    const [k, ...v] = a.slice(2).split('=');
    return [k, v.join('=') || true];
  }),
);

/**
 * O TEMA DO PILOTO — decisão do dono, fechada antes de eu escrever uma linha:
 * SAIR DO VERMELHO / DÍVIDAS. Fica aqui como omissão para o comando ser curto, mas
 * qualquer tema entra por `--tema` sem tocar em código.
 */
const TEMA_PILOTO = {
  term: 'Sair do vermelho: o plano de três passos pra pagar a dívida sem apertar mais o mês',
  angle: 'A pessoa já tentou pagar e não conseguiu. Mostrar por que o dinheiro não sobra, '
    + 'como ver o tamanho real da dívida num sítio só, e por onde começar a atacar sem cortar o essencial.',
  glossario: 'divida',
};

// ─── material de apoio (leitura, nunca escrita) ──────────────────────────────

function lerGlossario(slug) {
  if (!slug) return { definition: '', body: '' };
  const p = join(GLOSSARIO_DIR, `${slug}.md`);
  if (!existsSync(p)) return { definition: '', body: '' };
  const raw = readFileSync(p, 'utf-8');
  const partes = raw.split('---');
  if (partes.length < 3) return { definition: '', body: '' };
  const fm = partes[1];
  const definition = (fm.match(/definition:\s*"?([^"\n]+)"?/) || [])[1]?.trim() || '';
  return { definition, body: partes.slice(2).join('---').trim() };
}

const cortar = (txt, max = 1800) => {
  if (!txt || txt.length <= max) return txt || '';
  const c = txt.slice(0, max);
  return `${c.slice(0, Math.max(0, c.lastIndexOf(' ')))}… (trecho)`;
};

export function lerTemaLongo() {
  const term = args.tema && args.tema !== true ? String(args.tema) : TEMA_PILOTO.term;
  const angle = args.angulo && args.angulo !== true ? String(args.angulo) : TEMA_PILOTO.angle;
  /**
   * 🔴 SEM `--glossario`, NÃO SE LÊ GLOSSÁRIO NENHUM — 08/08/2026.
   *
   * Isto caía em `TEMA_PILOTO.glossario`, que é **'divida'**. Consequência, medida:
   * **todo vídeo longo, seja qual for o assunto, recebia como material de apoio o
   * verbete da dívida do cartão** — o do vídeo piloto.
   *
   * Foi essa a causa da queixa do dono: *"no vídeo passado foi falado de fatura do
   * cartão, falado sobre num domingo, e agora está se repetindo"*. O vídeo era sobre
   * dois homens e aposentadoria, e falava da fatura porque **foi isso que lhe deram
   * para ler**. O `pick-next-longo.js` passa `--glossario` só quando a linha da fila
   * tem um; a do vídeo 2 não tinha.
   *
   * ⚠️ E é seguro cair em vazio, não é um remendo: `lerGlossario` já devolve
   * `{definition:'', body:''}` em três caminhos (sem slug, ficheiro ausente, formato
   * errado), e o `contexto()` só escreve a DEFINIÇÃO e o MATERIAL DE APOIO **se não
   * estiverem vazios**. Sem glossário, esses dois blocos simplesmente não existem no
   * pedido — o vídeo passa a apoiar-se no tema e no ângulo, que são dele.
   *
   * ⚠️ O caminho certo a prazo é a fila trazer o glossário CERTO em cada linha. Até lá,
   * **nenhum apoio é melhor do que o apoio de outro vídeo.**
   */
  const slug = args.glossario && args.glossario !== true ? String(args.glossario) : '';
  const { definition, body } = lerGlossario(slug);
  return { term, angle, definition, body, glossario: slug };
}

// ═══════════════════════════════════════════════════════════════════════════════
// OS EXEMPLOS DOS PROMPTS
//
// ⚠️ LEIA ISTO ANTES DE MEXER EM QUALQUER UM DELES.
//
// 1. **Todo exemplo é de OUTRO assunto.** Registado treze vezes neste repositório:
//    o modelo copia à letra o exemplo que lhe damos. Se o exemplo falar do assunto do
//    vídeo, ele deixa de ser uma lição de FORMA e passa a ser o guião.
// 2. **Todo exemplo entra na comparação anti-cópia** (`EXEMPLO_PARA_COMPARAR`), para
//    copiá-lo custar caro. Seis palavras seguidas reprovam o bloco.
// 3. **Todo exemplo ✓ PASSA nos validadores do prompt onde vive**, e isso é PROVADO
//    por `src/scripts/validacao/validar-roteiro-longo.js`, que corre sem gastar um
//    cêntimo. É a regra que evita a 16ª ocorrência de "o prompt manda o que o
//    validador pune". Se você mexer num exemplo e a prova ficar vermelha, o exemplo
//    está errado — não a trava.
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * O mapa-exemplo. Assunto: assinaturas esquecidas — NÃO é dívida, de propósito.
 *
 * ⚠️ REESCRITO EM 04/08/2026, depois de o dono ver o primeiro vídeo. O mapa antigo
 * dava um número DIFERENTE a cada capítulo (47 · 189 · 640) e era isso que ensinava o
 * modelo a inventar uma história nova em cada ato. Agora há UM número (189) e uma
 * lista fechada de tudo o que se pode dizer em dinheiro. Os três atos falam do mesmo
 * dinheiro, visto de ângulos diferentes.
 */
export const EXEMPLO_DE_MAPA = {
  promessa: 'Vou te mostrar como achar as assinaturas que você paga sem usar e cortar as maiores ainda hoje',
  fioCondutor: 'ralo',
  numeroEspinha: 189,
  valores: [
    { nome: 'o streaming que ninguém abria', valor: 39 },
    { nome: 'a academia parada', valor: 90 },
    { nome: 'o jogo do celular', valor: 60 },
    { nome: 'a fatura do cartão onde as três caem', valor: 189 },
  ],
  somas: [
    { de: ['o streaming que ninguém abria', 'a academia parada', 'o jogo do celular'], da: 'a fatura do cartão onde as três caem' },
  ],
  contaDoCartao: 'a fatura do cartão onde as três caem',
  capituloDaDemonstracao: 2,
  capitulos: [
    {
      titulo: 'A noite em que eu li a fatura linha por linha',
      oQueAcrescenta: 'o susto: de onde vêm os cento e oitenta e nove reais, item a item',
      oQueFicaEmAberto: 'há quanto tempo é que aquilo já saía sem ninguém ver',
    },
    {
      titulo: 'O que aparece quando você põe tudo no mesmo lugar',
      oQueAcrescenta: 'o tempo: os mesmos cento e oitenta e nove reais multiplicados pelos meses que já passaram',
      oQueFicaEmAberto: 'quais delas dá mesmo para cortar sem falta nenhuma',
    },
    {
      titulo: 'Cancelar sem perder o que a casa usa',
      oQueAcrescenta: 'a saída: quais dos cento e oitenta e nove saem hoje e quais ficam',
      oQueFicaEmAberto: 'a cobrança que volta sozinha se ninguém olhar',
    },
  ],
  respostaDaPromessa: 'As assinaturas esquecidas saem da fatura no dia em que você as vê escritas num sítio só',
  lacoAberto: 'e tem uma delas que volta a cobrar sozinha no ano seguinte sem avisar ninguém',
};

/** A abertura-exemplo. Assunto: conta de luz. */
/**
 * 🔴 ESTE EXEMPLO FOI REESCRITO EM 08/08/2026, e a razão está nos dois vídeos que o
 * dono mandou como referência.
 *
 * A versão antiga começava por uma pergunta: *"Você sabe qual aparelho da sua casa
 * gasta mais luz do que a geladeira?"*. Ele viu o vídeo que saiu daqui e disse: *"ele
 * faz uma pergunta muito longa logo de início, isso não é nada chamativo"*.
 *
 * Os dois vídeos que ele deu como bons abrem os dois com uma CENA, e a diferença é
 * gritante quando se lê em voz alta:
 *   · *"Dois homens saem do mesmo galpão, mesmo horário, depois de 30 anos carregando
 *     o mesmo tipo de caixa. Os dois têm as costas curvadas do mesmo jeito."*
 *
 * O que se destilou dali, e está tudo dentro deste exemplo:
 *   1. **Abre pelo que se VÊ**, não pelo que se pergunta.
 *   2. **Coisas do dia a dia com nome**: o dia dez, a caixa do correio, o chuveiro, a
 *      máquina de lavar meio vazia. Nunca "os gastos" nem "as despesas".
 *   3. **A pergunta vem a seguir e é CURTA.**
 *   4. **Ninguém é "um deles" antes de ser apresentado.**
 *   5. **Volta-se à cena no fim** (isso faz-se no bloco do fecho, não aqui).
 */
export const EXEMPLO_DE_ABERTURA = {
  promessa: 'Vou te mostrar onde a sua conta de luz sobe sozinha e o que dá pra desligar hoje',
  fala: 'Todo dia dez a conta de luz chega na caixa do correio da minha mãe. '
    + 'Três meses seguidos ela veio mais cara, e ninguém em casa comprou nada novo. '
    + 'Então o que mudou? '
    + 'Mudou o chuveiro, que nem passa vinte minutos ligado por dia e pesa mais do que parece. '
    + 'Fui olhar de perto e achei o banho demorado de manhã, a máquina de lavar rodando meio vazia, '
    + 'e uma lâmpada de área acesa a noite inteira. '
    + 'Cada uma parece pequena sozinha, e é por isso que ninguém repara. '
    + 'Nos próximos minutos eu te mostro onde a sua conta de luz sobe sozinha, quanto isso deu na casa dela, '
    + 'e o que dá pra desligar hoje sem ninguém reclamar.',
};

/**
 * O capítulo-exemplo — e agora é o **ATO 1 da MESMA história do mapa acima**, de
 * propósito. Antes era um assunto à parte, e isso ensinava exatamente o defeito que
 * o dono apanhou: cada capítulo com a sua história. Ver o mapa e depois o ato que
 * nasce dele é o que mostra ao modelo que os dois são a mesma coisa.
 * Repare: não diz FinMoovi (a demonstração é do ato 2), diz o número-espinha, e não
 * cita um único valor que não esteja na lista do mapa.
 *
 * ═══ 🔴 O DOMINGO SAIU DAQUI EM 10/08/2026, E É A 17ª OCORRÊNCIA DA MESMA COISA ═══
 *
 * **O pedido mandava escrever exactamente o que o caderno de cenas proíbe.**
 *
 * O dono queixou-se em 08/08 de o vídeo 2 repetir *"o domingo"* e *"a fatura"* do vídeo
 * 1. Construiu-se o caderno de cenários, que entra no pedido do MAPA a dizer *"estas já
 * saíram, não podem voltar"*. E em 10/08, com o caderno a funcionar e a proibir o
 * domingo, o vídeo novo escreveu à mesma **"Até que eu parei num domingo"**.
 *
 * A razão não é o modelo ser desobediente. É que a palavra *domingo* aparecia **cinco
 * vezes** no que ele lê, e duas delas como MODELO DO QUE É BOM:
 *   · aqui, no título e no corpo do capítulo-exemplo que ele é mandado copiar;
 *   · no mapa-exemplo, no título do ato 1;
 *   · na lista *"o que faz isto prender"*: «o detalhe concreto e pequeno — **o domingo**»;
 *   · no "repare" que fecha o exemplo: «o detalhe é pequeno e concreto (**o domingo**)»;
 *   · e num aviso sobre um defeito antigo.
 *
 * O caderno dizia "não uses o domingo" uma vez. O pedido ensinava-o cinco. Ganhou o
 * pedido — e o modelo fez o que lhe foi mostrado, não o que lhe foi dito.
 *
 * > ## 🔑 A REGRA QUE FICA
 * > **Os detalhes de enfeite de um exemplo não podem ser cenas da lista `FAMILIAS`**
 * > (`lib/cenarios-do-longo.js`). O ASSUNTO do exemplo pode — está declarado como sendo
 * > de outro vídeo, e o modelo é avisado disso. O que escapa é o detalhe pequeno, porque
 * > é justamente esse que se manda copiar quando se diz *"copie a FORMA"*.
 *
 * Saíram por isso: `o domingo` (título e corpo) e `o boleto` (*"nunca atrasei um boleto"*
 * → *"nunca atrasei uma conta"*). **Há uma prova que confere isto sozinha** — ver
 * `validar-roteiro-longo.js`, secção dos exemplos contra o caderno de cenas.
 *
 * ⚠️ **`a fatura do cartão` FICA, e é uma decisão, não um esquecimento.** Ela é o ASSUNTO
 * do exemplo (as três assinaturas caem numa fatura), não um enfeite: tirá-la obriga a
 * reescrever o mapa-exemplo inteiro — valores, somas, `contaDoCartao` — e as provas que
 * o medem. Fica anotado como a próxima a atacar se o dono voltar a ver faturas a mais.
 */
export const EXEMPLO_DE_CAPITULO = {
  titulo: 'A noite em que eu li a fatura linha por linha',
  pergunta: 'Você sabe quantas coisas você paga todo mês sem usar? '
    + 'Eu achava que sabia. Levei um susto.',
  desenvolvimento: 'Olha, eu pago tudo em dia. Nunca atrasei uma conta na vida, e por isso mesmo nunca tinha parado para ler a fatura com calma. '
    + 'Naquela noite eu sentei com ela na mão e fui descendo linha por linha. '
    + 'Trinta e nove reais de um streaming que ninguém lá em casa abria desde o inverno. '
    + 'Noventa reais de uma academia onde eu não punha os pés. '
    + 'Sessenta reais de um jogo de celular que o meu filho instalou e esqueceu. '
    + 'Fui somando ali mesmo, na margem do papel, e deu cento e oitenta e nove reais. '
    + 'Por mês. Saindo enquanto eu dormia, sem ninguém pedir e sem ninguém olhar. '
    + 'E sabe o que doeu mais? Não foi o valor. Foi perceber que cada uma delas, sozinha, é pequena demais para eu ter reparado. '
    + 'Ninguém me enganou. Fui eu que assinei as três, uma de cada vez, em meses diferentes, e nenhuma delas me pareceu cara no dia em que entrou.',
  regancho: 'Só que se cento e oitenta e nove reais saem sem eu ver, a pergunta seguinte é feia. '
    + 'Há quanto tempo é que isso já vinha acontecendo?',
};

/**
 * A DEMONSTRAÇÃO-EXEMPLO, num campo à parte — porque agora ela vive num capítulo só.
 * ⚠️ Ela mostra a regra que o dono pediu ao ver o primeiro vídeo: o app aparece UMA
 * vez, com peso, e conta-se o que apareceu na TELA. Nada de "o app me mostrou o
 * estrago" — isso não mostra nada.
 */
export const EXEMPLO_DE_DEMONSTRACAO = 'Foi aí que eu joguei as três no FinMoovi, uma por uma, com o dia da cobrança. '
  + 'Quando abri a tela, elas estavam juntas numa linha só, com o total de cento e oitenta e nove reais escrito em cima. '
  + 'E ao lado, uma coisa que eu não tinha pedido: há quantos meses cada uma vinha sendo cobrada.';

/** O fecho-exemplo. Assunto: conta de luz (o mesmo da abertura, para o laço fechar). */
export const EXEMPLO_DE_FECHO = 'No fim das contas, a sua conta de luz não sobe de uma vez. '
  + 'Ela sobe num banho mais demorado aqui, numa máquina meio vazia ali, numa lâmpada que ninguém apaga. '
  + 'Cada uma parece nada sozinha, e é exatamente por isso que ninguém mexe em nenhuma. '
  + 'No dia em que você vê o mês inteiro escrito num sítio só, aquilo deixa de ser azar e passa a ser escolha sua. '
  + 'E ainda tem a bandeira, que muda todo mês e que quase ninguém em casa sabe ler. '
  + `${BORDAO}`;

/**
 * A chamada-exemplo. ⚠️ FICA DE FORA da comparação anti-cópia, e é a mesma razão do
 * Short: este é o MOLDE que o próprio prompt manda usar. Puni-lo seria reprovar quem
 * obedece — a inversão exata do defeito crónico desta casa.
 */
export const EXEMPLO_DE_CHAMADA = 'Quer ver quanto a sua casa está levando por mês nessas coisas pequenas? '
  + 'Comenta FINMOOVI aqui embaixo que eu te mando o app de graça, e você faz essa conta em dois toques.';

/**
 * O TEXTO CONTRA O QUAL SE MEDE A CÓPIA. Repare no que fica DE FORA:
 *  · a chamada (o molde é ordenado pelo prompt);
 *  · o bordão (é obrigatório e vai à letra).
 * Sobra a ESCRITA — que é o que tem de ser original em cada vídeo.
 */
export const EXEMPLO_PARA_COMPARAR = [
  EXEMPLO_DE_ABERTURA.fala,
  ...PARTES_DO_CAPITULO.map((p) => EXEMPLO_DE_CAPITULO[p]),
  EXEMPLO_DE_DEMONSTRACAO,
  EXEMPLO_DE_FECHO.replace(BORDAO, ''),
  EXEMPLO_DE_MAPA.promessa,
  EXEMPLO_DE_MAPA.respostaDaPromessa,
  ...EXEMPLO_DE_MAPA.capitulos.map((c) => c.titulo),
].join(' ');

// ─── pedaços de prompt partilhados ───────────────────────────────────────────

const CABECALHO = `Você é ROTEIRISTA de um canal brasileiro de finanças pessoais.

🇧🇷 **ESCREVA EM PORTUGUÊS DO BRASIL FALADO, e só nele.** Quem assiste é brasileiro; um jeito de falar de Portugal soa estrangeiro e a pessoa sai.
   ✓ tela, celular, ônibus, gerente, "tá", "a gente", "você"
   ✗ ecrã, telemóvel, autocarro, "está a fazer", "tu"
   ⚠️ **"está a fazer" não existe no Brasil.** No Brasil é "está fazendo" — ou, melhor na fala, "tá fazendo".
   🔴 **TRATE SEMPRE POR "VOCÊ". NUNCA por "o senhor".** A persona diz que você explica a um senhor humilde — isso é quem você IMAGINA do outro lado, não a forma de o tratar. "O senhor sabe…" está proibido, e o computador confere.

════════ QUEM ESTÁ FALANDO, E COM QUEM ════════
${PERSONA}
Ele não sabe o que é "rotativo", "amortizar", "encargos" ou "estratégia". Se você usar uma palavra dessas, ele desliga.
${VICIOS_ESSENCIAIS}
${O_QUE_PRESERVAR}
⛔ **NADA DE FRASE DE CARTAZ.** O maior defeito deste canal é a frase que parece escrita para um slide e não dita por uma pessoa.
   ✗ "Três erros de cartão são pedras na sua mochila." (foi ao ar; o dono: *"isso está robótico"*)
   ✓ "Sabe esses três errinhos no cartão? É que nem carregar pedra na mochila."
   A imagem entra sempre COMPARADA ("é tipo", "parece", "é que nem"), nunca definida ("X são Y").`;

const REGRAS_DE_NUMERO = `════════ OS NÚMEROS — a regra mais dura deste canal ════════
⛔ **PROIBIDO citar percentagem ou taxa**, em algarismo ("13%") ou por extenso ("treze por cento"). Este vídeo não tem conta calculada por computador, e um número financeiro que ninguém conferiu é o defeito mais perigoso que existe aqui. O computador confere.
⛔ **PROIBIDO prometer rendimento** ("rende tanto", "o dinheiro trabalha e vira tanto"). Nada de juros, Selic, CDI, Tesouro ou poupança com valor colado.
✅ **PERMITIDO — e é isto que prende:** os números que o NARRADOR conta que somou, pagou ou viu na tela. Redondos, modestos, do dia a dia.
✅ **A SOMA TEM DE BATER.** Se você disser as parcelas, o total é a soma delas, sem arredondar para outro valor. O computador confere isso também.
✅ Números por extenso na fala ("quinhentos reais"), nunca símbolos nem algarismos.
⛔ **NÃO REBAIXE O DINHEIRO.** Cem reais NÃO é "moedinha", "trocadinho", "dinheirinho", "mixaria", "migalha" nem "centavos". Se o valor parece pequeno, diga que PARECE pequeno — mas chame-o pelo nome. Diminutivo tira o valor à coisa que o vídeo está a tentar valorizar, e o computador confere.`;

const REGRAS_DE_FALA = `════════ COMO A FALA FLUI ════════
- **PONTUAÇÃO É RESPIRAÇÃO, NÃO GRAMÁTICA.** Quem lê o texto é uma VOZ: ela PARA em cada vírgula e em cada ponto.
  ✗ "Dez anos de atraso, custam caro."   ✓ "Dez anos de atraso custam caro."
- ⛔ NUNCA use ponto e vírgula, dois-pontos, parênteses, travessões ou asteriscos. Ninguém FALA assim.
- Varie o fôlego: uma frase curta, uma mais longa, outra curta. Tudo do mesmo tamanho vira ladainha.
- **NÃO COLE DUAS IDEIAS SEM O ELO.** Sujeito e consequência precisam de um "que", "e" ou "porque" no meio.
  ✗ "Três erros de cartão tiram quinhentos reais por mês."   ✓ "Três erros de cartão QUE tiram quinhentos reais por mês."
- **LINGUAGEM CONCRETA.** O dinheiro sai de um LUGAR e de um BOLSO. Diga qual.
  ✗ "…que desaparecem todo mês."   ✓ "…que desaparecem DA SUA CONTA todo mês."
- Diga "vídeo", nunca "Short". Nunca diga "tchau", "até a próxima" nem "obrigado".
- 🔴 **NINGUÉM TEM NOME NESTE CANAL.** Nada de João, Maria, Carlos, Norberto, Célia.
  · Quem conta a história é **você, na primeira pessoa** — *"eu abri a fatura"*, *"eu fiquei olhando"*.
  · Quando precisar de outra pessoa, use o que ela É, nunca como se chama: *"o meu vizinho"*, *"a moça do caixa"*, *"o cara que trabalha comigo há trinta anos"*, *"o outro"*.
  · Quando comparar dois caminhos, compare **situações**, não pessoas com nome: *"quem paga só o mínimo"* contra *"quem separa antes"*.
  · ⚠️ Isto não é gosto: o canal é ANÓNIMO por decisão do dono. Um nome inventado faz o vídeo parecer um caso real que ninguém pode conferir. O computador confere.`;

/**
 * ═══ A ESPINHA NARRATIVA — a mudança que o dono pediu em 04/08/2026 ═══
 *
 * *"me parece que abre várias ideias no mesmo vídeo. Pensei em algo com 1 único
 * ensinamento, uma informação com storytelling."*
 *
 * ⚠️ E A PERSONAGEM É O NARRADOR, NA PRIMEIRA PESSOA. Decisão minha, a pedido dele,
 * e a razão é a credibilidade: inventar uma "Cláudia que ganha dois mil e quatrocentos
 * e devia mil e duzentos" é fabricar um caso de cliente que nunca existiu. Num canal
 * cuja única vantagem é ter validadores de VERDADE, isso é a versão narrativa de
 * inventar um número. O narrador contar o que ELE viveu é honesto (ele é a persona do
 * canal), já é o padrão aprovado do Short ("eu joguei no FinMoovi e ele me mostrou"),
 * e deixa só DUAS pessoas na cabeça de quem ouve: eu, que passei por isto, e você,
 * que está a passar. Uma terceira personagem obrigaria a segurar mais uma história.
 */
const OS_MOVIMENTOS = MOVIMENTOS
  .map((m, i) => `   **ATO ${i + 1} — ${m.nome}:** ${m.faz}\n      ⛔ Neste ato é proibido ${m.proibido}`)
  .join('\n');

const A_HISTORIA = `════════ A REGRA MAIOR DESTE VÍDEO: UMA HISTÓRIA SÓ ════════
Este vídeo conta **UMA história, de UMA pessoa, com UM número**. Os três capítulos não são três assuntos — são três **atos da mesma história**, e o mesmo dinheiro aparece nos três.

🎬 **E OS TRÊS ATOS SÃO ESTES, POR ESTA ORDEM. Não são três descrições da mesma cena:**
${OS_MOVIMENTOS}

🔴 **O ATO 2 É O CORAÇÃO DO VÍDEO.** É lá que está o **único ensinamento** — a coisa que a pessoa não sabia e que explica por que o problema continua mesmo quando ela se esforça. Se o ato 2 só voltar a mostrar o número que o ato 1 já mostrou, o vídeo dá voltas e quem vê sai. **Já aconteceu neste canal: o ato 1 e o ato 2 saíram com a mesma cena, o mesmo papel na mão e a mesma soma.**

👤 **QUEM VIVEU A HISTÓRIA É VOCÊ, O NARRADOR.** Fale na PRIMEIRA PESSOA: "eu abri", "eu somei", "eu levei um susto".
⛔ **NÃO invente uma terceira pessoa** com nome ("a Cláudia", "o Seu Antônio"). Só existem duas pessoas neste vídeo: **EU**, que passei por isto, e **VOCÊ**, que está a passar. Uma personagem inventada é um caso de cliente que nunca existiu, e este canal não faz isso.

🎭 **O QUE FAZ ISTO PRENDER — use, são honestas:**
· **A perda que está a acontecer AGORA**, não no futuro. "Enquanto você ouve isto, aquilo continua a sair."
· **A conta que ninguém fez.** O número que a pessoa tem e não sabe que tem.
· **A confissão.** Comece por admitir o seu próprio erro. Quem confessa não está a dar lição, e por isso ninguém se defende.
· **A objeção antecipada.** Diga em voz alta o que a pessoa está a pensar: "você vai dizer que não sobra nada. Eu sei. Eu também dizia."
· **O detalhe concreto e pequeno** — a margem do papel onde você somou, a caneta que falhou, a hora que estava no relógio. É o detalhe que faz acreditar, não o adjetivo.
· **A promessa com data.** "Em que mês isto acaba" vale mais do que "você vai melhorar".

⛔ **E O QUE ESTE CANAL NÃO FAZ, mesmo que dê clique:**
· o falso segredo ("o que os bancos não querem que você saiba") — é mentira e mata a credibilidade;
· o medo sem saída — assustar e não dar caminho é crueldade, e a pessoa sai;
· urgência ou escassez inventada ("só hoje", "poucas vagas") — não temos nada disso;
· número inventado para chocar — o computador confere e reprova.`;

const O_QUE_PODE_PROMETER = `════════ O QUE VOCÊ PODE OFERECER ════════
SOMENTE duas coisas, porque só estas existem: o **app FinMoovi (grátis)** e as **calculadoras do blog**.
⛔ É PROIBIDO oferecer planilha, ebook, PDF, apostila, curso, aula, checklist ou qualquer material que o canal não tem.`;

const menuDeImagens = (proibidas = []) => METAPHORS
  .filter((m) => m !== 'clique-link' && !proibidas.includes(m))
  .map((m) => `${m} (${METAPHOR_MEANINGS[m] || m})`)
  .join(' · ');

const contexto = (t) => `TEMA DO VÍDEO: "${t.term}"
${t.angle ? `ÂNGULO: ${t.angle}\n` : ''}${t.definition ? `DEFINIÇÃO: ${t.definition}\n` : ''}${t.body ? `MATERIAL DE APOIO (use os factos, NUNCA as percentagens que aparecem aqui):\n${cortar(t.body)}\n` : ''}`;

// ═══ ANDAR 0 — O MAPA ═══════════════════════════════════════════════════════

export function buildPromptMapa(t, proibidas = [], cenariosJaGastos = [], promessasAnteriores = [], elenco = null, funcaoDoApp = null) {
  /**
   * 🔴 A HISTÓRIA TEM DE SER OUTRA — 08/08 (as cenas) e 09/08/2026 (o resto).
   *
   * *"No vídeo passado foi falado de fatura do cartão, falado sobre num domingo, e
   * agora está se repetindo. Isso não pode acontecer num raio de uns 5 vídeos."*
   * E depois, mais forte: *"Force e deixe claro pra IA deixar tudo muito dinâmico com
   * imagens, metáforas, exemplos, histórias totalmente desconexas com as anteriores."*
   *
   * ⚠️ **DUAS LISTAS, E A SEGUNDA É A QUE MUDA O RESULTADO.** A das cenas diz o que
   * NÃO fazer — e sozinha ela só ensina o modelo a trocar a palavra "fatura" por
   * "boleto" e a escrever a mesma história com outro objeto. A das promessas diz o que
   * JÁ FOI CONTADO, e é contra ela que se pede uma história nova.
   *
   * ⚠️ **ISTO ENTRA COMO PEDIDO, NUNCA COMO TRAVA.** Uma trava que proíbe o que o
   * prompt pede produz oito tentativas falhadas seguidas — está registado nesta casa
   * vinte vezes. Ver [[prompt-versus-validador]]. Mede-se o resultado no caderno, e o
   * sítio de apertar é aqui, não no validador.
   */
  const linhas = [];
  linhas.push(`\n════════ 🔴 ESTE VÍDEO TEM DE SER OUTRO VÍDEO ════════
Este canal publica um vídeo longo por semana, e quem se inscreveu vê-os em fila.
**Dois vídeos com a mesma história por baixo fazem o canal parecer um só vídeo repetido** —
e é a queixa nº 1 do dono. Portanto, antes de escolher seja o que for:

· a HISTÓRIA é outra — outra pessoa, outro momento da vida, outro aperto;
· os EXEMPLOS são outros — outras compras, outras contas, outros valores;
· a METÁFORA é outra — e o objeto que a carrega também;
· o NÚMERO é outro — não repita o valor que já foi a espinha de outro vídeo.

⚠️ Não basta trocar as palavras. Trocar o nome do papel que está na mão e contar a mesma
coisa é repetir na mesma. **O que tem de mudar é a situação.**`);

  if (promessasAnteriores.length) {
    linhas.push(`\n════════ 📼 O QUE OS VÍDEOS ANTERIORES JÁ CONTARAM ════════
${promessasAnteriores.map((p, i) => `${i + 1}. "${p}"`).join('\n')}

A sua promessa tem de entregar uma coisa **diferente destas**. Se ela pudesse servir de
resumo de qualquer um dos vídeos acima, está errada — recomece.`);
  }

  if (cenariosJaGastos.length) {
    linhas.push(`\n════════ ⛔ CENAS JÁ GASTAS NOS ÚLTIMOS VÍDEOS ════════
Estas cenas saíram nos vídeos recentes deste canal e **não podem voltar**: ${cenariosJaGastos.join(' · ')}.
**Escolha outro momento da vida das pessoas.** O dinheiro aparece em todo o lado: a farmácia no fim do mês, o presente de aniversário, o conserto do chuveiro, a corrida de aplicativo que virou hábito, o almoço fora todo dia, a caixa de ferramentas comprada e nunca usada, o cachorro que adoeceu, a formatura do filho, o material escolar de janeiro, o pneu que furou, o casamento de um amigo, a máquina de lavar que parou.`);
  }

  /**
   * ═══ 🔴 QUEM VIVE A HISTÓRIA — 10/08/2026, e é uma ORDEM, não uma sugestão ═══
   *
   * Palavras do dono, ao ver o segundo vídeo seguido sobre dois homens: *"Sempre fala dos
   * dois homens, isso tem que ser dinâmico… poderia ser um homem, uma mulher, ou um homem
   * e uma mulher, ou poderia ser dois irmãos, poderia ser um avô, poderia um pai, uma
   * mãe, entendeu?"*
   *
   * ⚠️ **Vai ESCOLHIDO daqui, e não é pedido ao modelo que varie.** "Varie o elenco" é
   * uma sugestão, e uma sugestão perde para o exemplo — foi assim que o domingo sobreviveu
   * a uma proibição escrita (§ da 17ª ocorrência). Um nome concreto, escolhido por nós e
   * gravado no caderno, é a única forma de o vídeo seguinte poder proibi-lo.
   */
  if (elenco) {
    linhas.push(`\n════════ 👥 QUEM VIVE ESTA HISTÓRIA — JÁ ESTÁ DECIDIDO ════════
A história deste vídeo é de: **${elenco}**.

🔴 **Não é uma sugestão, é o elenco deste vídeo.** Escreva o mapa inteiro à volta desta
pessoa (ou destas pessoas). Não invente outra gente ao lado, e não troque por dois homens
nem por "duas pessoas" genéricas — o canal acabou de fazer isso e o dono reprovou.

⚠️ Continua a valer a regra de sempre: **ninguém tem nome**. Diga *"a minha mãe"*, *"o meu
irmão"*, *"eu"* — nunca "a Cláudia" nem "o Seu Antônio".`);
  }

  /**
   * ═══ 🔴 QUAL FUNÇÃO DO APP APARECE — 10/08/2026 ═══
   *
   * Palavras do dono: *"fala que jogou na calculadora do FinMoovi, igualzinho os
   * anteriores, o FinMoovi tem centenas de funcionalidades e o roteiro só ataca sobre
   * cartão??? já falei isso milhares de vezes"*.
   *
   * ⚠️ **A demonstração é UM ecrã, escolhido aqui**, gravado no caderno, e proibido nos
   * próximos seis vídeos. Sem isto o modelo caía sempre no cartão, porque o cartão é o
   * assunto mais óbvio de finanças — e era esse o defeito.
   */
  if (funcaoDoApp) {
    linhas.push(`\n════════ 📱 A FUNÇÃO DO APP QUE ESTE VÍDEO MOSTRA — JÁ ESTÁ DECIDIDA ════════
Na demonstração, o FinMoovi aparece por **${funcaoDoApp.nome}** — ${funcaoDoApp.oQueFaz}.

🔴 **É esta e não outra.** O capítulo da demonstração tem de ser desenhado para que ela
faça sentido ali: a história tem de CHEGAR a um ponto em que esta tela é a resposta.
⛔ **Não fale de fatura de cartão nem de "jogar na calculadora"** a não ser que seja
exactamente esta a função escolhida. Os vídeos anteriores já fizeram isso e o dono
reprovou: *"o FinMoovi tem centenas de funcionalidades e o roteiro só ataca sobre cartão"*.`);
  }

  return buildPromptMapaBase(t, proibidas, `${linhas.join('\n')}\n`);
}

function buildPromptMapaBase(t, proibidas = [], blocoDeCenarios = '') {
  const ex = EXEMPLO_DE_MAPA;
  return `${CABECALHO}

SUA TAREFA AGORA: **desenhar o MAPA de um vídeo de seis minutos.** Nenhuma linha do guião ainda — só o desenho.

${contexto(t)}
════════ A FORMA, QUE VEIO DE VÍDEOS REAIS ════════
Nós medimos 64 capítulos de sete vídeos longos de finanças brasileiros. O que ficou provado:
· quem prende NOMEIA a promessa logo no início; quem não prende chama ao primeiro capítulo "Introdução";
· cada capítulo dos bons entrega UMA coisa e o título já diz qual;
· os fechos bons deixam uma ponta no ar, não uma despedida.
Para seis minutos são **${NUM_CAPITULOS} capítulos**, e não mais.

${A_HISTORIA}
${blocoDeCenarios}
════════ O QUE VOCÊ TEM DE DECIDIR ════════
1. **A PROMESSA** — uma frase só, entre 5 e 25 palavras, dizendo o que a pessoa leva daqui. NÃO é pergunta. É o que o vídeo ENTREGA.
2. 🔴 **O NÚMERO-ESPINHA** (\`numeroEspinha\`) — **UM número de dinheiro para o vídeo INTEIRO**. É o número da história, e os três atos são obrigados a dizê-lo. O computador confere nos três.
3. 🔴 **A LISTA DE VALORES** (\`valores\`) — **TODO o dinheiro que este vídeo pode dizer**, cada um com um nome do dia a dia. Nada fora desta lista pode ser falado em nenhum capítulo, e o computador confere. O número-espinha é um destes valores.
   · **somas** (quando houver) — que valores somam para dar qual. **A conta tem de bater exatamente.** É o narrador a somar à frente de quem ouve.
     🔴 **A FORMA É OBRIGATÓRIA, e o computador reprova quem a der pela metade:** cada soma precisa de **DOIS OU MAIS** nomes em \`de\` e **UM** nome em \`da\`, e os três têm de estar escritos **exatamente como estão na lista de valores**.
     ✅ **Se a história não tiver nenhuma conta que bata, escreva \`"somas": []\`.** Uma lista vazia é resposta certa; uma soma com um nome só é reprovada.
4. 🧮 **contaDoCartao** — o NOME (da lista de valores) da conta que é uma **fatura de cartão de crédito**. Se a história não tiver nenhuma, escreva null.
   ⚠️ **Isto não é um detalhe.** É sobre essa conta, e só sobre ela, que o computador calcula os juros REAIS do cartão com as taxas do Banco Central. Apontar o dinheiro devido a um amigo como se fosse cartão seria dizer que o amigo cobra juros de banco.
   💡 **A história fica muito mais forte se uma das contas for do cartão** — é aí que estão os juros que ninguém entende, e é isso que o ato 2 vai poder ensinar.
5. **capituloDaDemonstracao** — 1, 2 ou 3. **O app aparece num capítulo SÓ**, com peso. Nos outros o nome dele nem é dito. (O costume dos vídeos que prendem: mostrar o problema antes da ferramenta.)
6. **${NUM_CAPITULOS} CAPÍTULOS**, e são três ATOS da mesma história:
   · **titulo** — no máximo ${MAX_PALAVRAS_TITULO} palavras, e ele PROMETE o que o ato entrega. ⛔ Proibido "Introdução", "Conclusão", "Parte 1", "Resumo".
   · **oQueAcrescenta** — o facto NOVO que este ato traz sobre o MESMO dinheiro. Se um ato não acrescenta nada, o vídeo dá voltas.
   · **oQueFicaEmAberto** — a ponta que este ato deixa no ar para o seguinte agarrar.
7. **respostaDaPromessa** — a lição do fim, que responde ao que a promessa prometeu. Tem de falar da MESMA coisa.
8. **lacoAberto** — a provocação final, DENTRO deste tema. ⛔ Proibido prometer "no próximo vídeo" ou "semana que vem": não há fila de vídeos, e prometer o que não existe é mentira.
9. **fioCondutor** — a imagem da capa, uma destas: ${menuDeImagens(proibidas)}.

⛔ **O ERRO QUE MATOU O PRIMEIRO VÍDEO DESTE CANAL, para não o repetir:** os três capítulos tinham números diferentes e acabaram a contar histórias de **três pessoas diferentes** — no primeiro a dívida eram quatrocentos e cinquenta, no segundo mil duzentos e oitenta, no terceiro trezentos. Quem via sentia que o vídeo dava voltas. É por isso que agora há um número só.

${REGRAS_DE_NUMERO}

════════ UM MAPA INTEIRO, PARA VOCÊ VER A FORMA ════════
🔥 **O assunto deste exemplo — assinaturas esquecidas — é de OUTRO vídeo de propósito.** Copie a FORMA, nunca as palavras: se você repetir seis palavras seguidas de qualquer coisa aqui, o mapa é rejeitado, e o computador confere.

${JSON.stringify(ex, null, 2)}

Repare no que este exemplo faz: **UM número (cento e oitenta e nove) atravessa os três atos**; a lista de valores fecha tudo o que se pode dizer em dinheiro; a soma bate certo; cada ato acrescenta uma coisa nova sobre o MESMO dinheiro (de onde vem · há quanto tempo · o que sai hoje); o app tem um ato só; e o fim responde à promessa falando da mesma coisa.

Responda APENAS com JSON válido, sem markdown, exatamente com estes campos:
{
  "promessa": "...",
  "fioCondutor": "...",
  "numeroEspinha": 0,
  "valores": [ { "nome": "...", "valor": 0 } ],
  "somas": [ { "de": ["...", "..."], "da": "..." } ],
  "contaDoCartao": "...",
  "capituloDaDemonstracao": 2,
  "capitulos": [
    { "titulo": "...", "oQueAcrescenta": "...", "oQueFicaEmAberto": "..." },
    { "titulo": "...", "oQueAcrescenta": "...", "oQueFicaEmAberto": "..." },
    { "titulo": "...", "oQueAcrescenta": "...", "oQueFicaEmAberto": "..." }
  ],
  "respostaDaPromessa": "...",
  "lacoAberto": "..."
}`;
}

// ═══ ANDAR 1 — OS BLOCOS, UM DE CADA VEZ ════════════════════════════════════

/**
 * A ÂNCORA. É o coração deste ficheiro: o que o bloco anterior deixou, escrito à
 * letra, mais aquilo que já foi gasto e não pode voltar. Sem isto, cada chamada
 * escreve um vídeo diferente do anterior e ninguém percebe o resultado.
 */
function blocoDaAncora({ paragrafoAnterior, deQuem, numerosUsados, comparacoesUsadas, jaDito }) {
  const partes = [];
  if (paragrafoAnterior) {
    partes.push(`════════ A ÂNCORA — O QUE ACABOU DE SER DITO ════════
Estas são as palavras EXATAS com que ${deQuem} terminou. A sua primeira frase tem de agarrar isto, como quem continua a mesma conversa:

  "${paragrafoAnterior}"

⛔ **RETOMAR NÃO É ECOAR.** Não abra repetindo a última palavra como pergunta solta.
   ✗ "…faz a dívida crescer." → "Crescer assim? No FinMoovi…"
   ✓ "…faz a dívida crescer." → "E é aí que ela cresce sem você ver…"
Toda abertura é uma FRASE INTEIRA, com sujeito e verbo.`);
  }
  if (numerosUsados && numerosUsados.length) {
    partes.push(`⛔ **NÚMEROS JÁ GASTOS neste vídeo — não os repita:** ${numerosUsados.join(', ')}.`);
  }
  if (comparacoesUsadas && comparacoesUsadas.length) {
    partes.push(`⛔ **COMPARAÇÕES JÁ GASTAS neste vídeo — não volte a elas:** ${comparacoesUsadas.join(' · ')}.`);
  }
  if (jaDito && jaDito.length) {
    partes.push(`⛔ **JÁ FOI DITO neste vídeo (não repita nem parafraseie):**\n${jaDito.map((f) => `   · "${f}"`).join('\n')}`);
  }
  return partes.join('\n\n');
}

export function buildPromptAbertura(t, mapa, proibidas = []) {
  return `${CABECALHO}

SUA TAREFA AGORA: escrever **SÓ A ABERTURA** de um vídeo de seis minutos. Nem os capítulos, nem o fim. Só os primeiros trinta e cinco segundos.

${contexto(t)}
════════ O MAPA JÁ DECIDIDO (não o discuta, cumpra-o) ════════
A PROMESSA DESTE VÍDEO: "${mapa.promessa}"
Os capítulos que vêm a seguir: ${mapa.capitulos.map((c, i) => `${i + 1}) ${c.titulo}`).join(' · ')}

════════ O QUE A ABERTURA TEM DE FAZER, POR ESTA ORDEM ════════
1. 🔴 **A 1ª FRASE É A CAPA e aparece ESCRITA na tela enquanto você a diz.** No máximo ${MAX_PALAVRAS_CAPA} palavras. O computador confere o tamanho.
   · **Pode ser uma cena ou pode ser uma pergunta — o que ela NÃO pode ser é comprida e vaga.** Uma pergunta de dezoito palavras cheia de "de que forma" e "considerando que" não prende ninguém.
   · **Comece pelo que se VÊ.** ✓ *"O ônibus das cinco da manhã, outra vez."* ✓ *"A conta de luz chegou de novo no dia dez."* ✓ *"Por que o dinheiro some antes do dia vinte?"*
   · ⛔ **Ninguém pode ser "um deles", "ele", "os dois" nesta frase.** Diga QUEM são antes de dizer o que fazem. Um vídeo que começa a apontar para quem ainda não existe começou no meio, e quem está vendo sai. O computador confere.
2. **A PERGUNTA EXISTE, e é CURTA.** Pode ser a 1ª frase ou vir logo a seguir. ✗ "Você sabia?" (serve para qualquer vídeo do mundo) — a dor tem de estar DENTRO dela.
3. **A RESPOSTA VEM COLADA, na frase seguinte.** Pergunta pendurada é proibida neste canal. E a resposta não repete a pergunta — responde direto, seco.
4. **A PROMESSA DITA COM TODAS AS LETRAS**, ainda dentro da abertura.

════════ 🔴 COMO SE FALA NESTE CANAL — leia isto duas vezes ════════
Ordem do dono, 08/08/2026: *"eu quero que o texto seja mais leve, mais simples, mais do dia a dia, coisas assim"*.

· **TUDO O QUE VOCÊ DISSER TEM DE DAR PARA VER.** Se não dá para filmar, está abstrato demais.
  ✓ *o papel em cima da mesa* · *a mensagem do banco às sete da manhã* · *o cafezinho de todo dia* · *a fila da farmácia* · *o troco que some no bolso*
  ✗ *os gastos* · *as despesas* · *a situação financeira* · *o planejamento* · *os recursos* · *a gestão do orçamento*
· **FRASES CURTAS.** Uma ideia por frase. Se precisou de vírgula três vezes, são três frases.
· **FALE COMO SE FALA NA COZINHA**, não como se escreve num banco. Diga *"o dinheiro some"*, não *"há uma evasão de recursos"*.
· **NÚMEROS REDONDOS E DO TAMANHO DA VIDA DAS PESSOAS.** Trezentos reais é dinheiro; "um percentual relevante do orçamento" não é nada.
· ⛔ **Nada de palavra de reunião**: otimizar, mitigar, alavancar, estratégico, mindset, jornada, conscientização.
⛔ **A ABERTURA NÃO GASTA OS NÚMEROS DA HISTÓRIA.** As parcelas e a soma são a DESCOBERTA do ato 1 — dizê-las aqui deixa o ato 1 sem susto nenhum. Na abertura cabem o problema, a dor e a promessa; os valores ficam para lá. É o que os vídeos longos que prendem fazem, e os que não prendem não fazem. Diga o que a pessoa vai levar daqui.
⛔ Não peça NADA (comentário, inscrição, curtir, link). Isso acontece uma vez só, muito mais à frente.
⛔ Não diga o bordão do canal. Ele é a assinatura e vive na última frase do vídeo.
⛔ Não diga "Introdução", nem "hoje vamos falar sobre", nem "sem mais delongas".

⚠️ **TAMANHO: entre ${ORCAMENTO.abertura.min} e ${ORCAMENTO.abertura.max} palavras.** Conte antes de responder. É por aqui que este roteiro mais falha.

${REGRAS_DE_NUMERO}

${REGRAS_DE_FALA}

════════ UMA ABERTURA INTEIRA, PARA VER A FORMA ════════
🔥 **O assunto — conta de luz — é de OUTRO vídeo de propósito.** Copie a FORMA e o TOM. **Se repetir SEIS PALAVRAS SEGUIDAS deste exemplo, a abertura é rejeitada** — o computador confere.

  "${EXEMPLO_DE_ABERTURA.fala}"

Repare, por esta ordem: **abre por uma CENA** (o dia dez, a caixa do correio) · só depois vem a pergunta, e ela é CURTA · a resposta vem colada · cada coisa tem nome (o chuveiro, a máquina de lavar meio vazia, a lâmpada da área) · a promessa está lá, dita · e ninguém pede nada a ninguém.

⚠️ **E repare no que ele NÃO faz:** não abre com "você sabia", não abre a apontar para "um deles", e não diz uma única palavra abstracta como "gastos" ou "despesas". Tudo o que ele diz, dá para ver.

Responda APENAS com JSON válido, sem markdown:
{ "fala": "..." }`;
}

export function buildPromptCapitulo(t, mapa, indice, ancora) {
  const plano = mapa.capitulos[indice];
  const ficha = mapa.fichaDeDivida || null;
  const seguinte = mapa.capitulos[indice + 1];
  const temDemo = Number(mapa.capituloDaDemonstracao) === indice + 1;
  const valores = (mapa.valores || []).map((v) => `${v.valor} (${v.nome})`).join(' · ');
  const somas = (mapa.somas || [])
    .map((s) => `${s.de.join(' + ')} = ${s.da}`)
    .join(' · ');

  const blocoDaDemo = temDemo
    ? `3. **demonstracao** (~25s) — 🔴 **É NESTE ATO, E SÓ NESTE, QUE O APP APARECE.**
   Você conta na PRIMEIRA PESSOA o que aconteceu quando pôs aquilo no FinMoovi. O app é quem AGE, não é rodapé.
   **DIGA O QUE APARECEU NA TELA** — o nome da linha, o total escrito, a coisa concreta. Frases como "me mostrou o estrago" não mostram nada.
   ✓ Bom: mostrar uma coisa que a pessoa **não tinha pedido** e que o app revelou sozinho. É isso que faz querer abrir o app.
   ⛔ Não repita o número-espinha como se fosse novidade — ele já foi dito. Aqui ele aparece **na tela**, e é isso que muda.`
    : `⛔ **O APP NÃO APARECE NESTE ATO.** A demonstração é do capítulo ${mapa.capituloDaDemonstracao}, e **é proibido escrever a palavra FinMoovi aqui** — o computador confere.
   Foi ouvir "eu joguei no FinMoovi" três vezes que fez o dono reprovar o primeiro vídeo deste canal. O produto tem um momento, e não é este.`;

  return `${CABECALHO}

SUA TAREFA AGORA: escrever **SÓ O ATO ${indice + 1} de ${NUM_CAPITULOS}** de um vídeo de seis minutos. Nem o que veio antes, nem o que vem depois.

${contexto(t)}
${A_HISTORIA}

════════ O MAPA JÁ DECIDIDO (não o discuta, cumpra-o) ════════
A PROMESSA DO VÍDEO: "${mapa.promessa}"
**ESTE ato chama-se: "${plano.titulo}"**
   · 🔴 **O NÚMERO DESTE VÍDEO É ${mapa.numeroEspinha}, e ele TEM de ser dito neste ato**, por extenso. É o mesmo número dos outros dois atos — é isso que faz o vídeo ter uma ideia só. O computador confere.
   · 🔴 **TODO o dinheiro que você pode dizer é este, e mais nenhum:** ${valores}.
     Um valor que não esteja nesta lista é de outra história, e o computador reprova.${somas ? `\n   · **A conta que tem de bater:** ${somas}. Se disser as parcelas, diga o total, para quem ouve somar junto.` : ''}
   · **ESTE é o ATO ${indice + 1} — ${MOVIMENTOS[indice].nome}:** ${MOVIMENTOS[indice].faz}
     ⛔ **Aqui é PROIBIDO ${MOVIMENTOS[indice].proibido}**
   · **O que ESTE ato acrescenta à história:** ${plano.oQueAcrescenta}${ficha && indice === 1 ? `

🧮 ════════ A CONTA JÁ ESTÁ FEITA — E É ESTE O ENSINAMENTO DO VÍDEO ════════
Estes números foram calculados por computador com as taxas REAIS do Banco Central. **Não refaça nenhuma conta, não arredonde para outro valor, não invente um número melhor.**

${ficha.texto}

🔴 **É ISTO que o ato da ARMADILHA tem de ensinar**, contado como história, na primeira pessoa: o que acontece a quem paga só o mínimo da fatura. Escolha os números que fazem doer e diga-os por extenso — **não despeje a tabela toda**, que ninguém guarda cinco valores de cabeça. Dois ou três chegam, e o mais forte costuma ser **quanto se paga a mais no fim**.
⛔ **NÃO diga percentagens nem taxas.** O que a pessoa entende é o REAL, não o "por cento". Diga "de mil e vinte viraram mil cento e oitenta e três num mês", nunca "dezasseis por cento ao mês".
⛔ **NÃO diga que a dívida rola para sempre no rotativo.** Não rola: desde 2017 o banco é OBRIGADO a parcelar depois de um mês, e é isso que a conta acima já leva em conta. Assustar com uma coisa que a lei proíbe é perder a credibilidade de vez.` : ''}${indice > 0 ? `
   · ⛔ **O ato anterior JÁ ENTREGOU isto, e não se repete:** ${mapa.capitulos[indice - 1].oQueAcrescenta}` : ''}
   · **E deixa no ar:** ${plano.oQueFicaEmAberto}
${seguinte ? `O ato seguinte chama-se "${seguinte.titulo}" — o seu re-gancho aponta para lá SEM dizer o nome dele.` : 'Este é o último ato. O re-gancho entrega a conversa ao fim do vídeo.'}

${ancora ? `${ancora}\n` : ''}
════════ AS PARTES DESTE ATO ════════
1. **pergunta** (~4s) — abre com uma PERGUNTA que dói, terminada em "?", e responde-lhe já na frase seguinte.
2. **desenvolvimento** (~50s) — a história a andar, na primeira pessoa, com detalhes concretos e pequenos. É AQUI que o dinheiro deste vídeo aparece e **ganha um sentido novo**. Termine na tensão, não conforte.
${blocoDaDemo}
${temDemo ? '4' : '3'}. **regancho** (~10s) — deixa a ponta no ar para o ato seguinte. Uma ou duas frases, sem prometer nada de fora deste vídeo.

⚠️ **TAMANHO: tudo somado, entre ${(temDemo ? ORCAMENTO.capituloComDemo : ORCAMENTO.capitulo).min} e ${(temDemo ? ORCAMENTO.capituloComDemo : ORCAMENTO.capitulo).max} palavras.** Conte antes de responder.
⛔ **NÃO PEÇA NADA** — nem comentário, nem inscrição, nem curtir, nem link. Isso acontece UMA vez no vídeo, e não é aqui.
⛔ **NÃO DIGA O BORDÃO DO CANAL.** Ele é a assinatura e vive só na última frase do vídeo.
⛔ **NÃO USE O MOLDE "não é A, é B".** É a marca da escrita de robô. Diga só o B.
⛔ Metáfora quase não existe neste canal. No máximo UMA comparação no ato inteiro, com coisa que a pessoa já conhece, sempre comparada ("é tipo", "é que nem"), nunca definida.

${REGRAS_DE_NUMERO}

${REGRAS_DE_FALA}

${O_QUE_PODE_PROMETER}

════════ UM ATO INTEIRO, PARA VER A FORMA ════════
🔥 **O assunto — assinaturas esquecidas — é de OUTRO vídeo de propósito, e este é o ato 1 do mapa-exemplo.** Copie a FORMA e o TOM. **Se repetir SEIS PALAVRAS SEGUIDAS deste exemplo, o ato é rejeitado** — o computador confere.

[PERGUNTA] ${EXEMPLO_DE_CAPITULO.pergunta}

[DESENVOLVIMENTO] ${EXEMPLO_DE_CAPITULO.desenvolvimento}

[REGANCHO] ${EXEMPLO_DE_CAPITULO.regancho}
${temDemo ? `
E assim é a demonstração, quando chega a vez dela (é o ato 2 do mesmo exemplo):

[DEMONSTRACAO] ${EXEMPLO_DE_DEMONSTRACAO}
` : ''}
Repare: quem fala é o narrador, contando o que VIVEU · o detalhe é pequeno e concreto (a margem do papel, a soma feita à mão) · as parcelas são ditas uma a uma e o total bate · e o re-gancho deixa uma pergunta feia no ar, sem prometer nada de fora.

Responda APENAS com JSON válido, sem markdown:
{ "pergunta": "...", "desenvolvimento": "...", ${temDemo ? '"demonstracao": "...", ' : ''}"regancho": "..." }`;
}

export function buildPromptChamada(t, mapa, ancora) {
  return `${CABECALHO}

SUA TAREFA AGORA: escrever **SÓ A CHAMADA** — o recado rápido, de dez segundos, que aparece UMA única vez no vídeo inteiro, logo antes do fim.

${contexto(t)}
A PROMESSA DO VÍDEO: "${mapa.promessa}"

${ancora ? `${ancora}\n` : ''}
════════ O QUE A CHAMADA TEM DE FAZER ════════
A pessoa acabou de ver um número que a assustou — e ela quer o DELA. Isso é tudo.
· Pergunte se ela quer ver o número dela.
· Peça o COMENTÁRIO com a palavra FINMOOVI, prometendo o que você manda em troca.
· Molde a adaptar: "quer ver o SEU? comenta FINMOOVI aqui que eu te mando."
⛔ Não conte história nova. Não repita nada do que já foi dito. Não diga o bordão do canal.
⛔ Não mande clicar em link: a chamada provada deste canal é o comentário.
⚠️ **TAMANHO: entre ${ORCAMENTO.chamada.min} e ${ORCAMENTO.chamada.max} palavras.** É um recado, não um capítulo.

${O_QUE_PODE_PROMETER}

════════ O MOLDE (este pode e deve ser adaptado) ════════
  "${EXEMPLO_DE_CHAMADA}"

Responda APENAS com JSON válido, sem markdown:
{ "fala": "..." }`;
}

export function buildPromptFecho(t, mapa, ancora) {
  return `${CABECALHO}

SUA TAREFA AGORA: escrever **SÓ O FIM** do vídeo — os últimos quarenta segundos.

${contexto(t)}
════════ O MAPA JÁ DECIDIDO (não o discuta, cumpra-o) ════════
A ABERTURA PROMETEU ISTO: "${mapa.promessa}"
E A RESPOSTA É ESTA: "${mapa.respostaDaPromessa}"
${mapa.lacoAberto ? `A PONTA QUE FICA NO AR: ${mapa.lacoAberto}` : ''}

${ancora ? `${ancora}\n` : ''}
════════ O QUE O FIM TEM DE FAZER, POR ESTA ORDEM ════════
1. **RESPONDER, com todas as letras, ao que a abertura prometeu.** É a lição do vídeo, curta e dura, do tipo que se repete a um amigo. Tem de falar da MESMA coisa que foi prometida — o computador confere.
2. **DEIXAR UMA PONTA NO AR**, dentro deste mesmo tema. Uma coisa que ficou por dizer e que dá vontade de saber.
3. **ASSINAR.** A ÚLTIMA frase do vídeo é o bordão do canal, à letra, sem mudar uma palavra: "${BORDAO}"

⛔ **O FIM NÃO CITA FONTE NENHUMA.** Nada de app, FinMoovi, blog, comentário, link, canal ou inscrição. O app teve os três capítulos, o pedido teve a chamada. Aqui só cabe a resposta e a assinatura. O computador confere.
⛔ **NÃO TERMINE COM OUTRA PERGUNTA.** O fim é quem responde.
⛔ **NÃO PROMETA UM PRÓXIMO VÍDEO** ("no próximo", "semana que vem"). Não há fila travada, e prometer o que não existe é mentira.
⛔ Sem "tchau", sem "até a próxima", sem "obrigado".
⚠️ **TAMANHO: entre ${ORCAMENTO.fecho.min} e ${ORCAMENTO.fecho.max} palavras**, bordão incluído.

${REGRAS_DE_NUMERO}

${REGRAS_DE_FALA}

════════ UM FIM INTEIRO, PARA VER A FORMA ════════
🔥 **O assunto — conta de luz — é de OUTRO vídeo de propósito.** **Se repetir SEIS PALAVRAS SEGUIDAS deste exemplo, o fim é rejeitado.** (O bordão está fora dessa conta: ele é obrigatório e vai à letra.)

  "${EXEMPLO_DE_FECHO}"

Repare: responde ao que tinha sido prometido · deixa uma ponta no ar dentro do mesmo assunto · e assina, sem citar nada.

Responda APENAS com JSON válido, sem markdown:
{ "fala": "..." }`;
}

// ═══ ANDAR 2 — AS COSTURAS ══════════════════════════════════════════════════

/**
 * A COSTURA LÊ SÓ AS JUNÇÕES, e é de propósito.
 * Dar-lhe o vídeo inteiro seria convidá-lo a reescrever tudo — a reescrita total é o
 * pêndulo que já nos custou dias (§ do corretivo cirúrgico). Ele vê as duas frases
 * finais de um bloco e as duas iniciais do seguinte, e só pode mexer na PRIMEIRA
 * frase do bloco de baixo. É o mínimo que conserta uma ponte partida.
 */
export function buildPromptCosturas(juncoes) {
  const lista = juncoes.map((j, i) => `${i + 1}. EMENDA entre ${j.de} e ${j.para}
   ACABA ASSIM:   "${j.fim}"
   COMEÇA ASSIM:  "${j.inicio}"`).join('\n\n');

  return `Você é o EDITOR de um canal brasileiro de finanças. O vídeo já está escrito. O seu trabalho é UM só: olhar as EMENDAS entre os blocos e ver se a conversa continua.

QUEM FALA, E COM QUEM: ${PERSONA}

════════ AS EMENDAS ════════
${lista}

════════ O QUE VOCÊ FAZ ════════
Em cada emenda, leia as duas em voz alta, seguidas. Depois pergunte: **quem ouve consegue perguntar "espera, de onde veio isso?"**
· Se a conversa continua → deixe como está. Devolva a frase inicial EXATAMENTE igual.
· Se há um salto de assunto → reescreva **SÓ A PRIMEIRA FRASE do bloco de baixo**, de forma a agarrar o que ficou em cima.

⛔ **MEXA SÓ NA FRASE INICIAL.** A frase de cima não se toca. O resto do vídeo não se toca.
⛔ **RETOMAR NÃO É ECOAR.** Não abra repetindo a última palavra da frase de cima como pergunta solta.
   ✗ "…faz a dívida crescer." → "Crescer assim?"
   ✓ "…faz a dívida crescer." → "E é aí que ela cresce sem você ver."
⛔ Não invente factos nem números. Não acrescente nem tire nada além dessa frase.
⛔ Se a frase inicial for uma PERGUNTA terminada em "?", a sua versão TEM de continuar a ser uma pergunta terminada em "?" — é a forma que abre todos os capítulos deste canal.
⛔ Mantenha o tamanho parecido: no máximo mais três palavras que a original.

Responda APENAS com JSON válido, sem markdown, com uma entrada por emenda, na mesma ordem:
{ "emendas": [ { "inicio": "<a frase inicial, igual ou reescrita>" } ] }`;
}

// ─── a máquina de gerar um bloco, com corretivo ──────────────────────────────

/**
 * 🔴 O PRIMEIRO `{` DO TEXTO NEM SEMPRE É O DO JSON — medido em 08/08/2026.
 *
 * O capítulo 2 reprovava por "JSON inválido" e a resposta do modelo estava PERFEITA.
 * O que ele devolvia era isto:
 *
 *     :::writing{variant="document" id="58321"}
 *     { "pergunta": "Você paga todo mês e sente que o dinheiro some?", ... }
 *
 * O modelo embrulha a resposta numa directiva de markdown, e o primeiro `{` do texto
 * é o `{variant="document" id="58321"}` — que não é JSON. `JSON.parse` rebentava na
 * posição 1, a tentativa era queimada, e nada no log dizia porquê.
 *
 * Custou DUAS das cinco tentativas do bloco, numa corrida em que a diferença para
 * passar foram doze palavras.
 *
 * Agora tenta-se a partir de CADA `{` até o texto abrir. É barato (um punhado de
 * tentativas de leitura) e apanha de uma vez toda a família do defeito: a directiva,
 * a frase de cortesia antes do JSON, o rótulo, o que o modelo invente a seguir.
 */
function extrairJson(texto) {
  let s = String(texto).trim();
  const cerca = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (cerca) s = cerca[1].trim();
  const b = s.lastIndexOf('}');
  if (b === -1 || s.indexOf('{') === -1) throw new Error('nenhum JSON na resposta do modelo');

  let ultimoErro = null;
  for (let a = s.indexOf('{'); a !== -1 && a < b; a = s.indexOf('{', a + 1)) {
    try {
      return JSON.parse(s.slice(a, b + 1));
    } catch (err) {
      ultimoErro = err;
    }
  }
  throw new Error(`nenhum dos blocos {...} da resposta é JSON válido (${ultimoErro ? ultimoErro.message : 'sem detalhe'})`);
}

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * O CORRETIVO NÃO PODE CARREGAR ORDENS QUE SE CONTRADIZEM.
 * Está medido no Short: quando a queixa "longa demais" e a queixa "curta demais" se
 * acumulam, não há como acertar e o gerador esgota as tentativas a oscilar. O tamanho
 * é a única exigência com DOIS LADOS, e por isso é a única que se SUBSTITUI em vez de
 * se somar. O resto acumula — lá, esquecer uma queixa é deixá-la voltar.
 *
 * ⚠️ Aqui a expressão é OUTRA (a do Short procura "narração curta/longa demais", e as
 * mensagens deste ficheiro falam de "orçamento deste bloco"). Reutilizar a função do
 * Short teria sido pior do que copiar a ideia: ela não reconheceria as nossas queixas
 * de tamanho e o pêndulo voltava, em silêncio.
 */
const SOBRE_TAMANHO = /palavras — o orçamento/;

function acumular(exigencias, novos) {
  const novas = novos.map((e) => `- ${e}`);
  if (novas.some((e) => SOBRE_TAMANHO.test(e))) {
    for (let k = exigencias.length - 1; k >= 0; k--) {
      if (SOBRE_TAMANHO.test(exigencias[k])) exigencias.splice(k, 1);
    }
  }
  exigencias.push(...novas);
  const unicas = [...new Set(exigencias)];
  exigencias.length = 0;
  exigencias.push(...unicas);
  return unicas;
}

/**
 * Gera UM bloco: pede, limpa mecanicamente, valida, e se reprovar volta a pedir com a
 * queixa em cima. A limpeza corre ANTES da validação de propósito — o que o código
 * sabe consertar (algarismos, travessões, dois-pontos) nunca pode custar uma tentativa.
 */
async function gerarBloco({ nome, prompt, validar, tema, tentativas = 5, campos = ['fala'] }) {
  const exigencias = [];
  let corretivo = '';
  let ultimo = null;
  // 🔴 A MENOS MÁ guarda-se — 09/08/2026. Ver a nota do socorro, no fim desta função.
  let melhor = null;

  for (let i = 1; i <= tentativas; i++) {
    if (i > 1) await dormir(8000);
    const texto = corretivo ? `${prompt}\n\n${corretivo}` : prompt;
    // `pago: 'escritor'` = gpt-5-2 pelo kie.ai, com os gratuitos como rede por baixo.
    // O modelo BARATO escreve os blocos; o caro só relê (§26.3 L3 — com texto dez
    // vezes maior, isso deixa de ser elegância e passa a ser orçamento).
    const bruto = await generateText(texto, { maxTokens: 3000, temperature: 0.75, pago: 'escritor' });

    let obj;
    try {
      obj = extrairJson(bruto);
    } catch (err) {
      corretivo = montarCorretivo(acumular(exigencias, [`devolva JSON válido (${err.message})`]));
      // ⚠️ O MOTIVO VAI PARA O LOG, e isto custou uma corrida a descobrir. Em 08/08 o
      // capítulo 2 reprovou 4 vezes em 5 com a linha "JSON inválido" e mais nada — sem
      // o motivo, não há como saber se a resposta veio cortada, veio com aspas por
      // escapar ou veio em prosa. Um aviso que esconde a causa não é um aviso.
      console.log(`  ⚠ ${nome} — tentativa ${i}/${tentativas}: JSON inválido — ${err.message}`);
      console.log(`     começo da resposta: ${JSON.stringify(String(bruto).trim().slice(0, 140))}`);
      continue;
    }

    for (const c of campos) {
      if (typeof obj[c] === 'string') obj[c] = limparFala(obj[c], tema);
    }

    const v = validar(obj);
    ultimo = { obj, v };
    if (v.ok) return { ...obj, _avisos: v.avisos || [], _tentativa: i, _palavras: v.palavras };

    if (!melhor || v.erros.length < melhor.v.erros.length) melhor = { obj, v, tentativa: i };
    corretivo = montarCorretivo(acumular(exigencias, v.erros));
    console.log(`  ⚠ ${nome} — tentativa ${i}/${tentativas} reprovada: ${v.erros.join(' | ')}`);
  }

  /**
   * ⛑️ O SOCORRO — 09/08/2026, ordem do dono: *"nunca parar e não gerar o vídeo"*.
   *
   * A 1ª versão lançava um erro aqui e a corrida morria. Em 08/08 isso aconteceu duas
   * vezes no mesmo dia: uma por um capítulo com 336 palavras quando o teto eram 285
   * (cinquenta e uma palavras a mais custaram o vídeo do domingo inteiro), outra pelo
   * mapa. Nenhum dos dois motivos justifica um canal sem vídeo.
   *
   * ⚠️ **O QUE SE CONSERTA AQUI É SÓ O QUE TEM TROCA EXACTA.** Um bloco é texto falado;
   * cortá-lo por palavras partiria frases a meio. As duas únicas emendas mecânicas
   * seguras são trocas literais que a casa já decidiu há muito:
   *   · "o senhor" → "você" (o canal trata sempre por você — a raiz está no prompt e
   *     na trava desde 04/08, e o modelo continua a escorregar);
   *   · "Short"/"Shorts" → "vídeo" (o canal nunca diz "Short" na fala).
   *
   * ⚠️ **O QUE SOBRAR PASSA COM AVISO, E ISSO É UMA ESCOLHA DECLARADA.** Um capítulo
   * com palavras a mais dá um vídeo alguns segundos mais longo. É pior do que o ideal
   * e muito melhor do que não haver vídeo. O que fica escrito no registo é matéria para
   * emendar o PEDIDO — nunca para apertar mais a trava. Ver [[prompt-versus-validador]].
   */
  if (!melhor) {
    throw new Error(`o bloco "${nome}": o modelo não devolveu um único JSON legível em ${tentativas} tentativas`
      + `${ultimo ? ` — última queixa: ${ultimo.v.erros.join(' | ')}` : ''}`);
  }

  const obj = { ...melhor.obj };
  const emendas = [];
  for (const c of campos) {
    if (typeof obj[c] !== 'string') continue;
    const antes = obj[c];
    /**
     * ⚠️ **UM DE CADA VEZ, ESCRITO À MÃO — nada de adivinhar pela preposição.** A 1ª
     * versão trocava tudo por "a você" e escrevia *"o dinheiro a você"*. Cada forma tem
     * a sua, e são seis; uma regra esperta que acerta em cinco e estraga a sexta é pior
     * do que seis linhas aborrecidas.
     */
    let depois = antes
      .replace(/\bpara o senhor(?!a)\b/gi, 'para você')
      .replace(/\bcom o senhor(?!a)\b/gi, 'com você')
      .replace(/\bao senhor(?!a)\b/gi, 'a você')
      .replace(/\bpro senhor(?!a)\b/gi, 'pra você')
      /**
       * 🔴 **"DO SENHOR" NÃO SE TROCA AQUI, e é a lição desta emenda toda.**
       *
       * A 1ª versão trocava por "seu" — e a revisão apanhou-a: *"as contas do senhor"*
       * saía *"as contas seu"*. "Você" é invariável e por isso as cinco trocas de cima
       * são seguras; "seu" concorda em género e número com o que vem A SEGUIR, e uma
       * regex não sabe se o que vem a seguir é "as contas" ou "o dinheiro".
       *
       * Fica por trocar, e isso está certo: aparece no registo como "aceite a
       * contragosto", que é a verdade. **Emendar mal é pior do que não emendar** — e
       * o sítio de resolver isto de vez é o prompt, não esta rede de último recurso.
       */
      .replace(/\bo senhor(?!a)\b/gi, 'você')
      // ⚠️ O PLURAL PRIMEIRO. Com `shorts?` numa regra só, "nos Shorts" saía "nos vídeo".
      .replace(/\bshorts\b/gi, 'vídeos')
      .replace(/\bshort\b/gi, 'vídeo')
      // ⚠️ E a maiúscula de volta: *"O senhor viu?"* saía *"você viu?"*, em minúscula a
      // abrir a frase — e isto vai para a LEGENDA, onde se lê.
      .replace(/(^|[.!?…]\s+)([a-zà-ú])/gu, (_m, antes_, letra) => antes_ + letra.toLocaleUpperCase('pt-BR'));
    if (depois !== antes) {
      depois = limparFala(depois, tema);
      obj[c] = depois;
      emendas.push(`${c}: trocas literais do canal ("o senhor" → "você", "Short" → "vídeo")`);
    }
  }

  const depoisDaEmenda = validar(obj);
  console.log(`\n⛑️  "${nome}" ACEITE A CONTRAGOSTO em vez de a corrida morrer (tentativa ${melhor.tentativa} era a menos má):`);
  emendas.forEach((e) => console.log(`     · emendado — ${e}`));
  depoisDaEmenda.erros.forEach((e) => console.log(`     · fica assim — ${e}`));
  console.log('');

  return {
    ...obj,
    _avisos: [
      ...(depoisDaEmenda.avisos || []),
      ...depoisDaEmenda.erros.map((e) => `aceite a contragosto: ${e}`),
    ],
    _tentativa: melhor.tentativa,
    _palavras: depoisDaEmenda.palavras,
    _aceiteAContragosto: depoisDaEmenda.erros,
  };
}

// ═══ A ORQUESTRAÇÃO ═════════════════════════════════════════════════════════

export async function gerarMapa(t, { proibidas = [], tentativas = 3, cenarios = null, slug = null } = {}) {
  // Sem lista dada, lê o caderno — assim quem chama não tem de se lembrar disto.
  const gastos = cenarios || cenariosGastos();
  const jaContadas = promessasGastas();
  /**
   * 🔴 O ELENCO E A FUNÇÃO DO APP — 10/08/2026, ordem do dono.
   * Escolhidos AQUI (deterministas pelo nome do vídeo, evitando os dos últimos seis) e
   * mandados ao modelo como decisão fechada. Ver `lib/cenarios-do-longo.js`.
   */
  const elenco = escolherElenco(slug, elencosGastos({ slug }));
  const funcaoDoApp = escolherFuncaoDoApp(slug, funcoesGastas({ slug }));
  if (gastos.length) console.log(`🚫 cenas já gastas nos últimos ${RAIO_DE_CENARIOS} vídeos: ${gastos.join(' · ')}`);
  if (jaContadas.length) console.log(`📼 histórias já contadas: ${jaContadas.map((p) => `"${String(p).slice(0, 60)}…"`).join(' | ')}`);
  console.log(`👥 quem vive esta história: ${elenco}`);
  console.log(`📱 função do app nesta demonstração: ${funcaoDoApp.nome} — ${funcaoDoApp.oQueFaz}`);
  const prompt = buildPromptMapa(t, proibidas, gastos, jaContadas, elenco, funcaoDoApp);
  const exigencias = [];
  let corretivo = '';

  /**
   * 🔴 A MELHOR TENTATIVA GUARDA-SE — 09/08/2026, ordem do dono.
   * A 1ª versão deitava fora tudo o que reprovasse e no fim lançava um erro. Foi assim
   * que a corrida automática de sábado 08/08 morreu e o canal ficou sem vídeo ao
   * domingo. Agora a menos má fica de lado, e no fim tenta-se consertá-la.
   */
  let melhor = null;

  for (let i = 1; i <= tentativas; i++) {
    if (i > 1) await dormir(8000);
    const bruto = await generateText(corretivo ? `${prompt}\n\n${corretivo}` : prompt, {
      maxTokens: 2000, temperature: 0.7, pago: 'escritor',
    });
    let mapa;
    try {
      mapa = extrairJson(bruto);
    } catch (err) {
      corretivo = montarCorretivo(acumular(exigencias, [`devolva JSON válido (${err.message})`]));
      continue;
    }
    const v = validarMapa(mapa);
    if (v.ok) return { mapa, avisos: v.avisos, tentativa: i, consertos: [], elenco, funcaoDoApp };
    if (!melhor || v.erros.length < melhor.v.erros.length) melhor = { mapa, v, tentativa: i };
    corretivo = montarCorretivo(acumular(exigencias, v.erros));
    console.log(`  ⚠ mapa — tentativa ${i}/${tentativas} reprovada: ${v.erros.join(' | ')}`);
  }

  /**
   * ⛑️ O SOCORRO: consertar em vez de desistir.
   * Só se desiste quando falta a matéria-prima (sem promessa, sem os três capítulos,
   * sem valores) — e mesmo aí quem desiste é deste TEMA, não do vídeo: o robô salta
   * para o tema seguinte da fila. Ver `consertarMapa` em `lib/schema-longo.js`.
   */
  if (!melhor) throw new Error(`o modelo não devolveu um único mapa legível em ${tentativas} tentativas`);

  const { mapa: consertado, consertos, fatal } = consertarMapa(melhor.mapa, { proibidas });
  if (fatal) throw new Error(`o mapa não tem como ser consertado: ${fatal}`);

  const depois = validarMapa(consertado);
  console.log(`\n⛑️  O MAPA FOI CONSERTADO em vez de a corrida morrer (tentativa ${melhor.tentativa} era a menos má):`);
  consertos.forEach((c) => console.log(`     · ${c}`));
  if (!depois.ok) {
    /**
     * ⚠️ **O QUE SOBRA É GOSTO, e por isso passa.** O que se consertava por código já
     * foi consertado; o que fica é do género "o fecho responde mal à promessa" — não
     * há conserto honesto por regex, e um vídeo pior é melhor do que vídeo nenhum.
     * Fica escrito no registo porque a emenda certa é no PEDIDO, nunca na trava.
     */
    console.log('  ⚠️ e ainda assim sobra isto, que é conteúdo e não estrutura:');
    depois.erros.forEach((e) => console.log(`     · ${e}`));
  }
  console.log('');
  return {
    mapa: consertado,
    avisos: [...(depois.avisos || []), ...depois.erros.map((e) => `aceite a contragosto: ${e}`)],
    tentativa: melhor.tentativa,
    consertos,
    // ⚠️ TAMBÉM AQUI, e não só no caminho feliz: é este o retorno da corrida que precisou
    // de conserto, e é exactamente essa que não pode perder o elenco pelo caminho — senão
    // o caderno fica sem ele e o vídeo seguinte volta a poder repeti-lo.
    elenco,
    funcaoDoApp,
  };
}

/** As duas últimas frases de um texto — a âncora que o bloco seguinte recebe. */
const ultimasFrases = (txt, n = 2) => frasesDe(txt).slice(-n).join(' ');
const primeirasFrases = (txt, n = 2) => frasesDe(txt).slice(0, n).join(' ');

const falaDoCapitulo = (c) => PARTES_POSSIVEIS.map((p) => String((c && c[p]) || '').trim()).filter(Boolean).join(' ');

/**
 * O que o validador de um capítulo precisa de saber do MAPA — e vive numa função só
 * porque é pedido em cinco sítios (escrita, polimento, costura, conserto, relatório).
 * Escrito à mão nesses cinco, um dia divergiam, e a divergência seria invisível.
 */
const planoDoCapitulo = (mapa, i) => ({
  ...(mapa.capitulos[i] || {}),
  numeroEspinha: mapa.numeroEspinha,
  /**
   * ⚠️ A LISTA DO QUE SE PODE DIZER JUNTA DUAS FONTES, e as duas são precisas:
   *  · os valores da HISTÓRIA, que o mapa inventou (a fatura, o empréstimo, o amigo);
   *  · os valores da FICHA DE DÍVIDA, que o computador CALCULOU com as taxas do
   *    Banco Central (os juros de um mês, a prestação, o total no fim).
   * Sem a segunda metade, o ato da armadilha tinha o número calculado à frente e a
   * trava reprovava-o por o dizer — o defeito nº1 desta casa, outra vez.
   */
  valoresPermitidos: [
    ...(mapa.valores || []).map((v) => Number(v && v.valor)).filter(Number.isFinite),
    ...((mapa.fichaDeDivida && mapa.fichaDeDivida.permitidos) || []),
  ],
  temDemonstracao: Number(mapa.capituloDaDemonstracao) === i + 1,
});

/**
 * A FICHA DE DÍVIDA DESTE VÍDEO — calculada DEPOIS do mapa, a partir da conta que o
 * próprio mapa apontou como sendo a fatura do cartão. Devolve null (e o vídeo segue
 * sem juros) quando não há conta de cartão na história ou quando as taxas do Banco
 * Central ainda não foram colhidas.
 */
function fichaDoMapa(mapa) {
  const nome = String(mapa.contaDoCartao || '').trim();
  if (!nome) return null;
  const valor = (mapa.valores || []).find((v) => String(v && v.nome).trim().toLowerCase() === nome.toLowerCase());
  if (!valor) return null;
  return montarFichaDeDivida(Number(valor.valor));
}

/**
 * ═══ O CADERNO — cada bloco aprovado é gravado no instante em que passa ═══
 *
 * ⚠️ ISTO NASCEU DE UMA FALHA REAL, na 1ª corrida (04/08/2026). O mapa passou à
 * primeira, a abertura à primeira, o capítulo 1 à primeira — e o capítulo 2 esgotou
 * as tentativas por DUAS palavras acima do teto. **Todo o trabalho pago até ali foi
 * deitado fora**, e a corrida seguinte teve de o comprar outra vez.
 *
 * É a contradição da própria ideia que este ficheiro defende: a lição das âncoras
 * (§26.3 L1) diz que se tem de poder corrigir UM bloco sem partir os outros. Sem
 * caderno, um bloco reprovado partia todos.
 *
 * Agora cada bloco aprovado vai para o disco assim que passa. Voltar a correr o
 * comando continua de onde ficou e só paga o que falta. `--recomecar` deita fora o
 * caderno de propósito, para quando se quer um vídeo novo do zero.
 */
function lerCaderno(slug, tema) {
  if (args.recomecar) return null;
  const p = join(OUTPUT_DIR, `${slug}.caderno.json`);
  if (!existsSync(p)) return null;
  try {
    const c = JSON.parse(readFileSync(p, 'utf-8'));
    // ⚠️ O caderno só serve se for do MESMO tema. Aproveitar o mapa de um tema para
    // outro produziria um vídeo cujos capítulos não falam do que a capa promete —
    // e ninguém daria por isso até o ver.
    if (c && c.tema === tema) return c;
    console.log('   ℹ️ há um caderno guardado, mas de OUTRO tema — vai ser ignorado');
  } catch { /* caderno ilegível: começa do zero */ }
  return null;
}

function gravarCaderno(slug, caderno) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(join(OUTPUT_DIR, `${slug}.caderno.json`), JSON.stringify(caderno, null, 2), 'utf-8');
}

export async function gerarLongo(t, { proibidas = [], polir = true, slug = 'longo-piloto' } = {}) {
  const temaTexto = `${t.term} ${t.angle || ''}`;
  const caderno = lerCaderno(slug, t.term) || { tema: t.term, capitulos: [] };
  const guardar = () => gravarCaderno(slug, caderno);

  // ── ANDAR 0 ────────────────────────────────────────────────────────────────
  console.log('\n🗺️  ANDAR 0 — O MAPA\n');
  let mapa = caderno.mapa;
  if (mapa) {
    console.log('   ♻️ mapa retomado do caderno (não se paga duas vezes pela mesma coisa)');
  } else {
    const feito = await gerarMapa(t, { proibidas, slug });
    mapa = feito.mapa;
    /**
     * ⚠️ **O ELENCO E A FUNÇÃO VIAJAM DENTRO DO MAPA, e a razão é o caderno retomado.**
     * Um mapa que já existe é retomado de disco (*"não se paga duas vezes"*) e nessa
     * corrida o `gerarMapa` NEM CHEGA A CORRER — logo as duas escolhas não existiriam, e
     * o caderno de cenas ficaria sem elas. Guardadas aqui, vão no mesmo ficheiro que já é
     * retomado, e uma repescagem grava exactamente o mesmo que a corrida original.
     */
    mapa.elenco = feito.elenco || null;
    mapa.funcaoDoApp = feito.funcaoDoApp || null;
    caderno.mapa = mapa;
    guardar();
    console.log(`   ✅ mapa aprovado na tentativa ${feito.tentativa}`);
  }
  console.log(`   promessa: "${mapa.promessa}"`);
  mapa.capitulos.forEach((c, i) => {
    console.log(`   ${i + 1}. ${c.titulo}${Number(mapa.capituloDaDemonstracao) === i + 1 ? '   [o app aparece aqui]' : ''}`);
  });
  console.log(`   fim: "${mapa.respostaDaPromessa}"`);
  console.log(`   imagem da capa: ${mapa.fioCondutor}`);

  /**
   * 🧮 A FICHA DE DÍVIDA — calculada aqui, com as taxas do Banco Central, e daqui em
   * diante é ela que manda nos números dos juros. É a mesma regra de sempre neste
   * projeto: **o que se calcula não se pede ao modelo.** Sem ela, o ato da armadilha
   * só conseguia ensinar organização (foi o que o dono viu e reprovou).
   */
  mapa.fichaDeDivida = fichaDoMapa(mapa);
  if (mapa.fichaDeDivida) {
    console.log('\n🧮 FICHA DE DÍVIDA (calculada com as taxas do Banco Central):');
    for (const linha of mapa.fichaDeDivida.texto.split('\n')) console.log(`   ${linha}`);
  } else {
    console.log('\n🧮 sem ficha de dívida — a história não tem uma fatura de cartão, ou as taxas ainda não foram colhidas (scripts/update-divida.js)');
  }

  // ── ANDAR 1 ────────────────────────────────────────────────────────────────
  console.log('\n✍️  ANDAR 1 — OS BLOCOS, UM DE CADA VEZ (ancorados)\n');
  const numerosUsados = [];
  const jaDito = [];

  let abertura = caderno.abertura;
  if (abertura) {
    console.log(`   ♻️ abertura retomada do caderno — ${contarPalavras(abertura.fala)} palavras`);
  } else {
    abertura = await gerarBloco({
      nome: 'abertura',
      prompt: buildPromptAbertura(t, mapa, proibidas),
      tema: temaTexto,
      validar: (o) => validarAbertura(o.fala, { promessa: mapa.promessa, exemploParaComparar: EXEMPLO_PARA_COMPARAR }),
    });
    caderno.abertura = { fala: abertura.fala };
    guardar();
    console.log(`   ✅ abertura — ${abertura._palavras} palavras (tentativa ${abertura._tentativa})`);
  }
  jaDito.push(frasesDe(abertura.fala)[0]);

  const capitulos = [];
  let anterior = abertura.fala;
  let deQuem = 'a abertura';
  for (let i = 0; i < mapa.capitulos.length; i++) {
    const plano = planoDoCapitulo(mapa, i);
    const ancora = blocoDaAncora({
      paragrafoAnterior: ultimasFrases(anterior),
      deQuem,
      numerosUsados,
      comparacoesUsadas: [],
      jaDito,
    });
    let completo = caderno.capitulos[i];
    if (completo) {
      console.log(`   ♻️ capítulo ${i + 1} retomado do caderno — ${contarPalavras(falaDoCapitulo(completo))} palavras`);
    } else {
      const cap = await gerarBloco({
        nome: `capítulo ${i + 1}`,
        prompt: buildPromptCapitulo(t, mapa, i, ancora),
        tema: temaTexto,
        campos: PARTES_POSSIVEIS,
        validar: (o) => validarCapitulo(o, i, { plano, exemploParaComparar: EXEMPLO_PARA_COMPARAR }),
      });
      completo = { ...Object.fromEntries(PARTES_POSSIVEIS.filter((p) => typeof cap[p] === 'string').map((p) => [p, cap[p]])), titulo: plano.titulo };
      caderno.capitulos[i] = completo;
      guardar();
      console.log(`   ✅ capítulo ${i + 1} — ${cap._palavras} palavras (tentativa ${cap._tentativa})`);
    }
    capitulos.push(completo);

    numerosUsados.push(...(plano.valoresPermitidos || []));
    /**
     * ⚠️ O QUE VAI PARA O "JÁ FOI DITO" — três frases por capítulo, e cada uma foi
     * escolhida por ter REPETIDO na 2ª corrida real:
     *  · a pergunta que abre (todos os capítulos abriam com a mesma construção);
     *  · a primeira frase da demonstração (os três diziam "eu joguei tudo no FinMoovi");
     *  · a frase que fecha o desenvolvimento ("cada uma parece que cabe no…" saiu
     *    igual nos capítulos 1 e 2).
     * Mandar só a pergunta era mandar um terço do problema.
     */
    jaDito.push(
      frasesDe(completo.pergunta)[0],
      frasesDe(completo.demonstracao || '')[0],
      frasesDe(completo.desenvolvimento).slice(-1)[0],
    );
    anterior = falaDoCapitulo(completo);
    deQuem = `o capítulo ${i + 1}`;
  }

  let chamada = caderno.chamada;
  if (chamada) {
    console.log(`   ♻️ chamada retomada do caderno — ${contarPalavras(chamada.fala)} palavras`);
  } else {
    chamada = await gerarBloco({
      nome: 'chamada',
      prompt: buildPromptChamada(t, mapa, blocoDaAncora({ paragrafoAnterior: ultimasFrases(anterior), deQuem, numerosUsados, jaDito })),
      tema: temaTexto,
      validar: (o) => validarChamada(o.fala),
    });
    caderno.chamada = { fala: chamada.fala };
    guardar();
    console.log(`   ✅ chamada — ${chamada._palavras} palavras (tentativa ${chamada._tentativa})`);
  }

  let fecho = caderno.fecho;
  if (fecho) {
    console.log(`   ♻️ fecho retomado do caderno — ${contarPalavras(fecho.fala)} palavras`);
  } else {
    fecho = await gerarBloco({
      nome: 'fecho',
      prompt: buildPromptFecho(t, mapa, blocoDaAncora({
        paragrafoAnterior: ultimasFrases(anterior),
        deQuem: `o capítulo ${mapa.capitulos.length}`,
        numerosUsados,
        jaDito,
      })),
      tema: temaTexto,
      validar: (o) => validarFecho(o.fala, {
        promessa: mapa.promessa,
        exemploParaComparar: EXEMPLO_PARA_COMPARAR.replace(BORDAO, ''),
      }),
    });
    caderno.fecho = { fala: fecho.fala };
    guardar();
    console.log(`   ✅ fecho — ${fecho._palavras} palavras (tentativa ${fecho._tentativa})`);
  }

  let roteiro = {
    tema: t.term,
    angulo: t.angle,
    promessa: mapa.promessa,
    fioCondutor: mapa.fioCondutor,
    lacoAberto: mapa.lacoAberto || '',
    abertura: abertura.fala,
    capitulos,
    chamada: chamada.fala,
    fecho: fecho.fala,
  };

  // ── ANDAR 2 — as costuras ─────────────────────────────────────────────────
  console.log('\n🧵 ANDAR 2 — AS COSTURAS (só as junções)\n');
  roteiro = await costurar(roteiro, temaTexto, (cand) => conferirBlocos(cand, mapa));

  // ── ANDAR 3 — o polidor, capítulo a capítulo ──────────────────────────────
  if (polir) {
    console.log('\n💎 ANDAR 3 — O POLIDOR, CAPÍTULO A CAPÍTULO\n');
    for (let i = 0; i < roteiro.capitulos.length; i++) {
      const plano = planoDoCapitulo(mapa, i);
      const conferir = (cand) => validarCapitulo(cand, i, { plano: planoDoCapitulo(mapa, i), exemploParaComparar: EXEMPLO_PARA_COMPARAR });
      const limpar = (cand) => ({
        ...cand,
        ...Object.fromEntries(PARTES_POSSIVEIS.filter((p) => typeof cand[p] === 'string').map((p) => [p, limparFala(cand[p], temaTexto)])),
      });
      const lido = await polirCapitulo(
        roteiro.capitulos[i],
        { titulo: plano.titulo, promessa: mapa.promessa, posicao: i + 1, total: roteiro.capitulos.length, temDemo: plano.temDemonstracao },
        conferir,
        { limpar },
      );
      if (lido.usada === 'leitor') {
        roteiro.capitulos[i] = { ...roteiro.capitulos[i], ...lido.capitulo };
        console.log(`   ✅ capítulo ${i + 1} polido${lido.mexi.length ? ` — ${lido.mexi.join(' · ')}` : ' (sem notas)'}`);
      } else {
        console.log(`   ⚠️ capítulo ${i + 1} ficou com o original: ${lido.motivo}`);
      }
    }

    /**
     * ⚠️ E OS TRÊS BLOCOS DE PARÁGRAFO ÚNICO (04/08/2026, ordem do dono).
     * No primeiro vídeo eles saíram SEM revisão nenhuma, porque o polidor estava
     * desenhado à volta das quatro partes de um capítulo. O dono apanhou o resultado
     * no fecho entregue ("muita gente" duas vezes em duas frases, mais uma frase de
     * encher). Cada um leva o SEU prompt, porque as regras de verdade dos três são
     * contraditórias entre si — o fecho tem de dizer o bordão, a abertura tem de o
     * calar; a chamada tem de pedir, os outros dois têm de não pedir.
     */
    const soltos = [
      {
        papel: 'abertura',
        ler: () => roteiro.abertura,
        gravar: (t) => { roteiro.abertura = t; },
        conferir: (t) => validarAbertura(t, { promessa: mapa.promessa, exemploParaComparar: EXEMPLO_PARA_COMPARAR }),
      },
      {
        papel: 'chamada',
        ler: () => roteiro.chamada,
        gravar: (t) => { roteiro.chamada = t; },
        conferir: (t) => validarChamada(t),
      },
      {
        papel: 'fecho',
        ler: () => roteiro.fecho,
        gravar: (t) => { roteiro.fecho = t; },
        conferir: (t) => validarFecho(t, {
          promessa: mapa.promessa,
          exemploParaComparar: EXEMPLO_PARA_COMPARAR.replace(BORDAO, ''),
        }),
      },
    ];
    for (const bloco of soltos) {
      const lido = await polirBloco(
        bloco.ler(),
        { papel: bloco.papel, promessa: mapa.promessa, tema: t.term },
        bloco.conferir,
        { limpar: (texto) => limparFala(texto, temaTexto) },
      );
      if (lido.usada === 'leitor') {
        bloco.gravar(lido.fala);
        console.log(`   ✅ ${bloco.papel} polida${lido.mexi.length ? ` — ${lido.mexi.join(' · ')}` : ' (sem notas)'}`);
      } else {
        console.log(`   ⚠️ ${bloco.papel} ficou com o original: ${lido.motivo}`);
      }
    }
  } else {
    console.log('\n💎 ANDAR 3 — polidor DESLIGADO (--sem-polir)\n');
  }

  // ── ANDAR 4-a — O CONSERTO CIRÚRGICO DA REPETIÇÃO ─────────────────────────
  /**
   * ⚠️ ISTO É A PROMESSA DAS ÂNCORAS A SER CUMPRIDA, e não um extra.
   * O §26.3 diz que a âncora existe para se poder "corrigir UM bloco sem partir os
   * outros". Uma trava global que só se QUEIXA no fim não cumpre isso — deixa o
   * dono com um vídeo partido e um relatório. Aqui, quando dois capítulos repetem a
   * mesma frase, reescreve-se **só o de trás para a frente** (o mais tarde é o que
   * repetiu), com a frase repetida escrita na queixa. Os outros não são tocados.
   * Duas voltas no máximo: se ao fim de duas ainda repete, o relatório di-lo, e a
   * decisão é do dono — insistir sozinho é o pêndulo que já custou dias.
   */
  for (let volta = 1; volta <= 2; volta++) {
    const v = validarLongo(roteiro);
    const repete = v.repeticoes || [];
    if (!repete.length) break;

    // o capítulo que repetiu é o de índice MAIOR (o que veio depois já tinha o
    // anterior à frente e escreveu na mesma a mesma coisa)
    const alvo = Math.max(...repete.map((r) => r.b));
    const frases = repete.filter((r) => r.b === alvo).map((r) => r.frase);
    console.log(`\n🩹 volta ${volta}: o capítulo ${alvo + 1} repete o que já foi dito — a reescrever SÓ ele`);
    frases.forEach((f) => console.log(`      · "${f}"`));

    const plano = planoDoCapitulo(mapa, alvo);
    const anteriores = roteiro.capitulos.filter((_, i) => i !== alvo);
    const ancora = blocoDaAncora({
      paragrafoAnterior: alvo > 0 ? ultimasFrases(falaDoCapitulo(roteiro.capitulos[alvo - 1])) : ultimasFrases(roteiro.abertura),
      deQuem: alvo > 0 ? `o capítulo ${alvo}` : 'a abertura',
      numerosUsados: [],
      jaDito: [
        ...frases.map((f) => `${f} (ESTA foi dita noutro capítulo — não a repita)`),
        ...anteriores.flatMap((c) => [frasesDe(c.demonstracao)[0], frasesDe(c.pergunta)[0]]).filter(Boolean),
      ],
    });

    let novo;
    try {
      novo = await gerarBloco({
        nome: `capítulo ${alvo + 1} (reescrita)`,
        prompt: buildPromptCapitulo(t, mapa, alvo, ancora),
        tema: temaTexto,
        campos: PARTES_POSSIVEIS,
        tentativas: 3,
        validar: (o) => validarCapitulo(o, alvo, { plano, exemploParaComparar: EXEMPLO_PARA_COMPARAR }),
      });
    } catch (err) {
      console.log(`   ⚠️ a reescrita do capítulo ${alvo + 1} não passou (${err.message}) — fica o que estava`);
      break;
    }

    const candidato = JSON.parse(JSON.stringify(roteiro));
    candidato.capitulos[alvo] = {
      ...candidato.capitulos[alvo],
      ...Object.fromEntries(PARTES_DO_CAPITULO.map((p) => [p, novo[p]])),
    };
    // ⚠️ A REESCRITA SÓ ENTRA SE MELHORAR. Sem esta conta, uma reescrita que trocasse
    // uma repetição por outra entrava à mesma e a volta seguinte via o mesmo número
    // de queixas — o pêndulo, outra vez, agora em ponto grande.
    const depois = validarLongo(candidato);
    if ((depois.repeticoes || []).length < repete.length) {
      roteiro = candidato;
      console.log(`   ✅ capítulo ${alvo + 1} reescrito — repetições: ${repete.length} → ${(depois.repeticoes || []).length}`);
    } else {
      console.log(`   ⚠️ a reescrita não reduziu as repetições (${repete.length} → ${(depois.repeticoes || []).length}) — fica o original`);
      break;
    }
  }

  // ── ANDAR 4 — as travas ───────────────────────────────────────────────────
  // ⚠️ AS DUAS CAMADAS, e as duas correm no FIM, sobre o texto que vai mesmo ao ar.
  // As de BLOCO (cada bloco outra vez, agora costurado e polido) e as GLOBAIS (o que
  // só se vê olhando o vídeo inteiro). Correr só as globais deixaria passar um bloco
  // partido depois de aprovado — foi por isso que a costura passou a ser conferida.
  console.log('\n🔒 ANDAR 4 — AS TRAVAS (bloco a bloco + globais)\n');
  const blocos = conferirBlocos(roteiro, mapa);
  if (!blocos.ok) {
    console.log('   ❌ travas de BLOCO com queixas:');
    blocos.erros.forEach((e) => console.log(`      · ${e}`));
  } else {
    console.log('   ✅ todos os blocos passam nas suas travas');
  }
  const global = validarLongo(roteiro);
  return { roteiro, mapa, global, blocos };
}

/**
 * ⚠️ AS TRAVAS DE CADA BLOCO, CORRIDAS OUTRA VEZ SOBRE O ROTEIRO INTEIRO.
 *
 * Nasceu de um buraco meu, visto na 2ª corrida real: **a costura reescrevia a
 * primeira frase de um bloco que já tinha sido aprovado, e ninguém voltava a
 * conferir.** Uma emenda podia tirar o "Comenta FINMOOVI" da chamada ou a pergunta
 * que abre um capítulo, e o vídeo seguia em frente — porque as travas globais só
 * olham para o que atravessa blocos, não para o que vive dentro de um.
 * É a mesma regra que faz o segundo leitor ser seguro: quem mexe volta a passar
 * pelas travas, e se as partir, fica o original.
 */
export function conferirBlocos(roteiro, mapa) {
  const erros = [];
  const juntar = (v) => erros.push(...v.erros);
  juntar(validarAbertura(roteiro.abertura, { promessa: mapa.promessa, exemploParaComparar: EXEMPLO_PARA_COMPARAR }));
  (roteiro.capitulos || []).forEach((c, i) => {
    juntar(validarCapitulo(c, i, { plano: planoDoCapitulo(mapa, i), exemploParaComparar: EXEMPLO_PARA_COMPARAR }));
  });
  juntar(validarChamada(roteiro.chamada));
  juntar(validarFecho(roteiro.fecho, {
    promessa: mapa.promessa,
    exemploParaComparar: EXEMPLO_PARA_COMPARAR.replace(BORDAO, ''),
  }));
  return { ok: erros.length === 0, erros };
}

/**
 * Corre a costura. Se falhar (ou devolver lixo), o roteiro segue INTACTO — é a mesma
 * regra do segundo leitor: isto é um lucro, nunca um ponto de falha.
 * Cada emenda é aplicada e CONFERIDA sozinha: uma emenda que parta uma trava é
 * deitada fora, e as outras seguem.
 */
async function costurar(roteiro, temaTexto, conferir = () => ({ ok: true, erros: [] })) {
  const blocos = [
    ['a abertura', roteiro.abertura],
    ...roteiro.capitulos.map((c, i) => [`o capítulo ${i + 1}`, falaDoCapitulo(c)]),
    ['a chamada', roteiro.chamada],
    ['o fim', roteiro.fecho],
  ];
  const juncoes = [];
  for (let i = 0; i < blocos.length - 1; i++) {
    juncoes.push({
      de: blocos[i][0],
      para: blocos[i + 1][0],
      fim: ultimasFrases(blocos[i][1]),
      inicio: primeirasFrases(blocos[i + 1][1], 1),
      indice: i + 1, // qual bloco tem a frase inicial
    });
  }

  let resposta;
  try {
    const bruto = await generateText(buildPromptCosturas(juncoes), { maxTokens: 1500, temperature: 0.6, pago: 'leitor' });
    resposta = extrairJson(bruto);
  } catch (err) {
    console.log(`   ⚠️ as costuras não correram (${err.message}) — o roteiro segue como está`);
    return roteiro;
  }

  const emendas = Array.isArray(resposta.emendas) ? resposta.emendas : [];
  if (emendas.length !== juncoes.length) {
    console.log(`   ⚠️ a costura devolveu ${emendas.length} emendas em vez de ${juncoes.length} — o roteiro segue como está`);
    return roteiro;
  }

  let out = JSON.parse(JSON.stringify(roteiro));
  let mexidas = 0;
  juncoes.forEach((j, k) => {
    const nova = limparFala(String((emendas[k] && emendas[k].inicio) || '').trim(), temaTexto);
    if (!nova || nova === j.inicio) return;
    // ⚠️ A COSTURA NÃO PODE PARTIR A FORMA. Se a frase original era a pergunta que abre
    // um capítulo, a versão nova tem de continuar a ser pergunta — senão a trava do
    // capítulo reprova um texto que já tinha sido aprovado, e ninguém percebe porquê.
    if (/\?[!…]*$/.test(j.inicio) && !/\?[!…]*$/.test(nova)) {
      console.log(`   ⚠️ emenda ${k + 1} recusada: deixou de ser pergunta`);
      return;
    }
    // A emenda é aplicada numa CÓPIA e conferida sozinha. Só entra no roteiro se
    // passar em todas as travas do bloco que tocou.
    const tentativa = JSON.parse(JSON.stringify(out));
    const alvo = j.indice;
    const trocar = (txt) => txt.replace(j.inicio, nova);
    if (alvo === 0) tentativa.abertura = trocar(tentativa.abertura);
    else if (alvo <= tentativa.capitulos.length) {
      const c = tentativa.capitulos[alvo - 1];
      c.pergunta = trocar(c.pergunta);
    } else if (alvo === tentativa.capitulos.length + 1) tentativa.chamada = trocar(tentativa.chamada);
    else tentativa.fecho = trocar(tentativa.fecho);

    const v = conferir(tentativa);
    if (!v.ok) {
      console.log(`   ⚠️ emenda ${k + 1} (${j.de} → ${j.para}) RECUSADA pelas travas: ${v.erros.join(' | ')}`);
      return;
    }
    out = tentativa;
    mexidas++;
    console.log(`   ✏️  emenda ${k + 1} (${j.de} → ${j.para}): "${nova}"`);
  });
  if (!mexidas) console.log('   ✅ as costuras foram lidas e nenhuma precisou de conserto');
  return out;
}

// ─── execução direta ─────────────────────────────────────────────────────────

const executadoDireto = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('youtube/roteiro-longo.js');
if (executadoDireto) {
  const t = lerTemaLongo();
  console.log(`\n🎬 VÍDEO LONGO — "${t.term}"`);
  console.log(`   ângulo: ${t.angle}`);

  // A ficha de números existe para quando o tema TRAZ um cenário (aporte + prazo).
  // No tema de dívida ela devolve vazio, e é isso mesmo: sem conta calculada, o
  // prompt e as travas proíbem qualquer promessa de rendimento.
  const ficha = montarFichaDeNumeros(`${t.term} ${t.angle || ''}`);
  console.log(ficha
    ? '\n🧮 há ficha de números calculada para este tema'
    : '\n🧮 sem cenário numérico no tema — proibido citar percentagem ou prometer rendimento (é o esperado num vídeo de dívida)');

  /**
   * 🔴 AS DUAS JANELAS, E ANTES SÓ HAVIA UMA — 09/08/2026.
   *
   * `loadRecentPublishedContext()` lê o caderno dos **Shorts**. Sozinha, esta linha
   * fazia com que **o vídeo longo nunca visse a imagem que o vídeo longo anterior
   * usou** — dois longos seguidos podiam abrir com o mesmo fio condutor, e a única
   * coisa que o impedia era a sorte.
   *
   * ⚠️ As duas SOMAM-SE, não se substituem: o canal é um só, e uma imagem vista num
   * Short ontem também já foi vista por quem assiste.
   */
  const recentes = loadRecentPublishedContext();
  const dosShorts = recentes.flatMap((r) => r.metaphors || []);
  const dosLongos = fiosGastos();
  const proibidas = [...new Set([...dosShorts, ...dosLongos])].filter((m) => m !== 'clique-link');
  if (dosLongos.length) console.log(`🚫 imagens dos últimos ${RAIO_DE_CENARIOS} vídeos LONGOS: ${dosLongos.join(', ')}`);
  if (proibidas.length) console.log(`🚫 imagens já usadas no canal (Shorts + longos): ${proibidas.join(', ')}`);

  if (args['so-mapa']) {
    const { mapa } = await gerarMapa(t, { proibidas });
    console.log(`\n${JSON.stringify(mapa, null, 2)}\n`);
    process.exit(0);
  }

  const slugDoVideo = String(args.slug && args.slug !== true ? args.slug : 'longo-piloto');
  const { roteiro, mapa, global, blocos } = await gerarLongo(t, { proibidas, polir: !args['sem-polir'], slug: slugDoVideo });

  if (!blocos.ok) {
    console.log('❌ há blocos com queixas (ver acima) — o vídeo NÃO está pronto');
  }
  if (!global.ok) {
    console.log('❌ o vídeo NÃO passou nas travas globais:');
    global.erros.forEach((e) => console.log(`   · ${e}`));
  } else {
    console.log('   ✅ todas as travas globais verdes');
  }
  global.avisos.forEach((a) => console.log(`   ⚠️ ${a}`));

  const minutos = Math.floor(global.segundos / 60);
  const segundos = Math.round(global.segundos % 60);
  console.log(`\n📏 ${global.palavras} palavras ≈ ${minutos}min${String(segundos).padStart(2, '0')} de fala`);

  console.log(`\n${'─'.repeat(76)}`);
  console.log(`\n[ABERTURA]\n${roteiro.abertura}`);
  roteiro.capitulos.forEach((c, i) => {
    console.log(`\n[CAPÍTULO ${i + 1} — ${c.titulo}]`);
    // ⚠️ PARTES_POSSIVEIS, não PARTES_DO_CAPITULO: desde que a demonstração passou
    // a viver num capítulo só, imprimir as três partes fixas ESCONDIA-A do ecrã. O
    // texto estava lá e no ficheiro; só quem lia o terminal é que não o via.
    PARTES_POSSIVEIS.filter((p) => c[p]).forEach((p) => console.log(`  · ${c[p]}`));
  });
  console.log(`\n[CHAMADA]\n${roteiro.chamada}`);
  console.log(`\n[FIM]\n${roteiro.fecho}`);
  console.log(`\n${'─'.repeat(76)}`);
  console.log('\n📖 A NARRAÇÃO CORRIDA (leia como quem assiste):\n');
  console.log(falaCorrida(roteiro).join('\n\n'));

  mkdirSync(OUTPUT_DIR, { recursive: true });
  const slug = String(args.slug && args.slug !== true ? args.slug : 'longo-piloto');
  const destino = join(OUTPUT_DIR, `${slug}.longo.json`);
  writeFileSync(destino, JSON.stringify({
    ...roteiro,
    mapa,
    palavras: global.palavras,
    segundosDeFala: Math.round(global.segundos),
    geradoEm: new Date().toISOString(),
  }, null, 2), 'utf-8');
  console.log(`\n💾 guardado em ${destino}\n`);

  /**
   * ♦ O CADERNO DE CENÁRIOS — é isto que faz o vídeo SEGUINTE não repetir este.
   * Guarda-se DEPOIS de o guião estar em disco: se alguma coisa rebentar acima, o
   * caderno não fica a dizer que saiu um vídeo que não saiu.
   */
  const usados = guardarCenarios(slug, falaCorrida(roteiro).join(' '), {
    fio: mapa?.fioCondutor || null,
    promessa: mapa?.promessa || null,
    // 🔴 10/08/2026 — sem estas duas linhas a trava nova não aprende nada, exactamente
    // como a trava das cenas não aprendia antes de 09/08 por falta de um `git add`.
    elenco: mapa?.elenco || null,
    funcaoDoApp: mapa?.funcaoDoApp?.chave || null,
  });
  console.log(`📓 cenas deste vídeo, guardadas para os próximos ${RAIO_DE_CENARIOS}: ${usados.length ? usados.join(' · ') : '(nenhuma das conhecidas)'}`);
  console.log(`📓 imagem deste vídeo, guardada para os próximos ${RAIO_DE_CENARIOS}: ${mapa?.fioCondutor || '(nenhuma)'}\n`);
}
