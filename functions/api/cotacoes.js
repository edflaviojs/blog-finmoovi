import siteConfig from '../_config.json';

// Proxy server-side das cotações: busca as APIs no edge (sem restrição de CORS),
// combina num único JSON e devolve com CORS + cache. O cliente faz 1 request
// same-origin (/api/cotacoes) em vez de 3-4 cross-origin — elimina erros de
// console CORS/timeout e encurta a cadeia de rede.

const UPSTREAM = {
  awesome: 'https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL,BTC-USD',
  // Token real via env BRAPI_TOKEN (painel Cloudflare Pages); 'demo' é instável
  ibovBrapi: (token) => 'https://brapi.dev/api/quote/%5EBVSP?token=' + (token || 'demo'),
  ibovAwesome: 'https://economia.awesomeapi.com.br/last/IBOV',
  selic: 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json',
  ipca: 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.13522/dados/ultimos/1?formato=json',
  cdi: 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.4389/dados/ultimos/1?formato=json',
  // Fallbacks que aceitam requisições de data center (AwesomeAPI bloqueia tráfego
  // vindo do edge da Cloudflare — funciona no navegador, falha no Worker)
  erApi: 'https://open.er-api.com/v6/latest/USD',
  coinbaseBtc: 'https://api.coinbase.com/v2/prices/BTC-USD/spot',
};

// AwesomeAPI/brapi rejeitam requisições sem User-Agent de navegador
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  'Accept': 'application/json',
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
    // A resposta MUDA conforme o Origin de quem pergunta. Sem isto, uma regra de
    // cache futura poderia servir a um domínio o Allow-Origin do outro — e o
    // navegador barraria o pedido.
    'Vary': 'Origin',
  };
}

async function fetchJson(url, timeoutMs = 5000) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: BROWSER_HEADERS,
    cf: { cacheTtl: 120, cacheEverything: true }, // cacheia upstream no edge
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

async function buildData(env) {
  const out = { usdbrl: null, eurbrl: null, btcusd: null, ibov: null, selic: null, ipca: null, cdi: null };

  // AwesomeAPI — USD, EUR, BTC (com % de variação)
  try {
    const d = await fetchJson(UPSTREAM.awesome);
    if (d.USDBRL) out.usdbrl = { value: parseFloat(d.USDBRL.bid), pct: parseFloat(d.USDBRL.pctChange) };
    if (d.EURBRL) out.eurbrl = { value: parseFloat(d.EURBRL.bid), pct: parseFloat(d.EURBRL.pctChange) };
    if (d.BTCUSD) out.btcusd = { value: parseFloat(d.BTCUSD.bid), pct: parseFloat(d.BTCUSD.pctChange) };
  } catch (e) { /* cai nos fallbacks abaixo */ }

  // Fallback USD/EUR — open.er-api.com (sem % de variação; pct null = cliente não exibe)
  if (!out.usdbrl || !out.eurbrl) {
    try {
      const d = await fetchJson(UPSTREAM.erApi);
      if (d && d.rates && d.rates.BRL) {
        if (!out.usdbrl) out.usdbrl = { value: d.rates.BRL, pct: null };
        if (!out.eurbrl && d.rates.EUR) out.eurbrl = { value: d.rates.BRL / d.rates.EUR, pct: null };
      }
    } catch (e) { /* mantém null → cliente mostra "--" */ }
  }

  // Fallback BTC — Coinbase (sem % de variação)
  if (!out.btcusd) {
    try {
      const d = await fetchJson(UPSTREAM.coinbaseBtc);
      if (d && d.data && d.data.amount) out.btcusd = { value: parseFloat(d.data.amount), pct: null };
    } catch (e) { /* mantém null → cliente mostra "--" */ }
  }

  // IBOV — brapi.dev (token demo é instável; timeout curto), fallback AwesomeAPI
  try {
    const d = await fetchJson(UPSTREAM.ibovBrapi(env && env.BRAPI_TOKEN), 2500);
    if (d.results && d.results[0]) {
      out.ibov = { value: d.results[0].regularMarketPrice, pct: d.results[0].regularMarketChangePercent };
    }
  } catch (e) {
    try {
      const d2 = await fetchJson(UPSTREAM.ibovAwesome);
      if (d2.IBOV) out.ibov = { value: parseFloat(d2.IBOV.bid), pct: parseFloat(d2.IBOV.pctChange || 0) };
    } catch (e2) { /* mantém null */ }
  }

  // SELIC + IPCA 12m + CDI — Banco Central (API oficial), em paralelo
  const [selicR, ipcaR, cdiR] = await Promise.allSettled([
    fetchJson(UPSTREAM.selic),
    fetchJson(UPSTREAM.ipca),
    fetchJson(UPSTREAM.cdi),
  ]);
  if (selicR.status === 'fulfilled' && selicR.value && selicR.value[0]) out.selic = parseFloat(selicR.value[0].valor);
  if (ipcaR.status === 'fulfilled' && ipcaR.value && ipcaR.value[0]) out.ipca = parseFloat(ipcaR.value[0].valor);
  if (cdiR.status === 'fulfilled' && cdiR.value && cdiR.value[0]) out.cdi = parseFloat(cdiR.value[0].valor);

  return out;
}

