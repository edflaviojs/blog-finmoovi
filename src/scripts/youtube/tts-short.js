/**
 * Gerador de ÁUDIO + TIMING de um Short (F1.2 — IMPLEMENTACAO20).
 *
 * Lê o roteiro (`output/<slug>.script.json`), e para CADA cena:
 *   1. sintetiza a narração (tts-client: edge-tts primário → piper → azure);
 *   2. roda o Whisper (Together) p/ obter o start/end REAL de cada palavra;
 *   3. ALINHA as palavras do ROTEIRO (fonte de verdade do texto exibido) aos
 *      timestamps do Whisper — assim o karaokê/ícones/SFX passam a usar o tempo
 *      real da fala, no lugar do timing sintético (layoutWords em captions.tsx).
 *
 * Saída:
 *   - áudio por cena → `youtube-render/public/audio/<slug>/scene-<id>.<ext>` (gitignored)
 *   - `youtube-render/public/audio/<slug>/timing.json` com, por cena:
 *       { id, role, narration, audioFile, durationSec (medido), words:[{word,start,end}] }
 *
 * O provedor de voz é escolhido UMA vez por vídeo (não mistura vozes). As chaves
 * (TOGETHER_TTS_API_KEY p/ Whisper) vivem como secrets do GitHub — rodar em CI ou
 * com a env local. O endpoint do Edge pode dar throttle em geração local em lote;
 * em produção (Actions, espaçado) funciona normal.
 *
 * Uso: node --import tsx src/scripts/youtube/tts-short.js --slug=juros-compostos
 */

import { synthesizeSpeech, transcribeWords, pickProvider, getTtsProviders, warmUpTts } from './lib/tts-client.js';
import { planoDeLeitura } from './lib/prosodia.js';
import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync, readdirSync, mkdtempSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { tmpdir } from 'os';
import { execFileSync } from 'child_process';

const OUTPUT_DIR = join(dirname(fileURLToPath(import.meta.url)), 'output');
const AUDIO_ROOT = join(process.cwd(), 'youtube-render', 'public', 'audio');
const TAIL_PAD = 0.35; // seg. de silêncio somados ao fim da fala p/ a cena respirar

// ── Sanidade do áudio por cena (F1.5) ──
// O edge-tts às vezes fecha o stream cedo SEM lançar erro — o buffer sai com bytes
// suficientes p/ passar nos checks de tamanho do tts-client, mas a fala real fica
// truncada (ex.: 0.35s p/ uma narração de 26 palavras). Isso só aparece depois, no
// Whisper (speechEnd curto demais) — daí a validação viver aqui, não no tts-client.
const MAX_ATTEMPTS = 4; // 1ª tentativa + 3 retries
// Backoffs MAIORES p/ segurar a voz do Antonio (edge) na cena 1: as evidências de
// CI mostram o edge se recuperando ~15-20s depois do 1º contato. Com [5s,12s,25s], a
// 3ª tentativa do edge acontece por volta de t≈17s (0 → +5s → +12s) — dentro da
// janela de recuperação — então ela costuma dar certo e o vídeo mantém o Antonio,
// com o piper ainda como rede de segurança na 4ª tentativa (t≈42s). Aquecimento
// segue igual.
const RETRY_BACKOFF_MS = [5000, 12000, 25000]; // aplicado antes das tentativas 2, 3 e 4
const SCENE_GAP_MS = 700; // espaçamento entre cenas p/ não estourar o burst-throttle do edge-tts
const WORDS_PER_SEC_FAST = 6; // pt-BR falado rápido demais — piso generoso (folga)
const MIN_FLOOR_SEC = 1.0; // piso absoluto, só p/ narrações com >= 4 palavras

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Duração mínima esperada p/ não considerar o áudio "quebrado" (stub/truncado).
// Narrações bem curtas (< 4 palavras) ficam isentas do piso de 1s — uma cena de
// 1-2 palavras pode legitimamente durar menos que isso.
export function minExpectedDurationSec(wordCount) {
  const bare = wordCount / WORDS_PER_SEC_FAST;
  return wordCount >= 4 ? Math.max(bare, MIN_FLOOR_SEC) : bare;
}

export function isAudioBroken(measuredDurationSec, wordCount) {
  return measuredDurationSec < minExpectedDurationSec(wordCount);
}

const args = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => {
    const [k, ...v] = a.slice(2).split('=');
    return [k, v.join('=') || true];
  }),
);

// Remove os pontos de milhar de um número pt-BR ("1.500" → "1500"), preservando a
// vírgula decimal ("3,2" → "3,2"). Em pt-BR o decimal é vírgula, então TODO ponto
// dentro de um número é separador de milhar e pode ser removido com segurança.
// "1500" é lido corretamente pelo TTS ("mil e quinhentos"), sem o risco de o
// leitor tropeçar no ponto (mais confiável que forçar a grafia por extenso).
function stripThousands(num) {
  return String(num).replace(/\./g, '');
}

