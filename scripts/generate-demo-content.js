/**
 * Generate Demo Content
 * Creates 3 sample posts for the configured niche using AI.
 * Run after setup to have initial content in the blog.
 *
 * Usage: npm run demo-content
 * Requires: GROQ_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY, or KIE_API_KEY
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { config } from '../site.config.ts';

const POSTS_DIR = join(process.cwd(), 'src', 'content', 'posts');

// AI Provider detection (same as setup.js)
async function callAI(prompt) {
  const providers = [
    { key: 'GROQ_API_KEY', url: 'https://api.groq.com/openai/v1/chat/completions', model: 'openai/gpt-oss-120b', format: 'openai' },
    { key: 'OPENAI_API_KEY', url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini', format: 'openai' },
    { key: 'ANTHROPIC_API_KEY', url: 'https://api.anthropic.com/v1/messages', model: 'claude-sonnet-4-20250514', format: 'anthropic' },
    { key: 'KIE_API_KEY', url: 'https://api.kie.ai/v1/chat/completions', model: 'kie-default', format: 'openai' },
  ];

  for (const provider of providers) {
    const apiKey = process.env[provider.key];
    if (!apiKey) continue;

    try {
      if (provider.format === 'anthropic') {
        const res = await fetch(provider.url, {
          method: 'POST',
          headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: provider.model, max_tokens: 3000, messages: [{ role: 'user', content: prompt }] })
        });
        const data = await res.json();
        return data.content?.[0]?.text || null;
      } else {
        const res = await fetch(provider.url, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: provider.model, messages: [{ role: 'user', content: prompt }], max_tokens: 3000, temperature: 0.7 })
        });
        const data = await res.json();
        return data.choices?.[0]?.message?.content || null;
      }
    } catch (e) {
      continue;
    }
  }
  return null;
}

function slugify(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 60);
}

function getToday() {
  return new Date().toISOString().split('T')[0];
}

async function generatePost(topic, locale, index) {
  const langLabels = { pt: 'português', en: 'English', es: 'español' };
  const translationKey = `demo-post-${index}`;

  const prompt = `Write a blog post in ${langLabels[locale]} about "${topic}" for a ${config.content.niche[locale]} blog called "${config.brand.name}".

Requirements:
- Title: catchy, SEO-friendly (max 60 chars)
- Content: 800-1200 words in markdown
- Use H2 headers (##) to organize sections (4-6 sections)
- Include practical tips and actionable advice
- Mention ${config.app.name} naturally once or twice as a tool that helps
- Tone: ${config.ai.personality.substring(0, 100)}
- Do NOT start with "Introdução" or "In this article"
- Go straight to the point

Return in this exact format (no code blocks):
TITLE: Your Title Here
DESCRIPTION: Meta description (max 155 chars)
---
Your markdown content here...`;

  const result = await callAI(prompt);
  if (!result) return null;

  // Parse response
  const titleMatch = result.match(/^TITLE:\s*(.+)$/m);
  const descMatch = result.match(/^DESCRIPTION:\s*(.+)$/m);
  const contentStart = result.indexOf('---');

  if (!titleMatch || contentStart === -1) return null;

  const title = titleMatch[1].trim();
  const description = descMatch ? descMatch[1].trim() : title;
  const content = result.substring(contentStart + 3).trim();
  const slug = `${locale === 'pt' ? '' : locale + '-'}${slugify(title)}`;
  const category = config.content.categories[index % config.content.categories.length];

  const frontmatter = `---
title: "${title}"
description: "${description}"
date: "${getToday()}"
author: "${config.content.defaultAuthor}"
category: "${category}"
tags: ["${config.content.niche[locale]}", "${category}"]
image: "/images/posts/demo-${index + 1}.svg"
translationKey: "${translationKey}"
locale: "${locale}"
draft: false
---`;

  return {
    slug,
    content: `${frontmatter}\n\n${content}`,
  };
}

function generatePlaceholderSVG(index) {
  const colors = [
    { bg: '#1a1a2e', accent: '#00F0FF' },
    { bg: '#16213e', accent: '#A91079' },
    { bg: '#0f3460', accent: '#3fb950' },
  ];
  const c = colors[index % colors.length];

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect fill="${c.bg}" width="1200" height="630"/>
  <circle cx="600" cy="280" r="120" fill="none" stroke="${c.accent}" stroke-width="3" opacity="0.3"/>
  <circle cx="600" cy="280" r="80" fill="none" stroke="${c.accent}" stroke-width="2" opacity="0.5"/>
  <circle cx="600" cy="280" r="40" fill="${c.accent}" opacity="0.15"/>
  <text x="600" y="450" font-family="system-ui" font-size="32" fill="white" text-anchor="middle" opacity="0.7">${config.brand.name}</text>
  <text x="600" y="490" font-family="system-ui" font-size="18" fill="${c.accent}" text-anchor="middle" opacity="0.5">Demo Post ${index + 1}</text>
</svg>`;
}

async function main() {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  📝 Gerando Demo Content para "${config.brand.name}"        ║
║  Nicho: ${config.content.niche.pt.padEnd(47)}║
╚══════════════════════════════════════════════════════════════╝
`);

  // Check for AI
  const hasAI = ['GROQ_API_KEY', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'KIE_API_KEY'].some(k => process.env[k]);
  if (!hasAI) {
    console.log('❌ Nenhuma API key de IA encontrada.');
    console.log('   Configure uma das variáveis: GROQ_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY, KIE_API_KEY');
    process.exit(1);
  }

  // Ensure directories
  if (!existsSync(POSTS_DIR)) mkdirSync(POSTS_DIR, { recursive: true });
  const imagesDir = join(process.cwd(), 'public', 'images', 'posts');
  if (!existsSync(imagesDir)) mkdirSync(imagesDir, { recursive: true });

  // Generate topics
  const topics = config.ai?.dailyTopics?.slice(0, 3) || [
    `Guia para iniciantes em ${config.content.niche.pt}`,
    `5 dicas práticas de ${config.content.niche.pt}`,
    `Erros comuns em ${config.content.niche.pt} e como evitar`,
  ];

  const locales = ['pt', 'en', 'es'];
  let generated = 0;

  for (let i = 0; i < 3; i++) {
    console.log(`\n📝 Post ${i + 1}/3: "${topics[i]}"`);

    for (const locale of locales) {
      process.stdout.write(`   ${locale.toUpperCase()}... `);
      const post = await generatePost(topics[i], locale, i);

      if (post) {
        const filePath = join(POSTS_DIR, `${post.slug}.md`);
        writeFileSync(filePath, post.content, 'utf-8');
        console.log(`✅ ${post.slug}.md`);
        generated++;
      } else {
        console.log('❌ falha');
      }
    }

    // Generate placeholder image
    const svgPath = join(imagesDir, `demo-${i + 1}.svg`);
    writeFileSync(svgPath, generatePlaceholderSVG(i), 'utf-8');
  }

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅ Gerados: ${generated} posts (${generated / 3} tópicos × 3 idiomas)
  📂 Local: src/content/posts/
  🖼️  Imagens: public/images/posts/demo-*.svg

  Próximo: npm run dev para visualizar
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
}

main().catch(e => {
  console.error('Erro:', e.message);
  process.exit(1);
});
