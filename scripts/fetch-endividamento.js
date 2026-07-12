/**
 * fetch-endividamento.js — coleta dados REAIS do Banco Central (API SGS) para o
 * "Índice FinMoovi de Endividamento" (/estudos/endividamento-das-familias).
 *
 * Séries (fonte oficial, Banco Central do Brasil):
 *   29037 — Endividamento das famílias com o SFN em relação à renda acumulada
 *           dos últimos 12 meses (%).
 *   29034 — Comprometimento de renda das famílias com o serviço da dívida com o
 *           SFN (%, com ajuste sazonal).
 *
 * Salva src/data/endividamento.json. Em caso de falha de rede, NÃO sobrescreve
 * (mantém o último dado válido) e sai com 0 — a página nunca fica sem dados.
 *
 * Uso: node scripts/fetch-endividamento.js
 */

import { writeFileSync } from 'fs';
import { join } from 'path';

const OUT = join(process.cwd(), 'src', 'data', 'endividamento.json');
const DATA_INICIAL = '01/01/2011'; // ~15 anos de histórico mensal

async function fetchSerie(code) {
  // A API do BCB rejeita `ultimos/N` com N grande (HTTP 400) para estas séries;
  // a consulta por intervalo de data é estável.
  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${code}/dados?formato=json&dataInicial=${DATA_INICIAL}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} na série ${code}`);
  const data = await res.json();
  // BCB retorna [{data:"dd/mm/yyyy", valor:"49.83"}], ordem cronológica ascendente.
  return data.map(d => {
    const [dd, mm, yyyy] = d.data.split('/');
    return { date: `${yyyy}-${mm}-${dd}`, value: parseFloat(d.valor) };
  }).filter(p => Number.isFinite(p.value));
}

async function main() {
  console.log('📊 Coletando dados de endividamento do Banco Central...');
  try {
    const endiv = await fetchSerie(29037);
    const compr = await fetchSerie(29034);

    if (!endiv.length || !compr.length) throw new Error('série vazia');

    const payload = {
      updatedAt: new Date().toISOString(),
      endividamento: {
        label: 'Endividamento das famílias em relação à renda anual',
        unit: '%',
        seriesCode: 29037,
        latest: endiv[endiv.length - 1],
        min: endiv.reduce((a, b) => (b.value < a.value ? b : a)),
        max: endiv.reduce((a, b) => (b.value > a.value ? b : a)),
        series: endiv,
      },
      comprometimento: {
        label: 'Comprometimento de renda com o serviço da dívida',
        unit: '%',
        seriesCode: 29034,
        latest: compr[compr.length - 1],
        series: compr,
      },
      source: {
        name: 'Banco Central do Brasil — Sistema Gerenciador de Séries Temporais (SGS)',
        url: 'https://www.bcb.gov.br',
        api: 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.29037/dados',
      },
    };

    writeFileSync(OUT, JSON.stringify(payload, null, 2));
    console.log(`✅ Salvo: ${OUT}`);
    console.log(`   Endividamento: ${payload.endividamento.latest.value}% (${payload.endividamento.latest.date})`);
    console.log(`   Comprometimento: ${payload.comprometimento.latest.value}% (${payload.comprometimento.latest.date})`);
    // Sem process.exit() para evitar crash do libuv no Windows com sockets keepalive.
    process.exitCode = 0;
  } catch (err) {
    console.log(`⚠️ Falha ao coletar (${err.message}). Mantendo o último JSON válido.`);
    process.exitCode = 0;
  }
}

main();
