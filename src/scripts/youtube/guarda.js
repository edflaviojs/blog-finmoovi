/**
 * 👮 O GUARDA DO CANAL — pergunta ao YouTube se está tudo como foi combinado (09/08/2026).
 *
 * ═══ POR QUE EXISTE ═══
 * Em 09/08 o canal não teve vídeo longo ao domingo, por duas razões que ninguém viu:
 * o vídeo piloto **passou a público sozinho** (e a estreia marcada deixou de existir) e
 * a primeira corrida automática do robô **falhou**. Os dois sinais existiam — bastava
 * perguntar ao YouTube — mas viviam dentro do separador "Actions", que ninguém abre
 * todos os dias.
 *
 * ⚠️ **O problema não foi o estado ter mudado. Foi ninguém ter dado por isso.**
 *
 * ═══ A PERGUNTA É DIFERENTE PARA CADA FORMATO, E ISSO É O PONTO ═══
 * Uma regra só para todos os vídeos daria alarmes falsos todos os dias.
 *
 * | formato | como sobe | o que aqui se exige |
 * |---|---|---|
 * ♦ **12/08/2026 — A REGRA DEIXOU DE SER SOBRE O FORMATO.** Os dois Shorts passaram a
 * subir privados três horas antes, com hora marcada, como o longo já fazia. O que decide
 * é **haver ou não uma hora marcada por cumprir**:
 *
 * | estado | como está | o que aqui se exige |
 * |---|---|---|
 * | **qualquer um, com hora marcada por vir** | privado, com `publishAt` | continuar **privado** e à MESMA hora |
 * | **qualquer um, hora já passada** | o YouTube torna-o público | continuar **público** |
 * | **subiu público (sem hora marcada)** | público desde o envio | continuar **público** |
 *
 * E há uma terceira pergunta, que nenhum programa fazia: **saiu o vídeo de ontem?**
 * Foi assim que o canal ficou dois dias sem vídeo em 07/08 sem ninguém reparar.
 *
 * ═══ O QUE ELE SE RECUSA A FAZER ═══
 * **Não republica, não remarca, não muda privacidade nenhuma.** Essas são decisões do
 * dono. Um guarda que arruma sozinho o que não entende faz mais estrago do que conserto.
 * Ele só pergunta, e grita.
 *
 * ⚠️ **Ele também não escreve no repositório e não gasta IA nem créditos de imagem.**
 *
 * Saída: **0** = está tudo bem · **9** = há alarme (o robô lê isto para mandar email).
 *
 * Uso:
 *   node src/scripts/youtube/guarda.js
 *   node src/scripts/youtube/guarda.js --so-longo
 */

import { readFileSync, existsSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
/**
 * ⚠️ IMPORTADO, NUNCA COPIADO — e os dois são seguros de importar: têm a guarda do
 * `chamadoPeloNome`, portanto importá-los não publica nem sobe coisa nenhuma. Copiar a
 * renovação da chave ou a leitura do estado seria garantir que um dia divergiam, que é
 * o modo de falha crónico desta casa.
 */
import { getAccessToken } from './upload-short.js';
import { estadoNoYouTube, emPortugues, longosDoCanal } from './upload-longo.js';

const ROOT = process.cwd();
const CADERNO_LONGOS = join(ROOT, '.github', 'data', 'youtube-longos-published.json');
const CADERNO_SHORTS = join(ROOT, '.github', 'data', 'youtube-published.json');

/**
 * Quantas horas para trás se aceita como "saiu recentemente".
 *
 * ⚠️ **36 e não 24, e a diferença é entre um alarme útil e um alarme que se ignora.**
 * O guarda corre às 08:10 universais (05h10 no Brasil) e as publicações do dia são
 * TODAS depois disso: o de 16s às 11:40 e 21:40, o de 50s às 15:00 e 20:00. Portanto
 * ele está sempre a olhar para o dia ANTERIOR. Com 24 horas, um atraso normal do
 * relógio do GitHub (que aqui já chegou a 112 minutos) dava alarme sem nada estar mal.
 * Com 36, só grita quando um dia inteiro passou em branco.
 */
const JANELA_HORAS = 36;

const args = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => {
    const [k, ...v] = a.slice(2).split('=');
    return [k, v.join('=') || true];
  }),
);

const log = (m) => console.log(m);

