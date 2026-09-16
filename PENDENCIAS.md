# 📋 Pendências

Este arquivo alimenta a seção **📋 Pendências** do Relatório do Dia (e-mail diário das ~6h40 de Lisboa).

- **Adicionar pendência:** crie uma linha `- [ ] descrição` abaixo → aparece no próximo relatório.
- **Concluir pendência:** marque o checkbox (`- [x]`) ou apague a linha → some do relatório.

## Abertas

- [x] ~~**Pinterest: renovar o refresh token**~~ — FEITO em 16/09/2026. Tinha **vencido no dia 15**: na corrida de 14/09 o próprio robô escreveu *«válido por mais ~1 dia»*. Renovado e provado com uma corrida à mão: *«válido por mais ~59 dias»* e **3/3 pins publicados**. Vence outra vez por volta de **15/11/2026**; a issue de aviso abre-se sozinha 7 dias antes.
  - ⚠️ Para a próxima vez: o link de autorização **não pode ser copiado do terminal** — vão espaços no meio e o Pinterest devolve 400 («URI de redirecionamento não corresponde»). Abrir com `Start-Process` a partir do terminal.
  - ⚠️ E **nunca** carregar em «Redefinir o segredo do aplicativo» no portal: isso mata o segredo em uso e parte a automação.
- [x] ~~**Acompanhar o VIGIA DO AR na 1ª semana**~~ — FECHADO em 16/09/2026: no ar há 22 dias, corre todas as noites às 21:00 e as corridas agendadas estão verdes (as 2 vermelhas de 14/09 foram disparos à mão). A semana de observação acabou; o vigia fica a trabalhar.
- [x] ~~**Acompanhar a limpeza das capas com letras**~~ — FECHADO em 16/09/2026: **159/159 refeitas, 973 de 973 imagens auditadas, nada na fila** e o robô correu esta madrugada. A partir de hoje a secção 🖼️ do e-mail só reaparece se surgir capa nova com letras (ou se o robô parar).
- [x] ~~**Auditar as capas que o robô refizer**~~ — FECHADO em 16/09/2026 pelo próprio ficheiro `data/capas-auditadas.json`: **150 das 159** trazem a citação literal do texto que a IA leu na capa (ex.: *"Investing in the future, one coin at a time."*) — prova, não opinião. As outras 9 foram por borrão, com a medida ao lado (nitidez local 12 a 19). A régua da prova apertou o critério: os 36 falsos alarmes em 60 eram de antes dela. Auditoria retroativa às originais já não é possível — foram substituídas.
- [ ] **Confirmar no painel do Railway qual repo alimenta `app.finmoovi.com`.** Medido em 16/09/2026: o site responde **200**, com os cabeçalhos `x-railway-request-id` e `x-railway-edge: bcn1` — está mesmo no Railway —, e `/api/status` (o mesmo caminho de saúde que o `railway.json` deste repo declara) devolve `{"status":"ok","version":"2.0.0"}`. Falta só o que nenhum teste de fora consegue ver: **a que repo e ramo o projeto está ligado**. Isso lê-se no painel, em 30 segundos.
- [ ] **Decidir qual conta é a PADRÃO desta máquina.** O `gh` e o `wrangler` estão ambos em GOAPEXI; todo push para o FinMoovi exige `gh auth switch --user edflaviojs` e devolver a seguir. Se o FinMoovi é o trabalho principal daqui, vale inverter — mas parte o lado GOAPEXI. O `wrangler` continua por consertar: precisa de `wrangler login` com `Finmoovi@gmail.com`, que abre o navegador e tem de ser o Ed a correr.
- [ ] **Acompanhar a gaveta de idioma na 1ª semana** (no ar desde 12/08/2026). Filtrar a tabela `cta_clicks` pelos `variant` que começam por `lang-`: quantos VIRAM contra quantos ACEITARAM, por idioma. Se quase ninguém aceitar, o problema é o texto ou o momento — não a ideia. Detalhe em `docs/I18N-SYSTEM.md` §12.
- [x] Auditoria YouTube API: APROVADA — uploads passaram de private para public em 03/08/2026 (upload-short.js)
- [ ] **18/08/2026 — ESTUDO APIFY das transcrições (vídeo longo).** Só a partir dessa data: o arquivo `.github/data/youtube-capitulos.json` precisa de ~2 semanas a acumular para haver 40-50 longos e se escolherem os MELHORES para transcrever. Passos: criar chave em console.apify.com/settings/integrations (permissões limitadas + validade 1 mês) → guardar como `APIFY_TOKEN` no cofre do GitHub (nunca no chat) → criar/configurar o actor de transcrições → 30-50 transcrições (~$0,25 do crédito grátis de $5/mês) → ler os primeiros 30s de cada. ⚠️ Estudo à mão, NUNCA dentro do robô diário. Detalhe completo: IMPLEMENTACAO20 §33.6
- [x] ~~**~18/08/2026 — RE-MEDIR A RETENÇÃO**~~ — FECHADO em 16/09/2026: já não é disparo à mão, passou a correr sozinho todas as semanas (última medição 14/09). A audiência deixou de ser pequena de mais: **124 vídeos, 115 com audiência, 3.200 visualizações** contra as 97 de 03/08. O número já existe — o que falta é decidir o que fazer com ele, e isso é outra conversa (metade das pessoas sai aos **10 segundos**).
- [ ] Google Cloud billing: criar perfil de pagamentos PORTUGAL (NIF + cartão PT) → destrava vozes TTS premium + trial $300
- [ ] Escolher voz definitiva do canal (Antonio edge ↔ Piper faber alternando; premium depende do billing)
- [ ] Pinterest: avaliar o 1º pin com descrição rica SEO (sexta 24/07 ~16h)
<!-- A renovação do refresh token do Pinterest subiu para o topo desta lista em 16/09/2026: o prazo é hoje. -->

- [ ] Upgrade Pinterest p/ cadência diária? Avaliar analytics ~07/08
