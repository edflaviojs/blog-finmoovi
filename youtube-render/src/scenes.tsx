import { AbsoluteFill, Audio, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig, Easing, Sequence } from 'remotion';
import { BRAND, DISPLAY, BODY, gradientText } from './theme';
import { FinMooviIcon } from './icon';
import { KaraokeCaption } from './captions';
import { IconBurst, SHOT_ICONS, ShotIconKey } from './icons-fx';
import { SceneSfx, resolveShotSfx } from './audio/sfx';
import type { Shot, AppScreen } from './Short';
// Biblioteca de b-roll NATIVO (React puro, sem OffthreadVideo) — cada tela é uma
// composição 1080×1920 completa; o AppShot (v3.3) as monta escaladas num celular.
import { DashboardHero } from './DashboardHero';
import { CartoesCountUpShort } from './CartoesCountUp';
import { FluxoBarrasShort } from './FluxoBarras';
import { ExtratoListaShort } from './ExtratoLista';
import { BalancoDonutShort } from './BalancoDonut';
import { ComprasCarrinhoShort } from './ComprasCarrinho';
import { SmartCaptureVozShort } from './SmartCaptureVoz';

// Formatação pt-BR de números (contadores): 3200000 → "3.200.000".
const nfBR = new Intl.NumberFormat('pt-BR');

// ─────────────────────────────────────────────────────────────────────────────
// Fundo vivo: gradiente escuro + manchas de luz que respiram + partículas subindo
// + grade sutil em movimento. Dá "muito motion" mesmo sem b-roll.
// ─────────────────────────────────────────────────────────────────────────────
const Particles: React.FC = () => {
  const frame = useCurrentFrame();
  const dots = new Array(24).fill(0);
  return (
    <AbsoluteFill>
      {dots.map((_, i) => {
        const x = random(`x${i}`) * 1080;
        const speed = 0.4 + random(`s${i}`) * 1.1;
        const size = 3 + random(`z${i}`) * 6;
        const y = (1920 - ((frame * speed * 6) + random(`o${i}`) * 1920)) % 1920;
        const twinkle = 0.15 + 0.35 * (0.5 + 0.5 * Math.sin(frame / 12 + i));
        const color = i % 2 === 0 ? BRAND.cyan : BRAND.magenta;
        // sem filter:blur — pontinhos pequenos ficam ok crus (e o render voa).
        return (
          <div key={i} style={{
            position: 'absolute', left: x, top: y, width: size, height: size,
            borderRadius: '50%', background: color, opacity: twinkle,
          }} />
        );
      })}
    </AbsoluteFill>
  );
};

// Manchas de luz da marca. Usam radial-gradient (glow suave NATIVO, barato) no lugar
// de filter:blur() gigante — MESMO visual bokeh, mas SEM o custo de reblur por frame.
// Ganho grande de velocidade de render (era o gargalo no runner do Actions).
const glow = (color: string) => `radial-gradient(circle at center, ${color} 0%, transparent 66%)`;

