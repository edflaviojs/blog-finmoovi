# Por que o blog aparece e ninguém clica

> **Estado em 15/09/2026.** Varredura feita a pedido do Ed: *"sinto que estamos
> produzindo muita coisa mas sem efeito"*. Tudo aqui foi **medido**; o que não deu
> para medir está dito como tal.
>
> Documento irmão de `EMBEDS-OFERECER-AOS-PORTAIS.md`. Aquele trata de trazer link
> de fora; **este trata do que acontece depois que o Google já mostra a página.**

---

## 🔴 O NÚMERO QUE MUDA O DIAGNÓSTICO

Search Console, 17/08 a 14/09/2026 (`.github/data/gsc-oportunidades.json`):

| | |
|---|---|
| impressões | **3.262** |
| cliques | **ZERO** |
| buscas diferentes | 676 |
| páginas mostradas | 139 |

E uma única busca é **36% de tudo**:

> **"como reduzir gastos mensais" — 1.161 impressões, POSIÇÃO 8, zero cliques.**
> Na posição 8 o CTR esperado é 3,2%: deveriam ser **~37 cliques**.

**São dois problemas, não um.** Continua verdade que ninguém aponta para o blog
(4 backlinks *follow*, 0 domínios — ver o documento irmão). Mas o Google **já** mostra
o blog a milhares de pessoas, e elas passam à frente.

---

## ✅ O defeito que explica por que ninguém tinha consertado

O `gsc-otimizar-ctr.js` existe exatamente para reescrever título/meta de páginas com
boa posição e CTR baixo. Corre às terças. **Correu 3 vezes na história e nunca tocou
nessa página — e nunca ia tocar.**

| quem | media por | resultado |
|---|---|---|
| relatório de oportunidades | **BUSCA** | posição 8 ✅ |
| otimizador de CTR | **PÁGINA** | exige média ≤ 10 ❌ |

A média da página é puxada para baixo pelas dezenas de outras buscas ruins que ela
serve. **A maior oportunidade do blog era invisível para a ferramenta construída
para a consertar.**

É a família de defeito nº 1 desta casa — duas réguas para a mesma coisa, em ficheiros
diferentes, e a diferença só aparece em produção.

**Consertado em `39b2efcc`:** a regra passa a ser a **união** — entra quem qualifica
pela média da página (ninguém perde o que já tinha) **ou** quem tem pelo menos uma
busca em boa posição com CTR muito abaixo do esperado. A ordenação passa a ser pelo
tamanho da *oportunidade*, não pelo total da página.

---

## O candidato mais forte para os zero cliques: a promessa vazia

Medido nas **151 descrições em português**:

| | |
|---|---|
| começam com **"Descubra"** | 60 |
| começam com **"Aprenda a"** | 22 |
| **abertura vazia, total** | **82 de 151 — 54%** |
| **sem um único número** | **107 de 151 — 71%** |

A descrição da página das 1.161 impressões:

> *"Aprenda a reduzir gastos fixos mensais e economize dinheiro com dicas práticas e
> eficazes. Descubra como gerenciar suas finanças de forma inteligente."*

**Não promete nada.** Na posição 8 compete-se com sete resultados acima, e o snippet
é a única arma. Genérico perde para concreto.

⚠️ **NÃO ESTÁ PROVADO que é a causa.** Posição 8 é uma *média* e pode esconder
posições piores; a busca pode ter caixa de resposta do Google a roubar o clique. É o
candidato mais forte e o mais barato de testar.

⚠️ **E "põe um número" NÃO virou licença para inventar um.** No mesmo dia este blog
publicou uma **Selic falsa** por o prompt pedir comentário sem dar o dado. A regra
escrita é: se o artigo não tem número, não há número na meta.

**Consertado em `39b2efcc`:** o prompt do robô proíbe abrir com
"Descubra/Aprenda/Saiba/Entende" e exige o que o leitor leva dali — **e a trava
correspondente entra no mesmo commit**, porque prompt sem validador é meia trava.

---

## O que se descobriu da produção de conteúdo

### Não são 402 posts. São 151 em português.

O resto é o mesmo conteúdo traduzido para EN e ES. Recontado em 15/09 por três
caminhos que fecham no mesmo número — arquivos na pasta, prefixo do nome e campo
`locale` do frontmatter:

| | PT | EN | ES | total |
|---|---|---|---|---|
| posts | **151** | 151 | 151 | 453 |
| glossário | **120** | 120 | 120 | 360 |

**151 posts em quase um ano é pouco** — e o problema não é o volume, é a pontaria.

⚠️ **Correção de duas contas deste documento** (mediu-se 150 posts e 119 verbetes na
primeira passagem; os certos são **151** e **120**).

#### ✅ O "PT=132" da trava de i18n NÃO é defeito — mede outra coisa

A trava imprime `📊 Posts: PT=132` e isto assusta quem leu 151 aqui. **As duas contas
estão certas.** A trava só conta o que ela consegue emparelhar nos três idiomas
(`validar-i18n.js:118` — `pairedPosts`), e deixa de fora de propósito os posts
marcados `scope: br-only`, que não têm irmão em EN/ES:

```
151 posts em PT  −  19 marcados br-only  =  132
```

Os 19 são conteúdo que só faz sentido no Brasil: as cotações semanais, `pix-vs-ted`,
`tesouro-direto-para-iniciantes`, `cdb-vs-tesouro-selic`, o índice de custo de vida.
A conta fecha na casa das unidades, por dois caminhos independentes.

**Não "consertar" isto.** Igualar os números faria a trava exigir tradução de conteúdo
que não deve ser traduzido.

### A escolha de palavra-chave não tem dado nenhum por trás

| | |
|---|---|
| entradas na fila (`keyword-queue.json`) | **211** |
| com **volume de busca** gravado | **0** |
| com **dificuldade** gravada | **0** |

Fontes: **119 manuais** (digitadas à mão), 52 do autocompletar do Google, 40 do Search
Console. As 92 últimas nascem de procura real; as 119 primeiras são palpite.

✅ **Mas a prioridade NÃO está invertida** — fui verificar antes de acusar: a
prioridade fixa foi substituída por **rodízio justo** entre as três fontes.

E o pool de temas do `gerar-post-inteligente.js` é **escrito à mão**, com este
comentário por cima:

```js
// These are long-tail SEO keywords with high search volume in Brazil
```

