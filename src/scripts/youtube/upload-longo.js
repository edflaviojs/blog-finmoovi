/**
 * A SUBIDA DO VÍDEO LONGO — privado, com hora de estreia marcada (05/08/2026).
 *
 * ═══ POR QUE NÃO É O ESPELHO DO SHORT (IMPL20 §44.1) ═══
 * O Short tem dois robôs: um produz de madrugada e põe na fila, outro publica ao
 * meio-dia. Para o longo, **um só é melhor**, e a diferença está aqui dentro:
 *
 * | | o espelho do Short | 👉 o que este ficheiro faz |
 * |---|---|---|
 * | quando publica | um relógio do GitHub ao domingo | sobe **sábado, privado**, com a estreia marcada |
 * | quem garante a hora | o relógio do GitHub | **o YouTube** |
 * | atraso possível | **até 112 minutos** (medido — memória `blog-workflows-infra`) | **zero** |
 * | revisão antes do ar | nenhuma | **um dia inteiro**, de graça |
 *
 * > Se o dono não fizer nada, o vídeo sai sozinho ao domingo às 19h00 do Brasil.
 * > Se não gostar, é um clique no Studio — e ninguém viu nada.
 *
 * ═══ 🔴 O CADERNO É PRÓPRIO, E ISSO NÃO É ARRUMAÇÃO ═══
 * O Short guarda os **últimos 12 vídeos publicados** para não repetir imagens, e lê essa
 * lista de `.github/data/youtube-published.json`. Se o vídeo longo escrevesse lá, ocupava
 * um desses doze lugares **todas as semanas** — encurtando em silêncio a memória do robô
 * que publica todos os dias. Por isso este ficheiro escreve no SEU caderno, e o do Short
 * fica exatamente como está.
 *
 * ═══ ⚠️ O TÍTULO NÃO SE INVENTA ═══
 * Não há aqui uma linha de IA, e é de propósito: em 03/08 descobriu-se que **5 das 9
 * descrições geradas por IA que estavam no ar acabavam a meio da palavra** (§33.3). A
 * descrição é uma lista de coisas que já sabemos, e é montada pelo `descricao-longo.js`.
 * **O título vem da fila de temas, que o dono aprova.** Se não houver título aprovado
 * para este vídeo, isto PARA — porque um título mau é a coisa mais cara que este canal
 * pode pôr no ar, e é a única que ninguém consegue desfazer depois de a lista o mostrar.
 *
 * ⚠️ **NADA AQUI TOCA NO ROBÔ DIÁRIO.** A única coisa que vem de lá é a renovação da
 * chave do Google — importada, nunca copiada, porque duplicar credenciais é o modo de
 * falha crónico desta casa (§33) e porque o `upload-short.js` só corre quando é chamado
 * pelo nome, portanto importá-lo não publica nada.
 *
 * Uso:
 *   node src/scripts/youtube/upload-longo.js --slug=sair-do-vermelho --dry-run
 *   node src/scripts/youtube/upload-longo.js --slug=sair-do-vermelho
 *   node src/scripts/youtube/upload-longo.js --slug=... --publicar-em=2026-08-16T22:00:00Z
 */

import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
/**
 * ⚠️ IMPORTADO, NÃO COPIADO — e é a razão pela qual o `upload-short.js` ganhou, em
 * 03/08, a guarda que o impede de correr ao ser importado: *"o corretor de descrições usa
 * as MESMAS funções que o robô usa, em vez de uma cópia que amanhã diverge"*. A renovação
 * da chave do Google é exatamente esse caso.
 */
import { getAccessToken, escolherEtiquetas } from './upload-short.js';
import { prepararDescricao } from './descricao-longo.js';
import { textoDoPrimeiroComentario, escreverPrimeiroComentario } from './lib/primeiro-comentario.js';
import { arrumarNasPlaylists } from './lib/playlists.js';

// ─── caminhos ────────────────────────────────────────────────────────────────
const ROOT = process.cwd();
const ROTEIRO_DIR = join(ROOT, 'youtube-render', 'public', 'roteiro');
const AUDIO_ROOT = join(ROOT, 'youtube-render', 'public', 'audio');
const MANUS_DIR = join(ROOT, 'youtube-render', 'public', 'manus');
/** ⚠️ O longo sai em `out/longo/`, não em `out/` — é o render por partes (§34). */
const MP4_DIR = join(ROOT, 'youtube-render', 'out', 'longo');
/** ⚠️ Caderno PRÓPRIO. Ver o aviso no cabeçalho. */
const TRACKING = join(ROOT, '.github', 'data', 'youtube-longos-published.json');
/** A fila de temas do vídeo longo — é dela que sai o título aprovado. */
const FILA = join(ROOT, '.github', 'data', 'youtube-longos.json');

const TOKEN_URL_NOTA = 'scripts/youtube-auth.js';
const UPLOAD_URL = 'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status';
const CAPTIONS_URL = 'https://www.googleapis.com/upload/youtube/v3/captions?part=snippet&uploadType=multipart';
const THUMBNAIL_URL = 'https://www.googleapis.com/upload/youtube/v3/thumbnails/set?uploadType=media&videoId=';

