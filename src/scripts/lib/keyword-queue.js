/**
 * keyword-queue.js — Fila persistente de keywords (Fase 3 do motor GSC)
 *
 * Fonte única de leitura/escrita de `.github/data/keyword-queue.json`, a fila
 * que alimenta os geradores de conteúdo com keywords vindas de:
 *   - prioridade 1: data/keywords-manuais.csv (curadoria humana)
 *   - prioridade 2: lacunas do GSC (.github/data/gsc-oportunidades.json)
 *   - prioridade 3: expansão via Google Autocomplete
 *
 * Regras de consumo:
 *   - takeKeyword() NÃO marca a entry como usada — o gerador chama markUsed()
 *     só DEPOIS de publicar com sucesso. Se a geração falhar, a keyword
 *     continua pending para o próximo ciclo.
 *   - Toda candidata passa pelo isThemeCovered (seo-guard) antes de ser
 *     entregue; se já coberta, vira status 'skipped' (reason 'ja-coberto').
 *
 * Módulo tolerante a falhas: nenhuma função lança — arquivo ausente/corrompido
 * vira fila vazia com aviso no console (a fila é otimização, nunca pode
 * derrubar um gerador).
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { isThemeCovered } from './seo-guard.js';

export const QUEUE_FILE = join(process.cwd(), '.github', 'data', 'keyword-queue.json');

const GLOSSARIO_DIR = join(process.cwd(), 'src', 'content', 'glossario');

// O isThemeCovered compara só com POSTS. Uma keyword tipo "o que é câmbio"
// geraria um post competindo com /glossario/cambio — checagem por match EXATO
// do núcleo (prefixos/sufixos de pergunta removidos) contra os .md PT do
// glossário. Long-tails ("amortização de financiamento") passam de propósito.
function coveredByGlossario(keyword) {
  try {
    let core = normalizeKeyword(keyword)
      .replace(/^(o que e|o que sao|o que significa|que e|significado de|definicao de)\s+/, '')
      .replace(/\s+(o que e|significado|definicao)$/, '')
      .trim();
    if (!core) return false;
    const slug = core.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return slug && existsSync(join(GLOSSARIO_DIR, `${slug}.md`));
  } catch {
    return false;
  }
}

/** Categorias aceitas nas entries (qualquer outra vira null = "qualquer gerador"). */
export const VALID_CATEGORIES = new Set(['dicas', 'investimentos', 'orcamento']);

/** Normaliza p/ dedup: lowercase, sem acento, espaços colapsados. */
export function normalizeKeyword(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Carrega a fila; arquivo ausente/corrompido → fila vazia (nunca lança). */
export function loadQueue(file = QUEUE_FILE) {
  try {
    if (!existsSync(file)) return { updatedAt: null, entries: [] };
    const parsed = JSON.parse(readFileSync(file, 'utf-8'));
    if (!parsed || !Array.isArray(parsed.entries)) throw new Error('formato inesperado (entries ausente)');
    return { updatedAt: parsed.updatedAt || null, entries: parsed.entries };
  } catch (e) {
    console.log(`⚠️ keyword-queue: arquivo inválido/ilegível (${e.message}) — usando fila vazia.`);
    return { updatedAt: null, entries: [] };
  }
}

/** Salva a fila (atualiza updatedAt). Retorna false em falha (nunca lança). */
export function saveQueue(queue, file = QUEUE_FILE) {
  try {
    queue.updatedAt = new Date().toISOString();
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify(queue, null, 2) + '\n');
    return true;
  } catch (e) {
    console.log(`⚠️ keyword-queue: falha ao salvar a fila (${e.message}).`);
    return false;
  }
}

/**
 * Adiciona entries com dedup por keyword normalizada contra TODAS as entries
 * existentes (qualquer status — used/skipped não voltam para a fila).
 * item = { keyword, category?, priority, source }
 * Retorna { added, duplicates }.
 */
export function addEntries(list, file = QUEUE_FILE) {
  const queue = loadQueue(file);
  const known = new Set(queue.entries.map(e => normalizeKeyword(e.keyword)));
  let added = 0;
  let duplicates = 0;
  for (const item of list || []) {
    const keyword = String(item?.keyword || '').replace(/\s+/g, ' ').trim();
    const norm = normalizeKeyword(keyword);
    if (!norm) continue;
    if (known.has(norm)) { duplicates++; continue; }
    known.add(norm);
    queue.entries.push({
      keyword,
      category: VALID_CATEGORIES.has(item.category) ? item.category : null,
      priority: [1, 2, 3].includes(item.priority) ? item.priority : 3,
      source: item.source || 'desconhecida',
      status: 'pending',
      addedAt: new Date().toISOString(),
    });
    added++;
  }
  if (added > 0) saveQueue(queue, file);
  return { added, duplicates };
}

/**
 * Entrega a próxima keyword pending elegível para as categorias dadas
 * (category da entry ∈ categories OU null), ordenando por priority asc e
 * addedAt asc. Cada candidata passa pelo isThemeCovered: se já coberta, vira
 * 'skipped' (reason 'ja-coberto') e segue para a próxima.
 *
 * NÃO marca a escolhida como used — isso é responsabilidade do gerador via
 * markUsed() após publicar com sucesso. Retorna a entry (cópia) ou null.
 */
export function takeKeyword({ categories = [] } = {}, file = QUEUE_FILE) {
  try {
    const queue = loadQueue(file);
    const cats = new Set(categories);
    const candidates = queue.entries
      .filter(e => e.status === 'pending' && (e.category == null || cats.has(e.category)))
      .sort((a, b) => (a.priority - b.priority) || String(a.addedAt).localeCompare(String(b.addedAt)));

    let dirty = false;
    let chosen = null;
    for (const entry of candidates) {
      const canibal = isThemeCovered(entry.keyword);
      if (canibal.covered) {
        entry.status = 'skipped';
        entry.reason = 'ja-coberto';
        dirty = true;
        console.log(`ℹ️ keyword-queue: "${entry.keyword}" já coberta por "${canibal.conflictSlug}" — marcada como skipped.`);
        continue;
      }
      if (coveredByGlossario(entry.keyword)) {
        entry.status = 'skipped';
        entry.reason = 'coberto-glossario';
        dirty = true;
        console.log(`ℹ️ keyword-queue: "${entry.keyword}" já coberta por termo do glossário — marcada como skipped.`);
        continue;
      }
      chosen = entry;
      break;
    }
    if (dirty) saveQueue(queue, file);
    return chosen ? { ...chosen } : null;
  } catch (e) {
    console.log(`⚠️ keyword-queue: takeKeyword falhou (${e.message}) — seguindo fluxo normal do pool.`);
    return null;
  }
}

/**
 * Marca a keyword como usada (chamar SÓ após salvar+traduzir com sucesso).
 * Retorna true se marcou e salvou; false caso contrário (nunca lança).
 */
export function markUsed(keyword, usedBy, file = QUEUE_FILE) {
  try {
    const queue = loadQueue(file);
    const norm = normalizeKeyword(keyword);
    const entry = queue.entries.find(e => e.status === 'pending' && normalizeKeyword(e.keyword) === norm);
    if (!entry) {
      console.log(`⚠️ keyword-queue: "${keyword}" não encontrada como pending para marcar como used.`);
      return false;
    }
    entry.status = 'used';
    entry.usedAt = new Date().toISOString();
    entry.usedBy = usedBy || '';
    return saveQueue(queue, file);
  } catch (e) {
    console.log(`⚠️ keyword-queue: markUsed falhou (${e.message}).`);
    return false;
  }
}
