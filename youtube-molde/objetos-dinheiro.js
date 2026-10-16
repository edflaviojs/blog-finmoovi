// CATÁLOGO DE OBJETOS — leva 1, grupo DINHEIRO E CONTAS. Cada objeto é desenhado na janela de 900×560.
// a = segundos desde que o objeto entrou. Precisa de objetos.js (pop, txt, cores) e de metaforas.js (moeda).
Object.assign(OBJ, {
  nota(a) {
    // três notas a cair em leque, uma de cada vez
    let s = ''
    for (let i = 0; i < 3; i++) {
      const e = entra(a - i * 0.15, 2, 0.6), y = lerp(-200, 260 + i * 30, Math.min(1, e))
      s += `<g transform="translate(${330 + i * 120} ${y.toFixed(1)}) rotate(${(-12 + i * 12 + 4 * Math.sin(a * 3 + i)).toFixed(1)})"><rect x="-150" y="-70" width="300" height="140" rx="14" fill="${OG}"/><rect x="-136" y="-56" width="272" height="112" rx="10" fill="none" stroke="#166534" stroke-width="5"/><circle r="40" fill="none" stroke="#166534" stroke-width="7"/>${txt(0, 13, 'R$', 34, '#166534', 900)}</g>`
    }
    return s
  },
  moedas(a) {
    // uma pilha de moedas a crescer, moeda a moeda
    let s = ''
    const n = Math.min(9, Math.floor(a * 8))
    for (let i = 0; i < n; i++) s += `<ellipse cx="450" cy="${470 - i * 26}" rx="90" ry="26" fill="#e0b400"/><ellipse cx="450" cy="${462 - i * 26}" rx="90" ry="26" fill="${OY}"/>`
    const cai = a * 8 - n
    if (n < 9) s += `<ellipse cx="450" cy="${lerp(-40, 462 - n * 26, cai).toFixed(1)}" rx="90" ry="26" fill="${OY}"/>`
    return s + txt(450, 470 - n * 26 - 2, 'R$', 26, '#6b4f00')
  },
  carteira(a) {
    // a carteira abre e sai uma traça: está vazia
    const abre = clamp(S(a - 0.5, 2, 0.6), 0, 1.1)
    const voo = clamp((a - 0.8) / 1.6)
    const traca = voo > 0 ? `<g transform="translate(${(450 + 160 * voo + 30 * Math.sin(voo * 12)).toFixed(1)} ${(250 - 200 * voo).toFixed(1)})"><ellipse rx="22" ry="12" fill="#d6c7a1"/><path d="M-6 -6 q-26 -30 -40 -6 q20 6 40 6z M6 -6 q26 -30 40 -6 q-20 6 -40 6z" fill="#e8dcc0" transform="scale(1 ${(0.6 + 0.4 * Math.sin(a * 30)).toFixed(2)})"/></g>` : ''
    return pop(a, 450, 330, `<rect x="-170" y="-90" width="340" height="190" rx="28" fill="#7c4a2d"/><g transform="translate(0 -90) rotate(${(-28 * abre).toFixed(1)} -170 0)"><rect x="-170" y="-10" width="340" height="90" rx="24" fill="#9a5f3b"/></g><rect x="40" y="-10" width="150" height="70" rx="20" fill="#9a5f3b"/><circle cx="150" cy="25" r="12" fill="${OY}"/>`) + traca
  },
  cartao(a) {
    // o cartão desliza e passa na maquininha; a luz fica verde
    const x = lerp(-300, 360, clamp(S(a, 1.5, 0.8), 0, 1.05)), passou = a > 1.0
    return `<g transform="translate(560 120)"><rect x="0" y="0" width="200" height="320" rx="30" fill="#21262d"/><rect x="24" y="30" width="152" height="100" rx="12" fill="${passou ? OG : '#0d1117'}"/>${txt(100, 92, passou ? '✓' : '...', 40, passou ? OK : OGr)}${[0, 1, 2].map((r) => [0, 1, 2].map((c) => `<rect x="${32 + c * 48}" y="${160 + r * 46}" width="38" height="34" rx="8" fill="${ODk}"/>`).join('')).join('')}</g>
      <g transform="translate(${x.toFixed(1)} 300) rotate(${(-8 + 8 * clamp(a)).toFixed(1)})"><rect x="-150" y="-95" width="300" height="190" rx="22" fill="${OV}"/><rect x="-120" y="-50" width="60" height="44" rx="8" fill="${OY}"/><rect x="-120" y="40" width="200" height="14" rx="7" fill="#ffffff" opacity="0.7"/></g>`
  },
  boleto(a) {
    // o boleto desenrola e leva o carimbo
    const abre = clamp(S(a, 1.6, 0.8))
    const carimbo = clamp(S(a - 0.9, 4, 0.55), 0, 1.2)
    return `<g transform="translate(450 ${(140 + (1 - abre) * 80).toFixed(1)})"><rect x="-220" y="0" width="440" height="${(320 * abre).toFixed(1)}" rx="16" fill="${OW}"/>
      ${abre > 0.5 ? `<rect x="-190" y="30" width="200" height="16" rx="8" fill="${OGr}"/><rect x="-190" y="64" width="300" height="12" rx="6" fill="#c9d1d9"/><rect x="-190" y="90" width="260" height="12" rx="6" fill="#c9d1d9"/>${[...Array(26)].map((_, i) => `<rect x="${-190 + i * 15}" y="200" width="${i % 3 ? 6 : 10}" height="80" fill="${OK}"/>`).join('')}` : ''}</g>
      ${carimbo > 0 ? `<g transform="translate(560 260) rotate(-14) scale(${carimbo.toFixed(3)})"><rect x="-130" y="-40" width="260" height="80" rx="12" fill="none" stroke="${OR}" stroke-width="8"/>${txt(0, 14, 'VENCIDO', 38, OR, 900)}</g>` : ''}`
  },
  fatura(a) {
    // a fatura é uma tira comprida que não acaba de sair
    const sai = Math.min(1, a / 1.8)
    const h = 60 + 420 * sai
    let linhas = ''
    for (let i = 0; i < Math.floor(h / 40) - 1; i++) linhas += `<rect x="-140" y="${30 + i * 40}" width="${120 + (i * 37) % 100}" height="12" rx="6" fill="#c9d1d9"/><rect x="60" y="${30 + i * 40}" width="80" height="12" rx="6" fill="${OR}" opacity="0.8"/>`
    return `<rect x="300" y="40" width="300" height="40" rx="12" fill="${ODk}"/><g transform="translate(450 80)"><path d="M-170 0 H170 V${h.toFixed(1)} l-20 14 l-20 -14 l-20 14 l-20 -14 l-20 14 l-20 -14 l-20 14 l-20 -14 l-20 14 l-20 -14 l-20 14 l-20 -14 l-20 14 l-20 -14 l-20 14 l-20 -14 l-20 14 Z" fill="${OW}"/>${linhas}</g>`
  },
  celular(a) {
    // o celular vibra com a notificação a chegar
    const vib = a < 1.2 ? Math.sin(a * 70) * 6 * Math.exp(-a * 1.5) : 0
    const n = clamp(S(a - 0.35, 3, 0.65), 0, 1.1)
    return pop(a, 450, 290, `<g transform="translate(${vib.toFixed(1)} 0) rotate(${(vib * 0.4).toFixed(2)})"><rect x="-120" y="-230" width="240" height="460" rx="40" fill="${OK}"/><rect x="-104" y="-200" width="208" height="400" rx="26" fill="#1c2b4a"/><rect x="-36" y="-218" width="72" height="12" rx="6" fill="#30363d"/>
      <g transform="translate(0 -110) scale(${n.toFixed(3)})"><rect x="-94" y="-46" width="188" height="92" rx="18" fill="${OW}"/><rect x="-80" y="-30" width="40" height="40" rx="10" fill="${OC}"/><rect x="-28" y="-26" width="100" height="12" rx="6" fill="${OGr}"/><rect x="-28" y="-4" width="80" height="12" rx="6" fill="#c9d1d9"/></g></g>`)
  },
  calculadora(a) {
    // as teclas acendem uma a uma e o visor conta
    const k = Math.floor(a * 6) % 12
    const visor = Math.floor(clamp(a / 1.6) * 1200)
    let teclas = ''
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) teclas += `<rect x="${-110 + c * 76}" y="${-40 + r * 62}" width="64" height="50" rx="12" fill="${r * 3 + c === k ? OY : '#30363d'}"/>`
    return pop(a, 450, 300, `<rect x="-140" y="-200" width="280" height="420" rx="34" fill="#21262d" stroke="${OW}" stroke-width="6"/><rect x="-110" y="-170" width="220" height="100" rx="14" fill="#a3c9a8"/>${txt(90, -103, visor.toLocaleString('pt-BR'), 42, '#1f3d24', 800).replace('text-anchor="middle"', 'text-anchor="end"')}${teclas}`)
  },
  cofrinho(a) {
    // o porquinho recebe moedas pela fenda
    let m = ''
    for (let i = 0; i < 3; i++) { const u = clamp((a - 0.5 - i * 0.35) / 0.5); if (u > 0 && u < 1) m += moeda(450 + 20 * i, lerp(-30, 150, u), 28) }
    return m + pop(a, 450, 330, `<ellipse cx="0" cy="0" rx="190" ry="140" fill="${OP}"/><circle cx="160" cy="-20" r="54" fill="#ff7ab8"/><circle cx="148" cy="-28" r="8" fill="${OK}"/><circle cx="174" cy="-28" r="8" fill="${OK}"/><circle cx="90" cy="-60" r="12" fill="${OK}"/><path d="M60 -150 l40 0 l-10 40 z" fill="#ff7ab8"/><rect x="-30" y="-142" width="70" height="14" rx="7" fill="${OK}"/>${[-110, -40, 50, 120].map((x) => `<rect x="${x - 18}" y="110" width="36" height="60" rx="14" fill="${OP}"/>`).join('')}<path d="M-190 -10 q-50 -10 -40 -50" fill="none" stroke="${OP}" stroke-width="12" stroke-linecap="round"/>`)
  },
  banco(a) {
    // o prédio do banco com as colunas a subir
    let col = ''
    for (let i = 0; i < 5; i++) { const h = 200 * clamp(S(a - 0.1 - i * 0.07, 2.4, 0.7), 0, 1.05); col += `<rect x="${-200 + i * 90}" y="${(380 - h).toFixed(1)}" width="40" height="${h.toFixed(1)}" fill="${OW}"/>` }
    return `<g transform="translate(450 0)"><path d="M-260 180 L0 50 L260 180 Z" fill="${OW}" opacity="${clamp(a * 3).toFixed(2)}"/>${txt(0, 155, 'BANCO', 44, OK, 900)}${col}<rect x="-270" y="380" width="540" height="40" rx="8" fill="${OW}"/><rect x="-300" y="420" width="600" height="30" rx="8" fill="${OGr}"/></g>`
  },
  'grafico-sobe'(a) {
    // as barras sobem e a seta vai para cima
    const h = [90, 140, 120, 210, 300]
    let s = h.map((v, i) => { const e = clamp(S(a - i * 0.12, 2.4, 0.6), 0, 1.08); return `<rect x="${220 + i * 100}" y="${(460 - v * e).toFixed(1)}" width="70" height="${(v * e).toFixed(1)}" rx="10" fill="${i === 4 ? OG : OC}"/>` }).join('')
    const u = clamp((a - 0.6) / 0.8)
    return s + `<path d="M200 380 L${lerp(200, 700, u).toFixed(1)} ${lerp(380, 120, u).toFixed(1)}" stroke="${OY}" stroke-width="14" stroke-linecap="round"/>${u > 0.95 ? `<path d="M700 120 l-50 4 l30 40 z" fill="${OY}"/>` : ''}<line x1="190" y1="462" x2="740" y2="462" stroke="${OW}" stroke-width="6"/>`
  },
  'grafico-desce'(a) {
    const h = [300, 240, 250, 150, 70]
    let s = h.map((v, i) => { const e = clamp(S(a - i * 0.12, 2.4, 0.6), 0, 1.08); return `<rect x="${220 + i * 100}" y="${(460 - v * e).toFixed(1)}" width="70" height="${(v * e).toFixed(1)}" rx="10" fill="${i === 4 ? OR : '#8b949e'}"/>` }).join('')
    const u = clamp((a - 0.6) / 0.8)
    return s + `<path d="M200 140 L${lerp(200, 720, u).toFixed(1)} ${lerp(140, 420, u).toFixed(1)}" stroke="${OR}" stroke-width="14" stroke-linecap="round"/><line x1="190" y1="462" x2="740" y2="462" stroke="${OW}" stroke-width="6"/>`
  },
  juros(a) {
    // o sinal de % cresce e multiplica-se
    let s = ''
    for (let i = 0; i < 6; i++) { const e = clamp(S(a - i * 0.2, 2.2, 0.55), 0, 1.15); const g = i / 6 * Math.PI * 2 + a * 0.6; s += `<g transform="translate(${(450 + Math.cos(g) * 280).toFixed(1)} ${(280 + Math.sin(g) * 170).toFixed(1)}) scale(${(e * 0.45).toFixed(3)})">${txt(0, 40, '%', 140, OR, 900)}</g>` }
    const p = 1 + 0.08 * Math.sin(a * 6)
    return s + `<g transform="translate(450 290) scale(${(entra(a) * p).toFixed(3)})">${txt(0, 70, '%', 230, OY, 900)}</g>`
  },
  lista(a) {
    // o caderno com a lista a escrever-se sozinha, e a caneta a andar
    const n = Math.min(6, a * 3.5)
    let l = ''
    for (let i = 0; i < 6; i++) { const w = clamp(n - i) * 300; if (w > 0) l += `<rect x="-160" y="${-150 + i * 52}" width="${w.toFixed(1)}" height="12" rx="6" fill="#58a6ff"/>` }
    const i0 = Math.min(5, Math.floor(n)), px = -160 + clamp(n - i0) * 300
    return pop(a, 450, 290, `<rect x="-210" y="-220" width="420" height="440" rx="20" fill="${OW}"/>${[...Array(8)].map((_, i) => `<line x1="-210" y1="${-160 + i * 52}" x2="210" y2="${-160 + i * 52}" stroke="#c9d1d9" stroke-width="3"/>`).join('')}<line x1="-150" y1="-220" x2="-150" y2="220" stroke="${OR}" stroke-width="4"/>${l}
      <g transform="translate(${px.toFixed(1)} ${(-160 + i0 * 52).toFixed(1)}) rotate(40)"><rect x="-10" y="-120" width="20" height="120" rx="6" fill="${OY}"/><path d="M-10 0 l10 24 l10 -24z" fill="${OK}"/></g>`)
  },
  'caixa-eletronico'(a) {
    // a máquina solta as notas pela ranhura
    const sai = clamp((a - 0.6) / 0.8)
    return pop(a, 450, 290, `<rect x="-180" y="-230" width="360" height="460" rx="24" fill="#21262d" stroke="${OW}" stroke-width="6"/><rect x="-130" y="-190" width="260" height="160" rx="12" fill="#1c2b4a"/>${txt(0, -100, 'SAQUE', 36, OC, 900)}<rect x="-120" y="40" width="240" height="18" rx="9" fill="${OK}"/>
      <g transform="translate(0 ${(50 + sai * 90).toFixed(1)})"><rect x="-100" y="0" width="200" height="${(sai * 110).toFixed(1)}" rx="8" fill="${OG}"/></g>${[0, 1, 2].map((r) => [0, 1, 2].map((c) => `<rect x="${-90 + c * 60}" y="${-10 - 0 + r * 0}" width="0" height="0"/>`).join('')).join('')}`)
  },
  calendario(a) {
    // as folhas do calendário arrancam-se até o dia do vencimento, que fica vermelho
    const folhas = Math.min(3, Math.floor(a * 2.5))
    let s = ''
    for (let i = 0; i < 3 - folhas; i++) s += `<rect x="-170" y="${-150 + i * 4}" width="340" height="300" rx="20" fill="${OW}" stroke="#c9d1d9" stroke-width="3"/>`
    const dia = 8 + folhas, voa = a * 2.5 - folhas
    const voando = folhas < 3 ? `<g transform="translate(${(voa * 320).toFixed(1)} ${(-voa * 160).toFixed(1)}) rotate(${(voa * 60).toFixed(1)})"><rect x="-170" y="-150" width="340" height="300" rx="20" fill="${OW}" opacity="${(1 - voa).toFixed(2)}"/></g>` : ''
    return pop(a, 450, 300, `<rect x="-170" y="-150" width="340" height="300" rx="20" fill="${OW}"/><rect x="-170" y="-150" width="340" height="80" rx="20" fill="${folhas >= 3 ? OR : OC}"/>${txt(0, -95, 'VENCE', 32, OK, 900)}${txt(0, 90, String(dia), 140, folhas >= 3 ? OR : OK, 900)}${s}${voando}`)
  },
  envelope(a) {
    // o envelope abre e o dinheiro separado aparece
    const abre = clamp(S(a - 0.4, 2, 0.7), 0, 1.05)
    return pop(a, 450, 320, `<rect x="-200" y="-120" width="400" height="240" rx="16" fill="#e8d9b8"/><g transform="translate(0 ${(-60 * abre).toFixed(1)})"><rect x="-150" y="-110" width="300" height="130" rx="10" fill="${OG}"/>${txt(0, -30, 'R$', 50, '#166534', 900)}</g><path d="M-200 -120 L0 ${(20 - 160 * abre).toFixed(1)} L200 -120 Z" fill="#d6c49c"/><path d="M-200 120 L-20 0 M200 120 L20 0" stroke="#c9b48a" stroke-width="5"/>`)
  },
  contrato(a) {
    // a caneta assina o contrato
    const u = clamp((a - 0.5) / 1.0)
    let d = 'M-120 120'; for (let i = 1; i <= 30 * u; i++) d += ` L${(-120 + i * 8).toFixed(1)} ${(120 - 18 * Math.sin(i * 0.9)).toFixed(1)}`
    return pop(a, 450, 290, `<rect x="-190" y="-230" width="380" height="460" rx="16" fill="${OW}"/>${txt(0, -170, 'CONTRATO', 34, OK, 900)}${[...Array(6)].map((_, i) => `<rect x="-150" y="${-120 + i * 34}" width="${300 - (i % 2) * 60}" height="10" rx="5" fill="#c9d1d9"/>`).join('')}<line x1="-140" y1="140" x2="140" y2="140" stroke="${OK}" stroke-width="4"/><path d="${d}" fill="none" stroke="#1f6feb" stroke-width="6" stroke-linecap="round"/>
      <g transform="translate(${(-120 + 240 * u).toFixed(1)} ${(120 - 18 * Math.sin(30 * u * 0.9)).toFixed(1)}) rotate(35)"><rect x="-10" y="-150" width="20" height="150" rx="6" fill="${OK}"/><path d="M-10 0 l10 24 l10 -24z" fill="${OY}"/></g>`)
  },
  etiqueta(a) {
    // a etiqueta de preço balança; o preço é riscado e cai
    const risca = clamp((a - 0.7) / 0.4)
    return pop(a, 450, 290, `<g transform="rotate(${(10 * Math.sin(a * 3) * Math.exp(-a * 0.5)).toFixed(2)} 0 -170)"><line x1="0" y1="-250" x2="0" y2="-170" stroke="${OW}" stroke-width="5"/><path d="M-170 -120 L0 -190 L170 -120 V170 H-170 Z" fill="${OY}"/><circle cy="-140" r="16" fill="${OK}"/>${txt(0, 0, 'R$ 99', 64, OK, 900)}<line x1="-120" y1="-20" x2="${(-120 + 240 * risca).toFixed(1)}" y2="-20" stroke="${OR}" stroke-width="10" stroke-linecap="round"/>${risca >= 1 ? txt(0, 110, 'R$ 79', 70, OR, 900) : ''}</g>`)
  },
  'saco-dinheiro'(a) {
    // o saco cai pesado e quica
    const cai = clamp(S(a, 1.4, 0.4), 0, 1.15)
    return `<g transform="translate(450 ${lerp(-260, 300, cai).toFixed(1)})"><path d="M-60 -170 q60 -40 120 0 l-30 50 h-60z" fill="#b5835a"/><rect x="-40" y="-130" width="80" height="20" rx="10" fill="#7c4a2d"/><path d="M-50 -115 C-220 -60 -230 150 -130 170 H130 C230 150 220 -60 50 -115 Z" fill="#c8955f"/>${txt(0, 70, 'R$', 110, '#6b3d1e', 900)}</g><ellipse cx="450" cy="480" rx="${(160 * cai).toFixed(1)}" ry="18" fill="#000" opacity="0.2"/>`
  },
  lupa(a) {
    // a lupa passa à procura e aumenta o que encontra
    const x = 450 + 220 * Math.sin(a * 1.6), y = 280 + 60 * Math.sin(a * 2.3)
    return `${[...Array(5)].map((_, i) => `<rect x="${160 + i * 120}" y="${200 + (i % 2) * 90}" width="90" height="16" rx="8" fill="#c9d1d9"/>`).join('')}<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${entra(a).toFixed(3)})"><circle r="110" fill="#9ad7ff" opacity="0.35"/><circle r="110" fill="none" stroke="${OW}" stroke-width="22"/><rect x="70" y="80" width="40" height="150" rx="16" fill="${OO}" transform="rotate(-45 90 155)"/>${txt(0, 18, 'R$', 60, OK, 900)}</g>`
  },
  cadeado(a) {
    // o cadeado fecha com um estalo
    const fecha = clamp(S(a - 0.6, 4, 0.5), 0, 1.1)
    return pop(a, 450, 320, `<path d="M-90 -60 V-130 a90 90 0 0 1 180 0 V${(-60 - 60 * (1 - Math.min(1, fecha))).toFixed(1)}" fill="none" stroke="${OGr}" stroke-width="34" transform="translate(0 ${(-50 * (1 - Math.min(1, fecha))).toFixed(1)})"/><rect x="-150" y="-70" width="300" height="230" rx="34" fill="${OY}"/><circle cy="30" r="28" fill="${OK}"/><rect x="-10" y="40" width="20" height="60" rx="8" fill="${OK}"/>`)
  },
})
