/**
 * Cliente de ÁUDIO do canal do YouTube (F1.2 — IMPLEMENTACAO20).
 *
 * Duas responsabilidades, desacopladas:
 *   1. VOZ (TTS) — sintetiza narração pt-BR com FALLBACK entre provedores
 *      (padrão do image-router). Ordem:
 *        1º edge  — Microsoft Edge Read-Aloud (vozes neurais = as MESMAS do Azure),
 *                   pt-BR autêntico, GRÁTIS e SEM chave. Provedor PRIMÁRIO. (dep: msedge-tts)
 *        2º piper — TTS offline (licença MIT), 100% local, nunca depende de rede.
 *                   Só entra se PIPER_BIN + PIPER_MODEL apontarem o binário e o
 *                   modelo pt-BR (baixados no workflow do Actions). Saída .wav.
 *        3º azure — Azure AI Speech oficial (SLA), só entra se AZURE_SPEECH_KEY + REGION.
 *   2. TIMESTAMPS — Whisper via Together devolve o start/end REAL de cada palavra
 *      do áudio gerado (TOGETHER_TTS_API_KEY). Independe do provedor de voz —
 *      troca a voz sem mexer no timing.
 *
 * Decisão (20-21/07): edge-tts é o caminho grátis + brasileiro autêntico; Piper é
 * a rede de segurança offline (licença comercial-OK); voz "premium" (Azure HD /
 * clonada) fica como upgrade futuro. Ver seção 10 do doc IMPLEMENTACAO20.
 *
 * A voz padrão (VOICES.edge) ainda será trocada pelo timbre profissional que o
 * dono escolher entre as vozes pt-BR do Edge — é 1 linha.
 */

// Voz padrão por provedor. `edge` usa nomes de voz da Microsoft (`pt-BR-<Nome>Neural`);
// `azure` idem; `piper` usa o caminho do modelo .onnx (via env).
export const VOICES = {
  edge: { name: 'pt-BR-AntonioNeural' },   // PLACEHOLDER — trocar pelo timbre escolhido
  azure: { languageCode: 'pt-BR', name: 'pt-BR-AntonioNeural' },
  piper: { model: process.env.PIPER_MODEL },
};

function escapeXml(s) {
  return String(s).replace(/[<>&'"]/g, (c) => (
    { '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]
  ));
}

// ── Provedor 1: Edge Read-Aloud (grátis, sem chave, primário) ──
//
// UMA síntese isolada: cria uma instância MsEdgeTTS FRESCA (websocket próprio),
// coleta o áudio e SEMPRE fecha/descarta o socket no fim (finally). Nada de
// singleton compartilhado — cada chamada (e cada retry) nasce e morre com sua
// própria conexão. Assim um websocket morto/"envenenado" de uma tentativa nunca
// contamina a próxima, e não deixamos sockets vazando (fonte de throttle em CI).
async function edgeSynthOnce(text, voiceName) {
  const { MsEdgeTTS, OUTPUT_FORMAT } = await import('msedge-tts');
  const tts = new MsEdgeTTS();
  try {
    await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(text);
    const chunks = [];
    await new Promise((res, rej) => {
      audioStream.on('data', (c) => chunks.push(c));
      audioStream.on('end', res);
      audioStream.on('error', rej);
    });
    return Buffer.concat(chunks);
  } finally {
    try { tts.close(); } catch { /* socket já pode ter fechado sozinho */ }
  }
}

function edgeProvider() {
  return {
    name: 'edge',
    ext: 'mp3',
    async synth(text, voice) {
      let lastErr;
      // O endpoint do Edge às vezes fecha o stream cedo (turn.end não chega) — retenta,
      // sempre numa CONEXÃO NOVA (edgeSynthOnce recria a instância a cada tentativa).
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const buf = await edgeSynthOnce(text, voice.name);
          if (buf.length < 3000) throw new Error('áudio curto/truncado');
          return buf;
        } catch (err) {
          lastErr = err;
          if (attempt < 3) await new Promise((r) => setTimeout(r, 1500 * attempt));
        }
      }
      throw lastErr;
    },
  };
}

/**
 * Aquecimento do edge-tts: sintetiza uma micro-frase ("Olá.") numa conexão nova e
 * DESCARTA o resultado, só p/ absorver o "cold start" (a 1ª conexão do processo às
 * vezes volta um stub truncado). Falha aqui é NÃO-FATAL — o chamador deve engolir
 * (ver tts-short.js main()). Não retorna áudio; serve só p/ "esquentar" o caminho.
 */
export async function warmUpTts() {
  await edgeSynthOnce('Olá.', VOICES.edge.name);
}

// ── Provedor 2: Piper offline (MIT) — só se configurado (PIPER_BIN + PIPER_MODEL) ──
function piperProvider() {
  const bin = process.env.PIPER_BIN;
  const model = process.env.PIPER_MODEL;
  if (!bin || !model) return null;
  return {
    name: 'piper',
    ext: 'wav',
    async synth(text) {
      const { spawn } = await import('child_process');
      const { readFile, unlink } = await import('fs/promises');
      const os = await import('os');
      const path = await import('path');
      const out = path.join(os.tmpdir(), `piper-${process.pid}-${Math.floor(Math.random() * 1e9)}.wav`);
      await new Promise((res, rej) => {
        const p = spawn(bin, ['-m', model, '-f', out]);
        p.on('error', rej);
        p.on('close', (code) => (code === 0 ? res() : rej(new Error(`piper saiu com código ${code}`))));
        p.stdin.write(text);
        p.stdin.end();
      });
      const buf = await readFile(out);
      unlink(out).catch(() => {});
      if (buf.length < 3000) throw new Error('piper: áudio vazio');
      return buf;
    },
  };
}

