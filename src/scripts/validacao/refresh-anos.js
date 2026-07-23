/**
 * refresh-anos.js (CLI) — refresh anual de anos defasados em títulos/descrições.
 *
 * Camada para conteúdo EXISTENTE (complementa o year-guard.js, que protege o
 * conteúdo NOVO nos geradores): quando o ano vira, títulos "para 2025" ficam
 * velhos da noite para o dia. Este script varre TODOS os .md de posts e
 * glossário (todos os idiomas) e corrige APENAS o frontmatter `title`,
 * `description` e os espelhos `seo.metaTitle`/`seo.metaDescription`.
 *
 * CORREÇÃO AUTOMÁTICA (conservadora) — só quando o ano defasado (< ano atual)
 * aparece em padrão claramente promocional/temporal:
 *   - "(para|for|em|en|in)( el)? 20xx"        → "Guia para 2025", "Tips for 2025",
 *                                               "[How to Avoid in 2025]"
 *   - "(guia|guide|guía)( prático|...)? 20xx" → "Guia Prático 2025"
 *   - "20xx (guide|guia|guía)"                → "[2025 Guide]"
 *   - "vale a pena em 20xx"
 *   - "20xx: "                                → "2025: como investir"
 *   - ano defasado no FINAL do título — exceto precedido de "de|del|of" ou
 *     "retrospectiva|retrospective" (referência ao passado, ex.: "IPCA de 2024",
 *     "Retrospectiva 2024" → ambíguo, não mexe).
 *
 * CASOS AMBÍGUOS (ano defasado fora desses padrões): NÃO altera — acumula e,
 * se houver GITHUB_TOKEN no env, abre UMA issue no GitHub com checkboxes
 * (deduplicada por título, mesmo padrão do lembrete em scripts/pinterest-publish.js).
 *
 * NUNCA toca em slug, nome de arquivo, corpo do post ou tags.
 * Exit 0 sempre (não é validador bloqueante). Commit/push = workflow.
 *
 * Flags: --dry-run (só relata, não escreve nada).
 */

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { CURRENT_YEAR } from '../lib/year-guard.js';

const CONTENT_DIRS = [
  join(process.cwd(), 'src', 'content', 'posts'),
  join(process.cwd(), 'src', 'content', 'glossario'),
];
const DRY = process.argv.includes('--dry-run');

// Campos de frontmatter que podem ser corrigidos (title/description + espelhos seo).
const FIELDS = ['title', 'description', 'metaTitle', 'metaDescription'];
const FIELD_LINE_RE = new RegExp(`^(\\s*)(${FIELDS.join('|')}):(\\s*)(\\S.*?)(\\s*)$`);

// Padrões promocionais/temporais onde o ano defasado é trocado com segurança.
const PROMO_RES = [
  /\b(?:para|for|em|en|in)(?:\s+el)?\s+(?<year>20\d{2})\b/gi,
  /\b(?:guia|guide|guía)(?:\s+(?:prático|práctica|practical))?(?:\s+(?:para|for))?\s+(?<year>20\d{2})\b/gi,
  /\b(?<year>20\d{2})\s+(?:guide|guia|guía)\b/gi,
  /\bvale a pena em\s+(?<year>20\d{2})\b/gi,
  /\b(?<year>20\d{2}):\s/g,
];
// Ano defasado no FINAL do título — só auto se não for referência ao passado.
const END_TITLE_RE = /(?:(?<prev>\S+)\s+)?(?<year>20\d{2})\s*$/;
const END_TITLE_EXCLUDE = /^(?:de|del|of|retrospectiva|retrospective)$/i;

const STALE_YEAR_RE = /\b20\d{2}\b/g;

function splitFm(raw) {
  const m = raw.match(/^(---\r?\n[\s\S]*?\r?\n---\r?\n?)([\s\S]*)$/);
  return m ? { fm: m[1], body: m[2] } : null;
}

/** Aplica os padrões promocionais a um valor; troca só anos < CURRENT_YEAR. */
function applyPromoPatterns(value) {
  let changed = false;
  let out = value;
  for (const re of PROMO_RES) {
    out = out.replace(re, (match, ...args) => {
      const groups = args[args.length - 1];
      if (Number(groups.year) >= CURRENT_YEAR) return match;
      changed = true;
      return match.replace(groups.year, String(CURRENT_YEAR));
    });
  }
  return { out, changed };
}

/** Ano defasado no final do título (title/metaTitle apenas). */
function applyEndOfTitle(value) {
  const m = value.match(END_TITLE_RE);
  if (!m || !m.groups) return { out: value, changed: false };
  const { prev, year } = m.groups;
  if (Number(year) >= CURRENT_YEAR) return { out: value, changed: false };
  if (prev && END_TITLE_EXCLUDE.test(prev)) return { out: value, changed: false };
  const idx = value.lastIndexOf(year);
  return {
    out: value.slice(0, idx) + String(CURRENT_YEAR) + value.slice(idx + year.length),
    changed: true,
  };
}

function hasStaleYear(value) {
  const years = value.match(STALE_YEAR_RE) || [];
  return years.some(y => Number(y) < CURRENT_YEAR);
}

/**
 * Processa um arquivo. Retorna { newRaw|null, fixes: [], ambiguous: [] }.
 * Só reescreve linhas de frontmatter dos 4 campos — corpo intacto byte a byte.
 */
