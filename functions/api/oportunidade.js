import siteConfig from '../_config.json';

/**
 * A OPORTUNIDADE DO DONO — a porta entre a página /status e o robô (IMPL20 §60).
 *
 * O dono escreve um tema na /status; isto manda o robô do GitHub pô-lo à cabeça da fila.
 * **Não produz nada e não publica nada** — só arruma a fila. Quem faz o vídeo continua a
 * ser o robô de sempre, à hora de sempre.
 *
 * ═══ 🔴 QUEM PODE ABRIR ESTA PORTA ═══
 * Uma porta aberta que dispara robôs é uma porta que qualquer pessoa pode empurrar. Há
 * **duas fechaduras, e basta uma**:
 *   1. **Cloudflare Access** — se este caminho estiver protegido no painel, a Cloudflare
 *      só deixa passar o dono e acrescenta o cabeçalho `Cf-Access-Jwt-Assertion`. É a
 *      fechadura boa, porque não há segredo nenhum escrito em lado nenhum.
 *   2. **Uma senha** (`OPORTUNIDADE_TOKEN`), para o caso de o Access não cobrir `/api/`.
 *      ⚠️ **A comparação é feita em tempo constante**: comparar senhas com `===` deixa
 *      medir o tempo de resposta e adivinhar letra a letra.
 *
 * ⚠️ **Sem NENHUMA das duas configuradas, isto RECUSA-SE A FUNCIONAR** — nunca fica
 * aberto "por enquanto". É a diferença entre uma porta trancada e uma porta encostada.
 *
 * ═══ ⚠️ REAPROVEITA OS SEGREDOS QUE JÁ EXISTEM ═══
 * A página /status já tem um formulário igual (o de enviar keywords), com senha e token
 * do GitHub configurados no painel da Cloudflare há meses. **Este usa os mesmos**, por
 * duas razões: o dono não tem de configurar quase nada, e **duas senhas para a mesma
 * página é uma senha que um dia fica desatualizada** sem ninguém dar por nada.
 *
 * O que ele TEM de fazer, uma vez: dar ao token `GITHUB_KEYWORDS_TOKEN` a permissão
 * **"Actions: write"** neste repositório (hoje só escreve ficheiros). São quatro cliques
 * no GitHub — e enquanto não estiver feito, isto responde a dizer exatamente isso.
 *
 * Variáveis (só se quiser separar deste do das keywords):
 *   OPORTUNIDADE_TOKEN         — senha própria (por omissão usa KEYWORDS_ACCESS_KEY)
 *   GITHUB_TOKEN_OPORTUNIDADE  — token próprio (por omissão usa GITHUB_KEYWORDS_TOKEN)
 *   GITHUB_REPO                — por omissão `edflaviojs/blog-finmoovi`
 */

const WORKFLOW = 'youtube-oportunidade.yml';

/** Compara duas senhas sem deixar o tempo de resposta denunciar quantas letras acertaram. */
function iguaisEmTempoConstante(a, b) {
  const x = String(a || '');
  const y = String(b || '');
  if (x.length !== y.length) return false;
  let diferenca = 0;
  for (let i = 0; i < x.length; i += 1) diferenca |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diferenca === 0;
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
        return responder(503, { ok: false, erro: 'Esta porta ainda não foi trancada — falta a senha na Cloudflare (KEYWORDS_ACCESS_KEY), ou proteger /api/ com o Access. Até lá não abre.' });
      }
      return responder(401, { ok: false, erro: 'Senha errada.' });
    }

    // ── o que o dono escreveu ──
    if (!['short', 'longo', 'ambos'].includes(formato)) {
      return responder(400, { ok: false, erro: 'Escolha onde o tema entra: Short, vídeo longo ou os dois.' });
    }
    if (tema.length < 10) return responder(400, { ok: false, erro: 'Escreva a ideia numa frase (pelo menos 10 letras).' });
    if (tema.length > 300) return responder(400, { ok: false, erro: 'A ideia está comprida de mais (máximo 300 letras).' });
    /**
     * ⚠️ **O TÍTULO DO VÍDEO LONGO É EXIGIDO AQUI, e não é capricho.** O robô que publica
     * recusa-se a subir um vídeo longo sem título aprovado — *"um título mau é a coisa mais
     * cara que este canal pode pôr no ar"*. Sem esta linha, o tema entrava na fila e a
     * corrida de sábado de madrugada falhava, com o dono a dormir. **Recusar aqui é
     * barato; recusar lá custa uma semana sem vídeo.**
     */
    if (formato !== 'short' && (titulo.length < 20 || titulo.length > 70)) {
      return responder(400, { ok: false, erro: 'O vídeo longo precisa de um título entre 20 e 70 letras — é ele que fica na lista do canal para sempre.' });
    }

    const repo = env.GITHUB_REPO || 'edflaviojs/blog-finmoovi';
    const chave = env.GITHUB_TOKEN_OPORTUNIDADE || env.GITHUB_KEYWORDS_TOKEN;
    if (!chave) return responder(503, { ok: false, erro: 'Falta a chave do GitHub na Cloudflare (GITHUB_KEYWORDS_TOKEN).' });

    const r = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/${WORKFLOW}/dispatches`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${chave}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'finmoovi-status',
      },
      body: JSON.stringify({ ref: 'main', inputs: { tema, titulo, formato } }),
    });

    /**
     * ⚠️ **CONFERIR O RESULTADO, NUNCA O CÓDIGO DE SAÍDA** — a regra desta casa. O GitHub
     * responde 204 sem corpo quando aceita; qualquer outra coisa é recusa, e o dono tem
     * de a ver na página em vez de ficar a pensar que ficou registado.
     */
    if (r.status !== 204) {
      const texto = await r.text().catch(() => '');
      /**
       * ⚠️ O 403 tem uma causa quase certa e uma cura de quatro cliques — dizê-la aqui
       * poupa uma hora a alguém a olhar para "403" sem saber o que fazer com ele.
       */
      if (r.status === 403 || r.status === 404) {
        return responder(502, { ok: false, erro: 'O GitHub recusou. Quase de certeza falta dar ao token a permissão "Actions: write" neste repositório (hoje só escreve ficheiros).' });
      }
      return responder(502, { ok: false, erro: `O GitHub recusou (${r.status}). ${texto.slice(0, 200)}` });
    }

    return responder(200, {
      ok: true,
      mensagem: formato === 'longo'
        ? 'Registado. Este é o próximo vídeo longo — sai no domingo seguinte.'
        : 'Registado. Este é o próximo Short a ser feito, na madrugada seguinte.',
    });
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
