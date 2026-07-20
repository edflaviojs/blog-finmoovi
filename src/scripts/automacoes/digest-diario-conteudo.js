import { config } from '../../../site.config.ts';
/**
 * Digest Diário de Conteúdo — 7h (horário de Lisboa)
 * Envia UM e-mail com os links de TODO o conteúdo gerado e publicado no blog
 * nas últimas 24h (posts de todas as categorias + glossário), detectado pela
 * data real do commit no git (arquivos adicionados).
 * Executado via GitHub Actions (ver .github/workflows/digest-diario-conteudo.yml).
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const DIGEST_TO = process.env.DIGEST_TO || 'finmoovi@gmail.com';

// Pastas de conteúdo versionado (relativas à raiz do repo) e a rota pública de cada uma.
const CONTENT_SOURCES = [
  { dir: 'src/content/posts', route: 'post', label: 'Posts' },
  { dir: 'src/content/glossario', route: 'glossario', label: 'Glossário' }
];

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm = {};
  match[1].split('\n').forEach(line => {
    const [key, ...rest] = line.split(':');
    if (key && rest.length) {
      let value = rest.join(':').trim();
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      fm[key.trim()] = value;
    }
  });
  return fm;
}

// Arquivos .md ADICIONADOS (criados/publicados) nas últimas 24h, por data do commit.
function getFilesAddedLast24h() {
  const dirs = CONTENT_SOURCES.map(s => s.dir).join(' ');
  let out = '';
  try {
    out = execSync(
      `git log --since="24 hours ago" --diff-filter=A --name-only --pretty=format: -- ${dirs}`,
      { encoding: 'utf-8', cwd: process.cwd() }
    );
  } catch (err) {
    console.error(`⚠️ git log falhou: ${err.message}`);
    return [];
  }
  const set = new Set(
    out
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.endsWith('.md'))
  );
  return [...set];
}

// Deriva locale + slug + rota a partir do caminho do arquivo.
function describeFile(filePath) {
  const source = CONTENT_SOURCES.find(s => filePath.startsWith(s.dir + '/'));
  if (!source) return null;
  const fileName = filePath.slice(source.dir.length + 1); // remove "src/content/xxx/"
  if (!fileName.endsWith('.md')) return null;

  let locale = 'pt';
  let base = fileName.replace(/\.md$/, '');
  if (base.startsWith('en-')) { locale = 'en'; base = base.slice(3); }
  else if (base.startsWith('es-')) { locale = 'es'; base = base.slice(3); }

  const basePath = locale === 'pt' ? '' : `/${locale}`;
  const url = `${config.siteUrl}${basePath}/${source.route}/${base}`;

  let fm = {};
  try {
    fm = parseFrontmatter(readFileSync(join(process.cwd(), filePath), 'utf-8'));
  } catch {
    // arquivo pode ter sido removido depois; segue com metadados vazios
  }

  return {
    label: source.label,
    route: source.route,
    locale,
    slug: base,
    url,
    title: fm.title || base,
    description: fm.description || '',
    category: fm.category || '',
    publishedAt: fm.publishedAt || ''
  };
}

function buildHTML(items, dateStr) {
  const brand = config.brand?.name || 'FinMoovi';
  const localeFlag = { pt: '🇧🇷', en: '🇺🇸', es: '🇪🇸' };

  if (items.length === 0) {
    return {
      subject: `📊 ${brand} — nenhum conteúdo novo (${dateStr})`,
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:#161b22;border:1px solid #30363d;border-radius:12px;padding:32px;text-align:center;">
      <h1 style="color:#f0f6fc;font-size:22px;margin:0 0 8px;">Digest diário do blog</h1>
      <p style="color:#8b949e;font-size:14px;margin:0 0 4px;">${dateStr}</p>
      <p style="color:#8b949e;font-size:15px;margin:24px 0 0;">Nenhum conteúdo novo foi publicado nas últimas 24h.</p>
      <p style="color:#6e7681;font-size:12px;margin:16px 0 0;">O pipeline rodou normalmente.</p>
    </div>
  </div>
</body></html>`
    };
  }

  // Agrupa por seção (Posts / Glossário)
  const sections = {};
  for (const it of items) {
    (sections[it.label] ||= []).push(it);
  }

  const renderRow = (it) => `
    <tr><td style="padding:12px 0;border-bottom:1px solid #30363d;">
      <a href="${it.url}" style="color:#58a6ff;font-size:15px;font-weight:600;text-decoration:none;">${localeFlag[it.locale] || ''} ${it.title}</a>
      ${it.category ? `<span style="display:inline-block;margin-left:8px;font-size:11px;color:#8b949e;background:#0d1117;border:1px solid #30363d;border-radius:10px;padding:1px 8px;">${it.category}</span>` : ''}
      ${it.description ? `<p style="color:#8b949e;font-size:13px;margin:4px 0 0;">${it.description}</p>` : ''}
      <p style="color:#6e7681;font-size:11px;margin:4px 0 0;word-break:break-all;">${it.url}</p>
    </td></tr>`;

  const renderSection = (title, rows) => `
    <h2 style="color:#f0f6fc;font-size:18px;margin:24px 0 12px;border-left:3px solid #3fb950;padding-left:12px;">${title} <span style="color:#8b949e;font-size:14px;">(${rows.length})</span></h2>
    <table style="width:100%;border-collapse:collapse;">${rows.map(renderRow).join('')}</table>`;

  const body = Object.entries(sections)
    .map(([title, rows]) => renderSection(title, rows))
    .join('');

  return {
    subject: `📊 ${brand} — ${items.length} conteúdo(s) publicado(s) (${dateStr})`,
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:#161b22;border:1px solid #30363d;border-radius:12px;padding:32px;">
      <h1 style="color:#f0f6fc;font-size:22px;text-align:center;margin:0 0 8px;">Digest diário do blog</h1>
      <p style="color:#8b949e;font-size:14px;text-align:center;margin:0 0 8px;">Tudo que foi gerado e publicado nas últimas 24h · ${dateStr}</p>
      ${body}
      <div style="text-align:center;margin-top:32px;">
        <a href="${config.siteUrl}" style="display:inline-block;padding:12px 32px;background:#238636;color:#fff;font-weight:600;font-size:14px;text-decoration:none;border-radius:8px;">Abrir o blog</a>
      </div>
    </div>
  </div>
</body></html>`
  };
}

async function sendEmail(to, subject, html) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: config.email.from,
      to: [to],
      subject,
      html
    })
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Resend ${res.status}: ${txt}`);
  }
  return true;
}

async function main() {
  console.log('📬 Gerando digest diário de conteúdo (últimas 24h)...');

  if (!RESEND_API_KEY) {
    console.error('❌ Falta RESEND_API_KEY');
    process.exit(1);
  }

  const files = getFilesAddedLast24h();
  console.log(`🗂️ ${files.length} arquivo(s) .md adicionado(s) nas últimas 24h`);

  const items = files
    .map(describeFile)
    .filter(Boolean)
    .sort((a, b) => (a.label.localeCompare(b.label) || a.title.localeCompare(b.title)));

  const dateStr = new Date().toLocaleDateString('pt-PT', {
    timeZone: 'Europe/Lisbon',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const { subject, html } = buildHTML(items, dateStr);

  await sendEmail(DIGEST_TO, subject, html);
  console.log(`✅ Digest enviado para ${DIGEST_TO} — ${items.length} item(ns)`);
}

main().catch(err => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});
