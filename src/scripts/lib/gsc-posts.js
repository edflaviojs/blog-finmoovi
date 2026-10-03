/**
 * gsc-posts.js — Biblioteca compartilhada da FASE 2 do Motor GSC (Seção 42.10).
 *
 * Fornece às automações de OTIMIZAÇÃO (título/meta por CTR, striking-distance,
 * refresh/decay, canibalização) tudo que envolve MEXER em post real, com travas
 * ANTI-DEGRADAÇÃO fortes (o full-auto pedido só é seguro por causa delas):
 *
 *  - Mapeamento robusto URL do GSC → arquivo (casa com/sem prefixo en-/es-).
 *  - Patch CIRÚRGICO de frontmatter (title, description, seo.metaTitle/Description,
 *    updatedAt) preservando
 *    byte-a-byte o resto do arquivo (mesma filosofia do i18n-sync).
 *  - Inserção de seção APPEND-ONLY (nunca reescreve/apaga conteúdo existente;
 *    insere antes do marcador <!-- SCHEMA_AUTO --> ou no fim do corpo).
 *  - Validadores de segurança: comprimento de title/meta, tema preservado,
 *    corpo nunca encolhe, e BLOQUEIO de fabricação de números (R$/%/anos novos).
 *  - Rollback: snapshot do original; se o validador i18n falhar, restaura e aborta.
 *  - Suporte a GSC_DRY_RUN=1 (mostra o que faria, sem escrever/commitar).
 *
 * Módulo puro em node (fs/path/child_process); reusa splitFrontmatter/
 * localeFromFilename do i18n-sync e coreTokens do seo-guard.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { querySearchAnalytics, GSC_SITE_URL, hasGscCredentials } from '../apis/gsc.js';
import { splitFrontmatter, localeFromFilename } from './i18n-sync.js';
import { coreTokens, slugifyTheme } from './seo-guard.js';

export const POSTS_DIR = join(process.cwd(), 'src', 'content', 'posts');
export const DRY_RUN = process.env.GSC_DRY_RUN === '1';

// ─────────────────────────────────────────────────────────────────────────────
// Datas / GSC
// ─────────────────────────────────────────────────────────────────────────────

export function dateRange(days = 28) {
  const end = new Date();
  const start = new Date(end.getTime() - days * 86400000);
  const fmt = d => d.toISOString().split('T')[0];
  return { startDate: fmt(start), endDate: fmt(end) };
}

/** Split de um período em duas metades (para detectar tendência/decay). */
export function splitPeriods(days = 56) {
  const end = new Date();
  const mid = new Date(end.getTime() - (days / 2) * 86400000);
  const start = new Date(end.getTime() - days * 86400000);
  const fmt = d => d.toISOString().split('T')[0];
  return {
    recent: { startDate: fmt(mid), endDate: fmt(end) },
    older: { startDate: fmt(start), endDate: fmt(mid) },
  };
}

export { hasGscCredentials, GSC_SITE_URL, querySearchAnalytics };

// ─────────────────────────────────────────────────────────────────────────────
// FILTRO DE REALIDADE — os quatro cortes que separam gente de robô
// ─────────────────────────────────────────────────────────────────────────────
/**
 * ♦ 02/10/2026 — CONSERTO Nº2, pedido pelo dono. A trava que faltava.
 *
 * ═══ O ERRO QUE ISTO IMPEDE, MEDIDO ═══
 *
 * Uma página deste blog tinha **1.164 aparições na busca, posição média 8, zero
 * cliques**. Zero cliques na posição 8 não é normal — logo parecia problema de
 * título. O título foi reescrito à mão a 15/09. Nada mudou. A conclusão natural
 * foi *"nem com o título certo as pessoas clicam"*.
 *
 * **Estava tudo errado.** O raio-x das aparições mostrou:
 *
 *   - **1.161 das 1.164 aparições aconteceram em SETE DIAS** (04→10/09); no resto
 *     dos 90 dias foram 3.
 *   - **1.163 em computador, 1 em telemóvel.**
 *   - Os países: França 421, Alemanha 280, Marrocos 122, Argélia 103, Áustria 94,
 *     Bélgica 93 — **numa busca em português. O Brasil nem entra no top 10.**
 *   - E o pico **acabou a 10/09, cinco dias ANTES** de o título ser mexido.
 *
 * No Brasil, as páginas reais deste blog estão na **posição 70 a 90** — página 7 a
 * 9 do Google. Não há problema de CTR: há problema de não aparecer.
 *
 * ═══ POR QUE NA BIBLIOTECA, E NÃO EM CADA ROBÔ ═══
 *
 * Quatro robôs desta casa escolhem páginas por **posição e impressões** e depois
 * mexem no texto: reescrevem título e meta (terça), acrescentam secção escrita por
 * IA (quarta), refrescam conteúdo (quinta), juntam páginas (sexta). **Nenhum deles
 * filtrava por país, aparelho ou forma no tempo** — ou seja, o critério que criou o
 * fantasma estava em produção, quatro vezes por semana.
 *
 * Por isso o corte vive aqui, num sítio só. Quatro robôs curados pela mesma régua.
 * Pôr a mesma pergunta em quatro ficheiros é a família de defeito nº1 desta casa.
 *
 * ⚠️ **ESCAPE:** `GSC_FILTRO_REALIDADE=0` desliga o filtro (deixa passar tudo, e
 * diz em voz alta que está desligado). Existe para o dia em que a régua se revelar
 * grossa de mais e for preciso trabalhar sem ela, sem ter de reverter código.
 */

