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
    }
    if (hadSchema) pagesWithSchema++;
  }

  console.log(`🔍 Schema: ${files.length} páginas, ${pagesWithSchema} com JSON-LD, ${schemaCount} blocos verificados.`);

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
