/**
 * MULTIPOST — O SEGUNDO CARTEIRO: o mesmo Short, agora no Instagram (IMPL20 §51).
 *
 * ═══ O DESENHO, EM UMA FRASE ═══
 * O vídeo já foi feito de madrugada e já foi entregue ao YouTube ao meio-dia. Este
 * programa vai buscar o MESMO ficheiro, entrega-o ao Multipost e marca a publicação
 * no Instagram para as 19h do Brasil. Não produz nada, não decide nada, não repete
 * trabalho nenhum.
 *
 * ═══ POR QUE UM SEGUNDO CARTEIRO E NÃO UM PASSO A MAIS NO PRIMEIRO ═══
 * Decisão do dono (05/08): se este falhar, o YouTube não pode sentir. Um passo
 * dentro do carteiro do YouTube partilharia a sorte dele — e obrigaria as duas
 * redes à mesma hora. Separados, cada um tem o seu relógio e a sua fila.
 *
 * ═══ O QUE SE DESCOBRIU SOBRE O MULTIPOST (05/08/2026) ═══
 * O "Multipost" é um Postiz auto-hospedado. Entregar é em DOIS passos:
 *   1. POST /api/public/v1/upload  → manda-se o ficheiro e recebe-se {id, path}
 *   2. POST /api/public/v1/posts   → cria-se o agendamento com type=schedule
 * ⚠️ A chave vai no cabeçalho `Authorization` CRUA (sem "Bearer" — isso é só no MCP).
 * ⚠️ Não existe `external_ref`: evitar duplicados é responsabilidade nossa. Por isso
 *    há um caderno (.github/data/instagram-agendados.json) e a fila só é rasgada
 *    DEPOIS de o agendamento existir.
 * ⚠️ Ao apagar, o servidor responde "erro" mesmo quando apagou. Nunca confiar na
 *    resposta de um apagamento — conferir a agenda.
 *
 * ═══ A HORA ═══
 * A API pede a data em UTC. O Brasil não muda a hora desde 2019, por isso são
 * sempre 3 horas à frente: 19h no Brasil = 22h UTC. Já houve um engano deste tipo
 * neste projeto ("sábado 02:00 UTC" era sexta 23h no Brasil), e é por isso que a
 * conta está numa função à parte, com prova.
 *
 * Segredos (env): MULTIPOST_API_KEY. Opcional: MULTIPOST_URL.
 *
 * Uso:
 *   node src/scripts/multipost/entregar.js --slug=juros-compostos
 *   node src/scripts/multipost/entregar.js --slug=juros-compostos --dry-run
 *   node src/scripts/multipost/entregar.js --slug=X --hora=20
 *   node src/scripts/multipost/entregar.js --inspecionar   ← só lê: o que o servidor aceita e guardou
 */

import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

// ─── caminhos ────────────────────────────────────────────────────────────────
import { caminhoDaCapa } from '../youtube/capa-short.js';
import { BORDAO } from '../youtube/lib/schema-short.js';

const ROOT = process.cwd();
const MP4_DIR = join(ROOT, 'youtube-render', 'out');
const SCRIPT_DIR = join(ROOT, 'src', 'scripts', 'youtube', 'output');
const CADERNO = join(ROOT, '.github', 'data', 'instagram-agendados.json');

const BASE = (process.env.MULTIPOST_URL || 'https://multipost.help4desk.com').replace(/\/+$/, '');
const API = `${BASE}/api/public/v1`;

/** O Brasil está 3 horas atrás de Londres, o ano inteiro (não há horário de verão desde 2019). */
const BRASIL_UTC_OFFSET = 3;
/** A hora de publicar no Instagram, no relógio do Brasil. */
const HORA_BR_PADRAO = 19;
/** O Instagram corta a legenda aos 2200 caracteres. */
const MAX_LEGENDA = 2200;

const args = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => {
    const [k, ...v] = a.slice(2).split('=');
    return [k, v.join('=') || true];
  }),
);
const DRY_RUN = Boolean(args['dry-run']);
const log = (...m) => console.log(...m);

