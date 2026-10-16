import { config } from '../../../site.config.ts';
/**
 * Email de Boas-Vindas Segmentado
 * Envia sequência automática para novos subscribers, no idioma de cada um (pt/en/es):
 * - Dia 3: 3 posts para começar
 * - Dia 7: Como o ${config.app.name} ajuda (CTA forte)
 *
 * O e-mail do Dia 0 NÃO é daqui: sai na hora da inscrição, por functions/api/newsletter.js.
 *
 * Executa diariamente via GitHub Actions às 9h BRT
 * Verifica na tabela newsletter_subscribers quem precisa receber cada etapa
 *
 * 16/10/2026 — o robô estava MORTO desde sempre: pedia as colunas `status` e `created_at`,
 * que não existem (são `active` e `subscribed_at`). O banco respondia erro, o robô dizia
 * "tabela inacessível" e terminava VERDE. Agora erro de banco termina VERMELHO.
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
// Fase S (15/10/2026): a chave pública já não lê a tabela de assinantes — só a do servidor.
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
// Fase S (15/10/2026): o repositório é PÚBLICO — os registros das corridas também.
// Nunca escrever o e-mail inteiro neles.
const mascarar = (e) => String(e || '').replace(/^(.{0,2}).*(@.*)$/, '$1***$2');

const RESEND_API_KEY = process.env.RESEND_API_KEY;

// Logo oficial FinMoovi (PNG hospedado no blog) — padrão único de cabeçalho dos emails
const logoHeader = `
      <div style="text-align:center;margin:0 0 28px;">
        <a href="${config.siteUrl}" style="text-decoration:none;display:inline-block;">
          <img src="${config.siteUrl}/email/finmoovi-logo.png" width="40" height="40" alt="${config.brand.name}" style="display:inline-block;vertical-align:middle;border:1px solid #30363d;border-radius:10px;" />
          <span style="vertical-align:middle;padding-left:10px;font-size:22px;font-weight:700;letter-spacing:-0.5px;color:#00F0FF;background:linear-gradient(135deg,${config.brand.colors.ctaGradientStart},${config.brand.colors.ctaGradientEnd});-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">${config.brand.name}</span>
        </a>
      </div>`;

const gradient = `linear-gradient(135deg,${config.brand.colors.ctaGradientStart},${config.brand.colors.ctaGradientEnd})`;
const siteHost = config.siteUrl.replace('https://', '');

// Textos por idioma. Os links dos posts foram conferidos no ar a 16/10/2026 (todos 200).
const TEXTS = {
  pt: {
    home: `${config.siteUrl}/`,
    day3: {
      subject: '📊 3 posts para começar a organizar o seu dinheiro',
      title: 'Por onde começar? 🔥',
      intro: 'Separei 3 posts para você dar o primeiro passo:',
      posts: [
        ['/posts/como-criar-orcamento-pessoal/', 'Como criar um orçamento pessoal em 5 passos'],
        ['/posts/metodo-50-30-20-para-orcamento/', 'Método 50-30-20: guia completo'],
        ['/posts/como-criar-uma-reserva-de-emergencia/', 'Como montar uma reserva de emergência'],
      ],
      button: 'Ver todos os posts →',
    },
    day7: {
      subject: '🚀 Controle suas finanças em 5 segundos (literalmente)',
      title: 'Já tentou controlar gastos e desistiu? 🤔',
      p1: 'Eu sei como é. Planilhas são chatas. Apps complicados cansam. Mas e se você pudesse apenas <strong style="color:#fff;">FALAR</strong> seus gastos?',
      p2: `Com o <strong style="color:#fff;">${config.brand.name}</strong>, é exatamente assim:`,
      items: [
        ['🎙️', 'Voz:', '"Almoço 35 reais" → registrado'],
        ['📸', 'Foto:', 'Tire foto do cupom → lido automaticamente'],
        ['⌨️', 'Texto:', 'Digite "uber 23,50" → categorizado'],
        ['💱', 'Multi-moeda:', 'BRL, USD, EUR → consolidado'],
        ['📴', 'Offline:', 'Funciona sem internet'],
      ],
      p3: '7 dias grátis. Sem cartão de crédito. Cancele quando quiser.',
    },
    reason: `Você recebeu este e-mail porque se inscreveu em ${siteHost}.`,
    unsub: 'Cancelar inscrição',
  },
  en: {
    home: `${config.siteUrl}/en/`,
    day3: {
      subject: '📊 3 posts to start organizing your money',
      title: 'Where to start? 🔥',
      intro: 'Here are 3 posts to help you take the first step:',
      posts: [
        ['/en/posts/en-how-to-create-personal-budget/', 'How to create a personal budget in 5 steps'],
        ['/en/posts/en-the-50-30-20-method-for-budgeting/', 'The 50-30-20 method: complete guide'],
        ['/en/posts/en-creating-an-emergency-fund/', 'How to build an emergency fund'],
      ],
      button: 'See all posts →',
    },
    day7: {
      subject: '🚀 Track your finances in 5 seconds (literally)',
      title: 'Ever tried tracking your spending and gave up? 🤔',
      p1: 'I know how it is. Spreadsheets are boring. Complicated apps wear you out. But what if you could just <strong style="color:#fff;">SAY</strong> your expenses?',
      p2: `With <strong style="color:#fff;">${config.brand.name}</strong>, that is exactly how it works:`,
      items: [
        ['🎙️', 'Voice:', '"Lunch 35 dollars" → saved'],
        ['📸', 'Photo:', 'Snap the receipt → read automatically'],
        ['⌨️', 'Text:', 'Type "uber 23.50" → categorized'],
        ['💱', 'Multi-currency:', 'BRL, USD, EUR → consolidated'],
        ['📴', 'Offline:', 'Works without internet'],
      ],
      p3: '7 days free. No credit card. Cancel anytime.',
    },
    reason: `You received this e-mail because you subscribed at ${siteHost}.`,
    unsub: 'Unsubscribe',
  },
  es: {
    home: `${config.siteUrl}/es/`,
    day3: {
      subject: '📊 3 posts para empezar a organizar tu dinero',
      title: '¿Por dónde empezar? 🔥',
      intro: 'Te separé 3 posts para dar el primer paso:',
      posts: [
        ['/es/posts/es-como-crear-un-presupuesto-personal-en-5-pasos-simples/', 'Cómo crear un presupuesto personal en 5 pasos'],
        ['/es/posts/es-metodo-50-30-20-para-presupuesto/', 'Método 50-30-20: guía completa'],
        ['/es/posts/es-como-crear-una-reserva-de-emergencia/', 'Cómo crear una reserva de emergencia'],
      ],
      button: 'Ver todos los posts →',
    },
    day7: {
      subject: '🚀 Controla tus finanzas en 5 segundos (literalmente)',
      title: '¿Ya intentaste controlar tus gastos y te rendiste? 🤔',
      p1: 'Sé cómo es. Las hojas de cálculo aburren. Las apps complicadas cansan. ¿Y si pudieras simplemente <strong style="color:#fff;">DECIR</strong> tus gastos?',
      p2: `Con <strong style="color:#fff;">${config.brand.name}</strong>, es exactamente así:`,
      items: [
        ['🎙️', 'Voz:', '"Almuerzo 35 reales" → registrado'],
        ['📸', 'Foto:', 'Saca una foto del ticket → leído automáticamente'],
        ['⌨️', 'Texto:', 'Escribe "uber 23,50" → categorizado'],
        ['💱', 'Multi-moneda:', 'BRL, USD, EUR → consolidado'],
        ['📴', 'Offline:', 'Funciona sin internet'],
      ],
      p3: '7 días gratis. Sin tarjeta de crédito. Cancela cuando quieras.',
    },
    reason: `Recibiste este e-mail porque te suscribiste en ${siteHost}.`,
    unsub: 'Cancelar suscripción',
  },
};

// Rodapé com o link de cancelar — o mesmo formato do e-mail de boas-vindas (código secreto em &t=).
function footer(t, sub) {
  const link = `${config.siteUrl}/api/unsubscribe?email=${encodeURIComponent(sub.email)}&t=${sub.unsub_token}`;
  return `<p style="color:#484f58;font-size:12px;margin-top:24px;">${t.reason} <a href="${link}" style="color:#58a6ff;">${t.unsub}</a></p>`;
}

function day3Html(t, sub) {
  const d = t.day3;
  const posts = d.posts.map(([path, label], i) => `
      <div style="padding:12px;background:#161b22;border-radius:8px;margin-bottom:8px;">
        <a href="${config.siteUrl}${path}" style="color:#58a6ff;text-decoration:none;font-weight:600;">${i + 1}. ${label}</a>
      </div>`).join('');
  return `
<div style="font-family:'Inter',sans-serif;max-width:600px;margin:0 auto;color:#e6edf3;">
  <div style="background:#0d1117;padding:32px;border-radius:12px;border:1px solid #30363d;">
    ${logoHeader}
    <h1 style="color:#fff;font-size:22px;margin:0 0 16px;">${d.title}</h1>
    <p style="color:#8b949e;line-height:1.7;">${d.intro}</p>
    <div style="margin:20px 0;">${posts}
    </div>
    <a href="${t.home}" style="display:inline-block;padding:12px 24px;background:${gradient};color:#fff;text-decoration:none;border-radius:9999px;font-weight:600;">${d.button}</a>
    ${footer(t, sub)}
  </div>
</div>`;
}

function day7Html(t, sub, lang) {
  const d = t.day7;
  const items = d.items.map(([icon, label, text]) =>
    `<li>${icon} <strong style="color:#fff;">${label}</strong> ${text}</li>`).join('\n      ');
  return `
<div style="font-family:'Inter',sans-serif;max-width:600px;margin:0 auto;color:#e6edf3;">
  <div style="background:#0d1117;padding:32px;border-radius:12px;border:1px solid #30363d;">
    ${logoHeader}
    <h1 style="color:#fff;font-size:22px;margin:0 0 16px;">${d.title}</h1>
    <p style="color:#8b949e;line-height:1.7;">${d.p1}</p>
    <p style="color:#8b949e;line-height:1.7;">${d.p2}</p>
    <ul style="color:#8b949e;line-height:2;">
      ${items}
    </ul>
    <p style="color:#8b949e;line-height:1.7;">${d.p3}</p>
    <a href="${config.app.url}" style="display:inline-block;padding:14px 32px;background:${gradient};color:#fff;text-decoration:none;border-radius:9999px;font-weight:700;font-size:16px;margin:16px 0;">${config.app.ctaText[lang]} →</a>
    ${footer(t, sub)}
  </div>
</div>`;
}

const SEQUENCE = [
  { day: 3, subject: (t) => t.day3.subject, html: (t, sub) => day3Html(t, sub) },
  { day: 7, subject: (t) => t.day7.subject, html: (t, sub, lang) => day7Html(t, sub, lang) },
];

async function getSubscribers() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/newsletter_subscribers?select=id,email,lang,subscribed_at,welcome_step,unsub_token&active=eq.true&order=subscribed_at.desc`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    }
  });
  if (!res.ok) throw new Error(`Supabase error: ${res.status} ${await res.text()}`);
  return res.json();
}

async function updateWelcomeStep(subscriberId, step) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/newsletter_subscribers?id=eq.${subscriberId}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ welcome_step: step })
  });
  // Sem gravar o passo, o mesmo e-mail sairia de novo amanhã — por isso falha alto.
  if (!res.ok) throw new Error(`Supabase PATCH error: ${res.status}`);
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
      reply_to: config.email.replyTo,
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

  if (!SUPABASE_URL || !SUPABASE_KEY || !RESEND_API_KEY) {
    console.error('❌ Faltam variáveis: SUPABASE_URL, SUPABASE_SERVICE_KEY, RESEND_API_KEY');
    process.exit(1);
  }

  // Erro do banco termina VERMELHO: foi o "verde com erro" que escondeu o robô morto por meses.
  const subscribers = await getSubscribers();

  if (!subscribers || subscribers.length === 0) {
    console.log('📊 0 emails de boas-vindas enviados (nenhum subscriber ativo)');
    return;
  }

  const now = new Date();
  let sent = 0;
  let failed = 0;

  for (const sub of subscribers) {
    const daysSinceSignup = Math.floor((now - new Date(sub.subscribed_at)) / 86400000);
    const currentStep = sub.welcome_step ?? -1;
    const lang = TEXTS[sub.lang] ? sub.lang : 'pt';
    const t = TEXTS[lang];

    // Só o e-mail MAIS RECENTE que já venceu: quem entrou há 3 semanas recebe só o do Dia 7,
    // e não a sequência inteira em dias seguidos.
    const email = [...SEQUENCE].reverse().find(e => e.day > currentStep && daysSinceSignup >= e.day);
    if (!email) continue;

    try {
      const subject = email.subject(t);
      console.log(`📨 ${mascarar(sub.email)} [${lang}] — Dia ${email.day}: ${subject}`);
      await sendEmail(sub.email, subject, email.html(t, sub, lang));
      await updateWelcomeStep(sub.id, email.day);
      sent++;
      await new Promise(r => setTimeout(r, 1000)); // Rate limit
    } catch (error) {
      failed++;
      console.warn(`⚠️ Falha para ${mascarar(sub.email)}: ${error.message}`);
    }
  }

  console.log(`\n📊 ${sent} emails de boas-vindas enviados${failed ? `, ${failed} falharam` : ''}`);
  if (failed) process.exit(1);
}

main().catch((error) => {
  console.error(`❌ ${error.message}`);
  process.exit(1);
});
