/**
 * A TRILHA DO CANAL — feita por código, como tudo o resto (02/08/2026).
 *
 * ═══ POR QUE EXISTE ═══
 * A faixa que estava no ar era um PLACEHOLDER (Kevin MacLeod, CC BY) desde 21/07, com
 * um aviso escrito no nosso próprio `CREDITS.md` a mandar creditá-la na descrição. Nove
 * vídeos foram publicados sem esse crédito, porque **nada no código verificava o aviso**
 * — o mesmo padrão do aviso que nunca disparou (IMPLEMENTACAO20 §23.1).
 *
 * A saída que o dono escolheu foi a que fecha o problema na origem: **a trilha passa a
 * ser gerada aqui**. Não há licença, não há atribuição, não há terceiros — e é coerente
 * com o canal, onde o ator, as capas e as cenas também nascem de código.
 *
 * ═══ O DESENHO DO SOM ═══
 * Isto NÃO é uma música para se ouvir: é um LEITO que vive a 12% de volume debaixo de
 * uma voz (ver `youtube-render/src/audio/music.tsx`). Por isso é deliberadamente pobre
 * em ataque e em agudos — tudo o que compete com a fala foi tirado.
 *  · Lá menor, 4 acordes de 4s (Am · F · C · G), duas voltas = 32s.
 *  · Pad de senos com ataque lento (1,2s) — nunca "entra", só está lá.
 *  · Baixo suave na fundamental, uma oitava abaixo.
 *  · Três notas soltas por acorde, curtas, em cima — dão movimento sem ocupar a banda
 *    da voz (que vive entre ~200Hz e ~3kHz).
 *  · Filtro passa-baixo e um limitador macio no fim.
 *  · O LOOP É COSTURADO: a cauda dos últimos 2s é somada ao início, por isso a volta
 *    não tem emenda audível.
 *
 * Uso:  node src/scripts/youtube/gerar-trilha.js
 * Sai:  youtube-render/public/music/bg.wav  (e bg.mp3 se houver ffmpeg)
 */

import { writeFileSync, existsSync } from 'fs';
import { execFileSync } from 'child_process';
import { join } from 'path';

const TAXA = 44100;
/**
 * ⚠️ ESTES DOIS NÚMEROS SÃO MEDIDOS NA FAIXA ANTIGA, não escolhidos (02/08/2026).
 *
 * O dono ouviu a 1ª versão desta trilha e disse: *"achei a música muito triste, teria
 * que ser mais ou menos parecida com a que usamos nos 9 vídeos"*. Em vez de adivinhar
 * o que o incomodava, analisei a faixa antiga ("Deliberate Thought") e a minha, com o
 * mesmo medidor. As duas diferenças estavam à vista:
 *
 *   |                        | a antiga    | a minha (triste) |
 *   | onde a música assenta  | **LÁ MAIOR**| Lá MENOR         |
 *   | andamento              | **133 bpm** | 68 bpm — metade  |
 *   | brilho                 | 248 Hz      | 230 Hz (igual)   |
 *
 * Ou seja: eu tinha-a pousado num acorde triste **e** tocado a metade da velocidade.
 * O brilho já estava certo. Corrigem-se as duas coisas e mais nada.
 */
const BPM = 133.33;              // medido: ~133 na faixa antiga
const BATIDA = 60 / BPM;         // 0,45s
const COMPASSO = BATIDA * 4;     // 1,8s
const DUR_ACORDE = COMPASSO * 2; // 3,6s
const SEGUNDOS = DUR_ACORDE * 8; // 28,8s — dá um número inteiro de amostras
const CAUDA = 2; // segundos de cauda que se dobram para o início, para o loop não ter emenda

// ─── notas (Hz) ──────────────────────────────────────────────────────────────
const N = {
  A2: 110.00, D2: 73.42, E2: 82.41,
  D3: 146.83, E3: 164.81, F3s: 185.00, G3s: 207.65, A3: 220.00, B3: 246.94, C4s: 277.18, D4: 293.66, E4: 329.63,
  A4: 440.00, B4: 493.88, C5s: 554.37, D5: 587.33, E5: 659.25, F5s: 739.99,
};

/**
 * A volta, em LÁ MAIOR: A – D – A – E, duas vezes.
 *
 * Não é gosto meu — é o que a medição da faixa antiga pede. As notas que ela mais toca
 * são, por esta ordem: **A (100%), E (67%), D (46%), C# (37%), F# (34%)**. Ora o acorde
 * de Lá maior é A-C#-E e o de Ré maior é D-F#-A: **juntos dão exatamente essas cinco
 * notas**. Por isso a volta é esta, e o Mi entra pouco (o G# dele mede só 18%).
 * Nenhum acorde menor: é o menor que puxa a música para baixo.
 */
