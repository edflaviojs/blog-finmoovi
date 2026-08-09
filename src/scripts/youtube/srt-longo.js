/**
 * AS LEGENDAS DO VÍDEO LONGO (pt/en/es) — 05/08/2026.
 *
 * ═══ 🔴 POR QUE NÃO SE REAPROVEITA O GERADOR DO SHORT, E ISTO FOI MEDIDO ═══
 *
 * A primeira ideia foi chamar o `srt-short.js` com o slug do longo. Ele lê o mesmo
 * `timing.json`, escreve os mesmos três ficheiros, e não é preciso escrever nada.
 * **Está errado, e o erro é grande o suficiente para ser pior do que não ter legenda.**
 *
 * As duas linhas do tempo não são a mesma. Medido no vídeo entregue (`sair-do-vermelho`,
 * 30 cenas, 337,70 s), cena a cena:
 *
 * | cena | onde a fala começa a sério | onde o gerador do Short a punha | erro |
 * |---|---|---|---|
 * | 1  | 0,90 s   | 0,00 s   | **−0,90 s** |
 * | 5  | 46,83 s  | 43,73 s  | **−3,10 s** |
 * | 15 | 160,90 s | 156,03 s | **−4,87 s** |
 * | 20 | 221,07 s | 214,03 s | **−7,03 s** |
 * | 30 | 332,53 s | 326,33 s | **−6,20 s** |
 *
 * > **Erro máximo 7,13 s, erro médio 4,74 s.** A legenda apareceria antes de a frase ser
 * > dita, do princípio ao fim do vídeo. É desfazer, multiplicado por dez, o trabalho da
 * > §37.1 — que brigou por **0,47 s** de sincronia.
 *
 * São QUATRO diferenças, e cada uma sozinha já chegava:
 *   1. o respiro entre cenas é **0,35 s** no longo e **0,7 s** no Short;
 *   2. o Short sobrepõe **8 fotogramas** de transição por cena; o longo **não tem
 *      transições nenhumas** — as cenas são coladas;
 *   3. a voz do longo entra aos **27 fotogramas** (0,9 s), e o gerador do Short lê isso do
 *      campo `intro` do roteiro, que o guião do longo não tem — logo lia zero;
 *   4. 🔴 **os CARTÕES DE CAPÍTULO.** O longo mete **78 fotogramas (2,6 s) de cartão**
 *      antes de cada capítulo, e são três. O gerador do Short não sabe que eles existem.
 *
 * ⚠️ **E é por isso que ele não foi tocado.** Ensinar-lhe o longo obrigava a pôr "às vezes
 * isto, às vezes aquilo" no ficheiro que legenda os Shorts todos os dias — e é a lição da
 * §35.1: um caminho com dois donos parte-se no dono que estiver mais distraído.
 *
 * ⚠️ **ESPELHAMENTO — leia antes de mexer nos números aqui em baixo.** Eles são os mesmos
 * de `youtube-render/src/Long.tsx` (`VOZ_ENTRA_FRAMES`, `RESPIRO_SEC`), de
 * `longo/telas.tsx` (`CARTAO_CAPITULO_FRAMES`) e de `render-longo.mjs`. Mudar num sítio
 * sem mudar nos outros dessincroniza a legenda — e a defesa é a mesma de sempre:
 * **conferir o RESULTADO no vídeo renderizado**, nunca o cálculo.
 * Há uma prova automática que compara esta conta com a do render (`validar-publicacao-longo.js`).
 *
 * Uso: node src/scripts/youtube/srt-longo.js --slug=sair-do-vermelho
 *      node src/scripts/youtube/srt-longo.js --slug=... --so-pt   (sem gastar IA)
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { generateText } from '../apis/kie-ai.js';
/**
 * ⚠️ IMPORTADO DO SHORT DE PROPÓSITO, E NÃO COPIADO.
 * Estas quatro peças são mecânicas — formatar um tempo, juntar palavras em blocos
 * legíveis, espalhar palavras traduzidas num intervalo, e escrever o ficheiro. Não sabem
 * nada da linha do tempo, que é a única coisa que difere entre os dois formatos.
 * `srt-short.js` só corre sozinho quando é chamado pelo nome, portanto importar não é
 * tocar — é a mesma decisão já tomada com `limparFala` em `roteiro-longo.js`.
 */
import { fmtTime, chunkCues, distributeWords, toSrt } from './srt-short.js';

const AQUI = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(AQUI, 'output');
const AUDIO_ROOT = join(process.cwd(), 'youtube-render', 'public', 'audio');
const ROTEIRO_DIR = join(process.cwd(), 'youtube-render', 'public', 'roteiro');

