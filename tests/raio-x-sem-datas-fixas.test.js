/**
 * Teste do RAIO-X das aparições (rodar: npm test).
 *
 * ═══ O DEFEITO QUE ISTO IMPEDE ═══
 *
 * 🔴 O raio-X nasceu a 02/10/2026 para responder a **uma** pergunta de **um** dia, e
 * respondeu: foi ele que provou que a «oportunidade na posição 8» eram 1.161
 * aparições em sete dias, de França e Alemanha, em computador, numa página em
 * português — com o Brasil na posição 84.
 *
 * Mas trazia `FIM = '2026-09-29'` escrito no código. **A pior parte não é não
 * funcionar — é funcionar e mentir:** correr isto em novembro devolveria setembro,
 * com ar de medição fresca e sem erro nenhum. É a régua velha a correr em estrutura
 * nova, calada.
 *
 * ⚠️ Este ficheiro não toca na rede. Prova que as datas **se calculam** e que
 * nenhuma data de 2026 voltou para dentro do código.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const FONTE = readFileSync(join(process.cwd(), 'src', 'scripts', 'automacoes', 'gsc-raio-x-aparicoes.js'), 'utf-8');

test('🔴 nenhuma data está escrita no código', () => {
  // Só o corpo, sem comentários: as datas CITADAS na explicação do defeito podem
  // (e devem) ficar — é o registo do que aconteceu.
  const semComentarios = FONTE
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  const datas = semComentarios.match(/'20\d{2}-\d{2}-\d{2}'/g) || [];
  assert.deepEqual(datas, [],
    `data fixa de volta no código: ${datas.join(', ')} — correr em novembro devolveria isso`);
});

test('a janela desconta o atraso do Search Console', () => {
  assert.match(FONTE, /ATRASO_DIAS\s*=\s*3/,
    'o GSC atrasa 2-3 dias; sem descontar, os últimos dias parecem uma queda que não existe');
  assert.match(FONTE, /campo\('fim'\) \|\| dia\(ATRASO_DIAS\)/);
});

test('a conta da janela dá o que se espera', () => {
  const ATRASO = 3;
  const dia = (o, agora) => new Date(agora - o * 86400000).toISOString().slice(0, 10);
  const agora = Date.parse('2026-11-20T10:00:00Z'); // um dia qualquer no futuro

  assert.equal(dia(ATRASO, agora), '2026-11-17', 'o fim recua 3 dias');
  assert.equal(dia(ATRASO + 28, agora), '2026-10-20', 'e o início, mais 28');
  // 🔴 O ponto todo: em novembro mede novembro, não setembro.
  assert.ok(dia(ATRASO, agora) > '2026-10-01');
});

test('o alvo entra por parâmetro OU por variável de ambiente', () => {
  assert.match(FONTE, /const campo = \(nome\)/);
  assert.match(FONTE, /process\.env\[`RX_\$\{nome\.toUpperCase\(\)\}`\]/,
    'o workflow passa por ambiente: uma busca com espaços na linha de comando viraria 4 argumentos');
  for (const c of ['busca', 'pagina', 'dias', 'mudanca']) {
    assert.ok(FONTE.includes(`campo('${c}')`), `o campo "${c}" tem de ser lido pelos dois caminhos`);
  }
});

test('sem alvo pedido, ele escolhe o de MAIS aparições em vez de desistir', () => {
  assert.match(FONTE, /async function descobrirAlvo/);
  assert.match(FONTE, /escolhida: a de mais aparições/,
    'e diz que escolheu — senão quem lê pensa que foi pedido');
});

/**
 * ⚠️ CASO FALSO DE CONTROLO — a secção de antes/depois **não pode** aparecer sem
 * alguém dizer quando foi a mudança. Era isso que a tornava uma resposta falsa:
 * a data de 15/09 estava no código e a secção saía sempre, mesmo em novembro.
 */
test('🔴 o antes/depois só sai se a data da mudança for PEDIDA', () => {
  assert.match(FONTE, /if \(FIX_TITULO && filtroPagina\)/,
    'sem data pedida, a secção não pode sair');
  assert.match(FONTE, /não pedido — para comparar, correr com/,
    'e tem de dizer porque não saiu, em vez de desaparecer calada');
});

test('o país do mercado sai do idioma da página, não é "bra" fixo', () => {
  assert.match(FONTE, /idiomaDaPagina/);
  assert.match(FONTE, /\{ pt: 'bra', en: 'usa', es: 'esp' \}/,
    'investigar uma página /en/ e medir o Brasil não diz nada sobre ela');
});

test('o workflow passa os quatro campos por ambiente', () => {
  const wf = readFileSync(join(process.cwd(), '.github', 'workflows', 'gsc-raio-x-aparicoes.yml'), 'utf-8');
  for (const v of ['RX_BUSCA', 'RX_PAGINA', 'RX_DIAS', 'RX_MUDANCA']) {
    assert.ok(wf.includes(v), `${v} tem de chegar ao script`);
  }
  // ⚠️ E NÃO pode montar a linha de comando com `[ -n ... ] &&`: se o último teste
  // der falso, o passo devolve código 1 e fica vermelho sem nada ter corrido mal.
  assert.doesNotMatch(wf, /\[ -n "\$RX_/,
    'montar argumentos no shell parte com espaços e pode pintar o passo de vermelho à toa');
});
