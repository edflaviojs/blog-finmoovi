/**
 * PASSAGEM 1 — A NARRAÇÃO (IMPLEMENTACAO20 §17.6 / §19).
 *
 * Gera APENAS o texto falado do Short: 6 blocos encadeados, sem uma palavra sobre
 * visuais. A coreografia (shots, ícones, sons, âncoras) é a PASSAGEM 2 e não entra
 * aqui — de propósito.
 *
 * POR QUE EXISTE. O prompt de `roteiro-short.js` tem ~25.300 chars e mede-se assim:
 * coreografia visual 11.702 · estrutura da narrativa 2.965 · fala fluida/intro 2.779
 * · moldura do app 2.381. **Mais de metade do prompt ensina a ANIMAR; menos de um
 * quarto ensina a ESCREVER.** O modelo faz uma coisa de cada vez e a atenção vai
 * para onde há mais instrução — daí o texto do vídeo `SZSGAxqmmm0`, que o dono
 * resumiu assim: "eu estou olhando isso 10 vezes e ainda não entendi".
 *
 * Este ficheiro é NOVO e não é chamado por nada em produção — o pipeline atual
 * continua intacto até o dono aprovar o texto que sai daqui.
 *
 * Uso:
 *   node src/scripts/youtube/roteiro-narrativa.js --slug=juros-compostos
 *   node src/scripts/youtube/roteiro-narrativa.js --slug=EDITORIAL:tesouro-direto-100
 */

import { generateText } from '../apis/kie-ai.js';
import { BORDAO, METAPHORS, longestSharedWordRun } from './lib/schema-short.js';
/**
 * ⚠️ IMPORTADO DA PASSAGEM 2 DE PROPÓSITO, e não copiado.
 *
 * É esta função que a passagem 2 usa para decidir se o gancho diz alguma palavra do
 * tema. Se aqui houvesse uma cópia, as duas passagens acabariam a divergir — e é
 * exatamente esse o modo de falha crónico deste repositório. Uma regra, um sítio.
 * (Não há ciclo: `coreografia.js` só importa este ficheiro dentro do bloco de
 * execução direta, e por importação dinâmica.)
 */
import { keywordFalada, MAX_PALAVRAS_CAPA } from './lib/palavras.js';
// O segundo leitor: quem arruma a FALA depois de o código garantir a VERDADE.
import { revisarFala } from './lib/segundo-leitor.js';
import { PERSONA, VICIOS_ESSENCIAIS, O_QUE_PRESERVAR } from './lib/voz-do-canal.js';
import { loadRecentPublishedContext } from './roteiro-short.js';
import { montarFichaDeNumeros } from './lib/simulador.js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const GLOSSARIO_DIR = join(process.cwd(), 'src', 'content', 'glossario');
const TOPICS_PATH = join(process.cwd(), '.github', 'data', 'youtube-topics.json');

const args = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => {
    const [k, ...v] = a.slice(2).split('=');
    return [k, v.join('=') || true];
  }),
);

// ─── leitura do tema (mesma fonte do roteiro-short) ──────────────────────────
function lerFrontmatter(caminho) {
  const raw = readFileSync(caminho, 'utf-8');
  const partes = raw.split('---');
  if (partes.length < 3) return null;
  const fm = partes[1];
  const body = partes.slice(2).join('---').trim();
  const pick = (k) => (fm.match(new RegExp(`${k}:\\s*"?([^"\\n]+)"?`)) || [])[1]?.trim();
  return { term: pick('term'), definition: pick('definition'), category: pick('category'), body };
}

// exportada em 31/07/2026 para a passagem 2 (`coreografia.js`) ler o mesmo tema
export function lerTema(slug) {
  if (slug.startsWith('EDITORIAL:')) {
    const id = slug.slice('EDITORIAL:'.length);
    const data = JSON.parse(readFileSync(TOPICS_PATH, 'utf-8'));
    const topic = (data.topics || []).find((t) => t.id === id);
    if (!topic) throw new Error(`tema editorial não encontrado: ${id}`);
    const out = { slug: id, term: topic.theme, angle: topic.angle, definition: '', category: topic.pillar || 'basico', body: '' };
    if (topic.glossaryRef) {
      const p = join(GLOSSARIO_DIR, `${topic.glossaryRef}.md`);
      if (existsSync(p)) {
        const fm = lerFrontmatter(p);
        if (fm) { out.definition = fm.definition || ''; out.body = fm.body || ''; }
      }
    }
    return out;
  }
  const p = join(GLOSSARIO_DIR, `${slug}.md`);
  if (!existsSync(p)) throw new Error(`termo não encontrado: ${p}`);
  const fm = lerFrontmatter(p);
  return { slug, term: fm?.term || slug, definition: fm?.definition || '', category: fm?.category || 'basico', body: fm?.body || '' };
}

const cortar = (txt, max = 1500) => {
  if (!txt || txt.length <= max) return txt || '';
  const c = txt.slice(0, max);
  return `${c.slice(0, Math.max(0, c.lastIndexOf(' ')))}… (trecho)`;
};

/**
 * AS PALAVRAS DE CADA IMAGEM — e por que TODAS as imagens as recebem (31/07/2026).
 *
 * MEDIDO: das 8 gerações que passaram na validação, **8 escolheram "semente"**. Não
 * foi acaso. O prompt anterior nomeava "semente" 2×, "raiz" 5×, e dava plantar/
 * brotar/colher como o ÚNICO exemplo completo de fio condutor — nenhuma das outras
 * 7 imagens era sequer citada. O modelo não escolhia: copiava o único exemplo.
 *
 * ♦ Desde 03/08/2026 estas palavras servem só ao MENU (ajudam o modelo a escolher
 * a imagem certa para a CAPA VISUAL) — o dicionário de validação `PALAVRAS_DO_FIO`
 * foi removido junto com as travas do fio falado. As dicas continuam para todas
 * as imagens partirem em pé de igualdade na escolha.
 */
const DICAS_DO_FIO = {
  'bola-neve': 'bola de neve, rolar, ladeira',
  avalanche: 'avalanche, desabar, desmoronar',
  escorregao: 'escorregar, tropeçar, derrapar',
  foguete: 'foguete, decolar, propulsão',
  semente: 'plantar, brotar, raiz, colher',
  'montanha-russa': 'montanha-russa, sobe e desce, looping',
  bolha: 'bolha, inflar, estourar',
  ralo: 'ralo, escoar, escorrendo, vazar, torneira',
  // leva 1 da ampliação (IMPLEMENTACAO20 §20.2 B1)
  ampulheta: 'ampulheta, o tempo escorre, o prazo',
  balanca: 'balança, pesar, pender para um lado',
  'bola-de-ferro': 'bola de ferro, corrente, arrastar, acorrentado',
  'guarda-chuva': 'guarda-chuva, chuva, ficar seco',
  // leva 2
  ratoeira: 'ratoeira, armadilha, isca, fechar',
  'mochila-pedras': 'mochila, pedra, peso nas costas, carregar',
  'areia-movedica': 'areia movediça, afundar, se debater',
  domino: 'dominó, derrubar, cair em cadeia',
  // leva 3
  'castelo-cartas': 'castelo de cartas, vir abaixo, ruir',
  gangorra: 'gangorra, sobe e desce, um lado pro outro',
  'corda-bamba': 'corda bamba, equilíbrio, sem rede',
  relogio: 'relógio, ponteiro, o tempo correndo',
  // leva 4
  vela: 'vela, queimar, derreter, chama',
  'trem-perdido': 'trem, plataforma, perder o trem',
  bifurcacao: 'bifurcação, dois caminhos, encruzilhada',
  'duas-portas': 'duas portas, abrir uma, a outra fica fechada',
  // leva 5
  semaforo: 'semáforo, sinal verde, sinal vermelho',
  cofre: 'cofre, trancar, guardado',
  escudo: 'escudo, aparar o golpe, blindado',
  boia: 'boia, te segura, ficar à tona',
  // leva 6 (última)
  escada: 'escada, degrau, um de cada vez',
  'balde-furado': 'balde furado, furo, perde por baixo',
  buraco: 'buraco, cavar, mais fundo',
  fumaca: 'fumaça, virar fumaça, sobe e não volta',
};

/**
 * O MAPA TIPO-DE-TEMA → IMAGEM (IMPLEMENTACAO20 §20.2 B3, 31/07/2026).
 *
 * POR QUE SÓ AGORA. Isto foi pedido em §19.7 e ADIADO de propósito: com 8 imagens
 * úteis e 5 bloqueadas pela janela, filtrar por família deixaria UMA ou ZERO
 * opções — seria empilhar trava sobre trava. Com 32 imagens (8 famílias × 4)
 * passou a fazer sentido.
 *
 * O QUE ISTO É E O QUE NÃO É. Não é uma trava nova: é **encurtar o menu** antes de
 * o modelo escolher. Ele não pode escolher mal aquilo que não lhe é oferecido —
 * o mesmo princípio do simulador de números (§19.3) e da correção de 31/07 aos
 * exemplos do prompt (§19.9).
 *
 * ⚠️ É uma PREFERÊNCIA, não uma prisão: se a família ficar sem nenhuma imagem
 * livre, abre-se o catálogo todo e **escreve-se um aviso no log** — trava que
 * aborta em silêncio é armadilha (regra deste repositório).
 */
export const FAMILIAS_DE_IMAGEM = {
  crescer: ['bola-neve', 'foguete', 'semente', 'escada'],
  vazar: ['ralo', 'balde-furado', 'buraco', 'fumaca'],
  divida: ['bola-de-ferro', 'ratoeira', 'mochila-pedras', 'areia-movedica'],
  queda: ['escorregao', 'avalanche', 'domino', 'castelo-cartas'],
  risco: ['montanha-russa', 'bolha', 'gangorra', 'corda-bamba'],
  tempo: ['ampulheta', 'relogio', 'vela', 'trem-perdido'],
  decidir: ['balanca', 'bifurcacao', 'duas-portas', 'semaforo'],
  proteger: ['guarda-chuva', 'cofre', 'escudo', 'boia'],
};

// As palavras do TEMA que apontam para cada família. Propositadamente específicas:
// uma palavra vaga (ex.: "dinheiro") apontaria para tudo e não decidiria nada.
// ⚠️ Sem plurais quando o singular já os apanha ("erro" apanha "erros"): duas
// pistas para a mesma ideia contam DOIS pontos e falseiam a comparação.
const PISTAS_DE_TEMA = {
  crescer: ['investir', 'investimento', 'rendimento', 'render', 'juros compostos', 'aporte', 'poupar', 'poupanca', 'acumular', 'patrimonio', 'longo prazo', 'cdb', 'tesouro', 'selic', 'dividendo', 'renda passiva'],
  vazar: ['taxa', 'tarifa', 'desperdicio', 'gasto', 'inflacao', 'assinatura', 'mensalidade', 'vazamento', 'para onde vai', 'sumindo', 'corroe'],
  divida: ['divida', 'cartao', 'rotativo', 'parcelamento', 'financiamento', 'emprestimo', 'cheque especial', 'negativado', 'amortizacao', 'quitar', 'fatura'],
  queda: ['erro', 'engano', 'nunca faca', 'cilada', 'furada', 'besteira', 'deslize', 'armadilha do'],
  risco: ['risco', 'volatilidade', 'oscila', 'bolsa', 'acoes', 'cripto', 'bitcoin', 'especula', 'aposta', 'day trade', 'alavancagem'],
  tempo: ['prazo', 'adiar', 'procrastin', 'comecar cedo', 'com que idade', 'anos antes', 'tarde demais', 'agora ou nunca', 'aposentadoria'],
  decidir: ['comparacao', 'comparar', 'lado a lado', 'melhor opcao'],
  proteger: ['reserva de emergencia', 'emergencia', 'seguro', 'imprevisto', 'colchao', 'protecao', 'se der errado'],
};

/**
 * MARCADORES FORTES — ganham sozinhos, sem contagem.
 * "Poupança vs CDB" é uma COMPARAÇÃO, mesmo tendo duas palavras de investimento:
 * o vídeo é sobre escolher, não sobre render. Sem esta regra, "poupanca" + "cdb"
 * faziam 2 pontos em `crescer` e ganhavam ao " vs " — medido em 31/07.
 */
const MARCADORES_FORTES = {
  decidir: [' vs ', 'versus', 'qual e melhor', 'qual o melhor', 'qual rende mais', 'diferenca entre', 'vale mais a pena', 'quem ganha'],
};

/**
 * Ordem de desempate. `queda` fica em ÚLTIMO de propósito: "3 erros de cartão" tem
 * "erro" (queda) e "cartão" (dívida) — mas "erro" é a MOLDURA do vídeo, e "cartão"
 * é o ASSUNTO. A imagem tem de nascer do assunto.
 */
const PRIORIDADE_DE_FAMILIA = ['divida', 'proteger', 'vazar', 'risco', 'tempo', 'crescer', 'decidir', 'queda'];

const semAcentos = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * Decide a família do tema. Devolve `null` quando NÃO HÁ SINAL NENHUM — nesse caso
 * o menu abre para o catálogo todo, porque restringir para o lado errado é pior do
 * que não restringir.
 */
export function familiaDoTema(texto) {
  const t = semAcentos(` ${texto} `);
  for (const [fam, marcas] of Object.entries(MARCADORES_FORTES)) {
    if (marcas.some((m) => t.includes(semAcentos(m)))) return fam;
  }
  const pontos = Object.entries(PISTAS_DE_TEMA)
    .map(([fam, pistas]) => [fam, pistas.filter((p) => t.includes(semAcentos(p))).length])
    .filter(([, n]) => n > 0);
  if (!pontos.length) return null;
  const maximo = Math.max(...pontos.map(([, n]) => n));
  const empatadas = pontos.filter(([, n]) => n === maximo).map(([fam]) => fam);
  return PRIORIDADE_DE_FAMILIA.find((fam) => empatadas.includes(fam)) || empatadas[0];
}

/**
 * O menu que vai ao prompt: catálogo − clique-link − proibidas, e depois filtrado
 * pela família SE isso ainda deixar alguma imagem. Devolve também o aviso, para
 * quem chama o escrever no log.
 */
