/**
 * AS CAPAS EM ATRASO — uma corrida só, para os Shorts que já estão no ar (IMPL20 §52).
 *
 * ═══ POR QUE EXISTE ═══
 * Onze Shorts foram publicados sem capa nenhuma, porque a peça que a envia só passou
 * a existir hoje. A página do canal é hoje uma grelha de fotogramas apanhados ao
 * calhas — provavelmente a meio de uma animação, que é o pior instante possível.
 *
 * O YouTube deixa trocar a miniatura de qualquer vídeo, a qualquer momento, sem
 * penalização. Então isto corre **uma vez**, arruma o atraso, e nunca mais é preciso:
 * daqui para a frente cada vídeo já nasce com capa.
 *
 * ═══ O QUE PODE FALHAR, E O QUE ACONTECE ═══
 * ⚠️ Alguns dos onze podem já não ter roteiro guardado (os roteiros só passaram a ser
 * gravados a partir de certa altura). Sem roteiro não há texto para a capa — esses são
 * **saltados com o nome à vista**, e não em silêncio.
 * ⚠️ Cada vídeo é independente: um que falhe não impede os outros.
 *
 * Uso:
 *   node src/scripts/youtube/capas-em-atraso.js --dry-run   (mostra o plano)
 *   node src/scripts/youtube/capas-em-atraso.js
 *   node src/scripts/youtube/capas-em-atraso.js --slug=inflacao-rouba   (só um)
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { textoDaCapa } from './lib/capa-texto.js';
import { caminhoDaCapa, lerRoteiro, tirarFotografia } from './capa-short.js';

const ROOT = process.cwd();
const TRACKING = join(ROOT, '.github', 'data', 'youtube-published.json');
const SCRIPT_DIR = join(ROOT, 'src', 'scripts', 'youtube', 'output');

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const THUMBNAIL_URL = 'https://www.googleapis.com/upload/youtube/v3/thumbnails/set?uploadType=media&videoId=';

const args = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => {
    const [k, ...v] = a.slice(2).split('=');
    return [k, v.join('=') || true];
  }),
);
const DRY_RUN = Boolean(args['dry-run']);
const log = (...m) => console.log(...m);

async function getAccessToken() {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Faltam secrets YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET / YOUTUBE_REFRESH_TOKEN.');
  }
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token', refresh_token: refreshToken,
      client_id: clientId, client_secret: clientSecret,
    }),
  });
  const t = await res.text();
  if (!res.ok) throw new Error(`Falha a renovar o acesso (${res.status}): ${t.slice(0, 200)}`);
  return JSON.parse(t).access_token;
}

async function meterCapa(chave, videoId, caminhoJpg) {
  const bytes = readFileSync(caminhoJpg);
  const r = await fetch(`${THUMBNAIL_URL}${encodeURIComponent(videoId)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${chave}`,
      'Content-Type': 'image/jpeg',
      'Content-Length': String(bytes.length),
    },
    body: bytes,
  });
  if (!r.ok) throw new Error(`${r.status}: ${(await r.text().catch(() => '')).slice(0, 200)}`);
}

async function main() {
  if (!existsSync(TRACKING)) throw new Error(`Não encontrei o caderno dos publicados: ${TRACKING}`);
  const publicados = JSON.parse(readFileSync(TRACKING, 'utf-8'));

  const soEste = args.slug && args.slug !== true ? String(args.slug) : null;
  const alvos = Object.entries(publicados)
    .filter(([slug]) => !soEste || slug === soEste)
    .map(([slug, dados]) => ({ slug, videoId: dados.videoId, titulo: dados.title || '' }))
    .filter((v) => v.videoId);

  log(`\n🖼️  Capas em atraso — ${alvos.length} vídeo(s) publicado(s)${DRY_RUN ? ' (ENSAIO)' : ''}\n`);

  const semRoteiro = [];
  const prontos = [];
  for (const v of alvos) {
    if (!existsSync(join(SCRIPT_DIR, `${v.slug}.script.json`))) { semRoteiro.push(v); continue; }
    prontos.push(v);
  }

  // ⚠️ Dizer QUEM fica de fora, e não só quantos. Um vídeo saltado em silêncio é um
  // vídeo que ninguém volta a olhar.
  if (semRoteiro.length) {
    log(`⏭️  ${semRoteiro.length} sem roteiro guardado — ficam como estão:`);
    for (const v of semRoteiro) log(`     · ${v.slug}`);
    log('');
  }

  let feitos = 0;
  const falhados = [];
  const chave = DRY_RUN ? null : await getAccessToken();

  for (const v of prontos) {
    try {
      const texto = textoDaCapa(lerRoteiro(v.slug));
      log(`▸ ${v.slug}`);
      log(`    ${texto.tema} · ${texto.numero || '(sem número)'} · ${texto.remate.slice(0, 52)}`);
      if (DRY_RUN) { feitos += 1; continue; }

      const { destino, bytes } = tirarFotografia(v.slug, texto);
      await meterCapa(chave, v.videoId, destino);
      log(`    ✅ capa no ar (${Math.round(bytes / 1024)} KB) → youtu.be/${v.videoId}`);
      feitos += 1;
    } catch (e) {
      log(`    ❌ ${e.message}`);
      falhados.push(v.slug);
    }
  }

  log(`\n${DRY_RUN ? 'Ensaio: ' : ''}${feitos} de ${prontos.length} tratados.`);
  if (falhados.length) log(`❌ falharam: ${falhados.join(', ')}`);
  if (semRoteiro.length) log(`⏭️  sem roteiro: ${semRoteiro.length}`);
  log('');
  return falhados.length ? 1 : 0;
}

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('youtube/capas-em-atraso.js')) {
  main().then((c) => process.exit(c)).catch((e) => { console.error(`\n❌ ${e.message}\n`); process.exit(1); });
}
