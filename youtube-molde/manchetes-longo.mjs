// AS MANCHETES DO VÍDEO LONGO — 1 a 3 palavras de cada cena, as que mais batem, escolhidas por uma IA GRÁTIS
// (a mesma fila do robô: Cerebras → Groq → NVIDIA → Gemini → Cloudflare; custo $0).
//   node youtube-molde/manchetes-longo.mjs --slug=<slug>   → youtube-molde/trabalho/<slug>/manchetes.json
// ⚠️ A IA NÃO ESCREVE NADA SEU: cada manchete tem de ser um pedaço SEGUIDO da própria frase, com as mesmas
// palavras pela mesma ordem. A que não for é deitada fora, e essa cena fica com a regra automática do plano.
// Se a chamada falhar inteira, não há ficheiro e o plano usa a regra automática em todas — o vídeo sai na mesma.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateText } from '../src/scripts/apis/kie-ai.js'

const aqui = path.dirname(fileURLToPath(import.meta.url))
const slug = process.argv.find((a) => a.startsWith('--slug='))?.split('=')[1]
const roteiro = JSON.parse(fs.readFileSync(path.join(aqui, '..', 'youtube-render', 'public', 'roteiro', `${slug}.json`), 'utf8'))
const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9$]/g, '')

const frases = roteiro.scenes.map((c) => `${c.id}. ${c.narration}`).join('\n')
const pedido = `Este é o texto falado de um vídeo do YouTube sobre dinheiro, frase a frase (número. frase).
Para CADA frase, escolha a MANCHETE: de 1 a 3 palavras SEGUIDAS, copiadas da própria frase, sem mudar nenhuma letra,
que resumam o que a frase tem de mais forte (o susto, o número, a coisa concreta, a virada).
A manchete aparece em letras enormes no ecrã enquanto a frase é dita, por isso tem de fazer sentido sozinha.
Nunca comece nem acabe a manchete com palavra de ligação (de, que, e, o, a, para, porque, eu, você...).
Responda SÓ com JSON, assim: {"1": "palavras", "2": "palavras", ...}

${frases}`

const ok = {}
try {
  const resposta = await generateText(pedido, { maxTokens: 6000, temperature: 0.3, esforcoRaciocinio: 'low' })
  const texto = typeof resposta === 'string' ? resposta : resposta?.text || ''
  const json = JSON.parse(texto.slice(texto.indexOf('{'), texto.lastIndexOf('}') + 1))
  for (const c of roteiro.scenes) {
    const m = String(json[c.id] || '').trim()
    const mw = m.split(/\s+/).map(norm).filter(Boolean)
    const fw = c.narration.split(/\s+/).map(norm)
    const cabe = mw.length >= 1 && mw.length <= 3 && fw.some((_, k) => mw.every((w, j) => fw[k + j] === w))
    if (cabe && m.length <= 24) ok[c.id] = m.replace(/[.,;:!?…]+$/g, '')
  }
  console.log(`manchetes: ${Object.keys(ok).length} de ${roteiro.scenes.length} cenas aceites (as outras ficam com a regra automática)`)
} catch (e) {
  console.log(`manchetes: a IA grátis falhou (${e.message}) — o plano usa a regra automática em todas`)
}
fs.mkdirSync(path.join(aqui, 'trabalho', slug), { recursive: true })
if (Object.keys(ok).length) fs.writeFileSync(path.join(aqui, 'trabalho', slug, 'manchetes.json'), JSON.stringify(ok, null, 1))
