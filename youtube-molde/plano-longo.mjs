// O PLANO DO VÍDEO LONGO — o mesmo molde dos Shorts, deitado (1920×1080), para o vídeo de ~8 minutos.
// O robô do longo JÁ decide o que mostrar em cada cena (lib/imagens-longo.js escreve `visual` em cada uma:
// número, desenho, boneco, fotografia, tela do app...). Aqui não se decide nada disso outra vez: cada escolha
// vira uma tela do cartão no estilo novo. Só se acrescenta o que o molde tem e o Remotion não tinha:
// a manchete com as palavras de impacto, o boneco sempre em cena, a cor por capítulo, os objetos das palavras.
//
//   node youtube-molde/plano-longo.mjs --slug=<slug>
//
// Lê (tudo o que a Etapa 2 do robô já tem em disco antes do render):
//   youtube-render/public/roteiro/<slug>.json            o plano de cenas do montar-longo.js (com `visual`)
//   youtube-render/public/audio/<slug>/timing.json       a voz de cada cena e o tempo de cada palavra
//   src/scripts/youtube/output/<slug>.longo.json         o mapa dos valores (opcional: dá nomes às linhas do extrato)
// Escreve: youtube-molde/trabalho/<slug>/plano.json
//
// ⚠️ O TEMPO É O MESMO DO REMOTION, de propósito: as cenas começam onde `iniciosDasCenas` (srt-longo.js) diz.
// É essa conta que escreve as legendas e os capítulos da descrição — se o molde mudasse um segundo que fosse,
// os capítulos do YouTube apontavam para o sítio errado. Por isso aqui NÃO se encaixam as cenas nas batidas.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PALAVRAS_OBJETO, PALAVRAS_EVENTO } from './palavras.mjs'
import { iniciosDasCenas, duracaoDoVideoSec, VOZ_ENTRA_FRAMES, RESPIRO_SEC, CARTAO_CAPITULO_FRAMES, SIGNATURE_FRAMES, TELA_FINAL_FRAMES } from '../src/scripts/youtube/srt-longo.js'
import { BORDAO } from '../src/scripts/youtube/lib/schema-short.js'

const aqui = path.dirname(fileURLToPath(import.meta.url))
const raiz = path.join(aqui, '..')
const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1]
const slug = arg('slug')
if (!slug) { console.error('uso: node youtube-molde/plano-longo.mjs --slug=<slug>'); process.exit(2) }

const FPS = 30
const roteiro = JSON.parse(fs.readFileSync(path.join(raiz, 'youtube-render', 'public', 'roteiro', `${slug}.json`), 'utf8'))
const timing = JSON.parse(fs.readFileSync(path.join(raiz, 'youtube-render', 'public', 'audio', slug, 'timing.json'), 'utf8'))
let mapa = null
try { mapa = JSON.parse(fs.readFileSync(path.join(raiz, 'src', 'scripts', 'youtube', 'output', `${slug}.longo.json`), 'utf8')).mapa || null } catch { /* sem mapa: o extrato usa os rótulos das cenas */ }

// ── o tempo: a mesma conta do Remotion (Long.tsx → linhaDoTempo) ──
const { inicios, fimDoConteudo } = iniciosDasCenas(roteiro, timing)
const DUR = duracaoDoVideoSec(roteiro, timing)
const tDe = (id) => timing.scenes.find((s) => String(s.id) === String(id))
const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')

const cenas = roteiro.scenes.map((c, i) => {
  const tm = tDe(c.id)
  const falada = tm?.durationSec || c.durationSec
  const frames = Math.max(1, Math.round((i < roteiro.scenes.length - 1 ? falada + RESPIRO_SEC : falada) * FPS))
  const t0 = inicios[i]
  return {
    i, id: c.id, papel: c.role, capitulo: c.capitulo || null, abre: !!c.abreCapitulo, titulo: c.tituloCapitulo || null,
    inicio: t0, fim: t0 + frames / FPS, audio: tm?.audioFile || null,
    palavras: (tm?.words || []).map((w) => ({ w: w.word, t: +(t0 + w.start).toFixed(3) })),
    narration: c.narration, visual: c.visual || { tipo: 'palavras' }, pausa: c.pausaDepois || null,
  }
})
// a voz sem tempos medidos (nunca devia acontecer): as palavras espalham-se pela cena, para a legenda não sumir
for (const c of cenas) if (!c.palavras.length) {
  const ws = c.narration.split(/\s+/).filter(Boolean), d = (c.fim - c.inicio - 0.3) / Math.max(1, ws.length)
  c.palavras = ws.map((w, k) => ({ w, t: +(c.inicio + k * d).toFixed(3) }))
}