function lerJson(caminho) {
  try { return existsSync(caminho) ? JSON.parse(readFileSync(caminho, 'utf-8')) : {}; }
  catch { return {}; }
}

/** Os nomes por que o dono conhece cada formato. */
const NOME_DO_FORMATO = {
  longo: 'o vídeo longo',
  short50: 'o Short de 50s',
  loop16: 'o Short de 16s em loop',
};

/**
 * Tudo o que o canal diz ter publicado, dos dois cadernos, numa lista só.
 *
 * ⚠️ **`formato` em falta é `short50`**, e não é um palpite: o campo só passou a ser
 * escrito em 07/08/2026, e até aí só existia o de 50 segundos. É a mesma regra que o
 * `loadRecentPublishedContext` já usa — escrita nos dois sítios porque é a mesma verdade.
 */
export function tudoOQuePublicamos({
  shorts = lerJson(CADERNO_SHORTS), longos = lerJson(CADERNO_LONGOS),
} = {}) {
  const lista = [];
  for (const [slug, v] of Object.entries(longos)) {
    if (v && v.videoId) lista.push({ slug, formato: 'longo', ...v });
  }
  for (const [slug, v] of Object.entries(shorts)) {
    if (v && v.videoId) lista.push({ slug, formato: v.formato || 'short50', ...v });
  }
  return lista;
}

/**
 * O que o YouTube devia dizer de cada vídeo, e o que diz.
 * Devolve a lista de alarmes — vazia quando está tudo bem.
 */
export function conferirEstados(lista, estados, agora = Date.now()) {
  const alarmes = [];
  for (const v of lista) {
    const e = estados[v.videoId];
    const nome = NOME_DO_FORMATO[v.formato] || v.formato;
    if (!e) {
      alarmes.push(`🔴 ${nome} "${v.slug}" DESAPARECEU do YouTube (${v.videoId}) — foi apagado ou bloqueado?`);
      continue;
    }
    /**
     * O longo antes da hora: privado E à hora combinada. É este o caso que fez o canal
     * ficar sem vídeo — o vídeo estava marcado, deixou de estar, e a estreia combinada
     * nunca ia acontecer.
     */
    /**
     * 🔴 **DEIXOU DE SER SÓ DO LONGO — 12/08/2026.** Esta linha dizia
     * `v.formato === 'longo' && v.publishAt && …`, e estava certa enquanto só o longo
     * estreava com hora marcada. Nesse mesmo dia os dois Shorts passaram a subir
     * **privados três horas antes**, e a condição velha a correr na estrutura nova dava
     * o pior tipo de alarme: um Short à espera da sua hora seria acusado de ter
     * **"saído do ar"**. O guarda corre às 08:10 e o de 16s sobe às 08:40 — bastava o
     * cron do GitHub atrasar meia hora (já atrasou 112 minutos) para o alarme falso sair.
     *
     * ⚠️ **E um alarme falso não é um incómodo: é a trava a ensinar quem a lê a
     * ignorá-la** — a mesma lição da trava do rodízio cego (§68.10).
     *
     * A regra certa nunca foi sobre o formato: **um vídeo com hora marcada no futuro
     * tem de estar privado à espera dela.** Vale para os três formatos.
     */
    const porEstrear = Boolean(v.publishAt) && new Date(v.publishAt).getTime() > agora;
    if (porEstrear) {
      const quando = emPortugues(new Date(v.publishAt));
      if (e.privacidade !== 'private' || !e.estreia) {
        alarmes.push(
          `🔴 ${nome} "${v.slug}" DEIXOU DE ESTAR AGENDADO. Está "${e.privacidade}"`
          + `${e.estreia ? '' : ' e sem estreia marcada'}, mas o combinado era ${quando}. https://youtu.be/${v.videoId}`,
        );
      } else if (Math.abs(new Date(v.publishAt).getTime() - new Date(e.estreia).getTime()) > 60000) {
        alarmes.push(`⚠️ ${nome} "${v.slug}": o caderno diz ${quando}, o YouTube diz ${emPortugues(new Date(e.estreia))}.`);
      } else {
        log(`   ✅ ${nome} "${v.slug}" — privado, a estrear ${quando}`);
      }
      continue;
    }
    // Todo o resto já devia estar no ar.
    if (e.privacidade !== 'public') {
      alarmes.push(`🔴 ${nome} "${v.slug}" saiu do ar — está "${e.privacidade}". https://youtu.be/${v.videoId}`);
    }
  }
  return alarmes;
}

