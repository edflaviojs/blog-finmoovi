/**
 * O TRATAMENTO DA VOZ — o que a rádio faz antes de pôr alguém no ar (04/08/2026).
 *
 * ═══ POR QUE EXISTE ═══
 * O dono: *"não teria nada a ser feito para deixar a voz um pouco mais humanizada palavra
 * por palavra, sem perder a originalidade dela, **sem ficar robótica ao acelerar ou ao
 * diminuir**?"*
 *
 * A resposta tem duas metades, e a primeira é um não:
 *
 * 🔴 **NO RITMO NÃO HÁ NADA A FAZER.** Está medido (§39.1) que o ponto de leitura gratuito
 * do Edge recusa qualquer marca por dentro da frase — quatro variantes de SSML, quatro
 * ligações fechadas. E mexer na velocidade **de frase para frase** foi exatamente o que
 * ele reprovou (§42.3): *"tem momento que ela acelera um pouquinho ou desacelera um pouco
 * e é aí que aparece mais robótico"*.
 *
 * ✅ **FORA DO RITMO HÁ, E NÃO LHE TOCA NEM UM MILÉSIMO.** É o tratamento do som: tirar o
 * ronco grave, dar corpo, aproximar a voz de quem ouve e emparelhar o volume. A voz
 * continua a mesma pessoa, a dizer as mesmas palavras, à mesma velocidade — só deixa de
 * soar fina e distante.
 *
 * ⚠️ **E A PROVA DE QUE O RITMO NÃO MEXE É A DURAÇÃO.** As três amostras que foram ao
 * Desktop dele — sem tratamento, suave e quente — duram **22,440 s** as três, ao
 * milésimo. Nenhuma palavra mudou de sítio. É por isso que os tempos medidos pelo
 * `faster-whisper` continuam válidos depois disto.
 *
 * ═══ A RECEITA QUE ELE ESCOLHEU (a "quente", nº 3) ═══
 * | passo | o que faz |
 * |---|---|
 * | `highpass 70 Hz` | corta o ronco que não é voz |
 * | `+3,5 dB a 160 Hz` | o corpo — é isto que dá peito à voz |
 * | `-3 dB a 500 Hz` | tira o abafado (a "caixa de cartão") |
 * | `+3,5 dB a 2,8 kHz` | a presença — aproxima a voz do ouvinte |
 * | `+3 dB a 10 kHz` | o ar |
 * | compressor 4:1 | emparelha as sílabas fortes com as fracas |
 * | `loudnorm -16 LUFS` | o volume de referência das plataformas |
 *
 * ⚠️ **NÃO SE MEXE NESTES NÚMEROS SEM ELE OUVIR OUTRA VEZ.** Isto é gosto, e gosto tem
 * dono. Foram três amostras lado a lado e ele escolheu esta.
 *
 * ⚠️ **E SÓ ENTRA NO VÍDEO LONGO.** Liga-se pelo `formato` do guião, como a camada de
 * intenção se ligava — nunca por uma opção de linha de comando que o Short possa apanhar
 * por acidente. Levá-lo ao Short diário é decisão do dono.
 */

import { execFileSync } from 'child_process';
import { writeFileSync, readFileSync, mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

/** A cadeia, exatamente como saiu na amostra que o dono aprovou. */
export const RECEITA_QUENTE = [
  'highpass=f=70',
  'equalizer=f=160:t=q:w=1.0:g=3.5',
  'equalizer=f=500:t=q:w=1.2:g=-3',
  'equalizer=f=2800:t=q:w=1.0:g=3.5',
  'equalizer=f=10000:t=q:w=1.0:g=3',
  'acompressor=threshold=-24dB:ratio=4:attack=5:release=120:makeup=3',
  'loudnorm=I=-16:TP=-1.5:LRA=9',
].join(',');

/**
 * Trata o áudio de uma cena. **Nunca lança**: se alguma coisa correr mal devolve o
 * original, porque uma voz sem tratamento é um vídeo pior — uma voz que falta é um vídeo
 * partido.
 *
 * @param {Buffer} audio  o mp3 tal como veio do motor
 * @returns {Buffer}      o mp3 tratado, ou o original se não deu
 */
export function tratarVoz(audio) {
  let pasta;
  try {
    pasta = mkdtempSync(join(tmpdir(), 'fm-voz-'));
    const entrada = join(pasta, 'cru.mp3');
    const saida = join(pasta, 'tratado.mp3');
    writeFileSync(entrada, audio);
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', entrada, '-af', RECEITA_QUENTE,
      // ⚠️ O MESMO FORMATO DE SEMPRE (48 kbps, 24 kHz, mono). Tudo o que vem a seguir —
      // a medição, a colagem, o render — conta com ele.
      '-c:a', 'libmp3lame', '-b:a', '48k', '-ar', '24000', '-ac', '1', saida],
    { stdio: ['ignore', 'ignore', 'ignore'] });
    const tratado = readFileSync(saida);
    return tratado.length > 1000 ? tratado : audio;
  } catch {
    return audio;
  } finally {
    try { if (pasta) rmSync(pasta, { recursive: true, force: true }); } catch { /* pasta temporária fica */ }
  }
}
