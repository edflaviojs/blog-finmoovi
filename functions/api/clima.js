import siteConfig from '../_config.json';

// Clima local do visitante: a Cloudflare já entrega cidade + lat/lon de cada
// requisição no edge (request.cf), sem pedir permissão de GPS. Buscamos a
// temperatura atual na Open-Meteo (gratuita, sem chave) e devolvemos
// { city, temp } para o ticker exibir "Lisboa 17°C".

function corsHeaders(request) {
  const allowed = siteConfig.allowedOrigins;
  const origin = request.headers.get('Origin') || '';
  const corsOrigin = allowed.includes(origin) ? origin : allowed[0];
  return {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
    // private: a resposta é por-visitante (localização) — o edge NÃO pode
    // compartilhar o cache entre usuários; só o navegador guarda por 10 min
    'Cache-Control': 'private, max-age=600',
  };
}

export async function onRequestGet(context) {
  const headers = corsHeaders(context.request);
  const cf = context.request.cf || {};
  const lat = cf.latitude;
  const lon = cf.longitude;
  const city = cf.city || null;

  if (!lat || !lon) {
    return new Response(JSON.stringify({ city: null, temp: null, code: null }), { status: 200, headers });
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const d = await res.json();
    const temp = d && d.current ? Math.round(d.current.temperature_2m) : null;
    // weather_code WMO: 0-1 limpo, 2 parcial, 3 nublado, 45-48 névoa,
    // 51-67/80-82 chuva, 71-77/85-86 neve, 95+ tempestade (cliente traduz)
    const code = d && d.current && d.current.weather_code !== undefined ? d.current.weather_code : null;
    return new Response(JSON.stringify({ city, temp, code }), { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify({ city, temp: null, code: null }), { status: 200, headers });
  }
}

export async function onRequestOptions(context) {
  return new Response(null, { status: 204, headers: corsHeaders(context.request) });
}
