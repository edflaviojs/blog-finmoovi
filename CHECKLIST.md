# CHECKLIST — Pós-Setup

Use este checklist para garantir que seu blog está 100% configurado e pronto para produção.

---

## Etapa 1: Setup Básico (obrigatório)

- [ ] Rodou `npm run setup` e preencheu todas as perguntas
- [ ] `npm run dev` roda sem erros
- [ ] `npm run build` compila 235+ páginas
- [ ] `npm run validate` → ✅ TEMPLATE VALID

---

## Etapa 2: Visual & Identidade

- [ ] Logo SVG customizada em `public/favicon.svg`
- [ ] Open Graph image padrão em `public/images/og-default.jpg` (1200×630px)
- [ ] Verificou cores e gradientes no browser (`npm run dev`)

---

## Etapa 3: Deploy (Cloudflare Pages)

- [ ] Repositório no GitHub (push feito)
- [ ] Cloudflare Pages conectado ao repositório
- [ ] Build command: `npm run build`
- [ ] Output directory: `dist`
- [ ] Node version: `18` ou superior
- [ ] Domínio customizado configurado no CF Pages

---

## Etapa 4: GitHub Secrets (para automações)

| Secret | Status | Para quê |
|--------|--------|----------|
| `GROQ_API_KEY` | [ ] | Geração de texto (posts, glossário) |
| `TOGETHER_API_KEY` | [ ] | Geração de imagens de capa |
| `SUPABASE_URL` | [ ] | Database (newsletter subscribers) |
| `SUPABASE_ANON_KEY` | [ ] | Database (acesso público) |
| `RESEND_API_KEY` | [ ] | Envio de emails (welcome, digest) |
| `CF_ANALYTICS_TOKEN` | [ ] | Relatório semanal de analytics |

---

## Etapa 5: GitHub Repository Variables

| Variable | Status | Valor |
|----------|--------|-------|
| `BOT_NAME` | [ ] | Nome do bot (ex: "MeuApp Bot") |
| `BOT_EMAIL` | [ ] | Email do bot (ex: "bot@meuapp.com") |

---

## Etapa 6: Conteúdo Inicial

- [ ] Rodou `npm run demo-content` para gerar 3 posts de exemplo
- [ ] OU criou seus próprios posts em `src/content/posts/`
- [ ] Deletou/substituiu as landing pages de exemplo (ver `src/pages/LANDING-PAGES-README.md`)
- [ ] Verificou glossário em `src/content/glossario/`

---

## Etapa 7: Newsletter & Email

- [ ] Configurou Supabase (tabela `subscribers`)
- [ ] Configurou Resend (domínio verificado)
- [ ] Testou inscrição na newsletter (via `npm run dev`)
- [ ] Verificou template de welcome email

---

## Etapa 8: Social & Giscus (opcional)

- [ ] Preencheu `social` no `site.config.ts` (Twitter, Instagram, YouTube)
- [ ] Configurou Giscus para comentários (repo, repoId, categoryId)
- [ ] Cloudflare Analytics beacon token

---

## Etapa 9: Automações (ativar workflows)

Após tudo configurado, vá em GitHub → Actions → habilite os workflows:

- [ ] `glossario-diario.yml` — termos novos diariamente
- [ ] `dicas-financeiras.yml` — posts diários
- [ ] `cotacoes-semanal.yml` — resumo semanal
- [ ] `newsletter-digest.yml` — digest para subscribers
- [ ] `gerar-post-inteligente.yml` — post inteligente semanal
- [ ] `post-comparacao.yml` — comparações X vs Y
- [ ] `post-sazonal.yml` — conteúdo sazonal
- [ ] `solucoes-finmoovi.yml` — posts de solução
- [ ] `welcome-sequence.yml` — emails de boas-vindas
- [ ] `analytics-report.yml` — relatório semanal
- [ ] `seo-monitor.yml` — monitoramento SEO
- [ ] `keep-alive.yml` — manter workflows ativos

---

## Etapa 10: Validação Final

- [ ] `npm run validate` → ✅ TEMPLATE VALID
- [ ] Visitou todas as páginas no browser
- [ ] Testou em mobile
- [ ] Verificou que NÃO aparece "FinMoovi" em lugar nenhum
- [ ] Fez o primeiro deploy em produção

---

## Pronto! 🎉

Seu blog está no ar, gerando conteúdo automaticamente para o seu nicho.
