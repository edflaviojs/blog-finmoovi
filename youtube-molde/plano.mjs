// O PLANO — transforma o roteiro do robô num plano de vídeo que a página (index.html) desenha.
// Tudo o que é TEMPO sai daqui: as cenas em cima das batidas da música, as palavras com o tempo medido
// pelo passo da voz, quando cada tela do app entra, que palavra de impacto acende, de que cor,
// e o que o cursor faz. A página só obedece.
//
//   node youtube-molde/plano.mjs --slug=<slug> [--ritmo=agitado|moderado|calmo|sem]
//
// Lê (tudo o que o robô já produz antes do render):
//   src/scripts/youtube/output/<slug>.script.json          o roteiro
//   youtube-render/public/audio/<slug>/timing.json          a voz de cada cena e o tempo de cada palavra
//   youtube-molde/musicas.json                              a grelha de batidas de cada música (medida uma vez)
// Escreve: youtube-molde/trabalho/<slug>/plano.json
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { SITUACOES } from './situacoes.mjs'

const aqui = path.dirname(fileURLToPath(import.meta.url))
const raiz = path.join(aqui, '..')
const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1]
const slug = arg('slug')
if (!slug) { console.error('uso: node youtube-molde/plano.mjs --slug=<slug> [--ritmo=...]'); process.exit(2) }

const roteiro = JSON.parse(fs.readFileSync(path.join(raiz, 'src', 'scripts', 'youtube', 'output', `${slug}.script.json`), 'utf8'))
const timing = JSON.parse(fs.readFileSync(path.join(raiz, 'youtube-render', 'public', 'audio', slug, 'timing.json'), 'utf8'))
const musicas = JSON.parse(fs.readFileSync(path.join(aqui, 'musicas.json'), 'utf8'))
const ficheiroMusica = path.basename(roteiro.music?.ficheiro || 'bg-rock.mp3')
const grelha = musicas[ficheiroMusica]
if (!grelha) throw new Error(`música sem grelha de batidas em musicas.json: ${ficheiroMusica}`)
const B = grelha.batida

// ── o ritmo do cursor: pelo clima do roteiro, a não ser que venha pedido ──
const RITMO_DO_CLIMA = { alerta: 'agitado', serio: 'moderado', leve: 'calmo' }
const ritmo = arg('ritmo') || RITMO_DO_CLIMA[roteiro.music?.clima] || 'moderado'

if (!SITUACOES[roteiro.situacao]) console.warn(`⚠️ situação sem nome curto em situacoes.mjs: ${roteiro.situacao} — uso o título do roteiro`)
const [rotulo, icone] = SITUACOES[roteiro.situacao] || [roteiro.term, 'nota']

// ── as cenas caem em batidas: a próxima começa na 1ª batida depois de a voz anterior acabar + 0,35 s ──
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')
const cenas = []
let inicio = 0
timing.scenes.forEach((sc, i) => {
  const ws = sc.words
  const fimFala = ws.length ? ws[ws.length - 1].end : sc.durationSec
  const t0 = inicio
  cenas.push({
    i, papel: sc.role, inicio: t0, fimFala: t0 + fimFala, audio: sc.audioFile,
    palavras: ws.map((w) => ({ w: w.word, t: +(t0 + w.start).toFixed(3) })),
    shots: roteiro.scenes[i]?.shots || [],
  })
  inicio = Math.ceil((t0 + fimFala + 0.35) / B) * B
})
if (cenas.length < 4) throw new Error(`o molde espera 4 cenas (gancho, 2 batidas, fecho); este roteiro tem ${cenas.length}`)
const ultima = cenas[cenas.length - 1]
const BATIDAS = Math.ceil((ultima.fimFala + 0.9) / B)
const DUR = BATIDAS * B

// o instante em que a voz diz uma palavra (âncora do roteiro); se não achar, usa o meio da cena
function quando(cena, ancora, depois = 0) {
  const a = norm(ancora)
  const w = cena.palavras.find((x) => x.t >= depois && (norm(x.w) === a || (a.length >= 4 && norm(x.w).startsWith(a.slice(0, 4)))))
  return w ? w.t : (cena.inicio + cena.fimFala) / 2
}
// o instante em que a voz diz o NÚMERO (é aí que o valor aterra)
function quandoNumero(cena) {
  const w = cena.palavras.find((x) => /\d/.test(x.w) || /^(mil|cem|cento|duzent|trezent|quatrocent|quinhent|seiscent|setecent|oitocent|novecent|dez|vinte|trinta|quarenta|cinquenta|sessenta|setenta|oitenta|noventa)/.test(norm(x.w)))
  return w ? w.t : cena.inicio + 0.8
}