// Segundos que a resposta pronta fica guardada no edge. Igual ao max-age já
// declarado no Cache-Control — o cliente repete a cada 5 min de qualquer forma.
const EDGE_TTL = 120;

/**
 * Chave de cache: a própria URL SEM query string.
 *
 * Tem de ser fixa. Se entrasse a query (?nocache=…, ?utm_…), cada visitante
 * criaria uma entrada nova e o cache nunca acertaria.
 *
 * O que fica guardado é só o CORPO em JSON — os cabeçalhos CORS são remontados
 * a cada pedido, porque o Access-Control-Allow-Origin depende de QUEM pergunta.
 * Guardar a resposta inteira devolveria a um domínio o cabeçalho do outro.
 */
function cacheKey(request) {
  const u = new URL(request.url);
  u.search = '';
  return new Request(u.toString(), { method: 'GET' });
}

export async function onRequestGet(context) {
  const headers = corsHeaders(context.request);

  // PORQUÊ: sem isto, o Cloudflare respondia `cf-cache-status: DYNAMIC` — ou
  // seja, NADA era guardado e cada visitante fazia o edge ir buscar as 6 APIs
  // externas outra vez (medido em 2,2 s). O `cf: { cacheTtl }` lá em cima só
  // guarda as respostas DAS APIS, não a nossa resposta já montada; entre elas
  // ficava a espera em série (AwesomeAPI → fallbacks → IBOV → BCB) que ninguém
  // reaproveitava. Agora o primeiro visitante de cada região paga, e os
  // seguintes recebem do edge nos 2 minutos seguintes.
  //
  // O cache do Cloudflare é POR REGIÃO, não global: cada data center tem a sua
  // primeira falha. É esperado, e continua a ser 1 chamada por região a cada
  // 2 min em vez de 1 por visitante.
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  const key = cache ? cacheKey(context.request) : null;

  if (cache) {
    try {
      const hit = await cache.match(key);
      if (hit) {
        return new Response(await hit.text(), {
          status: 200,
          headers: { ...headers, 'X-FM-Cache': 'hit' },
        });
      }
    } catch (e) { /* sem cache (dev local) → segue e busca ao vivo */ }
  }

  try {
    const data = await buildData(context.env);
    const body = JSON.stringify(data);

    // waitUntil: gravar não pode atrasar a resposta de quem já esperou pelas APIs.
    if (cache) {
      try {
        context.waitUntil(cache.put(key, new Response(body, {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=' + EDGE_TTL,
          },
        })));
      } catch (e) { /* falha ao gravar não pode derrubar a resposta */ }
    }

    return new Response(body, { status: 200, headers: { ...headers, 'X-FM-Cache': 'miss' } });
  } catch (e) {
    // Erro NÃO entra no cache: senão 2 minutos de todos os visitantes a ver "--"
    // por causa de uma falha momentânea de uma API externa.
    return new Response(JSON.stringify({ error: true }), { status: 200, headers });
  }
}

export async function onRequestOptions(context) {
  return new Response(null, { status: 204, headers: corsHeaders(context.request) });
}
