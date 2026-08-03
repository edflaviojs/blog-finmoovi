/**
 * benchmark-youtube-trends.js — Weekly YouTube trend intelligence collector.
 *
 * Uses YouTube Data API v3 to discover high-performing finance videos,
 * extract title/hook/duration patterns, and save structured intelligence
 * to .github/data/youtube-trends.json for consumption by the Shorts pipeline.
 *
 * Quota: ~404 units per run (free tier = 10,000/day).
 * Runs weekly via .github/workflows/youtube-benchmark.yml (Sundays 04:00 UTC).
 *
 * Env: YOUTUBE_API_KEY (Data API key, read-only — NOT the OAuth upload key).
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const API_BASE = 'https://www.googleapis.com/youtube/v3';
const API_KEY = process.env.YOUTUBE_API_KEY;
const OUTPUT = join(process.cwd(), '.github', 'data', 'youtube-trends.json');

/**
 * AS BUSCAS — a LENTE do detetive, e a peça mais subjetiva de todo o sistema.
 *
 * O detetive não vê o YouTube: vê o que estas frases encontram. Tudo o que cair
 * fora delas é invisível para o canal. Por isso ficam aqui em cima, à vista, e
 * mexer nelas é decisão editorial do dono — não afinação técnica.
 *
 * ♦ 03/08/2026 (ordem do dono): `controle de gastos app` saiu — trazia sobretudo
 * publicidade a aplicações concorrentes, não conversa sobre dinheiro. Entrou
 * `sair do vermelho`, que é como as pessoas dizem o problema que o FinMoovi
 * resolve. ⚠️ Com esta troca o pilar `ferramentas` fica sem busca própria.
 */
const QUERIES = [
  { q: 'finanças pessoais dicas', pillar: 'controle' },
  { q: 'como investir pouco dinheiro', pillar: 'investimento' },
  { q: 'educação financeira', pillar: 'mindset' },
  { q: 'sair do vermelho', pillar: 'controle' },
  // A 5ª busca devolve ao pilar `ferramentas` a sua janela, sem repetir o erro
  // da que saiu: procurar por "app" trazia publicidade de aplicações rivais.
  // "planilha de gastos" traz quem JÁ está a tentar organizar-se com uma
  // ferramenta — e é exatamente essa pessoa que o FinMoovi serve melhor do que
  // a planilha. Custo: ~1% da cota diária da API.
  { q: 'planilha de gastos', pillar: 'ferramentas' },
];

// Filters
const MIN_VIEWS_PER_DAY = 100;
const MIN_LIKE_RATIO = 0.02;
const MAX_AGE_DAYS = 60;
const RESULTS_PER_QUERY = 50;

/**
 * Makes a GET request to the YouTube Data API v3.
 * @param {string} endpoint - API endpoint (e.g. 'search', 'videos')
 * @param {Record<string, string>} params - Query parameters
 * @returns {Promise<object>} Parsed JSON response
 */