/**
 * 🔴 SAIU O VÍDEO DE ONTEM? — a pergunta que nenhum programa fazia.
 *
 * Em 07/08 o canal esteve **dois dias sem vídeo** e ninguém deu por isso até alguém
 * abrir o Studio. Um robô que falha em silêncio e um robô que nunca correu produzem
 * exactamente o mesmo nada.
 *
 * ⚠️ **Só se cobra o que tem relógio diário.** O vídeo longo é semanal e por isso não
 * entra aqui — quem trata dele é a conferência da estreia, mais acima.
 */
export function conferirORitmo(lista, agora = Date.now(), janelaHoras = JANELA_HORAS) {
  const alarmes = [];
  const limite = agora - janelaHoras * 3600 * 1000;
  for (const formato of ['short50', 'loop16']) {
    const doFormato = lista.filter((v) => v.formato === formato);
    // Um formato que nunca publicou nada não está atrasado — ainda não começou.
    if (!doFormato.length) continue;
    const recente = doFormato.filter((v) => v.uploadedAt && new Date(v.uploadedAt).getTime() >= limite);
    if (recente.length) {
      log(`   ✅ ${NOME_DO_FORMATO[formato]} — ${recente.length} publicado(s) nas últimas ${janelaHoras}h`);
      continue;
    }
    const ultimo = doFormato
      .filter((v) => v.uploadedAt)
      .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))[0];
    const horas = ultimo ? Math.round((agora - new Date(ultimo.uploadedAt).getTime()) / 3600000) : null;
    alarmes.push(
      `🔴 ${NOME_DO_FORMATO[formato]} NÃO SAIU nas últimas ${janelaHoras} horas.`
      + (ultimo ? ` O último foi "${ultimo.slug}", há ${horas} horas.` : ' Não há nenhum no caderno.'),
    );
  }
  return alarmes;
}

/**
 * 🔴 **HÁ VÍDEO LONGO PARA HOJE? — a pergunta que faltava, 25/08/2026.**
 *
 * ═══ POR QUE ISTO NÃO EXISTIA, E QUANTO CUSTOU ═══
 * Estava escrito, três funções acima: *"só se cobra o que tem relógio diário. O vídeo
 * longo é semanal e por isso não entra aqui — quem trata dele é a conferência da
 * estreia."* Era verdade a meias, e a metade que faltava é a que dói: **a conferência da
 * estreia só olha para vídeos que estão no caderno.** Um domingo em que o robô não
 * produziu nada não deixa linha nenhuma no caderno — e um vídeo que nunca existiu não
 * aparece em vigia nenhuma.
 *
 * Medido: os domingos **16/08** (dois vídeos iguais) e **23/08** (nenhum vídeo) passaram
 * os dois sem um único alarme. O dono descobriu os dois abrindo o Studio, dias depois.
 *
 * ⚠️ **A pergunta é feita AO CANAL, nunca ao caderno** — é essa a diferença que faz isto
 * funcionar. E é feita **ao domingo**, que é quando a resposta já é definitiva: a última
 * repescagem da produção fecha no sábado às 18:00 universais, e a estreia é às 22:00 de
 * domingo. O guarda corre às 08:10 — sobram **14 horas** para reagir.
 *
 * ⚠️ **Só ao domingo, e isso é de propósito.** Perguntar isto à terça-feira daria um
 * alarme todos os dias da semana, e um alarme que toca sempre ensina quem o lê a
 * ignorá-lo — a lição que este ficheiro já aprendeu com os Shorts.
 */
export function conferirODomingo(doCanal, agora = new Date()) {
  if (new Date(agora).getUTCDay() !== 0) return [];
  const hoje = new Date(agora).toISOString().slice(0, 10);
  const doDia = (doCanal || []).filter((v) => v.dia === hoje);
  if (doDia.length) {
    log(`   ✅ ${NOME_DO_FORMATO.longo} — ${doDia.length} para hoje: ${doDia.map((v) => `"${v.titulo}"`).join(' · ')}`);
    return [];
  }
  return [
    `🔴 ${NOME_DO_FORMATO.longo} NÃO EXISTE para hoje (${hoje}). O canal não tem nenhum vídeo longo`
    + ' publicado nem agendado para este domingo — a produção de sexta/sábado não entregou.',
  ];
}

