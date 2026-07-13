/**
 * Multi-Provider AI Image Generation Router
 *
 * Strategy: Try providers in order until one succeeds.
 * If all fail, falls back to local SVG (always works).
 *
 * Providers:
 * 1. Cloudflare Workers AI (FLUX.1-schnell) — free, fast global edge
 * 2. Together.ai (FLUX.1-schnell) — reliable backup
 * 3. SVG fallback — always works, no external dependency
 *
 * Adding a new provider: just add an entry to PROVIDERS array.
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import sharp from 'sharp';
import { saveSVGImage } from './svg-generator.js';
import { config } from '../../../site.config.ts';

// --- Configuration ---

const PROVIDERS = [
  {
    name: 'Cloudflare Workers AI',
    enabled: !!(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_AI_TOKEN),
    endpoint: `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/black-forest-labs/flux-1-schnell`,
    apiKey: process.env.CLOUDFLARE_AI_TOKEN,
    model: '@cf/black-forest-labs/flux-1-schnell',
    maxWidth: 1024,
    maxHeight: 640,
    steps: 4,
    format: 'cloudflare',
  },
  {
    name: 'Together.ai',
    enabled: !!process.env.TOGETHER_API_KEY,
    endpoint: 'https://api.together.xyz/v1/images/generations',
    apiKey: process.env.TOGETHER_API_KEY,
    model: 'black-forest-labs/FLUX.1-schnell-Free',
    maxWidth: 1152,
    maxHeight: 640,
    steps: 4,
    format: 'openai',
  },
];

const POSTS_IMAGES_DIR = join(process.cwd(), 'public', 'images', 'posts');
const GLOSSARIO_IMAGES_DIR = join(process.cwd(), 'public', 'images', 'glossario');

// --- Prompt Templates ---

// Negative prompt — sent as separate API parameter so the model treats it as exclusion
const NEGATIVE_PROMPT = 'text, letters, words, numbers, writing, labels, watermarks, logos, signatures, captions, titles, subtitles, typography, font, alphabet, characters, inscriptions, stamps, badges, icons with letters, readable content, handwriting';

const COVER_STYLES = [
  (topic) => `Ultra-realistic professional lifestyle photography related to ${config.content.niche.en} and ${topic}, featuring real people in natural settings, warm authentic moments, modern clean aesthetic, soft natural lighting, shallow depth of field, editorial quality, neutral soft background, all surfaces clean and unmarked`,
  (topic) => `Abstract glowing data visualization related to ${topic}, modern dashboard aesthetic with smooth gradients, blurred colorful light streaks and bokeh dots, blue and green color palette, dark background with soft glowing elements, 3D perspective, purely abstract shapes and curves`,
  (topic) => `Abstract geometric composition representing ${config.content.niche.en} and ${topic}, flowing shapes symbolizing growth and stability, gold and deep blue tones, minimalist premium quality, soft gradient lighting, professional editorial style, clean unmarked surfaces`,
  (topic) => `Flat lay photography of financial planning objects related to ${topic}, closed leather notebook, calculator with screen off, scattered coins and green plants on marble surface, top-down view, organized aesthetic, soft natural lighting, warm tones, editorial magazine quality, all surfaces completely clean and unmarked`,
  (topic) => `Cinematic wide shot of a modern workspace related to ${config.content.niche.en} and ${topic}, laptop showing abstract colorful gradient wallpaper, coffee cup, morning light through window, shallow depth of field, cozy productive atmosphere, all screens show only colors and gradients`,
];

const INLINE_STYLES = [
  (topic) => `Authentic lifestyle photo related to ${topic}, real people in everyday ${config.content.niche.en} situations, warm natural lighting, candid moments, modern clean composition, soft bokeh background, editorial magazine quality, clean unmarked environment`,
  (topic) => `Minimalist flat illustration of ${topic} concept, clean vector style, pastel colors, simple geometric shapes representing finance, modern and friendly aesthetic, purely abstract symbols`,
  (topic) => `Close-up detail shot related to ${topic}, coins stacked, plant growing from jar, or hands holding phone showing abstract colorful gradient, macro photography, warm tones, soft bokeh, clean unmarked surfaces`,
];

const PROMPT_TEMPLATES = {
  cover: (topic) => COVER_STYLES[Math.floor(Math.random() * COVER_STYLES.length)](topic),
  glossary: (topic) =>
    `Abstract elegant visualization representing the ${config.content.niche.en} concept of ${topic}, minimalist premium quality, soft gradient lighting, professional editorial style, geometric shapes blended with subtle human elements, neutral soft gradient background, cyan and magenta accent colors, purely abstract with clean unmarked surfaces`,
  inline: (topic) => INLINE_STYLES[Math.floor(Math.random() * INLINE_STYLES.length)](topic),
};

// --- Core Functions ---

/**
 * Generate a professional cover image using AI providers
 * Falls back to local SVG if all providers fail
 *
 * @param {string} topic - Topic/title for the image prompt
 * @param {string} slug - Filename slug (without extension)
 * @param {string} destination - 'posts' or 'glossario'
 * @param {string} promptType - 'cover', 'glossary', or 'inline'
 * @returns {Promise<string>} local path like /images/posts/slug.webp
 */
