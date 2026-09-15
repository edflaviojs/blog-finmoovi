/**
 * A pergunta que abre cada verbete do glossário: "O que é X?" ou "O que são X?".
 *
 * POR QUE ISTO EXISTE (15/09/2026): o título e o H1 do glossário eram montados com
 * `O que é ${termo}?` fixo, e o glossário tem termos no plural. Resultado no ar, no
 * `<title>` e no `<h1>` — os dois elementos mais visíveis que uma página tem:
 *
 *     "O que é ações?"   "O que é Dividendos?"   "O que é Debêntures?"
 *
 * O glossário é a parte do blog que recebe visita. Erro de português na primeira
 * linha de uma página sobre dinheiro trabalha contra tudo o resto.
 *
 * ⚠️ POR QUE UMA LISTA À MÃO E NÃO UMA REGRA. A regra óbvia — "acaba em s, logo é
 * plural" — reprova meia dúzia de termos corretos: *bolsa de valore**s***, *controle
 * de gasto**s***, *lista de compra**s***, *FGT**S***, *Come-Cota**s*** são todos
 * singulares. Régua grossa demais inventa defeito, e aqui o defeito inventado sairia
 * no H1. Lista explícita, curta, e quem não está nela usa "é".
 *
 * Ao acrescentar um verbete novo no plural, acrescentar aqui também.
 */

/**
 * Termos do glossário que pedem "O que **são**".
 *
 * Comparados sem maiúsculas e sem acentos, porque o campo `term` do conteúdo
 * aparece ora como `ações`, ora como `Juros Compostos`.
 */
const PLURAIS = [
  'acoes',
  'debentures',
  'dividendos',
  'fundos imobiliarios',
  'juros',
  'juros abusivos',
  'juros compostos',
  'juros simples',
  'lci e lca',
  'gasto fixo e variavel',
  'bull market e bear market',
];

/** Minúsculas e sem acentos, para comparar termo com a lista. */
const normalizar = (s: string): string =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const CONJUNTO = new Set(PLURAIS.map(normalizar));

/**
 * Devolve "O que é" ou "O que são" conforme o termo.
 *
 * @param termo - o campo `term` do verbete, como está escrito no conteúdo
 * @returns o começo da pergunta, sem o termo e sem o ponto de interrogação
 * @example
 * inicioDaPergunta('CDI')     // 'O que é'
 * inicioDaPergunta('ações')   // 'O que são'
 */
export function inicioDaPergunta(termo: string): string {
  return CONJUNTO.has(normalizar(termo)) ? 'O que são' : 'O que é';
}

/**
 * A pergunta completa, já com o termo e o ponto de interrogação.
 *
 * @param termo - o campo `term` do verbete
 * @returns ex.: `"O que são ações?"`
 */
export function perguntaDoTermo(termo: string): string {
  return `${inicioDaPergunta(termo)} ${termo}?`;
}
