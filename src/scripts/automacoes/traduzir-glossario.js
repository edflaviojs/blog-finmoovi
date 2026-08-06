/**
 * Script: Traduzir body completo do glossário para EN e ES
 * Executa via GitHub Actions: workflow "Traduzir Glossário"
 * Lê cada arquivo en-*.md e es-*.md, traduz o body via Groq, e salva
 *
 * Uso:
 *   node src/scripts/automacoes/traduzir-glossario.js
 *   node src/scripts/automacoes/traduzir-glossario.js --max-minutes 50
 */

import { generateText } from '../apis/kie-ai.js';
import { looksWrongLanguage } from '../lib/lang-guard.js';
import { writeFileSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';

const GLOSSARIO_DIR = join(process.cwd(), 'src', 'content', 'glossario');

// Teto de TEMPO do próprio script, sempre abaixo do teto do passo no workflow.
//
// Por que isto é necessário aqui: o `timeout-minutes: 60` do workflow está no
// PASSO, não no job. Passo que estoura FALHA, e um passo falhado faz o GitHub
// saltar os seguintes — incluindo o commit. Como este script grava cada ficheiro
// à medida que traduz, estourar o teto significava perder TODAS as traduções já
// escritas em disco. É o mesmo defeito que fez o `gerar-alt-imagens` queimar
// ~50 min/dia durante semanas (ver IMPL24 §ATUALIZAÇÃO 06/08).
//
// E a folga é fina de verdade: 258 verbetes (129 EN + 129 ES) × ~12s de espera
// por chamada ≈ 52 min, contra um teto de 60.
//
// `parseFloat` inválido vira NaN, e qualquer comparação com NaN é false — ou
// seja, o pior caso é comportar-se como se não houvesse teto (o de hoje).
const args = process.argv.slice(2);
const MAX_MINUTES = args.includes('--max-minutes')
  ? parseFloat(args[args.indexOf('--max-minutes') + 1])
  : (process.env.GLOSSARIO_MAX_MINUTES ? parseFloat(process.env.GLOSSARIO_MAX_MINUTES) : Infinity);
const START_MS = Date.now();
const elapsedMin = () => (Date.now() - START_MS) / 60000;

async function translateBody(body, termName, targetLang) {
  const langNames = { en: 'English', es: 'Spanish' };
  const langName = langNames[targetLang];

  const prompt = `
Translate the following financial glossary article body to ${langName}.
This is about the term "${termName}".
Keep all markdown formatting (##, **, -, etc.) intact.
Keep financial acronyms (CDI, ETF, IPCA, CDB, LCI, LCA, IOF, PIX, FGC, B3) as-is.
Keep R$ currency values as-is (they are Brazilian Reais).
Do NOT add any extra text, just translate the content.

Content to translate:
${body}
`;

  const result = await generateText(prompt, { maxTokens: 4000, temperature: 0.2 });
  return result.trim();
}

async function main() {
  console.log('🌐 Traduzindo body completo do glossário...\n');

  // Process EN files
  const enFiles = readdirSync(GLOSSARIO_DIR).filter(f => f.startsWith('en-') && f.endsWith('.md'));
  console.log(`📚 ${enFiles.length} termos EN para traduzir\n`);

  let translated = 0;
  let errors = 0;
  let ranOutOfTime = false;

  for (const file of enFiles) {
    // Teto de tempo: para de forma limpa para o passo de commit acontecer.
    // O script é idempotente (pula o que já está traduzido), então a corrida
    // seguinte retoma exatamente de onde esta parou.
    if (elapsedMin() >= MAX_MINUTES) { ranOutOfTime = true; break; }

    const filePath = join(GLOSSARIO_DIR, file);
    const content = readFileSync(filePath, 'utf-8');

    const parts = content.split('---');
    if (parts.length < 3) continue;

    const frontmatter = parts[1];
    const body = parts.slice(2).join('---').trim();

    // Skip if body is already in English (heurística centralizada no lang-guard)
    if (!looksWrongLanguage(body, 'en').wrong) {
      console.log(`  ⏭️ ${file} - already translated`);
      continue;
    }

    const termMatch = frontmatter.match(/term:\s*"([^"]+)"/);
    const termName = termMatch ? termMatch[1] : file.replace('en-', '').replace('.md', '');

    try {
      console.log(`📝 EN: ${termName}...`);
      const translatedBody = await translateBody(body, termName, 'en');
      const newContent = '---' + frontmatter + '---\n\n' + translatedBody + '\n';
      writeFileSync(filePath, newContent, 'utf-8');
      translated++;
      // Rate limit - wait 10s between calls to avoid Groq TPM limit
      await new Promise(r => setTimeout(r, 10000));
    } catch (err) {
      console.error(`  ❌ ${file}: ${err.message}`);
      errors++;
      // Wait longer on error (rate limit)
      await new Promise(r => setTimeout(r, 15000));
    }
  }

  // Process ES files
  const esFiles = readdirSync(GLOSSARIO_DIR).filter(f => f.startsWith('es-') && f.endsWith('.md'));
  console.log(`\n📚 ${esFiles.length} termos ES para traduzir\n`);

  for (const file of esFiles) {
    if (elapsedMin() >= MAX_MINUTES) { ranOutOfTime = true; break; }

    const filePath = join(GLOSSARIO_DIR, file);
    const content = readFileSync(filePath, 'utf-8');

    const parts = content.split('---');
    if (parts.length < 3) continue;

    const frontmatter = parts[1];
    const body = parts.slice(2).join('---').trim();

    // Skip if body is already in Spanish (heurística centralizada no lang-guard)
    if (!looksWrongLanguage(body, 'es').wrong) {
      console.log(`  ⏭️ ${file} - already translated`);
      continue;
    }

    const termMatch = frontmatter.match(/term:\s*"([^"]+)"/);
    const termName = termMatch ? termMatch[1] : file.replace('es-', '').replace('.md', '');

    try {
      console.log(`📝 ES: ${termName}...`);
      const translatedBody = await translateBody(body, termName, 'es');
      const newContent = '---' + frontmatter + '---\n\n' + translatedBody + '\n';
      writeFileSync(filePath, newContent, 'utf-8');
      translated++;
      // Rate limit - wait 10s between calls to avoid Groq TPM limit
      await new Promise(r => setTimeout(r, 10000));
    } catch (err) {
      console.error(`  ❌ ${file}: ${err.message}`);
      errors++;
      // Wait longer on error (rate limit)
      await new Promise(r => setTimeout(r, 15000));
    }
  }

  if (ranOutOfTime) {
    console.log(`\n⏱️  Teto de ${MAX_MINUTES} min atingido — parando de forma limpa para o commit acontecer.`);
    console.log('   O que já foi traduzido está gravado; a próxima corrida retoma de onde parou.');
  }
  console.log(`\n📊 Resultado: ${translated} traduzidos, ${errors} erros`);
}

// translateBody é reutilizado pelo traducao-sweep.js (autocura semanal) —
// main() só roda quando este arquivo é o entrypoint (não ao ser importado).
export { translateBody };

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) main();
