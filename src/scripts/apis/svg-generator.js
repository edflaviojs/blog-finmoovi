/**
 * Gerador de imagens SVG temáticas para posts do blog
 * Gera SVGs profissionais sem texto, apenas visualizações financeiras
 * Alternativa ao Pollinations (que agora é pago)
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const POSTS_IMAGES_DIR = join(process.cwd(), 'public', 'images', 'posts');
const GLOSSARIO_IMAGES_DIR = join(process.cwd(), 'public', 'images', 'glossario');

// Color palettes for variety — transparent bg for dark/light compatibility
const PALETTES = [
  { primary: '#00F0FF', secondary: '#A91079', bg: 'transparent', card: 'rgba(128,128,128,0.06)', border: 'rgba(128,128,128,0.15)' },
  { primary: '#10B981', secondary: '#F59E0B', bg: 'transparent', card: 'rgba(128,128,128,0.06)', border: 'rgba(128,128,128,0.15)' },
  { primary: '#8B5CF6', secondary: '#EC4899', bg: 'transparent', card: 'rgba(128,128,128,0.06)', border: 'rgba(128,128,128,0.15)' },
  { primary: '#06B6D4', secondary: '#F97316', bg: 'transparent', card: 'rgba(128,128,128,0.06)', border: 'rgba(128,128,128,0.15)' },
  { primary: '#14B8A6', secondary: '#E11D48', bg: 'transparent', card: 'rgba(128,128,128,0.06)', border: 'rgba(128,128,128,0.15)' },
];

// Chart patterns
const CHART_TYPES = ['line-up', 'bars', 'pie', 'area', 'candles', 'scatter'];

function seededRandom(seed) {
  let s = seed;
  return function() {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function generateLineChart(palette, rng) {
  const points = [];
  let y = 350 + rng() * 100;
  for (let x = 140; x <= 1060; x += 115) {
    y = Math.max(120, Math.min(500, y + (rng() - 0.4) * 80));
    points.push({ x, y: Math.round(y) });
  }

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ');
  const areaD = pathD + ` L1060 500 L140 500 Z`;

  const gridLines = [200, 300, 400, 500].map(y =>
    `<line x1="140" y1="${y}" x2="1060" y2="${y}" stroke="${palette.border}" stroke-width="0.5" stroke-dasharray="4 4"/>`
  ).join('\n  ');

  const dots = points.filter((_, i) => i % 2 === 0).map(p =>
    `<circle cx="${p.x}" cy="${p.y}" r="5" fill="${palette.primary}" opacity="0.8"/>`
  ).join('\n  ');

  return `${gridLines}
  <path d="${areaD}" fill="url(#areaGrad)" opacity="0.3"/>
  <path d="${pathD}" stroke="url(#lineGrad)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  ${dots}`;
}

function generateBars(palette, rng) {
  const bars = [];
  const barWidth = 60;
  const gap = 30;
  const startX = 160;

  for (let i = 0; i < 8; i++) {
    const height = 80 + rng() * 300;
    const x = startX + i * (barWidth + gap);
    const y = 520 - height;
    const opacity = 0.6 + rng() * 0.4;
    bars.push(`<rect x="${x}" y="${y}" width="${barWidth}" height="${height}" rx="4" fill="url(#barGrad)" opacity="${opacity.toFixed(2)}"/>`);
  }

  return bars.join('\n  ');
}

function generatePieChart(palette, rng) {
  const cx = 600, cy = 300, r = 180;
  const segments = [];
  let startAngle = 0;
  const sizes = [0.3, 0.25, 0.2, 0.15, 0.1].map(s => s + (rng() - 0.5) * 0.05);
  const total = sizes.reduce((a, b) => a + b, 0);
  const colors = [palette.primary, palette.secondary, '#8B949E', 'rgba(128,128,128,0.25)', 'rgba(128,128,128,0.15)'];

  for (let i = 0; i < sizes.length; i++) {
    const angle = (sizes[i] / total) * 360;
    const endAngle = startAngle + angle;
    const x1 = cx + r * Math.cos(startAngle * Math.PI / 180);
    const y1 = cy + r * Math.sin(startAngle * Math.PI / 180);
    const x2 = cx + r * Math.cos(endAngle * Math.PI / 180);
    const y2 = cy + r * Math.sin(endAngle * Math.PI / 180);
    const largeArc = angle > 180 ? 1 : 0;
    segments.push(`<path d="M${cx} ${cy} L${x1.toFixed(1)} ${y1.toFixed(1)} A${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z" fill="${colors[i]}" opacity="${0.7 + i * 0.05}"/>`);
    startAngle = endAngle;
  }

  // Inner circle for donut effect
  segments.push(`<circle cx="${cx}" cy="${cy}" r="${r * 0.5}" fill="${palette.card}"/>`);

  return segments.join('\n  ');
}

function generateAreaChart(palette, rng) {
  const lines = [];
  for (let line = 0; line < 3; line++) {
    const points = [];
    let y = 250 + line * 60 + rng() * 50;
    for (let x = 140; x <= 1060; x += 80) {
      y = Math.max(100, Math.min(500, y + (rng() - 0.45) * 60));
      points.push({ x, y: Math.round(y) });
    }
    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ');
    const areaD = pathD + ` L1060 530 L140 530 Z`;
    const opacity = 0.15 - line * 0.03;
    const color = line === 0 ? palette.primary : line === 1 ? palette.secondary : '#8B949E';
    lines.push(`<path d="${areaD}" fill="${color}" opacity="${opacity}"/>`);
    lines.push(`<path d="${pathD}" stroke="${color}" stroke-width="2" fill="none" opacity="0.8"/>`);
  }
  return lines.join('\n  ');
}

function generateCandles(palette, rng) {
  const candles = [];
  const candleWidth = 24;
  const gap = 50;
  const startX = 170;

  for (let i = 0; i < 10; i++) {
    const x = startX + i * (candleWidth + gap);
    const open = 200 + rng() * 250;
    const close = open + (rng() - 0.5) * 100;
    const high = Math.min(open, close) - rng() * 40;
    const low = Math.max(open, close) + rng() * 40;
    const isUp = close < open;
    const color = isUp ? palette.primary : palette.secondary;
    const bodyTop = Math.min(open, close);
    const bodyHeight = Math.abs(close - open);

    candles.push(`<line x1="${x + candleWidth/2}" y1="${high}" x2="${x + candleWidth/2}" y2="${low}" stroke="${color}" stroke-width="1.5"/>`);
    candles.push(`<rect x="${x}" y="${bodyTop}" width="${candleWidth}" height="${Math.max(bodyHeight, 3)}" rx="2" fill="${color}" opacity="0.85"/>`);
  }
  return candles.join('\n  ');
}

function generateScatter(palette, rng) {
  const dots = [];
  for (let i = 0; i < 40; i++) {
    const x = 160 + rng() * 880;
    const y = 100 + rng() * 420;
    const r = 3 + rng() * 8;
    const color = rng() > 0.5 ? palette.primary : palette.secondary;
    const opacity = 0.3 + rng() * 0.5;
    dots.push(`<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${r.toFixed(1)}" fill="${color}" opacity="${opacity.toFixed(2)}"/>`);
  }
  // Trend line
  dots.push(`<line x1="160" y1="450" x2="1040" y2="150" stroke="${palette.primary}" stroke-width="2" stroke-dasharray="6 4" opacity="0.5"/>`);
  return dots.join('\n  ');
}

/**
 * Generate a financial SVG image
 * @param {string} topic - Topic for seeding randomness
 * @param {string} type - 'cover' (1200x630) or 'inline' (800x450)
 * @returns {string} SVG content
 */
