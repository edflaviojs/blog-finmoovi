import { AbsoluteFill, Sequence, useVideoConfig } from 'remotion';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import type { TransitionPresentation } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { Background, Watermark, EtiquetaTema, TrilhoProgresso, CartaoResultado, SceneRenderer, SceneAudioLayer, ShockIntro, DynamicIntro, SignatureOutro, computeGlobalShotSfxFires, computeMetaphorStages } from './scenes';
import { BackgroundMusic } from './audio/music';
import roteiroFixture from '../../src/scripts/youtube/output/juros-compostos.script.json';

export const TRANSITION_FRAMES = 8;
// ⚠️ ESTE VALOR ESTÁ DUPLICADO em src/scripts/youtube/srt-short.js:24 (o gerador do
// SRT recalcula os starts globais com a mesma sobreposição). Mudar aqui SEM mudar lá
// dessincroniza a legenda do YouTube — bug já ocorrido e corrigido em 2026-07-22.
// Menos óbvio, e descoberto na Onda 2: este número também define quanto do FIM do
// áudio de cada cena é cortado (ver o `durationInFrames` do trilho mestre, abaixo).
// A 8 frames (0,27s) come silêncio de fim de frase; subir muito começa a comer a
// última sílaba. Só aumentar depois de MEDIR a cauda de silêncio das faixas de voz.

