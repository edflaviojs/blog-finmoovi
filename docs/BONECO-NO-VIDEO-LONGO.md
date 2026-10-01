# O BONECO NO VÍDEO LONGO — plano de integração

**Escrito em 01/10/2026.** Nada deste plano foi executado ainda: é o desenho de
como a biblioteca de 32 movimentos gerados na Manus deixa de ser uma composição
de teste solta (`StickmanVideoTeste` em `Root.tsx`) e passa a ser uma **família
de cena de verdade** no vídeo longo, do mesmo jeito que `metafora`,
`ilustracao` e `foto` já são.

Continuação de `~/.claude/.../memory/finmoovi-boneco-stickman-video.md` — lá
está a história (o boneco por código foi abandonado, os 32 vídeos foram
conferidos um a um em 01/10, 28 bons).

---

## 1. O QUE JÁ EXISTE, E É QUASE TUDO

O vídeo longo **já tem a estrutura inteira** para receber uma família nova. Ela
não precisa de ser inventada; precisa de mais uma entrada em cinco sítios:

| Onde | O que já faz | O que falta |
|---|---|---|
| `youtube-render/src/Long.tsx:86` | `LongVisual.tipo` — a lista fechada das 9 famílias | juntar `'boneco'` |
| `youtube-render/src/Long.tsx:701` | o `switch` que desenha cada família | `case 'boneco'` |
| `youtube-render/src/Long.tsx:620` | `SomDaFamilia` — o som de entrada de cada família | `case 'boneco'` |
| `youtube-render/src/longo/telas.tsx` | `Ilustracao`, `Metafora`, `AtorLateral` | um componente `Boneco` |
| `src/scripts/youtube/lib/imagens-longo.js` | o diretor de imagem: decide a família de cada cena, com teto e intervalo | a tabela dos 32 + o escolhedor |

E — isto é o achado que poupa mais trabalho — **o lugar do boneco no ecrã já
está construído e já foi medido.** O `AtorLateral`
(`longo/telas.tsx:186`) existe desde 09/08 justamente para pôr um boneco na
faixa esquerda de um ecrã 16:9, com âncora de chão, e empurrar o texto para a
direita. O comentário dele diz, com os números: das oito famílias, `metafora`
pontua **5,26** e as paradas pontuam 1,8–2,4, *"e a razão é óbvia quando se
olha o fotograma: ali há um boneco que se mexe"*.

---

## 2. A RESTRIÇÃO QUE DECIDE O DESENHO TODO

Medido com `ffprobe` nos 32 ficheiros:

- **720 × 1280 — são VERTICAIS.** O vídeo longo é **1920 × 1080, deitado**.
- **24 fotogramas por segundo.** A linha do tempo do longo corre a **30**.
- **Duração fixa: 4s (21 clipes), 8s (7 clipes), 10s (3 clipes).** A cena média
  do longo dura **~6,8s** e varia com a voz.

**Consequência nº1 — o boneco nunca enche o ecrã do vídeo longo.** Esticado
para os 1080 de altura, ele ocupa 607px de largura e sobram 1313px. Tentar
ampliá-lo até encher é repetir o defeito §37.5 (*"a parede de amarelo"*): uma
imagem desenhada para vertical, esticada, deixa de ser figura e vira fundo.

**Por isso a família `boneco` não é "uma cena só com o boneco". É o boneco de
um lado e as palavras ditas do outro** — que é exatamente a forma do
`AtorLateral`, e exatamente o que o ecrã deitado pede.

**Consequência nº2 — o clipe acaba antes da cena.** Um clipe de 4s numa cena de
6,8s deixa 2,8 segundos por preencher. Três saídas, e só uma serve para todos:

- *repetir em ciclo* — serve para os movimentos cíclicos (morder unhas, braços
  cruzados, saltitar, relógio, bocejar); **não serve** para os que têm fim
  (cair, levantar, comemorar): recomeçar uma queda lê-se como defeito;
- *congelar no último fotograma* — serve para todos, mas sozinho fica uma
  fotografia parada, contra a regra "nada parado";
