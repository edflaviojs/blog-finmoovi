# Sistema de Internacionalização (i18n) — Blog FinMoovi

Documentação completa do sistema de internacionalização do blog. Cobre estrutura de ficheiros, scripts geradores, validação, workflows de CI/CD e troubleshooting.

---

## 1. Visão Geral

O blog suporta **3 locales**: `pt`, `en`, `es`.

Cada conteúdo (post ou glossário) possui um campo `translationKey` no frontmatter que vincula as traduções entre si. O script `validate-i18n-sync.js` garante, antes de cada build, que os 3 idiomas existem para cada `translationKey`.

Fluxo resumido:

```
Post PT criado → Script gera EN + ES → validate:i18n confirma trio → Build passa
```

---

## 2. Estrutura de Ficheiros

### Posts: `src/content/posts/`

| Locale | Padrão do nome de ficheiro | Exemplo |
|--------|---------------------------|---------|
| PT | `slug-em-portugues.md` | `como-economizar-dinheiro.md` |
| EN | `en-english-slug.md` | `en-how-to-save-money.md` |
| ES | `es-slug-en-espanol.md` | `es-como-ahorrar-dinero.md` |

### Glossário: `src/content/glossario/`

Mesmo padrão de nomes (sem prefixo para PT, prefixo `en-`/`es-` para EN/ES).

### Regras de nomenclatura

- O **slug** de EN/ES é derivado do **título traduzido** (NOT do slug PT)
- O `translationKey` é baseado no slug PT e **nunca muda** após criação
- Função usada: `slugify(translatedTitle)` nos scripts geradores

---

## 3. Frontmatter Obrigatório

Todo ficheiro de conteúdo (posts e glossário) deve conter estes campos:

```yaml
---
locale: "pt"                          # "pt" | "en" | "es"
translationKey: "como-economizar-dinheiro"  # Mesmo valor nos 3 idiomas
title: "Como Economizar Dinheiro"
description: "Guia completo para economizar..."
---
```

O `translationKey` é o slug PT e serve como chave de ligação. Se o post PT é `como-economizar-dinheiro.md`, então:

- PT: `translationKey: "como-economizar-dinheiro"`
- EN: `translationKey: "como-economizar-dinheiro"` (mesmo valor)
- ES: `translationKey: "como-economizar-dinheiro"` (mesmo valor)

---

## 4. Scripts Geradores

Todos em `src/scripts/automacoes/`. Geram posts em PT e automaticamente traduzem para EN/ES.

| # | Script | Tipo de conteúdo |
|---|--------|-----------------|
| 1 | `gerar-dicas-financeiras.js` | Dicas financeiras práticas |
| 2 | `gerar-post-bofu.js` | Posts bottom-of-funnel (conversão) |
| 3 | `gerar-post-comparacao.js` | Posts comparativos |
| 4 | `gerar-post-inteligente.js` | Posts baseados em analytics |
| 5 | `gerar-post-investimentos.js` | Posts sobre investimentos |
| 6 | `gerar-post-orcamento.js` | Posts sobre orçamento |
| 7 | `gerar-post-sazonal.js` | Conteúdo sazonal (datas comemorativas) |
| 8 | `gerar-sazonal-mercados.js` | Análise sazonal de mercados |
| 9 | `gerar-solucoes-finmoovi.js` | Posts focados em soluções do app |
| 10 | `cotacoes-semanal.js` | Resumo semanal de cotações |
| 11 | `glossario-auto.js` | Termos de glossário (batch) |
| 12 | `glossario-auto-diario.js` | Termo de glossário diário |

### Lógica de slug nos geradores

```javascript
// Exemplo de gerar-post-inteligente.js
function slugify(title) { /* remove acentos, lowercase, hifeniza */ }

// O translationKey vem do slug PT
const slug = slugify(post.title);          // slug PT
const translationKey = slug;

// Para EN/ES, usa slugify no título traduzido
const localeSlug = locale === 'pt' ? slug : locale + '-' + slugify(post.title);
```

---

