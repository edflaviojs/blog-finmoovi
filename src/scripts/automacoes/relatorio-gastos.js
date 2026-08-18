/**
 * relatorio-gastos.js — a conta do dia dos serviços pagos.
 *
 * ═══ PARA QUE SERVE ═══
 * O dono tem vários projetos e não consegue acompanhar o que cada serviço está a
 * consumir. Até 18/08/2026 não havia NADA: descobria-se pela fatura, ou quando o
 * serviço parava — foi exactamente assim que a Cerebras esteve morta um dia
 * inteiro sem ninguém dar por isso.
 *
 * ═══ COMO FUNCIONA ═══
 * Cada sítio que gasta grava uma linha `::medidor::` no registo da corrida (ver
 * ../lib/medidor.js). Este robô lê os registos das últimas 24h pela API do
 * GitHub, soma por serviço, guarda o histórico e compara com a média.
 *
 * ═══ 🔴 O QUE ISTO É E O QUE NÃO É ═══
 * Isto **não impede** cobrança nenhuma. Cada robô corre numa máquina nova e
 * descartável, sem memória do que os outros gastaram — não há como travar em
 * tempo real do nosso lado. Quem trava é o painel do fornecedor. Isto AVISA.
 *
 * E avisa de duas maneiras, sendo a segunda a que importa:
 *   1. em dinheiro, SÓ para os serviços cujo preço esteja preenchido em
 *      `.github/data/precos-ia.json` — nunca se inventa preço aqui;
 *   2. **por SALTO**: consumo de hoje contra a média dos últimos dias. Isto
 *      funciona mesmo sem saber o preço, e é o que apanha a surpresa antes de
 *      ela virar fatura.
 *
 * Uso:
 *   node src/scripts/automacoes/relatorio-gastos.js            # 24h, grava histórico
 *   node src/scripts/automacoes/relatorio-gastos.js --horas=48
 *   node src/scripts/automacoes/relatorio-gastos.js --sem-gravar
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { MARCA } from '../lib/medidor.js';

const RAIZ = process.cwd();
const HISTORICO = join(RAIZ, '.github', 'data', 'gastos-diarios.json');
const PRECOS = join(RAIZ, '.github', 'data', 'precos-ia.json');

/** Quantas vezes acima da média conta como SALTO que merece alarme. */
export const FATOR_DE_ALARME = 2.5;

/** Dias de histórico usados para a média (o de hoje não entra na própria média). */
const DIAS_DE_MEDIA = 7;

const args = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => {
    const [k, ...v] = a.slice(2).split('=');
    return [k, v.join('=') || true];
  }),
);
const HORAS = Number(args.horas) > 0 ? Number(args.horas) : 24;
const GRAVAR = !args['sem-gravar'];

const lerJson = (p, d) => { try { return existsSync(p) ? JSON.parse(readFileSync(p, 'utf-8')) : d; } catch { return d; } };

// ─────────────────────────────────────────────────────────────────────────────
// 1. Ler os registos do GitHub
// ─────────────────────────────────────────────────────────────────────────────

const REPO = process.env.GITHUB_REPOSITORY || 'edflaviojs/blog-finmoovi';
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

async function api(caminho, texto = false) {
  const r = await fetch(`https://api.github.com${caminho}`, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: texto ? 'application/vnd.github+json' : 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    signal: AbortSignal.timeout(60000),
  });
  if (!r.ok) throw new Error(`GitHub ${r.status} em ${caminho}`);
  return texto ? r.text() : r.json();
}

/** Corridas terminadas nas últimas N horas. */
async function corridasRecentes(desde) {
  const corridas = [];
  for (let pagina = 1; pagina <= 5; pagina++) {
    const d = await api(`/repos/${REPO}/actions/runs?per_page=100&page=${pagina}`);
    const lote = d.workflow_runs || [];
    if (!lote.length) break;
    let passouDoLimite = false;
    for (const c of lote) {
      if (new Date(c.created_at).getTime() < desde) { passouDoLimite = true; continue; }
      corridas.push(c);
    }
    if (passouDoLimite) break;
  }
  return corridas;
}

/**
 * As linhas do medidor de uma corrida.
 *
 * ⚠️ Usa o registo do JOB (texto simples), e não o da CORRIDA (que vem num zip).
 * Sem isto era preciso uma biblioteca para descompactar — e o robô que só quer
 * ler texto passaria a ter uma dependência nova.
 */
