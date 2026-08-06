/**
 * Teste unitário do link-guard (rodar: node --test tests/).
 *
 * A função é pura (sem rede, sem fs no núcleo), no padrão do
 * validateCommentPayload e do fixStaleYear. O caso 1 é o defeito REAL de
 * 05/08/2026 que parou o deploy do blog ~20h — se este teste passar a falhar,
 * a guarda deixou de proteger contra a coisa que a fez nascer.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { fixInternalLinks } from '../src/scripts/lib/link-guard.js';

const destinos = new Set([
  '/glossario/pix',
  '/glossario/kyc',
  '/es/glossario/es-selic',
  '/es/glossario/es-cdi',
  '/en/posts/en-how-to-save',
]);

test('caso real 05/08: link inventado cai, link válido fica', () => {
  const md = 'Usa la calculadora del [Banco Central](/es/glossario/es-banco-central) '
    + 'y compara con la [tasa interbancaria](/es/glossario/es-cdi).';
  const r = fixInternalLinks(md, destinos);
  assert.equal(r.changed, true);
  assert.equal(r.desembrulhados.length, 1);
  assert.equal(r.desembrulhados[0].href, '/es/glossario/es-banco-central');
  // o texto visível é preservado; só a URL inventada desaparece
  assert.match(r.text, /del Banco Central y/);
  assert.match(r.text, /\[tasa interbancaria\]\(\/es\/glossario\/es-cdi\)/);
});

test('nunca inventa destino de substituição — só desembrulha', () => {
  const r = fixInternalLinks('veja [isto](/glossario/nao-existe)', destinos);
  assert.equal(r.text, 'veja isto');
});

test('imagens nunca são tocadas (![alt](url) não é link de navegação)', () => {
  const md = '![Um gráfico](/images/glossario/nao-existe.webp)';
  const r = fixInternalLinks(md, destinos);
  assert.equal(r.changed, false);
  assert.equal(r.text, md);
});

test('âncora sobre destino que existe é preservada', () => {
  const md = 'veja [Pix](/glossario/pix#exemplos)';
  const r = fixInternalLinks(md, destinos);
  assert.equal(r.changed, false);
  assert.equal(r.text, md);
});

test('âncora sobre destino inventado é desembrulhada', () => {
  const r = fixInternalLinks('veja [X](/glossario/inventado#secao)', destinos);
  assert.equal(r.changed, true);
  assert.equal(r.text, 'veja X');
});

test('barra final não muda a decisão (sitemap serve COM barra)', () => {
  const comBarra = fixInternalLinks('[Pix](/glossario/pix/)', destinos);
  assert.equal(comBarra.changed, false);
  const semBarra = fixInternalLinks('[Pix](/glossario/pix)', destinos);
  assert.equal(semBarra.changed, false);
});

test('links fora de posts/glossário ficam intactos (não temos lista fechada deles)', () => {
  const md = '[Calculadora](/ferramentas/calculadora-reserva) e [Dicas](/categorias/dicas) e [App](/app)';
  const r = fixInternalLinks(md, destinos);
  assert.equal(r.changed, false);
  assert.equal(r.text, md);
});

test('link com título entre aspas não é tocado (fora do padrão que o modelo escreve)', () => {
  const md = '[X](/glossario/nao-existe "um titulo")';
  const r = fixInternalLinks(md, destinos);
  assert.equal(r.changed, false);
});

test('falha segura: sem lista de destinos não altera nada', () => {
  const md = '[X](/glossario/nao-existe)';
  assert.equal(fixInternalLinks(md, new Set()).text, md);
  assert.equal(fixInternalLinks(md, null).text, md);
  assert.equal(fixInternalLinks(md, undefined).changed, false);
});

test('entrada não-string devolve o valor original sem lançar', () => {
  assert.equal(fixInternalLinks(null, destinos).changed, false);
  assert.equal(fixInternalLinks(42, destinos).changed, false);
  assert.equal(fixInternalLinks('', destinos).changed, false);
});

test('conta e reporta todos os inventados, não só o primeiro', () => {
  const md = '[A](/glossario/x) e [B](/en/posts/en-y) e [C](/glossario/pix)';
  const r = fixInternalLinks(md, destinos);
  assert.equal(r.desembrulhados.length, 2);
  assert.equal(r.text, 'A e B e [C](/glossario/pix)');
});
