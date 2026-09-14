/**
 * VIGIA DO AR — o repo tem conteudo que o SITE nao tem?
 *
 * PORQUE EXISTE (25/08/2026):
 * Em 22/08 um robo partiu o frontmatter de 6 posts, o build do Astro passou a
 * falhar e o blog ficou **3 dias sem publicar**. Os posts de 23, 24 e 25
 * entraram no repo e nunca chegaram ao ar. Nenhum dos ~80 workflows ficou
 * vermelho por isso: cada um mede o SEU pedaco, e nenhum mede a unica coisa
 * que interessa ao leitor — o que esta publicado.
 *
 * COMO MEDE (deliberadamente do lado de fora):
 * Le o `sitemap-index.xml` do site NO AR e compara com o conteudo do repo. O
 * sitemap e gerado pelo proprio build com o mesmo filtro das paginas
 * (`!data.draft` — ver src/pages/sitemap-index.xml.ts), portanto e a lista
 * exata do que esta publicado. Se o build falhou, ou se a Cloudflare nao
 * publicou, o sitemap fica congelado no passado e o que falta aparece aqui.
 *
 * NAO reconstroi as URLs a partir de regras copiadas do site: compara pelo
 * SLUG (o ultimo pedaco do endereco). Uma regra copiada envelhece e passa a
 * inventar defeito — foi assim que ja nos aconteceu antes. O slug vem do nome
 * do ficheiro, que e a unica coisa que os dois lados partilham de certeza.
 *
 * JANELA DE GRACA: um post commitado ha minutos ainda pode estar a ser
 * montado. So conta como FALHA o que esta no repo ha mais de GRACA_HORAS.
 * Precisa do historico do git (fetch-depth: 0 no workflow) para saber a idade.
 *
 * Uso: node src/scripts/validacao/vigia-do-ar.js
 * Exit 0 = o site tem tudo o que o repo tem (ou so coisas ainda na janela)
 * Exit 1 = ha conteudo publicavel que nao chegou ao ar, ou nao consegui medir
 */

