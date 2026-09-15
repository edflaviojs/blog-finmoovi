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
