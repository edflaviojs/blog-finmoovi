/**
 * Roteirista de Shorts (F1 — IMPLEMENTACAO20, fábrica de Shorts do glossário).
 *
 * Lê UM termo do glossário (src/content/glossario/<slug>.md, versão PT) e gera
 * um roteiro por CENAS em JSON, no padrão editorial do PRD (seção 3b — funil de
 * retenção adaptado para Short de motion graphics, estilo Fireship, ~45-55s).
 * Reaproveita o LLM grátis do blog (generateText: Cerebras→Groq→Cloudflare).
 *
 * Uso:
 *   node --import tsx src/scripts/youtube/roteiro-short.js --slug=juros-compostos
 *   node --import tsx src/scripts/youtube/roteiro-short.js --slug=selic --print
 *
 * Saída: src/scripts/youtube/output/<slug>.script.json (+ resumo no terminal).
 * NÃO faz upload nem render — só o roteiro (o resto são as próximas fases).
 */

import { generateText } from '../apis/kie-ai.js';
import { buildMarketingPromptBlock } from '../lib/youtube-marketing.js';
import { validateShortScript, sanitizeScript, BORDAO, VISUAL_TYPES, METAPHORS, METAPHOR_MEANINGS, ICONS, SFX, MAX_SFX_REPEATS, APP_SCREENS, longestSharedWordRun, hasSpelledOutNumber } from './lib/schema-short.js';
import { readFileSync, writeFileSync, mkdirSync, existsSync, realpathSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const GLOSSARIO_DIR = join(process.cwd(), 'src', 'content', 'glossario');
const TOPICS_PATH = join(process.cwd(), '.github', 'data', 'youtube-topics.json');
const OUTPUT_DIR = join(dirname(fileURLToPath(import.meta.url)), 'output');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Cerebras tem 60K TPM e cada tentativa custa até ~19K tokens (prompt + maxTokens).
// Sem pausa, 4 tentativas em rajada esvaziam o orçamento e disparam 429 (visto no
// log de 26/07). O limite NÃO é janela fixa de 1 minuto: é token bucket contínuo,
// que repõe ~1K tok/s — 25s devolvem ~25K, mais que o custo de uma tentativa.
const TPM_COOLDOWN_MS = 25000;

const args = Object.fromEntries(
  process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, ...v] = a.slice(2).split('=');
    return [k, v.join('=') || true];
  }),
);

// Lê o termo PT e separa frontmatter (term/definition/category) do body
function readTerm(slug) {
  const path = join(GLOSSARIO_DIR, `${slug}.md`);
  if (!existsSync(path)) throw new Error(`termo não encontrado: ${path}`);
  const raw = readFileSync(path, 'utf-8');
  const parts = raw.split('---');
  if (parts.length < 3) throw new Error(`frontmatter inválido em ${slug}.md`);
  const frontmatter = parts[1];
  const body = parts.slice(2).join('---').trim();
  const pick = (key) => (frontmatter.match(new RegExp(`${key}:\\s*"?([^"\\n]+)"?`)) || [])[1]?.trim();
  return {
    slug,
    term: pick('term') || slug,
    definition: pick('definition') || '',
    category: pick('category') || 'basico',
    body,
  };
}

/**
 * Lê um tema editorial de youtube-topics.json pelo id.
 * Se o topic tem glossaryRef, lê também o .md do glossário para dados de apoio.
 * Retorna o mesmo formato que readTerm() para compatibilidade com buildPrompt().
 */
function readEditorialTopic(editorialId) {
  if (!existsSync(TOPICS_PATH)) {
    throw new Error(`youtube-topics.json não encontrado: ${TOPICS_PATH}`);
  }
  const data = JSON.parse(readFileSync(TOPICS_PATH, 'utf-8'));
  const topics = Array.isArray(data?.topics) ? data.topics : [];
  const topic = topics.find((t) => t.id === editorialId);
  if (!topic) {
    throw new Error(`tema editorial não encontrado: ${editorialId}`);
  }

  // Base: usar theme como term e angle como ângulo editorial
  const result = {
    slug: topic.id,
    term: topic.theme,
    angle: topic.angle,
    definition: '',
    category: topic.pillar || 'basico',
    body: '',
    /**
     * ♦ 06/08/2026 — O TÍTULO QUE O DONO ESCREVEU NA /status (IMPL20 §60).
     * ⚠️ Vai **à letra** até ao YouTube: não é sugestão para a IA, é ordem. Se estiver
     * vazio (o normal), a IA escreve como sempre. Ver `buildMetadata` no `upload-short.js`.
     */
    tituloDoDono: String(topic.tituloDoDono || '').trim(),
  };

  // Se tem glossaryRef, lê o .md do glossário para dados de apoio
  if (topic.glossaryRef) {
    const glossaryPath = join(GLOSSARIO_DIR, `${topic.glossaryRef}.md`);
    if (existsSync(glossaryPath)) {
      try {
        const raw = readFileSync(glossaryPath, 'utf-8');
        const parts = raw.split('---');
        if (parts.length >= 3) {
          const frontmatter = parts[1];
          const body = parts.slice(2).join('---').trim();
          const pick = (key) =>
            (frontmatter.match(new RegExp(`${key}:\\s*"?([^"\\n]+)"?`)) || [])[1]?.trim();
          result.definition = pick('definition') || '';
          result.body = body;
        }
      } catch {
        // glossário indisponível → segue sem dados de apoio
      }
    }
  }

  return result;
}

