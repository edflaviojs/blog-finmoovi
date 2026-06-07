/**
 * Interactive Setup Script
 * Guides the user through configuring the template for their brand/niche.
 *
 * Usage: npm run setup
 * (runs via: node --import tsx scripts/setup.js)
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { createInterface } from 'readline';

const rl = createInterface({ input: process.stdin, output: process.stdout });

function ask(question, defaultVal = '') {
  return new Promise(resolve => {
    const suffix = defaultVal ? ` [${defaultVal}]` : '';
    rl.question(`${question}${suffix}: `, answer => {
      resolve(answer.trim() || defaultVal);
    });
  });
}

function slugify(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function main() {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║         🚀 Blog Template — Setup Interativo                 ║
║                                                              ║
║  Este assistente vai configurar seu blog.                    ║
║  Responda as perguntas abaixo para gerar o site.config.ts   ║
╚══════════════════════════════════════════════════════════════╝
`);

  // === Core Identity ===
  const brandName = await ask('Nome da marca/app', 'MeuApp');
  const blogDomain = await ask('Domínio do blog (sem https://)', `blog.${slugify(brandName)}.com`);
  const mainDomain = await ask('Domínio principal do app/produto', `${slugify(brandName)}.com`);
  const niche_pt = await ask('Nicho em português', 'finanças pessoais');
  const niche_en = await ask('Nicho em inglês', 'personal finance');
  const niche_es = await ask('Nicho em espanhol', 'finanzas personales');

  // === Colors ===
  console.log('\n🎨 Cores (use hex, ex: #00F0FF)');
  const colorPrimary = await ask('Cor primária (links, destaques)', '#58a6ff');
  const gradientStart = await ask('Gradiente início (cor 1)', '#00F0FF');
  const gradientEnd = await ask('Gradiente fim (cor 2)', '#A91079');

  // === Product/App ===
  console.log('\n📱 Produto/App promovido nos CTAs');
  const appName = await ask('Nome do app/produto', brandName);
  const appUrl = await ask('URL do app/produto', `https://${mainDomain}`);

  // === Categories ===
  console.log('\n📂 Categorias de conteúdo (separadas por vírgula)');
  const categoriesStr = await ask('Categorias', 'dicas, guias, reviews, noticias, ferramentas, glossario');
  const categories = categoriesStr.split(',').map(c => slugify(c.trim())).filter(Boolean);

  // === Cloudflare ===
  console.log('\n☁️ Cloudflare Pages');
  const cfProjectName = await ask('Nome do projeto no CF Pages', slugify(brandName) + '-blog');

  // === Author ===
  const authorName = await ask('\n✍️ Nome do autor padrão', brandName);

  // === Generate config ===
  const configContent = `import type { SiteConfig } from './src/types/config';

/**
 * ═══════════════════════════════════════════════════════════════════════
 * SITE CONFIGURATION — ${brandName}
 * ═══════════════════════════════════════════════════════════════════════
 * Gerado por: npm run setup
 * Após editar, rode: npm run generate
 */

