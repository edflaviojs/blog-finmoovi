---
name: finmoovi-crescimento
description: >
  A régua da casa para o blog e o canal do YouTube do FinMoovi. Use SEMPRE antes de
  olhar número do Search Console ou do YouTube Studio, antes de dizer que uma página
  ou um vídeo "tem oportunidade", antes de mexer em título, descrição, miniatura,
  gancho ou abertura, e antes de propor mais conteúdo. Também use para a rotina de
  acompanhamento (semanal e mensal) e para decidir se um número é sinal ou acaso.
  Dispara em: "SEO", "Search Console", "GSC", "blog", "posição", "cliques",
  "impressões", "CTR", "canal", "YouTube", "Shorts", "vídeo longo", "retenção",
  "miniatura", "gancho", "tema", "backlink", "por que não cresce", "o que fazer
  agora", "analisar o canal", "auditar o blog".
metadata:
  version: 1.0.0
  criada: 2026-10-02
  origem: destilação de 4 repositórios externos + 8 meses de medições do próprio projeto
---

# FinMoovi — crescimento do blog e do canal

> Esta skill não gera conteúdo. Ela **decide se um número quer dizer alguma coisa**
> antes de alguém agir sobre ele. É o passo que faltava: a casa já mede muito
> (84 robôs), já escreve muito (495 textos, 173 vídeos) e **já se enganou várias
> vezes a ler o que mediu**.

## Antes de tudo: a pergunta que corta 90% do trabalho errado

> **O problema é "ninguém clica" ou é "ninguém vê"?**

São doenças diferentes, com remédios opostos, e confundi-las já custou três
semanas a este projeto:

| | Sintoma | Remédio |
|---|---|---|
| **Ninguém vê** | posição 50–90, ou impressões concentradas num pico | autoridade: backlinks, ativo que valha link, contacto humano |
| **Ninguém clica** | posição 1–10 **confirmada no país-alvo**, em telemóvel, sustentada no tempo | título, descrição, miniatura |

🔴 **Em 02/10/2026 foi medido: o blog tem "ninguém vê".** No Brasil, as páginas
mais vistas estão na **posição 70 a 90** (página 7 a 9 do Google). Mexer em título
nessa posição não muda nada. Qualquer plano que comece por "melhorar título e meta
descrição das páginas de oportunidade" está a tratar a doença errada — **incluindo
planos escritos por outras IAs com os mesmos dados.**

**Ver `references/FILTRO-DE-REALIDADE.md` antes de responder a esta pergunta.**
Não se responde por memória, nem pela tabela que o Search Console mostra primeiro.

## O roteiro — nesta ordem, sem saltar

1. **Ler o que já está registado.** As memórias do projeto e os relatórios já no
   repositório (`press/fact-guard.md`, `.github/data/*.json`, registos das
   corridas). Procurar fora não substitui ler o que já está escrito dentro.
2. **Aplicar o filtro de realidade** aos números (`references/FILTRO-DE-REALIDADE.md`).
3. **Comparar com a régua certa para aquela superfície** (`references/REGUAS.md`).
   Blog, Short e vídeo longo têm réguas **diferentes**. Trocá-las inventa defeito.
4. **Ver se já existe robô que faz isso** (`references/MAPA-DOS-ROBOS.md`) antes de
   propor robô novo. Quase sempre existe — e muitas vezes o problema é que ninguém
   lê o que ele escreve.
5. **Só então** recomendar — com o número que sustenta a recomendação ao lado.

## As quatro rotinas contínuas

O que o Ed pediu: *mecanismos de análise contínuos*. Não é um robô novo por semana
— é **ler, com régua, o que já é medido**, em três cadências.

### 🗓️ Toda segunda — "o que mudou e o que isso obriga a fazer"

| Ler | Onde | Pergunta que responde |
|---|---|---|
| Retenção dos Shorts | registo da corrida `youtube-retencao.yml` + `.github/data/youtube-retencao.json` | que gancho segura gente? algum vídeo abaixo da régua? |
| **O clique na capa** | mesma corrida, secção «O CLIQUE NA CAPA» | que vídeo longo aparece muito e é clicado pouco? (régua: 4%, mínimo 300 impressões) |
| Relatório do blog | `analytics-report.yml` (11h UTC) | de onde vem o tráfego e para onde vai |
| Fact Firewall | `press/fact-guard.md` | quantos textos afirmam número sem fonte |

**Entrega:** no máximo **3 ações**, cada uma com o número que a justifica. Se nada
passar o filtro de realidade, a entrega é *"esta semana não há o que decidir"* —
e isso é uma entrega válida. Inventar ação é pior que não ter ação.

### 🗓️ Todo dia 1 — "a forma do mês"

Correr à mão o **Raio-X das aparições** (GitHub → Actions → *«GSC — Raio-X das
aparições (à mão)»*, só leitura) e responder:

- As aparições estão **espalhadas** pelos dias ou foram um **pico**?
- Vêm de **telemóvel** ou quase só de **computador**?
- Vêm do **país-alvo** ou de países que não falam a língua da página?
- A posição no **país-alvo** é a mesma que a posição média global?

Sem estas quatro respostas, **nenhuma conclusão de SEO é válida**. Foi a falta
delas que fez a casa perseguir uma "oportunidade na posição 8" que era um robô
francês.

### 🗓️ Quando um vídeo faz 7 dias — "a leitura do vídeo"

Shorts e longos têm **réguas e gargalos diferentes** (ver `references/REGUAS.md`):

- **Short:** o gargalo é **fazer parar**. Mede-se por *percentagem média assistida*
  e por *ficou vs passou adiante*. Miniatura não conta — o Short toca sozinho.
- **Longo:** o gargalo é **fazer clicar**. Mede-se por **CTR da miniatura** e
  **percentagem assistida**. ✅ **Passou a ser medido a 02/10/2026** — sai no
  relatório de segunda, secção «O CLIQUE NA CAPA». Vem da Reporting API, não da
  Analytics; ver o buraco nº1 em `references/MAPA-DOS-ROBOS.md`.

### 🔁 Sempre que um robô muda um título ou acrescenta uma secção

Registar **antes e depois** e **a data**, e não voltar a mexer na mesma página por
**21 dias**. Um título novo precisa de 2 a 3 semanas para o Search Console dizer
alguma coisa. Reescrever antes apaga a experiência antes de ela responder — e a
casa fica a trocar de nome para sempre sem saber qual nome funcionou.

## As sete leis da casa

Nasceram todas de erro pago, e cada uma anula um tipo de conclusão falsa.

1. **Mediana, nunca média, quando um caso extremo pode decidir sozinho.**
   Um Short esquecido em ciclo deu 20.654% de percentagem assistida e punha o
   gancho dele em primeiro lugar. A mediana não se move com isso.
2. **Amostra mínima antes de julgar.** Abaixo de ~10 visualizações a percentagem é
   acaso. Abaixo de ~3 vídeos por gancho, o ranking é sorte. Dizer *"ainda não
   sei"* é resposta; fingir que sabe não é.
3. **Teste que diz "sim" a tudo não é informação.** Toda prova leva um caso falso
   de controlo. Uma busca interna que devolve 11 resultados para "finmoovi" e 11
   para uma palavra inventada não provou nada.
4. **Régua grossa demais inventa defeito; fina demais cria alarme que ninguém lê.**
   O Fact Firewall de hoje marca *"ajuste o limite de acordo com a realidade da sua
   família"* como estatística sem fonte. Por isso o relatório tem 66 avisos e
   ninguém o abre.
5. **Verde não prova entrega.** Robô que acaba bem pode não ter produzido nada.
   Contar o resultado, não ler o estado da corrida.
6. **Número sem fonte rastreável sai do texto.** Em finanças isso não é
   formalidade — é o que o Google avalia como confiança. Medido em 02/10: **31
   frases em 24 textos** atribuem uma percentagem ao Banco Mundial, à Investopedia,
   à OCDE, ao IBGE ou à Serasa **sem link na frase** — 70% de todas as atribuições
   numéricas do blog.
7. **Afirmação sobre o produto precisa existir no produto — e ser verificável.**
   Conferido a 02/10 no código do app: *"criptografia de ponta a ponta"* **procede**
   (AES-GCM com chave derivada da senha, os registos saem cifrados do aparelho) e
   *"funciona offline"* **procede**. Mas *"segue normas como o GDPR"* é uma
   afirmação **legal**, que nenhum código prova — essa sai, ou passa a dizer o que
   é verdade: os dados ficam no aparelho e o que vai para a nuvem vai cifrado.

## O que esta skill NÃO faz

- **Não propõe mais volume.** Já foi medido: de 20/07 a 28/09 os textos foram de
  204 para 492 (**+141%**) e as aparições na busca ficaram **planas**. Mais texto
  não é o remédio da doença que o blog tem.
- **Não usa dados pagos.** As skills de origem assumem DataForSEO, vidIQ e Ahrefs.
  Nenhum está contratado. Tudo aqui sai do Search Console, da API do YouTube e dos
  ficheiros do repositório — que são de graça e já estão ligados.
- **Não projeta números futuros.** As skills de origem pedem "meta de 90 dias" com
  valores. Isso é inventar número com cara de medição.
- **Não fala de monetização do canal.** 7 inscritos e 3.831 visualizações: RPM,
  YPP e patrocínio não são o problema deste canal em 2026.

## Ficheiros desta skill

| Ficheiro | Para quê |
|---|---|
| `references/FILTRO-DE-REALIDADE.md` | os quatro cortes que separam gente de robô, com os comandos |
| `references/REGUAS.md` | todos os números de referência, com a origem de cada um |
| `references/MAPA-DOS-ROBOS.md` | os 84 robôs, o que cada um mede, e os 5 buracos |

**Status:** em uso desde 02/10/2026
