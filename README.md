# Blog FinMoovi

Portal de finanças pessoais do FinMoovi — blog.finmoovi.com

## Stack

- **Framework:** Astro 4 + TypeScript
- **Styling:** CSS puro (design tokens Elite Hybrid)
- **IA:** Kie.AI (geração de textos + imagens)
- **Deploy:** Cloudflare Pages
- **Automações:** GitHub Actions
- **Busca:** Pagefind

## Desenvolvimento

```bash
# Instalar dependências
npm install

# Servidor de desenvolvimento
npm run dev

# Build de produção
npm run build

# Preview local
npm run preview
```

## Estrutura

```
src/
├── components/     # Componentes Astro reutilizáveis
├── content/        # Content Collections (posts, glossário)
├── layouts/        # Layouts base, post, ferramenta
├── pages/          # Rotas do site
├── scripts/        # Scripts de automação (Kie.AI, cotações)
└── styles/         # Design tokens + global styles
```

## Automações (GitHub Actions)

| Workflow | Frequência | Descrição |
|----------|-----------|-----------|
| `dicas-financeiras.yml` | 3x/semana (seg, qua, sex) | Gera post de dica financeira |
| `glossario-financeiro.yml` | 3x/semana (ter, qui, sáb) | Gera termo do glossário |
| `cotacoes-semanal.yml` | 1x/semana (segunda) | Resumo semanal do mercado |
| `deploy.yml` | A cada push em main | Deploy no Cloudflare Pages |

## Secrets necessários (GitHub)

- `KIE_API_KEY` — API key da Kie.AI
- `EXCHANGE_API_KEY` — API key do ExchangeRate
- `CLOUDFLARE_API_TOKEN` — Token Cloudflare Pages
- `CLOUDFLARE_ACCOUNT_ID` — Account ID Cloudflare

## Deploy

O deploy é automático via GitHub Actions → Cloudflare Pages.
Domínio: `blog.finmoovi.com` (CNAME para o projeto Cloudflare Pages).
