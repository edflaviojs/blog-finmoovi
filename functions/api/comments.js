/**
 * /api/comments — comentários próprios do blog (substitui o giscus).
 *
 * GET  ?slug=/posts/foo&locale=pt
 *        → lista comentários APROVADOS (anon key + RLS; cache 60s).
 *          A resposta inclui turnstileSiteKey (ou null) para o widget opcional.
 * GET  ?pending=1&accessKey=...
 *        → lista PENDENTES para moderação na /status (usa service key).
 * POST { slug, locale, nome, comentario, website, turnstileToken? }
 *        → grava com status 'pending' (nada aparece sem moderação).
 *          - website = honeypot: preenchido → 200 silencioso SEM gravar.
 *          - Turnstile: só valida se TURNSTILE_SECRET existir no env.
 * PATCH { accessKey, id, action: 'approve' | 'reject' }
 *        → aprova/rejeita (accessKey = mesma KEYWORDS_ACCESS_KEY da /status;
 *          UPDATE via SUPABASE_SERVICE_KEY — o anon é barrado pelo RLS).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚙️ SETUP (dono) — env vars no painel do Cloudflare Pages (as env dos GitHub
 * Actions NÃO valem aqui; Pages Functions têm env PRÓPRIO):
 *
 * Cloudflare Dashboard → Workers & Pages → blog-finmoovi →
 * Settings → Environment variables → Production → Add variable:
 *
 * 1. SUPABASE_URL          — Supabase → Settings → API → Project URL
 * 2. SUPABASE_ANON_KEY     — Supabase → Settings → API → anon public
 * 3. SUPABASE_SERVICE_KEY  — Supabase → Settings → API → service_role
 *                            (⚠️ clicar em "Encrypt" — é a chave que ignora RLS)
 * 4. KEYWORDS_ACCESS_KEY   — já existe (form de keywords da /status); reusada.
 * 5. (opcionais) TURNSTILE_SITE_KEY + TURNSTILE_SECRET — se existirem, o
 *    Turnstile é exigido no POST; ausentes → só honeypot + rate-limit.
 *
 * Depois de salvar: "Retry deployment". Detalhes em docs/COMENTARIOS.md.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * SEGURANÇA/PRIVACIDADE:
 *  - chaves nunca são logadas nem devolvidas em resposta;
 *  - IP puro nunca é gravado — só SHA-256 truncado de (IP + dia) p/ auditoria;
 *  - rate-limit é best-effort em memória (isolates do CF não compartilham
 *    estado e reciclam) — a defesa REAL é a moderação: tudo nasce 'pending'.
 */

const TABLE = 'blog_comments';
const MAX_NAME = 60;
const MAX_BODY = 1200;
const MIN_NAME = 2;
const MIN_BODY = 3;
const LOCALES = ['pt', 'en', 'es'];

// Rate-limit best-effort: N envios por IP por janela, num Map do módulo.
// Limitação documentada: cada isolate do Cloudflare tem o SEU Map (não é
// distribuído; KV/DO não estão em uso neste projeto) — serve para segurar
// rajadas óbvias do mesmo POP, não como barreira absoluta.
const RATE_MAX = 5;
const RATE_WINDOW_MS = 10 * 60 * 1000; // 10 min
const rateBuckets = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const hits = (rateBuckets.get(ip) || []).filter(t => now - t < RATE_WINDOW_MS);
  if (hits.length >= RATE_MAX) {
    rateBuckets.set(ip, hits);
    return true;
  }
  hits.push(now);
  rateBuckets.set(ip, hits);
  if (rateBuckets.size > 5000) rateBuckets.clear(); // teto de memória
  return false;
}

/**
 * Validador PURO do payload do POST (exportado para teste unitário em Node,
 * como o parseKeywords do keywords.js). Não toca em env/fetch.
 *
 * Retorna:
 *   { spam: true }                → honeypot preenchido (200 silencioso)
 *   { ok: false, error: '...' }   → payload inválido (mensagem acionável)
 *   { ok: true, data: { slug, locale, nome, comentario } }
 */
