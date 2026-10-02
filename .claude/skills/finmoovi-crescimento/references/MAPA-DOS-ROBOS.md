# O que já existe — e os seis buracos

> Inventariado a 02/10/2026: **84 robôs** em `.github/workflows/`. Antes de propor
> robô novo, procurar aqui. A conclusão deste inventário é incómoda: **o problema
> da casa não é falta de medição. É que quase ninguém lê o que é medido, e alguns
> robôs agem sobre números que não passam o filtro de realidade.**

## Os que medem o blog

| Quando | Robô | O que faz | Escreve no blog? | Filtro de realidade |
|---|---|---|---|---|
| **seg 07h** | `gsc-oportunidades` | **só relatório** — lista oportunidades em `press/gsc-oportunidades.md` | **não** | 🔴 não (ver buraco 7) |
| **ter 07h** | `gsc-otimizar-ctr` | **reescreve título e meta descrição** de páginas com boa posição e CTR baixo | **sim** | ✅ posto 02/10 |
| **qua 07h** | `gsc-striking-distance` | **acrescenta uma secção escrita por IA** a páginas na posição 5–20 | **sim** | ✅ posto 02/10 |
| **qui 07h** | `gsc-refresh-decay` | atualiza páginas que estão a perder posição | **sim** | ✅ posto 02/10 |
| **sex 07h** | `gsc-canibalizacao` | acrescenta ao post mais fraco um link "Veja também" para o mais forte | sim (link interno) | ⬜ fora de propósito |
| diário 08h | `gsc-index-monitor` | vigia quantas páginas estão indexadas | não |
| ter 09h | `seo-monitor` | vigia sinais de SEO | não |
| seg 11h | `analytics-report` | relatório de tráfego | não |
| diário 05h | `fact-guard` | procura números sem fonte | corta só o que é seguro |
| à mão | `gsc-temas` | temas a partir da busca | — |
| à mão | `gsc-raio-x-aparicoes` | **o filtro de realidade** | não, só lê |

## Os que medem o canal

| Quando | Robô | O que mede |
|---|---|---|
| **seg 08h** | `youtube-retencao` | percentagem assistida, curva, comentários e **ranking de ganchos por mediana** dos Shorts |
| diário 04h | `youtube-benchmark` | tendências |
| diário 08h10 | `youtube-guarda` | se a produção e a publicação estão sãs |

✅ **O `youtube-retencao` é melhor do que qualquer coisa nos quatro repositórios
destilados.** Ele usa mediana contra o problema dos ciclos, exige amostra mínima,
diz *"ainda não sei"* quando não pode julgar, e **realimenta a escolha do gancho
seguinte** (`temas-vida.js` lê o ranking). As skills externas não têm nada disso.

---

# 🔴 Os seis buracos

## ✅ Buraco 1 — CONSERTADO a 02/10/2026

Era: **nenhum robô media CTR de miniatura nem impressões.** E é aí que está o
gargalo — **0,86% de CTR contra 5,5% de régua do ramo**, com 22.690 impressões.

**🔴 E o conserto óbvio estava errado.** O plano era pedir
`impressions,impressionClickThroughRate` à Analytics API v2 (a mesma do
`retencao.js`). Conferido na documentação oficial antes de escrever:

- `impressions` nessa API é **`adImpressions`** — impressão de **ANÚNCIO**. Volta
  um número plausível, sem erro, e **não é impressão de capa**.
- `impressionClickThroughRate` **não existe** lá.

Teríamos reportado publicidade como se fosse gente a ver a capa. **Verificar a
documentação em vez de deduzir salvou este conserto.**

**O que ficou feito:**

| | |
|---|---|
| `src/scripts/apis/youtube-reporting.js` | cliente novo da **Reporting API**, onde a impressão de capa vive de facto (`channel_reach_basic_a1`, campos `video_thumbnail_impressions` e `video_thumbnail_impressions_ctr`) |
| `src/scripts/youtube/retencao.js` | secção nova **«O CLIQUE NA CAPA»** no relatório de segunda, com régua de 4% e mínimo de 300 impressões; grava em `youtube-retencao.json` para comparar daqui a um mês |
| `.github/workflows/youtube-ligar-medicao-da-capa.yml` | correr **uma vez** para criar o trabalho de recolha |
| `tests/ctr-da-capa.test.js` | 7 provas, com caso falso de controlo na média ponderada |

