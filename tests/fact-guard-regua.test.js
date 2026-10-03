/**
 * Teste da RÉGUA do Fact Firewall (rodar: npm test).
 *
 * ═══ POR QUE A RÉGUA FOI APERTADA — 03/10/2026, conserto nº6 ═══
 *
 * 🔴 O relatório de 02/10 dizia: **495 posts · limpos: 0 · com flags: 66**. O
 * detector funcionava, corria todos os dias às 05h — **e nada acontecia**.
 *
 * Uma das causas era a própria régua: o teste antigo era «tem expressão de
 * atribuição» + «tem uma letra maiúscula algures». Isso marcava frases como
 * *"Ajuste o limite de acordo com a realidade da sua família"*, que não citam fonte
 * nenhuma. **Quando metade de um aviso é ruído, o aviso inteiro deixa de ser lido.**
 *
 * A régua nova exige as TRÊS coisas na mesma frase: **atribuição + instituição
 * nomeada + número**. É o padrão exacto da estatística inventada em conteúdo de
 * dinheiro.
 *
 * Medido no acervo real no dia da mudança: **de 66 posts sinalizados para 16**, e
 * as 20 frases que ficaram são todas estatística a sério (IBGE 64,1%, Banco Central
 * 13,2%, OECD 30%, World Bank 30%).
 *
 * ⚠️ Os dois grupos de casos abaixo vêm do acervo, **palavra por palavra**. Sem o
 * segundo grupo esta prova diria «sim» a tudo e não seria informação.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { afirmaNumeroDeFonte, analyzeContent } from '../src/scripts/lib/fact-guard.js';

// ── GRUPO 1: estatística a sério — TEM de ser sinalizada ────────────────────

const DEVE_SINALIZAR = [
  'De acordo com o Instituto Brasileiro de Geografia e Estatística (IBGE), em 2022, a maior parte dos brasileiros (64,1%) tinha dificuldade em pagar contas.',
  'Segundo o Banco Central do Brasil, o consumo em novembro de 2023 cresceu 13,2 % em relação ao mesmo período.',
  'Segundo a Organização para a Cooperação e Desenvolvimento Econômico (OECD), famílias que adotam práticas simples podem reduzir a conta em até 30 %.',
  'Segundo a World Bank, a maioria das famílias tende a postergar investimentos de médio prazo em até 30 %.',
  'De acordo com a Serasa, em 2022, quase 60% dos brasileiros utilizavam aplicativos para controlar suas finanças.',
  'Segundo a Serasa Experian, a dívida média das famílias brasileiras em 2023 ultrapassou R$ 12 mil.',
];

for (const frase of DEVE_SINALIZAR) {
  test(`🔴 sinaliza: "${frase.slice(0, 52)}…"`, () => {
    assert.equal(afirmaNumeroDeFonte(frase), true,
      'atribuição + instituição + número é o padrão da estatística inventada');
  });
}

// ── GRUPO 2: ruído do acervo — NÃO pode ser sinalizado ─────────────────────
//
// ⚠️ ESTE É O CASO FALSO DE CONTROLO. Todas estas frases eram marcadas pela régua
// antiga e nenhuma cita fonte nenhuma. São elas que tornavam o relatório ilegível.

const NAO_PODE_SINALIZAR = [
  'Ajuste o limite de acordo com a realidade da sua família, reservando sempre uma margem para imprevistos.',
  'Sim, porém pode ser necessário pagar multa por rescisão antecipada, de acordo com o que está estipulado no contrato.',
  'Taxa de juros: varia conforme o perfil do comprador, a taxa Selic e o prazo do contrato, que costuma ficar entre 15 e 30 anos.',
  'Em termos simples, o ganho ou a perda varia de acordo com a valorização ou desvalorização dos ativos.',
  'Rebalanceie trimestralmente: ajuste a proporção entre renda fixa e variável de acordo com seu conforto.',
  'Entrada: geralmente corresponde a cerca de 20 % do valor total do imóvel, podendo ser ajustada conforme o banco.',
];

for (const frase of NAO_PODE_SINALIZAR) {
  test(`✅ CONTROLO — não sinaliza: "${frase.slice(0, 50)}…"`, () => {
    assert.equal(afirmaNumeroDeFonte(frase), false,
      'sem instituição nomeada não há estatística a verificar — marcar isto é o ruído que fazia ninguém ler o relatório');
  });
}

// ── As três condições são MESMO necessárias, uma a uma ─────────────────────

test('instituição + número SEM atribuição não basta', () => {
  assert.equal(afirmaNumeroDeFonte('O IBGE publicou os dados e a inflação foi de 4,5%.'), false,
    'sem "segundo/de acordo com" não é uma afirmação atribuída');
});

test('atribuição + instituição SEM número não basta', () => {
  assert.equal(afirmaNumeroDeFonte('Segundo o Banco Central, o crédito ficou mais caro este ano.'), false,
    'sem número não há estatística a conferir — é afirmação qualitativa, que é o que se pede à IA');
});

test('atribuição + número SEM instituição não basta', () => {
  assert.equal(afirmaNumeroDeFonte('De acordo com nossos cálculos, você economiza 20% ao mês.'), false,
    'é a conta do próprio artigo, não um estudo de terceiros');
});

// ── E o link confiável continua a dispensar a sinalização ──────────────────

test('com link para fonte confiável, a frase NÃO é sinalizada', () => {
  const comLink = 'Segundo a [Investopedia](https://www.investopedia.com/terms/i/inflation.asp), a inflação chegou a 4,5% no período.';
  const r = analyzeContent(`${comLink}\n\n${'palavra '.repeat(300)}`);
  assert.equal(r.flags.length, 0, 'ter a fonte linkada é exactamente o que se quer');
});

test('sem link, a mesma frase É sinalizada', () => {
  const semLink = 'Segundo a Investopedia, a inflação chegou a 4,5% no período.';
  const r = analyzeContent(`${semLink}\n\n${'palavra '.repeat(300)}`);
  assert.equal(r.flags.length, 1, 'é o par que prova que o link é o que faz a diferença');
});

// ── O corte (mais severo que a sinalização) não foi mexido ────────────────

test('o CORTE de frases que citam estudo continua como estava', () => {
  // `cuts` é mais severo que `flags` e tem outra régua (STUDY_RE). Não foi tocado:
  // mexer nas duas ao mesmo tempo tornaria impossível saber qual mudança fez o quê.
  const corpo = `Um estudo recente mostrou que 73% das pessoas poupam pouco.\n\n${'palavra '.repeat(300)}`;
  const r = analyzeContent(corpo);
  assert.equal(r.cuts.length, 1, 'citar estudo com percentagem e sem link continua a ser CORTADO');
});
