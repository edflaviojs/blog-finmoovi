// OS OBJETOS E OS CENÁRIOS — o que aparece quando a voz diz uma coisa concreta ("carro", "mercado", "luz").
// PILOTO (16/10/2026): 3 objetos e 3 cenários. O pedido do Ed é um catálogo de 100+ — este ficheiro cresce.
// Tudo desenhado na JANELA (o cartão do app aberto para a cena): caixa de 900×560.
//   OBJ[nome](a, ev)  → SVG.   a = segundos desde que o objeto entrou; ev = { quebra: segundos desde a quebra ou null }
//   CENARIO[nome](a)  → SVG do fundo da janela.
// E os EFEITOS que saem da janela (fumaça, faíscas, papéis, moedas) desenham-se em FX, em coordenadas do mundo
// (o centro do cartão é 0,0), sem corte — é isso que deixa a fumaça escapar por cima do cartão.
// Precisa de S, clamp, lerp, pulse (da página) e de moeda() (de metaforas.js).
const OW = '#f0f6fc', OK = '#0d1117'
// ajudantes do catálogo: todo objeto ENTRA com uma mola (sobe do chão e cresce com uma passadinha)
// e depois RESPIRA (um balanço leve), para nunca ficar parado. O desenho de cada um é feito à volta de 0,0.
const entra = (a, f = 2.2, z = 0.6) => clamp(S(a, f, z), 0, 1.12)
function pop(a, cx, cy, desenho, { f = 2.2, z = 0.6, respira = 1 } = {}) {
  const e = entra(a, f, z), sobe = (1 - Math.min(1, e)) * 140, r = respira * Math.sin(a * 2.2) * 4
  return `<g transform="translate(${cx} ${(cy + sobe + r).toFixed(1)}) scale(${e.toFixed(3)})">${desenho}</g>`
}
const OY = '#FDE047', OR = '#FF5A4E', OC = '#22D3EE', OV = '#A78BFA', OG = '#4ade80', OO = '#FF8A3D', OP = '#FF4FA0', OGr = '#8b949e', ODk = '#30363d'
const txt = (x, y, t, tam = 28, cor = OK, peso = 800) => `<text x="${x}" y="${y}" text-anchor="middle" font-family="Unbounded" font-weight="${peso}" font-size="${tam}" fill="${cor}">${t}</text>`

const CENARIO = {
  rua(a, anda = 0) {
    // céu, sol, prédios ao longe e a estrada com as faixas a correr enquanto o carro anda
    let faixas = ''
    for (let i = -1; i < 7; i++) faixas += `<rect x="${(i * 160 - (anda % 160)).toFixed(1)}" y="468" width="90" height="10" rx="5" fill="#f0f6fc" opacity="0.7"/>`
    return `<rect width="900" height="560" fill="#9ad7ff"/><circle cx="760" cy="110" r="56" fill="#FFD23F"/>
      <g fill="#c9d6ff">${[[40, 230, 90], [150, 180, 70], [240, 250, 110], [380, 200, 80], [480, 160, 100], [600, 230, 70], [700, 190, 90], [810, 240, 80]].map(([x, y, w]) => `<rect x="${x}" y="${y}" width="${w}" height="${420 - y}" rx="6"/>`).join('')}</g>
      <g fill="#ffffff" opacity="0.6">${[[60, 260], [180, 210], [270, 280], [400, 230], [510, 190], [720, 220]].map(([x, y]) => `<rect x="${x}" y="${y}" width="16" height="22" rx="3"/><rect x="${x + 30}" y="${y}" width="16" height="22" rx="3"/>`).join('')}</g>
      <rect y="420" width="900" height="140" fill="#30363d"/>${faixas}`
  },
  loja() {
    // prateleiras do mercado com caixinhas de cores
    let s = '<rect width="900" height="560" fill="#fff4dc"/>'
    const cores = ['#FF5A4E', '#22D3EE', '#FDE047', '#A78BFA', '#4ade80', '#FF8A3D']
    for (let p = 0; p < 3; p++) {
      const y = 90 + p * 120
      s += `<rect x="40" y="${y + 80}" width="820" height="14" rx="7" fill="#b5835a"/>`
      for (let i = 0; i < 12; i++) s += `<rect x="${60 + i * 66}" y="${y + 20 + (i % 3) * 8}" width="48" height="${60 - (i % 3) * 8}" rx="8" fill="${cores[(i + p) % 6]}"/>`
    }
    return s + '<rect y="470" width="900" height="90" fill="#e8d9b8"/>'
  },
  casa() {
    // parede, janela com a noite, tomada
    return `<rect width="900" height="560" fill="#2a2350"/><rect x="560" y="90" width="230" height="200" rx="14" fill="#141033" stroke="#f0f6fc" stroke-width="10"/>
      <line x1="675" y1="90" x2="675" y2="290" stroke="#f0f6fc" stroke-width="8"/><line x1="560" y1="190" x2="790" y2="190" stroke="#f0f6fc" stroke-width="8"/>
      <circle cx="740" cy="130" r="20" fill="#f0f6fc" opacity="0.8"/><rect y="470" width="900" height="90" fill="#3b3163"/>`
  },
}
// que cenário combina com cada objeto
// onde fica o capô do carro (coordenadas da janela) — é de lá que saem a fumaça e as faíscas
const capoDoCarro = (aQuebra) => [lerp(-320, 300, clamp(S(aQuebra, 1.6, 1))) + 380, 330]
const CENARIO_DE = { carro: 'rua', carrinho: 'loja', lampada: 'casa' }

