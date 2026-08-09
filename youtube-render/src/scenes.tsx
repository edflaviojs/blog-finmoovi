import { AbsoluteFill, Audio, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig, Easing, Sequence } from 'remotion';
import { BRAND, DISPLAY, BODY, gradientText } from './theme';
import { FinMooviIcon } from './icon';
import { KaraokeCaption } from './captions';
import { IconBurst, SHOT_ICONS, ShotIconKey } from './icons-fx';
import { SceneSfx, resolveShotSfx } from './audio/sfx';
// As 32 coreografias da capa disruptiva (T1, §21.2). Vivem em ficheiro próprio: o
// scenes.tsx já tem 167KB e o ator + as 32 capas são outro assunto.
import { COREOGRAFIAS, CoreografiaDaCapa } from './capas';
import { PALCO_W, PALCO_H, Palco, Chao, Ator, MEIO, CHAO, PECA, brilho, andar } from './capa';
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
  /**
   * ⚠️ CORTAR POR PALAVRA, NUNCA POR LETRA (02/08/2026).
   * O corte cego aos 26 caracteres punha **"3 ERROS DE CARTÃO QUE TE C…"** no ecrã
   * durante os 58 segundos do vídeo — visto no render de hoje, em todos os fotogramas.
   * Um rótulo cortado a meio de uma palavra lê-se como coisa partida, não como resumo.
   * Agora corta na última palavra inteira que cabe e deixa cair as palavras de ligação
   * penduradas no fim ("que", "de", "te"…), que sozinhas não dizem nada:
   *   "3 erros de cartão que te custam R$ 500/mês" → **"3 ERROS DE CARTÃO"**
   */
  const curto = (() => {
    if (texto.length <= 26) return texto;
    const palavras = texto.split(/\s+/);
    const cabem: string[] = [];
    for (const p of palavras) {
      if ([...cabem, p].join(' ').length > 26) break;
      cabem.push(p);
    }
    const LIGACAO = new Set(['que', 'de', 'do', 'da', 'dos', 'das', 'e', 'em', 'no', 'na',
      'com', 'para', 'pra', 'por', 'te', 'a', 'o', 'as', 'os', 'um', 'uma', 'ao', 'à']);
    /**
     * ♦ E NUNCA TERMINAR EM DINHEIRO PARTIDO (03/08/2026). Visto no vídeo real:
     * "A inflação te rouba R$ 2 mil por ano" → o "mil" não coube e ficou
     * **"A INFLAÇÃO TE ROUBA R$ 2…"** os 59s inteiros — lê-se como R$ 2. Um número
     * ou um "R$" pendurados no corte são sempre expressão partida: caem também.
     */
    const PENDURADO = (p: string) => LIGACAO.has(p.toLowerCase()) || /^r\$$/i.test(p) || /^r?\$?\d[\d.,]*$/i.test(p);
    while (cabem.length > 1 && PENDURADO(cabem[cabem.length - 1])) cabem.pop();
    // se nem a 1ª palavra couber (palavra gigante), volta-se ao corte por letra
    return cabem.length ? `${cabem.join(' ')}…` : `${texto.slice(0, 26).trim()}…`;
  })();
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

/**
 * O CARIMBO "APP GRÁTIS" — 05/08/2026, IMPL20 §53.
 *
 * ═══ POR QUE ESTÁ NO VÍDEO E NÃO SÓ NA CAPA ═══
 * Descobriu-se que **o YouTube não usa a nossa capa na grelha de Shorts**: ele guarda
 * duas imagens por vídeo — a deitada (que a API define, e que serve a pesquisa e as
 * partilhas) e uma **em pé, que ele escolhe sozinho de um fotograma do vídeo**. Não há
 * comando nenhum que lhe diga qual.
 *
 * O estudo dos 12 Shorts publicados mostrou o que ele escolhe: **um elemento grande,
 * muito contrastado, centrado, sobre fundo limpo** — quase sempre o bloco ciano do
 * número (R$196.407, R$ 2,68k, R$47) e, quando o vídeo tem poucos, o ícone de aviso.
 *
 * Daí a decisão: em vez de lutar pela escolha dele, **vestir os fotogramas que ele já
 * escolhe**. Sendo uma camada fixa, seja qual for o fotograma que ele apanhe, ele vem
 * com a marca em cima e com a promessa — que é o que uma capa tem de ter.
 *
 * ⚠️ **NÃO entra na abertura.** Vive dentro da mesma sequência da etiqueta do tema,
 * que começa depois da intro: os primeiros 3,5s são da capa disruptiva e nada pode
 * competir com ela — foi essa a queixa nº1 do dono em 31/07.
 * ⚠️ E fica no canto DIREITO: o esquerdo é da etiqueta do tema, o centro da marca.
 */
export const CarimboAppGratis: React.FC = () => (
  <div style={{
    position: 'absolute', top: 152, right: 40,
    background: 'linear-gradient(135deg, #ff1f3d 0%, #ff7a00 100%)',
    color: BRAND.yellow,
    fontFamily: BODY, fontWeight: 900, fontSize: 34, letterSpacing: 0.5,
    textTransform: 'uppercase',
    padding: '12px 24px', borderRadius: 16,
    border: `4px solid ${BRAND.yellow}`,
    transform: 'rotate(-4deg)',
    textShadow: '0 2px 0 rgba(0,0,0,0.35)',
    boxShadow: '0 0 34px rgba(255,31,61,0.6), 0 8px 20px rgba(0,0,0,0.5)',
    whiteSpace: 'nowrap',
  }}>App Grátis</div>
);

// ─────────────────────────────────────────────────────────────────────────────
/**
 * 🔴 EM QUE FOTOGRAMA BATE O SOCO DE ABERTURA — e nunca, nunca no 0 (08/08/2026).
 *
 * Queixa do dono, com fotograma na mão: *"existe um defeito urgente em todos os nossos
 * vídeos... que é ele iniciar com um clarão... quando é mostrado em alguns lugares ele
 * não mostra a primeira tela visível, mostra simplesmente esse clarão... retire esse
 * clarão pelo amor de Deus"*.
 *
 * Medido com ffmpeg no brilho médio do fotograma 0 (escala 0-255):
 *   · vídeo de 50s: **234** · vídeo longo: **189** · Short de 16s: **50** (limpo)
 *
 * O de 16s é o modelo, e foi ele que o dono aprovou: fotogramas 0, 1 e 2 mostram a
 * CENA, e o soco entra ao 3 (brilho 150). Ordem dele: *"tente iniciar os vídeos igual
 * inicia o de 16s... já inicia com soco"*.
 *
 * ⚠️ **O CLARÃO E A PANCADA ANDAM JUNTOS.** Adiar só o clarão punha a imagem 0,1s
 * atrás do `boom.ogg`, que toca no fotograma 0 — trocava um defeito por outro. Por
 * isso o som destas aberturas passou a viver dentro de uma `Sequence from` com este
 * mesmo número.
 *
 * ⚠️ Vive AQUI e não no `Long.tsx` porque o `Long.tsx` importa deste ficheiro; ao
 * contrário seria um ciclo.
 */
export const SOCO_DA_ABERTURA = 3;

/** A forma do clarão de abertura: nada, nada, PANCADA, e a desaparecer. */
export const curvaDoSoco = (frame: number, pico: number) => interpolate(
  frame,
  [0, SOCO_DA_ABERTURA - 1, SOCO_DA_ABERTURA, SOCO_DA_ABERTURA + 10],
  [0, 0, pico, 0],
  { extrapolateRight: 'clamp' },
);

