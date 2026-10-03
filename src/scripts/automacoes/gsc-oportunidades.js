/**
 * gsc-oportunidades.js — FASE 1 do Motor de Conteúdo guiado por GSC (Seção 42.10).
 *
 * Puxa métricas REAIS do Google Search Console (últimos 28 dias) e calcula um
 * digest priorizado de OPORTUNIDADES — sem gerar nem otimizar conteúdo (isso é
 * Fase 2/3). Escreve:
 *   - .github/data/gsc-oportunidades.json  (saída estruturada, consumida pelas próximas fases)
 *   - press/gsc-oportunidades.md           (relatório legível)
 *
 * Categorias de oportunidade:
 *   1. striking-distance  → queries na posição 5–20 com impressões (perto da 1ª página).
 *   2. CTR baixo          → boa posição (≤10) mas CTR abaixo do esperado (heurística).
 *   3. lacunas (gaps)     → query com impressão SEM página dedicada (reusa seo-guard).
 *   4. canibalização      → ≥2 páginas competindo pela MESMA query no GSC.
 *
 * SKIP GRACIOSO: sem GSC_SERVICE_ACCOUNT_JSON, sai com exit 0 SEM sobrescrever os
 * outputs existentes (padrão do repo). Não fabrica dados: se o GSC voltar vazio
 * (blog novo, dados magros), marca hasData=false e diz "aguardando dados".
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { hasGscCredentials, querySearchAnalytics, GSC_SITE_URL } from '../apis/gsc.js';
import { slugifyTheme, coreTokens, jaccardSim, getExistingPtSlugs } from '../lib/seo-guard.js';
import { avaliarRealidadeDe, FILTRO_REALIDADE_LIGADO } from '../lib/gsc-posts.js';

// ── Config / thresholds (baixos de propósito: GSC recém-ativado, dados magros) ──
const LOOKBACK_DAYS = 28;
const IMP_MIN = 3;                 // impressões mínimas p/ considerar uma query relevante
const STRIKING_MIN_POS = 5;        // posição mínima da faixa striking-distance
const STRIKING_MAX_POS = 20;       // posição máxima da faixa striking-distance
const GOOD_POS_MAX = 10;           // "boa posição" p/ análise de CTR
const CTR_RATIO_FLAG = 0.5;        // CTR abaixo de 50% do esperado = oportunidade
const CANNIBAL_MIN_IMP = 2;        // impressões mínimas por página p/ contar na canibalização
const TOP_N = 25;                  // teto de itens por categoria no output

const DATA_DIR = join(process.cwd(), '.github', 'data');
const PRESS_DIR = join(process.cwd(), 'press');
const JSON_OUT = join(DATA_DIR, 'gsc-oportunidades.json');
const MD_OUT = join(PRESS_DIR, 'gsc-oportunidades.md');

/** CTR esperado por posição (heurística de priorização — NÃO é dado do GSC). */
function expectedCtr(position) {
  const p = Math.round(position);
  const curve = {
    1: 0.28, 2: 0.15, 3: 0.11, 4: 0.08, 5: 0.06,
    6: 0.05, 7: 0.04, 8: 0.032, 9: 0.028, 10: 0.025,
  };
  if (p <= 0) return curve[1];
  if (p <= 10) return curve[p];
  return 0.02; // posições 11+ com baixa expectativa
}

function fmtDate(d) {
  return d.toISOString().split('T')[0];
}

function dateRange() {
  const end = new Date();
  const start = new Date(end.getTime() - LOOKBACK_DAYS * 86400000);
  return { startDate: fmtDate(start), endDate: fmtDate(end) };
}

/** Uma query já tem página dedicada? (reusa a lógica de tokens do seo-guard) */
function hasDedicatedPage(query, slugs) {
  const qSlug = slugifyTheme(query);
  if (!qSlug) return true; // query vazia/estranha: não tratar como lacuna
  const qCore = coreTokens(qSlug);
  if (qCore.size === 0) return true;
  // Queries de 1 token (head terms: "dolar", "pix") não alcançam 2 compartilhados;
  // exige min(2, nº de tokens) para não marcá-las como lacuna indevidamente.
  const need = Math.min(2, qCore.size);
  for (const slug of slugs) {
    const core = coreTokens(slug);
    const shared = [...qCore].filter(x => core.has(x));
    if (shared.length >= need || jaccardSim(qCore, core) >= 0.5) return true;
  }
  return false;
}

