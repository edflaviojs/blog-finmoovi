/**
 * Teste do frontmatter-bloco (rodar: npm test).
 *
 * O caso que importa: em 22/08/2026 o gerar-alt-imagens.js inseriu a linha
 * `imageAlt:` ENTRE a chave `image: >-` e o seu valor, em 6 posts. Frontmatter
 * invalido, build do Astro em baixo, blog 3 dias sem publicar — e nenhum robo
 * ficou vermelho por isso.
 *
 * A regra que estes casos fixam e uma so: **depois de qualquer edicao, o
 * frontmatter tem de continuar a ser YAML valido**. Por isso cada caso volta a
 * passar o resultado pelo js-yaml em vez de comparar texto — comparar texto
 * provaria que a funcao faz o que eu escrevi, nao que o ficheiro sobrevive.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import matter from 'gray-matter';
import { inserirDepoisDe, substituirCampo, apagarCampo } from '../src/scripts/lib/frontmatter-bloco.js';

const ALT = 'imageAlt: "Familia no sofa a olhar para um tablet."';

/** Le o frontmatter e falha com a mensagem do YAML se ele estiver partido. */
function lerFm(raw, contexto) {
  try {
    return matter(raw).data;
  } catch (e) {
    assert.fail(`${contexto}: YAML partido — ${e.message.split('\n')[0]}`);
  }
}

const UMA_LINHA = [
  '---',
  'title: Um titulo',
  'image: /images/posts/x.webp',
  'category: dicas',
  '---',
  '',
  'Corpo do artigo.',
  '',
].join('\n');

// O formato que o js-yaml produz quando o caminho passa dos ~80 caracteres.
const EM_BLOCO = [
  '---',
  'title: Um titulo',
  'image: >-',
  '  /images/posts/como-manter-as-contas-do-dia-sob-controle-e-evitar-surpresas.webp',
  'category: dicas',
  '---',
  '',
  'Corpo do artigo.',
  '',
].join('\n');

test('inserirDepoisDe: chave numa linha so', () => {
  const fm = lerFm(inserirDepoisDe(UMA_LINHA, 'image', ALT), 'uma linha');
  assert.equal(fm.image, '/images/posts/x.webp');
  assert.equal(fm.imageAlt, 'Familia no sofa a olhar para um tablet.');
});

test('inserirDepoisDe: chave em BLOCO — o caso que partiu 6 posts', () => {
  const out = inserirDepoisDe(EM_BLOCO, 'image', ALT);
  const fm = lerFm(out, 'em bloco');
  // A capa tem de continuar a ser o caminho, e nao ">-" nem ficar orfa.
  assert.equal(fm.image, '/images/posts/como-manter-as-contas-do-dia-sob-controle-e-evitar-surpresas.webp');
  assert.equal(fm.imageAlt, 'Familia no sofa a olhar para um tablet.');
  // E a linha nova nunca pode cair entre a chave e o seu valor.
  assert.ok(!/image: >-\r?\nimageAlt:/.test(out), 'o imageAlt entrou no meio do bloco');
});

test('inserirDepoisDe: preserva CRLF', () => {
  const out = inserirDepoisDe(EM_BLOCO.replace(/\n/g, '\r\n'), 'image', ALT);
  assert.ok(out.includes('\r\n'), 'converteu CRLF em LF');
  assert.equal(lerFm(out, 'crlf').imageAlt, 'Familia no sofa a olhar para um tablet.');
});

test('substituirCampo: --force sobre um alt ja dobrado nao deixa linhas orfas', () => {
  const comAltEmBloco = [
    '---',
    'title: Um titulo',
    'image: /images/posts/x.webp',
    'imageAlt: >-',
    '  um alt antigo comprido que o js-yaml dobrou para a linha seguinte',
    'category: dicas',
    '---',
    '',
  ].join('\n');
  const fm = lerFm(substituirCampo(comAltEmBloco, 'imageAlt', ALT), 'force');
  assert.equal(fm.imageAlt, 'Familia no sofa a olhar para um tablet.');
  assert.equal(fm.category, 'dicas'); // a linha seguinte nao foi engolida
});

test('apagarCampo: leva a chave E o bloco todo', () => {
  const comAltEmBloco = [
    '---',
    'title: Um titulo',
    'image: /images/glossario/x.webp',
    'imageAlt: >-',
    '  descricao antiga que ja nao corresponde a imagem nova',
    'category: dicas',
    '---',
    '',
  ].join('\n');
  const out = apagarCampo(comAltEmBloco, 'imageAlt');
  const fm = lerFm(out, 'apagar');
  assert.equal(fm.imageAlt, undefined);
  assert.equal(fm.category, 'dicas');
  assert.ok(!out.includes('descricao antiga'), 'a linha do bloco ficou orfa');
});

test('chave ausente: devolve o ficheiro intacto', () => {
  assert.equal(apagarCampo(UMA_LINHA, 'imageAlt'), UMA_LINHA);
  assert.equal(substituirCampo(UMA_LINHA, 'imageAlt', ALT), UMA_LINHA);
  assert.equal(inserirDepoisDe(UMA_LINHA, 'naoExiste', ALT), UMA_LINHA);
});

test('nao confunde uma linha do CORPO com a chave do frontmatter', () => {
  const comIscaNoCorpo = [
    '---',
    'title: Um titulo',
    'image: /images/posts/x.webp',
    '---',
    '',
    'image: isto e texto do artigo, nao e frontmatter.',
    '',
  ].join('\n');
  const out = apagarCampo(comIscaNoCorpo, 'image');
  assert.ok(out.includes('image: isto e texto do artigo'), 'apagou a linha errada, no corpo');
  assert.equal(lerFm(out, 'isca').image, undefined);
});

// Os 6 posts reais partidos em 22/08 tinham EXATAMENTE esta forma. Se algum dia
// voltar a aparecer no repo, isto apanha-o.
test('o estrago real de 22/08 e YAML invalido (a prova de que o teste ve mesmo)', () => {
  const partido = [
    '---',
    'title: Um titulo',
    'image: >-',
    'imageAlt: "Pai, mae e filha sorrindo no sofa."',
    '  /images/posts/como-manter-as-contas-do-dia-sob-controle-e-evitar-surpresas.webp',
    'category: dicas',
    '---',
    '',
  ].join('\n');
  assert.throws(() => matter(partido), /indentation|YAMLException|bad/i);
});
