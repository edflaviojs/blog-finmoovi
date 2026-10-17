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
import { PALAVRAS_OBJETO, PALAVRAS_EVENTO } from './palavras.mjs'
import { escolherEmocao } from './emocoes.mjs'

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
// RODÍZIO (ordem do Ed, 16/10: "não é todo vídeo que fica legal ter o mouse toda hora assim rápido"):
// nunca o mesmo ritmo TRÊS vezes seguidas. Sem guardar estado nenhum: repassa-se a ordem dos Shorts de
// 16s já publicados (youtube-published.json) com a mesma regra, e o deste vídeo sai no fim da fila.
const TROCA = { agitado: ['moderado', 'sem'], moderado: ['calmo', 'agitado'], calmo: ['moderado', 'sem'], sem: ['moderado'] }
function escolher(clima, antes) {
  const base = RITMO_DO_CLIMA[clima] || 'moderado'
  const [a, b] = antes.slice(-2)
  if (a === base && b === base) return TROCA[base].find((r) => r !== b) || 'moderado'
  return base
}
function ritmoComRodizio() {
  let pub = {}
  try { pub = JSON.parse(fs.readFileSync(path.join(raiz, '.github', 'data', 'youtube-published.json'), 'utf8')) } catch { /* sem histórico: só o clima */ }
  const fila = Object.entries(pub).filter(([s, v]) => v?.formato === 'loop16' && s !== slug).sort((x, y) => String(x[1].uploadedAt).localeCompare(String(y[1].uploadedAt))).slice(-12)
  const antes = []
  for (const [s] of fila) {
    try { antes.push(escolher(JSON.parse(fs.readFileSync(path.join(raiz, 'src', 'scripts', 'youtube', 'output', `${s}.script.json`), 'utf8')).music?.clima, antes)) } catch { /* roteiro já não existe: salta */ }
  }
  return { ritmo: escolher(roteiro.music?.clima, antes), antes }
}
const rod = arg('ritmo') ? null : ritmoComRodizio()
const ritmo = arg('ritmo') || rod.ritmo
if (rod) console.log(`ritmo: ${ritmo} (clima ${roteiro.music?.clima}; os anteriores: ${rod.antes.slice(-4).join(', ') || '—'})`)

// O Short de 50 s (youtube-short-render.yml, os "kw-") não tem situação: o nome curto é a 1.ª manchete do gancho
// ("Investir tem custo"), que já vem curta; o título inteiro não cabe na notificação.
const manchete1 = roteiro.scenes[0]?.shots?.find((s) => s.visual?.type === 'statement')?.visual.text
if (roteiro.situacao && !SITUACOES[roteiro.situacao]) console.warn(`⚠️ situação sem nome curto em situacoes.mjs: ${roteiro.situacao} — uso o título do roteiro`)
const [rotulo, icone] = SITUACOES[roteiro.situacao] || [roteiro.situacao ? roteiro.term : (manchete1 && manchete1.length <= 22 ? manchete1 : roteiro.keyword || roteiro.term), 'nota']

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
if (cenas.length < 4) throw new Error(`o molde espera pelo menos 4 cenas (gancho, 2 batidas, fecho); este roteiro tem ${cenas.length}`)
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

// O valor do cartão. O Short de 16 s traz no roteiro ("R$ 300"); o de 50 s não: procura-se "R$ 1.000" no título e nas
// manchetes, e depois o número DITO antes de "reais" na voz ("mil reais", "duzentos e cinquenta reais").
function valorDoTexto() {
  const fmt = (n) => 'R$ ' + n.toLocaleString('pt-BR')
  for (const txt of [roteiro.term, ...roteiro.scenes.flatMap((s) => (s.shots || []).map((x) => x.visual?.text))]) {
    const m = String(txt || '').match(/R\$\s?(\d{1,3}(?:\.\d{3})+|\d+)/)
    if (m) return fmt(+m[1].replace(/\./g, ''))
  }
  const U = { um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12, treze: 13, quatorze: 14, catorze: 14, quinze: 15, dezesseis: 16, dezessete: 17, dezoito: 18, dezenove: 19, vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60, setenta: 70, oitenta: 80, noventa: 90, cem: 100, cento: 100, duzentos: 200, trezentos: 300, quatrocentos: 400, quinhentos: 500, seiscentos: 600, setecentos: 700, oitocentos: 800, novecentos: 900 }
  for (const sc of roteiro.scenes) {
    const ws = String(sc.narration || '').split(/\s+/).map(norm)
    const i = ws.indexOf('reais'); if (i < 1) continue
    const ehNum = (w) => w === 'e' || w === 'mil' || /^\d+$/.test(w) || U[w] !== undefined
    let k = i; while (k > 0 && ehNum(ws[k - 1])) k--
    let total = 0, parte = 0, achou = false
    for (const w of ws.slice(k, i)) {
      if (w === 'e') continue
      achou = true
      if (w === 'mil') { total += (parte || 1) * 1000; parte = 0 } else parte += /^\d+$/.test(w) ? +w : U[w]
    }
    if (achou) return fmt(total + parte)
  }
  return 'R$ 0'
}

