/**
 * Teste das travas das capas e do assunto visual (rodar: npm test).
 *
 * O QUE SE ESTÁ A PROTEGER: a regra de que uma capa não pode ter letras. A mesma
 * imagem serve pt/en/es, logo uma palavra escrita fica errada em dois idiomas.
 *
 * Esta regra já foi quebrada QUATRO vezes (11/06, 13/06, 18/08 e 19/08 de 2026),
 * sempre da mesma maneira: alguém melhora o pedido ao modelo, ninguém mede o
 * resultado, e semanas depois o dono é que vê as letras no site. A queixa dele em
 * 19/08 foi textualmente *"vira e mexe acontece o mesmo problema"*.
 *
 * Por isso a defesa passou a estar aqui, no CI, com AMOSTRAS REAIS em
 * tests/amostras/ — as próprias imagens que falharam:
 *   capa-com-letras.webp → a capa de 19/08 com o título do post desenhado por
 *                          cima ("Cansarlose de a1ot cer gasts…")
 *   capa-borrada.webp    → a capa de 19/08 feita com 4 passos num modelo que
 *                          precisa de 28
 *   capa-boa.webp        → uma capa correcta, para provar que a régua não reprova
 *                          o que está bom (`regua-grossa-demais-inventa-defeito`)
 *
 * ⚠️ NÃO APAGAR AS AMOSTRAS. Sem elas este teste passa a não provar nada.
 *
 * A trava de LETRAS não é testada aqui porque precisa de IA de visão, que não
 * existe no CI dos testes — essa é provada pelo diagnóstico, que corre onde as
 * chaves existem. Aqui prova-se o que é puramente local: a nitidez e a limpeza
 * do assunto. As duas juntas já matam as duas causas de 19/08.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { medirNitidez, aprovarCapa, LIMITE_NITIDEZ, ECOS_DO_ENUNCIADO, amostraEhProva } from '../src/scripts/lib/guardiao-da-capa.js';
import { assuntoVisual } from '../src/scripts/apis/image-router.js';

const AMOSTRAS = join(process.cwd(), 'tests', 'amostras');
const amostra = (nome) => readFileSync(join(AMOSTRAS, nome));

test('as amostras de referência existem (sem elas o teste não prova nada)', () => {
  for (const f of ['capa-com-letras.webp', 'capa-borrada.webp', 'capa-boa.webp']) {
    assert.ok(existsSync(join(AMOSTRAS, f)), `falta tests/amostras/${f}`);
  }
});

test('a capa borrada de 19/08 é REPROVADA pela trava de nitidez', async () => {
  const veredito = await aprovarCapa(amostra('capa-borrada.webp'), { verLetras: false });
  assert.equal(veredito.aprovada, false);
  assert.match(veredito.motivo, /borrada/);
  // O número em si importa: era 14 quando foi medido. Se um dia subir acima do
  // limite, esta amostra deixou de representar o defeito e há que trocá-la.
  assert.ok(veredito.nitidez < LIMITE_NITIDEZ, `nitidez ${veredito.nitidez} devia ser < ${LIMITE_NITIDEZ}`);
});

test('a capa boa PASSA — a régua não inventa defeito', async () => {
  const veredito = await aprovarCapa(amostra('capa-boa.webp'), { verLetras: false });
  assert.equal(veredito.aprovada, true, `reprovada por: ${veredito.motivo}`);
  assert.ok(veredito.nitidez > LIMITE_NITIDEZ * 2, `nitidez ${veredito.nitidez} devia ter folga sobre ${LIMITE_NITIDEZ}`);
});

test('a folga da régua é larga dos dois lados', async () => {
  const borrada = await medirNitidez(amostra('capa-borrada.webp'));
  const boa = await medirNitidez(amostra('capa-boa.webp'));
  // Medido em 19/08/2026: 14 contra 472. Exigir 5x é conservador de propósito —
  // se a distância encolher, a régua deixou de ser segura e alguém tem de olhar.
  assert.ok(boa > borrada * 5, `folga insuficiente: boa=${boa} borrada=${borrada}`);
});

test('estilo desfocado de propósito pode dispensar a nitidez', async () => {
  // Existiu um estilo cujo prompt PEDIA desfoque; foi removido em 19/08, mas a
  // porta fica documentada e provada para o caso de voltar.
  const veredito = await aprovarCapa(amostra('capa-borrada.webp'), { verLetras: false, exigirNitidez: false });
  assert.equal(veredito.aprovada, true);
});

// ─────────────────────────────────────────────────────────────────────────────
// O assunto visual — a causa RAIZ do defeito de 19/08
// ─────────────────────────────────────────────────────────────────────────────

test('o título do post NUNCA sai no assunto visual', () => {
  // Este é o título exacto que fez o modelo desenhar letras em 19/08.
  const titulo = 'Cansado de anotar cada gasto à mão e perder a noção do seu dinheiro';
  const assunto = assuntoVisual(titulo);
  for (const palavra of ['cansado', 'anotar', 'gasto', 'mão', 'noção', 'dinheiro']) {
    assert.ok(!assunto.toLowerCase().includes(palavra), `"${palavra}" não podia aparecer em "${assunto}"`);
  }
});

test('o assunto visual não tem pontuação, acentos nem anos', () => {
  const titulos = [
    'Como lidar com a volatilidade nas finanças pessoais em 2026',
    '7 passos práticos para guardar dinheiro para o Dia das Crianças 2026',
    'Já esqueceu de pagar a conta e ficou na mão?',
    '6 Melhores Apps Financeiros para Freelancers – Guia Prático 2026',
    'Consórcio vs Financiamento: qual escolher?',
  ];
  for (const t of titulos) {
    const a = assuntoVisual(t);
    assert.ok(!/[?!:—–"'()]/.test(a), `pontuação em "${a}"`);
    assert.ok(!/(19|20)\d{2}/.test(a), `ano em "${a}"`);
    assert.ok(!/[áàâãéêíóôõúç]/i.test(a), `acento (logo, português) em "${a}"`);
    assert.ok(a.split(/\s+/).length <= 4, `assunto longo demais: "${a}"`);
  }
});

test('a resposta que ECOA o enunciado é apanhada', () => {
  // Medido na corrida 32256396811 (19/08/2026): a IA de visão devolveu
  // {"nivel":"proeminente","amostra":"the text you can read, or empty"} —
  // copiou o exemplo do pedido em vez de olhar a imagem, e a capa foi recusada
  // por engano. Este é o eco EXACTO que aconteceu; se a lista deixar de o cobrir,
  // o falso positivo volta.
  const ecoReal = 'the text you can read, or empty';
  const apanhado = ECOS_DO_ENUNCIADO.some(e => ecoReal.toLowerCase().includes(e));
  assert.ok(apanhado, `a lista de ecos não cobre "${ecoReal}"`);

  // E não pode apanhar texto legítimo que uma capa possa ter de verdade —
  // incluindo o texto real que saiu na capa de 19/08.
  const leiturasReais = ["Cansarlose de a1ot cer gasts", 'BANCO 2026', 'SALE', ''];
  for (const amostra of leiturasReais) {
    assert.ok(!ECOS_DO_ENUNCIADO.some(e => amostra.toLowerCase().includes(e)),
      `"${amostra}" é leitura legítima e não podia ser tratada como eco`);
  }
});

/**
 * As amostras abaixo são LITERALMENTE as que a IA de visão devolveu na primeira
 * varredura real (corrida 32256692568, 19/08/2026), em que 36 de 60 capas foram
 * reprovadas por engano. Não são inventadas: é o registo dessa corrida.
 */
