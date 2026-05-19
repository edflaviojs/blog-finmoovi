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

export default {
  getExchangeRates,
  getPairRate,
  getTickerRates,
};
