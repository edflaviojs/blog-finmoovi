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
 */

import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

// ─── caminhos ────────────────────────────────────────────────────────────────
import { caminhoDaCapa } from '../youtube/capa-short.js';

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
export function montarLegenda(roteiro) {
  const titulo = limpar(roteiro.term || roteiro.keyword || '');
  const gancho = limpar(roteiro.intro?.frase || '');
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
    '👉 Comenta FINMOOVI aqui embaixo que eu te mando o app de graça.',
    '',
    tagsUnicas.join(' '),
  ].filter((l, i, arr) => !(l === '' && arr[i - 1] === ''));

  const texto = linhas.join('\n');
  return texto.length > MAX_LEGENDA ? `${texto.slice(0, MAX_LEGENDA - 1)}…` : texto;
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
 * Um identificador copiado para dentro do código é uma bomba-relógio: no dia em que
 * o dono reconectar a conta, ele muda e o robô passa a entregar ao nada.
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

async function agendar(k, { canalId, media, capa, legenda, quandoUTC }) {
  const corpo = {
    type: 'schedule',
    date: quandoUTC.toISOString(),
    shortLink: false,
    tags: [],
    posts: [{
      integration: { id: canalId },
      value: [{ content: `<p>${legenda.replace(/\n/g, '<br>')}</p>`, image: [{ id: media.id, path: media.path }] }],
      // A capa é o que aparece na grelha do perfil. Sem ela, o Instagram escolhe um
      // fotograma ao calhas — que é o que acontece hoje nos 11 Shorts do YouTube.
      settings: capa
        ? { __type: 'instagram', post_type: 'post', cover: { id: capa.id, path: capa.path } }
        : { __type: 'instagram', post_type: 'post' },
    }],
  };
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

// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
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
