/**
 * YouTube — Upload automático de Short (F1.4 — IMPLEMENTACAO20).
 *
 * Sobe o MP4 renderizado (youtube-render/out/<slug>.mp4) ao canal FinMoovi via
 * YouTube Data API v3 (REST puro, sem googleapis), com:
 *   - metadados gerados por LLM grátis (título/descrição/hashtags/tags) a partir
 *     do roteiro (<slug>.script.json). FALLBACK determinístico se o LLM falhar —
 *     nunca bloqueia o upload;
 *   - upload resumível (initiate + PUT dos bytes);
 *   - 3 faixas de legenda (captions.insert) a partir dos SRTs pt/en/es;
 *   - dedup + tracking em .github/data/youtube-published.json.
 *
 * ✅ AUDITORIA GOOGLE APROVADA (03/08/2026) → o upload já sobe PÚBLICO. Não há
 * mais o passo manual de publicar no YouTube Studio: o que o robô manda, vai ao ar.
 *
 * Segredos (env, só no CI): YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET,
 * YOUTUBE_REFRESH_TOKEN. LLM: CEREBRAS_API_KEY / GROQ_API_KEY / CLOUDFLARE_*.
 *
 * Uso:
 *   node src/scripts/youtube/upload-short.js --slug=juros-compostos
 *   node src/scripts/youtube/upload-short.js --slug=juros-compostos --dry-run
 */

import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { getTitlePatterns } from '../lib/youtube-marketing.js';
// ⚠️ A descrição passa a LER a licença da trilha em vez de alguém se lembrar dela.
// Ver `lib/musica.js`: se a faixa exigir crédito, ele entra sozinho; se não exigir,
// desaparece sozinho. Foi por não haver isto que 9 vídeos foram ao ar sem creditar.
import { creditoDaMusica, TRILHA } from './lib/musica.js';
import { caminhoDaCapaLarga } from './capa-short.js';
import { textoDoPrimeiroComentario, escreverPrimeiroComentario } from './lib/primeiro-comentario.js';

// ─── caminhos ────────────────────────────────────────────────────────────────
const ROOT = process.cwd();
const SCRIPT_DIR = join(ROOT, 'src', 'scripts', 'youtube', 'output');
const MP4_DIR = join(ROOT, 'youtube-render', 'out');
const AUDIO_ROOT = join(ROOT, 'youtube-render', 'public', 'audio');
const TRACKING = join(ROOT, '.github', 'data', 'youtube-published.json');

// Links fixos (a calculadora do blog e o app).
const BLOG_TOOLS_URL = 'https://blog.finmoovi.com/ferramentas/';
const APP_URL = 'https://finmoovi.com';
const BLOG_URL = 'https://blog.finmoovi.com/';

// A palavra é a MESMA que a narração diz e que a pastilha do ecrã mostra —
// "FINMOOVI", em maiúsculas. É por ela que o robô de respostas procura os
// comentários, por isso mudá-la aqui obriga a mudá-la nos outros dois sítios.
const CTA_COMENTARIO = '👉 Comenta FINMOOVI aqui embaixo que eu te mando o app.';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const UPLOAD_URL = 'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status';
const CAPTIONS_URL = 'https://www.googleapis.com/upload/youtube/v3/captions?part=snippet&uploadType=multipart';
const THUMBNAIL_URL = 'https://www.googleapis.com/upload/youtube/v3/thumbnails/set?uploadType=media&videoId=';

/**
 * A MINIATURA — mesma conversa que o vídeo longo já tem com o YouTube.
 * O ficheiro chega pronto no artefato da produção (ver `capa-short.js`).
 */
async function meterCapa(chave, videoId, caminhoJpg) {
  const bytes = readFileSync(caminhoJpg);
  const r = await fetch(`${THUMBNAIL_URL}${encodeURIComponent(videoId)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${chave}`,
      'Content-Type': 'image/jpeg',
      'Content-Length': String(bytes.length),
    },
    body: bytes,
  });
  if (!r.ok) throw new Error(`${r.status}: ${(await r.text().catch(() => '')).slice(0, 200)}`);
  return true;
}

const CAPTION_LANGS = [
  { code: 'pt', language: 'pt-BR', name: 'Português (Brasil)' },
  { code: 'en', language: 'en', name: 'English' },
  { code: 'es', language: 'es', name: 'Español' },
];