// Normaliza VALORES/NÚMEROS p/ a forma FALADA em pt-BR natural. Vale p/ TODOS os
// provedores (o edge até lê "R$" nativamente, mas a forma falada é igualmente
// correta lá — normalizamos de forma uniforme p/ consistência entre vozes).
// Regras ORDENADAS (a 1ª que casar vence p/ cada trecho):
//   R$ 50 / R$50            → 50 reais
//   R$ 3,2 milhões          → 3,2 milhões de reais   (milhão/bilhão/trilhão → "de reais")
//   R$ 3 mil                → 3 mil reais            ("mil" não leva "de")
//   R$ 1.500                → 1500 reais             (tira pontos de milhar)
//   75%                     → 75 por cento
//   3x / 3×                 → 3 vezes
// Importante: o número vem ANTES de "reais" (ordem natural que o dono pediu) —
// "R$ 50 podem virar R$ 75" → "50 reais podem virar 75 reais".
// Número falado: começa e TERMINA em dígito. `[\d.,]+` engolia o separador final —
// em "R$ 100, 24 meses" capturava "100," e produzia "100, reais 24 meses", ou seja
// a palavra "reais" saltava para DEPOIS da vírgula e a voz dizia "cem, reais vinte
// e quatro meses". Medido em 31/07 no roteiro `tesouro-direto-100`.
const NUM = String.raw`\d(?:[\d.,]*\d)?`;

export function normalizeSpoken(text) {
  let out = String(text);
  // 1) R$ <número> <escala grande> → "<número> <escala> de reais" (milhão/bilhão/trilhão).
  out = out.replace(
    new RegExp(String.raw`R\$\s*(${NUM})\s*(milhões|milhão|bilhões|bilhão|trilhões|trilhão)`, 'gi'),
    (_, num, scale) => `${stripThousands(num)} ${scale} de reais`,
  );
  // 1-bis) R$ <número>k → "<número> mil reais". O "k" de milhar é atalho de escrita
  // que o modelo usa ("R$ 2,68k"); sem esta regra o "k" ficava ÓRFÃO colado no
  // resultado da regra 3 e a voz tentava dizer "2,68 reaisk" (medido em 31/07).
  out = out.replace(
    new RegExp(String.raw`R\$\s*(${NUM})\s*k\b`, 'gi'),
    (_, num) => `${stripThousands(num)} mil reais`,
  );
  // 2) R$ <número> mil → "<número> mil reais" ("mil" não leva "de reais").
  out = out.replace(
    new RegExp(String.raw`R\$\s*(${NUM})\s*mil\b`, 'gi'),
    (_, num) => `${stripThousands(num)} mil reais`,
  );
  // 3) R$ <número> simples → "<número> reais".
  out = out.replace(
    new RegExp(String.raw`R\$\s*(${NUM})`, 'g'),
    (_, num) => `${stripThousands(num)} reais`,
  );
  // 4) <número>% → "<número> por cento".
  out = out.replace(
    new RegExp(String.raw`(${NUM})\s*%`, 'g'),
    (_, num) => `${stripThousands(num)} por cento`,
  );
  // 5) <número>x / <número>× → "<número> vezes" (não casa "3x4"/dimensões).
  out = out.replace(
    /(\d+)\s*[x×](?![a-z0-9])/gi,
    (_, num) => `${num} vezes`,
  );
  return out;
}

// Correções de PRONÚNCIA aplicadas só ao texto que vai pro TTS (a legenda/roteiro
// e o SRT mantêm a grafia real; o alinhamento do Whisper roda contra a narração
// ORIGINAL e o casamento fuzzy absorve estas trocas, como já absorvia "Fin Múvi").
// Recebe o provedor-alvo p/ aplicar respellings específicos do Piper.
//   - Números/moeda: normalizeSpoken() em TODOS os provedores.
//   - "FinMoovi": o edge lê "fin-moví"; "Fin Múvi" corrige. No Piper isso sai
//     apressado/embolado ("Finmúvi"), então usamos "Fin, Múvi" — a vírgula insere
//     uma batida que separa as sílabas.
//   - "controle" (só Piper): o faber lê "contróle" (ó aberto); "contrôle" (ô com
//     circunflexo = ô fechado em pt) sinaliza a vogal certa. Best-effort — o
//     binário do Piper não roda localmente por padrão; marcado p/ validação em CI.
export function pronounce(text, provider) {
  let out = normalizeSpoken(text);
  const finForm = provider === 'piper' ? 'Fin, Múvi' : 'Fin Múvi';
  out = out.replace(/finmoovi/gi, finForm);
  if (provider === 'piper') {
    out = out.replace(/controle/gi, (m) =>
      (m[0] === m[0].toUpperCase() ? 'C' : 'c') + 'ontrôle',
    );
  }
  return out;
}

// Normaliza p/ comparar palavra do roteiro × palavra do Whisper (sem acento/pontuação/caixa).
export function normalizeWord(w) {
  return String(w).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
}

// Distribui as palavras uniformemente (por peso de letras) numa duração — fallback
// quando o alinhamento com o Whisper casa pouco (mantém o timing sempre utilizável).
function proportional(words, durationSec) {
  const weights = words.map((w) => normalizeWord(w).length + 2);
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  let acc = 0;
  return words.map((word, i) => {
    const dur = (weights[i] / total) * durationSec;
    const t = { word, start: +acc.toFixed(3), end: +(acc + dur).toFixed(3) };
    acc += dur;
    return t;
  });
}

