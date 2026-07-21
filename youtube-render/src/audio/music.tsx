import { Audio, staticFile, useVideoConfig, interpolate } from 'remotion';

// ─────────────────────────────────────────────────────────────────────────────
// Trilha de fundo em LOOP com "ducking" (leito de volume baixo, sob a narração)
// + fade in/out. Como a narração cobre quase todo o vídeo, um leito baixo constante
// já soa "abaixado" sob a voz — simples e robusto.
//
// A faixa é um PLACEHOLDER (Kevin MacLeod, CC-BY — ver public/music/CREDITS.md).
// Trocar por uma da YouTube Audio Library = só substituir public/music/bg.mp3.
// ─────────────────────────────────────────────────────────────────────────────

const TRACK = 'music/bg.mp3';
const BED_VOLUME = 0.12; // baixo p/ não cobrir a voz

export const BackgroundMusic: React.FC = () => {
  const { fps, durationInFrames } = useVideoConfig();
  const fade = Math.min(Math.round(fps * 0.6), Math.floor(durationInFrames / 2));
  return (
    <Audio
      src={staticFile(TRACK)}
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
};
