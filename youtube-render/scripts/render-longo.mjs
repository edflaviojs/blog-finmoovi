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

import { readFileSync, existsSync, mkdirSync, writeFileSync, rmSync, readdirSync } from 'fs';
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
/**
 * ⚠️ ESPELHADO de `TELA_FINAL_FRAMES` em `src/longo/telas.tsx` — os 10 segundos da TELA
 * FINAL (§61), onde o YouTube deixa pôr os cartões clicáveis. Este ficheiro conta os
 * fotogramas UM A UM para conferir o vídeo colado; se este número não bater com o do
 * render, ele acusa a diferença — mas só depois de 36 minutos de máquina.
 */
const TELA_FINAL_FRAMES = 300;
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
const total = VOZ_ENTRA_FRAMES + conteudo + SIGNATURE_FRAMES + TELA_FINAL_FRAMES;

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

/**
 * ⚠️ 🔴 `rmSync` NÃO APAGA NADA NESTA MÁQUINA, E ISSO QUASE ENTREGOU O VÍDEO ERRADO.
 *
 * O caminho do projeto tem um acento — `C:\Users\Ed Flávio\…` — e nesta máquina o apagar
 * do Node falha em silêncio nesses caminhos. Resultado, visto no registo com estes olhos:
 * a linha *"partes anteriores apagadas"* aparecia **e a seguir aparecia "parte 1 já
 * existe"**. Com a voz acabada de refazer, o vídeo teria saído com a voz VELHA — a que o
 * dono reprovou — e nada se queixaria.
 *
 * Portanto: apaga-se ficheiro a ficheiro, e **confere-se que desapareceram**. Se algum
 * ficar, o script PÁRA, porque continuar seria entregar o vídeo de ontem com a cara do
 * de hoje. É a regra da casa: conferir o RESULTADO, nunca o código de saída.
 */
