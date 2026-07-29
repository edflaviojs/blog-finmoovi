/**
 * validate-internal-links.js — Guarda GERAL de link interno de navegacao.
 *
 * REGRA UNICA E DURA:
 *   Todo link interno de navegacao (<a href="/...">) tem de resolver para uma
 *   pagina REAL do build. Nenhum link interno pode apontar para uma ORIGEM de
 *   redirect.
 *
 * POR QUE ESTE VALIDADOR EXISTE (a regressao que ele impede de voltar):
 * o Cloudflare Pages compara a origem de cada regra do `_redirects`
 * LITERALMENTE, sem normalizar a barra final. Quando os links internos foram
 * normalizados para terminar em "/", 9 links que ate entao funcionavam por 301
 * deixaram de casar com a regra e viraram 404 em 43 paginas. Nenhum guard
 * pegou: todos verificavam a FORMA do link (tem barra final?), nunca se a
 * PAGINA EXISTE. Verificar forma nao prova destino.
 *
 * Bloqueia (exit 1) se encontrar qualquer uma destas condicoes:
 *   a) link para `/glossario/<slug>` com `<slug>` comecando em `en-` ou `es-`
 *      (slug de outro idioma dentro do glossario PT)
 *   b) link para `/en/glossario/<slug>` com `<slug>` que NAO comeca em `en-`
 *   c) link para `/es/glossario/<slug>` com `<slug>` que NAO comeca em `es-`
 *   h) QUALQUER link interno cujo alvo nao existe em `dist/` (404)
 *   i) QUALQUER link interno cujo alvo (com ou sem barra final) e ORIGEM de uma
 *      regra em `public/_redirects` — link interno deve apontar para a URL
 *      FINAL, nunca para um redirect
 *
 * (a)/(b)/(c) sao heranca do antigo `validate-glossary-links.js`, que este
 * arquivo generaliza e substitui: (h) e a versao geral do antigo (d).
 *
 * Este validador NAO substitui `validate-slug-language.js` (que olha o NOME DO
 * ARQUIVO em src/content, antes do build). Aqui o alvo e o LINK renderizado, e
 * a checagem decisiva — a existencia da pagina de destino — so pode ser feita
 * DEPOIS do build, lendo `dist/`.
 *
 * Uso: node scripts/validate-internal-links.js   (rodar APOS `astro build`)
 * Script puro — apenas `fs`/`path`, sem dependencias externas.
 */

import { readdirSync, readFileSync, existsSync, statSync } from 'fs';
import { join, sep } from 'path';
import { SITE_URL, BLOG_HOST } from './lib/site.js';

const ROOT = process.cwd();
const DIST = join(ROOT, 'dist');
const SRC = join(ROOT, 'src');
const REDIRECTS = join(ROOT, 'public', '_redirects');

/**
 * Paginas de DIAGNOSTICO que listam URLs legadas/redirecionadas de proposito
 * (relatorio, nao navegacao — os links saem com target="_blank"). Sem esta
 * excecao o proprio relatorio de URLs antigas seria acusado de link quebrado.
 * Caminhos relativos a dist/, com barras "/".
 */
const REPORT_PAGES = new Set(['/status/index.html']);

/**
 * Extensoes servidas como ARQUIVO. Arquivo nao e pagina: fica fora de (h)/(i).
 * Mesma lista de `validate-trailing-slash.js` — as duas checagens tem de
 * concordar sobre o que e "pagina", senao uma acusa o que a outra libera.
 */
const ASSET_EXTENSION = /\.(css|js|mjs|xml|txt|json|png|jpg|jpeg|webp|avif|svg|ico|woff|woff2|pdf)$/i;

/** Extensoes de codigo-fonte varridas para localizar QUEM escreveu o link. */
const SOURCE_EXTENSIONS = ['.md', '.astro', '.ts', '.tsx', '.js', '.json'];