**Não existe nenhum dado de volume em lado nenhum do projeto.** Alguém escreveu "tem
muita busca" e ninguém mediu.

### 🔴 O conteúdo não sustenta o ativo que poderia ranquear

Depois de ligar os 151 posts às calculadoras, a distribuição saiu assim:

| calculadora | posts que apontam para ela |
|---|---|
| orçamento | **87** |
| investimento | 32 |
| conversor de moedas | 15 |
| desconto | 4 |
| amortização · financiamento | 3 cada |
| **juros compostos** | **2** |
| aposentadoria | 2 |
| reserva | 1 |

Fui ler os títulos um a um antes de aceitar o número: a maioria é **mesmo** de
orçamento — *"reorganizar as finanças"*, *"apps de controle financeiro"*, *"erros
financeiros de iniciante"*.

**E a calculadora que mais precisa de ajuda é a de juros compostos** — 90.500
buscas/mês só na palavra principal, blog na **posição 73** — **e é tema de dois
posts.**

**Isto não se conserta com link interno. Conserta-se escolhendo outros temas.**

---

## ✅ O que foi feito no mesmo dia

| o quê | resultado | commit |
|---|---|---|
| glossário → calculadoras | **83** de 120 verbetes | `8019c882` |
| posts → calculadoras | **149** de 151 | `b54480bd` |
| títulos no plural | 11 verbetes, no `<title>` e no `<h1>` | `78b90fc5` |
| régua do robô de CTR | por busca, não só por página | `39b2efcc` |
| aberturas vazias | proibidas no prompt **e** na trava | `39b2efcc` |

**Antes:** 100 dos 119 verbetes e 96 dos 150 posts não apontavam para calculadora
nenhuma — e as duas CTAs de cada verbete mandam o leitor **para fora**, para
`app.finmoovi.com`. As páginas que recebem gente não mandavam ninguém para as páginas
que importam.

**37 verbetes e 2 posts continuam sem link, de propósito.** `wall-street`, `z-score`,
`yahoo-finance` não têm calculadora honesta a que ligar, e inventar uma ligação só
para encher o número seria enfeite.

⚠️ **Por que o mapa do glossário é à mão e o dos posts é por palavra:** o glossário
tem 119 verbetes que não mudam; os posts são 151 e nascem 3 por semana de robôs — um
mapa à mão ficaria desatualizado na semana seguinte.

---

## Dois falsos alarmes meus, registados para não voltarem

**1. A "canibalização" do `es-planificacion-financiera` não é defeito vivo.**
O relatório mostra a mesma página a competir consigo própria, com e sem barra final
(56 + 51 impressões). Medido: a URL sem barra dá **301** para a com barra e o
`canonical` está correto. O dado do GSC é histórico.

**2. Contar a classe CSS não é contar o link.**
O meu primeiro teste disse *"120 de 120 verbetes com link"*. O real era **83** — o
Astro emite o nome da classe no CSS de **todas** as páginas, e eu estava a contar isso.

---

# Noite de 15/09 → 16/09: o robô corria e não entregava

O plano era esperar a terça. **A terça era o mesmo dia** — e a corrida das 12:27
usou a régua VELHA, porque o conserto só entrou às 18:24. Seis horas de diferença.
Disparada à mão às 21:42, a régua nova apanhou a página das 1.161 impressões pela
primeira vez… e o robô pulou **22 das 23** candidatas.

## 🔴 A página do documento estava ERRADA

| | |
|---|---|
| este documento dizia | `como-reduzir-gastos-fixos-mensais-de-forma-eficaz` |
| **é** | **`como-organizar-suas-despesas-mensais-com-facilidade-e`** |

A página foi **assumida por parecença de nome** e nunca conferida. Confirmada agora
por três caminhos: o digest, a canibalização (código não tocado) e a corrida real do
otimizador, que a põe em 1º da fila.

**A razão de ninguém saber:** o digest pedia ao GSC as 10 mil linhas de `query+page`
e **só usava a página na canibalização** — as outras três categorias gravavam a busca
e deitavam a página fora. Consertado: o relatório grava agora a página de cada busca.
É a mesma família de defeito de duas réguas, terceira vez no mesmo dia.

## O que estava errado no snippet — e não era o "Descubra"

```
a pessoa digita:  como REDUZIR gastos mensais
o título dizia :  Como ORGANIZAR suas despesas mensais
```

Medido palavra a palavra: **"reduzir" não aparecia no título nem na descrição.** Ela
quer gastar menos; a página oferecia montar planilha. A descrição tinha 173
caracteres (o Google corta em ~160) e abria com "Descubra".

O artigo **tem** a seção *"Reduza seus gastos sem sofrimento"* — na linha 104 de 114.

**Reescrito à mão** para `Como reduzir gastos mensais: 3 cortes e a planilha certa`
+ descrição de 155 caracteres com os 3 cortes, as 24 horas, as 7 categorias e os 5
minutos — **cada número conferido dentro do artigo antes de entrar**. Descartei
"3 cliques" porque o artigo escreve *"três cliques"* e o teste reprovou.

⚠️ Muda também o H1 e o cartão das listas: `PostLayout.astro:111` lê o mesmo
`seo.metaTitle`. Aprovado pelo Ed com prévia.

**O relógio da medição começa em 15/09/2026. Medir por volta de 06/10.**

## 🔴 Por que o robô não entregava: 400 fichas

A Cerebras e o Groq correm `gpt-oss-120b`, que **raciocina antes de escrever** — e o
raciocínio gasta do mesmo `max_tokens`. O robô pedia 400, o segundo valor mais baixo
dos 27 robôs. Medido no workflow `diagnostico-provedores-texto`, com o prompt real:

| | resultado |
|---|---|
| 400 fichas | **397 gastas a pensar → `content` VAZIO** |
| 400 + `reasoning_effort:low` | 1 em 3 entregou |
| 1000 + `reasoning_effort:low` | **2 em 3 passaram todas as travas** |

**O controle que prova que não era a chave:** mesma chave, mesmas 400 fichas, pergunta
*"responda: funcionando"* → respondeu em 11 caracteres, nos dois provedores.

Entrou `reasoning_effort:low` (opt-in, só para `gpt-oss`) + 1500 fichas. Resultado:
**5 páginas em vez de 1, zero "resposta vazia".**

