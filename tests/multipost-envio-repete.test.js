/**
 * O envio do ficheiro ao Multipost tenta três vezes (06/11/2026). Em 04/11 dois Shorts
 * atrasaram porque um 504 passageiro fazia o robô desistir na hora. Sem internet: um
 * servidor de mentira responde no lugar do verdadeiro.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { enviarFicheiro } from '../src/scripts/multipost/entregar.js';

const pasta = mkdtempSync(join(tmpdir(), 'envio-'));
const video = join(pasta, 'v.mp4');
writeFileSync(video, 'x');

function servidor(estados) {
  let n = 0;
  const fetchFn = async () => {
    const s = estados[Math.min(n++, estados.length - 1)];
    if (s === 'rede') throw new Error('socket hang up');
    const corpo = s === 200 ? JSON.stringify({ id: 'm1', path: 'https://media/x.mp4' }) : 'Gateway Timeout';
    return { ok: s >= 200 && s < 300, status: s, text: async () => corpo };
  };
  return { fetchFn, vezes: () => n };
}
const rapido = { esperas: [0, 0] };

test('504 e depois 200: sobe à 2a tentativa (o caso de 04/11)', async () => {
  const s = servidor([504, 200]);
  const m = await enviarFicheiro('k', video, 'v.mp4', 'video/mp4', { ...rapido, fetchFn: s.fetchFn });
  assert.equal(m.id, 'm1');
  assert.equal(s.vezes(), 2);
});

test('rede caída duas vezes e depois 200: sobe à 3a', async () => {
  const s = servidor(['rede', 502, 200]);
  await enviarFicheiro('k', video, 'v.mp4', 'video/mp4', { ...rapido, fetchFn: s.fetchFn });
  assert.equal(s.vezes(), 3);
});

test('controlo: 504 três vezes desiste, com a mensagem de sempre', async () => {
  const s = servidor([504]);
  await assert.rejects(enviarFicheiro('k', video, 'v.mp4', 'video/mp4', { ...rapido, fetchFn: s.fetchFn }), /O envio do vídeo falhou \(504\) \(3 tentativas\)/);
  assert.equal(s.vezes(), 3);
});

test('controlo: 401 (chave errada) desiste logo, sem repetir', async () => {
  const s = servidor([401, 200]);
  await assert.rejects(enviarFicheiro('k', video, 'v.mp4', 'video/mp4', { ...rapido, fetchFn: s.fetchFn }), /falhou \(401\)/);
  assert.equal(s.vezes(), 1);
});

test('200 de primeira: uma chamada só', async () => {
  const s = servidor([200]);
  await enviarFicheiro('k', video, 'v.mp4', 'video/mp4', { ...rapido, fetchFn: s.fetchFn });
  assert.equal(s.vezes(), 1);
});
