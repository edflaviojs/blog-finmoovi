/**
 * Teste do leitor de impressões de CAPA (rodar: npm test).
 *
 * ═══ O DEFEITO QUE ESTE TESTE IMPEDE ═══
 *
 * A primeira versão deste conserto ia pedir `impressions` à Analytics API — que é
 * impressão de **ANÚNCIO**, não de capa. Voltava um número plausível, sem erro, e
 * errado. A escolha da API está travada pela constante `TIPO_DE_RELATORIO`, e o
 * primeiro teste aqui existe para que ninguém a troque por distração.
 *
 * ═══ E O DEFEITO DA ESCALA ═══
 *
 * 🔴 A documentação diz "ctr" e **não diz** se vem `0.0086` ou `0.86`. Escolher
 * errado transforma 0,86% em 86% sem dar erro nenhum — número plausível e falso,
 * a família de defeito mais perigosa desta casa. Por isso a escala é deduzida dos
 * dados, e é isso que os testes do meio provam, **nos dois sentidos**.
 *
 * ⚠️ O ÚLTIMO TESTE É O CASO FALSO DE CONTROLO. Sem ele esta prova diria "sim" a
 * tudo e não seria informação (ver [[teste-que-diz-sim-a-tudo]]): ele dá ao leitor
 * um CSV com a média SIMPLES a divergir da ponderada e exige a ponderada — um dia
 * com 3 impressões não pode pesar o mesmo que um dia com 3.000.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TIPO_DE_RELATORIO, lerCsv, deduzirEscala,
} from '../src/scripts/apis/youtube-reporting.js';

test('o relatório pedido é o de ALCANCE, não o de anúncios', () => {
  assert.equal(
    TIPO_DE_RELATORIO, 'channel_reach_basic_a1',
    'impressão de CAPA só existe no relatório de alcance; `impressions` da Analytics API é impressão de ANÚNCIO',
  );
});

test('lê o CSV do Google e devolve os campos da capa', () => {
  const csv = [
    'date,channel_id,video_id,video_thumbnail_impressions,video_thumbnail_impressions_ctr',
    '20260930,UCxxxx,mDoIJkUKYMg,7305,0.0041',
    '20260930,UCxxxx,1UzrcHT6kQQ,3854,0.0036',
  ].join('\n');
  const linhas = lerCsv(csv);
  assert.equal(linhas.length, 2);
  assert.equal(linhas[0].video_id, 'mDoIJkUKYMg');
  assert.equal(linhas[0].video_thumbnail_impressions, '7305');
  assert.equal(linhas[1].video_thumbnail_impressions_ctr, '0.0036');
});

test('CSV vazio ou só com cabeçalho não inventa linha', () => {
  assert.deepEqual(lerCsv(''), []);
  assert.deepEqual(lerCsv('date,channel_id,video_id'), []);
});

test('escala em FRACÇÃO é reconhecida (nenhum valor passa de 1)', () => {
  const e = deduzirEscala([0.0041, 0.0036, 0.0125, 0.0061]);
  assert.equal(e.divisor, 1);
  // 0,0041 em fracção tem de continuar a ler-se como 0,41%
  assert.equal(((0.0041 / e.divisor) * 100).toFixed(2), '0.41');
});

test('escala em PERCENTAGEM é reconhecida (algum valor passa de 1)', () => {
  const e = deduzirEscala([0.41, 0.36, 12.16, 1.25]);
  assert.equal(e.divisor, 100);
  // 12,16 em percentagem tem de continuar a ler-se como 12,16%, nunca 1216%
  assert.equal(((12.16 / e.divisor) * 100).toFixed(2), '12.16');
});

test('sem nenhum valor, a escala diz que não sabe em vez de escolher', () => {
  const e = deduzirEscala([]);
  assert.equal(e.nome, 'indeterminada');
});

/**
 * ⚠️ CASO FALSO DE CONTROLO — a conta que uma média simples ERRA.
 *
 * Dois dias do mesmo vídeo: um com 3.000 impressões e 0,40%, outro com 3
 * impressões e 60% (um dia em que três pessoas apareceram e duas clicaram).
 *
 *   média SIMPLES    : (0,40 + 60) / 2        = 30,20%   ← absurdo
 *   média PONDERADA  : (0,40×3000 + 60×3)/3003 = 0,46%   ← verdade
 *
 * Se algum dia alguém trocar a ponderação por média simples, este teste grita.
 */
test('o CTR do vídeo é ponderado pelas impressões, não média simples dos dias', () => {
  const csv = [
    'date,channel_id,video_id,video_thumbnail_impressions,video_thumbnail_impressions_ctr',
    '20260929,UCxxxx,vid1,3000,0.0040',
    '20260930,UCxxxx,vid1,3,0.6000',
  ].join('\n');

  // A mesma conta que `relatorioDeCapas` faz ao somar os dias de um vídeo.
  const linhas = lerCsv(csv);
  const escala = deduzirEscala(linhas.map((l) => l.video_thumbnail_impressions_ctr));
  let imp = 0, produto = 0, somaTaxas = 0;
  for (const l of linhas) {
    const i = Number(l.video_thumbnail_impressions);
    const c = Number(l.video_thumbnail_impressions_ctr);
    imp += i; produto += c * i; somaTaxas += c;
  }
  const ponderado = (produto / imp) / escala.divisor;
  const simples = (somaTaxas / linhas.length) / escala.divisor;

  assert.equal((ponderado * 100).toFixed(2), '0.46', 'a ponderada é a verdade');
  assert.equal((simples * 100).toFixed(2), '30.20', 'a simples dá um absurdo — é por isso que não se usa');
  assert.ok(simples > ponderado * 50, 'o caso de controlo tem de SEPARAR as duas contas, senão não prova nada');
});
