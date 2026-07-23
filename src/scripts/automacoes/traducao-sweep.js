/**
 * traducao-sweep.js — AUTOCURA semanal de traduções (camada 3 do lang-guard)
 *
 * Varre TODOS os arquivos "en-" e "es-" de posts E glossário, roda o lang-guard
 * (mesma heurística central de src/scripts/lib/lang-guard.js) e RE-TRADUZ os
 * corpos reprovados pelo MESMO caminho do traduzir-glossario.js (importa o
 * translateBody de lá — fonte única do prompt de tradução de body).
 *
 * Regras:
 *   - Só reescreve o arquivo quando a NOVA tradução passa no lang-guard
 *     (1 retry por arquivo); senão mantém o original e reporta.
 *   - Sleep 10s entre chamadas (15s após erro) — mesmo ritmo do
 *     traduzir-glossario.js para respeitar TPM do Groq.
 *   - Nunca falha o job por arquivo individual; sai 1 só em erro estrutural.
 *   - Reporta reprovados/corrigidos no GITHUB_STEP_SUMMARY.
 *
 * Executado por .github/workflows/traducao-sweep.yml (cron semanal segunda
 * 5h UTC + workflow_dispatch). O commit/push fica com o workflow.
 */

import { looksWrongLanguage } from '../lib/lang-guard.js';
import { translateBody } from './traduzir-glossario.js';
import { readdirSync, readFileSync, writeFileSync, existsSync, appendFileSync } from 'fs';
import { join } from 'path';

const DIRS = [
  { dir: join(process.cwd(), 'src', 'content', 'posts'), label: 'posts' },
  { dir: join(process.cwd(), 'src', 'content', 'glossario'), label: 'glossario' },
];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function parseFile(raw) {
  const parts = raw.split('---');
  if (parts.length < 3) return null;
  return {
    frontmatter: parts[1],
    body: parts.slice(2).join('---').trim(),
  };
}

/** Nome legível para o prompt de tradução (term do glossário ou title do post). */
function displayName(frontmatter, file) {
  const term = frontmatter.match(/term:\s*"([^"]+)"/);
  if (term) return term[1];
  const title = frontmatter.match(/title:\s*"([^"]+)"/);
  if (title) return title[1];
  return file.replace(/^(en-|es-)/, '').replace(/\.md$/, '');
}

async function main() {
  console.log('🧹 Sweep de traduções (lang-guard) — varrendo posts + glossário...\n');

  // ── Fase 1: scan completo (barato, só regex) ──
  const suspects = [];
  let scanned = 0;
  for (const { dir, label } of DIRS) {
    if (!existsSync(dir)) continue;
    const files = readdirSync(dir).filter(f => /^(en|es)-.+\.md$/.test(f));
    for (const file of files) {
      scanned++;
      const raw = readFileSync(join(dir, file), 'utf-8');
      const parsed = parseFile(raw);
      if (!parsed) continue;
      const locale = file.startsWith('en-') ? 'en' : 'es';
      const check = looksWrongLanguage(parsed.body, locale);
      if (check.wrong) {
        suspects.push({ dir, label, file, locale, reason: check.reason });
        console.log(`  🚩 ${label}/${file} — ${check.reason}`);
      }
    }
  }
  console.log(`\n📊 Scan: ${scanned} arquivos EN/ES verificados, ${suspects.length} reprovado(s).\n`);

  // ── Fase 2: re-tradução dos reprovados (mesmo caminho do traduzir-glossario) ──
  let fixed = 0;
  const stillFailing = [];
  for (const s of suspects) {
    const filePath = join(s.dir, s.file);
    const raw = readFileSync(filePath, 'utf-8');
    const parsed = parseFile(raw);
    if (!parsed) { stillFailing.push({ ...s, reason: 'frontmatter ilegível' }); continue; }
    const name = displayName(parsed.frontmatter, s.file);

    let ok = false;
    for (let attempt = 1; attempt <= 2 && !ok; attempt++) {
      try {
        console.log(`📝 ${s.locale.toUpperCase()}: ${s.label}/${s.file} (tentativa ${attempt}/2)...`);
        const translated = await translateBody(parsed.body, name, s.locale);
        const recheck = looksWrongLanguage(translated, s.locale);
        if (!recheck.wrong) {
          const newContent = '---' + parsed.frontmatter + '---\n\n' + translated + '\n';
          writeFileSync(filePath, newContent, 'utf-8');
          fixed++;
          ok = true;
          console.log(`  ✅ corrigido`);
        } else {
          console.log(`  ⚠️ nova tradução ainda reprovou (${recheck.reason})`);
          if (attempt === 2) stillFailing.push({ ...s, reason: `re-tradução reprovou 2x (${recheck.reason})` });
        }
        await sleep(10000); // rate limit — mesmo ritmo do traduzir-glossario.js
      } catch (err) {
        console.error(`  ❌ ${s.file}: ${err.message}`);
        if (attempt === 2) stillFailing.push({ ...s, reason: `erro na tradução (${err.message})` });
        await sleep(15000); // espera maior após erro (rate limit)
      }
    }
  }

  // ── Relatório ──
  console.log(`\n📊 Resultado: ${suspects.length} reprovado(s), ${fixed} corrigido(s), ${stillFailing.length} ainda pendente(s).`);
  for (const f of stillFailing) {
    console.log(`::warning::tradução suspeita NÃO corrigida: ${f.label}/${f.file} — ${f.reason}`);
  }

  if (process.env.GITHUB_STEP_SUMMARY) {
    try {
      let md = `## 🧹 Sweep de traduções (lang-guard)\n\n`;
      md += `- Arquivos EN/ES verificados: **${scanned}**\n`;
      md += `- Reprovados no scan: **${suspects.length}**\n`;
      md += `- Corrigidos (re-traduzidos): **${fixed}**\n`;
      md += `- Ainda pendentes: **${stillFailing.length}**\n`;
      if (suspects.length > 0) {
        md += `\n### Reprovados\n`;
        for (const s of suspects) md += `- \`${s.label}/${s.file}\` — ${s.reason}\n`;
      }
      if (stillFailing.length > 0) {
        md += `\n### ⚠️ Não corrigidos (checar manualmente / próximo sweep)\n`;
        for (const f of stillFailing) md += `- \`${f.label}/${f.file}\` — ${f.reason}\n`;
      }
      appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n');
    } catch { /* summary é best-effort */ }
  }
}

main().catch(err => { console.error('❌ traducao-sweep:', err.message); process.exit(1); });
