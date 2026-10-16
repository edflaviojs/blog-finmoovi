// CATÁLOGO DE OBJETOS — leva 3: AÇÕES e SENTIMENTOS (o que a pessoa faz ou sente com o dinheiro).
Object.assign(OBJ, {
  ideia(a) {
    // a lâmpada da ideia acende com raios
    const on = a > 0.6, r = on ? clamp((a - 0.6) * 3) : 0
    return (on ? [...Array(8)].map((_, i) => { const g = i / 8 * Math.PI * 2; return `<line x1="${(450 + Math.cos(g) * 170).toFixed(1)}" y1="${(250 + Math.sin(g) * 170).toFixed(1)}" x2="${(450 + Math.cos(g) * (170 + 60 * r)).toFixed(1)}" y2="${(250 + Math.sin(g) * (170 + 60 * r)).toFixed(1)}" stroke="${OY}" stroke-width="12" stroke-linecap="round"/>` }).join('') : '') +
      pop(a, 450, 250, `<circle r="120" fill="${on ? OY : '#6b6340'}"/><rect x="-50" y="100" width="100" height="70" rx="12" fill="#8b949e"/><path d="M-30 30 q30 -40 60 0" fill="none" stroke="${OK}" stroke-width="8" opacity="0.5"/>`)
  },
  alvo(a) {
    // a flecha voa e acerta no centro
    const u = clamp(a / 0.7)
    const tr = u >= 1 ? Math.sin((a - 0.7) * 50) * 4 * Math.exp(-(a - 0.7) * 5) : 0
    return pop(a, 450, 290, [200, 150, 100, 50].map((r, i) => `<circle r="${r}" fill="${i % 2 ? OW : OR}"/>`).join('')) + `<g transform="translate(${lerp(1000, 450, u).toFixed(1)} ${(290 + tr).toFixed(1)})"><line x1="0" y1="0" x2="260" y2="0" stroke="#7c4a2d" stroke-width="12"/><path d="M0 0 l30 -14 v28z" fill="${OK}"/><path d="M230 0 l40 -30 h20 l-30 30 l30 30 h-20z" fill="${OC}"/></g>`
  },
  trofeu(a) {
    // o troféu sobe ao pódio a brilhar
    return pop(a, 450, 290, `<path d="M-120 -200 H120 V-80 Q120 40 0 60 Q-120 40 -120 -80 Z" fill="${OY}"/><path d="M-120 -170 q-90 0 -70 80 q15 50 70 40 M120 -170 q90 0 70 80 q-15 50 -70 40" fill="none" stroke="${OY}" stroke-width="18"/><rect x="-24" y="60" width="48" height="80" fill="#e0b400"/><rect x="-110" y="140" width="220" height="60" rx="10" fill="#7c4a2d"/><path transform="translate(60 -140) scale(${(0.5 + 0.5 * Math.abs(Math.sin(a * 4))).toFixed(2)})" d="M0 -30 L8 -8 L30 0 L8 8 L0 30 L-8 8 L-30 0 L-8 -8 Z" fill="${OW}"/>`, { f: 1.8, z: 0.5 })
  },
  pare(a) {
    // a placa de PARE entra a balançar
    return pop(a, 450, 260, `<g transform="rotate(${(10 * Math.sin(a * 5) * Math.exp(-a * 1.2)).toFixed(1)} 0 230)"><rect x="-12" y="60" width="24" height="230" fill="#8b949e"/><path d="M-60 -150 H60 L150 -60 V60 L60 150 H-60 L-150 60 V-60 Z" fill="${OR}" stroke="${OW}" stroke-width="12"/>${txt(0, 22, 'PARE', 74, OW, 900)}</g>`)
  },
  'seta-sobe'(a) {
    // a seta grande dispara para cima
    const y = lerp(460, 120, clamp(S(a, 1.8, 0.55), 0, 1.1))
    return `<g transform="translate(450 ${y.toFixed(1)})"><path d="M0 -60 L120 70 H50 V320 H-50 V70 H-120 Z" fill="${OR}"/></g>${txt(450, 520, '', 10)}`
  },
  'seta-desce'(a) {
    const y = lerp(80, 300, clamp(S(a, 1.8, 0.55), 0, 1.1))
    return `<g transform="translate(450 ${y.toFixed(1)})"><path d="M0 220 L120 90 H50 V-160 H-50 V90 H-120 Z" fill="${OG}"/></g>`
  },
  tesoura(a) {
    // a tesoura corta a conta ao meio
    const ab = 20 * Math.abs(Math.sin(a * 8)), x = lerp(150, 650, clamp(a / 1.6))
    const corte = clamp(a / 1.6)
    return `<g><rect x="150" y="250" width="${(500 * corte).toFixed(1)}" height="100" fill="${OW}" transform="translate(0 ${(-20 * corte).toFixed(1)}) rotate(${(-4 * corte).toFixed(1)} 150 250)"/><rect x="${(150 + 500 * corte).toFixed(1)}" y="250" width="${(500 * (1 - corte)).toFixed(1)}" height="100" fill="${OW}"/><rect x="150" y="300" width="${(500 * corte).toFixed(1)}" height="100" fill="#e6edf3" transform="translate(0 ${(20 * corte).toFixed(1)})"/></g>
      <g transform="translate(${x.toFixed(1)} 300)"><g transform="rotate(${(-ab).toFixed(1)})"><rect x="-10" y="-8" width="160" height="16" rx="8" fill="#8b949e"/><circle cx="-60" cy="-30" r="34" fill="none" stroke="${OR}" stroke-width="14"/></g><g transform="rotate(${ab.toFixed(1)})"><rect x="-10" y="-8" width="160" height="16" rx="8" fill="#c9d1d9"/><circle cx="-60" cy="30" r="34" fill="none" stroke="${OR}" stroke-width="14"/></g></g>`
  },
  lixeira(a) {
    // o dinheiro vai parar ao lixo (desperdício)
    let n = ''
    for (let i = 0; i < 3; i++) { const u = clamp((a - 0.3 - i * 0.3) / 0.6); if (u > 0 && u < 1) n += `<g transform="translate(${lerp(200 + i * 60, 450, u).toFixed(1)} ${(lerp(80, 300, u) - 120 * Math.sin(Math.PI * u)).toFixed(1)}) rotate(${(u * 300).toFixed(1)})"><rect x="-60" y="-28" width="120" height="56" rx="6" fill="${OG}"/></g>` }
    return n + pop(a, 450, 350, `<path d="M-130 -100 H130 L110 170 H-110 Z" fill="#8b949e"/><rect x="-150" y="-130" width="300" height="36" rx="10" fill="#6e7681" transform="rotate(${(-25 * clamp(Math.sin(a * 4))).toFixed(1)} 150 -112)"/>${[-60, 0, 60].map((x) => `<line x1="${x}" y1="-60" x2="${x * 0.85}" y2="140" stroke="#6e7681" stroke-width="10"/>`).join('')}`)
  },
  fogo(a) {
    // o dinheiro a queimar
    let ch = ''
    for (let i = 0; i < 5; i++) ch += `<path transform="translate(${-120 + i * 60} 40) scale(${(1.6 + 0.4 * Math.sin(a * 12 + i * 2)).toFixed(2)})" d="M0 0 C-30 -20 -20 -80 0 -110 C20 -80 30 -20 0 0Z" fill="${i % 2 ? OO : OR}"/>`
    return pop(a, 450, 360, `<rect x="-170" y="0" width="340" height="110" rx="12" fill="${OG}" opacity="${clamp(1 - a / 3).toFixed(2)}"/>${txt(0, 75, 'R$', 60, '#166534', 900)}${ch}<g transform="translate(0 -20)">${[0, 1, 2].map((i) => `<path transform="translate(${-60 + i * 60} 0) scale(${(1 + 0.3 * Math.sin(a * 15 + i)).toFixed(2)})" d="M0 0 C-14 -10 -10 -40 0 -54 C10 -40 14 -10 0 0Z" fill="${OY}"/>`).join('')}</g>`)
  },
  pensamento(a) {
    // o balão de pensamento com o cifrão
    const b = (i) => clamp(S(a - i * 0.15, 3, 0.6), 0, 1.1)
    return `<circle cx="300" cy="450" r="${(18 * b(0)).toFixed(1)}" fill="${OW}"/><circle cx="350" cy="390" r="${(30 * b(1)).toFixed(1)}" fill="${OW}"/><g transform="translate(500 230) scale(${b(2).toFixed(3)})"><g fill="${OW}"><circle cx="-110" cy="10" r="90"/><circle cx="0" cy="-40" r="110"/><circle cx="110" cy="10" r="90"/><rect x="-180" y="0" width="360" height="100" rx="50"/></g>${txt(0, 50, 'R$?', 80, OK, 900)}</g>`
  },
  olho(a) {
    // o olho abre e olha à volta
    const abre = clamp(S(a, 2.4, 0.7), 0, 1.05) * (Math.sin(a * 2.5) > 0.96 ? 0.1 : 1)
    const ox = 50 * Math.sin(a * 1.6)
    return pop(a, 450, 290, `<path d="M-230 0 Q0 ${(-200 * abre).toFixed(1)} 230 0 Q0 ${(200 * abre).toFixed(1)} -230 0Z" fill="${OW}"/><clipPath id="olhoC"><path d="M-230 0 Q0 ${(-200 * abre).toFixed(1)} 230 0 Q0 ${(200 * abre).toFixed(1)} -230 0Z"/></clipPath><g clip-path="url(#olhoC)"><circle cx="${ox.toFixed(1)}" r="80" fill="${OC}"/><circle cx="${ox.toFixed(1)}" r="40" fill="${OK}"/><circle cx="${(ox + 20).toFixed(1)}" cy="-20" r="12" fill="${OW}"/></g>`)
  },
  certo(a) {
    // o grande ✓ desenha-se
    const u = clamp(a / 0.6)
    return pop(a, 450, 290, `<circle r="190" fill="${OG}"/><path d="M-90 0 L-20 70 L110 -80" fill="none" stroke="${OW}" stroke-width="40" stroke-linecap="round" stroke-linejoin="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="${(1 - u).toFixed(3)}"/>`)
  },
  errado(a) {
    // o grande ✗ desenha-se
    const u = clamp(a / 0.6)
    return pop(a, 450, 290, `<circle r="190" fill="${OR}"/><path d="M-80 -80 L80 80" stroke="${OW}" stroke-width="40" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="${(1 - clamp(u * 2)).toFixed(3)}"/><path d="M80 -80 L-80 80" stroke="${OW}" stroke-width="40" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="${(1 - clamp(u * 2 - 1)).toFixed(3)}"/>`)
  },
  duvida(a) {
    // o ponto de interrogação gira e quica
    return `<g transform="translate(450 ${(280 - 40 * Math.abs(Math.sin(a * 4))).toFixed(1)}) rotate(${(12 * Math.sin(a * 3)).toFixed(1)}) scale(${entra(a).toFixed(3)})">${txt(0, 110, '?', 340, OV, 900)}</g>`
  },
  alerta(a) {
    // a sirene gira com a luz vermelha
    const g = a * 400
    return `<g transform="translate(450 330)"><path d="M0 0 L${(Math.cos(g * Math.PI / 180) * 700).toFixed(1)} ${(-200 + Math.sin(g * Math.PI / 180) * 100).toFixed(1)} L${(Math.cos((g + 25) * Math.PI / 180) * 700).toFixed(1)} ${(-200 + Math.sin((g + 25) * Math.PI / 180) * 100).toFixed(1)} Z" fill="${OR}" opacity="0.35"/>${pop(a, 0, 0, `<path d="M-120 60 V-40 a120 120 0 0 1 240 0 V60Z" fill="${OR}"/><rect x="-160" y="60" width="320" height="50" rx="12" fill="#30363d"/>${txt(0, 20, '!', 120, OW, 900)}`)}</g>`
  },
  estrela(a) {
    // a estrela do sonho a brilhar
    return pop(a, 450, 290, `<path transform="rotate(${(a * 20).toFixed(1)}) scale(${(1 + 0.06 * Math.sin(a * 5)).toFixed(3)})" d="M0 -190 L50 -60 L190 -60 L80 20 L120 160 L0 80 L-120 160 L-80 20 L-190 -60 L-50 -60 Z" fill="${OY}"/>`)
  },
  emprestar(a) {
    // uma mão passa o dinheiro à outra — e ele não volta
    const u = clamp(S(a - 0.3, 1.4, 0.8), 0, 1.05)
    return `<path d="M60 360 H260 q40 0 40 -40 v-40 h-90" fill="#e8b06a"/><path d="M840 360 H640 q-40 0 -40 -40 v-40 h90" fill="#c8955f"/><g transform="translate(${lerp(300, 600, u).toFixed(1)} ${(250 - 80 * Math.sin(Math.PI * u)).toFixed(1)})"><rect x="-80" y="-36" width="160" height="72" rx="8" fill="${OG}"/>${txt(0, 12, 'R$', 30, '#166534', 900)}</g>${a > 1.4 ? txt(450, 470, 'e não voltou…', 34, OW, 800).replace('<text', `<text opacity="${clamp((a - 1.4) * 3).toFixed(2)}"`) : ''}`
  },
  despertador(a) {
    // o despertador toca a pular
    const tr = Math.sin(a * 50) * 8
    return pop(a, 450, 300, `<g transform="rotate(${tr.toFixed(1)})"><circle r="170" fill="${OR}"/><circle r="140" fill="${OW}"/><line x1="0" y1="0" x2="0" y2="-100" stroke="${OK}" stroke-width="14" stroke-linecap="round"/><line x1="0" y1="0" x2="70" y2="20" stroke="${OK}" stroke-width="14" stroke-linecap="round"/><circle cx="-120" cy="-150" r="50" fill="${OY}"/><circle cx="120" cy="-150" r="50" fill="${OY}"/><rect x="-140" y="150" width="30" height="50" rx="10" fill="${OK}" transform="rotate(30 -125 150)"/><rect x="110" y="150" width="30" height="50" rx="10" fill="${OK}" transform="rotate(-30 125 150)"/></g>`)
  },
  dado(a) {
    // os dados rolam (sorte, aposta)
    const r = a < 1.2
    const face = r ? Math.floor(a * 12) % 6 + 1 : 6
    const pts = { 1: [[0, 0]], 2: [[-40, -40], [40, 40]], 3: [[-40, -40], [0, 0], [40, 40]], 4: [[-40, -40], [40, -40], [-40, 40], [40, 40]], 5: [[-40, -40], [40, -40], [0, 0], [-40, 40], [40, 40]], 6: [[-40, -45], [40, -45], [-40, 0], [40, 0], [-40, 45], [40, 45]] }
    return [-1, 1].map((s) => `<g transform="translate(${450 + s * 130} ${(300 - (r ? Math.abs(Math.sin(a * 9 + s)) * 60 : 0)).toFixed(1)}) rotate(${r ? (a * 400 * s).toFixed(1) : 0})"><rect x="-90" y="-90" width="180" height="180" rx="30" fill="${OW}"/>${pts[s < 0 ? face : 7 - face].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="16" fill="${OR}"/>`).join('')}</g>`).join('')
  },
  chave(a) {
    // a chave da casa própria gira na fechadura
    const g = clamp((a - 0.6) / 0.5) * 90
    return pop(a, 450, 290, `<rect x="-160" y="-230" width="320" height="460" rx="20" fill="#7c4a2d"/><circle cy="10" r="50" fill="${OY}"/><rect x="-12" y="20" width="24" height="70" rx="8" fill="${OK}"/><g transform="translate(0 10) rotate(${g.toFixed(1)})"><rect x="-8" y="-10" width="16" height="0" fill="${OY}"/><circle cx="0" cy="-150" r="56" fill="${OY}" stroke="#e0b400" stroke-width="12"/><circle cx="0" cy="-150" r="20" fill="#7c4a2d"/><rect x="-10" y="-100" width="20" height="100" fill="#e0b400"/></g>`)
  },
  'caixa-venda'(a) {
    // a caixa de coisas paradas ganha a etiqueta de VENDIDO
    const c = clamp(S(a - 0.7, 3.5, 0.5), 0, 1.15)
    return pop(a, 450, 330, `<path d="M-200 -120 H200 V140 H-200Z" fill="#c8955f"/><path d="M-200 -120 L-240 -170 H-40 L0 -120 M200 -120 L240 -170 H40 L0 -120" fill="#b5835a"/><rect x="-60" y="-160" width="40" height="50" rx="6" fill="${OC}"/><rect x="0" y="-180" width="70" height="70" rx="10" fill="${OP}"/><g transform="rotate(-12) scale(${c.toFixed(3)})"><rect x="-150" y="-40" width="300" height="90" rx="12" fill="none" stroke="${OG}" stroke-width="10"/>${txt(0, 22, 'VENDIDO', 50, OG, 900)}</g>`)
  },
  'bomba-relogio'(a) {
    // a dívida é uma bomba com o pavio a arder
    const pav = clamp(1 - a / 2.2)
    const fa = `<path transform="translate(${(80 + 120 * pav).toFixed(1)} ${(-180 - 60 * pav).toFixed(1)}) scale(${(1 + 0.3 * Math.sin(a * 30)).toFixed(2)})" d="M0 -20 L6 -6 L20 0 L6 6 L0 20 L-6 6 L-20 0 L-6 -6Z" fill="${OY}"/>`
    return pop(a, 420, 330, `<circle r="170" fill="${OK}"/><circle cx="-60" cy="-60" r="34" fill="#30363d"/><rect x="40" y="-190" width="80" height="60" rx="12" fill="#30363d" transform="rotate(30 80 -160)"/><path d="M80 -180 q60 -40 ${(120 * pav).toFixed(1)} ${(-60 * pav).toFixed(1)}" fill="none" stroke="#b5835a" stroke-width="10"/>${fa}${txt(0, 30, 'DÍVIDA', 46, OR, 900)}`)
  },
  balao(a) {
    // o balão sobe (o preço a subir) e foge
    const y = lerp(460, -80, clamp((a - 0.3) / 2))
    return `<g transform="translate(${(450 + 30 * Math.sin(a * 2)).toFixed(1)} ${y.toFixed(1)})"><ellipse cx="0" cy="-90" rx="110" ry="130" fill="${OR}"/><path d="M-12 40 h24 l-12 -16z" fill="${OR}"/><path d="M0 40 q20 60 -10 120 q-20 50 10 100" fill="none" stroke="${OW}" stroke-width="5"/>${txt(0, -70, 'R$', 60, OW, 900)}</g>`
  },
  termometro(a) {
    // o termómetro sobe até ao vermelho (o calor, o preço)
    const h = lerp(40, 300, clamp(S(a - 0.2, 1.2, 0.8), 0, 1.03))
    return pop(a, 450, 290, `<rect x="-40" y="-230" width="80" height="380" rx="40" fill="${OW}"/><circle cy="170" r="80" fill="${OR}"/><rect x="-20" y="${(150 - h).toFixed(1)}" width="40" height="${h.toFixed(1)}" rx="20" fill="${OR}"/>${[0, 1, 2, 3, 4].map((i) => `<line x1="50" y1="${-180 + i * 60}" x2="90" y2="${-180 + i * 60}" stroke="${OW}" stroke-width="8"/>`).join('')}`)
  },
  corrente(a) {
    // a corrente prende o dinheiro (a dívida que amarra)
    const fecha = clamp(S(a - 0.4, 2.5, 0.6), 0, 1.05)
    let elos = ''
    for (let i = 0; i < 8; i++) { const x = lerp(i < 4 ? -100 : 1000, 180 + i * 75, fecha); elos += `<ellipse cx="${x.toFixed(1)}" cy="290" rx="44" ry="26" fill="none" stroke="#8b949e" stroke-width="14" transform="rotate(${i % 2 ? 0 : 90} ${x.toFixed(1)} 290)"/>` }
    return `<g transform="translate(450 290)"><rect x="-150" y="-80" width="300" height="160" rx="14" fill="${OG}"/>${txt(0, 22, 'R$', 70, '#166534', 900)}</g>` + elos
  },
  ima(a) {
    // o ímã puxa as moedas (o desconto, a oferta que atrai)
    let m = ''
    for (let i = 0; i < 5; i++) { const u = clamp(S(a - 0.3 - i * 0.1, 1.5, 0.8)); m += moeda(lerp(800 - (i % 2) * 60, 420, u), lerp(120 + i * 80, 260 + (i - 2) * 30, u), 30) }
    return pop(a, 280, 280, `<path d="M-60 -150 H60 V40 a60 60 0 0 0 0 0 M-150 -150 H-40 V40 A40 40 0 0 0 40 40 V-150 H150 V40 A150 150 0 0 1 -150 40 Z" fill="${OR}"/><rect x="-150" y="-150" width="110" height="60" fill="${OW}"/><rect x="40" y="-150" width="110" height="60" fill="${OW}"/>`) + m
  },
  bandeira(a) {
    // a bandeira de chegada (a meta cumprida) a ondular
    let d = 'M0 0'; for (let x = 0; x <= 300; x += 20) d += ` L${x} ${(16 * Math.sin(x / 50 - a * 6)).toFixed(1)}`
    d += ' L300 200'; for (let x = 300; x >= 0; x -= 20) d += ` L${x} ${(200 + 16 * Math.sin(x / 50 - a * 6)).toFixed(1)}`
    let xadrez = ''
    for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) if ((r + c) % 2) xadrez += `<rect x="${c * 50}" y="${r * 50 + 16 * Math.sin(c * 50 / 50 - a * 6)}" width="50" height="50" fill="${OK}"/>`
    return pop(a, 300, 100, `<rect x="-16" y="0" width="16" height="400" fill="${OW}"/><clipPath id="bandC"><path d="${d} Z"/></clipPath><path d="${d} Z" fill="${OW}"/><g clip-path="url(#bandC)">${xadrez}</g>`)
  },
  montanha(a) {
    // a bandeirinha chega ao topo da montanha
    const u = clamp(a / 1.6)
    return `<path d="M60 480 L330 140 L460 300 L560 180 L840 480 Z" fill="#8b949e"/><path d="M290 190 L330 140 L370 190 L345 180 L330 200 Z M530 215 L560 180 L590 215 Z" fill="${OW}"/><g transform="translate(${lerp(120, 330, u).toFixed(1)} ${lerp(470, 140, u).toFixed(1)})"><rect x="-4" y="-90" width="8" height="90" fill="${OK}"/><path d="M4 -90 l60 18 l-60 18z" fill="${OR}"/></g>`
  },
  calendario2(a) { return OBJ.calendario(a) },
})
delete OBJ.calendario2
Object.assign(CENARIO_DE, {
  ideia: 'escritorio', alvo: 'escritorio', trofeu: 'festa', pare: 'rua', 'seta-sobe': 'escritorio', 'seta-desce': 'escritorio', tesoura: 'escritorio', lixeira: 'rua', fogo: 'quarto',
  pensamento: 'casa', olho: 'escritorio', certo: 'escritorio', errado: 'escritorio', duvida: 'casa', alerta: 'cidadeNoite', estrela: 'quarto', emprestar: 'casa', despertador: 'quarto',
  dado: 'festa', chave: 'rua', 'caixa-venda': 'rua', 'bomba-relogio': 'banco', balao: 'ceu', termometro: 'rua', corrente: 'banco', ima: 'loja', bandeira: 'ceu', montanha: 'ceu',
})
