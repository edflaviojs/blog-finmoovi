# Keywords manuais

Como sugerir keywords para os geradores de conteúdo:

1. **Editar `data/keywords-manuais.csv`** — uma keyword por linha, no formato:

   ```csv
   keyword,categoria,observacao
   como economizar no plano de celular,dicas,opcional
   ```

   - `keyword`: o termo/tema desejado.
   - `categoria`: `dicas` | `investimentos` | `orcamento` — ou **vazio** = qualquer gerador pode consumir.
   - `observacao`: livre, só para humanos (opcional).

2. **Commit + push** — o push no CSV dispara o workflow `keywords-manuais.yml`, que sincroniza a fila (`.github/data/keyword-queue.json`).

3. **Acompanhar em `press/keyword-queue.md`** — mostra o estado da fila (pendentes/consumidas) e é atualizado automaticamente pelo bot.

A fila também recebe keywords automáticas (gaps do GSC + autocomplete); as manuais entram com prioridade.
