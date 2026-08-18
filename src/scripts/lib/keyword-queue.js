/**
 * keyword-queue.js — Fila persistente de keywords (Fase 3 do motor GSC)
 *
 * Fonte única de leitura/escrita de `.github/data/keyword-queue.json`, a fila
 * que alimenta os geradores de conteúdo com keywords vindas de:
 *   - prioridade 1: data/keywords-manuais.csv (curadoria humana)
 *   - prioridade 2: lacunas do GSC (.github/data/gsc-oportunidades.json)
 *   - prioridade 3: expansão via Google Autocomplete
 *
 * Regras de consumo:
 *   - takeKeyword() NÃO marca a entry como usada — o gerador chama markUsed()
 *     só DEPOIS de publicar com sucesso. Se a geração falhar, a keyword
 *     continua pending para o próximo ciclo.
 *   - Toda candidata passa pelo isThemeCovered (seo-guard) antes de ser
 *     entregue; se já coberta, vira status 'skipped' (reason 'ja-coberto').
 *
 * Módulo tolerante a falhas: nenhuma função lança — arquivo ausente/corrompido
 * vira fila vazia com aviso no console (a fila é otimização, nunca pode
 * derrubar um gerador).
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { isThemeCovered, coreTokens, jaccardSim, slugifyTheme } from './seo-guard.js';

export const QUEUE_FILE = join(process.cwd(), '.github', 'data', 'keyword-queue.json');

const GLOSSARIO_DIR = join(process.cwd(), 'src', 'content', 'glossario');

// O isThemeCovered compara só com POSTS. Uma keyword tipo "o que é câmbio"
// geraria um post competindo com /glossario/cambio — checagem por match EXATO
// do núcleo (prefixos/sufixos de pergunta removidos) contra os .md PT do
// glossário. Long-tails ("amortização de financiamento") passam de propósito.
function coveredByGlossario(keyword) {
  try {
    let core = normalizeKeyword(keyword)
      .replace(/^(o que e|o que sao|o que significa|que e|significado de|definicao de)\s+/, '')
      .replace(/\s+(o que e|significado|definicao)$/, '')
      .trim();
    if (!core) return false;
    const slug = core.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return slug && existsSync(join(GLOSSARIO_DIR, `${slug}.md`));
  } catch {
    return false;
  }
}

// ── NOME PRÓPRIO LOCAL ───────────────────────────────────────────────────────
// A keyword da fila é o ASSUNTO do artigo. Se ela nomeia uma EMPRESA ou PROGRAMA
// de um país só, o artigo não serve leitor nenhum fora dele — e é traduzido para
// EN/ES de qualquer forma, porque keyword vinda da fila nasce `scope: universal`
// (gerar-post-inteligente.js, e `scope: "universal"` fixo em gerar-dicas-financeiras
// e gerar-post-orcamento). No glossário é pior: produziria verbetes chamados
// "Saldo Devedor Cohab Mg", que o próprio gerador já classifica como "dívida
// permanente no site". Medido em 30/07/2026: 7 keywords destas estavam pending.
//
// Decisão do dono (30/07/2026): DESCARTAR, não marcar br-only. A intenção de quem
// busca "fatura do cartão <loja>" é achar a loja, não uma app de finanças; e no
// glossário a marcação não conserta um nome quebrado. Se um destes temas
// interessar, entra à mão por `data/keywords-manuais.csv` (que está limpo).
//
// ⚠️ FICAM DE FORA DE PROPÓSITO — falsos positivos MEDIDOS em 30/07:
//   `americanas`     mataria "ações americanas", "bolsas americanas", "etf de ações americanas"
//   `mercado livre`   mataria "o que é mercado livre" e "mercado livre de energia"
//   `b3` `spc` `serasa`  matariam "o que é a b3", "consultar o spc",
//                    "tirar nome do spc e serasa" — temas financeiros legítimos
//   `caixa` sozinha  é palavra comum ("fluxo de caixa"); ver CAIXA_BANCO_RE
//   `inss` `fgts` `receita federal`  a tabela de tradução já os adapta
//                    ("severance guarantee fund", "tax authority")
//   `sardinha`       ⚠️ NÃO ACRESCENTAR. Tem DOIS homónimos: o peixe e, na gíria
//                    de bolsa, o pequeno investidor — que é conceito legítimo.
//                    As keywords que incomodavam ("calculadora/simulador de
//                    investimento sardinha", de um influenciador) foram
//                    dispensadas à mão na fila. Bloquear a palavra mataria o
//                    conceito. Medido 06/08: 0 ocorrências no corpus.
// REGRA PARA ACRESCENTAR: só nome de ≥2 palavras, ou palavra única sem homónimo
// em português. Testar contra o corpus antes — foi assim que os 6 acima caíram.
//
// ── MUDANÇA DE POLÍTICA, 06/08/2026 (decisão do dono) ────────────────────────
// `nubank` estava DE FORA de propósito, com a justificação "já é verbete
// publicado (glossario/nubank.md, scope br-only)". Passa a entrar. O motivo:
// esta lista só é lida na ENTRADA da fila, logo bloquear não mexe em conteúdo já
// publicado — o verbete existente fica. O que estava a acontecer era outra
// coisa: keywords como "como funciona cartao virtual nubank" e "como funciona
// construir limite no nubank" iam gerar páginas NOVAS sobre funcionalidades de
// um banco, o que é diferente de ter um verbete a definir o que é o Nubank.
// Medido antes de mudar: os posts de comparação que citam concorrentes de
// propósito ("Nubank vs Inter", "5 Alternativas ao Mobills") vêm de listas
// curadas DENTRO de gerar-post-comparacao.js e gerar-post-bofu.js e NÃO passam
// por aqui — logo a estratégia de comparação não é afetada.
const LOCAL_BRAND_RE = new RegExp('\\b(' + [
  // bancos, fintechs e financeiras
  'itau', 'bradesco', 'santander', 'banco do brasil', 'bancodobrasil', 'unibanco',
  'caixa economica', 'caixa tem', 'sicoob', 'sicredi', 'banrisul', 'btg pactual',
  'xp investimentos', 'nu invest', 'nubank', 'banco pan', 'banco bmg', 'daycoval',
  'agibank', 'crefisa', 'facta', 'will bank', 'c6 bank', 'c6bank',
  // meios de pagamento
  'picpay', 'pagbank', 'pagseguro', 'mercado pago', 'cielo',
  // retalho e marketplaces
  'casas bahia', 'casasbahia', 'magazine luiza', 'magalu', 'lojas americanas',
  'ponto frio', 'riachuelo', 'renner', 'pernambucanas', 'mercadolivre', 'shopee',
  // 'atacadao': tambem e substantivo comum no Brasil ("ir ao atacadao"), mas nos
  // dois sentidos e vocabulario de um pais so — entra pelo mesmo motivo da lista.
  'atacadao',
  // programas e órgãos sem equivalente universal
  'fies', 'prouni', 'sisu', 'bolsa familia', 'auxilio brasil',
  'minha casa minha vida', 'desenrola brasil', 'pronampe', 'cadastro unico',
  'meu inss', 'cohab', 'sebrae',
  // software de gestão brasileiro
  'conta azul', 'contaazul',
].join('|') + ')\\b', 'i');

// Produto de TERCEIRO que não é brasileiro — logo não cai na lista acima, cuja
// razão de ser é "não universaliza". Aqui a razão é outra: é a app/plataforma de
// outra empresa, e um glossário de finanças não deve ganhar verbetes com o nome
// do produto alheio. Nasceu em 06/08/2026, quando se viu que `webull` e
// `yahoo finance` estavam ESCRITOS À MÃO na rotação A-Z do glossário (letras W e
// Y) e por isso já tinham gerado 3 páginas cada.
//
// NÃO afeta os posts de comparação: "5 Alternativas ao Mobills", "FinMoovi vs
// Mobills" e "Nubank vs Inter" são temas CURADOS dentro de gerar-post-bofu.js e
// gerar-post-comparacao.js, que não leem a fila. Citar concorrente de propósito
// continua a poder; o que deixa de poder é uma página NASCER de um nome alheio.
// Mantida CURTA de propósito: só o que foi pedido e o que estava provado na
// rotação A-Z. Corretora/exchange NÃO entra aqui — vai em CRIPTO_RE abaixo, que
// tem motivo próprio.
const PRODUTO_TERCEIRO_RE = new RegExp('\\b(' + [
  'splitwise', 'webull', 'yahoo finance', 'yahoofinance',
].join('|') + ')\\b', 'i');

// CRIPTO — DECISÃO DO DONO, 06/08/2026, nas palavras dele: "eu nunca jamais vou
// querer fazer nenhum conteúdo sobre cripto ou algo semelhante". Não é uma
// afinação técnica: é política editorial. Mudar isto é mudar o que o site fala.
//
// ⚠️ CUIDADO MEDIDO — o que ficou DE FORA de propósito:
//   `cripto*` como prefixo apanharia `criptografia`, que é tema legítimo de
//     segurança. Por isso a lista nomeia as formas exatas (criptomoeda,
//     criptoativo…) e o `cripto` isolado, e não um prefixo solto.
//   `token`      genérico demais ("token de autenticação", "token de acesso")
//   `mineracao`  também é o setor de minério, tema de mercado legítimo
//   `carteira`   em português é a carteira de investimentos — palavra central
//                do nicho; nunca pode entrar aqui
//   `eter`       "éter" sem acento ≠ "ether"; normalizeKeyword tira o acento,
//                logo `ether` com \b não apanha "éter". Medido.
const CRIPTO_RE = new RegExp('\\b(' + [
  // moedas e temas
  'cripto', 'criptomoeda', 'criptomoedas', 'criptoativo', 'criptoativos',
  'bitcoin', 'btc', 'ethereum', 'ether', 'altcoin', 'altcoins', 'memecoin',
  'dogecoin', 'solana', 'cardano', 'xrp', 'ripple', 'stablecoin',
  'nft', 'nfts', 'blockchain', 'web3', 'defi', 'staking', 'halving', 'satoshi',
  // exchanges e corretoras de cripto/derivados
  'binance', 'coinbase', 'robinhood', 'etoro', 'metatrader', 'trading view',
  'tradingview', 'kraken', 'bybit', 'mercado bitcoin', 'foxbit', 'novadax',
].join('|') + ')\\b', 'i');

// "caixa" sozinha NÃO pode entrar na lista acima: em português é palavra comum
// ("fluxo de caixa" = cash flow, universal, e há uma entry manual curada assim).
// Este padrão apanha só o sentido de BANCO, pelo contexto que a precede. Medido
// em 30/07 nas 6 entries da fila que contêm "caixa": 6/6 correto (2 banco, 4
// conceito). NÃO inclui "conta caixa" — em contabilidade é a conta de caixa.
const CAIXA_BANCO_RE = /\b(?:financiamento|emprestimo|consorcio|saldo devedor|amortizacao|fatura|cartao|habitacao|minha casa)\s+(?:da\s+)?caixa\b/i;

/**
 * Diz POR QUE a keyword não deve virar página, ou null se pode.
 * Devolver o motivo (em vez de só true/false) é o que permite escrever no campo
 * `reason` da fila qual das duas políticas a barrou — dá para auditar depois.
 *
 * @returns {'nome-proprio-local'|'produto-de-terceiro'|'fora-do-nicho-cripto'|null}
 */
