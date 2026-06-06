/**
 * Newsletter Digest Semanal
 * Envia resumo dos posts da semana para todos os subscribers ativos
 * Executado via GitHub Actions toda segunda-feira às 10h BRT
 */

import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const POSTS_DIR = join(process.cwd(), 'src', 'content', 'posts');
const GLOSSARIO_DIR = join(process.cwd(), 'src', 'content', 'glossario');

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

function getPostsFromLastWeek(dir, locale) {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekAgoStr = weekAgo.toISOString().split('T')[0];

  const prefix = locale === 'pt' ? '' : `${locale}-`;
  const files = readdirSync(dir).filter(f => {
    if (!f.endsWith('.md')) return false;
    if (locale === 'pt') return !f.startsWith('en-') && !f.startsWith('es-');
    return f.startsWith(prefix);
  });

  const posts = [];
  for (const file of files) {
    const content = readFileSync(join(dir, file), 'utf-8');
    const fm = parseFrontmatter(content);
    if (fm.publishedAt && fm.publishedAt >= weekAgoStr) {
      posts.push({
        title: fm.title || '',
        description: fm.description || '',
        category: fm.category || '',
        publishedAt: fm.publishedAt,
        image: fm.image || '',
        slug: file.replace('.md', '').replace(/^(en|es)-/, '')
      });
    }
  }

  return posts.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

function buildDigestHTML(posts, glossaryPosts, lang, email) {
  const texts = {
    pt: {
      subject: 'Resumo Semanal FinMoovi',
      title: 'Resumo da Semana',
      subtitle: 'Confira o que publicamos esta semana no blog FinMoovi:',
      tipsTitle: 'Dicas da Semana',
      quotesTitle: 'Cotações',
      glossaryTitle: 'Glossário',
      readMore: 'Ler mais',
      noContent: 'Nenhum conteúdo novo esta semana. Nos vemos na próxima!',
      unsub: 'Não quer mais receber?',
      unsubLink: 'Cancelar inscrição'
    },
    en: {
      subject: 'FinMoovi Weekly Digest',
      title: 'Weekly Digest',
      subtitle: "Here's what we published this week on the FinMoovi blog:",
      tipsTitle: 'Tips of the Week',
      quotesTitle: 'Market Quotes',
      glossaryTitle: 'Glossary',
      readMore: 'Read more',
      noContent: 'No new content this week. See you next time!',
      unsub: "Don't want to receive anymore?",
      unsubLink: 'Unsubscribe'
    },
    es: {
      subject: 'Resumen Semanal FinMoovi',
      title: 'Resumen de la Semana',
      subtitle: 'Mira lo que publicamos esta semana en el blog FinMoovi:',
      tipsTitle: 'Consejos de la Semana',
      quotesTitle: 'Cotizaciones',
      glossaryTitle: 'Glosario',
      readMore: 'Leer más',
      noContent: 'Sin contenido nuevo esta semana. ¡Nos vemos la próxima!',
      unsub: '¿No quieres recibir más?',
      unsubLink: 'Cancelar suscripción'
    }
  };
  const t = texts[lang] || texts.pt;

  const basePath = lang === 'pt' ? '' : `/${lang}`;
  const tips = posts.filter(p => p.category === 'dicas');
  const quotes = posts.filter(p => p.category === 'cotacoes');

  const allContent = [...tips, ...quotes, ...glossaryPosts];
  if (allContent.length === 0) return null;

  const renderSection = (title, items, pathPrefix) => {
    if (items.length === 0) return '';
    const rows = items.map(p => `
      <tr><td style="padding:12px 0;border-bottom:1px solid #30363d;">
        <a href="https://blog.finmoovi.com${basePath}/${pathPrefix}/${p.slug}" style="color:#58a6ff;font-size:15px;font-weight:600;text-decoration:none;">${p.title}</a>
        <p style="color:#8b949e;font-size:13px;margin:4px 0 0;">${p.description}</p>
      </td></tr>
    `).join('');
    return `
      <h2 style="color:#f0f6fc;font-size:18px;margin:24px 0 12px;border-left:3px solid #3fb950;padding-left:12px;">${title}</h2>
      <table style="width:100%;">${rows}</table>
    `;
  };

  return {
    subject: t.subject,
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:#161b22;border:1px solid #30363d;border-radius:12px;padding:32px;">
      <h1 style="color:#f0f6fc;font-size:22px;text-align:center;margin-bottom:8px;">${t.title}</h1>
      <p style="color:#8b949e;font-size:14px;text-align:center;margin-bottom:24px;">${t.subtitle}</p>
      ${renderSection(t.tipsTitle, tips, 'post')}
      ${renderSection(t.quotesTitle, quotes, 'post')}
      ${renderSection(t.glossaryTitle, glossaryPosts, 'glossario')}
      <div style="text-align:center;margin-top:32px;">
        <a href="https://blog.finmoovi.com${basePath}" style="display:inline-block;padding:12px 32px;background:linear-gradient(135deg,#3fb950,#58a6ff);color:#fff;font-weight:600;font-size:14px;text-decoration:none;border-radius:8px;">Ver tudo no blog</a>
      </div>
      <p style="color:#6e7681;font-size:11px;text-align:center;margin-top:24px;">
        ${t.unsub} <a href="https://blog.finmoovi.com/api/unsubscribe?email=${encodeURIComponent(email)}" style="color:#58a6ff;">${t.unsubLink}</a>
      </p>
    </div>
  </div>
</body>
</html>`
  };
}

async function getSubscribers() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/newsletter_subscribers?active=eq.true&select=email,lang`,
    {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    }
  );
  return res.json();
}

async function sendEmail(to, subject, html) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'FinMoovi Blog <blog@email.finmoovi.com>',
      to: [to],
      subject,
      html
    })
  });
  return res.ok;
}

async function main() {
  console.log('📬 Gerando digest semanal da newsletter...');

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !RESEND_API_KEY) {
    console.error('❌ Variáveis de ambiente faltando (SUPABASE_URL, SUPABASE_ANON_KEY, RESEND_API_KEY)');
    process.exit(1);
  }

  const subscribers = await getSubscribers();
  console.log(`👥 ${subscribers.length} subscriber(s) ativo(s)`);

  if (subscribers.length === 0) {
    console.log('Nenhum subscriber ativo. Finalizando.');
    return;
  }

  const locales = ['pt', 'en', 'es'];
  const postsByLocale = {};
  const glossaryByLocale = {};

  for (const locale of locales) {
    postsByLocale[locale] = getPostsFromLastWeek(POSTS_DIR, locale);
    glossaryByLocale[locale] = getPostsFromLastWeek(GLOSSARIO_DIR, locale);
    console.log(`📄 ${locale}: ${postsByLocale[locale].length} posts + ${glossaryByLocale[locale].length} glossário`);
  }

  let sent = 0;
  let skipped = 0;

  for (const sub of subscribers) {
    const lang = sub.lang || 'pt';
    const digest = buildDigestHTML(postsByLocale[lang] || [], glossaryByLocale[lang] || [], lang, sub.email);

    if (!digest) {
      skipped++;
      continue;
    }

    const ok = await sendEmail(sub.email, digest.subject, digest.html);
    if (ok) {
      sent++;
      console.log(`✅ Enviado para ${sub.email} (${lang})`);
    } else {
      console.log(`❌ Falha ao enviar para ${sub.email}`);
    }

    // Rate limit: 2 emails/segundo (Resend free tier)
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n📊 Resultado: ${sent} enviados, ${skipped} pulados (sem conteúdo)`);
}

main().catch(err => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});