export function escolherImagens(temaTexto, proibidas = []) {
  const livres = METAPHORS.filter((m) => m !== 'clique-link' && !proibidas.includes(m));
  const familia = familiaDoTema(temaTexto);
  if (!familia) return { lista: livres, familia: null, aviso: null };
  const daFamilia = livres.filter((m) => (FAMILIAS_DE_IMAGEM[familia] || []).includes(m));
  if (!daFamilia.length) {
    return {
      lista: livres,
      familia,
      aviso: `a família "${familia}" não tem nenhuma imagem livre (todas nos ${proibidas.length} vídeos recentes) — o menu abriu para o catálogo todo`,
    };
  }
  return { lista: daFamilia, familia, aviso: null };
}

// ─── o prompt ────────────────────────────────────────────────────────────────
// PODADO de propósito: só entra aqui o que muda o TEXTO. Nada de ícones, sons,
// tempo de tela, tipos de visual, âncoras ou JSON de shots.
export function buildPromptNarrativa(t, proibidas, frasesRecentes, ficha = null) {
  const bloqueadas = proibidas.length ? proibidas.join(', ') : '(nenhuma ainda)';
  // o menu já vem filtrado pela família do tema (ver `escolherImagens`)
  const disponiveis = escolherImagens(`${t.term || ''} ${t.angle || ''} ${t.definition || ''}`, proibidas).lista;
  const menuDeImagens = disponiveis.map((m) => `${m} (${DICAS_DO_FIO[m] || m})`).join(' · ');
  // O alvo de tamanho sai das MESMAS constantes que a validação usa — escrever "117"
  // à mão aqui era deixar o prompt e a trava separarem-se no primeiro ajuste.
  const porBloco = `${Math.round(MIN_PALAVRAS / 6)} a ${Math.round(MAX_PALAVRAS / 6)}`;
  const evitarFrases = frasesRecentes.length
    ? `\nJÁ FOI DITO nos vídeos recentes (não repita nem parafraseie): ${frasesRecentes.map((f) => `"${f}"`).join(' · ')}`
    : '';

  return `Você é ROTEIRISTA de um canal brasileiro de finanças pessoais.

🇧🇷 **ESCREVA EM PORTUGUÊS DO BRASIL FALADO, e só nele.** Quem assiste é brasileiro; um jeito de falar de Portugal soa estrangeiro e a pessoa sai.
   ✓ tela, celular, ônibus, trem, gerente, "tá", "a gente", "você"
   ✗ ecrã, telemóvel, autocarro, comboio, "está a fazer", "tu", "casa de banho"
   ⚠️ **"está a fazer" não existe no Brasil.** No Brasil é "está fazendo" — ou, melhor ainda na fala, "tá fazendo".

════════ QUEM ESTÁ FALANDO, E COM QUEM ════════
${PERSONA}
Ele não sabe o que é "rotativo", "amortizar", "drenagem" ou "estratégia". Se você usar uma palavra dessas, ele desliga.
${VICIOS_ESSENCIAIS}
${O_QUE_PRESERVAR}
⛔ **NADA DE FRASE DE CARTAZ.** O maior defeito deste canal é a frase que parece escrita para um slide e não dita por uma pessoa.
   ✗ "Três erros de cartão são pedras na sua mochila." (foi ao ar; o dono: *"se alguém falar isso num vídeo curto, a pessoa já sai — isso está robótico"*)
   ✓ "Sabe esses três errinhos no cartão? É que nem carregar pedra na mochila."
   A diferença: a segunda tem alguém a falar. A primeira é uma legenda.
   A imagem entra sempre COMPARADA ("é tipo", "parece", "é que nem"), nunca definida ("X são Y").

⛔ **A IMAGEM NÃO PODE CONTRADIZER-SE.** Ela tem de funcionar do princípio ao fim, com a física dela.
   ✗ "…ESVAZIANDO a mochila um pouquinho de cada vez." (o que a enche são pedras: fica mais PESADA, nunca mais vazia)
   ✓ "…pondo mais uma pedra de cada vez."

SUA ÚNICA TAREFA AGORA: escrever a NARRAÇÃO falada de um vídeo curto (${Math.round(MIN_PALAVRAS / 2.6)} a ${Math.round(MAX_PALAVRAS / 2.6)} segundos de fala).
NÃO descreva imagens, ícones, sons, efeitos ou cortes. Só o texto que a voz vai falar. Outra pessoa cuida do visual depois.

⚠️ TAMANHO — É POR AQUI QUE ESTE ROTEIRO MAIS FALHA. A narração INTEIRA tem de ter entre ${MIN_PALAVRAS} e ${MAX_PALAVRAS} palavras. **Conte as palavras antes de responder.**
O orçamento NÃO é igual para todos, porque o bloco 1 carrega a frase da capa:
· **bloco 1 (gancho): até ${ORCAMENTO_BLOCO1} palavras** — sendo até ${MAX_PALAVRAS_CAPA} na frase da capa e o resto na história.
· **blocos 2 a 6: até ${ORCAMENTO_OUTROS} palavras CADA UM.**
Isto é uma troca, não uma licença: o que o bloco 1 ganha, os outros cinco têm de dar. Somando, dá ${MAX_PALAVRAS}.

TEMA: "${t.term}"${t.angle ? `\nÂNGULO: ${t.angle}` : ''}
${t.definition ? `DEFINIÇÃO: ${t.definition}\n` : ''}${t.body ? `MATERIAL DE APOIO:\n${cortar(t.body)}\n` : ''}${ficha ? `
════════ FICHA DE NÚMEROS — JÁ CALCULADA, NÃO REFAÇA A CONTA ════════
${ficha.texto}

Estes valores foram calculados por computador com as taxas oficiais do Banco Central. **Toda conta de rendimento (quanto vira, quanto rende, a diferença) usa SÓ estes números**, sem arredondar para outro valor.
⛔ É PROIBIDO citar qualquer taxa ou percentagem que não esteja aqui em cima.
Números de HISTÓRIA (o que o narrador conta que somou ou viu na tela: "cinquenta aqui, oitenta ali") podem existir — redondos, modestos, do dia a dia — mas NUNCA prometendo rendimento.
` : `
⛔ NÚMEROS — este tema NÃO tem conta calculada, então:
· PROIBIDO citar percentagem, taxa ou rendimento ("rende tanto", "vira tanto com juros") — este canal não tem como conferir, e um número financeiro errado no ar é o defeito mais perigoso que existe aqui.
· Números de HISTÓRIA podem existir (o que o narrador conta que somou, pagou ou viu na tela do app: "somei e deu novecentos") — redondos, modestos, do dia a dia. A soma tem de bater: se você diz as parcelas, o total é a soma delas.
`}
════════ A REGRA MAIOR — CADA BLOCO ABRE PEGANDO NO ANTERIOR ════════
O vídeo é UMA fala contínua, não uma lista de frases bonitas. **As PRIMEIRAS PALAVRAS de cada bloco têm de agarrar aquilo que o bloco anterior acabou de dizer.**

✗ SOLTO (o exemplo é de OUTRO assunto de propósito):
   bloco 2: "No fim do mês a conta de luz chega mais alta, e ninguém sabe porquê."
   bloco 3: "Organizar o dinheiro é um hábito importante."
   Por quê: o bloco 3 ignora a conta de luz que o 2 acabou de apontar e começa um assunto novo. Duas frases que não se conhecem.

✓ ENCADEADO (a mesma ideia, agora presa à anterior):
   bloco 3: "O porquê tava no chuveiro. Vinte minutos por dia, todo dia, e a conta sobe sozinha."
   Por quê: abre respondendo ao "porquê" que tinha ficado no ar na frase anterior. Quem ouve não consegue sair no meio.

⛔ **RETOMAR NÃO É ECOAR.** Não abra um bloco repetindo a última palavra do anterior como pergunta solta. Isso cumpre a forma e mata a fala.
   ✗ "…faz a dívida crescer." → "Crescer assim? No FinMoovi…"
   ✗ "…a dica completa."      → "Completa? O que pesa mais…"
   ✓ "…faz a dívida crescer." → "E é aí que ela cresce sem você ver: no FinMoovi…"
   Toda abertura de bloco é uma FRASE INTEIRA, com sujeito e verbo. Nunca uma palavra com ponto de interrogação.

⛔ **A ÚNICA EXCEÇÃO A ESTA REGRA: o bloco 6 NÃO pega no bloco 5.** O convite é um pedido a quem assiste — sai da história. Se o fecho pegar nele, o vídeo acaba a falar do blog e do app em vez de responder à pergunta que abriu tudo. **O bloco 6 agarra o BLOCO 1.**
   ✗ "O blog mostra que o mínimo é o que mais pesa…" (foi ao ar; o dono reprovou — o vídeo não fecha a falar do blog)

⛔ NENHUMA PALAVRA NOVA SEM PREPARAÇÃO. Não introduza um assunto que ninguém apresentou.
   ✗ "Mas não é o JUROS que te aprisiona…" — juros nunca tinha sido mencionado, cai do céu.
   ✗ "…é o PAGAMENTO MÍNIMO" dito só no último bloco, sem nunca ter aparecido antes.
   Se precisa de um conceito novo, apresente-o na frase em que ele entra.

O teste: leia os dois blocos seguidos em voz alta. Se houver um salto de assunto no meio — se quem ouve puder perguntar "espera, de onde veio isso?" — reescreva a emenda. (Uma frase curta e seca que continua o MESMO assunto não é salto: "Ela cresceu." depois da conta é emenda perfeita.)

✗ ERRADO (foi ao ar e ninguém entendeu):
   "Tesouro Direto com 100 reais, vale a pena? Se liga no que eu descobri: 100 reais todo mês, 24 vezes. É como uma pequena avalanche. Qual rendimento?"
   Por quê: "24 vezes" o quê? "avalanche" de quê? a pergunta final cai do céu. São quatro pedaços que não se conhecem.

✓ CERTO (o mesmo assunto, encadeado — e repare que abre PERGUNTANDO e responde já):
   "Você acha que cem reais por mês não mudam nada? Eu fiz a conta de guardar isso por dois anos seguidos… e o número me assustou. Porque quem faz o trabalho ali é o tempo."
   Por quê: a 2ª frase responde à 1ª, a 3ª explica a 2ª. Ninguém consegue sair no meio.

════════ UM VÍDEO INTEIRO, PARA VOCÊ VER A FORMA ════════
🔥 **ESTE EXEMPLO AUTODESTRÓI-SE.** Copie a FORMA e o TOM. **Se você repetir SEIS PALAVRAS SEGUIDAS de qualquer frase abaixo, o roteiro é rejeitado** — sem exceção, e o computador confere. O canal publica todos os dias: se cada vídeo repetir estas frases, todos soam iguais.
⛔ O assunto do exemplo — tarifa de pacote de conta — é de OUTRO vídeo de propósito. O SEU assunto é o TEMA lá em cima.

${EXEMPLO_DE_FORMA.map((f, i) => `  ${i + 1}. "${f}"`).join('\n')}

Repare no que esse exemplo faz, porque é isso que se pede a você:
· abre com uma PERGUNTA que dói e dá o choque na frase seguinte, sem repetir a pergunta;
· UMA ideia do princípio ao fim, e um NÚMERO que se transforma (trinta e nove por mês… quase quinhentos no ano);
· o app aparece FAZENDO, na primeira pessoa — "joguei isso no FinMoovi e ele me marcou" — nunca citado de passagem;
· frases curtas, de gente: "Ninguém pediu. Ninguém olha.";
· o fecho responde à pergunta da capa e só então vem o bordão.

════════ A ESPINHA (6 blocos, nesta ordem) ════════
1. GANCHO (~7s): **a 1ª FRASE É A CAPA DO VÍDEO, e ela é uma PERGUNTA que dói.**

   ⚡ **A PRIMEIRA FRASE APARECE ESCRITA NA TELA ENQUANTO VOCÊ A DIZ.** É a capa: letras grandes, com o boneco encenando a dor. Quem tá passando o dedo lê e ouve a mesma coisa ao mesmo tempo — e é isso que faz o dedo parar.
   · **É uma PERGUNTA** — de dor, de vergonha ou de provocação — dirigida a quem assiste ("você"). Termina com "?". O computador confere.
   · **NO MÁXIMO ${MAX_PALAVRAS_CAPA} PALAVRAS.** A capa fica na tela o tempo exato de a dizer; mais do que isso e ela sai a meio da frase.
   · Tem de funcionar SOZINHA, sem nada antes. É a primeira coisa que a pessoa ouve na vida.
   · 🔴 **A RESPOSTA VEM NA FRASE SEGUINTE, no MESMO bloco.** Pergunta pendurada é proibida neste canal: você pergunta e já dá o choque, o dado ou a resposta. E a resposta NÃO repete a pergunta — responde direto, seco.
   ✗ "Você não vai acreditar nisso!" (nem é pergunta, nem diz o que está em jogo)
   ✗ "Você sabia?" (pergunta vazia — serve para qualquer vídeo do mundo; a dor tem de estar DENTRO da pergunta)
   ✗ "Descubra o segredo dos bancos." (falso segredo, e continua sem perguntar nada)
   ⚠️ Os exemplos abaixo são de OUTROS assuntos de propósito, e o computador confere: **copiar um deles reprova o roteiro.** Veja a FORMA — a dor concreta dentro da pergunta, e o choque colado nela — e escreva a sua.
${EXEMPLOS_DE_CAPA.map((f) => `   ✓ "${f}"`).join('\n')}
   · **O TEMA entra de preferência já na pergunta da capa** — quem clicou no título precisa ouvir o assunto logo. Se não couber com naturalidade, ele TEM de ser dito até ao fim do bloco 2. O computador confere.
   · A imagem do catálogo (lá embaixo) vive na CAPA VISUAL — você NÃO precisa de falar dela aqui.
2. EMPATIA (~8s): o caso CONCRETO do dia a dia — as coisinhas que compõem o problema, nomeadas uma a uma, em frases curtas. É isso que acontece com gente normal (correria, cansaço, ninguém ensinou). Sem culpar quem assiste.
3. A VIRADA (~10s): **O NÚMERO SE TRANSFORMA à frente de quem ouve.** O pequeno vira grande, o "nada" vira caro, o que parecia seguro cresce. **É a transformação que prende** — um valor antes, um valor depois, e o susto no meio.
   ⛔ Número de CONTA (quanto rende, quanto vira com juros) SÓ da FICHA lá em cima. Sem ficha, faça a virada SEM prometer rendimento: a soma que ninguém tinha feito, o acumulado do ano, a verdade que aparece.
   ⛔ **NÃO USE O MOLDE "não é A, é B".** Ele está na lista de vícios aí em cima, é a marca da escrita de robô, e já foi ao ar neste canal. **Diga só o B**, como quem conta uma coisa que a pessoa ainda não sabia.
   ⛔ TERMINE NA TENSÃO. Depois de virar, NÃO explique. Explicação depois da virada mata a virada. Depois da virada, ou você CALA, ou aumenta a tensão. Nunca conforta.
4. A DEMONSTRAÇÃO (~9s): **o app FEZ a conta — e você conta na PRIMEIRA PESSOA.** "Eu joguei isso na calculadora do FinMoovi e ela me mostrou…", "eu somei as minhas no FinMoovi e deu…". O número que assustou no bloco 3 é o app que produziu — é por isso que quem ouve vai querer o número DELA. **O app é quem AGE, não é rodapé.**
   ⛔ NO MÁXIMO DOIS valores em dinheiro neste bloco. Três ou mais viram boletim de banco e a pessoa desliga.
   ✗ "Cem reais dão dois mil seiscentos e noventa e nove; na poupança dá dois mil seiscentos e doze. A diferença são oitenta e seis. No FinMoovi basta abrir a calculadora." (três números empilhados e o app no fim, como enfeite)
   ✓ "Eu joguei isso na calculadora do FinMoovi e ela me mostrou uma diferença de oitenta e seis reais. Só de escolher onde deixar o dinheiro."
   ⛔ **DIGA O QUE APARECEU NA TELA.** Frases como "mostrou onde o dinheiro aperta" ou "mostrou o estrago" não mostram nada — quem ouve fica na mesma.
   Diga a coisa CONCRETA: o nome da linha, a soma marcada, qual ficou em primeiro lugar, ou um valor **que já exista** neste roteiro.
   ⚠️ **NÃO invente número nenhum para cumprir isto.** Se não houver um valor à mão, nomeie a COISA — é igualmente concreto e é verdade.
5. O CONVITE (~6s): a pessoa acabou de ver um número que assustou ou animou — e ela quer o DELA. Mande-a PROCURAR o app pelo nome, e diga que tem sete dias grátis. Molde a adaptar: "quer ver o SEU? procura FinMoovi. São sete dias grátis."
   ⛔ **NUNCA diga que o app é "grátis", "de graça" ou "gratuito" sem mais nada.** O FinMoovi é um TESTE de sete dias, e depois disso é pago. Dizer só "é grátis" é propaganda enganosa — já rendeu queixas de gente que se sentiu enganada (ordem do dono, 12/08/2026). Diga sempre o prazo: "sete dias grátis".
   ✗ "Procura FinMoovi. É de graça." (a pessoa entende que o app inteiro é grátis para sempre — e não é)
   ⛔ **NÃO PEÇA COMENTÁRIO E NÃO MANDE CLICAR EM NADA.** Este mesmo vídeo sai em OITO redes ao mesmo tempo, mais o YouTube — e a automação que responde ao comentário só existe em duas delas. Nas outras a pessoa comentaria e não receberia nada: promessa quebrada é pior do que chamada nenhuma. O "comenta FINMOOVI" continua a existir, mas ESCRITO na legenda do Instagram e do YouTube, onde há robô a cumpri-lo — e a automação dispara pelo comentário, não pelo áudio. O computador confere.
   ✗ "Comenta FINMOOVI aqui embaixo que eu te mando o app." (só funciona em duas das nove)
   ✗ "O link tá aqui embaixo." (no Instagram e no TikTok o endereço na legenda é texto morto, não dá para clicar)
   ✓ "Quer ver o seu? Procura FinMoovi. São sete dias grátis."
6. O FECHO (~7s): **RESPONDA, com todas as letras, a PERGUNTA DA CAPA** — é a lição do vídeo numa frase, curta e dura, do tipo que se repete para um amigo. Sem "tchau", sem "até a próxima".
   ⛔ **NÃO termine com outra pergunta.** O fecho é quem responde, não quem pergunta.
   ✗ "…e quando você corta, os quinhentos reais voltam pra você. E agora?" (foi ao ar; o dono: *"o que é 'e agora'???"*)
   ⛔ **O FECHO NÃO CITA FONTE NENHUMA.** Nada de blog, app, FinMoovi, comentário, link, canal ou inscrição neste bloco. O app é do bloco 4, o comentário é do bloco 5; aqui só cabe a RESPOSTA e a assinatura. O computador confere.
   ✗ "O blog mostra que o mínimo é o que mais pesa." (foi ao ar e o dono reprovou)
   ✗ "Depois de comentar você vai ver que…" (pega no convite em vez da história)
   É AQUI, e só aqui, que entra o bordão do canal — como assinatura, na última frase.

════════ A IMAGEM DA CAPA (o campo "fioCondutor") ════════
Escolha UMA imagem do catálogo — é ela que vira a CENA DA CAPA (o boneco encenando a dor da pergunta) e que escolhe a música do vídeo. Escolha a que COMBINA com a dor deste tema.
Escolha entre: ${menuDeImagens}.
⚠️ **Você NÃO precisa de falar da imagem na narração — e o normal é NÃO falar.** Ela vive no VISUAL. A metáfora falada quase desapareceu deste canal: quem prende é o NÚMERO que se transforma, não a comparação. Se uma comparação ajudar MESMO, é no máximo UMA no vídeo inteiro, com coisa que a pessoa já conhece, sempre comparada ("é tipo", "é que nem"), nunca definida ("X são Y") — e nunca uma imagem que obrigue quem ouve a segurar duas histórias na cabeça ao mesmo tempo.
⛔ PROIBIDAS (já usadas nos vídeos recentes): ${bloqueadas}${evitarFrases}

════════ SE O TÍTULO PROMETE UMA QUANTIDADE, DIGA-AS PELO NOME ════════
⚠️ O padrão deste canal é **UMA ideia por vídeo** — três coisas em 50 segundos é peso a mais, e quem ouve não acompanha. Esta secção só existe para os temas antigos que ainda prometem uma lista no título.
Se o TEMA ou o ÂNGULO prometerem um número de coisas — três erros, cinco dicas, dois caminhos — o vídeo TEM de as dizer, uma a uma, com nome. **Prometer três e nunca dizer quais é o defeito nº1 deste canal**: a pessoa fica à espera do que foi prometido, não vem, e sai.
Diga-as com palavras do dia a dia, nunca com o nome técnico:
   ✗ "os três são o rotativo, o mínimo e o parcelamento longo" (ninguém em casa sabe o que é isto)
   ✓ "pagar só uma parte, deixar o resto rolando pro mês seguinte, e dividir a compra em muitas vezes"
Elas cabem TODAS num bloco só — normalmente a virada ou a demonstração. **Esse bloco pode passar das ${ORCAMENTO_OUTROS} palavras; então os outros cinco têm de ficar mais curtos para o total não estourar.** É uma troca, não uma licença para escrever mais.
⛔ **CADA ITEM TEM DE SER UM ATO DIFERENTE.** Se dois deles puderem ser a mesma coisa, você nomeou o mesmo erro duas vezes e quem ouve fica baralhado.
   ⚠️ O exemplo abaixo é DE OUTRO ASSUNTO de propósito — para você ver a forma e não poder aproveitar as palavras.
   ✗ "guardar dinheiro, poupar todo mês, e separar uma parte do salário" (são o MESMO ato dito três vezes)
   ✓ "cortar a assinatura que você não usa, trocar de supermercado, e levar comida de casa" (três coisas que se fazem em momentos diferentes)
   Teste: consigo fazer uma SEM fazer a outra? Se não consigo, são a mesma.

════════ O QUE VOCÊ PODE PROMETER ════════
SOMENTE duas coisas, porque só estas existem: o **app FinMoovi (teste de sete dias grátis)** e a **calculadora do blog (essa sim, grátis de verdade)**.
⛔ É PROIBIDO oferecer planilha, ebook, PDF, apostila, curso, aula, checklist, mapa mental ou qualquer material que o canal não tem. Prometer o que não existe é pior do que não convidar.

════════ COERÊNCIA DOS VALORES ════════
Não troque a grandeza do dinheiro. Cem reais NÃO é "um centavo", nem "uma moedinha", nem "trocado", nem "dinheirinho". Se o valor parece pequeno, diga que PARECE pequeno — mas chame-o pelo nome. Diminutivo tira o valor da coisa que você está tentando valorizar.

════════ COMO A FALA FLUI (vídeo curto perdoa pouco) ════════
- **PONTUAÇÃO É RESPIRAÇÃO, NÃO GRAMÁTICA.** Quem lê o texto é uma VOZ: ela PARA em cada vírgula e em cada ponto. Vírgula onde um falante não respiraria estraga a frase.
  ✗ "Tesouro Direto com cem reais por mês, vale a pena?" → a voz respira no meio e a pergunta descola do resto.
  ✓ "Tesouro Direto com cem reais por mês. Vale a pena?" → duas frases, duas intenções, respiro no lugar certo.
  ✗ "Dez anos de atraso, custam caro."   ✓ "Dez anos de atraso custam caro."
  Leia em voz alta: se você respirar onde NÃO há vírgula, ou não respirar onde HÁ, reescreva.
- ⛔ NUNCA use ponto e vírgula, dois-pontos ou parênteses. Ninguém FALA assim. Use ponto, vírgula ou reticências.
- Varie o fôlego: uma frase curta, uma mais longa, outra curta. Tudo do mesmo tamanho vira ladainha.
  ✓ "Cem reais por mês. Parece pouco, e é por isso que quase todo mundo deixa parado. Aí o tempo passa."
- **NÃO COLE DUAS IDEIAS SEM O ELO.** Sujeito e consequência precisam de um "que", "e" ou "porque" no meio. Sem ele a frase soa a manchete de jornal, não a alguém falando.
  ✗ "Três erros de cartão tiram quinhentos reais por mês."   ✓ "Três erros de cartão QUE tiram quinhentos reais por mês."
  ✗ "Dez anos parado custam um carro."   ✓ "São dez anos parado, e isso custa um carro."
  Teste: se der para pôr a frase num título de jornal sem mudar nada, falta o elo.
- **LINGUAGEM CONCRETA — a regra mais valiosa desta secção.** O dinheiro sai de um LUGAR e de um BOLSO. Diga qual. O abstrato explica; o concreto faz doer.
  ✗ "…que desaparecem todo mês."   ✓ "…que desaparecem DO SEU BOLSO todo mês."
  ✗ "no orçamento" → ✓ "na sua conta"  ·  ✗ "da sua renda" → ✓ "do seu salário"  ·  ✗ "em gastos" → ✓ "no que você paga sem ver"
  Sempre que escrever uma perda ou um ganho, pergunte: sai de ONDE? entra ONDE? Se a frase não diz, ela está pela metade.
- Cada bloco puxa o próximo pelo FIM: a última frase deve deixar o espectador querendo a seguinte.
- Leia em voz alta antes de responder. Se você tropeçar, reescreva.

════════ COMO A VOZ SOA ════════
- Pontuação é RESPIRAÇÃO, não gramática. Vírgula só onde alguém respiraria de verdade.
  ✗ "Dez anos de atraso, custam caro."  ✓ "Dez anos de atraso custam caro."
- Reticências só para suspense de efeito.
- Números por extenso na fala ("cem reais", "novecentos reais") — nunca símbolos. (Percentagem só se a ficha ou o apoio a trouxerem.)
- Diga a unidade na PRIMEIRA menção: "aos vinte e cinco anos… aos trinta e cinco".
- Diga "vídeo", nunca "Short".
- OBRIGATÓRIO: diga o bordão do canal UMA vez, **e SÓ no bloco 6 (o fecho)**, como assinatura: "${BORDAO}"
  ⛔ No meio da história ele parte a corrente — o dono reprovou exatamente isso: *"fica muito sem sentido aí no meio, está mais atrapalhando do que ajudando"*.
- ⛔ NUNCA mande clicar em link ("link na descrição/bio/aqui embaixo"). Em vídeo vertical o link não é clicável, e no Instagram e no TikTok o endereço escrito na legenda é texto morto — por isso o convite manda PROCURAR o nome.
- ⛔ NUNCA use asteriscos, travessões ou qualquer marcação. Só texto limpo.

Responda APENAS com JSON válido, sem markdown:
{
  "fioCondutor": "<uma das imagens permitidas — vira a cena da capa>",
  "numerosCitados": [<todos os valores de DINHEIRO que você disse, em algarismos, ex: 2699>],
  "blocos": [
    { "papel": "gancho",       "fala": "..." },
    { "papel": "empatia",      "fala": "..." },
    { "papel": "virada",       "fala": "..." },
    { "papel": "demonstracao", "fala": "..." },
    { "papel": "convite",      "fala": "..." },
    { "papel": "fecho",        "fala": "..." }
  ]
}`;
}

