/**
 * AS 32 COREOGRAFIAS DA CAPA (IMPLEMENTACAO20 §21.2 — T1, 01/08/2026).
 *
 * Uma por imagem do catálogo. Cada uma é o ATOR (ver capa.tsx) a viver aquela
 * imagem durante 3,5 segundos, com o INSTANTE-CHAVE por volta de t=0,34 — ou seja,
 * ~1,2s, dentro do primeiro terço (regra 3 das 8 de composição).
 *
 * Porquê o primeiro terço, e porque isto não é estética: num Short a pessoa decide
 * em pouco mais de um segundo se fica. Uma queda que só acontece aos 3s não prende
 * ninguém — a pessoa já passou o dedo. Foi esta a lição da ratoeira em 31/07, que
 * fechava aos 60% da vida e o espectador só via uma barra aberta.
 *
 * ⚠️ AS ARMADILHAS JÁ PAGAS (não as repita):
 *  · degradê NÃO pinta <line> vertical — use <rect> (mordeu 3× num só dia)
 *  · chão/água/areia SANGRAM para fora do quadro ou desvanecem, nunca cortam a
 *    direito (um corte reto lê-se como caixa)
 *  · duas formas simétricas por cima de um corpo leem-se como uma CARA
 *  · porta que abre não se faz com scale — dobradiça fixa, aresta livre a recuar
 *  · o que está deitado não roda como o que está de pé
 *
 * OLHE O QUADRO: `npm run capas` renderiza as 32 uma a uma.
 */

import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { BRAND } from './theme';
import {
  Ator, Chao, Palco, PECA, brilho, PALCO_W, PALCO_H, CHAO, MEIO, prog,
  andar, arrastar, correr, tropecar, cair, hesitar, equilibrar, empurrar,
  subir, atingido, afundar, alcancar, olharCima, encolherSe,
} from './capa';

export type Coreografia = React.FC<{ life: number }>;

// ─── peças partilhadas ──────────────────────────────────────────────────────

/** Uma moeda com o cifrão — a mesma leitura que as imagens do catálogo já usam. */
const Moeda: React.FC<{ x: number; y: number; r?: number; op?: number; rot?: number }> = ({ x, y, r = 40, op = 1, rot = 0 }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot})`} opacity={op}>
    <circle r={r} fill={BRAND.violet} stroke={BRAND.cyan} strokeWidth={r * 0.14} />
    <text y={r * 0.36} fontSize={r * 1.1} fontWeight={900} textAnchor="middle" fill={BRAND.text}>$</text>
  </g>
);

/** Nota de dinheiro deitada — para o que voa, queima ou escorre. */
const Nota: React.FC<{ x: number; y: number; rot?: number; op?: number; s?: number }> = ({ x, y, rot = 0, op = 1, s = 1 }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`} opacity={op}>
    <rect x={-54} y={-30} width={108} height={60} rx={8} fill={PECA} stroke={BRAND.cyan} strokeWidth={5} />
    <circle r={14} fill={BRAND.violet} />
  </g>
);

/** Marcas de velocidade — dizem "isto está a mover-se" sem cor nova. */
const Riscos: React.FC<{ x: number; y: number; n?: number; larg?: number; op?: number; sentido?: number }> = ({ x, y, n = 3, larg = 120, op = 0.5, sentido = -1 }) => (
  <g opacity={op}>
    {Array.from({ length: n }).map((_, i) => (
      <rect
        key={i}
        x={x + sentido * (larg + i * 34)}
        y={y + i * 42 - (n - 1) * 21}
        width={larg - i * 22}
        height={8}
        rx={4}
        fill={BRAND.sub}
      />
    ))}
  </g>
);

// ════════════════════════════════════════════════════════════════════════════
// FAMÍLIA — CRESCER / ACUMULAR
// ════════════════════════════════════════════════════════════════════════════

/** bola-neve: a bola cresce atrás e o ator FOGE. Instante-chave: ela quase o apanha. */
const CapaBolaNeve: Coreografia = ({ life }) => {
  const f = useCurrentFrame();
  const t = prog(f, life);
  // GRANDE de propósito: no instante-chave a bola tem de encher meio ecrã, senão
  // não para o dedo de ninguém. Medido na galeria: a 128 lia-se como uma moeda.
  const r = interpolate(t, [0, 0.34, 1], [90, 240, 310]);
  // ⚠️ o palco visível vai de x≈150 a x≈1090 (o zoom corta o resto): a bola tem de
  // caber lá dentro, senão vira uma mancha colada à borda esquerda
  const bolaX = interpolate(t, [0, 0.34, 1], [-100, 420, 690], { easing: Easing.in(Easing.quad) });
  const atorX = interpolate(t, [0, 1], [MEIO + 230, MEIO + 360]);
  return (
    <Palco life={life}>
      <defs>
        <linearGradient id="bn-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={BRAND.cyan} /><stop offset="100%" stopColor={BRAND.violet} />
        </linearGradient>
        {/* a bola precisa de COR própria: a cinzenta das peças, num círculo deste
            tamanho, lia-se como um disco morto colado ao fundo */}
        <radialGradient id="bn-corpo">
          <stop offset="0%" stopColor="#5b6b8f" /><stop offset="100%" stopColor="#2b3242" />
        </radialGradient>
      </defs>
      <Chao />
      <Riscos x={bolaX - r} y={CHAO - r} n={3} op={0.45} />
      <g transform={`translate(${bolaX} ${CHAO - r}) rotate(${t * 900})`} style={brilho(BRAND.cyan, 40)}>
        <circle r={r} fill="url(#bn-corpo)" stroke="url(#bn-g)" strokeWidth={20} />
        {/* uma só marca de rotação — duas ficariam simétricas e leriam como olhos */}
        <path d={`M${-r * 0.5},0 A${r * 0.5},${r * 0.5} 0 0 1 ${r * 0.5},0`} fill="none" stroke={BRAND.cyan} strokeWidth={16} opacity={0.9} />
      </g>
      <Ator id="bn" x={atorX} {...correr(f / 3)} escala={1} />
    </Palco>
  );
};

/** foguete: o ator agarra-se ao foguete e é LEVADO. Instante-chave: a ignição. */
const CapaFoguete: Coreografia = ({ life }) => {
  const f = useCurrentFrame();
  const t = prog(f, life);
  // sobe até 380 e não mais: acima disto a cabeça do ator sai pela borda de cima
  const sobe = interpolate(t, [0, 0.28, 1], [0, 10, 380], { easing: Easing.in(Easing.cubic) });
  const chama = t < 0.24 ? 0 : interpolate(t, [0.24, 0.34], [0, 1], { extrapolateRight: 'clamp' });
  const tremor = t > 0.16 && t < 0.34 ? Math.sin(f * 2.2) * 7 : 0;
  return (
    <Palco life={life}>
      <defs>
        <linearGradient id="fg-g" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={BRAND.violet} /><stop offset="100%" stopColor={BRAND.cyan} />
        </linearGradient>
        <linearGradient id="fg-fogo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={BRAND.yellow} /><stop offset="100%" stopColor={BRAND.magenta} stopOpacity={0} />
        </linearGradient>
      </defs>
      <Chao />
      <g transform={`translate(${MEIO - 90 + tremor} ${-sobe})`}>
        {/* chama — desenhada antes do corpo, para o corpo a tapar em cima */}
        <path d={`M-58,${CHAO - 60} Q0,${CHAO + 140 + chama * 280} 58,${CHAO - 60} Z`} fill="url(#fg-fogo)" opacity={chama} style={brilho(BRAND.yellow, 40)} />
        <path d={`M0,${CHAO - 800} Q116,${CHAO - 480} 100,${CHAO - 60} L-100,${CHAO - 60} Q-116,${CHAO - 480} 0,${CHAO - 800} Z`} fill={PECA} stroke="url(#fg-g)" strokeWidth={17} style={brilho(BRAND.cyan, 26)} />
        {/* UMA aleta só de cada lado seria simétrico; esta fica só do lado do ator */}
        <path d={`M100,${CHAO - 240} L196,${CHAO - 58} L100,${CHAO - 58} Z`} fill={BRAND.violet} opacity={0.9} />
        <circle cx={0} cy={CHAO - 540} r={54} fill={BRAND.cyan} opacity={0.9} />
      </g>
      <Ator
        id="fg"
        x={MEIO + 190 + tremor}
        sobe={sobe}
        {...alcancar(t)}
        inclina={-8 - t * 26}
        ancaA={-30 - t * 40} ancaB={-46 - t * 46} joelhoA={20 + t * 40} joelhoB={16 + t * 34}
        escala={0.92}
      />
    </Palco>
  );
};

