# A NOVA NARRATIVA DO VÍDEO LONGO — plano

**Escrito em 01/10/2026**, depois de o dono ver o vídeo do churrasco e dizer:
*"a história não tem uma sequência e progressão gostosa de assistir. Me parece
que já entregamos tudo até bem antes do meio e depois ficamos repetindo o que
falamos antes mas de formas diferentes, e no final fazemos um fechamento
extremamente rápido e o vídeo acaba. Isso eu acho que tem impactado o canal não
deslanchar."*

Nada deste plano foi executado. Ele e o
`docs/VIDEO-LONGO-CHAO-DE-8-MINUTOS.md` são **o mesmo trabalho**: o 4º ato que
dá os 8 minutos é o mesmo que conserta a progressão. Lá está a aritmética da
duração; aqui está a história.

---

## 1. O DIAGNÓSTICO, COM O RELÓGIO NA MÃO

Medido no roteiro real `pequenos-gastos-como-recuperar` (6:49):

| Relógio | O que acontece |
|---|---|
| 00:01 | *"O seu dinheiro some antes do fim do mês?"* — pergunta genérica, **sem número** |
| **00:14** | *"vou te mostrar como enxergar os pequenos gastos e reorganizar esse dinheiro sem abrir mão do que você gosta"* |
| 00:31 | já cita o app |
| **01:33** | **só aqui aparece o número da história (R$ 300)** |
| **03:09** | a solução: separar 120 para o churrasco, 180 para o resto |
| 04:12 | *"deixei cento e vinte reais separados só pra isso"* — **a mesma coisa de 03:09** |
| 06:22 | *"você separa uma parte pros prazeres e outra pro que guarda"* — **a terceira vez** |

**Três factos, não impressões:**

1. **O vídeo conta o fim aos 14 segundos.** O bloco `promessa` é, hoje, a
   *resposta* do vídeo — e é dita no primeiro terço do primeiro minuto.
2. **O susto chega atrasado.** O número da história aterra em 1:33, quando quem
   ouve já sabe como acaba. A ordem está invertida.
3. **A história acaba aos 3 minutos** e os 3:40 seguintes repetem-na.

---

## 2. 🔴 A PEÇA QUE BLOQUEIA A IDEIA — e ela está escrita de propósito

`roteiro-longo.js`, linha 770, dentro do prompt da abertura:

> ⛔ **A ABERTURA NÃO GASTA OS NÚMEROS DA HISTÓRIA.** As parcelas e a soma são a
> DESCOBERTA do ato 1 — dizê-las aqui deixa o ato 1 sem susto nenhum.

**É exactamente o contrário do que o dono quer agora:** *"começar os 5 primeiros
segundos pensando como se fosse um corte viral… você joga no lixo mais de Mil
Reais por ano, e eu vou te provar isso!"*

⚠️ **E a regra não está errada.** Gastar o número do ato 1 na abertura deixa
mesmo o ato 1 sem susto. Apagá-la sem mais nada troca um defeito por outro.

### A reconciliação: são DOIS números, não um

| Onde | Número | Papel |
|---|---|---|
| **abertura (0-5s)** | o do **ANO** — *"mais de três mil e seiscentos reais"* | a **acusação**, dita como aposta: *"e eu vou te provar"* |
| **ato 1 — O SUSTO** | o do **MÊS** — *"trezentos reais"* | a **descoberta**. Continua intacta: é outro número |
| **ato 3 — O PREÇO** | mês × 12 | **paga a prova prometida no segundo 5** |

A regra da linha 770 não se apaga: **aperta-se.** Passa a dizer *"a abertura
gasta UM número, e só um: o do ano. As parcelas e a soma do mês continuam a ser
a descoberta do ato 1."*

> E repare no que isto fecha: o vídeo abre com uma dívida (*"vou te provar"*) e
> **só a paga ao minuto 5**. É isso que impede a história de acabar no meio.

