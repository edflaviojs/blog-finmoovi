import siteConfig from '../_config.json';

export async function onRequestPost(context) {
  const { request, env } = context;

  const allowedOrigins = siteConfig.allowedOrigins;
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
    const { variant, title, page, ts } = body;

    if (!variant || !page) {
      return new Response(JSON.stringify({ ok: false }), { status: 400, headers: corsHeaders });
    }

    const supabaseUrl = env.SUPABASE_URL;
    const supabaseKey = env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      // Silently accept if Supabase not configured
      return new Response(JSON.stringify({ ok: true, stored: false }), { status: 200, headers: corsHeaders });
    }

    // Store click event in Supabase
    const res = await fetch(`${supabaseUrl}/rest/v1/cta_clicks`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        variant: variant,
        title: (title || '').substring(0, 200),
        page: page.substring(0, 300),
        clicked_at: new Date(ts || Date.now()).toISOString(),
      })
    });

    return new Response(JSON.stringify({ ok: true, stored: res.ok }), {
      status: 200,
      headers: corsHeaders
    });

  } catch (e) {
    // Never fail on tracking — always return 200
    return new Response(JSON.stringify({ ok: true, error: 'parse' }), {
      status: 200,
      headers: corsHeaders
    });
  }
}

export async function onRequestOptions(context) {
  const allowedOrigins = siteConfig.allowedOrigins;
  const origin = context.request.headers.get('Origin') || '';
  const corsOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}
