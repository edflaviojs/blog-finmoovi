import siteConfig from '../_config.json';

// Proxy server-side genérico do endpoint "last" da AwesomeAPI (sem CORS).
// Usado pelo conversor de moedas. O param `pairs` é validado/whitelistado por
// formato (evita open proxy). Devolve o JSON cru da AwesomeAPI + CORS + cache.

const PAIR_RE = /^[A-Z]{3}-[A-Z]{3}(,[A-Z]{3}-[A-Z]{3})*$/;
const DEFAULT_PAIRS = 'USD-BRL,EUR-BRL,GBP-BRL,ARS-BRL,BTC-BRL';

// AwesomeAPI rejeita requisições sem User-Agent de navegador (bloqueia o
// tráfego vindo do edge da Cloudflare — mesmo caso do /api/cotacoes)
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  'Accept': 'application/json',
};

async function fetchJson(url, timeoutMs = 5000) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: BROWSER_HEADERS,
    cf: { cacheTtl: 120, cacheEverything: true },
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

// Fallback quando a AwesomeAPI falha: open.er-api.com (moedas, base USD) +
// Coinbase (BTC), TRADUZIDOS para o formato da AwesomeAPI ({ USDBRL: { bid } })
// — o cliente do conversor não precisa saber de onde veio.
async function buildFallback(pairs) {
  const er = await fetchJson('https://open.er-api.com/v6/latest/USD');
  const rates = er && er.rates;
  if (!rates) throw new Error('er-api sem rates');
  rates.USD = 1;

  let btcUsd = null;
  if (pairs.includes('BTC-')) {
    try {
      const cb = await fetchJson('https://api.coinbase.com/v2/prices/BTC-USD/spot');
      if (cb && cb.data && cb.data.amount) btcUsd = parseFloat(cb.data.amount);
    } catch (e) { /* par BTC fica de fora → conversor mostra '---' */ }
  }

  const out = {};
  for (const pair of pairs.split(',')) {
    const [from, to] = pair.split('-');
    let bid = null;
    if (from === 'BTC') {
      if (btcUsd && rates[to]) bid = btcUsd * rates[to];
    } else if (rates[from] && rates[to]) {
      // rates são "quanto de X por 1 USD" → FROM-TO = rates[TO] / rates[FROM]
      bid = rates[to] / rates[from];
    }
    if (bid) out[from + to] = { bid: String(bid), pctChange: '0' };
  }
  if (Object.keys(out).length === 0) throw new Error('fallback vazio');
  return out;
}

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

  // 1ª opção: AwesomeAPI (tem % de variação); valida que devolveu ao menos
  // um dos pares pedidos (ela pode responder 200 com corpo de erro)
  try {
    const data = await fetchJson('https://economia.awesomeapi.com.br/last/' + pairs);
    const hasAny = pairs.split(',').some(p => data && data[p.replace('-', '')]);
    if (!hasAny) throw new Error('resposta sem pares');
    return new Response(JSON.stringify(data), { status: 200, headers });
  } catch (e) { /* cai no fallback abaixo */ }

  try {
    const data = await buildFallback(pairs);
    return new Response(JSON.stringify(data), { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: true }), { status: 200, headers });
  }
}

export async function onRequestOptions(context) {
  return new Response(null, { status: 204, headers: corsHeaders(context.request) });
}
