/**
 * A CAIXA DE ENTRADA DAS REDES — 11/08/2026, IMPLEMENTACAO26 §17 (pedido do dono).
 *
 * ═══ O QUE O DONO PEDIU ═══
 * *"Robôs que monitorem os comentários que eu recebo em todas as redes e unifiquem num só
 * lugar, com uma prévia de uma boa resposta para cada um."*
 *
 * ═══ 🔴 O QUE SE DESCOBRIU AO PERGUNTAR, EM VEZ DE ASSUMIR ═══
 * **O Multipost não serve para isto.** O manual dele diz, com todas as letras, que as
 * automações de comentário são **do Instagram**; e o `/comments` da API pública são os
 * comentários INTERNOS de aprovação (foi medido num post real: devolveu vazio num post que
 * tinha interacção). Logo, cada rede tem de ser perguntada **directamente** — que é como
 * o robô do YouTube (`youtube/comentarios.js`) já funciona.
 *
 * E o que cada rede deixa fazer, medido em 11/08:
 *
 *   | rede      | ler | responder | nota                                                |
 *   |-----------|-----|-----------|-----------------------------------------------------|
 *   | Bluesky   | ✅  | ✅        | **ler não precisa de chave nenhuma** — provado       |
 *   | Facebook  | ✅  | ✅        | precisa de token de página (fase 2)                  |
 *   | Threads   | ✅  | ✅        | precisa de token (fase 2)                            |
 *   | Telegram  | ❌  | —         | o canal NÃO tem grupo de discussão: não há comentário|
 *   | LinkedIn  | ⚠️  | ⚠️        | exige um produto que a LinkedIn aprova caso a caso   |
 *   | Pinterest | ⚠️  | ⚠️        | a API não expõe comentários de pin                   |
 *   | TikTok    | ❌  | ❌        | a API não abre isto a apps comuns (IMPL26 §12-B)     |
 *
 * ⚠️ **Instagram e YouTube ficam de fora daqui de propósito** — os dois já têm robô
 * próprio a responder, e duplicar seria responder duas vezes à mesma pessoa.
 *
 * ═══ 🔴 A REGRA DE QUEM RESPONDE — decisão do dono, e é a de 07/08 (§12-B) ═══
 * **Automático SÓ por palavra-chave. Todo o resto vira rascunho.**
 *
 * Quem escreve FINMOOVI está a pedir uma coisa concreta e recebe-a na hora, como no
 * Instagram e no YouTube. O resto — elogio, dúvida, queixa — fica à espera do dono.
 *
 * ⚠️ **Porquê, e é o dono que tem razão:** resposta automática a tudo é a assinatura do
 * spam e as redes marcam esse padrão. E o risco de imagem é concreto — um robô a responder
 * *"Que bom que gostou! 😊"* a quem escreveu *"esse app cobrou errado"* vira print.
 *
 * ═══ ⚠️ O QUE ESTE ROBÔ NÃO É ═══
 * Ele não conversa. Não interpreta queixas. Não decide nada sozinho fora da palavra-chave.
 * O rascunho é uma **sugestão para o dono ler**, e o painel da `/status` é onde ele a lê.
 *
 * Uso:
 *   node src/scripts/redes/comentarios-redes.js
 *   node src/scripts/redes/comentarios-redes.js --dry-run   (não responde nem grava)
 *   node src/scripts/redes/comentarios-redes.js --sem-ia    (não gasta IA nos rascunhos)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { generateText } from '../apis/kie-ai.js';

const ROOT = process.cwd();
const CADERNO = join(ROOT, '.github', 'data', 'comentarios-redes.json');
const APP_URL = 'https://finmoovi.com';

/** A conta do canal no Bluesky. ⚠️ É o nome completo, sem `@` — ver IMPL26 §10. */
const BLUESKY_CONTA = process.env.BLUESKY_IDENTIFIER || 'finmoovi.bsky.social';
const BLUESKY_PUBLICO = 'https://public.api.bsky.app/xrpc';
const BLUESKY_PRIVADO = 'https://bsky.social/xrpc';

/**
 * 🔑 QUANTOS POSTS SE OLHAM PARA TRÁS.
 *
 * O canal publica um vídeo por dia em cada rede. Trinta posts cobrem um mês — de sobra
 * para apanhar um comentário atrasado, e barato de ler (é uma chamada só).
 */
