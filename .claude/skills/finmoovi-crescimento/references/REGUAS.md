# As réguas — e a origem de cada número

> Toda nota, todo "está bom" ou "está mau" nesta skill tem de apontar para uma
> linha deste ficheiro. **Número sem origem não entra.** Onde a origem é externa,
> está dito qual é; onde é medição nossa, está dita a data.

---

## 1. BLOG — busca do Google

| Régua | Valor | Origem |
|---|---|---|
| CTR esperado na posição 1 | ~28% | curva usada em `gsc-otimizar-ctr.js` |
| posição 3 | ~11% | idem |
| posição 5 | ~6% | idem |
| posição 8 | ~3,2% | idem |
| posição 10 | ~2,5% | idem |
| posição 11+ | ~2% ou menos | idem |
| **"striking distance"** (vale reforçar conteúdo) | posição **5 a 20** | `gsc-striking-distance.js` |
| **Fora de alcance** (não mexer em título) | posição **acima de 20** | medido: posição 70–90 no Brasil, 02/10/2026 |
| Quarentena após mexer no título | **21 dias** | medido: a mesma página foi reescrita a 08/09 e 15/09, apagando a experiência |
| Atraso do Search Console | **2 a 3 dias** | a janela de medição tem de acabar antes disso |

### Onde o blog está hoje (10/07 → 29/09/2026, dados do Search Console)

| | |
|---|---|
| Impressões | 15.110 |
| Cliques | **16** |
| CTR | **0,106%** — cerca de 1 clique por 944 impressões |
| Posição média | 56 (computador) · 43 (telemóvel) |
| Repartição por aparelho | **79% computador** / 20% telemóvel |

🔴 **Leitura com o filtro de realidade aplicado:** 79% de computador e posição 56
num blog de finanças pessoais em português é a assinatura de tráfego que não é o
público-alvo. **O CTR de 0,106% não é diagnóstico de título ruim — é consequência
de aparecer na página 6.** Ver `FILTRO-DE-REALIDADE.md`.

⚠️ **Os dados colados em 02/10 estão truncados em 18 linhas por tabela.** Qualquer
soma por idioma ou por país feita sobre eles é de uma amostra, não do total — e o
gráfico diário vai só até 27/07, não até 29/09. Não tirar conclusão de idioma
dessas somas.

---

## 2. YOUTUBE — vídeo LONGO

**O gargalo do longo é fazer clicar.** A miniatura e o título decidem.

| Régua | Valor | Origem |
|---|---|---|
| CTR de miniatura — média do nicho Finanças/Negócios | **5,5%** | Focus Digital, dez/2025 (via `claude-youtube`) |
| CTR de miniatura — média Educação | 4,5% | idem |
| CTR saudável sustentado (qualquer nicho) | **4% a 8%** | guia de analítica do `claude-youtube` |
| CTR de canal com problema | **abaixo de 3%** | idem |
| CTR nas primeiras 24h (público já inscrito) | 12%+ é normal | idem — e cai naturalmente quando chega a gente nova |
| Percentagem assistida saudável | **acima de 40%** (à frente de 83% dos canais) | idem |
| Percentagem assistida que multiplica recomendação | **50%+ = 3× mais recomendado** | idem |
| Texto na miniatura | **no máximo 5 palavras**, ideal 3 | idem |
| Título | **menos de 50 caracteres**; o gancho nos primeiros 45 | idem (corte no telemóvel) |
| Não repetir | o texto da miniatura **nunca** repete o do título | idem — são duas superfícies de persuasão, não uma |
| Teste A/B de miniatura | até 3 variantes, até 2 semanas, no Studio | idem — **não funciona para Shorts** |

### Onde os longos estão hoje (dados do YouTube Studio, 16/09/2025 → 01/10/2026)

| Vídeo | Impressões de miniatura | CTR | % assistida | Views |
|---|---|---|---|---|
| Mesmo salário por 30 anos… | **7.305** | **0,41%** | 21,9% | 40 |
| Dívida do cartão: sair do vermelho… | **3.854** | **0,36%** | 29,3% | 21 |
| Dois homens, mesmo salário… | 3.765 | 1,25% | 26,9% | 59 |
| Como meu amigo conseguiu aposentar… | 2.137 | 0,61% | 17,7% | 16 |
| Por que um amigo já aposentou… | 764 | 1,31% | 23,9% | 13 |

🔴 **Isto é conclusão, não hipótese: o CTR dos longos está 10 a 13 vezes abaixo da
régua do nicho** (0,36%–1,31% contra 5,5%). E tem amostra para valer — 7.305 e
3.854 impressões passam com folga o mínimo de 300. **O YouTube está a mostrar os
vídeos; é a miniatura e o título que não ganham o clique.** Este é o gargalo nº1
do canal.

⏳ **A percentagem assistida (~24%) NÃO é conclusão.** Está abaixo da régua de 40%,
mas foi medida sobre **13 a 59 visualizações** — muito abaixo de qualquer amostra
mínima. Com esse volume, dois ou três espectadores decidem o número. Dizer *"a
abertura e o ritmo estão errados"* com essa base é inventar defeito
(ver lei nº4 em `SKILL.md`). **Primeiro resolver o clique; a retenção remede-se
quando houver audiência.**

✅ **Isto está no código desde 03/10/2026** (`reguaDoFormato` em `retencao.js`):

