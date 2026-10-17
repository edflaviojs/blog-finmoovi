// O DESENHADOR — abre index.html num navegador sem janela, pede cada instante com seek(t) e fotografa.
//   node youtube-molde/render.mjs --slug=<slug> --modo=video     → trabalho/<slug>/video-mudo.mp4 (60 q/s)
//   node youtube-molde/render.mjs --slug=<slug> --modo=batidas   → trabalho/<slug>/batidas/NNN.png (uma foto por meia batida)
//   node youtube-molde/render.mjs --slug=<slug> --modo=foto --t=3.2
// Cada quadro é a MÉDIA de 4 fotos dentro do mesmo quadro: é isso que dá o rasto natural ao movimento rápido.
// Escreve também trabalho/<slug>/cues.json (onde cai cada som), que o mixar.mjs lê.
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const aqui = path.dirname(fileURLToPath(import.meta.url))
const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1] ?? d
const slug = arg('slug'), modo = arg('modo', 'video')
const trab = path.join(aqui, 'trabalho', slug)
const plano = JSON.parse(fs.readFileSync(path.join(trab, 'plano.json'), 'utf8'))
const QPS = Number(arg('qps', plano.qps || 60)), SUB = Number(arg('sub', plano.sub || 4)), TRAB = Number(process.env.WORKERS || 4)
// o Short é em pé (1080×1920, index.html); o vídeo longo é deitado (1920×1080, longo.html) — o plano diz qual
const LARG = plano.largura || 1080, ALT = plano.altura || 1920, PAGINA = plano.pagina || 'index.html'

const correr = (cmd, args) => new Promise((ok, falha) => {
  const p = spawn(cmd, args, { stdio: ['ignore', 'inherit', 'inherit'] })
  p.on('exit', (c) => (c === 0 ? ok() : falha(new Error(`${cmd} saiu com ${c}`))))
})
const errosDaPagina = []
async function abrir(nav) {
  const pg = await nav.newPage({ viewport: { width: LARG, height: ALT }, deviceScaleFactor: 1 })
  await pg.addInitScript((pl) => { window.__RENDER__ = true; window.__PLANO__ = pl }, plano)
  pg.on('pageerror', (e) => errosDaPagina.push(e.message))
  await pg.goto(pathToFileURL(path.join(aqui, PAGINA)).href)
  // erro na página = parar já, com a mensagem (em vez de esperar 30 s pelo "pronto" que nunca vem)
  await pg.waitForFunction(() => window.__PRONTO__ === true, null, { timeout: 30000 }).catch((e) => { throw new Error(errosDaPagina.length ? 'erro na página: ' + errosDaPagina.join(' | ') : e.message) })
  return pg
}
const fotografar = async (pg, t, ficheiro) => {
  await pg.evaluate((tt) => window.seek(tt), t)
  await pg.locator('#stage').screenshot({ path: ficheiro, type: 'png', animations: 'disabled' })
}

const nav = await chromium.launch()
const p0 = await abrir(nav)
const tl = await p0.evaluate(() => window.timeline())
fs.writeFileSync(path.join(trab, 'cues.json'), JSON.stringify(tl, null, 1))

