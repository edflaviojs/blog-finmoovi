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

async function main() {
  console.log('🚀 Gerando resumo semanal de cotações...');

  try {
    // Get current rates
    const rates = await getTickerRates();
    console.log(`💱 USD/BRL: ${rates.USDBRL} | EUR/BRL: ${rates.EURBRL}`);

    // Generate analysis with Kie.AI
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 7);

    const prompt = `
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
`;

    const content = await generateText(prompt, { maxTokens: 2000, temperature: 0.6 });

    const dateStr = today.toISOString().split('T')[0];
    const weekNum = Math.ceil((today.getDate()) / 7);
    const monthNames = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    const monthName = monthNames[today.getMonth()];

    const title = `Resumo Semanal: Dólar a R$ ${rates.USDBRL} — Semana ${weekNum} de ${monthName}`;
    const slug = `cotacoes-semana-${weekNum}-${monthName}-${today.getFullYear()}`;

    const frontmatter = `---
title: "${title}"
description: "Resumo semanal do mercado financeiro: dólar, euro, Selic e dicas para investidores. Semana ${weekNum} de ${monthName} ${today.getFullYear()}."
image: ""
category: "cotacoes"
tags: ["cotações", "dólar", "euro", "mercado financeiro", "selic"]
author: "FinMoovi"
publishedAt: ${dateStr}
readingTime: 3
featured: false
seo:
  metaTitle: "Cotações Semana ${weekNum} ${monthName} ${today.getFullYear()}: Dólar R$ ${rates.USDBRL}"
  metaDescription: "Resumo semanal: dólar a R$ ${rates.USDBRL}, euro a R$ ${rates.EURBRL}. Análise e dicas para investidores."
  keywords: ["cotação dólar hoje", "cotação euro", "resumo mercado financeiro", "selic"]
---

${content}
`;

    const postPath = join(POSTS_DIR, `${slug}.md`);
    if (!existsSync(POSTS_DIR)) {
      mkdirSync(POSTS_DIR, { recursive: true });
    }
    writeFileSync(postPath, frontmatter, 'utf-8');
    console.log(`📄 Post salvo: ${postPath}`);

    // Git commit
    execSync(`git add "${postPath}"`, { stdio: 'inherit' });
    execSync(`git commit -m "cotações: semana ${weekNum} ${monthName} ${today.getFullYear()}"`, { stdio: 'inherit' });

    console.log('✅ Resumo semanal publicado!');
  } catch (error) {
    console.error('❌ Erro ao gerar cotações:', error.message);
    process.exit(1);
  }
}

main();