/**
 * Coleta recursivamente arquivos com uma das extensoes dadas sob um diretorio.
 * @param {string} dir Diretorio raiz da varredura.
 * @param {string[]} exts Extensoes aceitas (com ponto).
 * @param {string[]} out Acumulador.
 * @returns {string[]} Caminhos absolutos.
 */
function filesWithExt(dir, exts, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) filesWithExt(full, exts, out);
    else if (exts.some((ext) => entry.name.endsWith(ext))) out.push(full);
  }
  return out;
}

/** Caminho relativo a um diretorio base, sempre com "/" (comparavel entre SOs). */
function relPath(file, base) {
  return file.slice(base.length).split(sep).join('/');
}

/**
 * Normaliza um href para um PATH interno do site, ou null se nao for interno.
 * Aceita "/x/y/", o SITE_URL absoluto e "https://<BLOG_HOST>/...". Descarta
 * externo, ancora pura, relativo, mailto:/tel: e protocol-relative de outro host.
 * Querystring e ancora sao removidas: so o PATH define a pagina servida.
 * @param {string} href Valor bruto do atributo href.
 * @returns {string|null} Path comecando em "/", ou null.
 */
function toInternalPath(href) {
  let value = href.trim();
  if (value === '') return null;

  if (/^https?:\/\//i.test(value)) {
    let url;
    try {
      url = new URL(value);
    } catch {
      return null;
    }
    if (url.hostname !== BLOG_HOST) return null; // outro host
    value = url.pathname;
  } else if (value.startsWith('//')) {
    return null; // protocol-relative = outro host
  } else if (!value.startsWith('/')) {
    return null; // ancora, relativo, mailto:, tel:, javascript:
  }

  const cut = value.search(/[?#]/);
  const path = cut === -1 ? value : value.slice(0, cut);
  return path.startsWith('/') ? path : null;
}

/**
 * Decide se um path interno entra nas checagens (h)/(i).
 * Fica de fora: a raiz "/" (sempre existe) e arquivos (ASSET_EXTENSION).
 * @param {string} path Path interno ja normalizado.
 * @returns {boolean}
 */
function isNavigablePath(path) {
  if (path === '' || path === '/') return false;
  return !ASSET_EXTENSION.test(path);
}

/**
 * Casa um path de VERBETE do glossario (o indice `/glossario/` nao conta).
 * @param {string} path Path interno ja normalizado.
 * @returns {{ locale: 'pt'|'en'|'es', slug: string }|null}
 */
function parseGlossaryPath(path) {
  const m = path.match(/^\/(?:(en|es)\/)?glossario\/([^/]+)\/?$/);
  if (!m) return null;
  return { locale: m[1] ?? 'pt', slug: m[2] };
}

/** Prefixo de slug exigido em cada secao de idioma. */
const REQUIRED_PREFIX = { pt: null, en: 'en-', es: 'es-' };

/**
 * Aponta a violacao de IDIOMA de um slug, se houver — checagens (a)/(b)/(c).
 * @param {'pt'|'en'|'es'} locale Secao de idioma da URL.
 * @param {string} slug Slug do verbete.
 * @returns {string|null} Mensagem do problema, ou null se o idioma bate.
 */
function languageProblem(locale, slug) {
  if (locale === 'pt') {
    if (slug.startsWith('en-')) return '(a) slug EN ("en-") dentro do glossario PT';
    if (slug.startsWith('es-')) return '(a) slug ES ("es-") dentro do glossario PT';
    return null;
  }
  const prefix = REQUIRED_PREFIX[locale];
  if (!slug.startsWith(prefix)) {
    const check = locale === 'en' ? 'b' : 'c';
    return `(${check}) slug sem o prefixo "${prefix}" exigido pelo glossario ${locale.toUpperCase()}`;
  }
  return null;
}

/**
 * O build entrega alguma coisa para este path?
 * Aceita as tres formas que o Astro/Cloudflare podem servir:
 *   `dist/<path>/index.html` (build.format: 'directory', o caso normal),
 *   `dist/<path>.html`       (build.format: 'file' / paginas soltas),
 *   `dist/<path>`            (arquivo literal copiado de public/).
 * @param {string} path Path interno ja normalizado.
 * @returns {boolean}
 */
function pageExists(path) {
  const clean = path.replace(/^\//, '').replace(/\/$/, '');
  if (clean === '') return existsSync(join(DIST, 'index.html'));
  const segments = clean.split('/');
  if (existsSync(join(DIST, ...segments, 'index.html'))) return true;
  if (existsSync(join(DIST, ...segments.slice(0, -1), `${segments.at(-1)}.html`))) return true;
  const literal = join(DIST, ...segments);
  return existsSync(literal) && statSync(literal).isFile();
}

/**
 * Le public/_redirects.
 * @returns {{ exact: Map<string, { dest: string, line: number }>, patterns: string[] }}
 *   `exact`: origem normalizada (sem barra final) -> destino e linha.
 *   `patterns`: origens com curinga/absolutas, FORA da checagem (i) — sao
 *   reportadas no rodape para que a lacuna nunca fique silenciosa.
 */
function readRedirects() {
  const exact = new Map();
  const patterns = [];
  if (!existsSync(REDIRECTS)) return { exact, patterns };

  const lines = readFileSync(REDIRECTS, 'utf-8').split(/\r\n|\n/);
  const RULE_RE = /^(\S+)\s{2,}(\S+)\s{2,}(\d{3})\s*$/;
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) return;
    const m = line.match(RULE_RE);
    if (!m) return;
    const origin = m[1];
    // Curinga (`*`, `:splat`, `:param`) e origem absoluta nao sao comparaveis
    // por igualdade de string — ficam fora de (i), mas ficam registradas.
    if (/[*]|:\w|^https?:\/\//i.test(origin)) {
      patterns.push(`linha ${idx + 1}: ${origin}`);
      return;
    }
    exact.set(origin.replace(/\/$/, ''), { dest: m[2], line: idx + 1 });
  });
  return { exact, patterns };
}

