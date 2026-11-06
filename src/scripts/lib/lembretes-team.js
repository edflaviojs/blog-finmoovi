/**
 * OS LEMBRETES NO APEXI TEAM, 06/11/2026.
 *
 * Pedido do dono: *«cada lembrete de .github/data/lembretes.json vira uma tarefa do tipo
 * lembrete, e o relatório diário deixa de repetir os que fecharam no Team.»*
 *
 * Usado pelo e-mail das 7h (`digest-diario-conteudo.js`). Fica num ficheiro à parte para
 * as provas o poderem importar sem mandar o e-mail.
 *
 * 🛟 Na dúvida, mostra-se: se o Team não responder, o lembrete continua no e-mail.
 */

import { mandarTarefa, perguntarTarefa, paraChave } from './apexi-team.js';

/** A chave_unica do lembrete no Team: o `id` dele, ou a data e o título. */
export function chaveDoLembrete(l) {
  return `lembrete-${paraChave(l.id || `${l.data}-${l.titulo || ''}`, 100)}`;
}

export function tarefaDoLembrete(l) {
  return {
    chave_unica: chaveDoLembrete(l),
    tipo: 'lembrete',
    projeto: 'FinMoovi',
    titulo: String(l.titulo || 'Lembrete').slice(0, 120),
    descricao: String(l.texto || ''),
    prazo: `${l.data}T09:00:00-03:00`,
  };
}

/**
 * Leva ao Team os lembretes abertos que ainda lá não estão, e devolve as chaves dos que
 * já FECHARAM lá. Uma tarefa que já existe não se manda de novo: só se pergunta.
 */
export async function lembretesNoTeam(lembretes, opcoes = {}) {
  const fechados = new Set();
  const problemas = [];
  const criados = [];
  for (const l of lembretes || []) {
    if (!l || l.feito || typeof l.data !== 'string') continue;
    const chave = chaveDoLembrete(l);
    const estado = await perguntarTarefa(chave, opcoes);
    if (!estado.ok) { problemas.push(`${chave}: ${estado.erro}`); continue; }
    if (estado.fechada) { fechados.add(chave); continue; }
    if (!estado.existe) {
      const r = await mandarTarefa(tarefaDoLembrete(l), opcoes);
      if (r.ok) criados.push(chave);
      else problemas.push(`${chave}: ${r.erro}`);
    }
  }
  return { fechados, problemas, criados };
}
