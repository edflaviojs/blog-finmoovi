/**
 * gsc-temas.js — DEMANDA vs OFERTA por tema. Só mede; não escreve no repo.
 *
 * Existe para responder a UMA pergunta com número: "de todos os temas, quais já
 * atraem gente para o blog, e quantos posts eu tenho sobre cada um?". O digest
 * de oportunidades (`gsc-oportunidades.js`) responde por BUSCA e em 28 dias;
 * este responde por TEMA e no maior histórico que o GSC guarda (16 meses).
 *
 * ⚠️ LIMITE HONESTO: o GSC só conhece buscas em que o blog JÁ apareceu. Ele não
 * sabe o volume de um tema onde o blog não ranqueia nada. Volume absoluto de
 * mercado só vem de ferramenta externa (Semrush) — não há chave dessas no repo.
 *
 * CONTROLES FALSOS (obrigatórios — um teste que aceita tudo não é informação):
 *   1. tema `zz-controle-falso` com palavras absurdas → TEM de ficar com 0 buscas e 0 posts.
 *   2. consulta ao GSC filtrada por uma busca inventada → TEM de voltar 0 linhas.
 * Se qualquer um falhar, o script sai com erro: a classificação ou o pipeline mente.
 *
 * Uso: node src/scripts/automacoes/gsc-temas.js
 */

import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { hasGscCredentials, querySearchAnalytics, GSC_SITE_URL } from '../apis/gsc.js';

const LOOKBACK_DAYS = 480;   // ~16 meses, o teto do que o GSC guarda
const LAG_DAYS = 3;          // o GSC tem defasagem de 2-3 dias
const PAGE_SIZE = 25000;     // teto por request da Search Analytics API
const POSTS_DIR = join(process.cwd(), 'src', 'content', 'posts');

/**
 * Tema → padrões. A ORDEM importa: o primeiro que casa ganha, então o mais
 * específico vem antes do mais geral (juros-compostos antes de investimentos,
 * senão "calculadora de juros compostos" cairia em investimentos).
 *
 * Os padrões são comparados contra o texto SEM ACENTO e em minúscula (ver
 * `normalizar`), por isso escrevem-se sem acento de propósito.
 *
 * ⚠️ CADA TEMA APANHA OS TRÊS IDIOMAS. A primeira versão só tinha português e
 * deixou 60% das impressões por classificar — o blog publica em PT/EN/ES e a
 * maior parte do que o Google lhe mostra NÃO é em português. Um dicionário só
 * em português não estava errado por pouco: dava a tabela ao contrário.
 */