const OBJ = {
  carro(a, ev) {
    // entra a andar da esquerda e para no meio; quando quebra: tranco, capô aberto, inclinado
    const q = ev.quebra
    const chega = clamp(S(q === null ? a : a - q, 1.6, 1)) // quando quebra, para onde estava
    const x = lerp(-320, 300, chega)
    const roda = x * 1.6
    const tranco = q !== null && q < 0.5 ? Math.sin(q * 60) * 10 * Math.exp(-q * 6) : 0
    const quique = q === null ? Math.abs(Math.sin(a * 14)) * 4 * (1 - chega * 0.7) : 0
    const capo = q !== null ? -38 * clamp(S(q, 2.4, 0.5), 0, 1.1) : 0
    const inclina = q !== null ? 2.5 * clamp(q * 3) : 0
    const rodaSvg = (cx) => `<g transform="translate(${cx} 455) rotate(${roda.toFixed(1)})"><circle r="46" fill="${OK}"/><circle r="20" fill="#8b949e"/><rect x="-4" y="-40" width="8" height="24" fill="#8b949e"/></g>`
    return `<g transform="translate(${(x + tranco).toFixed(1)} ${(-quique).toFixed(1)}) rotate(${inclina.toFixed(2)} 150 455)">
      <ellipse cx="150" cy="500" rx="170" ry="14" fill="#000" opacity="0.25"/>
      <path d="M-10 440 L-10 360 Q-8 330 30 325 L80 320 L130 250 Q140 238 160 238 L290 238 Q312 238 324 256 L366 320 L400 326 Q420 330 420 360 L420 440 Z" fill="#FF5A4E"/>
      <path d="M146 262 L200 262 L200 318 L106 318 Z M216 262 L286 262 Q298 262 304 272 L332 318 L216 318 Z" fill="#9ad7ff"/>
      <rect x="-14" y="378" width="40" height="20" rx="6" fill="#FDE047"/><rect x="392" y="380" width="30" height="18" rx="6" fill="#FF8A3D"/>
      <g transform="rotate(${capo.toFixed(1)} 366 322)"><path d="M300 322 L420 330 L420 340 L300 334 Z" fill="#E5383B"/></g>
      ${rodaSvg(70)}${rodaSvg(330)}</g>`
  },
  carrinho(a) {
    // entra a rolar da direita com as compras a pular
    const chega = clamp(S(a, 1.0, 0.8), 0, 1.06)
    const x = lerp(950, 330, chega)
    const pulo = (i) => Math.abs(Math.sin(a * 10 + i)) * 10 * (1 - clamp(chega))
    return `<g transform="translate(${x.toFixed(1)} 0)">
      <rect x="40" y="${(250 - pulo(0)).toFixed(1)}" width="70" height="70" rx="10" fill="#22D3EE"/><rect x="120" y="${(230 - pulo(1)).toFixed(1)}" width="60" height="90" rx="10" fill="#FDE047"/><rect x="190" y="${(260 - pulo(2)).toFixed(1)}" width="80" height="60" rx="10" fill="#FF5A4E"/>
      <path d="M0 220 L30 220 L60 400 L280 400 L310 300 L40 300" fill="none" stroke="${OK}" stroke-width="14" stroke-linejoin="round" stroke-linecap="round"/>
      <path d="M40 300 L60 400" stroke="${OK}" stroke-width="14"/>
      <circle cx="90" cy="440" r="24" fill="${OK}"/><circle cx="250" cy="440" r="24" fill="${OK}"/></g>`
  },
  lampada(a) {
    // desce no fio a balançar e pisca (a luz a gastar)
    const desce = clamp(S(a, 1.3, 0.55), 0, 1.08)
    const ang = 14 * Math.sin(a * 4) * Math.exp(-a * 0.8)
    const acesa = (Math.sin(a * 23) + Math.sin(a * 37) > -0.6) ? 1 : 0.25
    const y = lerp(-200, 220, desce)
    return `<g transform="rotate(${ang.toFixed(2)} 330 0)">
      <line x1="330" y1="0" x2="330" y2="${(y - 60).toFixed(1)}" stroke="${OW}" stroke-width="6"/>
      <circle cx="330" cy="${(y + 30).toFixed(1)}" r="${(150 * acesa).toFixed(1)}" fill="#FDE047" opacity="${(0.18 * acesa).toFixed(2)}"/>
      <rect x="306" y="${(y - 64).toFixed(1)}" width="48" height="40" rx="8" fill="#8b949e"/>
      <circle cx="330" cy="${(y + 20).toFixed(1)}" r="62" fill="${acesa > 0.5 ? '#FDE047' : '#6b6340'}"/>
      <path d="M310 ${(y + 20).toFixed(1)} l10 -16 l10 16 l10 -16" fill="none" stroke="${OK}" stroke-width="5" opacity="0.6"/></g>`
  },
}