// Preenche os buracos entre âncoras (palavras casadas) por distribuição proporcional,
// garantindo tempos monotônicos não-decrescentes.
function fillGaps(words, anchors, durationSec) {
  const idxs = anchors.map((a, i) => (a ? i : -1)).filter((i) => i >= 0);
  const out = words.map((word) => ({ word, start: 0, end: 0 }));

  const distribute = (from, to, lo, hi) => {
    // preenche words[from..to] (inclusive) dentro de [lo, hi] por peso
    const slice = [];
    for (let i = from; i <= to; i++) slice.push(i);
    const weights = slice.map((i) => normalizeWord(words[i]).length + 2);
    const total = weights.reduce((a, b) => a + b, 0) || 1;
    let acc = lo;
    slice.forEach((i, k) => {
      const dur = (weights[k] / total) * (hi - lo);
      out[i] = { word: words[i], start: +acc.toFixed(3), end: +(acc + dur).toFixed(3) };
      acc += dur;
    });
  };

  // antes da 1ª âncora
  if (idxs[0] > 0) distribute(0, idxs[0] - 1, 0, anchors[idxs[0]].start);
  // âncoras + buracos entre elas
  for (let a = 0; a < idxs.length; a++) {
    const i = idxs[a];
    out[i] = { word: words[i], start: +anchors[i].start.toFixed(3), end: +anchors[i].end.toFixed(3) };
    const next = idxs[a + 1];
    if (next != null && next > i + 1) distribute(i + 1, next - 1, anchors[i].end, anchors[next].start);
  }
  // depois da última âncora
  const last = idxs[idxs.length - 1];
  if (last < words.length - 1) distribute(last + 1, words.length - 1, anchors[last].end, durationSec);

  // monotonicidade defensiva
  for (let i = 1; i < out.length; i++) {
    if (out[i].start < out[i - 1].start) out[i].start = out[i - 1].start;
    if (out[i].end < out[i].start) out[i].end = out[i].start;
  }
  return out;
}

/**
 * Alinha as palavras do roteiro aos timestamps do Whisper.
 * @param {string} narration  texto do roteiro (fonte de verdade)
 * @param {{word,start,end}[]} whisperWords
 * @param {number} durationSec  duração medida da fala (p/ escalar buracos/fallback)
 * @returns {{word,start,end}[]}
 */
export function alignWords(narration, whisperWords, durationSec) {
  const words = narration.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const anchors = new Array(words.length).fill(null);
  let wi = 0;
  for (let ri = 0; ri < words.length; ri++) {
    const rn = normalizeWord(words[ri]);
    if (!rn) continue;
    for (let k = wi; k < Math.min(whisperWords.length, wi + 6); k++) {
      if (normalizeWord(whisperWords[k].word) === rn) {
        anchors[ri] = { start: whisperWords[k].start, end: whisperWords[k].end };
        wi = k + 1;
        break;
      }
    }
  }
  const withLetters = words.filter((w) => normalizeWord(w)).length;
  const matched = anchors.filter(Boolean).length;
  if (withLetters === 0 || matched / withLetters < 0.5) {
    return proportional(words, durationSec);
  }
  return fillGaps(words, anchors, durationSec);
}

function readScript(slug) {
  const path = join(OUTPUT_DIR, `${slug}.script.json`);
  if (!existsSync(path)) throw new Error(`roteiro não encontrado: ${path}`);
  return JSON.parse(readFileSync(path, 'utf-8'));
}

/**
 * DURAÇÃO REAL DO ÁUDIO (31/07/2026) — o conserto da dessincronia.
 *
 * Quando o Whisper devolve palavras SEM tempo, a duração da cena caía para
 * `scene.durationSec` — a duração que o modelo ESCREVEU no roteiro, que é um
 * palpite. Se o áudio real tiver outra duração, tudo o que vem depois desloca:
 * foi exatamente o que o dono viu no vídeo SZSGAxqmmm0 ("o início até que está,
 * mas depois fica totalmente dessincronizado").
 *
 * Ordem de tentativa, da mais barata para a mais cara:
 *   1. cabeçalho WAV — aritmética pura, sem I/O nem processo (cobre o piper);
 *   2. `ffprobe` — cobre MP3 do edge-tts (o runner ubuntu do Actions já o traz);
 *   3. null → quem chama decide (hoje: cai na duração do roteiro, como antes).
 * Nunca lança: medição é best-effort, não pode derrubar o vídeo do dia.
 */
/**
 * O MEDIDOR DE VOZ LOCAL — `faster-whisper`, sem chave e sem rede (04/08/2026).
 *
 * Devolve `[{word,start,end}]` ou `null` se não estiver instalado. **Nunca lança**: é
 * um reforço, não uma dependência, e o robô diário não pode cair por causa dele.
 *
 * ⚠️ O PYTHON DO `PATH` NESTA MÁQUINA NÃO SERVE — é o atalho da Microsoft Store, que
 * abre a loja em vez de correr. Por isso procura-se primeiro a instalação real do
 * `winget` e só depois se confia no PATH (numa máquina Linux, o segundo é o que vale).
 */
export async function transcreverLocalmente(audio, ext) {
  const acharPython = () => {
    const local = process.env.LOCALAPPDATA;
    if (local) {
      const base = join(local, 'Programs', 'Python');
      if (existsSync(base)) {
        for (const v of readdirSync(base).filter((d) => /^Python3\d+$/.test(d)).sort().reverse()) {
          const exe = join(base, v, 'python.exe');
          if (existsSync(exe)) return exe;
        }
      }
    }
    return process.env.PYTHON || 'python3';
  };

  let ficheiro;
  try {
    const pasta = mkdtempSync(join(tmpdir(), 'fm-voz-'));
    ficheiro = join(pasta, `cena.${ext || 'mp3'}`);
    writeFileSync(ficheiro, audio);
    const script = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'scripts', 'transcrever-local.py');
    if (!existsSync(script)) return null;
    const saida = execFileSync(acharPython(), [script, ficheiro], {
      encoding: 'utf-8',
      maxBuffer: 32 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 180000,
    });
    const porFicheiro = JSON.parse(saida);
    const palavras = Object.values(porFicheiro)[0] || [];
    return palavras.length ? palavras : null;
  } catch {
    return null; // não instalado, ou falhou — segue-se a rede de sempre
  } finally {
    try { if (ficheiro) unlinkSync(ficheiro); } catch { /* a pasta temporária fica */ }
  }
}

