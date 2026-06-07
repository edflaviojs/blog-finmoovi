/**
 * Auto Social Media Content Generator
 * Gera resumos para Twitter/X, Instagram e LinkedIn a cada post novo
 * Salva em /social/ para scheduling manual ou via API
 *
 * Uso: node src/scripts/automacoes/gerar-social.js
 * Executa como step adicional em todos os workflows de geração de posts
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { generateText } from '../apis/kie-ai.js';

const POSTS_DIR = join(process.cwd(), 'src', 'content', 'posts');
const SOCIAL_DIR = join(process.cwd(), 'social');

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { fm: {}, body: content };
  const fmRaw = match[1];
  const title = fmRaw.match(/title:\s*"?([^"\n]+)"?/)?.[1]?.trim() || '';
  const description = fmRaw.match(/description:\s*"?([^"\n]+)"?/)?.[1]?.trim() || '';
  const tags = fmRaw.match(/tags:\s*\[([^\]]*)\]/)?.[1]?.replace(/"/g, '').split(',').map(t => t.trim()).filter(Boolean) || [];
  const publishedAt = fmRaw.match(/publishedAt:\s*(\d{4}-\d{2}-\d{2})/)?.[1] || '';
  return { fm: { title, description, tags, publishedAt }, body: content.slice(match[0].length) };
}

async function generateSocialContent(post) {
  const prompt = `
Com base neste post de blog, gere conteúdo para 3 redes sociais.

Título: ${post.title}
Descrição: ${post.description}
Tags: ${post.tags.join(', ')}

Gere exatamente neste formato:

---TWITTER---
[Thread de 3-4 tweets, cada um com max 280 chars, separados por linha em branco. Use emojis com moderação. Inclua link no último: ${config.siteUrl}/posts/SLUG]

---INSTAGRAM---
[Caption para Instagram: max 300 palavras, tom envolvente, termine com CTA para link na bio. Inclua 5-8 hashtags relevantes no final]

---LINKEDIN---
[Post LinkedIn: tom profissional mas acessível, max 200 palavras. Começa com hook forte. Termina com link]
`;

  const result = await generateText(prompt, { maxTokens: 2000, temperature: 0.7 });
  const twitter = result.match(/---TWITTER---\s*([\s\S]*?)(?=---INSTAGRAM---|$)/)?.[1]?.trim() || '';
  const instagram = result.match(/---INSTAGRAM---\s*([\s\S]*?)(?=---LINKEDIN---|$)/)?.[1]?.trim() || '';
  const linkedin = result.match(/---LINKEDIN---\s*([\s\S]*?)$/)?.[1]?.trim() || '';

  return { twitter, instagram, linkedin };
}

async function main() {
  console.log('📱 Gerando conteúdo para redes sociais...\n');

  if (!existsSync(SOCIAL_DIR)) mkdirSync(SOCIAL_DIR, { recursive: true });

  // Find today's PT posts (newly generated)
  const today = new Date().toISOString().split('T')[0];
  const postFiles = readdirSync(POSTS_DIR).filter(f =>
    f.endsWith('.md') && !f.startsWith('en-') && !f.startsWith('es-')
  );

  let generated = 0;

  for (const file of postFiles) {
    const content = readFileSync(join(POSTS_DIR, file), 'utf-8');
    const { fm } = parseFrontmatter(content);

    if (fm.publishedAt !== today) continue;

    const slug = file.replace('.md', '');
    const socialFile = join(SOCIAL_DIR, `${today}-${slug}.md`);

    // Skip if already generated
    if (existsSync(socialFile)) continue;

    console.log(`📝 Gerando social para: ${fm.title}`);

    try {
      const social = await generateSocialContent({ ...fm, slug });

      const output = `# Social Media — ${fm.title}
**Data:** ${today}
**Post:** /posts/${slug}
**URL:** ${config.siteUrl}/posts/${slug}

---

## Twitter/X Thread

${social.twitter}

---

## Instagram Caption

${social.instagram}

---

## LinkedIn Post

${social.linkedin}
`;

      writeFileSync(socialFile, output, 'utf-8');
      generated++;
      console.log(`✅ ${socialFile}`);

      // Rate limit
      await new Promise(r => setTimeout(r, 5000));
    } catch (error) {
      console.warn(`⚠️ Erro ao gerar social para ${slug}: ${error.message}`);
    }
  }

  console.log(`\n📊 ${generated} posts com conteúdo social gerado`);
}

main();