if (args.recomecar && existsSync(OUT)) {
  for (const f of readdirSync(OUT)) {
    try { rmSync(join(OUT, f), { recursive: true, force: true }); } catch { /* confere-se abaixo */ }
  }
  const sobrou = existsSync(OUT) ? readdirSync(OUT) : [];
  if (sobrou.length) {
    console.log(`\n❌ o --recomecar não conseguiu apagar ${sobrou.length} ficheiro(s) em ${OUT}:`);
    for (const f of sobrou.slice(0, 6)) console.log(`   · ${f}`);
    console.log('   Apague a pasta à mão e volte a correr. (Continuar aqui daria um vídeo com o som antigo.)\n');
    process.exit(1);
  }
  console.log('🧹 partes anteriores apagadas (--recomecar) — e conferido que a pasta ficou vazia\n');
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

/**
 * ═══ 🔴 O SOM É FEITO DE UMA VEZ SÓ, E A IMAGEM É QUE VEM EM PEDAÇOS (04/08/2026) ═══
 *
 * O dono, três vezes, sobre o mesmo ponto: *"a música corta rapidamente pra iniciar a
 * próxima tela… acontece exatamente aos 32 segundos, e isso se repete sempre que inicia
 * uma tela de passo 2, 3"*.
 *
 * 🔴 **O DEFEITO NÃO ESTAVA NA MÚSICA. ESTAVA AQUI, NA COLAGEM.**
 *
 * Cada parte sai deste script como um MP4 com o seu próprio som codificado à parte. E um
 * codificador de som **AAC não começa a tocar no instante zero**: ele põe à frente do
 * ficheiro **2048 amostras de atraso** (o *encoder delay*), que a 48 kHz são exatamente
 * **42,67 milissegundos**. Quem lê o ficheiro deveria descontá-las — e aqui não são
 * descontadas. Colando as partes com `-c copy`, esse atraso entra no meio do vídeo, e
 * entra **exatamente no fotograma em que começa a tela do capítulo**, porque é aí que se
 * corta.
 *
 * MEDIDO no vídeo que ele ouviu, à amostra:
 *
 * | emenda | buraco de silêncio ABSOLUTO |
 * |---|---|
 * | Passo 1 (32,5s) | **45,6 ms** |
 * | Passo 2 (102,5s) | **47,7 ms** |
 * | Passo 3 (195,0s) | **58,4 ms** |
 *
 * E a prova que fecha o caso: o **mesmo trecho** renderizado sem cortar em partes **não
 * tem buraco nenhum**. No vídeo anterior (o que ele preferia) estão lá os mesmos três
 * buracos, um por capítulo, e mais nenhum em seis minutos.
 *
 * > Foi por isto que três tentativas de consertar "a música" falharam: o defeito nasce
 * > **depois** do render, na colagem, e nenhuma medição feita à música o podia mostrar.
 * > E também não é um estalo — é um BURACO. A prova da §38.1 procurava saltos entre
 * > amostras e não achava nada, porque 45 ms de silêncio não dão salto nenhum.
 *
 * MEDIDO parte a parte, no som já descodificado:
 *
 * | parte | silêncio no PRINCÍPIO | silêncio no fim |
 * |---|---|---|
 * | 1 | 293,1 ms (inclui o silêncio verdadeiro da abertura) | 17,5 ms |
 * | 2 | **42,5 ms** | 16,7 ms |
 * | 3 | **42,5 ms** | 15,8 ms |
 * | 4 | **43,1 ms** | 19,7 ms |
 *
 * Quarenta e dois vírgula sete. Não é coincidência: é o número do AAC.
 *
 * ═══ A CURA, E POR QUE NÃO É A ÓBVIA ═══
 * A primeira ideia foi fazer o som **numa passagem única** do render e colá-lo por cima.
 * Funciona em teoria e **morreu duas vezes na prática** — dez mil fotogramas de som numa
 * só passagem levam o processo abaixo sem sequer deixar mensagem de erro. Duas mortes no
 * mesmo sítio é sinal para mudar de método, não para tentar terceira vez.
 *
 * O que se faz agora **não renderiza nada de novo e demora segundos**: de cada parte já
 * feita tira-se o som, **deitando fora as 2048 amostras de atraso do princípio** e
 * cortando no comprimento EXATO da imagem daquela parte (`fotogramas / 30`). Os quatro
 * pedaços colam-se amostra a amostra e o resultado entra por cima da imagem.
 *
 * Medido depois: **337,700 s exatos e ZERO buracos** — contra 42,5 / 42,5 / 43,1 ms antes.
 *
 * ⚠️ E se alguma coisa falhar aqui, o script **não entrega um vídeo mudo**: volta ao
 * método antigo (o som das partes) e diz que voltou. Um vídeo com três buraquinhos é mau;
 * um vídeo sem som é pior.
 */
const lista = join(OUT, 'partes.txt');
writeFileSync(lista, feitas.map((f) => `file '${f.replace(/\\/g, '/')}'`).join('\n'), 'utf-8');
const final = join(OUT, `${slug}.mp4`);

/** O atraso que o codificador AAC põe à frente de cada ficheiro: 2048 amostras a 48 kHz. */
const ATRASO_AAC_SEC = 2048 / 48000;

const somColado = join(OUT, 'som-colado.wav');
let temSomLimpo = false;
console.log('\n🔊 a juntar o som sem as emendas…');
try {
  const pedacos = [];
  for (const [i, p] of partes.entries()) {
    const origem = join(OUT, `parte-${String(p.n).padStart(2, '0')}.mp4`);
    const destino = join(OUT, `som-${String(p.n).padStart(2, '0')}.wav`);
    const fotogramas = p.ate - p.de + 1;
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', origem, '-vn',
      '-af', `atrim=start=${ATRASO_AAC_SEC.toFixed(6)},asetpts=N/SR/TB`,
      '-t', (fotogramas / FPS).toFixed(6),
      '-c:a', 'pcm_s16le', '-ar', '48000', '-ac', '2', destino], { stdio: ['ignore', 'ignore', 'ignore'] });
    pedacos.push(destino);
    if (i === partes.length - 1) { /* nada a fazer, só para o linter não achar `i` inútil */ }
  }
  const listaSom = join(OUT, 'sons.txt');
  writeFileSync(listaSom, pedacos.map((f) => `file '${f.replace(/\\/g, '/')}'`).join('\n'), 'utf-8');
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', listaSom,
    '-c:a', 'pcm_s16le', somColado], { stdio: ['ignore', 'ignore', 'ignore'] });
  temSomLimpo = existsSync(somColado);
} catch (err) {
  console.log(`   ⚠️ não deu (${err.message.split('\n')[0]})`);
  temSomLimpo = false;
}
if (!temSomLimpo) {
  console.log('   ⚠️ o vídeo sai com o som das partes, que traz um buraquinho em cada capítulo.');
}

