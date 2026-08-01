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
import { keywordFalada } from './coreografia.js';
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
 * Estas palavras são as MESMAS que `PALAVRAS_DO_FIO` procura na hora de validar.
 * Escrevê-las no prompt é alinhar prompt e trava — o modo de falha crónico deste
 * repositório é justamente o prompt não dizer aquilo que a trava exige. Agora as
 * 8 imagens partem em pé de igualdade.
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

════════ QUEM ESTÁ FALANDO, E COM QUEM ════════
Escreva como **um gerente de banco explicando, com muita paciência e muita simplicidade, para um senhor humilde** que nunca estudou finanças e tem vergonha de perguntar.
Ele não sabe o que é "rotativo", "amortizar", "drenagem" ou "estratégia". Se você usar uma palavra dessas, ele desliga.
Fale COM ele, não SOBRE o assunto: "olha", "sabe", "presta atenção", "calma", "vou te explicar", "repara só".

⛔ **NADA DE FRASE DE CARTAZ.** O maior defeito deste canal é a frase que parece escrita para um slide e não dita por uma pessoa.
   ✗ "Três erros de cartão são pedras na sua mochila." (foi ao ar; o dono: *"se alguém falar isso num vídeo curto, a pessoa já sai — isso está robótico"*)
   ✓ "Sabe esses três errinhos no cartão? É que nem carregar pedra na mochila."
   A diferença: a segunda tem alguém a falar. A primeira é uma legenda.

⛔ **A IMAGEM ENTRA COMO COMPARAÇÃO, NUNCA COMO DEFINIÇÃO.** Ninguém diz "X são Y". As pessoas dizem "é tipo", "parece", "é que nem", "é igual", "imagina".
   ✗ "O erro é uma pedra na mochila."     ✓ "O erro é tipo uma pedra que entra na mochila."
   ✗ "A dívida é uma bola de ferro."      ✓ "A dívida parece uma bola de ferro no pé."

⛔ **A IMAGEM NÃO PODE CONTRADIZER-SE.** Ela tem de funcionar do princípio ao fim, com a física dela.
   ✗ "…é o pequeno que fica lá meses, ESVAZIANDO a mochila um pouquinho de cada vez." (uma mochila com pedras fica mais PESADA, nunca mais vazia — a imagem parte-se ao meio)
   ✓ "…é o pequeno que fica lá meses, pondo mais uma pedra de cada vez."
   Antes de entregar, pergunte: o que a minha imagem faz é o que ela faria na vida real?

⛔ **PALAVRAS DE ESCRITÓRIO NÃO ENTRAM.** Drenagem, solução, estratégia, mecanismo, processo, impacto, gestão, otimizar, efetivamente, realizar, utilizar, adquirir. Troque por como se diz na rua: em vez de "parar essa drenagem", "parar de perder esse dinheiro".

SUA ÚNICA TAREFA AGORA: escrever a NARRAÇÃO falada de um vídeo curto (42 a 50 segundos).
NÃO descreva imagens, ícones, sons, efeitos ou cortes. Só o texto que a voz vai falar. Outra pessoa cuida do visual depois.

⚠️ TAMANHO — É POR AQUI QUE ESTE ROTEIRO MAIS FALHA. A narração INTEIRA tem de ter entre ${MIN_PALAVRAS} e ${MAX_PALAVRAS} palavras, ou seja **${porBloco} palavras em CADA um dos 6 blocos**. Conte as palavras antes de responder. Um bloco com o dobro disto reprova o roteiro todo, por melhor que esteja escrito.

TEMA: "${t.term}"${t.angle ? `\nÂNGULO: ${t.angle}` : ''}
${t.definition ? `DEFINIÇÃO: ${t.definition}\n` : ''}${t.body ? `MATERIAL DE APOIO:\n${cortar(t.body)}\n` : ''}${ficha ? `
════════ FICHA DE NÚMEROS — JÁ CALCULADA, NÃO REFAÇA A CONTA ════════
${ficha.texto}

Estes valores foram calculados por computador com as taxas oficiais do Banco Central. São os ÚNICOS números de dinheiro que você pode dizer.
⛔ É PROIBIDO inventar, arredondar para outro valor, ou citar qualquer taxa/rendimento que não esteja aqui em cima. Se precisar de um número que não está na ficha, escreva a frase SEM número.
` : `
⛔ NÚMEROS: só pode citar números que apareçam no MATERIAL DE APOIO acima. Não invente valores, taxas ou rendimentos — este canal não tem como conferir o que você inventar, e um número errado no ar é pior do que nenhum número.
`}
════════ A REGRA MAIOR — CADA BLOCO ABRE PEGANDO NO ANTERIOR ════════
O vídeo é UMA fala contínua, não uma lista de frases bonitas. **As PRIMEIRAS PALAVRAS de cada bloco têm de agarrar aquilo que o bloco anterior acabou de dizer.**

✗ SOLTO (foi ao ar e o dono reprovou):
   bloco 1: "…tiram quinhentos reais do seu bolso todo mês. Qual será o maior vilão?"
   bloco 2: "Na correria, a gente esquece de olhar a fatura e o dinheiro some."
   Por quê: o bloco 1 pergunta quem é o vilão e o bloco 2 ignora a pergunta e começa um assunto novo. Duas frases que não se conhecem.

✓ ENCADEADO (a mesma ideia, agora presa à anterior):
   bloco 2: "O vilão escondido é a correria: você esquece de olhar a fatura e o dinheiro some."
   Por quê: abre com "o vilão", que é a palavra que ficou no ar. Quem ouve não consegue sair no meio.

