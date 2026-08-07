/**
 * MULTIPOST — O SEGUNDO CARTEIRO: o mesmo Short, agora nas OITO redes (IMPL20 §51 · IMPL26 §12).
 *
 * ═══ O DESENHO, EM UMA FRASE ═══
 * O vídeo já foi feito de madrugada e já foi entregue ao YouTube ao meio-dia. Este
 * programa vai buscar o MESMO ficheiro, entrega-o ao Multipost UMA vez e marca a
 * publicação em oito redes, cada uma com o seu texto e a sua hora. Não produz nada,
 * não decide nada, não repete trabalho nenhum.
 *
 * ═══ 07/08/2026 — DE UMA REDE PARA OITO ═══
 * Até aqui só saía no Instagram. Agora saem também TikTok, Facebook, LinkedIn,
 * Threads, Telegram, Pinterest e Bluesky. O ficheiro é o mesmo e é enviado UMA vez;
 * o que muda de rede para rede é o TEXTO, as OPÇÕES e a HORA.
 *
 * 🔴 **NÃO É UMA CHAMADA SÓ, E ISSO NÃO É ESCOLHA NOSSA.** A API põe a `date` FORA da
 * lista de posts — uma data para o pedido inteiro. Numa chamada só, as oito sairiam no
 * MESMO minuto, que é precisamente o que o dono não quer ("parece robô"). Por isso é
 * uma chamada por rede, escalonadas 12 a 17 minutos (ver `REDES`).
 *
 * 🔴 **O INSTAGRAM É O PRINCIPAL E AS OUTRAS SETE SÃO LUCRO.** Se o Instagram falhar, a
 * corrida falha. Se qualquer outra falhar, fica um aviso e o dia continua de pé. É a
 * mesma regra que já valia para a capa e para o Story: o principal nunca paga pelo
 * acessório.
 *
 * 🔴 **O X FICA DE FORA POR ORDEM DO DONO (07/08).** Desde 02/2026 ele cobra US$ 0,20 por
 * publicação COM LINK, e as daqui têm link. Continua ligado no painel — só não recebe
 * nada daqui. Publicar à mão pelo site é grátis. Ver IMPL26 §12-F.
 *
 * ═══ POR QUE UM SEGUNDO CARTEIRO E NÃO UM PASSO A MAIS NO PRIMEIRO ═══
 * Decisão do dono (05/08): se este falhar, o YouTube não pode sentir. Um passo
 * dentro do carteiro do YouTube partilharia a sorte dele — e obrigaria as duas
 * redes à mesma hora. Separados, cada um tem o seu relógio e a sua fila.
 *
 * ═══ O QUE SE DESCOBRIU SOBRE O MULTIPOST (05/08/2026) ═══
 * O "Multipost" é um Postiz auto-hospedado. Entregar é em DOIS passos:
 *   1. POST /api/public/v1/upload  → manda-se o ficheiro e recebe-se {id, path}
 *   2. POST /api/public/v1/posts   → cria-se o agendamento com type=schedule
 * ⚠️ A chave vai no cabeçalho `Authorization` CRUA (sem "Bearer" — isso é só no MCP).
 * ⚠️ Não existe `external_ref`: evitar duplicados é responsabilidade nossa. Por isso
 *    há um caderno (.github/data/instagram-agendados.json) e a fila só é rasgada
 *    DEPOIS de o agendamento existir.
 *
 * ═══ O CADERNO, COM OITO REDES (07/08/2026) ═══
 * O ficheiro continua a chamar-se `instagram-agendados.json` **de propósito**: o nome
 * está escrito no workflow, no `git add` e no histórico, e renomeá-lo era arriscar o
 * robô inteiro para arrumar uma palavra. O que mudou é o que ele guarda por dentro:
 * agora cada slug tem um campo `redes`, com uma entrada POR REDE.
 *
 * 🔑 **E é isso que dá RETOMA.** Se seis redes saírem e uma falhar, correr outra vez
 * tenta **só a que faltou** — não republica as seis. Antes, o caderno era tudo-ou-nada.
 * ⚠️ Um registo ANTIGO (sem o campo `redes`) conta como dia fechado e não se toca: era
 * de quando só havia Instagram, e ir agora publicar as outras sete num vídeo de há uma
 * semana seria despejar conteúdo velho em sete redes de uma vez.
 * ⚠️ Ao apagar, o servidor responde "erro" mesmo quando apagou. Nunca confiar na
 *    resposta de um apagamento — conferir a agenda.
 *
 * ═══ A HORA ═══
 * A API pede a data em UTC. O Brasil não muda a hora desde 2019, por isso são
 * sempre 3 horas à frente: 19h no Brasil = 22h UTC. Já houve um engano deste tipo
 * neste projeto ("sábado 02:00 UTC" era sexta 23h no Brasil), e é por isso que a
 * conta está numa função à parte, com prova.
 *
 * Segredos (env): MULTIPOST_API_KEY. Opcional: MULTIPOST_URL.
 *
 * Uso:
 *   node src/scripts/multipost/entregar.js --slug=juros-compostos
 *   node src/scripts/multipost/entregar.js --slug=juros-compostos --dry-run
 *   node src/scripts/multipost/entregar.js --slug=X --hora=20
 *   node src/scripts/multipost/entregar.js --inspecionar   ← só lê: o que o servidor aceita e guardou
 */

import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

// ─── caminhos ────────────────────────────────────────────────────────────────
import { caminhoDaCapa } from '../youtube/capa-short.js';
import { BORDAO } from '../youtube/lib/schema-short.js';

const ROOT = process.cwd();
const MP4_DIR = join(ROOT, 'youtube-render', 'out');
const SCRIPT_DIR = join(ROOT, 'src', 'scripts', 'youtube', 'output');
const CADERNO = join(ROOT, '.github', 'data', 'instagram-agendados.json');

const BASE = (process.env.MULTIPOST_URL || 'https://multipost.help4desk.com').replace(/\/+$/, '');
const API = `${BASE}/api/public/v1`;

/** O Brasil está 3 horas atrás de Londres, o ano inteiro (não há horário de verão desde 2019). */
const BRASIL_UTC_OFFSET = 3;
/** A hora de publicar no Instagram, no relógio do Brasil. */
const HORA_BR_PADRAO = 19;
/** O Instagram corta a legenda aos 2200 caracteres. */
const MAX_LEGENDA = 2200;
/**
 * O endereço do app. É o MESMO que vai na descrição do YouTube e no primeiro
 * comentário (`lib/primeiro-comentario.js`) — se mudar aqui, tem de mudar lá.
 */
const APP_URL = 'https://finmoovi.com';

const args = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => {
    const [k, ...v] = a.slice(2).split('=');
    return [k, v.join('=') || true];
  }),
);
const DRY_RUN = Boolean(args['dry-run']);
const log = (...m) => console.log(...m);

// ═══════════════════════════════════════════════════════════════════════════════
// A HORA — a parte que já enganou este projeto uma vez
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * A próxima vez que forem `horaBR` horas no Brasil, em UTC.
 * Se essa hora já passou hoje, marca para amanhã — nunca para o passado, que a API
 * aceitaria em silêncio e publicaria de imediato.
 */
export function proximaHoraBrasilEmUTC(horaBR = HORA_BR_PADRAO, agora = new Date()) {
  const alvo = new Date(Date.UTC(
    agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate(),
    horaBR + BRASIL_UTC_OFFSET, 0, 0, 0,
  ));
  if (alvo.getTime() <= agora.getTime()) alvo.setUTCDate(alvo.getUTCDate() + 1);
  return alvo;
}

/** Como se lê a mesma hora no relógio do Brasil — só para o humano conferir no log. */
export function emHoraDoBrasil(dataUTC) {
  const d = new Date(dataUTC.getTime() - BRASIL_UTC_OFFSET * 3600 * 1000);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)} às ${p(d.getUTCHours())}h${p(d.getUTCMinutes())}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// A LEGENDA — parecida com a do YouTube, mas NÃO igual
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * ⚠️ OS ASTERISCOS TÊM DE SAIR. No roteiro eles marcam o que o vídeo destaca no
 * ecrã; numa legenda de Instagram apareceriam como lixo no meio da frase. (No
 * Short, um asterisco chegou a ser LIDO em voz alta — é um defeito com história.)
 */
function limpar(texto) {
  return String(texto || '').replace(/\*/g, '').replace(/\s+/g, ' ').trim();
}

// ═══════════════════════════════════════════════════════════════════════════════
// OS NÚMEROS VOLTAM A SER ALGARISMOS (07/08/2026)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 🔴 O DEFEITO, E ELE JÁ ESTAVA NO AR.
 *
 * As legendas destas redes copiam frases da NARRAÇÃO — e a narração é escrita para ser
 * **falada em voz alta**, onde os números TÊM de ir por extenso (há um conversor inteiro
 * na produção só para isso: `numerosPorExtenso`, em `roteiro-narrativa.js`, porque a voz
 * lia "R$ 500" como "erre cifrão quinhentos").
 *
 * Só que numa legenda ESCRITA isso sai assim:
 *   ✗ *"O primeiro leva cento e cinquenta reais, o outro duzentos"*
 *   ✓ *"O primeiro leva R$ 150, o outro 200"*
 *
 * ⚠️ **Isto saiu no Instagram durante dias** e ninguém tinha reparado — apareceu ao pôr o
 * mesmo texto no LinkedIn, que é onde texto malcuidado dói mais. É o mesmo texto a servir
 * dois ouvidos diferentes: a voz e o olho.
 *
 * ═══ A REGRA, E É CONSERVADORA DE PROPÓSITO ═══
 * Só se converte quando **não há dúvida**:
 *   1. o número é seguido de "reais"/"real" → `R$ 150`
 *   2. o número é seguido de "por cento"    → `15%`
 *   3. o número vale **100 ou mais**         → `200`
 *
 * 🔴 **Tudo abaixo de 100 e sem unidade fica como está**, e há três razões medidas:
 *   · *"um erro"* nunca pode virar *"1 erro"* — "um" é artigo muito mais vezes do que é número;
 *   · *"as duas coisas"* pela mesma razão;
 *   · numa ENUMERAÇÃO (*"em um, cinco e dez anos"*) converter só parte dela deixaria
 *     *"um, cinco e 10 anos"*, que é pior do que não mexer. Com o piso em 100, nenhuma
 *     delas é tocada.
 * Um número que fica por extenso não estraga nada — *"dez anos"* lê-se bem. Um número
 * convertido errado, sim.
 */