export const config: SiteConfig = {
  siteName: '${brandName} Blog',
  siteUrl: 'https://${blogDomain}',
  siteDescription: {
    pt: 'Dicas e conteúdo sobre ${niche_pt}. Blog oficial do ${brandName}.',
    en: 'Tips and content about ${niche_en}. Official ${brandName} blog.',
    es: 'Consejos y contenido sobre ${niche_es}. Blog oficial de ${brandName}.',
  },
  defaultLocale: 'pt',
  locales: ['pt', 'en', 'es'],

  brand: {
    name: '${brandName}',
    blogSuffix: 'Blog',
    tagline: {
      pt: '${niche_pt} acessível',
      en: 'Accessible ${niche_en}',
      es: '${niche_es} accesible',
    },
    logo: {
      svgPath: 'M12 44 L24 28 L34 38 L44 20 L52 28',
      gradientStart: '${gradientStart}',
      gradientEnd: '${gradientEnd}',
    },
    colors: {
      primary: '${colorPrimary}',
      secondary: '#bc8cff',
      ctaGradientStart: '${gradientStart}',
      ctaGradientEnd: '${gradientEnd}',
      accentGreen: '#3fb950',
      accentRed: '#f85149',
    },
    domains: {
      main: '${mainDomain}',
      blog: '${blogDomain}',
      email: 'email.${mainDomain}',
      cfPages: '${cfProjectName}.pages.dev',
    },
  },

  content: {
    categories: [${categories.map(c => `'${c}'`).join(', ')}] as const,
    glossaryCategories: ['basico', 'intermediario', 'avancado'] as const,
    niche: {
      pt: '${niche_pt}',
      en: '${niche_en}',
      es: '${niche_es}',
    },
    defaultAuthor: '${authorName}',
    defaultKeywords: {
      pt: '${niche_pt}, ${categories.slice(0, 3).join(', ')}',
      en: '${niche_en}, tips, guide',
      es: '${niche_es}, consejos, guía',
    },
  },

  app: {
    name: '${appName}',
    url: '${appUrl}',
    features: {
      pt: ['Recurso principal 1', 'Recurso principal 2', 'Recurso principal 3', 'Recurso principal 4'],
      en: ['Main feature 1', 'Main feature 2', 'Main feature 3', 'Main feature 4'],
      es: ['Función principal 1', 'Función principal 2', 'Función principal 3', 'Función principal 4'],
    },
    ctaText: { pt: 'Experimentar Grátis', en: 'Try Free', es: 'Probar Gratis' },
    ctaNote: { pt: 'Sem cartão de crédito.', en: 'No credit card required.', es: 'Sin tarjeta de crédito.' },
  },

  social: {
    twitter: '',
    instagram: '',
    linkedin: '',
    github: '',
    youtube: '',
  },

  analytics: {
    cloudflareBeaconToken: '',
  },

  giscus: {
    repo: '',
    repoId: '',
    category: 'Announcements',
    categoryId: '',
  },

  email: {
    from: '${brandName} Blog <blog@email.${mainDomain}>',
    replyTo: 'contato@${mainDomain}',
  },

  ai: {
    personality: \`Você é um redator experiente de ${niche_pt} que escreve para brasileiros. Seu estilo é direto, prático e conversacional. Quando menciona o app ${appName}, faz de forma natural.\`,
    nicheKeywords: [${categories.map(c => `'${c}'`).join(', ')}],
    dailyTopics: [
      'dica 1 sobre ${niche_pt}',
      'dica 2 sobre ${niche_pt}',
      'dica 3 sobre ${niche_pt}',
    ],
    seasonalCalendar: [],
    comparisonTopics: [],
    solutionTopics: [],
  },

  bot: {
    name: '${brandName} Bot',
    email: 'bot@${mainDomain}',
  },

  cloudflare: {
    projectName: '${cfProjectName}',
    kvNamespaceId: '',
  },
};
`;

  // Write config
  const configPath = join(process.cwd(), 'site.config.ts');
  writeFileSync(configPath, configContent, 'utf-8');
  console.log(`\n✅ Gerado: site.config.ts`);

  // Update wrangler.toml
  const wranglerPath = join(process.cwd(), 'wrangler.toml');
  if (existsSync(wranglerPath)) {
    let wrangler = readFileSync(wranglerPath, 'utf-8');
    wrangler = wrangler.replace(/name\s*=\s*"[^"]*"/, `name = "${cfProjectName}"`);
    writeFileSync(wranglerPath, wrangler, 'utf-8');
    console.log('✅ Atualizado: wrangler.toml');
  }

  // Update package.json
  const pkgPath = join(process.cwd(), 'package.json');
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    pkg.name = cfProjectName;
    pkg.description = `Blog ${brandName} - ${niche_pt}`;
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
    console.log('✅ Atualizado: package.json');
  }

  // Run generate scripts
  console.log('\n🔧 Gerando arquivos derivados...');
  const { execSync } = await import('child_process');
  try {
    execSync('npm run generate', { stdio: 'inherit', cwd: process.cwd() });
  } catch (e) {
    console.log('⚠️ Falha ao gerar arquivos. Rode manualmente: npm run generate');
  }

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  ✅ Setup completo!                                          ║
║                                                              ║
║  Próximos passos:                                            ║
║  1. npm run dev — ver o blog localmente                      ║
║  2. Edite site.config.ts para ajustar detalhes               ║
║  3. Push para GitHub → Deploy automático no CF Pages         ║
║  4. Configure os GitHub Secrets para ativar automações       ║
║                                                              ║
║  Secrets necessários:                                        ║
║  - GROQ_API_KEY (geração de texto)                           ║
║  - TOGETHER_API_KEY (geração de imagens)                     ║
║  - SUPABASE_URL + SUPABASE_ANON_KEY (database)              ║
║  - RESEND_API_KEY (emails)                                   ║
║  - CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_AI_TOKEN (imagens)    ║
╚══════════════════════════════════════════════════════════════╝
`);

  rl.close();
}

main().catch(e => {
  console.error('Erro no setup:', e.message);
  rl.close();
  process.exit(1);
});