export function motivoDeMarca(keyword) {
  // Colapsa separadores para apanhar "casas-bahia", "c6-bank", "fies:", "(sebrae)".
  const n = normalizeKeyword(keyword).replace(/[^a-z0-9]+/g, ' ').trim();
  if (!n) return null;
  if (CRIPTO_RE.test(n)) return 'fora-do-nicho-cripto';
  if (LOCAL_BRAND_RE.test(n) || CAIXA_BANCO_RE.test(n)) return 'nome-proprio-local';
  if (PRODUTO_TERCEIRO_RE.test(n)) return 'produto-de-terceiro';
  return null;
}

/** True se a keyword nomeia marca de terceiro, ou é tema fora do nicho (cripto). */
export function namesLocalBrand(keyword) {
  return motivoDeMarca(keyword) !== null;
}

/** Categorias aceitas nas entries (qualquer outra vira null = "qualquer gerador").
 *  'glossario' = termo para o glossário (consumido por glossario-auto-diario). */
export const VALID_CATEGORIES = new Set(['dicas', 'investimentos', 'orcamento', 'glossario']);

// ── RODÍZIO (round-robin) de fontes ──────────────────────────────────────────
// A cada take BEM-SUCEDIDO a "vez" passa para a próxima fonte (a→b→c→a…). Fonte
// sem entry pending é pulada pela ordenação (a próxima fonte assume) — não trava.
// Peso 1:1:1. Rodízio PONDERADO (futuro): trocar indexOf por um mapa fonte→rank.
export const SOURCE_ROTATION = ['manual', 'gsc-gap', 'autocomplete'];