// ─────────────────────────────────────────────────────────────────────────────
// ABERTURA DISRUPTIVA (#1): o número-choque SLAM na tela com boom + flash + shake,
// e a pergunta de curiosidade surge embaixo. Para o dedo do usuário nos 1,5s iniciais.
// ─────────────────────────────────────────────────────────────────────────────
export const ShockIntro: React.FC<{ big: string; sub: string }> = ({ big, sub }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const slam = spring({ frame, fps, config: { damping: 9, mass: 0.7 } });
  const scale = interpolate(slam, [0, 1], [2.6, 1]);
  // 🔴 Era `[0, 2, 12] → [1, 0.7, 0]`: BRANCO SÓLIDO no fotograma 0. Ver `curvaDoSoco`.
  const flash = curvaDoSoco(frame, 0.62);
  // O tremor anda com o soco: tremer antes da pancada é tremer sem motivo.
  const shake = frame >= SOCO_DA_ABERTURA && frame < SOCO_DA_ABERTURA + 10
    ? Math.sin((frame - SOCO_DA_ABERTURA) * 3) * (1 - (frame - SOCO_DA_ABERTURA) / 10) * 10
    : 0;
  const subIn = spring({ frame: frame - 14, fps, config: { damping: 14 } });
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
      {/* A pancada anda com o clarão — ver `SOCO_DA_ABERTURA`. */}
      <Sequence from={SOCO_DA_ABERTURA}>
        <Audio src={staticFile('sfx/boom.ogg')} volume={0.9} />
      </Sequence>
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
  /** A imagem deste vídeo — escolhe a COREOGRAFIA da capa (T1, §21.2). Sem ela, a
   *  capa cai no comportamento antigo (frase + ícones), que é o que os roteiros
   *  anteriores a 01/08/2026 têm. */
  metaphor?: string | null;
}> = ({ frase, counter, frames, metaphor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tokens = parseFrase(frase);

  // Fases SOBREPOSTAS (45f/1,5s): frase (soco) + ícones ocupam 0–~14; o contador rola
  // por cima a partir de ~frame 14 (0,31×frames) até ~40. Nada é sequenciado à toa.
  const counterStart = counter ? Math.round(frames * 0.31) : frames + 1; // ~frame 14
  const hasCounter = !!counter && frame >= counterStart - 8;

  // slam inicial (boom) + flash de entrada e flash final (soco do contador).
  // 🔴 Era `[0, 2, 12] → [0.9, 0.5, 0]`: 90% de branco no fotograma 0. É ESTA a abertura
  //    que os vídeos de 50s usam de verdade (a `ShockIntro` só corre com `intro.big`, e
  //    nenhum roteiro em disco tem esse campo). Ver `curvaDoSoco`.
  const slamFlash = curvaDoSoco(frame, 0.6);
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

  // A CAPA COM AÇÃO (T1): há coreografia quando o roteiro tem imagem. Sem imagem,
  // fica o comportamento antigo (frase + ícones de curiosidade), para os roteiros
  // anteriores a 01/08/2026 não abrirem com um ecrã meio vazio.
  const temAcao = !!metaphor && !!COREOGRAFIAS[metaphor];

  // SAÍDA SUAVE. A capa é opaca por cima da cena 1, que já está a correr por baixo
  // desde os 0,9s; um corte seco no frame 105 daria um salto. Estes 8 frames finais
  // revelam a cena que já vinha em curso.
  const saida = temAcao
    ? interpolate(frame, [frames - 8, frames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : 1;

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 40, opacity: saida }}>
      {/* A pancada anda com o clarão — ver `SOCO_DA_ABERTURA`. */}
      <Sequence from={SOCO_DA_ABERTURA}>
        <Audio src={staticFile('sfx/boom.ogg')} volume={0.9} />
      </Sequence>
      {counter && (
        <Sequence from={counterStart - 6} durationInFrames={Math.round(fps * 1.5)}>
          <Audio src={staticFile(resolveShotSfx('whoosh'))} volume={0.55} />
        </Sequence>
      )}

      {/* O FUNDO da capa: opaco de propósito. A cena 1 já está a tocar por baixo e
          não pode transparecer — o que prende no scroll é UMA imagem, não duas
          sobrepostas. */}
      {temAcao && <AbsoluteFill style={{ background: BRAND.bg }} />}

      {/* A COREOGRAFIA — o palco é mais largo que o vídeo (1240 > 1080) para o chão
          sangrar pelos lados; por isso o desvio de -80 à esquerda.

          🔴 A CÂMARA NÃO PÁRA — 09/08/2026, ordem do dono: *"vamos com a opção 1, dar
          movimento na capa"*.

          ═══ O QUE ESTAVA ERRADO, MEDIDO ═══
          A capa fica **223 fotogramas (7,4s)** por cima de tudo, e a régua do ritmo
          encontrava **4 segundos PARADOS entre os 00:03 e os 00:07** — dentro dela. E
          isso é o pior sítio possível: nos nossos Shorts **metade da audiência sai aos
          14 segundos**, portanto o pedaço mais caro do vídeo era justamente o que
          estava congelado.

          A frase crava toda nos primeiros 10 fotogramas e a coreografia continua a
          animar — mas devagar de mais para se ver: no `balde-furado`, do t=0,3 ao fim,
          o nível desce 88px em 156 fotogramas, **meio pixel por fotograma**. Existe no
          código e não existe no olho.

          ═══ O QUE ENTRA — E O QUE ISTO SOZINHO **NÃO** RESOLVEU ═══
          Uma aproximação lenta e constante da câmara, com um desvio mínimo. Ela dá ao
          plano a vida que um plano fixo não tem, e fica.

          🔴 **MAS MEDIDA, ela não moveu a agulha: 6,09 → 6,11 de movimento médio, e os
          4 segundos parados ficaram EXACTAMENTE onde estavam.** 8% de aproximação em 223
          fotogramas são 0,036% por fotograma — três pixels entre duas amostras da régua.
          Existe, e não se vê. **Fica escrito porque a tentação de a repetir é real:
          câmara lenta sozinha não conserta um plano parado.**

          Quem resolveu foi o **soco dentro da capa**, em `Short.tsx` — ver lá o porquê
          do sítio. Esta câmara continua aqui por ser boa prática num plano fixo, não
          por ser a cura.

          ⚠️ **NÃO se mexeu na frase.** Ela crava junta de propósito desde 01/08 (*"não é
          rush-cut, é murro"*) e o exagero das ênfases foi baixado para 1,00 em 08/08
          depois de se medir palavras a atropelarem-se. Dar-lhe entrada escalonada agora
          desfazia duas decisões já tomadas para resolver um problema que é do FUNDO.

          ⚠️ **Nem no tempo nem no texto.** A capa continua a durar o que a voz demora a
          dizer a frase escrita nela — que é a conta de 02/08.

          ⚠️ 8% de aproximação e 18px de desvio: o palco já sangra 80px de cada lado, por
          isso a ampliação **não descobre borda nenhuma**. Mais do que isto e a
          coreografia começa a sair do enquadramento que foi desenhado para ela. */}
      {temAcao && (
        <div style={{
          position: 'absolute',
          bottom: 120,
          left: (1080 - PALCO_W) / 2,
          width: PALCO_W,
          height: PALCO_H,
          transform: `scale(${interpolate(frame, [0, frames], [1, 1.08], { extrapolateRight: 'clamp' })}) `
            + `translateX(${interpolate(frame, [0, frames], [0, -18], { extrapolateRight: 'clamp' })}px)`,
          transformOrigin: '50% 78%',
        }}>
          <CoreografiaDaCapa metaphor={metaphor} life={frames} />
        </div>
      )}

      {/* ícones de curiosidade — só na capa SEM ação, senão competem com o ator */}
      {!temAcao && INTRO_CURIOSITY.map((c, i) => (
        <CuriosityIcon key={i} which={c.which} x={c.x} y={c.y} delay={c.delay} color={c.color} glow={c.glow} fadeAt={counterStart - 4} />
      ))}

      {/* frase com ênfase — em CIMA quando há ação, para não tapar o ator */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'baseline',
        gap: '10px 22px', width: 940, maxWidth: '92%', textAlign: 'center',
        ...(temAcao ? { position: 'absolute' as const, top: 210 } : null),
        transform: `translateY(${fraseY}px) scale(${fraseScale})`,
      }}>
        {tokens.map((tk, i) => {
          // SOCO: sem stagger (i*2) — a frase inteira crava junta, ~frames 0–10, com
          // spring curto/rígido (não é rush-cut, é murro). Overshoot leve nas ênfases.
          const s = spring({ frame, fps, config: { damping: 11, mass: 0.4, stiffness: 200 } });
          /**
           * ⚠️ O EXAGERO DA ÊNFASE DESCEU DE 1,35 PARA 1,12 — 08/08/2026, e só se viu
           * depois de tirar o clarão.
           *
           * A caixa flex reserva o tamanho FINAL da palavra; uma palavra a 90px
           * desenhada a 1,35 ocupa 121px e **transborda por cima das vizinhas**. No
           * fotograma 0 lia-se "inflação encolhseu salário" — as palavras umas em cima
           * das outras. Ninguém tinha visto porque **o clarão branco tapava exactamente
           * esses fotogramas**: o defeito estava escondido por outro defeito.
           * Medido, fotograma a fotograma: a 1,12 ainda se lia "encolheseu"; a 1,06
           * também, porque o espaço entre palavras é 22px e **cada vizinha come 10px**
           * (6% de uma palavra de 350px). Só a 1,00 o fotograma 0 fica limpo.
           *
           * ⚠️ E o murro não se perde: quem o dá é o clarão do fotograma 3, o tremor e o
           * `boom.ogg`. Nunca foi o tamanho da letra — a letra grande só estava a
           * atropelar a vizinha. As palavras continuam a ENTRAR (sobem 26px e as
           * normais crescem de 0,75), portanto nada aparece pronto.
           */
          const sc = tk.emph ? 1 : interpolate(s, [0, 1], [0.75, 1]);
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

      {/* ⚠️ O CONTADOR GIGANTE NÃO CONVIVE COM A COREOGRAFIA. Visto no render do vídeo
          inteiro: "R$1.447.607" atravessava a capa por cima do ator e da bola de neve,
          e não se percebia nem uma coisa nem outra. Quando há ação, é a ação que é o
          gancho — o número volta a aparecer no CartaoResultado, dentro do vídeo.
          (Os roteiros do gerador novo já não trazem contador; isto protege os antigos.) */}
      {hasCounter && !temAcao && counterEl}

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

/**
 * ♦ 07/08/2026 — A PÍLULA DEIXOU DE DIZER "Comenta FINMOOVI".
 *
 * ═══ PORQUÊ ═══
 * O mesmo ficheiro passou a sair em OITO redes (Instagram, TikTok, Facebook, LinkedIn,
 * Threads, Telegram, Pinterest, Bluesky) além do YouTube. **A automação que responde a
 * quem escreve FINMOOVI só existe em dois sítios** — Instagram (mensagem privada) e
 * YouTube (`src/scripts/youtube/comentarios.js`, que responde no próprio comentário).
 * Nas outras sete a pessoa comentava e não recebia nada: promessa quebrada, que é pior
 * do que chamada nenhuma. Decisão do dono: IMPL26 §12-A.
 *
 * ⚠️ **E o "comenta FINMOOVI" NÃO desapareceu** — mudou de sítio. Continua escrito na
 * LEGENDA do Instagram e do YouTube, onde há robô a cumpri-lo, e as duas automações
 * disparam pelo COMENTÁRIO, não pelo áudio nem pela tela: elas nem sabem o que o vídeo
 * mostrou. Um ficheiro só serve as nove.
 *
 * ⚠️ **UMA CONSTANTE, DOIS SÍTIOS.** O mesmo texto aparece na cena da CTA e na pílula que
 * a mãozinha carrega (`MetaClickLink`). Escritos à mão nos dois, um dia mudava-se um só —
 * e o vídeo mostrava duas chamadas diferentes na mesma cena.
 */
const CTA_PILULA = 'Procura FinMoovi';

// CTA chamativa: título + pílula "Procura FinMoovi" + lupa pulsando.
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
        {CTA_PILULA}
      </div>
      {/**
        * ⚠️ A SETA PARA BAIXO SAIU, e não foi enfeite: ela apontava para os comentários
        * ("é aqui embaixo"). Com a chamada nova ela apontaria para nada — e é exatamente
        * a mentira que se quis tirar da fala. No lugar vai uma LUPA, que é o gesto que
        * a chamada pede: procurar o nome.
        */}
      <div style={{ marginTop: 20 + bounce * 0.5, display: 'flex', justifyContent: 'center' }}>
        <svg width="90" height="90" viewBox="0 0 100 100" fill="none">
          <circle cx="44" cy="42" r="26" stroke="url(#cta-grad)" strokeWidth="11" />
          <path d="M63 61 L84 82" stroke="url(#cta-grad)" strokeWidth="11" strokeLinecap="round" />
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
// ♦ A TELA DO BORDÃO (assinatura sonora do canal) — aprovada em conceito pelo
// dono em 03/08/2026: "toda vez que falarmos esse bordão entre essa tela antes
// do final FinMoovi". Entra POR CIMA dos últimos ~2,5s da última cena — o tempo
// exato de a voz dizer o bordão — e por isso custa ZERO segundos de vídeo.
// A receita de impacto é a das capas (regra 9 do §22): tremor e clarão, nunca
// formas. DUAS pancadas, sincronizadas com as duas metades da frase falada:
//   pancada 1 (frame ~0):  "DINHEIRO SEM CONTROLE"
//   pancada 2 (frame ~34): "É DINHEIRO DOS OUTROS." (em gradiente da marca)
// SEMPRE IDÊNTICA em todos os vídeos — a força de uma assinatura é a repetição.
// No fim, o texto esvai enquanto a SignatureOutro (que pinta por cima) assume.
// ─────────────────────────────────────────────────────────────────────────────
export const BORDAO_FRAMES = 75;        // ~2,5s: 7 palavras a 2,76 palavras/s
export const BORDAO_OVERLAP_FRAMES = 16; // segue por baixo da assinatura, sem salto

export const TelaBordao: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const BEAT2 = 34; // a voz chega à 2ª metade da frase (~4 palavras depois)

  // fundo escurece rápido: é uma TELA, não uma legenda por cima da cena
  const escurecer = interpolate(frame, [0, 6], [0, 0.9], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // pancada 1
  const slam1 = spring({ frame, fps, config: { damping: 10, mass: 0.6 } });
  const scale1 = interpolate(slam1, [0, 1], [2.1, 1]);
  const shake1 = frame < 9 ? Math.sin(frame * 3.1) * (1 - frame / 9) * 9 : 0;
  const flash1 = interpolate(frame, [0, 2, 11], [0.85, 0.5, 0], { extrapolateRight: 'clamp' });

  // pancada 2
  const slam2 = spring({ frame: frame - BEAT2, fps, config: { damping: 10, mass: 0.6 } });
  const scale2 = interpolate(slam2, [0, 1], [2.1, 1]);
  const shake2 = frame >= BEAT2 && frame < BEAT2 + 9 ? Math.sin((frame - BEAT2) * 3.1) * (1 - (frame - BEAT2) / 9) * 9 : 0;
  // ⚠️ sem o `frame < BEAT2 ? 0` o clamp da esquerda deixava este clarão ACESO a 0,7
  // desde o frame 0 — a tela abria cinzenta. Visto no fotograma 12, antes de mostrar.
  const flash2 = frame < BEAT2 ? 0 : interpolate(frame, [BEAT2, BEAT2 + 2, BEAT2 + 11], [0.7, 0.4, 0], { extrapolateRight: 'clamp' });
  const linha2Visivel = frame >= BEAT2 ? 1 : 0;

  // risco de luz por baixo, depois da 2ª pancada — o "carimbo" fecha
  const risco = interpolate(frame, [BEAT2 + 12, BEAT2 + 24], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // o TEXTO esvai no fim (a SignatureOutro assume); o fundo escuro fica
  const saidaTexto = interpolate(frame, [BORDAO_FRAMES, BORDAO_FRAMES + BORDAO_OVERLAP_FRAMES], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
      <AbsoluteFill style={{ background: BRAND.bg, opacity: escurecer }} />
      <Audio src={staticFile('sfx/boom.ogg')} volume={0.85} />
      <Sequence from={BEAT2} durationInFrames={Math.round(fps * 0.8)}>
        <Audio src={staticFile('sfx/boom.ogg')} volume={0.6} />
      </Sequence>
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26, opacity: saidaTexto, padding: '0 48px' }}>
        <div style={{
          fontFamily: DISPLAY, fontWeight: 900, fontSize: 96, lineHeight: 1.05, color: BRAND.text,
          textAlign: 'center', transform: `scale(${scale1}) translateX(${shake1}px)`,
          filter: 'drop-shadow(0 0 34px rgba(139,92,246,0.45))',
        }}>DINHEIRO SEM CONTROLE</div>
        <div style={{
          ...gradientText, fontFamily: DISPLAY, fontWeight: 900, fontSize: 108, lineHeight: 1.05,
          textAlign: 'center', opacity: linha2Visivel, transform: `scale(${scale2}) translateX(${shake2}px)`,
          filter: 'drop-shadow(0 0 44px rgba(139,92,246,0.6))',
        }}>É DINHEIRO DOS OUTROS.</div>
        <div style={{
          height: 10, width: `${risco * 620}px`, borderRadius: 5, opacity: risco,
          background: `linear-gradient(90deg, ${BRAND.cyan}, ${BRAND.violet}, ${BRAND.magenta})`,
        }} />
      </div>
      <AbsoluteFill style={{ background: '#fff', opacity: Math.max(flash1, flash2), pointerEvents: 'none' }} />
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ♦ A TELA DO BORDÃO, VARIANTE B — "O ATOR CARIMBANDO" (03/08/2026, a pedido do
// dono para comparar com a A). O boneco oficial das capas entra a carregar um
// CARIMBO gigante acima da cabeça, bate-o no chão — o Palco dá o tremor e o
// clarão calibrados (regra 9) — e no impacto a frase salta ESTAMPADA como um
// selo torto. Mesma duração e mesma saída da variante A.
// ─────────────────────────────────────────────────────────────────────────────
export const TelaBordaoAtor: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const IMPACTO = 28;

  const escurecer = interpolate(frame, [0, 6], [0, 0.92], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const saidaTexto = interpolate(frame, [BORDAO_FRAMES, BORDAO_FRAMES + BORDAO_OVERLAP_FRAMES], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // o ator entra da direita a carregar o carimbo; para, e bate
  const atorX = interpolate(frame, [0, 24], [MEIO + 520, MEIO + 210], { extrapolateRight: 'clamp', easing: Easing.out(Easing.quad) });
  const sw = interpolate(frame, [24, IMPACTO], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.quad) });
  // braços: acima da cabeça a segurar → batida em frente (0 = braço para baixo; 180 = para cima)
  // no fim os braços FECHAM junto ao corpo — a 68° o braço atravessava a moldura
  // do selo (visto no fotograma 52 antes de mostrar)
  const ombroA = interpolate(sw, [0, 1], [168, 44]);
  const ombroB = interpolate(sw, [0, 1], [192, 26]);
  const pernas = frame < 24 ? andar(frame / 3) : andar(8);
  const inclina = interpolate(sw, [0, 1], [-4, 12]);

  // o carimbo: acompanha as mãos no transporte (bem ACIMA da cabeça — colado à
  // cabeça lia-se como um chapéu, visto no fotograma 14), desce em arco, fica no chão
  const carimboX = interpolate(sw, [0, 1], [atorX, MEIO - 150]);
  const carimboY = interpolate(sw, [0, 1], [CHAO - 870, CHAO - 96], { easing: Easing.in(Easing.cubic) });
  const carimboRot = interpolate(sw, [0, 0.6, 1], [0, -14, 0]);

  // o selo com a frase: salta no impacto, com soco (overshoot) e leve rotação
  const pop = spring({ frame: frame - (IMPACTO + 2), fps, config: { damping: 10, mass: 0.5, stiffness: 170 } });
  const seloVisivel = frame >= IMPACTO + 2 ? 1 : 0;
  const seloScale = interpolate(pop, [0, 1], [1.7, 1]);
  const flash = frame < IMPACTO ? 0 : interpolate(frame, [IMPACTO, IMPACTO + 2, IMPACTO + 10], [0.7, 0.4, 0], { extrapolateRight: 'clamp' });
  const risco = interpolate(frame, [IMPACTO + 16, IMPACTO + 28], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: BRAND.bg, opacity: escurecer }} />
      <Sequence from={22} durationInFrames={Math.round(fps * 0.5)}>
        <Audio src={staticFile(resolveShotSfx('whoosh'))} volume={0.5} />
      </Sequence>
      <Sequence from={IMPACTO} durationInFrames={Math.round(fps * 0.8)}>
        <Audio src={staticFile('sfx/boom.ogg')} volume={0.9} />
      </Sequence>

      {/* o palco em baixo — mesmo enquadramento das capas; `em` = o instante da batida */}
      <div style={{ position: 'absolute', bottom: -40, left: (1080 - PALCO_W) / 2, width: PALCO_W, height: PALCO_H, opacity: saidaTexto }}>
        <Palco life={BORDAO_FRAMES} em={IMPACTO / BORDAO_FRAMES} focoX={MEIO - 130} focoY={CHAO - 200}>
          <Chao />
          <g transform={`translate(${carimboX} ${carimboY}) rotate(${carimboRot})`} style={brilho(BRAND.violet, 30)}>
            <circle cy={-186} r={34} fill={PECA} stroke={BRAND.cyan} strokeWidth={7} />
            <rect x={-26} y={-166} width={52} height={112} rx={18} fill={PECA} stroke={BRAND.cyan} strokeWidth={7} />
            <rect x={-180} y={-54} width={360} height={100} rx={16} fill={PECA} stroke={BRAND.violet} strokeWidth={9} />
          </g>
          <Ator
            id="bord"
            x={atorX}
            {...pernas}
            ombroA={ombroA}
            cotoveloA={interpolate(sw, [0, 1], [-14, 18])}
            ombroB={ombroB}
            cotoveloB={interpolate(sw, [0, 1], [14, 10])}
            inclina={inclina}
            cabeca={interpolate(sw, [0, 1], [-8, 10])}
            escala={1.05}
          />
        </Palco>
      </div>

      {/* o SELO estampado com o bordão — torto de propósito, como carimbo real.
          ⚠️ Linhas com quebra CONTROLADA (nowrap por linha): o texto solto partia
          "DOS / OUTROS." em três linhas — visto no fotograma 52 antes de mostrar. */}
      <div style={{
        position: 'absolute', top: 170, left: 0, right: 0, display: 'flex', justifyContent: 'center',
        opacity: seloVisivel * saidaTexto,
      }}>
        <div style={{
          transform: `rotate(-3deg) scale(${seloScale})`,
          border: `12px solid ${BRAND.violet}`, borderRadius: 34, padding: '42px 48px 48px',
          boxShadow: '0 0 70px rgba(139,92,246,0.45), inset 0 0 40px rgba(139,92,246,0.18)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
        }}>
          <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 74, lineHeight: 1.06, color: BRAND.text, textAlign: 'center' }}>
            <div style={{ whiteSpace: 'nowrap' }}>DINHEIRO SEM</div>
            <div style={{ whiteSpace: 'nowrap' }}>CONTROLE</div>
          </div>
          <div style={{
            ...gradientText, fontFamily: DISPLAY, fontWeight: 900, fontSize: 82, lineHeight: 1.06, textAlign: 'center',
            filter: 'drop-shadow(0 0 40px rgba(139,92,246,0.55))',
          }}>
            <div style={{ whiteSpace: 'nowrap' }}>É DINHEIRO</div>
            <div style={{ whiteSpace: 'nowrap' }}>DOS OUTROS.</div>
          </div>
          <div style={{
            height: 9, width: `${risco * 520}px`, borderRadius: 5, opacity: risco,
            background: `linear-gradient(90deg, ${BRAND.cyan}, ${BRAND.violet}, ${BRAND.magenta})`,
          }} />
        </div>
      </div>

      <AbsoluteFill style={{ background: '#fff', opacity: flash, pointerEvents: 'none' }} />
    </AbsoluteFill>
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
 * descartado — sumir com a chamada do vídeo seria pior que mostrá-la
 * cedo demais. Ele nunca é antecipado às custas do piso do shot anterior, e o
 * `app` mantém o seu piso de 2,5s, que é regra do dono.
 * Efeito colateral aceito: o shot anterior encurta um pouco (na CTA do fixture, o
 * `app` cai de ~4,5s para ~3,7s — acima do piso).
 */
const SHOT_MIN_LIFE_SEC = 1.2;
const APP_MIN_LIFE_SEC = 2.5; // espelha APP_FLOOR_SEC de schema-short.js
// A pílula da chamada (ver CTA_PILULA) é a CHAMADA PARA AÇÃO do vídeo — o único momento que
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
// viaja numa curva até a pílula da chamada (`CTA_PILULA`), PRESSIONA (pílula afunda +
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
      {/* a pílula da chamada (mesmo texto e mesmo estilo da cena CTA — ver CTA_PILULA) */}
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
          {CTA_PILULA}
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

// ─── LEVA 1 DAS IMAGENS NOVAS (IMPLEMENTACAO20 §20.2 B1, 31/07/2026) ─────────
// As quatro famílias de tema que estavam COMPLETAMENTE vazias no catálogo: tempo,
// decisão, dívida e proteção. Mesmo desenho das antigas: SVG puro, cores da marca,
// tudo movido por `life` (a vida do shot) para nunca depender de relógio real.

// ampulheta: a areia desce de cima para baixo ao longo do shot (o tempo a passar,
// adiar custa). Casa com 'ding'.
const MetaHourglass: React.FC<{ life: number }> = ({ life }) => {
  const frame = useCurrentFrame();
  const W = 640, H = 620, cx = W / 2;
  const topY = 110, midY = 320, botY = 530, halfW = 160;
  const p = interpolate(frame, [0, life * 0.92], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // areia de cima: a superfície desce até ao gargalo
  const topoAreia = topY + (midY - topY) * p;
  const meiaLarguraCima = halfW * ((midY - topoAreia) / (midY - topY));
  // monte de baixo: cresce e alarga
  const alturaMonte = (botY - midY) * 0.78 * p;
  const meiaLarguraMonte = halfW * Math.min(1, p * 1.15);

  return (
    <svg width={W} height={H}>
      <defs>
        <linearGradient id="hgl-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={BRAND.cyan} />
          <stop offset="100%" stopColor={BRAND.magenta} />
        </linearGradient>
      </defs>
      {/* travessas de cima e de baixo */}
      <rect x={cx - halfW - 26} y={topY - 34} width={(halfW + 26) * 2} height={26} rx={13} fill={BRAND.sub} opacity={0.55} />
      <rect x={cx - halfW - 26} y={botY + 8} width={(halfW + 26) * 2} height={26} rx={13} fill={BRAND.sub} opacity={0.55} />
      {/* o vidro */}
      <polygon points={`${cx - halfW},${topY} ${cx + halfW},${topY} ${cx},${midY}`} fill="none" stroke={BRAND.sub} strokeWidth={7} strokeLinejoin="round" opacity={0.7} />
      <polygon points={`${cx - halfW},${botY} ${cx + halfW},${botY} ${cx},${midY}`} fill="none" stroke={BRAND.sub} strokeWidth={7} strokeLinejoin="round" opacity={0.7} />
      {/* areia que ainda não caiu */}
      {p < 0.99 && (
        <polygon
          points={`${cx - meiaLarguraCima},${topoAreia} ${cx + meiaLarguraCima},${topoAreia} ${cx},${midY}`}
          fill="url(#hgl-g)"
        />
      )}
      {/* o fio de areia a cair */}
      {p > 0.02 && p < 0.97 && (
        <rect x={cx - 5} y={midY} width={10} height={Math.max(0, botY - alturaMonte - midY)} fill={BRAND.cyan} opacity={0.85} />
      )}
      {/* o monte que se forma em baixo */}
      {p > 0.03 && (
        <polygon
          points={`${cx - meiaLarguraMonte},${botY} ${cx + meiaLarguraMonte},${botY} ${cx},${botY - alturaMonte}`}
          fill="url(#hgl-g)"
        />
      )}
    </svg>
  );
};

// balanca: dois pratos, e o da direita vai ficando mais pesado até desequilibrar
// (comparar duas opções — uma delas ganha). Casa com 'thud'.
const MetaScale: React.FC<{ life: number }> = ({ life }) => {
  const frame = useCurrentFrame();
  const W = 760, H = 560, cx = W / 2, eixoY = 210, braco = 230;
  const graus = interpolate(frame, [life * 0.12, life * 0.72], [0, 15], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const a = (graus * Math.PI) / 180;
  const dx = Math.cos(a) * braco, dy = Math.sin(a) * braco;
  const esq = { x: cx - dx, y: eixoY - dy };
  const dir = { x: cx + dx, y: eixoY + dy };
  const fioEsq = 90, fioDir = 90;

  const Prato: React.FC<{ x: number; y: number; moedas: number }> = ({ x, y, moedas }) => (
    <g>
      <line x1={x} y1={y} x2={x} y2={y + fioEsq} stroke={BRAND.sub} strokeWidth={4} opacity={0.8} />
      <path d={`M${x - 74},${y + fioEsq} Q${x},${y + fioEsq + 46} ${x + 74},${y + fioEsq}`} fill="none" stroke="url(#bal-g)" strokeWidth={9} strokeLinecap="round" />
      {[0, 1, 2].map((i) => (i < moedas ? (
        <circle key={i} cx={x - 26 + i * 26} cy={y + fioEsq - 16} r={17} fill="url(#bal-g)" stroke={BRAND.cyan} strokeWidth={3} />
      ) : null))}
    </g>
  );

  return (
    <svg width={W} height={H}>
      <defs>
        <linearGradient id="bal-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={BRAND.cyan} />
          <stop offset="100%" stopColor={BRAND.violet} />
        </linearGradient>
      </defs>
      {/* coluna e base */}
      <rect x={cx - 9} y={eixoY} width={18} height={250} rx={8} fill={BRAND.sub} opacity={0.6} />
      <rect x={cx - 96} y={455} width={192} height={22} rx={11} fill={BRAND.sub} opacity={0.6} />
      {/* braço */}
      <line x1={esq.x} y1={esq.y} x2={dir.x} y2={dir.y} stroke="url(#bal-g)" strokeWidth={12} strokeLinecap="round" />
      <circle cx={cx} cy={eixoY} r={17} fill={BRAND.violet} stroke={BRAND.cyan} strokeWidth={4} />
      {/* pratos: o da direita enche */}
      <Prato x={esq.x} y={esq.y} moedas={1} />
      <Prato x={dir.x} y={dir.y} moedas={Math.min(3, 1 + Math.floor(interpolate(frame, [0, life * 0.72], [0, 3], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })))} />
    </svg>
  );
};

// bola-de-ferro: a bola presa por corrente cresce e afunda o chão (a dívida que
// prende e vai pesando). Casa com 'thud'.
const MetaBallChain: React.FC<{ life: number }> = ({ life }) => {
  const frame = useCurrentFrame();
  const W = 700, H = 560, cx = W / 2 + 40, chao = 430;
  const p = interpolate(frame, [0, life * 0.9], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const raio = 52 + p * 46;
  const afunda = p * 34;                      // o chão cede debaixo da bola
  const centroY = chao - raio + afunda;
  const elos = [0, 1, 2, 3, 4, 5];
  return (
    <svg width={W} height={H}>
      <defs>
        <linearGradient id="chn-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={BRAND.violet} />
          <stop offset="100%" stopColor={BRAND.magenta} />
        </linearGradient>
      </defs>
      {/* o chão a ceder: uma curva que afunda debaixo da bola */}
      <path
        d={`M60,${chao} Q${cx},${chao + afunda * 1.8} ${W - 60},${chao}`}
        fill="none" stroke={BRAND.sub} strokeWidth={8} strokeLinecap="round" opacity={0.55}
      />
      {/* a corrente, do canto de cima até à bola.
          Elos GROSSOS e claros de propósito: a 1ª versão usava BRAND.sub fino e
          sumia no fundo escuro (visto na galeria em 31/07). */}
      {elos.map((i) => {
        const t = i / (elos.length - 1);
        const x = 150 + (cx - raio * 0.7 - 150) * t;
        const y = 130 + (centroY - 130) * t;
        return <ellipse key={i} cx={x} cy={y} rx={20} ry={13} fill="none" stroke={BRAND.text} strokeWidth={9} opacity={0.75} transform={`rotate(${i % 2 ? 40 : -40} ${x} ${y})`} />;
      })}
      {/* a bola. NÃO pode ser quase preta: o fundo do canal já é escuro e a bola
          desaparecia. Ferro escuro, mas acima do fundo, com aro forte e brilho. */}
      <circle cx={cx} cy={centroY} r={raio} fill="#2b3242" stroke="url(#chn-g)" strokeWidth={10} />
      <circle cx={cx - raio * 0.3} cy={centroY - raio * 0.32} r={raio * 0.3} fill={BRAND.cyan} opacity={0.22} />
      <circle cx={cx - raio * 0.38} cy={centroY - raio * 0.4} r={raio * 0.12} fill={BRAND.text} opacity={0.5} />
      <rect x={cx - 13} y={centroY - raio - 22} width={26} height={26} rx={8} fill={BRAND.text} opacity={0.75} />
    </svg>
  );
};

// guarda-chuva: a chuva bate e ESCORRE pelos lados; debaixo, o dinheiro fica seco
// (a reserva de emergência a proteger). Casa com 'whoosh'.
const MetaUmbrella: React.FC<{ life: number }> = ({ life }) => {
  const frame = useCurrentFrame();
  const W = 720, H = 600, cx = W / 2;
  const copaY = 300, copaR = 210;
  const abre = interpolate(frame, [0, life * 0.22], [0.35, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const pingos = [-260, -190, -120, -55, 10, 75, 140, 205, 268];
  return (
    <svg width={W} height={H}>
      <defs>
        <linearGradient id="umb-g" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={BRAND.cyan} />
          <stop offset="50%" stopColor={BRAND.violet} />
          <stop offset="100%" stopColor={BRAND.magenta} />
        </linearGradient>
      </defs>
      {/* a chuva: quem cai fora da copa vai até ao chão; quem bate na copa escorre */}
      {pingos.map((ox, i) => {
        const protegido = Math.abs(ox) < copaR * abre;
        const ciclo = (frame + i * 9) % Math.max(1, Math.round(life * 0.42));
        const t = ciclo / Math.max(1, Math.round(life * 0.42));
        const x = cx + ox;
        const yFim = protegido ? copaY - Math.sqrt(Math.max(0, 1 - (ox / (copaR * abre)) ** 2)) * 86 : 545;
        const y = 40 + (yFim - 40) * t;
        const desvio = protegido && t > 0.92 ? (ox < 0 ? -34 : 34) : 0;
        return <rect key={i} x={x + desvio - 3} y={y} width={6} height={26} rx={3} fill={BRAND.cyan} opacity={0.75} />;
      })}
      {/* a copa */}
      <path
        d={`M${cx - copaR * abre},${copaY} A${copaR * abre},${96 * abre} 0 0 1 ${cx + copaR * abre},${copaY} Z`}
        fill="url(#umb-g)"
      />
      {/* as pontas da copa */}
      <path d={`M${cx - copaR * abre},${copaY} Q${cx - copaR * abre * 0.5},${copaY + 26} ${cx},${copaY} Q${cx + copaR * abre * 0.5},${copaY + 26} ${cx + copaR * abre},${copaY}`} fill="none" stroke={BRAND.bg} strokeWidth={6} opacity={0.5} />
      {/* cabo */}
      <rect x={cx - 6} y={copaY} width={12} height={170} rx={6} fill={BRAND.sub} opacity={0.85} />
      <path d={`M${cx - 6},${copaY + 170} Q${cx - 6},${copaY + 206} ${cx - 44},${copaY + 200}`} fill="none" stroke={BRAND.sub} strokeWidth={12} strokeLinecap="round" opacity={0.85} />
      {/* chão, para as moedas assentarem em vez de flutuarem */}
      <line x1={cx - 200} y1={528} x2={cx + 200} y2={528} stroke={BRAND.sub} strokeWidth={7} strokeLinecap="round" opacity={0.45} />
      {/* o dinheiro protegido, assente no chão e bem debaixo da copa (que vai até
          ±210). Fica à DIREITA do cabo porque o punho curva para a esquerda —
          centrá-lo fazia as moedas atravessarem o cabo. */}
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${cx + 80} ${512 - i * 26})`}>
          <ellipse cx={0} cy={0} rx={44} ry={14} fill={BRAND.violet} stroke={BRAND.cyan} strokeWidth={3} />
        </g>
      ))}
    </svg>
  );
};

// ─── LEVA 2 DAS IMAGENS NOVAS (IMPLEMENTACAO20 §20.2 B1, 31/07/2026) ─────────
// Fecha a família DÍVIDA/PESO (ratoeira, mochila-pedras, areia-movedica) e reforça
// ERRO/QUEDA (domino). Estilo aprovado pelo dono na leva 1.

// ratoeira: a isca está lá, e a barra FECHA de repente (a armadilha do rotativo e
// do pagamento mínimo). Casa com 'boom'.
const MetaMousetrap: React.FC<{ life: number }> = ({ life }) => {
  const frame = useCurrentFrame();
  const W = 780, H = 540;
  const baseX = 110, baseY = 330, baseW = 560, baseH = 92;
  const pivo = { x: baseX + 52, y: baseY };
  // FECHA CEDO (20%→30% da vida), de propósito. Na 1ª versão fechava aos 60% e num
  // Short a imagem dura 1-2s: o espectador via só a barra aberta, que parecia um
  // risco solto. O sentido desta imagem É o estalo — ele tem de acontecer à vista.
  const graus = interpolate(frame, [life * 0.2, life * 0.3], [-116, -4], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic),
  });
  const fechou = frame > life * 0.3;
  const barra = 500;
  const a = (graus * Math.PI) / 180;
  const pontaX = pivo.x + Math.cos(a) * barra;
  const pontaY = pivo.y + Math.sin(a) * barra;
  const iscaX = baseX + baseW * 0.68;
  return (
    <svg width={W} height={H}>
      <defs>
        <linearGradient id="rat-g" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={BRAND.magenta} />
          <stop offset="100%" stopColor={BRAND.violet} />
        </linearGradient>
      </defs>
      {/* a tábua */}
      <rect x={baseX} y={baseY} width={baseW} height={baseH} rx={22} fill="#2b3242" stroke="url(#rat-g)" strokeWidth={9} />
      {/* a isca. Desenhada ANTES da barra: depois do estalo a barra fica POR CIMA
          dela, que é o que faz ler "ficou preso". */}
      <circle cx={iscaX} cy={baseY - 2} r={34} fill={BRAND.yellow} stroke="#b59b00" strokeWidth={5} />
      <text x={iscaX} y={baseY + 11} fontSize={34} fontWeight={900} textAnchor="middle" fill="#0d1117">$</text>
      {/* a barra que fecha */}
      <line x1={pivo.x} y1={pivo.y} x2={pontaX} y2={pontaY} stroke={BRAND.text} strokeWidth={17} strokeLinecap="round" />
      {/* a mola */}
      <circle cx={pivo.x} cy={pivo.y} r={28} fill="none" stroke={BRAND.cyan} strokeWidth={9} />
      <circle cx={pivo.x} cy={pivo.y} r={13} fill={BRAND.cyan} />
      {/* o estalo */}
      {fechou && frame < life * 0.46 && [0, 1, 2, 3, 4].map((i) => {
        const t = interpolate(frame, [life * 0.3, life * 0.46], [0, 1], { extrapolateRight: 'clamp' });
        const ang = (-30 - i * 30) * Math.PI / 180;
        return <circle key={i} cx={iscaX + Math.cos(ang) * 90 * t} cy={baseY + Math.sin(ang) * 90 * t} r={12 * (1 - t)} fill={BRAND.yellow} />;
      })}
    </svg>
  );
};

// mochila-pedras: as pedras vão caindo dentro da mochila e ela AFUNDA (o peso que
// se carrega todo mês). Casa com 'thud'.
const MetaBackpack: React.FC<{ life: number }> = ({ life }) => {
  const frame = useCurrentFrame();
  const W = 720, H = 660, cx = W / 2;
  const topo = 190, larg = 330, alt = 320, chao = 600;
  const pedras = [0, 1, 2, 3];
  const quantas = interpolate(frame, [0, life * 0.85], [0, pedras.length], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const afunda = interpolate(frame, [0, life * 0.85], [0, 54], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const y0 = topo + afunda;
  return (
    <svg width={W} height={H}>
      <defs>
        <linearGradient id="bkp-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={BRAND.cyan} />
          <stop offset="100%" stopColor={BRAND.violet} />
        </linearGradient>
      </defs>
      {/* chão, para o peso ter onde assentar */}
      <line x1={cx - 250} y1={chao} x2={cx + 250} y2={chao} stroke={BRAND.sub} strokeWidth={8} strokeLinecap="round" opacity={0.45} />
      {/* PEGA no topo — UMA só e pequena.
          Na 1ª versão havia duas alças em arco por cima e o conjunto lia-se como um
          COELHO (orelhas). Erro apanhado na galeria em 31/07. */}
      <path d={`M${cx - 46},${y0 + 6} Q${cx},${y0 - 62} ${cx + 46},${y0 + 6}`} fill="none" stroke={BRAND.sub} strokeWidth={16} strokeLinecap="round" opacity={0.9} />
      {/* o corpo */}
      <rect x={cx - larg / 2} y={y0} width={larg} height={alt} rx={54} fill="#2b3242" stroke="url(#bkp-g)" strokeWidth={9} />
      {/* a aba de cima, que dá a leitura de "mochila" sem cruzar nada */}
      <path d={`M${cx - larg / 2 + 10},${y0 + 62} H${cx + larg / 2 - 10}`} stroke="url(#bkp-g)" strokeWidth={7} opacity={0.7} />
      {/* AS PEDRAS EMPILHADAS NO FUNDO — é o fundo que carrega o peso.
          Na 1ª versão flutuavam a meio do corpo e cruzavam com faixas e bolso: liam-se
          como dentes brancos. Agora empilham de baixo para cima, em cinza-pedra. */}
      {pedras.map((i) => {
        if (i >= quantas) return null;
        const fila = Math.floor(i / 2);
        const px = cx + (i % 2 === 0 ? -62 : 62) + fila * 30;
        const py = y0 + alt - 58 - fila * 74;
        return (
          <polygon
            key={i}
            points={`${px - 48},${py + 26} ${px - 26},${py - 30} ${px + 32},${py - 32} ${px + 50},${py + 14} ${px + 8},${py + 40}`}
            fill={BRAND.sub} stroke={BRAND.text} strokeWidth={4} opacity={0.95}
          />
        );
      })}
    </svg>
  );
};

// areia-movedica: quanto mais tempo passa, mais o dinheiro AFUNDA na areia (a
// dívida em que quanto mais se mexe, mais se afunda). Casa com 'slide'.
// Cor de AREIA de propósito: com o roxo/magenta do 'ralo' ficaria parecida demais.
const MetaQuicksand: React.FC<{ life: number }> = ({ life }) => {
  const frame = useCurrentFrame();
  // LARGO DE PROPÓSITO (1160 > 1080 do vídeo): a areia tem de SANGRAR pelos lados
  // e pelo fundo. Na 1ª versão o svg tinha 760 e a areia aparecia como um BLOCO
  // amarelo com cantos retos no meio do ecrã — parecia uma barra, não chão.
  const W = 1160, H = 660, cx = W / 2;
  const superficie = 330;
  const p = interpolate(frame, [0, life * 0.9], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const cy = 210 + 250 * p;                       // afunda até quase desaparecer
  const tremor = Math.sin(frame / 5) * 8 * (1 - p);
  return (
    <svg width={W} height={H}>
      <defs>
        <linearGradient id="qsd-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={BRAND.yellow} stopOpacity={0.9} />
          <stop offset="60%" stopColor="#6b5c10" stopOpacity={0.98} />
          {/* desvanece no fundo, senão a areia acaba num corte reto (regra 2) */}
          <stop offset="100%" stopColor="#6b5c10" stopOpacity={0} />
        </linearGradient>
      </defs>
      {/* a moeda a afundar — desenhada ANTES da areia, para a areia a tapar */}
      <g transform={`translate(${cx + tremor} ${cy})`}>
        <circle cx={0} cy={0} r={72} fill={BRAND.violet} stroke={BRAND.cyan} strokeWidth={8} />
        <text x={0} y={26} fontSize={72} fontWeight={900} textAnchor="middle" fill={BRAND.text}>$</text>
      </g>
      {/* a areia: dunas, largura toda, até ao fundo */}
      <path
        d={`M0,${superficie + 30}
            C${W * 0.14},${superficie - 16} ${W * 0.28},${superficie + 8} ${W * 0.42},${superficie + 2}
            C${W * 0.56},${superficie - 4} ${W * 0.7},${superficie + 30} ${W * 0.84},${superficie + 12}
            C${W * 0.92},${superficie + 2} ${W * 0.96},${superficie + 10} ${W},${superficie + 4}
            L${W},${H} L0,${H} Z`}
        fill="url(#qsd-g)"
      />
      {/* ondas à volta do ponto onde ele afunda */}
      {[0, 1, 2].map((i) => {
        const t = ((frame / Math.max(1, life)) * 2 + i * 0.33) % 1;
        return (
          <ellipse
            key={i} cx={cx} cy={superficie + 16} rx={80 + t * 210} ry={16 + t * 34}
            fill="none" stroke={BRAND.bg} strokeWidth={7} opacity={(1 - t) * 0.45}
          />
        );
      })}
    </svg>
  );
};

// domino: a primeira peça cai e derruba TODAS as outras, uma a uma (um erro puxa o
// seguinte). Casa com 'click'.
const MetaDominoes: React.FC<{ life: number }> = ({ life }) => {
  const frame = useCurrentFrame();
  const W = 880, H = 520;
  const chao = 400, pecaW = 34, pecaH = 132, passo = 98;
  const pecas = [0, 1, 2, 3, 4, 5, 6];
  return (
    <svg width={W} height={H}>
      <defs>
        <linearGradient id="dom-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={BRAND.cyan} />
          <stop offset="100%" stopColor={BRAND.magenta} />
        </linearGradient>
      </defs>
      <line x1={70} y1={chao} x2={W - 60} y2={chao} stroke={BRAND.sub} strokeWidth={8} strokeLinecap="round" opacity={0.5} />
      {pecas.map((i) => {
        const inicio = life * (0.1 + i * 0.085);
        const graus = interpolate(frame, [inicio, inicio + life * 0.11], [0, 76], {
          extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.quad),
        });
        const x = 110 + i * passo;
        return (
          <g key={i} transform={`rotate(${graus} ${x} ${chao})`}>
            <rect x={x - pecaW / 2} y={chao - pecaH} width={pecaW} height={pecaH} rx={7} fill="url(#dom-g)" stroke={BRAND.text} strokeWidth={3} />
            <circle cx={x} cy={chao - pecaH * 0.72} r={5} fill={BRAND.bg} opacity={0.55} />
            <circle cx={x} cy={chao - pecaH * 0.28} r={5} fill={BRAND.bg} opacity={0.55} />
          </g>
        );
      })}
    </svg>
  );
};

// ─── LEVA 3 DAS IMAGENS NOVAS (IMPLEMENTACAO20 §20.2 B1, 31/07/2026) ─────────
// Fecha ERRO/QUEDA (castelo-cartas) e RISCO/OSCILAÇÃO (gangorra, corda-bamba), e
// reforça TEMPO (relogio). Desenhadas já com as 4 regras que a leva 2 ensinou:
// nada quase-preto · o chão sangra para fora do quadro · o instante-chave acontece
// no primeiro terço · nada de duas formas simétricas por cima de um corpo.

// castelo-cartas: parece firme e VEM TODO ABAIXO (o plano que não tinha base).
// Casa com 'thud'.
const MetaCardHouse: React.FC<{ life: number }> = ({ life }) => {
  const frame = useCurrentFrame();
  const W = 1120, H = 640, cx = W / 2, chao = 520;
  const cartaW = 26, cartaH = 150;
  // as cartas, de baixo para cima. `d` é a ordem em que caem (o topo primeiro).
  const bases = [cx - 210, cx, cx + 210];
  const cimas = [cx - 105, cx + 105];
  type C = { x: number; y: number; rot: number; d: number; horizontal?: boolean };
  const cartas: C[] = [];
  bases.forEach((px, i) => {
    cartas.push({ x: px - 42, y: chao, rot: 16, d: 4 + i });
    cartas.push({ x: px + 42, y: chao, rot: -16, d: 4 + i });
  });
  bases.forEach((px, i) => cartas.push({ x: px, y: chao - cartaH - 4, rot: 0, d: 3 + i, horizontal: true }));
  cimas.forEach((px, i) => {
    cartas.push({ x: px - 42, y: chao - cartaH - 22, rot: 16, d: 1 + i });
    cartas.push({ x: px + 42, y: chao - cartaH - 22, rot: -16, d: 1 + i });
  });
  cartas.push({ x: cx, y: chao - cartaH * 2 - 26, rot: 0, d: 0, horizontal: true });

  return (
    <svg width={W} height={H}>
      <defs>
        <linearGradient id="cas-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={BRAND.cyan} />
          <stop offset="100%" stopColor={BRAND.violet} />
        </linearGradient>
      </defs>
      {/* o chão atravessa o quadro todo */}
      <line x1={0} y1={chao} x2={W} y2={chao} stroke={BRAND.sub} strokeWidth={9} opacity={0.5} />
      {cartas.map((c, i) => {
        // DESABA CEDO: começa aos 22% e está no chão aos 55% (regra 3 da leva 2)
        const inicio = life * (0.22 + c.d * 0.035);
        const q = interpolate(frame, [inicio, inicio + life * 0.16], [0, 1], {
          extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.quad),
        });
        // As HORIZONTAIS quase não rodam. Na 1ª versão rodavam 86° como as outras e
        // ficavam de pé, atravessando a linha do chão — uma barra vertical abaixo do
        // solo. Elas caem de chapa; quem tomba são as cartas em pé.
        const alvo = c.horizontal ? (c.rot >= 0 ? 10 : -10) : (c.rot >= 0 ? 86 : -86);
        const tomba = c.rot + q * (alvo - c.rot);
        const desce = q * (chao - c.y - (c.horizontal ? 12 : 0));
        const desliza = q * (c.x < cx ? -70 : 70);
        return (
          <g key={i} transform={`translate(${desliza} ${desce}) rotate(${tomba} ${c.x} ${c.y})`}>
            <rect
              x={c.x - (c.horizontal ? 96 : cartaW / 2)}
              y={c.y - (c.horizontal ? 16 : cartaH)}
              width={c.horizontal ? 192 : cartaW}
              height={c.horizontal ? 16 : cartaH}
              rx={6} fill="url(#cas-g)" stroke={BRAND.text} strokeWidth={3} opacity={0.95}
            />
          </g>
        );
      })}
    </svg>
  );
};

// gangorra: o sobe e desce que NÃO PARA (volatilidade do dia a dia).
// Diferente da `balanca` de propósito: ali os pratos PENDURAM e o fiel para de um
// lado; aqui a prancha assenta num apoio e oscila para sempre. Casa com 'whoosh'.
const MetaSeesaw: React.FC<{ life: number }> = ({ life }) => {
  const frame = useCurrentFrame();
  const W = 1000, H = 560, cx = W / 2, chao = 470, apoioY = 350;
  // já entra a oscilar — o movimento é o sentido da imagem (regra 3)
  const graus = Math.sin(frame / 11) * 19;
  const a = (graus * Math.PI) / 180;
  const meia = 330;
  const esq = { x: cx - Math.cos(a) * meia, y: apoioY - Math.sin(a) * meia };
  const dir = { x: cx + Math.cos(a) * meia, y: apoioY + Math.sin(a) * meia };
  const Moeda: React.FC<{ x: number; y: number }> = ({ x, y }) => (
    <g transform={`translate(${x} ${y - 40})`}>
      <circle cx={0} cy={0} r={34} fill={BRAND.yellow} stroke="#b59b00" strokeWidth={5} />
      <text x={0} y={12} fontSize={34} fontWeight={900} textAnchor="middle" fill="#0d1117">$</text>
    </g>
  );
  return (
    <svg width={W} height={H}>
      <defs>
        <linearGradient id="gan-g" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={BRAND.cyan} />
          <stop offset="100%" stopColor={BRAND.magenta} />
        </linearGradient>
      </defs>
      <line x1={0} y1={chao} x2={W} y2={chao} stroke={BRAND.sub} strokeWidth={9} opacity={0.5} />
      {/* o apoio: um triângulo cheio e grande — é o que distingue da balança */}
      <polygon points={`${cx - 82},${chao} ${cx + 82},${chao} ${cx},${apoioY + 6}`} fill="#2b3242" stroke="url(#gan-g)" strokeWidth={8} />
      {/* a prancha */}
      <line x1={esq.x} y1={esq.y} x2={dir.x} y2={dir.y} stroke="url(#gan-g)" strokeWidth={22} strokeLinecap="round" />
      {/* as moedas assentam EM CIMA da prancha (não penduradas) */}
      <Moeda x={esq.x + 40} y={esq.y + 14} />
      <Moeda x={dir.x - 40} y={dir.y + 14} />
    </svg>
  );
};

// corda-bamba: atravessar sem rede, e a corda cede debaixo do peso (o orçamento no
// limite). Casa com 'whoosh'.
const MetaTightrope: React.FC<{ life: number }> = ({ life }) => {
  const frame = useCurrentFrame();
  const W = 1080, H = 620, chao = 540;
  const posteE = 130, posteD = W - 130, topo = 250;
  const p = interpolate(frame, [0, life * 0.88], [0.12, 0.84], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const x = posteE + (posteD - posteE) * p;
  // a corda cede mais quanto mais perto do meio
  const cede = 110 * Math.sin(p * Math.PI);
  const y = topo + cede;
  const oscila = Math.sin(frame / 6) * 11;
  return (
    <svg width={W} height={H}>
      <defs>
        <linearGradient id="cor-g" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={BRAND.cyan} />
          <stop offset="100%" stopColor={BRAND.magenta} />
        </linearGradient>
      </defs>
      <line x1={0} y1={chao} x2={W} y2={chao} stroke={BRAND.sub} strokeWidth={9} opacity={0.45} />
      {/* os dois postes */}
      {[posteE, posteD].map((px) => (
        <rect key={px} x={px - 13} y={topo} width={26} height={chao - topo} rx={12} fill="#2b3242" stroke={BRAND.sub} strokeWidth={5} />
      ))}
      {/* A corda como DUAS RETAS até ao ponto onde ele pisa.
          A 1ª versão usava uma curva quadrática com o ponto de controlo na posição
          dele — mas uma Bézier NÃO passa pelo ponto de controlo, e a moeda aparecia
          POR BAIXO da corda. Com duas retas o vértice é exatamente onde ele está. */}
      <path
        d={`M${posteE},${topo} L${x},${y} L${posteD},${topo}`}
        fill="none" stroke="url(#cor-g)" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round"
      />
      {/* quem atravessa: assenta EM CIMA da corda (o raio da moeda acima do vértice) */}
      <g transform={`translate(${x} ${y}) rotate(${oscila})`}>
        <line x1={-135} y1={-92} x2={135} y2={-92} stroke={BRAND.text} strokeWidth={9} strokeLinecap="round" opacity={0.9} />
        <circle cx={0} cy={-46} r={40} fill={BRAND.violet} stroke={BRAND.cyan} strokeWidth={6} />
        <text x={0} y={-32} fontSize={40} fontWeight={900} textAnchor="middle" fill={BRAND.text}>$</text>
      </g>
    </svg>
  );
};

// relogio: os ponteiros correm e o mostrador vai FICANDO VERMELHO (o prazo a
// apertar). Diferente da `ampulheta`: ali é areia a cair, aqui é o relógio a girar.
// Casa com 'ding'.
const MetaClock: React.FC<{ life: number }> = ({ life }) => {
  const frame = useCurrentFrame();
  const W = 640, H = 640, cx = W / 2, cy = H / 2, r = 220;
  const p = interpolate(frame, [0, life], [0, 1], { extrapolateRight: 'clamp' });
  const minuto = p * 360 * 3;      // corre depressa — o tempo foge
  const hora = p * 360 * 0.55;
  const arco = (a: number) => {
    const rad = ((a - 90) * Math.PI) / 180;
    return { x: cx + Math.cos(rad) * (r - 16), y: cy + Math.sin(rad) * (r - 16) };
  };
  const fim = arco(p * 359.9);
  const grande = p * 359.9 > 180 ? 1 : 0;
  return (
    <svg width={W} height={H}>
      <defs>
        <linearGradient id="rel-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={BRAND.cyan} />
          <stop offset="100%" stopColor={BRAND.magenta} />
        </linearGradient>
      </defs>
      {/* mostrador */}
      <circle cx={cx} cy={cy} r={r} fill="#2b3242" stroke="url(#rel-g)" strokeWidth={12} />
      {/* o arco que se enche à medida que o tempo passa */}
      {p > 0.01 && (
        <path
          d={`M${cx},${cy - (r - 16)} A${r - 16},${r - 16} 0 ${grande} 1 ${fim.x},${fim.y}`}
          fill="none" stroke={BRAND.magenta} strokeWidth={16} strokeLinecap="round" opacity={0.85}
        />
      )}
      {/* marcas das horas */}
      {Array.from({ length: 12 }).map((_, i) => {
        const rad = ((i * 30 - 90) * Math.PI) / 180;
        const grosso = i % 3 === 0;
        return (
          <line
            key={i}
            x1={cx + Math.cos(rad) * (r - 46)} y1={cy + Math.sin(rad) * (r - 46)}
            x2={cx + Math.cos(rad) * (r - 74)} y2={cy + Math.sin(rad) * (r - 74)}
            stroke={BRAND.text} strokeWidth={grosso ? 10 : 5} opacity={grosso ? 0.9 : 0.45} strokeLinecap="round"
          />
        );
      })}
      {/* ponteiros */}
      <g transform={`rotate(${hora} ${cx} ${cy})`}>
        <rect x={cx - 8} y={cy - 108} width={16} height={116} rx={8} fill={BRAND.text} />
      </g>
      <g transform={`rotate(${minuto} ${cx} ${cy})`}>
        <rect x={cx - 6} y={cy - 168} width={12} height={176} rx={6} fill={BRAND.cyan} />
      </g>
      <circle cx={cx} cy={cy} r={18} fill={BRAND.magenta} stroke={BRAND.text} strokeWidth={5} />
    </svg>
  );
};

// ─── LEVA 4 DAS IMAGENS NOVAS (IMPLEMENTACAO20 §20.2 B1, 31/07/2026) ─────────
// Fecha TEMPO/ATRASO (vela, trem-perdido) e DECIDIR/COMPARAR (bifurcacao,
// duas-portas). Já desenhadas com as 6 regras das levas anteriores.

// vela: a vela queima e ENCOLHE à vista (o tempo a arder enquanto se adia).
// Diferente da ampulheta (areia) e do relogio (mostrador). Casa com 'sparkle'.
const MetaCandle: React.FC<{ life: number }> = ({ life }) => {
  const frame = useCurrentFrame();
  const W = 660, H = 700, cx = W / 2, mesa = 600;
  const p = interpolate(frame, [0, life * 0.85], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const topo = 190 + p * 300;                 // encolhe DEPRESSA — o tempo é o assunto
  const tremula = 1 + Math.sin(frame / 3.5) * 0.09;
  return (
    <svg width={W} height={H}>
      <defs>
        <linearGradient id="vel-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={BRAND.text} />
          <stop offset="100%" stopColor={BRAND.violet} />
        </linearGradient>
        <linearGradient id="vel-f" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={BRAND.yellow} />
          <stop offset="100%" stopColor={BRAND.magenta} />
        </linearGradient>
      </defs>
      {/* a mesa atravessa o quadro */}
      <line x1={0} y1={mesa} x2={W} y2={mesa} stroke={BRAND.sub} strokeWidth={9} opacity={0.5} />
      {/* pires */}
      <ellipse cx={cx} cy={mesa - 6} rx={126} ry={22} fill="#2b3242" stroke={BRAND.sub} strokeWidth={6} />
      {/* o corpo da vela */}
      <rect x={cx - 56} y={topo} width={112} height={mesa - 16 - topo} rx={18} fill="url(#vel-g)" opacity={0.95} />
      {/* cera a escorrer pelo lado */}
      <path d={`M${cx - 52},${topo + 26} q-16,44 4,84 q16,26 0,44`} fill="none" stroke={BRAND.text} strokeWidth={11} strokeLinecap="round" opacity={0.55} />
      {/* pavio */}
      <rect x={cx - 4} y={topo - 24} width={8} height={26} rx={4} fill="#2b3242" />
      {/* a chama */}
      <g transform={`translate(${cx} ${topo - 28}) scale(${tremula})`}>
        <path d="M0,-86 C36,-46 34,-16 0,0 C-34,-16 -36,-46 0,-86 Z" fill="url(#vel-f)" />
        <path d="M0,-46 C15,-26 14,-10 0,0 C-14,-10 -15,-26 0,-46 Z" fill={BRAND.text} opacity={0.65} />
      </g>
    </svg>
  );
};

// trem-perdido: o comboio ARRANCA logo no início e some, e o dinheiro fica na
// plataforma (a chance que já passou). Casa com 'whoosh'.
const MetaMissedTrain: React.FC<{ life: number }> = ({ life }) => {
  const frame = useCurrentFrame();
  const W = 1180, H = 560, plataforma = 430;
  // REGRA 3: a partida acontece no primeiro terço, senão ninguém vê o trem sair
  const p = interpolate(frame, [life * 0.08, life * 0.55], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.quad),
  });
  const tx = p * 900;
  const vagoes = [0, 1, 2];
  return (
    <svg width={W} height={H}>
      <defs>
        <linearGradient id="trm-g" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={BRAND.cyan} />
          <stop offset="100%" stopColor={BRAND.violet} />
        </linearGradient>
      </defs>
      {/* os carris atravessam o quadro */}
      <line x1={0} y1={plataforma} x2={W} y2={plataforma} stroke={BRAND.sub} strokeWidth={9} opacity={0.5} />
      <line x1={0} y1={plataforma + 22} x2={W} y2={plataforma + 22} stroke={BRAND.sub} strokeWidth={5} opacity={0.3} />
      {/* riscos de velocidade, atrás do trem */}
      {p > 0.05 && p < 0.98 && [0, 1, 2].map((i) => (
        <line
          key={i} x1={300 + tx - 190 - i * 70} y1={300 + i * 40} x2={300 + tx - 90 - i * 70} y2={300 + i * 40}
          stroke={BRAND.cyan} strokeWidth={7} strokeLinecap="round" opacity={0.4}
        />
      ))}
      {/* o trem */}
      <g transform={`translate(${tx} 0)`}>
        {vagoes.map((i) => {
          const x = 300 + i * 190;
          return (
            <g key={i}>
              <rect x={x} y={plataforma - 168} width={168} height={150} rx={i === 0 ? 34 : 16} fill="#2b3242" stroke="url(#trm-g)" strokeWidth={8} />
              <rect x={x + 26} y={plataforma - 142} width={54} height={46} rx={10} fill={BRAND.cyan} opacity={0.55} />
              <rect x={x + 96} y={plataforma - 142} width={46} height={46} rx={10} fill={BRAND.cyan} opacity={0.35} />
              <circle cx={x + 44} cy={plataforma - 8} r={20} fill={BRAND.sub} stroke={BRAND.text} strokeWidth={5} />
              <circle cx={x + 124} cy={plataforma - 8} r={20} fill={BRAND.sub} stroke={BRAND.text} strokeWidth={5} />
            </g>
          );
        })}
      </g>
      {/* quem ficou para trás */}
      <g transform={`translate(150 ${plataforma - 52})`}>
        <circle cx={0} cy={0} r={44} fill={BRAND.violet} stroke={BRAND.magenta} strokeWidth={7} />
        <text x={0} y={16} fontSize={44} fontWeight={900} textAnchor="middle" fill={BRAND.text}>$</text>
      </g>
    </svg>
  );
};

// bifurcacao: a estrada parte-se em DUAS e é preciso escolher (a decisão que muda o
// caminho). Casa com 'whoosh'.
const MetaFork: React.FC<{ life: number }> = ({ life }) => {
  const frame = useCurrentFrame();
  const W = 1040, H = 660, cx = W / 2;
  const baixo = 630, no = 350, cima = 130;
  const hesita = Math.sin(frame / 9) * 26;
  return (
    <svg width={W} height={H}>
      <defs>
        <linearGradient id="bif-e" x1="1" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={BRAND.violet} />
          <stop offset="100%" stopColor={BRAND.cyan} />
        </linearGradient>
        <linearGradient id="bif-d" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor={BRAND.violet} />
          <stop offset="100%" stopColor={BRAND.magenta} />
        </linearGradient>
        {/* o tronco DESVANECE em baixo em vez de acabar num corte reto (regra 2:
            um corte a direito lê-se como um retângulo pousado, não como estrada).
            ⚠️ Tem de ser aplicado a um <rect>, NÃO a um <line>: um degradê em
            unidades de caixa delimitadora sobre uma linha vertical tem largura
            ZERO e não pinta nada — foi o que aconteceu na 1ª tentativa, a estrada
            desapareceu e sobraram só as faixas tracejadas a flutuar. */}
        <linearGradient id="bif-t" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={BRAND.violet} stopOpacity={0.95} />
          <stop offset="62%" stopColor={BRAND.violet} stopOpacity={0.9} />
          <stop offset="100%" stopColor={BRAND.violet} stopOpacity={0} />
        </linearGradient>
      </defs>
      {/* o tronco comum, vindo de longe */}
      <rect x={cx - 31} y={no} width={62} height={H - no} fill="url(#bif-t)" />
      {/* os dois braços */}
      <line x1={cx} y1={no} x2={cx - 330} y2={cima} stroke="url(#bif-e)" strokeWidth={54} strokeLinecap="round" />
      <line x1={cx} y1={no} x2={cx + 330} y2={cima} stroke="url(#bif-d)" strokeWidth={54} strokeLinecap="round" />
      {/* faixa tracejada no tronco, para ler como estrada */}
      {[0, 1, 2].map((i) => (
        <rect key={i} x={cx - 6} y={baixo - i * 92} width={12} height={46} rx={6} fill={BRAND.text} opacity={0.5} />
      ))}
      {/* quem tem de escolher, hesitando no nó */}
      <g transform={`translate(${cx + hesita} ${no + 40})`}>
        <circle cx={0} cy={0} r={46} fill={BRAND.yellow} stroke="#b59b00" strokeWidth={7} />
        <text x={0} y={17} fontSize={46} fontWeight={900} textAnchor="middle" fill="#0d1117">$</text>
      </g>
    </svg>
  );
};

// duas-portas: uma abre e a outra fica fechada — só dá para escolher UMA.
// Casa com 'thud'.
const MetaTwoDoors: React.FC<{ life: number }> = ({ life }) => {
  const frame = useCurrentFrame();
  const W = 960, H = 660, cx = W / 2, chao = 570, topo = 150;
  const larg = 210, alt = chao - topo;
  // REGRA 3: abre no primeiro terço
  const abre = interpolate(frame, [life * 0.16, life * 0.34], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic),
  });
  const esqX = cx - 40 - larg;
  const dirX = cx + 40;
  return (
    <svg width={W} height={H}>
      <defs>
        <linearGradient id="por-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={BRAND.cyan} />
          <stop offset="100%" stopColor={BRAND.violet} />
        </linearGradient>
        <linearGradient id="por-luz" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={BRAND.yellow} stopOpacity={0.95} />
          <stop offset="100%" stopColor={BRAND.magenta} stopOpacity={0.6} />
        </linearGradient>
      </defs>
      <line x1={0} y1={chao} x2={W} y2={chao} stroke={BRAND.sub} strokeWidth={9} opacity={0.5} />
      {/* PORTA ESQUERDA — o VÃO com luz, e por cima o painel a abrir.
          Na 1ª versão o painel era um rect com `scale(x)`: encolhia junto com o
          contorno e ficava uma BARRA PRETA encostada à esquerda. Agora é um
          polígono com dobradiça fixa e a aresta livre a recuar — lê-se como porta. */}
      <rect x={esqX} y={topo} width={larg} height={alt} rx={14} fill="url(#por-luz)" opacity={abre} stroke="url(#por-g)" strokeWidth={9} />
      {(() => {
        const livre = esqX + larg * (1 - abre * 0.82);   // a aresta que se afasta
        const perspetiva = 26 * abre;                     // cresce um pouco ao virar
        return (
          <g>
            <polygon
              points={`${esqX},${topo} ${livre},${topo - perspetiva} ${livre},${chao + perspetiva} ${esqX},${chao}`}
              fill="#2b3242" stroke="url(#por-g)" strokeWidth={9} strokeLinejoin="round"
            />
            <circle cx={livre - 26} cy={topo + alt / 2} r={12} fill={BRAND.text} opacity={0.85} />
          </g>
        );
      })()}
      {/* PORTA DIREITA — fica fechada */}
      <rect x={dirX} y={topo} width={larg} height={alt} rx={14} fill="#2b3242" stroke="url(#por-g)" strokeWidth={9} />
      <circle cx={dirX + 34} cy={topo + alt / 2} r={12} fill={BRAND.text} opacity={0.85} />
      {/* batentes, para se lerem como portas e não como dois retângulos */}
      {[esqX, dirX].map((x) => (
        <rect key={x} x={x - 16} y={topo - 22} width={larg + 32} height={22} rx={8} fill={BRAND.sub} opacity={0.55} />
      ))}
    </svg>
  );
};

// ─── LEVA 5 DAS IMAGENS NOVAS (IMPLEMENTACAO20 §20.2 B1, 31/07/2026) ─────────
// Fecha DECIDIR/COMPARAR (semaforo) e PROTEGER/RESERVA (cofre, escudo, boia).
// Nota: o plano previa "colete" (salva-vidas). Virou BOIA — um colete não se lê
// em 2 segundos num telemóvel, uma boia lê-se de imediato. Mesmo significado.

// semaforo: o sinal MUDA à vista (a hora de parar ou de seguir). Casa com 'ding'.
const MetaTrafficLight: React.FC<{ life: number }> = ({ life }) => {
  const frame = useCurrentFrame();
  const W = 620, H = 720, cx = W / 2;
  const caixaY = 90, caixaH = 430, caixaW = 240;
  // REGRA 3: a mudança acontece no primeiro terço — é ela o sentido da imagem
  const mudou = interpolate(frame, [life * 0.2, life * 0.32], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const luzes = [
    { cor: BRAND.magenta, aceso: 1 - mudou },
    { cor: BRAND.yellow, aceso: Math.sin(mudou * Math.PI) * 0.9 },
    { cor: BRAND.cyan, aceso: mudou },
  ];
  return (
    <svg width={W} height={H}>
      <defs>
        <linearGradient id="sem-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={BRAND.cyan} />
          <stop offset="100%" stopColor={BRAND.violet} />
        </linearGradient>
        {/* o poste desvanece em vez de acabar num corte (regra 2 + regra 7: num
            RECT, que num <line> vertical o degradê não pinta) */}
        <linearGradient id="sem-p" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={BRAND.sub} stopOpacity={0.8} />
          <stop offset="100%" stopColor={BRAND.sub} stopOpacity={0} />
        </linearGradient>
      </defs>
      <rect x={cx - 17} y={caixaY + caixaH - 10} width={34} height={H - caixaY - caixaH + 10} fill="url(#sem-p)" />
      <rect x={cx - caixaW / 2} y={caixaY} width={caixaW} height={caixaH} rx={44} fill="#2b3242" stroke="url(#sem-g)" strokeWidth={10} />
      {luzes.map((l, i) => {
        const cy = caixaY + 84 + i * 132;
        return (
          <g key={i}>
            {/* halo de quem está aceso */}
            {l.aceso > 0.05 && <circle cx={cx} cy={cy} r={74} fill={l.cor} opacity={l.aceso * 0.28} />}
            <circle cx={cx} cy={cy} r={50} fill={l.cor} opacity={0.18 + l.aceso * 0.82} stroke={BRAND.bg} strokeWidth={5} />
          </g>
        );
      })}
    </svg>
  );
};

// cofre: o segredo GIRA e a tranca fecha — o dinheiro fica a salvo. Casa com 'thud'.
const MetaSafe: React.FC<{ life: number }> = ({ life }) => {
  const frame = useCurrentFrame();
  const W = 700, H = 660, cx = W / 2, cy = 330;
  const lado = 400;
  // gira depressa e TRANCA no primeiro terço (regra 3)
  const giro = interpolate(frame, [0, life * 0.3], [0, 640], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic),
  });
  const trancado = interpolate(frame, [life * 0.28, life * 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <svg width={W} height={H}>
      <defs>
        <linearGradient id="cof-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={BRAND.cyan} />
          <stop offset="100%" stopColor={BRAND.violet} />
        </linearGradient>
      </defs>
      {/* corpo */}
      <rect x={cx - lado / 2} y={cy - lado / 2} width={lado} height={lado} rx={40} fill="#2b3242" stroke="url(#cof-g)" strokeWidth={11} />
      {/* porta */}
      <rect x={cx - lado / 2 + 34} y={cy - lado / 2 + 34} width={lado - 68} height={lado - 68} rx={26} fill="none" stroke={BRAND.sub} strokeWidth={6} opacity={0.6} />
      {/* dobradiças, à esquerda */}
      {[-70, 70].map((d) => (
        <rect key={d} x={cx - lado / 2 + 8} y={cy + d - 26} width={26} height={52} rx={10} fill={BRAND.sub} opacity={0.75} />
      ))}
      {/* o segredo a girar */}
      <g transform={`rotate(${giro} ${cx + 26} ${cy})`}>
        <circle cx={cx + 26} cy={cy} r={82} fill="#0d1117" stroke="url(#cof-g)" strokeWidth={9} />
        {[0, 60, 120].map((a) => {
          const r = (a * Math.PI) / 180;
          return (
            <line
              key={a}
              x1={cx + 26 - Math.cos(r) * 62} y1={cy - Math.sin(r) * 62}
              x2={cx + 26 + Math.cos(r) * 62} y2={cy + Math.sin(r) * 62}
              stroke={BRAND.text} strokeWidth={11} strokeLinecap="round" opacity={0.9}
            />
          );
        })}
        <circle cx={cx + 26} cy={cy} r={22} fill={BRAND.violet} stroke={BRAND.text} strokeWidth={5} />
      </g>
      {/* a luz de TRANCADO */}
      <circle cx={cx - lado / 2 + 78} cy={cy - lado / 2 + 78} r={20} fill={BRAND.cyan} opacity={0.2 + trancado * 0.8} />
      {trancado > 0.4 && <circle cx={cx - lado / 2 + 78} cy={cy - lado / 2 + 78} r={38} fill={BRAND.cyan} opacity={(trancado - 0.4) * 0.35} />}
    </svg>
  );
};

// escudo: os golpes batem e RICOCHETEIAM — aguenta sem te derrubar. Casa com 'boom'.
const MetaShield: React.FC<{ life: number }> = ({ life }) => {
  const frame = useCurrentFrame();
  const W = 700, H = 700, cx = W / 2, topo = 140;
  const golpes = [0, 1, 2];
  return (
    <svg width={W} height={H}>
      <defs>
        <linearGradient id="esc-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={BRAND.cyan} />
          <stop offset="100%" stopColor={BRAND.violet} />
        </linearGradient>
      </defs>
      {/* o escudo */}
      <path
        d={`M${cx},${topo} L${cx + 190},${topo + 76} L${cx + 190},${topo + 260}
            C${cx + 190},${topo + 400} ${cx + 96},${topo + 468} ${cx},${topo + 500}
            C${cx - 96},${topo + 468} ${cx - 190},${topo + 400} ${cx - 190},${topo + 260}
            L${cx - 190},${topo + 76} Z`}
        fill="#2b3242" stroke="url(#esc-g)" strokeWidth={13} strokeLinejoin="round"
      />
      {/* O SÍMBOLO no meio do escudo — é o dinheiro que está a ser protegido.
          ⚠️ Aqui estava uma "nervura" central: um path VERTICAL com stroke em
          degradê. Não pintou nada, pela mesma razão da bifurcação (regra 7): caixa
          delimitadora de largura zero. 2ª vez no mesmo dia. */}
      <text x={cx} y={topo + 330} fontSize={190} fontWeight={900} textAnchor="middle" fill={BRAND.text} opacity={0.9}>$</text>
      {/* os golpes: chegam de cima e ricocheteiam. O 1º bate LOGO (regra 3).
          Grandes e claros — na 1ª versão eram bolinhas de 20px e não se viam. */}
      {golpes.map((i) => {
        const inicio = life * (0.06 + i * 0.2);
        const t = interpolate(frame, [inicio, inicio + life * 0.22], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        if (t <= 0) return null;
        const bateu = t > 0.5;
        const ida = Math.min(t, 0.5) / 0.5;
        const volta = bateu ? (t - 0.5) / 0.5 : 0;
        const alvoX = cx - 100 + i * 100, alvoY = topo + 130 + i * 96;
        const x = (cx + 360) + (alvoX - (cx + 360)) * ida + volta * 220;
        const y = (topo - 160) + (alvoY - (topo - 160)) * ida - volta * 170;
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={30 * (1 - volta * 0.45)} fill={BRAND.magenta} stroke={BRAND.text} strokeWidth={5} opacity={1 - volta * 0.8} />
            {bateu && volta < 0.6 && (
              <>
                <circle cx={alvoX} cy={alvoY} r={36 + volta * 130} fill="none" stroke={BRAND.yellow} strokeWidth={11} opacity={(0.6 - volta) * 1.6} />
                <circle cx={alvoX} cy={alvoY} r={20 + volta * 70} fill={BRAND.yellow} opacity={(0.6 - volta) * 0.8} />
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
};

// boia: a água sobe mas a boia SEGURA o dinheiro à tona (a reserva que te salva).
// Casa com 'whoosh'.
const MetaLifebuoy: React.FC<{ life: number }> = ({ life }) => {
  const frame = useCurrentFrame();
  // largo para a água sangrar pelos lados (regra 2)
  const W = 1160, H = 660, cx = W / 2;
  const agua = 400;
  const balanca = Math.sin(frame / 9) * 16;
  const gira = Math.sin(frame / 13) * 7;
  const cy = agua - 58 + balanca;
  return (
    <svg width={W} height={H}>
      <defs>
        {/* o último passo desvanece: o svg não chega ao fundo do vídeo e um corte
            reto lia-se como uma faixa pousada, não como água (regra 2). */}
        <linearGradient id="boi-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={BRAND.cyan} stopOpacity={0.8} />
          <stop offset="55%" stopColor={BRAND.violet} stopOpacity={0.95} />
          <stop offset="100%" stopColor={BRAND.violet} stopOpacity={0} />
        </linearGradient>
      </defs>
      {/* a boia */}
      <g transform={`translate(${cx} ${cy}) rotate(${gira})`}>
        <circle cx={0} cy={0} r={124} fill="none" stroke={BRAND.magenta} strokeWidth={54} />
        {/* as quatro faixas claras */}
        {[45, 135, 225, 315].map((a) => {
          const r = (a * Math.PI) / 180;
          return (
            <line
              key={a}
              x1={Math.cos(r) * 98} y1={Math.sin(r) * 98}
              x2={Math.cos(r) * 150} y2={Math.sin(r) * 150}
              stroke={BRAND.text} strokeWidth={40} strokeLinecap="butt"
            />
          );
        })}
        {/* o dinheiro que ela segura */}
        <circle cx={0} cy={0} r={62} fill={BRAND.violet} stroke={BRAND.cyan} strokeWidth={7} />
        <text x={0} y={22} fontSize={62} fontWeight={900} textAnchor="middle" fill={BRAND.text}>$</text>
      </g>
      {/* a água, ondulada e a atravessar o quadro */}
      <path
        d={`M0,${agua + 24}
            C${W * 0.16},${agua - 14} ${W * 0.32},${agua + 30} ${W * 0.5},${agua + 6}
            C${W * 0.68},${agua - 18} ${W * 0.84},${agua + 28} ${W},${agua + 2}
            L${W},${H} L0,${H} Z`}
        fill="url(#boi-g)"
      />
      {/* espuma junto à boia */}
      {[0, 1].map((i) => {
        const t = ((frame / Math.max(1, life)) * 2.2 + i * 0.5) % 1;
        return (
          <ellipse key={i} cx={cx} cy={agua + 14} rx={140 + t * 190} ry={14 + t * 22} fill="none" stroke={BRAND.text} strokeWidth={6} opacity={(1 - t) * 0.4} />
        );
      })}
    </svg>
  );
};

// ─── LEVA 6, A ÚLTIMA (IMPLEMENTACAO20 §20.2 B1, 31/07/2026) ────────────────
// Fecha CRESCER/ACUMULAR (escada) e PERDER/VAZAR (balde-furado, buraco, fumaca).
// Nota: o plano previa "tijolos" em crescer; saiu a favor de "fumaca". A escada já
// diz "crescer aos poucos" e os tijolos seriam quase a mesma imagem, enquanto
// perder/vazar ficaria com 3. Assim as 8 famílias ficam com 4 cada.

// escada: sobe-se um DEGRAU de cada vez (o progresso que não é salto). Casa com 'coin'.
const MetaStairs: React.FC<{ life: number }> = ({ life }) => {
  const frame = useCurrentFrame();
  const W = 1120, H = 640;
  const degraus = [0, 1, 2, 3, 4];
  const largura = 190, altura = 82, base = 590, x0 = 40;
  const p = interpolate(frame, [0, life * 0.9], [0, degraus.length - 0.001], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const atual = Math.floor(p);
  const salto = Math.sin((p - atual) * Math.PI) * 42;      // pula de degrau em degrau
  const moedaX = x0 + largura * (atual + (p - atual)) + largura / 2;
  const moedaY = base - altura * (atual + 1) - 46 - salto;
  return (
    <svg width={W} height={H}>
      <defs>
        <linearGradient id="esd-g" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor={BRAND.violet} />
          <stop offset="100%" stopColor={BRAND.cyan} />
        </linearGradient>
      </defs>
      {/* os degraus. O primeiro nasce fora do quadro, à esquerda (regra 2). */}
      {degraus.map((i) => {
        const alto = altura * (i + 1);
        return (
          <rect
            key={i}
            x={i === 0 ? -60 : x0 + i * largura} y={base - alto}
            width={i === 0 ? largura + 100 : largura} height={alto}
            rx={10} fill="#2b3242" stroke="url(#esd-g)" strokeWidth={7}
          />
        );
      })}
      {/* quem sobe */}
      <g transform={`translate(${moedaX} ${moedaY})`}>
        <circle cx={0} cy={0} r={44} fill={BRAND.yellow} stroke="#b59b00" strokeWidth={6} />
        <text x={0} y={16} fontSize={44} fontWeight={900} textAnchor="middle" fill="#0d1117">$</text>
      </g>
    </svg>
  );
};

// balde-furado: enche por cima e PERDE por baixo (o orçamento que nunca fecha).
// Diferente do 'ralo': ali o dinheiro espirala num funil; aqui escapa pelos furos
// de um recipiente que devia segurar. Casa com 'coin'.
const MetaLeakyBucket: React.FC<{ life: number }> = ({ life }) => {
  const frame = useCurrentFrame();
  const W = 760, H = 700, cx = W / 2;
  const topo = 200, fundo = 560, meiaCima = 168, meiaBaixo = 118;
  // Os furos ficam NA PAREDE, não no meio do balde. Na 1ª versão estavam no
  // interior e liam-se como manchas escuras soltas. `naParede` calcula o x exato
  // da parede inclinada para cada altura.
  const naParede = (y: number, lado: -1 | 1) => {
    const t = (y - topo) / (fundo - topo);
    return cx + lado * (meiaCima - (meiaCima - meiaBaixo) * t);
  };
  const furos: { x: number; y: number; lado: -1 | 1 }[] = [
    { y: 400, lado: -1 }, { y: 466, lado: 1 }, { y: 520, lado: -1 },
  ].map((h) => ({ ...h, x: naParede(h.y, h.lado as -1 | 1) }));
  return (
    <svg width={W} height={H}>
      <defs>
        <linearGradient id="bld-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={BRAND.cyan} />
          <stop offset="100%" stopColor={BRAND.violet} />
        </linearGradient>
      </defs>
      {/* o que entra por cima */}
      {[0, 1, 2].map((i) => {
        const t = ((frame / Math.max(1, life)) * 2.4 + i * 0.33) % 1;
        return <circle key={i} cx={cx} cy={40 + t * (topo - 60)} r={17} fill={BRAND.yellow} opacity={0.9} />;
      })}
      {/* o balde */}
      <path
        d={`M${cx - meiaCima},${topo} L${cx + meiaCima},${topo} L${cx + meiaBaixo},${fundo} L${cx - meiaBaixo},${fundo} Z`}
        fill="#2b3242" stroke="url(#bld-g)" strokeWidth={11} strokeLinejoin="round"
      />
      <ellipse cx={cx} cy={topo} rx={meiaCima} ry={30} fill="#2b3242" stroke="url(#bld-g)" strokeWidth={11} />
      {/* asa */}
      <path d={`M${cx - meiaCima + 12},${topo - 6} Q${cx},${topo - 150} ${cx + meiaCima - 12},${topo - 6}`} fill="none" stroke={BRAND.sub} strokeWidth={12} strokeLinecap="round" opacity={0.85} />
      {/* os furos e o que escapa por eles */}
      {furos.map((f, i) => (
        <g key={i}>
          <circle cx={f.x} cy={f.y} r={18} fill={BRAND.bg} stroke={BRAND.sub} strokeWidth={4} />
          {[0, 1].map((k) => {
            const t = ((frame / Math.max(1, life)) * 2.6 + i * 0.4 + k * 0.5) % 1;
            return (
              <circle
                key={k}
                cx={f.x + f.lado * (14 + t * 78)} cy={f.y + t * t * 210}
                r={14 * (1 - t * 0.45)} fill={BRAND.yellow} opacity={(1 - t) * 0.95}
              />
            );
          })}
        </g>
      ))}
    </svg>
  );
};

// buraco: quanto mais se cava, MAIS FUNDO fica (a dívida que se tapa com dívida).
// Corte lateral, não vista de cima — é isso que o separa do 'ralo'. Casa com 'thud'.
const MetaHole: React.FC<{ life: number }> = ({ life }) => {
  const frame = useCurrentFrame();
  const W = 1160, H = 660, cx = W / 2, chao = 300;
  const p = interpolate(frame, [0, life * 0.9], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const fundoY = chao + 60 + p * 250;
  const meia = 130 + p * 60;
  return (
    <svg width={W} height={H}>
      <defs>
        <linearGradient id="bur-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={BRAND.violet} stopOpacity={0.85} />
          <stop offset="55%" stopColor={BRAND.violet} stopOpacity={0.9} />
          {/* desvanece no fundo (regra 2) */}
          <stop offset="100%" stopColor={BRAND.violet} stopOpacity={0} />
        </linearGradient>
      </defs>
      {/* a terra, dos dois lados, atravessando o quadro */}
      <path d={`M0,${chao} L${cx - meia},${chao} L${cx - meia + 26},${fundoY} L${cx + meia - 26},${fundoY} L${cx + meia},${chao} L${W},${chao} L${W},${H} L0,${H} Z`} fill="url(#bur-g)" />
      <path
        d={`M0,${chao} L${cx - meia},${chao} L${cx - meia + 26},${fundoY} L${cx + meia - 26},${fundoY} L${cx + meia},${chao} L${W},${chao}`}
        fill="none" stroke={BRAND.sub} strokeWidth={9} strokeLinejoin="round" opacity={0.75}
      />
      {/* montes de terra tirada, um de cada lado */}
      {[-1, 1].map((s) => (
        <path
          key={s}
          d={`M${cx + s * (meia + 40)},${chao} q${s * 70},${-40 - p * 40} ${s * 150},0 Z`}
          fill={BRAND.sub} opacity={0.45}
        />
      ))}
      {/* o dinheiro no fundo, cada vez mais longe */}
      <g transform={`translate(${cx} ${fundoY - 44})`} opacity={0.9}>
        <circle cx={0} cy={0} r={38} fill={BRAND.yellow} stroke="#b59b00" strokeWidth={6} />
        <text x={0} y={14} fontSize={38} fontWeight={900} textAnchor="middle" fill="#0d1117">$</text>
      </g>
    </svg>
  );
};

// fumaca: o dinheiro SOBE em fumaça e não volta (o gasto que evapora).
// Diferente da 'vela': ali o corpo encolhe e marca tempo; aqui a moeda desfaz-se.
// Casa com 'whoosh'.
const MetaSmoke: React.FC<{ life: number }> = ({ life }) => {
  const frame = useCurrentFrame();
  const W = 700, H = 720, cx = W / 2, chao = 610;
  const p = interpolate(frame, [0, life * 0.85], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const baforadas = [0, 1, 2, 3, 4];
  return (
    <svg width={W} height={H}>
      <defs>
        <linearGradient id="fum-c" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={BRAND.yellow} />
          <stop offset="100%" stopColor={BRAND.magenta} />
        </linearGradient>
      </defs>
      <line x1={0} y1={chao} x2={W} y2={chao} stroke={BRAND.sub} strokeWidth={9} opacity={0.45} />
      {/* a fumaça a subir e a alargar. Clara e bem visível: na 1ª versão era cinza
          a 40% sobre fundo roxo e quase não se via. */}
      {baforadas.map((i) => {
        const t = ((frame / Math.max(1, life)) * 1.6 + i * 0.2) % 1;
        const desvio = Math.sin(t * Math.PI * 2 + i) * 54 * t;
        return (
          <circle
            key={i}
            cx={cx + desvio} cy={chao - 250 - t * 380}
            r={30 + t * 70} fill={BRAND.text} opacity={(1 - t) * 0.5}
          />
        );
      })}
      {/* a chama — ACIMA da moeda. Na 1ª versão ficava por cima do "$" e tapava-o. */}
      <path
        d={`M${cx},${chao - 262} C${cx + 34},${chao - 220} ${cx + 32},${chao - 188} ${cx},${chao - 172} C${cx - 32},${chao - 188} ${cx - 34},${chao - 220} ${cx},${chao - 262} Z`}
        fill={BRAND.yellow} opacity={0.95}
      />
      {/* a moeda a desfazer-se — encolhe pouco, para o "$" continuar legível */}
      <g transform={`translate(${cx} ${chao - 92}) scale(${1 - p * 0.24})`} opacity={1 - p * 0.5}>
        <circle cx={0} cy={0} r={74} fill="url(#fum-c)" stroke="#b59b00" strokeWidth={8} />
        <text x={0} y={27} fontSize={76} fontWeight={900} textAnchor="middle" fill="#0d1117">$</text>
      </g>
    </svg>
  );
};

// `export` acrescentado em 31/07/2026 só para a composição `Galeria` poder desenhar
// cada imagem isolada (IMPLEMENTACAO20 §20.2 B0). O comportamento não muda.
export const ShotMetaphor: React.FC<{ metaphor?: string; life: number }> = ({ metaphor, life }) => {
  if (metaphor === 'avalanche') return <MetaAvalanche life={life} />;
  if (metaphor === 'escorregao') return <MetaSlip life={life} />;
  if (metaphor === 'clique-link') return <MetaClickLink life={life} />;
  if (metaphor === 'foguete') return <MetaRocket life={life} />;
  if (metaphor === 'semente') return <MetaSeed life={life} />;
  if (metaphor === 'montanha-russa') return <MetaRollercoaster life={life} />;
  if (metaphor === 'bolha') return <MetaBubble life={life} />;
  if (metaphor === 'ralo') return <MetaDrain life={life} />;
  if (metaphor === 'ampulheta') return <MetaHourglass life={life} />;
  if (metaphor === 'balanca') return <MetaScale life={life} />;
  if (metaphor === 'bola-de-ferro') return <MetaBallChain life={life} />;
  if (metaphor === 'guarda-chuva') return <MetaUmbrella life={life} />;
  if (metaphor === 'ratoeira') return <MetaMousetrap life={life} />;
  if (metaphor === 'mochila-pedras') return <MetaBackpack life={life} />;
  if (metaphor === 'areia-movedica') return <MetaQuicksand life={life} />;
  if (metaphor === 'domino') return <MetaDominoes life={life} />;
  if (metaphor === 'castelo-cartas') return <MetaCardHouse life={life} />;
  if (metaphor === 'gangorra') return <MetaSeesaw life={life} />;
  if (metaphor === 'corda-bamba') return <MetaTightrope life={life} />;
  if (metaphor === 'relogio') return <MetaClock life={life} />;
  if (metaphor === 'vela') return <MetaCandle life={life} />;
  if (metaphor === 'trem-perdido') return <MetaMissedTrain life={life} />;
  if (metaphor === 'bifurcacao') return <MetaFork life={life} />;
  if (metaphor === 'duas-portas') return <MetaTwoDoors life={life} />;
  if (metaphor === 'semaforo') return <MetaTrafficLight life={life} />;
  if (metaphor === 'cofre') return <MetaSafe life={life} />;
  if (metaphor === 'escudo') return <MetaShield life={life} />;
  if (metaphor === 'boia') return <MetaLifebuoy life={life} />;
  if (metaphor === 'escada') return <MetaStairs life={life} />;
  if (metaphor === 'balde-furado') return <MetaLeakyBucket life={life} />;
  if (metaphor === 'buraco') return <MetaHole life={life} />;
  if (metaphor === 'fumaca') return <MetaSmoke life={life} />;
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
export const SceneRenderer: React.FC<{ scene: Scene; timing?: SceneTiming | null; metaphorStages?: number[]; sceneFrames?: number }> = ({ scene, timing, metaphorStages, sceneFrames }) => {
  const { fps } = useVideoConfig();
  // Mesmo cue (revealFrameFor) que o SceneShell usa pro punch — repassado ao
  // SceneChart pra sincronizar o DESENHO da curva com a fala, não só o soco.
  const revealFrame = revealFrameFor(scene, timing, fps);
  // `sceneFrames` (T2, §21.3) é o comprimento REAL da cena — áudio + o respiro de
  // 0,7s que o Short.tsx acrescenta. O fallback pelo áudio cru fica para quem
  // renderiza uma cena isolada (Studio/galeria), onde não há respiro nenhum.
  // ⚠️ Tem de ser o MESMO número que alimenta computeGlobalShotSfxFires, senão o
  // som de um shot dispara num frame e a imagem dele aparece noutro.
  const durationFrames = sceneFrames ?? Math.max(1, Math.round((timing?.durationSec ?? scene.durationSec) * fps));
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
