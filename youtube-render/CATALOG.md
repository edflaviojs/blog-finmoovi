# 🎬 Catálogo de B-roll — arsenal FinMoovi (youtube-render)

Matriz **TELAS × ESTILOS × FORMATOS**. Ideia: cada tela do app em vários estilos,
nos 2 formatos (short 1080×1920 · long 1920×1080), pra montar qualquer vídeo com
variedade máxima. A lista de estilos é **aberta** — novos estilos entram aqui.

## Marca d'água (aprovada)
Todo b-roll leva a **marca d'água FinMoovi passeando** — plaquinha de vidro fosco pequena
(ícone + wordmark) flutuando devagar pela tela (trajetória Lissajous, `src/broll/watermark.tsx`
→ `RoamingWatermark`). Aplicada em todos os estilos, na camada do vídeo. Ajustar velocidade/
tamanho/opacidade só nesse arquivo. ⚠️ os 10 clipes de Cartões entregues ANTES da marca ficaram
sem ela (dono pediu "só daqui pra frente").

## Estilos
| Cód | Estilo | Família | Componente |
|-----|--------|---------|-----------|
| A | Moldura de celular flutuante | footage | `AppBroll.tsx` |
| B | Scroll suave | footage | `AppScroll.tsx` |
| C | 3D cards recriados nativamente | nativo | `Cards3D`/`CreditCards3D`… |
| D | 3D tela original girando | footage | `AppScreen3D.tsx` |
| E | Count-up de métrica | nativo | `CartoesCountUp`… |

- **footage** = usa a gravação real `public/app-rec.mp4` (`trimBefore` = frame da tela; 30fps).
- **nativo** = UI recriada com dados reais em `src/broll/<tela>.ts`; helpers 3D em `src/broll/card3d-kit.tsx`.

## Convenção de nomes das composições
`<Tela><Estilo><Formato>` — ex.: `CreditCards3DShort`, `CartoesCountUpLong`, `CartoesFrameShort`.

## Comandos
- Still: `npx remotion still src/index.ts <Comp> out/x.png --frame=N`
- MP4: `npx remotion render src/index.ts <Comp> out/x.mp4`

---

## Apanhado geral do app (montagens que JUNTAM todas as telas) — `AppOverview.tsx`
5 estilos × 2 formatos = **10 clipes** em `VIDEOS-BROLL/9-apanhado-geral/`:
| Estilo | Comp (vertical / horizontal) |
|---|---|
| App Tour (todas as telas c/ transições) | `AppTour` / `AppTourLong` |
| Mosaico flutuante (colagem 3D) | `AppMosaico` / `AppMosaicoLong` |
| Carrossel 3D coverflow | `AppCarrossel` / `AppCarrosselLong` |
| O app em números (contadores) | `AppNumeros` / `AppNumerosLong` |
| Quadro 4 telas | `AppQuad` / `AppQuadLong` |
Celulares dimensionados por `useVideoConfig().height` (proporcional aos 2 formatos).

## Matriz

Legenda: ✅ pronto e validado · 🟡 registrado (falta render/validar) · ⬜ a fazer

### 1. Cartões de Crédito — dados: `src/broll/cartoes.ts` · footage frame 15750 (~525s)
Mastercard Itaú · Fatura R$ 1.240,00 · Limite R$ 5.000,00 · Disponível R$ 3.760,00 (recriações coerentes).

| Estilo | Short (9:16) | Long (16:9) | Composição |
|--------|:---:|:---:|-----------|
| C · 3D cards | ✅ | ✅ | `CreditCards3DShort` / `CreditCards3DLong` |
| E · Count-up | ✅ | ✅ | `CartoesCountUpShort` / `CartoesCountUpLong` |
| A · Moldura | ✅ | ✅ | `CartoesFrameShort` / `CartoesFrameLong` |
| B · Scroll | ✅ | ✅ | `CartoesScrollShort` / `CartoesScrollLong` |
| D · Tela 3D | ✅ | ✅ | `CartoesScreen3DShort` / `CartoesScreen3DLong` |