export function validateCommentPayload(raw) {
  const body = raw && typeof raw === 'object' ? raw : {};

  // Honeypot: humanos não veem o campo "website"; bot que preencher é spam.
  if (String(body.website || '').trim() !== '') return { spam: true };

  const slug = String(body.slug || '').trim();
  // slug sane = pathname interno: começa com '/', minúsculas/números/hífens,
  // sem '//' nem '..' — nada de URLs externas ou lixo.
  if (!/^\/[a-z0-9\-/]{0,199}$/.test(slug) || slug.includes('//') || slug.includes('..')) {
    return { ok: false, error: 'Página inválida — recarregue o post e tente de novo.' };
  }

  const locale = String(body.locale || 'pt').trim().toLowerCase();
  if (!LOCALES.includes(locale)) {
    return { ok: false, error: `Idioma inválido: "${locale}". Use pt, en ou es.` };
  }

  // Nome/comentário: colapsa espaços, remove caracteres de controle.
  const clean = (s) => String(s || '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const cleanMultiline = (s) => String(s || '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const nome = clean(body.nome);
  if (nome.length < MIN_NAME) {
    return { ok: false, error: 'Diga seu nome (mínimo 2 caracteres).' };
  }
  if (nome.length > MAX_NAME) {
    return { ok: false, error: `Nome muito longo — máximo ${MAX_NAME} caracteres.` };
  }
  // Nome com URL = quase sempre spam de link.
  if (/https?:\/\//i.test(nome)) {
    return { ok: false, error: 'O nome não pode conter links.' };
  }

  const comentario = cleanMultiline(body.comentario);
  if (comentario.length < MIN_BODY) {
    return { ok: false, error: 'Escreva um comentário (mínimo 3 caracteres).' };
  }
  if (comentario.length > MAX_BODY) {
    return { ok: false, error: `Comentário muito longo — máximo ${MAX_BODY} caracteres (recebi ${comentario.length}).` };
  }

  return { ok: true, data: { slug, locale, nome, comentario } };
}

function json(status, payload, extraHeaders) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...(extraHeaders || {}),
    },
  });
}

function supabaseHeaders(key, extra) {
  return {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
    ...(extra || {}),
  };
}

// SHA-256 truncado (16 hex) de IP + dia — pseudonimizado e rotativo (LGPD):
// não dá para reverter no IP e o mesmo IP muda de hash a cada dia.
async function hashIpDay(ip) {
  const day = new Date().toISOString().slice(0, 10);
  const data = new TextEncoder().encode(`${ip}|${day}|finmoovi-comments`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)]
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);
}

const MISSING_ENV_MSG =
  'Função não configurada: crie SUPABASE_URL e SUPABASE_ANON_KEY em Cloudflare Pages → Settings → Environment variables e faça Retry deployment (veja docs/COMENTARIOS.md).';

// ── GET: lista aprovados (público) OU pendentes (moderação) ──
export async function onRequestGet(context) {
  const { request, env } = context;
  try {
    if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
      return json(500, { error: MISSING_ENV_MSG });
    }
    const url = new URL(request.url);

    // ── Modo moderação: ?pending=1&accessKey=... (usa service key) ──
    if (url.searchParams.get('pending') === '1') {
      if (!env.KEYWORDS_ACCESS_KEY || !env.SUPABASE_SERVICE_KEY) {
        return json(500, {
          error: 'Moderação não configurada: crie SUPABASE_SERVICE_KEY (e KEYWORDS_ACCESS_KEY) no Cloudflare Pages e faça Retry deployment.',
        });
      }
      if (String(url.searchParams.get('accessKey') || '') !== env.KEYWORDS_ACCESS_KEY) {
        return json(401, { error: 'Não autorizado.' });
      }
      const res = await fetch(
        `${env.SUPABASE_URL}/rest/v1/${TABLE}` +
          `?status=eq.pending&select=id,page_slug,locale,author_name,body,created_at&order=created_at.asc&limit=100`,
        { headers: supabaseHeaders(env.SUPABASE_SERVICE_KEY) }
      );
      if (!res.ok) {
        return json(502, { error: `Supabase respondeu ${res.status} ao listar pendentes — confira a SUPABASE_SERVICE_KEY e se o SQL db/blog-comments.sql já foi rodado.` });
      }
      const pending = await res.json();
      return json(200, { pending });
    }

    // ── Modo público: aprovados de uma página ──
    const check = validateCommentPayload({
      slug: url.searchParams.get('slug'),
      locale: url.searchParams.get('locale'),
      nome: 'leitor', // dummies só p/ reusar a validação de slug/locale
      comentario: '...',
    });
    if (!check.ok) return json(400, { error: check.error });
    const { slug, locale } = check.data;

    // RLS já garante "só approved" para a anon key; o filtro explícito é
    // por clareza e para o índice trabalhar.
    const res = await fetch(
      `${env.SUPABASE_URL}/rest/v1/${TABLE}` +
        `?page_slug=eq.${encodeURIComponent(slug)}&locale=eq.${encodeURIComponent(locale)}` +
        `&status=eq.approved&select=author_name,body,created_at&order=created_at.asc&limit=200`,
      { headers: supabaseHeaders(env.SUPABASE_ANON_KEY) }
    );
    if (!res.ok) {
      return json(502, { error: `Supabase respondeu ${res.status} — se a tabela não existe, rode db/blog-comments.sql no SQL Editor.` });
    }
    const comments = await res.json();
    return json(200,
      { comments, turnstileSiteKey: env.TURNSTILE_SITE_KEY || null },
      { 'Cache-Control': 'public, max-age=60' } // cache curto: novo aprovado aparece em ≤1 min
    );
  } catch (err) {
    return json(500, { error: `Erro interno: ${err && err.message ? err.message : 'desconhecido'}. Tente novamente.` });
  }
}