| Régua do LONGO | Valor | No código |
|---|---|---|
| Percentagem assistida mínima | **40%** | `RETENCAO_MINIMA_LONGO` |
| Visualizações para a conta valer | **50** | `VISUALIZACOES_MINIMAS_LONGO` |
| CTR de capa mínimo | **4%**, com ≥300 impressões | na secção «O CLIQUE NA CAPA» |

Com o mínimo de 50, **quatro dos cinco longos de hoje ficam em *"ainda não sei"***
— e essa é a resposta certa, não uma falha da medição.

---

## 3. YOUTUBE — SHORTS

**O gargalo do Short é fazer parar.** A miniatura não conta — o vídeo toca sozinho.

| Régua | Valor | Origem |
|---|---|---|
| **Percentagem média assistida — régua da casa** | **70%** | ordem do dono, 06/08/2026 |
| Mínimo de visualizações para julgar | **10** | medido: com 25 só 1 vídeo em 10 era julgado; um aviso que nunca fala é aviso nenhum |
| ⚠️ **No código** | `RETENCAO_MINIMA` / `VISUALIZACOES_MINIMAS` | `src/scripts/youtube/retencao.js` — **não mexer**: `temas-vida.js` e `validar-metadados-short.js` dependem delas |
| Como comparar ganchos | **mediana**, nunca média | medido 17/09: um Short em ciclo deu **20.654%** e sozinho decidia o ranking |
| Mínimo de vídeos por gancho | **3 com audiência** | abaixo disso é sorte |
| Completar o vídeo → promoção agressiva | 70%+ | playbook do `claude-youtube` |
| "Ficou vs passou adiante" | 75%+ bom · **abaixo de 50% = gancho quebrado** | idem |
| Janela do gancho | primeiros **1 a 3 segundos** | idem |
| Trocar de imagem a cada | **3 segundos** | idem |
| Tamanho ideal | 15–60s; os dois picos reais são **13s e 60s** | idem (estudo de 35 mil milhões de visualizações) |
| Título do Short | 4–6 palavras, 20–40 caracteres (corta aos ~40) | idem |
| Hashtags | 3 a 5 | idem |
| 🔴 **Validade algorítmica** | o algoritmo **deixa de empurrar Shorts com mais de ~28-30 dias** | `[set/2025]` playbook do `claude-youtube` |
| Música e receita | cada faixa com direitos **corta a fatia**: 1 faixa = 50%, 2 = 33% | idem |

⚠️ **Percentagem média assistida pode passar de 100% e isso é o melhor sinal que
existe** — o Short repete em ciclo e quem revê conta outra vez. Não é erro.

⚠️ **"Continuaram assistindo" (12,58% no canal) é outra métrica**, não a
percentagem média assistida. Antes de a comparar com a régua dos 75%, confirmar no
Studio qual é exactamente — as duas medem coisas diferentes e trocá-las dá um
diagnóstico catastrófico que pode não existir. **Por confirmar.**

---

## 4. CANAL — onde está hoje

| | |
|---|---|
| Visualizações (todo o período medido) | 3.831 |
| Tempo de exibição | 13,56 horas |
| Inscritos ganhos no período | **7** |
| Impressões de miniatura | 22.690 |
| CTR médio de miniatura | **0,86%** |

**Consequência prática:** com 7 inscritos e 13 horas de exibição, **monetização,
RPM, YPP e patrocínio não são assunto deste canal em 2026** — nem que as réguas
dos repositórios de origem tragam esses números. Foram deixados de fora de
propósito.

---

## 5. Réguas de conteúdo (as que vigiam o que se publica)

| Régua | Valor | Origem |
|---|---|---|
| Número atribuído a instituição | **tem de ter link para o estudo na mesma frase** | Fact Firewall + o que o Google avalia como confiança em conteúdo de finanças |
| Afirmação **técnica** sobre o produto | tem de existir no código, ou sai | conferido 02/10: "criptografia de ponta a ponta" e "offline" **procedem** (AES-GCM em `cloud-sync-engine.ts`) |
| Afirmação **legal** sobre o produto | não se publica sem documento que a sustente | "segue normas como o GDPR" aparece em textos e **não é verificável no código** |
| Abertura de meta descrição | **não** começar por "Descubra/Aprenda/Saiba" | medido 15/09: 82 de 151 descrições em português começavam assim |
| Número na meta descrição | pelo menos um concreto | medido: 107 de 151 não tinham nenhum |
| Comparativo com concorrente | compara **produto contra produto**, com data da análise e critério reproduzível | medido 02/10: o comparativo com um app real compara-o com "papel e planilha" |
| Páginas que são retrato de uma data | ficam **fora** do reescritor de títulos | cotações e índices: título genérico promete o dado de hoje numa página de setembro |

---

## O que foi deliberadamente deixado de fora dos 4 repositórios

| Deixado de fora | Porquê |
|---|---|
| DataForSEO, Ahrefs, vidIQ | pagos e não contratados. Tudo aqui sai do Search Console e da API do YouTube, que já estão ligados |
| Projeções de 30/60/90 dias com números | é inventar número com cara de medição |
| Tabelas de RPM/CPM por nicho | irrelevantes com 13 horas de exibição |
| Modelos de "tipo de canal" (9 arquétipos) | o canal já tem formato definido e medido |
| Audit com 4 agentes em paralelo | custo alto para um canal com 173 vídeos e um blog de 495 textos já inventariados |
| Geração de miniatura por IA (NanoBanana) | a casa já tem o seu próprio caminho de capas |