const VALOR_DA_PALAVRA = {
  um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9,
  dez: 10, onze: 11, doze: 12, treze: 13, catorze: 14, quatorze: 14, quinze: 15,
  dezesseis: 16, dezessete: 17, dezoito: 18, dezenove: 19,
  vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60, setenta: 70, oitenta: 80, noventa: 90,
  cem: 100, cento: 100,
  duzentos: 200, duzentas: 200, trezentos: 300, trezentas: 300, quatrocentos: 400, quatrocentas: 400,
  quinhentos: 500, quinhentas: 500, seiscentos: 600, seiscentas: 600, setecentos: 700, setecentas: 700,
  oitocentos: 800, oitocentas: 800, novecentos: 900, novecentas: 900,
};
const MULTIPLICADOR = { mil: 1000, milhao: 1e6, milhoes: 1e6, bilhao: 1e9, bilhoes: 1e9 };

const semAcentoMin = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * ⚠️ O acento vive no PADRÃO, não numa limpeza antes: "três" e "milhões" aparecem
 * acentuados no texto verdadeiro, e tirar os acentos para procurar obrigaria a repô-los
 * depois — ou seja, a reescrever o texto todo para mexer num número.
 */
const COM_ACENTO = ['tr[eê]s', 'milh[ãa]o', 'milh[õo]es', 'bilh[ãa]o', 'bilh[õo]es'];
const SEM_ACENTO = [...Object.keys(VALOR_DA_PALAVRA), ...Object.keys(MULTIPLICADOR)]
  .filter((p) => !/^(tres|milhao|milhoes|bilhao|bilhoes)$/.test(p));

/**
 * 🔴 **AS PALAVRAS MAIS COMPRIDAS TÊM DE VIR PRIMEIRO, E O `\b` NO FIM É OBRIGATÓRIO.**
 *
 * Apanhado pela prova de mesa, e teria ido para a legenda: *"dois mil seiscentos e noventa
 * e nove reais"* saía **"2.006centos e noventa e R$ 9"**. Duas causas somadas:
 *   1. numa alternativa, o regex fica com a PRIMEIRA que serve — e "seis" está antes de
 *      "seiscentos". Ele lia "seis" e deixava "centos" pendurado;
 *   2. sem `\b` no fim, "seis" casa mesmo dentro de "seiscentos".
 * A família é grande: **nove**centos, **sete**centos, **oito**centos, **quatro**centos,
 * **seis**centos, **dez**essete… Cada uma destas voltaria a morder sozinha.
 */
const UM_NUMERO = `(?:${[...COM_ACENTO, ...SEM_ACENTO].sort((a, b) => b.length - a.length).join('|')})\\b`;
// ⚠️ UM espaço só entre as palavras (nunca `\s`): o texto já passou por `limpar()`, que
// junta os espaços — e é isso que garante que o tamanho do trecho casa com o original.
const CORRIDA_DE_NUMEROS = new RegExp(`\\b${UM_NUMERO}(?: (?:e )?${UM_NUMERO})*`, 'gi');

/**
 * Lê o numeral do princípio da lista e diz **quantas palavras usou**.
 *
 * 🔑 A REGRA QUE SEPARA UM NÚMERO DE UMA LISTA: um numeral composto **desce sempre**
 * ("dois MIL, SEIScentos e NOVENTA e NOVE"); uma enumeração sobe ("um, cinco e dez").
 * Sem isto, "um, cinco e dez anos" virava o número 16 — foi exatamente esse o defeito que
 * matou o Short de 07/08, do outro lado do pipeline.
 */
export function lerNumeral(palavras) {
  let total = 0;
  let acc = 0;
  let ultima = Infinity;
  let usadas = 0;
  let leu = false;

  for (let i = 0; i < palavras.length; i++) {
    const p = semAcentoMin(palavras[i]);

    if (p === 'e') {
      // O "e" só pertence ao número se o que vem a seguir também pertencer.
      const prox = semAcentoMin(palavras[i + 1] || '');
      if (!leu || !(prox in VALOR_DA_PALAVRA || prox in MULTIPLICADOR)) break;
      continue;
    }
    if (p in MULTIPLICADOR) {
      total += (acc || 1) * MULTIPLICADOR[p];
      acc = 0;
      ultima = Infinity;
      leu = true;
      usadas = i + 1;
      continue;
    }
    if (p in VALOR_DA_PALAVRA) {
      const v = VALOR_DA_PALAVRA[p];
      if (v >= ultima) break;   // não desceu → começou outro número, é lista
      acc += v;
      ultima = v;
      leu = true;
      usadas = i + 1;
      continue;
    }
    break;
  }
  return leu ? { valor: total + acc, usadas } : null;
}

/** 1500 → "1.500". O ponto de milhar é o do Brasil. */
const comPontos = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/** O piso: abaixo disto, só converte se houver "reais" ou "por cento" a seguir. */
export const PISO_SEM_UNIDADE = 100;

export function numerosEmAlgarismo(texto) {
  const s = String(texto || '');
  let saida = '';
  let cursor = 0;

  for (const achado of s.matchAll(CORRIDA_DE_NUMEROS)) {
    if (achado.index < cursor) continue;             // já consumido por uma corrida anterior
    const palavras = achado[0].split(' ');
    const lido = lerNumeral(palavras);
    if (!lido) continue;

    const trecho = palavras.slice(0, lido.usadas).join(' ');
    const fim = achado.index + trecho.length;
    const depois = s.slice(fim);

    const dinheiro = depois.match(/^ (reais|real)\b/i);
    const percentagem = depois.match(/^ por cento\b/i);
    if (!dinheiro && !percentagem && lido.valor < PISO_SEM_UNIDADE) continue;

    let novo;
    let comidos = trecho.length;
    if (dinheiro) { novo = `R$ ${comPontos(lido.valor)}`; comidos += dinheiro[0].length; }
    else if (percentagem) { novo = `${comPontos(lido.valor)}%`; comidos += percentagem[0].length; }
    else novo = comPontos(lido.valor);

    saida += s.slice(cursor, achado.index) + novo;
    cursor = achado.index + comidos;
  }
  return saida + s.slice(cursor);
}

/**
 * O texto como ele vai ser LIDO com os olhos: sem asteriscos, sem espaços a mais, e com
 * os números em algarismo. É por aqui que passa tudo o que vem da narração.
 */
export const paraLer = (texto) => numerosEmAlgarismo(limpar(texto));

/**
 * ⚠️ OS ACENTOS FICAM. O Instagram aceita-os e é com eles que se procura em
 * português — "#inflação" tem público, "#inflacao" tem quase ninguém. Tirá-los
 * também deixaria a etiqueta do tema desalinhada das fixas (#FinançasPessoais).
 */
function hashtagDe(palavra) {
  const limpa = String(palavra || '')
    .replace(/[^\p{L}\p{N} ]/gu, ' ')
    .trim().split(/\s+/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join('');
  return limpa ? `#${limpa}` : '';
}

/**
 * ⚠️ A PALAVRA-CHAVE NEM SEMPRE É UMA PALAVRA. Olhando os 15 roteiros já feitos,
 * ela tanto é "inflação" como é a FRASE INTEIRA do título — *"Se eu devesse R$ 30
 * mil, faria ISSO"*. Transformar isso numa etiqueta daria
 * `#SeEuDevesseR30MilFariaIsso`: um monstro que ninguém procura e que grita
 * "isto foi feito por uma máquina". (É o mesmo defeito que já mordeu as hashtags
 * do YouTube, quando as três chegavam coladas e viravam uma só.)
 *
 * Regra: **no máximo duas palavras**, e nunca uma palavra vaga. Uma etiqueta a
 * menos não custa nada; uma etiqueta ridícula custa a credibilidade do perfil.
 */
const MAX_PALAVRAS_NA_ETIQUETA = 2;
const PALAVRAS_VAGAS = new Set(['bolso', 'dinheiro', 'grana', 'vida', 'futuro', 'conta', 'app', 'coisas']);

export function etiquetaDaPalavraChave(keyword) {
  const cru = limpar(keyword);
  const palavras = cru.split(/\s+/).filter(Boolean);
  if (!palavras.length || palavras.length > MAX_PALAVRAS_NA_ETIQUETA) return '';
  if (PALAVRAS_VAGAS.has(cru.toLowerCase())) return '';
  return hashtagDe(cru);
}

/**
 * A etiqueta do ASSUNTO, tirada da categoria do roteiro.
 * Existe para o post nunca ficar só com as etiquetas genéricas quando a
 * palavra-chave é recusada pela regra acima — foi o caso do "Eduque seu bolso".
 */
const ETIQUETA_DA_CATEGORIA = {
  basico: '#FinançasDoZero',
  controle: '#ControleFinanceiro',
  credito: '#Crédito',
  investimento: '#Investimentos',
  mercado: '#MercadoFinanceiro',
  mindset: '#MentalidadeFinanceira',
};

/**
 * A legenda do Instagram.
 * ⚠️ NÃO leva "link na descrição" — no Instagram essa frase não quer dizer nada, e
 * era essa a diferença que obrigava a uma legenda própria em vez de reaproveitar a
 * do YouTube. O convite é o MESMO ("comenta FINMOOVI"), porque é ele que a
 * automação do Multipost está à espera de ouvir.
 */
/**
 * ⚠️ NO INSTAGRAM NÃO HÁ NEGRITO — e os asteriscos aparecem à letra.
 * O YouTube aceita *palavra* como negrito; o Instagram mostra os asteriscos como
 * caracteres. Por isso a legenda daqui usa **emojis e espaço em branco** para dar
 * hierarquia, e nunca marcação. É a mesma informação, noutra língua tipográfica.
 */
/**
 * ⚠️ OS TÓPICOS SAEM DO GUIÃO, NÃO DE UM MOLDE.
 *
 * A primeira versão montava-os a partir da palavra-chave — e num vídeo cuja
 * palavra-chave era "bolso" saiu isto: *"O que é bolso e por que mexe no seu bolso"*.
 * Um molde aplicado a uma palavra vaga produz uma frase vazia, e uma frase vazia numa
 * legenda diz à pessoa que ninguém leu aquilo antes de publicar.
 *
 * Agora saem das cenas de conteúdo (as `beat`), que é onde o vídeo explica alguma
 * coisa. Só entram frases com corpo: as curtas demais são restos ("E cada um pesa.")
 * e as compridas demais são parágrafos disfarçados.
 */
const MIN_TOPICO = 38;
const MAX_TOPICO = 95;

/** Compara duas frases ignorando pontuação, acentos e maiúsculas. */
const mesmaFrase = (a, b) => {
  const n = (t) => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]/g, '');
  return n(a) === n(b);
};

