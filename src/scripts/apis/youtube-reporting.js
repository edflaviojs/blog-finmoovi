/**
 * youtube-reporting.js — Cliente da YouTube REPORTING API (relatórios em massa).
 *
 * ═══ POR QUE ESTE FICHEIRO EXISTE ═══
 *
 * 🔴 **O número que decide o canal não estava a ser medido por ninguém.** Medido a
 * 02/10/2026 contra os dados do próprio Studio: os vídeos longos aparecem muito e
 * quase ninguém clica.
 *
 * | vídeo | apareceu | clicaram |
 * |---|---|---|
 * | Mesmo salário por 30 anos | 7.305 | **0,41%** |
 * | Dívida do cartão | 3.854 | **0,36%** |
 *
 * A média do ramo (Finanças/Negócios) é **5,5%** — estamos 10 a 13 vezes abaixo,
 * e com gente suficiente para isso não ser acaso. O YouTube MOSTRA os vídeos; é a
 * capa e o título que não ganham o clique.
 *
 * ⚠️⚠️ **E ISTO NÃO VEM DA API QUE O CANAL JÁ USA.** A primeira versão deste
 * conserto ia pedir `impressions,impressionClickThroughRate` à Analytics API v2
 * (a mesma do `retencao.js`). **Está errado, e errado em silêncio:**
 *
 *   - `impressions` na Analytics API é `adImpressions` — impressões de **ANÚNCIO**,
 *     não de capa. O número existe, volta sem erro, e **não é o que procuramos**.
 *   - `impressionClickThroughRate` simplesmente **não existe** lá.
 *
 * Teríamos reportado impressões de publicidade como se fossem gente a ver a capa.
 * A impressão de CAPA vive só aqui, na Reporting API, no relatório
 * `channel_reach_basic_a1`, nos campos `video_thumbnail_impressions` e
 * `video_thumbnail_impressions_ctr`. Verificado na documentação oficial, não
 * deduzido.
 *
 * ═══ COMO A REPORTING API FUNCIONA (é diferente da outra) ═══
 *
 * Ela não responde a perguntas: ela **despeja ficheiros**. O caminho é:
 *   1. criar UM TRABALHO (`jobs.create`) — uma vez na vida do canal;
 *   2. o Google passa a gerar um CSV por dia, e gera também os **~30 dias
 *      anteriores** à criação do trabalho;
 *   3. ⏳ **o primeiro ficheiro pode levar até 48h a aparecer** — e isso não é
 *      defeito nosso. Enquanto não houver ficheiro, dizemos isso com todas as
 *      letras em vez de inventar número;
 *   4. os ficheiros ficam disponíveis **60 dias** e depois caem. Quem quiser
 *      histórico mais longo tem de o guardar.
 *
 * ✅ **NÃO precisa de segredo novo nem de autorização nova.** `channel_reach_basic_a1`
 * não é relatório de dinheiro, por isso o escopo `yt-analytics.readonly` basta — e
 * é exactamente o escopo com que o `YOUTUBE_REFRESH_TOKEN` já foi criado (ver o
 * cabeçalho de `scripts/youtube-auth.js`). As chaves que já correm no CI servem.
 *
 * 100% LEITURA do desempenho. O único recurso que cria é o trabalho do passo 1, e
 * só quando chamado com `--criar-trabalho`.
 *
 * Segredos (só no CI): YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN.
 *
 * Uso:
 *   node src/scripts/apis/youtube-reporting.js --criar-trabalho   (uma vez)
 *   node src/scripts/apis/youtube-reporting.js                    (ver o estado)
 */

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const REPORTING = 'https://youtubereporting.googleapis.com/v1';
const VIDEOS_URL = 'https://www.googleapis.com/youtube/v3/videos';

/** O relatório que traz impressão de CAPA e a taxa de cliques dela. */
export const TIPO_DE_RELATORIO = 'channel_reach_basic_a1';

/**
 * Fronteira entre Short e vídeo longo, em segundos.
 *
 * ⚠️ 180s é o limite do YouTube para Shorts desde outubro de 2024. Os Shorts desta
 * casa são de 16s e 50s, e os longos passam dos 300s — ou seja, **nenhum vídeo do
 * canal fica perto desta fronteira**, e por isso ela não é uma decisão delicada.
 */
