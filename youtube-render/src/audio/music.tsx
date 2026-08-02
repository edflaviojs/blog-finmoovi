import { Audio, staticFile, useVideoConfig, interpolate } from 'remotion';

// ─────────────────────────────────────────────────────────────────────────────
// Trilha de fundo em LOOP com "ducking" (leito de volume baixo, sob a narração)
// + fade in/out. Como a narração cobre quase todo o vídeo, um leito baixo constante
// já soa "abaixado" sob a voz — simples e robusto.
//
// A faixa é um PLACEHOLDER (Kevin MacLeod, CC-BY — ver public/music/CREDITS.md).
// Trocar por uma da YouTube Audio Library = só substituir public/music/bg.mp3.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ⚠️ A FAIXA VEM DO ROTEIRO desde 02/08/2026 — são TRÊS a rodar, não uma.
 * Quem escolhe é `escolherTrilha()` (lib/musica.js), a partir da imagem do vídeo, e
 * a escolha fica escrita no ficheiro do roteiro. Aqui só se toca o que lá está.
 * O valor por omissão serve os roteiros antigos, que não têm o campo.
 */
const TRACK_POR_OMISSAO = 'music/bg-rock.mp3';
const BED_VOLUME = 0.12; // baixo p/ não cobrir a voz

export const BackgroundMusic: React.FC<{ ficheiro?: string }> = ({ ficheiro }) => {
  const { fps, durationInFrames } = useVideoConfig();
  const fade = Math.min(Math.round(fps * 0.6), Math.floor(durationInFrames / 2));
  return (
    <Audio
      src={staticFile(ficheiro || TRACK_POR_OMISSAO)}
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
