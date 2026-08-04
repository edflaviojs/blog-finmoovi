/**
 * A CAPA E AS IMAGENS DO VÍDEO LONGO, PELA MANUS (04/08/2026).
 *
 * ═══ O PEDIDO DO DONO ═══
 * *"A thumbnail teria que ser muito mais profissional e elegante… temos que ter mais
 * artifícios para ganharmos mais cliques… algo mais sensacionalista"* e *"até 3 imagens
 * nessa mesma pegada para intercalarmos no vídeo e deixá-lo mais dinâmico"*.
 * Ele mandou o modelo de pedido que já lhe dá bons resultados noutro nicho e disse:
 * *"adapte-o"* — **sem pessoa nenhuma**, no ecossistema do canal, com o antes/depois em
 * vermelho e verde.
 *
 * ═══ O QUE SE APRENDEU ANTES, E ESTÁ AQUI DENTRO ═══
 * Em 04/08 (§37.8) tentámos imagens com um gerador grátis e saiu mal — e a lição medida
 * foi: **o ASSUNTO primeiro, o estilo depois, e o estilo curto.** O modelo divide a
 * atenção pelo pedido todo; um contrato de estilo comprido afoga o que interessa. O
 * pedido do dono é comprido de propósito, mas está ARRUMADO: composição → metades →
 * fundo → letras → selos → proibições. Cada bloco diz uma coisa.
 *
 * ⚠️ **O NÚMERO DO CARTAZ É VERDADEIRO.** O "recorte" não imita jornal nenhum e não
 * inventa notícia: é um cartaz nosso, e o número que traz é a **mediana do rotativo
 * publicada pelo Banco Central** — o mesmo número que o guião já usa, lido do caderno do
 * vídeo, nunca escrito à mão aqui. Um cartaz com um número inventado seria pior do que
 * cartaz nenhum.
 *
 * ⚠️ **NÃO ENTRA NO ROBÔ DIÁRIO.** Corre-se à mão, e conta os créditos gastos.
 *
 * Uso:
 *   node --env-file=.env.local src/scripts/youtube/capa-manus.js --slug=sair-do-vermelho
 *   node --env-file=.env.local src/scripts/youtube/capa-manus.js --slug=... --so=capa
 *   node --env-file=.env.local src/scripts/youtube/capa-manus.js --creditos
 */

import { readFileSync, existsSync, mkdirSync } from 'fs';
import * as fs from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { creditos, pedirAgente, descarregar } from './lib/manus-client.js';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, '..', '..', '..');

const args = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => {
    const [k, ...v] = a.slice(2).split('=');
    return [k, v.join('=') || true];
  }),
);

/** A paleta do canal, do `youtube-render/src/theme.ts`. Escrita aqui porque um pedido em
 *  texto não importa ficheiros — mas se ela mudar lá, muda aqui. */
const PALETA = {
  fundo: '#0d1117',
  painel: '#161b22',
  ciano: '#22d3ee',
  violeta: '#8b5cf6',
  magenta: '#d6219c',
  vermelho: '#ef4444',
  verde: '#22c55e',
};

const REGRAS_FIXAS = `
STRICT RULES — no human figures, no faces, no hands unless explicitly asked for, no brand logos, no watermarks, no signature, no extra text beyond the words specified above, no placeholder or lorem-ipsum text. Every Portuguese word must be spelled EXACTLY as written, with the accents shown. Extreme contrast, punchy, and readable at 300 pixels wide on a phone.

Generate the image and ATTACH the final PNG file to your reply. Do not ask me any questions — if something is ambiguous, choose the boldest option.`;

