/**
 * keyword-queue-sync.js — FASE 3 do Motor de Conteúdo guiado por GSC.
 *
 * Alimenta a fila `.github/data/keyword-queue.json` (lib keyword-queue.js) com:
 *   (a) data/keywords-manuais.csv        → priority 1, source 'manual'
 *   (b) lacunas do gsc-oportunidades.json → priority 2, source 'gsc-gap'
 *   (c) Google Autocomplete das seeds     → priority 3, source 'autocomplete'
 * E grava um resumo humano em press/keyword-queue.md.
 *
 * Padrão de resiliência do repo: NUNCA desiste calado — etapas puladas emitem
 * `::warning::` (visível no Actions) e o script segue para a próxima etapa.
 * Saída SEMPRE determinística: fila + relatório são gravados mesmo sem novidades
 * (garante que o `git add` dos workflows nunca falhe por arquivo ausente).
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, appendFileSync } from 'fs';
import { join } from 'path';
import { loadQueue, saveQueue, addEntries, normalizeKeyword, VALID_CATEGORIES } from '../lib/keyword-queue.js';

const CSV_FILE = join(process.cwd(), 'data', 'keywords-manuais.csv');
const GSC_JSON = join(process.cwd(), '.github', 'data', 'gsc-oportunidades.json');
const PRESS_DIR = join(process.cwd(), 'press');
const MD_OUT = join(PRESS_DIR, 'keyword-queue.md');

// ── Config / thresholds ──────────────────────────────────────────────────────
// DECISÃO: os gaps do gsc-oportunidades.json já saem filtrados na Fase 1 com
// IMP_MIN = 3 (dados magros de blog novo). Reaplicamos o MESMO piso aqui para
// a fila ficar coerente mesmo se a Fase 1 baixar o threshold no futuro.
const GAP_MIN_IMPRESSIONS = 3;
const AUTOCOMPLETE_SEEDS_MAX = 10;  // até 10 seeds (manual/gsc-gap pending) por execução
const AUTOCOMPLETE_NEW_MAX = 20;    // teto de novas entries de autocomplete por execução
const AUTOCOMPLETE_PER_SEED_MAX = 3; // teto por seed — evita série de posts quase-irmãos da mesma raiz
// GEO: consultas conversacionais ("como X", "vale a pena X") espelham o jeito
// que usuários perguntam a IAs generativas. Só para seeds MANUAIS, e dentro dos
// mesmos tetos globais (AUTOCOMPLETE_NEW_MAX) — não aumenta o volume da fila.
const CONVERSATIONAL_SEEDS_MAX = 3;
const CONVERSATIONAL_PREFIXES = ['como', 'vale a pena'];
const FETCH_TIMEOUT_MS = 8000;

// DECISÃO: o GSC não expõe o idioma da query; distinguimos "claramente não-PT"
// por marcadores lexicais de espanhol/inglês (o blog tem versões ES/EN que
// geram impressões, ex.: "que es cambio"). Inclui "cambio(s)" SEM acento: em
// PT a grafia é "câmbio" — a forma sem acento vem das páginas ES do glossário
// (confirmado nos dados reais do GSC). O filtro roda na query CRUA (com
// acentos). Ambíguos ficam — o isThemeCovered do takeKeyword ainda barra
// duplicatas na hora do consumo. Aplica-se também às variações do autocomplete.
const NON_PT_RE = /(?:^|\s)(que\s+es|qué|cómo|cuál|cuánto|cuándo|dónde|dinero|ahorrar|inversión|cambios?|y|el|los|las|una|climático|calentamiento|what|how\s+to|which|money|invest(?:ing|ment)?)(?:\s|$)/i;

/** Aviso visível no Actions sem quebrar o job (mesmo padrão do warnSkip do seo-guard). */
function warn(msg) {
  console.log(`::warning::keyword-queue-sync — ${msg}`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    try {
      appendFileSync(process.env.GITHUB_STEP_SUMMARY, `⚠️ keyword-queue-sync: ${msg}\n\n`);
    } catch { /* summary é best-effort */ }
  }
}

// ── (a) CSV manual ───────────────────────────────────────────────────────────
function importCsv() {
  if (!existsSync(CSV_FILE)) {
    warn(`data/keywords-manuais.csv ausente — etapa manual pulada.`);
    return { added: 0, duplicates: 0 };
  }
  const lines = readFileSync(CSV_FILE, 'utf-8').split(/\r?\n/).filter(l => l.trim());
  const rows = [];
  for (const [i, line] of lines.entries()) {
    if (i === 0 && /^keyword\s*,/i.test(line)) continue; // header
    if (line.trim().startsWith('#')) continue;
    // Formato: keyword,categoria,observacao — observação pode conter vírgulas.
    const [keyword = '', categoria = ''] = line.split(',', 3);
    const kw = keyword.trim();
    if (!kw) continue;
    const cat = categoria.trim().toLowerCase();
    rows.push({
      keyword: kw,
      category: VALID_CATEGORIES.has(cat) ? cat : null, // categoria inválida → null
      priority: 1,
      source: 'manual',
    });
  }
  const res = addEntries(rows);
  console.log(`📋 CSV manual: ${rows.length} linha(s) → ${res.added} nova(s), ${res.duplicates} já na fila, ${res.similar || 0} quase-duplicata(s) descartada(s).`);
  return res;
}