const TEMAS = [
  ['juros-compostos',   /juros? compost|juro compost|montante|capitaliza|compound interest|interes compuesto/],
  ['financiamento',     /financiament|tabela sac|tabela price|amortiza|saldo devedor|consorcio|imovel|imoveis|carro|veiculo|habitacional|prestac|financing|finance a|loan|mortgage|installment|outstanding balance|financiamiento|prestamo|hipoteca|saldo pendiente|pagos anticipados|cuota/],
  ['reserva-emergencia',/reserva de emerg|fundo de emerg|colchao financ|emergency fund|fondo de emergencia/],
  ['aposentadoria',     /aposent|inss|previdenc|independencia financeira|liberdade financeira|retirement|retire early|jubilacion|pension|financial independence/],
  ['dividas',           /divida|endivid|negociar|serasa|nome sujo|nome limpo|spc|score|inadimpl|renegocia|atraso|\bdebt|deuda|credit score/],
  ['cartao-credito',    /cartao|fatura|rotativo|limite do cart|milhas|cashback|anuidade|credit card|tarjeta de credito|invoice/],
  ['moedas-cotacao',    /dolar|euro|cambio|cotac|moeda|libra|peso argentin|bitcoin|cripto|currency|foreign exchange|exchange rate|divisa|crypto/],
  ['impostos',          /imposto|declarac|irpf|leao|receita federal|tributa|isento|income tax|\btax\b|taxes|impuesto/],
  ['investimentos',     /investi|cdb|tesouro|selic|cdi|renda fixa|renda variavel|acoes|acao da bolsa|bolsa|fundo|dividendo|lci|lca|poupanca|rentabil|aplicac|corretora|b3|\betf\b|carteira|invest|fund|stock|shares|bond|debenture|volatil|dividend|portfolio|wealth management|yield|accion|acciones|renta fija|renta variable|cartera|\bmercado|treasury|savings account/],
  // ⚠️ `\bmercado` com limite de palavra de propósito: sem ele, "supermercado"
  // — que é orçamento doméstico — caía em investimentos. Apanhado por um caso
  // de teste, não por leitura.
  ['pix-bancos',        /\bpix\b|\bted\b|\bdoc\b|conta corrente|conta digital|banco digital|nubank|itau|bradesco|caixa economica|transferenc|wire transfer|checking account|cuenta corriente|transferencia/],
  ['renda-extra',       /renda extra|ganhar dinheiro|trabalho extra|freela|bico|vender|empreend|autonomo|mei\b|side hustle|extra income|make money|freelanc|ingreso extra|emprend/],
  ['salario-renda',     /salario|renda mensal|holerite|13o|decimo terceiro|ferias|rescisao|fgts|piso|minimo|salary|wage|monthly income|payroll|sueldo|nomina|ingreso mensual/],
  ['app-ferramenta',    /aplicativ|\bapp\b|planilha|mobills|organizze|guiabolso|finmoovi|excel|software|programa para|spreadsheet|calculator|hoja de calculo|calculadora/],
  ['orcamento',         /orcament|50.?30.?20|gasto|despesa|economiz|poupar|controle financeiro|controlar|organizar as financ|organizar financ|planejamento financeiro|educacao financeira|financas pessoais|mesada|supermercado|lista de compras|custo de vida|corte|guardar dinheiro|juntar dinheiro|conta de luz|conta de agua|consumo de|energia|agua em casa|impulso|envelope|conta do dia|contas do dia|pagar as conta|pagar a conta|prazo das contas|saldo pendente|banho|budget|expense|spending|save money|saving money|cash flow|cost of living|grocery|presupuesto|ahorrar|ahorro|flujo de caja|gastos|control de gastos/],
  // Último tema real: apanha quem fala de finanças pessoais sem entrar em
  // nenhum assunto concreto ("plano financeiro", "caos financeiro", "erros
  // financeiros"). Fica SEPARADO de `orcamento` de propósito — enfiá-lo lá
  // dentro inflaria o número que este relatório existe justamente para medir.
  ['financas-geral',    /financeir|financas|dinheiro|caos|bagunca|financial planning|personal finance|financial|finanzas|planificacion financiera|money/],
  ['zz-controle-falso', /xilofone quantico|zepelim de gelatina|hipopotamo de latao/],
];

/**
 * Os dois conjuntos abaixo são montados em TEMPO DE EXECUÇÃO a partir dos
 * códigos, e não escritos no ficheiro como caractere. Escritos à mão ficariam
 * invisíveis aqui dentro e ninguém conseguiria rever a regra depois — e é
 * justamente um espaço invisível (U+202F, que aparece colado a "%") que já deu
 * falso alarme numa trava deste repo.
 */
const DIACRITICOS = new RegExp('[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']', 'g');
const ESPACOS_INVISIVEIS = new RegExp(
  '[' + [0x00a0, 0x2007, 0x2009, 0x202f].map(c => String.fromCharCode(c)).join('') + ']',
  'g',
);

/** minúscula, sem acento e sem espaço invisível. */
function normalizar(txt) {
  return String(txt)
    .normalize('NFD')
    .replace(DIACRITICOS, '')
    .replace(ESPACOS_INVISIVEIS, ' ')
    .toLowerCase();
}

