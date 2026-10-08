/**
 * ♦ O ESCOLHEDOR DOS BONECOS — 08/10/2026, ordem do dono: *"Já quero que trabalhe nos
 * bonecos novos! Quero o vídeo todo remodelado!"*
 *
 * Mesmo molde do `ilustrador-longo.js` (plano `docs/BONECO-NO-VIDEO-LONGO.md` §5): um
 * leitor de IA lê a narração de cada cena e o SIGNIFICADO dos 32 movimentos
 * (`lib/bonecos-do-longo.js`), e devolve qual boneco vai em qual cena. Grava em
 * `.github/data/bonecos-do-longo.json`. **O montador só lê esse ficheiro** — correr o
 * montador duas vezes dá o mesmo vídeo, e quem paga a IA é só este passo.
 *
 * ⚠️ Escolher o boneco que combina com a frase é JULGAMENTO — por isso um leitor, e não
 * palavras-gatilho (medido nas ilustrações: o casamento por palavra não escala).
 * ⚠️ As guardas do plano NÃO dependem do leitor obedecer: o montador volta a aplicá-las
 * (`escolherLugaresDoBoneco` — estágio da história, distância, teto, sem repetir). Aqui
 * só se tira o que é obviamente lixo (nome inventado, repetido).
 * ⚠️ Corre ANTES do ilustrador: o boneco tem prioridade sobre a ilustração (§6).
 *
 * Uso: node src/scripts/youtube/bonecos-longo.js --slug=<slug> [--ensaio]
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { generateText } from '../apis/kie-ai.js';
import { BONECOS, BONECO_POR_ID, TETO_DE_BONECOS } from './lib/bonecos-do-longo.js';

const RAIZ = process.cwd();
const ROTEIRO_DIR = join(RAIZ, 'youtube-render', 'public', 'roteiro');
const CATALOGO = join(RAIZ, '.github', 'data', 'bonecos-do-longo.json');

const args = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => {
    const [k, ...v] = a.slice(2).split('=');
    return [k, v.join('=') || true];
  }),
);
const log = (...m) => console.log(...m);

/** As cenas onde um boneco pode entrar: só as que ficaram com letra na tela. */
export function cenasParaBoneco(plano) {
  return plano.scenes.filter((c) => {
    if (c.parte === 'demonstracao' || c.parte === 'chamada') return false;
    const t = c.visual?.tipo;
    return !t || t === 'palavras' || t === 'ilustracao';
  });
}

const MOMENTO = {
  gancho: 'o problema a aparecer',
  consequencia: 'o problema a doer',
  virada: 'a descoberta da saída',
  solucao: 'a saída a funcionar',
  fechamento: 'o alívio no fim',
};

export function montarPedido(plano, cenas) {
  const ultimoAto = Math.max(0, ...plano.scenes.map((c) => Number(c.capitulo) || 0));
  const catalogo = BONECOS.map((b) => `  ${b.id} — ${b.significado} (momento: ${MOMENTO[b.estagio]})`).join('\n');
  const lista = cenas.map((c) => {
    const onde = c.parte === 'fecho' ? 'FIM DO VÍDEO'
      : Number(c.capitulo) >= ultimoAto && ultimoAto > 0 ? 'A VIRADA (a saída)'
        : 'O PROBLEMA';
    return `[${c.id}] (${onde}) ${String(c.narration).replace(/\s+/g, ' ').trim()}`;
  }).join('\n\n');
  const alvo = Math.min(TETO_DE_BONECOS, cenas.length);
  return `Você escolhe o BONECO ANIMADO (um personagem de traço branco que faz um gesto) que aparece ao lado de cada trecho de um vídeo de finanças pessoais em português do Brasil.

════════ OS BONECOS QUE EXISTEM, E O QUE CADA UM QUER DIZER ════════
${catalogo}

════════ OS TRECHOS ════════
${lista}

════════ QUANTOS ESCOLHER ════════
Escolha ${alvo} trechos, espalhados pelo vídeo inteiro (não amontoe no começo).

════════ COMO ESCOLHER ════════
1. Leia o trecho e pergunte: **o que esta pessoa está a SENTIR ou a FAZER com o dinheiro, aqui?**
2. Escolha o boneco cujo gesto é ESSE sentimento ou essa ação.
3. ⛔ O momento tem de bater: num trecho de "O PROBLEMA" nunca um boneco de alívio, conquista ou solução; no "FIM DO VÍDEO" nunca um boneco de desespero.
4. ⛔ Nunca o mesmo boneco duas vezes. ⛔ Nunca dois trechos seguidos.
5. 🔴 Se nenhum encaixar de verdade, salte o trecho. Um boneco a fazer o gesto errado contradiz a voz.

Responda APENAS com JSON válido, sem markdown:
{ "escolhas": [ { "cena": "<o número entre colchetes>", "boneco": "<o nome exacto do boneco>" } ] }`;
}

