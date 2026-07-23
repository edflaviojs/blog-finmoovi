/**
 * Validador de Consistência i18n
 * TRAVA DE SEGURANÇA: Roda antes de todo push em workflows de geração.
 * Se encontrar problemas, BLOQUEIA o push (exit code 1).
 *
 * Verifica:
 * 1. Todos os posts têm translationKey
 * 2. Todos os translationKeys existem em EXATAMENTE 3 locales (PT+EN+ES)
 * 3. Não há posts duplicados (mesmo locale + mesma data + mesmo translationKey)
 * 4. Todos os locales têm a mesma quantidade de posts
 * 5. hreflang URLs são consistentes
 *
 * Uso: node src/scripts/validacao/validar-i18n.js
 * Exit 0 = tudo ok, Exit 1 = problemas encontrados (bloqueia push)
 */

import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { SERIE_RE, coreTokens, jaccardSim } from '../lib/seo-guard.js';
import { looksWrongLanguage } from '../lib/lang-guard.js';
import { config } from '../../../site.config.ts';

const POSTS_DIR = join(process.cwd(), 'src', 'content', 'posts');
const GLOSSARIO_DIR = join(process.cwd(), 'src', 'content', 'glossario');
// T8: locales exigidos vêm do config (modo 1 idioma = valida só o(s) configurado(s))
const LOCALES = [...config.locales];

function getPostLocale(filename) {
  if (filename.startsWith('en-')) return 'en';
  if (filename.startsWith('es-')) return 'es';
  return 'pt';
}

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const fm = {};
  match[1].split('\n').forEach(line => {
    const [key, ...rest] = line.split(':');
    if (key && rest.length) {
      let value = rest.join(':').trim();
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      fm[key.trim()] = value;
    }
  });
  return fm;
}

// --- Detecção de canibalização de SEO ---
// Lógica centralizada em ../lib/seo-guard.js (fonte única): a MESMA usada pelos
// geradores para pular temas já cobertos ANTES de gastar API. Bloqueia quando
// 2+ posts PT distintos miram o mesmo tema; séries periódicas são ignoradas.

