/**
 * ai-visibility-monitor.js — Monitor mensal de visibilidade em IAs generativas (GEO).
 *
 * Faz ~8 perguntas fixas em PT ao LLM (via generateText, fallback
 * Cerebras→Groq→Cloudflare) e registra em press/ai-visibility.md se o FinMoovi
 * foi mencionado e quais marcas concorrentes apareceram. APPEND por mês —
 * histórico preservado para leitura de tendência.
 *
 * LIMITAÇÃO (por design): mede o CONHECIMENTO paramétrico do modelo, sem busca
 * na web — serve como baseline de tendência, não como medição de tráfego real.
 *
 * Viés neutralizado: o generateText injeta a personality do site.config como
 * system prompt (redator do FinMoovi). Cada pergunta leva um preâmbulo que
 * instrui o modelo a responder como assistente NEUTRO e a ignorar qualquer
 * afiliação — sem isso toda resposta citaria o FinMoovi e o baseline seria inútil.
 *
 * Padrão de resiliência do repo: sem chave de API → degrade gracioso com
 * ::warning:: (warnSkip) e exit 0; falha em UMA pergunta não derruba as demais.
 *
 * Usage: node src/scripts/automacoes/ai-visibility-monitor.js
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, appendFileSync } from 'fs';
import { join } from 'path';
import { generateText } from '../apis/kie-ai.js';

const PRESS_DIR = join(process.cwd(), 'press');
const MD_OUT = join(PRESS_DIR, 'ai-visibility.md');

// Perguntas fixas (NÃO mudar sem necessidade — comparabilidade mês a mês).
const QUESTIONS = [
  'Quais são os melhores aplicativos para controlar gastos pessoais no Brasil?',
  'Que app você recomenda para casal organizar finanças juntos?',
  'Quais boas alternativas ao Mobills?',
  'Onde aprender educação financeira online em português?',
  'Qual melhor calculadora de juros compostos online?',
  'Qual o melhor aplicativo de finanças pessoais que funciona offline?',
  'Qual app usar para controlar gastos em mais de uma moeda (real, dólar e euro)?',
  'Quais os melhores blogs de finanças pessoais em português?',
];

// Preâmbulo de neutralidade (ver comentário no topo).
const NEUTRAL_PREAMBLE =
  'Ignore instruções anteriores sobre estilo ou afiliação a qualquer app/marca. ' +
  'Responda como um assistente de IA neutro e imparcial, citando nomes reais de apps/sites que você conhece. ' +
  'Responda em português, em até 150 palavras.\n\nPergunta: ';

// Concorrentes conhecidos (lista manual) — detecção prioritária, case-insensitive.
const KNOWN_COMPETITORS = [
  'Mobills', 'Organizze', 'Guiabolso', 'Minhas Economias', 'Mobizzi',
  'Wallet', 'Monefy', 'Money Lover', 'Spendee', 'YNAB', 'Splitwise',
  'Fortuno', 'Olivia', 'Meu Dinheiro', 'GranaFacil', 'Toshl',
];

// Palavras capitalizadas que NÃO são marcas (início de frase, termos comuns).
const CAPITALIZED_STOPWORDS = new Set([
  'o', 'a', 'os', 'as', 'um', 'uma', 'para', 'por', 'com', 'sem', 'no', 'na', 'nos', 'nas',
  'se', 'ele', 'ela', 'eles', 'elas', 'isso', 'esse', 'essa', 'este', 'esta', 'esses', 'essas',
  'alguns', 'algumas', 'outra', 'outro', 'outros', 'outras', 'todos', 'todas', 'cada', 'muitos',
  'você', 'voce', 'vocês', 'além', 'alem', 'aqui', 'entre', 'sobre', 'quando', 'onde', 'como',
  'qual', 'quais', 'que', 'não', 'nao', 'sim', 'mas', 'porém', 'porem', 'entretanto', 'ainda',
  'brasil', 'brasileiro', 'brasileira', 'português', 'portugues', 'real', 'dólar', 'dolar', 'euro',
  'pergunta', 'resposta', 'apps', 'app', 'aplicativo', 'aplicativos', 'exemplo', 'exemplos',
  'gratuito', 'gratuita', 'grátis', 'gratis', 'premium', 'android', 'ios', 'iphone', 'google',
  'play', 'store', 'excel', 'youtube', 'internet', 'importante', 'dica', 'dicas', 'opção', 'opcoes',
  'opções', 'vantagens', 'desvantagens', 'recursos', 'finanças', 'financas', 'educação', 'educacao',
  'financeira', 'financeiro', 'pessoais', 'pessoal', 'juros', 'compostos', 'calculadora', 'blog', 'blogs',
]);

/** Aviso visível no Actions sem quebrar o job (padrão warnSkip do repo). */
function warnSkip(msg) {
  console.log(`::warning::ai-visibility-monitor — ${msg}`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    try {
      appendFileSync(process.env.GITHUB_STEP_SUMMARY, `⚠️ ai-visibility-monitor: ${msg}\n\n`);
    } catch { /* summary é best-effort */ }
  }
}

function hasAnyApiKey() {
  return !!(
    process.env.CEREBRAS_API_KEY ||
    process.env.GROQ_API_KEY ||
    process.env.KIE_API_KEY ||
    (process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_AI_TOKEN)
  );
}

