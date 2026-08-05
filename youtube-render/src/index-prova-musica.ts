/**
 * A ENTRADA DA PROVA DA MÚSICA (04/08/2026).
 *
 * Vive fora do `Root.tsx` de propósito, pela mesma razão das maquetes de 31/07 (§16.10):
 * o `Root.tsx` é lido pelo render do Short, que corre todos os dias, e uma composição de
 * medição não tem nada que apareça lá.
 *
 * ⚠️ **VOLTE A CORRER ISTO SEMPRE QUE UMA FAIXA DE MÚSICA FOR TROCADA.** O `usavelSec`
 * de cada faixa (em `audio/music.tsx`) é medido à mão; uma faixa nova com outro
 * comprimento ou outro desvanecimento põe o silêncio de volta no meio do vídeo.
 *
 * Uso:
 *   npx remotion render src/index-prova-musica.ts MusicaCruzada  out/musica-cruzada.wav
 *   npx remotion render src/index-prova-musica.ts MusicaReinicio out/musica-reinicio.wav
 * E depois, o perfil segundo a segundo (o buraco aparece como um mínimo isolado):
 *   ffmpeg -i out/musica-cruzada.wav -af "asetnsamples=n=48000,astats=metadata=1:reset=1,
 *     ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-" -f null -
 */
import { registerRoot } from 'remotion';
import { ProvaDeMusica } from './ProvaMusica';

registerRoot(ProvaDeMusica);
