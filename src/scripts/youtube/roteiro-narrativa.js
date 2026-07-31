/**
 * PASSAGEM 1 — A NARRAÇÃO (IMPLEMENTACAO20 §17.6 / §19).
 *
 * Gera APENAS o texto falado do Short: 6 blocos encadeados, sem uma palavra sobre
 * visuais. A coreografia (shots, ícones, sons, âncoras) é a PASSAGEM 2 e não entra
 * aqui — de propósito.
 *
 * POR QUE EXISTE. O prompt de `roteiro-short.js` tem ~25.300 chars e mede-se assim:
 * coreografia visual 11.702 · estrutura da narrativa 2.965 · fala fluida/intro 2.779
 * · moldura do app 2.381. **Mais de metade do prompt ensina a ANIMAR; menos de um
 * quarto ensina a ESCREVER.** O modelo faz uma coisa de cada vez e a atenção vai
 * para onde há mais instrução — daí o texto do vídeo `SZSGAxqmmm0`, que o dono
 * resumiu assim: "eu estou olhando isso 10 vezes e ainda não entendi".
 *
 * Este ficheiro é NOVO e não é chamado por nada em produção — o pipeline atual
 * continua intacto até o dono aprovar o texto que sai daqui.
 *
 * Uso:
 *   node src/scripts/youtube/roteiro-narrativa.js --slug=juros-compostos
 *   node src/scripts/youtube/roteiro-narrativa.js --slug=EDITORIAL:tesouro-direto-100
 */

import { generateText } from '../apis/kie-ai.js';
import { BORDAO, METAPHORS, longestSharedWordRun } from './lib/schema-short.js';
import { loadRecentPublishedContext } from './roteiro-short.js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const GLOSSARIO_DIR = join(process.cwd(), 'src', 'content', 'glossario');
const TOPICS_PATH = join(process.cwd(), '.github', 'data', 'youtube-topics.json');

const args = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => {
    const [k, ...v] = a.slice(2).split('=');
    return [k, v.join('=') || true];
  }),
);

// ─── leitura do tema (mesma fonte do roteiro-short) ──────────────────────────
function lerFrontmatter(caminho) {
  const raw = readFileSync(caminho, 'utf-8');
  const partes = raw.split('---');
  if (partes.length < 3) return null;
  const fm = partes[1];
  const body = partes.slice(2).join('---').trim();
  const pick = (k) => (fm.match(new RegExp(`${k}:\\s*"?([^"\\n]+)"?`)) || [])[1]?.trim();
  return { term: pick('term'), definition: pick('definition'), category: pick('category'), body };
}

function lerTema(slug) {
  if (slug.startsWith('EDITORIAL:')) {
    const id = slug.slice('EDITORIAL:'.length);
    const data = JSON.parse(readFileSync(TOPICS_PATH, 'utf-8'));
    const topic = (data.topics || []).find((t) => t.id === id);
    if (!topic) throw new Error(`tema editorial não encontrado: ${id}`);
    const out = { slug: id, term: topic.theme, angle: topic.angle, definition: '', category: topic.pillar || 'basico', body: '' };
    if (topic.glossaryRef) {
      const p = join(GLOSSARIO_DIR, `${topic.glossaryRef}.md`);
      if (existsSync(p)) {
        const fm = lerFrontmatter(p);
        if (fm) { out.definition = fm.definition || ''; out.body = fm.body || ''; }
      }
    }
    return out;
  }
  const p = join(GLOSSARIO_DIR, `${slug}.md`);
  if (!existsSync(p)) throw new Error(`termo não encontrado: ${p}`);
  const fm = lerFrontmatter(p);
  return { slug, term: fm?.term || slug, definition: fm?.definition || '', category: fm?.category || 'basico', body: fm?.body || '' };
}

const cortar = (txt, max = 1500) => {
  if (!txt || txt.length <= max) return txt || '';
  const c = txt.slice(0, max);
  return `${c.slice(0, Math.max(0, c.lastIndexOf(' ')))}… (trecho)`;
};