**✅ Não precisou de segredo novo** — o escopo de leitura de analítica que o
`YOUTUBE_REFRESH_TOKEN` já tem serve, porque o relatório de alcance não é de dinheiro.

⏳ **Depende de uma espera que não é nossa:** a Reporting API só despeja o primeiro
ficheiro **até 48h** depois de o trabalho ser criado (e traz os ~30 dias
anteriores). Até lá o relatório diz *"ligado, à espera"* em vez de inventar número.

## ✅ Buraco 2 — CONSERTADO a 02/10/2026

Era: os robôs escolhiam páginas por **posição e impressões globais** e depois
mexiam no texto. **Nenhum filtrava por país, aparelho ou forma no tempo** — o
critério exacto que criou o fantasma, em produção três vezes por semana.

**O que ficou feito —** `src/scripts/lib/gsc-posts.js`, num sítio só:

| Função nova | O que faz |
|---|---|
| `MERCADOS` | os países de cada idioma, tirados de quem **de facto** traz gente ao blog. França, Alemanha, Marrocos, Argélia e Áustria ficam **fora de propósito** |
| `avaliarRealidade()` | os quatro cortes, 2 chamadas por página; devolve a **posição no mercado** |
| `filtrarCandidatasReais()` | aplica, troca a posição global pela do mercado, e **imprime cada rejeição com o motivo** |
| `somarComPosicao()` | posição **ponderada pelas aparições**, nunca média simples dos países |

**Ligado em três robôs**, e o quarto ficou fora com razão declarada:

| Robô | Estado |
|---|---|
| `gsc-otimizar-ctr` (ter) | ✅ e passou a exigir boa posição **no mercado** — a premissa dele é "boa posição + poucos cliques"; sem a boa posição não há título a consertar |
| `gsc-striking-distance` (qua) | ✅ e refiltra a janela 5–20 **depois** do filtro, porque a posição muda |
| `gsc-refresh-decay` (qui) | ✅ só como corte. 🔴 Aqui o fantasma entrava **no topo da lista**: um pico que acaba é, por definição, uma queda enorme |
| `gsc-canibalizacao` (sex) | ⬜ **fora de propósito.** Só acrescenta link interno, não promete nada ao leitor; e a régua de 30 aparições mataria quase toda a consolidação legítima de cauda longa — régua grossa a inventar defeito |

**Escape:** `GSC_FILTRO_REALIDADE=0` desliga e diz em voz alta que está desligado.

**Provas:** `tests/filtro-de-realidade.test.js` — 9 provas. O caso real reprova nos
três cortes de uma vez (posição 84 no Brasil contra 8 global), o pico passado é
reconhecido, **e três casos de controlo legítimos passam**: página brasileira em
boa posição, página nova com tráfego concentrado mas a acontecer, e amostra
pequena de mais para julgar o aparelho.

⚠️ **O que NÃO está provado:** a cadeia completa contra o Search Console de
verdade. As credenciais só existem na nuvem, por isso o que se mediu aqui são as
contas e as réguas — onde vive a decisão. **A primeira corrida a valer é terça,
07h UTC**, e ela imprime quantas páginas passaram e o motivo de cada rejeição.
É essa leitura que diz se a régua está no ponto.

## Buraco 3 — Os vídeos longos não são medidos por ninguém

`retencao.js` lê `.github/data/youtube-published.json`: **173 vídeos, todos Shorts**
(104 de 16s, 56 de 50s, 13 antigos). Os longos estão noutro ficheiro,
`youtube-longos-published.json` — **8 vídeos** — e quem o lê são cinco scripts de
**produção, publicação e validação**. Nenhum mede desempenho.

E os longos são onde está o volume: os cinco longos visíveis nos dados somam
**17.825 impressões de miniatura** contra algumas centenas dos Shorts.

**Conserto:** `retencao.js` passar a ler os dois ficheiros, **com réguas separadas**
— ver buraco 4.

## Buraco 4 — A régua dos 70% é régua de Short

`avaliarRetencao()` aplica `RETENCAO_MINIMA = 0.70` a tudo o que recebe. Para um
Short isso está certo e foi ordem do dono. **Para um vídeo longo, 70% de
percentagem assistida é irreal** — a referência do nicho é 40%, e 50% já significa
três vezes mais recomendação.

Hoje não dá erro porque nenhum longo chega lá. No dia em que o buraco 3 for
consertado, **todos os longos apareceriam como reprovados** — um alarme que dispara
sempre, que é a lição que esta casa já pagou duas vezes.

