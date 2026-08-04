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
import { PARTES_POSSIVEIS } from './lib/schema-longo.js';
import { dirigirImagens, conferirImagens } from './lib/imagens-longo.js';

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
 * 🔴 A RODA DE B-ROLL FOI DAQUI PARA FORA — 04/08/2026, e é o conserto do defeito nº 1.
 *
 * O que estava aqui era uma roda: duas listas de composições do catálogo e um contador
 * que ia rodando (cena 1 → primeira, cena 2 → segunda…), com uma única regra, "não
 * repetir a de trás". **Ela nunca lia o texto.** Trinta cenas, trinta telas do app, e o
 * ecrã a mostrar fatura R$ 1.240 e limite R$ 5.000 enquanto a voz dizia "mil e duzentos"
 * — que foi exatamente o que o dono apanhou a ver o vídeo.
 *
 * Quem escolhe agora é o `lib/imagens-longo.js`, que lê a narração de cada cena e a
 * lista fechada de valores do mapa. As listas antigas não foram substituídas por outras
 * listas: das 16 composições do catálogo, **três** sobreviveram à conferência de "isto
 * contradiz o que se está a dizer?", e vivem lá com o motivo de cada exclusão escrito.
 */
export { BROLL_PERMITIDO } from './lib/imagens-longo.js';

/** Transforma o guião de seis blocos na lista de cenas do vídeo. */
export function montarCenas(longo) {
  const cenas = [];
  const empurrar = (texto, meta) => {
    for (const pedaco of partirEmCenas(texto)) {
      cenas.push({ ...meta, narration: pedaco, palavras: contar(pedaco) });
    }
  };

  empurrar(longo.abertura, { bloco: 'abertura', role: 'hook', capitulo: null, parte: 'abertura' });

  /**
   * 🔴 PERCORRE AS PARTES **POSSÍVEIS**, NÃO AS TRÊS FIXAS — conserto de 04/08/2026.
   *
   * Este laço andava a percorrer `PARTES_DO_CAPITULO`, que são três: pergunta,
   * desenvolvimento e regancho. Só que nessa mesma manhã a demonstração do app deixou
   * de estar nos três capítulos e passou a viver **num só** (§35.2), como uma parte à
   * parte — e ninguém veio cá dizer isso a este ficheiro.
   * Resultado, medido no guião aprovado: **73 palavras a menos no vídeo do que no
   * guião** (860 contra 933), e as 73 eram exatamente o parágrafo em que o app faz a
   * conta. O vídeo inteiro sobre organizar dívida **nunca chegava a mostrar o app**, e
   * nada se queixava: o montador não tem como saber que uma parte lhe falta.
   * `PARTES_POSSIVEIS` está escrita pela ordem em que é falada, e uma parte que o
   * capítulo não tenha vem vazia e é ignorada pelo `empurrar`.
   */
  (longo.capitulos || []).forEach((cap, i) => {
    PARTES_POSSIVEIS.forEach((parte) => {
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

  // ⚠️ O NÚMERO DA CENA É ATRIBUÍDO ANTES DO DIRETOR DE IMAGEM, e não por arrumação:
  // é por ele que a conferência consegue dizer "a cena 14 mostra um número que não
  // está no mapa" em vez de "uma cena qualquer".
  const numeradas = cenas.map((c, i) => ({
    id: i + 1,
    ...c,
    // A duração autoral é só a rede por baixo: quem manda é o áudio medido pelo TTS.
    // Fica calculada pela MESMA velocidade que o resto do projeto usa (2,6 palavras/s).
    durationSec: +(c.palavras / 2.6).toFixed(2),
  }));

  return dirigirImagens(numeradas, longo.mapa || {});
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
  const desenhoDe = (v = {}) => {
    if (v.tipo === 'numero') return `💰 R$ ${v.valor} · ${v.rotulo}`;
    if (v.tipo === 'conta') return `🧮 A CONTA (${v.linhas.length} linhas) — o plano-revelação`;
    if (v.tipo === 'app') return `📱 o app · R$ ${v.valor}`;
    if (v.tipo === 'frase') return `🗒️  "${String(v.texto).slice(0, 34)}"`;
    if (v.tipo === 'metafora') return `🎭 ${v.fio} · estágio ${v.estagio}`;
    if (v.tipo === 'ilustracao') return `🖼️  ${v.figura}`;
    if (v.tipo === 'broll') return `🎞️  ${v.comp}`;
    return '🔤 as palavras ditas';
  };
  for (const c of cenas) {
    const marca = c.abreCapitulo ? `📖 CAP ${c.capitulo} · ${c.tituloCapitulo}` : '';
    const etiq = c.visual?.etiqueta ? ` +etiqueta R$ ${c.visual.etiqueta.valor}` : '';
    console.log(`   ${String(c.id).padStart(2)}. [${c.parte.padEnd(15)}] ${String(c.palavras).padStart(2)}p · ${desenhoDe(c.visual).padEnd(46)}${etiq} ${marca}`);
  }

  const familias = cenas.reduce((a, c) => ({ ...a, [c.visual?.tipo || '?']: (a[c.visual?.tipo || '?'] || 0) + 1 }), {});
  console.log(`\n   🎨 famílias de imagem: ${Object.entries(familias).map(([k, n]) => `${k} ${n}`).join(' · ')}`);

  const maiores = cenas.filter((c) => c.palavras > MAX_PALAVRAS_CENA);
  if (maiores.length) {
    console.log(`\n   ⚠️ ${maiores.length} cena(s) passam das ${MAX_PALAVRAS_CENA} palavras porque são UMA frase só: ${maiores.map((c) => `#${c.id} (${c.palavras})`).join(', ')}`);
  }

  /**
   * ⚠️ A CONFERÊNCIA CORRE ANTES DE SE ESCREVER FICHEIRO NENHUM.
   * Um plano com um número errado no ecrã é pior do que plano nenhum: ele passa pela
   * voz, pelo render de seis minutos e só se descobre a olhar o vídeo pronto. Aqui
   * custa zero e é imediato.
   */
  const queixas = conferirImagens(cenas, longo.mapa || {});
  if (queixas.length) {
    console.log(`\n❌ ${queixas.length} problema(s) nas imagens — nada foi escrito:\n`);
    for (const q of queixas) console.log(`   · ${q}`);
    console.log('');
    process.exit(1);
  }
  console.log('   ✅ conferência das imagens: todos os números do ecrã estão no mapa\n');

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
