# Oferecer os embeds aos portais de finanças

> **Estado: NÃO COMEÇADO.** Tudo o que este passo precisa já existe e está no ar.
> Escrito em 14/09/2026, no fim do dia em que os embeds foram construídos.

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

## Pendências relacionadas

- **mate.tools:** falta submeter o conversor de moedas (6ª de 6). Bateu o limite
  diário em 14/09. Ver a caixa "Know a tool that belongs on this list?" no pé de
  `mate.tools/currency-calculator`.
- **AlternativeTo:** o app está na fila gratuita, ainda não aprovado. Quando sair,
  adicionar o FinMoovi como alternativa nas páginas dos concorrentes (botão
  "+ Add Alternatives") e pedir o selo **Verificado** no webcatalog.io.
- **IR do salário (IRRF):** descartado por decisão do Ed em 14/09. Não reabrir sem
  ele pedir.
