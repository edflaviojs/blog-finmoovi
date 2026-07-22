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
import { validateShortScript, sanitizeScript, BORDAO, VISUAL_TYPES, METAPHORS, ICONS, SFX, MAX_SFX_REPEATS, APP_SCREENS } from './lib/schema-short.js';
import { readFileSync, writeFileSync, mkdirSync, existsSync, realpathSync } from 'fs';
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
export function loadRecentPublishedContext({ publishedPath = PUBLISHED_PATH, outputDir = OUTPUT_DIR, limit = 3 } = {}) {
  let published;
  try {
    published = JSON.parse(readFileSync(publishedPath, 'utf-8'));
  } catch {
    return [];
  }
  const recent = Object.entries(published || {})
    .filter(([, v]) => v && v.uploadedAt)
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
    for (const s of scenes) {
      const shots = Array.isArray(s && s.shots) ? s.shots : [];
      for (const sh of shots) {
        const v = sh && sh.visual;
        if (v && v.type === 'metaphor' && v.metaphor) {
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
 * repeti-los. Se estourar 900 chars, trunca as frases-história primeiro (as menos
 * críticas); backstop = corte duro. Retorna '' se não houver vídeo anterior.
 */
export function buildAntiRepetitionBlock(context) {
  const list = (context || []).filter(Boolean);
  if (list.length === 0) return '';
  const MAX = 900;
  const render = (storyCap) => {
    const parts = list.map((c, i) => {
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
    return `🚫 ANTI-REPETIÇÃO — os vídeos anteriores do canal usaram: ${parts.join(' ')}. É PROIBIDO: repetir o MESMO estilo de intro do vídeo mais recente; reutilizar qualquer uma dessas metáforas principais; repetir ou parafrasear essas frases/histórias. Crie uma intro com formato DIFERENTE e um momento-história NOVO, com exemplo original adaptado ao tema deste termo.`;
  };
  let block = render(0); // 0 = sem corte nas frases-história
  if (block.length <= MAX) return block;
  for (const cap of [90, 70, 50, 30]) {
    block = render(cap);
    if (block.length <= MAX) return block;
  }
  return `${block.slice(0, MAX - 1).trimEnd()}…`;
}

function buildPrompt(t, antiRep = '') {
  return `Você é um ROTEIRISTA CINEMATOGRÁFICO de finanças do canal FinMoovi (PT-BR): engaja, cria mistério, instiga emoção e prende a atenção do PRIMEIRO ao ÚLTIMO segundo. Escreve como uma CONVERSA DE AMIGO brasileiro — informal, fluido, com gírias leves — NUNCA formal, "escrito" ou robótico.
Crie o roteiro de um YOUTUBE SHORT (vertical, motion graphics) sobre o termo do glossário abaixo.

TERMO: "${t.term}"
DEFINIÇÃO: ${t.definition}
CONTEÚDO DE APOIO (use os números/exemplos reais daqui):
${truncateBody(t.body)}
${antiRep ? `\n${antiRep}\n` : ''}
════════ REGRAS DE ESTRUTURA (o roteiro é rejeitado se violar) ════════
⚠️ os valores/números que aparecem nos EXEMPLOS destas regras (R$ 500, R$ 3,2 milhões, 25/35 anos etc.) pertencem a OUTRO vídeo — é PROIBIDO usá-los; use SOMENTE números reais do CONTEÚDO DE APOIO do termo atual ("${t.term}").
1. Duração total entre 45 e 55 segundos (soma dos durationSec das cenas).
2. Cenas nesta ordem: 1 "hook" → 2 a 3 "beat" → 1 "cta" → 1 "outro".
3. HOOK (cold open, 0-5s): gancho FORTE e EMOCIONAL que já FALA a palavra-chave "${t.term}" nos primeiros segundos (o YouTube transcreve a voz — obrigatório p/ SEO). Crie urgência/curiosidade e emende num exemplo. TOM (EXEMPLO de formato — NUNCA copie os valores; imite só a energia): "Se você acha que ${t.term} é papo de rico… olha só esse número." Termine puxando o exemplo/número. Proibido definição/enrolação.
4. É UMA HISTÓRIA SÓ: o vídeo desenvolve UM único assunto (o do gancho), do hook até a CTA. Cada cena COMPLEMENTA a anterior — PROIBIDO abrir assunto novo/desconexo. Os BEATS explicam o PORQUÊ/COMO dos números (dê NEXO), com os valores reais do conteúdo de apoio.
5. CTA (penúltima cena, NUNCA no fim): recado rápido de valor indicando o app FinMoovi grátis OU a calculadora do blog. Volte já ao tom de conteúdo.
6. OUTRO (última cena, open loop): SEM "tchau/obrigado/até a próxima". Reflexão forte + gancho de curiosidade que puxa o PRÓXIMO vídeo. Preencha "nextVideoTitle" com o tema do próximo Short.
7. Insira EXATAMENTE 1 vez (de preferência num beat ou na CTA) o bordão do canal: "${BORDAO}"
8. NARRAÇÃO — diga sempre "vídeo", NUNCA "Short"/"Shorts": é sempre "te explico no próximo vídeo", jamais "no próximo short" (a hashtag #Shorts fica só nos metadados do upload, nunca na fala).

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
  · sempre que a narração mandar CLICAR/TOCAR no link (tipicamente na CTA): metaphor "clique-link" (uma mãozinha/cursor percorre a tela, acha o botão do link e CLICA), sfx "click", na âncora onde isso é dito.
  PREFIRA usar na narração metáforas que existem no catálogo (${METAPHORS.join(', ')}); se usar outra, represente com um shot "icon" coerente.
  SIGNIFICADO das metáforas (escolha a que NASCE do tema deste vídeo): bola-neve=efeito cumulativo que cresce; avalanche=o acúmulo virando algo enorme; escorregao=erro/tropeço comum; clique-link=clicar no link (CTA); foguete=decolagem/crescimento rápido; semente=paciência/longo prazo; montanha-russa=volatilidade/altos e baixos; bolha=expectativa que estoura; ralo=dinheiro escorrendo/taxas.
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

REGRA H — MOMENTO-HISTÓRIA (o padrão-ouro do canal — regra do dono 22/07 depois de ver o vídeo v3.3: sobre a passagem "É dar tempo pro dinheiro se multiplicar sozinho. Que nem bola de neve descendo a ladeira: começa pequena… e vira uma avalanche", ele disse que "ficou perfeita — é isso que eu quero ver mais"): TODO Short precisa ter PELO MENOS 1 momento-história — uma MINI-HISTÓRIA FÍSICA contada na narração E animada de VERDADE, do início ao fim, em ≥2 shots "metaphor" CONECTADOS (a MESMA história continuando de um shot pro outro — nunca metáforas soltas/desconexas), com "sfx" batendo com a ação de cada etapa.
  EXEMPLO CANÔNICO (o padrão a seguir, aprovado pelo dono): "É dar tempo pro dinheiro se multiplicar sozinho. Que nem bola de neve descendo a ladeira: começa pequena… e vira uma avalanche." → shot 1 metaphor "bola-neve" (bolinha rola e cresce descendo a ladeira, sfx "whoosh") + shot 2 metaphor "avalanche" (a mesma bola vira avalanche e derruba tudo, sfx "avalanche") — DUAS etapas da MESMA história física, uma continuando a outra.
  Use esse molde: escolha (ou, se precisar, invente e represente com um "icon" coerente) uma metáfora física com começo-meio-fim que narre o PORQUÊ/COMO do assunto da cena, e anime-a de verdade em ≥2 shots seguidos que dão continuidade um ao outro.
  ⚠️ A história é SEMPRE ORIGINAL e específica do tema — o DISPOSITIVO (contar uma mini-história física) se repete todo vídeo, mas o EXEMPLO/história NUNCA. A metáfora escolhida deve NASCER do assunto (ex.: ações → montanha-russa; taxas/tarifas → ralo; crescimento rápido → foguete; longo prazo → semente; hype que estoura → bolha), jamais a mesma metáfora nem o mesmo exemplo dos vídeos anteriores (ver ANTI-REPETIÇÃO).

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
"intro.frase" = frase de CURIOSIDADE que para o dedo, com as palavras de ÊNFASE marcadas entre *asteriscos* (o render dá destaque nelas). NÃO siga sempre o mesmo molde de frase — VARIE a construção (pergunta, desafio, afirmação chocante, contagem); NÃO abra todo vídeo com "Você acredita que…". Ex. (EXEMPLO de formato — NUNCA copie os valores NEM a construção, use os números reais de "${t.term}"): "*Você ACREDITA* que R$ 500 podem virar *R$ 3,2 MILHÕES*???".
"intro.style" = classifique em UMA palavra o FORMATO da sua frase de intro: "pergunta", "desafio", "afirmacao" (afirmação chocante) ou "contagem". PRECISA ser DIFERENTE do estilo do vídeo mais recente (ver ANTI-REPETIÇÃO).
"intro.counter" = { "from", "to", "prefix" } — um contador que sobe do início ao resultado (ex., EXEMPLO de formato — NUNCA copie os valores: 500 → 3200000). "from" < "to", números puros (sem pontos/símbolos), usando os números reais do termo atual.

Responda APENAS com JSON válido (sem texto fora do JSON, sem markdown), neste formato exato:
{
  "slug": "${t.slug}",
  "term": "${t.term}",
  "category": "${t.category}",
  "keyword": "${t.term}",
  "nextVideoTitle": "tema do próximo Short",
  "intro": {
    "style": "pergunta",
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

// Monta o bloco corretivo anexado ao prompt na tentativa SEGUINTE a uma
// validação reprovada: lista os erros EXATOS do validador (obrigatórios) e até
// ~5 avisos como melhorias opcionais. O prompt-base continua sendo enviado.
// Limite total ~1200 chars: corta os avisos primeiro (menos críticos) e só
// depois os erros, se ainda faltar espaço — outro contribuinte pro 413 do Groq.
function buildCorrectiveBlock(errors, warnings) {
  const MAX_CHARS = 1200;
  const header = '⚠️ SUA TENTATIVA ANTERIOR FOI REJEITADA. Corrija EXATAMENTE estes erros e gere o roteiro completo novamente:';
  const errorLines = errors.map(e => `- ${e}`);
  let lines = [header, ...errorLines];

  const topWarnings = (warnings || []).slice(0, 5);
  if (topWarnings.length) {
    const withWarnings = [...lines, 'melhore também:', ...topWarnings.map(w => `- ${w}`)];
    if (withWarnings.join('\n').length <= MAX_CHARS) lines = withWarnings;
  }

  let block = lines.join('\n');
  if (block.length > MAX_CHARS) {
    // ainda estourou só com os erros: trunca o bloco inteiro na fronteira do limite
    block = `${block.slice(0, MAX_CHARS)}… (trecho)`;
  }
  return block;
}

async function generateScript(t, { retries = 4, antiRep = '' } = {}) {
  const basePrompt = buildPrompt(t, antiRep);
  let lastErr;
  let corrective = ''; // bloco corretivo acumulado da última reprovação de validação
  for (let attempt = 1; attempt <= retries; attempt++) {
    const prompt = corrective ? `${basePrompt}\n\n${corrective}` : basePrompt;
    // modelos raciocinadores (gpt-oss-120b) gastam tokens "pensando" antes do
    // JSON — 2200 asfixiava e devolvia resposta vazia (HTTP 200, content vazio).
    const raw = await generateText(prompt, { maxTokens: 6000, temperature: 0.6 });
    let script;
    try {
      script = extractJson(raw);
    } catch (err) {
      lastErr = `parse falhou (tentativa ${attempt}): ${err.message}`;
      console.log(`⚠️ ${lastErr} — regenerando...`);
      corrective = ''; // falha de parse: mantém o comportamento atual (mesmo prompt-base)
      continue;
    }
    // Resgata quase-erros óbvios (sfx/icon/anchor/totalDurationSec) antes de validar
    sanitizeScript(script);
    const { ok, errors, warnings } = validateShortScript(script);
    warnings.forEach(w => console.log(`   ⚠️ ${w}`));
    if (ok) return { script, warnings };
    lastErr = `validação falhou (tentativa ${attempt}): ${errors.join('; ')}`;
    console.log(`⚠️ ${lastErr} — regenerando...`);
    // Próxima tentativa recebe o prompt-base + correção pontual dos erros
    corrective = buildCorrectiveBlock(errors, warnings);
  }
  throw new Error(lastErr || 'não foi possível gerar um roteiro válido');
}

async function main() {
  const slug = args.slug && args.slug !== true ? String(args.slug) : 'juros-compostos';
  console.log(`🎬 Roteirista de Short — termo: ${slug}\n`);

  const t = readTerm(slug);

  // ANTI-REPETIÇÃO (v3.5): carrega os vídeos anteriores e injeta o bloco no prompt.
  const recent = loadRecentPublishedContext();
  const antiRep = buildAntiRepetitionBlock(recent);
  if (antiRep) console.log(`🚫 Anti-repetição ativa: ${recent.length} vídeo(s) anterior(es) no contexto (${recent.map(r => r.slug).join(', ')}).\n`);

  const { script, warnings } = await generateScript(t, { antiRep });

  // Aviso (não-erro) se o estilo de intro repetir o do vídeo mais recente. Optei
  // por checar aqui (em vez de passar previousIntroStyle p/ validateShortScript):
  // é a opção mais limpa — o contexto já está carregado neste escopo e mantém a
  // assinatura de validateShortScript intocada (schema-short.js só ganhou o passo
  // do sanitizador). O validador continua puramente estrutural, sem estado externo.
  const prevStyle = recent[0] && recent[0].style;
  const curStyle = script.intro && script.intro.style;
  if (prevStyle && curStyle && String(curStyle).trim().toLowerCase() === String(prevStyle).trim().toLowerCase()) {
    console.log(`   ⚠️ intro.style "${curStyle}" é IGUAL ao do vídeo mais recente — o ideal é variar o formato da intro (pergunta/desafio/afirmacao/contagem).`);
  }

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

// Só executa main() quando o arquivo é o ponto de entrada (node roteiro-short.js).
// Quando importado (ex.: pelo teste unitário do bloco anti-repetição), as funções
// exportadas ficam disponíveis sem disparar a geração/LLM.
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