⚠️ **O número do ano tem de entrar na lista fechada de valores do `mapa`.** Há
uma trava que confere que todo número no ecrã está nessa lista; um valor novo
que não esteja lá sai do vídeo em silêncio.

---

## 3. A ESCADA DOS QUATRO ATOS

`MOVIMENTOS`, em `lib/schema-longo.js`, tem três. O quarto entra em **terceiro
lugar**, não no fim:

| | Ato | Entrega | Por que existe |
|---|---|---|---|
| 1 | **O SUSTO** | o número do mês | o gancho |
| 2 | **A ARMADILHA** | por que acontece e não se resolve sozinho | o ensinamento |
| 3 | **O PREÇO** ⭐ novo | o que isso vira num ano, e o que esse dinheiro era | **a escala — e é ele que paga a prova do segundo 5** |
| 4 | **A VIRADA** | o que ele fez de diferente e o que mudou | o alívio |

**Cada ato leva uma proibição**, como os três de hoje já levam — é a máquina que
já funciona e que impediu *"o ato 1 e o ato 2 serem o mesmo domingo"*:

- **O PREÇO** ⛔ não pode dar solução nenhuma. Aqui só se multiplica.
- **A VIRADA** ⛔ não pode voltar a descobrir nem a explicar. Aqui só se AGE.

### Um ensinamento pequeno por ato, e um grande no fim

Pedido do dono: *"vários insights pequenos, mas um insight maior que seria o
tema proposto"*.

`MOVIMENTOS` ganha um campo **`ensinamento`**: a frase que aquele ato tem de
deixar na cabeça de quem vê, e que cabe numa linha. Quatro pequenos, um por
ato — e o grande é o `respostaDaPromessa`, que já existe e hoje é um resumo.

---

## 4. UM MOTIVO NOVO A CADA 30 SEGUNDOS

Pedido: *"os próximos 30 segundos teriam que produzir um impacto tal que esse
telespectador tenha um motivo para assistir os próximos 30 segundos"*.

**Boa notícia: a peça já existe e chama-se `regancho`.** Cada capítulo acaba com
uma ponta no ar, e funciona — *"Faltava só escolher o que ia ficar separado
antes de as contas chegarem"*.

**Má notícia: ela dispara 3 vezes em 6:49 — uma a cada 2 minutos.** No meio, o
bloco `desenvolvimento` corre ~65 segundos sem nada que puxe.

### O que muda

| | Hoje | Proposta |
|---|---|---|
| partes do capítulo | `pergunta` · `desenvolvimento` · `regancho` | iguais |
| regra do `desenvolvimento` | nenhuma sobre ritmo | **a cada ~80 palavras (~30s) alguma coisa NOVA tem de aterrar**: um número, uma consequência, ou uma pergunta. Um trecho de 80 palavras sem nada novo está a repetir |

⚠️ **Isto não se mede com código, e não se vai tentar.** *"Este trecho traz
alguma coisa nova?"* é julgamento — e a regra da casa diz que julgamento se mede
com um **segundo leitor de IA**, não com `regex`. O `lib/segundo-leitor.js` já
existe e já é usado; ganha mais esta pergunta, trecho a trecho.

---

## 5. PARAR DE REPETIR — e há um conserto barato à espera

Existe uma máquina anti-repetição: `jaDito`, em `roteiro-longo.js`. Ela manda ao
modelo tudo o que já foi dito e proíbe repetir ou parafrasear.

**🔴 Só que ela carrega UMA frase por bloco** (linhas 1484 e 1526 —
`frasesDe(...)[0]`, a primeira). Tudo o que vem depois da primeira frase de um
capítulo é invisível para o capítulo seguinte.

**É por isso que a solução é dita três vezes.** A máquina está lá, a trabalhar
com 10% do que devia ver.

