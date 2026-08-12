/**
 * A DESCRIÇÃO DO VÍDEO LONGO — capítulos de verdade, e texto que trabalha para a busca.
 *
 * ═══ O QUE É CALCULADO E O QUE É ESCRITO ═══
 * Em 03/08 descobrimos que **5 das 9 descrições geradas por IA que estavam no ar
 * acabavam a meio da palavra** — a resposta vinha cortada e ninguém olhava para o
 * motivo da paragem (IMPLEMENTACAO20 §33.3). A lição que ficou **não foi "nunca IA"**:
 * foi **"o que se calcula não se pede ao modelo, e nunca se aceita resposta que não
 * chegou ao fim"**. Por isso:
 *
 *   · os capítulos, os tempos, os links, as etiquetas, as hashtags e o crédito da
 *     música saem de listas e de contas — **não podem sair cortados**;
 *   · os três blocos de TEXTO (o "sobre", o "vai aprender" e as "perguntas") são
 *     escritos pela IA a partir do guião, com a **mesma rede do Short** (§55.1): uma
 *     resposta incompleta é deitada fora e tentada outra vez, e se falhar entra um
 *     texto de reserva mais curto — mas inteiro.
 *
 * ═══ OS CAPÍTULOS SÃO A RAZÃO DE ISTO EXISTIR ═══
 * Foi a leitura de 64 capítulos reais (§33.5) que desenhou este vídeo. As regras do
 * YouTube estão agora **conferidas por código** (`conferirCapitulos`): o primeiro tem de
 * ser 00:00, têm de existir três ou mais, e **nenhum pode durar menos de 10 segundos**
 * — se uma delas falhar, o YouTube não mostra índice nenhum e ninguém avisa.
 *
 * ♦ 06/08/2026 — DE 4 PARA 6/7 CAPÍTULOS, SEM TOCAR NO VÍDEO. O dono achou-os poucos.
 * Os três cartões do ecrã continuam a ser três; o que mudou é que a descrição também
 * marca **momentos que já existem no vídeo e não têm cartão**: a demonstração no app e
 * o fecho. **Não é preciso voltar a montar nem a renderizar** — os tempos saem do mesmo
 * relógio que já põe as legendas no sítio.
 *
 * ⚠️ ESPELHAMENTO — leia antes de mexer. Os tempos abaixo são calculados com as
 * MESMAS constantes que `youtube-render/src/Long.tsx` usa para montar o vídeo
 * (`VOZ_ENTRA_FRAMES` e `RESPIRO_SEC`). Mudar uma sem mudar a outra faz os capítulos
 * apontarem para o sítio errado. É o mesmo modo de falha já documentado entre
 * `Short.tsx` e `srt-short.js` — e a defesa é a mesma: conferir o RESULTADO no vídeo
 * renderizado, não confiar no cálculo.
 *
 * Uso: node src/scripts/youtube/descricao-longo.js --slug=sair-do-vermelho
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { assuntoCurto } from './lib/palavras.js';
import { escolherTrilha, creditoDaMusica } from './lib/musica.js';

const AQUI = dirname(fileURLToPath(import.meta.url));
const ROTEIRO_DIR = join(process.cwd(), 'youtube-render', 'public', 'roteiro');
const AUDIO_DIR = join(process.cwd(), 'youtube-render', 'public', 'audio');
const OUTPUT_DIR = join(AQUI, 'output');
/** A fila de temas — é dela que saem as palavras-chave que o DONO aprovou. */
const FILA = join(process.cwd(), '.github', 'data', 'youtube-longos.json');

// ⚠️ ESPELHADOS de youtube-render/src/Long.tsx — ver o aviso no cabeçalho.
const VOZ_ENTRA_SEG = 27 / 30;
// ⚠️ 0,35 → 0,21 em 09/08/2026, ao MESMO TEMPO que em Long.tsx. As cenas passaram de 30
//    para 49 (teto de palavras de 40 → 26) e a 0,35 o vídeo ganhava 6,7s de silêncio.
//    Se um dia estes dois números divergirem, os capítulos desta descrição passam a
//    apontar para o sítio errado — e o YouTube não se queixa.
const RESPIRO_SEC = 0.21;
/** ⚠️ ESPELHADO de `CARTAO_CAPITULO_FRAMES` (78 fotogramas) em `longo/telas.tsx`. */
const CARTAO_CAPITULO_SEG = 78 / 30;