const FPS = 30;
/** ⚠️ ESPELHADOS de `youtube-render/src/Long.tsx`. Ver o aviso no cabeçalho. */
export const VOZ_ENTRA_FRAMES = 27;
/**
 * 🔴 0,35 → 0,21 em 09/08/2026 — e ESTE ficheiro foi o TERCEIRO sítio, descoberto por
 * uma prova a falhar, não por eu me lembrar dele.
 *
 * O mesmo número vive em `Long.tsx` (o vídeo), em `descricao-longo.js` (os capítulos do
 * YouTube) e aqui (as legendas). Mudei os dois primeiros e **esqueci este** — e a prova
 * de mesa apanhou-o na hora: *"as duas contas nunca se afastam mais do que meio segundo
 * — afastaram-se 1,253s"*.
 *
 * ⚠️ **É o modo de falha que o cabeçalho deste ficheiro já avisava**, e mesmo assim
 * aconteceu. Se um dia isto voltar a divergir, a legenda do YouTube fica dessincronizada
 * da voz e **ninguém se queixa** — o vídeo sai, o YouTube aceita, e só se vê a ver.
 */
export const RESPIRO_SEC = 0.21;
/** ⚠️ ESPELHADO de `CARTAO_CAPITULO_FRAMES` em `youtube-render/src/longo/telas.tsx`. */
export const CARTAO_CAPITULO_FRAMES = 78;

const args = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => {
    const [k, ...v] = a.slice(2).split('=');
    return [k, v.join('=') || true];
  }),
);

/**
 * O INSTANTE EM QUE CADA CENA COMEÇA, em segundos, na linha do tempo do vídeo final.
 *
 * É a MESMA conta de `linhaDoTempo` em `Long.tsx` e da colagem em `render-longo.mjs`:
 * o cartão de capítulo ocupa lugar PRÓPRIO antes da cena que abre o capítulo, e a última
 * cena não leva respiro (não há nada a seguir para respirar).
 *
 * @param {{scenes:Array<{id:any,abreCapitulo?:boolean,capitulo?:any,durationSec:number}>}} plano
 * @param {{scenes:Array<{id:any,durationSec:number}>}|null} timing a duração MEDIDA da voz
 * @returns {{inicios:number[], fimDoConteudo:number}} em segundos
 */
export function iniciosDasCenas(plano, timing) {
  const medido = (id) => timing?.scenes?.find((s) => String(s.id) === String(id))?.durationSec;
  const cenas = plano.scenes || [];
  const frames = cenas.map((c, i) => {
    const falada = medido(c.id) || c.durationSec;
    const comRespiro = i < cenas.length - 1 ? falada + RESPIRO_SEC : falada;
    return Math.max(1, Math.round(comRespiro * FPS));
  });

  const inicios = [];
  let acc = 0;
  cenas.forEach((c, i) => {
    if (c.abreCapitulo && c.capitulo) acc += CARTAO_CAPITULO_FRAMES;
    inicios.push((VOZ_ENTRA_FRAMES + acc) / FPS);
    acc += frames[i];
  });
  return { inicios, fimDoConteudo: (VOZ_ENTRA_FRAMES + acc) / FPS };
}

/**
 * ⚠️ O PEDIDO DE TRADUÇÃO É PRÓPRIO, E NÃO É TEIMOSIA.
 * O do Short diz, com estas palavras, *"é legenda de vídeo curto de finanças"* — e este
 * vídeo tem cinco minutos e meio, com capítulos e uma história contada na primeira pessoa.
 * Dar ao tradutor a descrição errada do que ele está a traduzir é a mesma família de
 * defeito que este repositório já apanhou vinte vezes: **o pedido a descrever uma coisa
 * que não é a que está à frente dele.**
 */
