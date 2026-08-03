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
import { montarFichaDeNumeros } from './lib/simulador.js';
import { polirCapitulo } from './lib/leitor-longo.js';
import {
  ORCAMENTO, PARTES_DO_CAPITULO, NUM_CAPITULOS, MAX_PALAVRAS_TITULO, PALAVRAS_POR_SEGUNDO,
  validarMapa, validarAbertura, validarCapitulo, validarChamada, validarFecho, validarLongo,
  contarPalavras, frasesDe, falaCorrida,
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
  const slug = args.glossario && args.glossario !== true ? String(args.glossario) : TEMA_PILOTO.glossario;
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

/** O mapa-exemplo. Assunto: assinaturas esquecidas — NÃO é dívida, de propósito. */
export const EXEMPLO_DE_MAPA = {
  promessa: 'Vou te mostrar como achar as assinaturas que você paga sem usar e cortar as maiores ainda hoje',
  fioCondutor: 'ralo',
  capitulos: [
    {
      titulo: 'Onde as assinaturas se escondem na fatura',
      numeroChave: 47,
      oQueFicaEmAberto: 'quantas dessas cobranças ele ainda não tinha visto',
    },
    {
      titulo: 'O teste dos trinta dias sem abrir',
      numeroChave: 189,
      somaDe: [39, 90, 60],
      oQueFicaEmAberto: 'o que fazer com as que ele descobriu que não usa',
    },
    {
      titulo: 'Cancelar sem perder o que importa',
      numeroChave: 640,
      oQueFicaEmAberto: 'a cobrança que volta sozinha se ninguém olhar',
    },
  ],
  respostaDaPromessa: 'As assinaturas esquecidas saem da fatura no dia em que você as vê escritas num sítio só',
  lacoAberto: 'e tem uma delas que volta a cobrar sozinha no ano seguinte sem avisar ninguém',
};

/** A abertura-exemplo. Assunto: conta de luz. */
export const EXEMPLO_DE_ABERTURA = {
  promessa: 'Vou te mostrar onde a sua conta de luz sobe sozinha e o que dá pra desligar hoje',
  fala: 'Você sabe qual aparelho da sua casa gasta mais luz do que a geladeira? '
    + 'É o chuveiro, e ele nem passa vinte minutos ligado por dia. '
    + 'Eu fui olhar a minha conta de luz de perto porque ela subiu três meses seguidos e eu não tinha comprado nada novo pra casa. '
    + 'O que eu encontrei foi o banho demorado de manhã, a máquina de lavar rodando meio vazia, e uma lâmpada de área acesa a noite inteira. '
    + 'Coisas que ninguém repara, porque cada uma parece pequena sozinha. '
    + 'Nos próximos minutos eu te mostro onde a sua conta de luz sobe sozinha, quanto isso deu na minha casa, '
    + 'e o que dá pra desligar hoje sem ninguém em casa reclamar.',
};

/** O capítulo-exemplo. Assunto: comida que estraga na geladeira. */
export const EXEMPLO_DE_CAPITULO = {
  titulo: 'A conta do que apodrece no fundo da geladeira',
  numeroChave: 260,
  somaDe: [80, 120, 60],
  pergunta: 'Você já abriu a geladeira num domingo e achou comida estragada lá no fundo? '
    + 'Eu já achei, e daquela vez eu parei pra contar quanto tinha custado.',
  desenvolvimento: 'E olha, não é desleixo seu. A gente faz a compra grande no sábado, enche o carrinho pra semana inteira, '
    + 'e no meio da semana a vida muda tudo. Um dia você sai tarde do trabalho, no outro come na rua, no outro o menino não quer aquilo. '
    + 'Aí a verdura murcha, a carne passa do prazo, o pão endurece. '
    + 'Naquele mês eu somei tudo o que foi pro lixo. Oitenta reais de verdura. Cento e vinte de carne. Sessenta de pão e de leite. '
    + 'Duzentos e sessenta reais que eu paguei, carreguei pra casa e nunca cheguei a comer.',
  demonstracao: 'Sabe o que eu fiz depois disso? Fotografei a nota do mercado e joguei no FinMoovi, compra a compra. '
    + 'No fim do mês eu abri o balanço e o app tinha juntado tudo numa linha só, mercado, com o total já somado. '
    + 'Eu não precisei de calculadora nenhuma. Estava escrito na tela, e foi aí que aquilo deixou de ser uma sensação e virou um número.',
  regancho: 'Só que ver o número na tela ainda não devolve o dinheiro. '
    + 'Falta a parte que muda o mês seguinte, e ela é a mais simples das três.',
};

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
- Diga "vídeo", nunca "Short". Nunca diga "tchau", "até a próxima" nem "obrigado".`;

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

export function buildPromptMapa(t, proibidas = []) {
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

════════ O QUE VOCÊ TEM DE DECIDIR ════════
1. **A PROMESSA** — uma frase só, entre 5 e 25 palavras, dizendo o que a pessoa leva daqui. NÃO é pergunta. É o que o vídeo ENTREGA.
2. **${NUM_CAPITULOS} CAPÍTULOS**, cada um com:
   · **titulo** — no máximo ${MAX_PALAVRAS_TITULO} palavras, e ele PROMETE o que o capítulo entrega. ⛔ Proibido "Introdução", "Conclusão", "Parte 1", "Resumo" ou qualquer nome que sirva para qualquer vídeo.
   · **numeroChave** — UM número de dinheiro (10 para cima) que se transforma dentro deste capítulo. ⛔ **Cada capítulo tem o SEU. Dois capítulos com o mesmo número contam a mesma história duas vezes** — o computador reprova.
   · **somaDe** (só se houver soma) — as parcelas que dão o número-chave. **Elas têm de somar exatamente o número-chave.** O computador confere a conta.
   · **oQueFicaEmAberto** — a ponta que este capítulo deixa no ar para o seguinte agarrar.
3. **respostaDaPromessa** — a lição do fim, que responde ao que a promessa prometeu. Tem de falar da MESMA coisa.
4. **lacoAberto** — a provocação final, DENTRO deste tema. ⛔ Proibido prometer "no próximo vídeo" ou "semana que vem": não há fila de vídeos, e prometer o que não existe é mentira.
5. **fioCondutor** — a imagem da capa, uma destas: ${menuDeImagens(proibidas)}.

${REGRAS_DE_NUMERO}

════════ UM MAPA INTEIRO, PARA VOCÊ VER A FORMA ════════
🔥 **O assunto deste exemplo — assinaturas esquecidas — é de OUTRO vídeo de propósito.** Copie a FORMA, nunca as palavras: se você repetir seis palavras seguidas de qualquer coisa aqui, o mapa é rejeitado, e o computador confere.

${JSON.stringify(ex, null, 2)}

Repare no que este exemplo faz: a promessa diz o que a pessoa LEVA; os três títulos prometem coisas diferentes; os três números são diferentes entre si; a soma do capítulo dois bate certo; e o fim responde à promessa falando da mesma coisa.

Responda APENAS com JSON válido, sem markdown, exatamente com estes campos:
{
  "promessa": "...",
  "fioCondutor": "...",
  "capitulos": [
    { "titulo": "...", "numeroChave": 0, "somaDe": [0, 0], "oQueFicaEmAberto": "..." },
    { "titulo": "...", "numeroChave": 0, "oQueFicaEmAberto": "..." },
    { "titulo": "...", "numeroChave": 0, "oQueFicaEmAberto": "..." }
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
1. **A 1ª FRASE É A CAPA DO VÍDEO, e é uma PERGUNTA que dói.**
   · Aparece ESCRITA na tela enquanto você a diz. No máximo ${MAX_PALAVRAS_CAPA} palavras, terminada em "?". O computador confere.
   · A dor tem de estar DENTRO da pergunta. ✗ "Você sabia?" (serve para qualquer vídeo do mundo)
   · Tem de funcionar sozinha: é a primeira coisa que a pessoa ouve na vida.
2. **A RESPOSTA VEM COLADA, na frase seguinte.** Pergunta pendurada é proibida neste canal. E a resposta não repete a pergunta — responde direto, seco.
3. **A PROMESSA DITA COM TODAS AS LETRAS**, ainda dentro da abertura. É o que os vídeos longos que prendem fazem, e os que não prendem não fazem. Diga o que a pessoa vai levar daqui.
⛔ Não peça NADA (comentário, inscrição, curtir, link). Isso acontece uma vez só, muito mais à frente.
⛔ Não diga o bordão do canal. Ele é a assinatura e vive na última frase do vídeo.
⛔ Não diga "Introdução", nem "hoje vamos falar sobre", nem "sem mais delongas".

⚠️ **TAMANHO: entre ${ORCAMENTO.abertura.min} e ${ORCAMENTO.abertura.max} palavras.** Conte antes de responder. É por aqui que este roteiro mais falha.

${REGRAS_DE_NUMERO}

${REGRAS_DE_FALA}

════════ UMA ABERTURA INTEIRA, PARA VER A FORMA ════════
🔥 **O assunto — conta de luz — é de OUTRO vídeo de propósito.** Copie a FORMA e o TOM. **Se repetir SEIS PALAVRAS SEGUIDAS deste exemplo, a abertura é rejeitada** — o computador confere.

  "${EXEMPLO_DE_ABERTURA.fala}"

Repare: a pergunta dói e a resposta vem colada · o caso é concreto e nomeado coisa a coisa · a promessa está lá, dita · e ninguém pede nada a ninguém.

Responda APENAS com JSON válido, sem markdown:
{ "fala": "..." }`;
}

