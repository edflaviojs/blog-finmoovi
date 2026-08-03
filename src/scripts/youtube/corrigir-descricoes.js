/**
 * CORRIGIR A DESCRIÇÃO DOS VÍDEOS JÁ PUBLICADOS (03/08/2026).
 *
 * ═══ POR QUE EXISTE ═══
 * Os 10 primeiros vídeos do canal foram ao ar com a descrição estragada, por três
 * causas medidas no mesmo dia (ver o cabeçalho de `upload-short.js`):
 *   · 5 das 9 geradas por IA acabavam A MEIO DA PALAVRA — e essas 5 são
 *     exatamente as 5 que ficaram SEM hashtags (a resposta parou antes delas);
 *   · a hashtag colada num monstro só, quando o modelo separava por espaços;
 *   · o link a apontar sempre para o ÍNDICE das ferramentas, nunca para a
 *     calculadora do tema.
 * O robô já não erra assim. Estes dez, porém, continuam no ar como estavam.
 *
 * ═══ COMO ═══
 * Gera a descrição outra vez com AS MESMAS funções que o robô usa (importadas de
 * `upload-short.js` — não uma cópia, que amanhã divergia) e reescreve só o que
 * está estragado.
 *
 * ═══ O QUE ELE NÃO FAZ ═══
 * · Não muda o TÍTULO do vídeo além de lhe pôr maiúscula inicial. Um título é a
 *   promessa que já foi feita a quem clicou; reescrevê-lo é outra decisão, e não
 *   é esta.
 * · Não toca em privacidade, miniatura, legendas nem no vídeo em si.
 * · 🔴 NÃO PERDE O CRÉDITO DA MÚSICA. Os vídeos antigos contêm a faixa CC BY do
 *   Kevin MacLeod e devem-lhe crédito enquanto lá estiverem; a descrição nova é
 *   construída a partir do roteiro, que já não conhece essa faixa. Se a linha
 *   estiver na descrição atual, ela é reposta. Sem isto, este script desfazia a
 *   correção de 02/08 sem ninguém dar por nada.
 * · Sem `--aplicar` só MOSTRA o que faria. Nada é enviado por engano.
 *
 * Uso:
 *   node src/scripts/youtube/corrigir-descricoes.js            (só mostra)
 *   node src/scripts/youtube/corrigir-descricoes.js --aplicar  (envia)
 *   node src/scripts/youtube/corrigir-descricoes.js --slug=acoes --aplicar
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tryLlm, deterministicMeta, buildMetadata, getAccessToken } from './upload-short.js';

const VIDEOS_URL = 'https://www.googleapis.com/youtube/v3/videos';
const REGISTO = join(process.cwd(), '.github', 'data', 'youtube-published.json');
const SCRIPT_DIR = join(process.cwd(), 'src', 'scripts', 'youtube', 'output');

const aplicar = process.argv.includes('--aplicar');
const soEste = (process.argv.find((a) => a.startsWith('--slug=')) || '').split('=')[1] || null;

/** A linha de crédito que estiver na descrição atual (ou vazio). */
function creditoExistente(descricao) {
  const linha = String(descricao || '').split('\n').find((l) => /Kevin MacLeod|incompetech/i.test(l));
  return linha ? linha.trim() : '';
}

const registo = JSON.parse(readFileSync(REGISTO, 'utf-8'));
const alvos = Object.entries(registo)
  .filter(([, v]) => v && v.videoId)
  .filter(([slug]) => !soEste || slug === soEste)
  .sort((a, b) => String(a[1].uploadedAt).localeCompare(String(b[1].uploadedAt)));

console.log(`\n📼 vídeos publicados: ${alvos.length}`);
console.log(aplicar ? '✍️  A ENVIAR a sério.\n' : '👀 MODO DE ENSAIO — nada será enviado. Use --aplicar para enviar a sério.\n');

let acesso;
try {
  acesso = await getAccessToken();
} catch (err) {
  console.error(`\n❌ ${err.message}`);
  console.error('   (esta correção só funciona na nuvem, onde as chaves vivem)');
  process.exit(1);
}
let mudados = 0; let saltados = 0; let falhas = 0;