// ─── validação: só o que é do TEXTO ──────────────────────────────────────────
const PAPEIS = ['gancho', 'empatia', 'virada', 'demonstracao', 'convite', 'fecho'];

/**
 * O VÍDEO-EXEMPLO — e a razão de viver aqui, numa constante, e não escrito à mão
 * dentro do prompt.
 *
 * Foi ele que finalmente destravou o TOM que o dono pediu (*"um gerente de banco
 * falando de forma muito simples com um senhor muito humilde"*): sem um roteiro
 * COMPLETO à frente, o modelo cumpria as regras e continuava a escrever cartazes.
 *
 * ⚠️ E logo na geração seguinte veio a fatura: ele copiou-o quase à letra —
 * "ninguém te ensinou a olhar isso", "que fica lá meses", "um pouquinho de cada
 * vez", "um por um, com o valor do lado". Já tinha acontecido em 31/07 (8 gerações
 * em 8 copiaram o exemplo da semente). Num canal que publica todos os dias, isso
 * significa **o mesmo texto todos os dias** — exatamente a repetição que o dono
 * quis evitar quando escolheu 32 capas em vez de 8.
 *
 * Por isso o exemplo está AQUI: o prompt lê-o para ensinar, e o validador lê-o
 * para PUNIR quem o copiar. Uma fonte só — se vivesse em dois sítios, um dia
 * mudava-se um e a trava passava a defender um texto que já não existe.
 */
