# Oferecer os embeds aos portais de finanças

> **Estado em 22/09/2026: 7 portais abordados. A quinta rodada mediu as duas
> portas que faltavam — uma dá follow e tem e-mail que PEDE pauta; a outra não
> põe link externo nenhum e sai da lista.**
> Escrito em 14/09/2026, no dia em que os embeds foram construídos, e atualizado
> em 15/09 com a segunda rodada e em 22/09 com a quinta.
> 🔴 **O número que manda neste documento: 6 e-mails enviados, ZERO respostas**
> (confirmado pelo Ed em 22/09). Ler *"O NÚMERO MAIS IMPORTANTE DESTE DOCUMENTO"*
> antes de escrever o próximo e-mail — **não repetir e-mail, e não aumentar o volume.**
>
> 🔴 **Ler também "A QUINTA RODADA" (22/09)** — o perfil do `clickpetroleoegas`
> MUDOU e a calculadora que o plano mandava oferecer já não encaixa.
> **O estado real de cada portal está na tabela "Onde cada portal está", mais abaixo.
> Ler ANTES de abordar qualquer um — cinco deles não têm porta de entrada.**
>
> 🔴 **Ler antes de tudo a secção "A SEGUNDA RODADA DESMENTE O EMBED" (15/09).**
> O Toro — o prémio de 238 links — **não embute calculadora nenhuma**. Cita com
> link normal no texto. O mecanismo que este documento inteiro assume não é o
> mecanismo que produziu os 238 links.

---

## Por que este passo existe

O blog tem 402 posts e recebeu **1 clique em 30 dias**. A causa não é o conteúdo,
nem a velocidade, nem penalização — é que **ninguém aponta para o blog**. De 112
backlinks do domínio, só 4 contam, e o blog tem **zero**.

Investigando por que o Mobills tem **238 links de um único portal** (Toro
Investimentos), a resposta apareceu: ele mantém **calculadoras embutíveis**. Quando
um portal escreve sobre 13º salário, cola a calculadora do Mobills no artigo em vez
de programar uma. O portal ganha a ferramenta de graça; o Mobills ganha o link.

Referência: `obinvest.org` está em 4º lugar numa busca de 90 mil por mês **com 3
backlinks** e uma página de 20 palavras. Três links bem colocados chegam.

---

## 🔴 A verdade que decide tudo

**Link dentro de um iframe NÃO conta para o Google.** O conteúdo do iframe pertence
a `blog.finmoovi.com`, não à página do portal. Um portal que cole só o iframe manda
visitantes e **zero link**.

O link nasce da **linha de crédito fora do iframe**, no HTML do portal. Por isso o
trecho que se dá a copiar tem duas partes — e a segunda é a que importa:

```html
<iframe src="https://blog.finmoovi.com/ferramentas/<slug>/embed/"
        width="100%" height="760" loading="lazy" ...></iframe>

<p>Calculadora de Juros Compostos por
   <a href="https://blog.finmoovi.com/ferramentas/calculadora-juros-compostos/">FinMoovi</a></p>
```

**Se o portal remover a segunda linha, o trabalho não produziu backlink nenhum.**
É o item a conferir depois de cada publicação.

---

## O que já está pronto (medido no ar em 14/09/2026)

**11 calculadoras, 11 embeds.** Cada uma tem:

- página completa em `/ferramentas/<slug>/` — indexada, é a que deve ranquear
- versão embutível em `/ferramentas/<slug>/embed/` — `noindex`, fora do sitemap
- caixa **"Quer esta calculadora no seu site?"** no pé da página completa, com o
  código pronto e botão de copiar (componente `CodigoEmbed.astro`)

| Slug | O que tem de diferente |
|---|---|
| `calculadora-juros-compostos` | **ponto de virada**: o mês em que os juros passam o aporte |
| `calculadora-financiamento` | o mês em que a parcela do **SAC cruza a do Price** |
| `simulador-amortizacao` | **reduzir prazo × reduzir parcela**, a diferença em reais |
| `calculadora-aposentadoria` | o mês em que o patrimônio rende mais que o aporte |
| `calculadora-reserva` | *"hoje você aguenta X meses sem receber nada"* |
| `simulador-investimento` | **o preço da pressa**: 3 anos a mais derrubam o aporte em % |
| `calculadora-ir-investimentos` | **o dia em que a alíquota cai** (22,5 → 20 → 17,5 → 15) |
| `calculadora-desconto` | **desconto sobre desconto não soma**: 30%+20% = 44% |
| `rachar-conta` | separa a bebida de quem bebeu |
| `calculadora-orcamento` | diagnostica se você passou dos 50% |
| `conversor-moedas` | variação do dia de cada moeda |

**Funcionam em fundo claro e escuro.** Isto quase matou a estratégia: quase todo
portal de finanças é branco, e a versão só-escura apareceria como uma caixa preta
no meio do artigo deles.

---

## Os alvos

Dados vindos do Semrush em 07/09/2026 (Backlink Gap contra o Mobills). **Não são
medição nossa — reconferir antes de usar em argumento.**

| Portal | Autoridade | Links que dá ao Mobills | Melhor calculadora para oferecer |
|---|---|---|---|
| toroinvestimentos.com.br | 44 | **238** | juros compostos, IR sobre investimentos |
| acionista.com.br | 37 | 45 | IR sobre investimentos, aposentadoria |
| bmcnews.com.br | 32 | 20 | juros compostos, simulador |
| financeone.com.br | 30 | 11 | financiamento, amortização |
| creditas.com | 52 | 5 | **amortização** (é o negócio deles: crédito com garantia) |
| suno.com.br | 47 | 2 | IR sobre investimentos, aposentadoria |
| guiadoinvestidor.com.br | 43 | 2 | simulador, juros compostos |
| genialinvestimentos.com.br | 53 | 2 | aposentadoria, IR |
| ecommercebrasil.com.br | 45 | aceita artigo de convidado | desconto, orçamento |

**A melhor porta de entrada é a amortização.** Nenhum dos concorrentes mostra a
comparação prazo × parcela, e é o assunto de artigo que esses portais publicam
todo mês.

---

## Como abordar

**O que NÃO fazer:** pedir link. *"Você me dá um backlink?"* não recebe resposta.

**O que fazer:** oferecer a ferramenta. A conversa muda de favor para troca.

### Modelo de e-mail (ajustar por portal)

