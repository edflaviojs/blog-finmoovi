import siteConfig from '../_config.json';
import { conferirOportunidade, inserirNoShort, inserirNoLongo } from './_oportunidade-fila.js';

/**
 * A OPORTUNIDADE DO DONO — a porta entre a página /status e a fila (IMPL20 §60).
 *
 * O dono escreve um tema na /status; isto põe-no **à cabeça da fila**, e o próximo vídeo
 * a ser feito passa a ser esse. **Não produz nada e não publica nada** — só arruma a
 * fila. Quem faz o vídeo continua a ser o robô de sempre, à hora de sempre.
 *
 * ═══ ⚠️ POR QUE ESCREVE O FICHEIRO EM VEZ DE MANDAR O ROBÔ CORRER ═══
 * A primeira versão disparava o robô do GitHub. Funcionava, mas obrigava o dono a ir dar
 * **uma permissão nova** à chave ("Actions: write") — e ele não conseguiu encontrar o
 * sítio, em três tentativas, com passo a passo. **Isso é resposta:** uma peça que só
 * funciona depois de o dono vencer um painel que ele não conhece é uma peça mal desenhada.
 *
 * Escrever o ficheiro usa **a permissão que a chave JÁ TEM** há meses (é o que o
 * formulário de keywords faz ao lado). Zero configuração. O que se perde: o tema entra na
 * fila **agora** na mesma — só não há uma corrida do GitHub a arrancar. E não fazia falta:
 * quem lê a fila é o robô, quando acordar.
 *
 * ═══ AS FECHADURAS ═══
 * Há **duas, e basta uma**:
 *   1. **Cloudflare Access** — se este caminho estiver protegido no painel, só o dono
 *      passa e a Cloudflare acrescenta o cabeçalho `Cf-Access-Jwt-Assertion`.
 *   2. **A senha** — a MESMA do formulário de keywords (`KEYWORDS_ACCESS_KEY`), porque
 *      duas senhas para a mesma página é uma senha que um dia fica desatualizada.
 *      ⚠️ Comparada em **tempo constante**: com `===` dá para medir o tempo de resposta e
 *      adivinhar letra a letra.
 *
 * ⚠️ **Sem NENHUMA das duas configuradas, RECUSA-SE A FUNCIONAR** — nunca fica aberto
 * "por enquanto". É a diferença entre uma porta trancada e uma porta encostada.
 */

const RAMO = 'main';
const FICHEIROS = {
  short: '.github/data/youtube-topics.json',
  longo: '.github/data/youtube-longos.json',
};

/** Compara duas senhas sem deixar o tempo de resposta denunciar quantas letras acertaram. */
function iguaisEmTempoConstante(a, b) {
  const x = String(a || '');
  const y = String(b || '');
  if (x.length !== y.length) return false;
  let diferenca = 0;
  for (let i = 0; i < x.length; i += 1) diferenca |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diferenca === 0;
}

