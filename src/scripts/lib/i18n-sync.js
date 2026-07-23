/**
 * i18n-sync.js — Biblioteca de sincronização i18n (PT/EN/ES)
 *
 * Objetivo: dado um conteúdo (post ou termo de glossário) que existe em um
 * idioma mas falta em outro, gerar a versão traduzida faltante com:
 *   - filename e locale corretos (para o seletor de idioma sempre resolver);
 *   - frontmatter preservado byte-a-byte, exceto os campos traduzíveis;
 *   - translationKey (posts) / filename base (glossário) idênticos ao source.
 *
 * Estratégia de serialização: SUBSTITUIÇÃO CIRÚRGICA no texto do frontmatter
 * do source. NÃO fazemos round-trip YAML (evita corromper campos, ordem, EOL).
 * Apenas os campos traduzíveis presentes no source são reescritos; todo o resto
 * (image, category, publishedAt, author, relatedTerms, translationKey,
 * readingTime, featured) permanece idêntico ao arquivo de origem.
 *
 * Detecção de lacunas espelha EXATAMENTE os validadores existentes:
 *   - posts:     agrupados por translationKey (frontmatter);
 *   - glossário: agrupados por filename base (sem prefixo en-/es-).
 *
 * Este módulo é puro na importação (nenhuma chamada de rede ao ser carregado).
 * A tradução usa generateText de ../apis/kie-ai.js (Cerebras→Groq→Cloudflare).
 */

import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { generateText } from '../apis/kie-ai.js';
import { guardedTranslate } from './lang-guard.js';
import { config } from '../../../site.config.ts';

// T8: sincroniza apenas os locales configurados (modo 1 idioma = nada a sincronizar)
export const LOCALES = [...config.locales];
export const POSTS_DIR = join(process.cwd(), 'src', 'content', 'posts');
export const GLOSSARIO_DIR = join(process.cwd(), 'src', 'content', 'glossario');

const LANG_NAMES = { pt: 'Portuguese (Brazil)', en: 'English', es: 'Spanish' };

// ─────────────────────────────────────────────────────────────────────────────
// Parsing utilitário (leve, dirigido ao formato conhecido do acervo)
// ─────────────────────────────────────────────────────────────────────────────

export function localeFromFilename(file) {
  if (file.startsWith('en-')) return 'en';
  if (file.startsWith('es-')) return 'es';
  return 'pt';
}

/** Slug base do glossário: filename sem prefixo de locale e sem .md */
export function glossarioBaseSlug(file) {
  return file.replace(/^(en-|es-)/, '').replace(/\.md$/, '');
}

/** Separa frontmatter/body e detecta o EOL usado no arquivo. */
export function splitFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return null;
  return { fm: m[1], body: m[2], eol: raw.includes('\r\n') ? '\r\n' : '\n' };
}

/** Lê um campo escalar de nível 0 (col 0). Retorna string desaspada ou null. */
export function getScalar(fm, key) {
  const m = fm.match(new RegExp(`^${key}:[ \\t]*(.*)$`, 'm'));
  if (!m) return null;
  let v = m[1].trim();
  if (v.startsWith('"') && v.endsWith('"')) {
    try { v = JSON.parse(v); } catch { v = v.slice(1, -1); }
  }
  return v;
}

export function hasField(fm, key) {
  return new RegExp(`^${key}:`, 'm').test(fm);
}