> **Assunto:** Calculadora de amortização pronta para o artigo de vocês (uso livre)
>
> Olá, [nome],
>
> Vi o artigo de vocês sobre [tema concreto, com link]. Fizemos uma calculadora que
> responde exatamente a dúvida que aparece nos comentários: **vale mais a pena
> amortizar reduzindo o prazo ou a parcela?** Ela mostra a diferença em reais e o
> mês em que a parcela do SAC cruza a do Price.
>
> Está aqui: https://blog.finmoovi.com/ferramentas/simulador-amortizacao/
>
> Se quiserem usar no artigo, é só copiar o trecho que está no fim da página. É
> grátis, sem cadastro, funciona em fundo claro ou escuro, e não pede nada em troca
> além de manter a linha de crédito que vem junto.
>
> Qualquer ajuste (altura, cor, tirar alguma parte), me diga que eu faço.
>
> Ed Flávio — FinMoovi

**Por que funciona:** o portal ganha uma ferramenta que levaria uma semana para
programar, e o leitor dele fica mais tempo na página.

### Ordem sugerida

1. **financeone.com.br** e **bmcnews.com.br** — autoridade menor, mais fáceis de
   conseguir o primeiro sim. Serve para aprender o que eles perguntam.
2. **creditas.com** — a amortização casa com o produto deles.
3. **toroinvestimentos.com.br** — o prêmio grande; ir depois de ter 1 ou 2 casos.

> Esta ordem é de antes da primeira rodada. O que aconteceu de verdade está abaixo —
> a Creditas saiu da lista e o `acionista` entrou no lugar dela.

---

## Onde cada portal está (atualizado 15/09/2026)

Tudo aqui foi **medido**, não suposto. O que não deu para medir está dito como tal.

| Portal | Estado | Por onde |
|---|---|---|
| financeone.com.br | 🔴 **PRAZO VENCIDO, sem resposta** (22/09) → LinkedIn da pessoa | `contato@financeone.com.br`, a/c **Tamires Silva** |
| bmcnews.com.br | 🔴 **PRAZO VENCIDO, sem resposta** (22/09) → LinkedIn da pessoa | `contato@bmcnews.com.br`, a/c **Renata Nunes** |
| acionista.com.br | 💰 **RESPONDEU: é PAGO, R$ 390/artigo.** Não pagar | resposta curta enviada a perguntar se articulista é outro caminho |
| **toroinvestimentos.com.br** | ❌ **MORTO — canal de e-mail desativado pelo Santander** | só WhatsApp (11) 4000-1580 |
| **ecommercebrasil.com.br** | 🔴 **PRAZO VENCIDO 22/09, sem resposta** → Instagram `@ecommerce_br` | `contato@ecommercebrasil.com.br` |
| **bemparana.com.br** | 🔴 **sem resposta** (7 dias) — **jornal, dá link follow** | `economia@bemparana.com.br` |
| **jornaldebrasilia.com.br** | 🔴 **sem resposta** (7 dias) — **jornal, dá link follow** | **Lindauro Gomes**, `lindauro.gomes@grupojbr.com` |
| **meliuz.com.br** | 🔴 **sem resposta** (7 dias) — blog dá link follow, tema perfeito | `marketing@meliuz.com.br` (existe; `conteudo@` e `blog@` não) |
| **clickpetroleoegas.com.br** | ✅ **FOLLOW CONFIRMADO 22/09** — e-mail escrito e entregue ao Ed | `informe@…` (pauta) + `brunotelesredator@gmail.com` |
| **gazetabrasilia.com.br** | 🔴 **SAIU DA LISTA 22/09** — não põe link externo nenhum | ver "A quinta rodada" |
| suno.com.br | 🔴 **DESCARTADO** — tem 11 calculadoras próprias | ver abaixo |
| genialinvestimentos.com.br | 🔴 **DESCARTADO** — é corretora, não portal | ver abaixo |
| guiadoinvestidor.com.br | 🔴 SEM PORTA — não insistir | ver abaixo |
| creditas.com | 🔴 SEM PORTA — descartado | ver abaixo |

**Prazo dos três primeiros: até 19/09.** Sem resposta, a segunda tentativa vai pelo
LinkedIn das pessoas — **Tamires Silva** está em `financeone.com.br/time-financeone`;
a **Renata Nunes** assina o artigo do bmcnews.

---

## 🔴 A SEGUNDA RODADA DESMENTE O EMBED (15/09/2026)

**O Toro não embute calculadora nenhuma. Cita, com link normal no texto.**

Lido no artigo `blog.toroinvestimentos.com.br/educacao-financeira/corrigir-valor-pela-inflacao/`
(assinado *"Equipe Toro"*, atualizado 08/09/2025), com estas palavras:

> *"A principal e melhor delas é a **Calculadora de correção pelo IPCA da Mobills**"*

É um **link de saída dentro do texto**, acompanhado de uma fotografia do ecrã da
ferramenta. **Não é iframe.** No mesmo artigo eles mandam o leitor também para o
IBGE e para a Calculadora do Cidadão do Banco Central.

**O que isto significa, e é desconfortável:** este documento inteiro foi construído
em cima do iframe, e o iframe é exatamente a forma que **não** dá backlink — daí a
ginástica da linha de crédito por fora. **O mecanismo que produziu os 238 links do
Mobills é mais simples: ser citado como "a melhor" num artigo de listagem.** Esse
link conta inteiro, sem truque nenhum.

Os embeds não foram trabalho perdido — servem aos portais pequenos, que preferem
manter o leitor na página. Mas **para o alvo nº1 o caminho é ser citado, não ser
embutido**, e isso muda o que se oferece: em vez de *"aqui está o código para colar"*,
é *"falta esta calculadora na vossa lista"*.

### A brecha no Toro é enorme — 8 das nossas 11 não existem lá

O blog do Toro tem **17 calculadoras** (secção `/calculadoras/`, contadas uma a uma):
álcool ou gasolina, consumo de combustível, correção pela inflação (IPCA/IGP-M),
correção pela Selic, correção pelo CDI, juros compostos, porcentagem, primeiro
milhão, rendimento da poupança, contador de dias, décimo terceiro, férias, rescisão,
ponto de equilíbrio, preço médio de ações, risco e retorno, tamanho de posição.

**Não têm nenhuma de:** amortização · financiamento · IR sobre investimentos ·
desconto · reserva de emergência · conversor de moedas · orçamento · rachar a conta.

São **8 das nossas 11**. Eles colecionam calculadoras e citam as de fora — inclusive
as do IBGE e do Banco Central.

⚠️ **Por confirmar:** não foi possível apurar se as 17 são construídas pelo Toro ou
embutidas de terceiros. A página não diz e o site devolve `403` a quase tudo o que
não seja a home.

### 🔴 O problema dos dois melhores alvos: nenhum publica e-mail

| | Toro | E-Commerce Brasil |
|---|---|---|
| e-mail publicado | **nenhum** | **nenhum** |
| autor dos artigos | *"Equipe Toro"* (genérico) | pessoas com nome |
| o que sobra | WhatsApp, SAC, ouvidoria | Instagram `@ecommerce_br`, LinkedIn |