export function topicosDoRoteiro(roteiro) {
  const frases = [];
  for (const cena of roteiro.scenes || []) {
    if (cena.role && cena.role !== 'beat') continue;
    for (const frase of limpar(cena.narration).split(/(?<=[.!?])\s+/)) {
      const f = frase.trim();
      if (f.length < MIN_TOPICO || f.length > MAX_TOPICO) continue;
      // ⚠️ O BORDÃO DO CANAL NÃO É UM TÓPICO. Ele é dito uma vez em todos os vídeos,
      // por regra do roteirista — e apareceu como "tópico" em dois vídeos diferentes.
      // Uma legenda que promete ensinar e entrega o slogan da casa é publicidade
      // disfarçada de índice.
      if (mesmaFrase(f, BORDAO)) continue;
      frases.push(f);
    }
  }
  /**
   * ⚠️ OS NÚMEROS SÓ VIRAM ALGARISMO **DEPOIS** DO FILTRO DE TAMANHO, e é de propósito.
   * A janela 38-95 foi calibrada sobre o texto FALADO; converter antes encurtaria as
   * frases (*"cento e cinquenta reais"* tem 22 letras, *"R$ 150"* tem 6) e passaria a
   * deixar entrar frases que hoje são recusadas — uma mudança que ninguém pediu, escondida
   * dentro de um conserto de números.
   */
  const unicas = [...new Set(frases)].map(numerosEmAlgarismo);
  if (unicas.length >= 2) return unicas.slice(0, 3);

  // Rede de segurança: um guião sem frases aproveitáveis não deixa o bloco vazio.
  // ⚠️ E nunca a palavra-chave sozinha: "Alavancagem" não é um tópico, é uma etiqueta.
  const kw = limpar(roteiro.keyword || roteiro.term || 'finanças');
  const titulo = limpar(roteiro.term);
  return [
    titulo && !mesmaFrase(titulo, kw) ? titulo : `Como ${kw} funciona na prática`,
    'A conta que quase ninguém faz — e devia fazer',
    'Como fazer essa conta no seu caso, de graça',
  ].map((t) => t.slice(0, MAX_TOPICO));
}

/**
 * As etiquetas do vídeo. Vive à parte desde 07/08 porque as OITO redes as usam — e
 * escritas à mão em oito sítios, um dia divergiam.
 */
export function etiquetasDo(roteiro) {
  return [...new Set([
    etiquetaDaPalavraChave(roteiro.keyword),
    ETIQUETA_DA_CATEGORIA[roteiro.category] || '',
    '#FinançasPessoais',
    '#EducaçãoFinanceira',
    '#DinheiroNaPrática',
    '#FinMoovi',
  ].filter(Boolean))];
}

export function montarLegenda(roteiro) {
  const titulo = limpar(roteiro.term || roteiro.keyword || '');
  // ⚠️ O gancho vem da NARRAÇÃO, logo traz os números por extenso. Ver `numerosEmAlgarismo`.
  const gancho = paraLer(roteiro.intro?.frase || '');
  const topicos = topicosDoRoteiro(roteiro);
  const tagsUnicas = etiquetasDo(roteiro);

  const linhas = [
    titulo,
    '',
    gancho,
    '',
    '📌 O que você vai ver aqui:',
    ...topicos.map((t) => `• ${t}`),
    '',
    '💡 A verdade é que a maior parte das pessoas perde dinheiro sem perceber — não por falta de esforço, mas por falta de conta feita.',
    '',
    '👉 Comenta FINMOOVI aqui embaixo que eu te mando o app de graça. É de verdade, eu respondo.',
    '',
    '🔗 Ou entra direto: finmoovi.com',
    '',
    '💬 Ficou dúvida? Escreve aqui nos comentários.',
    '',
    tagsUnicas.join(' '),
  ].filter((l, i, arr) => !(l === '' && arr[i - 1] === ''));

  const texto = linhas.join('\n');
  return texto.length > MAX_LEGENDA ? `${texto.slice(0, MAX_LEGENDA - 1)}…` : texto;
}

/**
 * A legenda em HTML, para o Multipost.
 *
 * ⚠️ **UM `<p>` POR LINHA, E NUNCA `<br>`.** A primeira entrega usou `<br>` — que é o
 * que a documentação deles lista como aceite — e o resultado, visto no editor, foi
 * **um parágrafo só, com tudo colado**: título, gancho, chamada e hashtags numa
 * papa. Foi o dono que viu: *"veja que no Instagram está muito mal formatado"*.
 * Um `<p>` é um bloco; um `<br>` é uma sugestão que o editor deitou fora.
 */
