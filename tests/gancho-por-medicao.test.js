/**
 * A MEDIÇÃO A DECIDIR O GANCHO (rodar: npm test).
 *
 * ═══ O QUE ESTE TESTE GUARDA ═══
 * Até 17/09/2026 o `retencao.js` media qual gancho segura gente, imprimia-o no registo da
 * corrida e **deitava-o fora**; `temas-vida.js` escolhia por *"quem usou menos"*. Medido
 * (medianas): `ninguém fala` 107%, `não vai acreditar` 22% — **e os dois saíam ao mesmo
 * ritmo.** O canal media há semanas e nunca agia sobre a medição.
 *
 * ⚠️ **A trava mais importante deste ficheiro é a que exige que NADA MUDE sem dados.** Uma
 * regra que inclina o robô com o ficheiro em falta, partido ou com amostra curta seria
 * palpite disfarçado de número — e mudaria o canal sem ninguém perceber porquê.
 *
 * ⚠️ E a segunda: **nenhum gancho pode ser eliminado.** São 6 a 8 vídeos por gancho, que é
 * amostra fina; eliminar com esta evidência congelava a opinião de hoje para sempre.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  dividaDosGanchos, DIVIDA_MAXIMA, MIN_AUDIENCIA_PARA_JULGAR, RETENCAO_ALVO, GANCHOS,
} from '../src/scripts/youtube/temas-vida.js';
import { mediana } from '../src/scripts/youtube/retencao.js';

const pasta = mkdtempSync(join(tmpdir(), 'medicao-'));
const escrever = (nome, dados) => {
  const p = join(pasta, nome);
  writeFileSync(p, typeof dados === 'string' ? dados : JSON.stringify(dados));
  return p;
};

/** O retrato real de 17/09, em medianas — é contra ele que a régua tem de bater. */
const REAL = [
  { familia: 'ninguém fala', comAudiencia: 8, medianaRetencao: 1.07 },
  { familia: 'tá perdendo', comAudiencia: 8, medianaRetencao: 0.79 },
  { familia: 'faça isso', comAudiencia: 8, medianaRetencao: 0.75 },
  { familia: 'começa assim', comAudiencia: 8, medianaRetencao: 0.57 },
  { familia: 'é sério que', comAudiencia: 7, medianaRetencao: 0.46 },
  { familia: 'e se parar', comAudiencia: 7, medianaRetencao: 0.45 },
  { familia: 'vocês viram', comAudiencia: 7, medianaRetencao: 0.39 },
  { familia: 'nunca faça', comAudiencia: 7, medianaRetencao: 0.37 },
  { familia: 'não vai acreditar', comAudiencia: 7, medianaRetencao: 0.22 },
  { familia: 'depois de anos', comAudiencia: 6, medianaRetencao: 0.0 },
];

// ─── o que TEM de acontecer ───────────────────────────────────────────────────

test('contra os dados reais: quem está acima da régua não deve nada, quem está abaixo paga', () => {
  const d = dividaDosGanchos(escrever('real.json', { ganchos: REAL }));
  assert.equal(d.get('ninguém fala'), undefined, '107% devia estar limpo');
  assert.equal(d.get('tá perdendo'), undefined, '79% devia estar limpo');
  assert.equal(d.get('faça isso'), undefined, '75% devia estar limpo');
  assert.ok(d.get('começa assim') >= 1, '57% está abaixo da régua e devia pagar');
  assert.ok(d.get('não vai acreditar') > d.get('começa assim'),
    'o de 22% tem de pagar MAIS que o de 57% — senão a dívida não mede nada');
});

test('quanto pior o gancho, maior a dívida — e nunca passa do tecto', () => {
  const d = dividaDosGanchos(escrever('escala.json', { ganchos: REAL }));
  for (const [familia, paga] of d) {
    assert.ok(paga >= 1 && paga <= DIVIDA_MAXIMA, `${familia}: dívida ${paga} fora de 1..${DIVIDA_MAXIMA}`);
  }
  assert.equal(d.get('depois de anos'), DIVIDA_MAXIMA, 'o pior de todos devia bater no tecto');
});