/**
 * query → páginas que a servem, da que mais impressões tem para a que menos.
 *
 * O relatório PEDE ao GSC as linhas `query + page` (10 mil delas) e até aqui só as
 * usava para a canibalização — as três primeiras categorias gravavam a busca e
 * **jogavam a página fora**. Consequência medida em 15/09/2026: a maior
 * oportunidade do blog (*"como reduzir gastos mensais"*, 1.161 impressões, 36% de
 * tudo, posição 8, zero cliques) esteve no relatório por semanas **sem que fosse
 * possível saber que página consertar**. Chegou-se a assumir uma página por
 * parecença de nome, e a corrida real do otimizador apontou outra.
 *
 * É a mesma família do defeito consertado no mesmo dia no `gsc-otimizar-ctr.js`:
 * quem mede por BUSCA e quem conserta por PÁGINA não falavam a mesma língua. O dado
 * já vinha na resposta; só não era guardado.
 */
function pagesByQuery(queryPageRows) {
  const map = new Map();
  for (const r of queryPageRows) {
    const [query, page] = r.keys;
    if (!map.has(query)) map.set(query, []);
    map.get(query).push({ page, impressions: r.impressions, clicks: r.clicks, position: Number(r.position.toFixed(1)) });
  }
  for (const pages of map.values()) pages.sort((a, b) => b.impressions - a.impressions);
  return map;
}

/** As páginas de uma busca, no teto de 3 — o suficiente para saber onde mexer. */
function topPages(map, query) {
  return (map.get(query) || []).slice(0, 3);
}

function analyze(queryRows, queryPageRows) {
  const slugs = getExistingPtSlugs();
  const paginas = pagesByQuery(queryPageRows);

  // 1. Striking distance — posição 5–20 com impressões.
  const strikingDistance = queryRows
    .filter(r => r.impressions >= IMP_MIN && r.position >= STRIKING_MIN_POS && r.position <= STRIKING_MAX_POS)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, TOP_N)
    .map(r => ({
      query: r.keys[0],
      impressions: r.impressions,
      clicks: r.clicks,
      position: Number(r.position.toFixed(1)),
      ctr: Number((r.ctr * 100).toFixed(2)),
      pages: topPages(paginas, r.keys[0]),
    }));

  // 2. CTR baixo — boa posição, CTR muito abaixo do esperado.
  const lowCtr = queryRows
    .filter(r => r.impressions >= IMP_MIN && r.position <= GOOD_POS_MAX && r.ctr < expectedCtr(r.position) * CTR_RATIO_FLAG)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, TOP_N)
    .map(r => ({
      query: r.keys[0],
      impressions: r.impressions,
      clicks: r.clicks,
      position: Number(r.position.toFixed(1)),
      ctr: Number((r.ctr * 100).toFixed(2)),
      expectedCtr: Number((expectedCtr(r.position) * 100).toFixed(2)),
      pages: topPages(paginas, r.keys[0]),
    }));

  // 3. Lacunas — query com impressão sem página dedicada.
  const gaps = queryRows
    .filter(r => r.impressions >= IMP_MIN && !hasDedicatedPage(r.keys[0], slugs))
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, TOP_N)
    .map(r => ({
      query: r.keys[0],
      impressions: r.impressions,
      clicks: r.clicks,
      position: Number(r.position.toFixed(1)),
      suggestedSlug: slugifyTheme(r.keys[0]),
      // Uma lacuna não tem página DEDICADA, mas costuma ter uma página a
      // aparecer por acidente. Saber qual é muda a decisão: às vezes é melhor
      // reforçar a que já aparece do que escrever um post novo.
      pages: topPages(paginas, r.keys[0]),
    }));

  // 4. Canibalização por query — ≥2 páginas competindo pela mesma query.
  const byQuery = new Map();
  for (const r of queryPageRows) {
    if (r.impressions < CANNIBAL_MIN_IMP) continue;
    const [query, page] = r.keys;
    if (!byQuery.has(query)) byQuery.set(query, []);
    byQuery.get(query).push({ page, impressions: r.impressions, clicks: r.clicks, position: Number(r.position.toFixed(1)) });
  }
  const cannibalization = [...byQuery.entries()]
    .filter(([, pages]) => pages.length >= 2)
    .map(([query, pages]) => ({
      query,
      totalImpressions: pages.reduce((s, p) => s + p.impressions, 0),
      pages: pages.sort((a, b) => b.impressions - a.impressions),
    }))
    .sort((a, b) => b.totalImpressions - a.totalImpressions)
    .slice(0, TOP_N);

  return { strikingDistance, lowCtr, gaps, cannibalization };
}

