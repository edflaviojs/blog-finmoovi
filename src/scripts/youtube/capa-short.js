/**
 * TIRAR A FOTOGRAFIA DA CAPA (IMPL20 §52 — 05/08/2026).
 *
 * Lê o roteiro, decide o que vai escrito na capa (ver `lib/capa-texto.js`) e manda o
 * Remotion tirar UMA fotografia da composição `CapaFotoVertical`, no fotograma do
 * instante-chave da abertura.
 *
 * ═══ ONDE ISTO CORRE, E PORQUÊ ═══
 * Corre **na produção**, logo a seguir a montar o vídeo — e não em cada entrega.
 * Razão: a produção já tem o Remotion instalado e já tem tudo em mãos; os carteiros
 * não têm nem precisam. A capa viaja no mesmo artefato do MP4 e serve as duas casas
 * (miniatura no YouTube, capa do Reel no Instagram). Renderiza-se uma vez, usa-se duas.
 *
 * ═══ JPEG E NÃO PNG ═══
 * O YouTube recusa miniaturas acima de 2 MB e o PNG desta capa dá ~1,4 MB — passaria,
 * mas sem folga nenhuma para uma capa mais carregada. Em JPEG fica em ~200 KB sem
 * diferença visível, porque o fundo é liso.
 *
 * Uso:
 *   node src/scripts/youtube/capa-short.js --slug=inflacao-rouba
 *   node src/scripts/youtube/capa-short.js --slug=X --so-texto   (mostra o texto, não renderiza)
 */

import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { textoDaCapa } from './lib/capa-texto.js';

const ROOT = process.cwd();
const RENDER_DIR = join(ROOT, 'youtube-render');
const SCRIPT_DIR = join(ROOT, 'src', 'scripts', 'youtube', 'output');
const OUT_DIR = join(RENDER_DIR, 'out');

/** O instante-chave da abertura (t=0,34) em fotogramas — o mesmo que o `Palco` usa. */
const INSTANTE_CHAVE = 0.34;
const VIDA_DA_CAPA = 105;
const FOTOGRAMA = Math.round(INSTANTE_CHAVE * VIDA_DA_CAPA);

/** O teto do YouTube para miniaturas. Passar disto é recusa, não é aviso. */
const MAX_BYTES = 2 * 1024 * 1024;

const args = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => {
    const [k, ...v] = a.slice(2).split('=');
    return [k, v.join('=') || true];
  }),
);

/** Onde a capa deste vídeo fica. Um só sítio, sabido pelos dois carteiros. */
export function caminhoDaCapa(slug, raiz = ROOT) {
  return join(raiz, 'youtube-render', 'out', `capa-${slug}.jpg`);
}

export function lerRoteiro(slug) {
  const p = join(SCRIPT_DIR, `${slug}.script.json`);
  if (!existsSync(p)) throw new Error(`Não encontrei o roteiro: ${p}`);
  return JSON.parse(readFileSync(p, 'utf-8'));
}

export function tirarFotografia(slug, texto) {
  mkdirSync(OUT_DIR, { recursive: true });
  const destino = caminhoDaCapa(slug);

  // ⚠️ AS PALAVRAS VÃO NUM FICHEIRO, NUNCA NA LINHA DE COMANDO.
  // Escritas à mão no comando, o Windows come as aspas e o Remotion recebe
  // `{tema:CARTÃO,numero:R$ 500/MÊS}` — que não é JSON e rebenta. O próprio Remotion
  // avisa disto no erro.
  //
  // ⚠️ E OS CAMINHOS VÃO CURTOS, medidos a partir da pasta do render.
  // Este projeto vive em `C:\Users\Ed Flávio\…` — com um ESPAÇO e um ACENTO. Passado
  // inteiro, o caminho parte-se ao meio no espaço e o Remotion recebe duas coisas em
  // vez de uma. Já há neste repositório outra cicatriz do mesmo acento (o `fs.rmSync`
  // que não apaga a pasta `dist`). Caminhos curtos não têm espaços para partir.
  writeFileSync(join(OUT_DIR, `capa-${slug}.props.json`), JSON.stringify(texto, null, 2), 'utf-8');
  const propsCurto = `out/capa-${slug}.props.json`;
  const destinoCurto = `out/capa-${slug}.jpg`;

  const r = spawnSync('npx', [
    'remotion', 'still', 'src/index.ts', 'CapaFotoVertical', destinoCurto,
    `--frame=${FOTOGRAMA}`,
    '--image-format=jpeg',
    '--jpeg-quality=92',
    `--props=${propsCurto}`,
  ], { cwd: RENDER_DIR, stdio: 'inherit', shell: process.platform === 'win32' });

  if (r.status !== 0) throw new Error(`O Remotion falhou a tirar a capa (código ${r.status}).`);
  if (!existsSync(destino)) throw new Error(`O Remotion disse que correu bem mas não há ficheiro em ${destino}.`);

  // ⚠️ Conferir o tamanho AQUI e não no upload: uma capa grande demais só seria
  // recusada lá à frente, com o vídeo já publicado e ninguém a olhar para o registo.
  const bytes = statSync(destino).size;
  if (bytes > MAX_BYTES) {
    throw new Error(`A capa tem ${(bytes / 1048576).toFixed(1)} MB e o YouTube recusa acima de 2 MB.`);
  }
  return { destino, bytes };
}

// ─── execução direta ─────────────────────────────────────────────────────────

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('youtube/capa-short.js')) {
  try {
    const slug = String(args.slug || '');
    if (!slug) throw new Error('Falta --slug.');

    const texto = textoDaCapa(lerRoteiro(slug));
    console.log(`\n🎨 Capa de "${slug}"`);
    console.log(`   assunto: ${texto.tema}`);
    console.log(`   número : ${texto.numero || '(não há — o título ocupa o lugar)'}`);
    console.log(`   remate : ${texto.remate}`);
    console.log(`   ação   : ${texto.metaphor || '(a que o desenho usa por omissão)'}\n`);

    if (args['so-texto']) {
      console.log('(--so-texto: nada foi renderizado)\n');
      process.exit(0);
    }

    const { destino, bytes } = tirarFotografia(slug, texto);
    console.log(`\n✅ capa pronta: ${destino} (${Math.round(bytes / 1024)} KB)\n`);
    process.exit(0);
  } catch (e) {
    console.error(`\n❌ ${e.message}\n`);
    process.exit(1);
  }
}
