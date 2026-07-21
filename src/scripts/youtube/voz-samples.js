/**
 * Gera amostras de TODAS as vozes pt-BR do Edge (masculinas e femininas) para o
 * dono ouvir e escolher o timbre do canal. Feito p/ rodar no GitHub Actions
 * (IP limpo, sem o throttle que o endpoint do Edge aplica em geração local em lote).
 *
 * Saída: ./voz-samples/<Genero>-<Nome>.mp3  (subido como artefato pelo workflow).
 * Uso: node src/scripts/youtube/voz-samples.js
 */

import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const OUT = join(process.cwd(), 'voz-samples');
const TEXT = (process.env.SAMPLE_TEXT && process.env.SAMPLE_TEXT.trim())
  || 'No próximo minuto você vai entender por que quem controla o próprio dinheiro sai na frente. Juros compostos: R$ 500 por mês viram 3,2 milhões. Vamos aos números.';

// ⚠️ O edge-tts (Read-Aloud do Edge) só expõe ESTAS 3 vozes pt-BR (verificado na
// lista oficial /voices/list). As demais vozes Azure pt-BR (Humberto, Julio, Fabio…)
// NÃO estão disponíveis no caminho grátis — só no Azure/Google oficial (pago).
const VOICES = [
  ['M', 'pt-BR-AntonioNeural'],            // única masculina grátis
  ['F', 'pt-BR-FranciscaNeural'],
  ['F', 'pt-BR-ThalitaMultilingualNeural'], // a mais natural
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function gen(gender, voice, attempt = 1) {
  const name = voice.replace('pt-BR-', '').replace('Neural', '');
  try {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(TEXT);
    const chunks = [];
    await new Promise((res, rej) => {
      audioStream.on('data', (c) => chunks.push(c));
      audioStream.on('end', res);
      audioStream.on('error', rej);
    });
    const buf = Buffer.concat(chunks);
    if (buf.length < 3000) throw new Error('áudio curto/truncado');
    writeFileSync(join(OUT, `${gender}-${name}.mp3`), buf);
    console.log(`  ✓ ${gender} ${name} — ${buf.length} bytes`);
    return true;
  } catch (err) {
    if (attempt < 4) { await sleep(2500); return gen(gender, voice, attempt + 1); }
    console.log(`  ✗ ${name}: ${err.message.slice(0, 50)}`);
    return false;
  }
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  console.log(`🎙️  Amostras de voz pt-BR (Edge) — ${VOICES.length} vozes\n`);
  let ok = 0;
  for (const [g, v] of VOICES) {
    if (await gen(g, v)) ok++;
    await sleep(1200); // espaça p/ não estressar o endpoint
  }
  console.log(`\n✅ ${ok}/${VOICES.length} amostras em ${OUT}`);
  if (ok === 0) process.exit(1);
}

main().catch((err) => { console.error(`\n❌ ${err.message}`); process.exit(1); });