**Conserto:** alimentar o `jaDito` com as frases que **carregam informação** —
as que têm número, e a que o ato nomeou como `ensinamento` — e não só a
primeira. Duas linhas, e ataca directamente a queixa *"ficamos repetindo o que
falamos antes mas de formas diferentes"*.

### E uma ordem antiga do dono que muda de sentido

Linha 845: *"a promessa repetida no meio. Aos 3 minutos, lembrar em uma frase o
que a pessoa vai levar"* — ordem dele, de 10/08/2026.

⚠️ **Com a promessa a virar aposta, isto passa a repetir a aposta e não a
resposta**: *"eu disse que ia te provar aqueles três mil e seiscentos — falta
pouco"*. Mantém a retenção que a ordem queria e deixa de entregar o fim a meio.
**Não se apaga a ordem; muda-se o que ela repete.**

---

## 6. O FECHO DEIXA DE SER RESUMO

Hoje: 85-115 palavras (~40s) a recontar o que já se disse — a terceira
repetição medida na secção 1.

Novo trabalho, por esta ordem:
1. **pagar a prova** prometida no segundo 5 (o número do ano, fechado);
2. **entregar o insight grande** — a frase que a pessoa repete a um amigo;
3. o laço aberto, que já existe.

⛔ **Proibição nova:** o fecho não pode voltar a explicar o mecanismo nem a
descrever a solução passo a passo. Isso foi dos atos 2 e 4.

E o orçamento sobe de 85-115 para **100-130 palavras** — o dono disse que o
fechamento é *"extremamente rápido"*, e 40 segundos para pagar a prova mais o
insight grande é pouco.

---

## 7. O ENGAJAMENTO, SEM VIRAR PEDINTE

Pedido: *"agora iremos focar em pedir comentários, pedir engajamento"*.

| | Quantas vezes | O quê |
|---|---|---|
| **pergunta ao público** | 1 por capítulo = **4** | *"faz essa conta aí e vê quanto dá no teu mês"* — uma pergunta, no fim do capítulo |
| **"comenta FINMOOVI"** | **1**, como hoje | o bloco `chamada`, que já existe e já tem a mãozinha |

⚠️ **São coisas diferentes e o prompt tem de as separar**, senão o vídeo vira
cinco pedidos. E a regra da linha 771 — *"a abertura não pede NADA"* — **fica
como está**: os 5 primeiros segundos são para prender, não para pedir.

---

## 8. O QUE ISTO FAZ À DURAÇÃO

Pela fórmula de `VIDEO-LONGO-CHAO-DE-8-MINUTOS.md`
(`13,2 + 5 × capítulos + 0,396 × palavras`):

| | capítulos | palavras | duração |
|---|---|---|---|
| hoje, o churrasco | 3 | 993 | 7,03 min |
| com o 4º ato, no mínimo do orçamento novo | 4 | 1152 | **8,16 min** ✅ |
| com o 4º ato, no máximo | 4 | 1390 | 9,73 min |

O chão de 8 minutos **não é um alvo à parte: é o que sai de contar a história
inteira em vez de a contar uma vez e repeti-la.**

---

## 9. A ORDEM, E AS PROVAS

1. ✅ **FEITO 01/10/2026 — `lib/schema-longo.js`** — o 4º movimento (O PREÇO,
   em 3º lugar) com a sua proibição · o campo `ensinamento` nos quatro atos ·
   `NUM_CAPITULOS` 3 → 4 · os mínimos do `ORCAMENTO` (chão 1147 palavras =
   **8,12 min**) · o fecho 85-115 → 100-130.
   ✅ **`roteiro-longo.js`** — o mapa-exemplo com QUATRO capítulos (o exemplo é
   quem ensina), o valor do ano na lista fechada, a demonstração mudada do
   capítulo 2 para o 4, as frases *"seis minutos"* e *"três ATOS"* varridas, e
   os exemplos de capítulo e de fecho esticados para caberem no orçamento novo.
   ✅ **`validar-roteiro-longo.js`** — a agulha dos atos passou a exigir
   `O PREÇO` pelo meio; o vídeo de prova deixou de ter `[1,2,3]` à mão; o índice
   da demonstração sai do mapa em vez de estar cravado a `1`.
   **Provas:** 175 verdes · 0 vermelhas (igual ao estado anterior) · o caso
   falso (renomear o ato) fica vermelho · um roteiro antigo de 3 capítulos ainda
   monta sem erro.