- *escolher a cena pelo tamanho* — o escolhedor prefere cenas cuja duração cabe
  no clipe.

**Decisão: as três juntas, nesta ordem.** O escolhedor prefere cenas que cabem;
quando não cabe, o clipe congela no último fotograma **com uma aproximação
muito lenta por cima** (o mesmo truque do `Ilustracao`, que vai de 1 a 1,09 ao
longo da cena). E a tabela do catálogo marca quais podem repetir em ciclo.

> ⚠️ Isto obriga a tabela a ter uma coluna `ciclo: true/false` por clipe. Sem
> ela, mais cedo ou mais tarde uma queda recomeça no meio de uma cena e só se
> vê olhando o fotograma.

---

## 3. O BLOQUEIO REAL, QUE NÃO É DE DESENHO

**Os 32 vídeos não estão no git, e o robô não os veria.**

- `youtube-render/.gitignore` linha 15 ignora `*.mp4`;
- `git ls-files "*.mp4"` devolve **zero ficheiros** no repo inteiro;
- o robô do vídeo longo (`.github/workflows/youtube-longo.yml`) clona o repo e
  renderiza lá dentro. As fotografias da Manus entram porque são `.jpg` **e
  estão versionadas**; os vídeos do boneco não estão.

Se a família `boneco` entrar sem resolver isto, o render no robô sai com **as
cenas do boneco vazias** — e o build fica verde na mesma. É o defeito desta
casa que já tem memória própria: *build verde não prova que o vídeo tem
imagem*.

**Duas saídas:**

1. **Versionar os 32** (≈38 MB), com uma exceção no `.gitignore` igual à que já
   existe para a trilha (`!public/music/*.mp3`). São **biblioteca permanente**,
   não artefato por vídeo — a mesma razão por que as fotos da Manus estão lá.
2. Hospedar fora e baixar num passo do robô. Mais peças, mais um sítio para
   falhar em silêncio.

**Recomendação: versionar.** 38 MB de uma vez, uma vez só, e o robô deixa de
depender de alguma coisa que só existe nesta máquina.

> ## ✅ FEITO em 01/10/2026 — commit `fa736bb9` (depois amendado)
>
> Os **32 clipes estão no git**, 36,5 MB. A exceção vive no
> `youtube-render/.gitignore`, logo abaixo do `*.mp4`, com a razão escrita ao
> lado: aquela regra existe para manter fora **artefactos** (b-roll que se
> regenera, o render da semana, o áudio do TTS) e isto é o contrário —
> **matéria-prima permanente** que não volta sem pagar a IA outra vez. É o mesmo
> estatuto das fotografias `manus/*.jpg`, que já eram versionadas.
>
> **Ficaram de fora, de propósito:** os `imag*.png` (o dono mandou
> desconsiderar) e as 32 capturas de `_frames/` (da conferência de 01/10). Esta
> última precisou de uma linha própria no `.gitignore` — são `.jpg`, e `.jpg`
> não estava em regra nenhuma; sem ela entravam 32 ficheiros sem ninguém pedir.
>
> **Provado assim, e não por "o commit passou":** `git archive HEAD` da pasta,
> extraído para fora do projeto — que é exactamente o que o robô recebe ao
> clonar. Saíram **32 ficheiros, todos `.mp4`, zero lixo**, e um `ffprobe` no
> ficheiro **tirado de dentro do git** devolveu 720×1280 a 24fps com 96
> fotogramas. São vídeos a sério, não ponteiros nem ficheiros vazios.
>
> ⚠️ **Falta um passo, e é fora desta máquina:** enquanto o commit não for
> EMPURRADO, o robô continua a clonar um repo sem os vídeos. O commit guarda; o
> push é que entrega.

---

## 4. ✅ OS 7 COLORIDOS PASSARAM — testado em 01/10/2026

O truque que apaga o fundo preto (`mixBlendMode: 'screen'`) estava provado em
preto-e-branco e **não testado em cor**. Foi testado: `StickmanVideoTeste`
passou a receber o ficheiro por props e renderizaram-se stills dos 7 por cima
do fundo real (`youtube-render/out/_teste-cor/`).

