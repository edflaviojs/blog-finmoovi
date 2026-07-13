/**
 * fact-guard.js (CLI) — varre os posts, aplica o Fact Firewall (Secao 42.13) e
 * gera relatorio. Modo HIBRIDO (decisao do usuario):
 *   - remove links externos fora da allowlist + CORTA frases que citam
 *     estudo/pesquisa + %/atribuicao SEM link confiavel;
 *   - se a limpeza deixaria o post capenga (encolheu demais) -> NAO altera; marca
 *     para REVISAO MANUAL (nao publica versao mutilada);
 *   - flags (atribuicoes sem link) sao so reportadas.
 * Escreve press/fact-guard.md e commita os posts limpos (whitelist). Push = workflow.
 *
 * Flags: --dry-run (nao escreve/commita)  |  --no-commit (escreve, nao commita).
 */

import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { analyzeContent } from '../lib/fact-guard.js';

const POSTS_DIR = join(process.cwd(), 'src', 'content', 'posts');
const PRESS_DIR = join(process.cwd(), 'press');
const REPORT = join(PRESS_DIR, 'fact-guard.md');
const DRY = process.argv.includes('--dry-run');
const NO_COMMIT = process.argv.includes('--no-commit');

function splitFm(raw) {
  const m = raw.match(/^(---\r?\n[\s\S]*?\r?\n---\r?\n?)([\s\S]*)$/);
  return m ? { fm: m[1], body: m[2] } : null;
}

function main() {
  if (!existsSync(POSTS_DIR)) { console.log('Sem posts. Nada a fazer.'); return; }
  const files = readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));

  const cleaned = [];   // { file, cuts, strips }
  const blocked = [];   // { file, reason, cuts, strips }
  const flagged = [];   // { file, flags }
  const changedPaths = [];

  for (const file of files) {
    const raw = readFileSync(join(POSTS_DIR, file), 'utf-8');
    const s = splitFm(raw);
    if (!s) continue;
    const r = analyzeContent(s.body);
    if (r.flags.length) flagged.push({ file, flags: r.flags });

    const hasChange = r.cuts.length || r.linkStrips.length;
    if (!hasChange) continue;

    if (r.blocked) {
      blocked.push({ file, reason: r.reason, cuts: r.cuts, strips: r.linkStrips });
      continue; // nao mutila: deixa para revisao manual
    }
    cleaned.push({ file, cuts: r.cuts, strips: r.linkStrips });
    if (!DRY) writeFileSync(join(POSTS_DIR, file), s.fm + r.cleaned);
    changedPaths.push(`src/content/posts/${file}`);
  }

  // Relatorio
  let md = `# 🛡️ Fact Firewall — relatorio anti-alucinacao\n\n`;
  md += `**Gerado em:** ${new Date().toISOString()}\n`;
  md += `**Posts:** ${files.length} · limpos: ${cleaned.length} · bloqueados p/ revisao: ${blocked.length} · com flags: ${flagged.length}\n\n`;
  if (cleaned.length) {
    md += `## ✂️ Cortes aplicados (citacao/estatistica sem fonte confiavel)\n`;
    for (const c of cleaned) {
      md += `\n**${c.file}**\n`;
      for (const x of c.cuts) md += `- cortado: _${x.slice(0, 200)}_\n`;
      for (const x of c.strips) md += `- link removido: ${x.url}\n`;
    }
  }
  if (blocked.length) {
    md += `\n## ⛔ Bloqueados (limpeza mutilaria o post — REVISAR MANUALMENTE)\n`;
    for (const b of blocked) { md += `\n**${b.file}** (${b.reason})\n`; for (const x of b.cuts) md += `- suspeito: _${x.slice(0, 200)}_\n`; }
  }
  if (flagged.length) {
    md += `\n## ⚠️ Flags (atribuicao a fonte sem link — verificar/linkar ou cortar)\n`;
    for (const f of flagged) { md += `\n**${f.file}**\n`; for (const x of f.flags.slice(0, 6)) md += `- _${x.slice(0, 200)}_\n`; }
  }
  if (!cleaned.length && !blocked.length && !flagged.length) md += `_Nenhum problema detectado. ✅_\n`;

  if (!DRY) {
    if (!existsSync(PRESS_DIR)) mkdirSync(PRESS_DIR, { recursive: true });
    writeFileSync(REPORT, md);
  }

  console.log(`🛡️ Fact Firewall: ${cleaned.length} post(s) limpo(s), ${blocked.length} bloqueado(s) p/ revisao, ${flagged.length} com flags.`);
  for (const c of cleaned) console.log(`   ✂️ ${c.file}: ${c.cuts.length} corte(s), ${c.strips.length} link(s)`);
  for (const b of blocked) console.log(`   ⛔ ${b.file}: ${b.reason}`);

  if (DRY) { console.log('   [dry-run] nada escrito/commitado.'); return; }
  if (NO_COMMIT) { console.log('   [no-commit] arquivos escritos, sem commit.'); return; }

  const toCommit = [...changedPaths, 'press/fact-guard.md'];
  try {
    execSync(`git add ${toCommit.map(p => `"${p}"`).join(' ')}`, { stdio: 'pipe' });
    const staged = execSync('git diff --cached --name-only', { stdio: 'pipe' }).toString().trim();
    if (staged) {
      execSync(`git -c commit.gpgsign=false commit -m "content(fact-guard): remover ${cleaned.reduce((s, c) => s + c.cuts.length, 0)} citacao(oes) sem fonte + relatorio [bot]"`, { stdio: 'pipe' });
      console.log('   ✅ commit criado.');
    } else console.log('   Nada para commitar.');
  } catch (e) {
    console.log('   ⚠️ commit falhou:', (e.stderr || e.message || '').toString().slice(-200));
  }
}

main();