/**
 * ⚠️ OS TRÊS MOLDES DA DEMONSTRAÇÃO — e por que são TRÊS, escolhidos por CÓDIGO.
 *
 * MEDIDO na 2ª corrida real (04/08/2026). O prompt dava UM molde ("eu joguei isso no
 * FinMoovi e ele me mostrou…") e os três capítulos saíram assim:
 *   cap 1: "Eu joguei essas contas no FinMoovi e ele fez a soma pra mim."
 *   cap 2: "Eu joguei tudo no FinMoovi e ele me mostrou na tela…"
 *   cap 3: "Eu joguei tudo no FinMoovi e ele fez a conta pra mim."
 * A trava global apanhou-o — mas a culpa não era do modelo: **ele obedeceu ao molde
 * que o prompt lhe deu, três vezes.** É a mesma doença de sempre, na forma mais
 * traiçoeira: o prompt ORDENA a frase que a trava global PUNE.
 *
 * A cura é a que já funcionou na música (`lib/musica.js`): **não se pergunta ao
 * modelo qual escolher.** Está medido neste projeto que, com opções à escolha, oito
 * gerações em oito escolhem a mesma. Cada capítulo recebe o SEU molde, decidido pelo
 * número do capítulo, e nunca vê os outros dois.
 */
const MOLDES_DA_DEMO = [
  'Você lança as contas no FinMoovi e ele soma sozinho. Conte o que apareceu na tela.',
  'Você abre a tela do FinMoovi e LÊ o que está lá escrito. Conte a linha que viu e o valor que estava nela.',
  'O FinMoovi já tinha aquilo marcado antes de você perguntar. Conte o que ele mostrou quando você foi ver.',
];