/** A CAPA. É o pedido do dono, adaptado: sem pessoa, antes/depois, vermelho contra verde. */
function promptDaCapa({ titulo, aMais }) {
  return `An ultra-high-definition 16K resolution cinematic YouTube thumbnail, 16:9 aspect ratio, 1280x720 pixels minimum, designed for maximum click-through rate on mobile.

COMPOSITION — a dramatic BEFORE / AFTER split, divided by a thin diagonal beam of light running from top-right to bottom-left, glowing with a cyan-to-violet-to-magenta gradient (${PALETA.ciano} → ${PALETA.violeta} → ${PALETA.magenta}).

LEFT HALF, THE BEFORE — a chaotic avalanche of unpaid credit-card bills and bank statements tumbling out of a dark void, a heavy jagged red downward arrow smashing through them, cracked glass shards, angry crimson (${PALETA.vermelho}) neon rim-light, deep black shadows, a red alarm glow bleeding into the background.

RIGHT HALF, THE AFTER — the same bills, now a single clean stack on a calm reflective surface, a bright emerald green (${PALETA.verde}) upward arrow rising out of it like a new shoot, soft green neon rim-light, orderly, a sense of relief and open air.

BACKGROUND — near-black (${PALETA.fundo}) with subtle darker panels (${PALETA.painel}), a fine dot-grid texture, cinematic depth of field.

TYPOGRAPHY — bold, heavy, minimalist condensed sans-serif, ALL CAPS, across the upper third, pure white with a thin red-to-green gradient underline, reading exactly: "${titulo}"

BADGES — a small burning red badge on the left half reading exactly "R$ ${aMais} A MAIS"; a small glowing green badge on the right half reading exactly "3 PASSOS".
${REGRAS_FIXAS}`;
}

/** AS IMAGENS DO MEIO DO VÍDEO — as três que o dono aprovou, cada uma presa a uma cena. */
function promptsDasImagens({ rotativoAoMes }) {
  const juro = String(rotativoAoMes).replace('.', ',');
  return [
    {
      ficheiro: 'imagem-1-o-susto',
      onde: 'a cena do susto — "abriu a fatura e o estômago gelou"',
      prompt: `A cinematic photorealistic close-up, 16:9 aspect ratio, 1920x1080 pixels. A pair of hands holding an open paper bill in a dark room. The only light is the cold blue-white glow of a phone screen from below, throwing hard shadows upward across the paper. Background near-black (${PALETA.fundo}), a soft violet (${PALETA.violeta}) rim-light on the edges. Shallow depth of field, fine film grain, heavy atmosphere of dread. Hands only — no face, no person visible above the wrists.

🔴 CRITICAL — THE PAPER MUST CARRY NO READABLE TEXT AND NO NUMBERS AT ALL. Render the printing as soft grey blur: the RHYTHM of rows and columns is visible, but not a single legible word, digit, date or currency symbol anywhere on the sheet. No dollar signs, no "$", no English words, no headings. If any character would be readable, blur it out. One horizontal band near the middle glows faint red, and that band is also blurred.
${REGRAS_FIXAS}`,
    },
    {
      ficheiro: 'imagem-2-o-numero',
      onde: 'a cena em que se diz quanto se paga a mais',
      prompt: `A stylised editorial poster, 16:9 aspect ratio, 1920x1080 pixels, in the visual language of a modern explainer channel. IMPORTANT — this is an original poster, NOT a reproduction of any real newspaper: no masthead, no publication name, no dateline, no columns of fake news copy.

A torn-paper panel in warm off-white sits at an angle on a near-black (${PALETA.fundo}) background, with a thin cyan-to-magenta gradient bar (${PALETA.ciano} → ${PALETA.magenta}) across its top edge. On the panel, in huge heavy black condensed type, reading exactly: "${juro}% AO MÊS". Directly beneath, in smaller black type, reading exactly: "juro do rotativo do cartão". At the bottom edge of the panel, in small grey type, reading exactly: "Fonte: Banco Central do Brasil". A rough red ink circle drawn by hand around the big number, and a red underline beneath it.
${REGRAS_FIXAS}`,
    },
    {
      ficheiro: 'imagem-3-a-virada',
      onde: 'o fecho — a promessa de que dá para sair',
      prompt: `A cinematic wide shot, 16:9 aspect ratio, 1920x1080 pixels, seen from inside a narrow dark corridor lit in deep crimson red (${PALETA.vermelho}), opening onto a wide bright space lit in cool cyan (${PALETA.ciano}) and violet (${PALETA.violeta}). Silhouetted stacks of paper, boxes and folders crowd the red corridor walls; the bright side beyond the opening is empty, clean and airy. Strong volumetric light beams cutting through dust, near-black (${PALETA.fundo}) surfaces, extreme contrast between the two halves. Architectural, symbolic, no people.
${REGRAS_FIXAS}`,
    },
  ];
}

