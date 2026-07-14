/**
 * reset-nicho.js — Zera o conteúdo de exemplo (FinMoovi/finanças) e deixa o
 * template como uma CASCA pronta para o novo nicho ("plugin WordPress").
 *
 * O que apaga:
 *   1. Conteúdo: posts, glossário, imagens de posts/glossário/ferramentas,
 *      rascunhos sociais (social/), kits de imprensa (press/), relatórios (reports/)
 *   2. Tracking: .github/data/*.json, .current-letter, public/_redirects (esvazia)
 *   3. Páginas de NICHO: /estudos, /estatisticas, /embed, /ferramentas (+ en/es),
 *      landings SEO (checklist-financeiro, como-organizar-financas,
 *      como-sair-das-dividas, guia-30-dias, orcamento-pessoal)
 *   4. Dados de nicho: endividamento.json, statistics.json
 *   5. Patches: remove "Ferramentas"/"Estudos" dos menus (header/mobile/rodapé)
 *      e o ticker CotacaoBar do Header
 *
 * O que NÃO apaga (adaptar manualmente no novo nicho — ver IMPLEMENTACAO17 §E2):
 *   - /app (footer e banners linkam p/ ele — reescrever a copy)
 *   - NewsletterPopup (lead magnet) e CTAVariado (pool de CTAs)
 *   - functions/api/cotacoes.js|moedas.js (órfãs sem o ticker — apagar se não usar)
 *   - src/data/authors.ts (criar o autor do novo blog)
 *
 * SEGURANÇA: recusa rodar se config.brand.name === 'FinMoovi' (blog-mãe),
 * a menos que --force seja passado. Use --dry para simular.
 *
 * Uso: npm run reset:nicho          (apaga de verdade, com confirmação)
 *      npm run reset:nicho -- --dry (só mostra o que faria)
 */
import { readdirSync, readFileSync, writeFileSync, unlinkSync, rmdirSync, existsSync, statSync, mkdirSync } from 'fs';
import { join } from 'path';
import { createInterface } from 'readline';
import { config } from '../site.config.ts';

const ROOT = process.cwd();
const DRY = process.argv.includes('--dry');
const FORCE = process.argv.includes('--force');
const YES = process.argv.includes('--yes');

let removed = 0, patched = 0, failures = 0;

function log(msg) { console.log(msg); }

/**
 * Deleção recursiva com unlink/rmdir (NÃO usa fs.rmSync: em alguns ambientes
 * Windows ele reporta sucesso sem deletar — verificado em Node 24 + path acentuado).
 */
function deleteRecursive(p) {
  const st = statSync(p);
  if (st.isDirectory()) {
    for (const e of readdirSync(p)) deleteRecursive(join(p, e));
    rmdirSync(p);
  } else {
    unlinkSync(p);
  }
}

function rmPath(rel) {
  const p = join(ROOT, rel);
  if (!existsSync(p)) return;
  if (DRY) { log(`  [dry] apagaria: ${rel}`); removed++; return; }
  try {
    deleteRecursive(p);
  } catch (e) {
    log(`  ❌ FALHOU apagar ${rel}: ${e.message}`);
    failures++;
    return;
  }
  if (existsSync(p)) {          // verificação pós-deleção (paranóia justificada)
    log(`  ❌ AINDA EXISTE após deletar: ${rel}`);
    failures++;
    return;
  }
  log(`  🗑️  ${rel}`);
  removed++;
}

function emptyDir(rel, { keep = [] } = {}) {
  const dir = join(ROOT, rel);
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    if (keep.includes(entry) || entry === '.gitkeep') continue;
    rmPath(join(rel, entry));
  }
  if (!DRY) {
    try { writeFileSync(join(dir, '.gitkeep'), ''); } catch { /* ok */ }
  }
}

function writeFile(rel, content) {
  if (DRY) { log(`  [dry] reescreveria: ${rel}`); patched++; return; }
  const p = join(ROOT, rel);
  mkdirSync(join(p, '..'), { recursive: true });
  writeFileSync(p, content, 'utf-8');
  log(`  ✏️  ${rel}`);
  patched++;
}

/** Remove linhas exatas de um arquivo (patch cirúrgico dos menus/header). */
function stripLines(rel, needles) {
  const p = join(ROOT, rel);
  if (!existsSync(p)) { log(`  ⚠️  não encontrado: ${rel}`); return; }
  const src = readFileSync(p, 'utf-8');
  const lines = src.split('\n');
  const kept = lines.filter(l => !needles.some(n => l.includes(n)));
  const diff = lines.length - kept.length;
  if (diff === 0) { log(`  ⚠️  nada a remover em ${rel} (linhas não encontradas — remova manualmente)`); return; }
  if (DRY) { log(`  [dry] removeria ${diff} linha(s) de ${rel}`); patched++; return; }
  writeFileSync(p, kept.join('\n'), 'utf-8');
  log(`  ✂️  ${rel} (−${diff} linha(s))`);
  patched++;
}

