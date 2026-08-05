/**
 * SIMULADOR FINANCEIRO DETERMINÍSTICO (IMPLEMENTACAO20 §19).
 *
 * POR QUE EXISTE. Nos dois testes da passagem 1, o modelo escreveu números
 * DIFERENTES para o MESMO cálculo — R$ 2.725 / R$ 2.540 no primeiro, R$ 2.740 /
 * R$ 2.630 no segundo — e inventou uma "Selic de 13,5% ao ano". O vídeo estava a
 * dar informação financeira falsa com toda a confiança.
 * A REGRA 25 da IMPLEMENTACAO23 diz que nada neste repo valida factos. A saída não
 * é pedir à IA que acerte: é CALCULAR aqui e entregar o resultado pronto, para ela
 * apenas narrar.
 *
 * As taxas vêm de `src/data/statistics.json` (Banco Central, atualizado pelo
 * `update-statistics.js`) — nunca de um número escrito à mão.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const STATS_PATH = join(process.cwd(), 'src', 'data', 'statistics.json');
const DIVIDA_PATH = join(process.cwd(), 'src', 'data', 'divida.json');

export function lerIndicadores() {
  if (!existsSync(STATS_PATH)) return null;
  try {
    const s = JSON.parse(readFileSync(STATS_PATH, 'utf-8'));
    const num = (v) => { const n = Number(String(v).replace(',', '.')); return Number.isFinite(n) ? n : null; };
    return {
      selicAnual: num(s?.selic?.value),          // % a.a.
      poupancaMensal: num(s?.poupanca?.value),   // % a.m.
      atualizadoEm: s?.updatedAt || null,
      fonte: s?.selic?.source || 'Banco Central do Brasil',
    };
  } catch {
    return null;
  }
}

export const taxaMensalDeAnual = (anualPct) => Math.pow(1 + anualPct / 100, 1 / 12) - 1;

/**
 * Alíquota do IR regressivo da renda fixa, por prazo de CADA aporte.
 * Tabela oficial: até 180d 22,5% · 181-360d 20% · 361-720d 17,5% · acima 15%.
 */
export function aliquotaIR(dias) {
  if (dias <= 180) return 0.225;
  if (dias <= 360) return 0.20;
  if (dias <= 720) return 0.175;
  return 0.15;
}

/**
 * Aportes mensais em renda fixa tributada (ex.: Tesouro Selic).
 * Calcula APORTE A APORTE porque cada um fica investido um tempo diferente e,
 * portanto, paga uma alíquota diferente — somar tudo e aplicar uma alíquota só
 * daria um número errado, que é exatamente o tipo de erro que este ficheiro existe
 * para impedir. Aporte no início do mês; resgate no fim do último mês.
 */
export function simularAportesTributado({ aporteMensal, meses, taxaAnual }) {
  const i = taxaMensalDeAnual(taxaAnual);
  let bruto = 0;
  let ir = 0;
  for (let k = 1; k <= meses; k++) {
    const mesesRendendo = meses - k + 1;
    const montante = aporteMensal * Math.pow(1 + i, mesesRendendo);
    const rendimento = montante - aporteMensal;
    bruto += montante;
    ir += rendimento * aliquotaIR(mesesRendendo * 30);
  }
  const investido = aporteMensal * meses;
  return {
    investido: +investido.toFixed(2),
    bruto: +bruto.toFixed(2),
    ir: +ir.toFixed(2),
    liquido: +(bruto - ir).toFixed(2),
    rendimentoLiquido: +(bruto - ir - investido).toFixed(2),
    taxaMensalPct: +(i * 100).toFixed(4),
  };
}

