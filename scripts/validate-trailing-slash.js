/**
 * validate-trailing-slash.js — Guarda anti-regressão de barra final em URLs.
 *
 * O servidor (Cloudflare Pages) serve TODAS as páginas COM barra final;
 * uma requisição sem barra recebe um 308 (Cloudflare acrescenta a barra) antes
 * de cair no 200. Toda URL "canônica" que o site publica (sitemap, canonical,
 * hreflang, redirects) deve, portanto, já vir COM a barra — senão cada uma
 * dessas URLs gasta um salto de redirecionamento extra (301/301→308→200 em
 * vez de 301→200), o que dilui PageRank/link equity e atrasa o crawl budget
 * do Googlebot desnecessariamente.
 *
 * Bloqueia (exit 1) se encontrar qualquer uma destas condições:
 *   a) <loc> em dist/sitemap-index.xml sem barra final
 *   b) href de <xhtml:link rel="alternate"> em dist/sitemap-index.xml sem barra final
 *   c) rel="canonical" nos HTMLs de dist/ sem barra final
 *   d) rel="alternate" hreflang nos HTMLs de dist/ com href sem barra final
 *   e) qualquer URL com "//" logo após o domínio (ex.: https://blog.finmoovi.com//)
 *   f) algum DESTINO em public/_redirects sem barra final
 *   g) link INTERNO de navegação (<a href="/...">) nos HTMLs de dist/ sem barra
 *      final — o Google descobre URL seguindo link interno, não só pelo
 *      sitemap; link sem barra = 308 e o relatório "Página com
 *      redirecionamento" continua vivo mesmo com o sitemap corrigido.
 *
 * Uso: node scripts/validate-trailing-slash.js   (rodar APÓS `astro build`)
 * Script puro — apenas `fs`/`path`/`url`, sem dependências externas, no
 * mesmo espírito de scripts/validate-schema.js (regex sobre dist/**\/*.html).
 */

import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { SITE_URL, BLOG_HOST } from './lib/site.js';

const ROOT = process.cwd();
const DIST = join(ROOT, 'dist');
const SITEMAP = join(DIST, 'sitemap-index.xml');
const REDIRECTS = join(ROOT, 'public', '_redirects');

/** Coleta recursivamente todos os arquivos .html sob um diretório. */
function htmlFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...htmlFiles(full));
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

/**
 * Extrai atributos de uma string de tag HTML/XML (ex.: `<link rel="x" href="y">`).
 * @param {string} tagStr Tag completa, incluindo `<` e `>`.
 * @returns {Record<string, string>} Mapa attr -> valor.
 */
function parseAttrs(tagStr) {
  const attrs = {};
  const re = /([\w:-]+)\s*=\s*"([^"]*)"/g;
  let m;
  while ((m = re.exec(tagStr)) !== null) {
    attrs[m[1]] = m[2];
  }
  return attrs;
}

/**
 * Verifica se uma URL absoluta tem "//" duplicado no path (logo após o
 * domínio ou em qualquer ponto do caminho) — bug distinto de "sem barra final".
 * @param {string} urlStr
 * @returns {boolean}
 */
function hasDoubleSlashInPath(urlStr) {
  try {
    const u = new URL(urlStr);
    return u.pathname.includes('//');
  } catch {
    return false; // não é URL absoluta parseável — checado em outro lugar.
  }
}

/**
 * Extensões servidas como ARQUIVO. Arquivo não leva barra final — acrescentá-la
 * geraria 404 —, então href terminado nelas fica fora da checagem (g).
 */
const ASSET_EXTENSION = /\.(css|js|mjs|xml|txt|json|png|jpg|jpeg|webp|avif|svg|ico|woff|woff2|pdf)$/i;

/**
 * Decide se um href é link INTERNO de navegação que deveria ter barra final.
 * Fica de fora: externo (http://, https://, //host, mailto:, tel:), âncora pura
 * ("#x"), caminho relativo, a raiz "/" e arquivos (ASSET_EXTENSION).
 * Querystring e âncora não invalidam o link: só o PATH define o redirect, então
 * "/pagina?x=1" e "/pagina#secao" também são apontados.
 * @param {string} href Valor bruto do atributo href.
 * @returns {boolean} true se falta a barra final.
 */
