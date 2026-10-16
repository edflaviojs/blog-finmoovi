// A CONFERÊNCIA AUTOMÁTICA — antes de o vídeo ir ao ar, mede o que um olho humano veria de errado.
//   node youtube-molde/conferencia.mjs --slug=<slug>   → trabalho/<slug>/conferencia.json (+ folha.png com uma foto por batida)
// Mede, a cada meia batida: manchete encostada no cartão, legenda encostada no cartão, texto a sair do ecrã,
// texto a vazar para fora do cartão. Só conta defeito o que DURA (duas medidas seguidas): o meio de uma
// transição pode encostar por um instante e isso não é defeito.
// ⚠️ Regra da casa: a conferência NUNCA impede a publicação. Ela escreve o relatório; quem decide é o robô.
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const aqui = path.dirname(fileURLToPath(import.meta.url))
const slug = process.argv.find((a) => a.startsWith('--slug='))?.split('=')[1]
const trab = path.join(aqui, 'trabalho', slug)
const plano = JSON.parse(fs.readFileSync(path.join(trab, 'plano.json'), 'utf8'))
const nav = await chromium.launch()
const pg = await nav.newPage({ viewport: { width: 1080, height: 1920 } })
const erros = []
pg.on('pageerror', (e) => erros.push(e.message))
await pg.addInitScript((pl) => { window.__RENDER__ = true; window.__PLANO__ = pl }, plano)
await pg.goto(pathToFileURL(path.join(aqui, 'index.html')).href)
await pg.waitForFunction(() => window.__PRONTO__ === true, null, { timeout: 30000 })
// PROVA DE CONTROLO: CONTROLE_FALSO=1 estraga o vídeo de propósito (manchetes por cima do cartão e uma
// palavra para fora do ecrã). Uma conferência que não acusa isto não serve para nada.
if (process.env.CONTROLE_FALSO) await pg.addStyleTag({ content: '.head { top: 640px !important } .head .w:first-child { margin-left: -500px !important }' })

const cruza = (a, b, folga = 6) => a && b && a.x + folga < b.x + b.w && b.x + folga < a.x + a.w && a.y + folga < b.y + b.h && b.y + folga < a.y + a.h
const fora = (a) => a.x < 20 || a.x + a.w > 1060 || a.y < 0 || a.y + a.h > 1920
const fotos = path.join(trab, 'conferencia'); fs.rmSync(fotos, { recursive: true, force: true }); fs.mkdirSync(fotos, { recursive: true })
const passo = plano.batida / 2, n = Math.floor(plano.duracao / passo)
const achados = []
for (let i = 0; i < n; i++) {
  const t = (i + 0.5) * passo
  await pg.evaluate((tt) => window.seek(tt), t)
  const m = await pg.evaluate(() => window.__medir__())
  const aqui2 = []
  for (const w of m.palavras) {
    if (cruza(w, m.cartao)) aqui2.push(`manchete "${w.txt}" encosta no cartão`)
    if (fora(w)) aqui2.push(`manchete "${w.txt}" sai do ecrã`)
  }
  if (cruza(m.legenda, m.cartao)) aqui2.push('legenda encosta no cartão')
  if (m.legenda && fora(m.legenda)) aqui2.push('legenda sai do ecrã')
  for (const d of m.dentro) if (d.x < m.cartao.x - 4 || d.x + d.w > m.cartao.x + m.cartao.w + 4) aqui2.push(`texto "${d.txt}" vaza do cartão (${d.tela})`)
  achados.push({ t: +t.toFixed(2), problemas: [...new Set(aqui2)] })
  if (i % 2 === 0) await pg.locator('#stage').screenshot({ path: path.join(fotos, `${String(i / 2).padStart(3, '0')}.png`) })
}
await nav.close()
// só fica o que se repete em duas medidas seguidas
const defeitos = []
achados.forEach((a, i) => a.problemas.forEach((p) => { if (achados[i + 1]?.problemas.includes(p) && !defeitos.some((d) => d.problema === p && Math.abs(d.t - a.t) < 1)) defeitos.push({ t: a.t, problema: p }) }))
execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', '1', '-i', path.join(fotos, '%03d.png'), '-vf', 'scale=216:384,tile=10x4', '-frames:v', '1', path.join(trab, 'folha.png')])
const rel = { slug, ritmo: plano.ritmo, duracao: +plano.duracao.toFixed(2), medidas: achados.length, errosNaPagina: erros, defeitos, aprovado: defeitos.length === 0 && erros.length === 0 }
fs.writeFileSync(path.join(trab, 'conferencia.json'), JSON.stringify(rel, null, 1))
console.log(rel.aprovado ? `conferência: OK (${achados.length} medidas)` : `conferência: ${defeitos.length} defeito(s) e ${erros.length} erro(s) de página`)
defeitos.forEach((d) => console.log(`  ${d.t.toFixed(2)} s — ${d.problema}`))
erros.forEach((e) => console.log('  erro:', e))
