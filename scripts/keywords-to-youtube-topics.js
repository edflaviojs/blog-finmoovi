/**
 * keywords-to-youtube-topics.js
 *
 * Converte keywords pendentes da fila (keyword-queue.json) em temas editoriais
 * para YouTube (youtube-topics.json). Usa o LLM para transformar keywords
 * explicativas em angulos interessantes (cenarios, comparacoes, listas).
 *
 * Roda semanalmente via workflow ou manualmente.
 * Env: Usa o mesmo LLM do blog (Cerebras -> Groq -> Cloudflare).
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const QUEUE_PATH = join(ROOT, '.github', 'data', 'keyword-queue.json');
const TOPICS_PATH = join(ROOT, '.github', 'data', 'youtube-topics.json');
const TRENDS_PATH = join(ROOT, '.github', 'data', 'youtube-trends.json');
const PUBLISHED_PATH = join(ROOT, '.github', 'data', 'youtube-published.json');
// Cap por execucao. DECISAO EDITORIAL do dono (27/07): 3, e nao os 8 do plano
// original. Motivo: o cron consome ~7 temas/semana e o pick-next-short SEMPRE
// prefere editorial sobre glossario (so cai no glossario quando a fila zera).
// Com 8 virais/semana a fila nunca esvaziaria e o glossario nunca mais viraria
// video. Com 3, as duas fontes convivem: o viral traz alcance, o glossario traz
// o lastro de SEO e o vinculo com o blog. Mexer aqui muda o PERFIL do canal.
const VIRAL_MAX_PER_RUN = 3;

// Cap das keywords, pela MESMA aritmetica do viral. Havia 39 keywords pending
// quando isto foi escrito (27/07): sem cap, uma unica execucao despejaria 39
// temas de uma vez na fila e o glossario ficaria fora do ar por ~2 meses.
// Conta: o cron consome ~7 videos/semana; com 3 virais + 3 keywords entram 6 e
// saem 7, entao a fila DRENA ~1/semana e o glossario volta a ter vez.
// DIFERENCA para o viral: a keyword-queue e PERSISTENTE — o que nao entra hoje
// entra na proxima. Nada e perdido, so espacado.
const KEYWORD_MAX_PER_RUN = 3;
const DRY_RUN = process.argv.includes('--dry-run');

const CATEGORY_TO_PILLAR = {
  dicas: 'controle',
  orcamento: 'controle',
  investimentos: 'investimento',
  cotacoes: 'investimento',
  ferramentas: 'ferramentas',
  glossario: 'mindset',
};

async function loadLLM() {
  try {
    const { generateText } = await import('../src/scripts/apis/kie-ai.js');
    return generateText;
  } catch (err) {
    console.error('LLM indisponivel: ' + err.message);
    return null;
  }
}

function loadQueue() {
  if (!existsSync(QUEUE_PATH)) return [];
  try {
    const data = JSON.parse(readFileSync(QUEUE_PATH, 'utf-8'));
    return Array.isArray(data?.entries) ? data.entries : [];
  } catch {
    return [];
  }
}

function loadTopics() {
  if (!existsSync(TOPICS_PATH)) {
    return { _doc: 'Banco de temas editoriais para YouTube.', topics: [] };
  }
  try {
    return JSON.parse(readFileSync(TOPICS_PATH, 'utf-8'));
  } catch {
    return { _doc: 'Banco de temas editoriais para YouTube.', topics: [] };
  }
}

function loadTrends() {
  if (!existsSync(TRENDS_PATH)) return {};
  try {
    return JSON.parse(readFileSync(TRENDS_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

function loadPublished() {
  if (!existsSync(PUBLISHED_PATH)) return new Set();
  try {
    const data = JSON.parse(readFileSync(PUBLISHED_PATH, 'utf-8'));
    return new Set(Object.keys(data || {}));
  } catch {
    return new Set();
  }
}

function saveTopics(data) {
  mkdirSync(join(ROOT, '.github', 'data'), { recursive: true });
  writeFileSync(TOPICS_PATH, JSON.stringify(data, null, 2));
}

function slugify(text) {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

// `sourceKeyword` (em todos os retornos) registra de QUAL keyword o tema
// nasceu. E o unico jeito de saber, na proxima execucao, que esta entry ja foi
// convertida — o id do topic vem do TEMA gerado, que nunca bate com a keyword.
// Sem isso, o cap causaria starvation das mesmas 3 primeiras da fila.
async function transformKeywordToTopic(keyword, category, generateText) {
  const pillar = CATEGORY_TO_PILLAR[category] || 'mindset';
  if (!generateText) {
    return { id: 'kw-' + slugify(keyword), theme: keyword.length > 60 ? keyword.slice(0, 57) + '...' : keyword, angle: 'Transformar "' + keyword + '" num video pratico com numeros reais e exemplos do dia-a-dia', pillar, source: 'keyword-queue', glossaryRef: null, status: 'pending', sourceKeyword: keyword };
  }
  const prompt = `Transforme esta keyword de blog em um TEMA de video YouTube Short (45-55s) que seja INTERESSANTE e NAO seja uma aula/explicacao.

Keyword: "${keyword}"
Categoria: ${category}

REGRAS:
- O tema NAO pode ser "O que e X" nem "Entenda X"
- Deve ser: cenario real, comparacao, lista de erros, simulacao com numeros, ou provocacao
- Use numeros concretos em BRL quando possivel
- Maximo 60 chars no theme
- O angle deve explicar o COMO do video
- A keyword e uma SEMENTE DE BUSCA, nao um titulo: NUNCA a copie literalmente. Ela costuma vir em ordem "telegrama" ("poupar dinheiro dicas") — reordene em portugues natural e preserve so os termos.

Responda EXATAMENTE neste formato JSON (sem markdown, sem comentarios):
{"theme":"...","angle":"...","glossaryRef":"...ou null"}

glossaryRef = slug do termo do glossario que serve de base ou null.`;
  try {
    const raw = await generateText(prompt, { maxTokens: 300, temperature: 0.7 });
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('LLM nao retornou JSON');
    const parsed = JSON.parse(jsonMatch[0]);
    return { id: 'kw-' + slugify(parsed.theme || keyword), theme: parsed.theme || keyword, angle: parsed.angle || 'Abordar "' + keyword + '" de forma pratica com numeros reais', pillar, source: 'keyword-queue', glossaryRef: parsed.glossaryRef === 'null' ? null : (parsed.glossaryRef || null), status: 'pending', sourceKeyword: keyword };
  } catch (err) {
    console.error('  LLM falhou para "' + keyword + '": ' + err.message + ' - usando fallback');
    return { id: 'kw-' + slugify(keyword), theme: keyword.length > 60 ? keyword.slice(0, 57) + '...' : keyword, angle: 'Transformar "' + keyword + '" num video pratico com numeros reais', pillar, source: 'keyword-queue', glossaryRef: null, status: 'pending', sourceKeyword: keyword };
  }
}

function buildViralPrompt(title, pillar) {
  return `Voce recebe o TITULO de um video de financas que VIRALIZOU no YouTube (pode estar em espanhol ou ser clickbait). Extraia o CONCEITO financeiro por tras e transforme num TEMA de video curto (Short 45-55s) do canal FinMoovi, SEMPRE em portugues do Brasil.

Titulo viral: "${title}"
Pilar: ${pillar}

REGRAS:
- Responda SEMPRE em portugues do Brasil (traduza o CONCEITO; NUNCA copie o titulo).
- O tema NAO pode ser "O que e X" nem "Entenda X" - deve ser cenario real, comparacao, lista de erros, simulacao com numeros em BRL ou provocacao.
- Se o titulo NAO for sobre financas pessoais/dinheiro/investimento, marque offTopic=true e deixe theme/angle vazios.
- Maximo 60 chars no theme. O angle explica o COMO do video.

Responda EXATAMENTE neste JSON (sem markdown): {"offTopic":false,"theme":"...","angle":"...","glossaryRef":"...ou null"}`;
}

async function transformViralToTopic(video, generateText) {
  const pillar = video.pillar || 'mindset';
  try {
    const raw = await generateText(buildViralPrompt(video.title, pillar), { maxTokens: 300, temperature: 0.7 });
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('LLM nao retornou JSON');
    const parsed = JSON.parse(jsonMatch[0]);
    if (parsed.offTopic === true || !parsed.theme) {
      console.log('  Viral "' + video.title + '" descartado (offTopic ou sem theme)');
      return null;
    }
    return {
      id: 'viral-' + video.videoId,
      theme: parsed.theme,
      // NUNCA deixar o angle vazio: em roteiro-short.js o bloco "ANGULO
      // EDITORIAL" do prompt e condicional, entao angle:'' faz a instrucao
      // SUMIR do prompt inteiro - e e justamente ela que impede o roteiro de
      // virar um "O que e X" generico (REGRA ANTI-CHATICE). O caminho de
      // keyword ja tem fallback textual; o viral precisa do mesmo.
      angle: parsed.angle || 'Transformar o conceito viral em cenario real, com numeros em BRL e um erro comum a evitar',
      pillar,
      source: 'viral',
      glossaryRef: parsed.glossaryRef === 'null' ? null : (parsed.glossaryRef || null),
      status: 'pending',
      viralRef: { videoId: video.videoId, title: video.title },
    };
  } catch (err) {
    console.error('  Viral "' + video.title + '" falhou: ' + err.message + ' - descartando (sem fallback)');
    return null;
  }
}

async function importViralTopics({ topicsData, existingIds, existingThemeSlugs, generateText, dryRun }) {
  const trends = loadTrends();
  const topVideos = Array.isArray(trends?.topVideos) ? trends.topVideos : [];
  if (topVideos.length === 0) {
    console.log('Nenhum video viral encontrado em youtube-trends.json.');
    return 0;
  }
  if (!generateText && !dryRun) {
    console.log('LLM indisponivel para o caminho viral - sem traducao segura, nao ha fallback.');
    return 0;
  }
  const published = loadPublished();
  const candidates = topVideos.filter((v) => {
    if (!v.videoId || !v.title) return false;
    if (existingIds.has('viral-' + v.videoId)) return false;
    if (published.has('viral-' + v.videoId)) return false;
    return true;
  });
  console.log('Virais no trends: ' + topVideos.length + ' | apos dedup: ' + candidates.length);
  // topVideos ja vem ordenado por viewsPerDay, entao o slice pega sempre os
  // MAIS virais do momento. Os que sobram NAO viram backlog: o youtube-trends
  // e regenerado toda semana pelo benchmark, e na proxima execucao a lista e
  // outra. Isso e proposital — queremos o que esta bombando agora, nao uma fila
  // envelhecida de virais de semanas atras.
  const slice = candidates.slice(0, VIRAL_MAX_PER_RUN);
  if (candidates.length > slice.length) {
    console.log((candidates.length - slice.length) + ' virais fora do cap desta execucao (nao viram backlog: o trends e regenerado semanalmente).');
  }
  if (dryRun) {
    if (slice.length > 0) {
      const first = slice[0];
      const pillar = first.pillar || 'mindset';
      console.log('\nPrompt do 1o candidato viral (dry-run, nada foi chamado nem gravado):\n');
      console.log(buildViralPrompt(first.title, pillar));
    } else {
      console.log('Nenhum candidato viral para exibir no dry-run.');
    }
    return 0;
  }
  let added = 0;
  for (const video of slice) {
    const topic = await transformViralToTopic(video, generateText);
    if (!topic) continue;
    const themeSlug = slugify(topic.theme);
    if (existingThemeSlugs.has(themeSlug)) { console.log('  Tema "' + topic.theme + '" ja existe (slug) - pulando'); continue; }
    if (existingIds.has(topic.id)) { console.log('  "' + topic.id + '" ja existe - pulando'); continue; }
    topicsData.topics.push(topic);
    existingIds.add(topic.id);
    existingThemeSlugs.add(themeSlug);
    added++;
    console.log('  Tema viral: "' + topic.theme + '"');
  }
  return added;
}

async function main() {
  console.log('Convertendo keywords em temas YouTube...\n');
  const generateText = await loadLLM();
  const queue = loadQueue();
  const topicsData = loadTopics();
  const existingIds = new Set(topicsData.topics.map((t) => t.id));
  const existingThemeSlugs = new Set(topicsData.topics.map((t) => slugify(t.theme || '')));
  let added = 0;

  if (DRY_RUN) {
    console.log('Dry-run: pulando o bloco de keywords (chama LLM) - so o viral e analisado.\n');
  } else {
    const pending = queue.filter((e) => e.status === 'pending');
    if (pending.length === 0) {
      console.log('Nenhuma keyword pending na fila.');
    } else {
      // Deduplicar ANTES de aplicar o cap (mesmo padrao do caminho viral) e,
      // sobretudo, deduplicar pelo criterio CERTO: `sourceKeyword`.
      //
      // Por que nao dava para usar o id do topic: o id e 'kw-' + slug do TEMA
      // gerado pelo LLM, e o prompt proibe que o tema repita a keyword — entao
      // 'kw-' + slug da keyword quase nunca bate com o id do topic que ela
      // gerou. Com o cap, isso viraria starvation: as 3 primeiras keywords
      // seriam reprocessadas toda semana (com tema diferente a cada vez, pois
      // temperature=0.7) e as demais nunca teriam vez.
      //
      // Por que NAO usamos markUsed() da keyword-queue, que seria o obvio: ela
      // grava status:'used' na fila DO BLOG, e o takeKeyword() dos geradores de
      // post filtra por 'pending'. O YouTube estaria roubando a keyword do
      // blog. As duas filas nao se misturam — regra dura do dono.
      const usedKeywordSlugs = new Set(
        topicsData.topics.map((t) => (t.sourceKeyword ? slugify(t.sourceKeyword) : null)).filter(Boolean)
      );
      const fresh = pending.filter((e) => !usedKeywordSlugs.has(slugify(e.keyword)) && !existingIds.has('kw-' + slugify(e.keyword)));
      const batch = fresh.slice(0, KEYWORD_MAX_PER_RUN);
      console.log('Keywords pending: ' + pending.length + ' | ineditas: ' + fresh.length + ' | processando ' + batch.length + ' nesta execucao');
      if (fresh.length > batch.length) {
        console.log((fresh.length - batch.length) + ' keywords ficam para as proximas execucoes (a fila e persistente, ao contrario do trends).');
      }
      for (const entry of batch) {
        console.log('  Convertendo: "' + entry.keyword + '"');
        const topic = await transformKeywordToTopic(entry.keyword, entry.category, generateText);
        if (!existingIds.has(topic.id)) {
          topicsData.topics.push(topic);
          existingIds.add(topic.id);
          existingThemeSlugs.add(slugify(topic.theme || ''));
          usedKeywordSlugs.add(slugify(entry.keyword)); // 2 entries com a mesma keyword no lote
          added++;
          console.log('  Tema: "' + topic.theme + '"');
        }
      }
    }
  }

  console.log('\nAnalisando virais do trends...');
  added += await importViralTopics({ topicsData, existingIds, existingThemeSlugs, generateText, dryRun: DRY_RUN });

  if (DRY_RUN) {
    console.log('\nDry-run: nada foi gravado.');
    return;
  }

  if (added > 0) { saveTopics(topicsData); console.log('\n' + added + ' temas adicionados (total: ' + topicsData.topics.length + ')'); }
  else { console.log('\nNenhum tema novo adicionado.'); }
}

main().catch((err) => { console.error('Erro: ' + err.message); process.exit(1); });
