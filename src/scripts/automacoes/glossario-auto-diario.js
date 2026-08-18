import { config } from '../../../site.config.ts';
/**
 * Gerador Automático de Glossário por Letra
 * Executa diariamente via GitHub Actions
 * Gera termos de A-Z, um por dia, com imagens e tradução automática
 */

import { generateGlossaryTerm } from './glossario-com-imagens.js';
import { takeKeyword, markUsed, markSkipped, QUEUE_FILE, motivoDeMarca } from '../lib/keyword-queue.js';
import { glossaryTermFromKeyword, keywordLooksLikeConcept } from '../lib/termo-guard.js';
import { writeFileSync, readFileSync, mkdirSync, existsSync, unlinkSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const GLOSSARIO_DIR = join(process.cwd(), 'src', 'content', 'glossario');
const POSTS_DIR = join(process.cwd(), 'src', 'content', 'posts');

// Letras do abecedário
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// Termos populares por categoria (para os primeiros termos)
const POPULAR_TERMS = {
  A: ['ações', 'aplicação financeira', 'ativo financeiro', 'alavancagem', 'inflação'],
  // 'bitcoin' saiu em 06/08/2026: cripto está fora do nicho por decisão do dono.
  // O verbete glossario/bitcoin.md (x3 idiomas) continua publicado — retirá-lo é
  // decisão a parte, e não há destino equivalente para redirecionar.
  B: ['bolsa de valores', 'dividendos', 'bônus salarial', 'balança comercial'],
  C: ['cdb', 'crédito', 'capital de giro', 'custo de oportunidade', 'câmbio'],
  D: ['diversificação', 'dívida', 'derivativos', 'despesa', 'depreciação'],
  E: ['etf', 'empréstimo', 'economia', 'exportação', 'equity'],
  F: ['fgts', 'finanças', 'fundo de investimento', 'futuros', 'fluxo de caixa'],
  G: ['governança corporativa', 'giro', 'garantia', 'gráfico', 'gestão'],
  H: ['hedge', 'hipoteca', 'holding', 'high yield', 'home broker'],
  I: ['imposto de renda', 'inflação', 'investimento', 'ibovespa', 'imobilizado'],
  J: ['juros', 'juros compostos', 'juros simples', 'juros abusivos', 'juro real'],
  K: ['kyc', 'know your customer', 'key performance indicator', 'kill switch', 'keynesianismo'],
  L: ['lc', 'lca', 'liquidez', 'long', 'leilão'],
  M: ['moeda', 'mercado financeiro', 'margem de garantia', 'mercado de capitais', 'montante'],
  N: ['negociação', 'nota promissória', 'nfp', 'nyse', 'nasdaq'],
  O: ['opção financeira', 'obrigação', 'open interest', 'offshore', 'otc'],
  P: ['poupança', 'pix', 'patrimônio', 'plano de saúde', 'previdência'],
  Q: ['qualidade de ativos', 'quota de consórcio', 'quociente de liquidez', 'quick ratio', 'quantitative easing'],
  R: ['renda fixa', 'renda variável', 'risco financeiro', 'reserva de valor', 'robo advisor'],
  S: ['selic', 'stop loss', 'swaps', 'spread', 'sustentabilidade'],
  T: ['tesouro direto', 'taxa financeira', 'trading', 'trust', 'ticker'],
  U: ['usura', 'unit', 'underlying', 'uptick', 'utilidade marginal'],
  V: ['valor financeiro', 'volatilidade', 'venda a descoberto', 'varejo', 'valuation'],
  // LIMPEZA 06/08/2026 — as letras difíceis estavam preenchidas com o que
  // apareceu, e a rotação A-Z não tinha filtro: daí saíram verbetes publicados
  // sobre `xepa financeira` (sobras de feira), `xing ling` (bugiganga), `webull`
  // e `yahoo finance` (apps de terceiros), e `nubank` (banco). Preferimos MENOS
  // termos e verdadeiros a cinco por letra: W tem 4 e X tem 2, e está certo
  // assim — não há cinco conceitos financeiros com X em português.
  // Ao acrescentar aqui: o termo tem de passar por motivoDeMarca() e
  // keywordLooksLikeConcept(), como a fila. tests/termo-guard.test.js prova.
  W: ['wall street', 'warrant', 'whale', 'withdrawal'],
  // 'xrp' saiu em 06/08/2026 — e era o PRÓXIMO a nascer, porque a limpeza da
  // véspera deixou-o em primeiro. X fica com um termo só, e está certo assim.
  X: ['xetra'],
  Y: ['yield', 'yuan', 'yield curve', 'young investor'],
  Z: ['zero coupon', 'z-score', 'zeragem de posição', 'zona do euro', 'zona franca']
};

// Letra atual (persistente entre execuções)
let currentLetter = 'A';

function getCurrentLetter() {
  try {
    const letterFile = join(process.cwd(), '.current-letter');
    if (existsSync(letterFile)) {
      const content = readFileSync(letterFile, 'utf-8');
      return content.trim().toUpperCase();
    }
  } catch (error) {
    // Se não conseguir ler, começa do A
  }
  return 'A';
}

function saveCurrentLetter(letter) {
  try {
    const letterFile = join(process.cwd(), '.current-letter');
    writeFileSync(letterFile, letter.toUpperCase(), 'utf-8');
  } catch (error) {
    console.warn('Não consegui salvar letra atual:', error.message);
  }
}

// glossaryTermFromKeyword e keywordLooksLikeConcept vivem agora em
// ../lib/termo-guard.js (ver o import no topo). Mudaram-se para lá em 06/08/2026
// para terem prova automática em tests/termo-guard.test.js: este ficheiro chama
// `main()` na última linha, logo importá-lo num teste correria o gerador todo.

const slugify = (t) => sanitizeFilename(String(t).toLowerCase().replace(/\s+/g, '-'));

/** A translationKey de um verbete, tal como este gerador a escreve. */
const chaveDoTermo = (termo) => `glossario-${sanitizeFilename(String(termo).toLowerCase())}`;

/**
 * De quem é este ficheiro do glossário? Devolve a translationKey lá escrita,
 * '' se o ficheiro existir sem chave, e null se o ficheiro NÃO existir.
 */
function donoDoFicheiro(filename) {
  const caminho = join(GLOSSARIO_DIR, filename);
  if (!existsSync(caminho)) return null;
  try {
    const m = readFileSync(caminho, 'utf-8').match(/^translationKey:[ \t]*(.*)$/m);
    return m ? m[1].trim().replace(/^"|"$/g, '') : '';
  } catch {
    return ''; // ilegível conta como ocupado — na dúvida não se escreve por cima
  }
}

/**
 * Os ficheiros desta lista que já pertencem a OUTRO verbete, ou que se repetem
 * dentro da própria lista. Lista vazia = pode gravar.
 *
 * É a trava que faltava em 18/08/2026: o nome do ficheiro EN/ES sai do termo
 * TRADUZIDO, e dois termos portugueses diferentes podem dar o mesmo nome lá
 * fora ("fatura do cartão" e "fatura do cartão mais" dão ambos
 * `en-credit-card-statement.md`).
 *
 * @param {{filename:string}[]} pendentes ficheiros que a corrida quer gravar
 * @param {string} chave translationKey do verbete a publicar
 * @param {(f:string)=>string|null} dono leitor do dono (injetável para teste)
 */
function colisoesDe(pendentes, chave, dono = donoDoFicheiro) {
  const fora = pendentes
    .map(f => ({ nome: f.filename, dono: dono(f.filename) }))
    .filter(x => x.dono !== null && x.dono !== chave)
    .map(x => ({ nome: x.nome, motivo: `já é de "${x.dono || '(sem chave)'}"` }));

  const nomes = pendentes.map(f => f.filename);
  const dentro = nomes
    .filter((n, i) => nomes.indexOf(n) !== i)
    .map(n => ({ nome: n, motivo: 'dois idiomas deste mesmo termo caíram neste ficheiro' }));

  return [...fora, ...dentro];
}

/**
 * Apaga as imagens que ESTA corrida gerou para um termo recusado.
 *
 * Só toca em ficheiros que o git dá como NÃO seguidos — ou seja, nascidos
 * agora. É de propósito: o prefixo de "fatura-do-cartao" também casa com
 * "fatura-do-cartao-mais.webp", que está publicado há dias. Apagar por prefixo
 * às cegas destruiria as imagens do verbete do vizinho.
 */
function limparImagensNaoSeguidas(slug) {
  try {
    const soltos = execSync('git ls-files --others --exclude-standard public/images/glossario/', { stdio: 'pipe' })
      .toString().split('\n').map(l => l.trim()).filter(Boolean);
    const meus = soltos.filter(f => {
      const nome = f.split('/').pop().replace(/\.webp$/, '');
      return nome === slug || nome.startsWith(`${slug}-`);
    });
    for (const f of meus) { try { unlinkSync(join(process.cwd(), f)); } catch { /* já não está lá */ } }
    if (meus.length) console.log(`   🧹 ${meus.length} imagem(ns) do termo recusado apagadas (não chegaram a ser publicadas).`);
  } catch { /* limpeza é higiene, nunca motivo de falha */ }
}

/**
 * Commit só do ficheiro da fila, para o dia em que nada foi publicado.
 *
 * Sem isto, uma keyword descartada continua `pending` no repositório e é
 * escolhida outra vez amanhã — que é exactamente como "fatura do cartão"
 * derrubou este robô dois dias seguidos.
 */
function guardarSoAFila() {
  try {
    if (!existsSync(QUEUE_FILE)) return;
    execSync(`git add "${QUEUE_FILE}"`, { stdio: 'pipe' });
    // Só a fila: perguntar pelo staged inteiro faria este commit levar à boleia
    // o que outro passo tivesse deixado preparado.
    const staged = execSync(`git diff --cached --name-only -- "${QUEUE_FILE}"`, { stdio: 'pipe' }).toString().trim();
    if (!staged) {
      console.log('ℹ️ Fila sem alterações para guardar.');
      return;
    }
    execSync(`git commit -m "glossário: keyword(s) descartada(s) — nenhum verbete publicado hoje [bot]" -- "${QUEUE_FILE}"`, { stdio: 'inherit' });
    console.log('📦 Fila de keywords guardada.');
  } catch (error) {
    console.warn('⚠️ Não deu para guardar a fila:', error.message);
  }
}

/**
 * Escolhe o termo do dia: primeiro a fila de keywords, depois a rotação A-Z.
 * `recusados` são os termos que já falharam NESTA corrida — não se repetem.
 * Devolve { selectedTerm, queueEntry } ou null se não houver nada aceitável.
 */
function escolherTermo(recusados) {
  // Fase 3 — fila de keywords (categoria 'glossario', match EXATO — keywords
  // sem categoria ficam para os geradores de post): tem prioridade sobre a
  // rotação A-Z. takeKeyword já pula termos cobertos por post/glossário;
  // markUsed só é chamado DEPOIS de publicar com sucesso. Em dia de keyword a
  // letra do .current-letter NÃO avança (a rotação A-Z continua justa).
  let queueEntry = takeKeyword({ categories: ['glossario'], exactCategory: true });
  let selectedTerm = null;

  if (queueEntry) {
    const termFromQueue = glossaryTermFromKeyword(queueEntry.keyword);
    if (recusados.has(termFromQueue)) {
      console.warn(`⚠️ Termo da fila "${termFromQueue}" já foi recusado nesta corrida — voltando à rotação A-Z.`);
      queueEntry = null;
    } else if (existsSync(join(GLOSSARIO_DIR, `${slugify(termFromQueue)}.md`))) {
      // Rede de segurança (o takeKeyword já barra isso na quase totalidade dos casos)
      console.warn(`⚠️ Termo da fila "${termFromQueue}" já existe no glossário — voltando à rotação A-Z.`);
      queueEntry = null;
    } else if (!keywordLooksLikeConcept(termFromQueue)) {
      // Não chama markUsed: a keyword permanece 'pending' na fila para reavaliação futura.
      console.warn(`⚠️ Keyword da fila "${queueEntry.keyword}" (termo limpo: "${termFromQueue}") não parece um conceito de glossário — voltando à rotação A-Z. Keyword mantida como pending.`);
      queueEntry = null;
    } else {
      selectedTerm = termFromQueue;
      console.log(`📥 Termo vindo da fila de keywords: "${queueEntry.keyword}" → termo "${selectedTerm}" (fonte: ${queueEntry.source})`);
    }
  }

  if (selectedTerm) return { selectedTerm, queueEntry };

  // ── A rotação A-Z passa pelos MESMOS filtros da fila (06/08/2026) ────────
  // Até aqui esta porta não tinha filtro NENHUM, e a fila tinha. As duas
  // contradiziam-se: `xp investimentos` está na lista de marcas barradas da
  // fila E estava escrito na lista da letra X — o próximo X ia publicá-lo.
  // Foi assim que nasceram xepa-financeira, xing-ling, webull e
  // yahoo-finance (a lista foi limpa no mesmo dia; isto é a rede por baixo,
  // para o caso de voltar a entrar lá um nome).
  //
  // Se a letra não tiver termo aceitável, AVANÇA para a seguinte em vez de
  // cair no `|| terms[0]` — esse fallback antigo publicava justamente o
  // termo barrado. Percorre no máximo o abecedário todo e, se nada servir,
  // NÃO publica nada (dia sem verbete é melhor que verbete mau: a URL é
  // dívida permanente).
  const aceitavel = (t) => !recusados.has(t)
    && !existsSync(join(GLOSSARIO_DIR, `${slugify(t)}.md`))
    && !motivoDeMarca(t)
    && keywordLooksLikeConcept(t);

  const inicio = LETTERS.indexOf(currentLetter);
  for (let salto = 0; salto < LETTERS.length; salto++) {
    const letra = LETTERS[(inicio + salto) % LETTERS.length];
    const termos = POPULAR_TERMS[letra] || [];
    const escolhido = termos.find(aceitavel);
    if (escolhido) {
      if (letra !== currentLetter) {
        console.log(`↪️ Letra ${currentLetter} sem termo aceitável — a saltar para ${letra}.`);
        currentLetter = letra;
      }
      return { selectedTerm: escolhido, queueEntry: null };
    }
    // Diz em voz alta o que foi recusado e porquê: lista silenciosamente
    // esgotada é indistinguível de lista com problema.
    for (const t of termos) {
      if (existsSync(join(GLOSSARIO_DIR, `${slugify(t)}.md`))) continue;
      const marca = motivoDeMarca(t);
      if (marca) console.warn(`   ⚠️ ${letra}: "${t}" recusado (${marca}) — tirar da lista POPULAR_TERMS.`);
      else if (!keywordLooksLikeConcept(t)) console.warn(`   ⚠️ ${letra}: "${t}" recusado (não parece conceito) — tirar da lista POPULAR_TERMS.`);
    }
  }

  return null;
}

/**
 * Gera PT/EN/ES do termo e grava — ou recusa sem gravar nada.
 *
 * ⚠️ A ORDEM AQUI É O CONSERTO (18/08/2026). Antes, o PT era gravado, depois
 * gerava-se o EN e gravava-se por cima do que lá estivesse, e o ES igual. Como
 * o nome do ficheiro EN/ES sai do termo TRADUZIDO, dois termos portugueses
 * diferentes podem dar o MESMO nome lá fora: "fatura do cartão" e "fatura do
 * cartão mais" dão os dois `en-credit-card-statement.md`. O segundo esmagava o
 * primeiro, o verbete PT antigo ficava órfão, o auto-corretor i18n tentava
 * remendá-lo e a trava de slug matava a corrida. Dois dias seguidos.
 *
 * Agora os três ficheiros são montados em memória, conferidos contra o que já
 * está publicado, e só então gravados — todos ou nenhum.
 *
 * Devolve { ok: true } ou { ok: false, motivo, razaoFila }.
 */
async function produzirTermo(selectedTerm, queueEntry) {
  // Gancho "No FinMoovi" (opcional): só existe quando o termo veio da fila com
  // finmooviHook curado no CSV. Vazio na rotação A-Z (prompt fica o padrão).
  const finmooviHook = queueEntry?.finmooviHook || '';
  const chave = chaveDoTermo(selectedTerm);
  const hoje = new Date().toISOString().split('T')[0];
  const pendentes = [];

  const frontmatter = (p, termo, locale, imagem) => `---
term: "${String(termo).replace(/"/g, '\\"')}"
definition: "${p.description.replace(/"/g, '\\"')}"
title: "${p.title}"
description: "${p.description}"
image: "${imagem}"
category: "basico"
tags: [${p.keywords.map(k => `"${k}"`).join(', ')}]
author: "${config.content.defaultAuthor}"
publishedAt: ${hoje}
readingTime: 5
locale: "${locale}"
translationKey: "${chave}"
seo:
  metaTitle: "${p.title}"
  metaDescription: "${p.description}"
  keywords: [${p.keywords.map(k => `"${k}"`).join(', ')}]
---

${p.content}
`;

  // Gerar post principal em português (com imagens)
  const ptPost = await generateGlossaryTerm(selectedTerm, 'pt', finmooviHook);

  // Reutilizar a mesma imagem de capa para todos os idiomas
  const sharedImage = ptPost.image;
  pendentes.push({
    filename: `${slugify(selectedTerm)}.md`,
    content: frontmatter(ptPost, selectedTerm, 'pt', sharedImage),
  });

  // Gerar versões em inglês e espanhol (texto apenas, reutiliza imagem) — só os locales do config

  if (config.locales.includes('en')) {
    console.log('⏳ Aguardando 30s para evitar rate limit...');
    await new Promise(r => setTimeout(r, 30000));
    const enPost = await generateGlossaryTerm(selectedTerm, 'en', finmooviHook);
    // Slug do TERMO TRADUZIDO e limpo; prefixo 'en-' FORA do slugify e nunca do title
    // (para não arrastar o sufixo "- Financial Glossary" para dentro da URL).
    pendentes.push({
      filename: `en-${slugify(enPost.term)}.md`,
      content: frontmatter(enPost, enPost.term, 'en', sharedImage),
    });
  }

  if (config.locales.includes('es')) {
    console.log('⏳ Aguardando 30s para evitar rate limit...');
    await new Promise(r => setTimeout(r, 30000));
    const esPost = await generateGlossaryTerm(selectedTerm, 'es', finmooviHook);
    // Slug do TERMO TRADUZIDO e limpo; prefixo 'es-' FORA do slugify e nunca do title
    // (para não arrastar o sufixo "- Glosario Financiero" para dentro da URL).
    pendentes.push({
      filename: `es-${slugify(esPost.term)}.md`,
      content: frontmatter(esPost, esPost.term, 'es', sharedImage),
    });
  }

  // Nome degenerado: a IA não devolveu termo e o ficheiro sairia `en-.md` ou
  // `en-undefined.md`. Uma URL é dívida permanente — mais vale não nascer.
  const degenerado = pendentes.find(f => /^(en-|es-)?(undefined|null)?\.md$/.test(f.filename));
  if (degenerado) {
    return {
      ok: false,
      motivo: `a tradução não devolveu termo utilizável (o ficheiro sairia "${degenerado.filename}")`,
      razaoFila: 'traducao-sem-termo',
    };
  }

  // ── A TRAVA: nenhum destes ficheiros pode ser de OUTRO verbete ────────────
  const colisoes = colisoesDe(pendentes, chave);
  if (colisoes.length > 0) {
    return {
      ok: false,
      motivo: `a tradução bate em ficheiro(s) já ocupado(s) — ${colisoes.map(c => `${c.nome} ${c.motivo}`).join('; ')}`,
      razaoFila: 'colide-com-verbete-existente',
    };
  }

  for (const f of pendentes) {
    writeFileSync(join(GLOSSARIO_DIR, f.filename), f.content, 'utf-8');
  }
  return { ok: true };
}

async function main() {
  console.log('🚀 Iniciando geração automática de glossário...');

  try {
    // Garantir que diretórios existam
    if (!existsSync(GLOSSARIO_DIR)) {
      mkdirSync(GLOSSARIO_DIR, { recursive: true });
    }
    if (!existsSync(join(process.cwd(), 'public', 'images', 'glossario'))) {
      mkdirSync(join(process.cwd(), 'public', 'images', 'glossario'), { recursive: true });
    }

    // Obter letra atual
    currentLetter = getCurrentLetter();
    console.log(`📍 Letra atual: ${currentLetter}`);

    // Validar letra
    if (!LETTERS.includes(currentLetter)) {
      console.warn(`⚠️ Letra inválida: ${currentLetter}. Resetando para A.`);
      currentLetter = 'A';
      saveCurrentLetter(currentLetter);
    }

    // ── A REGRA DO DONO: recusa não acaba com o dia ───────────────────────────
    // "se acontecer recusas tem que ir para o próximo até encontrar." Até
    // 18/08/2026 isto valia só para a rotação A-Z, e apenas para recusas que se
    // viam ANTES de gerar (termo repetido, marca, não-conceito). A recusa que
    // derrubou o robô dois dias seguidos só aparece DEPOIS de traduzir — e aí
    // não havia próximo: a corrida morria. Agora há.
    //
    // Três tentativas: cada uma custa duas esperas de 30s mais a IA, e um robô
    // diário não deve andar meia hora à procura de tema.
    const MAX_TENTATIVAS = 3;
    const recusados = new Set();
    let publicado = null;
    let filaMexida = false;

    for (let tentativa = 1; tentativa <= MAX_TENTATIVAS && !publicado; tentativa++) {
      const escolha = escolherTermo(recusados);
      if (!escolha) {
        console.log('✅ Abecedário todo já coberto (ou sem termo aceitável). Nada a publicar hoje.');
        break;
      }
      const { selectedTerm, queueEntry } = escolha;

      console.log(`📚 Gerando glossário para: ${selectedTerm}`);

      // Simulação sem APIs (validação local): mostra a decisão e para aqui.
      if (process.env.GLOSSARIO_DRY_RUN) {
        console.log(`🧪 [dry-run] termo: "${selectedTerm}" | via fila: ${queueEntry ? 'SIM' : 'não'} | letra ${currentLetter} ${queueEntry ? 'NÃO avança' : 'avança normalmente'}`);
        return;
      }

      const resultado = await produzirTermo(selectedTerm, queueEntry);
      if (resultado.ok) {
        publicado = escolha;
        break;
      }

      // Recusado: nada foi gravado. Descarta e passa ao seguinte.
      recusados.add(selectedTerm);
      console.warn(`⚠️ "${selectedTerm}" RECUSADO — ${resultado.motivo}`);
      limparImagensNaoSeguidas(slugify(selectedTerm));
      if (queueEntry) {
        markSkipped(queueEntry.keyword, resultado.razaoFila);
        filaMexida = true;
      }
      if (tentativa < MAX_TENTATIVAS) {
        console.log(`↪️ A passar ao termo seguinte (tentativa ${tentativa + 1} de ${MAX_TENTATIVAS}).`);
      } else {
        console.warn(`::warning::${MAX_TENTATIVAS} termos recusados seguidos — hoje o glossário fica sem verbete novo. A fila foi atualizada, amanhã tenta outros.`);
      }
    }

    // Nada publicado não é falha: pode ser abecedário coberto, ou recusas em
    // série. Mas a FILA tem de ser guardada, senão a keyword recusada volta a
    // ser escolhida amanhã e o robô repete o mesmo erro para sempre.
    if (!publicado) {
      if (filaMexida) guardarSoAFila();
      console.log('ℹ️ Corrida terminada sem verbete novo — sem falha.');
      return;
    }

    const { selectedTerm, queueEntry } = publicado;

    console.log(`✅ Glossário gerado para ${currentLetter}: ${selectedTerm}`);
    console.log(`🖼️ Imagens geradas: capa + ${Math.floor(5/2)} imagens explicativas`);

    // Próxima letra — SÓ avança quando o termo veio da rotação A-Z.
    // Dia de keyword da fila não gasta a letra (a rotação continua justa).
    let nextLetter = currentLetter;
    if (!queueEntry) {
      const currentIndex = LETTERS.indexOf(currentLetter);
      const nextIndex = (currentIndex + 1) % LETTERS.length;
      nextLetter = LETTERS[nextIndex];

      // Salvar próxima letra
      saveCurrentLetter(nextLetter);
      console.log(`🔄 Próxima letra: ${nextLetter}`);
    } else {
      console.log(`🔒 Termo veio da fila — letra ${currentLetter} mantida para o próximo dia sem keyword.`);
    }

    // Fila de keywords: marca como usada SÓ após salvar PT/EN/ES com sucesso.
    if (queueEntry) markUsed(queueEntry.keyword, 'glossario-auto-diario');

    // Verificar se houve mudanças antes de commitar (a fila entra SEMPRE)
    try {
      // A fila vai no commit mesmo quando o termo publicado veio da rotação
      // A-Z: uma tentativa anterior pode ter DESCARTADO uma keyword, e esse
      // descarte só conta se for guardado. Ficheiro sem alterações é um
      // `git add` que não faz nada.
      const queueGitPath = existsSync(QUEUE_FILE) ? ` "${QUEUE_FILE}"` : '';
      execSync(`git add src/content/glossario/ public/images/glossario/ .current-letter${queueGitPath}`, { stdio: 'pipe' });

      // Add internal links to posts (new glossary term may match existing posts)
      console.log('🔗 Adicionando internal links...');
      execSync('node src/scripts/automacoes/internal-linking.js', { stdio: 'pipe' });
      execSync('git add src/content/posts/', { stdio: 'pipe' });

      const statusCheck = execSync('git status --porcelain', { stdio: 'pipe' }).toString();

      if (statusCheck.trim()) {
        execSync(`git commit -m "glossário: ${selectedTerm} (${currentLetter}) [PT/EN/ES]"`, { stdio: 'inherit' });
        console.log('✅ Mudanças commitadas!');
      } else {
        console.log('ℹ️ Nenhuma mudança para commitar');
      }
    } catch (error) {
      console.warn('⚠️ Erro ao fazer commit:', error.message);
    }

    console.log(`✅ Glossário gerado com sucesso! Próxima letra: ${nextLetter}`);
  } catch (error) {
    console.error('❌ Erro na geração automática:', error.message);
    process.exit(1);
  }
}

// Função para sanitizar nomes de arquivo
function sanitizeFilename(filename) {
  return filename
    .toLowerCase()
    .replace(/[áàâãä]/g, 'a')
    .replace(/[éèêë]/g, 'e')
    .replace(/[íìîï]/g, 'i')
    .replace(/[óòôõö]/g, 'o')
    .replace(/[úùûü]/g, 'u')
    .replace(/[ç]/g, 'c')
    .replace(/[ñ]/g, 'n')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// As peças da trava de colisão saem daqui para terem prova automática em
// tests/glossario-colisao.test.js.
export { slugify, chaveDoTermo, donoDoFicheiro, colisoesDe };

// `main()` só corre quando É ESTE o ficheiro lançado. Sem esta guarda, importar
// o módulo num teste dispararia o gerador inteiro — foi por isso que em
// 06/08/2026 os guards tiveram de mudar-se para ../lib/termo-guard.js.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}