/**
 * ui.js — as peças de comportamento das calculadoras.
 *
 * PORQUÊ (14/09/2026): cada calculadora trazia a sua própria formatação de
 * dinheiro e o seu próprio gráfico desenhado à mão — sete cópias que já tinham
 * começado a divergir (uma arredondava, outra não; uma punha centavos, outra
 * não). Pior: todos os gráficos desenhavam num quadro fixo de 600×300 que o CSS
 * depois esticava, e por isso saíam BORRADOS em ecrã de alta densidade.
 *
 * Aqui há uma versão de cada coisa, e o gráfico desenha no tamanho real do ecrã
 * (devicePixelRatio), com leitura ao passar o rato ou o dedo.
 *
 * Browser puro, sem dependências: o blog é estático e a cota de rede de quem
 * embute não é nossa para gastar.
 */

export const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
export const brlCent = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const inteiro = new Intl.NumberFormat('pt-BR');

export const calmo = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const $ = (id) => document.getElementById(id);

/** Lê uma cor dos tokens do site (serve escuro e claro sem duplicar código). */
export function token(nome, alternativa) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(nome).trim();
  return v || alternativa;
}

/** "63 meses" → "5 anos e 3 meses". */
export function tempoEmPalavras(meses) {
  const m = Math.max(0, Math.round(meses));
  const anos = Math.floor(m / 12), resto = m % 12;
  if (anos === 0) return m + (m === 1 ? ' mês' : ' meses');
  let txt = anos + (anos === 1 ? ' ano' : ' anos');
  if (resto) txt += ' e ' + resto + (resto === 1 ? ' mês' : ' meses');
  return txt;
}

/** Pinta a parte já percorrida da barra de arrastar. */
export function pintaRange(slider) {
  const min = Number(slider.min), max = Number(slider.max), v = Number(slider.value);
  const pct = max > min ? ((v - min) / (max - min)) * 100 : 0;
  slider.style.setProperty('--fill', pct + '%');
}

/**
 * Liga um campo de dinheiro à sua barra. Digitar `1000` mostra `1.000`.
 * Devolve uma função para ler o valor.
 */
export function campoDinheiro(campoId, sliderId, inicial, aoMudar) {
  const campo = $(campoId), slider = $(sliderId);
  let valor = inicial;
  campo.value = inteiro.format(valor);
  if (slider) { slider.value = Math.min(valor, Number(slider.max)); pintaRange(slider); }

  campo.addEventListener('input', () => {
    const digitos = campo.value.replace(/\D/g, '');
    valor = digitos ? parseInt(digitos, 10) : 0;
    campo.value = inteiro.format(valor);
    if (slider) { slider.value = Math.min(valor, Number(slider.max)); pintaRange(slider); }
    aoMudar();
  });
  if (slider) {
    slider.addEventListener('input', () => {
      valor = Number(slider.value);
      campo.value = inteiro.format(valor);
      pintaRange(slider);
      aoMudar();
    });
  }
  return () => valor;
}

/** Campo com vírgula decimal (taxas). */
export function campoDecimal(campoId, sliderId, inicial, aoMudar, maximo = 100) {
  const campo = $(campoId), slider = $(sliderId);
  let valor = inicial;
  campo.value = valor.toFixed(2).replace('.', ',');
  if (slider) { slider.value = Math.min(valor, Number(slider.max)); pintaRange(slider); }

  campo.addEventListener('input', () => {
    let v = parseFloat(campo.value.replace(/[^\d,.]/g, '').replace(',', '.'));
    if (isNaN(v)) v = 0;
    if (v > maximo) v = maximo;
    valor = v;
    if (slider) { slider.value = Math.min(v, Number(slider.max)); pintaRange(slider); }
    aoMudar();
  });
  campo.addEventListener('blur', () => { campo.value = valor.toFixed(2).replace('.', ','); });
  if (slider) {
    slider.addEventListener('input', () => {
      valor = Number(slider.value);
      campo.value = valor.toFixed(2).replace('.', ',');
      pintaRange(slider);
      aoMudar();
    });
  }
  return () => valor;
}

/** Campo de número inteiro (prazos). */
export function campoInteiro(campoId, sliderId, inicial, aoMudar, maximo = 600) {
  const campo = $(campoId), slider = $(sliderId);
  let valor = inicial;
  campo.value = String(valor);
  if (slider) { slider.value = Math.min(valor, Number(slider.max)); pintaRange(slider); }

  campo.addEventListener('input', () => {
    const d = campo.value.replace(/\D/g, '');
    let v = d ? parseInt(d, 10) : 1;
    if (v > maximo) v = maximo;
    valor = v;
    campo.value = String(v);
    if (slider) { slider.value = Math.min(v, Number(slider.max)); pintaRange(slider); }
    aoMudar();
  });
  if (slider) {
    slider.addEventListener('input', () => {
      valor = Number(slider.value);
      campo.value = String(valor);
      pintaRange(slider);
      aoMudar();
    });
  }
  return () => valor;
}

