/**
 * O VIGIA DAS REDES — 10/08/2026, IMPLEMENTACAO26 §14.
 *
 * ═══ POR QUE ESTE ROBÔ EXISTE ═══
 * O post do Instagram falhou em **08, 09 e 10/08** e ninguém deu por nada. O motivo era
 * uma opção (`is_trial_reel`) que esta conta não aceita — mas o defeito que interessa
 * não é esse, é o SILÊNCIO:
 *
 *   · o carteiro corre ao meio-dia e só ENTREGA o pedido;
 *   · o servidor aceita com `200` e a corrida do GitHub acaba **verde**;
 *   · quem publica é o Multipost, sete horas depois, às 19h;
 *   · e quando ele falha, a falha fica **só lá dentro**.
 *
 * ⚠️ **NENHUMA PROVA DE MESA PODIA APANHAR ISTO.** Elas medem o que nós mandamos; a
 * pergunta aqui é o que a REDE fez com aquilo. Só há uma maneira de saber: perguntar ao
 * servidor depois da hora. É só isso que este ficheiro faz.
 *
 * ═══ COMO ELE PERGUNTA — o caderno contra o servidor ═══
 * Ele **não** lista uma janela de posts e conta-os: isso diria "houve seis publicações"
 * sem saber se eram as certas. Ele lê o **caderno** (`instagram-agendados.json`), que é
 * onde o carteiro escreve, rede a rede, o identificador de cada post que criou — e vai
 * perguntar ao servidor por CADA UM deles, pelo `id`.
 *
 * 🔑 É essa a diferença: assim compara-se **o que dissemos que agendámos** com **o que
 * aconteceu**. Um post apagado à mão aparece como desaparecido (o caderno passaria a
 * mentir e ninguém saberia); um post que falhou aparece com o motivo em português do
 * servidor; e um dia inteiro sem entrega nenhuma também é alarme, porque o carteiro
 * calado é exactamente o que aconteceu de 08 a 10/08.
 *
 * ⚠️ **ELE NÃO ARRUMA NADA.** Não reagenda, não apaga, não republica. Só faz perguntas e
 * conta o que ouviu — a regra do guarda do canal, pela mesma razão: um robô que arruma
 * sozinho o que não entende faz mais estrago do que conserto.
 *
 * Códigos de saída (o guarda do canal usa os mesmos, de propósito):
 *   0 → está tudo como foi combinado
 *   9 → há alarme (o workflow manda email e fica vermelho)
 *   outro → o próprio vigia rebentou, e um vigia que rebenta não vigia
 *
 * Uso:
 *   node src/scripts/multipost/vigiar.js
 *   node src/scripts/multipost/vigiar.js --horas=48     (olhar mais para trás)
 */

import { readFileSync, existsSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const CADERNO = join(ROOT, '.github', 'data', 'instagram-agendados.json');
const BASE = (process.env.MULTIPOST_URL || 'https://multipost.help4desk.com').replace(/\/+$/, '');
const API = `${BASE}/api/public/v1`;

/**
 * ⚠️ **O ENDEREÇO DO DETALHE NÃO LEVA `v1`** — e isto custou meio dia a quem o descobriu
 * (IMPLEMENTACAO26 §0). `/public/v1/posts/{id}` devolve **404**; o registo inteiro, com o
 * campo `error` lá dentro, está em `/api/public/posts/{id}`. Os dois endereços convivem.
 */
const API_DETALHE = `${BASE}/api/public/posts`;

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v === undefined ? true : v];
  }),
);

const log = (...m) => console.log(...m);

/**
 * 🔑 **A JANELA É DE 26 HORAS, E O NÚMERO NÃO É REDONDO POR ACASO.**
 *
 * O vigia corre às 08h20 universais (05h20 no Brasil) e a última rede do dia publica às
 * 23h47 universais. Vinte e seis horas para trás apanham a **noite inteira de ontem** com
 * folga para o atraso do cron do GitHub (que já chegou a 112 minutos nesta casa) — e
 * apanham-na **uma vez só**. Uma janela de 36h ou 48h repetiria o mesmo alarme dois dias
 * seguidos, e alarme repetido ensina a ignorar alarmes.
 */
