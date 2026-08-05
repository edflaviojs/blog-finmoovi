/**
 * YouTube — O ROBÔ QUE CUMPRE A PROMESSA (IMPLEMENTACAO20 §50 — 05/08/2026).
 *
 * ═══ POR QUE ESTE FICHEIRO EXISTE ═══
 * Todos os vídeos do canal pedem, com a voz e com uma pastilha no ecrã onde uma
 * mãozinha carrega: *"comenta FINMOOVI aqui que eu te mando o app"*. Durante
 * quinze dias **ninguém respondeu a ninguém**. A promessa era feita em cada vídeo
 * e não era cumprida em nenhum — o que é pior do que não a fazer, porque ensina
 * quem vê que a palavra do canal não vale.
 *
 * Este robô fecha esse buraco: de hora a hora procura quem escreveu FINMOOVI e
 * responde com o link do app.
 *
 * ═══ POR QUE UMA RESPOSTA PÚBLICA E NÃO UMA MENSAGEM PRIVADA ═══
 * No YouTube **não existe mensagem privada**. Nenhuma, para ninguém, por API ou à
 * mão. É por isso que o Instagram leva o link no direct e aqui ele vai no próprio
 * comentário. Não é uma escolha — é o que a plataforma permite.
 *
 * ═══ AS TRÊS REGRAS QUE ESTE ROBÔ NÃO PODE QUEBRAR ═══
 * 1. **Nunca responder duas vezes à mesma pessoa.** O caderno
 *    (.github/data/youtube-comentarios.json) guarda o identificador de cada
 *    comentário já respondido. Sem ele, cada corrida responderia tudo de novo e o
 *    canal viraria spam sozinho — de hora a hora, para sempre.
 * 2. **Nunca responder a si próprio.** Os comentários do próprio canal são
 *    ignorados pelo identificador do autor. Sem isto, a primeira resposta do robô
 *    seria o gatilho da segunda, e assim até o YouTube travar a conta.
 * 3. **Variar o texto.** Seis respostas diferentes à vez. Uma frase idêntica
 *    repetida cem vezes é a definição de spam para qualquer filtro automático.
 *
 * ⚠️ **O TETO POR CORRIDA É DE PROPÓSITO.** Nunca mais de MAX_POR_CORRIDA
 * respostas de uma vez. Quando fica trabalho por fazer, o robô **diz quanto** —
 * um corte silencioso lê-se como "está tudo respondido" quando não está.
 *
 * ═══ VALE PARA SHORTS E PARA VÍDEOS LONGOS ═══
 * O robô não lê a lista dos vídeos que nós publicámos: pergunta ao YouTube a
 * lista de uploads do canal. Assim apanha o Short diário, o vídeo longo de
 * domingo e qualquer vídeo que o dono suba à mão — sem precisar de saber que eles
 * existem.
 *
 * Segredos (env, só no CI): YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET,
 * YOUTUBE_REFRESH_TOKEN. A permissão necessária (youtube.force-ssl) já está
 * concedida — é a mesma que envia as legendas.
 *
 * Uso:
 *   node src/scripts/youtube/comentarios.js
 *   node src/scripts/youtube/comentarios.js --dry-run     (não escreve nada)
 *   node src/scripts/youtube/comentarios.js --max=5
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

// ─── caminhos e constantes ───────────────────────────────────────────────────
const ROOT = process.cwd();
const CADERNO = join(ROOT, '.github', 'data', 'youtube-comentarios.json');

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API = 'https://www.googleapis.com/youtube/v3';

/** A palavra do convite. É a MESMA que a narração diz e que a descrição escreve. */
const PALAVRA = 'finmoovi';

/** Quantos vídeos recentes vasculhar. 50 é o máximo por página e cobre o canal inteiro. */
const VIDEOS_A_OLHAR = 50;

/**
 * Teto de respostas por corrida. Com o robô a correr de hora a hora, 25 por hora
 * limpa qualquer atraso em pouco tempo — e evita que uma enxurrada de comentários
 * vire vinte respostas no mesmo minuto, que é o que um humano nunca faria.
 */
const MAX_POR_CORRIDA = 25;

/**
 * As seis respostas. Todas dizem o mesmo; nenhuma diz igual.
 * ⚠️ Se mudar o endereço aqui, mude também na descrição (upload-short.js).
 */