/** Rank de rodízio de uma fonte dado o cursor (0 = fonte da vez). Fonte fora da
 *  lista (null/'desconhecida') vai para o fim. */
function rotationRank(source, cursor) {
  const i = SOURCE_ROTATION.indexOf(source);
  if (i < 0) return SOURCE_ROTATION.length;
  return (i - cursor + SOURCE_ROTATION.length) % SOURCE_ROTATION.length;
}

/** Normaliza p/ dedup: lowercase, sem acento, espaços colapsados. */
export function normalizeKeyword(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Carrega a fila; arquivo ausente/corrompido → fila vazia (nunca lança). */
export function loadQueue(file = QUEUE_FILE) {
  try {
    if (!existsSync(file)) return { updatedAt: null, sourceCursor: 0, entries: [] };
    const parsed = JSON.parse(readFileSync(file, 'utf-8'));
    if (!parsed || !Array.isArray(parsed.entries)) throw new Error('formato inesperado (entries ausente)');
    return {
      updatedAt: parsed.updatedAt || null,
      // RODÍZIO: cursor da fonte da vez; ausente/corrompido → 0 (retrocompatível).
      sourceCursor: Number.isInteger(parsed.sourceCursor) ? parsed.sourceCursor : 0,
      entries: parsed.entries,
    };
  } catch (e) {
    console.log(`⚠️ keyword-queue: arquivo inválido/ilegível (${e.message}) — usando fila vazia.`);
    return { updatedAt: null, sourceCursor: 0, entries: [] };
  }
}

/** Salva a fila (atualiza updatedAt). Retorna false em falha (nunca lança). */
export function saveQueue(queue, file = QUEUE_FILE) {
  try {
    queue.updatedAt = new Date().toISOString();
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify(queue, null, 2) + '\n');
    return true;
  } catch (e) {
    console.log(`⚠️ keyword-queue: falha ao salvar a fila (${e.message}).`);
    return false;
  }
}

