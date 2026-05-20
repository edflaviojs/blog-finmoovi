export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const email = (url.searchParams.get('email') || '').trim().toLowerCase();

  if (!email) {
    return new Response('<html><body style="background:#0d1117;color:#f0f6fc;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;"><div style="text-align:center;"><h1>Email não encontrado</h1><p>Parâmetro de email inválido.</p></div></body></html>', {
      status: 400,
      headers: { 'Content-Type': 'text/html' }
    });
  }

  const kv = env.NEWSLETTER_KV;
  if (kv) {
    await kv.delete(email);
  }

  return new Response(`<html><body style="background:#0d1117;color:#f0f6fc;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;"><div style="text-align:center;"><h1 style="color:#3fb950;">Inscrição cancelada</h1><p style="color:#8b949e;">Você não receberá mais emails da Newsletter FinMoovi.</p><a href="https://blog.finmoovi.com" style="color:#58a6ff;margin-top:16px;display:inline-block;">Voltar ao blog</a></div></body></html>`, {
    status: 200,
    headers: { 'Content-Type': 'text/html' }
  });
}