/**
 * ♦ 03/10/2026 — CONSERTO Nº7: O RELATÓRIO QUE O DONO LÊ DEIXA DE MENTIR.
 *
 * 🔴 **Foi deste ficheiro que saiu o maior engano da casa.** Durante três semanas
 * ele anunciou, em letra bem grande:
 *
 *     "como reduzir gastos mensais" — 1.161 impressões, POSIÇÃO 8, ZERO cliques
 *
 * Isso guiou o SEO de setembro inteiro, e a 02/10 uma avaliação externa leu o
 * mesmo número e repetiu a mesma conclusão. **A verdade medida:** 1.161 daquelas
 * impressões aconteceram em sete dias, 1.163 em computador contra 1 em telemóvel,
 * vindas de França, Alemanha, Marrocos e Argélia — numa busca em português, com o
 * Brasil fora do top 10. **No Brasil, a página estava na posição 84.**
 *
 * A 02/10 os robôs que AGEM ganharam o filtro de realidade. Este, que não age mas
 * é o que **o Ed lê**, continuou a mostrar o número global — ou seja: o código
 * ficou curado e o papel continuou a enganar. É o que esta função conserta.
 *
 * ⚠️ **Teto de propósito:** cada busca conferida custa duas perguntas ao Google, e
 * ninguém lê 25 linhas de um relatório. Conferem-se as `LIMITE_REALIDADE` com mais
 * impressões de cada categoria — que são as que alguém olharia — e **o relatório
 * diz quantas ficaram por conferir**. Cortar em silêncio é o que se está a corrigir.
 */
const LIMITE_REALIDADE = 10;

/** O idioma da página que serve a busca — para saber qual é o mercado dela. */
function idiomaDaBusca(o) {
  const p = o.pages?.[0]?.page || '';
  return p.includes('/en/') ? 'en' : p.includes('/es/') ? 'es' : 'pt';
}

async function conferirRealidade(lista, period, rotulo) {
  if (!FILTRO_REALIDADE_LIGADO) {
    console.log(`   ⚠️ Filtro de realidade DESLIGADO — ${rotulo} vai sem conferência.`);
    return { conferidas: 0, porConferir: lista.length };
  }
  let conferidas = 0;
  for (const o of lista.slice(0, LIMITE_REALIDADE)) {
    try {
      const r = await avaliarRealidadeDe({
        dimensao: 'query', valor: o.query, period, locale: idiomaDaBusca(o),
      });
      o.realidade = {
        ok: r.ok,
        // ⚠️ `razao` é o que escolhe o SELO. Esqueci-o na primeira versão e o
        // relatório voltou a carimbar 🤖 em tudo, com a legenda nova por cima a
        // prometer quatro estados — pior do que não ter os quatro.
        razao: r.razao || null,
        motivo: r.motivo,
        posicaoNoMercado: r.posicaoNoMercado != null ? Number(r.posicaoNoMercado.toFixed(1)) : null,
        impressoesNoMercado: r.impressoesNoMercado ?? null,
        fracaoDoMercado: r.fracaoDoMercado != null ? Number((r.fracaoDoMercado * 100).toFixed(0)) : null,
        fracaoMovel: r.fracaoMovel != null ? Number((r.fracaoMovel * 100).toFixed(0)) : null,
      };
      conferidas++;
    } catch (e) {
      // Falhar a conferir não é prova de que o número é bom — fica dito assim.
      o.realidade = { ok: false, razao: 'erro', motivo: `não deu para conferir (${String(e.message).slice(0, 60)})` };
    }
  }
  const porConferir = Math.max(0, lista.length - conferidas);
  console.log(`   🔎 Realidade: ${conferidas} busca(s) de ${rotulo} conferida(s)`
    + (porConferir ? `, ${porConferir} por conferir (teto de ${LIMITE_REALIDADE})` : ''));
  return { conferidas, porConferir };
}