// ── (b) Lacunas do GSC ───────────────────────────────────────────────────────
function importGscGaps() {
  if (!existsSync(GSC_JSON)) {
    warn(`gsc-oportunidades.json ausente — etapa gsc-gap pulada (roda após a Fase 1).`);
    return { added: 0, duplicates: 0 };
  }
  let payload;
  try {
    payload = JSON.parse(readFileSync(GSC_JSON, 'utf-8'));
  } catch (e) {
    warn(`gsc-oportunidades.json ilegível (${e.message}) — etapa gsc-gap pulada.`);
    return { added: 0, duplicates: 0 };
  }
  const gaps = payload?.opportunities?.gaps;
  if (!payload?.hasData || !Array.isArray(gaps) || gaps.length === 0) {
    console.log('ℹ️ GSC: sem lacunas no digest atual — nada a importar.');
    return { added: 0, duplicates: 0 };
  }
  const rows = [];
  let nonPt = 0;
  for (const g of gaps) {
    const query = String(g?.query || '').trim();
    if (!query || (g.impressions || 0) < GAP_MIN_IMPRESSIONS) continue;
    if (NON_PT_RE.test(query)) { nonPt++; continue; }
    rows.push({ keyword: query, category: null, priority: 2, source: 'gsc-gap' });
  }
  const res = addEntries(rows);
  console.log(`🕳️ Lacunas GSC: ${gaps.length} no digest → ${res.added} nova(s), ${res.duplicates} já na fila, ${res.similar || 0} quase-duplicata(s) descartada(s), ${nonPt} descartada(s) por não-PT.`);
  return res;
}

