# SFX pack — créditos e licença

Efeitos sonoros do canal (disparados nos gatilhos de `icons-fx.tsx`).

**Fonte:** [Kenney](https://kenney.nl) — via o registro [soundcn](https://github.com/kapishdima/soundcn).
**Licença:** **CC0 1.0** (domínio público) — uso comercial livre, sem atribuição obrigatória (creditamos por cortesia).

| Arquivo | Gatilho | Origem (pack Kenney) |
|---|---|---|
| `money.ogg` | money (dinheiro/reais) | rpg-audio · handleCoins |
| `coins.ogg` | coins (milhões/fortuna) | casino-audio · chips-stack-1 |
| `growth.ogg` | growth (crescer/investir) | digital-audio · highUp |
| `clock.ogg` | clock (anos/tempo) | interface-sounds · tick_002 |
| `card.ogg` | card (cartão/dívida) | casino-audio · card-slide-1 |
| `warning.ogg` | warning (erro/cuidado) | interface-sounds · error_003 |

## SFX de nível de shot (contract v3)

Nomes do contrato → arquivo (`resolveShotSfx` em `src/audio/sfx.tsx`):
`boom`→boom · `whoosh`→growth · `coin`→money · `alert`→warning · `avalanche`→avalanche · `slide`→slide.

| Arquivo | Uso | Origem |
|---|---|---|
| `avalanche.ogg` | metáfora avalanche (rumble) | **sintetizado** (ffmpeg `sine`, senos 48/71/95 Hz com envelope) — CC0/domínio público |
| `slide.ogg` | escorregão (apito descendo cômico) | **sintetizado** (ffmpeg `sine`, sequência de tons 1500→360 Hz) — CC0/domínio público |

## SFX novos v3.1 (som do dinheiro melhor + digitação)

Compostos de amostras **Kenney CC0** reais (baixadas do registro [soundcn](https://github.com/kapishdima/soundcn),
`License.txt` de cada pack confirma **CC0 1.0**), mixadas com o ffmpeg embutido do Remotion
(`amix`/`adelay`/`volume`). Codec **Opus** em contêiner `.ogg` (o ffmpeg do Remotion não traz
encoder Vorbis; Chromium/Remotion decodificam Ogg/Opus normalmente). Nomes do contrato →
arquivo: `kaching`→kaching · `typewriter`→typewriter · `keyboard`→keyboard · `pop`→pop.

| Arquivo | Uso | Origem (amostras Kenney CC0 compostas) |
|---|---|---|
| `kaching.ogg` | caixa registradora (dinheiro/venda) | interface-sounds · `bong_001` (sino) + `confirmation_003` (jingle) + casino-audio · `chips-stack-1` (gaveta) |
| `typewriter.ogg` | máquina de escrever (texto digitado) | interface-sounds · `click_001` ×3 (teclas) + `bong_001` (sino do carro) |
| `keyboard.ogg` | teclado (rajada de digitação ~0,4s) | interface-sounds · `tick_001` ×6 (teclas suaves) |
| `pop.ogg` | bolha/pop suave | interface-sounds · `pluck_001` + `drop_001` (corpo) |