// ⚠️ UTF-8 à mão: `btoa`/`atob` sozinhos estragam acentos, e os nossos temas têm-nos todos.
function paraBase64(texto) {
  const bytes = new TextEncoder().encode(texto);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
function deBase64(b64) {
  const bin = atob(String(b64 || '').replace(/\s+/g, ''));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder('utf-8').decode(bytes);
}

const cabecalhosGitHub = (chave) => ({
  Authorization: `Bearer ${chave}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'finmoovi-status-oportunidade',
  'Content-Type': 'application/json',
});

/**
 * Lê a fila, mete o tema à cabeça e volta a escrevê-la.
 *
 * ⚠️ **O `sha` PODE FICAR VELHO ENTRE A LEITURA E A ESCRITA** — os robôs escrevem nestes
 * mesmos ficheiros o dia inteiro. Quando isso acontece o GitHub responde 409, e a cura é
 * ler outra vez e repetir. Uma tentativa a mais chega: a probabilidade de apanhar duas
 * escritas seguidas no mesmo segundo é remota, e insistir sem fim é pior do que falhar.
 */
async function porNaFila(chave, repo, formato, dados) {
  const caminho = FICHEIROS[formato];
  const inserir = formato === 'short' ? inserirNoShort : inserirNoLongo;
  const vazio = formato === 'short' ? { topics: [] } : { videos: [] };

  for (let tentativa = 1; tentativa <= 2; tentativa += 1) {
    const leitura = await fetch(
      `https://api.github.com/repos/${repo}/contents/${caminho}?ref=${RAMO}`,
      { headers: cabecalhosGitHub(chave) },
    );
    if (!leitura.ok) return { ok: false, status: leitura.status, passo: 'ler' };

    const ficheiro = await leitura.json();
    let fila = vazio;
    try { fila = JSON.parse(deBase64(ficheiro.content)) || vazio; } catch { /* ficheiro estragado: começa vazio */ }

    const { dados: novaFila, entrada } = inserir(fila, dados);

    const escrita = await fetch(`https://api.github.com/repos/${repo}/contents/${caminho}`, {
      method: 'PUT',
      headers: cabecalhosGitHub(chave),
      body: JSON.stringify({
        message: `chore: oportunidade do dono — "${entrada.id || entrada.slug}" à cabeça da fila [skip ci]`,
        content: paraBase64(`${JSON.stringify(novaFila, null, 2)}\n`),
        sha: ficheiro.sha,
        branch: RAMO,
      }),
    });
    if (escrita.ok) return { ok: true, nome: entrada.id || entrada.slug };
    if (escrita.status !== 409 || tentativa === 2) {
      return { ok: false, status: escrita.status, passo: 'escrever' };
    }
    // 409 = alguém escreveu no meio. Lê outra vez e tenta uma última.
  }
  return { ok: false, status: 409, passo: 'escrever' };
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const permitidas = siteConfig.allowedOrigins;
  const origem = request.headers.get('Origin') || '';
  const cabecalhos = {
    'Access-Control-Allow-Origin': permitidas.includes(origem) ? origem : permitidas[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
  const responder = (estado, corpo) => new Response(JSON.stringify(corpo), { status: estado, headers: cabecalhos });

  try {
    const corpo = await request.json().catch(() => ({}));
    const tema = String(corpo.tema || '').trim();
    const titulo = String(corpo.titulo || '').trim();
    const formato = String(corpo.formato || '').trim();

    // ── as fechaduras ──
    const temAccess = Boolean(request.headers.get('Cf-Access-Jwt-Assertion'));
    const senhaEsperada = env.OPORTUNIDADE_TOKEN || env.KEYWORDS_ACCESS_KEY;
    const senhaCerta = senhaEsperada && iguaisEmTempoConstante(corpo.senha, senhaEsperada);
    if (!temAccess && !senhaCerta) {
      if (!senhaEsperada) {
        return responder(503, { ok: false, erro: 'Esta porta ainda não foi trancada — falta a senha na Cloudflare (KEYWORDS_ACCESS_KEY). Até lá não abre.' });
      }
      return responder(401, { ok: false, erro: 'Senha errada.' });
    }

    // ── o que o dono escreveu, conferido pela MESMA conta que o robô usa ──
    const queixas = conferirOportunidade({ formato, tema, titulo });
    if (queixas.length) return responder(400, { ok: false, erro: queixas[0] });

    const repo = env.GITHUB_REPO || 'edflaviojs/blog-finmoovi';
    const chave = env.GITHUB_TOKEN_OPORTUNIDADE || env.GITHUB_KEYWORDS_TOKEN;
    if (!chave) return responder(503, { ok: false, erro: 'Falta a chave do GitHub na Cloudflare (GITHUB_KEYWORDS_TOKEN).' });

    const quando = new Date().toISOString();
    const alvos = formato === 'ambos' ? ['short', 'longo'] : [formato];
    const feito = [];
    for (const alvo of alvos) {
      const r = await porNaFila(chave, repo, alvo, { tema, titulo, quando });
      /**
       * ⚠️ **CONFERIR O RESULTADO, NUNCA O CÓDIGO DE SAÍDA** — a regra desta casa. E se o
       * segundo falhar depois de o primeiro ter entrado, diz-se **exatamente isso**: meia
       * verdade escondida é pior do que uma falha inteira.
       */
      if (!r.ok) {
        const jaEntrou = feito.length ? ` (o Short já entrou na fila; falhou só o vídeo longo)` : '';
        return responder(502, { ok: false, erro: `Não deu para ${r.passo} a fila (${r.status})${jaEntrou}.` });
      }
      feito.push(alvo);
    }

    const mensagens = {
      short: 'Registado. Este é o próximo Short a ser feito, na madrugada seguinte.',
      longo: 'Registado. Este é o próximo vídeo longo — sai no domingo seguinte.',
      ambos: 'Registado nos dois. É o próximo Short e o próximo vídeo longo.',
    };
    return responder(200, { ok: true, mensagem: mensagens[formato] });
  } catch (e) {
    return responder(500, { ok: false, erro: `Não deu para registar: ${e.message}` });
  }
}

export async function onRequestOptions(context) {
  const permitidas = siteConfig.allowedOrigins;
  const origem = context.request.headers.get('Origin') || '';
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': permitidas.includes(origem) ? origem : permitidas[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
