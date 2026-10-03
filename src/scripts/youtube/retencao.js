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
import { relatorioDeCapas } from '../apis/youtube-reporting.js';

const ROOT = process.cwd();
const TRACKING = join(ROOT, '.github', 'data', 'youtube-published.json');
const OUT = join(ROOT, '.github', 'data', 'youtube-retencao.json');
// ♦ 07/08/2026 — os roteiros, para o relatório saber o FORMATO e o GANCHO de cada
// vídeo. É de lá que sai a comparação por gancho; o nome do ficheiro não serve.
const OUTPUT_DIR = join(ROOT, 'src', 'scripts', 'youtube', 'output');

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const ANALYTICS_URL = 'https://youtubeanalytics.googleapis.com/v2/reports';
const VIDEOS_URL = 'https://www.googleapis.com/youtube/v3/videos';
const CHANNELS_URL = 'https://www.googleapis.com/youtube/v3/channels';
const PLAYLIST_URL = 'https://www.googleapis.com/youtube/v3/playlistItems';
// ♦ 03/10/2026 — o registo dos longos, que entra só para dar nome aos vídeos.
const TRACKING_LONGOS = join(ROOT, '.github', 'data', 'youtube-longos-published.json');
/** Fronteira Short/longo em segundos (limite do YouTube para Shorts desde out/2024). */
const SHORT_MAX_SEG = 180;

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

/**
 * ♦ 03/10/2026 — A RÉGUA DO VÍDEO LONGO. **Os 70% são de SHORT e não servem aqui.**
 *
 * 🔴 Até hoje `avaliarRetencao` aplicava 70% a tudo o que recebesse. Não dava erro
 * porque **nenhum vídeo longo chegava a esta função** — eles nem eram medidos. No
 * dia em que entrassem, os oito reprovavam todos, e nascia um alarme que dispara
 * sempre, que é a lição que esta casa já pagou duas vezes.
 *
 * São coisas diferentes:
 *   - **Short** repete em ciclo e dura 16s. Passar dos 100% é normal e é o melhor
 *     sinal que existe. 70% é exigente mas alcançável — e foi ordem do dono.
 *   - **Longo** tem 6 minutos e ninguém revê. A referência do ramo é **40%** (fica
 *     à frente de 83% dos canais) e **50% multiplica por três** a probabilidade de
 *     ser recomendado. Exigir 70% a um vídeo de 6 minutos é exigir o impossível.
 */
export const RETENCAO_MINIMA_LONGO = 0.40;

/**
 * ⚠️ **E O MÍNIMO DE AUDIÊNCIA TAMBÉM MUDA — este número é o que impede uma
 * mentira confortável.**
 *
 * Os longos deste canal têm hoje **13 a 59 visualizações**. Com 13, uma única
 * pessoa vale quase 8% do resultado; dois espectadores mexem a percentagem em
 * quinze pontos. Dizer *"a retenção dos longos é 24%, logo a abertura está errada"*
 * com essa base é **inventar defeito** — e foi exactamente o que uma avaliação
 * externa fez em 02/10.
 *
 * 50 é o mínimo para a conta começar a valer. Hoje isso deixa quase todos os
 * longos em *"ainda não sei"* — **e isso é a resposta certa**, não uma falha da
 * medição. Quando o canal crescer, eles entram sozinhos.
 */
export const VISUALIZACOES_MINIMAS_LONGO = 50;

/** A régua certa para o formato do vídeo. Sem formato conhecido, vale a de Short. */
export function reguaDoFormato(formato) {
  return formato === 'longo'
    ? { minimo: RETENCAO_MINIMA_LONGO, minViews: VISUALIZACOES_MINIMAS_LONGO, nome: 'longo' }
    : { minimo: RETENCAO_MINIMA, minViews: VISUALIZACOES_MINIMAS, nome: 'short' };
}

/**
 * ♦ 17/09/2026 — A MEDIANA, E POR QUE ELA SUBSTITUI A MÉDIA NO RANKING DOS GANCHOS.
 *
 * 🔴 **MEDIDO:** um Short de 16s deixado em loop deu **20.654%** de percentagem média
 * com **5 visualizações** — uma pessoa deixou-o a repetir. Outro deu 5.232%. Na média,
 * esses dois sozinhos punham o gancho "vocês viram" em **2996%** e o "começa assim" em
 * **905%**, quando as medianas reais são **39%** e **57%**.
 *
 * ⚠️ Em Shorts a média NÃO SERVE para comparar ganchos: a métrica não tem tecto (o loop
 * conta cada revisão) e um único vídeo esquecido a tocar decide o ranking inteiro. A
 * mediana não se move com isso. É a mesma lição de [[regua-grossa-demais-inventa-defeito]].
 *
 * A média continua a valer para o RESUMO do canal, onde ninguém a usa para decidir nada.
 */