⛔ **RETOMAR NÃO É ECOAR.** Não abra um bloco repetindo a última palavra do anterior como pergunta solta. Isso cumpre a forma e mata a fala.
   ✗ "…faz a dívida crescer." → "Crescer assim? No FinMoovi…"
   ✗ "…a dica completa."      → "Completa? O que pesa mais…"
   ✓ "…faz a dívida crescer." → "E é aí que ela cresce sem você ver: no FinMoovi…"
   Toda abertura de bloco é uma FRASE INTEIRA, com sujeito e verbo. Nunca uma palavra com ponto de interrogação.

⛔ NENHUMA PALAVRA NOVA SEM PREPARAÇÃO. Não introduza um assunto que ninguém apresentou.
   ✗ "Mas não é o JUROS que te aprisiona…" — juros nunca tinha sido mencionado, cai do céu.
   ✗ "…é o PAGAMENTO MÍNIMO" dito só no último bloco, sem nunca ter aparecido antes.
   Se precisa de um conceito novo, apresente-o na frase em que ele entra.

TESTE OBRIGATÓRIO: tape o bloco anterior e leia só este. Se ele fizer sentido sozinho, está SOLTO — reescreva até ele DEPENDER do anterior.

✗ ERRADO (foi ao ar e ninguém entendeu):
   "Tesouro Direto com 100 reais, vale a pena? Se liga no que eu descobri: 100 reais todo mês, 24 vezes. É como uma pequena avalanche. Qual rendimento?"
   Por quê: "24 vezes" o quê? "avalanche" de quê? a pergunta final cai do céu. São quatro pedaços que não se conhecem.

✓ CERTO (o mesmo assunto, encadeado):
   "Todo mundo acha que cem reais não muda nada. Só que eu fiz a conta de guardar esses cem reais por dois anos seguidos… e o número me assustou. Porque não é o valor que trabalha, é o tempo."
   Por quê: a 2ª frase responde à 1ª, a 3ª explica a 2ª. Ninguém consegue sair no meio.

════════ UM VÍDEO INTEIRO, PARA VOCÊ VER A FORMA ════════
🔥 **ESTE EXEMPLO AUTODESTRÓI-SE.** Copie a FORMA e o TOM. **Se você repetir CINCO PALAVRAS SEGUIDAS de qualquer frase abaixo, o roteiro é rejeitado** — sem exceção, e o computador confere. O canal publica todos os dias: se cada vídeo repetir estas frases, todos soam iguais.
⛔ A imagem do exemplo — **pneu murcho** — também NÃO está na sua lista. Se "pneu" aparecer no seu texto, é rejeitado.

${EXEMPLO_DE_FORMA.map((f, i) => `  ${i + 1}. "${f}"`).join('\n')}

Repare no que esse exemplo faz, porque é isso que se pede a você:
· o assunto e a imagem estão juntos na PRIMEIRA frase, e a imagem entra comparada ("que nem"), nunca definida;
· cada bloco abre agarrando o anterior — "o pior", "não é o grande", "esses pequenos", "os seus", "os duzentos reais";
· quem fala é uma pessoa: "olha", "você nem lembra", "caladinho", "um pouquinho de cada vez";
· o fecho responde à pergunta do início e só então vem o bordão.

════════ A ESPINHA (6 blocos, nesta ordem) ════════
1. GANCHO (~6s): a dor ou o número que choca, JÁ dizendo "${t.term}" **e JÁ com a imagem do vídeo na primeira frase**. Termine deixando uma pergunta no ar — e NÃO responda.
   ⚠️ **O TEMA E A IMAGEM CABEM NA MESMA FRASE, e os dois são OBRIGATÓRIOS.** Trocar um pelo outro reprova o roteiro.
   ✗ "Uma mochila cheia de pedras faz você perder quinhentos reais por mês. Quem é o culpado?"
      Por quê: a imagem está lá, mas o TEMA sumiu — quem clicou no título por causa de "erros de cartão" não ouve nem "erros" nem "cartão", e desiste.
   ✗ "Três erros de cartão são pedras na sua mochila. Tiram quinhentos reais do seu bolso todo mês."
      Por quê: diz tudo o que é preciso, mas diz como um cartaz. **"X são Y" não é fala, é definição.** Foi reprovado pelo dono.
   ✓ "Olha, tem três errinhos no cartão que parecem uma mochila cheia de pedra nas suas costas. São quinhentos reais que somem do seu bolso todo mês. Qual será o mais pesado?"
      Por quê: alguém está a falar. Diz o assunto, compara em vez de definir, dá o número e deixa a pergunta no ar.
   Molde do arranque: "<abertura de quem fala: olha / sabe / repara só> + <o tema> + <que parece / é tipo / é que nem> + <a imagem>. <a dor, com o número>. <pergunta que fica no ar>"
2. EMPATIA (~9s): por que isso acontece com gente normal (correria, cansaço, ninguém ensinou). Sem culpar quem assiste.
3. A VIRADA (~10s): a reviravolta. O espectador acha que o problema é A e você mostra que é B — "não é o [A] que te quebra… é o [B] que ninguém soma".
   ⛔ TERMINE NA TENSÃO. Depois de virar, NÃO explique. Explicação depois da virada mata a virada.
   ✗ "…é o tempo que ficou parado. E ele já está trabalhando, só falta ajustar." (a 2ª frase amolece a 1ª — e "trabalhando" como? "ajustar" o quê? frase que enche linguiça)
   ✗ "…é o tempo que ficou parado, o Tesouro Selic faz a grana crescer todo dia." (virou e já explicou)
   ✓ "…é o tempo que ficou parado. E ele não volta."
   Depois da virada, ou você CALA, ou aumenta a tensão. Nunca conforta.
4. A DEMONSTRAÇÃO (~10s): o app resolvendo ISSO que você acabou de revelar. **O app é quem AGE, não é rodapé.**
   ⛔ NO MÁXIMO DOIS valores em dinheiro neste bloco. Três ou mais viram boletim de banco e a pessoa desliga.
   ✗ "Cem reais dão dois mil seiscentos e noventa e nove; na poupança dá dois mil seiscentos e doze. A diferença são oitenta e seis. No FinMoovi basta abrir a calculadora." (três números empilhados e o app no fim, como enfeite)
   ✓ "Eu joguei isso na calculadora do FinMoovi e ela me mostrou uma diferença de oitenta e seis reais. Só de escolher onde deixar o dinheiro."