// Corta o corpo do glossário num limite de caracteres, na fronteira de uma
// palavra, pra não estourar o limite de request do Groq (HTTP 413) — o corpo
// inteiro do termo (+ regras + bloco corretivo) passava do teto do tier grátis.
function truncateBody(body, maxChars = 1800) {
  if (!body || body.length <= maxChars) return body;
  const cut = body.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : maxChars)}… (trecho)`;
}

// Tracking dos Shorts já publicados (mesmo arquivo que o workflow atualiza).
const PUBLISHED_PATH = join(process.cwd(), '.github', 'data', 'youtube-published.json');

// Extrai a(s) sentença(s) da narração que contêm a palavra-âncora de uma metáfora
// (a "frase-história"). É o texto que o próximo vídeo NÃO pode repetir/parafrasear.
function findSentenceForAnchor(narration, anchor) {
  if (!narration || !anchor) return '';
  const a = String(anchor).toLowerCase();
  const sentences = String(narration).split(/(?<=[.!?…])\s+/);
  const hit = sentences.find(s => s.toLowerCase().includes(a));
  return (hit || '').trim();
}

/**
 * ANTI-REPETIÇÃO (v3.5) — carrega os roteiros PUBLICADOS mais recentes para o
 * modelo NÃO repetir o vídeo anterior. Lê .github/data/youtube-published.json,
 * pega os `limit` mais recentes por `uploadedAt` e, para cada um, tenta ler
 * output/<slug>.script.json (pula os ausentes). De cada roteiro extrai:
 *   { slug, style (intro.style), frase (intro.frase), metaphors[], stories[] }
 * onde `stories` são as sentenças da narração que contêm cada metáfora usada.
 * Retorna [] gracioso se não houver nada. `publishedPath`/`outputDir` são
 * parametrizáveis só para teste; em produção usam os caminhos padrão.
 */
// Janela do anti-repetição: 3 → 4 (31/07 manhã) → 12 (31/07 tarde).
//
// A subida para 12 só foi possível porque o catálogo passou de 8 para 32 imagens
// úteis (IMPLEMENTACAO20 §20.2). O limite antigo estava escrito aqui em texto:
// "subir mais depende de AMPLIAR O CATÁLOGO" — foi o que se fez.
//
// MEDIDO sobre os 9 vídeos publicados, com `clique-link` isenta (obrigatória na CTA):
//   média de 1,33 imagens DISTINTAS por vídeo · máximo 3
//   janela 4 → 5 bloqueadas, 27 livres · janela 12 → 6 bloqueadas, 26 livres
// (o histórico só tem 9 vídeos, por isso satura; projetando 1,33/vídeo, uma janela
// de 12 bloqueia ~16 no pior caso e continuam a sobrar ~16 de 32.)
//
// 12 = duas semanas de publicação diária antes de uma imagem poder voltar. É o
// número que o dono pediu quando disse "para nunca mais termos problema e ainda
// termos sobra".
/**
 * 🔴 A JANELA É POR FORMATO — e sem isto ela morria sozinha em 14/08/2026.
 *
 * O caderno `youtube-published.json` é UM SÓ para o canal inteiro: o Short de 50s, os
 * dois Shorts de 16s por dia e tudo o que venha a seguir escrevem no mesmo sítio,
 * porque partilham o `upload-short.js`. Esta janela lia os 12 últimos SEM olhar ao
 * formato — e a conta era esta:
 *
 *   saem 2 vídeos de 16s por dia e 1 de 50s · 09/08: 2 dos 12 são de 16s ·
 *   11/08: 6 dos 12 · **~14/08: os 12**.
 *
 * A partir daí a trava do "fio inédito" do Short de 50 segundos passaria a proibir as
 * imagens dos vídeos de 16 segundos e a **deixar de conhecer as suas próprias** — o
 * de 50s podia repetir a imagem de três dias antes e nada avisava. É a mesma lição de
 * 07/08, escrita no commit que consertou a repescagem: *um formato novo não se julga
 * só pelo que faz — julga-se pelo que faz às garantias que já existiam*.
 *
 * ⚠️ `short50` é o valor por omissão de propósito, e não é uma escolha arbitrária:
 * antes do formato de 16s existir **o caderno era 100% de 50 segundos**, e os
 * registos antigos não têm o campo `formato` nenhum. Com esta omissão, os quatro
 * geradores que chamam esta função sem argumentos (o Short de 50s, as duas passagens
 * e o vídeo longo) recebem **exactamente o que recebiam antes** — nem um vídeo a mais,
 * nem um a menos. Quem quiser a janela do formato novo pede `{ formato: 'loop16' }`.
 */
export function loadRecentPublishedContext({
  publishedPath = PUBLISHED_PATH, outputDir = OUTPUT_DIR, limit = 12, formato = 'short50',
} = {}) {
  let published;
  try {
    published = JSON.parse(readFileSync(publishedPath, 'utf-8'));
  } catch {
    return [];
  }
  const recent = Object.entries(published || {})
    .filter(([, v]) => v && v.uploadedAt)
    // Registo sem `formato` é de antes de 07/08/2026, e nessa altura só havia o de 50s.
    .filter(([, v]) => !formato || (v.formato || 'short50') === formato)
    .sort((a, b) => new Date(b[1].uploadedAt) - new Date(a[1].uploadedAt))
    .slice(0, limit);

  const out = [];
  for (const [slug] of recent) {
    const p = join(outputDir, `${slug}.script.json`);
    if (!existsSync(p)) continue; // roteiro não disponível localmente → pula
    let script;
    try {
      script = JSON.parse(readFileSync(p, 'utf-8'));
    } catch {
      continue;
    }
    const intro = (script && script.intro) || {};
    const scenes = Array.isArray(script && script.scenes) ? script.scenes : [];
    const metaphors = [];
    const stories = [];
    /**
     * ♦ A IMAGEM VEM PRIMEIRO DO CAMPO `fioCondutor` (03/08/2026). No padrão novo a
     * metáfora não é falada → zero shots de metáfora → o scan abaixo devolvia listas
     * vazias e a JANELA-12 ANTI-REPETIÇÃO morria EM SILÊNCIO (o mesmo fio podia sair
     * dias seguidos e a trava do "fio inédito" virava letra morta). O campo é a
     * fonte; o scan continua para os roteiros antigos e para as `stories`.
     */
    if (script && typeof script.fioCondutor === 'string' && script.fioCondutor && script.fioCondutor !== 'clique-link') {
      metaphors.push(script.fioCondutor);
    }
    for (const s of scenes) {
      const shots = Array.isArray(s && s.shots) ? s.shots : [];
      for (const sh of shots) {
        const v = sh && sh.visual;
        // ♦ `clique-link` fica de fora (03/08/2026): é a mãozinha OBRIGATÓRIA da
        // CTA. No padrão novo ela é o único shot de metáfora que resta, e a frase
        // dela ia parar ao "JÁ FOI DITO (não repita)" — proibindo o molde do
        // convite que o próprio prompt ordena. Apanhado na revisão pós-execução.
        if (v && v.type === 'metaphor' && v.metaphor && v.metaphor !== 'clique-link') {
          if (!metaphors.includes(v.metaphor)) metaphors.push(v.metaphor);
          const sentence = findSentenceForAnchor(s.narration, sh.anchor);
          if (sentence && !stories.includes(sentence)) stories.push(sentence);
        }
      }
    }
    out.push({ slug, style: intro.style || '', frase: intro.frase || '', metaphors, stories });
  }
  return out;
}

/**
 * Monta o bloco ANTI-REPETIÇÃO (≤900 chars) que entra no prompt: por vídeo
 * anterior, lista estilo/frase de intro, metáforas e frases-história, e PROÍBE
 * repeti-los. Retorna '' se não houver vídeo anterior.
 *
 * Se estourar 900 chars, encolhe SÓ a lista de vídeos — primeiro as frases-
 * história, depois descartando os vídeos mais antigos. As REGRAS entram sempre
 * inteiras: são a única coisa aqui que o modelo precisa obedecer, e cortá-las
 * (como fazia o slice cego anterior) transforma o bloco num aviso mudo.
 */
export function buildAntiRepetitionBlock(context) {
  const list = (context || []).filter(Boolean);
  if (list.length === 0) return '';
  const MAX = 900;
  const HEAD = '🚫 ANTI-REPETIÇÃO — os vídeos anteriores do canal usaram: ';
  // As REGRAS são a parte que o modelo precisa OBEDECER — nunca podem ser
  // truncadas. Até 28/07/2026 elas viviam no fim de uma string única cortada a
  // 900 chars por um slice cego. Medido com o contexto real de produção
  // (aplicacao-financeira, amortizacao, alavancagem): o bloco batia EXATAMENTE
  // 900 e a proibição do molde "Você ACREDITA que…" era decepada — nunca chegou
  // ao modelo. Enquanto isso o template JSON de saída entregava esse mesmo
  // molde como exemplo a preencher. O sistema pedia e punia a mesma coisa, e o
  // Short morria todos os dias na 4ª tentativa desde 25/07.
  const REGRAS = '. É PROIBIDO: repetir o MESMO estilo de intro do vídeo mais recente; reutilizar qualquer uma dessas metáforas principais; repetir ou parafrasear essas frases/histórias. Crie uma intro com formato DIFERENTE e um momento-história NOVO, com exemplo original adaptado ao tema deste termo. Se a sua frase de intro couber no molde "Você ACREDITA que X pode virar Y", ela será REJEITADA — invente outra construção.';
  const renderParts = (items, storyCap) => {
    const parts = items.map((c, i) => {
      const label = i === 0 ? 'mais recente' : `${i + 1}º mais recente`;
      const metas = c.metaphors && c.metaphors.length ? c.metaphors.join(', ') : '—';
      const stories = c.stories && c.stories.length
        ? c.stories.map((s) => {
            const txt = storyCap && s.length > storyCap ? `${s.slice(0, storyCap).trim()}…` : s;
            return `"${txt}"`;
          }).join(' ')
        : '—';
      return `[${label}: estilo de intro ${c.style || '—'} · frase de intro "${c.frase || '—'}" · metáforas: ${metas} · histórias: ${stories}]`;
    });
    return parts.join(' ');
  };
  // Só a LISTA de vídeos encolhe. Primeiro corta as frases-história (cap 0 = sem
  // corte); se ainda não couber, descarta os vídeos mais ANTIGOS, que são os
  // menos críticos — o anti-repetição de estilo só olha o mais recente.
  // As REGRAS entram sempre inteiras, mesmo que o bloco passe de 900.
  for (const cap of [0, 90, 70, 50, 30]) {
    const block = `${HEAD}${renderParts(list, cap)}${REGRAS}`;
    if (block.length <= MAX) return block;
  }
  for (let n = list.length - 1; n >= 1; n--) {
    const block = `${HEAD}${renderParts(list.slice(0, n), 30)}${REGRAS}`;
    if (block.length <= MAX) return block;
  }
  return `${HEAD}${renderParts(list.slice(0, 1), 30)}${REGRAS}`;
}

// Marketing intelligence block (loaded once per run)
function buildMarketingBlock(t) {
  let trends = null;
  const trendsPath = join(process.cwd(), '.github', 'data', 'youtube-trends.json');
  if (existsSync(trendsPath)) {
    try { trends = JSON.parse(readFileSync(trendsPath, 'utf-8')).aggregate; } catch {}
  }
  return buildMarketingPromptBlock('short', {
    keyword: t.term || t.slug || '',
    category: t.category || '',
    trends,
  });
}

// Moldura APP-FIRST (§3b-bis IMPLEMENTACAO20): a espinha FIXA problema→empatia→
// vazamento→DEMO→micro-ação→outro-honesto, com a FEATURE/TELA DERIVADAS do tema/
// ângulo (NUNCA hardcode). APP_SCREENS vem do schema (enum já existente).
function buildAppFirstBlock(t) {
  return `════════ MOLDURA APP-FIRST (a ESPINHA de todo vídeo — DINÂMICA) ════════
