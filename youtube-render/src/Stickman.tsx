import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { BRAND } from './theme';

/**
 * O BONECO-PALITO — piloto dos 3 primeiros movimentos (01/10/2026, ordem do dono).
 *
 * ═══ POR QUE ISTO EXISTE ═══
 * O dono quer um personagem fixo (não gerado por IA a cada vídeo) que caminha, cai,
 * levanta e carrega peso, com expressão — ver a conversa de 01/10/2026. A ideia:
 * construir um ESQUELETO uma vez (este ficheiro) e uma dúzia de MOVIMENTOS reutilizáveis
 * que se combinam com os objetos/cenas que o canal já tem (as 32 metáforas financeiras).
 * É a mesma disciplina de sempre desta casa: nada inventado a cada vídeo, tudo vem de um
 * catálogo fixo.
 *
 * ═══ ESTE FICHEIRO É O PILOTO — AINDA NÃO ENTRA NO VÍDEO DE VERDADE ═══
 * Só tem os 3 movimentos que o dono pediu pra testar primeiro: carregar peso, cair e
 * levantar com esforço. Fica como composição isolada no Root.tsx ("StickmanPiloto"),
 * do mesmo jeito que "Test" e "Galeria" já existem — pra ver sem gastar um render do
 * vídeo inteiro. Os outros 11 movimentos da lista ficam para depois da aprovação deste.
 *
 * ⚠️ **ISTO FOI ESCRITO SEM PRÉVIA VISUAL** — eu (Claude) não vejo o vídeo renderizar.
 * Os ângulos e tempos abaixo são uma primeira tentativa, calculada, não vista. É pra
 * isso que existe o `StickmanPiloto`: o dono assiste, aponta o segundo exato e o que
 * está errado ("no frame 45, o joelho dobra pro lado errado"), e eu ajusto só aquilo —
 * o mesmo método do guia "directing" que ele trouxe.
 *
 * ═══ A GEOMETRIA ═══
 * Um boneco-palito articulado: cabeça (círculo) + tronco + 2 braços (ombro+cotovelo) +
 * 2 pernas (quadril+joelho). Cada segmento é desenhado a partir do ponto anterior, por
 * um ângulo e um comprimento — é a mesma matemática de um relógio de ponteiros, só que
 * encadeada. O quadril (`hipX`, `hipY`) é a origem de tudo; `bodyRotation` gira o
 * boneco inteiro à volta do quadril (usado só na queda e na levantada).
 */

// ─── medidas do esqueleto (fixas) ──────────────────────────────────────────────
// ⚠️ 01/10/2026 — DOBRADAS depois do 1º render: o boneco saiu minúsculo (≈15% da
// altura do palco). Conferido com `remotion still` e visto de verdade — não é
// gosto, é medida: um boneco pequeno não serve de prévia de nada.
const HEAD_R = 60;
const NECK = 28;
const TORSO_LEN = 190;
const UPPER_ARM = 116;
const FOREARM = 104;
const UPPER_LEG = 136;
const LOWER_LEG = 124;
const STROKE = 26;
const CANVAS_CX = 540; // centro horizontal do palco vertical (1080 de largura)
const CANVAS_GROUND_Y = 1300; // onde o "chão" fica no palco (1920 de altura)

type Pt = { x: number; y: number };

/**
 * Um ponto a `length` de distância de `origin`, na direção `angleDeg`.
 * Convenção: 0° aponta para BAIXO (+Y), e o ângulo cresce no sentido horário.
 * É a mesma convenção para pernas (penduradas = 0°) e, com +180°, para o tronco
 * (que sobe a partir do quadril).
 *
 * ⚠️ 01/10/2026 — O PRIMEIRO RENDER SAIU DE CABEÇA PRA BAIXO. A fórmula tinha o
 * sinal do `cos` trocado: a 0° ela subia (−Y) em vez de descer (+Y), e por isso
 * o tronco (pedido a 180°, "pra cima" na intenção) descia na prática — a cabeça
 * foi parar no chão. Só se descobriu RENDERIZANDO e OLHANDO; não dava pra ver
 * de cabeça (sem olhos pro resultado, o código "parece" certo nos dois sinais).
 */
function segPoint(origin: Pt, angleDeg: number, length: number): Pt {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: origin.x + length * Math.sin(rad), y: origin.y + length * Math.cos(rad) };
}