// Textura de ruído (dither) ESTÁTICA p/ quebrar o banding 8-bit do gradiente
// escuro (relatado pelo dono: fundo "distorcido, sem qualidade" — amplificado
// pela compressão do YouTube). 1 tile SVG feTurbulence gerado UMA VEZ aqui
// (módulo, fora do componente) e repetido em mosaico via CSS background — SEM
// filter:blur() e SEM nada recalculado por frame (é uma textura 100% estática,
// mantém o custo de render igual a zero). Opacidade bem baixa: só suaviza a
// banda, não muda o visual da marca.
const NOISE_TILE = 200;
const NOISE_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='${NOISE_TILE}' height='${NOISE_TILE}'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`;
const NOISE_DATA_URI = `data:image/svg+xml;utf8,${encodeURIComponent(NOISE_SVG)}`;

// Base do fundo editorial: violeta profundo. NÃO é `BRAND.bg` (#0d1117, o preto do
// app) de propósito — o vídeo precisa de campo de cor, a interface não.
const EDITORIAL_BASE = '#1a1035';

/**
 * ETIQUETA DO TEMA (Onda 2, etapa 2) — o "carimbo" editorial que aparece em todas
 * as cenas e dá unidade ao vídeo, como a chave de estilo da skill Vox.
 *
 * O texto vem do PRÓPRIO roteiro (`script.term`) — nada de dado novo a inventar.
 * ⚠️ Temas editoriais/virais são FRASES, não termos curtos ("5 erros financeiros
 * que tiram R$ 800 do seu bolso todo mês" é um tema real de 30/07): sem corte, a
 * etiqueta atravessaria o quadro. Por isso o truncamento duro em 26 caracteres.
 */
export const EtiquetaTema: React.FC<{ tema?: string }> = ({ tema }) => {
  const frame = useCurrentFrame();
  const texto = String(tema || '').trim();
  if (!texto) return null;
  const curto = texto.length > 26 ? `${texto.slice(0, 26).trim()}…` : texto;
  // entra junto com a cena e fica: é identidade, não animação de destaque.
  const aparece = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <div style={{
      // top 138 (não 200): nas cenas de shot 'app' a moldura do celular começa por
      // volta de y=230 e passava POR CIMA da etiqueta, cortando o texto (visto no
      // frame 400 de 31/07). 138 fica entre a marca d'água (66-112) e o celular.
      position: 'absolute', top: 138, left: 70,
      background: BRAND.magenta, color: BRAND.text,
      fontFamily: BODY, fontWeight: 900, fontSize: 32, letterSpacing: 3,
      padding: '11px 24px', borderRadius: 8,
      transform: `rotate(-2.5deg) scale(${0.94 + aparece * 0.06})`,
      opacity: aparece,
      textTransform: 'uppercase',
      boxShadow: '0 10px 30px #00000055',
    }}>
      {curto}
    </div>
  );
};

/**
 * TRILHO DE PROGRESSO (Onda 2, etapa 4) — a faixa inferior da maquete P5.
 *
 * Ocupa a faixa morta de baixo (medida em 30/07: ~60% do quadro era vazio) e dá ao
 * espectador a noção de "quanto falta", que segura retenção. As marcas mostram as
 * viradas de cena, então o vídeo passa a ter uma estrutura VISÍVEL.
 *
 * Deliberadamente NÃO tem texto: o texto de apoio da maquete P5 exigiria um dado
 * que o roteiro não produz hoje — inventá-lo aqui seria escrever ficção na tela.
 * Essa decisão está aberta na etapa 5 (o cartão de resultado).
 */
export const TrilhoProgresso: React.FC<{ totalFrames: number; marcas: number[] }> = ({ totalFrames, marcas }) => {
  const frame = useCurrentFrame();
  const p = Math.min(1, Math.max(0, frame / Math.max(1, totalFrames)));
  return (
    <div style={{ position: 'absolute', top: 1430, left: 70, right: 70, height: 10 }}>
      <div style={{ position: 'absolute', inset: 0, background: '#0d111799', borderRadius: 6, border: `1px solid ${BRAND.text}1a` }} />
      <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: `${p * 100}%`, background: BRAND.gradient, borderRadius: 6 }} />
      {marcas.map((m, i) => {
        const x = (m / Math.max(1, totalFrames)) * 100;
        if (x <= 0 || x >= 100) return null;
        return (
          <div key={i} style={{ position: 'absolute', top: -4, left: `${x}%`, width: 3, height: 18, background: BRAND.text, opacity: 0.35, borderRadius: 2 }} />
        );
      })}
    </div>
  );
};

/**
 * CARTÃO DE RESULTADO (Onda 2, etapa 5) — a transformação que o vídeo conta,
 * visível o tempo todo em vez de passar 1,5s na abertura e sumir.
 *
 * FONTE DO DADO: `intro.counter` ({from, to, prefix}), que EXISTE em 9 de 9
 * roteiros reais (medido em 31/07). Nada é pedido à IA e nada é inventado —
 * decisão do dono entre 4 opções, justamente para não pôr na tela um número que
 * ninguém confere (REGRA 25 da IMPLEMENTACAO23: nada neste repo valida factos).
 *
 * GUARDA (a opção "C"): sem `prefix`, o par vira número solto e ambíguo — medido
 * no roteiro `aplicacao-financeira`, cujo counter é `0.5 → 8` (é porcentagem, mas
 * o campo de unidade veio vazio). Nesses casos o cartão simplesmente NÃO aparece.
 * Custo aceito: ~1 em 9 vídeos fica sem cartão; nenhum sai com número sem sentido.
 */
const compactoBR = (n: number): string => {
  if (!Number.isFinite(n)) return '';
  if (Math.abs(n) >= 1_000_000) {
    const mi = n / 1_000_000;
    // 3.200.000 → "3,2 mi"; 12.000.000 → "12 mi" (sem decimal inútil)
    return `${nfBR.format(Number(mi.toFixed(mi < 10 ? 1 : 0)))} mi`;
  }
  return nfBR.format(Math.round(n));
};

export const CartaoResultado: React.FC<{ counter?: { from: number; to: number; prefix?: string } }> = ({ counter }) => {
  const prefix = String(counter?.prefix ?? '').trim();
  const from = Number(counter?.from);
  const to = Number(counter?.to);
  // guarda: sem unidade, ou par inválido/degenerado → não desenha nada.
  if (!prefix || !Number.isFinite(from) || !Number.isFinite(to) || to <= from) return null;
  return (
    <div style={{
      position: 'absolute', top: 1310, left: 70, right: 70, height: 96,
      background: '#0d1117cc', borderRadius: 22, border: `2px solid ${BRAND.text}1f`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 26,
      fontFamily: DISPLAY, fontWeight: 900, letterSpacing: -1,
    }}>
      <span style={{ fontSize: 46, color: BRAND.sub }}>{prefix} {compactoBR(from)}</span>
      <span style={{ fontSize: 40, color: BRAND.cyan }}>→</span>
      <span style={{ fontSize: 58, color: BRAND.text }}>{prefix} {compactoBR(to)}</span>
    </div>
  );
};

export const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 40) * 40;
  const pulse = 0.16 + 0.05 * Math.sin(frame / 30);
  return (
    // FUNDO EDITORIAL (Onda 2, etapa 1 — IMPLEMENTACAO20 §16). Era `BRAND.bg`
    // (#0d1117) com 3 glows de opacidade 0,13-0,21: na prática, PRETO. Medido nos
    // frames de 30/07 — ~60% do quadro era espaço morto, e é a causa nº1 do vídeo
    // parecer "slide" (o diagnóstico do §16.2 falhou nisto por ter sido feito
    // lendo código, sem olhar um único frame).
    // Agora a base é um violeta profundo com FAIXA DIAGONAL e textura de pontos —
    // o campo de cor chapado da linguagem editorial. Tudo o que já existia (glows,
    // partículas, ruído) foi PRESERVADO por cima.
    <AbsoluteFill style={{ backgroundColor: EDITORIAL_BASE, overflow: 'hidden' }}>
      {/* faixa diagonal: divide o quadro em duas zonas de luz e mata o vazio */}
      <AbsoluteFill style={{
        background: `linear-gradient(160deg, transparent 0%, transparent 38%, ${BRAND.violet}40 38.2%, ${BRAND.violet}40 100%)`,
      }} />
      {/* textura de pontos: preenche sem competir com o conteúdo */}
      <AbsoluteFill style={{
        backgroundImage: `radial-gradient(${BRAND.text}12 2px, transparent 2px)`,
        backgroundSize: '34px 34px',
        opacity: 0.5,
      }} />
      <div style={{
        position: 'absolute', top: -180 + drift, left: -260, width: 1100, height: 1100,
        background: glow(BRAND.cyan), opacity: pulse + 0.05,
      }} />
      <div style={{
        position: 'absolute', bottom: -280 - drift, right: -320, width: 1240, height: 1240,
        background: glow(BRAND.magenta), opacity: pulse,
      }} />
      <div style={{
        position: 'absolute', top: '28%', left: '16%', width: 840, height: 840,
        background: glow(BRAND.violet), opacity: 0.13,
      }} />
      <Particles />
      <AbsoluteFill style={{
        backgroundImage: `url("${NOISE_DATA_URI}")`,
        backgroundRepeat: 'repeat',
        backgroundSize: `${NOISE_TILE}px ${NOISE_TILE}px`,
        opacity: 0.035,
        pointerEvents: 'none',
      }} />
    </AbsoluteFill>
  );
};

// Marca d'água: ÍCONE + wordmark (o ícone estava faltando antes)
export const Watermark: React.FC = () => {
  const frame = useCurrentFrame();
  const float = Math.sin(frame / 24) * 3;
  return (
    <div style={{
      position: 'absolute', top: 66, width: '100%',
      display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 14,
      transform: `translateY(${float}px)`,
    }}>
      <FinMooviIcon size={46} idSuffix="wm" />
      <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 40, letterSpacing: -0.5 }}>
        <span style={{ color: BRAND.text }}>Fin</span>
        <span style={gradientText}>Moovi</span>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ABERTURA DISRUPTIVA (#1): o número-choque SLAM na tela com boom + flash + shake,
// e a pergunta de curiosidade surge embaixo. Para o dedo do usuário nos 1,5s iniciais.
// ─────────────────────────────────────────────────────────────────────────────
export const ShockIntro: React.FC<{ big: string; sub: string }> = ({ big, sub }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const slam = spring({ frame, fps, config: { damping: 9, mass: 0.7 } });
  const scale = interpolate(slam, [0, 1], [2.6, 1]);
  const flash = interpolate(frame, [0, 2, 12], [1, 0.7, 0], { extrapolateRight: 'clamp' });
  const shake = frame < 10 ? Math.sin(frame * 3) * (1 - frame / 10) * 10 : 0;
  const subIn = spring({ frame: frame - 14, fps, config: { damping: 14 } });
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
      <Audio src={staticFile('sfx/boom.ogg')} volume={0.9} />
      <div style={{
        ...gradientText, fontFamily: DISPLAY, fontWeight: 900, fontSize: 132, lineHeight: 1,
        transform: `scale(${scale}) translateX(${shake}px)`, textAlign: 'center', padding: '0 40px',
        filter: 'drop-shadow(0 0 50px rgba(139,92,246,0.6))',
      }}>{big}</div>
      <div style={{
        marginTop: 34, fontFamily: BODY, fontWeight: 800, fontSize: 56, color: BRAND.text, textAlign: 'center',
        opacity: interpolate(subIn, [0, 1], [0, 1]), transform: `translateY(${interpolate(subIn, [0, 1], [24, 0])}px)`,
      }}>{sub}</div>
      <AbsoluteFill style={{ background: '#fff', opacity: flash, pointerEvents: 'none' }} />
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ABERTURA DINÂMICA v3 — frase com tipografia GIGANTE nas palavras de ênfase
// (marcadas com *asterisco*), ícones de curiosidade (interrogação + mind-blown)
// flutuando, e então um CONTADOR que sobe de `from` até `to` com a FONTE CRESCENDO
// junto do valor, terminando num soco/flash.
// COMPRIMIDA p/ 45f/1,5s (voz entra no ~seg 1, não no 4 — exigência do dono): as
// fases SOBREPÕEM em vez de se enfileirar. Frase entra em SOCO (springs curtos,
// todas as palavras de ênfase juntas, ~frames 0–10); ícones pipocam quase
// simultâneos (delays 0–5); contador rola RÁPIDO (~frames 14–40, ease-out, fonte
// crescendo); flash/punch final ~40–45. boom no frame 0 + whoosh sobreposto ao
// contador.
// ─────────────────────────────────────────────────────────────────────────────
type FraseToken = { text: string; emph: boolean };
function parseFrase(frase: string): FraseToken[] {
  const out: FraseToken[] = [];
  const re = /\*([^*]+)\*|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(frase))) {
    if (m[1] != null) {
      // grupo de ênfase: quebra em PALAVRAS (cada uma gigante) p/ poder quebrar
      // linha e nunca estourar a largura da tela num único span.
      for (const w of m[1].trim().split(/\s+/).filter(Boolean)) out.push({ text: w, emph: true });
    } else {
      out.push({ text: m[2], emph: false });
    }
  }
  return out;
}

export const DynamicIntro: React.FC<{
  frase: string;
  counter?: { from: number; to: number; prefix?: string };
  frames: number;
}> = ({ frase, counter, frames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tokens = parseFrase(frase);

  // Fases SOBREPOSTAS (45f/1,5s): frase (soco) + ícones ocupam 0–~14; o contador rola
  // por cima a partir de ~frame 14 (0,31×frames) até ~40. Nada é sequenciado à toa.
  const counterStart = counter ? Math.round(frames * 0.31) : frames + 1; // ~frame 14
  const hasCounter = !!counter && frame >= counterStart - 8;

  // slam inicial (boom) + flash de entrada e flash final (soco do contador).
  const slamFlash = interpolate(frame, [0, 2, 12], [0.9, 0.5, 0], { extrapolateRight: 'clamp' });
  const endFlash = counter ? interpolate(frame, [frames - 8, frames - 4, frames], [0, 0.6, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 0;

  // A frase sobe e diminui um pouco quando o contador entra (dá lugar ao número).
  const shift = counter
    ? interpolate(frame, [counterStart - 8, counterStart + 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : 0;
  const fraseScale = interpolate(shift, [0, 1], [1, 0.72]);
  const fraseY = interpolate(shift, [0, 1], [0, -260]);

  // Contador: valor sobe de from→to com aceleração; a FONTE cresce junto do valor.
  let counterEl: React.ReactNode = null;
  if (counter) {
    const cl = frame - counterStart;
    // Rolagem RÁPIDA com ease-OUT: já a meio-caminho no miolo da janela (frame ~20
    // = mid-roll com a fonte bem crescida), assentando antes do flash final.
    const p = interpolate(cl, [0, frames - counterStart - 6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
    const val = Math.round(counter.from + (counter.to - counter.from) * p);
    const size = interpolate(p, [0, 1], [96, 210]);
    const punch = interpolate(frame, [frames - 10, frames - 4, frames], [1, 1.12, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const glow = 30 + Math.sin(frame / 5) * 14;
    const appear = spring({ frame: cl, fps, config: { damping: 12, mass: 0.4, stiffness: 190 } });
    counterEl = (
      <div style={{
        opacity: interpolate(appear, [0, 1], [0, 1]),
        transform: `scale(${interpolate(appear, [0, 1], [0.6, 1]) * punch})`,
        ...gradientText, fontFamily: DISPLAY, fontWeight: 900, fontSize: size, lineHeight: 1.02,
        filter: `drop-shadow(0 0 ${glow}px rgba(139,92,246,0.55))`, textAlign: 'center',
      }}>
        {counter.prefix || ''}{nfBR.format(val)}
      </div>
    );
  }

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 40 }}>
      <Audio src={staticFile('sfx/boom.ogg')} volume={0.9} />
      {counter && (
        <Sequence from={counterStart - 6} durationInFrames={Math.round(fps * 1.5)}>
          <Audio src={staticFile(resolveShotSfx('whoosh'))} volume={0.55} />
        </Sequence>
      )}

      {/* ícones de curiosidade MULTICOLOR crescendo (somem quando o contador entra) */}
      {INTRO_CURIOSITY.map((c, i) => (
        <CuriosityIcon key={i} which={c.which} x={c.x} y={c.y} delay={c.delay} color={c.color} glow={c.glow} fadeAt={counterStart - 4} />
      ))}

      {/* frase com ênfase */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'baseline',
        gap: '10px 22px', width: 940, maxWidth: '92%', textAlign: 'center',
        transform: `translateY(${fraseY}px) scale(${fraseScale})`,
      }}>
        {tokens.map((tk, i) => {
          // SOCO: sem stagger (i*2) — a frase inteira crava junta, ~frames 0–10, com
          // spring curto/rígido (não é rush-cut, é murro). Overshoot leve nas ênfases.
          const s = spring({ frame, fps, config: { damping: 11, mass: 0.4, stiffness: 200 } });
          const sc = tk.emph ? interpolate(s, [0, 1], [1.35, 1]) : interpolate(s, [0, 1], [0.75, 1]);
          const y = interpolate(s, [0, 1], [26, 0]);
          return (
            <span key={i} style={{
              display: 'inline-block', transform: `scale(${sc}) translateY(${y}px)`,
              fontFamily: DISPLAY, fontWeight: 900, lineHeight: 1.05,
              fontSize: tk.emph ? 90 : 50,
              ...(tk.emph ? gradientText : { color: BRAND.text }),
              filter: tk.emph ? 'drop-shadow(0 0 34px rgba(139,92,246,0.5))' : undefined,
            }}>{tk.text}</span>
          );
        })}
      </div>

      {hasCounter && counterEl}

      <AbsoluteFill style={{ background: '#fff', opacity: Math.max(slamFlash, endFlash), pointerEvents: 'none' }} />
    </AbsoluteFill>
  );
};

// Ícone de curiosidade que CRESCE (do pequeno ao cheio, com spring) e flutua num
// canto da intro. `color` = cor viva sólida (intro multicolor "pra chamar a atenção");
// `glow` = cor do halo (drop-shadow) combinando com a cor do ícone.
const CuriosityIcon: React.FC<{ which: ShotIconKey; x: number; y: number; delay: number; color: string; glow: string; fadeAt?: number }> = ({ which, x, y, delay, color, glow, fadeAt }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: frame - delay, fps, config: { damping: 10, mass: 0.6, stiffness: 120 } });
  // COMEÇA PEQUENO (~0,2) e CRESCE até o tamanho cheio (leve overshoot p/ pop).
  const scale = interpolate(pop, [0, 1], [0.2, 1.12]);
  const float = Math.sin((frame - delay) / 7) * 12;
  const rot = Math.sin((frame - delay) / 11) * 8;
  const inOpacity = interpolate(frame - delay, [0, 5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const outOpacity = fadeAt != null ? interpolate(frame, [fadeAt, fadeAt + 10], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 1;
  const Comp = SHOT_ICONS[which];
  return (
    <div style={{
      position: 'absolute', left: x, top: y,
      transform: `translateY(${float}px) scale(${scale}) rotate(${rot}deg)`,
      opacity: Math.min(inOpacity, outOpacity),
      filter: `drop-shadow(0 8px 30px ${glow})`,
    }}>
      <Comp color={color} />
    </div>
  );
};

// Ícones de curiosidade da intro dinâmica: cada um numa COR VIVA DISTINTA. Na v3
// COMPRIMIDA (45f) eles PIPOCAM quase simultâneos (delays 0–5, não mais 4–36) —
// escalonamento só o suficiente pro pop, sem esperar. Espalhados nas faixas
// superior/inferior (fora do miolo onde entram a frase e o contador).
const INTRO_CURIOSITY: { which: ShotIconKey; x: number; y: number; delay: number; color: string; glow: string }[] = [
  { which: 'question', x: 120, y: 360, delay: 0, color: BRAND.cyan, glow: 'rgba(34,211,238,0.5)' },
  { which: 'mind', x: 780, y: 300, delay: 2, color: BRAND.magenta, glow: 'rgba(214,33,156,0.5)' },
  { which: 'question', x: 800, y: 1360, delay: 3, color: BRAND.yellow, glow: 'rgba(253,224,71,0.5)' },
  { which: 'mind', x: 110, y: 1300, delay: 4, color: BRAND.violet, glow: 'rgba(139,92,246,0.5)' },
  { which: 'question', x: 460, y: 1500, delay: 5, color: '#3fb950', glow: 'rgba(63,185,80,0.5)' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Casca de cena: Ken Burns contínuo no miolo (o visual central nunca fica vazio).
// ─────────────────────────────────────────────────────────────────────────────
type Scene = {
  role: string;
  narration: string;
  onScreenText?: string;
  cue?: string;
  visual?: { type: string; note?: string };
  shots?: Shot[];
  durationSec: number;
};

type SceneTiming = { audioFile?: string; durationSec?: number; words?: { word: string; start: number; end: number }[] };

const normSync = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

// Frame (local da cena) em que o VISUAL central deve SURGIR — sincronizado com a
// FALA. Prioridade: "cue" do roteiro (palavra-gatilho) → 1ª palavra de ênfase
// (número/R$/%) → 0. Assim o gráfico dos "25 anos" só entra quando a voz diz "25".
function revealFrameFor(scene: Scene, timing: SceneTiming | null | undefined, fps: number): number {
  const words = timing?.words;
  if (!words || !words.length) return 0;
  if (scene.cue) {
    const c = normSync(scene.cue);
    const w = words.find((x) => normSync(x.word) === c || (c.length >= 2 && normSync(x.word).includes(c)));
    if (w) return Math.max(0, Math.round(w.start * fps));
  }
  const emph = words.find((x) => /\d/.test(x.word) || /[%×]/.test(x.word) || /r\$/i.test(x.word));
  if (emph) return Math.max(0, Math.round(emph.start * fps));
  return 0;
}

const SceneShell: React.FC<{ scene: Scene; timing?: SceneTiming | null; children: React.ReactNode }> = ({ scene, timing, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationSec = timing?.durationSec ?? scene.durationSec;
  const totalFrames = Math.max(1, Math.round(durationSec * fps));
  // Ken Burns: leve zoom-in contínuo — nada fica parado (roda a cena inteira).
  const kb = interpolate(frame, [0, totalFrames], [1.0, 1.08], { extrapolateRight: 'clamp' });
  // Entrada no INÍCIO da cena → o centro NUNCA fica vazio.
  const enter = spring({ frame, fps, config: { damping: 16, mass: 0.6 } });
  const enterScale = interpolate(enter, [0, 1], [0.9, 1]);
  const enterY = interpolate(enter, [0, 1], [40, 0]);
  // O cue não ESCONDE mais o visual; ele dá um SOCO sincronizado (pulse + flash)
  // no instante em que a palavra é falada. Assim: sincronia + nunca vazio.
  const reveal = revealFrameFor(scene, timing, fps);
  const punch = reveal > 2 ? interpolate(frame, [reveal - 1, reveal + 4, reveal + 16], [1, 1.13, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 1;
  const flash = reveal > 2 ? interpolate(frame, [reveal, reveal + 3, reveal + 14], [0, 0.5, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 0;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', paddingBottom: 380, paddingLeft: 60, paddingRight: 60 }}>
        <div style={{
          transform: `scale(${kb * enterScale * punch}) translateY(${enterY}px)`, textAlign: 'center',
          filter: flash > 0 ? `drop-shadow(0 0 ${Math.round(flash * 50)}px ${BRAND.cyan})` : undefined,
        }}>
          {children}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// Camada de ÁUDIO + LEGENDA + ícones + SFX de UMA cena. Vai num trilho MESTRE
// (Sequence sequencial, sem a sobreposição de 8f das transições) para a legenda e o
// áudio NÃO empilharem com a cena vizinha no cruzamento. O visual segue com crossfade.
export const SceneAudioLayer: React.FC<{ scene: Scene; timing?: SceneTiming | null; shotSfxFires?: ShotSfxFire[] }> = ({ scene, timing, shotSfxFires }) => {
  const { fps } = useVideoConfig();
  const durationSec = timing?.durationSec ?? scene.durationSec;
  const totalFrames = Math.max(1, Math.round(durationSec * fps));
  const hasShots = !!(scene.shots && scene.shots.length);
  return (
    <AbsoluteFill>
      {timing?.audioFile && <Audio src={staticFile(timing.audioFile)} />}
      {/* SFX legado por PALAVRA-CHAVE (SceneSfx: iconFor/dinheiro→coin, crescer→whoosh
          etc.) — só para cenas SEM shots (v3.4). Em cenas COM shots, o ShotSfxTrack
          já é dono da trilha sonora (um som por âncora); manter o SceneSfx ligado aqui
          fazia CADA palavra-gatilho na narração (dinheiro/juro/cartão...) disparar um
          2º som SOBRE o sfx do shot — dobrando (às vezes triplicando) a repetição,
          mesmo com o validador limitando ≤3× por vídeo no roteiro (o SceneSfx dispara
          por PALAVRA, não por shot, e não é limitado pelo roteiro). Espelha exatamente
          o gate do IconBurst logo abaixo. */}
      {!hasShots && <SceneSfx narration={scene.narration} totalFrames={totalFrames} words={timing?.words} />}
      {hasShots ? <ShotSfxTrack fires={shotSfxFires ?? []} /> : null}
      {/* Cena COM shots: os shots são donos da coreografia visual (cada âncora tem
          seu ícone/visual). O IconBurst legado (gatilho por palavra-chave, top:300)
          fica DESLIGADO aqui — senão desenharia um 2º ícone SOBRE o do shot, às vezes
          o MESMO (as "duas setas" que o dono reclamou). Cenas legadas (sem shots)
          seguem com IconBurst. (requisito 5) */}
      {!hasShots && <IconBurst narration={scene.narration} totalFrames={totalFrames} words={timing?.words} />}
      <KaraokeCaption narration={scene.narration} totalFrames={totalFrames} words={timing?.words} />
    </AbsoluteFill>
  );
};

// Conta um número (0 → alvo) — usado nas cenas para dar dinamismo.
const useCountUp = (target: number, durationFrames = 40) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [0, durationFrames], [0, 1], { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  return Math.round(target * p);
};

// ─────────────────────────────────────────────────────────────────────────────
// Cenas por tipo de visual (motion graphics)
// ─────────────────────────────────────────────────────────────────────────────

const SceneNumber: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const glow = 24 + Math.sin(frame / 7) * 12;
  const float = Math.sin(frame / 20) * 8;
  return (
    <div style={{ transform: `translateY(${float}px)`, maxWidth: 980 }}>
      <div style={{ ...gradientText, fontFamily: DISPLAY, fontSize: 108, fontWeight: 900, lineHeight: 1.12, filter: `drop-shadow(0 0 ${glow}px rgba(139,92,246,0.55))` }}>
        {scene.onScreenText}
      </div>
    </div>
  );
};

// A curva exponencial só entra quando a FALA chega no cue (revealFrame, calculado
// pelo SceneRenderer com o mesmo revealFrameFor do SceneShell). Antes disso, só a
// régua (eixo + linha tracejada de referência) desenha devagar — o centro nunca
// fica vazio, mas o "resultado" (curva) só aparece com a voz. Depois de completa,
// mantém micro-vida (dot pulsando + glow respirando) pro resto da cena.
const SceneChart: React.FC<{ scene: Scene; revealFrame?: number; durationFrames?: number }> = ({ scene, revealFrame = 0, durationFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const W = 920, H = 560, pad = 44;
  const total = durationFrames ?? Math.max(1, Math.round(scene.durationSec * fps));

  // Início do desenho da curva: no cue, com clamp em 70% (cue tarde demais →
  // antecipa) para sempre sobrar espaço de desenho até o fim.
  const curveStart = Math.min(revealFrame, Math.round(total * 0.7));
  // Fim do desenho: ~90% da cena, com mínimo de 40 frames de janela.
  const curveEnd = Math.max(curveStart + 40, Math.round(total * 0.9));

  // Linha tracejada de referência: desenha devagar ANTES do cue (motion sutil
  // enquanto a curva ainda não entrou).
  const linProgress = curveStart > 4
    ? interpolate(frame, [0, curveStart], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : 1;
  // Curva exponencial: praticamente ausente antes do cue (stub de 2%), desenha
  // suave do cue até curveEnd com ease-out.
  const curveProgress = interpolate(frame, [curveStart, curveEnd], [0.02, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic),
  });

  const N = 40;
  const drawN = Math.max(0, Math.floor(curveProgress * N));
  const drawLinN = Math.max(0, Math.floor(linProgress * N));
  const exp: string[] = [], lin: string[] = [];
  for (let i = 0; i <= N; i++) {
    const x = pad + (i / N) * (W - pad * 2);
    const yExp = H - pad - Math.pow(i / N, 2.2) * (H - pad * 2);
    const yLin = H - pad - (i / N) * (H - pad * 2) * 0.55;
    if (i <= drawLinN) lin.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${yLin.toFixed(1)}`);
    if (i <= drawN) exp.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${yExp.toFixed(1)}`);
  }
  const hx = pad + (drawN / N) * (W - pad * 2);
  const hy = H - pad - Math.pow(drawN / N, 2.2) * (H - pad * 2);
  const pulse = 12 + Math.sin(frame / 5) * 4;
  // Depois de completa, a curva respira (glow sutil) pra nunca ler como "parada".
  const isComplete = frame >= curveEnd;
  const breathe = isComplete ? 0.5 + 0.5 * Math.sin((frame - curveEnd) / 14) : 0;
  const glowStd = 3 + breathe * 3;
  return (
    <div style={{ textAlign: 'center' }}>
      <svg width={W} height={H}>
        <defs>
          <linearGradient id="cg" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={BRAND.cyan} />
            <stop offset="50%" stopColor={BRAND.violet} />
            <stop offset="100%" stopColor={BRAND.magenta} />
          </linearGradient>
          {isComplete && (
            <filter id="chart-glow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation={glowStd} result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          )}
        </defs>
        <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke={BRAND.sub} strokeWidth={2} opacity={0.35} />
        <path d={lin.join(' ')} fill="none" stroke={BRAND.sub} strokeWidth={5} opacity={0.55} strokeDasharray="10 12" />
        <path d={exp.join(' ')} fill="none" stroke="url(#cg)" strokeWidth={10} strokeLinecap="round" filter={isComplete ? 'url(#chart-glow)' : undefined} />
        {drawN > 0 && <circle cx={hx} cy={hy} r={pulse} fill={BRAND.magenta} opacity={0.35} />}
        {drawN > 0 && <circle cx={hx} cy={hy} r={13} fill={BRAND.magenta} />}
      </svg>
      {scene.onScreenText && (
        <div style={{ ...gradientText, fontFamily: DISPLAY, fontSize: 60, fontWeight: 900, marginTop: 6 }}>{scene.onScreenText}</div>
      )}
    </div>
  );
};

const SceneFormula: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tokens = (scene.onScreenText || '').split(' ');
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 22, maxWidth: 940 }}>
      {tokens.map((tk, i) => {
        const s = spring({ frame, fps, delay: i * 5, config: { damping: 11, mass: 0.5 } });
        const scale = interpolate(s, [0, 1], [0.1, 1]);
        const rot = interpolate(s, [0, 1], [-12, 0]);
        const isOp = /^[÷×+=\-]$/.test(tk);
        return (
          <span key={i} style={{
            transform: `scale(${scale}) rotate(${rot}deg)`, fontFamily: DISPLAY, fontSize: 92, fontWeight: 900,
            ...(isOp ? { color: BRAND.sub } : gradientText),
          }}>{tk}</span>
        );
      })}
    </div>
  );
};

const SceneStatement: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 15 } });
  const w = interpolate(s, [0, 1], [0, 280]);
  const float = Math.sin(frame / 18) * 6;
  return (
    // Painel de contraste (Onda 2, etapa 3): a frase-soco é texto CLARO, e sobre o
    // fundo editorial violeta ela perdia definição. O painel escuro translúcido a
    // descola do fundo sem virar bloco de cor (esse fica só para os NÚMEROS, que
    // são o destaque — se tudo tivesse bloco, nada teria destaque).
    <div style={{
      transform: `translateY(${float}px)`, textAlign: 'center', maxWidth: 940,
      background: '#0d1117b3', borderRadius: 30, padding: '38px 44px 34px',
      border: `2px solid ${BRAND.text}14`,
    }}>
      <div style={{ color: BRAND.text, fontFamily: DISPLAY, fontSize: 82, fontWeight: 900, lineHeight: 1.12 }}>{scene.onScreenText}</div>
      <div style={{ height: 12, width: w, margin: '30px auto 0', borderRadius: 8, background: BRAND.gradient }} />
    </div>
  );
};

const SceneTitle: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 18 } });
  const scale = interpolate(s, [0, 1], [0.7, 1]);
  return (
    <div style={{ transform: `scale(${scale})`, ...gradientText, fontFamily: DISPLAY, fontSize: 104, fontWeight: 900, lineHeight: 1.08, maxWidth: 960 }}>
      {scene.onScreenText}
    </div>
  );
};

// CTA chamativa: título + linha "Link na descrição" + seta descendo animada.
const SceneCta: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 15 } });
  const scale = interpolate(s, [0, 1], [0.75, 1]);
  const bounce = Math.abs(Math.sin(frame / 9)) * 22;
  return (
    <div style={{ transform: `scale(${scale})`, textAlign: 'center' }}>
      <div style={{ fontFamily: DISPLAY, fontSize: 76, fontWeight: 900, ...gradientText, lineHeight: 1.1 }}>
        {scene.onScreenText}
      </div>
      <div style={{
        marginTop: 34, display: 'inline-flex', alignItems: 'center', gap: 16,
        padding: '18px 34px', borderRadius: 999, border: `3px solid ${BRAND.cyan}`,
        background: 'rgba(34,211,238,0.10)', fontFamily: BODY, fontWeight: 800, fontSize: 46, color: BRAND.text,
      }}>
        Link na descrição
      </div>
      <div style={{ marginTop: 20 + bounce, display: 'flex', justifyContent: 'center' }}>
        <svg width="90" height="90" viewBox="0 0 100 100" fill="none">
          <path d="M50 12 L50 74 M28 54 L50 78 L72 54" stroke="url(#cta-grad)" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
          <defs>
            <linearGradient id="cta-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={BRAND.cyan} />
              <stop offset="100%" stopColor={BRAND.magenta} />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
};

// Bordão oficial do canal (espelha BORDAO de schema-short.js) — statement de fecho.
const BORDAO_CANAL = 'Dinheiro sem controle é dinheiro dos outros.';

// OUTRO = fechamento HONESTO on-brand: reflexão forte (onScreenText) + o bordão
// do canal em gradiente + nudge sutil de inscrição (sino + @handle). NÃO promete
// vídeo específico — a fila de próximos temas é sorteada depois (rodízio de
// keywords, IMPLEMENTACAO23 Fase 4). O antigo card "PRÓXIMO ▶" (que renderizava
// nextVideoTitle, agora sempre "") e o texto "Te explico no próximo vídeo" foram
// removidos porque a promessa de tema específico virou mentira.
const SceneOutro: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 16 } });
  const rise = interpolate(s, [0, 1], [40, 0]);
  const opacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: 'clamp' });
  // O nudge de inscrição entra um pouco depois, com leve balanço do sino.
  const nudge = spring({ frame: Math.max(0, frame - 14), fps, config: { damping: 18 } });
  const nudgeScale = interpolate(nudge, [0, 1], [0.8, 1]);
  const bell = Math.sin(frame / 7) * 8;
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: DISPLAY, fontSize: 62, fontWeight: 900, color: BRAND.text, lineHeight: 1.15 }}>
        {scene.onScreenText}
      </div>
      {/* bordão do canal como statement de fecho (gradiente da marca) */}
      <div style={{
        marginTop: 28, transform: `translateY(${rise}px)`, opacity,
        fontFamily: DISPLAY, fontWeight: 900, fontSize: 46, lineHeight: 1.18,
        maxWidth: 900, marginLeft: 'auto', marginRight: 'auto', ...gradientText,
      }}>
        {BORDAO_CANAL}
      </div>
      {/* nudge sutil de inscrição — NÃO nomeia/prometa tema do próximo vídeo */}
      <div style={{
        marginTop: 44, transform: `scale(${nudgeScale})`, display: 'inline-flex', alignItems: 'center', gap: 16,
        padding: '16px 32px', borderRadius: 999, border: `3px solid ${BRAND.cyan}`,
        background: 'rgba(34,211,238,0.10)', fontFamily: BODY, fontWeight: 800, fontSize: 42, color: BRAND.text,
      }}>
        <svg width="46" height="46" viewBox="0 0 24 24" fill="none" style={{ transform: `rotate(${bell}deg)`, transformOrigin: '50% 20%' }}>
          <path d="M12 3a5 5 0 0 0-5 5v3.5c0 .8-.3 1.6-.9 2.2L5 15h14l-1.1-1.3c-.6-.6-.9-1.4-.9-2.2V8a5 5 0 0 0-5-5Z" fill={BRAND.cyan} />
          <path d="M10 18a2 2 0 0 0 4 0" stroke={BRAND.cyan} strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span>Inscreva-se</span>
        <span style={gradientText}>@FinMoovi</span>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ASSINATURA FINAL (brand sting TECH PREMIUM) ~2,5s — on-brand fintech escuro
// (owner: script font "não combina com o app"). Sequência: (1) a tela escurece
// (overlay suave); (2) os 3 PONTOS ASCENDENTES do ícone da marca acendem um a um
// (ciano→violeta→magenta), cada um com um 'ding' suave; (3) "FinMoovi" monta LETRA
// POR LETRA em Unbounded (fonte oficial); (4) uma VARREDURA de luz em gradiente
// (ciano→violeta→magenta) cruza o wordmark uma vez + sparkle. Segura e termina.
// ─────────────────────────────────────────────────────────────────────────────
const SIG_DOT_FRAMES = [12, 24, 36]; // frame em que cada ponto acende (staggered)
const SIG_DOTS = [
  { cx: 18, cy: 74, r: 11, color: BRAND.cyan },
  { cx: 50, cy: 46, r: 11, color: BRAND.violet },
  { cx: 82, cy: 22, r: 12, color: BRAND.magenta },
];
const SIG_WORD = 'FinMoovi';
const SIG_LETTERS_AT = 42; // início da montagem do wordmark

export const SignatureOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // (1) overlay escuro entra suave.
  const darken = interpolate(frame, [0, 16], [0, 0.9], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // (3) letras montam uma a uma (slide/fade nítido).
  const letters = Array.from(SIG_WORD);

  // (4) varredura de luz cruza o wordmark uma vez.
  const sweepP = interpolate(frame, [58, 74], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const sweepX = interpolate(sweepP, [0, 1], [-70, 170]); // % do container
  const sweepOn = sweepP > 0 && sweepP < 1;

  // linha ascendente conectando os pontos (desenha conforme os pontos acendem).
  const lineOffset = interpolate(frame, [SIG_DOT_FRAMES[0], SIG_DOT_FRAMES[2] + 6], [100, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const lineOpacity = interpolate(frame, [SIG_DOT_FRAMES[0], SIG_DOT_FRAMES[0] + 6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 40 }}>
      {/* overlay que escurece a cena/marca d'água por baixo (zIndex 0 → SEMPRE atrás
          do ícone/wordmark, que ficam em zIndex 1; senão o overlay absoluto pintaria
          por cima dos elementos estáticos e apagaria os pontos). */}
      <AbsoluteFill style={{ background: BRAND.bg, opacity: darken, zIndex: 0 }} />

      {/* dings dos 3 pontos (suaves) + sparkle na varredura */}
      {SIG_DOT_FRAMES.map((f, i) => (
        <Sequence key={i} from={f} durationInFrames={Math.round(fps * 0.6)}>
          <Audio src={staticFile('sfx/ding.ogg')} volume={0.3} />
        </Sequence>
      ))}
      <Sequence from={58} durationInFrames={Math.round(fps * 0.8)}>
        <Audio src={staticFile('sfx/sparkle.ogg')} volume={0.28} />
      </Sequence>

      {/* ícone da marca com os 3 pontos ascendentes acendendo um a um */}
      <svg width={280} height={280} viewBox="0 0 100 100" fill="none" style={{ position: 'relative', zIndex: 1 }}>
        <defs>
          <linearGradient id="sig-line" x1="0" y1="100" x2="100" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={BRAND.cyan} />
            <stop offset="50%" stopColor={BRAND.violet} />
            <stop offset="100%" stopColor={BRAND.magenta} />
          </linearGradient>
        </defs>
        <path
          d="M18 74 L50 46 L82 22" stroke="url(#sig-line)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"
          pathLength={100} strokeDasharray={100} strokeDashoffset={lineOffset} opacity={lineOpacity}
        />
        {SIG_DOTS.map((d, i) => {
          const appear = spring({ frame: frame - SIG_DOT_FRAMES[i], fps, config: { damping: 11, mass: 0.5, stiffness: 130 } });
          const s = interpolate(appear, [0, 1], [0, 1.15]);
          const rise = interpolate(appear, [0, 1], [16, 0]);
          const op = interpolate(frame - SIG_DOT_FRAMES[i], [0, 4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          // brilho no instante em que acende.
          const flareR = frame >= SIG_DOT_FRAMES[i] ? interpolate(frame - SIG_DOT_FRAMES[i], [0, 12], [d.r, d.r * 2.6], { extrapolateRight: 'clamp' }) : d.r;
          const flareOp = frame >= SIG_DOT_FRAMES[i] ? interpolate(frame - SIG_DOT_FRAMES[i], [0, 12], [0.5, 0], { extrapolateRight: 'clamp' }) : 0;
          return (
            <g key={i} transform={`translate(0 ${rise})`} opacity={op}>
              <circle cx={d.cx} cy={d.cy} r={flareR} fill={d.color} opacity={flareOp} />
              <circle cx={d.cx} cy={d.cy} r={d.r * s} fill={d.color} />
            </g>
          );
        })}
      </svg>

      {/* wordmark "FinMoovi" montando letra por letra + varredura de luz */}
      <div style={{ position: 'relative', zIndex: 1, overflow: 'hidden', padding: '6px 10px' }}>
        <div style={{ display: 'flex', fontFamily: DISPLAY, fontWeight: 900, fontSize: 108, letterSpacing: -1, lineHeight: 1 }}>
          {letters.map((ch, i) => {
            const appear = spring({ frame: frame - (SIG_LETTERS_AT + i * 2), fps, config: { damping: 16, mass: 0.5 } });
            const op = interpolate(appear, [0, 1], [0, 1]);
            const ty = interpolate(appear, [0, 1], [22, 0]);
            const isFin = i < 3; // "Fin" branco, "Moovi" gradiente
            return (
              <span key={i} style={{
                display: 'inline-block', opacity: op, transform: `translateY(${ty}px)`,
                ...(isFin ? { color: BRAND.text } : gradientText),
              }}>{ch}</span>
            );
          })}
        </div>
        {/* varredura de luz em gradiente da marca cruzando o wordmark uma vez */}
        {sweepOn && (
          <div style={{
            position: 'absolute', top: 0, bottom: 0, left: `${sweepX}%`, width: '32%',
            background: 'linear-gradient(100deg, transparent 0%, rgba(34,211,238,0.45) 35%, rgba(139,92,246,0.6) 50%, rgba(214,33,156,0.45) 65%, transparent 100%)',
            transform: 'skewX(-14deg)', mixBlendMode: 'screen', pointerEvents: 'none',
          }} />
        )}
      </div>
    </AbsoluteFill>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// MOTOR DE SHOTS (contract v3) — quando a cena traz `shots`, o miolo troca a cada
// palavra-âncora: cada shot COMEÇA no frame REAL da sua âncora (timing.json), com
// corte snappy (spring pop + leve slide). O 1º shot abre em 0 (miolo nunca vazio);
// os seguintes entram na sua âncora (sincronia semântica: "500" aparece quando a
// voz diz "500"). Sem timing.json → distribui as âncoras pela posição da palavra
// na narração. Preserva a cena de visual único (backward compat) intacta.
// ═════════════════════════════════════════════════════════════════════════════
const SHOT_MIN_GAP = 5; // frames mínimos entre shots (corte perceptível)

function findAnchorIndex(normWords: string[], anchor: string, from: number): number {
  const a = normSync(anchor || '');
  if (!a) return -1;
  for (let j = Math.max(0, from); j < normWords.length; j++) {
    const wn = normWords[j];
    if (wn === a || (a.length >= 2 && wn.includes(a)) || (wn.length >= 2 && a.includes(wn))) return j;
  }
  return -1;
}

// Frame inicial (local da cena) de cada shot.
function shotStartFrames(scene: Scene, timing: SceneTiming | null | undefined, fps: number, totalFrames: number): number[] {
  const shots = scene.shots || [];
  const n = shots.length;
  if (!n) return [];
  const words = timing?.words;
  const raw: number[] = new Array(n).fill(-1);

  if (words && words.length) {
    const normWords = words.map((w) => normSync(w.word));
    let searchFrom = 0;
    for (let i = 0; i < n; i++) {
      const idx = findAnchorIndex(normWords, shots[i].anchor, searchFrom);
      if (idx >= 0) { raw[i] = Math.round(words[idx].start * fps); searchFrom = idx + 1; }
    }
  } else {
    // Fallback sem timing: proporcional à posição da palavra na narração.
    const nw = (scene.narration || '').trim().split(/\s+/).filter(Boolean).map(normSync);
    let searchFrom = 0;
    for (let i = 0; i < n; i++) {
      const idx = findAnchorIndex(nw, shots[i].anchor, searchFrom);
      if (idx >= 0) { raw[i] = Math.round((idx / Math.max(1, nw.length)) * totalFrames); searchFrom = idx + 1; }
    }
  }

  // Âncoras não encontradas → palpite proporcional pelo índice do shot.
  for (let i = 0; i < n; i++) if (raw[i] < 0) raw[i] = Math.round((i / n) * totalFrames);

  // 1º shot abre a cena (miolo nunca vazio); depois: estritamente crescente c/ gap.
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    let v = i === 0 ? 0 : Math.max(raw[i], out[i - 1] + SHOT_MIN_GAP);
    v = Math.min(v, Math.max(0, totalFrames - 1));
    if (i > 0) v = Math.max(v, out[i - 1] + SHOT_MIN_GAP);
    out.push(v);
  }
  return aplicarPisoDeVida(out, shots, fps, totalFrames);
}

/**
 * PISO DE TEMPO DE TELA (31/07/2026) — conserto do "pisca e some".
 *
 * Cada shot entra na palavra-âncora e vive até o próximo. Quando a IA ancora um
 * shot numa das ÚLTIMAS palavras da cena, sobra migalha. Medido no roteiro real
 * `juros-compostos`: SEIS shots abaixo de 1,2s — `clique-link` 0,41s (o que o dono
 * viu no s42), `avalanche` 0,34s (o CLÍMAX do momento-história aprovado em julho,
 * piscando sem ninguém notar), ícones a 0,42s e 0,80s, frase final a 0,54s.
 *
 * Havia proteção para isto, mas SÓ para o shot `app` (piso de 2,5s, com erro duro
 * no validador — REGRA G). Os demais tipos não tinham piso nenhum.
 *
 * Correção aqui, no RENDER, e não no prompt: vale para todo roteiro já existente e
 * não depende de a IA acertar. O shot curto é ANTECIPADO (entra antes) em vez de
 * descartado — sumir com a chamada "link na descrição" seria pior que mostrá-la
 * cedo demais. Ele nunca é antecipado às custas do piso do shot anterior, e o
 * `app` mantém o seu piso de 2,5s, que é regra do dono.
 * Efeito colateral aceito: o shot anterior encurta um pouco (na CTA do fixture, o
 * `app` cai de ~4,5s para ~3,7s — acima do piso).
 */
const SHOT_MIN_LIFE_SEC = 1.2;
const APP_MIN_LIFE_SEC = 2.5; // espelha APP_FLOOR_SEC de schema-short.js
// A pílula "Link na descrição" é a CHAMADA PARA AÇÃO do vídeo — o único momento que
// pede um gesto do espectador. Com o piso comum (1,2s) ela ainda ficava menos tempo
// no ar que ícones decorativos da cena seguinte, o que o dono apontou em 31/07 como
// inversão de prioridade. Ganha piso próprio, o maior depois do `app`.
const CLIQUE_MIN_LIFE_SEC = 2.2;

const pisoDe = (shot: Shot | undefined, fps: number): number => {
  const v = shot?.visual;
  if (v?.type === 'app') return Math.round(APP_MIN_LIFE_SEC * fps);
  if (v?.type === 'metaphor' && v.metaphor === 'clique-link') return Math.round(CLIQUE_MIN_LIFE_SEC * fps);
  return Math.round(SHOT_MIN_LIFE_SEC * fps);
};

function aplicarPisoDeVida(starts: number[], shots: Shot[], fps: number, totalFrames: number): number[] {
  const out = [...starts];
  // de trás para frente: o aperto nasce no fim da cena e propaga em cascata.
  for (let i = out.length - 1; i >= 1; i--) {
    const fim = i === out.length - 1 ? totalFrames : out[i + 1];
    const piso = pisoDe(shots[i], fps);
    if (fim - out[i] >= piso) continue;
    const limite = out[i - 1] + Math.max(SHOT_MIN_GAP, pisoDe(shots[i - 1], fps));
    const alvo = fim - piso;
    // nunca abaixo de `limite`: o anterior tem direito ao piso dele.
    out[i] = Math.max(limite, Math.min(out[i], alvo));
  }
  return out;
}

// Cena-pseudo para reaproveitar SceneStatement/SceneFormula/SceneChart dentro do shot.
const pseudoScene = (base: Scene, text?: string): Scene => ({
  role: base.role, narration: base.narration, visual: base.visual,
  durationSec: base.durationSec, onScreenText: text,
});

// ── Visuais de shot (vida = duração do shot) ─────────────────────────────────
/**
 * BLOCO DE COR do número (Onda 2, etapa 3). Antes o número era texto em GRADIENTE
 * (ciano→violeta→magenta) sobre fundo quase-preto. Com o fundo editorial violeta
 * (etapa 1) o miolo violeta do gradiente passou a sumir contra o fundo — medido no
 * frame 250 de 31/07, a palavra "mês" quase desaparecia.
 * Solução (a mesma da maquete P4 aprovada): bloco de cor SÓLIDO com texto escuro.
 * Ganha contraste máximo e é a assinatura editorial da linguagem nova.
 * O bloco é o background do PRÓPRIO texto — acompanha "R$ 500" ou "R$ 3,2 milhões"
 * sem largura fixa, obrigatório num pipeline onde o texto muda todo dia.
 */
/**
 * Corpo que CEDE ao conteúdo, para o bloco caber sempre numa linha só.
 * Sem isto o texto quebrava e, com `box-decoration-break: clone`, virava dois
 * retângulos de larguras diferentes empilhados — um degrau (visto no frame 250 de
 * 31/07). Uma peça só é o que a linguagem editorial pede.
 * Unbounded 900 mede ~0,62×corpo por caractere; 880px é a largura útil entre as
 * margens do palco de shots. Teto 148 (o corpo antigo), piso 68 para nunca sumir.
 */
const LARGURA_UTIL = 800; // 800 + padding (64) deixa ~100px de respiro nas bordas
const corpoQueCabe = (texto: string, teto = 148) =>
  Math.max(68, Math.min(teto, Math.floor(LARGURA_UTIL / Math.max(1, texto.length * 0.62))));

// Bloco de cor sólido: o destaque editorial dos NÚMEROS (ver comentário acima).
const BlocoNumero: React.FC<{ texto: string; fontSize: number }> = ({ texto, fontSize }) => (
  <div style={{ fontFamily: DISPLAY, fontSize, fontWeight: 900, lineHeight: 1.18, letterSpacing: -2, whiteSpace: 'nowrap' }}>
    <span style={{
      background: BRAND.cyan, color: '#0d1117',
      padding: '10px 32px 18px', borderRadius: 18,
      boxShadow: `0 18px 50px ${BRAND.cyan}33`,
    }}>
      {texto}
    </span>
  </div>
);

const ShotNumber: React.FC<{ text?: string }> = ({ text }) => {
  const t = String(text ?? '');
  // Corrige de passagem um defeito PRÉ-EXISTENTE (visível no frame 8s de 30/07):
  // "R$ 500 /" a 148px fixos encostava na borda direita.
  return <BlocoNumero texto={t} fontSize={corpoQueCabe(t)} />;
};

const ShotCounter: React.FC<{ from?: number; to?: number; prefix?: string; life: number }> = ({ from = 0, to = 0, prefix = '', life }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [0, Math.max(1, life - 4)], [0, 1], { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  const val = Math.round(from + (to - from) * p);
  const texto = `${prefix}${nfBR.format(val)}`;
  // O contador CRESCE enquanto conta (era 112→168). O teto agora é o corpo que
  // CABE no VALOR FINAL — não no valor corrente: senão o bloco encolheria a cada
  // dígito novo (500 → 3.200.000) e pularia de tamanho no meio da contagem.
  const tetoFinal = corpoQueCabe(`${prefix}${nfBR.format(to)}`, 156);
  const base = interpolate(p, [0, 1], [Math.min(104, tetoFinal), tetoFinal]);
  return <BlocoNumero texto={texto} fontSize={base} />;
};

const ShotIcon: React.FC<{ icon?: ShotIconKey }> = ({ icon }) => {
  const frame = useCurrentFrame();
  const float = Math.sin(frame / 8) * 12;
  const Comp = SHOT_ICONS[icon || 'money'] || SHOT_ICONS.money;
  // Ícones de shot MUITO MAIORES (owner: "muito pequenos"): ~1,7× o tamanho antigo
  // (2,2 → 3,8). O SVG-base é 150px → ~570px na tela, centrado no miolo: livre da
  // marca d'água (topo ~66) e da faixa de legenda (bottom:300).
  return (
    <div style={{ transform: `translateY(${float}px) scale(3.8)`, filter: 'drop-shadow(0 12px 44px rgba(139,92,246,0.5))' }}>
      <Comp />
    </div>
  );
};

// ── Metáforas animadas (SVG nativo, literais) ────────────────────────────────
// bola-neve: bola desce a ladeira crescendo e derruba blocos no fim.
const MetaSnowball: React.FC<{ life: number }> = ({ life }) => {
  const frame = useCurrentFrame();
  const W = 900, H = 520;
  const p = interpolate(frame, [0, life], [0, 1], { extrapolateRight: 'clamp', easing: Easing.in(Easing.quad) });
  const x0 = 110, x1 = 720, y0 = 130, y1 = 380;
  const cx = x0 + (x1 - x0) * p, cy = y0 + (y1 - y0) * p;
  const r = 20 + p * 74;
  const blocks = [{ bx: 748, by: 392 }, { bx: 792, by: 392 }, { bx: 770, by: 356 }];
  return (
    <svg width={W} height={H}>
      <line x1={60} y1={110} x2={820} y2={400} stroke={BRAND.sub} strokeWidth={10} opacity={0.5} strokeLinecap="round" />
      {blocks.map((b, i) => {
        const kp = interpolate(frame, [life * 0.78, life], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        const tx = kp * (46 + i * 22), ty = -kp * (110 + i * 20), rr = kp * (200 + i * 90);
        return <rect key={i} x={b.bx} y={b.by} width={30} height={30} rx={6} fill={i % 2 ? BRAND.violet : BRAND.magenta} transform={`translate(${tx} ${ty}) rotate(${rr} ${b.bx + 15} ${b.by + 15})`} />;
      })}
      <circle cx={cx} cy={cy} r={r} fill="#eaf6ff" stroke={BRAND.cyan} strokeWidth={4} />
      <circle cx={cx - r * 0.3} cy={cy - r * 0.32} r={r * 0.26} fill="#ffffff" opacity={0.85} />
      <circle cx={cx + r * 0.25} cy={cy + r * 0.2} r={r * 0.14} fill={BRAND.cyan} opacity={0.5} />
    </svg>
  );
};

// avalanche: rajada de partículas de neve caindo do topo + tremor de tela.
const MetaAvalanche: React.FC<{ life: number }> = ({ life }) => {
  const frame = useCurrentFrame();
  const W = 900, H = 560;
  const shake = Math.sin(frame * 2.3) * interpolate(frame, [0, life], [18, 3], { extrapolateRight: 'clamp' });
  const flakes = new Array(64).fill(0);
  return (
    <div style={{ transform: `translateX(${shake}px)` }}>
      <svg width={W} height={H}>
        {flakes.map((_, i) => {
          const x = random('ax' + i) * W;
          const speed = 0.6 + random('as' + i) * 1.7;
          const size = 4 + random('az' + i) * 11;
          const y = (((frame * speed * 15) + random('ao' + i) * H) % (H + 80)) - 40;
          const op = 0.45 + 0.5 * random('aq' + i);
          return <circle key={i} cx={x} cy={y} r={size} fill={i % 3 ? '#eaf6ff' : BRAND.cyan} opacity={op} />;
        })}
      </svg>
    </div>
  );
};

// escorregão: figura escorrega (casca de banana), pernas pro alto, cai e quica.
const MetaSlip: React.FC<{ life: number }> = ({ life }) => {
  const frame = useCurrentFrame();
  const tilt = interpolate(frame, [0, life * 0.25, life * 0.5], [0, -14, -98], { extrapolateRight: 'clamp' });
  const fallY = interpolate(frame, [life * 0.35, life * 0.62], [0, 150], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const bounce = frame > life * 0.62 ? Math.abs(Math.sin((frame - life * 0.62) / 5)) * Math.max(0, 34 - (frame - life * 0.62)) : 0;
  return (
    <svg width={700} height={560}>
      <defs>
        <linearGradient id="slip-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={BRAND.cyan} />
          <stop offset="100%" stopColor={BRAND.magenta} />
        </linearGradient>
      </defs>
      <line x1={80} y1={452} x2={620} y2={452} stroke={BRAND.sub} strokeWidth={8} opacity={0.4} strokeLinecap="round" />
      <path d="M300 442 q34 -22 66 -4 q-12 18 -38 15 q-20 -3 -28 -11 Z" fill={BRAND.yellow} stroke="#b59b00" strokeWidth={3} />
      <g transform={`translate(0 ${fallY - bounce}) rotate(${tilt} 360 448)`}>
        <circle cx={360} cy={252} r={34} fill="none" stroke="url(#slip-g)" strokeWidth={8} />
        <line x1={360} y1={286} x2={360} y2={382} stroke="url(#slip-g)" strokeWidth={11} strokeLinecap="round" />
        <line x1={360} y1={312} x2={306} y2={278} stroke="url(#slip-g)" strokeWidth={9} strokeLinecap="round" />
        <line x1={360} y1={312} x2={420} y2={286} stroke="url(#slip-g)" strokeWidth={9} strokeLinecap="round" />
        <line x1={360} y1={382} x2={316} y2={430} stroke="url(#slip-g)" strokeWidth={10} strokeLinecap="round" />
        <line x1={360} y1={382} x2={404} y2={430} stroke="url(#slip-g)" strokeWidth={10} strokeLinecap="round" />
      </g>
    </svg>
  );
};

// Fração da VIDA do shot em que a mãozinha PRESSIONA o link (após viajar até ele).
// Fonte ÚNICA da verdade: o VISUAL (MetaClickLink) e o SFX (ShotSfxTrack) usam a
// MESMA fórmula → o som 'click' toca EXATAMENTE no frame do toque. Ver requisito 4.
const CLICK_PRESS_FRAC = 0.58;
export const clickPressOffset = (life: number) => Math.round(life * CLICK_PRESS_FRAC);

// Fração da VIDA do shot em que a BOLHA (metáfora 'bolha') ESTOURA. Mesma ideia do
// clickPressOffset: fonte ÚNICA da verdade para o VISUAL (MetaBubble) e o SFX
// ('pop', agendado no ShotSfxTrack pela MESMA fórmula) → o som toca no frame do POP.
const BUBBLE_POP_FRAC = 0.72;
export const bubblePopOffset = (life: number) => Math.round(life * BUBBLE_POP_FRAC);

// metáfora 'clique-link': uma mãozinha (cursor 👆 em SVG nativo, cores da marca)
// viaja numa curva até a pílula "Link na descrição", PRESSIONA (pílula afunda +
// flash) no frame do 'click'. O som é agendado no MESMO frame (ver ShotSfxTrack).
const MetaClickLink: React.FC<{ life: number }> = ({ life }) => {
  const frame = useCurrentFrame();
  const W = 900, H = 520;
  const press = clickPressOffset(life);
  // Viagem da mão até o link (ease-out); depois: pressiona e segura.
  const travel = interpolate(frame, [0, press], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  // Curva quadrática (Bézier) do canto até o ponto de clique na pílula.
  const P0 = { x: 780, y: 470 }, P1 = { x: 790, y: 210 }, P2 = { x: 470, y: 250 };
  const t = travel, mt = 1 - t;
  const hx = mt * mt * P0.x + 2 * mt * t * P1.x + t * t * P2.x;
  const hy = mt * mt * P0.y + 2 * mt * t * P1.y + t * t * P2.y;
  // "Toque": leve mergulho da mão no instante do clique (dip curto e volta).
  const dip = frame >= press ? interpolate(frame, [press, press + 3, press + 9], [0, 14, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 0;
  // Pílula afunda (scale/translate) + brilho no clique; depois assenta.
  const pressed = interpolate(frame, [press, press + 2, press + 10], [0, 1, 0.25], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const pillScale = 1 - pressed * 0.06;
  const pillY = pressed * 6;
  const pillGlow = pressed;
  // Flash/anel expandindo do ponto de clique.
  const ringP = frame >= press ? interpolate(frame, [press, press + 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 0;
  const ringR = ringP * 120;
  const ringOp = ringP > 0 ? interpolate(ringP, [0, 1], [0.6, 0]) : 0;
  const flash = frame >= press ? interpolate(frame, [press, press + 2, press + 10], [0, 0.5, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 0;
  return (
    <div style={{ position: 'relative', width: W, height: H }}>
      {/* pílula "Link na descrição" (mesmo estilo da CTA) */}
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 168, display: 'flex', justifyContent: 'center',
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 16,
          padding: '20px 40px', borderRadius: 999, border: `3px solid ${BRAND.cyan}`,
          background: `rgba(34,211,238,${0.10 + pillGlow * 0.22})`,
          fontFamily: BODY, fontWeight: 800, fontSize: 46, color: BRAND.text,
          transform: `translateY(${pillY}px) scale(${pillScale})`,
          boxShadow: pillGlow > 0 ? `0 0 ${Math.round(pillGlow * 46)}px rgba(34,211,238,${pillGlow * 0.7})` : '0 8px 30px rgba(0,0,0,0.35)',
        }}>
          <FinMooviIcon size={44} idSuffix="clk" />
          Link na descrição
        </div>
      </div>
      {/* anel de clique + mãozinha */}
      <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}>
        <defs>
          <linearGradient id="hand-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={BRAND.cyan} />
            <stop offset="100%" stopColor={BRAND.violet} />
          </linearGradient>
        </defs>
        {ringP > 0 && ringP < 1 && (
          <circle cx={470} cy={232} r={ringR} fill="none" stroke={BRAND.cyan} strokeWidth={5} opacity={ringOp} />
        )}
        {/* cursor de mão apontando (fingertip ~ (30,8) no grupo local) */}
        <g transform={`translate(${hx - 30} ${hy - 8 + dip})`}>
          <path
            d="M24 6 a8 8 0 0 1 16 0 v34 l12 3 a12 12 0 0 1 9 11 v14 a16 16 0 0 1 -16 16 h-18 a16 16 0 0 1 -13 -7 l-14 -20 a7 7 0 0 1 10 -9 l6 6 v-58 a8 8 0 0 1 8 -8 Z"
            fill={BRAND.panel} stroke="url(#hand-g)" strokeWidth={5} strokeLinejoin="round" strokeLinecap="round"
          />
        </g>
      </svg>
      {/* Flash do clique. ERA um AbsoluteFill BRANCO CHAPADO: como este container
          mede 900x520 (nao a tela), o flash desenhava um RETANGULO claro de bordas
          retas no instante do toque — o "quadrado estranho" que o dono viu em 31/07.
          Agora e um brilho RADIAL centrado no ponto do clique, que desvanece antes
          de chegar as bordas: nao existe mais aresta para aparecer. */}
      <AbsoluteFill style={{
        background: `radial-gradient(circle 260px at 470px 232px, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.35) 38%, rgba(255,255,255,0) 72%)`,
        opacity: flash,
        pointerEvents: 'none',
      }} />
    </div>
  );
};

// ── Metáforas NOVAS (v3.5) — mesma linguagem SVG nativa da marca, vida = shot ─────
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

// foguete: pequeno foguete acende e SOBE íngreme, com rastro brilhante (crescimento/
// decolagem). Acelera (ease-in) do canto inferior-esquerdo ao topo-direito. Casa com 'whoosh'.
const MetaRocket: React.FC<{ life: number }> = ({ life }) => {
  const frame = useCurrentFrame();
  const W = 720, H = 560;
  const p = interpolate(frame, [0, life], [0, 1], { extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic) });
  const x0 = 150, y0 = 480, x1 = 560, y1 = 70;
  const cx = x0 + (x1 - x0) * p, cy = y0 + (y1 - y0) * p;
  const trail = new Array(14).fill(0);
  const flick = 0.6 + 0.4 * Math.sin(frame * 0.9); // chama tremulando
  return (
    <svg width={W} height={H}>
      <defs>
        <linearGradient id="rkt-g" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor={BRAND.cyan} />
          <stop offset="50%" stopColor={BRAND.violet} />
          <stop offset="100%" stopColor={BRAND.magenta} />
        </linearGradient>
      </defs>
      {/* rastro brilhante do trajeto já percorrido (esmaece pra trás) */}
      {trail.map((_, i) => {
        const tp = Math.max(0, p - (i + 1) * 0.05);
        const tx = x0 + (x1 - x0) * tp, ty = y0 + (y1 - y0) * tp;
        const op = p > 0.02 ? (1 - i / trail.length) * 0.5 : 0;
        return <circle key={i} cx={tx} cy={ty} r={Math.max(2, 16 - i * 0.9)} fill="url(#rkt-g)" opacity={op} />;
      })}
      {/* foguete (nariz apontando pro trajeto, ~45°) */}
      <g transform={`translate(${cx} ${cy}) rotate(45)`}>
        <path d={`M-8 20 Q0 ${20 + 34 * flick} 8 20 Q0 30 -8 20 Z`} fill={BRAND.yellow} opacity={0.9} />
        <path d={`M-5 20 Q0 ${20 + 20 * flick} 5 20 Q0 26 -5 20 Z`} fill={BRAND.magenta} />
        <path d="M-10 20 L-22 30 L-10 6 Z" fill="url(#rkt-g)" />
        <path d="M10 20 L22 30 L10 6 Z" fill="url(#rkt-g)" />
        <path d="M0 -34 C14 -14 14 6 10 20 L-10 20 C-14 6 -14 -14 0 -34 Z" fill={BRAND.panel} stroke="url(#rkt-g)" strokeWidth={5} strokeLinejoin="round" />
        <circle cx={0} cy={-8} r={7} fill={BRAND.cyan} />
      </g>
    </svg>
  );
};

// semente: a semente CAI, BROTA e cresce numa arvorezinha ao longo do shot
// (paciência/longo prazo). Casa com 'sparkle'.
const MetaSeed: React.FC<{ life: number }> = ({ life }) => {
  const frame = useCurrentFrame();
  const W = 700, H = 560, ground = 470, cx = W / 2;
  const drop = interpolate(frame, [0, life * 0.18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const seedY = 150 + (ground - 150) * drop;
  const sprout = interpolate(frame, [life * 0.18, life * 0.5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const grow = interpolate(frame, [life * 0.5, life * 0.95], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const trunkH = 40 + grow * 150;
  const canopyR = grow * 92;
  const sway = Math.sin(frame / 14) * 3 * grow;
  return (
    <svg width={W} height={H}>
      <defs>
        <linearGradient id="seed-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={BRAND.cyan} />
          <stop offset="100%" stopColor={BRAND.violet} />
        </linearGradient>
      </defs>
      <line x1={90} y1={ground} x2={610} y2={ground} stroke={BRAND.sub} strokeWidth={8} opacity={0.4} strokeLinecap="round" />
      {/* semente caindo (some quando o broto começa) */}
      {sprout < 0.02 && <ellipse cx={cx} cy={seedY} rx={12} ry={16} fill={BRAND.yellow} stroke="#b59b00" strokeWidth={3} />}
      {/* broto: caule + 2 folhas, crescendo do zero */}
      {sprout > 0 && grow < 0.02 && (
        <g transform={`translate(${cx} ${ground}) scale(${sprout})`}>
          <line x1={0} y1={0} x2={0} y2={-48} stroke="url(#seed-g)" strokeWidth={8} strokeLinecap="round" />
          <ellipse cx={-16} cy={-36} rx={16} ry={9} fill={BRAND.cyan} opacity={0.9} transform="rotate(-30 -16 -36)" />
          <ellipse cx={16} cy={-42} rx={16} ry={9} fill={BRAND.violet} opacity={0.9} transform="rotate(30 16 -42)" />
        </g>
      )}
      {/* árvore crescendo (tronco + copa em camadas) */}
      {grow > 0 && (
        <g transform={`translate(${cx} ${ground}) rotate(${sway})`}>
          <rect x={-9} y={-trunkH} width={18} height={trunkH} rx={7} fill="url(#seed-g)" />
          <circle cx={0} cy={-trunkH} r={canopyR} fill={BRAND.violet} opacity={0.28} />
          <circle cx={-canopyR * 0.5} cy={-trunkH + 10} r={canopyR * 0.6} fill={BRAND.cyan} opacity={0.35} />
          <circle cx={canopyR * 0.5} cy={-trunkH + 10} r={canopyR * 0.6} fill={BRAND.magenta} opacity={0.3} />
          <circle cx={0} cy={-trunkH - canopyR * 0.4} r={canopyR * 0.55} fill={BRAND.cyan} opacity={0.3} />
        </g>
      )}
    </svg>
  );
};

// montanha-russa: um trilho com subidas e descidas e um carrinho percorrendo os
// altos e baixos (volatilidade — ideal p/ ações). Casa com 'whoosh'.
const MetaRollercoaster: React.FC<{ life: number }> = ({ life }) => {
  const frame = useCurrentFrame();
  const W = 900, H = 520;
  const p = interpolate(frame, [0, life], [0, 1], { extrapolateRight: 'clamp' });
  const x0 = 70, x1 = 830;
  const yAt = (t: number) => 300 - Math.sin(t * Math.PI * 2.2) * 130 - Math.sin(t * Math.PI * 4.5 + 0.6) * 45;
  const N = 60;
  const pts: string[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    pts.push(`${i === 0 ? 'M' : 'L'}${(x0 + (x1 - x0) * t).toFixed(1)},${yAt(t).toFixed(1)}`);
  }
  const cxp = x0 + (x1 - x0) * p, cyp = yAt(p);
  const dt = 0.01, ahead = clamp01(p + dt), behind = clamp01(p - dt);
  const ang = Math.atan2(yAt(ahead) - yAt(behind), (x1 - x0) * (ahead - behind)) * 180 / Math.PI;
  return (
    <svg width={W} height={H}>
      <defs>
        <linearGradient id="rc-g" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={BRAND.cyan} />
          <stop offset="50%" stopColor={BRAND.violet} />
          <stop offset="100%" stopColor={BRAND.magenta} />
        </linearGradient>
      </defs>
      <path d={pts.join(' ')} fill="none" stroke="url(#rc-g)" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
      <g transform={`translate(${cxp} ${cyp}) rotate(${ang})`}>
        <rect x={-26} y={-34} width={52} height={26} rx={7} fill={BRAND.panel} stroke="url(#rc-g)" strokeWidth={4} />
        <circle cx={-14} cy={-4} r={8} fill={BRAND.magenta} />
        <circle cx={14} cy={-4} r={8} fill={BRAND.cyan} />
      </g>
    </svg>
  );
};

// bolha: um balão/bolha INFLA progressivamente e ESTOURA no fim, com partículas
// (bolha/expectativa). O som 'pop' é agendado no frame do estouro (bubblePopOffset).
const MetaBubble: React.FC<{ life: number }> = ({ life }) => {
  const frame = useCurrentFrame();
  const W = 700, H = 560, cx = W / 2, cy = 270;
  const pop = bubblePopOffset(life);
  const inflate = interpolate(frame, [0, pop], [30, 175], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.quad) });
  const wobble = Math.sin(frame / 6) * 4 * interpolate(frame, [0, pop], [0.2, 1], { extrapolateRight: 'clamp' });
  const popped = frame >= pop;
  const r = inflate + wobble;
  const shards = new Array(16).fill(0);
  const burst = popped ? interpolate(frame, [pop, pop + 16], [0, 1], { extrapolateRight: 'clamp' }) : 0;
  return (
    <svg width={W} height={H}>
      <defs>
        <radialGradient id="bub-g" cx="38%" cy="34%" r="70%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="30%" stopColor={BRAND.cyan} stopOpacity="0.5" />
          <stop offset="100%" stopColor={BRAND.violet} stopOpacity="0.35" />
        </radialGradient>
      </defs>
      {!popped && (
        <g>
          <circle cx={cx} cy={cy} r={r} fill="url(#bub-g)" stroke={BRAND.cyan} strokeWidth={4} />
          <ellipse cx={cx - r * 0.34} cy={cy - r * 0.4} rx={r * 0.18} ry={r * 0.1} fill="#ffffff" opacity={0.85} transform={`rotate(-32 ${cx - r * 0.34} ${cy - r * 0.4})`} />
        </g>
      )}
      {popped && shards.map((_, i) => {
        const a = (i / shards.length) * Math.PI * 2;
        const dist = burst * (120 + (i % 3) * 40);
        return <circle key={i} cx={cx + Math.cos(a) * dist} cy={cy + Math.sin(a) * dist} r={Math.max(1, 9 - burst * 6)} fill={i % 2 ? BRAND.cyan : BRAND.magenta} opacity={1 - burst} />;
      })}
      {popped && burst < 1 && (
        <circle cx={cx} cy={cy} r={r * (1 + burst)} fill="none" stroke={BRAND.cyan} strokeWidth={4} opacity={(1 - burst) * 0.6} />
      )}
    </svg>
  );
};

// ralo: moedas escorregam/espiralam ralo abaixo e somem (dinheiro escorrendo/taxas).
// Casa com 'slide' ou 'thud'.
const MetaDrain: React.FC<{ life: number }> = ({ life }) => {
  const frame = useCurrentFrame();
  const W = 700, H = 560, cx = W / 2, drainY = 430;
  const coins = [0, 1, 2, 3, 4];
  return (
    <svg width={W} height={H}>
      <defs>
        <linearGradient id="drn-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={BRAND.violet} />
          <stop offset="100%" stopColor={BRAND.magenta} />
        </linearGradient>
      </defs>
      {/* ralo/funil: elipses concêntricas + boca escura */}
      <ellipse cx={cx} cy={drainY} rx={130} ry={46} fill="none" stroke={BRAND.sub} strokeWidth={6} opacity={0.5} />
      <ellipse cx={cx} cy={drainY} rx={92} ry={32} fill="none" stroke={BRAND.sub} strokeWidth={5} opacity={0.4} />
      <ellipse cx={cx} cy={drainY} rx={54} ry={19} fill="#05070a" stroke="url(#drn-g)" strokeWidth={5} />
      {coins.map((i) => {
        const delay = i * 0.14;
        const p = interpolate(frame, [life * delay, life * (delay + 0.5)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        const ang = p * Math.PI * 3 + i * 1.3;
        const rad = (1 - p) * 150;
        const x = cx + Math.cos(ang) * rad;
        const y = (150 + i * 6) + (drainY - (150 + i * 6)) * p - Math.sin(ang) * rad * 0.32;
        const scale = 1 - p * 0.8;
        const op = p < 0.9 ? 1 : interpolate(p, [0.9, 1], [1, 0]);
        return (
          <g key={i} transform={`translate(${x} ${y}) scale(${scale})`} opacity={op}>
            <ellipse cx={0} cy={0} rx={26} ry={26} fill="url(#drn-g)" stroke={BRAND.cyan} strokeWidth={3} />
            <text x={0} y={9} fontSize={26} fontWeight={900} textAnchor="middle" fill="#0d1117">$</text>
          </g>
        );
      })}
    </svg>
  );
};

const ShotMetaphor: React.FC<{ metaphor?: string; life: number }> = ({ metaphor, life }) => {
  if (metaphor === 'avalanche') return <MetaAvalanche life={life} />;
  if (metaphor === 'escorregao') return <MetaSlip life={life} />;
  if (metaphor === 'clique-link') return <MetaClickLink life={life} />;
  if (metaphor === 'foguete') return <MetaRocket life={life} />;
  if (metaphor === 'semente') return <MetaSeed life={life} />;
  if (metaphor === 'montanha-russa') return <MetaRollercoaster life={life} />;
  if (metaphor === 'bolha') return <MetaBubble life={life} />;
  if (metaphor === 'ralo') return <MetaDrain life={life} />;
  return <MetaSnowball life={life} />; // 'bola-neve' (default) — metáfora desconhecida → fallback
};

// Texto DIGITADO (máquina de escrever): aparece caractere a caractere ao longo de
// ~0,5–0,8s do início do shot, com um caret piscando durante a digitação (some ao
// terminar). Usado em shots statement/list/formula cujo sfx é 'typewriter'/'keyboard'
// — o som e a digitação entram JUNTOS (o pop das transições dá lugar a este efeito).
const ShotTypewriter: React.FC<{ text: string; life: number; gradient?: boolean }> = ({ text, life, gradient }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const chars = Array.from(text);
  // Janela de digitação: ~0,65s, limitada pela vida do shot (deixa folga pra ler).
  const typeFrames = Math.max(1, Math.min(Math.round(fps * 0.65), life - 4));
  const shown = Math.round(
    interpolate(frame, [0, typeFrames], [0, chars.length], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
  );
  const typing = frame < typeFrames && shown < chars.length;
  const blinkOn = Math.floor(frame / 7) % 2 === 0; // pisca ~4×/s
  const visible = chars.slice(0, shown).join('');
  return (
    <div style={{ textAlign: 'center', maxWidth: 940, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
      <span style={{
        fontFamily: DISPLAY, fontSize: 82, fontWeight: 900, lineHeight: 1.12,
        whiteSpace: 'pre-wrap', ...(gradient ? gradientText : { color: BRAND.text }),
      }}>{visible}</span>
      {typing && (
        <span style={{
          display: 'inline-block', width: 8, height: 74, marginLeft: 6,
          background: BRAND.cyan, borderRadius: 3, opacity: blinkOn ? 1 : 0.12,
          alignSelf: 'center',
        }} />
      )}
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// SHOT DE APP NATIVO (v3.3) — b-roll das telas do FinMoovi recriadas em React puro
// (NUNCA a gravação app-rec.mp4 / OffthreadVideo — gitignored, ausente na CI). Cada
// tela é uma composição 1080×1920 completa (mesmo pixel-art do estúdio); aqui ela é
// ESCALADA e montada dentro de um CELULAR flutuante no miolo do shot, livre da faixa
// de legenda (paddingBottom:380 do ShotView) e da marca d'água (topo).
// ─────────────────────────────────────────────────────────────────────────────
// Tela virtual = tamanho nativo das composições (9:16). Escalamos por igual → sem
// distorção. SCREEN_H folgado p/ caber sob a marca e acima da legenda mesmo com o
// pop/zoom do ShotView.
const APP_SCREEN_H = 1080;
const APP_SCREEN_W = Math.round(APP_SCREEN_H * (1080 / 1920)); // 608
const APP_SCALE = APP_SCREEN_W / 1080; // = APP_SCREEN_H/1920 (escala uniforme)

// Halo de brilho da marca ATRÁS do celular — radial-gradient NATIVO (sem filter:blur,
// seguindo o padrão de perf do fundo desta cena: glow barato, render voa).
const AppHalo: React.FC = () => (
  <div style={{
    position: 'absolute', width: 980, height: 980, borderRadius: '50%',
    background: `radial-gradient(circle at center, ${BRAND.violet}55 0%, transparent 62%)`,
    pointerEvents: 'none',
  }} />
);

// Moldura de celular flutuante (linguagem do Phone/AppBroll, mas SEM vídeo): a tela
// virtual 1080×1920 é escalada p/ dentro do vidro arredondado (overflow:hidden).
const PhoneShot: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const float = Math.sin(frame / 26) * 6; // deriva suave contínua (nunca "parado")
  return (
    <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <AppHalo />
      <div style={{
        transform: `translateY(${float}px)`,
        width: APP_SCREEN_W + 28, height: APP_SCREEN_H + 28, padding: 14, borderRadius: 52,
        background: '#05070a',
        boxShadow: '0 45px 120px rgba(139,92,246,0.5), 0 0 0 2px rgba(255,255,255,0.06), inset 0 0 0 2px rgba(255,255,255,0.03)',
      }}>
        <div style={{ width: APP_SCREEN_W, height: APP_SCREEN_H, borderRadius: 40, overflow: 'hidden', background: BRAND.bg, position: 'relative' }}>
          {/* tela virtual em tamanho nativo, escalada por igual (origem no topo-esq) */}
          <div style={{ position: 'relative', width: 1080, height: 1920, transform: `scale(${APP_SCALE})`, transformOrigin: 'top left' }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

// CALCULADORA (nova, nativa) — tela de Juros Compostos do FinMoovi: campos de entrada
// + curva exponencial subindo + contador crescendo. Composição 1080×1920 completa
// (como as demais telas), animada pela VIDA do shot (`life`). Salva do design do commit
// revertido 0d4f1b6, adaptada p/ o ciclo de vida do shot.
const CALC_INPUTS = [
  { label: 'Valor inicial', value: 'R$ 1.000' },
  { label: 'Aporte mensal', value: 'R$ 300' },
  { label: 'Taxa', value: '1% a.m.' },
  { label: 'Período', value: '25 anos' },
];
const CALC_TARGET = 486000; // resultado ilustrativo (crome de UI, não vem da narração)

const AppCalculadora: React.FC<{ life: number }> = ({ life }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const W = 900, H = 470, pad = 46, N = 40;

  // Curva desenha do ~15% ao ~80% da vida do shot; depois respira (glow) — sempre há
  // movimento (cabeça pulsando + brilho) pro resto da vida.
  const drawStart = Math.round(life * 0.15);
  const drawEnd = Math.max(drawStart + 12, Math.round(life * 0.8));
  const p = interpolate(frame, [drawStart, drawEnd], [0.02, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic),
  });
  const drawN = Math.max(0, Math.floor(p * N));
  const path: string[] = [];
  for (let i = 0; i <= drawN; i++) {
    const x = pad + (i / N) * (W - pad * 2);
    const y = H - pad - Math.pow(i / N, 2.2) * (H - pad * 2);
    path.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`);
  }
  const hx = pad + (drawN / N) * (W - pad * 2);
  const hy = H - pad - Math.pow(drawN / N, 2.2) * (H - pad * 2);
  const isComplete = frame >= drawEnd;
  const breathe = isComplete ? 0.5 + 0.5 * Math.sin((frame - drawEnd) / 12) : 0;
  const headPulse = 12 + Math.sin(frame / 5) * 4;
  const val = Math.round(p * CALC_TARGET);

  return (
    <AbsoluteFill>
      <Background />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 28, padding: '0 60px' }}>
        {/* header: marca + título da calculadora */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <FinMooviIcon size={44} idSuffix="calc" />
          <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 52, color: BRAND.text }}>Juros Compostos</div>
        </div>

        {/* campos de entrada (chips) entrando escalonados */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 16, maxWidth: 940 }}>
          {CALC_INPUTS.map((f, i) => {
            const s = spring({ frame, fps, delay: 4 + i * 5, config: { damping: 15, mass: 0.6 } });
            const op = interpolate(s, [0, 1], [0, 1]);
            const ty = interpolate(s, [0, 1], [22, 0]);
            return (
              <div key={i} style={{
                opacity: op, transform: `translateY(${ty}px)`,
                display: 'flex', flexDirection: 'column', gap: 4,
                padding: '16px 26px', borderRadius: 18,
                background: 'linear-gradient(160deg, #1b2230, #12161f)', border: '1px solid rgba(255,255,255,0.08)',
              }}>
                <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 24, color: BRAND.sub }}>{f.label}</div>
                <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 40, color: BRAND.text }}>{f.value}</div>
              </div>
            );
          })}
        </div>

        {/* gráfico da curva exponencial subindo */}
        <svg width={W} height={H}>
          <defs>
            <linearGradient id="calc-cg" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={BRAND.cyan} />
              <stop offset="50%" stopColor={BRAND.violet} />
              <stop offset="100%" stopColor={BRAND.magenta} />
            </linearGradient>
          </defs>
          <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke={BRAND.sub} strokeWidth={2} opacity={0.35} />
          {drawN > 0 && (
            <path d={path.join(' ')} fill="none" stroke="url(#calc-cg)" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round"
              style={{ filter: isComplete ? `drop-shadow(0 0 ${Math.round(6 + breathe * 8)}px ${BRAND.magenta})` : undefined }} />
          )}
          {drawN > 0 && <circle cx={hx} cy={hy} r={headPulse} fill={BRAND.magenta} opacity={0.35} />}
          {drawN > 0 && <circle cx={hx} cy={hy} r={13} fill={BRAND.magenta} />}
        </svg>

        {/* contador do resultado subindo com a curva */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 28, color: BRAND.sub }}>Seu dinheiro rende</div>
          <div style={{ ...gradientText, fontFamily: DISPLAY, fontWeight: 900, fontSize: 96, lineHeight: 1.05 }}>
            R$ {nfBR.format(val)}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// Resolve a tela nativa (composição 1080×1920) para cada valor de `app`.
