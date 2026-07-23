/**
 * POST /api/keywords — recebe keywords do formulário da /status e dá APPEND
 * no data/keywords-manuais.csv do repo (GitHub Contents API). O push do CSV
 * dispara o workflow keywords-manuais.yml, que sincroniza a fila
 * (.github/data/keyword-queue.json) — NENHUM workflow novo é necessário.
 *
 * Body JSON: { accessKey, keywords, categoria }
 *   - accessKey:  senha de acesso (comparada com env KEYWORDS_ACCESS_KEY)
 *   - keywords:   string com itens separados por vírgula OU quebra de linha
 *                 (máx. 50 por envio)
 *   - categoria:  opcional — 'dicas' | 'investimentos' | 'orcamento' | 'glossario' | '' (qualquer)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚙️ SETUP (dono) — 2 variáveis de ambiente no painel do Cloudflare Pages:
 *
 * Cloudflare Dashboard → Workers & Pages → blog-finmoovi →
 * Settings → Environment variables → Production → Add variable
 * (clique em "Encrypt" nas duas — são segredos):
 *
 * 1. KEYWORDS_ACCESS_KEY
 *    - Uma senha que VOCÊ inventa (longa, ex.: 30+ caracteres aleatórios).
 *    - É a mesma senha que você digita no campo "Senha" do formulário da /status.
 *
 * 2. GITHUB_KEYWORDS_TOKEN
 *    - GitHub → Settings → Developer settings → Personal access tokens →
 *      Fine-grained tokens → Generate new token.
 *    - Token name: "cf-pages-keywords" (ou similar); Expiration: 1 ano.
 *    - Resource owner: edflaviojs; Repository access: "Only select
 *      repositories" → APENAS blog-finmoovi.
 *    - Permissions → Repository permissions → Contents: "Read and write".
 *      (nada mais — nenhuma outra permissão é necessária)
 *    - Copie o token gerado (github_pat_...) para o valor da variável.
 *
 * Depois de salvar as duas, faça "Retry deployment" (ou espere o próximo
 * deploy) para as variáveis valerem nas Functions.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * SEGURANÇA: o token NUNCA é logado nem devolvido em resposta; erro de senha
 * responde 401 genérico (sem dizer se a senha existe ou está errada).
 */

const GITHUB_REPO = 'edflaviojs/blog-finmoovi';
const CSV_PATH = 'data/keywords-manuais.csv';
const BRANCH = 'main';
const MAX_KEYWORDS = 50;
const VALID_CATEGORIES = ['dicas', 'investimentos', 'orcamento', 'glossario'];

/**
 * Parser puro (exportado para teste unitário em Node): transforma a string
 * bruta em lista de keywords — separa por vírgula OU quebra de linha, faz
 * trim, ignora vazios e remove duplicatas exatas (case-insensitive) dentro
 * do próprio envio. Não aplica o teto (o handler valida MAX_KEYWORDS para
 * devolver erro claro em vez de truncar em silêncio).
 */
export function parseKeywords(raw) {
  const seen = new Set();
  const out = [];
  for (const piece of String(raw || '').split(/[,\r\n]+/)) {
    const kw = piece.replace(/\s+/g, ' ').trim();
    if (!kw) continue;
    const key = kw.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(kw);
  }
  return out;
}