// ── o cartão do app: a sequência de telas ──
const metaforaDe = (c) => c.shots.find((s) => s.visual?.type === 'metaphor')
const [c1, c2, c3, c4] = cenas
const m1 = metaforaDe(c1), m3 = metaforaDe(c3) || metaforaDe(c2)
const aterra = quandoNumero(c2)
const estados = [
  { id: 'notif', t: DUR - 3 * B },
  { id: 'meta', modo: 'apresenta', t: m1 ? quando(c1, m1.anchor) - 0.1 : c1.inicio + 1.6 },
  { id: 'valor', t: c2.inicio + 0.05 },
  { id: 'extrato', t: c3.inicio + 0.05 },
  { id: 'meta', modo: 'acao', t: m3 ? Math.max(c3.inicio + 1.0, quando(c3, m3.anchor) - 0.1) : c3.inicio + 1.4 },
  { id: 'alerta', t: c4.inicio + 0.05 },
]
const metafora = (m3 || m1)?.visual.metaphor || roteiro.fioCondutor

// ── o fundo: uma cor por mudança importante; a paleta segue o clima ──
const PALETAS = {
  alerta: ['#FFC72C', '#FF5A4E', '#FF4FA0', '#22D3EE', '#5B8CFF', '#FF5A4E'],
  serio: ['#5B8CFF', '#A78BFA', '#22D3EE', '#FFC72C', '#FF8A3D', '#5B8CFF'],
  leve: ['#22D3EE', '#A3E635', '#FFC72C', '#FF4FA0', '#A78BFA', '#22D3EE'],
}
const paleta = PALETAS[roteiro.music?.clima] || PALETAS.alerta
const inundacoes = [estados[0].t, estados[1].t, aterra, estados[3].t, estados[4].t, estados[5].t].map((t, i) => ({ t, cor: paleta[i] }))

// ── as manchetes: cada "statement" do roteiro, com as palavras de impacto a acender quando a voz as diz ──
const CORES = ['#FDE047', '#22D3EE', '#FF4FA0', '#FF5A4E', '#A3E635']
let corN = 0
const chave = norm(roteiro.keyword || '')
const manchetes = []
cenas.forEach((c) => c.shots.forEach((s) => {
  if (s.visual?.type !== 'statement') return
  const t = quando(c, s.anchor) - 0.15
  const pm = s.visual.text.split(/\s+/).filter(Boolean)
  const imp = pm.map((w, j) => /\d|R\$/.test(w) || (chave && norm(w) === chave) || (j === pm.length - 1 && norm(w).length >= 4))
  // pelo menos duas palavras acesas: se faltar, acende também a mais comprida
  if (imp.filter(Boolean).length < 2 && pm.length > 2) {
    let lj = -1; pm.forEach((w, j) => { if (!imp[j] && (lj < 0 || norm(w).length > norm(pm[lj]).length)) lj = j })
    if (lj >= 0 && norm(pm[lj]).length >= 5) imp[lj] = true
  }
  // "R$" anda colado ao número
  const ws = []
  pm.forEach((w, j) => { if (j > 0 && pm[j - 1] === 'R$') { ws[ws.length - 1].w += ' ' + w; ws[ws.length - 1].imp = true } else ws.push({ w, imp: imp[j] }) })
  let k = 0
  const acende = ws.map((x) => {
    if (!x.imp) return null
    const dita = c.palavras.find((p) => p.t >= t - 0.3 && (norm(p.w) === norm(x.w) || (norm(x.w).length >= 4 && norm(p.w).startsWith(norm(x.w).slice(0, 4)))))
    const tn = /\d/.test(x.w) ? quandoNumero(c) : null
    return { t: dita ? dita.t : tn && tn >= t - 0.3 ? tn : t + 0.35 + 0.18 * k++, cor: CORES[corN++ % CORES.length] }
  })
  if (manchetes.length && manchetes[manchetes.length - 1].texto === s.visual.text) return
  manchetes.push({ texto: s.visual.text, palavras: ws.map((x) => x.w), acende, t })
}))
manchetes.forEach((m, i) => { m.sai = i + 1 < manchetes.length ? manchetes[i + 1].t - 0.05 : DUR + manchetes[0].t - 0.05 })
// loop: se a última manchete repete a primeira, a primeira já está no ecrã quando o vídeo recomeça
if (manchetes.length > 1 && norm(manchetes[manchetes.length - 1].texto) === norm(manchetes[0].texto)) {
  const u = manchetes.pop(); manchetes[0].entra = u.t - DUR; manchetes[manchetes.length - 1].sai = u.t - 0.05
}
manchetes.forEach((m) => { m.entra ??= m.t })
// manchete que ficaria menos de 1 s no ecrã vira pisca-pisca: sai, e a anterior fica até a seguinte entrar
for (let i = manchetes.length - 1; i > 0; i--) if (manchetes[i].sai - manchetes[i].entra < 1.0) { manchetes[i - 1].sai = manchetes[i].sai; manchetes.splice(i, 1) }

