/**
 * YouTube — Upload automático de Short (F1.4 — IMPLEMENTACAO20).
 *
 * Sobe o MP4 renderizado (youtube-render/out/<slug>.mp4) ao canal FinMoovi via
 * YouTube Data API v3 (REST puro, sem googleapis), com:
 *   - metadados gerados por LLM grátis (título/descrição/hashtags/tags) a partir
 *     do roteiro (<slug>.script.json). FALLBACK determinístico se o LLM falhar —
 *     nunca bloqueia o upload;
 *   - upload resumível (initiate + PUT dos bytes);
 *   - 3 faixas de legenda (captions.insert) a partir dos SRTs pt/en/es;
 *   - dedup + tracking em .github/data/youtube-published.json.
 *
 * ⚠️ AUDITORIA GOOGLE PENDENTE → a API força uploads como PRIVADOS. Isso é
 * esperado: o dono publica com 1 clique no YouTube Studio até a auditoria passar.
 *
 * Segredos (env, só no CI): YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET,
 * YOUTUBE_REFRESH_TOKEN. LLM: CEREBRAS_API_KEY / GROQ_API_KEY / CLOUDFLARE_*.
 *
 * Uso:
 *   node src/scripts/youtube/upload-short.js --slug=juros-compostos
 *   node src/scripts/youtube/upload-short.js --slug=juros-compostos --dry-run
 */

import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

// ─── caminhos ────────────────────────────────────────────────────────────────
const ROOT = process.cwd();
const SCRIPT_DIR = join(ROOT, 'src', 'scripts', 'youtube', 'output');
const MP4_DIR = join(ROOT, 'youtube-render', 'out');
const AUDIO_ROOT = join(ROOT, 'youtube-render', 'public', 'audio');
const TRACKING = join(ROOT, '.github', 'data', 'youtube-published.json');

// Links fixos (a calculadora do blog e o app).
const BLOG_TOOLS_URL = 'https://blog.finmoovi.com/ferramentas/';
const APP_URL = 'https://finmoovi.com';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const UPLOAD_URL = 'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status';
const CAPTIONS_URL = 'https://www.googleapis.com/upload/youtube/v3/captions?part=snippet&uploadType=multipart';

const CAPTION_LANGS = [
  { code: 'pt', language: 'pt-BR', name: 'Português (Brasil)' },
  { code: 'en', language: 'en', name: 'English' },
  { code: 'es', language: 'es', name: 'Español' },
];

// ─── args ────────────────────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => {
    const [k, ...v] = a.slice(2).split('=');
    return [k, v.join('=') || true];
  }),
);
const SLUG = args.slug && args.slug !== true ? String(args.slug) : 'juros-compostos';
const DRY_RUN = Boolean(args['dry-run']);

// ─── util ────────────────────────────────────────────────────────────────────
function log(msg) { console.log(msg); }

// Remove <,> (o YouTube rejeita), colapsa espaços e corta no limite.
function sanitizeText(s, max) {
  const clean = String(s || '').replace(/[<>]/g, '').replace(/\r/g, '').trim();
  return max ? clean.slice(0, max) : clean;
}

// Preposições/artigos PT que só são descartados quando aparecem SOZINHOS
// (uma hashtag de 1 palavra só); dentro de uma frase multi-palavra eles ficam
// (viram parte do CamelCase), pra não quebrar o sentido da frase.
const PT_STOPWORDS = new Set(['de', 'em', 'com', 'para', 'e', 'o', 'a', 'do', 'da']);

// Divide uma frase em palavras (letras/números unicode), sem stripar acentos.
function splitWords(s) {
  return String(s || '').split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}