5. O CONVITE (~6s): peça o COMENTÁRIO com a palavra FINMOOVI, prometendo o que vai mandar. Molde a adaptar: "quer <o que resolve neste tema>? comenta FINMOOVI aqui que eu te mando."
6. O FECHO (~8s): RESPONDA, com todas as letras, a pergunta que ficou no ar no bloco 1, e feche a imagem do vídeo. Sem "tchau", sem "até a próxima".
   ⛔ **NÃO termine com outra pergunta.** O fecho é quem responde, não quem pergunta.
   ✗ "…e quando você corta, os quinhentos reais voltam pra você. E agora?" (foi ao ar; o dono: *"o que é 'e agora'???"*)
   ✓ "…quem tira a pedra da mochila anda leve o mês inteiro."
   É AQUI, e só aqui, que entra o bordão do canal — como assinatura, na última frase.

════════ O FIO CONDUTOR ════════
Escolha UMA imagem física para o vídeo inteiro e faça-a CRESCER: pequena no bloco 1, forte no 3, paga no 6. É a mesma imagem sempre — nunca troque no meio.
Escolha entre: ${menuDeImagens}.
Escolha a que COMBINA com este tema — a imagem existe para explicar, não para enfeitar. Se ela não explicar nada aqui, é a imagem errada.
⚠️ A imagem tem de ser DITA NA FALA, com as palavras dela (as que estão entre parênteses acima), **no BLOCO 1 obrigatoriamente e em pelo menos TRÊS blocos ao todo**. Preencher o campo "fioCondutor" e não falar da imagem em lugar nenhum NÃO conta: o campo fica cheio e o vídeo fica sem fio.
⛔ **Se a imagem só entrar a meio do vídeo, a primeira metade fica sem sentido** — foi o defeito que o dono apanhou: *"ele vai falar da pedra na mochila somente na metade do vídeo, sem conexão nenhuma com aquilo que foi dito até agora"*. Ela abre o vídeo.
   A MECÂNICA — o exemplo abaixo usa DE PROPÓSITO uma imagem que NÃO está na lista, para você ver só a forma. ⛔ Nunca a use: se ela aparecer no seu texto, o roteiro é rejeitado.
      bloco 1: "é uma pedra pequena na mochila…" → bloco 3: "e a mochila já pesa em cada passo" → bloco 6: "quem tira a pedra anda mais rápido".
   Repare: é a MESMA imagem nos três, e ela CRESCE. Faça exatamente isto — com a sua imagem, e com as SUAS palavras.
⛔ PROIBIDAS (já usadas nos vídeos recentes): ${bloqueadas}${evitarFrases}

════════ O QUE VOCÊ PODE PROMETER ════════
SOMENTE duas coisas, porque só estas existem: o **app FinMoovi (grátis)** e a **calculadora do blog**.
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
- Números por extenso na fala ("cem reais", "trinta por cento") — nunca símbolos.
- Diga a unidade na PRIMEIRA menção: "aos vinte e cinco anos… aos trinta e cinco".
- Diga "vídeo", nunca "Short".
- OBRIGATÓRIO: diga o bordão do canal UMA vez, **e SÓ no bloco 6 (o fecho)**, como assinatura: "${BORDAO}"
  ⛔ No meio da história ele parte a corrente — o dono reprovou exatamente isso: *"fica muito sem sentido aí no meio, está mais atrapalhando do que ajudando"*.
- ⛔ NUNCA mande clicar em link ("link na descrição/bio/aqui embaixo"). Em vídeo vertical o link não é clicável — por isso o convite é o comentário.
- ⛔ NUNCA use asteriscos, travessões ou qualquer marcação. Só texto limpo.

