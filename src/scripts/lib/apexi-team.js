/**
 * A PORTA DOS ROBÔS DO APEXI TEAM, 06/11/2026.
 *
 * Pedido do dono: *«Quero que os robôs do FinMoovi mandem as tarefas para lá, em vez de
 * só por email.»* Manual: GOAPEXI/docs/impl/porta-dos-robos-manual.md (só ler).
 *
 * Duas portas, e só duas:
 *   · mandarTarefa(t)       POST /tarefas. A mesma `chave_unica` ATUALIZA, não duplica,
 *                           e uma tarefa fechada não reabre (regra do lado do Team).
 *   · perguntarTarefa(id)   GET /tarefas/<id>. Diz se existe e se já fechou.
 *
 * 🔒 A chave (APEXI_TEAM_CHAVE) só vai no cabeçalho. Nunca entra numa mensagem de erro,
 * num log, nem no que estas funções devolvem.
 *
 * 🛟 Nenhuma das duas lança erro: devolvem `{ ok:false, erro }`. Quem chama decide, e o
 * email de reserva sai na mesma (regra do manual: resposta que não seja 200 não criou nada).
 */

const BASE = (process.env.APEXI_TEAM_URL || 'https://api.goapexi.com/v1/team/robo').replace(/\/+$/, '');
const CHAVE_UNICA = /^[A-Za-z0-9._:-]{1,120}$/; // a mesma regra da porta

function cabecalhos(chave) {
  return { Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json' };
}

async function lerResposta(res) {
  const texto = await res.text().catch(() => '');
  try { return JSON.parse(texto); } catch { return { bruto: texto.slice(0, 200) }; }
}

/** Manda (ou atualiza) uma tarefa. Devolve { ok, criada, url } ou { ok:false, erro }. */
export async function mandarTarefa(tarefa, { chave = process.env.APEXI_TEAM_CHAVE, fetchFn = fetch } = {}) {
  if (!chave) return { ok: false, erro: 'falta APEXI_TEAM_CHAVE' };
  if (!tarefa || !CHAVE_UNICA.test(String(tarefa.chave_unica || ''))) return { ok: false, erro: `chave_unica inválida: ${tarefa && tarefa.chave_unica}` };
  try {
    const res = await fetchFn(`${BASE}/tarefas`, { method: 'POST', headers: cabecalhos(chave), body: JSON.stringify(tarefa) });
    const corpo = await lerResposta(res);
    if (res.status !== 200) return { ok: false, erro: `Team ${res.status}: ${corpo.erro || corpo.bruto || 'sem detalhe'}` };
    return { ok: true, criada: corpo.criada === true, url: corpo.url || null };
  } catch (e) {
    return { ok: false, erro: `Team sem resposta: ${e.message}` };
  }
}

/** Como está a tarefa. Devolve { ok, existe, fechada } ou { ok:false, erro }. */
export async function perguntarTarefa(chaveUnica, { chave = process.env.APEXI_TEAM_CHAVE, fetchFn = fetch } = {}) {
  if (!chave) return { ok: false, erro: 'falta APEXI_TEAM_CHAVE' };
  if (!CHAVE_UNICA.test(String(chaveUnica || ''))) return { ok: false, erro: `chave_unica inválida: ${chaveUnica}` };
  try {
    const res = await fetchFn(`${BASE}/tarefas/${encodeURIComponent(chaveUnica)}`, { headers: cabecalhos(chave) });
    const corpo = await lerResposta(res);
    if (res.status === 404) return { ok: true, existe: false, fechada: false };
    if (res.status !== 200) return { ok: false, erro: `Team ${res.status}: ${corpo.erro || corpo.bruto || 'sem detalhe'}` };
    return { ok: true, existe: true, fechada: corpo.fechada === true };
  } catch (e) {
    return { ok: false, erro: `Team sem resposta: ${e.message}` };
  }
}

/** Texto curto e sem acentos para pôr numa chave_unica ("TikTok: cobrar" → "tiktok-cobrar"). */
export function paraChave(s, max = 60) {
  return String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, max).replace(/-+$/, '');
}