function processFile(relFile, raw) {
  const s = splitFm(raw);
  const fixes = [];
  const ambiguous = [];
  if (!s) return { newRaw: null, fixes, ambiguous };

  const lines = s.fm.split('\n');
  let fileChanged = false;

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(FIELD_LINE_RE);
    if (!m) continue;
    const [, indent, field, sep, rawValue, trail] = m;

    // Desembrulha aspas simples/duplas (valores neste repo são single-line).
    let quote = '';
    let value = rawValue;
    if (
      (rawValue.startsWith('"') && rawValue.endsWith('"') && rawValue.length >= 2) ||
      (rawValue.startsWith("'") && rawValue.endsWith("'") && rawValue.length >= 2)
    ) {
      quote = rawValue[0];
      value = rawValue.slice(1, -1);
    }
    if (!hasStaleYear(value)) continue;

    const original = value;
    const p1 = applyPromoPatterns(value);
    value = p1.out;
    let changed = p1.changed;
    if (field === 'title' || field === 'metaTitle') {
      const p2 = applyEndOfTitle(value);
      value = p2.out;
      changed = changed || p2.changed;
    }

    if (changed) {
      lines[i] = `${indent}${field}:${sep}${quote}${value}${quote}${trail}`;
      fileChanged = true;
      fixes.push({ file: relFile, field, from: original, to: value });
    }
    // Ano defasado que sobrou fora dos padrões → ambíguo (não mexe).
    if (hasStaleYear(value)) {
      ambiguous.push({ file: relFile, field, value });
    }
  }

  return { newRaw: fileChanged ? lines.join('\n') + s.body : null, fixes, ambiguous };
}

/**
 * Abre UMA issue no GitHub com os casos ambíguos (checkbox por item), no mesmo
 * padrão/endpoint de openRenewalIssueIfNeeded em scripts/pinterest-publish.js.
 * Deduplica por título (prefixo) para não abrir issue repetida a cada execução.
 */
async function openAmbiguousIssueIfNeeded(ambiguous) {
  const ghToken = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY; // ex.: edflaviojs/blog-finmoovi
  if (!ghToken || !repo) return;

  const titlePrefix = '🗓️ Refresh de anos:';
  const title = `${titlePrefix} ${ambiguous.length} títulos precisam de decisão manual`;
  const headers = {
    Authorization: `Bearer ${ghToken}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
  };

  // Já existe issue aberta desse refresh? Então não duplica.
  const existing = await fetch(
    `https://api.github.com/repos/${repo}/issues?state=open&per_page=50`,
    { headers },
  ).then(r => (r.ok ? r.json() : []));
  if (
    Array.isArray(existing) &&
    existing.some(i => typeof i.title === 'string' && i.title.startsWith(titlePrefix))
  ) {
    console.log('   ℹ️ Issue de refresh de anos já aberta — não duplicada.');
    return;
  }

  const body = [
    `O refresh automático de anos (\`src/scripts/validacao/refresh-anos.js\`) encontrou **${ambiguous.length}** campo(s) com ano defasado FORA dos padrões promocionais seguros (ex.: retrospectivas, dados históricos). Nada foi alterado automaticamente — decida caso a caso:`,
    '',
    ...ambiguous.map(a => `- [ ] \`${a.file}\` — \`${a.field}\`: "${a.value}"`),
    '',
    '**Como resolver cada item:**',
    `- Se o ano deve virar ${CURRENT_YEAR}: editar o frontmatter do arquivo (só o campo indicado — NÃO mexer em slug/nome de arquivo/corpo/tags).`,
    '- Se o ano é histórico proposital (retrospectiva, dado de época): marcar o checkbox e deixar como está.',
    '- Ao terminar todos, fechar esta issue.',
  ].join('\n');

  const res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ title, body, labels: ['manutencao'] }),
  });
  if (res.ok) console.log('🔔 Issue de refresh de anos aberta (decisão manual pendente).');
  else console.error(`Aviso: falha ao abrir issue de refresh de anos (${res.status}).`);
}

async function main() {
  const allFixes = [];
  const allAmbiguous = [];
  let filesScanned = 0;
  let filesChanged = 0;

  for (const dir of CONTENT_DIRS) {
    if (!existsSync(dir)) continue;
    const dirName = dir.includes('glossario') ? 'glossario' : 'posts';
    for (const file of readdirSync(dir).filter(f => f.endsWith('.md'))) {
      filesScanned++;
      const full = join(dir, file);
      const raw = readFileSync(full, 'utf-8');
      const relFile = `src/content/${dirName}/${file}`;
      const { newRaw, fixes, ambiguous } = processFile(relFile, raw);
      allFixes.push(...fixes);
      allAmbiguous.push(...ambiguous);
      if (newRaw !== null) {
        filesChanged++;
        if (!DRY) writeFileSync(full, newRaw);
      }
    }
  }

  console.log(
    `🗓️ Refresh de anos (ano atual: ${CURRENT_YEAR}): ${filesScanned} arquivo(s) lidos · ` +
      `${allFixes.length} correção(ões) em ${filesChanged} arquivo(s) · ${allAmbiguous.length} ambíguo(s).`,
  );
  for (const f of allFixes) {
    console.log(`   ✅ ${f.file} [${f.field}]: "${f.from}" → "${f.to}"`);
  }
  for (const a of allAmbiguous) {
    console.log(`   ⚠️ ${a.file} [${a.field}]: "${a.value}" (fora dos padrões — decisão manual)`);
  }
  if (DRY) console.log('   [dry-run] nada escrito.');

  if (allAmbiguous.length && !DRY) {
    try {
      await openAmbiguousIssueIfNeeded(allAmbiguous);
    } catch (e) {
      console.error(`Aviso: falha ao abrir issue de ambíguos: ${e.message}`);
    }
  }
}

main()
  .catch(e => console.error(`Aviso: refresh-anos falhou de forma não bloqueante: ${e.message}`))
  .finally(() => {
    process.exitCode = 0; // nunca bloqueia pipeline
  });
