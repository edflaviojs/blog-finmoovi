import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { DISPLAY, BODY } from './theme';
import { Pop3D } from './broll/card3d-kit';
import { RoamingWatermark } from './broll/watermark';
import {
  DASH_DATA, DASH_LABELS, DASH_THEME, Theme, Lang, Currency,
} from './broll/dashboard';

// DASHBOARD — o coração do app, recriado NATIVAMENTE e parametrizável:
// tema (dark/light), idioma (pt/en/es), moeda (BRL/EUR) + TRANSIÇÕES animadas
// (tema, moeda, idioma). Cards saltam em 3D (padrão Cards3D).

type Palette = typeof DASH_THEME['dark'];
type DataSet = typeof DASH_DATA['BRL'];
type Labels = typeof DASH_LABELS['pt'];

// lerp de cor hex → rgb (p/ transição de tema suave)
const h2n = (h: string) => { const s = h.replace('#', ''); return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)); };
const lerpHex = (a: string, b: string, t: number) => {
  const A = h2n(a), B = h2n(b);
  const c = A.map((v, i) => Math.round(v + (B[i] - v) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
};
const mixTheme = (t: number): Palette => {
  const d = DASH_THEME.dark, l = DASH_THEME.light;
  return {
    bg: lerpHex(d.bg, l.bg, t), grad1: lerpHex(d.grad1, l.grad1, t), grad2: lerpHex(d.grad2, l.grad2, t),
    text: lerpHex(d.text, l.text, t), sub: lerpHex(d.sub, l.sub, t),
    panelFrom: lerpHex(d.panelFrom, l.panelFrom, t), panelTo: lerpHex(d.panelTo, l.panelTo, t),
    border: t > 0.5 ? l.border : d.border, shadow: t > 0.5 ? l.shadow : d.shadow,
  };
};

// Fundo temático (funciona em dark E light)
const DashBg: React.FC<{ th: Palette }> = ({ th }) => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 40) * 40;
  return (
    <AbsoluteFill style={{ backgroundColor: th.bg, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 180 + drift, left: -160, width: 720, height: 720, borderRadius: '50%', background: th.grad1, opacity: 0.14, filter: 'blur(170px)' }} />
      <div style={{ position: 'absolute', bottom: 120 - drift, right: -200, width: 800, height: 800, borderRadius: '50%', background: th.grad2, opacity: 0.13, filter: 'blur(180px)' }} />
    </AbsoluteFill>
  );
};

const BalanceCard: React.FC<{ th: Palette; data: DataSet; labels: Labels }> = ({ th, data, labels }) => (
  <div style={{ width: 660, padding: 40, borderRadius: 28, background: `linear-gradient(160deg, ${th.panelFrom}, ${th.panelTo})`, border: `1px solid ${th.border}`, boxShadow: th.shadow, fontFamily: BODY, color: th.text }}>
    <div style={{ color: th.sub, fontSize: 30, marginBottom: 8 }}>{labels.saldo}</div>
    <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 76, letterSpacing: -1 }}>{data.saldo}</div>
    <div style={{ display: 'flex', gap: 22, marginTop: 26 }}>
      <div style={{ flex: 1, background: 'rgba(34,197,94,0.14)', borderRadius: 18, padding: '16px 20px' }}>
        <div style={{ color: '#16a34a', fontWeight: 800, fontSize: 34 }}>▲ {data.receitas}</div>
        <div style={{ color: th.sub, fontSize: 24 }}>{labels.receitas}</div>
      </div>
      <div style={{ flex: 1, background: 'rgba(239,68,68,0.14)', borderRadius: 18, padding: '16px 20px' }}>
        <div style={{ color: '#dc2626', fontWeight: 800, fontSize: 34 }}>▼ {data.despesas}</div>
        <div style={{ color: th.sub, fontSize: 24 }}>{labels.despesas}</div>
      </div>
    </div>
  </div>
);

const AccountCard: React.FC<{ th: Palette; nome: string; valor: string; cor: string; iniciais: string }> = ({ th, nome, valor, cor, iniciais }) => (
  <div style={{ width: 500, padding: '22px 28px', borderRadius: 24, background: `linear-gradient(160deg, ${th.panelFrom}, ${th.panelTo})`, border: `1px solid ${th.border}`, boxShadow: th.shadow, fontFamily: BODY, color: th.text, display: 'flex', alignItems: 'center', gap: 20 }}>
    <div style={{ width: 58, height: 58, borderRadius: 15, background: cor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 24, color: '#fff' }}>{iniciais}</div>
    <div style={{ flex: 1 }}>
      <div style={{ fontWeight: 800, fontSize: 30 }}>{nome}</div>
      <div style={{ color: '#16a34a', fontWeight: 800, fontSize: 28 }}>{valor}</div>
    </div>
  </div>
);

// Cluster completo (saldo + contas), saltando em 3D
const Cluster: React.FC<{ th: Palette; data: DataSet; labels: Labels; opacity?: number }> = ({ th, data, labels, opacity = 1 }) => (
  <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', perspective: 1600, opacity }}>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, transformStyle: 'preserve-3d' }}>
      <Pop3D delay={0} rotY={-6}><BalanceCard th={th} data={data} labels={labels} /></Pop3D>
      {data.contas.map((c, i) => (
        <Pop3D key={i} delay={10 + i * 8} rotY={i % 2 === 0 ? 9 : -10}>
          <AccountCard th={th} nome={c.nome} valor={c.valor} cor={c.cor} iniciais={c.iniciais} />
        </Pop3D>
      ))}
    </div>
  </AbsoluteFill>
);

export type DashProps = { theme?: Theme; lang?: Lang; currency?: Currency; morph?: 'theme' | 'currency' | 'lang' };

export const DashboardHero: React.FC<DashProps> = ({ theme = 'dark', lang = 'pt', currency = 'BRL', morph }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // TEMA (estático ou transição dark→light)
  const themeP = morph === 'theme'
    ? interpolate(frame, [fps * 2.3, fps * 3.6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : (theme === 'light' ? 1 : 0);
  const th = mixTheme(themeP);

  // Fundo + marca
  const shell = (inner: React.ReactNode) => (
    <AbsoluteFill><DashBg th={th} />{inner}<RoamingWatermark /></AbsoluteFill>
  );

  if (morph === 'currency') {
    const p = interpolate(frame, [fps * 2.3, fps * 3.6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const L = DASH_LABELS[lang];
    return shell(<>
      <Cluster th={th} data={DASH_DATA.BRL} labels={L} opacity={1 - p} />
      <Cluster th={th} data={DASH_DATA.EUR} labels={L} opacity={p} />
    </>);
  }

  if (morph === 'lang') {
    const D = DASH_DATA[currency];
    // pt → en → es
    const o = (a: number, b: number) => interpolate(frame, [fps * a, fps * (a + 0.5), fps * b, fps * (b + 0.5)], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const oPt = interpolate(frame, [0, fps * 2, fps * 2.5], [1, 1, 0], { extrapolateRight: 'clamp' });
    const oEn = o(2.5, 4.5);
    const oEs = interpolate(frame, [fps * 4.5, fps * 5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    return shell(<>
      <Cluster th={th} data={D} labels={DASH_LABELS.pt} opacity={oPt} />
      <Cluster th={th} data={D} labels={DASH_LABELS.en} opacity={oEn} />
      <Cluster th={th} data={D} labels={DASH_LABELS.es} opacity={oEs} />
    </>);
  }

  // estático
  return shell(<Cluster th={th} data={DASH_DATA[currency]} labels={DASH_LABELS[lang]} />);
};
