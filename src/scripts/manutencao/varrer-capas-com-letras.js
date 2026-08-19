/**
 * varrer-capas-com-letras.js — encontra (e opcionalmente refaz) as capas JÁ
 * PUBLICADAS que têm letras escritas ou que estão borradas.
 *
 * PARA QUE SERVE: as travas do `guardiao-da-capa.js` protegem as capas NOVAS. As
 * que já estão no ar entraram antes de existir trava — incluindo as de 18 e
 * 19/08/2026, que foram o motivo de tudo isto. Este script é a limpeza do
 * passado; não corre sozinho, corre quando o dono manda.
 *
 * COMO DECIDE — e porque é DIFERENTE da produção:
 * Na produção a régua de nitidez local pode ser usada porque o router SABE que
 * estilo pediu. Aqui não se sabe: uma imagem antiga pode ser uma ilustração plana
 * legítima, e ilustração plana mede o mesmo que borrão (13 contra 14, medido em
 * 19/08/2026 — ver o comentário da régua em guardiao-da-capa.js). Aplicar a régua
 * local aqui mandaria refazer dezenas de imagens boas.
 *
 * Por isso esta varredura julga pela IA DE VISÃO, que distingue as duas coisas:
 *   - letras escritas   → recusa
 *   - imagem inacabada  → recusa
 * Sem `GROQ_API_KEY` não há como julgar, e o script diz-lo e não toca em nada. O
 * `--usar-nitidez` força a régua local, mas só serve para uma triagem grosseira e
 * avisa que vai apanhar ilustrações boas.
 *
 * SEGURANÇA:
 *   - Por omissão só RELATA. Nada é tocado sem `--regerar`.
 *   - Ao refazer, se todos os fornecedores falharem o image-router devolve um SVG
 *     e NÃO toca no .webp antigo → uma capa má nunca é trocada por nada.
 *   - Ao refazer com sucesso, apaga o `imageAlt` dos .md (pt/en/es) que usam a
 *     capa, para o robô `gerar-alt-imagens` (3x/dia) descrever a imagem nova.
 *
 * Uso:
 *   node --import tsx src/scripts/manutencao/varrer-capas-com-letras.js
 *   node --import tsx src/scripts/manutencao/varrer-capas-com-letras.js --limit 40
 *   node --import tsx src/scripts/manutencao/varrer-capas-com-letras.js --so-nitidez
 *   node --import tsx src/scripts/manutencao/varrer-capas-com-letras.js --regerar --limit 10
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';
import { aprovarCapa, olhosDisponiveis, LIMITE_NITIDEZ } from '../lib/guardiao-da-capa.js';
import { generateAIImage } from '../apis/image-router.js';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const num = (bandeira, omissao) => {
  const i = args.indexOf(bandeira);
  return i >= 0 ? (parseInt(args[i + 1], 10) || omissao) : omissao;
};

const LIMITE = num('--limit', Infinity);
const REGERAR = args.includes('--regerar');
// Triagem grosseira só com a régua local. Apanha ilustrações planas boas — usar
// apenas para ver a ordem de grandeza, nunca com --regerar.
const USAR_NITIDEZ = args.includes('--usar-nitidez');
const THROTTLE_MS = num('--pausa', 6000); // gentil com as APIs, como nos outros robôs

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const COLECOES = [
  { destino: 'posts', imgDir: join(ROOT, 'public/images/posts'), mdDir: join(ROOT, 'src/content/posts'), campo: 'title' },
  { destino: 'glossario', imgDir: join(ROOT, 'public/images/glossario'), mdDir: join(ROOT, 'src/content/glossario'), campo: 'term' },
];

/**
 * Liga cada ficheiro de imagem aos .md que o usam, para saber o TÍTULO (o
 * assunto da imagem nova) e onde apagar o `imageAlt`.
 */
function mapearMd(mdDir) {
  const porImagem = new Map();
  if (!existsSync(mdDir)) return porImagem;
  for (const f of readdirSync(mdDir)) {
    if (!f.endsWith('.md')) continue;
    try {
      const { data } = matter(readFileSync(join(mdDir, f), 'utf8'));
      if (!data.image) continue;
      const base = String(data.image).split('/').pop();
      if (!porImagem.has(base)) porImagem.set(base, []);
      porImagem.get(base).push({ ficheiro: join(mdDir, f), dados: data });
    } catch { /* .md ilegível não interessa aqui */ }
  }
  return porImagem;
}

/** Apaga o imageAlt para o robô de acessibilidade redescrever a imagem nova. */
function limparAlt(usos) {
  for (const uso of usos) {
    try {
      const cru = readFileSync(uso.ficheiro, 'utf8');
      const { data, content } = matter(cru);
      if (!data.imageAlt) continue;
      delete data.imageAlt;
      writeFileSync(uso.ficheiro, matter.stringify(content, data));
    } catch { /* não vale derrubar a varredura por causa do alt */ }
  }
}

