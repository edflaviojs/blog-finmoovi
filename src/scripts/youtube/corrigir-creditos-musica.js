/**
 * CORRIGIR O CRÉDITO DA MÚSICA NOS VÍDEOS JÁ PUBLICADOS (02/08/2026).
 *
 * ═══ POR QUE EXISTE ═══
 * De 21/07 a 02/08 o canal publicou com uma faixa CC BY 4.0 (Kevin MacLeod), que é
 * livre para uso comercial **desde que se credite o autor**. O nosso próprio
 * `public/music/CREDITS.md` mandava pôr o crédito na descrição — e nada no código o
 * lia. **Nove vídeos foram ao ar sem ele.**
 *
 * A faixa nova é nossa e não obriga a nada (ver `lib/musica.js`), mas **os nove que já
 * estão no ar contêm a antiga** e continuam a dever-lhe o crédito enquanto lá
 * estiverem. Este script acrescenta a linha à descrição desses vídeos, sem tocar em
 * mais nada.
 *
 * ═══ O QUE ELE NÃO FAZ ═══
 * · Não muda título, etiquetas, privacidade, miniatura nem nada além da descrição.
 * · Não toca em vídeos publicados DEPOIS da troca de faixa (esses não devem crédito).
 * · Não repete a linha se ela já lá estiver.
 * · Sem `--aplicar` só MOSTRA o que faria. Nada é enviado por engano.
 *
 * Uso:
 *   node src/scripts/youtube/corrigir-creditos-musica.js            (só mostra)
 *   node src/scripts/youtube/corrigir-creditos-musica.js --aplicar  (envia)
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TRILHA_ANTERIOR } from './lib/musica.js';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const VIDEOS_URL = 'https://www.googleapis.com/youtube/v3/videos';
const REGISTO = join(process.cwd(), '.github', 'data', 'youtube-published.json');

const aplicar = process.argv.includes('--aplicar');
const LINHA = TRILHA_ANTERIOR.linhaDeCredito;

async function token() {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Faltam os segredos YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET / YOUTUBE_REFRESH_TOKEN.');
  }
  const r = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: 'refresh_token', refresh_token: refreshToken }),
  });
  const txt = await r.text();
  if (!r.ok) throw new Error(`não foi possível autenticar no YouTube: ${r.status} ${txt.slice(0, 200)}`);
  return JSON.parse(txt).access_token;
}

const registo = JSON.parse(readFileSync(REGISTO, 'utf-8'));
const alvos = Object.entries(registo)
  .filter(([, v]) => v && v.videoId)
  // só os que foram publicados ENQUANTO a faixa antiga estava no ar
  .filter(([, v]) => !v.uploadedAt || v.uploadedAt.slice(0, 10) < TRILHA_ANTERIOR.ate)
  .sort((a, b) => String(a[1].uploadedAt).localeCompare(String(b[1].uploadedAt)));

console.log(`\n🎵 crédito a acrescentar: "${LINHA}"`);
console.log(`📼 vídeos publicados com a faixa antiga: ${alvos.length}`);
if (!aplicar) console.log('👀 MODO DE ENSAIO — nada será enviado. Use --aplicar para enviar a sério.\n');
else console.log('✍️  A ENVIAR a sério.\n');

const acesso = await token();
let mudados = 0; let jaTinham = 0; let falhas = 0;

for (const [slug, v] of alvos) {
  const id = v.videoId;
  // 1) ler a descrição atual — nunca escrever por cima daquilo que não se leu
  const r = await fetch(`${VIDEOS_URL}?part=snippet&id=${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${acesso}` },
  });
  const j = await r.json();
  const item = j.items && j.items[0];
  if (!item) { console.log(`  ✗ ${id} (${slug}): não encontrado no canal`); falhas++; continue; }

  const snippet = item.snippet;
  const atual = String(snippet.description || '');
  if (atual.includes('Kevin MacLeod')) { console.log(`  ⏭️  ${id} (${slug}): já tem o crédito`); jaTinham++; continue; }

  const nova = `${atual.replace(/\s+$/, '')}\n\n${LINHA}`;
  if (nova.length > 5000) { console.log(`  ✗ ${id} (${slug}): a descrição passaria dos 5000 caracteres`); falhas++; continue; }

  if (!aplicar) { console.log(`  ✓ ${id} (${slug}): acrescentaria a linha (${atual.length} → ${nova.length} caracteres)`); mudados++; continue; }

  // 2) escrever de volta. A API exige o snippet INTEIRO — mandar só a descrição
  //    apagaria o título e a categoria. Por isso reenvia-se o que se leu, com a
  //    descrição trocada e mais nada.
  const put = await fetch(`${VIDEOS_URL}?part=snippet`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${acesso}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id,
      snippet: {
        title: snippet.title,
        description: nova,
        categoryId: snippet.categoryId,
        ...(snippet.tags ? { tags: snippet.tags } : {}),
        ...(snippet.defaultLanguage ? { defaultLanguage: snippet.defaultLanguage } : {}),
        ...(snippet.defaultAudioLanguage ? { defaultAudioLanguage: snippet.defaultAudioLanguage } : {}),
      },
    }),
  });
  if (put.ok) { console.log(`  ✅ ${id} (${slug}): crédito acrescentado`); mudados++; }
  else { console.log(`  ✗ ${id} (${slug}): ${put.status} ${(await put.text()).slice(0, 160)}`); falhas++; }
}

console.log(`\n${'─'.repeat(60)}`);
console.log(`${aplicar ? 'corrigidos' : 'a corrigir'}: ${mudados} · já tinham: ${jaTinham} · falhas: ${falhas}`);
if (!aplicar && mudados) console.log('\nPara enviar a sério:  node src/scripts/youtube/corrigir-creditos-musica.js --aplicar');