/** Roda um ponto à volta de outro — usado para o `bodyRotation` (o corpo inteiro tombando). */
function rotateAround(p: Pt, center: Pt, angleDeg: number): Pt {
  const rad = (angleDeg * Math.PI) / 180;
  const dx = p.x - center.x;
  const dy = p.y - center.y;
  return {
    x: center.x + dx * Math.cos(rad) - dy * Math.sin(rad),
    y: center.y + dx * Math.sin(rad) + dy * Math.cos(rad),
  };
}

export type Pose = {
  hipX: number;
  hipY: number;
  bodyRotation: number; // graus — gira o boneco inteiro à volta do quadril
  torsoLean: number; // graus, + = tronco inclinado para a frente (direção +X)
  headTilt: number;
  shoulderL: number; elbowL: number;
  shoulderR: number; elbowR: number;
  hipAngleL: number; kneeL: number;
  hipAngleR: number; kneeR: number;
  /** Expressão simples: sobrancelhas (graus, + = franzidas pra baixo) e boca (−1 feliz … 1 triste). */
  face: { browAngle: number; mouthCurve: number; eyeOpen: number };
};

/**
 * ⚠️ 01/10/2026 — PERNAS E BRAÇOS NUNCA PODEM FICAR NO MESMO ÂNGULO EXATO.
 * Visto no render: com as duas pernas a 0° (penduradas retas, uma atrás da outra
 * de perfil), elas desenham-se exatamente por cima uma da outra — o boneco de pé
 * vira uma linha só, sem parecer gente nenhuma. A postura "neutra" tem sempre um
 * pé ligeiramente à frente do outro (como alguém realmente de pé), e é esse
 * pequeno desvio que mantém as duas pernas visíveis em todas as poses paradas.
 */
export const POSE_NEUTRA: Pose = {
  hipX: CANVAS_CX, hipY: CANVAS_GROUND_Y - UPPER_LEG - LOWER_LEG,
  bodyRotation: 0, torsoLean: 0, headTilt: 0,
  shoulderL: 18, elbowL: 8, shoulderR: -6, elbowR: -8,
  hipAngleL: 10, kneeL: 0, hipAngleR: -10, kneeR: 0,
  face: { browAngle: 0, mouthCurve: 0, eyeOpen: 1 },
};

// ─── MOVIMENTO 1 — CARREGAR PESO PESADO (loop de caminhada, no lugar) ──────────
// Inclinado para a frente, braços dobrados segurando algo em baixo, passada pesada
// (o quadril sobe e desce mais do que numa caminhada normal, e mais devagar).
export function poseCarregarPeso(frame: number, duracao: number): Pose {
  const faseTotal = (frame / duracao) * Math.PI * 2 * 1.5; // 1,5 passo completo no clipe
  const faseL = Math.sin(faseTotal);
  const faseR = Math.sin(faseTotal + Math.PI); // perna direita em oposição à esquerda
  const bob = Math.abs(Math.sin(faseTotal * 2)) * 10; // quadril sobe a cada passo

  return {
    ...POSE_NEUTRA,
    hipY: POSE_NEUTRA.hipY + 6 - bob,
    torsoLean: 24,
    headTilt: 14,
    // braços dobrados à frente e em baixo, como quem segura um saco pesado
    shoulderL: -38 + faseL * 4, elbowL: -92,
    shoulderR: -38 + faseR * 4, elbowR: -92,
    hipAngleL: faseL * 26, kneeL: Math.max(0, -faseL) * 55,
    hipAngleR: faseR * 26, kneeR: Math.max(0, -faseR) * 55,
    face: { browAngle: 18, mouthCurve: 0.5, eyeOpen: 0.7 },
  };
}

/** O objeto pesado que o boneco carrega — um saco escuro entre as mãos. */
export function pontoDoPeso(pose: Pose): Pt {
  const hip = { x: pose.hipX, y: pose.hipY };
  const shoulderBase = segPoint(hip, 180 + pose.torsoLean, TORSO_LEN);
  const elbowPt = segPoint(shoulderBase, pose.shoulderL, UPPER_ARM);
  const handPt = segPoint(elbowPt, pose.shoulderL + pose.elbowL, FOREARM);
  return handPt;
}

