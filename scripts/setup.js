/**
 * Interactive Setup Script with AI-powered content generation
 * Guides the user through configuring the template for their brand/niche.
 * Uses GROQ API to generate CTAs, categories, seasonal calendar, AI prompts.
 *
 * Usage: npm run setup
 * Requires: GROQ_API_KEY env variable (optional — falls back to generic templates)
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

async function callGroq(prompt, maxTokens = 2000) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature: 0.7
      })
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (e) {
    console.log('⚠️  Erro na API GROQ:', e.message);
    return null;
  }
}

async function callOpenAI(prompt, maxTokens = 2000) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature: 0.7
      })
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (e) {
    console.log('⚠️  Erro na API OpenAI:', e.message);
    return null;
  }
}

async function callAnthropic(prompt, maxTokens = 2000) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await res.json();
    return data.content?.[0]?.text || null;
  } catch (e) {
    console.log('⚠️  Erro na API Anthropic:', e.message);
    return null;
  }
}

async function callKieAI(prompt, maxTokens = 2000) {
  const apiKey = process.env.KIE_API_KEY;
  if (!apiKey) return null;

  try {
    // Kie.ai uses OpenAI-compatible endpoint
    const res = await fetch('https://api.kie.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'kie-default',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature: 0.7
      })
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (e) {
    console.log('⚠️  Erro na API Kie.ai:', e.message);
    return null;
  }
}

/**
 * Detect available AI provider and call it
 * Priority: GROQ > OpenAI (ChatGPT) > Anthropic (Claude) > Kie.ai
 */
function detectAIProvider() {
  if (process.env.GROQ_API_KEY) return { name: 'GROQ (Llama 3.3 70B)', call: callGroq };
  if (process.env.OPENAI_API_KEY) return { name: 'OpenAI (GPT-4o mini)', call: callOpenAI };
  if (process.env.ANTHROPIC_API_KEY) return { name: 'Anthropic (Claude)', call: callAnthropic };
  if (process.env.KIE_API_KEY) return { name: 'Kie.ai', call: callKieAI };
  return null;
}

async function callAI(prompt, maxTokens = 2000) {
  const provider = detectAIProvider();
  if (!provider) return null;
  return provider.call(prompt, maxTokens);
}

