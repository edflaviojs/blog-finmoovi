/**
 * validate-schema.js — Validação de JSON-LD (structured data) no build.
 *
 * Varre dist/**\/*.html, extrai todos os blocos <script type="application/ld+json">,
 * faz JSON.parse de cada um e checa campos obrigatórios por @type. Se algum
 * schema estiver quebrado (JSON inválido) ou faltando campo essencial, BLOQUEIA
 * o build (exit 1) — evita perder rich results silenciosamente em produção.
 *
 * Uso: node scripts/validate-schema.js   (rodar APÓS `astro build`)
 */

import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

const DIST = join(process.cwd(), 'dist');

// Campos obrigatórios mínimos por @type (subset relevante ao blog).
const REQUIRED = {
  Article: ['headline', 'author', 'publisher', 'datePublished'],
  NewsArticle: ['headline', 'author', 'publisher', 'datePublished'],
  BlogPosting: ['headline', 'author', 'publisher', 'datePublished'],
  Person: ['name'],
  Organization: ['name'],
  WebSite: ['name', 'url'],
  BreadcrumbList: ['itemListElement'],
  FAQPage: ['mainEntity'],
  SoftwareApplication: ['name'],
};

function htmlFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...htmlFiles(full));
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

const LD_RE = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

// ---------------------------------------------------------------------------
// Checagens de CONTEÚDO das strings do JSON-LD.
//
// JSON com markdown cru dentro é sintaticamente PERFEITO — o JSON.parse acima
// passa liso. Estas checagens pegam o que o parse não vê: sobra de sintaxe de
// link, URL colada na prosa e link cortado no meio. Foi exatamente isso que o
// gerador de schema despejou em produção.
//
// São deliberadamente CONSERVADORAS: um falso-positivo aqui quebra o build
// diário do bot. Na dúvida, a regra fica de fora.
// SCHEMA_CONTENT_CHECK=off desliga só estas checagens (as de sintaxe seguem).
// ---------------------------------------------------------------------------

const CONTENT_CHECK_ON = process.env.SCHEMA_CONTENT_CHECK !== 'off';

/** Chaves cujo valor É uma URL por definição — barras aqui são legítimas. */
const URL_KEYS = new Set([
  '@context', '@id', 'url', 'logo', 'image', 'sameAs', 'contentUrl',
  'thumbnailUrl', 'target', 'item', 'installUrl', 'downloadUrl',
]);

/** Segmentos de caminho do blog. Só estes contam como "URL colada". */
const PATH_SEGMENTS = ['glossario', 'glossary', 'glosario', 'posts', 'ferramentas', 'herramientas', 'tools'];

/** `[texto](url)` sobrando dentro de um valor de string. */
const MD_LINK_RE = /\[[^\]\n]+\]\([^)\n]+\)/;

/** `](` sem o `)` de fecho — link partido ao meio por truncamento. */
const CUT_LINK_RE = /\]\([^)\n]*$/;

/**
 * Detecta URL colada na prosa: `palavra/glossario/...`, sem espaço antes da
 * barra. Aceita (ignora) URLs de verdade — com esquema, absolutas ou com
 * domínio — porque nelas a barra é legítima.
 *
 * Também pega o segmento CORTADO (`liquidez/glossar`), que é a assinatura do
 * truncamento no meio da palavra.
 *
 * @returns {string|null} O token infrator, ou null se estiver tudo bem.
 */
function findGluedPath(value) {
  for (const token of value.split(/\s+/)) {
    if (/^https?:\/\//i.test(token) || token.startsWith('/')) continue; // URL legítima
    const m = token.match(/^(.*?[^/])\/([A-Za-zÀ-ÿ]{4,})(?:\/|$|[.,;:)!?])/);
    if (!m) continue;
    const prefix = m[1];
    if (/^[\w.-]+\.[a-z]{2,}$/i.test(prefix)) continue; // domínio sem esquema
    const seg = m[2].toLowerCase();
    // Casa o segmento inteiro OU um prefixo dele (segmento truncado).
    if (PATH_SEGMENTS.some(s => s === seg || s.startsWith(seg))) return token;
  }
  return null;
}