async function linhasDaCorrida(corridaId) {
  const linhas = [];
  let jobs;
  try {
    jobs = await api(`/repos/${REPO}/actions/runs/${corridaId}/jobs?per_page=50`);
  } catch { return linhas; }
  for (const job of jobs.jobs || []) {
    let texto;
    try {
      texto = await api(`/repos/${REPO}/actions/jobs/${job.id}/logs`, true);
    } catch {
      continue; // registo expirado ou sem permissão — segue
    }
    for (const linha of texto.split('\n')) {
      const i = linha.indexOf(MARCA);
      if (i === -1) continue;
      try { linhas.push(JSON.parse(linha.slice(i + MARCA.length))); } catch { /* linha partida */ }
    }
  }
  return linhas;
}

/** Corre `tarefas` com no máximo `n` ao mesmo tempo. */
async function comLimite(itens, n, tarefa) {
  const saida = [];
  let i = 0;
  const trabalhadores = Array.from({ length: Math.min(n, itens.length) }, async () => {
    while (i < itens.length) {
      const meu = i++;
      try { saida.push(await tarefa(itens[meu])); } catch { /* uma corrida ilegível não estraga o relatório */ }
    }
  });
  await Promise.all(trabalhadores);
  return saida;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Somar
// ─────────────────────────────────────────────────────────────────────────────

/** Soma as linhas por fornecedor+tipo. */
export function somar(linhas) {
  const total = {};
  for (const l of linhas) {
    if (!l || !l.f) continue;
    const chave = `${l.f}|${l.t || '?'}`;
    const a = total[chave] || (total[chave] = {
      fornecedor: l.f, tipo: l.t || '?', chamadas: 0, recusas: 0, entrada: 0, saida: 0, unidades: 0,
    });
    if (l.x) { a.recusas++; continue; }
    a.chamadas++;
    a.entrada += Number(l.ent) || 0;
    a.saida += Number(l.sai) || 0;
    a.unidades += Number(l.un) || 0;
  }
  return Object.values(total).sort((x, y) => y.chamadas - x.chamadas);
}

/**
 * Dinheiro, SÓ quando o preço está preenchido. Devolve null quando não está —
 * e null aparece no relatório como "preço não configurado", nunca como zero.
 * Um zero mentiroso é pior que um espaço em branco.
 */
export function dinheiro(linha, precos) {
  const p = precos && precos[linha.fornecedor];
  if (!p) return null;
  if (Number.isFinite(p.porMilFichas)) {
    return ((linha.entrada + linha.saida) / 1000) * p.porMilFichas;
  }
  if (Number.isFinite(p.porUnidade)) return linha.unidades * p.porUnidade;
  return null;
}

/**
 * O SALTO: quantas vezes o consumo de hoje está acima da média dos dias
 * anteriores. Devolve null quando não há história suficiente para comparar —
 * dois dias não fazem média, e alarme sem base é alarme que se aprende a ignorar.
 */
export function salto(hojeUnidades, historicoDoServico) {
  const anteriores = historicoDoServico.filter((n) => Number.isFinite(n));
  if (anteriores.length < 3) return null;
  const media = anteriores.reduce((a, b) => a + b, 0) / anteriores.length;
  if (media <= 0) return null;
  return hojeUnidades / media;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Relatório
// ─────────────────────────────────────────────────────────────────────────────

function chaveDoDia(d = new Date()) { return d.toISOString().split('T')[0]; }

/** Monta o texto e o HTML. Exportado para o digest das 7h reutilizar. */
export function montarRelatorio(totais, historico, precos) {
  const hoje = chaveDoDia();
  const dias = Object.keys(historico.dias || {}).filter((d) => d !== hoje).sort().slice(-DIAS_DE_MEDIA);

  const linhas = totais.map((t) => {
    const chave = `${t.fornecedor}|${t.tipo}`;
    const anteriores = dias.map((d) => (historico.dias[d] || {})[chave]).filter((n) => Number.isFinite(n));
    const quanto = t.entrada + t.saida > 0 ? t.entrada + t.saida : t.unidades;
    return {
      ...t,
      quanto,
      unidade: t.entrada + t.saida > 0 ? 'fichas' : 'unidades',
      custo: dinheiro(t, precos),
      salto: salto(quanto, anteriores),
    };
  });

  const alarmes = linhas.filter((l) => l.salto !== null && l.salto >= FATOR_DE_ALARME);
  const semPreco = [...new Set(linhas.filter((l) => l.custo === null).map((l) => l.fornecedor))];
  const custoTotal = linhas.reduce((a, l) => a + (l.custo || 0), 0);

  const texto = [];
  texto.push(`💰 Consumo das últimas ${HORAS}h`);
  if (!linhas.length) texto.push('   (nenhuma chamada paga registada)');
  for (const l of linhas) {
    const dinheiroTxt = l.custo === null ? 'preço não configurado' : `US$ ${l.custo.toFixed(4)}`;
    const saltoTxt = l.salto === null ? 'sem base de comparação'
      : l.salto >= FATOR_DE_ALARME ? `⚠️ ${l.salto.toFixed(1)}× a média`
        : `${l.salto.toFixed(1)}× a média`;
    texto.push(`   ${l.fornecedor} (${l.tipo}): ${l.chamadas} chamadas, ${l.quanto} ${l.unidade}${l.recusas ? `, ${l.recusas} recusadas` : ''} — ${dinheiroTxt} — ${saltoTxt}`);
  }
  if (alarmes.length) {
    texto.push('');
    texto.push(`🚨 ${alarmes.length} serviço(s) consumindo muito acima do normal: ${alarmes.map((a) => a.fornecedor).join(', ')}`);
  }
  if (semPreco.length) {
    texto.push('');
    texto.push(`ℹ️ Sem preço configurado: ${semPreco.join(', ')} — preencha .github/data/precos-ia.json para ver em dinheiro.`);
  }

  return { linhas, alarmes, custoTotal, semPreco, texto: texto.join('\n') };
}

/** Guarda o dia no histórico (um só escritor — sem disputa de git). */
function gravarHistorico(historico, totais, rel) {
  const hoje = chaveDoDia();
  historico.dias = historico.dias || {};
  historico.dias[hoje] = {};
  for (const t of totais) {
    historico.dias[hoje][`${t.fornecedor}|${t.tipo}`] = t.entrada + t.saida > 0 ? t.entrada + t.saida : t.unidades;
  }
  // O relatório já montado fica guardado para o digest das 7h o mostrar sem ter
  // de reler os registos todos outra vez (são ~60 corridas por dia).
  // `dia` de propósito: assim o digest sabe se está a ler dados de HOJE ou
  // restos de ontem — e um número velho apresentado como novo é pior que nada.
  historico.relatorio = {
    dia: hoje,
    horas: HORAS,
    geradoEm: new Date().toISOString(),
    linhas: (rel.linhas || []).map((l) => ({
      fornecedor: l.fornecedor, tipo: l.tipo, chamadas: l.chamadas, recusas: l.recusas,
      quanto: l.quanto, unidade: l.unidade, custo: l.custo, salto: l.salto,
    })),
    alarmes: (rel.alarmes || []).map((a) => a.fornecedor),
    custoTotal: rel.custoTotal,
    semPreco: rel.semPreco,
  };
  // 90 dias chegam para ver tendência e mantêm o ficheiro pequeno.
  const chaves = Object.keys(historico.dias).sort();
  for (const c of chaves.slice(0, Math.max(0, chaves.length - 90))) delete historico.dias[c];
  historico.atualizadoEm = new Date().toISOString();
  mkdirSync(dirname(HISTORICO), { recursive: true });
  writeFileSync(HISTORICO, `${JSON.stringify(historico, null, 2)}\n`);
}

async function main() {
  if (!TOKEN) {
    console.log('⚠️ Sem GITHUB_TOKEN — não dá para ler os registos. Nada a fazer.');
    process.exit(0);
  }
  const desde = Date.now() - HORAS * 3600 * 1000;
  console.log(`🔎 A ler as corridas das últimas ${HORAS}h...`);
  const corridas = await corridasRecentes(desde);
  console.log(`   ${corridas.length} corrida(s) a inspecionar.`);

  const lotes = await comLimite(corridas.map((c) => c.id), 6, linhasDaCorrida);
  const linhas = lotes.flat();
  console.log(`   ${linhas.length} linha(s) de medidor encontradas.\n`);

  const totais = somar(linhas);
  const historico = lerJson(HISTORICO, { dias: {} });
  const precos = lerJson(PRECOS, {});
  const rel = montarRelatorio(totais, historico, precos);
  console.log(rel.texto);

  if (GRAVAR) {
    gravarHistorico(historico, totais, rel);
    console.log(`\n📦 Histórico atualizado em ${HISTORICO}`);
  }
  process.exit(0);
}

// Só corre quando é este o ficheiro lançado (o digest importa-o para reutilizar).
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('relatorio-gastos.js')) {
  main().catch((e) => { console.error(`💥 ${e.message}`); process.exit(1); });
}