⚠️ **Eu encurtei o prompt na 1ª versão do diagnóstico** e deixei de fora a linha que
proíbe "Descubra". As cinco respostas abriram todas com "Descubra" e quase escrevi que
o modelo desobedece a uma proibição que nunca lhe enviei.

## 🔴 E então a IA inventou uma data

Fui ler as 5 páginas que ele entregou. Duas não podiam ficar no ar.

A página das cotações **da semana de 07/09/2026** recebeu:

> *"Confira a cotação do dólar em reais para **27/09/2026**, veja a variação da semana
> passada e **a projeção**."*

Data no **futuro**, ausente do artigo, e uma projeção que o artigo não faz. Título
passou a *"Cotação dólar hoje setembro 2026: preço atual"* num retrato fixo de uma
semana. **Desfeito.**

A outra: `"cdb 120% cdi liquidez diária 2026: supera a poupança?"` — minúscula e colada
de palavras-chave. ✅ **O 120% NÃO foi inventado** (o artigo diz *"90% a 120% do CDI"*);
a minha primeira medição acusou invenção por procurar `"120% cdi"` literal quando o
artigo escreve `"120% DO CDI"`. **Desfeito pela frase, não pelo número.**

### As travas que entraram (com o prompt, no mesmo commit)

| trava | porquê |
|---|---|
| `numerosFabricados` — **uma régua, dois clientes** | o repo **já** tinha anti-fabricação… só dentro de `buildSafeSection`. Uma **seção** nova não podia inventar número; o **título** e a **meta** podiam. Extraída e agora chamada pelos dois. Passa a apanhar DATAS |
| normalizar o espaço invisível | a 1ª versão só trocava U+202F por espaço e dava **falso alarme** em `120 %`. Falso alarme repetido é o caminho mais curto para alguém desligar a trava |
| `RETRATO_DE_DATA` | cotações e índice de custo de vida saem por **estrutura**: a trava de números apanha a data inventada mas não apanha a palavra *"hoje"* — nela não há número |
| título em minúscula | rejeitado |
| **quarentena de 21 dias** | o robô reescrevia a mesma página semana após semana — `como-economizar-no-supermercado` em **08/09 E 15/09**. Um título precisa de 2 a 3 semanas para o GSC responder. Registo em `.github/data/ctr-otimizadas.json`, no mesmo commit das páginas |

8 casos testados, **3 deles controles falsos que têm de reprovar** (valor em reais,
percentagem e ano inventados de propósito). Os 8 passaram.

## O que ficou ABERTO (por ordem de tamanho)

1. 🔴 **O glossário é invisível ao robô de CTR.** `pageUrlToFile` só procura em
   `src/content/posts/`; os 120 verbetes vivem noutra coleção. **10 das 23
   oportunidades eram do glossário** e nenhuma pode ser consertada.
2. 🔴 **O schema não segue o título.** `auto-schema.js:220` faz
   `if (hadBlock && !force) continue` — pula quem já tem bloco, e o workflow diário
   corre sem `--force`. Varridos os 276 posts com bloco: **123 batem, 1 divergia**
   (criada por mim, já consertada), 152 sem campo para comparar. Não é um problema de
   cem páginas; é uma **porta aberta**.
3. ⏳ **Medir o CTR de "como reduzir gastos mensais"** por volta de **06/10/2026**.
4. **Decidir os temas** — a decisão mais cara, e **não começada**. 87 dos 151 posts
   caem na calculadora de orçamento; a de juros compostos disputa 90.500 buscas/mês,
   está na posição 73 e tem **2** posts.
5. **Pôr volume na fila de palavras-chave** — **não começado**. 211 entradas, zero com
   volume.
6. **Os CTAs dizem *"Usado por milhares de pessoas"*** nos três idiomas — mesma família
   do *"+2.400 pessoas"*. **Decisão do Ed, não tocado.**
7. **25 descrições usam bloco YAML `>-`** — família de `blog-parou-3-dias-yaml-dobrado`.
   **Por verificar, não tocado.**

---

# 16/09/2026: o blog não tem um problema de tema. Tem uma página.

> A pergunta do dia era a COISA 2 — *decidir os temas*, com número e não com
> palpite. A medição respondeu outra coisa, e a resposta muda a pergunta.

## A medição que faltava: 16 meses, não 28 dias

Entrou o `gsc-temas.js` (só à mão, `gsc-temas.yml`, não commita nada — escreve no
log da corrida para não disputar o repo com os robôs). Ele responde por **TEMA**,
onde o digest existente responde por **BUSCA**, e olha o histórico todo que o GSC
guarda em vez dos últimos 28 dias.

Dois controles falsos correm na mesma execução e derrubam a corrida se passarem:
um tema com palavras absurdas, que não pode capturar nada, e uma busca inventada
pedida ao GSC, que tem de voltar vazia.

**2025-05-21 → 2026-09-13: 2.397 buscas · 10.815 impressões · 1 clique.**

### O blog é mais visto em INGLÊS do que em português

O idioma sai do caminho da página (`/en/`, `/es/`) — um facto do site — e não de
adivinhar a língua da busca. "etf" e "pix" não têm idioma nenhum.

| idioma | impressões | % | cliques |
|---|---|---|---|
| **en** | 4.666 | **43,0%** | 0 |
| pt | 3.517 | 32,4% | 0 |
| es | 2.677 | 24,7% | **1** |

⚠️ A primeira corrida classificou só em português e deixou **60,4% das
impressões** por classificar. Não era cauda longa dispersa: eram as buscas EN/ES
que as páginas `/en/` e `/es/` já servem (*financing* 465, *investment fund* 341,
*financiamiento* 171). **Um dicionário só em português dava a tabela ao
contrário** — punha orçamento em primeiro e escondia que investimentos, somando
os três idiomas, é maior.

### Que parte do blog recebe a procura — e em que posição

| parte | impressões | % | páginas | posição média | chega ao top 10 |
|---|---|---|---|---|---|
| **glossário** | 7.126 | 65,6% | 301 | **69,1** | 70 (**1,0%**) |
| **posts** | 2.661 | 24,5% | 92 | 39,5 | 1.262 (**47,4%**) |
| **ferramentas** | 837 | 7,7% | 8 | **80,9** | 1 (0,1%) |
| outras | 236 | 2,2% | 5 | 15,9 | 0 |

