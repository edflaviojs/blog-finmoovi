/**
 * A TRILHA DO CANAL — o SÍTIO ÚNICO que diz qual é a faixa e o que ela obriga.
 *
 * ═══ POR QUE ESTE FICHEIRO EXISTE (02/08/2026) ═══
 * A faixa anterior era um placeholder com licença CC BY, que obriga a creditar o autor
 * na descrição do vídeo. Esse aviso estava escrito — em português, em maiúsculas — no
 * `public/music/CREDITS.md`, desde 21/07. **Nove vídeos foram ao ar sem o crédito**,
 * porque nada no código lia esse aviso. É o mesmo padrão de sempre neste repositório:
 * *o que não é verificado por código não acontece* (IMPLEMENTACAO20 §23.1).
 *
 * A cura não é lembrarmo-nos melhor. É a informação da licença passar a viver AQUI, ao
 * lado de quem monta a descrição — e a descrição passar a lê-la. Trocar de faixa passa
 * a ser mudar este objeto: se a nova exigir crédito, ele aparece sozinho na descrição;
 * se não exigir, desaparece sozinho. Ninguém tem de se lembrar de nada.
 */

/**
 * A FAIXA ATUAL — escolhida pelo OUVIDO do dono, não pelo meu (02/08/2026).
 *
 * A 1ª tentativa foi gerá-la por código (`gerar-trilha.js`), para não haver licença
 * nenhuma. O dono ouviu duas versões e reprovou as duas: *"achei muito triste"* e
 * depois *"está desanimador! A outra tinha tipo uma guitarra dando um peso, um ritmo
 * a mais… tem que ser uma música que se adapta a apps financeiros, estilo comercial
 * de televisão"*. Uma trilha profissional tem produção — guitarra, baixo, bateria
 * tocados — e isso não se sintetiza com senos.
 *
 * ⚠️ E a lição de método: **eu não oiço.** Posso medir tom, andamento e brilho, e
 * medi — foi assim que se descobriu que a 1ª estava em tom MENOR e a metade da
 * velocidade. Mas "soa a comercial de banco" é ouvido, e o ouvido é do dono.
 *
 * Esta exige crédito — e **isso deixou de ser um risco**, porque a linha entra
 * sozinha na descrição (ver `creditoDaMusica`). Foi exatamente essa máquina que se
 * construiu hoje de manhã; sem ela, esta escolha teria repetido o problema dos 9
 * vídeos. Instrumentos: bateria, baixo e guitarra elétrica. 209s, tom maior.
 */
export const TRILHA = {
  ficheiro: 'music/bg.mp3',
  titulo: 'Cool Rock',
  autor: 'Kevin MacLeod (incompetech.com)',
  licenca: 'CC BY 4.0',
  exigeCredito: true,
  linhaDeCredito: 'Música: "Cool Rock" by Kevin MacLeod (incompetech.com) — Licensed under CC BY 4.0',
  desde: '2026-08-02',
};

/**
 * A FAIXA ANTERIOR — fica registada porque **os vídeos que já estão no ar contêm-na**,
 * e continuam a dever-lhe o crédito. Não é história: é a fonte do texto que o script
 * `corrigir-creditos-musica.js` põe na descrição desses nove vídeos.
 */
export const TRILHA_ANTERIOR = {
  ficheiro: 'music/bg.mp3',
  titulo: 'Deliberate Thought',
  autor: 'Kevin MacLeod (incompetech.com)',
  licenca: 'CC BY 4.0',
  exigeCredito: true,
  linhaDeCredito: 'Música: "Deliberate Thought" by Kevin MacLeod (incompetech.com) — Licensed under CC BY 4.0',
  // no ar de 21/07/2026 (commit 26a93b19, 09:52) a 02/08/2026 — apanha os 9 vídeos
  // publicados nesse intervalo, o primeiro dos quais às 21:36 do próprio dia 21.
  ate: '2026-08-02',
};

/**
 * A linha a acrescentar à descrição, ou vazio quando não é devida.
 * É esta função que a descrição chama — nunca o texto à mão.
 */
export function creditoDaMusica(trilha = TRILHA) {
  return trilha && trilha.exigeCredito ? String(trilha.linhaDeCredito || '').trim() : '';
}
