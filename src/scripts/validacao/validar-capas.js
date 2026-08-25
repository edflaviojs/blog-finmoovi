/**
 * Validador de Capas (imagens de posts e glossário)
 * TRAVA DE SEGURANÇA opcional: só bloqueia o push se CAPA_GUARD_BLOCKING=1.
 *
 * Verifica, para cada peça de conteúdo (posts + glossário):
 * 1. Campo `image:` presente e não vazio
 * 2. Caminho local (começa com `/`) — URLs externas (http/https) são ERRO
 * 3. Caminho local começa com `/images/` — fora disso é ERRO
 * 4. O ficheiro referenciado REALMENTE existe em `public<caminho>` (existsSync,
 *    nunca inspeção do conteúdo da string. Testar a string era o defeito do
 *    antigo gerar-imagens-ia.js, órfão e apagado em 28/07/2026: ele dava
 *    "todos os posts já têm imagem" para os 3 posts com capa 404)
 * 5. Para capas .webp, se faltar a variante -400 ou -800, gera AVISO
 *    (variantes só existem/fazem sentido para .webp — ver imgSrcset() em
 *    src/utils/responsive-image.ts)
 *
 * Uso: node src/scripts/validacao/validar-capas.js
 * Modo bloqueante: CAPA_GUARD_BLOCKING=1 node src/scripts/validacao/validar-capas.js
 * Exit 0 = sem erros, ou erros mas modo não-bloqueante
 * Exit 1 = há erros E CAPA_GUARD_BLOCKING=1
 */

import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';

const POSTS_DIR = join(process.cwd(), 'src', 'content', 'posts');
const GLOSSARIO_DIR = join(process.cwd(), 'src', 'content', 'glossario');
const PUBLIC_DIR = join(process.cwd(), 'public');

const BLOCKING = process.env.CAPA_GUARD_BLOCKING === '1';

// YAML de verdade (gray-matter), nao leitura linha-a-linha.
//
// O parser caseiro anterior partia cada linha no primeiro ':' e ficava com o
// que sobrava. Isso le mal QUALQUER escalar em bloco do YAML:
//
//     image: >-
//       /images/posts/nome-muito-comprido.webp
//
// Ele guardava image = ">-" e o guard acusava "caminho fora de /images/".
// Medido em 25/08/2026: 15 posts reprovados, 15 capas presentes no disco —
// 15 falsos alarmes, o robo vermelho desde 22/08. O gerador comecou a dobrar
// a linha porque o caminho passou dos 80 caracteres, e a dobra e YAML valido.
//
// gray-matter e o mesmo caminho que o Astro usa para ler o conteudo, logo o
// guard passa a ver EXATAMENTE o que o site ve.
function parseFrontmatter(content) {
  return matter(content).data || {};
}

