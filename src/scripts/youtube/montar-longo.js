/**
 * O MONTADOR DO VÍDEO LONGO — de guião falado a plano de cenas (04/08/2026).
 *
 * ═══ O QUE ELE FAZ, E POR QUE EXISTE ═══
 * O guião sai da geração em SEIS blocos, e um capítulo tem ~220 palavras. Isso são
 * ~85 segundos de fala numa só peça — e nem a voz nem o ecrã aguentam isso:
 *  · o edge-tts fecha o stream cedo em pedidos longos, sem dar erro (o defeito já
 *    documentado no `tts-short.js`), e uma frase decepada no meio de 85 segundos é
 *    muito mais difícil de apanhar do que numa cena de 4;
 *  · e 85 segundos com a MESMA imagem no ecrã é a monotonia que o §26.4 antecipou
 *    como o risco número um deste formato.
 * Por isso o montador parte cada bloco em CENAS de no máximo 40 palavras, sempre em
 * fim de frase, e nunca atravessando a fronteira de um bloco.
 *
 * ═══ O QUE ELE REAPROVEITA (e é o ponto todo) ═══
 * A saída é um `<slug>.script.json` com a MESMA forma que o `tts-short.js` já lê há
 * semanas: `{ slug, scenes: [{ id, role, narration, durationSec }] }`. Assim a voz, a
 * medição por Whisper, a rede de segurança quando o Whisper falha, a re-síntese para
 * voz única e o `srt-short.js` funcionam no vídeo longo **sem uma linha nova**.
 * Não foi preciso tocar em nenhum deles.
 *
 * ═══ O QUE NÃO ACONTECE AQUI ═══
 * Nada é publicado, nada entra na fila de saída, nada toca o Short. O ficheiro que
 * este script escreve tem um slug próprio que não existe no `youtube-published.json`
 * — foi verificado que a janela anti-repetição do Short só olha para slugs que estão
 * lá, portanto este ficheiro é invisível para ela.
 *
 * Uso: node src/scripts/youtube/montar-longo.js --slug=sair-do-vermelho
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { PARTES_DO_CAPITULO } from './lib/schema-longo.js';

const AQUI = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(AQUI, 'output');
const ROTEIRO_DIR = join(process.cwd(), 'youtube-render', 'public', 'roteiro');

const args = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => {
    const [k, ...v] = a.slice(2).split('=');
    return [k, v.join('=') || true];
  }),
);

/**
 * O TETO DE PALAVRAS POR CENA — 40, e o número tem duas razões medidas.
 * (a) A 2,6 palavras/s são ~15 segundos de fala, que é o tamanho de pedido em que o
 *     edge-tts se tem portado bem no Short (lá as cenas rondam as 25 palavras).
 * (b) 15 segundos é também o tempo máximo que uma imagem parada aguenta antes de a
 *     pessoa sentir que o vídeo estagnou.
 * O corte é SEMPRE em fim de frase: cortar uma frase ao meio partiria a respiração
 * da voz, que é a coisa que este canal mais penou para acertar.
 */
const MAX_PALAVRAS_CENA = 40;

const contar = (t) => String(t || '').trim().split(/\s+/).filter(Boolean).length;
const frasesDe = (t) => String(t || '').split(/(?<=[.!?…])\s+/).map((f) => f.trim()).filter(Boolean);

/** Parte um texto em pedaços de ≤ MAX_PALAVRAS_CENA palavras, sempre em fim de frase. */
export function partirEmCenas(texto) {
  const pedacos = [];
  let atual = [];
  let n = 0;
  for (const frase of frasesDe(texto)) {
    const p = contar(frase);
    // Uma frase sozinha maior que o teto vai inteira: partir por dentro estragaria a
    // respiração, e o TTS lida melhor com uma frase longa do que com meia frase.
    if (atual.length && n + p > MAX_PALAVRAS_CENA) {
      pedacos.push(atual.join(' '));
      atual = [];
      n = 0;
    }
    atual.push(frase);
    n += p;
  }
  if (atual.length) pedacos.push(atual.join(' '));
  return pedacos;
}