const RESPOSTAS = [
  'Boa! 🚀 O FinMoovi é grátis e abre direto no navegador, sem instalar nada: https://finmoovi.com',
  'Show! Aqui tá ele, grátis e sem instalar: https://finmoovi.com 💚',
  'Prontinho! É de graça e roda no navegador: https://finmoovi.com 🙌',
  'Fechou! Pode entrar por aqui, é grátis: https://finmoovi.com ✅',
  'Massa! O app é gratuito e abre no navegador: https://finmoovi.com 🚀',
  'Valeu pelo comentário! Tá aqui, de graça: https://finmoovi.com 😉',
];

const args = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => {
    const [k, ...v] = a.slice(2).split('=');
    return [k, v.join('=') || true];
  }),
);
const DRY_RUN = Boolean(args['dry-run']);
const MAX = Number(args.max) > 0 ? Number(args.max) : MAX_POR_CORRIDA;

const log = (...m) => console.log(...m);

// ─── o caderno de quem já foi respondido ─────────────────────────────────────

function lerCaderno() {
  if (!existsSync(CADERNO)) return { respondidos: {} };
  try {
    const d = JSON.parse(readFileSync(CADERNO, 'utf-8'));
    return d && typeof d === 'object' && d.respondidos ? d : { respondidos: {} };
  } catch {
    // Um caderno ilegível não pode derrubar o robô — mas também não pode ser
    // tratado como vazio em silêncio, ou responderíamos tudo outra vez.
    throw new Error(`O caderno ${CADERNO} existe mas não se consegue ler. Conferir à mão antes de correr outra vez.`);
  }
}

function gravarCaderno(dados) {
  mkdirSync(dirname(CADERNO), { recursive: true });
  writeFileSync(CADERNO, `${JSON.stringify(dados, null, 2)}\n`, 'utf-8');
}

// ─── conversa com o YouTube ──────────────────────────────────────────────────

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
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    if (res.status === 400 || res.status === 401) {
      throw new Error(`Refresh token inválido/expirado (${res.status}). Rode: node scripts/youtube-auth.js e atualize o secret YOUTUBE_REFRESH_TOKEN. Detalhe: ${text}`);
    }
    throw new Error(`Falha ao renovar access token (${res.status}): ${text}`);
  }
  return JSON.parse(text).access_token;
}