async function generateWithAI(brandName, niche_pt, niche_en, niche_es, productDescription) {
  const provider = detectAIProvider();
  console.log(`\n🤖 Gerando conteúdo personalizado via ${provider.name}...\n`);

  const prompt = `You are a blog strategist. Given the following brand info, generate content configuration in JSON format.

Brand: ${brandName}
Niche (PT): ${niche_pt}
Niche (EN): ${niche_en}
Niche (ES): ${niche_es}
Product Description: ${productDescription}

Generate a JSON object with EXACTLY this structure (no markdown, just raw JSON):
{
  "categories": ["slug1", "slug2", "slug3", "slug4", "slug5", "slug6"],
  "features": {
    "pt": ["feature 1 in portuguese", "feature 2", "feature 3", "feature 4"],
    "en": ["feature 1 in english", "feature 2", "feature 3", "feature 4"],
    "es": ["feature 1 in spanish", "feature 2", "feature 3", "feature 4"]
  },
  "ctaText": {
    "pt": "CTA button text in portuguese",
    "en": "CTA button text in english",
    "es": "CTA button text in spanish"
  },
  "ctaTitle": {
    "pt": "Main CTA headline in portuguese (e.g. 'Organize X com o BrandName')",
    "en": "Main CTA headline in english",
    "es": "Main CTA headline in spanish"
  },
  "ctaNote": {
    "pt": "Short reassurance in portuguese (e.g. 'Sem cartão de crédito.')",
    "en": "Short reassurance in english",
    "es": "Short reassurance in spanish"
  },
  "siteDescription": {
    "pt": "Blog meta description in portuguese (max 160 chars)",
    "en": "Blog meta description in english (max 160 chars)",
    "es": "Blog meta description in spanish (max 160 chars)"
  },
  "tagline": {
    "pt": "Short tagline in portuguese (3-5 words)",
    "en": "Short tagline in english (3-5 words)",
    "es": "Short tagline in spanish (3-5 words)"
  },
  "aiPersonality": "AI writer personality prompt in Portuguese (1-2 sentences describing tone and style for blog posts)",
  "dailyTopics": ["topic suggestion 1", "topic suggestion 2", "topic suggestion 3", "topic suggestion 4", "topic suggestion 5"],
  "seasonalCalendar": [
    {"month": 1, "topic": "seasonal topic for January related to the niche"},
    {"month": 3, "topic": "seasonal topic for March"},
    {"month": 5, "topic": "seasonal topic for May"},
    {"month": 7, "topic": "seasonal topic for July"},
    {"month": 9, "topic": "seasonal topic for September"},
    {"month": 11, "topic": "seasonal topic for November"}
  ],
  "comparisonTopics": ["comparison topic 1 vs X", "topic 2 vs Y", "topic 3 vs Z"],
  "solutionTopics": ["how the product solves problem 1", "how it solves problem 2", "how it solves problem 3"]
}

Categories should be slug-friendly (lowercase, no accents, no spaces — use hyphens).
Features should describe the product's main selling points.
Daily topics should be blog post ideas relevant to the niche.
Seasonal calendar should match Brazilian/international dates relevant to the niche.
Comparison and solution topics should be content marketing angles.

IMPORTANT: Return ONLY the JSON, no explanation, no markdown code blocks.`;

  const result = await callAI(prompt, 2000);
  if (!result) return null;

  try {
    // Try to parse, handle potential markdown wrapping
    const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.log('⚠️  Não foi possível interpretar resposta da IA. Usando templates genéricos.');
    return null;
  }
}

function getGenericDefaults(brandName, niche_pt, niche_en, niche_es) {
  return {
    categories: ['dicas', 'guias', 'reviews', 'noticias', 'ferramentas', 'glossario'],
    features: {
      pt: ['Recurso principal 1', 'Recurso principal 2', 'Recurso principal 3', 'Recurso principal 4'],
      en: ['Main feature 1', 'Main feature 2', 'Main feature 3', 'Main feature 4'],
      es: ['Función principal 1', 'Función principal 2', 'Función principal 3', 'Función principal 4'],
    },
    ctaText: { pt: 'Experimentar Grátis', en: 'Try Free', es: 'Probar Gratis' },
    ctaTitle: {
      pt: `Organize ${niche_pt} com o ${brandName}`,
      en: `Organize your ${niche_en} with ${brandName}`,
      es: `Organiza tus ${niche_es} con ${brandName}`,
    },
    ctaNote: { pt: 'Sem cartão de crédito.', en: 'No credit card required.', es: 'Sin tarjeta de crédito.' },
    siteDescription: {
      pt: `Dicas e conteúdo sobre ${niche_pt}. Blog oficial do ${brandName}.`,
      en: `Tips and content about ${niche_en}. Official ${brandName} blog.`,
      es: `Consejos y contenido sobre ${niche_es}. Blog oficial de ${brandName}.`,
    },
    tagline: {
      pt: `${niche_pt} acessível`,
      en: `Accessible ${niche_en}`,
      es: `${niche_es} accesible`,
    },
    aiPersonality: `Você é um redator experiente de ${niche_pt} que escreve para brasileiros. Seu estilo é direto, prático e conversacional.`,
    dailyTopics: [`dica 1 sobre ${niche_pt}`, `dica 2 sobre ${niche_pt}`, `dica 3 sobre ${niche_pt}`],
    seasonalCalendar: [],
    comparisonTopics: [],
    solutionTopics: [],
  };
}

