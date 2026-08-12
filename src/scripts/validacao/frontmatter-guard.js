/**
 * O GUARDA DO CABEÇALHO — 12/08/2026.
 *
 * ═══ 🔴 O DIA QUE ISTO CUSTOU ═══
 * O robô de i18n corre todos os dias e adapta ~20 ficheiros. Em 12/08 às 10:03 ele
 * escreveu isto no cabeçalho de `en-save-on-your-market-bill.md`:
 *
 *   description: "Practical tips to reduce semi-annual expenses by up to "00 and …"
 *
 * Era `R$ 1,000.00` e devia ter ficado `$200` — o modelo estava a converter a moeda
 * (no corpo do mesmo ficheiro fez `R$ 50,00 → $10` e `R$ 2.600 → $520`). O que saiu foi
 * **uma aspa solta**, que fecha a linha a meio e parte o YAML.
 *
 * ⚠️ **E NINGUÉM DEU POR NADA.** A corrida do robô acabou a VERDE e empurrou. Quem
 * começou a cair foram os OUTROS: o gerador de ALT das imagens falhou às 10:06 e às
 * 11:47, três minutos e duas horas depois, com um erro que aponta para o `js-yaml` e
 * não diz o nome do ficheiro. **O defeito estava a um sítio de distância de onde doía.**
 *
 * ⚠️ **E o pior estava por vir:** um cabeçalho que não lê parte a construção do site
 * inteiro — e um build vermelho faz o blog **parar de publicar em silêncio** (é a lição
 * de 06/08, do link inventado).
 *
 * ═══ POR QUE REPARA EM VEZ DE REPROVAR ═══
 * É a mesma decisão do `link-guard`, que corre no mesmo sítio deste robô: reprovar aqui
 * deitava fora o trabalho de IA dos vinte ficheiros da tanda por causa de um. O objetivo
 * é que **nada partido seja empurrado** — não castigar a corrida.
 *
 * O ficheiro partido volta à versão que estava no repositório. O robô adapta-o outra vez
 * amanhã; o blog nunca chega a ver o cabeçalho partido.
 *
 * Uso:
 *   node src/scripts/validacao/frontmatter-guard.js
 *   node src/scripts/validacao/frontmatter-guard.js --so-conferir   (não repara, só diz)
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import matter from 'gray-matter';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

/** Onde vive o conteúdo com cabeçalho. */
export const PASTAS = ['src/content/posts', 'src/content/glossario'];

/**
 * Os ficheiros cujo cabeçalho não lê.
 *
 * ⚠️ **Usa o MESMO leitor que o site e os robôs usam** (`gray-matter`), e não um leitor
 * próprio. Um guarda que lesse o YAML à sua maneira aprovaria coisas que o site recusa —
 * e é exactamente esse o defeito que ele existe para apanhar.
 *
 * @returns {{caminho: string, erro: string}[]}
 */
export function cabecalhosPartidos(raiz = RAIZ, pastas = PASTAS) {
  const partidos = [];
  for (const pasta of pastas) {
    const dir = join(raiz, pasta);
    if (!existsSync(dir)) continue;
    for (const nome of readdirSync(dir).filter((f) => f.endsWith('.md'))) {
      const caminho = `${pasta}/${nome}`;
      try {
        matter(readFileSync(join(dir, nome), 'utf-8'));
      } catch (err) {
        partidos.push({ caminho, erro: String(err.message).split('\n')[0] });
      }
    }
  }
  return partidos;
}

const args = new Set(process.argv.slice(2));
const chamadoPeloNome = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('frontmatter-guard.js');

