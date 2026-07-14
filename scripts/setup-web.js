/**
 * Web Setup Dashboard
 * Opens a visual form in the browser for configuring the template.
 * WordPress-like experience: fill form, click save, done.
 *
 * Usage: npm run setup:web
 */

import { createServer } from 'http';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const PORT = 3456;
const ROOT = process.cwd();

function getHTML() {
  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Blog Template — Setup</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0d1117; color: #e6edf3; min-height: 100vh; }
    .container { max-width: 800px; margin: 0 auto; padding: 40px 20px; }
    h1 { font-size: 2rem; margin-bottom: 8px; background: linear-gradient(135deg, #00F0FF, #A91079); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .subtitle { color: #8b949e; margin-bottom: 40px; }
    .section { margin-bottom: 32px; padding: 24px; background: #161b22; border: 1px solid #30363d; border-radius: 12px; }
    .section h2 { font-size: 1.1rem; color: #58a6ff; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
    .section h2::before { content: ''; width: 4px; height: 20px; background: linear-gradient(135deg, #00F0FF, #A91079); border-radius: 2px; }
    .field { margin-bottom: 16px; }
    .field label { display: block; font-size: 0.85rem; color: #8b949e; margin-bottom: 4px; font-weight: 500; }
    .field input, .field textarea, .field select { width: 100%; padding: 10px 14px; background: #0d1117; border: 1px solid #30363d; border-radius: 8px; color: #e6edf3; font-size: 0.95rem; transition: border-color 0.2s; }
    .field input:focus, .field textarea:focus { outline: none; border-color: #58a6ff; }
    .field textarea { min-height: 80px; resize: vertical; }
    .field .hint { font-size: 0.75rem; color: #6e7681; margin-top: 4px; }
    .color-row { display: flex; gap: 12px; }
    .color-row .field { flex: 1; }
    .color-row input[type="color"] { width: 100%; height: 40px; padding: 4px; cursor: pointer; }
    .btn { display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #00F0FF, #A91079); color: #fff; border: none; border-radius: 999px; font-size: 1rem; font-weight: 700; cursor: pointer; transition: opacity 0.2s, transform 0.2s; }
    .btn:hover { opacity: 0.9; transform: translateY(-1px); }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
    .actions { text-align: center; margin-top: 32px; }
    .status { text-align: center; margin-top: 16px; padding: 12px; border-radius: 8px; display: none; }
    .status.success { display: block; background: rgba(63, 185, 80, 0.1); border: 1px solid #3fb950; color: #3fb950; }
    .status.error { display: block; background: rgba(248, 81, 73, 0.1); border: 1px solid #f85149; color: #f85149; }
    .status.loading { display: block; background: rgba(88, 166, 255, 0.1); border: 1px solid #58a6ff; color: #58a6ff; }
    .steps { margin-top: 24px; }
    .steps li { color: #8b949e; margin-bottom: 8px; padding-left: 4px; }
    .steps li.done { color: #3fb950; }
    .steps li.done::marker { content: '✅ '; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    @media (max-width: 640px) { .grid-2 { grid-template-columns: 1fr; } }
    .provider-info { font-size: 0.8rem; color: #6e7681; margin-top: 8px; padding: 8px 12px; background: #0d1117; border-radius: 6px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 Blog Template Setup</h1>
    <p class="subtitle">Preencha os campos abaixo e clique em "Criar Meu Blog". Simples assim.</p>

    <form id="setupForm">
      <div class="section">
        <h2>Identidade da Marca</h2>
        <div class="grid-2">
          <div class="field">
            <label>Nome da marca/app *</label>
            <input type="text" name="brandName" required placeholder="MeuApp">
          </div>
          <div class="field">
            <label>Nome do app/produto</label>
            <input type="text" name="appName" placeholder="Mesmo que a marca (opcional)">
            <div class="hint">Deixe vazio para usar o mesmo nome da marca</div>
          </div>
        </div>
        <div class="grid-2">
          <div class="field">
            <label>Domínio do blog *</label>
            <input type="text" name="blogDomain" required placeholder="blog.meuapp.com">
          </div>
          <div class="field">
            <label>URL do app/produto *</label>
            <input type="url" name="appUrl" required placeholder="https://meuapp.com">
          </div>
        </div>
      </div>

      <div class="section">
        <h2>Nicho</h2>
        <div class="grid-2">
          <div class="field">
            <label>Nicho em português *</label>
            <input type="text" name="nichePt" required placeholder="finanças pessoais">
          </div>
          <div class="field">
            <label>Nicho em inglês *</label>
            <input type="text" name="nicheEn" required placeholder="personal finance">
          </div>
        </div>
        <div class="grid-2">
          <div class="field">
            <label>Nicho em espanhol *</label>
            <input type="text" name="nicheEs" required placeholder="finanzas personales">
          </div>
          <div class="field">
            <label>Autor padrão</label>
            <input type="text" name="author" placeholder="Nome ou marca">
          </div>
        </div>
        <div class="field">
          <label>Descreva seu produto em 1-2 frases (para gerar CTAs com IA)</label>
          <textarea name="productDescription" placeholder="App inteligente que ajuda pessoas a..."></textarea>
        </div>
      </div>

      <div class="section">
        <h2>Visual</h2>
        <div class="color-row">
          <div class="field">
            <label>Cor primária</label>
            <input type="color" name="colorPrimary" value="#58a6ff">
          </div>
          <div class="field">
            <label>Gradiente início</label>
            <input type="color" name="gradientStart" value="#00F0FF">
          </div>
          <div class="field">
            <label>Gradiente fim</label>
            <input type="color" name="gradientEnd" value="#A91079">
          </div>
        </div>
      </div>

      <div class="section">
        <h2>IA (opcional)</h2>
        <div class="field">
          <label>API Key (GROQ, OpenAI, Anthropic ou Kie.ai)</label>
          <input type="password" name="aiKey" placeholder="gsk_... ou sk-... (opcional)">
          <div class="hint">Se preenchida, gera CTAs, categorias e temas automaticamente pro seu nicho</div>
        </div>
        <div class="field">
          <label>Provider</label>
          <select name="aiProvider">
            <option value="groq">GROQ (grátis, recomendado)</option>
            <option value="openai">OpenAI (ChatGPT)</option>
            <option value="anthropic">Anthropic (Claude)</option>
            <option value="kie">Kie.ai</option>
          </select>
        </div>
      </div>

      <div class="actions">
        <button type="submit" class="btn" id="submitBtn">🚀 Criar Meu Blog</button>
      </div>

      <div id="status" class="status"></div>

      <ol class="steps" id="steps" style="display:none">
        <li id="step1">Gerando site.config.ts</li>
        <li id="step2">Gerando conteúdo com IA (se key fornecida)</li>
        <li id="step3">Gerando CSS, manifest, i18n</li>
        <li id="step4">Validando template</li>
        <li id="step5">Pronto! Rode npm run dev para ver</li>
      </ol>
    </form>
  </div>

  <script>
    document.getElementById('setupForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('submitBtn');
      const status = document.getElementById('status');
      const steps = document.getElementById('steps');

      btn.disabled = true;
      btn.textContent = '⏳ Configurando...';
      status.className = 'status loading';
      status.textContent = 'Processando... isso pode levar até 30 segundos.';
      steps.style.display = 'block';

      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData);

      try {
        const res = await fetch('/api/setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });

        const result = await res.json();

        if (result.success) {
          status.className = 'status success';
          status.textContent = '✅ Blog configurado com sucesso! Rode: npm run dev';
          document.querySelectorAll('.steps li').forEach(li => li.classList.add('done'));
        } else {
          status.className = 'status error';
          status.textContent = '❌ Erro: ' + (result.error || 'Algo deu errado');
        }
      } catch (err) {
        status.className = 'status error';
        status.textContent = '❌ Erro de conexão: ' + err.message;
      }

      btn.disabled = false;
      btn.textContent = '🚀 Criar Meu Blog';
    });
  </script>
</body>
</html>`;
}

function slugify(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function generateConfig(data, ai) {
  const brandName = data.brandName;
  const appName = data.appName || brandName;
  const blogDomain = data.blogDomain;
  const mainDomain = data.appUrl.replace('https://', '').replace('http://', '').replace(/\/.*/, '');
  const nichePt = data.nichePt;
  const nicheEn = data.nicheEn;
  const nicheEs = data.nicheEs;
  const author = data.author || brandName;
  const cfProjectName = slugify(brandName) + '-blog';
  const esc = (s) => String(s).replace(/'/g, "\\'");

  return `import type { SiteConfig } from './src/types/config';

export const config: SiteConfig = {
  siteName: '${brandName} Blog',
  siteUrl: 'https://${blogDomain}',
  siteDescription: ${JSON.stringify(ai.siteDescription, null, 4)},
  defaultLocale: 'pt',
  locales: ['pt', 'en', 'es'],

  brand: {
    name: '${brandName}',
    blogSuffix: 'Blog',
    tagline: ${JSON.stringify(ai.tagline, null, 6)},
    logo: {
      svgPath: 'M12 44 L24 28 L34 38 L44 20 L52 28',
      gradientStart: '${data.gradientStart}',
      gradientEnd: '${data.gradientEnd}',
    },
    colors: {
      background: '#0d1117',
      primary: '${data.colorPrimary}',
      secondary: '#bc8cff',
      ctaGradientStart: '${data.gradientStart}',
      ctaGradientEnd: '${data.gradientEnd}',
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
    categories: ${JSON.stringify(ai.categories)} as const,
    glossaryCategories: ${JSON.stringify(ai.glossaryCategories)} as const,
    // Fonte ÚNICA do menu "Categorias" (header + mobile + rodapé + sidebar)
    categoryNav: ${JSON.stringify(ai.categoryNav, null, 6)},
    niche: {
      pt: '${nichePt}',
      en: '${nicheEn}',
      es: '${nicheEs}',
    },
    defaultAuthor: '${author}',
    defaultKeywords: {
      pt: '${nichePt}, dicas, guia',
      en: '${nicheEn}, tips, guide',
      es: '${nicheEs}, consejos, guía',
    },
  },

  app: {
    name: '${appName}',
    url: '${data.appUrl}',
    schemaCategory: 'WebApplication',
    priceCurrency: 'BRL',
    features: ${JSON.stringify(ai.features, null, 6)},
    ctaText: ${JSON.stringify(ai.ctaText, null, 6)},
    ctaTitle: ${JSON.stringify(ai.ctaTitle, null, 6)},
    ctaNote: ${JSON.stringify(ai.ctaNote, null, 6)},
  },

  social: { twitter: '', instagram: '', linkedin: '', github: '', youtube: '' },
  analytics: { cloudflareBeaconToken: '' },
  giscus: { repo: '', repoId: '', category: 'Announcements', categoryId: '' },
  email: {
    from: '${brandName} Blog <blog@email.${mainDomain}>',
    replyTo: 'contato@${mainDomain}',
  },

  ai: {
    personality: '${esc(ai.aiPersonality || `Você é um redator experiente de ${nichePt} que escreve para brasileiros. Seu estilo é direto, prático e conversacional. Quando menciona o app ${appName}, faz de forma natural.`)}',
    nicheKeywords: ${JSON.stringify(ai.nicheKeywords)},
    dailyTopics: ${JSON.stringify(ai.dailyTopics, null, 4)},
    seasonalCalendar: ${JSON.stringify(ai.seasonalCalendar || [], null, 4)},
    comparisonTopics: ${JSON.stringify(ai.comparisonTopics || [], null, 4)},
    solutionTopics: ${JSON.stringify(ai.solutionTopics || [], null, 4)},
  },

  bot: { name: '${brandName} Bot', email: 'bot@${mainDomain}' },
  cloudflare: { projectName: '${cfProjectName}', kvNamespaceId: '' },
};
`;
}

const server = createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(getHTML());
    return;
  }

  if (req.method === 'POST' && req.url === '/api/setup') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);

        // 1. Set env var if AI key provided (ANTES de gerar — a IA usa esta chave)
        if (data.aiKey) {
          const envMap = { groq: 'GROQ_API_KEY', openai: 'OPENAI_API_KEY', anthropic: 'ANTHROPIC_API_KEY', kie: 'KIE_API_KEY' };
          const envVar = envMap[data.aiProvider] || 'GROQ_API_KEY';
          process.env[envVar] = data.aiKey;
        }

        // 2. Gera conteúdo com IA (T4 — antes o formulário coletava a chave e nunca a usava)
        const { generateWithAI, getGenericDefaults, normalizeAIData, detectAIProvider } = await import('./setup.js');
        const fallback = getGenericDefaults(data.brandName, data.nichePt, data.nicheEn, data.nicheEs);
        let ai = fallback;
        if (detectAIProvider()) {
          try {
            const raw = await generateWithAI(data.brandName, data.nichePt, data.nicheEn, data.nicheEs, data.productDescription || '');
            ai = normalizeAIData(raw, fallback) || fallback;
          } catch { /* fallback genérico */ }
        }

        // 3. Generate config (com dados da IA ou fallback)
        const configContent = generateConfig(data, ai);
        writeFileSync(join(ROOT, 'site.config.ts'), configContent, 'utf-8');

        // 4. Run generate
        try {
          execSync('npm run generate', { cwd: ROOT, stdio: 'pipe', timeout: 30000 });
        } catch (e) {
          // non-fatal
        }

        // 4. Update wrangler.toml
        const wranglerPath = join(ROOT, 'wrangler.toml');
        if (existsSync(wranglerPath)) {
          let wrangler = readFileSync(wranglerPath, 'utf-8');
          wrangler = wrangler.replace(/name\s*=\s*"[^"]*"/, `name = "${slugify(data.brandName)}-blog"`);
          writeFileSync(wranglerPath, wrangler, 'utf-8');
        }

        // 5. Update package.json
        const pkgPath = join(ROOT, 'package.json');
        if (existsSync(pkgPath)) {
          const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
          pkg.name = slugify(data.brandName) + '-blog';
          pkg.description = `Blog ${data.brandName} - ${data.nichePt}`;
          writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  🚀 Blog Template — Setup Visual                            ║
║                                                              ║
║  Abra no browser: ${url}                        ║
║                                                              ║
║  Preencha o formulário e clique "Criar Meu Blog".           ║
║  Ctrl+C para fechar quando terminar.                        ║
╚══════════════════════════════════════════════════════════════╝
`);

  // Try to open browser automatically
  try {
    const { platform } = process;
    if (platform === 'win32') execSync(`start ${url}`, { stdio: 'ignore' });
    else if (platform === 'darwin') execSync(`open ${url}`, { stdio: 'ignore' });
    else execSync(`xdg-open ${url}`, { stdio: 'ignore' });
  } catch (e) {
    // Manual open is fine
  }
});