/**
 * Indexa os arquivos de src/ que CITAM cada path acusado. O erro nasce na
 * fonte (markdown, componente .astro, tabela .ts); apontar so o HTML de dist
 * diz onde doi, nao o que corrigir.
 * @param {Set<string>} wanted Paths (sem barra final) procurados.
 * @returns {Map<string, string[]>} path -> arquivos de origem (relativos a src/).
 */
function indexSources(wanted) {
  const index = new Map();
  if (wanted.size === 0) return index;
  for (const file of filesWithExt(SRC, SOURCE_EXTENSIONS)) {
    const text = readFileSync(file, 'utf-8');
    for (const path of wanted) {
      if (!text.includes(path)) continue;
      if (!index.has(path)) index.set(path, []);
      index.get(path).push(relPath(file, SRC));
    }
  }
  return index;
}

// --- Varredura de dist/ ---
if (!existsSync(DIST)) {
  console.log(`⚠️ ${DIST} nao existe. Rode \`astro build\` antes de validar.`);
  process.exit(1);
}

const { exact: redirectOrigins, patterns: redirectPatterns } = readRedirects();

/** @type {Map<string, { problems: Set<string>, pages: Set<string> }>} */
const offenders = new Map();

/**
 * Registra uma ocorrencia.
 * @param {string} path Path do link (como aparece, normalizado).
 * @param {string} problem Descricao do problema.
 * @param {string} page HTML de dist onde o link aparece.
 */
function record(path, problem, page) {
  if (!offenders.has(path)) offenders.set(path, { problems: new Set(), pages: new Set() });
  const entry = offenders.get(path);
  entry.problems.add(problem);
  entry.pages.add(page);
}

const ANCHOR_RE = /<a\b[^>]*>/g;
const HREF_RE = /href\s*=\s*"([^"]*)"/;

let scannedPages = 0;
let scannedLinks = 0;