const SHORT_MAX_SEG = 180;

/** Há chaves para falar com o YouTube? (para o skip gracioso do chamador) */
export function temCredenciais() {
  return Boolean(
    process.env.YOUTUBE_CLIENT_ID
    && process.env.YOUTUBE_CLIENT_SECRET
    && process.env.YOUTUBE_REFRESH_TOKEN,
  );
}

/**
 * Renova o acesso a partir do refresh token.
 *
 * ⚠️ DÍVIDA CONHECIDA, e é a MESMA já registada no cabeçalho de `retencao.js`:
 * esta função existe em cópia em seis ficheiros deste repositório. Não a resolvo
 * aqui de propósito — juntar as seis é mexer em robôs que já estão provados, e não
 * é o que foi pedido. Fica exportada para que o próximo ficheiro a importe em vez
 * de criar a sétima cópia.
 */
export async function obterAcesso() {
  if (!temCredenciais()) {
    throw new Error('Faltam YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET / YOUTUBE_REFRESH_TOKEN — isto só corre na nuvem.');
  }
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: process.env.YOUTUBE_REFRESH_TOKEN,
      client_id: process.env.YOUTUBE_CLIENT_ID,
      client_secret: process.env.YOUTUBE_CLIENT_SECRET,
    }),
  });
  const texto = await res.text();
  if (!res.ok) throw new Error(`Falha ao renovar o acesso (${res.status}): ${texto.slice(0, 300)}`);
  return JSON.parse(texto).access_token;
}

async function pedir(token, caminho) {
  const res = await fetch(`${REPORTING}${caminho}`, { headers: { Authorization: `Bearer ${token}` } });
  const texto = await res.text();
  if (!res.ok) {
    const erro = new Error(`Reporting ${res.status}: ${texto.slice(0, 400)}`);
    erro.status = res.status;
    throw erro;
  }
  return texto ? JSON.parse(texto) : {};
}

/** Os trabalhos já criados nesta conta. */
export async function listarTrabalhos(token) {
  const dados = await pedir(token, '/jobs');
  return dados.jobs || [];
}

/** Cria o trabalho do relatório de alcance. Idempotente: se já existir, devolve o que existe. */
export async function garantirTrabalho(token, tipo = TIPO_DE_RELATORIO) {
  const existentes = await listarTrabalhos(token);
  const achado = existentes.find((j) => j.reportTypeId === tipo);
  if (achado) return { trabalho: achado, criado: false };

  const res = await fetch(`${REPORTING}/jobs`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ reportTypeId: tipo, name: 'FinMoovi — alcance (capa)' }),
  });
  const texto = await res.text();
  if (!res.ok) throw new Error(`Não deu para criar o trabalho (${res.status}): ${texto.slice(0, 400)}`);
  return { trabalho: JSON.parse(texto), criado: true };
}

/** Relatórios prontos de um trabalho, do mais novo para o mais velho. */
export async function relatoriosProntos(token, jobId) {
  const dados = await pedir(token, `/jobs/${jobId}/reports?pageSize=100`);
  return (dados.reports || []).sort((a, b) => String(b.endTime).localeCompare(String(a.endTime)));
}

async function baixar(token, url) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const texto = await res.text();
  if (!res.ok) throw new Error(`Falha ao baixar o ficheiro (${res.status}): ${texto.slice(0, 200)}`);
  return texto;
}

/** CSV → lista de objectos. Formato simples (sem vírgulas dentro de campo), que é o que o Google manda aqui. */
export function lerCsv(texto) {
  const linhas = String(texto).trim().split(/\r?\n/).filter(Boolean);
  if (linhas.length < 2) return [];
  const cabecalho = linhas[0].split(',').map((c) => c.trim());
  return linhas.slice(1).map((l) => {
    const campos = l.split(',');
    const o = {};
    cabecalho.forEach((c, i) => { o[c] = campos[i]; });
    return o;
  });
}