/**
 * O número que corre até ao valor novo.
 * Um momento só, 380ms; quem tem animações desligadas vê o valor final logo.
 */
export function contador(elemento, formatar) {
  let atual = 0, id = null;
  return function para(alvo) {
    if (calmo()) { atual = alvo; elemento.textContent = formatar(alvo); return; }
    if (id) cancelAnimationFrame(id);
    const de = atual;
    let t0 = null;
    const passo = (ts) => {
      if (!t0) t0 = ts;
      const p = Math.min(1, (ts - t0) / 380);
      const e = 1 - Math.pow(1 - p, 3);
      atual = de + (alvo - de) * e;
      elemento.textContent = formatar(atual);
      if (p < 1) id = requestAnimationFrame(passo);
      else { atual = alvo; elemento.textContent = formatar(alvo); id = null; }
    };
    id = requestAnimationFrame(passo);
  };
}

/**
 * Gráfico de linhas nítido, com leitura no ponto.
 *
 * desenhar({ series, marca, formatar, minEixo }):
 *   series: [{ dados:[], cor:'#3fb950', tracejada?:bool, larguraLinha?:num }]
 *   areaEntre: [i, j] — preenche entre as séries i e j (é ali que mora o assunto)
 *   marca: { i, texto } — a marca vertical (ponto de virada, meta…)
 *   formatar: v => texto, usado na leitura
 */
