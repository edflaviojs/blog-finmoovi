/**
 * Relatório Semanal de Analytics + Geração Inteligente de Conteúdo
 * Consulta Cloudflare Web Analytics via GraphQL API
 * Gera relatório em Markdown e sugere próximos posts baseado em performance
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const CF_ANALYTICS_TOKEN = process.env.CF_ANALYTICS_TOKEN;
const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const SITE_TAG = process.env.CF_SITE_TAG; // Web Analytics site tag

if (!CF_ANALYTICS_TOKEN || !CF_ACCOUNT_ID) {
  console.error('Missing CF_ANALYTICS_TOKEN or CF_ACCOUNT_ID');
  process.exit(1);
}

const REPORTS_DIR = join(process.cwd(), 'reports');
if (!existsSync(REPORTS_DIR)) mkdirSync(REPORTS_DIR, { recursive: true });

/**
 * Query Cloudflare Web Analytics GraphQL API
 */
async function queryAnalytics(query, variables = {}) {
  const res = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CF_ANALYTICS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query, variables })
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('Analytics API error:', res.status, text);
    return null;
  }

  return res.json();
}

/**
 * Get top pages for the last 7 days
 */
async function getTopPages() {
  const end = new Date().toISOString().split('T')[0];
  const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const query = `
    query {
      viewer {
        accounts(filter: { accountTag: "${CF_ACCOUNT_ID}" }) {
          rumPageloadEventsAdaptiveGroups(
            filter: {
              date_geq: "${start}"
              date_leq: "${end}"
              ${SITE_TAG ? `siteTag: "${SITE_TAG}"` : ''}
            }
            orderBy: [count_DESC]
            limit: 30
          ) {
            count
            dimensions {
              path
            }
            avg {
              sampleInterval
            }
          }
        }
      }
    }
  `;

  return queryAnalytics(query);
}

/**
 * Get traffic summary (total visits, pageviews, countries)
 */
async function getTrafficSummary() {
  const end = new Date().toISOString().split('T')[0];
  const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const query = `
    query {
      viewer {
        accounts(filter: { accountTag: "${CF_ACCOUNT_ID}" }) {
          rumPageloadEventsAdaptiveGroups(
            filter: {
              date_geq: "${start}"
              date_leq: "${end}"
              ${SITE_TAG ? `siteTag: "${SITE_TAG}"` : ''}
            }
            orderBy: [count_DESC]
            limit: 10
          ) {
            count
            dimensions {
              countryName
            }
          }
        }
      }
    }
  `;

  return queryAnalytics(query);
}

/**
 * Get referrers
 */
async function getReferrers() {
  const end = new Date().toISOString().split('T')[0];
  const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const query = `
    query {
      viewer {
        accounts(filter: { accountTag: "${CF_ACCOUNT_ID}" }) {
          rumPageloadEventsAdaptiveGroups(
            filter: {
              date_geq: "${start}"
              date_leq: "${end}"
              ${SITE_TAG ? `siteTag: "${SITE_TAG}"` : ''}
            }
            orderBy: [count_DESC]
            limit: 10
          ) {
            count
            dimensions {
              refererHost
            }
          }
        }
      }
    }
  `;

  return queryAnalytics(query);
}

/**
 * Analyze existing posts to find content gaps
 */