**O "screen" segura a cor.** Banana amarela, cédulas cinza, linhas de nervoso
rosa/azul — tudo se mantém sobre o violeta do canal e o preto some sozinho.
Nenhum dos 7 lava. **A biblioteca é de 32.**

> ⚠️ O teste só vale porque o ficheiro deixou de estar cravado no código. Um
> teste que só sabe correr o caso que já passou não é teste — é confirmação.

### O nº30 — levantado, e o dono decidiu usar na mesma

> ✅ **Decisão do dono (01/10):** *"não vejo problema algum em usar ele desse
> jeito, pode usar!"* — **entra inteiro, e a biblioteca é de 32.** O que está
> escrito abaixo fica como registo do que foi mostrado, não como pendência.

`30-nervoso-dividas-pc.mp4` mostra, nos primeiros ~3 segundos, **uma lista em
inglês com palavras inventadas pela IA** — *"Secerities", "Grocerien",
"Groteries", "Rentins", "Commes", "Pemmies"* — e valores em **$**. Num canal
em português é texto falso no ecrã. A segunda metade (a cara nervosa em
primeiro plano) presta-se. *(O dono viu e mandou usar na mesma — ver acima.)*

Dois reparos menores dos mesmos stills: o nº31 (pesadelo) tem cédulas com **$**
em vez de R$ (minúsculo ao tamanho real); e em planos muito fechados **vê-se a
borda do retângulo do clipe** contra o fundo — logo o `Boneco` nunca pode ser
ampliado até o corpo tocar os bordos do vídeo.

> **Lição para a tabela do catálogo:** um clipe conferido "no meio" não está
> conferido. O nº30 passou pela revisão de 01/10 de manhã como bom porque
> ninguém olhou os 3 primeiros segundos.

---

## 5. COMO SE ESCOLHE QUAL BONECO ENTRA EM QUAL CENA

Copiar o caminho que já funciona para as ilustrações, e **não** inventar outro.

**O catálogo** (ficheiro novo, `lib/bonecos-do-longo.js`): 32 linhas, cada uma
com `ficheiro`, `significado` (uma frase: *"carregar um peso nos ombros — a
dívida que pesa todo mês"*), `estagio` (gancho · consequência · virada ·
solução · fechamento), `segundos`, `ciclo`, `coloridos`.

**Quem escolhe:** um passo à parte, `bonecos-longo.js`, no molde exato do
`ilustrador-longo.js` — um leitor de IA lê a narração de cada cena e os 32
significados, e devolve qual boneco vai em qual cena. Grava em
`.github/data/bonecos-do-longo.json`. **O montador só lê esse ficheiro.**

Por que um leitor de IA e não palavras-gatilho: está medido e escrito em
`imagens-longo.js:966` — abrir as 33 figuras e subir o teto de 6 para 14 só fez
o vídeo passar de 3 para 5 ilustrações, porque *"é o casamento por
palavra-gatilho que não escala"*. Escolher a figura que combina com a frase é
**julgamento**, e julgamento mede-se com um segundo leitor, não com `regex`.

**Continua determinista:** quem paga a IA escreve um ficheiro; correr o montador
duas vezes dá o mesmo vídeo. Sem ficheiro, ou com um slug que ainda não passou
pelo escolhedor, **nenhum boneco entra** — a mesma trava das fotografias.

---

## 6. O TETO — E A CONTA QUE O ACOMPANHA

⚠️ **O boneco não entra em espaço vazio: ele disputa espaço com a ilustração.**

A conta que está escrita em `imagens-longo.js:674`: um guião longo dá ~55
cenas; para a letra na tela cair de 70% para os 35% que o Ed aprovou, ~19 cenas
têm de sair da família `palavras`. Hoje: metáforas 2 + fotografias 3 + app 5 +
b-roll 3 + **ilustrações 14**.

Somar 8 bonecos por cima disso **não baixa a letra para 20%** — passa a haver
desenhos a mais e o vídeo vira um desenho animado. O que faz sentido é
**trocar**:

| Família | Hoje | Proposta |
|---|---|---|
| ilustração | 14 | **8** |
| boneco | 0 | **8** |

