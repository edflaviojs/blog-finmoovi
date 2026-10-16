// AS LEGENDAS (.srt) NO TEMPO DO MOLDE.
//   node youtube-molde/legendas.mjs --slug=<slug>
// O srt-short.js do robô conta o tempo como o Remotion monta o vídeo: cenas coladas umas às outras.
// No molde cada cena começa na batida seguinte da música, por isso as legendas iam ficar atrasadas.
// Aqui não se refaz a conta do Remotion (depende de intro, transições e respiro): usa-se o que é certo.
//   PT — as palavras da legenda são as palavras do roteiro, e o plano sabe o instante de cada uma.
//   EN/ES — estica-se o tempo pela mesma régua (onde começava cada legenda PT → onde começa agora).
// Os originais ficam ao lado, com o sufixo .remotion.srt.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const aqui = path.dirname(fileURLToPath(import.meta.url))
const slug = process.argv.find((a) => a.startsWith('--slug='))?.split('=')[1]
const plano = JSON.parse(fs.readFileSync(path.join(aqui, 'trabalho', slug, 'plano.json'), 'utf8'))
const dir = path.join(aqui, '..', 'youtube-render', 'public', 'audio', slug)

const seg = (s) => { const [h, m, r] = s.split(':'); const [x, ms] = r.split(','); return +h * 3600 + +m * 60 + +x + +ms / 1000 }
const fmt = (t) => { t = Math.max(0, t); const ms = Math.round(t * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}` }
const ler = (f) => fs.readFileSync(f, 'utf8').replace(/\r/g, '').trim().split(/\n\n+/).map((b) => { const l = b.split('\n'); const [a, z] = l[1].split(' --> '); return { ini: seg(a), fim: seg(z), texto: l.slice(2).join('\n') } })
const escrever = (f, cues) => fs.writeFileSync(f, cues.map((c, i) => `${i + 1}\n${fmt(c.ini)} --> ${fmt(c.fim)}\n${c.texto}`).join('\n\n') + '\n')
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')

const ficheiros = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /\.(pt|en|es)\.srt$/.test(f)) : []
const fPt = ficheiros.find((f) => f.endsWith('.pt.srt'))
if (!fPt) { console.log('legendas: não há .pt.srt — nada a acertar'); process.exit(0) }

// PT: cada legenda começa na sua 1.ª palavra, que o plano sabe quando é dita
const palavras = plano.cenas.flatMap((c) => c.palavras).filter((w) => norm(w.w))
const pt = ler(path.join(dir, fPt))
let k = 0
const regua = []
const novoPt = pt.map((c) => {
  const n = c.texto.split(/\s+/).filter((w) => norm(w)).length
  const primeira = palavras[Math.min(k, palavras.length - 1)], ultima = palavras[Math.min(k + n - 1, palavras.length - 1)]
  k += n
  regua.push([c.ini, primeira.t])
  return { ini: primeira.t, fim: ultima.t + 0.45, texto: c.texto }
})
novoPt.forEach((c, i) => { if (novoPt[i + 1]) c.fim = Math.min(c.fim + 0.4, novoPt[i + 1].ini) }) // segura até a próxima, sem se sobrepor
if (k !== palavras.length) console.warn(`⚠️ legendas: o PT tem ${k} palavras e o plano ${palavras.length} — confira`)

// a régua: liga o tempo antigo ao novo (por troços); usada para EN e ES
const novoTempo = (t) => {
  if (t <= regua[0][0]) return regua[0][1] + (t - regua[0][0])
  for (let i = 0; i < regua.length - 1; i++) { const [a, A] = regua[i], [b, Bn] = regua[i + 1]; if (t <= b) return A + (t - a) * (Bn - A) / Math.max(1e-6, b - a) }
  const [a, A] = regua[regua.length - 1]; return A + (t - a)
}
for (const f of ficheiros) {
  const orig = path.join(dir, f), copia = orig.replace(/\.srt$/, '.remotion.srt')
  if (!fs.existsSync(copia)) fs.copyFileSync(orig, copia)
  const cues = f === fPt ? novoPt : ler(copia).map((c) => ({ ...c, ini: novoTempo(c.ini), fim: novoTempo(c.fim) }))
  escrever(orig, cues)
}
console.log(`legendas: ${ficheiros.length} ficheiro(s) acertados ao tempo do molde`)