/**
 * RODÍZIO DE TRANSIÇÕES (Onda 2 — IMPLEMENTACAO20 §16.3 item 13).
 * Era `i % 2 === 0 ? fade() : slide('from-right')`: um xadrez de duas transições,
 * sempre na mesma ordem e sempre com a imagem PARADA. Agora são 5 em rodízio, com
 * direções que variam — o corte deixa de ser previsível.
 *
 * ⚠️ Só entram aqui transições de CSS PURO. As bonitas do Remotion (zoom-blur,
 * cross-zoom, crosswarp, linear-blur, dissolve, dreamy-zoom…) dependem TODAS de
 * `html-in-canvas`, que exige Chrome ≥148 COM a flag `chrome://flags/#canvas-draw-element`
 * ligada manualmente. O runner do GitHub Actions não tem essa flag ⇒ o render diário
 * morreria com HTML_IN_CANVAS_UNSUPPORTED. O desfoque de movimento é feito por
 * `filter: blur()` no conteúdo do shot (ver BLUR_FRAMES em scenes.tsx).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- cada apresentação
// tem seu próprio tipo de props (SlideProps ≠ WipeProps); a união não é atribuível
// a `presentation`, que espera UM tipo. É o padrão para misturar transições.
const TRANSICOES: Array<() => TransitionPresentation<any>> = [
  () => slide({ direction: 'from-right' }),
  () => wipe({ direction: 'from-bottom' }),
  () => fade(),
  () => slide({ direction: 'from-bottom' }),
  () => wipe({ direction: 'from-left' }),
];
export const INTRO_FRAMES = 45; // abertura disruptiva legada (~1,5s) antes das cenas
export const INTRO_FRAMES_V3 = 45; // intro dinâmica v3 COMPRIMIDA (45f/1,5s): voz entra no ~seg 1
export const SIGNATURE_FRAMES = 75; // assinatura final da marca (~2,5s) depois da última cena

// ── CONTRACT v3 — "SHOTS" ────────────────────────────────────────────────────
// Telas nativas do app disponíveis para o shot de b-roll `app` (v3.3).
export type AppScreen =
  | 'dashboard' | 'cartoes' | 'fluxo' | 'extrato' | 'balanco' | 'compras' | 'smartcapture' | 'calculadora';

export type ShotVisual = {
  type: 'number' | 'counter' | 'chart' | 'icon' | 'metaphor' | 'statement' | 'formula' | 'list' | 'app';
  text?: string;
  from?: number;
  to?: number;
  prefix?: string;
  icon?: 'money' | 'coins' | 'growth' | 'clock' | 'card' | 'warning' | 'question' | 'mind'
    | 'piggy' | 'bank' | 'target' | 'trophy' | 'bulb' | 'hourglass' | 'wallet' | 'fire' | 'chart-down' | 'shield';
  metaphor?: 'bola-neve' | 'avalanche' | 'escorregao' | 'clique-link'
    | 'foguete' | 'semente' | 'montanha-russa' | 'bolha' | 'ralo';
  // b-roll de app nativo (v3.3): qual tela do FinMoovi renderizar dentro do celular.
  app?: AppScreen;
  note?: string;
};
export type Shot = {
  anchor: string;
  visual: ShotVisual;
  sfx?: 'boom' | 'whoosh' | 'coin' | 'alert' | 'avalanche' | 'slide'
    | 'kaching' | 'typewriter' | 'keyboard' | 'pop'
    | 'click' | 'ding' | 'thud' | 'sparkle';
};

// intro: legada { big, sub } OU v3 { frase, counter? }. Ambas convivem (backward compat).
export type IntroSpec = {
  big?: string;
  sub?: string;
  frase?: string;
  counter?: { from: number; to: number; prefix?: string };
};

// intro v3 = tem `frase`. Só então usamos a DynamicIntro / INTRO_FRAMES_V3.
export const isV3Intro = (intro?: IntroSpec | null): boolean => !!intro && typeof intro.frase === 'string' && intro.frase.length > 0;

// Frames da abertura conforme o tipo de intro (v3 ~4s, legada ~1,5s, nenhuma 0).
// ESPELHADO em `introSecondsFor()` de src/scripts/youtube/srt-short.js (gerador
// do SRT) — qualquer mudança aqui exige a mesma mudança lá, senão a legenda do
// YouTube dessincroniza da voz (bug corrigido em 2026-07-22).
export const introFramesFor = (script: ShortScript): number =>
  !script.intro ? 0 : isV3Intro(script.intro) ? INTRO_FRAMES_V3 : INTRO_FRAMES;

export type ShortScript = {
  slug: string;
  term: string;
  keyword: string;
  nextVideoTitle?: string;
  intro?: IntroSpec;
  scenes: Array<{
    id?: number;
    role: string;
    narration: string;
    onScreenText?: string;
    cue?: string;
    visual?: { type: string; note?: string };
    shots?: Shot[];
    durationSec: number;
  }>;
};

// Timing REAL gerado pelo TTS (tts-short.js): áudio + palavras com start/end da fala.
export type SceneTiming = {
  id: number;
  role?: string;
  narration?: string;
  audioFile: string;
  durationSec: number;
  words: { word: string; start: number; end: number }[];
};

export type ShortTiming = {
  slug: string;
  provider?: string;
  voice?: string;
  scenes: SceneTiming[];
  totalDurationSec: number;
} | null;

// Timing da cena i (casa por id, com fallback por índice).
const sceneTimingFor = (
  timing: ShortTiming,
  scene: ShortScript['scenes'][number],
  i: number,
): SceneTiming | null => {
  if (!timing?.scenes?.length) return null;
  const id = scene.id ?? i + 1;
  return timing.scenes.find((s) => String(s.id) === String(id)) ?? timing.scenes[i] ?? null;
};

// Duração de cada cena (seg): a MEDIDA do TTS (timing) ou a autoral do roteiro.
export const sceneDurationsSec = (script: ShortScript, timing: ShortTiming): number[] =>
  script.scenes.map((s, i) => sceneTimingFor(timing, s, i)?.durationSec || s.durationSec);

export const sceneFramesFrom = (durationsSec: number[], fps: number) =>
  durationsSec.map((d) => Math.max(1, Math.round(d * fps)));

// Total já descontando as sobreposições das transições.
export const totalFramesFrom = (durationsSec: number[], fps: number) => {
  const frames = sceneFramesFrom(durationsSec, fps);
  const transitions = Math.max(0, durationsSec.length - 1) * TRANSITION_FRAMES;
  return frames.reduce((a, b) => a + b, 0) - transitions;
};

// Compat: duração total só pelo roteiro (sem áudio/timing).
export const totalFrames = (script: ShortScript, fps: number) =>
  totalFramesFrom(sceneDurationsSec(script, null), fps);

// Fixture versionado: usado só como fallback quando nenhum script vem por props
// (Studio/preview local). No pipeline, o script real chega via calculateMetadata.
const fixtureScript = roteiroFixture as ShortScript;

export const Short: React.FC<{ script?: ShortScript; timing?: ShortTiming; slug?: string }> = ({ script = fixtureScript, timing = null }) => {
  const { fps } = useVideoConfig();
  const durations = sceneDurationsSec(script, timing);
  const frames = sceneFramesFrom(durations, fps);
  // Comprimento do conteúdo (cenas + transições) — a assinatura entra logo após.
  const contentFrames = totalFramesFrom(durations, fps);

  // ESTÁGIOS DO FIO CONDUTOR (Onda 2): calculado UMA vez para o vídeo inteiro e
  // distribuído por cena — mesma forma como `computeGlobalShotSfxFires` já fazia.
  const metaphorStagesByScene = computeMetaphorStages(script.scenes);

  const children: React.ReactNode[] = [];
  script.scenes.forEach((scene, i) => {
    children.push(
      <TransitionSeries.Sequence key={`s${i}`} durationInFrames={frames[i]}>
        <SceneRenderer scene={scene} timing={sceneTimingFor(timing, scene, i)} metaphorStages={metaphorStagesByScene[i]} />
      </TransitionSeries.Sequence>,
    );
    if (i < script.scenes.length - 1) {
      children.push(
        <TransitionSeries.Transition
          key={`t${i}`}
          presentation={TRANSICOES[i % TRANSICOES.length]()}
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

  // OFFSET ÚNICO DA INTRO (v3.5): TODA a linha do tempo pós-intro deriva deste MESMO
  // valor — v3 dinâmica = INTRO_FRAMES_V3 (45f/1,5s), legada = INTRO_FRAMES (45), sem intro
  // = 0. O `<Sequence from={introFrames}>` abaixo embrulha o VISUAL (TransitionSeries)
  // E o trilho MESTRE (áudio + legenda + ícones + SFX) juntos, então voz e legenda
  // NUNCA divergem da abertura (a legenda não começa antes da voz). Nada de constante
  // fixa 45 no cálculo de offset — o 45 só alimenta o ramo legado de introFramesFor.
  const introFrames = introFramesFor(script);

  // Cooldown GLOBAL de SFX de shot (v3.4): calcula, pro vídeo INTEIRO, quais disparos
  // sobrevivem ao cooldown de 8s entre cenas (evita o mesmo som repetir cedo demais
  // mesmo atravessando cenas). `masterStarts` já é o frame GLOBAL do trilho mestre.
  const shotSfxFiresByScene = computeGlobalShotSfxFires(
    script.scenes,
    script.scenes.map((scene, i) => sceneTimingFor(timing, scene, i)),
    masterStarts,
    frames,
    fps,
  );

  return (
    <AbsoluteFill>
      <Background />
      <BackgroundMusic />
      <Watermark />
      {script.intro && (
        <Sequence durationInFrames={introFrames}>
          {isV3Intro(script.intro) ? (
            <DynamicIntro frase={script.intro.frase || ''} counter={script.intro.counter} frames={introFrames} />
          ) : (
            <ShockIntro big={script.intro.big || ''} sub={script.intro.sub || ''} />
          )}
        </Sequence>
      )}
      <Sequence from={introFrames}>
        {/* Etiqueta do tema: fora do TransitionSeries de propósito — ela NÃO deve
            entrar e sair a cada cena, é o elemento fixo que costura o vídeo todo.
            Começa depois da intro para não competir com a frase de abertura. */}
        <EtiquetaTema tema={script.term} />
        {/* Trilho de progresso: também fora do TransitionSeries — atravessa o vídeo
            inteiro. `masterStarts` já são os frames globais das viradas de cena. */}
        <TrilhoProgresso totalFrames={contentFrames} marcas={masterStarts} />
        <TransitionSeries>{children}</TransitionSeries>
        {/* Cartao DEPOIS do TransitionSeries de proposito: nas cenas de shot `app` a
            moldura do celular desce ate ~y1310 e passava POR CIMA do cartao (visto
            no frame 400 de 31/07). A parte baixa da tela do celular e vazia, entao
            o cartao por cima nao tapa conteudo util. */}
        <CartaoResultado counter={script.intro?.counter} />
        {/* Trilho MESTRE: áudio + legenda + ícones + SFX, sequencial e SEM sobreposição. */}
        {script.scenes.map((scene, i) => (
          <Sequence
            key={`al${i}`}
            from={masterStarts[i]}
            durationInFrames={Math.max(1, frames[i] - (i < script.scenes.length - 1 ? TRANSITION_FRAMES : 0))}
          >
            <SceneAudioLayer scene={scene} timing={sceneTimingFor(timing, scene, i)} shotSfxFires={shotSfxFiresByScene[i]} />
          </Sequence>
        ))}
      </Sequence>
      {/* Assinatura final da marca (~2,5s) — entra após a última cena. A duração da
          composição é estendida em +SIGNATURE_FRAMES no Root (calculateMetadata). */}
      <Sequence from={introFrames + contentFrames} durationInFrames={SIGNATURE_FRAMES}>
        <SignatureOutro />
      </Sequence>
    </AbsoluteFill>
  );
};