// o instante em que a voz diz uma palavra (ou o meio da cena)
const quando = (c, alvo) => { const a = norm(alvo); const w = c.palavras.find((x) => norm(x.w) === a || (a.length >= 5 && norm(x.w).startsWith(a.slice(0, 5)))); return w ? w.t : (c.inicio + c.fim) / 2 }
const NUM = /^(\d|mil$|cem$|cento|duzent|trezent|quatrocent|quinhent|seiscent|setecent|oitocent|novecent|dez$|vinte|trinta|quarenta|cinquenta|sessenta|setenta|oitenta|noventa)/
const quandoNumero = (c) => { const w = c.palavras.find((x) => NUM.test(norm(x.w))); return w ? w.t : c.inicio + 0.6 }
const dinheiro = (n) => 'R$ ' + Number(n).toLocaleString('pt-BR')

// ── as telas fixas, por cima de tudo: capa, cartões de capítulo, telas sem voz, bordão, assinatura, tela final ──
const VOZ = VOZ_ENTRA_FRAMES / FPS
const sobreposicoes = []
{
  // A CAPA: a pergunta do vídeo, até meio segundo depois de a voz a acabar de dizer (a mesma regra do Remotion)
  const nCapa = String(roteiro.capa || '').trim().split(/\s+/).filter(Boolean).length
  const ditas = cenas[0]?.palavras || []
  const fimPergunta = nCapa && ditas.length >= nCapa ? ditas[nCapa - 1].t + 0.5 : VOZ + 4
  if (roteiro.capa) sobreposicoes.push({ tipo: 'capa', t: 0, fim: Math.min(8, Math.max(2.5, fimPergunta)), texto: roteiro.capa })
}
cenas.forEach((c) => {
  if (c.abre && c.capitulo) sobreposicoes.push({ tipo: 'capitulo', t: c.inicio - CARTAO_CAPITULO_FRAMES / FPS, fim: c.inicio, numero: c.capitulo, titulo: c.titulo })
  // 17/10, o Ed: a frase do aviso é um PENSAMENTO do boneco, com a emoção que a pergunta pede
  if (c.pausa?.frames) {
    const n = norm(c.pausa.texto.split(/\s+/).slice(0, 2).join(' '))
    const emocao = /^(porque|porq|pq)/.test(n) ? 'perplexo' : /^(quanto|como|onde|qual)/.test(n) ? 'pensativo' : /^oque|mudou|achei|descobri/.test(n) ? 'curioso' : 'perplexo'
    sobreposicoes.push({ tipo: 'pausa', t: c.fim, fim: c.fim + c.pausa.frames / FPS, texto: c.pausa.texto, etiqueta: c.pausa.etiquetaTexto || '', emocao })
  }
})
const BORDAO_SEC = 2.5
sobreposicoes.push({ tipo: 'bordao', t: fimDoConteudo - BORDAO_SEC, fim: fimDoConteudo, texto: BORDAO })
// 🔴 17/10, o Ed: a tela final aparecia antes dos quadros do YouTube — "tem que aparecer faltando 8 a 9
// segundos". A duração total do vídeo NÃO muda (é a mesma conta do Remotion); a assinatura fica com o resto.
const FINAL_SEC = 9
sobreposicoes.push({ tipo: 'assinatura', t: fimDoConteudo, fim: DUR - FINAL_SEC })
sobreposicoes.push({ tipo: 'final', t: DUR - FINAL_SEC, fim: DUR })
sobreposicoes.sort((a, b) => a.t - b.t)

// ── os objetos das palavras (o mesmo catálogo dos Shorts) ──
function objetosDa(c) {
  const achados = []
  for (const p of c.palavras) for (const [obj, [peso, ...lista]] of Object.entries(PALAVRAS_OBJETO)) if (lista.includes(norm(p.w)) && !achados.some((o) => o.nome === obj)) achados.push({ nome: obj, t: p.t, peso })
  const fortes = achados.filter((o) => o.peso > 1)
  return fortes.sort((x, y) => y.peso - x.peso || x.t - y.t).slice(0, 2).sort((x, y) => x.t - y.t).map(({ nome, t }) => ({ nome, t }))
}
const achar = (c, lista) => c.palavras.filter((p) => lista.includes(norm(p.w)))