**TELA CARTÕES = 10/10 clipes prontos** em `VIDEOS-BROLL/1-cartoes/` (nomes claros por estilo+formato).

### 2. Dashboard (CORAÇÃO do app) — `DashboardHero.tsx` + dados `src/broll/dashboard.ts`
**20 clipes**: parametrizado por tema (dark/light) · idioma (pt/en/es) · moeda (BRL/EUR) + **transições animadas** (tema, moeda, idioma). Light mode e EN recriados nativamente (não existem na gravação). Dados reais BRL + EUR.

| Variação | Short | Long |
|---|:---:|:---:|
| Dark · PT · R$ | ✅ | ✅ |
| Light · PT · R$ | ✅ | ✅ |
| Dark · EN · R$ | ✅ | ✅ |
| Light · EN · R$ | ✅ | ✅ |
| Dark · ES · € | ✅ | ✅ |
| Light · ES · € | ✅ | ✅ |
| Dark · PT · € | ✅ | ✅ |
| **Transição TEMA** (dark→light) | ✅ | ✅ |
| **Transição MOEDA** (R$→€) | ✅ | ✅ |
| **Transição IDIOMA** (PT→EN→ES) | ✅ | ✅ |

Comps: `Dash{DarkPtBrl,LightPtBrl,DarkEnBrl,LightEnBrl,DarkEsEur,LightEsEur,DarkPtEur,MorphTheme,MorphCurrency,MorphLang}{Short,Long}`. **20/20** em `VIDEOS-BROLL/6-dashboard/`.

Estilos footage antigos do dashboard (gravação PT-BRL escuro): `Cards3D*` (recriação legada), `AppBroll*`/`AppScroll*`/`AppScreen3D*` (trimBefore 150).

### 3. Fluxo de caixa — dados: `src/broll/fluxo.ts` · footage frame 17700 (~590s)
"Fluxo de Caixa · Análise completa" · Saldo Atual R$ 6.604,93 · Saldo Projetado R$ 4.955,03 · Receitas R$ 10.000 · Despesas R$ 5.044,99.

| Estilo | Short | Long | Composição |
|--------|:---:|:---:|-----------|
| C · 3D cards | ✅ | ✅ | `FluxoCaixa3DShort` / `FluxoCaixa3DLong` |
| E · Barras entradas×saídas (novo) | ✅ | ✅ | `FluxoBarrasShort` / `FluxoBarrasLong` |
| A · Moldura | ✅ | ✅ | `FluxoFrameShort` / `FluxoFrameLong` |
| B · Scroll | ✅ | ✅ | `FluxoScrollShort` / `FluxoScrollLong` |
| D · Tela 3D | ✅ | ✅ | `FluxoScreen3DShort` / `FluxoScreen3DLong` |

**TELA FLUXO = 10/10 clipes** em `VIDEOS-BROLL/2-fluxo-caixa/`.

### 4. Extrato — dados: `src/broll/extrato.ts` · footage frame 14400 (~480s)
Nubank conciliado · Saldo Atual R$ 3.754,91 · Receitas R$ 6.500 · Despesas R$ 3.395,09.

| Estilo | Short | Long | Composição |
|--------|:---:|:---:|-----------|
| C · 3D cards | ✅ | ✅ | `Extrato3DShort` / `Extrato3DLong` |
| E · Lista lançamentos (novo) | ✅ | ✅ | `ExtratoListaShort` / `ExtratoListaLong` |
| A · Moldura | ✅ | ✅ | `ExtratoFrameShort` / `ExtratoFrameLong` |
| B · Scroll | ✅ | ✅ | `ExtratoScrollShort` / `ExtratoScrollLong` |
| D · Tela 3D | ✅ | ✅ | `ExtratoScreen3DShort` / `ExtratoScreen3DLong` |

