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
 *   node src/scripts/validacao/sincronizar-i18n.js --limit 5     # trata no máx. 5 grupos e adia o resto
 *
 * Exit 0 = sem lacunas (ou lacunas corrigidas e validadas)
 *          OU lote truncado por --limit (as lacunas restantes são esperadas).
 * Exit 1 = ainda há lacunas / falha na revalidação (bloqueia).
 *
 * ⚠️ SEM `--limit` o comportamento é o histórico: trata TODAS as lacunas numa
 * execução. 17 workflows chamam este script — mudar o default quebraria todos
 * de uma vez. A adoção do teto é por workflow, uma de cada vez.
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

// --limit N: teto de GRUPOS por execução (um grupo = um translationKey com
// 1+ idiomas em falta). Sem a flag, Infinity = comportamento histórico
// INALTERADO — importante, porque 17 workflows chamam este script.
//
// Por que existe: sem teto, uma execução traduz TODAS as lacunas em série via
// IA. Medido em 25/07/2026 dentro do sazonal-mercados: 5.313s (88 min) num
// único passo, contra 67s do passo que gera o post. Ver IMPLEMENTACAO24 §4.
const LIMIT = (() => {
  const i = process.argv.indexOf('--limit');
  if (i === -1) return Infinity;
  const n = parseInt(process.argv[i + 1], 10);
  return Number.isFinite(n) && n > 0 ? n : Infinity;
})();

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

  // Fatia pelo teto de grupos. Posts primeiro (conteúdo publicado tem mais
  // urgência que verbete de glossário); o que sobra vai para a próxima
  // execução. Com LIMIT = Infinity ambos os slice devolvem a lista inteira,
  // então o caminho histórico continua idêntico.
  const totalGaps = postGaps.length + glossGaps.length;
  const postsToDo = postGaps.slice(0, LIMIT);
  const glossToDo = glossGaps.slice(0, Math.max(0, LIMIT - postsToDo.length));
  const truncado = (postsToDo.length + glossToDo.length) < totalGaps;

  if (truncado) {
    console.log(`\n⏳ Lote limitado a ${LIMIT} grupo(s): tratando ${postsToDo.length + glossToDo.length} de ${totalGaps}. Os ${totalGaps - (postsToDo.length + glossToDo.length)} restantes ficam para a próxima execução.`);
  }

  const createdAll = [];

  for (const g of postsToDo) {
    console.log(`\n📝 POST "${g.key}" — falta: ${g.missing.join(', ')}`);
    const created = await fixGap({
      dir: POSTS_DIR, kind: 'post', sourceName: g.key,
      missingLocales: g.missing, present: g.present,
    });
    createdAll.push(...created);
  }

  for (const g of glossToDo) {
    console.log(`\n📖 GLOSSÁRIO "${g.base}" — falta: ${g.missing.join(', ')}`);
    const created = await fixGap({
      dir: GLOSSARIO_DIR, kind: 'glossario', sourceName: g.base,
      missingLocales: g.missing, present: g.present,
    });
    createdAll.push(...created);
  }

  if (DRY_RUN) {
    console.log(`\n[dry-run] ${totalGaps} grupos com lacuna${truncado ? ` (${postsToDo.length + glossToDo.length} caberiam neste lote)` : ''}. Nada gravado.`);
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

  // Lote truncado: as lacunas restantes são ESPERADAS, não defeito. Revalidar
  // aqui faria validar-i18n.js acusar justamente o que foi adiado de propósito
  // → exit 1 → nos workflows sem `if: !cancelled()` o push morre e as
  // traduções recém-criadas se perdem no runner. Sai 0 e avisa alto; a
  // validação completa acontece na primeira execução que NÃO truncar.
  if (truncado) {
    console.log(`\n⏳ Revalidação adiada: ${totalGaps - (postsToDo.length + glossToDo.length)} grupo(s) ainda em fila por causa do --limit.`);
    console.log('   Isto NÃO é falha — a próxima execução continua de onde parou e revalida tudo.');
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