// ═══════════════════════════════════════════════════════════════════════════════
// A HORA — a parte que já enganou este projeto uma vez
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * A próxima vez que forem `horaBR` horas no Brasil, em UTC.
 * Se essa hora já passou hoje, marca para amanhã — nunca para o passado, que a API
 * aceitaria em silêncio e publicaria de imediato.
 */
export function proximaHoraBrasilEmUTC(horaBR = HORA_BR_PADRAO, agora = new Date()) {
  const alvo = new Date(Date.UTC(
    agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate(),
    horaBR + BRASIL_UTC_OFFSET, 0, 0, 0,
  ));
  if (alvo.getTime() <= agora.getTime()) alvo.setUTCDate(alvo.getUTCDate() + 1);
  return alvo;
}

/** Como se lê a mesma hora no relógio do Brasil — só para o humano conferir no log. */
export function emHoraDoBrasil(dataUTC) {
  const d = new Date(dataUTC.getTime() - BRASIL_UTC_OFFSET * 3600 * 1000);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)} às ${p(d.getUTCHours())}h${p(d.getUTCMinutes())}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// A LEGENDA — parecida com a do YouTube, mas NÃO igual
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * ⚠️ OS ASTERISCOS TÊM DE SAIR. No roteiro eles marcam o que o vídeo destaca no
 * ecrã; numa legenda de Instagram apareceriam como lixo no meio da frase. (No
 * Short, um asterisco chegou a ser LIDO em voz alta — é um defeito com história.)
 */
