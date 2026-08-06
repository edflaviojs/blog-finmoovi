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

import { generateBlogPost, generateCoverImage, generateInlineImage, generateText } from '../apis/kie-ai.js';
import { getDueHoliday } from '../lib/calendario-sazonal.js';
import { isThemeCovered, warnSkip, trimSlug } from '../lib/seo-guard.js';
import { guardedTranslate } from '../lib/lang-guard.js';
import { analyzeContent } from '../lib/fact-guard.js';
import { fixStaleYear } from '../lib/year-guard.js';
import { getTranslationInstructions } from '../lib/translation-prompt.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const POSTS_DIR = join(process.cwd(), 'src', 'content', 'posts');
const DATA_DIR = join(process.cwd(), '.github', 'data');
const TRACK = join(DATA_DIR, 'sazonal-cobertos.json');

function createSlug(title) {
  return trimSlug(title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
}

function loadTrack() { try { return JSON.parse(readFileSync(TRACK, 'utf-8')); } catch { return {}; } }

/**
 * Insere imagens no corpo do post — mesmo padrão de gerar-post-sazonal.js:54-80.
 * Este gerador era o único que publicava só com capa: 0 imagens no corpo, contra
 * as 3 de 155 dos 207 posts do blog. Roda ANTES da tradução, de propósito: as
 * traduções reaproveitam os MESMOS ficheiros (só o alt é traduzido), exatamente
 * como a capa já fazia — 3 imagens por post, não 9.
 */
async function insertInlineImages(content, slugBase) {
  const h2Matches = content.match(/^## .+$/gm) || [];
  if (h2Matches.length < 2) return content;
  const headings = h2Matches.map(h => h.replace('## ', ''));
  let result = content;
  let imagePositions = [];
  if (headings.length >= 6) imagePositions = [1, 3, 5];
  else if (headings.length >= 4) imagePositions = [1, 2, 3];
  else if (headings.length >= 2) imagePositions = [0, 1];

  // De trás para a frente, como no original. A ordem é, na prática, indiferente:
  // a posição é achada por TEXTO (indexOf de `## <heading>`), não por offset.
  for (let idx = imagePositions.length - 1; idx >= 0; idx--) {
    const i = imagePositions[idx];
    if (i >= headings.length) continue;
    let imgPath;
    try {
      imgPath = await generateInlineImage(`${slugBase} - ${headings[i]}`, `${slugBase}-${i + 1}`, 'posts');
    } catch (e) {
      console.log(`⚠️ imagem de corpo ${i + 1} falhou (${(e.message || e).toString().slice(0, 120)}) — post segue sem ela.`);
      continue;
    }
    if (!imgPath || !existsSync(join(process.cwd(), 'public', imgPath))) {
      console.log(`⚠️ imagem de corpo ${i + 1} não chegou ao disco (${imgPath || 'sem caminho'}) — post segue sem ela.`);
      continue;
    }
    const headingText = headings[i];
    const headingIndex = result.indexOf(`## ${headingText}`);
    if (headingIndex !== -1) {
      const afterHeading = result.indexOf('\n\n', headingIndex + headingText.length + 3);
      if (afterHeading !== -1) {
        const nextEnd = result.indexOf('\n\n', afterHeading + 2);
        const insertAt = nextEnd !== -1 ? nextEnd : afterHeading;
        result = result.slice(0, insertAt) + `\n\n![${headingText}](${imgPath})\n\n` + result.slice(insertAt);
      }
    }
  }
  return result;
}

async function translatePost(post, targetLang) {
  const langNames = { en: 'English', es: 'Spanish' };
  const langName = langNames[targetLang];

  const instructions = getTranslationInstructions(langName, {
    brandName: config.brand.name,
    appUrl: config.app.url.replace('https://', ''),
  });

  const prompt = `${instructions}

---ORIGINAL POST---
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
scope: "universal"
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
    warnSkip(holiday.ptTopic, `conflita com ${canibal.conflictSlug}`);
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
  // A capa TEM de existir no disco antes de escrever os .md. O catch antigo era
  // mudo e inventava `/images/posts/<slug>.webp` mesmo sem nada gravado — os 3
  // .md sairiam a apontar para uma capa 404 e o log não dizia nada.
  //
  // Alcance real, para ninguém confiar a mais nesta trava: generateAIImage
  // (image-router.js:108-140) quase nunca lança — se todos os provedores caírem
  // ele devolve um SVG desenhado. Logo o caminho normal do pior caso é publicar
  // com capa .svg (o validar-capas.js classifica .svg como AVISO, coerente com
  // os 15 posts do corpus que já são assim). O throw/existsSync cobre só a falha
  // de fs — disco cheio, permissão, sharp ausente.
  //
  // NÃO cobre o incidente de 25/07: lá a imagem ESTAVA no disco e o que falhou
  // foi o `git add` (corrigido na linha 249). Essa classe é apanhada pela
  // auditoria diária de capas no i18n-sync.yml, que corre sobre checkout limpo.
  //
  // Abortar é seguro: cron diário e janela de 6 dias => há novas tentativas.
  let imagePath;
  try { imagePath = await generateCoverImage(title, slug, 'posts'); }
  catch (e) {
    throw new Error(`capa não pôde ser gerada para "${slug}": ${(e && e.message) || e}`);
  }
  if (!imagePath || !existsSync(join(process.cwd(), 'public', imagePath))) {
    throw new Error(`capa ausente no disco para "${slug}" (caminho devolvido: ${imagePath || 'nenhum'}) — nada será publicado.`);
  }
  console.log(`🖼️ capa confirmada no disco: ${imagePath}`);

  // Imagens no corpo (3, como o resto do blog). Falha aqui NÃO aborta o post —
  // texto sem ilustração ainda é conteúdo válido; capa 404 não é.
  const contentComImagens = await insertInlineImages(content, slug);
  const nImagens = (contentComImagens.match(/!\[[^\]]*\]\(\/images\//g) || []).length;
  console.log(`🖼️ imagens no corpo: ${nImagens}`);

  const keywords = [...new Set([...(post.keywords || []), ...holiday.keywords])];
  const paths = [];
  // Headline do ticker: generateBlogPost (módulo compartilhado) não gera headline — fallback ''.
  const headline = post.headline || '';
  paths.push(savePost(slug, { title, meta: post.meta, headline, keywords, content: contentComImagens, imagePath, locale: 'pt', today, translationKey: slug }));
  console.log(`✅ PT: ${title}`);

  if (config.locales.includes('en')) {
    await new Promise(r => setTimeout(r, 30000));
    const en = await guardedTranslate(() => translatePost({ title, meta: post.meta, headline, keywords, content: contentComImagens }, 'en'), 'en', `${slug} (en)`);
    const ygEn = fixStaleYear(en.title);
    if (ygEn.changed) { console.log(`[year-guard] título corrigido: "${ygEn.original}" → "${ygEn.text}"`); en.title = ygEn.text; }
    paths.push(savePost('en-' + createSlug(en.title), { ...en, imagePath, locale: 'en', today, translationKey: slug }));
    console.log('🌐 EN ok');
  }

  if (config.locales.includes('es')) {
    await new Promise(r => setTimeout(r, 30000));
    const es = await guardedTranslate(() => translatePost({ title, meta: post.meta, headline, keywords, content: contentComImagens }, 'es'), 'es', `${slug} (es)`);
    const ygEs = fixStaleYear(es.title);
    if (ygEs.changed) { console.log(`[year-guard] título corrigido: "${ygEs.original}" → "${ygEs.text}"`); es.title = ygEs.text; }
    paths.push(savePost('es-' + createSlug(es.title), { ...es, imagePath, locale: 'es', today, translationKey: slug }));
    console.log('🌐 ES ok');
  }

  // Tracking (feriado coberto neste ano).
  track[year] = [...(track[year] || []), holiday.id];
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(TRACK, JSON.stringify(track, null, 2) + '\n');
  paths.push('.github/data/sazonal-cobertos.json');

  // A CAPA precisa entrar no git add. generateCoverImage (linha 197) grava o
  // .webp por dentro do image-router, fora desta whitelist — sem esta linha a
  // imagem fica orfa: gerada no runner, referenciada no frontmatter e nunca
  // commitada, entao o post vai ao ar com capa 404. Foi o que aconteceu com
  // dia-dos-pais (25/07/2026), e este era o unico dos 13 geradores sem isto.
  // Diretorio inteiro = mesmo padrao de gerar-post-sazonal.js:304 e cia.
  paths.push('public/images/posts');

  // Commit por whitelist (push fica com o workflow).
  try {
    execSync(`git add ${paths.map(p => `"${p}"`).join(' ')}`, { stdio: 'pipe' });
    execSync(`git -c commit.gpgsign=false commit -m "feat(sazonal): ${holiday.id} — ${title.substring(0, 50).replace(/"/g, '')}"`, { stdio: 'pipe' });
    console.log('✅ commit criado.');
  } catch (e) { console.log('⚠️ commit:', (e.stderr || e.message || '').toString().slice(-200)); }
  console.log('🎉 Post sazonal multimercado gerado.');
}

main().catch(err => { console.error('❌ Sazonal:', err.message); process.exit(1); });