export function medirDuracaoAudio(audio, ext) {
  // 1) WAV: procura os chunks `fmt ` (taxa/canais/bits) e `data` (tamanho).
  try {
    if (audio.length > 44 && audio.toString('ascii', 0, 4) === 'RIFF' && audio.toString('ascii', 8, 12) === 'WAVE') {
      let taxa = 0, canais = 0, bits = 0, bytesDados = 0;
      let off = 12;
      while (off + 8 <= audio.length) {
        const id = audio.toString('ascii', off, off + 4);
        const tam = audio.readUInt32LE(off + 4);
        if (id === 'fmt ' && off + 24 <= audio.length) {
          canais = audio.readUInt16LE(off + 10);
          taxa = audio.readUInt32LE(off + 12);
          bits = audio.readUInt16LE(off + 22);
        } else if (id === 'data') {
          bytesDados = Math.min(tam, audio.length - (off + 8));
          break;
        }
        off += 8 + tam + (tam % 2); // chunks têm padding para tamanho par
      }
      const bytesPorSegundo = taxa * canais * (bits / 8);
      if (bytesDados > 0 && bytesPorSegundo > 0) {
        return +(bytesDados / bytesPorSegundo).toFixed(3);
      }
    }
  } catch { /* cabeçalho inesperado → tenta o ffprobe */ }

  // 2) ffprobe sobre um arquivo temporário.
  let tmp;
  try {
    tmp = join(tmpdir(), `finmoovi-dur-${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext || 'mp3'}`);
    writeFileSync(tmp, audio);
    const saida = execFileSync(
      'ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', tmp],
      { encoding: 'utf-8', timeout: 15000 },
    );
    const seg = Number(String(saida).trim());
    if (Number.isFinite(seg) && seg > 0) return +seg.toFixed(3);
  } catch { /* sem ffprobe no PATH, ou arquivo ilegível */ }
  finally {
    try { if (tmp) unlinkSync(tmp); } catch { /* temp já removido */ }
  }

  return null;
}

// ── Síntese + validação de UMA cena (F1.5) ──
// Extraído do loop principal p/ ser reaproveitado na re-síntese de "voz única"
// (Fix 2): mesma lógica de tentativas/validação/backoff, só muda QUAL provedor
// pedir em cada tentativa (via `providerForAttempt(attempt)`).
/**
 * ═══ A INTENÇÃO DA VOZ (04/08/2026) ═══
 *
 * O dono: *"temos que passar um sentimento pro locutor… ele tem que entender as
 * respirações, as vírgulas, pontos. Para não deixar nada mecanizado."*
 * O texto seguia daqui para o motor como texto simples — e texto simples lê-se com a
 * mesma cara do princípio ao fim. O `lib/prosodia.js` traduz a pontuação e o papel de
 * cada frase em marcas de intenção. Ver lá as três decisões de desenho.
 *
 * ⚠️ DUAS TRAVAS, E AS DUAS SÃO OBRIGATÓRIAS:
 *
 * 1. **SÓ NO `edge`.** O `piper` é offline e lê texto puro: mandar-lhe SSML fá-lo dizer
 *    *"break time 320 milissegundos"* em voz alta, no vídeo, à frente de toda a gente.
 *    O `azure` aceitaria, mas nunca foi provado aqui — e uma trava não se abre por
 *    suposição.
 * 2. **SÓ ONDE FOI PEDIDO.** Por omissão está DESLIGADA, portanto o Short diário
 *    continua exatamente como estava. Quem a liga é o vídeo longo, pelo `formato` que
 *    o montador escreve no ficheiro do guião.
 */
let INTENCAO_LIGADA = false;

export function ligarIntencaoDaVoz(ligar) {
  INTENCAO_LIGADA = Boolean(ligar);
}

/**
 * 🔴 APARA O SILÊNCIO DAS PONTAS DE CADA PEDAÇO — sem isto, a intenção sai ao contrário.
 *
 * Medido no motor real: **cada** frase sintetizada volta com **0,19s de silêncio à
 * frente e 0,85s atrás**. Colando pedaço + pausa + pedaço, a pausa que se ouve é
 * 0,85 + a minha + 0,19 ≈ **1,3 segundos** — medi 1,395s onde tinha pedido 0,34s.
 * Um segundo e meio entre duas frases não é uma respiração, é uma hesitação: o locutor
 * ficava a soar inseguro, que é pior do que soar mecânico.
 *
 * Aparadas as pontas, a pausa que se ouve passa a ser exatamente a que está no plano.
 * ⚠️ Ficam 40ms de guarda em cada ponta: a -45 dB, o começo de um "p" ou de um "t" é
 * quase silêncio, e cortar rente comia o princípio da palavra.
 */
function apararSilencio(origem, destino) {
  const trim = 'silenceremove=start_periods=1:start_duration=0.04:start_threshold=-45dB:detection=peak';
  execFileSync('ffmpeg', [
    '-v', 'error', '-y', '-i', origem,
    '-af', `${trim},areverse,${trim},areverse`,
    '-c:a', 'libmp3lame', '-b:a', '48k', '-ar', '24000', '-ac', '1',
    destino,
  ], { stdio: ['ignore', 'ignore', 'ignore'] });
}

