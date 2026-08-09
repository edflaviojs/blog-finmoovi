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
import { dirigirImagens, conferirImagens, consertarImagens } from './lib/imagens-longo.js';

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
 * 🔴 O TETO DE PALAVRAS POR CENA — 40 → 26 em 09/08/2026, ordem do dono.
 *
 * ═══ POR QUE 40 ERA DEMAIS, MEDIDO NO VÍDEO PRONTO ═══
 * A razão (b) da versão antiga dizia *"15 segundos é o tempo máximo que uma imagem
 * parada aguenta"*. **Estava otimista, e o vídeo provou-o.** Medido no MP4:
 *
 *  · 30 cenas, **12,0 segundos de média**, e 29 delas acima de 8s;
 *  · a diferença entre quadros distantes 3 segundos DENTRO da mesma cena deu **ZERO**,
 *    duas vezes só no primeiro minuto;
 *  · e **nenhuma família escapa**: renderizando cenas isoladas, todas ficam entre 1,2 e
 *    2,3 de movimento — até a da metáfora, que é um boneco a mexer-se em tela cheia.
 *
 * ⚠️ **Foi por isto que enfeitar não resolveu.** Tentaram-se três coisas antes desta, e
 * as três foram medidas e falharam: câmara lenta, halo a respirar com anéis, e o ator
 * da metáfora ao lado do número (1,25 → 1,43, o melhor dos três). **O problema não era
 * de nenhuma família: era do formato.** Doze segundos é muito tempo para qualquer
 * imagem única, por mais bem animada que ela seja.
 *
 * ═══ POR QUE 26, E NÃO 18 — E A MEDIÇÃO QUE MUDOU A DECISÃO ═══
 * Simulado sobre o guião do piloto, com o corte a respeitar sempre o fim de frase:
 *
 * | teto | cenas | média | acima de 8s |
 * |---|---|---|---|
 * | 40 (antes) | 30 | 12,0s | **28** |
 * | **26** | **49** | **7,3s** | **22** |
 * | 18 | 66 | 5,4s | 5 |
 * | 14 | 69 | 5,2s | 5 |
 *
 * 🔴 **O 18 foi construído, renderizado e MEDIDO — e não ganhou.** Comparado o mesmo
 * minuto de vídeo, 30 cenas contra 66:
 *
 * | | 30 cenas | 66 cenas |
 * |---|---|---|
 * | momentos fortes | 7 | **9** ✅ |
 * | maior buraco sem nada | 19s | **12s** ✅ |
 * | movimento médio | **3,18** | 3,01 ❌ |
 * | tempo em movimento fraco | **43%** | 60% ❌ |
 *
 * **E a razão é boa de saber:** as cenas de `palavras` já trocavam o bloco de texto
 * 3 ou 4 vezes dentro dos 12 segundos. Cortando para 6s, cada uma passa a mostrar UM
 * bloco. Trocaram-se mudanças DENTRO da cena por mudanças ENTRE cenas, e no total deu
 * quase na mesma — **com o dobro das chamadas de voz a pagar por isso.**
 *
 * Decisão do dono, com os números à frente: **26**. Mata as cenas de 15 segundos (o
 * defeito real) sem dobrar a voz nem apagar as trocas de bloco que já funcionavam.
 *
 * ⚠️ **O corte continua SEMPRE em fim de frase**, e essa regra não se toca: cortar uma
 * frase ao meio partiria a respiração da voz, que é a coisa que este canal mais penou
 * para acertar. As cenas que ficam acima de 8s são frases longas indivisíveis.
 *
 * ⚠️ **E o `RESPIRO_SEC` teve de descer com isto.** São 49 cenas em vez de 30: a 0,35s
 * cada, o vídeo ganhava **6,7 segundos de silêncio novo** — tempo morto, que é
 * exactamente o que se estava a tentar tirar. Ver a nota em `Long.tsx`.
 *
 * ⚠️ **NADA DISTO FOI TESTADO COM A VOZ A SÉRIO.** A voz é gerada na nuvem e a que
 * existe no disco do dono é da versão de 30 cenas; a medição acima foi feita com as
 * durações ESTIMADAS. A primeira prova verdadeira é a corrida automática de sexta.
 */
