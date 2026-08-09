import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from 'remotion';
/**
 * 🔴 OS SOCOS CHEGAM AO DE 50 SEGUNDOS — 09/08/2026, ordem do dono.
 *
 * Eram o único formato sem eles: o de 16s tinha-os desde 07/08 e o longo desde 08/08.
 * ⚠️ **IMPORTADO, nunca copiado.** Tudo em `impacto.tsx` já tem o formato vertical por
 * omissão, que é o deste vídeo — não há um número para converter.
 */
import {
  IMPACTO_POR_CENA_50S, IMPACTO_FRAMES, SequenciaDeImpacto, TexturaDoLoop, tremorNoFrame,
} from './impacto';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import type { TransitionPresentation } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { Background, Watermark, EtiquetaTema, TrilhoProgresso, CartaoResultado, CarimboAppGratis, SceneRenderer, SceneAudioLayer, ShockIntro, DynamicIntro, SignatureOutro, TelaBordao, BORDAO_FRAMES, BORDAO_OVERLAP_FRAMES, computeGlobalShotSfxFires, computeMetaphorStages } from './scenes';
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

/**
 * A CAPA DISRUPTIVA (T1, IMPLEMENTACAO20 §21.2 — 01/08/2026).
 *
 * ANTES: 45 frames (1,5s) de texto MUDO, e a voz só começava DEPOIS. O dono viu
 * 1,5s de cartaz parado e, quando a voz falava, já ia na 2ª cena — *"impossível de
 * entender… só tem 1 segundo e não fala nada."*
 *
 * AGORA são DOIS números diferentes, e é essa a mudança que interessa:
 *  · CAPA_FRAMES_V3 (105f / 3,5s) = quanto tempo a CAPA fica no ecrã.
 *  · VOZ_ENTRA_FRAMES (27f / 0,9s) = onde começa TODO o resto (áudio, legenda,
 *    cenas, SFX). A capa é desenhada POR CIMA, então dos 0,9s aos 3,5s a pessoa
 *    ouve a primeira frase enquanto ainda vê a ação da capa.
 *
 * ⚠️ Isto torna a abertura mais CURTA em tempo morto, não mais longa: antes havia
 * 1,5s sem voz nenhuma, agora há 0,9s. O vídeo final até encolhe 0,6s.
 * ⚠️ O que se PERDE: os primeiros ~2,6s do visual da cena 1 ficam tapados pela capa.
 * É deliberado — nesse tempo a capa É o visual, e é ela que decide se a pessoa fica.
 *
 * ⚠️ VOZ_ENTRA_FRAMES está ESPELHADO em `introSecondsFor()` de srt-short.js. É o
 * OFFSET que tem de ser espelhado, NUNCA a duração da capa — espelhar 3,5s em vez
 * de 0,9s atrasaria a legenda 2,6s em relação à voz.
 */
/**
 * ⚠️ 105 → 223 (3,5s → 7,4s) em 02/08/2026, e é conta, não gosto.
 *
 * A partir de agora a 1ª frase FALADA é a mesma que está escrita na capa (ideia do
 * dono: *"o gancho correto seria falar o que está escrito na primeira cena"*).
 *
 * O número sai da FRASE DO DONO, não do meu gosto. Ele escreveu a chamada que quer —
 * *"3 erros de quem usa cartão que faz você perder 500 por mês e nem perceber!"* —
 * e ela tem 17 palavras quando os números vão por extenso. A regra ficou em 18, que
 * a 2,76 palavras/s levam 6,5s a dizer. Com a voz a entrar aos 0,9s, a capa fica
 * **7,4s**, senão ela sai da tela a meio da frase e a pessoa lê metade.
 * (A 1ª versão pôs 13 palavras — e reprovou a frase do próprio dono. A trava estava
 * a limitar aquilo que ele pede.)
 *
 * ⚠️ ISTO NÃO ALONGA O VÍDEO. Quem define o começo de tudo é `VOZ_ENTRA_FRAMES`
 * (0,9s) — ver `introFramesFor` logo abaixo. Este número só diz quanto tempo a capa
 * fica DESENHADA POR CIMA. O preço é tapar mais uns segundos do visual da cena 1, e
 * é deliberado: nos primeiros segundos quem manda é a capa.
 */
