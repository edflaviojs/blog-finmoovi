// AS 33 METÁFORAS DO CANAL (lista de schema-short.js), desenhadas para o molde novo.
// Cada uma é uma função (a, modo) → SVG numa caixa de 560×560:
//   a    = segundos desde que a metáfora entrou no cartão
//   modo = 'apresenta' (a imagem chega e respira) | 'acao' (acontece o que ela quer dizer)
// Só funções puras do tempo — o mesmo instante desenha sempre igual.
// Precisa de S (mola), clamp, lerp e pulse, definidos na página.
const MW = '#f0f6fc', MG = '#30363d', MG2 = '#484f58', MY = '#FDE047', MR = '#FF5A4E', MC = '#22D3EE', MV = '#A78BFA', MK = '#0d1117'
const moeda = (x, y, r = 30, op = 1) => `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})" opacity="${op.toFixed(3)}"><circle r="${r}" fill="${MY}"/><text y="${(r * 0.3).toFixed(1)}" text-anchor="middle" font-family="Unbounded" font-weight="800" font-size="${(r * 0.72).toFixed(1)}" fill="#6b4f00">R$</text></g>`
const chao = (y = 440) => `<line x1="40" y1="${y}" x2="520" y2="${y}" stroke="${MG}" stroke-width="8" stroke-linecap="round"/>`
const mola = (a, f = 2, z = 0.7) => clamp(S(a, f, z), 0, 1.15)
const fase = (a, ini, dur) => clamp((a - ini) / dur)