// Desconhecido → null (o AppShot cai no fallback statement, nunca quebra).
const appScreenElement = (app: AppScreen | undefined, life: number): React.ReactNode | null => {
  switch (app) {
    case 'dashboard': return <DashboardHero theme="dark" lang="pt" currency="BRL" />;
    case 'cartoes': return <CartoesCountUpShort />;
    case 'fluxo': return <FluxoBarrasShort />;
    case 'extrato': return <ExtratoListaShort />;
    case 'balanco': return <BalancoDonutShort />;
    case 'compras': return <ComprasCarrinhoShort />;
    case 'smartcapture': return <SmartCaptureVozShort />;
    case 'calculadora': return <AppCalculadora life={life} />;
    default: return null;
  }
};

// Shot de app: tela nativa dentro do celular flutuante. `app` inválido → fallback
// gracioso (statement com a nota do shot), sem OffthreadVideo, sem crash.
const AppShot: React.FC<{ app?: AppScreen; note?: string; base: Scene; life: number }> = ({ app, note, base, life }) => {
  const screen = appScreenElement(app, life);
  if (!screen) return <SceneStatement scene={pseudoScene(base, note ?? base.onScreenText)} />;
  return <PhoneShot>{screen}</PhoneShot>;
};

/**
 * GRAMÁTICA DE ENTRADA (Onda 2 — IMPLEMENTACAO20 §16.3 item 8).
 *
 * Até 30/07/2026 TODO shot entrava IGUAL: mesma mola, sempre vindo da DIREITA
 * (translateX 40→0), sempre o mesmo push-in de 5%. Com 20+ shots por vídeo o olho
 * aprende o padrão em segundos — é a assinatura mecânica da camada visual, e uma
 * das 3 causas medidas do "parece IA" (§16.2, causa 4: temos motor de câmera, não
 * direção de câmera).
 *
 * Agora a entrada NASCE do tipo do visual e alterna com o índice do shot, criando o
 * whiplash de escala (macro ↔ plano aberto) que a skill Vox usa. É DETERMINÍSTICO
 * de propósito: nada de random, que quebraria o replay frame-a-frame do Remotion.
 */
