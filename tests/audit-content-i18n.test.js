/**
 * Teste do detector de conteúdo por adaptar (rodar: npm test).
 *
 * Dois grupos de casos, e ambos nasceram de defeito REAL medido em 06/08/2026:
 *
 *  1. Os casos "página dada como limpa": 20 ficheiros tinham severidade 0 com
 *     termo brasileiro bem visível no texto — "It's a complement to the INSS
 *     retirement", "like Nubank or Magazine Luiza", "the market for [ações]".
 *
 *  2. O CRUZAMENTO com o prompt. Esta casa tem um padrão que já mordeu várias
 *     vezes: o prompt manda escrever aquilo que o validador castiga. Aqui o
 *     defeito era o contrário — o detector calava-se sobre termos que o prompt
 *     também não mandava adaptar (INSS não estava em nenhum dos dois). O último
 *     teste deste ficheiro impede que as duas listas voltem a separar-se, seja
 *     em que sentido for.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  analisarConteudo,
  BR_INSTITUTIONS,
  BR_PRODUCTS,
  BR_BRANDS,
  BR_ACRONYMS,
  GEO_BR_REFS,
  PT_LEFTOVERS,
  PT_LEFTOVERS_EN_ONLY,
} from '../scripts/audit-content-i18n.js';
import { getTranslationInstructions } from '../src/scripts/lib/translation-prompt.js';

/** Monta um ficheiro markdown de teste. */
function ficheiro(frontmatter, corpo) {
  return `---\n${frontmatter}\n---\n\n${corpo}\n`;
}

test('caso real: "INSS" em texto inglês deixa de passar por limpo', () => {
  // en-private-pension.md, medido em 06/08/2026 com severidade 0.
  const md = ficheiro(
    'term: "Private Pension"',
    "Private Pension is a long-term investment for retirement. It's a complement to the INSS retirement."
  );
  const r = analisarConteudo('en-private-pension.md', md, 'glossario');

  assert.ok(r.severity > 0, 'INSS em texto inglês tem de contar como defeito');
  assert.ok(r.issues.brAcronyms.includes('INSS'));
});

test('caso real: marca brasileira dada como exemplo conta como defeito', () => {
  // en-bolsa-de-valores.md e en-hedge.md, ambos com severidade 0 em 06/08/2026.
  const md = ficheiro(
    'term: "Stock Exchange"',
    'Imagine you own a small piece of a company, like Nubank or Magazine Luiza.'
  );
  const r = analisarConteudo('en-hedge.md', md, 'glossario');

  assert.ok(r.severity > 0);
  assert.deepEqual(r.issues.brBrands.sort(), ['Magazine Luiza', 'Nubank']);
});

test('marca em minúsculas também é apanhada (quem escreve o texto é um LLM)', () => {
  const md = ficheiro('title: "Apps"', 'Try an app like nubank or picpay to start.');
  const r = analisarConteudo('en-apps.md', md, 'posts');

  assert.deepEqual(r.issues.brBrands.sort(), ['Nubank', 'PicPay']);
});

test('marca com vogal acentuada no fim é apanhada (o \\b do JS não a veria)', () => {
  const md = ficheiro('title: "Banks"', 'Open an account at Itaú and compare.');
  const r = analisarConteudo('en-banks.md', md, 'posts');

  assert.ok(r.issues.brBrands.includes('Itaú'));
});

test('caso real: palavra portuguesa solta no texto inglês conta UMA A UMA', () => {
  // PT_WORDS só dispara com 5+ palavras distintas; estas contam à primeira.
  const md = ficheiro('title: "Stock Exchange - Glossary"', 'The market for ações is where the valor of your stock rises.');
  const r = analisarConteudo('en-bolsa.md', md, 'glossario');

  assert.ok(r.issues.ptLeftovers.includes('ações'));
  assert.ok(r.issues.ptLeftovers.includes('valor'), '"valor" é defeito em texto inglês');
  assert.ok(r.severity >= 2, 'duas palavras portuguesas já são severidade 2');
});

test('"valor" em espanhol NÃO é defeito — é a palavra certa', () => {
  const md = ficheiro('title: "Bolsa de valores"', 'El valor de tu inversión puede subir.');
  const r = analisarConteudo('es-bolsa.md', md, 'glossario');

  assert.equal(r.issues.ptLeftovers.includes('valor'), false);
});

