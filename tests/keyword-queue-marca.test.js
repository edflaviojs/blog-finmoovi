/**
 * Teste do filtro de marca/nicho da fila de keywords (rodar: npm test).
 *
 * ⚠️ Estes casos são POLÍTICA EDITORIAL, não afinação técnica — mesmo aviso do
 * validar-filtro-de-marca.js do YouTube. Mudar um "bloqueia" para "passa" é
 * mudar o que o site pode falar: é decisão do dono, não do programador.
 *
 * O filtro é lido por TRÊS portas de conteúdo (fila de posts, rotação A-Z do
 * glossário e gerar-solucoes-finmoovi.js), logo um falso positivo aqui cala os
 * três de uma vez — e cala em silêncio, porque "sem tema aceitável" parece
 * "nada a fazer hoje".
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { motivoDeMarca, namesLocalBrand } from '../src/scripts/lib/keyword-queue.js';

test('marca local brasileira é barrada', () => {
  for (const k of ['fatura do cartão atacadão', 'despesa recorrente conta azul',
                   'como funciona cartao virtual nubank', 'cartao de credito pagbank',
                   'emprestimo do itau', 'financiamento da caixa']) {
    assert.equal(motivoDeMarca(k), 'nome-proprio-local', `devia barrar: ${k}`);
  }
});

test('app/plataforma de terceiro é barrada', () => {
  for (const k of ['despesa recorrente splitwise', 'webull', 'yahoo finance']) {
    assert.equal(motivoDeMarca(k), 'produto-de-terceiro', `devia barrar: ${k}`);
  }
});

test('cripto está fora do nicho (decisão do dono, 06/08/2026)', () => {
  for (const k of ['o que e bitcoin', 'criptomoedas para iniciantes', 'cripto',
                   'nft', 'blockchain', 'staking de ethereum', 'xrp',
                   'binance', 'coinbase', 'robinhood', 'etoro', 'metatrader',
                   'tradingview', 'mercado bitcoin']) {
    assert.equal(motivoDeMarca(k), 'fora-do-nicho-cripto', `devia barrar: ${k}`);
  }
});

test('🔴 criptografia NÃO é cripto — é tema legítimo de segurança', () => {
  // A razão de a lista nomear as formas exactas ("criptomoeda", "criptoativo")
  // em vez de um prefixo `cripto*`, que apanharia isto.
  for (const k of ['criptografia', 'o que e criptografia de dados',
                   'seguranca e criptografia']) {
    assert.equal(motivoDeMarca(k), null, `NÃO devia barrar: ${k}`);
  }
});

test('🔴 falsos positivos já medidos em 30/07 continuam a passar', () => {
  // Cada um destes custou uma medição. Se algum começar a falhar, alguém
  // acrescentou à lista uma palavra com homónimo em português.
  for (const k of ['ações americanas', 'bolsas americanas', 'etf de ações americanas',
                   'o que é mercado livre', 'mercado livre de energia', 'o que é a b3',
                   'consultar o spc', 'tirar nome do spc e serasa',
                   'fluxo de caixa', 'conta caixa', 'o que e fgts', 'receita federal']) {
    assert.equal(motivoDeMarca(k), null, `NÃO devia barrar: ${k}`);
  }
});

test('🔴 palavras centrais do nicho nunca podem ser barradas', () => {
  for (const k of ['carteira de investimentos', 'carteira digital', 'mineracao',
                   'acoes de mineracao', 'token de autenticacao', 'eter',
                   'renda fixa', 'tesouro direto', 'bolsa de valores', 'xetra',
                   'dolar', 'poder de compra', 'juros compostos']) {
    assert.equal(motivoDeMarca(k), null, `NÃO devia barrar: ${k}`);
  }
});

test('sardinha passa: é o peixe E o pequeno investidor (conceito legítimo)', () => {
  // As keywords do influenciador foram dispensadas À MÃO na fila. Bloquear a
  // palavra mataria o conceito — ver o aviso em keyword-queue.js.
  assert.equal(motivoDeMarca('sardinha'), null);
  assert.equal(motivoDeMarca('investidor sardinha'), null);
});

test('namesLocalBrand continua a responder true/false para quem já o usava', () => {
  assert.equal(namesLocalBrand('nubank'), true);
  assert.equal(namesLocalBrand('renda fixa'), false);
});

test('entrada vazia/inválida nunca lança nem barra', () => {
  for (const k of ['', '   ', null, undefined, 42]) {
    assert.equal(motivoDeMarca(k), null);
  }
});
