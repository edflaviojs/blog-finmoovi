/**
 * O CAMINHO VIRAL ESTÁ DESLIGADO (rodar: npm test).
 *
 * ═══ POR QUÊ ═══
 * 🔴 **MEDIDO a 17/09/2026**, nos vídeos já publicados, por origem do tema:
 *   · explica um conceito (editorial) → n=22, mediana 6 views, retenção **51%**
 *   · responde a uma busca (keyword)  → n=20, mediana 10 views, retenção 17%
 *   · **copia um viral**              → n=16, mediana 5 views, retenção **11%**
 *
 * 11% é o pior resultado de tudo o que este canal produz, em qualquer formato — o Short
 * de 16s retém 39%. E não era uma experiência parada: o último saiu a 16/09.
 *
 * O próprio ficheiro já avisava porquê: *"a FORMA de prender atenção atravessa idiomas,
 * mas o ASSUNTO que faz um brasileiro parar o dedo é outro — e o assunto vem colado à
 * forma, por mais que o prompt avise"*. Exemplo real que virou vídeo: o espanhol
 * *"Nunca serás rico si ignoras estas 5 reglas del dinero"* → *"5 erros financeiros:
 * como mudar seu mindset para alcançar a riqueza"*.
 *
 * ⚠️ **ESTE TESTE EXISTE PARA QUE O CAMINHO NÃO VOLTE EM SILÊNCIO.** O código todo ficou
 * de pé (colheita, filtro da marca, teto de estrangeiros) — voltar atrás é mudar UM
 * número. Quem o mudar tem de ver este teste ficar vermelho e decidir a sério, com
 * medição nova na mão. A decisão assenta em 16 vídeos, que é pouco para ser definitiva.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const FONTE = readFileSync('scripts/keywords-to-youtube-topics.js', 'utf-8');
const TOPICOS = JSON.parse(readFileSync('.github/data/youtube-topics.json', 'utf-8'));
const lista = Array.isArray(TOPICOS) ? TOPICOS : TOPICOS.topics;

test('o cap de virais por execução está a ZERO', () => {
  const m = /const VIRAL_MAX_PER_RUN = (\d+);/.exec(FONTE);
  assert.ok(m, 'a constante VIRAL_MAX_PER_RUN desapareceu — o caminho foi reescrito');
  assert.equal(Number(m[1]), 0,
    'o caminho viral foi religado. Retenção medida: 11%, a pior do canal. Se é de propósito, meça outra vez e actualize este teste.');
});

test('a guarda sai ANTES de ler tendências e gastar o filtro da marca', () => {
  const i = FONTE.indexOf('async function importViralTopics');
  const corpo = FONTE.slice(i, i + 900);
  assert.match(corpo, /VIRAL_MAX_PER_RUN <= 0/, 'a guarda cedo desapareceu');
  assert.ok(corpo.indexOf('VIRAL_MAX_PER_RUN <= 0') < corpo.indexOf('loadTrends()'),
    'a guarda tem de vir ANTES de loadTrends() — senão o registo anuncia candidatos que nunca entram');
});

test('nenhum tema de origem viral continua à espera de virar vídeo', () => {
  const presos = lista.filter((t) => t.source === 'viral' && t.status === 'pending');
  assert.equal(presos.length, 0,
    `${presos.length} tema(s) viral ainda pending — iam virar vídeo na mesma: ${presos.map((t) => t.theme).join(', ')}`);
});

test('CONTROLO: arquivar não apagou nada, e as outras fontes ficaram intactas', () => {
  // Se um dia isto virar uma limpeza destrutiva, o histórico da decisão vai-se embora.
  assert.equal(lista.filter((t) => t.source === 'viral').length, 17, 'os temas virais foram APAGADOS em vez de arquivados');
  for (const t of lista.filter((t) => t.source === 'viral')) {
    assert.ok(t.arquivadoPorque, `${t.id}: arquivado sem dizer porquê`);
  }
  const pendentes = lista.filter((t) => t.status === 'pending');
  assert.ok(pendentes.length > 0, 'a fila ficou vazia — o canal deixaria de ter tema');
  assert.ok(pendentes.every((t) => t.source !== 'viral'));
});

test('CONTROLO: o caminho viral continua no código, pronto a religar', () => {
  // Zero, não apagado: a decisão assenta em 16 vídeos e tem de poder ser revertida.
  assert.match(FONTE, /async function importViralTopics/, 'o caminho viral foi APAGADO em vez de desligado');
  assert.match(FONTE, /avaliarViral/, 'o filtro da marca foi removido junto');
});