/**
 * O B-ROLL 16:9 — só composições do catálogo que JÁ estão prontas e validadas
 * (`youtube-render/CATALOG.md`), e só as que não precisam de props nem da gravação
 * pesada de 313 MB. São desenhos nativos do app, com dados reais.
 *
 * Duas listas, e a divisão é editorial:
 *  · DEMONSTRACAO — telas que MOSTRAM NÚMERO (donut, barras, lista, contador). É o
 *    que tem de estar no ecrã quando a narração diz "eu abri o app e estava lá".
 *  · CONTEXTO — as telas em movimento, para quando se está a contar a história.
 * As durações são as que o catálogo regista para cada composição; quando a cena é
 * mais comprida, a composição repete em ciclo (ver `Long.tsx`).
 */
export const BROLL_DEMONSTRACAO = [
  { comp: 'BalancoDonutLong', frames: 210 },
  { comp: 'FluxoBarrasLong', frames: 210 },
  { comp: 'ExtratoListaLong', frames: 210 },
  { comp: 'CartoesCountUpLong', frames: 210 },
  { comp: 'ComprasCarrinhoLong', frames: 210 },
  { comp: 'SmartCaptureVozLong', frames: 210 },
];

export const BROLL_CONTEXTO = [
  { comp: 'CreditCards3DLong', frames: 210 },
  { comp: 'FluxoCaixa3DLong', frames: 210 },
  { comp: 'Extrato3DLong', frames: 210 },
  { comp: 'Balanco3DLong', frames: 210 },
  { comp: 'AppCarrosselLong', frames: 300 },
  { comp: 'Compras3DLong', frames: 210 },
  { comp: 'AppMosaicoLong', frames: 210 },
  { comp: 'SmartCapture3DLong', frames: 210 },
  { comp: 'AppQuadLong', frames: 210 },
  { comp: 'AppNumerosLong', frames: 188 },
];

/**
 * Escolhe o b-roll de cada cena. Duas regras, e nenhuma delas é aleatória — um vídeo
 * que muda de imagem por sorteio não se consegue re-render igual, e depurar um
 * defeito visual que só acontece "às vezes" é o pior tempo que se pode gastar.
 *  1. cena de DEMONSTRAÇÃO recebe sempre uma tela com número;
 *  2. nunca a mesma composição duas vezes seguidas.
 */
export function escolherBroll(cenas) {
  let iDemo = 0;
  let iCtx = 0;
  let anterior = null;
  return cenas.map((c) => {
    const lista = c.parte === 'demonstracao' ? BROLL_DEMONSTRACAO : BROLL_CONTEXTO;
    let escolha = lista[(c.parte === 'demonstracao' ? iDemo++ : iCtx++) % lista.length];
    if (escolha.comp === anterior) {
      escolha = lista[(c.parte === 'demonstracao' ? iDemo++ : iCtx++) % lista.length];
    }
    anterior = escolha.comp;
    return { ...c, broll: escolha.comp, brollFrames: escolha.frames };
  });
}

/** Transforma o guião de seis blocos na lista de cenas do vídeo. */
export function montarCenas(longo) {
  const cenas = [];
  const empurrar = (texto, meta) => {
    for (const pedaco of partirEmCenas(texto)) {
      cenas.push({ ...meta, narration: pedaco, palavras: contar(pedaco) });
    }
  };

  empurrar(longo.abertura, { bloco: 'abertura', role: 'hook', capitulo: null, parte: 'abertura' });

  (longo.capitulos || []).forEach((cap, i) => {
    PARTES_DO_CAPITULO.forEach((parte) => {
      empurrar(cap[parte], {
        bloco: `capitulo${i + 1}`,
        role: 'beat',
        capitulo: i + 1,
        tituloCapitulo: cap.titulo,
        parte,
      });
    });
  });

  empurrar(longo.chamada, { bloco: 'chamada', role: 'cta', capitulo: null, parte: 'chamada' });
  empurrar(longo.fecho, { bloco: 'fecho', role: 'outro', capitulo: null, parte: 'fecho' });

  // A PRIMEIRA cena de cada capítulo leva a placa com o título — é o equivalente
  // visual do capítulo que o YouTube mostra na descrição, e é o que separa um vídeo
  // longo de seis minutos de fala corrida.
  const vistos = new Set();
  for (const c of cenas) {
    if (c.capitulo && !vistos.has(c.capitulo)) {
      c.abreCapitulo = true;
      vistos.add(c.capitulo);
    }
  }

  return escolherBroll(cenas).map((c, i) => ({
    id: i + 1,
    ...c,
    // A duração autoral é só a rede por baixo: quem manda é o áudio medido pelo TTS.
    // Fica calculada pela MESMA velocidade que o resto do projeto usa (2,6 palavras/s).
    durationSec: +(c.palavras / 2.6).toFixed(2),
  }));
}

