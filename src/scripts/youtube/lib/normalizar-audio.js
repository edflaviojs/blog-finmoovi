/**
 * NORMALIZAR O SOM PARA O PADRÃO DO YOUTUBE (−14 LUFS).
 *
 * ═══ POR QUE EXISTE ═══
 * Em 22/09/2026 o Ed suspeitou de vídeos a sair **sem áudio**. Foram medidos 24
 * MP4 renderizados e 8 faixas baixadas do próprio YouTube: **todos tinham som**.
 * O defeito era outro, e estava em 24 de 24: **−20 LUFS, seis decibéis abaixo
 * dos ≈ −14 LUFS que o YouTube usa como referência.**
 *
 * 🔴 **O YouTube BAIXA quem está acima de −14 e NÃO LEVANTA quem está abaixo.**
 * Por isso o vídeo anterior no feed toca no volume cheio e o nosso toca a meio.
 * No telemóvel, com ruído à volta, os primeiros segundos parecem mudos — foi
 * exactamente essa a queixa.
 *
 * ═══ COMO ═══
 * `loudnorm` do ffmpeg em DUAS PASSAGENS, que é a única forma de acertar o alvo:
 * a 1ª mede o ficheiro inteiro, a 2ª aplica o ganho já sabendo o que medir. Uma
 * passagem só usa um filtro dinâmico que comprime e não garante o alvo.
 *
 * O VÍDEO NÃO É RECODIFICADO (`-c:v copy`). Só a faixa de áudio é refeita: a
 * imagem sai bit a bit igual, e o passo custa segundos em vez de minutos.
 *
 * ⚠️ **NUNCA SUBSTITUI SEM CONFERIR.** Depois de escrever, mede outra vez e só
 * troca o ficheiro se o resultado ficar dentro da janela. Se falhar, **deixa o
 * original intacto e devolve `ok: false`** — um vídeo com som baixo é muito
 * melhor que um vídeo estragado ou que um ficheiro de zero bytes.
 *
 * ⚠️ **E QUEIXA-SE ALTO.** O robô que olha os fotogramas foi feito para nunca se
 * queixar e ficou meses sem olhar um único fotograma sem ninguém dar por isso
 * (`qa-visual.js`, 17/09). Aqui todo caminho de falha imprime uma linha visível.
 */

import { execFileSync, spawnSync } from 'child_process';
import { existsSync, renameSync, unlinkSync, statSync } from 'fs';

/** O alvo do YouTube. */
export const ALVO_LUFS = -14;
export const ALVO_LRA = 11;

/**
 * ⚠️ Pede-se −13 ao `loudnorm` para CHEGAR a −14.
 *
 * Não é engano: a recodificação em AAC que vem a seguir come cerca de 0,5 a
 * 1 dB. Medido nos três formatos — pedindo −14 o resultado assentava em −15,1;
 * pedindo −13, assenta entre −13,4 e −14,3. O alvo é o que **sai**, não o que
 * se pede.
 */
const PEDIDO_LUFS = -13;

/** Janela de aceitação do resultado final. Fora disto, não se troca o ficheiro. */
const MIN_LUFS = -15.5;
const MAX_LUFS = -12.5;

/**
 * O pico verdadeiro tem de ficar NEGATIVO no fim. Acima de zero é distorção.
 *
 * 🔴 **Isto foi medido, não suposto.** A primeira versão subia o volume com
 * ganho linear e mais nada: o Short de 16s ficou bem (−0,93 dBTP), mas o de 50s
 * saltou para **+2,87 dBTP** e o longo para **+2,20** — o material original já
 * tinha o pico encostado a zero (0,04 dBTP no de 50s), logo **não havia como
 * subir 5 dB sem cortar picos**. Sem esta verificação eu teria entregado três
 * formatos, dois deles a distorcer.
 */
const MAX_TP = -0.3;

/**
 * As margens do limitador, tentadas por ordem. Para-se na primeira que dê um
 * resultado dentro da janela E com o pico negativo.
 *
 * Porquê uma escada e não um número: o pico que sobra depende do material, e o
 * AAC ainda acrescenta um excesso por cima. Com margem única, o longo continuava
 * a estourar (+2,95 dBTP) enquanto o de 16s já estava resolvido a −1,5.
 */
const MARGENS_DB = [1.5, 3, 5, 7];

function ffmpeg(args) {
  return execFileSync('ffmpeg', ['-hide_banner', '-nostats', ...args], {
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 32 * 1024 * 1024,
  });
}

/**
 * Corre o ffmpeg e devolve stdout **e** stderr juntos.
 *
 * ⚠️ Tem de ser `spawnSync`, não `execFileSync`: o ffmpeg escreve o relatório do
 * `loudnorm` no **stderr**, e o `execFileSync` só devolve o stdout quando o
 * comando corre bem. Com `execFileSync` a medição dava sempre "sem áudio" em
 * ficheiros que tinham som — o parser nunca via o JSON.
 */
function ffmpegSaida(args) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', ...args], {
    encoding: 'utf-8',
    maxBuffer: 32 * 1024 * 1024,
  });
  return `${r.stdout || ''}${r.stderr || ''}`;
}