export function lerResposta(bruto) {
  try {
    const texto = String(bruto).replace(/```json|```/g, '').trim();
    const inicio = texto.indexOf('{');
    const fim = texto.lastIndexOf('}');
    if (inicio < 0 || fim < 0) return [];
    const obj = JSON.parse(texto.slice(inicio, fim + 1));
    if (!Array.isArray(obj?.escolhas)) return [];
    const vistos = new Set();
    const saida = [];
    for (const e of obj.escolhas) {
      const boneco = String(e?.boneco || '').trim();
      const cena = String(e?.cena ?? '').trim();
      // ⚠️ nome inventado pelo leitor = fora; o montador também o recusaria, mas assim o
      // registo mostra o que ficou de verdade.
      if (!cena || !BONECO_POR_ID.has(boneco) || vistos.has(boneco)) continue;
      vistos.add(boneco);
      saida.push({ cena, boneco });
    }
    return saida;
  } catch {
    return [];
  }
}

async function principal() {
  const slug = String(args.slug && args.slug !== true ? args.slug : '');
  if (!slug) { log('❌ falta --slug'); process.exit(1); }
  const caminho = join(ROTEIRO_DIR, `${slug}.json`);
  if (!existsSync(caminho)) {
    log(`⚠️ não há guião montado para "${slug}" — corra primeiro o montar-longo.js.`);
    return;
  }
  const plano = JSON.parse(readFileSync(caminho, 'utf-8'));
  const cenas = cenasParaBoneco(plano);
  log(`\n🧍 O ESCOLHEDOR DOS BONECOS — "${plano.tema}"`);
  log(`   ${cenas.length} de ${plano.scenes.length} cenas podem levar boneco.`);
  if (!cenas.length) { log('   nada a fazer.'); return; }

  const pedido = montarPedido(plano, cenas);
  if (args.ensaio) {
    log(`\n(ensaio — não se pediu nada à IA)\n${pedido.slice(0, 1500)}…`);
    return;
  }

  let escolhas = [];
  try {
    const bruto = await generateText(pedido, { maxTokens: 2000, temperature: 0.3, pago: 'leitor', servico: 'longo' });
    escolhas = lerResposta(bruto);
  } catch (err) {
    log(`⚠️ o leitor não respondeu (${err.message}) — o vídeo sai sem bonecos novos.`);
    return;
  }
  if (!escolhas.length) {
    log('⚠️ o leitor não escolheu nenhum boneco — o vídeo sai sem eles.');
    return;
  }

  const catalogo = existsSync(CATALOGO) ? JSON.parse(readFileSync(CATALOGO, 'utf-8')) : { videos: {} };
  catalogo.videos = catalogo.videos || {};
  catalogo.videos[slug] = escolhas;
  mkdirSync(dirname(CATALOGO), { recursive: true });
  writeFileSync(CATALOGO, `${JSON.stringify(catalogo, null, 2)}\n`, 'utf-8');

  log(`\n✅ ${escolhas.length} bonecos escolhidos:`);
  for (const e of escolhas) {
    const c = plano.scenes.find((s) => String(s.id) === String(e.cena));
    log(`   cena ${String(e.cena).padStart(2)} · ${e.boneco.padEnd(20)} "${String(c?.narration || '').slice(0, 52)}…"`);
  }
  log(`\n📒 ${CATALOGO}`);
}

const executadoDireto = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('youtube/bonecos-longo.js');
if (executadoDireto) {
  principal().catch((err) => {
    console.log(`⚠️ o escolhedor dos bonecos falhou (${err.message}) — o vídeo sai sem eles.`);
  });
}
