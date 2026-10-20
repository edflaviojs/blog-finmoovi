/**
 * SONDA DO WHISPER — 20/10/2026. Desde ~15/10 todas as cenas dizem "0 do Whisper": a Together
 * responde 200 e a lista de palavras vem vazia. Isto manda UMA frase curta (voz edge, grátis)
 * com o pedido de hoje e com variantes, e imprime a FORMA da resposta (nunca a chave).
 * Custo: ~3 s de áudio × 3 pedidos — menos de um centavo.
 *   node src/scripts/diagnostico/sonda-whisper.js
 */
import { synthesizeSpeech } from '../youtube/lib/tts-client.js';

const key = process.env.TOGETHER_TTS_API_KEY;
if (!key) { console.error('falta TOGETHER_TTS_API_KEY'); process.exit(1); }
const { audio, ext } = await synthesizeSpeech('Dinheiro sem controle é dinheiro dos outros.', { providerName: 'edge' });
console.log(`áudio: ${audio.length} bytes .${ext}`);

const variantes = {
  'pedido de hoje': (fd) => fd.append('timestamp_granularities', 'word'),
  'com []': (fd) => fd.append('timestamp_granularities[]', 'word'),
  'word + segment': (fd) => { fd.append('timestamp_granularities[]', 'word'); fd.append('timestamp_granularities[]', 'segment') },
};
for (const [nome, extra] of Object.entries(variantes)) {
  const fd = new FormData();
  fd.append('file', new Blob([audio]), `audio.${ext}`);
  fd.append('model', 'openai/whisper-large-v3');
  fd.append('language', 'pt');
  fd.append('response_format', 'verbose_json');
  extra(fd);
  const r = await fetch('https://api.together.xyz/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: fd });
  const txt = await r.text();
  let j = null; try { j = JSON.parse(txt) } catch { /* não é JSON */ }
  console.log(`\n── ${nome}: HTTP ${r.status}`);
  if (!j) { console.log(txt.slice(0, 400)); continue }
  console.log(`chaves: ${Object.keys(j).join(', ')}`);
  console.log(`words: ${Array.isArray(j.words) ? j.words.length : typeof j.words} · segments: ${Array.isArray(j.segments) ? j.segments.length : typeof j.segments}`);
  if (j.segments?.[0]) console.log(`1º segmento: chaves ${Object.keys(j.segments[0]).join(', ')}`);
  console.log(`texto: ${String(j.text || '').slice(0, 120)}`);
  console.log(JSON.stringify(j).slice(0, 700));
}