/** Tokens de núcleo de uma keyword (mesma semântica do seo-guard: slugify + STOPWORDS). */
function keywordCoreTokens(keyword) {
  return coreTokens(slugifyTheme(keyword));
}

// REGRA (dedup por semelhança): keywords CURTAS (1-2 tokens de núcleo) passam
// SÓ pelo dedup exato — senão "cdb" mataria "cdb ou tesouro" e vice-versa
// (Jaccard entre conjuntos pequenos dispara fácil). A checagem de semelhança
// só roda quando a keyword NOVA tem ≥ 3 tokens de núcleo.
const SIMILARITY_MIN_TOKENS = 3;

/**
 * Quase-duplicata = mesma semântica do seo-guard/validador: ≥ 3 tokens de
 * núcleo em comum OU Jaccard ≥ 0.7 entre os conjuntos de tokens.
 * `cand` é o Set de tokens da keyword nova; `existingSets` são os Sets das
 * entries já na fila (QUALQUER status — used/skipped não voltam para a fila,
 * e uma quase-duplicata delas também não deve voltar).
 */
function isNearDuplicate(cand, existingSets) {
  if (cand.size < SIMILARITY_MIN_TOKENS) return false; // curtas: só dedup exato
  for (const other of existingSets) {
    const shared = [...cand].filter(x => other.has(x)).length;
    if (shared >= 3 || jaccardSim(cand, other) >= 0.7) return true;
  }
  return false;
}

/**
 * Adiciona entries com dedup por keyword normalizada contra TODAS as entries
 * existentes (qualquer status — used/skipped não voltam para a fila) e dedup
 * por SEMELHANÇA (quase-duplicatas, semântica do seo-guard — ver
 * isNearDuplicate/SIMILARITY_MIN_TOKENS acima).
 * item = { keyword, category?, priority, source }
 * Retorna { added, duplicates, similar }.
 */
