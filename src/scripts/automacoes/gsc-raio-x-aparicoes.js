/**
 * RAIO-X DAS APARIÇÕES — de onde vêm as impressões que não viram clique.
 *
 * ═══ A PERGUNTA ═══
 * O blog aparece ~2.800 vezes por mês na busca e recebe ZERO cliques. A página
 * principal está na posição 8 com 1.164 aparições e o título já foi corrigido à
 * mão em 15/09 para casar palavra a palavra com a busca. Mesmo assim: zero.
 *
 * Zero cliques na posição 8 não é normal. Antes de gastar mais energia em
 * backlinks, vale saber O QUE são essas aparições:
 *   - de que país vêm (se forem de um mercado que não servimos, a leitura muda)
 *   - em que aparelho
 *   - em que tipo de resultado aparecem (searchAppearance)
 *   - se há aparições fora da busca normal (Discover, Notícias)
 *   - e se o conserto de 15/09 moveu alguma coisa (antes x depois)
 *
 * SÓ LÊ. Não escreve ficheiro nenhum, não empurra nada. Imprime no registo.
 * Skip gracioso sem credenciais (padrão do repo): sai 0.
 *
 * Uso:  node src/scripts/automacoes/gsc-raio-x-aparicoes.js
 */

import { querySearchAnalytics, hasGscCredentials, GSC_SITE_URL } from '../apis/gsc.js';

// ⚠️ O GSC atrasa 2-3 dias. A janela acaba ANTES disso, senão os últimos dias
// entram meio vazios e parecem queda.
const FIM = '2026-09-29';
const INICIO = '2026-09-02';      // 28 dias
const FIX_TITULO = '2026-09-15';  // dia em que o título foi reescrito à mão

const PAGINA_CHAVE = `${GSC_SITE_URL.replace(/\/$/, '')}/posts/como-organizar-suas-despesas-mensais-com-facilidade-e/`;
const BUSCA_CHAVE = 'como reduzir gastos mensais';

if (!hasGscCredentials()) {
  console.log('⏭️ sem credenciais do GSC — nada a medir.');
  process.exit(0);
}

const soma = linhas => linhas.reduce(
  (a, r) => ({ cliques: a.cliques + r.clicks, aparicoes: a.aparicoes + r.impressions }),
  { cliques: 0, aparicoes: 0 },
);

const pct = (a, b) => (b ? `${((a / b) * 100).toFixed(2)}%` : '—');

async function tabela(titulo, opts, topo = 10) {
  let linhas = [];
  try {
    linhas = await querySearchAnalytics(opts);
  } catch (e) {
    console.log(`\n## ${titulo}\n   ⚠️ falhou: ${String(e.message).slice(0, 160)}`);
    return;
  }
  const t = soma(linhas);
  console.log(`\n## ${titulo}`);
  console.log(`   total: ${t.aparicoes} aparições · ${t.cliques} cliques · CTR ${pct(t.cliques, t.aparicoes)}`);
  if (!linhas.length) { console.log('   (nenhuma linha)'); return; }
  linhas.sort((a, b) => b.impressions - a.impressions);
  for (const r of linhas.slice(0, topo)) {
    console.log(
      `   ${String(r.keys.join(' · ')).padEnd(28)} ` +
      `${String(r.impressions).padStart(6)} aparições  ` +
      `${String(r.clicks).padStart(4)} cliques  ` +
      `pos ${r.position.toFixed(1)}`,
    );
  }
  if (linhas.length > topo) console.log(`   … e mais ${linhas.length - topo} linha(s)`);
}

const filtroBusca = [{ filters: [{ dimension: 'query', operator: 'equals', expression: BUSCA_CHAVE }] }];
const filtroPagina = [{ filters: [{ dimension: 'page', operator: 'equals', expression: PAGINA_CHAVE }] }];

console.log(`# RAIO-X DAS APARIÇÕES — ${GSC_SITE_URL}`);
console.log(`Janela: ${INICIO} → ${FIM} (28 dias, já descontado o atraso do GSC)`);

await tabela('1. Por PAÍS', { startDate: INICIO, endDate: FIM, dimensions: ['country'], rowLimit: 100 });
await tabela('2. Por APARELHO', { startDate: INICIO, endDate: FIM, dimensions: ['device'], rowLimit: 10 });
await tabela('3. Por TIPO DE RESULTADO (searchAppearance)', { startDate: INICIO, endDate: FIM, dimensions: ['searchAppearance'], rowLimit: 50 });

// Fora da busca normal: Discover e Notícias são "type" separados — se as
// aparições estiverem aqui, falar em "posição 8" não quer dizer nada.
for (const tipo of ['discover', 'googleNews', 'news', 'image', 'video']) {
  await tabela(`4. Fora da busca normal — ${tipo}`, { startDate: INICIO, endDate: FIM, dimensions: ['page'], rowLimit: 10, searchType: tipo }, 5);
}

await tabela(`5. A busca "${BUSCA_CHAVE}" — por país`, { startDate: INICIO, endDate: FIM, dimensions: ['country'], rowLimit: 50, filters: filtroBusca });
await tabela(`6. A busca "${BUSCA_CHAVE}" — por aparelho`, { startDate: INICIO, endDate: FIM, dimensions: ['device'], rowLimit: 10, filters: filtroBusca });

// A FORMA NO TEMPO. Se as 1.164 aparições forem um PICO de poucos dias e não
// procura contínua, falar em "oportunidade na posição 8" é falar de um fantasma.
// Janela larga de propósito: 90 dias.
await tabela(`6b. "${BUSCA_CHAVE}" — dia a dia (90 dias)`, {
  startDate: '2026-07-01', endDate: FIM, dimensions: ['date'], rowLimit: 200, filters: filtroBusca,
}, 100);

// E o mesmo para o BRASIL, que é o mercado real — para ver a posição de verdade.
await tabela('6c. Só o BRASIL — as 10 páginas com mais aparições', {
  startDate: INICIO, endDate: FIM, dimensions: ['page'], rowLimit: 50,
  filters: [{ filters: [{ dimension: 'country', operator: 'equals', expression: 'bra' }] }],
});

// ANTES x DEPOIS do conserto do título. Janelas de 14 dias cada, coladas ao dia
// da mudança — comparar 28 dias contra 18 dias diria pouco.
console.log('\n## 7. O conserto do título de 15/09 moveu alguma coisa?');
for (const [rotulo, de, ate] of [
  ['ANTES (01→14/09)', '2026-09-01', '2026-09-14'],
  ['DEPOIS (16→29/09)', '2026-09-16', '2026-09-29'],
]) {
  try {
    const linhas = await querySearchAnalytics({ startDate: de, endDate: ate, dimensions: ['page'], rowLimit: 10, filters: filtroPagina });
    const t = soma(linhas);
    const pos = linhas[0]?.position;
    console.log(`   ${rotulo.padEnd(20)} ${String(t.aparicoes).padStart(5)} aparições  ${String(t.cliques).padStart(3)} cliques  CTR ${pct(t.cliques, t.aparicoes).padStart(6)}  pos ${pos ? pos.toFixed(1) : '—'}`);
  } catch (e) {
    console.log(`   ${rotulo}: falhou — ${String(e.message).slice(0, 120)}`);
  }
}