const LEGENDAS = [
  { code: 'pt', language: 'pt-BR', name: 'Português (Brasil)' },
  { code: 'en', language: 'en', name: 'English' },
  { code: 'es', language: 'es', name: 'Español' },
];

/**
 * Os nomes por que a capa pode aparecer, por ordem de preferência.
 * A escolhida pelo dono em 04/08 foi a **variante do canal**, já a 1280×720 (§44.4).
 */
const NOMES_DA_CAPA = ['capa-canal-youtube.jpg', 'capa-youtube.jpg', 'capa-canal.jpg', 'capa.jpg'];

const args = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => {
    const [k, ...v] = a.slice(2).split('=');
    return [k, v.join('=') || true];
  }),
);
const valor = (nome) => (args[nome] && args[nome] !== true ? String(args[nome]) : null);

const SLUG = valor('slug') || 'sair-do-vermelho';
const ENSAIO = Boolean(args['dry-run']);

function log(msg) { console.log(msg); }

/** O YouTube recusa `<` e `>`. Corta no limite e tira o lixo. */
function limpar(texto, max) {
  const s = String(texto || '').replace(/[<>]/g, '').replace(/\r/g, '').trim();
  return max ? s.slice(0, max) : s;
}

// ═══════════════════════════════════════════════════════════════════════════════
// A HORA DE ESTREIA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * O PRÓXIMO DOMINGO ÀS 19h00 DO BRASIL, em hora universal.
 *
 * ⚠️ **19h00 no Brasil são 22h00 universais, o ano inteiro.** O Brasil acabou com a hora
 * de verão em 2019, portanto não há aqui o cuidado sazonal que Lisboa exigiria — e é bom
 * que se diga por escrito, porque a tentação de "corrigir" isto daqui a uns meses é real.
 *
 * Devolve sempre um instante **no futuro**: se hoje já for domingo depois das 22h00
 * universais, salta para o domingo seguinte. O YouTube recusa uma estreia no passado, e
 * recusá-la depois de o vídeo já estar lá em cima seria o pior dos dois mundos.
 */
export function proximoDomingo(agora = new Date()) {
  const alvo = new Date(Date.UTC(
    agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate(), 22, 0, 0, 0,
  ));
  // 0 = domingo
  const faltam = (7 - alvo.getUTCDay()) % 7;
  alvo.setUTCDate(alvo.getUTCDate() + faltam);
  if (alvo.getTime() <= agora.getTime()) alvo.setUTCDate(alvo.getUTCDate() + 7);
  return alvo;
}

/**
 * 🔴 QUEM JÁ ESTÁ MARCADO PARA ESTE DIA — ou nada, se o dia estiver livre.
 *
 * ═══ POR QUE ISTO EXISTE, E NÃO É UMA PRECAUÇÃO TEÓRICA ═══
 * O primeiro vídeo do canal é subido À MÃO pelo dono e estreia **domingo 09/08 às 19h00**.
 * O relógio do robô dispara ao **sábado**. Ligá-lo numa quarta-feira faria a primeira
 * corrida cair em **sábado 08/08** — e ela marcaria o vídeo seguinte para **o mesmo
 * domingo, à mesma hora**. Dois vídeos do canal a estrear no mesmo minuto.
 *
 * A cura preguiçosa era esperar por segunda-feira para ligar o relógio. **Não serve:**
 * resolve uma vez e deixa a armadilha armada para sempre — basta alguém repetir uma
 * corrida à mão, ou o dono agendar um vídeo especial numa semana em que o robô também
 * trabalha. **A regra que fica é outra, e vale para sempre: um dia, um vídeo.**
 *
 * ⚠️ Compara-se o DIA, não o instante. Dois vídeos do mesmo canal no mesmo domingo
 * competem um com o outro na lista de quem se inscreveu, mesmo com horas diferentes.
 */
export function estreiaOcupada(estreia, caderno = lerCaderno(), slugAtual = null) {
  const dia = (d) => new Date(d).toISOString().slice(0, 10);
  const alvo = dia(estreia);
  for (const [slug, registo] of Object.entries(caderno || {})) {
    /**
     * ⚠️ **UM VÍDEO NÃO OCUPA O DIA CONTRA SI PRÓPRIO.**
     * O caderno também guarda RESERVAS — dias já apontados para um vídeo que ainda não
     * subiu. Sem esta linha, o dia reservado para o vídeo X impedia o próprio X de subir,
     * e a mensagem seria absurda: *"domingo já é do vídeo sair-do-vermelho"* a recusar o
     * sair-do-vermelho. Foi o que aconteceu no primeiro ensaio a sério.
     */
    if (slugAtual && slug === slugAtual) continue;
    const quando = registo?.publishAt || registo?.uploadedAt;
    if (quando && dia(quando) === alvo) return { slug, publishAt: quando };
  }
  return null;
}

