# O CHÃO DE 8 MINUTOS NO VÍDEO LONGO — plano

**Escrito em 01/10/2026**, a pedido do dono: *"vamos montar plano pra que o
vídeo nunca fique abaixo dos 8 minutos, o que é bom! E resolve esse nosso
problema de querer fazer tudo muito corrido"*.

Nada deste plano foi executado. O que já foi executado hoje, e **já conta para
o alvo**, é o alargamento do cartão de capítulo (78 → 150 fotogramas): +7
segundos por vídeo.

> 🔴 **ESTE DOCUMENTO É METADE DO TRABALHO.** A outra metade — e a que manda —
> é `docs/VIDEO-LONGO-NOVA-NARRATIVA.md`: o 4º capítulo que dá os minutos é o
> mesmo que conserta a progressão da história (*"entregamos tudo antes do meio
> e depois ficamos repetindo"*). **Aqui está a aritmética; lá está a história.**
> Executar este sozinho dá um vídeo de 8 minutos com o mesmo defeito, só que
> mais comprido.

Ver também `docs/BONECO-NO-VIDEO-LONGO.md` para o outro trabalho em curso.

---

## 1. A FÓRMULA DO TAMANHO DO VÍDEO

Tudo o que decide a duração está em quatro parcelas, e três delas são fixas:

| Parcela | Quanto | Vem de |
|---|---|---|
| abertura + assinatura + tela final | **13,4 s** | `VOZ_ENTRA_FRAMES` 27 · `SIGNATURE_FRAMES` 75 · `TELA_FINAL_FRAMES` 300 |
| cartões de capítulo | **5,0 s × nº de capítulos** | `CARTAO_CAPITULO_FRAMES` 150 *(era 78 até hoje)* |
| a fala | **palavras ÷ 2,6** | `PALAVRAS_POR_SEGUNDO` em `lib/schema-longo.js` |
| o respiro entre cenas | **(cenas − 1) × 0,21 s** | `RESPIRO_SEC` |

Com ~18 palavras por cena (medido no vídeo do churrasco: 993 palavras em 55
cenas), isto reduz-se a uma linha:

> **duração (s) ≈ 13,2 + 5 × capítulos + 0,396 × palavras**

Conferida contra o real: o churrasco tem 3 capítulos e 993 palavras →
28,2 + 393,5 = **421,7 s = 7,03 min**. É exactamente o que o render dá.

---

## 2. 🔴 O ACHADO: HOJE O VÍDEO NÃO CHEGA A 8 MINUTOS NEM NO MELHOR CASO

O orçamento de palavras está em `ORCAMENTO`, em `lib/schema-longo.js`. São
3 capítulos (dois normais + um com demonstração):

| Bloco | mín | máx |
|---|---|---|
| abertura | 90 | 120 |
| capítulo × 2 | 190 | 265 |
| capítulo com demonstração | 230 | 320 |
| chamada | 22 | 40 |
| fecho | 85 | 115 |
| **soma** | **807** | **1125** |

Passando pela fórmula:

| | palavras | duração |
|---|---|---|
| o chão de hoje (tudo no mínimo) | 807 | **5,80 min** |
| o churrasco, que é o real | 993 | 7,03 min |
| o tecto de hoje (tudo no máximo) | 1125 | **7,90 min** |

> **Nem com todos os blocos no máximo o vídeo passa dos 8 minutos.** Mexer só
> nos mínimos não resolve: o tecto também está abaixo do alvo. Para 8 minutos
> com 3 capítulos seriam precisas **1140 palavras**, e o tecto é 1125.

---

## 3. O LEVANTE PRINCIPAL: UM QUARTO CAPÍTULO

`NUM_CAPITULOS = 3`. Passar a **4** acrescenta, de uma vez:

- um capítulo inteiro — 190 a 265 palavras = **73 a 102 segundos**;
- mais um cartão de capítulo — **5 segundos**.

**Total: +78 a +107 segundos.** O churrasco passaria de 7,03 para **8,3–8,8
minutos**, e com conteúdo, não com enchimento.

### Por que isto é melhor do que esticar os blocos que já existem

Está escrito no próprio código, medido em corridas reais: quando se pede ao
modelo um bloco maior, **ele não conta palavras**. Sete tentativas do capítulo
da demonstração deram *297, 306, 310, 320, 339, 348* contra um pedido de
215-285, e *"o corretivo «CORTE 35 palavras» foi respondido com um texto
MAIOR"*. Houve semanas em que o vídeo não saiu por causa disso.

Um capítulo **a mais** não pede isso a ninguém: pede ao modelo mais um bloco
**do tamanho que ele já escreve bem**. Contorna o modo de falha em vez de o
provocar.

### ⚠️ O que isto exige, e é a única decisão que não é minha

`MOVIMENTOS` tem **três** atos, com nome e com proibição: **O SUSTO** (o número
aparece) · **A ARMADILHA** (o mecanismo que a pessoa não conhece) · **A
VIRADA** (o que ele fez diferente). Um quarto capítulo sem um quarto movimento
cai no defeito que já aconteceu uma vez e está documentado: *"o ato 1 e o ato 2
eram o mesmo domingo, a mesma fatura e a mesma soma"* — uma história contada
duas vezes.

Três candidatos a 4º ato, por ordem do que recomendo:

1. **O PREÇO** — entra entre a ARMADILHA e a VIRADA. O que custa continuar
   assim mais um ano, em dinheiro. *Recomendado:* é o ato que falta à história
   (hoje salta-se do mecanismo direto para a solução), e é onde os números
   grandes vivem — exactamente o tipo de cena que mais prende.
2. **A PROVA** — depois da VIRADA. Como ficou o mês seguinte, com o número.
3. **O PRIMEIRO PASSO** — depois da VIRADA. O que fazer amanhã de manhã.

---

## 4. SUBIR OS MÍNIMOS — É O QUE TORNA O CHÃO UM CHÃO

Com 4 capítulos (três normais + um com demonstração) e os mínimos de hoje, o
pior caso ainda é **7,14 min**. O que garante o chão são os **mínimos**, não os
máximos:

| Bloco | mín hoje | mín proposto |
|---|---|---|
| abertura | 90 | **110** |
| capítulo × 3 | 190 | **220** |
| capítulo com demonstração | 230 | **260** |
| chamada | 22 | 22 *(é um recado, não mexe)* |
| fecho | 85 | **100** |
| **soma** | 997 | **1152** |

| | palavras | duração |
|---|---|---|
| chão novo | 1152 | **8,16 min** ✅ |
| tecto novo | 1390 | 9,73 min |

**Os máximos não mexem.** Já estão calibrados à força em cima do que o modelo
escreve de facto; subi-los convidaria o vídeo a passar dos 10 minutos.

> ⚠️ E subir os **mínimos** é o movimento seguro, justamente porque o modelo
> tende a escrever **a mais**. Nenhuma das sete medições do capítulo da
> demonstração ficou abaixo de 297 palavras com um mínimo pedido de 215.

---

## 5. A TRAVA QUE FALTA — SENÃO ISTO NÃO É UM CHÃO, É UMA ESPERANÇA

Hoje **nada no pipeline mede a duração final contra um alvo.** Um vídeo de 6
minutos sai, é publicado, e ninguém sabe — que é o mesmo modo de falha do resto
da casa: *o verde não prova nada*.

Acrescentar a `validar-roteiro-longo.js`, com a fórmula da secção 1:

- ❌ **vermelho** se o plano montado der **menos de 8:00**;
- ⚠️ **aviso** se passar de **10:00** (o YouTube não se importa, mas o nosso
  orçamento de render sim — são ~10 mil fotogramas hoje);
- e **escrever o número em todas as corridas**, mesmo quando passa. Um chão que
  só fala quando parte não deixa ver que está a encostar.

**O caso falso de controlo é obrigatório:** correr a trava contra o roteiro do
churrasco **como ele está hoje** (7,03 min) e exigir que ela fique **vermelha**.
Uma trava que aprova tudo o que lhe dão não está a medir nada.

---

## 6. O QUE NÃO ENTRA NESTE PLANO, DE PROPÓSITO

- **Falar mais devagar.** Baixar `PALAVRAS_POR_SEGUNDO` alonga o vídeo sem
  acrescentar nada — é a definição de enchimento, e é a queixa original do dono
  pelo avesso.
- **Mais respiro entre cenas.** `RESPIRO_SEC` já desceu de 0,35 para 0,21 por
  conta medida; subi-lo devolve 6 a 7 segundos de **silêncio**, e tempo morto é
  onde a audiência sai. O respiro que o dono pediu é outro: é o do cartão de
  capítulo, que **já foi dado** (+7s, secção 1).
- **Repetir b-roll para encher.** Os tetos por tela existem por causa disto.

---

## 7. A ORDEM

1. ⬜ **decidir o 4º ato** — é a única coisa que depende do dono *(secção 3)*;
2. ⬜ `NUM_CAPITULOS` 3 → 4 e o 4º movimento em `lib/schema-longo.js`;
   ⚠️ **varrer os textos do prompt em `roteiro-longo.js`** — há frases com
   *"seis minutos"* e *"três ATOS"* escritas à mão (linhas ~644, ~666, ~815)
   que o `NUM_CAPITULOS` não alcança;
3. ⬜ subir os mínimos do `ORCAMENTO` *(secção 4)*;
4. ⬜ a trava de chão + o caso falso de controlo *(secção 5)*;
5. ⬜ **gerar um vídeo inteiro e cronometrá-lo** — a conta da secção 1 é uma
   previsão; só o render é prova.