// ── EFEITOS que saem da janela (coordenadas do mundo; o cartão está centrado em 0,0) ──
const FX = {
  // fumaça do capô a subir e a escapar por cima do cartão
  fumaca(a, origem) {
    let s = ''
    for (let i = 0; i < 9; i++) {
      const u = ((a * 0.55 + i / 9) % 1)
      if (a < i * 0.12) continue
      s += `<circle cx="${(origem[0] + 40 * Math.sin(u * 5 + i) + u * 60).toFixed(1)}" cy="${(origem[1] - u * 520).toFixed(1)}" r="${(30 + u * 80).toFixed(1)}" fill="#6e7681" opacity="${((1 - u) * 0.85).toFixed(3)}"/>`
    }
    return s
  },
  // faíscas do motor no instante da quebra
  faiscas(a, origem) {
    if (a > 0.6) return ''
    let s = ''
    for (let i = 0; i < 10; i++) {
      const g = -Math.PI / 2 + (i - 4.5) * 0.28, d = 40 + a * 380
      s += `<line x1="${(origem[0] + Math.cos(g) * d * 0.6).toFixed(1)}" y1="${(origem[1] + Math.sin(g) * d * 0.6).toFixed(1)}" x2="${(origem[0] + Math.cos(g) * d).toFixed(1)}" y2="${(origem[1] + Math.sin(g) * d).toFixed(1)}" stroke="#FDE047" stroke-width="7" stroke-linecap="round" opacity="${(1 - a / 0.6).toFixed(2)}"/>`
    }
    return s
  },
  // boletos a voar por toda a tela, carimbados de ATRASADO
  papeis(a) {
    let s = ''
    for (let i = 0; i < 7; i++) {
      const u = clamp((a - i * 0.07) / 1.3)
      if (u <= 0 || u >= 1) continue
      const x = lerp(-80 + i * 20, -700 + (i % 2 ? 1500 : -100), u) + (i % 2 ? 0 : 700 * u)
      const y = lerp(-60, -900 + i * 260, u) + 400 * u * u
      s += `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(u * 260 * (i % 2 ? 1 : -1)).toFixed(1)})"><rect x="-70" y="-45" width="140" height="90" rx="10" fill="#f0f6fc"/><rect x="-54" y="-30" width="70" height="10" rx="5" fill="#8b949e"/><rect x="-54" y="-12" width="100" height="8" rx="4" fill="#c9d1d9"/><text x="0" y="28" text-anchor="middle" font-family="Unbounded" font-weight="900" font-size="18" fill="#E5383B">ATRASADO</text></g>`
    }
    return s
  },
  // moedas a saltar para fora do cartão quando o valor aterra
  moedas(a) {
    let s = ''
    for (let i = 0; i < 12; i++) {
      const g = -Math.PI / 2 + (i - 5.5) * 0.22, v = 900 + (i % 3) * 180
      const x = Math.cos(g) * v * a, y = -120 + Math.sin(g) * v * a + 1600 * a * a
      if (a > 1.2) continue
      s += `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(a * 500 * (i % 2 ? 1 : -1)).toFixed(1)})">${moeda(0, 0, 34)}</g>`
    }
    return s
  },
}
// as palavras que chamam cada objeto vivem em palavras.mjs (o plano é que as lê)