async function main() {
  const olhos = olhosDisponiveis();
  const verLetras = olhos.length > 0;

  console.log('🔎 Varredura das capas publicadas');
  console.log(`   olhos:   ${verLetras ? olhos.join(' → ') : 'NENHUM'}`);
  console.log(`   régua local de nitidez: ${USAR_NITIDEZ ? `SIM (limite ${LIMITE_NITIDEZ})` : 'não (apanharia ilustrações planas boas)'}`);
  console.log(`   modo:    ${REGERAR ? '⚠️ REGERAR as reprovadas' : 'apenas relatar (use --regerar para refazer)'}\n`);

  if (!verLetras && !USAR_NITIDEZ) {
    console.log('❌ Sem IA de visão não há como julgar estas imagens sem apanhar as boas.');
    console.log('   Defina GROQ_API_KEY (é a chave que os outros robôs de visão usam),');
    console.log('   ou corra com --usar-nitidez para uma triagem grosseira SEM regerar.');
    console.log('   Nada foi tocado.');
    return;
  }
  if (USAR_NITIDEZ && REGERAR) {
    console.log('❌ --usar-nitidez com --regerar não: a régua local reprova ilustrações');
    console.log('   planas que estão boas, e isso mandaria refazê-las. Nada foi tocado.');
    return;
  }
  if (USAR_NITIDEZ) {
    console.log('⚠️ Triagem grosseira: a régua local não distingue ilustração plana de');
    console.log('   borrão, portanto ESPERE falsos positivos nesta lista.\n');
  }

  const reprovadas = [];
  let medidas = 0;
  /**
   * ⚠️ CONTA AS MEDIÇÕES CEGAS E DESISTE.
   *
   * Ter chave NÃO é ter resposta. Na primeira corrida real desta varredura
   * (19/08/2026, corrida 32255952993) as duas chaves de visão estavam presentes
   * mas nenhuma respondia — o Groq com HTTP 429 e a Cloudflare com um formato de
   * resposta que o código não sabia ler. A varredura ia percorrer as 744 imagens
   * sem ver nenhuma e terminar a dizer **"0 reprovadas"**, que é o pior resultado
   * possível: parece um atestado de saúde e não é nada.
   *
   * É a lição de `corrida-verde-post-morto-depois`: verde sem prova não é verde.
   */
  let cegas = 0;
  const MAX_CEGAS = 5;
  let desistiu = false;

  for (const col of COLECOES) {
    if (desistiu || !existsSync(col.imgDir)) continue;
    const porImagem = mapearMd(col.mdDir);

    // Só as capas principais: as variantes -400/-800 são recortes da mesma imagem.
    const ficheiros = readdirSync(col.imgDir)
      .filter(f => f.endsWith('.webp') && !/-(400|800)\.webp$/.test(f))
      .sort();

    for (const f of ficheiros) {
      if (reprovadas.length >= LIMITE) break;
      const caminho = join(col.imgDir, f);
      let veredito;
      try {
        veredito = await aprovarCapa(readFileSync(caminho), { verLetras, exigirNitidez: USAR_NITIDEZ });
      } catch (e) {
        console.warn(`   ⚠️ não deu para medir ${f}: ${e.message}`);
        continue;
      }
      medidas++;

      // Cega = a IA de visão não respondeu. Sem ela, "aprovada" não quer dizer
      // nada, portanto não se conta como medição válida nem se segue em frente.
      if (verLetras && veredito.cega) {
        cegas++;
        if (cegas >= MAX_CEGAS) {
          desistiu = true;
          break;
        }
        continue;
      }

      if (veredito.aprovada) continue;

      const usos = porImagem.get(f) || [];
      const titulo = usos.length ? String(usos[0].dados[col.campo] || usos[0].dados.title || f) : f.replace(/\.webp$/, '').replace(/-/g, ' ');
      reprovadas.push({ f, caminho, veredito, usos, titulo, col });
      console.log(`❌ ${f}`);
      console.log(`     ${veredito.motivo}`);
      if (verLetras) await sleep(1500); // conta-gotas com a IA de visão
    }
  }

  if (desistiu) {
    console.log(`\n🚨 DESISTI: as primeiras ${MAX_CEGAS} imagens não puderam ser VISTAS.`);
    console.log('   As chaves de visão estão presentes mas nenhuma respondeu — normalmente');
    console.log('   cota do Groq esgotada (HTTP 429, ele é repartido por 38 robôs).');
    console.log('   Os avisos acima dizem o motivo exacto de cada fornecedor.');
    console.log('   NADA foi medido e NADA foi tocado. Tente mais tarde.');
    console.log('   (Continuar daria "0 reprovadas", que pareceria um atestado de saúde.)');
    process.exitCode = 1;
    return;
  }

  console.log(`\n📊 ${medidas} capas medidas — ${reprovadas.length} reprovadas.`);
  if (cegas > 0) {
    console.log(`   ⚠️ ${cegas} não puderam ser vistas (visão sem resposta) — ficaram de fora da conta.`);
  }

  if (!REGERAR) {
    if (reprovadas.length) console.log('   Para refazer estas capas: acrescente --regerar (comece com --limit 10).');
    return;
  }

  console.log('\n🎨 Refazendo as reprovadas...\n');
  let refeitas = 0;
  for (const r of reprovadas) {
    const slug = r.f.replace(/\.webp$/, '');
    const tipo = r.col.destino === 'glossario' ? 'glossary' : 'cover';
    try {
      const nova = await generateAIImage(r.titulo, slug, r.col.destino, tipo);
      // O image-router devolve .svg quando TODOS os fornecedores falharam ou
      // foram recusados — nesse caso o .webp antigo ficou intacto de propósito.
      if (nova.endsWith('.svg')) {
        console.log(`   ⏭️ ${slug}: nenhum fornecedor deu capa aprovada — a antiga fica, tenta-se noutro lote`);
      } else {
        refeitas++;
        limparAlt(r.usos);
        console.log(`   ✅ ${slug} refeita`);
      }
    } catch (e) {
      console.warn(`   ⚠️ ${slug}: ${e.message}`);
    }
    await sleep(THROTTLE_MS);
  }

  console.log(`\n✅ ${refeitas} de ${reprovadas.length} capas refeitas.`);
  if (refeitas > 0) console.log('   O imageAlt das refeitas foi apagado — o robô das 3x/dia redescreve-as.');
}

main().catch(e => {
  console.error(`🚨 ${e.message}`);
  process.exit(1);
});
