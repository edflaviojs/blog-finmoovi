const EXCHANGE_API_KEY = process.env.EXCHANGE_API_KEY;
const BASE_URL = 'https://v6.exchangerate-api.com/v6';

/**
 * Get current exchange rates for BRL
 */
export async function getExchangeRates(baseCurrency = 'BRL') {
  const url = EXCHANGE_API_KEY
    ? `${BASE_URL}/${EXCHANGE_API_KEY}/latest/${baseCurrency}`
    : `https://open.er-api.com/v6/latest/${baseCurrency}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Exchange rate API failed: ${response.status}`);
  }

  const data = await response.json();
  return data.rates || data.conversion_rates || {};
}

/**
 * Get specific pair rate
 */
export async function getPairRate(from, to) {
  const rates = await getExchangeRates(from);
  return rates[to] || null;
}

/**
 * Get formatted rates for the blog ticker
 */
export async function getTickerRates() {
  try {
    const usdRates = await getExchangeRates('USD');
    const brlRate = usdRates['BRL'] || 5.67;

    return {
      USDBRL: brlRate.toFixed(2),
      EURBRL: (brlRate * (usdRates['EUR'] ? 1 / usdRates['EUR'] : 1.09)).toFixed(2),
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Failed to fetch ticker rates:', error.message);
    return {
      USDBRL: '5.67',
      EURBRL: '6.18',
      timestamp: new Date().toISOString(),
      error: true,
    };
  }
}

/**
 * Get closing rates (last available quote) for a given month via AwesomeAPI.
 * Used by the monthly "Índice FinMoovi do Custo de Vida" series.
 *
 * @param {number} year  Full year (e.g. 2026)
 * @param {number} month Month 1-12
 * @returns {{USDBRL:string, EURBRL:string, closeDate:string, fallback:boolean}}
 *          On AwesomeAPI failure degrades to getTickerRates() (current rates)
 *          with fallback=true so callers can label the source accordingly.
 */
export async function getMonthCloseRates(year, month) {
  const pad = (n) => String(n).padStart(2, '0');
  const lastDay = new Date(year, month, 0).getDate();
  const start = `${year}${pad(month)}01`;
  const end = `${year}${pad(month)}${pad(lastDay)}`;

  async function lastQuote(pair) {
    const url = `https://economia.awesomeapi.com.br/json/daily/${pair}/10?start_date=${start}&end_date=${end}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`AwesomeAPI ${pair} failed: ${response.status}`);
    const data = await response.json();
    // A API retorna as cotações em ordem decrescente: [0] = última do período.
    if (!Array.isArray(data) || !data[0] || !data[0].bid) {
      throw new Error(`AwesomeAPI ${pair}: resposta em formato inesperado`);
    }
    return data[0];
  }

  try {
    const [usd, eur] = [await lastQuote('USD-BRL'), await lastQuote('EUR-BRL')];
    return {
      USDBRL: Number(usd.bid).toFixed(2),
      EURBRL: Number(eur.bid).toFixed(2),
      closeDate: (usd.create_date || '').split(' ')[0] || `${year}-${pad(month)}-${pad(lastDay)}`,
      fallback: false,
    };
  } catch (error) {
    console.warn(`⚠️ AwesomeAPI mensal indisponível (${error.message}) — usando cotações atuais como fallback.`);
    const ticker = await getTickerRates();
    return { USDBRL: ticker.USDBRL, EURBRL: ticker.EURBRL, closeDate: new Date().toISOString().split('T')[0], fallback: true };
  }
}

/**
 * Variação REAL do dólar e do euro na última semana, via AwesomeAPI.
 *
 * ── Por que esta função existe ────────────────────────────────────────────
 * O `getTickerRates()` devolve **um número por moeda: o de hoje**. Não há ali
 * nenhuma série, nenhum valor de segunda-feira, nada. Mesmo assim os posts
 * semanais vinham a escrever *"o dólar recuou 0,4 % ao longo da semana"* e
 * *"alta de 2 % na quinta-feira"* — auditoria de 22/09/2026: **7 frases assim
 * em 6 dos 30 posts publicados**. Eram todas inventadas pelo modelo, porque o
 * dado nunca existiu.
 *
 * A saída não é proibir a frase — é **dar o número verdadeiro**, como já se faz
 * com a Selic e o IPCA. É mais barato calar um modelo com um dado do que com
 * uma regra.
 *
 * @returns {{USDBRL:{atual:number,anterior:number,variacao:number},
 *            EURBRL:{atual:number,anterior:number,variacao:number},
 *            desde:string} | null}
 *          `null` quando a API não responde — e aí o item **sai do prompt**,
 *          em vez de o modelo preencher o buraco.
 */
export async function getWeekChange() {
  async function serie(pair) {
    // 8 dias para garantir 7 dias de calendário mesmo com fim de semana e feriado.
    const url = `https://economia.awesomeapi.com.br/json/daily/${pair}/8`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`AwesomeAPI ${pair} failed: ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data) || data.length < 2) {
      throw new Error(`AwesomeAPI ${pair}: série curta demais para comparar`);
    }
    // Ordem decrescente: [0] é hoje, o último é o mais antigo.
    const atual = Number(data[0].bid);
    const anterior = Number(data[data.length - 1].bid);
    if (!atual || !anterior) throw new Error(`AwesomeAPI ${pair}: cotação vazia`);
    return {
      atual,
      anterior,
      variacao: Number(((atual / anterior - 1) * 100).toFixed(2)),
      desde: new Date(Number(data[data.length - 1].timestamp) * 1000).toISOString().split('T')[0],
    };
  }

  try {
    const [usd, eur] = await Promise.all([serie('USD-BRL'), serie('EUR-BRL')]);
    return { USDBRL: usd, EURBRL: eur, desde: usd.desde };
  } catch (error) {
    console.warn(`⚠️ variação semanal indisponível (${error.message}) — o item sai do pedido.`);
    return null;
  }
}

export default {
  getExchangeRates,
  getPairRate,
  getTickerRates,
  getMonthCloseRates,
  getWeekChange,
};