function classificar(texto) {
  const t = normalizar(texto);
  for (const [nome, padrao] of TEMAS) if (padrao.test(t)) return nome;
  return null; // não classificado — devolvido no relatório para eu ver o que escapou
}

function fmtDate(d) {
  return d.toISOString().split('T')[0];
}

function periodo() {
  const end = new Date(Date.now() - LAG_DAYS * 86400000);
  const start = new Date(end.getTime() - LOOKBACK_DAYS * 86400000);
  return { startDate: fmtDate(start), endDate: fmtDate(end) };
}

/** Puxa TODAS as linhas, paginando — sem paginar, 25 mil é um teto silencioso. */
async function puxarTudo(opts) {
  const todas = [];
  for (let startRow = 0; ; startRow += PAGE_SIZE) {
    const lote = await querySearchAnalytics({ ...opts, rowLimit: PAGE_SIZE, startRow });
    todas.push(...lote);
    if (lote.length < PAGE_SIZE) break;
  }
  return todas;
}

/** Quantos posts em PT existem por tema (o lado da OFERTA). */
function contarPostsPorTema() {
  const contagem = new Map();
  const exemplos = new Map();
  let total = 0;
  for (const f of readdirSync(POSTS_DIR)) {
    if (!f.endsWith('.md') || f.startsWith('en-') || f.startsWith('es-')) continue;
    total++;
    const bruto = readFileSync(join(POSTS_DIR, f), 'utf8');
    const tituloMatch = bruto.match(/^title:\s*(.+)$/m);
    const titulo = tituloMatch ? tituloMatch[1] : '';
    const tema = classificar(`${f} ${titulo}`) || 'sem-tema';
    contagem.set(tema, (contagem.get(tema) || 0) + 1);
    if (!exemplos.has(tema)) exemplos.set(tema, f.replace('.md', ''));
  }
  return { contagem, exemplos, total };
}