for (const [slug, v] of alvos) {
  const id = v.videoId;

  const caminhoRoteiro = join(SCRIPT_DIR, `${slug}.script.json`);
  if (!existsSync(caminhoRoteiro)) {
    console.log(`  ⏭️  ${id} (${slug}): sem roteiro em disco — não dá para reconstruir a descrição`);
    saltados++;
    continue;
  }

  // 1) ler o que está lá — nunca escrever por cima daquilo que não se leu
  const r = await fetch(`${VIDEOS_URL}?part=snippet&id=${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${acesso}` },
  });
  const j = await r.json();
  const item = j.items && j.items[0];
  if (!item) { console.log(`  ✗ ${id} (${slug}): não encontrado no canal`); falhas++; continue; }
  const snippet = item.snippet;

  // 2) gerar de novo, com as funções do robô
  const roteiro = JSON.parse(readFileSync(caminhoRoteiro, 'utf-8'));
  const bruto = (await tryLlm(roteiro)) || deterministicMeta(roteiro);
  const novo = buildMetadata(bruto, roteiro);

  // 3) repor o crédito da música, se a descrição atual o tinha
  const credito = creditoExistente(snippet.description);
  let descricao = novo.snippet.description;
  if (credito && !descricao.includes('Kevin MacLeod')) descricao = `${descricao.replace(/\s+$/, '')}\n\n${credito}`;
  if (descricao.length > 5000) { console.log(`  ✗ ${id} (${slug}): passaria dos 5000 caracteres`); falhas++; continue; }

  // 4) o título ANTIGO fica — só ganha maiúscula inicial
  const tituloAntigo = String(snippet.title || '');
  const titulo = tituloAntigo ? tituloAntigo.charAt(0).toUpperCase() + tituloAntigo.slice(1) : novo.snippet.title;

  const antes = String(snippet.description || '');
  const hashtagsAntes = (antes.match(/#\S+/g) || []).length;
  const hashtagsDepois = (descricao.match(/#\S+/g) || []).length;
  const linkAntes = (antes.match(/ferramentas\/\S*/) || ['—'])[0];
  const linkDepois = (descricao.match(/ferramentas\/\S*/) || ['—'])[0];

  console.log(`  ${slug}  (${id})`);
  console.log(`     título   : ${tituloAntigo === titulo ? '(igual)' : `"${tituloAntigo}" → "${titulo}"`}`);
  console.log(`     1ª linha : "${(descricao.split('\n')[0] || '').slice(0, 90)}…"`);
  console.log(`     hashtags : ${hashtagsAntes} → ${hashtagsDepois}`);
  console.log(`     link     : ${linkAntes} → ${linkDepois}`);
  console.log(`     música   : ${credito ? 'crédito reposto' : '(não tinha)'}`);

  if (!aplicar) { mudados++; continue; }

  // 5) escrever de volta. A API exige o snippet INTEIRO — mandar só a descrição
  //    apagaria o título e a categoria.
  const put = await fetch(`${VIDEOS_URL}?part=snippet`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${acesso}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id,
      snippet: {
        title: titulo,
        description: descricao,
        categoryId: snippet.categoryId,
        tags: novo.snippet.tags.length ? novo.snippet.tags : snippet.tags,
        ...(snippet.defaultLanguage ? { defaultLanguage: snippet.defaultLanguage } : {}),
        ...(snippet.defaultAudioLanguage ? { defaultAudioLanguage: snippet.defaultAudioLanguage } : {}),
      },
    }),
  });
  if (put.ok) { console.log('     ✅ atualizado\n'); mudados++; }
  else { console.log(`     ✗ ${put.status} ${(await put.text()).slice(0, 200)}\n`); falhas++; }
}

console.log(`${'─'.repeat(60)}`);
console.log(`${aplicar ? 'corrigidos' : 'a corrigir'}: ${mudados} · saltados: ${saltados} · falhas: ${falhas}`);
if (!aplicar && mudados) console.log('\nPara enviar a sério, corra outra vez com --aplicar.');