async function apiGet(endpoint, params) {
  const url = new URL(`${API_BASE}/${endpoint}`);
  url.searchParams.set('key', API_KEY);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`YouTube API ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

/**
 * Searches for recent short-form finance videos in pt-BR.
 * @param {string} query - Search query string
 * @returns {Promise<object>} YouTube search response
 */
async function searchVideos(query) {
  return apiGet('search', {
    part: 'snippet',
    q: query,
    type: 'video',
    order: 'viewCount',
    publishedAfter: new Date(Date.now() - MAX_AGE_DAYS * 86400000).toISOString(),
    regionCode: 'BR',
    relevanceLanguage: 'pt',
    maxResults: String(RESULTS_PER_QUERY),
  });
}

/**
 * Fetches statistics for a batch of video IDs.
 * @param {string[]} videoIds - Array of YouTube video IDs (max 50)
 * @returns {Promise<object>} YouTube videos response with statistics
 */
async function getVideoStats(videoIds) {
  return apiGet('videos', {
    part: 'statistics,contentDetails,snippet',
    id: videoIds.join(','),
  });
}

/**
 * Extracts title patterns and performance metrics from a video.
 * @param {object} video - Search result item
 * @param {object} stats - Video statistics item
 * @returns {object} Structured pattern data
 */
/**
 * Duração ISO-8601 do YouTube ("PT1M30S") em segundos. Devolve null se faltar.
 */
function duracaoEmSegundos(iso) {
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(String(iso || ''));
  if (!m) return null;
  return Number(m[1] || 0) * 86400 + Number(m[2] || 0) * 3600 + Number(m[3] || 0) * 60 + Number(m[4] || 0);
}

/**
 * ♦ 03/08/2026 — SHORT OU VÍDEO LONGO? (pedido do dono)
 *
 * O coletor já pedia a duração ao YouTube e deitava-a fora. Sem ela, estávamos a
 * aprender formas de título de vídeos de 15 minutos e a aplicá-las a Shorts de
 * 50 segundos — e são jogos diferentes: num, o título vende um CLIQUE; no
 * outro, o vídeo já está a tocar antes de alguém ler o título.
 *
 * 180s é o teto atual dos Shorts no YouTube; é o melhor indicador que a API dá
 * sem adivinhar. Guardamos também os segundos, para se poder afinar depois.
 */
const TETO_SHORT_SEG = 180;

/**
 * ♦ 03/08/2026 — MARCAR O IDIOMA EM VEZ DE FINGIR QUE É TUDO PT (pedido do dono)
 *
 * Pedimos à API conteúdo em pt-BR, mas isso é uma SUGESTÃO, não uma regra: o
 * vídeo nº1 da colheita de 03/08 chamava-se "Financial Literacy Exercise" e o
 * nº2 era espanhol. Um viral estrangeiro continua a ensinar a FORMA do título —
 * por isso marca-se, não se deita fora. Quem decide o que fazer com ele é quem
 * o consome.
 *
 * Primeiro acredita-se no que a API declara; só quando ela não declara nada é
 * que se olha para as palavras do título.
 */
const PISTAS_NAO_PT = /\b(the|your|you|how to|money|why|what|when|rich|save|budget|debt|el|la|los|las|dinero|ahorr\w*|deuda|riqueza|como ganar|por que|cuanto|mentalidad|reglas|familias)\b/i;

function detetarIdioma(stats, title) {
  const declarado = stats?.snippet?.defaultAudioLanguage || stats?.snippet?.defaultLanguage || '';
  if (declarado) return declarado.toLowerCase().startsWith('pt') ? 'pt' : declarado.toLowerCase().slice(0, 2);
  return PISTAS_NAO_PT.test(String(title || '')) ? 'nao-pt' : 'pt';
}

/**
 * ♦ 03/08/2026 — OS CAPÍTULOS DOS VÍDEOS LONGOS (a matéria-prima do nosso longo).
 *
 * Para escrever um vídeo de 6 minutos é preciso saber como os bons se ORGANIZAM:
 * quantos capítulos, que tamanho, e como abrem. Essa informação está à vista de
 * todos — os vídeos longos publicam os capítulos na descrição ("00:00 Introdução
 * / 01:20 O erro nº 1") — e a API oficial dá-nos a descrição de qualquer vídeo
 * DE GRAÇA. O coletor lia o título e deitava a descrição fora.
 *
 * Guardamos só os capítulos, nunca a descrição inteira: este ficheiro é
 * commitado todos os dias, e descrições completas inchavam o repositório sem
 * necessidade.
 *
 * Regra do YouTube: os capítulos só valem se o primeiro for 00:00 e houver pelo
 * menos três. Lista que não cumpra isso é só uma data de horas soltas no texto.
 */
function lerCapitulos(descricao, duracaoSeg) {
  const encontrados = [];
  for (const linha of String(descricao || '').split('\n')) {
    const m = /^\s*(?:[-•*]\s*)?(\d{1,2}:\d{2}(?::\d{2})?)\s*[-–—:|)]*\s*(.+?)\s*$/.exec(linha);
    if (!m) continue;
    const p = m[1].split(':').map(Number);
    const seg = p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1];
    const titulo = m[2].replace(/^[-–—:|)\s]+/, '').trim();
    if (!titulo || titulo.length > 120) continue;
    if (duracaoSeg && seg > duracaoSeg) continue; // hora que não cabe no vídeo
    if (encontrados.some((c) => c.seg === seg)) continue;
    encontrados.push({ seg, titulo });
  }
  encontrados.sort((a, b) => a.seg - b.seg);
  const valido = encontrados.length >= 3 && encontrados[0].seg === 0;
  return valido ? encontrados : null;
}

function extractPatterns(video, stats) {
  const title = video.snippet.title;
  const published = new Date(video.snippet.publishedAt);
  const ageDays = Math.max(1, (Date.now() - published) / 86400000);
  const views = Number(stats.statistics.viewCount) || 0;
  const likes = Number(stats.statistics.likeCount) || 0;
  const viewsPerDay = views / ageDays;
  const likeRatio = views > 0 ? likes / views : 0;

  // Title pattern detection
  const hasNumber = /\d/.test(title);
  const hasQuestion = /\?/.test(title);
  const hasEmoji = /[\u{1F600}-\u{1F9FF}]/u.test(title);
  const wordCount = title.split(/\s+/).length;
  const charCount = title.length;

  const duracaoSeg = duracaoEmSegundos(stats?.contentDetails?.duration);
  const formato = duracaoSeg == null ? 'desconhecido' : (duracaoSeg <= TETO_SHORT_SEG ? 'short' : 'longo');

  return {
    videoId: video.id.videoId || video.id,
    title,
    channel: video.snippet.channelTitle,
    publishedAt: video.snippet.publishedAt,
    views,
    likes,
    viewsPerDay,
    likeRatio,
    duracaoSeg,
    formato,
    idioma: detetarIdioma(stats, title),
    capitulos: lerCapitulos(stats?.snippet?.description, duracaoSeg),
    titlePatterns: {
      hasNumber,
      hasQuestion,
      hasEmoji,
      wordCount,
      charCount,
    },
  };
}

/**
 * Computes aggregate patterns from collected video data.
 * @param {Array<object>} videos - Array of extracted video patterns
 * @returns {object} Aggregate intelligence (topPattern, pillarHeat, sampleTitles, etc.)
 */
function computeAggregatePatterns(videos) {
  if (!videos.length) {
    return { topPattern: 'N/A', avgViewsPerDay: 0 };
  }

  const total = videos.length;
  const withNumber = videos.filter(v => v.titlePatterns.hasNumber).length;
  const withQuestion = videos.filter(v => v.titlePatterns.hasQuestion).length;
  const avgWordCount = videos.reduce((s, v) => s + v.titlePatterns.wordCount, 0) / total;
  const avgCharCount = videos.reduce((s, v) => s + v.titlePatterns.charCount, 0) / total;
  const avgViewsPerDay = videos.reduce((s, v) => s + v.viewsPerDay, 0) / total;

  // Top pattern = most common among top 10
  const top10 = videos.slice(0, 10);
  const patterns = top10.map(v => {
    if (v.titlePatterns.hasNumber && v.titlePatterns.hasQuestion) return 'number+question';
    if (v.titlePatterns.hasNumber) return 'number-focused';
    if (v.titlePatterns.hasQuestion) return 'question';
    return 'statement';
  });
  const freq = {};
  patterns.forEach(p => { freq[p] = (freq[p] || 0) + 1; });
  const topPattern = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] || 'mixed';

  // Pillar distribution (sum of viewsPerDay per pillar)
  const pillarHeat = {};
  videos.forEach(v => {
    pillarHeat[v.pillar] = (pillarHeat[v.pillar] || 0) + v.viewsPerDay;
  });

  return {
    topPattern,
    avgViewsPerDay: Math.round(avgViewsPerDay),
    titleStats: {
      percentWithNumber: Math.round((withNumber / total) * 100),
      percentWithQuestion: Math.round((withQuestion / total) * 100),
      avgWordCount: Math.round(avgWordCount),
      avgCharCount: Math.round(avgCharCount),
    },
    pillarHeat,
    sampleTitles: videos.slice(0, 5).map(v => v.title),
  };
}

/**
 * O ESTUDO DOS CAPÍTULOS — responde, com números, a "como é que os vídeos longos
 * de finanças se organizam?". É a entrada de desenho do NOSSO vídeo longo
 * (IMPL20 §14, fase F3): quantos capítulos, de que tamanho, e como se chama o
 * primeiro (o que abre é o que segura a audiência).
 */
function estudarCapitulos(longos) {
  const comCap = longos.filter((v) => Array.isArray(v.capitulos) && v.capitulos.length);
  if (!comCap.length) {
    return { longosAnalisados: longos.length, comCapitulos: 0 };
  }
  const media = (nums) => Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);

  const nCapitulos = comCap.map((v) => v.capitulos.length);
  // Duração do 1º capítulo = quando o 2º começa. É o "cold open" deles.
  const primeiros = comCap.map((v) => v.capitulos[1].seg).filter((s) => s > 0);
  const segundosPorCapitulo = comCap
    .filter((v) => v.duracaoSeg)
    .map((v) => Math.round(v.duracaoSeg / v.capitulos.length));

  return {
    longosAnalisados: longos.length,
    comCapitulos: comCap.length,
    mediaDeCapitulos: media(nCapitulos),
    minDeCapitulos: Math.min(...nCapitulos),
    maxDeCapitulos: Math.max(...nCapitulos),
    duracaoMediaDoPrimeiroSeg: primeiros.length ? media(primeiros) : null,
    mediaSegundosPorCapitulo: segundosPorCapitulo.length ? media(segundosPorCapitulo) : null,
    // Como eles CHAMAM a abertura e o fecho — os dois lugares onde se ganha e
    // se perde a audiência.
    aberturas: comCap.map((v) => v.capitulos[0].titulo).slice(0, 10),
    fechos: comCap.map((v) => v.capitulos[v.capitulos.length - 1].titulo).slice(0, 10),
  };
}

/**
 * Main entry point — collects trends and saves structured JSON output.
 */
async function main() {
  if (!API_KEY) {
    console.log('ℹ️ YOUTUBE_API_KEY ausente. Pulando benchmark (exit 0).');
    return;
  }

  console.log('🔍 Coletando tendências do YouTube (finanças BR)...');
  const allVideos = [];

  for (const { q, pillar } of QUERIES) {
    console.log(`  📊 Query: "${q}" (pilar: ${pillar})`);
    try {
      const searchResult = await searchVideos(q);
      const items = searchResult.items || [];
      if (!items.length) continue;

      const ids = items.map(i => i.id.videoId).filter(Boolean);

      // Batch in groups of 50
      for (let i = 0; i < ids.length; i += 50) {
        const batch = ids.slice(i, i + 50);
        const statsResult = await getVideoStats(batch);

        for (const stat of statsResult.items || []) {
          const searchItem = items.find(it => it.id.videoId === stat.id);
          if (!searchItem) continue;

          const pattern = extractPatterns(searchItem, stat);
          if (pattern.viewsPerDay >= MIN_VIEWS_PER_DAY && pattern.likeRatio >= MIN_LIKE_RATIO) {
            allVideos.push({ ...pattern, pillar });
          }
        }
      }
    } catch (err) {
      console.error(`  ⚠️ Falha na query "${q}": ${err.message}`);
    }
  }

  // Sort by views/day descending
  allVideos.sort((a, b) => b.viewsPerDay - a.viewsPerDay);

  // Aggregate patterns
  const aggregate = computeAggregatePatterns(allVideos);

  // ♦ 03/08/2026 — OS SHORTS TÊM LISTA PRÓPRIA.
  // Um vídeo longo de um canal grande faz muito mais views/dia do que um Short,
  // então ordenar tudo junto e cortar nos 20 podia deixar o nosso formato de
  // fora precisamente na lista que serve para aprender a fazer Shorts. A lista
  // geral fica como estava (nada a jusante quebra) e ganha-se uma segunda,
  // só do nosso formato.
  const shorts = allVideos.filter((v) => v.formato === 'short');
  const longos = allVideos.filter((v) => v.formato === 'longo');
  const contagem = {
    shorts: shorts.length,
    longos: longos.length,
    naoPortugues: allVideos.filter((v) => v.idioma !== 'pt').length,
  };
  console.log(`  📐 formato: ${contagem.shorts} shorts · ${contagem.longos} longos | idioma: ${contagem.naoPortugues} não-português`);

  const estudoDeCapitulos = estudarCapitulos(longos);
  console.log(`  📖 capítulos: ${estudoDeCapitulos.comCapitulos}/${estudoDeCapitulos.longosAnalisados} longos os publicam` +
    (estudoDeCapitulos.comCapitulos
      ? ` · média de ${estudoDeCapitulos.mediaDeCapitulos} capítulos · ${estudoDeCapitulos.mediaSegundosPorCapitulo}s cada · 1º capítulo dura ${estudoDeCapitulos.duracaoMediaDoPrimeiroSeg}s`
      : ''));

  // Save output
  const output = {
    generatedAt: new Date().toISOString(),
    periodDays: MAX_AGE_DAYS,
    totalAnalyzed: allVideos.length,
    contagem,
    aggregate,
    estudoDeCapitulos,
    topVideos: allVideos.slice(0, 20),
    topShorts: shorts.slice(0, 10),
    // Lista própria dos LONGOS: é daqui que sai o desenho do nosso vídeo longo,
    // e na lista geral eles misturam-se com os Shorts.
    topLongos: longos.slice(0, 10),
  };

  const outputDir = join(process.cwd(), '.github', 'data');
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(OUTPUT, JSON.stringify(output, null, 2));
  console.log(`✅ Salvo ${OUTPUT} (${allVideos.length} vídeos analisados, top ${output.topVideos.length} gravados).`);
}

main().catch(err => {
  console.error(`❌ ${err.message}`);
  process.exit(1);
});
