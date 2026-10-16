// CATÁLOGO DE OBJETOS — leva 1, grupos CASA e TRANSPORTE (+ cenários e efeitos novos).
Object.assign(OBJ, {
  casa(a) {
    // a casa monta-se: paredes, telhado, e as janelas acendem
    const p = clamp(S(a, 2, 0.7), 0, 1.06), t = clamp(S(a - 0.25, 2.2, 0.6), 0, 1.1), luz = a > 0.8
    return `<g transform="translate(450 470)"><rect x="-200" y="${(-260 * p).toFixed(1)}" width="400" height="${(260 * p).toFixed(1)}" fill="${OW}"/>
      <path d="M-240 -250 L0 -420 L240 -250 Z" fill="${OR}" transform="translate(0 ${(-200 * (1 - Math.min(1, t))).toFixed(1)})"/>
      ${p > 0.9 ? `<rect x="-150" y="-200" width="100" height="90" rx="8" fill="${luz ? OY : '#30363d'}"/><rect x="50" y="-200" width="100" height="90" rx="8" fill="${luz ? OY : '#30363d'}"/><rect x="-45" y="-140" width="90" height="140" rx="8" fill="#7c4a2d"/><circle cx="25" cy="-70" r="7" fill="${OY}"/>` : ''}</g>`
  },
  geladeira(a) {
    // a geladeira velha treme e ronca
    const tr = Math.sin(a * 40) * 4
    let ondas = ''
    for (let i = 0; i < 3; i++) { const u = ((a * 1.2 + i / 3) % 1); ondas += `<path d="M${640 + u * 120} ${200 - 40} q20 40 0 80" fill="none" stroke="${OW}" stroke-width="6" opacity="${(1 - u).toFixed(2)}"/>` }
    return pop(a, 450, 290, `<g transform="translate(${tr.toFixed(1)} 0)"><rect x="-140" y="-250" width="280" height="500" rx="30" fill="#e6edf3"/><line x1="-140" y1="-70" x2="140" y2="-70" stroke="#8b949e" stroke-width="6"/><rect x="-110" y="-200" width="16" height="90" rx="8" fill="#8b949e"/><rect x="-110" y="-30" width="16" height="120" rx="8" fill="#8b949e"/><rect x="40" y="-220" width="70" height="50" rx="8" fill="${OC}" opacity="0.5"/></g>`) + ondas
  },
  fogao(a) {
    // o botijão e a chama que se apaga (o gás acabou)
    const vida = a < 1.4 ? 1 : clamp(1 - (a - 1.4) / 0.4)
    const fl = 1 + 0.15 * Math.sin(a * 25)
    let chamas = ''
    for (let i = 0; i < 5; i++) chamas += `<path transform="translate(${-80 + i * 40} -140) scale(${(vida * fl * (0.8 + 0.2 * Math.sin(i + a * 9))).toFixed(3)})" d="M0 0 C-14 -12 -10 -38 0 -54 C10 -38 14 -12 0 0Z" fill="${i % 2 ? OO : OY}"/>`
    return pop(a, 450, 330, `<rect x="-200" y="-130" width="400" height="250" rx="20" fill="#e6edf3"/><rect x="-200" y="-150" width="400" height="30" rx="10" fill="#30363d"/>${chamas}<rect x="-150" y="-70" width="300" height="150" rx="14" fill="#30363d"/>${[-120, -40, 40, 120].map((x) => `<circle cx="${x}" cy="-100" r="0"/>`).join('')}`) + `<g transform="translate(720 360)"><rect x="-60" y="-100" width="120" height="180" rx="50" fill="${OC}"/><rect x="-24" y="-130" width="48" height="40" rx="10" fill="#8b949e"/></g>`
  },
  chuveiro(a) {
    // o chuveiro liga e a água cai sem parar
    let gotas = ''
    for (let i = 0; i < 16; i++) { const u = ((a * 1.6 + i * 0.137) % 1); gotas += `<line x1="${(390 + (i % 8) * 18 + u * (i % 2 ? 30 : -30)).toFixed(1)}" y1="${(200 + u * 280).toFixed(1)}" x2="${(390 + (i % 8) * 18 + u * (i % 2 ? 30 : -30)).toFixed(1)}" y2="${(224 + u * 280).toFixed(1)}" stroke="${OC}" stroke-width="7" stroke-linecap="round" opacity="${(1 - u * 0.6).toFixed(2)}"/>` }
    return `<path d="M200 40 V120 H430" fill="none" stroke="#8b949e" stroke-width="18" stroke-linecap="round"/><path d="M370 130 h160 l-20 60 h-120z" fill="#c9d1d9"/>${a > 0.3 ? gotas : ''}<rect x="560" y="60" width="90" height="120" rx="16" fill="${OR}"/>${txt(605, 135, '⚡', 50, OY)}`
  },
  ventilador(a) {
    // as pás giram cada vez mais depressa
    const g = 360 * a * Math.min(3, 0.5 + a)
    let pas = ''
    for (let i = 0; i < 3; i++) pas += `<ellipse cx="0" cy="-90" rx="46" ry="90" fill="${OC}" opacity="0.85" transform="rotate(${(g + i * 120).toFixed(1)})"/>`
    return pop(a, 450, 260, `<circle r="190" fill="none" stroke="${OW}" stroke-width="10"/>${pas}<circle r="34" fill="${OW}"/><rect x="-14" y="190" width="28" height="140" fill="${OW}"/><ellipse cy="330" rx="120" ry="22" fill="${OW}"/>`)
  },
  'ar-condicionado'(a) {
    // o ar sai em ondas frias e o relógio da luz gira
    let ar = ''
    for (let i = 0; i < 4; i++) { const u = ((a * 0.9 + i / 4) % 1); ar += `<path d="M${280 + i * 90} ${260 + u * 160} q30 -20 60 0 t60 0" fill="none" stroke="${OC}" stroke-width="8" stroke-linecap="round" opacity="${(1 - u).toFixed(2)}"/>` }
    return `<g transform="translate(450 ${(160 + (1 - Math.min(1, entra(a))) * -200).toFixed(1)})"><rect x="-260" y="-80" width="520" height="160" rx="30" fill="#e6edf3"/><rect x="-220" y="30" width="440" height="20" rx="10" fill="#8b949e"/><circle cx="200" cy="-30" r="12" fill="${OG}"/>${txt(-120, -10, '18°', 40, OC, 900)}</g>${a > 0.4 ? ar : ''}`
  },
  televisao(a) {
    // a TV liga com o botão de play; as assinaturas empilham-se ao lado
    const liga = clamp((a - 0.4) / 0.2)
    const subs = Math.min(4, Math.floor(Math.max(0, a - 0.7) * 3))
    return pop(a, 380, 270, `<rect x="-230" y="-160" width="460" height="290" rx="20" fill="${OK}"/><rect x="-210" y="-140" width="420" height="250" rx="10" fill="${liga > 0.5 ? '#1f6feb' : '#161b22'}"/>${liga > 0.5 ? `<circle r="50" fill="${OW}" opacity="0.9"/><path d="M-16 -26 L28 0 L-16 26 Z" fill="#1f6feb"/>` : ''}<rect x="-60" y="130" width="120" height="20" rx="6" fill="${OK}"/><rect x="-120" y="150" width="240" height="18" rx="9" fill="${OK}"/>`) +
      [...Array(subs)].map((_, i) => `<g transform="translate(740 ${400 - i * 80})"><rect x="-90" y="-32" width="180" height="64" rx="14" fill="${[OR, OV, OG, OO][i]}"/>${txt(0, 12, '− R$ 39', 26, OK, 900)}</g>`).join('')
  },
  torneira(a) {
    // a torneira pinga, gota a gota, e o balde enche devagar
    let gotas = ''
    for (let i = 0; i < 3; i++) { const u = ((a * 1.4 + i / 3) % 1); gotas += `<path transform="translate(330 ${(200 + u * 200).toFixed(1)})" d="M0 -18 C10 0 12 10 0 16 C-12 10 -10 0 0 -18Z" fill="${OC}"/>` }
    const nivel = Math.min(80, a * 25)
    return `<path d="M120 120 H330 V170" fill="none" stroke="#8b949e" stroke-width="40" stroke-linejoin="round"/><rect x="190" y="70" width="60" height="30" rx="10" fill="#c9d1d9"/>${gotas}<path d="M240 400 L420 400 L400 520 L260 520 Z" fill="#30363d"/><rect x="258" y="${(518 - nivel).toFixed(1)}" width="144" height="${nivel.toFixed(1)}" fill="${OC}" opacity="0.8"/>`
  },
  obra(a) {
    // os tijolos sobem um a um e o martelo bate
    let tij = ''
    const n = Math.min(15, Math.floor(a * 8))
    for (let i = 0; i < n; i++) { const r = Math.floor(i / 5), c = i % 5; tij += `<rect x="${250 + c * 82 + (r % 2) * 40}" y="${410 - r * 50}" width="76" height="44" rx="6" fill="${OO}"/>` }
    const bate = Math.abs(Math.sin(a * 6))
    return tij + `<g transform="translate(700 200) rotate(${(-40 + 60 * bate).toFixed(1)} 0 120)"><rect x="-12" y="0" width="24" height="170" rx="8" fill="#b5835a"/><rect x="-60" y="-30" width="120" height="50" rx="10" fill="#8b949e"/></g>`
  },
  // ── transporte ──
  onibus(a) {
    // o ônibus chega, para no ponto e abre a porta
    const x = lerp(1100, 380, clamp(S(a, 0.8, 0.9), 0, 1.02))
    const roda = -x * 1.6
    return `<g transform="translate(${x.toFixed(1)} 0)"><rect x="-260" y="190" width="520" height="230" rx="30" fill="${OY}"/>${[0, 1, 2, 3].map((i) => `<rect x="${-230 + i * 110}" y="220" width="90" height="80" rx="10" fill="#9ad7ff"/>`).join('')}<rect x="200" y="${a > 1 ? 330 : 310}" width="50" height="${a > 1 ? 70 : 90}" rx="6" fill="#0d1117" opacity="0.6"/>${txt(-120, 375, 'CENTRO', 30, OK, 900)}
      ${[-160, 160].map((cx) => `<g transform="translate(${cx} 430) rotate(${roda.toFixed(1)})"><circle r="40" fill="${OK}"/><rect x="-4" y="-34" width="8" height="20" fill="#8b949e"/></g>`).join('')}</g>`
  },
  moto(a) {
    // a moto do delivery passa a correr com a caixa nas costas
    const x = lerp(-300, 1200, clamp(a / 2.2))
    const roda = x * 1.8
    return `<g transform="translate(${x.toFixed(1)} 0)"><rect x="-90" y="230" width="110" height="100" rx="12" fill="${OR}"/>${txt(-35, 292, 'R$', 30, OW, 900)}<path d="M-120 380 L40 360 L120 380 L100 410 L-100 410 Z" fill="${OC}"/><circle cx="40" cy="230" r="34" fill="${OK}"/><path d="M20 260 L60 340" stroke="${OK}" stroke-width="18" stroke-linecap="round"/>
      ${[-110, 110].map((cx) => `<g transform="translate(${cx} 420) rotate(${roda.toFixed(1)})"><circle r="44" fill="${OK}"/><circle r="16" fill="#8b949e"/></g>`).join('')}${[0, 1, 2].map((i) => `<line x1="${-200 - i * 40}" y1="${300 + i * 40}" x2="${-140 - i * 40}" y2="${300 + i * 40}" stroke="${OW}" stroke-width="6" stroke-linecap="round" opacity="0.6"/>`).join('')}</g>`
  },
  aviao(a) {
    // o avião decola e atravessa o céu com o rasto
    const u = clamp(a / 2.4)
    const x = lerp(-200, 1100, u), y = lerp(430, 90, u) + 30 * Math.sin(u * 4)
    return `<path d="M-200 430 Q${(x * 0.5).toFixed(1)} ${((430 + y) / 2 + 60).toFixed(1)} ${(x - 120).toFixed(1)} ${(y + 10).toFixed(1)}" fill="none" stroke="${OW}" stroke-width="12" stroke-linecap="round" stroke-dasharray="4 26" opacity="0.8"/>
      <g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(-12)"><path d="M-150 0 Q-150 -34 -100 -34 H120 Q170 -34 170 0 Q170 34 120 34 H-100 Q-150 34 -150 0 Z" fill="${OW}"/><path d="M-20 -30 L-90 -130 L-40 -130 L60 -30 Z M-20 30 L-90 130 L-40 130 L60 30 Z" fill="${OC}"/><path d="M-140 -10 L-180 -80 L-150 -80 L-110 -20 Z" fill="${OR}"/>${[0, 1, 2, 3].map((i) => `<circle cx="${-60 + i * 40}" cy="-6" r="9" fill="#1f6feb"/>`).join('')}</g>`
  },
  mala(a) {
    // a mala chega a rolar e as etiquetas de viagem colam-se
    const x = lerp(-200, 450, clamp(S(a, 1.2, 0.7), 0, 1.04))
    const et = Math.min(3, Math.floor(Math.max(0, a - 0.8) * 3))
    return `<g transform="translate(${x.toFixed(1)} 270)"><rect x="-30" y="-230" width="60" height="100" rx="14" fill="none" stroke="#8b949e" stroke-width="14"/><rect x="-150" y="-140" width="300" height="320" rx="34" fill="${OO}"/><line x1="-80" y1="-140" x2="-80" y2="180" stroke="#d9732a" stroke-width="10"/><line x1="80" y1="-140" x2="80" y2="180" stroke="#d9732a" stroke-width="10"/>
      ${[...Array(et)].map((_, i) => `<g transform="rotate(${-12 + i * 14}) translate(${-60 + i * 50} ${-60 + i * 70})"><rect x="-48" y="-30" width="96" height="60" rx="10" fill="${[OC, OY, OP][i]}"/></g>`).join('')}<circle cx="-100" cy="196" r="20" fill="${OK}"/><circle cx="100" cy="196" r="20" fill="${OK}"/></g>`
  },
  'bomba-combustivel'(a) {
    // o visor da bomba corre e o preço não para de subir
    const v = Math.floor(Math.min(1, a / 2) * 250)
    return pop(a, 400, 290, `<rect x="-140" y="-230" width="280" height="460" rx="24" fill="${OR}"/><rect x="-110" y="-200" width="220" height="130" rx="12" fill="${OK}"/>${txt(0, -150, 'R$', 26, OY, 800)}${txt(0, -95, `${v},${String(Math.floor(a * 97) % 100).padStart(2, '0')}`, 46, OY, 900)}<rect x="-90" y="-30" width="180" height="40" rx="10" fill="#e5383b"/><path d="M140 -100 h60 v240 h-40" fill="none" stroke="${OK}" stroke-width="16" stroke-linecap="round"/>`) + `<g transform="translate(660 460)"><rect x="-40" y="-60" width="80" height="60" rx="10" fill="#30363d"/></g>`
  },
})