/**
 * ⚠️ AS QUATRO NOTAS SOLTAS DE CADA ACORDE TÊM DE SER TODAS DIFERENTES.
 * Nas versões 2 e 3 eu repetia a mesma nota de duas em duas batidas (por exemplo
 * A4·C#5·E5·**C#5**) — e isso cria, sozinho, um passo com o dobro do tamanho. Foi por
 * isso que o medidor insistiu em ouvir **66 bpm** por muito que eu mexesse nos volumes:
 * o problema não era o volume, era o DESENHO. Quatro notas distintas e a repetição
 * mais curta passa a ser o compasso, não meia batida.
 */
const ACORDES = [
  { baixo: N.A2, pad: [N.A3, N.C4s, N.E4], solta: [N.A4, N.C5s, N.E5, N.B4] },
  { baixo: N.D2, pad: [N.D3, N.F3s, N.A3], solta: [N.D5, N.A4, N.F5s, N.D4] },
  { baixo: N.A2, pad: [N.A3, N.C4s, N.E4], solta: [N.E5, N.C5s, N.A4, N.E4] },
  { baixo: N.E2, pad: [N.E3, N.G3s, N.B3], solta: [N.B4, N.E5, N.G3s * 2, N.E4] },
  { baixo: N.A2, pad: [N.A3, N.C4s, N.E4], solta: [N.C5s, N.E5, N.A4, N.B4] },
  { baixo: N.D2, pad: [N.D3, N.F3s, N.A3], solta: [N.F5s, N.D5, N.A4, N.D4] },
  { baixo: N.E2, pad: [N.E3, N.G3s, N.B3], solta: [N.E5, N.B4, N.G3s * 2, N.E4] },
  { baixo: N.A2, pad: [N.A3, N.C4s, N.E4], solta: [N.A4, N.E5, N.C5s, N.E4] },
];

const total = Math.round(TAXA * (SEGUNDOS + CAUDA));
const esq = new Float64Array(total);
const dir = new Float64Array(total);

const somar = (inicio, dur, freq, ganho, ataque, queda, pan = 0, timbre = 'pad') => {
  const i0 = Math.round(inicio * TAXA);
  const n = Math.round(dur * TAXA);
  const gE = ganho * (1 - Math.max(0, pan)) ;
  const gD = ganho * (1 + Math.min(0, pan));
  for (let i = 0; i < n; i++) {
    const k = i0 + i;
    if (k >= total) break;
    const t = i / TAXA;
    // envelope: ataque linear, queda exponencial — o pad quase não decai, a nota solta cai depressa
    const env = (t < ataque ? t / ataque : Math.exp(-(t - ataque) / queda));
    let s;
    if (timbre === 'pad') {
      // senos com harmónicos fracos e uma segunda voz ligeiramente desafinada: dá corpo
      s = Math.sin(2 * Math.PI * freq * t)
        + 0.30 * Math.sin(2 * Math.PI * freq * 2 * t)
        + 0.12 * Math.sin(2 * Math.PI * freq * 3 * t)
        + 0.55 * Math.sin(2 * Math.PI * freq * 1.003 * t);
      s /= 1.97;
    } else {
      // nota solta: mais harmónicos, mas curta — soa a marimba/harpa, não a piano
      s = Math.sin(2 * Math.PI * freq * t)
        + 0.45 * Math.sin(2 * Math.PI * freq * 2 * t)
        + 0.20 * Math.sin(2 * Math.PI * freq * 3.01 * t);
      s /= 1.65;
    }
    esq[k] += s * env * gE;
    dir[k] += s * env * gD;
  }
};

// ─── compor ──────────────────────────────────────────────────────────────────
for (let a = 0; a < ACORDES.length; a++) {
  const t0 = a * DUR_ACORDE;
  const ac = ACORDES[a];

  // BAIXO uma vez por compasso (e não uma vez por acorde): é ele que dá o passo.
  // Foi a falta disto que fez a 1ª versão soar a metade da velocidade.
  for (let c = 0; c < 2; c++) {
    somar(t0 + c * COMPASSO, COMPASSO + 0.6, ac.baixo, 0.24, 0.02, 1.1, 0, 'pad');
  }

  // PAD: continua lento, é o colchão. Ataque mais curto que na 1ª versão (0,8 em vez
  // de 1,2) — a 133 bpm um ataque de 1,2s chegava atrasado ao acorde seguinte.
  ac.pad.forEach((f, i) => {
    somar(t0 + i * 0.05, DUR_ACORDE + 1.2, f, 0.135, 0.8, 3.2, (i - 1) * 0.22, 'pad');
  });

  /**
   * NOTAS SOLTAS EM CADA BATIDA — são elas que fazem o andamento SENTIR-SE.
   * ⚠️ Na 2ª versão estavam a 0,075 e o medidor continuava a ouvir 78 bpm em vez de
   * 133: o colchão tapava-as e não havia ataque nenhum a marcar o tempo. Subiram de
   * volume e encurtaram (0,22s de queda) — o que conta para o ouvido não é o volume
   * médio, é o ATAQUE. Continuam abaixo do colchão, e a voz manda sempre.
   */
  // ⚠️ E TODAS AS BATIDAS TÊM DE PESAR O MESMO. Na 3ª versão eu alternava forte/fraco
  // e o medidor passou a ouvir **66 bpm — metade** do pretendido: alternar cria um
  // passo com o dobro do tamanho, e é esse que o ouvido segue. O acento fica só na
  // 1ª batida de cada compasso, que marca o compasso sem partir a batida.
  for (let b = 0; b < 8; b++) {
    const f = ac.solta[b % ac.solta.length];
    const acento = 0.112;
    somar(t0 + b * BATIDA, BATIDA * 1.8, f, acento, 0.003, 0.22,
      b % 2 === 0 ? -0.28 : 0.28, 'solta');
  }
}

