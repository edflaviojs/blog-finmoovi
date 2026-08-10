/**
 * CLIENTE DA MANUS — o transporte, e só o transporte (04/08/2026).
 *
 * ═══ O QUE ESTA PEÇA FAZ, E O QUE NÃO FAZ ═══
 * Ela cria uma tarefa, espera que ela acabe, e traz os ficheiros que voltaram. **Não sabe
 * nada sobre capas, imagens ou o canal** — os pedidos vivem em `capa-manus.js`. É a mesma
 * separação do `image-router.js`: quem fala com a rede não decide o que pedir.
 *
 * ═══ COMO A MANUS FUNCIONA, MEDIDO CONTRA A API A SÉRIO ═══
 * Não é um gerador de imagem: é um **agente** que recebe um pedido em texto e trabalha em
 * segundo plano. Portanto:
 *   1. `POST /v2/task.create` devolve um `task_id` — e mais nada. A imagem ainda não existe.
 *   2. Pergunta-se `GET /v2/task.detail` de tempos a tempos até o estado deixar de ser
 *      `running`. ⚠️ O estado de fim chama-se **`stopped`**, não "concluído": a mesma
 *      palavra serve para "acabou bem" e para "foi mandada parar".
 *   3. `GET /v2/task.listMessages` traz os `attachments`, cada um com uma `url`.
 *
 * ⚠️ **A CHAVE VAI NO CABEÇALHO `API_KEY`.** A documentação nomeia `x-manus-api-key`;
 * os dois passam (provado contra o servidor), e fica o documentado.
 *
 * ⚠️ **OS CRÉDITOS SÃO CONTADOS, E NÓS CONTAMO-LOS.** A conta grátis renova **300 por
 * dia**. Antes e depois de cada tarefa lemos o saldo e escrevemos quanto custou — porque
 * uma conta que se esgota a meio de uma corrida do robô é um vídeo sem capa, e ninguém
 * daria por isso a ler o registo.
 *
 * ⚠️ **NADA DISTO ENTRA NO ROBÔ DIÁRIO (o do Short).** Entra no do vídeo longo, que corre
 * uma vez por semana: as fotografias desde 09/08 e a capa desde 10/08/2026.
 */

const BASE = 'https://api.manus.ai';

/**
 * ═══ 🔴 DUAS CONTAS DA MANUS, E A SEGUNDA ENTRA QUANDO A PRIMEIRA SECA — 10/08/2026 ═══
 *
 * ═══ POR QUE ISTO EXISTE ═══
 * A Manus é **o único ponto do vídeo longo sem plano B**. Medido no dia em que isto se
 * escreveu: o saldo estava em **−2** e não saía uma única imagem. Se isso calhar numa
 * sexta-feira às 23h, o vídeo da semana sobe **sem capa e sem fotografias**, a corrida
 * acaba a verde, e o dono só descobre abrindo o Studio — que é exactamente como se
 * descobriu o domingo sem vídeo (§64).
 *
 * ═══ ⚠️ A ARMADILHA QUE DECIDE TODO O DESENHO ═══
 * **Uma tarefa PERTENCE à conta que a criou.** Fazer uma imagem são três chamadas —
 * criar, perguntar se já acabou (dezenas de vezes), e ir buscar o ficheiro. Se a chave
 * mudasse a meio, as duas últimas perguntariam por uma tarefa a uma conta que não a tem,
 * e a resposta viria **vazia, sem erro nenhum**: o programa diria "voltou sem imagem" e
 * seguia. **Por isso a conta é escolhida UMA VEZ, antes de a tarefa começar, e anda
 * agarrada a ela até ao fim.** Ver `pedirAgente`.
 *
 * ═══ A ORDEM, E É DECISÃO DO DONO (10/08) ═══
 * **A conta 1 até secar, e só então a 2.** Assim ele sabe sempre qual foi usada, e a
 * segunda é uma reserva de verdade em vez de ficarem as duas a meio — que era a outra
 * hipótese e deixava nenhuma delas capaz de aguentar um vídeo de quatro imagens sozinha.
 *
 * ⚠️ **COM UMA CHAVE SÓ, NADA MUDA.** A lista fica com um elemento e o comportamento é o
 * de sempre — é a mesma forma do envelope do b-roll: uma opção nova com o comportamento
 * antigo por omissão.
 */