async function principal() {
  const lista = tudoOQuePublicamos()
    .filter((v) => !args['so-longo'] || v.formato === 'longo');
  log(`\n=== 👮 O GUARDA DO CANAL — ${lista.length} vídeo(s) no caderno ===\n`);

  let chave;
  try { chave = await getAccessToken(); } catch (err) {
    log(`🔴 sem chaves do YouTube (${err.message}) — o guarda não consegue perguntar nada.`);
    log('   Isto É um alarme: um guarda cego não vigia.');
    process.exit(9);
  }

  /**
   * 🔴 **O CANAL É PERGUNTADO MESMO COM O CADERNO VAZIO — 25/08/2026.**
   * A versão anterior desistia aqui quando o caderno não tinha nada (*"não há nada
   * publicado para vigiar"*). É precisamente o caso a vigiar: **um caderno vazio não
   * prova um canal vazio**, e as três semanas de vídeo longo repetido nasceram de um
   * caderno que não foi gravado. Um guarda que só sabe o que lhe escreveram é um guarda
   * que confirma o erro em vez de o apanhar.
   */
  let doCanal = null;
  try { doCanal = await longosDoCanal(chave); } catch (err) {
    log(`⚠️ não deu para pedir a lista do canal (${err.message}).`);
  }
  /**
   * ⚠️ **DIZER EM TEXTO O QUE O CANAL RESPONDEU, mesmo quando corre bem.**
   * A 1ª versão calava-se em caso de sucesso — e é justamente aí que mora o perigo: uma
   * prateleira vazia não lança erro nenhum, devolve zero vídeos, e zero vídeos quer dizer
   * "todos os domingos estão livres". Sem esta linha, a única maneira de saber que a
   * pergunta ao canal ainda funciona seria esperar por um domingo estragado.
   * É esta linha que prova, todos os dias, que a trava do vídeo longo está viva.
   */
  if (doCanal) {
    log(`\n📺 o CANAL respondeu com ${doCanal.length} vídeo(s) longo(s) recentes:`);
    doCanal.slice(0, 6).forEach((v) => log(`   · ${v.dia} — "${v.titulo}" (${v.privacidade}, ${Math.round(v.duracaoSeg / 60)}min)`));
    if (!doCanal.length) log('   ⚠️ ZERO — se este canal tem vídeos longos, esta resposta não é de confiança.');
  }

  /**
   * ⚠️ ÀS FATIAS DE 50, que é o tecto da API do YouTube por chamada. Com um pedido por
   * vídeo seriam dezenas de chamadas por dia por nada.
   */
  const estados = {};
  const ids = lista.map((v) => v.videoId);
  for (let i = 0; i < ids.length; i += 50) {
    Object.assign(estados, await estadoNoYouTube(ids.slice(i, i + 50), chave));
  }

  const alarmes = [
    ...conferirEstados(lista, estados),
    ...(args['so-longo'] ? [] : conferirORitmo(lista)),
    ...(doCanal ? conferirODomingo(doCanal) : []),
  ];
  /**
   * ⚠️ **NÃO VER, AO DOMINGO, É UM ALARME.** Nos outros dias a lista do canal só serve
   * de reforço e a falha não vale um email; ao domingo ela é a ÚNICA testemunha de que
   * o vídeo da semana existe, e um guarda cego não pode dizer que está tudo bem.
   */
  if (!doCanal && new Date().getUTCDay() === 0) {
    alarmes.push('🔴 ao domingo, e não deu para perguntar ao canal se há vídeo longo hoje — o guarda ficou cego no dia que mais importa.');
  }

  if (!alarmes.length) {
    log('\n✅ está tudo como foi combinado.\n');
    return;
  }
  log(`\n🔴 ${alarmes.length} ALARME(S):\n`);
  alarmes.forEach((a) => log(`   · ${a}`));
  log('');
  // ⚠️ O robô lê isto para montar o email. Uma linha por alarme, sem enfeites.
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `alarmes<<FIM\n${alarmes.join('\n')}\nFIM\n`);
  }
  process.exit(9);
}

/** ⚠️ Só corre quando é chamado pelo nome — importar não pergunta nada ao YouTube. */
const chamadoPeloNome = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (chamadoPeloNome) {
  principal().catch((err) => { console.error(`\n❌ ${err.message}\n`); process.exit(1); });
}