export function buildPromptCapitulo(t, mapa, indice, ancora) {
  const plano = mapa.capitulos[indice];
  const seguinte = mapa.capitulos[indice + 1];
  const molde = MOLDES_DA_DEMO[indice % MOLDES_DA_DEMO.length];
  const soma = Array.isArray(plano.somaDe) && plano.somaDe.length >= 2
    ? `\n   · **A soma é esta, e tem de bater:** ${plano.somaDe.join(' + ')} = ${plano.numeroChave}. Diga as parcelas UMA A UMA e depois o total, para quem ouve somar junto.`
    : '';

  return `${CABECALHO}

SUA TAREFA AGORA: escrever **SÓ O CAPÍTULO ${indice + 1} de ${NUM_CAPITULOS}** de um vídeo de seis minutos. Nem o que veio antes, nem o que vem depois.

${contexto(t)}
════════ O MAPA JÁ DECIDIDO (não o discuta, cumpra-o) ════════
A PROMESSA DO VÍDEO: "${mapa.promessa}"
**ESTE capítulo chama-se: "${plano.titulo}"**
   · **O número-chave deste capítulo é ${plano.numeroChave}** e ele TEM de ser dito na fala, por extenso. O computador confere.${soma}
   · Este capítulo tem de deixar no ar: ${plano.oQueFicaEmAberto}
${seguinte ? `O capítulo seguinte chama-se "${seguinte.titulo}" — o seu re-gancho tem de apontar para lá SEM dizer o nome dele.` : 'Este é o último capítulo. O re-gancho entrega a conversa ao fim do vídeo.'}

${ancora ? `${ancora}\n` : ''}
════════ AS QUATRO PARTES DESTE CAPÍTULO (é a forma que o canal já provou) ════════
1. **pergunta** (~4s de fala) — abre com uma PERGUNTA que dói, terminada em "?", e responde-lhe já na frase seguinte.
2. **desenvolvimento** (~45s) — o caso concreto do dia a dia, nomeado coisa a coisa, sem culpar quem assiste. É AQUI que **o número se transforma** à frente de quem ouve: o pequeno vira grande, o "nada" vira caro. Termine na tensão, não conforte.
3. **demonstracao** (~25s) — **o app FEZ a conta, e você conta na PRIMEIRA PESSOA.** O app é quem AGE, não é rodapé. **DIGA O QUE APARECEU NA TELA** — o nome da linha, o total, a coisa concreta. Frases como "me mostrou o estrago" não mostram nada.
   🔴 **A DEMONSTRAÇÃO DESTE CAPÍTULO É ASSIM, e só assim:** ${molde}
   Os outros capítulos deste vídeo demonstram o app de MANEIRA DIFERENTE. Se os três contarem a mesma cena com as mesmas palavras, quem assiste acha que já viu o vídeo e sai — e o computador reprova.
4. **regancho** (~10s) — deixa a ponta no ar para o capítulo seguinte. Uma ou duas frases, sem prometer nada de fora deste vídeo.

⚠️ **TAMANHO: as quatro partes somadas, entre ${ORCAMENTO.capitulo.min} e ${ORCAMENTO.capitulo.max} palavras.** Conte antes de responder.
⛔ **NÃO PEÇA NADA** — nem comentário, nem inscrição, nem curtir, nem link. Isso acontece UMA vez no vídeo, e não é aqui. Repetir o pedido a cada capítulo é o erro que mata o vídeo longo.
⛔ **NÃO DIGA O BORDÃO DO CANAL.** Ele é a assinatura e vive só na última frase do vídeo.
⛔ **NÃO USE O MOLDE "não é A, é B".** É a marca da escrita de robô. Diga só o B.
⛔ Metáfora quase não existe neste canal. No máximo UMA comparação no capítulo inteiro, com coisa que a pessoa já conhece, sempre comparada ("é tipo", "é que nem"), nunca definida.

${REGRAS_DE_NUMERO}

${REGRAS_DE_FALA}

${O_QUE_PODE_PROMETER}

════════ UM CAPÍTULO INTEIRO, PARA VER A FORMA ════════
🔥 **O assunto — comida que estraga na geladeira — é de OUTRO vídeo de propósito.** Copie a FORMA e o TOM. **Se repetir SEIS PALAVRAS SEGUIDAS deste exemplo, o capítulo é rejeitado** — o computador confere.

[PERGUNTA] ${EXEMPLO_DE_CAPITULO.pergunta}

[DESENVOLVIMENTO] ${EXEMPLO_DE_CAPITULO.desenvolvimento}

[DEMONSTRACAO] ${EXEMPLO_DE_CAPITULO.demonstracao}

[REGANCHO] ${EXEMPLO_DE_CAPITULO.regancho}

Repare: as três parcelas são ditas uma a uma e o total bate · o app aparece a FAZER, na primeira pessoa, e diz-se o que estava na tela · e o re-gancho deixa a ponta no ar sem prometer nada de fora.

Responda APENAS com JSON válido, sem markdown:
{ "pergunta": "...", "desenvolvimento": "...", "demonstracao": "...", "regancho": "..." }`;
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

function extrairJson(texto) {
  let s = String(texto).trim();
  const cerca = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (cerca) s = cerca[1].trim();
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a === -1 || b === -1) throw new Error('nenhum JSON na resposta do modelo');
  return JSON.parse(s.slice(a, b + 1));
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
      console.log(`  ⚠ ${nome} — tentativa ${i}/${tentativas}: JSON inválido`);
      continue;
    }

    for (const c of campos) {
      if (typeof obj[c] === 'string') obj[c] = limparFala(obj[c], tema);
    }

    const v = validar(obj);
    ultimo = { obj, v };
    if (v.ok) return { ...obj, _avisos: v.avisos || [], _tentativa: i, _palavras: v.palavras };

    corretivo = montarCorretivo(acumular(exigencias, v.erros));
    console.log(`  ⚠ ${nome} — tentativa ${i}/${tentativas} reprovada: ${v.erros.join(' | ')}`);
  }

  throw new Error(`o bloco "${nome}" não passou nas travas após ${tentativas} tentativas`
    + `${ultimo ? ` — última queixa: ${ultimo.v.erros.join(' | ')}` : ''}`);
}

