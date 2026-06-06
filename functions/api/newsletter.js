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

    // Store in Cloudflare KV (newsletter-leads)
    const kv = env.NEWSLETTER_KV;
    let kvStatus = 'no_binding';
    if (kv) {
      const existing = await kv.get(email);
      if (existing) {
        return new Response(JSON.stringify({ message: 'Inscrito com sucesso! Verifique seu email.' }), {
          status: 200,
          headers: corsHeaders
        });
      }

      await kv.put(email, JSON.stringify({
        email,
        subscribedAt: new Date().toISOString(),
        confirmed: false,
        lang: body.lang || 'pt'
      }));
      kvStatus = 'saved';
    }

    // Send welcome email via Resend (if API key configured)
    const resendKey = env.RESEND_API_KEY;
    let emailStatus = 'no_api_key';
    if (resendKey) {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'FinMoovi Blog <blog@email.finmoovi.com>',
          to: [email],
          subject: 'Bem-vindo à Newsletter FinMoovi!',
          html: getWelcomeEmailHTML(email)
        })
      });
      const resendData = await resendRes.json();
      emailStatus = resendRes.ok ? 'sent' : `error: ${JSON.stringify(resendData)}`;
    }

    return new Response(JSON.stringify({
      message: 'Inscrito com sucesso! Verifique seu email.',
      debug: { kvStatus, emailStatus }
    }), {
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

function getWelcomeEmailHTML(email) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:#161b22;border:1px solid #30363d;border-radius:12px;padding:40px;text-align:center;">
      <h1 style="color:#f0f6fc;font-size:24px;margin-bottom:16px;">Bem-vindo à Newsletter FinMoovi!</h1>
      <p style="color:#8b949e;font-size:16px;line-height:1.6;margin-bottom:24px;">
        Você agora receberá as melhores dicas de finanças pessoais toda semana.
      </p>
      <div style="background:#21262d;border-radius:8px;padding:20px;margin-bottom:24px;text-align:left;">
        <p style="color:#f0f6fc;font-size:14px;margin-bottom:8px;font-weight:600;">O que você vai receber:</p>
        <p style="color:#8b949e;font-size:14px;line-height:1.8;margin:0;">
          ✓ Dicas práticas de controle financeiro<br>
          ✓ Resumo semanal de cotações (USD, EUR, BTC)<br>
          ✓ Ferramentas e calculadoras exclusivas<br>
          ✓ Novos termos do glossário financeiro
        </p>
      </div>
      <a href="https://finmoovi.com" style="display:inline-block;padding:12px 32px;background:linear-gradient(135deg,#3fb950,#58a6ff);color:#fff;font-weight:600;font-size:14px;text-decoration:none;border-radius:8px;">
        Conhecer o App FinMoovi
      </a>
      <p style="color:#6e7681;font-size:12px;margin-top:24px;">
        Não quer mais receber? <a href="https://blog.finmoovi.com/api/unsubscribe?email=${encodeURIComponent(email)}" style="color:#58a6ff;">Cancelar inscrição</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}
