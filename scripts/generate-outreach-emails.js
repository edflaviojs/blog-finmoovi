/**
 * Generate Outreach Emails - FinMoovi Blog
 * Reads broken link opportunities and generates outreach email drafts.
 *
 * Usage: node --import tsx scripts/generate-outreach-emails.js
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { BRAND_NAME, BLOG_HOST } from './lib/site.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Paths
const DATA_DIR = join(__dirname, '..', '.github', 'data');
const OPPORTUNITIES_FILE = join(DATA_DIR, 'broken-links-opportunities.json');
const OUTREACH_FILE = join(DATA_DIR, 'outreach-drafts.json');

// --- Helpers ---
function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function extractDomain(url) {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

// --- Email templates ---
function generateEmailPT(opportunity) {
  return {
    subject: 'Link quebrado no seu artigo — sugestão de substituição',
    body: `Olá,

Notei que no artigo "${opportunity.sourcePage}" há um link quebrado apontando para "${opportunity.brokenUrl}" (retorna erro ${opportunity.httpStatus}).

Tenho um artigo atualizado sobre o mesmo tema que pode ser uma boa substituição:
${opportunity.suggestedReplacement}

Espero que ajude seus leitores!

Atenciosamente,
Equipe ${BRAND_NAME}
${BLOG_HOST}`,
  };
}

function generateEmailEN(opportunity) {
  return {
    subject: 'Broken link in your article — replacement suggestion',
    body: `Hi there,

I noticed that in your article "${opportunity.sourcePage}" there is a broken link pointing to "${opportunity.brokenUrl}" (returns error ${opportunity.httpStatus}).

I have an updated article on the same topic that could be a good replacement:
${opportunity.suggestedReplacement}

Hope it helps your readers!

Best regards,
${BRAND_NAME} Team
${BLOG_HOST}`,
  };
}

// --- Main ---
function main() {
  log(`=== ${BRAND_NAME} Outreach Email Generator ===`);
  log('');

  // Load opportunities
  if (!existsSync(OPPORTUNITIES_FILE)) {
    log('[WARN] No opportunities file found. Run broken-link-finder.js first.');
    return;
  }

  const opportunities = JSON.parse(readFileSync(OPPORTUNITIES_FILE, 'utf-8'));
  const pending = opportunities.filter((o) => !o.outreachSent);

  log(`Total opportunities: ${opportunities.length}`);
  log(`Pending (outreachSent=false): ${pending.length}`);
  log('');

  if (pending.length === 0) {
    log('No pending opportunities to generate emails for.');
    return;
  }

  // Load existing drafts
  let drafts = [];
  if (existsSync(OUTREACH_FILE)) {
    try {
      drafts = JSON.parse(readFileSync(OUTREACH_FILE, 'utf-8'));
    } catch {
      drafts = [];
    }
  }

  const existingDraftKeys = new Set(drafts.map((d) => `${d.sourcePage}|${d.brokenUrl}`));
  let newDrafts = 0;

  for (const opportunity of pending) {
    const key = `${opportunity.sourcePage}|${opportunity.brokenUrl}`;
    if (existingDraftKeys.has(key)) {
      log(`  [SKIP] Draft already exists for: ${opportunity.brokenUrl}`);
      continue;
    }

    const domain = extractDomain(opportunity.sourcePage);
    const emailPT = generateEmailPT(opportunity);
    const emailEN = generateEmailEN(opportunity);

    const draft = {
      createdAt: new Date().toISOString(),
      targetDomain: domain,
      sourcePage: opportunity.sourcePage,
      brokenUrl: opportunity.brokenUrl,
      anchorText: opportunity.anchorText,
      suggestedReplacement: opportunity.suggestedReplacement,
      emailPT,
      emailEN,
      status: 'draft',
    };

    drafts.push(draft);
    existingDraftKeys.add(key);
    newDrafts++;

    log(`  [NEW] Draft for ${domain}: "${opportunity.anchorText}" -> ${opportunity.suggestedReplacement}`);
  }

  // Save drafts
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  writeFileSync(OUTREACH_FILE, JSON.stringify(drafts, null, 2), 'utf-8');

  log('');
  log('=== Summary ===');
  log(`New drafts generated: ${newDrafts}`);
  log(`Total drafts stored: ${drafts.length}`);
  log(`Saved to: ${OUTREACH_FILE}`);
}

main();