async function main() {
  if (!hasGscCredentials()) {
    console.log('ℹ️ GSC: credenciais ausentes. Nada medido (exit 0).');
    return;
  }

  const p = periodo();
  console.log(`🔎 ${GSC_SITE_URL} · ${p.startDate} → ${p.endDate} (${LOOKBACK_DAYS} dias)\n`);

  const linhasQuery = await puxarTudo({ ...p, dimensions: ['query'] });
  const linhasQueryPage = await puxarTudo({ ...p, dimensions: ['query', 'page'] });

  // ── CONTROLE FALSO 2: busca inventada tem de voltar VAZIA ──────────────────
  const inventada = 'xilofone quantico para hipopotamo de latao';
  const controle = await querySearchAnalytics({
    ...p,
    dimensions: ['query'],
    rowLimit: 10,
    filters: [{ filters: [{ dimension: 'query', operator: 'equals', expression: inventada }] }],
  });
  if (controle.length > 0) {
    console.error(`❌ CONTROLE FALHOU: a busca inventada "${inventada}" devolveu ${controle.length} linha(s). O pipeline aceita qualquer coisa — não confiar em nada acima.`);
    process.exit(1);
  }
  console.log(`✅ Controle 1/2: busca inventada devolveu 0 linhas (o GSC não inventa).`);

  // ── Agregação por tema ─────────────────────────────────────────────────────
  const porTema = new Map();
  const naoClassificadas = [];
  let impTotal = 0, cliquesTotal = 0;

  for (const r of linhasQuery) {
    const query = r.keys[0];
    const imp = r.impressions || 0;
    const cli = r.clicks || 0;
    impTotal += imp;
    cliquesTotal += cli;
    const tema = classificar(query);
    if (!tema) { naoClassificadas.push({ query, imp, pos: r.position }); continue; }
    if (!porTema.has(tema)) porTema.set(tema, { imp: 0, cliques: 0, buscas: 0, posSoma: 0, topBusca: null, topImp: 0 });
    const t = porTema.get(tema);
    t.imp += imp; t.cliques += cli; t.buscas++; t.posSoma += (r.position || 0) * imp;
    if (imp > t.topImp) { t.topImp = imp; t.topBusca = query; }
  }

  // Páginas minhas por tema, e impressões por IDIOMA.
  //
  // O idioma sai do CAMINHO da página (`/en/`, `/es/`), que é um facto do site,
  // e não de adivinhar a língua da busca pelas palavras — uma busca como
  // "etf" ou "pix" não tem idioma nenhum, e adivinhar produziria um número que
  // parece medido sem o ser.
  const paginasPorTema = new Map();
  const porIdioma = new Map();
  const porSecao = new Map();
  for (const r of linhasQueryPage) {
    const caminho = r.keys[1].replace(/^https?:\/\/[^/]+/, '');
    const idioma = caminho.startsWith('/en/') ? 'en' : caminho.startsWith('/es/') ? 'es' : 'pt';
    // Qual PARTE do blog recebe a impressão. Muda a decisão: se a procura cai no
    // glossário, a resposta é mexer no glossário — escrever mais posts não
    // atende quem procura a definição de uma palavra.
    const secao = /\/glossario\//.test(caminho) ? 'glossario'
      : /\/posts?\//.test(caminho) ? 'posts'
      : /\/ferramentas\//.test(caminho) ? 'ferramentas'
      : 'outras';
    if (!porIdioma.has(idioma)) porIdioma.set(idioma, { imp: 0, cliques: 0 });
    porIdioma.get(idioma).imp += r.impressions || 0;
    porIdioma.get(idioma).cliques += r.clicks || 0;
    if (!porSecao.has(secao)) porSecao.set(secao, { imp: 0, cliques: 0, paginas: new Set() });
    porSecao.get(secao).imp += r.impressions || 0;
    porSecao.get(secao).cliques += r.clicks || 0;
    porSecao.get(secao).paginas.add(caminho);

    const tema = classificar(r.keys[0]);
    if (!tema) continue;
    if (!paginasPorTema.has(tema)) paginasPorTema.set(tema, new Set());
    paginasPorTema.get(tema).add(r.keys[1]);
    const t = porTema.get(tema);
    if (t) {
      t.porIdioma = t.porIdioma || { pt: 0, en: 0, es: 0 };
      t.porIdioma[idioma] += r.impressions || 0;
      t.porSecao = t.porSecao || { glossario: 0, posts: 0, ferramentas: 0, outras: 0 };
      t.porSecao[secao] += r.impressions || 0;
    }
  }

  const { contagem: postsPorTema, exemplos, total: totalPosts } = contarPostsPorTema();

  // ── CONTROLE FALSO 1: o tema absurdo não pode ter capturado nada ───────────
  const falso = porTema.get('zz-controle-falso');
  const falsoPosts = postsPorTema.get('zz-controle-falso') || 0;
  if (falso || falsoPosts > 0) {
    console.error(`❌ CONTROLE FALHOU: o tema inventado capturou ${falso ? falso.buscas : 0} busca(s) e ${falsoPosts} post(s). A classificação casa com qualquer coisa.`);
    process.exit(1);
  }
  console.log(`✅ Controle 2/2: o tema inventado capturou 0 buscas e 0 posts (a classificação não casa com tudo).\n`);

  // ── Relatório ──────────────────────────────────────────────────────────────
  const somaQP = linhasQueryPage.reduce((s, r) => s + (r.impressions || 0), 0);
  console.log(`TOTAIS · ${linhasQuery.length} buscas · ${impTotal} impressões · ${cliquesTotal} cliques`);
  console.log(`(a soma de busca+página dá ${somaQP} impressões — o GSC agrega diferente nas duas dimensões; a diferença é esperada, não é defeito)\n`);

  console.log('IMPRESSÕES POR IDIOMA DA PÁGINA (o idioma vem do caminho da URL, não da língua da busca)');
  for (const [idioma, v] of [...porIdioma.entries()].sort((a, b) => b[1].imp - a[1].imp)) {
    console.log(`${idioma} | ${v.imp} impressões (${((v.imp / somaQP) * 100).toFixed(1)}%) | ${v.cliques} cliques`);
  }
  console.log('');

  const linhas = [...porTema.entries()]
    .map(([tema, t]) => ({
      tema,
      imp: t.imp,
      cliques: t.cliques,
      buscas: t.buscas,
      pos: t.imp ? (t.posSoma / t.imp) : 0,
      paginas: (paginasPorTema.get(tema) || new Set()).size,
      posts: postsPorTema.get(tema) || 0,
      idiomas: t.porIdioma || { pt: 0, en: 0, es: 0 },
      secoes: t.porSecao || { glossario: 0, posts: 0, ferramentas: 0, outras: 0 },
      topBusca: t.topBusca,
    }))
    .sort((a, b) => b.imp - a.imp);

  console.log('QUE PARTE DO BLOG RECEBE A PROCURA');
  for (const [secao, v] of [...porSecao.entries()].sort((a, b) => b[1].imp - a[1].imp)) {
    console.log(`${secao} | ${v.imp} impressões (${((v.imp / somaQP) * 100).toFixed(1)}%) | ${v.cliques} cliques | ${v.paginas.size} páginas`);
  }
  console.log('');

  console.log('DEMANDA (o que o Google já me mostra)  ×  OFERTA (o que eu escrevi)');
  console.log('tema | impressões | %total | cliques | buscas | posição média | páginas | POSTS | pt/en/es | gloss/posts/ferram | maior busca');
  for (const l of linhas) {
    const pct = impTotal ? ((l.imp / impTotal) * 100).toFixed(1) : '0';
    const i = l.idiomas, s = l.secoes;
    console.log(`${l.tema} | ${l.imp} | ${pct}% | ${l.cliques} | ${l.buscas} | ${l.pos.toFixed(1)} | ${l.paginas} | ${l.posts} | ${i.pt}/${i.en}/${i.es} | ${s.glossario}/${s.posts}/${s.ferramentas} | ${l.topBusca}`);
  }

  const semDemanda = [...postsPorTema.entries()].filter(([tema]) => !porTema.has(tema));
  if (semDemanda.length) {
    console.log('\nTEMAS COM POSTS E ZERO IMPRESSÃO (escrevi e ninguém procurou por aí):');
    for (const [tema, n] of semDemanda.sort((a, b) => b[1] - a[1])) {
      console.log(`${tema} | ${n} posts | ex.: ${exemplos.get(tema)}`);
    }
  }

  const impNaoClass = naoClassificadas.reduce((s, q) => s + q.imp, 0);
  console.log(`\nNÃO CLASSIFICADAS: ${naoClassificadas.length} buscas · ${impNaoClass} impressões (${impTotal ? ((impNaoClass / impTotal) * 100).toFixed(1) : 0}% do total)`);
  console.log('As 40 maiores que escaparam ao dicionário — se houver tema grande aqui, o dicionário está incompleto:');
  for (const q of naoClassificadas.sort((a, b) => b.imp - a.imp).slice(0, 40)) {
    console.log(`  ${q.imp} | pos ${(q.pos || 0).toFixed(1)} | ${q.query}`);
  }

  console.log(`\nPOSTS EM PT contados: ${totalPosts}`);
}

// Exportadas para que o teste use ESTA classificação, e não uma cópia dela:
// cópia estreita da regra já fez um teste deste repo dizer 120/120 quando o real
// era 83.
export { classificar, normalizar, TEMAS, contarPostsPorTema };

// Só corre quando chamado direto (`node gsc-temas.js`); importar não dispara nada.
if (process.argv[1] && process.argv[1].endsWith('gsc-temas.js')) {
  main().catch(err => {
    console.error('❌ gsc-temas falhou:', err.message);
    process.exit(1);
  });
}