Object.assign(CENARIO, {
  cozinha() { return `<rect width="900" height="560" fill="#ffe8cc"/>${[...Array(10)].map((_, i) => `<rect x="${i * 90}" y="0" width="90" height="200" fill="${i % 2 ? '#ffd8a8' : '#ffe8cc'}"/>`).join('')}<rect y="430" width="900" height="130" fill="#c8955f"/><rect y="420" width="900" height="16" fill="#9a6b3f"/>` },
  banheiro() { let s = '<rect width="900" height="560" fill="#d6f0ff"/>'; for (let x = 0; x < 900; x += 60) for (let y = 0; y < 470; y += 60) s += `<rect x="${x + 2}" y="${y + 2}" width="56" height="56" rx="4" fill="#bfe6ff"/>`; return s + '<rect y="470" width="900" height="90" fill="#8fbcd4"/>' },
  ceu(a) { let s = '<rect width="900" height="560" fill="#7cc4ff"/><circle cx="140" cy="110" r="60" fill="#FFD23F"/>'; for (let i = 0; i < 4; i++) { const x = ((i * 260 - a * 40) % 1100 + 1100) % 1100 - 100; s += `<g transform="translate(${x.toFixed(1)} ${120 + (i % 2) * 140})" fill="#ffffff"><circle r="40"/><circle cx="40" cy="10" r="34"/><circle cx="-40" cy="10" r="30"/><rect x="-70" y="10" width="140" height="34" rx="17"/></g>` } return s },
  banco() { return `<rect width="900" height="560" fill="#1c2b4a"/>${[...Array(6)].map((_, i) => `<rect x="${60 + i * 140}" y="80" width="40" height="360" fill="#25375e"/>`).join('')}<rect y="440" width="900" height="120" fill="#16223b"/>` },
  escritorio() { return `<rect width="900" height="560" fill="#eef1f6"/><rect x="620" y="60" width="220" height="160" rx="10" fill="#9ad7ff" stroke="#c9d1d9" stroke-width="10"/><rect y="440" width="900" height="120" fill="#b5835a"/><rect y="430" width="900" height="16" fill="#8a5a33"/>` },
  cidadeNoite() { let s = '<rect width="900" height="560" fill="#141033"/><circle cx="740" cy="100" r="44" fill="#f0f6fc"/>'; [[40, 200, 110], [170, 150, 90], [280, 230, 120], [420, 120, 100], [540, 210, 90], [650, 170, 120], [790, 240, 90]].forEach(([x, y, w], k) => { s += `<rect x="${x}" y="${y}" width="${w}" height="${470 - y}" fill="#2a2350"/>`; for (let r = y + 20; r < 450; r += 40) for (let c = x + 14; c < x + w - 20; c += 30) if ((r + c + k) % 3) s += `<rect x="${c}" y="${r}" width="14" height="18" fill="#FDE047" opacity="0.8"/>` }); return s + '<rect y="470" width="900" height="90" fill="#0d0a24"/>' },
  praia(a) { let s = '<rect width="900" height="560" fill="#7cc4ff"/><circle cx="740" cy="120" r="70" fill="#FFD23F"/><rect y="300" width="900" height="120" fill="#1f9bd6"/>'; for (let i = 0; i < 3; i++) s += `<path d="M${-60 + ((a * 40 + i * 300) % 300)} ${330 + i * 30} q40 -20 80 0 t80 0" fill="none" stroke="#ffffff" stroke-width="6" opacity="0.7"/>`; return s + '<rect y="410" width="900" height="150" fill="#f5d77a"/>' },
})
Object.assign(CENARIO_DE, {
  nota: 'banco', moedas: 'banco', carteira: 'rua', cartao: 'loja', boleto: 'escritorio', fatura: 'escritorio', celular: 'casa', calculadora: 'escritorio',
  cofrinho: 'casa', banco: 'rua', 'grafico-sobe': 'escritorio', 'grafico-desce': 'escritorio', juros: 'banco', lista: 'escritorio', 'caixa-eletronico': 'rua',
  calendario: 'escritorio', envelope: 'casa', contrato: 'escritorio', etiqueta: 'loja', 'saco-dinheiro': 'banco', lupa: 'escritorio', cadeado: 'banco',
  casa: 'rua', geladeira: 'cozinha', fogao: 'cozinha', chuveiro: 'banheiro', ventilador: 'casa', 'ar-condicionado': 'casa', televisao: 'casa', torneira: 'banheiro', obra: 'rua',
  onibus: 'rua', moto: 'rua', aviao: 'ceu', mala: 'praia', 'bomba-combustivel': 'rua',
})

