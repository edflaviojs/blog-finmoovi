/**
 * Limpeza única (2026-07-23) do acervo de links internos — posts + glossário, 3 locales.
 * Os workflows re-executavam internal-linking.js e os links ACUMULAVAM (havia post
 * com 45 links internos). Este script normaliza o legado:
 *
 *  1. Âncora incoerente: link cuja âncora é NOME de termo do glossário mas aponta
 *     para /posts/* → reponta para o glossário do locale (ou vira texto puro se o
 *     destino já existe no documento — o dedup abaixo resolve).
 *  2. Dedup: 2º+ link para o MESMO destino no mesmo documento → vira texto puro.
 *  3. Teto por documento: posts = 8, glossário = 6. Sobrevivência por prioridade
 *     ferramenta > glossário > post; entre iguais, primeira ocorrência vence.
 *
 * NUNCA toca: frontmatter, imagens ![...], links externos, /contato, blocos ```.
 *
 * Uso: node src/scripts/manutencao/limpar-links-internos.js [--dry-run]
 */

import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { getGlossaryTerms, parseFrontmatter, INTERNAL_URL_RE } from '../automacoes/internal-linking.js';

const POSTS_DIR = join(process.cwd(), 'src', 'content', 'posts');
const GLOSSARIO_DIR = join(process.cwd(), 'src', 'content', 'glossario');
const DRY_RUN = process.argv.includes('--dry-run');

const CAPS = { posts: 8, glossario: 6 };
const PRIORITY = { ferramentas: 0, glossario: 1, posts: 2 };

function localeOf(file) {
  if (file.startsWith('en-')) return 'en';
  if (file.startsWith('es-')) return 'es';
  return 'pt';
}

// Classe do link interno: 'ferramentas' | 'glossario' | 'posts' (ou null)
function classOf(url) {
  const m = url.match(/^\/(?:en\/|es\/)?(glossario|posts|ferramentas)\//);
  return m ? m[1] : null;
}

// Blocos ``` ficam mascarados durante todo o processamento (nunca tocados).
// Placeholder delimitado por NUL (\u0000): impossível colidir com texto de .md.
// Comentários HTML também são mascarados: <!-- SCHEMA_AUTO:{...} --> carrega
// JSON com links markdown dentro de strings — mexer nele corrompe o schema.
function maskCodeBlocks(body) {
  const blocks = [];
  const masked = body.replace(/```[\s\S]*?```|<!--[\s\S]*?-->/g, b => {
    blocks.push(b);
    return `\u0000C${blocks.length - 1}\u0000`;
  });
  return { masked, blocks };
}

function cleanBody(body, { cap, termUrlByName, ownUrl }) {
  const { masked, blocks } = maskCodeBlocks(body);

  // Coleta os links markdown do corpo (imagens e não-internos ficam intactos)
  const LINK_RE = /(!?)\[([^\]\n]*)\]\(([^)\s]+)\)/g;
  const links = [];
  let m;
  while ((m = LINK_RE.exec(masked))) {
    const [full, bang, anchor, url] = m;
    if (bang) continue; // imagem
    if (!INTERNAL_URL_RE.test(url)) continue; // externo, /contato, âncora local etc.
    links.push({ index: m.index, full, anchor, url, target: url, action: 'keep' });
  }

  // 1) Coerência de âncora: nome de termo apontando para /posts/* → glossário
  for (const l of links) {
    if (classOf(l.target) === 'posts') {
      const gUrl = termUrlByName.get(l.anchor.trim().toLowerCase());
      if (gUrl) { l.target = gUrl; }
    }
    // Auto-link (glossário apontando para si mesmo) → texto puro
    if (ownUrl && l.target === ownUrl) l.action = 'unlink';
  }

  // 2) Dedup: primeiro link para cada destino vence; repetidos viram texto puro
  const seen = new Set();
  for (const l of links) {
    if (l.action !== 'keep') continue;
    if (seen.has(l.target)) l.action = 'unlink';
    else seen.add(l.target);
  }

  // 3) Teto com prioridade ferramenta > glossário > post; empate = 1ª ocorrência
  const alive = links.filter(l => l.action === 'keep');
  const ranked = [...alive].sort((a, b) =>
    (PRIORITY[classOf(a.target)] - PRIORITY[classOf(b.target)]) || (a.index - b.index)
  );
  for (const l of ranked.slice(cap)) l.action = 'unlink';

  // Reconstrução por fatias (só reescreve o que mudou)
  let out = '';
  let pos = 0;
  const stats = { repointed: 0, unlinked: 0 };
  for (const l of links) {
    let replacement = null;
    if (l.action === 'unlink') { replacement = l.anchor; stats.unlinked++; }
    else if (l.target !== l.url) { replacement = `[${l.anchor}](${l.target})`; stats.repointed++; }
    if (replacement === null) continue;
    out += masked.slice(pos, l.index) + replacement;
    pos = l.index + l.full.length;
  }
  out += masked.slice(pos);

  const restored = out.replace(/\u0000C(\d+)\u0000/g, (s, i) => blocks[+i]);
  const finalCount = links.filter(l => l.action === 'keep').length;
  return { body: restored, stats, finalCount };
}

