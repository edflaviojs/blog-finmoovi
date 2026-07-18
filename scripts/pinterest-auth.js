/**
 * Pinterest OAuth Helper — autorização ÚNICA do app "FinMoovi Blog Pin Automation"
 *
 * Fluxo (rodar LOCALMENTE, uma vez):
 *   1. No portal Pinterest Developers → app 1591124 → configurar o
 *      Redirect URI: http://localhost:8085/callback
 *   2. Rodar:
 *        set PINTEREST_CLIENT_SECRET=<segredo do app>
 *        node scripts/pinterest-auth.js
 *      (client id padrão: 1591124; sobrescreva com PINTEREST_CLIENT_ID se preciso)
 *   3. O script abre um servidor local, imprime a URL de autorização —
 *      abra no navegador, aprove, e o script captura o code sozinho.
 *   4. Ele troca o code por access_token + refresh_token, lista os boards
 *      da conta (para escolher o PINTEREST_BOARD_ID) e imprime os comandos
 *      `gh secret set` prontos.
 *
 * Alternativa sem servidor (se o portal recusar localhost): registre outro
 * redirect URI, aprove, copie o parâmetro ?code=... da URL de retorno e rode:
 *   node scripts/pinterest-auth.js --code=SEU_CODE --redirect=https://seu-redirect
 *
 * Nada é gravado em disco — os tokens só aparecem no terminal.
 */

import http from 'node:http';

const API = 'https://api.pinterest.com/v5';
const CLIENT_ID = process.env.PINTEREST_CLIENT_ID || '1591124';
const CLIENT_SECRET = process.env.PINTEREST_CLIENT_SECRET;
const PORT = 8085;
const DEFAULT_REDIRECT = `http://localhost:${PORT}/callback`;
const SCOPES = 'boards:read,pins:read,pins:write';

const args = Object.fromEntries(
  process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, ...v] = a.slice(2).split('=');
    return [k, v.join('=') || true];
  }),
);

if (!CLIENT_SECRET) {
  console.error('ERRO: defina PINTEREST_CLIENT_SECRET (App secret do portal, botão Gerenciar).');
  process.exit(1);
}

function basicAuth() {
  return Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
}

async function exchangeCode(code, redirectUri) {
  const res = await fetch(`${API}/oauth/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Troca do code falhou (${res.status}): ${text}`);
  return JSON.parse(text);
}

async function listBoards(accessToken) {
  const res = await fetch(`${API}/boards?page_size=25`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Listar boards falhou (${res.status}): ${text}`);
  return JSON.parse(text).items ?? [];
}

function printResult(tokens, boards) {
  const days = s => Math.round(s / 86400);
  console.log('\n══════════════════════════════════════════════════════');
  console.log('✅ AUTORIZADO! Tokens recebidos:\n');
  console.log(`access_token  (expira em ~${days(tokens.expires_in)} dias):\n${tokens.access_token}\n`);
  console.log(`refresh_token (expira em ~${days(tokens.refresh_token_expires_in ?? 31536000)} dias):\n${tokens.refresh_token}\n`);
  console.log('── Boards da conta (escolha o ID para PINTEREST_BOARD_ID) ──');
  if (boards.length === 0) {
    console.log('(nenhum board — crie um em pinterest.com e rode de novo, ou use o access token acima)');
  }
  for (const b of boards) {
    console.log(`  ${b.id}  →  ${b.name}${b.privacy && b.privacy !== 'PUBLIC' ? ` (${b.privacy})` : ''}`);
  }
  console.log('\n── Configure os secrets do repositório (cole no terminal) ──');
  console.log(`gh secret set PINTEREST_CLIENT_ID --repo edflaviojs/blog-finmoovi --body "${CLIENT_ID}"`);
  console.log('gh secret set PINTEREST_CLIENT_SECRET --repo edflaviojs/blog-finmoovi --body "<APP_SECRET>"');
  console.log(`gh secret set PINTEREST_REFRESH_TOKEN --repo edflaviojs/blog-finmoovi --body "${tokens.refresh_token}"`);
  console.log('gh secret set PINTEREST_BOARD_ID --repo edflaviojs/blog-finmoovi --body "<ID_DO_BOARD_ACIMA>"');
  console.log('══════════════════════════════════════════════════════\n');
}

async function finish(code, redirectUri) {
  const tokens = await exchangeCode(code, redirectUri);
  let boards = [];
  try {
    boards = await listBoards(tokens.access_token);
  } catch (err) {
    console.error(`Aviso: não consegui listar os boards (${err.message})`);
  }
  printResult(tokens, boards);
}

async function main() {
  // Modo manual: --code=XXX [--redirect=URI]
  if (args.code && args.code !== true) {
    await finish(String(args.code), String(args.redirect || DEFAULT_REDIRECT));
    return;
  }

  // Modo servidor local
  const authUrl =
    `https://www.pinterest.com/oauth/?client_id=${CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(DEFAULT_REDIRECT)}` +
    `&response_type=code&scope=${encodeURIComponent(SCOPES)}`;

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
    console.log('=== Pinterest OAuth — autorização única ===\n');
    console.log(`Aguardando callback em ${DEFAULT_REDIRECT} ...`);
    console.log('\n1. Confirme no portal do app que o Redirect URI acima está cadastrado.');
    console.log('2. Abra esta URL no navegador (logado na conta Pinterest da marca):\n');
    console.log(`   ${authUrl}\n`);
    console.log('3. Aprove o acesso — o resto é automático.\n');
  });
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