/** Poupança: aportes mensais, taxa mensal fixa, ISENTA de IR. */
export function simularPoupanca({ aporteMensal, meses, taxaMensalPct }) {
  const i = taxaMensalPct / 100;
  let total = 0;
  for (let k = 1; k <= meses; k++) {
    total += aporteMensal * Math.pow(1 + i, meses - k + 1);
  }
  const investido = aporteMensal * meses;
  return {
    investido: +investido.toFixed(2),
    liquido: +total.toFixed(2),
    rendimentoLiquido: +(total - investido).toFixed(2),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// A FICHA DE DÍVIDA (04/08/2026) — a peça que faltava para o vídeo longo poder
// ENSINAR alguma coisa sobre dívida em vez de só falar de organização.
//
// ⚠️ TUDO O QUE ESTÁ AQUI É ACRESCENTADO. Nada acima foi tocado: o `montarFichaDeNumeros`
// que o Short corre todos os dias continua igual, linha por linha.
// ═══════════════════════════════════════════════════════════════════════════════

/** As taxas do cartão, colhidas por `scripts/update-divida.js`. Sem ficheiro, devolve null. */
export function lerJurosDeDivida() {
  if (!existsSync(DIVIDA_PATH)) return null;
  try {
    const d = JSON.parse(readFileSync(DIVIDA_PATH, 'utf-8'));
    if (!d?.rotativo?.aoMes) return null;
    return d;
  } catch {
    return null;
  }
}

/**
 * O QUE ACONTECE A QUEM PAGA SÓ O MÍNIMO DA FATURA — e o modelo segue a lei
 * brasileira, não a lenda.
 *
 * ⚠️ A LENDA, QUE SERIA MAIS DRAMÁTICA E SERIA FALSA: "o resto fica rolando no
 * rotativo mês após mês e dobra". **Isso deixou de ser verdade em 2017.** A Resolução
 * CMN 4.549 obriga o banco a tirar a pessoa do rotativo depois de UM mês e a oferecer
 * parcelamento. Um vídeo que ensinasse a bola de neve infinita estaria a assustar com
 * uma coisa que a lei já proíbe — e num canal de finanças isso custa a credibilidade
 * toda.
 *
 * O que este cálculo faz, e é o que de facto acontece:
 *   1. paga-se o mínimo da fatura (o piso legal são 15%);
 *   2. o que sobra fica UM mês no rotativo, à taxa do rotativo;
 *   3. daí em diante o banco parcela o saldo, à taxa do parcelado.
 * O resultado é quanto se paga, no fim, por uma fatura que não foi paga inteira.
 *
 * @param fatura  o valor da fatura
 * @param meses   em quantas vezes o banco parcela o saldo (padrão 12)
 */
export function simularPagamentoMinimo({ fatura, meses = 12, juros = null }) {
  const j = juros || lerJurosDeDivida();
  if (!j || !Number.isFinite(fatura) || fatura <= 0) return null;

  const taxaRotativo = j.rotativo.aoMes / 100;
  // Sem a taxa do parcelado, usa-se a do rotativo — é o pior caso, e assumi-lo é
  // mais honesto do que inventar um número melhor.
  const taxaParcelado = (j.parcelado?.aoMes ?? j.rotativo.aoMes) / 100;
  const percentagemMinima = j.minimoDaFatura ?? 0.15;

  const minimoPago = fatura * percentagemMinima;
  const sobra = fatura - minimoPago;
  const jurosDoRotativo = sobra * taxaRotativo;
  const saldoParaParcelar = sobra + jurosDoRotativo;

  // Prestação de um parcelamento com juros compostos (Price).
  const i = taxaParcelado;
  const parcela = i > 0
    ? (saldoParaParcelar * i) / (1 - (1 + i) ** -meses)
    : saldoParaParcelar / meses;
  const totalParcelado = parcela * meses;
  const totalPago = minimoPago + totalParcelado;

  const arredondar = (n) => Math.round(n);
  return {
    fatura: arredondar(fatura),
    minimoPago: arredondar(minimoPago),
    sobra: arredondar(sobra),
    jurosDoRotativo: arredondar(jurosDoRotativo),
    saldoParaParcelar: arredondar(saldoParaParcelar),
    meses,
    parcela: arredondar(parcela),
    totalPago: arredondar(totalPago),
    aMais: arredondar(totalPago - fatura),
    taxas: {
      rotativoAoMes: j.rotativo.aoMes,
      parceladoAoMes: j.parcelado?.aoMes ?? null,
      periodo: j.periodo,
      fonte: j.fonte,
      medida: j.medida,
    },
  };
}

/**
 * A FICHA que entra no prompt do vídeo de dívida. Devolve `null` quando não há taxas
 * colhidas — e nesse caso o gerador segue sem ficha, exatamente como fazia antes.
 *
 * ⚠️ `permitidos` é o que o roteiro pode DIZER. Repare no que está lá dentro e no que
 * NÃO está: as percentagens ficam de fora de propósito (o vídeo longo tem uma trava
 * que proíbe qualquer percentagem falada — o número que a pessoa entende é o REAL,
 * não a taxa). O que entra são os valores em dinheiro, mais os arredondamentos
 * naturais da fala ("quase quatrocentos").
 */
export function montarFichaDeDivida(fatura, { meses = 12 } = {}) {
  const s = simularPagamentoMinimo({ fatura, meses });
  if (!s) return null;

  const permitidos = new Set();
  for (const n of [s.fatura, s.minimoPago, s.sobra, s.jurosDoRotativo, s.saldoParaParcelar, s.parcela, s.totalPago, s.aMais]) {
    const v = Math.round(Number(n));
    if (!Number.isFinite(v) || v < 10) continue;
    permitidos.add(v);
    permitidos.add(Math.round(v / 10) * 10);
    permitidos.add(Math.round(v / 100) * 100);
    if (v >= 1000) permitidos.add(Math.round(v / 1000) * 1000);
  }

  const brl = (n) => n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const texto = [
    `Fatura do cartão: R$ ${brl(s.fatura)}`,
    `Pagando só o mínimo (${Math.round((s.minimoPago / s.fatura) * 100)}% da fatura, que é o piso da lei): paga R$ ${brl(s.minimoPago)} e ficam R$ ${brl(s.sobra)} por pagar`,
    `Esses R$ ${brl(s.sobra)} ficam um mês no rotativo e viram R$ ${brl(s.saldoParaParcelar)} — são R$ ${brl(s.jurosDoRotativo)} de juros num mês só`,
    `Depois o banco é obrigado a parcelar: ${s.meses} vezes de R$ ${brl(s.parcela)}`,
    `Total pago no fim: R$ ${brl(s.totalPago)} — ou seja, R$ ${brl(s.aMais)} a mais do que a fatura`,
    `(taxas do Banco Central, ${s.taxas.periodo}: rotativo ${String(s.taxas.rotativoAoMes).replace('.', ',')}% ao mês${s.taxas.parceladoAoMes ? `, parcelado ${String(s.taxas.parceladoAoMes).replace('.', ',')}% ao mês` : ''} — ${s.taxas.medida})`,
  ].join('\n');

  return { ...s, permitidos: [...permitidos].filter((n) => n >= 10), texto };
}

/**
 * Lê o cenário do próprio tema/ângulo. NÃO adivinha: se não encontrar aporte E
 * prazo explícitos, devolve null e o gerador segue sem ficha (e o prompt proíbe
 * inventar números). Melhor não ter ficha do que ter uma ficha errada.
 */
export function extrairCenario(texto) {
  const t = String(texto || '');
  // "R$ 100/mês", "R$ 100 por mês", "100 reais todo mês"
  const mAporte = t.match(/R\$\s*([\d.]+)(?:,\d+)?\s*(?:\/|por\s+|todo\s+)?m[êe]s/i)
    || t.match(/([\d.]+)\s*reais?\s*(?:\/|por\s+|todo\s+)?m[êe]s/i);
  if (!mAporte) return null;
  const aporteMensal = Number(String(mAporte[1]).replace(/\./g, ''));
  if (!Number.isFinite(aporteMensal) || aporteMensal <= 0) return null;

  let meses = null;
  const mAnos = t.match(/(\d+)\s*anos?/i);
  const mMeses = t.match(/(\d+)\s*meses/i);
  if (mMeses) meses = Number(mMeses[1]);
  else if (mAnos) meses = Number(mAnos[1]) * 12;
  if (!Number.isFinite(meses) || meses <= 0 || meses > 600) return null;

  return { aporteMensal, meses };
}

const brl = (n) => n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

/**
 * A FICHA que entra no prompt. Devolve `null` quando não há cenário — e nesse caso
 * o gerador NÃO inventa ficha nenhuma.
 */
export function montarFichaDeNumeros(temaTexto) {
  const cen = extrairCenario(temaTexto);
  if (!cen) return null;
  const ind = lerIndicadores();
  if (!ind || !ind.selicAnual || !ind.poupancaMensal) return null;

  const tesouro = simularAportesTributado({ aporteMensal: cen.aporteMensal, meses: cen.meses, taxaAnual: ind.selicAnual });
  const poup = simularPoupanca({ aporteMensal: cen.aporteMensal, meses: cen.meses, taxaMensalPct: ind.poupancaMensal });
  const diferenca = +(tesouro.liquido - poup.liquido).toFixed(2);
  const data = ind.atualizadoEm ? new Date(ind.atualizadoEm).toLocaleDateString('pt-BR') : 's/ data';

  const pct = (n) => String(n).replace('.', ',');
  const linhas = [
    `Aporte: R$ ${brl(cen.aporteMensal)} por mês, durante ${cen.meses} meses`,
    `Total investido: R$ ${brl(tesouro.investido)}`,
    `Tesouro Selic (${pct(ind.selicAnual)}% ao ano, ${ind.fonte}, ${data}), JÁ com o imposto de renda descontado: R$ ${brl(tesouro.liquido)}`,
    `Poupança (${pct(ind.poupancaMensal)}% ao mês, isenta de imposto): R$ ${brl(poup.liquido)}`,
    `Diferença a favor do Tesouro: R$ ${brl(diferenca)}`,
  ];

  // Números que a fala pode citar. SÓ valores monetários e o prazo — as TAXAS
  // ficam de fora de propósito: arredondadas viram "14" e "1", e "1" liberaria
  // qualquer número de uma casa. Quem quiser citar a taxa usa o texto da ficha.
  const permitidos = new Set();
  for (const n of [cen.aporteMensal, cen.meses, tesouro.investido, tesouro.liquido, poup.liquido, diferenca]) {
    const v = Math.round(Number(n));
    permitidos.add(v);
    permitidos.add(Math.round(v / 10) * 10);   // arredondamento natural na fala
    permitidos.add(Math.round(v / 100) * 100);
    // ♦ 03/08/2026: a fala natural do padrão novo arredonda ao milhar ("quase
    // dezoito mil" para 17.800) — sem isto, a frase certa reprovava na trava.
    if (v >= 1000) permitidos.add(Math.round(v / 1000) * 1000);
  }
  // ♦ E o prazo dito em ANOS ("dez anos" para 120 meses) — a trava lê o número 10.
  if (cen.meses % 12 === 0) permitidos.add(cen.meses / 12);

  return {
    cenario: cen,
    tesouro,
    poupanca: poup,
    diferenca,
    indicadores: ind,
    permitidos: [...permitidos].filter((n) => n >= 10), // 1 e 2 não dizem nada
    texto: linhas.join('\n'),
  };
}