/**
 * A marca que vai na tabela — e **cada uma pede uma acção diferente**.
 *
 * 🔴 **Isto nasceu de um erro meu, apanhado na primeira corrida a sério
 * (03/10/2026, corrida 37106203626).** A primeira versão tinha dois selos, e
 * carimbava *«não é oportunidade»* em buscas que apenas **ainda não têm gente
 * suficiente** — *«o que significa saldo pendente»*, com 17 aparições no Brasil, é
 * procura legítima e pequena. Chamar-lhe robô é **acusação falsa**, e é o mesmo
 * defeito contra o qual esta trava foi escrita.
 *
 * *«Não sei»* e *«é falso»* são conclusões diferentes. Uma manda esperar, a outra
 * manda ignorar — e uma terceira manda procurar backlinks em vez de mexer no
 * título. Juntá-las num símbolo só devolve o relatório à mentira que ele existe
 * para corrigir.
 */
function selo(o) {
  if (!o.realidade) return '·';
  if (o.realidade.ok) return '✅';
  switch (o.realidade.razao) {
    case 'amostra': return '⏳';   // pouca gente ainda — esperar, não acusar
    case 'posicao': return '📉';   // aparece, mas lá atrás — é backlink, não título
    case 'erro': return '⚠️';     // não deu para conferir — e isso não é aprovação
    default: return '🤖';          // mercado, aparelho ou pico: não é o nosso público
  }
}

/**
 * A posição que **conta** — a do mercado da página. `—` quando não foi conferida.
 *
 * ⚠️ Nunca mostrar só esta nem só a global: é a DIFERENÇA entre as duas que conta
 * a história. No caso que enganou a casa, era **8 global contra 84 no Brasil**.
 */
function posicaoReal(o) {
  const p = o.realidade?.posicaoNoMercado;
  if (p == null) return '—';
  const salto = Math.abs(p - o.position) >= 20 ? ' 🔴' : '';
  return `**${p}**${salto}`;
}

/** Explica os selos uma vez, no topo — e diz se o filtro está desligado. */
function legendaDaRealidade(opportunities) {
  const conferidas = [...opportunities.strikingDistance, ...opportunities.lowCtr].filter(o => o.realidade).length;
  if (!FILTRO_REALIDADE_LIGADO) {
    return '> ⚠️ **O filtro de realidade está DESLIGADO** (`GSC_FILTRO_REALIDADE=0`). Os números abaixo são os globais, sem conferência — foi assim que a casa perseguiu um fantasma durante três semanas em setembro.\n\n';
  }
  if (!conferidas) return '';
  return '> **Como ler — cada marca pede uma coisa diferente:**\n'
    + '>\n'
    + '> | | O que é | O que fazer |\n'
    + '> |---|---|---|\n'
    + '> | ✅ | procura real, do nosso mercado | **mexer no título vale a pena** |\n'
    + '> | ⏳ | ainda com pouca gente para dizer | **esperar** — não é defeito, é cedo |\n'
    + '> | 📉 | aparece, mas lá atrás na busca | **é backlink, não título** |\n'
    + '> | 🤖 | tráfego que não é o nosso público | **ignorar** |\n'
    + '> | ⚠️ | não deu para conferir | tratar como não conferida |\n'
    + '> | · | fora do teto de conferência | os números são os globais |\n'
    + '>\n'
    + '> A coluna **Posição NO MERCADO** é a que conta. 🔴 marca as que saltam 20 posições ou mais entre a global e a real — foi uma dessas (**8 global, 84 no Brasil**) que guiou o SEO de setembro para o lado errado.\n\n';
}

