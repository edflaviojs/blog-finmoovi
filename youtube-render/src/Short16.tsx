import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from 'remotion';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import type { TransitionPresentation } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import {
  Background, Watermark, SceneRenderer, SceneAudioLayer,
  computeGlobalShotSfxFires, computeMetaphorStages,
} from './scenes';
import { BackgroundMusic } from './audio/music';
import { TRANSITION_FRAMES } from './Short';
import type { ShortScript, ShortTiming } from './Short';
import { IMPACTO_POR_CENA, IMPACTO_FRAMES, SequenciaDeImpacto, TexturaDoLoop, tremorNoFrame } from './impacto';

/**
 * ═══ O SHORT DE 16 SEGUNDOS EM LOOP (07/08/2026) ═══
 *
 * Ordem do dono: *"o vídeo deve iniciar com o conteúdo direto… acabar do nada, não
 * pedir inscrição, sem enrolação. A intenção é a pessoa entrar num loop, fazer igual
 * àqueles vídeos que reiniciam sem a pessoa perceber."*
 *
 * ⚠️ **É UMA COMPOSIÇÃO NOVA, NÃO UM PARÂMETRO DA ANTIGA.** O `Short.tsx` continua
 * intacto — este ficheiro só IMPORTA de lá e do `scenes.tsx`. Foi decisão consciente:
 * o de 50s publica todos os dias há semanas e é o motor de comentários do canal; um
 * `if` lá dentro poria os dois formatos a partilhar destino.
 *
 * ═══ O QUE ESTE FORMATO NÃO TEM, E PORQUÊ ═══
 *
 * · **Capa/abertura.** Lá, 7,4 segundos de cartaz. Aqui isso seria METADE do vídeo.
 *   Sem `intro` no roteiro, `introSecondsFor()` devolve 0 e a legenda alinha sozinha.
 * · **Assinatura final da marca.** Ordem directa do dono: sem tela final.
 * · **Tela do bordão.** É a assinatura do outro formato.
 * · **Carimbo "APP GRÁTIS".** Compete com o conteúdo nos primeiros segundos, que é
 *   exactamente onde este formato se ganha ou perde.
 * · **🔴 TRILHO DE PROGRESSO — e este é o mais importante da lista.** Uma barrinha a
 *   encher AVISA a pessoa de que o vídeo está a acabar. Num vídeo que quer reiniciar
 *   sem se notar, isso é dizer o truque em voz alta.
 *
 * ═══ O QUE FAZ O CÍRCULO FECHAR ═══
 * 1. A última fala devolve ao princípio (trava no `roteiro-loop.js`).
 * 2. O ÚLTIMO PLANO é o MESMO plano do primeiro — montado por código, não pedido à
 *    IA. O olho não vê o salto porque não há salto.
 * 3. O silêncio da cauda cai de 0,35s para 0,10s (`lib/tempos-do-formato.js`), senão
 *    a emenda do loop tinha um terço de segundo de nada.
 */

/** ⚠️ ESPELHO de `respiroSec()` em `src/scripts/youtube/lib/tempos-do-formato.js`.
 *  Mudar aqui sem mudar lá desalinha a legenda do vídeo — o mesmo modo de falha que
 *  já custou 0,7s por cena no formato de 50s. */
export const RESPIRO_LOOP_SEC = 0.40;

/** As transições são as mesmas do outro formato — só CSS puro corre no runner. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- cada apresentação tem
// o seu próprio tipo de props; a união não é atribuível a `presentation`.
const TRANSICOES_LOOP: Array<() => TransitionPresentation<any>> = [
  () => slide({ direction: 'from-right' }),
  () => wipe({ direction: 'from-bottom' }),
  () => fade(),
];

const sceneTimingFor = (timing: ShortTiming, scene: { id?: number | string }, i: number) => {
  if (!timing || !Array.isArray(timing.scenes)) return null;
  const id = scene.id;
  return timing.scenes.find((s) => String(s.id) === String(id)) ?? timing.scenes[i] ?? null;
};

/** Duração de cada cena: a MEDIDA da voz (ou a autoral), mais o respiro curto. */
export const loopDurationsSec = (script: ShortScript, timing: ShortTiming): number[] =>
  script.scenes.map((s, i) => {
    const falada = sceneTimingFor(timing, s, i)?.durationSec || s.durationSec;
    return i < script.scenes.length - 1 ? falada + RESPIRO_LOOP_SEC : falada;
  });

