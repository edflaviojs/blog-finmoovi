/**
 * gsc.js — Cliente da Google Search Console API (Search Analytics).
 *
 * Auth via CONTA DE SERVIÇO (service account), com JWT assinado à mão usando o
 * módulo `crypto` NATIVO do Node (RS256) → troca por access token OAuth2. Sem
 * SDK/dependência nova, no mesmo estilo dos outros clientes deste diretório
 * (fetch puro — ver exchange-rate.js / seo-monitor.js).
 *
 * SKIP GRACIOSO: se o secret `GSC_SERVICE_ACCOUNT_JSON` não existir, o módulo NÃO
 * quebra — `hasGscCredentials()` retorna false e o chamador sai com exit 0
 * (padrão do repo). Nada é impresso da credencial.
 *
 * Secrets/vars esperados no ambiente (GitHub Actions):
 *   - GSC_SERVICE_ACCOUNT_JSON  → conteúdo do JSON da chave da service account.
 *   - GSC_SITE_URL              → URL da propriedade (default blog.finmoovi.com).
 *
 * A service account precisa estar adicionada como USUÁRIO (leitura) na
 * propriedade do GSC. Escopo usado: webmasters.readonly.
 */

import { createSign } from 'crypto';
import { config } from '../../../site.config.ts';

const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const DEFAULT_SITE_URL = `${config.siteUrl.replace(/\/$/, '')}/`;

/** URL da propriedade no GSC (env com fallback para o domínio do blog). */
export const GSC_SITE_URL = process.env.GSC_SITE_URL || DEFAULT_SITE_URL;

/** Lê e valida o JSON da service account do ambiente. Retorna null se ausente/invalido. */
function loadServiceAccount() {
  const raw = process.env.GSC_SERVICE_ACCOUNT_JSON;
  if (!raw || !raw.trim()) return null;
  try {
    const sa = JSON.parse(raw);
    if (!sa.client_email || !sa.private_key) return null;
    return sa;
  } catch {
    return null;
  }
}

/** Há credenciais suficientes para consultar o GSC? (para o skip gracioso do chamador) */
export function hasGscCredentials() {
  return loadServiceAccount() !== null;
}

/** base64url de uma string/Buffer (sem padding, url-safe). */
function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

let cachedToken = null; // { token, exp } — reaproveita dentro do mesmo processo.

/**
 * Assina um JWT (RS256) e troca por um access token OAuth2 (grant jwt-bearer).
 * Lança se as credenciais forem inválidas ou a troca falhar.
 */
async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp > now + 60) return cachedToken.token;

  const sa = loadServiceAccount();
  if (!sa) throw new Error('GSC: service account ausente ou inválida');

  const tokenUri = sa.token_uri || 'https://oauth2.googleapis.com/token';
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: sa.client_email,
    scope: SCOPE,
    aud: tokenUri,
    iat: now,
    exp: now + 3600,
  };

  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claim))}`;
  const signature = createSign('RSA-SHA256')
    .update(signingInput)
    .sign(sa.private_key);
  const jwt = `${signingInput}.${base64url(signature)}`;

  const res = await fetch(tokenUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GSC: falha ao obter access token (${res.status}): ${text}`);
  }

  const data = await res.json();
  if (!data.access_token) throw new Error('GSC: resposta de token sem access_token');
  cachedToken = { token: data.access_token, exp: now + (data.expires_in || 3600) };
  return cachedToken.token;
}

/**
 * Consulta a Search Analytics API do GSC.
 * @param {Object} opts
 * @param {string} opts.startDate  'YYYY-MM-DD'
 * @param {string} opts.endDate    'YYYY-MM-DD'
 * @param {string[]} [opts.dimensions=['query']]  ex.: ['query'], ['page'], ['query','page']
 * @param {number} [opts.rowLimit=1000]  máx 25000 por request
 * @param {Array}  [opts.filters]  dimensionFilterGroups (formato da API)
 * @param {string} [opts.searchType='web']
 * @returns {Promise<Array>} linhas ({ keys, clicks, impressions, ctr, position }) — [] se vazio.
 */
export async function querySearchAnalytics({
  startDate,
  endDate,
  dimensions = ['query'],
  rowLimit = 1000,
  filters,
  searchType = 'web',
} = {}) {
  const token = await getAccessToken();
  const site = encodeURIComponent(GSC_SITE_URL);
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${site}/searchAnalytics/query`;

  const body = { startDate, endDate, dimensions, rowLimit, type: searchType };
  if (filters) body.dimensionFilterGroups = filters;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GSC: searchAnalytics falhou (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.rows || [];
}

export default {
  GSC_SITE_URL,
  hasGscCredentials,
  querySearchAnalytics,
};