// ─── execução direta ─────────────────────────────────────────────────────────

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('youtube/montar-longo.js')) {
  const slug = String(args.slug && args.slug !== true ? args.slug : 'sair-do-vermelho');
  const longo = JSON.parse(readFileSync(join(OUTPUT_DIR, `${slug}.longo.json`), 'utf-8'));

  const cenas = montarCenas(longo);
  const palavras = cenas.reduce((a, c) => a + c.palavras, 0);
  const segundos = palavras / 2.6;

  console.log(`\n🎬 MONTAGEM DO VÍDEO LONGO — "${longo.tema}"`);
  console.log(`   ${cenas.length} cenas · ${palavras} palavras ≈ ${Math.floor(segundos / 60)}min${String(Math.round(segundos % 60)).padStart(2, '0')} de fala\n`);
  for (const c of cenas) {
    const marca = c.abreCapitulo ? `📖 CAP ${c.capitulo} · ${c.tituloCapitulo}` : '';
    console.log(`   ${String(c.id).padStart(2)}. [${c.parte.padEnd(15)}] ${String(c.palavras).padStart(2)}p · ${c.broll.padEnd(22)} ${marca}`);
  }

  const maiores = cenas.filter((c) => c.palavras > MAX_PALAVRAS_CENA);
  if (maiores.length) {
    console.log(`\n   ⚠️ ${maiores.length} cena(s) passam das ${MAX_PALAVRAS_CENA} palavras porque são UMA frase só: ${maiores.map((c) => `#${c.id} (${c.palavras})`).join(', ')}`);
  }

  // 1) o ficheiro que o `tts-short.js` já sabe ler, sem uma linha nova lá dentro
  const paraVoz = {
    slug,
    term: longo.tema,
    keyword: '',
    formato: 'longo',
    scenes: cenas.map((c) => ({ id: c.id, role: c.role, narration: c.narration, durationSec: c.durationSec })),
  };
  writeFileSync(join(OUTPUT_DIR, `${slug}.script.json`), JSON.stringify(paraVoz, null, 2), 'utf-8');

  // 2) o plano completo, que a composição do Remotion lê
  mkdirSync(ROTEIRO_DIR, { recursive: true });
  const plano = {
    slug,
    formato: 'longo',
    tema: longo.tema,
    promessa: longo.promessa,
    fioCondutor: longo.fioCondutor,
    capa: frasesDe(longo.abertura)[0] || '',
    capitulos: (longo.capitulos || []).map((c, i) => ({ numero: i + 1, titulo: c.titulo })),
    scenes: cenas,
    palavras,
  };
  writeFileSync(join(ROTEIRO_DIR, `${slug}.json`), JSON.stringify(plano, null, 2), 'utf-8');

  console.log(`\n💾 voz:  ${join(OUTPUT_DIR, `${slug}.script.json`)}`);
  console.log(`💾 plano: ${join(ROTEIRO_DIR, `${slug}.json`)}`);
  console.log(`\n▶️  a seguir: node --env-file=.env.local src/scripts/youtube/tts-short.js --slug=${slug}\n`);
}