O total de cenas com desenho fica igual. O que muda é que **metade delas passa
a ter uma pessoa a mexer-se** em vez de uma vinheta — que é a família com a
pontuação mais alta das oito.

**Guardas, as mesmas das ilustrações:** nunca o mesmo boneco duas vezes no mesmo
vídeo (há 25 disponíveis para 8 lugares, cabe à vontade); nunca dois bonecos a
menos de 2 cenas um do outro; nunca colado a uma metáfora ou a uma ilustração
(senão lê-se "agora o vídeo é de desenhos"); nunca nas partes `demonstracao` e
`chamada`, que já têm dono.

E uma guarda nova, do estágio: **um boneco de "comemorar" não entra no gancho do
vídeo.** O catálogo tem a coluna `estagio` por causa disto — o escolhedor
descarta as escolhas do leitor que ponham um movimento de fechamento numa cena
de abertura.

---

## 7. A ORDEM DE EXECUÇÃO

**Fase 0 — destravar (antes de qualquer código)**
- ✅ testar o `screen` nos coloridos → **passou; a biblioteca é de 32, menos o
  nº30, que tem texto inglês inventado nos primeiros 3s** *(secção 4)*;
- ✅ **versionar os mp4 — FEITO**, 32 ficheiros, 36,5 MB *(secção 3)*. Falta só
  **empurrar** o commit: enquanto não for, o robô clona um repo sem os vídeos.

**Fase 1 — o catálogo e a cena, sem robô nenhum**
- `lib/bonecos-do-longo.js` com as 32 linhas;
- componente `Boneco` em `longo/telas.tsx` (boneco à esquerda + palavras à
  direita, congelar/ciclo conforme a tabela);
- `tipo: 'boneco'` em `LongVisual`, o `case` no `switch` e o som de entrada;
- uma composição isolada no `Root.tsx` para o Ed ver, **do mesmo jeito que o
  `StickmanVideoTeste` já é** — sem tocar em nenhum vídeo real.

**Fase 2 — o escolhedor**
- `bonecos-longo.js` (leitor de IA) + `escolherLugaresDoBoneco` no diretor de
  imagem, com teto, intervalo e guardas;
- baixar o teto da ilustração de 14 para 8.

**Fase 3 — ligar ao robô**
- um passo no `youtube-longo.yml` ao lado do passo "Os desenhos de cada cena";
- a prova de mesa (`validar-roteiro-longo.js`) a contar o teto, as repetições e
  o estágio.

**Fase 4 — ver**
- um vídeo inteiro renderizado e assistido pelo Ed antes de ir para o ar.

---

## 8. COMO SE PROVA QUE FUNCIONOU

Regras da casa, aplicadas:

1. **`remotion still` de um fotograma de cada cena de boneco, e OLHAR.** Os dois
   bugs do boneco por código só apareceram ao renderizar; nenhum apareceu a ler
   o código.
2. **Contar** quantas cenas ficaram com `tipo: 'boneco'` no JSON montado — não
   aceitar "montou sem erro" como prova.
3. **O caso falso de controlo:** montar um slug que **não** passou pelo
   escolhedor e conferir que dá **zero** bonecos. Uma prova que diz "sim" aos
   dois casos não está a medir nada.
4. **Conferir a duração total do vídeo antes e depois.** A família nova troca o
   que está no ecrã; não pode mexer num segundo da linha do tempo.
5. **Conferir que o robô vê os ficheiros** — listar os mp4 dentro do clone do
   CI, não assumir que estão lá.

---

## 9. O QUE ESTE PLANO NÃO FAZ

- **Não toca no Short nem no Short de 16s.** É o vídeo longo, e só.
- **Não mexe no `Stickman.tsx`** (o boneco por código). Ele continua no repo,
  fora do caminho; o Ed já decidiu contra retomá-lo.
- **Não decide o vídeo nº9** (cair, traço fino) — é a pendência nº1 e é decisão
  do Ed. Se ele mandar regerar, troca-se um ficheiro na tabela e mais nada.
- **Não gera nenhum movimento novo.** Trabalha com os que já existem.
