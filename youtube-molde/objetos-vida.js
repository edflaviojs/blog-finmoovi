// CATÁLOGO DE OBJETOS — leva 2: COMIDA, SAÚDE, ESCOLA, FESTAS, TRABALHO e a VIDA EM CASA.
Object.assign(OBJ, {
  lanche(a) {
    // o hambúrguer monta-se, camada a camada, a cair do céu
    const cam = [['#d9a05b', 70, 26, 40], ['#4ade80', 90, 14, 20], ['#7c3f22', 86, 22, 30], ['#FDE047', 88, 10, 14], ['#FF5A4E', 80, 12, 18], ['#e8b06a', 80, 40, 50]]
    let s = '', y = 430
    cam.forEach(([cor, rx, ry, h], i) => { const e = clamp(S(a - i * 0.12, 2.6, 0.6), 0, 1.08), yy = lerp(-100, y, Math.min(1, e)); s += `<ellipse cx="450" cy="${yy.toFixed(1)}" rx="${rx * 2}" ry="${ry * 2}" fill="${cor}"/>`; y -= h })
    return s
  },
  pizza(a) {
    // a pizza gira e uma fatia sai puxando o queijo
    const g = a * 30, sai = clamp(S(a - 0.6, 1.6, 0.7), 0, 1.05)
    let s = `<g transform="translate(450 290) rotate(${g.toFixed(1)}) scale(${entra(a).toFixed(3)})"><circle r="200" fill="#d9a05b"/><circle r="175" fill="#FDE047"/>`
    for (let i = 0; i < 7; i++) { const t = i / 7 * Math.PI * 2; s += `<circle cx="${(Math.cos(t) * 110).toFixed(1)}" cy="${(Math.sin(t) * 110).toFixed(1)}" r="26" fill="#FF5A4E"/>` }
    return s + `<g transform="translate(${(sai * 140).toFixed(1)} ${(-sai * 60).toFixed(1)})"><path d="M0 0 L200 -40 A200 200 0 0 1 180 80 Z" fill="#d9a05b"/><path d="M10 0 L178 -30 A180 180 0 0 1 160 70 Z" fill="#FDE047"/></g></g>`
  },
  cafe(a) {
    // a xícara com o vapor a subir
    let v = ''
    for (let i = 0; i < 3; i++) { const u = ((a * 0.8 + i / 3) % 1); v += `<path d="M${410 + i * 40} ${230 - u * 120} q-20 -20 0 -40 q20 -20 0 -40" fill="none" stroke="${OW}" stroke-width="10" stroke-linecap="round" opacity="${(1 - u).toFixed(2)}"/>` }
    return v + pop(a, 450, 360, `<path d="M-130 -80 H130 L110 90 Q100 120 70 120 H-70 Q-100 120 -110 90 Z" fill="${OW}"/><path d="M130 -40 q80 0 70 60 q-10 50 -80 40" fill="none" stroke="${OW}" stroke-width="22"/><ellipse cx="0" cy="-80" rx="130" ry="22" fill="#7c3f22"/><ellipse cx="0" cy="140" rx="200" ry="24" fill="#c9d1d9"/>`)
  },
  churrasco(a) {
    // a churrasqueira com as brasas e os espetos a girar
    let fumo = ''
    for (let i = 0; i < 4; i++) { const u = ((a * 0.6 + i / 4) % 1); fumo += `<circle cx="${(400 + i * 40 + 30 * Math.sin(u * 6)).toFixed(1)}" cy="${(250 - u * 220).toFixed(1)}" r="${(20 + u * 40).toFixed(1)}" fill="#c9d1d9" opacity="${((1 - u) * 0.5).toFixed(2)}"/>` }
    return fumo + pop(a, 450, 360, `<rect x="-240" y="-60" width="480" height="120" rx="20" fill="#30363d"/>${[...Array(9)].map((_, i) => `<circle cx="${-200 + i * 50}" cy="-60" r="${(10 + 4 * Math.sin(a * 8 + i)).toFixed(1)}" fill="${i % 2 ? '#FF8A3D' : '#FF5A4E'}"/>`).join('')}${[-120, 0, 120].map((x, i) => `<g transform="translate(${x} -90)"><rect x="-90" y="-6" width="180" height="12" fill="#8b949e"/>${[-50, 0, 50].map((dx) => `<rect x="${dx - 20}" y="-26" width="40" height="40" rx="10" fill="${(Math.floor(a * 3) + i) % 2 ? '#7c3f22' : '#a0522d'}"/>`).join('')}</g>`).join('')}<rect x="-200" y="60" width="20" height="90" fill="#30363d"/><rect x="180" y="60" width="20" height="90" fill="#30363d"/>`)
  },
  bolo(a) {
    // o bolo com as velinhas acesas
    const fl = 1 + 0.15 * Math.sin(a * 22)
    return pop(a, 450, 330, `<rect x="-200" y="-40" width="400" height="160" rx="20" fill="${OP}"/><rect x="-170" y="-140" width="340" height="110" rx="18" fill="#ff7ab8"/><path d="M-170 -110 q30 30 60 0 t60 0 t60 0 t60 0 t60 0" fill="none" stroke="${OW}" stroke-width="16"/>${[-90, -30, 30, 90].map((x) => `<rect x="${x - 8}" y="-210" width="16" height="70" rx="6" fill="${OC}"/><path transform="translate(${x} -214) scale(1 ${fl.toFixed(2)})" d="M0 0 C-12 -10 -8 -30 0 -42 C8 -30 12 -10 0 0Z" fill="${OY}"/>`).join('')}<ellipse cx="0" cy="124" rx="240" ry="26" fill="#c9d1d9"/>`)
  },
  presente(a) {
    // a caixa treme e abre-se: a tampa salta
    const abre = clamp(S(a - 0.8, 2.6, 0.5), 0, 1.15), tr = a < 0.8 ? Math.sin(a * 40) * 5 : 0
    return pop(a, 450, 330, `<g transform="translate(${tr.toFixed(1)} 0)"><rect x="-170" y="-60" width="340" height="200" rx="14" fill="${OR}"/><rect x="-25" y="-60" width="50" height="200" fill="${OY}"/>
      <g transform="translate(0 ${(-170 * abre).toFixed(1)}) rotate(${(-20 * abre).toFixed(1)})"><rect x="-190" y="-110" width="380" height="60" rx="12" fill="#e5383b"/><rect x="-25" y="-110" width="50" height="60" fill="${OY}"/><path d="M0 -110 C-60 -190 -120 -130 0 -110 C120 -130 60 -190 0 -110Z" fill="${OY}"/></g></g>`)
  },
  'arvore-natal'(a) {
    // a árvore com as luzinhas a piscar
    let luzes = ''
    for (let i = 0; i < 12; i++) { const on = Math.sin(a * 6 + i * 1.7) > 0; luzes += `<circle cx="${(-120 + (i % 4) * 80 + (Math.floor(i / 4) * 20)).toFixed(1)}" cy="${(-30 + Math.floor(i / 4) * 80 - (i % 2) * 20).toFixed(1)}" r="12" fill="${on ? ['#FDE047', '#FF4FA0', '#22D3EE'][i % 3] : '#30363d'}"/>` }
    return pop(a, 450, 300, `<path d="M0 -240 L180 40 H-180 Z M0 -140 L210 170 H-210 Z" fill="#2ea043"/>${luzes}<path d="M0 -270 l14 30 l32 4 l-24 22 l6 32 l-28 -16 l-28 16 l6 -32 l-24 -22 l32 -4z" fill="${OY}"/><rect x="-30" y="170" width="60" height="70" fill="#7c4a2d"/>`)
  },
  roupa(a) {
    // a camiseta no cabide com a etiqueta do preço
    const bal = 8 * Math.sin(a * 2.5) * Math.exp(-a * 0.6)
    return pop(a, 450, 300, `<g transform="rotate(${bal.toFixed(1)} 0 -200)"><path d="M0 -240 q20 0 20 20 q0 20 -20 30 L-160 -150 H160 L0 -190" fill="none" stroke="#8b949e" stroke-width="8"/><path d="M-150 -150 L-60 -170 Q0 -130 60 -170 L150 -150 L220 -60 L160 -20 L130 -60 V200 H-130 V-60 L-160 -20 L-220 -60 Z" fill="${OC}"/><g transform="translate(100 -40) rotate(15)"><rect x="-10" y="0" width="90" height="56" rx="8" fill="${OY}"/>${txt(35, 36, 'R$', 22, OK, 900)}</g></g>`)
  },
  remedio(a) {
    // o frasco abre e os comprimidos caem, um por um
    let pil = ''
    for (let i = 0; i < 5; i++) { const u = clamp((a - 0.5 - i * 0.18) / 0.5); if (u > 0) pil += `<g transform="translate(${(520 + i * 40 - 40 * (1 - u)).toFixed(1)} ${lerp(200, 430 - (i % 2) * 20, u).toFixed(1)}) rotate(${(u * 200 + i * 40).toFixed(1)})"><rect x="-30" y="-14" width="60" height="28" rx="14" fill="${i % 2 ? OP : OW}"/><rect x="0" y="-14" width="30" height="28" rx="14" fill="${OC}"/></g>` }
    return pop(a, 360, 300, `<rect x="-100" y="-130" width="200" height="260" rx="24" fill="#FF8A3D" opacity="0.9"/><rect x="-80" y="-60" width="160" height="110" rx="10" fill="${OW}"/><path d="M-20 -40 h40 v20 h20 v40 h-20 v20 h-40 v-20 h-20 v-40 h20z" fill="${OR}" transform="translate(0 10) scale(0.8)"/><rect x="-110" y="-170" width="220" height="50" rx="12" fill="${OW}" transform="rotate(${(-20 * clamp((a - 0.3) * 3)).toFixed(1)} 110 -120)"/>`) + pil
  },
  dente(a) {
    // o dente com o aparelho a brilhar
    return pop(a, 450, 300, `<path d="M-120 -170 C-200 -170 -210 -60 -180 20 C-150 100 -150 220 -100 220 C-60 220 -60 120 0 120 C60 120 60 220 100 220 C150 220 150 100 180 20 C210 -60 200 -170 120 -170 C70 -170 50 -150 0 -150 C-50 -150 -70 -170 -120 -170Z" fill="${OW}"/><rect x="-160" y="-60" width="320" height="16" rx="8" fill="#8b949e"/>${[-110, -40, 40, 110].map((x) => `<rect x="${x - 18}" y="-72" width="36" height="40" rx="6" fill="#c9d1d9"/>`).join('')}<path transform="translate(150 -150) scale(${(0.5 + 0.5 * Math.abs(Math.sin(a * 4))).toFixed(2)})" d="M0 -30 L8 -8 L30 0 L8 8 L0 30 L-8 8 L-30 0 L-8 -8 Z" fill="${OY}"/>`)
  },
  hospital(a) {
    // a cruz da saúde e o batimento a correr no monitor
    const u = (a * 0.8) % 1
    let d = 'M-200 60'; for (let x = -200; x <= 200; x += 10) { const k = (x + 200) / 400; const pico = Math.abs(k - u) < 0.05 ? -120 * Math.sin((k - u + 0.05) / 0.1 * Math.PI) : 0; d += ` L${x} ${(60 + pico).toFixed(1)}` }
    return pop(a, 450, 280, `<rect x="-240" y="-200" width="480" height="380" rx="30" fill="#21262d" stroke="${OW}" stroke-width="8"/><path d="${d}" fill="none" stroke="${OG}" stroke-width="8" stroke-linejoin="round"/><g transform="translate(0 -110)"><rect x="-26" y="-60" width="52" height="120" rx="8" fill="${OR}"/><rect x="-60" y="-26" width="120" height="52" rx="8" fill="${OR}"/></g>`)
  },
  livro(a) {
    // o livro abre e as páginas viram
    const vira = (a * 2) % 1
    return pop(a, 450, 320, `<path d="M0 -150 Q-120 -190 -260 -150 V160 Q-120 120 0 160 Z" fill="${OW}"/><path d="M0 -150 Q120 -190 260 -150 V160 Q120 120 0 160 Z" fill="#e6edf3"/><line x1="0" y1="-150" x2="0" y2="160" stroke="#8b949e" stroke-width="6"/>${[...Array(5)].map((_, i) => `<rect x="-220" y="${-100 + i * 50}" width="170" height="10" rx="5" fill="#c9d1d9"/>`).join('')}<g transform="scale(${Math.cos(vira * Math.PI).toFixed(3)} 1)"><path d="M0 -150 Q120 -190 250 -150 V160 Q120 120 0 160 Z" fill="${OW}" opacity="0.95"/></g><rect x="-270" y="160" width="540" height="22" rx="8" fill="${OC}"/>`)
  },
  mochila(a) {
    // a mochila escolar recebe os materiais
    let it = ''
    const n = Math.min(3, Math.floor(Math.max(0, a - 0.5) * 3))
    for (let i = 0; i < 3; i++) { if (i >= n) { const u = clamp((a - 0.5) * 3 - i); if (u > 0) it += `<rect x="${(380 + i * 50)}" y="${lerp(-60, 170, u).toFixed(1)}" width="${40 - i * 6}" height="${120 - i * 20}" rx="6" fill="${[OY, OR, OC][i]}"/>` } }
    return it + pop(a, 450, 320, `<path d="M-60 -170 v-40 a60 50 0 0 1 120 0 v40" fill="none" stroke="#8b949e" stroke-width="16"/><rect x="-170" y="-170" width="340" height="340" rx="60" fill="${OV}"/><rect x="-120" y="40" width="240" height="110" rx="30" fill="#8b6fe0"/>${[...Array(n)].map((_, i) => `<rect x="${-70 + i * 50}" y="${-210 + i * 10}" width="${40 - i * 6}" height="70" rx="6" fill="${[OY, OR, OC][i]}"/>`).join('')}`)
  },
  lapis(a) {
    // o lápis escreve a soma no papel
    const u = clamp((a - 0.3) / 1.2)
    return `<rect x="180" y="120" width="540" height="340" rx="14" fill="${OW}"/>${txt(450, 320, '2 + 2', 90, '#1f6feb', 800).replace('<text', `<text clip-path="inset(0 ${((1 - u) * 100).toFixed(0)}% 0 0)"`)}
      <g transform="translate(${lerp(260, 640, u).toFixed(1)} 300) rotate(35)"><rect x="-14" y="-220" width="28" height="200" fill="${OY}"/><rect x="-14" y="-240" width="28" height="30" rx="6" fill="${OP}"/><path d="M-14 -20 L0 20 L14 -20Z" fill="#e8b06a"/><path d="M-5 8 L0 20 L5 8Z" fill="${OK}"/></g>`
  },
  maleta(a) {
    // a maleta de trabalho com a gravata
    return pop(a, 450, 330, `<rect x="-70" y="-180" width="140" height="70" rx="20" fill="none" stroke="#7c4a2d" stroke-width="18"/><rect x="-230" y="-130" width="460" height="290" rx="30" fill="#9a5f3b"/><rect x="-230" y="-20" width="460" height="16" fill="#7c4a2d"/><rect x="-30" y="-36" width="60" height="44" rx="8" fill="${OY}"/>`)
  },
  computador(a) {
    // o notebook abre e a planilha preenche-se
    const abre = clamp(S(a, 1.8, 0.7), 0, 1.05)
    const linhas = Math.min(5, Math.floor(a * 4))
    return `<g transform="translate(450 420)"><rect x="-280" y="0" width="560" height="30" rx="10" fill="#8b949e"/><g transform="scale(1 ${abre.toFixed(3)})"><rect x="-240" y="-320" width="480" height="320" rx="18" fill="${OK}"/><rect x="-220" y="-300" width="440" height="280" rx="8" fill="${OW}"/>${[...Array(linhas)].map((_, i) => `<rect x="-200" y="${-280 + i * 52}" width="400" height="38" rx="4" fill="${i === linhas - 1 ? '#c6f6d5' : '#e6edf3'}"/><rect x="100" y="${-270 + i * 52}" width="80" height="16" rx="4" fill="${i % 2 ? OR : OG}"/>`).join('')}</g></g>`
  },
  telefone(a) {
    // o telefone toca: o fone salta e as ondas saem
    const salta = a < 1.4 ? Math.abs(Math.sin(a * 20)) * 16 : 0
    let ondas = ''
    for (let i = 0; i < 3; i++) { const u = ((a * 1.5 + i / 3) % 1); if (a < 1.4) ondas += `<path d="M${(620 + u * 60).toFixed(1)} ${(180 - u * 40).toFixed(1)} q${(30 + u * 40).toFixed(1)} 60 0 ${(120 + u * 80).toFixed(1)}" fill="none" stroke="${OY}" stroke-width="8" opacity="${(1 - u).toFixed(2)}"/>` }
    return ondas + pop(a, 450, 330, `<rect x="-170" y="-60" width="340" height="190" rx="40" fill="${OR}"/><circle cy="40" r="56" fill="#e5383b"/><circle cy="40" r="20" fill="${OW}"/><g transform="translate(0 ${(-salta).toFixed(1)})"><path d="M-190 -60 Q-190 -150 -120 -150 H120 Q190 -150 190 -60 L130 -60 L110 -100 H-110 L-130 -60 Z" fill="${OK}"/></g>`)
  },
  cama(a) {
    // a cama à noite com os zzz a subir
    let z = ''
    for (let i = 0; i < 3; i++) { const u = ((a * 0.6 + i / 3) % 1); z += txt((560 + u * 120).toFixed(1), (250 - u * 160).toFixed(1), 'z', 40 + i * 14, OW, 900).replace('<text', `<text opacity="${(1 - u).toFixed(2)}"`) }
    return pop(a, 420, 360, `<rect x="-280" y="-20" width="560" height="110" rx="20" fill="#5b8cff"/><rect x="-300" y="-150" width="40" height="300" rx="10" fill="#7c4a2d"/><rect x="260" y="-60" width="40" height="210" rx="10" fill="#7c4a2d"/><rect x="-250" y="-70" width="160" height="60" rx="26" fill="${OW}"/><circle cx="-130" cy="-60" r="40" fill="#e8b06a"/>`) + z
  },
  chuva(a) {
    // a nuvem carregada e a chuva a cair
    let g = ''
    for (let i = 0; i < 18; i++) { const u = ((a * 1.8 + i * 0.111) % 1); g += `<line x1="${250 + (i % 9) * 50 - u * 20}" y1="${(260 + u * 260).toFixed(1)}" x2="${240 + (i % 9) * 50 - u * 20}" y2="${(290 + u * 260).toFixed(1)}" stroke="${OC}" stroke-width="6" stroke-linecap="round"/>` }
    return g + pop(a, 450, 180, `<g fill="#8b949e"><circle cx="-120" cy="20" r="80"/><circle cx="0" cy="-20" r="110"/><circle cx="130" cy="20" r="80"/><rect x="-200" y="20" width="400" height="80" rx="40"/></g>`)
  },
  coracao(a) {
    // o coração bate
    const b = 1 + 0.12 * Math.max(0, Math.sin(a * 7)) ** 8
    return pop(a, 450, 290, `<path transform="scale(${b.toFixed(3)})" d="M0 170 C-260 20 -220 -180 -70 -160 C-20 -150 0 -110 0 -90 C0 -110 20 -150 70 -160 C220 -180 260 20 0 170 Z" fill="${OP}"/>`)
  },
  cachorro(a) {
    // o cachorro abana o rabo
    const rabo = 30 * Math.sin(a * 14)
    return pop(a, 450, 340, `<g transform="rotate(${rabo.toFixed(1)} 170 -40)"><path d="M170 -40 q60 -40 70 -110" fill="none" stroke="#c8955f" stroke-width="22" stroke-linecap="round"/></g><ellipse cx="20" cy="0" rx="190" ry="100" fill="#c8955f"/>${[-120, -40, 80, 150].map((x) => `<rect x="${x - 18}" y="60" width="36" height="110" rx="16" fill="#c8955f"/>`).join('')}<circle cx="-170" cy="-100" r="90" fill="#c8955f"/><ellipse cx="-230" cy="-160" rx="30" ry="60" fill="#9a6b3f" transform="rotate(-20 -230 -160)"/><circle cx="-200" cy="-110" r="12" fill="${OK}"/><ellipse cx="-255" cy="-70" rx="22" ry="16" fill="${OK}"/>`)
  },
  garrafa(a) {
    // dois copos brindam
    const br = clamp(S(a - 0.4, 2, 0.5), 0, 1.1)
    const copo = (lado) => `<g transform="translate(${(450 + lado * (180 - 120 * br)).toFixed(1)} 300) rotate(${(-lado * 18 * br).toFixed(1)})"><path d="M-60 -120 H60 L50 120 H-50 Z" fill="${OY}" opacity="0.9"/><rect x="-62" y="-140" width="124" height="34" rx="14" fill="${OW}"/></g>`
    const tim = br > 0.95 && a < 1.6 ? [0, 1, 2, 3, 4].map((i) => `<line x1="450" y1="${150 - i * 4}" x2="${450 + Math.cos(-Math.PI / 2 + (i - 2) * 0.45) * 90}" y2="${150 + Math.sin(-Math.PI / 2 + (i - 2) * 0.45) * 90}" stroke="${OY}" stroke-width="8" stroke-linecap="round" opacity="${clamp(1.6 - a).toFixed(2)}"/>`).join('') : ''
    return copo(-1) + copo(1) + tim
  },
  ingresso(a) {
    // o ingresso do show/cinema rasga ao meio
    const rasga = clamp(S(a - 0.7, 2, 0.6), 0, 1.05)
    const metade = (s, cor) => `<g transform="translate(${(450 + s * 30 * rasga).toFixed(1)} 290) rotate(${(s * 8 * rasga).toFixed(1)})"><path d="${s < 0 ? 'M-260 -110 H0 V110 H-260 a30 30 0 0 0 0 -60 V-50 a30 30 0 0 0 0 -60z' : 'M0 -110 H260 a30 30 0 0 0 0 60 V50 a30 30 0 0 0 0 60 H0z'}" fill="${cor}"/></g>`
    return metade(-1, OP) + metade(1, '#ff7ab8') + txt(330 - 30 * rasga, 312, 'SHOW', 56, OW, 900)
  },
  haltere(a) {
    // o haltere sobe e desce (a academia)
    const y = 300 - 80 * Math.abs(Math.sin(a * 3))
    return `<g transform="translate(450 ${y.toFixed(1)}) scale(${entra(a).toFixed(3)})"><rect x="-170" y="-14" width="340" height="28" rx="10" fill="#8b949e"/>${[-1, 1].map((s) => `<rect x="${s * 150 - 30}" y="-80" width="60" height="160" rx="14" fill="${OK}"/><rect x="${s * 210 - 20}" y="-60" width="40" height="120" rx="12" fill="#30363d"/>`).join('')}</g>`
  },
  sacola(a) {
    // as sacolas das compras caem uma ao lado da outra
    return [0, 1, 2].map((i) => { const e = clamp(S(a - i * 0.18, 2.2, 0.55), 0, 1.1); return `<g transform="translate(${260 + i * 190} ${lerp(-200, 330, Math.min(1, e)).toFixed(1)})"><path d="M-40 -150 v-30 a40 40 0 0 1 80 0 v30" fill="none" stroke="${OK}" stroke-width="10"/><path d="M-90 -150 H90 L110 140 H-110 Z" fill="${[OP, OC, OY][i]}"/>${txt(0, 20, 'R$', 40, OK, 900)}</g>` }).join('')
  },
  carta(a) {
    // o envelope de mensagem chega a voar e abre
    const x = lerp(-200, 450, clamp(S(a, 1.4, 0.8), 0, 1.04)), y = 280 - 60 * Math.sin(clamp(a / 0.8) * Math.PI)
    return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(-10 + 10 * clamp(a)).toFixed(1)})"><rect x="-200" y="-130" width="400" height="260" rx="16" fill="${OW}"/><path d="M-200 -130 L0 20 L200 -130" fill="none" stroke="#c9d1d9" stroke-width="10"/><circle cx="150" cy="-100" r="40" fill="${OR}"/>${txt(150, -86, '1', 40, OW, 900)}</g>`
  },
  megafone(a) {
    // o megafone grita a promoção
    let ondas = ''
    for (let i = 0; i < 3; i++) { const u = ((a * 1.4 + i / 3) % 1); ondas += `<path d="M${(600 + u * 120).toFixed(1)} ${(160 - u * 60).toFixed(1)} q${(40 + u * 40).toFixed(1)} ${(120 + u * 60).toFixed(1)} 0 ${(240 + u * 120).toFixed(1)}" fill="none" stroke="${OY}" stroke-width="10" opacity="${(1 - u).toFixed(2)}"/>` }
    return ondas + pop(a, 400, 300, `<path d="M-160 -50 L120 -170 V170 L-160 50 Z" fill="${OR}"/><rect x="-220" y="-60" width="80" height="120" rx="20" fill="${OK}"/><rect x="-150" y="40" width="60" height="120" rx="16" fill="${OK}" transform="rotate(-10 -120 40)"/>`)
  },
  loja(a) {
    // a vitrine da loja com o toldo e a placa de oferta
    const pl = clamp(S(a - 0.5, 3, 0.55), 0, 1.15)
    return pop(a, 450, 300, `<rect x="-300" y="-160" width="600" height="380" fill="${OW}"/>${[...Array(6)].map((_, i) => `<path d="M${-300 + i * 100} -160 h100 v60 a50 50 0 0 1 -100 0z" fill="${i % 2 ? OR : OW}"/>`).join('')}<rect x="-260" y="-40" width="300" height="240" rx="10" fill="#9ad7ff"/><rect x="80" y="-20" width="180" height="240" rx="10" fill="#7c4a2d"/><g transform="translate(-110 60) scale(${pl.toFixed(3)}) rotate(-10)"><rect x="-110" y="-50" width="220" height="100" rx="12" fill="${OY}"/>${txt(0, 18, '−50%', 54, OR, 900)}</g>`)
  },
  'predio-governo'(a) {
    // o carimbo do imposto cai no carnê
    const c = clamp(S(a - 0.6, 3.5, 0.5), 0, 1.15)
    return pop(a, 450, 300, `<rect x="-200" y="-200" width="400" height="400" rx="12" fill="${OW}"/>${txt(0, -140, 'IMPOSTO', 38, OK, 900)}${[...Array(5)].map((_, i) => `<rect x="-160" y="${-90 + i * 50}" width="${320 - (i % 2) * 90}" height="14" rx="7" fill="#c9d1d9"/>`).join('')}<g transform="translate(70 90) rotate(-14) scale(${c.toFixed(3)})"><rect x="-120" y="-44" width="240" height="88" rx="10" fill="none" stroke="${OR}" stroke-width="8"/>${txt(0, 16, 'A PAGAR', 40, OR, 900)}</g>`)
  },
})
Object.assign(CENARIO, {
  festa() { let s = '<rect width="900" height="560" fill="#2a2350"/>'; for (let i = 0; i < 12; i++) s += `<path d="M${i * 80} 0 l40 70 l40 -70" fill="${['#FF4FA0', '#FDE047', '#22D3EE'][i % 3]}"/>`; return s + '<rect y="470" width="900" height="90" fill="#3b3163"/>' },
  hospital() { return '<rect width="900" height="560" fill="#e8f7f2"/><rect y="0" width="900" height="70" fill="#c6f0e0"/><rect y="470" width="900" height="90" fill="#b7e4d3"/>' },
  escola() { return '<rect width="900" height="560" fill="#2f6b4f"/><rect x="60" y="50" width="780" height="300" rx="10" fill="#1f4d38" stroke="#b5835a" stroke-width="16"/><rect y="470" width="900" height="90" fill="#b5835a"/>' },
  quarto() { return '<rect width="900" height="560" fill="#1c1640"/><circle cx="760" cy="110" r="46" fill="#f0f6fc"/><rect y="470" width="900" height="90" fill="#2a2350"/>' },
})
Object.assign(CENARIO_DE, {
  lanche: 'cozinha', pizza: 'cozinha', cafe: 'cozinha', churrasco: 'praia', bolo: 'festa', presente: 'festa', 'arvore-natal': 'festa', roupa: 'loja', remedio: 'hospital', dente: 'hospital', hospital: 'hospital',
  livro: 'escola', mochila: 'escola', lapis: 'escola', maleta: 'escritorio', computador: 'escritorio', telefone: 'casa', cama: 'quarto', chuva: 'rua', coracao: 'casa', cachorro: 'casa', garrafa: 'festa',
  ingresso: 'cidadeNoite', haltere: 'casa', sacola: 'loja', carta: 'casa', megafone: 'loja', loja: 'rua', 'predio-governo': 'escritorio',
})