/** O porquê de cada 🤖, por baixo da tabela — um filtro que corta calado não serve. */
function notasDaRealidade(lista) {
  const semConferir = lista.filter(o => !o.realidade).length;
  let md = '';

  // ⚠️ Separadas de propósito: juntar «é falso» com «ainda não sei» num bloco só
  // era exactamente o defeito da primeira versão (ver `selo`).
  const fantasmas = lista.filter(o => o.realidade && !o.realidade.ok
    && ['mercado', 'aparelho', 'pico'].includes(o.realidade.razao));
  const cedo = lista.filter(o => o.realidade?.razao === 'amostra');
  const atras = lista.filter(o => o.realidade?.razao === 'posicao');

  if (fantasmas.length) {
    md += `\n**🤖 Não é oportunidade — o tráfego não é o nosso público:**\n`;
    for (const o of fantasmas) md += `- **${o.query}** — ${o.realidade.motivo}\n`;
  }
  if (atras.length) {
    md += `\n**📉 Aparece, mas lá atrás — trabalhar o título aqui não muda nada:**\n`;
    for (const o of atras) md += `- **${o.query}** — ${o.realidade.motivo}\n`;
  }
  if (cedo.length) {
    md += `\n**⏳ Ainda cedo para dizer (não é defeito):** ${cedo.map(o => `\`${o.query}\``).join(' · ')}\n`;
  }
  if (semConferir) {
    // Nunca cortar em silêncio: quem lê tem de saber que há linhas por conferir.
    md += `\n_${semConferir} busca(s) abaixo do teto de ${LIMITE_REALIDADE} não foram conferidas — os números delas são os globais._\n`;
  }
  return md;
}

/**
 * O caminho da página que mais serve a busca, sem o domínio — é o que se precisa
 * para achar o ficheiro. `—` quando o GSC não devolveu par busca+página.
 */
function paginaPrincipal(o) {
  const p = o.pages?.[0]?.page;
  if (!p) return '—';
  return p.replace(/^https?:\/\/[^/]+/, '') || '/';
}

function buildReport({ period, totals, opportunities, hasData, generatedAt }) {
  let md = `# 🔎 GSC — Digest de Oportunidades (Fase 1)\n\n`;
  md += `**Propriedade:** ${GSC_SITE_URL}\n`;
  md += `**Período:** ${period.startDate} → ${period.endDate} (${LOOKBACK_DAYS} dias)\n`;
  md += `**Gerado em:** ${generatedAt}\n\n`;

  if (!hasData) {
    md += `> ⏳ **Aguardando dados do GSC.** A propriedade foi verificada recentemente e ainda não há impressões suficientes no período. Este relatório se preenche sozinho conforme o blog ganha tráfego (motor de médio prazo — ver Seção 42.10). Nenhum dado foi inventado.\n`;
    return md;
  }

  md += `**Totais no período:** ${totals.queries} queries · ${totals.impressions} impressões · ${totals.clicks} cliques\n\n`;

  md += legendaDaRealidade(opportunities);

  md += `## 1. 🎯 Striking distance (posição ${STRIKING_MIN_POS}–${STRIKING_MAX_POS} — perto da 1ª página)\n\n`;
  if (opportunities.strikingDistance.length) {
    md += `| | Query | Impr. | Cliques | Posição GLOBAL | **Posição NO MERCADO** | CTR | Página |\n|---|---|---|---|---|---|---|---|\n`;
    for (const o of opportunities.strikingDistance) {
      md += `| ${selo(o)} | ${o.query} | ${o.impressions} | ${o.clicks} | ${o.position} | ${posicaoReal(o)} | ${o.ctr}% | \`${paginaPrincipal(o)}\` |\n`;
    }
    md += notasDaRealidade(opportunities.strikingDistance);
  } else md += `_Nenhuma no período._\n`;

  md += `\n## 2. 📉 CTR baixo (boa posição, poucos cliques — reescrever title/meta na Fase 2)\n\n`;
  if (opportunities.lowCtr.length) {
    md += `| | Query | Impr. | Posição GLOBAL | **Posição NO MERCADO** | CTR | CTR esperado | Página |\n|---|---|---|---|---|---|---|---|\n`;
    for (const o of opportunities.lowCtr) {
      md += `| ${selo(o)} | ${o.query} | ${o.impressions} | ${o.position} | ${posicaoReal(o)} | ${o.ctr}% | ~${o.expectedCtr}% | \`${paginaPrincipal(o)}\` |\n`;
    }
    md += notasDaRealidade(opportunities.lowCtr);
  } else md += `_Nenhuma no período._\n`;

  md += `\n## 3. 🕳️ Lacunas (busca com impressão SEM página dedicada — candidatas à Fase 3)\n\n`;
  if (opportunities.gaps.length) {
    md += `| Query | Impr. | Posição | Slug sugerido | Página que já aparece |\n|---|---|---|---|---|\n`;
    for (const o of opportunities.gaps) md += `| ${o.query} | ${o.impressions} | ${o.position} | \`${o.suggestedSlug}\` | \`${paginaPrincipal(o)}\` |\n`;
  } else md += `_Nenhuma no período._\n`;

  md += `\n## 4. 🔀 Canibalização por query (≥2 páginas na mesma busca — consolidar na Fase 2)\n\n`;
  if (opportunities.cannibalization.length) {
    for (const o of opportunities.cannibalization) {
      md += `- **${o.query}** (${o.totalImpressions} impr.): ${o.pages.map(p => `${p.page} (${p.impressions})`).join(' · ')}\n`;
    }
  } else md += `_Nenhuma no período._\n`;

  md += `\n---\n_CTR esperado é heurística de priorização, não dado do GSC. Gerado automaticamente pelo motor GSC (Fase 1)._\n`;
  return md;
}

