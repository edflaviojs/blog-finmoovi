// UM COMANDO: plano → desenho → som → vídeo final → conferência.
//   node youtube-molde/fazer.mjs --slug=<slug> --saida=<caminho.mp4> [--ritmo=...]
// Precisa do que o robô já fez antes: o roteiro e o passo da voz (timing.json + áudios das cenas).
// Sai com código ≠ 0 se não conseguir fazer o vídeo — é o sinal para o robô usar o Remotion nesse dia.
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const aqui = path.dirname(fileURLToPath(import.meta.url))
const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=').slice(1).join('=')
const slug = arg('slug'), saida = arg('saida'), ritmo = arg('ritmo')
if (!slug || !saida) { console.error('uso: node youtube-molde/fazer.mjs --slug=<slug> --saida=<mp4> [--ritmo=...]'); process.exit(2) }
const node = (script, ...a) => execFileSync(process.execPath, [path.join(aqui, script), `--slug=${slug}`, ...a], { stdio: 'inherit' })
const t0 = Date.now()
node('plano.mjs', ...(ritmo ? [`--ritmo=${ritmo}`] : []))
node('render.mjs', '--modo=video')
node('mixar.mjs')
const trab = path.join(aqui, 'trabalho', slug)
fs.mkdirSync(path.dirname(path.resolve(saida)), { recursive: true })
execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', path.join(trab, 'video-mudo.mp4'), '-i', path.join(trab, 'mix.wav'), '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', path.resolve(saida)], { stdio: 'inherit' })
console.log(`✅ molde: ${saida} em ${((Date.now() - t0) / 1000).toFixed(0)} s`)
try {
  node('conferencia.mjs')
  // o que a conferência achar aparece como AVISO na página do robô (amarelo), sem parar nada
  const rel = JSON.parse(fs.readFileSync(path.join(trab, 'conferencia.json'), 'utf8'))
  for (const d of rel.defeitos) console.log(`::warning title=molde — conferência::${d.t.toFixed(2)} s — ${d.problema}`)
  for (const e of rel.errosNaPagina) console.log(`::warning title=molde — erro na página::${e}`)
} catch (e) { console.log('::warning title=molde::a conferência não correu:', e.message) } // nunca derruba o vídeo