## 5. Validação (Trava de Build)

### Comandos

⚠️ **São DOIS validadores diferentes**, e confundi-los já causou um incidente:
uma regressão passou porque foi validada com um e enviada para produção com o
outro (27/07).

```bash
npm run validate:i18n         # roda OS DOIS (é este que você deve usar antes de commitar)
npm run validate:i18n:sync    # scripts/validate-i18n-sync.js    → sincronização + guard anti-âncora
npm run validate:i18n:posts   # src/scripts/validacao/validar-i18n.js → pares, contagem, canibalização
```

O `:posts` é o que **19 workflows de geração** executam como trava antes do push
— eles chamam o ficheiro directamente por caminho, não via `npm run`.

### Quando executa

Antes de cada build (`package.json`) — note que o build usa **apenas o `:sync`**:

```json
"build": "npm run validate:i18n:sync && npm run validate:slugs && npm run generate && astro build && npm run validate:schema"
```

**Porquê só o `:sync` no build:** o build é o que o Cloudflare Pages corre para
publicar o site. O `:posts` tem verificações voláteis (canibalização, lang-guard)
que um commit de bot pode disparar — se estivesse no build, uma falha dessas
impediria a **publicação do site inteiro**, não apenas um workflow. Decisão
consciente do dono (27/07), não esquecimento.

### O que verifica

1. **Campo `locale`** — todo ficheiro deve ter `locale: "pt"|"en"|"es"`
2. **Cobertura de `translationKey`** — para cada translationKey, devem existir ficheiros nos 3 idiomas
3. **Palavras PT em títulos EN/ES** — lista de stopwords PT bloqueadas em slugs/títulos EN e ES
4. **SEO fields** — título e description não podem estar em idioma errado

### Resultado

- Se qualquer verificação falha → **build é BLOQUEADO** com exit code 1
- Mensagens de erro indicam exactamente qual ficheiro/translationKey tem problema

---

## 6. Workflows GitHub Actions

| Workflow | Ficheiro | Schedule | O que faz |
|----------|----------|----------|-----------|
| Fix i18n Content (Daily) | `fix-i18n-content-daily.yml` | Seg-Sex 8:30 UTC | Corrige 20 ficheiros/dia (adaptação cultural via LLM) |
| Detect BR-only Posts | `detect-br-only-posts.yml` | Segunda 10:00 UTC | Detecta posts PT sem tradução EN/ES, abre issue |
| i18n Gate (PR Check) | `i18n-gate.yml` | Em cada PR (paths: content) | Bloqueia PRs com slugs PT em ficheiros EN/ES |
| Sincronizar i18n | `i18n-sync.yml` | Diário 5:00 UTC | Auto-corretor de sincronização PT/EN/ES |

### Detalhes do i18n Gate

Executado em PRs que tocam `src/content/posts/**` ou `src/content/glossario/**`:

1. Roda `npm run validate:i18n:sync` (só o `:sync` — pelo mesmo motivo do build:
   o `:posts` varre o repositório inteiro, então um problema pré-existente num
   post antigo bloquearia um PR que nem lhe tocou)
2. Verifica ficheiros novos/renomeados EN/ES contra padrões de slug PT
3. Se detecta palavras PT no slug → PR bloqueado

---

## 7. Scripts Utilitários

| Script | Comando | O que faz |
|--------|---------|-----------|
| `scripts/validate-i18n-sync.js` | `npm run validate:i18n:sync` | Trava de build e do gate de PR — sincronização i18n + guard anti-âncora local |
| `src/scripts/validacao/validar-i18n.js` | `npm run validate:i18n:posts` | Trava de push de **19 workflows de geração** (chamado por caminho, não via npm) — pares por `translationKey`, contagem por locale, duplicatas, canibalização, lang-guard |
| `ping-search-engines.js` | `npm run ping:sitemap` | Notifica Google/Bing sobre sitemap atualizado |
| `audit-content-i18n.js` | `node scripts/audit-content-i18n.js` | Audita qualidade i18n do conteúdo existente |
| `fix-i18n-content-batch.js` | Via workflow ou manual | Corrige conteúdo EN/ES em batch (adaptação cultural) |
| `rename-post-slugs.js` | `node scripts/rename-post-slugs.js` | Renomeia posts com slugs incorretos (DRY_RUN/APPLY) |
| `rename-glossario-slugs.js` | `node scripts/rename-glossario-slugs.js` | Renomeia glossário com slugs incorretos |
| `detect-br-only.js` | Via workflow | Detecta posts que existem apenas em PT |

