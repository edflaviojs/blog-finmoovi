import { config } from '../../../site.config.ts';
/**
 * Índice FinMoovi do Custo de Vida (PT + EN + ES) — série MENSAL
 * Executa via GitHub Actions no dia 13 de cada mês (mês de referência = anterior).
 *
 * Versão-PONTE com DADOS PÚBLICOS 100% verificáveis:
 *   1. IPCA do mês por grupo de despesa — API SIDRA/IBGE, tabela 7060
 *      (v63 = variação mensal, v2265 = acumulada em 12 meses, c315 = grupos).
 *   2. Cotações de FECHAMENTO do mês (USD/EUR→BRL) — getMonthCloseRates()
 *      do módulo compartilhado exchange-rate.js (AwesomeAPI, com fallback).
 *   3. Tabelas markdown DETERMINÍSTICAS — números NUNCA passam pelo LLM.
 *   4. LLM escreve apenas: parágrafo-resposta (40-60 palavras), destaques,
 *      "Como se proteger" e "## Perguntas frequentes".
 *
 * Skip gracioso: se a API do IBGE estiver fora do ar ou o mês de referência
 * ainda não tiver sido publicado, emite ::warning:: e sai com exit 0 — o
 * workflow_dispatch permite rodar de novo manualmente.
 *
 * Flags:
 *   --dry-run  busca dados REAIS (IBGE + cotações), monta o post PT e IMPRIME
 *              o markdown sem salvar/commitar; sem chave de LLM local usa
 *              placeholders [NARRATIVA] nas seções escritas pela IA.
 */

import { generateText, generateCoverImage } from '../apis/kie-ai.js';
import { getMonthCloseRates } from '../apis/exchange-rate.js';
import { fixStaleYear } from '../lib/year-guard.js';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const POSTS_DIR = join(process.cwd(), 'src', 'content', 'posts');
const IMAGES_DIR = join(process.cwd(), 'public', 'images', 'posts');

const DRY_RUN = process.argv.includes('--dry-run');
const HAS_LLM = Boolean(
  process.env.CEREBRAS_API_KEY || process.env.GROQ_API_KEY || process.env.KIE_API_KEY ||
  (process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_AI_TOKEN)
);

// ---------------------------------------------------------------------------
// IBGE / SIDRA — IPCA por grupo de despesa (tabela 7060)
// ---------------------------------------------------------------------------

// Códigos da classificação c315 (Geral + 9 grupos) com nomes fixos por idioma
// (determinísticos — a tradução dos grupos NÃO passa pelo LLM).
const GROUPS = [
  { code: '7169', pt: 'Índice geral (IPCA)', en: 'Overall index (IPCA)', es: 'Índice general (IPCA)' },
  { code: '7170', pt: 'Alimentação e bebidas', en: 'Food and beverages', es: 'Alimentos y bebidas' },
  { code: '7445', pt: 'Habitação', en: 'Housing', es: 'Vivienda' },
  { code: '7486', pt: 'Artigos de residência', en: 'Household articles', es: 'Artículos del hogar' },
  { code: '7558', pt: 'Vestuário', en: 'Apparel', es: 'Vestuario' },
  { code: '7625', pt: 'Transportes', en: 'Transportation', es: 'Transportes' },
  { code: '7660', pt: 'Saúde e cuidados pessoais', en: 'Health and personal care', es: 'Salud y cuidados personales' },
  { code: '7712', pt: 'Despesas pessoais', en: 'Personal expenses', es: 'Gastos personales' },
  { code: '7766', pt: 'Educação', en: 'Education', es: 'Educación' },
  { code: '7786', pt: 'Comunicação', en: 'Communication', es: 'Comunicación' },
];

/**
 * Busca o IPCA do período (YYYYMM) por grupo na tabela 7060 do SIDRA.
 * v63 = variação mensal | v2265 = variação acumulada em 12 meses.
 * Retorna { '7169': { mensal: '0.16', acum12: '4.64' }, ... }.
 * Lança erro se a API estiver fora do ar ou o shape mudar (degrade gracioso
 * fica a cargo do chamador — ::warning:: + exit 0).
 */
