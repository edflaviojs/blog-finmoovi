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
// ♦ 07/08/2026 — os roteiros, para o relatório saber o FORMATO e o GANCHO de cada
// vídeo. É de lá que sai a comparação por gancho; o nome do ficheiro não serve.
const OUTPUT_DIR = join(ROOT, 'src', 'scripts', 'youtube', 'output');

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
 * ♦ 06/08/2026 — O AVISO DOS 70%, por ordem do dono.
 *
 * *"Para vídeos Shorts o que temos que avaliar sempre é o engajamento dos espectadores.
 * Se estiver abaixo de 70% o ganho está ruim, precisaremos mudar algo."*
 *
 * ⚠️ **E É PRECISO UM MÍNIMO DE AUDIÊNCIA PARA A CONTA VALER ALGUMA COISA.** Um vídeo com
 * 3 visualizações e 40% não diz nada: bastou uma pessoa fechar cedo. Se o aviso disparasse
 * nesses, disparava em quase todos — e **um alarme que dispara sempre é um alarme que
 * ninguém lê**, que é uma lição que este canal já pagou. Por isso há três gavetas, e a do
 * meio diz "ainda não sei" em vez de fingir que sabe.
 *
 * ⚠️ A régua é a **percentagem média assistida**, que é o número que o próprio YouTube
 * mostra. Em Shorts ela **pode passar de 100%** — o vídeo repete em ciclo e quem revê
 * conta outra vez. Passar dos 100% é o melhor sinal que existe, não um erro.
 */
export const RETENCAO_MINIMA = 0.70;
/**
 * ⚠️ **DEZ, E É UM NÚMERO PROVISÓRIO — escolhido contra os dados REAIS de hoje.**
 * O primeiro palpite foram 25, e medido contra o canal deixava **1 vídeo em 10** julgado:
 * um aviso que nunca diria nada durante meses vale o mesmo que aviso nenhum. Com 10, os
 * números de hoje já falam — e falam a sério: **cinco vídeos abaixo dos 70%** (46%, 50%,
 * 51%, 60%, 61%) e **dois muito acima** (92% e 94%).
 * **Subir isto quando o canal crescer**: 10 visualizações é sinal fraco, e o aviso escreve
 * sempre quantas visualizações estão por trás de cada número para se poder desconfiar.
 */
export const VISUALIZACOES_MINIMAS = 10;

export function avaliarRetencao(videos, { minimo = RETENCAO_MINIMA, minViews = VISUALIZACOES_MINIMAS } = {}) {
  const abaixo = [];
  const acima = [];
  const semAudiencia = [];
  for (const v of videos || []) {
    const p = v?.percentagemMedia;
    if (typeof p !== 'number' || !Number.isFinite(p)) { semAudiencia.push(v); continue; }
    if ((v.views || 0) < minViews) { semAudiencia.push(v); continue; }
    (p < minimo ? abaixo : acima).push(v);
  }
  // Do pior para o melhor: quem lê um aviso lê a primeira linha.
  abaixo.sort((a, b) => a.percentagemMedia - b.percentagemMedia);
  return { abaixo, acima, semAudiencia };
}