**TELA EXTRATO = 10/10 clipes** em `VIDEOS-BROLL/3-extrato/`.
### 5. Balanço Mensal — dados: `src/broll/balanco.ts` · footage frame 19200 (~640s)
Total Receitas R$ 10.000 · Total Despesas R$ 5.044,99 · Saldo Final R$ 4.955,01 · Saldo em Contas R$ 6.604,93.

| Estilo | Short | Long | Composição |
|--------|:---:|:---:|-----------|
| C · 3D cards | ✅ | ✅ | `Balanco3DShort` / `Balanco3DLong` |
| E · Donut de despesas (novo) | ✅ | ✅ | `BalancoDonutShort` / `BalancoDonutLong` |
| A · Moldura | ✅ | ✅ | `BalancoFrameShort` / `BalancoFrameLong` |
| B · Scroll | ✅ | ✅ | `BalancoScrollShort` / `BalancoScrollLong` |
| D · Tela 3D | ✅ | ✅ | `BalancoScreen3DShort` / `BalancoScreen3DLong` |

**TELA BALANÇO = 10/10 clipes** em `VIDEOS-BROLL/4-balanco/`.
### 6. Compras (Modo Compras) — dados: `src/broll/compras.ts` · footage frame 22350 (~745s)
Modo Compras · Feijão R$ 1,99 · Bolacha R$ 7,98 · Açúcar R$ 1,98 · Total R$ 11,95.

| Estilo | Short | Long | Composição |
|--------|:---:|:---:|-----------|
| C · 3D cards | ✅ | ✅ | `Compras3DShort` / `Compras3DLong` |
| E · Carrinho enchendo (novo) | ✅ | ✅ | `ComprasCarrinhoShort` / `ComprasCarrinhoLong` |
| A · Moldura | ✅ | ✅ | `ComprasFrameShort` / `ComprasFrameLong` |
| B · Scroll | ✅ | ✅ | `ComprasScrollShort` / `ComprasScrollLong` |
| D · Tela 3D | ✅ | ✅ | `ComprasScreen3DShort` / `ComprasScreen3DLong` |

**TELA COMPRAS = 10/10 clipes** em `VIDEOS-BROLL/5-compras/`.
### 7. Planejamento — ⬜
### 7. Smart Capture (FinMoovi Quick) — dados: `src/broll/smartcapture.ts` · footage frame 23250 (~775s)
4 modos: Texto/Voz/Imagem/Compras.

| Estilo | Short | Long | Composição |
|--------|:---:|:---:|-----------|
| C · Menu 3D (4 tiles) | ✅ | ✅ | `SmartCapture3DShort` / `SmartCapture3DLong` |
| E · Captura por voz (novo) | ✅ | ✅ | `SmartCaptureVozShort` / `SmartCaptureVozLong` |
| A · Moldura | ✅ | ✅ | `SmartFrameShort` / `SmartFrameLong` |
| B · Scroll | ✅ | ✅ | `SmartScrollShort` / `SmartScrollLong` |
| D · Tela 3D | ✅ | ✅ | `SmartScreen3DShort` / `SmartScreen3DLong` |

**TELA SMART CAPTURE = 10/10 clipes** em `VIDEOS-BROLL/7-smart-capture/`.

### — Planejamento — ⏭️ PULADO (dono não inseriu dados).
### 8. Calculadoras do blog — captura via Playwright (`scripts/capture-calcs.mjs`)
Fonte: `blog.finmoovi.com/ferramentas/` (público, real). Cada calculadora em desktop 16:9 + celular 9:16 = **14 clipes**. Pré-aceita cookie (`localStorage fm-cookie-ok`), clica Calcular, mostra resultado + gráfico, rola. Reusa o Playwright de `../app-capture/node_modules` (via createRequire). webm → mp4 (scale 1920×1080 / 1080×1920).

7 calculadoras: juros-compostos · financiamento · aposentadoria · orcamento · reserva · simulador-investimento · conversor-moedas. Em `VIDEOS-BROLL/8-calculadoras/`.
