# 🎬 Catálogo de B-roll — arsenal FinMoovi (youtube-render)

Matriz **TELAS × ESTILOS × FORMATOS**. Ideia: cada tela do app em vários estilos,
nos 2 formatos (short 1080×1920 · long 1920×1080), pra montar qualquer vídeo com
variedade máxima. A lista de estilos é **aberta** — novos estilos entram aqui.

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

### 2. Dashboard — dados inline em `Cards3D.tsx`
| Estilo | Short | Long | Composição |
|--------|:---:|:---:|-----------|
| C · 3D cards | ✅ | ✅ | `Cards3DShort` / `Cards3DLong` |
| A · Moldura | ✅ | ✅ | `AppBrollShort` / `AppBrollLong` (trimBefore 150) |
| B · Scroll | 🟡 | 🟡 | `AppScrollShort` / `AppScrollLong` |
| D · Tela 3D | ✅ | ✅ | `AppScreen3DShort` / `AppScreen3DLong` |

### 3. Fluxo de caixa — ⬜ (próxima tela) · footage ~600s
### 4. Extrato — ⬜ · footage ~480s (Nubank conciliado)
### 5. Balanço — ⬜
### 6. Compras — ⬜ · footage ~720s (Modo Compras) / ~840s (relatório)
### 7. Planejamento — ⬜
### 8. Smart Capture (voz/texto/imagem/compra) — ⬜
### 9. Calculadoras do blog — ⬜ (capturar de blog.finmoovi.com/ferramentas via Playwright)
