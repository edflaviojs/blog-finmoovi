/**
 * CORRIGIR A PROMESSA DE "GRÁTIS" NO QUE JÁ ESTÁ NO AR — 12/08/2026.
 *
 * ═══ POR QUE EXISTE ═══
 * O FinMoovi é um TESTE de sete dias, mas os vídeos publicados antes de 12/08 dizem
 * na descrição e no primeiro comentário que o app *"é grátis"* ou *"é de graça"*.
 * Foram esses textos que renderam **duas queixas de propaganda enganosa** — e são
 * eles, e não o vídeo em si, que a pessoa lê antes de clicar.
 *
 * ⚠️ **O QUE ESTE SCRIPT NÃO CONSEGUE FAZER, E É PRECISO SABER:** o selo "APP GRÁTIS"
 * está **queimado na imagem** dos vídeos antigos. Isso não se corrige por API; só
 * refazendo e voltando a subir o vídeo, o que perde as visualizações e os comentários
 * acumulados. O dono decidiu (12/08) corrigir o que dá — texto — e deixar o selo dos
 * antigos. Os vídeos novos já saem com "7 DIAS GRÁTIS".
 *
 * ═══ O QUE FAZ ═══
 *   1. pergunta ao canal a lista de tudo o que já foi publicado (não usa o registo
 *      local: um vídeo que lá não esteja continuaria a mentir em silêncio);
 *   2. lê o TÍTULO e a DESCRIÇÃO de cada um e aplica só as trocas da promessa;
 *   3. lê os COMENTÁRIOS ESCRITOS PELO PRÓPRIO CANAL nesses vídeos (o "primeiro
 *      comentário", que é onde vive o link) e corrige-os também;
 *   4. mostra ANTES → DEPOIS de tudo, linha a linha.
 *
 * ⚠️ **Sem `--aplicar` não escreve nada.** É a mesma regra do `corrigir-descricoes.js`:
 * correr em ensaio, ler, e só então aplicar.
 *
 * ⚠️ **NUNCA MANDA O QUE NÃO LEU.** A API do YouTube substitui o `snippet` inteiro:
 * enviar só a descrição apagaria o título e a categoria. Por isso cada vídeo é lido
 * primeiro e reenviado completo, com uma única coisa mudada.
 *
 * Uso:
 *   node src/scripts/youtube/corrigir-promessa-gratis.js              (só mostra)
 *   node src/scripts/youtube/corrigir-promessa-gratis.js --aplicar    (escreve)
 *   node src/scripts/youtube/corrigir-promessa-gratis.js --video=ID   (um só)
 */

import { getAccessToken } from './upload-short.js';
import { corrigirPromessa } from './lib/promessa-gratis.js';

const API = 'https://www.googleapis.com/youtube/v3';

const aplicar = process.argv.includes('--aplicar');
const soEste = (process.argv.find((a) => a.startsWith('--video=')) || '').split('=')[1] || null;

const cortar = (s, n = 100) => {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
};

async function pedir(url, acesso) {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${acesso}` } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${r.status} ${JSON.stringify(j).slice(0, 200)}`);
  return j;
}

/** O canal e a prateleira onde o YouTube guarda TUDO o que ele publicou. */
async function ladoDoCanal(acesso) {
  const j = await pedir(`${API}/channels?part=contentDetails,snippet&mine=true`, acesso);
  const c = j.items && j.items[0];
  if (!c) throw new Error('a conta ligada não tem canal');
  return { canalId: c.id, uploads: c.contentDetails.relatedPlaylists.uploads, nome: c.snippet.title };
}

/** Todos os vídeos publicados, de 50 em 50 (é a página máxima da API). */
async function todosOsVideos(acesso, uploads) {
  const ids = [];
  let pagina = '';
  do {
    const j = await pedir(`${API}/playlistItems?part=contentDetails&maxResults=50&playlistId=${uploads}${pagina ? `&pageToken=${pagina}` : ''}`, acesso);
    for (const it of j.items || []) ids.push(it.contentDetails.videoId);
    pagina = j.nextPageToken || '';
  } while (pagina);
  return ids;
}

/** O snippet de até 50 vídeos numa só pergunta — a API aceita ids separados por vírgula. */
async function snippetsDe(acesso, ids) {
  const fora = [];
  for (let i = 0; i < ids.length; i += 50) {
    const j = await pedir(`${API}/videos?part=snippet&id=${ids.slice(i, i + 50).join(',')}`, acesso);
    fora.push(...(j.items || []));
  }
  return fora;
}

/**
 * Os comentários que o PRÓPRIO CANAL escreveu neste vídeo.
 * ⚠️ Só os de topo: uma resposta nossa a um comentário de outra pessoa também pode
 * conter a promessa, e essas são apanhadas na mesma volta porque `commentThreads`
 * traz as respostas junto quando se pede `replies`.
 */
async function comentariosDoCanal(acesso, videoId, canalId) {
  const meus = [];
  try {
    const j = await pedir(`${API}/commentThreads?part=snippet,replies&maxResults=100&videoId=${videoId}`, acesso);
    for (const th of j.items || []) {
      const topo = th.snippet.topLevelComment;
      if (topo?.snippet?.authorChannelId?.value === canalId) {
        meus.push({ id: topo.id, texto: topo.snippet.textOriginal });
      }
      for (const r of th.replies?.comments || []) {
        if (r.snippet?.authorChannelId?.value === canalId) {
          meus.push({ id: r.id, texto: r.snippet.textOriginal });
        }
      }
    }
  } catch (e) {
    // Comentários desligados num vídeo devolvem 403. Não é defeito nosso e não pode
    // derrubar a correção dos outros — anota-se e segue.
    if (!/403/.test(String(e.message))) throw e;
  }
  return meus;
}

