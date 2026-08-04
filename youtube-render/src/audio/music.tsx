import { Audio, Sequence, staticFile, useVideoConfig, interpolate } from 'remotion';

// ─────────────────────────────────────────────────────────────────────────────
// Trilha de fundo em LOOP com "ducking" (leito de volume baixo, sob a narração)
// + fade in/out. Como a narração cobre quase todo o vídeo, um leito baixo constante
// já soa "abaixado" sob a voz — simples e robusto.
//
// A faixa é um PLACEHOLDER (Kevin MacLeod, CC-BY — ver public/music/CREDITS.md).
// Trocar por uma da YouTube Audio Library = só substituir public/music/bg.mp3.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ⚠️ A FAIXA VEM DO ROTEIRO desde 02/08/2026 — são TRÊS a rodar, não uma.
 * Quem escolhe é `escolherTrilha()` (lib/musica.js), a partir da imagem do vídeo, e
 * a escolha fica escrita no ficheiro do roteiro. Aqui só se toca o que lá está.
 * O valor por omissão serve os roteiros antigos, que não têm o campo.
 */
const TRACK_POR_OMISSAO = 'music/bg-rock.mp3';
const BED_VOLUME = 0.12; // baixo p/ não cobrir a voz

/**
 * ═══ A COSTURA DA MÚSICA — e por que ela precisa de existir (04/08/2026) ═══
 *
 * O dono reclamou: *"sempre que entra o card passo 1 a música corta do nada"*. O card
 * era coincidência. A causa foi MEDIDA com o ffprobe e o volumedetect:
 *
 *  · as faixas foram cortadas para SHORTS, que nunca passam de 60s — `bg-rock` e
 *    `bg-serio` têm **75s**, `bg-leve` tem **34s**. Num vídeo de seis minutos a faixa
 *    recomeça CINCO vezes;
 *  · e elas trazem um **desvanecimento gravado no fim**: em `bg-rock`, o último
 *    segundo está a **-33,7 dB** contra os -19,0 dB da faixa inteira (13 dB abaixo do
 *    primeiro segundo); em `bg-serio`, -27,9 dB contra -14,5. A música MORRE e volta
 *    de repente a toda a força;
 *  · pior: com `loop`, o Remotion embrulha o áudio num `<Loop>`, e o `<Loop>` reinicia
 *    a contagem de fotogramas a cada volta. Quer dizer que a função de volume abaixo
 *    recebe o fotograma DA VOLTA, não o do vídeo — portanto o fade de entrada de 0,6s
 *    era refeito a cada recomeço (a música entrava do zero), e o fade de saída no fim
 *    do vídeo nunca chegava a acontecer. Confirmado a ler o código do Remotion 4.0.494
 *    (`audio/html5-audio.js`: `if (loop && durationFetched !== undefined)`).
 *
 * A CURA é `costura="cruzada"`: em vez de uma volta seca, tocam-se passagens
 * sobrepostas — a que acaba desvanece por cima da que começa, e o pedaço já
 * desvanecido de fábrica NÃO chega a ser usado (é isso o `usavelSec`).
 *
 * ⚠️ POR QUE ISTO É OPCIONAL, E POR OMISSÃO FICA COMO ESTAVA.
 * Este ficheiro é usado pelo `Short.tsx`, que o robô publica em público todos os dias
 * ao meio-dia. O Short também tem o defeito — mas só na faixa de 34s, e lá o salto é
 * de ~2 dB (a `bg-leve` quase não tem desvanecimento gravado), portanto é MUITO menos
 * audível. Mudar o vídeo diário é decisão do dono. Enquanto ele não a tomar, quem pede
 * a costura cruzada é só o vídeo longo, e o Short sai exatamente igual ao de ontem.
 */
export type CosturaDaMusica = 'reinicio' | 'cruzada';

/**
 * O COMPRIMENTO REAL DE CADA FAIXA — medido, não estimado (ffprobe, 04/08/2026).
 * `usavelSec` é o ponto até onde a faixa ainda está a toda a força; o que vem depois
 * é o desvanecimento gravado, e é precisamente o que não se quer ouvir a meio de um
 * vídeo. Perfil medido por segundo, com `volumedetect`:
 *   bg-rock  (média -19,0): -3s → -21,4 · -2s → -24,3 · -1s → -33,7
 *   bg-serio (média -14,5): -3s → -15,3 · -2s → -20,3 · -1s → -27,9
 *   bg-leve  (média -20,6): -1s → -22,5  (não tem desvanecimento a sério)
 * ⚠️ Se uma faixa for trocada, MEÇA outra vez. Um `usavelSec` maior do que a verdade
 * põe o silêncio no meio do cruzamento, que é exatamente o defeito que isto cura.
 */