// ─── costurar o loop: a cauda dobra-se para o início ──────────────────────────
// ⚠️ ARREDONDAR AQUI É OBRIGATÓRIO. 60/133,33 não dá um número redondo de segundos, e
// sem isto o comprimento do loop fica com casas decimais — o escritor do ficheiro
// estoirou na última amostra à primeira tentativa. O áudio não nota meia amostra.
const nLoop = Math.round(TAXA * SEGUNDOS);
for (let i = 0; i < TAXA * CAUDA; i++) {
  esq[i] += esq[nLoop + i];
  dir[i] += dir[nLoop + i];
}

// ─── passa-baixo (um pólo) + limitador macio ─────────────────────────────────
// A voz vive entre ~200Hz e ~3kHz. Cortar acima de ~2,2kHz tira à trilha tudo o que
// competiria com ela — e é por isso que um leito bem filtrado se "ouve" sem tapar.
const alfa = 1 - Math.exp(-2 * Math.PI * 2200 / TAXA);
let ye = 0; let yd = 0;
let pico = 0;
for (let i = 0; i < nLoop; i++) {
  ye += alfa * (esq[i] - ye);
  yd += alfa * (dir[i] - yd);
  esq[i] = Math.tanh(ye * 1.15); // saturação suave: arredonda os picos em vez de os cortar
  dir[i] = Math.tanh(yd * 1.15);
  pico = Math.max(pico, Math.abs(esq[i]), Math.abs(dir[i]));
}
/**
 * ⚠️ A EMENDA DO LOOP — medido, não suposto.
 * Dobrar a cauda para o início resolve as vozes que ficaram a soar, mas NÃO garante que
 * a última amostra encoste à primeira. Medido na 1ª versão: um degrau de 0,118, que dá
 * um estalo audível a cada volta. Aqui os últimos 34ms são misturados com os primeiros
 * 34ms, de forma que a última amostra passa a ser praticamente a primeira — o começo
 * fica intacto e a volta não tem costura.
 */
// ⚠️ E a 1ª tentativa de costura estava ERRADA: misturava o fim com o INÍCIO da
// costura (amostra 1499), não com a amostra 0 — o salto continuava lá, medido em 0,062.
// O que garante a continuidade é o fim chegar a zero e o início partir de zero: aí a
// volta encosta sempre, seja qual for o conteúdo. 34ms a 12% de volume não se ouvem.
const COSTURA = 1500; // ≈34ms
for (let i = 0; i < COSTURA; i++) {
  const w = i / (COSTURA - 1);
  esq[i] *= w; dir[i] *= w;                                   // entra do silêncio
  const k = nLoop - COSTURA + i;
  esq[k] *= (1 - w); dir[k] *= (1 - w);                       // sai para o silêncio
}

const normal = pico > 0 ? 0.89 / pico : 1;

// ─── escrever o WAV (16 bits, estéreo) ───────────────────────────────────────
const bytes = nLoop * 2 * 2;
const buf = Buffer.alloc(44 + bytes);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + bytes, 4); buf.write('WAVE', 8);
buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
buf.writeUInt16LE(2, 22); buf.writeUInt32LE(TAXA, 24); buf.writeUInt32LE(TAXA * 4, 28);
buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
buf.write('data', 36); buf.writeUInt32LE(bytes, 40);
for (let i = 0; i < nLoop; i++) {
  buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(esq[i] * normal * 32767))), 44 + i * 4);
  buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(dir[i] * normal * 32767))), 44 + i * 4 + 2);
}

const destino = join(process.cwd(), 'youtube-render', 'public', 'music');
const wav = join(destino, 'bg.wav');
writeFileSync(wav, buf);
console.log(`🎵 trilha gerada: ${wav} (${SEGUNDOS}s, ${(buf.length / 1048576).toFixed(1)} MB)`);

// mp3 se houver ffmpeg — é 10× mais pequeno e o render não nota a diferença
try {
  const mp3 = join(destino, 'bg.mp3');
  execFileSync('ffmpeg', ['-y', '-i', wav, '-codec:a', 'libmp3lame', '-b:a', '128k', mp3], { stdio: 'ignore' });
  if (existsSync(mp3)) console.log(`🎵 convertida: ${mp3}`);
} catch {
  console.log('ℹ️ ffmpeg não encontrado — ficou só o .wav (o Remotion lê WAV na mesma)');
}
