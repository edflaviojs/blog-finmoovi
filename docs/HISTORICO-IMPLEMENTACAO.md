# Blog FinMoovi — Histórico de Implementação e Guia de Continuidade

**Data:** 2025-05-19/20  
**Status:** ✅ BLOG NO AR  
**Deploy:** Cloudflare Pages (auto-deploy via GitHub push)  
**Repositório:** https://github.com/edflaviojs/blog-finmoovi  
**Branch:** main  
**URL Produção:** https://blog-finmoovi.pages.dev / https://blog.finmoovi.com

---

## Commits Realizados

### Commit 1: `968c72e` — Implementação inicial completa
- Projeto Astro 4 + TypeScript criado do zero
- Design system Elite Hybrid (dark theme)
- 3 posts de exemplo (orçamento, regra 50-30-20, erros financeiros)
- 5 termos de glossário iniciais
- Header com cotações ticker, Navigation, Footer
- Sidebar com CTA, Newsletter, Posts Populares, Categorias
- Páginas: index, posts/[slug], categorias/[categoria], ferramentas, glossário, app
- SEO: meta tags, Open Graph, Schema.org
- Pagefind (busca client-side)
- GitHub Actions: dicas-financeiras (3x/semana), cotações (1x/semana), glossário (1x/semana)
- Deploy workflow para Cloudflare Pages

### Commit 2: `7a37213` — Melhorias V2
- Hero redesenhada estilo portal de notícias (post destaque grande + cards secundários)
- Glossário expandido de 5 para 40+ termos (A-Z) com accordion SEO
- Páginas individuais de glossário com Schema.org FAQ markup
- CTAs variados (12 versões) para não cansar o usuário
- Página /sobre criada
- Favicon atualizado (mesmo SVG do finmoovi.com — gráfico TrendingUp cyan→magenta)
- Imagens SVG temáticas para posts (gráficos financeiros)
- Seletor de idiomas PT/EN/ES no header (LanguageSwitcher.astro)

### Commit 3: `385dd7b` — Sidebar CTA + Cotações dinâmicas
- Sidebar CTA com texto completo e nota "sem cartão de crédito"
- Cotações agora buscam dados reais da AwesomeAPI (gratuita, sem chave)
- Atualiza automaticamente a cada 5 minutos
- Fallback para valores estáticos se API falhar

### Commit 4: `d65d56b` — i18n completo
- Script i18n.js client-side traduz todos elementos com data-i18n
- Navigation, sidebar, footer, glossário, sobre com data-i18n
- MobileMenu com traduções
- Footer logo atualizado (SVG ao invés de "FM")
- Arquivo src/i18n/translations.ts com todas as strings PT/EN/ES

### Commit no finmoovi.com: `b05c84b`
- Removido badge "Em breve" / "Coming soon" / "Próximamente" do botão Blog
- Blog agora é link direto para https://blog.finmoovi.com
- BLOG_URL atualizado em constants/index.ts

### Sessão 2026-07-13 — Performance, Acessibilidade e Imagens (Lighthouse)

Contexto: auditoria PageSpeed/Lighthouse da home apontou **Desempenho 76**, LCP 5,7s,
cadeia de rede de ~11.873ms, imagens pesadas (−2.132 KiB), render-blocking e falhas de A11y.

**Commit `5772b2e` — perf(a11y): caminho crítico + acessibilidade**
- CotacaoBar: fetch das APIs (AwesomeAPI/brapi/BCB) adiado para `load` + `requestIdleCallback`
  — sai do caminho crítico de renderização (era a origem da latência de ~11,8s).
- BaseLayout: `theme.js` agora **inline** no `<head>` (remove 1 request render-blocking)
  + `preconnect` para `static.cloudflareinsights.com`.
- LanguageSwitcher e MobileMenu: atributo `inert` quando fechados
  (corrige "aria-hidden com descendentes focáveis").
- Hero: `hero-secondary-title` de `<h3>` → `<h2>` (corrige ordem de títulos) em pt/en/es
  — a classe mantém o tamanho visual idêntico.
