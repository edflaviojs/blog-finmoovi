// O CENÁRIO NO FUNDO INTEIRO (item 3 do pedido do Ed, 16/10/2026) — uma silhueta do lugar POR CIMA da cor viva.
// Não troca a cor da secção (essa é a identidade aprovada): desenha o lugar num tom escuro e transparente,
// com duas camadas que andam a velocidades diferentes (o de trás mais devagar) — é isso que dá profundidade.
// FUNDOS[nome](t) → SVG de 1080×1920. t = segundos do vídeo (o movimento dá uma volta por loop, sem costura).
const FS1 = 'rgba(13,17,23,0.10)', FS2 = 'rgba(13,17,23,0.16)', FL = 'rgba(255,255,255,0.14)'
// deslocamento cíclico: no fim do loop volta ao mesmo sítio
const deriva = (t, D, px) => Math.sin((t / D) * Math.PI * 2) * px
const FUNDOS = {
  cidade(t, D) {
    const a = deriva(t, D, 40), b = deriva(t, D, 90)
    const longe = [[0, 980, 150], [130, 900, 120], [240, 1020, 160], [390, 860, 130], [510, 960, 150], [650, 880, 140], [780, 1000, 120], [890, 920, 190]]
    const perto = [[-40, 1380, 220], [200, 1300, 180], [400, 1420, 240], [660, 1340, 200], [880, 1400, 240]]
    return `<g transform="translate(${a.toFixed(1)} 0)" fill="${FS1}">${longe.map(([x, y, w]) => `<rect x="${x}" y="${y}" width="${w}" height="${1920 - y}"/>`).join('')}</g>
      <g transform="translate(${b.toFixed(1)} 0)" fill="${FS2}">${perto.map(([x, y, w]) => `<rect x="${x}" y="${y}" width="${w}" height="${1920 - y}" rx="8"/>${[...Array(5)].map((_, r) => `<rect x="${x + 30}" y="${y + 40 + r * 80}" width="${w - 60}" height="22" rx="6" fill="${FL}"/>`).join('')}`).join('')}</g>`
  },
  casa(t, D) {
    const a = deriva(t, D, 30)
    return `<g transform="translate(${a.toFixed(1)} 0)"><rect x="660" y="260" width="300" height="360" rx="20" fill="${FS1}"/><line x1="810" y1="260" x2="810" y2="620" stroke="${FL}" stroke-width="12"/><line x1="660" y1="440" x2="960" y2="440" stroke="${FL}" stroke-width="12"/>
      <rect x="90" y="300" width="220" height="160" rx="12" fill="${FS1}"/><path d="M200 120 V230" stroke="${FS2}" stroke-width="8"/><path d="M140 230 h120 l-30 60 h-60z" fill="${FS2}"/></g>
      <rect x="0" y="1560" width="1080" height="360" fill="${FS1}"/><rect x="${(-80 + deriva(t, D, 60)).toFixed(1)}" y="1420" width="520" height="160" rx="40" fill="${FS2}"/>`
  },
  mercado(t, D) {
    const a = deriva(t, D, 50)
    let s = ''
    for (let p = 0; p < 4; p++) { const y = 1200 + p * 170; s += `<rect x="-60" y="${y}" width="1200" height="18" fill="${FS2}"/>`; for (let i = 0; i < 12; i++) s += `<rect x="${i * 100 + (p % 2) * 40}" y="${y - 90 + (i % 3) * 12}" width="70" height="${90 - (i % 3) * 12}" rx="10" fill="${FS1}"/>` }
    return `<g transform="translate(${a.toFixed(1)} 0)">${s}</g>`
  },
  praia(t, D) {
    let ondas = ''
    for (let k = 0; k < 3; k++) { let d = ''; for (let x = -40; x <= 1120; x += 40) d += `${x === -40 ? 'M' : 'L'}${x} ${(1400 + k * 90 + 18 * Math.sin(x / 70 + (t / D) * Math.PI * 4 + k)).toFixed(1)} `; ondas += `<path d="${d} V1920 H-40Z" fill="${k === 2 ? FS2 : FS1}"/>` }
    return `<circle cx="${(860 + deriva(t, D, 30)).toFixed(1)}" cy="300" r="120" fill="${FL}"/>${ondas}`
  },
  ceu(t, D) {
    let s = ''
    for (let i = 0; i < 5; i++) { const x = ((i * 260 + (t / D) * 1080) % 1400) - 200, y = 300 + (i % 3) * 420; s += `<g transform="translate(${x.toFixed(1)} ${y})" fill="${FL}"><circle r="70"/><circle cx="70" cy="18" r="56"/><circle cx="-70" cy="18" r="50"/><rect x="-120" y="18" width="240" height="56" rx="28"/></g>` }
    return s
  },
  escola(t, D) {
    return `<rect x="${(80 + deriva(t, D, 30)).toFixed(1)}" y="1340" width="920" height="420" rx="20" fill="${FS2}"/><path d="M200 1500 l120 -60 l120 60 M560 1480 h260 M560 1560 h200" stroke="${FL}" stroke-width="14" fill="none" stroke-linecap="round"/>`
  },
  hospital(t, D) {
    const a = deriva(t, D, 40)
    return `<g transform="translate(${a.toFixed(1)} 0)"><rect x="740" y="1240" width="300" height="680" fill="${FS1}"/><g fill="${FL}"><rect x="866" y="1300" width="48" height="140" rx="10"/><rect x="820" y="1346" width="140" height="48" rx="10"/></g></g>`
  },
  banco(t, D) {
    const a = deriva(t, D, 40)
    return `<g transform="translate(${a.toFixed(1)} 0)" fill="${FS1}"><path d="M60 1300 L540 1120 L1020 1300Z"/>${[...Array(6)].map((_, i) => `<rect x="${120 + i * 150}" y="1320" width="60" height="420"/>`).join('')}<rect x="40" y="1740" width="1000" height="60" rx="10"/></g>`
  },
  escritorio(t, D) {
    const a = deriva(t, D, 40)
    return `<g transform="translate(${a.toFixed(1)} 0)"><rect x="-40" y="1560" width="1160" height="40" fill="${FS2}"/>${[120, 560].map((x) => `<rect x="${x}" y="1360" width="300" height="190" rx="14" fill="${FS1}"/><rect x="${x + 110}" y="1550" width="80" height="20" fill="${FS1}"/>`).join('')}</g>`
  },
  festa(t, D) {
    let s = ''
    for (let i = 0; i < 14; i++) s += `<path d="M${i * 80 - 20} 0 l40 ${(80 + 10 * Math.sin(t * 2 + i)).toFixed(1)} l40 ${(-80 - 10 * Math.sin(t * 2 + i)).toFixed(1)}" fill="${i % 2 ? FL : FS1}"/>`
    return s + [...Array(10)].map((_, i) => `<circle cx="${(i * 110 + 50 + deriva(t, D, 20)).toFixed(1)}" cy="${(1500 + (i % 3) * 120 + 20 * Math.sin(t * 1.5 + i)).toFixed(1)}" r="${16 + (i % 3) * 6}" fill="${FL}"/>`).join('')
  },
}
// que fundo combina com cada cenário da janela
const FUNDO_DO_CENARIO = { rua: 'cidade', loja: 'mercado', casa: 'casa', cozinha: 'casa', banheiro: 'casa', quarto: 'casa', ceu: 'ceu', praia: 'praia', banco: 'banco', escritorio: 'escritorio', escola: 'escola', hospital: 'hospital', festa: 'festa', cidadeNoite: 'cidade' }