type EntradaShot = { x: number; y: number; s: number; kb: [number, number]; blur: number };
const entradaFor = (type: string, i: number): EntradaShot => {
  const par = i % 2 === 0;
  switch (type) {
    // app: a tela tem de entrar LIMPA e ficar legível ~4,5s (REGRA G do roteirista).
    // Nada de zoom forte nem desfoque pesado aqui — seria trabalhar contra a regra.
    case 'app': return { x: 0, y: 60, s: 0.92, kb: [1, 1.02], blur: 3 };
    // números: MACRO — a câmera cai em cima do número.
    case 'number':
    case 'counter': return { x: 0, y: 0, s: 1.28, kb: par ? [1, 1.05] : [1.05, 1], blur: 7 };
    // metáfora: PLANO ABERTO — a ação física precisa caber inteira no quadro.
    case 'metaphor': return { x: 0, y: 0, s: 0.62, kb: [1, 1.04], blur: 5 };
    case 'chart': return { x: 0, y: 70, s: 0.85, kb: [1, 1.05], blur: 4 };
    case 'icon': return { x: 0, y: -60, s: 0.7, kb: par ? [1.04, 1] : [1, 1.04], blur: 5 };
    // texto (statement/list/formula): mantém o lateral clássico, mas ALTERNANDO o
    // lado — era sempre da direita.
    default: return { x: par ? 50 : -50, y: 0, s: 0.75, kb: par ? [1, 1.05] : [1.05, 1], blur: 5 };
  }
};

