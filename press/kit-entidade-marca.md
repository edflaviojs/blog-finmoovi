# Kit de entidade / marca — FinMoovi

Objetivo: fazer o Google entender a **FinMoovi como uma entidade** (não uma palavra-chave). A pesquisa é clara: hoje **sinal de marca > backlink fraco** (correlação 0,66 vs 0,22 em AI Overviews). Este é o caminho para um eventual **Knowledge Panel**.

Ordem recomendada (do mais fácil/seguro ao que exige pré-requisito):

---

## 1. Preencher `config.social` (5 min — ativa o `sameAs` sozinho)

O schema `sameAs` já é **dinâmico**: ao colocar URLs reais em `site.config.ts → social`, elas entram automaticamente no `Organization` schema do site (sem mexer em código).

Onde: `site.config.ts`, bloco `social`. Coloque **URLs completas** (com `https://`):

```ts
social: {
  twitter: 'https://x.com/finmoovi',            // se existir
  instagram: 'https://instagram.com/finmoovi',  // se existir
  linkedin: 'https://www.linkedin.com/company/finmoovi',
  github: 'edflaviojs/blog-finmoovi',           // (mantém)
  youtube: 'https://www.youtube.com/@finmoovi', // se existir
},
```

> Só preencha perfis que **existem e são oficiais**. Perfis inconsistentes/abandonados atrapalham mais que ajudam. O ideal: mesma bio, mesmo logo e mesma URL do site em todos.

## 2. Crunchbase (rápido, sem exigência de notabilidade)

Crie o perfil da empresa em crunchbase.com. É um sinal de entidade forte e que sistemas de IA consultam. Campos sugeridos:

- **Nome:** FinMoovi
- **Categoria/Industry:** Personal Finance, Financial Services, Mobile App, FinTech
- **Website:** https://finmoovi.com
- **Descrição curta:** App brasileiro de controle financeiro pessoal com multi-moeda, Smart Capture por voz/OCR e relatórios com IA.
- **Descrição longa (rascunho):** A FinMoovi é um aplicativo de finanças pessoais criado no Brasil para ajudar as pessoas a controlar gastos, acompanhar investimentos e organizar o orçamento — com suporte a múltiplas moedas (BRL, USD, EUR), captura inteligente de despesas por voz e OCR, categorização automática e funcionamento 100% offline. Mantém o FinMoovi Blog (blog.finmoovi.com) com educação financeira gratuita, ferramentas e estudos com dados públicos.
- **Fundador/Editor:** Ed Flávio (Administração de Empresas; pós em Gestão Financeira).

Depois de criado, **adicione a URL do Crunchbase ao `config.social`/`sameAs`** (pode usar o campo linkedin/twitter livre ou estender o bloco social).

## 3. Wikidata (alto valor — MAS exige notabilidade; fazer DEPOIS de cobertura)

O Wikidata alimenta diretamente o Knowledge Graph do Google. Porém tem **critério de notabilidade**: um item pode ser **apagado** se a entidade não tiver referências a fontes confiáveis independentes (matérias na imprensa, por exemplo).

➡️ **Por isso o item 1 do outro kit (divulgação do estudo) vem antes:** ganhar 1–2 menções na imprensa cria a notabilidade que sustenta o item no Wikidata. Sequência: **imprensa → Wikidata → Knowledge Panel**.

Rascunho do item (para quando houver ≥1 fonte independente):
- **Label:** FinMoovi
- **Description (pt):** aplicativo brasileiro de finanças pessoais
- **Instance of (P31):** mobile app / software aplicativo
- **Official website (P856):** https://finmoovi.com
- **Statements de apoio:** país de origem = Brasil; referências = links das matérias que citaram o Índice de Endividamento + o próprio site.

## 4. Google Business Profile — NÃO fazer

App 100% digital **não é elegível** (GBP exige atendimento presencial/área de serviço). Não perca tempo aqui.

## 5. Depois: monitorar o "brand SERP"

Busque **"FinMoovi"** no Google e observe o que aparece (site, redes, Crunchbase, matérias). O objetivo é que os resultados sejam coerentes e, com o tempo, surja um painel de conhecimento. A suíte de `mention-monitor` do blog já ajuda a acompanhar menções.

---

### Resumo da sequência de maior alavanca
1. Preencher `config.social` (hoje) → `sameAs` ativa sozinho.
2. Criar Crunchbase (hoje) → +1 no `sameAs`.
3. Divulgar o estudo de endividamento (kit de imprensa) → ganhar menções.
4. Com ≥1 menção: criar item no Wikidata.
5. Monitorar brand SERP → caminho para Knowledge Panel.