Responda APENAS com JSON válido, sem markdown:
{
  "fioCondutor": "<uma das imagens permitidas>",
  "perguntaAberta": "<a dúvida crua que o vídeo segura, MAIÚSCULAS, até 26 caracteres, SEMPRE na 3ª pessoa (é a dúvida de quem assiste, nunca sua: escreva RENDE, não RENDI). É a pergunta que fica na TELA, não o título: NÃO repita o nome do tema, não abrevie nem corte palavras. Ex.: 'QUANTO RENDE MESMO?', 'PRA ONDE FOI?', 'VALE A PENA ESPERAR?'>",
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
const EXEMPLO_DE_FORMA = [
  'Olha, tem três descontos na sua conta que são que nem pneu murcho: você anda, mas anda devagar. São duzentos reais por mês que somem sem você ver. Qual será o pior deles?',
  'O pior é o que você nem lembra que assinou. A vida corre, ninguém te ensinou a olhar isso, e o pneu vai perdendo ar caladinho.',
  'Só que não é o desconto grande que te para. É o pequeno, que fica lá meses, esvaziando o pneu um pouquinho de cada vez.',
  'No FinMoovi você abre a conta e ele te mostra esses pequenos, um por um, com o valor do lado. Aí você vê o pneu murchando.',
  'Quer ver os seus? Comenta FINMOOVI aqui que eu te mando a calculadora do blog.',
  `Os duzentos reais voltam quando você tira os pequenos da frente — é o pneu cheio de novo. ${BORDAO}`,
];

/**
 * O TEXTO CONTRA O QUAL SE MEDE A CÓPIA — e repare no que fica DE FORA.
 *
 * · O bloco 5 (o convite) sai: "comenta FINMOOVI aqui que eu te mando" é o molde
 *   que o próprio prompt manda usar. Puni-lo seria reprovar quem obedece — o modo
 *   de falha crónico deste repositório.
 * · O bordão sai pela mesma razão: é obrigatório dizê-lo, à letra.
 * Sobra a ESCRITA — que é o que tem de ser original em cada vídeo.
 */
const EXEMPLO_PARA_COMPARAR = [
  EXEMPLO_DE_FORMA[0], EXEMPLO_DE_FORMA[1], EXEMPLO_DE_FORMA[2], EXEMPLO_DE_FORMA[3],
  EXEMPLO_DE_FORMA[5].replace(BORDAO, ''),
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
export function limparFala(texto) {
  // primeiro os algarismos viram palavras, depois corrige-se a grafia dessas
  // palavras — por esta ordem, senão "cincocentos" nunca chegaria a existir.
  return corrigirNumerais(numerosPorExtenso(String(texto || '')))
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
const MIN_PALAVRAS = 120; // ≈ 46s de fala
const MAX_PALAVRAS = 140; // ≈ 51s de fala → ~56s de vídeo

/**
 * O FIO CONDUTOR PRECISA SER DITO, não só declarado (31/07/2026).
 * No 1º teste o modelo devolveu `fioCondutor: "semente"` e **não plantou semente
 * nenhuma na narração** — campo preenchido, imagem ausente. O validador aceitou
 * porque só olhava o campo. Estas são as palavras que provam que a imagem existe
 * NA FALA; não precisam ser exatas (basta o radical).
 */
const PALAVRAS_DO_FIO = {
  'bola-neve': ['bola de neve', 'bolinha', 'neve', 'ladeira', 'rolar', 'rola'],
  // "montanha" saiu: casava com "montanha-russa" e deixava a avalanche passar sem
  // se falar de avalanche nenhuma (achado do teste de cruzamento, 31/07).
  avalanche: ['avalanche', 'desab', 'soterr', 'desmoron'],
  escorregao: ['escorreg', 'tropec', 'tropeç', 'derrap', 'escorrega'],
  foguete: ['foguete', 'decol', 'lançamento', 'propuls'],
  semente: ['semente', 'plant', 'brot', 'germin', 'raiz', 'colher', 'árvore', 'arvore', 'muda'],
  'montanha-russa': ['montanha-russa', 'montanha russa', 'sobe e desce', 'looping', 'carrinho'],
  // "ar " saiu: casava com QUALQUER palavra terminada em "ar" seguida de espaço
  // ("plantar e", "comprar o"…) — a bolha passava em praticamente qualquer texto.
  bolha: ['bolha', 'estour', 'infl'],
  // "escorr" saiu: casava com "escorrega" (que é o escorregão) e com "escorre" da
  // ampulheta. "escorrend" é do ralo e só do ralo.
  ralo: ['ralo', 'escorrend', 'escoa', 'vaza', 'ping', 'torneira'],
  // leva 1 da ampliação. ⚠️ Cada entrada aqui TEM de casar com a mesma imagem em
  // `DICAS_DO_FIO`: foi a divergência entre os dois que deu 8/8 à semente (§19.9).
  // "relógio" saiu daqui na leva 3: passou a ser imagem própria, e deixar a palavra
  // nas duas fazia a ampulheta passar sem se falar de areia nenhuma.
  // "areia" sozinha saiu: era partilhada com a areia-movediça (as duas são areia).
  // A ampulheta pede o nome dela, o tempo a escorrer ou o prazo.
  ampulheta: ['ampulheta', 'o tempo escorre', 'prazo', 'ultimo grão', 'último grão', 'grão de areia'],
  balanca: ['balanç', 'balanc', 'pesar', 'pesa mais', 'pender', 'pende', 'prato'],
  // "peso"/"pesa" saíram: eram genéricos e a frase da balança validava esta imagem.
  'bola-de-ferro': ['bola de ferro', 'corrente', 'arrast', 'acorrent', 'preso', 'presa'],
  'guarda-chuva': ['guarda-chuva', 'guarda chuva', 'chuva', 'seco', 'molha', 'temporal'],
  // leva 2. As formas COM e SEM acento entram as duas: a busca compara o texto tal
  // como o modelo o escreveu, sem tirar acentos.
  // "preso"/"presa" saíram: são da bola-de-ferro. A ratoeira tem palavras próprias.
  ratoeira: ['ratoeira', 'armadilha', 'isca', 'fecha em cima', 'caiu na'],
  'mochila-pedras': ['mochila', 'pedra', 'peso nas costas', 'carreg', 'costas'],
  // "areia" sozinha saiu (ver ampulheta): o que define esta imagem é o MOVEDIÇA.
  'areia-movedica': ['areia movediça', 'areia movedica', 'movediç', 'movedic', 'afund', 'atol'],
  domino: ['dominó', 'domino', 'derrub', 'em cadeia', 'peça cai', 'peca cai'],
  // leva 3
  // "desab" saiu: é a palavra da avalanche. Esta imagem pede o castelo.
  'castelo-cartas': ['castelo de cartas', 'castelo', 'de cartas', 'vem abaixo', 'vir abaixo', 'ruir'],
  gangorra: ['gangorra', 'sobe e desce', 'sobe, desce', 'de um lado pro outro', 'pra cima e pra baixo'],
  'corda-bamba': ['corda bamba', 'corda-bamba', 'na corda', 'equilíbri', 'equilibri', 'sem rede', 'desequilibr'],
  relogio: ['relógio', 'relogio', 'ponteiro', 'o tempo corre', 'contra o tempo', 'hora passa', 'cada minuto'],
  // leva 4
  vela: ['vela', 'queim', 'derret', 'chama', 'pavio', 'apagar'],
  'trem-perdido': ['trem', 'plataforma', 'vagão', 'vagao', 'estação', 'estacao', 'ja partiu', 'já partiu'],
  bifurcacao: ['bifurca', 'dois caminhos', 'encruzilhada', 'estrada se divide', 'dois lados da estrada'],
  'duas-portas': ['duas portas', 'porta', 'abre uma', 'abrir uma', 'a outra fecha'],
  // leva 5
  semaforo: ['semáforo', 'semaforo', 'sinal verde', 'sinal vermelho', 'sinal fecha', 'sinal abre', 'luz verde', 'luz vermelha'],
  cofre: ['cofre', 'tranc', 'guardado', 'a salvo', 'no seguro'],
  escudo: ['escudo', 'blind', 'golpe', 'aparar', 'aguenta o'],
  boia: ['boia', 'bóia', 'salva-vidas', 'te segura', 'se segurar', 'à tona', 'a tona', 'flutu'],
  // leva 6 (última)
  escada: ['escada', 'degrau', 'um de cada vez', 'passo a passo', 'subindo aos poucos'],
  // sem 'vaza' aqui: essa palavra é do ralo (ver o teste de cruzamento)
  'balde-furado': ['balde', 'furo', 'furad', 'perde por baixo', 'enche e some'],
  buraco: ['buraco', 'cavar', 'cavando', 'cava mais', 'mais fundo', 'fundo do poço'],
  // sem 'queim' aqui: essa palavra é da vela
  fumaca: ['fumaça', 'fumaca', 'virou fumaça', 'virar fumaça', 'evapor', 'foi pro ar'],
};

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

export function validarNarrativa(n, proibidas = [], ficha = null, temaTermo = '', permitidas = null) {
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
  if (palavras < MIN_PALAVRAS) erros.push(`narração curta demais: ${palavras} palavras (mínimo ${MIN_PALAVRAS} ≈ 42s)`);
  if (palavras > MAX_PALAVRAS) erros.push(`narração longa demais: ${palavras} palavras (máximo ${MAX_PALAVRAS} ≈ 50s)`);

  // Marcação, travessão, dois-pontos, ponto e vírgula e parênteses NÃO reprovam mais:
  // são limpos por `limparFala()` antes de chegar aqui (ver o comentário lá em cima
  // sobre o pêndulo do 5º teste). Aqui ficam só as exigências SEMÂNTICAS.
  if (/\bshorts?\b/i.test(falaToda)) erros.push('a fala diz "Short" — o canal fala sempre "vídeo"');
  if (/link (na|no|aqui)|clica no link|na bio|na descri/i.test(falaToda)) {
    erros.push('a fala manda clicar em link — em vídeo vertical o link não é clicável; o convite é o comentário');
  }
  if (!/finmoovi/i.test(blocos[4]?.fala || '')) erros.push('o bloco "convite" não pede o comentário com a palavra FINMOOVI');
  // BORDÃO — passa de aviso a ERRO (31/07/2026). O prompt manda dizê-lo uma vez e
  // nada cobrava: no 4º teste ele simplesmente sumiu. É o mesmo padrão que este
  // repositório já pagou caro — o prompt pede, nada pune, o modelo ignora.
  // A busca é por uma âncora SEM acento e em minúsculas: comparar a frase inteira
  // com acentuação daria falso negativo à primeira variação de pontuação.
  const semAcento = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (!semAcento(falaToda).includes(semAcento('dinheiro sem controle'))) {
    erros.push(`o bordão do canal não foi dito — encaixe uma vez: "${BORDAO}"`);
  } else if (!semAcento(blocos[5]?.fala || '').includes(semAcento('dinheiro sem controle'))) {
    // O BORDÃO SÓ NO FIM (decisão do dono, 01/08/2026).
    // Ele estava obrigatório em QUALQUER sítio e caiu no bloco 2, no meio da
    // história: *"essa frase fica muito sem sentido aí no meio… está mais
    // atrapalhando do que ajudando"*. Um bordão fecha, não interrompe.
    erros.push(`o bordão está no meio da história — ele só pode aparecer no ÚLTIMO bloco (fecho), como assinatura: "${BORDAO}"`);
  }

  /**
   * A CORRENTE — cada bloco tem de PEGAR no anterior (defeito nº1 de 01/08/2026).
   *
   * O dono, depois de ouvir o vídeo: *"aqui já ficou meio estranho, ficou quase que
   * uma frase solta, ela não tem conexão com a frase anterior"*. E deu a correção:
   * o bloco 1 acaba a perguntar quem é o vilão, logo o bloco 2 tem de ABRIR com o
   * vilão — *"tem continuação, tem sentido, não é uma frase sem nexo"*.
   *
   * ⚠️ POR QUE ESTA TRAVA E NÃO OUTRA. Sentido não se mede por código. O que se mede
   * é se dois blocos seguidos falam sequer da MESMA COISA: uma continuação natural
   * repete quase sempre um substantivo do que acabou de ser dito. Provado contra o
   * caso real: o bloco 2 que o dono reprovou NÃO partilha uma única palavra com o
   * bloco 1, e a reescrita que ele propôs ("O vilão escondido...") partilha "vilão".
   *
   * ⚠️ E O QUE ESTA TRAVA NÃO FAZ: não obriga a colar frases de ligação do género
   * "e é aí que...". Isso daria cola robótica em todos os blocos, que é pior do que
   * o defeito. A ligação verdadeira faz-se no prompt; isto é só a rede por baixo.
   */
  const VAZIAS_DE_ASSUNTO = new Set(['você', 'voce', 'para', 'como', 'quando', 'porque', 'porém', 'porem',
    'mesmo', 'ainda', 'todo', 'toda', 'todos', 'todas', 'cada', 'mais', 'menos', 'muito', 'muita',
    'isso', 'esse', 'essa', 'esses', 'essas', 'aquilo', 'aquele', 'aquela', 'sobre', 'entre',
    'pode', 'podem', 'está', 'esta', 'estão', 'ser', 'tem', 'nem', 'sem', 'com', 'que', 'mas',
    'agora', 'depois', 'antes', 'aqui', 'assim', 'sempre', 'nunca', 'nada', 'algo', 'coisa']);
  const assuntoDe = (texto) => new Set(
    semAcento(texto)
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((p) => p.length >= 4 && !VAZIAS_DE_ASSUNTO.has(p))
      .map((p) => p.replace(/s$/, '')), // singular/plural contam como a mesma palavra
  );
  /**
   * ⚠️ A COLA ROBÓTICA — o tiro pela culatra da regra acima, apanhado no MESMO dia
   * em que a instalei (01/08/2026).
   *
   * Bastava partilhar uma palavra com o bloco anterior. O modelo descobriu o atalho
   * e passou a abrir os blocos ECOANDO a última palavra como pergunta solta:
   *   "…faz a dívida crescer." → "**Crescer assim?** No FinMoovi…"
   *   "…quinhentos reais."     → "**Reais que somem?** Quer descobrir…"
   *   "…a dica completa."      → "**Completa?** O que pesa mais…"
   * Cumpre a trava e destrói a fala — exatamente o que eu tinha escrito no
   * comentário desta regra que NÃO podia acontecer.
   *
   * O conserto é medir se a abertura é uma FRASE ou um eco: uma frase de verdade
   * tem sujeito e verbo e não cabe em quatro palavras.
   */
  const primeiraFrase = (texto) => String(texto || '').trim().split(/(?<=[.!?…])\s+/)[0] || '';
  for (let i = 0; i < blocos.length; i++) {
    const abertura = primeiraFrase(blocos[i]?.fala);
    const nPalavras = abertura.split(/\s+/).filter(Boolean).length;
    if (nPalavras && nPalavras < 5) {
      erros.push(
        `o bloco ${i + 1} (${PAPEIS[i]}) abre com "${abertura}" — ${nPalavras} palavras não são uma frase, são um eco. `
        + 'Não retome o bloco anterior repetindo a última palavra dele como pergunta solta; retome com uma frase inteira, '
        + 'como alguém a falar (✗ "Completa?" · ✓ "E essa dica completa é simples:").',
      );
    }
  }

  /**
   * ⚠️ A CORRENTE É EXIGIDA NA ESPINHA DA HISTÓRIA (blocos 1→2→3→4), NÃO ATRAVÉS DO
   * CONVITE. Corrigido na tarde de 01/08 depois de o gerador falhar 4 tentativas.
   *
   * O bloco 5 é a chamada para ação — "comenta FINMOOVI aqui" — e é, por desenho,
   * uma PAUSA na história: o seu vocabulário é o do pedido, não o do assunto.
   * Exigir que a história passe por dentro dele era lutar contra o próprio formato,
   * e foi o que derrubou a 3ª tentativa.
   * O fecho continua preso à história — só que ao CORPO dela (qualquer um dos
   * blocos 1 a 4), e não à frase do convite que o antecede.
   */
  const ligaCom = (i, candidatos) => {
    const agora = assuntoDe(blocos[i]?.fala || '');
    return candidatos.some((j) => {
      const antes = assuntoDe(blocos[j]?.fala || '');
      return [...agora].some((p) => antes.has(p));
    });
  };
  for (const i of [1, 2, 3]) {
    if (!ligaCom(i, [i - 1])) {
      erros.push(
        `o bloco ${i + 1} (${PAPEIS[i]}) não pega em NADA do bloco ${i} (${PAPEIS[i - 1]}) — `
        + 'é uma frase solta, não a continuação da história. Abra o bloco retomando aquilo '
        + `que o anterior acabou de dizer (ex.: se o bloco ${i} termina a perguntar quem é o `
        + 'vilão, comece por "o vilão escondido é...").',
      );
    }
  }
  if (blocos.length === 6 && !ligaCom(5, [0, 1, 2, 3])) {
    erros.push(
      'o fecho não retoma NADA da história (blocos 1 a 4) — ele é quem fecha o que foi contado. '
      + 'Volte à imagem e à dor do início, com todas as letras.',
    );
  }

  /**
   * O FECHO RESPONDE, NÃO PERGUNTA (defeito de 01/08/2026).
   * O vídeo acabou em *"E agora?"* e o dono: *"o que é 'e agora'???"*. A instrução
   * dizia "termine com uma provocação" e o modelo leu isso como FAZER OUTRA PERGUNTA.
   * A instrução foi reescrita no MESMO passo que esta trava.
   */
  const fechoTexto = String(blocos[5]?.fala || '').trim();
  if (/\?\s*$/.test(fechoTexto)) {
    erros.push('o fecho acaba com uma PERGUNTA — ele é quem RESPONDE a pergunta do bloco 1, não quem faz outra. Termine numa afirmação.');
  }

  /**
   * O GANCHO TEM DE DIZER O TEMA — e esta trava nasceu de um defeito REAL de
   * 01/08/2026, apanhado 20 minutos depois de eu instalar a regra da imagem.
   *
   * Ao passar a exigir a imagem logo na primeira frase, o modelo trocou o TEMA pela
   * IMAGEM: o gancho saiu "Uma mochila cheia de pedras faz você perder quinhentos
   * reais por mês" — sem "erros", sem "cartão". O vídeo prometia no título "3 erros
   * de cartão" e não dizia nenhum.
   *
   * Pior: a PASSAGEM 2 recusa isso de imediato (`keywordFalada` devolve null) e a
   * narração já vem fechada de cá — ou seja, o roteiro morria sem hipótese de
   * conserto, com o erro a apontar para o sítio errado. Já paguei este pêndulo uma
   * vez (§20.3, C-1: 4 chamadas queimadas).
   *
   * A regra vive na passagem 2; aqui só se FALHA MAIS CEDO, no único momento em que
   * ainda há quem possa reescrever a frase.
   */
  /**
   * A IMAGEM ENTRA COMO COMPARAÇÃO, NUNCA COMO DEFINIÇÃO (01/08/2026).
   *
   * O dono, ao ler "Três erros de cartão SÃO pedras na sua mochila":
   * *"olha que frase nada a ver… se alguém falar isso num vídeo curto a pessoa já
   * sai. Isso está robótico."* E deu a correção exata: *"3 erros de cartão QUE
   * PARECE uma mochila com pedras"*.
   *
   * ⚠️ E a frase robótica saiu do MEU molde, que dizia literalmente "<o tema> é/são
   * <a imagem>". Terceira vez hoje que o prompt produz aquilo que depois se reprova.
   *
   * A trava é positiva, não proibitiva: no bloco onde a imagem aparece pela primeira
   * vez tem de haver uma palavra de COMPARAÇÃO. É assim que se fala de uma imagem
   * na vida real — ninguém declara equivalências.
   */
  /**
   * PALAVRAS DE ESCRITÓRIO — o dono quer *"um gerente de banco falando de forma
   * muito simples com um senhor muito humilde"*. Estas palavras existem em
   * relatórios, não em conversas. Saíram no roteiro de 01/08: "drenagem",
   * "drenando", "a solução".
   */
  const PALAVRAS_DE_ESCRITORIO = ['drenagem', 'drenando', 'drenar', 'otimizar', 'otimizacao',
    'estrategia', 'mecanismo', 'efetivamente', 'realizar', 'utilizar', 'adquirir',
    'gestao', 'monitoramento', 'impacto financeiro', 'solucao'];
  const falaSemAcento = semAcento(falaToda);
  const encontradas = PALAVRAS_DE_ESCRITORIO.filter((p) => falaSemAcento.includes(p));
  if (encontradas.length) {
    erros.push(
      `a fala usa palavra de escritório: "${encontradas.join('", "')}" — ninguém diz isso a conversar. `
      + 'Troque pelo que se diz na rua (ex.: "parar essa drenagem" → "parar de perder esse dinheiro").',
    );
  }

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

  if (temaTermo && blocos[0] && !keywordFalada(temaTermo, blocos[0].fala)) {
    erros.push(
      `o gancho não diz nenhuma palavra do tema ("${temaTermo}") — quem clica no título tem de ouvir o assunto na 1ª frase. `
      + 'A imagem abre o vídeo, mas o TEMA tem de estar lá também: os dois cabem na mesma frase.',
    );
  }

  // NÚMEROS INVENTADOS — o defeito mais perigoso dos dois primeiros testes: o mesmo
  // cálculo saiu R$ 2.725/R$ 2.540 numa vez e R$ 2.740/R$ 2.630 noutra, mais uma
  // "Selic de 13,5%" que não existe. Com a ficha calculada no prompt, o modelo passa
  // a declarar o que citou — e aqui confere-se contra o que o computador calculou.
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
        erros.push(`a fala cita ${foraDaFicha.join(', ')} — número que NÃO está na ficha calculada. Use só: ${ficha.permitidos.slice(0, 6).join(', ')}`);
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
    erros.push(`a fala promete "${brinde[0]}", que NÃO EXISTE — só é permitido oferecer o app FinMoovi (grátis) ou a calculadora do blog`);
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

  // fio condutor: precisa existir NO CATÁLOGO, ser inédito e — o que faltava — ser
  // realmente DITO na narração, em mais de um bloco (é o fio que CRESCE).
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
  else {
    const pistas = PALAVRAS_DO_FIO[fio] || [fio];
    const temFio = (b) => {
      const f = String((b && b.fala) || '').toLowerCase();
      return pistas.some((p) => f.includes(p));
    };
    const blocosComFio = blocos.filter(temFio).length;
    if (blocosComFio === 0) {
      erros.push(`o fio condutor "${fio}" foi declarado mas NÃO APARECE na fala — a imagem tem de ser DITA (ex.: ${pistas.slice(0, 3).join(', ')}…), não só escolhida`);
    } else {
      /**
       * A IMAGEM ENTRA LOGO NO BLOCO 1 — e isto é o defeito nº1 de 01/08/2026.
       *
       * A trava só exigia "2 blocos quaisquer". O texto do prompt pedia a imagem
       * "pequena no bloco 1", mas nada verificava, então o modelo punha-a do bloco 3
       * em diante e passava. O dono, ao ver o vídeo: *"ele vai falar da pedra na
       * mochila somente na metade do vídeo, sem conexão nenhuma com aquilo que foi
       * dito até agora"*. É o padrão crónico deste repositório — o prompt pede, nada
       * pune, o modelo ignora.
       *
       * Palavras dele sobre o que quer no arranque: *"Pedras na mochila podem fazer
       * você gastar R$ 500 todo mês sem perceber! Calma! Vou te explicar..."*
       */
      if (!temFio(blocos[0])) {
        erros.push(
          `o fio condutor "${fio}" não aparece no BLOCO 1 — a imagem tem de abrir o vídeo, `
          + 'senão a história só começa a meio e a primeira metade fica sem sentido. '
          + `Diga-a já na primeira frase (ex.: ${pistas.slice(0, 3).join(', ')}…).`,
        );
      }
      /**
       * ⚠️ VOLTOU A 2, depois de eu o ter subido para 3 nesta mesma manhã.
       * A exigência de 3 blocos derrubou uma das 4 tentativas do gerador, e não
       * paga o que custa: **com o bloco 1 agora obrigatório**, "2 blocos" já
       * significa "abre o vídeo e volta pelo menos uma vez". O crescimento da
       * imagem é trabalho do prompt, não de mais uma trava — foi a acumular travas
       * que o roteiro deixou de passar de todo.
       */
      if (blocosComFio < 2) {
        erros.push(`o fio condutor "${fio}" aparece em 1 bloco só — ele precisa CRESCER: abre no início e volta, pelo menos, na virada ou no fecho`);
      }

      /**
       * A IMAGEM ENTRA COMO COMPARAÇÃO, NUNCA COMO DEFINIÇÃO (01/08/2026).
       *
       * O dono, ao ler "Três erros de cartão SÃO pedras na sua mochila":
       * *"olha que frase nada a ver… se alguém falar isso num vídeo curto a pessoa
       * já sai. Isso está robótico."* E deu a correção exata: *"3 erros de cartão
       * QUE PARECE uma mochila com pedras"*.
       *
       * ⚠️ E a frase robótica saiu do MEU molde, que dizia literalmente
       * "<o tema> é/são <a imagem>". Terceira vez no mesmo dia que o prompt produz
       * aquilo que a trava depois reprova — por isso o molde foi reescrito no MESMO
       * passo que esta verificação.
       *
       * A trava é POSITIVA, não proibitiva: no bloco onde a imagem aparece pela
       * primeira vez tem de existir uma palavra de COMPARAÇÃO. É assim que se fala
       * de uma imagem na vida real — ninguém declara equivalências a conversar.
       */
      const COMPARACOES = ['tipo', 'parece', 'parecem', 'que nem', 'igual', 'como se',
        'imagina', 'e como', 'sao como', 'lembra', 'nem que'];
      const primeiroComFio = blocos.find(temFio);
      if (primeiroComFio) {
        const textoFio = semAcento(primeiroComFio.fala || '');
        if (!COMPARACOES.some((c) => textoFio.includes(semAcento(c)))) {
          erros.push(
            `a imagem "${fio}" entra como DEFINIÇÃO ("X é/são Y") e não como comparação — soa a cartaz, não a alguém a falar, e quem assiste sai. `
            + 'Use "que parece", "é tipo", "é que nem", "é igual a" ou "imagina". '
            + '✗ "três erros de cartão são pedras na mochila" · ✓ "três errinhos no cartão que parecem pedra na mochila".',
          );
        }
      }
    }
  }

  // pergunta segurada: existe, é curta, e o fecho é quem a responde
  const perg = String(n.perguntaAberta || '').trim();
  if (!perg) erros.push('sem "perguntaAberta"');
  else if (perg.length > 26) erros.push(`"perguntaAberta" tem ${perg.length} chars (máximo 26 — é texto de tela)`);
  else if (!/\?$/.test(perg)) erros.push('"perguntaAberta" tem de ser uma pergunta e terminar com "?"');
  else {
    // No 3º teste saiu "TESOURO DIRETO COM 100 VALE?" — o tema espremido até caber,
    // virando frase truncada. A pergunta é a DÚVIDA, não o título do vídeo.
    const palavrasDoTema = String(temaTermo || '')
      .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .split(/\W+/).filter((w) => w.length >= 4);
    const pergNorm = perg.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const repetidas = palavrasDoTema.filter((w) => pergNorm.includes(w));
    if (repetidas.length >= 2) {
      erros.push(`"perguntaAberta" repete o tema ("${repetidas.slice(0, 2).join(' ')}") — ela é a DÚVIDA crua, não o título (ex.: "QUANTO RENDE MESMO?")`);
    }
    // 1ª PESSOA NA PERGUNTA DA TELA. No 4º teste saiu "QUANTO RENDI DE VERDADE?" —
    // "rendi" é passado, 1ª pessoa, e foi parar na TELA com erro de português. A
    // pergunta é a dúvida de QUEM ASSISTE, então nunca está na 1ª pessoa.
    const primeiraPessoa = pergNorm.match(/\b(rendi|ganhei|perdi|investi|guardei|paguei|juntei|gastei|economizei|comprei)\b/);
    if (primeiraPessoa) {
      erros.push(`"perguntaAberta" usa "${primeiraPessoa[0]}" (1ª pessoa do passado) — a pergunta é a dúvida de QUEM ASSISTE. Use a 3ª pessoa: "QUANTO RENDE MESMO?"`);
    }
  }

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
  let corretivo = '';
  const exigencias = [];
  for (let i = 1; i <= tentativas; i++) {
    if (i > 1) await dormir(20000); // mesmo respiro do gerador atual (token bucket)
    const prompt = corretivo ? `${base}\n\n${corretivo}` : base;
    const bruto = await generateText(prompt, { maxTokens: 4000, temperature: 0.7 });
    let n;
    try {
      n = extrairJson(bruto);
    } catch (err) {
      exigencias.push(`- devolva JSON válido (${err.message})`);
      corretivo = `⚠️ A TENTATIVA ANTERIOR FOI REJEITADA. Corrija TUDO isto ao mesmo tempo:\n${[...new Set(exigencias)].join('\n')}`;
      continue;
    }
    // limpeza mecanica ANTES de validar: o que da para consertar por codigo nao
    // pode custar uma tentativa (ver limparFala e o pendulo do 5o teste).
    if (Array.isArray(n.blocos)) {
      for (const b of n.blocos) if (b && typeof b.fala === 'string') b.fala = limparFala(b.fala);
    }
    const v = validarNarrativa(n, proibidas, ficha, t && t.term, permitidas);
    if (v.ok) return { narrativa: n, avisos: v.avisos, palavras: v.palavras, tentativa: i };
    // ver `acumularExigencias`: o tamanho substitui, o resto acumula
    const lista = acumularExigencias(exigencias, v.erros);
    corretivo = `⚠️ A TENTATIVA ANTERIOR FOI REJEITADA. Corrija TUDO isto ao mesmo tempo, reescrevendo a narração inteira:\n${lista.join('\n')}`;
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
  const { narrativa, avisos, palavras, tentativa } = await gerarNarrativa(t, { proibidas, frasesRecentes: frases, ficha });

  console.log(`✅ aprovada na tentativa ${tentativa} — ${palavras} palavras (~${(palavras / PALAVRAS_POR_SEGUNDO).toFixed(0)}s de fala)`);
  console.log(`🧵 fio condutor: ${narrativa.fioCondutor}`);
  console.log(`❓ pergunta segurada: ${narrativa.perguntaAberta}\n`);
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