/**
 * 🔴 O CADERNO DIZ A INTENÇÃO; **O YOUTUBE DIZ A VERDADE.**
 *
 * ═══ O CASO REAL QUE OBRIGOU A ISTO (05/08) ═══
 * O dono quis subir o vídeo já pronto **só para validar a subida**, agendado para o
 * domingo — e, depois de confirmar que subiu bem, **torná-lo público logo**, porque o
 * vídeo está feito e não há razão para o deixar parado. Mas o domingo tinha de continuar
 * a ser do **primeiro vídeo automático**.
 *
 * Com a reserva escrita no caderno, o robô de sábado veria o domingo ocupado e não faria
 * nada — **e o canal perdia uma semana** por causa de uma linha que já não era verdade.
 * A cura preguiçosa era alguém lembrar-se de apagar essa linha. **Uma regra que depende
 * de alguém se lembrar não é uma regra.**
 *
 * ═══ O QUE SE FAZ ═══
 * Pergunta-se ao YouTube o que é feito de cada vídeo reservado:
 *   · **ainda privado e marcado para aquele dia** → o dia está mesmo ocupado;
 *   · **já público** → foi publicado mais cedo, e **o dia ficou livre**;
 *   · **sem identificador, ou o YouTube não responde** → trata-se como ocupado, porque
 *     entre publicar dois vídeos no mesmo dia e não publicar nenhum, o erro barato é o
 *     segundo.
 *
 * É a regra da casa aplicada ao calendário: **conferir o resultado, nunca o que está
 * escrito**. E ela corrige-se sozinha nos dois sentidos — se o dono não mexer em nada, o
 * vídeo de hoje estreia no domingo e o robô de sábado desiste; se o tornar público antes,
 * o robô de sábado faz o vídeo novo para esse mesmo domingo.
 */