const FAIXAS: Record<string, { usavelSec: number }> = {
  'music/bg-rock.mp3': { usavelSec: 72 },
  'music/bg-serio.mp3': { usavelSec: 72 },
  'music/bg-leve.mp3': { usavelSec: 33.5 },
};

/** O tempo em que as duas passagens tocam juntas. 2s é o que a música precisa para a
 *  troca não se notar, e cabe folgado nos 3s de desvanecimento que estamos a saltar. */
const CRUZAMENTO_SEC = 2;

/**
 * ═══ 🔊 A MÚSICA SOBE QUANDO A NARRAÇÃO PÁRA (04/08/2026) ═══
 *
 * O dono, sobre a passagem de capítulo: *"ainda continua uma interrupção da música que
 * fica parecendo que foi cortada… **o som meio que diminui rapidamente e volta já assim
 * que essa tela inicia**."*
 *
 * 🔴 **NÃO É A MÚSICA QUE CORTA. É A VOZ QUE DESAPARECE.** Foram três tentativas a
 * procurar o defeito na música — as faixas curtas, o desvanecimento gravado, o apito
 * cómico — e todas erraram o alvo, porque o alvo não estava aqui dentro.
 *
 * MEDIDO no vídeo que ele ouviu (perfil de 100 em 100 ms, os três cartões):
 *
 * | | com voz | na janela do cartão | queda |
 * |---|---|---|---|
 * | capítulo 1 | -25,1 dB | -38,2 dB | **13,2 dB** |
 * | capítulo 2 | -25,9 dB | -38,3 dB | **12,4 dB** |
 * | capítulo 3 | -25,1 dB | -37,0 dB | **11,9 dB** |
 *
 * Doze decibéis é o mesmo que baixar o som a um quarto — e acontece em duas décimas de
 * segundo, porque a voz acaba de repente. O ouvido não regista "acabou a narração",
 * regista "cortaram o som".
 *
 * A CURA é a que o cinema usa há cem anos: **o leito da música sobe para preencher o
 * buraco e desce quando a voz volta**, em rampa curta. A janela não é só o cartão — é
 * todo o tempo SEM VOZ (o respiro do fim da cena anterior + os 2,6s do cartão), porque é
 * esse o buraco inteiro. Quem calcula as janelas é o `Long.tsx`, que é o único sítio
 * onde a linha do tempo existe.
 *
 * ⚠️ **SÓ NO RAMO DA COSTURA CRUZADA, e não é preguiça — é a mesma armadilha do §36.1.**
 * O caminho por omissão usa `loop`, e o `<Loop>` do Remotion **reinicia a contagem de
 * fotogramas a cada volta**: lá dentro não se sabe em que segundo do vídeo estamos, logo
 * não há como saber se este instante é ou não um cartão. Aqui, o fotograma é absoluto e
 * a conta é fiável. O Short usa o caminho por omissão, portanto **o vídeo diário sai
 * exatamente igual** — e isso está provado byte a byte.
 */
export type JanelaSemVoz = { de: number; ate: number }; // fotogramas ABSOLUTOS do vídeo

/** O leito sobe de 0,12 para isto enquanto não há voz. +8 dB — corta a queda medida de
 *  ~13 dB para ~5, que é a diferença entre "cortaram o som" e "a música respirou". */
const SWELL_VOLUME = 0.3;
/** A rampa. Curta demais volta a ser um degrau; longa demais e o cartão já passou. */
const SWELL_RAMPA_SEC = 0.25;