// ─── args ────────────────────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => {
    const [k, ...v] = a.slice(2).split('=');
    return [k, v.join('=') || true];
  }),
);
const SLUG = args.slug && args.slug !== true ? String(args.slug) : 'juros-compostos';
const DRY_RUN = Boolean(args['dry-run']);

// ─── util ────────────────────────────────────────────────────────────────────
function log(msg) { console.log(msg); }

/**
 * Os tópicos, um por linha, limpos.
 * A IA gosta de os entregar já com traços, pontos ou números a abrir — e nós pomos
 * o nosso marcador por cima. Dois marcadores na mesma linha são a assinatura de um
 * texto montado por máquina que ninguém releu.
 * Descarta linhas curtas demais (restos) e compridas demais (parágrafos disfarçados).
 */
function limparTopicos(bruto) {
  return String(bruto || '')
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*[-•*·–—\d.)\]]+\s*/, '').trim())
    .filter((l) => l.length >= 8 && l.length <= 90)
    .slice(0, 3);
}

// Remove <,> (o YouTube rejeita), colapsa espaços e corta no limite.
function sanitizeText(s, max) {
  const clean = String(s || '').replace(/[<>]/g, '').replace(/\r/g, '').trim();
  return max ? clean.slice(0, max) : clean;
}

// Preposições/artigos PT que só são descartados quando aparecem SOZINHOS
// (uma hashtag de 1 palavra só); dentro de uma frase multi-palavra eles ficam
// (viram parte do CamelCase), pra não quebrar o sentido da frase.
const PT_STOPWORDS = new Set(['de', 'em', 'com', 'para', 'e', 'o', 'a', 'do', 'da']);

// Primeira letra em maiúscula, sem tocar no resto (siglas como CDB ficam iguais).
function maiusculaInicial(s) {
  const t = String(s || '');
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
}

// Divide uma frase em palavras (letras/números unicode), sem stripar acentos.
function splitWords(s) {
  return String(s || '').split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}

// Nenhuma hashtag deste canal precisa de mais do que isto. Acima daqui não é
// uma hashtag: é uma LISTA que veio colada e que, em CamelCase, produz o
// monstro que foi ao ar em 28/07 — "#ControleFinanceiroDívidasPlanejamento
// Financeiro". Ninguém procura por isso, e ocupa o lugar de 3 hashtags boas.
const MAX_PALAVRAS_HASHTAG = 4;

