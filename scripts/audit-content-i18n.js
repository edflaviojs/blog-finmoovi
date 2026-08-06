#!/usr/bin/env node
/**
 * audit-content-i18n.js
 *
 * Scans EN and ES posts + glossary files and reports content quality issues
 * related to Brazilian Portuguese content that was not properly translated.
 *
 * Checks: currency symbols (R$), BR institution references, BR product names,
 * geographic BR references, and PT words in EN files.
 *
 * Usage: node scripts/audit-content-i18n.js
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, basename, resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

// --- Configuration ---

const DIRS_TO_SCAN = [
  { path: join(ROOT, 'src/content/posts'), label: 'posts' },
  { path: join(ROOT, 'src/content/glossario'), label: 'glossario' },
];

const BR_INSTITUTIONS = [
  'Receita Federal',
  'Serasa',
  'SPC',
  'IBGE',
  'Banco Central do Brasil',
  'BCB',
];

const BR_PRODUCTS = [
  'Tesouro Direto',
  'CDB',
  'CDI',
  'FGTS',
  'IPVA',
  'IPTU',
  'Selic',
];

const GEO_BR_REFS = [
  'no Brasil',
  'brasileiros',
  'brasileiro',
  'brasileiras',
  'no mercado brasileiro',
  'economia brasileira',
];

const PT_WORDS = [
  'voce', 'tambem', 'nao', 'sao', 'porque',
  'quando', 'onde', 'pode', 'mais', 'muito', 'como',
];

// ─────────────────────────────────────────────────────────────────────────────
// Acrescentado em 06/08/2026. Motivo medido: 20 ficheiros dados como severidade
// 0 tinham termo brasileiro visível que o detector nunca procurava — entre eles
// "It's a complement to the INSS retirement" (en-private-pension.md) e "like
// Nubank or Magazine Luiza" (en-bolsa-de-valores.md).
//
// REGRA DA CASA: nada entra aqui sem estar também em
// src/scripts/lib/translation-prompt.js. Punir o que o prompt não manda adaptar
// é ensinar o atalho ao modelo — o teste tests/audit-content-i18n.test.js
// reprova se as duas listas se separarem.
// ─────────────────────────────────────────────────────────────────────────────

// Marcas brasileiras. Nomear uma empresa brasileira como exemplo num texto EN/ES
// é o defeito mais visível que restava depois de o R$ estar arrumado.
const BR_BRANDS = [
  'Nubank',
  'Itaú',
  'Bradesco',
  'Banco do Brasil',
  'Caixa Econômica',
  'Magazine Luiza',
  'XP Investimentos',
  'PicPay',
  'Mercado Pago',
];

// Siglas. Casadas por PALAVRA INTEIRA, ao contrário das listas antigas acima,
// que casam por pedaço de texto. Sem isso 'Pix' apanhava "Pixel" e 'LCA'
// apanhava qualquer palavra que a contivesse. O `s?` do matcher cobre o plural
// que aparece a sério no corpus ("LTNs", "NTNs" em en-tesouro-direto.md).
const BR_ACRONYMS = [
  'INSS',
  'IPCA',
  'PGBL',
  'VGBL',
  'LCI',
  'LCA',
  'LTN',
  'NTN',
  'Pix',
  'B3',
  'Bovespa',
  'CVM',
  'ANBIMA',
  'SUSEP',
  'CPF',
  'CNPJ',
];

// Palavras portuguesas que sobram no texto JÁ adaptado.
//
// Diferente de PT_WORDS: aquela lista só dispara com 5+ palavras distintas e
// serve para apanhar "o corpo inteiro ficou em português". Estas contam UMA A
// UMA, porque uma só já é defeito visível — em 06/08/2026, "the market for
// [ações]" e "the [valor] of your stock" estavam numa página dada como limpa.
//
// Só entram palavras que NÃO são espanholas: o mesmo detector corre em ficheiros
// es-, e 'deuda'/'ahorro'/'acciones' são o certo lá.
const PT_LEFTOVERS = [
  'ações',
  'ação',
  'dívida',
  'dívidas',
  'poupança',
  'reais',
  'investimentos',
];

// 'valor' é espanhol legítimo ("el valor de tu inversión"). Só é defeito em
// texto inglês, onde devia ser "value".
const PT_LEFTOVERS_EN_ONLY = ['valor'];

// Exportadas para tests/audit-content-i18n.test.js poder cruzar cada termo
// castigado aqui com o que src/scripts/lib/translation-prompt.js manda adaptar.
export {
  BR_INSTITUTIONS,
  BR_PRODUCTS,
  BR_BRANDS,
  BR_ACRONYMS,
  GEO_BR_REFS,
  PT_LEFTOVERS,
  PT_LEFTOVERS_EN_ONLY,
};

// --- Helper Functions ---

/**
 * Extracts the body content after the closing `---` of frontmatter.
 * @param {string} content - Full file content
 * @returns {string} Body text after frontmatter
 */
