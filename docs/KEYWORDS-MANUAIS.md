# Keywords manuais

Como sugerir keywords para os geradores de conteúdo:

1. **Editar `data/keywords-manuais.csv`** — uma keyword por linha, no formato:

   ```csv
   keyword,categoria,observacao
   como economizar no plano de celular,dicas,opcional
   ```

   - `keyword`: o termo/tema desejado.
   - `categoria`: `dicas` | `investimentos` | `orcamento` | `glossario` — ou **vazio** = qualquer gerador pode consumir.
   - `observacao`: livre, só para humanos (opcional).

   > **Categoria `glossario`**: a keyword vira um TERMO do glossário (prefixos de
   > pergunta são removidos: "o que é holding" → termo "holding"). O gerador diário
   > consome a fila ANTES da rotação de letra A-Z — e em dia de keyword a letra
   > **não avança** (a rotação continua justa). No formulário da /status aparece
   > como "Glossário (termo)".

2. **Commit + push** — o push no CSV dispara o workflow `keywords-manuais.yml`, que sincroniza a fila (`.github/data/keyword-queue.json`).

3. **Acompanhar em `press/keyword-queue.md`** — mostra o estado da fila (pendentes/consumidas) e é atualizado automaticamente pelo bot.

A fila também recebe keywords automáticas (gaps do GSC + autocomplete); as manuais entram com prioridade.

## Enviar pelo navegador (formulário da /status)

Alternativa sem git: o formulário **📥 Enviar keywords** em `blog.finmoovi.com/status/` chama a
Pages Function `functions/api/keywords.js`, que dá append no `data/keywords-manuais.csv` via
GitHub Contents API — o push do CSV dispara o mesmo workflow `keywords-manuais.yml` de sempre.
Aceita itens separados por vírgula OU um por linha (máx. 50 por envio) e categoria opcional.

### Setup único (Cloudflare Pages)

Dashboard → Workers & Pages → **blog-finmoovi** → Settings → **Environment variables** →
Production → Add variable (marque **Encrypt** nas duas):

1. **`KEYWORDS_ACCESS_KEY`** — senha que você inventa (longa); é a senha digitada no formulário.
2. **`GITHUB_KEYWORDS_TOKEN`** — fine-grained PAT: GitHub → Settings → Developer settings →
   Personal access tokens → Fine-grained tokens → Generate new token → Repository access =
   **Only select repositories → blog-finmoovi** → Permissions → Repository permissions →
   **Contents: Read and write** (nada mais).

Depois de salvar, faça **Retry deployment** para as variáveis valerem nas Functions.
Passo a passo completo no comentário do topo de `functions/api/keywords.js`.

> Nota: a seção **🗂️ Fila de keywords** da /status é renderizada em build time — após um envio,
> ela só reflete a fila nova quando o próximo deploy do blog acontecer (o commit do bot na fila
> já dispara isso; ~2-3 min para o CSV + sync, mais o build do Pages).
