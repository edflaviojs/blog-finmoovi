// O BONECO CONTRACENANDO (item 4 do pedido do Ed, 16/10/2026) — o mesmo esqueleto do Stickman.tsx e do piloto do longo,
// em tinta escura com a cabeça branca, pequeno, DENTRO da janela, ao lado do objeto.
// Entra a andar, olha para o objeto e reage ao que a voz diz: susto quando quebra, coça a cabeça no atraso,
// comemora na conquista, aponta no resto.
//   bonecoNaJanela(aj, ev) → SVG na caixa da janela (900×560).  aj = segundos desde que a janela abriu.
//   ev = { quebra, atraso, festa, susto } — segundos desde cada evento (ou null se ainda não aconteceu).
const BK = '#0d1117'
const BPOSES = {
  neutra: { lean: 0, head: 0, sL: 18, eL: 8, sR: -6, eR: -8, hL: 10, kL: 0, hR: -10, kR: 0, brow: 0, mouth: 0.2, eye: 1, open: 0 },
  aponta: { lean: 6, head: -4, sL: 14, eL: 10, sR: 98, eR: -6, hL: 12, kL: 0, hR: -8, kR: 0, brow: 6, mouth: 0.6, eye: 1, open: 0 },
  susto: { lean: -10, head: -10, sL: -128, eL: -35, sR: 128, eR: 35, hL: -4, kL: 12, hR: -24, kR: 6, brow: 22, mouth: 0, eye: 1.5, open: 1 },
  coca: { lean: 6, head: 12, sL: 18, eL: 8, sR: 165, eR: 75, hL: 10, kL: 0, hR: -10, kR: 0, brow: 20, mouth: -0.7, eye: 0.9, open: 0 },
  festa: { lean: -4, head: -8, sL: -150, eL: -20, sR: 150, eR: 20, hL: 14, kL: 10, hR: -14, kR: 10, brow: 10, mouth: 1, eye: 1.1, open: 0 },
}
const misturaPose = (a, b, p) => Object.fromEntries(Object.keys(a).map((k) => [k, a[k] + (b[k] - a[k]) * p]))
const segB = (o, ang, l) => ({ x: o.x + l * Math.sin(ang * Math.PI / 180), y: o.y + l * Math.cos(ang * Math.PI / 180) })

function bonecoNaJanela(aj, ev = {}) {
  // a pose sai do evento mais recente; cada troca de pose é uma mola
  // primeiro aponta para o objeto; os EVENTOS mandam sempre por cima disso, pela ordem em que acontecem
  const eventos = ['quebra', 'atraso', 'festa', 'susto'].filter((k) => ev[k] !== null && ev[k] !== undefined).map((k) => [{ quebra: 'susto', atraso: 'coca', festa: 'festa', susto: 'susto' }[k], aj - ev[k]]).sort((x, y) => x[1] - y[1])
  let pose = misturaPose(BPOSES.neutra, BPOSES.aponta, clamp(S(aj - 0.7, 1.8, 0.75), 0, 1.05))
  for (const [nome, t0] of eventos) pose = misturaPose(pose, BPOSES[nome], clamp(S(aj - t0, 2.4, 0.7), 0, 1.05))
  // depois do susto da quebra, coça a cabeça
  if (ev.quebra !== null && ev.quebra !== undefined) pose = misturaPose(pose, BPOSES.coca, clamp(S(ev.quebra - 0.9, 1.5, 0.8)))
  // entra a andar pela esquerda
  const anda = clamp(S(aj, 1.1, 1)), x0 = lerp(-90, 120, anda), andar = 1 - anda
  const fase = x0 * 0.06, pulo = ev.festa !== null && ev.festa !== undefined ? Math.abs(Math.sin(ev.festa * 9)) * 30 * Math.exp(-ev.festa * 0.8) : 0
  const ESC = 0.62, HEAD = 74 * ESC, TOR = 150 * ESC, UA = 92 * ESC, FA = 84 * ESC, UL = 108 * ESC, LL = 100 * ESC, STK = 16
  const chao = 500
  const hip = { x: x0, y: chao - UL - LL - pulo + Math.abs(Math.sin(fase)) * 6 * andar }
  const hL = pose.hL + Math.sin(fase) * 28 * andar, hR = pose.hR - Math.sin(fase) * 28 * andar
  const sh = segB(hip, 180 + pose.lean, TOR), hc = segB(sh, 180 + pose.lean + pose.head, HEAD + 12 * ESC)
  const eL = segB(sh, pose.sL, UA), mL = segB(eL, pose.sL + pose.eL, FA), eR = segB(sh, pose.sR, UA), mR = segB(eR, pose.sR + pose.eR, FA)
  const kL = segB(hip, hL, UL), fL = segB(kL, hL + pose.kL, LL), kR = segB(hip, hR, UL), fR = segB(kR, hR + pose.kR, LL)
  const L = (a, b) => `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}"/>`
  const s = HEAD / 60, ex = 22 * s, ey = hc.y - 6 * s, cx = hc.x + 8 * s, er = Math.max(2.5 * s, 8 * s * pose.eye), by = ey - 24 * s, bt = pose.brow * 0.6 * s, my = hc.y + 26 * s
  const boca = pose.open > 0.3 ? `<ellipse cx="${cx}" cy="${my}" rx="${10 * s}" ry="${13 * s * pose.open}" fill="${BK}"/>` : `<path d="M ${cx - 24 * s} ${my} Q ${cx} ${my + pose.mouth * 20 * s} ${cx + 24 * s} ${my}" stroke="${BK}" stroke-width="${7 * s}" fill="none" stroke-linecap="round"/>`
  return `<g><ellipse cx="${x0.toFixed(1)}" cy="${chao + 4}" rx="70" ry="10" fill="rgba(0,0,0,0.2)"/>
    <g stroke="${BK}" stroke-width="${STK}" stroke-linecap="round">${L(hip, kL)}${L(kL, fL)}${L(hip, kR)}${L(kR, fR)}${L(hip, sh)}${L(sh, eL)}${L(eL, mL)}${L(sh, eR)}${L(eR, mR)}</g>
    <circle cx="${hc.x.toFixed(1)}" cy="${hc.y.toFixed(1)}" r="${HEAD.toFixed(1)}" fill="#fff" stroke="${BK}" stroke-width="${STK}"/>
    <line x1="${cx - ex - 14 * s}" y1="${by + bt}" x2="${cx - ex + 14 * s}" y2="${by - bt}" stroke="${BK}" stroke-width="${8 * s}" stroke-linecap="round"/><line x1="${cx + ex - 14 * s}" y1="${by - bt}" x2="${cx + ex + 14 * s}" y2="${by + bt}" stroke="${BK}" stroke-width="${8 * s}" stroke-linecap="round"/>
    <circle cx="${cx - ex}" cy="${ey}" r="${er}" fill="${BK}"/><circle cx="${cx + ex}" cy="${ey}" r="${er}" fill="${BK}"/>${boca}</g>`
}
// objetos que já ocupam a esquerda da janela (o boneco ficaria por cima): nesses, o boneco não entra
const SEM_BONECO = new Set(['nota', 'moedas', 'grafico-sobe', 'grafico-desce', 'juros', 'banco', 'casa', 'onibus', 'aviao', 'moto', 'bicicleta', 'tesoura', 'corrente', 'emprestar', 'montanha', 'dado', 'sacola', 'lanche', 'chuveiro', 'torneira', 'obra', 'bandeira', 'ima', 'carrinho'])
