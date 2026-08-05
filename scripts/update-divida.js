/**
 * AS TAXAS DA DÍVIDA — cartão de crédito, direto do Banco Central (04/08/2026).
 *
 * ═══ POR QUE ISTO EXISTE ═══
 * O primeiro vídeo longo sobre dívida não conseguia ensinar NADA sobre dívida.
 * O ato do meio — o que devia trazer o ensinamento do vídeo — acabava sempre a
 * dizer "eu não via tudo junto", porque a única coisa que o roteiro podia ensinar
 * era organização. O motivo estava medido: o `statistics.json` tem Selic, IPCA, CDI,
 * dólar, euro, poupança e desemprego — **e nenhuma taxa de dívida**. Sem conta
 * calculada, as travas proíbem (e bem) qualquer frase sobre juros com valores.
 * Estava escrito como pendência desde 03/08 (IMPLEMENTACAO20 §31.5, fase 2, item 1).
 *
 * ═══ POR QUE UM FICHEIRO PRÓPRIO, E NÃO O `statistics.json` ═══
 * Aquele ficheiro é lido pelos 27 robôs do blog e alimenta páginas públicas.
 * Acrescentar-lhe uma chave nova é mexer na superfície do site sem ninguém ter
 * pedido. Este ficheiro é só do vídeo; quando o dono quiser a taxa no blog, é uma
 * linha.
 *
 * ═══ A FONTE, E POR QUE É ESTA ═══
 * ⚠️ NÃO se usa uma série do SGS por número, e a razão é que eu tentei: sondei
 * quinze séries (20740-20754, 22699, 25465) e nenhuma devolvia a taxa do rotativo —
 * davam 24%, 63%, 139%… todas plausíveis, todas erradas, e nenhuma se identifica.
 * Escolher uma "que parece certa" seria pôr um número financeiro no ar sem saber o
 * que ele é.
 * Esta API **diz o nome da modalidade** ("Cartão de crédito - rotativo total") ao
 * lado do valor. Pede-se só o período mais recente: ~6 KB e ~60 instituições.
 *
 * ⚠️ E A HONESTIDADE DO NÚMERO: o que se guarda é a **MEDIANA das instituições
 * listadas**, não a "taxa média do rotativo" que o Banco Central publica (essa é
 * ponderada pelo volume de crédito de cada banco, e esse volume esta API não dá).
 * O campo chama-se `mediana` de propósito, e quem escrever texto a partir daqui tem
 * de dizer a verdade: é o valor do meio entre os bancos, não a média do mercado.
 *
 * Uso: node scripts/update-divida.js
 */

import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = resolve(__dirname, '../src/data/divida.json');

const OLINDA = 'https://olinda.bcb.gov.br/olinda/servico/taxaJuros/versao/v2/odata/TaxasJurosDiariaPorInicioPeriodo';

const MODALIDADES = {
  rotativo: 'Cartão de crédito - rotativo total - Prefixado',
  parcelado: 'Cartão de crédito - parcelado - Prefixado',
};

async function pedir(url, label) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error(`[FALHA] ${label}: ${err.message}`);
    return null;
  }
}

/** O período mais recente publicado. Sem ele, o pedido traria o histórico todo (20 MB). */
async function ultimoPeriodo() {
  const d = await pedir(
    `${OLINDA}?%24format=json&%24top=1&%24select=InicioPeriodo&%24orderby=InicioPeriodo%20desc`,
    'último período',
  );
  return d?.value?.[0]?.InicioPeriodo || null;
}

/**
 * A mediana, e não a média simples — de propósito.
 * Nesta lista convivem bancos grandes e financeiras pequenas com taxas de 0,2% e de
 * 25% ao mês. Uma média simples deixa-se puxar pelos extremos; a mediana é o valor
 * do meio e representa "o que um banco normal cobra". Ambas seriam honestas; esta é
 * a mais representativa, e é a que o nome do campo declara.
 */
function mediana(valores) {
  const v = valores.filter((x) => Number.isFinite(x) && x > 0).sort((a, b) => a - b);
  if (!v.length) return null;
  const meio = Math.floor(v.length / 2);
  return v.length % 2 ? v[meio] : +((v[meio - 1] + v[meio]) / 2).toFixed(4);
}

async function taxaDe(modalidade, periodo, label) {
  const filtro = encodeURIComponent(`Modalidade eq '${modalidade}' and InicioPeriodo eq '${periodo}'`);
  const d = await pedir(
    `${OLINDA}?%24format=json&%24select=InstituicaoFinanceira,TaxaJurosAoMes,TaxaJurosAoAno&%24filter=${filtro}`,
    label,
  );
  const linhas = d?.value || [];
  if (!linhas.length) return null;
  const aoMes = mediana(linhas.map((x) => x.TaxaJurosAoMes));
  const aoAno = mediana(linhas.map((x) => x.TaxaJurosAoAno));
  if (aoMes === null) return null;
  console.log(`[OK] ${label}: ${aoMes}% a.m. · ${aoAno}% a.a. (mediana de ${linhas.length} instituições)`);
  return { aoMes, aoAno, instituicoes: linhas.length };
}

async function main() {
  console.log('=== Taxas de dívida do cartão (Banco Central) ===\n');

  const periodo = await ultimoPeriodo();
  if (!periodo) {
    console.error('Não foi possível descobrir o período mais recente. Nada foi escrito.');
    process.exit(1);
  }
  console.log(`período publicado: ${periodo}\n`);

  const [rotativo, parcelado] = await Promise.all([
    taxaDe(MODALIDADES.rotativo, periodo, 'rotativo do cartão'),
    taxaDe(MODALIDADES.parcelado, periodo, 'parcelamento da fatura'),
  ]);

  if (!rotativo) {
    console.error('\nSem a taxa do rotativo não vale a pena escrever nada — o ficheiro antigo fica como está.');
    process.exit(1);
  }

  const dados = {
    updatedAt: new Date().toISOString(),
    periodo,
    fonte: 'Banco Central do Brasil — Taxas de juros por instituição financeira',
    url: 'https://www.bcb.gov.br/estatisticas/reporttxjuros',
    // ⚠️ o nome do campo diz o que o número é. Ver o aviso no cabeçalho.
    medida: 'mediana das instituições listadas no período (NÃO é a média ponderada do mercado)',
    rotativo: { modalidade: MODALIDADES.rotativo, ...rotativo },
    parcelado: parcelado ? { modalidade: MODALIDADES.parcelado, ...parcelado } : null,
    /**
     * O piso do pagamento mínimo da fatura. É REGRA, não medição: a Resolução CMN
     * 4.549/2017 fixou-o em 15% do valor da fatura. Fica escrito aqui para quem
     * calcular não ter de o ir procurar — e para se ver logo se um dia mudar.
     */
    minimoDaFatura: 0.15,
  };

  writeFileSync(OUTPUT_PATH, `${JSON.stringify(dados, null, 2)}\n`, 'utf-8');
  console.log(`\nGuardado em ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
