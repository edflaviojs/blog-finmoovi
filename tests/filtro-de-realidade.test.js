/**
 * Teste do FILTRO DE REALIDADE do motor GSC (rodar: npm test).
 *
 * ═══ O CASO QUE ESTE FILTRO EXISTE PARA APANHAR ═══
 *
 * Medido a 02/10/2026 na página *«como organizar suas despesas mensais»*:
 * 1.164 aparições, posição média 8, zero cliques. Parecia a maior oportunidade do
 * blog. Era um pico de robôs — 1.161 aparições em 7 dias, 1.163 em computador
 * contra 1 em telemóvel, de França/Alemanha/Marrocos/Argélia, num artigo em
 * português. No Brasil a página estava na **posição 84**.
 *
 * ⚠️ **ESTE FICHEIRO NÃO TOCA NA REDE.** Mede só as contas puras do filtro, com os
 * números reais do caso. O que a rede devolve é problema da API; o que se prova
 * aqui é que, recebendo aqueles números, a decisão é a certa.
 *
 * ⚠️ **E TEM DOIS CASOS DE CONTROLO QUE TÊM DE PASSAR**, senão este teste diria
 * "não" a tudo e seria tão inútil como um que diz "sim" a tudo
 * (ver [[teste-que-diz-sim-a-tudo]]):
 *   1. uma página brasileira legítima em boa posição — tem de PASSAR;
 *   2. uma página nova, com tráfego concentrado mas AINDA A ACONTECER — tem de
 *      PASSAR (castigar conteúdo novo seria inventar defeito).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MERCADOS, REGUAS_REALIDADE, somarComPosicao,
} from '../src/scripts/lib/gsc-posts.js';

/** Linha do GSC, no formato que a API devolve para dimensions:['country','device']. */
const linha = (pais, aparelho, impressions, position, clicks = 0) => ({
  keys: [pais, aparelho], impressions, position, clicks,
});

// ── Os países do fantasma NÃO estão na lista de mercados ─────────────────────

test('França, Alemanha, Marrocos e Argélia não são mercado de nenhum idioma nosso', () => {
  const todos = [...MERCADOS.pt, ...MERCADOS.en, ...MERCADOS.es];
  for (const pais of ['fra', 'deu', 'mar', 'dza', 'aut', 'bel']) {
    assert.ok(!todos.includes(pais), `${pais} não devia contar como nosso mercado`);
  }
});

test('Brasil e Portugal são mercado do português; Espanha e México do espanhol', () => {
  assert.ok(MERCADOS.pt.includes('bra'));
  assert.ok(MERCADOS.pt.includes('prt'));
  assert.ok(MERCADOS.es.includes('esp'));
  assert.ok(MERCADOS.es.includes('mex'));
});

// ── A posição ponderada ──────────────────────────────────────────────────────

test('a posição é ponderada pelas aparições, não média simples dos países', () => {
  // Um país com 3 aparições na posição 2 não pode pesar como 3.000 na posição 80.
  const linhas = [linha('bra', 'MOBILE', 3000, 80), linha('prt', 'MOBILE', 3, 2)];
  const s = somarComPosicao(linhas);
  assert.equal(s.impressoes, 3003);
  assert.ok(s.posicao > 79, `ponderada devia ficar perto de 80, deu ${s.posicao}`);
  // A média simples daria 41 — e faria a página parecer uma oportunidade.
  assert.equal((80 + 2) / 2, 41);
});

test('sem aparições, a posição é null em vez de zero', () => {
  const s = somarComPosicao([]);
  assert.equal(s.impressoes, 0);
  assert.equal(s.posicao, null);
});

// ── O CASO REAL: o fantasma de setembro ──────────────────────────────────────

test('🔴 o caso real reprova nos TRÊS cortes de uma vez', () => {
  // Os números medidos: 1.164 aparições, quase todas de fora e em computador.
  const linhas = [
    linha('fra', 'DESKTOP', 421, 55),
    linha('deu', 'DESKTOP', 280, 58),
    linha('mar', 'DESKTOP', 122, 60),
    linha('dza', 'DESKTOP', 103, 61),
    linha('aut', 'DESKTOP', 94, 57),
    linha('bel', 'DESKTOP', 93, 59),
    linha('bra', 'DESKTOP', 50, 84),   // o Brasil real: posição 84
    linha('bra', 'MOBILE', 1, 84),
  ];
  const R = REGUAS_REALIDADE;
  const tudo = somarComPosicao(linhas);
  const doMercado = linhas.filter((r) => MERCADOS.pt.includes(r.keys[0]));
  const mercado = somarComPosicao(doMercado);
  const movel = somarComPosicao(doMercado.filter((r) => r.keys[1] !== 'DESKTOP'));

  const fracaoMercado = mercado.impressoes / tudo.impressoes;
  const fracaoMovel = movel.impressoes / mercado.impressoes;

  // Corte do país: só 4% das aparições vinham do mercado em português.
  assert.ok(fracaoMercado < R.fracaoMinimaDoMercado,
    `só ${(fracaoMercado * 100).toFixed(0)}% do mercado — tinha de reprovar`);
  // Corte da posição: 84 no Brasil contra 57 na média global.
  assert.ok(mercado.posicao > R.posicaoMaximaNoMercado,
    `posição ${mercado.posicao.toFixed(0)} no mercado — tinha de reprovar`);
  // Corte do aparelho: 2% em telemóvel.
  assert.ok(fracaoMovel < R.fracaoMinimaTelemovel,
    `só ${(fracaoMovel * 100).toFixed(0)}% em telemóvel — assinatura de robô`);

  // E a diferença entre os dois números é o tamanho do engano.
  assert.ok(mercado.posicao - tudo.posicao > 20,
    'a posição global escondia 20+ posições de diferença');
});