/** Lê tags/keywords que podem estar como array JSON inline ou lista YAML. */
export function getList(fm, key) {
  // Array inline: key: ["a","b"]
  const inline = fm.match(new RegExp(`^${key}:[ \\t]*(\\[[^\\n]*\\])[ \\t]*$`, 'm'));
  if (inline) {
    try { return JSON.parse(inline[1]); } catch { /* fallthrough */ }
  }
  // Lista YAML:
  //   key:
  //     - "a"
  //     - "b"
  const block = fm.match(new RegExp(`^${key}:[ \\t]*\\n((?:[ \\t]+-[ \\t]*.*\\n?)+)`, 'm'));
  if (block) {
    return block[1]
      .split('\n')
      .map(l => l.replace(/^[ \t]+-[ \t]*/, '').trim())
      .filter(Boolean)
      .map(v => (v.startsWith('"') && v.endsWith('"')) ? v.slice(1, -1) : v);
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Serialização cirúrgica: reescreve só o valor de um campo, preservando o resto
// ─────────────────────────────────────────────────────────────────────────────

function q(str) { return JSON.stringify(String(str)); }
function jsonArr(arr) { return '[' + arr.map(v => JSON.stringify(String(v))).join(',') + ']'; }

/** Substitui o valor de um escalar de nível 0 já existente no frontmatter. */
function setScalar(fm, key, quotedValue) {
  return fm.replace(new RegExp(`^(${key}:[ \\t]*).*$`, 'm'), `$1${quotedValue}`);
}

/**
 * Substitui uma lista (tags/keywords) preservando o FORMATO original
 * (array inline vs lista YAML). Só age se o campo existir.
 */
function setList(fm, key, arr) {
  const inlineRe = new RegExp(`^(${key}:[ \\t]*)\\[[^\\n]*\\][ \\t]*$`, 'm');
  if (inlineRe.test(fm)) {
    return fm.replace(inlineRe, `$1${jsonArr(arr)}`);
  }
  const blockRe = new RegExp(`^(${key}:[ \\t]*\\n)((?:[ \\t]+-[ \\t]*.*\\n?)+)`, 'm');
  const bm = fm.match(blockRe);
  if (bm) {
    // Preserva a indentação do primeiro item.
    const indentMatch = bm[2].match(/^([ \t]+)-/);
    const indent = indentMatch ? indentMatch[1] : '  ';
    const lines = arr.map(v => `${indent}- ${q(v)}`).join('\n') + '\n';
    return fm.replace(blockRe, `$1${lines}`);
  }
  return fm; // campo não existe → não adiciona
}

/** Substitui um campo escalar dentro do bloco seo: (indentado). */
function setSeoScalar(fm, key, quotedValue) {
  const re = new RegExp(`^([ \\t]+${key}:[ \\t]*).*$`, 'm');
  return re.test(fm) ? fm.replace(re, `$1${quotedValue}`) : fm;
}

/** Substitui keywords dentro do bloco seo:, preservando formato (inline/lista). */
function setSeoList(fm, arr) {
  const inlineRe = /^([ \t]+keywords:[ \t]*)\[[^\n]*\][ \t]*$/m;
  if (inlineRe.test(fm)) return fm.replace(inlineRe, `$1${jsonArr(arr)}`);
  const blockRe = /^([ \t]+keywords:[ \t]*\n)((?:[ \t]+-[ \t]*.*\n?)+)/m;
  const bm = fm.match(blockRe);
  if (bm) {
    const indentMatch = bm[2].match(/^([ \t]+)-/);
    const indent = indentMatch ? indentMatch[1] : '    ';
    const lines = arr.map(v => `${indent}- ${q(v)}`).join('\n') + '\n';
    return fm.replace(blockRe, `$1${lines}`);
  }
  return fm;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tradução via IA
// ─────────────────────────────────────────────────────────────────────────────

const DELIMS = {
  title: '---TITLE---',
  description: '---DESCRIPTION---',
  term: '---TERM---',
  definition: '---DEFINITION---',
  tags: '---TAGS---',
  body: '---BODY---',
};

const ALL_DELIMS = Object.values(DELIMS);

/**
 * Recorta o conteúdo de uma seção: do fim do seu delimitador até o INÍCIO do
 * próximo delimitador CONHECIDO (qualquer um), ou o fim da resposta. Isso torna
 * o parse robusto mesmo que a IA emita marcadores extras/inesperados (evita que
 * uma seção "vaze" para dentro da seguinte).
 */
function section(response, delim) {
  const start = response.indexOf(delim);
  if (start === -1) return null;
  const from = start + delim.length;
  let end = response.length;
  for (const d of ALL_DELIMS) {
    const idx = response.indexOf(d, from);
    if (idx !== -1 && idx < end) end = idx;
  }
  return response.slice(from, end).trim();
}

/**
 * Traduz os campos traduzíveis de um conteúdo para targetLocale.
 * `fields` descreve o que existe no source: { title?, description?, term?,
 * definition?, tags?, body }. Retorna um objeto com os campos traduzidos;
 * se o parse falhar para algum campo, faz fallback ao valor original (nunca
 * lança — comportamento alinhado aos geradores da "Família A").
 */
export async function translateFields(fields, targetLocale, { kind }) {
  const langName = LANG_NAMES[targetLocale];
  const parts = [];
  const order = [];
  if (fields.title != null) { parts.push(`${DELIMS.title}\n${fields.title}`); order.push('title'); }
  if (fields.description != null) { parts.push(`${DELIMS.description}\n${fields.description}`); order.push('description'); }
  if (fields.term != null) { parts.push(`${DELIMS.term}\n${fields.term}`); order.push('term'); }
  if (fields.definition != null) { parts.push(`${DELIMS.definition}\n${fields.definition}`); order.push('definition'); }
  if (fields.tags != null) { parts.push(`${DELIMS.tags}\n${fields.tags.join(', ')}`); order.push('tags'); }
  parts.push(`${DELIMS.body}\n${fields.body}`); order.push('body');

  const kindLabel = kind === 'glossario' ? 'financial glossary entry' : 'blog post';
  const prompt = `Translate the following ${kindLabel} to ${langName}.
Keep the exact same section markers (---TITLE---, ---DESCRIPTION---, ---TERM---, ---DEFINITION---, ---TAGS---, ---BODY---) in your answer, in the same order, each on its own line.
Rules:
- Keep markdown formatting, headings (##), links and image paths intact.
- Do NOT translate brand names (FinMoovi) nor financial acronyms (CDI, Selic, CDB, IPCA, PIX, ETF, PGBL, VGBL, B3).
- Keep monetary values (R$) as-is.
- TAGS: translate each term, comma-separated, same count.
- Respond ONLY with the marked sections, nothing else.

${parts.join('\n\n')}`;

  const attempt = async () => {
    const response = await generateText(prompt, { maxTokens: 5000, temperature: 0.3 });

    const out = {};
    for (let i = 0; i < order.length; i++) {
      const key = order[i];
      const raw = section(response, DELIMS[key]);
      if (key === 'tags') {
        out.tags = raw
          ? raw.split(',').map(s => s.trim()).filter(Boolean)
          : fields.tags;
      } else {
        out[key] = (raw && raw.length) ? raw : fields[key];
      }
    }
    return out;
  };

  // lang-guard (prevenção): valida o body traduzido; 1 retry se sair no idioma
  // errado; persistindo, devolve mesmo assim com ::warning:: (nunca bloqueia).
  return guardedTranslate(attempt, targetLocale, `${kindLabel} "${fields.title || fields.term || ''}" (${targetLocale})`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Construção do arquivo traduzido (frontmatter cirúrgico + body traduzido)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extrai do source os campos traduzíveis presentes (para alimentar a IA).
 */
export function extractTranslatableFields(fm, body, kind) {
  const fields = { body };
  if (hasField(fm, 'title')) fields.title = getScalar(fm, 'title');
  if (hasField(fm, 'description')) fields.description = getScalar(fm, 'description');
  if (kind === 'glossario') {
    if (hasField(fm, 'term')) fields.term = getScalar(fm, 'term');
    if (hasField(fm, 'definition')) fields.definition = getScalar(fm, 'definition');
  }
  if (hasField(fm, 'tags')) fields.tags = getList(fm, 'tags');
  return fields;
}

/**
 * Aplica os campos traduzidos sobre o frontmatter do source e troca o locale.
 * O bloco seo: (quando existe) espelha title/description/tags — mantido assim.
 */
export function buildTranslatedFrontmatter(fmSource, translated, targetLocale) {
  let fm = fmSource;
  // locale sempre trocado (validador bloqueia divergência prefixo↔locale).
  fm = setScalar(fm, 'locale', q(targetLocale));
  if (translated.title != null && hasField(fm, 'title')) fm = setScalar(fm, 'title', q(translated.title));
  if (translated.description != null && hasField(fm, 'description')) fm = setScalar(fm, 'description', q(translated.description));
  if (translated.term != null && hasField(fm, 'term')) fm = setScalar(fm, 'term', q(translated.term));
  if (translated.definition != null && hasField(fm, 'definition')) fm = setScalar(fm, 'definition', q(translated.definition));
  if (translated.tags != null && hasField(fm, 'tags')) fm = setList(fm, 'tags', translated.tags);
  // Bloco seo: espelha title/description/keywords.
  if (hasField(fm, 'seo')) {
    if (translated.title != null) fm = setSeoScalar(fm, 'metaTitle', q(translated.title));
    if (translated.description != null) fm = setSeoScalar(fm, 'metaDescription', q(translated.description));
    if (translated.tags != null) fm = setSeoList(fm, translated.tags);
  }
  return fm;
}

/**
 * Gera o texto completo do arquivo traduzido a partir do source.
 * Retorna { filename, content } — NÃO escreve em disco.
 * `kind` ∈ {'post','glossario'}. Para posts o filename usa translationKey;
 * para glossário usa o slug base do filename.
 */
export async function buildTranslatedFile(sourceRaw, sourceFile, targetLocale, kind) {
  const parsed = splitFrontmatter(sourceRaw);
  if (!parsed) throw new Error(`Frontmatter inválido em ${sourceFile}`);
  const { fm, body, eol } = parsed;

  const fields = extractTranslatableFields(fm, body, kind);
  const translated = await translateFields(fields, targetLocale, { kind });
  const newFm = buildTranslatedFrontmatter(fm, translated, targetLocale);

  // Reconstrói preservando o EOL do source.
  let content = `---${eol}${newFm}${eol}---${eol}${eol}${translated.body}`;
  if (eol === '\r\n') content = content.replace(/\r?\n/g, '\r\n');
  if (!content.endsWith(eol)) content += eol;

  // Nome do arquivo alvo (derivado SEMPRE do slug base PT — nunca do termo traduzido).
  let base;
  if (kind === 'glossario') {
    base = glossarioBaseSlug(sourceFile);
  } else {
    base = getScalar(fm, 'translationKey');
    if (!base) throw new Error(`Post sem translationKey: ${sourceFile}`);
  }
  const prefix = targetLocale === 'pt' ? '' : `${targetLocale}-`;
  const filename = `${prefix}${base}.md`;

  return { filename, content };
}

// ─────────────────────────────────────────────────────────────────────────────
// Scanners: detectam lacunas exatamente como os validadores
// ─────────────────────────────────────────────────────────────────────────────

/** Posts: agrupa por translationKey. Retorna [{ key, present:{pt,en,es}, missing:[] }] */
export function scanPosts() {
  const files = readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));
  const groups = {};
  for (const file of files) {
    const raw = readFileSync(join(POSTS_DIR, file), 'utf-8');
    const parsed = splitFrontmatter(raw);
    if (!parsed) continue;
    const draft = getScalar(parsed.fm, 'draft');
    if (draft === 'true' || draft === true) continue;
    const key = getScalar(parsed.fm, 'translationKey');
    if (!key) continue; // sem key é tratado por outro validador
    const locale = getScalar(parsed.fm, 'locale') || localeFromFilename(file);
    if (!groups[key]) groups[key] = { key, present: {} };
    groups[key].present[locale] = file;
  }
  return Object.values(groups).map(g => ({
    ...g,
    missing: LOCALES.filter(l => !g.present[l]),
  })).filter(g => g.missing.length > 0);
}

/** Glossário: agrupa por filename base. Retorna [{ base, present:{}, missing:[] }] */
export function scanGlossario() {
  const files = readdirSync(GLOSSARIO_DIR).filter(f => f.endsWith('.md'));
  const groups = {};
  for (const file of files) {
    const base = glossarioBaseSlug(file);
    const locale = localeFromFilename(file);
    if (!groups[base]) groups[base] = { base, present: {} };
    groups[base].present[locale] = file;
  }
  return Object.values(groups).map(g => ({
    ...g,
    missing: LOCALES.filter(l => !g.present[l]),
  })).filter(g => g.missing.length > 0);
}

/** Escolhe o arquivo-fonte para uma lacuna: prioriza o locale padrão, depois os demais. */
export function pickSource(present) {
  for (const l of [config.defaultLocale, ...LOCALES.filter(x => x !== config.defaultLocale)]) {
    if (present[l]) return { file: present[l], locale: l };
  }
  return null;
}