// ─── o prompt ────────────────────────────────────────────────────────────────
// PODADO de propósito: só entra aqui o que muda o TEXTO. Nada de ícones, sons,
// tempo de tela, tipos de visual, âncoras ou JSON de shots.
export function buildPromptNarrativa(t, proibidas, frasesRecentes) {
  const bloqueadas = proibidas.length ? proibidas.join(', ') : '(nenhuma ainda)';
  const disponiveis = METAPHORS.filter((m) => m !== 'clique-link' && !proibidas.includes(m));
  const evitarFrases = frasesRecentes.length
    ? `\nJÁ FOI DITO nos vídeos recentes (não repita nem parafraseie): ${frasesRecentes.map((f) => `"${f}"`).join(' · ')}`
    : '';

  return `Você é ROTEIRISTA de um canal brasileiro de finanças pessoais. Escreve como quem CONVERSA COM UM AMIGO: informal, direto, com gíria leve. Nunca formal, nunca "de livro".

SUA ÚNICA TAREFA AGORA: escrever a NARRAÇÃO falada de um vídeo curto (45 a 55 segundos).
NÃO descreva imagens, ícones, sons, efeitos ou cortes. Só o texto que a voz vai falar. Outra pessoa cuida do visual depois.

TEMA: "${t.term}"${t.angle ? `\nÂNGULO: ${t.angle}` : ''}
${t.definition ? `DEFINIÇÃO: ${t.definition}\n` : ''}${t.body ? `DADOS REAIS (use SOMENTE números daqui):\n${cortar(t.body)}\n` : ''}
════════ A REGRA MAIOR — CADA FRASE PRECISA DA ANTERIOR ════════
O vídeo é UMA fala contínua, não uma lista de frases bonitas. Cada bloco CONTINUA o anterior e prepara o seguinte.
TESTE OBRIGATÓRIO: leia um bloco sem ler o anterior. Se ele fizer sentido sozinho, está SOLTO — reescreva até depender do anterior.

✗ ERRADO (foi ao ar e ninguém entendeu):
   "Tesouro Direto com 100 reais, vale a pena? Se liga no que eu descobri: 100 reais todo mês, 24 vezes. É como uma pequena avalanche. Qual rendimento?"
   Por quê: "24 vezes" o quê? "avalanche" de quê? a pergunta final cai do céu. São quatro pedaços que não se conhecem.

✓ CERTO (o mesmo assunto, encadeado):
   "Todo mundo acha que cem reais não muda nada. Só que eu fiz a conta de guardar esses cem reais por dois anos seguidos… e o número me assustou. Porque não é o valor que trabalha, é o tempo."
   Por quê: a 2ª frase responde à 1ª, a 3ª explica a 2ª. Ninguém consegue sair no meio.

════════ A ESPINHA (6 blocos, nesta ordem) ════════
1. GANCHO (~6s): a dor ou o número que choca, JÁ dizendo "${t.term}". Termine deixando uma pergunta no ar — e NÃO responda.
2. EMPATIA (~9s): por que isso acontece com gente normal (correria, cansaço, ninguém ensinou). Sem culpar quem assiste.
3. A VIRADA (~10s): a reviravolta. O espectador acha que o problema é A e você mostra que é B — "não é o [A] que te quebra… é o [B] que ninguém soma". É o coração do vídeo.
4. A DEMONSTRAÇÃO (~10s): como o app FinMoovi resolve ISSO que você acabou de revelar, com número real. Uma ação de segundos, nunca "reserve um tempo".
5. O CONVITE (~6s): peça o COMENTÁRIO com a palavra FINMOOVI. Molde a adaptar: "quer <o que resolve neste tema>? comenta FINMOOVI aqui que eu te mando."
6. O FECHO (~8s): responda (ou vire do avesso) a pergunta do bloco 1 e termine com uma provocação. Sem "tchau", sem "até a próxima".

════════ O FIO CONDUTOR ════════
Escolha UMA imagem física para o vídeo inteiro e faça-a CRESCER: pequena no bloco 1, forte no 3, paga no 6. É a mesma imagem sempre — nunca troque no meio.
Escolha entre: ${disponiveis.join(', ')}.
⛔ PROIBIDAS (já usadas nos vídeos recentes): ${bloqueadas}${evitarFrases}

════════ COMO A VOZ SOA ════════
- Pontuação é RESPIRAÇÃO, não gramática. Vírgula só onde alguém respiraria de verdade.
  ✗ "Dez anos de atraso, custam caro."  ✓ "Dez anos de atraso custam caro."
- Reticências só para suspense de efeito.
- Números por extenso na fala ("cem reais", "trinta por cento") — nunca símbolos.
- Diga a unidade na PRIMEIRA menção: "aos vinte e cinco anos… aos trinta e cinco".
- Diga "vídeo", nunca "Short".
- Diga o bordão UMA vez, encaixado: "${BORDAO}"
- ⛔ NUNCA mande clicar em link ("link na descrição/bio/aqui embaixo"). Em vídeo vertical o link não é clicável — por isso o convite é o comentário.
- ⛔ NUNCA use asteriscos, travessões ou qualquer marcação. Só texto limpo.

Responda APENAS com JSON válido, sem markdown:
{
  "fioCondutor": "<uma das imagens permitidas>",
  "perguntaAberta": "<a pergunta do bloco 1, curta, MAIÚSCULAS, até 30 caracteres>",
  "blocos": [
    { "papel": "gancho",       "fala": "..." },
    { "papel": "empatia",      "fala": "..." },
    { "papel": "virada",       "fala": "..." },
    { "papel": "demonstracao", "fala": "..." },
    { "papel": "convite",      "fala": "..." },
    { "papel": "fecho",        "fala": "..." }
  ]
}`;
}

