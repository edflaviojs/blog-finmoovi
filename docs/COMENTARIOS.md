# 💬 Comentários próprios do blog (substitui o giscus)

O giscus (comentários via GitHub Discussions) exigia login no GitHub — barreira
enorme para o leitor leigo. Foi **desativado** (o componente
`src/components/shared/Giscus.astro` e o bloco `config.giscus` do
`site.config.ts` foram mantidos no repo, só deixaram de ser renderizados) e no
lugar entrou um sistema próprio:

- Leitor comenta com **nome + texto, sem login/cadastro**.
- **Todo comentário nasce `pending`** — NADA aparece no site sem você aprovar.
- Moderação na página **`/status`** (seção "💬 Comentários pendentes"), com a
  **mesma senha** do envio de keywords (`KEYWORDS_ACCESS_KEY`).
- Exibição é client-side (fetch) — comentário aprovado **aparece sem rebuild**
  (cache de 60s na API).

## O que você (dono) precisa fazer — 3 passos

### 1. Rodar o SQL no Supabase

Supabase Dashboard → **SQL Editor** → New query → colar o conteúdo de
[`db/blog-comments.sql`](../db/blog-comments.sql) → **Run**.

Isso cria a tabela `blog_comments` com RLS ligado:
- a chave `anon` só consegue **inserir pendente** e **ler aprovado**;
- aprovar/rejeitar (UPDATE) só com a `service_role` — que fica **apenas** no
  env do Cloudflare Pages, nunca no navegador.

### 2. Criar as env vars no Cloudflare Pages

⚠️ As envs `SUPABASE_URL`/`SUPABASE_ANON_KEY` que já existem nos **GitHub
Actions NÃO valem aqui** — Pages Functions têm env **próprio** no painel do CF.

Cloudflare Dashboard → Workers & Pages → **blog-finmoovi** → Settings →
Environment variables → **Production** → Add variable:

| Variável | Onde copiar | Encrypt? |
|---|---|---|
| `SUPABASE_URL` | Supabase → Settings → API → Project URL | não precisa |
| `SUPABASE_ANON_KEY` | Supabase → Settings → API → `anon` `public` | recomendado |
| `SUPABASE_SERVICE_KEY` | Supabase → Settings → API → `service_role` | **SIM (obrigatório)** |
| `KEYWORDS_ACCESS_KEY` | já existe (form de keywords da /status) — reusada | já está |

Opcionais (Turnstile anti-robô — só se quiser além do honeypot):

| Variável | Onde copiar |
|---|---|
| `TURNSTILE_SITE_KEY` | CF Dashboard → Turnstile → widget do blog → Site Key |
| `TURNSTILE_SECRET` | CF Dashboard → Turnstile → widget do blog → Secret Key |

Se as duas existirem, o POST exige o desafio Turnstile (o widget aparece
sozinho no form). Ausentes → só honeypot + rate-limit (funciona normal).

### 3. Retry deployment

Deployments → último deploy → **Retry deployment** (env só vale em deploy novo).

## Como moderar

1. Abra `blog.finmoovi.com/status`.
2. Seção **💬 Comentários pendentes** → digite a senha → **Carregar pendentes**.
3. Em cada card: **✅ Aprovar** (aparece no post em ≤1 min) ou **🗑️ Rejeitar**.

## Arquitetura

| Peça | Arquivo |
|---|---|
| Tabela + RLS | `db/blog-comments.sql` |
| API (GET/POST/PATCH) | `functions/api/comments.js` |
| Form + lista nos posts/glossário | `src/components/shared/Comentarios.astro` |
| Moderação | `src/pages/status.astro` (seção nova) |
| Teste do validador | `tests/comments-validation.test.js` (`node --test tests/comments-validation.test.js`) |

## Anti-spam e privacidade

- **Honeypot**: campo "website" invisível; bot que preenche recebe 200 e nada
  é gravado.
- **Rate-limit best-effort**: 5 envios/IP/10 min em memória. Limitação: cada
  isolate do Cloudflare tem a própria memória (não há KV/DO neste projeto),
  então o limite não é global nem persistente — a defesa REAL é a moderação:
  nada aparece sem aprovação.
- **LGPD**: IP puro nunca é gravado — só SHA-256 truncado de (IP + dia), que
  muda todo dia e não é reversível.
- **Chaves**: nunca aparecem em logs nem em respostas; senha errada → 401
  genérico. A `accessKey` da listagem de pendentes viaja em query string
  (padrão do GET) — use HTTPS (sempre é) e troque a senha se suspeitar de vazamento.

## Por que o anon não fura a moderação (RLS)

- **Aprovar** = `UPDATE`; não existe policy de UPDATE para `anon` → Postgres nega.
- **Inserir já aprovado**: a policy de INSERT tem `WITH CHECK (status='pending')`
  → INSERT com `status='approved'` é recusado.
- **Ler pendentes**: a policy de SELECT tem `USING (status='approved')` → para
  o `anon`, linhas pendentes/rejeitadas simplesmente não existem.
- A `service_role` (que ignora RLS) vive **só** no env do Cloudflare e é usada
  exclusivamente pelo PATCH/listagem de pendentes, atrás da `KEYWORDS_ACCESS_KEY`.