/** O silêncio entre os pedaços, em mp3 do MESMO formato que o edge devolve. */
function silencioMp3(ms, destino) {
  execFileSync('ffmpeg', [
    '-v', 'error', '-y',
    '-f', 'lavfi', '-i', 'anullsrc=r=24000:cl=mono',
    '-t', String(Math.max(0.02, ms / 1000)),
    '-c:a', 'libmp3lame', '-b:a', '48k', '-ar', '24000', '-ac', '1',
    destino,
  ], { stdio: ['ignore', 'ignore', 'ignore'] });
}

/**
 * ═══ A VOZ COM INTENÇÃO — frase a frase, com silêncio real pelo meio ═══
 *
 * Devolve o áudio da cena inteira, ou `null` se alguma coisa correr mal — e nesse caso
 * quem chama volta ao caminho de sempre. **Nunca lança.**
 *
 * ⚠️ POR QUE FRASE A FRASE, E NÃO MARCAS NO TEXTO: está medido no `lib/prosodia.js` que
 * o ponto de leitura gratuito do Edge **recusa qualquer SSML por dentro** — quatro
 * variantes testadas, quatro ligações fechadas, e o mesmo texto puro a passar. O que ele
 * aceita é o ritmo do pedido inteiro. Logo: um pedido por frase.
 *
 * ⚠️ E ISTO CUSTA PEDIDOS. Uma cena de três frases são três ligações em vez de uma; no
 * guião inteiro, 77 em vez de 30. Por isso há um espaçamento entre elas (o motor do Edge
 * castiga rajadas — é a razão do `SCENE_GAP_MS` que já existia) e por isso isto só corre
 * no vídeo longo, que é semanal. O Short diário continua a fazer um pedido por cena.
 */
const GAP_ENTRE_FRASES_MS = 450;

async function sintetizarComIntencao(narracao, provedor) {
  const plano = planoDeLeitura(narracao);
  if (plano.length < 2) return null; // uma frase só: não há nada a ganhar

  let pasta;
  try {
    pasta = mkdtempSync(join(tmpdir(), 'fm-intencao-'));
    const lista = [];
    let voz = null;

    for (const [i, pedaco] of plano.entries()) {
      const r = await synthesizeSpeech(pedaco.texto, {
        providerName: provedor,
        prosody: { rate: pedaco.rate, pitch: pedaco.pitch },
      });
      voz = voz || r.voice;
      const bruto = join(pasta, `b${String(i).padStart(2, '0')}.mp3`);
      const f = join(pasta, `p${String(i).padStart(2, '0')}.mp3`);
      writeFileSync(bruto, r.audio);
      apararSilencio(bruto, f);
      lista.push(f);
      if (pedaco.pausaMs > 0) {
        const s = join(pasta, `s${String(i).padStart(2, '0')}.mp3`);
        silencioMp3(pedaco.pausaMs, s);
        lista.push(s);
      }
      if (i < plano.length - 1) await sleep(GAP_ENTRE_FRASES_MS);
    }

    const alinhavo = join(pasta, 'lista.txt');
    writeFileSync(alinhavo, lista.map((f) => `file '${f.replace(/\\/g, '/')}'`).join('\n'), 'utf-8');
    const saida = join(pasta, 'cena.mp3');
    // ⚠️ RECODIFICA-SE em vez de `-c copy`: colar mp3 sem recodificar só funciona se
    // todos os pedaços tiverem exatamente os mesmos parâmetros, e um dia em que o motor
    // devolva outro bitrate isto sairia com estalos. Treze segundos de fala recodificam
    // num instante, e o formato fica garantido igual ao de sempre.
    execFileSync('ffmpeg', [
      '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', alinhavo,
      '-c:a', 'libmp3lame', '-b:a', '48k', '-ar', '24000', '-ac', '1', saida,
    ], { stdio: ['ignore', 'ignore', 'ignore'] });

    const audio = readFileSync(saida);
    return audio.length > 3000 ? { audio, ext: 'mp3', voice: voz, pedacos: plano.length } : null;
  } catch (err) {
    console.log(`  ⚠ voz com intenção falhou (${err.message.split('\n')[0]}) — segue o caminho de sempre`);
    return null;
  } finally {
    try { if (pasta) rmSync(pasta, { recursive: true, force: true }); } catch { /* fica a pasta temporária */ }
  }
}

