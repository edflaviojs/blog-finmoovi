/**
 * Gerador de Imagens SVG para posts sem imagem
 * Gera imagens de capa SVG locais para posts que não têm imagem
 */

import { generateCoverImage } from '../apis/kie-ai.js';
import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const POSTS_DIR = join(process.cwd(), 'src', 'content', 'posts');

async function main() {
  console.log('🖼️ Verificando posts sem imagem...');

  const postFiles = readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));
  let generated = 0;

  for (const file of postFiles) {
    const content = readFileSync(join(POSTS_DIR, file), 'utf-8');
    const imageMatch = content.match(/^image:\s*"(.*)"/m);

    // Skip if already has a valid image (not empty, not a broken URL)
    if (imageMatch && imageMatch[1].trim() && !imageMatch[1].includes('pollinations.ai') && !imageMatch[1].includes('__SVG_GENERATE__')) {
      continue;
    }

    const titleMatch = content.match(/^title:\s*"(.*)"/m);
    const title = titleMatch ? titleMatch[1] : file.replace('.md', '');
    const slug = file.replace('.md', '');

    console.log(`🎨 Gerando SVG para: ${title}`);

    try {
      const imagePath = generateCoverImage(title, slug, 'posts');

      // Update frontmatter
      if (imageMatch) {
        const updatedContent = content.replace(
          /^image:\s*".*"/m,
          `image: "${imagePath}"`
        );
        writeFileSync(join(POSTS_DIR, file), updatedContent, 'utf-8');
      } else {
        // Add image field after title
        const updatedContent = content.replace(
          /^(title:\s*".*")/m,
          `$1\nimage: "${imagePath}"`
        );
        writeFileSync(join(POSTS_DIR, file), updatedContent, 'utf-8');
      }

      console.log(`✅ Imagem gerada: ${imagePath}`);
      generated++;
    } catch (err) {
      console.warn(`⚠️ Falha ao gerar imagem para ${title}:`, err.message);
    }
  }

  if (generated > 0) {
    execSync('git add public/images/posts/ src/content/posts/', { stdio: 'inherit' });
    execSync(`git commit -m "imagens: ${generated} capas SVG geradas"`, { stdio: 'inherit' });
    console.log(`✅ ${generated} imagens geradas e commitadas!`);
  } else {
    console.log('✅ Todos os posts já têm imagem.');
  }
}

main();
