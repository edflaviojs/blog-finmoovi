/**
 * varrer-capas-com-letras.js — encontra (e opcionalmente refaz) as capas JÁ
 * PUBLICADAS que têm letras escritas ou que estão borradas.
 *
 * PARA QUE SERVE: as travas do `guardiao-da-capa.js` protegem as capas NOVAS. As
 * que já estão no ar entraram antes de existir trava — incluindo as de 18 e
 * 19/08/2026, que foram o motivo de tudo isto. Este script é a limpeza do passado.
 *
 * ⚠️ E O PASSADO É MAIOR DO QUE PARECIA. Medido em 19/08/2026 sobre as primeiras 92
 * imagens: 16 tinham texto de verdade, e várias em posts ANTIGOS — "cashback
 * inteligente" ("Economic"), "cartão de crédito vs débito" ("Cartão die cresitó
 * Cartão's debito"), "economizar no supermercado" ("CCSS"). Ou seja: os dois
 * consertos de 18 e 19/08 explicam a PIORA aguda, mas sempre escapou uma parcela.
 * É a razão da queixa antiga do dono, *"vira e mexe acontece o mesmo problema"*.
 *
 * COMO CORRE: uma vez por dia, sozinho, em lotes pequenos. O dono pediu em 19/08:
 * *"quero atacar todas e corrigir todas, mas com limites generosos diarios... tipo
 * assim 10 por dia no maximo para nao sobrecarregar"*. Daí `--max-correcoes 10`
 * (refazer é o que custa dinheiro e mexe no site) e `--max-medicoes 40` (medir é
 * barato mas gasta cota de visão).
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
 *   node --import tsx .../varrer-capas-com-letras.js                          # relatar
 *   node --import tsx .../varrer-capas-com-letras.js --regerar                # o lote do dia
 *   node --import tsx .../varrer-capas-com-letras.js --max-medicoes 40 --max-correcoes 10
 *   node --import tsx .../varrer-capas-com-letras.js --desde 2026-08-18       # só as recentes
 *   node --import tsx .../varrer-capas-com-letras.js --usar-nitidez           # triagem sem IA
 *
 * O progresso vive em `data/capas-auditadas.json` e é commitado pelo robô. Para
 * remedir tudo de novo (por exemplo se o critério mudar), apagar esse ficheiro.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
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

/**
 * ⚠️ TETO DE MEDIÇÕES — E PORQUE ELE EXISTE.
 *
 * Cada imagem custa uma consulta a uma IA de visão, e a cota gratuita da
 * Cloudflare é de **10.000 neurons por DIA**, partilhada com quem GERA as imagens
 * e com o robô dos textos alternativos.
 *
 * Medido em 19/08/2026: uma varredura de **92 imagens** esgotou a cota do dia
 * («you have used up your daily free allocation of 10,000 neurons»). A varredura
 * seguinte ficou cega e desistiu — e, pior, a trava anti-letras da PRODUÇÃO
 * também ficou cega no resto desse dia. O acervo tem ~744 imagens: não cabe num
 * dia, e nunca caberá.
 *
 * Por isso o teto é de MEDIÇÕES, não de reprovações. `--limit` limitava as
 * reprovadas, o que não protege nada: uma varredura que não encontra nada mede
 * tudo e gasta tudo.
 */
const MAX_MEDICOES = num('--max-medicoes', 80);

/**
 * `--desde AAAA-MM-DD` mede só as imagens commitadas a partir dessa data.
 *
 * É a forma sensata de usar isto: as capas suspeitas são as de 18 e 19/08/2026,
 * umas poucas dezenas, e não as 744 do acervo. Varrer tudo gasta a cota do dia
 * para reexaminar centenas de imagens que nunca deram problema.
 */
const DESDE = (() => {
  const i = args.indexOf('--desde');
  return i >= 0 ? args[i + 1] : null;
})();