async function synthesizeValidatedScene({ id, narration, wordCount, minDurationSec, fallbackDurationSec, providerForAttempt, logSuffix = '' }) {
  let audio, ext, voice, providerUsed, whisper, speechEnd, succeededAttempt;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const providerForThisAttempt = providerForAttempt(attempt);

    try {
      const falado = pronounce(narration, providerForThisAttempt);
      /**
       * ⚠️ A INTENÇÃO SÓ ENTRA NO `edge`, e só onde foi pedida. O `piper` é offline e
       * não tem prosódia nenhuma; o `azure` aceitaria, mas nunca foi provado aqui — e
       * uma trava não se abre por suposição. Se a montagem falhar por qualquer razão,
       * `sintetizarComIntencao` devolve nulo e cai-se no caminho de sempre: um vídeo
       * com voz plana é muito melhor do que um vídeo que não sai.
       */
      const comArte = (INTENCAO_LIGADA && providerForThisAttempt === 'edge')
        ? await sintetizarComIntencao(falado, providerForThisAttempt)
        : null;
      if (comArte) {
        ({ audio, ext, voice } = comArte);
        providerUsed = providerForThisAttempt;
      } else {
        ({ audio, ext, voice, provider: providerUsed } = await synthesizeSpeech(falado, { providerName: providerForThisAttempt }));
      }
    } catch (err) {
      console.log(`  ⚠ cena ${id}${logSuffix}: ${providerForThisAttempt} falhou (${err.message}) — tentativa ${attempt}/${MAX_ATTEMPTS}`);
      if (attempt === MAX_ATTEMPTS) {
        throw new Error(`cena ${id}: TTS falhou em todos os provedores após ${MAX_ATTEMPTS} tentativas — último erro (${providerForThisAttempt}): ${err.message}`);
      }
      await sleep(RETRY_BACKOFF_MS[attempt - 1]);
      continue;
    }
    // ♦ O WHISPER PODE NEM EXISTIR (03/08/2026): sem a chave (ambiente local) ou com
    // o serviço fora, a chamada LANÇAVA e derrubava o job inteiro — a rede de baixo
    // só cobria a lista vazia/degenerada, não a ausência. Agora a falha entra na
    // MESMA rede: mede-se o áudio real e alinha-se proporcional, com aviso.
    let whisperFalhou = null;
    try {
      whisper = await transcribeWords(audio, { ext });
    } catch (err) {
      whisperFalhou = err;
      whisper = [];
    }
    /**
     * ♦ O MEDIDOR LOCAL, DE GRAÇA (04/08/2026) — autorizado pelo dono depois de ver o
     * vídeo longo: *"pode mexer no medidor de voz, confio em você"*.
     *
     * ⚠️ ELE É O SEGUNDO DA FILA, NÃO O PRIMEIRO, e isso é deliberado. Na nuvem — onde
     * o robô publica todos os dias — a chave do Together existe e o Whisper responde em
     * segundos; correr um modelo local ANTES dele acrescentaria minutos a cada vídeo
     * para chegar ao mesmo sítio. Aqui ele só entra quando o de cima falhou, que é
     * exatamente o caso desta máquina (sem chave) e o caso de a nuvem ficar sem serviço.
     *
     * O ganho medido: sem ele, as palavras eram repartidas por PESO DE LETRAS, e no
     * vídeo longo de 04/08 isso pôs cada palavra 0,47s fora do sítio em média (a pior,
     * 1,88s). O dono viu o defeito no ecrã antes de eu o medir.
     *
     * Nunca lança: se o Python ou o `faster-whisper` não existirem, fica tudo como
     * estava e a rede de baixo trata do resto. Um vídeo com sincronia aproximada é mau;
     * um vídeo que não sai é pior.
     */
    if ((whisperFalhou || !whisper.length) && !process.env.SEM_MEDIDOR_LOCAL) {
      const local = await transcreverLocalmente(audio, ext);
      if (local && local.length) {
        whisper = local;
        whisperFalhou = null;
      }
    }
    // REDE DE SEGURANÇA DA MEDIÇÃO (31/07/2026). O Whisper pode devolver palavras
    // SEM tempo válido — o último `end` vem 0/não-numérico. Medido no run
    // 30619739871: áudio de 725.616 bytes (piper) e 125.568 (edge), e mesmo assim
    // speechEnd 0,00 nos DOIS provedores; o guard concluiu "áudio quebrado" e
    // derrubou o vídeo do dia. O fallback só cobria a lista VAZIA — lista
    // DEGENERADA passava batida.
    // Agora: sem medição confiável, vale a duração do roteiro e o alinhamento
    // proporcional (o vídeo sai com sincronia aproximada, em vez de não sair).
    const ultimoFim = whisper.length ? Number(whisper[whisper.length - 1].end) : NaN;
    const medicaoOk = Number.isFinite(ultimoFim) && ultimoFim > 0;
    if (whisperFalhou || (!medicaoOk && whisper.length)) {
      // Mede o ÁUDIO REAL antes de recorrer ao palpite do roteiro. Sem isto, a cena
      // ficava com a duração ESCRITA pelo modelo e tudo o que vinha depois deslocava.
      const real = medirDuracaoAudio(audio, ext);
      const usada = real ?? fallbackDurationSec;
      const origem = real ? `duração REAL do áudio (${real}s)` : `duração do roteiro (${fallbackDurationSec}s — ffprobe indisponível)`;
      const motivo = whisperFalhou
        ? `Whisper indisponível (${whisperFalhou.message})`
        : `Whisper devolveu ${whisper.length} palavra(s) SEM tempo válido`;
      console.log(`  ⚠ cena ${id}${logSuffix}: ${motivo} — usando a ${origem} e alinhamento proporcional.`);
      whisper = []; // sem tempos válidos: alignWords cai na distribuição por peso
      speechEnd = usada;
    } else {
      speechEnd = medicaoOk ? ultimoFim : fallbackDurationSec;
    }

    if (!isAudioBroken(speechEnd, wordCount)) {
      succeededAttempt = attempt;
      return { audio, ext, voice, provider: providerUsed, whisper, speechEnd, succeededAttempt };
    }

    console.log(`  ⚠ cena ${id}${logSuffix}: áudio suspeito via ${providerForThisAttempt} (${speechEnd.toFixed(2)}s p/ ${wordCount} palavras, mínimo ${minDurationSec.toFixed(2)}s, buffer ${audio.length} bytes) — tentativa ${attempt}/${MAX_ATTEMPTS}`);

    if (attempt === MAX_ATTEMPTS) {
      throw new Error(`cena ${id}: áudio do TTS veio quebrado via ${providerForThisAttempt} (${speechEnd.toFixed(2)}s para ${wordCount} palavras) após ${MAX_ATTEMPTS} tentativas`);
    }
    await sleep(RETRY_BACKOFF_MS[attempt - 1]);
  }
}