// ── o cartão do app: a sequência de telas ──
const metaforaDe = (c) => c.shots.find((s) => s.visual?.type === 'metaphor')
// 4 cenas (Short de 16 s): gancho, valor, virada, fecho. Mais cenas (o de 50 s tem 6: gancho, 3 batidas, convite, volta):
// as 3 primeiras fazem o mesmo papel, o convite (penúltima) é o fecho, e as do meio e a última ganham telas próprias abaixo.
const [c1, c2, c3] = cenas
const c4 = cenas.length > 4 ? cenas[cenas.length - 2] : cenas[3]
const extras = cenas.length > 4 ? [...cenas.slice(3, -2), cenas[cenas.length - 1]] : []
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

// ── OBJETOS (16/10, pedido do Ed: "quando se fala em carro… aparecer realmente um carro andando") ──
// Nas cenas 1, 3 e 4, a 1.ª palavra que chama um objeto abre o cartão numa JANELA para a cena.
// Na cena 2 manda o valor. Os eventos (quebra, atraso, "caí") mudam o objeto ou disparam efeitos.
const achar = (c, lista) => c.palavras.filter((p) => lista.includes(norm(p.w)))
// até 2 objetos por janela: os mais concretos (peso 3 > 2 > 1), e o dinheiro genérico só se não houver mais nada
function objetosDa(c) {
  const achados = []
  for (const p of c.palavras) for (const [obj, [peso, ...lista]] of Object.entries(PALAVRAS_OBJETO)) if (lista.includes(norm(p.w)) && !achados.some((o) => o.nome === obj)) achados.push({ nome: obj, t: p.t, peso })
  const melhores = achados.filter((o) => o.peso > 1).length ? achados.filter((o) => o.peso > 1) : achados
  return melhores.sort((x, y) => y.peso - x.peso || x.t - y.t).slice(0, 2).sort((x, y) => x.t - y.t).map(({ nome, t }) => ({ nome, t }))
}
const fx = []
const janela = (c) => {
  const objs = objetosDa(c); if (!objs.length) return null
  const quebra = achar(c, PALAVRAS_EVENTO.quebra)[0]
  return { id: 'janela', t: objs[0].t - 0.12, objetos: objs, quebra: quebra ? quebra.t : null }
}
const j1 = janela(c1), j3 = janela(c3), j4 = janela(c4)
if (j1) estados.splice(1, 1, j1) // o objeto da cena 1 entra no lugar da metáfora de apresentação
if (j3) {
  // o extrato que só ficaria um instante antes da janela sai: a janela toma o lugar dele
  const iEx = estados.findIndex((e) => e.id === 'extrato')
  if (iEx >= 0 && j3.t - estados[iEx].t < 1.0) { j3.t = Math.min(j3.t, estados[iEx].t); estados.splice(iEx, 1) }
  // a metáfora em ação vem DEPOIS do objeto: quando a voz diz o nome dela, ou 1,8 s depois da janela
  const nomeDita = c3.palavras.find((p) => norm(p.w).startsWith(norm(metafora).slice(0, 4)))
  const iMeta = estados.findIndex((e) => e.id === 'meta' && e.modo === 'acao')
  estados[iMeta].t = Math.max(j3.t + 1.8, nomeDita ? nomeDita.t - 0.1 : estados[iMeta].t)
  estados.splice(iMeta, 0, j3)
}
if (j4) j4.t = Math.max(c4.inicio + 0.05, j4.t)
// as cenas a mais (só no Short longo): cada uma abre a janela do seu objeto; sem objeto, a do meio volta ao extrato
// e a última mostra a metáfora outra vez — para o cartão não ficar 15 s parado no mesmo ecrã
for (const c of extras) {
  const j = janela(c)
  const e = j ? { ...j, t: Math.max(c.inicio + 0.05, j.t) } : c === cenas[cenas.length - 1] ? { id: 'meta', modo: 'acao', t: c.inicio + 0.4 } : { id: 'extrato', t: c.inicio + 0.05 }
  const iDepois = estados.findIndex((x, k) => k > 0 && x.t > e.t)
  estados.splice(iDepois < 0 ? estados.length : iDepois, 0, e)
}
// a janela do fecho só entra se couber: 1,4 s para ela e 0,8 s para o alerta antes da notificação final
if (j4 && j4.t + 1.4 + 0.8 <= estados[0].t) {
  const iAl = estados.findIndex((e) => e.id === 'alerta')
  estados[iAl].t = Math.max(estados[iAl].t, j4.t + 1.4)
  estados.splice(iAl, 0, j4)
}
// nenhuma tela fica menos de 0,9 s no ecrã: a que não couber sai (a notificação, o valor e o alerta ficam sempre)
for (let i = estados.length - 1; i >= 1; i--) {
  const prox = i + 1 < estados.length ? estados[i + 1].t : estados[0].t
  if (prox - estados[i].t < 0.9 && !['valor', 'alerta'].includes(estados[i].id)) estados.splice(i, 1)
}
for (const j of estados.filter((e) => e.id === 'janela')) if (j.quebra !== null && j.objetos.some((o) => o.nome === 'carro')) fx.push({ tipo: 'faiscas', t: j.quebra }, { tipo: 'fumaca', t: j.quebra, janela: j.t })
for (const c of cenas) for (const p of achar(c, PALAVRAS_EVENTO.atraso)) fx.push({ tipo: 'papeis', t: p.t })
for (const p of achar(c2, PALAVRAS_EVENTO.tomba)) fx.push({ tipo: 'tomba', t: p.t })
for (const c of cenas) {
  for (const p of achar(c, PALAVRAS_EVENTO.festa)) fx.push({ tipo: 'confete', t: p.t })
  for (const p of achar(c, PALAVRAS_EVENTO.susto)) fx.push({ tipo: 'raios', t: p.t })
  for (const p of achar(c, PALAVRAS_EVENTO.voa)) fx.push({ tipo: 'notas', t: p.t })
}
fx.push({ tipo: 'moedas', t: aterra })