test('ISENÇÃO: termo no título quer dizer que a página é SOBRE ele', () => {
  // Sem isto, o robô transformava "PIX vs TED" em "instant transfers vs
  // instant transfers" e o artigo deixava de fazer sentido.
  const md = ficheiro(
    'title: "PIX vs TED: Which One Is Worth It in 2026?"',
    'PIX is instant and free. TED takes hours. Most people use PIX every day.'
  );
  const r = analisarConteudo('en-pix-vs-ted.md', md, 'posts');

  assert.equal(r.issues.brAcronyms.includes('Pix'), false);
  assert.equal(r.severity, 0);
});

test('a isenção NÃO se estende ao corpo: título genérico não protege o resto', () => {
  // en-tesouro-direto.md chama-se "Government Bonds - Financial Glossary" no
  // título e mantinha LTNs/NTNs no corpo. Tem de continuar a contar.
  const md = ficheiro(
    'title: "Government Bonds - Financial Glossary"',
    'Government bonds such as LTNs (short-term) and NTNs (long-term) are issued by the government.'
  );
  const r = analisarConteudo('en-tesouro-direto.md', md, 'glossario');

  assert.ok(r.severity > 0, 'LTN/NTN no corpo continuam a ser defeito');
  assert.ok(r.issues.brAcronyms.includes('LTN'));
  assert.ok(r.issues.brAcronyms.includes('NTN'));
});

test('siglas casam por palavra inteira: "Pixel" não é "Pix"', () => {
  const md = ficheiro('title: "Design"', 'Every pixel counts, and Pixel phones are popular.');
  const r = analisarConteudo('en-design.md', md, 'posts');

  assert.equal(r.issues.brAcronyms.includes('Pix'), false);
  assert.equal(r.severity, 0);
});

test('palavra portuguesa dentro de outra não conta ("transações" não é "ações")', () => {
  const md = ficheiro('title: "Transactions"', 'As transações e a situação do mercado.');
  const r = analisarConteudo('es-x.md', md, 'posts');

  assert.equal(r.issues.ptLeftovers.includes('ações'), false);
  assert.equal(r.issues.ptLeftovers.includes('ação'), false);
});

test('o que já era detectado continua a ser detectado', () => {
  const md = ficheiro('title: "Saving"', 'Save R$ 100 per month. In fact, R$ 500 is better. Try R$ 1.000.');
  const r = analisarConteudo('en-save.md', md, 'posts');

  assert.equal(r.issues.currency, 3);
  assert.ok(r.severity >= 2);
});

test('ficheiro sem frontmatter não lança e não inventa isenções', () => {
  const r = analisarConteudo('en-solto.md', 'Texto solto com INSS e mais nada.', 'posts');
  assert.ok(r.issues.brAcronyms.includes('INSS'));
});

test('CRUZAMENTO trava x prompt: todo o termo castigado é mandado adaptar', () => {
  // A regra desta casa. Punir um termo que o prompt não manda trocar é ensinar
  // ao modelo um atalho que ele nunca recebeu — foi assim que o INSS ficou anos
  // sem ser adaptado nem detectado.
  const termos = [
    ...BR_INSTITUTIONS,
    ...BR_PRODUCTS,
    ...BR_BRANDS,
    ...BR_ACRONYMS,
    ...GEO_BR_REFS,
    ...PT_LEFTOVERS,
    ...PT_LEFTOVERS_EN_ONLY,
  ];

  for (const lang of ['English', 'Spanish']) {
    const prompt = getTranslationInstructions(lang, {
      brandName: 'FinMoovi',
      appUrl: 'app.finmoovi.com',
    }).toLowerCase();

    const ausentes = termos.filter((t) => !prompt.includes(t.toLowerCase()));
    assert.deepEqual(
      ausentes,
      [],
      `o detector castiga estes termos mas o prompt (${lang}) não manda adaptá-los`
    );
  }
});

test('CORPUS: o detector corre em todos os ficheiros EN/ES reais sem lançar', () => {
  const pastas = ['src/content/posts', 'src/content/glossario'];
  let vistos = 0;

  for (const pasta of pastas) {
    const dir = join(process.cwd(), ...pasta.split('/'));
    const ficheiros = readdirSync(dir).filter(
      (f) => f.endsWith('.md') && (f.startsWith('en-') || f.startsWith('es-'))
    );

    for (const f of ficheiros) {
      const r = analisarConteudo(f, readFileSync(join(dir, f), 'utf-8'), pasta.split('/').pop());
      assert.ok(Number.isInteger(r.severity) && r.severity >= 0 && r.severity <= 3, `severidade inválida em ${f}`);
      vistos++;
    }
  }

  assert.ok(vistos > 200, `esperava >200 ficheiros EN/ES, vi ${vistos}`);
});