async function fetchIpcaByGroup(period) {
  const codes = GROUPS.map(g => g.code).join(',');
  const url = `https://apisidra.ibge.gov.br/values/t/7060/n1/all/v/63,2265/p/${period}/c315/${codes}/d/v63%202,v2265%202?formato=json`;
  console.log(`📡 IBGE/SIDRA: ${url}`);

  const response = await fetch(url);
  if (!response.ok) throw new Error(`SIDRA respondeu HTTP ${response.status}`);
  const data = await response.json();

  // Shape esperado: array com [0] = header e demais linhas com D2C (variável),
  // D4C (grupo) e V (valor). Qualquer coisa diferente = API mudou/mês não saiu.
  if (!Array.isArray(data) || data.length < 2) {
    throw new Error(`SIDRA sem dados para o período ${period} (IPCA do mês ainda não publicado ou API mudou de shape)`);
  }

  const ipca = {};
  for (const row of data.slice(1)) {
    if (!row || typeof row !== 'object' || !row.D4C || !row.D2C) continue;
    const value = (row.V != null && /^-?\d+(\.\d+)?$/.test(String(row.V))) ? String(row.V) : null;
    ipca[row.D4C] = ipca[row.D4C] || {};
    if (row.D2C === '63') ipca[row.D4C].mensal = value;
    if (row.D2C === '2265') ipca[row.D4C].acum12 = value;
  }

  // Validação mínima: o índice geral do mês PRECISA existir.
  if (!ipca['7169'] || ipca['7169'].mensal == null) {
    throw new Error(`SIDRA retornou payload sem o índice geral do período ${period} (shape inesperado)`);
  }
  return ipca;
}

// ---------------------------------------------------------------------------
// Tabelas e textos determinísticos (números NUNCA passam pelo LLM)
// ---------------------------------------------------------------------------

const MONTHS = {
  pt: ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'],
  en: ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'],
  es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
};

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** Formata percentual: '0.16' → '0,16%' (pt/es) ou '0.16%' (en); null → '—'. */
function fmtPct(value, locale) {
  if (value == null) return '—';
  const s = Number(value).toFixed(2);
  return (locale === 'en' ? s : s.replace('.', ',')) + '%';
}

/** Tabela determinística: grupo | variação % no mês | acumulado 12 meses. */
function buildIpcaTable(ipca, locale) {
  const headers = {
    pt: '| Grupo de despesa | Variação no mês | Acumulado 12 meses |',
    en: '| Expense group | Monthly change | 12-month accumulated |',
    es: '| Grupo de gasto | Variación en el mes | Acumulado 12 meses |',
  };
  const rows = GROUPS.map(g => {
    const d = ipca[g.code] || {};
    return `| ${g[locale]} | ${fmtPct(d.mensal, locale)} | ${fmtPct(d.acum12, locale)} |`;
  });
  return [headers[locale], '| --- | --- | --- |', ...rows].join('\n');
}

/** Tabela determinística de cotações de fechamento do mês. */
function buildRatesTable(rates, locale) {
  const t = {
    pt: { h: '| Moeda | Fechamento do mês |', usd: 'Dólar (USD/BRL)', eur: 'Euro (EUR/BRL)' },
    en: { h: '| Currency | Month close |', usd: 'Dollar (USD/BRL)', eur: 'Euro (EUR/BRL)' },
    es: { h: '| Moneda | Cierre del mes |', usd: 'Dólar (USD/BRL)', eur: 'Euro (EUR/BRL)' },
  }[locale];
  return [t.h, '| --- | --- |', `| ${t.usd} | R$ ${rates.USDBRL} |`, `| ${t.eur} | R$ ${rates.EURBRL} |`].join('\n');
}

// Linha de metodologia FIXA (pedida pelo produto — não alterar via LLM).
const METHODOLOGY = {
  pt: 'Fontes: IPCA/IBGE (variação por grupo de despesa) e cotações AwesomeAPI de fechamento do mês. Índice editorial produzido pelo FinMoovi.',
  en: 'Sources: IPCA/IBGE (change by expense group) and AwesomeAPI month-close exchange rates. Editorial index produced by FinMoovi.',
  es: 'Fuentes: IPCA/IBGE (variación por grupo de gasto) y cotizaciones AwesomeAPI de cierre del mes. Índice editorial producido por FinMoovi.',
};