/** semente: o ator planta e o rebento IRROMPE. Instante-chave: o disparo do caule. */
const CapaSemente: Coreografia = ({ life }) => {
  const f = useCurrentFrame();
  const t = prog(f, life);
  // o caule tem de passar a ALTURA DO ATOR para o gesto ler como "irrompeu";
  // a 300px ficava-lhe pela cintura e parecia um pauzinho espetado no chão
  const alturaCaule = interpolate(t, [0.2, 0.34, 1], [0, 720, 900], { extrapolateLeft: 'clamp', easing: Easing.out(Easing.cubic) });
  const recuo = interpolate(t, [0.26, 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const folha = interpolate(t, [0.3, 0.6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <Palco life={life}>
      <defs>
        <linearGradient id="sm-g" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={BRAND.violet} /><stop offset="100%" stopColor={BRAND.cyan} />
        </linearGradient>
      </defs>
      <Chao />
      {/* o caule é um <rect>, não uma <line>: degradê em linha vertical não pinta */}
      <rect x={MEIO - 210} y={CHAO - alturaCaule} width={46} height={alturaCaule} rx={23} fill="url(#sm-g)" style={brilho(BRAND.cyan, 30)} />
      <path
        d={`M${MEIO - 187},${CHAO - alturaCaule + 70} Q${MEIO - 187 + 300 * folha},${CHAO - alturaCaule - 30} ${MEIO - 187 + 80 * folha},${CHAO - alturaCaule + 250}`}
        fill={BRAND.cyan} opacity={0.9 * folha}
      />
      <path
        d={`M${MEIO - 187},${CHAO - alturaCaule + 300} Q${MEIO - 187 - 220 * folha},${CHAO - alturaCaule + 210} ${MEIO - 187 - 40 * folha},${CHAO - alturaCaule + 470}`}
        fill={BRAND.violet} opacity={0.85 * folha}
      />
      <Ator
        id="sm"
        x={MEIO + 250}
        {...(t < 0.26 ? alcancar(t * 3) : olharCima(f / 4))}
        inclina={interpolate(recuo, [0, 1], [16, -12])}
        escala={0.94}
      />
    </Palco>
  );
};

/** escada: o ator sobe e um degrau PARTE-SE. Instante-chave: a fenda. */
const CapaEscada: Coreografia = ({ life }) => {
  const f = useCurrentFrame();
  const t = prog(f, life);
  const degraus = [0, 1, 2, 3, 4];
  const quebra = interpolate(t, [0.3, 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const desce = interpolate(t, [0.34, 1], [0, 90], { extrapolateLeft: 'clamp', easing: Easing.in(Easing.quad) });
  // ⚠️ MEDIDAS ESCOLHIDAS PELA ALTURA DO ATOR, não pelo desenho.
  // Um degrau tem de dar para pisar: 300 de largura (o ator tem ~200 de vão) e 150 de
  // subida. Com os 150×108 da 1ª versão, o ator pairava por cima de umas ripas.
  // E o degrau que parte é o 2º, não o 4º: no 4º a cabeça saía pelo topo do desenho.
  const LARG = 300, SUBIDA = 150, AVANCO = 230, X0 = 170;
  const QUEBRADO = 2;
  return (
    <Palco life={life}>
      <defs>
        <linearGradient id="ec-g" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor={BRAND.cyan} /><stop offset="100%" stopColor={BRAND.violet} />
        </linearGradient>
      </defs>
      <Chao />
      {degraus.map((i) => {
        const dx = X0 + i * AVANCO;
        const dy = CHAO - i * SUBIDA;
        const partido = i === QUEBRADO;
        return (
          <g key={i} transform={partido ? `translate(0 ${desce}) rotate(${quebra * 13} ${dx} ${dy})` : undefined}>
            <rect x={dx} y={dy - 56} width={LARG} height={56} rx={16} fill={PECA} stroke="url(#ec-g)" strokeWidth={13} opacity={partido ? 1 : 0.95} style={brilho(BRAND.cyan, 18)} />
            {partido && quebra > 0.2 && (
              <path d={`M${dx + LARG / 2},${dy - 56} l-22,28 l26,28`} fill="none" stroke={BRAND.magenta} strokeWidth={12} strokeLinecap="round" />
            )}
          </g>
        );
      })}
      {/* em cima do degrau que parte. x = início do degrau + metade da largura */}
      <Ator
        id="ec"
        x={X0 + QUEBRADO * AVANCO + LARG / 2}
        chaoY={CHAO - QUEBRADO * SUBIDA - 56 + desce}
        {...subir(f / 5)}
        inclina={13 + quebra * 16}
        escala={0.66}
      />
    </Palco>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// FAMÍLIA — PERDER / VAZAR
// ════════════════════════════════════════════════════════════════════════════

/** ralo: o chão inclina-se para o ralo e o ator trava-se. Instante-chave: o desequilíbrio. */
const CapaRalo: Coreografia = ({ life }) => {
  const f = useCurrentFrame();
  const t = prog(f, life);
  const puxa = interpolate(t, [0.18, 0.34], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const moedas = [0, 1, 2];
  return (
    <Palco life={life}>
      <defs>
        <radialGradient id="rl-g">
          <stop offset="0%" stopColor="#05070b" /><stop offset="70%" stopColor="#2b3242" /><stop offset="100%" stopColor={BRAND.violet} />
        </radialGradient>
      </defs>
      <Chao />
      {/* o funil do ralo, encostado ao chão — GRANDE, senão perde para o ator */}
      <ellipse cx={MEIO - 250} cy={CHAO} rx={320} ry={88} fill="url(#rl-g)" stroke={BRAND.cyan} strokeWidth={14} style={brilho(BRAND.cyan, 30)} />
      <ellipse cx={MEIO - 250} cy={CHAO + 10} rx={156} ry={42} fill="#05070b" opacity={0.9} />
      {moedas.map((i) => {
        const p = Math.max(0, Math.min(1, (t * 2.4 + i * 0.33) % 1));
        return <Moeda key={i} x={MEIO - 250 + Math.cos(p * 7 + i) * (270 * (1 - p))} y={CHAO - 230 * (1 - p)} r={58 * (1 - p * 0.7)} op={1 - p * 0.6} rot={p * 200} />;
      })}
      {/* ele está a ser PUXADO para o ralo: pé da frente a derrapar em direção a ele,
          corpo atirado para trás, braços atrás. A 1ª versão punha os dois braços no
          mesmo ângulo e o conjunto lia-se como uma barra horizontal (regra 4). */}
      <Ator
        id="rl"
        x={MEIO + 240}
        {...atingido(puxa)}
        inclina={interpolate(puxa, [0, 1], [4, -30])}
        ancaA={30 + puxa * 30} ancaB={-16} joelhoA={18} joelhoB={44}
        ombroA={-72 - puxa * 60} ombroB={-38 - puxa * 46} cotoveloA={-24} cotoveloB={-52}
        escala={0.94}
      />
    </Palco>
  );
};

/** balde-furado: enche por cima, perde por baixo. Instante-chave: o furo abre. */
const CapaBaldeFurado: Coreografia = ({ life }) => {
  const f = useCurrentFrame();
  const t = prog(f, life);
  const furo = interpolate(t, [0.26, 0.34], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const nivel = interpolate(t, [0, 0.3, 1], [0, 118, 30]);
  const bx = MEIO - 60;
  return (
    <Palco life={life}>
      <defs>
        <linearGradient id="bf-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={BRAND.cyan} /><stop offset="100%" stopColor={BRAND.violet} />
        </linearGradient>
      </defs>
      <Chao />
      {/* o jato que entra por cima */}
      <rect x={bx - 11} y={CHAO - 470} width={22} height={210} rx={11} fill={BRAND.cyan} opacity={0.85} />
      {/* o balde: mais estreito em baixo, para não se ler como caixote */}
      <path d={`M${bx - 128},${CHAO - 260} L${bx + 128},${CHAO - 260} L${bx + 96},${CHAO} L${bx - 96},${CHAO} Z`} fill={PECA} stroke="url(#bf-g)" strokeWidth={10} />
      <rect x={bx - 112} y={CHAO - 20 - nivel} width={224} height={nivel} rx={6} fill={BRAND.violet} opacity={0.55} />
      {/* o furo e o esguicho — de um lado só (dois seriam simétricos) */}
      <circle cx={bx + 88} cy={CHAO - 74} r={13 * furo} fill="#05070b" stroke={BRAND.magenta} strokeWidth={5 * furo} />
      {furo > 0.2 && (
        <path d={`M${bx + 96},${CHAO - 72} Q${bx + 210},${CHAO - 50} ${bx + 236},${CHAO}`} fill="none" stroke={BRAND.magenta} strokeWidth={16} strokeLinecap="round" opacity={furo} />
      )}
      <Ator id="bf" x={MEIO + 320} {...olharCima(f / 5)} cabeca={16} inclina={10} escala={0.9} />
    </Palco>
  );
};

/** buraco: quanto mais cava, mais fundo. Instante-chave: já está abaixo do chão. */
const CapaBuraco: Coreografia = ({ life }) => {
  const f = useCurrentFrame();
  const t = prog(f, life);
  // ⚠️ O buraco tem de ser LARGO e o ator tem de ficar dentro dele até à cintura.
  // Na 1ª versão o buraco tinha 200 de fundo e o ator aparecia de cabeça para baixo
  // dentro de um funilzinho. E não pode passar de ~283 abaixo do chão: mais do que
  // isso e o fundo do buraco sai pela borda de baixo do desenho.
  const fundo = interpolate(t, [0, 0.34, 1], [60, 250, 300], { easing: Easing.out(Easing.quad) });
  const BOCA = 330, FUNDO_MEIO = 250;
  const terra = [0, 1, 2];
  return (
    <Palco life={life}>
      <defs>
        <linearGradient id="br-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2b3242" /><stop offset="100%" stopColor="#05070b" />
        </linearGradient>
        <linearGradient id="br-borda" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={BRAND.sub} stopOpacity={0} />
          <stop offset="20%" stopColor={BRAND.sub} stopOpacity={0.5} />
          <stop offset="80%" stopColor={BRAND.sub} stopOpacity={0.5} />
          <stop offset="100%" stopColor={BRAND.sub} stopOpacity={0} />
        </linearGradient>
      </defs>
      {/* o chão parte-se em dois e o buraco fica no meio — sangra para os lados */}
      <rect x={-120} y={CHAO} width={MEIO - BOCA + 120} height={16} rx={8} fill="url(#br-borda)" />
      <rect x={MEIO + BOCA} y={CHAO} width={PALCO_W} height={16} rx={8} fill="url(#br-borda)" />
      {/* o ator PRIMEIRO: as paredes do buraco desenhadas depois tapam-lhe as pernas,
          e é isso que o põe DENTRO do buraco em vez de à frente dele */}
      {/* DE PÉ dentro do buraco, curvado a cavar — não de cabeça para baixo. A 20° de
          inclinação com o braço esticado ele lia-se como alguém a cair lá dentro. */}
      <Ator
        id="br" x={MEIO} chaoY={CHAO + fundo - 10}
        {...arrastar(0, 0.4)}
        ombroA={62} cotoveloA={34} ombroB={84} cotoveloB={18}
        inclina={26} escala={0.82}
      />
      {/* A TERRA = todo o subsolo MENOS a cavidade. Faz-se com dois contornos no
          mesmo desenho e `fillRule="evenodd"`: o de dentro fura o de fora.
          ⚠️ Sem o furo, a terra é uma laje inteira e tapa o ator por completo —
          o buraco deixaria de existir e ficaria só um chão escuro. */}
      <path
        fillRule="evenodd"
        d={
          `M-120,${CHAO + 16} H${PALCO_W + 120} V${PALCO_H} H-120 Z `
          + `M${MEIO - BOCA},${CHAO + 16} L${MEIO + BOCA},${CHAO + 16} L${MEIO + FUNDO_MEIO},${CHAO + fundo} L${MEIO - FUNDO_MEIO},${CHAO + fundo} Z`
        }
        fill="url(#br-g)"
      />
      {/* o contorno da cavidade, à parte — senão o traço desenhava também a moldura */}
      <path
        d={`M${MEIO - BOCA},${CHAO + 16} L${MEIO - FUNDO_MEIO},${CHAO + fundo} L${MEIO + FUNDO_MEIO},${CHAO + fundo} L${MEIO + BOCA},${CHAO + 16}`}
        fill="none" stroke={BRAND.violet} strokeWidth={12} strokeLinejoin="round"
      />
      {/* terra atirada para fora, só de um lado */}
      {terra.map((i) => {
        const p = (t * 3 + i * 0.34) % 1;
        return <circle key={i} cx={MEIO + BOCA + 60 + p * 190} cy={CHAO - 190 * Math.sin(p * Math.PI)} r={26 - i * 5} fill={BRAND.sub} opacity={0.7 * (1 - p)} />;
      })}
    </Palco>
  );
};

/** fumaca: o dinheiro vira fumaça na mão. Instante-chave: pega fogo. */
const CapaFumaca: Coreografia = ({ life }) => {
  const f = useCurrentFrame();
  const t = prog(f, life);
  const pega = interpolate(t, [0.24, 0.34], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const baforadas = [0, 1, 2, 3];
  // à altura da MÃO ESTICADA do ator (ombro a ~525, braço a subir), não da anca
  const mx = MEIO - 200, my = CHAO - 640;
  return (
    <Palco life={life}>
      <defs>
        <linearGradient id="fm-fogo" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={BRAND.magenta} /><stop offset="100%" stopColor={BRAND.yellow} />
        </linearGradient>
      </defs>
      <Chao />
      <Nota x={mx} y={my} rot={-14} op={1 - pega * 0.75} s={1.9 - pega * 0.4} />
      {pega > 0.05 && (
        <g style={brilho(BRAND.yellow, 40)}>
          <path d={`M${mx - 76},${my + 40} Q${mx},${my - 150 - pega * 150} ${mx + 76},${my + 40} Z`} fill="url(#fm-fogo)" opacity={pega} />
        </g>
      )}
      {baforadas.map((i) => {
        const p = Math.max(0, Math.min(1, (t - 0.28) * 2.2 + i * 0.22));
        if (p <= 0) return null;
        return (
          <circle
            key={i}
            cx={mx + Math.sin(p * 5 + i * 2) * 110}
            cy={my - 140 - p * 430}
            r={64 + p * 130}
            fill={BRAND.sub}
            opacity={0.42 * (1 - p)}
          />
        );
      })}
      {/* recua com o susto: o braço desce e o tronco vai para trás quando pega fogo */}
      <Ator id="fm" x={MEIO + 130} {...alcancar(0.4)} ombroB={126 - pega * 44} cotoveloB={10 + pega * 40} inclina={interpolate(pega, [0, 1], [12, -16])} cabeca={-16} escala={0.94} />
    </Palco>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// FAMÍLIA — DÍVIDA / PESO
// ════════════════════════════════════════════════════════════════════════════

/** bola-de-ferro: a corrente estica e PUXA-O para trás. Instante-chave: o tranco. */
const CapaBolaDeFerro: Coreografia = ({ life }) => {
  const f = useCurrentFrame();
  const t = prog(f, life);
  const tranco = interpolate(t, [0.28, 0.34, 0.5], [0, 1, 0.55], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const atorX = interpolate(t, [0, 0.3, 1], [MEIO - 30, MEIO + 96, MEIO + 62]);
  const bolaX = MEIO - 330;
  const elos = [0, 1, 2, 3, 4];
  return (
    <Palco life={life}>
      <defs>
        {/* ⚠️ mais clara do que parece "ferro": a versão escura desaparecia no fundo
            #0d1117 — é a regra 1, e foi o defeito que a bola-de-ferro do catálogo já
            tinha tido em 31/07 */}
        <radialGradient id="bfr-g">
          <stop offset="0%" stopColor="#7b88a8" /><stop offset="100%" stopColor="#2b3242" />
        </radialGradient>
      </defs>
      <Chao />
      {/* A CORRENTE VAI DO CENTRO DA BOLA AO TORNOZELO DELE — não do ar ao ar.
          Na 1ª versão nascia num ponto solto e morria noutro, e liam-se três argolas
          a pairar entre duas coisas sem relação. */}
      {elos.map((i) => {
        const p = i / (elos.length - 1);
        const barriga = (1 - tranco) * 64 * Math.sin(p * Math.PI);
        return (
          <circle
            key={i}
            cx={bolaX + 100 + (atorX - bolaX - 100) * p}
            cy={CHAO - 70 + barriga}
            r={26}
            fill="none"
            stroke={BRAND.sub}
            strokeWidth={15}
          />
        );
      })}
      <circle cx={bolaX} cy={CHAO - 155} r={155} fill="url(#bfr-g)" stroke={BRAND.violet} strokeWidth={15} style={brilho(BRAND.violet, 34)} />
      {/* brilho ÚNICO e descentrado — dois seriam um par de olhos */}
      <circle cx={bolaX - 58} cy={CHAO - 212} r={34} fill={BRAND.cyan} opacity={0.4} />
      <Ator
        id="bfr"
        x={atorX}
        {...arrastar(f / 7, 0.5)}
        inclina={interpolate(tranco, [0, 1], [16, -14])}
        ombroA={-44 - tranco * 40} ombroB={-26 - tranco * 46}
        escala={0.94}
      />
    </Palco>
  );
};

/** ratoeira: ele estende a mão ao isco e a barra FECHA. Instante-chave: o estalo. */
const CapaRatoeira: Coreografia = ({ life }) => {
  const f = useCurrentFrame();
  const t = prog(f, life);
  const fecha = interpolate(t, [0.28, 0.34], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.quad) });
  const recuo = interpolate(t, [0.32, 0.46], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  // a ratoeira ficava minúscula a um canto: agora ocupa metade do palco e o isco cai
  // dentro do alcance real do braço do ator (2×118 = 236px)
  const bx = MEIO - 40;
  return (
    <Palco life={life}>
      <defs>
        <linearGradient id="rt-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={BRAND.magenta} /><stop offset="100%" stopColor={BRAND.violet} />
        </linearGradient>
      </defs>
      <Chao />
      {/* a base de madeira */}
      <rect x={bx - 320} y={CHAO - 74} width={640} height={74} rx={20} fill={PECA} stroke={BRAND.cyan} strokeWidth={11} />
      {/* a barra: roda em torno da dobradiça da esquerda (nunca por scale) */}
      <g transform={`rotate(${interpolate(fecha, [0, 1], [-142, -4])} ${bx - 272} ${CHAO - 74})`} style={brilho(BRAND.magenta, 30)}>
        <rect x={bx - 272} y={CHAO - 102} width={572} height={34} rx={17} fill="url(#rt-g)" />
      </g>
      <circle cx={bx - 272} cy={CHAO - 74} r={28} fill={BRAND.sub} />
      {/* o isco */}
      <Moeda x={bx + 150} y={CHAO - 122} r={54} op={1 - fecha * 0.35} />
      <Ator
        id="rt"
        x={bx + 386}
        {...(t < 0.3 ? alcancar(t * 3) : atingido(recuo))}
        escala={0.94}
      />
    </Palco>
  );
};

/**
 * mochila-pedras: A CAPA QUE O DONO DESCREVEU, palavra por palavra —
 * *"uma pessoa andando devagar, muito cansado carregando uma mochila, e de repente
 * ele não aguenta mais e escorrega e cai."*
 * Instante-chave: o escorregão, a 1,2s.
 */
const CapaMochilaPedras: Coreografia = ({ life }) => {
  const f = useCurrentFrame();
  const t = prog(f, life);
  const escorrega = interpolate(t, [0.26, 0.34], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const queda = interpolate(t, [0.34, 0.62], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  // recua um pouco DEPOIS de cair: ao tombar, a cabeça avança ~350px para a frente
  const atorX = interpolate(t, [0, 0.34, 1], [MEIO - 170, MEIO + 40, MEIO - 20]);
  const pose = t < 0.26 ? arrastar(f / 7, 1) : t < 0.34 ? tropecar(escorrega) : cair(queda);
  const ESCALA = 0.96;
  // ⚠️ O OMBRO NÃO É UM NÚMERO ESCRITO À MÃO. Sai das medidas do ator: os pés estão
  // em 0, a anca a (coxa+canela) e o ombro mais um tronco acima. A 1ª versão punha a
  // mochila em `CHAO - 300` e ela ficou a FLUTUAR ao lado do corpo, à altura da anca
  // — visto na galeria. Com o ator a crescer de 392 para 800px o erro só piorava.
  const AGACHA = pose.encolhe || 0;
  const OMBRO_Y = -((130 - AGACHA * 40) * 2 + 265);
  return (
    <Palco life={life}>
      <defs>
        <linearGradient id="mp-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={BRAND.cyan} /><stop offset="100%" stopColor={BRAND.violet} />
        </linearGradient>
      </defs>
      <Chao />
      {/* A MOCHILA — nas costas, de UM lado só, e desenhada ANTES do ator para ficar
          ATRÁS dele. Desenhada depois, ela aparecia colada ao peito. ⚠️ Na imagem do catálogo duas alças
          simétricas por cima do corpo leram-se como ORELHAS DE COELHO (31/07): aqui
          há uma pega só, e encostada.
          O grupo repete EXATAMENTE a transformação do ator (mesma posição, mesma
          rotação em torno dos pés, mesma escala) e só depois desce até ao ombro. É
          isto que faz a mochila tombar COM ele em vez de ficar para trás. */}
      <g transform={`translate(${atorX} ${CHAO}) rotate(${pose.inclina || 0}) scale(${ESCALA})`}>
        {/* -190: bem atrás das costas. A -108 a mochila ficava POR CIMA do tronco e
            tapava-o — o ator lia-se como uma cabeça e umas pernas com uma caixa ao
            meio. O tronco tem de continuar a ver-se. */}
        <g transform={`translate(-190 ${OMBRO_Y + 40})`} style={brilho(BRAND.violet, 24)}>
          <rect x={-86} y={-70} width={172} height={230} rx={42} fill={PECA} stroke="url(#mp-g)" strokeWidth={13} />
          <path d="M-42,-68 Q-8,-132 36,-70" fill="none" stroke={BRAND.sub} strokeWidth={20} strokeLinecap="round" />
          {/* as pedras empilham no FUNDO — é o fundo que carrega o peso */}
          {[0, 1, 2].map((i) => (
            <polygon
              key={i}
              points={`${-58 + i * 48},${126} ${-36 + i * 48},${76} ${8 + i * 48},${84} ${-6 + i * 48},${136}`}
              fill={BRAND.sub} stroke={BRAND.text} strokeWidth={4} opacity={0.95}
            />
          ))}
        </g>
      </g>
      <Ator id="mp" x={atorX} {...pose} escala={ESCALA} />
      {escorrega > 0.1 && queda < 0.9 && <Riscos x={atorX - 40} y={CHAO - 26} n={2} larg={90} op={0.6 * (1 - queda)} />}
    </Palco>
  );
};

/** areia-movedica: já está pela cintura. Instante-chave: a areia passa a linha do quadril. */
const CapaAreiaMovedica: Coreografia = ({ life }) => {
  const f = useCurrentFrame();
  const t = prog(f, life);
  // ⚠️ menos afundamento e superfície mais baixa: com a areia a CHAO-130 e 250 de
  // mergulho só se via a cabeça, e a areia lia-se como uma parede amarela a meio
  // do ecrã em vez de chão
  const mergulho = interpolate(t, [0, 0.34, 1], [30, 190, 260], { easing: Easing.out(Easing.quad) });
  const superficie = CHAO - 40;
  return (
    <Palco life={life}>
      <defs>
        <linearGradient id="am-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={BRAND.yellow} stopOpacity={0.92} />
          <stop offset="55%" stopColor="#6b5c10" stopOpacity={0.98} />
          {/* desvanece no fundo: sem isto a areia acaba num corte reto (regra 2) */}
          <stop offset="100%" stopColor="#6b5c10" stopOpacity={0} />
        </linearGradient>
      </defs>
      {/* o ator PRIMEIRO, para a areia o tapar da cintura para baixo */}
      <Ator id="am" x={MEIO} chaoY={superficie + mergulho} {...afundar(t)} escala={0.96} />
      <path
        d={`M-120,${superficie + 26} Q${MEIO * 0.5},${superficie - 22} ${MEIO},${superficie + 14} T${PALCO_W + 120},${superficie + 20} L${PALCO_W + 120},${PALCO_H} L-120,${PALCO_H} Z`}
        fill="url(#am-g)"
      />
      {/* ondas do afundamento, à volta do corpo */}
      {[0, 1].map((i) => {
        const p = (t * 2 + i * 0.5) % 1;
        return <ellipse key={i} cx={MEIO} cy={superficie + 18} rx={90 + p * 190} ry={16 + p * 22} fill="none" stroke={BRAND.yellow} strokeWidth={5} opacity={0.5 * (1 - p)} />;
      })}
    </Palco>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// FAMÍLIA — ERRO / QUEDA
// ════════════════════════════════════════════════════════════════════════════

/** escorregao: os pés voam para a frente. Instante-chave: o pé perde o chão. */
const CapaEscorregao: Coreografia = ({ life }) => {
  const f = useCurrentFrame();
  const t = prog(f, life);
  const escorrega = interpolate(t, [0.24, 0.34], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const queda = interpolate(t, [0.34, 0.66], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const atorX = interpolate(t, [0, 0.34, 1], [MEIO - 190, MEIO + 10, MEIO + 110]);
  return (
    <Palco life={life}>
      <defs>
        <linearGradient id="es-g" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={BRAND.magenta} stopOpacity={0} />
          <stop offset="50%" stopColor={BRAND.magenta} stopOpacity={0.75} />
          <stop offset="100%" stopColor={BRAND.magenta} stopOpacity={0} />
        </linearGradient>
      </defs>
      <Chao />
      {/* a mancha escorregadia — desvanece nas duas pontas, nunca corta a direito */}
      <ellipse cx={MEIO + 30} cy={CHAO + 4} rx={230} ry={22} fill="url(#es-g)" />
      <Ator id="es" x={atorX} {...(t < 0.34 ? tropecar(escorrega) : cair(queda))} escala={0.96} />
      {escorrega > 0.1 && <Riscos x={atorX - 60} y={CHAO - 20} n={3} larg={110} op={0.6 * (1 - queda)} />}
    </Palco>
  );
};

/** avalanche: a massa vem de cima e ele vira-se para fugir. Instante-chave: ela chega. */
const CapaAvalanche: Coreografia = ({ life }) => {
  const f = useCurrentFrame();
  const t = prog(f, life);
  const avanca = interpolate(t, [0, 0.34, 1], [-520, 60, 380], { easing: Easing.in(Easing.quad) });
  const blocos = [0, 1, 2, 3, 4, 5, 6];
  return (
    <Palco life={life}>
      <defs>
        <linearGradient id="av-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={BRAND.cyan} /><stop offset="100%" stopColor={BRAND.violet} />
        </linearGradient>
      </defs>
      <Chao />
      {/* a encosta sangra pela esquerda e pelo topo */}
      <path d={`M-120,${CHAO} L-120,${CHAO - 560} L520,${CHAO} Z`} fill="#161b22" stroke={BRAND.sub} strokeWidth={6} opacity={0.6} />
      <g transform={`translate(${avanca} 0)`}>
        {blocos.map((i) => {
          const fila = Math.floor(i / 3);
          const bx = 90 + (i % 3) * 168 + fila * 74;
          const by = CHAO - 78 - fila * 164;
          // regra 6: cada bloco roda ao seu ritmo — um monte não gira em bloco
          return (
            <rect
              key={i}
              x={bx} y={by} width={150} height={150} rx={28}
              fill={PECA} stroke="url(#av-g)" strokeWidth={14}
              transform={`rotate(${(i * 47 + f * (2.6 + i * 0.4)) % 360} ${bx + 75} ${by + 75})`}
              style={brilho(BRAND.cyan, 26)}
            />
          );
        })}
      </g>
      {/* ⚠️ o palco só se vê entre x≈180 e x≈1060 (por causa do zoom): a 920 o ator
          saía meio cortado pela borda direita */}
      <Ator id="av" x={MEIO + 250} {...correr(f / 3)} escala={0.92} />
    </Palco>
  );
};

/** domino: ele empurra a 1ª peça e a fila cai. Instante-chave: a 3ª peça bate na 4ª. */
const CapaDomino: Coreografia = ({ life }) => {
  const f = useCurrentFrame();
  const t = prog(f, life);
  const pecas = [0, 1, 2, 3, 4, 5];
  return (
    <Palco life={life}>
      <defs>
        <linearGradient id="dm-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={BRAND.cyan} /><stop offset="100%" stopColor={BRAND.violet} />
        </linearGradient>
      </defs>
      <Chao />
      {pecas.map((i) => {
        // peças altas e afastadas: com 52×190 desapareciam ao lado de um ator de 800
        const px = 300 + i * 158;
        // a onda chega a cada peça um pouco depois; a 3ª cai em t≈0,34
        const inicio = 0.14 + i * 0.07;
        const q = interpolate(t, [inicio, inicio + 0.1], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.quad) });
        return (
          <g key={i} transform={`rotate(${q * 76} ${px + 42} ${CHAO})`} style={brilho(BRAND.cyan, 18)}>
            <rect x={px} y={CHAO - 330} width={84} height={330} rx={16} fill={PECA} stroke="url(#dm-g)" strokeWidth={12} />
            <circle cx={px + 42} cy={CHAO - 240} r={19} fill={BRAND.cyan} opacity={0.9} />
          </g>
        );
      })}
      <Ator id="dm" x={190} {...empurrar(Math.min(1, t * 4))} inclina={16} escala={0.9} />
    </Palco>
  );
};

/** castelo-cartas: ele põe a última carta e tudo vem abaixo. Instante-chave: o desabar. */
const CapaCasteloCartas: Coreografia = ({ life }) => {
  const f = useCurrentFrame();
  const t = prog(f, life);
  const rui = interpolate(t, [0.28, 0.34, 1], [0, 0.35, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.quad) });
  const bx = MEIO - 190;
  const VAO = 210, ANDAR = 250;
  // pares em "A" (de pé) + as travessas (deitadas) — regra 6: rodam de forma diferente
  const pares = [
    { x: bx - VAO, y: CHAO }, { x: bx, y: CHAO }, { x: bx + VAO, y: CHAO },
    { x: bx - VAO / 2, y: CHAO - ANDAR }, { x: bx + VAO / 2, y: CHAO - ANDAR },
  ];
  const deitadas = [{ x: bx - VAO / 2, y: CHAO - ANDAR }, { x: bx + VAO / 2, y: CHAO - ANDAR }, { x: bx, y: CHAO - ANDAR * 2 }];
  return (
    <Palco life={life}>
      <defs>
        <linearGradient id="cc-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={BRAND.cyan} /><stop offset="100%" stopColor={BRAND.magenta} />
        </linearGradient>
      </defs>
      <Chao />
      {pares.map((p, i) => (
        <g key={`p${i}`} transform={`translate(${rui * (i % 2 ? 60 : -60)} ${rui * 130}) rotate(${rui * (i % 2 ? 84 : -84)} ${p.x} ${p.y})`} opacity={1 - rui * 0.15}>
          <rect x={p.x - 88} y={p.y - 244} width={34} height={250} rx={9} fill={PECA} stroke="url(#cc-g)" strokeWidth={9} transform={`rotate(-17 ${p.x - 72} ${p.y})`} />
          <rect x={p.x + 56} y={p.y - 244} width={34} height={250} rx={9} fill={PECA} stroke="url(#cc-g)" strokeWidth={9} transform={`rotate(17 ${p.x + 72} ${p.y})`} />
        </g>
      ))}
      {/* ⚠️ regra 6: o que já está DEITADO desliza e roda pouco — não se levanta */}
      {deitadas.map((d, i) => (
        <rect
          key={`d${i}`} x={d.x - 116} y={d.y - 30} width={232} height={30} rx={10}
          fill={PECA} stroke="url(#cc-g)" strokeWidth={9}
          transform={`translate(${rui * (i - 1) * 120} ${rui * 190}) rotate(${rui * 16 * (i - 1)} ${d.x} ${d.y})`}
        />
      ))}
      <Ator id="cc" x={MEIO + 400} {...(t < 0.3 ? alcancar(t * 3) : atingido(rui))} escala={0.92} />
    </Palco>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// FAMÍLIA — RISCO / OSCILAÇÃO
// ════════════════════════════════════════════════════════════════════════════

/** montanha-russa: o carrinho despenca do topo. Instante-chave: a queda começa. */
const CapaMontanhaRussa: Coreografia = ({ life }) => {
  const f = useCurrentFrame();
  const t = prog(f, life);
  const p = interpolate(t, [0, 0.3, 0.42, 1], [0, 0.16, 0.62, 1], { easing: Easing.inOut(Easing.quad) });
  /**
   * ⚠️ A VIA É FEITA DE RETAS, DE PROPÓSITO — e é a regra 5 outra vez.
   * A 1ª versão desenhava a via com curvas de Bézier e punha o carrinho a
   * interpolar entre os PONTOS DE ANCORAGEM. Como uma Bézier não passa pelos seus
   * pontos de controlo, o carrinho andava ao lado dos carris — o mesmo erro que
   * pôs a moeda por baixo da corda-bamba em 31/07. Com rampas retas, o carrinho
   * está EXATAMENTE em cima da via, sempre, sem cálculo nenhum.
   */
  const XS = [-120, 470, 830, PALCO_W + 120];
  const YS = [CHAO - 60, CHAO - 820, CHAO - 90, CHAO - 460];
  const via = XS.map((x, i) => `${i === 0 ? 'M' : 'L'}${x},${YS[i]}`).join(' ');
  const pos = (() => {
    const seg = Math.min(XS.length - 2, Math.floor(p * (XS.length - 1)));
    const lp = p * (XS.length - 1) - seg;
    const x = XS[seg] + (XS[seg + 1] - XS[seg]) * lp;
    const y = YS[seg] + (YS[seg + 1] - YS[seg]) * lp;
    // a inclinação sai da PRÓPRIA rampa, não de um número escrito à mão
    const ang = (Math.atan2(YS[seg + 1] - YS[seg], XS[seg + 1] - XS[seg]) * 180) / Math.PI;
    return { x, y, ang };
  })();
  return (
    <Palco life={life}>
      <defs>
        <linearGradient id="mr-g" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={BRAND.cyan} stopOpacity={0} />
          <stop offset="16%" stopColor={BRAND.cyan} />
          <stop offset="84%" stopColor={BRAND.violet} />
          <stop offset="100%" stopColor={BRAND.violet} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={via} fill="none" stroke="url(#mr-g)" strokeWidth={26} strokeLinecap="round" strokeLinejoin="round" />
      {/* O ATOR VAI DENTRO DO CARRINHO — desenhado ANTES dele, para o carrinho lhe
          tapar as pernas. Na 1ª versão o carrinho tinha 144px e o ator 500: ele ficava
          a pairar ao lado de uma caixinha. Agora o carrinho tem 320 e o ator 0,44 de
          escala (~350px), que é a proporção de alguém SENTADO nele.
          A pose é de sentado: coxas para a frente, joelhos dobrados, braços no ar. */}
      <g transform={`translate(${pos.x} ${pos.y}) rotate(${pos.ang})`}>
        <Ator
          id="mr"
          x={0}
          chaoY={-20}
          {...olharCima(f / 4)}
          ancaA={72} joelhoA={92} ancaB={58} joelhoB={86}
          ombroA={-160} ombroB={138} cotoveloA={-12} cotoveloB={22}
          escala={0.46}
        />
        {/* ⚠️ SÓ A PAREDE DA FRENTE do carrinho, e desenhada DEPOIS do ator: assim ela
            tapa-lhe as pernas (ele vai sentado lá dentro) e deixa o tronco e a cabeça
            de fora. Com a caixa inteira por cima, o ator desaparecia e ficava um
            retângulo vazio a descer a rampa. */}
        <rect x={-170} y={-96} width={340} height={126} rx={30} fill={PECA} stroke={BRAND.magenta} strokeWidth={15} style={brilho(BRAND.magenta, 26)} />
        <circle cx={-98} cy={40} r={34} fill={BRAND.violet} stroke={BRAND.cyan} strokeWidth={8} />
        <circle cx={98} cy={40} r={34} fill={BRAND.violet} stroke={BRAND.cyan} strokeWidth={8} />
      </g>
    </Palco>
  );
};

/** bolha: ele sopra e a bolha ESTOURA. Instante-chave: o estouro. */
const CapaBolha: Coreografia = ({ life }) => {
  const f = useCurrentFrame();
  const t = prog(f, life);
  const estoura = t >= 0.32;
  const r = estoura ? 0 : interpolate(t, [0, 0.32], [130, 400]);
  const cacos = interpolate(t, [0.32, 0.52], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const bx = MEIO - 120, by = CHAO - 620;
  return (
    <Palco life={life}>
      <defs>
        <radialGradient id="bl-g">
          <stop offset="60%" stopColor={BRAND.cyan} stopOpacity={0.08} />
          <stop offset="100%" stopColor={BRAND.cyan} stopOpacity={0.85} />
        </radialGradient>
      </defs>
      <Chao />
      {!estoura && (
        <g style={brilho(BRAND.cyan, 30)}>
          <circle cx={bx} cy={by} r={r} fill="url(#bl-g)" stroke={BRAND.cyan} strokeWidth={12} />
          {/* UM brilho só, descentrado (dois fariam olhos) */}
          <ellipse cx={bx - r * 0.4} cy={by - r * 0.45} rx={r * 0.2} ry={r * 0.12} fill={BRAND.text} opacity={0.6} transform={`rotate(-28 ${bx - r * 0.4} ${by - r * 0.45})`} />
          <Moeda x={bx} y={by} r={82} op={0.95} />
        </g>
      )}
      {estoura && [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const a = (i / 8) * Math.PI * 2;
        return (
          <path
            key={i}
            d={`M${bx + Math.cos(a) * (400 + cacos * 300)},${by + Math.sin(a) * (400 + cacos * 300)} l${Math.cos(a) * 78},${Math.sin(a) * 78}`}
            stroke={BRAND.cyan} strokeWidth={16} strokeLinecap="round" opacity={1 - cacos}
          />
        );
      })}
      {estoura && <Moeda x={bx + cacos * 90} y={by + cacos * 430} r={82} rot={cacos * 180} op={1 - cacos * 0.3} />}
      <Ator id="bl" x={MEIO + 380} {...(estoura ? atingido(cacos) : alcancar(t * 2))} escala={0.94} />
    </Palco>
  );
};

/** gangorra: o outro lado bate no chão e ele é ATIRADO. Instante-chave: o impacto. */
const CapaGangorra: Coreografia = ({ life }) => {
  const f = useCurrentFrame();
  const t = prog(f, life);
  const bate = interpolate(t, [0.2, 0.32], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.quad) });
  const voo = interpolate(t, [0.32, 1], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  // A MOEDA cai do lado ESQUERDO e ATIRA o ator, que está no direito — por isso o
  // ângulo vai de +14 (ele em baixo, à espera) para -17 (ele em cima, projetado).
  // Na 1ª versão ia ao contrário e o ator DESCIA: a leitura era de alguém a sentar-se.
  const ang = interpolate(bate, [0, 1], [14, -17]);
  const pivoX = MEIO, pivoY = CHAO - 78;
  const rad = (ang * Math.PI) / 180;
  const pontaX = pivoX + Math.cos(rad) * 330;
  const pontaY = pivoY + Math.sin(rad) * 330;
  return (
    <Palco life={life}>
      <defs>
        <linearGradient id="gg-g" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={BRAND.cyan} /><stop offset="100%" stopColor={BRAND.magenta} />
        </linearGradient>
      </defs>
      <Chao />
      <polygon points={`${pivoX - 66},${CHAO} ${pivoX + 66},${CHAO} ${pivoX},${pivoY - 6}`} fill={PECA} stroke={BRAND.sub} strokeWidth={7} />
      <g transform={`rotate(${ang} ${pivoX} ${pivoY})`}>
        <rect x={pivoX - 340} y={pivoY - 13} width={680} height={26} rx={13} fill="url(#gg-g)" />
      </g>
      <Moeda x={pivoX - Math.cos(rad) * 300} y={pivoY - Math.sin(rad) * 300 - 46} r={44} />
      <Ator
        id="gg"
        x={pontaX}
        chaoY={pontaY - 14 - voo * 300}
        {...(voo > 0.02 ? atingido(voo) : equilibrar(f / 3))}
        inclina={ang + voo * 26}
        escala={0.78}
      />
    </Palco>
  );
};

/** corda-bamba: a corda cede e ele oscila. Instante-chave: o afundar da corda. */
const CapaCordaBamba: Coreografia = ({ life }) => {
  const f = useCurrentFrame();
  const t = prog(f, life);
  const cede = interpolate(t, [0.18, 0.34], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const px = MEIO;
  const alturaCorda = CHAO - 300;
  const afunda = cede * 150 + Math.sin(f / 6) * 10 * cede;
  const pisaY = alturaCorda + afunda;
  return (
    <Palco life={life}>
      <defs>
        <linearGradient id="cb-g" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={BRAND.cyan} stopOpacity={0} />
          <stop offset="15%" stopColor={BRAND.cyan} />
          <stop offset="85%" stopColor={BRAND.violet} />
          <stop offset="100%" stopColor={BRAND.violet} stopOpacity={0} />
        </linearGradient>
      </defs>
      {/* ⚠️ regra 5: uma Bézier NÃO passa pelo ponto de controlo — foi assim que a
          moeda ficou POR BAIXO da corda em 31/07. Aqui a corda são DUAS RETAS que se
          encontram exatamente no ponto onde ele pisa. */}
      <path d={`M-120,${alturaCorda} L${px},${pisaY} L${PALCO_W + 120},${alturaCorda}`} fill="none" stroke="url(#cb-g)" strokeWidth={12} strokeLinecap="round" />
      <Ator id="cb" x={px} chaoY={pisaY} {...equilibrar(f / 2)} inclina={Math.sin(f / 5) * 9 * (0.4 + cede)} escala={0.88} />
      {/* o vazio por baixo: uma sombra que desvanece, nunca um bloco com aresta */}
      <ellipse cx={px} cy={CHAO + 30} rx={230} ry={30} fill={BRAND.violet} opacity={0.16} />
    </Palco>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// FAMÍLIA — TEMPO / ATRASO
// ════════════════════════════════════════════════════════════════════════════

/** ampulheta: ele empurra e a areia acaba. Instante-chave: o bulbo de cima esvazia. */
const CapaAmpulheta: Coreografia = ({ life }) => {
  const f = useCurrentFrame();
  const t = prog(f, life);
  const passou = interpolate(t, [0, 0.34, 1], [0, 0.86, 1]);
  const ax = MEIO - 160;
  const topo = CHAO - 830, meio = CHAO - 420;
  const LARG_A = 190;
  return (
    <Palco life={life}>
      <defs>
        <linearGradient id="ap-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={BRAND.cyan} /><stop offset="100%" stopColor={BRAND.violet} />
        </linearGradient>
      </defs>
      <Chao />
      {/* areia do bulbo de cima (encolhe) e do de baixo (cresce) */}
      <path d={`M${ax - LARG_A + 18},${topo + 30 + 320 * passou} L${ax + LARG_A - 18},${topo + 30 + 320 * passou} L${ax + 12},${meio - 8} L${ax - 12},${meio - 8} Z`} fill={BRAND.yellow} opacity={0.9} />
      <path d={`M${ax - LARG_A + 18},${CHAO - 34} L${ax + LARG_A - 18},${CHAO - 34} L${ax + LARG_A - 18},${CHAO - 34 - 320 * passou} L${ax - LARG_A + 18},${CHAO - 34 - 320 * passou} Z`} fill={BRAND.yellow} opacity={0.9} />
      {/* o fio de areia é um <rect>: degradê em linha vertical não pinta (regra 7) */}
      {passou < 0.97 && <rect x={ax - 8} y={meio} width={16} height={370} fill={BRAND.yellow} opacity={0.95} />}
      {/* o vidro */}
      <path
        d={`M${ax - LARG_A},${topo} L${ax + LARG_A},${topo} L${ax + 20},${meio} L${ax + LARG_A},${CHAO - 20} L${ax - LARG_A},${CHAO - 20} L${ax - 20},${meio} Z`}
        fill="none" stroke="url(#ap-g)" strokeWidth={17} strokeLinejoin="round" style={brilho(BRAND.cyan, 26)}
      />
      <rect x={ax - LARG_A - 32} y={topo - 38} width={LARG_A * 2 + 64} height={38} rx={19} fill={PECA} stroke={BRAND.cyan} strokeWidth={9} />
      {/* encostado ao vidro: o braço chega a 236px, logo tem de estar a ~230 da borda
          direita da ampulheta. E os dois braços em ângulos diferentes (regra 4) —
          iguais, liam-se como uma barra horizontal única. */}
      <Ator id="ap" x={ax + LARG_A + 230} {...empurrar(Math.min(1, t * 3))} inclina={-20} ombroA={-96} ombroB={-74} cotoveloA={-12} cotoveloB={-30} escala={0.92} />
    </Palco>
  );
};

/** relogio: o ponteiro varre e EMPURRA-O. Instante-chave: o ponteiro bate. */
const CapaRelogio: Coreografia = ({ life }) => {
  const f = useCurrentFrame();
  const t = prog(f, life);
  const ang = interpolate(t, [0, 1], [-90, 300]);
  const bate = interpolate(t, [0.3, 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  // O relógio é GRANDE e está perto: o ponteiro tem de VARRER o sítio onde o ator
  // está, senão ele reage a alguma coisa que nunca lhe toca.
  const cx = MEIO - 100, cy = CHAO - 330, R = 280;
  return (
    <Palco life={life}>
      <defs>
        <linearGradient id="rg-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={BRAND.cyan} /><stop offset="100%" stopColor={BRAND.magenta} />
        </linearGradient>
      </defs>
      <Chao />
      <circle cx={cx} cy={cy} r={R} fill="#161b22" stroke="url(#rg-g)" strokeWidth={14} />
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return <circle key={i} cx={cx + Math.cos(a) * (R - 40)} cy={cy + Math.sin(a) * (R - 40)} r={i % 3 === 0 ? 11 : 6} fill={BRAND.sub} />;
      })}
      {/* ponteiro grande — <rect> rodado, nunca <line> com degradê */}
      <g transform={`rotate(${ang} ${cx} ${cy})`}>
        <rect x={cx - 9} y={cy - R + 44} width={18} height={R - 44} rx={9} fill={BRAND.magenta} />
      </g>
      <g transform={`rotate(${ang / 12 - 40} ${cx} ${cy})`}>
        <rect x={cx - 11} y={cy - R + 110} width={22} height={R - 110} rx={11} fill={BRAND.cyan} />
      </g>
      <circle cx={cx} cy={cy} r={20} fill={BRAND.text} />
      <Ator id="rg" x={MEIO + 210} {...(bate > 0.05 ? atingido(bate) : olharCima(f / 5))} escala={0.92} />
    </Palco>
  );
};

/** vela: ele protege a chama e ela quase se apaga. Instante-chave: a chama verga. */
const CapaVela: Coreografia = ({ life }) => {
  const f = useCurrentFrame();
  const t = prog(f, life);
  const verga = interpolate(t, [0.24, 0.34, 0.5], [0, 1, 0.4], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const altura = interpolate(t, [0, 1], [340, 210]);
  const vx = MEIO - 110;
  const topo = CHAO - altura;
  return (
    <Palco life={life}>
      <defs>
        <linearGradient id="vl-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={BRAND.text} /><stop offset="100%" stopColor={BRAND.violet} />
        </linearGradient>
        <linearGradient id="vl-fogo" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={BRAND.magenta} /><stop offset="100%" stopColor={BRAND.yellow} />
        </linearGradient>
      </defs>
      <Chao />
      <rect x={vx - 54} y={topo} width={108} height={altura} rx={16} fill="url(#vl-g)" />
      <rect x={vx - 3} y={topo - 26} width={6} height={26} fill={BRAND.sub} />
      <path
        d={`M${vx},${topo - 130 + verga * 54} Q${vx + 44 * verga + 30},${topo - 66} ${vx},${topo - 24} Q${vx - 30 - 10 * verga},${topo - 66} ${vx},${topo - 130 + verga * 54} Z`}
        fill="url(#vl-fogo)"
      />
      {/* cera a escorrer, de um lado só */}
      <path d={`M${vx + 40},${topo + 16} q14,54 -4,96`} fill="none" stroke={BRAND.text} strokeWidth={12} strokeLinecap="round" opacity={0.75} />
      <Ator
        id="vl"
        x={MEIO + 190}
        {...alcancar(0.5)}
        ombroB={122} cotoveloB={-46}
        inclina={14}
        cabeca={-6}
        escala={0.92}
      />
    </Palco>
  );
};

/** trem-perdido: ele corre atrás e o comboio já vai longe. Instante-chave: o último vagão passa. */
const CapaTremPerdido: Coreografia = ({ life }) => {
  const f = useCurrentFrame();
  const t = prog(f, life);
  const tx = interpolate(t, [0, 0.34, 1], [180, 700, 1150], { easing: Easing.out(Easing.quad) });
  const vagoes = [0, 1, 2];
  const trilhoY = CHAO - 10;
  return (
    <Palco life={life}>
      <defs>
        <linearGradient id="tp-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={BRAND.cyan} /><stop offset="100%" stopColor={BRAND.violet} />
        </linearGradient>
        <linearGradient id="tp-trilho" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={BRAND.sub} stopOpacity={0} />
          <stop offset="15%" stopColor={BRAND.sub} stopOpacity={0.6} />
          <stop offset="85%" stopColor={BRAND.sub} stopOpacity={0.6} />
          <stop offset="100%" stopColor={BRAND.sub} stopOpacity={0} />
        </linearGradient>
      </defs>
      <rect x={-120} y={trilhoY} width={PALCO_W + 240} height={9} rx={4} fill="url(#tp-trilho)" />
      <rect x={-120} y={trilhoY + 34} width={PALCO_W + 240} height={9} rx={4} fill="url(#tp-trilho)" />
      <g transform={`translate(${tx} 0)`}>
        {vagoes.map((i) => (
          <g key={i}>
            <rect x={i * 250} y={trilhoY - 230} width={224} height={220} rx={26} fill={PECA} stroke="url(#tp-g)" strokeWidth={9} />
            <rect x={i * 250 + 34} y={trilhoY - 190} width={156} height={80} rx={12} fill={BRAND.cyan} opacity={0.35} />
          </g>
        ))}
      </g>
      <Riscos x={tx - 40} y={trilhoY - 130} n={3} larg={150} op={0.45} />
      <Ator id="tp" x={MEIO - 340} {...correr(f / 3)} escala={0.92} />
    </Palco>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// FAMÍLIA — DECIDIR / COMPARAR
// ════════════════════════════════════════════════════════════════════════════

/** balanca: ele sobe num prato e a balança PENDE. Instante-chave: o desequilíbrio. */
const CapaBalanca: Coreografia = ({ life }) => {
  const f = useCurrentFrame();
  const t = prog(f, life);
  const pende = interpolate(t, [0.16, 0.34, 0.6], [0, 1, 0.86], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const ang = interpolate(pende, [0, 1], [0, 15]);
  // ⚠️ A BALANÇA TEM DE SER MAIOR QUE O ATOR, senão ele fica de pé num pratinho e
  // a leitura é de um gigante em cima de um brinquedo (visto na galeria).
  // ⚠️ a trave desceu de 900 para 700 acima do chão: a 900 a balança encostava ao
  // topo do desenho e o ator, em cima do prato, ficava com a cabeça cortada
  const cx = MEIO, topo = CHAO - 700;
  const BRACO_BAL = 330;
  const rad = (ang * Math.PI) / 180;
  const esqX = cx - Math.cos(rad) * BRACO_BAL, esqY = topo + 40 - Math.sin(rad) * BRACO_BAL;
  const dirX = cx + Math.cos(rad) * BRACO_BAL, dirY = topo + 40 + Math.sin(rad) * BRACO_BAL;
  return (
    <Palco life={life}>
      <defs>
        <linearGradient id="ba-g" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={BRAND.cyan} /><stop offset="100%" stopColor={BRAND.violet} />
        </linearGradient>
      </defs>
      <Chao />
      {/* mastro em <rect> (regra 7) */}
      <rect x={cx - 16} y={topo + 40} width={32} height={CHAO - topo - 40} rx={16} fill="url(#ba-g)" />
      <g transform={`rotate(${ang} ${cx} ${topo + 40})`}>
        <rect x={cx - BRACO_BAL} y={topo + 26} width={BRACO_BAL * 2} height={28} rx={14} fill="url(#ba-g)" style={brilho(BRAND.cyan, 22)} />
      </g>
      {/* pratos: cordas + prato, sempre na vertical (não rodam com a trave) */}
      {[{ x: esqX, y: esqY }, { x: dirX, y: dirY }].map((p, i) => (
        <g key={i}>
          <rect x={p.x - 5} y={p.y} width={10} height={150} fill={BRAND.sub} />
          <path d={`M${p.x - 140},${p.y + 150} L${p.x + 140},${p.y + 150} L${p.x + 92},${p.y + 208} L${p.x - 92},${p.y + 208} Z`} fill={PECA} stroke={BRAND.cyan} strokeWidth={8} />
        </g>
      ))}
      <Moeda x={esqX} y={esqY + 96} r={62} />
      <Ator id="ba" x={dirX} chaoY={dirY + 152} {...hesitar(f / 4)} inclina={ang} escala={0.62} />
    </Palco>
  );
};

/** bifurcacao: dois caminhos, ele hesita. Instante-chave: o pé fica no ar. */
const CapaBifurcacao: Coreografia = ({ life }) => {
  const f = useCurrentFrame();
  const t = prog(f, life);
  const olha = Math.sin(t * 7) * 16;
  return (
    <Palco life={life}>
      <defs>
        <linearGradient id="bi-e" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={BRAND.cyan} stopOpacity={0.85} />
          <stop offset="100%" stopColor={BRAND.cyan} stopOpacity={0} />
        </linearGradient>
        <linearGradient id="bi-d" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={BRAND.magenta} stopOpacity={0.85} />
          <stop offset="100%" stopColor={BRAND.magenta} stopOpacity={0} />
        </linearGradient>
      </defs>
      {/* ⚠️ regra 7 aprendida aqui mesmo: as estradas são POLÍGONOS, não <line>s —
          um degradê numa linha vertical não pinta nada e a estrada desaparecia. */}
      <path d={`M${MEIO - 90},${CHAO + 120} L${MEIO + 20},${CHAO + 120} L${MEIO - 250},${CHAO - 330} L${MEIO - 320},${CHAO - 330} Z`} fill="url(#bi-e)" />
      <path d={`M${MEIO - 20},${CHAO + 120} L${MEIO + 90},${CHAO + 120} L${MEIO + 320},${CHAO - 330} L${MEIO + 250},${CHAO - 330} Z`} fill="url(#bi-d)" />
      <Ator id="bi" x={MEIO} chaoY={CHAO + 40} {...hesitar(f / 3)} cabeca={olha} escala={0.94} />
    </Palco>
  );
};

/** duas-portas: uma abre-se. Instante-chave: a porta cede. */
const CapaDuasPortas: Coreografia = ({ life }) => {
  const f = useCurrentFrame();
  const t = prog(f, life);
  const abre = interpolate(t, [0.24, 0.34, 1], [0, 0.72, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const larg = 280, alt = 620;
  const esq = MEIO - 440, dir = MEIO - 60;
  const topo = CHAO - alt;
  // ⚠️ REGRA 8: porta que abre NÃO se faz com scale (o contorno encolhe junto e vira
  // uma barra preta). Dobradiça FIXA à esquerda e a aresta livre a recuar — polígono
  // de 4 pontos, com a aresta de dentro mais alta, que é o que dá a perspetiva.
  const recuo = abre * larg * 0.86;
  return (
    <Palco life={life}>
      <defs>
        <linearGradient id="dp-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={BRAND.cyan} /><stop offset="100%" stopColor={BRAND.violet} />
        </linearGradient>
        <linearGradient id="dp-luz" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={BRAND.yellow} stopOpacity={0.75} />
          <stop offset="100%" stopColor={BRAND.yellow} stopOpacity={0} />
        </linearGradient>
      </defs>
      <Chao />
      {/* a luz que sai da porta aberta, no chão */}
      {abre > 0.05 && <path d={`M${dir},${CHAO} L${dir + larg},${CHAO} L${dir + larg + 120},${CHAO + 130} L${dir - 120},${CHAO + 130} Z`} fill="url(#dp-luz)" opacity={abre} />}
      {/* batentes */}
      {[esq, dir].map((x, i) => (
        <rect key={i} x={x - 14} y={topo - 14} width={larg + 28} height={alt + 14} rx={12} fill="#161b22" stroke={BRAND.sub} strokeWidth={7} />
      ))}
      {/* porta fechada (esquerda) */}
      <rect x={esq} y={topo} width={larg} height={alt} rx={8} fill={PECA} stroke="url(#dp-g)" strokeWidth={8} />
      <circle cx={esq + larg - 40} cy={topo + alt / 2} r={13} fill={BRAND.cyan} />
      {/* porta a abrir (direita): vão escuro + folha em polígono */}
      <rect x={dir} y={topo} width={larg} height={alt} fill="#05070b" />
      <polygon
        points={`${dir},${topo} ${dir + larg - recuo},${topo + abre * 34} ${dir + larg - recuo},${topo + alt - abre * 34} ${dir},${topo + alt}`}
        fill={PECA} stroke="url(#dp-g)" strokeWidth={8}
      />
      {/* ⚠️ o palco só se vê até x≈1090: a 1020 o ator saía meio cortado pela borda */}
      <Ator id="dp" x={MEIO + 330} {...alcancar(abre)} escala={0.9} />
    </Palco>
  );
};

/** semaforo: fica vermelho e ele TRAVA. Instante-chave: a luz muda. */
const CapaSemaforo: Coreografia = ({ life }) => {
  const f = useCurrentFrame();
  const t = prog(f, life);
  const vermelho = t >= 0.3;
  const trava = interpolate(t, [0.3, 0.42], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const sx = MEIO - 230, topo = CHAO - 560;
  const luzes = [
    { cor: BRAND.magenta, y: topo + 90, on: vermelho },
    { cor: BRAND.yellow, y: topo + 220, on: !vermelho && t > 0.18 },
    { cor: BRAND.cyan, y: topo + 350, on: !vermelho && t <= 0.18 },
  ];
  return (
    <Palco life={life}>
      <Chao />
      <rect x={sx - 13} y={topo + 430} width={26} height={CHAO - topo - 430} rx={13} fill={BRAND.sub} />
      <rect x={sx - 96} y={topo} width={192} height={440} rx={38} fill="#161b22" stroke={BRAND.sub} strokeWidth={9} />
      {luzes.map((l, i) => (
        <circle
          key={i} cx={sx} cy={l.y} r={54}
          fill={l.on ? l.cor : '#2b3242'}
          opacity={l.on ? 1 : 0.5}
          style={l.on ? { filter: `drop-shadow(0 0 26px ${l.cor})` } : undefined}
        />
      ))}
      <Ator
        id="sf"
        x={MEIO + 240}
        {...(trava > 0.05 ? empurrar(trava) : andar(f / 5))}
        inclina={interpolate(trava, [0, 1], [4, -20])}
        ombroA={-70 - trava * 30} ombroB={-58 - trava * 34} cotoveloA={-14} cotoveloB={-18}
        escala={0.94}
      />
    </Palco>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// FAMÍLIA — PROTEGER / RESERVA
// ════════════════════════════════════════════════════════════════════════════

/** guarda-chuva: a chuva bate e o guarda-chuva ABRE. Instante-chave: a abertura. */
const CapaGuardaChuva: Coreografia = ({ life }) => {
  const f = useCurrentFrame();
  const t = prog(f, life);
  const abre = interpolate(t, [0.2, 0.34], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.6)) });
  // ⚠️ a copa a 380 de raio saía pelas duas bordas e lia-se como uma faixa reta no
  // topo, não como um guarda-chuva. O que faz "guarda-chuva" é a CURVA ser visível.
  const raio = 60 + abre * 270;
  const gx = MEIO - 70, gy = CHAO - 720;
  const pingos = Array.from({ length: 14 });
  return (
    <Palco life={life}>
      <defs>
        <linearGradient id="gc-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={BRAND.cyan} /><stop offset="100%" stopColor={BRAND.violet} />
        </linearGradient>
      </defs>
      <Chao />
      {pingos.map((_, i) => {
        const px = 90 + ((i * 137) % (PALCO_W - 180));
        const cai = ((t * 2.6 + i * 0.13) % 1);
        const y = -60 + cai * (PALCO_H + 60);
        // o que cai sobre a copa é travado por ela
        const tapado = abre > 0.4 && Math.abs(px - gx) < raio && y > gy;
        if (tapado) return null;
        return <rect key={i} x={px} y={y} width={12} height={70} rx={6} fill={BRAND.cyan} opacity={0.7} />;
      })}
      {/* a copa: um arco, com uma ponta a mais de um lado (nunca simétrico exato) */}
      <g style={brilho(BRAND.cyan, 30)}>
        <path d={`M${gx - raio},${gy} A${raio},${raio * 0.78} 0 0 1 ${gx + raio},${gy} Z`} fill={PECA} stroke="url(#gc-g)" strokeWidth={16} />
        <path d={`M${gx - raio},${gy} q${raio * 0.5},${50 * abre} ${raio},0 q${raio * 0.5},${50 * abre} ${raio},0`} fill="none" stroke="url(#gc-g)" strokeWidth={13} opacity={abre} />
      </g>
      <rect x={gx - 9} y={gy} width={18} height={330} rx={9} fill={BRAND.sub} />
      <Ator id="gc" x={gx + 70} chaoY={CHAO} {...(abre < 0.5 ? encolherSe(1 - abre) : alcancar(0.3))} ombroB={150} cotoveloB={-14} escala={0.92} />
    </Palco>
  );
};

/** cofre: ele fecha a porta e ela TRANCA. Instante-chave: o ferrolho engata. */
const CapaCofre: Coreografia = ({ life }) => {
  const f = useCurrentFrame();
  const t = prog(f, life);
  const fecha = interpolate(t, [0.12, 0.32], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const gira = interpolate(t, [0.32, 0.62], [0, 300], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const larg = 520, alt = 580;
  const cx = MEIO - 260, topo = CHAO - alt;
  const recuo = fecha * larg * 0.8;
  return (
    <Palco life={life}>
      <defs>
        <linearGradient id="cf-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={BRAND.cyan} /><stop offset="100%" stopColor={BRAND.violet} />
        </linearGradient>
      </defs>
      <Chao />
      <rect x={cx - larg / 2 - 18} y={topo - 18} width={larg + 36} height={alt + 18} rx={26} fill="#161b22" stroke={BRAND.sub} strokeWidth={9} />
      <rect x={cx - larg / 2} y={topo} width={larg} height={alt} fill="#05070b" />
      {/* dinheiro lá dentro, visível enquanto a porta não fecha */}
      <g opacity={fecha}>
        <Moeda x={cx - 90} y={topo + 300} r={72} />
        <Nota x={cx + 110} y={topo + 420} rot={-8} s={1.4} />
      </g>
      {/* REGRA 8: dobradiça fixa à direita, aresta livre a recuar — nada de scale */}
      <polygon
        points={`${cx + larg / 2},${topo} ${cx - larg / 2 + recuo},${topo + fecha * 30} ${cx - larg / 2 + recuo},${topo + alt - fecha * 30} ${cx + larg / 2},${topo + alt}`}
        fill={PECA} stroke="url(#cf-g)" strokeWidth={14}
        style={brilho(BRAND.cyan, 22)}
      />
      {fecha < 0.15 && (
        <g transform={`rotate(${gira} ${cx} ${topo + alt / 2})`} style={brilho(BRAND.cyan, 26)}>
          <circle cx={cx} cy={topo + alt / 2} r={88} fill="none" stroke={BRAND.cyan} strokeWidth={18} />
          <rect x={cx - 8} y={topo + alt / 2 - 120} width={16} height={78} rx={8} fill={BRAND.cyan} />
        </g>
      )}
      {/* encostado à porta: o braço chega a 236px, então tem de estar a ~230 da
          aresta livre do cofre, não a 430 como na 1ª versão */}
      <Ator id="cf" x={cx + larg / 2 + 250} {...empurrar(1 - fecha)} ombroA={82} ombroB={96} escala={0.92} />
    </Palco>
  );
};

/** escudo: o golpe chega e ele AGUENTA. Instante-chave: o impacto. */
const CapaEscudo: Coreografia = ({ life }) => {
  const f = useCurrentFrame();
  const t = prog(f, life);
  const impacto = interpolate(t, [0.28, 0.34, 0.5], [0, 1, 0.25], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const setaX = interpolate(t, [0, 0.32], [-360, 0], { extrapolateRight: 'clamp' });
  // o escudo à frente do peito do ator: o peito está a ~2/3 da altura dele (~530px
  // acima dos pés), não a 340. Com 340 o escudo ficava à altura da anca.
  const ex = MEIO - 140, ey = CHAO - 540;
  return (
    <Palco life={life}>
      <defs>
        <linearGradient id="ed-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={BRAND.cyan} /><stop offset="100%" stopColor={BRAND.violet} />
        </linearGradient>
      </defs>
      <Chao />
      {/* o golpe: uma barra que chega da esquerda (⚠️ <rect>, não <line>) */}
      {t < 0.34 && (
        <g transform={`translate(${setaX} 0)`} style={brilho(BRAND.magenta, 30)}>
          <rect x={ex - 620} y={ey - 18} width={420} height={36} rx={18} fill={BRAND.magenta} />
          <polygon points={`${ex - 210},${ey - 52} ${ex - 112},${ey} ${ex - 210},${ey + 52}`} fill={BRAND.magenta} />
        </g>
      )}
      <Ator id="ed" x={ex + 210} {...empurrar(impacto)} inclina={18 + impacto * 12} escala={0.94} />
      {/* o escudo, à frente do braço */}
      <g transform={`translate(${ex - impacto * 26} ${ey}) rotate(${-8 - impacto * 8})`} style={brilho(BRAND.cyan, 30)}>
        <path d="M0,-210 L168,-138 L168,66 Q168,198 0,264 Q-168,198 -168,66 L-168,-138 Z" fill={PECA} stroke="url(#ed-g)" strokeWidth={16} />
        {/* UMA faixa diagonal — uma cruz faria duas formas simétricas (regra 4) */}
        <path d="M-105,-90 L111,126" stroke={BRAND.cyan} strokeWidth={21} strokeLinecap="round" opacity={0.9} />
      </g>
      {impacto > 0.15 && [0, 1, 2].map((i) => (
        <circle key={i} cx={ex - 140} cy={ey} r={60 + i * 68 + impacto * 90} fill="none" stroke={BRAND.magenta} strokeWidth={10} opacity={0.45 * impacto * (1 - i * 0.3)} />
      ))}
    </Palco>
  );
};

/** boia: ele agarra a boia e é ERGUIDO. Instante-chave: a boia segura-o. */
const CapaBoia: Coreografia = ({ life }) => {
  const f = useCurrentFrame();
  const t = prog(f, life);
  const sobe = interpolate(t, [0.16, 0.34, 1], [0, 96, 118], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  const linhaAgua = CHAO - 150;
  const bal = Math.sin(f / 7) * 12;
  return (
    <Palco life={life}>
      <defs>
        <linearGradient id="bo-agua" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={BRAND.cyan} stopOpacity={0.55} />
          <stop offset="60%" stopColor={BRAND.violet} stopOpacity={0.5} />
          {/* desvanece no fundo: sem isto a água acaba num corte reto (regra 2) */}
          <stop offset="100%" stopColor={BRAND.violet} stopOpacity={0} />
        </linearGradient>
      </defs>
      {/* o ator primeiro — a água tapa-o da cintura para baixo */}
      <Ator id="bo" x={MEIO} chaoY={linhaAgua + 210 - sobe + bal} {...alcancar(0.6)} ombroA={-140} ombroB={140} cotoveloA={-10} cotoveloB={10} escala={0.94} />
      <path
        d={`M-120,${linhaAgua + 20} Q${MEIO * 0.5},${linhaAgua - 18 + bal} ${MEIO},${linhaAgua + 8} T${PALCO_W + 120},${linhaAgua + 16} L${PALCO_W + 120},${PALCO_H} L-120,${PALCO_H} Z`}
        fill="url(#bo-agua)"
      />
      {/* a boia, à volta dele, na linha de água */}
      <g transform={`translate(${MEIO} ${linhaAgua - 6 + bal})`}>
        <ellipse rx={172} ry={64} fill="none" stroke={BRAND.magenta} strokeWidth={44} />
        <ellipse rx={172} ry={64} fill="none" stroke={BRAND.text} strokeWidth={44} strokeDasharray="86 172" strokeDashoffset={40} />
      </g>
    </Palco>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// O REGISTO — nome do catálogo → coreografia
// ════════════════════════════════════════════════════════════════════════════
/**
 * ⚠️ ESTE OBJETO É O 8º SÍTIO que uma imagem nova obriga a tocar (os outros 7 estão
 * na §20.2 B2). Se faltar aqui, a capa cai no fallback e o vídeo abre com a
 * coreografia errada — defeito silencioso, do tipo que a galeria apanha e o teste
 * automático não. A composição "Capas" existe exatamente para isso.
 */
export const COREOGRAFIAS: Record<string, Coreografia> = {
  // crescer / acumular
  'bola-neve': CapaBolaNeve, foguete: CapaFoguete, semente: CapaSemente, escada: CapaEscada,
  // perder / vazar
  ralo: CapaRalo, 'balde-furado': CapaBaldeFurado, buraco: CapaBuraco, fumaca: CapaFumaca,
  // dívida / peso
  'bola-de-ferro': CapaBolaDeFerro, ratoeira: CapaRatoeira, 'mochila-pedras': CapaMochilaPedras, 'areia-movedica': CapaAreiaMovedica,
  // erro / queda
  escorregao: CapaEscorregao, avalanche: CapaAvalanche, domino: CapaDomino, 'castelo-cartas': CapaCasteloCartas,
  // risco / oscilação
  'montanha-russa': CapaMontanhaRussa, bolha: CapaBolha, gangorra: CapaGangorra, 'corda-bamba': CapaCordaBamba,
  // tempo / atraso
  ampulheta: CapaAmpulheta, relogio: CapaRelogio, vela: CapaVela, 'trem-perdido': CapaTremPerdido,
  // decidir / comparar
  balanca: CapaBalanca, bifurcacao: CapaBifurcacao, 'duas-portas': CapaDuasPortas, semaforo: CapaSemaforo,
  // proteger / reserva
  'guarda-chuva': CapaGuardaChuva, cofre: CapaCofre, escudo: CapaEscudo, boia: CapaBoia,
};

/** A capa de uma imagem. Sem coreografia registada, cai na do escorregão. */
export const CoreografiaDaCapa: React.FC<{ metaphor?: string | null; life: number }> = ({ metaphor, life }) => {
  const C = (metaphor && COREOGRAFIAS[metaphor]) || CapaEscorregao;
  return <C life={life} />;
};
