/**
 * SEO Monitor — Analisa performance e sugere ações
 * Usa Cloudflare Web Analytics para identificar:
 * - Páginas com tráfego em queda (priorizar update)
 * - Páginas populares sem schema (adicionar)
 * - Top referrers e oportunidades
 *
 * Executa semanalmente via GitHub Actions (terças 6h BRT)
 * Gera relatório em /reports/seo-monitor-DATE.md
 */

import { writeFileSync, mkdirSync, existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const CF_ANALYTICS_TOKEN = process.env.CF_ANALYTICS_TOKEN;
const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const SITE_TAG = process.env.CF_SITE_TAG || '4db00f52892749c780db1a824b4f6124';
const REPORTS_DIR = join(process.cwd(), 'reports');
const POSTS_DIR = join(process.cwd(), 'src', 'content', 'posts');

async function queryAnalytics(query) {
  const res = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CF_ANALYTICS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query })
  });
  if (!res.ok) throw new Error(`CF API: ${res.status}`);
  return res.json();
}

function getDateRange(daysAgo) {
  const end = new Date();
  const start = new Date(end.getTime() - daysAgo * 86400000);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0]
  };
}

async function getTopPages(days = 7) {
  const { start, end } = getDateRange(days);
  const query = `{
    viewer {
      accounts(filter: {accountTag: "${CF_ACCOUNT_ID}"}) {
        rumPageloadEventsAdaptiveGroups(
          filter: {
            AND: [
              {datetime_geq: "${start}T00:00:00Z"},
              {datetime_leq: "${end}T23:59:59Z"},
              {siteTag: "${SITE_TAG}"}
            ]
          }
          orderBy: [count_DESC]
          limit: 30
        ) {
          dimensions { path }
          count
        }
      }
    }
  }`;
  const data = await queryAnalytics(query);
  return data?.data?.viewer?.accounts?.[0]?.rumPageloadEventsAdaptiveGroups || [];
}

function getPostsWithoutSchema() {
  const files = readdirSync(POSTS_DIR).filter(f => f.endsWith('.md') && !f.startsWith('en-') && !f.startsWith('es-'));
  const withoutSchema = [];
  for (const file of files) {
    const content = readFileSync(join(POSTS_DIR, file), 'utf-8');
    if (!content.includes('SCHEMA_AUTO:')) {
      const titleMatch = content.match(/title:\s*"?([^"\n]+)"?/);
      withoutSchema.push({ file, title: titleMatch?.[1]?.trim() || file });
    }
  }
  return withoutSchema;
}

function getOldPosts(daysThreshold = 60) {
  const files = readdirSync(POSTS_DIR).filter(f => f.endsWith('.md') && !f.startsWith('en-') && !f.startsWith('es-'));
  const now = new Date();
  const old = [];
  for (const file of files) {
    const content = readFileSync(join(POSTS_DIR, file), 'utf-8');
    const publishedMatch = content.match(/publishedAt:\s*(\d{4}-\d{2}-\d{2})/);
    const updatedMatch = content.match(/updatedAt:\s*(\d{4}-\d{2}-\d{2})/);
    if (!publishedMatch) continue;
    const lastDate = new Date(updatedMatch?.[1] || publishedMatch[1]);
    const days = Math.floor((now - lastDate) / 86400000);
    if (days >= daysThreshold) {
      const titleMatch = content.match(/title:\s*"?([^"\n]+)"?/);
      old.push({ file, title: titleMatch?.[1]?.trim() || file, daysSinceUpdate: days });
    }
  }
  return old.sort((a, b) => b.daysSinceUpdate - a.daysSinceUpdate);
}

async function main() {
  console.log('🔍 SEO Monitor — análise semanal...\n');

  if (!CF_ANALYTICS_TOKEN || !CF_ACCOUNT_ID) {
    console.warn('⚠️ CF_ANALYTICS_TOKEN ou CF_ACCOUNT_ID não definido. Gerando relatório parcial.');
  }

  if (!existsSync(REPORTS_DIR)) mkdirSync(REPORTS_DIR, { recursive: true });

  const today = new Date().toISOString().split('T')[0];
  let topPages = [];

  if (CF_ANALYTICS_TOKEN && CF_ACCOUNT_ID) {
    try {
      topPages = await getTopPages(7);
      console.log(`📊 ${topPages.length} páginas com tráfego na última semana`);
    } catch (err) {
      console.warn(`⚠️ Erro ao consultar analytics: ${err.message}`);
    }
  }

  const withoutSchema = getPostsWithoutSchema();
  const oldPosts = getOldPosts(60);

  // Build report
  let report = `# SEO Monitor — ${today}\n\n`;

  report += `## Top Páginas (últimos 7 dias)\n\n`;
  if (topPages.length > 0) {
    report += `| # | Página | Views |\n|---|--------|-------|\n`;
    topPages.slice(0, 20).forEach((p, i) => {
      report += `| ${i + 1} | ${p.dimensions.path} | ${p.count} |\n`;
    });
  } else {
    report += `_Sem dados de analytics disponíveis._\n`;
  }

  report += `\n## Posts sem Schema (${withoutSchema.length})\n\n`;
  report += `Priorize adicionar FAQ/HowTo schema a estes posts populares:\n\n`;
  withoutSchema.slice(0, 15).forEach(p => {
    report += `- ${p.title} (\`${p.file}\`)\n`;
  });

  report += `\n## Posts Antigos para Atualizar (${oldPosts.length})\n\n`;
  report += `Posts com +60 dias sem \`updatedAt\`:\n\n`;
  oldPosts.slice(0, 15).forEach(p => {
    report += `- **${p.daysSinceUpdate}d** — ${p.title}\n`;
  });

  report += `\n## Ações Recomendadas\n\n`;
  report += `1. Rodar \`auto-schema.js\` para adicionar schemas aos ${withoutSchema.length} posts pendentes\n`;
  report += `2. Rodar \`auto-update-posts.js\` para refresh dos ${oldPosts.length} posts antigos\n`;
  report += `3. Rodar \`internal-linking.js\` para garantir cross-links atualizados\n`;

  if (topPages.length > 0) {
    const postPages = topPages.filter(p => p.dimensions.path.includes('/posts/'));
    if (postPages.length > 0) {
      report += `4. Top post: **${postPages[0].dimensions.path}** (${postPages[0].count} views) — garantir schema + CTAs otimizados\n`;
    }
  }

  const reportPath = join(REPORTS_DIR, `seo-monitor-${today}.md`);
  writeFileSync(reportPath, report, 'utf-8');
  console.log(`\n📄 Relatório salvo: ${reportPath}`);
}

main();