Sem a posição, o número engana ao contrário: **7 mil impressões na página 8 e 7
mil na primeira página são o mesmo número e coisas opostas.**

> **O glossário é dois terços de tudo e está na página 7. As calculadoras estão
> na página 8.** Os posts são um quarto do volume e quase metade deles chega à
> primeira página.

### 🔴 87% da força do blog vem de UMA página

| impressões no top 10 | % | página |
|---|---|---|
| **1.162** | **87,2%** | `/posts/como-organizar-suas-despesas-mensais-com-facilidade-e/` |
| 27 | 2,0% | `/en/posts/en-credit-card-vs-debit-card…` |
| 25 | 1,9% | `/es/glossario/es-gasto-recurrente/` |
| 18 | 1,4% | `/en/posts/en-5-alternatives-to-mobills-in-2026/` |

**Tirando essa página, o blog inteiro — ~480 páginas em três idiomas — apareceu
na primeira página do Google 171 vezes em um ano e quatro meses.**

A média de uma secção pode ser boa por causa de uma única página: *"o blog tem um
ativo"* e *"o blog tem UMA página"* produzem a mesma média e decisões opostas, e a
diferença só aparece listando as páginas.

### Demanda × oferta, por tema

| tema | impressões | % | posição média | posts | pt/en/es | gloss/posts/ferram |
|---|---|---|---|---|---|---|
| investimentos | 4.031 | 37,3% | 73,2 | 21 | 694/2534/810 | 2959/936/143 |
| orçamento | 1.922 | 17,8% | **25,5** | 57 | 1507/149/284 | 474/**1250**/0 |
| financiamento | 1.601 | 14,8% | 59,9 | **6** | 167/978/458 | **1496**/34/73 |
| juros compostos | 488 | 4,5% | 85,6 | **1** | 483/0/5 | 17/0/**471** |

**Juros compostos: a procura vai toda para a CALCULADORA, não para posts.** O
tema que se queria atacar com artigos não se ataca com artigos.

---

## O que o Semrush respondeu — e o que ele desmentiu

Print de `keywordoverview?db=br&q=como+reduzir+gastos+mensais`:

| | |
|---|---|
| volume Brasil | **40.500/mês** |
| volume global | 97.300 (BR 40.500 · FR 14.800 · **UK 14.800** · ES 12.100 · **CA 4.400**) |
| dificuldade | **43% — "Possible"** |
| intenção | Informational · CPC R$ 1,03 · densidade 0,03 |

### A busca é ganhável sem backlinks — e isso derruba o diagnóstico da véspera

| pos | site | Page AS | domínios | backlinks | **buscas que a URL ganha** |
|---|---|---|---|---|---|
| 1 | itaú | 28 | 58 | 104 | 47 |
| 3 | serasa | 17 | **3** | 6 | 11 |
| 5 | vivaprev | **2** | 14 | 18 | **1** |
| 8 | serasa | 16 | **2** | **2** | **90** |
| 9 | blu365 | 6 | **1** | **1** | 16 |
| — | **FinMoovi** | — | 0 | 0 | **2** |

**Estava escrito aqui que nada ranqueia por falta de autoridade. É falso.** A
página na posição 9 tem UM link. O blog ranqueia bem quando a busca não exige
autoridade — e os temas escolhidos (juros compostos, KD 69) eram os que exigem.

> **A régua certa não é volume. É volume × dificuldade × valor do clique.**

### A coluna que ninguém tinha lido: CPC

| busca | CPC | volume |
|---|---|---|
| **guardar dinheiro / guarda dinheiro** | **R$ 2,63** | 3.200 |
| gastos mensais | R$ 1,81 | 720 |
| gastos mensais planilha (**intenção COMERCIAL**) | R$ 1,71 | 590 |
| como reduzir gastos mensais | R$ 1,03 | 40.500 |
| **como economizar dinheiro** | **R$ 0,36** | **74.000** |

"Como economizar dinheiro" tem 74 mil buscas e o clique quase não vale nada.
"Guardar dinheiro" tem 3.200 e vale **sete vezes mais por clique**.

### ⚠️ O Google já responde a pergunta na própria tela

O SERP tem **AI Overview**, *People also ask*, *Video carousel*, *Reviews* e
*Sitelinks*. O documento listava isto como hipótese não confirmada. **Está
confirmado.**

> **Isto muda o que esperar da medição de 06/10.** A conta *"posição 8 deveria
> dar ~37 cliques"* vale para uma tela limpa. Se der 5 em vez de 37, **não é o
> título que falhou** — é a tela. Registado agora para não se tirar a conclusão
> errada dentro de três semanas.

### ⚠️ Números do Keyword Magic que NÃO foram usados

A lista devolve, dentro do banco do Brasil, buscas em francês (301.000),
italiano (74.000) e alemão (60.500). Trezentas mil buscas em francês no Brasil
não se sustenta. **Não conferido, não usado.**

E o topo da semente "gastos" no Brasil é quase todo **serviço do governo** —
abono salarial 201.000, PIS 110.000, FGTS 60.500, Desenrola, FIES, limpa nome.
Volume enorme, público errado: quem digita "consultar PIS" não quer um app de
finanças.

---

## O que foi feito

### A mesma página, nos três idiomas, com o mesmo defeito

| idioma | antes | agora | busca |
|---|---|---|---|
| pt | Como organizar suas despesas mensais | Como reduzir gastos mensais: 3 cortes e a planilha certa | 40.500 (15/09) |
| **es** | Cómo **organizar** tus gastos mensuales | Cómo **reducir** gastos mensuales: 7 categorías y 5 minutos al día | **246.000** |
| **en** | How to **Organize** Your Monthly Expenses | How to **Reduce** Monthly Expenses: 7 Categories, 5 Minutes | ~19.200 (UK+CA) |

O espanhol e o inglês são traduções literais do título português — e por isso
herdaram o defeito dele. **Cada idioma precisa da palavra que aquela gente
digita.**

⚠️ **O artigo espanhol não tem a secção *"Reduza seus gastos sem sofrimento"* que
o português tem.** O título promete um pouco mais do que o texto entrega — menos
do que prometia antes, mas ainda assim. O conserto completo é traduzir a secção.
**Não feito.**

⚠️ **O `24 hours` do artigo inglês tem um U+202F no meio — espaço invisível.** A
verificação procurou `"24 hours"` com espaço normal, não encontrou, e ia levar a
tirar da descrição um número que existe.

### 🔴 A reescrita de 15/09 criou uma canibalização

`como-reduzir-gastos-fixos-mensais-de-forma-eficaz` **já se chamava** "Como
Reduzir Gastos Fixos Mensais", e a página das 1.161 impressões foi retitulada
para "Como reduzir gastos mensais". Dois posts, a mesma busca.

O post dos gastos fixos passa a dizer o que de facto ensina — **negociar**
aluguel, internet, seguro e assinaturas, que são as suas próprias secções. A
frase disputada sai do título e fica só na página que já ranqueia.

**E a descrição genérica que este documento citou como sendo da página das 1.161
impressões — *"Aprenda a reduzir gastos fixos… Descubra…"* — é do OUTRO post.**
O documento misturou os dois.

### O artigo dos gastos fixos tinha a conta errada

A tabela soma **R$ 3.450 → R$ 2.950 = R$ 500/mês**. O texto afirmava **R$ 530**,
e daí **R$ 6.360/ano** em vez de R$ 6.000. Corrigido, e a frase passa a mostrar a
conta inteira para um erro destes ficar à vista.

### 🔴 As três travas de canibalização não funcionavam

| trava | o que fazia | medido | agora |
|---|---|---|---|
| `seo-guard.isThemeCovered` (11 geradores) | exigia **3 palavras iguais** | tema de 2 palavras **nunca** dispara; 100 das 212 entradas da fila (47%) têm <3 palavras; apanhava **8** | `need = min(3, tamanho)` → apanha **39** |
| `validar-i18n` (CI) | compara o **nome do ficheiro** | o nome nunca muda, o **título** muda — por slug acusa **0** pares em 136 posts | passa a comparar slug+título: **3** pares, todos reais. **AVISO**, não erro |
| `keyword-queue` (fila) | semelhança só para 3+ tokens | **0** das 212 apanhadas | 2 tokens entram pela contagem de partilhados (não pelo Jaccard): **17**, entre elas SEIS entradas para "economizar água" |

O aviso do CI entra como aviso e não como erro de propósito: **já nasce com 3
casos por resolver, e uma trava que deixa o CI vermelho no primeiro dia acaba
desligada — e com ela para de publicar o blog inteiro.**

O corte da fila fica em 2 tokens e não em 1 porque com 1 mediu-se falso alarme
real: *"juros o que é"* era recusada por causa de *"calculadora juros
compostos"*, que é outro tema.

Tudo testado com as **funções reais**, não com cópias da regra, e com controles
nos dois sentidos — o que tem de bloquear e o que tem de passar.

---

## A lista de temas (conferida um a um contra os 151 posts)

Variações agrupadas: **"guardar dinheiro", "como guardar dinheiro", "guarda
dinheiro" são UMA página, não três.**

### Arrumar o que já existe

| o quê | busca | volume | KD | CPC |
|---|---|---|---|---|
| título do post de guardar dinheiro | guardar/juntar dinheiro (6 variações) | ~11.500 | 23–36 | **R$ 2,63** |
| título da planilha de gastos | planilha de gastos | 9.900 | 46 | R$ 1,35 |

### Escrever novo — livres de verdade

| busca | volume | KD | CPC |
|---|---|---|---|
| **planner financeiro** | 3.600 | **21** | R$ 1,35 |
| **estou devendo para o banco e não tenho como pagar** | 1.000 | **22** | R$ 1,09 |
| dívida de cartão de crédito que caduca | 720 | **29** | R$ 0,41 |
| dívida de cartão de crédito (grupo) | ~3.300 | 34–36 | R$ 1,30 |

### Não escrever

- **orçamento pessoal** (1.300) — já existe `como-criar-orcamento-pessoal`
- **gastos mensais** (720) — é a página vencedora, já serve
- **como economizar dinheiro** (74.000) — KD 49 **e** CPC R$ 0,36

**O grupo mais fácil de todos é DÍVIDAS (KD médio 33%) — e o blog tem 2 posts.**

---

## O que fica ABERTO

1. ⏳ **Medir o CTR** por volta de **06/10** — as três páginas (pt/en/es) e a
   colisão desfeita. Contar com a AI Overview a comer o clique.
2. 🔴 **O glossário precisa de decisão, não de conserto.** 301 páginas, 66% das
   aparições, posição 69, **1% chega ao top 10**. Consertar títulos na página 7
   não traz clique: todo o glossário junto vale 120 impressões em posição
   decente, contra 1.162 de uma única página. **Ligar o robô de CTR ao glossário
   continua certo, mas não é prioridade** — ao contrário do que este documento
   dizia.
3. 🔴 **3 pares de canibalização por título por resolver** (Dia das Crianças,
   Excel, e o resíduo de slug do par de hoje). Enquanto existirem, o aviso do CI
   não pode ser promovido a erro.
4. **A secção de cortes do artigo espanhol** por traduzir.
5. **Os CTAs dizem *"Usado por milhares de pessoas"*** nos três idiomas — mesma
   família do *"+2.400"*. **Decisão do Ed, não tocado.**
6. **25 descrições usam bloco YAML `>-`** — por verificar, não tocado.
7. **As calculadoras estão mortas no Google** (posição 81, uma impressão no top
   10 em 16 meses). São **isca de link**, não conteúdo de SEO. Usá-las assim.

---

# 16/09/2026, parte 2: executar a lista — e o que a execução desmentiu

> A manhã mediu e decidiu. Esta parte é fazer: o título de guardar dinheiro, os
> três pares de canibalização e o primeiro post novo. **Nenhum endereço mudou.**

## 1. O post de guardar dinheiro não dizia "como guardar dinheiro"

É o clique mais caro da lista: **~11.500 buscas/mês, KD 23–36, CPC R$ 2,63** —
sete vezes o CPC de "como economizar dinheiro", que tem 74.000 buscas.

| | título |
|---|---|
| antes | A forma mais eficaz de guardar dinheiro em 2026: estratégia prática e automática (**79 car.**) |
| pt | **Como guardar dinheiro: 4 passos para juntar todo mês** (51) |
| en | How to Save Money Every Month: 4 Practical Steps (47) |
| es | Cómo ahorrar dinero cada mes: 4 pasos prácticos (46) |

A palavra-chave não faltava — **começava no caractere 24**, e o Google cortava o
resto. O "juntar" entra para apanhar a segunda família de variações com a mesma
página, que foi a lição da manhã: *uma página cobre as variações.*

As três opções foram medidas contra os 151 posts PT com a função real, com
controle falso na mesma corrida. **E a medição mudou a ordem do trabalho:** a
opção escolhida COLIDIA, mas não com o que se esperava — com o post do **Dia das
Crianças**, que tinha "guardar dinheiro" e "passos" no título. O par 1 teve de
ser resolvido primeiro.

> Efeito colateral medido: `isThemeCovered("guardar dinheiro")` respondia
> **COBERTO — pelo post do Dia das Crianças**. Os 11 geradores achavam que o tema
> mais valioso da lista já estava escrito, por causa de um post sazonal de
> presentes.
>
> ❌ **Esteve escrito aqui que retitular resolvia isto. Não resolvia.** Medido
> depois: continuava a responder COBERTO — já não pelo título, **pelo NOME DO
> FICHEIRO**, que ainda dizia `guardar-dinheiro`. É a mesma lição da regra 5b,
> aplicada a mim: **o nome nunca muda.** Só a fusão (secção 5) libertou o tema.

## 2. Os três pares — e o terceiro não era canibalização

| par | o que era | o que ficou |
|---|---|---|
| Dia das Crianças | duplicata quase exata, os dois com "7 passos" | o de 14/08 passa a "gastar menos com presentes"; o de 21/08 fica com "como economizar para o Dia das Crianças" |
| Excel | os dois acabavam em "e ganhar tranquilidade [financeira]" — era a **cauda** que os colava | "modelo de planilha Excel para finanças pessoais" × "fluxo de caixa no Excel com saldo automático" |
| gastos mensais | **resíduo de slug** | a régua mudou, os ficheiros não |

Nos **três idiomas**: EN e ES eram tradução literal e herdaram o mesmo defeito —
os dois posts ingleses do Dia das Crianças chamavam-se *"7 Practical Steps to
Save Money for Children's Day"* e *"How to Save for Children's Day: 7 Practical
Steps"*.

### O terceiro par: a união slug+título arrasta um nome de ficheiro para sempre

Os títulos já estavam separados desde 15/09. O que ainda colidia era o **nome do
ficheiro** `como-reduzir-gastos-fixos-mensais-...`, que continua a ter "reduzir
gastos mensais" dentro — e a regra 5b media a **união** de slug + título.

A regra passa a medir **só o título**. Colisão de slug com slug já é a regra 5,
que já era erro. Renomear o ficheiro não é opção (a renomeação de slugs custou
meses de reindexação este ano) e, medido, **nem era preciso**.

⚠️ **A duplicação de CONTEÚDO do par do Dia das Crianças continua.** Os títulos
já não competem, mas os dois corpos são quase o mesmo artigo (meta visual,
captura automática, cofrinho digital, cashback, revisão). O conserto completo é
fundir num só e redirecionar o outro — **é apagar uma página, decisão do Ed.**

## 3. Promover o aviso a erro obrigou a consertar o guard de entrada

O gate do CI corre **depois** de o gerador já ter escrito, ilustrado, traduzido e
commitado o post. Um erro ali não é um aviso: **é o post perdido e o blog a parar
de publicar.** Antes de promover:

| | antes | agora |
|---|---|---|
| `isThemeCovered` | comparava só **nomes de ficheiro** | compara nome **e título**, separadamente (nunca unidos) |
| `skipSeTituloCanibaliza` | recebia o **slug** | recebe também o **título inteiro** |

O slug é o título **cortado aos 60 caracteres**, e quase todos os slugs desta
casa estão cortados: uma colisão que dependesse de uma palavra da cauda passava
no guard e reprovava no gate. Caso real construído e medido — passava, agora é
apanhado; o controle falso do mesmo tamanho continua a passar.

**Impacto medido na fila real (212 entradas): 39 → 42 bloqueadas, zero
regressões.** As 3 novas são reais.

⚠️ **Ponto cego que fica:** `slugifyTheme` corta aos **80** caracteres, portanto
uma colisão que só aparecesse depois do caractere 80 do título é invisível ao
guard **e** ao gate. Os dois concordam, ninguém fica vermelho, ninguém vê. **Um
título dos 151 passa dos 80.** Não mexido.

### E o título antigo ainda estava dentro do JSON

Mudar o `title:` do frontmatter não chega: estes posts levam um bloco JSON-LD no
fim (`SCHEMA_AUTO`) com o título outra vez, no campo `name` do HowTo. **Seis
ficheiros ficaram a dizer uma coisa ao leitor e outra ao Google.**

A primeira busca não os encontrou porque exigia `SCHEMA_AUTO:{` e metade dos
blocos começa por `SCHEMA_AUTO:[` — um array. **A busca estreita respondeu "não
há nenhum" e quase foi acreditada.** Os 276 blocos foram relidos como JSON depois
da troca: 276 válidos. (O `validate-schema.js` lê o `dist/`, o build velho — não
servia de prova para uma alteração feita agora nos markdown.)

## 4. O post novo: planner financeiro

3.600 buscas, **KD 21** — o mais fácil da lista. Conferido com a trava nova antes
de escrever: livre, e o título escolhido não colide com nenhum dos 151.

Escrito à mão nos três idiomas. O ângulo é o que falta nos artigos que já
existem: não é a lista de páginas bonitas, é a **rotina** (1 min/dia, 5/semana,
15/mês) e a separação entre **anotar** e **classificar**, que é onde a maioria
desiste. Sem número inventado e sem valor em moeda fixa.

Travas: `validar-i18n` com a canibalização já como **erro** (PT=EN=ES=**133**),
slugs, link-guard (0 links inventados em 816 ficheiros), capas, e varredura de
caracteres invisíveis nos 3 ficheiros.

### A capa: o provedor grátis não serve, e a trava de letras provou-o

Os dois provedores bons só têm chave no GitHub. Aqui só corre o Pollinations, e
ele devolveu **duas vezes** uma imagem fora do tema (um casal numa floresta; uma
mulher num parque) **com marca d'água**. Publicada assim, com o `imageAlt` a
descrever a imagem que **está mesmo lá** — alt que mente é pior do que alt feio.

O robô `capas-com-letras` mediu e **reprovou-a à primeira**, e a corrida seguinte
refez com o Cloudflare Workers AI: caderno, calculadora e moedas. Uma chamada
paga, autorizada. O robô apaga o `imageAlt` ao refazer, para o robô das
descrições redescrever — mas esse corre 3x/dia e o post já estava no ar, por isso
a descrição foi escrita à mão **olhando o ficheiro**.

⚠️ O robô das capas reescreve o frontmatter inteiro ao commitar: as descrições
dos 3 posts novos foram convertidas para bloco YAML `>-`. **As tais 25 descrições
agora são 28** — e a conversão não foi decisão de ninguém, é o robô.

## 5. A fusão do par do Dia das Crianças (autorizada pelo Ed)

Os títulos deixaram de competir de manhã; os **corpos** continuavam a ser o mesmo
artigo. Fundidos.

| | |
|---|---|
| **fica** | `como-economizar-para-o-dia-das-criancas-ja-em-2026-7-passos` (21/08) |
| **sai** | `7-passos-praticos-para-guardar-dinheiro-para-o-dia-das` (14/08) |

**O que decidiu:** a URL do vencedor **contém a busca real**; a do outro dizia
"guardar dinheiro para o dia das" — endereço a discordar do título novo. Os dois
estavam **indexados** no GSC de 15/09, portanto isso não desempatava.

**O que pesava contra:** o que sai tinha **11** links internos, o que fica tinha
**3**. Mas link interno muda-se; URL não. Os 11 foram reapontados.

**Nada de conteúdo se perdeu:** as duas secções que só o post que sai tinha —
*regra das 24 horas* e *experiências no lugar do presente caro* — passaram para o
vencedor, nos 3 idiomas, como bloco próprio (para não quebrar o "7 passos" do
título).

⚠️ E de caminho: a secção *"Por que isso funciona?"* do vencedor tinha **uma
frase, sem fonte, atribuída à Investopedia** — já estava na lista do
`press/fact-guard.md`. O inglês era pior: *"Research from Investopedia shows…"*.
Reescrita nos 3 idiomas.

### As provas, porque esta é a operação que parou o blog 5 dias em 09/09

- **301 nas 6 linhas** (3 URLs × com e sem barra), como manda o cabeçalho do ficheiro.
- **Os 11 links reapontados ANTES de apagar** — regra da casa: link interno aponta
  para a URL FINAL, nunca para origem de redirect.
- **A URL não pode voltar:** 5 títulos plausíveis do tema testados contra a trava
  de canibalização — os 3 reais **bloqueiam**, os 2 controles falsos passam.
- 🔴 **`slug-aposentado` só cobre `/glossario/`, não `/posts/`.** Medido: das
  **157** origens `/posts/` do `_redirects`, a única que ainda era ficheiro vivo
  era esta. Estender não daria falso alarme nenhum — mas só o glossário a chama,
  por isso **fica registado como buraco**. Hoje quem tapa é a canibalização.
- **Build do zero**, com o `dist/` apagado à mão primeiro (o `clean-dist` falha
  nesta máquina por causa do acento no caminho, e o validador corria sobre lixo
  velho — ver [[ambiente-fs-rmsync-acento]]): **52.876 links em 920 páginas**,
  nenhum 404, nenhum a apontar para origem de redirect. Conferido no HTML
  construído que as 2 secções chegaram aos 3 idiomas.
- **PT=EN=ES=132.**

As 12 imagens do post que saiu ficam no repo: ninguém as referencia, e apagar
binários não traz nada hoje.

## 6. A barra no endereço NÃO era problema — mas a medição achou outro

Hipótese: no dado do Google a mesma página aparecia duas vezes, com e sem barra
final, dividindo as impressões. **Falso.** Medido com `curl`:

| | |
|---|---|
| sem barra | **308** → mesma página, com barra |
| com barra | 200 |
| `<link rel=canonical>` | aponta para a versão **com** barra |
| controle falso (URL inventada) | **404**, como devia |

As 220 impressões do lado sem barra são **6%** e são histórico. **Riscado.**

### 🔴 O que apareceu no lugar: 5 páginas que o Google recusa indexar

O `gsc-index-status.json` diz porquê, com todas as letras: *"Duplicate, Google
chose different canonical than user"*. E o endereço que ele escolheu é, nas
cinco, o **antigo** — o que foi aposentado quando os slugs decepados foram
arrumados.

⚠️ **O mesmo ficheiro também tem uma armadilha:** *"0 de 854 URLs sem barra"*
parece provar que o Google não indexou versões sem barra. **Não prova nada** — o
verificador só inspeciona as URLs do sitemap, que já têm barra. É ausência da
**pergunta**, não do facto. Mesma família do `SCHEMA_AUTO:{`.

**Do nosso lado estava tudo certo**, conferido um a um: 301 do antigo para o
novo, canonical certo, novo no sitemap, antigo fora do sitemap, nenhum link
interno para origem de redirect.

### A causa somos nós, e a prova não é o log

Em julho de 2026 sindicámos estes posts para **Blogger, Pinterest, Raindrop,
Flipboard, Mix e pingbacks** — **antes** de os slugs mudarem. Com **4 links
dofollow no mundo inteiro**, estas cópias pesam na escolha do Google.

> Buscada a página do Blogger que está no ar: linkava mesmo o endereço velho,
> com o traço solto no fim. A busca por uma URL inventada na mesma página deu
> **zero** — não era engano da busca.

**69 cópias nossas lá fora apontavam para endereços mortos:** 9 no Blogger, 60 em
Pinterest/bookmarks/pingbacks. Só o Blogger tem chave nossa **e** conteúdo
editável.

### O que foi feito

`scripts/fix-blogger-links.js` + `blogger-consertar-links.yml` (só à mão, relata
por omissão). Duas regras dentro dele:

1. **O registo não é prova.** Vai buscar o conteúdo ao Blogger e só altera se
   encontrar mesmo a URL velha lá dentro.
2. **Relatar antes de escrever.**

A primeira corrida em modo relatar apanhou o defeito que a regra 1 existe para
apanhar: **2 das 10 entradas têm `bloggerId: "seeded-2026-07-12"`** — registo
escrito à mão que nunca foi ao ar. Passaram a contar à parte em vez de pôr a
corrida vermelha.

**8 cópias reais reapontadas, 0 falhas.** Conferido nas páginas que estão no ar
(não no log): as 5 verificadas linkam agora a URL nova, **com a barra final**, e
os 5 destinos respondem **200 direto**, sem salto extra. O controle falso deu
404.

Bónus: a cópia do post do Dia das Crianças passou a apontar sozinha para a página
que sobreviveu à fusão de hoje.

> **A regra que fica:** quando um endereço muda, **as cópias lá fora têm de ser
> refeitas**. Foi por isto que ficou escrito *"não renomear mais slugs"* — agora
> tem preço medido: **5 páginas invisíveis** durante meses.

## 7. A 2ª maior oportunidade do blog — e o código a vazar para a tela

O `strikingDistance` do digest já listava isto há semanas e ninguém tinha aberto.
⚠️ **Eu próprio li o campo errado na primeira tentativa** (`x.page`, que não
existe; o certo é `x.pages`, uma lista) e quase fui pedir uma corrida nova ao
GSC para buscar um dado que já estava no ficheiro. **Terceira vez no mesmo dia em
que a busca é que estava estreita, não o facto ausente.**

| pos | aparições | cliques | busca | página |
|---|---|---|---|---|
| 8 | 1.161 | 0 | como reduzir gastos mensais | a página vencedora |
| **10,2** | **206** | **0** | **como organizar as finanças pessoais** | **`/como-organizar-financas/`** |
| 9,7 | 20 | 0 | is credit card worth it 2026 | post EN |

**A segunda não é post nem verbete: é uma página solta.** Por isso escapava a
todos os robôs de conteúdo — eles varrem `posts` e `glossario`.

### 🔴 Antes do SEO, um defeito à vista

Ao ler a página apareceu isto, no ar, para quem visita:

```
"Começar com o $FinMoovi (7 dias grátis)"        ← cifrão colado na marca
"Milhares de pessoas já usam o $FinMoovi"
página Sobre (en/es): "$contato@finmoovi.com"
```

E pior: na **página Sobre em inglês e espanhol** o link de contacto apontava
literalmente para `mailto:${config.email.replyTo}` — **clicar não abria e-mail
nenhum.** A página Sobre existe porque um diretório recusou o site por
*"Untrustworthy"*; dois dos três idiomas tinham o contacto morto.

**Duas causas ao mesmo tempo, e a segunda é silenciosa:**

| onde | o que acontece |
|---|---|
| markup do Astro | `{expr}` já é avaliado — o `$` à frente **sobra à vista** |
| string de aspas | `${expr}` **não interpola**: fica o texto do código |

O segundo caso cai dentro do **JSON-LD**: o Google lia *"use um app como o
${config.app.name}"*. Não dá erro, não fica vermelho, só sai errado.

**Eram 6 páginas**, não uma: `como-organizar-financas`, `como-sair-das-dividas`,
`orcamento-pessoal`, `guia-30-dias`, `app`, `en/sobre`, `es/sobre`. Medido no
**HTML construído**, não na fonte: antes 5 páginas com `${config…}` e 4 com
`$FinMoovi`; depois **zero e zero no site inteiro**, com controle falso nas duas
corridas e 14 blocos JSON-LD válidos.

### Depois disso, o snippet

| | |
|---|---|
| antes | Como Organizar Finanças Pessoais - Guia Completo 2026 (69 car.) · *"**Aprenda como** organizar suas finanças pessoais do zero…"* |
| agora | Como organizar as finanças pessoais em 5 passos (63) · *"Os 5 passos na ordem certa: mapear 30 dias de gastos, aplicar o 50-30-20, montar a reserva de 3 a 6 meses, quitar as dívidas caras e só então investir."* |

É o defeito que este documento já tinha nomeado: **82 das 151 descrições abrem
com "Descubra"/"Aprenda a" e 107 não têm um único número.** E *"guia"* e
*"completo"* estão literalmente na lista de palavras que a trava de canibalização
desta casa trata como ruído.

**Conferido que não promete a mais:** as cinco coisas da descrição — 30 dias,
50-30-20, 3 a 6 meses, cheque especial, investir — foram todas encontradas no
HTML construído. O controle falso (*"cashback"*) não aparece.

---

## O que fica ABERTO depois de hoje

1. ⏳ **Medir o CTR por volta de 06/10** — agora são **cinco** páginas (as três
   de gastos mensais, guardar dinheiro e `/como-organizar-financas/`). Contar com
   a AI Overview.
2. 🔴 **O glossário precisa de decisão, não de conserto.** Continua igual.
3. ✅ **O par do Dia das Crianças está fundido** (secção 5). Em aberto fica o
   **buraco do `slug-aposentado` para `/posts/`**: só o glossário o chama, e
   estendê-lo obriga a passar pelos 9 geradores.
4. ✅ **Feito, e era maior do que estava escrito.** O documento dizia que faltava
   a secção no **espanhol**; faltava nos **dois** — PT tinha 8 secções, EN e ES
   tinham 6. As duas em falta são as que cumprem o título novo (*"Reduza seus
   gastos sem sofrimento"* e *"Renegocie o que já paga"*): sem elas, EN/ES
   prometiam **reduzir** e o corpo só ensinava a **organizar**. E o inglês é
   **43%** das impressões. Escritas nos dois. Os três têm agora 8 secções.
   ⚠️ Fica aberto nesta página: a lista nomeia **sete** categorias nos 3 idiomas
   e a tabela logo abaixo tem **seis** linhas (falta "dívidas"), enquanto os
   títulos EN/ES prometem "7 categorias". Não acrescentada — exigiria inventar os
   valores das colunas.
5. **Os CTAs dizem "Usado por milhares de pessoas"** — decisão do Ed, não tocado.
6. **28 descrições usam bloco YAML `>-`** — 25 antigas + 3 convertidas hoje pelo
   robô das capas.
7. **O ponto cego dos 80 caracteres** no `slugifyTheme`.

8. 🔴 **A página Sobre mostra dois e-mails diferentes:** `finmoovi@gmail.com` em
   português e `contato@finmoovi.com` em inglês e espanhol. **Decisão do Ed.**
9. **As páginas soltas não são varridas por robô nenhum.** Os robôs de conteúdo
   olham `posts` e `glossario`; as 22 páginas em `src/pages` ficam de fora — e é
   lá que estava a 2ª maior oportunidade e o código vazado.