export function addEntries(list, file = QUEUE_FILE) {
  const queue = loadQueue(file);
  const known = new Set(queue.entries.map(e => normalizeKeyword(e.keyword)));
  const knownTokens = queue.entries.map(e => keywordCoreTokens(e.keyword));
  let added = 0;
  let duplicates = 0;
  let similar = 0;
  for (const item of list || []) {
    const keyword = String(item?.keyword || '').replace(/\s+/g, ' ').trim();
    const norm = normalizeKeyword(keyword);
    if (!norm) continue;
    if (known.has(norm)) { duplicates++; continue; }
    const cand = keywordCoreTokens(keyword);
    if (isNearDuplicate(cand, knownTokens)) { similar++; continue; }
    known.add(norm);
    knownTokens.push(cand);
    // Gancho editorial "No FinMoovi" (opcional): viaja na entry e é devolvido
    // por takeKeyword ({...chosen}) para o gerador injetar no prompt. NÃO
    // participa da chave de dedup (essa continua sendo só a keyword normalizada).
    const finmooviHook = String(item?.finmooviHook || '').replace(/\s+/g, ' ').trim();
    const entry = {
      keyword,
      category: VALID_CATEGORIES.has(item.category) ? item.category : null,
      priority: [1, 2, 3].includes(item.priority) ? item.priority : 3,
      source: item.source || 'desconhecida',
      status: 'pending',
      addedAt: new Date().toISOString(),
    };
    if (finmooviHook) entry.finmooviHook = finmooviHook;
    queue.entries.push(entry);
    added++;
  }
  if (added > 0) saveQueue(queue, file);
  return { added, duplicates, similar };
}

/**
 * Entrega a próxima keyword pending elegível para as categorias dadas
 * (category da entry ∈ categories OU null), ordenando por priority asc e
 * addedAt asc. Cada candidata passa por 3 filtros e, se reprovar, vira 'skipped'
 * com o motivo, seguindo para a próxima:
 *   'nome-proprio-local' — nomeia empresa/programa de um país só (namesLocalBrand)
 *   'ja-coberto'         — tema já coberto por post publicado (isThemeCovered)
 *   'coberto-glossario'  — já existe verbete com esse núcleo
 *
 * `exactCategory: true` exige match EXATO de categoria (entries com category
 * null ficam de fora) — usado pelo glossário diário para NÃO drenar keywords
 * genéricas destinadas aos geradores de post.
 *
 * NÃO marca a escolhida como used — isso é responsabilidade do gerador via
 * markUsed() após publicar com sucesso. Retorna a entry (cópia) ou null.
 */