// ── o fundo: uma cor por mudança importante; a paleta segue o clima ──
const PALETAS = {
  alerta: ['#FFC72C', '#FF5A4E', '#FF4FA0', '#22D3EE', '#5B8CFF', '#FF5A4E'],
  serio: ['#5B8CFF', '#A78BFA', '#22D3EE', '#FFC72C', '#FF8A3D', '#5B8CFF'],
  leve: ['#22D3EE', '#A3E635', '#FFC72C', '#FF4FA0', '#A78BFA', '#22D3EE'],
}
const paleta = PALETAS[roteiro.music?.clima] || PALETAS.alerta
const inundacoes = [estados[0].t, estados[1].t, aterra, ...estados.slice(3).map((e) => e.t)].map((t, i) => ({ t, cor: paleta[i % paleta.length] }))
  .filter((x, i, arr) => i < 2 || x.t - arr[i - 1].t > 0.8) // duas inundações coladas cansam: fica a primeira

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
const ALVO = { notif: [180, 40], janela: [200, 160], meta: [150, 150], valor: [-120, 160], extrato: [40, 60], alerta: [120, 30] }
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

// a emoção de cada cena (17/10, pedido do Ed): o boneco da janela muda de cara com o que a voz diz
const emocoes = []
{ let antes = null; for (const c of cenas) { const e = escolherEmocao(c.palavras.map((p) => norm(p.w)), antes); antes = e; emocoes.push([+(c.inicio + 0.1).toFixed(3), e]) } }

const plano = {
  slug, ritmo, batida: B, batidas: BATIDAS, duracao: DUR,
  rotulo, icone, valor: roteiro.valor || valorDoTexto(), metafora, aterra,
  cenas: cenas.map((c) => ({ inicio: c.inicio, audio: c.audio, palavras: c.palavras })),
  estados, inundacoes, manchetes, cursor, fx, emocoes,
  musica: { ficheiro: ficheiroMusica, inicio: grelha.inicio },
}
const trab = path.join(aqui, 'trabalho', slug)
fs.mkdirSync(trab, { recursive: true })
fs.writeFileSync(path.join(trab, 'plano.json'), JSON.stringify(plano, null, 1))
console.log(`plano: ${slug} · ritmo ${ritmo} · ${BATIDAS} batidas = ${DUR.toFixed(2)} s · metáfora ${metafora} · ${manchetes.length} manchetes`)
