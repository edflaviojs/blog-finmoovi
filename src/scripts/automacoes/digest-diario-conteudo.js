import { config } from '../../../site.config.ts';
/**
 * Relatório do Dia — enviado ~6h40 (horário de Lisboa)
 * UM e-mail com o resumo completo do DIA ANTERIOR (00:00–23:59 em Europe/Lisbon):
 *   1. 🚨 Falhas de workflows (se houver)
 *   2. 📝 Conteúdo publicado no blog (posts + glossário, via git log)
 *   3. 🎬 Vídeos publicados no YouTube (.github/data/youtube-published.json)
 *   4. 📌 Pins publicados no Pinterest (.github/data/pinterest-published.json)
 *   5. ⚙️ Workflows executados (API do GitHub Actions)
 *   6. 📧 E-mails provavelmente enviados (workflows de e-mail com sucesso)
 *   7. 📋 Pendências abertas (PENDENCIAS.md na raiz do repo)
 * Cada seção é isolada em try/catch: falha numa seção vira aviso no e-mail, nunca aborta o envio.
 * Flag --dry-run: monta tudo, grava digest-preview.html e NÃO envia (não exige RESEND_API_KEY).
 * Executado via GitHub Actions (ver .github/workflows/digest-diario-conteudo.yml).
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const DRY_RUN = process.argv.includes('--dry-run');
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const DIGEST_TO = process.env.DIGEST_TO || 'finmoovi@gmail.com';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY || '';

// Pastas de conteúdo versionado (relativas à raiz do repo) e a rota pública de cada uma.
const CONTENT_SOURCES = [
  { dir: 'src/content/posts', route: 'posts', label: 'Posts' },
  { dir: 'src/content/glossario', route: 'glossario', label: 'Glossário' }
];

// Workflows que enviam e-mail (comparados contra o path do run).
const EMAIL_WORKFLOWS = ['digest-diario-conteudo', 'newsletter-digest', 'welcome-sequence'];

// ---------------------------------------------------------------------------
// Janela: dia anterior COMPLETO no fuso Europe/Lisbon
// ---------------------------------------------------------------------------

function lisbonOffsetMinutes(dateUtc) {
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Lisbon', timeZoneName: 'longOffset' });
  const tzName = fmt.formatToParts(dateUtc).find(p => p.type === 'timeZoneName')?.value || 'GMT';
  const m = tzName.match(/([+-])(\d{2}):(\d{2})/);
  if (!m) return 0; // "GMT" puro = UTC+0
  return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]));
}

function getYesterdayWindow(now = new Date()) {
  // Data civil de HOJE em Lisboa
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(now); // "YYYY-MM-DD"
  const [y, mo, d] = parts.split('-').map(Number);
  const todayMidnightApprox = Date.UTC(y, mo - 1, d); // 00:00 de hoje como se fosse UTC
  const yestMidnightApprox = todayMidnightApprox - 24 * 3600 * 1000;

  // Converte "00:00 local Lisboa" em instante UTC real, usando o offset vigente em cada dia.
  const startUtc = new Date(yestMidnightApprox - lisbonOffsetMinutes(new Date(yestMidnightApprox)) * 60000);
  const endUtc = new Date(todayMidnightApprox - lisbonOffsetMinutes(new Date(todayMidnightApprox)) * 60000 - 1); // 23:59:59.999 de ontem

  const yd = new Date(yestMidnightApprox); // só p/ formatar a data civil de ontem
  const dateLabel = `${String(yd.getUTCDate()).padStart(2, '0')}/${String(yd.getUTCMonth() + 1).padStart(2, '0')}`;
  const dateFull = `${String(yd.getUTCDate()).padStart(2, '0')}/${String(yd.getUTCMonth() + 1).padStart(2, '0')}/${yd.getUTCFullYear()}`;
  return { startUtc, endUtc, dateLabel, dateFull };
}

function inWindow(isoStr, win) {
  const t = new Date(isoStr).getTime();
  return !Number.isNaN(t) && t >= win.startUtc.getTime() && t <= win.endUtc.getTime();
}

function lisbonTime(isoStr) {
  return new Intl.DateTimeFormat('pt-PT', {
    timeZone: 'Europe/Lisbon', hour: '2-digit', minute: '2-digit', hour12: false
  }).format(new Date(isoStr));
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// Seção 2 — Conteúdo publicado (git log no dia anterior Lisboa)
// ---------------------------------------------------------------------------

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

// Arquivos .md ADICIONADOS (criados/publicados) no dia anterior (janela Lisboa), por data do commit.
function getFilesAddedYesterday(win) {
  const dirs = CONTENT_SOURCES.map(s => s.dir).join(' ');
  const out = execSync(
    `git log --since="${win.startUtc.toISOString()}" --until="${win.endUtc.toISOString()}" --diff-filter=A --name-only --pretty=format: -- ${dirs}`,
    { encoding: 'utf-8', cwd: process.cwd() }
  );
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
  const base = fileName.replace(/\.md$/, '');
  // O slug do Astro MANTÉM o prefixo de locale (ex.: es-yahoo-finance) — detectar o
  // idioma pelo prefixo, mas NÃO cortá-lo, senão a URL do e-mail fica errada (404).
  if (base.startsWith('en-')) locale = 'en';
  else if (base.startsWith('es-')) locale = 'es';

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

// ---------------------------------------------------------------------------
// Seções 3/4 — YouTube e Pinterest (arquivos de estado em .github/data)
// ---------------------------------------------------------------------------

function getYouTubeYesterday(win) {
  const file = join(process.cwd(), '.github/data/youtube-published.json');
  if (!existsSync(file)) return [];
  const data = JSON.parse(readFileSync(file, 'utf-8'));
  // Schema: objeto keyed por slug → { videoId, uploadedAt, title }
  return Object.entries(data)
    .map(([slug, v]) => ({ slug, ...v }))
    .filter(v => v.uploadedAt && inWindow(v.uploadedAt, win))
    .sort((a, b) => a.uploadedAt.localeCompare(b.uploadedAt));
}

function getPinterestYesterday(win) {
  const file = join(process.cwd(), '.github/data/pinterest-published.json');
  if (!existsSync(file)) return [];
  const data = JSON.parse(readFileSync(file, 'utf-8'));
  // Schema: array → { slug, title, pinId, publishedAt, postUrl }
  return (Array.isArray(data) ? data : [])
    .filter(p => p.publishedAt && inWindow(p.publishedAt, win))
    .sort((a, b) => a.publishedAt.localeCompare(b.publishedAt));
}

// ---------------------------------------------------------------------------
// Seção 5 — Workflows executados (API GitHub Actions, paginada)
// ---------------------------------------------------------------------------

async function fetchWorkflowRuns(win) {
  if (!GITHUB_TOKEN || !GITHUB_REPOSITORY) {
    throw new Error('GITHUB_TOKEN/GITHUB_REPOSITORY indisponíveis — seção de workflows pulada');
  }
  // Datas UTC que COBREM o dia Lisboa (a janela exata é filtrada client-side).
  const d1 = win.startUtc.toISOString().slice(0, 10);
  const d2 = win.endUtc.toISOString().slice(0, 10);
  const runs = [];
  for (let page = 1; page <= 20; page++) {
    const url = `https://api.github.com/repos/${GITHUB_REPOSITORY}/actions/runs?created=${d1}..${d2}&per_page=100&page=${page}`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });
    if (!res.ok) throw new Error(`API GitHub ${res.status} ao listar runs`);
    const json = await res.json();
    const batch = json.workflow_runs || [];
    runs.push(...batch);
    if (batch.length < 100) break;
  }
  return runs
    .filter(r => inWindow(r.run_started_at || r.created_at, win))
    .sort((a, b) => (a.run_started_at || a.created_at).localeCompare(b.run_started_at || b.created_at));
}

const EVENT_LABEL = { schedule: 'cron', workflow_dispatch: 'manual', push: 'push' };
const STATUS_EMOJI = { success: '✅', failure: '❌', cancelled: '🚫', skipped: '⏭️' };

function runDurationMin(r) {
  const start = new Date(r.run_started_at || r.created_at).getTime();
  const end = new Date(r.updated_at).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return '—';
  return Math.max(1, Math.round((end - start) / 60000));
}

// ---------------------------------------------------------------------------
// Seção 7 — Pendências (PENDENCIAS.md)
// ---------------------------------------------------------------------------

function getPendencias() {
  const file = join(process.cwd(), 'PENDENCIAS.md');
  if (!existsSync(file)) return [];
  const md = readFileSync(file, 'utf-8');
  return md
    .split('\n')
    .map(l => l.trim())
    .filter(l => /^-\s*\[\s\]\s+/.test(l))
    .map(l => l.replace(/^-\s*\[\s\]\s+/, '')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/`(.+?)`/g, '$1')
      .replace(/\[(.+?)\]\((.+?)\)/g, '$1'));
}

// ---------------------------------------------------------------------------
// Blocos HTML (tema dark #0d1117 / #161b22)
// ---------------------------------------------------------------------------

const sectionTitle = (t, count, color = '#3fb950') =>
  `<h2 style="color:#f0f6fc;font-size:17px;margin:26px 0 12px;border-left:3px solid ${color};padding-left:12px;">${t}${count !== undefined ? ` <span style="color:#8b949e;font-size:13px;">(${count})</span>` : ''}</h2>`;

const emptyLine = (txt) => `<p style="color:#6e7681;font-size:13px;margin:4px 0 0;">${txt}</p>`;

const warnBlock = (section, msg) =>
  `${sectionTitle(section, undefined, '#d29922')}<p style="color:#d29922;font-size:13px;margin:4px 0 0;">⚠️ Seção indisponível: ${esc(msg)}</p>`;

function htmlFalhas(failures) {
  if (failures.length === 0) return '';
  const rows = failures.map(r => `
    <tr><td style="padding:10px 0;border-bottom:1px solid #30363d;">
      <a href="${esc(r.html_url)}" style="color:#f85149;font-size:14px;font-weight:600;text-decoration:none;">❌ ${esc(r.name)}</a>
      <span style="color:#8b949e;font-size:12px;margin-left:8px;">${lisbonTime(r.run_started_at || r.created_at)} (Lisboa)</span>
      <p style="color:#6e7681;font-size:11px;margin:3px 0 0;word-break:break-all;">${esc(r.html_url)}</p>
    </td></tr>`).join('');
  return `${sectionTitle('🚨 Falhas', failures.length, '#f85149')}<table style="width:100%;border-collapse:collapse;">${rows}</table>`;
}

function htmlConteudo(items) {
  const localeFlag = { pt: '🇧🇷', en: '🇺🇸', es: '🇪🇸' };
  if (items.length === 0) {
    return `${sectionTitle('📝 Conteúdo publicado', 0)}${emptyLine('Nenhum conteúdo novo publicado no blog.')}`;
  }
  const sections = {};
  for (const it of items) (sections[it.label] ||= []).push(it);

  const renderRow = (it) => `
    <tr><td style="padding:12px 0;border-bottom:1px solid #30363d;">
      <a href="${esc(it.url)}" style="color:#58a6ff;font-size:15px;font-weight:600;text-decoration:none;">${localeFlag[it.locale] || ''} ${esc(it.title)}</a>
      ${it.category ? `<span style="display:inline-block;margin-left:8px;font-size:11px;color:#8b949e;background:#0d1117;border:1px solid #30363d;border-radius:10px;padding:1px 8px;">${esc(it.category)}</span>` : ''}
      ${it.description ? `<p style="color:#8b949e;font-size:13px;margin:4px 0 0;">${esc(it.description)}</p>` : ''}
      <p style="color:#6e7681;font-size:11px;margin:4px 0 0;word-break:break-all;">${esc(it.url)}</p>
    </td></tr>`;

  const body = Object.entries(sections).map(([title, rows]) =>
    `<p style="color:#8b949e;font-size:13px;margin:12px 0 4px;font-weight:600;">${title} (${rows.length})</p>
     <table style="width:100%;border-collapse:collapse;">${rows.map(renderRow).join('')}</table>`).join('');

  return `${sectionTitle('📝 Conteúdo publicado', items.length)}${body}`;
}

function htmlYouTube(videos) {
  if (videos.length === 0) {
    return `${sectionTitle('🎬 YouTube', 0, '#ff0000')}${emptyLine('Nenhum vídeo publicado.')}`;
  }
  const rows = videos.map(v => `
    <tr><td style="padding:10px 0;border-bottom:1px solid #30363d;">
      <a href="https://youtu.be/${esc(v.videoId)}" style="color:#58a6ff;font-size:14px;font-weight:600;text-decoration:none;">▶️ ${esc(v.title || v.slug)}</a>
      <span style="color:#8b949e;font-size:12px;margin-left:8px;">${lisbonTime(v.uploadedAt)} (Lisboa)</span>
      ${v.privacyStatus ? `<span style="display:inline-block;margin-left:8px;font-size:11px;color:#8b949e;background:#0d1117;border:1px solid #30363d;border-radius:10px;padding:1px 8px;">${esc(v.privacyStatus)}</span>` : ''}
      <p style="color:#6e7681;font-size:11px;margin:3px 0 0;">https://youtu.be/${esc(v.videoId)}</p>
    </td></tr>`).join('');
  return `${sectionTitle('🎬 YouTube', videos.length, '#ff0000')}<table style="width:100%;border-collapse:collapse;">${rows}</table>`;
}

function htmlPinterest(pins) {
  if (pins.length === 0) {
    return `${sectionTitle('📌 Pinterest', 0, '#e60023')}${emptyLine('Nenhum pin publicado.')}`;
  }
  const rows = pins.map(p => `
    <tr><td style="padding:10px 0;border-bottom:1px solid #30363d;">
      <a href="https://www.pinterest.com/pin/${esc(p.pinId)}/" style="color:#58a6ff;font-size:14px;font-weight:600;text-decoration:none;">📌 ${esc(p.title || p.slug)}</a>
      <span style="color:#8b949e;font-size:12px;margin-left:8px;">${lisbonTime(p.publishedAt)} (Lisboa)</span>
      <p style="color:#6e7681;font-size:11px;margin:3px 0 0;word-break:break-all;">Post: ${esc(p.postUrl || '')}<br>Pin: https://www.pinterest.com/pin/${esc(p.pinId)}/</p>
    </td></tr>`).join('');
  return `${sectionTitle('📌 Pinterest', pins.length, '#e60023')}<table style="width:100%;border-collapse:collapse;">${rows}</table>`;
}

function htmlWorkflows(runs) {
  if (runs.length === 0) {
    return `${sectionTitle('⚙️ Workflows executados', 0, '#8957e5')}${emptyLine('Nenhum workflow executado.')}`;
  }
  // Agrupa por nome de workflow; >3 execuções viram UMA linha com contagem.
  const byName = new Map();
  for (const r of runs) {
    if (!byName.has(r.name)) byName.set(r.name, []);
    byName.get(r.name).push(r);
  }

  const statusOf = (r) => STATUS_EMOJI[r.conclusion] || r.conclusion || r.status || '?';
  const eventOf = (r) => EVENT_LABEL[r.event] || r.event;

  const lines = [];
  for (const [name, group] of byName) {
    if (group.length > 3) {
      const counts = {};
      for (const r of group) counts[statusOf(r)] = (counts[statusOf(r)] || 0) + 1;
      const statusStr = Object.entries(counts).map(([s, n]) => `${n} ${s}`).join(' · ');
      const avgDur = Math.round(group.reduce((acc, r) => acc + (typeof runDurationMin(r) === 'number' ? runDurationMin(r) : 0), 0) / group.length);
      lines.push({
        time: lisbonTime(group[0].run_started_at || group[0].created_at),
        sort: group[0].run_started_at || group[0].created_at,
        name: `${name} ×${group.length}`,
        event: [...new Set(group.map(eventOf))].join('/'),
        dur: `~${avgDur}`,
        status: statusStr
      });
    } else {
      for (const r of group) {
        lines.push({
          time: lisbonTime(r.run_started_at || r.created_at),
          sort: r.run_started_at || r.created_at,
          name,
          event: eventOf(r),
          dur: String(runDurationMin(r)),
          status: statusOf(r)
        });
      }
    }
  }
  lines.sort((a, b) => a.sort.localeCompare(b.sort));

  const nOk = runs.filter(r => r.conclusion === 'success').length;
  const nFail = runs.filter(r => r.conclusion === 'failure').length;

  const th = (t, align = 'left') => `<th style="text-align:${align};color:#8b949e;font-size:11px;font-weight:600;padding:6px 8px;border-bottom:1px solid #30363d;">${t}</th>`;
  const td = (t, align = 'left') => `<td style="text-align:${align};color:#c9d1d9;font-size:12px;padding:6px 8px;border-bottom:1px solid #21262d;">${t}</td>`;

  const table = `
    <table style="width:100%;border-collapse:collapse;">
      <tr>${th('Início')}${th('Workflow')}${th('Evento')}${th('Min', 'right')}${th('Status', 'center')}</tr>
      ${lines.map(l => `<tr>${td(l.time)}${td(esc(l.name))}${td(esc(l.event))}${td(l.dur, 'right')}${td(l.status, 'center')}</tr>`).join('')}
    </table>
    <p style="color:#8b949e;font-size:12px;margin:10px 0 0;">Total: ${runs.length} runs · ${nOk} ✅ · ${nFail} ❌</p>`;

  return `${sectionTitle('⚙️ Workflows executados', runs.length, '#8957e5')}${table}`;
}

function htmlEmails(runs) {
  const emailRuns = runs.filter(r =>
    r.conclusion === 'success' &&
    EMAIL_WORKFLOWS.some(w => (r.path || '').includes(w))
  );
  if (emailRuns.length === 0) {
    return `${sectionTitle('📧 E-mails enviados', 0, '#58a6ff')}${emptyLine('Nenhum workflow de e-mail concluído com sucesso.')}`;
  }
  const rows = emailRuns.map(r => `
    <tr><td style="padding:8px 0;border-bottom:1px solid #21262d;">
      <span style="color:#c9d1d9;font-size:13px;">✉️ ${esc(r.name)}</span>
      <span style="color:#8b949e;font-size:12px;margin-left:8px;">${lisbonTime(r.run_started_at || r.created_at)} (Lisboa) — provavelmente enviou</span>
    </td></tr>`).join('');
  return `${sectionTitle('📧 E-mails enviados', emailRuns.length, '#58a6ff')}<table style="width:100%;border-collapse:collapse;">${rows}</table>`;
}

function htmlPendencias(pendencias) {
  if (pendencias.length === 0) {
    return `${sectionTitle('📋 Pendências', 0, '#d29922')}${emptyLine('Nenhuma pendência registrada. 🎉')}`;
  }
  const rows = pendencias.map(p => `
    <tr><td style="padding:7px 0;border-bottom:1px solid #21262d;color:#c9d1d9;font-size:13px;">☐ ${esc(p)}</td></tr>`).join('');
  return `${sectionTitle('📋 Pendências', pendencias.length, '#d29922')}<table style="width:100%;border-collapse:collapse;">${rows}</table>`;
}

function buildEmail(sections, counts, win) {
  const brand = config.brand?.name || 'FinMoovi';

  // Subject: omitir partes zeradas (exceto conteúdos); ⚠️ se houver falhas.
  const parts = [`${counts.content} conteúdo${counts.content === 1 ? '' : 's'}`];
  if (counts.videos > 0) parts.push(`${counts.videos} vídeo${counts.videos === 1 ? '' : 's'}`);
  if (counts.pins > 0) parts.push(`${counts.pins} pin${counts.pins === 1 ? '' : 's'}`);
  if (counts.failures > 0) parts.push(`${counts.failures} falha${counts.failures === 1 ? '' : 's'}`);
  const prefix = counts.failures > 0 ? '⚠️ ' : '';
  const subject = `${prefix}📊 ${brand} — Relatório de ${win.dateLabel}: ${parts.join(' · ')}`;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:640px;margin:0 auto;padding:40px 20px;">
    <div style="background:#161b22;border:1px solid #30363d;border-radius:12px;padding:32px;">
      <h1 style="color:#f0f6fc;font-size:22px;text-align:center;margin:0 0 8px;">📊 Relatório do Dia</h1>
      <p style="color:#8b949e;font-size:14px;text-align:center;margin:0 0 8px;">Tudo que aconteceu em ${win.dateFull} (dia completo, horário de Lisboa)</p>
      ${sections.join('')}
      <div style="text-align:center;margin-top:32px;">
        <a href="${config.siteUrl}" style="display:inline-block;padding:12px 32px;background:#238636;color:#fff;font-weight:600;font-size:14px;text-decoration:none;border-radius:8px;">Abrir o blog</a>
      </div>
      <p style="color:#484f58;font-size:11px;text-align:center;margin:24px 0 0;">Gerado automaticamente pelo digest-diario-conteudo · edite PENDENCIAS.md p/ atualizar a seção de pendências</p>
    </div>
  </div>
</body></html>`;

  return { subject, html };
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

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`📬 Gerando Relatório do Dia${DRY_RUN ? ' (dry-run)' : ''}...`);

  if (!DRY_RUN && !RESEND_API_KEY) {
    console.error('❌ Falta RESEND_API_KEY');
    process.exit(1);
  }

  const win = getYesterdayWindow();
  console.log(`🗓️ Janela (dia anterior em Lisboa): ${win.startUtc.toISOString()} → ${win.endUtc.toISOString()}`);

  const sections = [];
  const counts = { content: 0, videos: 0, pins: 0, failures: 0, runs: 0 };

  // 5 (buscado primeiro pois alimenta 1 e 6) — Workflows via API GitHub
  let runs = [];
  let runsError = null;
  try {
    runs = await fetchWorkflowRuns(win);
    counts.runs = runs.length;
    console.log(`⚙️ ${runs.length} workflow run(s) no dia anterior`);
  } catch (err) {
    runsError = err.message;
    console.warn(`⚠️ Workflows indisponíveis: ${err.message}`);
  }

  // 1. Falhas (topo, só se houver)
  try {
    if (!runsError) {
      const failures = runs.filter(r => r.conclusion === 'failure');
      counts.failures = failures.length;
      sections.push(htmlFalhas(failures));
      console.log(`🚨 ${failures.length} falha(s)`);
    }
  } catch (err) {
    sections.push(warnBlock('🚨 Falhas', err.message));
  }

  // 2. Conteúdo publicado
  try {
    const items = getFilesAddedYesterday(win)
      .map(describeFile)
      .filter(Boolean)
      .sort((a, b) => (a.label.localeCompare(b.label) || a.title.localeCompare(b.title)));
    counts.content = items.length;
    sections.push(htmlConteudo(items));
    console.log(`📝 ${items.length} conteúdo(s) publicado(s)`);
  } catch (err) {
    sections.push(warnBlock('📝 Conteúdo publicado', err.message));
  }

  // 3. YouTube
  try {
    const videos = getYouTubeYesterday(win);
    counts.videos = videos.length;
    sections.push(htmlYouTube(videos));
    console.log(`🎬 ${videos.length} vídeo(s) YouTube`);
  } catch (err) {
    sections.push(warnBlock('🎬 YouTube', err.message));
  }

  // 4. Pinterest
  try {
    const pins = getPinterestYesterday(win);
    counts.pins = pins.length;
    sections.push(htmlPinterest(pins));
    console.log(`📌 ${pins.length} pin(s) Pinterest`);
  } catch (err) {
    sections.push(warnBlock('📌 Pinterest', err.message));
  }

  // 5. Workflows executados
  try {
    sections.push(runsError ? warnBlock('⚙️ Workflows executados', runsError) : htmlWorkflows(runs));
  } catch (err) {
    sections.push(warnBlock('⚙️ Workflows executados', err.message));
  }

  // 6. E-mails enviados
  try {
    sections.push(runsError ? warnBlock('📧 E-mails enviados', runsError) : htmlEmails(runs));
  } catch (err) {
    sections.push(warnBlock('📧 E-mails enviados', err.message));
  }

  // 7. Pendências
  try {
    const pendencias = getPendencias();
    sections.push(htmlPendencias(pendencias));
    console.log(`📋 ${pendencias.length} pendência(s) aberta(s)`);
  } catch (err) {
    sections.push(warnBlock('📋 Pendências', err.message));
  }

  const { subject, html } = buildEmail(sections, counts, win);
  console.log(`✉️ Subject: ${subject}`);

  if (DRY_RUN) {
    const previewPath = join(process.cwd(), 'digest-preview.html');
    writeFileSync(previewPath, html, 'utf-8');
    console.log(`🧪 Dry-run: preview salvo em ${previewPath} — NADA foi enviado.`);
    console.log(`📊 Resumo: ${counts.content} conteúdos · ${counts.videos} vídeos · ${counts.pins} pins · ${counts.runs} runs · ${counts.failures} falhas`);
    return;
  }

  await sendEmail(DIGEST_TO, subject, html);
  console.log(`✅ Digest enviado para ${DIGEST_TO}`);
}

main().catch(err => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});
