/**
 * OS SILÊNCIOS, POR FORMATO — um sítio só (07/08/2026).
 *
 * ═══ POR QUE EXISTE ═══
 * O Short de 50s tem dois silêncios de propósito, e os dois foram conquistados a
 * pulso: 0,35s no fim da fala de cada cena (`TAIL_PAD`, para a cena respirar) e 0,7s
 * entre cenas (`RESPIRO_SEC`, porque sem ele o dono ouvia *"as falas quase uma em
 * cima da outra"*).
 *
 * ⚠️ **NUM VÍDEO DE 16 SEGUNDOS ESSES MESMOS NÚMEROS SÃO UM DESASTRE.** Quatro cenas
 * dariam 3×0,7 + 4×0,35 = **3,5 segundos de silêncio em 16** — mais de um quinto do
 * vídeo calado. E o pior é o último: os 0,35s finais caem exactamente na emenda do
 * loop, que é o sítio onde o vídeo tem de reiniciar sem se notar.
 *
 * Por isso o silêncio passa a depender do FORMATO, e vive aqui — porque três
 * ficheiros precisam do mesmo número (`tts-short.js` mede o áudio, `srt-short.js`
 * calcula a legenda, e o render desenha). Quando os três tinham a sua própria cópia,
 * o resultado foi a legenda a adiantar-se 0,7s por cena. Uma regra, um sítio.
 *
 * ⚠️ **O 0,10s do loop não é zero, e é de propósito.** Cortar rente come a última
 * consoante da frase — já medido no tratamento de voz deste repositório. 0,10s é o
 * mínimo que deixa a palavra inteira e ainda assim não se ouve como pausa.
 *
 * ⚠️ **MAIOR QUE A TRANSIÇÃO, SEMPRE — E COM FOLGA A SÉRIO.** O trilho mestre corta
 * `TRANSITION_FRAMES` (8 frames = 0,267s) do fim do áudio de cada cena. Se o silêncio
 * da cauda + o respiro forem MENORES que isso, o corte come fala de verdade.
 *
 * A primeira versão pôs o respiro em 0,30s: 0,10 + 0,30 = 0,40s contra 0,267s deixava
 * **4 frames** de folga. A revisão apanhou-o, e com razão — quem decide onde a fala
 * acaba é o Whisper, e o Whisper erra. Um erro de 0,15s comeria a última sílaba, e
 * uma última sílaba cortada num vídeo que reinicia sozinho ouve-se todas as voltas.
 *
 * Com o respiro a 0,40s a folga passa a **7 frames (0,23s)**, quase o dobro.
 * O preço são 0,3s a mais no vídeo inteiro — e paga-se de bom grado.
 *
 * ⚠️ E repare ONDE se pagou: no RESPIRO, que só existe ENTRE cenas. A cauda ficou nos
 * 0,10s, porque é ela — e só ela — que fica na emenda do loop.
 */

/** O formato do vídeo. Só o Short de 16s se identifica; tudo o resto é o de sempre. */
export function formatoDo(script) {
  return script && script.formato === 'loop16' ? 'loop16' : 'short50';
}

/** Silêncio somado ao FIM da fala de cada cena, em segundos. */
export function tailPadSec(script) {
  return formatoDo(script) === 'loop16' ? 0.10 : 0.35;
}

/** Silêncio ENTRE cenas (a última não leva), em segundos. */
export function respiroSec(script) {
  return formatoDo(script) === 'loop16' ? 0.40 : 0.70;
}