export async function estadoNoYouTube(videoIds, chave) {
  if (!videoIds.length) return {};
  const r = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=status&id=${videoIds.join(',')}`,
    { headers: { Authorization: `Bearer ${chave}` } },
  );
  if (!r.ok) throw new Error(`o YouTube não respondeu (${r.status})`);
  const j = await r.json();
  const saida = {};
  for (const v of j.items || []) {
    saida[v.id] = { privacidade: v.status?.privacyStatus, estreia: v.status?.publishAt || null };
  }
  return saida;
}

/**
 * A mesma pergunta de `estreiaOcupada`, mas **confirmada com o YouTube**.
 * Sem chave, ou se a rede falhar, cai na resposta do caderno — que é a conservadora.
 */
export async function estreiaOcupadaDeVerdade(estreia, { caderno = lerCaderno(), slugAtual = null, chave = null, registar = () => {} } = {}) {
  const ocupado = estreiaOcupada(estreia, caderno, slugAtual);
  if (!ocupado || !chave) return ocupado;

  const videoId = caderno[ocupado.slug]?.videoId;
  if (!videoId) {
    registar(`   (a reserva de "${ocupado.slug}" ainda não tem vídeo no YouTube — trata-se como ocupada)`);
    return ocupado;
  }
  try {
    const estados = await estadoNoYouTube([videoId], chave);
    const e = estados[videoId];
    if (!e) { registar(`   (o YouTube não conhece ${videoId} — trata-se como ocupada)`); return ocupado; }
    if (e.privacidade === 'private' && e.estreia) {
      registar(`   confirmado no YouTube: "${ocupado.slug}" continua privado, a estrear em ${e.estreia}`);
      return ocupado;
    }
    registar(`   ✅ "${ocupado.slug}" já está ${e.privacidade === 'public' ? 'PÚBLICO' : e.privacidade} — o dia ficou livre.`);
    return null;
  } catch (err) {
    registar(`   ⚠️ não deu para perguntar ao YouTube (${err.message}) — trata-se como ocupada, que é o erro barato.`);
    return ocupado;
  }
}

/** "domingo, 9 de agosto, às 19h00 do Brasil" — para quem lê o registo entender. */
export function emPortugues(data) {
  const brasilia = new Date(data.getTime() - 3 * 3600 * 1000);
  const dias = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const hora = `${String(brasilia.getUTCHours()).padStart(2, '0')}h${String(brasilia.getUTCMinutes()).padStart(2, '0')}`;
  return `${dias[brasilia.getUTCDay()]}, ${brasilia.getUTCDate()} de ${meses[brasilia.getUTCMonth()]}, às ${hora} do Brasil`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// O TÍTULO E AS PALAVRAS-CHAVE — tudo calculado, nada pedido a um modelo
// ═══════════════════════════════════════════════════════════════════════════════

function lerFila() {
  if (!existsSync(FILA)) return { videos: [] };
  try { return JSON.parse(readFileSync(FILA, 'utf-8')) || { videos: [] }; }
  catch { return { videos: [] }; }
}

/**
 * O TÍTULO APROVADO deste vídeo. Sem ele, isto PARA — ver o aviso no cabeçalho.
 *
 * O padrão que o canal já tem aceite (§44.1): **palavra-chave à frente**, para a busca,
 * **+ a objeção removida** — e nunca a repetir o que a capa já grita. Um título que
 * repete a miniatura desperdiça metade do espaço que se tem para convencer.
 */
export function tituloAprovado(slug, fila = lerFila()) {
  const daLinhaDeComando = valor('titulo');
  if (daLinhaDeComando) return daLinhaDeComando;
  const entrada = (fila.videos || []).find((v) => v.slug === slug);
  return entrada?.titulo || null;
}

/**
 * As palavras-chave do canal — as que são verdade em QUALQUER vídeo longo daqui.
 * ⚠️ Não podem ser do assunto deste vídeo: "dívida do cartão" numa peça sobre reserva de
 * emergência é uma etiqueta errada, e etiquetas erradas ensinam o YouTube a mostrar o
 * vídeo a quem não o quer. O que é DESTE vídeo vem da fila de temas, que o dono aprova.
 */
const PALAVRAS_DO_CANAL = [
  'finanças pessoais', 'educação financeira', 'controle financeiro',
  'organizar as contas', 'app de finanças', 'FinMoovi',
];

/** Quantas palavras uma etiqueta pode ter antes de deixar de ser procurada por alguém. */
const MAX_PALAVRAS_ETIQUETA = 5;

/**
 * As palavras-chave. Zero IA — é uma lista, e o que se monta com uma lista não sai
 * cortado a meio (a lição das 9 primeiras descrições, §33.3).
 *
 * 🔴 **E A 1ª VERSÃO DESTA FUNÇÃO CAIU NESSE MESMO DEFEITO, no ensaio de 05/08.** Ela
 * CORTAVA a etiqueta aos 60 caracteres, e o que saiu foi
 * *"o plano de três passos pra pagar a dívida sem apertar mais o"* — a acabar a meio da
 * palavra, tal e qual as descrições de 03/08. **Uma etiqueta cortada não é uma etiqueta
 * mais curta: é lixo.** Agora o que não cabe é DEITADO FORA, não aparado.
 *
 * ⚠️ E saíam também os títulos dos capítulos inteiros — *"O dia em que eu vi o tamanho da
 * fatura"*. É uma frase bonita e **ninguém a escreve numa busca.** O teto de cinco
 * palavras deita fora as frases e guarda os termos.
 */
export function palavrasChave(plano, doVideo = []) {
  const cruas = [
    ...doVideo,
    ...String(plano.tema || '').split(/[:,—–-]/),
    /**
     * 🔴 O `fioCondutor` NÃO ENTRA, e a 1ª versão punha-o cá. No ensaio de 05/08 saiu a
     * etiqueta **"mochila-pedras"** — que é o nome INTERNO da metáfora do vídeo. Ninguém
     * no mundo escreve isso numa busca, e uma etiqueta que ninguém procura ocupa o lugar
     * de uma que alguém procuraria. É a mesma família do defeito de cima: um nome de
     * dentro da casa a escapar para a montra.
     */
    ...PALAVRAS_DO_CANAL,
  ];
  /**
   * ♦ 06/08/2026 — A ESCOLHA PASSOU A SER A MESMA DO SHORT, e isso paga uma dívida.
   *
   * Estava aqui uma cópia da mesma conta que vive no `upload-short.js` — e o §44 já
   * escrevia que *"quando o longo for aprovado, as duas pontas vão para um sítio só"*.
   * Foi hoje: o teto de 12 etiquetas era o mesmo nos dois, e nos dois deixava **metade
   * dos 500 caracteres do YouTube por usar** (medido: 199).
   *
   * ⚠️ As regras que ESTE ficheiro tinha a mais — nada de frases, nada cortado a meio —
   * foram para lá com ela. Não se perdeu nenhuma: são as duas lições de 05/08.
   */
  return escolherEtiquetas(cruas.map((c) => limpar(c, 0)));
}

/**
 * O que se manda ao YouTube. `privacyStatus: private` + `publishAt` é a combinação que
 * agenda: o vídeo existe, ninguém o vê, e o YouTube torna-o público ao segundo certo.
 * ⚠️ As duas andam juntas — `publishAt` sozinho, num vídeo público, não faz nada.
 */
export function montarMetadados({ titulo, descricao, plano, estreia, etiquetasDoVideo = [] }) {
  return {
    snippet: {
      title: limpar(titulo, 100),
      description: limpar(descricao, 5000),
      tags: palavrasChave(plano, etiquetasDoVideo),
      categoryId: '27', // Educação
      defaultLanguage: 'pt-BR',
      defaultAudioLanguage: 'pt-BR',
    },
    status: {
      privacyStatus: 'private',
      publishAt: estreia.toISOString(),
      selfDeclaredMadeForKids: false,
      license: 'youtube',
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// A CONVERSA COM O YOUTUBE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * ⚠️ COPIADO DO `upload-short.js` DE PROPÓSITO, E A DÍVIDA FICA ESCRITA.
 * Estas três peças (explicar o erro, mandar os bytes, meter uma legenda) são iguais nos
 * dois formatos e deviam viver num sítio só. **O `upload-short.js` está congelado por
 * ordem do dono** — é o ficheiro que publica todos os dias — e o preço de o abrir hoje é
 * maior do que o preço desta cópia. **Quando o longo for aprovado, as duas pontas vão
 * para um sítio só**, exatamente como as travas de número (§34.4 ponto 4).
 */
function explicarErro(estado, corpo) {
  if (estado === 401) return `401 — a chave do Google expirou. Corra ${TOKEN_URL_NOTA} e atualize o segredo do token. ${corpo}`;
  if (estado === 403 && /quota/i.test(corpo)) return `403 — a cota diária do YouTube esgotou (uma subida custa ~1600 das 10.000 unidades do dia). ${corpo}`;
  if (estado === 403) return `403 — acesso negado (permissão do canal ou subida desativada). ${corpo}`;
  return `${estado}: ${corpo}`;
}

async function subirVideo(chave, metadados, caminhoMp4) {
  const tamanho = statSync(caminhoMp4).size;

  const inicio = await fetch(UPLOAD_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${chave}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Type': 'video/mp4',
      'X-Upload-Content-Length': String(tamanho),
    },
    body: JSON.stringify(metadados),
  });
  if (!inicio.ok) {
    const corpo = await inicio.text().catch(() => '');
    throw new Error(`não deu para começar a subida — ${explicarErro(inicio.status, corpo)}`);
  }
  const destino = inicio.headers.get('location');
  if (!destino) throw new Error('a subida começou sem o endereço de continuação.');

  const bytes = readFileSync(caminhoMp4);
  const envio = await fetch(destino, {
    method: 'PUT',
    headers: { 'Content-Type': 'video/mp4', 'Content-Length': String(tamanho) },
    body: bytes,
  });
  const resposta = await envio.text();
  if (!envio.ok) throw new Error(`não deu para enviar o vídeo — ${explicarErro(envio.status, resposta)}`);
  const video = JSON.parse(resposta);
  if (!video.id) throw new Error(`a subida voltou sem identificador: ${resposta.slice(0, 300)}`);
  return video;
}

async function meterLegenda(chave, videoId, caminhoSrt, lingua) {
  const fronteira = `----finmoovi-legenda-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const meta = { snippet: { videoId, language: lingua.language, name: lingua.name, isDraft: false } };
  const srt = readFileSync(caminhoSrt);
  const cabeca = Buffer.from(
    `--${fronteira}\r\n`
    + 'Content-Type: application/json; charset=UTF-8\r\n\r\n'
    + `${JSON.stringify(meta)}\r\n`
    + `--${fronteira}\r\n`
    + 'Content-Type: application/octet-stream\r\n\r\n',
    'utf-8',
  );
  const cauda = Buffer.from(`\r\n--${fronteira}--\r\n`, 'utf-8');
  const corpo = Buffer.concat([cabeca, srt, cauda]);

  const r = await fetch(CAPTIONS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${chave}`,
      'Content-Type': `multipart/related; boundary=${fronteira}`,
      'Content-Length': String(corpo.length),
    },
    body: corpo,
  });
  if (!r.ok) throw new Error(explicarErro(r.status, await r.text().catch(() => '')));
  return true;
}

/**
 * A MINIATURA.
 * ⚠️ Falhar aqui **não pode derrubar nada**: o vídeo já está em cima, e um vídeo agendado
 * sem capa é um clique no Studio; um robô que rebenta depois de publicar é um vídeo no ar
 * que o caderno diz que não existe.
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
  if (!r.ok) throw new Error(explicarErro(r.status, await r.text().catch(() => '')));
  return true;
}

// ─── caderno ─────────────────────────────────────────────────────────────────
function lerCaderno() {
  if (!existsSync(TRACKING)) return {};
  try { return JSON.parse(readFileSync(TRACKING, 'utf-8')) || {}; }
  catch { return {}; }
}
function gravarCaderno(dados) {
  mkdirSync(dirname(TRACKING), { recursive: true });
  writeFileSync(TRACKING, `${JSON.stringify(dados, null, 2)}\n`, 'utf-8');
}

/** Onde está a capa deste vídeo, ou nada. */
export function acharCapa(slug, existe = existsSync) {
  for (const nome of NOMES_DA_CAPA) {
    const p = join(MANUS_DIR, slug, nome);
    if (existe(p)) return p;
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
/**
 * A CONFERÊNCIA DA DATA, SOZINHA — para o robô poder desistir ANTES de trabalhar.
 * Fazer o vídeo custa 36 minutos; descobrir no fim que o dia já está ocupado é deitar
 * fora 36 minutos e uma corrida de IA. Isto responde em milissegundos.
 * Devolve 78 ("nada a fazer") quando o dia está tomado — nunca um erro, porque não é um.
 */
async function conferirEstreiaSozinha() {
  const marcada = valor('publicar-em');
  const estreia = marcada ? new Date(marcada) : proximoDomingo();
  if (Number.isNaN(estreia.getTime())) throw new Error(`"${marcada}" não é uma data que eu saiba ler.`);
  log(`📅 a próxima estreia seria ${emPortugues(estreia)}.`);

  // ⚠️ Com as chaves à mão, pergunta-se ao YOUTUBE em vez de acreditar no caderno.
  // Ver `estreiaOcupadaDeVerdade`: uma reserva de um vídeo que entretanto foi tornado
  // público **não ocupa nada** — e sem isto o canal perdia uma semana por causa de uma
  // linha que já não era verdade.
  let chave = null;
  try { chave = await getAccessToken(); } catch { /* sem chaves, decide o caderno */ }

  /**
   * 🔴 AQUI USA-SE O QUE FOI ESCRITO, NÃO O VALOR POR OMISSÃO — e a diferença é enorme.
   *
   * `SLUG` cai em "sair-do-vermelho" quando ninguém diz nada. Nesta conferência, o robô
   * ainda **não escolheu** o vídeo da semana (ela corre antes disso, de propósito, para
   * desistir cedo). Com o valor por omissão, o programa excluía a reserva do piloto por
   * pensar que era ele próprio a subir — **e o dia parecia sempre livre**.
   * Apanhado a correr o comando exato do robô, não a ler o código.
   */
  const ocupado = await estreiaOcupadaDeVerdade(estreia, {
    caderno: lerCaderno(), slugAtual: valor('slug'), chave, registar: log,
  });
  if (ocupado) {
    log(`⏭️  esse dia já é do vídeo "${ocupado.slug}" — um dia, um vídeo.`);
    log('   Nada a fazer hoje (não é avaria).');
    process.exit(78);
  }
  log('✅ o dia está livre.');
}

async function principal() {
  if (args['conferir-estreia']) { await conferirEstreiaSozinha(); return; }
  log(`\n=== YouTube · vídeo longo "${SLUG}"${ENSAIO ? ' (ENSAIO — nada é enviado)' : ''} ===`);

  // ── o que tem de existir ──
  const caminhoPlano = join(ROTEIRO_DIR, `${SLUG}.json`);
  if (!existsSync(caminhoPlano)) throw new Error(`não há guião montado para "${SLUG}".`);
  const plano = JSON.parse(readFileSync(caminhoPlano, 'utf-8'));

  const caminhoTiming = join(AUDIO_ROOT, SLUG, 'timing.json');
  const timing = existsSync(caminhoTiming) ? JSON.parse(readFileSync(caminhoTiming, 'utf-8')) : null;
  if (!timing) {
    // ⚠️ Sem a voz medida, os capítulos da descrição são ESTIMADOS pelo número de
    // palavras — e um capítulo apontado para o sítio errado é pior do que capítulo
    // nenhum (é o que o próprio `descricao-longo.js` diz). Não se publica assim.
    throw new Error(`não há voz gerada para "${SLUG}" — os capítulos da descrição sairiam apontados para o sítio errado.`);
  }

  const fila = lerFila();
  const naFila = (fila.videos || []).find((v) => v.slug === SLUG);
  const titulo = tituloAprovado(SLUG, fila);
  if (!titulo) {
    throw new Error(
      `não há título aprovado para "${SLUG}" na fila de temas (.github/data/youtube-longos.json).\n`
      + '   Um título mau é a coisa mais cara que este canal pode pôr no ar — por isso isto para em vez de inventar um.',
    );
  }

  const caderno = lerCaderno();
  /**
   * 🔴 A TRAVA ANTI-REPETIÇÃO OLHA PARA O VÍDEO, NÃO PARA A LINHA.
   *
   * A 1ª versão parava assim que encontrasse **uma linha** no caderno com este nome — e o
   * caderno também guarda **RESERVAS**: dias apontados para um vídeo que ainda não subiu.
   * Resultado, apanhado no minuto antes de mandar subir o primeiro vídeo a sério: o robô
   * recusava-se a subir **e dizia que já estava publicado**. Uma mentira e uma paragem,
   * pelo preço de uma.
   *
   * O que prova que um vídeo já foi ao ar é ele ter **identificador do YouTube**. Sem
   * isso, é intenção — e intenção não impede ninguém de trabalhar.
   */
  if (!ENSAIO && caderno[SLUG]?.videoId) {
    const j = caderno[SLUG];
    log(`✅ "${SLUG}" já foi publicado em ${j.uploadedAt} → https://youtu.be/${j.videoId}`);
    log('   Nada a fazer (sem subida repetida).');
    return;
  }
  if (!ENSAIO && caderno[SLUG]) {
    log(`ℹ️  "${SLUG}" tinha uma reserva no caderno (${caderno[SLUG].estado || 'reservado'}) — vai subir agora e a reserva é preenchida.`);
  }

  // ── a descrição, com os capítulos cronometrados sobre a voz REAL ──
  /**
   * ⚠️ **ISTO ESPERA PELA IA** (06/08) — os três blocos de texto da descrição são
   * escritos a partir do guião. Se ela falhar ou vier cortada, entra o texto de reserva
   * e o vídeo sobe à mesma: **nada aqui pode parar uma publicação por causa de texto.**
   */
  const d = await prepararDescricao(plano, timing, { naFila });
  if (d.estimado) throw new Error('a descrição saiu com tempos estimados — não se publica assim.');
  if (d.deReserva) log('⚠️ o texto da descrição é o DE RESERVA — a IA não devolveu resposta inteira.');
  /**
   * 🔴 AS REGRAS DO YOUTUBE PARA O ÍNDICE, CONFERIDAS ANTES DE SUBIR. Partir uma delas
   * (primeiro fora do 00:00, menos de três, ou um capítulo com menos de 10 segundos) faz
   * o YouTube **deitar fora o índice inteiro sem avisar** — e a descrição fica com uma
   * lista de horas que não faz nada. Avisa, não pára: um índice que não aparece é muito
   * menos grave do que uma semana sem vídeo.
   */
  for (const q of d.queixas) log(`⚠️ capítulos: ${q}`);

  // ── a hora de estreia ──
  const marcada = valor('publicar-em');
  const estreia = marcada ? new Date(marcada) : proximoDomingo();
  if (Number.isNaN(estreia.getTime())) throw new Error(`"${marcada}" não é uma data que eu saiba ler.`);
  if (estreia.getTime() <= Date.now()) throw new Error(`a estreia (${estreia.toISOString()}) já passou — o YouTube recusa.`);
  /**
   * ⚠️ **UM DIA, UM VÍDEO** — a mesma regra da conferência rápida, outra vez aqui.
   * Não é desconfiança do passo anterior: é que este ficheiro também se corre à mão, e a
   * regra tem de valer por onde quer que se entre. Ver `estreiaOcupada`.
   */
  /**
   * 🔴 O DIA OCUPADO DEIXOU DE SER UM ERRO — 09/08/2026, ordem do dono: *"nunca parar
   * e não gerar o vídeo"*.
   *
   * A 1ª versão lançava um erro aqui, e em 08/08 isso pintou uma corrida de vermelho
   * com o vídeo **já feito e no disco** — 36 minutos e uma corrida de IA deitados fora
   * por causa de uma data. A regra "um dia, um vídeo" continua de pé e é boa; o que
   * estava errado era o castigo. Um vídeo pronto não se deita fora: **marca-se para o
   * domingo seguinte que estiver livre.**
   *
   * ⚠️ **Uma data escolhida à mão (`--publicar-em`) não anda.** Quem a escreveu sabe o
   * que quer, e mudá-la por baixo seria pior do que parar.
   *
   * ⚠️ **E oito semanas de tecto**, para isto nunca virar um ciclo infinito a marcar
   * vídeos para o ano que vem. Se oito domingos seguidos estiverem tomados, há coisa
   * mais errada do que uma data, e aí sim vale a pena parar e olhar.
   */
  let ocupado = estreiaOcupada(estreia, caderno, SLUG);
  if (ocupado && marcada) {
    throw new Error(
      `${emPortugues(estreia)} já é do vídeo "${ocupado.slug}" — um dia, um vídeo.\n`
      + '   Dois vídeos do canal a estrear no mesmo dia competem um com o outro na lista de quem se inscreveu.\n'
      + '   Como a data foi escrita à mão (--publicar-em), isto para em vez de a mudar por baixo de si.',
    );
  }
  for (let semanas = 0; ocupado && semanas < 8; semanas += 1) {
    log(`📅 ${emPortugues(estreia)} já é do vídeo "${ocupado.slug}" — a passar para o domingo seguinte.`);
    estreia.setUTCDate(estreia.getUTCDate() + 7);
    ocupado = estreiaOcupada(estreia, caderno, SLUG);
  }
  if (ocupado) {
    throw new Error(
      'oito domingos seguidos já têm dono — isto não é uma questão de data.\n'
      + '   Ver o caderno `.github/data/youtube-longos-published.json`.',
    );
  }

  const metadados = montarMetadados({
    titulo, descricao: d.texto, plano, estreia, etiquetasDoVideo: naFila?.palavrasChave || [],
  });

  // ── os ficheiros ──
  const caminhoMp4 = join(MP4_DIR, `${SLUG}.mp4`);
  const capa = acharCapa(SLUG);
  const legendas = LEGENDAS.map((l) => ({ ...l, path: join(AUDIO_ROOT, SLUG, `${SLUG}.${l.code}.srt`) }));

  log(`\n🎬 ${titulo}`);
  log(`📅 estreia: ${emPortugues(estreia)}  (${estreia.toISOString()})`);
  // ⚠️ "de fala", não "de vídeo": esta conta não inclui a assinatura do fim (2,5 s).
  // ⚠️ `marcas` JÁ INCLUI o 00:00 desde 06/08 — o "+1" que estava aqui contava-o duas vezes.
  log(`⏱️  ${d.marcas.length} capítulos (${d.cartoes.length} com placa no ecrã) · ${Math.floor(d.totalSeg / 60)}min${String(Math.round(d.totalSeg % 60)).padStart(2, '0')} de fala`);
  log(`🏷️  ${metadados.snippet.tags.length} palavras-chave`);

  if (ENSAIO) {
    log('\n── O QUE SERIA ENVIADO (ensaio, nada saiu daqui) ──');
    log(JSON.stringify(metadados, null, 2));
    log('\n── Os ficheiros ──');
    log(`vídeo:    ${caminhoMp4} ${existsSync(caminhoMp4) ? '(ok)' : '(FALTA)'}`);
    log(`capa:     ${capa || '(FALTA — o vídeo subiria sem miniatura própria)'}`);
    for (const l of legendas) log(`legenda ${l.code}: ${l.path} ${existsSync(l.path) ? '(ok)' : '(falta)'}`);
    log('\nEnsaio concluído.');
    return;
  }

  if (!existsSync(caminhoMp4)) throw new Error(`o vídeo não está feito: ${caminhoMp4}`);

  // ── a subida ──
  const chave = await getAccessToken();
  log('\n🔑 chave do Google renovada.');
  log(`⬆️  a enviar ${(statSync(caminhoMp4).size / (1024 * 1024)).toFixed(1)} MB (privado, com estreia marcada)…`);
  const video = await subirVideo(chave, metadados, caminhoMp4);
  const endereco = `https://youtu.be/${video.id}`;
  log(`✅ vídeo em cima: ${endereco}`);

  /**
   * ⚠️ CONFERIR O RESULTADO, NUNCA O CÓDIGO DE SAÍDA — é a regra desta casa, e aqui ela
   * vale ouro: se o YouTube tiver ignorado a hora marcada, o vídeo fica privado **para
   * sempre** e ninguém dá por nada até domingo à noite.
   */
  const marcadoNoYouTube = video?.status?.publishAt;
  const privado = video?.status?.privacyStatus;
  if (privado !== 'private' || !marcadoNoYouTube) {
    log(`\n🔴 ATENÇÃO: o YouTube devolveu privacidade "${privado}" e estreia "${marcadoNoYouTube || 'nenhuma'}".`);
    log('   Era esperado "private" com hora marcada. CONFIRA NO STUDIO antes de domingo.');
  } else {
    const bate = Math.abs(new Date(marcadoNoYouTube).getTime() - estreia.getTime()) < 60000;
    log(`📅 confirmado pelo YouTube: estreia em ${marcadoNoYouTube}${bate ? ' ✅' : ' ⚠️ (diferente do que pedimos!)'}`);
  }

  // ── a capa (falhar aqui não derruba nada) ──
  if (capa) {
    try {
      await meterCapa(chave, video.id, capa);
      log('🖼️  miniatura posta.');
    } catch (err) {
      log(`⚠️ a miniatura não entrou (o vídeo já está em cima): ${err.message}`);
    }
  } else {
    log('⚠️ não há miniatura para este vídeo — o YouTube vai escolher um fotograma sozinho.');
  }

  // ── as legendas (uma falhar não derruba as outras) ──
  for (const l of legendas) {
    if (!existsSync(l.path)) { log(`⚠️ legenda ${l.code} não existe — saltada.`); continue; }
    try {
      await meterLegenda(chave, video.id, l.path, l);
      log(`✅ legenda ${l.name}.`);
    } catch (err) {
      log(`⚠️ legenda ${l.code} falhou (o vídeo já está em cima): ${err.message}`);
    }
  }

  // ── o primeiro comentário (IMPL20 §54) ──
  // ⚠️ O vídeo longo estreia AGENDADO e privado até à hora marcada. Um comentário
  // escrito agora fica à espera com ele e aparece na estreia — não há nada a ganhar
  // em adiar, e adiar exigiria um segundo robô só para isso.
  // Fixar continua a ser à mão: a API do YouTube não tem esse comando.
  try {
    const texto = textoDoPrimeiroComentario({ ferramentaUrl: d.link, palavraChave: plano.tema });
    await escreverPrimeiroComentario(chave, video.id, texto);
    log('💬 primeiro comentário escrito — falta fixar à mão no Studio.');
  } catch (err) {
    log(`⚠️ o primeiro comentário falhou (o vídeo já está em cima): ${err.message}`);
  }

  /**
   * ♦ 06/08/2026 — AS PLAYLISTS (IMPL20 §59).
   * ⚠️ O vídeo entra na playlist **ainda privado**, e é de propósito: quando estrear já
   * está na prateleira, em vez de alguém ter de se lembrar no domingo à noite. O YouTube
   * esconde-o da playlist até à hora marcada.
   * ⚠️ E é a prateleira geral que a tela final vai apontar — por isso ela tem de estar
   * cheia antes de o vídeo ir ao ar, não depois.
   */
  try {
    await arrumarNasPlaylists(chave, video.id, `${plano.tema} ${plano.promessa}`, log);
  } catch (err) {
    log(`⚠️ as playlists falharam (o vídeo já está em cima): ${err.message}`);
  }

  // ── o caderno ──
  caderno[SLUG] = {
    videoId: video.id,
    uploadedAt: new Date().toISOString(),
    publishAt: estreia.toISOString(),
    titulo: metadados.snippet.title,
    capitulos: d.marcas.length,
    legendas: legendas.filter((l) => existsSync(l.path)).map((l) => l.code),
  };
  gravarCaderno(caderno);
  log(`📝 caderno próprio atualizado em ${TRACKING}`);

  log(`\n🔒 O vídeo está PRIVADO e estreia ${emPortugues(estreia)}.`);
  log(`   Há um dia inteiro para o ver no Studio antes de ir ao ar: ${endereco}`);
}

/**
 * ⚠️ SÓ CORRE QUANDO É CHAMADO PELO NOME — a mesma guarda do `upload-short.js`, pela
 * mesma razão: sem ela, bastava alguém importar este ficheiro para PUBLICAR UM VÍDEO.
 */
const chamadoPeloNome = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (chamadoPeloNome) {
  principal().catch((err) => {
    console.error(`\n❌ ${err.message}\n`);
    process.exit(1);
  });
}