// Desfoque de ENTRADA, em quadros. Vale para todo shot.
// Por que CSS e não as transições nativas com blur do Remotion (zoom-blur,
// cross-zoom, linear-blur…): TODAS elas dependem de `html-in-canvas`, que exige
// Chrome ≥148 COM a flag `chrome://flags/#canvas-draw-element` ligada à mão. O
// runner do GitHub Actions não tem essa flag ⇒ o render diário morreria com
// HTML_IN_CANVAS_UNSUPPORTED. `filter: blur()` roda em qualquer Chromium.
const BLUR_FRAMES = 5;

// Um shot: entra com pop+slide e mostra seu visual pela sua vida.
const ShotView: React.FC<{ shot: Shot; life: number; base: Scene; revealFrame: number; durationFrames: number; shotIndex?: number; stage?: number }> = ({ shot, life, base, revealFrame, durationFrames, shotIndex = 0, stage = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const v = shot.visual;
  const ent = entradaFor(v.type, shotIndex);
  const pop = spring({ frame, fps, config: { damping: 12, mass: 0.5 } });
  const scale = interpolate(pop, [0, 1], [ent.s, 1]);
  const tx = interpolate(pop, [0, 1], [ent.x, 0]);
  const ty = interpolate(pop, [0, 1], [ent.y, 0]);
  const kb = interpolate(frame, [0, life], ent.kb, { extrapolateRight: 'clamp' });
  const blur = interpolate(frame, [0, BLUR_FRAMES], [ent.blur, 0], { extrapolateRight: 'clamp' });
  // ESTÁGIO DO FIO CONDUTOR (REGRA H): a 2ª e a 3ª aparição da MESMA metáfora vêm
  // maiores que a 1ª, para a imagem crescer junto com a história. Teto em +18% —
  // acima disso a animação começa a encostar nas bordas do enquadramento.
  const stageScale = v.type === 'metaphor' && stage > 1 ? 1 + Math.min(stage - 1, 2) * 0.09 : 1;
  // Entrada DIGITADA quando o shot de texto tem sfx de teclado/máquina de escrever.
  const typed = shot.sfx === 'typewriter' || shot.sfx === 'keyboard';
  const isTextShot = v.type === 'statement' || v.type === 'list' || v.type === 'formula';
  const inner = (() => {
    if (typed && isTextShot) {
      return <ShotTypewriter text={v.text ?? base.onScreenText ?? ''} life={life} gradient={v.type === 'formula'} />;
    }
    switch (v.type) {
      case 'number': return <ShotNumber text={v.text ?? base.onScreenText} />;
      case 'counter': return <ShotCounter from={v.from} to={v.to} prefix={v.prefix} life={life} />;
      case 'chart': return <SceneChart scene={pseudoScene(base, v.text ?? base.onScreenText)} revealFrame={Math.min(revealFrame, 4)} durationFrames={life} />;
      case 'icon': return <ShotIcon icon={v.icon} />;
      case 'metaphor': return <ShotMetaphor metaphor={v.metaphor} life={life} />;
      case 'app': return <AppShot app={v.app} note={v.note} base={base} life={life} />;
      case 'formula': return <SceneFormula scene={pseudoScene(base, v.text ?? base.onScreenText)} />;
      case 'list':
      case 'statement':
      default: return <SceneStatement scene={pseudoScene(base, v.text ?? base.onScreenText)} />;
    }
  })();
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', paddingBottom: 380, paddingLeft: 60, paddingRight: 60 }}>
      <div
        style={{
          transform: `translate(${tx}px, ${ty}px) scale(${scale * kb * stageScale})`,
          // blur só nos primeiros quadros; abaixo de 0.05 sai do style para não
          // deixar uma camada de composição ligada o vídeo inteiro (custo de render).
          filter: blur > 0.05 ? `blur(${blur}px)` : undefined,
          textAlign: 'center',
        }}
      >
        {inner}
      </div>
    </AbsoluteFill>
  );
};