### Modos de execução (rename scripts)

```bash
# Apenas listar o que seria renomeado (padrão)
DRY_RUN=true node scripts/rename-post-slugs.js

# Aplicar renomeações
APPLY=true node scripts/rename-post-slugs.js
```

---

## 8. Módulos Partilhados

Localização: `src/scripts/lib/`

| Módulo | Função |
|--------|--------|
| `translation-prompt.js` | Prompt padronizado de adaptação cultural para LLMs. Instrui tradução + adaptação (moeda, faixa salarial, referências locais) |
| `lang-guard.js` | Detecta idioma errado no corpo do texto via heurística (stopwords + acentos). Oferece `guardedTranslate()` com retry automático |
| `year-guard.js` | Corrige anos defasados em títulos gerados por LLM. Função pura `fixStaleYear(text)` substitui anos < atual |

### Uso nos geradores

```javascript
import { getTranslationInstructions } from '../lib/translation-prompt.js';
import { guardedTranslate } from '../lib/lang-guard.js';
import { fixStaleYear, CURRENT_YEAR } from '../lib/year-guard.js';

// Corrigir ano no título
post.title = fixStaleYear(post.title);

// Traduzir com guarda de idioma (1 retry automático)
const enPost = await guardedTranslate(
  () => translatePost(post, 'en'),
  'en',
  `${slug} (en)`
);
```

---

## 9. Redirects

### Ficheiro

```
public/_redirects
```

### Formato

```
/en/posts/old-slug  /en/posts/new-slug  301
/es/posts/es-old-slug  /es/posts/es-new-slug  301
```

### Estado actual

- ~237 linhas de redirects configurados
- Cobrem posts e glossário renomeados
- Incluem redirects de consolidação (posts duplicados/canibalizados)

### Processamento

O Cloudflare Pages processa automaticamente o ficheiro `_redirects` no deploy. Não é necessária configuração adicional.

---

## 10. Como Adicionar Novo Conteúdo

### Via scripts geradores (automático)

1. O script gera o post PT com `translationKey: "slug-pt"`
2. O mesmo script traduz para EN/ES usando LLM + `guardedTranslate()`
3. Slugs EN/ES são derivados do título traduzido: `en-english-title.md`, `es-titulo-espanol.md`
4. `validate:i18n` confirma que o trio existe
5. CI gate verifica que slugs EN/ES não contêm palavras PT
6. Build passa → deploy

### Manualmente

1. Criar `src/content/posts/meu-post.md` com:
   ```yaml
   locale: "pt"
   translationKey: "meu-post"
   ```
2. Criar `src/content/posts/en-my-post.md` com:
   ```yaml
   locale: "en"
   translationKey: "meu-post"
   ```
3. Criar `src/content/posts/es-mi-post.md` com:
   ```yaml
   locale: "es"
   translationKey: "meu-post"
   ```
4. Rodar `npm run validate:i18n` para confirmar
5. Commit e push

---

## 10-A. A adaptação internacional em lote — CONSERTADO (06/08/2026)

O `fix-i18n-content-daily.yml` corre de segunda a sexta, às 8h30 UTC, e manda
`scripts/fix-i18n-content-batch.js` re-adaptar até 20 ficheiros por corrida
(trocar R$ por USD/EUR, produtos brasileiros por equivalentes internacionais,
referências geográficas). A fila sai de dois ficheiros:

| Ficheiro | Papel |
|---|---|
| `scripts/audit-content-results.json` | auditoria: `severity` por ficheiro (0 = limpo) |
| `scripts/fix-i18n-progress.json` | tentativas gastas por ficheiro |

