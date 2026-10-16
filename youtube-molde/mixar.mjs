// O SOM — voz de cada cena (na batida em que a cena começa) + o trecho medido da música + efeitos criados aqui.
// Cada efeito é posto pelo seu PICO, para o ouvido o ouvir no instante exato do movimento.
//   node youtube-molde/mixar.mjs --slug=<slug>      → trabalho/<slug>/mix.wav
// Nada de ficheiros de som de fora: os efeitos são fórmulas (seno, ruído filtrado, envelopes).
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const aqui = path.dirname(fileURLToPath(import.meta.url))
const raiz = path.join(aqui, '..')
const slug = process.argv.find((a) => a.startsWith('--slug='))?.split('=')[1]
const trab = path.join(aqui, 'trabalho', slug)
const plano = JSON.parse(fs.readFileSync(path.join(trab, 'plano.json'), 'utf8'))
const tl = JSON.parse(fs.readFileSync(path.join(trab, 'cues.json'), 'utf8'))
const SR = 48000, N = Math.round(tl.duration * SR)
const VOLUME_MUSICA = 0.12 // o mesmo volume de música do canal

// lê qualquer áudio como estéreo em números de -1 a 1
function ler(ficheiro, extra = []) {
  const bruto = execFileSync('ffmpeg', ['-v', 'error', ...extra, '-i', ficheiro, '-ac', '2', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 30 })
  return new Float32Array(bruto.buffer, bruto.byteOffset, bruto.byteLength / 4)
}

// ── os efeitos ──
let semente = 7
const ruido = () => { semente = (semente * 1103515245 + 12345) >>> 0; return semente / 2147483648 - 1 }
const amostras = (seg) => Math.round(seg * SR)
const env = (t, ataque, queda) => Math.min(1, t / ataque) * Math.exp(-Math.max(0, t - ataque) / queda)
function gerar(seg, f) { const x = new Float32Array(amostras(seg)); for (let i = 0; i < x.length; i++) x[i] = f(i / SR, i); return x }
function normalizar(x, pico) { let m = 0; for (const v of x) m = Math.max(m, Math.abs(v)); for (let i = 0; i < x.length; i++) x[i] = (x[i] / (m || 1)) * pico; return x }
function passaBaixo(x, fc) { const a = Math.exp(-2 * Math.PI * fc / SR); let y = 0; for (let i = 0; i < x.length; i++) { y = (1 - a) * x[i] + a * y; x[i] = y } return x }
function passaAlto(x, fc) { const r = 1 / (2 * Math.PI * fc), a = r / (r + 1 / SR); let ant = 0, y = 0; for (let i = 0; i < x.length; i++) { const v = x[i]; y = a * (y + v - ant); ant = v; x[i] = y } return x }
const tom = (seg, fr, ataque, queda) => gerar(seg, (t) => Math.sin(2 * Math.PI * fr * t) * env(t, ataque, queda))
const varrer = (seg, f0, f1, ataque, queda) => { let fase = 0; return gerar(seg, (t) => { fase += 2 * Math.PI * (f0 + (f1 - f0) * Math.min(1, t / seg)) / SR; return Math.sin(fase) * env(t, ataque, queda) }) }
const soma = (...xs) => { const n = Math.max(...xs.map((x) => x.length)), o = new Float32Array(n); for (const x of xs) for (let i = 0; i < x.length; i++) o[i] += x[i]; return o }
const atraso = (x, seg) => { const o = new Float32Array(x.length + amostras(seg)); o.set(x, amostras(seg)); return o }

const SONS = {
  click: normalizar(soma(passaAlto(gerar(0.05, (t) => ruido() * env(t, 0.0005, 0.003)), 2500), tom(0.05, 1900, 0.0008, 0.01)), 0.4),
  tick: normalizar(tom(0.08, 3100, 0.0006, 0.012), 0.18),
  ding: normalizar(soma(tom(0.7, 1568, 0.002, 0.16), atraso(tom(0.6, 2093, 0.002, 0.2), 0.11)), 0.22),
  swish: normalizar(passaBaixo(passaAlto(gerar(0.28, (t) => ruido() * Math.sin(Math.PI * Math.min(1, t / 0.28)) ** 2), 800), 4200), 0.08),
  whoosh: normalizar(passaBaixo(passaAlto(gerar(0.5, (t) => ruido() * Math.sin(Math.PI * Math.min(1, t / 0.5)) ** 3), 300), 2400), 0.15),
  rise: normalizar(varrer(0.45, 220, 640, 0.05, 0.3), 0.12),
  thud: normalizar(soma(varrer(0.6, 95, 45, 0.003, 0.14), passaAlto(gerar(0.04, (t) => ruido() * env(t, 0.0005, 0.006)), 1200)), 0.55),
  coin: normalizar(soma(tom(0.25, 3520, 0.001, 0.05), tom(0.25, 4700, 0.001, 0.035)), 0.1),
  gurgle: normalizar(passaBaixo(gerar(0.9, (t) => ruido() * (0.6 + 0.4 * Math.sin(2 * Math.PI * 9 * t)) * env(t, 0.05, 0.3)), 700), 0.2),
  boom: normalizar(soma(varrer(0.9, 70, 40, 0.004, 0.25), passaBaixo(gerar(0.2, (t) => ruido() * env(t, 0.002, 0.08)), 900)), 0.5),
}
const PICO = Object.fromEntries(Object.entries(SONS).map(([k, x]) => { let m = 0, im = 0; x.forEach((v, i) => { if (Math.abs(v) > m) { m = Math.abs(v); im = i } }); return [k, im] }))

// ── a mistura ──
const mix = new Float32Array(N * 2)
const musica = ler(path.join(raiz, 'youtube-render', 'public', 'music', plano.musica.ficheiro), ['-ss', plano.musica.inicio.toFixed(4), '-t', (tl.duration + 0.1).toFixed(4)])
const fade = amostras(0.004)
for (let i = 0; i < N && 2 * i + 1 < musica.length; i++) {
  const g = VOLUME_MUSICA * Math.min(1, i / fade, (N - i) / fade)
  mix[2 * i] += musica[2 * i] * g; mix[2 * i + 1] += musica[2 * i + 1] * g
}
plano.cenas.forEach((c) => {
  const voz = ler(path.join(raiz, 'youtube-render', 'public', c.audio)), a = amostras(c.inicio)
  for (let i = 0; i < voz.length / 2 && a + i < N; i++) { mix[2 * (a + i)] += voz[2 * i]; mix[2 * (a + i) + 1] += voz[2 * i + 1] }
})
for (const cue of tl.cues) {
  const x = SONS[cue.kind]; if (!x) continue
  const ini = amostras(cue.t) - PICO[cue.kind]
  for (let i = 0; i < x.length; i++) { const j = (((ini + i) % N) + N) % N; mix[2 * j] += x[i]; mix[2 * j + 1] += x[i] } // dá a volta: o loop não tem costura
}

const cru = path.join(trab, 'mix-cru.f32')
fs.writeFileSync(cru, Buffer.from(mix.buffer))
execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'f32le', '-ar', String(SR), '-ac', '2', '-i', cru, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', String(SR), path.join(trab, 'mix.wav')])
fs.rmSync(cru)
console.log(`som: ${plano.cenas.length} vozes + música + ${tl.cues.length} efeitos → mix.wav`)
