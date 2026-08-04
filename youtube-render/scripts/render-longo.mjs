/**
 * RENDER DO VÍDEO LONGO — POR PARTES, e depois coladas (04/08/2026).
 *
 * ═══ POR QUE POR PARTES, E NÃO DE UMA VEZ ═══
 * É a lição das âncoras (§26.3 L1) aplicada à montagem. Um vídeo de seis minutos são
 * ~11 mil fotogramas; se o render morrer aos 80% — falta de memória, um Chrome que
 * fecha, a máquina que hiberna — perde-se tudo e volta-se ao princípio. Renderizando
 * por partes, **um erro no minuto cinco não custa os minutos um a quatro**.
 * E há um segundo ganho, que é o que faz isto valer a pena todos os dias: as partes
 * já feitas ficam no disco, então voltar a correr o comando só renderiza o que falta.
 *
 * ═══ ONDE SE CORTA ═══
 * Nos limites dos CAPÍTULOS, não em pedaços iguais. Assim, quando uma parte falha,
 * o que se perde é uma unidade que faz sentido — e é fácil ver no vídeo qual é.
 *
 * ⚠️ O ÁUDIO. Cada parte é renderizada com o seu áudio e as partes são coladas com o
 * `concat` do ffmpeg SEM recodificar (`-c copy`): é instantâneo e não perde qualidade.
 * Para o `concat` funcionar, todas as partes têm de sair do MESMO render, com o mesmo
 * formato — e saem, porque é o mesmo comando com intervalos diferentes.
 *
 * Uso:
 *   node scripts/render-longo.mjs --slug=sair-do-vermelho
 *   node scripts/render-longo.mjs --slug=... --recomecar   (deita fora as partes feitas)
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, '..');
const OUT = join(RAIZ, 'out', 'longo');

const args = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => {
    const [k, ...v] = a.slice(2).split('=');
    return [k, v.join('=') || true];
  }),
);

const FPS = 30;
// ⚠️ ESPELHADOS de src/Long.tsx. Ver o aviso lá: mudar num sítio sem mudar no outro
// faz os cortes caírem no sítio errado.
const VOZ_ENTRA_FRAMES = 27;
const RESPIRO_SEC = 0.35;
const SIGNATURE_FRAMES = 75;
// ⚠️ 04/08/2026: o cartão de capítulo passou a ter CENA PRÓPRIA (o dono: *"ficou muito
// congestionado, não dá tempo de ler nada"*). Ele ocupa estes fotogramas ANTES da cena
// que abre o capítulo — e é por isso que este número tem de estar aqui também, senão os
// cortes por capítulo caem 2,6 segundos ao lado.
const CARTAO_CAPITULO_FRAMES = 78;

const slug = String(args.slug && args.slug !== true ? args.slug : 'sair-do-vermelho');
const plano = JSON.parse(readFileSync(join(RAIZ, 'public', 'roteiro', `${slug}.json`), 'utf-8'));
const caminhoTiming = join(RAIZ, 'public', 'audio', slug, 'timing.json');
const timing = existsSync(caminhoTiming) ? JSON.parse(readFileSync(caminhoTiming, 'utf-8')) : null;

if (!timing) {
  console.log('⚠️ Não há voz gerada (timing.json). O vídeo sairia sem áudio.');
  console.log(`   Corra primeiro: node --env-file=.env.local src/scripts/youtube/tts-short.js --slug=${slug}`);
  process.exit(1);
}

// ── as contas, iguais às de Long.tsx ────────────────────────────────────────
const medido = (id) => timing.scenes.find((s) => String(s.id) === String(id))?.durationSec;
const duracoes = plano.scenes.map((c, i) => {
  const falada = medido(c.id) || c.durationSec;
  return i < plano.scenes.length - 1 ? falada + RESPIRO_SEC : falada;
});
const frames = duracoes.map((d) => Math.max(1, Math.round(d * FPS)));
// ⚠️ A MESMA CONTA DO `linhaDoTempo` em src/Long.tsx: o cartão de capítulo ocupa lugar
// próprio na linha do tempo, antes da cena que abre o capítulo.
const inicios = [];
const cartoes = [];
{
  let acc = 0;
  plano.scenes.forEach((c, i) => {
    const temCartao = Boolean(c.abreCapitulo && c.capitulo);
    cartoes.push(temCartao ? acc : -1);
    if (temCartao) acc += CARTAO_CAPITULO_FRAMES;
    inicios.push(acc);
    acc += frames[i];
  });
}
const conteudo = inicios.length ? inicios[inicios.length - 1] + frames[frames.length - 1] : 0;
const total = VOZ_ENTRA_FRAMES + conteudo + SIGNATURE_FRAMES;

// ── os cortes: nos limites de capítulo, que agora começam no CARTÃO ──────────
const cortes = [0];
plano.scenes.forEach((c, i) => {
  if (cartoes[i] >= 0) cortes.push(VOZ_ENTRA_FRAMES + cartoes[i]);
});
cortes.push(total);
const partes = [];
for (let i = 0; i < cortes.length - 1; i++) {
  if (cortes[i + 1] - cortes[i] < 2) continue; // corte degenerado: ignora
  partes.push({ n: i + 1, de: cortes[i], ate: cortes[i + 1] - 1 });
}

console.log(`\n🎬 RENDER DO VÍDEO LONGO — "${plano.tema}"`);
console.log(`   ${total} fotogramas ≈ ${Math.floor(total / FPS / 60)}min${String(Math.round((total / FPS) % 60)).padStart(2, '0')}`);
console.log(`   ${partes.length} partes, cortadas nos limites de capítulo:\n`);
for (const p of partes) {
  const seg = (f) => `${String(Math.floor(f / FPS / 60)).padStart(2, '0')}:${String(Math.floor((f / FPS) % 60)).padStart(2, '0')}`;
  console.log(`   parte ${p.n}: fotogramas ${p.de}–${p.ate}  (${seg(p.de)} → ${seg(p.ate)})`);
}
console.log('');

if (args.recomecar && existsSync(OUT)) {
  rmSync(OUT, { recursive: true, force: true });
  console.log('🧹 partes anteriores apagadas (--recomecar)\n');
}
mkdirSync(OUT, { recursive: true });

/**
 * ⚠️ O CAMINHO DOS PARÂMETROS TEM DE SER RELATIVO, e isto custou um render inteiro.
 * A pasta deste projeto é `C:\Users\Ed Flávio\…` — tem um ESPAÇO no nome. Passado
 * como caminho absoluto para um comando lançado através da consola, o espaço parte o
 * argumento em dois e o Remotion recebe "C:\Users\Ed" e recusa. Relativo à pasta do
 * render, não há espaço nenhum pelo caminho.
 */