const POSTS_A_OLHAR = 30;

/** Teto de respostas automáticas por corrida. Um robô que responde a cinquenta de uma vez
 * parece o que é: um robô. E se algo correr mal, o estrago fica pequeno. */
const MAX_RESPOSTAS_POR_CORRIDA = 10;

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v === undefined ? true : v];
  }),
);
const DRY_RUN = Boolean(args['dry-run']);
const SEM_IA = Boolean(args['sem-ia']);
const log = (...m) => console.log(...m);

// ═══════════════════════════════════════════════════════════════════════════════
// As partes puras — sem rede, para a prova de mesa lhes poder chamar
// ═══════════════════════════════════════════════════════════════════════════════

const PALAVRA = 'finmoovi';

/**
 * ⚠️ COMPARA-SE O TEXTO SEM ACENTOS, SEM ESPAÇOS E SEM PONTUAÇÃO — a mesma regra do robô
 * do YouTube, e pela mesma razão: quem escreve no telemóvel escreve *"Finmoovi"*,
 * *"FIN MOOVI"*, *"fin-moovi"* e *"finmoovi!!!"*. Exigir a palavra exacta deixaria de fora
 * metade das pessoas que fizeram exactamente o que o vídeo pediu.
 */
export function pedeOApp(texto) {
  return String(texto || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .includes(PALAVRA);
}

/**
 * 🔴 O QUE NUNCA É RESPONDIDO SOZINHO, mesmo dizendo a palavra.
 *
 * Alguém pode escrever *"o FinMoovi cobrou errado"* — e aí a palavra está lá, mas mandar
 * o link seria a resposta mais surda possível. É o print que o dono não quer, e é a razão
 * de esta lista existir.
 *
 * ⚠️ **A lista é curta de propósito.** Ela não tenta perceber sentimento — isso é gosto, e
 * gosto não se mede com regex (a regra desta casa, paga com oito tentativas falhadas em
 * 01/08). Ela apanha as palavras que, sozinhas, já dizem que aquilo não é um pedido.
 */
const PALAVRAS_DE_ALARME = /\b(cobr\p{L}*|cobran[çc]\p{L}*|reembols\p{L}*|estorn\p{L}*|golpe|fraude|roub\p{L}*|processo|advogad\p{L}*|procon|denunci\p{L}*|reclama[çc]\p{L}*|p[ée]ssim\p{L}*|horr[íi]v\p{L}*|lixo|merda|bug|erro|falh\p{L}*|n[ãa]o funciona|travou|sumiu)\b/iu;

export function ehQueixa(texto) {
  return PALAVRAS_DE_ALARME.test(String(texto || ''));
}

/**
 * A DECISÃO SOBRE UM COMENTÁRIO — isolada de propósito para ser provada sem rede.
 *
 * `automatica` só é verdade quando as três coisas se juntam: pede o app, não é queixa, e
 * ainda não foi respondido. Faltando uma, vai a rascunho — nunca ao silêncio.
 */
export function oQueFazerCom(comentario, jaRespondidos = new Set()) {
  if (jaRespondidos.has(comentario.id)) return { accao: 'ja-respondido', automatica: false };
  if (pedeOApp(comentario.texto)) {
    if (ehQueixa(comentario.texto)) {
      return { accao: 'rascunho', automatica: false, motivo: 'diz FINMOOVI mas parece queixa — isto responde-se à mão' };
    }
    return { accao: 'responder', automatica: true, motivo: 'pediu o app pelo nome' };
  }
  return { accao: 'rascunho', automatica: false, motivo: 'não pede o app — o dono decide o que dizer' };
}

/** As respostas do pedido do app. Rodam para nunca saírem duas iguais seguidas. */
export const RESPOSTAS = [
  `Boa! 🚀 O FinMoovi é grátis e abre direto no navegador, sem instalar nada: ${APP_URL}`,
  `Show! Aqui tá ele, grátis e sem instalar: ${APP_URL} 💚`,
  `Prontinho! É de graça e roda no navegador: ${APP_URL} 🙌`,
  `Fechou! Pode entrar por aqui, é grátis: ${APP_URL} ✅`,
  `Massa! O app é gratuito e abre no navegador: ${APP_URL} 🚀`,
  `Valeu pelo comentário! Tá aqui, de graça: ${APP_URL} 😉`,
];

export function respostaDaVez(quantasJaForam) {
  return RESPOSTAS[quantasJaForam % RESPOSTAS.length];
}

/**
 * 🔑 O RASCUNHO DE RESERVA — o que aparece no painel quando a IA não corre.
 *
 * ⚠️ **Sem isto, um dia sem IA daria um painel com comentários e nenhuma sugestão**, e o
 * dono ficava com a folha em branco justamente no momento em que ia usá-la. É a mesma
 * regra do texto de reserva do vídeo: melhor uma frase honesta e curta do que nada.
 */
export function rascunhoDeReserva(comentario) {
  if (ehQueixa(comentario.texto)) {
    return 'Poxa, obrigado por avisar — me conta o que aconteceu que eu vou olhar isso com você.';
  }
  return 'Valeu por comentar! 💚';
}

/**
 * O PEDIDO QUE SE FAZ À IA. Curto de propósito, e com as proibições ao lado dos exemplos.
 *
 * ⚠️ **O exemplo pesa mais que a proibição** — é a regra desta casa. Por isso aqui não há
 * exemplo nenhum de resposta comprida nem de resposta a vender: só se diz o tamanho e o
 * tom, e deixa-se o modelo escrever.
 */
export function promptDoRascunho(comentario) {
  return [
    'Você responde comentários nas redes sociais de um canal brasileiro sobre finanças pessoais chamado FinMoovi.',
    '',
    `A pessoa comentou, na rede ${comentario.rede}:`,
    `"${comentario.texto}"`,
    '',
    'Escreva UMA resposta curta para esse comentário.',
    'REGRAS:',
    '- No máximo 2 frases. Comentário comprido ninguém lê.',
    '- Português do Brasil, falado, como se responde a uma pessoa — não como empresa.',
    '- Responda ao que a pessoa disse. Não mude de assunto.',
    '- NÃO ofereça o app se a pessoa não pediu nada.',
    '- NÃO invente número, promessa, prazo nem função que não foi mencionada.',
    '- Se for uma queixa, reconheça e peça o detalhe. Nunca minimize e nunca se defenda.',
    '- Sem hashtag, sem emoji a mais (no máximo um), sem "Olá!" nem "Prezado".',
    '',
    'Responda só com o texto da resposta, nada mais.',
  ].join('\n');
}

/**
 * ⚠️ **UM RASCUNHO NUNCA PODE DERRUBAR A CORRIDA.** Se a IA falhar, faltar chave ou vier
 * vazia, vale a reserva — o comentário aparece no painel na mesma, que é o que interessa.
 * (E `generateText` já aceita resposta truncada sem se queixar: por isso se corta aqui.)
 */
export async function escreverRascunho(comentario, gerar = generateText) {
  if (SEM_IA) return rascunhoDeReserva(comentario);
  try {
    const t = await gerar(promptDoRascunho(comentario), { maxTokens: 200, temperature: 0.7 });
    const limpo = String(t || '').trim().replace(/^["“']|["”']$/g, '').split('\n')[0].trim();
    return limpo.length >= 5 ? limpo.slice(0, 300) : rascunhoDeReserva(comentario);
  } catch (e) {
    log(`   ⚠️ a IA não escreveu o rascunho (${e.message}) — fica o de reserva.`);
    return rascunhoDeReserva(comentario);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// O caderno
// ═══════════════════════════════════════════════════════════════════════════════

export function lerCaderno(caminho = CADERNO) {
  if (!existsSync(caminho)) return { comentarios: [], respondidos: {} };
  try {
    const d = JSON.parse(readFileSync(caminho, 'utf-8'));
    return { comentarios: d.comentarios || [], respondidos: d.respondidos || {} };
  } catch {
    // ⚠️ Não se apaga um caderno que não se consegue ler: apagá-lo faria o robô responder
    // outra vez a toda a gente. Pára-se e diz-se.
    throw new Error(`O caderno ${caminho} existe mas não se consegue ler. Conferir à mão antes de correr outra vez.`);
  }
}

function gravarCaderno(dados, caminho = CADERNO) {
  mkdirSync(dirname(caminho), { recursive: true });
  writeFileSync(caminho, `${JSON.stringify(dados, null, 2)}\n`, 'utf-8');
}

// ═══════════════════════════════════════════════════════════════════════════════
// Bluesky — a única rede da fase 1
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 🔑 LER NÃO PRECISA DE CHAVE NENHUMA, e isto foi medido antes de se escrever uma linha:
 * `public.api.bsky.app` responde ao feed do canal sem autenticação. É por isso que o
 * Bluesky é a fase 1 — dá para pôr no ar hoje, sem o dono ter de criar nada.
 *
 * ⚠️ Responder JÁ precisa de senha de app (`BLUESKY_APP_PASSWORD`). Sem ela o robô lê e
 * escreve rascunhos na mesma, e diz que a resposta automática está desligada.
 */
export function comentariosDoBluesky(feed, conta = BLUESKY_CONTA) {
  const meus = [];
  for (const item of feed || []) {
    const p = item?.post;
    if (!p?.uri || !p?.record) continue;
    // Só os posts DO canal — o feed traz reposts e respostas a outros.
    if (p.author?.handle !== conta) continue;
    meus.push({ uri: p.uri, cid: p.cid, respostas: p.replyCount || 0, texto: p.record.text || '' });
  }
  return meus;
}

/** As respostas de um post, achatadas — a árvore do Bluesky pode ter respostas de respostas. */
export function respostasDaArvore(no, conta = BLUESKY_CONTA, fora = []) {
  for (const r of no?.replies || []) {
    const p = r?.post;
    if (p?.uri && p.author?.handle !== conta) {
      fora.push({
        id: p.uri,
        rede: 'Bluesky',
        autor: p.author?.handle || '(sem nome)',
        texto: p.record?.text || '',
        quando: p.record?.createdAt || p.indexedAt || '',
        link: `https://bsky.app/profile/${p.author?.handle}/post/${String(p.uri).split('/').pop()}`,
        // O necessário para responder no sítio certo, sem voltar a perguntar.
        raiz: { uri: r.post?.record?.reply?.root?.uri || p.uri, cid: r.post?.record?.reply?.root?.cid || p.cid },
        pai: { uri: p.uri, cid: p.cid },
      });
    }
    respostasDaArvore(r, conta, fora);
  }
  return fora;
}

async function pedir(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`o Bluesky recusou (${r.status}) em ${url.split('?')[0]}`);
  return r.json();
}

async function lerBluesky() {
  const feed = await pedir(`${BLUESKY_PUBLICO}/app.bsky.feed.getAuthorFeed?actor=${encodeURIComponent(BLUESKY_CONTA)}&limit=${POSTS_A_OLHAR}`);
  const posts = comentariosDoBluesky(feed.feed);
  log(`🦋 Bluesky: ${posts.length} post(s) do canal · ${posts.reduce((n, p) => n + p.respostas, 0)} resposta(s) no total`);

  const todos = [];
  // ⚠️ Só se abre a árvore dos posts QUE TÊM resposta. Abrir os outros seria uma chamada
  // por post para não trazer nada — e o canal publica todos os dias.
  for (const p of posts.filter((x) => x.respostas > 0)) {
    const t = await pedir(`${BLUESKY_PUBLICO}/app.bsky.feed.getPostThread?uri=${encodeURIComponent(p.uri)}&depth=3`);
    todos.push(...respostasDaArvore(t.thread));
  }
  return todos;
}

/**
 * A SESSÃO DO BLUESKY, só quando há mesmo algo a responder.
 * ⚠️ Sem senha de app devolve `null` — e isso é um AVISO, nunca uma paragem.
 */
async function sessaoBluesky() {
  const senha = (process.env.BLUESKY_APP_PASSWORD || '').trim();
  if (!senha) return null;
  const r = await fetch(`${BLUESKY_PRIVADO}/com.atproto.server.createSession`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: BLUESKY_CONTA, password: senha }),
  });
  if (!r.ok) throw new Error(`o Bluesky recusou a senha de app (${r.status})`);
  return r.json();
}

async function responderNoBluesky(sessao, comentario, texto) {
  const r = await fetch(`${BLUESKY_PRIVADO}/com.atproto.repo.createRecord`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessao.accessJwt}` },
    body: JSON.stringify({
      repo: sessao.did,
      collection: 'app.bsky.feed.post',
      record: {
        $type: 'app.bsky.feed.post',
        text: texto,
        createdAt: new Date().toISOString(),
        reply: { root: comentario.raiz, parent: comentario.pai },
      },
    }),
  });
  if (!r.ok) throw new Error(`não deu para responder (${r.status}): ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  log(`\n💬 A caixa de entrada das redes${DRY_RUN ? ' (ENSAIO: não responde nem grava)' : ''}`);
  log('   (Instagram e YouTube ficam de fora: já têm robô próprio a responder)\n');

  const caderno = lerCaderno();
  const jaRespondidos = new Set(Object.keys(caderno.respondidos));
  log(`📓 já respondidos até hoje: ${jaRespondidos.size}`);

  const encontrados = await lerBluesky();
  log(`\n📥 ${encontrados.length} comentário(s) encontrados no total.\n`);

  const sessao = DRY_RUN ? null : await sessaoBluesky().catch((e) => {
    log(`⚠️ ${e.message} — hoje ninguém é respondido sozinho; fica tudo em rascunho.`);
    return null;
  });
  if (!sessao && !DRY_RUN) {
    log('⚠️ sem BLUESKY_APP_PASSWORD: a resposta automática está DESLIGADA (a leitura não precisa dela).');
  }

  const painel = [];
  let respondidos = 0;
  for (const c of encontrados) {
    const { accao, automatica, motivo } = oQueFazerCom(c, jaRespondidos);
    if (accao === 'ja-respondido') continue;

    if (automatica && sessao && respondidos < MAX_RESPOSTAS_POR_CORRIDA && !DRY_RUN) {
      const texto = respostaDaVez(jaRespondidos.size + respondidos);
      try {
        await responderNoBluesky(sessao, c, texto);
        caderno.respondidos[c.id] = { rede: c.rede, quando: new Date().toISOString(), texto };
        respondidos += 1;
        log(`⚡ ${c.rede} · @${c.autor}: pediu o app — RESPONDIDO sozinho.`);
        gravarCaderno(caderno); // ⚠️ grava a cada um: se a corrida morrer, não se repete.
        continue;
      } catch (e) {
        log(`   ⚠️ falhou a responder a @${c.autor} (${e.message}) — vai para o painel.`);
      }
    }

    const rascunho = await escreverRascunho(c);
    painel.push({ ...c, motivo, automatica, rascunho, ehQueixa: ehQueixa(c.texto) });
    log(`${ehQueixa(c.texto) ? '🔴' : '📝'} ${c.rede} · @${c.autor}: ${String(c.texto).slice(0, 60)}`);
    log(`      rascunho: ${rascunho.slice(0, 80)}`);
  }

  log('\n────────────────────────────────────────────────────────────────');
  log(`⚡ ${respondidos} respondido(s) sozinho · 📝 ${painel.length} à espera de si na /status`);
  if (painel.some((c) => c.ehQueixa)) log('🔴 há queixa(s) na lista — essas são as primeiras a ler.');

  if (!DRY_RUN) {
    caderno.comentarios = painel;
    caderno.atualizadoEm = new Date().toISOString();
    gravarCaderno(caderno);
    log(`\n💾 caderno gravado: ${CADERNO}`);
  }
  return 0;
}

/**
 * ⚠️ **`process.exitCode`, e NÃO `process.exit()`** — e isto custou uma medição.
 *
 * Com `process.exit(0)` logo a seguir ao trabalho, o Node morria com
 * `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)` e devolvia **código 127**:
 * o trabalho tinha corrido todo bem e a corrida ficaria **vermelha na mesma**. A causa
 * são as ligações que o `fetch` deixa abertas — matar o processo por cima delas rebenta.
 *
 * 🔑 Marcar o código e deixar o Node acabar sozinho dá o mesmo resultado sem o estouro.
 */
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('redes/comentarios-redes.js')) {
  main()
    .then((c) => { process.exitCode = c; })
    .catch((e) => {
      console.error(`\n❌ ${e.message}\n`);
      process.exitCode = 1;
    });
}
