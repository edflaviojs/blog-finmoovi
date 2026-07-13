import siteConfig from '../_config.json';

// Proxy server-side genérico do endpoint "last" da AwesomeAPI (sem CORS).
// Usado pelo conversor de moedas. O param `pairs` é validado/whitelistado por
// formato (evita open proxy). Devolve o JSON cru da AwesomeAPI + CORS + cache.

const PAIR_RE = /^[A-Z]{3}-[A-Z]{3}(,[A-Z]{3}-[A-Z]{3})*$/;
const DEFAULT_PAIRS = 'USD-BRL,EUR-BRL,GBP-BRL,ARS-BRL,BTC-BRL';

function corsHeaders(request) {
  const allowed = siteConfig.allowedOrigins;
  const origin = request.headers.get('Origin') || '';
  const corsOrigin = allowed.includes(origin) ? origin : allowed[0];
  return {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=120',
  };
}

export async function onRequestGet(context) {
  const { request } = context;
  const headers = corsHeaders(request);

  const url = new URL(request.url);
  let pairs = url.searchParams.get('pairs') || DEFAULT_PAIRS;
  if (pairs.length > 120 || !PAIR_RE.test(pairs)) pairs = DEFAULT_PAIRS;

  try {
    const res = await fetch('https://economia.awesomeapi.com.br/last/' + pairs, {
      signal: AbortSignal.timeout(5000),
      cf: { cacheTtl: 120, cacheEverything: true },
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    return new Response(JSON.stringify(data), { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: true }), { status: 200, headers });
  }
}

export async function onRequestOptions(context) {
  return new Response(null, { status: 204, headers: corsHeaders(context.request) });
}
