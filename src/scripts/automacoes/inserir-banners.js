import { config } from '../../../site.config.ts';
/**
 * Inserir Banners
 * Script que insere banners do ${config.brand.name} e Loovi Seguros nos posts
 * Executado como parte do pipeline de geração de conteúdo
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const POSTS_DIR = join(process.cwd(), 'src', 'content', 'posts');

const BANNER_CTA = `
> 💡 **Dica ${config.brand.name}:** Organize suas finanças automaticamente com o [${config.app.name}](/app). Multi-moeda, categorização inteligente e relatórios visuais. [Teste grátis por 7 dias →](/app)
`;

const BANNER_LOOVI = `
> 🛡️ **Parceiro:** Proteja seu carro com a [Loovi Seguros](https://loovi.com.br?ref=${config.brand.name.toLowerCase()}). Sem franquia, sem burocracia. Seguro inteligente para quem quer economizar.
`;

function insertBanners() {
  console.log('📌 Inserindo banners nos posts...');

  const postFiles = readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));
  let updated = 0;

  for (const file of postFiles) {
    const filePath = join(POSTS_DIR, file);
    let content = readFileSync(filePath, 'utf-8');

    // Skip if already has banners
    if (content.includes('Dica ${config.brand.name}:') || content.includes('Parceiro:')) {
      continue;
    }

    // Split content into frontmatter and body
    const parts = content.split('---');
    if (parts.length < 3) continue;

    const frontmatter = parts.slice(0, 2).join('---') + '---';
    const body = parts.slice(2).join('---');

    // Find middle of content (after 2nd H2)
    const h2Matches = [...body.matchAll(/^## /gm)];

    if (h2Matches.length >= 2) {
      const insertPos = h2Matches[1].index;
      const newBody = body.slice(0, insertPos) + BANNER_CTA + '\n' + body.slice(insertPos);

      // Add Loovi banner before the last section
      const lastH2 = h2Matches[h2Matches.length - 1];
      if (lastH2) {
        const finalBody = newBody.slice(0, -100) + BANNER_LOOVI + newBody.slice(-100);
        content = frontmatter + finalBody;
      } else {
        content = frontmatter + newBody;
      }
    } else {
      // Short post: add banner at the end
      content = frontmatter + body + '\n' + BANNER_CTA;
    }

    writeFileSync(filePath, content, 'utf-8');
    updated++;
    console.log(`  ✅ ${file}`);
  }

  console.log(`📌 ${updated} posts atualizados com banners.`);
}

insertBanners();