/** Percorre todas as strings do nó, ignorando as chaves que são URL. */
function checkContent(node, file, errors, keyPath = '') {
  if (typeof node === 'string') {
    const where = keyPath || '(raiz)';
    const snippet = t => (t.length > 90 ? t.slice(0, 90) + '…' : t);

    const md = node.match(MD_LINK_RE);
    if (md) {
      errors.push(`${file}: campo "${where}" com sintaxe de link markdown crua → ${snippet(md[0])}`);
      return;
    }
    if (CUT_LINK_RE.test(node)) {
      errors.push(`${file}: campo "${where}" com link markdown cortado ao meio → ${snippet(node.slice(-90))}`);
      return;
    }
    const glued = findGluedPath(node);
    if (glued) {
      errors.push(`${file}: campo "${where}" com URL colada na prosa → ${snippet(glued)}`);
    }
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((v, i) => checkContent(v, file, errors, `${keyPath}[${i}]`));
    return;
  }
  if (node && typeof node === 'object') {
    for (const key of Object.keys(node)) {
      if (URL_KEYS.has(key)) continue;
      checkContent(node[key], file, errors, keyPath ? `${keyPath}.${key}` : key);
    }
  }
}

function checkNode(node, file, errors) {
  if (!node || typeof node !== 'object') return;
  const type = node['@type'];
  const types = Array.isArray(type) ? type : [type];
  for (const t of types) {
    const req = REQUIRED[t];
    if (!req) continue;
    for (const field of req) {
      const v = node[field];
      if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) {
        errors.push(`${file}: @type ${t} sem campo obrigatório "${field}"`);
      }
    }
  }
  // Percorre @graph e valores aninhados que sejam objetos com @type.
  for (const key of Object.keys(node)) {
    const val = node[key];
    if (Array.isArray(val)) val.forEach(v => checkNode(v, file, errors));
    else if (val && typeof val === 'object' && val['@type']) checkNode(val, file, errors);
  }
}

function main() {
  if (!existsSync(DIST)) {
    console.error('❌ dist/ não existe. Rode `astro build` antes.');
    process.exit(1);
  }

  const files = htmlFiles(DIST);
  const errors = [];
  let schemaCount = 0;
  let pagesWithSchema = 0;

  for (const file of files) {
    const html = readFileSync(file, 'utf-8');
    const rel = file.replace(DIST, '').replace(/\\/g, '/');
    let m;
    let hadSchema = false;
    LD_RE.lastIndex = 0;
    while ((m = LD_RE.exec(html)) !== null) {
      hadSchema = true;
      schemaCount++;
      let parsed;
      try {
        parsed = JSON.parse(m[1].trim());
      } catch (err) {
        errors.push(`${rel}: JSON-LD inválido — ${err.message}`);
        continue;
      }
      const nodes = Array.isArray(parsed) ? parsed : (parsed['@graph'] || [parsed]);
      for (const node of nodes) checkNode(node, rel, errors);
      if (CONTENT_CHECK_ON) for (const node of nodes) checkContent(node, rel, errors);
    }
    if (hadSchema) pagesWithSchema++;
  }

  const modoConteudo = CONTENT_CHECK_ON ? 'sintaxe + conteúdo' : 'somente sintaxe (SCHEMA_CONTENT_CHECK=off)';
  console.log(`🔍 Schema: ${files.length} páginas, ${pagesWithSchema} com JSON-LD, ${schemaCount} blocos verificados (${modoConteudo}).`);

  if (errors.length > 0) {
    console.log(`\n❌ ${errors.length} problema(s) de structured data:`);
    errors.slice(0, 50).forEach(e => console.log(`   - ${e}`));
    if (errors.length > 50) console.log(`   ... e mais ${errors.length - 50}`);
    process.exit(1);
  }

  console.log('✅ Structured data OK — todos os JSON-LD válidos.');
  process.exit(0);
}

main();
