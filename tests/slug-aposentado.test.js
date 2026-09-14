/**
 * Teste do slug-aposentado (rodar: npm test).
 *
 * O caso que importa é REAL e custou 5 dias de blog parado: em 09/09/2026 o robô
 * do glossário reescreveu "know your customer", que em 06/08 tinha sido fundido
 * em "kyc". O ficheiro já não existia — logo o único filtro de então
 * (`existsSync`) deixou passar — mas a URL continuava a redirecionar. O verbete
 * nasceu numa origem de redirect, o validador de links internos recusou, o build
 * morreu e o Cloudflare parou de publicar em silêncio.
 *
 * O primeiro teste fixa esse caso contra o `public/_redirects` DE VERDADE: se um
 * dia alguém tirar aquelas linhas, este teste avisa em vez de o defeito voltar.
 * O último prova o contrário e é o que impede a guarda de ficar paranoica — ela
 * não pode recusar os verbetes que estão publicados e saudáveis.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  motivoDeSlugAposentado,
  slugsAposentados,
  limparCacheDeAposentados,
  REDIRECTS_FILE,
} from '../src/scripts/lib/slug-aposentado.js';

const GLOSSARIO_DIR = join(process.cwd(), 'src', 'content', 'glossario');

/** Escreve um _redirects temporário e devolve o caminho. */
function redirectsFalso(conteudo) {
  const dir = mkdtempSync(join(tmpdir(), 'slug-aposentado-'));
  const caminho = join(dir, '_redirects');
  writeFileSync(caminho, conteudo, 'utf-8');
  return caminho;
}

test('caso real 09/09/2026: "know your customer" foi fundido em "kyc" e não pode voltar', () => {
  limparCacheDeAposentados();
  const motivo = motivoDeSlugAposentado('know-your-customer', REDIRECTS_FILE);
  assert.ok(motivo, 'a URL /glossario/know-your-customer/ é origem de redirect e tinha de ser recusada');
  assert.match(motivo, /kyc/, `o motivo devia apontar o destino: ${motivo}`);
});

test('irmão inglês aposentado NÃO barra o verbete PT vivo (caso "acoes" → "en-stocks")', () => {
  limparCacheDeAposentados();
  const caminho = redirectsFalso(
    '/en/glossario/en-acoes/  /en/glossario/en-stocks/  301\n'
  );
  // Esta é a versão que o teste obrigou a corrigir: a primeira guarda também
  // olhava `en-<slug>` e recusava "acoes", que está publicado e saudável. O
  // irmão traduzido nasce do termo INGLÊS, não do slug PT — quem o apanha é o
  // validate-internal-links no build.
  assert.equal(motivoDeSlugAposentado('acoes', caminho), null);
});

test('lê as duas formas (com e sem barra final) e ignora comentários e linhas soltas', () => {
  limparCacheDeAposentados();
  const caminho = redirectsFalso([
    '# comentário que não é regra',
    '',
    '/glossario/termo-antigo   /glossario/termo-novo/   301',
    '/glossario/outro-antigo/  /glossario/outro-novo/   301',
    '/posts/nada-a-ver/        /posts/outro/            301',
    'linha-sem-destino',
  ].join('\n'));

  const mapa = slugsAposentados(caminho);
  assert.equal(mapa.size, 2, 'só as duas regras de glossário contam');
  assert.ok(motivoDeSlugAposentado('termo-antigo', caminho));
  assert.ok(motivoDeSlugAposentado('outro-antigo', caminho));
  assert.equal(motivoDeSlugAposentado('termo-novo', caminho), null, 'o DESTINO continua livre');
});

test('nunca lança nem bloqueia quando o _redirects não existe', () => {
  limparCacheDeAposentados();
  const inexistente = join(tmpdir(), 'nao-existe-de-todo', '_redirects');
  assert.equal(motivoDeSlugAposentado('qualquer-coisa', inexistente), null);
  assert.equal(slugsAposentados(inexistente).size, 0);
});

test('não recusa nenhum verbete REAL já publicado (senão o glossário parava)', () => {
  limparCacheDeAposentados();
  const publicados = readdirSync(GLOSSARIO_DIR)
    .filter((f) => f.endsWith('.md') && !/^(en|es)-/.test(f))
    .map((f) => f.replace(/\.md$/, ''));

  assert.ok(publicados.length > 50, 'o glossário devia ter dezenas de verbetes em PT');
  for (const slug of publicados) {
    assert.equal(
      motivoDeSlugAposentado(slug, REDIRECTS_FILE),
      null,
      `falso positivo: o verbete publicado "${slug}" estaria a ser recusado`
    );
  }
});