const METAFORAS = {
  // ── as quatro primeiras ──
  domino(a, modo) {
    let s = ''
    for (let i = 0; i < 5; i++) {
      const x = -10 + i * 100, ini = 0.15 + i * 0.13
      const ang = modo === 'acao' ? 66 * clamp(S(a - ini, 2.4, 0.75), 0, 1.02) : (i === 0 ? 6 * Math.sin(a * 6) * Math.exp(-a * 1.5) : 0)
      s += `<g transform="rotate(${ang.toFixed(2)} ${x + 52} 430)"><rect x="${x}" y="190" width="52" height="240" rx="12" fill="${i === 0 ? MR : MW}"/><circle cx="${x + 26}" cy="250" r="9" fill="${MK}"/><circle cx="${x + 26}" cy="370" r="9" fill="${MK}"/><line x1="${x + 8}" y1="310" x2="${x + 44}" y2="310" stroke="${MK}" stroke-width="5"/></g>`
    }
    return s + `<line x1="-40" y1="432" x2="620" y2="432" stroke="${MG}" stroke-width="6" stroke-linecap="round"/>`
  },
  ampulheta(a, modo) {
    const vira = modo === 'apresenta' ? 180 * (1 - clamp(S(a, 1.4, 0.7), 0, 1.05)) : 0
    const p = modo === 'acao' ? clamp(a / 2.2) : 0.08
    const topo = 150 * (1 - p), baixo = 150 * p
    return `<g transform="rotate(${vira.toFixed(2)} 280 280)">
      <rect x="150" y="96" width="260" height="26" rx="13" fill="${MW}"/><rect x="150" y="438" width="260" height="26" rx="13" fill="${MW}"/>
      <path d="M180 122 L380 122 L292 280 L380 438 L180 438 L268 280 Z" fill="none" stroke="${MW}" stroke-width="10" stroke-linejoin="round"/>
      <clipPath id="ampC"><path d="M186 128 L374 128 L286 280 L374 432 L186 432 L274 280 Z"/></clipPath>
      <g clip-path="url(#ampC)"><rect x="150" y="${(280 - topo).toFixed(1)}" width="260" height="${topo.toFixed(1)}" fill="${MY}"/><rect x="150" y="${(432 - baixo).toFixed(1)}" width="260" height="${baixo.toFixed(1)}" fill="${MY}"/>
      ${p > 0.02 && p < 0.98 ? `<rect x="276" y="270" width="8" height="160" fill="${MY}"/>` : ''}</g></g>`
  },
  cofre(a, modo) {
    const abre = modo === 'apresenta' ? clamp(S(a - 0.3, 1.6, 0.7), 0, 1.05) : 1 - clamp(S(a - 1.4, 2.6, 0.7), 0, 1.05)
    let moedas = ''
    if (modo === 'acao') for (let i = 0; i < 4; i++) { const u = fase(a, 0.1 + 0.22 * i, 0.55); if (u > 0 && u < 1) moedas += moeda(lerp(500, 270, u), lerp(120, 300, u) - 120 * Math.sin(Math.PI * u)) }
    return `<rect x="110" y="120" width="340" height="320" rx="34" fill="#21262d" stroke="${MW}" stroke-width="10"/>
      <circle cx="280" cy="280" r="44" fill="none" stroke="${MG2}" stroke-width="10"/>${moedas}
      <g transform="translate(110 0) scale(${(1 - 0.85 * abre).toFixed(3)} 1) translate(-110 0)"><rect x="110" y="120" width="340" height="320" rx="34" fill="${MG}" stroke="${MW}" stroke-width="10"/><circle cx="350" cy="280" r="42" fill="none" stroke="${MW}" stroke-width="10"/><line x1="350" y1="246" x2="350" y2="314" stroke="${MW}" stroke-width="9" stroke-linecap="round"/></g>
      <rect x="140" y="440" width="44" height="26" rx="8" fill="${MW}"/><rect x="376" y="440" width="44" height="26" rx="8" fill="${MW}"/>`
  },
  ralo(a, modo) {
    const g = modo === 'acao' ? 90 * S(a, 1.2, 0.7) : 30 * Math.sin(a * 2)
    return `<circle cx="280" cy="280" r="200" fill="none" stroke="${MG}" stroke-width="10"/><circle cx="280" cy="280" r="140" fill="none" stroke="${MG}" stroke-width="10"/><circle cx="280" cy="280" r="80" fill="none" stroke="${MG}" stroke-width="10"/><circle cx="280" cy="280" r="38" fill="#010409"/>
      <g transform="rotate(${g.toFixed(2)} 280 280)" stroke="${MG2}" stroke-width="10" stroke-linecap="round"><line x1="280" y1="96" x2="280" y2="242"/><line x1="280" y1="318" x2="280" y2="464"/><line x1="96" y1="280" x2="242" y2="280"/><line x1="318" y1="280" x2="464" y2="280"/></g>`
  },

  // ── efeito que se acumula ──
  'bola-neve'(a, modo) {
    // a bola desce a rampa e cresce a cada volta
    const u = modo === 'acao' ? fase(a, 0, 2.2) : 0.15 + 0.05 * Math.sin(a * 2)
    const r = lerp(44, 120, u * u), x = lerp(90, 400, u), y = lerp(150, 430, u) - r
    return `<line x1="40" y1="130" x2="520" y2="450" stroke="${MG}" stroke-width="10" stroke-linecap="round"/>
      <g transform="translate(${x.toFixed(1)} ${(y + 18).toFixed(1)}) rotate(${(u * 720).toFixed(1)})"><circle r="${r.toFixed(1)}" fill="${MW}"/><path d="M${(-r * 0.5).toFixed(1)} ${(-r * 0.2).toFixed(1)} q${(r * 0.3).toFixed(1)} ${(-r * 0.4).toFixed(1)} ${(r * 0.6).toFixed(1)} 0" fill="none" stroke="#c9d1d9" stroke-width="8" stroke-linecap="round"/></g>`
  },
  avalanche(a, modo) {
    // a pilha no topo cede e desaba encosta abaixo
    let s = `<path d="M40 470 L520 470 L520 180 Z" fill="#21262d" stroke="${MG}" stroke-width="8" stroke-linejoin="round"/>`
    for (let i = 0; i < 9; i++) {
      const col = i % 3, lin = Math.floor(i / 3), x0 = 400 + col * 42, y0 = 150 - lin * 40
      const u = modo === 'acao' ? clamp(S(a - 0.1 - i * 0.07, 1.4, 1)) : 0
      const tremor = modo === 'apresenta' ? 3 * Math.sin(a * 30 + i) * Math.exp(-a) : 0
      s += `<rect x="${(lerp(x0, x0 - 330, u) + tremor).toFixed(1)}" y="${lerp(y0, 420 - lin * 36, u).toFixed(1)}" width="38" height="34" rx="8" fill="${i % 4 === 0 ? MY : MW}" transform="rotate(${(u * 200 * (i % 2 ? 1 : -1)).toFixed(1)} ${(lerp(x0, x0 - 330, u) + 19).toFixed(1)} ${(lerp(y0, 420 - lin * 36, u) + 17).toFixed(1)})"/>`
    }
    return s
  },
  escorregao(a, modo) {
    // a moeda pisa na casca de banana e voa
    const u = modo === 'acao' ? fase(a, 0, 1.6) : 0
    const x = modo === 'acao' ? lerp(80, 420, u) : 80 + 10 * Math.sin(a * 3)
    const voo = u > 0.45 ? Math.sin(Math.PI * clamp((u - 0.45) / 0.55)) * 170 : 0
    const giro = u > 0.45 ? (u - 0.45) * 900 : 0
    return chao(440) + `<path d="M230 432 q50 -40 110 0 q-55 -18 -110 0z" fill="${MY}" stroke="#b08900" stroke-width="5"/>` +
      `<g transform="translate(${x.toFixed(1)} ${(400 - voo).toFixed(1)}) rotate(${giro.toFixed(1)})">${moeda(0, 0, 40)}</g>`
  },
  'clique-link'(a, modo) {
    // o botão do app a ser carregado (a chamada do fim)
    const p = modo === 'acao' ? pulse(a - 0.4, 3) : 0.2 * pulse((a % 1.2), 2)
    const anel = modo === 'acao' ? fase(a, 0.4, 0.8) : 0
    return `<rect x="70" y="210" width="420" height="140" rx="70" fill="${MC}" transform="translate(280 280) scale(${(1 - 0.06 * p).toFixed(3)}) translate(-280 -280)"/>
      <text x="280" y="296" text-anchor="middle" font-family="Unbounded" font-weight="800" font-size="44" fill="${MK}">FinMoovi</text>
      ${anel > 0 && anel < 1 ? `<rect x="${(70 - 40 * anel).toFixed(1)}" y="${(210 - 40 * anel).toFixed(1)}" width="${(420 + 80 * anel).toFixed(1)}" height="${(140 + 80 * anel).toFixed(1)}" rx="${(70 + 40 * anel).toFixed(1)}" fill="none" stroke="${MC}" stroke-width="8" opacity="${(1 - anel).toFixed(3)}"/>` : ''}
      <path transform="translate(330 300) scale(${(3.2 - 0.3 * p).toFixed(3)})" d="M4 2.5 L4 26.5 L10.2 20.6 L14.3 30 L18.6 28.1 L14.6 19 L23 19 Z" fill="${MK}" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/>`
  },
  foguete(a, modo) {
    // treme na base e decola
    const sobe = modo === 'acao' ? 520 * Math.pow(fase(a, 0.3, 1.5), 2) : 0
    const tremor = (modo === 'apresenta' || a < 0.3) ? 3 * Math.sin(a * 60) : 0
    const chama = 40 + 18 * Math.sin(a * 40) + (modo === 'acao' ? 50 : 0)
    return chao(470) + `<g transform="translate(${(280 + tremor).toFixed(1)} ${(300 - sobe).toFixed(1)})">
      <path d="M-22 110 Q0 ${(110 + chama).toFixed(1)} 22 110 Z" fill="${MY}"/><path d="M-12 110 Q0 ${(110 + chama * 0.6).toFixed(1)} 12 110 Z" fill="${MR}"/>
      <path d="M0 -150 C50 -100 50 40 40 110 L-40 110 C-50 40 -50 -100 0 -150 Z" fill="${MW}"/>
      <circle cy="-40" r="22" fill="${MC}" stroke="${MK}" stroke-width="6"/>
      <path d="M-40 60 L-80 120 L-40 110 Z M40 60 L80 120 L40 110 Z" fill="${MR}"/></g>`
  },
  semente(a, modo) {
    // a semente cai na terra e o broto cresce
    const cai = modo === 'apresenta' ? mola(a, 1.6, 0.6) : 1
    const g = modo === 'acao' ? fase(a, 0.1, 1.8) : 0
    const h = 230 * g, folha = clamp((g - 0.4) / 0.6)
    return `<rect x="60" y="400" width="440" height="70" rx="20" fill="#5c3b1e"/>
      <ellipse cx="280" cy="${lerp(80, 396, cai).toFixed(1)}" rx="20" ry="13" fill="${MY}"/>
      ${g > 0 ? `<path d="M280 400 V${(400 - h).toFixed(1)}" stroke="#4ade80" stroke-width="12" stroke-linecap="round"/>
      <path d="M280 ${(400 - h * 0.6).toFixed(1)} c-${(70 * folha).toFixed(1)} -${(10 * folha).toFixed(1)} -${(90 * folha).toFixed(1)} -${(60 * folha).toFixed(1)} -${(90 * folha).toFixed(1)} -${(70 * folha).toFixed(1)} c${(50 * folha).toFixed(1)} 0 ${(80 * folha).toFixed(1)} ${(30 * folha).toFixed(1)} ${(90 * folha).toFixed(1)} ${(70 * folha).toFixed(1)}z" fill="#4ade80"/>
      <path d="M280 ${(400 - h * 0.85).toFixed(1)} c${(70 * folha).toFixed(1)} -${(10 * folha).toFixed(1)} ${(90 * folha).toFixed(1)} -${(60 * folha).toFixed(1)} ${(90 * folha).toFixed(1)} -${(70 * folha).toFixed(1)} c-${(50 * folha).toFixed(1)} 0 -${(80 * folha).toFixed(1)} ${(30 * folha).toFixed(1)} -${(90 * folha).toFixed(1)} ${(70 * folha).toFixed(1)}z" fill="#4ade80"/>` : ''}`
  },
  'montanha-russa'(a, modo) {
    // o carrinho sobe e desce o trilho
    const Y = (x) => 300 - 120 * Math.sin((x - 40) / 480 * Math.PI * 2.5)
    let d = 'M40 ' + Y(40).toFixed(1); for (let x = 50; x <= 520; x += 10) d += ` L${x} ${Y(x).toFixed(1)}`
    const u = modo === 'acao' ? fase(a, 0, 2.4) : 0.08 + 0.03 * Math.sin(a * 2)
    const x = lerp(60, 500, u), y = Y(x), ang = Math.atan2(Y(x + 1) - Y(x - 1), 2) * 180 / Math.PI
    return `<path d="${d}" fill="none" stroke="${MG2}" stroke-width="10" stroke-linecap="round"/>
      <g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${ang.toFixed(1)})"><rect x="-40" y="-56" width="80" height="44" rx="12" fill="${MR}"/><circle cx="-22" cy="-8" r="10" fill="${MW}"/><circle cx="22" cy="-8" r="10" fill="${MW}"/></g>`
  },
  bolha(a, modo) {
    // a bolha incha até estourar em gotas
    const r = modo === 'acao' ? lerp(90, 190, fase(a, 0, 1.2)) : 90 + 6 * Math.sin(a * 3)
    const estoura = modo === 'acao' ? fase(a, 1.2, 0.6) : 0
    if (estoura > 0) {
      let s = ''
      for (let i = 0; i < 12; i++) { const ang = i / 12 * Math.PI * 2, d = 190 + 120 * estoura; s += `<circle cx="${(280 + Math.cos(ang) * d).toFixed(1)}" cy="${(280 + Math.sin(ang) * d).toFixed(1)}" r="${(12 * (1 - estoura)).toFixed(1)}" fill="${MC}"/>` }
      return s
    }
    return `<circle cx="280" cy="280" r="${r.toFixed(1)}" fill="${MC}22" stroke="${MC}" stroke-width="8"/><path d="M${(280 - r * 0.55).toFixed(1)} ${(280 - r * 0.3).toFixed(1)} q${(r * 0.15).toFixed(1)} ${(-r * 0.35).toFixed(1)} ${(r * 0.45).toFixed(1)} ${(-r * 0.4).toFixed(1)}" fill="none" stroke="${MW}" stroke-width="10" stroke-linecap="round"/>`
  },

  // ── comparar e decidir ──
  balanca(a, modo) {
    // os pratos equilibram e depois um lado pesa
    const ang = modo === 'acao' ? 16 * mola(a - 0.2, 1.4, 0.55) : 5 * Math.sin(a * 2.5)
    const r = ang * Math.PI / 180, dx = 170 * Math.cos(r), dy = 170 * Math.sin(r)
    const prato = (x, y, coisas) => `<line x1="${x}" y1="${y}" x2="${x - 50}" y2="${y + 110}" stroke="${MW}" stroke-width="5"/><line x1="${x}" y1="${y}" x2="${x + 50}" y2="${y + 110}" stroke="${MW}" stroke-width="5"/><path d="M${x - 70} ${y + 110} h140 a70 26 0 0 1 -140 0z" fill="${MW}"/>${coisas}`
    return `<rect x="200" y="440" width="160" height="22" rx="11" fill="${MW}"/><line x1="280" y1="440" x2="280" y2="150" stroke="${MW}" stroke-width="12"/>
      <line x1="${(280 - dx).toFixed(1)}" y1="${(150 - dy).toFixed(1)}" x2="${(280 + dx).toFixed(1)}" y2="${(150 + dy).toFixed(1)}" stroke="${MW}" stroke-width="12" stroke-linecap="round"/><circle cx="280" cy="150" r="16" fill="${MR}"/>
      ${prato(280 - dx, 150 - dy, moeda(280 - dx, 150 - dy + 88, 22))}
      ${prato(280 + dx, 150 + dy, moeda(280 + dx - 24, 150 + dy + 88, 22) + moeda(280 + dx + 24, 150 + dy + 88, 22) + moeda(280 + dx, 150 + dy + 60, 22))}`
  },
  bifurcacao(a, modo) {
    // a estrada abre-se em duas e o ponto escolhe uma
    const u = modo === 'acao' ? fase(a, 0, 1.8) : 0.05
    const p = u < 0.45 ? { x: 280, y: lerp(470, 300, u / 0.45) } : { x: lerp(280, 440, (u - 0.45) / 0.55), y: lerp(300, 110, (u - 0.45) / 0.55) }
    return `<path d="M280 480 V300 L120 110 M280 300 L440 110" fill="none" stroke="${MG2}" stroke-width="44" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M280 480 V300 L120 110 M280 300 L440 110" fill="none" stroke="${MW}" stroke-width="5" stroke-dasharray="18 18" stroke-linecap="round"/>
      ${u > 0.6 ? `<path d="M100 80 l40 40 m0 -40 l-40 40" stroke="${MR}" stroke-width="12" stroke-linecap="round" opacity="${clamp((u - 0.6) * 4).toFixed(2)}"/>` : ''}
      <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="26" fill="${MY}" stroke="${MK}" stroke-width="6"/>`
  },
  'duas-portas'(a, modo) {
    // duas portas: uma abre, a outra tranca
    const abre = modo === 'acao' ? mola(a - 0.2, 1.5, 0.7) : 0
    const tranca = modo === 'acao' ? mola(a - 0.8, 3, 0.6) : 0
    const porta = (x, cor, s) => `<rect x="${x}" y="110" width="160" height="320" rx="14" fill="#010409" stroke="${MW}" stroke-width="8"/><g transform="translate(${x} 0) scale(${s.toFixed(3)} 1) translate(${-x} 0)"><rect x="${x}" y="110" width="160" height="320" rx="14" fill="${cor}"/><circle cx="${x + 130}" cy="280" r="10" fill="${MK}"/></g>`
    return porta(70, MC, 1 - 0.8 * Math.min(1, abre)) + porta(330, MV, 1) +
      (tranca > 0 ? `<g transform="translate(410 280) scale(${tranca.toFixed(3)})"><rect x="-40" y="-20" width="80" height="64" rx="12" fill="${MR}"/><path d="M-24 -20 v-18 a24 24 0 0 1 48 0 v18" fill="none" stroke="${MR}" stroke-width="10"/></g>` : '')
  },
  semaforo(a, modo) {
    // vermelho, amarelo, verde — a hora de parar ou de seguir
    const t = modo === 'acao' ? a : 0
    const on = t < 0.6 ? 0 : t < 1.2 ? 1 : 2
    const cores = [MR, MY, '#4ade80']
    let s = `<rect x="200" y="60" width="160" height="400" rx="40" fill="#21262d" stroke="${MW}" stroke-width="8"/><rect x="268" y="460" width="24" height="60" fill="${MW}"/>`
    for (let i = 0; i < 3; i++) s += `<circle cx="280" cy="${140 + i * 120}" r="44" fill="${cores[i]}" opacity="${i === on ? 1 : 0.16}"/>`
    return s
  },
  gangorra(a, modo) {
    // o sobe e desce que não para
    const amp = modo === 'acao' ? 18 : 8
    const ang = amp * Math.sin(a * (modo === 'acao' ? 5 : 2.5))
    return `<path d="M240 440 L280 360 L320 440 Z" fill="${MW}"/>${chao(442)}
      <g transform="rotate(${ang.toFixed(2)} 280 352)"><rect x="60" y="340" width="440" height="22" rx="11" fill="${MW}"/>${moeda(110, 300, 34)}<rect x="400" y="280" width="70" height="60" rx="12" fill="${MR}"/></g>`
  },
  'corda-bamba'(a, modo) {
    // a moeda tenta equilibrar-se na corda, sem rede
    const amp = modo === 'acao' ? 22 * (1 + 0.6 * Math.sin(a * 1.3)) : 10
    const ang = amp * Math.sin(a * 4)
    const x = 280 + 60 * Math.sin(a * 1.1)
    const desce = 14 * Math.sin(Math.PI * (x - 60) / 440)
    return `<rect x="40" y="200" width="22" height="270" fill="${MG2}"/><rect x="498" y="200" width="22" height="270" fill="${MG2}"/>
      <path d="M50 210 Q${x.toFixed(1)} ${(230 + desce).toFixed(1)} 510 210" fill="none" stroke="${MW}" stroke-width="6"/>
      <g transform="translate(${x.toFixed(1)} ${(185 + desce).toFixed(1)}) rotate(${ang.toFixed(1)})"><line x1="-110" y1="-30" x2="110" y2="-30" stroke="${MW}" stroke-width="8" stroke-linecap="round"/>${moeda(0, -20, 32)}</g>`
  },

  // ── o tempo ──
  relogio(a, modo) {
    // os ponteiros correm contra você
    const v = modo === 'acao' ? 720 * Math.pow(fase(a, 0, 2), 1.5) : 6 * a
    let s = `<circle cx="280" cy="280" r="190" fill="#21262d" stroke="${MW}" stroke-width="12"/>`
    for (let i = 0; i < 12; i++) { const g = i / 12 * Math.PI * 2; s += `<line x1="${(280 + Math.sin(g) * 160).toFixed(1)}" y1="${(280 - Math.cos(g) * 160).toFixed(1)}" x2="${(280 + Math.sin(g) * 176).toFixed(1)}" y2="${(280 - Math.cos(g) * 176).toFixed(1)}" stroke="${MW}" stroke-width="8" stroke-linecap="round"/>` }
    return s + `<line x1="280" y1="280" x2="280" y2="170" stroke="${MW}" stroke-width="14" stroke-linecap="round" transform="rotate(${(v / 12).toFixed(1)} 280 280)"/>
      <line x1="280" y1="280" x2="280" y2="130" stroke="${MR}" stroke-width="8" stroke-linecap="round" transform="rotate(${v.toFixed(1)} 280 280)"/><circle cx="280" cy="280" r="14" fill="${MR}"/>`
  },
  vela(a, modo) {
    // a vela a derreter enquanto se espera
    const h = modo === 'acao' ? lerp(260, 70, fase(a, 0, 2.2)) : 260
    const top = 460 - h, flick = 1 + 0.12 * Math.sin(a * 23) + 0.08 * Math.sin(a * 37)
    return `<rect x="150" y="460" width="260" height="20" rx="10" fill="${MG2}"/><rect x="230" y="${top.toFixed(1)}" width="100" height="${h.toFixed(1)}" rx="12" fill="${MW}"/>
      <path d="M260 ${top.toFixed(1)} q10 30 0 50" stroke="#c9d1d9" stroke-width="10" fill="none" stroke-linecap="round"/>
      <line x1="280" y1="${top.toFixed(1)}" x2="280" y2="${(top - 20).toFixed(1)}" stroke="${MK}" stroke-width="5"/>
      <path transform="translate(280 ${(top - 22).toFixed(1)}) scale(1 ${flick.toFixed(3)})" d="M0 0 C-26 -20 -18 -62 0 -86 C18 -62 26 -20 0 0 Z" fill="${MY}"/><path transform="translate(280 ${(top - 22).toFixed(1)}) scale(1 ${flick.toFixed(3)})" d="M0 0 C-12 -10 -8 -34 0 -46 C8 -34 12 -10 0 0 Z" fill="${MR}"/>`
  },
  'trem-perdido'(a, modo) {
    // o trem parte e a chance vai-se embora
    const x = modo === 'acao' ? 140 + 520 * Math.pow(fase(a, 0.2, 1.6), 2) : 140 + 4 * Math.sin(a * 20)
    return `<rect x="20" y="400" width="520" height="16" rx="8" fill="${MG2}"/><rect x="20" y="430" width="200" height="50" rx="10" fill="#21262d"/>
      <g transform="translate(${x.toFixed(1)} 0)"><rect x="0" y="230" width="300" height="160" rx="24" fill="${MR}"/>${[30, 120, 210].map((wx) => `<rect x="${wx}" y="260" width="60" height="50" rx="10" fill="${MW}"/>`).join('')}<circle cx="60" cy="392" r="26" fill="${MK}"/><circle cx="240" cy="392" r="26" fill="${MK}"/></g>
      ${modo === 'acao' ? `<path d="M80 470 l12 -20" stroke="${MW}" stroke-width="6" opacity="0"/>` : ''}`
  },
  ampulhetaVazia: null,

  // ── o peso e a armadilha ──
  'bola-de-ferro'(a, modo) {
    // a corrente presa ao pé com a bola que pesa
    const cai = modo === 'acao' ? Math.min(1, mola(a, 1.3, 0.45)) : 0.4 + 0.05 * Math.sin(a * 3)
    const by = lerp(120, 380, cai), bx = 330
    let elos = ''
    for (let i = 0; i <= 6; i++) { const u = i / 6; elos += `<ellipse cx="${lerp(120, bx - 60, u).toFixed(1)}" cy="${lerp(420, by, u).toFixed(1)}" rx="18" ry="11" fill="none" stroke="${MG2}" stroke-width="7" transform="rotate(${i % 2 ? 60 : -20} ${lerp(120, bx - 60, u).toFixed(1)} ${lerp(420, by, u).toFixed(1)})"/>` }
    return chao(462) + `<rect x="80" y="400" width="80" height="44" rx="14" fill="${MW}"/>` + elos +
      `<circle cx="${bx}" cy="${by.toFixed(1)}" r="80" fill="#21262d" stroke="${MW}" stroke-width="10"/><text x="${bx}" y="${(by + 16).toFixed(1)}" text-anchor="middle" font-family="Unbounded" font-weight="900" font-size="48" fill="${MR}">R$</text>`
  },
  ratoeira(a, modo) {
    // a moeda é a isca; a mola fecha
    const fecha = modo === 'acao' ? clamp(S(a - 0.5, 4, 0.6), 0, 1.08) : 0
    const ang = lerp(-170, 0, fecha)
    return `<rect x="70" y="360" width="420" height="70" rx="18" fill="#b5835a"/><rect x="70" y="420" width="420" height="16" rx="8" fill="#8a5a33"/>
      ${moeda(400, 330, 34)}
      <g transform="rotate(${ang.toFixed(1)} 270 360)"><rect x="270" y="352" width="190" height="16" rx="8" fill="${MW}"/></g>
      <circle cx="270" cy="360" r="18" fill="${MG2}"/>${fecha > 0.95 ? `<g opacity="${clamp(2 - a).toFixed(2)}"><path d="M300 260 l-20 -40 M340 250 l0 -46 M380 260 l20 -40" stroke="${MY}" stroke-width="8" stroke-linecap="round"/></g>` : ''}`
  },
  'mochila-pedras'(a, modo) {
    // cada mês uma pedra a mais na mochila
    let pedras = ''
    const n = modo === 'acao' ? 5 : 2
    for (let i = 0; i < n; i++) {
      const u = modo === 'acao' ? (i < 2 ? 1 : clamp(S(a - 0.2 - (i - 2) * 0.35, 2.4, 0.6), 0, 1.05)) : 1
      const x = 210 + (i % 3) * 70, y = 300 - Math.floor(i / 3) * 60
      pedras += `<ellipse cx="${x}" cy="${lerp(40, y, u).toFixed(1)}" rx="40" ry="30" fill="${i % 2 ? '#8b949e' : '#6e7681'}"/>`
    }
    const pesa = modo === 'acao' ? 18 * fase(a, 0.4, 1.2) : 0
    return `<g transform="translate(0 ${pesa.toFixed(1)})"><path d="M220 170 v-30 a60 40 0 0 1 120 0 v30" fill="none" stroke="${MW}" stroke-width="12"/>
      <rect x="150" y="170" width="260" height="${(270 - pesa).toFixed(1)}" rx="40" fill="${MV}"/>${pedras}<rect x="190" y="300" width="180" height="${(100 - pesa).toFixed(1)}" rx="20" fill="#8b6fe0"/></g>`
  },
  'areia-movedica'(a, modo) {
    // quanto mais se debate, mais afunda
    const afunda = modo === 'acao' ? fase(a, 0, 2) : 0.1
    const deb = Math.sin(a * 12) * 14 * (modo === 'acao' ? 1 : 0.3)
    let ondas = ''
    for (let i = 0; i < 3; i++) { const r = ((a * 60 + i * 50) % 150); ondas += `<ellipse cx="280" cy="330" rx="${(60 + r).toFixed(1)}" ry="${((60 + r) * 0.2).toFixed(1)}" fill="none" stroke="#e3b341" stroke-width="5" opacity="${(1 - r / 150).toFixed(2)}"/>` }
    return `<clipPath id="areiaC"><rect x="0" y="0" width="560" height="330"/></clipPath>
      <g clip-path="url(#areiaC)"><g transform="translate(${(280 + deb).toFixed(1)} ${lerp(250, 400, afunda).toFixed(1)})">${moeda(0, 0, 70)}</g></g>
      <rect x="40" y="330" width="480" height="150" rx="30" fill="#c79a3c"/>${ondas}`
  },
  'balde-furado'(a, modo) {
    // enche por cima e perde por baixo
    let s = `<path d="M170 180 L390 180 L360 440 L200 440 Z" fill="#21262d" stroke="${MW}" stroke-width="10" stroke-linejoin="round"/><path d="M180 180 q100 -110 200 0" fill="none" stroke="${MW}" stroke-width="8"/>`
    const t = modo === 'acao' ? a : a * 0.4
    for (let i = 0; i < 4; i++) { const u = ((t * 0.9 + i * 0.25) % 1); s += moeda(280 + (i % 2 ? 30 : -30), lerp(40, 360, u), 24, u < 0.85 ? 1 : (1 - u) / 0.15) }
    for (let i = 0; i < 3; i++) { const u = ((t * 1.3 + i * 0.33) % 1); s += `<circle cx="${230 + i * 50}" cy="${(450 + u * 90).toFixed(1)}" r="${(9 * (1 - u)).toFixed(1)}" fill="${MY}"/>` }
    return s + [230, 280, 330].map((x) => `<circle cx="${x}" cy="432" r="8" fill="#010409"/>`).join('')
  },
  buraco(a, modo) {
    // quanto mais cava, mais fundo fica
    const fundo = modo === 'acao' ? lerp(60, 250, fase(a, 0, 2)) : 60
    let terra = ''
    if (modo === 'acao') for (let i = 0; i < 6; i++) { const u = ((a * 1.6 + i / 6) % 1); terra += `<circle cx="${(260 + 120 * u + i * 6).toFixed(1)}" cy="${(220 - 160 * Math.sin(Math.PI * u)).toFixed(1)}" r="10" fill="#8a5a33"/>` }
    return `<rect x="30" y="200" width="500" height="290" rx="20" fill="#8a5a33"/><path d="M150 200 L410 200 L370 ${(200 + fundo).toFixed(1)} L190 ${(200 + fundo).toFixed(1)} Z" fill="#010409"/>${terra}
      <g transform="rotate(${(modo === 'acao' ? 20 * Math.sin(a * 6) : 0).toFixed(1)} 300 ${(200 + fundo * 0.5).toFixed(1)})"><line x1="300" y1="${(200 + fundo - 30).toFixed(1)}" x2="380" y2="60" stroke="${MW}" stroke-width="12" stroke-linecap="round"/><path d="M280 ${(200 + fundo - 30).toFixed(1)} l40 0 l-10 40 l-20 0 z" fill="${MG2}"/></g>`
  },
  'castelo-cartas'(a, modo) {
    // parece firme, mas vem todo abaixo
    const cartas = [[200, 330, 1], [280, 330, -1], [360, 330, 1], [240, 200, 1], [320, 200, -1], [280, 70, 1]]
    return chao(460) + cartas.map(([x, y, s], i) => {
      const u = modo === 'acao' ? clamp(S(a - 0.15 - (5 - i) * 0.08, 1.6, 0.8), 0, 1.02) : 0
      const tremor = modo === 'apresenta' ? 2 * Math.sin(a * 25 + i) : 0
      return `<g transform="translate(${(x + tremor + u * s * 120).toFixed(1)} ${(y + u * (430 - y)).toFixed(1)}) rotate(${(s * 18 + u * s * 72).toFixed(1)})"><rect x="-38" y="0" width="76" height="120" rx="8" fill="${MW}" stroke="${MK}" stroke-width="4"/><text x="0" y="74" text-anchor="middle" font-family="Unbounded" font-weight="900" font-size="40" fill="${i % 2 ? MR : MK}">${i % 2 ? '♥' : '♠'}</text></g>`
    }).join('')
  },

  // ── proteção ──
  escudo(a, modo) {
    // os golpes batem no escudo e ricocheteiam
    let golpes = ''
    if (modo === 'acao') for (let i = 0; i < 3; i++) {
      const u = fase(a, 0.1 + i * 0.4, 0.5), y = 150 + i * 110
      if (u > 0 && u < 1) { const x = u < 0.6 ? lerp(560, 360, u / 0.6) : lerp(360, 520, (u - 0.6) / 0.4); golpes += `<path d="M${x.toFixed(1)} ${y} l40 -14 v28 z" fill="${MR}"/>` }
      if (u > 0.55 && u < 0.8) golpes += `<circle cx="350" cy="${y}" r="${(40 * (u - 0.55) / 0.25).toFixed(1)}" fill="none" stroke="${MY}" stroke-width="6" opacity="${(1 - (u - 0.55) / 0.25).toFixed(2)}"/>`
    }
    const s = modo === 'apresenta' ? mola(a, 1.8, 0.55) : 1
    return `<g transform="translate(260 280) scale(${s.toFixed(3)}) translate(-260 -280)"><path d="M260 80 L400 130 V270 C400 370 330 440 260 470 C190 440 120 370 120 270 V130 Z" fill="${MC}" stroke="${MW}" stroke-width="10" stroke-linejoin="round"/><path d="M210 270 l40 40 l80 -90" fill="none" stroke="${MK}" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/></g>` + golpes
  },
  'guarda-chuva'(a, modo) {
    // a reserva abre e a chuva escorre por cima
    const abre = modo === 'apresenta' ? mola(a, 1.6, 0.6) : 1
    let chuva = ''
    for (let i = 0; i < 10; i++) {
      const x = 70 + i * 46, u = ((a * (modo === 'acao' ? 1.4 : 0.8) + i * 0.13) % 1)
      const dentro = x > 120 && x < 440, y = lerp(0, dentro ? 170 : 470, u)
      chuva += `<line x1="${x}" y1="${y.toFixed(1)}" x2="${x - 6}" y2="${(y + 26).toFixed(1)}" stroke="${MC}" stroke-width="6" stroke-linecap="round"/>`
    }
    return chuva + `<g transform="translate(280 220) scale(${abre.toFixed(3)} 1)"><path d="M-170 0 A170 130 0 0 1 170 0 Q127 -24 85 0 Q42 -24 0 0 Q-42 -24 -85 0 Q-127 -24 -170 0 Z" fill="${MR}"/></g>
      <path d="M280 90 V400 a30 30 0 0 1 -60 0" fill="none" stroke="${MW}" stroke-width="12" stroke-linecap="round"/>${moeda(280, 450, 26)}`
  },
  boia(a, modo) {
    // o que te segura quando aperta
    const amp = modo === 'acao' ? 26 : 10
    const y = 280 + amp * Math.sin(a * 3)
    let ondas = ''
    for (let k = 0; k < 2; k++) { let d = ''; for (let x = 20; x <= 540; x += 10) d += `${x === 20 ? 'M' : 'L'}${x} ${(330 + k * 60 + 14 * Math.sin(x / 40 + a * (3 + k))).toFixed(1)} `; ondas += `<path d="${d}" fill="none" stroke="${MC}" stroke-width="10" stroke-linecap="round" opacity="${k ? 0.5 : 1}"/>` }
    return `<g transform="translate(280 ${y.toFixed(1)}) rotate(${(6 * Math.sin(a * 2)).toFixed(1)})"><circle r="130" fill="none" stroke="${MW}" stroke-width="60"/>${[0, 90, 180, 270].map((g) => `<path d="M0 -160 A160 160 0 0 1 ${(160 * Math.sin(Math.PI / 6)).toFixed(1)} ${(-160 * Math.cos(Math.PI / 6)).toFixed(1)} L${(100 * Math.sin(Math.PI / 6)).toFixed(1)} ${(-100 * Math.cos(Math.PI / 6)).toFixed(1)} A100 100 0 0 0 0 -100 Z" fill="${MR}" transform="rotate(${g - 15})"/>`).join('')}</g>` + ondas
  },
  escada(a, modo) {
    // um degrau de cada vez
    let s = ''
    for (let i = 0; i < 5; i++) s += `<rect x="${60 + i * 90}" y="${440 - (i + 1) * 70}" width="${500 - 60 - i * 90}" height="70" fill="${i % 2 ? '#21262d' : MG}" stroke="${MW}" stroke-width="5"/>`
    const passo = modo === 'acao' ? fase(a, 0, 2.2) * 5 : 0.0
    const i = Math.min(4, Math.floor(passo)), f = passo - Math.floor(passo)
    const x = 100 + i * 90 + (i < 4 ? f * 90 : 0), y = 440 - (i + 1) * 70 - 34 - Math.sin(Math.PI * f) * 40 * (i < 4 ? 1 : 0)
    return s + moeda(x, y, 32) + (passo >= 4.9 ? `<path d="M470 50 l18 36 l40 6 l-29 28 l7 40 l-36 -19 l-36 19 l7 -40 l-29 -28 l40 -6z" fill="${MY}"/>` : '')
  },
  fumaca(a, modo) {
    // a nota vira fumaça
    const vira = modo === 'acao' ? fase(a, 0.2, 1.4) : 0
    let fumo = ''
    for (let i = 0; i < 7; i++) { const u = ((a * 0.7 + i / 7) % 1) * (modo === 'acao' ? 1 : 0.4); fumo += `<circle cx="${(280 + 40 * Math.sin(u * 6 + i)).toFixed(1)}" cy="${(330 - u * 300).toFixed(1)}" r="${(30 + u * 60).toFixed(1)}" fill="#8b949e" opacity="${((1 - u) * 0.5 * (modo === 'acao' ? 1 : vira)).toFixed(3)}"/>` }
    return fumo + `<g opacity="${(1 - vira).toFixed(3)}" transform="translate(280 360) scale(${(1 - 0.3 * vira).toFixed(3)})"><rect x="-150" y="-70" width="300" height="140" rx="16" fill="#4ade80"/><circle r="40" fill="none" stroke="#166534" stroke-width="8"/><text y="14" text-anchor="middle" font-family="Unbounded" font-weight="900" font-size="34" fill="#166534">R$</text></g>`
  },
}
delete METAFORAS.ampulhetaVazia
// metáfora fora do catálogo: um círculo com o nome (para nunca sair um quadro vazio)
const metaforaPadrao = (a, modo, nome) => `<circle cx="280" cy="250" r="${(140 + 10 * Math.sin(a * 3)).toFixed(1)}" fill="#21262d" stroke="${MW}" stroke-width="10"/><text x="280" y="470" text-anchor="middle" font-family="Unbounded" font-weight="800" font-size="40" fill="${MW}">${nome}</text>`
