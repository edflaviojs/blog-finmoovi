/**
 * A COMPOSIÇÃO DO VÍDEO LONGO — 1920×1080, ~6 minutos (04/08/2026).
 * IMPLEMENTACAO20 §14 F4. É a primeira montagem 16:9 deste canal.
 *
 * ═══ O QUE ELA REAPROVEITA, E É QUASE TUDO ═══
 * · o b-roll 16:9 do catálogo (`CATALOG.md`) — dezenas de composições `*Long` já
 *   prontas e validadas, com dados reais do app. Nenhuma foi tocada;
 * · o fundo, a marca d'água, a assinatura final e a TELA DO BORDÃO (`scenes.tsx`),
 *   que o dono escolheu em 03/08 e que é a mesma em todos os vídeos do canal;
 * · as contas de karaokê de `captions.tsx` (quem fala quando), com a POSIÇÃO
 *   refeita para 16:9 — o componente do Short tem `bottom: 300`, que num ecrã de
 *   1080 de altura deixaria a legenda a meio da tela.
 *
 * ═══ O QUE É NOVO, E PORQUÊ ═══
 * · **A PLACA DE CAPÍTULO.** É o que separa um vídeo longo de seis minutos de fala
 *   corrida. Os dados reais (§33.5) mostram que os vídeos que prendem anunciam cada
 *   capítulo — e o título que aqui aparece é o MESMO que vai para os capítulos da
 *   descrição do YouTube.
 * · **O TRILHO DE PROGRESSO**, que atravessa o vídeo inteiro com uma marca por
 *   capítulo: em seis minutos, saber quanto falta é retenção.
 * · **UMA IMAGEM NOVA A CADA ~15 SEGUNDOS.** O §26.4 avisou que o risco número um
 *   deste formato é a monotonia. A cena mais longa deste vídeo dura o que a voz
 *   demora a dizer 40 palavras, e nunca repete a composição anterior.
 *
 * ═══ O QUE ESTA COMPOSIÇÃO NÃO FAZ ═══
 * Não mexe no `Short.tsx` nem em nada do robô diário. É um ficheiro novo, e a única
 * coisa que precisa do exterior é uma entrada no `Root.tsx`.
 */

import React from 'react';
import { AbsoluteFill, Audio, Loop, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Background, Watermark, SignatureOutro, TelaBordao, BORDAO_FRAMES, BORDAO_OVERLAP_FRAMES } from './scenes';
import { BackgroundMusic } from './audio/music';
import { activeIndex, isEmphasisWord, wordTimingsFromReal, layoutWords } from './captions';
import { BRAND, DISPLAY, BODY, gradientText } from './theme';

// ── o b-roll 16:9 já pronto (nenhuma destas composições foi tocada) ──────────
import { CreditCards3DLong } from './CreditCards3D';
import { CartoesCountUpLong } from './CartoesCountUp';
import { FluxoCaixa3DLong } from './FluxoCaixa3D';
import { FluxoBarrasLong } from './FluxoBarras';
import { Extrato3DLong } from './Extrato3D';
import { ExtratoListaLong } from './ExtratoLista';
import { Balanco3DLong } from './Balanco3D';
import { BalancoDonutLong } from './BalancoDonut';
import { Compras3DLong } from './Compras3D';
import { ComprasCarrinhoLong } from './ComprasCarrinho';
import { SmartCapture3DLong } from './SmartCapture3D';
import { SmartCaptureVozLong } from './SmartCaptureVoz';
import { AppMosaicoLong, AppCarrosselLong, AppQuadLong, AppNumerosLong } from './AppOverview';

const BROLL: Record<string, React.FC> = {
  CreditCards3DLong, CartoesCountUpLong, FluxoCaixa3DLong, FluxoBarrasLong,
  Extrato3DLong, ExtratoListaLong, Balanco3DLong, BalancoDonutLong,
  Compras3DLong, ComprasCarrinhoLong, SmartCapture3DLong, SmartCaptureVozLong,
  AppMosaicoLong, AppCarrosselLong, AppQuadLong, AppNumerosLong,
};

export type LongScene = {
  id: number;
  bloco: string;
  parte: string;
  role: string;
  narration: string;
  palavras: number;
  durationSec: number;
  broll: string;
  brollFrames: number;
  capitulo?: number | null;
  tituloCapitulo?: string;
  abreCapitulo?: boolean;
};