// ── Provedor 3: Azure oficial — só se AZURE_SPEECH_KEY + AZURE_SPEECH_REGION ──
function azureProvider() {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;
  if (!key || !region) return null;
  return {
    name: 'azure',
    ext: 'mp3',
    async synth(text, voice) {
      const ssml = `<speak version="1.0" xml:lang="${voice.languageCode}"><voice name="${voice.name}">${escapeXml(text)}</voice></speak>`;
      const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': key,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
          'User-Agent': 'finmoovi-youtube',
        },
        body: ssml,
        signal: AbortSignal.timeout(60000),
      });
      if (!res.ok) throw new Error(`azure HTTP ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`);
      return Buffer.from(await res.arrayBuffer());
    },
  };
}

/**
 * Provedores de voz habilitados, em ordem de prioridade (edge → piper → azure).
 * O edge está sempre presente (não precisa de chave).
 */
export function getTtsProviders() {
  return [edgeProvider(), piperProvider(), azureProvider()].filter(Boolean);
}

/**
 * Nome do provedor primário disponível. O gerador escolhe UMA vez por vídeo e
 * passa `providerName` em todas as cenas — assim um vídeo nunca mistura vozes.
 */
export function pickProvider() {
  return getTtsProviders()[0]?.name ?? null;
}

/**
 * Sintetiza `text` em áudio (Buffer). Tenta o provedor pedido (ou o primário) e,
 * em falha, cai para o próximo. Retorna { audio, provider, voice, ext }.
 *
 * @param {string} text
 * @param {{ voices?: object, providerName?: string }} [opts]
 */
export async function synthesizeSpeech(text, { voices = VOICES, providerName } = {}) {
  const providers = getTtsProviders();
  if (!providers.length) {
    throw new Error('Nenhum provedor de TTS disponível (edge deveria estar sempre presente — verifique a dep msedge-tts).');
  }
  const ordered = providerName
    ? [...providers.filter((p) => p.name === providerName), ...providers.filter((p) => p.name !== providerName)]
    : providers;

  const errors = [];
  for (const p of ordered) {
    const voice = voices[p.name] || {};
    try {
      const audio = await p.synth(text, voice);
      if (!audio || audio.length < 500) throw new Error('áudio vazio/curto demais');
      return { audio, provider: p.name, ext: p.ext, voice: voice.name || p.name };
    } catch (err) {
      errors.push(`${p.name}: ${err.message}`);
    }
  }
  throw new Error(`Todos os provedores de TTS falharam:\n- ${errors.join('\n- ')}`);
}

/**
 * Timestamps REAIS por palavra do áudio (Whisper via Together). Devolve
 * [{ word, start, end }] em segundos. Usado p/ substituir o timing sintético do
 * karaokê (captions.tsx) e sincronizar ícones/SFX. Aceita mp3 ou wav.
 *
 * @param {Buffer} audioBuffer
 * @param {{ language?: string, ext?: string }} [opts]
 */
export async function transcribeWords(audioBuffer, { language = 'pt', ext = 'mp3' } = {}) {
  const key = process.env.TOGETHER_TTS_API_KEY;
  if (!key) throw new Error('TOGETHER_TTS_API_KEY ausente (necessária p/ os timestamps do Whisper).');

  const fd = new FormData();
  fd.append('file', new Blob([audioBuffer]), `audio.${ext}`);
  fd.append('model', 'openai/whisper-large-v3');
  fd.append('language', language);
  fd.append('response_format', 'verbose_json');
  fd.append('timestamp_granularities', 'word');

  const res = await fetch('https://api.together.xyz/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body: fd,
    signal: AbortSignal.timeout(120000),
  });
  if (!res.ok) throw new Error(`whisper HTTP ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`);
  const data = await res.json();
  const words = data.words || (data.segments ? data.segments.flatMap((s) => s.words || []) : []);
  return words.map((w) => ({ word: w.word, start: w.start, end: w.end }));
}

// Auto-teste manual: `node src/scripts/youtube/lib/tts-client.js "frase" out`
// (gera o áudio com o provedor disponível e imprime os timestamps do Whisper).
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('lib/tts-client.js')) {
  const text = process.argv[2] || 'Dinheiro sem controle é dinheiro dos outros.';
  const outBase = process.argv[3];
  const { writeFileSync } = await import('fs');
  console.log('Provedores de voz:', getTtsProviders().map((p) => p.name).join(', ') || '(nenhum)');
  const { audio, provider, voice, ext } = await synthesizeSpeech(text);
  console.log(`✓ TTS via ${provider} (${voice}) — ${audio.length} bytes .${ext}`);
  if (outBase) { writeFileSync(`${outBase}.${ext}`, audio); console.log(`  salvo em ${outBase}.${ext}`); }
  const words = await transcribeWords(audio, { ext });
  console.log(`✓ Whisper: ${words.length} palavras`, JSON.stringify(words.slice(0, 8)));
}