/** O filtro está ligado? (ligado por omissão) */
export const FILTRO_REALIDADE_LIGADO = process.env.GSC_FILTRO_REALIDADE !== '0';

/**
 * Os mercados de cada idioma, em código de país do Search Console (ISO-3 minúsculo).
 *
 * ⚠️ Esta lista **não foi inventada**: saiu dos países que de facto trazem gente ao
 * blog, medido no Search Console de julho a setembro de 2026 — Brasil 2.407
 * aparições, Espanha 1.540, Estados Unidos 1.895, Portugal 284 (com 2 cliques),
 * México 498, Peru 252, Chile 174, Equador 82, Guatemala 43. Os países da lista de
 * espanhol são os de língua espanhola com tráfego real ou plausível; os de inglês
 * idem.
 *
 * ⚠️ França, Alemanha, Marrocos, Argélia e Áustria ficam DE FORA de propósito: foi
 * exactamente de lá que veio o pico de robôs numa página em português.
 */
export const MERCADOS = {
  pt: ['bra', 'prt', 'ago', 'moz'],
  en: ['usa', 'gbr', 'can', 'aus', 'irl', 'nzl', 'zaf', 'ind', 'phl', 'sgp'],
  es: ['esp', 'mex', 'arg', 'col', 'chl', 'per', 'ecu', 'ury', 'bol', 'pry',
    'ven', 'cri', 'pan', 'gtm', 'slv', 'hnd', 'nic', 'dom', 'cub', 'pri'],
};

/** Réguas do filtro. Cada número está justificado no documento da skill `finmoovi-crescimento`. */
export const REGUAS_REALIDADE = {
  /** Abaixo disto a posição média oscila sozinha e não se decide nada. */
  impressoesMinimasNoMercado: 30,
  /** Menos de metade das aparições vindas do mercado da página = não é o nosso público. */
  fracaoMinimaDoMercado: 0.5,
  /** Acima da 20 não se mexe em título: o problema é não aparecer, não o CTR. */
  posicaoMaximaNoMercado: 20,
  /** Quase nada em telemóvel numa busca de finanças pessoais = assinatura de robô. */
  fracaoMinimaTelemovel: 0.1,
  /** …mas só se julga o aparelho quando há aparições suficientes para a conta valer. */
  impressoesParaJulgarAparelho: 100,
  /** Concentração: fracção das aparições nos 10 dias mais fortes de 90. */
  fracaoMaximaNoTopo: 0.7,
  /** …e o pico só condena se tiver ACABADO (quase nada nos últimos 14 dias). */
  fracaoMinimaRecente: 0.1,
  /** Páginas com menos aparições que isto não são julgadas pela forma no tempo. */
  impressoesParaJulgarPico: 100,
};

/** Locale a partir do caminho da página do GSC (igual ao que `parsePostUrl` faz). */
function localeDaUrl(pageUrl) {
  let path;
  try { path = new URL(pageUrl).pathname; } catch { path = String(pageUrl); }
  return path.startsWith('/en/') ? 'en' : path.startsWith('/es/') ? 'es' : 'pt';
}

