/**
 * OS POSTS DA SEMANA PARA A ABA "POSTS" DO YOUTUBE — 14/10/2026.
 *
 * ═══ O QUE O DONO PEDIU ═══
 *   *"é possível criarmos algum workflow para automatizarmos os posts do youtube?"*
 *   → *"Sim quero na segunda!"*
 *
 * ═══ POR QUE O ROBÔ NÃO PUBLICA SOZINHO ═══
 * A API do YouTube **não tem porta para criar posts** — só vídeos, comentários,
 * legendas e playlists. Um robô a clicar no navegador partiria a cada mudança de tela
 * e é proibido pelos termos (põe o canal em risco). Por isso o robô ESCREVE e o dono
 * AGENDA: o compositor do YouTube tem "Agendar post", e seis posts colam-se em minutos.
 *
 * ═══ O QUE SAI ═══
 * Toda segunda, um e-mail com SEIS posts (segunda a sábado), à volta do vídeo longo
 * que estreou no domingo — e, no sábado, o aviso do que estreia no domingo seguinte.
 *
 * ═══ AS REGRAS DA CASA QUE AQUI VALEM (todas medidas por código, não pedidas) ═══
 *   · "7 dias grátis", nunca "grátis" sozinho — `corrigirPromessa` (12/08).
 *   · Pergunta pelo que a pessoa JÁ VIVEU; nunca mandar fazer conta (01/10).
 *   · O link é o CÓDIGO que põe, nunca a IA — não há link inventado.
 *   · Nenhum número que não esteja no vídeo — a IA não inventa valores.
 *
 * Só usa IA GRÁTIS: o workflow não passa nenhuma chave do kie.ai, por isso
 * `pago: 'escritor'` cai direto no Gemini Flash grátis e, depois, na fila gratuita.
 *
 *   node src/scripts/youtube/posts-semana.js --ensaio     (escreve e mostra, não envia)
 *   node src/scripts/youtube/posts-semana.js              (escreve e envia o e-mail)
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { generateText } from '../apis/kie-ai.js';
import { corrigirPromessa } from './lib/promessa-gratis.js';
import { config } from '../../../site.config.ts';

const RAIZ = process.cwd();
const CADERNO = join(RAIZ, '.github/data/youtube-longos-published.json');
const OUTPUT = join(RAIZ, 'src/scripts/youtube/output');
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const PARA = process.env.DIGEST_TO || 'finmoovi@gmail.com';
const ENSAIO = process.argv.includes('--ensaio');
const SAIDA = process.env.POSTS_SAIDA || join(RAIZ, '.posts-semana.json');

const LIMITE_TEXTO = 500;     // o YouTube aceita mais; curto é o que se lê no feed
const LIMITE_OPCAO = 65;      // limite do YouTube para cada opção de enquete
// ⚠️ "some" SOZINHO NÃO: é também o verbo SUMIR ("onde o seu dinheiro some?") — 14/10, apanhado no ensaio.
const PROIBIDO_TAREFA = /\b(calcul\w*|fa[çc]a a conta|faz a conta|fa[çc]a as contas|somar|som[ae] (tudo|os|as|esses|essas)\b|anot\w+|pegue o extrato|abra o extrato|confira (o|a|seu|sua))/i;

// ─── o que aconteceu e o que vem ──────────────────────────────────────────────

function lerCaderno() {
  const j = JSON.parse(readFileSync(CADERNO, 'utf-8').replace(/^﻿/, ''));
  return Object.entries(j)
    .map(([slug, v]) => ({ slug, ...v }))
    .filter((v) => v.videoId && v.publishAt);
}

function lerGuiao(slug) {
  const p = join(OUTPUT, `${slug}.longo.json`);
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, 'utf-8')); } catch { return null; }
}

/** O que a IA pode saber do vídeo — e os números que ele tem (os únicos permitidos). */
function resumoDoVideo(v) {
  const g = lerGuiao(v.slug);
  const partes = [`Título: ${v.titulo}`];
  if (g) {
    if (g.tema) partes.push(`Tema: ${g.tema}`);
    if (g.angulo) partes.push(`Ângulo: ${g.angulo}`);
    if (g.promessa) partes.push(`Promessa: ${g.promessa}`);
    (g.capitulos || []).forEach((c, i) => {
      if (c && c.pergunta) partes.push(`Capítulo ${i + 1}: ${c.pergunta}`);
    });
  }
  const texto = partes.join('\n');
  const numeros = new Set((texto + ' ' + JSON.stringify(g?.mapa || {})).match(/\d+(?:[.,]\d+)?/g) || []);
  numeros.add('7'); // "7 dias grátis"
  numeros.add('19'); // "domingo às 19h" — a hora da estreia vem no próprio pedido
  return { texto, numeros };
}