function limpar(texto) {
  return String(texto || '').replace(/\*/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * ⚠️ OS ACENTOS FICAM. O Instagram aceita-os e é com eles que se procura em
 * português — "#inflação" tem público, "#inflacao" tem quase ninguém. Tirá-los
 * também deixaria a etiqueta do tema desalinhada das fixas (#FinançasPessoais).
 */
function hashtagDe(palavra) {
  const limpa = String(palavra || '')
    .replace(/[^\p{L}\p{N} ]/gu, ' ')
    .trim().split(/\s+/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join('');
  return limpa ? `#${limpa}` : '';
}

/**
 * ⚠️ A PALAVRA-CHAVE NEM SEMPRE É UMA PALAVRA. Olhando os 15 roteiros já feitos,
 * ela tanto é "inflação" como é a FRASE INTEIRA do título — *"Se eu devesse R$ 30
 * mil, faria ISSO"*. Transformar isso numa etiqueta daria
 * `#SeEuDevesseR30MilFariaIsso`: um monstro que ninguém procura e que grita
 * "isto foi feito por uma máquina". (É o mesmo defeito que já mordeu as hashtags
 * do YouTube, quando as três chegavam coladas e viravam uma só.)
 *
 * Regra: **no máximo duas palavras**, e nunca uma palavra vaga. Uma etiqueta a
 * menos não custa nada; uma etiqueta ridícula custa a credibilidade do perfil.
 */
const MAX_PALAVRAS_NA_ETIQUETA = 2;
const PALAVRAS_VAGAS = new Set(['bolso', 'dinheiro', 'grana', 'vida', 'futuro', 'conta', 'app', 'coisas']);

export function etiquetaDaPalavraChave(keyword) {
  const cru = limpar(keyword);
  const palavras = cru.split(/\s+/).filter(Boolean);
  if (!palavras.length || palavras.length > MAX_PALAVRAS_NA_ETIQUETA) return '';
  if (PALAVRAS_VAGAS.has(cru.toLowerCase())) return '';
  return hashtagDe(cru);
}

/**
 * A etiqueta do ASSUNTO, tirada da categoria do roteiro.
 * Existe para o post nunca ficar só com as etiquetas genéricas quando a
 * palavra-chave é recusada pela regra acima — foi o caso do "Eduque seu bolso".
 */
const ETIQUETA_DA_CATEGORIA = {
  basico: '#FinançasDoZero',
  controle: '#ControleFinanceiro',
  credito: '#Crédito',
  investimento: '#Investimentos',
  mercado: '#MercadoFinanceiro',
  mindset: '#MentalidadeFinanceira',
};

/**
 * A legenda do Instagram.
 * ⚠️ NÃO leva "link na descrição" — no Instagram essa frase não quer dizer nada, e
 * era essa a diferença que obrigava a uma legenda própria em vez de reaproveitar a
 * do YouTube. O convite é o MESMO ("comenta FINMOOVI"), porque é ele que a
 * automação do Multipost está à espera de ouvir.
 */
/**
 * ⚠️ NO INSTAGRAM NÃO HÁ NEGRITO — e os asteriscos aparecem à letra.
 * O YouTube aceita *palavra* como negrito; o Instagram mostra os asteriscos como
 * caracteres. Por isso a legenda daqui usa **emojis e espaço em branco** para dar
 * hierarquia, e nunca marcação. É a mesma informação, noutra língua tipográfica.
 */
/**
 * ⚠️ OS TÓPICOS SAEM DO GUIÃO, NÃO DE UM MOLDE.
 *
 * A primeira versão montava-os a partir da palavra-chave — e num vídeo cuja
 * palavra-chave era "bolso" saiu isto: *"O que é bolso e por que mexe no seu bolso"*.
 * Um molde aplicado a uma palavra vaga produz uma frase vazia, e uma frase vazia numa
 * legenda diz à pessoa que ninguém leu aquilo antes de publicar.
 *
 * Agora saem das cenas de conteúdo (as `beat`), que é onde o vídeo explica alguma
 * coisa. Só entram frases com corpo: as curtas demais são restos ("E cada um pesa.")
 * e as compridas demais são parágrafos disfarçados.
 */
const MIN_TOPICO = 38;
const MAX_TOPICO = 95;

/** Compara duas frases ignorando pontuação, acentos e maiúsculas. */
const mesmaFrase = (a, b) => {
  const n = (t) => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]/g, '');
  return n(a) === n(b);
};

export function topicosDoRoteiro(roteiro) {
  const frases = [];
  for (const cena of roteiro.scenes || []) {
    if (cena.role && cena.role !== 'beat') continue;
    for (const frase of limpar(cena.narration).split(/(?<=[.!?])\s+/)) {
      const f = frase.trim();
      if (f.length < MIN_TOPICO || f.length > MAX_TOPICO) continue;
      // ⚠️ O BORDÃO DO CANAL NÃO É UM TÓPICO. Ele é dito uma vez em todos os vídeos,
      // por regra do roteirista — e apareceu como "tópico" em dois vídeos diferentes.
      // Uma legenda que promete ensinar e entrega o slogan da casa é publicidade
      // disfarçada de índice.
      if (mesmaFrase(f, BORDAO)) continue;
      frases.push(f);
    }
  }
  const unicas = [...new Set(frases)];
  if (unicas.length >= 2) return unicas.slice(0, 3);

  // Rede de segurança: um guião sem frases aproveitáveis não deixa o bloco vazio.
  // ⚠️ E nunca a palavra-chave sozinha: "Alavancagem" não é um tópico, é uma etiqueta.
  const kw = limpar(roteiro.keyword || roteiro.term || 'finanças');
  const titulo = limpar(roteiro.term);
  return [
    titulo && !mesmaFrase(titulo, kw) ? titulo : `Como ${kw} funciona na prática`,
    'A conta que quase ninguém faz — e devia fazer',
    'Como fazer essa conta no seu caso, de graça',
  ].map((t) => t.slice(0, MAX_TOPICO));
}

export function montarLegenda(roteiro) {
  const titulo = limpar(roteiro.term || roteiro.keyword || '');
  const gancho = limpar(roteiro.intro?.frase || '');
  const topicos = topicosDoRoteiro(roteiro);
  const tags = [
    etiquetaDaPalavraChave(roteiro.keyword),
    ETIQUETA_DA_CATEGORIA[roteiro.category] || '',
    '#FinançasPessoais',
    '#EducaçãoFinanceira',
    '#DinheiroNaPrática',
    '#FinMoovi',
  ].filter(Boolean);
  const tagsUnicas = [...new Set(tags)];

  const linhas = [
    titulo,
    '',
    gancho,
    '',
    '📌 O que você vai ver aqui:',
    ...topicos.map((t) => `• ${t}`),
    '',
    '💡 A verdade é que a maior parte das pessoas perde dinheiro sem perceber — não por falta de esforço, mas por falta de conta feita.',
    '',
    '👉 Comenta FINMOOVI aqui embaixo que eu te mando o app de graça. É de verdade, eu respondo.',
    '',
    '🔗 Ou entra direto: finmoovi.com',
    '',
    '💬 Ficou dúvida? Escreve aqui nos comentários.',
    '',
    tagsUnicas.join(' '),
  ].filter((l, i, arr) => !(l === '' && arr[i - 1] === ''));

  const texto = linhas.join('\n');
  return texto.length > MAX_LEGENDA ? `${texto.slice(0, MAX_LEGENDA - 1)}…` : texto;
}

/**
 * A legenda em HTML, para o Multipost.
 *
 * ⚠️ **UM `<p>` POR LINHA, E NUNCA `<br>`.** A primeira entrega usou `<br>` — que é o
 * que a documentação deles lista como aceite — e o resultado, visto no editor, foi
 * **um parágrafo só, com tudo colado**: título, gancho, chamada e hashtags numa
 * papa. Foi o dono que viu: *"veja que no Instagram está muito mal formatado"*.
 * Um `<p>` é um bloco; um `<br>` é uma sugestão que o editor deitou fora.
 */
export function legendaEmHtml(legenda) {
  return String(legenda)
    .split('\n')
    .map((l) => (l.trim() === '' ? '<p></p>' : `<p>${l}</p>`))
    .join('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// O caderno — o que já foi agendado, para nunca agendar duas vezes
// ═══════════════════════════════════════════════════════════════════════════════

function lerCaderno() {
  if (!existsSync(CADERNO)) return {};
  try {
    const d = JSON.parse(readFileSync(CADERNO, 'utf-8'));
    return d && typeof d === 'object' ? d : {};
  } catch {
    throw new Error(`O caderno ${CADERNO} existe mas não se lê. Conferir à mão — tratá-lo como vazio agendaria tudo outra vez.`);
  }
}

function gravarCaderno(d) {
  mkdirSync(dirname(CADERNO), { recursive: true });
  writeFileSync(CADERNO, `${JSON.stringify(d, null, 2)}\n`, 'utf-8');
}

// ═══════════════════════════════════════════════════════════════════════════════
// Conversa com o Multipost
// ═══════════════════════════════════════════════════════════════════════════════

function chave() {
  const k = (process.env.MULTIPOST_API_KEY || '').trim();
  if (!k) throw new Error('Falta o secret MULTIPOST_API_KEY.');
  return k;
}

/**
 * O canal do Instagram, perguntado ao servidor em vez de escrito à mão.
 *
 * ⚠️ **A BOMBA-RELÓGIO EXPLODIU NO MESMO DIA.** Escrevi aqui, em 05/08, que um
 * identificador copiado para dentro do código rebentaria no dia em que o dono
 * reconectasse a conta. Nessa mesma noite ele reconectou — e o identificador mudou
 * mesmo (`cmrvycxcg…` passou a `cmsh1wws…`). Este robô não sentiu nada, porque
 * pergunta. **A automação das mensagens privadas, essa, ficou órfã** e teve de ser
 * recriada à mão: uma automação pertence a um canal e não se pode mudar de canal
 * (a API responde 412).
 *
 * 📌 **REGRA, PARA A PRÓXIMA VEZ:** sempre que o Instagram for reconectado no
 * Multipost, é preciso **recriar a automação** — apagar e criar de novo, porque
 * editar não a move. E criar exige `replyMessage` no SINGULAR: com o plural, o
 * servidor cria só o gatilho e a automação fica muda, sem se queixar.
 */
async function canalDoInstagram(k) {
  const res = await fetch(`${API}/integrations`, { headers: { Authorization: k } });
  if (!res.ok) throw new Error(`Não consegui listar os canais (${res.status}): ${(await res.text()).slice(0, 200)}`);
  const canais = await res.json();
  const insta = (Array.isArray(canais) ? canais : []).filter((c) => c.identifier === 'instagram' && !c.disabled);
  if (!insta.length) {
    throw new Error('Não há nenhum canal de Instagram ligado e ativo no Multipost. Ligue-o no painel antes de correr isto.');
  }
  if (insta.length > 1) log(`⚠️ há ${insta.length} contas de Instagram ligadas — a usar a primeira: ${insta[0].name}`);
  return insta[0];
}

async function enviarFicheiro(k, caminho, nome, tipo = 'video/mp4') {
  const bytes = readFileSync(caminho);
  const fd = new FormData();
  fd.append('file', new Blob([bytes], { type: tipo }), nome);
  const res = await fetch(`${API}/upload`, { method: 'POST', headers: { Authorization: k }, body: fd });
  const texto = await res.text();
  if (!res.ok) throw new Error(`O envio do vídeo falhou (${res.status}): ${texto.slice(0, 300)}`);
  const media = JSON.parse(texto);
  if (!media?.id || !media?.path) throw new Error(`O servidor aceitou o ficheiro mas não devolveu id/path: ${texto.slice(0, 200)}`);
  return media;
}

/**
 * 🔴 06/08/2026 — A CAPA IA NO SÍTIO ERRADO, E NUNCA CHEGOU AO INSTAGRAM.
 *
 * Estava a ser mandada como `settings.cover`. **Esse campo não existe.** Três provas,
 * independentes umas das outras:
 *   1. a lista de opções do Instagram que o servidor aceita (`InstagramDto`) tem
 *      `post_type`, `is_trial_reel`, `graduation_strategy`, `collaborators` e `audio`
 *      — e mais nada. O que não está na lista é **deitado fora sem erro**;
 *   2. o código que fala com o Instagram nunca lê `settings.cover`;
 *   3. o dono viu o resultado: no painel, o "Editor" da capa do Reel aparece **vazio**.
 *
 * **O sítio certo é junto do VÍDEO, não nas opções**: o objeto de média aceita um campo
 * `thumbnail` com o ENDEREÇO da imagem, e é esse que vira o `cover_url` do Instagram —
 * o parâmetro oficial da Meta para a capa de um Reel (a Meta dá-lhe precedência sobre o
 * fotograma escolhido por tempo).
 *
 * ⚠️ **O `thumbnail` TEM DE SER UM ENDEREÇO COMPLETO.** O servidor valida-o como URL: um
 * caminho relativo faz o agendamento inteiro falhar com 400 — ou seja, **um dia sem
 * publicação por causa de uma imagem**. Por isso é conferido aqui, e na dúvida vai-se
 * sem capa. É a mesma regra que já valia para o envio da capa: nada de imagem pode
 * derrubar a publicação.
 */
export function objetoDaMedia(media, capa, registar = () => {}) {
  const base = { id: media.id, path: media.path };
  if (!capa) return base;
  if (!/^https?:\/\//i.test(String(capa.path || ''))) {
    registar(`⚠️ a capa veio com um endereço estranho ("${capa.path}") — segue sem capa, para não derrubar a publicação.`);
    return base;
  }
  return { ...base, thumbnail: capa.path };
}

/**
 * O pedido inteiro, montado à parte para poder ser CONFERIDO sem rede nenhuma
 * (`src/scripts/validacao/validar-multipost.js`). Antes vivia dentro do envio, e por
 * isso a única forma de o ver era publicar.
 */
export function corpoDoAgendamento({ canalId, media, capa, legenda, quandoUTC }, registar = () => {}) {
  return {
    type: 'schedule',
    date: quandoUTC.toISOString(),
    shortLink: false,
    tags: [],
    posts: [{
      integration: { id: canalId },
      value: [{ content: legendaEmHtml(legenda), image: [objetoDaMedia(media, capa, registar)] }],
      /**
       * ♦ 06/08/2026 — O REEL DE TESTE, POR ORDEM DO DONO.
       *
       * O Instagram mostra o Reel **primeiro só a quem NÃO segue o perfil**; se os
       * números forem bons, ele "gradua" e passa também aos seguidores. Para um canal a
       * começar, quem interessa alcançar é exatamente quem ainda não segue.
       *
       * ⚠️ **A graduação é AUTOMÁTICA (`SS_PERFORMANCE`) e não é detalhe.** Na outra
       * opção (`MANUAL`) é preciso alguém carregar num botão para o vídeo chegar aos
       * seguidores — e uma regra que depende de alguém se lembrar não é uma regra. Ficaria
       * um Reel por semana preso, sem ninguém dar por nada.
       *
       * ⚠️ E o Instagram **não deixa ter convidados (`collaborators`) num Reel de teste**.
       * Hoje não usamos convidados; no dia em que houver uma parceria, é preciso escolher.
       */
      settings: {
        __type: 'instagram',
        post_type: 'post',
        is_trial_reel: true,
        graduation_strategy: 'SS_PERFORMANCE',
      },
    }],
  };
}

async function agendar(k, pedido) {
  const corpo = corpoDoAgendamento(pedido, log);
  const res = await fetch(`${API}/posts`, {
    method: 'POST',
    headers: { Authorization: k, 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  });
  const texto = await res.text();
  if (!res.ok) {
    if (res.status === 403) throw new Error(`O Multipost recusou: limite de publicações do plano atingido (403). ${texto.slice(0, 200)}`);
    throw new Error(`O agendamento falhou (${res.status}): ${texto.slice(0, 300)}`);
  }
  const criado = JSON.parse(texto);
  const postId = Array.isArray(criado) ? criado[0]?.postId : criado?.postId;
  if (!postId) throw new Error(`O servidor respondeu 2xx mas sem identificar o post: ${texto.slice(0, 200)}`);
  return postId;
}

/**
 * ⚠️ A CONFERÊNCIA NÃO É OPCIONAL. Já se viu este servidor responder "erro" a um
 * apagamento que tinha funcionado — ou seja, a resposta dele não é prova de nada.
 * A prova é a agenda: se o post lá está, está agendado.
 */
async function confirmarNaAgenda(k, postId, quandoUTC) {
  const inicio = new Date(quandoUTC.getTime() - 36 * 3600 * 1000).toISOString();
  const fim = new Date(quandoUTC.getTime() + 36 * 3600 * 1000).toISOString();
  const res = await fetch(`${API}/posts?startDate=${inicio}&endDate=${fim}`, { headers: { Authorization: k } });
  if (!res.ok) return false;
  const d = await res.json();
  return (d?.posts || []).some((p) => p.id === postId);
}

/**
 * 🔎 O INSPETOR — pergunta ao Multipost o que ele aceita, em vez de adivinharmos.
 *
 * ═══ POR QUE ISTO EXISTE ═══
 * A capa do Reel foi mandada durante duas semanas num campo que não existe, e **nada se
 * queixou**: o servidor deita fora em silêncio o que não conhece. Descobriu-se a olhar
 * para o painel, não para o código — e só porque o dono reparou que o "Editor" da capa
 * estava vazio.
 *
 * Este servidor sabe responder exatamente **que opções aceita para cada canal**. Uma
 * pergunta, sem escrever nada, e acaba a adivinhação. Correr sempre que se quiser usar
 * uma opção nova do Instagram — e depois de qualquer atualização do Multipost, porque a
 * lista muda com a versão dele.
 *
 * Uso: node src/scripts/multipost/entregar.js --inspecionar
 */
async function inspecionar() {
  const k = chave();
  const canal = await canalDoInstagram(k);
  log(`\n📱 canal: ${canal.name}  (${canal.identifier})  id=${canal.id}\n`);

  log('── AS OPÇÕES QUE ESTE SERVIDOR ACEITA PARA O INSTAGRAM ──');
  const r = await fetch(`${API}/integration-settings/${encodeURIComponent(canal.id)}`, { headers: { Authorization: k } });
  const t = await r.text();
  if (!r.ok) log(`⚠️ não deu para perguntar (${r.status}): ${t.slice(0, 300)}`);
  else {
    try {
      const j = JSON.parse(t);
      log(JSON.stringify(j?.output?.settings ?? j, null, 2).slice(0, 4000));
      const cru = JSON.stringify(j);
      log(`\n🖼️  fala de capa? ${/cover|thumbnail/i.test(cru) ? '✅ SIM — e o nome do campo está aí em cima' : '❌ não aparece nenhum campo de capa nas OPÇÕES (então ela vai junto do vídeo)'}`);
      log(`🧪 fala de reel de teste? ${/trial/i.test(cru) ? '✅ sim' : '❌ não'}`);
    } catch { log(t.slice(0, 1500)); }
  }

  /**
   * ⚠️ E o que ele GUARDOU do que já lhe mandámos — que é a única prova de que um campo
   * sobreviveu. Um campo que ele aceita mas não guarda é igual a um campo que não existe.
   */
  log('\n── O QUE ELE GUARDOU DAS ÚLTIMAS PUBLICAÇÕES ──');
  const agora = Date.now();
  const p = await fetch(
    `${API}/posts?startDate=${new Date(agora - 30 * 864e5).toISOString()}&endDate=${new Date(agora + 30 * 864e5).toISOString()}`,
    { headers: { Authorization: k } },
  );
  if (!p.ok) { log(`⚠️ não deu para listar (${p.status})`); return 0; }
  const lista = (await p.json())?.posts || [];
  log(`${lista.length} publicação(ões) na janela de 60 dias.`);
  for (const post of lista.slice(0, 5)) {
    log(`\n  • ${post.id}  ${post.publishDate || post.date || ''}  estado=${post.state || '?'}`);
    for (const campo of ['settings', 'image', 'media', 'content']) {
      if (post[campo] === undefined) continue;
      const v = typeof post[campo] === 'string' ? post[campo] : JSON.stringify(post[campo]);
      log(`    ${campo}: ${String(v).slice(0, 600)}`);
    }
    const cru = JSON.stringify(post);
    if (/thumbnail|cover/i.test(cru)) log('    🖼️  ESTA guardou capa — procurar "thumbnail"/"cover" acima.');
  }
  log('');
  return 0;
}

// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  if (args.inspecionar) return inspecionar();

  const slug = String(args.slug || '');
  if (!slug) throw new Error('Falta --slug.');
  const horaBR = Number(args.hora) > 0 ? Number(args.hora) : HORA_BR_PADRAO;

  const mp4 = join(MP4_DIR, `${slug}.mp4`);
  const roteiroPath = join(SCRIPT_DIR, `${slug}.script.json`);
  if (!existsSync(mp4)) throw new Error(`Não encontrei o vídeo: ${mp4}`);
  if (!existsSync(roteiroPath)) throw new Error(`Não encontrei o roteiro: ${roteiroPath}`);

  const roteiro = JSON.parse(readFileSync(roteiroPath, 'utf-8'));
  const legenda = montarLegenda(roteiro);
  const quando = proximaHoraBrasilEmUTC(horaBR);
  const tamanhoMB = (statSync(mp4).size / 1048576).toFixed(1);

  const caderno = lerCaderno();
  if (caderno[slug]) {
    log(`⏭️  "${slug}" já tinha sido agendado em ${caderno[slug].agendadoEm} (post ${caderno[slug].postId}). Nada a fazer.`);
    // ⚠️ SE O POST FOI APAGADO À MÃO, O CADERNO PASSA A MENTIR — e este robô recusa
    // para sempre um vídeo que já não está agendado em lado nenhum. Aconteceu em
    // 05/08, quando o primeiro agendamento foi apagado para corrigir a legenda.
    // A cura é uma linha: apagar a entrada em .github/data/instagram-agendados.json.
    log('   (se o post foi apagado no painel, tire este slug de .github/data/instagram-agendados.json)');
    return 0;
  }

  log(`\n📤 Multipost — a entregar "${slug}"${DRY_RUN ? ' (ENSAIO: não envia nada)' : ''}`);
  log(`🎞️  ficheiro: ${tamanhoMB} MB`);
  log(`🕖 publicar: ${emHoraDoBrasil(quando)} no Brasil  =  ${quando.toISOString()} em UTC`);
  log(`\n── legenda ──\n${legenda}\n──────────────\n`);

  if (DRY_RUN) {
    // A capa aparece no ensaio de propósito: a sua ausência tem de ser visível ANTES
    // da entrega, e não descoberta depois no perfil.
    const c = caminhoDaCapa(slug);
    log(`🖼️  capa: ${existsSync(c) ? `${Math.round(statSync(c).size / 1024)} KB` : 'FALTA — o Instagram escolheria um fotograma ao calhas'}`);
    /**
     * ⚠️ O ENSAIO PASSA A MOSTRAR O PEDIDO. A capa foi entregue duas semanas num campo
     * que não existe e o ensaio dizia sempre "capa: 139 KB" — verdade, e inútil: ele
     * media o ficheiro no disco, não o que ia dentro do pedido. Agora vê-se o pedido.
     * (Os endereços são de exemplo: os verdadeiros só existem depois do envio.)
     */
    const exemplo = corpoDoAgendamento({
      canalId: '(o canal do Instagram)',
      media: { id: '(id do vídeo)', path: 'https://exemplo/video.mp4' },
      capa: existsSync(c) ? { id: '(id da capa)', path: 'https://exemplo/capa.jpg' } : null,
      legenda, quandoUTC: quando,
    }, log);
    log('\n── O QUE SERIA PEDIDO AO MULTIPOST ──');
    log(`vídeo+capa: ${JSON.stringify(exemplo.posts[0].value[0].image[0])}`);
    log(`opções:     ${JSON.stringify(exemplo.posts[0].settings)}`);
    log('\n✅ Ensaio concluído. Nada foi enviado nem agendado.\n');
    return 0;
  }

  const k = chave();
  const canal = await canalDoInstagram(k);
  log(`📱 canal: ${canal.name} (${canal.identifier})`);

  const media = await enviarFicheiro(k, mp4, `${slug}.mp4`);
  log(`⬆️  vídeo entregue: ${media.path}`);

  // A capa vem pronta no artefato da produção, a mesma que vai ao YouTube.
  // ⚠️ Falhar a capa NÃO pode impedir a publicação: um Reel sem capa própria ainda é
  // um Reel; um vídeo que não sai por causa de uma imagem é um dia perdido.
  let capa = null;
  const capaLocal = caminhoDaCapa(slug);
  if (existsSync(capaLocal)) {
    try {
      capa = await enviarFicheiro(k, capaLocal, `capa-${slug}.jpg`, 'image/jpeg');
      log(`🖼️  capa entregue: ${capa.path}`);
    } catch (e) {
      log(`⚠️ a capa falhou (${e.message}) — segue sem ela.`);
    }
  } else {
    log('⚠️ não veio capa no artefato — o Instagram escolherá um fotograma ao calhas.');
  }

  const postId = await agendar(k, { canalId: canal.id, media, capa, legenda, quandoUTC: quando });
  const confirmado = await confirmarNaAgenda(k, postId, quando);
  if (!confirmado) {
    throw new Error(`O servidor devolveu o post ${postId}, mas ele NÃO aparece na agenda. Conferir no painel antes de correr outra vez.`);
  }

  caderno[slug] = {
    postId,
    canal: canal.name,
    media: media.path,
    publicaEm: quando.toISOString(),
    publicaEmBR: emHoraDoBrasil(quando),
    agendadoEm: new Date().toISOString(),
  };
  gravarCaderno(caderno);

  log(`\n✅ agendado e confirmado na agenda — post ${postId}`);
  log(`   vai ao ar ${emHoraDoBrasil(quando)} (hora do Brasil)\n`);
  return 0;
}

// ─── execução direta ─────────────────────────────────────────────────────────

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('multipost/entregar.js')) {
  main()
    .then((c) => process.exit(c))
    .catch((e) => {
      console.error(`\n❌ ${e.message}\n`);
      process.exit(1);
    });
}
