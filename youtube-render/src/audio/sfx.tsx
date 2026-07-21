import { Audio, Sequence, staticFile, useVideoConfig } from 'remotion';
import { layoutWords, wordTimingsFromReal } from '../captions';
import { iconFor, IconKey } from '../icons-fx';

// ─────────────────────────────────────────────────────────────────────────────
// SFX sincronizados com a fala — disparam nos MESMOS gatilhos dos ícones
// (icons-fx.tsx / iconFor): dinheiro→moedas, crescer→whoosh, dívida→alerta etc.
// Usa o timing REAL das palavras (timing.json) quando existe; senão, o sintético.
// Sons: Kenney CC0 em public/sfx/*.ogg (ver public/sfx/CREDITS.md).
// ─────────────────────────────────────────────────────────────────────────────

const SFX: Record<IconKey, string> = {
  money: 'sfx/money.ogg',    // moedas (dinheiro/reais/salário)
  coins: 'sfx/coins.ogg',    // pilha de fichas (milhões/fortuna)
  growth: 'sfx/growth.ogg',  // subida (crescer/render/investir/juros)
  clock: 'sfx/clock.ogg',    // tique (anos/tempo/cedo)
  card: 'sfx/card.ogg',      // carta deslizando (cartão/dívida)
  warning: 'sfx/warning.ogg',// alerta (contra/erro/cuidado)
};

const SFX_VOLUME = 0.5;

// ─────────────────────────────────────────────────────────────────────────────
// SFX de NÍVEL DE SHOT (contract v3): o campo `sfx` do shot dispara um som no
// frame inicial do shot. Nomes do contrato → arquivo em public/sfx/.
// 'avalanche' (rumble) e 'slide' (apito descendo cômico) foram adicionados.
// Guarda: se o arquivo do som não existir (download falhou), cai num som que
// existe (fallback), sem quebrar o render (evita staticFile 404).
// ─────────────────────────────────────────────────────────────────────────────
export type ShotSfxName = 'boom' | 'whoosh' | 'coin' | 'alert' | 'avalanche' | 'slide';

// basenames presentes em public/sfx/ (sem extensão).
const AVAILABLE_SFX = new Set(['boom', 'money', 'coins', 'growth', 'clock', 'card', 'warning', 'avalanche', 'slide']);

// nome do contrato → basename preferido.
const SHOT_SFX: Record<ShotSfxName, string> = {
  boom: 'boom',
  whoosh: 'growth',
  coin: 'money',
  alert: 'warning',
  avalanche: 'avalanche',
  slide: 'slide',
};

// fallback caso o basename preferido não exista em public/sfx/.
const SHOT_SFX_FALLBACK: Record<ShotSfxName, string> = {
  boom: 'boom', whoosh: 'growth', coin: 'coins', alert: 'warning', avalanche: 'warning', slide: 'growth',
};

export function resolveShotSfx(name: string): string {
  const key = (name in SHOT_SFX ? name : 'boom') as ShotSfxName;
  const preferred = SHOT_SFX[key];
  const base = AVAILABLE_SFX.has(preferred) ? preferred : SHOT_SFX_FALLBACK[key];
  return `sfx/${base}.ogg`;
}

export const SceneSfx: React.FC<{
  narration: string;
  totalFrames: number;
  words?: { word: string; start: number; end: number }[];
}> = ({ narration, totalFrames, words }) => {
  const { fps } = useVideoConfig();
  const timings = words && words.length ? wordTimingsFromReal(words, fps) : layoutWords(narration, totalFrames);

  const cues: { from: number; key: IconKey }[] = [];
  let lastKey: IconKey | null = null;
  for (const t of timings) {
    const key = iconFor(t.word);
    if (!key) continue;
    // não repete o MESMO efeito em gatilhos seguidos (senão vira metralhadora).
    if (key === lastKey) continue;
    lastKey = key;
    cues.push({ from: Math.max(0, Math.round(t.start)), key });
  }

  return (
    <>
      {cues.map((c, i) => (
        <Sequence key={i} from={c.from} durationInFrames={Math.round(fps * 2)}>
          <Audio src={staticFile(SFX[c.key])} volume={SFX_VOLUME} />
        </Sequence>
      ))}
    </>
  );
};
