/**
 * Teste do termo-guard (rodar: npm test).
 *
 * O caso que importa: em 06/08/2026 a rotação A-Z do glossário não tinha filtro
 * nenhum e a fila tinha, e as duas contradiziam-se. Estes casos fixam as duas
 * regras novas ("ação, não conceito") e — o mais importante — provam que elas
 * NÃO recusam nenhum dos verbetes REAIS já publicados. Falso positivo aqui não
 * dá erro: só faz o robô saltar a letra e o glossário parar de crescer em
 * silêncio.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { glossaryTermFromKeyword, keywordLooksLikeConcept } from '../src/scripts/lib/termo-guard.js';

test('caso real: "meios de economizar energia" é tema de artigo, não verbete', () => {
  assert.equal(keywordLooksLikeConcept('meios de economizar energia'), false);
  assert.equal(keywordLooksLikeConcept('formas de economizar dinheiro'), false);
  assert.equal(keywordLooksLikeConcept('maneiras de investir'), false);
});

test('frase que começa por verbo é ação, não conceito', () => {
  for (const t of ['guardar dinheiro', 'gastar menos', 'juntar dinheiro em um ano',
                   'organizar as contas', 'sair das dívidas', 'poupar']) {
    assert.equal(keywordLooksLikeConcept(t), false, `devia recusar: ${t}`);
  }
});

test('as três regras antigas continuam a valer', () => {
  assert.equal(keywordLooksLikeConcept('como poupar dinheiro'), false);      // pergunta
  assert.equal(keywordLooksLikeConcept('melhores investimentos'), false);    // listicle
  assert.equal(keywordLooksLikeConcept('poupar dinheiro dicas'), false);     // listicle
  assert.equal(keywordLooksLikeConcept('um termo muito longo com seis palavras'), false);
});

test('substantivo que uma regra por terminação (-ar/-er/-ir) mataria passa', () => {
  // O motivo de a lista de verbos ser curada e não uma regex de terminação.
  for (const t of ['dólar', 'lastro', 'poder de compra', 'juros a pagar', 'liquidez']) {
    assert.equal(keywordLooksLikeConcept(t), true, `devia aceitar: ${t}`);
  }
});

test('limpeza de pergunta preserva o conceito', () => {
  assert.equal(glossaryTermFromKeyword('o que é liquidez'), 'liquidez');
  assert.equal(glossaryTermFromKeyword('significado de spread'), 'spread');
  assert.equal(glossaryTermFromKeyword('juros compostos'), 'juros compostos');
  assert.equal(glossaryTermFromKeyword('  '), '');
});

test('entrada vazia/inválida nunca lança e nunca é conceito', () => {
  assert.equal(keywordLooksLikeConcept(''), false);
  assert.equal(keywordLooksLikeConcept(null), false);
  assert.equal(keywordLooksLikeConcept(undefined), false);
  assert.equal(glossaryTermFromKeyword(null), '');
});

test('CORPUS: nenhum verbete PT já publicado é recusado pelo filtro', () => {
  const dir = join(process.cwd(), 'src', 'content', 'glossario');
  const ficheiros = readdirSync(dir)
    .filter(f => f.endsWith('.md') && !f.startsWith('en-') && !f.startsWith('es-'));
  assert.ok(ficheiros.length > 50, `esperava >50 verbetes PT, achei ${ficheiros.length}`);

  const recusados = [];
  for (const f of ficheiros) {
    const raw = readFileSync(join(dir, f), 'utf-8');
    const m = raw.match(/^term:\s*"?(.+?)"?\s*$/m);
    const termo = m ? m[1] : f.replace(/\.md$/, '').replace(/-/g, ' ');
    if (!keywordLooksLikeConcept(termo)) recusados.push(`${f} → "${termo}"`);
  }
  assert.deepEqual(recusados, [], 'estes verbetes REAIS seriam recusados pelo filtro');
});