// Sequência de shots da cena — cada um no seu frame-âncora, contíguos (sem vazio).
const SceneShots: React.FC<{ scene: Scene; timing?: SceneTiming | null; durationFrames: number; metaphorStages?: number[] }> = ({ scene, timing, durationFrames, metaphorStages }) => {
  const { fps } = useVideoConfig();
  const shots = scene.shots || [];
  const starts = shotStartFrames(scene, timing, fps, durationFrames);
  return (
    <AbsoluteFill>
      {shots.map((shot, i) => {
        const start = starts[i];
        const end = i < shots.length - 1 ? starts[i + 1] : durationFrames;
        const life = Math.max(1, end - start);
        return (
          <Sequence key={i} from={start} durationInFrames={life}>
            <ShotView shot={shot} life={life} base={scene} revealFrame={0} durationFrames={life} shotIndex={i} stage={metaphorStages?.[i] || 0} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

// Um disparo de SFX de shot já RESOLVIDO: arquivo real (.ogg) + frame de início
// LOCAL (dentro da cena). `i` = índice do shot de origem (chave estável p/ o React).
export type ShotSfxFire = { i: number; from: number; file: string };

// Disparos CANDIDATOS de SFX dos shots de UMA cena (sem cooldown entre cenas — só o
// dedup local de não repetir o MESMO som em shots CONSECUTIVOS da mesma cena). Serve
// de entrada para o cooldown GLOBAL (computeGlobalShotSfxFires), que olha o vídeo
// inteiro. Compara o ARQUIVO resolvido (o que realmente toca), então dois nomes de
// contrato que caem no mesmo .ogg também são deduplicados.
function shotSfxCandidatesFor(scene: Scene, timing: SceneTiming | null | undefined, fps: number, totalFrames: number): ShotSfxFire[] {
  const shots = scene.shots || [];
  const starts = shotStartFrames(scene, timing, fps, totalFrames);
  let prevFile: string | null = null;
  const fires: ShotSfxFire[] = [];
  shots.forEach((shot, i) => {
    if (!shot.sfx) return;
    const file = resolveShotSfx(shot.sfx);
    if (file === prevFile) return;
    prevFile = file;
    // metáforas com "momento-chave": o som dispara no FRAME do evento (não no início
    // do shot), alinhado ao VISUAL pela MESMA fórmula (fonte única): 'clique-link'
    // no toque (start + press); 'bolha' no estouro (start + pop).
    let from = starts[i];
    if (shot.visual.type === 'metaphor' && (shot.visual.metaphor === 'clique-link' || shot.visual.metaphor === 'bolha')) {
      const end = i < shots.length - 1 ? starts[i + 1] : totalFrames;
      const life = Math.max(1, end - starts[i]);
      from = starts[i] + (shot.visual.metaphor === 'bolha' ? bubblePopOffset(life) : clickPressOffset(life));
    }
    fires.push({ i, from, file });
  });
  return fires;
}

// COOLDOWN GLOBAL (v3.4): o MESMO som (arquivo resolvido) não repete dentro de
// 240 frames (~8s a 30fps) em NENHUMA parte do vídeo, mesmo atravessando cenas —
// evita cansar o ouvido quando duas cenas próximas usam o mesmo efeito de shot
// (ex.: 'coin' na cena 2 e de novo na cena 4, poucos segundos depois). Estende o
// dedup local (só shots consecutivos da MESMA cena) do shotSfxCandidatesFor acima.
export const SHOT_SFX_COOLDOWN_FRAMES = 240;

// Calcula, para TODAS as cenas do vídeo, os disparos de SFX de shot já filtrados
// pelo cooldown global. `sceneStartFrames[i]` = frame GLOBAL (mesmo referencial do
// trilho mestre) em que a cena i começa; `sceneTotalFrames[i]` = duração em frames
// da cena i. Retorna um array paralelo a `scenes`, cada item já pronto pra passar a
// <ShotSfxTrack fires={...} /> daquela cena (frames ainda LOCAIS à cena).
export function computeGlobalShotSfxFires(
  scenes: Scene[],
  timings: (SceneTiming | null | undefined)[],
  sceneStartFrames: number[],
  sceneTotalFrames: number[],
  fps: number,
): ShotSfxFire[][] {
  const lastFireGlobalByFile = new Map<string, number>();
  return scenes.map((scene, i) => {
    if (!scene.shots || !scene.shots.length) return [];
    const candidates = shotSfxCandidatesFor(scene, timings[i], fps, sceneTotalFrames[i]);
    const kept: ShotSfxFire[] = [];
    for (const c of candidates) {
      const globalFrom = (sceneStartFrames[i] ?? 0) + c.from;
      const last = lastFireGlobalByFile.get(c.file);
      if (last != null && globalFrom - last < SHOT_SFX_COOLDOWN_FRAMES) continue; // dentro do cooldown → silencia
      lastFireGlobalByFile.set(c.file, globalFrom);
      kept.push(c);
    }
    return kept;
  });
}

// Trilho de SFX dos shots (no trilho MESTRE de áudio): cada disparo já vem PRONTO
// (resolvido + filtrado pelo cooldown global) via `fires` — ver computeGlobalShotSfxFires.
const SHOT_SFX_VOLUME = 0.45;
const ShotSfxTrack: React.FC<{ fires: ShotSfxFire[] }> = ({ fires }) => {
  const { fps } = useVideoConfig();
  return (
    <>
      {fires.map((f) => (
        <Sequence key={f.i} from={f.from} durationInFrames={Math.round(fps * 2)}>
          <Audio src={staticFile(f.file)} volume={SHOT_SFX_VOLUME} />
        </Sequence>
      ))}
    </>
  );
};

/**
 * ESTÁGIOS DO FIO CONDUTOR (Onda 2 / IMPLEMENTACAO20 §16). A REGRA H do roteirista
 * manda UMA metáfora atravessar o vídeo em 3 estágios que CRESCEM. O render precisa
 * saber em que estágio está para a 2ª e a 3ª aparição não serem um decalque da 1ª —
 * sem isso a história cresce no texto e a imagem repete (o risco aberto da Onda 1).
 *
 * Conta a ocorrência de cada `visual.metaphor` na ORDEM do vídeo: 1ª = 1, 2ª = 2, …
 * DELIBERADAMENTE não lê o `note` (onde o LLM escreve "estágio 2/3"): texto de LLM
 * erra, contagem não. Se o roteiro só tiver 1 metáfora, o estágio é 1 e nada muda —
 * roteiros antigos renderizam exatamente como antes.
 *
 * Retorna, por cena, um array paralelo aos shots: 0 = não é metáfora.
 */
export function computeMetaphorStages(scenes: Scene[]): number[][] {
  const vistas: Record<string, number> = {};
  return scenes.map((scene) => {
    const shots = scene.shots || [];
    return shots.map((shot) => {
      const v = shot?.visual;
      if (!v || v.type !== 'metaphor') return 0;
      const chave = v.metaphor || 'bola-neve'; // mesmo fallback do ShotMetaphor
      vistas[chave] = (vistas[chave] || 0) + 1;
      return vistas[chave];
    });
  });
}

// Dispatcher — o role tem prioridade (cta/outro têm cena própria); senão usa visual.type.
export const SceneRenderer: React.FC<{ scene: Scene; timing?: SceneTiming | null; metaphorStages?: number[] }> = ({ scene, timing, metaphorStages }) => {
  const { fps } = useVideoConfig();
  // Mesmo cue (revealFrameFor) que o SceneShell usa pro punch — repassado ao
  // SceneChart pra sincronizar o DESENHO da curva com a fala, não só o soco.
  const revealFrame = revealFrameFor(scene, timing, fps);
  const durationFrames = Math.max(1, Math.round((timing?.durationSec ?? scene.durationSec) * fps));
  // v3: se a cena traz `shots`, o motor de shots substitui o visual único central.
  if (scene.shots && scene.shots.length) {
    return <SceneShots scene={scene} timing={timing} durationFrames={durationFrames} metaphorStages={metaphorStages} />;
  }
  const inner = (() => {
    if (scene.role === 'cta') return <SceneCta scene={scene} />;
    if (scene.role === 'outro') return <SceneOutro scene={scene} />;
    switch (scene.visual?.type) {
      case 'number': return <SceneNumber scene={scene} />;
      case 'chart': return <SceneChart scene={scene} revealFrame={revealFrame} durationFrames={durationFrames} />;
      case 'formula': return <SceneFormula scene={scene} />;
      case 'title': return <SceneTitle scene={scene} />;
      case 'list':
      case 'statement':
      default: return <SceneStatement scene={scene} />;
    }
  })();
  return <SceneShell scene={scene} timing={timing}>{inner}</SceneShell>;
};