import { readdirSync, readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import matter from 'gray-matter';

const SITE = process.env.VIGIA_SITE || 'https://blog.finmoovi.com';
/**
 * Laudo em JSON para o passo que AVISA (14/09/2026).
 *
 * Este vigia esteve VERMELHO cinco noites seguidas (09 a 13/09), foi a unica
 * corrida vermelha de cada um desses dias, e o blog ficou esse tempo todo sem
 * publicar sem ninguem dar por isso. O alarme tocou; o que faltou foi ele
 * CHEGAR a alguem. Ficar vermelho e contar com o e-mail automatico do GitHub
 * nao chega quando ha dezenas de robos a mandar e-mail.
 *
 * Por isso o vigia passa a deixar por escrito o que viu, e o workflow manda-o
 * por e-mail quando falha. Ficheiro de corrida, nao entra no repo.
 */
const RELATORIO = process.env.VIGIA_RELATORIO || join(process.cwd(), '.vigia-do-ar.json');
/**
 * ENSAIO — corrida de treino do alarme, pedida a mao.
 *
 * Um alarme que nunca foi tocado nao e um alarme: e uma suposicao. Este vigia
 * so fica vermelho quando algo esta partido, o que e o comportamento certo mas
 * significa que o caminho do aviso pode estar avariado durante meses sem se
 * saber — que e, na pratica, a mesma cegueira de 09/09 noutro sitio.
 *
 * Com `VIGIA_ENSAIO=true` o vigia mede a serio, diz o que viu, e depois falha
 * de proposito para o aviso sair. O e-mail vai marcado como ENSAIO, para nunca
 * se confundir com avaria a serio.
 */
const ENSAIO = String(process.env.VIGIA_ENSAIO || '').toLowerCase() === 'true';

/** Grava o laudo. Nunca lanca: falhar a escrever nao pode mascarar o veredito. */
function gravarLaudo(laudo) {
  try {
    writeFileSync(RELATORIO, JSON.stringify({ site: SITE, gracaHoras: GRACA_HORAS, ...laudo }, null, 2), 'utf-8');
  } catch (e) {
    console.log(`   (nao consegui gravar ${RELATORIO}: ${e.message})`);
  }
}
const GRACA_HORAS = Number(process.env.VIGIA_GRACA_HORAS || 6);
// Menos URLs do que isto significa sitemap truncado, pagina de erro ou
// resposta da Cloudflare — nunca um blog com centenas de posts. Medir contra
// um sitemap desses daria "esta tudo em falta" ou "esta tudo bem", os dois
// igualmente inuteis. Preferimos falhar a dizer o que nao sabemos.
const MIN_URLS = 50;

const COLECOES = [
  { dir: join(process.cwd(), 'src', 'content', 'posts'), rota: '/posts/', nome: 'posts' },
  { dir: join(process.cwd(), 'src', 'content', 'glossario'), rota: '/glossario/', nome: 'glossario' },
];

/** Ultimo pedaco do endereco: .../en/posts/en-abc/ -> "en-abc" */
function slugDaUrl(url) {
  const partes = url.replace(/\/+$/, '').split('/');
  return partes[partes.length - 1];
}

/** Quando este ficheiro entrou no repo. null se o historico nao alcanca. */
function nascidoEm(relPath) {
  try {
    const out = execSync(
      `git log --diff-filter=A --format=%cI -1 -- "${relPath}"`,
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
    ).trim();
    return out || null;
  } catch {
    return null;
  }
}

async function lerSitemap() {
  // Quebra-cache: sem isto podemos estar a medir a copia guardada pela
  // Cloudflare em vez do que o visitante recebe agora.
  const url = `${SITE}/sitemap-index.xml?vigia=${Date.now()}`;
  const res = await fetch(url, {
    headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`sitemap respondeu HTTP ${res.status}`);
  const xml = await res.text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  if (urls.length < MIN_URLS) {
    throw new Error(`sitemap com apenas ${urls.length} enderecos (esperado >= ${MIN_URLS}) — resposta suspeita`);
  }
  return urls;
}

async function main() {
  console.log(`🔭 Vigia do ar — o site ${SITE} tem tudo o que o repo tem?\n`);

  let urls;
  try {
    urls = await lerSitemap();
  } catch (err) {
    // Fail-closed: nao conseguir medir NAO e o mesmo que estar tudo bem.
    console.log(`🚫 Nao consegui ler o sitemap do site: ${err.message}`);
    console.log('   O site pode estar fora do ar. Vermelho de proposito.');
    gravarLaudo({ estado: 'sem-sitemap', motivo: err.message, analisados: 0, emFalta: [], aCaminho: [] });
    process.exit(1);
  }

  // slug -> enderecos onde ele aparece
  const noAr = new Map();
  for (const u of urls) {
    const s = slugDaUrl(u);
    if (!noAr.has(s)) noAr.set(s, []);
    noAr.get(s).push(u);
  }
  console.log(`📡 Sitemap lido: ${urls.length} enderecos, ${noAr.size} slugs distintos.\n`);

  const emFalta = [];   // no repo ha tempo, fora do ar => ERRO
  const aCaminho = [];  // entrou agora, ainda dentro da janela => aviso
  const rascunhos = [];
  let analisados = 0;

  const agora = Date.now();

  for (const col of COLECOES) {
    if (!existsSync(col.dir)) continue;
    for (const file of readdirSync(col.dir).filter(f => f.endsWith('.md'))) {
      const caminho = join(col.dir, file);
      const rel = `src/content/${col.nome}/${file}`;

      let data;
      try {
        data = matter(readFileSync(caminho, 'utf-8')).data || {};
      } catch (e) {
        // Frontmatter partido derruba o build inteiro. E exatamente o defeito
        // de 22/08 — nao deixar passar em silencio.
        emFalta.push({ rel, motivo: `frontmatter YAML invalido (${e.message.split('\n')[0]})` });
        analisados++;
        continue;
      }

      analisados++;
      if (data.draft) { rascunhos.push(rel); continue; }

      const slug = file.replace(/\.md$/, '');
      const enderecos = noAr.get(slug) || [];
      // O slug tem de aparecer NUMA rota da sua coleccao — assim uma pagina
      // estatica com nome parecido nunca mascara um post em falta.
      if (enderecos.some(u => u.includes(col.rota))) continue;

      const nasceu = nascidoEm(rel);
      const horas = nasceu ? (agora - new Date(nasceu).getTime()) / 3600000 : null;

      if (horas !== null && horas < GRACA_HORAS) {
        aCaminho.push({ rel, horas });
      } else {
        emFalta.push({
          rel,
          motivo: horas === null
            ? 'fora do ar (idade desconhecida — historico do git raso?)'
            : `fora do ar ha ${Math.floor(horas)}h`,
        });
      }
    }
  }

  if (rascunhos.length > 0) {
    console.log(`📝 Rascunhos (nao devem estar no ar): ${rascunhos.length}\n`);
  }

  if (aCaminho.length > 0) {
    console.log(`⏳ Ainda dentro da janela de ${GRACA_HORAS}h (${aCaminho.length}):`);
    aCaminho.forEach(a => console.log(`   - ${a.rel} (ha ${a.horas.toFixed(1)}h)`));
    console.log('');
  }

  if (emFalta.length > 0) {
    console.log(`❌ NO REPO MAS FORA DO AR (${emFalta.length}):`);
    emFalta.forEach(e => console.log(`   - ${e.rel} — ${e.motivo}`));
    console.log('');
  }

  console.log('📋 Resumo:');
  console.log(`   Ficheiros de conteudo analisados: ${analisados}`);
  console.log(`   Fora do ar: ${emFalta.length}`);
  console.log(`   Dentro da janela: ${aCaminho.length}`);

  // Fail-closed: um vigia que nao viu nada e um vigia desligado em silencio.
  if (analisados === 0) {
    console.log('\n🚫 Nenhum ficheiro de conteudo analisado — o vigia nao correu de verdade.');
    console.log('   Verifique o cwd (esperado: raiz do repo) e src/content/{posts,glossario}.');
    gravarLaudo({ estado: 'nao-mediu', motivo: 'Nenhum ficheiro de conteudo analisado', analisados, emFalta: [], aCaminho: [] });
    process.exit(1);
  }

  if (emFalta.length > 0) {
    console.log('\n🚫 O BLOG NAO ESTA A PUBLICAR TUDO.');
    console.log('   Foi assim que o site ficou 3 dias parado em 22/08/2026 sem ninguem dar por isso.');
    console.log('   Onde olhar: o build do Astro (`npm run build`) e o ultimo deploy na Cloudflare Pages.');
    gravarLaudo({ estado: 'fora-do-ar', analisados, emFalta, aCaminho: aCaminho.map(a => a.rel) });
    process.exit(1);
  }

  console.log('\n✅ Tudo o que o repo tem esta no ar.');

  if (ENSAIO) {
    // Marca o laudo como treino e sai VERDE. O passo do aviso corre na mesma
    // (a condicao dele inclui o ensaio), mas a corrida nao fica vermelha.
    //
    // Porque verde: um ensaio que falha o job deixa marca vermelha no
    // historico e dispara tambem o e-mail automatico do GitHub ("All jobs have
    // failed"), que nao sabe distinguir treino de avaria. Daqui a um mes, a
    // olhar para tras, esse vermelho passaria por uma paragem real — e foi
    // exatamente a leitura do historico que permitiu descobrir a paragem de
    // 09/09. Nao se suja o registo para testar o alarme.
    console.log('\n🧪 ENSAIO pedido a mao: o blog esta BEM.');
    console.log('   A corrida fica VERDE; o aviso por e-mail sai na mesma, marcado como ensaio.');
    gravarLaudo({ estado: 'ok', ensaio: true, analisados, emFalta: [], aCaminho: aCaminho.map(a => a.rel) });
    process.exit(0);
  }

  gravarLaudo({ estado: 'ok', analisados, emFalta: [], aCaminho: aCaminho.map(a => a.rel) });
  process.exit(0);
}

main();
