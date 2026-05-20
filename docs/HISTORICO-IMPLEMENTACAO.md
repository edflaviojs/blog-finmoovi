# Blog FinMoovi — Histórico de Implementação e Guia de Continuidade

**Data:** 2025-05-19/20  
**Status:** ✅ BLOG NO AR  
**Deploy:** Cloudflare Pages (auto-deploy via GitHub push)  
**Repositório:** https://github.com/edflaviojs/blog-finmoovi  
**Branch:** main  
**URL Produção:** https://blog-finmoovi.pages.dev / https://blog.finmoovi.com

---

## Commits Realizados

### Commit 1: `968c72e` — Implementação inicial completa
- Projeto Astro 4 + TypeScript criado do zero
- Design system Elite Hybrid (dark theme)
- 3 posts de exemplo (orçamento, regra 50-30-20, erros financeiros)
- 5 termos de glossário iniciais
- Header com cotações ticker, Navigation, Footer
- Sidebar com CTA, Newsletter, Posts Populares, Categorias
- Páginas: index, posts/[slug], categorias/[categoria], ferramentas, glossário, app
- SEO: meta tags, Open Graph, Schema.org
- Pagefind (busca client-side)
- GitHub Actions: dicas-financeiras (3x/semana), cotações (1x/semana), glossário (1x/semana)
- Deploy workflow para Cloudflare Pages

### Commit 2: `7a37213` — Melhorias V2
- Hero redesenhada estilo portal de notícias (post destaque grande + cards secundários)
- Glossário expandido de 5 para 40+ termos (A-Z) com accordion SEO
- Páginas individuais de glossário com Schema.org FAQ markup
- CTAs variados (12 versões) para não cansar o usuário
- Página /sobre criada
- Favicon atualizado (mesmo SVG do finmoovi.com — gráfico TrendingUp cyan→magenta)
- Imagens SVG temáticas para posts (gráficos financeiros)
- Seletor de idiomas PT/EN/ES no header (LanguageSwitcher.astro)

### Commit 3: `385dd7b` — Sidebar CTA + Cotações dinâmicas
- Sidebar CTA com texto completo e nota "sem cartão de crédito"
- Cotações agora buscam dados reais da AwesomeAPI (gratuita, sem chave)
- Atualiza automaticamente a cada 5 minutos
- Fallback para valores estáticos se API falhar

### Commit 4: `d65d56b` — i18n completo
- Script i18n.js client-side traduz todos elementos com data-i18n
- Navigation, sidebar, footer, glossário, sobre com data-i18n
- MobileMenu com traduções
- Footer logo atualizado (SVG ao invés de "FM")
- Arquivo src/i18n/translations.ts com todas as strings PT/EN/ES

### Commit no finmoovi.com: `b05c84b`
- Removido badge "Em breve" / "Coming soon" / "Próximamente" do botão Blog
- Blog agora é link direto para https://blog.finmoovi.com
- BLOG_URL atualizado em constants/index.ts

---

## Arquitetura Atual do Blog

```
blog-finmoovi/
├── public/
│   ├── favicon.svg (mesmo do finmoovi.com)
│   ├── images/posts/*.svg (imagens temáticas)
│   ├── scripts/i18n.js (traduções client-side)
│   ├── robots.txt, manifest.json, _headers
│   └── pagefind/ (gerado no build)
├── src/
│   ├── components/
│   │   ├── header/ (Header, Navigation, CotacaoBar, MobileMenu, LanguageSwitcher)
│   │   ├── footer/ (Footer)
│   │   ├── posts/ (PostCard, PostGrid, RelatedPosts)
│   │   ├── sidebar/ (Sidebar, FinMooviCTA, Newsletter, PopularPosts, Categories)
│   │   ├── glossario/ (CTAVariado)
│   │   ├── banners/ (BannerFinMoovi)
│   │   └── seo/ (SEOHead)
│   ├── content/
│   │   ├── posts/ (3 posts .md)
│   │   ├── glossario/ (40+ termos .md, A-Z)
│   │   └── config.ts (schemas Zod)
│   ├── i18n/translations.ts
│   ├── layouts/ (BaseLayout, PostLayout, ToolLayout)
│   ├── pages/ (index, sobre, app, ferramentas, glossario/[slug], posts/[slug], categorias/[cat])
│   ├── scripts/automacoes/ (kie-ai.js, gerar-dicas, cotacoes, glossario-auto, gerar-imagens)
│   └── styles/ (global.css, tokens.css, typography.css)
├── .github/workflows/ (deploy, dicas-financeiras, cotacoes-semanal, glossario-financeiro)
├── astro.config.mjs
└── package.json
```

---

## O QUE O PRÓXIMO CHAT PRECISA SABER

### Para dar continuidade:

1. **Ativar automações de posts** — Adicionar `KIE_API_KEY` nos GitHub Secrets:
   - Ir em: https://github.com/edflaviojs/blog-finmoovi/settings/secrets/actions
   - Criar secret: `KIE_API_KEY` com valor da chave Kie.AI
   - Opcional: `EXCHANGE_API_KEY` para cotações no workflow

2. **Posts são gerados automaticamente** quando a KIE_API_KEY estiver configurada:
   - 3x/semana (seg, qua, sex 6h): post de dica financeira
   - 1x/semana (segunda 7h): resumo de cotações
   - 1x/semana: novos termos de glossário

3. **i18n funciona client-side** — elementos com `data-i18n="chave"` são traduzidos pelo script `/scripts/i18n.js`. O idioma é salvo em `localStorage('fm-lang')`. Posts em si ficam em PT (tradução futura via Kie.AI).

4. **Cotações são dinâmicas** — AwesomeAPI (gratuita, sem chave). IBOV é estático (API gratuita não tem). Selic é estático (muda a cada 45 dias).

5. **Glossário usa accordion** — `<details>/<summary>` nativo. Schema.org FAQ em cada página individual.

6. **Spec completa do blog** está em: `backup-app-22052025/.claude/docs/IMPLEMENTACAO16-BLOG-FINMOOVI-PORTAL-COMPLETO.md`

### Melhorias pendentes (próximas sessões):

- [ ] Traduzir posts automaticamente para EN/ES via Kie.AI
- [ ] Adicionar mais posts (meta: 10+ posts para SEO)
- [ ] Implementar Giscus (comentários via GitHub Discussions)
- [ ] Configurar Google Analytics (GA4)
- [ ] Configurar Google AdSense
- [ ] Adicionar banner Loovi Seguros (afiliado)
- [ ] Implementar busca com Pagefind UI
- [ ] Criar mais ferramentas interativas (calculadoras)
- [ ] Adicionar breadcrumbs em todas as páginas
- [ ] Botão compartilhar (WhatsApp, Twitter, LinkedIn)
- [ ] Dark/Light mode toggle
- [ ] Newsletter funcional (integrar Resend)
- [ ] Imagens reais geradas por IA (substituir SVGs placeholder)
- [ ] Testar e corrigir responsividade mobile
- [ ] Lighthouse audit (meta: 95+ em todas categorias)
- [ ] Adicionar sitemap dinâmico para Google Search Console

### Comandos úteis:

```bash
cd C:\Users\Ed Flávio\Desktop\CLAUDE-CODE\FINMOOVI\blog-finmoovi
npm run dev      # servidor local http://localhost:4321
npm run build    # build estático em dist/
npm run preview  # preview do build
```

### APIs em uso:
- **AwesomeAPI** (cotações): `https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL,BTC-USD` — gratuita, sem chave
- **Kie.AI** (conteúdo): precisa de API key nos secrets do GitHub
