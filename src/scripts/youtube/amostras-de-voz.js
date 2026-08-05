/**
 * AMOSTRAS DE VOZ — a mesma cena, lida por vozes diferentes, para o dono escolher de ouvido.
 *
 * ═══ POR QUE ISTO EXISTE ═══
 * Em 04/08/2026 escrevi uma camada inteira de intenção para a voz (as pausas, o ritmo por
 * frase), medi tudo o que sabia medir — as pausas exatas, o texto falado palavra a palavra,
 * nenhuma marca lida em voz alta — e entreguei confiante. **O dono ouviu e disse que tinha
 * ficado PIOR.** O que estragou o resultado foi a única coisa que eu não estava a medir: o
 * ARCO da entoação. Um motor de voz planeia a melodia sobre todo o texto que recebe; frase
 * a frase, cada frase ganha a sua própria descida final, e um texto em que todas as frases
 * acabam a cair é exatamente o som que o ouvido reconhece como máquina.
 *
 * A lição, e é a razão deste ficheiro: **a voz é GOSTO, e gosto não se mede com código.**
 * Antes de trocar a forma de falar do canal, gera-se o mesmo texto de várias maneiras e
 * ouve-se lado a lado. Custa cinco minutos e zero euros.
 *
 * ⚠️ Este script NÃO toca em nada da produção. Escreve mp3 numa pasta e mais nada.
 *
 * Uso:
 *   node src/scripts/youtube/amostras-de-voz.js
 *   node src/scripts/youtube/amostras-de-voz.js --destino="C:/.../AMOSTRAS" --slug=sair-do-vermelho
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, mkdtempSync, rmSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { tmpdir } from 'os';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { synthesizeSpeech } from './lib/tts-client.js';
import { planoDeLeitura } from './lib/prosodia.js';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, '..', '..', '..');

const args = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => {
    const [k, ...v] = a.slice(2).split('=');
    return [k, v.join('=') || true];
  }),
);

/**
 * AS CANDIDATAS. O ponto de leitura gratuito do Edge só tem **três** vozes pt-BR — está
 * medido, são 322 vozes ao todo e só estas três dizem `pt-BR`. As multilingues de outras
 * localidades também falam português, e são da geração nova (mais natural), mas podem
 * trazer sotaque — por isso entram na prova identificadas como tal, para o ouvido do dono
 * decidir. É a mesma regra de sempre: a verdade mede-se com código, o gosto ouve-se.
 */
const CANDIDATAS = [
  { ficheiro: '1-VOZ-DE-HOJE-homem', voz: 'pt-BR-AntonioNeural', nota: 'a voz atual do canal (referência)' },
  { ficheiro: '2-Thalita-mulher', voz: 'pt-BR-ThalitaMultilingualNeural', nota: 'pt-BR, geração nova' },
  { ficheiro: '3-Francisca-mulher', voz: 'pt-BR-FranciscaNeural', nota: 'pt-BR, geração antiga' },
  { ficheiro: '4-Andrew-homem-pode-ter-sotaque', voz: 'en-US-AndrewMultilingualNeural', nota: 'geração nova, não é pt-BR de origem' },
  { ficheiro: '5-Florian-homem-pode-ter-sotaque', voz: 'de-DE-FlorianMultilingualNeural', nota: 'geração nova, não é pt-BR de origem' },
];

/** Quais as cenas do guião que servem de amostra: uma de abertura e uma com soco curto. */
const CENAS_DA_AMOSTRA = [1, 4];

const dorme = (ms) => new Promise((r) => setTimeout(r, ms));

/** A mesma apara de pontas do `tts-short.js` — sem ela a pausa colada sai 4× maior. */
function apararSilencio(origem, destino) {
  const trim = 'silenceremove=start_periods=1:start_duration=0.04:start_threshold=-45dB:detection=peak';
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', origem, '-af', `${trim},areverse,${trim},areverse`,
    '-c:a', 'libmp3lame', '-b:a', '48k', '-ar', '24000', '-ac', '1', destino], { stdio: 'ignore' });
}

function silencioMp3(ms, destino) {
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'anullsrc=r=24000:cl=mono',
    '-t', String(Math.max(0.02, ms / 1000)), '-c:a', 'libmp3lame', '-b:a', '48k', '-ar', '24000', '-ac', '1',
    destino], { stdio: 'ignore' });
}

