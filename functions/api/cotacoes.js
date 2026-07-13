import siteConfig from '../_config.json';

// Proxy server-side das cotações: busca as APIs no edge (sem restrição de CORS),
// combina num único JSON e devolve com CORS + cache. O cliente faz 1 request
// same-origin (/api/cotacoes) em vez de 3-4 cross-origin — elimina erros de
// console CORS/timeout e encurta a cadeia de rede.

const UPSTREAM = {
  awesome: 'https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL,BTC-USD',
  ibovBrapi: 'https://brapi.dev/api/quote/%5EBVSP?token=demo',
  ibovAwesome: 'https://economia.awesomeapi.com.br/last/IBOV',
  selic: 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json',
};

function corsHeaders(request) {
  const allowed = siteConfig.allowedOrigins;
  const origin = request.headers.get('Origin') || '';
  const corsOrigin = allowed.includes(origin) ? origin : allowed[0];
  return {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
    // Cache no edge/browser por 2 min (cotações no cliente atualizam a cada 5 min)
    'Cache-Control': 'public, max-age=120',
  };
}

async function fetchJson(url, timeoutMs = 5000) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    cf: { cacheTtl: 120, cacheEverything: true }, // cacheia upstream no edge
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

async function buildData() {
  const out = { usdbrl: null, eurbrl: null, btcusd: null, ibov: null, selic: null };

  // AwesomeAPI — USD, EUR, BTC
  try {
    const d = await fetchJson(UPSTREAM.awesome);
    if (d.USDBRL) out.usdbrl = { value: parseFloat(d.USDBRL.bid), pct: parseFloat(d.USDBRL.pctChange) };
    if (d.EURBRL) out.eurbrl = { value: parseFloat(d.EURBRL.bid), pct: parseFloat(d.EURBRL.pctChange) };
    if (d.BTCUSD) out.btcusd = { value: parseFloat(d.BTCUSD.bid), pct: parseFloat(d.BTCUSD.pctChange) };
  } catch (e) { /* mantém null → cliente usa fallback estático */ }

  // IBOV — brapi.dev (token demo é instável; timeout curto), fallback AwesomeAPI
  try {
    const d = await fetchJson(UPSTREAM.ibovBrapi, 2500);
    if (d.results && d.results[0]) {
      out.ibov = { value: d.results[0].regularMarketPrice, pct: d.results[0].regularMarketChangePercent };
    }
  } catch (e) {
    try {
      const d2 = await fetchJson(UPSTREAM.ibovAwesome);
      if (d2.IBOV) out.ibov = { value: parseFloat(d2.IBOV.bid), pct: parseFloat(d2.IBOV.pctChange || 0) };
    } catch (e2) { /* mantém null */ }
  }

  // SELIC — Banco Central (API oficial)
  try {
    const d = await fetchJson(UPSTREAM.selic);
    if (d && d[0]) out.selic = parseFloat(d[0].valor);
  } catch (e) { /* mantém null → cliente usa valor estático */ }

  return out;
}

export async function onRequestGet(context) {
  const headers = corsHeaders(context.request);
  try {
    const data = await buildData();
    return new Response(JSON.stringify(data), { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: true }), { status: 200, headers });
  }
}

export async function onRequestOptions(context) {
  return new Response(null, { status: 204, headers: corsHeaders(context.request) });
}
