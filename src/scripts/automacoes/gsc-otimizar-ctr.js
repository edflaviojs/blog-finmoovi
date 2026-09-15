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

  for (const cand of candidates) {
    if (done >= MAX_PER_RUN) { skipped++; continue; }
    const file = pageUrlToFile(cand.keys[0]);
    if (!file) { console.log(`   ⏭️ sem arquivo p/ ${cand.keys[0]}`); skipped++; continue; }

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
        `REGRAS: mantenha o MESMO tema/assunto (não invente novo); título com 50–60 caracteres, keyword no início, atraente e honesto (sem clickbait falso, sem inventar números/estatísticas); meta com 150–160 caracteres, clara e com chamada para ação suave. Não use aspas.\n` +
        // Medido em 15/09/2026 nas 151 descrições em português: 60 começam com
        // "Descubra", 22 com "Aprenda a" — 54% abrem com um verbo que não promete
        // nada — e 107 de 151 não têm um único número. Na posição 8 compete-se com
        // sete resultados acima, e quem não diz nada concreto não ganha o clique.
        // ⚠️ Isto NÃO é licença para inventar: a regra acima continua a valer, e em
        // 15/09 este blog publicou uma Selic falsa por ter pedido comentário sem dar
        // o dado. O número tem de estar NO ARTIGO.
        `PROIBIDO abrir a meta com "Descubra", "Aprenda", "Saiba" ou "Entenda" — são aberturas vazias e já estão em metade do blog. A meta tem de dizer o que o leitor leva dali: a coisa concreta que o artigo entrega (quantos passos, qual a conta, o que muda). Se o artigo tiver um número, use ESSE número; se não tiver, não invente nenhum.\n\n` +
        `Formato EXATO:\n---TITULO---\n[título]\n---META---\n[meta]`,
        { maxTokens: 400, temperature: 0.7 },
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

    const today = new Date().toISOString().split('T')[0];
    const { changed } = writePatched(file, split, {
      title: vt.value, description: vd.value, seoTitle: vt.value, seoDescription: vd.value, updatedAt: today,
    });
    if (!changed) { console.log(`   ⏭️ ${file}: sem mudança efetiva`); skipped++; continue; }

    console.log(`   ✏️ ${file}: "${oldTitle}" → "${vt.value}"${DRY_RUN ? ' [dry-run]' : ''}`);
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
  commitFiles(editedFiles, `seo(gsc): otimizar title/meta por CTR em ${done} página(s) [bot]`);
  console.log(`✅ CTR: ${done} otimizada(s), ${skipped} pulada(s).`);
}

main().catch(err => { console.error('❌ CTR:', err.message); process.exit(1); });