// Nota de rodapé sutil preparando edições futuras (SEM citar dados de usuários).
const FOOTNOTE = {
  pt: 'Nota: este é um índice editorial em evolução — as próximas edições poderão ganhar novos recortes e fontes públicas.',
  en: 'Note: this is an evolving editorial index — future editions may add new breakdowns and public sources.',
  es: 'Nota: este es un índice editorial en evolución — las próximas ediciones podrán sumar nuevos recortes y fuentes públicas.',
};

const HEADINGS = {
  pt: { ipca: 'IPCA de {m} por grupo de despesa', rates: 'Câmbio no fechamento de {m}', highlights: 'Destaques do mês', protect: 'Como se proteger', faq: 'Perguntas frequentes' },
  en: { ipca: 'IPCA for {m} by expense group', rates: 'Exchange rates at the close of {m}', highlights: 'Highlights of the month', protect: 'How to protect yourself', faq: 'Frequently Asked Questions' },
  es: { ipca: 'IPCA de {m} por grupo de gasto', rates: 'Tipo de cambio al cierre de {m}', highlights: 'Destacados del mes', protect: 'Cómo protegerse', faq: 'Preguntas frecuentes' },
};

const CTA = {
  pt: `**Quer ver o quanto a inflação mexe no SEU orçamento? [Experimente o ${config.app.name} de graça](${config.app.url}) — em 5 minutos você terá uma visão clara de para onde está indo seu dinheiro.**`,
  en: `**Want to see how inflation hits YOUR budget? [Try ${config.app.name} for free](${config.app.url}) — in 5 minutes you'll have a clear view of where your money is going.**`,
  es: `**¿Quieres ver cuánto afecta la inflación a TU presupuesto? [Prueba ${config.app.name} gratis](${config.app.url}) — en 5 minutos tendrás una visión clara de a dónde va tu dinero.**`,
};

// ---------------------------------------------------------------------------
// LLM — apenas as seções narrativas (nunca os números das tabelas)
// ---------------------------------------------------------------------------

function dataBlockForPrompt(ipca, rates, monthLabel) {
  const lines = GROUPS.map(g => {
    const d = ipca[g.code] || {};
    return `- ${g.pt}: ${d.mensal != null ? d.mensal + '% no mês' : 'sem dado'}${d.acum12 != null ? ` | ${d.acum12}% em 12 meses` : ''}`;
  });
  return `DADOS REAIS do IPCA de ${monthLabel} (IBGE) — use SOMENTE estes números, NÃO invente outros:\n${lines.join('\n')}\nCâmbio de fechamento do mês: dólar R$ ${rates.USDBRL}, euro R$ ${rates.EURBRL}.`;
}

function parseSections(raw) {
  const grab = (tag, next) => {
    const re = new RegExp(`---${tag}---\\s*([\\s\\S]*?)(?=---${next}---|$)`);
    const m = String(raw || '').match(re);
    return m ? m[1].trim() : '';
  };
  return {
    resposta: grab('RESPOSTA', 'DESTAQUES'),
    destaques: grab('DESTAQUES', 'PROTECAO'),
    protecao: grab('PROTECAO', 'FAQ'),
    faq: String(raw || '').match(/---FAQ---\s*([\s\S]*)$/)?.[1]?.trim() || '',
  };
}

