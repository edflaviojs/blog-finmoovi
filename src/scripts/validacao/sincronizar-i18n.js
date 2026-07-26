/**
 * sincronizar-i18n.js — Auto-corretor de sincronização i18n (PT/EN/ES)
 *
 * Varre posts e glossário, detecta conteúdo faltando um idioma, GERA a tradução
 * faltante automaticamente (via lib/i18n-sync.js), salva com filename/locale/
 * translationKey corretos e REVALIDA. Objetivo: nunca deixar conteúdo publicado
 * incompleto — se faltar, conserta sozinho.
 *
 * Uso:
 *   node src/scripts/validacao/sincronizar-i18n.js              # gera + commita + revalida
 *   node src/scripts/validacao/sincronizar-i18n.js --dry-run    # só lista lacunas
 *   node src/scripts/validacao/sincronizar-i18n.js --no-commit  # gera sem commit
 *   node src/scripts/validacao/sincronizar-i18n.js --no-validate # pula a revalidação
 *                                                                # (usado como rede de segurança
 *                                                                #  nos workflows de geração, que já
 *                                                                #  rodam validar-i18n.js em seguida)
 *
 * Exit 0 = sem lacunas (ou lacunas corrigidas e validadas).
 * Exit 1 = ainda há lacunas / falha na revalidação (bloqueia).
 */

import { writeFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import {
  POSTS_DIR, GLOSSARIO_DIR,
  scanPosts, scanGlossario, pickSource, buildTranslatedFile,
  getScalar, splitFrontmatter, localeFromFilename,
} from '../lib/i18n-sync.js';
import { readFileSync } from 'fs';

const DRY_RUN = process.argv.includes('--dry-run');
const NO_COMMIT = process.argv.includes('--no-commit');
const NO_VALIDATE = process.argv.includes('--no-validate');

async function fixGap({ dir, kind, sourceName, missingLocales, present }) {
  const created = [];
  const src = pickSource(present);
  if (!src) {
    console.log(`   ⚠️ ${sourceName}: nenhum source disponível — pulando`);
    return created;
  }
  const sourceRaw = readFileSync(join(dir, src.file), 'utf-8');

  // Trava aditiva (anti-duplicata por par translationKey+locale).
  // O existsSync abaixo só pega colisão de filename IDÊNTICO. Quando um irmão
  // da mesma translationKey já existe sob um SLUG diferente (ex.: en-amortization.md
  // vs. en-amortizacao.md), aquela trava não pega e nasceria uma DUPLICATA do
  // mesmo termo/locale. Aqui detectamos o irmão pelo par (translationKey, locale)
  // e pulamos o target quando ele já existe. Sem translationKey no source, esta
  // trava não se aplica (mantém-se só o existsSync de filename) — nada de fallback
  // por slug, que reintroduziria o bug.
  const sourceParsed = splitFrontmatter(sourceRaw);
  const sourceKey = sourceParsed ? getScalar(sourceParsed.fm, 'translationKey') : null;
  const dirFiles = sourceKey ? readdirSync(dir).filter(f => f.endsWith('.md')) : [];

  for (const target of missingLocales) {
    // Quando o source tem translationKey, verifica se já existe um irmão
    // (mesmo translationKey + mesmo locale, pelo prefixo do filename) antes de gravar.
    if (sourceKey) {
      const sibling = dirFiles.find(file => {
        if (localeFromFilename(file) !== target) return false;
        try {
          const parsed2 = splitFrontmatter(readFileSync(join(dir, file), 'utf-8'));
          return parsed2 && getScalar(parsed2.fm, 'translationKey') === sourceKey;
        } catch (e) {
          if (e.code === 'ENOENT') return false; // arquivo removido entre readdir e read — não é irmão
          throw e; // erro real (permissão, I/O) — propaga
        }
      });
      if (sibling) {
        console.log(`   ⏭️ ${sourceName} → ${target}: já existe irmão (${sibling}) com translationKey ${sourceKey} — pulando (evita duplicata)`);
        continue;
      }
    }

    let filename, content;
    try {
      ({ filename, content } = await buildTranslatedFile(sourceRaw, src.file, target, kind));
    } catch (err) {
      console.log(`   ❌ ${sourceName} → ${target}: falha na geração — ${err.message}`);
      throw err;
    }
    const outPath = join(dir, filename);
    if (existsSync(outPath)) {
      throw new Error(`Colisão: ${filename} já existe (não sobrescrevo). Grupo ${sourceName}.`);
    }
    if (DRY_RUN) {
      console.log(`   [dry-run] geraria ${filename} (${target}) a partir de ${src.file}`);
    } else {
      writeFileSync(outPath, content);
      console.log(`   ✅ ${filename} (${target}) gerado a partir de ${src.file}`);
      created.push(outPath);
    }
  }
  return created;
}

async function main() {
  console.log('🔄 Sincronização i18n (auto-corretor)\n');

  const postGaps = scanPosts();
  const glossGaps = scanGlossario();

  console.log(`📊 Lacunas: posts=${postGaps.length}, glossário=${glossGaps.length}`);
  if (postGaps.length === 0 && glossGaps.length === 0) {
    console.log('✅ Nenhuma lacuna — tudo sincronizado nos 3 idiomas.\n');
    process.exit(0);
  }

  const createdAll = [];

  for (const g of postGaps) {
    console.log(`\n📝 POST "${g.key}" — falta: ${g.missing.join(', ')}`);
    const created = await fixGap({
      dir: POSTS_DIR, kind: 'post', sourceName: g.key,
      missingLocales: g.missing, present: g.present,
    });
    createdAll.push(...created);
  }

  for (const g of glossGaps) {
    console.log(`\n📖 GLOSSÁRIO "${g.base}" — falta: ${g.missing.join(', ')}`);
    const created = await fixGap({
      dir: GLOSSARIO_DIR, kind: 'glossario', sourceName: g.base,
      missingLocales: g.missing, present: g.present,
    });
    createdAll.push(...created);
  }

  if (DRY_RUN) {
    console.log(`\n[dry-run] ${postGaps.length + glossGaps.length} grupos com lacuna. Nada gravado.`);
    process.exit(1); // sinaliza que HÁ lacunas
  }

  // Commit apenas dos arquivos criados (whitelist explícita — nunca git add -A).
  if (createdAll.length > 0 && !NO_COMMIT) {
    try {
      for (const f of createdAll) execSync(`git add "${f}"`, { stdio: 'inherit' });
      execSync(`git -c commit.gpgsign=false commit -m "i18n: auto-sincronizar ${createdAll.length} traducao(oes) faltante(s) [bot]"`, { stdio: 'inherit' });
      console.log(`\n📦 Commit criado com ${createdAll.length} arquivo(s).`);
    } catch (err) {
      console.log(`\n⚠️ Falha ao commitar: ${err.message}`);
    }
  }

  if (NO_VALIDATE) {
    console.log('\n(--no-validate) Revalidação pulada.');
    process.exit(0);
  }

  // Revalida com os TRÊS gates (consistência + duplicata + linguagem de slug).
  console.log('\n🔍 Revalidando...');
  let ok = true;
  try {
    execSync('node src/scripts/validacao/validar-i18n.js', { stdio: 'inherit' });
  } catch { ok = false; }
  try {
    execSync('node --import tsx scripts/validate-i18n-sync.js', { stdio: 'inherit' });
  } catch { ok = false; }
  try {
    execSync('node scripts/validate-slug-language.js', { stdio: 'inherit' });
  } catch { ok = false; }

  if (!ok) {
    console.log('\n🚫 Revalidação FALHOU — ainda há inconsistências.');
    process.exit(1);
  }
  console.log('\n✅ Sincronização concluída e validada.');
  process.exit(0);
}

main().catch(err => {
  console.error('\n💥 Erro fatal na sincronização:', err.message);
  process.exit(1);
});