// Constrói UM hashtag em CamelCase (token único, mantém acentos) a partir de
// uma frase/tag crua — ex.: "investimento em ações" → "#InvestimentoEmAções".
// Frases de 1 palavra só que sejam stopword PT (ex.: "em") são descartadas.
function buildHashtag(raw) {
  const body = String(raw || '').replace(/^#+/, '').trim();
  if (!body) return '';
  const words = splitWords(body);
  if (!words.length) return '';
  if (words.length > MAX_PALAVRAS_HASHTAG) return '';
  if (words.length === 1 && PT_STOPWORDS.has(words[0].toLowerCase())) return '';
  const camel = words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('');
  return camel ? `#${camel}` : '';
}

/**
 * Divide o bloco cru de hashtags em frases.
 *
 * ♦ 03/08/2026 — A 15ª OCORRÊNCIA DE "O PROMPT MANDA O QUE O LEITOR NÃO ACEITA".
 * O prompt aqui em baixo pede, com estas palavras, "hashtags separadas por
 * ESPAÇO" — e este leitor só sabia separar por VÍRGULA. Quando o modelo obedecia
 * ao prompt, as 3 hashtags chegavam como uma frase só e viravam UM monstro
 * colado (medido no vídeo `baITWiOojyY`). Agora as três formas são aceites, por
 * ordem de confiança: '#' explícito → vírgula → espaço (o que o prompt pede).
 */
function splitHashtagPhrases(raw) {
  const s = String(raw || '').trim();
  if (!s) return [];
  if (s.includes('#')) return s.split(/(?=#)/).map((x) => x.trim()).filter(Boolean);
  if (s.includes(',')) return s.split(',').map((x) => x.trim()).filter(Boolean);
  return s.split(/\s+/).map((x) => x.trim()).filter(Boolean);
}

// Monta a lista final de hashtags a partir de frases cruas: token único cada
// (CamelCase), sem stopword solta, dedup case-insensitive, no máx 5 — #Shorts
// sempre por último.
function buildHashtagList(rawList) {
  const out = [];
  for (const raw of rawList || []) {
    const tag = buildHashtag(raw);
    if (!tag || tag.toLowerCase() === '#shorts') continue; // #Shorts é sempre adicionado no fim
    if (out.some((x) => x.toLowerCase() === tag.toLowerCase())) continue;
    out.push(tag);
  }
  return [...out.slice(0, 4), '#Shorts'];
}

// ─── roteiro ─────────────────────────────────────────────────────────────────
function loadScript(slug) {
  const p = join(SCRIPT_DIR, `${slug}.script.json`);
  if (!existsSync(p)) throw new Error(`Roteiro não encontrado: ${p}`);
  return JSON.parse(readFileSync(p, 'utf-8'));
}

/**
 * As 7 calculadoras que EXISTEM no blog (todas verificadas a responder 200 em
 * 03/08/2026), com os termos que as chamam. Tabela fixa de propósito: escolher
 * o link é VERDADE, não gosto — não se pede a uma IA o que uma lista resolve.
 * ⚠️ O endereço leva barra no fim: o Cloudflare serve COM barra final.
 */
const CALCULADORAS = [
  { pagina: 'calculadora-juros-compostos', termos: ['juros compostos', 'juros', 'render', 'rendimento', 'tesouro', 'poupanca', 'aplicacao'] },
  { pagina: 'simulador-investimento', termos: ['investi', 'cdb', 'acoes', 'renda fixa', 'renda variavel', 'etf', 'dividendo', 'alavanc', 'mercado', 'bolsa'] },
  { pagina: 'calculadora-financiamento', termos: ['financiamento', 'amortiza', 'parcela', 'divida', 'emprestimo', 'credito', 'cartao', 'juros abusivos'] },
  { pagina: 'calculadora-reserva', termos: ['reserva', 'emergencia', 'imprevisto'] },
  { pagina: 'calculadora-aposentadoria', termos: ['aposenta', 'previdencia', 'inss'] },
  { pagina: 'calculadora-orcamento', termos: ['orcamento', 'gasto', 'salario', 'inflacao', 'economizar', 'controle', 'mesada', 'conta'] },
  { pagina: 'conversor-moedas', termos: ['dolar', 'euro', 'cambio', 'moeda'] },
  // Rede final, de propósito NO FIM: os temas de hábito/comportamento ("5 erros
  // financeiros", "5 coisas que nunca faço com meu dinheiro") não nomeiam
  // nenhum produto financeiro, e sem esta linha caíam no índice — que foi o que
  // aconteceu a 3 dos 10 primeiros vídeos. Vem depois de todas as outras para
  // nunca roubar um tema que tenha calculadora própria.
  { pagina: 'calculadora-orcamento', termos: ['dinheiro', 'erro', 'habito', 'mindset', 'divida'] },
];

/** Sem acentos e em minúsculas, para a tabela casar com "inflação" e "inflacao". */
function semAcento(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * Resolve o link da calculadora.
 *
 * ♦ 03/08/2026 — os 10 primeiros vídeos foram todos ao ar a apontar para o
 * ÍNDICE `/ferramentas/`. Motivo medido: o roteiro grava em `cta.target` a
 * palavra "app" ou "blog" — nunca um endereço —, e a linha abaixo só aceitava
 * endereço. Agora, quando não há URL, o tema escolhe a calculadora certa.
 */
function resolveToolUrl(script) {
  const t = script?.cta?.target;
  if (typeof t === 'string' && /^https?:\/\//.test(t)) return t;

  const texto = semAcento([script?.keyword, script?.term, script?.category].filter(Boolean).join(' '));
  for (const c of CALCULADORAS) {
    if (c.termos.some((termo) => texto.includes(termo))) return `${BLOG_TOOLS_URL}${c.pagina}/`;
  }
  return BLOG_TOOLS_URL; // tema sem calculadora própria: o índice continua a servir
}

// ─── metadados via LLM (com fallback determinístico) ─────────────────────────

/**
 * ♦ 03/08/2026 — O DEFEITO QUE ESTRAGOU 5 DAS 9 DESCRIÇÕES QUE FORAM AO AR.
 *
 * O orçamento era de 600 fichas de resposta. Estes modelos gastam parte desse
 * orçamento a RACIOCINAR antes de escrever, e quando raciocinam de mais a
 * resposta é cortada a meio — mas chega ao código como uma resposta normal.
 * Resultado medido nos vídeos publicados: a descrição acabava a meio da palavra
 * ("...e use a calculadora grátis do Fin") e as hashtags, que vinham DEPOIS
 * dela no formato pedido, nunca chegavam. Os 5 vídeos com descrição cortada são
 * exatamente os 5 sem hashtags — a correlação é a prova.
 *
 * Duas curas, e são precisas as duas: orçamento com folga, e nunca aceitar uma
 * resposta que não chegou ao fim.
 */
const ORCAMENTO_RESPOSTA = 2000;
const TENTATIVAS_LLM = 2;

/**
 * Diz porque é que uma resposta NÃO serve — ou nada, se estiver inteira.
 *
 * O sinal mais fiável não é o tamanho: é a ORDEM. Pedimos título → descrição →
 * hashtags → palavras-chave. Se as últimas partes faltam, a resposta parou pelo
 * caminho. E uma descrição que acaba em letra, sem pontuação, acabou a meio de
 * uma frase que ninguém escreveu até ao fim.
 */
function respostaCortada({ title, description, hashtagsRaw, tagsRaw }) {
  if (!title) return 'sem título';
  if (!description) return 'sem descrição';
  if (!hashtagsRaw) return 'sem hashtags (a resposta parou antes delas)';
  if (!tagsRaw) return 'sem palavras-chave (a resposta parou antes delas)';
  const fim = description.trim().slice(-1);
  if (/[\p{L}\p{N}]/u.test(fim)) return `descrição acaba a meio ("…${description.trim().slice(-30)}")`;
  return null;
}

async function tryLlm(script) {
  // Import dinâmico e protegido: se o módulo/keys falharem, caímos no template.
  let generateText;
  try {
    ({ generateText } = await import('../apis/kie-ai.js'));
  } catch (err) {
    log(`⚠️ LLM indisponível (import falhou: ${err.message}) — usando template determinístico.`);
    return null;
  }

  const narrationSummary = (script.scenes || [])
    .map((s) => s.narration).filter(Boolean).join(' ')
    .replace(/\s+/g, ' ').slice(0, 700);

  // Marketing intelligence: title patterns
  const { patterns, constraints } = getTitlePatterns('short', 'pt');
  const patternHint = patterns.slice(0, 4).map(p => `• ${p.formula} (ex: ${p.example})`).join('\n');

  const prompt = `Você é editor de um canal de finanças no YouTube (pt-BR). A partir do roteiro de um Short, gere metadados de publicação. Responda EXATAMENTE neste formato, sem comentários:

---TITULO---
[título em pt-BR, MÁXIMO ${constraints.maxChars} caracteres, com a palavra-chave "${script.keyword}" logo no começo, natural e chamativo, SEM spam de clickbait, SEM emojis]
---DESCRICAO---
[gancho de 2 a 3 linhas resumindo o vídeo, tom coloquial, pt-BR, SEM hashtags e SEM links aqui]
---HASHTAGS---
[3 a 5 hashtags separadas por espaço; a PRIMEIRA a mais específica do tema; NÃO inclua #Shorts (ele é adicionado depois)]
---TAGS---
[8 a 12 variações de palavra-chave para SEO, separadas por vírgula]
---TOPICOS---
[3 tópicos curtos do que a pessoa aprende neste vídeo, UM POR LINHA, no máximo 60 caracteres cada, começando por verbo ou por número, SEM traço nem ponto no início, SEM emojis]

FÓRMULAS DE TÍTULO (escolha a mais adequada ao tema e ADAPTE):
${patternHint}

Dados do roteiro:
- Termo: ${script.term}
- Palavra-chave: ${script.keyword}
- Categoria: ${script.category}
- CTA: ${script?.cta?.text || ''}
- Narração: ${narrationSummary}`;

  for (let tentativa = 1; tentativa <= TENTATIVAS_LLM; tentativa++) {
    try {
      const out = await generateText(prompt, { maxTokens: ORCAMENTO_RESPOSTA, temperature: 0.6 });
      const grab = (tag, next) => {
        const re = new RegExp(`---${tag}---\\s*([\\s\\S]*?)(?=---(?:${next})---|$)`);
        const m = out.match(re);
        return m ? m[1].trim() : '';
      };
      const partes = {
        title: grab('TITULO', 'DESCRICAO'),
        description: grab('DESCRICAO', 'HASHTAGS'),
        hashtagsRaw: grab('HASHTAGS', 'TAGS'),
        // ⚠️ TAGS passa a parar em TOPICOS — mas se TOPICOS não vier, o regex cai no
        // `$` e apanha até ao fim, exatamente como antes. Acrescentar uma secção no
        // FIM é a única forma de a acrescentar sem poder partir o que já funcionava.
        tagsRaw: grab('TAGS', 'TOPICOS'),
        topicosRaw: grab('TOPICOS', ''),
      };

      const defeito = respostaCortada(partes);
      if (defeito) {
        log(`⚠️ Resposta do LLM veio incompleta (${defeito}) — tentativa ${tentativa}/${TENTATIVAS_LLM}.`);
        continue;
      }

      return {
        title: partes.title.replace(/^["']|["']$/g, ''),
        descriptionHook: partes.description,
        hashtags: splitHashtagPhrases(partes.hashtagsRaw),
        tags: partes.tagsRaw.split(',').map((t) => t.trim()).filter(Boolean),
        topicos: limparTopicos(partes.topicosRaw),
      };
    } catch (err) {
      log(`⚠️ LLM falhou (${err.message}) — tentativa ${tentativa}/${TENTATIVAS_LLM}.`);
    }
  }
  log('⚠️ O LLM não devolveu resposta inteira — usando template determinístico (que sai sempre completo).');
  return null;
}

// Template 100% determinístico a partir dos campos do roteiro.
function deterministicMeta(script) {
  const kw = script.keyword || script.term || 'Finanças';
  const title = `${kw}: como funciona em 1 minuto`;
  // ⚠️ `kw` e não `script.term`: nos temas editoriais o `term` é a FRASE do
  // tema inteira ("A inflação te rouba R$ 2 mil por ano — sem você perceber"),
  // e encaixada aqui dava "Entenda A inflação te rouba… de um jeito simples".
  // Como este texto de reserva passou a ser usado sempre que a IA falha, o
  // desleixo deixou de ser raro.
  const descriptionHook =
    `Entenda ${kw} de um jeito simples e rápido.\n` +
    `${script?.cta?.text || 'Coloque em prática com as ferramentas grátis do FinMoovi.'}`;
  const hashtags = [
    buildHashtag(kw),
    '#FinançasPessoais',
    '#EducaçãoFinanceira',
    '#Investimentos',
    '#Dinheiro',
  ].filter(Boolean);
  const tags = [
    kw, script.term, `${kw} explicado`, `o que é ${kw}`, `como funciona ${kw}`,
    'finanças pessoais', 'educação financeira', 'investimentos', 'dinheiro',
    'finanças', 'FinMoovi', script.category,
  ].filter(Boolean);
  /**
   * ⚠️ O PLANO B TAMBÉM TEM DE TER TÓPICOS.
   * Se a IA falhar e o bloco "O QUE VOCÊ VAI VER" desaparecer, a descrição de reserva
   * fica pior do que a normal — e é justamente nos dias maus que ela é usada. Estes
   * três saem do roteiro, não da imaginação: o tema, a promessa e a ferramenta.
   */
  const topicos = [
    `O que é ${kw} e por que isso mexe no seu bolso`,
    script.term && script.term !== kw ? script.term : `Como ${kw} aparece no dia a dia`,
    `Como calcular o seu caso com as ferramentas grátis do FinMoovi`,
  ].filter(Boolean).map((t) => String(t).slice(0, 90));

  return { title, descriptionHook, hashtags, tags, topicos };
}

// Monta o payload final (snippet/status) já sanitizado.
function buildMetadata(raw, script) {
  const toolUrl = resolveToolUrl(script);

  // Maiúscula inicial: a palavra-chave entra crua no começo do título e saía em
  // minúscula em metade dos vídeos ("ações: como…", "inflação: 3 erros…").
  const title = maiusculaInicial(sanitizeText(raw.title, 100) || sanitizeText(`${script.keyword}`, 100));

  // Hashtags: token único (CamelCase), sem stopword solta, dedup, no máx 5 (#Shorts sempre por último).
  const hashtags = buildHashtagList(raw.hashtags);

  const palavraChave = sanitizeText(script.keyword || script.term || 'finanças', 60).toLowerCase();
  const hook = sanitizeText(raw.descriptionHook, 1500);
  const topicos = (raw.topicos || []).slice(0, 3);
  // ⚠️ O crédito sai da faixa DESTE vídeo (gravada no roteiro), não de uma faixa
  // fixa: com três músicas a rodar, um crédito fixo estaria errado em dois vídeos
  // em cada três. Roteiros antigos não têm o campo e caem na faixa por omissão.
  const credito = creditoDaMusica(script.music || TRILHA);
  /**
   * ♦ 05/08/2026 — A DESCRIÇÃO PASSOU A SER ESCRITA, E NÃO SÓ DESPEJADA.
   *
   * Como estava: gancho, dois links colados e as hashtags. Três linhas e um monte.
   * O dono, ao ver no Studio: *"gostaria de uma descrição maior e mais voltada para
   * SEO, e mais organizada"*.
   *
   * As regras que ele deu, e que este bloco cumpre à letra:
   *   • **linhas curtas com respiro** entre blocos, em vez de um parágrafo só;
   *   • **cada linha começa por um marcador** — emoji, ponto ou asterisco;
   *   • **palavras-chave a negrito** (o YouTube aceita *asteriscos* como negrito
   *     desde 2021 — e é de graça, ao contrário do que quase toda a gente pensa);
   *   • **as linhas de link começam por emoji**;
   *   • emojis com conta: um por bloco, não um por linha.
   *
   * E ganha o bloco *O QUE VOCÊ VAI VER* — três tópicos escritos pela IA a partir do
   * roteiro. É aí que o SEO mora de verdade: são três frases com as palavras que
   * alguém escreveria na busca, e que antes não existiam em lado nenhum.
   * ⚠️ Se a IA não os devolver, o bloco simplesmente não aparece. Nunca fica um
   * título de secção com nada por baixo.
   */
  const linhas = [
    hook,
    '',
    // A narração pede "comenta FINMOOVI que eu te mando o app" e o ecrã mostra a
    // pastilha com a mãozinha a carregar nela — mas até 05/08 a descrição não dizia
    // uma palavra sobre isso. Quem vê o Short sem som (que é muita gente) recebia a
    // chamada só pela imagem. A descrição do vídeo LONGO já trazia esta linha desde
    // o início; era o Short que estava a menos.
    CTA_COMENTARIO,
  ];

  if (topicos.length) {
    linhas.push('', '📌 *O QUE VOCÊ VAI VER:*', ...topicos.map((t) => `• ${t}`));
  }

  linhas.push(
    '',
    `🔗 *Calculadora grátis:* ${toolUrl}`,
    `📲 *Organize suas finanças:* ${APP_URL}`,
    `📚 *Mais sobre ${palavraChave}:* ${BLOG_URL}`,
    '',
    `💬 *Ficou dúvida?* Escreve nos comentários que eu respondo.`,
    '',
    hashtags.join(' '),
  );
  // só aparece quando a faixa em uso obriga — hoje não obriga, porque a trilha é nossa
  if (credito) linhas.push('', `🎵 ${credito}`);

  const description = sanitizeText(linhas.join('\n'), 5000);

  // Tags: sanitiza, dedup (case-insensitive), 8–12, respeita limite ~460 chars.
  const seen = new Set();
  const tags = [];
  let tagsLen = 0;
  for (const t of raw.tags) {
    const clean = sanitizeText(t, 60);
    const key = clean.toLowerCase();
    if (!clean || seen.has(key)) continue;
    if (tags.length >= 12) break;
    if (tagsLen + clean.length + 1 > 460) break;
    seen.add(key);
    tags.push(clean);
    tagsLen += clean.length + 1;
  }

  return {
    snippet: {
      title,
      description,
      tags,
      categoryId: '27', // Education
      defaultLanguage: 'pt-BR',
      defaultAudioLanguage: 'pt-BR',
    },
    status: {
      privacyStatus: 'public', // auditoria da API aprovada (03/08/2026) — sobe já público
      selfDeclaredMadeForKids: false,
      license: 'youtube',
    },
  };
}

// ─── OAuth ───────────────────────────────────────────────────────────────────
async function getAccessToken() {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Faltam secrets YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET / YOUTUBE_REFRESH_TOKEN.');
  }
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    if (res.status === 400 || res.status === 401) {
      throw new Error(`Refresh token inválido/expirado (${res.status}). Rode: node scripts/youtube-auth.js e atualize o secret YOUTUBE_REFRESH_TOKEN. Detalhe: ${text}`);
    }
    throw new Error(`Falha ao renovar access token (${res.status}): ${text}`);
  }
  return JSON.parse(text).access_token;
}

// Traduz erros da API em mensagens acionáveis.
function explainApiError(status, body) {
  if (status === 401) {
    return `401 — access token expirado/inválido. Rode scripts/youtube-auth.js e atualize YOUTUBE_REFRESH_TOKEN. ${body}`;
  }
  if (status === 403) {
    if (/quota/i.test(body)) return `403 — cota da API do YouTube esgotada (upload custa ~1600 unidades; cota diária 10k). Tente amanhã. ${body}`;
    return `403 — acesso negado (escopo/permissão do canal ou API de upload desabilitada). ${body}`;
  }
  return `${status}: ${body}`;
}

// ─── upload resumível ────────────────────────────────────────────────────────
async function uploadVideo(accessToken, metadata, mp4Path) {
  const size = statSync(mp4Path).size;

  // 1. Initiate.
  const init = await fetch(UPLOAD_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Type': 'video/mp4',
      'X-Upload-Content-Length': String(size),
    },
    body: JSON.stringify(metadata),
  });
  if (!init.ok) {
    const body = await init.text().catch(() => '');
    throw new Error(`Falha ao iniciar upload — ${explainApiError(init.status, body)}`);
  }
  const location = init.headers.get('location');
  if (!location) throw new Error('Upload iniciado sem header Location (URL resumível).');

  // 2. PUT dos bytes.
  const bytes = readFileSync(mp4Path);
  const put = await fetch(location, {
    method: 'PUT',
    headers: { 'Content-Type': 'video/mp4', 'Content-Length': String(size) },
    body: bytes,
  });
  const putText = await put.text();
  if (!put.ok) {
    throw new Error(`Falha ao enviar bytes — ${explainApiError(put.status, putText)}`);
  }
  const video = JSON.parse(putText);
  if (!video.id) throw new Error(`Upload retornou sem id: ${putText.slice(0, 300)}`);
  return video.id;
}

// ─── captions.insert (multipart) ─────────────────────────────────────────────
async function insertCaption(accessToken, videoId, srtPath, langMeta) {
  const boundary = `----finmoovi-caption-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const meta = {
    snippet: {
      videoId,
      language: langMeta.language,
      name: langMeta.name,
      isDraft: false,
    },
  };
  const srt = readFileSync(srtPath);
  const head = Buffer.from(
    `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    `${JSON.stringify(meta)}\r\n` +
    `--${boundary}\r\n` +
    'Content-Type: application/octet-stream\r\n\r\n',
    'utf-8',
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf-8');
  const body = Buffer.concat([head, srt, tail]);

  const res = await fetch(CAPTIONS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
      'Content-Length': String(body.length),
    },
    body,
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(explainApiError(res.status, t));
  }
  return true;
}

// ─── tracking / dedup ────────────────────────────────────────────────────────
function loadTracking() {
  if (!existsSync(TRACKING)) return {};
  try { return JSON.parse(readFileSync(TRACKING, 'utf-8')) || {}; }
  catch { return {}; }
}
function saveTracking(data) {
  mkdirSync(dirname(TRACKING), { recursive: true });
  writeFileSync(TRACKING, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
}

// ─── main ────────────────────────────────────────────────────────────────────
async function main() {
  log(`\n=== YouTube upload — slug "${SLUG}"${DRY_RUN ? ' (DRY-RUN)' : ''} ===`);

  const script = loadScript(SLUG);

  // Dedup (não bloqueia o dry-run).
  const tracking = loadTracking();
  if (!DRY_RUN && tracking[SLUG]) {
    const t = tracking[SLUG];
    log(`✅ "${SLUG}" já publicado em ${t.uploadedAt} → https://youtu.be/${t.videoId}`);
    log('Nada a fazer (sem upload duplicado).');
    return;
  }

  // Metadados: LLM → fallback determinístico.
  const raw = (await tryLlm(script)) || deterministicMeta(script);
  const metadata = buildMetadata(raw, script);

  // Arquivos.
  const mp4Path = join(MP4_DIR, `${SLUG}.mp4`);
  const srtPaths = CAPTION_LANGS.map((l) => ({
    ...l,
    path: join(AUDIO_ROOT, SLUG, `${SLUG}.${l.code}.srt`),
  }));

  if (DRY_RUN) {
    log('\n── PAYLOAD (dry-run, nada foi enviado) ──');
    log(JSON.stringify(metadata, null, 2));
    log('\n── Arquivos que seriam enviados ──');
    log(`MP4: ${mp4Path} ${existsSync(mp4Path) ? '(ok)' : '(FALTANDO)'}`);
    // ⚠️ A capa entra NESTA lista de propósito: um ensaio que não mostra a capa é um
    // ensaio onde a sua ausência passa despercebida — e foi assim que 11 vídeos foram
    // ao ar sem nenhuma.
    const capaEnsaio = caminhoDaCapaLarga(SLUG);
    log(`CAPA: ${capaEnsaio} ${existsSync(capaEnsaio) ? `(ok, ${Math.round(statSync(capaEnsaio).size / 1024)} KB)` : '(FALTANDO)'}`);
    for (const s of srtPaths) {
      log(`SRT ${s.code}: ${s.path} ${existsSync(s.path) ? '(ok)' : '(FALTANDO)'}`);
    }
    log('\nDry-run concluído.');
    return;
  }

  if (!existsSync(mp4Path)) throw new Error(`MP4 não encontrado: ${mp4Path} — rode o render antes.`);

  // Upload.
  const accessToken = await getAccessToken();
  log('🔑 Access token renovado.');
  log('⬆️  Enviando vídeo (público)...');
  const videoId = await uploadVideo(accessToken, metadata, mp4Path);
  const url = `https://youtu.be/${videoId}`;
  log(`✅ Vídeo enviado: ${url}`);

  // Legendas (falha em uma não derruba as outras nem o processo).
  for (const s of srtPaths) {
    if (!existsSync(s.path)) { log(`⚠️ legenda ${s.code} ausente (${s.path}) — pulada.`); continue; }
    try {
      await insertCaption(accessToken, videoId, s.path, s);
      log(`✅ legenda ${s.language} (${s.name}) inserida.`);
    } catch (err) {
      log(`⚠️ legenda ${s.code} falhou (vídeo já está no ar): ${err.message}`);
    }
  }

  // ♦ 05/08/2026 — A CAPA (IMPL20 §52).
  // Os 11 Shorts publicados antes disto foram ao ar sem capa nenhuma: este ficheiro
  // nunca teve uma linha sobre miniaturas. A capa vem pronta no artefato da produção.
  // ⚠️ Falhar aqui NÃO pode derrubar nada — o vídeo já está no ar. Um Short sem capa
  // é um clique no Studio; um robô que rebenta depois de publicar é um vídeo no ar que
  // o caderno diz que não existe. (É a mesma regra do vídeo longo.)
  const capa = caminhoDaCapaLarga(SLUG);
  if (existsSync(capa)) {
    try {
      await meterCapa(accessToken, videoId, capa);
      log(`🖼️  capa enviada (${Math.round(statSync(capa).size / 1024)} KB).`);
    } catch (err) {
      log(`⚠️ a capa falhou (o vídeo já está no ar): ${err.message}`);
    }
  } else {
    log(`⚠️ não veio capa no artefato (${capa}) — o vídeo fica com um fotograma ao calhas.`);
  }

  // ♦ 05/08/2026 — O PRIMEIRO COMENTÁRIO (IMPL20 §54).
  // Num Short a descrição fica atrás de um toque; o comentário do criador aparece na
  // conversa. ⚠️ Fixar não existe na API — são dois cliques no Studio, e é decisão de
  // quem publica. Falhar aqui não derruba nada: o vídeo já está no ar.
  try {
    const texto = textoDoPrimeiroComentario({ ferramentaUrl: resolveToolUrl(script), palavraChave: script.keyword });
    const comentarioId = await escreverPrimeiroComentario(accessToken, videoId, texto);
    log(`💬 primeiro comentário escrito${comentarioId ? ` (${comentarioId})` : ''} — falta fixar à mão no Studio.`);
  } catch (err) {
    log(`⚠️ o primeiro comentário falhou (o vídeo já está no ar): ${err.message}`);
  }

  // Tracking.
  tracking[SLUG] = { videoId, uploadedAt: new Date().toISOString(), title: metadata.snippet.title };
  saveTracking(tracking);
  log(`📝 tracking atualizado em ${TRACKING}`);

  log(`\n🌍 Vídeo PÚBLICO — já está no ar, sem passo manual no Studio.`);
  log(`   ${url}`);
}

/**
 * ♦ 03/08/2026 — SÓ CORRE QUANDO É CHAMADO PELO NOME.
 *
 * Antes, o `main()` corria no corpo do módulo: bastava alguém IMPORTAR este
 * ficheiro para PUBLICAR UM VÍDEO sem querer. Isso obrigou a duplicar código em
 * dois sítios (o medidor de retenção copiou o `getAccessToken`) — e duplicar é o
 * modo de falha crónico deste repositório. Com esta guarda, o corretor de
 * descrições usa as MESMAS funções que o robô usa, em vez de uma cópia que
 * amanhã diverge.
 */
const executadoDiretamente = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (executadoDiretamente) {
  main().catch((err) => {
    console.error(`\n❌ ${err.message}`);
    process.exit(1);
  });
}

export { tryLlm, deterministicMeta, buildMetadata, getAccessToken, resolveToolUrl, respostaCortada };