// ═══ A ORQUESTRAÇÃO ═════════════════════════════════════════════════════════

export async function gerarMapa(t, { proibidas = [], tentativas = 3 } = {}) {
  const prompt = buildPromptMapa(t, proibidas);
  const exigencias = [];
  let corretivo = '';

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
    if (v.ok) return { mapa, avisos: v.avisos, tentativa: i };
    corretivo = montarCorretivo(acumular(exigencias, v.erros));
    console.log(`  ⚠ mapa — tentativa ${i}/${tentativas} reprovada: ${v.erros.join(' | ')}`);
  }
  throw new Error(`o mapa não passou na validação após ${tentativas} tentativas`);
}

/** As duas últimas frases de um texto — a âncora que o bloco seguinte recebe. */
const ultimasFrases = (txt, n = 2) => frasesDe(txt).slice(-n).join(' ');
const primeirasFrases = (txt, n = 2) => frasesDe(txt).slice(0, n).join(' ');

const falaDoCapitulo = (c) => PARTES_DO_CAPITULO.map((p) => String((c && c[p]) || '').trim()).filter(Boolean).join(' ');

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
    const feito = await gerarMapa(t, { proibidas });
    mapa = feito.mapa;
    caderno.mapa = mapa;
    guardar();
    console.log(`   ✅ mapa aprovado na tentativa ${feito.tentativa}`);
  }
  console.log(`   promessa: "${mapa.promessa}"`);
  mapa.capitulos.forEach((c, i) => {
    console.log(`   ${i + 1}. ${c.titulo}  ·  número-chave ${c.numeroChave}${c.somaDe ? ` (= ${c.somaDe.join(' + ')})` : ''}`);
  });
  console.log(`   fim: "${mapa.respostaDaPromessa}"`);
  console.log(`   imagem da capa: ${mapa.fioCondutor}`);

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
    const plano = mapa.capitulos[i];
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
        campos: PARTES_DO_CAPITULO,
        validar: (o) => validarCapitulo(o, i, { plano, exemploParaComparar: EXEMPLO_PARA_COMPARAR }),
      });
      completo = { ...Object.fromEntries(PARTES_DO_CAPITULO.map((p) => [p, cap[p]])), titulo: plano.titulo, numeroChave: plano.numeroChave, somaDe: plano.somaDe };
      caderno.capitulos[i] = completo;
      guardar();
      console.log(`   ✅ capítulo ${i + 1} — ${cap._palavras} palavras (tentativa ${cap._tentativa})`);
    }
    capitulos.push(completo);

    numerosUsados.push(plano.numeroChave, ...(plano.somaDe || []));
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
      frasesDe(completo.demonstracao)[0],
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
      const plano = mapa.capitulos[i];
      const conferir = (cand) => validarCapitulo(cand, i, { plano, exemploParaComparar: EXEMPLO_PARA_COMPARAR });
      const limpar = (cand) => ({
        ...cand,
        ...Object.fromEntries(PARTES_DO_CAPITULO.map((p) => [p, limparFala(cand[p], temaTexto)])),
      });
      const lido = await polirCapitulo(
        roteiro.capitulos[i],
        { titulo: plano.titulo, promessa: mapa.promessa, posicao: i + 1, total: roteiro.capitulos.length },
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

    const plano = mapa.capitulos[alvo];
    const anteriores = roteiro.capitulos.filter((_, i) => i !== alvo);
    const ancora = blocoDaAncora({
      paragrafoAnterior: alvo > 0 ? ultimasFrases(falaDoCapitulo(roteiro.capitulos[alvo - 1])) : ultimasFrases(roteiro.abertura),
      deQuem: alvo > 0 ? `o capítulo ${alvo}` : 'a abertura',
      numerosUsados: mapa.capitulos.filter((_, i) => i !== alvo).flatMap((c) => [c.numeroChave, ...(c.somaDe || [])]),
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
        campos: PARTES_DO_CAPITULO,
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
    juntar(validarCapitulo(c, i, { plano: mapa.capitulos[i] || {}, exemploParaComparar: EXEMPLO_PARA_COMPARAR }));
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

  const recentes = loadRecentPublishedContext();
  const proibidas = [...new Set(recentes.flatMap((r) => r.metaphors || []))].filter((m) => m !== 'clique-link');
  if (proibidas.length) console.log(`🚫 imagens já usadas nos vídeos recentes: ${proibidas.join(', ')}`);

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
    PARTES_DO_CAPITULO.forEach((p) => console.log(`  · ${c[p]}`));
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
}
