/**
 * clean-dist.mjs — Limpa `dist/` IMEDIATAMENTE ANTES do `astro build`.
 *
 * CAUSA-RAIZ (comprovada empiricamente neste repositorio, nao e bug do Astro
 * nem do Vite): o `astro build` ja deveria esvaziar `dist/` sozinho — por baixo
 * ele usa o `emptyDir` do Vite, que chama
 * `fs.rmSync(caminho, { recursive: true, force: true })`. Nesta maquina
 * Windows, com um caminho de utilizador ACENTUADO (`C:\Users\Ed Flávio\...`),
 * esse `fs.rmSync` devolve sucesso SEM lancar excecao e SEM remover nada.
 * Reproduzido isolado, fora do Astro, nesta mesma pasta (Node v24.12.0):
 * a pasta continua a existir depois da chamada, e nenhum erro e emitido.
 * `fs.unlinkSync` e `fs.rmdirSync` — as APIs antigas, sem a opcao `recursive`
 * agregada — continuam a funcionar no mesmo caminho. E essa a unica diferenca:
 * a API nova e generica de remocao fica muda; as primitivas antigas nao.
 *
 * CONSEQUENCIA DE NAO CORRIGIR: `dist/` acumula HTMLs orfaos de builds
 * anteriores (ja se observaram 161 ficheiros fantasma). Os validadores
 * pos-build (`validate-schema`, `validate-trailing-slash`,
 * `validate-internal-links`) leem `dist/` — com lixo antigo la dentro eles
 * validam terreno mentiroso: aprovam paginas que ja nao existem e deixam de ver
 * o build real.
 *
 * Este script contorna o problema removendo `dist/` a mao, ficheiro a ficheiro,
 * usando so `fs.unlinkSync` / `fs.rmdirSync` (NUNCA `fs.rm` / `fs.rmSync`).
 *
 * POSICAO NO PIPELINE (ver "build" em package.json): tem de correr DEPOIS de
 * `npm run generate` (que escreve em `src/`, nao em `dist/`) e IMEDIATAMENTE
 * ANTES de `astro build`. Nao pode ir para o inicio do build: os validadores
 * pre-build que o antecedem nao podem ser deslocados. O `postbuild`
 * (`pagefind --site dist`) corre depois do build completo e nao e afetado.
 *
 * Falha alto (`process.exit(1)`) se, por qualquer razao, `dist/` continuar a
 * existir depois de tentar limpar — nunca deixa passar um ficheiro fantasma
 * para producao em silencio.
 */
import { existsSync, lstatSync, readdirSync, rmdirSync, unlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Resolvido a partir da localizacao DESTE ficheiro (a raiz do blog), nao do
 * `process.cwd()`: se algum dia o script for invocado de outra pasta, ele nao
 * pode apagar o `dist/` errado.
 */
const ROOT = dirname(fileURLToPath(import.meta.url));
const DIST = resolve(ROOT, 'dist');

// Trava de seguranca: so removemos algo chamado "dist" dentro desta raiz.
if (DIST !== join(ROOT, 'dist')) {
  console.error(`✗ Alvo de limpeza inesperado: ${DIST}. Abortando por seguranca.`);
  process.exit(1);
}

/**
 * Remove um ficheiro ou pasta recursivamente, sem usar `fs.rm`/`fs.rmSync`.
 * @param {string} target Caminho do ficheiro ou pasta a remover.
 * @returns {void}
 */
function removeRecursiveSync(target) {
  let stat;
  try {
    stat = lstatSync(target);
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }

  // `lstat` (nao `stat`): um symlink para pasta e removido como ligacao, sem
  // que a varredura entre no destino.
  if (stat.isDirectory()) {
    for (const entry of readdirSync(target)) {
      removeRecursiveSync(join(target, entry));
    }
    rmdirSync(target);
  } else {
    unlinkSync(target);
  }
}

if (!existsSync(DIST)) {
  console.log('✓ dist/ ja nao existe — nada a limpar antes do build.');
  process.exit(0);
}

/** Contagem so para o log: prova visivel de quanto lixo havia. */
let removedFiles = 0;
function countFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) countFiles(join(dir, entry.name));
    else removedFiles += 1;
  }
}
countFiles(DIST);

removeRecursiveSync(DIST);

if (existsSync(DIST)) {
  console.error('✗ Falha ao limpar dist/ antes do build — a pasta continua a existir.');
  console.error('  Sem uma pasta limpa o build seguinte herda ficheiros fantasma e os validadores pos-build validam terreno mentiroso.');
  process.exit(1);
}

console.log(`✓ dist/ limpo antes do build (${removedFiles} ficheiro(s) removido(s)).`);