export type LongScript = {
  slug: string;
  tema: string;
  promessa: string;
  fioCondutor?: string;
  capa: string;
  capitulos: { numero: number; titulo: string }[];
  scenes: LongScene[];
  music?: { ficheiro?: string };
};

export type LongTiming = {
  slug: string;
  scenes: { id: number; audioFile: string; durationSec: number; words: { word: string; start: number; end: number }[] }[];
} | null;

/**
 * A CAPA. A pergunta que abre o vídeo fica escrita enquanto é dita — é o mesmo
 * princípio do Short, e é ela que vai à miniatura.
 * ⚠️ 8 segundos, e não os 7,4 do Short: a regra do canal dá 18 palavras à pergunta,
 * e a 2,6 palavras/s isso são 6,9s. Com a voz a entrar aos 0,9s, 8s é o mínimo para
 * a capa não sair da tela a meio da frase — o defeito exato que o dono apanhou no
 * primeiro vídeo real do robô (§32.4).
 */
export const VOZ_ENTRA_FRAMES = 27;
export const CAPA_FRAMES = 240;
export const SIGNATURE_FRAMES = 75;
export const PLACA_FRAMES = 78; // ~2,6s de placa de capítulo, por cima da cena
/**
 * O RESPIRO ENTRE CENAS. O TTS já acrescenta 0,35s de silêncio ao fim de cada fala
 * (`TAIL_PAD`), e o Short soma mais 0,7s por cena. Aqui são 0,35s: num vídeo de seis
 * minutos com ~23 cenas, 0,7s por cena seriam 16 segundos de silêncio — o dobro do
 * que a fala precisa para respirar, e tempo morto é onde a audiência sai.
 */
export const RESPIRO_SEC = 0.35;

const durationsSec = (script: LongScript, timing: LongTiming): number[] =>
  script.scenes.map((s, i) => {
    const medido = timing?.scenes?.find((t) => String(t.id) === String(s.id))?.durationSec;
    const falada = medido || s.durationSec;
    return i < script.scenes.length - 1 ? falada + RESPIRO_SEC : falada;
  });

export const longFramesFrom = (durs: number[], fps: number) => durs.map((d) => Math.max(1, Math.round(d * fps)));

export const longTotalFrames = (script: LongScript, timing: LongTiming, fps: number) =>
  CAPA_FRAMES > 0
    ? VOZ_ENTRA_FRAMES + longFramesFrom(durationsSec(script, timing), fps).reduce((a, b) => a + b, 0) + SIGNATURE_FRAMES
    : 0;

// ── a legenda karaokê, refeita para 16:9 ────────────────────────────────────
const BASE = 46;
const EMPHASIS = 66;

const LegendaLonga: React.FC<{ narration: string; totalFrames: number; words?: { word: string; start: number; end: number }[] }> = ({ narration, totalFrames, words }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const timings = words && words.length ? wordTimingsFromReal(words, fps) : layoutWords(narration, totalFrames);
  const active = activeIndex(timings, frame);
  const currentLine = timings[active]?.line ?? 0;
  const lineWords = timings.filter((t) => t.line === currentLine);
  const lineStart = lineWords[0]?.start ?? 0;
  const lineIn = spring({ frame: frame - lineStart, fps, config: { damping: 18, mass: 0.5 } });
  const lineY = interpolate(lineIn, [0, 1], [22, 0]);

  return (
    <div style={{
      position: 'absolute', bottom: 92, left: 180, right: 180,
      display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center',
      gap: '10px 14px', transform: `translateY(${lineY}px)`,
      fontFamily: BODY, fontWeight: 800, lineHeight: 1.05,
    }}>
      {lineWords.map((t) => {
        const idx = timings.indexOf(t);
        const isActive = idx === active;
        const pop = spring({ frame: frame - t.start, fps, config: { damping: 12, mass: 0.4 } });
        const escala = t.emphasis && isActive ? interpolate(pop, [0, 1], [0.6, 1.04]) : (isActive ? interpolate(pop, [0, 1], [0.7, 1.1]) : 1);
        const dito = frame >= t.start;
        return (
          <span key={idx} style={{
            display: 'inline-block',
            fontSize: t.emphasis ? EMPHASIS : BASE,
            transform: `scale(${escala})`,
            padding: isActive ? '2px 14px' : '2px 0',
            borderRadius: 12,
            background: isActive ? BRAND.gradient : 'transparent',
            color: isActive ? '#0d1117' : t.emphasis ? BRAND.yellow : dito ? BRAND.text : 'rgba(148,163,184,0.55)',
            textShadow: isActive ? 'none' : '0 3px 14px rgba(0,0,0,0.8)',
            boxShadow: isActive ? '0 8px 26px rgba(139,92,246,0.45)' : 'none',
          }}>{t.word}</span>
        );
      })}
    </div>
  );
};

