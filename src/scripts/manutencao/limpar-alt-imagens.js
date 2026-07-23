/**
 * Script one-off: limpar links markdown presos dentro do ALT de imagens.
 * Ex.: ![Criando um [Orçamento](/posts/x) mensal](/images/y.webp)
 *   -> ![Criando um Orçamento mensal](/images/y.webp)
 *
 * - Processa posts E glossário (pt, en-, es-).
 * - Só altera o texto do ALT; caminho da imagem e resto do arquivo intactos.
 * - Usa parser de colchetes balanceados (aguenta aninhamento no ALT).
 *
 * Uso:
 *   node src/scripts/manutencao/limpar-alt-imagens.js --dry-run   (só relata)
 *   node src/scripts/manutencao/limpar-alt-imagens.js             (aplica)
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const DRY_RUN = process.argv.includes('--dry-run');

const DIRS = [
  join(process.cwd(), 'src', 'content', 'posts'),
  join(process.cwd(), 'src', 'content', 'glossario'),
];

const LINK_RE = /\[([^[\]]*)\]\(([^()\s]*)\)/g;

/**
 * Encontra a próxima imagem markdown a partir de `start`.
 * Retorna { altStart, altEnd, alt } ou null.
 * altStart/altEnd delimitam o conteúdo do ALT (sem os colchetes).
 */
function nextImage(content, start) {
  const open = content.indexOf('![', start);
  if (open === -1) return null;

  // Percorre com profundidade de colchetes para achar o ] que fecha o ALT
  let depth = 1;
  let i = open + 2;
  while (i < content.length && depth > 0) {
    const ch = content[i];
    if (ch === '[') depth++;
    else if (ch === ']') depth--;
    else if (ch === '\n' && content[i + 1] === '\n') break; // ALT não cruza parágrafo
    i++;
  }
  if (depth !== 0) return { skipTo: open + 2 }; // malformado; segue adiante

  const altEnd = i - 1; // posição do ] que fechou
  if (content[i] !== '(') return { skipTo: open + 2 }; // não é imagem completa

  return { altStart: open + 2, altEnd, alt: content.slice(open + 2, altEnd) };
}

/** Remove links markdown do ALT, mantendo só o texto. Iterativo p/ aninhados. */
function cleanAlt(alt) {
  let prev;
  let out = alt;
  do {
    prev = out;
    out = out.replace(LINK_RE, '$1');
  } while (out !== prev);
  return out;
}

function processFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  let result = '';
  let cursor = 0;
  let fixes = 0;

  let pos = 0;
  for (;;) {
    const img = nextImage(content, pos);
    if (!img) break;
    if (img.skipTo !== undefined) {
      pos = img.skipTo;
      continue;
    }
    const cleaned = cleanAlt(img.alt);
    if (cleaned !== img.alt) {
      result += content.slice(cursor, img.altStart) + cleaned;
      cursor = img.altEnd;
      fixes++;
    }
    pos = img.altEnd + 1;
  }

  if (fixes === 0) return 0;
  result += content.slice(cursor);
  if (!DRY_RUN) writeFileSync(filePath, result, 'utf-8');
  return fixes;
}

function main() {
  console.log(`🧹 Limpando links dentro de ALT de imagens ${DRY_RUN ? '(DRY-RUN)' : '(APLICANDO)'}\n`);

  let totalFiles = 0;
  let totalFixes = 0;

  for (const dir of DIRS) {
    const files = readdirSync(dir).filter((f) => f.endsWith('.md'));
    for (const file of files) {
      const filePath = join(dir, file);
      const fixes = processFile(filePath);
      if (fixes > 0) {
        totalFiles++;
        totalFixes += fixes;
        console.log(`  ${DRY_RUN ? '🔍' : '✅'} ${file}: ${fixes} alt(s) corrigido(s)`);
      }
    }
  }

  console.log(`\n📊 ${totalFixes} ALT(s) com link em ${totalFiles} arquivo(s)${DRY_RUN ? ' — nada foi alterado (dry-run)' : ''}`);
}

main();