// ── o cursor: os mesmos alvos, mas o ritmo decide quantos visita, a que velocidade, e quantos cliques ──
const ALVO = { notif: [180, 40], meta: [150, 150], valor: [-120, 160], extrato: [40, 60], alerta: [120, 30] }
const DESCANSO = [330, 470]
const PERFIL = {
  agitado: { visitas: [0, 1, 2, 3, 4, 5], cliques: [0, 2, 3], vel: 2.3, passeio: true },
  moderado: { visitas: [0, 2, 3], cliques: [0, 3], vel: 1.5, passeio: false },
  calmo: { visitas: [2, 4], cliques: [2], vel: 0.8, passeio: false },
  sem: { visitas: [], cliques: [], vel: 1, passeio: false },
}[ritmo]
if (!PERFIL) throw new Error(`ritmo desconhecido: ${ritmo}`)
const cursor = { ritmo, vel: PERFIL.vel, chaves: [[estados[0].t + 0.3, ...DESCANSO]], cliques: [] }
PERFIL.visitas.forEach((iv) => {
  const e = estados[(iv + 1) % estados.length], dest = ALVO[e.id] || [0, 0]
  cursor.chaves.push([Math.max(0, e.t - (PERFIL.vel > 2 ? 0.7 : 1.2)), dest[0], dest[1]])
  if (PERFIL.cliques.includes(iv)) cursor.cliques.push(+(e.t - 0.15).toFixed(3))
  cursor.chaves.push(PERFIL.passeio ? [e.t + 0.5, dest[0] + 140, dest[1] + 120] : [e.t + 0.6, ...DESCANSO])
})
cursor.chaves.push([DUR - 1.2, ...DESCANSO])
cursor.chaves.sort((a, b) => a[0] - b[0])
// agitado: o cursor está sempre lá. Nos outros, só aparece perto de cada visita.
cursor.janelas = ritmo === 'agitado' ? [[-1, DUR + 1]] : PERFIL.visitas.map((iv) => { const e = estados[(iv + 1) % estados.length]; return [e.t - (PERFIL.vel > 2 ? 1.6 : 2.4), e.t + 1.4] })

const plano = {
  slug, ritmo, batida: B, batidas: BATIDAS, duracao: DUR,
  rotulo, icone, valor: roteiro.valor, metafora, aterra,
  cenas: cenas.map((c) => ({ inicio: c.inicio, audio: c.audio, palavras: c.palavras })),
  estados, inundacoes, manchetes, cursor,
  musica: { ficheiro: ficheiroMusica, inicio: grelha.inicio },
}
const trab = path.join(aqui, 'trabalho', slug)
fs.mkdirSync(trab, { recursive: true })
fs.writeFileSync(path.join(trab, 'plano.json'), JSON.stringify(plano, null, 1))
console.log(`plano: ${slug} · ritmo ${ritmo} · ${BATIDAS} batidas = ${DUR.toFixed(2)} s · metáfora ${metafora} · ${manchetes.length} manchetes`)