function isInternalLinkMissingSlash(href) {
  if (!href.startsWith('/')) return false;  // externo, âncora, relativo, mailto:, tel:
  if (href.startsWith('//')) return false;  // protocol-relative = outro host

  const cut = href.search(/[?#]/);
  const path = cut === -1 ? href : href.slice(0, cut);

  if (path === '' || path === '/') return false;   // raiz ou só query/âncora
  if (ASSET_EXTENSION.test(path)) return false;    // arquivo
  return !path.endsWith('/');
}

const errorsA = []; // <loc> do sitemap sem barra
const errorsB = []; // xhtml:link alternate do sitemap sem barra
const errorsC = []; // rel="canonical" sem barra
const errorsD = []; // rel="alternate" hreflang sem barra
const errorsE = []; // "//" duplicado após o domínio
const errorsF = []; // destino do _redirects sem barra
const errorsG = []; // <a href="/..."> interno sem barra final

// --- (a) e (b): dist/sitemap-index.xml ---
if (!existsSync(SITEMAP)) {
  console.log(`⚠️ ${SITEMAP} não existe — pulando checagens (a) e (b). Rode \`astro build\` antes.`);
} else {
  const xml = readFileSync(SITEMAP, 'utf-8');

  // (a) <loc>...</loc>
  const LOC_RE = /<loc>([^<]+)<\/loc>/g;
  let m;
  while ((m = LOC_RE.exec(xml)) !== null) {
    const url = m[1].trim();
    if (hasDoubleSlashInPath(url)) errorsE.push(`sitemap-index.xml <loc>: ${url}`);
    if (!url.endsWith('/')) errorsA.push(url);
  }

  // (b) <xhtml:link rel="alternate" href="...">
  const XHTML_LINK_RE = /<xhtml:link\b[^>]*\/?>/g;
  while ((m = XHTML_LINK_RE.exec(xml)) !== null) {
    const attrs = parseAttrs(m[0]);
    if (attrs.rel !== 'alternate' || !attrs.href) continue;
    const url = attrs.href.trim();
    if (hasDoubleSlashInPath(url)) errorsE.push(`sitemap-index.xml <xhtml:link>: ${url}`);
    if (!url.endsWith('/')) errorsB.push(url);
  }
}

// --- (c), (d) e (g): HTMLs em dist/ ---
if (!existsSync(DIST)) {
  console.log(`⚠️ ${DIST} não existe — pulando checagens (c), (d) e (g). Rode \`astro build\` antes.`);
} else {
  for (const file of htmlFiles(DIST)) {
    const html = readFileSync(file, 'utf-8');
    const rel = file.replace(DIST, '').replace(/\\/g, '/');

    const LINK_RE = /<link\b[^>]*\/?>/g;
    let m;
    while ((m = LINK_RE.exec(html)) !== null) {
      const attrs = parseAttrs(m[0]);
      if (!attrs.href) continue;
      const url = attrs.href.trim();

      if (attrs.rel === 'canonical') {
        if (hasDoubleSlashInPath(url)) errorsE.push(`${rel} <link rel="canonical">: ${url}`);
        if (!url.endsWith('/')) errorsC.push(`${rel}: ${url}`);
      }

      // (d) só conta links "alternate" que carregam hreflang (exclui o
      // rel="alternate" do RSS feed, que não tem hreflang e é relativo).
      if (attrs.rel === 'alternate' && attrs.hreflang) {
        if (hasDoubleSlashInPath(url)) errorsE.push(`${rel} <link rel="alternate" hreflang="${attrs.hreflang}">: ${url}`);
        if (!url.endsWith('/')) errorsD.push(`${rel} [hreflang=${attrs.hreflang}]: ${url}`);
      }
    }

    // (g) só <a href>: navegação de verdade. <link>, <script src> e og:image
    // ficam de fora — não são link que o Googlebot segue como página.
    const ANCHOR_RE = /<a\b[^>]*>/g;
    while ((m = ANCHOR_RE.exec(html)) !== null) {
      const attrs = parseAttrs(m[0]);
      if (!attrs.href) continue;
      const href = attrs.href.trim();
      if (isInternalLinkMissingSlash(href)) errorsG.push(`${rel}: ${href}`);
    }
  }
}

// --- (f): public/_redirects ---
if (!existsSync(REDIRECTS)) {
  console.log(`⚠️ ${REDIRECTS} não existe — pulando checagem (f).`);
} else {
  const raw = readFileSync(REDIRECTS, 'utf-8');
  const lines = raw.split(/\r\n|\n/);
  const RULE_RE = /^(\S+)\s{2,}(\S+)\s{2,}(\d{3})\s*$/;
  const SPECIAL_RE = /(^https?:\/\/)|\?|#|:splat|\*/;

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) return;
    const m = line.match(RULE_RE);
    if (!m) return;
    const dest = m[2];
    if (SPECIAL_RE.test(dest)) return; // URL absoluta ou com ?/#/:splat/* — fora do escopo desta regra.
    if (dest.startsWith('/') && dest.slice(1).includes('//')) {
      errorsE.push(`_redirects linha ${idx + 1} (destino com "//" duplicado): ${dest}`);
    }
    if (!dest.endsWith('/')) {
      errorsF.push(`linha ${idx + 1}: ${dest}`);
    }
  });
}

// --- Relatório final ---
const checks = [
  ['a', 'sitemap <loc> sem barra final', errorsA],
  ['b', 'sitemap <xhtml:link alternate> sem barra final', errorsB],
  ['c', 'HTML rel="canonical" sem barra final', errorsC],
  ['d', 'HTML rel="alternate" hreflang sem barra final', errorsD],
  ['e', 'URL com "//" duplicado após o domínio', errorsE],
  ['f', 'public/_redirects destino sem barra final', errorsF],
  ['g', 'HTML <a href="/..."> interno sem barra final', errorsG],
];

let total = 0;
for (const [key, label, list] of checks) {
  if (list.length === 0) continue;
  total += list.length;
  console.log(`\n❌ (${key}) ${label} — ${list.length} ocorrência(s):`);
  for (const item of list.slice(0, 50)) console.log(`   - ${item}`);
  if (list.length > 50) console.log(`   ... e mais ${list.length - 50}`);
}

if (total > 0) {
  console.log(`\n⚠️ ${total} problema(s) de barra final/URL encontrados.`);
  console.log(`Domínio esperado: ${SITE_URL} (host: ${BLOG_HOST}). Toda URL canônica publicada deve terminar com "/" para evitar o salto extra 301→308→200.`);
  process.exit(1);
}

console.log('✅ Barra final OK — sitemap, canonical, hreflang, _redirects e links internos consistentes.');
process.exit(0);
