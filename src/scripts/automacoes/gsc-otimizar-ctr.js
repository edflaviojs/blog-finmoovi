/**
 * gsc-otimizar-ctr.js — FASE 2 #1: reescritor de título/meta por CTR baixo.
 *
 * Páginas com BOA posição (≤10) mas CTR muito abaixo do esperado → a IA reescreve
 * SOMENTE title/description/seo.* no frontmatter (nunca o corpo). Full-auto, mas
 * com travas: comprimento de title (20–65) e meta (80–165), tema preservado
 * (≥1 token do título original), rollback se o gate i18n falhar, e cap por run.
 *
 * SKIP GRACIOSO: sem GSC → exit 0; sem provedor de IA → exit 0. GSC_DRY_RUN=1
 * mostra o que faria sem escrever/commitar.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import {
  hasGscCredentials, querySearchAnalytics, GSC_SITE_URL, dateRange,
  pageUrlToFile, readRaw, getScalar, writePatched, splitPeriods,
  validateTitle, validateDescription, sanitizeLine,
  i18nGatePasses, revertFiles, commitFiles, DRY_RUN,
} from '../lib/gsc-posts.js';
import { splitFrontmatter } from '../lib/i18n-sync.js';
import { generateText } from '../apis/kie-ai.js';

const IMP_MIN = 10;         // impressões mínimas p/ a página valer otimização
const GOOD_POS_MAX = 10;    // "boa posição"
const CTR_RATIO_FLAG = 0.6; // CTR abaixo de 60% do esperado = candidata
const MAX_PER_RUN = 5;      // cap de páginas otimizadas por execução

/**
 * Aberturas de meta descrição que não prometem nada.
 *
 * Medido em 15/09/2026 nas 151 descrições em português do blog: 60 começam com
 * "Descubra" e 22 com "Aprenda a" — **82, mais de metade**. E 107 de 151 não têm
 * um único número. Na posição 8 compete-se com sete resultados acima; quem não diz
 * nada concreto não ganha o clique, e o blog teve **3.262 impressões e ZERO
 * cliques** em 28 dias.
 *
 * Vale para os três idiomas porque o robô também reescreve `en` e `es`.
 */
const ABERTURA_VAZIA = /^\s*(descubr|aprend|saib|entend|conhe[çc]|veja como|discover|learn how|find out|understand|conoce|aprende|descubre)/i;

const LANG = { pt: 'português do Brasil', en: 'inglês', es: 'espanhol' };

// ── QUARENTENA: não reescrever o que ainda não teve tempo de provar ───────────
//
// O robô corre toda terça e reescrevia a mesma página semana após semana. Medido
// no histórico: `como-economizar-no-supermercado` foi reescrita em **08/09 E
// 15/09** — sete dias de intervalo. Um título novo precisa de 2 a 3 semanas para
// o Search Console mostrar se o CTR mudou. Reescrever antes disso apaga a
// experiência antes de ela dar resposta, e o blog fica preso a mudar de nome sem
// nunca saber qual nome funcionou.
//
// 21 dias porque é o topo da janela de medição. Antes disso não há o que ler.
const QUARENTENA_DIAS = 21;
const REGISTO = join(process.cwd(), '.github', 'data', 'ctr-otimizadas.json');

function lerRegisto() {
  if (!existsSync(REGISTO)) return {};
  try { return JSON.parse(readFileSync(REGISTO, 'utf-8')); } catch { return {}; }
}

function gravarRegisto(reg) {
  if (!existsSync(dirname(REGISTO))) mkdirSync(dirname(REGISTO), { recursive: true });
  writeFileSync(REGISTO, JSON.stringify(reg, null, 2) + '\n');
}

/** Dias desde a última reescrita, ou null se nunca foi reescrita. */
function diasDesde(reg, file, hoje) {
  const quando = reg[file];
  if (!quando) return null;
  const t = Date.parse(quando);
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.parse(hoje) - t) / 86400000);
}

function expectedCtr(position) {
  const p = Math.round(position);
  const curve = { 1: 0.28, 2: 0.15, 3: 0.11, 4: 0.08, 5: 0.06, 6: 0.05, 7: 0.04, 8: 0.032, 9: 0.028, 10: 0.025 };
  if (p <= 0) return curve[1];
  return p <= 10 ? curve[p] : 0.02;
}

