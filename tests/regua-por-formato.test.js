/**
 * Teste da RÉGUA POR FORMATO — Shorts e vídeos longos (rodar: npm test).
 *
 * ═══ O DEFEITO QUE ISTO IMPEDE ═══
 *
 * 🔴 Até 03/10/2026 `avaliarRetencao` aplicava **70%** a tudo o que recebesse. Não
 * dava erro porque nenhum vídeo longo chegava lá — eles não eram medidos. No dia em
 * que entrassem, **os oito reprovavam de uma vez**, e nascia um alarme que dispara
 * sempre. Esta casa já pagou duas vezes por isso: um aviso que diz sempre a mesma
 * coisa deixa de ser lido, e depois não se lê o aviso verdadeiro.
 *
 * Por isso os consertos nº3 (os longos entram) e nº4 (régua própria) tiveram de
 * vir no mesmo dia. Estes testes provam que vieram certos — **nos dois sentidos**:
 * o longo bom passa, o longo mau reprova, e o mesmo número que reprova num Short
 * passa num longo.
 *
 * ⚠️ E provam a COMPATIBILIDADE: `validar-metadados-short.js` e `temas-vida.js`
 * dependem de `RETENCAO_MINIMA === 0.70` e de `avaliarRetencao` sem formato se
 * comportar como antes. Partir dois ficheiros provados para arrumar este seria o
 * remédio pior que a doença.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  avaliarRetencao, reguaDoFormato,
  RETENCAO_MINIMA, VISUALIZACOES_MINIMAS,
  RETENCAO_MINIMA_LONGO, VISUALIZACOES_MINIMAS_LONGO,
} from '../src/scripts/youtube/retencao.js';

const v = (slug, percentagemMedia, views, formato) => ({ slug, percentagemMedia, views, formato, videoId: slug });

// ── As réguas ────────────────────────────────────────────────────────────────

test('a régua do Short continua a ser 70% — dois ficheiros dependem disso', () => {
  assert.equal(RETENCAO_MINIMA, 0.70);
  assert.equal(VISUALIZACOES_MINIMAS, 10);
  const r = reguaDoFormato('short');
  assert.equal(r.minimo, 0.70);
  assert.equal(r.minViews, 10);
});

test('a régua do longo é 40% e exige 50 visualizações', () => {
  assert.equal(RETENCAO_MINIMA_LONGO, 0.40);
  assert.equal(VISUALIZACOES_MINIMAS_LONGO, 50);
  const r = reguaDoFormato('longo');
  assert.equal(r.minimo, 0.40);
  assert.equal(r.minViews, 50);
});

test('formato desconhecido cai na régua de Short — o comportamento de sempre', () => {
  assert.equal(reguaDoFormato(undefined).minimo, 0.70);
  assert.equal(reguaDoFormato(null).minimo, 0.70);
  assert.equal(reguaDoFormato('qualquer-coisa').minimo, 0.70);
});

// ── 🔴 O defeito: a régua de Short aplicada ao longo ─────────────────────────

test('🔴 com a régua de Short, TODOS os longos reais reprovariam — o alarme que dispara sempre', () => {
  // As percentagens reais medidas no Studio: 26,9% · 21,9% · 29,3% · 17,7% · 23,9%
  // (com 200 visualizações cada, para passarem o mínimo e serem de facto julgados).
  const reais = [26.88, 21.87, 29.32, 17.73, 23.94]
    .map((p, i) => v(`longo-${i}`, p / 100, 200, 'longo'));

  const comReguaDeShort = avaliarRetencao(reais, { minimo: RETENCAO_MINIMA });
  assert.equal(comReguaDeShort.abaixo.length, 5, 'é isto que acontecia: reprovavam todos');

  const comReguaPropria = avaliarRetencao(reais);
  assert.equal(comReguaPropria.abaixo.length, 5,
    'com 18–29% eles reprovam na mesma, e devem — a régua do longo é 40%');
});

test('✅ CONTROLO — o longo SAUDÁVEL passa com a régua dele e reprovaria com a de Short', () => {
  // 45% é acima da referência do ramo (40%) e muito abaixo dos 70% de Short.
  const bom = [v('longo-bom', 0.45, 200, 'longo')];

  assert.equal(avaliarRetencao(bom).acima.length, 1, 'com a régua certa, passa');
  assert.equal(avaliarRetencao(bom, { minimo: RETENCAO_MINIMA }).abaixo.length, 1,
    'com a régua de Short seria acusado à toa — é este o erro que o conserto impede');
});

test('✅ CONTROLO — o mesmo 45% num SHORT reprova, e deve', () => {
  const short = [v('short-fraco', 0.45, 200, 'short')];
  assert.equal(avaliarRetencao(short).abaixo.length, 1,
    'num Short de 16s, 45% é mau — a régua do dono são 70%');
});

// ── O mínimo de audiência, que é o que impede a mentira confortável ─────────

/**
 * ⚠️ Este teste começou por afirmar que **nenhum** dos longos de hoje seria
 * julgado — e falhou. O código estava certo e a expectativa errada: o vídeo de 59
 * visualizações passa o mínimo de 50, logo **é** julgado. Fica a verdade medida,
 * que é melhor notícia do que a suposição: a régua não é um filtro que nunca
 * deixa ninguém entrar.
 */