// ── o mapa: as linhas do extrato e da soma (nunca números inventados: só os do guião) ──
const valoresDoMapa = (mapa?.valores || []).filter((v) => Number.isFinite(+v.valor) && +v.valor > 0).map((v) => ({ nome: String(v.nome), valor: +v.valor, tipo: v.tipo || 'sai' }))
const tipoDoValor = (valor) => valoresDoMapa.find((v) => v.valor === +valor)?.tipo || 'sai'
const curto = (rotulo) => { const r = String(rotulo || '').replace(/^(o|a|os|as) /i, ''); return r.charAt(0).toUpperCase() + r.slice(1) }

// ── A EMOÇÃO DE CADA CENA (17/10, o Ed: "ele tem que passar um sentimento… o público tem que achar ele
// fofinho, como um amiguinho de verdade"). Sai das palavras da frase; nunca a mesma duas vezes seguidas. ──
const EMOCOES = [
  ['triste', ['faltou', 'faltava', 'faltavam', 'falta', 'perdi', 'perdeu', 'divida', 'dividas', 'chorar', 'chorei', 'triste', 'sozinho', 'apertado', 'apertou', 'sumiu', 'sumia', 'vazio', 'acabou', 'negativo', 'vermelho']],
  ['nervoso', ['raiva', 'nervoso', 'juros', 'multa', 'cobranca', 'cobrou', 'cobra', 'cobram', 'atrasada', 'atrasou', 'atraso', 'caro', 'absurdo', 'irritado', 'estresse', 'briga', 'culpado']],
  ['susto', ['susto', 'assustei', 'assustadora', 'choque', 'vibrou', 'inacreditavel', 'assustou', 'gritou', 'escaparem', 'escapando', 'tremi']],
  ['feliz', ['sobrou', 'sobra', 'sobrava', 'consegui', 'guardei', 'guardar', 'alivio', 'tranquilo', 'feliz', 'livre', 'liberdade', 'aposentar', 'aposenta', 'economizei', 'reserva', 'mudou', 'paz', 'leve']],
  ['pensativo', ['pensei', 'pensava', 'achava', 'achei', 'entender', 'entendi', 'descobrir', 'descobri', 'procurar', 'procurava', 'procurando', 'sera', 'duvida', 'ideia', 'perguntei', 'pergunta', 'lembrava', 'lembrar', 'imaginei']],
  ['vergonha', ['vergonha', 'culpa', 'culpei', 'arrependo', 'arrependi', 'esqueci', 'esquecidas', 'esquecida', 'admitir', 'confesso']],
  ['sono', ['rotina', 'repetia', 'repete', 'cansado', 'cansei', 'chato', 'devagar']],
  ['suor', ['conta', 'contas', 'boleto', 'boletos', 'fatura', 'pagar', 'paguei', 'pagava', 'parcela', 'parcelas', 'aluguel', 'cartao']],
  ['dinheiro', ['dinheiro', 'salario', 'ganho', 'ganhar', 'investir', 'rendeu', 'rende', 'lucro', 'pix']],
]
function emocaoDa(c, tela, antes) {
  const ws = c.palavras.map((p) => norm(p.w))
  if (tela?.id === 'numero') return tela.tom === 'sai' ? (antes === 'susto' ? 'triste' : 'susto') : (antes === 'dinheiro' ? 'feliz' : 'dinheiro')
  // "dinheiro" está em quase toda frase deste canal: vale metade, e só ganha quando não há mais nada
  const nota = EMOCOES.map(([nome, lista]) => [nome, ws.filter((w) => lista.includes(w)).length * (nome === 'dinheiro' ? 0.5 : 1)]).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1])
  const escolha = nota.find(([nome]) => nome !== antes)
  if (escolha) return escolha[0]
  return antes === 'fala' ? 'neutra' : 'fala'
}
// a pose do corpo que combina com cada emoção
const POSE_DA_EMOCAO = { triste: 'desanimado', nervoso: 'desespero', susto: 'choque', feliz: 'festa', pensativo: 'queixo', vergonha: 'nuca', sono: 'ombros', suor: 'coca', dinheiro: 'mostra', perplexo: 'ombros', curioso: 'queixo', fala: 'mostra', neutra: 'neutra' }