function analyzeExistingContent() {
  const postsDir = join(process.cwd(), 'src', 'content', 'posts');
  if (!existsSync(postsDir)) return { total: 0, categories: {}, recentTopics: [] };

  const files = readdirSync(postsDir).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));
  const categories = {};
  const recentTopics = [];

  for (const file of files) {
    try {
      const content = readFileSync(join(postsDir, file), 'utf-8');
      const frontmatter = content.match(/^---\n([\s\S]*?)\n---/);
      if (!frontmatter) continue;

      const catMatch = frontmatter[1].match(/category:\s*['"]?(\w+)/);
      const titleMatch = frontmatter[1].match(/title:\s*['"]?(.+?)['"]?\s*$/m);
      const localeMatch = frontmatter[1].match(/locale:\s*['"]?(\w+)/);

      if (localeMatch && localeMatch[1] !== 'pt') continue;

      const cat = catMatch ? catMatch[1] : 'outros';
      categories[cat] = (categories[cat] || 0) + 1;

      if (titleMatch) {
        recentTopics.push(titleMatch[1]);
      }
    } catch (e) { /* skip */ }
  }

  return { total: files.length, categories, recentTopics: recentTopics.slice(-20) };
}

/**
 * Generate content suggestions based on analytics data
 */
function generateSuggestions(topPages, contentAnalysis) {
  const suggestions = [];

  // Identify categories that get most traffic
  const categoryTraffic = {};
  if (topPages) {
    for (const page of topPages) {
      const path = page.dimensions?.path || '';
      if (path.includes('/posts/')) {
        // Extract category hint from slug
        if (path.includes('cotac') || path.includes('dolar') || path.includes('euro')) {
          categoryTraffic['cotacoes'] = (categoryTraffic['cotacoes'] || 0) + page.count;
        } else if (path.includes('orcamento') || path.includes('financ')) {
          categoryTraffic['dicas'] = (categoryTraffic['dicas'] || 0) + page.count;
        } else if (path.includes('investi')) {
          categoryTraffic['investimentos'] = (categoryTraffic['investimentos'] || 0) + page.count;
        } else {
          categoryTraffic['dicas'] = (categoryTraffic['dicas'] || 0) + page.count;
        }
      }
    }
  }

  // Suggest more of what works
  const sortedCategories = Object.entries(categoryTraffic).sort((a, b) => b[1] - a[1]);
  if (sortedCategories.length > 0) {
    suggestions.push(`Categoria mais visitada: **${sortedCategories[0][0]}** (${sortedCategories[0][1]} pageviews). Crie mais conteúdo nesta categoria.`);
  }

  // Content gap analysis
  const existingCategories = contentAnalysis.categories;
  const underserved = ['investimentos', 'orcamento', 'ferramentas'].filter(
    cat => (existingCategories[cat] || 0) < 3
  );
  if (underserved.length > 0) {
    suggestions.push(`Categorias com poucos posts (oportunidade): ${underserved.join(', ')}`);
  }

  // Seasonal/trending suggestions
  const month = new Date().getMonth();
  const seasonalTopics = {
    0: ['como planejar finanças para o ano novo', 'metas financeiras para o ano'],
    1: ['como economizar no carnaval', 'imposto de renda: organize-se'],
    2: ['como fazer declaração do imposto de renda', 'restituição IR: onde investir'],
    3: ['como economizar na Páscoa', 'férias baratas: dicas'],
    4: ['dia das mães sem gastar muito', 'como investir o 13º antecipado'],
    5: ['dia dos namorados econômico', 'meio do ano: revisão financeira'],
    6: ['como economizar nas férias de julho', 'investimentos para segundo semestre'],
    7: ['dia dos pais econômico', 'como planejar Black Friday'],
    8: ['como aproveitar promoções de setembro', 'primavera financeira: reorganize'],
    9: ['como se preparar para Black Friday', 'planejamento financeiro fim de ano'],
    10: ['Black Friday: como não cair em armadilhas', 'como economizar nas compras de Natal'],
    11: ['como controlar gastos no Natal', 'como investir o 13º salário', 'retrospectiva financeira do ano']
  };

  const monthTopics = seasonalTopics[month] || [];
  if (monthTopics.length > 0) {
    suggestions.push(`Temas sazonais para este mês: ${monthTopics.map(t => `"${t}"`).join(', ')}`);
  }

  // High-potential topics based on traffic patterns
  const highPotentialTopics = [
    'como investir com 100 reais por mês',
    'renda fixa vs renda variável: qual escolher',
    'como montar carteira de investimentos iniciante',
    'apps de controle financeiro: comparativo',
    'como economizar ganhando pouco',
    'como sair do vermelho em 90 dias',
    'PIX: dicas de segurança financeira',
    'como usar cashback para economizar',
    'como funciona o Tesouro Direto',
    'como calcular aposentadoria necessária'
  ];

  // Filter out already written topics
  const existingTitles = contentAnalysis.recentTopics.map(t => t.toLowerCase());
  const newTopics = highPotentialTopics.filter(
    topic => !existingTitles.some(existing => existing.includes(topic.split(' ').slice(0, 3).join(' ')))
  );

  if (newTopics.length > 0) {
    suggestions.push(`Temas de alto potencial ainda não cobertos:\n${newTopics.slice(0, 5).map(t => `  - "${t}"`).join('\n')}`);
  }

  return suggestions;
}

/**
 * Main execution
 */
async function main() {
  console.log('📊 Gerando relatório semanal de analytics...\n');

  // Fetch all data
  const [topPagesResult, trafficResult, referrersResult] = await Promise.all([
    getTopPages(),
    getTrafficSummary(),
    getReferrers()
  ]);

  // Parse results
  const topPages = topPagesResult?.data?.viewer?.accounts?.[0]?.rumPageloadEventsAdaptiveGroups || [];
  const traffic = trafficResult?.data?.viewer?.accounts?.[0]?.rumPageloadEventsAdaptiveGroups || [];
  const referrers = referrersResult?.data?.viewer?.accounts?.[0]?.rumPageloadEventsAdaptiveGroups || [];

  // Total pageviews
  const totalPageviews = topPages.reduce((sum, p) => sum + p.count, 0);
  const totalByCountry = traffic.reduce((acc, t) => {
    const country = t.dimensions?.countryName || 'Desconhecido';
    acc[country] = (acc[country] || 0) + t.count;
    return acc;
  }, {});

  // Content analysis
  const contentAnalysis = analyzeExistingContent();

  // Generate suggestions
  const suggestions = generateSuggestions(topPages, contentAnalysis);

  // Build report
  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  let report = `# 📊 Relatório Semanal — FinMoovi Blog\n\n`;
  report += `**Período:** ${weekAgo} a ${today}\n`;
  report += `**Total de Pageviews:** ${totalPageviews}\n\n`;

  report += `## 🏆 Páginas Mais Visitadas\n\n`;
  report += `| # | Página | Views |\n|---|--------|-------|\n`;
  topPages.slice(0, 15).forEach((page, i) => {
    const path = page.dimensions?.path || '/';
    report += `| ${i + 1} | ${path} | ${page.count} |\n`;
  });

  report += `\n## 🌍 Tráfego por País\n\n`;
  report += `| País | Views |\n|------|-------|\n`;
  Object.entries(totalByCountry)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([country, count]) => {
      report += `| ${country} | ${count} |\n`;
    });

  report += `\n## 🔗 Fontes de Tráfego (Referrers)\n\n`;
  report += `| Referrer | Views |\n|----------|-------|\n`;
  referrers.slice(0, 10).forEach(r => {
    const ref = r.dimensions?.refererHost || '(direto)';
    report += `| ${ref} | ${r.count} |\n`;
  });

  report += `\n## 📝 Conteúdo Existente\n\n`;
  report += `- **Total posts:** ${contentAnalysis.total}\n`;
  report += `- **Por categoria:** ${Object.entries(contentAnalysis.categories).map(([k, v]) => `${k} (${v})`).join(', ')}\n`;

  report += `\n## 💡 Sugestões de Conteúdo\n\n`;
  suggestions.forEach(s => {
    report += `- ${s}\n`;
  });

  report += `\n---\n*Gerado automaticamente em ${new Date().toISOString()}*\n`;

  // Save report
  const filename = `analytics-${today}.md`;
  writeFileSync(join(REPORTS_DIR, filename), report);
  console.log(`✅ Relatório salvo: reports/${filename}`);

  // Also save latest (overwrite)
  writeFileSync(join(REPORTS_DIR, 'latest.md'), report);

  // Git commit
  try {
    execSync('git add reports/', { stdio: 'pipe' });
    execSync(`git commit -m "report: analytics semanal ${today}" --allow-empty`, { stdio: 'pipe' });
    console.log('✅ Commit criado');
  } catch (e) {
    console.log('ℹ️ Nenhuma mudança para commitar');
  }

  // Output suggestions as workflow output
  console.log('\n📌 SUGESTÕES DE CONTEÚDO:');
  suggestions.forEach(s => console.log(`  → ${s}`));

  // Return top topics for post generation
  return { topPages, suggestions, contentAnalysis };
}

main().catch(err => {
  console.error('Erro:', err);
  process.exit(1);
});