2. ✅ **FEITO 01/10/2026 — a abertura e a aposta.**
   · a regra da abertura **apertada em vez de apagada**: gasta UM número, o do
     ANO, e mais nenhum;
   · a 1ª frase passou a ser **uma acusação com valor em dinheiro**, a 2ª a
     dívida *"e eu vou te provar isso"*, e só depois a cena (a ordem de 08/08
     — *"abre pelo que se VÊ"* — continua válida, mudou o que vem à frente);
   · a **promessa deixou de ser a resposta e passou a ser a aposta**, no mapa e
     no exemplo;
   · a abertura ficou **proibida de contar a solução** — era o 00:14 medido;
   · o **fecho paga a dívida do primeiro segundo** antes de responder, e está
     proibido de recontar os passos;
   · `validarAbertura` ganhou duas medidas reais (valor em dinheiro na 1ª frase
     · a dívida assumida), **como AVISO e não erro** — uma trava nova que
     reprova em cascata já custou semanas de vídeo a esta casa.
   **Provas:** 179 verdes · 0 vermelhas · a abertura antiga dispara os 2 avisos,
   a nova dispara 0.
   ⚠️ **O caso falso apanhou um defeito meu:** a 1ª versão da trava do número
   aprovava *"a conta chega todo dia dez"* — o extractor lê `[10]` numa data.
   Agora exige o valor **e** a palavra que o torna dinheiro.
   ⬜ **Fica para o passo 3:** a promessa-do-meio (linha ~845) ainda repete a
   promessa antiga em vez da aposta, e a pergunta ao público por capítulo.
3. ✅ **FEITO 01/10/2026 — a cadência e o engajamento.**
   · o **lembrete do meio** (ato 2) passou a lembrar **a aposta por pagar** em vez
     da solução — a ordem de 10/08 continua de pé, mudou **o que** ela repete;
   · o `desenvolvimento` ganhou a regra dos **~80 palavras (~30s)**: em cada
     pedaço tem de aterrar um número, uma consequência, uma pergunta ou uma
     viragem — e está escrito o que NÃO conta (a mesma coisa por outras palavras);
   · o `regancho` passou a **atirar uma pergunta a quem vê**, uma só, como última
     frase — e o exemplo mostra-a, senão o modelo não a faz;
   · ⚠️ **pergunta ≠ pedido**: "comenta/inscreve/curte/link" continuam proibidos
     em todos os capítulos e o computador confere. O pedido é UMA vez, no bloco
     da chamada, como já era.
   ⚠️ **O editor é o `lib/leitor-longo.js`, não o `segundo-leitor.js`** — este
   último serve o Short. Ele ganhou a *leitura dos trinta segundos*, com a
   algema certa: ao achar um pedaço vazio **aperta, nunca inventa facto**.
   **Provas:** 183 verdes · 0 vermelhas · caso falso (reescrever a regra) fica
   vermelho.
   ⚠️ **E apanhou-se um buraco antigo:** a prova só olhava o pedido do ato 1, e
   o ato do MEIO tem um pedido diferente — qualquer regra escrita lá dentro
   passava despercebida. Agora mede os dois (`capituloDoMeio`).