export const CAPA_FRAMES_V3 = 223;
export const VOZ_ENTRA_FRAMES = 27;
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
    | 'foguete' | 'semente' | 'montanha-russa' | 'bolha' | 'ralo'
    // leva 1 das imagens novas (IMPLEMENTACAO20 §20.2 B1)
    | 'ampulheta' | 'balanca' | 'bola-de-ferro' | 'guarda-chuva'
    // leva 2
    | 'ratoeira' | 'mochila-pedras' | 'areia-movedica' | 'domino'
    // leva 3
    | 'castelo-cartas' | 'gangorra' | 'corda-bamba' | 'relogio'
    // leva 4
    | 'vela' | 'trem-perdido' | 'bifurcacao' | 'duas-portas'
    // leva 5
    | 'semaforo' | 'cofre' | 'escudo' | 'boia'
    // leva 6 (última)
    | 'escada' | 'balde-furado' | 'buraco' | 'fumaca';
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

/**
 * ONDE COMEÇA TUDO O RESTO (áudio, legenda, cenas, SFX) — o "offset único da intro".
 * v3 = 27f (0,9s, a voz entra DENTRO da capa) · legada = 45f · sem intro = 0.
 * ESPELHADO em `introSecondsFor()` de src/scripts/youtube/srt-short.js — qualquer
 * mudança aqui exige a mesma mudança lá, senão a legenda do YouTube dessincroniza
 * da voz (bug corrigido em 2026-07-22).
 */
export const introFramesFor = (script: ShortScript): number =>
  !script.intro ? 0 : isV3Intro(script.intro) ? VOZ_ENTRA_FRAMES : INTRO_FRAMES;

/**
 * QUANTO TEMPO A CAPA FICA NO ECRÃ. Só isto — não é offset de nada.
 * Na v3 é maior que o offset de propósito: a capa continua por cima enquanto a voz
 * já fala. Na intro legada os dois valores coincidem (não havia voz por baixo).
 */
export const capaFramesFor = (script: ShortScript): number =>
  !script.intro ? 0 : isV3Intro(script.intro) ? CAPA_FRAMES_V3 : INTRO_FRAMES;

/**
 * A IMAGEM DESTE VÍDEO — é ela que escolhe a coreografia da capa.
 * Sai do PRÓPRIO roteiro (o primeiro shot de imagem que não seja a mãozinha da
 * chamada), de propósito: assim o gerador não precisa de escrever mais um campo,
 * nenhum prompt novo pode contradizer nenhuma trava nova, e os roteiros que já
 * existem ganham capa sem serem tocados.
 */
export const fioCondutorDoScript = (script: ShortScript): string | null => {
  /**
   * ♦ Desde 03/08/2026 o roteiro grava a imagem no campo `fioCondutor` — no padrão
   * novo a metáfora não é falada, logo pode não existir NENHUM shot de metáfora e
   * o scan abaixo devolvia null (capa sem coreografia). O campo é a fonte; o scan
   * fica como fallback para os roteiros antigos, que continuam a funcionar igual.
   */
  if (script.fioCondutor && script.fioCondutor !== 'clique-link') return script.fioCondutor;
  for (const cena of script.scenes || []) {
    for (const shot of cena.shots || []) {
      const m = shot.visual?.metaphor;
      if (shot.visual?.type === 'metaphor' && m && m !== 'clique-link') return m;
    }
  }
  return null;
};