test('🔴 o pico PASSADO é reconhecido pela forma no tempo', () => {
  const R = REGUAS_REALIDADE;
  // 1.161 aparições em 7 dias (04→10/09) e 3 no resto dos 90 dias.
  const dias = [
    { dia: '20260904', imp: 218 }, { dia: '20260905', imp: 315 },
    { dia: '20260906', imp: 57 }, { dia: '20260907', imp: 76 },
    { dia: '20260908', imp: 300 }, { dia: '20260909', imp: 146 },
    { dia: '20260910', imp: 49 },
    { dia: '20260923', imp: 1 }, { dia: '20260926', imp: 1 }, { dia: '20260928', imp: 1 },
  ];
  const total = dias.reduce((a, d) => a + d.imp, 0);
  const topo = [...dias].sort((a, b) => b.imp - a.imp).slice(0, 10).reduce((a, d) => a + d.imp, 0);
  const fracaoNoTopo = topo / total;
  // As duas semanas antes de 02/10 (a medição real): quase nada.
  const recentes = dias.filter((d) => d.dia >= '20260918').reduce((a, d) => a + d.imp, 0);
  const fracaoRecente = recentes / total;

  assert.equal(total, 1164, 'é o número real medido');
  assert.ok(total >= R.impressoesParaJulgarPico);
  assert.ok(fracaoNoTopo > R.fracaoMaximaNoTopo, 'concentrado');
  assert.ok(fracaoRecente < R.fracaoMinimaRecente, 'e já morto — as duas condições juntas');
});

// ── CONTROLO 1: a página legítima TEM de passar ──────────────────────────────

test('✅ CONTROLO — página brasileira legítima em boa posição passa', () => {
  const R = REGUAS_REALIDADE;
  const linhas = [
    linha('bra', 'MOBILE', 320, 7, 12),
    linha('bra', 'DESKTOP', 90, 9, 3),
    linha('prt', 'MOBILE', 40, 8, 2),
    linha('usa', 'DESKTOP', 15, 40),   // um resto de fora, como é normal
  ];
  const tudo = somarComPosicao(linhas);
  const doMercado = linhas.filter((r) => MERCADOS.pt.includes(r.keys[0]));
  const mercado = somarComPosicao(doMercado);
  const movel = somarComPosicao(doMercado.filter((r) => r.keys[1] !== 'DESKTOP'));

  assert.ok(mercado.impressoes >= R.impressoesMinimasNoMercado);
  assert.ok(mercado.impressoes / tudo.impressoes >= R.fracaoMinimaDoMercado);
  assert.ok(mercado.posicao <= R.posicaoMaximaNoMercado);
  assert.ok(movel.impressoes / mercado.impressoes >= R.fracaoMinimaTelemovel);
});

// ── CONTROLO 2: conteúdo NOVO não pode ser castigado ────────────────────────

test('✅ CONTROLO — página nova, concentrada mas AINDA a acontecer, passa', () => {
  const R = REGUAS_REALIDADE;
  // Publicada há 6 dias: tudo concentrado, mas o tráfego é de AGORA.
  const dias = [
    { dia: '20260927', imp: 40 }, { dia: '20260928', imp: 95 },
    { dia: '20260929', imp: 120 }, { dia: '20260930', imp: 150 },
    { dia: '20261001', imp: 160 }, { dia: '20261002', imp: 180 },
  ];
  const total = dias.reduce((a, d) => a + d.imp, 0);
  const topo = [...dias].sort((a, b) => b.imp - a.imp).slice(0, 10).reduce((a, d) => a + d.imp, 0);
  const fracaoNoTopo = topo / total;
  const recentes = dias.filter((d) => d.dia >= '20260918').reduce((a, d) => a + d.imp, 0);
  const fracaoRecente = recentes / total;

  // Está concentradíssima — 100% nos 10 melhores dias…
  assert.ok(fracaoNoTopo > R.fracaoMaximaNoTopo);
  // …mas 100% do tráfego é das últimas duas semanas, por isso NÃO é pico passado.
  assert.ok(fracaoRecente >= R.fracaoMinimaRecente);
  const condenada = total >= R.impressoesParaJulgarPico
    && fracaoNoTopo > R.fracaoMaximaNoTopo
    && fracaoRecente < R.fracaoMinimaRecente;
  assert.equal(condenada, false, 'conteúdo novo não pode ser confundido com pico de robô');
});

test('✅ CONTROLO — a régua do aparelho não julga quem tem pouca gente', () => {
  const R = REGUAS_REALIDADE;
  // 40 aparições, todas em computador. Pode ser acaso — e a régua só julga a
  // partir de 100, justamente para não inventar defeito em amostra pequena.
  const mercado = { impressoes: 40 };
  assert.ok(mercado.impressoes < R.impressoesParaJulgarAparelho,
    'abaixo de 100 o aparelho não condena ninguém');
});