/**
 * 🔴 **ESTE GUARDA SÓ FUNCIONA ANTES DO COMMIT, E ELE PRÓPRIO O CONFERE.**
 *
 * Ele repara devolvendo o ficheiro à **versão do repositório**. Se corresse DEPOIS de o
 * robô ter commitado, a versão do repositório seria a partida — e o guarda "repararia" o
 * ficheiro para o estado errado, em silêncio, com ar de estar a trabalhar.
 *
 * ⚠️ **Isto não é teoria: foi o que aconteceu no teste.** Com o commit mau já feito, o
 * `git checkout --` devolveu o cabeçalho partido.
 *
 * A casa já tem esta forma de prova — em `fotos-longo.js` há uma que compara a posição da
 * verificação com a do pedido pago, para a guarda não voltar para depois de se pagar.
 *
 * @returns {string|null} a queixa, ou `null` se o sítio está certo.
 */
export function conferirOSitio(texto) {
  const guarda = texto.indexOf('frontmatter-guard.js');
  const commit = texto.indexOf('- name: Commit fixes');
  if (guarda === -1) return 'o passo do guarda desapareceu do robô de i18n — nada confere os cabeçalhos.';
  if (commit === -1) return null; // o robô mudou de forma; não se inventa uma queixa.
  if (guarda > commit) {
    return 'o guarda do cabeçalho está DEPOIS do commit. Ele devolve o ficheiro à versão do'
      + ' repositório — e depois do commit essa versão é a PARTIDA. Ponha-o antes.';
  }
  return null;
}

if (chamadoPeloNome) {
  const workflow = join(RAIZ, '.github', 'workflows', 'fix-i18n-content-daily.yml');
  if (existsSync(workflow)) {
    const queixa = conferirOSitio(readFileSync(workflow, 'utf-8'));
    if (queixa) {
      console.log(`\n🔴 ${queixa}`);
      console.log(`::error::${queixa}`);
      process.exit(1);
    }
  }

  const partidos = cabecalhosPartidos();
  console.log(`\n🧾 O guarda do cabeçalho — ${partidos.length} ficheiro(s) que o site não conseguiria ler.`);

  if (!partidos.length) {
    console.log('   todos os cabeçalhos leem. ✅');
    process.exit(0);
  }

  for (const p of partidos) {
    console.log(`\n   🔴 ${p.caminho}`);
    console.log(`      ${p.erro}`);
    if (args.has('--so-conferir')) continue;
    try {
      /**
       * ⚠️ **`git checkout --` devolve o ficheiro à versão do repositório.** É o mesmo
       * gesto do `link-guard`, e é seguro aqui por uma razão precisa: este robô ADAPTA
       * ficheiros que já existem, nunca cria. O que se perde é a adaptação de hoje
       * daquele ficheiro — que ele refaz amanhã.
       */
      execFileSync('git', ['checkout', '--', p.caminho], { cwd: RAIZ, stdio: 'pipe' });
      console.log('      ⛑️  devolvido à versão do repositório — o blog não vê o cabeçalho partido.');
      console.log(`::warning::o cabeçalho de ${p.caminho} saiu partido da IA e foi desfeito. O robô adapta-o outra vez amanhã.`);
    } catch (err) {
      /**
       * ⚠️ Só cá chega um ficheiro que NÃO está no repositório — e este robô não cria
       * ficheiros. Se acontecer, é outra coisa a correr mal: grita-se e deixa-se para
       * uma pessoa ver, porque apagar conteúdo que ninguém leu é pior do que avisar.
       */
      console.log(`      ❌ não deu para desfazer: ${err.message.split('\n')[0]}`);
      console.log(`::error::${p.caminho} tem o cabeçalho partido e NÃO está no repositório — o site não vai construir. VEJA ESTE FICHEIRO.`);
    }
  }

  /**
   * ⚠️ **SAI A ZERO de propósito** (a não ser em `--so-conferir`). Ficar vermelho aqui
   * deitava fora a tanda inteira — e a reparação já está feita. É a mesma escolha do
   * `link-guard`, escrita no workflow ao lado deste passo.
   */
  process.exit(args.has('--so-conferir') ? 1 : 0);
}
