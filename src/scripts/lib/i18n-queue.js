/**
 * i18n-queue.js — quem entra na fila de re-adaptação internacional.
 *
 * Nasceu de um defeito REAL, medido em 06/08/2026. O filtro antigo, em
 * scripts/fix-i18n-content-batch.js, era:
 *
 *     .filter((r) => r.severity > 0 && !progressSet.has(r.file))
 *
 * Estar na lista de progresso excluía o ficheiro PARA SEMPRE, mesmo com
 * severidade 3. O robô lia, escrevia, marcava "feito" — e nunca conferia se a
 * adaptação tinha funcionado. Medido nesse dia: 110 ficheiros marcados como
 * feitos que a auditoria ainda dava como defeituosos, e 96 ficheiros criados
 * depois da auditoria que nunca podiam sequer entrar na fila.
 *
 * A regra nova mede o RESULTADO em vez de confiar na marca:
 *   - entra quem ainda tem defeito, enquanto não esgotar as tentativas;
 *   - cada passagem que não resolve conta como tentativa gasta;
 *   - ao fim de `maxTentativas` o ficheiro sai da fila e é reportado em voz
 *     alta como "precisa de humano" — nunca desaparece em silêncio.
 *
 * A troca que isto faz: o filtro antigo nunca repetia trabalho mas perdia
 * ficheiros para sempre; este repete no máximo `maxTentativas` vezes e não
 * perde nenhum. O tecto existe para um ficheiro que a IA não consegue arrumar
 * não queimar um lugar do lote todos os dias, para sempre.
 *
 * Módulo puro: sem fs, sem rede, sem relógio. O `existe` entra por parâmetro
 * para o teste poder correr sem tocar no disco.
 */

/**
 * Lê a lista de progresso em qualquer um dos dois formatos.
 *
 * Formato antigo (até 06/08/2026): `["a.md", "b.md"]` — só nomes, sem contagem.
 * Formato novo: `{ "a.md": { tentativas: 2, ultimaSeveridade: 1 } }`.
 *
 * Um nome vindo do formato antigo vale UMA tentativa gasta, não zero. Zero
 * reabriria a fila com os 149 ficheiros já processados de uma só vez; uma
 * tentativa dá-lhes ainda duas hipóteses, que é o que se quer.
 *
 * @param {unknown} raw - Conteúdo já parseado de fix-i18n-progress.json
 * @returns {Map<string, {tentativas: number, ultimaSeveridade: number|null}>}
 */
export function lerProgresso(raw) {
  const mapa = new Map();

  if (Array.isArray(raw)) {
    for (const file of raw) {
      if (typeof file === 'string' && file) {
        mapa.set(file, { tentativas: 1, ultimaSeveridade: null });
      }
    }
    return mapa;
  }

  if (raw && typeof raw === 'object') {
    for (const [file, valor] of Object.entries(raw)) {
      if (!file) continue;
      const tentativas =
        Number.isInteger(valor?.tentativas) && valor.tentativas >= 0 ? valor.tentativas : 1;
      const ultimaSeveridade = Number.isInteger(valor?.ultimaSeveridade)
        ? valor.ultimaSeveridade
        : null;
      mapa.set(file, { tentativas, ultimaSeveridade });
    }
  }

  return mapa;
}

/**
 * Converte o mapa de progresso para o objeto que vai a JSON.
 * Ordenado por nome para o diff do commit diário ser legível.
 *
 * @param {Map<string, {tentativas: number, ultimaSeveridade: number|null}>} mapa
 * @returns {Record<string, {tentativas: number, ultimaSeveridade: number|null}>}
 */
export function serializarProgresso(mapa) {
  const saida = {};
  for (const file of [...mapa.keys()].sort()) {
    saida[file] = mapa.get(file);
  }
  return saida;
}

/**
 * Regista uma passagem pelo ficheiro, com a severidade medida DEPOIS de escrever.
 *
 * Chamar isto é o que distingue este mecanismo do antigo: o antigo marcava
 * "feito"; este guarda quantas vezes já se tentou e como ficou da última vez.
 *
 * @param {Map<string, {tentativas: number, ultimaSeveridade: number|null}>} mapa
 * @param {string} file - Nome do ficheiro
 * @param {number|null} severidadeDepois - Severidade medida após a escrita, ou null se não foi medida
 * @returns {{tentativas: number, ultimaSeveridade: number|null}} O registo actualizado
 */
export function registarTentativa(mapa, file, severidadeDepois = null) {
  const actual = mapa.get(file) || { tentativas: 0, ultimaSeveridade: null };
  const novo = {
    tentativas: actual.tentativas + 1,
    ultimaSeveridade: Number.isInteger(severidadeDepois) ? severidadeDepois : null,
  };
  mapa.set(file, novo);
  return novo;
}

/**
 * Monta a fila do lote diário.
 *
 * Ordem: primeiro quem tem MENOS tentativas gastas, só depois por severidade.
 * Um ficheiro que já falhou duas vezes tem menos hipóteses de resultar à
 * terceira do que um que nunca foi tentado — dar-lhe o lugar à frente seria
 * gastar o lote nos casos perdidos.
 *
 * @param {object} opcoes
 * @param {Array<{file: string, dir: string, severity: number}>} opcoes.auditoria - audit-content-results.json
 * @param {Map<string, {tentativas: number, ultimaSeveridade: number|null}>} opcoes.progresso
 * @param {number} [opcoes.maxTentativas=3] - Passagens antes de desistir e pedir humano
 * @param {(entrada: object) => boolean} [opcoes.existe] - Se o ficheiro existe em disco
 * @returns {{fila: object[], desistidos: object[], mortos: object[]}}
 */
export function montarFila({ auditoria, progresso, maxTentativas = 3, existe = () => true }) {
  const fila = [];
  const desistidos = [];
  const mortos = [];

  const progressoMapa = progresso instanceof Map ? progresso : new Map();

  for (const entrada of Array.isArray(auditoria) ? auditoria : []) {
    if (!entrada || typeof entrada.file !== 'string' || !entrada.file) continue;

    // Entrada morta: o ficheiro já não existe em disco. Com a auditoria a ser
    // regenerada antes de cada corrida isto passou a ser raro, mas mantém-se a
    // guarda — em 30/07/2026, 10 dos 20 lugares do lote eram queimados nestas
    // entradas TODOS OS DIAS, porque a auditoria estava congelada.
    if (!existe(entrada)) {
      mortos.push(entrada);
      continue;
    }

    if (!(entrada.severity > 0)) continue;

    const registo = progressoMapa.get(entrada.file);
    const tentativas = registo ? registo.tentativas : 0;

    if (tentativas >= maxTentativas) {
      desistidos.push({ ...entrada, tentativas });
      continue;
    }

    fila.push({ ...entrada, tentativas });
  }

  fila.sort(
    (a, b) =>
      a.tentativas - b.tentativas ||
      b.severity - a.severity ||
      a.file.localeCompare(b.file)
  );
  desistidos.sort(
    (a, b) => b.severity - a.severity || a.file.localeCompare(b.file)
  );

  return { fila, desistidos, mortos };
}