// ── A LISTA (17/10, o Ed: "quando se fala… paguei o aluguel, a água, etc teria que surgir uma folha de
// caderno… e um cursor vai marcando com check"). Uma frase com 3 ou mais coisas seguidas, separadas por vírgula. ──
const ARTIGOS = new Set(['o', 'a', 'os', 'as', 'um', 'uma', 'meu', 'minha', 'meus', 'minhas', 'seu', 'sua'])
const NAO_E_ITEM = new Set(['voce', 'eu', 'ele', 'ela', 'nos', 'mesmo', 'mesma', 'todo', 'toda', 'todos', 'alguma', 'algum', 'so', 'ali', 'aqui', 'la', 'sabe', 'sei', 'que', 'quando', 'como', 'mas', 'porque', 'entao', 'depois', 'agora', 'sempre', 'nunca', 'ja', 'isso', 'tudo', 'nada', 'por', 'sem', 'com', 'para', 'pra', 'de', 'do', 'da', 'no', 'na', 'em', 'se', 'nao', 'teve', 'era', 'foi', 'tinha'])
function listaDa(c) {
  const partes = c.narration.split(/,|\se\s(?=(?:o|a|os|as|um|uma|meu|minha|até)\s)/i).map((x) => x.trim()).filter(Boolean)
  if (partes.length < 3) return null
  const itens = []
  partes.forEach((pt, k) => {
    let ws = pt.replace(/[.!?;:…]+$/g, '').split(/\s+/)
    if (k === 0) { const a = ws.map(norm).findLastIndex((w) => ARTIGOS.has(w)); ws = a >= 0 ? ws.slice(a) : ws.slice(-2) }
    while (ws.length && /^(e|ate|nem|mais|tambem|ainda)$/.test(norm(ws[0]))) ws = ws.slice(1)
    // um item é uma COISA: não começa por pronome, advérbio ou verbo solto ("você", "mesmo", "só", "sabe")
    const bom = ws.length && ws.length <= 4 && !pt.includes(':') && !NAO_E_ITEM.has(norm(ws[0]))
    itens.push(bom ? { ws, comArtigo: ARTIGOS.has(norm(ws[0])) } : null)
    if (/[.!?…]$/.test(pt)) itens.push(null) // a enumeração acaba no ponto
  })
  let melhor = [], atual = []
  for (const it of itens) { if (it) { atual.push(it); if (atual.length > melhor.length) melhor = [...atual] } else atual = [] }
  // pelo menos 3, e pelo menos 2 com cara de coisa ("o mercado", "a conta de luz") ou de uma palavra só ("luz")
  if (melhor.length < 3 || melhor.filter((x) => x.comArtigo || x.ws.length === 1).length < 2) return null
  return melhor.slice(0, 6).map(({ ws }) => {
    const sem = ARTIGOS.has(norm(ws[0])) && ws.length > 1 ? ws.slice(1) : ws
    const texto = sem.join(' ')
    return { texto: texto.charAt(0).toUpperCase() + texto.slice(1), t: quando(c, sem[0]) }
  })
}

