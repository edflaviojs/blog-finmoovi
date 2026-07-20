/**
 * YouTube OAuth Helper — autorização ÚNICA do app "FinMoovi YouTube Pipeline"
 * (projeto Google Cloud: finmoovi-youtube · cliente OAuth tipo "App para computador")
 *
 * Fluxo (rodar LOCALMENTE, uma vez — mesmo padrão do pinterest-auth.js):
 *   1. Rodar:
 *        set YOUTUBE_CLIENT_SECRET=<chave secreta do cliente OAuth>
 *        node scripts/youtube-auth.js
 *      (client id padrão hardcoded; sobrescreva com YOUTUBE_CLIENT_ID se preciso)
 *   2. O script abre um servidor local na porta 8090, imprime a URL de
 *      autorização — abra no navegador LOGADO em finmoovi@gmail.com e, na tela
 *      de escolha de conta, selecione o CANAL DE MARCA "FinMoovi" (não a conta
 *      pessoal). Vai aparecer "app não verificado" → Avançado → continuar.
 *   3. Ele troca o code por access_token + refresh_token, chama
 *      channels.list(mine=true) para CONFERIR qual canal foi autorizado
 *      (guardrail: se não for o canal FinMoovi, rode de novo) e imprime os
 *      comandos `gh secret set` prontos.
 *
 * Escopos (decisão IMPLEMENTACAO20, itens 4-6 do checklist):
 *   - youtube.upload        → upload de vídeos + thumbnails
 *   - youtube.force-ssl     → captions.insert (SRT ×3 idiomas), comentários do
 *                             digest, playlists, metadados (engloba o readonly)
 *   - yt-analytics.readonly → relatório semanal de métricas (seção 9 do PRD)
 *
 * O app OAuth está publicado "Em produção" → o refresh_token do Google NÃO
 * expira por tempo (só se revogado ou ~6 meses sem uso). Nada é gravado em
 * disco — os tokens só aparecem no terminal.
 */

import http from 'node:http';

const CLIENT_ID = process.env.YOUTUBE_CLIENT_ID
  || '859035125390-72218931kn0esrhrqrp77rs1uai0p0gh.apps.googleusercontent.com';
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET;
const PORT = 8090; // 8085 é do helper do Pinterest
const DEFAULT_REDIRECT = `http://localhost:${PORT}/callback`;
const SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.force-ssl',
  'https://www.googleapis.com/auth/yt-analytics.readonly',
].join(' ');

const args = Object.fromEntries(
  process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, ...v] = a.slice(2).split('=');
    return [k, v.join('=') || true];
  }),
);

if (!CLIENT_ID) {
  console.error('ERRO: defina YOUTUBE_CLIENT_ID (ID do cliente OAuth, termina em .apps.googleusercontent.com).');
  process.exit(1);
}
if (!CLIENT_SECRET) {
  console.error('ERRO: defina YOUTUBE_CLIENT_SECRET (chave secreta do cliente OAuth no Google Cloud).');
  process.exit(1);
}

async function exchangeCode(code, redirectUri) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Troca do code falhou (${res.status}): ${text}`);
  return JSON.parse(text);
}

// Guardrail: confirma QUAL canal foi autorizado (tem que ser o de marca FinMoovi)
async function whoAmI(accessToken) {
  const res = await fetch(
    'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true',
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  const text = await res.text();
  if (!res.ok) throw new Error(`channels.list falhou (${res.status}): ${text}`);
  return JSON.parse(text).items ?? [];
}

function printResult(tokens, channels) {
  console.log('\n══════════════════════════════════════════════════════');
  console.log('✅ AUTORIZADO! Tokens recebidos:\n');
  console.log(`access_token (expira em ~${Math.round(tokens.expires_in / 60)} min — descartável):\n${tokens.access_token}\n`);
  if (!tokens.refresh_token) {
    console.error('⚠️  SEM refresh_token na resposta! Revogue o acesso em myaccount.google.com/permissions e rode de novo (o prompt=consent deveria garantir).');
  } else {
    console.log(`refresh_token (NÃO expira — guarde no secret):\n${tokens.refresh_token}\n`);
  }
  console.log('── Canal autorizado (CONFIRA: precisa ser o canal de marca FinMoovi) ──');
  if (channels.length === 0) {
    console.log('(nenhum canal — você autorizou com a conta errada? Rode de novo e escolha o canal FinMoovi no seletor)');
  }
  for (const c of channels) {
    console.log(`  ${c.id}  →  "${c.snippet.title}" (${c.statistics?.subscriberCount ?? '?'} inscritos)`);
  }
  console.log('\n── Configure os secrets do repositório (cole no terminal) ──');
  console.log(`gh secret set YOUTUBE_CLIENT_ID --repo edflaviojs/blog-finmoovi --body "${CLIENT_ID}"`);
  console.log('gh secret set YOUTUBE_CLIENT_SECRET --repo edflaviojs/blog-finmoovi --body "<CHAVE_SECRETA_DO_CLIENTE>"');
  if (tokens.refresh_token) {
    console.log(`gh secret set YOUTUBE_REFRESH_TOKEN --repo edflaviojs/blog-finmoovi --body "${tokens.refresh_token}"`);
  }
  console.log('══════════════════════════════════════════════════════\n');
}

async function finish(code, redirectUri) {
  const tokens = await exchangeCode(code, redirectUri);
  let channels = [];
  try {
    channels = await whoAmI(tokens.access_token);
  } catch (err) {
    console.error(`Aviso: não consegui conferir o canal (${err.message})`);
  }
  printResult(tokens, channels);
}

async function main() {
  // Modo manual: --code=XXX [--redirect=URI]
  if (args.code && args.code !== true) {
    await finish(String(args.code), String(args.redirect || DEFAULT_REDIRECT));
    return;
  }

  // Modo servidor local
  const authUrl =
    'https://accounts.google.com/o/oauth2/v2/auth' +
    `?client_id=${encodeURIComponent(CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(DEFAULT_REDIRECT)}` +
    '&response_type=code' +
    `&scope=${encodeURIComponent(SCOPES)}` +
    '&access_type=offline' + // pede refresh_token
    '&prompt=consent'; // força emitir refresh_token mesmo em re-autorização

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    if (url.pathname !== '/callback') {
      res.writeHead(404).end();
      return;
    }
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');
    if (error || !code) {
      res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h2>Autorização negada ou sem code — veja o terminal.</h2>');
      console.error(`\nERRO no callback: ${error || 'sem code'}`);
      server.close();
      process.exit(1);
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h2>✅ Autorizado! Pode fechar esta aba — os tokens estão no terminal.</h2>');
    server.close();
    try {
      await finish(code, DEFAULT_REDIRECT);
      process.exit(0);
    } catch (err) {
      console.error(`\nERRO: ${err.message}`);
      process.exit(1);
    }
  });

  server.listen(PORT, () => {
    console.log('=== YouTube OAuth — autorização única ===\n');
    console.log(`Aguardando callback em ${DEFAULT_REDIRECT} ...`);
    console.log('\n1. Abra esta URL no navegador (logado em finmoovi@gmail.com):\n');
    console.log(`   ${authUrl}\n`);
    console.log('2. No seletor de conta, escolha o CANAL DE MARCA "FinMoovi".');
    console.log('3. Em "app não verificado": Avançado → acessar FinMoovi YouTube Pipeline.');
    console.log('4. Aprove os 3 escopos — o resto é automático.\n');
  });
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