// ── a capa ──────────────────────────────────────────────────────────────────
const CapaLonga: React.FC<{ pergunta: string; tema: string; frames: number }> = ({ pergunta, frames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entra = spring({ frame, fps, config: { damping: 16, mass: 0.7 } });
  const escala = interpolate(entra, [0, 1], [1.14, 1]);
  const sai = interpolate(frame, [frames - 12, frames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const brilho = interpolate(frame, [0, 3, 14], [0.7, 0.35, 0], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', opacity: sai }}>
      <AbsoluteFill style={{ background: 'rgba(13,17,23,0.94)' }} />
      <div style={{
        position: 'relative', zIndex: 1, maxWidth: 1560, padding: '0 60px', textAlign: 'center',
        transform: `scale(${escala})`,
      }}>
        <div style={{
          ...gradientText, fontFamily: DISPLAY, fontWeight: 900, fontSize: 96, lineHeight: 1.08,
          filter: 'drop-shadow(0 0 46px rgba(139,92,246,0.5))',
        }}>{pergunta}</div>
        <div style={{
          marginTop: 46, height: 10, width: `${interpolate(entra, [0, 1], [0, 560])}px`, borderRadius: 5,
          margin: '46px auto 0', background: `linear-gradient(90deg, ${BRAND.cyan}, ${BRAND.violet}, ${BRAND.magenta})`,
        }} />
      </div>
      <AbsoluteFill style={{ background: '#fff', opacity: brilho, pointerEvents: 'none' }} />
    </AbsoluteFill>
  );
};

// ── a placa de capítulo ─────────────────────────────────────────────────────
const PlacaCapitulo: React.FC<{ numero: number; titulo: string }> = ({ numero, titulo }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entra = spring({ frame, fps, config: { damping: 17, mass: 0.6 } });
  const sai = interpolate(frame, [PLACA_FRAMES - 14, PLACA_FRAMES], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const x = interpolate(entra, [0, 1], [-160, 0]);

  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'flex-start', padding: '0 0 230px 110px', opacity: sai }}>
      <div style={{ transform: `translateX(${x}px)`, display: 'flex', alignItems: 'center', gap: 26 }}>
        <div style={{
          fontFamily: DISPLAY, fontWeight: 900, fontSize: 128, lineHeight: 1,
          ...gradientText, filter: 'drop-shadow(0 0 30px rgba(139,92,246,0.55))',
        }}>{numero}</div>
        <div style={{ borderLeft: `6px solid ${BRAND.violet}`, paddingLeft: 26, maxWidth: 1100 }}>
          <div style={{ fontFamily: BODY, fontWeight: 800, fontSize: 26, letterSpacing: 3, color: BRAND.cyan }}>
            PASSO {numero}
          </div>
          <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 62, lineHeight: 1.1, color: BRAND.text, marginTop: 8 }}>
            {titulo}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── o trilho de progresso, com uma marca por capítulo ───────────────────────
const TrilhoLongo: React.FC<{ total: number; marcas: number[] }> = ({ total, marcas }) => {
  const frame = useCurrentFrame();
  const pct = Math.min(1, Math.max(0, frame / Math.max(1, total)));
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 8, background: 'rgba(148,163,184,0.16)' }}>
      <div style={{ height: '100%', width: `${pct * 100}%`, background: BRAND.gradient, boxShadow: '0 0 18px rgba(139,92,246,0.6)' }} />
      {marcas.map((m, i) => (
        <div key={i} style={{
          position: 'absolute', left: `${(m / Math.max(1, total)) * 100}%`, top: -4, width: 4, height: 16,
          background: frame >= m ? BRAND.yellow : 'rgba(148,163,184,0.5)', borderRadius: 2,
        }} />
      ))}
    </div>
  );
};

