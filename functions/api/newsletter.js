export async function onRequestPost(context) {
  const { request, env } = context;

  const allowedOrigins = ['https://blog.finmoovi.com', 'https://blog-finmoovi.pages.dev', 'http://localhost:4321'];
  const origin = request.headers.get('Origin') || '';
  const corsOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  const corsHeaders = {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    const body = await request.json();
    const email = (body.email || '').trim().toLowerCase();

    if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return new Response(JSON.stringify({ error: 'Email inválido.' }), {
        status: 400,
        headers: corsHeaders
      });
    }

    const supabaseUrl = env.SUPABASE_URL;
    const supabaseKey = env.SUPABASE_ANON_KEY;
    const lang = body.lang || 'pt';

    if (supabaseUrl && supabaseKey) {
      // Check if already subscribed
      const checkRes = await fetch(
        `${supabaseUrl}/rest/v1/newsletter_subscribers?email=eq.${encodeURIComponent(email)}&select=id,active`,
        { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` } }
      );
      const existing = await checkRes.json();

      if (existing.length > 0) {
        if (!existing[0].active) {
          // Reactivate
          await fetch(
            `${supabaseUrl}/rest/v1/newsletter_subscribers?email=eq.${encodeURIComponent(email)}`,
            {
              method: 'PATCH',
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
              },
              body: JSON.stringify({ active: true, unsubscribed_at: null, lang })
            }
          );
        } else {
          return new Response(JSON.stringify({ message: 'Inscrito com sucesso! Verifique seu email.' }), {
            status: 200,
            headers: corsHeaders
          });
        }
      } else {
        // Insert new subscriber
        await fetch(
          `${supabaseUrl}/rest/v1/newsletter_subscribers`,
          {
            method: 'POST',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({ email, lang })
          }
        );
      }
    }

    // Send welcome email via Resend
    const resendKey = env.RESEND_API_KEY;
    if (resendKey) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'FinMoovi Blog <blog@email.finmoovi.com>',
          to: [email],
          subject: lang === 'en' ? 'Welcome to FinMoovi Newsletter!' :
                   lang === 'es' ? 'Bienvenido a la Newsletter FinMoovi!' :
                   'Bem-vindo à Newsletter FinMoovi!',
          html: getWelcomeEmailHTML(email, lang)
        })
      });
    }

    return new Response(JSON.stringify({ message: 'Inscrito com sucesso! Verifique seu email.' }), {
      status: 200,
      headers: corsHeaders
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Erro interno. Tente novamente.' }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

export async function onRequestOptions(context) {
  const { request } = context;
  const allowedOrigins = ['https://blog.finmoovi.com', 'https://blog-finmoovi.pages.dev', 'http://localhost:4321'];
  const origin = request.headers.get('Origin') || '';
  const corsOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

function getWelcomeEmailHTML(email, lang = 'pt') {
  const texts = {
    pt: {
      title: 'Bem-vindo à Newsletter FinMoovi!',
      subtitle: 'Você agora receberá as melhores dicas de finanças pessoais toda semana.',
      listTitle: 'O que você vai receber:',
      items: '✓ Dicas práticas de controle financeiro<br>✓ Resumo semanal de cotações (USD, EUR, BTC)<br>✓ Ferramentas e calculadoras exclusivas<br>✓ Novos termos do glossário financeiro',
      cta: 'Conhecer o App FinMoovi',
      unsub: 'Não quer mais receber?',
      unsubLink: 'Cancelar inscrição'
    },
    en: {
      title: 'Welcome to FinMoovi Newsletter!',
      subtitle: 'You will now receive the best personal finance tips every week.',
      listTitle: 'What you will receive:',
      items: '✓ Practical financial control tips<br>✓ Weekly exchange rate summary (USD, EUR, BTC)<br>✓ Exclusive tools and calculators<br>✓ New financial glossary terms',
      cta: 'Discover FinMoovi App',
      unsub: "Don't want to receive anymore?",
      unsubLink: 'Unsubscribe'
    },
    es: {
      title: '¡Bienvenido a la Newsletter FinMoovi!',
      subtitle: 'Ahora recibirás los mejores consejos de finanzas personales cada semana.',
      listTitle: 'Lo que recibirás:',
      items: '✓ Consejos prácticos de control financiero<br>✓ Resumen semanal de cotizaciones (USD, EUR, BTC)<br>✓ Herramientas y calculadoras exclusivas<br>✓ Nuevos términos del glosario financiero',
      cta: 'Conocer la App FinMoovi',
      unsub: '¿No quieres recibir más?',
      unsubLink: 'Cancelar suscripción'
    }
  };
  const t = texts[lang] || texts.pt;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:#161b22;border:1px solid #30363d;border-radius:12px;padding:40px;text-align:center;">
      <h1 style="color:#f0f6fc;font-size:24px;margin-bottom:16px;">${t.title}</h1>
      <p style="color:#8b949e;font-size:16px;line-height:1.6;margin-bottom:24px;">${t.subtitle}</p>
      <div style="background:#21262d;border-radius:8px;padding:20px;margin-bottom:24px;text-align:left;">
        <p style="color:#f0f6fc;font-size:14px;margin-bottom:8px;font-weight:600;">${t.listTitle}</p>
        <p style="color:#8b949e;font-size:14px;line-height:1.8;margin:0;">${t.items}</p>
      </div>
      <a href="https://finmoovi.com" style="display:inline-block;padding:12px 32px;background:linear-gradient(135deg,#3fb950,#58a6ff);color:#fff;font-weight:600;font-size:14px;text-decoration:none;border-radius:8px;">${t.cta}</a>
      <p style="color:#6e7681;font-size:12px;margin-top:24px;">
        ${t.unsub} <a href="https://blog.finmoovi.com/api/unsubscribe?email=${encodeURIComponent(email)}" style="color:#58a6ff;">${t.unsubLink}</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}
}
