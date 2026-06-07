/**
 * Auto Schema Generator
 * Adds FAQ or HowTo structured data to posts as HTML comment at end of file
 * The PostLayout reads these and injects as JSON-LD
 *
 * Usage: node src/scripts/automacoes/auto-schema.js
 * Safe to re-run: checks for existing schema before adding
 */

import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const POSTS_DIR = join(process.cwd(), 'src', 'content', 'posts');

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { fm: '', body: content };
  return { fm: match[1], body: content.slice(match[0].length) };
}

function detectFAQContent(body) {
  const questions = [];
  const lines = body.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (/^#{2,3}\s+.*\?$/.test(line)) {
      const question = line.replace(/^#{2,3}\s+/, '');
      let answer = '';
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j].trim();
        if (nextLine.startsWith('#') || (nextLine === '' && answer.length > 50)) break;
        if (nextLine) {
          let clean = nextLine.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*_`!]/g, '');
          answer += (answer ? ' ' : '') + clean;
        }
      }
      if (answer.length > 20) {
        questions.push({ question, answer: answer.substring(0, 300).replace(/-->/g, '—>') });
      }
    }
  }
  return questions;
}

function detectHowToContent(body, fm) {
  const steps = [];
  const lines = body.split('\n');

  const titleMatch = fm.match(/title:\s*"?([^"\n]+)"?/);
  const title = titleMatch ? titleMatch[1].trim() : '';
  if (!/como|how to|cómo|passo|step|guia/i.test(title)) return null;

  let currentStep = null;
  for (const line of lines) {
    const stepMatch = line.match(/^(?:###?\s*)?(?:\*\*)?(?:Passo|Step|Paso)?\s*(\d+)[.:)\-]\s*(.+?)(?:\*\*)?$/i) ||
                      line.match(/^(\d+)\.\s+\*?\*?(.+?)\*?\*?$/);
    if (stepMatch) {
      if (currentStep) steps.push(currentStep);
      currentStep = { name: stepMatch[2].replace(/[*_`]/g, '').trim(), text: '' };
    } else if (currentStep && line.trim() && !line.startsWith('#')) {
      currentStep.text += (currentStep.text ? ' ' : '') + line.trim().replace(/[*_`\[\]()!]/g, '');
    } else if (currentStep && line.startsWith('#')) {
      steps.push(currentStep);
      currentStep = null;
    }
  }
  if (currentStep) steps.push(currentStep);

  return steps.length >= 3 ? steps : null;
}

function main() {
  console.log('🏗️ Gerando schemas automáticos para posts...\n');

  const postFiles = readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));
  let faqCount = 0;
  let howToCount = 0;
  let skipped = 0;

  for (const file of postFiles) {
    const filePath = join(POSTS_DIR, file);
    const content = readFileSync(filePath, 'utf-8');

    if (content.includes('<!-- SCHEMA_AUTO:')) {
      skipped++;
      continue;
    }

    const { fm, body } = parseFrontmatter(content);

    // Try FAQ first
    const faqs = detectFAQContent(body);
    if (faqs.length >= 2) {
      const schema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faqs.slice(0, 5).map(q => ({
          "@type": "Question",
          "name": q.question,
          "acceptedAnswer": { "@type": "Answer", "text": q.answer }
        }))
      };
      const schemaStr = JSON.stringify(schema).replace(/-->/g, '--\\u003e');
      const schemaTag = `\n<!-- SCHEMA_AUTO:${schemaStr} -->`;
      writeFileSync(filePath, content.trimEnd() + schemaTag + '\n', 'utf-8');
      faqCount++;
      console.log(`✅ FAQ: ${file} (${faqs.length} perguntas)`);
      continue;
    }

    // Try HowTo
    const steps = detectHowToContent(body, fm);
    if (steps) {
      const titleMatch = fm.match(/title:\s*"?([^"\n]+)"?/);
      const schema = {
        "@context": "https://schema.org",
        "@type": "HowTo",
        "name": titleMatch ? titleMatch[1].trim() : file.replace('.md', ''),
        "step": steps.slice(0, 8).map((s, i) => ({
          "@type": "HowToStep",
          "position": i + 1,
          "name": s.name,
          "text": (s.text || s.name).substring(0, 200)
        }))
      };
      const schemaStr = JSON.stringify(schema).replace(/-->/g, '--\\u003e');
      const schemaTag = `\n<!-- SCHEMA_AUTO:${schemaStr} -->`;
      writeFileSync(filePath, content.trimEnd() + schemaTag + '\n', 'utf-8');
      howToCount++;
      console.log(`✅ HowTo: ${file} (${steps.length} passos)`);
      continue;
    }
  }

  console.log(`\n📊 Resultados: ${faqCount} FAQ + ${howToCount} HowTo = ${faqCount + howToCount} novos | ${skipped} já tinham schema`);
}

main();