async function topQueryForPage(period, pageUrl) {
  const rows = await querySearchAnalytics({
    ...period, dimensions: ['query'], rowLimit: 1,
    filters: [{ filters: [{ dimension: 'page', operator: 'equals', expression: pageUrl }] }],
  });
  return rows[0]?.keys?.[0] || null;
}

function parseRewrite(text) {
  const t = text.match(/---TITULO---\s*([\s\S]*?)(?=---META---|$)/);
  const m = text.match(/---META---\s*([\s\S]*?)$/);
  return { title: t ? sanitizeLine(t[1]) : '', meta: m ? sanitizeLine(m[1]) : '' };
}

async function main() {
  if (!hasGscCredentials()) {
    console.log('ℹ️ GSC: sem credenciais. Pulando otimização de CTR (exit 0).');
    return;
  }
  const period = dateRange(28);
  console.log(`🔎 CTR: analisando ${GSC_SITE_URL} (${period.startDate} → ${period.endDate})...`);

  const rows = await querySearchAnalytics({ ...period, dimensions: ['page'], rowLimit: 5000 });
  if (!rows.length) { console.log('   Sem impressões ainda (GSC magro). Nada a fazer (exit 0).'); return; }

  // ── DUAS RÉGUAS PARA A MESMA COISA — o defeito consertado em 15/09/2026 ──────
  //
  // Até aqui a elegibilidade era decidida SÓ pela média da PÁGINA (`position <=
  // GOOD_POS_MAX`). Mas uma página tem dezenas de buscas, e as ruins puxam a média
  // para baixo. Resultado medido no relatório de oportunidades do próprio repo:
  //
  //     "como reduzir gastos mensais" — 1.161 impressões, POSIÇÃO 8, ZERO cliques
  //
  // Essa busca sozinha era **36% de todas as impressões do blog** (3.262 em 28
  // dias, 0 cliques no total). E a página que a serve NUNCA foi candidata, porque
  // a média dela nunca chegou a 10. **A maior oportunidade do blog era invisível
  // para a ferramenta construída para a consertar.**
  //
  // É a família de defeito nº1 desta casa: o relatório de oportunidades mede por
  // BUSCA e o otimizador media por PÁGINA. Mesma pergunta, réguas diferentes — e a
  // diferença só aparece em produção.
  //
  // A regra passa a ser a UNIÃO: entra quem qualifica pela média da página (o que
  // já entrava, ninguém perde) OU quem tem PELO MENOS UMA busca em boa posição com
  // CTR muito abaixo do esperado.
  const pares = await querySearchAnalytics({ ...period, dimensions: ['page', 'query'], rowLimit: 25000 });

  /** page → a melhor busca-oportunidade dessa página (a de mais impressões). */
  const oportunidadePorPagina = new Map();
  for (const r of pares) {
    const [page, query] = r.keys;
    if (r.impressions < IMP_MIN) continue;
    if (r.position > GOOD_POS_MAX) continue;
    if (r.ctr >= expectedCtr(r.position) * CTR_RATIO_FLAG) continue;
    const atual = oportunidadePorPagina.get(page);
    if (!atual || r.impressions > atual.impressions) {
      oportunidadePorPagina.set(page, { query, impressions: r.impressions, position: r.position });
    }
  }

  const candidates = rows
    .map(r => {
      const page = r.keys[0];
      const porBusca = oportunidadePorPagina.get(page) || null;
      const porPagina = r.impressions >= IMP_MIN
        && r.position <= GOOD_POS_MAX
        && r.ctr < expectedCtr(r.position) * CTR_RATIO_FLAG;
      // Ordena pelo tamanho da oportunidade, que é o das impressões da BUSCA
      // quando ela existe — é ela que justifica o trabalho, não o total da página.
      return { ...r, porBusca, elegivel: porPagina || Boolean(porBusca), peso: porBusca ? porBusca.impressions : r.impressions };
    })
    .filter(c => c.elegivel)
    .sort((a, b) => b.peso - a.peso);

  const porBuscaSo = candidates.filter(c => c.porBusca && !(c.impressions >= IMP_MIN && c.position <= GOOD_POS_MAX)).length;
  console.log(`   ${candidates.length} página(s) com CTR baixo (${porBuscaSo} só visíveis pela régua nova). Cap: ${MAX_PER_RUN}.`);

  const editedFiles = [];   // caminhos relativos p/ commit
  const editedNames = [];   // filenames p/ rollback
  let done = 0, skipped = 0;
  const hoje = new Date().toISOString().split('T')[0];
  const registo = lerRegisto();

  for (const cand of candidates) {
    if (done >= MAX_PER_RUN) { skipped++; continue; }
    const file = pageUrlToFile(cand.keys[0]);
    if (!file) { console.log(`   ⏭️ sem arquivo p/ ${cand.keys[0]}`); skipped++; continue; }

    const dias = diasDesde(registo, file, hoje);
    if (dias !== null && dias < QUARENTENA_DIAS) {
      console.log(`   ⏭️ ${file}: em quarentena — reescrita há ${dias} dia(s), faltam ${QUARENTENA_DIAS - dias} para se poder medir`);
      skipped++; continue;
    }

    const raw = readRaw(file);
    const split = splitFrontmatter(raw);
    if (!split) { skipped++; continue; }
    const locale = file.startsWith('en-') ? 'en' : file.startsWith('es-') ? 'es' : 'pt';
    const oldTitle = getScalar(split.fm, 'title') || '';
    // A busca que JUSTIFICA a reescrita é a da oportunidade — a que está em boa
    // posição e não recebe clique. Só quando não há oportunidade identificada é
    // que se vai buscar a de mais impressões (e aí custa um pedido extra à API).
    const query = cand.porBusca?.query || (await topQueryForPage(period, cand.keys[0])) || oldTitle;

    let ai;
    try {
      ai = await generateText(
        `Você é editor de SEO. Reescreva o TÍTULO e a META DESCRIÇÃO de um artigo para AUMENTAR o CTR na busca do Google, em ${LANG[locale]}.\n` +
        `Busca principal que traz esta página: "${query}"\nTítulo atual: "${oldTitle}"\n\n` +
        // A meta pedida é 140–155 e não 150–160, porque a trava recusa acima de
        // 165 e o modelo passa do que lhe pedem. Medido em 15/09/2026 numa das
        // seis corridas do diagnóstico: pediu-se 150–160 e veio 167 — título
        // impecável, meta recusada, página inteira perdida por 2 caracteres.
        // Pedir um pouco menos deixa folga para o modelo transbordar dentro da
        // trava, em vez de fora dela.
        `REGRAS: mantenha o MESMO tema/assunto (não invente novo); título com 50–60 caracteres, keyword no início, atraente e honesto (sem clickbait falso, sem inventar números/estatísticas); meta com 140–155 caracteres, clara e com chamada para ação suave. Não use aspas.\n` +
        // Medido em 15/09/2026 nas 151 descrições em português: 60 começam com
        // "Descubra", 22 com "Aprenda a" — 54% abrem com um verbo que não promete
        // nada — e 107 de 151 não têm um único número. Na posição 8 compete-se com
        // sete resultados acima, e quem não diz nada concreto não ganha o clique.
        // ⚠️ Isto NÃO é licença para inventar: a regra acima continua a valer, e em
        // 15/09 este blog publicou uma Selic falsa por ter pedido comentário sem dar
        // o dado. O número tem de estar NO ARTIGO.
        `PROIBIDO abrir a meta com "Descubra", "Aprenda", "Saiba" ou "Entenda" — são aberturas vazias e já estão em metade do blog. A meta tem de dizer o que o leitor leva dali: a coisa concreta que o artigo entrega (quantos passos, qual a conta, o que muda). Se o artigo tiver um número, use ESSE número; se não tiver, não invente nenhum.\n\n` +
        `Formato EXATO:\n---TITULO---\n[título]\n---META---\n[meta]`,
        // ── 400 FICHAS ERA A CAUSA DE "resposta vazia" ────────────────────────
        //
        // Medido em 15/09/2026 (workflow `diagnostico-provedores-texto`, com ESTE
        // prompt palavra por palavra). A Cerebras e o Groq correm `gpt-oss-120b`,
        // que raciocina antes de escrever — e o raciocínio come do mesmo
        // `max_tokens`:
        //
        //   400 fichas, sem corte ...... 397 gastas a pensar → content VAZIO
        //   400 + reasoning_effort:low . 1 em 3 entregou (o resto, vazio)
        //   1000 + reasoning_effort:low  2 em 3 passaram TODAS as travas do robô
        //
        // O controle que prova que não era a chave nem a conta: a mesma chave, as
        // mesmas 400 fichas, com a pergunta "responda: funcionando" → respondeu
        // em 11 caracteres, nos dois provedores. Nunca foi credencial.
        //
        // 1500 e não 1000: o 1000 chegou com pouca margem e há variação real de
        // corrida para corrida (o mesmo pedido gastou 308, 402, 416 e 912 fichas
        // a raciocinar). Fichas não gastas não se pagam — o teto não é despesa.
        { maxTokens: 1500, temperature: 0.7, esforcoRaciocinio: 'low' },
      );
    } catch (e) {
      if (/Nenhum provedor/.test(e.message)) { console.log('ℹ️ Sem provedor de IA. Encerrando (exit 0).'); break; }
      console.log(`   ⚠️ IA falhou p/ ${file}: ${e.message}`); skipped++; continue;
    }

    const { title, meta } = parseRewrite(ai);
    const vt = validateTitle(title, oldTitle);
    const vd = validateDescription(meta);
    if (!vt.ok) { console.log(`   ⏭️ ${file}: título rejeitado (${vt.reason})`); skipped++; continue; }
    if (!vd.ok) { console.log(`   ⏭️ ${file}: meta rejeitada (${vd.reason})`); skipped++; continue; }
    // A trava que corresponde à regra escrita no prompt acima. Prompt sem
    // validador é meia trava: o modelo recai no molde que já viu 82 vezes no
    // blog. Barrar aqui não abre buraco de conteúdo — a página continua
    // candidata na corrida da semana seguinte.
    if (ABERTURA_VAZIA.test(meta)) {
      console.log(`   ⏭️ ${file}: meta rejeitada (abre com verbo vazio — "${meta.split(' ')[0]}")`);
      skipped++; continue;
    }

    const { changed } = writePatched(file, split, {
      title: vt.value, description: vd.value, seoTitle: vt.value, seoDescription: vd.value, updatedAt: hoje,
    });
    if (!changed) { console.log(`   ⏭️ ${file}: sem mudança efetiva`); skipped++; continue; }

    console.log(`   ✏️ ${file}: "${oldTitle}" → "${vt.value}"${DRY_RUN ? ' [dry-run]' : ''}`);
    // A data entra no registo SÓ depois de a escrita ter acontecido. Marcar antes
    // poria em quarentena páginas que a IA recusou — e essas têm de voltar na
    // semana seguinte.
    registo[file] = hoje;
    editedFiles.push(`src/content/posts/${file}`);
    editedNames.push(file);
    done++;
  }

  if (!editedFiles.length) { console.log('   Nenhuma otimização aplicada.'); return; }

  if (!DRY_RUN && !i18nGatePasses()) {
    console.log('   ❌ Gate i18n falhou — revertendo todas as edições.');
    revertFiles(editedNames);
    return;
  }
  // O registo vai no MESMO commit das páginas. Se ficasse de fora, a quarentena
  // esquecia-se ao fim de cada corrida e o robô voltava a reescrever por cima —
  // que é exatamente o defeito que ela existe para travar.
  if (!DRY_RUN) {
    gravarRegisto(registo);
    editedFiles.push('.github/data/ctr-otimizadas.json');
  }
  commitFiles(editedFiles, `seo(gsc): otimizar title/meta por CTR em ${done} página(s) [bot]`);
  console.log(`✅ CTR: ${done} otimizada(s), ${skipped} pulada(s).`);
}

main().catch(err => { console.error('❌ CTR:', err.message); process.exit(1); });