for (const file of filesWithExt(DIST, ['.html'])) {
  const page = relPath(file, DIST);
  if (REPORT_PAGES.has(page)) continue;
  scannedPages += 1;

  const html = readFileSync(file, 'utf-8');
  let m;
  ANCHOR_RE.lastIndex = 0;
  while ((m = ANCHOR_RE.exec(html)) !== null) {
    const hrefMatch = m[0].match(HREF_RE);
    if (!hrefMatch) continue;

    const path = toInternalPath(hrefMatch[1]);
    if (path === null) continue;
    if (!isNavigablePath(path)) continue;
    scannedLinks += 1;

    // (a)/(b)/(c) — idioma do slug incompativel com a secao do glossario.
    const parsed = parseGlossaryPath(path);
    if (parsed !== null) {
      const langIssue = languageProblem(parsed.locale, parsed.slug);
      if (langIssue !== null) record(path, langIssue, page);
    }

    // (i) — o alvo e ORIGEM de um redirect (comparacao sem barra final, porque
    // e exatamente a barra que o Cloudflare NAO normaliza).
    const origin = path.replace(/\/$/, '');
    if (redirectOrigins.has(origin)) {
      const rule = redirectOrigins.get(origin);
      record(path, `(i) aponta para ORIGEM de redirect (public/_redirects linha ${rule.line} -> ${rule.dest})`, page);
    }

    // (h) — a pagina de destino existe mesmo no build?
    if (!pageExists(path)) record(path, '(h) destino nao existe em dist/ (404)', page);
  }
}

// --- Relatorio final ---
if (offenders.size === 0) {
  console.log(`✅ Links internos OK — ${scannedLinks} link(s) de navegacao em ${scannedPages} pagina(s) de dist/.`);
  console.log('   Nenhum destino 404, nenhum link apontando para origem de redirect, nenhum slug de idioma cruzado.');
  if (redirectPatterns.length > 0) {
    console.log(`   Nota: ${redirectPatterns.length} regra(s) de _redirects com curinga ficam fora da checagem (i): ${redirectPatterns.join(', ')}`);
  }
  process.exit(0);
}

const sources = indexSources(new Set([...offenders.keys()].map((p) => p.replace(/\/$/, ''))));
const sorted = [...offenders.entries()].sort((a, b) => b[1].pages.size - a[1].pages.size);
let totalOccurrences = 0;

console.log(`\n❌ ${offenders.size} link(s) interno(s) invalido(s):\n`);
for (const [path, { problems, pages }] of sorted) {
  totalOccurrences += pages.size;
  console.log(`  ${path}`);
  for (const problem of problems) console.log(`     motivo: ${problem}`);
  console.log(`     paginas afetadas em dist/: ${pages.size} (ex.: ${[...pages].slice(0, 3).join(', ')})`);

  const origin = path.replace(/\/$/, '');
  const files = sources.get(origin);
  if (files && files.length > 0) {
    console.log(`     escrito em src/: ${files.slice(0, 10).join(', ')}${files.length > 10 ? ` ... e mais ${files.length - 10}` : ''}`);
  } else {
    console.log('     nao encontrado em src/ — o link e montado dinamicamente (concatenacao de slug em template).');
  }
  console.log('');
}

console.log(`⚠️ ${offenders.size} URL(s) distinta(s), ${totalOccurrences} pagina(s) de dist/ afetada(s).`);
console.log('Regra: todo link interno tem de apontar para a URL FINAL, que existe no build.');
console.log('Link para ORIGEM de redirect nao vale: o Cloudflare compara a origem do _redirects literalmente,');
console.log('sem normalizar a barra final — com a barra o link pode nem casar com a regra e virar 404.');
console.log('Corrija o link na fonte (src/), apontando para o destino final; nao adicione regra nova ao _redirects.');
console.log(`Dominio esperado: ${SITE_URL} (host: ${BLOG_HOST}).`);
if (redirectPatterns.length > 0) {
  console.log(`Nota: ${redirectPatterns.length} regra(s) com curinga ficam fora da checagem (i): ${redirectPatterns.join(', ')}`);
}
process.exit(1);