export function legendaEmHtml(legenda) {
  return String(legenda)
    .split('\n')
    .map((l) => (l.trim() === '' ? '<p></p>' : `<p>${l}</p>`))
    .join('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// AS OUTRAS SETE REDES — cada uma com o seu texto (07/08/2026)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 🔴 A CHAMADA MUDA DE REDE PARA REDE, E ISSO NÃO É ENFEITE.
 *
 * O "comenta FINMOOVI" só existe onde há um robô a responder: **Instagram** (a automação
 * do Multipost manda mensagem privada) e **YouTube** (`src/scripts/youtube/comentarios.js`
 * responde no próprio comentário, de hora a hora). Nas outras SETE ninguém responde —
 * pedir lá seria uma promessa que ninguém cumpre. Ver IMPL26 §12-A.
 *
 * ⚠️ E o LINK só é clicável em cinco delas. No **Instagram** e no **TikTok** o endereço
 * escrito na legenda é texto morto: aparece, mas não se toca nele. Por isso nessas duas a
 * frase manda PROCURAR o nome, que é verdade em qualquer sítio.
 */
const CHAMADA_COM_LINK = `👉 O FinMoovi é grátis e abre direto no navegador: ${APP_URL}`;
const CHAMADA_SEM_LINK = '👉 Quer fazer essa conta com os SEUS números? Procura FinMoovi — é de graça e abre no navegador.';

/**
 * Corta sem partir palavra ao meio. Devolve o texto tal e qual se já couber.
 *
 * ⚠️ A primeira versão comia SEMPRE a última palavra, mesmo quando o corte calhava
 * exatamente no fim de uma. Apanhado pela prova de mesa: "uma frase de teste aqui" com
 * 12 devolvia "uma frase" em vez de "uma frase de" — três caracteres deitados fora de
 * graça, e num Bluesky de 300 isso conta.
 */
export function cortarNaPalavra(texto, max) {
  const t = String(texto || '').trim();
  if (t.length <= max) return t;
  const corte = t.slice(0, max);
  if (/\s/.test(t[max])) return corte.trimEnd();   // o corte calhou no fim de uma palavra
  const espaco = corte.lastIndexOf(' ');
  return (espaco > max * 0.5 ? corte.slice(0, espaco) : corte).trim();
}

/**
 * ENCAIXA O TEXTO NO LIMITE DAQUELA REDE — e a ordem por que se sacrifica é a que
 * importa.
 *
 * 🔴 **O LINK NUNCA CAI.** No Bluesky cabem 300 caracteres e no Pinterest 500: um corte
 * cego pelo fim comeria exatamente o endereço, que é a única coisa que aquele post tem
 * para dar. Por isso os blocos dizem se são dispensáveis, e caem primeiro os que são.
 * Só depois, e em último caso, se encurta o texto livre (o gancho).
 *
 * ⚠️ Porque isto existe: o servidor **corta em silêncio** o que passa do limite dele —
 * não devolve erro. Um post do Bluesky sem link ficaria publicado e ninguém saberia.
 */
export function encaixarNoLimite(blocos, limite) {
  const lista = (blocos || []).filter((b) => b && String(b.texto || '').trim());
  const junta = (l) => l.map((b) => String(b.texto).trim()).join('\n\n');

  for (let i = lista.length - 1; i >= 0 && junta(lista).length > limite; i--) {
    if (!lista[i].essencial) lista.splice(i, 1);
  }
  if (junta(lista).length <= limite) return junta(lista);

  // Só sobraram os essenciais e ainda não cabe: encurta o PRIMEIRO, que é o texto livre.
  const [primeiro, ...resto] = lista;
  const espacoDoResto = resto.length ? junta(resto).length + 2 : 0;
  const espaco = limite - espacoDoResto - 1;
  if (espaco < 20) return `${cortarNaPalavra(junta(lista), limite - 1)}…`;
  return junta([{ texto: `${cortarNaPalavra(primeiro.texto, espaco)}…` }, ...resto]);
}

const tituloEGancho = (roteiro) => ({
  // O título já é escrito para o OLHO (é ele que vai no YouTube) e por isso já traz os
  // algarismos; o gancho vem da narração, que é escrita para o OUVIDO.
  titulo: limpar(roteiro.term || roteiro.keyword || ''),
  gancho: paraLer(roteiro.intro?.frase || ''),
});

/** TikTok — sem link clicável, e as etiquetas contam muito. */
export function legendaTikTok(roteiro, limite) {
  const { titulo, gancho } = tituloEGancho(roteiro);
  return encaixarNoLimite([
    { texto: gancho || titulo, essencial: true },
    { texto: CHAMADA_SEM_LINK, essencial: true },
    { texto: etiquetasDo(roteiro).join(' ') },
  ], limite);
}

/**
 * Facebook e LinkedIn — os dois de texto mais formal, e os dois com link clicável.
 * ⚠️ Sem "comenta FINMOOVI": o Facebook até PERMITE responder a comentário pela Meta,
 * mas o Multipost não oferece essa automação (só a do Instagram). Ver IMPL26 §12-A.
 */
export function legendaFormal(roteiro, limite) {
  const { titulo, gancho } = tituloEGancho(roteiro);
  const topicos = topicosDoRoteiro(roteiro);
  return encaixarNoLimite([
    { texto: titulo, essencial: true },
    { texto: gancho },
    { texto: ['O que você vai ver neste vídeo:', ...topicos.map((t) => `• ${t}`)].join('\n') },
    { texto: CHAMADA_COM_LINK, essencial: true },
    { texto: etiquetasDo(roteiro).join(' ') },
  ], limite);
}

/**
 * Telegram — é o único canal que vira audiência PRÓPRIA (o público é uma lista, não um
 * algoritmo), e o link é clicável. Por isso leva o vídeo, os tópicos e o endereço.
 */
export function legendaTelegram(roteiro, limite) {
  const { titulo, gancho } = tituloEGancho(roteiro);
  const topicos = topicosDoRoteiro(roteiro);
  return encaixarNoLimite([
    { texto: titulo, essencial: true },
    { texto: gancho },
    { texto: topicos.map((t) => `• ${t}`).join('\n') },
    { texto: CHAMADA_COM_LINK, essencial: true },
  ], limite);
}

/** Threads — 500 caracteres. Curto por obrigação, não por escolha. */
export function legendaThreads(roteiro, limite) {
  const { titulo, gancho } = tituloEGancho(roteiro);
  return encaixarNoLimite([
    { texto: gancho || titulo, essencial: true },
    { texto: `O FinMoovi faz essa conta de graça: ${APP_URL}`, essencial: true },
  ], limite);
}

/** Pinterest — 500 na descrição; o título e o link vão nas OPÇÕES, não aqui. */
export function legendaPinterest(roteiro, limite) {
  const { titulo, gancho } = tituloEGancho(roteiro);
  return encaixarNoLimite([
    { texto: gancho || titulo, essencial: true },
    { texto: `O FinMoovi é grátis e abre no navegador: ${APP_URL}`, essencial: true },
    { texto: etiquetasDo(roteiro).slice(0, 3).join(' ') },
  ], limite);
}

/**
 * Bluesky — 300 caracteres e SEM VÍDEO (defeito do programa, diagnóstico FECHADO em
 * 07/08: IMPL26 §10-B). Vai a capa, o gancho e o link, que aqui é clicável.
 */
export function legendaBluesky(roteiro, limite) {
  const { titulo, gancho } = tituloEGancho(roteiro);
  return encaixarNoLimite([
    { texto: gancho || titulo, essencial: true },
    { texto: APP_URL, essencial: true },
  ], limite);
}

/**
 * ⚠️ O TÍTULO DO TIKTOK E DO PINTEREST É UM CAMPO À PARTE, com limite próprio, e o
 * servidor **corta em silêncio** o que passa.
 */
export const MAX_TITULO_TIKTOK = 90;
export const MAX_TITULO_PINTEREST = 95;

/**
 * ═══ A TABELA DAS OITO REDES ═══
 *
 * A ORDEM É O RELÓGIO. O Instagram é o zero (as 19h do Brasil) e as outras saem a
 * seguir, com intervalos DESIGUAIS — 12, 14, 17, 15, 16, 17, 16 minutos. Desiguais de
 * propósito: oito posts de quinze em quinze minutos certinhos é a assinatura de um robô.
 * A última sai às 20h47, ainda dentro do horário nobre do Brasil.
 *
 * `midia` diz o que vai anexado, e cada valor tem uma razão medida em 07/08:
 *   · 'video'      — o normal
 *   · 'video+capa' — só o Pinterest, e **o VÍDEO TEM DE IR PRIMEIRO**. Com a capa em 1º
 *                    ficou preso na fila; com o vídeo em 1º publicou. A ordem é a regra.
 *   · 'capa'       — só o Bluesky, que não publica vídeo (defeito do programa, fechado).
 *
 * 🔴 O `limite` aqui é só a REDE DE SEGURANÇA: o número verdadeiro é perguntado ao
 * servidor a cada corrida (`maxLength` em `/integration-settings/{id}`). Se ele mudar de
 * versão e apertar um limite, o robô segue o dele — não o que está escrito aqui.
 */
/**
 * 🔴 O TIKTOK, PRONTO E À ESPERA — mas FORA da tabela por ordem do dono (ver `REDE_DE_FORA`).
 *
 * Ele vive aqui, e não apagado, de propósito: assim as provas de mesa continuam a medir as
 * opções dele (os oito campos obrigatórios, o privado, a marca desligada) e nada se
 * estraga em silêncio enquanto a auditoria não sai. **Religar é acrescentá-lo a `REDES`**,
 * no lugar dele — o minuto 12, entre o Instagram e o Facebook.
 */
export const REDE_TIKTOK = { id: 'tiktok', nome: 'TikTok', minutos: 12, limite: 2000, midia: 'video', legenda: legendaTikTok };

export const REDES = [
  { id: 'instagram', nome: 'Instagram', minutos: 0, limite: 2200, midia: 'video', legenda: montarLegenda },
  // ⬅️ o lugar do TikTok (minuto 12) fica VAGO. Ver `REDE_TIKTOK` e `REDE_DE_FORA`.
  { id: 'facebook', nome: 'Facebook', minutos: 26, limite: 63206, midia: 'video', legenda: legendaFormal },
  { id: 'linkedin-page', nome: 'LinkedIn', minutos: 43, limite: 3000, midia: 'video', legenda: legendaFormal },
  { id: 'threads', nome: 'Threads', minutos: 58, limite: 500, midia: 'video', legenda: legendaThreads },
  { id: 'telegram', nome: 'Telegram', minutos: 74, limite: 4096, midia: 'video', legenda: legendaTelegram },
  { id: 'pinterest', nome: 'Pinterest', minutos: 91, limite: 500, midia: 'video+capa', legenda: legendaPinterest },
  { id: 'bluesky', nome: 'Bluesky', minutos: 107, limite: 300, midia: 'capa', legenda: legendaBluesky },
];

/**
 * 🔴 QUEM NÃO RECEBE NADA DAQUI, E PORQUÊ.
 *
 * Os dois continuam LIGADOS no Multipost — não foram desconectados. Só não recebem nada
 * deste robô.
 *
 * ═══ X ═══
 * Desde 02/2026 cobra **US$ 0,015 por publicação e US$ 0,20 se ela tiver LINK**, e as
 * daqui têm link: ~US$ 6/mês só para o dono. Decisão dele em 07/08.
 * 🔑 Publicar à mão pelo site continua GRÁTIS — o que se paga é a API. Ver IMPL26 §12-F.
 *
 * ═══ TIKTOK — 🔴 ORDEM DIRETA DO DONO EM 07/08 ═══
 * *"não quero enviar nada até eles nos dar autorização para postar"* — **nem em privado.**
 *
 * ⚠️ Isto REVOGA a decisão anterior (§12-C), que era publicar no máximo 1 por dia em
 * `SELF_ONLY` para manter o canal vivo. Ele é o dono da conta e do risco; a ordem nova
 * manda. Está escrito aqui para ninguém "consertar" isto mais tarde a olhar para o §12-C.
 *
 * ⚠️ **O que fica pronto e à espera:** as opções do TikTok (`opcoesDaRede`), o texto
 * (`legendaTikTok`) e as provas de mesa continuam todos aqui, com os oito campos
 * obrigatórios já certos e conferidos contra o servidor. **Voltar a ligar é UMA linha**:
 * repor a rede em `REDES`, no minuto 12, e tirar esta entrada.
 * ⚠️ E antes de repor: reler o §12-C, porque o argumento dele continua de pé — o TikTok dá
 * o empurrão do algoritmo **no momento da publicação**, e vídeo que nasce privado perde
 * esse momento e não o recupera.
 */
export const REDE_DE_FORA = {
  x: 'cobra US$ 0,20 por post com link (decisão do dono, 07/08)',
  tiktok: 'ordem do dono, 07/08: nada é enviado — nem em privado — enquanto a auditoria não sair',
};

/**
 * 🔴 UM VÍDEO ANTIGO NÃO PODE ESTREAR NAS SETE REDES NOVAS.
 *
 * ═══ O CASO REAL QUE OBRIGOU A ESCREVER ISTO (07/08) ═══
 * No dia em que a distribuição passou de uma rede para oito, havia **dois vídeos já
 * produzidos e à espera na fila** — e os dois FALAM *"comenta FINMOOVI aqui embaixo que
 * eu te mando o aplicativo"*. Mandá-los para TikTok, Facebook, LinkedIn, Threads,
 * Telegram, Pinterest e Bluesky seria recriar, no primeiro dia, exatamente a promessa
 * quebrada que este trabalho todo veio consertar: lá ninguém responde.
 *
 * ✅ **O que esta trava faz:** um vídeo cuja fala ainda pede comentário sai **só no
 * Instagram** (onde a automação existe e cumpre). As outras sete ficam de fora, e o
 * registo diz porquê — nunca em silêncio.
 *
 * ⚠️ **Ela desliga-se sozinha.** A partir do primeiro vídeo escrito com a fala nova
 * ("procura FinMoovi"), isto deixa de disparar e as oito recebem. Não é preciso lembrar-se
 * de a tirar — e é por isso que ela pode ficar para sempre, sem custo.
 */
export function falaPedeComentario(roteiro) {
  const cena = (roteiro?.scenes || []).find((s) => s && s.role === 'cta');
  return /\bcoment\p{L}*/iu.test(`${cena?.narration || ''} ${roteiro?.cta?.text || ''}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// O caderno — o que já foi agendado, para nunca agendar duas vezes
// ═══════════════════════════════════════════════════════════════════════════════

function lerCaderno() {
  if (!existsSync(CADERNO)) return {};
  try {
    const d = JSON.parse(readFileSync(CADERNO, 'utf-8'));
    return d && typeof d === 'object' ? d : {};
  } catch {
    throw new Error(`O caderno ${CADERNO} existe mas não se lê. Conferir à mão — tratá-lo como vazio agendaria tudo outra vez.`);
  }
}

function gravarCaderno(d) {
  mkdirSync(dirname(CADERNO), { recursive: true });
  writeFileSync(CADERNO, `${JSON.stringify(d, null, 2)}\n`, 'utf-8');
}

/**
 * O QUE JÁ SAIU DESTE VÍDEO, E O QUE AINDA FALTA.
 *
 * 🔑 É isto que dá RETOMA. Antes o caderno era tudo-ou-nada: bastava existir uma entrada
 * para o robô recusar o slug para sempre. Com oito redes isso seria mau — bastava o
 * Bluesky falhar para as outras sete ficarem impossíveis de repetir, ou (pior) para
 * tudo ser republicado numa tentativa de arranjar uma.
 *
 * ⚠️ **UM REGISTO ANTIGO (sem `redes`) É DIA FECHADO.** Ele é de quando só havia
 * Instagram. Tratá-lo como "faltam sete" mandaria um vídeo de há uma semana para sete
 * redes de uma vez, no mesmo minuto — exatamente o que a tabela de horários evita.
 */
export function oQueFalta(registoDoSlug, redes = REDES) {
  const ids = redes.map((r) => r.id);
  if (!registoDoSlug) return { antigo: false, feitas: [], faltam: ids };
  if (!registoDoSlug.redes) return { antigo: true, feitas: [], faltam: [] };
  return {
    antigo: false,
    feitas: ids.filter((id) => registoDoSlug.redes[id]),
    faltam: ids.filter((id) => !registoDoSlug.redes[id]),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Conversa com o Multipost
// ═══════════════════════════════════════════════════════════════════════════════

function chave() {
  const k = (process.env.MULTIPOST_API_KEY || '').trim();
  if (!k) throw new Error('Falta o secret MULTIPOST_API_KEY.');
  return k;
}

/**
 * O canal do Instagram, perguntado ao servidor em vez de escrito à mão.
 *
 * ⚠️ **A BOMBA-RELÓGIO EXPLODIU NO MESMO DIA.** Escrevi aqui, em 05/08, que um
 * identificador copiado para dentro do código rebentaria no dia em que o dono
 * reconectasse a conta. Nessa mesma noite ele reconectou — e o identificador mudou
 * mesmo (`cmrvycxcg…` passou a `cmsh1wws…`). Este robô não sentiu nada, porque
 * pergunta. **A automação das mensagens privadas, essa, ficou órfã** e teve de ser
 * recriada à mão: uma automação pertence a um canal e não se pode mudar de canal
 * (a API responde 412).
 *
 * 📌 **REGRA, PARA A PRÓXIMA VEZ:** sempre que o Instagram for reconectado no
 * Multipost, é preciso **recriar a automação** — apagar e criar de novo, porque
 * editar não a move. E criar exige `replyMessage` no SINGULAR: com o plural, o
 * servidor cria só o gatilho e a automação fica muda, sem se queixar.
 */
async function listarCanais(k) {
  const res = await fetch(`${API}/integrations`, { headers: { Authorization: k } });
  if (!res.ok) throw new Error(`Não consegui listar os canais (${res.status}): ${(await res.text()).slice(0, 200)}`);
  const canais = await res.json();
  return Array.isArray(canais) ? canais.filter((c) => c && !c.disabled) : [];
}

/** O canal de uma rede, ou `null` se ela não estiver ligada (isso é aviso, não falha). */
export function canalDaRede(canais, rede, registar = () => {}) {
  const meus = (canais || []).filter((c) => c.identifier === rede.id);
  if (!meus.length) return null;
  if (meus.length > 1) registar(`⚠️ há ${meus.length} contas de ${rede.nome} ligadas — a usar a primeira: ${meus[0].name}`);
  return meus[0];
}

async function canalDoInstagram(k) {
  const canais = await listarCanais(k);
  const insta = canalDaRede(canais, { id: 'instagram', nome: 'Instagram' }, log);
  if (!insta) {
    throw new Error('Não há nenhum canal de Instagram ligado e ativo no Multipost. Ligue-o no painel antes de correr isto.');
  }
  return insta;
}

/**
 * O LIMITE DE TEXTO DAQUELA REDE, PERGUNTADO AO SERVIDOR.
 *
 * ⚠️ **Porque não basta o número escrito na tabela:** o servidor **corta em silêncio** o
 * que passa do limite dele — não devolve erro nenhum. Um Bluesky sem o link ficaria
 * publicado e ninguém saberia. E o limite muda com a versão do Multipost.
 * Se a pergunta falhar, vale a rede de segurança da tabela: uma indisponibilidade a ler
 * um número não pode impedir a publicação do dia.
 */
async function limiteDaRede(k, canalId, rede) {
  try {
    const res = await fetch(`${API}/integration-settings/${encodeURIComponent(canalId)}`, { headers: { Authorization: k } });
    if (!res.ok) return rede.limite;
    const j = await res.json();
    const n = Number(j?.output?.maxLength);
    return Number.isFinite(n) && n > 0 ? n : rede.limite;
  } catch {
    return rede.limite;
  }
}

/**
 * O QUADRO DO PINTEREST — perguntado, nunca escrito no código.
 *
 * O `board` é obrigatório e o número dele muda se a conta for reconectada. É a mesma
 * bomba-relógio do identificador do canal, que já rebentou uma vez neste projeto (05/08,
 * na mesma noite em que ficou escrito que rebentaria). Em 07/08 havia um quadro só:
 * "Finanças Pessoais". Se um dia houver mais, usa-se o primeiro e diz-se no registo.
 */
async function quadroDoPinterest(k, canalId) {
  const res = await fetch(`${API}/integration-trigger/${encodeURIComponent(canalId)}`, {
    method: 'POST',
    headers: { Authorization: k, 'Content-Type': 'application/json' },
    body: JSON.stringify({ methodName: 'boards', data: {} }),
  });
  if (!res.ok) throw new Error(`não deu para perguntar os quadros do Pinterest (${res.status})`);
  const quadros = (await res.json())?.output || [];
  if (!quadros.length) throw new Error('a conta do Pinterest não tem nenhum quadro — crie um no painel deles');
  if (quadros.length > 1) log(`   ⚠️ há ${quadros.length} quadros no Pinterest — a usar o primeiro: "${quadros[0].name}"`);
  return quadros[0];
}

async function enviarFicheiro(k, caminho, nome, tipo = 'video/mp4') {
  const bytes = readFileSync(caminho);
  const fd = new FormData();
  fd.append('file', new Blob([bytes], { type: tipo }), nome);
  const res = await fetch(`${API}/upload`, { method: 'POST', headers: { Authorization: k }, body: fd });
  const texto = await res.text();
  if (!res.ok) throw new Error(`O envio do vídeo falhou (${res.status}): ${texto.slice(0, 300)}`);
  const media = JSON.parse(texto);
  if (!media?.id || !media?.path) throw new Error(`O servidor aceitou o ficheiro mas não devolveu id/path: ${texto.slice(0, 200)}`);
  return media;
}

/**
 * 🔴 06/08/2026 — A CAPA DO REEL: DUAS CONCLUSÕES ERRADAS ANTES DA VERDADEIRA.
 *
 * O dono viu que o "Editor" da capa, no painel, aparecia **vazio**, e perguntou se ela
 * estava mesmo a ser enviada. As duas primeiras respostas foram erradas:
 *
 *   ❌ *"o campo `cover` não existe"* — tirado do código-fonte público do Postiz, onde
 *      de facto não existe. **Mas este servidor não é essa versão.** Perguntando-lhe
 *      diretamente (`--inspecionar`), ele responde que aceita
 *      `cover: { id, path, alt?, thumbnail? }`, com `id` e `path` **obrigatórios**.
 *   ❌ *"então a capa vai junto do vídeo, no `thumbnail` da média"* — também não. Isso
 *      é a miniatura da MÉDIA; a capa do Reel é a de cima.
 *
 * ✅ **A CAUSA VERDADEIRA NÃO ESTAVA NO CAMPO. A CAPA NUNCA CHEGOU A SER ENVIADA.**
 * O registo da entrega de 06/08 di-lo à letra: *"não veio capa no artefato"*. O vídeo
 * desse dia foi produzido a **05/08 às 09h15**, e a capa só passou a ser tirada na
 * produção às **21h45 desse mesmo dia** — doze horas depois. **Não havia ficheiro.**
 * A partir do primeiro vídeo produzido depois disso, a capa viaja no artefato.
 *
 * ⚠️ **A LIÇÃO, e é a mais cara do dia:** eu li o código-fonte PÚBLICO e concluí sobre
 * o servidor DO DONO. São versões diferentes. **A um servidor pergunta-se; não se lê o
 * código de outro parecido.** E o dono insistiu duas vezes contra a minha conclusão —
 * tinha razão as duas.
 *
 * ⚠️ O `path` tem de ser um endereço completo (o servidor valida-o). Na dúvida vai-se
 * **sem capa**: nada de imagem pode derrubar a publicação do dia.
 */
export function capaParaOInstagram(capa, registar = () => {}) {
  if (!capa) return null;
  if (!capa.id || !/^https?:\/\//i.test(String(capa.path || ''))) {
    registar(`⚠️ a capa veio incompleta (id="${capa.id}", endereço="${capa.path}") — segue sem capa, para não derrubar a publicação.`);
    return null;
  }
  return { id: capa.id, path: capa.path };
}

/**
 * O pedido inteiro, montado à parte para poder ser CONFERIDO sem rede nenhuma
 * (`src/scripts/validacao/validar-multipost.js`). Antes vivia dentro do envio, e por
 * isso a única forma de o ver era publicar.
 */
/**
 * O ENVELOPE — a parte do pedido que é igual em todas as redes.
 *
 * ⚠️ **A `date` fica AQUI FORA, e é isso que obriga a uma chamada por rede.** Ela vale
 * para o pedido inteiro, não por post: pôr as oito na mesma chamada fá-las-ia sair todas
 * no mesmo minuto. Está medido no contrato do servidor (`/api/docs-json`).
 *
 * `midias` é uma LISTA porque o Pinterest precisa de duas — e **na ordem certa**.
 */
export function montarPedido({ canalId, midias, legenda, quandoUTC, settings }) {
  return {
    type: 'schedule',
    date: quandoUTC.toISOString(),
    shortLink: false,
    tags: [],
    posts: [{
      integration: { id: canalId },
      value: [{
        content: legendaEmHtml(legenda),
        image: (midias || []).filter(Boolean).map((m) => ({ id: m.id, path: m.path })),
      }],
      settings,
    }],
  };
}

/**
 * ♦ 06/08/2026 — O REEL DE TESTE, POR ORDEM DO DONO.
 *
 * O Instagram mostra o Reel **primeiro só a quem NÃO segue o perfil**; se os números
 * forem bons, ele "gradua" e passa também aos seguidores. Para um canal a começar, quem
 * interessa alcançar é exatamente quem ainda não segue.
 *
 * ⚠️ **A graduação é AUTOMÁTICA (`SS_PERFORMANCE`) e não é detalhe.** Na outra opção
 * (`MANUAL`) é preciso alguém carregar num botão para o vídeo chegar aos seguidores — e
 * uma regra que depende de alguém se lembrar não é uma regra. Ficaria um Reel por semana
 * preso, sem ninguém dar por nada.
 *
 * ⚠️ E o Instagram **não deixa ter convidados (`collaborators`) num Reel de teste**. Hoje
 * não usamos convidados; no dia em que houver uma parceria, é preciso escolher.
 */
export function corpoDoAgendamento({ canalId, media, capa, legenda, quandoUTC }, registar = () => {}) {
  const cover = capaParaOInstagram(capa, registar);
  return montarPedido({
    canalId,
    midias: [media],
    legenda,
    quandoUTC,
    settings: {
      __type: 'instagram',
      post_type: 'post',
      is_trial_reel: true,
      graduation_strategy: 'SS_PERFORMANCE',
      // ⚠️ A capa só entra quando existe E está inteira — ver `capaParaOInstagram`.
      ...(cover ? { cover } : {}),
    },
  });
}

/**
 * ♦ 06/08/2026 — O MESMO VÍDEO TAMBÉM NO STORY, MINUTOS DEPOIS DO REEL.
 *
 * Pedido do dono: *"todo Reel publicado, depois de alguns segundos, é enviado também
 * no Story"*.
 *
 * 🔴 **NÃO É O "REPOSTAR" DA APLICAÇÃO, E ISSO NÃO SE PODE CONSERTAR.** A referência
 * oficial da Meta não tem parâmetro nenhum para republicar um Reel existente como
 * Story: o autocolante do Reel, aquele em que se toca para ir ver, **só existe dentro
 * da aplicação do telemóvel**. O que vai é o **mesmo vídeo**, publicado como Story —
 * o conteúdo chega, o atalho de volta não.
 *
 * ⚠️ **O STORY TEM TETO DE 60 SEGUNDOS** (regra da Meta: entre 3 e 60). Os nossos
 * Shorts andam nos 41–65 segundos — **medido, um dos que estão no ar tem 1:05**. Um
 * vídeo mais comprido faz o Instagram recusar o Story. Por isso, quando ele não cabe,
 * **vai a CAPA em pé** em vez do vídeo: um Story que mostra o gancho é melhor do que
 * um Story que não sai. Nada é saltado em silêncio, e o registo diz sempre qual foi.
 *
 * ⚠️ **O vídeo NÃO é enviado outra vez** — reaproveita-se a média já entregue para o
 * Reel. Um segundo envio de 25 MB por dia, para nada.
 */
export function corpoDoStory({ canalId, media, legenda, quandoUTC }) {
  return montarPedido({
    canalId,
    midias: [media],
    legenda,
    quandoUTC,
    // ⚠️ Um Story não leva Reel de teste nem capa — são coisas do Reel. E convidados
    // o Instagram também não aceita em Stories.
    settings: { __type: 'instagram', post_type: 'story' },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// AS OPÇÕES DE CADA UMA DAS OUTRAS SETE (07/08/2026)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * As opções que cada rede recebe. **Todas foram perguntadas ao servidor** com
 * `--inspecionar` em 07/08 — nenhuma foi deduzida do código-fonte público do Postiz,
 * que é outra versão. Essa lição custou duas respostas erradas em 06/08.
 *
 * O que o servidor respondeu que EXIGE:
 *   · TikTok    — privacy_level, duet, stitch, comment, autoAddMusic, brand_content_toggle,
 *                 brand_organic_toggle, content_posting_method (oito campos obrigatórios)
 *   · Pinterest — board (e aceita title, link, dominant_color)
 *   · Instagram — post_type
 *   · os outros — nada obrigatório
 */
export function opcoesDaRede(rede, { titulo, quadroDoPinterest } = {}) {
  switch (rede.id) {
    case 'tiktok':
      /**
       * 🔴 `SELF_ONLY` ENQUANTO A AUDITORIA NÃO SAIR, e não é excesso de zelo: enquanto o
       * app não for aprovado, o TikTok RECUSA a publicação que não seja privada — e ainda
       * exige que **a própria conta** esteja privada no momento em que ela sai. Foi essa a
       * segunda parede de 07/08 (IMPL26 §3).
       *
       * ⚠️ `brand_content_toggle` TEM de ficar desligado: ligado + privado = recusa. Medido.
       * ⚠️ `video_made_with_ai: true` porque a VOZ é sintetizada e o roteiro é escrito por
       *    IA. Declarar é o lado seguro — ainda mais com o app em auditoria — e enquanto os
       *    vídeos nascem privados não custa alcance nenhum.
       * ⚠️ `content_posting_method: DIRECT_POST` — em "UPLOAD" fica um rascunho à espera de
       *    alguém pegar no telemóvel, que para um robô é o mesmo que não publicar.
       */
      return {
        __type: 'tiktok',
        title: cortarNaPalavra(titulo || '', MAX_TITULO_TIKTOK),
        privacy_level: 'SELF_ONLY',
        duet: false,
        stitch: false,
        comment: true,
        autoAddMusic: 'no',
        brand_content_toggle: false,
        brand_organic_toggle: false,
        video_made_with_ai: true,
        content_posting_method: 'DIRECT_POST',
      };
    case 'pinterest':
      /**
       * ⚠️ O `board` é OBRIGATÓRIO e o número dele **muda se a conta for reconectada** —
       * a mesma bomba-relógio do identificador do canal, que já rebentou uma vez. Por isso
       * ele é PERGUNTADO ao servidor a cada corrida (ver `quadroDoPinterest`), nunca escrito
       * aqui.
       */
      return {
        __type: 'pinterest',
        board: quadroDoPinterest,
        title: cortarNaPalavra(titulo || '', MAX_TITULO_PINTEREST),
        link: APP_URL,
      };
    case 'facebook':
      return { __type: 'facebook', post_type: 'post' };
    default:
      // LinkedIn, Threads, Telegram e Bluesky não exigem nada. O `__type` continua a ir,
      // porque é por ele que o servidor sabe a que provedor aquelas opções pertencem.
      return { __type: rede.id };
  }
}

/**
 * O que vai anexado, na ORDEM que cada rede exige. Devolve também o motivo quando não dá
 * para publicar — um robô que salta uma rede tem de dizer sempre porquê.
 *
 * 🔴 **PINTEREST: O VÍDEO PRIMEIRO, A CAPA DEPOIS.** O aviso deles diz que um vídeo exige
 * uma segunda mídia de capa; o que eles NÃO dizem é que a ordem conta. Medido em 07/08:
 * com a capa em 1º ficou preso na fila para sempre; com o vídeo em 1º, publicou.
 *
 * 🔴 **BLUESKY NÃO LEVA VÍDEO.** Não é falta de tentativa: quatro provas em 07/08 mostram
 * que o download funciona, a rede funciona e a conta funciona — o defeito está no código
 * do Multipost (`bluesky.provider.ts:97`). Diagnóstico FECHADO, não repetir. Vai a capa.
 */
export function midiasDaRede(rede, { media, capa }) {
  if (rede.midia === 'video+capa') {
    if (!capa) return { midias: null, motivo: 'o Pinterest exige uma capa junto do vídeo, e hoje não veio capa no artefato' };
    return { midias: [media, capa], motivo: 'vídeo primeiro, capa depois — a ordem que o Pinterest exige' };
  }
  if (rede.midia === 'capa') {
    if (!capa) return { midias: [], motivo: 'sem capa; vai só o texto com o link, que é o que o Bluesky aceita' };
    return { midias: [capa], motivo: 'vai a capa, porque o Bluesky não publica vídeo (defeito do programa, IMPL26 §10-B)' };
  }
  return { midias: [media], motivo: 'o vídeo' };
}

/**
 * A DURAÇÃO DE UM MP4, LIDA DO PRÓPRIO FICHEIRO — sem ffprobe e sem dependência nova.
 *
 * ⚠️ **Porquê à mão e não com o ffprobe:** este robô corre num computador emprestado do
 * GitHub que **não traz o ffmpeg**, e instalá-lo custa um minuto por corrida para ler um
 * número. O número vive num cabeçalho do próprio ficheiro (`mvhd`), que se lê em vinte
 * linhas. A conta é conferida contra o ffprobe na prova de mesa.
 *
 * Devolve os segundos, ou `null` se não conseguir ler — e nesse caso quem chama decide
 * pelo lado seguro.
 */
export function duracaoDoMp4(caminho, ler = readFileSync) {
  try {
    const b = ler(caminho);
    const i = b.indexOf('mvhd', 0, 'latin1');
    if (i < 0) return null;
    const versao = b.readUInt8(i + 4);
    if (versao === 1) {
      const escala = b.readUInt32BE(i + 8 + 16);
      const total = Number(b.readBigUInt64BE(i + 8 + 20));
      return escala ? total / escala : null;
    }
    const escala = b.readUInt32BE(i + 8 + 8);
    const total = b.readUInt32BE(i + 8 + 12);
    return escala ? total / escala : null;
  } catch {
    return null;
  }
}

/** O que a Meta aceita num Story: entre 3 e 60 segundos. */
export const STORY_MAX_SEG = 60;
/** Quantos minutos depois do Reel é que o Story sai. */
export const MINUTOS_ATE_O_STORY = 5;

/**
 * A primeira linha com texto da legenda — é o gancho, e é o que serve de legenda ao
 * Story. ⚠️ Cinco minutos, e não "alguns segundos" como o dono pediu: o Multipost
 * trabalha ao minuto, e o Reel tem de estar mesmo publicado antes de o Story sair.
 */
export function primeiraLinha(legenda) {
  return String(legenda).split('\n').map((l) => l.trim()).find(Boolean) || '';
}

/**
 * O que vai no Story: o vídeo se couber, senão a capa. Devolve também o motivo, porque
 * um robô que escolhe sozinho tem de dizer sempre o que escolheu.
 */
export function oQueVaiNoStory({ duracaoSeg, media, capa }) {
  if (duracaoSeg !== null && duracaoSeg <= STORY_MAX_SEG) {
    return { media, tipo: 'vídeo', motivo: `o vídeo tem ${duracaoSeg.toFixed(1)}s e cabe nos ${STORY_MAX_SEG}s do Story` };
  }
  if (capa) {
    const porque = duracaoSeg === null
      ? 'não deu para medir a duração do vídeo'
      : `o vídeo tem ${duracaoSeg.toFixed(1)}s e o Story só aceita ${STORY_MAX_SEG}s`;
    return { media: capa, tipo: 'capa', motivo: porque };
  }
  return { media: null, tipo: null, motivo: 'o vídeo não cabe no Story e não há capa para pôr no lugar dele' };
}

async function agendar(k, pedido) {
  return enviarAgendamento(k, corpoDoAgendamento(pedido, log));
}

async function enviarAgendamento(k, corpo) {
  const res = await fetch(`${API}/posts`, {
    method: 'POST',
    headers: { Authorization: k, 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  });
  const texto = await res.text();
  if (!res.ok) {
    if (res.status === 403) throw new Error(`O Multipost recusou: limite de publicações do plano atingido (403). ${texto.slice(0, 200)}`);
    throw new Error(`O agendamento falhou (${res.status}): ${texto.slice(0, 300)}`);
  }
  const criado = JSON.parse(texto);
  const postId = Array.isArray(criado) ? criado[0]?.postId : criado?.postId;
  if (!postId) throw new Error(`O servidor respondeu 2xx mas sem identificar o post: ${texto.slice(0, 200)}`);
  return postId;
}

/**
 * ⚠️ A CONFERÊNCIA NÃO É OPCIONAL. Já se viu este servidor responder "erro" a um
 * apagamento que tinha funcionado — ou seja, a resposta dele não é prova de nada.
 * A prova é a agenda: se o post lá está, está agendado.
 */
async function confirmarNaAgenda(k, postId, quandoUTC) {
  const inicio = new Date(quandoUTC.getTime() - 36 * 3600 * 1000).toISOString();
  const fim = new Date(quandoUTC.getTime() + 36 * 3600 * 1000).toISOString();
  const res = await fetch(`${API}/posts?startDate=${inicio}&endDate=${fim}`, { headers: { Authorization: k } });
  if (!res.ok) return false;
  const d = await res.json();
  return (d?.posts || []).some((p) => p.id === postId);
}

/**
 * 🔎 O INSPETOR — pergunta ao Multipost o que ele aceita, em vez de adivinharmos.
 *
 * ═══ POR QUE ISTO EXISTE ═══
 * A capa do Reel foi mandada durante duas semanas num campo que não existe, e **nada se
 * queixou**: o servidor deita fora em silêncio o que não conhece. Descobriu-se a olhar
 * para o painel, não para o código — e só porque o dono reparou que o "Editor" da capa
 * estava vazio.
 *
 * Este servidor sabe responder exatamente **que opções aceita para cada canal**. Uma
 * pergunta, sem escrever nada, e acaba a adivinhação. Correr sempre que se quiser usar
 * uma opção nova do Instagram — e depois de qualquer atualização do Multipost, porque a
 * lista muda com a versão dele.
 *
 * Uso: node src/scripts/multipost/entregar.js --inspecionar
 */
async function inspecionar() {
  const k = chave();
  const canais = await listarCanais(k);
  log(`\n🔌 ${canais.length} canais ligados e ativos:\n`);
  for (const c of canais) {
    const naTabela = REDES.find((r) => r.id === c.identifier);
    const nota = naTabela ? `recebe o vídeo às ${naTabela.minutos} min do Reel` : (REDE_DE_FORA[c.identifier] ? `NÃO recebe: ${REDE_DE_FORA[c.identifier]}` : 'NÃO está na tabela — não recebe nada');
    log(`  · ${String(c.identifier).padEnd(14)} "${c.name}"  ${nota}`);
  }

  /**
   * ⚠️ PERGUNTA-SE A TODAS, e não só ao Instagram. Foi a olhar para uma rede só que se
   * passou duas semanas a mandar a capa num campo que não existia — este servidor deita
   * fora em SILÊNCIO o que não conhece.
   */
  /**
   * ⚠️ O TIKTOK É INSPECIONADO NA MESMA, mesmo estando fora da entrega. Ele vai voltar
   * quando a auditoria sair, e um campo que o servidor deixe de aceitar entretanto tem de
   * aparecer AQUI — não no dia em que se religa.
   */
  for (const rede of [...REDES, REDE_TIKTOK]) {
    const canal = canalDaRede(canais, rede);
    const espera = !REDES.includes(rede) ? '   ⏸️ (à espera: não recebe nada hoje)' : '';
    log(`\n${'─'.repeat(72)}`);
    if (!canal) { log(`📡 ${rede.nome}: ⚠️ NÃO ESTÁ LIGADO — este vídeo não sairia lá.`); continue; }
    log(`📡 ${rede.nome}  (${canal.identifier})  id=${canal.id}${espera}`);
    const r = await fetch(`${API}/integration-settings/${encodeURIComponent(canal.id)}`, { headers: { Authorization: k } });
    const t = await r.text();
    if (!r.ok) { log(`   ⚠️ não deu para perguntar (${r.status}): ${t.slice(0, 200)}`); continue; }
    try {
      const j = JSON.parse(t);
      const o = j?.output || {};
      const servidor = Number(o.maxLength);
      log(`   limite de texto: ${servidor || '?'} (a nossa rede de segurança diz ${rede.limite})`);
      if (Number.isFinite(servidor) && servidor !== rede.limite) {
        log(`   🔴 O SERVIDOR MUDOU DE IDEIAS. Ele manda; a tabela em REDES está desatualizada.`);
      }
      if (o.rules) log(`   regras dele: ${String(o.rules).slice(0, 300)}`);
      const props = o.settings?.properties || {};
      const obrig = o.settings?.required || [];
      const campos = Object.keys(props).map((n) => (obrig.includes(n) ? `${n}*` : n));
      log(`   opções que aceita: ${campos.join(', ') || '(nenhuma)'}${obrig.length ? `   (* = obrigatória)` : ''}`);
      // O que NÓS mandamos, ao lado — para se ver de relance um campo inventado.
      const nossas = rede.id === 'instagram'
        ? ['__type', 'post_type', 'is_trial_reel', 'graduation_strategy', 'cover']
        : Object.keys(opcoesDaRede(rede, { titulo: 'x', quadroDoPinterest: 'x' }));
      const inventadas = nossas.filter((n) => n !== '__type' && !Object.prototype.hasOwnProperty.call(props, n));
      log(`   o que nós mandamos: ${nossas.join(', ')}`);
      if (inventadas.length) log(`   🔴 ELE NÃO CONHECE: ${inventadas.join(', ')} — vai ser deitado fora EM SILÊNCIO.`);
      const emFalta = obrig.filter((n) => !nossas.includes(n));
      if (emFalta.length) log(`   🔴 FALTA MANDAR (obrigatórias): ${emFalta.join(', ')}`);
      if (o.tools?.length) log(`   ferramentas: ${o.tools.map((x) => x.methodName).join(', ')}`);
    } catch { log(`   ${t.slice(0, 600)}`); }
  }
  log(`\n${'─'.repeat(72)}`);

  /**
   * ⚠️ E o que ele GUARDOU do que já lhe mandámos — que é a única prova de que um campo
   * sobreviveu. Um campo que ele aceita mas não guarda é igual a um campo que não existe.
   */
  log('\n── O QUE ELE GUARDOU DAS ÚLTIMAS PUBLICAÇÕES ──');
  const agora = Date.now();
  const p = await fetch(
    `${API}/posts?startDate=${new Date(agora - 30 * 864e5).toISOString()}&endDate=${new Date(agora + 30 * 864e5).toISOString()}`,
    { headers: { Authorization: k } },
  );
  if (!p.ok) { log(`⚠️ não deu para listar (${p.status})`); return 0; }
  const lista = (await p.json())?.posts || [];
  log(`${lista.length} publicação(ões) na janela de 60 dias.`);
  /**
   * ⚠️ MEDIDO EM 06/08: esta lista devolve o TEXTO da publicação e mais nada — **não
   * traz as opções nem a média**. Portanto ela **não serve para confirmar** se a capa
   * ficou guardada; para isso, olhar o painel. Fica escrito para ninguém concluir
   * "não tem capa" só porque ela não aparece aqui — foi esse tipo de salto que custou
   * as duas conclusões erradas de hoje.
   */
  for (const post of lista.slice(0, 5)) {
    log(`\n  • ${post.id}  ${post.publishDate || post.date || ''}  estado=${post.state || '?'}`);
    for (const campo of ['settings', 'image', 'media', 'content']) {
      if (post[campo] === undefined) continue;
      const v = typeof post[campo] === 'string' ? post[campo] : JSON.stringify(post[campo]);
      log(`    ${campo}: ${String(v).slice(0, 600)}`);
    }
    const cru = JSON.stringify(post);
    if (/thumbnail|cover/i.test(cru)) log('    🖼️  ESTA guardou capa — procurar "thumbnail"/"cover" acima.');
  }
  log('');
  return 0;
}

// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  if (args.inspecionar) return inspecionar();

  const slug = String(args.slug || '');
  if (!slug) throw new Error('Falta --slug.');
  const horaBR = Number(args.hora) > 0 ? Number(args.hora) : HORA_BR_PADRAO;

  const mp4 = join(MP4_DIR, `${slug}.mp4`);
  const roteiroPath = join(SCRIPT_DIR, `${slug}.script.json`);
  if (!existsSync(mp4)) throw new Error(`Não encontrei o vídeo: ${mp4}`);
  if (!existsSync(roteiroPath)) throw new Error(`Não encontrei o roteiro: ${roteiroPath}`);

  const roteiro = JSON.parse(readFileSync(roteiroPath, 'utf-8'));
  const legenda = montarLegenda(roteiro);
  const quando = proximaHoraBrasilEmUTC(horaBR);
  const tamanhoMB = (statSync(mp4).size / 1048576).toFixed(1);

  /**
   * 🔴 A TRAVA DO VÍDEO ANTIGO — ver `falaPedeComentario`. Um vídeo cuja fala ainda pede
   * comentário só pode sair onde há robô a responder. Fica ANTES do caderno de propósito:
   * é ela que decide quantas redes este vídeo tem, e portanto o que conta como "já saiu
   * em todas".
   */
  const soInstagram = falaPedeComentario(roteiro);
  const aEntregar = soInstagram ? REDES.filter((r) => r.id === 'instagram') : REDES;
  if (soInstagram) {
    log('\n🔴 A FALA DESTE VÍDEO AINDA PEDE COMENTÁRIO — foi escrito antes de 07/08.');
    log('   Sai SÓ no Instagram, que é onde a automação responde. As outras sete ficam de fora:');
    log('   mandá-lo para lá seria prometer uma resposta que ninguém dá.');
    log('   (a partir do primeiro vídeo com a fala nova, isto deixa de acontecer sozinho)');
  }

  const caderno = lerCaderno();
  const registo = caderno[slug];
  const estado = oQueFalta(registo, aEntregar);

  // ⚠️ SE O POST FOI APAGADO À MÃO, O CADERNO PASSA A MENTIR — e este robô recusa
  // para sempre um vídeo que já não está agendado em lado nenhum. Aconteceu em
  // 05/08, quando o primeiro agendamento foi apagado para corrigir a legenda.
  // A cura é uma linha: apagar a entrada em .github/data/instagram-agendados.json.
  const PISTA = '   (se algum post foi apagado no painel, tire essa rede — ou o slug inteiro — de .github/data/instagram-agendados.json)';
  if (!DRY_RUN && estado.antigo) {
    log(`⏭️  "${slug}" tem um registo ANTIGO, de ${registo.agendadoEm} — de quando só havia Instagram. Nada a fazer.`);
    log('   (ir publicar agora as outras sete seria despejar um vídeo velho em sete redes de uma vez)');
    log(PISTA);
    return 0;
  }
  if (!DRY_RUN && registo && !estado.faltam.length) {
    log(`⏭️  "${slug}" já foi agendado nas ${estado.feitas.length} redes em ${registo.agendadoEm}. Nada a fazer.`);
    log(PISTA);
    return 0;
  }
  if (!DRY_RUN && registo) {
    log(`🔁 RETOMA: ${estado.feitas.length} rede(s) já saíram (${estado.feitas.join(', ')}). Faltam: ${estado.faltam.join(', ')}`);
  }

  log(`\n📤 Multipost — a entregar "${slug}" em ${aEntregar.length} rede(s)${DRY_RUN ? ' (ENSAIO: não envia nada)' : ''}`);
  log(`🎞️  ficheiro: ${tamanhoMB} MB`);
  log(`🕖 âncora: ${emHoraDoBrasil(quando)} no Brasil  =  ${quando.toISOString()} em UTC`);

  const capaLocal = caminhoDaCapa(slug);
  const temCapa = existsSync(capaLocal);
  const titulo = limpar(roteiro.term || roteiro.keyword || '');

  if (DRY_RUN) {
    // A capa aparece no ensaio de propósito: a sua ausência tem de ser visível ANTES
    // da entrega, e não descoberta depois no perfil.
    log(`🖼️  capa: ${temCapa ? `${Math.round(statSync(capaLocal).size / 1024)} KB` : 'FALTA — o Instagram escolheria um fotograma ao calhas, e o Pinterest nem sairia'}`);
    /**
     * ⚠️ O ENSAIO MOSTRA O PEDIDO, NÃO O DISCO. A capa foi entregue duas semanas num
     * campo que não existe e o ensaio dizia sempre "capa: 139 KB" — verdade, e inútil:
     * ele media o ficheiro no disco, não o que ia dentro do pedido.
     * (Os endereços são de exemplo: os verdadeiros só existem depois do envio.)
     */
    const media = { id: '(id do vídeo)', path: 'https://exemplo/video.mp4' };
    const capa = temCapa ? { id: '(id da capa)', path: 'https://exemplo/capa.jpg' } : null;

    for (const rede of aEntregar) {
      const hora = new Date(quando.getTime() + rede.minutos * 60000);
      const texto = rede.legenda(roteiro, rede.limite);
      const { midias, motivo } = midiasDaRede(rede, { media, capa });
      log(`\n${'─'.repeat(72)}`);
      log(`📡 ${rede.nome}  ·  ${emHoraDoBrasil(hora)} BR  ·  limite ${rede.limite} (a rede de segurança; o real pergunta-se ao servidor)`);
      if (!midias) { log(`   ⏭️  NÃO SAI — ${motivo}`); continue; }
      log(`   mídia: ${motivo}${midias.length ? ` → ${midias.length} anexo(s)` : ' → nenhum anexo'}`);
      const opcoes = rede.id === 'instagram'
        ? corpoDoAgendamento({ canalId: '(canal)', media, capa, legenda: texto, quandoUTC: hora }, log).posts[0].settings
        : opcoesDaRede(rede, { titulo, quadroDoPinterest: '(o quadro, perguntado ao servidor)' });
      log(`   opções: ${JSON.stringify(opcoes)}`);
      log(`   texto (${texto.length} de ${rede.limite}):`);
      for (const l of texto.split('\n')) log(`     ${l}`);
    }

    const escolha = oQueVaiNoStory({ duracaoSeg: duracaoDoMp4(mp4), media, capa });
    log(`\n${'─'.repeat(72)}`);
    log(`📖 Story do Instagram, ${MINUTOS_ATE_O_STORY} min depois do Reel (${emHoraDoBrasil(new Date(quando.getTime() + MINUTOS_ATE_O_STORY * 60000))}):`);
    log(`   ${escolha.media ? `vai a ${escolha.tipo}` : 'NÃO SAI'} — ${escolha.motivo}`);
    if (escolha.media) log(`   legenda do Story: "${primeiraLinha(montarLegenda(roteiro))}"`);
    log(`\n🚫 fora de propósito: ${Object.entries(REDE_DE_FORA).map(([r, p]) => `${r} (${p})`).join(' · ')}`);
    log('\n✅ Ensaio concluído. Nada foi enviado nem agendado.\n');
    return 0;
  }

  const k = chave();
  const canais = await listarCanais(k);
  log(`🔌 ${canais.length} canais ligados no Multipost`);

  /**
   * ⚠️ O FICHEIRO SOBE UMA VEZ SÓ, e as oito redes usam o mesmo. Um envio de 23 MB por
   * rede seriam 184 MB por dia para nada.
   * 🔑 E NUMA RETOMA REAPROVEITA-SE o que já subiu hoje — é para isso que o caderno
   * guarda o `id` além do endereço.
   */
  let media = registo?.midias?.video || null;
  let capa = registo?.midias?.capa || null;
  if (media) log(`♻️  a reaproveitar o vídeo já enviado nesta corrida: ${media.path}`);
  else {
    media = await enviarFicheiro(k, mp4, `${slug}.mp4`);
    log(`⬆️  vídeo entregue: ${media.path}`);
  }
  // A capa vem pronta no artefato da produção, a mesma que vai ao YouTube.
  // ⚠️ Falhar a capa NÃO pode impedir a publicação: um Reel sem capa própria ainda é
  // um Reel; um vídeo que não sai por causa de uma imagem é um dia perdido.
  if (!capa && temCapa) {
    try {
      capa = await enviarFicheiro(k, capaLocal, `capa-${slug}.jpg`, 'image/jpeg');
      log(`🖼️  capa entregue: ${capa.path}`);
    } catch (e) {
      log(`⚠️ a capa falhou (${e.message}) — segue sem ela.`);
    }
  } else if (!temCapa) {
    log('⚠️ não veio capa no artefato — o Instagram escolherá um fotograma ao calhas, e o Pinterest não sai.');
  }

  const anotar = (chaveDaRede, valor) => {
    caderno[slug] = {
      ...(caderno[slug] || {}),
      midias: { video: media, capa },
      publicaEm: quando.toISOString(),
      publicaEmBR: emHoraDoBrasil(quando),
      agendadoEm: caderno[slug]?.agendadoEm || new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
      redes: { ...(caderno[slug]?.redes || {}), [chaveDaRede]: valor },
    };
    // ⚠️ GRAVA A CADA REDE, não no fim. Se a corrida morrer a meio (a máquina do GitHub
    // desaparece de vez em quando), o que já foi agendado fica escrito — senão a retoma
    // republicaria tudo o que já estava no ar.
    gravarCaderno(caderno);
  };

  let quantas = 0;
  const falharam = [];
  for (const rede of aEntregar) {
    if (registo?.redes?.[rede.id]) { log(`\n⏭️  ${rede.nome}: já estava agendado (post ${registo.redes[rede.id].postId})`); continue; }
    const principal = rede.id === 'instagram';
    try {
      const canal = canalDaRede(canais, rede, log);
      if (!canal) throw new Error(`o canal não está ligado (ou está desativado) no Multipost`);

      const limite = await limiteDaRede(k, canal.id, rede);
      const texto = rede.legenda(roteiro, limite);
      const { midias, motivo } = midiasDaRede(rede, { media, capa });
      if (!midias) { log(`\n⏭️  ${rede.nome}: NÃO SAI — ${motivo}`); falharam.push(`${rede.nome} (${motivo})`); continue; }

      const hora = new Date(quando.getTime() + rede.minutos * 60000);
      const corpo = principal
        ? corpoDoAgendamento({ canalId: canal.id, media, capa, legenda: texto, quandoUTC: hora }, log)
        : montarPedido({
          canalId: canal.id,
          midias,
          legenda: texto,
          quandoUTC: hora,
          settings: opcoesDaRede(rede, {
            titulo,
            quadroDoPinterest: rede.id === 'pinterest' ? (await quadroDoPinterest(k, canal.id)).id : undefined,
          }),
        });

      const id = await enviarAgendamento(k, corpo);
      /**
       * ⚠️ A CONFERÊNCIA NÃO É OPCIONAL — já se viu este servidor responder uma coisa e
       * ter feito outra. A prova é a agenda, não a resposta.
       */
      if (!await confirmarNaAgenda(k, id, hora)) {
        throw new Error(`o servidor devolveu o post ${id} mas ele NÃO aparece na agenda`);
      }
      anotar(rede.id, { postId: id, canal: canal.name, publicaEm: hora.toISOString(), publicaEmBR: emHoraDoBrasil(hora), midia: motivo, caracteres: texto.length, limite });
      quantas++;
      log(`\n✅ ${rede.nome}: agendado e confirmado — ${emHoraDoBrasil(hora)} BR (post ${id})`);
      log(`   ${texto.length}/${limite} caracteres · ${motivo}`);
    } catch (e) {
      /**
       * 🔴 O INSTAGRAM É O PRINCIPAL. Se ele falhar, a corrida falha e o dono vê. As
       * outras sete são lucro: uma delas em baixo não pode custar o dia inteiro — é a
       * mesma regra que já valia para a capa e para o Story.
       */
      if (principal) throw new Error(`o Instagram falhou (${e.message}) — e ele é o principal, por isso a corrida para aqui.`);
      log(`\n⚠️  ${rede.nome}: NÃO foi agendado (${e.message}) — segue-se para a próxima.`);
      falharam.push(`${rede.nome} (${e.message})`);
    }
  }

  /**
   * ♦ O STORY, MINUTOS DEPOIS DO REEL (06/08, pedido do dono).
   *
   * ⚠️ **NADA AQUI PODE DERRUBAR O REEL.** O Reel já está agendado e confirmado quando
   * se chega a esta linha; se o Story falhar — por limite do plano, por rede, por o que
   * for —, o dia continua a ter Reel.
   */
  if (!registo?.redes?.['instagram-story']) {
    try {
      const canal = canalDaRede(canais, REDES[0], log);
      const escolha = oQueVaiNoStory({ duracaoSeg: duracaoDoMp4(mp4), media, capa });
      if (!escolha.media) {
        log(`\n⚠️ sem Story hoje: ${escolha.motivo}`);
      } else {
        const horaDoStory = new Date(quando.getTime() + MINUTOS_ATE_O_STORY * 60000);
        const idStory = await enviarAgendamento(k, corpoDoStory({
          canalId: canal.id,
          media: escolha.media,
          // ⚠️ A legenda do Story é CURTA de propósito: o Instagram não a mostra como
          // mostra a do Reel, e o painel fica ilegível com 2200 caracteres repetidos.
          legenda: primeiraLinha(legenda),
          quandoUTC: horaDoStory,
        }));
        anotar('instagram-story', { postId: idStory, tipo: escolha.tipo, publicaEm: horaDoStory.toISOString(), publicaEmBR: emHoraDoBrasil(horaDoStory) });
        log(`\n📖 Story agendado (${escolha.tipo}) para ${emHoraDoBrasil(horaDoStory)} — ${escolha.motivo}`);
      }
    } catch (e) {
      log(`\n⚠️ o Story não foi agendado (${e.message}) — o Reel está de pé, que é o que conta.`);
    }
  }

  log(`\n${'═'.repeat(72)}`);
  log(`✅ ${quantas} de ${aEntregar.length} rede(s) agendadas para hoje.`);
  if (soInstagram) log(`   (as outras ${REDES.length - 1} ficaram de fora porque a fala deste vídeo ainda pede comentário)`);
  if (falharam.length) {
    // ⚠️ NUNCA EM SILÊNCIO. Um `catch` que só escreve no log dá corrida verde mentirosa —
    // foi assim que o monitor do blog ficou morto 28 dias sem ninguém notar.
    log(`⚠️  ficaram por sair ${falharam.length}: ${falharam.join(' · ')}`);
    log('   Correr esta mesma entrega outra vez tenta SÓ as que faltaram.');
  }
  log(`   a primeira vai ao ar ${emHoraDoBrasil(quando)} (hora do Brasil)\n`);
  return 0;
}

// ─── execução direta ─────────────────────────────────────────────────────────

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('multipost/entregar.js')) {
  main()
    .then((c) => process.exit(c))
    .catch((e) => {
      console.error(`\n❌ ${e.message}\n`);
      process.exit(1);
    });
}
