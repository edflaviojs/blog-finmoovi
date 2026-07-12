/**
 * seo-guard.js — Guarda anti-canibalização de SEO (fonte única)
 *
 * Centraliza a lógica de canibalização já testada e usada em
 * `validacao/validar-i18n.js` (STOPWORDS, SERIE_RE, coreTokens, jaccardSim) e
 * expõe funções para os geradores usarem ANTES de gerar conteúdo:
 *   - isThemeCovered(tema)  → o tema candidato já está coberto? (pular sem API)
 *   - coveredThemesBlock()  → bloco de texto com temas já cobertos p/ injetar no
 *                             prompt e a IA escolher um ângulo novo.
 *
 * Módulo PURO: importa apenas fs/path (nenhuma dependência de IA/config), então
 * pode ser importado tanto pelos geradores quanto pelo validador (node puro).
 *
 * IMPORTANTE: STOPWORDS/SERIE_RE/coreTokens/jaccardSim são a MESMA lógica que o
 * validador usa para BLOQUEAR canibalização. Manter idênticos garante que o que
 * o guard pula aqui é exatamente o que o validador bloquearia depois.
 */

import { readdirSync, existsSync } from 'fs';
import { join } from 'path';

export const POSTS_DIR = join(process.cwd(), 'src', 'content', 'posts');

// Palavras irrelevantes para o "núcleo" do tema (idêntico ao validador).
export const STOPWORDS = new Set(['de','da','do','das','dos','para','por','com','e','em','o','a','as','os','um','uma','no','na','nas','nos','ao','aos','se','sua','seu','suas','seus','que','qual','quais','como','ou','vs','sem','sobre','the','of','to','for','and','in','el','la','los','las','y','del','guia','completo','completa','complete','guide','dicas','tips','passo','melhor','mais','menos','voce','you','rende','vale','pena','realmente','importa','2025','2026','2027']);

// Séries periódicas (cotações, glossário, meses) NUNCA são canibalização.
export const SERIE_RE = /(semana|semanal|cotacoes|cotizaciones|quotes|week|glossario|glossary|glosario|janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|january|february|march|may|june|july|august|september|october|november|december|enero|febrero|marzo|mayo|junio|julio|septiembre|octubre|noviembre|diciembre)/;

export function coreTokens(slug) {
  return new Set(slug.split('-').map(t => t.trim()).filter(t => t && t.length > 1 && !STOPWORDS.has(t)));
}

export function jaccardSim(a, b) {
  const inter = [...a].filter(x => b.has(x)).length;
  const uni = new Set([...a, ...b]).size;
  return uni ? inter / uni : 0;
}

/** Normaliza um tema/título livre para o mesmo formato de slug dos arquivos. */
export function slugifyTheme(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

/** Slugs dos posts PT existentes (base, sem prefixo en-/es-). */
export function getExistingPtSlugs(postsDir = POSTS_DIR) {
  if (!existsSync(postsDir)) return [];
  return readdirSync(postsDir)
    .filter(f => f.endsWith('.md') && !f.startsWith('en-') && !f.startsWith('es-'))
    .map(f => f.replace(/\.md$/, ''));
}

/**
 * O tema candidato canibaliza algum post PT já publicado?
 * Usa o MESMO critério do validador: núcleo de tokens compartilhado ≥ 3 OU
 * jaccard ≥ 0.7, ignorando séries periódicas (dos dois lados).
 * Retorna { covered, conflictSlug?, shared? }.
 */
export function isThemeCovered(theme, postsDir = POSTS_DIR) {
  const candSlug = slugifyTheme(theme);
  if (!candSlug || SERIE_RE.test(candSlug)) return { covered: false };
  const cand = coreTokens(candSlug);
  if (cand.size === 0) return { covered: false };

  for (const slug of getExistingPtSlugs(postsDir)) {
    if (SERIE_RE.test(slug)) continue;
    const core = coreTokens(slug);
    const shared = [...cand].filter(x => core.has(x));
    if (shared.length >= 3 || jaccardSim(cand, core) >= 0.7) {
      return { covered: true, conflictSlug: slug, shared };
    }
  }
  return { covered: false };
}

/**
 * Bloco de texto (pt-BR) listando temas já cobertos, para injetar no prompt de
 * geração e a IA escolher um ângulo/subtema novo. Séries periódicas são omitidas.
 * Retorna '' se não houver temas.
 */
export function coveredThemesBlock(postsDir = POSTS_DIR, { limit = 60 } = {}) {
  const slugs = getExistingPtSlugs(postsDir).filter(s => !SERIE_RE.test(s));
  if (slugs.length === 0) return '';
  const list = slugs.slice(0, limit).map(s => `- ${s.replace(/-/g, ' ')}`).join('\n');
  return `ANTI-CANIBALIZAÇÃO DE SEO — estes temas JÁ estão publicados no blog. NÃO repita o mesmo núcleo de palavras-chave; escolha um ângulo/subtema NOVO e distinto destes:\n${list}\n`;
}
