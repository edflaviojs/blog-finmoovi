/**
 * Teste da fila de re-adaptação i18n (rodar: npm test).
 *
 * O caso que importa é o primeiro: em 06/08/2026 mediu-se que 110 ficheiros
 * estavam marcados como processados e continuavam com defeito na auditoria — e
 * o filtro antigo (`severity > 0 && !progressSet.has(file)`) excluía-os PARA
 * SEMPRE. Se esse primeiro teste passar a falhar, a fila voltou a acreditar na
 * marca em vez de medir o resultado, e o robô volta a perder ficheiros em
 * silêncio.
 *
 * O segundo caso que importa é o do tecto: sem ele, um ficheiro que a IA nunca
 * consegue arrumar queima um lugar do lote todos os dias, para sempre.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  montarFila,
  lerProgresso,
  serializarProgresso,
  registarTentativa,
} from '../src/scripts/lib/i18n-queue.js';

const auditoria = [
  { file: 'en-hedge.md', dir: 'glossario', severity: 3 },
  { file: 'en-etf.md', dir: 'glossario', severity: 2 },
  { file: 'en-limpo.md', dir: 'glossario', severity: 0 },
];

test('caso real 06/08: já processado mas ainda com defeito VOLTA à fila', () => {
  // Era exactamente isto que o filtro antigo impedia.
  const progresso = lerProgresso(['en-hedge.md']);
  const { fila } = montarFila({ auditoria, progresso, maxTentativas: 3 });

  assert.ok(
    fila.some((f) => f.file === 'en-hedge.md'),
    'en-hedge.md tem severidade 3 e só uma tentativa gasta — tem de voltar à fila'
  );
});

test('tecto de tentativas: esgotado, sai da fila e aparece como "precisa de humano"', () => {
  const progresso = lerProgresso({
    'en-hedge.md': { tentativas: 3, ultimaSeveridade: 3 },
  });
  const { fila, desistidos } = montarFila({ auditoria, progresso, maxTentativas: 3 });

  assert.equal(fila.some((f) => f.file === 'en-hedge.md'), false);
  assert.equal(desistidos.length, 1);
  assert.equal(desistidos[0].file, 'en-hedge.md');
  assert.equal(desistidos[0].tentativas, 3);
});

test('desistido NUNCA desaparece: continua a ser reportado em todas as corridas', () => {
  const progresso = lerProgresso({ 'en-hedge.md': { tentativas: 9, ultimaSeveridade: 3 } });
  for (let corrida = 0; corrida < 3; corrida++) {
    const { desistidos } = montarFila({ auditoria, progresso, maxTentativas: 3 });
    assert.equal(desistidos.length, 1, `corrida ${corrida}: devia continuar a reportar`);
  }
});

test('severidade 0 não entra na fila, mesmo sem nenhuma tentativa gasta', () => {
  const { fila } = montarFila({ auditoria, progresso: new Map(), maxTentativas: 3 });
  assert.equal(fila.some((f) => f.file === 'en-limpo.md'), false);
});

test('entrada morta sai da fila sem gastar lugar do lote', () => {
  const { fila, mortos } = montarFila({
    auditoria,
    progresso: new Map(),
    maxTentativas: 3,
    existe: (e) => e.file !== 'en-hedge.md',
  });

  assert.equal(fila.some((f) => f.file === 'en-hedge.md'), false);
  assert.deepEqual(mortos.map((m) => m.file), ['en-hedge.md']);
});

test('ordem: menos tentativas primeiro, só depois severidade', () => {
  // en-hedge tem severidade MAIOR mas já falhou 2 vezes; en-etf nunca foi
  // tentado. O lugar do lote vale mais em quem ainda não foi tentado.
  const progresso = lerProgresso({ 'en-hedge.md': { tentativas: 2, ultimaSeveridade: 3 } });
  const { fila } = montarFila({ auditoria, progresso, maxTentativas: 3 });

  assert.deepEqual(fila.map((f) => f.file), ['en-etf.md', 'en-hedge.md']);
});

test('formato ANTIGO (lista de nomes) vale 1 tentativa, não 0 nem 3', () => {
  // 0 reabria a fila com os 149 ficheiros de uma vez; 3 mandava-os todos
  // directos para "precisa de humano" sem nunca terem sido re-tentados.
  const progresso = lerProgresso(['a.md', 'b.md']);
  assert.equal(progresso.get('a.md').tentativas, 1);
  assert.equal(progresso.get('a.md').ultimaSeveridade, null);
  assert.equal(progresso.size, 2);
});

test('formato NOVO é lido tal e qual, e o lixo cai para 1 tentativa', () => {
  const progresso = lerProgresso({
    'a.md': { tentativas: 2, ultimaSeveridade: 1 },
    'b.md': { tentativas: 'muitas', ultimaSeveridade: 'alta' },
  });
  assert.deepEqual(progresso.get('a.md'), { tentativas: 2, ultimaSeveridade: 1 });
  assert.deepEqual(progresso.get('b.md'), { tentativas: 1, ultimaSeveridade: null });
});

test('registarTentativa conta a passagem e guarda a severidade medida DEPOIS', () => {
  const progresso = lerProgresso(['a.md']);
  const r1 = registarTentativa(progresso, 'a.md', 1);
  assert.deepEqual(r1, { tentativas: 2, ultimaSeveridade: 1 });

  const r2 = registarTentativa(progresso, 'novo.md', 0);
  assert.deepEqual(r2, { tentativas: 1, ultimaSeveridade: 0 });
});

test('serializarProgresso devolve objeto ordenado (diff do commit diário legível)', () => {
  const progresso = lerProgresso(['z.md', 'a.md']);
  assert.deepEqual(Object.keys(serializarProgresso(progresso)), ['a.md', 'z.md']);
});

test('a ida e volta ao JSON não perde a contagem', () => {
  const progresso = lerProgresso(['a.md']);
  registarTentativa(progresso, 'a.md', 2);
  const relido = lerProgresso(JSON.parse(JSON.stringify(serializarProgresso(progresso))));
  assert.deepEqual(relido.get('a.md'), { tentativas: 2, ultimaSeveridade: 2 });
});

test('entrada inválida nunca lança e nunca entra na fila', () => {
  const { fila } = montarFila({
    auditoria: [null, {}, { file: '' }, { file: 'ok.md', severity: 1, dir: 'posts' }],
    progresso: lerProgresso(null),
    maxTentativas: 3,
  });
  assert.deepEqual(fila.map((f) => f.file), ['ok.md']);
  assert.equal(lerProgresso(undefined).size, 0);
  assert.equal(lerProgresso('lixo').size, 0);
});
