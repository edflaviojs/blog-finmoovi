// O PALCO DO SHORT — o boneco GRANDE, sem cartão, em cima da cor (19/10/2026, pedido do Ed: levar para os Shorts
// o que o longo já tem: o close no rosto, o balão de pensamento a sair da cabeça e o desenho solto sem fundo preto).
// O esqueleto, as poses, o balão e os símbolos são os do longo.html; aqui ficam fechados numa caixa (PALCO) para não
// chocarem com as globais da página do Short.
//   PALCO.desenhar(t, e, emo) → SVG do ecrã inteiro (1080×1920).  e = o estado "palco" do plano; emo = {nome,k,a,fala}
const PALCO = (() => {
  const INK = '#0d1117', HEAD_R = 66, NECK = 14, TORSO = 136, UA = 84, FA = 76, UL = 98, LL = 92, STK = 20
  const f1 = (x) => x.toFixed(1)
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), lerp = (a, b, p) => a + (b - a) * p
  function S(t, f, z) {
    if (t <= 0) return 0
    const w = 2 * Math.PI * f
    if (z >= 1) return 1 - Math.exp(-w * t) * (1 + w * t)
    const wd = w * Math.sqrt(1 - z * z)
    return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + (z * w / wd) * Math.sin(wd * t))
  }
  const POSES = {
    neutra: { lean: 0, head: 0, sL: 18, eL: 8, sR: -6, eR: -8, hL: 10, kL: 0, hR: -10, kR: 0, brow: 0, mouth: 0.2, eye: 1, open: 0, sit: 0 },
    choque: { lean: -10, head: -10, sL: -128, eL: -35, sR: 128, eR: 35, hL: -4, kL: 12, hR: -24, kR: 6, brow: 22, mouth: 0, eye: 1.5, open: 1, sit: 0 },
    apontar: { lean: 6, head: -4, sL: 14, eL: 10, sR: 98, eR: -6, hL: 12, kL: 0, hR: -8, kR: 0, brow: 6, mouth: 0.7, eye: 1, open: 0, sit: 0 },
    queixo: { lean: 4, head: 10, sL: 40, eL: 80, sR: 35, eR: 128, hL: 10, kL: 0, hR: -10, kR: 0, brow: 14, mouth: -0.1, eye: 0.85, open: 0, sit: 0 },
    ombros: { lean: 0, head: -8, sL: -62, eL: -70, sR: 62, eR: 70, hL: 8, kL: 0, hR: -8, kR: 0, brow: 16, mouth: -0.4, eye: 1.1, open: 0, sit: 0 },
    coca: { lean: 6, head: 12, sL: 18, eL: 8, sR: 165, eR: 75, hL: 10, kL: 0, hR: -10, kR: 0, brow: 20, mouth: -0.7, eye: 0.9, open: 0, sit: 0 },
    mostra: { lean: 2, head: -2, sL: -50, eL: -40, sR: 60, eR: 45, hL: 10, kL: 0, hR: -10, kR: 0, brow: 8, mouth: 0.5, eye: 1, open: 0, sit: 0 },
    desespero: { lean: -4, head: 8, sL: -160, eL: -95, sR: 160, eR: 95, hL: 6, kL: 4, hR: -8, kR: 4, brow: 24, mouth: -0.8, eye: 1.3, open: 0.6, sit: 0 },
    festa: { lean: -4, head: -8, sL: -150, eL: -20, sR: 150, eR: 20, hL: 14, kL: 10, hR: -14, kR: 10, brow: 10, mouth: 1, eye: 1.1, open: 0, sit: 0 },
    desanimado: { lean: 10, head: 22, sL: 6, eL: 4, sR: -4, eR: -4, hL: 8, kL: 0, hR: -8, kR: 0, brow: 20, mouth: -0.8, eye: 0.8, open: 0, sit: 0 },
    nuca: { lean: 4, head: 14, sL: 18, eL: 8, sR: 170, eR: 100, hL: 10, kL: 0, hR: -10, kR: 0, brow: 14, mouth: 0.3, eye: 0.7, open: 0, sit: 0 },
    sentado: { lean: 12, head: 18, sL: 40, eL: 30, sR: 30, eR: 40, hL: 88, kL: -88, hR: 80, kR: -80, brow: 18, mouth: -0.6, eye: 0.8, open: 0, sit: 1 },
  }
  const POSE_DA_EMOCAO = { triste: 'desanimado', nervoso: 'desespero', susto: 'choque', feliz: 'festa', pensativo: 'queixo', vergonha: 'nuca', sono: 'ombros', suor: 'coca', dinheiro: 'mostra', perplexo: 'ombros', curioso: 'queixo', fala: 'mostra', neutra: 'neutra' }
  const seg = (o, a, l) => ({ x: o.x + l * Math.sin(a * Math.PI / 180), y: o.y + l * Math.cos(a * Math.PI / 180) })

  function boneco(p, x0, chao, emo, k, a, t, fala) {
    const bob = Math.sin(t * 2.4) * 3 + (emo === 'feliz' ? -Math.abs(Math.sin(t * 7)) * 26 * k : 0) + (emo === 'nervoso' ? Math.sin(t * 40) * 2 * k : 0)
    const gesto = fala ? Math.sin(t * 3.1) * 6 : 0
    const hip = { x: x0, y: chao - UL - LL + bob + p.sit * (UL - 10) }
    const sh = seg(hip, 180 + p.lean, TORSO), nk = seg(sh, 180 + p.lean + p.head, NECK), hc = seg(nk, 180 + p.lean + p.head, HEAD_R)
    const eL = seg(sh, p.sL + gesto, UA), hdL = seg(eL, p.sL + gesto + p.eL, FA), eR = seg(sh, p.sR - gesto, UA), hdR = seg(eR, p.sR - gesto + p.eR, FA)
    const kL = seg(hip, p.hL, UL), fL = seg(kL, p.hL + p.kL, LL), kR = seg(hip, p.hR, UL), fR = seg(kR, p.hR + p.kR, LL)
    const L = (q, r) => `<line x1="${f1(q.x)}" y1="${f1(q.y)}" x2="${f1(r.x)}" y2="${f1(r.y)}"/>`
    const J = (q) => `<circle cx="${f1(q.x)}" cy="${f1(q.y)}" r="${STK / 2 + 3}" fill="${INK}"/>`
    const banco = p.sit > 0.3 ? `<rect x="${f1(x0 - 70)}" y="${f1(chao - 96)}" width="140" height="96" rx="12" fill="#8a5a2b" opacity="${f1(clamp((p.sit - 0.3) * 2))}"/><rect x="${f1(x0 - 70)}" y="${f1(chao - 96)}" width="140" height="18" rx="9" fill="#a8743f" opacity="${f1(clamp((p.sit - 0.3) * 2))}"/>` : ''
    return {
      svg: `${banco}<ellipse cx="${f1(x0)}" cy="${chao + 6}" rx="110" ry="15" fill="rgba(13,17,23,0.18)"/>
      <g stroke="${INK}" stroke-width="${STK}" stroke-linecap="round">${L(hip, kL)}${L(kL, fL)}${L(hip, kR)}${L(kR, fR)}${L(hip, sh)}${L(sh, eL)}${L(eL, hdL)}${L(sh, eR)}${L(eR, hdR)}</g>
      ${[hip, kL, kR, sh, eL, eR].map(J).join('')}${rosto(hc, p, emo, k, a, t, fala)}`,
      cabeca: hc,
    }
  }
  // o que ele pensa, dentro do balão
  function simbolo(nome, cx, cy, a) {
    const b = 1 + 0.06 * Math.sin(a * 4)
    const T = (txt, cor = INK, tam = 150) => `<text x="${cx}" y="${cy + tam * 0.36}" text-anchor="middle" font-family="Unbounded" font-weight="900" font-size="${f1(tam * b)}" fill="${cor}">${txt}</text>`
    switch (nome) {
      case 'exclamacao': return T('!', '#FF5A4E')
      case 'reticencias': return T('…', INK, 130)
      case 'zzz': return T('Zzz', '#A78BFA', 90)
      case 'coracao': return `<path transform="translate(${cx} ${cy}) scale(${f1(3.4 * b)})" d="M0 12 C -18 -2 -12 -18 0 -8 C 12 -18 18 -2 0 12 Z" fill="#FF4FA0"/>`
      case 'raio': return `<path transform="translate(${cx - 30} ${cy - 70}) scale(${f1(1.4 * b)})" d="M30 0 L0 55 L24 55 L12 100 L52 38 L28 38 L42 0 Z" fill="#FDE047" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`
      case 'nuvem': { let gotas = ''; for (let i = 0; i < 4; i++) { const f = (a * 1.2 + i / 4) % 1; gotas += `<line x1="${cx - 45 + i * 30}" y1="${f1(cy + 30 + f * 50)}" x2="${cx - 50 + i * 30}" y2="${f1(cy + 46 + f * 50)}" stroke="#5BC8FF" stroke-width="7" stroke-linecap="round" opacity="${f1(1 - f)}"/>` } return `<g fill="#8b949e"><circle cx="${cx - 40}" cy="${cy}" r="34"/><circle cx="${cx}" cy="${cy - 20}" r="42"/><circle cx="${cx + 42}" cy="${cy}" r="32"/><rect x="${cx - 70}" y="${cy}" width="140" height="32" rx="16"/></g>${gotas}` }
      case 'documento': return `<g transform="translate(${cx - 55} ${cy - 70})"><rect width="110" height="140" rx="12" fill="#fff" stroke="${INK}" stroke-width="6"/><line x1="20" y1="35" x2="90" y2="35" stroke="${INK}" stroke-width="6"/><line x1="20" y1="60" x2="90" y2="60" stroke="${INK}" stroke-width="6"/><line x1="20" y1="85" x2="70" y2="85" stroke="${INK}" stroke-width="6"/><text x="55" y="128" text-anchor="middle" font-family="Unbounded" font-weight="900" font-size="26" fill="#FF5A4E">R$</text></g>`
      case 'moeda': return `<g transform="translate(${cx} ${cy}) scale(${f1(b)})"><circle r="70" fill="#FDE047" stroke="#d4a800" stroke-width="8"/><text y="24" text-anchor="middle" font-family="Unbounded" font-weight="900" font-size="66" fill="#8a6a00">R$</text></g>`
      default: return T('?', '#5B8CFF')
    }
  }
  // as três bolinhas sobem da cabeça, uma de cada vez; depois a nuvem abre
  function balao(cabeca, cx, cy, w, h, a, conteudo) {
    let s = ''
    for (let i = 0; i < 3; i++) {
      const k = clamp(S(a - 0.12 * i, 3, 0.6), 0, 1.2), x = lerp(cabeca.x + 50, cx - w * 0.36, (i + 1) / 4), y = lerp(cabeca.y - 70, cy + h * 0.42, (i + 1) / 4)
      s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1((10 + i * 7) * k)}" fill="#fff" stroke="${INK}" stroke-width="5"/>`
    }
    const k = clamp(S(a - 0.4, 2.4, 0.6), 0, 1.15)
    if (k > 0.01) {
      const rx = w / 2 * k, ry = h / 2 * k
      let bolhas = ''
      for (let i = 0; i < 10; i++) { const ang = (i / 10) * Math.PI * 2; bolhas += `<circle cx="${f1(cx + Math.cos(ang) * rx * 0.86)}" cy="${f1(cy + Math.sin(ang) * ry * 0.82)}" r="${f1(Math.min(rx, ry) * 0.36)}"/>` }
      s += `<g fill="#fff" stroke="${INK}" stroke-width="6">${bolhas}</g><g fill="#fff">${bolhas}<ellipse cx="${cx}" cy="${cy}" rx="${f1(rx * 0.95)}" ry="${f1(ry * 0.9)}"/></g>`
      if (conteudo) s += `<g opacity="${f1(clamp((k - 0.6) * 3))}">${conteudo}</g>`
    }
    return s
  }

  // O MOMENTO: o boneco sobe do fundo e fica uns instantes sozinho; a 0,6 s acontece o momento:
  //   close (a câmara vai ao rosto), pensamento (o balão sai da cabeça), solto (um desenho grande ao lado dele, sem
  //   fundo preto), cena (sentado no caixote, ou aos pulos se estiver feliz). A abaixo da manchete (y > 600) e
  //   acima da legenda (y < 1440).
  const CHAO = 1400, DEPOIS = 0.6
  function desenhar(t, e, emo, sai) {
    const a = t - e.t, m = a - DEPOIS
    const sobe = clamp(S(a, 2.2, 0.7), 0, 1.06) * (1 - clamp(S(sai, 4, 1)))
    if (sobe < 0.01) return ''
    const alvo = e.momento === 'cena' ? (emo.nome === 'feliz' ? 'festa' : 'sentado') : POSE_DA_EMOCAO[emo.nome] || 'neutra'
    const u = clamp(S(m, 2, 0.75), 0, 1.05)
    const p = Object.fromEntries(Object.keys(POSES.neutra).map((k) => [k, lerp(POSES.neutra[k], POSES[alvo][k], u)]))
    const x0 = e.momento === 'pensamento' ? 290 : e.momento === 'solto' ? 230 : 540
    const b = boneco(p, x0, CHAO, emo.nome, emo.k, emo.a, t, emo.fala)
    // o boneco do palco é 1,3× o do longo (o ecrã de pé é estreito e ele tem de encher o espaço livre);
    // no close a câmara chega ao rosto (2,4×) e a cabeça fica no meio do espaço livre
    const Z0 = 1.3, ck = e.momento === 'close' ? clamp(S(m, 1.4, 0.85)) : 0, Z = lerp(Z0, 2.4, ck)
    const hx = lerp(x0 + (b.cabeca.x - x0) * Z0, 540, ck), hy = lerp(CHAO + (b.cabeca.y - CHAO) * Z0, 990, ck)
    const corpo = `<g transform="translate(${f1(hx - b.cabeca.x * Z)} ${f1(hy - b.cabeca.y * Z)}) scale(${Z.toFixed(4)})">${b.svg}</g>`
    const cab = { x: hx, y: hy }
    let frente = ''
    if (m > 0 && e.momento === 'pensamento') frente = balao(cab, 730, 800, 540, 300, m, simbolo(e.pensa, 730, 800, m))
    let atras = ''
    if (m > -0.2 && e.momento === 'solto' && e.solto && typeof OBJ !== 'undefined' && OBJ[e.solto]) {
      const k = clamp(S(m + 0.2, 2.2, 0.65), 0, 1.1), bob = Math.sin(m * 2.2) * 10, esc = 0.78 * k
      atras = `<ellipse cx="690" cy="1310" rx="${f1(240 * k)}" ry="22" fill="rgba(13,17,23,0.16)"/><g transform="translate(${f1(690 - 450 * esc)} ${f1(1000 - 280 * esc + bob)}) scale(${esc.toFixed(4)})">${OBJ[e.solto](m + 1, {})}</g>`
    }
    const dy = (1 - Math.min(1, sobe)) * 520
    return `<g transform="translate(0 ${f1(dy)})" opacity="${f1(clamp(sobe * 1.5))}">${atras}${corpo}${frente}</g>`
  }
  return { desenhar }
})()