/**
 * ⚠️ DÍVIDA CONHECIDA: isto é uma cópia do `getAccessToken` do upload-short.js.
 * A razão original desapareceu no mesmo dia — aquele ficheiro passou a só correr
 * quando é chamado pelo nome, e já se deixa importar em segurança (foi assim que
 * o corretor de descrições ficou a usar as funções do robô em vez de as copiar).
 * Fica a cópia por hoje para não mexer no que já está provado; quando alguém
 * voltar aqui, a mudança certa é importar e apagar estas 20 linhas.
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
    // ⚠️ Este número PODE PASSAR DE 100%, e não é erro: em Shorts o vídeo
    // repete em ciclo, e quem revê o início conta outra vez. 100% = a
    // audiência viu aquele instante uma vez; 130% = reviu-o em média 1,3×.
    log(`Início do vídeo (100% = visto 1×): ${pc(resumo.ficamAte3s)}`);
    log(`A meio do vídeo                : ${pc(resumo.ficamAte50pc)}`);
    log(`No último instante             : ${pc(resumo.ficamAteAoFim)}`);
    log(`Metade da audiência sai aos    : ${resumo.metadeSaiAosSegundos == null ? '—' : `${Math.round(resumo.metadeSaiAosSegundos)}s`}`);
    log(`Percentagem média assistida    : ${pc(resumo.percentagemMediaDoCanal)}`);
  } else {
    log('⚠️ NENHUMA curva disponível — audiência pequena de mais para o YouTube dar o detalhe.');
    log('   Isto é resposta na mesma: o tamanho do capítulo terá de sair de convenção,');
    log('   e a retenção mede-se outra vez quando os vídeos públicos acumularem audiência.');
  }

  /**
   * ── QUAL GANCHO SEGURA GENTE (07/08/2026) ────────────────────────────────────
   *
   * O dono deu 10 ganchos para o Short de 16s (*"Nunca faça X"*, *"É sério que
   * ninguém está falando de X?"*…) e o sorteio distribui-os por igual de propósito —
   * cada um apanha o mesmo número de vídeos, senão a comparação seria injusta.
   *
   * ⚠️ **É AQUI QUE ISSO DEIXA DE SER GOSTO E PASSA A SER NÚMERO.** Ao fim de duas
   * semanas são ~28 vídeos, uns 3 por gancho. Aí dá para deitar fora os ganchos
   * fracos com prova na mão, em vez de discutir qual soa melhor.
   *
   * A família do gancho sai do PRÓPRIO ROTEIRO (`ganchoFamilia`), não do nome do
   * ficheiro: um slug é uma conveniência e muda; o roteiro é o registo.
   */
  const porGancho = new Map();
  const porFormato = new Map();
  for (const r of resultados) {
    let ficha = null;
    try {
      ficha = JSON.parse(readFileSync(join(OUTPUT_DIR, `${r.slug}.script.json`), 'utf-8'));
    } catch { /* roteiro apagado ou de antes do registo: entra como formato antigo */ }

    const formato = (ficha && ficha.formato) || 'short50';
    if (!porFormato.has(formato)) porFormato.set(formato, []);
    porFormato.get(formato).push(r);

    const familia = ficha && ficha.ganchoFamilia;
    if (familia) {
      if (!porGancho.has(familia)) porGancho.set(familia, []);
      porGancho.get(familia).push(r);
    }
  }

  if (porFormato.size > 1) {
    log('');
    log('══════════ POR FORMATO ══════════');
    // ⚠️ Separados de propósito: um vídeo de 16s e um de 50s não se comparam, e a
    // média dos dois juntos esconde os dois.
    for (const [formato, lista] of porFormato) {
      const nome = formato === 'loop16' ? 'Short de 16s (loop)' : 'Short de 50s';
      const comV = lista.filter((r) => (r.views || 0) > 0);
      log(`${nome.padEnd(22)} ${lista.length} vídeo(s) · ${pc(media(comV, (r) => r.percentagemMedia))} assistido em média`);
    }
  }

  if (porGancho.size) {
    log('');
    log('══════════ QUAL GANCHO SEGURA GENTE ══════════');
    const ranking = [...porGancho.entries()]
      .map(([familia, lista]) => {
        const comV = lista.filter((r) => (r.views || 0) > 0);
        return { familia, n: lista.length, comAudiencia: comV.length, pc: media(comV, (r) => r.percentagemMedia) };
      })
      .sort((a, b) => (b.pc ?? -1) - (a.pc ?? -1));

    for (const g of ranking) {
      const nota = g.comAudiencia === 0
        ? '(ainda sem audiência)'
        : (g.comAudiencia < 3 ? `(só ${g.comAudiencia} com audiência — ainda é cedo)` : '');
      log(`${String(g.familia).padEnd(22)} ${pc(g.pc).padStart(5)}  ·  ${g.n} vídeo(s) ${nota}`);
    }

    const maduros = ranking.filter((g) => g.comAudiencia >= 3 && g.pc != null);
    if (maduros.length >= 3) {
      const melhor = maduros[0];
      const pior = maduros[maduros.length - 1];
      log('');
      log(`🏆 melhor: "${melhor.familia}" (${pc(melhor.pc)})   ·   🥀 pior: "${pior.familia}" (${pc(pior.pc)})`);
    } else {
      log('');
      log('⏳ Ainda cedo para eleger o melhor gancho: é preciso pelo menos 3 vídeos COM audiência por gancho.');
      log('   A 2 vídeos por dia e 10 ganchos em rodízio, isso são cerca de duas semanas.');
    }
  }

  // ── O AVISO DOS 70% (ordem do dono, 06/08) ──
  const veredito = avaliarRetencao(resultados);
  const avisoLinhas = [];
  log('');
  log(`══════════ O AVISO DOS ${Math.round(RETENCAO_MINIMA * 100)}% ══════════`);
  if (veredito.abaixo.length) {
    avisoLinhas.push(`🔴 **${veredito.abaixo.length} vídeo(s) abaixo de ${Math.round(RETENCAO_MINIMA * 100)}%** — o ganho está mau, é preciso mudar alguma coisa:`);
    for (const v of veredito.abaixo) avisoLinhas.push(`- ${pc(v.percentagemMedia)} · ${v.slug} (${v.views} visualizações) · https://youtu.be/${v.videoId}`);
  } else if (veredito.acima.length) {
    avisoLinhas.push(`✅ Nenhum vídeo com audiência abaixo de ${Math.round(RETENCAO_MINIMA * 100)}%. Os ${veredito.acima.length} medidos estão bem.`);
  } else {
    avisoLinhas.push(`⏳ **Ainda não dá para julgar ninguém.** Nenhum vídeo chegou às ${VISUALIZACOES_MINIMAS} visualizações — abaixo disso a percentagem é um acaso, não um sinal.`);
  }
  if (veredito.semAudiencia.length) {
    avisoLinhas.push(`⏳ ${veredito.semAudiencia.length} vídeo(s) ainda sem audiência suficiente (menos de ${VISUALIZACOES_MINIMAS} visualizações) — não são julgados.`);
  }
  log(avisoLinhas.join('\n').replace(/\*\*/g, ''));

  const payload = { medidoEm: new Date().toISOString(), resumo, aviso: {
    minimo: RETENCAO_MINIMA,
    visualizacoesMinimas: VISUALIZACOES_MINIMAS,
    abaixo: veredito.abaixo.map((v) => ({ slug: v.slug, videoId: v.videoId, percentagemMedia: v.percentagemMedia, views: v.views })),
    julgados: veredito.abaixo.length + veredito.acima.length,
  }, videos: resultados };
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8');
  log(`\n📝 Gravado em ${OUT}`);

  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY,
      `## 📉 Retenção dos Shorts\n\n${avisoLinhas.join('\n')}\n\n${linhas.join('\n')}\n\n` +
      (resumo.comCurva
        ? `**Início (100% = visto 1×, acima disso = revisto):** ${pc(resumo.ficamAte3s)} · **a meio:** ${pc(resumo.ficamAte50pc)} · **no fim:** ${pc(resumo.ficamAteAoFim)} · **metade sai aos:** ${resumo.metadeSaiAosSegundos == null ? '—' : `${Math.round(resumo.metadeSaiAosSegundos)}s`}\n`
        : `⚠️ Sem curva: audiência pequena de mais.\n`));
  }
}

/**
 * ⚠️ **SÓ CORRE QUANDO É CHAMADO PELO NOME** — a mesma guarda que o `upload-short.js`
 * ganhou em 03/08, pela mesma razão: sem ela, **importar este ficheiro dispara a
 * medição**, com chaves e tudo. Foi o que aconteceu ao escrever a prova de mesa do
 * aviso dos 70%: ela só queria a função da conta e o programa inteiro arrancou.
 */
const chamadoPeloNome = process.argv[1]
  && process.argv[1].replace(/\\/g, '/').endsWith('youtube/retencao.js');
if (chamadoPeloNome) {
  main().catch((err) => {
    console.error(`\n❌ ${err.message}`);
    process.exit(1);
  });
}
