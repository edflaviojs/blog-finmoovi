/**
 * RAIO-X DAS APARIÇÕES — de onde vêm as impressões que não viram clique.
 *
 * ═══ A PERGUNTA ═══
 * Uma busca aparece muitas vezes e não traz clique nenhum. Antes de gastar energia
 * a mexer no título — ou em backlinks — vale saber O QUE são essas aparições:
 *   - de que país vêm (se forem de um mercado que não servimos, a leitura muda)
 *   - em que aparelho
 *   - em que tipo de resultado aparecem (searchAppearance)
 *   - se há aparições fora da busca normal (Discover, Notícias)
 *   - **a forma no tempo**: procura contínua ou um pico de poucos dias?
 *   - e, se pedido, se uma mudança moveu alguma coisa (antes x depois)
 *
 * Foi assim que se provou, a 02/10/2026, que a «oportunidade na posição 8» eram
 * 1.161 aparições em sete dias, de França e Alemanha, em computador, numa página
 * em português — com o Brasil na posição 84.
 *
 * SÓ LÊ. Não escreve ficheiro nenhum, não empurra nada. Imprime no registo.
 * Skip gracioso sem credenciais (padrão do repo): sai 0.
 *
 * Uso:
 *   node src/scripts/automacoes/gsc-raio-x-aparicoes.js
 *   node ... --busca="como reduzir gastos mensais" --dias=90
 *   node ... --pagina=/posts/algum-slug/ --mudanca=2026-09-15
 * (no workflow, os mesmos campos entram por RX_BUSCA / RX_PAGINA / RX_DIAS / RX_MUDANCA)
 */

import { querySearchAnalytics, hasGscCredentials, GSC_SITE_URL } from '../apis/gsc.js';

/**
 * ♦ 03/10/2026 — CONSERTO Nº5: AS DATAS DEIXAM DE ESTAR ESCRITAS À MÃO.
 *
 * 🔴 Este ficheiro nasceu a 02/10 para responder a **uma** pergunta de **um** dia,
 * e respondeu: foi ele que provou que a «oportunidade na posição 8» era um pico de
 * robôs franceses e alemães. Mas trazia `FIM = '2026-09-29'` escrito no código — e
 * **a pior parte não é não funcionar, é funcionar e mentir**: correr isto em
 * novembro devolveria setembro, com ar de medição fresca, sem erro nenhum.
 *
 * É a mesma família de defeito que esta casa já pagou várias vezes: a régua velha
 * a correr em estrutura nova, calada.
 *
 * Agora: a janela calcula-se sozinha, e a página/busca investigadas entram por
 * parâmetro. **Sem parâmetro nenhum, ele escolhe a busca e a página com mais
 * aparições do período** — que é o que alguém quereria ver de qualquer maneira.
 *
 * Uso:
 *   node src/scripts/automacoes/gsc-raio-x-aparicoes.js
 *   node ... --busca="como reduzir gastos mensais" --dias=90
 *   node ... --pagina=/posts/algum-slug/ --mudanca=2026-09-15
 */
const args = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => {
    const [k, ...v] = a.slice(2).split('=');
    return [k, v.join('=') || true];
  }),
);

const texto = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);

/**
 * Cada campo vem do argumento OU da variável de ambiente `RX_*`.
 *
 * ⚠️ O workflow usa a variável de ambiente de propósito: uma busca com espaços
 * («como reduzir gastos mensais») montada na linha de comando viraria quatro
 * argumentos separados.
 */
const campo = (nome) => texto(args[nome]) || texto(process.env[`RX_${nome.toUpperCase()}`]);

/**
 * ⚠️ O Search Console atrasa 2 a 3 dias. A janela **acaba antes disso**, senão os
 * últimos dias entram meio vazios e parecem uma queda que não existe.
 */
const ATRASO_DIAS = 3;
const DIAS = Number(campo('dias')) > 0 ? Number(campo('dias')) : 28;

const dia = (offset) => new Date(Date.now() - offset * 86400000).toISOString().slice(0, 10);
const FIM = campo('fim') || dia(ATRASO_DIAS);
const INICIO = campo('inicio') || dia(ATRASO_DIAS + DIAS);
/** Dia em que algo foi mudado, para o antes/depois. Sem ele, essa secção não sai. */
const FIX_TITULO = campo('mudanca');

/** Página a investigar: por parâmetro, ou a de mais aparições (decidido adiante). */
const paginaPedida = campo('pagina');
const PAGINA_PEDIDA = paginaPedida
  ? (paginaPedida.startsWith('http') ? paginaPedida : `${GSC_SITE_URL.replace(/\/$/, '')}${paginaPedida}`)
  : null;
const BUSCA_PEDIDA = campo('busca');

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

/**
 * O ALVO — por parâmetro, ou **a busca e a página com mais aparições do período**.
 *
 * ⚠️ Escolher sozinho é o que torna isto uma ferramenta em vez de um bilhete de um
 * dia: quem corre sem saber o que procurar recebe na mesma a investigação do que
 * mais apareceu, que é quase sempre o que interessa olhar.
 */