if (modo === 'foto') {
  await fotografar(p0, Number(arg('t', 0)), path.join(trab, 'foto.png'))
} else if (modo === 'batidas') {
  const dir = path.join(trab, 'batidas'); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true })
  const n = Math.round(tl.beats * 2)
  for (let i = 0; i < n; i++) await fotografar(p0, (i + 0.6) * 0.5 * tl.beat, path.join(dir, `${String(i).padStart(3, '0')}.png`))
  console.log(`batidas: ${n} fotos em ${dir}`)
} else if (plano.formato === 'longo') {
  // O VÍDEO LONGO NÃO CABE NO DISCO EM FOTOS SOLTAS (~30 mil fotos de 1920×1080). Cada página faz UM pedaço
  // seguido do filme e manda as fotos direto para o seu próprio ffmpeg (que já faz a média das subfotos);
  // no fim os pedaços colam-se sem voltar a codificar. Os cortes caem sempre entre dois quadros inteiros.
  const quadros = Math.round(tl.duration * QPS)
  const paginas = [p0, ...(await Promise.all(Array.from({ length: TRAB - 1 }, () => abrir(nav))))]
  const inicio = Date.now(); let feitos = 0
  const tam = Math.ceil(quadros / TRAB)
  const pedacos = paginas.map((_, w) => [w * tam, Math.min(quadros, (w + 1) * tam)]).filter(([a, b]) => b > a)
  await Promise.all(pedacos.map(async ([a, b], w) => {
    const saida = path.join(trab, `pedaco-${w}.mp4`)
    const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(QPS * SUB), '-c:v', 'mjpeg', '-i', '-',
      '-vf', `tmix=frames=${SUB},select='eq(mod(n\\,${SUB})\\,${SUB - 1})',setpts=N/(${QPS}*TB)`,
      '-frames:v', String(b - a), '-r', String(QPS), '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', saida], { stdio: ['pipe', 'inherit', 'inherit'] })
    const fim = new Promise((ok, falha) => ff.on('exit', (c) => (c === 0 ? ok() : falha(new Error(`ffmpeg do pedaço ${w} saiu com ${c}`)))))
    const pg = paginas[w]
    for (let i = a * SUB; i < b * SUB; i++) {
      await pg.evaluate((tt) => window.seek(tt), (i - (SUB - 1) / 2) / (QPS * SUB))
      const buf = await pg.screenshot({ type: 'jpeg', quality: 92, clip: { x: 0, y: 0, width: LARG, height: ALT } })
      if (!ff.stdin.write(buf)) await new Promise((ok) => ff.stdin.once('drain', ok))
      if (++feitos % 1500 === 0) console.log(`  ${feitos}/${quadros * SUB} fotos (${((Date.now() - inicio) / 1000).toFixed(0)} s)`)
    }
    ff.stdin.end()
    await fim
  }))
  const lista = path.join(trab, 'pedacos.txt')
  fs.writeFileSync(lista, pedacos.map((_, w) => `file 'pedaco-${w}.mp4'`).join('\n'))
  await correr('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lista, '-c', 'copy', path.join(trab, 'video-mudo.mp4')])
  pedacos.forEach((_, w) => fs.rmSync(path.join(trab, `pedaco-${w}.mp4`), { force: true }))
  console.log(`video longo: ${quadros} quadros em ${((Date.now() - inicio) / 1000).toFixed(0)} s (${TRAB} pedaços)`)
} else {
  const dir = path.join(trab, 'quadros'); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true })
  const quadros = Math.round(tl.duration * QPS), total = quadros * SUB
  const paginas = [p0, ...(await Promise.all(Array.from({ length: TRAB - 1 }, () => abrir(nav))))]
  const inicio = Date.now(); let feitos = 0
  await Promise.all(paginas.map(async (pg, w) => {
    for (let i = w; i < total; i += TRAB) {
      // as subfotos ficam centradas no quadro: o "obturador" cobre um quadro inteiro
      await fotografar(pg, (i - (SUB - 1) / 2) / (QPS * SUB), path.join(dir, `${String(i).padStart(6, '0')}.png`))
      if (++feitos % 600 === 0) console.log(`  ${feitos}/${total} fotos (${((Date.now() - inicio) / 1000).toFixed(0)} s)`)
    }
  }))
  await correr('ffmpeg', ['-v', 'error', '-y', '-framerate', String(QPS * SUB), '-i', path.join(dir, '%06d.png'),
    '-vf', `tmix=frames=${SUB},select='eq(mod(n\\,${SUB})\\,${SUB - 1})',setpts=N/(${QPS}*TB)`,
    '-frames:v', String(quadros), // só os quadros DESTA corrida (uma pasta antiga pode não ter sido apagada)
    '-r', String(QPS), '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', path.join(trab, 'video-mudo.mp4')])
  fs.rmSync(dir, { recursive: true, force: true })
  console.log(`video: ${quadros} quadros em ${((Date.now() - inicio) / 1000).toFixed(0)} s`)
}
await nav.close()
if (errosDaPagina.length) { console.error('erros na página:', [...new Set(errosDaPagina)].join(' | ')); process.exit(1) }
