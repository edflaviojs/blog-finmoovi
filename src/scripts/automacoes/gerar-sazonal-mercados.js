import { config } from '../../../site.config.ts';
/**
 * gerar-sazonal-mercados.js — Motor sazonal por TIMEZONE/MERCADO (Seção 42.15B).
 *
 * Modelo: UM post forte por feriado (não 3 por data), disparado 10–15 dias antes da
 * data MAIS PRÓXIMA entre os mercados (BR/PT/ES/EUA/UK), com o corpo citando a data
 * de cada país, e sempre nos 3 idiomas (PT+EN+ES) — respeita o invariante i18n, sem
 * conflito com o validador bloqueante. Tracking por feriado/ano evita duplicar.
 *
 * Guardas: skip gracioso (sem IA → exit 0), anti-canibalização (seo-guard),
 * fact-guard (limpa alucinação antes de salvar), dedup por slug, commit por whitelist.
 */

import { generateBlogPost, generateCoverImage, generateText } from '../apis/kie-ai.js';
import { getDueHoliday } from '../lib/calendario-sazonal.js';
import { isThemeCovered } from '../lib/seo-guard.js';
import { analyzeContent } from '../lib/fact-guard.js';
import { fixStaleYear } from '../lib/year-guard.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const POSTS_DIR = join(process.cwd(), 'src', 'content', 'posts');
const DATA_DIR = join(process.cwd(), '.github', 'data');
const TRACK = join(DATA_DIR, 'sazonal-cobertos.json');

function createSlug(title) {
  return title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 60);
}

function loadTrack() { try { return JSON.parse(readFileSync(TRACK, 'utf-8')); } catch { return {}; } }

async function translatePost(post, targetLang) {
  const langNames = { en: 'English', es: 'Spanish' };
  const prompt = `Translate the following blog post to ${langNames[targetLang]}. Keep the same tone, style and structure.
Do NOT translate brand names (${config.brand.name}). Keep markdown formatting and image paths intact. Do NOT invent statistics or sources.

Respond in this exact format:
---TITULO---
[translated title]
---META---
[translated meta description]
---HEADLINE---
[translated ticker headline, max 40 characters]
---KEYWORDS---
[translated keywords, comma separated]
---CONTEUDO---
[translated content in markdown]

Original post:
Title: ${post.title}
Meta: ${post.meta}
Ticker headline: ${post.headline || post.title.slice(0, 40)}
Keywords: ${(post.keywords || []).join(', ')}
Content:
${post.content}`;
  const r = await generateText(prompt, { maxTokens: 5000, temperature: 0.3 });
  const g = (re) => (r.match(re) || [])[1]?.trim();
  return {
    title: g(/---TITULO---\s*([\s\S]*?)(?=---META---|$)/) || post.title,
    meta: g(/---META---\s*([\s\S]*?)(?=---HEADLINE---|---KEYWORDS---|$)/) || post.meta,
    // Headline do ticker: opcional, com teto rígido de 40 chars
    headline: (g(/---HEADLINE---\s*([\s\S]*?)(?=---KEYWORDS---|$)/) || '').replace(/^["']|["']$/g, '').slice(0, 40),
    keywords: (g(/---KEYWORDS---\s*([\s\S]*?)(?=---CONTEUDO---|$)/) || '').split(',').map(k => k.trim()).filter(Boolean),
    content: g(/---CONTEUDO---\s*([\s\S]*?)$/) || post.content,
  };
}

function savePost(slug, d) {
  const fm = `---
title: "${d.title.replace(/"/g, '\\"')}"
description: "${(d.meta || '').replace(/"/g, '\\"')}"
${d.headline ? `tickerHeadline: "${d.headline.replace(/"/g, '\\"')}"\n` : ''}image: "${d.imagePath}"
category: "dicas"
locale: "${d.locale}"
tags: ${JSON.stringify(d.keywords && d.keywords.length ? d.keywords : ['finanças'])}
author: "${config.content.defaultAuthor}"
publishedAt: ${d.today}
readingTime: ${Math.ceil((d.content || '').split(/\s+/).length / 200)}
featured: false
translationKey: "${d.translationKey}"
seo:
  metaTitle: "${d.title.replace(/"/g, '\\"')}"
  metaDescription: "${(d.meta || '').replace(/"/g, '\\"')}"
  keywords: ${JSON.stringify(d.keywords && d.keywords.length ? d.keywords : ['finanças'])}
---