Todo vídeo segue esta espinha FIXA, mas a FEATURE demonstrada é DERIVADA do tema/ângulo (NUNCA de uma lista pronta): escolha a funcionalidade do FinMoovi que resolve NATURALMENTE a dor de "${t.term}"${t.angle ? ` no ângulo "${t.angle}"` : ''} e demonstre-a na tela do app correspondente. Dois vídeos do MESMO tema podem usar features diferentes (ex.: lançar gasto por FOTO vs. por VOZ no mercado) — a demo nasce do ângulo.
⚠️ Os nomes em MAIÚSCULAS abaixo são a FUNÇÃO NARRATIVA de cada cena — NÃO são o valor do campo "role". O campo "role" aceita EXATAMENTE quatro valores: "hook", "beat", "cta", "outro". Escrever "beat-empatia", "beat-demo" ou qualquer outra variante REPROVA o roteiro inteiro. As três cenas do meio são TODAS role "beat".
1. HOOK  → role "hook": a DOR VISÍVEL + um número real (a perda/o problema), já falando "${t.term}".
2. BEAT-EMPATIA  → role "beat": valide a dor — POR QUE ela acontece (correria, pressa, cansaço, vergonha), SEM culpar ("não é preguiça sua, não").
3. BEAT-VIRADA  → role "beat": a REVERSÃO de expectativa — o espectador acha que o problema é A e você mostra que é B ("não é o [A] que te quebra… é o [B] que ninguém soma"). É a consequência silenciosa que se acumula, dita como reviravolta e não como aviso. É aqui que o FIO CONDUTOR escala (estágio 2/3 da REGRA H).
4. BEAT-DEMO  → role "beat": a FEATURE resolvendo EXATAMENTE a dor da cena 2, num shot "app" na tela mais coerente ("app" ∈ {${APP_SCREENS.join(', ')}}) — ex.: gasto por foto/voz → "smartcapture"; total do carrinho → "compras"; "pra onde foi o dinheiro?" → "fluxo"; simular juros → "calculadora"; saldo/alerta → "dashboard". A demo RESPONDE à fricção, não é enfeite.
5. CTA (micro-ação)  → role "cta": um passo RÁPIDO de SEGUNDOS ("fotografa a próxima nota", "fala o gasto ali no corredor") — NUNCA "em 5 minutos" nem "reserve um tempo". Feature grátis; o convite final é SEMPRE o comentário-gatilho da REGRA 5 (pedir o comentário com a palavra FINMOOVI), NUNCA mandar clicar em link.
6. OUTRO honesto  → role "outro": ver REGRA 6 (não nomeia o próximo tema). É aqui que a PERGUNTA SEGURADA (REGRA I) é respondida e o FIO CONDUTOR é pago (estágio 3/3).
Regra de ouro: se o vídeo não mostra um BOTÃO do app resolvendo a dor, não está pronto.`;
}

function buildPrompt(t, antiRep = '') {
  return `Você é um ROTEIRISTA CINEMATOGRÁFICO de finanças do canal FinMoovi (PT-BR): engaja, cria mistério, instiga emoção e prende a atenção do PRIMEIRO ao ÚLTIMO segundo. Escreve como uma CONVERSA DE AMIGO brasileiro — informal, fluido, com gírias leves — NUNCA formal, "escrito" ou robótico.
Crie o roteiro de um YOUTUBE SHORT (vertical, motion graphics) sobre o TEMA abaixo.

⚠️ REGRA ANTI-CHATICE (a mais importante — NUNCA viole):
O vídeo NUNCA deve ser uma "aula" ou "explicação de conceito". PROIBIDO formato "O que é X".
Em vez de EXPLICAR, o vídeo deve: APLICAR, DEMONSTRAR, COMPARAR, CHOCAR ou CONTAR UMA HISTÓRIA.
O termo/tema é o PANO DE FUNDO — o vídeo mostra o IMPACTO REAL na vida da pessoa.
Exemplos do que NÃO fazer: "Juros compostos é quando..." / "A Selic é a taxa básica..."
Exemplos do que FAZER: "R$ 500/mês viram R$ 3,2 milhões — a prova" / "Você perde R$ 200/mês por causa DISSO"

TEMA: "${t.term}"${t.angle ? `\nÂNGULO EDITORIAL: ${t.angle}` : ''}
DEFINIÇÃO: ${t.definition}
CONTEÚDO DE APOIO (use os números/exemplos reais daqui):
${truncateBody(t.body)}
${antiRep ? `\n${antiRep}\n` : ''}
${buildMarketingBlock(t)}
${buildAppFirstBlock(t)}
════════ REGRAS DE ESTRUTURA (o roteiro é rejeitado se violar) ════════
⚠️ os valores/números que aparecem nos EXEMPLOS destas regras (R$ 500, R$ 3,2 milhões, 25/35 anos etc.) pertencem a OUTRO vídeo — é PROIBIDO usá-los; use SOMENTE números reais do CONTEÚDO DE APOIO do termo atual ("${t.term}").
1. Duração total entre 45 e 55 segundos (soma dos durationSec das cenas).
2. Cenas nesta ordem: 1 "hook" → 2 a 3 "beat" → 1 "cta" → 1 "outro".
3. HOOK (cold open, 0-5s): gancho FORTE e EMOCIONAL que já FALA a palavra-chave "${t.term}" nos primeiros segundos (o YouTube transcreve a voz — obrigatório p/ SEO). Crie urgência/curiosidade e emende num exemplo. TOM (EXEMPLO de formato — NUNCA copie os valores; imite só a energia): "Se você acha que ${t.term} é papo de rico… olha só esse número." Termine puxando o exemplo/número. Proibido definição/enrolação.
4. É UMA HISTÓRIA SÓ: o vídeo desenvolve UM único assunto (o do gancho), do hook até a CTA. Cada cena COMPLEMENTA a anterior — PROIBIDO abrir assunto novo/desconexo. Os BEATS explicam o PORQUÊ/COMO dos números (dê NEXO), com os valores reais do conteúdo de apoio.
5. CTA (penúltima cena, NUNCA no fim) — COMENTÁRIO-GATILHO: recado rápido de valor sobre o app FinMoovi grátis OU a calculadora do blog, e o convite é SEMPRE pedir o COMENTÁRIO com a palavra "FINMOOVI".
   ⛔ É PROIBIDO mandar clicar em link — "link na descrição", "link na bio", "link aqui embaixo", "clica no link" ou qualquer variante. Motivo (medido em 31/07/2026): em vídeo VERTICAL a descrição fica ESCONDIDA e o link NÃO é clicável, então mandar clicar é prometer o que a plataforma não entrega. O campo de comentário, esse sim, está sempre à mão.
   MOLDE (adapte ao tema — não copie): "quer <o que o app resolve NESTE tema>? comenta FINMOOVI aqui que eu te mando." A palavra tem de ser dita EXATAMENTE como "FINMOOVI". Volte já ao tom de conteúdo.