// ── (c) Expansão via Google Autocomplete ────────────────────────────────────
async function fetchSuggestions(seed) {
  const url = `https://suggestqueries.google.com/complete/search?client=firefox&hl=pt-BR&gl=br&q=${encodeURIComponent(seed)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  // O endpoint responde em ISO-8859-1 (charset no content-type); res.json()
  // decodificaria como UTF-8 e corromperia acentos ("clim�tico").
  const charset = ((res.headers.get('content-type') || '').match(/charset=([\w-]+)/i)?.[1] || 'utf-8').toLowerCase();
  const data = JSON.parse(new TextDecoder(charset).decode(await res.arrayBuffer()));
  return Array.isArray(data?.[1]) ? data[1].map(s => String(s)) : [];
}

// Seeds curtas têm sentidos não-financeiros no autocomplete (palavras
// polissêmicas: "câmbio" = caixa de marchas; "dossier" = ruído PT-PT de banco
// específico). Blocklist mínima, só para variações de autocomplete.
const OFF_TOPIC_RE = /(cambio de (carro|bicicleta|moto|marchas?)|dossier)/i;

/**
 * Variação relevante = contém a seed normalizada (isso já cobre os padrões
 * "como|o que é|vale a pena|melhor" + seed, que também contêm a seed), não
 * dispara o filtro de não-PT (o autocomplete devolve muita sugestão ES) e não
 * cai na blocklist de sentidos fora do nicho.
 */
function relevantVariations(seed, suggestions) {
  const nSeed = normalizeKeyword(seed);
  return suggestions.filter(s => {
    const n = normalizeKeyword(s);
    return n && n !== nSeed && n.includes(nSeed) && !NON_PT_RE.test(s) && !OFF_TOPIC_RE.test(n);
  });
}

async function expandAutocomplete() {
  const queue = loadQueue();
  const seeds = queue.entries
    .filter(e => e.status === 'pending' && (e.source === 'manual' || e.source === 'gsc-gap'))
    .sort((a, b) => (a.priority - b.priority) || String(a.addedAt).localeCompare(String(b.addedAt)))
    .slice(0, AUTOCOMPLETE_SEEDS_MAX);

  if (seeds.length === 0) {
    console.log('ℹ️ Autocomplete: nenhuma seed pending (manual/gsc-gap) — etapa pulada.');
    return { added: 0, duplicates: 0 };
  }

  const rows = [];
  let failures = 0;
  for (const seed of seeds) {
    if (rows.length >= AUTOCOMPLETE_NEW_MAX) break;
    try {
      const suggestions = await fetchSuggestions(seed.keyword);
      for (const variation of relevantVariations(seed.keyword, suggestions).slice(0, AUTOCOMPLETE_PER_SEED_MAX)) {
        if (rows.length >= AUTOCOMPLETE_NEW_MAX) break;
        rows.push({ keyword: variation, category: seed.category || null, priority: 3, source: 'autocomplete' });
      }
    } catch (e) {
      // Falha de rede/timeout numa seed não derruba as demais.
      failures++;
      console.log(`⚠️ Autocomplete: falha para "${seed.keyword}" (${e.message}) — seed pulada.`);
    }
  }
  if (failures === seeds.length && seeds.length > 0) {
    warn(`autocomplete indisponível — ${failures}/${seeds.length} consultas falharam nesta execução.`);
  }

  // Expansão conversacional (GEO): até 3 seeds manuais pending, prefixos
  // "como {seed}" e "vale a pena {seed}". Mesmos filtros (relevantVariations),
  // mesmo teto por consulta e mesmo teto global de novas entries; o dedup fica
  // por conta do addEntries.
  const manualSeeds = seeds.filter(s => s.source === 'manual').slice(0, CONVERSATIONAL_SEEDS_MAX);
  for (const seed of manualSeeds) {
    for (const prefix of CONVERSATIONAL_PREFIXES) {
      if (rows.length >= AUTOCOMPLETE_NEW_MAX) break;
      try {
        const suggestions = await fetchSuggestions(`${prefix} ${seed.keyword}`);
        for (const variation of relevantVariations(seed.keyword, suggestions).slice(0, AUTOCOMPLETE_PER_SEED_MAX)) {
          if (rows.length >= AUTOCOMPLETE_NEW_MAX) break;
          rows.push({ keyword: variation, category: seed.category || null, priority: 3, source: 'autocomplete' });
        }
      } catch (e) {
        console.log(`⚠️ Autocomplete conversacional: falha para "${prefix} ${seed.keyword}" (${e.message}) — consulta pulada.`);
      }
    }
  }

  const res = addEntries(rows);
  console.log(`🔮 Autocomplete: ${seeds.length} seed(s) consultada(s) → ${res.added} nova(s), ${res.duplicates} já na fila, ${res.similar || 0} quase-duplicata(s) descartada(s).`);
  return res;
}

// ── (d) Relatório humano ─────────────────────────────────────────────────────
function buildReport(queue) {
  const pending = queue.entries.filter(e => e.status === 'pending');
  const used = queue.entries.filter(e => e.status === 'used')
    .sort((a, b) => String(b.usedAt || '').localeCompare(String(a.usedAt || '')));
  const skipped = queue.entries.filter(e => e.status === 'skipped');

  let md = `# 🗂️ Fila de Keywords (Fase 3)\n\n`;
  md += `**Atualizado em:** ${queue.updatedAt || '—'}\n`;
  md += `**Totais:** ${pending.length} pendente(s) · ${used.length} usada(s) · ${skipped.length} pulada(s)\n\n`;

  md += `## ⏳ Pendentes por fonte\n\n`;
  const sources = [['manual', 'Manuais (prioridade 1)'], ['gsc-gap', 'Lacunas do GSC (prioridade 2)'], ['autocomplete', 'Autocomplete (prioridade 3)']];
  for (const [source, label] of sources) {
    const items = pending.filter(e => e.source === source);
    md += `### ${label} — ${items.length}\n\n`;
    if (items.length) {
      for (const e of items) md += `- ${e.keyword}${e.category ? ` _(${e.category})_` : ''}\n`;
    } else {
      md += `_Nenhuma._\n`;
    }
    md += `\n`;
  }

  md += `## ✅ Últimas usadas\n\n`;
  if (used.length) {
    md += `| Keyword | Usada por | Em |\n|---|---|---|\n`;
    for (const e of used.slice(0, 10)) md += `| ${e.keyword} | ${e.usedBy || '—'} | ${(e.usedAt || '').split('T')[0]} |\n`;
  } else {
    md += `_Nenhuma ainda._\n`;
  }

  md += `\n## ⏭️ Puladas (já cobertas)\n\n`;
  if (skipped.length) {
    for (const e of skipped) md += `- ${e.keyword} (${e.reason || 'sem motivo registrado'})\n`;
  } else {
    md += `_Nenhuma._\n`;
  }

  md += `\n---\n_Gerado automaticamente por keyword-queue-sync.js (Fase 3). Fontes: data/keywords-manuais.csv · lacunas do GSC · Google Autocomplete._\n`;
  return md;
}

async function main() {
  console.log('🗂️ Sincronizando fila de keywords (Fase 3)...');

  importCsv();
  importGscGaps();
  await expandAutocomplete();

  // Saída determinística: grava fila + relatório mesmo sem novidades.
  const queue = loadQueue();
  saveQueue(queue);
  if (!existsSync(PRESS_DIR)) mkdirSync(PRESS_DIR, { recursive: true });
  writeFileSync(MD_OUT, buildReport(queue));

  const pending = queue.entries.filter(e => e.status === 'pending').length;
  console.log(`✅ Fila sincronizada: ${queue.entries.length} entry(ies) no total · ${pending} pendente(s).`);
  console.log(`   Escrito: .github/data/keyword-queue.json + press/keyword-queue.md`);
}

main().catch(err => {
  console.error('❌ keyword-queue-sync: erro inesperado:', err.message);
  process.exit(1);
});
