/**
 * validate-slug-language.js — Valida que slugs de arquivos EN/ES não contêm
 * palavras portuguesas (resíduo de tradução).
 *
 * Espelha a lógica do gate em `.github/workflows/i18n-gate.yml`, porém com
 * listas mais completas e detecção por TOKEN EXATO (não substring), evitando
 * falsos positivos como "caro" dentro de "cartao".
 *
 * Escaneia `src/content/posts/` e `src/content/glossario/`, considerando apenas
 * arquivos que começam com `en-` ou `es-` e terminam em `.md`. Para cada arquivo,
 * o corpo do slug (nome sem o prefixo de locale e sem `.md`) é tokenizado por `-`
 * e cada token é comparado (===) contra a lista aplicável ao locale.
 *
 * Regras por locale:
 *   - Arquivo `en-`: flag se qualquer token ∈ (PT_ONLY ∪ SHARED_PT_ES).
 *   - Arquivo `es-`: flag se qualquer token ∈ PT_ONLY apenas.
 *
 * Bloqueia (exit 1) se encontrar qualquer ocorrência; exit 0 se limpo.
 *
 * Uso: node scripts/validate-slug-language.js
 * Script puro — apenas `fs`/`path`, sem dependências externas.
 */

import { readdirSync, existsSync } from 'fs';
import { join } from 'path';

const CONTENT_DIRS = [
  join(process.cwd(), 'src', 'content', 'posts'),
  join(process.cwd(), 'src', 'content', 'glossario'),
];

/**
 * Palavras português-exclusivas (NÃO válidas em espanhol).
 * Sinalizadas tanto para arquivos EN quanto ES.
 */
const PT_ONLY = new Set([
  'acoes', 'amortizacao', 'alavancagem', 'aplicacao', 'aplicacoes', 'poupanca',
  'divida', 'dividas', 'diversificacao', 'juros', 'imposto', 'impostos',
  'aposentadoria', 'investimento', 'investimentos', 'dinheiro', 'planejamento',
  'educacao', 'inflacao', 'quitacao', 'previdencia', 'orcamento', 'cartao',
  'cartoes', 'voce', 'financeiro', 'financeira', 'financas', 'economizar',
  'presentear', 'ferias', 'namorados', 'planilha',
  'revisao', 'renda', 'fundos', 'imobiliarios',
  'lucro', 'margem', 'volatilidade', 'preco', 'reducao', 'financiamento',
  'dicas', 'economize', 'poupar',
]);

/**
 * Palavras que existem em PT e ES (compartilhadas).
 * Sinalizadas SOMENTE para arquivos EN (em ES são válidas).
 */
const SHARED_PT_ES = new Set([
  'para', 'como', 'nas', 'nos', 'sem', 'mais', 'sua', 'seu', 'quando', 'onde',
  'entre', 'pelo', 'pela',
  // Verbos/gerúndios idênticos em PT e ES (sem acento) — válidos em espanhol,
  // portanto só sinalizados em arquivos EN.
  'reorganizar', 'gastando', 'estrategias', 'montando',
]);

/**
 * Slugs BR-only intencionais: conceitos/gírias brasileiras sem equivalente
 * internacional (decisão editorial). NÃO são sinalizados. Comparação pelo
 * corpo do slug completo (sem prefixo de locale).
 */
const BR_ONLY_ALLOWLIST = new Set([
  'xepa-financeira',
]);

/**
 * Coleta os arquivos EN/ES `.md` de um diretório de conteúdo.
 * @param {string} dir Caminho absoluto do diretório.
 * @returns {string[]} Nomes de arquivo (basename) que começam com en-/es- e terminam em .md.
 */
function collectLocaleFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => name.endsWith('.md') && (name.startsWith('en-') || name.startsWith('es-')));
}

/**
 * Extrai o locale e os tokens do corpo do slug de um nome de arquivo.
 * @param {string} fileName Nome do arquivo (ex: "en-renda-fixa.md").
 * @returns {{ locale: 'en'|'es', tokens: string[] }}
 */
function parseSlug(fileName) {
  const locale = fileName.startsWith('en-') ? 'en' : 'es';
  const slugBody = fileName.slice(3, -3); // remove "en-"/"es-" e ".md"
  const tokens = slugBody.split('-').filter(Boolean);
  return { locale, tokens };
}

/**
 * Retorna os tokens PT detectados para o locale informado.
 * @param {'en'|'es'} locale
 * @param {string[]} tokens
 * @returns {string[]} Tokens que casam com a lista aplicável.
 */
function findPtTokens(locale, tokens) {
  return tokens.filter((token) => {
    if (PT_ONLY.has(token)) return true;
    if (locale === 'en' && SHARED_PT_ES.has(token)) return true;
    return false;
  });
}

function main() {
  const offenders = [];

  for (const dir of CONTENT_DIRS) {
    for (const fileName of collectLocaleFiles(dir)) {
      const { locale, tokens } = parseSlug(fileName);
      // Slugs BR-only intencionais são ignorados (decisão editorial).
      if (BR_ONLY_ALLOWLIST.has(tokens.join('-'))) continue;
      const ptTokens = findPtTokens(locale, tokens);
      if (ptTokens.length > 0) {
        offenders.push({ fileName, ptTokens });
      }
    }
  }

  if (offenders.length > 0) {
    for (const { fileName, ptTokens } of offenders) {
      console.log(`❌ ${fileName} — slug contém PT: [${ptTokens.join(', ')}]`);
    }
    console.log(`\n⚠️ ${offenders.length} arquivo(s) EN/ES com palavra(s) PT no slug.`);
    console.log('Slugs devem ser derivados do título traduzido (createSlug(translatedTitle)).');
    process.exit(1);
  }

  console.log('✅ Slugs OK — nenhum arquivo EN/ES com palavra PT no slug.');
  process.exit(0);
}

main();