6. OUTRO (última cena, open loop): SEM "tchau/obrigado/até a próxima". Reflexão forte + um fechamento HONESTO. É PROIBIDO nomear/prometer o tema do próximo vídeo — a fila é sorteada depois, então prometer tema específico é MENTIRA. ESCOLHA UM destes 3 fechamentos e adapte ao tema deste vídeo: (a) curiosidade+inscrever: "…imagina os outros que eu tenho aqui — se inscreve e vem comigo."; (b) desafio-comentário: "…me conta aqui embaixo: qual foi o teu [gasto/erro] desse mês?"; (c) provocação-no-tema: "…e tem um detalhe que engana até quem se controla — guarda essa.". Deixe o campo "nextVideoTitle" VAZIO (""); NÃO invente tema.
7. Insira EXATAMENTE 1 vez (de preferência num beat ou na CTA) o bordão do canal: "${BORDAO}"
8. NARRAÇÃO — diga sempre "vídeo", NUNCA "Short"/"Shorts": é sempre "te explico no próximo vídeo", jamais "no próximo short" (a hashtag #Shorts fica só nos metadados do upload, nunca na fala).
9. NA TELA (intro.frase, onScreenText, "text" de shots) números são SEMPRE algarismos (R$ 50, 75%, 3x) — por extenso é PROIBIDO na tela (na narração falada pode).

════════ SHOTS — COREOGRAFIA POR PALAVRA (o coração do v3) ════════
O dono quer MUITO MOVIMENTO: "a cada 2-3 segundos muda a tela — gráficos, ícones, imagens". Cada cena tem "shots": um ARRAY de 1 a 6 visuais rápidos que ENTRAM na tela no exato momento em que a palavra-âncora é FALADA.

Um shot = { "anchor": "palavra", "visual": { "type": …, … }, "sfx": "…" (opcional) }.
- "anchor": uma palavra EXATA da narração DESTA cena. É EXATAMENTE UMA palavra (uma só — NUNCA uma frase, nunca duas ou mais palavras; ex.: "comprar", não "comprar uma ação"). Os shots seguem a ORDEM em que as palavras são faladas.
- "visual.type" (motion graphics OU tela real do app — SEM vídeo de estoque/filmagem): ${VISUAL_TYPES.join(', ')}.
    · number = número gigante ("text": "R$ 500") · counter = número CORRENDO ("from", "to", "prefix": "R$") · chart = gráfico/barras/curva · icon = ícone ("icon" do catálogo) · metaphor = animação da metáfora ("metaphor" do catálogo) · statement = frase-soco ("text") · formula = fórmula (regra dos 72) · list = itens revelados · app = tela NATIVA do app FinMoovi recriada de verdade ("app" do catálogo — ver REGRA F).
- "icon" ∈ {${ICONS.join(', ')}}. "metaphor" ∈ {${METAPHORS.join(', ')}}. "sfx" ∈ {${SFX.join(', ')}}. "app" ∈ {${APP_SCREENS.join(', ')}} (só quando visual.type="app").
- ⚠️ SONS e ÍCONES têm catálogos DIFERENTES e não se misturam. O "sfx" SÓ pode ser um destes sons: {${SFX.join(', ')}}. "warning" é ÍCONE, não som (não existe sfx "warning"); "tick"/"warning" não são sfx. Se precisar de alerta sonoro, o som é "alert".
- "text" curtíssimo (≤40 chars). "note" = 1 linha de direção de arte.

REGRA A — RITMO (movimento constante): nenhum visual pode ficar parado mais de ~3s de narração. Na prática: no MÁXIMO ~8-10 palavras entre uma âncora e a próxima. Cena de 11s → ~3-5 shots. EXCEÇÃO: shots "app" — ver REGRA G — precisam do OPOSTO: ficar parados ~4-5s.

REGRA B — SINCRONIA SEMÂNTICA (a mais importante — NUNCA viole): o visual de um shot só pode mostrar valores/ideias que estão sendo ditos NAQUELA âncora ou que JÁ foram ditos antes. NUNCA mostre um número/ideia ANTES da voz chegar nele.
  ✗ ERRADO: a voz diz "vejam esses 500 reais" e a tela já sobe um gráfico até 3,2 milhões (a voz ainda nem falou o resultado).
  ✓ CERTO: em "500 reais" o shot mostra 500; o counter/gráfico até 3,2 milhões só dispara na âncora onde a voz FALA "milhões".
  ✗ ERRADO: a voz diz "é aqui que a maioria escorrega" e já começa o gráfico de 25 anos (ainda não falou de idade).
  ✓ CERTO: o gráfico das idades 25 vs 35 só entra nas âncoras "25" e "35".

REGRA C — METÁFORAS LITERAIS (o dono AMA): quando a narração usar uma metáfora FÍSICA, crie um shot "metaphor" que ANIMA de verdade o que foi dito, com o "sfx" casado.
  · "que nem bola de neve descendo a ladeira" → metaphor "bola-neve" (bolinha rola e derruba algo), sfx "whoosh".
  · "vira uma avalanche" → metaphor "avalanche", sfx "avalanche" (neve caindo).
  · "é aqui que a maioria escorrega" → metaphor "escorregao", sfx "slide" (pode ser CÔMICO — o dono curte o humor no escorregão).
  · na CTA, quando a narração pedir o COMENTÁRIO (REGRA 5): metaphor "clique-link" (uma mãozinha percorre a tela e TOCA no botão "Comenta FINMOOVI"), sfx "click", na âncora onde isso é dito.
  PREFIRA usar na narração metáforas que existem no catálogo (${METAPHORS.join(', ')}); se usar outra, represente com um shot "icon" coerente.
  SIGNIFICADO das metáforas (escolha a que NASCE do tema deste vídeo): ${METAPHORS.map((m) => `${m}=${METAPHOR_MEANINGS[m] || m}`).join('; ')}.
  ⚠️ A "anchor" NUNCA é o nome da metáfora/ícone do catálogo — é SEMPRE uma palavra FALADA de verdade na narração (ex.: metaphor "bola-neve" → anchor "bola", NUNCA "bola-neve"; metaphor "escorregao" → anchor "escorrega", NUNCA "escorregao").

REGRA D — SFX: TEMPERO, NÃO METRÔNOMO (feedback do dono 22/07 depois de assistir o vídeo v3.3: "ainda tem som repetindo demais... cansativo" — aperte MAIS que na versão anterior). Regras de variedade sonora:
  · REGRA DE OURO (v3.4): o IDEAL é CADA SOM aparecer só 1 VEZ no vídeo inteiro. NO MÁXIMO 1 som do vídeo todo pode repetir (2-3×, bem espaçado) — todos os OUTROS sons usados aparecem 1 única vez. O candidato natural pro som que repete é "kaching" (o som do dinheiro); os demais sons usados (whoosh, avalanche, slide, click, ding, thud, sparkle, boom, alert, coin, typewriter, keyboard, pop) aparecem 1× cada.
  · SFX em NO MÁXIMO ~metade dos shots do vídeo inteiro — a maioria dos shots NÃO precisa de som, silêncio também é ritmo.
  · NUNCA repita o mesmo sfx em dois shots consecutivos (contando só entre os shots que TÊM som).
  · Ao longo do vídeo inteiro, use pelo menos 3-4 sons DIFERENTES do catálogo (${SFX.join(', ')}) — cada um 1× só, exceto o único som "coringa" que pode repetir.
  · Para o "som do dinheiro" (contador subindo, valor em reais aparecendo), PREFIRA "kaching" (caixa registradora) — é o candidato natural a ser o ÚNICO som repetido do vídeo; "coin" fica como alternativa leve pontual (1×), não os dois toda hora.
  · Em shots "statement"/"list"/"formula" (o texto surge digitado/revelado), combine com "typewriter" ou "keyboard" em vez de um sfx de dinheiro.
  · 4 sons novos pro repertório (menos repetição, mais variedade) — use quando fizer sentido em vez de recair sempre nos mesmos 3-4: "click" (clique/toque em botão ou link), "ding" (sininho suave — insight, "ahá", uma sacada), "thud" (impacto seco — queda, perda, tombo), "sparkle" (brilho/cintilado — revelação, resultado bonito surgindo).
  · LIMITE DURO DE REPETIÇÃO: o MESMO sfx pode aparecer NO MÁXIMO ${MAX_SFX_REPEATS} vezes no vídeo inteiro (senão o roteiro é REJEITADO) — mas isso é o TETO absoluto, NÃO a meta. A meta v3.4 é 1× pra quase todo som, com NO MÁXIMO 1 som do vídeo repetindo. Se repetir, fique em 2-3× BEM ESPAÇADAS — uma perto do início, uma no meio, uma perto do fim do vídeo (nunca duas juntas/na mesma parte).
    ✓ CERTO: "kaching" no 1º shot do vídeo (início), some por um bom tempo, volta lá pelo meio, e no máximo uma 3ª vez perto do final — TODO o resto do catálogo usado no vídeo aparece só 1×.
    ✗ ERRADO: "kaching" em 3 shots seguidos, as 3 vezes concentradas na mesma metade do vídeo, OU mais de 1 som (ex.: "kaching" E "sparkle") repetindo no mesmo vídeo — cansa e não é "tempero".

REGRA E — ÍCONES: NÃO REPITA (catálogo agora tem ${ICONS.length}: ${ICONS.join(', ')}). Cada ícone usado no vídeo aparece no MÁXIMO 1 vez — escolha o mais específico pro momento (ex.: "piggy" poupança, "bank" banco, "target" meta, "trophy" conquista, "bulb" ideia/insight, "hourglass" tempo passando, "wallet" carteira/gasto, "fire" urgência, "chart-down" queda/perda, "shield" proteção).

REGRA F — B-ROLL DO APP FinMoovi (regra do dono 21/07: "em todos os shorts colocar ao menos 2 b-rolls do nosso app"): TODO Short precisa de NO MÍNIMO 2 shots "type":"app" (tela nativa do FinMoovi recriada de verdade — não é filmagem/vídeo de estoque). Distribua assim:
  · 1 SEMPRE na cena CTA — o app (normalmente "calculadora") aparecendo pouco antes do momento de clicar no link, no espírito de "olha como fica no app" logo antes do clique.
  · ≥1 em algum BEAT onde a narração JUSTIFIQUE mostrar o app — momentos de falar em controlar dinheiro, ver saldo, fatura, fluxo de caixa, planejamento ("olha como fica no app"). NUNCA force um shot de app onde a história não sustenta além desses dois momentos — a REGRA B (sincronia semântica) continua valendo: a tela mostrada tem que bater com o que está sendo dito naquela âncora.
  As 8 telas disponíveis (escolha a mais coerente com a âncora): "app" ∈ {${APP_SCREENS.join(', ')}}.
    · dashboard = saldos e visão geral das contas · cartoes = cartões de crédito e fatura · fluxo = fluxo de caixa · extrato = lançamentos/extrato · balanco = receitas × despesas do mês · compras = modo compras/carrinho · smartcapture = lançar gasto por voz · calculadora = calculadora de juros/simulação (ideal na CTA).

REGRA G — TEMPO DE TELA DO APP (regra do dono 22/07 depois de assistir o vídeo v3.3: "sempre que for usar os nossos b-rolls o tempo de tela não pode ser 2,5s — tem que ser o dobro, tipo 4,5 segundos; achei que ficou muito rápido"): um shot "app" PRECISA segurar a tela por ~4-5 SEGUNDOS (nunca ~2,5s ou menos — isso é rejeitado). O tempo de tela de um shot é a distância (em palavras faladas) da SUA âncora até a âncora do PRÓXIMO shot — ou até o FIM da cena, se for o último shot. Para garantir isso:
  · Deixe ≈12+ PALAVRAS de narração DEPOIS da âncora do shot "app" na mesma cena antes do próximo shot — OU torne o shot "app" o ÚLTIMO shot da cena (aí ele segura até o fim).
  · Cenas que carregam um shot "app" devem ter MENOS shots no total (2-3, não 5-6) — cada shot a mais depois do app rouba tempo de tela dele.
  · NUNCA ponha a âncora do app perto do fim da cena com mais shots vindo logo depois — isso faz o app entrar e sumir em 1-2s, o que o dono NÃO quer mais.

REGRA H — FIO CONDUTOR (o padrão-ouro do canal, agora como ESPINHA do vídeo inteiro): escolha UMA única metáfora física do catálogo que NASÇA do tema deste vídeo e faça dela o FIO CONDUTOR — ela reaparece em 3 ESTÁGIOS QUE CRESCEM, em cenas DIFERENTES, e o último estágio FECHA o vídeo. Não é enfeite pontual: é o objeto que o espectador segura do primeiro ao último segundo.
  · Estágio 1/3 (cena "hook" ou 1º beat): o fio aparece PEQUENO e inofensivo.
  · Estágio 2/3 (BEAT-VIRADA): o fio ESCALA — é aqui que a narração conta a mini-história física do PORQUÊ/COMO. EXEMPLO CANÔNICO desse momento, aprovado pelo dono (é o PADRÃO de qualidade, não um texto a copiar): "É dar tempo pro dinheiro se multiplicar sozinho. Que nem bola de neve descendo a ladeira: começa pequena… e vira uma avalanche."
  · Estágio 3/3 (cena "outro"): o fio é PAGO — a consequência inteira numa imagem só, fechando o que o estágio 1 abriu.
  Os 3 estágios são shots "metaphor" com a MESMA "metaphor" do catálogo (repetir a mesma metáfora DENTRO deste vídeo é obrigatório e correto); o que muda é a narração e o campo "note", onde você ESCREVE o estágio: "estágio 2/3 — …". Cada estágio leva um "sfx" DIFERENTE, batendo com a ação daquela etapa.
  EXEMPLO SÓ DE ESTRUTURA (é o formato — o tema, os valores e a metáfora abaixo são de outro vídeo e não podem ser reusados): ralo → pinga uma moeda (1/3) → o fio de água vira jorro enquanto o mês passa (2/3) → o ralo engoliu um salário inteiro no ano (3/3).
  ⚠️ A história é SEMPRE ORIGINAL e específica do tema — o DISPOSITIVO (o fio condutor) se repete todo vídeo, mas a metáfora e a história NUNCA. A metáfora escolhida deve NASCER do assunto e jamais pode ser nenhuma das usadas nos vídeos recentes (ver ANTI-REPETIÇÃO). A "anchor" é SEMPRE uma palavra FALADA de verdade, nunca o nome do catálogo.

REGRA I — A PERGUNTA SEGURADA (é ela que prende o dedo até o fim): o vídeo tem UMA pergunta que ele se RECUSA a responder. Na cena "hook", um dos shots é "visual.type":"statement" com essa pergunta CURTÍSSIMA em MAIÚSCULAS na tela (≤40 chars) — ela nasce do tema deste vídeo. A narração do hook e dos beats NUNCA a responde, nem de raspão. A resposta (ou a virada dela) chega SÓ na cena "outro", junto do fechamento da REGRA 6. Varie a construção a cada vídeo — pergunta de destino ("PRA ONDE FOI?"), de culpa ("QUEM PAGA A CONTA?") e de quantidade ("QUANTO CUSTA ESPERAR?") são três FORMATOS diferentes, não frases a copiar.

════════ UNIDADE NA PRIMEIRA MENÇÃO (regra do dono) ════════
Toda unidade (anos, %, R$, meses…) é FALADA por extenso na PRIMEIRA menção; nas menções seguintes, se o contexto já deixou claro do que se trata, pode falar só o número — sem repetir a unidade.
  ✓ CERTO: "quem começa aos 25 anos junta quase o triplo de quem começou aos 35." (a unidade "anos" foi dita na 1ª vez; na 2ª, "aos 35" já é claro pelo contexto)
  ✗ ERRADO: "quem começa aos 25 junta quase o triplo de quem começou aos 35." (a unidade "anos" nunca foi dita)
  ✗ ERRADO: "quem começa aos 25 anos junta quase o triplo de quem começou aos 35 anos." (repetição desnecessária da unidade)

════════ FALA FLUIDA — PONTUAÇÃO = RESPIRAÇÃO (regra do dono) ════════
A pontuação existe SÓ para comandar o respiro da voz (TTS). Vírgula/ponto/reticências = a voz respira ali. Vírgula gramatical onde um falante NÃO respiraria é PROIBIDA. TESTE FINAL: leia em voz alta — se o respiro cair no lugar errado, reescreva.
  ✗ ERRADO: "Dez aninhos de atraso, custam uma fortuna." (o TTS respira depois de "atraso" — fica horrível)
  ✓ CERTO: "Dez aninhos de atraso custam uma fortuna." (um respiro só)
  ✗ ERRADO: "E não é sorte, não." (ninguém fala com vírgula aí)
  ✓ CERTO: "E não é sorte não." (tudo junto)
  ✗ ERRADO: "o juro composto rende muito, mas muito dinheiro… pro banco." (picotado, não sai fluido)
  ✓ CERTO: quebre só onde um falante realmente respiraria PARA DAR EFEITO — ex.: "esse mesmo juro rende uma fortuna… só que pro banco."
Use reticências (…) para SUSPENSE de efeito, não para picotar frase. A última frase de cada cena puxa a próxima.

════════ INTRO (abertura disruptiva — SEMPRE dinâmica e adaptada ao tema) ════════
"intro.frase" = frase de CURIOSIDADE que para o dedo, com as palavras de ÊNFASE marcadas entre *asteriscos* (o render dá destaque nelas). NÃO siga sempre o mesmo molde de frase — VARIE a construção (pergunta, desafio, afirmação chocante, contagem); ⛔ O molde "Você ACREDITA que X pode virar Y" está QUEIMADO (já foi usado) — quem o usar, mesmo variando os números, é REJEITADO. Abaixo está só o FORMATO da marcação de ênfase — NÃO é uma frase e não deve ser copiada nem adaptada: "*TRECHO EM ÊNFASE* texto normal… *FECHO CURTO EM ÊNFASE*". A frase em si é sua, com os números reais de "${t.term}".
"intro.style" = classifique em UMA palavra o FORMATO da sua frase de intro: "pergunta", "desafio", "afirmacao" (afirmação chocante) ou "contagem". PRECISA ser DIFERENTE do estilo do vídeo mais recente (ver ANTI-REPETIÇÃO).
"intro.counter" = { "from", "to", "prefix" } — um contador que sobe do início ao resultado (ex., EXEMPLO de formato — NUNCA copie os valores: 500 → 3200000). "from" < "to", números puros (sem pontos/símbolos), usando os números reais do termo atual.

Responda APENAS com JSON válido (sem texto fora do JSON, sem markdown), neste formato exato:
{
  "slug": "${t.slug}",
  "term": "${t.term}",
  "category": "${t.category}",
  "keyword": "${t.term}",
  "nextVideoTitle": "",
  "intro": {
    "style": "pergunta",
    "frase": "<SUA frase de intro — construção original, ÊNFASE entre *asteriscos*>",
    "counter": { "from": 500, "to": 3200000, "prefix": "R$" }
  },
  "scenes": [
    {
      "id": 1,
      "role": "hook",
      "narration": "…",
      "durationSec": 5,
      "shots": [
        { "anchor": "palavra1", "visual": { "type": "statement", "text": "…", "note": "…" }, "sfx": "boom" },
        { "anchor": "palavra2", "visual": { "type": "number", "text": "R$ 500", "note": "…" }, "sfx": "whoosh" }
      ]
    }
  ],
  "cta": { "text": "…", "target": "app" },
  "totalDurationSec": 50
}`;
}

// Extrai o JSON mesmo se o modelo embrulhar em ```json ... ``` ou texto extra
function extractJson(text) {
  let s = String(text).trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('nenhum JSON encontrado na resposta do LLM');
  return JSON.parse(s.slice(start, end + 1));
}

// Monta o bloco corretivo anexado ao prompt nas tentativas seguintes a uma
// validação reprovada. Recebe as exigências ACUMULADAS do run (ver generateScript)
// — não só as da última tentativa — e até ~5 avisos como melhorias opcionais.
// O prompt-base continua sendo enviado.
// Limite total ~1200 chars: corta os avisos primeiro (menos críticos) e só
// depois as exigências mais ANTIGAS, nunca as mais recentes.
// Nos runs de 27 e 28/07 o bloco acumulado deu 692 chars — mas o teto CONTINUA
// alcançável: bastam ~3 exigências novas por tentativa (erros de âncora, de
// tempo de tela do app ou de número por extenso interpolam texto variável e
// nunca deduplicam) para passar de 1200 na 3ª/4ª tentativa. Não tratar 692
// como propriedade do sistema — é só a medição de dois runs.
function buildCorrectiveBlock(errors, warnings) {
  const MAX_CHARS = 1200;
  const header = '⚠️ A TENTATIVA ANTERIOR FOI REJEITADA. O roteiro novo tem que cumprir TODAS as exigências abaixo AO MESMO TEMPO — corrigir uma e violar outra conta como falha. Gere o roteiro completo de novo:';

  // Trunca por LINHA INTEIRA, descartando a MAIS ANTIGA. O corte por caractere
  // que existia aqui fazia duas coisas erradas: partia uma exigência ao meio
  // (o modelo recebia "- cena 2… (trecho)" sob um cabeçalho que manda cumprir
  // TODAS) e, por a lista ser mais-antiga-primeiro, descartava justamente as
  // MAIS RECENTES — as que o modelo acabou de violar.
  let errorLines = errors.map(e => `- ${e}`);
  while (errorLines.length > 1 && [header, ...errorLines].join('\n').length > MAX_CHARS) {
    errorLines = errorLines.slice(1);
  }
  let lines = [header, ...errorLines];

  const topWarnings = (warnings || []).slice(0, 5);
  if (topWarnings.length) {
    const withWarnings = [...lines, 'melhore também:', ...topWarnings.map(w => `- ${w}`)];
    if (withWarnings.join('\n').length <= MAX_CHARS) lines = withWarnings;
  }

  return lines.join('\n');
}

/**
 * CHECAGENS DURAS pós-geração (v3.6 — "dar dentes" ao anti-repetição, que até
 * aqui era só o bloco 🚫 no prompt: ADVISORY-ONLY, e o LLM repetiu o mesmo
 * molde de intro 3× seguidas mesmo com o bloco). Tratadas EXATAMENTE como
 * erros do validador: entram no bloco corretivo da tentativa seguinte e
 * contam como falha (a tentativa é descartada e regenerada). Rodam AQUI (não
 * dentro de validateShortScript) porque dependem do CONTEXTO de vídeos
 * anteriores (`recentContext`) — o validador continua puramente estrutural,
 * sem estado externo, e sua assinatura não muda.
 *   a) intro.frase não pode compartilhar ≥3 palavras CONTÍGUAS (acento/caixa-
 *      insensível, ignorando "*"/pontuação) com nenhuma frase de intro
 *      publicada recente — pega o "molde" (ex.: "você acredita que") mesmo
 *      quando os números/valores mudam.
 *   b) intro.style precisa DIFERIR do estilo do vídeo mais recente (era só
 *      aviso em roteiro-short.js; v3.6 vira erro duro).
 *   c) números por extenso são PROIBIDOS em texto de TELA (intro.frase,
 *      onScreenText de cena, "text" de shot) — a narração falada pode.
 */
export function runHardAntiRepetitionChecks(script, recentContext) {
  const errors = [];
  const intro = (script && script.intro) || {};
  const frase = typeof intro.frase === 'string' ? intro.frase : '';
  const list = (recentContext || []).filter(Boolean);

  // (a0) SENTINELA DE PLACEHOLDER — o prompt mostra dois moldes vazios que o
  // modelo tem de preencher em vez de copiar: `"frase": "<SUA frase de intro…>"`
  // no template JSON e "*TRECHO EM ÊNFASE* … *FECHO CURTO EM ÊNFASE*" no bloco
  // INTRO. Copiados à letra, NADA os apanhava: não são molde repetido, não têm
  // número por extenso e não são vazios — o Short ia a render com o placeholder
  // escrito na tela e ainda envenenava o recentContext do dia seguinte.
  // `<`/`>` e a palavra ÊNFASE em maiúsculas não têm uso legítimo numa frase
  // de tela, portanto servem de sentinela sem risco de falso positivo.
  if (/[<>]/.test(frase) || /ÊNFASE/.test(frase)) {
    errors.push('intro.frase copiou um placeholder do prompt (o "<…>" do template ou o "*TRECHO EM ÊNFASE*") — escreva a frase de verdade');
  }

  // (a) molde de intro repetido
  if (frase) {
    for (const prev of list) {
      if (!prev.frase) continue;
      const shared = longestSharedWordRun(frase, prev.frase, 3);
      if (shared.length >= 3) {
        errors.push(`intro.frase repete o molde do vídeo anterior ("${shared.join(' ')}") — crie uma construção totalmente diferente`);
        break;
      }
    }
  }

  // (b) intro.style igual ao do vídeo mais recente
  const prevStyle = list[0] && list[0].style;
  const curStyle = intro.style;
  if (prevStyle && curStyle && String(curStyle).trim().toLowerCase() === String(prevStyle).trim().toLowerCase()) {
    errors.push(`intro.style repete o estilo do vídeo mais recente ("${curStyle}") — use um formato diferente (pergunta/desafio/afirmacao/contagem)`);
  }

  // (c) números por extenso em texto de TELA
  const screenTexts = [];
  if (frase) screenTexts.push(['intro.frase', frase]);
  const scenes = Array.isArray(script && script.scenes) ? script.scenes : [];
  scenes.forEach((s, i) => {
    const tag = `cena ${i + 1} (${(s && s.role) || '?'})`;
    if (s && typeof s.onScreenText === 'string' && s.onScreenText) {
      screenTexts.push([`${tag} onScreenText`, s.onScreenText]);
    }
    const shots = Array.isArray(s && s.shots) ? s.shots : [];
    shots.forEach((sh, j) => {
      const text = sh && sh.visual && typeof sh.visual.text === 'string' ? sh.visual.text : '';
      if (text) screenTexts.push([`${tag} shot ${j + 1} visual.text`, text]);
    });
  });
  for (const [where, text] of screenTexts) {
    if (hasSpelledOutNumber(text)) {
      errors.push(`${where}: números na tela devem ser ALGARISMOS (R$ 50), nunca por extenso ("${text}")`);
    }
  }

  // (c-bis) METÁFORA JÁ USADA NOS VÍDEOS RECENTES — agora com DENTES (31/07/2026).
  // O bloco 🚫 do prompt já proibia, mas era ADVISORY: nada verificava. Medido nos
  // 9 vídeos publicados: "avalanche" em CINCO deles, e o vídeo de 31/07 usou-a 2×
  // tendo `nunca-faca-isso-dinheiro` (que também a usa) na janela dos anteriores.
  // O dono: "isso cansa quem assistir 2 vídeos… é inadmissível".
  // `clique-link` fica FORA da regra: é obrigatória na CTA por desenho (REGRA C),
  // proibi-la tornaria o roteiro impossível.
  const METAFORA_LIVRE = new Set(['clique-link']);
  const usadasAntes = new Set();
  for (const prev of list) {
    for (const m of (prev.metaphors || [])) if (!METAFORA_LIVRE.has(m)) usadasAntes.add(m);
  }
  if (usadasAntes.size) {
    const repetidas = new Set();
    for (const s of scenes) {
      for (const sh of (Array.isArray(s && s.shots) ? s.shots : [])) {
        const v = sh && sh.visual;
        if (v && v.type === 'metaphor' && v.metaphor && !METAFORA_LIVRE.has(v.metaphor) && usadasAntes.has(v.metaphor)) {
          repetidas.add(v.metaphor);
        }
      }
    }
    if (repetidas.size) {
      errors.push(`metáfora "${[...repetidas].join('", "')}" já foi usada nos vídeos recentes — o FIO CONDUTOR precisa de uma metáfora INÉDITA (proibidas agora: ${[...usadasAntes].join(', ')})`);
    }
  }

  // (d) SENTINELA DOS EXEMPLOS DA REGRA H / REGRA I. O prompt PRECISA mostrar um
  // exemplo para o modelo entender o formato do fio condutor (o "ralo" em 3
  // estágios) e os formatos da pergunta segurada — e exemplo dentro de prompt é
  // matéria-prima de cópia literal (mesma família da sentinela (a0) acima).
  // O estrago aqui é PIOR que um vídeo ruim: a frase copiada entra no
  // youtube-published.json → recentContext → vira o "vídeo anterior" que os
  // PRÓXIMOS tentam não repetir. Uma cópia contamina a sequência, não o dia.
  // Só entram trechos ESPECÍFICOS do exemplo: "ralo" e "jorro" ficam de FORA de
  // propósito — "ralo" é metáfora legítima do catálogo e "jorro" é palavra comum;
  // reprovar roteiro bom custa 4 tentativas e mata o vídeo do dia, o que é pior
  // do que deixar passar uma cópia que o dono ainda revisa antes de publicar.
  const flat = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const EXEMPLOS_NARRACAO = ['pinga uma moeda', 'engoliu um salario'];
  const EXEMPLOS_TELA = ['pra onde foi', 'quem paga a conta', 'quanto custa esperar'];
  const narracaoToda = flat(scenes.map((s) => (s && s.narration) || '').join(' '));
  const copiadoNaNarracao = EXEMPLOS_NARRACAO.find((f) => narracaoToda.includes(f));
  if (copiadoNaNarracao) {
    errors.push(`a narração copiou o exemplo do prompt ("${copiadoNaNarracao}") — o ralo lá é só FORMATO; invente a história deste tema`);
  }
  for (const [where, text] of screenTexts) {
    const copiadoNaTela = EXEMPLOS_TELA.find((p) => flat(text).includes(p));
    if (copiadoNaTela) {
      errors.push(`${where}: copiou uma pergunta-exemplo do prompt ("${copiadoNaTela}") — a pergunta segurada tem de nascer do tema deste vídeo`);
      break; // 1 aviso basta — o bloco corretivo tem teto de 1200 chars
    }
  }

  return errors;
}

async function generateScript(t, { retries = 4, antiRep = '', recentContext = [] } = {}) {
  const basePrompt = buildPrompt(t, antiRep);
  let lastErr;
  // Exigências ACUMULADAS de TODAS as tentativas reprovadas deste run, sem repetir.
  // Antes isto era SUBSTITUÍDO a cada tentativa (apesar de o comentário já dizer
  // "acumulado"), e produzia um PÊNDULO: a tentativa seguinte corrigia o que
  // acabara de ser cobrado e regredia no resto, porque a exigência anterior tinha
  // desaparecido do prompt. Medido no run 30345848019 (28/07): att1 molde de intro
  // → att2 cena "cta" → att3 o MESMO molde de intro da att1 → att4 cena "cta".
  // Ciclo de período 2 com retries=4 ⇒ as duas exigências nunca coexistem no
  // prompt e convergir é IMPOSSÍVEL, não improvável.
  const exigencias = [];
  let corrective = '';
  for (let attempt = 1; attempt <= retries; attempt++) {
    if (attempt > 1) await sleep(TPM_COOLDOWN_MS);
    const prompt = corrective ? `${basePrompt}\n\n${corrective}` : basePrompt;
    // modelos raciocinadores (gpt-oss-120b) gastam tokens "pensando" antes do
    // JSON — 2200 asfixiava e devolvia resposta vazia (HTTP 200, content vazio);
    // 6000 voltou a asfixiar quando o prompt cresceu (26/07). Cerebras tem 60K TPM.
    const raw = await generateText(prompt, { maxTokens: 12000, temperature: 0.6 });
    let script;
    try {
      script = extractJson(raw);
    } catch (err) {
      lastErr = `parse falhou (tentativa ${attempt}): ${err.message}`;
      console.log(`⚠️ ${lastErr}${attempt < retries ? ' — regenerando...' : ' — sem tentativas restantes.'}`);
      // Falha de parse: a tentativa seguinte vai com o prompt-base limpo, como
      // sempre foi (o bloco corretivo é suspeito de contribuir para o LLM sair
      // do formato). NÃO limpa `exigencias`: elas voltam ao prompt assim que
      // houver nova reprovação de VALIDAÇÃO, que é onde fazem falta.
      corrective = '';
      continue;
    }
    // Resgata quase-erros óbvios (sfx/icon/anchor/totalDurationSec) antes de validar
    sanitizeScript(script);
    const { ok, errors, warnings } = validateShortScript(script);
    // v3.6: checagens duras de anti-repetição/números na tela, tratadas como
    // erros do validador (dependem do contexto de vídeos anteriores).
    const hardErrors = runHardAntiRepetitionChecks(script, recentContext);
    warnings.forEach(w => console.log(`   ⚠️ ${w}`));
    const allErrors = [...errors, ...hardErrors];
    if (ok && hardErrors.length === 0) return { script, warnings };
    lastErr = `validação falhou (tentativa ${attempt}): ${allErrors.join('; ')}`;
    console.log(`⚠️ ${lastErr}${attempt < retries ? ' — regenerando...' : ' — sem tentativas restantes.'}`);
    // Só acumulam as exigências DURADOURAS — as que não apontam para uma cena
    // ou shot específico. As posicionais ficam OBSOLETAS assim que o roteiro é
    // regerado (a "cena 4" da tentativa anterior pode nem existir na seguinte)
    // e ainda interpolam texto variável, o que faz o dedup nunca disparar e a
    // lista crescer sem parar. As duradouras são exatamente as do pêndulo
    // medido: molde de intro, estilo de intro e invariantes de estrutura.
    const ehDuradoura = e => !/^cena \d+/i.test(e) && !/\bshot \d+/i.test(e);
    for (const e of allErrors) {
      if (ehDuradoura(e) && !exigencias.includes(e)) exigencias.push(e);
    }
    // Antigas primeiro, as desta tentativa por último: se o teto do bloco
    // apertar, quem cai é a exigência mais velha, nunca a mais recente.
    const antigas = exigencias.filter(e => !allErrors.includes(e));
    corrective = buildCorrectiveBlock([...antigas, ...allErrors], warnings);
  }
  throw new Error(lastErr || 'não foi possível gerar um roteiro válido');
}

async function main() {
  const slug = args.slug && args.slug !== true ? String(args.slug) : 'juros-compostos';
  console.log(`🎬 Roteirista de Short — termo: ${slug}\n`);

  // Detecta se o input é um tema editorial (EDITORIAL:<id>) ou glossário (slug)
  const isEditorial = slug.startsWith('EDITORIAL:');
  let t;
  if (isEditorial) {
    const editorialId = slug.slice('EDITORIAL:'.length);
    t = readEditorialTopic(editorialId);
    console.log(`📋 Fonte: editorial (${editorialId})`);
    console.log(`📐 Ângulo: ${t.angle}`);
    if (t.body) console.log(`📚 Dados de apoio do glossário carregados.\n`);
    else console.log(`📚 Sem glossaryRef — apenas theme/angle.\n`);
  } else {
    t = readTerm(slug);
  }

  // ANTI-REPETIÇÃO (v3.5): carrega os vídeos anteriores e injeta o bloco no prompt.
  const recent = loadRecentPublishedContext();
  const antiRep = buildAntiRepetitionBlock(recent);
  if (antiRep) console.log(`🚫 Anti-repetição ativa: ${recent.length} vídeo(s) anterior(es) no contexto (${recent.map(r => r.slug).join(', ')}).\n`);

  // v3.6: intro.frase (molde repetido), intro.style (igual ao mais recente) e
  // números por extenso na tela agora são CHECAGENS DURAS dentro de
  // generateScript (ver runHardAntiRepetitionChecks) — reprovam a tentativa e
  // disparam o retry corretivo, em vez de só um aviso no console.
  const { script, warnings } = await generateScript(t, { antiRep, recentContext: recent });

  /**
   * ♦ 06/08/2026 — O título que o dono escreveu viaja com o roteiro até à publicação.
   * ⚠️ Fora do `generateScript` de propósito: **não é matéria-prima para a IA, é ordem.**
   * Se entrasse no que ela lê, ela reescrevia-o — e o dono escreveu-o para ir à letra.
   */
  if (t.tituloDoDono) {
    script.tituloDoDono = t.tituloDoDono;
    console.log(`⭐ título escrito pelo dono, vai à letra: "${t.tituloDoDono}"`);
  }

  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });
  const fileSlug = isEditorial ? slug.slice('EDITORIAL:'.length) : slug;
  const outPath = join(OUTPUT_DIR, `${fileSlug}.script.json`);
  writeFileSync(outPath, JSON.stringify(script, null, 2), 'utf-8');

  const total = script.scenes.reduce((a, s) => a + Number(s.durationSec || 0), 0);
  console.log(`\n✅ Roteiro válido: ${script.scenes.length} cenas, ~${Math.round(total)}s${warnings.length ? ` (${warnings.length} aviso(s))` : ''}`);
  console.log(`📄 Salvo em: ${outPath}\n`);
  console.log('── Prévia das cenas ──');
  for (const s of script.scenes) {
    console.log(`  [${s.role}] ${s.durationSec}s · "${s.onScreenText || ''}" (${s.visual?.type})`);
    console.log(`     ${s.narration}`);
  }

  if (args.print) console.log(`\n${JSON.stringify(script, null, 2)}`);
}

// Só executa main() quando o arquivo é o ponto de entrada (node roteiro-short.js).
// Quando importado, as funções exportadas ficam disponíveis sem disparar a
// geração/LLM — o que torna este ficheiro testável.
//
// ⚠️ NÃO EXISTE teste nenhum deste ficheiro. A versão anterior deste comentário
// dizia "ex.: pelo teste unitário do bloco anti-repetição", dando a entender
// que havia rede de segurança. Não há: o repo tem UM único ficheiro de teste
// (tests/comments-validation.test.js), sem relação com o YouTube, que nenhum
// workflow executa e para o qual não há script npm. Verificado em 28/07/2026.
// Os 3 testes que fazem falta estão especificados na IMPLEMENTACAO20 (§ dívida
// de testes) — teriam apanhado as três contradições prompt×validador que
// deixaram o Short parado de 25 a 28/07.
const invokedDirectly = (() => {
  try {
    return !!process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return true;
  }
})();

if (invokedDirectly) {
  main().catch(err => {
    console.error(`\n❌ ${err.message}`);
    process.exit(1);
  });
}
