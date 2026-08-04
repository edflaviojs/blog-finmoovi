/**
 * A PROVA DA MÚSICA (04/08/2026).
 *
 * Toca SÓ a trilha de fundo, sem voz por cima, durante os mesmos 6min02 do vídeo longo
 * real (10.875 fotogramas a 30fps). Sem a voz não há nada a mascarar o buraco.
 *
 * ═══ O QUE ESTA PROVA MEDIU, E É O NÚMERO QUE JUSTIFICA A MUDANÇA ═══
 * Perfil segundo a segundo dos 362s, com `bg-rock`:
 *   · REINÍCIO (o de sempre): média -37,4 dB e um MÍNIMO de **-51,7 dB** que se repete
 *     em t=74, 149, 224 e 299 — quatro buracos de ~14 dB, um por cada volta da faixa.
 *     É isto que o dono ouviu como "a música corta do nada".
 *   · CRUZADA: média -37,1 dB e mínimo **-39,3 dB** — 2,2 dB abaixo da média, e nem
 *     sequer numa emenda: é uma passagem calma da própria música.
 *   · E o fim do vídeo: no reinício a música acabava a seco a -35,8 dB (o fade final
 *     nunca acontecia, porque o `<Loop>` reinicia a contagem de fotogramas); com a
 *     costura cruzada desce a -44,0 dB nos últimos 0,4s, como sempre se pretendeu.
 *
 * ⚠️ **E A PROVA QUE PROTEGE O ROBÔ DIÁRIO:** renderizada a composição `MusicaReinicio`
 * com o código ANTIGO e com o NOVO, os dois ficheiros são **idênticos byte a byte**
 * (md5 `0be833d1d1c9bb695c8f4f10131214e2`). O Short não muda uma amostra.
 */
import React from 'react';
import { AbsoluteFill, Composition } from 'remotion';
import { BackgroundMusic } from './audio/music';

const FPS = 30;
const FOTOGRAMAS = 10875; // o mesmo comprimento do VIDEO-LONGO-1 (6min02)

const So: React.FC<{ costura: 'reinicio' | 'cruzada' }> = ({ costura }) => (
  <AbsoluteFill style={{ background: '#0d1117' }}>
    <BackgroundMusic costura={costura} />
  </AbsoluteFill>
);

export const ProvaDeMusica: React.FC = () => (
  <>
    <Composition
      id="MusicaReinicio"
      component={So}
      durationInFrames={FOTOGRAMAS}
      fps={FPS}
      width={320}
      height={180}
      defaultProps={{ costura: 'reinicio' as const }}
    />
    <Composition
      id="MusicaCruzada"
      component={So}
      durationInFrames={FOTOGRAMAS}
      fps={FPS}
      width={320}
      height={180}
      defaultProps={{ costura: 'cruzada' as const }}
    />
  </>
);