export function criarGrafico(canvas) {
  const ctx = canvas.getContext('2d');
  let cfg = { series: [], areaEntre: null, marca: null, formatar: (v) => String(v) };
  let hover = null, fracao = 1, idAnim = null;

  function desenhar() {
    const dpr = window.devicePixelRatio || 1;
    const larg = canvas.clientWidth, alt = canvas.clientHeight;
    if (!larg || !alt || !cfg.series.length) return;

    canvas.width = Math.round(larg * dpr);
    canvas.height = Math.round(alt * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, larg, alt);

    const pE = 6, pD = 6, pT = 12, pB = 22;
    const W = larg - pE - pD, H = alt - pT - pB;
    const n = cfg.series[0].dados.length - 1;
    if (n < 1) return;

    let max = 0;
    cfg.series.forEach(s => s.dados.forEach(v => { if (v > max) max = v; }));
    if (cfg.minEixo && cfg.minEixo > max) max = cfg.minEixo;
    if (!max) max = 1;

    const X = (i) => pE + (i / n) * W;
    const Y = (v) => pT + H - (v / max) * H;
    const ate = Math.max(1, Math.round(n * fracao));

    const hair = token('--border-muted', '#21262d');
    const faint = token('--text-tertiary', '#6e7681');
    const ink = token('--text-primary', '#f0f6fc');
    const marcaCor = token('--fm-marca', '#e3b341');

    ctx.strokeStyle = hair; ctx.lineWidth = 1;
    for (let g = 0; g <= 3; g++) {
      const gy = Math.round(pT + (H * g) / 3) + .5;
      ctx.beginPath(); ctx.moveTo(pE, gy); ctx.lineTo(pE + W, gy); ctx.stroke();
    }

    if (cfg.areaEntre) {
      const [a, b] = cfg.areaEntre;
      const A = cfg.series[a].dados, B = cfg.series[b].dados;
      ctx.beginPath();
      ctx.moveTo(X(0), Y(A[0]));
      for (let i = 1; i <= ate; i++) ctx.lineTo(X(i), Y(A[i]));
      for (let j = ate; j >= 0; j--) ctx.lineTo(X(j), Y(B[j]));
      ctx.closePath();
      ctx.fillStyle = cfg.corArea || 'rgba(63,185,80,.13)';
      ctx.fill();
    }

    cfg.series.forEach((s) => {
      ctx.beginPath();
      if (s.tracejada) ctx.setLineDash([3, 4]);
      ctx.strokeStyle = s.cor;
      ctx.lineWidth = s.larguraLinha || (s.tracejada ? 1.4 : 2.3);
      ctx.lineJoin = 'round';
      for (let i = 0; i <= ate; i++) {
        const x = X(i), y = Y(s.dados[i]);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    });

    const principal = cfg.series[0];
    ctx.beginPath(); ctx.arc(X(ate), Y(principal.dados[ate]), 3.8, 0, Math.PI * 2);
    ctx.fillStyle = principal.cor; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = token('--bg-secondary', '#161b22'); ctx.stroke();

    if (cfg.marca && cfg.marca.i <= ate) {
      const vx = X(cfg.marca.i);
      ctx.save();
      ctx.setLineDash([2, 3]); ctx.strokeStyle = marcaCor; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(vx + .5, pT); ctx.lineTo(vx + .5, pT + H); ctx.stroke();
      ctx.restore();
      ctx.beginPath(); ctx.arc(vx, Y(principal.dados[cfg.marca.i]), 4.5, 0, Math.PI * 2);
      ctx.fillStyle = marcaCor; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = token('--bg-secondary', '#161b22'); ctx.stroke();
      if (cfg.marca.texto) {
        ctx.fillStyle = marcaCor;
        ctx.font = '600 9.5px ui-sans-serif, system-ui, sans-serif';
        ctx.textAlign = vx > pE + W * .72 ? 'right' : 'left';
        ctx.fillText(cfg.marca.texto, vx + (ctx.textAlign === 'right' ? -7 : 7), pT + 9);
      }
    }

    if (cfg.eixoMeses !== false) {
      ctx.fillStyle = faint; ctx.font = '10px ui-monospace, monospace'; ctx.textAlign = 'center';
      const anos = Math.floor(n / 12);
      const passo = anos <= 6 ? 1 : Math.ceil(anos / 6);
      for (let a = passo; a <= anos; a += passo) ctx.fillText(a + 'a', X(a * 12), alt - 7);
    }

    if (hover !== null && hover <= ate) {
      const hx = X(hover), hy = Y(principal.dados[hover]);
      ctx.strokeStyle = hair; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(hx + .5, pT); ctx.lineTo(hx + .5, pT + H); ctx.stroke();
      ctx.beginPath(); ctx.arc(hx, hy, 4.5, 0, Math.PI * 2); ctx.fillStyle = ink; ctx.fill();

      const t1 = cfg.formatar(principal.dados[hover]);
      const t2 = (cfg.rotuloPonto || ((i) => 'mês ' + i))(hover);
      ctx.font = '600 11px ui-monospace, monospace';
      const w = Math.max(ctx.measureText(t1).width, ctx.measureText(t2).width) + 18;
      const bx = Math.min(Math.max(hx - w / 2, pE), pE + W - w);
      const by = Math.max(hy - 46, pT);
      ctx.fillStyle = token('--bg-tertiary', '#1c2128');
      ctx.strokeStyle = token('--border-default', '#30363d');
      if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(bx, by, w, 36, 8); ctx.fill(); ctx.stroke(); }
      else { ctx.fillRect(bx, by, w, 36); ctx.strokeRect(bx, by, w, 36); }
      ctx.textAlign = 'center';
      ctx.fillStyle = ink; ctx.fillText(t1, bx + w / 2, by + 16);
      ctx.fillStyle = faint; ctx.font = '10px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText(t2, bx + w / 2, by + 28);
    }
  }

  function pontoDoEvento(ev) {
    const r = canvas.getBoundingClientRect();
    const cx = (ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left;
    const n = cfg.series.length ? cfg.series[0].dados.length - 1 : 1;
    const W = r.width - 12;
    return Math.max(0, Math.min(n, Math.round(((cx - 6) / W) * n)));
  }

  canvas.addEventListener('mousemove', (e) => { hover = pontoDoEvento(e); desenhar(); });
  canvas.addEventListener('mouseleave', () => { hover = null; desenhar(); });
  canvas.addEventListener('touchstart', (e) => { hover = pontoDoEvento(e); desenhar(); }, { passive: true });
  canvas.addEventListener('touchmove', (e) => { hover = pontoDoEvento(e); desenhar(); }, { passive: true });
  canvas.addEventListener('touchend', () => { hover = null; desenhar(); });
  window.addEventListener('resize', desenhar);

  return {
    atualizar(nova, animar = true) {
      cfg = Object.assign(cfg, nova);
      if (!animar || calmo()) { fracao = 1; desenhar(); return; }
      if (idAnim) cancelAnimationFrame(idAnim);
      fracao = 0;
      let t0 = null;
      const passo = (ts) => {
        if (!t0) t0 = ts;
        const p = Math.min(1, (ts - t0) / 420);
        fracao = 1 - Math.pow(1 - p, 3);
        desenhar();
        if (p < 1) idAnim = requestAnimationFrame(passo);
        else { fracao = 1; desenhar(); idAnim = null; }
      };
      idAnim = requestAnimationFrame(passo);
    },
    redesenhar: desenhar,
  };
}