### A causa de raiz: a auditoria estava CONGELADA

`audit-content-results.json` tinha **um único commit em toda a história** e
nenhum workflow o regenerava. Era a foto de um dia antigo, e dela saía tudo o
resto. Medido em 06/08/2026, antes do conserto:

| Medida | Número |
|---|---|
| Ficheiros na auditoria congelada | 292 |
| Ficheiros que existiam em disco | 336 |
| **Existiam e não estavam na auditoria → invisíveis para a fila** | **96** (25 com defeito real) |
| Entradas mortas (ficheiro já não existia) | 52 |
| Ficheiros na lista de progresso | 149, dos quais 39 já não existiam |

### Defeito 1 — "processado" vencia "ainda defeituoso"

O filtro da fila era:

```js
.filter((r) => r.severity > 0 && !progressSet.has(r.file))
```

Estar na lista de progresso excluía o ficheiro **para sempre**, mesmo com
severidade 3. O robô processava, escrevia, marcava como feito — e nunca conferia
se a adaptação tinha funcionado. Presos assim: **110** medidos pela auditoria
congelada, **7** quando medidos contra o disco real.

> ⚠️ Correcção a uma versão anterior deste texto: `en-bolsa-de-valores.md`,
> `en-hedge.md` e `en-tesouro-direto.md` **não** estavam com severidade 3 na
> realidade — estavam a 3 *na foto velha*. Medidos a fresco davam 0. O R$ e os
> produtos tinham sido arrumados; o que sobrava era o defeito 2. Lição: medir
> contra o disco, nunca contra o ficheiro de resultados.

### Defeito 2 — severity 0 numa página visivelmente defeituosa

`en-private-pension.md` tinha severidade 0 e mantinha "INSS" no texto inglês.
Ao todo, **20 de 197 ficheiros "limpos"** tinham termo brasileiro que o detector
nunca procurava: `Nubank`, `Magazine Luiza`, `INSS`, `PGBL/VGBL`, `LCI/LCA`,
`LTN/NTN`, `CVM`, e palavras portuguesas soltas (`ações`, `valor`).

> ⚠️ Correcção: `FGTS` e `Receita Federal` **estavam** no detector e no prompt.
> O `INSS` não estava em **nenhum dos dois** — nem o detector o procurava, nem o
> prompt mandava adaptá-lo. E o `IPCA` estava no prompt mas faltava no detector.
> Não era o detector a confiar no prompt: era um buraco em ambos.

### O que foi feito

1. **`.github/workflows/fix-i18n-content-daily.yml`** corre
   `node scripts/audit-content-i18n.js` **antes** do lote. A fila passa a ser
   montada contra o disco de hoje. Isto mata as entradas mortas e destranca os
   ficheiros invisíveis, sem gastar uma única chamada de IA.

2. **`src/scripts/lib/i18n-queue.js`** (novo, puro) decide quem entra:
   *ainda tem defeito* **e** *ainda tem tentativas*. Estar na lista de progresso
   deixou de ser expulsão eterna. Ordem: menos tentativas primeiro, só depois
   severidade — o lugar do lote vale mais em quem nunca foi tentado.

3. **`scripts/fix-i18n-content-batch.js`** RE-MEDE o ficheiro depois de o
   escrever, com o mesmo detector da auditoria, e guarda a severidade resultante.
   Ao fim de `MAX_TENTATIVAS` (3 por omissão) o ficheiro sai da fila e é impresso
   em todas as corridas como **"PRECISA DE HUMANO"** — nunca desaparece em
   silêncio. Falha de API não gasta tentativa; resposta má do modelo gasta.

4. **`scripts/audit-content-i18n.js`** ganhou `BR_BRANDS`, `BR_ACRONYMS` e
   `PT_LEFTOVERS`, e uma **isenção por título**: um termo no `title:`/`term:`
   quer dizer que a página é *sobre* ele e não deve ser adaptado — sem isso,
   "PIX vs TED" virava "instant transfers vs instant transfers". A isenção não se
   estende ao corpo.