export function mediana(lista, f = (x) => x) {
  const vals = (lista || []).map(f).filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!vals.length) return null;
  const meio = Math.floor(vals.length / 2);
  return vals.length % 2 ? vals[meio] : (vals[meio - 1] + vals[meio]) / 2;
}

/**
 * ♦ 03/10/2026 — **a régua passou a sair do FORMATO do vídeo.**
 *
 * ⚠️ Os parâmetros `minimo`/`minViews` continuam a existir e a ter os valores de
 * Short por omissão — `validar-metadados-short.js` e `temas-vida.js` dependem
 * disso, e partir dois ficheiros provados para arrumar este seria o remédio pior
 * que a doença. Quem **não** passa régua à mão e manda vídeos com
 * `formato: 'longo'` passa a ser julgado pela régua do longo.
 */
export function avaliarRetencao(videos, { minimo = null, minViews = null } = {}) {
  const abaixo = [];
  const acima = [];
  const semAudiencia = [];
  for (const v of videos || []) {
    // Régua à mão ganha sempre (é o caso das provas de mesa); senão, vem do formato.
    const r = reguaDoFormato(v?.formato);
    const alvo = minimo != null ? minimo : r.minimo;
    const alvoViews = minViews != null ? minViews : r.minViews;

    const p = v?.percentagemMedia;
    if (typeof p !== 'number' || !Number.isFinite(p)) { semAudiencia.push(v); continue; }
    if ((v.views || 0) < alvoViews) { semAudiencia.push(v); continue; }
    (p < alvo ? abaixo : acima).push(v);
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

/**
 * Duração real de cada vídeo (para traduzir percentagem em SEGUNDOS).
 *
 * ♦ 17/09/2026 — **passou a trazer também COMENTÁRIOS e GOSTOS**, e na mesma chamada.
 *
 * Por quê: a decisão de manter ou cortar o Short de 50s assenta numa frase do dono de
 * 07/08 — *"o de 16s traz alcance; o de 50s traz gente a comentar, que é o motor do
 * canal"*. **Isso nunca foi medido.** O relatório trazia views e retenção, e nenhum
 * ficheiro deste repositório sabia quantos comentários cada vídeo tem.
 *
 * ⚠️ `statistics` vem na MESMA chamada de `contentDetails` — não custa um pedido a mais
 * nem uma unidade de quota a mais. A única razão para não estar aqui desde o início é
 * que ninguém precisou.
 */
async function fetchDurations(token, ids) {
  const out = {};
  for (let i = 0; i < ids.length; i += 50) {
    const lote = ids.slice(i, i + 50);
    const url = `${VIDEOS_URL}?part=contentDetails,status,statistics&id=${lote.join(',')}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) continue; // duração é um extra: sem ela mostramos só percentagens
    const data = await res.json();
    for (const item of data.items || []) {
      const m = /^PT(?:(\d+)M)?(?:(\d+)S)?$/.exec(item?.contentDetails?.duration || '');
      // ⚠️ `commentCount` não vem quando os comentários estão desligados — aí é null
      // (não sabemos), que é diferente de 0 (sabemos que ninguém comentou).
      const st = item?.statistics || {};
      const num = (v) => (v == null ? null : Number(v));
      out[item.id] = {
        segundos: m ? (Number(m[1] || 0) * 60 + Number(m[2] || 0)) : null,
        privacidade: item?.status?.privacyStatus || '?',
        comentarios: num(st.commentCount),
        gostos: num(st.likeCount),
      };
    }
  }
  return out;
}

/**
 * OS VÍDEOS LONGOS — e por que NÃO saem do ficheiro de registo.
 *
 * ♦ 03/10/2026, conserto nº3. A ideia inicial era simplesmente ler o segundo
 * ficheiro de registo (`youtube-longos-published.json`, 8 vídeos). **Medido antes
 * de escrever, e ainda bem:**
 *
 * | longo | está no registo? | impressões de capa |
 * |---|---|---|
 * | Mesmo salário por 30 anos | 🔴 **não** | **7.305** |
 * | Dois homens, mesmo salário | 🔴 **não** | **3.765** |
 * | Como meu amigo conseguiu aposentar | 🔴 **não** | **2.137** |
 * | Dívida do cartão | sim | 3.854 |
 * | Por que um amigo já aposentou | sim | 764 |
 *
 * 🔴 **Os três longos com MAIS gente a ver a capa não estão em registo nenhum** —
 * 13.207 das 17.825 impressões. Ler o ficheiro teria medido 8 vídeos e perdido
 * exactamente os que interessam, com ar de trabalho feito.
 *
 * ⚠️ Além disso o registo guarda o título **planeado**, não o publicado: para
 * `WaXL2ST00eE` ele diz *"Mesmo salário por 30 anos…"* e no canal está *"Por que um
 * amigo já aposentou…"*. Quem decide o que existe é o **canal**, não o ficheiro.
 *
 * Por isso a lista vem da lista de envios do próprio canal. O registo entra só
 * para dar o `slug` a quem o tiver — é conveniência, não fonte de verdade.
 */
async function listarLongosDoCanal(token, registo = {}) {
  // 1. A playlist onde o YouTube guarda tudo o que o canal publicou.
  const rc = await fetch(`${CHANNELS_URL}?part=contentDetails&mine=true`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!rc.ok) throw new Error(`Não deu para ler o canal (${rc.status})`);
  const canal = await rc.json();
  const playlist = canal?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!playlist) throw new Error('O canal não devolveu a lista de envios.');

  // 2. Todos os ids, de 50 em 50.
  const ids = [];
  let pagina = '';
  do {
    const url = `${PLAYLIST_URL}?part=contentDetails&maxResults=50&playlistId=${playlist}`
      + (pagina ? `&pageToken=${pagina}` : '');
    const rp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!rp.ok) break;
    const dados = await rp.json();
    for (const item of dados.items || []) {
      const id = item?.contentDetails?.videoId;
      if (id) ids.push(id);
    }
    pagina = dados.nextPageToken || '';
  } while (pagina);

  // 3. Duração e título reais, e fica só o que passa dos 3 minutos.
  const ficha = await fetchDurations(token, ids);
  const slugPorId = {};
  for (const [slug, v] of Object.entries(registo)) if (v?.videoId) slugPorId[v.videoId] = slug;

  const longos = [];
  for (const id of ids) {
    const f = ficha[id];
    if (!f || !Number.isFinite(f.segundos) || f.segundos <= SHORT_MAX_SEG) continue;
    longos.push({
      slug: slugPorId[id] || id,
      videoId: id,
      formato: 'longo',
      uploadedAt: registo[slugPorId[id]]?.uploadedAt || null,
      foraDoRegisto: !slugPorId[id],
    });
  }
  return longos;
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
    .map(([slug, v]) => ({ slug, ...v, formato: 'short' }))
    .filter((v) => v.videoId)
    .sort((a, b) => String(a.uploadedAt).localeCompare(String(b.uploadedAt)));

  const token = await getAccessToken();

  /**
   * ♦ 03/10/2026 — OS LONGOS ENTRAM NA MEDIÇÃO (conserto nº3).
   *
   * Vêm da lista de envios do canal, não do ficheiro de registo — ver
   * `listarLongosDoCanal`. Se a leitura falhar, os Shorts continuam a ser medidos
   * na mesma: **o conserto novo não pode levar abaixo a medição que já funcionava.**
   */
  let longos = [];
  let erroLongos = null;
  try {
    const registoLongos = existsSync(TRACKING_LONGOS)
      ? JSON.parse(readFileSync(TRACKING_LONGOS, 'utf-8')) || {}
      : {};
    longos = await listarLongosDoCanal(token, registoLongos);
    const desconhecidos = longos.filter((v) => v.foraDoRegisto).length;
    log(`🎬 ${longos.length} vídeo(s) longo(s) no canal`
      + (desconhecidos ? ` — 🔴 ${desconhecidos} deles NÃO constam do registo de publicados` : '')
      + '.');
  } catch (e) {
    erroLongos = e.message;
    log(`⚠️ Não deu para listar os longos: ${e.message} (os Shorts são medidos na mesma)`);
  }

  // Um longo que também esteja no registo de Shorts não pode entrar duas vezes.
  const jaTem = new Set(videos.map((v) => v.videoId));
  for (const l of longos) {
    if (jaTem.has(l.videoId)) {
      // Estava marcado como Short por engano do registo: a duração real manda.
      const v = videos.find((x) => x.videoId === l.videoId);
      if (v) { v.formato = 'longo'; v.foraDoRegisto = false; }
    } else {
      videos.push(l);
    }
  }

  if (ONLY_VIDEO) videos = videos.filter((v) => v.videoId === ONLY_VIDEO);
  if (!videos.length) throw new Error('Nenhum vídeo para medir.');

  const quantos = (f) => videos.filter((v) => v.formato === f).length;
  log(`🔑 Acesso renovado. Medindo ${videos.length} vídeo(s) — ${quantos('short')} Short(s) e ${quantos('longo')} longo(s).\n`);

  const hoje = new Date().toISOString().slice(0, 10);
  /**
   * ⚠️ O início da janela é a data mais ANTIGA de todas, não a do primeiro da
   * lista. Os longos vêm do canal e muitos não têm data no registo — se um deles
   * ficasse à cabeça, a janela de medição começava hoje e **a Analytics devolvia
   * zero para o canal inteiro**, sem dar erro nenhum.
   */
  const datas = videos.map((v) => String(v.uploadedAt || '').slice(0, 10)).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
  const primeiro = datas.length ? datas.sort()[0] : '2026-01-01';

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
      // ⚠️ É este campo que escolhe a RÉGUA lá em baixo (70% para Short, 40% para
      // longo). Sem ele, o vídeo é julgado como Short — ver `reguaDoFormato`.
      formato: v.formato || 'short',
      foraDoRegisto: Boolean(v.foraDoRegisto),
      publicadoEm: String(v.uploadedAt || '').slice(0, 10),
      privacidade: meta[v.videoId]?.privacidade || '?',
      duracaoSeg: dur,
      comentarios: meta[v.videoId]?.comentarios ?? null,
      gostos: meta[v.videoId]?.gostos ?? null,
      ...(porVideo[v.videoId] || {}),
      curva,
      erro,
    });
  }

  // ── Relatório humano ───────────────────────────────────────────────────────
  const linhas = [];
  // ⚠️ 03/10 — a coluna do FORMATO entra porque sem ela a tabela mistura um Short
  // de 16s com um vídeo de 6 minutos e os números ficam incomparáveis à vista.
  linhas.push('| vídeo | formato | publicado | estado | views | % médio | metade sai aos | fim |');
  linhas.push('|---|---|---|---|---|---|---|---|');
  for (const r of resultados) {
    const fmt = r.formato === 'longo' ? (r.foraDoRegisto ? 'longo ⚠️' : 'longo') : 'short';
    linhas.push(`| ${r.slug} | ${fmt} | ${r.publicadoEm || '—'} | ${r.privacidade} | ${r.views ?? '—'} | ${pc(r.percentagemMedia)} | ${r.curva?.metadeSaiEmSegundos != null ? `${r.curva.metadeSaiEmSegundos}s` : '—'} | ${pc(r.curva?.noFim)} |`);
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
    /**
     * ⚠️ 03/10/2026 — **o vídeo longo NÃO entra no ranking dos ganchos, e isto não
     * é arrumação: é o que impede um estrago.**
     *
     * Os ganchos em rodízio são dos Shorts, e `temas-vida.js` lê este ranking para
     * escolher o gancho do Short seguinte. Um longo sem roteiro de Short cairia no
     * saco `short50` por omissão e passaria a pesar numa decisão que não é dele —
     * com 6 minutos e 24% de retenção, puxava para baixo o gancho que lhe calhasse.
     */
    if (r.formato === 'longo') {
      if (!porFormato.has('longo')) porFormato.set('longo', []);
      porFormato.get('longo').push(r);
      continue;
    }

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

  /**
   * ♦ 17/09/2026 — ESTE QUADRO EXISTE PARA RESPONDER A UMA PERGUNTA CONCRETA:
   * **vale a pena manter o Short de 50s?**
   *
   * A razão de ele existir é uma frase do dono (07/08): *"o de 16s traz alcance; o de
   * 50s traz gente a comentar, que é o motor do canal"*. Nunca foi medida. Por isso o
   * quadro deixou de mostrar só a percentagem assistida e passa a pôr lado a lado o que
   * cada formato CUSTA e o que cada formato TRAZ — incluindo os comentários, que são a
   * própria premissa da decisão.
   *
   * ⚠️ **MEDIANA, nunca média** — em Shorts um vídeo esquecido em loop dá 20.654% e
   * decide sozinho qualquer média (ver `mediana()`, lá em cima).
   */
  if (porFormato.size > 1) {
    log('');
    log('══════════ POR FORMATO — O QUE CADA UM TRAZ ══════════');
    log('formato              | vídeos | views (soma) | mediana | retenção | comentários');
    for (const [formato, lista] of porFormato) {
      const nome = formato === 'loop16' ? 'Short de 16s (loop)'
        : formato === 'longo' ? 'Vídeo longo' : 'Short de 50s';
      const comV = lista.filter((r) => (r.views || 0) > 0);
      const somaViews = lista.reduce((a, r) => a + (r.views || 0), 0);
      const comCom = lista.filter((r) => Number.isFinite(r.comentarios));
      const somaCom = comCom.reduce((a, r) => a + r.comentarios, 0);
      log(
        `${nome.padEnd(20)} | ${String(lista.length).padStart(6)} | ${String(somaViews).padStart(12)}`
        + ` | ${String(mediana(lista, (r) => r.views || 0) ?? '—').padStart(7)}`
        + ` | ${pc(mediana(comV, (r) => r.percentagemMedia)).padStart(8)}`
        + ` | ${comCom.length ? `${somaCom} em ${comCom.length} vídeo(s)` : '— (sem dados)'}`,
      );
    }
    log('');
    log('⚠️ O canal responde a si próprio em cada vídeo (o robô do "comenta FINMOOVI"),');
    log('   por isso 1 comentário por vídeo é o CHÃO, não é audiência. O que conta é o que passa disso.');
  }

  /**
   * ⚠️ **O RANKING PASSA A SER GRAVADO, NÃO SÓ IMPRESSO — 17/09/2026.**
   *
   * Até hoje esta secção calculava qual gancho segura gente, escrevia-o no registo da
   * corrida e **deitava-o fora**: o `payload` lá em baixo nunca o levava. Do outro lado,
   * `temas-vida.js` escolhia o gancho seguinte por *"quem usou menos"* — nunca por *"quem
   * segura gente"*. **O canal media há semanas e nunca agia sobre a medição:** um gancho
   * com 22% de mediana saía tantas vezes como um de 107%.
   *
   * Agora sai em `ganchos[]` e é `escolherPenalizado()` (em `temas-vida.js`) que o lê.
   * ⚠️ **`medianaRetencao` é o campo que decide** — a `media` fica ao lado só para se ver
   * a diferença, e para quem abrir o ficheiro perceber por que não é ela a mandar.
   */
  let ranking = [];
  if (porGancho.size) {
    log('');
    log('══════════ QUAL GANCHO SEGURA GENTE ══════════');
    ranking = [...porGancho.entries()]
      .map(([familia, lista]) => {
        const comV = lista.filter((r) => (r.views || 0) > 0);
        return {
          familia,
          n: lista.length,
          comAudiencia: comV.length,
          medianaRetencao: mediana(comV, (r) => r.percentagemMedia),
          medianaViews: mediana(lista, (r) => r.views || 0),
          media: media(comV, (r) => r.percentagemMedia),
        };
      })
      .sort((a, b) => (b.medianaRetencao ?? -1) - (a.medianaRetencao ?? -1));

    for (const g of ranking) {
      const nota = g.comAudiencia === 0
        ? '(ainda sem audiência)'
        : (g.comAudiencia < 3 ? `(só ${g.comAudiencia} com audiência — ainda é cedo)` : '');
      // A média vai entre parênteses quando foge muito da mediana: é o sinal de que
      // há um vídeo esquecido em loop a puxar o número, e evita o susto de quem lê.
      const distorcida = g.media != null && g.medianaRetencao != null && g.media > g.medianaRetencao * 2;
      log(`${String(g.familia).padEnd(22)} ${pc(g.medianaRetencao).padStart(5)}  ·  ${g.n} vídeo(s) ${nota}${distorcida ? `  ⚠️ média ${pc(g.media)}, distorcida por um loop` : ''}`);
    }

    const maduros = ranking.filter((g) => g.comAudiencia >= 3 && g.medianaRetencao != null);
    if (maduros.length >= 3) {
      const melhor = maduros[0];
      const pior = maduros[maduros.length - 1];
      log('');
      log(`🏆 melhor: "${melhor.familia}" (${pc(melhor.medianaRetencao)})   ·   🥀 pior: "${pior.familia}" (${pc(pior.medianaRetencao)})`);
    } else {
      log('');
      log('⏳ Ainda cedo para eleger o melhor gancho: é preciso pelo menos 3 vídeos COM audiência por gancho.');
      log('   A 2 vídeos por dia e 10 ganchos em rodízio, isso são cerca de duas semanas.');
    }
  }

  /**
   * ── O AVISO, AGORA COM UMA RÉGUA PARA CADA FORMATO ──────────────────────────
   *
   * ♦ 06/08/2026 os 70% foram ordem do dono, e continuam a valer **para os Shorts**.
   * ♦ 03/10/2026 (conserto nº4) o vídeo longo passou a ser julgado pela régua dele:
   * **40% de percentagem assistida e 50 visualizações** para a conta valer alguma
   * coisa. Ver `reguaDoFormato` lá em cima, onde está o porquê de cada número.
   *
   * 🔴 **Isto tinha de vir no mesmo dia que a entrada dos longos (conserto nº3).**
   * Medir os longos com a régua de Short faria os oito reprovarem de uma vez — um
   * alarme que dispara sempre é um alarme que ninguém lê, e é das poucas coisas que
   * esta casa já pagou duas vezes.
   */
  const avisoLinhas = [];
  const porRegua = [
    { formato: 'short', titulo: 'SHORTS', r: reguaDoFormato('short') },
    { formato: 'longo', titulo: 'VÍDEOS LONGOS', r: reguaDoFormato('longo') },
  ];
  const vereditos = {};

  log('');
  for (const { formato, titulo, r } of porRegua) {
    const doFormato = resultados.filter((x) => (x.formato || 'short') === formato);
    if (!doFormato.length) continue;
    const v = avaliarRetencao(doFormato);
    vereditos[formato] = v;

    avisoLinhas.push(`### ${titulo} — régua: ${Math.round(r.minimo * 100)}% (mínimo ${r.minViews} visualizações)`);
    if (v.abaixo.length) {
      avisoLinhas.push(`🔴 **${v.abaixo.length} abaixo de ${Math.round(r.minimo * 100)}%** — é preciso mudar alguma coisa:`);
      for (const x of v.abaixo) avisoLinhas.push(`- ${pc(x.percentagemMedia)} · ${x.slug} (${x.views} visualizações) · https://youtu.be/${x.videoId}`);
    } else if (v.acima.length) {
      avisoLinhas.push(`✅ Nenhum abaixo de ${Math.round(r.minimo * 100)}%. Os ${v.acima.length} com audiência estão bem.`);
    } else {
      avisoLinhas.push(`⏳ **Ainda não dá para julgar nenhum.** Nenhum chegou às ${r.minViews} visualizações — abaixo disso a percentagem é acaso, não sinal.`);
    }
    if (v.semAudiencia.length) {
      avisoLinhas.push(`⏳ ${v.semAudiencia.length} ainda sem audiência suficiente (menos de ${r.minViews}) — não são julgados.`);
    }
    avisoLinhas.push('');
  }
  log('══════════ O AVISO, POR FORMATO ══════════');
  log(avisoLinhas.join('\n').replace(/\*\*/g, '').replace(/^### /gm, ''));

  // Compatibilidade: o veredito "solto" continua a ser o dos Shorts, que é o que o
  // payload sempre guardou e o que `temas-vida.js` espera encontrar.
  const veredito = vereditos.short || { abaixo: [], acima: [], semAudiencia: [] };

  /**
   * ── O CLIQUE NA CAPA (02/10/2026) ────────────────────────────────────────────
   *
   * 🔴 **O número que decide o canal não era medido por ninguém até hoje.** Este
   * ficheiro media com todo o cuidado o que acontece DEPOIS do clique — retenção,
   * curva, ganchos — e **não media o clique**. Medido nos dados do Studio: os
   * longos aparecem 7.305 e 3.854 vezes e são clicados **0,41%** e **0,36%** das
   * vezes, contra uma média de ramo de **5,5%**. É aí que o canal está a travar.
   *
   * ⚠️ Vem de OUTRA API (a Reporting), por isso está num ficheiro próprio: a
   * Analytics API que o resto deste robô usa **não tem** impressão de capa, e a
   * métrica dela com nome parecido é impressão de ANÚNCIO. Ver o cabeçalho de
   * `src/scripts/apis/youtube-reporting.js`.
   *
   * ⚠️ **ESTA SECÇÃO NUNCA PARTE A MEDIÇÃO QUE JÁ FUNCIONAVA.** Se a Reporting API
   * falhar, se o trabalho ainda não existir, ou se o Google ainda não tiver
   * despejado ficheiro, dizemos isso e seguimos. A retenção dos Shorts é
   * independente disto.
   */
  let capas = { estado: 'nao-medido' };
  const capasLinhas = [];
  try {
    capas = await relatorioDeCapas({ dias: 28, token });
  } catch (e) {
    capas = { estado: 'erro', erro: e.message };
  }

  log('');
  log('══════════ O CLIQUE NA CAPA ══════════');
  if (capas.estado === 'sem-trabalho') {
    capasLinhas.push('🔴 **Ninguém está a recolher as impressões de capa.** O trabalho da Reporting API ainda não foi criado.');
    capasLinhas.push('   Correr UMA VEZ: Actions → «YouTube — ligar a medição da capa (à mão)».');
  } else if (capas.estado === 'sem-ficheiros') {
    capasLinhas.push(`⏳ **A medição da capa está ligada** (desde ${String(capas.criadoEm).slice(0, 10)}) mas o Google ainda não despejou ficheiro.`);
    capasLinhas.push('   É normal até 48h depois de ligar. Não há número para mostrar — e inventar um seria pior.');
  } else if (capas.estado === 'ok') {
    const pcCtr = (v) => (v == null ? '—' : `${(v * 100).toFixed(2)}%`);
    capasLinhas.push(`Janela: ${capas.dias} dia(s) · escala do CTR: ${capas.escala.nome}`);
    capasLinhas.push(`**Canal: ${capas.totais.impressoes} impressões de capa · CTR ${pcCtr(capas.totais.ctr)}**`);
    capasLinhas.push('');
    capasLinhas.push('| vídeo | formato | impressões | CTR | régua |');
    capasLinhas.push('|---|---|---|---|---|');

    /**
     * ⚠️ **A RÉGUA SÓ SE APLICA A QUEM TEM GENTE SUFICIENTE.** Com 50 impressões
     * não se distingue 1% de 4% — e um aviso que dispara em tudo é um aviso que
     * ninguém lê, lição que esta casa já pagou duas vezes.
     *
     * 300 impressões é o mínimo; a régua é **4%** (o chão do saudável em qualquer
     * ramo, fonte: guia de CTR do `claude-youtube`), e a média do nosso ramo
     * (Finanças/Negócios) é 5,5%. Usamos o 4% para não acusar ninguém à toa.
     *
     * ⚠️ E só vale para vídeo LONGO. **Em Short a capa não conta** — o vídeo toca
     * sozinho no fio, ninguém escolhe pela imagem. Julgar um Short por CTR de capa
     * seria inventar defeito.
     */
    const IMPRESSOES_MINIMAS = 300;
    const CTR_MINIMO = 0.04;
    const julgados = [];
    for (const v of capas.videos.slice(0, 12)) {
      let veredito = '';
      if (v.formato === 'short') veredito = '— (capa não conta em Short)';
      else if (v.impressoes < IMPRESSOES_MINIMAS) veredito = `⏳ cedo (< ${IMPRESSOES_MINIMAS} imp.)`;
      else if (v.ctr == null) veredito = '—';
      else if (v.ctr < CTR_MINIMO) { veredito = `🔴 abaixo de ${CTR_MINIMO * 100}%`; julgados.push(v); }
      else veredito = '✅';
      capasLinhas.push(`| ${(v.titulo || v.id).slice(0, 50)} | ${v.formato || '?'} | ${v.impressoes} | ${pcCtr(v.ctr)} | ${veredito} |`);
    }
    if (julgados.length) {
      capasLinhas.push('');
      capasLinhas.push(`🔴 **${julgados.length} vídeo(s) longo(s) com gente a ver a capa e quase ninguém a clicar.** Trocar capa e título é o trabalho de maior efeito no canal agora.`);
    }
  } else if (capas.estado === 'erro') {
    capasLinhas.push(`⚠️ Não deu para medir a capa desta vez: ${capas.erro}`);
    capasLinhas.push('   A retenção acima não é afectada por isto.');
  }
  log(capasLinhas.join('\n').replace(/\*\*/g, ''));

  const resumoDoVeredito = (v) => ({
    abaixo: (v?.abaixo || []).map((x) => ({ slug: x.slug, videoId: x.videoId, percentagemMedia: x.percentagemMedia, views: x.views })),
    julgados: (v?.abaixo?.length || 0) + (v?.acima?.length || 0),
    semAudiencia: v?.semAudiencia?.length || 0,
  });

  const payload = { medidoEm: new Date().toISOString(), resumo, aviso: {
    // ⚠️ Estes dois campos continuam a ser os do SHORT, com os mesmos nomes de
    // sempre: é o que `temas-vida.js` e o validador dos metadados leem. O longo
    // vive ao lado, em `avisoPorFormato`, para não mudar o significado do que já
    // era lido — regra velha a correr em estrutura nova é o defeito nº1 da casa.
    minimo: RETENCAO_MINIMA,
    visualizacoesMinimas: VISUALIZACOES_MINIMAS,
    ...resumoDoVeredito(veredito),
  },
  // ♦ 03/10/2026 — conserto nº4: cada formato com a sua régua, e as duas gravadas.
  avisoPorFormato: {
    short: { minimo: RETENCAO_MINIMA, visualizacoesMinimas: VISUALIZACOES_MINIMAS, ...resumoDoVeredito(vereditos.short) },
    longo: { minimo: RETENCAO_MINIMA_LONGO, visualizacoesMinimas: VISUALIZACOES_MINIMAS_LONGO, ...resumoDoVeredito(vereditos.longo) },
  },
  // ♦ 03/10/2026 — conserto nº3: quantos longos o canal tem e quantos o registo
  // de publicados não conhecia (eram 3 dos 5 com mais gente a ver a capa).
  longos: {
    medidos: resultados.filter((r) => r.formato === 'longo').length,
    foraDoRegisto: resultados.filter((r) => r.formato === 'longo' && r.foraDoRegisto).length,
    erro: erroLongos,
  },
  // ⚠️ É ISTO que `temas-vida.js` lê para decidir o gancho do vídeo seguinte. Antes de
  // 17/09 este bloco não existia e a medição morria no registo da corrida.
  ganchos: ranking,
  // ⚠️ 02/10/2026 — o clique na capa fica GRAVADO, não só impresso. A lição de
  // 17/09 foi exactamente esta: durante semanas o ranking dos ganchos era
  // calculado, escrito no registo da corrida e deitado fora. Guardado aqui, dá
  // para comparar o CTR de hoje com o de dentro de um mês — que é a única forma
  // de saber se trocar a capa funcionou.
  capas: capas.estado === 'ok'
    ? {
      estado: 'ok',
      janela: capas.janela,
      dias: capas.dias,
      escala: capas.escala.nome,
      totais: capas.totais,
      videos: capas.videos.map((v) => ({
        id: v.id, titulo: v.titulo || null, formato: v.formato || null,
        impressoes: v.impressoes, ctr: v.ctr,
      })),
    }
    : capas,
  videos: resultados };
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8');
  log(`\n📝 Gravado em ${OUT}`);

  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY,
      `## 📉 Retenção — Shorts e vídeos longos\n\n${avisoLinhas.join('\n')}\n\n${linhas.join('\n')}\n\n`
      + (resultados.some((r) => r.foraDoRegisto)
        ? `⚠️ Os marcados **longo ⚠️** não constam do registo de publicados — foram encontrados no próprio canal.\n\n`
        : '') +
      (resumo.comCurva
        ? `**Início (100% = visto 1×, acima disso = revisto):** ${pc(resumo.ficamAte3s)} · **a meio:** ${pc(resumo.ficamAte50pc)} · **no fim:** ${pc(resumo.ficamAteAoFim)} · **metade sai aos:** ${resumo.metadeSaiAosSegundos == null ? '—' : `${Math.round(resumo.metadeSaiAosSegundos)}s`}\n`
        : `⚠️ Sem curva: audiência pequena de mais.\n`)
      // O clique na capa vai no MESMO resumo, logo abaixo: é o número de maior
      // efeito no canal hoje e não pode ficar escondido no registo da corrida.
      + `\n## 🖼️ O clique na capa\n\n${capasLinhas.join('\n')}\n`);
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
