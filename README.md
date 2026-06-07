# 🚀 Blog Template — Clone, Configure, Deploy

Template completo de blog multi-idioma com automações de conteúdo por IA, SEO avançado, newsletter, e deploy no Cloudflare Pages.

**Clone → Setup (3 min) → Deploy → Blog pronto gerando conteúdo do seu nicho.**

---

## Quick Start

```bash
# 1. Clone (ou use "Use this template" no GitHub)
git clone https://github.com/edflaviojs/blog-finmoovi meu-blog
cd meu-blog && npm install

# 2. Configure (interativo com IA)
GROQ_API_KEY=gsk_xxx npm run setup
# Também aceita: OPENAI_API_KEY, ANTHROPIC_API_KEY, KIE_API_KEY
# Sem key? npm run setup (usa templates genéricos)

# 3. Gere conteúdo inicial
GROQ_API_KEY=gsk_xxx npm run demo-content

# 4. Veja localmente
npm run dev

# 5. Valide
npm run validate
```

---

## O que você ganha

| Feature | Detalhe |
|---------|---------|
| 🌍 Multi-idioma | PT / EN / ES com tradução automática |
| 🤖 21 automações | Posts diários, glossário, cotações, comparações |
| 📧 Email sequences | Welcome (3 emails) + digest semanal |
| 🔍 SEO avançado | Schema.org, hreflang, sitemap, RSS × 3 |
| 🎨 12 CTAs rotativos | Gerados do config, nunca repetitivos |
| 📱 PWA | Manifest, offline-first |
| 🖼️ Imagens por IA | Geração automática via Together AI |
| ⚡ Deploy automático | Cloudflare Pages (push = deploy) |
| 📊 Analytics | Cloudflare Beacon + relatório semanal |
| 💬 Comentários | Giscus (GitHub Discussions) |

---

## Arquitetura

```
site.config.ts  ←── ÚNICO arquivo que você edita
       │
       ├─► Components (30+)
       ├─► Layouts & Pages (235+)
       ├─► i18n (PT/EN/ES)
       ├─► CSS (brand-tokens gerados)
       ├─► Cloudflare Functions (newsletter, CTA tracking)
       ├─► 21 Automation Scripts
       ├─► 16 GitHub Workflows
       └─► AI Content Generation
```

---

## Scripts disponíveis

| Comando | O que faz |
|---------|-----------|
| `npm run setup` | Configura o template (interativo + IA) |
| `npm run dev` | Server local (localhost:4321) |
| `npm run build` | Build de produção |
| `npm run generate` | Regenera CSS, manifest, i18n, config |
| `npm run validate` | Valida que o template está correto |
| `npm run demo-content` | Gera 3 posts de exemplo via IA |
| `npm run preview` | Preview do build local |

---

## Providers de IA suportados

O setup e o demo-content detectam automaticamente qual key está disponível:

| Provider | Variável | Custo |
|----------|----------|-------|
| GROQ | `GROQ_API_KEY` | Grátis (rate limited) |
| OpenAI (ChatGPT) | `OPENAI_API_KEY` | Pago |
| Anthropic (Claude) | `ANTHROPIC_API_KEY` | Pago |
| Kie.ai | `KIE_API_KEY` | Variável |

---

## Deploy (Cloudflare Pages)

1. Push o repositório para GitHub
2. No Cloudflare Dashboard → Pages → Create → Connect to Git
3. Build command: `npm run build`
4. Output directory: `dist`
5. Environment variable: `NODE_VERSION` = `18`

---

## Secrets & Variables

### GitHub Secrets (para automações)

| Secret | Para quê |
|--------|----------|
| `GROQ_API_KEY` | Geração de texto |
| `TOGETHER_API_KEY` | Geração de imagens |
| `SUPABASE_URL` | Database |
| `SUPABASE_ANON_KEY` | Database (public) |
| `RESEND_API_KEY` | Envio de emails |
| `CF_ANALYTICS_TOKEN` | Analytics report |

### GitHub Repository Variables

| Variable | Para quê |
|----------|----------|
| `BOT_NAME` | Nome do bot nos commits automáticos |
| `BOT_EMAIL` | Email do bot |

---

## Pós-setup

Consulte o [CHECKLIST.md](./CHECKLIST.md) para um guia completo de configuração passo a passo.

---

## Como funciona o setup inteligente

O `npm run setup` pergunta:

1. **Identidade** — nome da marca, domínio
2. **Nicho** — em PT/EN/ES
3. **Produto** — nome, URL, descrição
4. **Visual** — cores, gradientes
5. **Deploy** — Cloudflare project name

Com uma API key de IA, gera automaticamente:
- Categorias de conteúdo relevantes
- Features do produto em 3 idiomas
- CTAs e textos de conversão
- Meta descriptions otimizadas
- Personalidade do AI writer
- Temas diários, sazonais, comparações

---

## Ativar o botão "Use this template"

Para que outros possam clonar facilmente:
1. Vá em Settings do repositório
2. Marque "Template repository"
3. Pronto — aparece o botão "Use this template"

---

## Licença

MIT
