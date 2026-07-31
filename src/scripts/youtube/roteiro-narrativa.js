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

function lerTema(slug) {
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
  avalanche: 'avalanche, desabar, soterrar',
  escorregao: 'escorregar, tropeçar, derrapar',
  foguete: 'foguete, decolar, propulsão',
  semente: 'plantar, brotar, raiz, colher',
  'montanha-russa': 'montanha-russa, sobe e desce, looping',
  bolha: 'bolha, inflar, estourar',
  ralo: 'ralo, escoar, vazar, torneira',
};

// ─── o prompt ────────────────────────────────────────────────────────────────
// PODADO de propósito: só entra aqui o que muda o TEXTO. Nada de ícones, sons,
// tempo de tela, tipos de visual, âncoras ou JSON de shots.
export function buildPromptNarrativa(t, proibidas, frasesRecentes, ficha = null) {
  const bloqueadas = proibidas.length ? proibidas.join(', ') : '(nenhuma ainda)';
  const disponiveis = METAPHORS.filter((m) => m !== 'clique-link' && !proibidas.includes(m));
  const menuDeImagens = disponiveis.map((m) => `${m} (${DICAS_DO_FIO[m] || m})`).join(' · ');
  const evitarFrases = frasesRecentes.length
    ? `\nJÁ FOI DITO nos vídeos recentes (não repita nem parafraseie): ${frasesRecentes.map((f) => `"${f}"`).join(' · ')}`
    : '';

  return `Você é ROTEIRISTA de um canal brasileiro de finanças pessoais. Escreve como quem CONVERSA COM UM AMIGO: informal, direto, com gíria leve. Nunca formal, nunca "de livro".

SUA ÚNICA TAREFA AGORA: escrever a NARRAÇÃO falada de um vídeo curto (45 a 55 segundos).
NÃO descreva imagens, ícones, sons, efeitos ou cortes. Só o texto que a voz vai falar. Outra pessoa cuida do visual depois.

TEMA: "${t.term}"${t.angle ? `\nÂNGULO: ${t.angle}` : ''}
${t.definition ? `DEFINIÇÃO: ${t.definition}\n` : ''}${t.body ? `MATERIAL DE APOIO:\n${cortar(t.body)}\n` : ''}${ficha ? `
════════ FICHA DE NÚMEROS — JÁ CALCULADA, NÃO REFAÇA A CONTA ════════
${ficha.texto}

Estes valores foram calculados por computador com as taxas oficiais do Banco Central. São os ÚNICOS números de dinheiro que você pode dizer.
⛔ É PROIBIDO inventar, arredondar para outro valor, ou citar qualquer taxa/rendimento que não esteja aqui em cima. Se precisar de um número que não está na ficha, escreva a frase SEM número.
` : `
⛔ NÚMEROS: só pode citar números que apareçam no MATERIAL DE APOIO acima. Não invente valores, taxas ou rendimentos — este canal não tem como conferir o que você inventar, e um número errado no ar é pior do que nenhum número.
`}
════════ A REGRA MAIOR — CADA FRASE PRECISA DA ANTERIOR ════════
O vídeo é UMA fala contínua, não uma lista de frases bonitas. Cada bloco CONTINUA o anterior e prepara o seguinte.
TESTE OBRIGATÓRIO: leia um bloco sem ler o anterior. Se ele fizer sentido sozinho, está SOLTO — reescreva até depender do anterior.

✗ ERRADO (foi ao ar e ninguém entendeu):
   "Tesouro Direto com 100 reais, vale a pena? Se liga no que eu descobri: 100 reais todo mês, 24 vezes. É como uma pequena avalanche. Qual rendimento?"
   Por quê: "24 vezes" o quê? "avalanche" de quê? a pergunta final cai do céu. São quatro pedaços que não se conhecem.

✓ CERTO (o mesmo assunto, encadeado):
   "Todo mundo acha que cem reais não muda nada. Só que eu fiz a conta de guardar esses cem reais por dois anos seguidos… e o número me assustou. Porque não é o valor que trabalha, é o tempo."
   Por quê: a 2ª frase responde à 1ª, a 3ª explica a 2ª. Ninguém consegue sair no meio.

════════ A ESPINHA (6 blocos, nesta ordem) ════════
1. GANCHO (~6s): a dor ou o número que choca, JÁ dizendo "${t.term}". Termine deixando uma pergunta no ar — e NÃO responda.
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
6. O FECHO (~8s): responda (ou vire do avesso) a pergunta do bloco 1 e termine com uma provocação. Sem "tchau", sem "até a próxima".

════════ O FIO CONDUTOR ════════
Escolha UMA imagem física para o vídeo inteiro e faça-a CRESCER: pequena no bloco 1, forte no 3, paga no 6. É a mesma imagem sempre — nunca troque no meio.
Escolha entre: ${menuDeImagens}.
Escolha a que COMBINA com este tema — a imagem existe para explicar, não para enfeitar. Se ela não explicar nada aqui, é a imagem errada.
⚠️ A imagem tem de ser DITA NA FALA, com as palavras dela (as que estão entre parênteses acima), em pelo menos DOIS blocos. Preencher o campo "fioCondutor" e não falar da imagem em lugar nenhum NÃO conta: o campo fica cheio e o vídeo fica sem fio.
   A forma é sempre esta: no bloco 1 a imagem aparece pequena, no bloco 3 ela está agindo, no bloco 6 ela dá o resultado. As palavras são SUAS — não copie nenhuma frase de exemplo deste texto.
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
- Cada bloco puxa o próximo pelo FIM: a última frase deve deixar o espectador querendo a seguinte.
- Leia em voz alta antes de responder. Se você tropeçar, reescreva.

════════ COMO A VOZ SOA ════════
- Pontuação é RESPIRAÇÃO, não gramática. Vírgula só onde alguém respiraria de verdade.
  ✗ "Dez anos de atraso, custam caro."  ✓ "Dez anos de atraso custam caro."
- Reticências só para suspense de efeito.
- Números por extenso na fala ("cem reais", "trinta por cento") — nunca símbolos.
- Diga a unidade na PRIMEIRA menção: "aos vinte e cinco anos… aos trinta e cinco".
- Diga "vídeo", nunca "Short".
- OBRIGATÓRIO: diga o bordão do canal UMA vez, encaixado numa frase (sem ele o roteiro é rejeitado): "${BORDAO}"
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
  return corrigirNumerais(String(texto || ''))
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
const MIN_PALAVRAS = Math.round(45 * PALAVRAS_POR_SEGUNDO); // 117 ≈ 45s
const MAX_PALAVRAS = Math.round(55 * PALAVRAS_POR_SEGUNDO); // 143 ≈ 55s

/**
 * O FIO CONDUTOR PRECISA SER DITO, não só declarado (31/07/2026).
 * No 1º teste o modelo devolveu `fioCondutor: "semente"` e **não plantou semente
 * nenhuma na narração** — campo preenchido, imagem ausente. O validador aceitou
 * porque só olhava o campo. Estas são as palavras que provam que a imagem existe
 * NA FALA; não precisam ser exatas (basta o radical).
 */
const PALAVRAS_DO_FIO = {
  'bola-neve': ['bola de neve', 'bolinha', 'neve', 'ladeira', 'rolar', 'rola'],
  avalanche: ['avalanche', 'desab', 'soterr', 'montanha'],
  escorregao: ['escorreg', 'tropec', 'tropeç', 'derrap', 'escorrega'],
  foguete: ['foguete', 'decol', 'lançamento', 'propuls'],
  semente: ['semente', 'plant', 'brot', 'germin', 'raiz', 'colher', 'árvore', 'arvore', 'muda'],
  'montanha-russa': ['montanha-russa', 'montanha russa', 'sobe e desce', 'looping', 'carrinho'],
  bolha: ['bolha', 'estour', 'infl', 'ar '],
  ralo: ['ralo', 'escorr', 'escoa', 'vaza', 'ping', 'torneira'],
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

export function validarNarrativa(n, proibidas = [], ficha = null, temaTermo = '') {
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
  if (palavras < MIN_PALAVRAS) erros.push(`narração curta demais: ${palavras} palavras (mínimo ${MIN_PALAVRAS} ≈ 45s)`);
  if (palavras > MAX_PALAVRAS) erros.push(`narração longa demais: ${palavras} palavras (máximo ${MAX_PALAVRAS} ≈ 55s)`);

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
  else {
    const pistas = PALAVRAS_DO_FIO[fio] || [fio];
    const blocosComFio = blocos.filter((b) => {
      const f = String((b && b.fala) || '').toLowerCase();
      return pistas.some((p) => f.includes(p));
    }).length;
    if (blocosComFio === 0) {
      erros.push(`o fio condutor "${fio}" foi declarado mas NÃO APARECE na fala — a imagem tem de ser DITA (ex.: ${pistas.slice(0, 3).join(', ')}…), não só escolhida`);
    } else if (blocosComFio < 2) {
      erros.push(`o fio condutor "${fio}" aparece em 1 bloco só — ele precisa CRESCER: pequeno no início, forte na virada, pago no fecho`);
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

  // ENCADEAMENTO (o motivo deste ficheiro existir): heurística, por isso é AVISO.
  // Um bloco que não retoma NENHUMA palavra de conteúdo do anterior é candidato a
  // "solto". Não vira erro porque sinónimos e pronomes também encadeiam e a
  // heurística não os vê — reprovar por isto queimaria tentativas à toa.
  for (let i = 1; i < blocos.length; i++) {
    const anterior = (blocos[i - 1]?.fala) || '';
    const atual = (blocos[i]?.fala) || '';
    if (!anterior || !atual) continue;
    const compartilhado = longestSharedWordRun(anterior, atual, 1);
    if (!compartilhado.length) {
      avisos.push(`bloco ${i + 1} ("${PAPEIS[i]}") não retoma nenhuma palavra do anterior — verifique se não ficou solto`);
    }
  }

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

export async function gerarNarrativa(t, { tentativas = 4, proibidas = [], frasesRecentes = [], ficha = null } = {}) {
  const base = buildPromptNarrativa(t, proibidas, frasesRecentes, ficha);
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
    const v = validarNarrativa(n, proibidas, ficha, t && t.term);
    if (v.ok) return { narrativa: n, avisos: v.avisos, palavras: v.palavras, tentativa: i };
    exigencias.push(...v.erros.map((e) => `- ${e}`));
    corretivo = `⚠️ A TENTATIVA ANTERIOR FOI REJEITADA. Corrija TUDO isto ao mesmo tempo, reescrevendo a narração inteira:\n${[...new Set(exigencias)].join('\n')}`;
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
  if (proibidas.length) console.log(`🚫 imagens proibidas (${recentes.length} vídeos recentes): ${proibidas.join(', ')}\n`);

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
