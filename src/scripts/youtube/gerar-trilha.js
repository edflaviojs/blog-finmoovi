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
const SEGUNDOS = 32;
const CAUDA = 2; // segundos de cauda que se dobram para o início, para o loop não ter emenda

// ─── notas (Hz) ──────────────────────────────────────────────────────────────
const N = {
  A2: 110.00, C3: 130.81, F2: 87.31, G2: 98.00,
  A3: 220.00, B3: 246.94, C4: 261.63, D4: 293.66, E4: 329.63, F3: 174.61, G3: 196.00,
  A4: 440.00, C5: 523.25, E5: 659.25, G4: 392.00,
};

/**
 * Os quatro acordes. Am–F–C–G é a volta mais calma e mais "esperançosa" que existe —
 * e esperança é o que este canal vende: dá para arrumar a vida.
 */
const ACORDES = [
  { baixo: N.A2, pad: [N.A3, N.C4, N.E4], solta: [N.A4, N.C5, N.E5] },
  { baixo: N.F2, pad: [N.F3, N.A3, N.C4], solta: [N.C5, N.A4, N.C5] },
  { baixo: N.C3, pad: [N.C4, N.E4, N.G4], solta: [N.E5, N.G4, N.C5] },
  { baixo: N.G2, pad: [N.G3, N.B3, N.D4], solta: [N.D4 * 2, N.B3 * 2, N.G4] },
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
const DUR_ACORDE = 4;
for (let volta = 0; volta < 2; volta++) {
  for (let a = 0; a < ACORDES.length; a++) {
    const t0 = (volta * ACORDES.length + a) * DUR_ACORDE;
    const ac = ACORDES[a];

    somar(t0, DUR_ACORDE + 1.5, ac.baixo, 0.26, 0.35, 3.2, 0, 'pad');
    ac.pad.forEach((f, i) => {
      // cada voz do acorde entra com um atraso mínimo — evita o "órgão" e soa a respiração
      somar(t0 + i * 0.06, DUR_ACORDE + 1.6, f, 0.17, 1.2, 4.0, (i - 1) * 0.22, 'pad');
    });
    // três notas soltas por acorde: no início, a meio e no fim. Sempre poucas.
    [0.0, 1.5, 3.0].forEach((off, i) => {
      const f = ac.solta[i % ac.solta.length];
      somar(t0 + off, 1.8, f, 0.085, 0.006, 0.5, i % 2 === 0 ? -0.35 : 0.35, 'solta');
    });
  }
}

// ─── costurar o loop: a cauda dobra-se para o início ──────────────────────────
const nLoop = TAXA * SEGUNDOS;
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