const HORAS_PADRAO = 26;

/**
 * 🔑 **QUANTO TEMPO UM POST PODE ESTAR ATRASADO SEM SER ALARME.**
 *
 * `QUEUE` depois da hora **não quer dizer travado — quer dizer a repetir**. Está medido:
 * o vídeo do Bluesky levou **21 minutos** de tentativas (criado às 10h59, erro às 11h20)
 * antes de o servidor desistir. Uma tolerância de 30 ou 40 minutos daria alarme falso num
 * post que ainda ia publicar bem.
 *
 * ⚠️ Sessenta minutos é o dobro do pior caso medido. Se um dia se medir pior, é este
 * número que muda — e muda **aqui**, num sítio só.
 */
const TOLERANCIA_MIN = 60;

// ═══════════════════════════════════════════════════════════════════════════════
// As partes puras — sem rede, para a prova de mesa lhes poder chamar
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * TUDO O QUE O CADERNO DIZ QUE FOI AGENDADO DENTRO DA JANELA, achatado numa lista.
 *
 * ⚠️ **OS STORIES CONTAM.** Eles vivem no mesmo `redes` do caderno (`instagram-story`,
 * `facebook-story`) e são publicações a sério. Deixá-los de fora seria repetir o defeito
 * de 07/08, em que a conta do que faltava olhava só para as redes e um Story falhado
 * nunca mais era tentado.
 *
 * ⚠️ **UM REGISTO ANTIGO (sem `redes`) É IGNORADO.** É de quando só havia Instagram e não
 * guardava identificador de post nenhum: não há o que perguntar ao servidor sobre ele.
 */
export function entradasNaJanela(caderno, desde, ate) {
  const fora = [];
  for (const [slug, registo] of Object.entries(caderno || {})) {
    const redes = registo?.redes;
    if (!redes) continue;
    for (const [rede, r] of Object.entries(redes)) {
      if (!r?.postId) continue;
      const quando = new Date(r.publicaEm || registo.publicaEm || 0);
      if (Number.isNaN(quando.getTime())) continue;
      if (quando < desde || quando > ate) continue;
      fora.push({ slug, rede, postId: r.postId, publicaEm: quando });
    }
  }
  return fora.sort((a, b) => a.publicaEm - b.publicaEm);
}

/**
 * O VEREDITO SOBRE UM POST — a única regra de decisão deste robô, isolada de propósito
 * para poder ser provada sem rede.
 *
 * `estado` é o que o servidor respondeu (`PUBLISHED`, `ERROR`, `QUEUE`, ou `null` quando
 * ele já não conhece o post).
 */
export function classificarPost({ estado, publicaEm, agora, toleranciaMin = TOLERANCIA_MIN }) {
  if (estado === 'PUBLISHED') return { alarme: false, resumo: 'publicado' };

  if (estado === 'ERROR') return { alarme: true, resumo: 'FALHOU' };

  /**
   * 🔴 **O POST DESAPARECEU DO SERVIDOR E O CADERNO CONTINUA A DIZER QUE EXISTE.**
   * Isto já aconteceu (05/08, um agendamento apagado à mão para corrigir a legenda) e o
   * efeito é traiçoeiro: o carteiro recusa para sempre aquele vídeo, porque o caderno
   * jura que ele já saiu. Quem apaga um post no painel tem de tirar a linha do caderno —
   * e é este alarme que lho lembra.
   */
  if (estado === null || estado === undefined) {
    return { alarme: true, resumo: 'DESAPARECEU do servidor (apagado à mão?)' };
  }

  const atrasoMin = Math.round((agora - publicaEm) / 60000);
  if (atrasoMin > toleranciaMin) {
    return { alarme: true, resumo: `PRESO em ${estado} há ${atrasoMin} min` };
  }
  // Ainda dentro da hora, ou a repetir: não é alarme, é paciência.
  return { alarme: false, resumo: atrasoMin > 0 ? `${estado} (a repetir há ${atrasoMin} min)` : `${estado} (ainda não deu a hora)` };
}