async function main() {
  const slug = args.slug && args.slug !== true ? String(args.slug) : 'juros-compostos';
  const script = readScript(slug);
  const scenes = script.scenes || [];
  if (!scenes.length) throw new Error('roteiro sem cenas');

  /**
   * ═══ 🔴 A INTENÇÃO DA VOZ ESTÁ DESLIGADA, POR ORDEM DO DONO (04/08/2026) ═══
   *
   * Ela foi escrita nesse mesmo dia e ele ouviu o resultado: *"depois que você ajustou
   * frase a frase a voz fica robotizada! Não sei se mexe na velocidade da voz, me parece
   * que tem momento que ela acelera um pouquinho ou desacelera um pouco e **é aí que
   * aparece mais robótico**. Qualquer coisa retiramos isso sem problema."*
   *
   * Ele apontou a causa certa. O plano de leitura muda a velocidade **ao ponto final**
   * (-3% → -9% → -7%), e uma pessoa não faz isso: muda *dentro* da frase, devagar. Um
   * salto de velocidade num limite de frase lê-se como um aparelho a mudar de definição.
   * E há a causa maior, medida na §40.1: cortar por frase destrói o **arco da entoação**,
   * porque o motor planeia a melodia sobre todo o texto que recebe — frase a frase,
   * **todas acabam a cair**.
   *
   * ⚠️ **A MAQUINARIA FICA, o interruptor é que está em baixo.** O `lib/prosodia.js`, a
   * apara das pontas e a montagem continuam aqui, testados e documentados, porque o dia
   * em que o canal trocar de voz — ou passar a uma voz paga que aceite marcas por dentro
   * — a pergunta volta. Apagar isto seria deitar fora a resposta junto com a experiência.
   *
   * 👉 Para voltar a ligá-la um dia: trocar `false` por `script.formato === 'longo'`.
   *    E ouvir antes de entregar, que foi a lição desta.
   */
  const INTENCAO_APROVADA_PELO_DONO = false;
  ligarIntencaoDaVoz(INTENCAO_APROVADA_PELO_DONO && script.formato === 'longo');

  const provider = pickProvider();
  if (!provider) throw new Error('nenhum provedor de TTS disponível');
  // Cadeia de provedores disponíveis nesta execução (edge → piper → azure), só p/
  // saber p/ quem "escalar" se as 3 tentativas com o provedor principal falharem.
  const providerChain = getTtsProviders().map((p) => p.name);
  console.log(`🎙️  TTS do Short "${slug}" — ${scenes.length} cenas · provedor: ${provider}\n`);
  console.log(`🔊 cadeia de TTS: ${providerChain.join(' → ')} (${providerChain.length} provedor${providerChain.length === 1 ? '' : 'es'})\n`);

  // Aquecimento do edge-tts: a 1ª conexão do processo às vezes volta um stub
  // truncado (cold start). Esquentamos com uma micro-frase descartada ANTES da
  // cena 1 — warmUpTts() já valida o áudio e retenta internamente (até 5x); só
  // seguimos sem aquecimento válido depois de esgotar as tentativas (os retries
  // por cena ainda protegem a síntese real).
  try {
    const warm = await warmUpTts();
    console.log(`   (edge-tts aquecido — ${warm.attempt}ª tentativa, ${warm.bytes} bytes)\n`);
  } catch (err) {
    console.log(`   ⚠ aquecimento do TTS esgotou as tentativas — seguindo assim mesmo: ${err.message}\n`);
  }

  const audioDir = join(AUDIO_ROOT, slug);
  mkdirSync(audioDir, { recursive: true });

  const outScenes = [];
  let voiceUsed = null;
  // Provedor "efetivo" desta síntese — começa no primário e, se alguma cena
  // precisar escalar (4ª tentativa forçando o próximo da cadeia), passa a ser
  // usado como primário nas cenas SEGUINTES também (Fix 2 — 1 voz por vídeo).
  let effectiveProvider = provider;
  let unifiedProvider = null; // setado na 1ª vez que uma escalada "salva" uma cena

  for (const scene of scenes) {
    const id = scene.id ?? outScenes.length + 1;
    const narration = (scene.narration || '').trim();
    if (!narration) { console.log(`  cena ${id}: sem narração — pulada`); continue; }

    if (outScenes.length > 0) await sleep(SCENE_GAP_MS); // burst-softening entre cenas

    const wordCount = narration.split(/\s+/).filter(Boolean).length;
    const minDurationSec = minExpectedDurationSec(wordCount);
    const fallbackDurationSec = scene.durationSec || 3;
    const primaryForThisScene = effectiveProvider;

    // Retry com o MESMO provedor nas tentativas 2 e 3; na última tentativa (4ª),
    // se houver mais de um provedor na cadeia, força o próximo (edge quebrando
    // stub repetido → tenta piper/azure em vez de insistir no mesmo defeito).
    const providerForAttempt = (attempt) => {
      const idx = providerChain.indexOf(primaryForThisScene);
      const forceNext = attempt === MAX_ATTEMPTS && providerChain.length > 1;
      return forceNext ? providerChain[(idx + 1) % providerChain.length] : primaryForThisScene;
    };

    const { audio, ext, voice, provider: providerUsed, whisper, speechEnd, succeededAttempt } = await synthesizeValidatedScene({
      id, narration, wordCount, minDurationSec, fallbackDurationSec, providerForAttempt,
    });

    // Escalada aconteceu (provedor real ≠ o que era primário p/ esta cena): a
    // partir de agora, force esse provedor em todas as cenas seguintes — e
    // lembre disso p/ re-sintetizar as cenas ANTERIORES no fim (voz única).
    if (providerUsed !== primaryForThisScene && !unifiedProvider) {
      unifiedProvider = providerUsed;
      effectiveProvider = providerUsed;
      console.log(`  🔀 cena ${id} escalou p/ "${providerUsed}" — provedor forçado nas próximas cenas (voz única por vídeo)`);
    }

    // áudio validado — persiste + segue p/ alinhamento
    voiceUsed = voice;
    const audioName = `scene-${id}.${ext}`;
    writeFileSync(join(audioDir, audioName), audio);

    // 2) timestamps reais + 3) alinhamento com o roteiro
    const durationSec = +(speechEnd + TAIL_PAD).toFixed(3);
    const words = alignWords(narration, whisper, speechEnd);

    outScenes.push({
      id,
      role: scene.role || '',
      narration,
      audioFile: `audio/${slug}/${audioName}`, // relativo a youtube-render/public
      durationSec,
      words,
      _providerUsed: providerUsed, // interno — removido antes de gravar timing.json
      _fallbackDurationSec: fallbackDurationSec,
    });
    const retrySuffix = succeededAttempt > 1 ? ` (${succeededAttempt}ª tentativa)` : '';
    console.log(`  ✓ cena ${id} [${scene.role || '-'}] — ${durationSec}s · ${words.length} palavras (${whisper.length} do Whisper)${retrySuffix}`);
  }

  // ── Fix 2: uma voz só por vídeo ──
  // Se alguma cena escalou p/ outro provedor, as cenas ANTERIORES a ela ainda
  // usam a voz original — re-sintetiza essas cenas minoritárias com o provedor
  // que "salvou o dia" (o Whisper roda de novo sobre o áudio final de cada uma).
  if (unifiedProvider) {
    const minorityScenes = outScenes.filter((s) => s._providerUsed !== unifiedProvider);
    if (minorityScenes.length) {
      console.log(`\n🎙️ voz unificada: re-sintetizando cenas ${minorityScenes.map((s) => s.id).join(', ')} com ${unifiedProvider} (voz única por vídeo)`);

      for (const outScene of minorityScenes) {
        const wordCount = outScene.narration.split(/\s+/).filter(Boolean).length;
        const minDurationSec = minExpectedDurationSec(wordCount);

        let resynth;
        try {
          resynth = await synthesizeValidatedScene({
            id: outScene.id,
            narration: outScene.narration,
            wordCount,
            minDurationSec,
            fallbackDurationSec: outScene._fallbackDurationSec,
            providerForAttempt: () => unifiedProvider, // sem escalada aqui — já é o provedor-alvo
            logSuffix: ' [re-síntese p/ voz única]',
          });
        } catch (err) {
          // a cena JÁ TEM áudio válido da 1ª passada — se a re-síntese falhar (provedor
          // fixo, sem escalada), mantemos o áudio original em vez de derrubar o job
          // inteiro por causa de uma voz que ficaria inconsistente nesta cena só.
          // ::warning:: (e não console.log simples) porque o GitHub destaca isso na
          // interface do run: o áudio original é mantido, mas o timing.json vai
          // afirmar UMA voz para o vídeo e esta cena ficará com a voz antiga.
          console.log(`::warning::cena ${outScene.id}: re-síntese com ${unifiedProvider} falhou (${err.message}) — áudio original mantido; a voz varia NESTA cena e o timing.json não registra isso`);
          continue;
        }
        const { audio, ext, voice, provider: providerUsed, whisper, speechEnd } = resynth;

        // remove o áudio antigo (extensão pode mudar entre provedores, ex.: mp3 → wav)
        const oldPath = join(audioDir, `scene-${outScene.id}.${outScene.audioFile.split('.').pop()}`);
        if (existsSync(oldPath)) { try { unlinkSync(oldPath); } catch { /* melhor esforço */ } }

        const audioName = `scene-${outScene.id}.${ext}`;
        writeFileSync(join(audioDir, audioName), audio);

        outScene.audioFile = `audio/${slug}/${audioName}`;
        outScene.durationSec = +(speechEnd + TAIL_PAD).toFixed(3);
        outScene.words = alignWords(outScene.narration, whisper, speechEnd);
        outScene._providerUsed = providerUsed;
        voiceUsed = voice;

        console.log(`  ✓ cena ${outScene.id} re-sintetizada com ${providerUsed} — ${outScene.durationSec}s · ${outScene.words.length} palavras`);
      }
    }
  }

  // limpa os campos internos antes de gravar
  for (const s of outScenes) { delete s._providerUsed; delete s._fallbackDurationSec; }

  const totalDurationSec = +outScenes.reduce((a, s) => a + s.durationSec, 0).toFixed(3);
  const timing = { slug, provider: unifiedProvider || provider, voice: voiceUsed, scenes: outScenes, totalDurationSec };
  writeFileSync(join(audioDir, 'timing.json'), JSON.stringify(timing, null, 2), 'utf-8');

  console.log(`\n✅ ${outScenes.length} cenas · ${totalDurationSec}s total`);
  console.log(`📄 timing: ${join(audioDir, 'timing.json')}`);
  console.log(`🔊 áudio: ${audioDir}`);
}

// Só executa se chamado direto (permite importar alignWords/normalizeWord nos testes).
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('youtube/tts-short.js')) {
  main().catch((err) => { console.error(`\n❌ ${err.message}`); process.exit(1); });
}