4. ✅ **FEITO 01/10/2026 — a repetição.**
   · o `jaDito` passou a levar também **as frases do desenvolvimento que têm
     dinheiro** (as últimas quatro). As três que já lá estavam apanham a
     *moldura* do capítulo (como abre, como fecha, como demonstra) e nenhuma
     apanhava o *miolo* — e o miolo é onde a solução vive. No churrasco, a
     solução foi dita às 03:09, 04:12 e 06:22, sempre no meio do
     desenvolvimento, o único sítio que esta lista nunca via;
   · o cabeçalho do bloco passou a dizer **"o que não pode voltar é a IDEIA,
     não o NÚMERO"** — sem isso, a lista nova leria como uma proibição de dizer
     valores, que é o contrário do que o vídeo precisa.
   🔴 **E apanhou-se um defeito ANTERIOR a este trabalho, da mesma família:**
   `numerosUsados.push(...plano.valoresPermitidos)` mandava para os "números já
   gastos" **a lista inteira do que o capítulo podia dizer — incluindo o
   número-espinha**, que o mesmo pedido obriga a dizer em todos os atos. Prompt
   contra validador, no mesmo parágrafo. Agora gasta-se só o `oNumeroDoAto` do
   ato, e nunca o espinha (`numeroReveladoPor`, exportada para ser medida).
   **Provas:** 188 verdes · 0 vermelhas · caso falso (apagar a guarda) fica
   vermelho.
   ⚠️ **E o caso falso apanhou uma prova minha que era um "sim a tudo":** das
   três que escrevi, só a que **constrói o caso mau à mão** acusou — as outras
   passam com e sem a guarda, porque o mapa-exemplo nunca cai no caso que ela
   protege. Ficaram, com o nome `(retrato, não trava)`.
5. ✅ **FEITO 01/10/2026 — a trava de chão.**
   · `srt-longo.js` ganhou `CHAO_DO_VIDEO_SEC` (8:00) e `duracaoDoVideoSec()`,
     **construída por cima do `iniciosDasCenas` que já existe** — a mesma conta
     que escreve os capítulos da descrição e corta o render, nunca uma 2ª cópia;
   · `montar-longo.js` passou a **imprimir a duração prevista em toda corrida** e
     a gritar quando fica abaixo, dizendo quantas palavras faltam;
   · `validar-roteiro-longo.js` ganhou a trava (plano curto tem de reprovar) e um
     retrato (o orçamento novo dá mesmo 8 minutos).
   ⚠️ **AVISA, mas só TRAVA com `--exigir-chao`** — e é decisão, não esquecimento:
   fazer o montador morrer aqui é a semana ficar **sem vídeo**, e este repositório
   já tem semanas assim por travas novas a reprovar em cascata. **O travão está
   pronto; ligá-lo no robô é uma decisão do dono, com esse custo à frente.**
   ⚠️ `SIGNATURE_FRAMES` e `TELA_FINAL_FRAMES` tiveram de ser declarados no
   `srt-longo.js` para a conta fechar — e entraram **no mesmo dia** na lista de
   espelhadas de `validar-publicacao-longo.js`, senão seriam cópia fora da trava.
   **Provas:** 191 verdes · 0 vermelhas · o roteiro do churrasco **reprova com
   7:02** (era o caso falso que o plano pedia) · `--exigir-chao` sai com erro 1 ·
   divergir o `srt-longo.js` em 1 fotograma fica vermelho.

### Como se prova que funcionou — e nenhuma destas é "o robô correu sem erro"

- **A tabela do relógio da secção 1, refeita** com o roteiro novo. O número do
  ano tem de estar **antes dos 5 segundos**; a solução **depois dos 4 minutos**.
- **Contar as repetições:** nenhuma frase com número pode aparecer duas vezes
  com palavras diferentes. É a queixa, medida.
- **O caso falso de controlo:** correr a trava de chão contra o roteiro do
  churrasco **como está hoje** (7,03 min) e exigir **vermelho**. Uma trava que
  aprova o que já existe não está a medir nada.
- **O dono lê o roteiro antes de haver vídeo.** São ~1150 palavras; ler custa 5
  minutos e um render custa 36. É aqui que se apanha "a história não cresce",
  que é a única coisa que nenhuma trava mede.