/**
 * ♦ REESCRITO EM 03/08/2026 no padrão que o dono aprovou (IMPLEMENTACAO20 §31):
 * pergunta que dói + resposta colada · UMA ideia · número que se transforma ·
 * app FAZENDO na 1ª pessoa · sem metáfora · fecho que responde + bordão.
 * O assunto (tarifa de pacote de conta) é de OUTRO vídeo de propósito — a regra
 * das ocorrências 10-13: exemplo é sempre de outro assunto E entra na anti-cópia.
 */
const EXEMPLO_DE_FORMA = [
  'Você sabe quanto o seu banco cobra só pra sua conta existir? Eu também não sabia. E era caro.',
  'Tá lá no extrato com nome bonito, pacote de serviços. Ninguém pediu. Ninguém olha.',
  'Eu fui ver a minha. Trinta e nove por mês. No fim do ano, quase quinhentos reais que saíram calados.',
  // ⚠️ Esta frase NÃO pode partilhar 6 palavras com o molde "eu joguei isso na
  // calculadora do FinMoovi" que o bloco 4 ENSINA — medido ao vivo em 03/08: o
  // modelo obedeceu ao molde e a anti-cópia (que inclui este exemplo) barrou-o.
  'Fui conferir no FinMoovi e ele tinha marcado a cobrança em vermelho, repetindo mês após mês na minha cara.',
  'Quer ver se a sua conta tem uma dessas? Procura FinMoovi. São sete dias grátis.',
  `Tarifa que você não pediu é dinheiro que sai calado. ${BORDAO}`,
];

/**
 * O TEXTO CONTRA O QUAL SE MEDE A CÓPIA — e repare no que fica DE FORA.
 *
 * · O bloco 5 (o convite) sai: "procura FinMoovi, são sete dias grátis" é o molde que o
 *   próprio prompt manda usar. Puni-lo seria reprovar quem obedece — o modo de
 *   falha crónico deste repositório.
 * · O bordão sai pela mesma razão: é obrigatório dizê-lo, à letra.
 * Sobra a ESCRITA — que é o que tem de ser original em cada vídeo.
 */
/**
 * ♦ AQUI VIVIA A "MECÂNICA DO FIO" (os três degraus da imagem). REMOVIDA em
 * 03/08/2026, com o padrão novo: a imagem deixou de ser obrigatória na FALA (vive
 * na capa visual), então ensinar os três degraus era ordenar o que a trava já não
 * pede — a inversão exata do defeito crónico deste repositório. Saiu do prompt E
 * da comparação anti-cópia no mesmo commit (as duas pontas, sempre).
 */

/**
 * AS FRASES DE CAPA DE EXEMPLO — e a 4ª vez que a mesma armadilha morde (02/08/2026).
 *
 * Hoje já aconteceu três vezes: o vídeo-exemplo, o exemplo da mecânica do fio, e os
 * exemplos da lista de erros. **Escrevi exemplos usando o assunto e o número do vídeo
 * que estava a testar, e o modelo copiou-os à letra, das três vezes.** À quarta,
 * escrevi *"Seu cartão tá tirando quinhentos reais por mês e você nem viu"* — e saiu
 * exatamente isso na geração seguinte.
 *
 * A regra que fica, e vale para QUALQUER exemplo que se escreva neste ficheiro:
 *   **1. o exemplo é sempre de OUTRO assunto**, para não servir ao vídeo em curso;
 *   **2. o exemplo entra na comparação anti-cópia**, para copiá-lo custar caro.
 * Lembrar não chega — já falhei quatro vezes hoje a lembrar-me.
 */
/**
 * ♦ Desde 03/08/2026 a capa é uma PERGUNTA + o choque colado nela. Cada exemplo
 * mostra as duas frases (a pergunta que a trava mede, e a resposta que o bloco 1
 * exige). Assuntos de propósito diferentes entre si e do vídeo-exemplo.
 */
const EXEMPLOS_DE_CAPA = [
  'Você sabe quanto pagou de juros no boleto que atrasou? Foi mais caro que o próprio boleto.',
  'Quanto do seu mercado do mês termina no lixo? Tem geladeira jogando duzentos reais fora.',
  'Você pagaria todo mês por um seguro de celular que nunca usou? Pois é isso que você tá fazendo.',
];

const EXEMPLO_PARA_COMPARAR = [
  EXEMPLO_DE_FORMA[0], EXEMPLO_DE_FORMA[1], EXEMPLO_DE_FORMA[2], EXEMPLO_DE_FORMA[3],
  EXEMPLO_DE_FORMA[5].replace(BORDAO, ''),
  ...EXEMPLOS_DE_CAPA,
].join(' ');

/**
 * NUMERAL POR EXTENSO MAL ESCRITO — mecânico, logo LIMPA (31/07/2026).
 *
 * MEDIDO no teste de variedade: o MESMO roteiro escreveu "quinhentos reais" no
 * gancho e "cincocentos reais" na demonstração. Não é ignorância do modelo, é
 * escorregão de escrita — e ia inteiro para a VOZ e para a LEGENDA queimada.
 * Grafia é mecânica: conserta-se por código, sem custar uma tentativa. Nenhuma das
 * formas abaixo existe em português, por isso a troca nunca muda o sentido.
 * O que esta lista não conhecer é apanhado pela sentinela em `validarNarrativa`.
 */
const NUMERAIS_ERRADOS = [
  [/\bcincocentos\b/gi, 'quinhentos'],
  [/\bcincocentas\b/gi, 'quinhentas'],
  [/\bcincoentos\b/gi, 'quinhentos'],
  [/\bcincoenta\b/gi, 'cinquenta'],
  [/\bdoiscentos\b/gi, 'duzentos'],
  [/\bdoiscentas\b/gi, 'duzentas'],
  [/\bduascentos\b/gi, 'duzentos'],
  [/\bduascentas\b/gi, 'duzentas'],
  [/\btrescentos\b/gi, 'trezentos'],
  [/\btrescentas\b/gi, 'trezentas'],
  [/\btrêscentos\b/gi, 'trezentos'],
  [/\btrêscentas\b/gi, 'trezentas'],
];

// Troca preservando a maiúscula inicial: "Cincocentos" no início de uma frase não
// pode virar "quinhentos" em minúscula.
const corrigirNumerais = (s) => NUMERAIS_ERRADOS.reduce(
  (txt, [errado, certo]) => txt.replace(errado, (achado) => (
    achado[0] === achado[0].toUpperCase() ? certo[0].toUpperCase() + certo.slice(1) : certo
  )),
  s,
);

/**
 * NOME ERRADO DE UMA COISA REAL — mecânico, logo LIMPA (02/08/2026).
 *
 * MEDIDO no roteiro de 01/08: a narração disse "taxa mínima". **Esse produto não existe
 * com esse nome.** A parcela que o banco deixa pagar na fatura chama-se PAGAMENTO MÍNIMO.
 * É erro de FACTO, não de gosto — logo é código, e não trava: consertar a grafia de um
 * nome não pode custar uma tentativa ao gerador (mesma porta por onde entrou o
 * "cincocentos", ver NUMERAIS_ERRADOS).
 *
 * ⚠️ O GUARDA DE CONTEXTO, e porque ele é o TEMA e não a fala.
 * "Taxa mínima" pode ser legítimo noutro assunto ("taxa mínima de corretagem"). A 1ª
 * versão deste conserto usava a narração gerada como contexto — e nesse desenho um vídeo
 * sobre corretagem que dissesse "cartão" de passagem levava a troca e saía com
 * "pagamento mínimo de corretagem", um absurdo. O TEMA é decidido ANTES de o modelo
 * escrever e não muda a meio: se o vídeo é sobre cartão/fatura/crédito, "taxa mínima"
 * está errado, ponto. Fora disso não se toca.
 */
/**
 * ⚠️ E O ARTIGO TEM DE VIR JUNTO — apanhado a CORRER o conserto, não a lê-lo.
 * "taxa" é feminino e "pagamento" é masculino. A 1ª versão trocava só o nome e produzia
 * *"você paga A pagamento mínimo"*, que ia inteiro para a voz e para a legenda queimada.
 * Por isso o determinante que vem à frente muda de género com ele.
 */
const DET_FEM_PARA_MASC = {
  a: 'o', as: 'os', da: 'do', das: 'dos', na: 'no', nas: 'nos',
  uma: 'um', umas: 'uns', essa: 'esse', essas: 'esses',
  esta: 'este', estas: 'estes', aquela: 'aquele', aquelas: 'aqueles',
  à: 'ao', às: 'aos', pela: 'pelo', pelas: 'pelos',
  sua: 'seu', suas: 'seus', minha: 'meu', minhas: 'meus',
  outra: 'outro', outras: 'outros',
};

// "Taxa mínima" no início de uma frase não pode virar "pagamento mínimo" em minúscula
// (a mesma regra que `corrigirNumerais` já seguia).
const preservarCaixa = (achado, novo) => (
  achado[0] === achado[0].toUpperCase() ? novo[0].toUpperCase() + novo.slice(1) : novo
);

const TEMA_DE_CARTAO = /cart[ãa]o|fatura|cr[ée]dito/i;

const NOMES_ERRADOS = [
  {
    // com determinante à frente: troca-se o determinante E o nome, de uma vez.
    // A fronteira é por LETRA (não `\b`), senão "à" — que não é letra para o `\b` —
    // escapava.
    tema: TEMA_DE_CARTAO,
    de: /(?<![\p{L}])(as|a|das|da|nas|na|umas|uma|essas|essa|estas|esta|aquelas|aquela|às|à|pelas|pela|suas|sua|minhas|minha|outras|outra)\s+taxa(s?)\s+m[íi]nima(s?)(?![\p{L}])/giu,
    para: (_achado, det, plural) => {
      const novoDet = DET_FEM_PARA_MASC[det.toLowerCase()] || det;
      const nome = plural ? 'pagamentos mínimos' : 'pagamento mínimo';
      return `${preservarCaixa(det, novoDet)} ${nome}`;
    },
  },
  {
    // sem determinante à frente ("paga taxa mínima todo mês")
    tema: TEMA_DE_CARTAO,
    de: /(?<![\p{L}])taxa(s?)\s+m[íi]nima(s?)(?![\p{L}])/giu,
    para: (achado, plural) => preservarCaixa(achado, plural ? 'pagamentos mínimos' : 'pagamento mínimo'),
  },
];

export function corrigirNomes(texto, tema = '') {
  return NOMES_ERRADOS.reduce(
    (txt, n) => (n.tema.test(String(tema)) ? txt.replace(n.de, n.para) : txt),
    String(texto || ''),
  );
}

/**
 * NÚMERO POR EXTENSO — calculado, não pedido (31/07/2026).
 *
 * MEDIDO TRÊS VEZES: o roteiro sai com algarismos na fala ("Tá pagando 500 reais",
 * "a primeira parcela é 1.111", "R$ 5 mil"). O prompt manda escrever por extenso
 * e **nada pune** — o modo de falha crónico deste repositório. E vai direto para a
 * VOZ e para a LEGENDA queimada.
 *
 * Não é caso para trava: converter "500" em "quinhentos" é aritmética. Vale aqui a
 * mesma regra do simulador (§19.3) e do `cincocentos` (§19.9): **o que se calcula
 * não se pede ao modelo.**
 */
