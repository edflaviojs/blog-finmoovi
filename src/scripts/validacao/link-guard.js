/**
 * link-guard.js (CLI) — varre TODO o conteudo e desfaz links internos cujo
 * destino nao existe (posts e glossario, nos 3 idiomas). Ver a explicacao do
 * defeito em src/scripts/lib/link-guard.js.
 *
 * POR QUE ESTE VARREDOR EXISTE, se o robo do i18n ja tem a guarda embutida:
 * o prompt partilhado (translation-prompt.js) e usado por 12 scripts, e ha 27
 * workflows a escrever conteudo. Por a guarda em cada um seria 27 sitios para
 * esquecer. Aqui a rede e uma so e apanha o que qualquer robo escrever — o mesmo
 * desenho do fact-guard.js, e pela mesma razao registada em
 * [[blog-capas-orfas-e-gates]]: trava que corre no push de bot nao dispara, logo
 * o guarda tem de ser um workflow diario a seguir.
 *
 * Modos:
 *   (default)     repara, escreve, commita (whitelist) e escreve o relatorio
 *   --check       nao escreve nada; sai com 1 se achar algum link inventado
 *                 (para usar como trava ANTES do push num workflow de robo)
 *   --dry-run     mostra o que faria, nao escreve nem commita
 *   --no-commit   escreve os ficheiros, nao commita
 *
 * Push = responsabilidade do workflow, como no fact-guard.
 */

import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { fixInternalLinks, carregarDestinos } from '../lib/link-guard.js';

const ROOT = process.cwd();
const COLECOES = ['posts', 'glossario'];
const PRESS_DIR = join(ROOT, 'press');
const REPORT = join(PRESS_DIR, 'link-guard.md');

const CHECK = process.argv.includes('--check');
const DRY = process.argv.includes('--dry-run');
const NO_COMMIT = process.argv.includes('--no-commit');

function main() {
  const destinos = carregarDestinos(ROOT);
  if (destinos.size === 0) {
    console.log('🔗 link-guard: nenhum destino carregado (src/content vazio?). Nada a fazer.');
    return;
  }
  console.log(`🔗 link-guard: ${destinos.size} destino(s) real(is) em posts + glossario.`);

  const achados = [];        // { rel, desembrulhados: [{label, href}] }
  const caminhosAlterados = [];
  let ficheirosLidos = 0;

  for (const colecao of COLECOES) {
    const dir = join(ROOT, 'src', 'content', colecao);
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir)) {
      if (!file.endsWith('.md') && !file.endsWith('.mdx')) continue;
      const abs = join(dir, file);
      const rel = `src/content/${colecao}/${file}`;
      let raw;
      try { raw = readFileSync(abs, 'utf-8'); } catch { continue; }
      ficheirosLidos++;

      const r = fixInternalLinks(raw, destinos);
      if (!r.changed) continue;

      achados.push({ rel, desembrulhados: r.desembrulhados });
      if (!CHECK && !DRY) {
        writeFileSync(abs, r.text, 'utf-8');
        caminhosAlterados.push(rel);
      }
    }
  }

  const totalLinks = achados.reduce((s, a) => s + a.desembrulhados.length, 0);
  console.log(`   ${ficheirosLidos} ficheiro(s) lido(s) | ${achados.length} com link inventado | ${totalLinks} link(s)`);
  for (const a of achados) {
    for (const d of a.desembrulhados) {
      console.log(`   🔗 ${a.rel}: [${d.label}](${d.href})`);
    }
  }

  // Modo trava: nao escreve, so reprova. E o que um robo chama antes do push.
  if (CHECK) {
    if (totalLinks > 0) {
      console.error('');
      console.error(`❌ ${totalLinks} link(s) interno(s) para destino inexistente.`);
      console.error('   Isto reprova o build e PARA o deploy do blog. Corrija antes do push:');
      console.error('   node src/scripts/validacao/link-guard.js');
      process.exit(1);
    }
    console.log('✅ Nenhum link interno inventado.');
    return;
  }

  if (totalLinks === 0) { console.log('✅ Nenhum link interno inventado.'); return; }
  if (DRY) { console.log('   [dry-run] nada escrito/commitado.'); return; }

  // Relatorio (mesmo destino dos outros guardas: press/).
  try {
    if (!existsSync(PRESS_DIR)) mkdirSync(PRESS_DIR, { recursive: true });
    const linhas = [
      '# link-guard — links internos inventados',
      '',
      'Links cujo destino nao existe em `src/content`. O texto visivel foi',
      'preservado; apenas a URL caiu. Causa habitual: a regra 2 do',
      '`translation-prompt.js` troca o nome visivel do produto e o modelo reescreve',
      'a URL para combinar, inventando um slug.',
      '',
      `Ficheiros afetados: ${achados.length} | links desfeitos: ${totalLinks}`,
      '',
    ];
    for (const a of achados) {
      linhas.push(`## ${a.rel}`);
      for (const d of a.desembrulhados) linhas.push(`- \`[${d.label}](${d.href})\``);
      linhas.push('');
    }
    writeFileSync(REPORT, linhas.join('\n'), 'utf-8');
  } catch (e) {
    console.log('   ⚠️ relatorio nao escrito:', (e.message || '').slice(0, 120));
  }

  if (NO_COMMIT) { console.log('   [no-commit] ficheiros escritos, sem commit.'); return; }

  const aCommitar = [...caminhosAlterados, 'press/link-guard.md'];
  try {
    execSync(`git add ${aCommitar.map(p => `"${p}"`).join(' ')}`, { stdio: 'pipe' });
    const staged = execSync('git diff --cached --name-only', { stdio: 'pipe' }).toString().trim();
    if (staged) {
      execSync(`git -c commit.gpgsign=false commit -m "content(link-guard): desfazer ${totalLinks} link(s) interno(s) para destino inexistente [bot]"`, { stdio: 'pipe' });
      console.log('   ✅ commit criado.');
    } else console.log('   Nada para commitar.');
  } catch (e) {
    console.log('   ⚠️ commit falhou:', (e.stderr || e.message || '').toString().slice(-200));
  }
}

main();
