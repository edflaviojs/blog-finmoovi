/**
 * YouTube — RETENÇÃO dos Shorts publicados (IMPL20 §32.3, tarefa nº1 do dono).
 *
 * Responde a UMA pergunta: **em que segundo as pessoas saem dos nossos vídeos?**
 * É esse número que dimensiona o capítulo do vídeo LONGO — sem ele, o tamanho
 * do capítulo é palpite.
 *
 * 100% LEITURA. Não publica, não altera, não apaga nada no YouTube. O único
 * ficheiro que escreve é `.github/data/youtube-retencao.json` (o histórico da
 * medição, para se poder comparar daqui a um mês).
 *
 * Dois relatórios da YouTube Analytics API v2:
 *   A. números por vídeo  → views, % médio assistido, duração média
 *   B. curva de retenção  → quanta gente ainda está a ver em cada instante
 *
 * ⚠️ PODE VIR VAZIO, e isso também é resposta: a API só devolve a curva quando
 * o vídeo tem audiência suficiente. Vídeos que passaram a maior parte da vida
 * PRIVADOS quase não acumulam visualizações. Se vier vazio, dizemos isso com
 * todas as letras em vez de inventar um número.
 *
 * Segredos (só no CI): YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET,
 * YOUTUBE_REFRESH_TOKEN — o refresh token já foi criado com o escopo
 * `yt-analytics.readonly` (ver o cabeçalho de scripts/youtube-auth.js).
 *
 * Uso:
 *   node src/scripts/youtube/retencao.js
 *   node src/scripts/youtube/retencao.js --video=SZSGAxqmmm0   (só um)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from 'node:fs';
import { join, dirname } from 'node:path';

const ROOT = process.cwd();
const TRACKING = join(ROOT, '.github', 'data', 'youtube-published.json');
const OUT = join(ROOT, '.github', 'data', 'youtube-retencao.json');

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const ANALYTICS_URL = 'https://youtubeanalytics.googleapis.com/v2/reports';
const VIDEOS_URL = 'https://www.googleapis.com/youtube/v3/videos';

const args = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => {
    const [k, ...v] = a.slice(2).split('=');
    return [k, v.join('=') || true];
  }),
);
const ONLY_VIDEO = args.video && args.video !== true ? String(args.video) : null;

function log(msg) { console.log(msg); }

/**
 * ⚠️ Cópia deliberada do getAccessToken do upload-short.js, e NÃO um import.
 * Aquele ficheiro chama `main()` no corpo do módulo — importá-lo aqui dispararia
 * um UPLOAD. Enquanto ele não for refatorado, duplicar 20 linhas de leitura é o
 * mal menor face a publicar um vídeo por acidente ao medir retenção.
 */
async function getAccessToken() {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Faltam os segredos YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET / YOUTUBE_REFRESH_TOKEN — esta medição só corre na nuvem.');
  }
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Falha ao renovar o acesso (${res.status}): ${text.slice(0, 300)}`);
  return JSON.parse(text).access_token;
}

async function analytics(token, params) {
  const url = `${ANALYTICS_URL}?${new URLSearchParams({ ids: 'channel==MINE', ...params })}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const text = await res.text();
  if (!res.ok) {
    const err = new Error(`Analytics ${res.status}: ${text.slice(0, 400)}`);
    err.status = res.status;
    throw err;
  }
  return JSON.parse(text);
}