// ─────────────────────────────────────────────────────────────────────────────

let acesso;
try {
  acesso = await getAccessToken();
} catch (err) {
  console.error(`\n❌ ${err.message}`);
  console.error('   (as chaves do YouTube vivem só na nuvem — corra pelo botão em Actions)');
  process.exit(1);
}

const canal = await ladoDoCanal(acesso);
const ids = soEste ? [soEste] : await todosOsVideos(acesso, canal.uploads);
const videos = await snippetsDe(acesso, ids);

console.log(`\n📺 canal: ${canal.nome}`);
console.log(`📼 vídeos publicados: ${videos.length}`);
console.log(aplicar ? '\n✍️  A ESCREVER NO YOUTUBE a sério.\n' : '\n👀 MODO DE ENSAIO — nada será escrito. Use --aplicar para valer.\n');

let videosMudados = 0;
let comentariosMudados = 0;
let jaCertos = 0;
let falhas = 0;
const paraOlharAMao = [];

for (const v of videos) {
  const id = v.id;
  const s = v.snippet;
  const titulo = corrigirPromessa(s.title);
  const descricao = corrigirPromessa(s.description);

  const meus = await comentariosDoCanal(acesso, id, canal.canalId);
  const comentarios = meus
    .map((c) => ({ ...c, novo: corrigirPromessa(c.texto) }))
    .filter((c) => c.novo.mudou);

  const mexeNoVideo = titulo.mudou || descricao.mudou;
  if (!mexeNoVideo && !comentarios.length) {
    jaCertos++;
    continue;
  }

  console.log(`\n▸ ${cortar(s.title, 70)}`);
  console.log(`  https://youtu.be/${id}`);

  if (titulo.mudou) {
    console.log(`  TÍTULO`);
    console.log(`    antes : ${cortar(s.title)}`);
    console.log(`    depois: ${cortar(titulo.texto)}`);
  }

  if (descricao.mudou) {
    // Mostrar só as linhas que MUDAM: uma descrição tem 4000 caracteres e despejá-la
    // inteira esconderia justamente o que interessa conferir.
    const antes = String(s.description).split('\n');
    const depois = descricao.texto.split('\n');
    console.log(`  DESCRIÇÃO`);
    for (let i = 0; i < Math.max(antes.length, depois.length); i++) {
      if (antes[i] === depois[i]) continue;
      console.log(`    antes : ${cortar(antes[i])}`);
      console.log(`    depois: ${cortar(depois[i])}`);
    }
  }

  for (const c of comentarios) {
    console.log(`  COMENTÁRIO DO CANAL`);
    console.log(`    antes : ${cortar(c.texto)}`);
    console.log(`    depois: ${cortar(c.novo.texto)}`);
  }

  const sobras = [...titulo.sobras, ...descricao.sobras, ...comentarios.flatMap((c) => c.novo.sobras)];
  if (sobras.length) {
    console.log(`  ⚠️  ainda fala de grátis sem prazo (olhar à mão):`);
    for (const f of sobras) console.log(`      · ${cortar(f, 120)}`);
    paraOlharAMao.push({ id, sobras });
  }

  if (!aplicar) {
    if (mexeNoVideo) videosMudados++;
    comentariosMudados += comentarios.length;
    continue;
  }

  // ── escrever o vídeo (snippet INTEIRO, com uma coisa mudada) ──
  if (mexeNoVideo) {
    const r = await fetch(`${API}/videos?part=snippet`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${acesso}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        snippet: {
          title: titulo.texto,
          description: descricao.texto,
          categoryId: s.categoryId,
          ...(s.tags ? { tags: s.tags } : {}),
          ...(s.defaultLanguage ? { defaultLanguage: s.defaultLanguage } : {}),
          ...(s.defaultAudioLanguage ? { defaultAudioLanguage: s.defaultAudioLanguage } : {}),
        },
      }),
    });
    if (r.ok) { console.log('    ✅ vídeo atualizado'); videosMudados++; }
    else { console.log(`    ✗ vídeo: ${r.status} ${(await r.text()).slice(0, 160)}`); falhas++; }
  }

  // ── escrever os comentários ──
  for (const c of comentarios) {
    const r = await fetch(`${API}/comments?part=snippet`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${acesso}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: c.id, snippet: { textOriginal: c.novo.texto } }),
    });
    if (r.ok) { console.log('    ✅ comentário atualizado'); comentariosMudados++; }
    else { console.log(`    ✗ comentário: ${r.status} ${(await r.text()).slice(0, 160)}`); falhas++; }
  }
}

console.log(`\n${'─'.repeat(64)}`);
console.log(`${aplicar ? 'vídeos corrigidos' : 'vídeos a corrigir'}   : ${videosMudados}`);
console.log(`${aplicar ? 'comentários corrigidos' : 'comentários a corrigir'}: ${comentariosMudados}`);
console.log(`já estavam certos     : ${jaCertos}`);
console.log(`falhas                : ${falhas}`);
if (paraOlharAMao.length) {
  console.log(`\n⚠️  ${paraOlharAMao.length} vídeo(s) com texto que as regras não apanham — ver a lista acima.`);
}
if (!aplicar && (videosMudados || comentariosMudados)) {
  console.log('\nPara escrever a sério, corra outra vez com --aplicar.');
}
process.exit(falhas ? 1 : 0);