// ─── validação: só o que é do TEXTO ──────────────────────────────────────────
const PAPEIS = ['gancho', 'empatia', 'virada', 'demonstracao', 'convite', 'fecho'];
// 45-55s de fala a ~2,3 palavras/s (média medida nas narrações reais do canal).
const MIN_PALAVRAS = 100;
const MAX_PALAVRAS = 150;

export function validarNarrativa(n, proibidas = []) {
  const erros = [];
  const avisos = [];
  if (!n || typeof n !== 'object') return { ok: false, erros: ['resposta não é objeto'], avisos };

  const blocos = Array.isArray(n.blocos) ? n.blocos : [];
  if (blocos.length !== 6) erros.push(`precisa de 6 blocos (veio ${blocos.length})`);
  blocos.forEach((b, i) => {
    if (!b || typeof b.fala !== 'string' || !b.fala.trim()) erros.push(`bloco ${i + 1}: sem fala`);
    if (b && b.papel !== PAPEIS[i]) erros.push(`bloco ${i + 1}: papel deve ser "${PAPEIS[i]}" (veio "${b?.papel}")`);
  });

  const falaToda = blocos.map((b) => (b && b.fala) || '').join(' ');
  const palavras = falaToda.trim().split(/\s+/).filter(Boolean).length;
  if (palavras < MIN_PALAVRAS) erros.push(`narração curta demais: ${palavras} palavras (mínimo ${MIN_PALAVRAS} ≈ 45s)`);
  if (palavras > MAX_PALAVRAS) erros.push(`narração longa demais: ${palavras} palavras (máximo ${MAX_PALAVRAS} ≈ 55s)`);

  // proibições que já nos morderam no ar
  if (/[*_]/.test(falaToda)) erros.push('a fala tem marcação (* ou _) — a voz lê "asterisco"');
  if (/—/.test(falaToda)) erros.push('a fala tem travessão — use vírgula ou ponto');
  if (/\bshorts?\b/i.test(falaToda)) erros.push('a fala diz "Short" — o canal fala sempre "vídeo"');
  if (/link (na|no|aqui)|clica no link|na bio|na descri/i.test(falaToda)) {
    erros.push('a fala manda clicar em link — em vídeo vertical o link não é clicável; o convite é o comentário');
  }
  if (!/finmoovi/i.test(blocos[4]?.fala || '')) erros.push('o bloco "convite" não pede o comentário com a palavra FINMOOVI');
  if (!falaToda.toLowerCase().includes(BORDAO.toLowerCase().slice(0, 24))) avisos.push('o bordão do canal não aparece');

  // fio condutor
  const fio = String(n.fioCondutor || '').trim();
  if (!fio) erros.push('sem "fioCondutor"');
  else if (!METAPHORS.includes(fio)) erros.push(`fioCondutor "${fio}" fora do catálogo (${METAPHORS.join('/')})`);
  else if (proibidas.includes(fio)) erros.push(`fioCondutor "${fio}" foi usado nos vídeos recentes — escolha outro`);

  // pergunta segurada: existe, é curta, e o fecho é quem a responde
  const perg = String(n.perguntaAberta || '').trim();
  if (!perg) erros.push('sem "perguntaAberta"');
  else if (perg.length > 30) erros.push(`"perguntaAberta" tem ${perg.length} chars (máximo 30 — é texto de tela)`);

  // ENCADEAMENTO (o motivo deste ficheiro existir): heurística, por isso é AVISO.
  // Um bloco que não retoma NENHUMA palavra de conteúdo do anterior é candidato a
  // "solto". Não vira erro porque sinónimos e pronomes também encadeiam e a
  // heurística não os vê — reprovar por isto queimaria tentativas à toa.
  for (let i = 1; i < blocos.length; i++) {
    const anterior = (blocos[i - 1]?.fala) || '';
    const atual = (blocos[i]?.fala) || '';
    if (!anterior || !atual) continue;
    const compartilhado = longestSharedWordRun(anterior, atual, 1);
    if (!compartilhado.length) {
      avisos.push(`bloco ${i + 1} ("${PAPEIS[i]}") não retoma nenhuma palavra do anterior — verifique se não ficou solto`);
    }
  }

  return { ok: erros.length === 0, erros, avisos, palavras };
}