No E-Commerce Brasil foram testados **24 endereços** (`/contato`, `/sobre`, `/anuncie`,
`/colunistas`, `/seja-um-colunista`, `/imprensa`, `/atendimento`, `/expediente`, o
site antigo `www2.…` e mais): todos `404` ou sem e-mail. Procurado também `mailto:` e
e-mail ofuscado da Cloudflare no HTML servido — **zero ocorrências**.

**Achar estas duas portas é o trabalho de maior retorno que existe agora.**

### O E-Commerce Brasil: o melhor encaixe de conteúdo encontrado até hoje

Artigo lido: *"Promoções e descontos: o que realmente atrai o consumidor?"*, de
**Pedro Henrique Sobral** (Gerente de Marketing na Tray), 21/04/2025. Dá **três
exemplos de preço e não calcula nenhum**:

| o que o artigo mostra | o que ele não diz |
|---|---|
| *"Preço normal: R$ 199,90 / Hoje: R$ 99,90"* | que são 50% |
| *"compre 2 e leve o 3º grátis"* | que são ~33% |
| *"relógio por R$ 799,00, antes R$ 1.499,00"* | que são 46,7% |

É exatamente o buraco da `calculadora-desconto`. O portal publica ~2.500 textos por
ano e tem 600-700 mil visitas/mês.

⚠️ **Risco não confirmado:** os colunistas parecem ser executivos de empresas do
setor, e o portal mantém uma lista longa de empresas *mantenedoras* que o patrocinam.
**Pode ser clube fechado ou pago.** Não foi verificado — não afirmar que é grátis.

### O padrão que apareceu: PORTAL tem porta, EMPRESA não tem

| tem porta de entrada | não tem |
|---|---|
| financeone, bmcnews, acionista (portais de conteúdo) | creditas, genial, suno (empresas) |

Empresa regulada publica SAC, ouvidoria e assessoria de imprensa terceirizada — canais
onde uma proposta editorial morre. **Antes de gastar tempo a mapear um alvo, perguntar
primeiro: isto é um portal que vive de conteúdo, ou uma empresa que tem um blog?**

### 🔴 suno.com.br — DESCARTADO: já tem 11 calculadoras próprias

Secção `/ferramentas/`, contadas: juros compostos, juros simples, aposentadoria,
investindo na aposentadoria, PGBL vs VGBL, património ideal, primeiro milhão,
objetivos financeiros, reserva de emergência, capacidade de endividamento, PIX vs
parcelar. **Portal que já construiu as suas não vai colocar a nossa.**

Única brecha: **não têm calculadora de IR sobre investimentos**. Não chega para
justificar a abordagem.

E-mail de imprensa, decifrado do ofuscador da Cloudflare no rodapé:
`imprensa@sunoresearch.com.br` — **registado, mas não recomendado**: assessoria de
imprensa de corretora não coloca ferramenta de terceiro.

### 🔴 genialinvestimentos.com.br — DESCARTADO: é corretora, e bloqueia robôs

O domínio existe (Akamai), mas a ligação **nunca completa** a partir da linha de
comando: `000` com 20s de espera, com cabeçalhos completos de navegador. Família do
`acionista.com.br` — **tudo o que se souber tem de vir de fotografia do Ed**.

Pelo que se apurou por fora: tem `/imprensa/` e `/ouvidoria/`, SAC, suporte em
Zendesk, e a **assessoria de imprensa é feita por agência terceirizada** (Máquina
Cohn & Wolfe). É o caso da Creditas outra vez: empresa, não portal.

---

### 🔴 guiadoinvestidor.com.br — o canal de contato está MORTO

A página `/contato/` só oferece o link *"Fill out my online form"*, que aponta para
`form.gdi.com.vc`. **O domínio `gdi.com.vc` inteiro não existe** — o DNS do Google
responde `Non-existent domain` para ele e para o subdomínio. Não é o formulário que
caiu: é o domínio que a empresa deixou morrer.

A página `/advertise/` não publica e-mail. A home e o rodapé também não. Sobra só o
LinkedIn da empresa (`linkedin.com/company/guiadoinvestidor`). **Não vale o esforço:**
é o alvo de menor retorno da lista (2 links ao Mobills).

### 🔴 creditas.com — não é portal, é empresa

`/contato`, `/imprensa` e `/sobre-nos` dão **404**. Os únicos canais publicados são SAC,
ouvidoria e chat — atendimento a cliente, onde uma proposta destas morre. O blog
*Exponencial* existe para levar o leitor ao simulador de empréstimo da própria Creditas.

Detalhe que confirma: o artigo `/exponencial/sac-ou-price/` (Cibele Cardoso, 10/04/2026)
manda o leitor para o **simulador da Caixa**. Eles preferem mandar para um concorrente a
manter o leitor na página.

Só restaria o LinkedIn da redatora. Fica para muito depois, se algum dia.

---

## O que a primeira rodada ensinou

**1. A calculadora certa descobre-se LENDO o portal, não na tabela de alvos.**
O plano mandava oferecer *juros compostos* ao bmcnews. Lendo a editoria de investimentos
deles — IR de fundos, dividendos, Selic, CDB — a de **IR sobre investimentos** encaixava
muito melhor. E o artigo da Renata Nunes sobre CDB diz, com estas palavras, que a
comparação *"deve considerar também o rendimento líquido após Imposto de Renda e, em
aplicações muito curtas, eventual incidência de IOF"* — e não faz essa conta em lugar
nenhum. A calculadora faz, e ainda avisa em vermelho quando o IOF entra.

**O e-mail que funciona não diz "usem a minha ferramenta". Diz "faltava esta conta no
artigo de vocês, aqui está pronta."** Para isso é preciso ler o artigo.

**2. Existe um caminho melhor que o embed: virar articulista.**
O `acionista` não quer calculadora embutida — tem uma página `/publique-no-portal/` que
convida: *"Se você entende sobre investimentos, venha fazer parte do time de articulistas
do Portal."* **É de graça, não é publieditorial** (conferido: não há preço nem tabela na
página). Artigo assinado, com o link no texto ou na assinatura do autor, vale mais que uma
linha de crédito debaixo de um iframe — e é provavelmente assim que o Mobills tirou 45
links de lá. **Procurar esta página nos outros portais antes de propor embed.**

**3. Portais desses já têm seção de "Ferramentas".** O rodapé do guiadoinvestidor lista
Mercado ao Vivo, Agenda de Dividendos, Conversor de Moedas. O financeone tem calculadora
de hora extra, de rescisão e conversor de moedas no menu principal. **Eles já acreditam em
ferramenta — o argumento não precisa de ser vendido, só encaixado.**

**4. Dois argumentos que valem em todo e-mail, e foram medidos:**
- o embed **não tem anúncio nem rastreador nenhum** e não pede o e-mail do leitor
  (conferido no HTML servido: zero ocorrências de adsense, analytics, gtag, pixel)
