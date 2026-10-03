# DÍVIDA — o que ficou por fazer no blog e no canal, e por quê

> **Para que serve este ficheiro:** guardar o que foi **decidido deixar para
> depois**, com o motivo e com a data em que vale a pena voltar. Não é lista de
> desejos nem de ideias — só entra aqui o que já foi diagnosticado, medido, e
> conscientemente adiado.
>
> **Regra:** item sem *porquê* e sem *quando reavaliar* não entra. Item
> resolvido **sai daqui** (vai para o histórico do git), não fica marcado como feito.

**Criado em:** 2026-10-03 · **Última atualização:** 2026-10-03

> Irmão deste ficheiro, do lado do aplicativo:
> `backup-app-22052025/.claude/docs/DIVIDA-TECNICA.md`.
> A régua de leitura dos números vive na skill `.claude/skills/finmoovi-crescimento/`.

---

## A. Dívida técnica

### A1. 🟡 O raio-X das aparições tem as datas escritas à mão

**Estado:** aberto · **Reavaliar:** na próxima vez que for preciso ler o mês

`src/scripts/automacoes/gsc-raio-x-aparicoes.js` traz `FIM = '2026-09-29'`,
`INICIO = '2026-09-02'`, e até a página e a busca investigadas estão fixas no
código (`PAGINA_CHAVE`, `BUSCA_CHAVE`).

**Correr hoje mede setembro.** Foi escrito para responder a uma pergunta de um dia
— e respondeu: foi ele que provou que a «oportunidade na posição 8» era um pico de
robôs. Mas **não é ainda uma rotina**.

**Por que foi adiado:** é o nosso melhor instrumento e funciona. Mexer nele sem
necessidade é risco sem ganho; ele só é usado à mão, por decisão.

**Como fazer quando chegar a hora:** calcular a janela (últimos 28 dias menos os 3
de atraso do Search Console) e receber página/busca por parâmetro do workflow.

---

### A2. 🟡 O registo de vídeos publicados está incompleto — e mente no título

**Estado:** contornado, **não** consertado · **Reavaliar:** se outro robô voltar a
confiar no registo

