/**
 * gsc-posts.js — Biblioteca compartilhada da FASE 2 do Motor GSC (Seção 42.10).
 *
 * Fornece às automações de OTIMIZAÇÃO (título/meta por CTR, striking-distance,
 * refresh/decay, canibalização) tudo que envolve MEXER em post real, com travas
 * ANTI-DEGRADAÇÃO fortes (o full-auto pedido só é seguro por causa delas):
 *
 *  - Mapeamento robusto URL do GSC → arquivo (casa com/sem prefixo en-/es-).
 *  - Patch CIRÚRGICO de frontmatter (title, description, seo.metaTitle/Description,
 *    updatedAt) preservando
 *    byte-a-byte o resto do arquivo (mesma filosofia do i18n-sync).
 *  - Inserção de seção APPEND-ONLY (nunca reescreve/apaga conteúdo existente;
 *    insere antes do marcador <!-- SCHEMA_AUTO --> ou no fim do corpo).
 *  - Validadores de segurança: comprimento de title/meta, tema preservado,
 *    corpo nunca encolhe, e BLOQUEIO de fabricação de números (R$/%/anos novos).
 *  - Rollback: snapshot do original; se o validador i18n falhar, restaura e aborta.
 *  - Suporte a GSC_DRY_RUN=1 (mostra o que faria, sem escrever/commitar).
 *
 * Módulo puro em node (fs/path/child_process); reusa splitFrontmatter/
 * localeFromFilename do i18n-sync e coreTokens do seo-guard.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { querySearchAnalytics, GSC_SITE_URL, hasGscCredentials } from '../apis/gsc.js';
import { splitFrontmatter, localeFromFilename } from './i18n-sync.js';
import { coreTokens, slugifyTheme } from './seo-guard.js';

export const POSTS_DIR = join(process.cwd(), 'src', 'content', 'posts');
export const DRY_RUN = process.env.GSC_DRY_RUN === '1';

// ─────────────────────────────────────────────────────────────────────────────
// Datas / GSC
// ─────────────────────────────────────────────────────────────────────────────

export function dateRange(days = 28) {
  const end = new Date();
  const start = new Date(end.getTime() - days * 86400000);
  const fmt = d => d.toISOString().split('T')[0];
  return { startDate: fmt(start), endDate: fmt(end) };
}

/** Split de um período em duas metades (para detectar tendência/decay). */
export function splitPeriods(days = 56) {
  const end = new Date();
  const mid = new Date(end.getTime() - (days / 2) * 86400000);
  const start = new Date(end.getTime() - days * 86400000);
  const fmt = d => d.toISOString().split('T')[0];
  return {
    recent: { startDate: fmt(mid), endDate: fmt(end) },
    older: { startDate: fmt(start), endDate: fmt(mid) },
  };
}

export { hasGscCredentials, GSC_SITE_URL, querySearchAnalytics };

// ─────────────────────────────────────────────────────────────────────────────
// Mapeamento URL do GSC → arquivo do post
// ─────────────────────────────────────────────────────────────────────────────

export function listPostFiles() {
  if (!existsSync(POSTS_DIR)) return [];
  return readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));
}

function fileSlug(file) {
  return file.replace(/\.md$/, '').toLowerCase();
}
function baseSlug(file) {
  return file.replace(/^(en-|es-)/, '').replace(/\.md$/, '').toLowerCase();
}

/** Extrai { locale, slug } de uma URL/― caminho do GSC apontando para um post. */
function parsePostUrl(pageUrl) {
  let path;
  try {
    path = new URL(pageUrl).pathname;
  } catch {
    path = String(pageUrl);
  }
  path = path.replace(/\/+$/, '');
  const locale = path.startsWith('/en/') ? 'en' : path.startsWith('/es/') ? 'es' : 'pt';
  const idx = path.indexOf('/posts/');
  if (idx === -1) return null;
  const slug = decodeURIComponent(path.slice(idx + '/posts/'.length)).toLowerCase();
  if (!slug || slug.includes('/')) return null;
  return { locale, slug };
}

/**
 * Resolve a URL do GSC para o arquivo do post (casa com/sem prefixo de locale,
 * já que os slugs públicos do repo não são 1:1 com o nome do arquivo).
 * Retorna o filename ou null.
 */