async function generateSectionsPt(ipca, rates, monthLabel, year) {
  const prompt = `Você é o editor de finanças pessoais do blog ${config.brand.name}.
${dataBlockForPrompt(ipca, rates, `${monthLabel}/${year}`)}

Escreva em português brasileiro APENAS as seções abaixo, exatamente neste formato de delimitadores:

---RESPOSTA---
Um único parágrafo de 40-60 palavras respondendo diretamente "quanto subiu o custo de vida em ${monthLabel} de ${year}?", autossuficiente e citável (sem "neste artigo você verá"), citando a variação do índice geral.
---DESTAQUES---
2-3 destaques em markdown sobre o grupo que MAIS subiu e o que MAIS caiu (ou menos subiu) e o que isso significa no bolso do brasileiro. Use ### para cada destaque. Sem tabelas.
---PROTECAO---
Dicas acionáveis (lista markdown) para se proteger da inflação do mês, ligando ferramentas do blog: [Calculadora de Orçamento](/ferramentas/calculadora-orcamento/), [Calculadora de Reserva de Emergência](/ferramentas/calculadora-reserva/), [Conversor de Moedas](/ferramentas/conversor-moedas/) e [Simulador de Investimento](/ferramentas/simulador-investimento/). Sem inventar números.
---FAQ---
3-4 perguntas como H3 (###) com respostas diretas de 2-3 frases cada, sobre o IPCA de ${monthLabel}/${year} e custo de vida. NÃO repita o título "Perguntas frequentes" — apenas os H3.

Regras: não invente números além dos fornecidos; não use H1/H2; tom informativo e acessível.`;

  const raw = await generateText(prompt, { maxTokens: 1800, temperature: 0.5 });
  const sections = parseSections(raw);
  if (!sections.resposta || !sections.destaques || !sections.faq) {
    throw new Error('LLM não retornou as seções no formato esperado (RESPOSTA/DESTAQUES/PROTECAO/FAQ).');
  }
  return sections;
}

async function translateSections(sections, targetLang) {
  const langNames = { en: 'English', es: 'Spanish' };
  const prompt = `Translate the sections below to ${langNames[targetLang]}. Keep the exact same delimiters (---RESPOSTA---, ---DESTAQUES---, ---PROTECAO---, ---FAQ---), keep markdown formatting and ALL links exactly as-is (do not translate URLs), do NOT translate the brand name ${config.brand.name}, and do NOT change any numbers.

---RESPOSTA---
${sections.resposta}
---DESTAQUES---
${sections.destaques}
---PROTECAO---
${sections.protecao}
---FAQ---
${sections.faq}`;

  const raw = await generateText(prompt, { maxTokens: 2500, temperature: 0.3 });
  const out = parseSections(raw);
  // Fallback por seção: se a tradução vier mutilada, mantém o PT (nunca quebra o post).
  return {
    resposta: out.resposta || sections.resposta,
    destaques: out.destaques || sections.destaques,
    protecao: out.protecao || sections.protecao,
    faq: out.faq || sections.faq,
  };
}

// ---------------------------------------------------------------------------
// Montagem do post
// ---------------------------------------------------------------------------

