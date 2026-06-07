# Landing Pages (Sample Content)

These landing pages are **examples from the original FinMoovi finance niche**.
They demonstrate how to create SEO-optimized lead magnet pages.

## For your niche:

1. **Delete** these files (or keep as reference)
2. **Create** new landing pages for YOUR niche using the same structure
3. Each page should:
   - Import `{ config }` from the site config
   - Use `config.app.name`, `config.app.url`, `config.content.niche`
   - Have a newsletter signup form (component already provided)
   - Include structured data (Schema.org)

## Files to replace:

- `como-organizar-financas.astro` → Your primary lead magnet
- `orcamento-pessoal.astro` → Your secondary guide
- `como-sair-das-dividas.astro` → Your problem-solution page
- `guia-30-dias.astro` → Your email-gated content (30-day challenge)

## Template structure:

```astro
---
import BaseLayout from '@layouts/BaseLayout.astro';
import { config } from '../../site.config';
---

<BaseLayout
  title={`Your Page Title | ${config.brand.name}`}
  description="Your meta description"
>
  <!-- Hero with lead magnet hook -->
  <!-- Content sections -->
  <!-- Newsletter CTA -->
</BaseLayout>
```

These pages are excluded from the template validation script.