export const loopFramesFrom = (durationsSec: number[], fps: number) =>
  durationsSec.map((d) => Math.max(1, Math.round(d * fps)));

/** Total já descontando as sobreposições das transições. */
export const loopTotalFrames = (durationsSec: number[], fps: number) => {
  const frames = loopFramesFrom(durationsSec, fps);
  const transicoes = Math.max(0, durationsSec.length - 1) * TRANSITION_FRAMES;
  return frames.reduce((a, b) => a + b, 0) - transicoes;
};

export const Short16: React.FC<{ script?: ShortScript; timing?: ShortTiming; slug?: string }> = ({ script, timing = null }) => {
  const { fps } = useVideoConfig();
  const frameAtual = useCurrentFrame();
  if (!script) return <AbsoluteFill><Background /></AbsoluteFill>;

  const durations = loopDurationsSec(script, timing);
  const frames = loopFramesFrom(durations, fps);

  const metaphorStagesByScene = computeMetaphorStages(script.scenes);

  const children: React.ReactNode[] = [];
  script.scenes.forEach((scene, i) => {
    children.push(
      <TransitionSeries.Sequence key={`s${i}`} durationInFrames={frames[i]}>
        <SceneRenderer
          scene={scene}
          timing={sceneTimingFor(timing, scene, i)}
          metaphorStages={metaphorStagesByScene[i]}
          sceneFrames={frames[i]}
        />
      </TransitionSeries.Sequence>,
    );
    if (i < script.scenes.length - 1) {
      children.push(
        <TransitionSeries.Transition
          key={`t${i}`}
          presentation={TRANSICOES_LOOP[i % TRANSICOES_LOOP.length]()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />,
      );
    }
  });

  // Início de cada cena no timeline global (desconta as sobreposições das transições).
  const masterStarts: number[] = [];
  {
    let prefix = 0;
    for (let i = 0; i < frames.length; i++) {
      masterStarts.push(Math.max(0, prefix - i * TRANSITION_FRAMES));
      prefix += frames[i];
    }
  }

  const shotSfxFiresByScene = computeGlobalShotSfxFires(
    script.scenes,
    script.scenes.map((scene, i) => sceneTimingFor(timing, scene, i)),
    masterStarts,
    frames,
    fps,
  );

  /**
   * ═══ OS SOCOS DE COR (ordem do dono, 07/08/2026) ═══
   * *"está tudo azul, tudo combinando, tudo certinho… tem que acontecer umas 2 a 3
   * vezes muito rápido, pois isso faz o espectador querer voltar pra ver o que é."*
   *
   * ⚠️ **O SOCO ESPERA A TROCA DE CENA ACABAR.** Na primeira versão ele caía 2
   * fotogramas depois do arranque da cena — ou seja, **dentro** da transição. Visto no
   * fotograma 251: a cor parava o olho em cima da tela justamente quando o cartão da
   * cena velha e o da cena nova estavam os DOIS no ar, um por cima do outro, e lia-se
   * "A fatura veio maior" misturado com "achei um errinho". O efeito, feito para
   * prender, estava a mostrar o único momento feio do vídeo.
   * Agora espera `TRANSITION_FRAMES + 4` — a cena já está sozinha na tela.
   *
   * ⚠️ A cena 1 é a excepção e leva os 2 fotogramas: não há transição antes dela, e é
   * de propósito que bate tão cedo. É este soco que volta a bater a cada volta do
   * loop, e é ele que faz a pessoa arrastar o dedo para trás.
   */
  const socos = IMPACTO_POR_CENA
    .map((imp, i) => (imp && i < masterStarts.length
      ? { ...imp, inicio: masterStarts[i] + (i === 0 ? 2 : TRANSITION_FRAMES + 4) }
      : null))
    .filter(Boolean) as Array<{ tipo: 'alerta' | 'virada'; som: string; inicio: number }>;

  /**
   * O TREMOR ACOMPANHA O SOCO — e abana o CONTEÚDO, não o efeito. Se abanasse o
   * clarão, o clarão saía das bordas e via-se o fundo por baixo dele.
   */
  const abana = socos.reduce(
    (acc, s) => {
      const local = frameAtual - s.inicio;
      if (local < 0 || local >= IMPACTO_FRAMES) return acc;
      const t = tremorNoFrame(local);
      return { x: acc.x + t.x, y: acc.y + t.y };
    },
    { x: 0, y: 0 },
  );

  return (
    <AbsoluteFill>
      <Background />
      <BackgroundMusic ficheiro={(script as { music?: { ficheiro?: string } }).music?.ficheiro} />
      <Watermark />
      {/* 🔴 SEM ETIQUETA DO TEMA — e não foi por gosto, foi por MEDIÇÃO.
          Ela nasce com meio segundo de fade-in (`interpolate(frame,[0,10])` em
          scenes.tsx). Comparados os fotogramas 0 e 470 lado a lado, viu-se: no fim ela
          está no ar, no princípio ainda não — ou seja, PISCA exactamente na emenda do
          loop, que é o único sítio do vídeo onde nada pode dar nas vistas.
          E não faz falta: o primeiro cartão do vídeo já diz o tema com letras grandes,
          que é o que quem vê sem som precisa. Menos uma coisa na faixa que o telemóvel
          tapa, ainda por cima. */}
      {/* ⚠️ A TEXTURA VEM ANTES DAS CENAS no JSX — irmãos posteriores pintam por cima,
          e ela tem de ficar POR TRÁS. É moldura, palavra fantasma e poeira: não diz
          nada, só tira o vídeo do "roxo liso" que o dono viu na primeira prévia. */}
      <TexturaDoLoop palavra={script.keyword || script.term || ''} />
      {/* O tremor abana as CENAS. Fica num invólucro próprio para não abanar o fundo
          (o fundo a abanar mostraria a borda) nem o clarão (que tem de tapar tudo). */}
      <AbsoluteFill style={{ transform: `translate(${abana.x}px, ${abana.y}px)` }}>
        <TransitionSeries>{children}</TransitionSeries>
      </AbsoluteFill>
      {/* Trilho MESTRE: voz + legenda + ícones + sons, sequencial e sem sobreposição. */}
      {script.scenes.map((scene, i) => (
        <Sequence
          key={`al${i}`}
          from={masterStarts[i]}
          durationInFrames={Math.max(1, frames[i] - (i < script.scenes.length - 1 ? TRANSITION_FRAMES : 0))}
        >
          <SceneAudioLayer scene={scene} timing={sceneTimingFor(timing, scene, i)} shotSfxFires={shotSfxFiresByScene[i]} />
        </Sequence>
      ))}
      {/* OS SOCOS, por cima de tudo — inclusive da legenda. São 0,4s cada; nesse tempo
          o alerta É o vídeo. Vêm por último no JSX porque é a ordem que decide quem
          pinta em cima de quem. */}
      {socos.map((s, i) => (
        <SequenciaDeImpacto key={`imp${i}`} from={s.inicio} tipo={s.tipo} som={s.som} glifo={i} />
      ))}
      {/* E acaba aqui. Sem assinatura, sem bordão, sem "se inscreve" — quem decide a
          duração é o `loopTotalFrames` no Root, e o YouTube reinicia-o sozinho. */}
    </AbsoluteFill>
  );
};