/**
 * ⚠️ QUANTAS CAPAS SE REFAZEM POR DIA. Pedido do dono em 19/08/2026, textual:
 * *"quero atacar todas e corrigir todas, mas com limites generosos diarios... tipo
 * assim 10 por dia no maximo para nao sobrecarregar"*.
 *
 * Refazer é a parte que custa dinheiro (~$0.05 por imagem quando cai na Together)
 * e a parte que MEXE no site. Medir é barato e pode ir mais depressa.
 */
const MAX_CORRECOES = num('--max-correcoes', 10);

/**
 * O INVENTÁRIO — a memória de onde a varredura ficou.
 *
 * ⚠️ SEM ISTO O "10 POR DIA" NUNCA ACABA. As imagens são percorridas por ordem
 * alfabética; sem registo do que já foi visto, cada corrida mediria outra vez as
 * mesmas primeiras 40 e as últimas centenas nunca seriam alcançadas. Foi o que
 * aconteceu nas duas primeiras corridas: ambas começaram no mesmo "5-alternativas".
 *
 * Guarda-se o veredito de cada imagem já medida, com a citação que motivou a
 * recusa — serve de auditoria: o dono pode ver POR QUE cada capa foi refeita, o
 * que importa porque a IA de visão já produziu falsos alarmes.
 *
 * Ficheiro único, escrito por um robô só, uma vez por dia — não é o caso dos 60
 * robôs a disputar o mesmo ficheiro que costuma pintar as corridas de vermelho.
 */
const INVENTARIO = join(ROOT, 'data', 'capas-auditadas.json');

function lerInventario() {
  try {
    const j = JSON.parse(readFileSync(INVENTARIO, 'utf8'));
    return { vistas: j.vistas || {}, corrigidas: j.corrigidas || {} };
  } catch {
    return { vistas: {}, corrigidas: {} };
  }
}

/**
 * Grava o inventário.
 *
 * `totalAcervo` e `ultimaCorrida` são gravados para o E-MAIL DAS 7H, que mostra a
 * progressão ao dono e não pode ficar a contar imagens em disco nem a adivinhar se
 * o robô ainda está vivo. Sem `ultimaCorrida` um "10/120" parado durante uma
 * semana leria-se como progresso — é o defeito de `corrida-verde-post-morto-depois`.
 */
function gravarInventario(inv, hoje) {
  try {
    const dir = join(ROOT, 'data');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    inv.totalAcervo = totalDoAcervo();
    inv.ultimaCorrida = hoje;
    writeFileSync(INVENTARIO, JSON.stringify(inv, null, 2));
  } catch (e) {
    console.warn(`   ⚠️ não deu para gravar o inventário: ${e.message}`);
  }
}

/**
 * O PROGRESSO GERAL — é a pergunta que o dono faz, textualmente: *"mas quantas
 * faltam pra gente corrigir?"*. Sai em TODAS as corridas, relatório ou correcção.
 */
function mostrarProgresso(inv) {
  const total = totalDoAcervo();
  const vistas = Object.keys(inv.vistas).length;
  const corrigidas = Object.keys(inv.corrigidas).length;
  const porCorrigir = Object.entries(inv.vistas).filter(([f, v]) => v.reprovada && !inv.corrigidas[f]).length;
  const comProblema = corrigidas + porCorrigir;
  console.log('\n📈 PROGRESSO GERAL');
  console.log(`   medidas: ${vistas} de ${total}  (faltam medir ${total - vistas})`);
  console.log(`   com problema encontrado: ${comProblema}  →  ${corrigidas} já corrigidas, ${porCorrigir} na fila`);
  if (vistas > 0 && vistas < total) {
    // Estimativa marcada como estimativa. Nunca apresentar isto como medida.
    const estimado = Math.round(total * comProblema / vistas);
    console.log(`   ESTIMATIVA para o acervo todo (não é medida): ~${estimado} imagens com problema`);
  }
}

/** Quantas imagens existem no acervo (capas + variantes principais, sem -400/-800). */
function totalDoAcervo() {
  let n = 0;
  for (const col of COLECOES) {
    if (!existsSync(col.imgDir)) continue;
    n += readdirSync(col.imgDir).filter(f => f.endsWith('.webp') && !/-(400|800)\.webp$/.test(f)).length;
  }
  return n;
}