/**
 * 🔴 A REGRA DO YOUTUBE QUE MAIS FÁCIL SE PARTE: **nenhum capítulo com menos de 10
 * segundos**. Basta um para o YouTube deitar fora o índice INTEIRO — e não avisa.
 */
const MIN_CAPITULO_SEG = 10;
/** O mínimo do YouTube para mostrar índice. Menos do que isto e não aparece nada. */
const MIN_CAPITULOS = 3;

const APP_URL = 'https://app.finmoovi.com';
const BLOG_URL = 'https://blog.finmoovi.com/';
const GLOSSARIO_URL = 'https://blog.finmoovi.com/glossario/';

/** As palavras-chave que são verdade em QUALQUER vídeo longo daqui (ver `upload-longo.js`). */
const PALAVRAS_DO_CANAL = ['finanças pessoais', 'educação financeira', 'controle financeiro', 'app de finanças'];

const args = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => {
    const [k, ...v] = a.slice(2).split('=');
    return [k, v.join('=') || true];
  }),
);

const mmss = (seg) => {
  const s = Math.max(0, Math.floor(seg));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

const semAcento = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const maiuscula = (s) => (s ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : '');
/** O YouTube recusa `<` e `>`. */
const limpar = (s) => String(s || '').replace(/[<>]/g, '').replace(/\r/g, '').trim();

/**
 * As calculadoras que EXISTEM no blog, com os termos que as chamam. A tabela é a
 * MESMA ideia do `upload-short.js`: escolher o link é VERDADE, não gosto.
 * ⚠️ O endereço leva barra no fim — o Cloudflare serve COM barra final.
 */
const BLOG_TOOLS_URL = 'https://blog.finmoovi.com/ferramentas/';
const CALCULADORAS = [
  { pagina: 'calculadora-financiamento', termos: ['divida', 'vermelho', 'financiamento', 'amortiza', 'parcela', 'emprestimo', 'credito', 'cartao', 'fatura'] },
  { pagina: 'calculadora-juros-compostos', termos: ['juros compostos', 'render', 'rendimento', 'tesouro', 'poupanca'] },
  { pagina: 'simulador-investimento', termos: ['investi', 'cdb', 'acoes', 'renda fixa', 'etf', 'dividendo'] },
  { pagina: 'calculadora-reserva', termos: ['reserva', 'emergencia', 'imprevisto'] },
  { pagina: 'calculadora-aposentadoria', termos: ['aposenta', 'previdencia', 'inss'] },
  { pagina: 'calculadora-orcamento', termos: ['orcamento', 'gasto', 'salario', 'inflacao', 'economizar', 'controle', 'conta', 'dinheiro'] },
  { pagina: 'conversor-moedas', termos: ['dolar', 'euro', 'cambio', 'moeda'] },
];

export function linkDaCalculadora(texto) {
  const t = semAcento(texto);
  for (const c of CALCULADORAS) {
    if (c.termos.some((termo) => t.includes(termo))) return `${BLOG_TOOLS_URL}${c.pagina}/`;
  }
  return BLOG_TOOLS_URL;
}

/**
 * O QUE O DONO APROVOU PARA ESTE VÍDEO — palavras-chave e página do glossário.
 *
 * 🔴 **E É AQUI QUE MORRE UM DEFEITO A SÉRIO**, apanhado em 06/08: as hashtags do vídeo
 * longo estavam **escritas à mão para o vídeo do vermelho** (`#SairDoVermelho #Dívidas
 * …`). O vídeo seguinte, sobre outro assunto qualquer, sairia com a hashtag do assunto
 * errado — e ninguém se queixaria. Agora saem da fila, que é o único sítio onde as
 * palavras deste vídeo estão escritas e aprovadas.
 */
export function daFila(slug, fila = null) {
  let dados = fila;
  if (!dados) {
    if (!existsSync(FILA)) return {};
    try { dados = JSON.parse(readFileSync(FILA, 'utf-8')); } catch { return {}; }
  }
  return (dados.videos || []).find((v) => v.slug === slug) || {};
}

/**
 * As palavras deste vídeo, pela ordem que interessa: as do dono primeiro, as do canal
 * por baixo. Sem fila, cai no tema — que é sempre melhor do que nada.
 */
export function palavrasDoVideo(plano, naFila = {}) {
  const doDono = (naFila.palavrasChave || []).map((t) => limpar(t)).filter(Boolean);
  /**
   * 🔴 `assuntoCurto`, E NÃO O TEMA INTEIRO — 09/08/2026.
   *
   * Isto era `plano.tema.split(':')[0]`. Nos temas que o robô cria sozinho dá uma frase
   * de 70 caracteres e ninguém nota; nos temas que o dono manda pela /status dá o
   * PARÁGRAFO todo, e ele saía colado nos títulos dos capítulos, no "Guia completo
   * sobre" e no "NESTE VÍDEO". Medido no vídeo 2: 425 caracteres.
   */
  const doTema = assuntoCurto({ tema: plano.tema, titulo: naFila.titulo });
  const cruas = doDono.length ? doDono : [doTema].filter(Boolean);
  const vistas = new Set();
  const saida = [];
  for (const t of [...cruas, ...PALAVRAS_DO_CANAL]) {
    const chave = semAcento(t);
    if (!t || vistas.has(chave)) continue;
    vistas.add(chave);
    saida.push(t);
  }
  return saida;
}

/** Uma hashtag de uma frase: "dívida do cartão" → "#DívidaDoCartão". */
function hashtagDe(frase) {
  const p = String(frase || '').split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  if (!p.length || p.length > 4) return '';
  return `#${p.map((w) => maiuscula(w)).join('')}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// OS CAPÍTULOS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Os tempos de cada capítulo. Se houver `timing.json` (a voz já foi gerada), usa a
 * duração MEDIDA de cada cena; senão usa a autoral, e diz que é uma estimativa —
 * porque um capítulo apontado para o sítio errado é pior do que capítulo nenhum.
 *
 * ♦ 06/08/2026 — AS MARCAS PASSARAM A SER TRÊS FAMÍLIAS, e a distinção importa:
 *   · o **00:00**, que o YouTube exige e que antes era colado à mão na descrição;
 *   · os **cartões**, que têm placa no ecrã (é preciso haver um capítulo para cada um);
 *   · os **momentos sem cartão** — a demonstração no app e o fecho —, que existem no
 *     vídeo mas não têm placa. São estes que levaram os capítulos de 4 para 6.
 *
 * ⚠️ Um momento sem cartão que caia a menos de 10 segundos do anterior é **deitado
 * fora**, não encolhido: o YouTube deita fora o índice INTEIRO por causa de um só
 * capítulo curto. Um cartão nunca é deitado fora — ele tem placa no ecrã, e um cartão
 * sem linha na descrição é uma placa que aparece sem explicação.
 */
export function tempoDosCapitulos(plano, timing, opts = {}) {
  const naFila = opts.naFila || daFila(plano.slug);
  const chave = opts.chave || palavrasDoVideo(plano, naFila)[0] || 'finanças pessoais';
  const medido = (id) => timing?.scenes?.find((s) => String(s.id) === String(id))?.durationSec;

  const brutas = [];
  const cartoes = [];
  const partesVistas = new Set();
  let t = VOZ_ENTRA_SEG;

  plano.scenes.forEach((cena, i) => {
    if (cena.abreCapitulo && cena.capitulo) {
      // ⚠️ O CAPÍTULO COMEÇA NO CARTÃO, não na primeira frase falada. Desde 04/08 o
      // cartão do "PASSO N" tem cena própria (o dono: *"ficou muito congestionado"*), e
      // ele vem ANTES desta cena. Marcar o capítulo na fala mandaria quem clica no
      // índice do YouTube para 2,6 segundos depois do início — e um capítulo apontado
      // para o sítio errado é pior do que capítulo nenhum.
      const marca = {
        numero: cena.capitulo,
        // "Passo N" é o que a placa do ecrã escreve (`CartaoDeCapitulo`), à letra.
        titulo: `Passo ${cena.capitulo} — ${cena.tituloCapitulo}`,
        seg: t,
        cartao: true,
      };
      brutas.push(marca);
      cartoes.push(marca);
      t += CARTAO_CAPITULO_SEG;
    }
    /**
     * Os momentos sem placa. São a PRIMEIRA cena de cada parte — e as partes já existem
     * no guião desde que o montador o escreve, por isso não há nada a adivinhar aqui.
     * ⚠️ Os títulos vão todos na forma "rótulo: palavra-chave". É de propósito: a
     * palavra-chave do dono muda de vídeo para vídeo ("sair do vermelho", "dívida do
     * cartão"…) e só a forma com dois pontos se lê bem com qualquer uma. Encaixá-la no
     * meio de uma frase daria "O que fazer agora com dívida do cartão".
     */
    if (cena.parte && !partesVistas.has(cena.parte)) {
      partesVistas.add(cena.parte);
      if (cena.parte === 'demonstracao') brutas.push({ titulo: `Na prática: ${chave} no app`, seg: t, cartao: false });
      if (cena.parte === 'fecho') brutas.push({ titulo: `Resumo e próximo passo: ${chave}`, seg: t, cartao: false });
    }
    const dur = medido(cena.id) || cena.durationSec;
    t += dur + (i < plano.scenes.length - 1 ? RESPIRO_SEC : 0);
  });

  brutas.sort((a, b) => a.seg - b.seg);

  const marcas = [{ titulo: `${maiuscula(chave)}: o problema e a promessa`, seg: 0, cartao: true, abertura: true }];
  const largadas = [];
  for (const m of brutas) {
    const anterior = marcas[marcas.length - 1];
    if (m.seg - anterior.seg < MIN_CAPITULO_SEG) {
      if (!m.cartao) { largadas.push(m); continue; }
      if (!anterior.cartao) largadas.push(marcas.pop());
    }
    marcas.push(m);
  }
  // O último capítulo também tem de durar 10 segundos — até ao fim da fala.
  const ultimo = marcas[marcas.length - 1];
  if (marcas.length > MIN_CAPITULOS && !ultimo.cartao && t - ultimo.seg < MIN_CAPITULO_SEG) largadas.push(marcas.pop());

  return { marcas, cartoes, largadas, totalSeg: t };
}

/**
 * As três regras do YouTube, conferidas. Devolve as queixas — ou nada, se estiver bem.
 * ⚠️ Isto existe porque **partir uma delas não dá erro nenhum**: o YouTube limita-se a
 * não mostrar índice, e a descrição fica com uma lista de horas que não faz nada.
 */
export function conferirCapitulos(marcas, totalSeg) {
  const queixas = [];
  if (!marcas.length || marcas[0].seg !== 0) queixas.push('o primeiro capítulo não é 00:00');
  if (marcas.length < MIN_CAPITULOS) queixas.push(`só ${marcas.length} capítulos — o YouTube exige ${MIN_CAPITULOS}`);
  marcas.forEach((m, i) => {
    const fim = i + 1 < marcas.length ? marcas[i + 1].seg : totalSeg;
    if (fim - m.seg < MIN_CAPITULO_SEG) {
      queixas.push(`"${m.titulo}" dura ${(fim - m.seg).toFixed(1)}s — menos de ${MIN_CAPITULO_SEG}s deita fora o índice INTEIRO`);
    }
  });
  const fora = marcas.filter((m, i) => i && m.seg <= marcas[i - 1].seg);
  if (fora.length) queixas.push(`há capítulos fora de ordem: ${fora.map((m) => m.titulo).join(' · ')}`);
  return queixas;
}

// ═══════════════════════════════════════════════════════════════════════════════
// OS TRÊS BLOCOS DE TEXTO — o único sítio onde a IA entra, e com rede
// ═══════════════════════════════════════════════════════════════════════════════

const ORCAMENTO_RESPOSTA = 2000;
const TENTATIVAS_LLM = 2;

/**
 * Diz porque é que uma resposta NÃO serve — ou nada, se estiver inteira.
 * É o mesmo raciocínio do `upload-short.js`: **o sinal fiável é a ORDEM**. Pedimos o
 * "sobre", depois os tópicos, depois as perguntas. Se as últimas faltam, a resposta
 * parou pelo caminho — e um "sobre" que acaba em letra acabou a meio de uma frase.
 */
export function blocosCortados({ sobre, aprender, perguntas }) {
  if (!sobre) return 'sem o texto de apresentação';
  if (!aprender || aprender.length < 3) return 'sem a lista do que se vai aprender (a resposta parou antes dela)';
  if (!perguntas || perguntas.length < 3) return 'sem as perguntas (a resposta parou antes delas)';
  const fim = sobre.trim().slice(-1);
  if (/[\p{L}\p{N}]/u.test(fim)) return `o texto acaba a meio ("…${sobre.trim().slice(-30)}")`;
  if (!perguntas.every((p) => p.trim().endsWith('?'))) return 'há uma pergunta que não acaba em ponto de interrogação';
  return null;
}

const emLinhas = (bruto, min, max) => String(bruto || '')
  .split(/\r?\n/)
  .map((l) => l.replace(/^\s*[-•*·–—\d.)\]]+\s*/, '').trim())
  .filter((l) => l.length >= min && l.length <= max);

/**
 * O TEXTO DE RESERVA — mais curto, mas INTEIRO, e com as palavras do dono lá dentro.
 *
 * ⚠️ **É NOS DIAS MAUS QUE ELE É USADO**, por isso não pode ser um texto pobre: é a
 * mesma lição do plano B do Short (§55.1). E **não traz perguntas**: uma secção com
 * título e nada por baixo é pior do que secção nenhuma.
 */
export function blocosDeReserva(plano, palavras) {
  const chave = palavras[0] || 'finanças pessoais';
  const nPassos = (plano.capitulos || []).length;
  // "a, b ou c" — e não "a, b, c," seguido de vírgula, que foi o que a 1ª versão escreveu.
  const emNegrito = palavras.slice(1, 4).map((p) => `*${p}*`);
  const outras = emNegrito.length > 1
    ? `${emNegrito.slice(0, -1).join(', ')} ou ${emNegrito[emNegrito.length - 1]}`
    : (emNegrito[0] || '');
  const sobre = [
    `Este vídeo é sobre *${chave}*: o que é, por que isso mexe no seu bolso e o que dá para fazer já a partir de hoje.`,
    `Tudo com contas em reais${nPassos ? `, num plano de ${nPassos} passos` : ''}, e sem palavra difícil.`,
    'No caminho eu mostro como fazer a conta do seu caso no FinMoovi — o app tem 7 dias grátis e funciona no navegador, sem instalar nada.',
    outras ? `Se você procura ${outras}, comece por aqui.` : '',
  ].filter(Boolean).join(' ');
  const aprender = (plano.capitulos || []).map((c) => c.titulo).filter(Boolean);
  return { sobre, aprender, perguntas: [], deReserva: true };
}

/**
 * Os três blocos, escritos pela IA a partir do guião. Se ela falhar ou vier cortada,
 * devolve o texto de reserva — nunca uma descrição pela metade.
 */
/**
 * ═══ 🔴 `--pago`, PELA MESMA RAZÃO DO `srt-longo.js` — 10/08/2026 ═══
 *
 * Os três blocos de texto desta descrição são escritos pela IA. Na máquina do dono os
 * três provedores GRATUITOS respondem `HTTP 401`, e então sai o **texto de reserva** —
 * em silêncio, sem uma queixa. É o pior modo de falha desta casa, e está descrito no
 * próprio workflow: *"sem as chaves, isto não falha: sai o texto de reserva, em silêncio,
 * todas as semanas"*.
 *
 * ⚠️ **NÃO se liga por omissão.** Na nuvem os gratuitos funcionam e esta mesma conta paga
 * serve os 27 robôs do blog. Só entra quando uma pessoa a pede, à mão.
 */
export async function blocosDeTexto(plano, palavras, { gerar = null, pago = false } = {}) {
  let generateText = gerar;
  if (!generateText) {
    try { ({ generateText } = await import('../apis/kie-ai.js')); }
    catch (err) {
      console.log(`⚠️ IA indisponível (${err.message}) — vai o texto de reserva.`);
      return blocosDeReserva(plano, palavras);
    }
  }

  const chave = palavras[0] || 'finanças pessoais';
  const narracao = (plano.scenes || []).map((s) => s.narration).filter(Boolean).join(' ')
    .replace(/\s+/g, ' ').slice(0, 2500);
  const capitulos = (plano.capitulos || []).map((c, i) => `${i + 1}. ${c.titulo}`).join('\n');

  /**
   * ⚠️ **O PROMPT TEM DE PEDIR EXATAMENTE O QUE O LEITOR ACEITA.** É o defeito mais
   * repetido deste projeto (20 ocorrências, memória `prompt-versus-validador`): o prompt
   * manda escrever aquilo que a trava a seguir rejeita. Aqui: 4 a 6 tópicos e 3 a 5
   * perguntas, cada pergunta a acabar em "?", sem traço no início — que é letra por
   * letra o que o `blocosCortados` e o `emLinhas` exigem.
   */
  const prompt = `Você é editor de um canal de finanças no YouTube (pt-BR). A partir do roteiro deste vídeo, escreva a parte de TEXTO da descrição. Responda EXATAMENTE neste formato, sem comentários:

---SOBRE---
[4 a 5 frases, tom coloquial pt-BR, explicando para quem é o vídeo e o que ele resolve. Use a palavra-chave "${chave}" e mais 2 termos que alguém escreveria na busca. Envolva 3 a 5 termos importantes em asteriscos assim: *termo*. SEM links, SEM hashtags, SEM listas. Termine sempre com ponto final.]
---APRENDER---
[4 a 6 tópicos do que a pessoa aprende, UM POR LINHA, entre 20 e 70 caracteres cada, começando por verbo ou por "Por que"/"Como", SEM traço nem ponto nem emoji no início]
---PERGUNTAS---
[3 a 5 perguntas reais que alguém escreveria no Google e que este vídeo responde, UMA POR LINHA, cada uma a TERMINAR em "?", entre 20 e 90 caracteres, SEM traço nem número no início]

Dados do roteiro:
- Tema: ${plano.tema}
- Promessa: ${plano.promessa}
- Palavras-chave aprovadas: ${palavras.slice(0, 6).join(', ')}
- Capítulos:
${capitulos}
- Narração: ${narracao}`;

  for (let tentativa = 1; tentativa <= TENTATIVAS_LLM; tentativa++) {
    try {
      const out = await generateText(prompt, {
        maxTokens: ORCAMENTO_RESPOSTA, temperature: 0.6, ...(pago ? { pago: 'leitor' } : {}),
      });
      const apanhar = (tag, seguinte) => {
        const re = new RegExp(`---${tag}---\\s*([\\s\\S]*?)(?=---(?:${seguinte})---|$)`);
        const m = String(out || '').match(re);
        return m ? m[1].trim() : '';
      };
      const blocos = {
        sobre: limpar(apanhar('SOBRE', 'APRENDER')).replace(/\n+/g, ' '),
        aprender: emLinhas(apanhar('APRENDER', 'PERGUNTAS'), 15, 80).slice(0, 6),
        perguntas: emLinhas(apanhar('PERGUNTAS', ''), 15, 100).filter((p) => p.endsWith('?')).slice(0, 5),
      };
      const defeito = blocosCortados(blocos);
      if (defeito) {
        console.log(`⚠️ a IA veio incompleta (${defeito}) — tentativa ${tentativa}/${TENTATIVAS_LLM}.`);
        continue;
      }
      return { ...blocos, deReserva: false };
    } catch (err) {
      console.log(`⚠️ a IA falhou (${err.message}) — tentativa ${tentativa}/${TENTATIVAS_LLM}.`);
    }
  }
  console.log('⚠️ a IA não devolveu resposta inteira — vai o texto de reserva (que sai sempre completo).');
  return blocosDeReserva(plano, palavras);
}

// ═══════════════════════════════════════════════════════════════════════════════
// A DESCRIÇÃO
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * ♦ 06/08/2026 — A DESCRIÇÃO DO LONGO PASSOU A SER ESCRITA, E NÃO SÓ DESPEJADA.
 *
 * Era gancho, uma lista de horas, três links crus e uma linha de hashtags — 1.200
 * caracteres num espaço de 5.000. O dono: *"ainda sinto falta de mais texto explicativo
 * para justamente termos a possibilidade de colocarmos mais palavras-chave"*.
 *
 * As regras são as mesmas que o Short recebeu em 05/08 (§55.1), e cumprem-se à letra:
 *   • **linhas curtas com respiro** entre blocos;
 *   • **cada linha começa por um marcador** — emoji, ponto ou asterisco;
 *   • **palavras-chave a negrito** (o YouTube aceita *asteriscos* desde 2021);
 *   • **as linhas de link começam por emoji**; emojis com conta, um por bloco.
 *
 * E ganha três coisas que o Short não tem:
 *   · **SOBRE ESTE VÍDEO** — o texto corrido onde a palavra-chave passa a viver;
 *   · **PERGUNTAS QUE ESTE VÍDEO RESPONDE** — que são, literalmente, frases que alguém
 *     escreve na busca;
 *   · **um quarto link**, para a página do glossário do assunto, que também puxa o blog.
 *
 * ⚠️ **UMA SECÇÃO QUE VENHA VAZIA NÃO APARECE.** Nunca fica um título com nada por
 * baixo — é a mesma trava do Short, e é o que permite ao texto de reserva não trazer
 * perguntas sem estragar a descrição.
 */
export function montarDescricao(plano, timing, opts = {}) {
  const naFila = opts.naFila || daFila(plano.slug);
  const palavras = palavrasDoVideo(plano, naFila);
  const chave = palavras[0];
  const { marcas, cartoes, largadas, totalSeg } = tempoDosCapitulos(plano, timing, { naFila, chave });
  const blocos = opts.blocos || blocosDeReserva(plano, palavras);

  const trilha = escolherTrilha(plano.fioCondutor, 0);
  const credito = creditoDaMusica(trilha);
  const link = linkDaCalculadora(`${plano.tema} ${plano.promessa}`);
  const glossario = naFila.glossario ? `${GLOSSARIO_URL}${naFila.glossario}/` : GLOSSARIO_URL;
  const estimado = !timing;

  const linhas = [
    plano.capa,
    '',
    plano.promessa,
    '',
    /**
     * 🔑 O PEDIDO DE COMENTÁRIO FICA AQUI — E DESDE 10/08 SÓ AQUI.
     *
     * ⚠️ A nota anterior dizia *"a narração pede comenta FINMOOVI"*, e **deixou de ser
     * verdade**: a fala do vídeo passou a mandar PROCURAR o app pelo nome, porque ele sai
     * em nove redes e em sete ninguém responde a comentários (§12-A). Ver
     * `EXEMPLO_DE_CHAMADA` em `roteiro-longo.js`.
     *
     * ✅ **Na descrição do YouTube o pedido continua, e continua verdadeiro:** aqui há
     * mesmo um robô a responder — `src/scripts/youtube/comentarios.js`, de hora a hora
     * desde 05/08. A promessa é cumprida em dois sítios: este e a legenda do Instagram.
     */
    '👉 Comenta FINMOOVI aqui embaixo que eu te mando o app.',
  ];

  if (blocos.sobre) linhas.push('', '📖 *SOBRE ESTE VÍDEO*', blocos.sobre);
  if (blocos.aprender?.length) linhas.push('', '📌 *O QUE VOCÊ VAI APRENDER*', ...blocos.aprender.map((t) => `• ${t}`));
  linhas.push('', '⏱️ *CAPÍTULOS*', ...marcas.map((m) => `${mmss(m.seg)} ${m.titulo}`));
  if (blocos.perguntas?.length) linhas.push('', '❓ *PERGUNTAS QUE ESTE VÍDEO RESPONDE*', ...blocos.perguntas.map((p) => `• ${p}`));

  linhas.push(
    '',
    `📲 *Organize suas finanças (7 dias grátis, sem instalar):* ${APP_URL}`,
    `🧮 *Faça a conta do seu caso:* ${link}`,
    `📖 *Guia completo sobre ${chave}:* ${glossario}`,
    `📚 *Mais artigos de educação financeira:* ${BLOG_URL}`,
    '',
    '💬 *Ficou dúvida?* Escreve nos comentários que eu respondo — leio todos.',
    '',
    '🔎 *NESTE VÍDEO:*',
    palavras.map((p) => `*${p}*`).join(' · '),
  );
  if (credito) linhas.push('', `🎵 ${credito}`);
  // ⚠️ As hashtags saem das palavras do DONO — ver o aviso em `daFila`.
  const hashtags = [...new Set(palavras.map(hashtagDe).filter(Boolean))].slice(0, 4);
  linhas.push('', [...hashtags, '#FinMoovi'].join(' '));

  const texto = limpar(linhas.join('\n')).slice(0, 5000);

  return {
    texto,
    marcas,
    cartoes,
    largadas,
    totalSeg,
    estimado,
    link,
    glossario,
    credito,
    palavras,
    queixas: conferirCapitulos(marcas, totalSeg),
    deReserva: Boolean(blocos.deReserva),
  };
}

/** O caminho completo: escreve os blocos com a IA e monta a descrição. */
export async function prepararDescricao(plano, timing, opts = {}) {
  const naFila = opts.naFila || daFila(plano.slug);
  const palavras = palavrasDoVideo(plano, naFila);
  const blocos = opts.semIa
    ? blocosDeReserva(plano, palavras)
    // ⚠️ `pago` vem de quem chama (o `--pago` da linha de comando). Sem ele, os
    //    provedores gratuitos — que é o que a nuvem usa. Ver `blocosDeTexto`.
    : await blocosDeTexto(plano, palavras, { pago: Boolean(opts.pago) });
  return montarDescricao(plano, timing, { naFila, blocos });
}

// ─── execução direta ─────────────────────────────────────────────────────────

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('youtube/descricao-longo.js')) {
  const slug = String(args.slug && args.slug !== true ? args.slug : 'sair-do-vermelho');
  const plano = JSON.parse(readFileSync(join(ROTEIRO_DIR, `${slug}.json`), 'utf-8'));

  const caminhoTiming = join(AUDIO_DIR, slug, 'timing.json');
  const timing = existsSync(caminhoTiming) ? JSON.parse(readFileSync(caminhoTiming, 'utf-8')) : null;

  const d = await prepararDescricao(plano, timing, {
    semIa: Boolean(args['sem-ia']),
    pago: Boolean(args.pago),
  });

  if (d.estimado) {
    console.log('\n⚠️ AINDA NÃO HÁ VOZ GERADA — os tempos abaixo são ESTIMATIVA pelo número de palavras.');
    console.log('   Volte a correr isto depois do TTS para os capítulos apontarem para o sítio certo.\n');
  }
  console.log(d.queixas.length
    ? `❌ os capítulos não cumprem as regras do YouTube:\n   · ${d.queixas.join('\n   · ')}`
    : `✅ ${d.marcas.length} capítulos (${d.cartoes.length} com placa no ecrã) — o primeiro em 00:00, nenhum abaixo de ${MIN_CAPITULO_SEG}s`);
  if (d.largadas.length) console.log(`   (largados por ficarem curtos: ${d.largadas.map((m) => m.titulo).join(' · ')})`);
  console.log(`⏱️  duração falada: ${mmss(d.totalSeg)}`);
  console.log(`🔗 calculadora: ${d.link}`);
  console.log(`📖 glossário:   ${d.glossario}`);
  console.log(`🏷️  palavras:    ${d.palavras.join(' · ')}`);
  console.log(`✍️  texto:       ${d.deReserva ? 'DE RESERVA (a IA não serviu)' : 'escrito pela IA'}`);
  console.log(`🎵 ${d.credito || '(esta faixa não exige crédito)'}`);

  // ⚠️ A verificação ignora a linha das hashtags. A 1ª versão acusava a descrição de
  // "acabar a meio da palavra" porque ela termina em "#FinMoovi" — uma letra. Um
  // alarme que dispara sempre é um alarme que ninguém lê, e este canal já tem a
  // experiência de avisos ignorados a custarem vídeos.
  const semHashtags = d.texto.trim().split('\n').filter((l) => !l.trim().startsWith('#')).join('\n').trim();
  const acabaEmLetra = /[\p{L}]$/u.test(semHashtags);
  console.log(acabaEmLetra ? '⚠️ a descrição acaba numa letra — confira' : '✅ a descrição acaba completa');
  console.log(`📏 ${d.texto.length} caracteres (o limite do YouTube é 5000)`);

  const destino = join(OUTPUT_DIR, `${slug}.descricao.txt`);
  writeFileSync(destino, d.texto, 'utf-8');
  console.log(`\n💾 ${destino}\n`);
  console.log(`${'─'.repeat(72)}\n${d.texto}\n${'─'.repeat(72)}\n`);
}