async function main() {
  // Skip gracioso: sem credenciais, não sobrescreve nada e sai 0.
  if (!hasGscCredentials()) {
    console.log('ℹ️ GSC: credenciais ausentes (GSC_SERVICE_ACCOUNT_JSON). Pulando análise de oportunidades (exit 0).');
    return;
  }

  const period = dateRange();
  console.log(`🔎 GSC: consultando ${GSC_SITE_URL} (${period.startDate} → ${period.endDate})...`);

  const [queryRows, queryPageRows] = await Promise.all([
    querySearchAnalytics({ ...period, dimensions: ['query'], rowLimit: 5000 }),
    querySearchAnalytics({ ...period, dimensions: ['query', 'page'], rowLimit: 10000 }),
  ]);

  const hasData = queryRows.length > 0;
  const opportunities = hasData
    ? analyze(queryRows, queryPageRows)
    : { strikingDistance: [], lowCtr: [], gaps: [], cannibalization: [] };

  /**
   * ♦ 03/10/2026 — conserto nº7. Antes de o relatório sair, cada oportunidade é
   * **conferida contra a realidade**: de que mercado vêm as impressões, em que
   * aparelho, e se a procura ainda existe ou foi um pico que já passou.
   *
   * ⚠️ Só as duas categorias que afirmam «há aqui uma oportunidade de posição».
   * As **lacunas** não entram porque a pergunta delas é outra — *não existe página
   * para esta busca* — e isso é verdade venha o tráfego de onde vier. A
   * **canibalização** também não: duas páginas a competir é um problema de
   * estrutura do site, não de quem procura. Conferir tudo *«por consistência»*
   * seria copiar a conclusão em vez do critério.
   */
  if (hasData) {
    await conferirRealidade(opportunities.strikingDistance, period, 'striking distance');
    await conferirRealidade(opportunities.lowCtr, period, 'CTR baixo');
  }

  const totals = {
    queries: queryRows.length,
    pages: new Set(queryPageRows.map(r => r.keys[1])).size,
    impressions: queryRows.reduce((s, r) => s + (r.impressions || 0), 0),
    clicks: queryRows.reduce((s, r) => s + (r.clicks || 0), 0),
  };

  const generatedAt = new Date().toISOString();
  const payload = { generatedAt, siteUrl: GSC_SITE_URL, period, hasData, totals, opportunities };

  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(PRESS_DIR)) mkdirSync(PRESS_DIR, { recursive: true });
  writeFileSync(JSON_OUT, JSON.stringify(payload, null, 2) + '\n');
  writeFileSync(MD_OUT, buildReport(payload));

  console.log(`✅ GSC: ${totals.queries} queries · ${totals.impressions} impressões.`);
  console.log(`   Oportunidades → striking:${opportunities.strikingDistance.length} · ctr-baixo:${opportunities.lowCtr.length} · lacunas:${opportunities.gaps.length} · canibalização:${opportunities.cannibalization.length}`);
  console.log(`   Escrito: ${JSON_OUT} + ${MD_OUT}`);
  if (!hasData) console.log('   (Sem impressões ainda — relatório marcado como "aguardando dados". Normal p/ GSC recém-ativado.)');
}

main().catch(err => {
  console.error('❌ GSC: erro na análise de oportunidades:', err.message);
  process.exit(1);
});