async function api(token, caminho, params = {}) {
  const url = new URL(`${API}/${caminho}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const texto = await res.text();
  if (!res.ok) {
    const erro = new Error(`${caminho} devolveu ${res.status}: ${texto.slice(0, 300)}`);
    erro.status = res.status;
    erro.corpo = texto;
    throw erro;
  }
  return JSON.parse(texto);
}

/** O canal: o seu identificador (para não responder a si próprio) e a lista de uploads. */
async function descobrirCanal(token) {
  const d = await api(token, 'channels', { part: 'contentDetails,id', mine: 'true' });
  const canal = d.items?.[0];
  if (!canal) throw new Error('A API não devolveu nenhum canal para estas credenciais.');
  return {
    canalId: canal.id,
    playlistUploads: canal.contentDetails?.relatedPlaylists?.uploads,
  };
}

/** Os vídeos mais recentes do canal — Shorts e longos, sem distinção. */
async function ultimosVideos(token, playlistUploads) {
  const d = await api(token, 'playlistItems', {
    part: 'contentDetails,snippet',
    playlistId: playlistUploads,
    maxResults: VIDEOS_A_OLHAR,
  });
  return (d.items || []).map((i) => ({
    videoId: i.contentDetails?.videoId,
    titulo: i.snippet?.title || '(sem título)',
  })).filter((v) => v.videoId);
}

/**
 * Os comentários de um vídeo.
 * Vídeos com comentários desligados devolvem 403 — isso NÃO é um erro do robô,
 * é uma configuração do vídeo. Devolve-se lista vazia e segue-se em frente.
 */
async function comentariosDoVideo(token, videoId) {
  try {
    const d = await api(token, 'commentThreads', {
      part: 'snippet',
      videoId,
      maxResults: 100,
      order: 'time',
      textFormat: 'plainText',
    });
    return (d.items || []).map((item) => {
      const c = item.snippet?.topLevelComment;
      return {
        id: c?.id,
        texto: c?.snippet?.textOriginal || c?.snippet?.textDisplay || '',
        autor: c?.snippet?.authorDisplayName || '(anónimo)',
        autorCanal: c?.snippet?.authorChannelId?.value || null,
        quando: c?.snippet?.publishedAt || null,
      };
    }).filter((c) => c.id);
  } catch (e) {
    if (e.status === 403) {
      log(`   ⏭️  ${videoId}: comentários desligados ou sem acesso — a saltar.`);
      return [];
    }
    throw e;
  }
}

async function responder(token, comentarioId, texto) {
  const res = await fetch(`${API}/comments?part=snippet`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ snippet: { parentId: comentarioId, textOriginal: texto } }),
  });
  if (!res.ok) {
    const corpo = await res.text().catch(() => '');
    throw new Error(`Falha ao responder ao comentário ${comentarioId} (${res.status}): ${corpo.slice(0, 300)}`);
  }
  return res.json();
}

// ─── a decisão: este comentário pede o app? ──────────────────────────────────

/**
 * ⚠️ COMPARA-SE O TEXTO SEM ACENTOS, SEM ESPAÇOS E SEM PONTUAÇÃO.
 * Quem escreve num telemóvel escreve "Finmoovi", "FIN MOOVI", "fin-moovi" e
 * "finmoovi!!!". Exigir a palavra exata deixaria de fora metade das pessoas que
 * fizeram exatamente o que o vídeo pediu — e essas são precisamente as que mais
 * merecem resposta.
 */
export function pedeOApp(texto) {
  const limpo = String(texto || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  return limpo.includes(PALAVRA);
}

/** A resposta desta vez — roda pela lista para nunca sair duas iguais seguidas. */
export function respostaDaVez(quantasJaForam) {
  return RESPOSTAS[quantasJaForam % RESPOSTAS.length];
}

// ─── a corrida ───────────────────────────────────────────────────────────────

async function main() {
  log(`\n💬 Robô de comentários — a procurar a palavra "${PALAVRA.toUpperCase()}"${DRY_RUN ? ' (ENSAIO: não escreve nada)' : ''}\n`);

  const caderno = lerCaderno();
  const jaRespondidos = new Set(Object.keys(caderno.respondidos));
  log(`📓 já respondidos até agora: ${jaRespondidos.size}`);

  const token = await getAccessToken();
  const { canalId, playlistUploads } = await descobrirCanal(token);
  if (!playlistUploads) throw new Error('O canal não expôs a lista de uploads.');

  const videos = await ultimosVideos(token, playlistUploads);
  log(`🎬 vídeos a vasculhar: ${videos.length} (Shorts e longos)\n`);

  const pendentes = [];
  for (const v of videos) {
    const comentarios = await comentariosDoVideo(token, v.videoId);
    for (const c of comentarios) {
      if (jaRespondidos.has(c.id)) continue;
      if (c.autorCanal && c.autorCanal === canalId) continue; // nunca a si próprio
      if (!pedeOApp(c.texto)) continue;
      pendentes.push({ ...c, videoId: v.videoId, titulo: v.titulo });
    }
  }

  if (pendentes.length === 0) {
    log('📭 ninguém novo pediu o app. Nada a fazer — e isto é sucesso, não falha.\n');
    return 0;
  }

  // Os mais antigos primeiro: quem espera há mais tempo é servido primeiro.
  pendentes.sort((a, b) => String(a.quando).localeCompare(String(b.quando)));

  log(`🙋 pedidos por responder: ${pendentes.length}`);
  const vaoAgora = pendentes.slice(0, MAX);
  const ficamPara = pendentes.length - vaoAgora.length;

  let feitas = 0;
  for (const p of vaoAgora) {
    const texto = respostaDaVez(feitas);
    if (DRY_RUN) {
      log(`   [ensaio] ${p.autor} (${p.videoId}) → "${texto.slice(0, 60)}…"`);
    } else {
      await responder(token, p.id, texto);
      caderno.respondidos[p.id] = {
        videoId: p.videoId,
        autor: p.autor,
        respondidoEm: new Date().toISOString(),
        resposta: texto,
      };
      log(`   ✅ ${p.autor} — ${p.titulo.slice(0, 45)}`);
    }
    feitas += 1;
  }

  if (!DRY_RUN) gravarCaderno(caderno);

  log(`\n📣 respondidos nesta corrida: ${feitas}`);
  // ⚠️ Um teto que ninguém vê é um teto que engana. Se ficou gente para trás, diz-se.
  if (ficamPara > 0) {
    log(`⏳ FICARAM ${ficamPara} POR RESPONDER — o teto por corrida é ${MAX}. A próxima corrida (dentro de uma hora) apanha-os.`);
  }
  log('');
  return 0;
}

// ─── execução direta ─────────────────────────────────────────────────────────

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('youtube/comentarios.js')) {
  main()
    .then((code) => process.exit(code))
    .catch((e) => {
      console.error(`\n❌ ${e.message}\n`);
      process.exit(1);
    });
}
