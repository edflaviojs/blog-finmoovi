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
import { validateShortScript, BORDAO, VISUAL_TYPES } from './lib/schema-short.js';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const GLOSSARIO_DIR = join(process.cwd(), 'src', 'content', 'glossario');
const OUTPUT_DIR = join(dirname(fileURLToPath(import.meta.url)), 'output');

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

function buildPrompt(t) {
  return `Você é o roteirista do canal de YouTube do FinMoovi (finanças pessoais em PT-BR).
Crie o roteiro de um YOUTUBE SHORT (vídeo vertical, motion graphics, estilo rápido e direto tipo "Fireship") sobre o termo do glossário abaixo.

TERMO: "${t.term}"
DEFINIÇÃO: ${t.definition}
CONTEÚDO DE APOIO (use os números/exemplos reais daqui):
${t.body}

REGRAS OBRIGATÓRIAS (o roteiro é rejeitado se violar):
1. Duração total entre 45 e 55 segundos (soma dos durationSec das cenas).
2. Estrutura de cenas nesta ordem: 1 cena "hook" → 2 a 3 cenas "beat" → 1 cena "cta" → 1 cena "outro".
3. HOOK (cold open, 0-5s): quebre uma ilusão comum ("Se você acha que...") e FALE a palavra-chave "${t.term}" já na narração desta primeira cena. Termine em gancho seco. Proibido definição/enrolação.
4. É UMA HISTÓRIA SÓ: o vídeo desenvolve UM único assunto (o do gancho), aprofundando do hook até a CTA. Cada cena COMPLEMENTA e dá sequência à anterior — É PROIBIDO cada cena abrir um assunto novo/desconexo. Os BEATS explicam o PORQUÊ/COMO dos números (dê NEXO: a audiência tem que pensar "que informação útil e relevante!"), usando os valores reais do conteúdo de apoio.
5. CTA (penúltima cena, NUNCA no fim): recado rápido de valor indicando o app FinMoovi grátis OU a calculadora do blog. Volte imediatamente ao tom de conteúdo.
6. OUTRO (última cena, open loop): SEM "tchau/obrigado/até a próxima". Reflexão forte + gancho de curiosidade.
7. Insira EXATAMENTE 1 vez, ao longo do roteiro (de preferência num beat ou na CTA), o bordão do canal: "${BORDAO}"
8. "onScreenText": curtíssimo (máx ~40 caracteres), de preferência número/símbolo (R$, %, ×) — o texto na tela é mínimo.
9. "narration": conversa de amigo, leve e direta — NUNCA robótica nem publicitária. Frases CURTAS com RESPIRO (uma ideia por frase, separadas por ponto; não emende duas ideias sem pausa). A última frase de cada cena deve puxar naturalmente a próxima.
10. "visual.type" só pode ser um destes (motion graphics, SEM vídeo de estoque): ${VISUAL_TYPES.join(', ')}.
    - title = cartão de título · number = número gigante animado · chart = gráfico/simulação animada · list = itens revelados · formula = fórmula (ex.: regra dos 72) · statement = frase de impacto.

Responda APENAS com JSON válido (sem texto fora do JSON, sem markdown), neste formato exato:
{
  "slug": "${t.slug}",
  "term": "${t.term}",
  "category": "${t.category}",
  "keyword": "${t.term}",
  "scenes": [
    {
      "id": 1,
      "role": "hook",
      "narration": "…",
      "onScreenText": "…",
      "visual": { "type": "title", "note": "descrição curta do que anima em tela" },
      "durationSec": 5
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

async function generateScript(t, { retries = 2 } = {}) {
  const prompt = buildPrompt(t);
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    const raw = await generateText(prompt, { maxTokens: 2200, temperature: 0.6 });
    let script;
    try {
      script = extractJson(raw);
    } catch (err) {
      lastErr = `parse falhou (tentativa ${attempt}): ${err.message}`;
      console.log(`⚠️ ${lastErr} — regenerando...`);
      continue;
    }
    const { ok, errors, warnings } = validateShortScript(script);
    warnings.forEach(w => console.log(`   ⚠️ ${w}`));
    if (ok) return { script, warnings };
    lastErr = `validação falhou (tentativa ${attempt}): ${errors.join('; ')}`;
    console.log(`⚠️ ${lastErr} — regenerando...`);
  }
  throw new Error(lastErr || 'não foi possível gerar um roteiro válido');
}

async function main() {
  const slug = args.slug && args.slug !== true ? String(args.slug) : 'juros-compostos';
  console.log(`🎬 Roteirista de Short — termo: ${slug}\n`);

  const t = readTerm(slug);
  const { script, warnings } = await generateScript(t);

  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });
  const outPath = join(OUTPUT_DIR, `${slug}.script.json`);
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

main().catch(err => {
  console.error(`\n❌ ${err.message}`);
  process.exit(1);
});