- a calculadora de IR teve as alíquotas **lidas na Lei 11.033/2004 no planalto.gov.br**, e
  o link para a lei fica dentro da página. Para portal que se leva a sério como jornalismo
  — o bmcnews tem página de "Princípios editoriais" — isto é o que separa um candidato
  sério de alguém à cata de link.

**5. ⚠️ O acionista.com.br bloqueia robôs.** Responde `403` com a tela *"Just a moment…"*
da Cloudflare a qualquer pedido de linha de comando, com ou sem `www`, mesmo com
cabeçalhos completos de navegador. **Tudo o que se souber deste portal tem de vir de
fotografia do Ed.**

---

## Como medir

**Não medir só o blog.** Os cadastros de diretório apontam para `finmoovi.com` e o
blog conta separado nas ferramentas:

- `https://www.semrush.com/analytics/backlinks/overview/?q=blog.finmoovi.com&searchType=domain`
- `https://www.semrush.com/analytics/backlinks/overview/?q=finmoovi.com&searchType=domain`

Ponto de partida em 07/09/2026: o blog tinha **4** backlinks *follow* e **0**
domínios a apontar.

**Prazo honesto:** 1 a 7 dias para o portal publicar, 2 a 4 semanas para o Google
encontrar, 2 a 3 meses para as posições mexerem. Link não vira visita em duas
semanas.

**Conferir em cada publicação:** abrir o artigo do portal e procurar a âncora
`FinMoovi` **fora** do iframe. Se só houver o iframe, pedir a linha de volta — sem
ela não há backlink.

---

## 🔓 A TERCEIRA RODADA — AS DUAS PORTAS (15/09/2026, à noite)

Os dois melhores alvos eram os dois sem e-mail. Um foi resolvido; o outro foi
**explicado**, e a explicação vale mais do que um endereço.

### ✅ E-Commerce Brasil: a porta estava no SITE VELHO

**`contato@ecommercebrasil.com.br`** — publicado como `mailto:` em
`www2.ecommercebrasil.com.br/sobre/`.

Por que os 24 endereços de 15/09 não a acharam: **foram todos testados no site
novo**. Medido agora:

| URL | resposta |
|---|---|
| `www.ecommercebrasil.com.br/sobre/` | **404** |
| `www2.ecommercebrasil.com.br/sobre/` | **200, com `mailto:contato@ecommercebrasil.com.br`** |

O mesmo endereço aparece no rodapé de todas as páginas do `www2`, inclusive nas
que dão 404. **A lição: um portal com site antigo no ar tem duas superfícies de
contato, e a velha costuma ser a que publica e-mail.**

> **E-mail enviado em 15/09**, a/c Redação, com as três contas do artigo do
> Pedro Henrique Sobral já feitas dentro do corpo (50% · 33% · 46,7%) e o
> brinde de pauta *"30% + 20% não é 50%, é 44%"*. Ficheiro:
> `EMAIL-ECOMMERCEBRASIL-REDACAO.txt`.

### 🔴 O teste de SMTP que NÃO prova nada neste domínio — e quase me enganou

A porta 25 sai desta máquina (confirmado contra `aspmx.l.google.com`). Testei
seis destinatários em `ecommercebrasil.com.br`, que usa Google Workspace:

```
RCPT TO:<contato@…>            -> 250 OK
RCPT TO:<redacao@…>            -> 250 OK
RCPT TO:<pauta@…>              -> 250 OK
RCPT TO:<imprensa@…>           -> 250 OK
RCPT TO:<conteudo@…>           -> 250 OK
RCPT TO:<zzz-nao-existe-9182@…> -> 250 OK   ← INVENTADO POR MIM
```

**O domínio aceita tudo (catch-all).** Sem o endereço de controlo eu teria
afirmado ao Ed que `redacao@` existe — e seria mentira. **Regra: teste de
existência de caixa de correio só vale com um endereço FALSO na mesma corrida.**
Família de [[campo-com-lista-de-opcoes-nao-decide]]: a ferramenta responde
"sim" a tudo e a resposta parece informação.

### 🔴 O Toro é do SANTANDER — e é por isso que não tem porta

Três medições, e as três dizem a mesma coisa:

1. O MX de `toroinvestimentos.com.br` aponta para
   **`mx1.santandergroup.c3s2.iphmx.com`** (filtro corporativo Cisco IronPort).
2. `ajuda.toroinvestimentos.com.br` responde **301 para
   `ajuda.santandercorretora.com.br`** — a migração de marca está a acontecer agora.
3. O Santander concluiu a compra de **100% do Toro em dezembro de 2024**; a
   corretora passou a chamar-se **Santander Corretora**.

Os únicos e-mails publicados são `ajuda@` (SAC) e `ouvidoria@` (reclamações).
**Não existe imprensa, redação, pauta nem parcerias.** O blog não tem página de
contato nenhuma (lido o `page-sitemap.xml`: só `/`, `/all/`, `/nps-geral/`,
`/nps-alice/`, `/indica-rf/`), e o autor é mesmo genérico — o HTML do artigo traz
`<meta name="author" content="Equipe Toro">`. **Não há pessoa para procurar.**

Isto confirma a regra da segunda rodada com a prova mais dura que apareceu:
*portal tem porta, empresa não tem* — e o Toro deixou de ser corretora
independente para ser **um banco**.

### ✅ MAS a oportunidade continua VIVA — e isto é o achado do dia

O artigo do Toro que cita a Mobills tem
`"dateModified":"2025-09-08"`. **O Santander fechou a compra em dezembro de
2024.** Ou seja: **nove meses depois de virar banco, o Toro continuou a citar um
app de finanças pessoais de fora.** Ser do Santander não fecha a porta — só a
esconde.

**E o formato de e-mail deles é `nome.sobrenome@toroinvestimentos.com.br`.**
Consequência prática: **basta UM nome** e temos o endereço exato, sem precisar de
e-mail publicado nenhum.

> **Enviado em 15/09 para `ajuda@`: um e-mail de três linhas que não vende nada**,
> só pergunta *"quem cuida do blog de vocês?"*. Ficheiro:
> `EMAIL-TORO-PERGUNTA-CURTA.txt`. O SAC não decide, mas sabe encaminhar; uma
> proposta longa seria fechada como "não é atendimento".
> ⚠️ **Isto é julgamento, não medição** — não há como provar como o SAC se comporta.
>
> O `ouvidoria@` ficou **fora**: é canal legal de reclamação com prazo obrigatório
> de resposta. Usá-lo para pedir link é abusar do canal.

### 🔒 O LinkedIn não é opção por linha de comando

`br.linkedin.com` devolve **HTTP 999** a qualquer pedido automático. Nomes só
saem de lá por busca externa (que já foi tentada, sem resultado para o Toro) ou
por fotografia do Ed. **Família do `acionista.com.br`.**

