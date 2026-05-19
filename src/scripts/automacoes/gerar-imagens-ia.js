/**
 * Gerador de Imagens via Kie.AI
 * Gera imagens de capa para posts que não têm imagem
 */

import { generateImage } from '../apis/kie-ai.js';
import { writeFileSync, readFileSync, readdirSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const POSTS_DIR = join(process.cwd(), 'src', 'content', 'posts');
const IMAGES_DIR = join(process.cwd(), 'public', 'images', 'posts');

async function main() {
  console.log('🖼️ Verificando posts sem imagem...');

  if (!existsSync(IMAGES_DIR)) {
    mkdirSync(IMAGES_DIR, { recursive: true });
  }

  const postFiles = readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));
  let generated = 0;

  for (const file of postFiles) {
    const content = readFileSync(join(POSTS_DIR, file), 'utf-8');
    const imageMatch = content.match(/^image:\s*"(.*)"/m);

    // Skip if already has an image
    if (imageMatch && imageMatch[1].trim()) continue;

    const titleMatch = content.match(/^title:\s*"(.*)"/m);
    const title = titleMatch ? titleMatch[1] : file.replace('.md', '');

    console.log(`🎨 Gerando imagem para: ${title}`);

    try {
      const imageUrl = await generateImage(
        `Blog cover illustration about "${title}", financial education, money management, modern minimalist style`,
        { width: 1200, height: 630 }
      );

      if (imageUrl) {
        // Download image
        const response = await fetch(imageUrl);
        if (response.ok) {
          const buffer = Buffer.from(await response.arrayBuffer());
          const slug = file.replace('.md', '');
          const imagePath = join(IMAGES_DIR, `${slug}.webp`);

          writeFileSync(imagePath, buffer);

          // Update frontmatter
          const updatedContent = content.replace(
            /^image:\s*".*"/m,
            `image: "/images/posts/${slug}.webp"`
          );
          writeFileSync(join(POSTS_DIR, file), updatedContent, 'utf-8');

          console.log(`✅ Imagem gerada: ${slug}.webp`);
          generated++;
        }
      }
    } catch (err) {
      console.warn(`⚠️ Falha ao gerar imagem para ${title}:`, err.message);
    }

    // Rate limit: wait 2s between requests
    await new Promise(r => setTimeout(r, 2000));
  }

  if (generated > 0) {
    execSync('git add public/images/posts/ src/content/posts/', { stdio: 'inherit' });
    execSync(`git commit -m "imagens: ${generated} capas geradas via Kie.AI"`, { stdio: 'inherit' });
    console.log(`✅ ${generated} imagens geradas e commitadas!`);
  } else {
    console.log('✅ Todos os posts já têm imagem.');
  }
}

main();
