/**
 * A REDE DO NÚMERO DO SHORT DE 16s (rodar: npm test).
 *
 * ═══ O QUE ESTE TESTE GUARDA ═══
 * 🔴 **MEDIDO a 17/09/2026, nos 124 vídeos do canal:** metade da audiência sai ao
 * **segundo 6**. Aos 3s ainda lá estão todos (92%–143%) — o gancho funciona. O segundo 6
 * é a FALA 2, e varridos os 80 roteiros deste formato, **80 em 80 não tinham um único
 * número, valor ou dado**. Não era acaso: `roteiro-loop.js` reprovava qualquer número.
 *
 * A proibição nasceu certa a 07/08 (o canal ficou sem vídeo nesse dia) e matou duas
 * coisas ao mesmo tempo: o número inventado E o conteúdo. Agora o número vem ESCOLHIDO
 * de `temas-vida.js`, e estes casos fixam as duas metades do negócio:
 *   · o número do dia TEM de estar na 2ª fala e na 2ª tela;
 *   · QUALQUER outro número continua a reprovar — a protecção antiga fica de pé.
 *
 * ⚠️ **METADE DESTES CASOS SÃO DE CONTROLO NEGATIVO**, e é para isso que servem: uma
 * trava que aprova tudo não é trava nenhuma. Se um dia a validação passar a devolver
 * `ok` para os roteiros da secção "o que TEM de reprovar", ela morreu em silêncio —
 * que é exactamente como as travas desta casa costumam morrer.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { validarLoop, regexDoValor, numeroNaoAutorizado } from '../src/scripts/youtube/roteiro-loop.js';
import { SITUACOES, GANCHOS } from '../src/scripts/youtube/temas-vida.js';

const situacao = SITUACOES.find((s) => s.id === 'gas-acabou');       // valor: R$ 130
const gancho = GANCHOS.find((g) => g.id === 'nunca-faca');           // assinatura: /nunca fa[çc]a/i

/**
 * Um roteiro que passa em tudo — a base de que os casos maus são variações.
 *
 * ⚠️ São 42 palavras FALADAS e o tecto são 46. O aperto não é acidente: é o orçamento
 * real de 16 segundos, e o número come ~4 palavras dele. A primeira versão deste teste
 * levava 52 e foi reprovada pela própria trava do tamanho — o que é a prova de que ela
 * está viva.
 */
const bom = () => ({
  falas: [
    'Nunca faça isso num domingo. Meu gás acabou no meio do almoço.',
    'Quando vi, R$ 130 num botijão às pressas.',
    'Agora eu confiro o gás antes de acender o fogão.',
    'Nunca faça almoço de domingo sem olhar o gás.',
  ],
  telas: ['domingo, gás no fim', 'R$ 130 de pressa', 'confiro antes', 'olhe o gás'],
});

const comFalas = (troca) => ({ ...bom(), ...troca });

// ─── o que TEM de passar ──────────────────────────────────────────────────────

test('o roteiro completo, com o número do dia na 2ª fala e na 2ª tela, passa', () => {
  const v = validarLoop(bom(), situacao, gancho);
  assert.equal(v.ok, true, `reprovou sem motivo: ${v.erros.join(' | ')}`);
});

test('"130 reais" vale tanto como "R$ 130" — a voz diz a mesma coisa', () => {
  const n = comFalas({
    falas: [...bom().falas].map((f, i) => (i === 1 ? 'Quando vi, 130 reais num botijão às pressas.' : f)),
  });
  const v = validarLoop(n, situacao, gancho);
  assert.equal(v.ok, true, `reprovou sem motivo: ${v.erros.join(' | ')}`);
});

test('o "13º" do título da situação não é número intruso', () => {
  const decimo = SITUACOES.find((s) => s.id === 'decimo-terceiro'); // titulo tem "13º"
  assert.equal(numeroNaoAutorizado('o 13º caiu e sumiu', decimo), null);
});

test('as 40 situações têm valor, e o valor tem sempre a forma "R$ n"', () => {
  assert.equal(SITUACOES.length, 40);
  for (const s of SITUACOES) {
    assert.ok(s.valor, `${s.id} não tem valor`);
    assert.ok(s.valorDoQue, `${s.id} não diz do que é o valor`);
    assert.match(s.valor, /^R\$ \d[\d.]*$/, `${s.id}: valor mal escrito — "${s.valor}"`);
    assert.ok(regexDoValor(s.valor), `${s.id}: o valor não vira regex`);
  }
});