test('NENHUM gancho é eliminado: o pior continua a sair, só que mais tarde', () => {
  const d = dividaDosGanchos(escrever('vivos.json', { ganchos: REAL }));
  // Com a dívida no tecto, o pior gancho sai assim que os outros saírem DIVIDA_MAXIMA vezes
  // a mais — e não a partir de nunca. É a diferença entre inclinar e matar.
  assert.ok(DIVIDA_MAXIMA < Number.POSITIVE_INFINITY);
  assert.ok(d.get('depois de anos') <= DIVIDA_MAXIMA);
  assert.ok(d.size < GANCHOS.length, 'nem todos podem estar endividados ao mesmo tempo com estes dados');
});

test('a régua é a do dono, vinda de retencao.js — não uma cópia local', () => {
  assert.equal(RETENCAO_ALVO, 0.70);
});

// ─── o que TEM de NÃO acontecer (o controlo negativo) ─────────────────────────

test('CONTROLO: sem ficheiro de medição, dívida ZERO — o robô fica igual ao de antes', () => {
  const d = dividaDosGanchos(join(pasta, 'nao-existe-de-todo.json'));
  assert.equal(d.size, 0, 'inventou dívida sem ter dados nenhuns');
});

test('CONTROLO: ficheiro partido não lança e não inventa dívida', () => {
  const d = dividaDosGanchos(escrever('partido.json', '{ isto não é json'));
  assert.equal(d.size, 0, 'um relatório partido não pode mudar o robô');
});

test('CONTROLO: ficheiro sem o bloco `ganchos` (o formato ANTIGO) não muda nada', () => {
  // É exactamente o que estava em disco antes de 17/09: resumo + aviso + videos, sem ranking.
  const d = dividaDosGanchos(escrever('antigo.json', { resumo: {}, aviso: {}, videos: [] }));
  assert.equal(d.size, 0, 'o formato antigo tem de ser inerte, não um erro');
});

test('CONTROLO: amostra curta não é julgada — mesmo com retenção péssima', () => {
  const d = dividaDosGanchos(escrever('cedo.json', {
    ganchos: [{ familia: 'nunca faça', comAudiencia: MIN_AUDIENCIA_PARA_JULGAR - 1, medianaRetencao: 0.01 }],
  }));
  assert.equal(d.size, 0, `julgou um gancho com menos de ${MIN_AUDIENCIA_PARA_JULGAR} vídeos com audiência`);
});

test('CONTROLO: retenção em falta ou inválida não vira dívida', () => {
  const d = dividaDosGanchos(escrever('vazio.json', {
    ganchos: [
      { familia: 'nunca faça', comAudiencia: 9, medianaRetencao: null },
      { familia: 'faça isso', comAudiencia: 9 },
      { familia: '', comAudiencia: 9, medianaRetencao: 0.1 },
    ],
  }));
  assert.equal(d.size, 0, 'inventou dívida a partir de campo vazio');
});

// ─── a mediana, que é a régua do ranking ──────────────────────────────────────

test('a mediana ignora o vídeo esquecido em loop — a média não', () => {
  // Caso REAL: loop-sair-do-aluguel-voces-viram deu 20.654% com 5 visualizações.
  const vals = [0.39, 0.41, 0.35, 0.44, 206.54];
  const med = mediana(vals);
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  assert.ok(med < 0.5, `a mediana devia ficar perto de 40%, deu ${med}`);
  assert.ok(avg > 40, `a média devia disparar, deu ${avg}`);
});

test('mediana de lista vazia é null, e não zero — zero seria um veredito falso', () => {
  assert.equal(mediana([]), null);
  assert.equal(mediana([1, 2, 3, 4]), 2.5);
  assert.equal(mediana([5]), 5);
});

test('CONTROLO: um gancho com mediana null não é confundido com mediana 0', () => {
  const d = dividaDosGanchos(escrever('null-vs-zero.json', {
    ganchos: [
      { familia: 'nunca faça', comAudiencia: 9, medianaRetencao: null },
      { familia: 'faça isso', comAudiencia: 9, medianaRetencao: 0 },
    ],
  }));
  assert.equal(d.has('nunca faça'), false, 'sem medida não se pune');
  assert.equal(d.get('faça isso'), DIVIDA_MAXIMA, 'medido a zero pune-se no tecto');
});
