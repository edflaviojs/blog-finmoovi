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
let aterra = quandoNumero(c2)
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

// ── O SHORT DE 50 s: AS TELAS QUE O ROTEIRO PEDE (19/10, o Ed: "tem fala que não confere com o que está sendo mostrado") ──
// O roteiro já diz o que mostrar em cada frase (os "shots": a palavra e o desenho). O de 50 s passa a seguir isso, como o
// vídeo longo segue o `visual` de cada cena: o número dito aparece no cartão, "joguei no FinMoovi" abre a tela do app
// com o resultado, o convite mostra o FinMoovi e os 7 dias grátis. O de 16 s (4 cenas) fica como foi aprovado.
const NUM = { um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12, treze: 13, quatorze: 14, catorze: 14, quinze: 15, dezesseis: 16, dezessete: 17, dezoito: 18, dezenove: 19, vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60, setenta: 70, oitenta: 80, noventa: 90, cem: 100, cento: 100, duzentos: 200, trezentos: 300, quatrocentos: 400, quinhentos: 500, seiscentos: 600, setecentos: 700, oitocentos: 800, novecentos: 900 }
// os números que a voz diz numa cena ("dois mil e quatrocentos reais"): o valor, quando começa, quando acaba, e o que vem depois
function numerosDitos(c) {
  const ws = c.palavras, ehNum = (w) => w === 'mil' || /^\d+$/.test(w) || NUM[w] !== undefined, achados = []
  for (let i = 0; i < ws.length; i++) {
    if (!ehNum(norm(ws[i].w))) continue
    let k = i, total = 0, parte = 0
    while (k < ws.length && (ehNum(norm(ws[k].w)) || (norm(ws[k].w) === 'e' && k + 1 < ws.length && ehNum(norm(ws[k + 1].w))))) {
      const w = norm(ws[k].w)
      if (w === 'mil') { total += (parte || 1) * 1000; parte = 0 } else if (w !== 'e') parte += /^\d+$/.test(w) ? +w : NUM[w]
      k++
    }
    const n = total + parte, reais = k < ws.length && norm(ws[k].w) === 'reais'
    if (n >= 10) achados.push({ n, t: ws[i].t, fim: ws[k - 1].t, reais, depois: ws.slice(k + (reais ? 1 : 0), k + 5).map((x) => norm(x.w)).join(' ') })
    i = k - 1
  }
  return achados
}
const numeroDe = (txt) => { const m = String(txt || '').match(/R\$\s?(\d{1,3}(?:\.\d{3})+|\d+)(?:,\d+)?(\s?mil)?/i); return m ? +m[1].replace(/\./g, '') * (m[2] ? 1000 : 1) : 0 }
// "por mês", "no ano"… o que a voz diz logo depois do número vira a linha pequena do cartão
function legendaDoValor(d, txt) {
  const dep = (d?.depois || '') + ' ' + norm(String(txt || '').replace(/^[^/]*\//, 'por '))
  if (/^(por|ao) ?mes/.test(dep) || /pormes/.test(dep)) return 'por mês'
  if (/^(no|por|em um|num) ?ano/.test(dep) || /^em (doze|12) meses/.test(dep)) return 'em 12 meses'
  return ''
}
// a cor do resultado: o que rende/sobra é verde; o que a taxa/cobrança leva é vermelho
const tomDe = (c) => { const f = norm(roteiro.scenes[c.i]?.narration || ''); return /rend|sobr|econom|guard|tesouro|invest|poup|junt/.test(f) ? 'entra' : /cobr|taxa|perd|juros|divida|gast/.test(f) ? 'sai' : 'neutro' }
// o ícone do roteiro → o objeto desenhado na janela
const ICONE_OBJ = { warning: 'alerta', shield: 'cadeado', card: 'cartao', money: 'saco-dinheiro', coins: 'saco-dinheiro', wallet: 'carteira', question: 'duvida', target: 'alvo', clock: 'despertador', 'chart-down': 'grafico-desce', growth: 'grafico-sobe', piggy: 'cofrinho', trophy: 'trofeu', mind: 'ideia' }
const papelDe = (c) => roteiro.scenes[c.i]?.role
if (cenas.length > 4) {
  const novas = []
  const valorEm = (n, t, d, txt) => ({ id: 'valor', t: +t.toFixed(3), valor: n, aterra: +Math.max(t + 0.4, d ? d.fim + 0.25 : t + 0.7).toFixed(3), sub: legendaDoValor(d, txt) })
  for (const c of cenas) {
    const antes = novas.length, ditos = numerosDitos(c), papel = papelDe(c)
    if (papel === 'cta') {
      // o convite: o FinMoovi, os 7 dias grátis, e o cursor carrega no botão quando a voz diz "grátis"
      const fimFala = c.palavras.length ? c.palavras[c.palavras.length - 1].t : c.inicio + 2
      const gr = c.palavras.find((p) => /^(gratis|testar|teste|graca)$/.test(norm(p.w)))
      const fr = String(roteiro.scenes[c.i]?.narration || '')
      // "Esse resultado apareceu na tela. Quer ver o seu?": o resultado fica até ao convite começar a ser dito
      const chama = c.palavras.find((p) => /^(quer|procura|procure|abra|abre|baixa|baixe|testa|teste|usa|use)$/.test(norm(p.w)))
      novas.push({ id: 'convite', t: +Math.max(c.inicio + 0.05, chama ? chama.t - 0.15 : 0).toFixed(3), clique: +Math.max(c.inicio + 1.2, gr ? gr.t : fimFala).toFixed(3), dias: /(sete|7) dias/i.test(fr) ? 7 : 0 })
      continue
    }
    const app = c.shots.find((s) => s.visual?.type === 'app')
    if (app) {
      // a tela do app: o número que o FinMoovi mostrou (o do roteiro, ou o último que a voz diz) aterra quando é dito
      const sn = c.shots.find((s) => s.visual?.type === 'number' && numeroDe(s.visual.text)) || c.shots.find((s) => s.visual?.type === 'statement' && numeroDe(s.visual.text))
      const n = sn ? numeroDe(sn.visual.text) : ditos.length ? ditos[ditos.length - 1].n : 0
      const d = ditos.find((x) => x.n === n) || ditos[ditos.length - 1]
      const t = c.inicio + 0.05 // o app abre logo no "joguei isso no FinMoovi"
      const rot = c.shots.find((s) => s.visual?.type === 'statement')?.visual.text
      novas.push({ id: 'app', t: +t.toFixed(3), valor: n, rotulo: rot || rotulo, aterra: +Math.max(t + 0.8, d ? d.fim + 0.25 : t + 1.4).toFixed(3), tom: tomDe(c), sub: legendaDoValor(d, '') })
      continue
    }
    const temGrafico = c.shots.some((s) => s.visual?.type === 'chart')
    for (const s of c.shots) {
      const v = s.visual || {}, t = Math.max(c.inicio + 0.05, quando(c, s.anchor) - 0.12)
      const n = v.type === 'counter' ? +v.to || 0 : v.type === 'number' || v.type === 'statement' ? numeroDe(v.text) : 0
      if (n && !temGrafico) novas.push(valorEm(n, t, ditos.find((x) => x.n === n), v.text))
      else if (v.type === 'chart') {
        const nn = c.shots.map((x) => numeroDe(x.visual?.text) || (x.visual?.type === 'counter' ? +x.visual.to : 0)).find(Boolean) || (ditos.length ? Math.max(...ditos.map((x) => x.n)) : 0)
        const d = ditos.find((x) => x.n === nn)
        novas.push({ id: 'grafico', t: +t.toFixed(3), titulo: v.text || '', valor: nn, aterra: +Math.max(t + 1.0, d ? d.fim + 0.25 : t + 1.6).toFixed(3), tom: tomDe(c) })
      } else if (v.type === 'formula') {
        const m = String(v.text || '').match(/R\$\s?([\d.]+)\s*[x×*]\s*(\d+)\s*(.*)$/i)
        novas.push({ id: 'conta', t: +t.toFixed(3), texto: v.text || '', ...(m ? { a: +m[1].replace(/\./g, ''), b: +m[2], unidade: m[3] || '' } : {}) })
      } else if (v.type === 'list') novas.push({ id: 'extrato', t: +t.toFixed(3) })
      else if (v.type === 'metaphor' && v.metaphor !== 'clique-link') novas.push({ id: 'meta', modo: 'acao', t: +t.toFixed(3), metafora: v.metaphor })
      else if (v.type === 'icon' && ICONE_OBJ[v.icon]) novas.push({ id: 'janela', t: +t.toFixed(3), objetos: [{ nome: ICONE_OBJ[v.icon], t: +(t + 0.12).toFixed(3) }], quebra: null })
    }
    // o número em reais que a voz diz e nenhum desenho mostrou ("duzentos reais por mês podem virar dois mil e quatrocentos")
    // (um valor que o vídeo já mostrou só volta no fecho, que recapitula, ou se a cena não tiver mais nada)
    const vazia = novas.length === antes
    for (const d of ditos) if (d.reais && !novas.slice(antes).some((e) => e.valor === d.n) && (papel === 'outro' || vazia || !novas.some((e) => e.valor === d.n))) novas.push(valorEm(d.n, d.t - 0.35, d, ''))
    // nada pedido: o objeto que a voz chama (senão o boneco fica com o palco, mais abaixo)
    if (novas.length === antes) { const j = janela(c); if (j) novas.push({ ...j, t: Math.max(c.inicio + 0.05, j.t) }) }
  }
  novas.sort((a, b) => a.t - b.t)
  // o mesmo valor duas vezes seguidas fica um só; nenhuma tela fica menos de 0,9 s; nada encosta na notificação final
  const igual = (a, b) => a.id === b.id && (a.id === 'valor' ? a.valor === b.valor : a.id === 'meta' ? a.metafora === b.metafora : a.id === 'janela' ? a.objetos[0].nome === b.objetos[0].nome : a.id === 'extrato')
  for (let i = novas.length - 1; i >= 1; i--) if (igual(novas[i], novas[i - 1])) novas.splice(i, 1)
  const notifT = DUR - 3 * B
  while (novas.length && novas[novas.length - 1].t > notifT - 0.9) novas.pop()
  // duas telas coladas: sai a menos importante (o número, o app e o convite ganham ao desenho)
  const PESO = { convite: 3, app: 3, valor: 2, grafico: 2, conta: 2, extrato: 1, meta: 1, janela: 1 }
  for (let i = novas.length - 1; i >= 0; i--) {
    const prox = i + 1 < novas.length ? novas[i + 1].t : notifT
    if (prox - novas[i].t >= 0.9) continue
    if (i + 1 < novas.length && (PESO[novas[i + 1].id] || 0) < (PESO[novas[i].id] || 0)) { novas.splice(i + 1, 1); i++ } else if (!['convite', 'app'].includes(novas[i].id)) novas.splice(i, 1)
  }
  estados.splice(0, estados.length, { id: 'notif', t: notifT }, ...novas)
  const v1 = novas.find((e) => e.id === 'valor' || e.id === 'app' || e.id === 'grafico')
  aterra = v1 ? v1.aterra : aterra
  // os efeitos das janelas antigas saem; o carro que quebra numa janela nova volta a soltar faíscas
  for (let i = fx.length - 1; i >= 0; i--) if (['faiscas', 'fumaca', 'moedas'].includes(fx[i].tipo)) fx.splice(i, 1)
  for (const j of novas.filter((e) => e.id === 'janela')) if (j.quebra !== null && j.objetos.some((o) => o.nome === 'carro')) fx.push({ tipo: 'faiscas', t: j.quebra }, { tipo: 'fumaca', t: j.quebra, janela: j.t })
  for (const e of novas) if (e.id === 'valor' || e.id === 'app') fx.push({ tipo: e.tom === 'entra' ? 'brilho' : 'moedas', t: e.aterra })
}

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
const ALVO = { notif: [180, 40], janela: [200, 160], meta: [150, 150], valor: [-120, 160], extrato: [40, 60], alerta: [120, 30], app: [-140, 60], grafico: [220, 120], conta: [260, 40], convite: [0, 170] }
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

// ── A LISTA E OS MOMENTOS DO PALCO (19/10, o Ed: levar para os Shorts o que o longo já tem) ──
// Vem DEPOIS do cursor: as visitas dele contam as telas pela ordem, e estas não podem tomar o lugar delas.
const fimDe = (e) => { const k = estados.indexOf(e); return k + 1 < estados.length ? estados[k + 1].t : estados[0].t + (k === 0 ? DUR : 0) }
const FICA = new Set(['notif', 'valor', 'alerta', 'app', 'convite'])
// o convite: o cursor vai ao botão "Testar grátis" e carrega quando a voz diz "grátis"
for (const e of estados.filter((x) => x.id === 'convite')) {
  cursor.chaves = cursor.chaves.filter(([t]) => t < e.t + 0.2 || t > e.clique + 0.9)
  cursor.cliques = cursor.cliques.filter((t) => t < e.t + 0.2 || t > e.clique + 0.9)
  cursor.chaves.push([+(e.clique - 0.7).toFixed(3), 0, 170], [+(e.clique + 0.9).toFixed(3), ...DESCANSO])
  cursor.cliques.push(e.clique)
  if (ritmo !== 'agitado') cursor.janelas.push([e.clique - 1.4, e.clique + 1.2])
  cursor.chaves.sort((a, b) => a[0] - b[0]); cursor.cliques.sort((a, b) => a - b)
}
// A LISTA: uma frase com 3 ou mais coisas seguidas ("o aluguel, a luz, o mercado") vira uma folha de caderno; o cursor
// vai a cada caixinha quando a voz diz o item, e no fim carrega no botão. No Short cabem 4 itens.
const ARTIGOS = new Set(['o', 'a', 'os', 'as', 'um', 'uma', 'meu', 'minha', 'meus', 'minhas', 'seu', 'sua'])
const NAO_E_ITEM = new Set(['voce', 'eu', 'ele', 'ela', 'nos', 'mesmo', 'mesma', 'todo', 'toda', 'todos', 'alguma', 'algum', 'so', 'ali', 'aqui', 'la', 'sabe', 'sei', 'que', 'quando', 'como', 'mas', 'porque', 'entao', 'depois', 'agora', 'sempre', 'nunca', 'ja', 'isso', 'tudo', 'nada', 'por', 'sem', 'com', 'para', 'pra', 'de', 'do', 'da', 'no', 'na', 'em', 'se', 'nao', 'teve', 'era', 'foi', 'tinha'])
function listaDa(c) {
  const partes = String(roteiro.scenes[c.i]?.narration || '').split(/,|\se\s(?=(?:o|a|os|as|um|uma|meu|minha|até)\s)/i).map((x) => x.trim()).filter(Boolean)
  if (partes.length < 3) return null
  const itens = []
  partes.forEach((pt, k) => {
    let ws = pt.replace(/[.!?;:…]+$/g, '').split(/\s+/)
    if (k === 0) { const a = ws.map(norm).findLastIndex((w) => ARTIGOS.has(w)); ws = a >= 0 ? ws.slice(a) : ws.slice(-2) }
    while (ws.length && /^(e|ate|nem|mais|tambem|ainda)$/.test(norm(ws[0]))) ws = ws.slice(1)
    const bom = ws.length && ws.length <= 4 && !pt.includes(':') && !NAO_E_ITEM.has(norm(ws[0]))
    itens.push(bom ? { ws, comArtigo: ARTIGOS.has(norm(ws[0])) } : null)
    if (/[.!?…]$/.test(pt)) itens.push(null)
  })
  let melhor = [], atual = []
  for (const it of itens) { if (it) { atual.push(it); if (atual.length > melhor.length) melhor = [...atual] } else atual = [] }
  if (melhor.length < 3 || melhor.filter((x) => x.comArtigo || x.ws.length === 1).length < 2) return null
  let depois = c.inicio - 0.01
  return melhor.slice(0, 4).map(({ ws }) => {
    const sem = ARTIGOS.has(norm(ws[0])) && ws.length > 1 ? ws.slice(1) : ws
    const texto = sem.join(' ')
    const t = quando(c, sem[0], depois); depois = t + 0.01
    return { texto: texto.charAt(0).toUpperCase() + texto.slice(1), t: +t.toFixed(3) }
  })
}
const LISTA_CX = -307, LISTA_Y0 = -147, LISTA_PASSO = 80, LISTA_BOTAO = 232 // a caixinha e o botão, a partir do meio do cartão
for (const c of cenas.slice(1)) {
  const itens = listaDa(c); if (!itens) continue
  const ini = itens[0].t - 0.5, botao = +(itens[itens.length - 1].t + 0.9).toFixed(3)
  // a folha não apaga o valor, o alerta nem a notificação; o que estiver no meio sai
  if (estados.some((e) => FICA.has(e.id) && e.t > ini - 0.9 && e.t < botao + 1.0)) continue
  for (let k = estados.length - 1; k >= 1; k--) if (estados[k].t > ini && estados[k].t < botao + 1.0) estados.splice(k, 1)
  const iDepois = estados.findIndex((x, k) => k > 0 && x.t > ini)
  estados.splice(iDepois < 0 ? estados.length : iDepois, 0, { id: 'lista', t: +ini.toFixed(3), itens, botao })
  // o cursor: uma visita por item (chega, clica na caixinha), depois o botão; nada mais o puxa dali
  cursor.chaves = cursor.chaves.filter(([t]) => t < ini - 0.6 || t > botao + 0.8)
  cursor.cliques = cursor.cliques.filter((t) => t < ini - 0.6 || t > botao + 0.8)
  itens.forEach((it, i) => { cursor.chaves.push([+(it.t - 0.35).toFixed(3), LISTA_CX, LISTA_Y0 + i * LISTA_PASSO]); cursor.cliques.push(+(it.t + 0.25).toFixed(3)) })
  cursor.chaves.push([+(botao - 0.55).toFixed(3), 0, LISTA_BOTAO], [+(botao + 0.8).toFixed(3), ...DESCANSO])
  cursor.cliques.push(botao)
  if (ritmo !== 'agitado') cursor.janelas.push([ini - 0.4, botao + 1.0])
  cursor.chaves.sort((a, b) => a[0] - b[0]); cursor.cliques.sort((a, b) => a - b)
  console.log(`lista: ${itens.map((x) => x.texto).join(' · ')}`)
}
// OS MOMENTOS DO PALCO: uma tela que ficaria 5 s ou mais parada perde o fim para o boneco, grande e sozinho em cima da
// cor — um close no rosto, um balão de pensamento, um desenho solto ao lado dele, ou ele sentado/aos pulos.
// Corta numa frase nova quando dá (a imagem muda com a fala); nunca o mesmo momento duas vezes seguidas; até 3.
const MOMENTO_DA_EMOCAO = { triste: ['close', 'cena'], nervoso: ['close', 'solto'], susto: ['close', 'solto'], feliz: ['cena', 'solto'], pensativo: ['pensamento', 'close'], vergonha: ['close', 'pensamento'], sono: ['cena', 'pensamento'], suor: ['solto', 'close'], dinheiro: ['solto', 'pensamento'], fala: ['solto', 'pensamento'], neutra: ['pensamento', 'solto'] }
const PENSAMENTO_DA_EMOCAO = { triste: 'nuvem', nervoso: 'raio', susto: 'exclamacao', feliz: 'coracao', pensativo: 'interrogacao', vergonha: 'reticencias', sono: 'zzz', suor: 'documento', dinheiro: 'moeda', fala: 'interrogacao', neutra: 'reticencias' }
const emocaoEm = (t) => (emocoes.filter(([t0]) => t0 <= t).pop() || emocoes[0])[1]
const todas = cenas.flatMap((c) => c.palavras)
let ultimoMomento = null, nMomentos = 0
for (const e of [...estados]) {
  // o boneco sozinho nunca tapa o resultado do app, a conta nem o convite (19/10)
  if (nMomentos >= 3 || ['notif', 'lista', 'app', 'conta', 'convite'].includes(e.id)) continue
  const fim = fimDe(e)
  if (fim - e.t < 5.0) continue
  const de = Math.max(e.t + 2.4, e.id === 'valor' ? (e.aterra ?? aterra) + 1.5 : 0), ate = fim - 2.2
  if (ate < de) continue
  // a 1.ª palavra de uma frase nova dentro da janela (a mais perto de 3,2 s antes do fim); senão, 3,2 s antes do fim
  const frases = todas.filter((p, k) => k > 0 && /[.!?…]$/.test(todas[k - 1].w) && p.t - 0.1 >= de && p.t - 0.1 <= ate).map((p) => p.t - 0.1)
  const corte = frases.length ? frases.sort((x, y) => Math.abs(x - (fim - 3.2)) - Math.abs(y - (fim - 3.2)))[0] : Math.min(ate, Math.max(de, fim - 3.2))
  const em = emocaoEm(corte + 0.2)
  const c = [...cenas].reverse().find((x) => x.inicio <= corte + 0.2) || cenas[0]
  if (papelDe(c) === 'cta' || c.shots.some((s) => s.visual?.type === 'app')) continue
  // o desenho solto: um objeto que a frase chama e que não é o que já está no ecrã
  const jaNoEcra = new Set((e.objetos || []).map((o) => o.nome))
  const achado = c.palavras.filter((p) => p.t >= corte - 1).map((p) => Object.entries(PALAVRAS_OBJETO).find(([nome, [, ...l]]) => l.includes(norm(p.w)) && !jaNoEcra.has(nome))).find(Boolean)
  const opcoes = [...(MOMENTO_DA_EMOCAO[em] || []), 'close', 'pensamento', 'cena'].filter((m, i, a) => a.indexOf(m) === i && m !== ultimoMomento && (m !== 'solto' || achado))
  const momento = opcoes[0] || 'close'
  ultimoMomento = momento; nMomentos++
  const palco = { id: 'palco', t: +corte.toFixed(3), momento, emocao: em }
  if (momento === 'pensamento') palco.pensa = PENSAMENTO_DA_EMOCAO[em] || 'interrogacao'
  if (momento === 'solto') palco.solto = achado[0]
  estados.splice(estados.indexOf(e) + 1, 0, palco)
  inundacoes.push({ t: palco.t, cor: paleta[(inundacoes.length + 1) % paleta.length] })
  console.log(`palco: ${momento}${palco.solto ? ' (' + palco.solto + ')' : ''} às ${palco.t.toFixed(1)} s, ${em}, no lugar do fim de "${e.id}"`)
}
inundacoes.sort((a, b) => a.t - b.t)

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