const UNIDADES = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
const DEZ_A_DEZENOVE = ['dez', 'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const DEZENAS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const CENTENAS = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

function ate999(n) {
  if (n === 0) return '';
  if (n === 100) return 'cem';                       // "cem", não "cento"
  const c = Math.floor(n / 100);
  const r = n % 100;
  const partes = [];
  if (c) partes.push(CENTENAS[c]);
  if (r < 10 && r > 0) partes.push(UNIDADES[r]);
  else if (r >= 10 && r < 20) partes.push(DEZ_A_DEZENOVE[r - 10]);
  else if (r >= 20) {
    const d = Math.floor(r / 10);
    const u = r % 10;
    partes.push(u ? `${DEZENAS[d]} e ${UNIDADES[u]}` : DEZENAS[d]);
  }
  return partes.join(' e ');
}

export function porExtenso(valor) {
  const n = Math.round(Number(valor));
  if (!Number.isFinite(n) || n < 0 || n > 999999999) return null;
  if (n === 0) return 'zero';

  const milhoes = Math.floor(n / 1000000);
  const milhares = Math.floor((n % 1000000) / 1000);
  const resto = n % 1000;
  const partes = [];
  if (milhoes) partes.push(milhoes === 1 ? 'um milhão' : `${ate999(milhoes)} milhões`);
  if (milhares) partes.push(milhares === 1 ? 'mil' : `${ate999(milhares)} mil`);
  if (resto) partes.push(ate999(resto));

  // O "e" antes da última parte só entra quando ela é pequena ou redonda:
  // "dois mil E quatrocentos", mas "dois mil seiscentos e noventa e nove".
  // Vale para a última parte seja ela o resto OU os milhares — sem isto saía
  // "dois milhões quinhentos mil" em vez de "dois milhões E quinhentos mil".
  const ultima = resto || milhares;
  if (partes.length > 1 && ultima && (ultima < 100 || ultima % 100 === 0)) {
    return `${partes.slice(0, -1).join(' ')} e ${partes[partes.length - 1]}`;
  }
  return partes.join(' ');
}

const soNumero = (s) => Number(String(s).replace(/\./g, ''));

/**
 * Troca os algarismos da fala por palavras.
 * ⚠️ Decimais com vírgula ficam INTACTOS de propósito: "14,25%" partido em "14" e
 * "25" daria "catorze,vinte e cinco por cento". Taxas são raras na fala (a ficha
 * proíbe citar as que não calculou) e é melhor não lhes tocar do que estragá-las.
 */
export function numerosPorExtenso(texto) {
  return String(texto || '')
    // "R$ 500" → "quinhentos reais" (só quando "reais" ainda não vem a seguir)
    .replace(/R\$\s*(\d[\d.]*)(?![,\d])(?!\s*(?:reais|real))/gi, (m, num) => {
      const e = porExtenso(soNumero(num));
      return e ? `${e} reais` : m;
    })
    // "R$ 500 reais" → "quinhentos reais" (não duplica a palavra)
    .replace(/R\$\s*(\d[\d.]*)(?![,\d])/gi, (m, num) => porExtenso(soNumero(num)) || m)
    // "30%" → "trinta por cento".
    // ⚠️ Os dois lookarounds são o que protege "14,25%": sem o `(?<![\d,])` esta
    // regra apanhava o "25" e escrevia "14,vinte e cinco por cento".
    .replace(/(?<![\d,])(\d[\d.]*)(?![,\d])\s*%/g, (m, num) => {
      const e = porExtenso(soNumero(num));
      return e ? `${e} por cento` : m;
    })
    // o resto dos inteiros soltos (a vizinhança com vírgula exclui os decimais)
    .replace(/(?<![\d,])\d[\d.]*\d(?![\d,])|(?<![\d,])\d+(?![\d,])/g, (m) => porExtenso(soNumero(m)) || m);
}

/**
 * LIMPEZA MECÂNICA — sanitizar em vez de reprovar (31/07/2026).
 *
 * O 5º teste esgotou as 3 tentativas oscilando entre defeitos: 1ª reprovou por
 * tamanho + travessão, 2ª por "planilha", 3ª por travessão OUTRA VEZ. É o mesmo
 * PÊNDULO já documentado neste repositório em julho — o modelo corrige uma
 * exigência e viola outra.
 *
 * A causa foi minha: acumulei ~15 travas neste ficheiro, repetindo o erro que eu
 * próprio diagnostiquei no prompt de produção. A correção não é afrouxar, é
 * SEPARAR: pontuação é MECÂNICA e pode ser consertada por código, sem perder uma
 * vírgula de sentido. Só continua a reprovar o que é SEMÂNTICO — número inventado,
 * promessa falsa, fio ausente, bordão ausente, tamanho.
 * Cada trava que vira limpeza é uma tentativa devolvida ao que importa.
 * A grafia errada de numeral (ver NUMERAIS_ERRADOS) entra pela mesma porta.
 */
export function limparFala(texto, tema = '') {
  // primeiro os algarismos viram palavras, depois corrige-se a grafia dessas
  // palavras — por esta ordem, senão "cincocentos" nunca chegaria a existir.
  // Só então os nomes errados (ver `corrigirNomes`), que dependem do TEMA.
  return corrigirNomes(corrigirNumerais(numerosPorExtenso(String(texto || ''))), tema)
    .replace(/[*_]/g, '')                                  // marcação: a voz lia "asterisco"
    .replace(/\s*[—–]\s*/g, ', ')                          // travessão vira a pausa que ele representa
    .replace(/\s*:\s*/g, '. ')                             // dois-pontos vira FRASE NOVA — trocar por vírgula deixava a maiúscula solta ("Lembre, Dinheiro…")
    .replace(/\s*;\s*/g, '. ')                             // ponto e vírgula vira frase nova
    .replace(/[()]/g, '')                                  // parênteses não existem na fala
    .replace(/\.\s*([a-záéíóúâêôãõç])/g, (m, c) => `. ${c.toUpperCase()}`) // maiúscula depois do ponto novo
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.!?…])/g, '$1')
    .trim();
}

/**
 * VELOCIDADE DA VOZ — MEDIDA, não estimada (31/07/2026).
 * A 1ª versão deste ficheiro usou 2,3 palavras/s de palpite e reprovou um texto de
 * 135 palavras como "59s". Errado: no log real do TTS de `tesouro-direto-100` as 6
 * cenas somaram 161 palavras em 62,1s → **2,6 palavras/s**. Com a taxa certa, 135
 * palavras dão ~52s, dentro da faixa.
 * Lição: calibrar por medição do pipeline, nunca por suposição.
 */
const PALAVRAS_POR_SEGUNDO = 2.6;
/**
 * O ALVO ENCURTOU: 117-143 → 110-130 palavras (T3, §21.4 — 01/08/2026).
 *
 * Porquê: a capa passou de 1,5s a 3,5s e cada cena ganhou 0,7s de respiro (T1 e T2).
 * O tempo tem de sair de algum lado, e sai do texto — que é também a melhoria que o
 * dono pediu: menos palavras, mais respiro, e a capa a prender.
 *
 * A conta, com a faixa nova: 130 palavras ÷ 2,6 = 50s de fala, + 2,2s de respiros
 * (5 × 0,7s menos as sobreposições das transições) + 2,5s de assinatura + 0,9s até a
 * voz entrar na capa = ~55,6s. O limite do Short é 60s.
 *
 * ⚠️ A margem real é MAIOR do que esta conta. Medido no vídeo de 31/07: 141 palavras
 * em 51,1s de áudio = **2,76 palavras/s**, não 2,6. A constante acima é conservadora
 * (foi medida noutro vídeo, a 2,59) e fica como está de propósito: errar para o lado
 * do vídeo mais curto é seguro, errar para o outro estoura os 60s do YouTube.
 */
/**
 * ⚠️ A JANELA ALARGOU DE 110-130 PARA 120-140 (01/08/2026, à tarde) — e é medição,
 * não gosto.
 *
 * De manhã cortei para 110-130 para dar espaço à capa e aos respiros. À tarde,
 * quando o dono pediu o tom de *"gerente de banco a explicar a um senhor humilde"*,
 * a conta virou-se contra mim: **falar como gente gasta mais palavras**. "Olha, tem
 * três errinhos no cartão que parecem pedra na mochila" diz o mesmo que "Três erros
 * de cartão são pedras na mochila" com o dobro do calor e mais 5 palavras.
 * Resultado medido: o gerador falhou as 4 tentativas, a primeira por 140 palavras.
 *
 * A conta refeita com o vídeo REAL de hoje (49,5s com 122 palavras):
 *   total = palavras ÷ 2,76 + 5,6s (capa + respiros + assinatura)
 *   140 palavras → 50,7s de fala → **56,3s de vídeo**. O limite do YouTube é 60s.
 * Havia quase 10 segundos de folga a não ser usados, e era o tamanho — não o tom —
 * que estava a apertar o texto.
 */
/**
 * ⚠️ O MÍNIMO DESCEU DE 120 PARA 95 (03/08/2026) — e é a regra da trava que não
 * pode reprovar o modelo do dono, não gosto. Os três roteiros-modelo que ele
 * aprovou medem 103, 106 e 106 palavras (contados por código): com 120, os TRÊS
 * reprovavam por "curta demais". 95 dá 8 palavras de folga ao pior caso.
 * A conta do tempo: 95 ÷ 2,6 = ~37s de fala + capa/respiros/assinatura ≈ 42s de
 * vídeo — curto, mas dentro do que o padrão novo pede (menos palavras, mais claro).
 */
const MIN_PALAVRAS = 95;  // ≈ 37s de fala
const MAX_PALAVRAS = 140; // ≈ 51s de fala → ~56s de vídeo

/**
 * A FRASE DA CAPA: `MAX_PALAVRAS_CAPA` vive em `lib/palavras.js` desde 03/08/2026 —
 * o segundo leitor precisa do MESMO número (dizia "13" enquanto a trava exigia 18,
 * o padrão prompt-contra-validador). Uma regra, um sítio. A história do número
 * (13→18 porque reprovava a frase-modelo do dono) está lá.
 */

/**
 * ⚠️ O ORÇAMENTO DEIXA DE SER IGUAL PARA TODOS — e é aritmética, não gosto.
 * A frase da capa acrescentou ~13 palavras ao bloco 1 e o teto total NÃO pode subir
 * (140 palavras já dão ~58s, e o limite do YouTube são 60). MEDIDO: com o orçamento
 * repartido por igual, o gerador falhou as 4 tentativas seguidas — 159, 157 e 157
 * palavras. Ele não inventa a compensação sozinho; é preciso dizer-lhe a conta.
 */
const ORCAMENTO_BLOCO1 = MAX_PALAVRAS_CAPA + 20;                                  // capa + história
const ORCAMENTO_OUTROS = Math.floor((MAX_PALAVRAS - ORCAMENTO_BLOCO1) / 5);       // os outros cinco

/**
 * ♦ AQUI VIVIA `PALAVRAS_DO_FIO` — o dicionário que provava que a imagem era DITA
 * na fala. REMOVIDO em 03/08/2026: com o padrão aprovado pelo dono a imagem vive
 * na CAPA VISUAL e não precisa de ser falada, e as três travas que usavam este
 * dicionário saíram (ver o comentário junto à validação do fioCondutor). As dicas
 * que vão ao MENU do prompt continuam em `DICAS_DO_FIO` lá em cima — servem para
 * o modelo escolher a imagem certa para a capa, não para a falar.
 */

// As ÚNICAS centenas que terminam em "centos/centas" em português. Quem não estiver
// aqui e terminar assim é grafia inventada (ver a sentinela em `validarNarrativa`).
// "acrescentos" entra na lista porque é palavra comum, não numeral.
const CENTENAS_VALIDAS = new Set([
  'quatrocentos', 'quatrocentas',
  'seiscentos', 'seiscentas',
  'setecentos', 'setecentas',
  'oitocentos', 'oitocentas',
  'novecentos', 'novecentas',
  'acrescentos',
]);

// O que o canal PODE prometer. No 1º teste o modelo ofereceu "a planilha" — que
// NÃO EXISTE. Promessa falsa indo ao ar é pior que CTA fraca.
const BRINDES_PROIBIDOS = /\b(planilha|ebook|e-book|pdf|apostila|curso|aula|checklist|mapa mental|template|guia completo)\b/i;