// ── a cena ──────────────────────────────────────────────────────────────────
const CenaLonga: React.FC<{ cena: LongScene; frames: number; palavras?: { word: string; start: number; end: number }[] }> = ({ cena, frames, palavras }) => {
  const frame = useCurrentFrame();
  const Broll = BROLL[cena.broll] || BROLL.AppMosaicoLong;
  // Entrada suave: sem isto, a troca de b-roll a cada ~15s é um corte seco e o vídeo
  // parece uma apresentação de slides.
  const entra = interpolate(frame, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ opacity: entra }}>
        {/* A composição do catálogo tem duração própria; quando a cena é mais longa,
            ela repete em ciclo em vez de congelar no último fotograma. */}
        <Loop durationInFrames={Math.max(30, cena.brollFrames)}>
          <Broll />
        </Loop>
      </AbsoluteFill>
      {/* Véu por baixo da legenda: sem ele, a legenda branca cai por cima de gráficos
          claros e deixa de se ler. Só a faixa de baixo é escurecida. */}
      <AbsoluteFill style={{
        background: 'linear-gradient(to top, rgba(13,17,23,0.92) 0%, rgba(13,17,23,0.75) 14%, rgba(13,17,23,0) 32%)',
      }} />
      <LegendaLonga narration={cena.narration} totalFrames={frames} words={palavras} />
    </AbsoluteFill>
  );
};

export const Long: React.FC<{ script: LongScript; timing?: LongTiming }> = ({ script, timing = null }) => {
  const { fps } = useVideoConfig();
  const durs = durationsSec(script, timing);
  const frames = longFramesFrom(durs, fps);

  const inicios: number[] = [];
  {
    let acc = 0;
    for (const f of frames) { inicios.push(acc); acc += f; }
  }
  const conteudo = frames.reduce((a, b) => a + b, 0);
  const marcasDeCapitulo = script.scenes
    .map((s, i) => (s.abreCapitulo ? inicios[i] : -1))
    .filter((v) => v >= 0);

  const timingDe = (id: number) => timing?.scenes?.find((t) => String(t.id) === String(id));

  return (
    <AbsoluteFill>
      <Background />
      <BackgroundMusic ficheiro={script.music?.ficheiro} />
      <Watermark />

      <Sequence from={VOZ_ENTRA_FRAMES}>
        <TrilhoLongo total={conteudo} marcas={marcasDeCapitulo} />
        {script.scenes.map((cena, i) => {
          const t = timingDe(cena.id);
          return (
            <Sequence key={`c${i}`} from={inicios[i]} durationInFrames={frames[i]}>
              <CenaLonga cena={cena} frames={frames[i]} palavras={t?.words} />
              {t?.audioFile ? <Audio src={staticFile(t.audioFile)} /> : null}
              {cena.abreCapitulo && cena.capitulo ? (
                <Sequence durationInFrames={PLACA_FRAMES}>
                  <PlacaCapitulo numero={cena.capitulo} titulo={cena.tituloCapitulo || ''} />
                </Sequence>
              ) : null}
            </Sequence>
          );
        })}
      </Sequence>

      {/* A CAPA POR CIMA DE TUDO — irmãos posteriores pintam por cima. A voz já toca
          por baixo desde os 0,9s, que é exatamente o que o dono pediu no Short.
          ⚠️ E, como no Short, a capa NUNCA sobrevive à cena 2: uma pergunta curta
          encolhe a cena 1 e a capa taparia a legenda seguinte (o defeito §32.4). */}
      <Sequence durationInFrames={Math.max(1, Math.min(CAPA_FRAMES, VOZ_ENTRA_FRAMES + (frames[0] || CAPA_FRAMES)))}>
        <CapaLonga
          pergunta={script.capa}
          tema={script.tema}
          frames={Math.max(1, Math.min(CAPA_FRAMES, VOZ_ENTRA_FRAMES + (frames[0] || CAPA_FRAMES)))}
        />
      </Sequence>

      {/* A TELA DO BORDÃO, por cima dos últimos ~2,5s — a mesma assinatura de todos os
          vídeos do canal, escolhida pelo dono em 03/08. Custo ZERO em segundos. */}
      <Sequence
        from={Math.max(0, VOZ_ENTRA_FRAMES + conteudo - BORDAO_FRAMES)}
        durationInFrames={BORDAO_FRAMES + BORDAO_OVERLAP_FRAMES}
      >
        <TelaBordao />
      </Sequence>

      <Sequence from={VOZ_ENTRA_FRAMES + conteudo} durationInFrames={SIGNATURE_FRAMES}>
        <SignatureOutro />
      </Sequence>
    </AbsoluteFill>
  );
};
