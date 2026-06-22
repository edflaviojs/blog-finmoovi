/**
 * update-statistics.js
 * Busca indicadores financeiros de APIs públicas e salva em src/data/statistics.json
 * Uso: node --import tsx scripts/update-statistics.js
 */

import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = resolve(__dirname, '../src/data/statistics.json');

async function fetchJSON(url, label) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error(`[FALHA] ${label}: ${err.message}`);
    return null;
  }
}

async function getSelic() {
  const data = await fetchJSON(
    'https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json',
    'Selic'
  );
  if (data && data[0]) {
    console.log(`[OK] Selic: ${data[0].valor}% a.a.`);
    return data[0].valor;
  }
  return 'N/D';
}

async function getIPCA() {
  const data = await fetchJSON(
    'https://api.bcb.gov.br/dados/serie/bcdata.sgs.13522/dados/ultimos/1?formato=json',
    'IPCA 12 meses'
  );
  if (data && data[0]) {
    console.log(`[OK] IPCA 12 meses: ${data[0].valor}%`);
    return data[0].valor;
  }
  return 'N/D';
}

async function getCDI() {
  const data = await fetchJSON(
    'https://api.bcb.gov.br/dados/serie/bcdata.sgs.4391/dados/ultimos/1?formato=json',
    'CDI'
  );
  if (data && data[0]) {
    console.log(`[OK] CDI: ${data[0].valor}% a.a.`);
    return data[0].valor;
  }
  return 'N/D';
}

async function getUsdBrl() {
  // Tenta até 5 dias para trás para encontrar um dia útil com cotação
  for (let daysBack = 1; daysBack <= 5; daysBack++) {
    const date = new Date();
    date.setDate(date.getDate() - daysBack);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const yyyy = date.getFullYear();
    const dateStr = `'${mm}-${dd}-${yyyy}'`;

    const url = `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarDia(dataCotacao=@dataCotacao)?@dataCotacao=${dateStr}&$format=json`;
    const data = await fetchJSON(url, `USD/BRL (D-${daysBack})`);

    if (data && data.value && data.value.length > 0) {
      const cotacao = data.value[data.value.length - 1].cotacaoVenda;
      const formatted = cotacao.toFixed(4);
      console.log(`[OK] USD/BRL: R$ ${formatted} (D-${daysBack})`);
      return formatted;
    }
  }

  return 'N/D';
}

async function getEurBrl() {
  const data = await fetchJSON(
    'https://open.er-api.com/v6/latest/EUR',
    'EUR/BRL'
  );
  if (data && data.rates && data.rates.BRL) {
    const formatted = data.rates.BRL.toFixed(4);
    console.log(`[OK] EUR/BRL: R$ ${formatted}`);
    return formatted;
  }
  return 'N/D';
}

async function getPoupanca() {
  const data = await fetchJSON(
    'https://api.bcb.gov.br/dados/serie/bcdata.sgs.25/dados/ultimos/1?formato=json',
    'Poupança'
  );
  if (data && data[0]) {
    console.log(`[OK] Poupança: ${data[0].valor}% a.m.`);
    return data[0].valor;
  }
  return 'N/D';
}

async function getDesemprego() {
  const data = await fetchJSON(
    'https://servicodados.ibge.gov.br/api/v3/agregados/6381/periodos/-1/variaveis/4099?localidades=N1[all]',
    'Desemprego'
  );
  try {
    const resultado = data[0].resultados[0].series[0].serie;
    const periodos = Object.keys(resultado);
    const ultimoPeriodo = periodos[periodos.length - 1];
    const valor = resultado[ultimoPeriodo];
    console.log(`[OK] Desemprego: ${valor}%`);
    return valor;
  } catch {
    console.error('[FALHA] Desemprego: formato inesperado');
    return 'N/D';
  }
}

async function main() {
  console.log('=== Atualizando indicadores financeiros ===\n');

  const [selic, ipca, cdi, usdBrl, eurBrl, poupanca, desemprego] = await Promise.all([
    getSelic(),
    getIPCA(),
    getCDI(),
    getUsdBrl(),
    getEurBrl(),
    getPoupanca(),
    getDesemprego(),
  ]);

  const statistics = {
    updatedAt: new Date().toISOString(),
    selic: {
      value: selic,
      unit: '% a.a.',
      source: 'Banco Central do Brasil',
      url: 'https://www.bcb.gov.br',
    },
    ipca: {
      value: ipca,
      unit: '% (12 meses)',
      source: 'IBGE/BCB',
      url: 'https://www.ibge.gov.br',
    },
    cdi: {
      value: cdi,
      unit: '% a.a.',
      source: 'Banco Central do Brasil',
      url: 'https://www.bcb.gov.br',
    },
    usdBrl: {
      value: usdBrl,
      unit: 'BRL',
      source: 'Banco Central do Brasil (PTAX)',
      url: 'https://www.bcb.gov.br',
    },
    eurBrl: {
      value: eurBrl,
      unit: 'BRL',
      source: 'ExchangeRate API',
      url: 'https://www.exchangerate-api.com',
    },
    poupanca: {
      value: poupanca,
      unit: '% a.m.',
      source: 'Banco Central do Brasil',
      url: 'https://www.bcb.gov.br',
    },
    desemprego: {
      value: desemprego,
      unit: '%',
      source: 'IBGE (PNAD Contínua)',
      url: 'https://www.ibge.gov.br',
    },
  };

  writeFileSync(OUTPUT_PATH, JSON.stringify(statistics, null, 2) + '\n', 'utf-8');

  const successCount = Object.values(statistics)
    .filter((v) => typeof v === 'object' && v.value && v.value !== 'N/D')
    .length;
  const totalIndicators = 7;

  console.log(`\n=== Resultado: ${successCount}/${totalIndicators} indicadores atualizados ===`);
  console.log(`Arquivo salvo em: ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