// ─── as datas (no relógio do Brasil) ──────────────────────────────────────────

const DIAS = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

function segundaDestaSemana(agora = new Date()) {
  // Meio-dia em São Paulo do dia de hoje, recuado até segunda.
  const sp = new Date(agora.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const dow = (sp.getDay() + 6) % 7; // 0 = segunda
  const seg = new Date(sp);
  seg.setDate(sp.getDate() - dow);
  return seg;
}

function ddmm(d) {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ─── o pedido à IA ────────────────────────────────────────────────────────────

/**
 * ♦ 14/10/2026 — O PROMPT DA IMAGEM DE CADA POST, pedido do dono: *"no email dos posts
 * tem como vc inserir um prompt pra eu gerar uma imagem adequada para aquele post?"*
 *
 * 🔴 **A IA SÓ DESCREVE A CENA; O ESTILO E A PROIBIÇÃO DE LETRAS SÃO DO CÓDIGO.** Lição
 * de 18/08 (capas do blog): pôr o TÍTULO dentro do pedido de imagem fazia o gerador
 * desenhar letras tortas e borrões. Por isso o texto do post nunca entra aqui, e a
 * trava `CENA_COM_LETRAS` recusa a cena que peça palavra, placa, número ou ecrã.
 * As enquetes não levam imagem: o YouTube não deixa juntar imagem a uma enquete de texto.
 */
const ESTILO_DA_IMAGEM = 'Ilustração plana e simples, quadrada (1:1), no estilo boneco-palito (stickman): personagem de traço preto grosso, cabeça redonda, expressão bem clara no rosto. Fundo de uma cor lisa e clara, poucos objetos, cores vivas. IMPORTANTE: a imagem NÃO tem nenhuma letra, palavra, número, placa, etiqueta de preço nem tela com texto.';
const CENA_COM_LETRAS = /(escrit|texto|letreiro|placa|palavra|frase|legenda|t[ií]tulo|n[uú]mero|etiqueta|cartaz|r\$|\d|logo|marca)/i;

export function promptDaImagem(cena) {
  return `${String(cena).trim()}\n\n${ESTILO_DA_IMAGEM}`;
}

const PLANO = [
  { dia: 'segunda', tipo: 'texto', papel: 'O VÍDEO DE ONTEM. Conte em 2–3 frases o problema que o vídeo resolve, na voz de quem já passou por isso, e termine convidando a assistir. NÃO escreva link (o link é colocado depois, automaticamente).' },
  { dia: 'terça', tipo: 'enquete', papel: 'ENQUETE sobre o tema do vídeo — uma situação do dia a dia em que a pessoa se reconhece. 3 ou 4 opções curtas, todas plausíveis, nenhuma "certa".' },
  { dia: 'quarta', tipo: 'texto', papel: 'PERGUNTA VIVIDA, com as DUAS pontas: pergunte se a pessoa já passou pelo problema do vídeo E se conseguiu resolver — e peça para contar nos comentários como resolveu, ou se ainda passa por isso.' },
  { dia: 'quinta', tipo: 'texto', papel: 'UMA DICA CURTA tirada do vídeo, que a pessoa pode usar hoje. Concreta, sem conta nenhuma, sem lista longa.' },
  { dia: 'sexta', tipo: 'enquete', papel: 'ENQUETE leve de fim de semana sobre gastos ou hábitos com dinheiro da família (mercado, lazer, contas de casa). 3 ou 4 opções curtas.' },
  { dia: 'sábado', tipo: 'texto', papel: 'O AVISO DE AMANHÃ: amanhã, domingo, às 19h, estreia o vídeo novo (ver "PRÓXIMO VÍDEO"). Desperte curiosidade pelo problema, sem entregar a solução.' },
];

function montarPrompt(anterior, proximo) {
  return `Você escreve os posts da aba "Posts" do canal de YouTube FinMoovi (finanças pessoais para famílias brasileiras de classe média e baixa).

Linguagem: português do Brasil, simples, de conversa — como um vizinho que já passou pelo mesmo aperto. Frases curtas. No máximo 1 ou 2 emojis por post. Sem jargão ("rentabilidade", "estratégia", "planejamento financeiro").

═══ VÍDEO QUE ESTREOU ONTEM (domingo) ═══
${anterior.texto}

═══ PRÓXIMO VÍDEO (estreia domingo que vem, às 19h) ═══
${proximo ? proximo.texto : '(ainda não definido — no post de sábado, diga só que domingo às 19h tem vídeo novo, sem inventar o tema)'}

═══ OS SEIS POSTS ═══
${PLANO.map((p, i) => `${i + 1}. ${p.dia.toUpperCase()} (${p.tipo}) — ${p.papel}`).join('\n')}

═══ PROIBIDO (reprova) ═══
⛔ Pedir para a pessoa fazer conta, somar, calcular, anotar ou ir buscar o extrato. Pergunte pelo que ela JÁ VIVEU — responde-se de memória, em meio segundo.
⛔ Dizer que o app FinMoovi é "grátis", "de graça" ou "gratuito". Se falar do app, é "7 dias grátis". (Nem é preciso falar do app.)
⛔ Qualquer número que não esteja nos textos dos vídeos acima. Não invente valores, percentagens nem estatísticas.
⛔ Escrever links ou endereços. Os links são colocados depois.
═══ A IMAGEM DOS POSTS DE TEXTO (segunda, quarta, quinta e sábado) ═══
Em cada post de TEXTO, escreva também "cena": 1 ou 2 frases a descrever UMA imagem para o post — o que o boneco-palito está fazendo, onde, e com que objeto do dia a dia (carteira vazia, sacola de mercado, boleto na mão, chuveiro, geladeira…). Mostre a emoção do momento.
⛔ A cena NÃO pode ter nenhuma palavra, número, valor, placa, etiqueta, cartaz, logotipo nem tela com texto — geradores de imagem desenham letras tortas. Conte tudo pela cena e pela expressão do rosto.
As enquetes NÃO levam "cena".

⛔ Mais de ${LIMITE_TEXTO} caracteres por texto. Cada opção de enquete com no máximo ${LIMITE_OPCAO} caracteres.

Devolva SÓ este JSON, sem mais nada:
{
  "posts": [
    { "dia": "segunda", "texto": "...", "cena": "..." },
    { "dia": "terça", "texto": "a pergunta da enquete", "opcoes": ["...", "...", "..."] },
    { "dia": "quarta", "texto": "...", "cena": "..." },
    { "dia": "quinta", "texto": "...", "cena": "..." },
    { "dia": "sexta", "texto": "a pergunta da enquete", "opcoes": ["...", "...", "..."] },
    { "dia": "sábado", "texto": "...", "cena": "..." }
  ]
}`;
}

// ─── as travas ────────────────────────────────────────────────────────────────

export function validarPosts(n, numerosPermitidos) {
  const erros = [];
  const posts = Array.isArray(n && n.posts) ? n.posts : [];
  if (posts.length !== PLANO.length) {
    return [`são ${PLANO.length} posts, recebi ${posts.length}`];
  }
  posts.forEach((p, i) => {
    const plano = PLANO[i];
    const rot = `post ${i + 1} (${plano.dia})`;
    const texto = String(p && p.texto || '').trim();
    if (!texto) { erros.push(`${rot}: texto vazio`); return; }
    if (texto.length > LIMITE_TEXTO) erros.push(`${rot}: ${texto.length} caracteres (máximo ${LIMITE_TEXTO})`);
    const tudo = [texto, ...(Array.isArray(p.opcoes) ? p.opcoes : [])].join(' \n ');

    if (/https?:\/\/|www\.|\.com\b|youtu\.?be/i.test(tudo)) erros.push(`${rot}: tem link — os links são colocados pelo robô, não escreva nenhum`);
    const tarefa = tudo.match(PROIBIDO_TAREFA);
    if (tarefa) erros.push(`${rot}: "${tarefa[0]}" manda a pessoa fazer uma tarefa — pergunte pelo que ela JÁ VIVEU`);
    const promessa = corrigirPromessa(tudo);
    if (promessa.mudou || (promessa.sobras && promessa.sobras.length)) erros.push(`${rot}: o app não é grátis — diga "7 dias grátis" ou não fale de preço`);
    for (const num of tudo.match(/\d+(?:[.,]\d+)?/g) || []) {
      if (!numerosPermitidos.has(num)) erros.push(`${rot}: o número "${num}" não está no vídeo — não invente números`);
    }

    if (plano.tipo === 'texto') {
      const cena = String(p.cena || '').trim();
      if (cena.length < 30) erros.push(`${rot}: falta a "cena" da imagem (1 ou 2 frases, o que o boneco faz e onde)`);
      else if (cena.length > 400) erros.push(`${rot}: a cena tem ${cena.length} caracteres (máximo 400)`);
      const letra = cena.match(CENA_COM_LETRAS);
      if (letra) erros.push(`${rot}: a cena pede "${letra[0]}" — a imagem não pode ter letras, números nem placas; conte pela cena e pela expressão`);
    }

    if (plano.tipo === 'enquete') {
      const op = Array.isArray(p.opcoes) ? p.opcoes.map((o) => String(o || '').trim()).filter(Boolean) : [];
      if (op.length < 2 || op.length > 4) erros.push(`${rot}: a enquete precisa de 2 a 4 opções (recebi ${op.length})`);
      op.forEach((o) => { if (o.length > LIMITE_OPCAO) erros.push(`${rot}: opção com ${o.length} caracteres (máximo ${LIMITE_OPCAO}) — "${o}"`); });
    }
  });
  return erros;
}

function extrairJson(bruto) {
  const t = String(bruto || '').trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const i = t.indexOf('{');
  const f = t.lastIndexOf('}');
  if (i < 0 || f <= i) throw new Error('não veio JSON nenhum na resposta');
  return JSON.parse(t.slice(i, f + 1));
}

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

/** O mesmo método do Short de 16s: a versão reprovada volta com SÓ os erros dela. */
async function gerarPosts(anterior, proximo, tentativas = 5) {
  const base = montarPrompt(anterior, proximo);
  const permitidos = new Set([...anterior.numeros, ...(proximo ? proximo.numeros : [])]);
  let versao = null;
  let erros = [];
  for (let i = 1; i <= tentativas; i++) {
    if (i > 1) await dormir(15000);
    const corretivo = !erros.length ? '' : versao
      ? `\n\n⚠️ A versão abaixo foi REPROVADA:\n${JSON.stringify(versao, null, 2)}\n\nCorrija SÓ isto, e deixe igual tudo o que não está nesta lista:\n${erros.map((e) => `- ${e}`).join('\n')}\n\nDevolva o JSON completo, já corrigido.`
      : `\n\n⚠️ A versão anterior foi REPROVADA. Corrija:\n${erros.map((e) => `- ${e}`).join('\n')}`;
    const bruto = await generateText(base + corretivo, { maxTokens: 3000, temperature: 0.8, pago: 'escritor', servico: 'posts' });
    let n;
    try {
      n = extrairJson(bruto);
    } catch (e) {
      erros = [`devolva JSON válido (${e.message})`];
      console.log(`  ⚠ tentativa ${i}/${tentativas} reprovada: JSON inválido`);
      continue;
    }
    erros = validarPosts(n, permitidos);
    if (!erros.length) return { posts: n.posts, tentativa: i };
    versao = n;
    console.log(`  ⚠ tentativa ${i}/${tentativas} reprovada: ${erros.join(' | ')}`);
  }
  throw new Error(`os posts não passaram nas travas após ${tentativas} tentativas: ${erros.join(' | ')}`);
}

// ─── o e-mail ─────────────────────────────────────────────────────────────────

function escapar(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** O texto exato a colar — com o link que o CÓDIGO acrescenta. */
function textoFinal(p, i, anterior) {
  let t = String(p.texto).trim();
  if (i === 0) t += `\n\n▶️ https://youtu.be/${anterior.videoId}`;
  return t;
}

function montarEmail(posts, anterior, proximo, segunda) {
  const datas = PLANO.map((_, i) => { const d = new Date(segunda); d.setDate(segunda.getDate() + i); return d; });
  const caixas = posts.map((p, i) => {
    const plano = PLANO[i];
    const enquete = plano.tipo === 'enquete';
    const imagem = enquete
      ? `
        <p style="color:#484f58;font-size:12px;margin:12px 0 0;">🎨 Enquete não leva imagem — o YouTube não deixa juntar as duas.</p>`
      : `
        <p style="color:#3fb950;font-size:12px;font-weight:600;margin:16px 0 4px;">🎨 PROMPT DA IMAGEM — cole no ChatGPT ou no Gemini:</p>
        <pre style="white-space:pre-wrap;font-family:inherit;background:#0d1117;border:1px dashed #3fb950;border-radius:6px;padding:10px 12px;color:#c9d1d9;font-size:13px;line-height:1.5;margin:0;">${escapar(promptDaImagem(p.cena))}</pre>`;
    const opcoes = enquete ? `
        <p style="color:#8b949e;font-size:12px;margin:12px 0 4px;">OPÇÕES DA ENQUETE (uma em cada campo):</p>
        ${p.opcoes.map((o) => `<div style="background:#0d1117;border:1px solid #30363d;border-radius:6px;padding:8px 12px;margin:4px 0;color:#f0f6fc;font-size:14px;">${escapar(o)}</div>`).join('')}` : '';
    return `
      <div style="background:#161b22;border:1px solid #30363d;border-radius:12px;padding:20px;margin:0 0 16px;">
        <p style="color:#58a6ff;font-size:13px;font-weight:600;margin:0 0 8px;">${plano.dia.toUpperCase()} ${ddmm(datas[i])} · agendar para as 12h · ${enquete ? '📊 ENQUETE' : '📝 TEXTO'}</p>
        <pre style="white-space:pre-wrap;font-family:inherit;color:#f0f6fc;font-size:15px;line-height:1.6;margin:0;">${escapar(textoFinal(p, i, anterior))}</pre>${opcoes}${imagem}
      </div>`;
  }).join('');

  const subject = `📣 Posts do YouTube da semana (${ddmm(datas[0])} a ${ddmm(datas[5])}) — prontos para agendar`;
  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0d1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:640px;margin:0 auto;padding:32px 16px;">
    <h1 style="color:#f0f6fc;font-size:20px;margin:0 0 8px;">Os 6 posts desta semana</h1>
    <p style="color:#8b949e;font-size:14px;line-height:1.6;margin:0 0 8px;">
      Sobre o vídeo de domingo: <strong style="color:#f0f6fc;">${escapar(anterior.titulo)}</strong>${proximo ? `<br>Sábado avisa o próximo: <strong style="color:#f0f6fc;">${escapar(proximo.titulo)}</strong>` : ''}
    </p>
    <p style="color:#8b949e;font-size:14px;line-height:1.6;margin:0 0 24px;">
      <strong style="color:#f0f6fc;">Como agendar:</strong> YouTube Studio → <strong>Criar</strong> → <strong>Criar post</strong> → colar o texto → (enquete: botão <strong>Enquete</strong>) → seta ao lado de Publicar → <strong>Agendar</strong>.
    </p>
    ${caixas}
    <p style="color:#484f58;font-size:11px;margin:24px 0 0;">Escrito por IA grátis. O YouTube não deixa robô publicar posts — por isso vem para você agendar.</p>
  </div></body></html>`;
  return { subject, html };
}

async function enviar({ subject, html }) {
  if (!RESEND_API_KEY) throw new Error('falta RESEND_API_KEY — o e-mail não pode sair');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: config.email.from, to: [PARA], subject, html }),
  });
  const corpo = await res.text();
  if (!res.ok) throw new Error(`Resend ${res.status}: ${corpo.slice(0, 200)}`);
  return corpo;
}

// ─── execução ─────────────────────────────────────────────────────────────────

async function main() {
  const agora = new Date();
  const videos = lerCaderno().sort((a, b) => new Date(a.publishAt) - new Date(b.publishAt));
  const jaEstrearam = videos.filter((v) => new Date(v.publishAt) <= agora);
  const futuros = videos.filter((v) => new Date(v.publishAt) > agora);
  const ultimo = jaEstrearam[jaEstrearam.length - 1];
  if (!ultimo) throw new Error('nenhum vídeo longo estreou ainda — não há do que falar');
  const seguinte = futuros[0] || null;

  const anterior = { ...ultimo, ...resumoDoVideo(ultimo) };
  const proximo = seguinte ? { ...seguinte, ...resumoDoVideo(seguinte) } : null;
  console.log(`🎬 vídeo da semana: ${anterior.titulo} (youtu.be/${anterior.videoId})`);
  console.log(`⏭️  próximo: ${proximo ? proximo.titulo : '(ainda sem vídeo marcado)'}\n`);

  const { posts, tentativa } = await gerarPosts(anterior, proximo);
  console.log(`✅ os 6 posts passaram nas travas à ${tentativa}ª tentativa\n`);
  posts.forEach((p, i) => {
    console.log(`── ${PLANO[i].dia.toUpperCase()} (${PLANO[i].tipo}) ──`);
    console.log(textoFinal(p, i, anterior));
    if (p.opcoes) p.opcoes.forEach((o) => console.log(`   ◻ ${o}`));
    if (p.cena) console.log(`   🎨 ${p.cena}`);
    console.log('');
  });
  writeFileSync(SAIDA, `${JSON.stringify({ geradoEm: agora.toISOString(), video: anterior.videoId, posts }, null, 2)}\n`);

  const email = montarEmail(posts, anterior, proximo, segundaDestaSemana(agora));
  if (ENSAIO) {
    console.log(`(ensaio — não enviei. Assunto seria: ${email.subject})`);
    return;
  }
  await enviar(email);
  console.log(`📧 enviado para ${PARA}: ${email.subject}`);
}

const executadoDireto = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('posts-semana.js');
if (executadoDireto) {
  main().catch((e) => { console.error(`❌ ${e.message}`); process.exit(1); });
}