- tokens.css: `--text-tertiary` ajustado para contraste WCAG ≥4.5:1 nos dois temas
  (escuro #6e7681→#818892 = 4.84:1; claro #8b949e→#68707a = 4.71:1), preservando a hierarquia.

**Commit `b6dce45` — perf(images): recompressão webp + pipeline**
- 233 capas de posts/glossário recomprimidas para **webp q78** (dimensões preservadas):
  **−69,6 MB** no total. Hero da home 551KB → 94KB (melhora direta de LCP).
- `image-router.js`: buffers de IA passam por `sharp` (webp q78) antes de gravar, com
  fallback ao original — **imagens futuras já nascem leves**. Confirmado: os 18 scripts de
  geração passam por esse caminho (nenhum grava imagem direto).
- `sharp` declarado como dependência (antes só vinha transitivamente do Astro).

Pendências desta sessão — RESOLVIDAS:
- ✅ Proxy CORS (`1e97d18`): `functions/api/cotacoes.js` (combina AwesomeAPI/brapi/BCB no
  edge, 1 JSON) + `functions/api/moedas.js` (genérico, usado pelo conversor). CotacaoBar e
  conversor passam a fazer requests same-origin — sem erros de CORS. IBOV segue em fallback
  estático (brapi/token demo instável; `/last/IBOV` da AwesomeAPI virou 404).
- ✅ Tokenização do ciano (`d28bfd1`): novo token `--brand-cyan` (escuro #00F0FF idêntico,
  claro #0e7490 = 5.03:1). Substituídas as ocorrências hex em 43 arquivos; tema escuro
  pixel-idêntico, tema claro com contraste WCAG ≥4.5:1.

SEO de imagens (`11b8809` + `a6fb02f`):
- **Sitemap de imagens**: extensão Google Image (`<image:image>`) com URL absoluta em cada
  post/glossário (354 imagens indexáveis).
- **og:image**: `width`/`height` (1200×750) + `og:image:alt`. Criado `og-default.png` raster
  1200×750 (o padrão apontava p/ um `.png` inexistente — social da home estava quebrado).
- **Schema**: `image` do Article agora é `ImageObject` (URL absoluta + 1200×750).
- **alt**: corrigido `alt=""` vazio das imagens de hero/cards em en/es (usa o título).
- **Capas padronizadas em 1200×750** (357 imagens; proporção 1.6 preservada) + pipeline
  passa a gerar nesse tamanho, atendendo a recomendação de ≥1200px do Google.

Alt descritivo (IA de visão):
- Schema ganhou o campo `imageAlt`; render usa `imageAlt || título` nos covers canônicos,
  PostCard/PostGrid e grid da home (fallback seguro, sem regressão).
- `src/scripts/automacoes/gerar-alt-imagens.js` + workflow `gerar-alt-imagens.yml` descrevem
  a **cena** de cada capa via IA de visão (Groq `llama-4-scout`; converte p/ JPEG 768px;
  throttle 2,5s + retry 429 + circuit breaker) e gravam `imageAlt` localizado (pt/en/es).
- Workflow: disparo manual + **agenda 3×/dia (lote 60)** idempotente até todas terem alt.
  Ex.: *"Caderno de couro marrom, calculadora e moedas sobre mármore branco com plantas."*

Navegação, geradores e conteúdo (2026-07-13):
- **Menu/rodapé dinâmico** (`151f598`): fonte única `content.categoryNav` (site.config) +
  helper `src/utils/nav-categories.ts`; header, mobile e **rodapé** leem de lá — categoria
  nova aparece nos 3 automaticamente. Dropdown com `max-height`+scroll (muitas categorias).
- **Geradores mais robustos** (`ecf0d9a`): fallback markdown em investimentos/bofu/orçamento
  (evita falha "Formato inválido" quando a IA responde sem os delimitadores).
- **Rebalance de categorias** (`f4235aa`): `sazonal`→orçamento e `solucoes`→ferramentas
  (dicas era 54% por ser alimentada por ~5 geradores). Gerador DIÁRIO mantido intocado
  (lógica acoplada de "1 dica/dia").
- **Glossário** (`342d31a`): passa a usar todos os ~5 termos por letra (não só o [0]),
  evitando travar quando o ciclo A-Z dá a volta.

### 📅 Calendário de geração de conteúdo (horário de Brasília)

Todos os dias: **05h** sazonal-mercados (condicional, perto de feriado) · **06h** dica ·
**08h** termo de glossário.

| Dia | Hora | Gera |
|---|---|---|
| Seg | 07h / 09h | Cotações / Orçamento |
| Ter | 04h / 07h | Glossário extra / Post inteligente (categoria adaptativa) |
| Qua | 06h / 08h | Investimentos / Ferramentas (solucoes-finmoovi) |
| Qui | 04h / 07h | Glossário extra / Ferramentas (BOFU) |
| Sex | 07h / 09h | Orçamento (sazonal) / Investimentos (comparação) |
| Sáb | 04h | Glossário extra |
| Dia 1 | 06h | Atualização de posts antigos (não cria novo) |

Volume/semana (se tudo rodar): ~10 glossário, até 7 dicas, 8 posts de outras categorias.

---

## Arquitetura Atual do Blog

> ⚠️ **Esta árvore é do ARRANQUE do projeto e ficou para trás** (diz «3 posts .md» quando
> hoje são ~110, e não conhece `src/scripts/lib/`, `src/scripts/apis/`,
> `src/scripts/manutencao/`, `src/scripts/youtube/`, `src/scripts/multipost/`, `tests/`
> nem os ~60 workflows). Serve como retrato histórico. Para o estado actual de uma área,
> ler a entrada datada correspondente mais abaixo — as entradas dizem sempre os caminhos
> dos ficheiros que criaram.

```
blog-finmoovi/
├── public/
│   ├── favicon.svg (mesmo do finmoovi.com)
│   ├── images/posts/*.svg (imagens temáticas)
│   ├── scripts/i18n.js (traduções client-side)
│   ├── robots.txt, manifest.json, _headers
│   └── pagefind/ (gerado no build)
├── src/
│   ├── components/
│   │   ├── header/ (Header, Navigation, CotacaoBar, MobileMenu, LanguageSwitcher)
│   │   ├── footer/ (Footer)
│   │   ├── posts/ (PostCard, PostGrid, RelatedPosts)
│   │   ├── sidebar/ (Sidebar, FinMooviCTA, Newsletter, PopularPosts, Categories)
│   │   ├── glossario/ (CTAVariado)
│   │   ├── banners/ (BannerFinMoovi)
│   │   └── seo/ (SEOHead)
│   ├── content/
│   │   ├── posts/ (3 posts .md)
│   │   ├── glossario/ (40+ termos .md, A-Z)
│   │   └── config.ts (schemas Zod)
│   ├── i18n/translations.ts
│   ├── layouts/ (BaseLayout, PostLayout, ToolLayout)
│   ├── pages/ (index, sobre, app, ferramentas, glossario/[slug], posts/[slug], categorias/[cat])
│   ├── scripts/automacoes/ (kie-ai.js, gerar-dicas, cotacoes, glossario-auto, gerar-imagens)
│   └── styles/ (global.css, tokens.css, typography.css)
├── .github/workflows/ (deploy, dicas-financeiras, cotacoes-semanal, glossario-financeiro)
├── astro.config.mjs
└── package.json
```

---

## O QUE O PRÓXIMO CHAT PRECISA SABER

### Para dar continuidade:

1. **Ativar automações de posts** — Adicionar `KIE_API_KEY` nos GitHub Secrets:
   - Ir em: https://github.com/edflaviojs/blog-finmoovi/settings/secrets/actions
   - Criar secret: `KIE_API_KEY` com valor da chave Kie.AI
   - Opcional: `EXCHANGE_API_KEY` para cotações no workflow

2. **Posts são gerados automaticamente** quando a KIE_API_KEY estiver configurada:
   - 3x/semana (seg, qua, sex 6h): post de dica financeira
   - 1x/semana (segunda 7h): resumo de cotações
   - 1x/semana: novos termos de glossário

3. **i18n funciona client-side** — elementos com `data-i18n="chave"` são traduzidos pelo script `/scripts/i18n.js`. O idioma é salvo em `localStorage('fm-lang')`. Posts em si ficam em PT (tradução futura via Kie.AI).

4. **Cotações são dinâmicas** — AwesomeAPI (gratuita, sem chave). IBOV é estático (API gratuita não tem). Selic é estático (muda a cada 45 dias).

5. **Glossário usa accordion** — `<details>/<summary>` nativo. Schema.org FAQ em cada página individual.

6. **Spec completa do blog** está em: `backup-app-22052025/.claude/docs/IMPLEMENTACAO16-BLOG-FINMOOVI-PORTAL-COMPLETO.md`

### Melhorias pendentes (próximas sessões):

- [ ] Traduzir posts automaticamente para EN/ES via Kie.AI
- [ ] Adicionar mais posts (meta: 10+ posts para SEO)
- [ ] Implementar Giscus (comentários via GitHub Discussions)
- [ ] Configurar Google Analytics (GA4)
- [ ] Configurar Google AdSense
- [ ] Adicionar banner Loovi Seguros (afiliado)
- [ ] Implementar busca com Pagefind UI
- [ ] Criar mais ferramentas interativas (calculadoras)
- [ ] Adicionar breadcrumbs em todas as páginas
- [ ] Botão compartilhar (WhatsApp, Twitter, LinkedIn)
- [ ] Dark/Light mode toggle
- [ ] Newsletter funcional (integrar Resend)
- [ ] Imagens reais geradas por IA (substituir SVGs placeholder)
- [ ] Testar e corrigir responsividade mobile
- [ ] Lighthouse audit (meta: 95+ em todas categorias)
- [ ] Adicionar sitemap dinâmico para Google Search Console

### Comandos úteis:

```bash
cd C:\Users\Ed Flávio\Desktop\CLAUDE-CODE\FINMOOVI\blog-finmoovi
npm run dev      # servidor local http://localhost:4321
npm run build    # build estático em dist/
npm run preview  # preview do build
```

### APIs em uso:
- **AwesomeAPI** (cotações): `https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL,BTC-USD` — gratuita, sem chave
- **Kie.AI** (conteúdo): precisa de API key nos secrets do GitHub
- **Pinterest API v5** (distribuição de pins): ver seção abaixo

---

## 📌 Pinterest — Automação de Pins (configurada em 2026-07-18)

**App:** "FinMoovi Blog Pin Automation" (ID 1591124) · **Board:** "Finanças Pessoais" (`1105282002239944961`, público)
**Status:** OAuth + secrets + fluxo de refresh 100% prontos; **upgrade Trial → Standard SOLICITADO em 18/07** (vídeo demo enviado). Enquanto Trial, o Pinterest bloqueia pins em produção (403 code 29) e os runs agendados falham de forma limpa (0/3, tracking intacto). **Quando o Standard for aprovado, NADA precisa ser configurado** — o próximo run agendado publica sozinho.

**2026-07-20:** Upgrade Standard APROVADO pelo suporte Pinterest (analista Rufus, app "FinMoovi Blog Pin Automation", ID 1591124). Publicação automática ativa desde então via `social-distribution.yml` (seg/qua/sex 15h UTC): 3 pins em 20/07 e 3 em 22/07, todos com `pinId` real em `.github/data/pinterest-published.json`. Nenhuma alteração de código foi necessária. Pendência restante: renovação do refresh token antes de 16/09 (lembrete automático via issue já configurado).

**Como funciona:** `social-distribution.yml` roda seg/qua/sex 15h UTC → `scripts/pinterest-publish.js` pega posts pt dos últimos 14 dias com imagem, monta pin (capa + título + hashtags + link) e publica até 3/run no board. Tracking: `.github/data/pinterest-published.json`.

**Secrets no repo:** `PINTEREST_CLIENT_ID` (1591124) · `PINTEREST_CLIENT_SECRET` · `PINTEREST_REFRESH_TOKEN` · `PINTEREST_BOARD_ID`. O access token é renovado automaticamente a cada execução via refresh token.

### 🔄 RENOVAÇÃO DO REFRESH TOKEN (a cada ~60 dias — próximo vencimento ≈ 16/09/2026)

O refresh token do Pinterest expira em ~60 dias. Sinais de vencimento: e-mail do GitHub "Run failed: Social Distribution" + log do passo "Run Pinterest Publish" dizendo `Refresh do token falhou`. Há também um evento no Google Calendar de lembrete alguns dias antes. **Passo a passo (≈2 minutos):**

1. Abrir o PowerShell na pasta do blog:
   ```powershell
   cd "C:\Users\Ed Flávio\Desktop\CLAUDE-CODE\FINMOOVI\blog-finmoovi"
   $env:PINTEREST_CLIENT_SECRET = "<App secret — portal Pinterest, botão Gerenciar>"
   node scripts/pinterest-auth.js
   ```
2. Abrir no navegador a URL que o script imprimir (logado na conta Pinterest da marca) → **Aprovar**.
3. O script imprime o `refresh_token` novo e o comando pronto — colar no terminal:
   ```powershell
   gh secret set PINTEREST_REFRESH_TOKEN --repo edflaviojs/blog-finmoovi --body "<refresh_token novo>"
   ```
4. (Opcional) Testar: `gh workflow run social-distribution.yml` e conferir o log.

Obs.: o Redirect URI `http://localhost:8085/callback` já está cadastrado no app — não precisa mexer no portal. Se pedir o passo a passo ao Claude, ele conhece o fluxo (memória `project_blog_pinterest_api`).

---

## 🗓️ Guarda de anos defasados + refresh anual (2026-07-23)

- **Year-guard nos 9 geradores** (`e18468a`): `src/scripts/lib/year-guard.js` (fixStaleYear/CURRENT_YEAR) impede conteúdo novo de nascer com ano velho; na mesma leva, 6 títulos com 2024 foram corrigidos para 2026.
- **Pinterest com descrição rica SEO** (`6eba00f`): pins ganham descrição via LLM com fallback determinístico + título limitado a 100 chars.
- **Refresh anual do conteúdo existente** (este commit): `src/scripts/validacao/refresh-anos.js` varre posts+glossário (todos os idiomas) e corrige, só no frontmatter (title/description/seo), anos defasados em padrão claramente promocional ("para/for/em/en 20xx", "guia 20xx", "20xx: ", ano no fim do título); casos ambíguos (ex.: "Retrospectiva 2024") viram UMA issue com checkboxes para decisão manual. Workflow `year-refresh.yml` roda dia 1 de cada mês 07:15 UTC (virada do ano = grosso; demais meses = rede de segurança). Nunca toca em slug, nome de arquivo, corpo ou tags.
- Corrigido também o corpo dos 3 posts `investimentos-para-o-segundo-semestre-...` (pt/en/es): "segundo semestre de 2024" → 2026 no H1 e no parágrafo final.

---

## 🔎 Pacote SEO + GEO (2026-07-23)

Seis commits entregues em sequência no mesmo dia:

- **`a601cc3` — Fila de keywords (Fase 3 GSC):** fila unificada alimentada por gaps do GSC + `data/keywords-manuais.csv` (edição manual) + autocomplete; consumida pelos geradores dicas/investimentos/orçamento/inteligente. Acompanhamento humano em `press/keyword-queue.md`.
- **`efcd5c6` — Confiança/Schema:** carimbo de IA removido de 108 arquivos .md + do gerador; política editorial adicionada às páginas "sobre"; `DefinedTerm` + `BreadcrumbList` no glossário; titles das páginas de categoria reescritos com intenção de busca.
- **`002b4fb` — Links internos:** teto de 8/6 links por documento (idempotente); ~2.490 links excedentes limpos; âncoras coerentes com o destino; mapa de links para as 7 calculadoras.
- **`a572a97` — Desambiguação:** 8 termos renomeados com 24 redirects 301; 283 links internos atualizados; pools de temas saneados.
- **`d2a6424` — GEO (Generative Engine Optimization):** 13 bots de IA liberados no `robots.txt`; `/llms.txt` gerado automaticamente; bloco de resposta-direta + FAQ→`FAQPage` nos posts novos; `dateModified` no Schema; cotações citam a fonte; relatório `ai-visibility` mensal (dia 2).
- **`2989895` — Faxina:** posts uro/stock despublicados com 301; 9 alts corrigidos; traduzir-glossario com `maxTokens` 4000 e timeout 60min; retradução de 111 arquivos EN/ES disparada.

---

## 🔗 Barra final, links internos e guards (2026-07-29)

Oito commits. Documento completo em `backup-app-22052025/.claude/docs/IMPLEMENTACAO25-SEO-BARRA-FINAL-E-GUARDS.md`.

**Causa-raiz.** O Cloudflare Pages serve toda página **com** barra final (Astro build format `directory`): pedir `/posts/x` devolve **308** para `/posts/x/`. O sitemap e o hreflang emitiam a forma **sem** barra — logo, quase toda URL que anunciávamos ao Google era, por definição, um redirecionamento. Daí os relatórios "Página com redirecionamento" e "Página alternativa com tag canônica adequada" no GSC.

Segunda regra, descoberta depois e mais perigosa: o Cloudflare casa a **origem** do `_redirects` como **texto literal**, sem normalizar barra. `/posts/antigo` casa a regra; `/posts/antigo/` dá **404 seco**.

- **`c4e6fa4b` — Fonte única de URL canônica:** `src/utils/url.ts` (`canonicalPath`/`absUrl`); sitemap, canonical, hreflang e x-default passam a beber da mesma fonte. `<loc>` sem barra **505/508 → 0**; hreflang sem barra **2.570 → 0**; diff dos 533 canonicals **vazio** (nenhuma rota mudou de endereço). Corrige também o hreflang ausente em `/glossario/`, `/ferramentas/` e `/sobre/` nos 3 idiomas (**+9 páginas**): a comparação usava `'/glossario'` e o valor real é `'/glossario/'`.
- **`5c2854f9` — Links internos:** **26.398 → 0** links sem barra, em 40 arquivos-fonte (os maiores geradores eram a camada de dados e os componentes de nav/rodapé, não as páginas). Os 3.044 links do corpo de 462 markdowns são normalizados **no build** por `src/utils/remark-canonical-links.ts`, e não reescrevendo os arquivos — o bot escreve `](/glossario/x)` todo dia, e corrigir os arquivos resolveria hoje e barraria o post de amanhã. `_redirects` de **352 → 704** regras (cada origem nas duas formas, 0 loop, 0 cadeia). **Regressão que nós mesmos causamos:** ao normalizar os links, 9 URLs que funcionavam via 301 viraram **404 em 43 páginas** — só apareceu com `curl` contra produção.
- **`7dc9009f` — Guards:** `validate:trailing-slash` (forma) e `validate:internal-links` (a página existe? aponta para origem de redirect?) entram na corrente do build. `clean-dist.mjs` contorna a falha silenciosa do `fs.rmSync` em caminho com acento.
- **`98c0afa4` — `--import tsx` nos guards:** eles importam `site.config.ts` via `scripts/lib/site.js`. Passou verde localmente (Node 24 lê TypeScript) e **quebrou o deploy** (Cloudflare rodava Node 20, que não lê). Para simular o CI aqui: `node --no-experimental-strip-types <script>`.
- **`404491e7` — Node 22 no Cloudflare:** o 20 estava fora de suporte. A versão vinha da variável `NODE_VERSION` no **painel** do Cloudflare, que vence o `.node-version` do repositório — o log denuncia com "Detected the following tools from **environment**". Agora painel, `.node-version`, `wrangler.toml` e os 53 workflows dizem 22.
- **`f39a72e6` — JSON-LD limpo:** o gerador achatava links markdown para dentro dos campos de texto. Markdown cru **32 posts → 0**; URL colada na prosa **34 → 0**; campos acima do limite **37 → 0**. Quatro defeitos, incluindo `body.split('\n')` que, em checkout CRLF, detectava **zero** passos no Windows — o reprocessamento dos 23 posts HowTo teria reportado sucesso sem fazer nada.
- **`57583a29` — `validate:schema` checa conteúdo:** JSON-LD com markdown cru é sintaticamente perfeito; o validador aprovava os 32 posts sem piscar. Duas heurísticas foram descartadas de propósito para não quebrar o build diário do bot.
- **`4b716562` — i18n Gate:** bloqueava por **arquivo tocado** em vez de **âncora introduzida**. Acusou 240 e 179 ocorrências pré-existentes em commits que só mudaram URL dentro de links. Agora compara a versão em disco com a base por contagem de (arquivo, label). Continua bloqueando violação real (post novo com `R$`: 6 bloqueantes, exit 1).

**A lição.** Os guards verificavam a **forma** do link e nunca se a **página existe** — por isso a regressão dos 9 links passou por 1 revisor e 2 codificadores. Guard de forma sem guard de existência é falsa segurança. E análise estática não revela nada disto: o redirect vem do Cloudflare e não está em arquivo nenhum. **Prove com `curl -I -L` contra o domínio publicado.**

**Linha de base do GSC** (manhã de 29/07, antes do deploy, pela API do Google — `.github/data/gsc-index-status.json`): 508 URLs, **120 indexadas (23,6%)**, 148 "Page with redirect", 195 "Discovered - currently not indexed", 2 "Redirect error", e **118 URLs onde o canonical escolhido pelo Google divergia do nosso — a diferença sendo exatamente a barra final**. O arquivo é sobrescrito todo dia mas commitado, então o histórico fica no git. Acompanhar: `Page with redirect` deve despencar e `120/508` deve subir nas próximas 2 a 4 semanas.

---

## 🌍 Sugestão de idioma, 90 páginas cortadas e o rastreador injetado (2026-08-12)

Três commits no blog (`9345bd44`, `337b9ea0`, `d850f494`) e dois no repositório do app
(`e5dd4f8`, `df44aed`). Começou como «dá para sugerir o idioma ao visitante?» e destapou
dois defeitos que ninguém procurava.

**`9345bd44` — a gaveta de sugestão de idioma.** Leitor com o aparelho em inglês cai num
artigo em português vindo da busca e não tinha como saber que o MESMO artigo existe na
língua dele. Sobe uma gaveta no rodapé a oferecer a página equivalente; ele escolhe, nada
troca sozinho.

- **Porque SUGERE e não troca sozinho:** o robô do Google rastreia a partir de IPs dos
  EUA. Trocar o idioma conforme quem visita fá-lo-ia ver inglês na URL portuguesa, e as
  páginas em português deixariam de ser indexadas como português (97 posts + 88 verbetes
  por idioma).
- **Porque GAVETA e não popup no meio:** o Google penaliza no telemóvel o que tapa o
  conteúdo logo após o clique na busca. Cookies e verificação de idade estão isentos por
  serem obrigação legal; sugestão de idioma não está. Ocupa 13-16% do ecrã.
- **O idioma vem do APARELHO** (`navigator.languages`), não do IP: um brasileiro de férias
  em Londres quer português. Nada sai do aparelho.
- Preso ao mesmo `hasI18nVersion` que decide os `hreflang`: **585 das 636 páginas** a
  recebem, e as 51 restantes são exatamente as sem tradução declarada.
- **`fm-lang` NÃO serve para saber se a pessoa escolheu** — o `LanguageSwitcher` escreve
  essa chave sozinho em toda página `/en` e `/es`, só por a URL ter prefixo. Chave própria:
  `fm-lang-suggest`.
- Três armadilhas que só o ensaio com navegador real apanhou: o `CookieNotice` ocupa o
  mesmo canto e aparece na PRIMEIRA visita (agora a gaveta espera o evento `fm-consent`);
  o `NewsletterPopup` (z-index 10000) abre aos 75% de rolagem e passava-lhe por cima
  (agora cede o lugar, **sem** se marcar como decidida); e as bandeiras em emoji saíam como
  as letras «US»/«BR»/«ES» no Windows (passou a usar o selo de sigla do cabeçalho).

**`337b9ea0` — 90 páginas ficavam mais largas que o telemóvel.** Medido em perfil de
iPhone 13 (ecrã de 390px): **90 de 555 páginas** (mediana +69px, pior caso +474px).
Duas consequências, e a segunda é a grave: o texto do artigo era cortado no lado direito
(«Enquanto você folheia a fatura do cartão e ten…»), e **o aviso de privacidade saía do
ecrã** — página mais larga que o ecrã faz o navegador alargar a *layout viewport*, e tudo
o que é `position: fixed; bottom` é empurrado para fora da vista (medido na altura 1201
num ecrã de 664). O leitor nunca via o aviso e nunca escolhia.

Duas causas, não uma: **89 páginas por uma `<table>`** (o artigo é item de `display: grid`,
e item de grid nasce com `min-width: auto` — recusa-se a encolher abaixo da largura mínima
do conteúdo; tabela de 7 colunas pede 828px, a coluna ia atrás e a página também. O
`width: 100%` da tabela não impedia nada: 100% de uma coluna já esticada); e **1 página
por `=IFERROR(PreviousCell+CurrentValue,CurrentValue)`**, 48 caracteres sem um espaço,
escrita como texto normal.

Conserto em 3 ficheiros: `src/utils/rehype-wrap-tables.ts` (novo) mete cada tabela numa
caixa `.table-scroll`; `global.css` ganha `min-width: 0` nos itens do grid,
`overflow-x: auto` na caixa e `overflow-wrap: break-word` no `.post-content`;
`astro.config.mjs` liga o plugin. **No BUILD e não nos 90 markdowns**, pela mesma razão do
`remark-canonical-links`: o bot escreve conteúdo todo dia, e consertar os ficheiros de hoje
voltava a partir amanhã na primeira tabela nova. **Recusado o atalho
`table { display: block; overflow-x: auto }`** — uma linha de CSS que teria dispensado o
plugin, mas que faz o VoiceOver do Safari deixar de anunciar a tabela como tabela: perdem-se
os cabeçalhos de coluna. A caixa leva `tabindex="0"` (regra `scrollable-region-focusable`
do axe). Resultado: **90 → 0 em 636 páginas medidas uma a uma**.

**`d850f494` — contar a gaveta, e calar quem recusou.** Três momentos por idioma
(`lang-en-visto`/`-aceito`/`-dispensado`) para a tabela **`cta_clicks` que já existe** — uma
tabela nova não existiria no Supabase e o endpoint devolve `200` com `stored: false` quando
a gravação falha, o que daria tudo verde com zero números. **E o contador antigo
(`PostInlineCTAs`) disparava para quem tinha carregado em «Recusar»** — a medição do
Cloudflare respeitava, essa não. Consertado junto. A gaveta continua a APARECER para quem
recusou; o que deixa de haver é contagem.

**O rastreador que a Cloudflare injetava por cima (resolvido no painel, não em código).**
Uma prova que só perguntava «a landing continua a não pedir nada a terceiros?» respondeu
que não. O painel `finmoovi.com` do Web Analytics estava em **RUM → «Habilitar»
(injeção automática)**, que não fica só no host configurado: injeta no **domínio inteiro**,
e por isso o token `3cdd3537` entrava também no blog e no app, **por cima** do código deles.
Medido no ar, depois de carregar em «Recusar» e recarregar: **2 pedidos ao medidor**, um
deles o envio de dados em `/cdn-cgi/rum`. Ou seja: o botão «Recusar», reescrito nesse mesmo
dia precisamente porque um botão que não desliga nada é decoração, continuava a não
desligar nada. O nosso código obedecia; a plataforma fazia outra coisa. A opção passou a
«Ative com a instalação do JS Snippet» e o snippet do `finmoovi.com` passou a estar escrito
em `landing/index.html`. Medido depois, de sessão limpa: **2 páginas visitadas, zero
pedidos, zero scripts**.

⚠️ **Ao remedir, isolar a sessão.** Testando «clica Recusar e recarrega» sobra 1 pedido a
`/cdn-cgi/rum` — é a página ANTERIOR a descarregar dados recolhidos antes da recusa, o que
é legítimo. Sem isolar, essa sobra faz parecer que o conserto falhou.

**As lições.** Três, e todas da mesma família:

1. **Medir no repositório, no `dist/` ou com `curl` não prova o que o VISITANTE recebe.**
   O script do rastreador não estava em ficheiro nenhum e nem aparecia ao `curl` — a
   Cloudflare só o injeta para pedidos de navegador. Só o navegador a sério contra o site
   no ar o apanhou.
2. **Ausência de configuração no repositório não prova ausência de automação.** Concluí por
   escrito que «nada publica a landing» porque não havia `wrangler.*` em `landing/`, nem
   workflow, e a fase de deploy do doc estava a ⬜ PENDENTE. A automação vivia no painel da
   Cloudflare. Quando a conclusão for sobre algo fora do disco, **pedir a fotografia do
   painel** — resolveu isto em segundos.
3. **A prova pode medir o alvo errado.** A 1ª versão do ensaio do conserto das tabelas deu
   FALHA a dizer que não funcionava: media a PRIMEIRA `.table-scroll` da página, que tem 2
   colunas, cabe, e por isso não rola. Tinha de medir a mais larga.

**Provas.** 27 em navegador real para a gaveta do blog, 10 para o conserto das tabelas, 12
para a contagem (que interceptam o pedido e leem o corpo), 26 para a gaveta da landing, 13
finais contra os 3 sites no ar. Mais as 64 provas da casa e o build completo com todos os
validadores, a cada passo.

## 🖼️ As capas com letras: a regra passou a ser MEDIDA e não pedida (2026-08-19)

Sete commits (`36cbef5b`, `cf43aa97`, `9a571069`, `e2c31ea2`, `fb482d25`, `fdbb9fd2`,
`3fec218e`). Começou com o dono a abrir o blog e a ver uma capa com o título do post
desenhado por cima, em letras trocadas: *«Cansarlose de a1ot cer gasts b ta l a'o mae tor
esu dinieriee?»*. A frase dele: *«vira e mexe acontece o mesmo problema»* — e tinha razão,
era a **quarta** vez (11/06 `201f4f10`, 13/06 `21e51a39`, 18/08 `e25332ae`, 19/08). Todas as
vezes se melhorou o PEDIDO ao modelo e ninguém mediu o resultado.

**As duas causas, ambas consertos de 18 e 19/08.** No dia 18 (`e25332ae`) a Cloudflare
recusava 100% das chamadas porque `negative_prompt` é um campo que ela não aceita; tirou-se o
campo e dobrou-se a lista de proibições **no fim do próprio prompt**. O FLUX.1-schnell é
destilado, não tem CFG nem prompt negativo: leu as 20 palavras — *«text, letters, words,
titles, typography…»* — como **encomenda de tipografia**. E a Cloudflare, consertada, passou a
ser a fornecedora nº1 (13 das 18 imagens do dia). No dia 19 (`931a31fe`) a Together desligou
o FLUX.1-schnell e o modelo foi trocado para `Qwen/Qwen-Image` **mantendo `steps: 4`** — o 4
era do modelo destilado, o Qwen precisa de 28, e todas as imagens dela saíram a um sétimo do
caminho, ou seja borradas (nitidez **14** contra 400-900 das boas).

**A causa RAIZ, que não estava à vista.** Os oito robôs de conteúdo chamam
`generateCoverImage(post.title, …)`: a frase inteira do título, em português, com
interrogação, ia dentro do pedido de imagem. Para o modelo aquilo parece legenda a desenhar.
Agora vai só um **assunto visual** curto em inglês (`assuntoVisual`), com tabela de temas —
medido nos 108 títulos reais: 104 casam um tema (22 assuntos distintos, a variedade fica), 4
caem no genérico, **zero saídas com palavra portuguesa**. A limpeza é feita num ponto só, no
`image-router`, e protege qualquer robô futuro.

**Três camadas independentes** (`src/scripts/lib/guardiao-da-capa.js` é a terceira):
1. o pedido nunca nomeia o proibido — os estilos descrevem em positivo («clean unmarked
   surfaces», «screen off»);
2. o título nunca chega ao modelo;
3. a imagem é **medida antes de ser gravada** — com letras ou borrada é recusada e refeita
   com outra semente. Esta continua a valer mesmo que alguém estrague as outras duas.

**Um estilo foi REMOVIDO, e era a fábrica das duas queixas.** O «abstract glowing data
visualization, modern dashboard aesthetic with **blurred** colorful light streaks» pedia
desfoque (essas capas medem 9 a 20) **e** pedia painel de dados, logo o modelo desenhava
rótulos falsos — medido no acervo: «2070», «PLANNS», «CHANGE». Não se afina um estilo cuja
própria ideia exige o que não podemos ter. A pedido do dono, os abstratos caíram de 40% para
1 em 10 (sorteio ponderado).

**A régua de nitidez só vale onde se espera detalhe** — e isto foi a maior surpresa técnica
do dia. Uma **ilustração plana** boa mede **13**, praticamente o mesmo que o borrão que mede
**14**, e não há métrica local que os separe (testou-se média, p99, p99,9 e máximo do
laplaciano). Por isso quem manda é o estilo pedido (campo `plana`), que só o router conhece;
e a varredura do passado, que já não sabe o estilo, julga pela IA de visão. Sem esta
distinção mandava-se refazer dezenas de ilustrações que estão boas.

**As armadilhas que só a corrida real destapou** — e todas eram do tipo «verde sem prova»:

- **Ter chave não é ter resposta.** Os dois olhos de visão estavam configurados e nenhum
  respondia: Groq **429** (a chave é repartida por 38 workflows) e a Cloudflare devolvia um
  **objecto** onde o código esperava texto, deixando no registo apenas `resposta sem nível
  legível ("[object Object]")`. A ordem dos olhos aqui é ao CONTRÁRIO do
  `gerar-alt-imagens.js`: Cloudflare primeiro, por ter cota própria.
- **A varredura ia dizer «0 reprovadas» sem ter visto nada.** Atestado de saúde falso. Agora
  conta as medições cegas e **desiste à quinta**, sem tocar em nada.
- **A IA de visão copiou o exemplo do pedido.** Devolveu `"amostra":"the text you can read,
  or empty"` e recusou uma capa boa. Pior: na primeira varredura completa, **36 de 60
  reprovações eram falso alarme**, com o nível a dizer «proeminente» e a amostra a dizer
  «None» (12x), «proeminente» (16x), «nenhuma» (6x). **Um campo com lista de opções não serve
  para DECIDIR** — o modelo copia o primeiro valor; serve para triar. Recusar passou a exigir
  a **prova** (a citação do texto) mais uma **segunda leitura**, com pergunta diferente e sem
  lista de opções. Na dúvida, a capa passa.
- **92 imagens esgotaram a cota do DIA** («you have used up your daily free allocation of
  10,000 neurons») e a trava da PRODUÇÃO ficou cega no resto do dia. Uma limpeza do passado
  não pode desarmar a defesa do presente: daí `--max-medicoes` (teto de IMAGENS, não de
  reprovadas) e `--desde AAAA-MM-DD`, que exige `fetch-depth: 0` no checkout senão a data vem
  vazia e mede-se tudo outra vez.

**O passado é maior e mais antigo do que os dois consertos.** Medido nas primeiras 92 de 751
imagens: **16 com texto real** (3 capas, 13 internas), taxa de 17%, **estimativa** de ~130 no
acervo. E várias em posts ANTIGOS — «cashback-inteligente» («Economic»),
«cartao-de-credito-vs-debito» («Cartão die cresitó»), «economizar-no-supermercado» («CCSS»).
Os dois erros de 18-19/08 explicam a piora AGUDA; o fundo histórico é outra coisa, e é ele a
razão da queixa antiga do dono.

**A limpeza anda sozinha** (`capas-com-letras.yml`, 22:30 UTC = 19:30 no Brasil, depois do
ciclo de conteúdo porque a cota é partilhada e publicar tem prioridade). Pedido do dono: **10
correcções por noite**; medições 40. A peça que faltava era a **memória de progresso**
(`data/capas-auditadas.json`): sem ela cada corrida remedia as mesmas primeiras 40 por ordem
alfabética e o «10 por dia» nunca acaba — as duas primeiras corridas começaram ambas no mesmo
«5-alternativas». Guarda também a citação que motivou cada recusa, para auditoria. Prazo:
~13 dias para corrigir, ~19 para medir o acervo.

**A progressão vai no e-mail das 7h**, a pedido do dono: `10/119 capas refeitas — 11 na
fila`. Duas coisas ficam ditas de propósito: o denominador é **estimativa** e pode SUBIR (só
12% foi medido), e se o robô **não avança** desde ontem sai alarme com a data — um «10/119»
parado uma semana parece progresso e pode ser corrida morta.

**Provas.** 93 provas da casa, com as três imagens que falharam guardadas em
`tests/amostras/` (uma delas apanhou um erro meu: «cartão de crédito» era classificado como
dívida). A trava de letras foi provada **na corrida real 32256396811**: recusou a capa de
19/08 e leu o texto certo, e aceitou a capa boa — a prova é dupla de propósito, porque um
detector que reprova tudo passaria em metade. O fim do borrão também está medido: a
Cloudflare passou a gerar com nitidez **789 e 1421** e a Together com **642 e 673**, quando
no dia anterior a mesma Together dava **14**. Localmente, 3 capas geradas de verdade pela
Pollinations com o prompt limpo: **zero letras nas três**, olhadas uma a uma.

---

## 🚨 O blog parou 3 dias e nenhum robô avisou — a linha dobrada do YAML (2026-08-25)

**O que chegou ao dono:** um e-mail vermelho do `i18n-sync.yml` («All jobs have failed»).
Era a ponta menor do problema. A medição de verdade: **o site estava congelado em 22/08**,
com os posts de 23, 24 e 25 gravados no repositório e **nunca publicados**. Três dias.
`sitemap` mais recente `2026-08-22`, 670 endereços, enquanto o repo já tinha 654 ficheiros
de conteúdo.

### A causa raiz: um valor que não cabe na linha

Quando o caminho da capa passa dos ~80 caracteres, quem re-serializa o frontmatter com
js-yaml (`varrer-capas-com-letras.js`, os tradutores) escreve-o **dobrado**. Isto é YAML
perfeitamente **válido**:

```yaml
image: >-
  /images/posts/nome-muito-comprido.webp
```

A chave fica numa linha e o **valor na seguinte**. Dois robôs que trabalham **linha a linha**
não sabiam ler isso — e a mesma cegueira produziu dois estragos de tamanhos muito diferentes.

**1. O leitor — 15 falsos alarmes (o e-mail que o dono recebeu).**
`validar-capas.js` partia cada linha no primeiro `:` e ficava com `image = ">-"`. Acusava
«caminho fora de /images/» em **15 posts cujas 15 capas estavam todas no disco**, no sítio
certo. Foi isto que pintou o `i18n-sync` de vermelho todos os dias desde 22/08 — ruído, não
defeito.

**2. O escritor — 6 posts partidos e o site em baixo (o que ninguém viu).**
`gerar-alt-imagens.js` inseria o alt com `raw.replace(/^(image:.*)$/m, "$1\n" + alt)`, o que
metia a linha nova **entre a chave e o seu valor**:

```yaml
image: >-
imageAlt: "Pai, mãe e filha sorrindo no sofá..."   # <-- partiu aqui
  /images/posts/como-manter-as-contas-do-dia-sob-controle-e-evitar-surpresas.webp
```

Frontmatter inválido → `npm run build` morre em `bad indentation of a mapping entry` → a
Cloudflare não publica nada de novo. **6 posts** (2 PT + 2 EN + 2 ES), a partir do commit
`452ec12` de 22/08 06:44.

### A cronologia (bate certo ao minuto)

| Quando | O quê |
|--------|-------|
| 21/08 22:55 | `chore(capas): auditar e refazer capas` re-serializa 15 posts → nasce o `image: >-` |
| 22/08 05:19 | O guard reprova os 15 (falso alarme). **Primeiro e-mail vermelho** |
| 22/08 06:44 | `content(a11y): gerar imageAlt` parte 6 posts → **o blog para, em silêncio** |
| 23, 24, 25/08 | Posts novos entram no repo e **não vão para o ar** |
| 25/08 11:28 | O próprio `gerar-alt-imagens` começa a falhar pelo YAML que ele partiu |

### O conserto (5 commits)

| Commit | O quê |
|--------|-------|
| `b9447d4` | `validar-capas.js` passa a usar **gray-matter** — o mesmo caminho que o Astro usa para ler conteúdo, logo o guard vê exatamente o que o site vê. YAML partido passa a ser ERRO listado e nunca um crash a meio da varredura |
| `4125a2a` | `gerar-alt-imagens.js`: `inserirDepoisDe()` / `substituirCampo()` tratam a chave e o bloco indentado como **uma unidade**, preservando o fim-de-linha |
| `a97b6b0` | Os 6 posts reparados — **1 linha movida** em cada. As capas nunca faltaram |
| `ed610a3` | `regenerar-capas-glossario.js` (o irmão do defeito, ainda por disparar): apagava só a linha `imageAlt:` e deixaria o valor órfão. As três funções passam a viver em **`src/scripts/lib/frontmatter-bloco.js`** — uma cópia, um sítio para consertar |
| `f2efec0` | O **vigia do ar** (ver abaixo) |

**Regra que fica:** qualquer robô que edite frontmatter usa `src/scripts/lib/frontmatter-bloco.js`.
**Nunca mais um `replace` de uma linha só.** Fixado em `tests/frontmatter-bloco.test.js`
(8 casos; a suite completa: **101 passam, 0 falham**).

### O vigia do ar — o alarme que faltava (`vigia-do-ar.yml`, 20:00 UTC = 17h BR)

O que dói neste incidente não é o defeito: é que ele **passou três dias sem alarme**. Havia
~80 workflows a correr e nenhum viu, porque **cada um mede o seu pedaço** (traduções, capas,
links, YouTube) e nenhum media a única coisa que interessa ao leitor — **o que está
publicado**. O único vermelho que chegou apontava para 15 falsos alarmes.

`src/scripts/validacao/vigia-do-ar.js` (`npm run validate:no-ar`) é o único robô que mede
**de fora para dentro**: lê o `sitemap-index.xml` do site **no ar** e compara com o repo. O
sitemap sai do próprio build com o mesmo filtro das páginas (`!data.draft`, ver
`src/pages/sitemap-index.xml.ts`), portanto **é a lista exata do que está publicado**. Se o
build falhou, ou se a Cloudflare não publicou, o que falta aparece ali.

Decisões que o tornam útil — e que não se devem desfazer:

- **Compara pelo SLUG, não reconstrói as URLs.** Uma regra copiada do site envelhece e passa
  a inventar defeito; o slug vem do nome do ficheiro, a única coisa que os dois lados
  partilham de certeza.
- **Janela de graça de 6h** (`VIGIA_GRACA_HORAS`): um post commitado há minutos ainda pode
  estar a ser montado. Sem isto dava alarme falso todas as manhãs.
- **Fail-closed em três pontos**: sitemap inacessível, sitemap com menos de 50 endereços
  (página de erro/Cloudflare), ou 0 ficheiros analisados. **Não conseguir medir NÃO é o mesmo
  que estar tudo bem.**
- **De propósito FORA do `npm run build`**: se estivesse lá, um site fora do ar impediria de
  publicar o próprio conserto.
- Precisa de `fetch-depth: 300` para saber a idade dos ficheiros.

### Provas

- **Antes/depois do build:** com os 6 posts como estavam no GitHub, `npm run build` **falha**
  (`bad indentation of a mapping entry`, saída 127). Com o conserto, **passa** — 119 páginas
  de posts geradas e o alt novo presente no HTML.
- **O guard:** 654 ficheiros, de 15 erros para **0**. Verde na corrida real do `i18n Gate`
  (`32846432171`).
- **O site voltou:** sitemap de **670 → 700 endereços**, `lastmod` de `2026-08-22` para
  `2026-08-25`. Os 6 posts reparados confirmados a 200 nos três idiomas.
- **O vigia vê mesmo:** verde sozinho não provava nada, por isso serviu-se um sitemap
  truncado em `127.0.0.1:8899` a imitar 22/08 — ficou **vermelho**, apontou os 3 posts
  parados há 23h e **poupou** os 6 daquela manhã que ainda estavam na janela. Site fora do ar
  e sitemap com 1 endereço: vermelho, com a razão. Corrida real no GitHub (`32848227479`):
  654 ficheiros, 0 em falta, verde.

### As duas armadilhas desta caçada

1. **O e-mail vermelho apontava para o sintoma menor.** O guard queixava-se de capas; o
   estrago real era o site parado. Quando um robô fica vermelho, **medir o que está no ar**
   antes de acreditar no assunto do e-mail.
2. **As URLs do blog enganam — errei duas vezes no mesmo dia**, e as duas dariam alarme
   falso. PT: `/posts/<slug>/`. EN: `/en/posts/`**`en-`**`<slug>/`. ES: `/es/posts/`**`es-`**`<slug>/`
   — o prefixo do idioma **fica** na URL. Ler o formato no `sitemap-index.xml` **antes** de
   concluir que alguma coisa caiu.