function extractBody(content) {
  const lines = content.split('\n');
  let dashCount = 0;
  let bodyStartIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      dashCount++;
      if (dashCount === 2) {
        bodyStartIndex = i + 1;
        break;
      }
    }
  }

  return lines.slice(bodyStartIndex).join('\n');
}

/**
 * Counts occurrences of a pattern in text (case-sensitive).
 * @param {string} text - Text to search
 * @param {string} term - Term to find
 * @returns {number} Count of occurrences
 */
function countOccurrences(text, term) {
  const regex = new RegExp(escapeRegex(term), 'g');
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

/**
 * Counts occurrences of a word-boundary pattern (case-insensitive).
 * Used for PT words detection to avoid false positives in longer words.
 * @param {string} text - Text to search
 * @param {string} word - Word to find
 * @returns {number} Count of occurrences
 */
function countWordOccurrences(text, word) {
  const regex = new RegExp(`\\b${escapeRegex(word)}\\b`, 'gi');
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

/**
 * Escapes special regex characters in a string.
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Counts occurrences of a term ignoring case (substring, like countOccurrences).
 *
 * Usado só nas marcas. Hoje o corpus escreve-as sempre capitalizadas (medido em
 * 06/08/2026: 0 ocorrências em minúsculas), mas quem escreve o texto é um LLM e
 * "nubank" em minúsculas passaria despercebido à versão case-sensitive.
 *
 * NÃO se usa \b aqui: "Itaú" acaba em vogal acentuada, que o \b do JavaScript
 * não considera caractere de palavra — `\bItaús?\b` nunca casaria com "Itaú ".
 *
 * @param {string} text - Text to search
 * @param {string} term - Term to find
 * @returns {number} Count of occurrences
 */
function countOccurrencesCI(text, term) {
  const regex = new RegExp(escapeRegex(term), 'gi');
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

/**
 * Counts occurrences of an acronym as a whole word, tolerating a plural 's'.
 * @param {string} text - Text to search
 * @param {string} sigla - Acronym to find (e.g. 'LTN' also matches 'LTNs')
 * @returns {number} Count of occurrences
 */
function countAcronymOccurrences(text, sigla) {
  const regex = new RegExp(`\\b${escapeRegex(sigla)}s?\\b`, 'gi');
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

/**
 * Extracts the raw frontmatter block (between the first two `---` lines).
 * @param {string} content - Full file content
 * @returns {string} Frontmatter text, or '' if absent
 */
function extractFrontmatter(content) {
  const lines = content.split('\n');
  let dashCount = 0;
  const recolhidas = [];

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      dashCount++;
      if (dashCount === 2) break;
      continue;
    }
    if (dashCount === 1) recolhidas.push(lines[i]);
  }

  return dashCount === 2 ? recolhidas.join('\n') : '';
}

/**
 * O assunto declarado da página: o `title:` dos posts e o `term:` dos verbetes
 * do glossário (en-private-pension.md, por exemplo, não tem `title:` nenhum).
 *
 * Serve para isentar termos: um termo brasileiro NO TÍTULO quer dizer que a
 * página É SOBRE ele, e adaptá-lo destruía o artigo — "PIX vs TED: Which One Is
 * Worth It in 2026?" ficaria "instant transfers vs instant transfers".
 *
 * Só o título isenta. O mesmo termo solto no corpo continua a ser defeito, e é
 * por isso que en-tesouro-direto.md — que se chama "Government Bonds" no título
 * — NÃO fica isento do LTN/NTN que tem no corpo.
 *
 * @param {string} content - Full file content
 * @returns {string} Texto do assunto (title e/ou term), ou '' se não houver
 */
function assuntoDaPagina(content) {
  const fm = extractFrontmatter(content);
  const campos = [];
  for (const key of ['title', 'term']) {
    const m = fm.match(new RegExp(`^${key}:\\s*['"]?(.+?)['"]?\\s*$`, 'm'));
    if (m) campos.push(m[1]);
  }
  return campos.join(' | ');
}

/**
 * Calculates severity score based on issues found.
 * @param {object} issues - Issues object
 * @param {boolean} isEN - Whether the file is EN locale
 * @returns {number} Severity: 0=clean, 1=minor, 2=moderate, 3=severe
 */
function calculateSeverity(issues, isEN) {
  const {
    currency, brInstitutions, brProducts, geoRefs, ptWordsCount,
    brBrands = [], brAcronyms = [], ptLeftovers = [],
  } = issues;

  // Severity 3: body appears to be in wrong language
  if (isEN && ptWordsCount >= 5) return 3;

  const totalCurrency = currency;
  // As três listas novas (06/08/2026) pesam o MESMO que as antigas: cada termo
  // distinto conta uma referência. Assim uma página com "INSS" + "PGBL" + "VGBL"
  // chega a severidade 2 e volta à fila, que é o caso de en-private-pension.md.
  const totalBrRefs =
    brInstitutions.length + brProducts.length + geoRefs.length +
    brBrands.length + brAcronyms.length + ptLeftovers.length;

  // Severity 3: 6+ R$ occurrences
  if (totalCurrency >= 6) return 3;

  // Severity 2: 3-5 R$ or 2+ BR references
  if (totalCurrency >= 3 || totalBrRefs >= 2) return 2;

  // Severity 1: 1-2 R$ or 1 BR reference
  if (totalCurrency >= 1 || totalBrRefs >= 1) return 1;

  // Severity 0: clean
  return 0;
}

// --- Main Scan Logic ---

/**
 * Analisa o conteúdo de um ficheiro EN/ES e devolve a mesma entrada que vai para
 * audit-content-results.json.
 *
 * Função PURA (não toca no disco) para o robô do lote a poder chamar em memória
 * logo depois de escrever, e para o teste a poder correr sem ficheiros. É essa
 * re-medição que resolve o defeito de 06/08/2026: antes, o robô escrevia e
 * marcava "feito" sem nunca conferir se a adaptação tinha funcionado.
 *
 * @param {string} fileName - Nome do ficheiro (define o locale: en- ou es-)
 * @param {string} content - Conteúdo completo do ficheiro, com frontmatter
 * @param {string} [dir='posts'] - Etiqueta da pasta ('posts' ou 'glossario')
 * @returns {{file: string, dir: string, severity: number, issues: object}}
 */
export function analisarConteudo(fileName, content, dir = 'posts') {
  const isEN = fileName.startsWith('en-');
  const body = extractBody(content);

  // O assunto declarado da página isenta os termos que ele próprio nomeia — ver
  // assuntoDaPagina() acima. Usa-se o MESMO matcher da detecção em cada lista,
  // para "está no título" querer dizer exactamente o mesmo que "está no corpo".
  const assunto = assuntoDaPagina(content);

  // 1. Currency issues: count R$
  // Sem isenção: uma página pode ser sobre o real brasileiro e mesmo assim os
  // valores em R$ do corpo precisam de equivalente internacional.
  const currency = countOccurrences(body, 'R$');

  // 2. BR institution references
  const brInstitutions = BR_INSTITUTIONS.filter(
    (inst) => countOccurrences(body, inst) > 0 && countOccurrences(assunto, inst) === 0
  );

  // 3. BR product names (context-aware)
  const brProducts = BR_PRODUCTS.filter((product) => {
    const count = countOccurrences(body, product);
    if (count === 0) return false;
    if (countOccurrences(assunto, product) > 0) return false;
    // For CDB/CDI/Selic: only flag if used without explanation context
    // Simple heuristic: if the term appears but the file is EN, flag it
    if (['CDB', 'CDI', 'Selic'].includes(product)) {
      // Check if there's an explanation nearby (e.g., "CDB (Certificate of...")
      const hasExplanation = body.includes(`${product} (`) || body.includes(`${product} is `);
      return !hasExplanation;
    }
    return true;
  });

  // 4. Geographic BR references
  const geoRefs = GEO_BR_REFS.filter(
    (ref) => countOccurrences(body, ref) > 0 && countOccurrences(assunto, ref) === 0
  );

  // 5. PT words in body (EN files only)
  let ptWordsCount = 0;
  if (isEN) {
    let ptWordsFound = 0;
    for (const word of PT_WORDS) {
      if (countWordOccurrences(body, word) > 0) {
        ptWordsFound++;
      }
    }
    // Only count if 5+ distinct PT words appear
    ptWordsCount = ptWordsFound >= 5 ? ptWordsFound : 0;
  }

  // 6. Marcas brasileiras dadas como exemplo (06/08/2026)
  const brBrands = BR_BRANDS.filter(
    (marca) => countOccurrencesCI(body, marca) > 0 && countOccurrencesCI(assunto, marca) === 0
  );

  // 7. Siglas brasileiras, por palavra inteira (06/08/2026)
  const brAcronyms = BR_ACRONYMS.filter(
    (sigla) =>
      countAcronymOccurrences(body, sigla) > 0 &&
      countAcronymOccurrences(assunto, sigla) === 0
  );

  // 8. Palavras portuguesas que sobraram no texto adaptado (06/08/2026)
  const leftoversAplicaveis = isEN
    ? [...PT_LEFTOVERS, ...PT_LEFTOVERS_EN_ONLY]
    : PT_LEFTOVERS;
  const ptLeftovers = leftoversAplicaveis.filter(
    (palavra) =>
      countWordOccurrences(body, palavra) > 0 &&
      countWordOccurrences(assunto, palavra) === 0
  );

  const issues = {
    currency, brInstitutions, brProducts, geoRefs, ptWordsCount,
    brBrands, brAcronyms, ptLeftovers,
  };
  const severity = calculateSeverity(issues, isEN);

  return {
    file: fileName,
    dir,
    severity,
    issues,
  };
}

function scanFile(filePath, dir) {
  const fileName = basename(filePath);
  const content = readFileSync(filePath, 'utf-8');
  return analisarConteudo(fileName, content, dir);
}

function main() {
  const results = [];

  for (const { path: dirPath, label } of DIRS_TO_SCAN) {
    let files;
    try {
      files = readdirSync(dirPath);
    } catch {
      console.warn(`[WARN] Directory not found: ${dirPath}`);
      continue;
    }

    const targetFiles = files.filter(
      (f) => f.endsWith('.md') && (f.startsWith('en-') || f.startsWith('es-'))
    );

    for (const file of targetFiles) {
      const filePath = join(dirPath, file);
      const result = scanFile(filePath, label);
      results.push(result);
    }
  }

  // Sort by severity descending, then file name
  results.sort((a, b) => b.severity - a.severity || a.file.localeCompare(b.file));

  // --- Summary ---
  const total = results.length;
  const clean = results.filter((r) => r.severity === 0).length;
  const minor = results.filter((r) => r.severity === 1).length;
  const moderate = results.filter((r) => r.severity === 2).length;
  const severe = results.filter((r) => r.severity === 3).length;

  console.log('\n=== AUDIT CONTENT i18n ===\n');
  console.log('Summary:');
  console.log(`  Total files scanned: ${total}`);
  console.log(`  Clean (severity 0):  ${clean}`);
  console.log(`  Minor (severity 1):  ${minor}`);
  console.log(`  Moderate (severity 2): ${moderate}`);
  console.log(`  Severe (severity 3):  ${severe}`);
  console.log('');

  // --- Top 20 Worst Offenders ---
  const worst = results.filter((r) => r.severity > 0).slice(0, 20);
  if (worst.length > 0) {
    console.log('TOP 20 WORST OFFENDERS:');
    console.log('-'.repeat(90));
    console.log(
      'File'.padEnd(60) +
      'Dir'.padEnd(12) +
      'Sev'.padEnd(5) +
      'R$'.padEnd(5) +
      'Issues'
    );
    console.log('-'.repeat(90));

    for (const r of worst) {
      const issueDetails = [];
      if (r.issues.currency > 0) issueDetails.push(`R$:${r.issues.currency}`);
      if (r.issues.brInstitutions.length > 0) issueDetails.push(`inst:[${r.issues.brInstitutions.join(',')}]`);
      if (r.issues.brProducts.length > 0) issueDetails.push(`prod:[${r.issues.brProducts.join(',')}]`);
      if (r.issues.geoRefs.length > 0) issueDetails.push(`geo:[${r.issues.geoRefs.join(',')}]`);
      if (r.issues.ptWordsCount > 0) issueDetails.push(`ptWords:${r.issues.ptWordsCount}`);
      if (r.issues.brBrands?.length > 0) issueDetails.push(`marca:[${r.issues.brBrands.join(',')}]`);
      if (r.issues.brAcronyms?.length > 0) issueDetails.push(`sigla:[${r.issues.brAcronyms.join(',')}]`);
      if (r.issues.ptLeftovers?.length > 0) issueDetails.push(`pt:[${r.issues.ptLeftovers.join(',')}]`);

      console.log(
        r.file.substring(0, 58).padEnd(60) +
        r.dir.padEnd(12) +
        String(r.severity).padEnd(5) +
        String(r.issues.currency).padEnd(5) +
        issueDetails.join(' | ')
      );
    }
    console.log('-'.repeat(90));
  } else {
    console.log('No issues found! All files are clean.');
  }

  // --- Write detailed JSON results ---
  const outputPath = join(__dirname, 'audit-content-results.json');
  writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`\nDetailed results written to: ${outputPath}`);
}

// Só varre o corpus quando é chamado como comando. Sem esta guarda, importar
// analisarConteudo() a partir do robô do lote (ou do teste) varreria os 336
// ficheiros e reescreveria audit-content-results.json como efeito colateral.
if (process.argv[1] && resolve(process.argv[1]) === resolve(__filename)) {
  main();
}
