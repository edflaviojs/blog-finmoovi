import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

// Cena de teste (F1.3a) — só valida o render: fundo da marca (#0d1117),
// gradiente ciano→violeta→magenta e um título com entrada por spring.
const BRAND_BG = '#0d1117';
const GRADIENT = 'linear-gradient(90deg, #22d3ee, #8b5cf6, #d6219c)';

export const Test: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({ frame, fps, config: { damping: 200 } });
  const scale = interpolate(enter, [0, 1], [0.8, 1]);
  const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND_BG, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ transform: `scale(${scale})`, opacity, textAlign: 'center', padding: 80 }}>
        <div
          style={{
            fontSize: 130,
            fontWeight: 800,
            fontFamily: 'Arial, sans-serif',
            background: GRADIENT,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            lineHeight: 1.1,
          }}
        >
          FinMoovi
        </div>
        <div style={{ marginTop: 40, fontSize: 44, color: '#d1d5db', fontFamily: 'Arial, sans-serif' }}>
          Render OK ✅
        </div>
      </div>
    </AbsoluteFill>
  );
};