export function validarNarrativa(n, proibidas = [], ficha = null, temaTermo = '', permitidas = null, apoio = '') {
  const erros = [];
  const avisos = [];
  if (!n || typeof n !== 'object') return { ok: false, erros: ['resposta não é objeto'], avisos };

  const blocos = Array.isArray(n.blocos) ? n.blocos : [];
  if (blocos.length !== 6) erros.push(`precisa de 6 blocos (veio ${blocos.length})`);
  blocos.forEach((b, i) => {
    if (!b || typeof b.fala !== 'string' || !b.fala.trim()) erros.push(`bloco ${i + 1}: sem fala`);
    if (b && b.papel !== PAPEIS[i]) erros.push(`bloco ${i + 1}: papel deve ser "${PAPEIS[i]}" (veio "${b?.papel}")`);
  });

  const falaToda = blocos.map((b) => (b && b.fala) || '').join(' ');
  const palavras = falaToda.trim().split(/\s+/).filter(Boolean).length;
  if (palavras < MIN_PALAVRAS) erros.push(`narração curta demais: ${palavras} palavras (mínimo ${MIN_PALAVRAS} ≈ ${Math.round(MIN_PALAVRAS / PALAVRAS_POR_SEGUNDO)}s)`);
  if (palavras > MAX_PALAVRAS) erros.push(`narração longa demais: ${palavras} palavras (máximo ${MAX_PALAVRAS} ≈ ${Math.round(MAX_PALAVRAS / PALAVRAS_POR_SEGUNDO)}s)`);

  // Marcação, travessão, dois-pontos, ponto e vírgula e parênteses NÃO reprovam mais:
  // são limpos por `limparFala()` antes de chegar aqui (ver o comentário lá em cima
  // sobre o pêndulo do 5º teste). Aqui ficam só as exigências SEMÂNTICAS.
  if (/\bshorts?\b/i.test(falaToda)) erros.push('a fala diz "Short" — o canal fala sempre "vídeo"');
  if (/link (na|no|aqui)|clica no link|na bio|na descri/i.test(falaToda)) {
    erros.push(
      'a fala manda clicar em link — em vídeo vertical o link não é clicável, e no Instagram e no TikTok o endereço '
      + 'escrito na legenda é texto morto. O convite manda PROCURAR o nome: "procura FinMoovi, são sete dias grátis".',
    );
  }
  if (!/finmoovi/i.test(blocos[4]?.fala || '')) {
    erros.push('o bloco "convite" não diz o nome FinMoovi — é ele que a pessoa vai procurar, então tem de ser dito');
  }
  /**
   * 🔴 "GRÁTIS" SEM PRAZO É PROPAGANDA ENGANOSA — 12/08/2026, ordem do dono.
   *
   * ═══ POR QUE EXISTE ═══
   * O FinMoovi **não é grátis**: é um teste de SETE DIAS, e depois disso o app tranca
   * (ver `plan-limits.ts` no repositório do app — passados os sete dias não se cria
   * lançamento, categoria nem cartão). Durante meses a fala, a legenda, a descrição e
   * o selo do vídeo diziam só "é de graça" — e **chegaram duas queixas de propaganda
   * enganosa** de gente que se inscreveu a pensar que era grátis para sempre.
   *
   * ⚠️ **E porquê uma trava, e não só a ordem no prompt:** é a regra desta casa —
   * o que o prompt pede e nada pune, o modelo ignora. O prompt manda dizer o prazo;
   * isto é o que cobra. As duas pontas, no mesmo commit.
   *
   * O que NÃO dispara: "calculadora grátis" e "ferramenta grátis" continuam a ser
   * verdade (as do blog são mesmo de borla) — por isso a trava só olha o que está
   * colado ao APP, e aceita qualquer forma de dizer o prazo ("sete dias", "7 dias").
   */
  const dizGratis = falaToda.match(/\b(de\s+gra[çc]a|gr[áa]tis|gratuit[oa]s?)\b/i);
  if (dizGratis && !/\b(sete|7)\s*dias\b/i.test(falaToda)) {
    const sobreOApp = /\b(de\s+gra[çc]a|gr[áa]tis|gratuit[oa]s?)\b/i.test(
      falaToda.replace(/(calculadora|ferramenta|planilha)s?[^.!?]{0,40}?\b(de\s+gra[çc]a|gr[áa]tis|gratuit[oa]s?)\b/gi, ''),
    );
    if (sobreOApp) {
      erros.push(
        `a fala diz "${dizGratis[0]}" sem dizer o prazo — o FinMoovi NÃO é grátis, é um teste de sete dias. `
        + 'Dizer só "é de graça" é propaganda enganosa (já rendeu queixas). Escreva "são sete dias grátis".',
      );
    }
  }
  /**
   * ♦ O CONVITE DEIXOU DE PEDIR COMENTÁRIO (07/08/2026) — e esta é a outra ponta da regra.
   *
   * ═══ POR QUE MUDOU ═══
   * Até aqui o vídeo ia só ao YouTube e ao Instagram, os dois sítios onde EXISTE um robô
   * a responder a quem escreve FINMOOVI (o do Instagram manda mensagem privada, o daqui —
   * `src/scripts/youtube/comentarios.js` — responde no próprio comentário, porque no
   * YouTube não há mensagem privada nenhuma). A partir de 07/08 o MESMO ficheiro passa a
   * sair também em TikTok, Facebook, LinkedIn, Threads, Telegram, Pinterest e Bluesky —
   * **sete sítios onde ninguém responde.** A pessoa comentava e não recebia nada.
   *
   * ⚠️ **E a chamada NÃO se perdeu:** o "comenta FINMOOVI" continua ESCRITO na legenda do
   * Instagram e do YouTube. As duas automações disparam pelo COMENTÁRIO, não pelo áudio —
   * elas nem sabem o que o vídeo disse. Um vídeo só serve as nove, e ninguém fica sem
   * resposta. (Decisão do dono, IMPL26 §12-A.)
   *
   * ⚠️ **E porquê uma trava, e não só a ordem no prompt:** neste repositório o que o
   * prompt pede e nada pune, o modelo ignora — está medido vezes de mais. O prompt manda
   * procurar o nome; isto é o que cobra.
   */
  const pedeComentario = falaToda.match(/\bcoment\p{L}*/iu);
  if (pedeComentario) {
    erros.push(
      `a fala pede "${pedeComentario[0]}" — este vídeo sai em oito redes mais o YouTube, e só em duas existe robô `
      + 'a responder a quem comenta. Nas outras a promessa fica por cumprir. O convite manda PROCURAR o nome: '
      + '"quer ver o seu? procura FinMoovi, são sete dias grátis". O pedido de comentário vive na LEGENDA, não na fala.',
    );
  }
  // BORDÃO — passa de aviso a ERRO (31/07/2026). O prompt manda dizê-lo uma vez e
  // nada cobrava: no 4º teste ele simplesmente sumiu. É o mesmo padrão que este
  // repositório já pagou caro — o prompt pede, nada pune, o modelo ignora.
  // A busca é por uma âncora SEM acento e em minúsculas: comparar a frase inteira
  // com acentuação daria falso negativo à primeira variação de pontuação.
  const semAcento = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  /**
   * ⚠️ O BORDÃO PASSA A SER CONFERIDO INTEIRO (02/08/2026) — e a causa foi medida.
   *
   * A âncora acima eram só as três primeiras palavras. MEDIDO numa geração real de hoje:
   * saiu *"Dinheiro sem controle ACABA INDO PARA O OUTRO LADO"* — o segundo leitor
   * reescreveu a assinatura do canal, que ele está EXPRESSAMENTE proibido de tocar, e
   * a verificação deixou passar porque a âncora curta continuava lá.
   * A assinatura é o único texto do canal que não pode variar: ou é ele, ou não é.
   *
   * Compara-se por PALAVRAS (sem acentos, sem pontuação, sem espaços a mais): assim uma
   * vírgula a mais ou o ponto final em falta não dão falso alarme, mas trocar uma palavra
   * dá — que é exatamente o que se quer apanhar.
   */
  const soPalavras = (s) => semAcento(s).replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
  const BORDAO_EM_PALAVRAS = soPalavras(BORDAO);
  const ancoraCurta = semAcento('dinheiro sem controle');
  if (!soPalavras(falaToda).includes(BORDAO_EM_PALAVRAS)) {
    erros.push(
      semAcento(falaToda).includes(ancoraCurta)
        // ele TENTOU dizer o bordão e mudou-o: o aviso tem de dizer isso, senão o modelo
        // acha que basta acrescentar outro e passa a haver dois.
        ? `o bordão do canal foi ALTERADO — ele não se reescreve, diz-se à letra, exatamente assim: "${BORDAO}"`
        : `o bordão do canal não foi dito — encaixe uma vez, à letra: "${BORDAO}"`,
    );
  } else if (!soPalavras(blocos[5]?.fala || '').includes(BORDAO_EM_PALAVRAS)) {
    // O BORDÃO SÓ NO FIM (decisão do dono, 01/08/2026).
    // Ele estava obrigatório em QUALQUER sítio e caiu no bloco 2, no meio da
    // história: *"essa frase fica muito sem sentido aí no meio… está mais
    // atrapalhando do que ajudando"*. Um bordão fecha, não interrompe.
    erros.push(`o bordão está no meio da história — ele só pode aparecer no ÚLTIMO bloco (fecho), como assinatura: "${BORDAO}"`);
  }

  /**
   * O FECHO NÃO FALA DO CANAL (02/08/2026) — e a causa era prompt contra prompt.
   *
   * MEDIDO: o roteiro de 01/08 abriu o fecho com *"O blog mostra que…"*. Fui ver porquê e
   * a culpa não era do modelo: a "REGRA MAIOR" manda cada bloco agarrar o anterior, e o
   * bloco anterior ao fecho é o CONVITE, que fala do blog e do comentário. **O modelo
   * obedeceu.** O prompt passou a dizer que o bloco 6 é a única exceção — e esta trava é a
   * outra ponta, porque neste repositório o que o prompt pede e nada pune, o modelo ignora.
   *
   * É VERDADE, não gosto: ou o fecho fala do canal, ou não fala. Não se está julgar tom.
   * Forma mais barata de a cumprir sem fazer o que se quer: não dizer estas palavras — que
   * é exatamente o objetivo. Não há atalho perverso.
   * ⚠️ Não colide com o bordão ("dinheiro sem controle é dinheiro dos outros") nem com o
   * nome FINMOOVI, que é exigido no bloco 5 e não aqui.
   */
  /**
   * ⚠️ ALARGADO EM 02/08/2026, no mesmo dia em que nasceu. A 1ª versão barrava blog,
   * comentário, link, canal e inscrição — e a geração seguinte abriu o fecho com
   * *"O app mostra que…"*. É a MESMA doença com outra palavra: o fecho a citar uma
   * fonte em vez de responder. O app tem o bloco 4 e o convite tem o 5; o 6 é a
   * resposta, a imagem e a assinatura. Mais nada.
   */
  /**
   * ⚠️ "coment*" SAIU DESTA LISTA em 07/08/2026 — não por ter deixado de ser proibido,
   * mas porque passou a ser proibido em TODO o vídeo (ver a trava do convite acima).
   * Mantê-lo aqui fazia a mesma palavra acender DOIS erros com explicações diferentes,
   * e é assim que nasce o pêndulo: o modelo conserta uma queixa e parte a outra.
   */
  const intrusoNoFecho = String(blocos[5]?.fala || '')
    .match(/\b(blogs?|links?|canal|canais|inscri\p{L}*|inscrev\p{L}*|finmoovi|apps?|aplicativos?)\b/iu);
  if (intrusoNoFecho) {
    erros.push(
      `o bloco "fecho" fala de "${intrusoNoFecho[0]}" — o fecho é a RESPOSTA à pergunta da capa, mais o bordão. `
      + 'O app é do bloco 4 e o convite é do bloco 5; repetir aqui rouba o lugar da resposta.',
    );
  }

  /**
   * ═══ AQUI VIVIAM SEIS TRAVAS DE GOSTO. FORAM EMBORA (01/08/2026, à tarde) ═══
   *
   * Eram: o encadeamento entre blocos, o eco na abertura, a comparação em vez de
   * definição, o fecho sem pergunta, as palavras de escritório e o jargão de banco.
   *
   * PORQUE SAÍRAM, e está medido: com elas, o gerador falhou OITO tentativas
   * seguidas, cada uma numa regra diferente. Conserta uma, parte outra. E quando
   * uma delas era fácil de satisfazer, o modelo aprendia o atalho em vez do
   * objetivo — a trava do encadeamento produziu "Crescer assim?", "Completa?",
   * cola robótica pior do que o defeito original.
   *
   * A pergunta do dono que fechou o assunto: *"não existe outra forma de corrigirmos
   * isso definitivamente? por essas tentativas e erros não vejo como algo seguro pro
   * futuro."* Tinha razão. **Gosto não se mede com lista de palavras** — uma lista
   * só sabe dizer "esta palavra é proibida", e escrever bem não é a ausência de
   * palavras más.
   *
   * PARA ONDE FORAM: para o SEGUNDO LEITOR (lib/segundo-leitor.js), uma passagem de
   * IA que lê o roteiro como espectador e reescreve o que soa a robô. Ele julga o
   * que nenhuma lista julga — o tom, a frase morta, a metáfora que se contradiz.
   *
   * O QUE FICA AQUI: só VERDADE — números, catálogo de imagens, tema dito no gancho,
   * bordão, tamanho, promessas, cópia do exemplo. Coisas que ou são verdade ou não
   * são, e onde o código é melhor juiz que qualquer modelo.
   *
   * É a irmã da regra que este projeto já tinha: *o que se calcula não se pede ao
   * modelo*. A outra metade é: *o que é gosto não se mede com regex*.
   */

  /**
   * A TRAVA ANTI-CÓPIA — o exemplo tem de se QUEIMAR (aprovada pelo dono, 01/08).
   *
   * O vídeo-exemplo destravou o tom e, na geração seguinte, foi copiado quase à
   * letra. Num canal diário isso é o mesmo texto todos os dias.
   *
   * SEIS palavras seguidas, e o número foi CALIBRADO, não escolhido.
   * A 5, apanhava as cópias reais — "a vida corre ninguém te ensinou a olhar isso"
   * (11 palavras) — mas apanhava também **"no FinMoovi você abre a"**, que é uma
   * frase legítima: o nome do produto é obrigatório e empurra sempre para a mesma
   * construção. Punir isso seria reprovar quem obedece.
   * A 6, as cópias verdadeiras continuam todas apanhadas (as medidas tinham 6, 8 e
   * 11 palavras) e a coincidência à volta da marca deixa de reprovar.
   *
   * ⚠️ O convite e o bordão estão FORA da comparação de propósito — são moldes que
   * o próprio prompt manda usar (ver EXEMPLO_PARA_COMPARAR).
   */
  const copiado = longestSharedWordRun(falaToda, EXEMPLO_PARA_COMPARAR, 6);
  if (copiado.length) {
    erros.push(
      `você copiou o exemplo: "${copiado.join(' ')}" — o exemplo serve para ver a FORMA, não para reaproveitar frases. `
      + 'Este canal publica todos os dias; se cada vídeo repetir as mesmas frases, todos ficam iguais. Escreva com as suas palavras.',
    );
  }

  /**
   * A 1ª FRASE TEM DE CABER NA CAPA (02/08/2026) — e é VERDADE, não gosto.
   *
   * A capa fica 3,5s na tela e a voz entra aos 0,9s: são **2,6s**, que a 2,76
   * palavras/s dão ~7 palavras. Dez é o teto com folga. Passar disso significa que a
   * frase escrita na capa acaba DEPOIS de a capa desaparecer — a pessoa lê metade.
   * Isto mede-se contando; se fosse "a frase é boa?" seria gosto e não entrava aqui.
   *
   * ⚠️ O que esta trava NÃO garante é que a frase DIGA alguma coisa. A forma mais
   * barata de a cumprir é escrever dez palavras vazias ("Olha, vou te contar uma
   * coisa muito importante agora"). Contra isso não há conta que sirva — está no
   * prompt com exemplos, e é o segundo leitor que julga.
   */
  const frasesDoBloco1 = String(blocos[0]?.fala || '').split(/(?<=[.!?…])\s+/).filter((f) => f.trim());
  const primeiraFrase = frasesDoBloco1[0] || '';
  const palavrasDaCapa = primeiraFrase.trim() ? primeiraFrase.trim().split(/\s+/).length : 0;
  if (palavrasDaCapa > MAX_PALAVRAS_CAPA) {
    erros.push(
      `a 1ª frase do gancho tem ${palavrasDaCapa} palavras e ela é a CAPA do vídeo — no máximo ${MAX_PALAVRAS_CAPA}, `
      + 'senão acaba depois de a capa sair da tela. Corte-a numa chamada curta e ponha o resto na frase seguinte. '
      + `(veio: "${primeiraFrase}")`,
    );
  }
  /**
   * ♦ A CAPA É UMA PERGUNTA, E A RESPOSTA VEM COLADA (03/08/2026) — padrão aprovado
   * pelo dono nos roteiros-modelo D/E/F (IMPLEMENTACAO20 §31).
   * O que se mede aqui é só a FORMA (termina em "?"; há pelo menos mais uma frase
   * no bloco): se a pergunta dói e se a resposta responde, isso é gosto — julga o
   * prompt e o segundo leitor, nunca uma regex ("Você sabia?" passa nesta trava de
   * propósito; a forma mais barata de a cumprir é uma pergunta vazia, e contra isso
   * trava nenhuma serve).
   * ⚠️ Esta trava grava a ESTÉTICA ATUAL do dono: no dia em que ele aprovar uma
   * capa-afirmação de choque, ela cai. Está escrito no §31 para ninguém esquecer.
   */
  // "?!" também conta como pergunta — sem isto, uma exclamação colada custava uma tentativa
  if (primeiraFrase && !/\?[!…]*\s*$/.test(primeiraFrase.trim())) {
    erros.push(
      `a 1ª frase do gancho é a CAPA e tem de ser uma PERGUNTA que dói, terminada em "?" — `
      + `é o padrão do canal: pergunta na capa, choque na frase seguinte. (veio: "${primeiraFrase}")`,
    );
  }
  if (primeiraFrase && frasesDoBloco1.length < 2) {
    erros.push(
      'o bloco 1 tem só a pergunta da capa — a resposta/choque vem LOGO a seguir, no MESMO bloco. '
      + 'Pergunta pendurada é proibida neste canal: pergunte e responda na frase seguinte.',
    );
  }

  /**
   * ♦ O TEMA PODE ENTRAR ATÉ AO BLOCO 2 (03/08/2026) — a trava anterior exigia-o no
   * bloco 1 e REPROVAVA o roteiro-modelo D do dono (a capa-pergunta nem sempre cabe
   * o nome do assunto com naturalidade; no D, "parcela" só entra no bloco 2).
   * O casamento por família ("parcela"↔"parcelamento") vive em `keywordFalada`
   * (lib/palavras.js) — uma regra, um sítio; a passagem 2 usa a MESMA janela.
   */
  const falaDoArranque = `${blocos[0]?.fala || ''} ${blocos[1]?.fala || ''}`;
  if (temaTermo && blocos[0] && !keywordFalada(temaTermo, falaDoArranque)) {
    erros.push(
      `nem o gancho nem a empatia dizem alguma palavra do tema ("${temaTermo}") — quem clica no título `
      + 'tem de ouvir o assunto logo no arranque. Encaixe o assunto na pergunta da capa ou, no máximo, no bloco 2.',
    );
  }

  /**
   * ♦ O GUARD DOS NÚMEROS FOI REDESENHADO EM 03/08/2026 — com o nome certo em cada
   * camada, depois de a varredura adversarial derrubar duas versões.
   *
   * O anterior barrava QUALQUER valor sem fonte. MEDIDO: reprovava os TRÊS
   * roteiros-modelo que o dono aprovou ("somei as minhas e deu novecentos" é número
   * de HISTÓRIA — não afirma nada sobre o mundo, só sobre a história contada).
   * E a verdade incómoda, provada na adversarial: nenhuma regra de texto barata
   * separa "número de história" de "conta inventada" — a diferença é a AUTORIA.
   * O "duzentos a mais" inventado de 01/08 é textualmente igual ao "novecentos" do
   * dono. Fingir que uma trava resolve isso seria plantar a 15ª ocorrência.
   *
   * O que fica GARANTIDO POR CÓDIGO (verdade, não gosto):
   *  1. PERCENTAGEM sem fonte → ERRO, sempre — em dígitos ("13,5%") OU por extenso
   *     ("treze por cento"). É o caso Selic de julho, agora sem o furo do extenso.
   *  2. Frase com RADICAL DE RENDIMENTO (rende, juros, selic, cdi, tesouro,
   *     poupança, investe, vira/virou) + valor em dinheiro:
   *     · sem ficha → ERRO (conta de rendimento exige conta calculada);
   *     · com ficha → o valor tem de bater com a ficha.
   *  3. Números de HISTÓRIA ficam por conta do PROMPT (redondos, modestos, nunca
   *     prometendo rendimento) e do SEGUNDO LEITOR — não de regex.
   * O buraco ASSUMIDO (está no §31): uma transformação de juros escrita sem nenhum
   * radical escapa. O conserto verdadeiro é a ficha para mais temas (fase 2).
   */
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
   * ♦ Lê os números por extenso COMPOSTOS: "dois mil seiscentos e noventa e nove"
   * é UM número (2699), não quatro pedaços. A 1ª versão comparava os PEDAÇOS com a
   * ficha e REPROVAVA o valor certo dito por extenso — exatamente como o canal
   * manda dizer. Apanhado na revisão pós-execução, provado por teste.
   * "por cento" corta a leitura de propósito: "quatorze por cento" é percentagem
   * (tem trava própria), não o número 14 solto.
   *
   * ♦ 07/08/2026 — TRÊS CONSERTOS, todos medidos na corrida que matou o Short do dia
   * (run 31159159005). Nenhum deles afrouxa a trava: os três TIRAM números que a
   * leitura inventava, e um número inventado pelo validador reprova texto bom.
   *
   *  1. A ORDEM DECRESCENTE fecha o numeral. Um número composto desce sempre
   *     ("dois MIL, SEIScentos e NOVENTA e NOVE"); uma ENUMERAÇÃO sobe ("um,
   *     cinco e dez anos"). A versão anterior partia a frase por tudo o que não
   *     fosse letra — a vírgula da enumeração desaparecia — e somava 1+5+10 = 16.
   *     Reprovou 2 das 4 tentativas de 07/08 por causa de um 16 que ninguém disse.
   *  2. Os DÍGITOS entram no mesmo leitor: "3 mil" vale 3000. Antes o "3" era lido
   *     à parte (e descartado por ser < 10) e o "mil" ficava órfão a valer 1000.
   *  3. O PRAZO não é valor. "em dez anos" não promete rendimento nenhum — e a
   *     prova de que isto sempre foi um remendo está na própria ficha, que
   *     autorizava `meses/12` só para deixar passar o "dez anos".
   */
  const PALAVRA_DE_PRAZO = new Set(['ano', 'anos', 'mes', 'meses', 'dia', 'dias', 'semana', 'semanas']);
  const valoresDaFrase = (frase) => {
    const achados = new Set();
    const tokens = semAcento(frase).match(/\p{L}+|\d[\d.]*\d|\d/gu) || [];
    let acc = 0;            // o que ainda não passou pelo "mil"
    let total = 0;          // milhares já fechados
    let ultima = Infinity;  // a última parcela lida — num numeral composto ela DESCE
    let lendo = false;
    // `seguinte` decide se o que acabou de ser lido é um PRAZO ("dez anos") em vez
    // de um valor. Sem ele, o prazo entrava na conta de rendimento como dinheiro.
    const fechar = (seguinte) => {
      if (lendo && total + acc > 0 && !PALAVRA_DE_PRAZO.has(seguinte)) achados.add(total + acc);
      acc = 0; total = 0; ultima = Infinity; lendo = false;
    };
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (t === 'mil') { total += (acc || 1) * 1000; acc = 0; ultima = Infinity; lendo = true; continue; }
      const valor = /^\d/.test(t)
        ? Number(t.replace(/\./g, ''))
        : (Object.prototype.hasOwnProperty.call(EXTENSO_VALOR, t) ? EXTENSO_VALOR[t] : null);
      if (valor !== null && Number.isFinite(valor)) {
        if (tokens[i + 1] === 'por' && tokens[i + 2] === 'cento') { acc = 0; total = 0; ultima = Infinity; lendo = false; i += 2; continue; }
        // Não desceu → começou outro número. É enumeração, não soma.
        if (valor >= ultima) fechar(t);
        acc += valor;
        ultima = valor;
        lendo = true;
        continue;
      }
      if (t === 'e' && lendo) continue;
      fechar(t);
    }
    fechar(undefined);
    return [...achados].filter((v) => v >= 10);
  };
  // 1. percentagem sem fonte — sempre erro, com ficha ou sem ela
  const fontesDePercentagem = `${temaTermo} ${apoio} ${(ficha && ficha.texto) || ''}`;
  if ((/\bpor cento\b/.test(semAcento(falaToda)) || /%/.test(falaToda)) && !/%|por cento/i.test(fontesDePercentagem)) {
    erros.push(
      'a fala cita uma PERCENTAGEM e nenhuma fonte (ficha, título ou apoio) traz percentagem nenhuma — '
      + 'taxa inventada é o defeito mais perigoso deste canal. Tire a percentagem e conte sem ela.',
    );
  }
  // 2. conta de rendimento: frase a frase
  /**
   * ♦ "vira" SAIU da lista e "juro" (singular) também — apanhado na revisão
   * pós-execução: o PRÓPRIO PROMPT da virada manda "o pequeno VIRA grande" e a
   * soma de história ("cinquenta por mês vira seiscentos no ano") é ordenada por
   * ele — punir "vira" era a 15ª ocorrência de prompt-contra-validador. E "Juro
   * que…" (o verbo jurar) disparava o falso positivo. O custo: "doze mil vira
   * dezoito mil" sem outro radical escapa — é o buraco JÁ assumido no §31.3.
   */
  const RADICAL_RENDIMENTO = /\b(rend\p{L}*|juros|selic|cdi|tesouro|poupanc\p{L}*|invest\p{L}*)\b/u;
  /**
   * ♦ 07/08/2026 — O NÚMERO DO PRÓPRIO TÍTULO NÃO É INVENÇÃO.
   * A regra 1 aqui em cima já aceitava o título como fonte de PERCENTAGEM; os
   * valores não tinham o mesmo direito, e foi essa assimetria que matou o Short de
   * 07/08. O tema era "Ganho R$ 3 mil por mês — como investir?"; a trava do
   * arranque OBRIGA o gancho a dizer o assunto; e esta reprovava o "três mil" que
   * o título manda dizer. Quatro tentativas, quatro chumbos, saída nenhuma — a 16ª
   * ocorrência de prompt-contra-validador.
   * Só liberta o que ESTÁ na fonte, e só quando não há ficha: com ficha calculada
   * a autoridade é a ficha, e continua a ser ela a mandar.
   */
  const valoresDaFonte = new Set(valoresDaFrase(`${temaTermo} ${apoio}`));
  for (const frase of falaToda.split(/(?<=[.!?…])\s+/)) {
    if (!RADICAL_RENDIMENTO.test(semAcento(frase))) continue;
    const valores = valoresDaFrase(frase);
    if (!valores.length) continue;
    if (!(ficha && Array.isArray(ficha.permitidos) && ficha.permitidos.length)) {
      const inventados = valores.filter((v) => !valoresDaFonte.has(v));
      if (!inventados.length) continue;
      erros.push(
        `a frase "${frase.trim()}" faz uma conta de rendimento com valores (${inventados.join(', ')}) e este tema NÃO tem conta calculada — `
        + 'sem ficha, conte a virada sem prometer rendimento, ou tire o número dessa frase.',
      );
    } else {
      const fora = valores.filter((v) => !ficha.permitidos.some((p) => Math.abs(p - v) <= 2));
      if (fora.length) {
        erros.push(
          `a frase "${frase.trim()}" cita ${fora.join(', ')} numa conta de rendimento e esse valor NÃO está na ficha calculada. `
          + `Use só: ${ficha.permitidos.slice(0, 8).join(', ')}`,
        );
      }
    }
  }

  if (ficha && Array.isArray(ficha.permitidos) && ficha.permitidos.length) {
    const citados = Array.isArray(n.numerosCitados) ? n.numerosCitados : null;
    if (!citados) {
      avisos.push('o campo "numerosCitados" não veio — não foi possível conferir os valores ditos contra a ficha');
    } else {
      const foraDaFicha = citados
        .map((v) => Math.round(Number(v)))
        .filter((v) => Number.isFinite(v) && v >= 10)
        .filter((v) => !ficha.permitidos.some((p) => Math.abs(p - v) <= 2));
      if (foraDaFicha.length) {
        // ♦ Era ERRO e reprovava os números de HISTÓRIA do padrão do dono ("cinquenta
        // aqui, oitenta ali"). As contas de RENDIMENTO já são conferidas frase a frase
        // lá em cima; aqui fica o aviso, para o log contar o que foi dito fora da ficha.
        avisos.push(`a fala cita ${foraDaFicha.join(', ')} fora da ficha — se for número de história, ok; conta de rendimento já teria reprovado acima`);
      }
    }
    // algarismos soltos na fala (a regra manda falar por extenso) que não sejam da ficha
    // O separador de milhar precisa entrar na captura: `\b(\d{2,})\b` partia
    // "R$ 2.699" em "2" e "699" e acusava 699 como número inventado (falso alarme
    // no 6º teste). Agora captura o número inteiro e remove os pontos.
    const emAlgarismo = [...falaToda.matchAll(/\d[\d.]*\d|\d{2,}/g)]
      .map((m) => Number(String(m[0]).replace(/\./g, '')))
      .filter((v) => Number.isFinite(v) && v >= 10);
    const estranhos = emAlgarismo.filter((v) => !ficha.permitidos.some((p) => Math.abs(p - v) <= 2));
    if (estranhos.length) {
      avisos.push(`a fala tem números em algarismo fora da ficha (${estranhos.join(', ')}) — devem ser ditos por extenso e vir da ficha`);
    }
  }

  // SENTINELA DOS NUMERAIS. `limparFala()` já conserta as grafias erradas conhecidas
  // (ver NUMERAIS_ERRADOS); esta rede apanha as que ainda não conhecemos, para nunca
  // mais sair um "cincocentos" na voz e na legenda. Corre SEMPRE, com ficha ou sem
  // ela — o caso medido em 31/07 foi num tema SEM ficha.
  // Falso alarme é quase impossível: só a família das centenas é olhada, e
  // "duzentos", "trezentos" e "quinhentos" nem terminam em "centos".
  const centosSuspeitos = [...new Set(
    // O sufixo `\p{L}*` apanha também o erro de digitação com letra a mais
    // ("setecentoss"); sem ele, `\b` exigia que a palavra terminasse exatamente em
    // "centos" e a grafia torta escapava. O `\p{L}+` inicial é o que protege
    // "centenas" e "centavos", que começam por "cent" e são palavras legítimas.
    (falaToda.match(/\b\p{L}+cent(?:os|as)\p{L}*\b/giu) || []).map((p) => p.toLowerCase()),
  )].filter((p) => !CENTENAS_VALIDAS.has(p));
  if (centosSuspeitos.length) {
    erros.push(`"${centosSuspeitos[0]}" não é um número escrito corretamente em português — corrija a grafia (ex.: duzentos, trezentos, quinhentos)`);
  }

  // brinde inexistente (ver BRINDES_PROIBIDOS)
  const brinde = falaToda.match(BRINDES_PROIBIDOS);
  if (brinde) {
    erros.push(`a fala promete "${brinde[0]}", que NÃO EXISTE — só é permitido oferecer o app FinMoovi (teste de sete dias grátis) ou a calculadora do blog`);
  }
  // GRANDEZA REBAIXADA. 1º teste: cem reais viraram "esse centavo". 3º teste: "esse
  // dinheirinho". O mesmo vício — diminutivo tira o valor da coisa que o vídeo quer
  // valorizar.
  const rebaixa = falaToda.match(/\b(centavos?|dinheirinho|trocadinho|moedinha|mixaria|migalha)\b/i);
  if (rebaixa) {
    erros.push(`a fala rebaixa o valor com "${rebaixa[0]}" — diga que PARECE pouco, mas chame o dinheiro pelo nome`);
  }

  // BOLETIM DE BANCO. 3º teste: a demonstração empilhou três valores seguidos e o
  // app virou rodapé. Mais de dois "reais" no mesmo bloco é sintoma disso.
  const demonstracao = String(blocos[3]?.fala || '');
  const quantosValores = (demonstracao.match(/\breais\b/gi) || []).length;
  if (quantosValores > 2) {
    erros.push(`o bloco "demonstracao" cita ${quantosValores} valores em dinheiro — no máximo DOIS, senão vira boletim de banco`);
  }

  // fio condutor (♦ desde 03/08 é a IMAGEM DA CAPA, não precisa de ser falada):
  // tem de existir no catálogo, ser inédito e vir do menu deste tema.
  const fio = String(n.fioCondutor || '').trim();
  if (!fio) erros.push('sem "fioCondutor"');
  else if (!METAPHORS.includes(fio)) erros.push(`fioCondutor "${fio}" fora do catálogo (${METAPHORS.join('/')})`);
  else if (proibidas.includes(fio)) erros.push(`fioCondutor "${fio}" foi usado nos vídeos recentes — escolha outro`);
  // O MENU TEM DE TER DENTES (§20.2 B3). Sem isto, o prompt oferece a lista curta
  // da família e nada impede o modelo de ir buscar outra imagem — é o modo de
  // falha crónico deste repositório: o prompt pede, nada pune, o modelo ignora.
  else if (Array.isArray(permitidas) && permitidas.length && !permitidas.includes(fio)) {
    erros.push(`fioCondutor "${fio}" não estava no menu deste tema — escolha uma de: ${permitidas.join(', ')}`);
  }
  /**
   * ♦ AQUI VIVIAM AS TRÊS TRAVAS DO FIO FALADO (dito na fala · no bloco 1 · em ≥2
   * blocos). SAÍRAM em 03/08/2026 com o padrão aprovado pelo dono: a metáfora
   * quase desapareceu da NARRAÇÃO — a imagem vive na CAPA VISUAL (é o campo
   * "fioCondutor", que agora vai gravado no script para a capa e a música) e não
   * precisa de ser falada. MEDIDO: as três reprovavam os roteiros-modelo D/E/F.
   * O campo continua obrigatório e conferido (catálogo, inédito, menu) — é ele que
   * escolhe a cena da capa e a trilha.
   */

  /**
   * ♦ AQUI VIVIA A "perguntaAberta" (a pergunta pendurada na tela) e as suas 5
   * validações. REMOVIDA em 03/08/2026: o padrão aprovado pelo dono proíbe
   * pergunta pendurada — a pergunta agora É a capa (1ª frase) e a resposta vem
   * colada. Verificado por grep: nenhum outro ficheiro consumia o campo.
   */

  /**
   * ⚠️ AQUI ESTAVA UM AVISO DE ENCADEAMENTO QUE NUNCA DISPAROU — e foi por isso que
   * o vídeo de 01/08 saiu com blocos soltos sem ninguém dar por nada.
   *
   * Ele usava `longestSharedWordRun(anterior, atual, 1)`, ou seja bastava UMA palavra
   * partilhada, incluindo "de", "o", "a", "que". Duas frases quaisquer de português
   * partilham essas. Medido no caso real: o bloco 2 que o dono reprovou por estar
   * *"solto, sem conexão com a frase anterior"* partilhava "de", "o" e "a" com o
   * bloco 1 — e passava sem um único aviso.
   *
   * Duas correções, e a segunda é a que interessa:
   *  1. só contam palavras de ASSUNTO (4+ letras, sem as vazias) — ver `assuntoDe`;
   *  2. deixou de ser AVISO e passou a ERRO. Um aviso que ninguém lê é o mesmo que
   *     não existir; foi o que aconteceu aqui durante semanas.
   * A verificação vive agora lá em cima, junto às outras exigências semânticas.
   */

  return { ok: erros.length === 0, erros, avisos, palavras };
}

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
 * O CORRETOR NÃO PODE CARREGAR ORDENS QUE SE CONTRADIZEM (31/07/2026).
 *
 * MEDIDO no re-teste dos 3 temas: na 4ª tentativa o modelo recebia ao mesmo tempo
 * "narração longa demais: 205 palavras" E "narração curta demais: 98 palavras".
 * Duas ordens opostas — não havia como acertar, e 2 dos 3 temas esgotaram as
 * tentativas (205 → 98 → 205 → 209). É o pêndulo da §19.4 outra vez, desta vez
 * causado por acumulação CEGA das queixas, não pelo número de travas.
 *
 * O tamanho é a única exigência com DOIS LADOS, por isso é a única que se
 * substitui em vez de se somar: fica sempre só a queixa mais recente.
 * O resto continua a acumular — lá, esquecer uma queixa é deixá-la voltar.
 */