const ETIQUETA = { en: 'inglês (en-US)', es: 'espanhol (es-ES)' };
async function traduzir(texto, lingua) {
  const pedido = `Traduza para ${ETIQUETA[lingua]} o trecho de narração abaixo. É a legenda de um vídeo de finanças pessoais de cerca de seis minutos, narrado na primeira pessoa, em tom coloquial e direto — não é um anúncio nem um texto formal. Mantenha o tom e o comprimento aproximado. Responda APENAS com a tradução, sem aspas nem comentários.\n\n${texto}`;
  const saida = await generateText(pedido, { maxTokens: 500, temperature: 0.3 });
  return String(saida || '').trim().replace(/^["']|["']$/g, '');
}

/**
 * ⚠️ UMA CENA QUE FALHA NÃO DEITA FORA A LÍNGUA INTEIRA.
 * No Short são 6 cenas e o gerador embrulha o ciclo todo num só resguardo: uma falha e a
 * língua toda desaparece. Aqui são **30 cenas** — cinco vezes mais oportunidades de uma
 * chamada falhar —, e perder 30 traduções por causa da 29ª seria absurdo. Cada cena tenta
 * duas vezes; a que não passar fica de fora **dessa cena**, e o resto da legenda segue.
 */
async function traduzirComTeimosia(texto, lingua) {
  for (let tentativa = 1; tentativa <= 2; tentativa++) {
    try {
      const t = await traduzir(texto, lingua);
      if (t) return t;
    } catch (err) {
      if (tentativa === 2) throw err;
    }
  }
  return '';
}

export async function gerarLegendas(slug, { soPt = false, registar = console.log } = {}) {
  const caminhoPlano = join(ROTEIRO_DIR, `${slug}.json`);
  if (!existsSync(caminhoPlano)) throw new Error(`não há guião montado para "${slug}" — corra o montador antes`);
  const plano = JSON.parse(readFileSync(caminhoPlano, 'utf-8'));

  const pasta = join(AUDIO_ROOT, slug);
  const caminhoTiming = join(pasta, 'timing.json');
  if (!existsSync(caminhoTiming)) throw new Error(`não há voz gerada para "${slug}" — corra a voz antes`);
  const timing = JSON.parse(readFileSync(caminhoTiming, 'utf-8'));

  const { inicios } = iniciosDasCenas(plano, timing);
  const feitos = [];

  // ── PORTUGUÊS — sai dos tempos MEDIDOS palavra a palavra, e não custa nada ──
  const palavrasPt = [];
  plano.scenes.forEach((cena, i) => {
    const medida = timing.scenes.find((s) => String(s.id) === String(cena.id));
    for (const p of medida?.words || []) {
      palavrasPt.push({ word: p.word, start: inicios[i] + p.start, end: inicios[i] + p.end });
    }
  });
  if (!palavrasPt.length) throw new Error('a voz não trouxe tempos de palavra — a legenda sairia inventada');
  const blocosPt = chunkCues(palavrasPt);
  writeFileSync(join(pasta, `${slug}.pt.srt`), toSrt(blocosPt), 'utf-8');
  feitos.push('pt');
  registar(`✓ pt — ${blocosPt.length} blocos · a última fala acaba aos ${fmtTime(palavrasPt[palavrasPt.length - 1].end)}`);

  if (soPt) return { feitos, blocosPt: blocosPt.length };

  // ── INGLÊS E ESPANHOL — traduzidas cena a cena, dentro do intervalo falado ──
  for (const lingua of ['en', 'es']) {
    const palavras = [];
    let falhadas = 0;
    for (let i = 0; i < plano.scenes.length; i++) {
      const cena = plano.scenes[i];
      const medida = timing.scenes.find((s) => String(s.id) === String(cena.id));
      const ditas = medida?.words || [];
      if (!ditas.length || !cena.narration) continue;
      const comeca = inicios[i] + ditas[0].start;
      const acaba = inicios[i] + ditas[ditas.length - 1].end;
      try {
        const traduzida = await traduzirComTeimosia(cena.narration, lingua);
        if (!traduzida) { falhadas++; continue; }
        distributeWords(traduzida, comeca, acaba).forEach((p) => palavras.push(p));
      } catch {
        falhadas++;
      }
    }
    if (!palavras.length) {
      registar(`⚠️ ${lingua} — nenhuma cena traduziu; a faixa não é escrita (é melhor não existir do que existir vazia)`);
      continue;
    }
    const blocos = chunkCues(palavras);
    writeFileSync(join(pasta, `${slug}.${lingua}.srt`), toSrt(blocos), 'utf-8');
    feitos.push(lingua);
    registar(`✓ ${lingua} — ${blocos.length} blocos${falhadas ? ` (⚠️ ${falhadas} de ${plano.scenes.length} cenas ficaram de fora)` : ''}`);
  }

  registar(`📄 legendas em ${pasta}`);
  return { feitos };
}

// ─── execução direta ─────────────────────────────────────────────────────────
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('youtube/srt-longo.js')) {
  const slug = String(args.slug && args.slug !== true ? args.slug : 'sair-do-vermelho');
  gerarLegendas(slug, { soPt: Boolean(args['so-pt']) })
    .catch((err) => { console.error(`\n❌ ${err.message}\n`); process.exit(1); });
}

export { OUTPUT_DIR };
