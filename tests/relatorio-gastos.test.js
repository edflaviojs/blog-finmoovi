/**
 * Teste do contador de consumo (rodar: npm test).
 *
 * O que se está a proteger: este relatório é o que vai dizer ao dono, todas as
 * manhãs, quanto os robôs consumiram. Se ele somar mal, ou inventar um preço,
 * ou disparar alarme à toa, deixa de ser lido — e um relatório que ninguém lê
 * é pior do que nenhum, porque dá a sensação de estar coberto.
 *
 * Os três casos que importam:
 *   1. somar certo, separando recusas de chamadas boas;
 *   2. NUNCA inventar dinheiro quando o preço não está preenchido;
 *   3. só gritar quando há base para comparar.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { somar, dinheiro, salto, FATOR_DE_ALARME } from '../src/scripts/automacoes/relatorio-gastos.js';
import { medir, MARCA, fichasDaResposta } from '../src/scripts/lib/medidor.js';

test('soma por fornecedor e tipo, e separa recusas', () => {
  const t = somar([
    { f: 'cerebras', t: 'texto', ent: 100, sai: 50, un: 1 },
    { f: 'cerebras', t: 'texto', ent: 200, sai: 30, un: 1 },
    { f: 'cerebras', t: 'texto', x: 1 },
    { f: 'together', t: 'imagem', un: 1 },
  ]);
  const cere = t.find((x) => x.fornecedor === 'cerebras');
  assert.equal(cere.chamadas, 2, 'a recusa NÃO conta como chamada boa');
  assert.equal(cere.recusas, 1);
  assert.equal(cere.entrada, 300);
  assert.equal(cere.saida, 80);
  assert.equal(t.find((x) => x.fornecedor === 'together').unidades, 1);
});

test('linha sem fornecedor é ignorada em vez de rebentar', () => {
  assert.deepEqual(somar([null, {}, { t: 'texto' }]), []);
});

test('🔴 sem preço configurado devolve null — nunca zero', () => {
  const linha = { fornecedor: 'cerebras', tipo: 'texto', entrada: 1000, saida: 1000, unidades: 2 };
  assert.equal(dinheiro(linha, {}), null, 'sem tabela');
  assert.equal(dinheiro(linha, { cerebras: { porMilFichas: null } }), null, 'preço por preencher');
  // Zero seria lido como "não custou nada", que é uma mentira tranquilizadora.
  assert.notEqual(dinheiro(linha, {}), 0);
});

test('com preço preenchido, a conta bate', () => {
  const linha = { fornecedor: 'cerebras', tipo: 'texto', entrada: 1000, saida: 1000, unidades: 2 };
  assert.equal(dinheiro(linha, { cerebras: { porMilFichas: 0.1 } }), 0.2);
  assert.equal(dinheiro({ ...linha, fornecedor: 'manus' }, { manus: { porUnidade: 0.5 } }), 1);
});

test('🔴 alarme só com base suficiente — 2 dias não fazem média', () => {
  assert.equal(salto(100, []), null);
  assert.equal(salto(100, [10, 10]), null, 'dois dias ainda não dão para comparar');
  assert.equal(salto(100, [10, 10, 10]), 10, 'três dias já dão');
});

test('média zero não vira divisão por zero', () => {
  assert.equal(salto(50, [0, 0, 0]), null);
});

test('consumo normal NÃO dispara alarme', () => {
  const s = salto(11, [10, 10, 12, 9]);
  assert.ok(s < FATOR_DE_ALARME, `${s} devia estar abaixo do gatilho`);
});

test('consumo disparado DISPARA alarme', () => {
  const s = salto(100, [10, 10, 12, 9]);
  assert.ok(s >= FATOR_DE_ALARME, `${s} devia disparar`);
});

test('o medidor escreve uma linha só, e legível pelo leitor', () => {
  const escrito = [];
  const original = console.log;
  console.log = (m) => escrito.push(m);
  try {
    medir({ fornecedor: 'cerebras', tipo: 'texto', modelo: 'gpt-oss-120b', entrada: 10, saida: 5 });
  } finally {
    console.log = original;
  }
  assert.equal(escrito.length, 1);
  assert.ok(escrito[0].startsWith(MARCA));
  const lido = JSON.parse(escrito[0].slice(MARCA.length));
  assert.deepEqual(somar([lido])[0].entrada, 10);
});

test('🔴 medir NUNCA lança, aconteça o que acontecer', () => {
  // Se medir rebentasse, derrubava o robô que estava a publicar — e medir é
  // acessório: publicar é que é o trabalho.
  assert.doesNotThrow(() => medir(null));
  assert.doesNotThrow(() => medir({}));
  assert.doesNotThrow(() => medir({ fornecedor: 'x', unidades: NaN }));
});

test('fichas reais são lidas nos dois formatos, e ausência devolve null', () => {
  assert.deepEqual(fichasDaResposta({ usage: { prompt_tokens: 7, completion_tokens: 3 } }), { entrada: 7, saida: 3 });
  assert.deepEqual(fichasDaResposta({ usage: { input_tokens: 4, output_tokens: 2 } }), { entrada: 4, saida: 2 });
  assert.equal(fichasDaResposta({}), null);
  assert.equal(fichasDaResposta(null), null);
});
