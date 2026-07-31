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
  }

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