async function confirm() {
  if (YES || DRY) return true;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise(r => rl.question(
    `⚠️  Isto vai APAGAR todo o conteúdo de exemplo deste repo (marca atual: ${config.brand.name}).\n` +
    `   Digite "resetar" para confirmar: `, r));
  rl.close();
  return answer.trim().toLowerCase() === 'resetar';
}

async function main() {
  console.log(`\n🧹 RESET DE NICHO — deixa o template zerado p/ o novo nicho${DRY ? ' (DRY RUN)' : ''}\n`);

  // Trava: nunca rodar por acidente no blog-mãe
  if (config.brand.name.toLowerCase() === 'finmoovi' && !FORCE) {
    console.error('⛔ TRAVA: a marca configurada ainda é "FinMoovi" (blog-mãe).');
    console.error('   Rode o setup PRIMEIRO (npm run setup) e só então o reset.');
    console.error('   (Para testes conscientes: --force)');
    process.exit(1);
  }

  if (!(await confirm())) { console.log('Cancelado.'); process.exit(0); }

  log('\n━━ 1/5 Conteúdo de exemplo ━━');
  emptyDir('src/content/posts');
  emptyDir('src/content/glossario');
  emptyDir('public/images/posts');
  emptyDir('public/images/glossario');
  emptyDir('public/images/ferramentas');
  emptyDir('social');
  emptyDir('press');
  emptyDir('reports');

  log('\n━━ 2/5 Tracking e redirects ━━');
  emptyDir('.github/data');
  rmPath('.current-letter');
  writeFile('public/_redirects', '# Redirects 301 do blog (um por linha: /origem /destino 301)\n');
  writeFile('scripts/data/blog-topics.json', '[]\n');
  writeFile('scripts/data/directory-submissions.json', JSON.stringify({ updatedAt: '', submissions: [] }, null, 2) + '\n');

  log('\n━━ 3/5 Páginas de nicho (finanças) ━━');
  rmPath('src/pages/estudos');
  rmPath('src/pages/estatisticas.astro');
  rmPath('src/pages/embed.astro');
  rmPath('src/pages/ferramentas');
  rmPath('src/pages/en/ferramentas');
  rmPath('src/pages/es/ferramentas');
  rmPath('src/pages/checklist-financeiro.astro');
  rmPath('src/pages/como-organizar-financas.astro');
  rmPath('src/pages/como-sair-das-dividas.astro');
  rmPath('src/pages/guia-30-dias.astro');
  rmPath('src/pages/orcamento-pessoal.astro');
  rmPath('src/pages/LANDING-PAGES-README.md');

  log('\n━━ 4/5 Dados de nicho ━━');
  rmPath('src/data/endividamento.json');
  rmPath('src/data/statistics.json');
  rmPath('public/data/statistics.json');

  log('\n━━ 5/5 Menus e ticker ━━');
  stripLines('src/components/header/Navigation.astro', [
    "{ label: 'Ferramentas', key: 'nav.ferramentas', href: '/ferramentas' },",
    "{ label: 'Estudos', key: 'nav.estudos', href: '/estudos' },",
  ]);
  stripLines('src/components/header/MobileMenu.astro', [
    "{ label: 'Ferramentas', href: '/ferramentas', i18n: 'nav.ferramentas' },",
    "{ label: 'Estudos', href: '/estudos', i18n: 'nav.estudos' },",
  ]);
  stripLines('src/components/footer/Footer.astro', [
    "{ label: 'Ferramentas', href: '/ferramentas', i18n: 'footer.link.ferramentas' },",
    "{ label: 'Estudos', href: '/estudos', i18n: 'footer.link.estudos' },",
  ]);
  stripLines('src/components/header/Header.astro', [
    "import CotacaoBar from './CotacaoBar.astro';",
    '<CotacaoBar />',
  ]);

  if (failures > 0) {
    console.error(`\n❌ Reset INCOMPLETO: ${failures} falha(s) de deleção. Verifique permissões e rode de novo.`);
    process.exit(1);
  }
  console.log(`\n✅ Reset concluído: ${removed} item(ns) apagado(s), ${patched} arquivo(s) ajustado(s).`);
  console.log(`
Próximos passos:
  1. npm run demo-content   → gera os 3 primeiros posts do NOVO nicho via IA
  2. npm run build          → valida (i18n + schema + template)
  3. Adaptar módulos de nicho restantes (⚙️ no código):
     /app (copy do produto), NewsletterPopup (lead magnet), CTAVariado (pool),
     functions/api/cotacoes|moedas (apagar se não usar), authors.ts (novo autor),
     subreddits (reddit-opportunities), sites concorrentes (broken-link-finder)
`);
}

main().catch(e => { console.error('Erro no reset:', e.message); process.exit(1); });