export async function generateAIImage(topic, slug, destination = 'posts', promptType = 'cover') {
  const dir = destination === 'posts' ? POSTS_IMAGES_DIR : GLOSSARIO_IMAGES_DIR;
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const prompt = (PROMPT_TEMPLATES[promptType] || PROMPT_TEMPLATES.cover)(topic);
  const activeProviders = PROVIDERS.filter(p => p.enabled);

  // Try each provider in order
  for (const provider of activeProviders) {
    try {
      const imagePath = await callProvider(provider, prompt, slug, destination, dir);
      if (imagePath) {
        console.log(`✅ [${provider.name}] Image saved: ${imagePath}`);
        return imagePath;
      }
    } catch (err) {
      console.warn(`⚠️ [${provider.name}] Failed: ${err.message}`);
      // Continue to next provider
    }
  }

  // All providers failed — fallback to SVG
  if (activeProviders.length > 0) {
    console.log('📐 All AI providers failed — generating SVG fallback');
  } else {
    console.log('📐 No AI providers configured — generating SVG');
  }
  return saveSVGImage(topic, slug, destination);
}

/**
 * Call a single provider's API
 * All providers use OpenAI-compatible format
 */
async function callProvider(provider, prompt, slug, destination, dir) {
  console.log(`🎨 [${provider.name}] Generating image...`);

  let body;
  let headers;

  if (provider.format === 'cloudflare') {
    body = {
      prompt,
      negative_prompt: NEGATIVE_PROMPT,
      width: provider.maxWidth,
      height: provider.maxHeight,
      num_steps: provider.steps,
    };
    headers = {
      'Authorization': `Bearer ${provider.apiKey}`,
      'Content-Type': 'application/json',
    };
  } else {
    body = {
      model: provider.model,
      prompt,
      negative_prompt: NEGATIVE_PROMPT,
      width: provider.maxWidth,
      height: provider.maxHeight,
      steps: provider.steps,
      n: 1,
      response_format: 'b64_json',
    };
    headers = {
      'Authorization': `Bearer ${provider.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  const response = await fetch(provider.endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status}: ${errBody.substring(0, 150)}`);
  }

  let imageBuffer;

  if (provider.format === 'cloudflare') {
    const data = await response.json();
    if (data.result && data.result.image) {
      imageBuffer = Buffer.from(data.result.image, 'base64');
    } else {
      throw new Error('Cloudflare AI returned no image data');
    }
  } else {
    const data = await response.json();
    if (data.data && data.data[0]) {
      if (data.data[0].b64_json) {
        imageBuffer = Buffer.from(data.data[0].b64_json, 'base64');
      } else if (data.data[0].url) {
        const imgResponse = await fetch(data.data[0].url);
        if (!imgResponse.ok) throw new Error('Failed to download image from URL');
        imageBuffer = Buffer.from(await imgResponse.arrayBuffer());
      }
    }
  }

  if (!imageBuffer || imageBuffer.length < 1000) {
    throw new Error('Invalid or empty image data received');
  }

  const filename = `${slug}.webp`;
  const fullPath = join(dir, filename);

  // Padroniza em 1200x750 (>=1200px p/ og:image e rich results) + webp q78
  // (reduz ~80% o peso, melhora LCP). Fallback: grava o original.
  let outBuffer = imageBuffer;
  try {
    outBuffer = await sharp(imageBuffer).resize(1200, 750, { fit: 'cover' }).webp({ quality: 78, effort: 6 }).toBuffer();
  } catch (err) {
    console.warn(`   ⚠️ Falha ao otimizar imagem (${err.message}) — gravando original`);
  }
  writeFileSync(fullPath, outBuffer);

  const sizeKB = (outBuffer.length / 1024).toFixed(0);
  console.log(`   📸 ${sizeKB}KB saved → /images/${destination}/${filename}`);

  return `/images/${destination}/${filename}`;
}

/**
 * Convenience function: generate cover image (async)
 * This is what scripts should call
 */
export async function generateCoverImage(topic, slug, destination = 'posts') {
  const promptType = destination === 'glossario' ? 'glossary' : 'cover';
  return generateAIImage(topic, slug, destination, promptType);
}

/**
 * Generate inline section image (async)
 */
export async function generateInlineImage(topic, slug, destination = 'posts') {
  return generateAIImage(topic, slug, destination, 'inline');
}

/**
 * Sync fallback — returns SVG immediately (no API call)
 * Use when you can't await (backward compatibility)
 */
export function generateCoverImageSync(topic, slug, destination = 'posts') {
  return saveSVGImage(topic, slug, destination);
}

/**
 * Check which providers are configured
 */
export function getProviderStatus() {
  return PROVIDERS.map(p => ({
    name: p.name,
    enabled: p.enabled,
    model: p.model,
  }));
}
