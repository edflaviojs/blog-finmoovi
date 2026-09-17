/**
 * O TÍTULO TEM DE TRAZER O NÚMERO DO VÍDEO (rodar: npm test).
 *
 * ═══ O QUE ISTO GUARDA, E O QUE QUASE SE ESTRAGOU ═══
 * 🔴 **MEDIDO a 17/09/2026**, nos 73 vídeos de 16s com audiência:
 *   · título que promete um número → retenção **57%** (n=29)
 *   · título que não promete       → retenção **37%** (n=44)
 * Views praticamente iguais (14 vs 15): a diferença não está em quem CLICA, está em
 * quem FICA.
 *
 * ⚠️ **A hipótese inicial era proibir o molde repetido** — "X: 3 erros que…", 51 dos 133
 * títulos publicados, quase um por dia entre 09/08 e 16/09. **Os números disseram o
 * contrário:** esse molde tem a melhor mediana de views (14 contra 9) e a melhor
 * retenção do formato. Proibi-lo teria estragado o que funcionava.
 *
 * O defeito dele não é repetir-se: é prometer uma LISTA a um vídeo que conta UMA
 * história. Desde hoje o vídeo tem um número de verdade, e é esse que vai ao título —
 * promessa concreta e cumprida. A repetição desaparece por consequência, sem proibições.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  titularOShort, MAX_PALAVRAS_TITULO_SHORT, respostaCortada, deterministicMeta,
} from '../src/scripts/youtube/upload-short.js';
import { SITUACOES } from '../src/scripts/youtube/temas-vida.js';

test('os 40 valores cabem num título de 8 palavras com folga para a ideia', () => {
  for (const s of SITUACOES) {
    // O molde do plano B, que é o pior caso real.
    const titulo = `${s.chave}: ${s.valor} que somem`;
    const n = titulo.split(/\s+/).length;
    assert.ok(n <= MAX_PALAVRAS_TITULO_SHORT,
      `${s.id}: "${titulo}" tem ${n} palavras (teto ${MAX_PALAVRAS_TITULO_SHORT})`);
  }
});

test('CONTROLO: o teto de 8 palavras continua a valer — não o afrouxei para caber o número', () => {
  assert.equal(MAX_PALAVRAS_TITULO_SHORT, 8);
});

test('a palavra-chave continua a ir em maiúsculas (regra do dono, 06/08)', () => {
  assert.equal(titularOShort('gás: R$ 130 num domingo', 'gás', () => {}), 'GÁS: R$ 130 num domingo');
});

test('CONTROLO: título sem a palavra-chave não é adulterado', () => {
  assert.equal(titularOShort('R$ 130 que somem no domingo', 'gás', () => {}), 'R$ 130 que somem no domingo');
});

// ─── a trava em si, e o caso falso que prova que ela morde ────────────────────

/** Uma resposta da IA completa e bem formada — a base dos casos maus. */
const resposta = (title) => ({
  title,
  description: 'Já sacou dinheiro no cartão e levou um susto na fatura? Eu conto o que me aconteceu.',
  hashtagsRaw: '#saque #cartao',
  tagsRaw: 'saque, cartão de crédito, taxa de saque',
});

test('título COM o número passa', () => {
  assert.equal(respostaCortada({ ...resposta('SAQUE: R$ 60 num caixa'), valor: 'R$ 60' }), null);
});

test('"R$ 1.400" e "R$ 1400" são o mesmo número — o ponto não pode reprovar', () => {
  assert.equal(respostaCortada({ ...resposta('REFORMA: R$ 1400 parados'), valor: 'R$ 1.400' }), null);
  assert.equal(respostaCortada({ ...resposta('REFORMA: R$ 1.400 parados'), valor: 'R$ 1.400' }), null);
});

test('CONTROLO: título SEM o número reprova — senão a trava não existe', () => {
  const defeito = respostaCortada({ ...resposta('SAQUE: o erro que todo mundo comete'), valor: 'R$ 60' });
  assert.ok(defeito, 'PASSOU um título sem o número do vídeo');
  assert.match(defeito, /R\$ 60/);
});

test('CONTROLO: número ERRADO no título reprova — prometer o que o vídeo não diz', () => {
  assert.ok(respostaCortada({ ...resposta('SAQUE: R$ 90 num caixa'), valor: 'R$ 60' }),
    'PASSOU um título que promete um número diferente do que se ouve no vídeo');
});

test('CONTROLO: sem `valor`, nada muda — é o caso do formato de 50s', () => {
  assert.equal(respostaCortada(resposta('Juros compostos explicados em 1 minuto')), null);
  assert.equal(respostaCortada({ ...resposta('Juros compostos explicados em 1 minuto'), valor: '' }), null);
});

test('CONTROLO: as travas antigas continuam vivas (teto de palavras e resposta cortada)', () => {
  assert.match(
    respostaCortada({ ...resposta('SAQUE: R$ 60 num caixa eletrônico tarde da noite hoje'), valor: 'R$ 60' }),
    /palavras/,
  );
  assert.match(respostaCortada({ ...resposta('SAQUE: R$ 60'), valor: 'R$ 60', hashtagsRaw: '' }), /hashtags/);
});

// ─── o plano B, que é quem corre nos dias maus ────────────────────────────────

test('o plano B monta um título com o número, e dentro do teto', () => {
  for (const s of SITUACOES) {
    const meta = deterministicMeta({ keyword: s.chave, term: s.titulo, category: 'vida', valor: s.valor });
    assert.equal(respostaCortada({ ...resposta(meta.title), valor: s.valor }), null,
      `${s.id}: o plano B produziu um título que a própria trava recusa — "${meta.title}"`);
  }
});

test('CONTROLO: sem `valor`, o plano B continua a ser o de sempre', () => {
  const meta = deterministicMeta({ keyword: 'Juros', term: 'Juros compostos', category: 'basico' });
  assert.match(meta.title, /1 minuto/);
});