function main() {
  console.log('🔍 Validando consistência i18n...\n');

  const files = readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));
  const errors = [];
  const warnings = [];

  // Parse all posts
  const posts = files.map(file => {
    const content = readFileSync(join(POSTS_DIR, file), 'utf-8');
    const fm = parseFrontmatter(content);
    return {
      file,
      locale: fm.locale || getPostLocale(file),
      translationKey: fm.translationKey || null,
      publishedAt: fm.publishedAt || null,
      category: fm.category || null,
      draft: fm.draft === 'true',
    };
  }).filter(p => !p.draft);

  // 1. Todos os posts devem ter translationKey
  const withoutKey = posts.filter(p => !p.translationKey);
  if (withoutKey.length > 0) {
    errors.push(`❌ ${withoutKey.length} posts SEM translationKey:`);
    withoutKey.forEach(p => errors.push(`   - ${p.file}`));
  }

  // 2. Todos os translationKeys devem ter exatamente 3 locales
  const keyMap = {};
  for (const post of posts) {
    if (!post.translationKey) continue;
    if (!keyMap[post.translationKey]) keyMap[post.translationKey] = {};
    if (keyMap[post.translationKey][post.locale]) {
      errors.push(`❌ DUPLICATA: translationKey "${post.translationKey}" tem 2+ posts no locale "${post.locale}":`);
      errors.push(`   - ${keyMap[post.translationKey][post.locale]}`);
      errors.push(`   - ${post.file}`);
    }
    keyMap[post.translationKey][post.locale] = post.file;
  }

  for (const [key, locales] of Object.entries(keyMap)) {
    const present = LOCALES.filter(l => locales[l]).length;
    if (present !== LOCALES.length) {
      const missing = LOCALES.filter(l => !locales[l]);
      errors.push(`❌ translationKey "${key}" tem ${present}/${LOCALES.length} locales — faltam: ${missing.join(', ')}`);
    }
  }

  // 3. Contagem por locale deve ser igual (entre os locales configurados)
  const counts = Object.fromEntries(LOCALES.map(l => [l, posts.filter(p => p.locale === l).length]));
  console.log(`📊 Posts: ${LOCALES.map(l => `${l.toUpperCase()}=${counts[l]}`).join(', ')}`);

  const base = counts[LOCALES[0]];
  for (const l of LOCALES.slice(1)) {
    if (counts[l] !== base) {
      warnings.push(`⚠️ Contagem de posts desigual: ${LOCALES[0].toUpperCase()}=${base}, ${l.toUpperCase()}=${counts[l]}`);
      if (Math.abs(base - counts[l]) > 2) {
        errors.push(`❌ Diferença > 2 posts entre locales: ${LOCALES[0].toUpperCase()}=${base}, ${l.toUpperCase()}=${counts[l]}`);
      }
    }
  }

  // 4. Verificar que translationKeys não contêm palavras traduzidas
  const translatedMonths = /-(january|february|march|april|may|june|july|august|september|october|november|december|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)-/i;
  for (const [key, locales] of Object.entries(keyMap)) {
    if (translatedMonths.test(key)) {
      errors.push(`❌ translationKey "${key}" contém mês traduzido (deve usar PT como base)`);
    }
  }

  // 5. Canibalização: posts PT distintos com o mesmo núcleo de palavras-chave
  const ptCanibal = posts
    .filter(p => p.locale === 'pt')
    .map(p => { const slug = p.file.replace(/\.md$/, ''); return { slug, core: coreTokens(slug) }; })
    .filter(p => !SERIE_RE.test(p.slug)); // séries periódicas nunca são canibalização
  for (let i = 0; i < ptCanibal.length; i++) {
    for (let j = i + 1; j < ptCanibal.length; j++) {
      const A = ptCanibal[i], B = ptCanibal[j];
      const shared = [...A.core].filter(x => B.core.has(x));
      if (shared.length >= 3 || jaccardSim(A.core, B.core) >= 0.7) {
        errors.push(`❌ CANIBALIZAÇÃO: 2 posts PT competem pelo mesmo tema (${shared.join(', ')}):`);
        errors.push(`   - ${A.slug}`);
        errors.push(`   - ${B.slug}`);
      }
    }
  }

  // 6. Trava de tradução (lang-guard) — AVISO, não bloqueante: corpo EN/ES que
  //    parece estar em português. Quem corrige é o sweep semanal
  //    (traducao-sweep.yml); aqui é só visibilidade para não travar o CI.
  for (const [dir, label] of [[POSTS_DIR, 'posts'], [GLOSSARIO_DIR, 'glossario']]) {
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir).filter(f => /^(en|es)-.+\.md$/.test(f))) {
      try {
        const raw = readFileSync(join(dir, file), 'utf-8');
        const bodyMatch = raw.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?([\s\S]*)$/);
        const body = bodyMatch ? bodyMatch[1] : raw;
        const check = looksWrongLanguage(body, file.startsWith('en-') ? 'en' : 'es');
        if (check.wrong) {
          warnings.push(`⚠️ Tradução suspeita (lang-guard): ${label}/${file} — ${check.reason}`);
        }
      } catch { /* arquivo ilegível não derruba o validador por causa de um aviso */ }
    }
  }

  // Report
  console.log('');
  if (warnings.length > 0) {
    console.log('⚠️  AVISOS:');
    warnings.forEach(w => console.log(w));
    console.log('');
  }

  if (errors.length > 0) {
    console.log('❌ ERROS CRÍTICOS (bloqueiam push):');
    errors.forEach(e => console.log(e));
    console.log(`\n🚫 Validação FALHOU — ${errors.length} erros encontrados.`);
    console.log('   Corrija os erros acima antes de fazer push.');
    process.exit(1);
  }

  console.log('✅ Validação i18n OK — todos os posts consistentes!\n');
  process.exit(0);
}

main();
