/**
 * Cliente de ÁUDIO do canal do YouTube (F1.2 — IMPLEMENTACAO20).
 *
 * Duas responsabilidades, desacopladas:
 *   1. VOZ (TTS)  — sintetiza narração pt-BR, com FALLBACK entre provedores
 *      (mesmo padrão do image-router do blog):
 *        1º Google Cloud TTS — Chirp 3 HD pt-BR   (GOOGLE_TTS_API_KEY)
 *        2º Azure AI Speech  — Neural pt-BR        (AZURE_SPEECH_KEY + AZURE_SPEECH_REGION)
 *   2. TIMESTAMPS — Whisper via Together devolve o start/end REAL de cada
 *      palavra do áudio gerado (TOGETHER_TTS_API_KEY). Independe do provedor
 *      de voz — troca a voz sem mexer no timing.
 *
 * As chaves vivem só como secrets do GitHub (não no ambiente local). Um
 * provedor só entra na lista se suas credenciais existirem — adicionar/remover
 * um secret liga/desliga o provedor sem tocar no código.
 *
 * A VOZ ainda não foi escolhida pelo dono (ele vai ouvir as amostras). Os nomes
 * em VOICES são PLACEHOLDERS pareados (mesmo registro nos dois provedores);
 * trocar é 1 linha. Ver seção 10 do doc IMPLEMENTACAO20.
 */

// Voz padrão por provedor — PLACEHOLDER até o dono escolher ouvindo as amostras.
// Pareadas de propósito (mesmo gênero/registro) p/ um fallback não trocar o
// timbre do canal. Formato Google: `<locale>-Chirp3-HD-<Nome>`; Azure: `<Nome>Neural`.
export const VOICES = {
  google: { languageCode: 'pt-BR', name: 'pt-BR-Chirp3-HD-Charon' }, // ♂ (placeholder)
  azure: { languageCode: 'pt-BR', name: 'pt-BR-AntonioNeural' },     // ♂ (placeholder, pareada)
};

// Escapa texto p/ dentro do SSML do Azure.
function escapeXml(s) {
  return String(s).replace(/[<>&'"]/g, (c) => (
    { '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]
  ));
}

// ── Provedores de VOZ (cada um retorna null se não estiver configurado) ──

function googleProvider() {
  const key = process.env.GOOGLE_TTS_API_KEY;
  if (!key) return null;
  return {
    name: 'google',
    async synth(text, voice) {
      const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text },
          voice: { languageCode: voice.languageCode, name: voice.name },
          audioConfig: { audioEncoding: 'MP3' },
        }),
        signal: AbortSignal.timeout(60000),
      });
      if (!res.ok) throw new Error(`google HTTP ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`);
      const data = await res.json();
      if (!data.audioContent) throw new Error('google: resposta sem audioContent');
      return Buffer.from(data.audioContent, 'base64');
    },
  };
}

function azureProvider() {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;
  if (!key || !region) return null;
  return {
    name: 'azure',
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
 * Provedores de voz habilitados, em ordem de prioridade (Google → Azure).
 */
export function getTtsProviders() {
  return [googleProvider(), azureProvider()].filter(Boolean);
}

/**
 * Nome do provedor primário disponível (ou null). O gerador escolhe UMA vez por
 * vídeo e passa `providerName` em todas as cenas — assim um vídeo nunca mistura
 * vozes de provedores diferentes.
 */
export function pickProvider() {
  return getTtsProviders()[0]?.name ?? null;
}

/**
 * Sintetiza `text` em mp3 (Buffer). Tenta o provedor pedido (ou o primário) e,
 * em falha, cai para o próximo. Retorna { audio, provider, voice }.
 *
 * @param {string} text
 * @param {{ voices?: object, providerName?: string }} [opts]
 */
export async function synthesizeSpeech(text, { voices = VOICES, providerName } = {}) {
  const providers = getTtsProviders();
  if (!providers.length) {
    throw new Error('Nenhum provedor de TTS configurado (defina GOOGLE_TTS_API_KEY, ou AZURE_SPEECH_KEY + AZURE_SPEECH_REGION).');
  }
  // Ordena começando pelo provedor pedido (se houver), mantendo os demais como fallback.
  const ordered = providerName
    ? [...providers.filter((p) => p.name === providerName), ...providers.filter((p) => p.name !== providerName)]
    : providers;

  const errors = [];
  for (const p of ordered) {
    const voice = voices[p.name];
    if (!voice) { errors.push(`${p.name}: sem voz definida em VOICES`); continue; }
    try {
      const audio = await p.synth(text, voice);
      if (!audio || audio.length < 500) throw new Error('áudio vazio/curto demais');
      return { audio, provider: p.name, voice: voice.name };
    } catch (err) {
      errors.push(`${p.name}: ${err.message}`);
    }
  }
  throw new Error(`Todos os provedores de TTS falharam:\n- ${errors.join('\n- ')}`);
}

/**
 * Timestamps REAIS por palavra do áudio (Whisper via Together). Devolve
 * [{ word, start, end }] em segundos. Usado p/ substituir o timing sintético do
 * karaokê (captions.tsx) e sincronizar ícones/SFX.
 *
 * @param {Buffer} audioBuffer  mp3 gerado pelo TTS
 * @param {{ language?: string }} [opts]
 */
export async function transcribeWords(audioBuffer, { language = 'pt' } = {}) {
  const key = process.env.TOGETHER_TTS_API_KEY;
  if (!key) throw new Error('TOGETHER_TTS_API_KEY ausente (necessária p/ os timestamps do Whisper).');

  const fd = new FormData();
  fd.append('file', new Blob([audioBuffer]), 'audio.mp3');
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

// Auto-teste manual: `node src/scripts/youtube/lib/tts-client.js "frase" out.mp3`
// (usa as env vars presentes; gera o mp3 e imprime os timestamps do Whisper).
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('lib/tts-client.js')) {
  const text = process.argv[2] || 'Dinheiro sem controle é dinheiro dos outros.';
  const out = process.argv[3];
  const { writeFileSync } = await import('fs');
  console.log('Provedores de voz habilitados:', getTtsProviders().map((p) => p.name).join(', ') || '(nenhum)');
  const { audio, provider, voice } = await synthesizeSpeech(text);
  console.log(`✓ TTS via ${provider} (${voice}) — ${audio.length} bytes`);
  if (out) { writeFileSync(out, audio); console.log(`  salvo em ${out}`); }
  const words = await transcribeWords(audio);
  console.log(`✓ Whisper: ${words.length} palavras`, JSON.stringify(words.slice(0, 8)));
}
