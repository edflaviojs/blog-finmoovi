// O ROSTO DO BONECO COM EMOÇÕES — partilhado pelo vídeo longo (longo.html) e pelo Short (index.html, via boneco.js).
// 17/10/2026, o Ed: "ele tem que passar um sentimento… o público tem que achar ele fofinho, como um amiguinho de
// verdade… olha a cara do boneco kkk… ou: oh meu Deus que dó dele". 12 emoções: triste (chora), nervoso (fica
// vermelho e solta fumo), susto, feliz, curioso, pensativo, perplexo (??), vergonha, sono (zzz), suor, dinheiro ($),
// e as de sempre (fala, neutra). Sempre com bochechas rosadas, a piscar, e a boca a mexer quando ele fala.
//   rosto(cabeça, pose, emoção, k 0..1, segundos desde a emoção, t, a falar?, olhar para cima 0..1, raio, traço)
function rosto(hc, p, emo, k, a, t, fala, olhaCima = 0, R = 66, stk = 20) {
  // tudo local: este ficheiro é lido pelo Short (index.html) e pelo longo (longo.html), cada um com as suas globais
  const HEAD_R = R, STK = stk, INK = '#0d1117', f1 = (x) => x.toFixed(1)
  const clamp = (x, a0 = 0, b0 = 1) => Math.min(b0, Math.max(a0, x)), lerp = (x, y, u) => x + (y - x) * u
  const mixHex = (c1, c2, u) => { const A = [1, 3, 5].map((i) => parseInt(c1.slice(i, i + 2), 16)), B = [1, 3, 5].map((i) => parseInt(c2.slice(i, i + 2), 16)); return `rgb(${A.map((x, i) => Math.round(lerp(x, B[i], clamp(u)))).join(',')})` }
  const s = HEAD_R / 60, ex = 22 * s, cx = hc.x + 8 * s, cy = hc.y
  let ey = cy - 6 * s - 6 * s * olhaCima, brow = p.brow, mouth = p.mouth, eye = p.eye, open = p.open
  let corCara = '#fff', extra = '', olhos = null, sobrancelhas = null, frente = ''
  const pisca = (t % 4.3) < 0.12 ? 0.1 : 1
  // as bochechas rosadas: sempre um pouco (é o que o faz "fofinho")
  let bochecha = 0.28
  if (emo === 'triste') {
    brow = lerp(brow, 26, k); mouth = lerp(mouth, -0.9, k) + Math.sin(t * 22) * 0.06 * k; eye = lerp(eye, 1.05, k)
    // duas lágrimas de cada lado, a escorrer e a pingar
    for (const lado of [-1, 1]) for (let i = 0; i < 2; i++) {
      const fase = ((a * 0.9 + i * 0.5 + (lado > 0 ? 0.25 : 0)) % 1)
      const x = cx + lado * ex + lado * 4 * s, y = ey + 12 * s + fase * 70 * s
      extra += `<path d="M ${f1(x)} ${f1(y - 9 * s)} Q ${f1(x + 7 * s)} ${f1(y + 4 * s)} ${f1(x)} ${f1(y + 7 * s)} Q ${f1(x - 7 * s)} ${f1(y + 4 * s)} ${f1(x)} ${f1(y - 9 * s)} Z" fill="#5BC8FF" opacity="${f1(k * (1 - fase * 0.6))}"/>`
    }
  } else if (emo === 'nervoso') {
    brow = lerp(brow, -22, k); mouth = lerp(mouth, -0.6, k)
    corCara = mixHex('#ffffff', '#ff7b6b', clamp(k * (0.6 + 0.4 * clamp(a / 2))))
    // a cabeça a ferver: fumo a subir em sopros
    for (let i = 0; i < 3; i++) {
      const fase = (a * 0.8 + i / 3) % 1, x = hc.x + (i - 1) * 40 * s + Math.sin(fase * 6 + i) * 8 * s, y = cy - HEAD_R - 10 * s - fase * 90 * s
      extra += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1((10 + fase * 18) * s)}" fill="#e6edf3" opacity="${f1(k * (1 - fase) * 0.9)}"/>`
    }
    extra += `<g stroke="#ff5a4e" stroke-width="${f1(4 * s)}" stroke-linecap="round" opacity="${f1(k)}"><path d="M ${f1(hc.x + 34 * s)} ${f1(cy - 40 * s)} l ${f1(10 * s)} ${f1(-6 * s)} m ${f1(-4 * s)} ${f1(-6 * s)} l ${f1(6 * s)} ${f1(10 * s)}"/></g>`
  } else if (emo === 'susto') {
    eye = lerp(eye, 1.8, k); brow = lerp(brow, 26, k); open = Math.max(open, k)
    for (let i = 0; i < 5; i++) { const ang = -150 + i * 30, r1 = HEAD_R + 14 * s, r2 = HEAD_R + (30 + 6 * Math.sin(t * 20 + i)) * s; const A = ang * Math.PI / 180; extra += `<line x1="${f1(hc.x + r1 * Math.cos(A))}" y1="${f1(cy + r1 * Math.sin(A))}" x2="${f1(hc.x + r2 * Math.cos(A))}" y2="${f1(cy + r2 * Math.sin(A))}" stroke="${INK}" stroke-width="${f1(5 * s)}" stroke-linecap="round" opacity="${f1(k)}"/>` }
  } else if (emo === 'feliz' || emo === 'curioso') {
    mouth = lerp(mouth, 1.1, k); bochecha = lerp(0.28, 0.8, k)
    if (emo === 'feliz') olhos = (er) => [-1, 1].map((l) => `<path d="M ${f1(cx + l * ex - 10 * s)} ${f1(ey + 3 * s)} Q ${f1(cx + l * ex)} ${f1(ey - 10 * s)} ${f1(cx + l * ex + 10 * s)} ${f1(ey + 3 * s)}" stroke="${INK}" stroke-width="${f1(6 * s)}" fill="none" stroke-linecap="round"/>`).join('')
    for (let i = 0; i < 3; i++) { const fase = (a * 0.7 + i / 3) % 1, x = hc.x + (i - 1) * 70 * s, y = cy - HEAD_R - 20 * s - fase * 50 * s; extra += `<path d="M ${f1(x)} ${f1(y - 10 * s)} L ${f1(x + 3 * s)} ${f1(y - 3 * s)} L ${f1(x + 10 * s)} ${f1(y)} L ${f1(x + 3 * s)} ${f1(y + 3 * s)} L ${f1(x)} ${f1(y + 10 * s)} L ${f1(x - 3 * s)} ${f1(y + 3 * s)} L ${f1(x - 10 * s)} ${f1(y)} L ${f1(x - 3 * s)} ${f1(y - 3 * s)} Z" fill="#FDE047" opacity="${f1(k * Math.sin(fase * Math.PI))}"/>` }
  } else if (emo === 'pensativo' || emo === 'perplexo') {
    brow = lerp(brow, 12, k); mouth = lerp(mouth, -0.15, k); ey -= 6 * s * k
    if (emo === 'perplexo') {
      sobrancelhas = `<line x1="${f1(cx - ex - 14 * s)}" y1="${f1(ey - 22 * s)}" x2="${f1(cx - ex + 14 * s)}" y2="${f1(ey - 22 * s)}" stroke="${INK}" stroke-width="${f1(8 * s)}" stroke-linecap="round"/><line x1="${f1(cx + ex - 14 * s)}" y1="${f1(ey - 34 * s)}" x2="${f1(cx + ex + 14 * s)}" y2="${f1(ey - 26 * s)}" stroke="${INK}" stroke-width="${f1(8 * s)}" stroke-linecap="round"/>`
      const pula = Math.abs(Math.sin(a * 3)) * 10 * s
      extra += `<text x="${f1(hc.x + 70 * s)}" y="${f1(cy - HEAD_R - 10 * s - pula)}" font-family="Unbounded" font-weight="900" font-size="${f1(46 * s)}" fill="${INK}" opacity="${f1(k)}">?</text><text x="${f1(hc.x + 104 * s)}" y="${f1(cy - HEAD_R + 14 * s - pula * 0.6)}" font-family="Unbounded" font-weight="900" font-size="${f1(30 * s)}" fill="${INK}" opacity="${f1(k * 0.8)}">?</text>`
    }
  } else if (emo === 'vergonha') {
    bochecha = lerp(0.28, 1, k); mouth = lerp(mouth, 0.15, k) + Math.sin(t * 9) * 0.1 * k; ey += 4 * s * k; brow = lerp(brow, 16, k)
    extra += `<path d="M ${f1(hc.x - 48 * s)} ${f1(cy - 30 * s)} q ${f1(-6 * s)} ${f1(12 * s)} 0 ${f1(16 * s)} q ${f1(6 * s)} ${f1(-4 * s)} 0 ${f1(-16 * s)}" fill="#5BC8FF" opacity="${f1(k)}"/>`
  } else if (emo === 'sono') {
    olhos = () => [-1, 1].map((l) => `<line x1="${f1(cx + l * ex - 10 * s)}" y1="${f1(ey + 2 * s)}" x2="${f1(cx + l * ex + 10 * s)}" y2="${f1(ey + 2 * s)}" stroke="${INK}" stroke-width="${f1(6 * s)}" stroke-linecap="round"/>`).join('')
    open = Math.max(open, 0.5 * k * (0.5 + 0.5 * Math.sin(t * 1.4)))
    for (let i = 0; i < 3; i++) { const fase = (a * 0.45 + i / 3) % 1; extra += `<text x="${f1(hc.x + (50 + fase * 60) * s)}" y="${f1(cy - HEAD_R - fase * 80 * s)}" font-family="Unbounded" font-weight="900" font-size="${f1((22 + i * 6) * s)}" fill="${INK}" opacity="${f1(k * Math.sin(fase * Math.PI))}">z</text>` }
  } else if (emo === 'suor') {
    brow = lerp(brow, 20, k); mouth = lerp(mouth, -0.35, k)
    const fase = (a * 0.6) % 1, x = hc.x - 46 * s, y = cy - 36 * s + fase * 40 * s
    extra += `<path d="M ${f1(x)} ${f1(y - 12 * s)} Q ${f1(x + 9 * s)} ${f1(y + 4 * s)} ${f1(x)} ${f1(y + 9 * s)} Q ${f1(x - 9 * s)} ${f1(y + 4 * s)} ${f1(x)} ${f1(y - 12 * s)} Z" fill="#5BC8FF" opacity="${f1(k * (1 - fase * 0.5))}"/>`
  } else if (emo === 'dinheiro') {
    mouth = lerp(mouth, 1.0, k)
    olhos = () => [-1, 1].map((l) => `<text x="${f1(cx + l * ex)}" y="${f1(ey + 11 * s)}" text-anchor="middle" font-family="Unbounded" font-weight="900" font-size="${f1(30 * s * (1 + 0.15 * Math.sin(t * 8)))}" fill="#16a34a" opacity="${f1(Math.max(0.15, k))}">$</text>`).join('')
  }
  // a boca mexe enquanto ele fala (menos quando a emoção manda na boca)
  if (fala && !['susto', 'sono', 'triste'].includes(emo)) open = Math.max(open, 0.32 + 0.3 * Math.abs(Math.sin(t * 13)) - 0.32 * Math.abs(Math.sin(t * 5.3)))
  const er = Math.max(2.5 * s, 8 * s * eye * pisca), by = ey - 24 * s, bt = brow * 0.6 * s, mw = 24 * s, my = cy + 26 * s
  const boca = open > 0.3
    ? `<ellipse cx="${f1(cx)}" cy="${f1(my)}" rx="${f1(10 * s)}" ry="${f1(13 * s * open)}" fill="${INK}"/>`
    : `<path d="M ${f1(cx - mw)} ${f1(my)} Q ${f1(cx)} ${f1(my + mouth * 20 * s)} ${f1(cx + mw)} ${f1(my)}" stroke="${INK}" stroke-width="${f1(7 * s)}" fill="none" stroke-linecap="round"/>`
  return `
    <circle cx="${f1(hc.x)}" cy="${f1(cy)}" r="${HEAD_R}" fill="${corCara}" stroke="${INK}" stroke-width="${STK}"/>
    ${[-1, 1].map((l) => `<ellipse cx="${f1(cx + l * (ex + 14 * s))}" cy="${f1(cy + 14 * s)}" rx="${f1(13 * s)}" ry="${f1(8 * s)}" fill="#ff8fa3" opacity="${f1(bochecha)}"/>`).join('')}
    ${sobrancelhas ?? `<line x1="${f1(cx - ex - 14 * s)}" y1="${f1(by + bt)}" x2="${f1(cx - ex + 14 * s)}" y2="${f1(by - bt)}" stroke="${INK}" stroke-width="${f1(8 * s)}" stroke-linecap="round"/><line x1="${f1(cx + ex - 14 * s)}" y1="${f1(by - bt)}" x2="${f1(cx + ex + 14 * s)}" y2="${f1(by + bt)}" stroke="${INK}" stroke-width="${f1(8 * s)}" stroke-linecap="round"/>`}
    ${olhos ? olhos(er) : `<circle cx="${f1(cx - ex)}" cy="${f1(ey)}" r="${f1(er)}" fill="${INK}"/><circle cx="${f1(cx + ex)}" cy="${f1(ey)}" r="${f1(er)}" fill="${INK}"/>${eye > 1.4 ? `<circle cx="${f1(cx - ex + 3 * s)}" cy="${f1(ey - 3 * s)}" r="${f1(3 * s)}" fill="#fff"/><circle cx="${f1(cx + ex + 3 * s)}" cy="${f1(ey - 3 * s)}" r="${f1(3 * s)}" fill="#fff"/>` : ''}`}
    ${boca}${extra}${frente}`
}
