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
import { saveSVGImage } from './svg-generator.js';

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

const PROMPT_TEMPLATES = {
  cover: (topic) =>
    `Professional financial concept, ${topic}, ultra high quality, photorealistic, clean composition, modern minimalist aesthetic, soft professional studio lighting, subtle depth of field, corporate style, dark background with accent lighting, NO text, NO letters, NO words, NO numbers, NO watermark, NO logos, NO people, NO hands`,
  glossary: (topic) =>
    `Abstract financial concept visualization representing ${topic}, elegant minimalist style, premium quality, soft gradient lighting, professional editorial photography, geometric shapes, dark moody background, cyan and magenta accent colors, NO text, NO letters, NO words, NO numbers, NO watermark`,
  inline: (topic) =>
    `Financial infographic concept about ${topic}, clean modern design, data visualization aesthetic, professional quality, dark theme with glowing accents, NO text, NO letters, NO words, NO numbers, NO watermark`,
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
  writeFileSync(fullPath, imageBuffer);

  const sizeKB = (imageBuffer.length / 1024).toFixed(0);
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