/**
 * Soma as aparições de uma lista de linhas do GSC, com a posição PONDERADA pelas
 * aparições.
 *
 * ⚠️ Ponderada, nunca média simples das posições: um país com 3 aparições na
 * posição 2 não pode pesar o mesmo que um com 3.000 na posição 80. É a mesma
 * lição da mediana nos Shorts — um caso extremo não decide sozinho.
 */
export function somarComPosicao(linhas) {
  let impressoes = 0, cliques = 0, produto = 0;
  for (const r of linhas) {
    const imp = Number(r.impressions) || 0;
    impressoes += imp;
    cliques += Number(r.clicks) || 0;
    if (Number.isFinite(r.position)) produto += r.position * imp;
  }
  return {
    impressoes,
    cliques,
    posicao: impressoes > 0 ? produto / impressoes : null,
  };
}

/**
 * Mede a REALIDADE das aparições de uma página: de que mercado vêm, em que
 * aparelho, e com que forma no tempo.
 *
 * Duas chamadas ao GSC por página (país+aparelho numa, dia a dia na outra).
 *
 * Devolve `{ ok, motivo, posicaoNoMercado, ... }`. Quando `ok` é verdadeiro, o
 * chamador deve usar **`posicaoNoMercado`** no lugar da posição global — é a única
 * que quer dizer algo.
 */
export async function avaliarRealidade(pageUrl, period, locale = null) {
  return avaliarRealidadeDe({ dimensao: 'page', valor: pageUrl, period, locale: locale || localeDaUrl(pageUrl) });
}

/**
 * O mesmo filtro, mas sobre **qualquer** dimensão do Search Console — `page` ou
 * `query`.
 *
 * ♦ 03/10/2026, conserto nº7. Os robôs que **agem** perguntam por página; o
 * relatório que o Ed **lê** à segunda-feira é organizado por BUSCA. Era preciso
 * responder à mesma pergunta nos dois formatos, e **a pergunta tem de ser a
 * mesma** — ter duas réguas para a mesma coisa em ficheiros diferentes é a família
 * de defeito nº1 desta casa. Por isso é uma função só, com a dimensão por fora.
 *
 * ⚠️ Para uma BUSCA não há URL de onde tirar o idioma. Quem chama tem de o dizer —
 * e o relatório sabe-o, porque já guarda a página que serve cada busca.
 */