export const BackgroundMusic: React.FC<{
  ficheiro?: string;
  costura?: CosturaDaMusica;
  janelasSemVoz?: JanelaSemVoz[];
}> = ({ ficheiro, costura = 'reinicio', janelasSemVoz }) => {
  const { fps, durationInFrames } = useVideoConfig();
  const src = ficheiro || TRACK_POR_OMISSAO;
  const fade = Math.min(Math.round(fps * 0.6), Math.floor(durationInFrames / 2));
  const faixa = FAIXAS[src];

  // ── o caminho de sempre: o do Short, e nada aqui mudou ──────────────────────
  if (costura !== 'cruzada' || !faixa) {
    return (
      <Audio
        src={staticFile(src)}
        loop
        volume={(f) =>
          interpolate(
            f,
            [0, fade, durationInFrames - fade, durationInFrames],
            [0, BED_VOLUME, BED_VOLUME, 0],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
          )
        }
      />
    );
  }

  // ── a costura cruzada ───────────────────────────────────────────────────────
  const usavel = Math.max(2, Math.round(faixa.usavelSec * fps));
  const cruz = Math.max(1, Math.min(Math.round(CRUZAMENTO_SEC * fps), Math.floor(usavel / 2)));
  const passo = usavel - cruz; // de quanto em quanto tempo entra uma passagem nova
  const passagens = Math.max(1, Math.ceil((durationInFrames - cruz) / passo));

  /**
   * O LEITO neste instante: 0,12 quando há voz, 0,30 nas janelas em que ela não existe.
   * Sem janelas, devolve sempre 0,12 — que é o comportamento de sempre.
   */
  const rampa = Math.max(1, Math.round(SWELL_RAMPA_SEC * fps));
  const leito = (absoluto: number) => {
    if (!janelasSemVoz?.length) return BED_VOLUME;
    const j = janelasSemVoz.find((x) => absoluto >= x.de && absoluto <= x.ate);
    if (!j) return BED_VOLUME;
    // ⚠️ A rampa cabe DENTRO da janela: sobe quando a voz cala e já está em baixo quando
    // ela volta. Numa janela curta demais para duas rampas, cada uma fica com metade —
    // senão a subida e a descida cruzavam-se e o leito nunca chegava a subir.
    // ⚠️ E o `-1` não é enfeite: sem ele, uma janela com exatamente o dobro da rampa dá
    // dois pontos IGUAIS no meio, e o `interpolate` do Remotion exige uma escada sempre a
    // subir — rebentaria o render inteiro. Não acontece com as janelas de hoje (o piso
    // são 0,8s), mas esta peça é partilhada e uma armadilha destas espera anos.
    const meia = Math.min(rampa, Math.floor((j.ate - j.de - 1) / 2));
    if (meia < 1) return BED_VOLUME;
    return interpolate(
      absoluto,
      [j.de, j.de + meia, j.ate - meia, j.ate],
      [BED_VOLUME, SWELL_VOLUME, SWELL_VOLUME, BED_VOLUME],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
    );
  };

  /** O fade do princípio e do fim do VÍDEO. Ao contrário do caminho de cima, aqui ele
   *  é calculado sobre o fotograma absoluto — é por isso que agora funciona mesmo.
   *  ⚠️ O fade passou a ser um FATOR (0→1) multiplicado pelo leito. Sem janelas dá
   *  exatamente o mesmo número de antes: interpolar até 0,12 ou interpolar até 1 e
   *  multiplicar por 0,12 é a mesma reta. */
  const envelopeDoVideo = (absoluto: number) =>
    interpolate(
      absoluto,
      [0, fade, durationInFrames - fade, durationInFrames],
      [0, 1, 1, 0],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
    ) * leito(absoluto);

  return (
    <>
      {Array.from({ length: passagens }, (_, i) => {
        const inicio = i * passo;
        return (
          <Sequence key={`musica-${i}`} layout="none" from={inicio} durationInFrames={usavel}>
            <Audio
              src={staticFile(src)}
              trimAfter={usavel}
              volume={(f) => {
                // ⚠️ RAIZ QUADRADA, e não uma reta. Duas rampas lineares somadas dão um
                // BURACO de ~3 dB no meio do cruzamento (a potência de dois sinais soma
                // pelos quadrados, não pelas amplitudes) — e um buraco a meio é
                // exatamente o que estamos aqui a tirar. Com a raiz, a potência total
                // fica constante e a troca não se ouve.
                const sobe = i === 0 ? 1 : Math.sqrt(Math.min(1, f / cruz));
                const desce = Math.sqrt(Math.min(1, Math.max(0, (usavel - f) / cruz)));
                return envelopeDoVideo(inicio + f) * sobe * desce;
              }}
            />
          </Sequence>
        );
      })}
    </>
  );
};
