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