console.log('\n🔗 a colar as partes…');
if (temSomLimpo) {
  /**
   * ⚠️ 🔴 TIRA-SE O SOM DE CADA PARTE **ANTES** DE COLAR, E ISTO FOI MEDIDO A CONTAR
   * FOTOGRAMAS — as três maneiras dão três resultados diferentes:
   *
   * | como se cola | fotogramas | duração da imagem |
   * |---|---|---|
   * | com som junto (o de sempre) | 10131 ✅ | 337,879 s ❌ — o som empurra a imagem 180 ms |
   * | pedindo `-an` **na colagem** | **10124** ❌ — sete fotogramas perdidos | — |
   * | **tirar o som de cada parte e só depois colar** | **10131** ✅ | **337,700 s** ✅ |
   *
   * A primeira parece boa mas não é: como o som de cada parte é ~45 ms mais comprido do
   * que a imagem, quem cola empurra a parte seguinte por esses 45 ms e **abre um buraco
   * na linha do tempo da imagem** — 180 ms ao fim de quatro partes. Com um som contínuo
   * por cima, a legenda ia ficando cada vez mais atrasada, e isso é desfazer o trabalho
   * da §37.1, que brigou por 0,47 s de sincronia.
   * A segunda perde fotogramas em silêncio, que é pior ainda.
   */
  const soImagem = join(OUT, 'so-imagem.mp4');
  const semSom = [];
  for (const p of partes) {
    const n = String(p.n).padStart(2, '0');
    const origem = join(OUT, `parte-${n}.mp4`);
    const destino = join(OUT, `imagem-${n}.mp4`);
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', origem, '-map', '0:v:0', '-c:v', 'copy', '-an', destino], { stdio: ['ignore', 'ignore', 'ignore'] });
    semSom.push(destino);
  }
  const listaImagem = join(OUT, 'imagens.txt');
  writeFileSync(listaImagem, semSom.map((f) => `file '${f.replace(/\\/g, '/')}'`).join('\n'), 'utf-8');
  execFileSync('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', listaImagem, '-c:v', 'copy', '-an', soImagem], { stdio: 'inherit' });
  execFileSync('ffmpeg', ['-y', '-i', soImagem, '-i', somColado,
    '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', final], { stdio: 'inherit' });
  try { rmSync(soImagem, { force: true }); } catch { /* fica o intermédio */ }
} else {
  execFileSync('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', lista, '-c', 'copy', final], { stdio: 'inherit' });
}

// ⚠️ CONFERIR O RESULTADO, nunca o código de saída. É regra desta casa.
const dur = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', final], { encoding: 'utf-8' }).trim();
const esperado = total / FPS;
console.log(`\n✅ ${final}`);
console.log(`   duração medida: ${Number(dur).toFixed(1)}s · esperada: ${esperado.toFixed(1)}s`);
if (Math.abs(Number(dur) - esperado) > 2) {
  console.log('   ⚠️ a diferença passa dos 2 segundos — alguma parte pode ter ficado curta. Confira antes de usar.');
}

/**
 * ⚠️ CONTAR OS FOTOGRAMAS UM A UM, e não acreditar no que o ficheiro diz de si próprio.
 * Uma colagem pode perder fotogramas **em silêncio** — aconteceu, sete deles, e a duração
 * mal se mexia. Se faltar um que seja, a imagem e o som deixam de andar juntos.
 */
try {
  const contados = Number(execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-count_frames',
    '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', final], { encoding: 'utf-8' }).replace(/[^\d]/g, ''));
  if (contados === total) {
    console.log(`   ✅ ${contados} fotogramas, exatamente os que se pediram`);
  } else {
    console.log(`   ❌ ${contados} fotogramas contra os ${total} esperados — faltam ${total - contados}. A imagem e o som vão andar desencontrados.`);
  }
} catch (err) {
  console.log(`   ⚠️ não deu para contar os fotogramas (${err.message.split('\n')[0]})`);
}

/**
 * ⚠️ A PROVA QUE TEM DE CORRER SEMPRE, e é a que faltava.
 * Procura buracos de silêncio quase absoluto de 20 ms ou mais. Num vídeo com narração
 * contínua e música por baixo, um buraco destes **não pode existir** a não ser no começo.
 * É barata (lê o som uma vez) e é a única que apanha o defeito das emendas.
 */
console.log('\n🔎 à procura de buracos no som…');
try {
  const cru = execFileSync('ffmpeg', ['-v', 'error', '-i', final, '-ac', '1', '-ar', '48000', '-f', 's16le', '-'],
    { maxBuffer: 1 << 30, encoding: 'buffer' });
  const amostras = cru.length / 2;
  const buracos = [];
  let ini = -1;
  for (let i = 0; i < amostras; i++) {
    const v = Math.abs(cru.readInt16LE(i * 2) / 32768);
    if (v < 0.0005) { if (ini < 0) ini = i; continue; }
    if (ini >= 0) {
      const ms = (i - ini) / 48;
      if (ms >= 20 && ini > 4800) buracos.push({ seg: ini / 48000, ms });
      ini = -1;
    }
  }
  if (!buracos.length) {
    console.log('   ✅ nenhum buraco. O som corre de ponta a ponta.');
  } else {
    console.log(`   ❌ ${buracos.length} buraco(s) — o som corta nestes instantes:`);
    for (const b of buracos.slice(0, 8)) console.log(`      aos ${b.seg.toFixed(2)}s, durante ${b.ms.toFixed(0)} ms`);
  }
} catch (err) {
  console.log(`   ⚠️ não deu para conferir o som (${err.message.split('\n')[0]})`);
}