const MAX_PALAVRAS_CENA = 26;

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

  /**
   * 🔴 NENHUMA CENA COM MENOS DE `MIN_PALAVRAS_CENA` — 09/08/2026, e apareceu ao baixar
   * o teto de 40 para 26.
   *
   * Com o teto alto isto nunca dava nas vistas; com ele baixo, uma frase curta no fim de
   * um parágrafo ficava sozinha e nascia uma cena de **1,1 segundo — três palavras**.
   * E isso é mau por duas razões medidas nesta casa:
   *
   *  · a transição entre cenas leva 8 fotogramas (0,27s), portanto numa cena de 1,1s
   *    **um quarto dela é transição** — a pessoa vê um piscar, não uma imagem;
   *  · o TTS gera um ficheiro por cena e cada pedaço traz **0,85s de silêncio na cauda**
   *    que tem de ser aparado (é a lição da voz frase a frase, de 04/08). Num pedaço de
   *    três palavras, a cauda é quase do tamanho da fala.
   *
   * A cura é juntar ao pedaço ANTERIOR — e ao anterior, não ao seguinte, porque o
   * pedaço curto é quase sempre o fecho de um raciocínio, não a abertura do próximo.
   *
   * ⚠️ **E junta-se para a FRENTE quando o curto é o primeiro do bloco.** Foi o caso
   * medido: *"Eu lembro direitinho."* abre o desenvolvimento do capítulo 1 e não tem
   * nada atrás para onde ir — ficava uma cena de 1,1 segundo.
   *
   * ⚠️ **E nunca se junta se o resultado passar do teto com folga.** Sem esta guarda, um
   * pedaço de 6 palavras colado a uma frase de 26 dava uma cena de **32 palavras (12,3s)**
   * — pior do que o problema que se estava a resolver. Se não couber em lado nenhum, o
   * pedaço curto fica como está: uma cena curta é melhor do que uma comprida.
   */
  const MIN_PALAVRAS_CENA = 7;
  const TETO_DA_JUNCAO = MAX_PALAVRAS_CENA + MIN_PALAVRAS_CENA;
  const juntos = [];
  for (let i = 0; i < pedacos.length; i++) {
    const pedaco = pedacos[i];
    if (contar(pedaco) >= MIN_PALAVRAS_CENA) { juntos.push(pedaco); continue; }
    const anterior = juntos[juntos.length - 1];
    if (anterior && contar(anterior) + contar(pedaco) <= TETO_DA_JUNCAO) {
      juntos[juntos.length - 1] = `${anterior} ${pedaco}`;
      continue;
    }
    const seguinte = pedacos[i + 1];
    if (seguinte && contar(seguinte) + contar(pedaco) <= TETO_DA_JUNCAO) {
      pedacos[i + 1] = `${pedaco} ${seguinte}`;
      continue;
    }
    juntos.push(pedaco);
  }
  return juntos;
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
export function montarCenas(longo, slug = null) {
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

  // ⚠️ O SLUG VAI JUNTO, e não é arrumação: as fotografias da Manus são feitas à
  // medida de UM vídeo. Sem o slug, um vídeo novo cujo texto casasse com as mesmas
  // pistas levaria as fotografias DESTE — que é a queixa nº 1 do dono outra vez.
  return dirigirImagens(numeradas, longo.mapa || {}, slug);
}

// ─── execução direta ─────────────────────────────────────────────────────────

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('youtube/montar-longo.js')) {
  const slug = String(args.slug && args.slug !== true ? args.slug : 'sair-do-vermelho');
  const longo = JSON.parse(readFileSync(join(OUTPUT_DIR, `${slug}.longo.json`), 'utf-8'));

  /**
   * ⛑️ AS IMAGENS SÃO CONSERTADAS ANTES DE SE VEREM — 09/08/2026.
   * O que mentia no ecrã é tirado aqui; a lista impressa em baixo já é a verdadeira.
   * Ver `consertarImagens` em `lib/imagens-longo.js` para a linha que separa a mentira
   * (conserta-se) do cansaço visual (passa com aviso).
   */
  const { cenas, consertos: consertosDeImagem } = consertarImagens(montarCenas(longo, slug), longo.mapa || {}, slug);
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
  /**
   * 🔴 ISTO JÁ NÃO MATA A CORRIDA — 09/08/2026, ordem do dono: *"nunca parar e não
   * gerar o vídeo"*. A corrida de 08/08 morreu aqui, com as fotografias já pagas e
   * aprovadas no disco, por causa de três queixas.
   *
   * ⚠️ **E o aviso de cima continua verdadeiro: um número errado no ecrã é pior do que
   * plano nenhum.** É por isso que ele não é TOLERADO — é CONSERTADO, lá em cima, antes
   * de qualquer coisa ser escrita. O que chega aqui já não mente; o que sobra é o vídeo
   * ficar mais pobre (três imagens iguais seguidas, um teto passado), e isso passa com
   * aviso à vista de toda a gente.
   */
  if (consertosDeImagem.length) {
    console.log(`\n⛑️  ${consertosDeImagem.length} conserto(s) nas imagens (o ecrã dizia o que não devia):\n`);
    for (const c of consertosDeImagem) console.log(`   · ${c}`);
  }
  const queixas = conferirImagens(cenas, longo.mapa || {}, slug);
  if (queixas.length) {
    console.log(`\n⚠️  ${queixas.length} queixa(s) que ficam como estão — são de riqueza visual, não de verdade:\n`);
    for (const q of queixas) console.log(`   · ${q}`);
    console.log('   (o vídeo sai à mesma; quem se emenda com isto é quem ESCOLHE as imagens, não esta corrida)');
  }
  if (!consertosDeImagem.length && !queixas.length) {
    console.log('   ✅ conferência das imagens: todos os números do ecrã estão no mapa\n');
  }
  console.log('');

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