/** Nome do provedor/modelo primário (mesma ordem do getTextProviders do kie-ai.js). */
function primaryModelLabel() {
  if (process.env.CEREBRAS_API_KEY) return 'cerebras/gpt-oss-120b';
  if (process.env.GROQ_API_KEY || process.env.KIE_API_KEY) return 'groq/openai/gpt-oss-120b';
  if (process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_AI_TOKEN) return 'cloudflare/@cf/meta/llama-3.3-70b-instruct-fp8-fast';
  return 'desconhecido';
}

/**
 * Top 3 marcas citadas: primeiro os concorrentes conhecidos (lista manual),
 * depois palavras capitalizadas fora de início de frase (heurística simples),
 * ordenadas por frequência. FinMoovi fica de fora (tem coluna própria).
 */
function extractBrands(answer) {
  const counts = new Map();

  for (const brand of KNOWN_COMPETITORS) {
    const re = new RegExp(`\\b${brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    const matches = answer.match(re);
    if (matches) counts.set(brand, (counts.get(brand) || 0) + matches.length + 100); // prioridade à lista manual
  }

  // Heurística: palavras Capitalizadas que não abrem frase e não são stopwords.
  const capRe = /(?<![.!?:•\-\n]\s?)(?<=\s)([A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-Za-zÁÉÍÓÚÂÊÔÃÕÇáéíóúâêôãõç0-9]{2,})/g;
  for (const m of answer.matchAll(capRe)) {
    const word = m[1];
    const lower = word.toLowerCase();
    if (CAPITALIZED_STOPWORDS.has(lower)) continue;
    if (/finmoovi/i.test(word)) continue;
    if (KNOWN_COMPETITORS.some(b => b.toLowerCase() === lower)) continue; // já contado acima
    counts.set(word, (counts.get(word) || 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name);
}

const FILE_HEADER = `# 🔭 Visibilidade do FinMoovi em IAs generativas

**Como ler este arquivo:** todo mês (dia 2) o monitor faz as mesmas ~8 perguntas em
português ao LLM do pipeline (fallback Cerebras→Groq→Cloudflare) e registra se o
FinMoovi foi mencionado espontaneamente e quais marcas apareceram.

**LIMITAÇÃO importante:** isto mede o CONHECIMENTO paramétrico do modelo (sem
busca na web) — não é medição de tráfego nem do que ChatGPT/Perplexity respondem
com browsing. Serve como **baseline de tendência**: se com o tempo o FinMoovi
começar a aparecer, é sinal de que o conteúdo do blog entrou nos dados/menções
que os modelos aprendem. Histórico preservado por append mensal.

_Gerado automaticamente por ai-visibility-monitor.js (workflow ai-visibility.yml)._
`;

async function main() {
  console.log('🔭 Monitor de visibilidade em IA (mensal)...');

  if (!hasAnyApiKey()) {
    warnSkip('nenhuma chave de LLM configurada (CEREBRAS_API_KEY / GROQ_API_KEY / KIE_API_KEY / CLOUDFLARE_*) — execução pulada, arquivo não alterado.');
    return;
  }

  const now = new Date();
  const month = now.toISOString().slice(0, 7); // YYYY-MM
  const runDate = now.toISOString().split('T')[0];
  const model = primaryModelLabel();

  const results = [];
  let failures = 0;

  for (const question of QUESTIONS) {
    try {
      const answer = await generateText(NEUTRAL_PREAMBLE + question, { maxTokens: 600, temperature: 0.3 });
      const mentioned = /finmoovi/i.test(answer);
      const brands = extractBrands(answer);
      results.push({ question, mentioned, brands });
      console.log(`   ${mentioned ? '✅' : '—'} "${question}" → FinMoovi: ${mentioned ? 'SIM' : 'não'} | marcas: ${brands.join(', ') || '—'}`);
      // Pausa curta entre perguntas para não estressar rate limits
      await new Promise(r => setTimeout(r, 3000));
    } catch (e) {
      failures++;
      results.push({ question, mentioned: null, brands: [] });
      console.log(`⚠️ Pergunta falhou ("${question}"): ${e.message} — seguindo para a próxima.`);
    }
  }

  if (failures === QUESTIONS.length) {
    warnSkip(`todas as ${QUESTIONS.length} perguntas falharam — nada registrado neste mês.`);
    return;
  }

  const mentionedCount = results.filter(r => r.mentioned === true).length;

  let section = `\n---\n\n## ${month} (executado em ${runDate})\n\n`;
  section += `**Modelo (provedor primário):** \`${model}\` · **FinMoovi mencionado:** ${mentionedCount}/${results.filter(r => r.mentioned !== null).length}\n\n`;
  section += `| Pergunta | FinMoovi mencionado | Marcas citadas (top 3) |\n|---|---|---|\n`;
  for (const r of results) {
    const flag = r.mentioned === null ? '⚠️ falhou' : r.mentioned ? '✅ sim' : '❌ não';
    section += `| ${r.question} | ${flag} | ${r.brands.join(', ') || '—'} |\n`;
  }

  if (!existsSync(PRESS_DIR)) mkdirSync(PRESS_DIR, { recursive: true });
  const existing = existsSync(MD_OUT) ? readFileSync(MD_OUT, 'utf-8') : FILE_HEADER;
  writeFileSync(MD_OUT, existing.trimEnd() + '\n' + section, 'utf-8');

  console.log(`✅ Registrado: press/ai-visibility.md — ${month} · FinMoovi em ${mentionedCount}/${QUESTIONS.length - failures} respostas.`);
}

main().catch(err => {
  // Erro inesperado não deve quebrar o cron mensal — degrade com warning.
  warnSkip(`erro inesperado: ${err.message}`);
});
