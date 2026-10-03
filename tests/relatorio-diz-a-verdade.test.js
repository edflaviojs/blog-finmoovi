/**
 * Teste do RELATÓRIO DE SEGUNDA — o que o dono lê (rodar: npm test).
 *
 * ═══ O ENGANO QUE ISTO IMPEDE ═══
 *
 * 🔴 Foi do `gsc-oportunidades.md` que saiu o maior engano desta casa. Durante três
 * semanas ele anunciou:
 *
 *     "como reduzir gastos mensais" — 1.161 impressões, POSIÇÃO 8, ZERO cliques
 *
 * Isso guiou o SEO de setembro inteiro, e a 02/10/2026 uma avaliação externa leu o
 * mesmo relatório e repetiu a mesma conclusão. **A verdade:** as impressões vinham
 * de França, Alemanha, Marrocos e Argélia, 1.163 em computador contra 1 em
 * telemóvel, num pico de sete dias que já tinha acabado. **No Brasil, a página
 * estava na posição 84.**
 *
 * A 02/10 os robôs que AGEM ganharam o filtro. Este, que não age mas é o que o Ed
 * LÊ, continuou a mostrar o número global. Estes testes travam o regresso disso.
 *
 * ⚠️ Não tocam na rede: provam a MONTAGEM do relatório a partir de dados já
 * medidos, que é onde a mentira aparecia.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const FONTE = readFileSync(join(process.cwd(), 'src', 'scripts', 'automacoes', 'gsc-oportunidades.js'), 'utf-8');

test('o relatório mostra a posição NO MERCADO ao lado da global', () => {
  assert.match(FONTE, /Posição NO MERCADO/,
    'sem esta coluna, o relatório volta a contar só metade da história');
  assert.match(FONTE, /Posição GLOBAL/,
    'a global fica: é a DIFERENÇA entre as duas que conta a história');
});

test('as duas categorias que afirmam "há oportunidade de posição" são conferidas', () => {
  assert.match(FONTE, /conferirRealidade\(opportunities\.strikingDistance/);
  assert.match(FONTE, /conferirRealidade\(opportunities\.lowCtr/);
});

test('lacunas e canibalização NÃO são conferidas — e o porquê está escrito', () => {
  assert.doesNotMatch(FONTE, /conferirRealidade\(opportunities\.gaps/,
    'a pergunta da lacuna é "não existe página", e isso é verdade venha o tráfego de onde vier');
  assert.doesNotMatch(FONTE, /conferirRealidade\(opportunities\.cannibalization/);
  assert.match(FONTE, /por consistência/i,
    'a razão de ficarem de fora tem de estar escrita, senão alguém "arruma" isto depois');
});

test('o motivo de cada busca rejeitada vai no relatório — filtro que corta calado não serve', () => {
  assert.match(FONTE, /Não é oportunidade/);
  assert.match(FONTE, /realidade\.motivo/);
});

test('o que ficou POR conferir é dito em voz alta — nunca cortar em silêncio', () => {
  assert.match(FONTE, /não foram conferidas/);
  assert.match(FONTE, /LIMITE_REALIDADE/);
});

test('com o filtro desligado, o relatório AVISA em vez de fingir que conferiu', () => {
  assert.match(FONTE, /filtro de realidade está DESLIGADO/);
});

/**
 * ⚠️ CASO FALSO DE CONTROLO — a conta do salto de posição.
 *
 * Sem um limiar, o 🔴 ou aparecia em tudo (e ninguém o lia) ou nunca aparecia.
 * Com 20, o caso real (8 → 84, salto de 76) é marcado, e uma variação normal
 * (7,9 → 11, salto de 3,1) **não** é. Se um dia alguém baixar o limiar para 2,
 * este teste grita.
 */
test('🔴 o salto de posição marca o caso real e NÃO marca a variação normal', () => {
  const salto = (global, mercado) => Math.abs(mercado - global) >= 20;

  assert.equal(salto(8, 84), true, 'o caso que enganou a casa tem de ser marcado');
  assert.equal(salto(7.95, 11), false, 'uma diferença normal não pode acender alarme');
  assert.equal(salto(5, 9), false);
  assert.equal(salto(6, 70), true, 'página 7 do Google também é fantasma');
});

test('a legenda explica os selos — senão o símbolo não quer dizer nada', () => {
  assert.match(FONTE, /Como ler/);
  assert.match(FONTE, /🤖/);
  assert.match(FONTE, /✅/);
});

/**
 * 🔴 O DEFEITO QUE A PRIMEIRA CORRIDA A SÉRIO APANHOU — 03/10, corrida 37106203626.
 *
 * A primeira versão tinha DOIS selos e carimbava «não é oportunidade» em buscas que
 * apenas ainda não têm gente: *«o que significa saldo pendente»*, com 17 aparições
 * no Brasil, é procura legítima e pequena. **Acusação falsa** — e pelo mesmo defeito
 * contra o qual esta trava foi escrita.
 *
 * «Não sei», «é falso» e «aparece lá atrás» pedem acções opostas: esperar, ignorar,
 * e procurar backlinks. Um símbolo só para as três devolve o relatório à mentira.
 */
test('🔴 "ainda não sei" NÃO pode ser carimbado como "é falso"', () => {
  assert.match(FONTE, /case 'amostra': return '⏳'/,
    'pouca gente ainda = esperar, nunca acusar');
  assert.match(FONTE, /case 'posicao': return '📉'/,
    'aparecer lá atrás é problema de backlink, não de título');
  assert.match(FONTE, /case 'erro': return '⚠️'/,
    'falhar a conferir não é aprovação');
});

test('os motivos vão em blocos SEPARADOS, não num saco só', () => {
  assert.match(FONTE, /Não é oportunidade — o tráfego não é o nosso público/);
  assert.match(FONTE, /Aparece, mas lá atrás/);
  assert.match(FONTE, /Ainda cedo para dizer \(não é defeito\)/);
});

/**
 * ⚠️ CASO FALSO DE CONTROLO da régua nova: a mesma busca com números diferentes
 * tem de dar vereditos diferentes. Sem isto, bastava um `return 'amostra'` sempre.
 */
test('🔴 fantasma e "ainda cedo" distinguem-se pelo VOLUME, não pelo gosto', () => {
  const R = { impressoesParaJulgarPico: 100, fracaoMinimaDoMercado: 0.5, impressoesMinimasNoMercado: 30 };
  const classifica = (totais, noMercado) => {
    if (totais >= R.impressoesParaJulgarPico && (noMercado / totais) < R.fracaoMinimaDoMercado) return 'mercado';
    if (noMercado < R.impressoesMinimasNoMercado) return 'amostra';
    return 'ok';
  };

  // O caso real: 946 aparições, ZERO do Brasil → há procura, não é nossa.
  assert.equal(classifica(946, 0), 'mercado');
  // «o que significa saldo pendente»: 18 no total, 17 do Brasil → é cedo, não é robô.
  assert.equal(classifica(18, 17), 'amostra');
  // E uma busca saudável passa.
  assert.equal(classifica(200, 180), 'ok');
});