export function generateSVG(topic, type = 'cover') {
  // Generate consistent seed from topic
  let seed = 0;
  for (let i = 0; i < topic.length; i++) {
    seed = ((seed << 5) - seed) + topic.charCodeAt(i);
    seed |= 0;
  }
  seed = Math.abs(seed);

  const rng = seededRandom(seed);
  const palette = PALETTES[seed % PALETTES.length];
  const chartType = CHART_TYPES[seed % CHART_TYPES.length];

  const width = type === 'cover' ? 1200 : 800;
  const height = type === 'cover' ? 630 : 450;

  let chartContent = '';
  switch (chartType) {
    case 'line-up': chartContent = generateLineChart(palette, rng); break;
    case 'bars': chartContent = generateBars(palette, rng); break;
    case 'pie': chartContent = generatePieChart(palette, rng); break;
    case 'area': chartContent = generateAreaChart(palette, rng); break;
    case 'candles': chartContent = generateCandles(palette, rng); break;
    case 'scatter': chartContent = generateScatter(palette, rng); break;
    default: chartContent = generateLineChart(palette, rng);
  }

  // Decorative elements
  const decorations = `
  <circle cx="${width * 0.85}" cy="${height * 0.15}" r="${60 + rng() * 40}" fill="${palette.primary}" opacity="0.03"/>
  <circle cx="${width * 0.15}" cy="${height * 0.8}" r="${40 + rng() * 30}" fill="${palette.secondary}" opacity="0.04"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" fill="none">
  <rect width="${width}" height="${height}" fill="${palette.bg}"/>
  <rect x="30" y="30" width="${width - 60}" height="${height - 60}" rx="20" fill="${palette.card}" stroke="${palette.border}" stroke-width="1"/>
  <defs>
    <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${palette.primary}"/>
      <stop offset="100%" stop-color="${palette.secondary}"/>
    </linearGradient>
    <linearGradient id="areaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${palette.primary}" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="${palette.primary}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="barGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${palette.primary}"/>
      <stop offset="100%" stop-color="${palette.secondary}"/>
    </linearGradient>
  </defs>
  ${decorations}
  ${chartContent}
</svg>`;
}

/**
 * Save SVG as a file and return the public path
 */
export function saveSVGImage(topic, slug, destination = 'posts') {
  const dir = destination === 'posts' ? POSTS_IMAGES_DIR : GLOSSARIO_IMAGES_DIR;
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const svg = generateSVG(topic, 'cover');
  const filename = `${slug}.svg`;
  const fullPath = join(dir, filename);
  writeFileSync(fullPath, svg, 'utf-8');

  return `/images/${destination}/${filename}`;
}