5. **`src/scripts/lib/translation-prompt.js`** recebeu **primeiro** todos esses
   termos. Regra da casa: nada é castigado pelo detector sem o prompt mandar
   adaptá-lo.

6. **`tests/i18n-queue.test.js`** e **`tests/audit-content-i18n.test.js`**. O
   último tem o **cruzamento trava × prompt**: se alguém acrescentar um termo ao
   detector sem o pôr no prompt (ou vice-versa), o teste reprova.

### Estado depois do conserto

| Medida | Antes | Depois |
|---|---|---|
| Ficheiros auditados | 292 (foto velha) | 336 (disco) |
| Com defeito | 139 | 168 |
| Na fila | 116 (7 mortos) | 168 (0 mortos) |
| Presos para sempre | 110 | 0 |
| Invisíveis à fila | 96 | 0 |

A 20 por dia útil, a fila esvazia em ~9 corridas. Os 9 ficheiros do diagnóstico
original estão todos na fila, incluindo `en-private-pension.md`.

⚠️ Ver também o `link-guard` (§8): o mesmo robô já foi causa de deploy parado por
inventar links de glossário. A regra 4b do prompt manda traduzir o **texto
visível** dos links — a regra 6b continua a proibir tocar na URL, e o link-guard
continua ligado no workflow.

## 11. Troubleshooting

| Sintoma | Causa | Solução |
|---------|-------|---------|
| Build falha com "translationKey AUSENTE" | Ficheiro sem campo `translationKey` | Adicionar `translationKey` ao frontmatter |
| Build falha com "FALTANDO idiomas" | translationKey não tem os 3 ficheiros | Criar ficheiro(s) que falta(m) para completar o trio |
| CI gate rejeita PR | Slug EN/ES contém palavras PT | Renomear o ficheiro com slug derivado do título traduzido |
| Workflow fix-i18n-content falha | Secret ausente | Verificar `GROQ_API_KEY` nos secrets do repositório |
| Robô diz "PRECISA DE HUMANO" num ficheiro | 3 passagens da IA não baixaram a severidade | Corrigir esse ficheiro à mão; ver §10-A. Repor a contagem = apagar a entrada dele em `scripts/fix-i18n-progress.json` |
| Fila vazia mas há ficheiros com defeito | Todos esgotaram as tentativas | Ver a lista "PRECISAM DE HUMANO" no log da corrida |
| `lang-guard` emite warning mas não bloqueia | Tradução falhou 2x mas publicação PT não é bloqueada | Revisar manualmente o ficheiro EN/ES gerado |
| Posts aparecem duplicados em SEO | translationKey diferente entre locales | Unificar translationKey (usar o slug PT em todos) |
| Redirect não funciona | Formato errado em `_redirects` | Verificar formato: `[path-antigo]  [path-novo]  301` (2 espaços) |

### Comandos de diagnóstico

```bash
# Validar sincronização i18n
npm run validate:i18n

# Auditar qualidade do conteúdo i18n
node scripts/audit-content-i18n.js

# Detectar posts apenas em PT (sem EN/ES)
node scripts/detect-br-only.js

# Ver slugs que precisam de renomeação (dry run)
DRY_RUN=true node scripts/rename-post-slugs.js
```

---

## Referência Rápida

```
src/content/posts/
├── como-economizar.md          ← PT (translationKey: "como-economizar")
├── en-how-to-save-money.md     ← EN (translationKey: "como-economizar")
└── es-como-ahorrar-dinero.md   ← ES (translationKey: "como-economizar")

src/scripts/automacoes/         ← 12 scripts geradores (criam trio PT/EN/ES)
src/scripts/lib/                ← Módulos partilhados (lang-guard, year-guard, etc.)
scripts/validate-i18n-sync.js   ← Trava de build
public/_redirects               ← Redirects 301 para slugs renomeados
.github/workflows/              ← 4 workflows i18n (gate, fix, detect, sync)
```