// ─── o que TEM de reprovar (o controlo negativo) ──────────────────────────────

test('CONTROLO: sem o número na 2ª fala, reprova — era isto o vídeo vazio', () => {
  const n = comFalas({
    falas: [...bom().falas].map((f, i) => (i === 1 ? 'Quando vi, já tinha gastado o que não tinha.' : f)),
  });
  const v = validarLoop(n, situacao, gancho);
  assert.equal(v.ok, false, 'PASSOU um roteiro sem número — a trava morreu');
  assert.ok(v.erros.some((e) => e.includes('R$ 130')), `erro errado: ${v.erros.join(' | ')}`);
});

test('CONTROLO: número INVENTADO a mais reprova — a protecção de 07/08 fica de pé', () => {
  const n = comFalas({
    falas: [...bom().falas].map((f, i) => (i === 2 ? 'Agora eu confiro o gás e poupo R$ 40.' : f)),
  });
  const v = validarLoop(n, situacao, gancho);
  assert.equal(v.ok, false, 'PASSOU um número inventado — voltámos ao defeito de 07/08');
  assert.ok(v.erros.some((e) => e.includes('não invente')), `erro errado: ${v.erros.join(' | ')}`);
});

test('CONTROLO: percentagem inventada reprova', () => {
  const n = comFalas({
    falas: [...bom().falas].map((f, i) => (i === 2 ? 'Agora eu gasto 30% menos com gás.' : f)),
  });
  assert.equal(validarLoop(n, situacao, gancho).ok, false, 'PASSOU uma percentagem inventada');
});

test('CONTROLO: a 2ª tela sem número reprova — quem vê sem som não recebe nada', () => {
  const n = comFalas({ telas: ['domingo, gás no fim', 'que pressa foi essa', 'confiro antes', 'olhe o gás'] });
  const v = validarLoop(n, situacao, gancho);
  assert.equal(v.ok, false, 'PASSOU a tela do número sem número');
  assert.ok(v.erros.some((e) => e.startsWith('tela 2')), `erro errado: ${v.erros.join(' | ')}`);
});

test('CONTROLO: número numa tela que não é a 2ª reprova', () => {
  const n = comFalas({ telas: ['domingo, gás no fim', 'R$ 130 de pressa', 'poupo R$ 40', 'olhe o gás'] });
  assert.equal(validarLoop(n, situacao, gancho).ok, false, 'PASSOU número fora da 2ª tela');
});

test('CONTROLO: as travas que já existiam continuam vivas (gancho e círculo)', () => {
  const semGancho = comFalas({
    falas: ['Olha o que houve num domingo. Meu gás acabou no almoço.', ...bom().falas.slice(1)],
  });
  assert.equal(validarLoop(semGancho, situacao, gancho).ok, false, 'PASSOU sem o gancho na 1ª fala');

  const semCirculo = comFalas({
    falas: [...bom().falas.slice(0, 3), 'Nunca faça uma compra por impulso na padaria.'],
  });
  assert.equal(validarLoop(semCirculo, situacao, gancho).ok, false, 'PASSOU sem o círculo fechar');
});

// ─── a contagem de palavras, que mede a VOZ e não o papel ─────────────────────

test('o número conta as palavras que a voz diz, não as que estão escritas', () => {
  // "R$ 3.200" são 2 palavras no papel e CINCO na boca: "três mil e duzentos reais".
  const casal = SITUACOES.find((s) => s.id === 'dividir-sem-brigar'); // valor: R$ 3.200
  const n = {
    falas: [
      'Nunca faça a conta de cabeça. Domingo virou briga lá em casa.',
      'Eu somei tudo: R$ 3.200 de contas nossas naquele mês.',
      'Agora a gente divide na hora, sem discutir quem pagou.',
      'Nunca faça a conta de cabeça num domingo.',
    ],
    telas: ['domingo de briga', 'R$ 3.200 juntos', 'dividido na hora', 'sem briga'],
  };
  const v = validarLoop(n, casal, gancho);
  assert.equal(v.ok, true, `reprovou sem motivo: ${v.erros.join(' | ')}`);

  const noPapel = n.falas.join(' ').trim().split(/\s+/).length;
  assert.ok(v.palavras > noPapel,
    `a contagem (${v.palavras}) devia ser MAIOR que a do papel (${noPapel}) — senão o vídeo sai mais longo do que os 16s`);
});