async function main() {
  if (args.creditos) {
    const c = await creditos();
    console.log(`\n💳 créditos: ${c.total} ao todo · ${c.restaHoje} ainda por gastar hoje (de ${c.porDia}/dia) · ${c.livres} de saldo próprio`);
    console.log(`   a 52 créditos por imagem, dá para mais ${Math.floor(c.total / 52)} imagem(ns)\n`);
    return;
  }

  const slug = String(args.slug && args.slug !== true ? args.slug : 'sair-do-vermelho');
  const so = args.so && args.so !== true ? String(args.so) : null; // 'capa' | 'imagens'

  const caminhoRoteiro = join(RAIZ, 'youtube-render', 'public', 'roteiro', `${slug}.json`);
  const caminhoCaderno = join(RAIZ, 'src', 'scripts', 'youtube', 'output', `${slug}.caderno.json`);
  if (!existsSync(caminhoRoteiro)) throw new Error(`não há guião montado para "${slug}"`);
  const roteiro = JSON.parse(readFileSync(caminhoRoteiro, 'utf-8'));

  // ⚠️ Os números vêm do caderno do vídeo, NUNCA escritos à mão aqui. Se o caderno não
  // existir, o cartaz do número não se faz — em vez de sair com um número inventado.
  const caderno = existsSync(caminhoCaderno) ? JSON.parse(readFileSync(caminhoCaderno, 'utf-8')) : null;
  const ficha = caderno?.mapa?.fichaDeDivida || caderno?.fichaDeDivida
    || JSON.parse(JSON.stringify(caderno || {}))?.mapa?.fichaDeDivida || null;

  const destino = join(RAIZ, 'youtube-render', 'public', 'manus', slug);
  mkdirSync(destino, { recursive: true });

  const antes = await creditos();
  console.log(`\n🎨 MANUS — "${roteiro.tema}"`);
  console.log(`   créditos antes: ${antes.livres} livres de ${antes.total}\n`);

  const trabalhos = [];
  if (so !== 'imagens') {
    const titulo = 'SAIR DO VERMELHO';
    const aMais = ficha?.aMais;
    if (!aMais) throw new Error('não encontrei o valor "a mais" no caderno — não invento números na capa');
    trabalhos.push({ ficheiro: 'capa', onde: 'a miniatura do YouTube', prompt: promptDaCapa({ titulo, aMais }) });
  }
  if (so !== 'capa') {
    const juro = ficha?.taxas?.rotativoAoMes;
    for (const im of promptsDasImagens({ rotativoAoMes: juro })) {
      if (im.ficheiro === 'imagem-2-o-numero' && !juro) {
        console.log('   ⏭️  o cartaz do número fica de fora: não há a taxa do Banco Central no caderno');
        continue;
      }
      trabalhos.push(im);
    }
  }

  // ⚠️ Refazer UMA imagem sem pagar as outras outra vez. Cada pedido custa ~48 créditos
  // dos 300 que a conta grátis renova por dia — refazer as quatro por causa de uma seria
  // metade do orçamento do dia deitado fora.
  const apenas = args.apenas && args.apenas !== true ? String(args.apenas) : null;
  const fila = apenas ? trabalhos.filter((t) => t.ficheiro.includes(apenas)) : trabalhos;
  if (apenas && !fila.length) throw new Error(`"--apenas=${apenas}" não bate com nenhum pedido`);

  for (const t of fila) {
    console.log(`🖼️  ${t.ficheiro} — ${t.onde}`);
    try {
      const r = await pedirAgente(t.prompt, {
        titulo: `FinMoovi · ${slug} · ${t.ficheiro}`,
        aoAndar: (m) => console.log(`      ${m}`),
      });
      const imagens = r.anexos.filter((a) => a.type === 'image' || /^image\//.test(a.content_type || ''));
      if (!imagens.length) {
        console.log(`      ❌ voltou sem imagem. O agente disse: ${String(r.texto).slice(0, 160)}`);
        continue;
      }
      for (const [i, im] of imagens.entries()) {
        const ext = (im.filename || '').split('.').pop() || 'png';
        const nome = imagens.length > 1 ? `${t.ficheiro}-${i + 1}.${ext}` : `${t.ficheiro}.${ext}`;
        const bytes = await descarregar(im.url, join(destino, nome), fs);
        console.log(`      ✅ ${nome} (${Math.round(bytes / 1024)} KB)`);
      }
    } catch (err) {
      console.log(`      ❌ ${err.message.split('\n')[0]}`);
    }
  }

  const depois = await creditos();
  console.log(`\n💳 créditos depois: ${depois.livres} livres — gastou ${antes.livres - depois.livres}`);
  console.log(`📁 ${destino}\n`);
}

main().catch((err) => { console.error(`\n❌ ${err.message}\n`); process.exit(1); });