// ── cada cena vira UMA tela do cartão (ou nenhuma: o boneco fica com o palco) ──
const telas = []
const fx = []
const POSE_DO_BONECO = {
  pensando: 'queixo', ombros: 'ombros', 'contar-moedas': 'mostra', 'rasgar-papel': 'choque', 'puxar-cabelo': 'desespero',
  'escorregar-banana': 'choque', 'bracos-cruzados': 'cruzados', facepalm: 'facepalm', susto: 'choque', bocejar: 'ombros',
  relogio: 'relogio', levantar: 'festa', apontar: 'apontar', ideia: 'ideia', 'super-heroi': 'heroi', 'suspiro-alivio': 'peito',
  'carregar-peso': 'ombros', 'sentar-derrotado': 'ombros', 'pesadelo-dividas': 'desespero', 'nervoso-dividas-pc': 'coca',
  'morder-unhas': 'queixo', 'abracar-cofrinho': 'peito', proteger: 'cruzados',
}
const poses = [] // [t, pose, onde] — onde: 'lado' (ao lado do cartão) | 'centro' (o palco é dele)
let ultimaFigura = null
for (const c of cenas) {
  const v = c.visual, t = c.inicio + 0.05
  const etiqueta = v.etiqueta?.valor ? { valor: dinheiro(v.etiqueta.valor), rotulo: curto(v.etiqueta.rotulo) } : null
  let tela = null
  switch (v.tipo) {
    case 'numero': {
      const aterra = quandoNumero(c)
      tela = { id: 'numero', t, valor: +v.valor || 0, rotulo: curto(v.rotulo), tom: tipoDoValor(v.valor), aterra }
      fx.push({ tipo: tela.tom === 'entra' ? 'brilho' : 'moedas', t: aterra })
      poses.push([t, 'neutra', 'lado'], [aterra - 0.1, tela.tom === 'sai' ? 'choque' : 'apontar', 'lado'])
      break
    }
    case 'ilustracao': case 'metafora': {
      const figura = v.figura || v.fio
      tela = { id: 'meta', t, figura, acao: v.tipo === 'metafora' ? (+v.estagio || 1) >= 2 : false, viraAcao: c.inicio + (c.fim - c.inicio) * 0.55 }
      ultimaFigura = figura
      poses.push([t, 'neutra', 'lado'], [c.inicio + 0.8, 'apontar', 'lado'])
      break
    }
    case 'foto':
      tela = { id: 'foto', t, ficheiro: v.ficheiro, movimento: v.movimento || 'aproxima' }
      poses.push([t, 'queixo', 'lado'])
      break
    case 'app':
      tela = { id: 'app', t, passo: +v.passo || 1, valor: +v.valor || 0, rotulo: curto(v.rotulo) }
      poses.push([t, 'apontar', 'lado'])
      break
    case 'broll':
      tela = { id: 'broll', t, valores: v.valores || null, comp: v.comp || '' }
      poses.push([t, 'apontar', 'lado'])
      break
    case 'conta':
      tela = { id: 'conta', t, linhas: (v.linhas || []).map((l) => ({ ...l, valor: +l.valor })), passo: Math.max(0.45, (c.fim - c.inicio - 1) / Math.max(1, (v.linhas || []).length)) }
      poses.push([t, 'queixo', 'lado'])
      break
    case 'frase':
      tela = { id: v.variante === 'chamada' ? 'chamada' : 'frase', t, texto: v.texto || '', etiqueta: v.etiquetaTexto || '' }
      poses.push([t, 'apontar', 'lado'])
      break
    case 'boneco': {
      const lista = listaDa(c)
      if (lista) { tela = { id: 'lista', t, itens: lista }; poses.push([t, 'apontar', 'lado']); break }
      // o boneco é a imagem: o cartão sai e ele vai para o meio do palco fazer o gesto
      tela = null
      poses.push([t, 'neutra', 'centro'], [c.inicio + 0.5, POSE_DO_BONECO[v.figura] || 'apontar', 'centro'])
      break
    }
    default: {
      const lista = listaDa(c)
      if (lista) { tela = { id: 'lista', t, itens: lista }; poses.push([t, 'apontar', 'lado']); break }
      // "palavras": a frase é a imagem. Se a voz chama um objeto, o cartão abre-se numa janela para ele;
      // senão o cartão sai e o boneco fala com as mãos (gestos pequenos, a alternar).
      const objs = objetosDa(c)
      if (objs.length) {
        const quebra = achar(c, PALAVRAS_EVENTO.quebra)[0]
        tela = { id: 'janela', t: Math.max(t, objs[0].t - 0.15), objetos: objs, quebra: quebra ? quebra.t : null }
        poses.push([t, 'neutra', 'lado'], [objs[0].t, 'apontar', 'lado'])
      } else {
        poses.push([t, 'neutra', 'centro']) // o momento do palco (abaixo) decide o resto
      }
    }
  }
  if (tela) { tela.etiqueta = etiqueta; tela.cena = c.i }
  telas.push(tela || { id: 'nada', t, cena: c.i })
  // os efeitos que as palavras chamam, em qualquer cena
  for (const p of achar(c, PALAVRAS_EVENTO.festa)) fx.push({ tipo: 'confete', t: p.t })
  for (const p of achar(c, PALAVRAS_EVENTO.susto)) fx.push({ tipo: 'raios', t: p.t })
  for (const p of achar(c, PALAVRAS_EVENTO.atraso)) fx.push({ tipo: 'papeis', t: p.t })
}
// ── a emoção de cada cena (com a pose que combina), e os MOMENTOS do palco vazio ──
// 17/10, o Ed: "pode ter sim um pequeno momento em que aparece só o bonequinho… mas é um tempo curto". Nas
// cenas sem tela, o boneco fica sozinho ~1,2 s e depois entra um momento, nunca o mesmo duas vezes seguidas:
//   close (a câmara no rosto dele), pensamento (balão a sair da cabeça), solto (um desenho grande sem fundo
//   preto, em cima da cor), cena (ele sentado, triste ou a descansar; ou aos pulos de alegria).
const emocoes = [] // [t, emoção]
let antes = null, ultimoMomento = null
const MOMENTO_DA_EMOCAO = { triste: ['close', 'cena'], nervoso: ['close', 'solto'], susto: ['close', 'solto'], feliz: ['cena', 'solto'], pensativo: ['pensamento', 'close'], vergonha: ['close', 'pensamento'], sono: ['cena', 'pensamento'], suor: ['solto', 'close'], dinheiro: ['solto', 'pensamento'], fala: ['solto', 'pensamento'], neutra: ['pensamento', 'solto'] }
const PENSAMENTO_DA_EMOCAO = { triste: 'nuvem', nervoso: 'raio', susto: 'exclamacao', feliz: 'coracao', pensativo: 'interrogacao', vergonha: 'reticencias', sono: 'zzz', suor: 'documento', dinheiro: 'moeda', fala: 'interrogacao', neutra: 'reticencias' }
const soltos = Object.entries(PALAVRAS_OBJETO)
telas.forEach((tela, k) => {
  const c = cenas[k]
  const em = emocaoDa(c, tela.id === 'nada' ? null : tela, antes); antes = em
  emocoes.push([c.inicio + 0.1, em])
  if (tela.id !== 'nada') { if (!['numero', 'lista'].includes(tela.id)) poses.push([c.inicio + 0.9, POSE_DA_EMOCAO[em] || 'neutra', 'lado']); return }
  // o objeto "solto": o desenho que a frase chama (até os de dinheiro, de peso 1), senão o fio do vídeo
  const achado = c.palavras.map((p) => soltos.find(([, [, ...l]]) => l.includes(norm(p.w)))).find(Boolean)
  // sem um objeto que a frase chame, não há desenho solto (o fio do vídeo repetido cansava): vai outro momento
  const opcoes = [...(MOMENTO_DA_EMOCAO[em] || []), 'close', 'pensamento', 'cena'].filter((m, i, a) => a.indexOf(m) === i && m !== ultimoMomento && (m !== 'solto' || achado))
  const momento = opcoes[0] || 'close'
  ultimoMomento = momento
  tela.momento = momento
  tela.emocao = em
  tela.depois = c.inicio + 1.2
  if (momento === 'solto') tela.solto = { tipo: 'obj', nome: achado[0] }
  if (momento === 'pensamento') tela.pensa = PENSAMENTO_DA_EMOCAO[em] || 'interrogacao'
  const onde = momento === 'close' ? 'close' : momento === 'solto' ? 'lado' : 'centro'
  const pose = momento === 'cena' ? (em === 'feliz' ? 'festa' : 'sentado') : POSE_DA_EMOCAO[em] || 'neutra'
  poses.push([tela.depois, pose, onde])
})
poses.sort((a, b) => a[0] - b[0])
// duas telas "nada" seguidas viram uma só se forem o MESMO momento (senão cada uma tem o seu)
const estados = telas.filter((e, k) => !(e.id === 'nada' && telas[k - 1]?.id === 'nada' && telas[k - 1].momento === e.momento))

