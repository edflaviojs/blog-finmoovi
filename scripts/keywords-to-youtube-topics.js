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

function saveTopics(data) {
  mkdirSync(join(ROOT, '.github', 'data'), { recursive: true });
  writeFileSync(TOPICS_PATH, JSON.stringify(data, null, 2));
}

function slugify(text) {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

async function transformKeywordToTopic(keyword, category, generateText) {
  const pillar = CATEGORY_TO_PILLAR[category] || 'mindset';
  if (!generateText) {
    return { id: 'kw-' + slugify(keyword), theme: keyword.length > 60 ? keyword.slice(0, 57) + '...' : keyword, angle: 'Transformar "' + keyword + '" num video pratico com numeros reais e exemplos do dia-a-dia', pillar, source: 'keyword-queue', glossaryRef: null, status: 'pending' };
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

Responda EXATAMENTE neste formato JSON (sem markdown, sem comentarios):
{"theme":"...","angle":"...","glossaryRef":"...ou null"}

glossaryRef = slug do termo do glossario que serve de base ou null.`;
  try {
    const raw = await generateText(prompt, { maxTokens: 300, temperature: 0.7 });
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('LLM nao retornou JSON');
    const parsed = JSON.parse(jsonMatch[0]);
    return { id: 'kw-' + slugify(parsed.theme || keyword), theme: parsed.theme || keyword, angle: parsed.angle || 'Abordar "' + keyword + '" de forma pratica com numeros reais', pillar, source: 'keyword-queue', glossaryRef: parsed.glossaryRef === 'null' ? null : (parsed.glossaryRef || null), status: 'pending' };
  } catch (err) {
    console.error('  LLM falhou para "' + keyword + '": ' + err.message + ' - usando fallback');
    return { id: 'kw-' + slugify(keyword), theme: keyword.length > 60 ? keyword.slice(0, 57) + '...' : keyword, angle: 'Transformar "' + keyword + '" num video pratico com numeros reais', pillar, source: 'keyword-queue', glossaryRef: null, status: 'pending' };
  }
}

async function main() {
  console.log('Convertendo keywords em temas YouTube...\n');
  const generateText = await loadLLM();
  const queue = loadQueue();
  const topicsData = loadTopics();
  const existingIds = new Set(topicsData.topics.map((t) => t.id));
  const pending = queue.filter((e) => e.status === 'pending');
  if (pending.length === 0) { console.log('Nenhuma keyword pending na fila.'); return; }
  console.log('Keywords pending: ' + pending.length);
  let added = 0;
  for (const entry of pending) {
    const tentativeId = 'kw-' + slugify(entry.keyword);
    if (existingIds.has(tentativeId)) { console.log('  "' + entry.keyword + '" ja existe - pulando'); continue; }
    console.log('  Convertendo: "' + entry.keyword + '"');
    const topic = await transformKeywordToTopic(entry.keyword, entry.category, generateText);
    if (!existingIds.has(topic.id)) { topicsData.topics.push(topic); existingIds.add(topic.id); added++; console.log('  Tema: "' + topic.theme + '"'); }
  }
  if (added > 0) { saveTopics(topicsData); console.log('\n' + added + ' temas adicionados (total: ' + topicsData.topics.length + ')'); }
  else { console.log('\nNenhum tema novo adicionado.'); }
}

main().catch((err) => { console.error('Erro: ' + err.message); process.exit(1); });
