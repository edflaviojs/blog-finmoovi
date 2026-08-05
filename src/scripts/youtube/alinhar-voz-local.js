/**
 * MEDE A VOZ E CORRIGE OS TEMPOS DAS PALAVRAS — local, de graça (04/08/2026).
 *
 * ═══ O DEFEITO QUE ISTO CONSERTA ═══
 * O dono viu o vídeo longo: *"quando tem as cenas com as palavras grandes na tela
 * precisa corrigir a sincronização. Está desincronizado. Aqui por exemplo mostra
 * destacado o dinheiro mas ele já está falando: saindo da conta."*
 * Medido no ficheiro de tempos: "dinheiro" marcado aos 6,13s e "saindo" aos 7,00s —
 * a letra estava **0,87 segundos atrasada** em relação à voz, e o erro cresce ao
 * longo da cena porque nasce de uma estimativa que ignora as respirações.
 *
 * ═══ COMO FUNCIONA, E O QUE ELE NÃO TOCA ═══
 * 1. lê o `timing.json` que o TTS já escreveu;
 * 2. manda os MP3 ao `faster-whisper` LOCAL (`scripts/transcrever-local.py`);
 * 3. **reaproveita o `alignWords` do `tts-short.js`** — a mesma função que o robô
 *    diário usa quando tem a chave do Whisper. Importar não é tocar: o ficheiro do
 *    robô não muda uma linha, e assim não há duas maneiras de alinhar que possam
 *    divergir com o tempo;
 * 4. reescreve o `timing.json` e guarda uma cópia do antigo ao lado.
 *
 * ⚠️ **LIGAR ISTO AO ROBÔ DIÁRIO É DECISÃO DO DONO.** Hoje o Short alinha com a chave
 * paga do Together quando corre na nuvem, e com a estimativa quando corre aqui. Passar
 * o robô a usar o medidor local mata a dependência da chave e conserta a sincronia do
 * vídeo curto também — mas mexe no ficheiro que publica todos os dias ao meio-dia.
 *
 * Uso: node src/scripts/youtube/alinhar-voz-local.js --slug=sair-do-vermelho
 */

import { readFileSync, writeFileSync, existsSync, copyFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';
import { alignWords } from './tts-short.js';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, '..', '..', '..');

const args = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => {
    const [k, ...v] = a.slice(2).split('=');
    return [k, v.join('=') || true];
  }),
);

/**
 * ONDE ESTÁ O PYTHON. O `winget` instalou-o em `%LOCALAPPDATA%\Programs\Python`, e o
 * `python` do PATH nesta máquina é o atalho da Microsoft Store, que não serve.
 * ⚠️ Por isso procura-se primeiro o caminho real e só depois se confia no PATH — numa
 * máquina onde o PATH esteja bem, o segundo funciona e o primeiro nem existe.
 */
function acharPython() {
  const local = process.env.LOCALAPPDATA;
  if (local) {
    const base = join(local, 'Programs', 'Python');
    if (existsSync(base)) {
      const versoes = readdirSync(base).filter((d) => /^Python3\d+$/.test(d)).sort().reverse();
      for (const v of versoes) {
        const exe = join(base, v, 'python.exe');
        if (existsSync(exe)) return exe;
      }
    }
  }
  return process.env.PYTHON || 'python3';
}

const slug = String(args.slug && args.slug !== true ? args.slug : 'sair-do-vermelho');
const pastaAudio = join(RAIZ, 'youtube-render', 'public', 'audio', slug);
const caminhoTiming = join(pastaAudio, 'timing.json');

if (!existsSync(caminhoTiming)) {
  console.log(`\n❌ Não há voz gerada para "${slug}".`);
  console.log(`   Corra primeiro: node --env-file=.env.local src/scripts/youtube/tts-short.js --slug=${slug}\n`);
  process.exit(1);
}

const timing = JSON.parse(readFileSync(caminhoTiming, 'utf-8'));
const script = JSON.parse(readFileSync(join(AQUI, 'output', `${slug}.script.json`), 'utf-8'));
const narracaoDe = new Map(script.scenes.map((s) => [String(s.id), s.narration]));

const ficheiros = timing.scenes
  .map((s) => s.audioFile && join(RAIZ, 'youtube-render', 'public', s.audioFile))
  .filter((f) => f && existsSync(f));

console.log(`\n🎧 A MEDIR A VOZ — "${slug}"`);
console.log(`   ${ficheiros.length} ficheiros de áudio · faster-whisper local, sem chave e sem rede\n`);

const python = acharPython();
let bruto;
try {
  bruto = execFileSync(python, [join(RAIZ, 'scripts', 'transcrever-local.py'), ...ficheiros], {
    encoding: 'utf-8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'inherit'],
  });
} catch (err) {
  console.log(`\n❌ o medidor de voz falhou (${python}).`);
  console.log('   Confirme que o faster-whisper está instalado:');
  console.log(`   "${python}" -m pip install faster-whisper\n`);
  process.exit(1);
}

const porFicheiro = JSON.parse(bruto);

/**
 * ⚠️ A COMPARAÇÃO É POR CENA E CONTA-SE O DESLOCAMENTO, porque é ele que diz se valeu
 * a pena. Sem este número não se sabe se a medição melhorou ou piorou — e "parece
 * melhor" não é medida nesta casa.
 */
let corrigidas = 0;
let somaDesvio = 0;
let piorDesvio = 0;
let piorCena = null;

for (const cena of timing.scenes) {
  const nome = String(cena.audioFile || '').split('/').pop();
  const medidas = porFicheiro[nome];
  const narracao = narracaoDe.get(String(cena.id)) || '';
  if (!medidas || !medidas.length || !narracao) {
    console.log(`   ⚠️ cena ${cena.id}: sem medição — fica como estava`);
    continue;
  }

  const antes = cena.words || [];
  const depois = alignWords(narracao, medidas, cena.durationSec);

  // o desvio de cada palavra entre o que se estimava e o que se mediu
  let maiorNestaCena = 0;
  for (let i = 0; i < Math.min(antes.length, depois.length); i++) {
    const d = Math.abs((antes[i]?.start ?? 0) - (depois[i]?.start ?? 0));
    somaDesvio += d;
    if (d > maiorNestaCena) maiorNestaCena = d;
  }
  if (maiorNestaCena > piorDesvio) { piorDesvio = maiorNestaCena; piorCena = cena.id; }

  cena.words = depois;
  cena.alinhamento = 'faster-whisper local';
  corrigidas += 1;
  console.log(`   ✓ cena ${String(cena.id).padStart(2)} — ${depois.length} palavras · maior acerto ${maiorNestaCena.toFixed(2)}s`);
}

const total = timing.scenes.reduce((a, c) => a + (c.words?.length || 0), 0);

copyFileSync(caminhoTiming, join(pastaAudio, 'timing.estimado.json'));
writeFileSync(caminhoTiming, JSON.stringify(timing, null, 2), 'utf-8');

console.log(`\n${'═'.repeat(64)}`);
console.log(`  ${corrigidas} de ${timing.scenes.length} cenas medidas · ${total} palavras`);
console.log(`  acerto médio por palavra: ${(somaDesvio / Math.max(1, total)).toFixed(2)}s`);
console.log(`  maior acerto: ${piorDesvio.toFixed(2)}s (cena ${piorCena})`);
console.log(`${'═'.repeat(64)}`);
console.log(`\n💾 ${caminhoTiming}`);
console.log(`📄 a estimativa antiga ficou guardada em timing.estimado.json\n`);
