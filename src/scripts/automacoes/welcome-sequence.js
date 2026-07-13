import { config } from '../../../site.config.ts';
/**
 * Email de Boas-Vindas Segmentado
 * Envia sequência automática para novos subscribers:
 * - Dia 0: Boas-vindas + link para guia
 * - Dia 3: Top 3 posts mais lidos
 * - Dia 7: Como o ${config.app.name} ajuda (CTA forte)
 *
 * Executa diariamente via GitHub Actions às 9h BRT
 * Verifica na tabela newsletter_subscribers quem precisa receber cada etapa
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

// Logo oficial FinMoovi (PNG hospedado no blog) — padrão único de cabeçalho dos emails
const logoHeader = `
      <div style="text-align:center;margin:0 0 28px;">
        <a href="${config.siteUrl}" style="text-decoration:none;display:inline-block;">
          <img src="${config.siteUrl}/email/finmoovi-logo.png" width="40" height="40" alt="${config.brand.name}" style="display:inline-block;vertical-align:middle;border:1px solid #30363d;border-radius:10px;" />
          <span style="vertical-align:middle;padding-left:10px;font-size:22px;font-weight:700;letter-spacing:-0.5px;color:#00F0FF;background:linear-gradient(135deg,${config.brand.colors.ctaGradientStart},${config.brand.colors.ctaGradientEnd});-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">${config.brand.name}</span>
        </a>
      </div>`;

const SEQUENCES = {
  pt: [
    {
      day: 0,
      subject: '🎁 Bem-vindo! Seu guia de 30 dias está aqui',
      html: `
<div style="font-family:'Inter',sans-serif;max-width:600px;margin:0 auto;color:#e6edf3;">
  <div style="background:linear-gradient(135deg,${config.brand.colors.ctaGradientStart},${config.brand.colors.ctaGradientEnd});padding:3px;border-radius:12px;">
    <div style="background:#0d1117;padding:32px;border-radius:10px;">
      ${logoHeader}
      <h1 style="color:#fff;font-size:24px;margin:0 0 16px;">Bem-vindo ao ${config.brand.name} ${config.brand.blogSuffix}! 🎉</h1>
      <p style="color:#8b949e;line-height:1.7;">Estamos felizes em ter você aqui. A partir de agora, você vai receber dicas práticas de finanças pessoais toda semana.</p>
      <p style="color:#8b949e;line-height:1.7;">Para começar, preparamos algo especial:</p>
      <a href="${config.siteUrl}/guia-30-dias" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,${config.brand.colors.ctaGradientStart},${config.brand.colors.ctaGradientEnd});color:#fff;text-decoration:none;border-radius:9999px;font-weight:600;margin:16px 0;">📖 Acessar Guia de 30 Dias</a>
      <p style="color:#8b949e;font-size:14px;margin-top:24px;">Nos próximos dias, vou te enviar mais conteúdos exclusivos. Fique de olho!</p>
      <p style="color:#8b949e;font-size:14px;">— Equipe ${config.brand.name}</p>
    </div>
  </div>
</div>`
    },
    {
      day: 3,
      subject: '📊 Os 3 posts mais lidos da semana',
      html: `
<div style="font-family:'Inter',sans-serif;max-width:600px;margin:0 auto;color:#e6edf3;">
  <div style="background:#0d1117;padding:32px;border-radius:12px;border:1px solid #30363d;">
    ${logoHeader}
    <h1 style="color:#fff;font-size:22px;margin:0 0 16px;">Os posts que todo mundo está lendo 🔥</h1>
    <p style="color:#8b949e;line-height:1.7;">Separei os 3 posts mais acessados para você não perder nada:</p>
    <div style="margin:20px 0;">
      <div style="padding:12px;background:#161b22;border-radius:8px;margin-bottom:8px;">
        <a href="${config.siteUrl}/posts/como-criar-orcamento-pessoal" style="color:#58a6ff;text-decoration:none;font-weight:600;">1. Como criar um orçamento pessoal em 5 passos</a>
      </div>
      <div style="padding:12px;background:#161b22;border-radius:8px;margin-bottom:8px;">
        <a href="${config.siteUrl}/posts/regra-50-30-20-guia-completo" style="color:#58a6ff;text-decoration:none;font-weight:600;">2. Regra 50-30-20: guia completo</a>
      </div>
      <div style="padding:12px;background:#161b22;border-radius:8px;margin-bottom:8px;">
        <a href="${config.siteUrl}/posts/como-montar-reserva-emergencia" style="color:#58a6ff;text-decoration:none;font-weight:600;">3. Como montar uma reserva de emergência</a>
      </div>
    </div>
    <a href="${config.siteUrl}" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,${config.brand.colors.ctaGradientStart},${config.brand.colors.ctaGradientEnd});color:#fff;text-decoration:none;border-radius:9999px;font-weight:600;">Ver todos os posts →</a>
  </div>
</div>`
    },
    {
      day: 7,
      subject: '🚀 Controle suas finanças em 5 segundos (literalmente)',
      html: `
<div style="font-family:'Inter',sans-serif;max-width:600px;margin:0 auto;color:#e6edf3;">
  <div style="background:#0d1117;padding:32px;border-radius:12px;border:1px solid #30363d;">
    ${logoHeader}
    <h1 style="color:#fff;font-size:22px;margin:0 0 16px;">Já tentou controlar gastos e desistiu? 🤔</h1>
    <p style="color:#8b949e;line-height:1.7;">Eu sei como é. Planilhas são chatas. Apps complicados cansam. Mas e se você pudesse apenas <strong style="color:#fff;">FALAR</strong> seus gastos?</p>
    <p style="color:#8b949e;line-height:1.7;">Com o <strong style="color:#fff;">${config.brand.name}</strong>, é exatamente assim:</p>
    <ul style="color:#8b949e;line-height:2;">
      <li>🎙️ <strong style="color:#fff;">Voz:</strong> "Almoço 35 reais" → registrado</li>
      <li>📸 <strong style="color:#fff;">Foto:</strong> Tire foto do cupom → lido automaticamente</li>
      <li>⌨️ <strong style="color:#fff;">Texto:</strong> Digite "uber 23,50" → categorizado</li>
      <li>💱 <strong style="color:#fff;">Multi-moeda:</strong> BRL, USD, EUR → consolidado</li>
      <li>📴 <strong style="color:#fff;">Offline:</strong> Funciona sem internet</li>
    </ul>
    <p style="color:#8b949e;line-height:1.7;">7 dias grátis. Sem cartão de crédito. Cancele quando quiser.</p>
    <a href="${config.app.url}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,${config.brand.colors.ctaGradientStart},${config.brand.colors.ctaGradientEnd});color:#fff;text-decoration:none;border-radius:9999px;font-weight:700;font-size:16px;margin:16px 0;">${config.app.ctaText.pt} →</a>
    <p style="color:#484f58;font-size:12px;margin-top:24px;">Você recebeu este email porque se inscreveu no ${config.siteUrl.replace('https://','')}</p>
  </div>
</div>`
    }
  ]
};

async function getSubscribers() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/newsletter_subscribers?select=id,email,created_at,welcome_step&status=eq.active&order=created_at.desc`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    }
  });
  if (!res.ok) throw new Error(`Supabase error: ${res.status}`);
  return res.json();
}

async function updateWelcomeStep(subscriberId, step) {
  await fetch(`${SUPABASE_URL}/rest/v1/newsletter_subscribers?id=eq.${subscriberId}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ welcome_step: step })
  });
}

async function sendEmail(to, subject, html) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: config.email.from,
      to: [to],
      subject,
      html,
    })
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error: ${err}`);
  }
  return res.json();
}

async function main() {
  console.log('📧 Sequência de boas-vindas...\n');

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !RESEND_API_KEY) {
    console.error('❌ Faltam variáveis: SUPABASE_URL, SUPABASE_ANON_KEY, RESEND_API_KEY');
    process.exit(1);
  }

  let subscribers;
  try {
    subscribers = await getSubscribers();
  } catch (error) {
    console.warn(`⚠️ Não foi possível buscar subscribers: ${error.message}`);
    console.log('📊 0 emails de boas-vindas enviados (tabela inacessível ou vazia)');
    process.exit(0);
  }

  if (!subscribers || subscribers.length === 0) {
    console.log('📊 0 emails de boas-vindas enviados (nenhum subscriber ativo)');
    process.exit(0);
  }

  const now = new Date();
  let sent = 0;

  for (const sub of subscribers) {
    const createdAt = new Date(sub.created_at);
    const daysSinceSignup = Math.floor((now - createdAt) / 86400000);
    const currentStep = sub.welcome_step ?? -1;

    // Find next email to send
    const sequence = SEQUENCES.pt; // TODO: detect lang from subscriber
    for (const email of sequence) {
      if (email.day > currentStep && daysSinceSignup >= email.day) {
        try {
          console.log(`📨 ${sub.email} — Dia ${email.day}: ${email.subject}`);
          await sendEmail(sub.email, email.subject, email.html);
          await updateWelcomeStep(sub.id, email.day);
          sent++;
          await new Promise(r => setTimeout(r, 1000)); // Rate limit
        } catch (error) {
          console.warn(`⚠️ Falha para ${sub.email}: ${error.message}`);
        }
        break; // Only one email per subscriber per run
      }
    }
  }

  console.log(`\n📊 ${sent} emails de boas-vindas enviados`);
}

main();
