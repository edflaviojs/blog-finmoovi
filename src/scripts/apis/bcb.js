/**
 * bcb.js — indicadores oficiais do Banco Central do Brasil (SGS).
 *
 * POR QUE ESTE FICHEIRO EXISTE (15/09/2026): o gerador semanal de cotações pedia
 * ao modelo "Comentário sobre a Selic" e **não lhe dava a Selic**. O modelo
 * inventava um número todas as semanas. Foram encontrados 11 ficheiros com valores
 * falsos, incluindo um post que afirmava um corte do Copom que nunca existiu
 * ("reduziu a Selic de 11,25% para 10,75% — a primeira baixa do ano", quando a
 * taxa estava em 14,00% e não se mexeu).
 *
 * A regra desta casa é: **número de indicador económico só entra num texto se vier
 * daqui.** Sem dado, não se afirma nada — ver `cotacoes-semanal.js`, que remove a
 * secção inteira quando esta API falha, em vez de deixar o modelo preencher.
 *
 * A API do SGS é pública, gratuita e não pede chave.
 * Documentação: https://dadosabertos.bcb.gov.br/dataset/20542-saldo-da-carteira-de-credito
 */

const SGS = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs';

/** Séries usadas. O número é o identificador oficial do SGS. */
export const SERIES = {
  /** Meta Selic definida pelo Copom, em % ao ano. Valor diário. */
  SELIC_META: 432,
  /** IPCA acumulado em 12 meses, em %. Valor mensal. */
  IPCA_12M: 13522,
};

/**
 * Lê o último valor de uma série do SGS.
 *
 * Devolve `null` em qualquer falha — rede, formato inesperado, série vazia. É
 * deliberado: quem chama tem de saber distinguir "não há dado" de "o dado é zero",
 * e a resposta a "não há dado" é **calar**, nunca estimar.
 *
 * @param {number} serie - identificador da série no SGS (ver {@link SERIES})
 * @param {number} [timeoutMs=15000] - desiste ao fim deste tempo
 * @returns {Promise<{valor: number, data: string}|null>}
 */
export async function ultimoValor(serie, timeoutMs = 15000) {
  const url = `${SGS}.${serie}/dados/ultimos/1?formato=json`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();
    if (!Array.isArray(json) || json.length === 0) throw new Error('série vazia');

    const { data, valor } = json[json.length - 1];
    const n = Number(String(valor).replace(',', '.'));
    if (!Number.isFinite(n)) throw new Error(`valor não numérico: ${valor}`);

    return { valor: n, data };
  } catch (err) {
    // `::warning::` e não silêncio: trava que aborta sem dizer nada deixa o job
    // sair verde e ninguém repara (regra da casa, ver seo-guard.js).
    console.warn(`::warning::BCB série ${serie} indisponível — ${err.message}`);
    return null;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Meta Selic atual, em % ao ano, direto do Copom.
 * @returns {Promise<{valor: number, data: string}|null>}
 */
export async function getSelic() {
  return ultimoValor(SERIES.SELIC_META);
}

/**
 * IPCA acumulado em 12 meses, em %.
 * @returns {Promise<{valor: number, data: string}|null>}
 */
export async function getIpca12m() {
  return ultimoValor(SERIES.IPCA_12M);
}

/**
 * Formata um número no padrão brasileiro com 2 casas: `14` → `"14,00"`.
 *
 * Usa vírgula porque é assim que o número aparece escrito nos posts, e é assim
 * que o `indicadores-guard.js` o procura.
 *
 * @param {number} n
 * @returns {string}
 */
export function pt(n) {
  return n.toFixed(2).replace('.', ',');
}
