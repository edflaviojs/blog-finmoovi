# Música de fundo — três faixas a rodar

**Quem manda é `src/scripts/youtube/lib/musica.js`**, não este ficheiro. É lá que estão
declaradas as faixas, o clima de cada uma e a linha de crédito. A descrição do vídeo vai
buscar o crédito à faixa que ESSE vídeo usou — ninguém tem de se lembrar de nada.

| ficheiro | faixa | clima | vídeos |
|---|---|---|---|
| `bg-rock.mp3` | *Cool Rock* | alerta | dívida, erros, queda, dinheiro a fugir |
| `bg-leve.mp3` | *Guiton Sketch* | leve | poupar, crescer, proteger |
| `bg-serio.mp3` | *Inspired* | sério | decidir, comparar, prazo, risco |

Todas de **Kevin MacLeod (incompetech.com)**, licença **CC BY 4.0** — uso comercial livre
**com atribuição**, que entra sozinha na descrição. Cortadas aos 75s (um Short nunca passa
de 60) com um desvanecimento no fim. O volume do leito ajusta-se em
`youtube-render/src/audio/music.tsx` (`BED_VOLUME`).

**Para trocar uma faixa:** pôr o ficheiro aqui e mudar a entrada em `lib/musica.js`.
O crédito, o render e a descrição seguem sozinhos.

---

## Porque isto está assim

De 21/07 a 02/08/2026 o canal usou uma faixa CC BY **sem a creditar** em 9 vídeos. O aviso
estava escrito neste ficheiro, em maiúsculas, e não impediu nada — **porque nada no código
o lia**. Um aviso que ninguém lê é o mesmo que não existir. Os 9 vídeos foram corrigidos
por `src/scripts/youtube/corrigir-creditos-musica.js`.

Houve ainda uma tentativa de gerar a trilha por código (`gerar-trilha.js`, que continua a
funcionar) para não haver licença nenhuma. O dono ouviu e reprovou duas versões — *"muito
triste"*, depois *"desanimador"*. Guitarra, baixo e bateria tocados não se sintetizam com
senos. A medição ajudou a perceber porquê (tom menor, metade da velocidade), mas quem
decide se uma música serve é o ouvido.