${d.content}
`;
  if (!existsSync(POSTS_DIR)) mkdirSync(POSTS_DIR, { recursive: true });
  writeFileSync(join(POSTS_DIR, `${slug}.md`), fm, 'utf-8');
  return `src/content/posts/${slug}.md`;
}

async function main() {
  const now = new Date();
  const due = getDueHoliday(now);
  if (!due) { console.log('📅 Nenhum feriado na janela de 10–15 dias. Nada a fazer (exit 0).'); return; }
  const holiday = due.holiday;
  const year = String(now.getUTCFullYear());

  const track = loadTrack();
  if ((track[year] || []).includes(holiday.id)) {
    console.log(`📅 "${holiday.id}" já coberto em ${year}. Pulando (exit 0).`);
    return;
  }

  const datesLine = due.prox.perMarket.map(p => p.label).join('; ');
  const topic = `${holiday.ptTopic}. IMPORTANTE: a data varia por país — cite no texto: ${datesLine}. ` +
    `Escreva de forma útil para leitores de Brasil, Portugal, Espanha, EUA e Reino Unido (evite assumir só o Brasil).`;
  console.log(`📅 Feriado devido: ${holiday.id} (mais próximo: ${due.prox.soonestMarket} em ${due.prox.soonest}d)`);

  // Anti-canibalização (seo-guard, por slug/tema).
  const canibal = isThemeCovered(holiday.ptTopic, POSTS_DIR);
  if (canibal.covered) {
    console.log(`⚠️ Anti-canibalização: tema conflita com "${canibal.conflictSlug}". Pulando sem gastar API.`);
    return;
  }

  let post;
  try {
    post = await generateBlogPost(topic, { category: 'dicas', keywords: holiday.keywords });
  } catch (e) {
    if (/Nenhum provedor/.test(e.message)) { console.log('ℹ️ Sem provedor de IA. Encerrando (exit 0).'); return; }
    throw e;
  }
  if (!post || !post.content || post.content.trim().length < 300) { console.log('⚠️ Conteúdo insuficiente. Abortando.'); return; }

  // Fact-guard: limpa alucinação antes de salvar; bloqueia se mutilaria.
  const fg = analyzeContent(post.content);
  if (fg.blocked) { console.log(`⛔ Fact-guard bloqueou (${fg.reason}). Não publica; regenera no próximo ciclo.`); return; }
  if (fg.cuts.length || fg.linkStrips.length) console.log(`🛡️ Fact-guard: ${fg.cuts.length} corte(s), ${fg.linkStrips.length} link(s) removido(s).`);
  const content = fg.cleaned;

  // Year-guard: corrige ano defasado no título antes do slug.
  let title = post.title;
  const yg = fixStaleYear(title);
  if (yg.changed) { console.log(`[year-guard] título corrigido: "${yg.original}" → "${yg.text}"`); title = yg.text; }
  const slug = createSlug(title);
  const existing = readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));
  if (existing.some(f => f === `${slug}.md` || f === `en-${slug}.md` || f === `es-${slug}.md`)) {
    console.log(`⚠️ Post "${slug}" já existe. Abortando.`); return;
  }

  const today = now.toISOString().split('T')[0];
  let imagePath;
  try { imagePath = await generateCoverImage(title, slug, 'posts'); }
  catch { imagePath = `/images/posts/${slug}.webp`; }

  const keywords = [...new Set([...(post.keywords || []), ...holiday.keywords])];
  const paths = [];
  // Headline do ticker: generateBlogPost (módulo compartilhado) não gera headline — fallback ''.
  const headline = post.headline || '';
  paths.push(savePost(slug, { title, meta: post.meta, headline, keywords, content, imagePath, locale: 'pt', today, translationKey: slug }));
  console.log(`✅ PT: ${title}`);

  if (config.locales.includes('en')) {
    await new Promise(r => setTimeout(r, 30000));
    const en = await translatePost({ title, meta: post.meta, headline, keywords, content }, 'en');
    const ygEn = fixStaleYear(en.title);
    if (ygEn.changed) { console.log(`[year-guard] título corrigido: "${ygEn.original}" → "${ygEn.text}"`); en.title = ygEn.text; }
    paths.push(savePost(`en-${slug}`, { ...en, imagePath, locale: 'en', today, translationKey: slug }));
    console.log('🌐 EN ok');
  }

  if (config.locales.includes('es')) {
    await new Promise(r => setTimeout(r, 30000));
    const es = await translatePost({ title, meta: post.meta, headline, keywords, content }, 'es');
    const ygEs = fixStaleYear(es.title);
    if (ygEs.changed) { console.log(`[year-guard] título corrigido: "${ygEs.original}" → "${ygEs.text}"`); es.title = ygEs.text; }
    paths.push(savePost(`es-${slug}`, { ...es, imagePath, locale: 'es', today, translationKey: slug }));
    console.log('🌐 ES ok');
  }

  // Tracking (feriado coberto neste ano).
  track[year] = [...(track[year] || []), holiday.id];
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(TRACK, JSON.stringify(track, null, 2) + '\n');
  paths.push('.github/data/sazonal-cobertos.json');

  // Commit por whitelist (push fica com o workflow).
  try {
    execSync(`git add ${paths.map(p => `"${p}"`).join(' ')}`, { stdio: 'pipe' });
    execSync(`git -c commit.gpgsign=false commit -m "feat(sazonal): ${holiday.id} — ${title.substring(0, 50).replace(/"/g, '')}"`, { stdio: 'pipe' });
    console.log('✅ commit criado.');
  } catch (e) { console.log('⚠️ commit:', (e.stderr || e.message || '').toString().slice(-200)); }
  console.log('🎉 Post sazonal multimercado gerado.');
}

main().catch(err => { console.error('❌ Sazonal:', err.message); process.exit(1); });