export type ShortScript = {
  slug: string;
  term: string;
  keyword: string;
  nextVideoTitle?: string;
  /** ♦ 03/08/2026: a imagem do vídeo, gravada pela coreografia (capa + música). */
  fioCondutor?: string;
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

/**
 * RESPIRO ENTRE CENAS (IMPLEMENTACAO20 §21.3 — T2, 01/08/2026).
 *
 * ANTES: a cena durava EXATAMENTE o áudio medido. Como o trilho mestre corta
 * TRANSITION_FRAMES do fim de cada faixa (ver o `durationInFrames` lá em baixo),
 * o resultado era o PIOR dos dois mundos: a última fração de segundo de cada
 * frase era DECEPADA e a frase seguinte entrava no instante exato — zero silêncio.
 * O dono ouviu isto como "as falas ficam quase uma em cima da outra".
 * A causa fui eu: ao passar a medir o áudio real (§17.8b) o respiro que existia
 * por acidente desapareceu.
 *
 * DEPOIS: +0,7s no fim de cada cena MENOS a última. Desses 0,7s, 0,27s são comidos
 * pela sobreposição da transição — sobram ~0,43s de silêncio REAL, perto da pausa
 * que o TTS dá num ponto de interrogação (a única que o dono aprovou).
 *
 * ⚠️ ESTE VALOR ESTÁ DUPLICADO em src/scripts/youtube/srt-short.js (masterStarts).
 * Mudar aqui SEM mudar lá faz a legenda ADIANTAR-SE 0,7s por cena (3,5s ao fim de
 * 6 cenas) — o mesmo modo de falha do TRANSITION_FRAMES, documentado acima.
 */
export const RESPIRO_SEC = 0.7;

// Duração de cada cena (seg): a MEDIDA do TTS (timing) ou a autoral do roteiro,
// mais o respiro (menos na última cena, que é seguida pela assinatura da marca).
export const sceneDurationsSec = (script: ShortScript, timing: ShortTiming): number[] =>
  script.scenes.map((s, i) => {
    const falada = sceneTimingFor(timing, s, i)?.durationSec || s.durationSec;
    return i < script.scenes.length - 1 ? falada + RESPIRO_SEC : falada;
  });

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
        {/* `sceneFrames` = o comprimento REAL da cena, já com o respiro. Sem isto o
            SceneRenderer voltaria a calcular a duração pelo áudio cru e (a) o último
            shot acabaria antes do fim da cena, deixando ~0,7s de tela VAZIA, e (b) os
            SFX — que recebem os frames JÁ com respiro via computeGlobalShotSfxFires —
            dispariam em frames diferentes dos da imagem. */}
        <SceneRenderer scene={scene} timing={sceneTimingFor(timing, scene, i)} metaphorStages={metaphorStagesByScene[i]} sceneFrames={frames[i]} />
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
  const capaFrames = capaFramesFor(script);

  /**
   * 🔴 OS SOCOS — 09/08/2026. Qual cena leva qual está em `IMPACTO_POR_CENA_50S`, com
   * o porquê de cada um. Aqui decide-se só ONDE, no tempo, cada um bate.
   *
   * ⚠️ **`masterStarts` é relativo ao `<Sequence from={introFrames}>`, e os socos vivem
   * FORA dele** — por isso somam-se os dois. Sem essa soma cada soco batia 0,9s cedo
   * demais, que é quase um terço do tempo em que ele existe no ecrã.
   *
   * ⚠️ **O primeiro NÃO pode bater no fotograma 2 como no de 16s.** Aqui a capa fica
   * 223 fotogramas (7,4s) por cima de tudo — um soco por baixo dela era um soco que
   * ninguém via, e ainda por cima o único que a pessoa ia receber nos primeiros dez
   * segundos, que são os que decidem se ela fica.
   *
   * ⚠️ Os outros esperam `TRANSITION_FRAMES + 4` pela mesma razão que no de 16s: a meio
   * de uma transição vêem-se as DUAS cenas ao mesmo tempo, e o clarão sublinharia a
   * mistura em vez da cena nova.
   */
  const socos = IMPACTO_POR_CENA_50S
    .map((imp, i) => {
      if (!imp || i >= masterStarts.length) return null;
      const inicio = i === 0
        ? Math.max(introFrames + masterStarts[0], capaFrames) + 4
        : introFrames + masterStarts[i] + TRANSITION_FRAMES + 4;
      return { ...imp, inicio };
    })
    .filter(Boolean) as Array<{ tipo: 'alerta' | 'virada'; som: string; inicio: number }>;

  /**
   * 🔴 O SOCO DENTRO DA CAPA — 09/08/2026, e é ele que conserta os 4 segundos parados.
   *
   * ═══ O DEFEITO, MEDIDO NO VÍDEO RENDERIZADO ═══
   * A régua do ritmo encontrava **4,0 segundos parados entre os 00:03 e os 00:07** — e
   * eles caem DENTRO da capa, que dura 223 fotogramas (7,4s). É o pior sítio do vídeo
   * para um congelamento: nos nossos Shorts **metade da audiência sai aos 14 segundos**.
   *
   * A frase crava toda nos primeiros 10 fotogramas; a coreografia anima, mas a meio
   * pixel por fotograma. Dos 3s aos 7s não entra nada novo no ecrã.
   *
   * ═══ O QUE SE TENTOU ANTES, E FALHOU ═══
   * Uma aproximação lenta de câmara na coreografia (fica em `scenes.tsx`). **Medida:
   * 6,09 → 6,11, e os 4 segundos intactos.** Câmara lenta não conserta plano parado.
   *
   * ═══ POR QUE UM SOCO AQUI NÃO É EXAGERO ═══
   * Eu tinha deixado o de 50s com **um soco a cada 6,8 segundos**, por receio de que o
   * vermelho virasse papel de parede. Depois medi a referência: **o Short de 16s que o
   * dono aprovou tem um a cada 2,9 segundos.** Eu estava a ser conservador contra o
   * gosto dele, e o número diz que há folga de sobra.
   *
   * ⚠️ **O sítio: a meio da capa, e não no princípio nem no fim.** No princípio já há a
   * pancada da abertura (fotograma 3, o `boom` com o clarão); no fim há o soco que entra
   * assim que ela levanta. O buraco é o MIOLO — por isso 55% da vida da capa, que dá
   * ~4,1s e cai a meio dos 4 segundos mortos.
   *
   * ⚠️ **`alerta` e não `virada`:** a capa está a enunciar o PROBLEMA (é a pergunta que
   * abre o vídeo). Um verde aqui contradiria o que a voz está a dizer.
   */
  const socoDaCapa = capaFrames > 0
    ? [{ tipo: 'alerta' as const, som: 'thud.ogg', inicio: Math.round(capaFrames * 0.55) }]
    : [];

  /**
   * O TREMOR ACOMPANHA O SOCO — e abana o CONTEÚDO, não o efeito. Se abanasse o clarão,
   * ele saía das bordas e via-se o fundo por baixo. É a mesma nota do de 16s.
   */
  const frameAtual = useCurrentFrame();
  const todosOsSocos = [...socoDaCapa, ...socos];
  const abana = todosOsSocos.reduce(
    (acc, s) => {
      const local = frameAtual - s.inicio;
      if (local < 0 || local >= IMPACTO_FRAMES) return acc;
      const t = tremorNoFrame(local);
      return { x: acc.x + t.x, y: acc.y + t.y };
    },
    { x: 0, y: 0 },
  );

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
      {/* ⚠️ A TEXTURA VEM LOGO A SEGUIR AO FUNDO, e a ordem no JSX é que decide: irmãos
          posteriores pintam por cima, e ela tem de ficar POR TRÁS de tudo. É moldura de
          canto, palavra fantasma e poeira — não diz nada, só tira o vídeo do "roxo liso"
          que o dono viu na primeira prévia do de 16s. É a mesma peça, sem uma linha nova:
          `impacto.tsx` tem o formato vertical por omissão, e este vídeo é vertical. */}
      <TexturaDoLoop palavra={script.keyword || script.term || ''} />
      <BackgroundMusic ficheiro={(script as { music?: { ficheiro?: string } }).music?.ficheiro} />
      {/* ⚠️ A `<Watermark />` mudou-se para depois da capa — ver o comentário lá. */}
      <Sequence from={introFrames}>
        {/* Etiqueta do tema: fora do TransitionSeries de propósito — ela NÃO deve
            entrar e sair a cada cena, é o elemento fixo que costura o vídeo todo.
            Começa depois da intro para não competir com a frase de abertura. */}
        <EtiquetaTema tema={script.term} />
        {/* O carimbo da promessa, no canto oposto ao da etiqueta. Fica aqui dentro
            (e nao no topo do ficheiro) para NAO aparecer na abertura. Ver IMPL20 §53. */}
        <CarimboAppGratis />
        {/* Trilho de progresso: também fora do TransitionSeries — atravessa o vídeo
            inteiro. `masterStarts` já são os frames globais das viradas de cena. */}
        <TrilhoProgresso totalFrames={contentFrames} marcas={masterStarts} />
        {/* O tremor abana as CENAS, e só elas. Num invólucro próprio para não abanar o
            fundo (que a abanar mostraria a borda), nem a etiqueta, nem o trilho — que
            são elementos fixos e a tremer pareceriam soltos. */}
        <AbsoluteFill style={{ transform: `translate(${abana.x}px, ${abana.y}px)` }}>
          <TransitionSeries>{children}</TransitionSeries>
        </AbsoluteFill>
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
      {/* A CAPA, POR CIMA DE TUDO — e a ordem aqui é o que faz isso acontecer.
          Ela vem DEPOIS do bloco das cenas de propósito: irmãos posteriores pintam
          por cima. Enquanto a capa está no ar (0 → 3,5s) a voz já toca por baixo
          desde os 0,9s, que é exatamente o que o dono pediu. Antes a capa vinha
          primeiro e, mesmo que durasse mais, as cenas tapavam-na. */}
      {script.intro && (() => {
        /**
         * ♦ A CAPA NUNCA SOBREVIVE À CENA 1 (03/08/2026) — visto no 1º vídeo real
         * do robô. A capa tem duração fixa (223f = 7,4s, o tempo de dizer 18
         * palavras), mas uma pergunta CURTA encolhe a cena 1: no vídeo da inflação
         * a cena 2 começou aos ~6,2s com a capa ainda no ar até 7,4s — a voz dizia
         * "É quando o dinheiro passa…" e a legenda karaokê existia, mas TAPADA
         * pela capa, que pinta por cima de tudo. Teto novo: a capa acaba, no mais
         * tardar, quando a cena 2 arranca (o offset das legendas continua sendo os
         * 0,9s da voz — este teto não mexe nele).
         */
        const arranqueDaCena2 = masterStarts.length > 1
          ? introFrames + masterStarts[1]
          : Number.POSITIVE_INFINITY;
        const capaEfetiva = Math.max(1, Math.min(capaFrames, arranqueDaCena2));
        return (
          <Sequence durationInFrames={capaEfetiva}>
            {isV3Intro(script.intro) ? (
              <DynamicIntro
                frase={script.intro.frase || ''}
                counter={script.intro.counter}
                frames={capaEfetiva}
                metaphor={fioCondutorDoScript(script)}
              />
            ) : (
              <ShockIntro big={script.intro.big || ''} sub={script.intro.sub || ''} />
            )}
          </Sequence>
        );
      })()}

      {/**
        * 🔴 A MARCA FICA À FRENTE DE TUDO — 08/08/2026, ordem do dono.
        *
        * Ela vivia logo a seguir ao fundo, e em Remotion os irmãos posteriores pintam
        * por cima: as cenas e a capa tapavam-na. No de 50s isto era ainda mais fácil de
        * não ver, porque a capa só é opaca quando o roteiro tem coreografia
        * (`temAcao`) — ou seja, o defeito aparecia e desaparecia conforme os DADOS, não
        * conforme o código. Nos quatro roteiros em disco, todos têm: a marca estava
        * escondida os ~7 segundos da capa em todos os vídeos reais.
        *
        * ⚠️ Aqui, e não mais abaixo: o bordão e a assinatura são telas de marca com
        * identidade própria e não levam marca de água por cima.
        */}
      <Watermark />

      {/* ♦ A TELA DO BORDÃO (03/08/2026): por cima dos últimos ~2,5s da última cena,
          o tempo exato de a voz dizer o bordão — custo ZERO em segundos. Vem ANTES
          da assinatura no JSX de propósito: a assinatura pinta por cima durante o
          overlap, e a passagem fica sem salto. Sempre idêntica em todos os vídeos. */}
      <Sequence
        from={Math.max(0, introFrames + contentFrames - BORDAO_FRAMES)}
        durationInFrames={BORDAO_FRAMES + BORDAO_OVERLAP_FRAMES}
      >
        <TelaBordao />
      </Sequence>
      {/* Assinatura final da marca (~2,5s) — entra após a última cena. A duração da
          composição é estendida em +SIGNATURE_FRAMES no Root (calculateMetadata). */}
      <Sequence from={introFrames + contentFrames} durationInFrames={SIGNATURE_FRAMES}>
        <SignatureOutro />
      </Sequence>
      {/* 🔴 OS SOCOS, POR CIMA DE TUDO — inclusive da legenda e da capa. São 0,4s cada;
          nesse tempo o alerta É o vídeo. Vêm por último no JSX porque é a ordem que
          decide quem pinta em cima de quem — é a mesma arrumação do de 16s e do longo.
          ⚠️ E ficam FORA do `<Sequence from={introFrames}>`: os `inicio` já são frames
          globais (ver o cálculo lá em cima). */}
      {todosOsSocos.map((s, i) => (
        <SequenciaDeImpacto key={`imp${i}`} from={s.inicio} tipo={s.tipo} som={s.som} />
      ))}
    </AbsoluteFill>
  );
};