Object.assign(FX, {
  // confete a cair de cima (festa, conquista)
  confete(a) { let s = ''; for (let i = 0; i < 40; i++) { const x = -500 + (i * 137) % 1000, y = -900 + a * 900 + (i * 53) % 300; if (a > 2) break; s += `<rect x="${(x + 30 * Math.sin(a * 5 + i)).toFixed(1)}" y="${y.toFixed(1)}" width="18" height="10" rx="3" fill="${['#FDE047', '#22D3EE', '#FF4FA0', '#A3E635', '#FF5A4E'][i % 5]}" transform="rotate(${(a * 400 + i * 30).toFixed(1)} ${x} ${y.toFixed(1)})"/>` } return s },
  // notas a voar para longe (dinheiro a ir-se embora)
  notas(a) { let s = ''; for (let i = 0; i < 6; i++) { const u = clamp((a - i * 0.08) / 1.4); if (u <= 0 || u >= 1) continue; s += `<g transform="translate(${(lerp(0, i % 2 ? 700 : -700, u)).toFixed(1)} ${(lerp(-80, -800, u) + 60 * Math.sin(u * 8 + i)).toFixed(1)}) rotate(${(u * 300 * (i % 2 ? 1 : -1)).toFixed(1)})"><rect x="-80" y="-38" width="160" height="76" rx="8" fill="#4ade80"/>${txt(0, 12, 'R$', 30, '#166534', 900)}</g>` } return s },
  // brilho de estrelinhas (coisa boa, guardado)
  brilho(a) { let s = ''; for (let i = 0; i < 8; i++) { const g = i / 8 * Math.PI * 2, d = 300 + 40 * Math.sin(a * 3 + i), e = Math.max(0, Math.sin(a * 4 + i)); if (a > 1.6) break; s += `<path transform="translate(${(Math.cos(g) * d).toFixed(1)} ${(Math.sin(g) * d * 0.7).toFixed(1)}) scale(${e.toFixed(2)})" d="M0 -30 L8 -8 L30 0 L8 8 L0 30 L-8 8 L-30 0 L-8 -8 Z" fill="#FDE047"/>` } return s },
  // raios (susto, alerta)
  raios(a) { if (a > 0.8) return ''; let s = ''; for (let i = 0; i < 6; i++) { const g = -Math.PI / 2 + (i - 2.5) * 0.5, d = 330 + a * 200; s += `<path transform="translate(${(Math.cos(g) * d).toFixed(1)} ${(Math.sin(g) * d * 0.8).toFixed(1)}) rotate(${(g * 57.3 + 90).toFixed(1)})" d="M0 -40 L14 -6 L4 -6 L10 40 L-12 0 L-2 0 Z" fill="#FDE047" opacity="${(1 - a / 0.8).toFixed(2)}"/>` } return s },
})
