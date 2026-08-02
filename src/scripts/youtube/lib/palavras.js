/**
 * A PALAVRA-CHAVE FALADA — e por que vive num ficheiro só dela (02/08/2026).
 *
 * ═══ O DEFEITO QUE ISTO CONSERTA, E ERA GRAVE ═══
 * Esta função nasceu dentro de `coreografia.js` (passagem 2). Em 01/08 às 10:41 a
 * passagem 1 passou a precisar dela e importou-a de lá:
 *     roteiro-narrativa.js  ──importa──▶  coreografia.js
 * Só que `coreografia.js`, quando é executado diretamente (que é como o robô diário o
 * corre), termina com uma espera no fim do ficheiro para ir buscar a passagem 1:
 *     coreografia.js  ──espera por──▶  roteiro-narrativa.js
 * As duas ficam à espera uma da outra. **O ficheiro nunca chega a arrancar** — não dá
 * erro, não escreve nada, fica pendurado e o processo morre em silêncio.
 *
 * ⚠️ **O ROBÔ DIÁRIO CHAMA EXATAMENTE ESSE COMANDO** (`coreografia.js --gravar`, ver
 * `.github/workflows/youtube-short-render.yml`). O defeito entrou às 10:41 de 01/08 —
 * **4h39m DEPOIS de o robô ter sido desligado às 06:02**. Por isso nunca correu, e
 * por isso ninguém deu por nada. Se o robô tivesse sido religado, o canal ficaria
 * sem vídeo nenhum, todos os dias, sem uma única mensagem de erro que se percebesse.
 *
 * ═══ A CORREÇÃO ═══
 * Não se remenda a espera: tira-se a razão do círculo. A função passa a viver AQUI,
 * num sítio que não importa ninguém, e as duas passagens vão buscá-la ao mesmo lado.
 * É a regra de sempre deste repositório: **uma regra, um sítio** — e um sítio que não
 * dependa de ninguém não pode fechar círculo com ninguém.
 */

/** Palavras que não servem de palavra-chave por serem vazias de assunto. */
const VAZIAS = new Set(['que', 'com', 'para', 'por', 'uma', 'umas', 'uns', 'dos', 'das', 'nos', 'nas',
  'pelo', 'pela', 'seu', 'sua', 'voce', 'mes', 'todo', 'toda', 'cada', 'mais', 'menos', 'isso',
  'esse', 'essa', 'aquilo', 'como', 'quando', 'onde', 'quanto', 'custam', 'custa', 'ganha', 'vale', 'pena']);

export const semAcento = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * A PALAVRA-CHAVE TEM DE SER UMA QUE FOI MESMO DITA (erro apanhado em 31/07).
 *
 * O validador exige que `keyword` apareça na narração do gancho. A 1ª versão punha
 * `keyword = t.term` — mas num tema editorial o `term` é a frase inteira
 * ("3 erros de cartão que te custam R$ 500/mês"), que nenhuma narração vai conter.
 * Resultado: reprovou 4 tentativas seguidas com um erro que **o modelo não podia
 * corrigir**, porque a narração vem fechada da passagem 1. Pêndulo garantido.
 *
 * Agora escolhe-se, de entre as palavras do tema, a mais longa que o gancho DIZ.
 * `term` continua a ser o tema inteiro (é ele que dá o título); `keyword` passa a
 * ser a âncora falada.
 */
export function keywordFalada(termo, falaDoGancho) {
  const gancho = semAcento(falaDoGancho);
  const candidatas = String(termo || '')
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length >= 4 && !VAZIAS.has(semAcento(w)))
    .sort((a, b) => b.length - a.length);
  return candidatas.find((w) => gancho.includes(semAcento(w))) || null;
}
