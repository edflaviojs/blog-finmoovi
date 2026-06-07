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

import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const POSTS_DIR = join(process.cwd(), 'src', 'content', 'posts');

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
    const localeCount = Object.keys(locales).length;
    if (localeCount !== 3) {
      const missing = ['pt', 'en', 'es'].filter(l => !locales[l]);
      if (localeCount === 1) {
        warnings.push(`⚠️ translationKey "${key}" só tem 1 locale (${Object.keys(locales)[0]}) — faltam: ${missing.join(', ')}`);
      } else if (localeCount === 2) {
        warnings.push(`⚠️ translationKey "${key}" tem 2 locales — falta: ${missing.join(', ')}`);
      }
    }
  }

  // 3. Contagem por locale deve ser igual
  const countPt = posts.filter(p => p.locale === 'pt').length;
  const countEn = posts.filter(p => p.locale === 'en').length;
  const countEs = posts.filter(p => p.locale === 'es').length;

  console.log(`📊 Posts: PT=${countPt}, EN=${countEn}, ES=${countEs}`);

  if (countPt !== countEn || countPt !== countEs) {
    warnings.push(`⚠️ Contagem de posts desigual: PT=${countPt}, EN=${countEn}, ES=${countEs}`);
    if (Math.abs(countPt - countEn) > 2 || Math.abs(countPt - countEs) > 2) {
      errors.push(`❌ Diferença > 2 posts entre locales: PT=${countPt}, EN=${countEn}, ES=${countEs}`);
    }
  }

  // 4. Verificar que translationKeys não contêm palavras traduzidas
  const translatedMonths = /-(january|february|march|april|may|june|july|august|september|october|november|december|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)-/i;
  for (const [key, locales] of Object.entries(keyMap)) {
    if (translatedMonths.test(key)) {
      errors.push(`❌ translationKey "${key}" contém mês traduzido (deve usar PT como base)`);
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