/**
 * A ESCALA DO CTR — e por que não se assume.
 *
 * ⚠️ A documentação diz "ctr" e não diz se vem como `0.0086` ou como `0.86`. Uma
 * escolha errada aqui transforma 0,86% em 86% (ou o contrário) **sem dar erro
 * nenhum** — é a família de defeito mais perigosa que há: número plausível e falso.
 *
 * Por isso a escala é DEDUZIDA dos próprios dados e dita em voz alta no relatório:
 * se algum valor passa de 1, então os números estão em percentagem; se nenhum
 * passa, estão em fracção. Nenhum canal do mundo tem 100% de cliques na capa, e
 * nenhum tem mais de 1 clique por impressão — logo a leitura não é ambígua.
 */
export function deduzirEscala(valores) {
  const nums = valores.map(Number).filter((n) => Number.isFinite(n));
  if (!nums.length) return { divisor: 1, nome: 'indeterminada' };
  const maximo = Math.max(...nums);
  return maximo > 1
    ? { divisor: 100, nome: 'percentagem (ex.: 0,86 = 0,86%)' }
    : { divisor: 1, nome: 'fracção (ex.: 0,0086 = 0,86%)' };
}

/** Duração e título de cada vídeo, em lotes de 50 (para separar Short de longo). */
async function fichaDosVideos(token, ids) {
  const out = {};
  for (let i = 0; i < ids.length; i += 50) {
    const lote = ids.slice(i, i + 50);
    const res = await fetch(`${VIDEOS_URL}?part=contentDetails,snippet&id=${lote.join(',')}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) continue; // extra: sem isto mostramos o ID em vez do título
    const dados = await res.json();
    for (const item of dados.items || []) {
      const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(item?.contentDetails?.duration || '');
      const segundos = m
        ? Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0)
        : null;
      out[item.id] = {
        titulo: item?.snippet?.title || null,
        segundos,
        formato: segundos == null ? null : (segundos <= SHORT_MAX_SEG ? 'short' : 'longo'),
      };
    }
  }
  return out;
}

/**
 * O RELATÓRIO DE CAPAS — quanta gente viu a capa e quanta clicou, por vídeo.
 *
 * Junta os ficheiros diários dos últimos `dias` dias (o relatório vem um por dia)
 * e soma por vídeo. O CTR de cada vídeo é **ponderado pelas impressões** de cada
 * dia, nunca a média simples das taxas: um dia com 3 impressões não pode pesar o
 * mesmo que um dia com 3.000.
 *
 * Devolve `{ estado, escala, dias, videos, totais }`. `estado` é:
 *   - `sem-trabalho`  → o trabalho ainda não foi criado (correr `--criar-trabalho`)
 *   - `sem-ficheiros` → trabalho criado mas o Google ainda não despejou nada (até 48h)
 *   - `ok`
 */
export async function relatorioDeCapas({ dias = 28, token: tokenDado = null } = {}) {
  const token = tokenDado || await obterAcesso();

  const trabalhos = await listarTrabalhos(token);
  const trabalho = trabalhos.find((j) => j.reportTypeId === TIPO_DE_RELATORIO);
  if (!trabalho) return { estado: 'sem-trabalho', videos: [], totais: null };

  const prontos = await relatoriosProntos(token, trabalho.id);
  if (!prontos.length) {
    return { estado: 'sem-ficheiros', criadoEm: trabalho.createTime, videos: [], totais: null };
  }

  // Um ficheiro por dia; `dias` é quantos dos mais recentes juntar.
  const usar = prontos.slice(0, dias);
  const porVideo = new Map();
  const ctrCrus = [];
  let linhasLidas = 0;

  for (const rel of usar) {
    let csv;
    try { csv = await baixar(token, rel.downloadUrl); } catch { continue; }
    for (const linha of lerCsv(csv)) {
      const id = linha.video_id;
      const imp = Number(linha.video_thumbnail_impressions);
      const ctr = Number(linha.video_thumbnail_impressions_ctr);
      if (!id || !Number.isFinite(imp)) continue;
      linhasLidas++;
      if (Number.isFinite(ctr)) ctrCrus.push(ctr);
      const acc = porVideo.get(id) || { id, impressoes: 0, cliquesEstimados: 0, dias: 0 };
      acc.impressoes += imp;
      // guardamos o produto para a média ponderada; a escala aplica-se no fim
      if (Number.isFinite(ctr)) acc.cliquesEstimados += ctr * imp;
      acc.dias++;
      porVideo.set(id, acc);
    }
  }

  const escala = deduzirEscala(ctrCrus);
  const lista = [...porVideo.values()].map((v) => ({
    ...v,
    ctr: v.impressoes > 0 ? (v.cliquesEstimados / v.impressoes) / escala.divisor : null,
  })).sort((a, b) => b.impressoes - a.impressoes);

  // Título e duração só dos que interessam (os 50 com mais impressões).
  const ficha = await fichaDosVideos(token, lista.slice(0, 50).map((v) => v.id));
  for (const v of lista) Object.assign(v, ficha[v.id] || {});

  const somaImp = lista.reduce((a, v) => a + v.impressoes, 0);
  const somaCli = lista.reduce((a, v) => a + v.cliquesEstimados, 0);

  return {
    estado: 'ok',
    escala,
    dias: usar.length,
    janela: { de: usar[usar.length - 1]?.startTime || null, ate: usar[0]?.endTime || null },
    linhasLidas,
    videos: lista,
    totais: {
      impressoes: somaImp,
      ctr: somaImp > 0 ? (somaCli / somaImp) / escala.divisor : null,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Linha de comando: criar o trabalho (uma vez) ou ver o estado.
// ─────────────────────────────────────────────────────────────────────────────

const chamadoPeloNome = process.argv[1]
  && process.argv[1].replace(/\\/g, '/').endsWith('apis/youtube-reporting.js');

if (chamadoPeloNome) {
  const criar = process.argv.includes('--criar-trabalho');
  (async () => {
    if (!temCredenciais()) {
      console.log('⏭️ Sem as chaves do YouTube — isto só corre na nuvem. Nada feito (saída 0).');
      return;
    }
    const token = await obterAcesso();

    if (criar) {
      const { trabalho, criado } = await garantirTrabalho(token);
      if (criado) {
        console.log(`✅ Trabalho CRIADO: ${trabalho.id} (${trabalho.reportTypeId})`);
        console.log('⏳ O Google leva ATÉ 48 HORAS a despejar o primeiro ficheiro.');
        console.log('   Ele gera também os ~30 dias ANTERIORES a hoje, por isso quando chegar já vem com história.');
      } else {
        console.log(`ℹ️ O trabalho já existia: ${trabalho.id} (criado em ${trabalho.createTime}). Nada a fazer.`);
      }
    }

    const r = await relatorioDeCapas({ token });
    if (r.estado === 'sem-trabalho') {
      console.log('\n🔴 Ainda NÃO há trabalho criado — nenhuma impressão de capa está a ser recolhida.');
      console.log('   Correr uma vez:  node src/scripts/apis/youtube-reporting.js --criar-trabalho');
      return;
    }
    if (r.estado === 'sem-ficheiros') {
      console.log(`\n⏳ Trabalho existe (desde ${r.criadoEm}) mas o Google ainda não despejou ficheiro nenhum.`);
      console.log('   Isto é normal até 48h depois de criar. Não é defeito e não há número para mostrar.');
      return;
    }

    console.log(`\n# CAPAS — ${r.dias} ficheiro(s) diário(s)  ·  ${r.janela.de || '?'} → ${r.janela.ate || '?'}`);
    console.log(`Escala do CTR deduzida dos dados: ${r.escala.nome}`);
    console.log(`Total: ${r.totais.impressoes} impressões de capa · CTR ${(r.totais.ctr * 100).toFixed(2)}%\n`);
    for (const v of r.videos.slice(0, 15)) {
      console.log(
        `${String(v.formato || '?').padEnd(6)} ${String(v.impressoes).padStart(7)} imp  `
        + `${v.ctr == null ? '   —  ' : `${(v.ctr * 100).toFixed(2)}%`.padStart(7)}  `
        + `${(v.titulo || v.id).slice(0, 60)}`,
      );
    }
  })().catch((err) => {
    console.error(`\n❌ ${err.message}`);
    process.exit(1);
  });
}