const SOBRE_TAMANHO = /narração (curta|longa) demais/;

/**
 * O CORRETIVO PEDE CIRURGIA, NÃO REESCRITA (02/08/2026) — e a causa está medida.
 *
 * A ordem anterior acabava em *"reescrevendo a narração inteira"*. MEDIDO em duas
 * corridas reais de hoje, que falharam as 4 tentativas: o gerador oscilava entre DOIS
 * defeitos, sempre os mesmos. Tentativa 1 copia uma frase do exemplo → mandam-no
 * reescrever tudo → tentativa 2 já não copia mas tem 145 palavras → reescreve tudo
 * outra vez → tentativa 3 volta a copiar. Conserta a queixa e parte o que já estava bem.
 *
 * A queixa costuma ser de UMA frase; a ordem é que era do texto todo. Isto não é trava
 * nova nem regra nova sobre o que escrever — é dizer-lhe ONDE mexer. Uma frase trocada
 * pelo mesmo número de palavras não mexe no tamanho, e o pêndulo perde as duas pernas.
 *
 * Vive numa função só porque o mesmo aviso é usado no erro de JSON e no de validação —
 * escritos à mão em dois sítios, um dia divergiam.
 */
export function montarCorretivo(exigencias) {
  return [
    '⚠️ A TENTATIVA ANTERIOR FOI REJEITADA. Corrija TUDO isto ao mesmo tempo:',
    ...exigencias,
    '',
    '⛔ **MEXA SÓ NO QUE ESTÁ APONTADO ACIMA.** Todo o resto — cada bloco e cada frase de que ninguém se queixou — volta EXATAMENTE IGUAL, palavra por palavra.',
    'Reescrever o texto todo é o que faz este roteiro falhar: você conserta a queixa e parte outra coisa que já estava certa.',
    'Se a queixa for uma frase copiada do exemplo, troque SÓ essa frase por outra sua, **com mais ou menos o mesmo número de palavras** — o resto do bloco fica como está.',
  ].join('\n');
}

