/**
 * medidor.js — o contador de consumo dos serviços pagos.
 *
 * PARA QUE SERVE: o dono tem vários projetos e não consegue acompanhar quanto
 * cada serviço está a consumir. Até 18/08/2026 não havia NADA: descobria-se
 * pela fatura, ou quando o serviço parava (foi o que aconteceu com a Cerebras).
 *
 * COMO FUNCIONA: cada sítio que chama um serviço pago grava aqui UMA linha no
 * registo da corrida. O robô `relatorio-gastos.js` lê os registos do dia
 * seguinte, soma tudo por serviço, e a conta entra no e-mail das 7h que o dono
 * já recebe. Não é preciso mexer em nenhum dos 60 workflows.
 *
 * PORQUE NO REGISTO E NÃO NUM FICHEIRO: 60 robôs a escrever no mesmo ficheiro
 * dão conflito de git a toda a hora (é a razão nº1 de corridas vermelhas nesta
 * casa). O registo da corrida já existe, já é guardado pelo GitHub, e ninguém
 * disputa nada.
 *
 * ⚠️ ESTE MÓDULO NUNCA PODE DERRUBAR UM ROBÔ. Medir é acessório; publicar é que
 * é o trabalho. Por isso está tudo dentro de try/catch e nada aqui lança.
 */

/** A marca que o leitor procura. Mudar isto obriga a mudar relatorio-gastos.js. */
export const MARCA = '::medidor::';

/**
 * Regista UMA utilização de um serviço externo.
 *
 * @param {object} u
 * @param {string} u.fornecedor  quem cobra: 'cerebras' | 'together' | 'kie.ai' | 'manus' | 'cloudflare' | 'groq' | 'pollinations'
 * @param {string} u.tipo        o que foi consumido: 'texto' | 'imagem' | 'voz' | 'visao' | 'video'
 * @param {string} [u.modelo]    modelo usado, quando existe
 * @param {number} [u.entrada]   fichas/caracteres enviados (texto/visão)
 * @param {number} [u.saida]     fichas/caracteres recebidos
 * @param {number} [u.unidades]  quantidade da coisa (1 imagem, 1 áudio, 1 crédito...)
 * @param {boolean} [u.falhou]   true se a chamada foi recusada (falha costuma NÃO custar,
 *                               mas contar as recusas mostra desperdício e avaria)
 */
export function medir(u) {
  try {
    if (!u || !u.fornecedor) return;
    const linha = {
      f: String(u.fornecedor),
      t: String(u.tipo || '?'),
    };
    if (u.modelo) linha.m = String(u.modelo).slice(0, 60);
    if (Number.isFinite(u.entrada)) linha.ent = Math.max(0, Math.round(u.entrada));
    if (Number.isFinite(u.saida)) linha.sai = Math.max(0, Math.round(u.saida));
    linha.un = Number.isFinite(u.unidades) ? Math.max(0, u.unidades) : 1;
    if (u.falhou) linha.x = 1;
    console.log(`${MARCA}${JSON.stringify(linha)}`);
  } catch {
    // medir nunca derruba quem chama
  }
}

/**
 * Fichas ("tokens") a partir do `usage` que a API devolveu, quando devolve.
 * Formatos conhecidos: OpenAI-compatível (prompt_tokens/completion_tokens) e
 * Anthropic (input_tokens/output_tokens). Devolve null se não vier nada — e aí
 * quem chama usa a estimativa, dizendo que é estimativa.
 */
export function fichasDaResposta(data) {
  try {
    const u = data && data.usage;
    if (!u) return null;
    const ent = u.prompt_tokens ?? u.input_tokens;
    const sai = u.completion_tokens ?? u.output_tokens;
    if (!Number.isFinite(ent) && !Number.isFinite(sai)) return null;
    return { entrada: Number(ent) || 0, saida: Number(sai) || 0 };
  } catch {
    return null;
  }
}
