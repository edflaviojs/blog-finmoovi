/**
 * gerar-arte-sazonal.js — Fase C do sazonal: gera CANDIDATOS de arte (IA) para
 * os banners de datas comemorativas que se aproximam.
 *
 * Fluxo com APROVAÇÃO HUMANA (a arte nunca vai ao ar sozinha):
 *   1. Este script roda semanalmente (workflow gerar-arte-sazonal.yml) e olha
 *      os eventos de config.seasonal que começam nos próximos 45 dias e ainda
 *      não têm `art` definido nem candidatos gerados.
 *   2. Gera 2 candidatos por evento em public/images/sazonal/<id>-candidato-N.webp
 *      (o workflow commita — as imagens ficam no repo, mas NADA muda no site).
 *   3. O usuário escolhe: define `art: '/images/sazonal/<id>-candidato-N.webp'`
 *      no evento em site.config.ts → o slide passa a usar a arte como fundo.
 *      Sem aprovação, o slide usa só o tema CSS (que já é bonito) — seguro por padrão.
 *
 * Uso local: node --import tsx src/scripts/automacoes/gerar-arte-sazonal.js
 */
import { existsSync } from 'fs';
import { join } from 'path';
import { generateAIImage } from '../apis/image-router.js';
import { config } from '../../../site.config.ts';

const HORIZON_DAYS = 45;
const CANDIDATES = 2;

// Assunto do key visual por tema — curado (a "cara de agência" vem daqui +
// do template `seasonal` do image-router, não de prompt genérico)
const THEME_TOPICS = {
  natal: 'Christmas holiday season: elegant wrapped gifts, pine branches, golden and deep red ornaments',
  anonovo: "New Year's Eve celebration: golden fireworks sparks, champagne glasses, elegant clock near midnight",
  carnaval: 'Brazilian Carnival: elegant venetian mask, confetti and streamers, purple gold and teal palette',
  blackfriday: 'Black Friday shopping: elegant dark gift boxes and shopping bags, golden accents',
  maes: "Mother's Day: delicate bouquet of soft pink roses, elegant small gift box",
  ir: 'tax season desk: elegant leather document folder, premium calculator, small golden lion statuette',
};

function isoPlusDays(days) {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

async function main() {
  const hasProvider =
    !!(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_AI_TOKEN) ||
    !!process.env.TOGETHER_API_KEY;
  if (!hasProvider) {
    console.log('ℹ️  Sem provider de imagem configurado (CLOUDFLARE_AI_TOKEN/TOGETHER_API_KEY) — nada a fazer.');
    return;
  }

  const today = isoPlusDays(0);
  const horizon = isoPlusDays(HORIZON_DAYS);
  const events = (config.seasonal && config.seasonal.events) || [];

  // Eventos que se aproximam (ou já ativos), sem arte aprovada
  const upcoming = events.filter(e => !e.art && e.start <= horizon && e.end >= today);
  if (upcoming.length === 0) {
    console.log(`ℹ️  Nenhum evento sazonal nos próximos ${HORIZON_DAYS} dias sem arte — nada a fazer.`);
    return;
  }

  let generated = 0;
  for (const event of upcoming) {
    const firstCandidate = join(process.cwd(), 'public', 'images', 'sazonal', `${event.id}-candidato-1.webp`);
    if (existsSync(firstCandidate)) {
      console.log(`⏭️  ${event.id}: candidatos já gerados (aguardando aprovação humana).`);
      continue;
    }

    const topic = THEME_TOPICS[event.theme] || event.title.en || event.title.pt;
    console.log(`\n🎨 ${event.id} (${event.start} → ${event.end}) — gerando ${CANDIDATES} candidatos...`);
    for (let n = 1; n <= CANDIDATES; n++) {
      const path = await generateAIImage(topic, `${event.id}-candidato-${n}`, 'sazonal', 'seasonal');
      // Fallback SVG não serve como candidato de campanha — descarta do relato
      if (path && path.endsWith('.webp')) {
        console.log(`   ✅ candidato ${n}: ${path}`);
        generated++;
      } else {
        console.log(`   ⚠️ candidato ${n}: provider falhou (${path}) — tentar de novo na próxima rodada`);
      }
    }
  }

  if (generated > 0) {
    console.log(`\n📋 ${generated} candidato(s) gerado(s). PARA APROVAR: escolha um e defina no evento em site.config.ts:`);
    console.log(`    art: '/images/sazonal/<id>-candidato-N.webp'`);
    console.log('    Sem aprovação o slide continua usando só o tema CSS (padrão seguro).');
  }
}

main().catch(e => { console.error('Erro:', e.message); process.exit(1); });