function buildPost({ locale, sections, ipca, rates, refMonthIdx, refYear, dateStr, imagePath, translationKey }) {
  const monthName = MONTHS[locale][refMonthIdx];
  const monthLabel = cap(monthName);
  const h = HEADINGS[locale];
  const geral = fmtPct(ipca['7169'].mensal, locale);
  const geral12 = fmtPct(ipca['7169'].acum12, locale);

  const titles = {
    pt: `Índice FinMoovi do Custo de Vida — ${monthLabel}/${refYear}`,
    en: `FinMoovi Cost of Living Index — ${monthLabel}/${refYear}`,
    es: `Índice FinMoovi del Costo de Vida — ${monthLabel}/${refYear}`,
  };
  const descriptions = {
    pt: `IPCA de ${monthName}/${refYear} por grupo de despesa: índice geral em ${geral} no mês e ${geral12} em 12 meses. Câmbio de fechamento e dicas para proteger o bolso.`,
    en: `IPCA for ${monthLabel}/${refYear} by expense group: overall index at ${geral} in the month and ${geral12} over 12 months. Month-close exchange rates and tips to protect your budget.`,
    es: `IPCA de ${monthName}/${refYear} por grupo de gasto: índice general en ${geral} en el mes y ${geral12} en 12 meses. Cambio de cierre y consejos para proteger tu bolsillo.`,
  };
  const tags = {
    pt: ['custo de vida', 'ipca', 'inflação', 'cotações', 'orçamento'],
    en: ['cost of living', 'ipca', 'inflation', 'quotes', 'budget'],
    es: ['costo de vida', 'ipca', 'inflación', 'cotizaciones', 'presupuesto'],
  };
  const keywords = {
    pt: [`ipca ${monthName} ${refYear}`, 'índice de custo de vida', 'inflação por grupo de despesa', 'cotação dólar fechamento'],
    en: [`ipca ${monthName} ${refYear}`, 'cost of living index brazil', 'inflation by expense group', 'dollar closing rate'],
    es: [`ipca ${monthName} ${refYear}`, 'índice de costo de vida', 'inflación por grupo de gasto', 'cotización dólar cierre'],
  };
  const slugs = {
    pt: `indice-finmoovi-custo-de-vida-${MONTHS.pt[refMonthIdx].normalize('NFD').replace(/[̀-ͯ]/g, '')}-${refYear}`,
    en: `en-finmoovi-cost-of-living-index-${MONTHS.en[refMonthIdx]}-${refYear}`,
    es: `es-indice-finmoovi-costo-de-vida-${MONTHS.es[refMonthIdx].normalize('NFD').replace(/[̀-ͯ]/g, '')}-${refYear}`,
  };

  const title = fixStaleYear(titles[locale]).text;

  const body = `${sections.resposta}

## ${h.ipca.replace('{m}', monthLabel)}

${buildIpcaTable(ipca, locale)}

## ${h.rates.replace('{m}', monthLabel)}

${buildRatesTable(rates, locale)}

*${METHODOLOGY[locale]}*

## ${h.highlights}

${sections.destaques}

## ${h.protect}

${sections.protecao}

## ${h.faq}

${sections.faq}

---
${CTA[locale]}

*${FOOTNOTE[locale]}*
`;

  const frontmatter = `---
title: "${title}"
description: "${descriptions[locale]}"
image: "${imagePath || ''}"
category: "cotacoes"
tags: ${JSON.stringify(tags[locale])}
author: "${config.content.defaultAuthor}"
publishedAt: ${dateStr}
readingTime: ${Math.max(3, Math.ceil(body.split(/\s+/).length / 200))}
featured: false
locale: "${locale}"
translationKey: "${translationKey}"
seo:
  metaTitle: "${title}"
  metaDescription: "${descriptions[locale]}"
  keywords: ${JSON.stringify(keywords[locale])}
---

${body}`;

  return { slug: slugs[locale], content: frontmatter };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`🚀 Índice FinMoovi do Custo de Vida${DRY_RUN ? ' (DRY-RUN)' : ''}...`);

  // Mês de referência = mês ANTERIOR ao da execução. Rodando no dia 13, o IPCA
  // do mês anterior já foi publicado pelo IBGE (divulgação ~dia 10-12).
  const now = new Date();
  const ref = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const refYear = ref.getFullYear();
  const refMonthIdx = ref.getMonth(); // 0-11
  const period = `${refYear}${String(refMonthIdx + 1).padStart(2, '0')}`;
  const monthLabelPt = cap(MONTHS.pt[refMonthIdx]);
  console.log(`📅 Mês de referência: ${monthLabelPt}/${refYear} (período SIDRA ${period})`);

  // 1. IPCA por grupo — se o IBGE estiver fora do ar ou o mês não tiver saído,
  // skip GRACIOSO: avisa no Actions e sai 0 (dispatch manual permite re-rodar).
  let ipca;
  try {
    ipca = await fetchIpcaByGroup(period);
    console.log(`✅ IPCA ${period}: índice geral ${ipca['7169'].mensal}% no mês, ${ipca['7169'].acum12 ?? '—'}% em 12 meses.`);
  } catch (error) {
    console.log(`::warning::Índice do Custo de Vida: API do IBGE indisponível ou sem dados para ${period} (${error.message}). Pulando esta edição — rode de novo via workflow_dispatch.`);
    process.exit(0);
  }

  // 2. Cotações de fechamento do mês de referência (módulo compartilhado).
  const rates = await getMonthCloseRates(refYear, refMonthIdx + 1);
  console.log(`💱 Fechamento ${period}: USD/BRL ${rates.USDBRL} | EUR/BRL ${rates.EURBRL}${rates.fallback ? ' (fallback: cotações atuais)' : ''}`);

  const dateStr = now.toISOString().split('T')[0];
  const translationKey = `indice-finmoovi-custo-de-vida-${MONTHS.pt[refMonthIdx].normalize('NFD').replace(/[̀-ͯ]/g, '')}-${refYear}`;

  // Guard anti-duplicata: a edição do mês já existe? (re-run do workflow)
  if (!DRY_RUN && existsSync(join(POSTS_DIR, `${translationKey}.md`))) {
    console.log(`⚠️ A edição de ${monthLabelPt}/${refYear} já existe (${translationKey}.md). Abortando para evitar duplicata.`);
    return;
  }

  try {
    // 3. Seções narrativas via LLM (apenas texto — números ficam nas tabelas).
    let sectionsPt;
    if (DRY_RUN && !HAS_LLM) {
      console.log('ℹ️ DRY-RUN sem chave de LLM local — usando placeholders [NARRATIVA].');
      sectionsPt = {
        resposta: '[NARRATIVA — parágrafo-resposta de 40-60 palavras com a variação do índice geral]',
        destaques: '### [NARRATIVA — grupo que mais subiu]\n\n[NARRATIVA]\n\n### [NARRATIVA — grupo que mais caiu]\n\n[NARRATIVA]',
        protecao: '- [NARRATIVA — dicas acionáveis com links para as ferramentas do blog]',
        faq: '### [NARRATIVA — pergunta 1]\n\n[NARRATIVA]\n\n### [NARRATIVA — pergunta 2]\n\n[NARRATIVA]',
      };
    } else {
      console.log('🤖 Gerando seções narrativas (PT)...');
      sectionsPt = await generateSectionsPt(ipca, rates, MONTHS.pt[refMonthIdx], refYear);
    }

    // 4. Capa (compartilhada pelos 3 idiomas) — pulada no dry-run.
    let imagePath = '';
    if (!DRY_RUN) {
      console.log('🖼️ Gerando imagem de capa...');
      imagePath = await generateCoverImage(`cost of living index inflation prices Brazil ${MONTHS.en[refMonthIdx]} ${refYear}`, translationKey, 'posts');
    }

    // 5. Monta e salva PT.
    const common = { ipca, rates, refMonthIdx, refYear, dateStr, imagePath, translationKey };
    const ptPost = buildPost({ locale: 'pt', sections: sectionsPt, ...common });

    if (DRY_RUN) {
      console.log('\n===== DRY-RUN — POST PT (não salvo) =====\n');
      console.log(ptPost.content);
      console.log('===== FIM DO DRY-RUN (EN/ES seguem o mesmo template com tabelas traduzidas deterministicamente) =====');
      return;
    }

    if (!existsSync(POSTS_DIR)) mkdirSync(POSTS_DIR, { recursive: true });
    writeFileSync(join(POSTS_DIR, `${ptPost.slug}.md`), ptPost.content, 'utf-8');
    console.log(`📄 PT salvo: ${join(POSTS_DIR, `${ptPost.slug}.md`)}`);

    // 6. EN e ES: tabelas/títulos determinísticos + narrativa traduzida via LLM.
    for (const locale of ['en', 'es']) {
      if (!config.locales.includes(locale)) continue;
      console.log('⏳ Aguardando 30s para evitar rate limit...');
      await new Promise(r => setTimeout(r, 30000));
      console.log(`🌐 Traduzindo narrativa para ${locale}...`);
      const sections = await translateSections(sectionsPt, locale);
      const post = buildPost({ locale, sections, ...common });
      writeFileSync(join(POSTS_DIR, `${post.slug}.md`), post.content, 'utf-8');
      console.log(`📄 ${locale.toUpperCase()} salvo: ${join(POSTS_DIR, `${post.slug}.md`)}`);
    }

    // 7. Internal links (termos do glossário) + commit — padrão dos geradores.
    console.log('🔗 Adicionando internal links...');
    execSync('node src/scripts/automacoes/internal-linking.js', { stdio: 'inherit' });
    execSync(`git add "${POSTS_DIR}" "${IMAGES_DIR}"`, { stdio: 'inherit' });
    execSync(`git commit -m "indice: custo de vida ${MONTHS.pt[refMonthIdx]}/${refYear} [PT/EN/ES]"`, { stdio: 'inherit' });

    console.log('✅ Índice FinMoovi do Custo de Vida publicado em 3 idiomas!');
  } catch (error) {
    console.error('❌ Erro ao gerar o Índice do Custo de Vida:', error.message);
    process.exit(1);
  }
}

main();