export async function avaliarRealidadeDe({ dimensao = 'page', valor, period, locale = 'pt' }) {
  const idioma = locale;
  const mercados = MERCADOS[idioma] || MERCADOS.pt;
  const R = REGUAS_REALIDADE;
  const filtroPagina = [{ filters: [{ dimension: dimensao, operator: 'equals', expression: valor }] }];

  // ── Cortes 2 e 3: aparelho e país, numa chamada só ────────────────────────
  let porPaisAparelho = [];
  try {
    porPaisAparelho = await querySearchAnalytics({
      ...period, dimensions: ['country', 'device'], rowLimit: 500, filters: filtroPagina,
    });
  } catch (e) {
    // ⚠️ Se a medição falhar, NÃO se deixa passar por omissão. Agir sobre número
    // que não se conseguiu conferir é exactamente o que este filtro existe para
    // impedir — e falhar a medir não é prova de que o tráfego é bom.
    return { ok: false, motivo: `não deu para medir a realidade (${String(e.message).slice(0, 80)})`, erro: true };
  }

  const doMercado = porPaisAparelho.filter((r) => mercados.includes(String(r.keys?.[0]).toLowerCase()));
  const tudo = somarComPosicao(porPaisAparelho);
  const mercado = somarComPosicao(doMercado);
  const movel = somarComPosicao(doMercado.filter((r) => String(r.keys?.[1]).toUpperCase() !== 'DESKTOP'));

  const fracaoDoMercado = tudo.impressoes > 0 ? mercado.impressoes / tudo.impressoes : 0;
  const fracaoMovel = mercado.impressoes > 0 ? movel.impressoes / mercado.impressoes : 0;

  const base = {
    idioma,
    impressoesTotais: tudo.impressoes,
    impressoesNoMercado: mercado.impressoes,
    cliquesNoMercado: mercado.cliques,
    posicaoGlobal: tudo.posicao,
    posicaoNoMercado: mercado.posicao,
    fracaoDoMercado,
    fracaoMovel,
  };

  if (mercado.impressoes < R.impressoesMinimasNoMercado) {
    return { ...base, ok: false, motivo: `só ${mercado.impressoes} aparições no mercado ${idioma} (mínimo ${R.impressoesMinimasNoMercado})` };
  }
  if (fracaoDoMercado < R.fracaoMinimaDoMercado) {
    return { ...base, ok: false, motivo: `só ${(fracaoDoMercado * 100).toFixed(0)}% das aparições vêm do mercado ${idioma}` };
  }
  if (mercado.posicao != null && mercado.posicao > R.posicaoMaximaNoMercado) {
    return { ...base, ok: false, motivo: `posição ${mercado.posicao.toFixed(0)} no mercado ${idioma} (a global dizia ${tudo.posicao?.toFixed(0)}) — o problema é não aparecer, não o CTR` };
  }
  if (mercado.impressoes >= R.impressoesParaJulgarAparelho && fracaoMovel < R.fracaoMinimaTelemovel) {
    return { ...base, ok: false, motivo: `só ${(fracaoMovel * 100).toFixed(0)}% em telemóvel — assinatura de robô, não de gente` };
  }

  // ── Corte 1: a forma no tempo, em janela larga (90 dias) ──────────────────
  const noventa = dateRange(90);
  let porDia = [];
  try {
    porDia = await querySearchAnalytics({
      ...noventa, dimensions: ['date'], rowLimit: 200, filters: filtroPagina,
    });
  } catch (e) {
    return { ...base, ok: false, motivo: `não deu para medir a forma no tempo (${String(e.message).slice(0, 80)})`, erro: true };
  }

  const dias = porDia
    .map((r) => ({ dia: r.keys?.[0], imp: Number(r.impressions) || 0 }))
    .filter((d) => d.imp > 0);
  const total90 = dias.reduce((a, d) => a + d.imp, 0);
  const topo = [...dias].sort((a, b) => b.imp - a.imp).slice(0, 10).reduce((a, d) => a + d.imp, 0);
  const fracaoNoTopo = total90 > 0 ? topo / total90 : 0;

  const corte = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);
  const recentes = dias.filter((d) => String(d.dia) >= corte).reduce((a, d) => a + d.imp, 0);
  const fracaoRecente = total90 > 0 ? recentes / total90 : 0;

  const forma = { ...base, diasComAparicoes: dias.length, impressoes90: total90, fracaoNoTopo, fracaoRecente };

  /**
   * ⚠️ O PICO SÓ CONDENA SE TIVER ACABADO — e isto não é detalhe.
   *
   * Uma página publicada há uma semana também tem as aparições todas concentradas
   * em poucos dias, e rejeitá-la seria castigar conteúdo novo. A assinatura do
   * fantasma não é "concentrado": é **concentrado e já morto** — 1.161 aparições
   * num pico que acabou vinte dias antes de alguém olhar. Daí as duas condições
   * ao mesmo tempo.
   */
  if (total90 >= R.impressoesParaJulgarPico
    && fracaoNoTopo > R.fracaoMaximaNoTopo
    && fracaoRecente < R.fracaoMinimaRecente) {
    return {
      ...forma,
      ok: false,
      motivo: `pico já passado: ${(fracaoNoTopo * 100).toFixed(0)}% das aparições em ${Math.min(dias.length, 10)} dia(s) e só ${(fracaoRecente * 100).toFixed(0)}% nas últimas 2 semanas`,
    };
  }

  return { ...forma, ok: true, motivo: 'passou os quatro cortes' };
}

/**
 * Passa uma lista de candidatas pelo filtro e devolve só as que são reais, **com a
 * posição do mercado no lugar da global**.
 *
 * `candidatas` são objectos com a URL da página em `keys[0]` **ou** em `url` — os
 * robôs desta casa usam os dois formatos (o do decaimento traz `url`), e obrigar
 * os dois a mudar de forma seria mexer em código provado sem precisar.
 *
 * ⚠️ **O ROBÔ DA CANIBALIZAÇÃO (sexta) NÃO USA ISTO, DE PROPÓSITO.** Ele não age
 * sobre um diagnóstico de desempenho: detecta duas páginas a disputar a mesma
 * busca e acrescenta ao mais fraco um link *"Veja também"* para o mais forte. É
 * aditivo, não promete nada ao leitor e não reescreve título nenhum — o pior que
 * acontece se a busca for de robô é um link interno a mais, que não faz mal.
 * Além disso o mínimo dele são 2 impressões, e a régua de 30 deste filtro mataria
 * quase todas as consolidações legítimas de cauda longa: régua grossa a inventar
 * defeito. Aplicá-lo ali *"por consistência"* seria copiar a conclusão em vez do
 * critério.
 *
 * ⚠️ `limite` existe porque cada candidata custa duas chamadas ao GSC. Os robôs
 * mexem em 3 a 5 páginas por corrida; medir 500 para escolher 3 seria desperdício.
 * Quem passar um limite grande deve saber o que está a fazer.
 *
 * ⚠️ **O que foi REJEITADO é impresso sempre, com o motivo.** Um filtro que corta
 * em silêncio é indistinguível de um robô que não encontrou nada — e a primeira
 * corrida com esta trava precisa de ser legível para se ver se a régua está certa.
 */