// ── POST: novo comentário (sempre nasce 'pending') ──
export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
      return json(500, { error: MISSING_ENV_MSG });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json(400, { error: 'Body inválido — envie JSON: { slug, locale, nome, comentario }.' });
    }

    const check = validateCommentPayload(body);
    // Honeypot: responde igual a um sucesso, sem gravar nada (bot não aprende).
    if (check.spam) return json(200, { ok: true, moderated: true });
    if (!check.ok) return json(400, { error: check.error });

    const ip = request.headers.get('CF-Connecting-IP') || '0.0.0.0';
    if (rateLimited(ip)) {
      return json(429, { error: 'Muitos comentários em pouco tempo — aguarde alguns minutos e tente de novo.' });
    }

    // Turnstile OPCIONAL: só entra em cena se o secret existir no env.
    if (env.TURNSTILE_SECRET) {
      const token = String(body.turnstileToken || '');
      if (!token) {
        return json(400, { error: 'Verificação anti-robô pendente — complete o desafio e reenvie.' });
      }
      const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: env.TURNSTILE_SECRET, response: token, remoteip: ip }),
      });
      const outcome = await verify.json().catch(() => ({}));
      if (!outcome.success) {
        return json(400, { error: 'Verificação anti-robô falhou — recarregue a página e tente de novo.' });
      }
    }

    const ip_hash = await hashIpDay(ip);
    const { slug, locale, nome, comentario } = check.data;

    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${TABLE}`, {
      method: 'POST',
      headers: supabaseHeaders(env.SUPABASE_ANON_KEY, { 'Prefer': 'return=minimal' }),
      body: JSON.stringify({
        page_slug: slug,
        locale,
        author_name: nome,
        body: comentario,
        status: 'pending', // RLS (WITH CHECK) recusa qualquer outro valor
        ip_hash,
      }),
    });
    if (!res.ok) {
      if (res.status === 404) {
        return json(502, { error: 'Tabela blog_comments não encontrada — rode db/blog-comments.sql no SQL Editor do Supabase.' });
      }
      return json(502, { error: `Supabase respondeu ${res.status} ao gravar — tente novamente em instantes.` });
    }

    return json(200, { ok: true, moderated: true });
  } catch (err) {
    return json(500, { error: `Erro interno: ${err && err.message ? err.message : 'desconhecido'}. Tente novamente.` });
  }
}

// ── PATCH: moderação (aprovar/rejeitar) — exige accessKey + service key ──
export async function onRequestPatch(context) {
  const { request, env } = context;
  try {
    if (!env.KEYWORDS_ACCESS_KEY || !env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
      return json(500, {
        error: 'Moderação não configurada: crie SUPABASE_URL, SUPABASE_SERVICE_KEY e KEYWORDS_ACCESS_KEY no Cloudflare Pages (docs/COMENTARIOS.md) e faça Retry deployment.',
      });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json(400, { error: 'Body inválido — envie JSON: { accessKey, id, action }.' });
    }

    // Resposta genérica de propósito (não revela se a senha existe).
    if (String(body.accessKey || '') !== env.KEYWORDS_ACCESS_KEY) {
      return json(401, { error: 'Não autorizado.' });
    }

    const id = String(body.id || '').trim();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return json(400, { error: 'id inválido — esperava um uuid.' });
    }
    const action = String(body.action || '').trim();
    if (action !== 'approve' && action !== 'reject') {
      return json(400, { error: `action inválida: "${action}". Use approve ou reject.` });
    }

    const res = await fetch(
      `${env.SUPABASE_URL}/rest/v1/${TABLE}?id=eq.${id}`,
      {
        method: 'PATCH',
        headers: supabaseHeaders(env.SUPABASE_SERVICE_KEY, { 'Prefer': 'return=representation' }),
        body: JSON.stringify({ status: action === 'approve' ? 'approved' : 'rejected' }),
      }
    );
    if (!res.ok) {
      return json(502, { error: `Supabase respondeu ${res.status} na moderação — confira a SUPABASE_SERVICE_KEY (service_role, não a anon).` });
    }
    const rows = await res.json().catch(() => []);
    if (!Array.isArray(rows) || rows.length === 0) {
      return json(404, { error: 'Comentário não encontrado — pode já ter sido moderado em outra aba.' });
    }

    return json(200, { ok: true, id, status: rows[0].status });
  } catch (err) {
    return json(500, { error: `Erro interno: ${err && err.message ? err.message : 'desconhecido'}. Tente novamente.` });
  }
}