// ─── MOVIMENTO 2 — CAIR (tropeço → queda → impacto) ────────────────────────────
// 3 fases dentro do mesmo clipe: antecipação (perde o equilíbrio), queda (o corpo
// inteiro tomba, via `bodyRotation`) e impacto (assenta no chão com um pequeno ricochete).
export function poseCair(frame: number, duracao: number): Pose {
  const ANTECIPACAO = duracao * 0.3;
  const QUEDA = duracao * 0.75;
  // duracao inteiro = inclui o IMPACTO (resto do clipe)

  const bodyRotation = interpolate(
    frame,
    [0, ANTECIPACAO, QUEDA, duracao],
    [0, -8, 88, 92],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );
  // ricochete leve ao assentar — só nos últimos frames
  const impactoFrame = Math.max(0, frame - QUEDA);
  const impactoBounce = interpolate(impactoFrame, [0, (duracao - QUEDA) * 0.5, duracao - QUEDA], [0, -14, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  const hipYQueda = interpolate(frame, [0, ANTECIPACAO, QUEDA], [0, -4, 170], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // pernas: uma chuta para a frente na antecipação (tropeço), depois as duas esparramam no chão
  const pernaEsq = interpolate(frame, [0, ANTECIPACAO, QUEDA], [0, 48, 30], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const pernaDir = interpolate(frame, [0, ANTECIPACAO, QUEDA], [0, -20, -35], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // braços: abrem para tentar equilibrar, depois caem esparramados
  const bracoEsq = interpolate(frame, [0, ANTECIPACAO, QUEDA], [12, -70, -100], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const bracoDir = interpolate(frame, [0, ANTECIPACAO, QUEDA], [-12, 70, 95], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return {
    ...POSE_NEUTRA,
    hipY: POSE_NEUTRA.hipY + hipYQueda + impactoBounce,
    bodyRotation,
    torsoLean: interpolate(frame, [0, ANTECIPACAO], [0, 14], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
    headTilt: interpolate(frame, [0, QUEDA], [0, -20], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
    shoulderL: bracoEsq, elbowL: -20,
    shoulderR: bracoDir, elbowR: 20,
    hipAngleL: pernaEsq, kneeL: 20,
    hipAngleR: pernaDir, kneeR: 50,
    face: { browAngle: -22, mouthCurve: -1, eyeOpen: 1.3 },
  };
}

/** A pose final da queda (usada como ponto de partida de `poseLevantar`). */
export function poseCaidoNoChao(duracaoDaQueda: number): Pose {
  return poseCair(duracaoDaQueda, duracaoDaQueda);
}

// ─── MOVIMENTO 3 — LEVANTAR COM ESFORÇO ────────────────────────────────────────
// Parte do chão (igual ao fim da queda), empurra com um braço, passa por meio‑ajoelhado,
// e levanta com um pequeno balanço final (esforço, não é suave).
export function poseLevantar(frame: number, duracao: number, fps: number): Pose {
  const EMPURRAR = duracao * 0.3;
  const MEIO_AJOELHADO = duracao * 0.65;
  // resto do clipe = ficar de pé e estabilizar

  const progressoFinal = interpolate(frame, [MEIO_AJOELHADO, duracao], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  // mola com pouco amortecimento no fim = o "balanço" do esforço ao ficar de pé
  const estabilizar = spring({ frame: frame - MEIO_AJOELHADO, fps, config: { damping: 9, stiffness: 90 }, durationInFrames: Math.max(1, duracao - MEIO_AJOELHADO) });

  const bodyRotation = interpolate(
    frame,
    [0, EMPURRAR, MEIO_AJOELHADO, duracao],
    [92, 60, 15, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );
  const hipY = interpolate(frame, [0, EMPURRAR, MEIO_AJOELHADO, duracao], [170, 140, 50, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // braço esquerdo empurra contra o chão na 1ª fase, depois volta ao normal
  // ⚠️ Os alvos finais (18 / −6) batem com `POSE_NEUTRA` — nunca 0 e 0 juntos,
  // senão os dois braços desenham-se um por cima do outro (ver a nota em POSE_NEUTRA).
  const bracoEsq = interpolate(frame, [0, EMPURRAR, MEIO_AJOELHADO, duracao], [-100, -130, -20, 18], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const bracoDir = interpolate(frame, [0, EMPURRAR, MEIO_AJOELHADO, duracao], [95, 40, 0, -6], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // perna direita vem para debaixo do corpo primeiro (meio-ajoelhado), depois as duas esticam
  // ⚠️ Os alvos finais (−10 / 10) batem com `POSE_NEUTRA`, pela mesma razão das pernas.
  const pernaDir = interpolate(frame, [0, EMPURRAR, MEIO_AJOELHADO, duracao], [-35, 10, 35, -10], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const joelhoDir = interpolate(frame, [0, EMPURRAR, MEIO_AJOELHADO, duracao], [50, 95, 70, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const pernaEsq = interpolate(frame, [0, EMPURRAR, MEIO_AJOELHADO, duracao], [30, 15, -5, 10], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const joelhoEsq = interpolate(frame, [0, EMPURRAR, MEIO_AJOELHADO, duracao], [20, 10, 15, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const torsoLean = interpolate(progressoFinal, [0, 1], [8, 0]) + (1 - estabilizar) * 6;

  return {
    ...POSE_NEUTRA,
    hipY: POSE_NEUTRA.hipY + hipY,
    bodyRotation,
    torsoLean,
    headTilt: interpolate(frame, [0, MEIO_AJOELHADO, duracao], [-20, -6, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
    shoulderL: bracoEsq, elbowL: -20,
    shoulderR: bracoDir, elbowR: 20,
    hipAngleL: pernaEsq, kneeL: joelhoEsq,
    hipAngleR: pernaDir, kneeR: joelhoDir,
    face: { browAngle: 14, mouthCurve: -0.3, eyeOpen: 0.8 },
  };
}

// ─── O RENDERIZADOR — desenha qualquer `Pose` ──────────────────────────────────
export const Stickman: React.FC<{ pose: Pose; heldObject?: boolean }> = ({ pose, heldObject }) => {
  const hip = { x: pose.hipX, y: pose.hipY };

  // tronco e cabeça (sobem a partir do quadril)
  const shoulder = segPoint(hip, 180 + pose.torsoLean, TORSO_LEN);
  const neckTop = segPoint(shoulder, 180 + pose.torsoLean + pose.headTilt, NECK);
  const headCenter = segPoint(neckTop, 180 + pose.torsoLean + pose.headTilt, HEAD_R);

  // braços (a partir do ombro)
  const elbowL = segPoint(shoulder, pose.shoulderL, UPPER_ARM);
  const handL = segPoint(elbowL, pose.shoulderL + pose.elbowL, FOREARM);
  const elbowR = segPoint(shoulder, pose.shoulderR, UPPER_ARM);
  const handR = segPoint(elbowR, pose.shoulderR + pose.elbowR, FOREARM);

  // pernas (a partir do quadril)
  const kneeL = segPoint(hip, pose.hipAngleL, UPPER_LEG);
  const footL = segPoint(kneeL, pose.hipAngleL + pose.kneeL, LOWER_LEG);
  const kneeR = segPoint(hip, pose.hipAngleR, UPPER_LEG);
  const footR = segPoint(kneeR, pose.hipAngleR + pose.kneeR, LOWER_LEG);

  // aplica a rotação do corpo inteiro (queda/levantada) à volta do quadril
  const rot = (p: Pt) => rotateAround(p, hip, pose.bodyRotation);
  const [shoulderR_, neckTopR, headCenterR, elbowLR, handLR, elbowRR, handRR, kneeLR, footLR, kneeRR, footRR] = [
    shoulder, neckTop, headCenter, elbowL, handL, elbowR, handR, kneeL, footL, kneeR, footR,
  ].map(rot);

  const linha = (a: Pt, b: Pt, key: string) => (
    <line key={key} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#ffffff" strokeWidth={STROKE} strokeLinecap="round" />
  );

  return (
    <svg viewBox="0 0 1080 1920" width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
      {/* pernas atrás do tronco */}
      {linha(hip, kneeLR, 'perna-esq-cima')}
      {linha(kneeLR, footLR, 'perna-esq-baixo')}
      {linha(hip, kneeRR, 'perna-dir-cima')}
      {linha(kneeRR, footRR, 'perna-dir-baixo')}
      {/* tronco */}
      {linha(hip, shoulderR_, 'tronco')}
      {/* braços */}
      {linha(shoulderR_, elbowLR, 'braco-esq-cima')}
      {linha(elbowLR, handLR, 'braco-esq-baixo')}
      {linha(shoulderR_, elbowRR, 'braco-dir-cima')}
      {linha(elbowRR, handRR, 'braco-dir-baixo')}
      {/* o peso carregado — um saco de tamanho fixo, centrado no meio das duas mãos.
          ⚠️ 01/10/2026: tinha o tamanho calculado pela DISTÂNCIA entre as mãos — e
          de perfil os dois braços quase se sobrepõem (mesmo gesto, visto de lado),
          então o "saco" colapsava para uma tira fina. Visto no render, corrigido
          para tamanho fixo. */}
      {heldObject && (() => {
        const meio = { x: (handLR.x + handRR.x) / 2, y: (handLR.y + handRR.y) / 2 };
        const w = 150; const h = 130;
        return (
          <rect
            x={meio.x - w / 2}
            y={meio.y - h * 0.3}
            width={w}
            height={h}
            rx={18}
            fill={BRAND.panel}
            stroke={BRAND.magenta}
            strokeWidth={8}
          />
        );
      })()}
      {/* cabeça + rosto */}
      <circle cx={headCenterR.x} cy={headCenterR.y} r={HEAD_R} fill="none" stroke="#ffffff" strokeWidth={STROKE} />
      <Rosto center={headCenterR} face={pose.face} bodyRotation={pose.bodyRotation} />
    </svg>
  );
};

/** O rosto — sobrancelhas, olhos e boca, simples, dentro da cabeça. */
const Rosto: React.FC<{ center: Pt; face: Pose['face']; bodyRotation: number }> = ({ center, face, bodyRotation }) => {
  const eyeOffsetX = 11;
  const eyeY = center.y - 4;
  const eyeR = 5 * face.eyeOpen;
  const browY = eyeY - 13;
  const browTilt = face.browAngle / 3; // graus visuais, suavizado
  const mouthY = center.y + 13;
  const mouthW = 16;
  const mouthCurveY = face.mouthCurve * 10;

  return (
    <g transform={`rotate(${bodyRotation}, ${center.x}, ${center.y})`}>
      {/* sobrancelhas */}
      <line x1={center.x - eyeOffsetX - 7} y1={browY + browTilt} x2={center.x - eyeOffsetX + 7} y2={browY - browTilt} stroke="#ffffff" strokeWidth={4} strokeLinecap="round" />
      <line x1={center.x + eyeOffsetX - 7} y1={browY - browTilt} x2={center.x + eyeOffsetX + 7} y2={browY + browTilt} stroke="#ffffff" strokeWidth={4} strokeLinecap="round" />
      {/* olhos */}
      <circle cx={center.x - eyeOffsetX} cy={eyeY} r={Math.max(1.5, eyeR)} fill="#ffffff" />
      <circle cx={center.x + eyeOffsetX} cy={eyeY} r={Math.max(1.5, eyeR)} fill="#ffffff" />
      {/* boca — uma curva simples (sorriso ou tristeza) */}
      <path
        d={`M ${center.x - mouthW} ${mouthY} Q ${center.x} ${mouthY + mouthCurveY} ${center.x + mouthW} ${mouthY}`}
        stroke="#ffffff"
        strokeWidth={4}
        fill="none"
        strokeLinecap="round"
      />
    </g>
  );
};

/**
 * ═══ O PILOTO — os 3 movimentos em sequência, com legenda de qual é qual ═══
 * Export separado (`StickmanPiloto`) para registar como composição isolada no
 * Root.tsx, do mesmo jeito que "Test" e "Galeria" — ver o comentário lá.
 */
const DUR_CARREGAR = 70; // ~2,3s a 30fps
const DUR_CAIR = 30; // ~1s
const DUR_LEVANTAR = 75; // ~2,5s

export const STICKMAN_PILOTO_FRAMES = DUR_CARREGAR + DUR_CAIR + DUR_LEVANTAR;
export const STICKMAN_PILOTO_FPS = 30;

export const StickmanPiloto: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  let pose: Pose;
  let legenda: string;
  let comPeso = false;

  if (frame < DUR_CARREGAR) {
    pose = poseCarregarPeso(frame, DUR_CARREGAR);
    legenda = '1 · CARREGAR PESO';
    comPeso = true;
  } else if (frame < DUR_CARREGAR + DUR_CAIR) {
    pose = poseCair(frame - DUR_CARREGAR, DUR_CAIR);
    legenda = '2 · CAIR';
  } else {
    pose = poseLevantar(frame - DUR_CARREGAR - DUR_CAIR, DUR_LEVANTAR, fps);
    legenda = '3 · LEVANTAR COM ESFORÇO';
  }

  const fadeIn = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg }}>
      <div
        style={{
          position: 'absolute', top: 60, left: 0, right: 0, textAlign: 'center',
          color: '#ffffff', fontSize: 40, fontWeight: 800, fontFamily: 'Arial, sans-serif',
          letterSpacing: 2, opacity: fadeIn,
        }}
      >
        {legenda}
      </div>
      <div
        style={{
          position: 'absolute', top: 115, left: 0, right: 0, textAlign: 'center',
          color: '#9ca3af', fontSize: 26, fontFamily: 'Arial, sans-serif',
        }}
      >
        frame {frame} / {STICKMAN_PILOTO_FRAMES}
      </div>
      <Stickman pose={pose} heldObject={comPeso} />
    </AbsoluteFill>
  );
};
