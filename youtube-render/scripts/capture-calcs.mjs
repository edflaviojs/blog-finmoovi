// Captura as calculadoras públicas do blog (blog.finmoovi.com/ferramentas) em
// vídeo via Playwright: navega → clica Calcular → resultado + gráfico → rola.
// Grava desktop 16:9 e celular 9:16 (webm). Depois converte p/ mp4 (ver bash).
// Reusa o Playwright/chromium instalado em ../../app-capture/node_modules.
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(__dirname, '../../app-capture/package.json'));
const { chromium } = require('playwright');

const BASE = 'https://blog.finmoovi.com/ferramentas';
const OUT = path.resolve(__dirname, '../out/calc-webm');

const CALCS = [
  { slug: 'calculadora-juros-compostos', btn: '#calc-btn', wait: '#results' },
  { slug: 'calculadora-financiamento', btn: '#calc-btn', wait: '#results' },
  { slug: 'calculadora-aposentadoria', btn: '#calc-btn', wait: '#results' },
  { slug: 'calculadora-orcamento', btn: '#calc-btn', wait: '#results' },
  { slug: 'calculadora-reserva', btn: '#calc-btn', wait: '#results' },
  { slug: 'simulador-investimento', btn: '#calc-btn', wait: '#results' },
  { slug: 'conversor-moedas', btn: null, wait: '#result-main' },
];

const FORMATS = [
  { name: 'desktop-16-9', viewport: { width: 1280, height: 720 }, dsf: 1, size: { width: 1280, height: 720 } },
  { name: 'phone-9-16', viewport: { width: 432, height: 768 }, dsf: 2, isMobile: true, size: { width: 864, height: 1536 } },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function capture(browser, calc, fmt) {
  const dir = path.join(OUT, `${calc.slug}__${fmt.name}`);
  const context = await browser.newContext({
    viewport: fmt.viewport, deviceScaleFactor: fmt.dsf,
    isMobile: !!fmt.isMobile, hasTouch: !!fmt.isMobile,
    recordVideo: { dir, size: fmt.size },
  });
  // pré-aceita o cookie (chave real do blog) → banner nunca aparece
  await context.addInitScript(() => { try { localStorage.setItem('fm-cookie-ok', '1'); } catch (e) {} });
  const page = await context.newPage();
  try {
    await page.goto(`${BASE}/${calc.slug}/`, { waitUntil: 'networkidle', timeout: 45000 });
    await page.evaluate(() => { const el = document.getElementById('cookie-notice'); if (el) el.remove(); }).catch(() => {});
    await sleep(1000);
    if (calc.btn) {
      await page.click(calc.btn).catch(() => {});
    }
    // espera o resultado aparecer
    await page.waitForSelector(calc.wait, { state: 'visible', timeout: 15000 }).catch(() => {});
    await sleep(1500);
    // rola devagar até o gráfico/resultado e volta
    await page.evaluate(() => {
      const el = document.querySelector('#chart') || document.querySelector('#results') || document.querySelector('#result');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    await sleep(3500);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    await sleep(2500);
  } catch (e) {
    console.log(`  ! ${calc.slug} ${fmt.name}: ${e.message}`);
  }
  await context.close(); // finaliza o vídeo
  console.log(`OK  ${calc.slug} ${fmt.name}`);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const calcs = process.env.SMOKE ? [CALCS[0]] : CALCS;
  const fmts = process.env.SMOKE ? [FORMATS[0]] : FORMATS;
  for (const calc of calcs) {
    for (const fmt of fmts) {
      await capture(browser, calc, fmt);
    }
  }
  await browser.close();
  console.log('=== CAPTURA DE CALCULADORAS COMPLETA ===');
})();