**Conserto:** a régua tem de vir do **formato** do vídeo, não ser uma constante
única: Short 70% de percentagem assistida; longo 40% de percentagem assistida **e
4% de CTR de miniatura**.

## Buraco 5 — O raio-x tem as datas escritas à mão

`gsc-raio-x-aparicoes.js` traz `FIM = '2026-09-29'`, `INICIO = '2026-09-02'`, e até
a página e a busca investigadas estão fixas no código. **Correr hoje mede
setembro.** Foi escrito para responder a uma pergunta de um dia, e funcionou — mas
não é ainda uma rotina.

**Conserto:** calcular a janela (últimos 28 dias, menos os 3 de atraso do Search
Console) e receber página/busca por parâmetro. É o que transforma o melhor
instrumento da casa em **mecanismo contínuo**, que é o que o Ed pediu.

## Buraco 6 — O detector de números falsos funciona e ninguém o lê

Isto é o mais barato de consertar e o mais caro de deixar como está.

O `fact-guard` corre **todos os dias às 05h** e escreveu, hoje às 10h52:

> **Posts:** 495 · limpos: 0 · bloqueados p/ revisão: 0 · **com flags: 66**

**Sessenta e seis textos sinalizados, zero ações.** E o relatório lista pelo nome
exactamente os problemas que uma avaliação externa "descobriu" esta semana lendo o
site — incluindo o artigo da água.

Há duas causas, e as duas importam:

1. **O relatório não chega a ninguém.** Fica em `press/fact-guard.md`, sem aviso.
2. **A régua é grossa e isso treina a ignorá-lo.** Entre os 66 há falsos alarmes
   claros — *"ajuste o limite de acordo com a realidade da sua família"* está
   marcado como estatística sem fonte. Quando metade de um aviso é ruído, o aviso
   inteiro deixa de ser lido. Ver lei nº4 em `SKILL.md`.

**Conserto:** apertar a régua (exigir atribuição a **instituição nomeada** + número
na mesma frase) e **mandar o resultado para o digest diário** que o Ed já recebe.

---

## 🔴 Buraco 7 — o relatório de segunda ainda mostra os números globais

Achado a 02/10 **enquanto se fazia o conserto nº2**, e vale registar porque é
barato e porque foi ele que enganou duas análises.

O `gsc-oportunidades` (segunda) **não edita nada** — só escreve
`press/gsc-oportunidades.md`. Mas é desse relatório que saiu a frase *«como reduzir
gastos mensais — 1.161 impressões, POSIÇÃO 8, ZERO cliques»*, que durante três
semanas guiou o SEO da casa e que uma avaliação externa repetiu como oportunidade
em 02/10. **Os robôs que agem já estão curados; o documento que os humanos leem
não.**

**Conserto:** passar a listar, ao lado da posição global, a **posição no mercado**
— as funções já existem em `gsc-posts.js`, basta chamá-las. Pequeno.

---

## O estado dos consertos

| | Buraco | Onde | Estado |
|---|---|---|---|
| 1 | medir o clique na capa | `apis/youtube-reporting.js` + `youtube/retencao.js` | ✅ **feito 02/10** — falta o Ed correr o workflow uma vez |
| 2 | filtro de realidade | `lib/gsc-posts.js` + 3 robôs | ✅ **feito 02/10** — prova a valer na terça 07h UTC |
| 3 | longos entram na medição de retenção | `src/scripts/youtube/retencao.js` | ⬜ aberto |
| 4 | régua por formato (70% é de Short; longo é 40%) | `src/scripts/youtube/retencao.js` | ⬜ aberto — **tem de vir junto com o 3** |
| 5 | raio-x com datas calculadas | `automacoes/gsc-raio-x-aparicoes.js` | ⬜ aberto |
| 6 | fact-guard afinado e no digest diário | `lib/fact-guard.js` + digest | ⬜ aberto |
| 7 | relatório de segunda com a posição do mercado | `automacoes/gsc-oportunidades.js` | ⬜ aberto (novo) |

⚠️ **O conserto 1 cobre o CTR da capa, não as fontes de tráfego.** De onde vem a
audiência (busca, feed, sugeridos) continua sem ser medido — está no mesmo
relatório `channel_reach_combined_a1` e seria uma extensão pequena do cliente novo.