export async function filtrarCandidatasReais(candidatas, period, { limite = 12, rotulo = 'candidatas' } = {}) {
  if (!FILTRO_REALIDADE_LIGADO) {
    console.log(`   ⚠️ FILTRO DE REALIDADE DESLIGADO (GSC_FILTRO_REALIDADE=0) — ${candidatas.length} ${rotulo} passam sem conferência.`);
    return candidatas.map((c) => ({ ...c, realidade: null }));
  }

  const aprovadas = [];
  const rejeitadas = [];
  for (const cand of candidatas.slice(0, limite)) {
    const url = cand.keys?.[0] || cand.url;
    if (!url) continue;
    const r = await avaliarRealidade(url, period);
    if (!r.ok) { rejeitadas.push({ url, motivo: r.motivo }); continue; }

    const aprovada = { ...cand, realidade: r };
    /**
     * A posição que passa a valer é a do MERCADO — mas só se sobrepõe nos robôs
     * que de facto têm `position` no objecto. No do decaimento a comparação é
     * entre duas janelas de tempo e vive em `older`/`recent`; inventar aí um
     * campo `position` seria mexer no significado do que ele mede.
     */
    if (Number.isFinite(cand.position) && r.posicaoNoMercado != null) {
      aprovada.posicaoGlobal = cand.position;      // no fantasma: 8
      aprovada.position = r.posicaoNoMercado;      // no fantasma: 84
    }
    if (Number.isFinite(cand.impressions)) {
      aprovada.impressoesGlobais = cand.impressions;
      aprovada.impressions = r.impressoesNoMercado;
    }
    aprovadas.push(aprovada);
  }

  console.log(`   🔎 Filtro de realidade: ${aprovadas.length} de ${Math.min(candidatas.length, limite)} ${rotulo} passaram.`);
  for (const r of rejeitadas) {
    console.log(`      ⏭️ ${String(r.url).replace(GSC_SITE_URL, '/')} — ${r.motivo}`);
  }
  if (candidatas.length > limite) {
    // Nunca cortar em silêncio: quem lê o registo tem de saber que havia mais.
    console.log(`      (havia ${candidatas.length} ${rotulo}; conferidas as ${limite} com mais aparições)`);
  }
  return aprovadas;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mapeamento URL do GSC → arquivo do post
// ─────────────────────────────────────────────────────────────────────────────

export function listPostFiles() {
  if (!existsSync(POSTS_DIR)) return [];
  return readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));
}

function fileSlug(file) {
  return file.replace(/\.md$/, '').toLowerCase();
}
function baseSlug(file) {
  return file.replace(/^(en-|es-)/, '').replace(/\.md$/, '').toLowerCase();
}

/** Extrai { locale, slug } de uma URL/― caminho do GSC apontando para um post. */
function parsePostUrl(pageUrl) {
  let path;
  try {
    path = new URL(pageUrl).pathname;
  } catch {
    path = String(pageUrl);
  }
  path = path.replace(/\/+$/, '');
  const locale = path.startsWith('/en/') ? 'en' : path.startsWith('/es/') ? 'es' : 'pt';
  const idx = path.indexOf('/posts/');
  if (idx === -1) return null;
  const slug = decodeURIComponent(path.slice(idx + '/posts/'.length)).toLowerCase();
  if (!slug || slug.includes('/')) return null;
  return { locale, slug };
}

/**
 * Resolve a URL do GSC para o arquivo do post (casa com/sem prefixo de locale,
 * já que os slugs públicos do repo não são 1:1 com o nome do arquivo).
 * Retorna o filename ou null.
 */
