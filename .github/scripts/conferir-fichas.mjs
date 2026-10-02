#!/usr/bin/env node
/**
 * A FICHA DO TEXTO ESTÁ DE PÉ? — conferência antes de empurrar (02/10/2026).
 *
 * ═══ PORQUE EXISTE ═══
 * Dois dos três apagões do blog foram a MESMA avaria: a ficha no topo de um
 * ficheiro `.md` (o bloco entre `---`) saiu torta, e o `astro build` morre
 * ANTES de gerar uma única página. O Cloudflare não publica nada — nem o
 * ficheiro estragado, nem os outros novecentos.
 *
 *   22/08/2026 — 3 dias parado: linha DOBRADA na ficha.
 *   01/10/2026 — 16 horas parado: `updatedAt` escrito DUAS vezes, por dois
 *                robôs que gravam a mesma linha em formatos diferentes.
 *
 * Nos dois casos o robô empurrou alegremente e ninguém soube até o vigia
 * mandar e-mail — de madrugada, horas depois.
 *
 * ═══ O QUE FAZ ═══
 * Corre dentro do `empurrar.sh`, por onde passam 61 dos 84 robôs. Lê SÓ os
 * `.md` de `src/content` que vão nesta leva e tenta abrir a ficha de cada um
 * com o MESMO leitor que o build usa (gray-matter). Se um não abrir, devolve
 * erro e o empurrão não acontece.
 *
 * ═══ A ESCOLHA QUE ISTO FAZ, DITA COM TODAS AS LETRAS ═══
 * Travar o empurrão faz a corrida ficar VERMELHA e o texto daquele robô
 * perde-se — a máquina do GitHub é descartável. É de propósito: o robô volta a
 * correr e escreve outra vez; o blog parado uma noite inteira não se recupera.
 * Perder um texto é mais barato que parar o site todo.
 *
 * ⚠️ Por isso a regra é DELIBERADAMENTE estreita: só reprova o que o leitor do
 * build também reprovaria. Nada de palpites sobre conteúdo — um falso alarme
 * aqui tranca os 61 robôs de uma vez.
 *
 * Uso:  node .github/scripts/conferir-fichas.mjs [ramo]
 * Saída: 0 = pode empurrar · 1 = há ficha torta (não empurrar)
 */

import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';
import { createRequire } from 'module';

const ramo = process.argv[2] || process.env.GITHUB_REF_NAME || 'main';

// stderr calado: quando um alcance não existe nesta máquina o git grita
// «fatal: bad revision», e isso no log de 61 robôs parece avaria quando é
// apenas a tentativa seguinte a entrar.
const git = (...args) =>
  execFileSync('git', args, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] });

/**
 * Os ficheiros desta leva. Se o alcance não der para calcular (checkout raso,
 * ramo novo, sem `origin/`), varre-se src/content INTEIRO em vez de desistir:
 * varrer a mais é lento de mais nada, desistir em silêncio é como os apagões
 * passaram despercebidos.
 */
function ficheirosParaConferir() {
  const alcances = [`origin/${ramo}..HEAD`, 'HEAD~1..HEAD'];
  for (const alcance of alcances) {
    try {
      const saida = git('diff', '--name-only', '--diff-filter=ACMR', alcance, '--', 'src/content');
      return { modo: alcance, lista: saida.split('\n').map(s => s.trim()).filter(f => f.endsWith('.md')) };
    } catch {
      // alcance inválido nesta máquina — tenta o seguinte
    }
  }
  const todos = git('ls-files', 'src/content').split('\n').map(s => s.trim()).filter(f => f.endsWith('.md'));
  return { modo: 'tudo (não deu para calcular a leva)', lista: todos };
}

/** O leitor do build. Sem ele não se inventa um substituto — diz-se. */
function carregarLeitor() {
  try {
    return createRequire(import.meta.url)('gray-matter');
  } catch {
    return null;
  }
}

const { modo, lista } = ficheirosParaConferir();

if (lista.length === 0) {
  process.exit(0); // nada de conteúdo nesta leva — o caso mais comum
}

const leitor = carregarLeitor();
if (!leitor) {
  // Acontece nos robôs que não instalam dependências. Hoje nenhum deles mexe em
  // src/content, por isso este ramo não devia correr nunca — se correr, é aviso
  // barulhento e NÃO tranca: trancar às cegas custa mais que deixar passar.
  console.log(`::warning::conferência das fichas SALTADA — o leitor (gray-matter) não está instalado nesta corrida, e ${lista.length} ficheiro(s) de conteúdo vão sem conferir.`);
  process.exit(0);
}

const tortos = [];
for (const ficheiro of lista) {
  let bruto;
  try {
    bruto = readFileSync(ficheiro, 'utf-8');
  } catch {
    continue; // apagado ou movido entretanto — não é problema de ficha
  }
  try {
    leitor(bruto);
  } catch (erro) {
    tortos.push({ ficheiro, porque: String(erro.message || erro).split('\n')[0] });
  }
}

if (tortos.length === 0) {
  console.log(`✅ fichas OK — ${lista.length} ficheiro(s) conferido(s) [${modo}].`);
  process.exit(0);
}

console.log('');
console.log(`❌ ${tortos.length} ficha(s) tortas — o empurrão foi travado DE PROPÓSITO.`);
console.log('   Se isto fosse para o ar, o build do blog morria e o Cloudflare parava de');
console.log('   publicar o site inteiro, não só estes ficheiros.');
console.log('');
for (const t of tortos) {
  console.log(`   • ${t.ficheiro}`);
  console.log(`     ${t.porque}`);
  console.log(`::error file=${t.ficheiro}::ficha ilegível — ${t.porque}`);
}
console.log('');
console.log('   O que costuma ser: a mesma linha escrita duas vezes (dois robôs a gravar');
console.log('   o mesmo campo em formatos diferentes), ou uma linha dobrada.');
process.exit(1);