---

## ✅ A PÁGINA "SOBRE" ENTROU (15/09/2026)

O buraco que sobrava do webcatalog foi fechado. Está no repo do app,
commit `0cba080`, em **três idiomas**: `/sobre` · `/about` · `/acerca`.

**Por que isto pertence a este documento e não é assunto à parte:** a receita de
quatro passos acaba sempre com um editor a abrir o `finmoovi.com` antes de
decidir publicar a calculadora. Até hoje ele encontrava um site que não dizia
quem o faz.

O que a página diz, e tudo é verificável:

- a história real: a planilha de Excel, Administração de Empresas + pós em
  Gestão Financeira
- **maio/2025 → agosto/2026: quinze meses de uso diário antes de cobrar de
  alguém.** É o argumento mais forte da página
- *"não existe empresa, não existe equipa, quem responde sou eu"* — há atividade
  aberta em Portugal
- as promessas sobre dados são **cópia fiel da Política de Privacidade**. Foi um
  número inventado que saiu do site no mesmo dia da recusa; inventar noutra
  página seria o pior dos mundos
- o lugar da foto mostra as iniciais **EF**, não um rosto de banco de imagens

⚠️ **Detalhe técnico que quase partiu o build:** `/en/sobre` era o caminho óbvio
e é **proibido** — criaria `dist/en/`, que compete com `dist/en.html` e faria o
Cloudflare Pages responder 308 em `/en`. O próprio `prerender.mjs` tem uma trava
que aborta o build nesse caso. Daí três caminhos planos.

**Falta ainda:** reenviar ao `webcatalog.io` — e desta vez com **`finmoovi.com`**,
não `app.finmoovi.com`.

---

## 🔬 A QUARTA RODADA — O QUE FOI MEDIDO SOBRE ONDE O LINK VALE (15/09, noite)

Dois testes mudaram a prioridade de tudo. **Os dois desmentem coisas escritas neste
documento e na memória.**

### ❌ DIRETÓRIO DE APP É `nofollow` — a anotação de 07/09 estava errada

A memória [[como-o-mobills-tem-238-links]] dizia dos diretórios: *"São links follow,
grátis e legítimos"*. **Isso nunca tinha sido medido.** Foi agora, no SaaSHub, nas
fichas do Notion, do Slack e do **Mobills**:

```
href="https://www.notion.com/"   rel="nofollow"
href="https://slack.com/"        rel="nofollow"
→ 50+ links de saída por página, TODOS nofollow
```

**Valor de SEO: zero.** É o normal do setor — diretório não quer verter força para
fora. **Consequência:** os 4 cadastros já feitos (AlternativeTo, mate.tools,
sitelike.org, webcatalog) valem muito menos do que se supunha. Não são perda total
(visibilidade, tráfego de referência), mas **não resolvem o problema do link**.

⚠️ Por medir, um a um, antes de gastar tempo em cadastro novo: AlternativeTo
(bloqueia robô, `403`), Softpedia, IndieHackers, Findstack.

### ✅ JORNAL DÁ LINK QUE CONTA

Mesmo teste, em matéria real de cada um:

| site | link externo |
|---|---|
| bemparana.com.br | **sem `nofollow`** → conta |
| jornaldebrasilia.com.br | **sem `nofollow`** → conta |

**É o oposto do diretório.** Um link no texto de um jornal vale mais que trinta
cadastros. Isto promove a veia dos jornais de plano B a **plano principal**.

### 🚪 A PORTA DO JORNAL: o EXPEDIENTE, com e-mail POR EDITORIA

O `bemparana.com.br/expediente/` publica:

```
economia@ · politica@ · cidades@ · cultura@ · esportes@ · opiniao@ · comercial@
```

**Escrever para `economia@` é escrever a quem decide a pauta de economia.** Nenhum
banco e nenhuma corretora tem isto; jornal tem, porque é a prática da profissão.
O `jornaldebrasilia.com.br/expediente/` vai mais longe e publica **pessoas com nome**:
**Lindauro Gomes** (Editor-Chefe da redação ONLINE — é a online que dá link),
Tamires Rodrigues (Editora), Ricardo Nobre (impresso, não serve).

### ⚠️ MAS A VEIA NÃO ESCALA COMO EU DISSE

Varri **20 jornais brasileiros** adivinhando domínios (`/expediente`, `/contato`,
`/fale-conosco`…). **Achei 1** — `redacao@gazetadopovo.com.br`. Os grandes (Estado de
Minas, O Povo, Correio Braziliense, A Tarde, Folha PE) **não entregam o expediente a
robô**: são aplicações JavaScript ou bloqueiam.

Os dois que funcionaram funcionaram porque **o Semrush deu o nome** e porque são
WordPress simples. **Adivinhar domínio não é método.**

### 📊 O SALDO DE 35 DOMÍNIOS TESTADOS EM 15/09

| resultado | quem |
|---|---|
| ✅ porta editorial | bemparana (`economia@`), jornaldebrasilia (Lindauro), ecommercebrasil (`contato@` no site VELHO), gazetadopovo (`redacao@`) |
| ✅ porta aberta, tema distante | **clickpetroleoegas.com.br** — AS 49, **11 M visitas/mês**, e a página `/equipe` diz *"Sugestão de pauta? Manda no `brunotelesredator@gmail.com`"*. É portal de petróleo/gás/vagas. ⚠️ **não foi possível provar que dão link follow** |
| 🟡 porta minúscula | gazetabrasilia.com.br (`jadson.barbosa@gmail.com`, uma pessoa só, **976 visitas/mês**) |
| ❌ sem porta para robô | atarde, tnh1, digitei, elaele, zigg, workana, doutormultas, enotas, meupositivo |
| ❌ agência de imprensa | **alura.com.br** → `alura@agenciamaquina.com` (a MESMA agência do Genial). Proposta editorial morre em agência |
| ❌ só SAC/assessoria | broadcast.com.br (Estadão), comunique-se (só `cobranca@`, `compras@`, `faturamento@` da Knewin) |
| ❌ empresa, não portal | rodobens, sofisadireto, pagbank, alelo, remessaonline, infinitepay, embracon, meliuz, mitrade |

**Taxa real: cerca de 1 porta editorial em cada 4 domínios testados.**

### 🔎 O Backlink Gap chegou ao fim do que dá

990 candidatos, 100 vistos (ordenados por *Matches*, que é o sinal forte — os 890
restantes têm menos correspondências). **O filtro de categoria NÃO EXISTE** neste
plano: em *Advanced filters* só há `Country (by IP)` e `Zones (by TLD)`. O filtro de
país **foi aplicado e não limpou nada** — `amazonaws.com`, `beehiiv.com`, `vsw.jp` e
`aau.edu.et` continuaram na lista, porque IP de servidor não diz nacionalidade do site.