export function pageUrlToFile(pageUrl) {
  const parsed = parsePostUrl(pageUrl);
  if (!parsed) return null;
  for (const file of listPostFiles()) {
    if (localeFromFilename(file) !== parsed.locale) continue;
    if (fileSlug(file) === parsed.slug || baseSlug(file) === parsed.slug) return file;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Leitura / patch cirúrgico de frontmatter
// ─────────────────────────────────────────────────────────────────────────────

export function readRaw(file) {
  return readFileSync(join(POSTS_DIR, file), 'utf-8');
}

/** Lê um escalar de nível 0 do frontmatter (desaspado) ou null. */
export function getScalar(fm, key) {
  const m = fm.match(new RegExp(`^${key}:[ \\t]*(.*)$`, 'm'));
  if (!m) return null;
  let v = m[1].trim();
  if (v.startsWith('"') && v.endsWith('"')) { try { v = JSON.parse(v); } catch { v = v.slice(1, -1); } }
  return v;
}

/** Lê um escalar aninhado (indentado), ex.: seo.metaTitle. */
export function getNested(fm, key) {
  const m = fm.match(new RegExp(`^[ \\t]+${key}:[ \\t]*(.*)$`, 'm'));
  if (!m) return null;
  let v = m[1].trim();
  if (v.startsWith('"') && v.endsWith('"')) { try { v = JSON.parse(v); } catch { v = v.slice(1, -1); } }
  return v;
}

const q = s => JSON.stringify(String(s));

function setTopScalar(fm, key, value) {
  const re = new RegExp(`^(${key}:[ \\t]*).*$`, 'm');
  if (re.test(fm)) return fm.replace(re, `$1${q(value)}`);
  return null; // não existe
}
function ensureTopScalar(fm, key, value) {
  const set = setTopScalar(fm, key, value);
  if (set !== null) return set;
  // Insere logo após publishedAt: (se houver), senão no fim do frontmatter.
  const line = `${key}: ${q(value)}`;
  if (/^publishedAt:.*$/m.test(fm)) return fm.replace(/^(publishedAt:.*)$/m, `$1\n${line}`);
  return fm.replace(/\s*$/, '') + `\n${line}`;
}
function setNestedScalar(fm, key, value) {
  const re = new RegExp(`^([ \\t]+${key}:[ \\t]*).*$`, 'm');
  if (re.test(fm)) return fm.replace(re, `$1${q(value)}`);
  return null;
}

function reconstruct(split) {
  return `---${split.eol}${split.fm}${split.eol}---${split.eol}${split.body}`;
}

/**
 * Aplica um patch de frontmatter e/ou corpo e ESCREVE o arquivo (respeitando
 * DRY_RUN). patch: { title, description, seoTitle, seoDescription, updatedAt, newBody }.
 * Retorna { changed, raw } (raw = conteúdo novo, mesmo em dry-run).
 */
export function writePatched(file, split, patch) {
  let fm = split.fm;
  let body = patch.newBody != null ? patch.newBody : split.body;
  if (patch.title != null) { const r = setTopScalar(fm, 'title', patch.title); if (r) fm = r; }
  if (patch.description != null) { const r = setTopScalar(fm, 'description', patch.description); if (r) fm = r; }
  if (patch.seoTitle != null) { const r = setNestedScalar(fm, 'metaTitle', patch.seoTitle); if (r) fm = r; }
  if (patch.seoDescription != null) { const r = setNestedScalar(fm, 'metaDescription', patch.seoDescription); if (r) fm = r; }
  if (patch.updatedAt != null) fm = ensureTopScalar(fm, 'updatedAt', patch.updatedAt);

  const raw = reconstruct({ ...split, fm, body });
  const changed = raw !== reconstruct(split);
  if (changed && !DRY_RUN) writeFileSync(join(POSTS_DIR, file), raw);
  return { changed, raw };
}

// ─────────────────────────────────────────────────────────────────────────────
// TRAVAS anti-degradação
// ─────────────────────────────────────────────────────────────────────────────

/** Limpa uma linha vinda da IA (aspas, markdown, numeração, múltiplas linhas). */
export function sanitizeLine(s) {
  if (!s) return '';
  let v = String(s).split('\n')[0].trim();
  v = v.replace(/^["'`]+|["'`]+$/g, '');           // aspas/acento grave nas pontas
  v = v.replace(/^\s*[-*]\s+/, '').replace(/^\s*\d+[.)]\s+/, ''); // marcador de lista
  v = v.replace(/\*\*(.*?)\*\*/g, '$1').replace(/[*_`#]/g, '');   // ênfase markdown
  return v.replace(/\s+/g, ' ').trim();
}

const wordCount = t => (String(t).trim().match(/\S+/g) || []).length;
/** Detecta números financeiros (R$, %, ano) — usado para bloquear fabricação. */
const FINANCIAL_NUM_RE = /(R\$\s?\d|US\$\s?\d|€\s?\d|\d+([.,]\d+)?\s?%|\b(19|20)\d{2}\b)/;
/** Datas completas (27/09/2026, 27-09-2026, 2026-09-27). */
const DATA_RE = /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2})\b/;

/**
 * Espaços que o olho não vê e a busca não casa.
 *
 * O blog tem números escritos com ESPAÇO ESTREITO SEM QUEBRA (U+202F) entre o
 * valor e o `%` — `120 %` parece `120%` e não casa numa comparação literal.
 * Sem esta normalização a trava dá falso alarme em número que EXISTE no artigo,
 * e falso alarme repetido é o caminho mais curto para alguém desligar a trava.
 */
const normaliza = s => String(s)
  .replace(/[\u202F\u00A0\u2007\u2009]/g, ' ')   // espacos exoticos -> espaco normal
  .replace(/\s+/g, ' ')
  // ⚠️ E AGORA TIRAR O ESPACO DE VEZ, entre o numero e o `%` e entre o simbolo
  // de moeda e o numero. Trocar U+202F por um espaco comum NAO resolve: o artigo
  // continua a dizer `120 %` e a meta `120%`, e a comparacao literal falha do
  // mesmo jeito. A 1a versao desta funcao fazia so a troca e deu FALSO ALARME no
  // teste — o 120% existia no artigo e a trava dizia que era inventado. Falso
  // alarme repetido e o caminho mais curto para alguem desligar a trava.
  .replace(/(\d)\s+%/g, '$1%')
  .replace(/(R\$|US\$|€)\s+(\d)/g, '$1$2');

/**
 * Números e datas presentes em `texto` que NÃO existem em `corpoOriginal`.
 *
 * ⚠️ UMA RÉGUA, DOIS CLIENTES. Até 15/09/2026 esta verificação existia só dentro
 * de `buildSafeSection` — ou seja, uma seção nova de artigo não podia inventar um
 * número, mas o TÍTULO e a META podiam. E foi o que aconteceu: o `gsc-otimizar-ctr`
 * reescreveu a página das cotações da semana de **07/09/2026** e anunciou na meta
 * *"a cotação do dólar para **27/09/2026** … e a projeção"* — uma data no futuro,
 * que não está no artigo, e uma projeção que o artigo não faz. É a família de
 * defeito nº1 desta casa: a mesma pergunta com duas réguas em ficheiros
 * diferentes. Agora é esta função, e os dois chamam-na.
 *
 * O ANO foi deliberadamente deixado de fora da comparação de datas: "2026" aparece
 * em quase todos os títulos deste blog e já é coberto pelo FINANCIAL_NUM_RE.
 */
export function numerosFabricados(texto, corpoOriginal) {
  const alvo = normaliza(corpoOriginal);
  const t = normaliza(texto);
  const achados = [
    ...(t.match(new RegExp(FINANCIAL_NUM_RE, 'g')) || []),
    ...(t.match(new RegExp(DATA_RE, 'g')) || []),
  ];
  const fora = [];
  for (const n of achados) {
    const limpo = n.trim();
    if (!alvo.includes(limpo) && !fora.includes(limpo)) fora.push(limpo);
  }
  return fora;
}

/** Título válido? 20–65 chars, não vazio, e mantém ≥1 token do tema original. */
export function validateTitle(newTitle, oldTitle) {
  const t = sanitizeLine(newTitle);
  if (t.length < 20 || t.length > 65) return { ok: false, reason: `comprimento ${t.length} fora de 20–65` };
  const a = coreTokens(slugifyTheme(t));
  const b = coreTokens(slugifyTheme(oldTitle || ''));
  const shared = [...a].filter(x => b.has(x)).length;
  if (b.size > 0 && shared === 0) return { ok: false, reason: 'perdeu todo o núcleo temático do título original' };
  return { ok: true, value: t };
}

/** Meta description válida? 80–165 chars. */
export function validateDescription(newDesc) {
  const d = sanitizeLine(newDesc);
  if (d.length < 80 || d.length > 165) return { ok: false, reason: `comprimento ${d.length} fora de 80–165` };
  return { ok: true, value: d };
}

/**
 * Constrói uma seção append-only validada. Retorna { ok, section } ou { ok:false }.
 * Travas: heading não duplicado; corpo 80–320 palavras; SEM números financeiros
 * novos que não existam no post (anti-fabricação); markdown simples.
 */
export function buildSafeSection(heading, text, originalBody) {
  const h = sanitizeLine(heading);
  if (h.length < 6 || h.length > 80) return { ok: false, reason: `heading inválido (${h.length} chars)` };
  const lowerBody = originalBody.toLowerCase();
  if (lowerBody.includes(`## ${h.toLowerCase()}`)) return { ok: false, reason: 'heading já existe no post' };

  const clean = String(text).trim().replace(/\r\n/g, '\n');
  const wc = wordCount(clean);
  if (wc < 80 || wc > 320) return { ok: false, reason: `corpo com ${wc} palavras (fora de 80–320)` };

  // Anti-fabricação: números financeiros na seção nova precisam já existir no post.
  // Passa pela régua única (ver `numerosFabricados`) — que também apanha datas e
  // já normaliza o espaço invisível. Mais apertada que antes nas datas, mais
  // tolerante nos falsos alarmes de `120 %`.
  const fabricados = numerosFabricados(clean, originalBody);
  if (fabricados.length) {
    return { ok: false, reason: `número financeiro potencialmente fabricado: "${fabricados[0]}"` };
  }
  return { ok: true, section: `## ${h}\n\n${clean}\n` };
}

/**
 * Insere a seção antes do marcador <!-- SCHEMA_AUTO --> (se houver) ou no fim do
 * corpo. Garante crescimento (append-only) e preserva o corpo original inteiro.
 * Retorna { ok, newBody }.
 */
export function appendSection(originalBody, section) {
  const eolBody = originalBody.replace(/\s*$/, '');
  const schemaIdx = eolBody.indexOf('<!-- SCHEMA_AUTO:');
  let newBody;
  if (schemaIdx !== -1) {
    const before = eolBody.slice(0, schemaIdx).replace(/\s*$/, '');
    const schema = eolBody.slice(schemaIdx);
    newBody = `${before}\n\n${section}\n${schema}\n`;
  } else {
    newBody = `${eolBody}\n\n${section}\n`;
  }
  // Trava: o corpo original inteiro precisa continuar presente e o texto crescer.
  const strippedOriginal = eolBody.replace('<!-- SCHEMA_AUTO:', ' ');
  void strippedOriginal;
  if (wordCount(newBody) <= wordCount(originalBody)) return { ok: false, reason: 'corpo não cresceu' };
  return { ok: true, newBody };
}

// ─────────────────────────────────────────────────────────────────────────────
// Gate i18n + commit (com rollback)
// ─────────────────────────────────────────────────────────────────────────────

/** Roda o validador i18n do repo. true = passou. */
export function i18nGatePasses() {
  try {
    execSync('node src/scripts/validacao/validar-i18n.js', { stdio: 'pipe' });
    return true;
  } catch (e) {
    console.log('⚠️ Gate i18n falhou:', (e.stdout || e.message || '').toString().slice(-400));
    return false;
  }
}

/** Restaura arquivos ao estado do HEAD (rollback de edições não commitadas). */
export function revertFiles(files) {
  if (!files.length) return;
  try { execSync(`git checkout -- ${files.map(f => `"src/content/posts/${f}"`).join(' ')}`, { stdio: 'pipe' }); }
  catch { /* ignore */ }
}

/** git add (whitelist) + commit se houver diff. Não faz push (workflow faz). */
export function commitFiles(paths, message) {
  if (DRY_RUN) { console.log(`   [dry-run] commit pulado: ${message}`); return false; }
  if (!paths.length) return false;
  const quoted = paths.map(p => `"${p}"`).join(' ');
  try {
    execSync(`git add ${quoted}`, { stdio: 'pipe' });
    const staged = execSync('git diff --cached --name-only', { stdio: 'pipe' }).toString().trim();
    if (!staged) return false;
    execSync(`git -c commit.gpgsign=false commit -m ${JSON.stringify(message)}`, { stdio: 'pipe' });
    console.log(`   ✅ commit: ${message}`);
    return true;
  } catch (e) {
    console.log('   ⚠️ commit falhou:', (e.stderr || e.message || '').toString().slice(-300));
    return false;
  }
}