/** A frase humana daquele post, quando existe uma. Ver a nota sobre `/notifications`. */
export function motivoLegivel(detalhe) {
  const bruto = detalhe?.error;
  if (!bruto) return '';
  let e = bruto;
  if (typeof bruto === 'string') {
    try { e = JSON.parse(bruto); } catch { return bruto.slice(0, 200); }
  }
  return String(
    e?.cause?.failure?.message || e?.failure?.message || e?.message || JSON.stringify(e),
  ).slice(0, 200);
}

// ═══════════════════════════════════════════════════════════════════════════════
// A conversa com o servidor
// ═══════════════════════════════════════════════════════════════════════════════

function chave() {
  const k = (process.env.MULTIPOST_API_KEY || '').trim();
  if (!k) throw new Error('Falta o secret MULTIPOST_API_KEY.');
  return k;
}

/**
 * O detalhe de um post. Devolve `null` quando o servidor já não o conhece — e é isso que
 * vira o alarme "desapareceu".
 *
 * ⚠️ **UM ERRO DE REDE NÃO É UM POST DESAPARECIDO.** Se a pergunta rebentar, isso é o
 * vigia a falhar, não o post: sobe a exceção e a corrida acaba com código diferente de 9,
 * que é como se diz "não sei" em vez de "está tudo bem".
 */