function json(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

// UTF-8 → base64 (btoa só aceita latin1; TextEncoder resolve os acentos).
function toBase64Utf8(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

// base64 → UTF-8 (a Contents API devolve o content com quebras de linha).
function fromBase64Utf8(b64) {
  const bin = atob(String(b64 || '').replace(/\s+/g, ''));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder('utf-8').decode(bytes);
}

function githubHeaders(token) {
  return {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'finmoovi-status-keywords',
    'Content-Type': 'application/json',
  };
}

/**
 * GET do CSV (conteúdo + sha) → concatena as linhas novas → PUT com o sha.
 * Retorna a Response do PUT (o chamador decide o retry em 409).
 */
async function appendToCsv(token, lines) {
  const apiUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${CSV_PATH}?ref=${BRANCH}`;

  const getRes = await fetch(apiUrl, { headers: githubHeaders(token) });
  if (!getRes.ok) {
    return { ok: false, status: getRes.status, step: 'GET' };
  }
  const file = await getRes.json();
  let csv = fromBase64Utf8(file.content);
  if (csv.length > 0 && !csv.endsWith('\n')) csv += '\n';
  csv += lines.join('\n') + '\n';

  const putRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${CSV_PATH}`, {
    method: 'PUT',
    headers: githubHeaders(token),
    body: JSON.stringify({
      message: `chore: ${lines.length} keyword(s) via /status`,
      content: toBase64Utf8(csv),
      sha: file.sha,
      branch: BRANCH,
    }),
  });
  return { ok: putRes.ok, status: putRes.status, step: 'PUT' };
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    // ── Env vars obrigatórias (erro acionável se faltarem) ──
    if (!env.KEYWORDS_ACCESS_KEY || !env.GITHUB_KEYWORDS_TOKEN) {
      return json(500, {
        error: 'Função não configurada: crie KEYWORDS_ACCESS_KEY e GITHUB_KEYWORDS_TOKEN em Cloudflare Pages → Settings → Environment variables (veja functions/api/keywords.js ou docs/KEYWORDS-MANUAIS.md).',
      });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json(400, { error: 'Body inválido — envie JSON: { accessKey, keywords, categoria }.' });
    }

    // ── Autenticação (resposta genérica de propósito) ──
    if (String(body.accessKey || '') !== env.KEYWORDS_ACCESS_KEY) {
      return json(401, { error: 'Não autorizado.' });
    }

    // ── Categoria (opcional) ──
    const categoria = String(body.categoria || '').trim().toLowerCase();
    if (categoria && !VALID_CATEGORIES.includes(categoria)) {
      return json(400, {
        error: `Categoria inválida: "${categoria}". Use dicas, investimentos, orcamento, glossario — ou deixe vazio (qualquer gerador).`,
      });
    }

    // ── Keywords ──
    const keywords = parseKeywords(body.keywords);
    if (keywords.length === 0) {
      return json(400, { error: 'Nenhuma keyword encontrada — separe por vírgula ou uma por linha.' });
    }
    if (keywords.length > MAX_KEYWORDS) {
      return json(400, {
        error: `Máximo de ${MAX_KEYWORDS} keywords por envio — recebi ${keywords.length}. Divida em envios menores.`,
      });
    }

    // Linhas CSV: keyword,categoria,observacao. As keywords nunca contêm
    // vírgula (o parser separa por vírgula), então o CSV fica sempre válido.
    const dia = new Intl.DateTimeFormat('pt-PT', {
      day: '2-digit', month: '2-digit', timeZone: 'Europe/Lisbon',
    }).format(new Date());
    const lines = keywords.map(kw => `${kw},${categoria},enviado via /status ${dia}`);

    // ── APPEND no CSV via Contents API (1 retry em conflito 409) ──
    let result = await appendToCsv(env.GITHUB_KEYWORDS_TOKEN, lines);
    if (!result.ok && result.status === 409) {
      result = await appendToCsv(env.GITHUB_KEYWORDS_TOKEN, lines); // sha mudou entre GET e PUT — tenta 1x com sha fresco
    }

    if (!result.ok) {
      if (result.status === 401 || result.status === 403) {
        return json(502, {
          error: 'GitHub recusou o token (401/403). Confira o GITHUB_KEYWORDS_TOKEN no Cloudflare Pages: fine-grained PAT do repo blog-finmoovi com Contents: Read and write — pode ter expirado.',
        });
      }
      if (result.status === 404) {
        return json(502, {
          error: `GitHub respondeu 404 no ${result.step} de ${CSV_PATH} — o token precisa ter acesso ao repo ${GITHUB_REPO} (fine-grained PAT sem o repo selecionado responde 404).`,
        });
      }
      return json(502, {
        error: `GitHub respondeu ${result.status} no ${result.step} — tente de novo em instantes; se persistir, confira o status da API do GitHub.`,
      });
    }

    return json(200, {
      received: keywords.length,
      sent: keywords.length,
      categoria: categoria || null,
      message: `${keywords.length} keyword(s) enviadas para o CSV. O workflow sincroniza a fila em ~2-3 min.`,
    });
  } catch (err) {
    // Nunca inclui env/token na mensagem.
    return json(500, { error: `Erro interno: ${err && err.message ? err.message : 'desconhecido'}. Tente novamente.` });
  }
}