function main() {
  console.log('🔍 Validando capas (posts + glossário)...\n');

  const errors = [];
  const warnings = {
    campoAusente: [],
    svg: [],
    varianteFaltando: [],
  };

  let totalFiles = 0;

  for (const [dir, label] of [[POSTS_DIR, 'posts'], [GLOSSARIO_DIR, 'glossario']]) {
    if (!existsSync(dir)) continue;
    const files = readdirSync(dir).filter(f => f.endsWith('.md'));

    for (const file of files) {
      totalFiles++;
      const relPath = `${label}/${file}`;
      const content = readFileSync(join(dir, file), 'utf-8');

      // YAML partido e ERRO listado, nunca um crash: um throw aqui mataria a
      // varredura no meio e o relatorio sairia sem os ficheiros seguintes.
      let fm;
      try {
        fm = parseFrontmatter(content);
      } catch (err) {
        errors.push(`❌ frontmatter YAML inválido: ${relPath} — ${err.message.split('\n')[0]}`);
        continue;
      }

      const image = fm.image;

      // Campo ausente: AVISO
      if (image === undefined || image === null) {
        warnings.campoAusente.push(relPath);
        continue;
      }

      // YAML tipa sozinho: image sem aspas pode vir numero, data ou lista.
      // Nao e caminho nenhum — ERRO, e nunca deixar rebentar no .trim().
      if (typeof image !== 'string') {
        errors.push(`❌ image não é texto: ${relPath} — image: "${String(image)}"`);
        continue;
      }

      // Campo presente mas vazio: ERRO
      if (image.trim() === '') {
        errors.push(`❌ image vazio: ${relPath}`);
        continue;
      }

      // URL externa: ERRO
      if (/^https?:\/\//i.test(image)) {
        errors.push(`❌ URL externa não permitida: ${relPath} — image: "${image}"`);
        continue;
      }

      // Caminho local que não começa com /images/: ERRO
      if (!image.startsWith('/images/')) {
        errors.push(`❌ caminho fora de /images/: ${relPath} — image: "${image}"`);
        continue;
      }

      // Ficheiro precisa existir de fato em public<caminho>
      const fullPath = join(PUBLIC_DIR, image);
      if (!existsSync(fullPath)) {
        errors.push(`❌ ficheiro não encontrado: ${relPath} — image: "${image}"`);
        continue;
      }

      const ext = image.toLowerCase().split('.').pop();

      if (ext === 'svg') {
        warnings.svg.push(relPath);
      }

      if (ext === 'webp') {
        const base = image.replace(/\.webp$/i, '');
        const missing = [];
        for (const w of [400, 800]) {
          if (!existsSync(join(PUBLIC_DIR, `${base}-${w}.webp`))) missing.push(`${w}`);
        }
        if (missing.length > 0) {
          warnings.varianteFaltando.push(`${relPath} — faltam variantes: ${missing.join(', ')}`);
        }
      }

      // .jpg / .png: legado, sem dano — IGNORAR
    }
  }

  // Report
  console.log(`📊 Ficheiros analisados: ${totalFiles}\n`);

  if (warnings.campoAusente.length > 0) {
    console.log(`⚠️  Campo image ausente (${warnings.campoAusente.length}):`);
    warnings.campoAusente.forEach(w => console.log(`   - ${w}`));
    console.log('');
  }

  if (warnings.svg.length > 0) {
    console.log(`⚠️  Capas .svg (${warnings.svg.length}):`);
    warnings.svg.forEach(w => console.log(`   - ${w}`));
    console.log('');
  }

  if (warnings.varianteFaltando.length > 0) {
    console.log(`⚠️  Variantes -400/-800 faltando (${warnings.varianteFaltando.length}):`);
    warnings.varianteFaltando.forEach(w => console.log(`   - ${w}`));
    console.log('');
  }

  if (errors.length > 0) {
    console.log(`❌ ERROS (${errors.length}):`);
    errors.forEach(e => console.log(e));
    console.log('');
  }

  const totalAvisos = warnings.campoAusente.length + warnings.svg.length + warnings.varianteFaltando.length;
  console.log('📋 Resumo:');
  console.log(`   Ficheiros analisados: ${totalFiles}`);
  console.log(`   Erros: ${errors.length}`);
  console.log(`   Avisos: ${totalAvisos} (campo ausente: ${warnings.campoAusente.length}, svg: ${warnings.svg.length}, variante faltando: ${warnings.varianteFaltando.length})`);

  // Fail-closed: guard que nao encontra nada e um guard desligado em silencio.
  // Sem isto, um cwd errado ou checkout parcial daria "✅ OK" com 0 cobertura.
  if (totalFiles === 0) {
    console.log('\n🚫 Nenhum ficheiro de conteudo analisado — o guard nao correu de verdade.');
    console.log('   Verifique o cwd (esperado: raiz do repo) e a existencia de src/content/{posts,glossario}.');
    process.exit(1);
  }

  if (errors.length > 0 && BLOCKING) {
    console.log('\n🚫 Validação FALHOU — modo bloqueante ativo (CAPA_GUARD_BLOCKING=1).');
    process.exit(1);
  }

  if (errors.length > 0) {
    console.log('\n⚠️  Há erros, mas modo bloqueante está desligado — não bloqueando.');
    process.exit(0);
  }

  console.log('\n✅ Validação de capas OK!');
  process.exit(0);
}

main();