async function lerPost(k, id) {
  const res = await fetch(`${API_DETALHE}/${encodeURIComponent(id)}`, { headers: { Authorization: k } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`o servidor recusou ler o post ${id} (${res.status})`);
  const j = await res.json();
  const p = Array.isArray(j) ? j[0] : j;
  // Um corpo vazio é a outra forma de ele dizer que não conhece o post.
  return p && p.id ? p : null;
}

/**
 * As notificações, que trazem a frase humana ("This account doesn't support Trial Reels").
 *
 * ⚠️ **NEM SEMPRE EXISTEM** — a falha do vídeo no Bluesky não gerou notificação nenhuma
 * (IMPLEMENTACAO26 §0). Servem para enriquecer o aviso, nunca para o decidir. Por isso
 * uma falha a lê-las não pode derrubar o vigia.
 */
async function lerNotificacoes(k) {
  try {
    const res = await fetch(`${API}/notifications`, { headers: { Authorization: k } });
    if (!res.ok) return [];
    const j = await res.json();
    const lista = Array.isArray(j) ? j : (j.notifications || []);
    return lista.map((n) => ({
      quando: new Date(n.createdAt || 0),
      texto: String(n.content || n.message || '').replace(/<[^>]+>/g, ' ').trim(),
    })).filter((n) => n.texto);
  } catch {
    return [];
  }
}

/** A notificação de erro mais próxima da hora daquele post — para dar a frase do servidor. */
export function notificacaoDoPost(notificacoes, rede, publicaEm, minutos = 90) {
  const nome = String(rede).replace(/-story$/, '').replace(/-page$/, '');
  const perto = (notificacoes || []).filter((n) => {
    if (!/error|erro/i.test(n.texto)) return false;
    if (!new RegExp(nome, 'i').test(n.texto)) return false;
    const dif = Math.abs(n.quando - publicaEm) / 60000;
    return dif <= minutos;
  });
  return perto.length ? perto[0].texto : '';
}

// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  const horas = Number(args.horas) > 0 ? Number(args.horas) : HORAS_PADRAO;
  const agora = new Date();
  const desde = new Date(agora.getTime() - horas * 3600 * 1000);

  log(`\n🔎 O vigia das redes — o que o caderno agendou nas últimas ${horas} h, e o que o servidor fez com isso.`);
  log(`   janela: ${desde.toISOString()}  →  ${agora.toISOString()}\n`);

  if (!existsSync(CADERNO)) throw new Error(`Não encontrei o caderno: ${CADERNO}`);
  const caderno = JSON.parse(readFileSync(CADERNO, 'utf-8'));
  const entradas = entradasNaJanela(caderno, desde, agora);

  const alarmes = [];

  /**
   * 🔴 **O CARTEIRO CALADO É ALARME.** Um dia sem nenhuma entrega parece "nada a fazer" e
   * é indistinguível de "o robô parou". O YouTube tem guarda próprio, mas ele olha o
   * YouTube: se o carteiro das redes morrer, o vídeo continua a subir ao canal, o guarda
   * fica verde, e as sete redes emudecem sem ninguém reparar. É exactamente essa a
   * fresta que este bloco tapa.
   *
   * ⚠️ Não é falso alarme num dia sem vídeo: quando a fila está vazia o carteiro sai em
   * sucesso neutro, mas o dia anterior continua na janela de 26 h — só fica sem nada se
   * ninguém entregar durante mais de um dia inteiro, que é precisamente o que se quer saber.
   */
  if (!entradas.length) {
    const a = `nas últimas ${horas} horas o carteiro não agendou NADA em rede nenhuma — ou a fila secou, ou ele parou de correr.`;
    log(`🔴 ${a}`);
    alarmes.push(a);
    log('\n────────────────────────────────────────────────────────────────');
    log(`RESULTADO: ${alarmes.length} alarme(s).`);
    escreverParaOWorkflow(alarmes);
    return 9;
  }

  const k = chave();
  const notificacoes = await lerNotificacoes(k);

  let publicados = 0;
  for (const e of entradas) {
    const detalhe = await lerPost(k, e.postId);
    const estado = detalhe ? detalhe.state : null;
    const { alarme, resumo } = classificarPost({ estado, publicaEm: e.publicaEm, agora });

    const motivo = alarme
      ? (motivoLegivel(detalhe) || notificacaoDoPost(notificacoes, e.rede, e.publicaEm))
      : '';

    log(`${alarme ? '🔴' : '  '} ${e.rede.padEnd(16)} ${e.publicaEm.toISOString().slice(5, 16).replace('T', ' ')}  ${resumo}${motivo ? `  ·  ${motivo}` : ''}`);
    log(`     (vídeo "${e.slug}", post ${e.postId})`);

    if (!alarme) { publicados += estado === 'PUBLISHED' ? 1 : 0; continue; }
    alarmes.push(
      `${e.rede}: ${resumo}${motivo ? ` — ${motivo}` : ''} (vídeo "${e.slug}", agendado para ${e.publicaEm.toISOString()})`,
    );
  }

  log('\n────────────────────────────────────────────────────────────────');
  log(`${entradas.length} publicação(ões) agendadas · ${publicados} confirmadas no ar · ${alarmes.length} com problema.`);

  escreverParaOWorkflow(alarmes);
  return alarmes.length ? 9 : 0;
}

/**
 * Passa os alarmes ao workflow, que é quem manda o email.
 * ⚠️ Fora do GitHub isto não existe e não pode rebentar — daí a guarda.
 */
function escreverParaOWorkflow(alarmes) {
  const ficheiro = process.env.GITHUB_OUTPUT;
  if (!ficheiro) return;
  appendFileSync(ficheiro, `alarme=${alarmes.length ? 'sim' : 'nao'}\n`);
  appendFileSync(ficheiro, `alarmes<<FIM\n${alarmes.join('\n')}\nFIM\n`);
}

// ⚠️ Só corre quando é CHAMADO. A prova de mesa importa as funções puras daqui e não
// pode disparar uma volta à rede ao fazê-lo.
if (process.argv[1] && process.argv[1].endsWith('vigiar.js')) {
  main()
    .then((codigo) => process.exit(codigo))
    .catch((err) => {
      console.error(`\n❌ o vigia rebentou: ${err.message}`);
      console.error('   (e um vigia que rebenta não vigia — isto sai com código próprio, não com "está tudo bem")');
      process.exit(1);
    });
}
