/**
 * Regenera as capas ANTIGAS do glossário no estilo 3D novo (prompt `glossary`
 * do image-router, reescrito em 2026-07-15) — em lotes diários para não
 * sobrecarregar as APIs de imagem (mesmo modelo conta-gotas do gerar-alt-imagens).
 *
 * Como decide o que regenerar (idempotente, sem arquivo de estado):
 *   uma capa precisa de regen se o ÚLTIMO COMMIT do seu .webp é anterior ao
 *   CUTOFF (data em que o prompt novo entrou em produção). Capas regeneradas
 *   ganham commit novo → saem da lista automaticamente.
 *
 * Segurança:
 *   - Se todos os provedores falharem, o image-router devolve um .svg de
 *     fallback SEM tocar no .webp antigo → a capa boa nunca é perdida e o
 *     slug tenta de novo no lote seguinte.
 *   - Ao regenerar com sucesso, remove o `imageAlt` dos .md (pt/en/es) que
 *     usam a capa — o workflow gerar-alt-imagens (3×/dia) re-descreve a
 *     imagem nova sozinho.
 *
 * Uso: node --import tsx src/scripts/automacoes/regenerar-capas-glossario.js [--limit 25] [--dry-run]
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, statSync, unlinkSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { generateAIImage } from '../apis/image-router.js';

// Capas commitadas antes desta data são do estilo antigo (prompt novo = 15/07)
const CUTOFF = '2026-07-16T00:00:00Z';
const GLOSSARIO_MD_DIR = join(process.cwd(), 'src', 'content', 'glossario');
const GLOSSARIO_IMG_DIR = join(process.cwd(), 'public', 'images', 'glossario');
const THROTTLE_MS = 8000; // pausa entre gerações (gentil com Cloudflare/Together)
const MIN_WEBP_BYTES = 10_000; // sanidade: capa real nunca é menor que isso

const args = process.argv.slice(2);
const limitIdx = args.indexOf('--limit');
const LIMIT = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) || 25 : 25;
const DRY_RUN = args.includes('--dry-run');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function lastCommitISO(relPath) {
  try {
    const out = execSync(`git log -1 --format=%cI -- "${relPath}"`, { encoding: 'utf8' }).trim();
    return out || null;
  } catch {
    return null;
  }
}

/** Extrai um campo simples do frontmatter sem reformatar o arquivo */
function fmField(raw, field) {
  const m = raw.match(new RegExp(`^${field}:\\s*["']?([^"'\\n]+)["']?\\s*$`, 'm'));
  return m ? m[1].trim() : null;
}

// ── 1. Mapear capas → termo (via .md pt) e arquivos .md que as referenciam ──

const mdFiles = readdirSync(GLOSSARIO_MD_DIR).filter((f) => f.endsWith('.md'));
const byImage = new Map(); // slug → { topic, mdFiles: [] }

for (const f of mdFiles) {
  const raw = readFileSync(join(GLOSSARIO_MD_DIR, f), 'utf8');
  const image = fmField(raw, 'image');
  if (!image || !image.includes('/images/glossario/')) continue;
  const isSvg = image.endsWith('.svg');
  if (!isSvg && !image.endsWith('.webp')) continue;
  const slug = image.split('/').pop().replace(/\.(webp|svg)$/, '');
  if (!byImage.has(slug)) byImage.set(slug, { topic: null, mdFiles: [], isSvg: false });
  const entry = byImage.get(slug);
  entry.mdFiles.push(f);
  if (isSvg) entry.isSvg = true;
  // O termo vem do título do arquivo pt (sem prefixo en-/es-)
  if (!f.startsWith('en-') && !f.startsWith('es-')) {
    const title = fmField(raw, 'title') || slug.replace(/-/g, ' ');
    entry.topic = title.replace(/\s*[-–|]\s*Glossário.*$/i, '').trim();
  }
}

// ── 2. Filtrar as que ainda são do estilo antigo ────────────────────────────
// Capa .svg = fallback antigo, SEMPRE regenera (vira .webp 3D).
// Capa .webp = regenera se o último commit do arquivo é anterior ao CUTOFF.

const candidates = [];
for (const [slug, entry] of byImage) {
  const topic = entry.topic || slug.replace(/-/g, ' ');
  if (entry.isSvg) {
    candidates.push({ slug, topic, mdFiles: entry.mdFiles, wasSvg: true });
    continue;
  }
  const rel = `public/images/glossario/${slug}.webp`;
  if (!existsSync(join(process.cwd(), rel))) continue;
  const committed = lastCommitISO(rel);
  if (committed && committed < CUTOFF) {
    candidates.push({ slug, topic, mdFiles: entry.mdFiles, wasSvg: false });
  }
}
candidates.sort((a, b) => a.slug.localeCompare(b.slug));

console.log(`🎨 Capas no estilo antigo restantes: ${candidates.length}`);
const batch = candidates.slice(0, LIMIT);
console.log(`📦 Lote desta rodada: ${batch.length} (limit=${LIMIT})${DRY_RUN ? ' [DRY-RUN]' : ''}`);

if (DRY_RUN) {
  batch.forEach((c) => console.log(`  · ${c.slug}${c.wasSvg ? ' [svg→webp]' : ''}  ←  "${c.topic}"`));
  process.exit(0);
}

// ── 3. Regenerar em série, com throttle ─────────────────────────────────────

let ok = 0;
let fail = 0;

for (const { slug, topic, mdFiles: refs, wasSvg } of batch) {
  try {
    const result = await generateAIImage(topic, slug, 'glossario', 'glossary');
    const webpPath = join(GLOSSARIO_IMG_DIR, `${slug}.webp`);
    const isRealCover =
      typeof result === 'string' &&
      result.endsWith('.webp') &&
      existsSync(webpPath) &&
      statSync(webpPath).size >= MIN_WEBP_BYTES;

    if (!isRealCover) {
      // Fallback SVG ou resultado suspeito — capa antiga preservada, tenta amanhã
      fail++;
      console.warn(`⚠️ ${slug}: provedores falharam (resultado: ${result}) — mantendo capa antiga`);
      continue;
    }

    // Atualiza os .md que usam esta capa: aponta .svg→.webp (quando era
    // fallback) e limpa o imageAlt (o alt antigo descreve a imagem antiga) —
    // o workflow de alt re-descreve no próximo ciclo.
    for (const f of refs) {
      const p = join(GLOSSARIO_MD_DIR, f);
      let raw = readFileSync(p, 'utf8');
      const before = raw;
      if (wasSvg) {
        raw = raw.replace(`/images/glossario/${slug}.svg`, `/images/glossario/${slug}.webp`);
      }
      raw = raw.replace(/^imageAlt:\s*.*\r?\n/m, '');
      if (raw !== before) writeFileSync(p, raw, 'utf8');
    }

    // Remove o .svg antigo do repositório (substituído pelo .webp)
    if (wasSvg) {
      const svgPath = join(GLOSSARIO_IMG_DIR, `${slug}.svg`);
      if (existsSync(svgPath)) unlinkSync(svgPath);
    }

    ok++;
    console.log(`✅ ${slug} regenerada${wasSvg ? ' [svg→webp]' : ''} ("${topic}") — ${refs.length} arquivo(s) .md atualizados`);
  } catch (err) {
    fail++;
    console.warn(`⚠️ ${slug}: erro inesperado — ${err.message}`);
  }
  await sleep(THROTTLE_MS);
}

console.log(`\n🏁 Rodada concluída: ${ok} regeneradas, ${fail} adiadas, ${candidates.length - batch.length} aguardando próximos lotes`);