function extrairJson(texto) {
  let s = String(texto).trim();
  const cerca = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (cerca) s = cerca[1].trim();
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a === -1 || b === -1) throw new Error('nenhum JSON na resposta do modelo');
  return JSON.parse(s.slice(a, b + 1));
}

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

export async function gerarNarrativa(t, { tentativas = 3, proibidas = [], frasesRecentes = [] } = {}) {
  const base = buildPromptNarrativa(t, proibidas, frasesRecentes);
  let corretivo = '';
  const exigencias = [];
  for (let i = 1; i <= tentativas; i++) {
    if (i > 1) await dormir(20000); // mesmo respiro do gerador atual (token bucket)
    const prompt = corretivo ? `${base}\n\n${corretivo}` : base;
    const bruto = await generateText(prompt, { maxTokens: 4000, temperature: 0.7 });
    let n;
    try {
      n = extrairJson(bruto);
    } catch (err) {
      exigencias.push(`- devolva JSON válido (${err.message})`);
      corretivo = `⚠️ A TENTATIVA ANTERIOR FOI REJEITADA. Corrija TUDO isto ao mesmo tempo:\n${[...new Set(exigencias)].join('\n')}`;
      continue;
    }
    const v = validarNarrativa(n, proibidas);
    if (v.ok) return { narrativa: n, avisos: v.avisos, palavras: v.palavras, tentativa: i };
    exigencias.push(...v.erros.map((e) => `- ${e}`));
    corretivo = `⚠️ A TENTATIVA ANTERIOR FOI REJEITADA. Corrija TUDO isto ao mesmo tempo, reescrevendo a narração inteira:\n${[...new Set(exigencias)].join('\n')}`;
    console.log(`  ⚠ tentativa ${i}/${tentativas} reprovada: ${v.erros.join(' | ')}`);
  }
  throw new Error(`narração não passou na validação após ${tentativas} tentativas`);
}

// ─── execução direta ─────────────────────────────────────────────────────────
const executadoDireto = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('roteiro-narrativa.js');
if (executadoDireto) {
  const slug = args.slug && args.slug !== true ? String(args.slug) : 'juros-compostos';
  const t = lerTema(slug);
  console.log(`\n📝 PASSAGEM 1 — narração de "${t.term}"${t.angle ? ` (ângulo: ${t.angle})` : ''}\n`);

  const recentes = loadRecentPublishedContext();
  const proibidas = [...new Set(recentes.flatMap((r) => r.metaphors || []))].filter((m) => m !== 'clique-link');
  const frases = recentes.flatMap((r) => r.stories || []).slice(0, 4);
  if (proibidas.length) console.log(`🚫 imagens proibidas (${recentes.length} vídeos recentes): ${proibidas.join(', ')}\n`);

  const { narrativa, avisos, palavras, tentativa } = await gerarNarrativa(t, { proibidas, frasesRecentes: frases });

  console.log(`✅ aprovada na tentativa ${tentativa} — ${palavras} palavras (~${(palavras / 2.3).toFixed(0)}s de fala)`);
  console.log(`🧵 fio condutor: ${narrativa.fioCondutor}`);
  console.log(`❓ pergunta segurada: ${narrativa.perguntaAberta}\n`);
  console.log('─'.repeat(72));
  for (const b of narrativa.blocos) {
    console.log(`\n[${b.papel.toUpperCase()}]`);
    console.log(b.fala);
  }
  console.log(`\n${'─'.repeat(72)}`);
  console.log('\n📖 A NARRAÇÃO CORRIDA (leia como quem assiste):\n');
  console.log(narrativa.blocos.map((b) => b.fala).join(' '));
  if (avisos.length) {
    console.log('\n⚠️ avisos (não reprovam):');
    avisos.forEach((a) => console.log(`   · ${a}`));
  }
  console.log('');
}