export function contas() {
  return [
    { nome: 'conta 1', variavel: 'MANUS_API_KEY', chave: process.env.MANUS_API_KEY },
    { nome: 'conta 2', variavel: 'MANUS_API_KEY_2', chave: process.env.MANUS_API_KEY_2 },
    // ⚠️ A terceira existe para não ser preciso mexer aqui no dia em que ele criar outra.
    { nome: 'conta 3', variavel: 'MANUS_API_KEY_3', chave: process.env.MANUS_API_KEY_3 },
  ].filter((c) => c.chave);
}

/** As contas, ou um erro que diz o que fazer. Para quem não pode continuar sem elas. */
export function exigirContas() {
  const lista = contas();
  if (!lista.length) {
    throw new Error(
      'não há chave nenhuma da Manus — `MANUS_API_KEY` (e, se quiser a reserva, '
      + '`MANUS_API_KEY_2`) vivem no .env.local, que nunca vai para o GitHub.',
    );
  }
  return lista;
}

async function pedir(caminho, { metodo = 'POST', corpo, chave } = {}) {
  // ⚠️ A chave vem SEMPRE de quem chama. Estava a ser lida do ambiente aqui dentro, e
  //    com duas contas isso significaria que a mesma tarefa podia mudar de dono a meio.
  const k = chave || exigirContas()[0].chave;
  const r = await fetch(`${BASE}${caminho}`, {
    method: metodo,
    headers: {
      'x-manus-api-key': k,
      ...(corpo ? { 'Content-Type': 'application/json' } : {}),
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
    signal: AbortSignal.timeout(120000),
  });
  const txt = await r.text();
  let json;
  try { json = JSON.parse(txt); } catch { throw new Error(`${caminho}: resposta não é JSON (${r.status}) ${txt.slice(0, 200)}`); }
  if (!r.ok || json.ok === false) {
    throw new Error(`${caminho}: ${json?.error?.code || r.status} — ${json?.error?.message || txt.slice(0, 200)}`);
  }
  return json;
}

/**
 * Quantos créditos restam.
 *
 * ⚠️ **O NOME `refresh_credits` ENGANA, E ISSO FOI MEDIDO.** Não é quanto renova por dia
 * — é **quanto ainda resta da renovação de hoje**. Começou em 300 e, depois de cinco
 * imagens, estava em 40. Quem o lesse como "renova 300" acharia que tinha 300 quando
 * tinha 40. Por isso aqui ele chama-se `restaHoje`, e o teto (`max_refresh_credits`)
 * vem à parte.
 *
 * O custo por imagem vive em `CUSTO_POR_IMAGEM`, aqui em baixo.
 */
/**
 * ═══ 🔴 O CUSTO ESTAVA ERRADO, E POR ISSO O ORÇAMENTO NUNCA AVISOU — 10/08/2026 ═══
 *
 * ═══ O QUE ACONTECEU ═══
 * O programa acreditava em **52 créditos por imagem**, medido em 04/08 com uma tarefa só.
 * Em 10/08 o dono mediu quatro imagens numa corrida: **329 créditos, ~82 cada.** Com o 52,
 * a conta `créditos ÷ custo` prometia **6** imagens onde cabiam **4** — e por isso o
 * orçamento acabou a meio da corrida **sem nunca ter avisado**. O aviso existia; o número
 * que ele usava é que estava errado.
 *
 * ⚠️ **E O NÚMERO VIVIA EM QUATRO SÍTIOS**, que é a família de defeito nº 1 desta casa:
 * um `const` em `fotos-longo.js`, um `52` escrito à mão no `--creditos` do `capa-manus.js`,
 * um comentário aqui, e um "~48" solto noutro comentário. Quatro cópias divergem sempre —
 * e divergiram. **Agora é um sítio só, e quem precisar dele importa-o.**
 *
 * ⚠️ **82 é uma MÉDIA de quatro imagens, não uma lei.** Por isso o programa passou a
 * escrever, no fim de cada corrida, quanto custou de VERDADE por imagem (ver
 * `custoPorImagem`). Quando esse número se afastar deste, corrige-se este — com medição,
 * como se corrigiu hoje, e não com palpite.
 *
 * ⚠️ **Não se arredondou para cima "por segurança".** A 90, a conta diria 3 imagens onde
 * cabem 4, e o dono perderia uma imagem por corrida por causa de uma margem inventada. A
 * régua é o que se mediu; quem quiser folga, tira-a do resultado, não da régua.
 */
export const CUSTO_POR_IMAGEM = 82;

/**
 * Quanto custou, de verdade, por imagem — para o número aqui de cima nunca mais envelhecer
 * em silêncio. Devolve `null` quando não dá para saber (nenhuma imagem, ou o saldo subiu
 * por causa da renovação do dia ter caído no meio da corrida).
 */
/**
 * Quantas imagens cabem no saldo. **Nunca devolve um número negativo.**
 *
 * ⚠️ **O saldo PODE VIR NEGATIVO, e isso foi visto — 10/08/2026: `-2`.** A conta grátis
 * fica a dever quando a última imagem custa mais do que restava, e só volta ao positivo
 * quando a renovação do dia cai. Sem esta guarda, o programa escrevia *"dá para mais -1
 * imagem(ns)"* — que não é uma resposta — e a conta do orçamento ficava com um limite
 * negativo. **Zero é a resposta certa, e diz-se com todas as letras: hoje não dá.**
 */
export function quantasCabem(saldo, quantasQueria = Infinity) {
  const cabem = Math.floor(Number(saldo || 0) / CUSTO_POR_IMAGEM);
  return Math.max(0, Math.min(quantasQueria, cabem));
}

export function custoPorImagem(livresAntes, livresDepois, quantasImagens) {
  const gasto = Number(livresAntes) - Number(livresDepois);
  if (!Number.isFinite(gasto) || gasto <= 0 || !quantasImagens) return null;
  return Math.round(gasto / quantasImagens);
}

export async function creditos(chave) {
  const j = await pedir('/v2/usage.availableCredits', { metodo: 'GET', chave });
  return {
    livres: j.free_credits ?? 0,
    total: j.total_credits ?? 0,
    // ⚠️ Quando a renovação do dia se esgota, o campo **desaparece da resposta** em vez
    // de vir a zero. Sem este `?? 0` aparecia "undefined ainda por gastar hoje" — que é
    // o pior dos dois mundos: não é um número e não é um aviso.
    restaHoje: j.refresh_credits ?? 0,
    porDia: j.max_refresh_credits ?? 0,
    intervalo: j.refresh_interval || 'daily',
  };
}

/**
 * O saldo de TODAS as contas, por ordem.
 *
 * ⚠️ **Uma conta que não responde não mata a leitura das outras** — fica com `erro` e
 * saldo zero. Uma chave estragada não pode impedir a boa de trabalhar; era o oposto do
 * ponto todo de haver duas.
 */
export async function saldos() {
  const lista = exigirContas();
  return Promise.all(lista.map(async (c) => {
    try {
      return { ...c, ...(await creditos(c.chave)), erro: null };
    } catch (err) {
      return { ...c, livres: 0, total: 0, restaHoje: 0, porDia: 0, erro: err.message.split('\n')[0] };
    }
  }));
}

/**
 * 🔴 QUANTAS IMAGENS CABEM AO TODO — e **não é a soma dos créditos a dividir pelo custo**.
 *
 * ⚠️ **OS CRÉDITOS NÃO SE JUNTAM ENTRE CONTAS.** Cada imagem é paga inteira por uma conta
 * só. Com 50 numa e 50 noutra, a soma dá 100 e a conta ingénua diria "cabe 1 imagem" —
 * **mas não cabe nenhuma**, porque nenhuma das duas tem os 82. É a mesma família do
 * defeito do `329 ÷ 52` consertado nesta mesma manhã: uma conta que parece certa e
 * promete o que não existe.
 *
 * A conta certa é: quantas cabem em CADA conta, e depois somam-se.
 */
export function cabemAoTodo(saldosLidos, quantasQueria = Infinity) {
  const soma = saldosLidos.reduce((a, s) => a + quantasCabem(s.total), 0);
  return Math.min(quantasQueria, soma);
}

/**
 * Qual conta faz a próxima imagem: **a primeira da lista que tenha para pagar uma**.
 * Devolve `null` quando nenhuma tem — e aí quem chama avisa, em vez de tentar e falhar.
 */
export function escolherConta(saldosLidos) {
  return saldosLidos.find((s) => !s.erro && quantasCabem(s.total) >= 1) || null;
}

const dorme = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Lança um pedido e espera pelo resultado.
 *
 * ⚠️ `interactive_mode` fica FALSO de propósito: num robô não há ninguém para responder a
 * uma pergunta do agente, e uma tarefa à espera de resposta fica pendurada até ao fim do
 * tempo — a gastar créditos e a não entregar nada.
 *
 * @returns {Promise<{taskId:string, url:string, texto:string, anexos:Array<{filename:string,url:string,content_type:string,type:string}>}>}
 */
export async function pedirAgente(prompt, {
  titulo, perfil = 'manus-1.6', esperaMaxMs = 15 * 60 * 1000, aoAndar, conta = null,
} = {}) {
  /**
   * ═══ 🔴 A CONTA ESCOLHE-SE AQUI, UMA VEZ, E NÃO MUDA MAIS ═══
   *
   * ⚠️ **É a linha que impede o defeito silencioso descrito no cabeçalho:** a tarefa
   * pertence a quem a criou, e perguntar por ela a outra conta devolve vazio SEM ERRO.
   * Por isso `daTarefa` é decidida antes do `task.create` e vai em TODAS as chamadas
   * seguintes — o `task.detail` e o `task.listMessages` lá em baixo incluídos.
   *
   * ⚠️ **Quem chama pode mandar a conta** (`conta`), e é o que os programas fazem: eles
   * já leram os saldos para escrever o orçamento no ecrã, e assim não se lê duas vezes.
   * Sem ela, escolhe-se aqui — a primeira que tenha para pagar uma imagem.
   */
  let daTarefa = conta;
  if (!daTarefa) {
    const lidos = await saldos();
    daTarefa = escolherConta(lidos);
    if (!daTarefa) {
      const resumo = lidos.map((s) => `${s.nome}: ${s.erro ? `erro (${s.erro})` : `${s.total}`}`).join(' · ');
      throw new Error(`nenhuma conta da Manus tem créditos para uma imagem (${CUSTO_POR_IMAGEM} cada) — ${resumo}`);
    }
  }
  if (aoAndar && contas().length > 1) aoAndar(`💳 esta imagem vai pela ${daTarefa.nome}`);
  const chave = daTarefa.chave;

  const criada = await pedir('/v2/task.create', {
    chave,
    corpo: {
      message: { content: prompt },
      locale: 'pt-BR',
      interactive_mode: false,
      hide_in_task_list: false,
      agent_profile: perfil,
      ...(titulo ? { title: titulo } : {}),
    },
  });
  const taskId = criada.task_id;
  if (aoAndar) aoAndar(`tarefa criada: ${criada.task_url || taskId}`);

  const limite = Date.now() + esperaMaxMs;
  let espera = 5000;
  let ultimoEstado = '';
  for (;;) {
    if (Date.now() > limite) throw new Error(`a tarefa passou dos ${Math.round(esperaMaxMs / 60000)} minutos sem acabar (${taskId})`);
    await dorme(espera);
    espera = Math.min(15000, Math.round(espera * 1.3));

    // ⚠️ `chave` — a MESMA que criou a tarefa. Ver o cabeçalho: com outra, isto devolve
    //    vazio e o programa conclui que a tarefa não acabou, para sempre.
    const det = await pedir(`/v2/task.detail?task_id=${encodeURIComponent(taskId)}`, { metodo: 'GET', chave }).catch(() => null);
    const estado = String(det?.task?.status || '');
    if (estado && estado !== ultimoEstado) {
      ultimoEstado = estado;
      if (aoAndar) aoAndar(`estado: ${estado}`);
    }
    // ⚠️ `waiting` também conta como fim de espera: sem ninguém para responder, ficar à
    // espera é ficar pendurado até ao limite de tempo. Aqui damos o que houver e dizemos.
    if (!['stopped', 'error', 'waiting'].includes(estado)) continue;

    // ⚠️ `chave` outra vez a mesma — é aqui que a imagem vem, e é aqui que uma troca de
    //    conta a meio faria o programa dizer "voltou sem imagem" com a imagem feita e paga.
    const msgs = await pedir(`/v2/task.listMessages?task_id=${encodeURIComponent(taskId)}&order=asc&limit=100`, { metodo: 'GET', chave });
    const eventos = msgs.messages || [];
    const anexos = [];
    let texto = '';
    for (const e of eventos) {
      const a = e.assistant_message;
      if (!a) continue;
      if (a.content) texto = a.content;
      for (const at of a.attachments || []) anexos.push(at);
    }
    if (estado === 'error') throw new Error(`a tarefa falhou (${taskId}): ${texto.slice(0, 200)}`);
    if (estado === 'waiting') {
      if (aoAndar) aoAndar('⚠️ o agente ficou à espera de resposta — devolvo o que já há');
    }
    // ⚠️ Devolve-se a conta usada para quem quiser escrever no registo qual foi.
    return { taskId, url: criada.task_url, estado, texto, anexos, conta: daTarefa.nome };
  }
}

/** Descarrega um anexo para um ficheiro. Devolve o número de bytes escritos. */
export async function descarregar(url, destino, fs) {
  const r = await fetch(url, { signal: AbortSignal.timeout(120000) });
  if (!r.ok) throw new Error(`descarga falhou (${r.status})`);
  const buf = Buffer.from(await r.arrayBuffer());
  fs.writeFileSync(destino, buf);
  return buf.length;
}
