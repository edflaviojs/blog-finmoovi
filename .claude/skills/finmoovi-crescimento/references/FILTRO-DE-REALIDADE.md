# O filtro de realidade — os quatro cortes

> **Nenhum número do Search Console ou do YouTube vale como prova antes de passar
> por aqui.** Isto não é zelo: em 02/10/2026 um plano inteiro de SEO ficou sem
> chão quando se descobriu que a "oportunidade" que o guiava desde setembro era
> tráfego de robô.

## Porque isto existe — o caso que pagou a lição

O blog tinha uma página com **1.164 aparições na busca, posição média 8, zero
cliques**. Zero cliques na posição 8 não é normal — logo, parecia um problema de
título. O título foi reescrito à mão a 15/09. Nada mudou. Conclusão natural:
*"nem com o título certo as pessoas clicam"*.

**Estava tudo errado.** O raio-x das aparições mostrou:

| O que se via | O que era |
|---|---|
| 1.164 aparições em 28 dias | **1.161 delas em 7 dias** (04→10/09); 3 no resto dos 90 dias |
| "o público não clica" | **1.163 em computador, 1 em telemóvel** |
| busca em português | França 421, Alemanha 280, Marrocos 122, Argélia 103, Áustria 94, Bélgica 93 — **o Brasil nem entra no top 10** |
| "o conserto de 15/09 falhou" | **o pico acabou a 10/09** — cinco dias ANTES do conserto. Não havia procura para medir |
| posição 8 | no Brasil, as páginas reais estão na **posição 70 a 90** |

E mais: **"zero cliques" também era falso.** O relatório media por *busca*, e o
Google esconde as buscas raras por privacidade — os cliques delas desaparecem da
conta. Medido por *país*, a mesma janela deu **8 cliques**. Continua a ser quase
nada, mas dizer *zero* levou a diagnósticos errados.

---

## Corte 1 — A FORMA NO TEMPO

**Pergunta:** as aparições estão espalhadas pelos dias ou foram um pico?

Procura de gente é **contínua** e tem forma de semana (cai no fim de semana).
Robô é **pico**: aparece do nada, fica dias, desaparece.

```js
// dia a dia, janela larga de propósito — 90 dias
dimensions: ['date'], rowLimit: 200, filters: <a busca ou a página>
```

**Régua:** se mais de **70% das aparições** caírem em **menos de 10 dias** dentro
de uma janela de 90, trate como pico. **Pico não é oportunidade** — é um evento
que já passou.

## Corte 2 — O APARELHO

**Pergunta:** vem de telemóvel ou quase só de computador?

No Brasil, busca de finanças pessoais é esmagadoramente de telemóvel. Uma busca em
português com **99% de computador** não é gente brasileira.

```js
dimensions: ['device'], rowLimit: 10, filters: <a busca ou a página>
```

**Régua:** acima de **90% em computador** numa busca em português = desconfiar e
não agir até o Corte 1 e o Corte 3 confirmarem.

⚠️ Vale para o blog todo, não só para uma página. Nos dados do Search Console de
julho a setembro de 2026: **11.965 impressões em computador contra 3.046 em
telemóvel** — 79% em computador, com posição média 56. Isso é a assinatura do
mesmo problema, à escala de todo o site.

## Corte 3 — O PAÍS

**Pergunta:** vem do mercado que a página serve?

```js
dimensions: ['country'], rowLimit: 100
// e a posição REAL no país-alvo:
filters: [{ filters: [{ dimension: 'country', operator: 'equals', expression: 'bra' }] }]
```

**Régua:** a **posição média global não serve para decidir nada**. A posição que
conta é a do país-alvo da página — `bra` para `pt`, e os mercados de língua
inglesa e espanhola para `en`/`es`. A diferença medida foi de **posição 8 global
contra posição 84 no Brasil** na mesma página.

## Corte 4 — A AMOSTRA MÍNIMA

**Pergunta:** há número suficiente para a conta querer dizer algo?

| Superfície | Mínimo para julgar | Porquê |
|---|---|---|
| Página na busca | **30 aparições no país-alvo**, espalhadas por ≥10 dias | abaixo disso, a posição média oscila sozinha |
| Short | **10 visualizações** | abaixo disso, bastou uma pessoa fechar cedo |
| Gancho de Short | **3 vídeos com audiência** | abaixo disso o ranking é sorte |
| Vídeo longo | **300 impressões de miniatura** | CTR com 50 impressões não distingue 1% de 4% |
| Comparação antes/depois | **14 dias de cada lado**, colados à mudança | janelas de tamanhos diferentes não se comparam |

**Quando não há amostra, a resposta é "ainda não sei".** Isso é uma entrega.

---

## Os mesmos quatro cortes no YouTube

| Corte | No YouTube |
|---|---|
| Forma no tempo | um Short pode arrancar ao **4.º dia**. Julgar às 24h é cedo. E a partir de **~28-30 dias** o algoritmo deixa de empurrar Shorts — número velho não se compara com número novo |
| Aparelho | não se aplica da mesma forma; o que o substitui é **separar Short de longo** (ver `REGUAS.md`) |
| País | a receita e o alcance mudam muito por país, mas com 3.831 visualizações isto ainda não decide nada |
| Amostra mínima | **mediana, nunca média**: um Short esquecido em ciclo deu 20.654% de percentagem assistida e sozinho punha o gancho dele em primeiro |

---

## Como correr o raio-x

GitHub → **Actions** → **«GSC — Raio-X das aparições (à mão)»** → *Run workflow*.
Só lê, não escreve ficheiro, não empurra nada. O resultado fica no registo da corrida.

🔴 **Buraco conhecido:** `src/scripts/automacoes/gsc-raio-x-aparicoes.js` tem as
datas **escritas à mão no código** (`FIM = '2026-09-29'`) e a página e a busca
investigadas também. Correr hoje mede setembro. **Para virar rotina mensal, as
datas têm de passar a ser calculadas** (últimos 28 dias, menos os 3 dias de atraso
do Search Console) e a página/busca têm de vir por parâmetro. Está listado em
`MAPA-DOS-ROBOS.md`.

## ✅ Os quatro cortes estão no código desde 02/10/2026

Três robôs deste repositório — terça, quarta e quinta — escolhiam páginas para
reescrever ou acrescentar texto **com base em posição e impressões globais**. Agora
passam por `filtrarCandidatasReais()` em `src/scripts/lib/gsc-posts.js`, que aplica
os quatro cortes e **troca a posição global pela posição no mercado**.

| | |
|---|---|
| Ligar/desligar | `GSC_FILTRO_REALIDADE=0` desliga e diz que está desligado |
| Provas | `tests/filtro-de-realidade.test.js` — 9, com três casos de controlo legítimos |
| Fora de propósito | o robô de sexta (canibalização): só acrescenta link interno |

Detalhe e o que ainda falta: buracos 2 e 7 em `MAPA-DOS-ROBOS.md`.

⚠️ **Isto não dispensa o raio-x à mão.** O filtro protege os robôs; a leitura do
mês continua a ser trabalho de quem olha — e o relatório de segunda-feira ainda
mostra a posição global, que é de onde saiu o engano original.
