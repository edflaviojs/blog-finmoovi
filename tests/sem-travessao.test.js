/**
 * Sem travessão (regra do Ed, 23/10/2026: «eu nao gosto desse traço... use o normal»).
 * Vale para os ficheiros já limpos. Ao limpar outro, acrescentá-lo aqui.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const TRAVESSAO = /[–—]/;

test('controlo: a régua apanha um travessão de verdade', () => {
  assert.ok(TRAVESSAO.test('a — b'));
  assert.ok(TRAVESSAO.test('2–3'));
  assert.ok(!TRAVESSAO.test('Dó-Mi-Sol, 10-14 anos'));
});

test('o robô de entrega às redes não tem travessão (06/11/2026)', () => {
  const linhas = readFileSync('src/scripts/multipost/entregar.js', 'utf-8').split('\n');
  const achados = linhas.map((l, i) => (TRAVESSAO.test(l) ? i + 1 : 0)).filter(Boolean);
  assert.deepEqual(achados, [], `entregar.js tem travessão nas linhas ${achados.join(', ')}`);
});

// ⏳ Em espera até o lote 3b (8 robôs que publicam), marcado para 07/11/2026: docs/DIVIDA.md, B5.
// No lote 3b, tirar o `skip` desta prova.
test('nenhum robô tem travessão no nome (é o nome que aparece no e-mail das 7h)', { skip: 'lote 3b marcado para 07/11 (DIVIDA B5)' }, () => {
  const pasta = '.github/workflows';
  const errados = readdirSync(pasta).filter((f) => /\.ya?ml$/.test(f)).filter((f) => {
    const nome = readFileSync(`${pasta}/${f}`, 'utf-8').split('\n').find((l) => /^name:/.test(l)) || '';
    return TRAVESSAO.test(nome);
  });
  assert.deepEqual(errados, [], `robôs com travessão no nome: ${errados.join(', ')}`);
});