async function main() {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║         🚀 Blog Template — Setup Inteligente                ║
║                                                              ║
║  Este assistente configura seu blog completo.                ║
║  Se GROQ_API_KEY estiver configurada, usa IA para           ║
║  gerar CTAs, categorias, temas e prompts pro seu nicho.     ║
╚══════════════════════════════════════════════════════════════╝
`);

  const aiProvider = detectAIProvider();
  if (aiProvider) {
    console.log(`  ✅ IA detectada: ${aiProvider.name}\n`);
  } else {
    console.log('  ⚠️  Nenhuma API key de IA encontrada — usando templates genéricos');
    console.log('     Configure uma das variáveis para gerar com IA:');
    console.log('     • GROQ_API_KEY (grátis, rápido)');
    console.log('     • OPENAI_API_KEY (ChatGPT)');
    console.log('     • ANTHROPIC_API_KEY (Claude)');
    console.log('     • KIE_API_KEY (Kie.ai)\n');
  }

  // === Core Identity ===
  console.log('━━━━━ 1/5 IDENTIDADE DA MARCA ━━━━━━━━━━━━━━━━━━━━\n');
  const brandName = await ask('Nome da marca/app', 'MeuApp');
  const blogDomain = await ask('Domínio do blog (sem https://)', `blog.${slugify(brandName)}.com`);
  const mainDomain = await ask('Domínio principal do app/produto', `${slugify(brandName)}.com`);

  // === Niche ===
  console.log('\n━━━━━ 2/5 NICHO ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  const niche_pt = await ask('Nicho em português', 'finanças pessoais');
  const niche_en = await ask('Nicho em inglês', 'personal finance');
  const niche_es = await ask('Nicho em espanhol', 'finanzas personales');

  // === Product ===
  console.log('\n━━━━━ 3/5 PRODUTO/APP ━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  const appName = await ask('Nome do app/produto', brandName);
  const appUrl = await ask('URL do app/produto', `https://${mainDomain}`);
  const productDescription = await ask(
    'Descreva seu produto em 1-2 frases (para gerar CTAs e conteúdo)',
    `App de ${niche_pt} inteligente com funcionalidades avançadas.`
  );

  // === Colors ===
  console.log('\n━━━━━ 4/5 VISUAL ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  const colorPrimary = await ask('Cor primária (hex)', '#58a6ff');
  const gradientStart = await ask('Gradiente início (hex)', '#00F0FF');
  const gradientEnd = await ask('Gradiente fim (hex)', '#A91079');

  // === Cloudflare ===
  console.log('\n━━━━━ 5/5 DEPLOY ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  const cfProjectName = await ask('Nome do projeto no Cloudflare Pages', slugify(brandName) + '-blog');
  const authorName = await ask('Nome do autor padrão', brandName);

  // === AI Generation ===
  let aiData = null;
  if (aiProvider) {
    aiData = await generateWithAI(brandName, niche_pt, niche_en, niche_es, productDescription);
  }

  const data = aiData || getGenericDefaults(brandName, niche_pt, niche_en, niche_es);

  if (aiData) {
    console.log('✅ Conteúdo gerado com IA:');
    console.log(`   • ${data.categories.length} categorias: ${data.categories.join(', ')}`);
    console.log(`   • ${data.features.pt.length} features do produto`);
    console.log(`   • ${data.dailyTopics.length} temas diários sugeridos`);
    console.log(`   • ${data.seasonalCalendar.length} datas sazonais`);
    console.log(`   • ${data.comparisonTopics.length} temas de comparação`);
    console.log(`   • ${data.solutionTopics.length} temas de solução\n`);
  }

  // === Generate config ===
  const configContent = `import type { SiteConfig } from './src/types/config';

/**
 * ═══════════════════════════════════════════════════════════════════════
 * SITE CONFIGURATION — ${brandName}
 * ═══════════════════════════════════════════════════════════════════════
 * Gerado por: npm run setup
 * ${aiData ? '🤖 CTAs, categorias e temas gerados com IA' : '📝 Templates genéricos (rode com GROQ_API_KEY para personalizar)'}
 */

export const config: SiteConfig = {
  siteName: '${brandName} Blog',
  siteUrl: 'https://${blogDomain}',
  siteDescription: ${JSON.stringify(data.siteDescription, null, 4)},
  defaultLocale: 'pt',
  locales: ['pt', 'en', 'es'],

  brand: {
    name: '${brandName}',
    blogSuffix: 'Blog',
    tagline: ${JSON.stringify(data.tagline, null, 6)},
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
    categories: ${JSON.stringify(data.categories)} as const,
    glossaryCategories: ['basico', 'intermediario', 'avancado'] as const,
    niche: {
      pt: '${niche_pt}',
      en: '${niche_en}',
      es: '${niche_es}',
    },
    defaultAuthor: '${authorName}',
    defaultKeywords: {
      pt: '${niche_pt}, ${data.categories.slice(0, 3).join(', ')}',
      en: '${niche_en}, tips, guide',
      es: '${niche_es}, consejos, guía',
    },
  },

  app: {
    name: '${appName}',
    url: '${appUrl}',
    features: ${JSON.stringify(data.features, null, 6)},
    ctaText: ${JSON.stringify(data.ctaText, null, 6)},
    ctaTitle: ${JSON.stringify(data.ctaTitle, null, 6)},
    ctaNote: ${JSON.stringify(data.ctaNote, null, 6)},
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
    personality: \`${data.aiPersonality || `Você é um redator experiente de ${niche_pt} que escreve para brasileiros. Seu estilo é direto, prático e conversacional. Quando menciona o app ${appName}, faz de forma natural.`}\`,
    nicheKeywords: ${JSON.stringify(data.categories)},
    dailyTopics: ${JSON.stringify(data.dailyTopics, null, 4)},
    seasonalCalendar: ${JSON.stringify(data.seasonalCalendar || [], null, 4)},
    comparisonTopics: ${JSON.stringify(data.comparisonTopics || [], null, 4)},
    solutionTopics: ${JSON.stringify(data.solutionTopics || [], null, 4)},
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
  console.log('\n🔧 Gerando arquivos derivados (CSS, manifest, i18n, config)...');
  const { execSync } = await import('child_process');
  try {
    execSync('npm run generate', { stdio: 'inherit', cwd: process.cwd() });
  } catch (e) {
    console.log('⚠️  Falha ao gerar arquivos. Rode manualmente: npm run generate');
  }

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  ✅ Setup completo!                                          ║
║                                                              ║
║  Seu blog "${brandName}" está configurado.                   ║
${aiData ? '║  🤖 CTAs, categorias e temas foram gerados com IA.          ║\n' : ''}║                                                              ║
║  Próximos passos:                                            ║
║  1. npm run dev — ver o blog localmente                      ║
║  2. Ajuste site.config.ts se precisar (features, social)     ║
║  3. Push para GitHub → Deploy automático no CF Pages         ║
║  4. Configure os GitHub Secrets:                             ║
║                                                              ║
║     Obrigatórios para automações:                            ║
║     - GROQ_API_KEY (geração de texto)                        ║
║     - TOGETHER_API_KEY (geração de imagens)                  ║
║                                                              ║
║     Opcionais:                                               ║
║     - SUPABASE_URL + SUPABASE_ANON_KEY (database)           ║
║     - RESEND_API_KEY (emails)                                ║
║     - CF_ANALYTICS_TOKEN (analytics report)                  ║
║                                                              ║
║  5. Configure GitHub Repository Variables:                   ║
║     - BOT_NAME = "${brandName} Bot"                          ║
║     - BOT_EMAIL = "bot@${mainDomain}"                        ║
╚══════════════════════════════════════════════════════════════╝
`);

  rl.close();
}

main().catch(e => {
  console.error('Erro no setup:', e.message);
  rl.close();
  process.exit(1);
});