test('as amostras que a IA devolveu por engano NÃO são prova de texto', () => {
  const falsosAlarmes = [
    'proeminente',      // 16x — copiou o nome do próprio nível
    'None', 'none',     // 12x — está a dizer que não há texto
    'nenhuma',          // 6x
    'Nothing',
    'No written text is visible in the image.',
    'nobody would actually read this',   // ecoou o enunciado
    'the text you can read, or empty',   // idem
    '',
    '$',                // marca solta, não sustenta recusa
    '19',
  ];
  for (const a of falsosAlarmes) {
    assert.equal(amostraEhProva(a), false, `"${a}" não podia sustentar uma recusa`);
  }
});

test('o texto REAL que saiu nas capas de 19/08 continua a ser prova', () => {
  const reais = [
    "Cansarlose de a1ot cer gasts b ta l a'o mae tor esu dinieriee?",
    'cando-de-anotar calte gusto a-manto e- perrer a-nocao do seu -',
    '7 pasos prjases carar dindeidre yeard et atidie s/s nlirlinti 2226 2026',
    'Cartão die cresitó Cartão\'s debito',
    "Maximieage o s'ew cashback",
    'Working Together',
    'Investing in growth',
  ];
  for (const a of reais) {
    assert.equal(amostraEhProva(a), true, `"${a}" é texto real e tinha de contar como prova`);
  }
});

test('assuntos conhecidos são reconhecidos, e o vazio não quebra', () => {
  assert.equal(assuntoVisual('Como montar um orçamento gratuito e eficaz'), 'monthly budgeting');
  assert.equal(assuntoVisual('Montar sua primeira carteira de ETFs'), 'long term investing');
  assert.equal(assuntoVisual('Dicas para controlar gastos no cartão de crédito'), 'credit card management');
  assert.ok(assuntoVisual('').length > 0);
  assert.ok(assuntoVisual(null).length > 0);
  assert.ok(assuntoVisual(undefined).length > 0);
});