const propsFile = 'out/longo/props.json';
writeFileSync(join(OUT, 'props.json'), JSON.stringify({ slug }), 'utf-8');

const feitas = [];
for (const p of partes) {
  // ⚠️ Relativo pela mesma razão do ficheiro de parâmetros: o caminho absoluto tem um
  // espaço ("Ed Flávio") e parte-se em dois ao ser lançado pela consola.
  const relativo = `out/longo/parte-${String(p.n).padStart(2, '0')}.mp4`;
  const destino = join(OUT, `parte-${String(p.n).padStart(2, '0')}.mp4`);
  if (existsSync(destino)) {
    console.log(`♻️  parte ${p.n} já existe — não se paga duas vezes pelo mesmo render`);
    feitas.push(destino);
    continue;
  }
  console.log(`🎞️  parte ${p.n}/${partes.length} — fotogramas ${p.de}–${p.ate}…`);
  try {
    execFileSync('npx', [
      'remotion', 'render', 'src/index.ts', 'Long', relativo,
      `--frames=${p.de}-${p.ate}`,
      `--props=${propsFile}`,
      '--concurrency=2',
      '--log=error',
    ], { cwd: RAIZ, stdio: 'inherit', shell: true });
  } catch (err) {
    console.log(`\n❌ a parte ${p.n} falhou. As partes anteriores ficaram guardadas —`);
    console.log('   volte a correr o mesmo comando e ele continua daqui.\n');
    process.exit(1);
  }
  feitas.push(destino);
}

// ── colar ───────────────────────────────────────────────────────────────────
const lista = join(OUT, 'partes.txt');
writeFileSync(lista, feitas.map((f) => `file '${f.replace(/\\/g, '/')}'`).join('\n'), 'utf-8');
const final = join(OUT, `${slug}.mp4`);
console.log('\n🔗 a colar as partes…');
execFileSync('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', lista, '-c', 'copy', final], { stdio: 'inherit' });

// ⚠️ CONFERIR O RESULTADO, nunca o código de saída. É regra desta casa.
const dur = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', final], { encoding: 'utf-8' }).trim();
const esperado = total / FPS;
console.log(`\n✅ ${final}`);
console.log(`   duração medida: ${Number(dur).toFixed(1)}s · esperada: ${esperado.toFixed(1)}s`);
if (Math.abs(Number(dur) - esperado) > 2) {
  console.log('   ⚠️ a diferença passa dos 2 segundos — alguma parte pode ter ficado curta. Confira antes de usar.');
}