/** Data do último commit de um ficheiro. null quando não se sabe. */
function dataDoCommit(caminhoRelativo) {
  try {
    const out = execSync(`git log -1 --format=%cI -- "${caminhoRelativo}"`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    return out || null;
  } catch {
    return null;
  }
}
// Triagem grosseira só com a régua local. Apanha ilustrações planas boas — usar
// apenas para ver a ordem de grandeza, nunca com --regerar.
const USAR_NITIDEZ = args.includes('--usar-nitidez');
const THROTTLE_MS = num('--pausa', 6000); // gentil com as APIs, como nos outros robôs

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const COLECOES = [
  { destino: 'posts', imgDir: join(ROOT, 'public/images/posts'), imgDirRel: 'public/images/posts', mdDir: join(ROOT, 'src/content/posts'), campo: 'title' },
  { destino: 'glossario', imgDir: join(ROOT, 'public/images/glossario'), imgDirRel: 'public/images/glossario', mdDir: join(ROOT, 'src/content/glossario'), campo: 'term' },
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
  const hoje = new Date().toISOString().slice(0, 10);

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

  const inv = lerInventario();
  const jaVistas = Object.keys(inv.vistas).length;

  /**
   * As reprovadas que ficaram de dias anteriores entram na frente da fila. Sem
   * isto, um dia com 12 reprovadas deixava 2 para trás e o inventário marcava-as
   * como vistas — nunca voltariam a ser medidas nem corrigidas.
   */
  const pendentesDeAntes = Object.entries(inv.vistas)
    .filter(([f, v]) => v && v.reprovada && !inv.corrigidas[f])
    .map(([f]) => f);
  if (pendentesDeAntes.length) {
    console.log(`↩️ ${pendentesDeAntes.length} reprovada(s) de dias anteriores ainda por corrigir — entram primeiro.\n`);
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
  let esgotouTeto = false;
  let saltadasPorData = 0;

  for (const col of COLECOES) {
    if (desistiu || !existsSync(col.imgDir)) continue;
    const porImagem = mapearMd(col.mdDir);

    // Só as capas principais: as variantes -400/-800 são recortes da mesma imagem.
    const ficheiros = readdirSync(col.imgDir)
      .filter(f => f.endsWith('.webp') && !/-(400|800)\.webp$/.test(f))
      .sort();

    for (const f of ficheiros) {
      if (reprovadas.length >= LIMITE) break;
      if (medidas >= MAX_MEDICOES) {
        esgotouTeto = true;
        break;
      }
      const caminho = join(col.imgDir, f);

      // Já medida num dia anterior: não se gasta cota outra vez. Se ficou
      // reprovada e ainda não foi corrigida, é recuperada aqui para a fila.
      if (inv.vistas[f]) {
        if (inv.vistas[f].reprovada && !inv.corrigidas[f]) {
          const usos = porImagem.get(f) || [];
          const titulo = usos.length ? String(usos[0].dados[col.campo] || usos[0].dados.title || f) : f.replace(/\.webp$/, '').replace(/-/g, ' ');
          reprovadas.push({ f, caminho, veredito: { motivo: inv.vistas[f].motivo }, usos, titulo, col });
        }
        continue;
      }

      if (DESDE) {
        const data = dataDoCommit(`${col.imgDirRel}/${f}`);
        // Sem data conhecida, mede — é mais seguro que saltar em silêncio.
        if (data && data < DESDE) {
          saltadasPorData++;
          continue;
        }
      }

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

      // Fica no inventário mesmo quando passa: é isso que faz a varredura AVANÇAR
      // no acervo em vez de remedir sempre as primeiras.
      inv.vistas[f] = {
        reprovada: !veredito.aprovada,
        motivo: veredito.motivo || null,
        em: hoje,
      };

      if (veredito.aprovada) {
        if (verLetras) await sleep(1200); // conta-gotas com a IA de visão
        continue;
      }

      const usos = porImagem.get(f) || [];
      const titulo = usos.length ? String(usos[0].dados[col.campo] || usos[0].dados.title || f) : f.replace(/\.webp$/, '').replace(/-/g, ' ');
      reprovadas.push({ f, caminho, veredito, usos, titulo, col });
      console.log(`❌ ${f}`);
      console.log(`     ${veredito.motivo}`);
      if (verLetras) await sleep(1200); // conta-gotas com a IA de visão
    }
  }

  if (desistiu) {
    console.log(`\n🚨 DESISTI: ${MAX_CEGAS} imagens seguidas não puderam ser VISTAS.`);
    console.log('   As chaves de visão estão presentes mas nenhuma respondeu — normalmente');
    console.log('   cota esgotada (a da Cloudflare é diária; o Groq é repartido por 38 robôs).');
    console.log('   Os avisos acima dizem o motivo exacto de cada fornecedor.');
    console.log('   O inventário NÃO foi gravado e NADA foi tocado. Amanhã continua daqui.');
    console.log('   (Continuar daria "0 reprovadas", que pareceria um atestado de saúde.)');
    process.exitCode = 1;
    return;
  }

  // Só se grava o inventário quando a corrida foi mesmo capaz de VER.
  gravarInventario(inv, hoje);

  console.log(`\n📊 ${medidas} capas medidas — ${reprovadas.length} reprovadas.`);
  if (cegas > 0) {
    console.log(`   ⚠️ ${cegas} não puderam ser vistas (visão sem resposta) — ficaram de fora da conta.`);
  }
  if (saltadasPorData > 0) {
    console.log(`   ⏭️ ${saltadasPorData} saltadas por serem anteriores a ${DESDE}.`);
  }
  // NUNCA calar um teto: um relatório truncado que não diz que foi truncado
  // lê-se como "está tudo visto".
  if (esgotouTeto) {
    console.log(`   ✂️ TETO DE ${MAX_MEDICOES} MEDIÇÕES ATINGIDO — o resto do acervo NÃO foi visto.`);
    console.log('      A cota de visão é diária (10.000 neurons na Cloudflare) e uma varredura');
    console.log('      de 92 imagens esgotou-a em 19/08. Correr por lotes, em dias diferentes,');
    console.log('      ou usar --desde AAAA-MM-DD para medir só as capas suspeitas.');
  }

  if (!REGERAR) {
    if (reprovadas.length) console.log('   Para refazer estas capas: acrescente --regerar.');
    mostrarProgresso(inv);
    return;
  }

  const lote = reprovadas.slice(0, MAX_CORRECOES);
  console.log(`\n🎨 Refazendo ${lote.length} capa(s) — o teto do dia é ${MAX_CORRECOES}.\n`);
  if (reprovadas.length > lote.length) {
    console.log(`   ${reprovadas.length - lote.length} ficam para a próxima corrida (estão marcadas no inventário).\n`);
  }

  let refeitas = 0;
  for (const r of lote) {
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
        // Fica registado O QUE motivou a substituição. É auditoria: a IA de visão
        // já produziu falsos alarmes, e o dono tem de poder ver o motivo de cada
        // capa refeita sem ir ao registo da corrida.
        inv.corrigidas[r.f] = { em: hoje, motivo: r.veredito.motivo || null };
        console.log(`   ✅ ${slug} refeita`);
      }
    } catch (e) {
      console.warn(`   ⚠️ ${slug}: ${e.message}`);
    }
    await sleep(THROTTLE_MS);
  }

  gravarInventario(inv, hoje);

  console.log(`\n✅ ${refeitas} de ${lote.length} capas refeitas neste lote.`);
  if (refeitas > 0) console.log('   O imageAlt das refeitas foi apagado — o robô das 3x/dia redescreve-as.');

  mostrarProgresso(inv);
}

main().catch(e => {
  console.error(`🚨 ${e.message}`);
  process.exit(1);
});