export function acumularExigencias(exigencias, novosErros) {
  const novas = novosErros.map((e) => `- ${e}`);
  if (novas.some((e) => SOBRE_TAMANHO.test(e))) {
    for (let k = exigencias.length - 1; k >= 0; k--) {
      if (SOBRE_TAMANHO.test(exigencias[k])) exigencias.splice(k, 1);
    }
  }
  exigencias.push(...novas);
  return [...new Set(exigencias)];
}

export async function gerarNarrativa(t, { tentativas = 4, proibidas = [], frasesRecentes = [], ficha = null } = {}) {
  const base = buildPromptNarrativa(t, proibidas, frasesRecentes, ficha);
  // a MESMA lista que foi ao prompt é a que a validação exige (§20.2 B3)
  const { lista: permitidas } = escolherImagens(`${t.term || ''} ${t.angle || ''} ${t.definition || ''}`, proibidas);
  // O TEMA é o contexto da correção de nomes (ver `corrigirNomes`). Fica calculado uma
  // vez: não depende do que o modelo escrever, e é isso que o torna seguro.
  const temaTexto = `${t.term || ''} ${t.angle || ''} ${t.definition || ''}`;
  let corretivo = '';
  const exigencias = [];
  for (let i = 1; i <= tentativas; i++) {
    if (i > 1) await dormir(20000); // mesmo respiro do gerador atual (token bucket)
    const prompt = corretivo ? `${base}\n\n${corretivo}` : base;
    // `pago: 'escritor'` = gpt-5-2 pelo kie.ai, com os três gratuitos como rede por
    // baixo. Ver `provedorPago` em apis/kie-ai.js para porque é este e não o Sonnet.
    const bruto = await generateText(prompt, { maxTokens: 4000, temperature: 0.7, pago: 'escritor' });
    let n;
    try {
      n = extrairJson(bruto);
    } catch (err) {
      exigencias.push(`- devolva JSON válido (${err.message})`);
      corretivo = montarCorretivo([...new Set(exigencias)]);
      continue;
    }
    // limpeza mecanica ANTES de validar: o que da para consertar por codigo nao
    // pode custar uma tentativa (ver limparFala e o pendulo do 5o teste).
    if (Array.isArray(n.blocos)) {
      for (const b of n.blocos) if (b && typeof b.fala === 'string') b.fala = limparFala(b.fala, temaTexto);
    }
    const apoio = `${(t && t.definition) || ''} ${(t && t.body) || ''}`;
    const conferir = (cand) => validarNarrativa(cand, proibidas, ficha, t && t.term, permitidas, apoio);
    const v = conferir(n);
    if (v.ok) {
      /**
       * ═══ O SEGUNDO LEITOR ═══
       * A narração está VERDADEIRA (números, catálogo, tamanho, promessas). Falta
       * estar BEM DITA — e isso não se mede com listas de palavras, mede-se lendo.
       * Ele só mexe nas palavras; o resultado volta a passar pelas mesmas travas e,
       * se as partir, fica o original. Ver lib/segundo-leitor.js.
       */
      /**
       * ⚠️ A LIMPEZA VAI COM ELE, e é de propósito que vai como PARÂMETRO.
       * O texto que o leitor devolve é julgado DENTRO de `revisarFala`; se a limpeza
       * mecânica só corresse cá fora, o leitor seria reprovado por um "taxa mínima" que
       * o código já sabe consertar — e perdia-se a edição inteira por causa disso.
       * Passa-se a função em vez de a importar lá dentro: `roteiro-narrativa.js` já
       * importa `revisarFala`, e o caminho inverso fecharia um ciclo entre os dois.
       */
      const limpar = (cand) => ({
        ...cand,
        blocos: (cand.blocos || []).map((b) => ({ ...b, fala: limparFala(b.fala, temaTexto) })),
      });
      const lido = await revisarFala(n, (t && t.term) || '', conferir, { limpar });
      if (lido.usada === 'leitor') {
        const vf = conferir(lido.narrativa);
        return { narrativa: lido.narrativa, avisos: vf.avisos, palavras: vf.palavras, tentativa: i, mexi: lido.mexi };
      }
      return { narrativa: n, avisos: v.avisos, palavras: v.palavras, tentativa: i, mexi: [], leitorFalhou: lido.motivo };
    }
    // ver `acumularExigencias`: o tamanho substitui, o resto acumula
    const lista = acumularExigencias(exigencias, v.erros);
    corretivo = montarCorretivo(lista);
    console.log(`  ⚠ tentativa ${i}/${tentativas} reprovada: ${v.erros.join(' | ')}`);
  }
  throw new Error(`narração não passou na validação após ${tentativas} tentativas`);
}

// ─── execução direta ─────────────────────────────────────────────────────────
const executadoDireto = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('roteiro-narrativa.js');
if (executadoDireto) {
  const slug = args.slug && args.slug !== true ? String(args.slug) : 'juros-compostos';
  const t = lerTema(slug);
  console.log(`\n📝 PASSAGEM 1 — narração de "${t.term}"${t.angle ? ` (ângulo: ${t.angle})` : ''}\n`);

  const recentes = loadRecentPublishedContext();
  const proibidas = [...new Set(recentes.flatMap((r) => r.metaphors || []))].filter((m) => m !== 'clique-link');
  const frases = recentes.flatMap((r) => r.stories || []).slice(0, 4);
  if (proibidas.length) console.log(`🚫 imagens proibidas (${recentes.length} vídeos recentes): ${proibidas.join(', ')}`);

  // Que menu de imagens este tema vai receber, e porquê (§20.2 B3).
  const escolha = escolherImagens(`${t.term} ${t.angle || ''} ${t.definition || ''}`, proibidas);
  console.log(`🖼️  família do tema: ${escolha.familia || '(não identificada — menu aberto)'} → ${escolha.lista.length} imagem(ns) no menu: ${escolha.lista.join(', ')}`);
  if (escolha.aviso) console.log(`⚠️  ${escolha.aviso}`);
  console.log('');

  // A ficha nasce do TEMA + ÂNGULO. Se o tema não traz cenário (aporte e prazo),
  // não há ficha — e o prompt passa a proibir qualquer número fora do apoio.
  const ficha = montarFichaDeNumeros(`${t.term} ${t.angle || ''}`);
  if (ficha) {
    console.log('🧮 FICHA DE NÚMEROS (calculada aqui, com as taxas do Banco Central):');
    for (const linha of ficha.texto.split('\n')) console.log(`   ${linha}`);
    console.log('');
  } else {
    console.log('🧮 sem cenário numérico no tema — o modelo fica proibido de citar números fora do material de apoio.\n');
  }
  const { narrativa, avisos, palavras, tentativa, mexi, leitorFalhou } = await gerarNarrativa(t, { proibidas, frasesRecentes: frases, ficha });

  console.log(`✅ aprovada na tentativa ${tentativa} — ${palavras} palavras (~${(palavras / PALAVRAS_POR_SEGUNDO).toFixed(0)}s de fala)`);
  // O que o SEGUNDO LEITOR mexeu. É a única janela para o trabalho dele — sem isto
  // ninguém sabe se ele está melhorar a fala ou a passar a mão por cima.
  if (leitorFalhou) {
    console.log(`📖 segundo leitor NÃO foi usado: ${leitorFalhou}`);
  } else if (mexi && mexi.length) {
    console.log(`📖 segundo leitor mexeu em ${mexi.length}:`);
    mexi.forEach((m) => console.log(`   · ${m}`));
  } else {
    console.log('📖 segundo leitor leu e não mexeu em nada.');
  }
  console.log(`🧵 imagem da capa: ${narrativa.fioCondutor}\n`);
  console.log('─'.repeat(72));
  for (const b of narrativa.blocos) {
    console.log(`\n[${b.papel.toUpperCase()}]`);
    console.log(b.fala);
  }
  console.log(`\n${'─'.repeat(72)}`);
  console.log('\n📖 A NARRAÇÃO CORRIDA (leia como quem assiste):\n');
  console.log(narrativa.blocos.map((b) => b.fala).join(' '));
  if (avisos.length) {
    console.log('\n⚠️ avisos (não reprovam):');
    avisos.forEach((a) => console.log(`   · ${a}`));
  }
  console.log('');
}