test('🔴 dos longos de hoje, só o de 59 visualizações tem audiência para ser julgado', () => {
  // Os longos do canal têm hoje 13, 16, 21, 40 e 59 visualizações.
  const hoje = [13, 16, 21, 40, 59].map((n, i) => v(`longo-${n}v`, 0.22, n, 'longo'));
  const r = avaliarRetencao(hoje);
  assert.equal(r.semAudiencia.length, 4, 'quatro ficam em "ainda não sei" — e isso é uma resposta');
  assert.equal(r.abaixo.length, 1, 'o de 59 entra, e com 22% reprova');
  assert.equal(r.abaixo[0].slug, 'longo-59v');

  // 🔴 O CONTRASTE que justifica o mínimo alto: com a régua de Short (10
  // visualizações), os cinco seriam acusados — incluindo um com 13 pessoas, onde
  // dois espectadores mexem o resultado em quinze pontos.
  const comMinimoDeShort = avaliarRetencao(hoje, { minViews: VISUALIZACOES_MINIMAS });
  assert.equal(comMinimoDeShort.abaixo.length, 5, 'é isto que o mínimo de 50 evita');
});

test('✅ CONTROLO — a partir de 50 visualizações o longo passa a ser julgado', () => {
  const r = avaliarRetencao([v('longo', 0.22, 50, 'longo')]);
  assert.equal(r.abaixo.length, 1, 'com 50 já entra');
  assert.equal(r.semAudiencia.length, 0);
});

test('o Short continua a ser julgado a partir de 10 visualizações', () => {
  assert.equal(avaliarRetencao([v('s', 0.5, 10, 'short')]).abaixo.length, 1);
  assert.equal(avaliarRetencao([v('s', 0.5, 9, 'short')]).semAudiencia.length, 1);
});

// ── Compatibilidade com quem já usava esta função ───────────────────────────

test('sem formato e sem régua à mão, comporta-se exactamente como antes', () => {
  // É assim que `validar-metadados-short.js` a chama.
  assert.equal(avaliarRetencao([{ slug: 'a', percentagemMedia: 0.46, views: 500 }]).abaixo.length, 1);
  assert.equal(avaliarRetencao([{ slug: 'b', percentagemMedia: 0.92, views: 500 }]).acima.length, 1);
  assert.equal(avaliarRetencao([]).abaixo.length, 0);
  assert.equal(avaliarRetencao(null).abaixo.length, 0);
});

test('passar dos 100% continua a ser BOM, não erro (o Short em ciclo)', () => {
  assert.equal(avaliarRetencao([v('viral', 1.3, 500, 'short')]).acima.length, 1);
});

test('uma régua passada à mão ganha ao formato — é o que as provas de mesa usam', () => {
  const longo = [v('l', 0.45, 200, 'longo')];
  assert.equal(avaliarRetencao(longo, { minimo: 0.90 }).abaixo.length, 1,
    'a régua explícita tem de mandar, senão as provas de mesa deixam de poder testar casos');
});

// ── A mistura dos dois formatos na mesma lista ──────────────────────────────

/**
 * ⚠️ O DEFEITO QUE SÓ A CORRIDA A SÉRIO MOSTROU — 03/10/2026, corrida 37105043821.
 *
 * O relatório trouxe dois vídeos **duas vezes cada** e contou 13 longos onde o
 * canal tem 11: a lista de envios do YouTube devolve o mesmo vídeo em páginas
 * diferentes quando a playlist mexe entre pedidos.
 *
 * Um vídeo contado duas vezes **entra duas vezes na mediana e no aviso** — e
 * ninguém repara a olhar para o relatório. Nenhuma prova de mesa apanharia isto,
 * porque o defeito estava na forma como o YouTube pagina. Fica aqui a conta que
 * prova a consequência, para ninguém tirar as duas trancas.
 */
test('🔴 um vídeo repetido ENVIESA o aviso — por isso há duas trancas', () => {
  const unicos = [v('a', 0.20, 100, 'longo'), v('b', 0.80, 100, 'longo')];
  const comRepetido = [...unicos, v('a', 0.20, 100, 'longo')];

  assert.equal(avaliarRetencao(unicos).abaixo.length, 1);
  assert.equal(avaliarRetencao(comRepetido).abaixo.length, 2,
    'o mesmo vídeo mau apareceria DUAS vezes na lista de acusados');
});

test('🔴 numa lista misturada, cada vídeo é julgado pela SUA régua', () => {
  const misturado = [
    v('short-bom', 0.85, 100, 'short'),   // passa nos 70%
    v('short-mau', 0.45, 100, 'short'),   // reprova nos 70%
    v('longo-bom', 0.45, 100, 'longo'),   // o MESMO 45% passa nos 40%
    v('longo-mau', 0.22, 100, 'longo'),   // reprova nos 40%
  ];
  const r = avaliarRetencao(misturado);
  assert.deepEqual(r.abaixo.map((x) => x.slug).sort(), ['longo-mau', 'short-mau']);
  assert.deepEqual(r.acima.map((x) => x.slug).sort(), ['longo-bom', 'short-bom']);
  // O coração do conserto: 45% reprova num e passa no outro.
  assert.ok(r.abaixo.some((x) => x.slug === 'short-mau') && r.acima.some((x) => x.slug === 'longo-bom'),
    'o mesmo número tem de dar vereditos diferentes conforme o formato');
});