// ── as manchetes: 1 a 3 palavras de cada cena, à volta da palavra que mais pesa ──
const VAZIAS = new Set(['o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas', 'de', 'do', 'da', 'dos', 'das', 'no', 'na', 'nos', 'nas', 'em', 'e', 'que', 'se', 'pra', 'para', 'por', 'pelo', 'pela', 'com', 'ao', 'aos', 'eu', 'voce', 'ele', 'ela', 'me', 'te', 'lhe', 'meu', 'minha', 'seu', 'sua', 'isso', 'esse', 'essa', 'isto', 'este', 'esta', 'aquilo', 'aquele', 'aquela', 'ja', 'mas', 'ou', 'tambem', 'so', 'foi', 'era', 'e', 'ser', 'ter', 'tem', 'tinha', 'estava', 'esta', 'como', 'quando', 'onde', 'ai', 'la', 'aqui', 'entao', 'olha', 'muito', 'mais', 'bem', 'tudo', 'todo', 'toda', 'cada', 'ainda', 'depois', 'agora', 'coisa', 'gente', 'assim', 'mesmo', 'vez', 'porque', 'quanto', 'disso', 'nisso', 'dele', 'dela', 'vai', 'vou', 'sei', 'fiz', 'faz', 'tava', 'nenhum', 'nenhuma', 'algum', 'alguma', 'aquela', 'tao', 'qual', 'quem'])
let MANCHETES_IA = {}
try { MANCHETES_IA = JSON.parse(fs.readFileSync(path.join(aqui, 'trabalho', slug, 'manchetes.json'), 'utf8')) } catch { /* sem ficheiro: regra automática */ }
const CORES = ['#FDE047', '#22D3EE', '#FF4FA0', '#FF5A4E', '#A3E635']
let corN = 0
function manchete(c, tela) {
  const ws = c.narration.replace(/[“”"«»]/g, '').split(/\s+/).filter(Boolean)
  const limpo = (w) => w.replace(/[.,;:!?…()]+$/g, '').replace(/^[(]+/, '')
  const pesa = (w) => { const n = norm(w); return VAZIAS.has(n) ? 0 : /\d/.test(w) ? 30 : n.length >= 5 ? n.length : n.length >= 3 ? 2 : 0 }
  // o número da tela (ou da etiqueta) manda: a manchete é o valor, e mais uma palavra se couber
  if (tela?.id === 'numero' || tela?.etiqueta) {
    const valor = tela.id === 'numero' ? dinheiro(tela.valor) : tela.etiqueta.valor
    const tv = tela.id === 'numero' ? tela.aterra : quandoNumero(c)
    return [{ palavras: [valor], primeira: tv, acende: [{ t: tv, cor: '#FF5A4E' }] }]
  }
  // a escolhida pela IA grátis (manchetes-longo.mjs), se passou na prova de ser um pedaço da frase
  const bordaBoa = (ws) => pesa(ws[ws.length - 1]) > 0 && (pesa(ws[0]) > 0 || /^(nao|nunca|sem|nem)$/.test(norm(ws[0])))
  const daIA = [].concat(MANCHETES_IA[c.id] || []).filter((m) => bordaBoa(m.split(/\s+/)))
  if (daIA.length) return daIA.map((m) => {
    const palavras = m.split(/\s+/)
    let kmax = 0; palavras.forEach((w, k) => { if (pesa(w) > pesa(palavras[kmax])) kmax = k })
    return { palavras, primeira: quando(c, palavras[0]), acende: palavras.map((w, k) => k === kmax ? { t: quando(c, w), cor: CORES[corN++ % CORES.length] } : null) }
  })
  let melhor = null
  for (let a = 0; a < ws.length; a++) for (let n = 1; n <= 3 && a + n <= ws.length; n++) {
    const jan = ws.slice(a, a + n), ultima = jan[n - 1]
    if (jan.slice(0, -1).some((w) => /[.!?;:,]$/.test(w))) continue // não atravessa uma vírgula ou um ponto
    if (pesa(jan[0]) === 0 && !/^(nao|nunca|sem|nem)$/.test(norm(jan[0]))) continue
    if (pesa(ultima) === 0 || norm(ultima).length < 4) continue // nunca acaba em "sem", "nem", "não"
    const txt = jan.map(limpo).join(' ')
    if (txt.length > 22) continue
    const nota = jan.reduce((s, w) => s + pesa(w), 0) + (n === 2 ? 3 : n === 3 ? 4 : 0)
    if (!melhor || nota > melhor.nota) melhor = { a, n, nota }
  }
  if (!melhor) return null
  const palavras = ws.slice(melhor.a, melhor.a + melhor.n).map(limpo)
  // acende a palavra mais pesada no instante em que é dita
  let kmax = 0; palavras.forEach((w, k) => { if (pesa(w) > pesa(palavras[kmax])) kmax = k })
  const acende = palavras.map((w, k) => k === kmax ? { t: quando(c, w), cor: CORES[corN++ % CORES.length] } : null)
  return [{ palavras, primeira: quando(c, palavras[0]), acende }]
}
// 🔴 17/10, o Ed: "os textos aqui em cima muitas vezes não estão sincronizados com o que se fala". A manchete
// entrava no começo da frase, e as palavras dela às vezes só eram ditas no fim. Agora entra 0,25 s antes de a
// voz dizer a 1.ª palavra dela, e sai quando a seguinte entra (ou no fim da cena).
const manchetes = []
cenas.forEach((c, k) => {
  const ms = (manchete(c, telas[k].id === 'nada' ? null : telas[k]) || []).sort((a, b) => a.primeira - b.primeira)
  ms.forEach((m, j) => {
    const entra = Math.max(c.inicio - 0.05, m.primeira - 0.25)
    const sai = j + 1 < ms.length ? Math.max(entra + 0.8, ms[j + 1].primeira - 0.3) : c.fim - 0.08
    if (sai - entra < 0.6) return
    manchetes.push({ palavras: m.palavras, acende: m.acende, entra, sai })
  })
})

// ── a cor do fundo: uma por capítulo; os números "maus" pintam de vermelho até à cena seguinte ──
const PALETA = ['#FFC72C', '#22D3EE', '#FF4FA0', '#5B8CFF', '#A78BFA', '#FF8A3D', '#A3E635', '#FFC72C']
const corDoCap = (cap, papel) => cap ? PALETA[cap % PALETA.length] : papel === 'hook' ? PALETA[0] : '#A3E635'
const inundacoes = [{ t: 0, cor: corDoCap(null, 'hook') }]
cenas.forEach((c, k) => {
  const base = corDoCap(c.capitulo, c.papel)
  const tela = telas[k]
  const cor = tela.id === 'numero' && tela.tom === 'sai' ? '#FF5A4E' : tela.id === 'numero' && tela.tom === 'entra' ? '#A3E635' : base
  const t = c.abre ? c.inicio - CARTAO_CAPITULO_FRAMES / FPS : c.inicio
  if (cor !== inundacoes[inundacoes.length - 1].cor) inundacoes.push({ t, cor })
})

// ── o cursor, CALMO: só aparece nas telas do app, do extrato e da chamada, e clica uma vez ──
const cursor = { visitas: [] }
for (const e of estados) {
  // a lista: o cursor marca cada item quando a voz o diz, e no fim clica no botão
  if (e.id === 'lista') {
    const c = cenas[e.cena]
    e.itens.forEach((it, k) => cursor.visitas.push({ entra: it.t + 0.1, clique: it.t + 0.5, sai: it.t + 0.85, alvo: 'item', item: k, n: e.itens.length }))
    e.botao = Math.min(c.fim - 0.4, e.itens[e.itens.length - 1].t + 1.2)
    cursor.visitas.push({ entra: e.botao - 0.5, clique: e.botao, sai: Math.min(c.fim, e.botao + 0.6), alvo: 'botao', n: e.itens.length })
    continue
  }
  if (!['app', 'broll', 'conta', 'chamada'].includes(e.id)) continue
  const c = cenas[e.cena]
  cursor.visitas.push({ entra: e.t + 0.6, clique: Math.min(c.fim - 0.6, e.t + 2.2), sai: c.fim - 0.2, alvo: e.id })
}

// ── a música: a calma, sempre (o longo respira mais do que o Short) ──
const musicas = JSON.parse(fs.readFileSync(path.join(aqui, 'musicas.json'), 'utf8'))
const ficheiroMusica = 'bg-serio.mp3'

const plano = {
  formato: 'longo', pagina: 'longo.html', largura: 1920, altura: 1080, qps: 30, sub: 2,
  slug, duracao: DUR, fimDoConteudo, batida: musicas[ficheiroMusica].batida,
  cenas: cenas.map((c) => ({ inicio: c.inicio, fim: c.fim, audio: c.audio, palavras: c.palavras, capitulo: c.capitulo })),
  estados, manchetes, sobreposicoes, inundacoes, poses, emocoes, fx, cursor, valoresDoMapa,
  musica: { ficheiro: ficheiroMusica, inicio: 0, laco: true },
}
const trab = path.join(aqui, 'trabalho', slug)
fs.mkdirSync(trab, { recursive: true })
fs.writeFileSync(path.join(trab, 'plano.json'), JSON.stringify(plano, null, 1))
const conta = (id) => estados.filter((e) => e.id === id).length
console.log(`plano longo: ${slug} · ${(DUR / 60).toFixed(2)} min · ${cenas.length} cenas · ${manchetes.length} manchetes · telas: ${['numero', 'meta', 'foto', 'app', 'broll', 'conta', 'janela', 'lista', 'frase', 'chamada', 'nada'].map((id) => `${id} ${conta(id)}`).join(', ')}`)