// Constrói UM hashtag em CamelCase (token único, mantém acentos) a partir de
// uma frase/tag crua — ex.: "investimento em ações" → "#InvestimentoEmAções".
// Frases de 1 palavra só que sejam stopword PT (ex.: "em") são descartadas.
function buildHashtag(raw) {
  const body = String(raw || '').replace(/^#+/, '').trim();
  if (!body) return '';
  const words = splitWords(body);
  if (!words.length) return '';
  if (words.length === 1 && PT_STOPWORDS.has(words[0].toLowerCase())) return '';
  const camel = words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('');
  return camel ? `#${camel}` : '';
}

// Divide o bloco cru de hashtags em frases, preservando frases multi-palavra:
// se houver '#', cada token começa num '#' (a frase vai até o próximo '#');
// sem '#', usa vírgula como separador (espaço quebraria frases multi-palavra).
function splitHashtagPhrases(raw) {
  const s = String(raw || '').trim();
  if (!s) return [];
  if (s.includes('#')) return s.split(/(?=#)/).map((x) => x.trim()).filter(Boolean);
  return s.split(',').map((x) => x.trim()).filter(Boolean);
}

// Monta a lista final de hashtags a partir de frases cruas: token único cada
// (CamelCase), sem stopword solta, dedup case-insensitive, no máx 5 — #Shorts
// sempre por último.
function buildHashtagList(rawList) {
  const out = [];
  for (const raw of rawList || []) {
    const tag = buildHashtag(raw);
    if (!tag || tag.toLowerCase() === '#shorts') continue; // #Shorts é sempre adicionado no fim
    if (out.some((x) => x.toLowerCase() === tag.toLowerCase())) continue;
    out.push(tag);
  }
  return [...out.slice(0, 4), '#Shorts'];
}

// ─── roteiro ─────────────────────────────────────────────────────────────────
function loadScript(slug) {
  const p = join(SCRIPT_DIR, `${slug}.script.json`);
  if (!existsSync(p)) throw new Error(`Roteiro não encontrado: ${p}`);
  return JSON.parse(readFileSync(p, 'utf-8'));
}

// Resolve o link da calculadora: usa o cta.target se for URL, senão o padrão.
function resolveToolUrl(script) {
  const t = script?.cta?.target;
  if (typeof t === 'string' && /^https?:\/\//.test(t)) return t;
  return BLOG_TOOLS_URL;
}

// ─── metadados via LLM (com fallback determinístico) ─────────────────────────
async function tryLlm(script) {
  // Import dinâmico e protegido: se o módulo/keys falharem, caímos no template.
  let generateText;
  try {
    ({ generateText } = await import('../apis/kie-ai.js'));
  } catch (err) {
    log(`⚠️ LLM indisponível (import falhou: ${err.message}) — usando template determinístico.`);
    return null;
  }

  const narrationSummary = (script.scenes || [])
    .map((s) => s.narration).filter(Boolean).join(' ')
    .replace(/\s+/g, ' ').slice(0, 700);

  const prompt = `Você é editor de um canal de finanças no YouTube (pt-BR). A partir do roteiro de um Short, gere metadados de publicação. Responda EXATAMENTE neste formato, sem comentários:

---TITULO---
[título em pt-BR, MÁXIMO 90 caracteres, com a palavra-chave "${script.keyword}" logo no começo, natural e chamativo, SEM spam de clickbait, SEM emojis]
---DESCRICAO---
[gancho de 2 a 3 linhas resumindo o vídeo, tom coloquial, pt-BR, SEM hashtags e SEM links aqui]
---HASHTAGS---
[3 a 5 hashtags separadas por espaço; a PRIMEIRA a mais específica do tema; NÃO inclua #Shorts (ele é adicionado depois)]
---TAGS---
[8 a 12 variações de palavra-chave para SEO, separadas por vírgula]

Dados do roteiro:
- Termo: ${script.term}
- Palavra-chave: ${script.keyword}
- Categoria: ${script.category}
- CTA: ${script?.cta?.text || ''}
- Narração: ${narrationSummary}`;

  try {
    const out = await generateText(prompt, { maxTokens: 600, temperature: 0.6 });
    const grab = (tag, next) => {
      const re = new RegExp(`---${tag}---\\s*([\\s\\S]*?)(?=---(?:${next})---|$)`);
      const m = out.match(re);
      return m ? m[1].trim() : '';
    };
    const title = grab('TITULO', 'DESCRICAO');
    const description = grab('DESCRICAO', 'HASHTAGS');
    const hashtagsRaw = grab('HASHTAGS', 'TAGS');
    const tagsRaw = grab('TAGS', '');
    if (!title || !description) {
      log('⚠️ LLM devolveu formato incompleto — usando template determinístico.');
      return null;
    }
    return {
      title: title.replace(/^["']|["']$/g, ''),
      descriptionHook: description,
      hashtags: splitHashtagPhrases(hashtagsRaw),
      tags: tagsRaw.split(',').map((t) => t.trim()).filter(Boolean),
    };
  } catch (err) {
    log(`⚠️ LLM falhou (${err.message}) — usando template determinístico.`);
    return null;
  }
}

// Template 100% determinístico a partir dos campos do roteiro.
function deterministicMeta(script) {
  const kw = script.keyword || script.term || 'Finanças';
  const title = `${kw}: como funciona em 1 minuto`;
  const descriptionHook =
    `Entenda ${script.term} de um jeito simples e rápido.\n` +
    `${script?.cta?.text || 'Coloque em prática com as ferramentas grátis do FinMoovi.'}`;
  const hashtags = [
    buildHashtag(kw),
    '#FinançasPessoais',
    '#EducaçãoFinanceira',
    '#Investimentos',
    '#Dinheiro',
  ].filter(Boolean);
  const tags = [
    kw, script.term, `${kw} explicado`, `o que é ${kw}`, `como funciona ${kw}`,
    'finanças pessoais', 'educação financeira', 'investimentos', 'dinheiro',
    'finanças', 'FinMoovi', script.category,
  ].filter(Boolean);
  return { title, descriptionHook, hashtags, tags };
}

// Monta o payload final (snippet/status) já sanitizado.
function buildMetadata(raw, script) {
  const toolUrl = resolveToolUrl(script);

  const title = sanitizeText(raw.title, 100) || sanitizeText(`${script.keyword}`, 100);

  // Hashtags: token único (CamelCase), sem stopword solta, dedup, no máx 5 (#Shorts sempre por último).
  const hashtags = buildHashtagList(raw.hashtags);

  const hook = sanitizeText(raw.descriptionHook, 1500);
  const description = sanitizeText([
    hook,
    '',
    `🔗 Calculadora grátis: ${toolUrl}`,
    `📲 Organize suas finanças: ${APP_URL}`,
    '',
    hashtags.join(' '),
  ].join('\n'), 5000);

  // Tags: sanitiza, dedup (case-insensitive), 8–12, respeita limite ~460 chars.
  const seen = new Set();
  const tags = [];
  let tagsLen = 0;
  for (const t of raw.tags) {
    const clean = sanitizeText(t, 60);
    const key = clean.toLowerCase();
    if (!clean || seen.has(key)) continue;
    if (tags.length >= 12) break;
    if (tagsLen + clean.length + 1 > 460) break;
    seen.add(key);
    tags.push(clean);
    tagsLen += clean.length + 1;
  }

  return {
    snippet: {
      title,
      description,
      tags,
      categoryId: '27', // Education
      defaultLanguage: 'pt-BR',
      defaultAudioLanguage: 'pt-BR',
    },
    status: {
      privacyStatus: 'private', // travado até a auditoria da API passar
      selfDeclaredMadeForKids: false,
      license: 'youtube',
    },
  };
}

// ─── OAuth ───────────────────────────────────────────────────────────────────
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

// Traduz erros da API em mensagens acionáveis.
function explainApiError(status, body) {
  if (status === 401) {
    return `401 — access token expirado/inválido. Rode scripts/youtube-auth.js e atualize YOUTUBE_REFRESH_TOKEN. ${body}`;
  }
  if (status === 403) {
    if (/quota/i.test(body)) return `403 — cota da API do YouTube esgotada (upload custa ~1600 unidades; cota diária 10k). Tente amanhã. ${body}`;
    return `403 — acesso negado (escopo/permissão do canal ou API de upload desabilitada). ${body}`;
  }
  return `${status}: ${body}`;
}

// ─── upload resumível ────────────────────────────────────────────────────────
async function uploadVideo(accessToken, metadata, mp4Path) {
  const size = statSync(mp4Path).size;

  // 1. Initiate.
  const init = await fetch(UPLOAD_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Type': 'video/mp4',
      'X-Upload-Content-Length': String(size),
    },
    body: JSON.stringify(metadata),
  });
  if (!init.ok) {
    const body = await init.text().catch(() => '');
    throw new Error(`Falha ao iniciar upload — ${explainApiError(init.status, body)}`);
  }
  const location = init.headers.get('location');
  if (!location) throw new Error('Upload iniciado sem header Location (URL resumível).');

  // 2. PUT dos bytes.
  const bytes = readFileSync(mp4Path);
  const put = await fetch(location, {
    method: 'PUT',
    headers: { 'Content-Type': 'video/mp4', 'Content-Length': String(size) },
    body: bytes,
  });
  const putText = await put.text();
  if (!put.ok) {
    throw new Error(`Falha ao enviar bytes — ${explainApiError(put.status, putText)}`);
  }
  const video = JSON.parse(putText);
  if (!video.id) throw new Error(`Upload retornou sem id: ${putText.slice(0, 300)}`);
  return video.id;
}

// ─── captions.insert (multipart) ─────────────────────────────────────────────
async function insertCaption(accessToken, videoId, srtPath, langMeta) {
  const boundary = `----finmoovi-caption-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const meta = {
    snippet: {
      videoId,
      language: langMeta.language,
      name: langMeta.name,
      isDraft: false,
    },
  };
  const srt = readFileSync(srtPath);
  const head = Buffer.from(
    `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    `${JSON.stringify(meta)}\r\n` +
    `--${boundary}\r\n` +
    'Content-Type: application/octet-stream\r\n\r\n',
    'utf-8',
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf-8');
  const body = Buffer.concat([head, srt, tail]);

  const res = await fetch(CAPTIONS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
      'Content-Length': String(body.length),
    },
    body,
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(explainApiError(res.status, t));
  }
  return true;
}

// ─── tracking / dedup ────────────────────────────────────────────────────────
function loadTracking() {
  if (!existsSync(TRACKING)) return {};
  try { return JSON.parse(readFileSync(TRACKING, 'utf-8')) || {}; }
  catch { return {}; }
}
function saveTracking(data) {
  mkdirSync(dirname(TRACKING), { recursive: true });
  writeFileSync(TRACKING, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
}

// ─── main ────────────────────────────────────────────────────────────────────
async function main() {
  log(`\n=== YouTube upload — slug "${SLUG}"${DRY_RUN ? ' (DRY-RUN)' : ''} ===`);

  const script = loadScript(SLUG);

  // Dedup (não bloqueia o dry-run).
  const tracking = loadTracking();
  if (!DRY_RUN && tracking[SLUG]) {
    const t = tracking[SLUG];
    log(`✅ "${SLUG}" já publicado em ${t.uploadedAt} → https://youtu.be/${t.videoId}`);
    log('Nada a fazer (sem upload duplicado).');
    return;
  }

  // Metadados: LLM → fallback determinístico.
  const raw = (await tryLlm(script)) || deterministicMeta(script);
  const metadata = buildMetadata(raw, script);

  // Arquivos.
  const mp4Path = join(MP4_DIR, `${SLUG}.mp4`);
  const srtPaths = CAPTION_LANGS.map((l) => ({
    ...l,
    path: join(AUDIO_ROOT, SLUG, `${SLUG}.${l.code}.srt`),
  }));

  if (DRY_RUN) {
    log('\n── PAYLOAD (dry-run, nada foi enviado) ──');
    log(JSON.stringify(metadata, null, 2));
    log('\n── Arquivos que seriam enviados ──');
    log(`MP4: ${mp4Path} ${existsSync(mp4Path) ? '(ok)' : '(FALTANDO)'}`);
    for (const s of srtPaths) {
      log(`SRT ${s.code}: ${s.path} ${existsSync(s.path) ? '(ok)' : '(FALTANDO)'}`);
    }
    log('\nDry-run concluído.');
    return;
  }

  if (!existsSync(mp4Path)) throw new Error(`MP4 não encontrado: ${mp4Path} — rode o render antes.`);

  // Upload.
  const accessToken = await getAccessToken();
  log('🔑 Access token renovado.');
  log('⬆️  Enviando vídeo (privado)...');
  const videoId = await uploadVideo(accessToken, metadata, mp4Path);
  const url = `https://youtu.be/${videoId}`;
  log(`✅ Vídeo enviado: ${url}`);

  // Legendas (falha em uma não derruba as outras nem o processo).
  for (const s of srtPaths) {
    if (!existsSync(s.path)) { log(`⚠️ legenda ${s.code} ausente (${s.path}) — pulada.`); continue; }
    try {
      await insertCaption(accessToken, videoId, s.path, s);
      log(`✅ legenda ${s.language} (${s.name}) inserida.`);
    } catch (err) {
      log(`⚠️ legenda ${s.code} falhou (vídeo já está no ar): ${err.message}`);
    }
  }

  // Tracking.
  tracking[SLUG] = { videoId, uploadedAt: new Date().toISOString(), title: metadata.snippet.title };
  saveTracking(tracking);
  log(`📝 tracking atualizado em ${TRACKING}`);

  log(`\n🔒 Vídeo PRIVADO — publicar com 1 clique no YouTube Studio (auditoria da API pendente).`);
  log(`   ${url}`);
}

main().catch((err) => {
  console.error(`\n❌ ${err.message}`);
  process.exit(1);
});