Medido a 03/10/2026: `.github/data/youtube-longos-published.json` tem **8** vídeos
e o canal tem **11**. Os **3 que faltam são os de maior alcance** — somam 13.207
das 17.825 impressões de capa. E para `WaXL2ST00eE` o registo guarda o título
*planeado* (*"Mesmo salário por 30 anos…"*), não o que está no ar (*"Por que um
amigo já aposentou…"*).

**O que foi feito:** `retencao.js` deixou de confiar no ficheiro e passa a ler a
lista de envios do **próprio canal** — quem decide o que existe é o canal. Os que o
registo não conhece saem marcados com ⚠️ no relatório.

**Por que não foi consertado:** encher o registo à mão arranja o sintoma de hoje e
não impede que volte a acontecer — não se sabe **porquê** aqueles três ficaram de
fora (publicados à mão? fluxo antigo?). Sem essa resposta, o conserto é adivinhação.

**Como fazer quando chegar a hora:** descobrir o caminho por onde aqueles três
foram publicados, e só então decidir se o registo se enche ou se se deita fora.

---

### A3. 🟡 Duas tabelas de tradução que não conversam

**Estado:** aberto, com aviso escrito no código · **Reavaliar:** no próximo
trabalho grande de tradução

O aviso está no topo de `src/i18n/translations.ts`. São **36 chaves × 3 idiomas**.

**Por que foi adiado:** é remexer em coisa que funciona, e tradução neste
repositório tem um gate que tranca o blog inteiro quando falha. O ganho é
arrumação; o risco é o blog parar.

---

### A4. 🟡 Seis cópias do renovador de acesso ao YouTube

**Estado:** aberto, declarado no código · **Reavaliar:** quando for preciso mexer
na autenticação do YouTube por outra razão

A mesma função de renovar o acesso existe em **seis** ficheiros:
`apis/youtube-reporting.js`, `youtube/retencao.js`, `youtube/upload-short.js`,
`youtube/comentarios.js`, `youtube/capas-em-atraso.js`,
`youtube/corrigir-creditos-musica.js`.

A dívida está escrita no cabeçalho dos dois primeiros. `youtube-reporting.js`
**exporta** a função, para que o próximo ficheiro a importe em vez de criar a
sétima cópia.

**Por que foi adiado:** juntar as seis obriga a mexer em seis robôs já provados,
incluindo o que publica vídeo. Risco alto, ganho nenhum para quem lê os números.

---

### A5. 🟡 De onde vem a audiência do canal não é medido

**Estado:** aberto · **Reavaliar:** depois de a medição da capa dar o primeiro
resultado (ver B2)

Sabemos agora **quanta** gente vê a capa e **quanta** clica. Não sabemos de onde
ela vem — busca, página inicial, sugeridos, fora do YouTube. Sem isso, um CTR
baixo pode ser capa fraca **ou** o YouTube a mostrar o vídeo a quem não interessa.

**Como fazer:** é o mesmo relatório que já ligamos, na variante
`channel_reach_combined_a1`, que traz `traffic_source_type`. Extensão pequena de
`src/scripts/apis/youtube-reporting.js`.

**Por que foi adiado:** primeiro ver se o relatório simples chega mesmo e o que diz.

---

## B. Provas marcadas no tempo — nada a fazer até à data

### B1. ⏳ O filtro de realidade nunca correu contra o Search Console a sério

**Quando:** **terça-feira, 07h UTC** (a primeira corrida do `gsc-otimizar-ctr` com
a trava posta a 02/10).

O que foi provado foram as **contas e as réguas** (9 provas de mesa, incluindo três
casos de controlo legítimos). A cadeia completa não dá para provar daqui: as
credenciais só existem na nuvem.

**O que ler na corrida:** quantas páginas passaram e **o motivo de cada rejeição** —
ambos são impressos. Se o filtro cortar tudo, a régua está grossa e afrouxa-se;
`GSC_FILTRO_REALIDADE=0` desliga sem reverter código.

### B2. ⏳ A medição da capa está à espera do Google

**Quando:** a partir de **05/10/2026**.

Trabalho criado a 03/10 (`ef3f8783-87b9-4bcf-9e25-f3febc18fbe6`). A Reporting API
leva **até 48h** a despejar o primeiro ficheiro, e traz os ~30 dias anteriores.
Enquanto não houver ficheiro, o relatório diz *"à espera"* — não inventa número.

### B3. ⏳ A prova das travas da ficha, no robô da manutenção mensal

**Quando:** **01/11/2026**, e conferir na manhã seguinte.

Dois posts com data entre aspas passam os 90 dias nessa corrida. É nela que as duas
travas postas a 02/10 são postas à prova a sério.

---

## C. Só o Ed pode fazer

### C1. 🔴 Contacto por pessoa no LinkedIn — o gargalo do blog

**Estado:** aberto desde 02/10/2026

Medido: o blog **não tem problema de CTR, tem problema de não aparecer** — no
Brasil as páginas estão na posição 70 a 90. O que muda isso são backlinks, e já se
provou o que **não** funciona: diretório dá `nofollow` (medido em webcatalog e
sitelike) e **e-mail frio deu 0 respostas em 6**.

O próprio `docs/EMBEDS-OFERECER-AOS-PORTAIS.md` diz para **não repetir nem aumentar
o volume** de e-mails. O que falta é contacto humano: Tamires Silva (financeone) e
Renata Nunes (bmcnews).

### C2. 🟡 Dois cadastros por confirmar

- **mate.tools** — conversor submetido a 15/09, ainda não publicado
- **AlternativeTo** — na fila gratuita; dá 403 a robô, **só o Ed consegue ver**

---

## Como este ficheiro foi usado

- **03/10/2026** — criado a pedido do Ed, nos moldes do registo que o aplicativo já
  tinha. Entraram os itens que sobraram do levantamento dos 7 buracos dos robôs
  (02–03/10) e as pendências que viviam só nas conversas.
- **03/10/2026** — **seis dos sete buracos fechados no mesmo dia**: medir o clique
  na capa, filtro de realidade nos robôs, longos na medição, régua por formato,
  o relatório que o dono lê, e o Fact Firewall afinado e no e-mail. **Nenhum deles
  entrou aqui**, porque a regra deste ficheiro é que item resolvido não fica
  marcado como feito — fica no histórico do git.
