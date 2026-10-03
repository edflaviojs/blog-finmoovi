/**
 * Teste da chegada do Fact Firewall ao E-MAIL diário (rodar: npm test).
 *
 * ═══ O PROBLEMA QUE ISTO RESOLVE ═══
 *
 * 🔴 O detector de número sem fonte corria **todos os dias às 05h**, escrevia em
 * `press/fact-guard.md` — e **ninguém abria esse ficheiro**. O relatório de 02/10
 * dizia *«495 posts · limpos: 0 · com flags: 66»*: sessenta e seis textos
 * sinalizados, **zero acções**, durante meses. E o que ele listava, pelo nome, eram
 * os mesmos problemas que uma avaliação externa «descobriu» a 02/10 lendo o site.
 *
 * Medir e não ler é o mesmo que não medir. Por isso sobe para o e-mail que o dono
 * já recebe.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DIGEST = readFileSync(join(process.cwd(), 'src', 'scripts', 'automacoes', 'digest-diario-conteudo.js'), 'utf-8');

test('a secção existe e está LIGADA ao e-mail', () => {
  assert.match(DIGEST, /function htmlFactGuard/, 'a secção tem de existir');
  assert.match(DIGEST, /sections\.push\(htmlFactGuard\(/,
    'existir não basta — tem de ser empurrada para o e-mail, senão é código morto');
});

test('a secção falha em aviso, nunca derruba o e-mail', () => {
  // O padrão da casa: uma secção que rebenta vira aviso, não leva o resto atrás.
  assert.match(DIGEST, /warnBlock\('🛡️ Números sem fonte'/);
});

test('avisa quando o próprio relatório está VELHO', () => {
  assert.match(DIGEST, /idadeDias/,
    'um detector parado é indistinguível de um blog sem problemas — a diferença só se vê na data');
});

/**
 * A leitura do relatório, provada contra o formato REAL que o robô escreve.
 * (A mesma conta que a secção faz, replicada aqui para poder ser medida sozinha.)
 */
const lerCabecalho = (md) => ({
  gerado: (md.match(/\*\*Gerado em:\*\*\s*(\S+)/) || [])[1] || null,
  flags: Number((md.match(/com flags:\s*(\d+)/) || [])[1] ?? NaN),
  limpos: Number((md.match(/limpos:\s*(\d+)/) || [])[1] ?? NaN),
});

test('lê o cabeçalho do relatório real que o robô escreve', () => {
  const exemplo = [
    '# 🛡️ Fact Firewall — relatorio anti-alucinacao',
    '',
    '**Gerado em:** 2026-10-02T10:52:21.955Z',
    '**Posts:** 495 · limpos: 0 · bloqueados p/ revisao: 0 · com flags: 66',
  ].join('\n');
  const r = lerCabecalho(exemplo);
  assert.equal(r.flags, 66);
  assert.equal(r.limpos, 0);
  assert.equal(r.gerado, '2026-10-02T10:52:21.955Z');
});

test('a conta da idade apanha um relatório parado', () => {
  const idade = (gerado, hoje) => Math.floor((Date.parse(hoje) - Date.parse(gerado)) / 86400000);
  assert.equal(idade('2026-10-02T10:52:21.955Z', '2026-10-03') >= 2, false, 'de ontem: ainda normal');
  assert.equal(idade('2026-09-28T10:52:21.955Z', '2026-10-03') >= 2, true, 'de há 5 dias: o robô parou');
});

/**
 * ⚠️ CASO FALSO DE CONTROLO — o relatório SEM problemas não pode dar alarme.
 * Sem este teste, bastava a secção gritar sempre, e voltávamos ao aviso que
 * ninguém lê por motivo oposto.
 */
test('✅ CONTROLO — com zero sinalizados, a secção não inventa alarme', () => {
  const limpo = '**Gerado em:** 2026-10-03T05:00:00.000Z\n**Posts:** 495 · limpos: 0 · bloqueados p/ revisao: 0 · com flags: 0';
  const r = lerCabecalho(limpo);
  assert.equal(r.flags, 0);
  // E o código tem o caminho para esse caso, com texto próprio.
  assert.match(DIGEST, /Nenhum texto afirma número de instituição sem a fonte/);
});

test('✅ CONTROLO — relatório ilegível não é tratado como "está tudo bem"', () => {
  const r = lerCabecalho('ficheiro truncado sem cabeçalho nenhum');
  assert.ok(Number.isNaN(r.flags), 'sem número, não se pode concluir nada');
  assert.match(DIGEST, /ilegível/, 'e o código tem de o dizer, não calar');
});

test('o relatório que existe hoje no repositório é legível pela secção', () => {
  const caminho = join(process.cwd(), 'press', 'fact-guard.md');
  if (!existsSync(caminho)) return; // ainda não correu: não é falha
  const r = lerCabecalho(readFileSync(caminho, 'utf-8'));
  assert.ok(Number.isFinite(r.flags), 'o formato do relatório real tem de casar com o que a secção lê');
});
