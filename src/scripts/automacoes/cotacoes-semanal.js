/**
 * Cotações Semanal
 * Executa via GitHub Actions 1x/semana (segunda às 7h)
 * Gera um resumo semanal do mercado financeiro
 */

import { generateText } from '../apis/kie-ai.js';
import { getTickerRates } from '../apis/exchange-rate.js';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const POSTS_DIR = join(process.cwd(), 'src', 'content', 'posts');

async function generatePost(locale, rates, weekStart, today) {
  const monthNames = {
    pt: ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'],
    en: ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'],
    es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  };

  const titles = {
    pt: `Resumo Semanal: Dólar a R$ ${rates.USDBRL} — Semana ${weekNum} de ${monthName}`,
    en: `Weekly Summary: Dollar at R$ ${rates.USDBRL} — Week ${weekNum} of ${monthName}`,
    es: `Resumen Semanal: Dólar a R$ ${rates.USDBRL} — Semana ${weekNum} de ${monthName}`
  };

  const descriptions = {
    pt: `Resumo semanal do mercado financeiro: dólar, euro, Selic e dicas para investidores. Semana ${weekNum} de ${monthName} ${today.getFullYear()}.`,
    en: `Weekly financial market summary: dollar, euro, Selic and tips for investors. Week ${weekNum} of ${monthName} ${today.getFullYear()}.`,
    es: `Resumen semanal del mercado financiero: dólar, euro, Selic y consejos para inversores. Semana ${weekNum} de ${monthName} ${today.getFullYear()}.`
  };

  const tags = {
    pt: ["cotações", "dólar", "euro", "mercado financeiro", "selic"],
    en: ["quotes", "dollar", "euro", "financial market", "selic"],
    es: ["cotizaciones", "dólar", "euro", "mercado financiero", "selic"]
  };

  const prompts = {
    pt: `
Escreva um resumo semanal do mercado financeiro brasileiro para a semana de ${weekStart.toLocaleDateString('pt-BR')} a ${today.toLocaleDateString('pt-BR')}.

Dados atuais:
- USD/BRL: R$ ${rates.USDBRL}
- EUR/BRL: R$ ${rates.EURBRL}

Inclua:
1. Resumo do dólar e euro (tendência da semana)
2. Comentário sobre a Selic e impacto nos investimentos
3. Dica prática para o investidor pessoa física
4. O que esperar para a próxima semana

Formato: artigo de blog com 400-600 palavras, headers H2, tom informativo mas acessível.
Mencione que o FinMoovi ajuda a acompanhar investimentos em múltiplas moedas.
`,
    en: `
Write a weekly summary of the Brazilian financial market for the week of ${weekStart.toLocaleDateString('en-US')} to ${today.toLocaleDateString('en-US')}.

Current data:
- USD/BRL: R$ ${rates.USDBRL}
- EUR/BRL: R$ ${rates.EURBRL}

Include:
1. Summary of dollar and euro (weekly trend)
2. Comment on Selic and impact on investments
3. Practical tip for individual investors
4. What to expect for next week

Format: blog article with 400-600 words, H2 headers, informative but accessible tone.
Mention that FinMoovi helps track investments in multiple currencies.
`,
    es: `
Escriba un resumen semanal del mercado financiero brasileño para la semana del ${weekStart.toLocaleDateString('es-ES')} al ${today.toLocaleDateString('es-ES')}.

Datos actuales:
- USD/BRL: R$ ${rates.USDBRL}
- EUR/BRL: R$ ${rates.EURBRL}

Incluya:
1. Resumen del dólar y euro (tendencia de la semana)
2. Comentario sobre la Selic e impacto en las inversiones
3. Consejo práctico para el inversor individual
4. Qué esperar para la próxima semana

Formato: artículo de blog con 400-600 palabras, encabezados H2, tono informativo pero accesible.
Mencione que FinMoovi ayuda a seguir inversiones en múltiples monedas.
`
  };

  const content = await generateText(prompts[locale], { maxTokens: 2000, temperature: 0.6 });
  const monthName = monthNames[locale][today.getMonth()];
  const title = titles[locale];
  const slug = `${locale === 'pt' ? 'cotacoes' : locale === 'en' ? 'en-quotes' : 'es-cotizaciones'}-semana-${weekNum}-${monthName}-${today.getFullYear()}`;

  const frontmatter = `---
title: "${title}"
description: "${descriptions[locale]}"
image: ""
category: "cotacoes"
tags: ${JSON.stringify(tags[locale])}
author: "FinMoovi"
publishedAt: ${dateStr}
readingTime: 3
featured: false
locale: "${locale}"
translationKey: "resumo-semanal-dolar-r-${rates.USDBRL.replace('.', '-')}-semana-${weekNum}-${monthName}-${today.getFullYear()}"
seo:
  metaTitle: "${locale === 'pt' ? 'Cotações' : locale === 'en' ? 'Quotes' : 'Cotizaciones'} Semana ${weekNum} ${monthName} ${today.getFullYear()}: Dólar R$ ${rates.USDBRL}"
  metaDescription: "${locale === 'pt' ? 'Resumo semanal' : locale === 'en' ? 'Weekly summary' : 'Resumen semanal'}: dólar a R$ ${rates.USDBRL}, euro a R$ ${rates.EURBRL}. ${locale === 'pt' ? 'Análise' : locale === 'en' ? 'Analysis' : 'Análisis'} e ${locale === 'pt' ? 'dicas' : locale === 'en' ? 'tips' : 'consejos'} para ${locale === 'pt' ? 'investidores' : locale === 'en' ? 'investors' : 'inversores'}."
  keywords: ["${locale === 'pt' ? 'cotação dólar hoje' : locale === 'en' ? 'dollar quote today' : 'cotización dólar hoy'}", "${locale === 'pt' ? 'cotação euro' : locale === 'en' ? 'euro quote' : 'cotización euro'}", "${locale === 'pt' ? 'resumo mercado financeiro' : locale === 'en' ? 'financial market summary' : 'resumen mercado financiero'}", "selic"]
---

${content}

${locale === 'pt' ? `
---
**Pronto para acompanhar seus investimentos? [Experimente o FinMoovi de graça](https://finmoovi.com) — em 5 minutos você terá uma visão clara de para onde está indo seu dinheiro.**
` : locale === 'en' ? `
---
**Ready to track your investments? [Try FinMoovi for free](https://finmoovi.com) — in 5 minutes you'll have a clear view of where your money is going.**
` : `
---
**¿Listo para seguir tus inversiones? [Prueba FinMoovi gratis](https://finmoovi.com) — en 5 minutos tendrás una visión clara de a dónde va tu dinero.**
`}
`;

  return { slug, frontmatter };
}

async function main() {
  console.log('🚀 Gerando resumo semanal de cotações...');

  try {
    // Get current rates
    const rates = await getTickerRates();
    console.log(`💱 USD/BRL: ${rates.USDBRL} | EUR/BRL: ${rates.EURBRL}`);

    // Generate posts for all languages
    const locales = ['pt', 'en', 'es'];
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 7);
    const dateStr = today.toISOString().split('T')[0];
    const weekNum = Math.ceil((today.getDate()) / 7);

    for (const locale of locales) {
      console.log(`📄 Gerando post em ${locale}...`);
      const { slug, frontmatter } = await generatePost(locale, rates, weekStart, today);

      const postPath = join(POSTS_DIR, `${slug}.md`);
      if (!existsSync(POSTS_DIR)) {
        mkdirSync(POSTS_DIR, { recursive: true });
      }
      writeFileSync(postPath, frontmatter, 'utf-8');
      console.log(`✅ Post salvo: ${postPath}`);

      // Git commit
      execSync(`git add "${postPath}"`, { stdio: 'inherit' });
      execSync(`git commit -m "cotações: semana ${weekNum} ${monthName} ${today.getFullYear()} (${locale})"`, { stdio: 'inherit' });
    }

    console.log('✅ Resumo semanal publicado em todos os idiomas!');
  } catch (error) {
    console.error('❌ Erro ao gerar cotações:', error.message);
    process.exit(1);
  }
}

main();
