# DÍVIDA, o que ficou por fazer no blog e no canal, e por quê

> **Para que serve este ficheiro:** guardar o que foi **decidido deixar para
> depois**, com o motivo e com a data em que vale a pena voltar. Não é lista de
> desejos nem de ideias, só entra aqui o que já foi diagnosticado, medido, e
> conscientemente adiado.
>
> **Regra:** item sem *porquê* e sem *quando reavaliar* não entra. Item
> resolvido **sai daqui** (vai para o histórico do git), não fica marcado como feito.

**Criado em:** 2026-10-03 · **Última atualização:** 2026-10-23

> Irmão deste ficheiro, do lado do aplicativo:
> `backup-app-22052025/.claude/docs/DIVIDA-TECNICA.md`.
> A régua de leitura dos números vive na skill `.claude/skills/finmoovi-crescimento/`.

---

## A. Dívida técnica

### A1. 🟡 O registo de vídeos publicados está incompleto, e mente no título

**Estado:** contornado, **não** consertado · **Reavaliar:** se outro robô voltar a
confiar no registo

Medido a 03/10/2026: `.github/data/youtube-longos-published.json` tem **8** vídeos
e o canal tem **11**. Os **3 que faltam são os de maior alcance**, somam 13.207
das 17.825 impressões de capa. E para `WaXL2ST00eE` o registo guarda o título
*planeado* (*"Mesmo salário por 30 anos…"*), não o que está no ar (*"Por que um
amigo já aposentou…"*).

**O que foi feito:** `retencao.js` deixou de confiar no ficheiro e passa a ler a
lista de envios do **próprio canal**, quem decide o que existe é o canal. Os que o
registo não conhece saem marcados com ⚠️ no relatório.

**Por que não foi consertado:** encher o registo à mão arranja o sintoma de hoje e
não impede que volte a acontecer, não se sabe **porquê** aqueles três ficaram de
fora (publicados à mão? fluxo antigo?). Sem essa resposta, o conserto é adivinhação.

**Como fazer quando chegar a hora:** descobrir o caminho por onde aqueles três
foram publicados, e só então decidir se o registo se enche ou se se deita fora.

---

### A2. 🟡 Duas tabelas de tradução que não conversam

**Estado:** aberto, com aviso escrito no código · **Reavaliar:** no próximo
trabalho grande de tradução

O aviso está no topo de `src/i18n/translations.ts`. São **36 chaves × 3 idiomas**.

**Por que foi adiado:** é remexer em coisa que funciona, e tradução neste
repositório tem um gate que tranca o blog inteiro quando falha. O ganho é
arrumação; o risco é o blog parar.

---

### A3. 🟡 Seis cópias do renovador de acesso ao YouTube

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

### A4. 🟡 De onde vem a audiência do canal não é medido

**Estado:** aberto · **Reavaliar:** depois de a medição da capa dar o primeiro
resultado (ver B2)

Sabemos agora **quanta** gente vê a capa e **quanta** clica. Não sabemos de onde
ela vem, busca, página inicial, sugeridos, fora do YouTube. Sem isso, um CTR
baixo pode ser capa fraca **ou** o YouTube a mostrar o vídeo a quem não interessa.

**Como fazer:** é o mesmo relatório que já ligamos, na variante
`channel_reach_combined_a1`, que traz `traffic_source_type`. Extensão pequena de
`src/scripts/apis/youtube-reporting.js`.

**Por que foi adiado:** primeiro ver se o relatório simples chega mesmo e o que diz.

---

### A5. 🟡 O guarda das capas tem UM olho só que funciona

**Estado:** aberto, sem dano até hoje · **Reavaliar:** no dia em que aparecer
`publicada SEM a trava de letras` no registo de um robô de capas

Medido a 14/10/2026 em 7 dias de corridas: o guarda (`lib/guardiao-da-capa.js`)
**vê e recusa**, barrou "PERSONAL FINANCE", "$100", "Goals"…, e as capas que ele
marca "proeminente" mas aprova **não têm letras** (6 abertas e vistas, 0 com texto:
é a 2ª leitura a corrigir a triagem barulhenta, de propósito). Mas quem responde é
**sempre** a Cloudflare. A reserva é o Groq (`qwen/qwen3.8-27b`), **nunca testado**
,  e o Groq já aposentou um modelo de visão em silêncio (24/09). O Gemini não recebe
chave na varredura.

**Por que foi adiado:** não falhou uma única vez; pôr outro olho é gastar para
prevenir o que ainda não aconteceu.

**Como fazer quando chegar a hora:** o Claude (crédito de API do plano Max, ver B4)
como olho de reserva custa centavos por mês, capas são poucas.

### A6. 🟢 O molde novo dos Shorts, o que ficou para depois (16/10/2026)

**Contexto:** desde 16/10 o Short de 16s é feito no molde novo (`youtube-molde/`, sem Remotion), ligado pela
variável `MOLDE_NOVO=sim` do repositório. O Remotion ficou de **estepe** (corre se o molde falhar).
Documento da frente: `docs/MOLDE-NOVO-DOS-SHORTS.md`.

Ficou adiado, de propósito:
1. **O vídeo longo no estilo novo** (fase 5 do plano). O piloto de 38 s foi aprovado pelo Ed, mas o robô do
   longo continua no Remotion. **Porquê:** é uma frente grande (16:9, 8 min, render repartido).
   **Reavaliar:** depois de uma semana do molde nos Shorts sem tropeços.
2. **O Short de 50 s** (composição `Short` do Remotion) ainda não passou para o molde. **Porquê:** o molde só
   conhece o formato de 4 cenas do Short de 16s. **Reavaliar:** junto com o item 1.
3. **Retirar o Remotion dos Shorts de 16s.** **Porquê:** é o estepe. **Reavaliar:** depois de 2 semanas sem o
   molde falhar (o log diz se o passo do Remotion correu).
4. **Afinar objetos fracos do catálogo** (tesoura, emprestar, caixa-eletrônico, fogão: desenho simples).
   **Porquê:** funcionam, só são menos bonitos. **Reavaliar:** quando o Ed apontar algum num vídeo.

---

## B. Provas marcadas no tempo, nada a fazer até à data

### B5. ⏳ A 1.ª corrida real do molde novo, com tudo

**Quando:** a próxima corrida do `youtube-short16-render.yml` (agendada 04:30 UTC de **17/10/2026**; costuma
arrancar com horas de atraso).

**O que ler:** o passo "Fazer o Short no molde novo" **verde** e o "Renderizar o Short de 16s" **saltado**; o
tempo do passo (na nuvem deu 6-7 min); os avisos amarelos da conferência; as legendas EN/ES no YouTube (acertadas
pelo `legendas.mjs`); a capa. Se o molde falhou, o Remotion fez o vídeo, ler o porquê no log.

### B1. ⏳ O filtro de realidade nunca correu contra o Search Console a sério

**Quando:** **terça-feira, 07h UTC** (a primeira corrida do `gsc-otimizar-ctr` com
a trava posta a 02/10).

⚠️ (16/10) as terças de 07/10 e 14/10 já passaram, conferir o log dessas corridas antes de considerar isto aberto.

O que foi provado foram as **contas e as réguas** (9 provas de mesa, incluindo três
casos de controlo legítimos). A cadeia completa não dá para provar daqui: as
credenciais só existem na nuvem.

**O que ler na corrida:** quantas páginas passaram e **o motivo de cada rejeição** , 
ambos são impressos. Se o filtro cortar tudo, a régua está grossa e afrouxa-se;
`GSC_FILTRO_REALIDADE=0` desliga sem reverter código.

### B2. ⏳ A medição da capa está à espera do Google

**Quando:** a partir de **05/10/2026**.

Trabalho criado a 03/10 (`ef3f8783-87b9-4bcf-9e25-f3febc18fbe6`). A Reporting API
leva **até 48h** a despejar o primeiro ficheiro, e traz os ~30 dias anteriores.
Enquanto não houver ficheiro, o relatório diz *"à espera"*, não inventa número.

⚠️ (16/10) a data já passou, conferir se o relatório já traz o número antes de considerar isto aberto.

### B3. ⏳ A prova das travas da ficha, no robô da manutenção mensal

**Quando:** **01/11/2026**, e conferir na manhã seguinte.

Dois posts com data entre aspas passam os 90 dias nessa corrida. É nela que as duas
travas postas a 02/10 são postas à prova a sério.

---

### B4. ⏳ A 1ª semana do Claude a escrever os robôs

**Data:** até **21/10/2026** · **O que olhar:** linhas `::medidor::{"f":"claude"…}`
nas corridas do longo, do Short de 16s e dos posts

Desde 14/10 (`82992729`) o Claude Sonnet 5.5 escreve primeiro, pago pelo crédito de
API do plano Max (US$ 100/mês; a organização **não tem cartão**, sem crédito, recusa,
não cobra). Ensaio medido: 2 chamadas dos posts = **US$ 0,035**. A estimativa para o
mês é US$ 5-10. Conferir o gasto real e se os roteiros passam mais à primeira.

Também a provar nesta janela: **a tentativa de quarta do longo** (`a3088fd2`), só
corre a sério numa semana em que a terça falhe; numa semana boa tem de sair "nada a
fazer" em verde, sem segundo vídeo.

---

## C. Só o Ed pode fazer

### C1. 🔴 Contacto por pessoa no LinkedIn, o gargalo do blog

**Estado:** aberto desde 02/10/2026

Medido: o blog **não tem problema de CTR, tem problema de não aparecer**, no
Brasil as páginas estão na posição 70 a 90. O que muda isso são backlinks, e já se
provou o que **não** funciona: diretório dá `nofollow` (medido em webcatalog e
sitelike) e **e-mail frio deu 0 respostas em 6**.

O próprio `docs/EMBEDS-OFERECER-AOS-PORTAIS.md` diz para **não repetir nem aumentar
o volume** de e-mails. O que falta é contacto humano: Tamires Silva (financeone) e
Renata Nunes (bmcnews).

### C2. 🟡 Dois cadastros por confirmar

- **mate.tools**, conversor submetido a 15/09, ainda não publicado
- **AlternativeTo**, na fila gratuita; dá 403 a robô, **só o Ed consegue ver**

---

### C3. 🟡 O limite de gasto da API do Claude está em US$ 15/mês

**Reavaliar:** quando B4 der o gasto real

Posto pelo Ed a 14/10 no Console: **US$ 15/mês** (corrigido pelo Ed a 15/10, aqui
estava US$ 5 por engano meu). A estimativa dos robôs é US$ 5-10/mês, logo deve
chegar ao fim do mês; se cortar, os robôs voltam sozinhos à IA grátis (não quebra
nada). Como não há cartão na organização, o limite não arrisca dinheiro.

**De arrumação, sem pressa:** o segredo `MISTRAL_API_KEY` ficou no cofre sem uso, o
plano Free da Mistral não liberta a chave (14/10). Pode ser apagado.

---

## Como este ficheiro foi usado

- **03/10/2026**, criado a pedido do Ed, nos moldes do registo que o aplicativo já
  tinha. Entraram os itens que sobraram do levantamento dos 7 buracos dos robôs
  (02-03/10) e as pendências que viviam só nas conversas.
- **03/10/2026**, **os sete buracos do mapa fechados**: medir o clique
  na capa, filtro de realidade nos robôs, longos na medição, régua por formato,
  o relatório que o dono lê, o Fact Firewall afinado e no e-mail, e o raio-X com
  as datas calculadas.

  **O raio-X entrou neste ficheiro e saiu no mesmo dia**, e é assim que ele deve
  funcionar: item resolvido não fica marcado como feito, sai e vai para o histórico
  do git. Os outros seis nunca chegaram a entrar, pela mesma regra.
- **14/10/2026**, entraram A5 (guarda das capas com um olho só), B4 (1ª semana do
  Claude nos robôs + tentativa de quarta do longo) e C3 (limite de US$ 15 da API e o
  segredo da Mistral sem uso). Resolvidos no mesmo dia e por isso **não** entraram:
  voz da Microsoft com 403 (`c3d9e12d`), Short da noite sem Gemini (`f56d8156`),
  vídeo de 18/10 subido à mão, posts semanais por e-mail, primeiro comentário (já
  funcionava pelo robô de hora a hora).
- **16/10/2026**, entraram A6 (o que ficou para depois no molde novo dos Shorts) e B5 (a 1.ª corrida real
  dele, a 17/10). Marcados como *provavelmente feitos, conferir*: A0 itens 1 e 2 (newsletter, outro terminal),
  B1 e B2 (datas já passadas).