function colar(lista, destino) {
  const pasta = dirname(destino);
  const alinhavo = join(pasta, 'lista.txt');
  writeFileSync(alinhavo, lista.map((f) => `file '${f.replace(/\\/g, '/')}'`).join('\n'), 'utf-8');
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', alinhavo,
    '-c:a', 'libmp3lame', '-b:a', '48k', '-ar', '24000', '-ac', '1', destino], { stdio: 'ignore' });
}

/** O texto inteiro num pedido só — é assim que o motor consegue planear o arco da melodia. */
async function textoInteiro(texto, voz) {
  const r = await synthesizeSpeech(texto, { providerName: 'edge', voices: { edge: { name: voz } } });
  return r.audio;
}

/** Frase a frase, com o ritmo de cada uma e silêncio real colado — a camada da §39. */
async function fraseAFrase(texto, voz, pasta) {
  const plano = planoDeLeitura(texto);
  const lista = [];
  for (const [i, p] of plano.entries()) {
    const r = await synthesizeSpeech(p.texto, {
      providerName: 'edge',
      voices: { edge: { name: voz } },
      prosody: { rate: p.rate, pitch: p.pitch },
    });
    const bruto = join(pasta, `b${i}.mp3`);
    const limpo = join(pasta, `p${i}.mp3`);
    writeFileSync(bruto, r.audio);
    apararSilencio(bruto, limpo);
    lista.push(limpo);
    if (p.pausaMs > 0) {
      const s = join(pasta, `s${i}.mp3`);
      silencioMp3(p.pausaMs, s);
      lista.push(s);
    }
    if (i < plano.length - 1) await dorme(450);
  }
  const saida = join(pasta, 'junto.mp3');
  colar(lista, saida);
  return readFileSync(saida);
}

const duracao = (f) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
  '-of', 'default=nw=1:nk=1', f], { encoding: 'utf-8' }).trim());

async function main() {
  const slug = String(args.slug && args.slug !== true ? args.slug : 'sair-do-vermelho');
  const destino = String(args.destino && args.destino !== true
    ? args.destino
    : join(RAIZ, 'youtube-render', 'out', 'amostras-de-voz'));

  const caminho = join(RAIZ, 'youtube-render', 'public', 'roteiro', `${slug}.json`);
  if (!existsSync(caminho)) {
    console.log(`❌ não encontrei o guião ${caminho}`);
    process.exit(1);
  }
  const plano = JSON.parse(readFileSync(caminho, 'utf-8'));
  const texto = CENAS_DA_AMOSTRA
    .map((id) => plano.scenes.find((s) => String(s.id) === String(id))?.narration)
    .filter(Boolean).join(' ');

  mkdirSync(destino, { recursive: true });
  console.log(`\n🎙️  AMOSTRAS DE VOZ — "${plano.tema}"`);
  console.log(`   texto: ${texto.split(/\s+/).length} palavras`);
  console.log(`   destino: ${destino}\n`);

  const pasta = mkdtempSync(join(tmpdir(), 'fm-amostras-'));
  const feitas = [];
  try {
    for (const c of CANDIDATAS) {
      const saida = join(destino, `${c.ficheiro}.mp3`);
      try {
        const audio = await textoInteiro(texto, c.voz);
        writeFileSync(saida, audio);
        console.log(`   ✅ ${c.ficheiro}  (${duracao(saida).toFixed(1)}s) — ${c.nota}`);
        feitas.push({ ...c, saida });
      } catch (err) {
        console.log(`   ❌ ${c.ficheiro} — ${err.message.split('\n')[0]}`);
      }
      await dorme(800);
    }

    // A prova que faltava em 04/08: a MESMA voz, do jeito de hoje e frase a frase.
    const parVoz = String(args.par && args.par !== true ? args.par : 'pt-BR-ThalitaMultilingualNeural');
    const nomeCurto = parVoz.split('-')[2]?.replace(/Multilingual|Neural/g, '') || parVoz;
    try {
      const audio = await fraseAFrase(texto, parVoz, pasta);
      const saida = join(destino, `6-${nomeCurto}-FRASE-A-FRASE.mp3`);
      writeFileSync(saida, audio);
      console.log(`   ✅ 6-${nomeCurto}-FRASE-A-FRASE  (${duracao(saida).toFixed(1)}s) — a comparar com a amostra da mesma voz`);
    } catch (err) {
      console.log(`   ❌ frase a frase — ${err.message.split('\n')[0]}`);
    }
  } finally {
    try { rmSync(pasta, { recursive: true, force: true }); } catch { /* pasta temporária fica */ }
  }

  console.log(`\n✅ ${feitas.length} amostras em ${destino}\n`);
}

main().catch((err) => { console.error(err); process.exit(1); });
