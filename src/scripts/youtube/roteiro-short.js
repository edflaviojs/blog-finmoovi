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
import { validateShortScript, BORDAO, VISUAL_TYPES, METAPHORS, ICONS, SFX } from './lib/schema-short.js';
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
  return `Você é um ROTEIRISTA CINEMATOGRÁFICO de finanças do canal FinMoovi (PT-BR): engaja, cria mistério, instiga emoção e prende a atenção do PRIMEIRO ao ÚLTIMO segundo. Escreve como uma CONVERSA DE AMIGO brasileiro — informal, fluido, com gírias leves — NUNCA formal, "escrito" ou robótico.
Crie o roteiro de um YOUTUBE SHORT (vertical, motion graphics) sobre o termo do glossário abaixo.

TERMO: "${t.term}"
DEFINIÇÃO: ${t.definition}
CONTEÚDO DE APOIO (use os números/exemplos reais daqui):
${t.body}

════════ REGRAS DE ESTRUTURA (o roteiro é rejeitado se violar) ════════
1. Duração total entre 45 e 55 segundos (soma dos durationSec das cenas).
2. Cenas nesta ordem: 1 "hook" → 2 a 3 "beat" → 1 "cta" → 1 "outro".
3. HOOK (cold open, 0-5s): gancho FORTE e EMOCIONAL que já FALA a palavra-chave "${t.term}" nos primeiros segundos (o YouTube transcreve a voz — obrigatório p/ SEO). Crie urgência/curiosidade e emende num exemplo. TOM (imite a energia, não copie): "Se você acha que ${t.term} é papo de rico… olha só esse número." Termine puxando o exemplo/número. Proibido definição/enrolação.
4. É UMA HISTÓRIA SÓ: o vídeo desenvolve UM único assunto (o do gancho), do hook até a CTA. Cada cena COMPLEMENTA a anterior — PROIBIDO abrir assunto novo/desconexo. Os BEATS explicam o PORQUÊ/COMO dos números (dê NEXO), com os valores reais do conteúdo de apoio.
5. CTA (penúltima cena, NUNCA no fim): recado rápido de valor indicando o app FinMoovi grátis OU a calculadora do blog. Volte já ao tom de conteúdo.
6. OUTRO (última cena, open loop): SEM "tchau/obrigado/até a próxima". Reflexão forte + gancho de curiosidade que puxa o PRÓXIMO vídeo. Preencha "nextVideoTitle" com o tema do próximo Short.
7. Insira EXATAMENTE 1 vez (de preferência num beat ou na CTA) o bordão do canal: "${BORDAO}"

════════ SHOTS — COREOGRAFIA POR PALAVRA (o coração do v3) ════════
O dono quer MUITO MOVIMENTO: "a cada 2-3 segundos muda a tela — gráficos, ícones, imagens". Cada cena tem "shots": um ARRAY de 1 a 6 visuais rápidos que ENTRAM na tela no exato momento em que a palavra-âncora é FALADA.

Um shot = { "anchor": "palavra", "visual": { "type": …, … }, "sfx": "…" (opcional) }.
- "anchor": uma palavra EXATA da narração DESTA cena. Os shots seguem a ORDEM em que as palavras são faladas.
- "visual.type" (só estes, motion graphics, SEM vídeo de estoque): ${VISUAL_TYPES.join(', ')}.
    · number = número gigante ("text": "R$ 500") · counter = número CORRENDO ("from", "to", "prefix": "R$") · chart = gráfico/barras/curva · icon = ícone ("icon" do catálogo) · metaphor = animação da metáfora ("metaphor" do catálogo) · statement = frase-soco ("text") · formula = fórmula (regra dos 72) · list = itens revelados.
- "icon" ∈ {${ICONS.join(', ')}}. "metaphor" ∈ {${METAPHORS.join(', ')}}. "sfx" ∈ {${SFX.join(', ')}}.
- "text" curtíssimo (≤40 chars). "note" = 1 linha de direção de arte.

REGRA A — RITMO (movimento constante): nenhum visual pode ficar parado mais de ~3s de narração. Na prática: no MÁXIMO ~8-10 palavras entre uma âncora e a próxima. Cena de 11s → ~3-5 shots.

REGRA B — SINCRONIA SEMÂNTICA (a mais importante — NUNCA viole): o visual de um shot só pode mostrar valores/ideias que estão sendo ditos NAQUELA âncora ou que JÁ foram ditos antes. NUNCA mostre um número/ideia ANTES da voz chegar nele.
  ✗ ERRADO: a voz diz "vejam esses 500 reais" e a tela já sobe um gráfico até 3,2 milhões (a voz ainda nem falou o resultado).
  ✓ CERTO: em "500 reais" o shot mostra 500; o counter/gráfico até 3,2 milhões só dispara na âncora onde a voz FALA "milhões".
  ✗ ERRADO: a voz diz "é aqui que a maioria escorrega" e já começa o gráfico de 25 anos (ainda não falou de idade).
  ✓ CERTO: o gráfico das idades 25 vs 35 só entra nas âncoras "25" e "35".

REGRA C — METÁFORAS LITERAIS (o dono AMA): quando a narração usar uma metáfora FÍSICA, crie um shot "metaphor" que ANIMA de verdade o que foi dito, com o "sfx" casado.
  · "que nem bola de neve descendo a ladeira" → metaphor "bola-neve" (bolinha rola e derruba algo), sfx "whoosh".
  · "vira uma avalanche" → metaphor "avalanche", sfx "avalanche" (neve caindo).
  · "é aqui que a maioria escorrega" → metaphor "escorregao", sfx "slide" (pode ser CÔMICO — o dono curte o humor no escorregão).
  PREFIRA usar na narração metáforas que existem no catálogo (${METAPHORS.join(', ')}); se usar outra, represente com um shot "icon" coerente.

REGRA D — SFX: TEMPERO, NÃO METRÔNOMO (feedback do dono: "tem muito som e ícone repetido, isso cansa"). Regras de variedade sonora:
  · SFX em NO MÁXIMO ~metade dos shots do vídeo inteiro — a maioria dos shots NÃO precisa de som, silêncio também é ritmo.
  · NUNCA repita o mesmo sfx em dois shots consecutivos (contando só entre os shots que TÊM som).
  · Ao longo do vídeo inteiro, use pelo menos 3-4 sons DIFERENTES do catálogo (${SFX.join(', ')}).
  · Para o "som do dinheiro" (contador subindo, valor em reais aparecendo), PREFIRA "kaching" (caixa registradora) — "coin" fica como alternativa leve, não os dois toda hora.
  · Em shots "statement"/"list"/"formula" (o texto surge digitado/revelado), combine com "typewriter" ou "keyboard" em vez de um sfx de dinheiro.

REGRA E — ÍCONES: NÃO REPITA (catálogo agora tem ${ICONS.length}: ${ICONS.join(', ')}). Cada ícone usado no vídeo aparece no MÁXIMO 1 vez — escolha o mais específico pro momento (ex.: "piggy" poupança, "bank" banco, "target" meta, "trophy" conquista, "bulb" ideia/insight, "hourglass" tempo passando, "wallet" carteira/gasto, "fire" urgência, "chart-down" queda/perda, "shield" proteção).

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

════════ INTRO (abertura disruptiva) ════════
"intro.frase" = frase de CURIOSIDADE que para o dedo, com as palavras de ÊNFASE marcadas entre *asteriscos* (o render dá destaque nelas). Ex.: "*Você ACREDITA* que R$ 500 podem virar *R$ 3,2 MILHÕES*???".
"intro.counter" = { "from", "to", "prefix" } — um contador que sobe do início ao resultado (ex.: 500 → 3200000). "from" < "to", números puros (sem pontos/símbolos).

Responda APENAS com JSON válido (sem texto fora do JSON, sem markdown), neste formato exato:
{
  "slug": "${t.slug}",
  "term": "${t.term}",
  "category": "${t.category}",
  "keyword": "${t.term}",
  "nextVideoTitle": "tema do próximo Short",
  "intro": {
    "frase": "*Você ACREDITA* que … *resultado-choque*???",
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