**A coluna do `blog.finmoovi.com` é ZERO nas 100 linhas.** Cem sites apontam para os
concorrentes e nenhum aponta para o blog. É o diagnóstico inteiro numa coluna só.

### 🎯 A META DE "CENTENAS" — a conta honesta

**Não dá para plantar centenas nesta qualidade, e não é preciso.** O que faz os
e-mails de 15/09 funcionarem é citar a matéria pelo nome e mostrar a conta que faltou;
isso custa ~15 minutos de leitura por e-mail. **Texto genérico multiplicado vira spam
e queima o domínio `finmoovi.com` para sempre.**

E o alvo não exige centenas: **`obinvest.org` está em 4º lugar numa busca de 90.500/mês
com TRÊS backlinks.** Ver [[blog-o-que-trava-sao-os-backlinks]].

**O ritmo que fecha a meta:** 1 a 2 e-mails bem pesquisados por dia → 20 a 30 em três
semanas → 2 a 5 links, a 5–15% de resposta. **O gargalo deixou de ser descobrir alvos;
passou a ser o ritmo de escrita.**

---

## 📨 AS DUAS PRIMEIRAS RESPOSTAS (15/09, mesmo dia) — e as duas ensinam

**Boa notícia de fundo:** respostas em menos de 24h significam que os e-mails **chegam e
são lidos** — não estão a cair em spam. O conteúdo das duas, porém, fecha portas.

### ❌ TORO — canal de e-mail DESATIVADO. O alvo nº1 está encerrado.

Resposta automática, assunto *"Canal Desativado: Saiba como falar com a Santander Corretora"*:

> *"Informamos que o e-mail `ajuda@toroinvestimentos.com.br` e `ajuda@santandercorretora.com.br`
> foi descontinuado e não está mais disponível."*

Sobra **só WhatsApp (11) 4000-1580**. Confirma, da boca deles, o que os três testes já
diziam: o Toro virou Santander Corretora e **não existe canal de e-mail nenhum**.
**Não voltar a tentar por e-mail.** Se algum dia houver caminho, é pelo LinkedIn de
quem escreve — e o LinkedIn devolve HTTP 999 a robô, logo tem de ser o Ed.

### 💰 ACIONISTA — é PAGO. E a anotação de 14/09 estava errada.

Este documento e [[portais-primeira-rodada-14-09]] afirmavam: *"É de graça, não é
publieditorial (conferido: sem preço na página)"*. A resposta real é uma **tabela de preços**:

| | |
|---|---|
| 1 artigo, categoria Financeiros | **R$ 390,00** |
| pacote de 3 artigos | **R$ 1.000,00** |
| links dofollow | **máximo 2** |
| etiqueta obrigatória no post | **"Post Patrocinado"** |
| pagamento | **antecipado**, antes de publicar |
| *"Links em nossos artigos"* | **Não** — não acrescentam link a artigo já publicado |
| restrição | *"somente empresas licenciadas no Brasil"* para Financeiros |

🔴 **A LIÇÃO: "não havia preço na página" e "é grátis" são conclusões DIFERENTES.**
Ausência de preço é ausência de informação, não prova de gratuidade. Família de
[[teste-que-diz-sim-a-tudo]] — a fonte calou-se e eu li silêncio como resposta.

🔴 **RECOMENDADO AO ED: NÃO PAGAR.** Eles vendem **link dofollow dentro de post marcado
como patrocinado** — a definição de *esquema de links* do Google. Hoje o blog tem **zero
ações manuais** nas duas propriedades (medido em 07/09, ver
[[blog-o-que-trava-sao-os-backlinks]]); comprar link dofollow é a via mais rápida de
perder isso. E a restrição *"empresas licenciadas no Brasil"* provavelmente exclui o Ed,
que não tem empresa no Brasil.

⚠️ **O QUE ISTO REFRAMA:** o Mobills tem **45 links do acionista**. Como o portal VENDE
links, é bem possível que os tenha **comprado**. Não há prova — mas parte do que se
estava a tentar copiar pode não ter sido conquistado. **Reforça a decisão da quarta
rodada:** o caminho é jornal que dá link de graça no texto, não portal que vende
publipost.

**Enviada uma resposta curta** (`RESPOSTA-ACIONISTA.txt`) a perguntar se a candidatura a
**articulista** é caminho diferente do publipost — a página `/publique-no-portal/` convida
articulistas com estas palavras: *"venha fazer parte do time de articulistas do Portal"*.
Sem negociar preço: negociar seria aceitar a conversa comercial. Com saída honrosa
oferecida, porque **um "não" rápido vale mais que um talvez que nunca chega**.

---

## O que fazer a seguir (a partir de 16/09/2026)

1. ✅ **FEITO — as duas portas.** O E-Commerce Brasil tem e-mail e já o recebeu; o Toro
   recebeu a pergunta de encaminhamento. Ver "A terceira rodada" acima.
   **O que fica a seguir nos dois:**
   - **E-Commerce Brasil:** se `contato@` não responder até **22/09**, sobra o Instagram
     `@ecommerce_br` (mensagem direta) e o formulário *Trabalhe Conosco*.
     ⚠️ Continua **por confirmar** se os colunistas são clube fechado/pago.
   - **Toro:** o que se espera do SAC é **um nome**, não um sim. Com um nome, o endereço
     monta-se sozinho: `nome.sobrenome@toroinvestimentos.com.br`. **Aí sim** vai a
     proposta — e ela não é o código do embed, é *"faltam 8 calculadoras na vossa lista"*.
2. **Esperar resposta dos três de 14/09 até 19/09.** Não mandar segundo e-mail antes disso —
   queima o contato. A partir de 19/09, LinkedIn da Tamires Silva e da Renata Nunes.
   ⚠️ **O LinkedIn devolve HTTP 999 a robôs** — esse passo tem de ser do Ed.
3. **Se o acionista responder pedindo o artigo, escrever o artigo.** As duas pautas
   propostas: *o dia em que o imposto cai* (a alíquota de 22,5% a 15%) e *o ponto de
   virada dos juros compostos*. Em ambas a calculadora entra dentro do texto.
4. **Quando a porta do Toro aparecer, o que se oferece MUDOU.** Não é o código do embed.
   É: *"a vossa lista de calculadoras não tem amortização / IR sobre investimentos /
   desconto — a nossa faz X, e o artigo de vocês sobre Y ficaria completo com ela."*
   Antes de escrever, ler um artigo deles onde falte essa conta, como se fez sempre.
5. ✅ **FEITO — o Backlink Gap contra `investidor10` + `idinheiro` + `organizze`.** Deu a
   veia dos jornais e está esgotado; ver "A quarta rodada". **Não repetir o Gap** — o
   gargalo agora é escrever, não descobrir.

