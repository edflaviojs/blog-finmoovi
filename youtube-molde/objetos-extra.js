// CATÁLOGO DE OBJETOS — mais seis, para o catálogo passar de 100 (16/10/2026).
Object.assign(OBJ, {
  bicicleta(a) {
    // a bicicleta passa a pedalar
    const x = lerp(-250, 1150, clamp(a / 2.4)), g = x * 1.4
    const roda = (cx) => `<g transform="translate(${cx} 420) rotate(${g.toFixed(1)})"><circle r="80" fill="none" stroke="${OK}" stroke-width="12"/>${[0, 60, 120].map((r) => `<line x1="-80" y1="0" x2="80" y2="0" stroke="#8b949e" stroke-width="4" transform="rotate(${r})"/>`).join('')}</g>`
    return `<g transform="translate(${x.toFixed(1)} 0)">${roda(-110)}${roda(110)}<path d="M-110 420 L-20 300 L80 300 L110 420 M-20 300 L10 420 L80 300 M-30 280 h40 M80 300 L70 250 h40" fill="none" stroke="${OC}" stroke-width="14" stroke-linejoin="round" stroke-linecap="round"/></g>`
  },
  pao(a) {
    // o pão francês sai quentinho, com vapor
    let v = ''
    for (let i = 0; i < 3; i++) { const u = ((a * 0.7 + i / 3) % 1); v += `<path d="M${400 + i * 50} ${250 - u * 100} q-14 -16 0 -32" fill="none" stroke="${OW}" stroke-width="8" stroke-linecap="round" opacity="${(1 - u).toFixed(2)}"/>` }
    return v + pop(a, 450, 340, `<ellipse rx="230" ry="90" fill="#d9a05b"/><ellipse rx="230" ry="90" fill="none" stroke="#b07a3c" stroke-width="8"/>${[-110, -30, 50, 130].map((x) => `<path d="M${x - 30} -40 q30 -10 50 30" fill="none" stroke="#f3cf8e" stroke-width="12" stroke-linecap="round"/>`).join('')}`)
  },
  tenis(a) {
    // o tênis novo entra a saltitar com a etiqueta
    const pulo = Math.abs(Math.sin(a * 6)) * 40 * Math.exp(-a * 0.8)
    return pop(a, 450, 340 - pulo, `<path d="M-230 40 L-210 -60 Q-180 -120 -100 -110 L20 -60 Q60 -40 120 -40 L210 -10 Q240 10 230 50 Z" fill="${OP}"/><rect x="-240" y="40" width="480" height="40" rx="18" fill="${OW}"/>${[-120, -80, -40].map((x) => `<line x1="${x}" y1="-90" x2="${x + 30}" y2="-60" stroke="${OW}" stroke-width="8"/>`).join('')}<g transform="translate(120 -100) rotate(15)"><rect x="0" y="0" width="90" height="56" rx="8" fill="${OY}"/>${txt(45, 36, 'R$', 22, OK, 900)}</g>`)
  },
  sino(a) {
    // o sino de aviso a tocar
    const g = 22 * Math.sin(a * 14) * Math.exp(-a * 0.5)
    return pop(a, 450, 300, `<g transform="rotate(${g.toFixed(1)} 0 -170)"><circle cy="-170" r="20" fill="${OY}"/><path d="M-150 100 Q-140 -150 0 -150 Q140 -150 150 100 L180 130 H-180 Z" fill="${OY}"/><circle cy="160" r="34" fill="#e0b400"/></g><circle cx="140" cy="-130" r="46" fill="${OR}"/>${txt(140, -114, '3', 48, OW, 900)}`)
  },
  ferramenta(a) {
    // a chave inglesa aperta o parafuso (o conserto)
    const g = 40 * Math.sin(a * 5)
    return pop(a, 450, 260, `<circle r="60" fill="#8b949e"/><path d="M0 -40 L35 -20 L35 20 L0 40 L-35 20 L-35 -20 Z" fill="#30363d"/><g transform="rotate(${g.toFixed(1)})"><path d="M-30 -80 a80 80 0 1 0 60 0 l-12 40 h-36 z" fill="#c9d1d9" transform="translate(0 -40)"/><rect x="-24" y="40" width="48" height="230" rx="20" fill="#c9d1d9"/></g>`)
  },
  'guarda-sol'(a) {
    // o guarda-sol abre na areia
    const abre = clamp(S(a, 1.8, 0.6), 0, 1.08)
    return `<g transform="translate(450 470)"><rect x="-6" y="-380" width="12" height="380" fill="${OW}"/><g transform="translate(0 -380) scale(${abre.toFixed(3)} 1)">${[...Array(6)].map((_, i) => `<path d="M0 0 L${-260 + i * 87} 110 L${-173 + i * 87} 110 Z" fill="${i % 2 ? OW : OR}"/>`).join('')}</g><rect x="60" y="-40" width="200" height="40" rx="10" fill="${OC}"/></g>`
  },
})
Object.assign(CENARIO_DE, { bicicleta: 'rua', pao: 'cozinha', tenis: 'loja', sino: 'casa', ferramenta: 'rua', 'guarda-sol': 'praia' })