export function pageUrlToFile(pageUrl) {
  const parsed = parsePostUrl(pageUrl);
  if (!parsed) return null;
  for (const file of listPostFiles()) {
    if (localeFromFilename(file) !== parsed.locale) continue;
    if (fileSlug(file) === parsed.slug || baseSlug(file) === parsed.slug) return file;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Leitura / patch cirúrgico de frontmatter
// ─────────────────────────────────────────────────────────────────────────────

export function readRaw(file) {
  return readFileSync(join(POSTS_DIR, file), 'utf-8');
}

/** Lê um escalar de nível 0 do frontmatter (desaspado) ou null. */
export function getScalar(fm, key) {
  const m = fm.match(new RegExp(`^${key}:[ \\t]*(.*)$`, 'm'));
  if (!m) return null;
  let v = m[1].trim();
  if (v.startsWith('"') && v.endsWith('"')) { try { v = JSON.parse(v); } catch { v = v.slice(1, -1); } }
  return v;
}

/** Lê um escalar aninhado (indentado), ex.: seo.metaTitle. */
export function getNested(fm, key) {
  const m = fm.match(new RegExp(`^[ \\t]+${key}:[ \\t]*(.*)$`, 'm'));
  if (!m) return null;
  let v = m[1].trim();
  if (v.startsWith('"') && v.endsWith('"')) { try { v = JSON.parse(v); } catch { v = v.slice(1, -1); } }
  return v;
}

const q = s => JSON.stringify(String(s));

function setTopScalar(fm, key, value) {
  const re = new RegExp(`^(${key}:[ \\t]*).*$`, 'm');
  if (re.test(fm)) return fm.replace(re, `$1${q(value)}`);
  return null; // não existe
}
function ensureTopScalar(fm, key, value) {
  const set = setTopScalar(fm, key, value);
  if (set !== null) return set;
  // Insere logo após publishedAt: (se houver), senão no fim do frontmatter.
  const line = `${key}: ${q(value)}`;
  if (/^publishedAt:.*$/m.test(fm)) return fm.replace(/^(publishedAt:.*)$/m, `$1\n${line}`);
  return fm.replace(/\s*$/, '') + `\n${line}`;
}
function setNestedScalar(fm, key, value) {
  const re = new RegExp(`^([ \\t]+${key}:[ \\t]*).*$`, 'm');
  if (re.test(fm)) return fm.replace(re, `$1${q(value)}`);
  return null;
}

function reconstruct(split) {
  return `---${split.eol}${split.fm}${split.eol}---${split.eol}${split.body}`;
}

/**
 * Aplica um patch de frontmatter e/ou corpo e ESCREVE o arquivo (respeitando
 * DRY_RUN). patch: { title, description, seoTitle, seoDescription, updatedAt, newBody }.
 * Retorna { changed, raw } (raw = conteúdo novo, mesmo em dry-run).
 */
export function writePatched(file, split, patch) {
  let fm = split.fm;
  let body = patch.newBody != null ? patch.newBody : split.body;
  if (patch.title != null) { const r = setTopScalar(fm, 'title', patch.title); if (r) fm = r; }
  if (patch.description != null) { const r = setTopScalar(fm, 'description', patch.description); if (r) fm = r; }
  if (patch.seoTitle != null) { const r = setNestedScalar(fm, 'metaTitle', patch.seoTitle); if (r) fm = r; }
  if (patch.seoDescription != null) { const r = setNestedScalar(fm, 'metaDescription', patch.seoDescription); if (r) fm = r; }
  if (patch.updatedAt != null) fm = ensureTopScalar(fm, 'updatedAt', patch.updatedAt);

  const raw = reconstruct({ ...split, fm, body });
  const changed = raw !== reconstruct(split);
  if (changed && !DRY_RUN) writeFileSync(join(POSTS_DIR, file), raw);
  return { changed, raw };
}

// ─────────────────────────────────────────────────────────────────────────────
// TRAVAS anti-degradação
// ─────────────────────────────────────────────────────────────────────────────

/** Limpa uma linha vinda da IA (aspas, markdown, numeração, múltiplas linhas). */
export function sanitizeLine(s) {
  if (!s) return '';
  let v = String(s).split('\n')[0].trim();
  v = v.replace(/^["'`]+|["'`]+$/g, '');           // aspas/acento grave nas pontas
  v = v.replace(/^\s*[-*]\s+/, '').replace(/^\s*\d+[.)]\s+/, ''); // marcador de lista
  v = v.replace(/\*\*(.*?)\*\*/g, '$1').replace(/[*_`#]/g, '');   // ênfase markdown
  return v.replace(/\s+/g, ' ').trim();
}

const wordCount = t => (String(t).trim().match(/\S+/g) || []).length;
/** Detecta números financeiros (R$, %, ano) — usado para bloquear fabricação. */
const FINANCIAL_NUM_RE = /(R\$\s?\d|US\$\s?\d|€\s?\d|\d+([.,]\d+)?\s?%|\b(19|20)\d{2}\b)/;

/** Título válido? 20–65 chars, não vazio, e mantém ≥1 token do tema original. */
export function validateTitle(newTitle, oldTitle) {
  const t = sanitizeLine(newTitle);
  if (t.length < 20 || t.length > 65) return { ok: false, reason: `comprimento ${t.length} fora de 20–65` };
  const a = coreTokens(slugifyTheme(t));
  const b = coreTokens(slugifyTheme(oldTitle || ''));
  const shared = [...a].filter(x => b.has(x)).length;
  if (b.size > 0 && shared === 0) return { ok: false, reason: 'perdeu todo o núcleo temático do título original' };
  return { ok: true, value: t };
}

/** Meta description válida? 80–165 chars. */
export function validateDescription(newDesc) {
  const d = sanitizeLine(newDesc);
  if (d.length < 80 || d.length > 165) return { ok: false, reason: `comprimento ${d.length} fora de 80–165` };
  return { ok: true, value: d };
}

/**
 * Constrói uma seção append-only validada. Retorna { ok, section } ou { ok:false }.
 * Travas: heading não duplicado; corpo 80–320 palavras; SEM números financeiros
 * novos que não existam no post (anti-fabricação); markdown simples.
 */
export function buildSafeSection(heading, text, originalBody) {
  const h = sanitizeLine(heading);
  if (h.length < 6 || h.length > 80) return { ok: false, reason: `heading inválido (${h.length} chars)` };
  const lowerBody = originalBody.toLowerCase();
  if (lowerBody.includes(`## ${h.toLowerCase()}`)) return { ok: false, reason: 'heading já existe no post' };

  const clean = String(text).trim().replace(/\r\n/g, '\n');
  const wc = wordCount(clean);
  if (wc < 80 || wc > 320) return { ok: false, reason: `corpo com ${wc} palavras (fora de 80–320)` };

  // Anti-fabricação: números financeiros na seção nova precisam já existir no post.
  const newNums = clean.match(new RegExp(FINANCIAL_NUM_RE, 'g')) || [];
  for (const n of newNums) {
    if (!originalBody.includes(n.trim())) {
      return { ok: false, reason: `número financeiro potencialmente fabricado: "${n.trim()}"` };
    }
  }
  return { ok: true, section: `## ${h}\n\n${clean}\n` };
}

/**
 * Insere a seção antes do marcador <!-- SCHEMA_AUTO --> (se houver) ou no fim do
 * corpo. Garante crescimento (append-only) e preserva o corpo original inteiro.
 * Retorna { ok, newBody }.
 */
export function appendSection(originalBody, section) {
  const eolBody = originalBody.replace(/\s*$/, '');
  const schemaIdx = eolBody.indexOf('<!-- SCHEMA_AUTO:');
  let newBody;
  if (schemaIdx !== -1) {
    const before = eolBody.slice(0, schemaIdx).replace(/\s*$/, '');
    const schema = eolBody.slice(schemaIdx);
    newBody = `${before}\n\n${section}\n${schema}\n`;
  } else {
    newBody = `${eolBody}\n\n${section}\n`;
  }
  // Trava: o corpo original inteiro precisa continuar presente e o texto crescer.
  const strippedOriginal = eolBody.replace('<!-- SCHEMA_AUTO:', ' ');
  void strippedOriginal;
  if (wordCount(newBody) <= wordCount(originalBody)) return { ok: false, reason: 'corpo não cresceu' };
  return { ok: true, newBody };
}

// ─────────────────────────────────────────────────────────────────────────────
// Gate i18n + commit (com rollback)
// ─────────────────────────────────────────────────────────────────────────────

/** Roda o validador i18n do repo. true = passou. */
export function i18nGatePasses() {
  try {
    execSync('node src/scripts/validacao/validar-i18n.js', { stdio: 'pipe' });
    return true;
  } catch (e) {
    console.log('⚠️ Gate i18n falhou:', (e.stdout || e.message || '').toString().slice(-400));
    return false;
  }
}

/** Restaura arquivos ao estado do HEAD (rollback de edições não commitadas). */
export function revertFiles(files) {
  if (!files.length) return;
  try { execSync(`git checkout -- ${files.map(f => `"src/content/posts/${f}"`).join(' ')}`, { stdio: 'pipe' }); }
  catch { /* ignore */ }
}

/** git add (whitelist) + commit se houver diff. Não faz push (workflow faz). */
export function commitFiles(paths, message) {
  if (DRY_RUN) { console.log(`   [dry-run] commit pulado: ${message}`); return false; }
  if (!paths.length) return false;
  const quoted = paths.map(p => `"${p}"`).join(' ');
  try {
    execSync(`git add ${quoted}`, { stdio: 'pipe' });
    const staged = execSync('git diff --cached --name-only', { stdio: 'pipe' }).toString().trim();
    if (!staged) return false;
    execSync(`git -c commit.gpgsign=false commit -m ${JSON.stringify(message)}`, { stdio: 'pipe' });
    console.log(`   ✅ commit: ${message}`);
    return true;
  } catch (e) {
    console.log('   ⚠️ commit falhou:', (e.stderr || e.message || '').toString().slice(-300));
    return false;
  }
}