function main() {
  console.log(`🧹 Limpando links internos${DRY_RUN ? ' [dry-run]' : ''} ...\n`);

  // nome do termo (minúsculo) → URL do glossário, por locale
  const termUrlByLocale = {};
  for (const locale of ['pt', 'en', 'es']) {
    termUrlByLocale[locale] = new Map(
      getGlossaryTerms(locale).map(t => [t.term.toLowerCase(), t.url])
    );
  }

  const report = {
    pt: { docs: 0, changed: 0, repointed: 0, unlinked: 0, counts: [] },
    en: { docs: 0, changed: 0, repointed: 0, unlinked: 0, counts: [] },
    es: { docs: 0, changed: 0, repointed: 0, unlinked: 0, counts: [] },
  };

  const targets = [
    { dir: POSTS_DIR, cap: CAPS.posts, kind: 'post' },
    { dir: GLOSSARIO_DIR, cap: CAPS.glossario, kind: 'glossário' },
  ];

  for (const { dir, cap, kind } of targets) {
    for (const file of readdirSync(dir).filter(f => f.endsWith('.md')).sort()) {
      const filePath = join(dir, file);
      const { fm, body } = parseFrontmatter(readFileSync(filePath, 'utf-8'));
      if (!fm) continue; // sem frontmatter → nunca processar
      const locale = localeOf(file);
      const slug = file.replace('.md', '');
      // URL do próprio doc (só relevante para auto-link no glossário)
      const ownUrl = kind === 'glossário'
        ? `${locale === 'pt' ? '' : `/${locale}`}/glossario/${slug}`
        : null;

      const { body: newBody, stats, finalCount } = cleanBody(body, {
        cap,
        termUrlByName: termUrlByLocale[locale],
        ownUrl,
      });

      const r = report[locale];
      r.docs++;
      r.counts.push(finalCount);
      if (newBody !== body) {
        r.changed++;
        r.repointed += stats.repointed;
        r.unlinked += stats.unlinked;
        if (!DRY_RUN) writeFileSync(filePath, fm + newBody, 'utf-8');
        console.log(`✂️  (${kind}) ${file} — repontados: ${stats.repointed}, desfeitos: ${stats.unlinked}, restam: ${finalCount}`);
      }
    }
  }

  console.log(`\n📊 Relatório${DRY_RUN ? ' [dry-run]' : ''}:`);
  for (const locale of ['pt', 'en', 'es']) {
    const r = report[locale];
    const min = r.counts.length ? Math.min(...r.counts) : 0;
    const max = r.counts.length ? Math.max(...r.counts) : 0;
    const avg = r.counts.length ? (r.counts.reduce((a, b) => a + b, 0) / r.counts.length).toFixed(1) : '0';
    console.log(`   ${locale.toUpperCase()}: ${r.changed}/${r.docs} docs alterados | repontados: ${r.repointed} | desfeitos: ${r.unlinked} | links/doc: mín ${min} · média ${avg} · máx ${max}`);
  }
}

main();
