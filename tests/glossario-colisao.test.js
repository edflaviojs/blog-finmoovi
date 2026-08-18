/**
 * Teste da trava de colisão do glossário diário (rodar: npm test).
 *
 * O CASO REAL (17 e 18/08/2026): a fila tinha "fatura do cartão" e o glossário
 * já tinha publicado "fatura do cartão mais". Em português são dois ficheiros
 * diferentes — e a única trava que existia olhava só para o português. Mas o
 * nome do ficheiro EN/ES sai do termo TRADUZIDO, e os dois traduzem para a
 * mesma coisa: `en-credit-card-statement.md` e `es-factura-de-la-tarjeta.md`.
 *
 * O robô gravava por cima. O verbete PT antigo ficava sem irmãos, o
 * auto-corretor i18n tentava remendá-lo com um nome em português, a trava de
 * slug reprovava, e a corrida morria — todos os dias, porque a corrida morta
 * nunca chegava a marcar a keyword como usada.
 *
 * Estes casos fixam a regra: nunca gravar por cima do ficheiro de outro
 * verbete. E — igualmente importante — provam que a trava NÃO estorva o caso
 * normal (gravar por cima de si próprio numa repetição é permitido).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { slugify, chaveDoTermo, colisoesDe } from '../src/scripts/automacoes/glossario-auto-diario.js';

const GLOSSARIO_DIR = join(process.cwd(), 'src', 'content', 'glossario');

/** Dono falso, alimentado por um mapa — não toca no disco. */
const donoFalso = (mapa) => (ficheiro) => (ficheiro in mapa ? mapa[ficheiro] : null);

test('O CASO REAL: "fatura do cartão" não grava por cima de "fatura do cartão mais"', () => {
  const chave = chaveDoTermo('fatura do cartão'); // glossario-fatura-do-cartao
  const pendentes = [
    { filename: 'fatura-do-cartao.md' },
    { filename: 'en-credit-card-statement.md' },
    { filename: 'es-factura-de-la-tarjeta.md' },
  ];
  // O que estava mesmo publicado em 18/08: os três do verbete "...mais".
  const dono = donoFalso({
    'en-credit-card-statement.md': 'glossario-fatura-do-cartao-mais',
    'es-factura-de-la-tarjeta.md': 'glossario-fatura-do-cartao-mais',
  });

  const colisoes = colisoesDe(pendentes, chave, dono);
  assert.equal(colisoes.length, 2, 'as duas traduções têm de ser barradas');
  assert.deepEqual(colisoes.map(c => c.nome).sort(),
    ['en-credit-card-statement.md', 'es-factura-de-la-tarjeta.md']);
});

test('caso normal: verbete inédito grava nos três idiomas', () => {
  const chave = chaveDoTermo('fluxo de caixa');
  const pendentes = [
    { filename: 'fluxo-de-caixa.md' },
    { filename: 'en-cash-flow.md' },
    { filename: 'es-flujo-de-caja.md' },
  ];
  assert.deepEqual(colisoesDe(pendentes, chave, donoFalso({})), []);
});

test('repetir o MESMO verbete é permitido (grava por cima de si próprio)', () => {
  const chave = chaveDoTermo('fluxo de caixa');
  const pendentes = [
    { filename: 'fluxo-de-caixa.md' },
    { filename: 'en-cash-flow.md' },
  ];
  const dono = donoFalso({
    'fluxo-de-caixa.md': chave,
    'en-cash-flow.md': chave,
  });
  assert.deepEqual(colisoesDe(pendentes, chave, dono), []);
});

test('ficheiro publicado SEM translationKey conta como ocupado', () => {
  const colisoes = colisoesDe(
    [{ filename: 'en-cash-flow.md' }],
    chaveDoTermo('fluxo de caixa'),
    donoFalso({ 'en-cash-flow.md': '' }),
  );
  assert.equal(colisoes.length, 1);
});

test('duas traduções do mesmo termo que colapsam no mesmo ficheiro são barradas', () => {
  // Acontece quando a IA devolve o mesmo termo para EN e ES (ex.: "marketing").
  const pendentes = [
    { filename: 'termo.md' },
    { filename: 'en-cash-flow.md' },
    { filename: 'en-cash-flow.md' },
  ];
  const colisoes = colisoesDe(pendentes, chaveDoTermo('termo'), donoFalso({}));
  assert.equal(colisoes.length, 1);
  assert.match(colisoes[0].motivo, /dois idiomas/);
});

test('a regra vale para o acervo REAL: nenhum verbete publicado colide consigo', () => {
  // Se esta trava fosse grosseira demais, ela barraria o que já está no ar.
  // Aqui usamos o disco de verdade: cada ficheiro tem de ser aceite pelo seu
  // próprio dono.
  const ficheiros = readdirSync(GLOSSARIO_DIR).filter(f => f.endsWith('.md'));
  assert.ok(ficheiros.length > 50, 'o acervo devia ter dezenas de verbetes');

  let conferidos = 0;
  for (const f of ficheiros) {
    const m = readFileSync(join(GLOSSARIO_DIR, f), 'utf-8').match(/^translationKey:[ \t]*(.*)$/m);
    if (!m) continue;
    const chave = m[1].trim().replace(/^"|"$/g, '');
    const dono = donoFalso({ [f]: chave });
    assert.deepEqual(colisoesDe([{ filename: f }], chave, dono), [],
      `${f} foi barrado pelo próprio dono`);
    conferidos++;
  }
  assert.ok(conferidos > 50, `só ${conferidos} verbetes tinham translationKey`);
});

test('slugify continua a produzir o nome que o acervo já usa', () => {
  assert.equal(slugify('Credit Card Statement'), 'credit-card-statement');
  assert.equal(slugify('factura de la tarjeta'), 'factura-de-la-tarjeta');
  assert.equal(slugify('fatura do cartão'), 'fatura-do-cartao');
});
