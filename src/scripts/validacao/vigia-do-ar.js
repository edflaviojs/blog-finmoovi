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

import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import matter from 'gray-matter';

const SITE = process.env.VIGIA_SITE || 'https://blog.finmoovi.com';
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
    process.exit(1);
  }

  if (emFalta.length > 0) {
    console.log('\n🚫 O BLOG NAO ESTA A PUBLICAR TUDO.');
    console.log('   Foi assim que o site ficou 3 dias parado em 22/08/2026 sem ninguem dar por isso.');
    console.log('   Onde olhar: o build do Astro (`npm run build`) e o ultimo deploy na Cloudflare Pages.');
    process.exit(1);
  }

  console.log('\n✅ Tudo o que o repo tem esta no ar.');
  process.exit(0);
}

main();