async function descobrirAlvo() {
  let busca = BUSCA_PEDIDA;
  let pagina = PAGINA_PEDIDA;

  if (!busca) {
    const r = await querySearchAnalytics({ startDate: INICIO, endDate: FIM, dimensions: ['query'], rowLimit: 50 });
    busca = r.sort((a, b) => b.impressions - a.impressions)[0]?.keys?.[0] || null;
  }
  if (!pagina) {
    // A página da busca escolhida — e não a do site inteiro: é dela que se fala.
    if (busca) {
      const r = await querySearchAnalytics({
        startDate: INICIO, endDate: FIM, dimensions: ['page'], rowLimit: 10,
        filters: [{ filters: [{ dimension: 'query', operator: 'equals', expression: busca }] }],
      });
      pagina = r.sort((a, b) => b.impressions - a.impressions)[0]?.keys?.[0] || null;
    }
    if (!pagina) {
      const r = await querySearchAnalytics({ startDate: INICIO, endDate: FIM, dimensions: ['page'], rowLimit: 50 });
      pagina = r.sort((a, b) => b.impressions - a.impressions)[0]?.keys?.[0] || null;
    }
  }
  return { busca, pagina };
}

const { busca: BUSCA_CHAVE, pagina: PAGINA_CHAVE } = await descobrirAlvo();

if (!BUSCA_CHAVE && !PAGINA_CHAVE) {
  console.log('⏭️ O Search Console não devolveu nada neste período — nada a investigar.');
  process.exit(0);
}

const filtroBusca = BUSCA_CHAVE
  ? [{ filters: [{ dimension: 'query', operator: 'equals', expression: BUSCA_CHAVE }] }] : null;
const filtroPagina = PAGINA_CHAVE
  ? [{ filters: [{ dimension: 'page', operator: 'equals', expression: PAGINA_CHAVE }] }] : null;

console.log(`# RAIO-X DAS APARIÇÕES — ${GSC_SITE_URL}`);
console.log(`Janela: ${INICIO} → ${FIM} (${DIAS} dias, já descontado o atraso de ${ATRASO_DIAS} dias do GSC)`);
console.log(`Busca investigada : ${BUSCA_CHAVE || '—'}${BUSCA_PEDIDA ? '' : '  (escolhida: a de mais aparições)'}`);
console.log(`Página investigada: ${String(PAGINA_CHAVE || '—').replace(GSC_SITE_URL, '/')}${PAGINA_PEDIDA ? '' : '  (escolhida: a de mais aparições)'}`);

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

// A FORMA NO TEMPO. Se as aparições forem um PICO de poucos dias e não procura
// contínua, falar em "oportunidade na posição 8" é falar de um fantasma.
// Janela larga de propósito: 90 dias a contar do fim da janela.
const INICIO_90 = new Date(Date.parse(FIM) - 90 * 86400000).toISOString().slice(0, 10);
await tabela(`6b. "${BUSCA_CHAVE}" — dia a dia (90 dias: ${INICIO_90} → ${FIM})`, {
  startDate: INICIO_90, endDate: FIM, dimensions: ['date'], rowLimit: 200, filters: filtroBusca,
}, 100);

/**
 * E o mesmo para o MERCADO da página — é lá que está a posição de verdade.
 *
 * ⚠️ O país deixou de ser `bra` fixo: a página investigada pode ser `en`/`es`, e
 * nesse caso o Brasil não diz nada sobre ela. Sai do caminho da própria página.
 */
const idiomaDaPagina = String(PAGINA_CHAVE || '').includes('/en/') ? 'en'
  : String(PAGINA_CHAVE || '').includes('/es/') ? 'es' : 'pt';
const PAIS_ALVO = { pt: 'bra', en: 'usa', es: 'esp' }[idiomaDaPagina];
await tabela(`6c. Só ${PAIS_ALVO.toUpperCase()} (mercado do idioma "${idiomaDaPagina}") — as 10 páginas com mais aparições`, {
  startDate: INICIO, endDate: FIM, dimensions: ['page'], rowLimit: 50,
  filters: [{ filters: [{ dimension: 'country', operator: 'equals', expression: PAIS_ALVO }] }],
});

/**
 * ANTES x DEPOIS de uma mudança. Janelas de 14 dias cada, coladas ao dia indicado
 * — comparar 28 dias contra 18 dias diria pouco.
 *
 * ⚠️ **Só sai se alguém disser QUANDO foi a mudança** (`--mudanca=AAAA-MM-DD`).
 * Antes havia aqui a data de 15/09 escrita no código, e a secção aparecia sempre:
 * a correr em novembro, mostrava setembro com ar de resposta.
 */
if (FIX_TITULO && filtroPagina) {
  const desloca = (base, dias) => new Date(Date.parse(base) + dias * 86400000).toISOString().slice(0, 10);
  console.log(`\n## 7. A mudança de ${FIX_TITULO} moveu alguma coisa?`);
  for (const [rotulo, de, ate] of [
    ['ANTES', desloca(FIX_TITULO, -14), desloca(FIX_TITULO, -1)],
    ['DEPOIS', desloca(FIX_TITULO, 1), desloca(FIX_TITULO, 14)],
  ]) {
    try {
      const linhas = await querySearchAnalytics({ startDate: de, endDate: ate, dimensions: ['page'], rowLimit: 10, filters: filtroPagina });
      const t = soma(linhas);
      const pos = linhas[0]?.position;
      console.log(`   ${`${rotulo} (${de}→${ate})`.padEnd(32)} ${String(t.aparicoes).padStart(5)} aparições  ${String(t.cliques).padStart(3)} cliques  CTR ${pct(t.cliques, t.aparicoes).padStart(6)}  pos ${pos ? pos.toFixed(1) : '—'}`);
    } catch (e) {
      console.log(`   ${rotulo}: falhou — ${String(e.message).slice(0, 120)}`);
    }
  }
} else {
  console.log('\n## 7. Antes x depois de uma mudança');
  console.log('   (não pedido — para comparar, correr com `--mudanca=AAAA-MM-DD`)');
}