export function takeKeyword({ categories = [], exactCategory = false } = {}, file = QUEUE_FILE) {
  try {
    const queue = loadQueue(file);
    const cats = new Set(categories);
    const cursor = Number.isInteger(queue.sourceCursor) ? queue.sourceCursor : 0;
    const candidates = queue.entries
      .filter(e => e.status === 'pending' && (cats.has(e.category) || (!exactCategory && e.category == null)))
      // RODÍZIO: ordena pela fonte da vez (round-robin) e, dentro da fonte, por
      // antiguidade. Substitui a antiga prioridade fixa (a.priority - b.priority).
      .sort((a, b) =>
        (rotationRank(a.source, cursor) - rotationRank(b.source, cursor)) ||
        String(a.addedAt).localeCompare(String(b.addedAt)));

    let dirty = false;
    let chosen = null;
    for (const entry of candidates) {
      // Antes do isThemeCovered de propósito: não lê o disco e o descarte vale
      // independentemente de o tema estar coberto ou não.
      const motivoMarca = motivoDeMarca(entry.keyword);
      if (motivoMarca) {
        entry.status = 'skipped';
        entry.reason = motivoMarca;
        dirty = true;
        const porque = motivoMarca === 'nome-proprio-local'
          ? 'nomeia empresa/programa de um país só (não universaliza)'
          : motivoMarca === 'fora-do-nicho-cripto'
            ? 'é tema de cripto (fora do nicho, por decisão do dono)'
            : 'nomeia app/plataforma de terceiro (não vira verbete nosso)';
        console.log(`ℹ️ keyword-queue: "${entry.keyword}" ${porque} — marcada como skipped.`);
        continue;
      }
      const canibal = isThemeCovered(entry.keyword);
      if (canibal.covered) {
        entry.status = 'skipped';
        entry.reason = 'ja-coberto';
        dirty = true;
        console.log(`ℹ️ keyword-queue: "${entry.keyword}" já coberta por "${canibal.conflictSlug}" — marcada como skipped.`);
        continue;
      }
      if (coveredByGlossario(entry.keyword)) {
        entry.status = 'skipped';
        entry.reason = 'coberto-glossario';
        dirty = true;
        console.log(`ℹ️ keyword-queue: "${entry.keyword}" já coberta por termo do glossário — marcada como skipped.`);
        continue;
      }
      chosen = entry;
      break;
    }
    // RODÍZIO: avança a "vez" SÓ quando consumiu de fato — a fonte usada vai para
    // o fim, a próxima da lista lidera o próximo ciclo. Ciclo vazio não queima
    // rotação (cursor intacto).
    if (chosen) {
      const usedIdx = SOURCE_ROTATION.indexOf(chosen.source);
      queue.sourceCursor = usedIdx < 0 ? 0 : (usedIdx + 1) % SOURCE_ROTATION.length;
      dirty = true;
    }
    if (dirty) saveQueue(queue, file);
    return chosen ? { ...chosen } : null;
  } catch (e) {
    console.log(`⚠️ keyword-queue: takeKeyword falhou (${e.message}) — seguindo fluxo normal do pool.`);
    return null;
  }
}

/**
 * Marca a keyword como usada (chamar SÓ após salvar+traduzir com sucesso).
 * Retorna true se marcou e salvou; false caso contrário (nunca lança).
 */
export function markUsed(keyword, usedBy, file = QUEUE_FILE) {
  try {
    const queue = loadQueue(file);
    const norm = normalizeKeyword(keyword);
    const entry = queue.entries.find(e => e.status === 'pending' && normalizeKeyword(e.keyword) === norm);
    if (!entry) {
      console.log(`⚠️ keyword-queue: "${keyword}" não encontrada como pending para marcar como used.`);
      return false;
    }
    entry.status = 'used';
    entry.usedAt = new Date().toISOString();
    entry.usedBy = usedBy || '';
    return saveQueue(queue, file);
  } catch (e) {
    console.log(`⚠️ keyword-queue: markUsed falhou (${e.message}).`);
    return false;
  }
}

/**
 * Marca a keyword como DESCARTADA — para o gerador chamar quando a recusa é
 * permanente (o próximo dia daria exactamente o mesmo resultado).
 *
 * Por que existe (18/08/2026): quando um gerador recusa uma keyword e a corrida
 * morre, ela fica `pending` e é escolhida OUTRA VEZ no dia seguinte. Foi assim
 * que "fatura do cartão" derrubou o Glossário Diário dois dias seguidos: a
 * tradução dela dava o mesmo ficheiro EN/ES de "fatura do cartão mais", já
 * publicado. Sem marcar, o robô repete o mesmo erro todos os dias, para sempre.
 *
 * Diferente de markUsed: aqui NADA foi publicado. Retorna true se marcou e
 * salvou; false caso contrário (nunca lança).
 */
export function markSkipped(keyword, reason, file = QUEUE_FILE) {
  try {
    const queue = loadQueue(file);
    const norm = normalizeKeyword(keyword);
    const entry = queue.entries.find(e => e.status === 'pending' && normalizeKeyword(e.keyword) === norm);
    if (!entry) {
      console.log(`⚠️ keyword-queue: "${keyword}" não encontrada como pending para descartar.`);
      return false;
    }
    entry.status = 'skipped';
    entry.reason = reason || 'recusada-pelo-gerador';
    entry.skippedAt = new Date().toISOString();
    console.log(`ℹ️ keyword-queue: "${keyword}" descartada (${entry.reason}) — não volta a ser escolhida.`);
    return saveQueue(queue, file);
  } catch (e) {
    console.log(`⚠️ keyword-queue: markSkipped falhou (${e.message}).`);
    return false;
  }
}