6. **AS DUAS PORTAS POR USAR, e as duas estão prontas para escrever:**
   - **clickpetroleoegas.com.br** → `brunotelesredator@gmail.com`. Eles PEDEM sugestão de
     pauta, por escrito. 11 M visitas/mês. O encaixe honesto: público de offshore, setor
     de demissão cíclica → **calculadora de reserva de emergência** (*"hoje você aguenta X
     meses sem receber nada"*). ⚠️ Tema distante de finanças pessoais e **follow não
     provado** — medir antes de investir tempo.
   - **gazetabrasilia.com.br** → `jadson.barbosa@gmail.com`. Uma pessoa só toca o site:
     fácil dizer sim, mas 976 visitas/mês. Link fraco, esforço baixo.

7. **A regra nova antes de qualquer cadastro ou abordagem: MEDIR SE O SITE DÁ FOLLOW.**
   Abrir uma página real e procurar `rel="nofollow"` nos links de saída. Foi isto que
   desmascarou o SaaSHub e confirmou os jornais. Custa 30 segundos e evita semanas.

**A receita que funcionou, em quatro passos:**
achar a porta → ler um artigo real deles → ver o que falta nesse artigo →
oferecer a calculadora que tapa exatamente esse buraco, citando o artigo pelo nome.

**O que a segunda rodada acrescenta à receita:** antes do passo 1, perguntar
*"isto é um portal de conteúdo ou uma empresa com blog?"* — empresa não tem porta.
E no passo 4, verificar **se o portal embute ou cita**: o Toro cita, e a quem cita
oferece-se um argumento diferente do código de embed.

---

## 🔬 A QUINTA RODADA — as duas portas por usar, medidas (22/09/2026)

O ponto 6 de "O que fazer a seguir" mandava escrever a estas duas e avisava que
o *follow* não estava provado em nenhuma. **Foi medido. Uma passou, a outra caiu.**

### ✅ clickpetroleoegas.com.br DÁ FOLLOW — medido em 6 artigos

Links de saída para terceiros, todos **sem `rel="nofollow"`**:

```
eb.mil.br/web/noticias/…            (sem rel)
carnewschina.com/2026/09/21/…       rel="noopener"      ← noopener não é nofollow
gov.br/anp/…/relatorio_….pdf        (sem rel)
bravaenergia.com/noticias/…         (sem rel)
roge.energy/programacao             (sem rel)
```

**Controle, e é o que dá valor à medição:** a página inteira tem **3** ocorrências
de `nofollow` e o mesmo comando encontrou as três — são o link interno de
`wp-login.php`. Logo o comando *sabe* achar `nofollow`; a ausência nos links de
saída é ausência real, não falha de medição. Aplicação de [[teste-que-diz-sim-a-tudo]].

⚠️ **Detalhe revelador:** vários links externos deles trazem `?utm_source=chatgpt.com`.
Escrevem com apoio de IA e **colam as fontes com link**. É um portal que cita de
bom grado — exatamente o comportamento que se procura.

### 🔴 gazetabrasilia.com.br SAI DA LISTA — não linka para fora

**8 artigos abertos, ZERO links de saída para terceiros.** Não é questão de
`nofollow`: eles simplesmente não põem link externo. Portal que não linka não dá
backlink por mais simpático que seja o dono. Somado às 976 visitas/mês, **não vale
os 15 minutos de escrita.**

### 🔴 O PERFIL DO CPG MUDOU — e a calculadora do plano já não serve

O ponto 6 mandava oferecer a **reserva de emergência**, com o argumento
*"público de offshore, setor de demissão cíclica"*. **Lidas as 38 matérias mais
recentes (feed RSS): o portal já não é de petróleo e gás.** Publica notícia geral —
carro elétrico chinês, BYD, Xiaomi, JBS, obras, militar, histórias virais. A busca
interna deles por `demissoes`, `salario` e `reserva-de-emergencia` devolve **sempre
a mesma lista de recentes**, o que confirma que o assunto não existe lá.

**Família de [[regra-velha-a-correr-em-estrutura-nova]]:** o alvo mudou e o plano
não. Se o e-mail tivesse sido escrito como o ponto 6 mandava, chegaria a falar de
demissão a um portal que hoje escreve sobre SUV chinês.

### 🎯 O buraco REAL, e é recorrente: eles dão o valor em dólar e nunca convertem

Matéria medida: *"Petróleo cai pela 3ª sessão seguida … Brent fecha a US$ 103,87 e
WTI de novembro recua para US$ 96,08"*.

| | |
|---|---|
| ocorrências de `US$` na página | **85** |
| ocorrências da palavra *reais* | **0** |

E não é caso isolado no feed: *"Fabricante investe mais de US$ 4 bilhões"*,
*"Bilionário comprou madeireira por US$ 22 milhões"*, *"reduzir até £15 por mês na
conta"*. **O leitor brasileiro fica sempre sem a conta** — e o `conversor-moedas` é
exatamente isso.

**As contas foram feitas com cotação lida na AwesomeAPI em 22/09** (USD 5,1111 ·
GBP 6,83935), não escritas de cabeça: Brent → R$ 530,89 · WTI → R$ 491,08 ·
£15 → R$ 102,59. O conversor foi conferido no ar na mesma corrida: página **200**
(93.559 bytes), embed **200** (24.419 bytes), com uma URL falsa a dar **404** como
controle.

### 🚪 A porta: são DUAS, e as duas pedem pauta por escrito

| endereço | a frase deles |
|---|---|
| `informe@clickpetroleoegas.com.br` | */contato/*: *"Para sugestões de pauta, postar vagas de emprego ou publicidade, seguem os contatos logo abaixo"* |
| `brunotelesredator@gmail.com` | */equipe/*: *"Sugestão de pauta? Manda no brunotelesredator@gmail.com"* — Bruno Teles, **7.000+ artigos** na rede deles |

O e-mail foi para `informe@` **com cópia ao Bruno**: o primeiro é o canal oficial,
o segundo é quem escreve. Ficheiro: **`EMAIL-CLICKPETROLEO-22-09.txt`**.

> ✅ **ENVIADO PELO ED EM 22/09/2026.** É o **8º** contacto da campanha.

### 🔴 O defeito que saiu para fora com este e-mail

O `.txt` foi entregue **escrito sem acento nenhum** — *"Ola"*, *"cotacao"*,
*"nao"*, *"pagina"* — e o Ed copiou e enviou assim. **Num e-mail cujo argumento
inteiro é "eu sou sério, confira o que digo", a forma dizia o contrário do texto.**
Não é um deslize interno: saiu para um portal e não volta atrás. O ficheiro na área
de trabalho já foi reescrito com acentuação correta, para servir de modelo aos
próximos. **Regra nova: texto que sai do computador do Ed vai em português
correto; sem acento, só nome de ficheiro e comando.**

---

## 🔴 O NÚMERO MAIS IMPORTANTE DESTE DOCUMENTO: 6 e-mails, 0 respostas

**Confirmado pelo Ed em 22/09/2026: nenhum dos seis respondeu.** Todos os prazos
estão vencidos.

| enviado | a quem | prazo | resposta |
|---|---|---|---|
| 14/09 | financeone.com.br (`contato@`, a/c Tamires Silva) | 19/09 | **nenhuma** |
| 14/09 | bmcnews.com.br (`contato@`, a/c Renata Nunes) | 19/09 | **nenhuma** |
| 15/09 | ecommercebrasil.com.br (`contato@`, site velho) | 22/09 | **nenhuma** |
| 15/09 | bemparana.com.br (`economia@`) | — | **nenhuma** |
| 15/09 | jornaldebrasilia.com.br (Lindauro Gomes) | — | **nenhuma** |
| 15/09 | meliuz.com.br (`marketing@`) | — | **nenhuma** |

⚠️ **Só responderam os dois que fecharam a porta** (Toro, com resposta automática
de canal desativado; acionista, com tabela de preços) — e os dois responderam em
**menos de 24 horas**. **Portanto os e-mails chegam.** O silêncio dos seis não é
problema de entrega: é desinteresse, ou é não-lido.

### O que este zero desmente, e é a linha que estava escrita aqui

A quarta rodada calculava: *"1 a 2 e-mails por dia → 20 a 30 em três semanas →
**2 a 5 links**, a 5–15% de resposta"*. **A taxa real medida é 0 em 6.** Com seis
tentativas ainda não dá para dizer que a taxa verdadeira é zero — seis é amostra
pequena, e uma resposta na sétima já daria 14%. **Mas dá para dizer que a conta
otimista não se confirmou**, e planear em cima dela seria repetir o erro do
*"é de graça"* do acionista: [[teste-que-diz-sim-a-tudo]].

### O que muda a seguir

1. **Segundo contacto, não segundo e-mail.** Repetir o mesmo e-mail ao mesmo
   endereço não muda nada — se o primeiro não foi lido, o segundo também não é.
   O caminho é **pessoa**: LinkedIn da **Tamires Silva** (financeone) e da
   **Renata Nunes** (bmcnews); Instagram `@ecommerce_br`.
   ⚠️ **O LinkedIn devolve HTTP 999 a robô — este passo é do Ed, obrigatoriamente.**
2. **O jornal continua a ser a melhor aposta** (é quem dá follow), mas
   `economia@` é uma caixa partilhada. Onde houver **nome de pessoa** — como o
   Lindauro Gomes — a hipótese é maior.
3. **Não aumentar o volume.** Mandar 30 e-mails com 0% de resposta não produz
   links, produz reputação de spam no `finmoovi.com`. **Antes de escalar, é
   preciso UM sim que mostre o que funciona.**

---

## Pendências relacionadas

- ✅ **mate.tools: FECHADO em 15/09 — 6 de 6.** O conversor de moedas entrou pela caixa
  "Know a tool that belongs on this list?" em `mate.tools/currency-calculator`, com a
  resposta *"Thanks! We will review it before it goes live."* Fica à revisão manual deles.
- **AlternativeTo:** o app está na fila gratuita, ainda não aprovado. Quando sair,
  adicionar o FinMoovi como alternativa nas páginas dos concorrentes (botão
  "+ Add Alternatives").
- ✅ **webcatalog.io APROVOU em 22/09/2026 — o caso está fechado.** Ficha no ar em
  `webcatalog.io/en/apps/finmoovi/` (medido: 200, 198.836 bytes; controle com URL
  falsa dá 307). Foram **duas recusas** com a palavra *"Untrustworthy"*, um apelo
  pelo formulário *General inquiry* e a resposta final de `support@webcatalog.io`:
  *"confirmed the ownership and responsibility information provided on the website"*.
  🔴 **MAS o link é `rel="noopener nofollow"`** — uma única ocorrência de `nofollow`
  no HTML e é esta. **Não conta como backlink**, o que confirma outra vez a quarta
  rodada. Medido na mesma corrida: `sitelike.org` também está publicado e também é
  `nofollow`; o **AlternativeTo continua por medir** (`403` do Cloudflare deles,
  igual a 14/09 — e `403` não é "não existe").
- 🗄️ Histórico da recusa, para quem precisar do porquê: 🔴 **webcatalog.io recusou em
  15/09.** Motivo dado, uma palavra: *"Untrustworthy"*.
  Não publicam critérios (procurado, não encontrado) — qualquer causa é hipótese. O que
  **foi medido** no `finmoovi.com`: tem Privacidade, Termos, Cookies e Aviso Legal; **não
  tem página "Sobre"**; não publica nome de empresa nem morada (só *"Feito com ❤️ em
  Portugal"*); o e-mail está ofuscado pela Cloudflare; e o cadastro foi feito com
  **`app.finmoovi.com`**, que serve uma casca vazia a quem não tem conta.
  **Antes de reenviar:** criar a página "Sobre" e submeter `finmoovi.com`, não o app.
- ✅ **O "+2.400 pessoas" saiu do site em 15/09.** O Ed confirmou que o número nunca foi
  real. Estava no topo e na chamada final do `finmoovi.com`, nas 3 línguas. Removido,
  publicado e **medido no ar**: 0 ocorrências. Saiu também o link morto *"Depoimentos"*
  do rodapé. **Isto conta para esta estratégia:** o editor de um portal abre o site antes
  de decidir publicar, e número inventado num site de dinheiro é o sinal de desconfiança
  mais visível que há. Os depoimentos fictícios já tinham sido retirados em 23/07/2026.
- ✅ **A página "Sobre" FOI FEITA em 15/09** e está no ar nos 3 idiomas (`/sobre` ·
  `/about` · `/acerca`) — esta linha ficou por atualizar e contradizia a secção
  "A PÁGINA SOBRE ENTROU" logo acima. O texto original, por memória histórica:
  ⏭️ *"A página Sobre continua por fazer.* É o buraco que sobra: quem está por trás do
  FinMoovi. O nome **já está no site** — o Aviso Legal e a Política de Privacidade dizem
  *"Ed Flávio (pessoa singular) — Portugal"*, com e-mail de contato. Não há empresa
  aberta; há **atividade aberta em Portugal** (confirmado pelo Ed em 15/09).
  ⚠️ Achado por tratar: o Aviso Legal diz Portugal mas a lei aplicável que cita é
  **brasileira**. Não mexer sem decidir com o Ed.
- **IR do salário (IRRF):** descartado por decisão do Ed em 14/09. Não reabrir sem
  ele pedir.