/** Duração real de cada vídeo (para traduzir percentagem em SEGUNDOS). */
async function fetchDurations(token, ids) {
  const out = {};
  for (let i = 0; i < ids.length; i += 50) {
    const lote = ids.slice(i, i + 50);
    const url = `${VIDEOS_URL}?part=contentDetails,status&id=${lote.join(',')}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) continue; // duração é um extra: sem ela mostramos só percentagens
    const data = await res.json();
    for (const item of data.items || []) {
      const m = /^PT(?:(\d+)M)?(?:(\d+)S)?$/.exec(item?.contentDetails?.duration || '');
      out[item.id] = {
        segundos: m ? (Number(m[1] || 0) * 60 + Number(m[2] || 0)) : null,
        privacidade: item?.status?.privacyStatus || '?',
      };
    }
  }
  return out;
}

/** Lê a curva e responde às perguntas que interessam ao vídeo longo. */
function lerCurva(rows, duracaoSeg) {
  // rows: [ratio (0..1), audienceWatchRatio, ...] — 0 = início, 1 = fim.
  const pontos = (rows || [])
    .map((r) => ({ ratio: Number(r[0]), fica: Number(r[1]) }))
    .filter((p) => Number.isFinite(p.ratio) && Number.isFinite(p.fica))
    .sort((a, b) => a.ratio - b.ratio);
  if (pontos.length < 3) return null;

  const em = (alvo) => {
    let melhor = pontos[0];
    for (const p of pontos) if (Math.abs(p.ratio - alvo) < Math.abs(melhor.ratio - alvo)) melhor = p;
    return melhor.fica;
  };
  // O instante em que a audiência cai abaixo de metade do que começou.
  const inicio = pontos[0].fica || 1;
  const cruzou = pontos.find((p) => p.fica < inicio * 0.5);

  return {
    pontos: pontos.length,
    aos3s: duracaoSeg ? em(Math.min(3 / duracaoSeg, 1)) : null,
    aos25pc: em(0.25),
    aos50pc: em(0.5),
    aos75pc: em(0.75),
    noFim: em(1),
    metadeSaiEmRatio: cruzou ? cruzou.ratio : null,
    metadeSaiEmSegundos: cruzou && duracaoSeg ? Math.round(cruzou.ratio * duracaoSeg) : null,
  };
}

function pc(v) { return v == null ? '—' : `${Math.round(v * 100)}%`; }

async function main() {
  if (!existsSync(TRACKING)) throw new Error(`Sem histórico de publicados: ${TRACKING}`);
  const tracking = JSON.parse(readFileSync(TRACKING, 'utf-8')) || {};

  let videos = Object.entries(tracking)
    .map(([slug, v]) => ({ slug, ...v }))
    .filter((v) => v.videoId)
    .sort((a, b) => String(a.uploadedAt).localeCompare(String(b.uploadedAt)));
  if (ONLY_VIDEO) videos = videos.filter((v) => v.videoId === ONLY_VIDEO);
  if (!videos.length) throw new Error('Nenhum vídeo para medir.');

  const token = await getAccessToken();
  log(`🔑 Acesso renovado. Medindo ${videos.length} vídeo(s).\n`);

  const hoje = new Date().toISOString().slice(0, 10);
  const primeiro = String(videos[0].uploadedAt || '').slice(0, 10) || '2026-01-01';

  const meta = await fetchDurations(token, videos.map((v) => v.videoId));

  // ── A. Números por vídeo ───────────────────────────────────────────────────
  let porVideo = {};
  try {
    const r = await analytics(token, {
      startDate: primeiro,
      endDate: hoje,
      metrics: 'views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage',
      dimensions: 'video',
      filters: `video==${videos.map((v) => v.videoId).join(',')}`,
      maxResults: '200',
    });
    for (const row of r.rows || []) {
      porVideo[row[0]] = {
        views: row[1],
        minutosTotais: row[2],
        duracaoMediaSeg: row[3],
        percentagemMedia: row[4] == null ? null : row[4] / 100,
      };
    }
  } catch (e) {
    log(`⚠️ Números por vídeo indisponíveis: ${e.message}\n`);
  }

  // ── B. Curva de retenção, um vídeo de cada vez ─────────────────────────────
  const resultados = [];
  for (const v of videos) {
    const dur = meta[v.videoId]?.segundos || null;
    let curva = null;
    let erro = null;
    try {
      const r = await analytics(token, {
        startDate: primeiro,
        endDate: hoje,
        metrics: 'audienceWatchRatio',
        dimensions: 'elapsedVideoTimeRatio',
        filters: `video==${v.videoId}`,
      });
      curva = lerCurva(r.rows, dur);
      if (!curva) erro = 'sem dados suficientes (audiência pequena de mais)';
    } catch (e) {
      erro = e.message;
    }
    resultados.push({
      slug: v.slug,
      videoId: v.videoId,
      publicadoEm: String(v.uploadedAt || '').slice(0, 10),
      privacidade: meta[v.videoId]?.privacidade || '?',
      duracaoSeg: dur,
      ...(porVideo[v.videoId] || {}),
      curva,
      erro,
    });
  }

  // ── Relatório humano ───────────────────────────────────────────────────────
  const linhas = [];
  linhas.push('| vídeo | publicado | estado | views | % médio | metade sai aos | fim |');
  linhas.push('|---|---|---|---|---|---|---|');
  for (const r of resultados) {
    linhas.push(`| ${r.slug} | ${r.publicadoEm} | ${r.privacidade} | ${r.views ?? '—'} | ${pc(r.percentagemMedia)} | ${r.curva?.metadeSaiEmSegundos != null ? `${r.curva.metadeSaiEmSegundos}s` : '—'} | ${pc(r.curva?.noFim)} |`);
  }

  const comCurva = resultados.filter((r) => r.curva);
  const comViews = resultados.filter((r) => (r.views || 0) > 0);
  const media = (lista, f) => {
    const vals = lista.map(f).filter((x) => Number.isFinite(x));
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };

  const resumo = {
    videosMedidos: resultados.length,
    comAudiencia: comViews.length,
    comCurva: comCurva.length,
    viewsTotais: resultados.reduce((a, r) => a + (r.views || 0), 0),
    percentagemMediaDoCanal: media(comViews, (r) => r.percentagemMedia),
    metadeSaiAosSegundos: media(comCurva, (r) => r.curva.metadeSaiEmSegundos),
    ficamAte3s: media(comCurva, (r) => r.curva.aos3s),
    ficamAte50pc: media(comCurva, (r) => r.curva.aos50pc),
    ficamAteAoFim: media(comCurva, (r) => r.curva.noFim),
  };

  log(linhas.join('\n'));
  log('');
  log('══════════ O QUE ISTO DIZ ══════════');
  log(`Vídeos com audiência : ${resumo.comAudiencia}/${resumo.videosMedidos}  (${resumo.viewsTotais} visualizações no total)`);
  log(`Vídeos com curva     : ${resumo.comCurva}`);
  if (resumo.comCurva) {
    log(`Ficam nos 3 primeiros segundos : ${pc(resumo.ficamAte3s)}`);
    log(`Ficam até meio do vídeo        : ${pc(resumo.ficamAte50pc)}`);
    log(`Chegam ao fim                  : ${pc(resumo.ficamAteAoFim)}`);
    log(`Metade da audiência sai aos    : ${resumo.metadeSaiAosSegundos == null ? '—' : `${Math.round(resumo.metadeSaiAosSegundos)}s`}`);
    log(`Percentagem média assistida    : ${pc(resumo.percentagemMediaDoCanal)}`);
  } else {
    log('⚠️ NENHUMA curva disponível — audiência pequena de mais para o YouTube dar o detalhe.');
    log('   Isto é resposta na mesma: o tamanho do capítulo terá de sair de convenção,');
    log('   e a retenção mede-se outra vez quando os vídeos públicos acumularem audiência.');
  }

  const payload = { medidoEm: new Date().toISOString(), resumo, videos: resultados };
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8');
  log(`\n📝 Gravado em ${OUT}`);

  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY,
      `## 📉 Retenção dos Shorts\n\n${linhas.join('\n')}\n\n` +
      (resumo.comCurva
        ? `**Ficam nos 3s:** ${pc(resumo.ficamAte3s)} · **até meio:** ${pc(resumo.ficamAte50pc)} · **até ao fim:** ${pc(resumo.ficamAteAoFim)} · **metade sai aos:** ${resumo.metadeSaiAosSegundos == null ? '—' : `${Math.round(resumo.metadeSaiAosSegundos)}s`}\n`
        : `⚠️ Sem curva: audiência pequena de mais.\n`));
  }
}

main().catch((err) => {
  console.error(`\n❌ ${err.message}`);
  process.exit(1);
});
