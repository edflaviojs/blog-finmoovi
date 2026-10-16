// Fotografa uma galeria:  node youtube-molde/galeria.mjs [instante da ação] [galeria | galeria-objetos]
import { chromium } from 'playwright'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
const aqui = path.dirname(fileURLToPath(import.meta.url))
const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 3500, height: 2400 } })
const erros = []; p.on('pageerror', (e) => erros.push(e.message))
const pagina = process.argv[3] || 'galeria'
await p.goto(pathToFileURL(path.join(aqui, pagina + '.html')).href + '?a=' + (process.argv[2] || 1.3))
await p.evaluate(() => document.fonts.ready)
await p.screenshot({ path: path.join(aqui, pagina + '.png'), fullPage: true })
console.log(erros.length ? 'ERROS: ' + erros.join(' | ') : 'galeria ok'); await b.close()