/**
 * Mede o ficheiro. Devolve os números do loudnorm ou `null` se não houver áudio.
 * @param {string} caminho
 */
export function medir(caminho) {
  const saida = ffmpegSaida(['-i', caminho, '-af', 'loudnorm=print_format=json', '-f', 'null', '-']);
  const bloco = saida.slice(saida.lastIndexOf('{'), saida.lastIndexOf('}') + 1);
  if (!bloco) return null;
  try {
    const j = JSON.parse(bloco);
    const n = (x) => (x === '-inf' || x === 'inf' ? null : Number(x));
    return {
      i: n(j.input_i),
      tp: n(j.input_tp),
      lra: n(j.input_lra),
      thresh: n(j.input_thresh),
      offset: n(j.target_offset),
    };
  } catch {
    return null;
  }
}

/**
 * Sobe (ou baixa) o som do MP4 para o alvo do YouTube, no sítio.
 *
 * @param {string} caminho MP4 a normalizar — é substituído em caso de sucesso
 * @param {(msg:string)=>void} [log]
 * @returns {{ok:boolean, antes:number|null, depois:number|null, motivo?:string}}
 */
export function normalizarAudio(caminho, log = console.log) {
  if (!existsSync(caminho)) {
    log(`🔇 normalização saltada: ${caminho} não existe`);
    return { ok: false, antes: null, depois: null, motivo: 'ficheiro inexistente' };
  }

  const antes = medir(caminho);
  if (!antes || antes.i === null) {
    log('🔇 normalização saltada: o ficheiro não tem faixa de áudio medível');
    return { ok: false, antes: null, depois: null, motivo: 'sem áudio' };
  }
  log(`🔊 som antes: ${antes.i.toFixed(2)} LUFS (pico ${antes.tp?.toFixed(2)} dBTP)`);

  if (antes.i >= MIN_LUFS && antes.i <= MAX_LUFS && (antes.tp ?? 0) <= MAX_TP) {
    log('🔊 já está no alvo — nada a fazer');
    return { ok: true, antes: antes.i, depois: antes.i };
  }

  const temporario = caminho.replace(/\.mp4$/i, '.norm.mp4');
  const base =
    `loudnorm=I=${PEDIDO_LUFS}:TP=-1:LRA=${ALVO_LRA}` +
    `:measured_I=${antes.i}:measured_TP=${antes.tp}:measured_LRA=${antes.lra}` +
    `:measured_thresh=${antes.thresh}:offset=${antes.offset}`;

  let melhor = null;
  for (const margem of MARGENS_DB) {
    const limite = Math.pow(10, -margem / 20).toFixed(4);
    const filtro = `${base},alimiter=limit=${limite}:level=disabled`;

    try {
      // `-c:v copy` — a imagem passa intacta; só o áudio é refeito.
      ffmpeg(['-y', '-i', caminho, '-af', filtro, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', temporario]);
    } catch (e) {
      log(`🔴 o ffmpeg falhou na margem de ${margem} dB: ${String(e.message).slice(0, 160)}`);
      continue;
    }

    if (!existsSync(temporario) || statSync(temporario).size < 1024) {
      log(`🔴 saída vazia na margem de ${margem} dB`);
      continue;
    }

    const d = medir(temporario);
    const dentro = d && d.i !== null && d.i >= MIN_LUFS && d.i <= MAX_LUFS;
    const semEstouro = d && d.tp !== null && d.tp <= MAX_TP;
    log(
      `   margem ${String(margem).padStart(3)} dB → ${d?.i?.toFixed(2) ?? '—'} LUFS, ` +
      `pico ${d?.tp?.toFixed(2) ?? '—'} dBTP  ${dentro && semEstouro ? '✅' : dentro ? '↺ pico ainda alto' : '↺ fora da janela'}`
    );

    if (dentro && semEstouro) { melhor = d; break; }
  }

  if (!melhor) {
    log('🔴 normalização REJEITADA em todas as margens — o vídeo segue com o som ORIGINAL, intacto');
    if (existsSync(temporario)) unlinkSync(temporario);
    return { ok: false, antes: antes.i, depois: null, motivo: 'nenhuma margem serviu' };
  }

  unlinkSync(caminho);
  renameSync(temporario, caminho);
  log(`✅ som depois: ${melhor.i.toFixed(2)} LUFS (pico ${melhor.tp.toFixed(2)} dBTP) — subiu ${(melhor.i - antes.i).toFixed(2)} dB`);
  return { ok: true, antes: antes.i, depois: melhor.i };
}

// Linha de comando: node normalizar-audio.js <ficheiro.mp4>
if (process.argv[1] && process.argv[1].endsWith('normalizar-audio.js')) {
  const alvo = process.argv[2];
  if (!alvo) {
    console.error('uso: node normalizar-audio.js <ficheiro.mp4>');
    process.exit(2);
  }
  const r = normalizarAudio(alvo);
  // Não derruba a produção: um vídeo com som baixo continua a ser um vídeo.
  process.exit(r.ok ? 0 : 0);
}
