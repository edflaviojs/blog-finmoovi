/**
 * Internal Linking: adiciona links para o glossário E entre posts
 * Identifica termos do glossário e posts relacionados no texto
 *
 * Uso: node src/scripts/automacoes/internal-linking.js
 * Seguro para re-executar: não duplica links existentes e respeita um TETO
 * total de links internos por documento (posts=8, glossário=6) — execuções
 * repetidas (workflows mensais/sociais) ficam idempotentes no teto.
 */

import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';

const POSTS_DIR = join(process.cwd(), 'src', 'content', 'posts');
const GLOSSARIO_DIR = join(process.cwd(), 'src', 'content', 'glossario');

// URLs internas que contam no teto por documento (inclui variantes /en/ e /es/).
// /contato, links externos e imagens ficam de fora.
export const INTERNAL_URL_RE = /^\/(?:en\/|es\/)?(?:glossario|posts|ferramentas)\//;

// Âncoras genéricas de 1 palavra que NÃO viram link de post — refinadas a partir
// das tags reais dos posts (eram elas que geravam [dinheiro](/posts/cashback-...)).
const GENERIC_POST_ANCHORS = new Set([
  // pt
  'dinheiro', 'gastos', 'riscos', 'conta', 'contas', 'salário', 'economia',
  'banco', 'bancos', 'crédito', 'débito', 'orçamento', 'poupança', 'juros',
  'investimento', 'investimentos', 'cotações', 'moedas', 'viagem', 'viagens',
  'dívida', 'dívidas', 'dólar', 'finanças', 'alternativas', 'finmoovi',
  // en
  // `income` (30/07): mesma classe de `money`/`salary`/`expenses`, e a ausência
  // era um furo real — o post en-building-a-diversified-portfolio-with-r-500 tem
  // "income" nas tags, logo QUALQUER ocorrência da palavra em EN virava link para
  // um artigo sobre carteira diversificada. Já tinha sido injetado em
  // en-income-tax.md, onde a palavra aparece 22 vezes.
  'money', 'expenses', 'risks', 'account', 'accounts', 'salary', 'economy',
  'income', 'bank', 'banks', 'credit', 'debit', 'budget', 'savings', 'investment',
  'investments', 'quotes', 'travel', 'vacation', 'debt', 'debts', 'dollar',
  // es
  'dinero', 'riesgos', 'cuenta', 'cuentas', 'salario', 'economía', 'ahorro',
  'ahorros', 'presupuesto', 'inversión', 'inversiones', 'cotizaciones',
  'viaje', 'viajes', 'deuda', 'deudas', 'finanzas', 'intereses',
]);

// keyword → ferramenta (máx 1 link de ferramenta por documento, prioridade
// sobre glossário/posts). Só PT: /en/ferramentas e /es/ferramentas são apenas
// índice "em breve", sem páginas de calculadora (verificado em src/pages).
const TOOL_LINKS = {
  pt: [
    { url: '/ferramentas/calculadora-juros-compostos', keywords: ['calculadora de juros compostos', 'juros compostos', 'juro composto'] },
    { url: '/ferramentas/calculadora-orcamento', keywords: ['regra 50-30-20', 'regra 50/30/20', 'orçamento 50-30-20', 'método 50-30-20'] },
    { url: '/ferramentas/conversor-moedas', keywords: ['conversor de moedas', 'converter moedas', 'conversão de moedas', 'cotação do dólar'] },
    { url: '/ferramentas/simulador-investimento', keywords: ['simulador de investimento', 'quanto investir por mês', 'aporte mensal', 'aportes mensais'] },
    { url: '/ferramentas/calculadora-reserva', keywords: ['reserva de emergência', 'fundo de emergência', 'colchão financeiro'] },
    { url: '/ferramentas/calculadora-financiamento', keywords: ['tabela sac', 'tabela price', 'sistema price', 'simulação de financiamento'] },
    { url: '/ferramentas/calculadora-aposentadoria', keywords: ['aposentadoria antecipada', 'planejar a aposentadoria', 'quanto preciso para me aposentar', 'independência financeira'] },
  ],
  en: [], // sem calculadoras publicadas em /en/ ainda
  es: [], // sem calculadoras publicadas em /es/ ainda
};

export function parseFrontmatter(content) {
  // Robusto a CRLF (glossário usa \r\n) — antes só reconhecia \n e tratava o
  // arquivo INTEIRO como corpo, injetando links dentro do frontmatter.
  const match = content.match(/^---\r?\n[\s\S]*?\r?\n---/);
  if (!match) return { fm: '', body: content };
  return { fm: match[0], body: content.slice(match[0].length) };
}

export function getGlossaryTerms(locale) {
  const prefix = locale === 'pt' ? '' : `${locale}-`;
  const files = readdirSync(GLOSSARIO_DIR).filter(f => {
    if (!f.endsWith('.md')) return false;
    if (locale === 'pt') return !f.startsWith('en-') && !f.startsWith('es-');
    return f.startsWith(prefix);
  });

  const terms = [];
  for (const file of files) {
    const content = readFileSync(join(GLOSSARIO_DIR, file), 'utf-8');
    const termMatch = content.match(/^term:\s*"?([^"\n]+)"?/m);
    if (termMatch) {
      const slug = file.replace('.md', '');
      const basePath = locale === 'pt' ? '/glossario' : `/${locale}/glossario`;
      terms.push({
        term: termMatch[1].trim(),
        slug,
        url: `${basePath}/${slug}`
      });
    }
  }

  return terms.sort((a, b) => b.term.length - a.term.length);
}

function getPostLinks(locale, excludeSlug) {
  const files = readdirSync(POSTS_DIR).filter(f => {
    if (!f.endsWith('.md')) return false;
    if (locale === 'pt') return !f.startsWith('en-') && !f.startsWith('es-');
    return f.startsWith(`${locale}-`);
  });

  const posts = [];
  for (const file of files) {
    const slug = file.replace('.md', '');
    if (slug === excludeSlug) continue;
    const content = readFileSync(join(POSTS_DIR, file), 'utf-8');
    const titleMatch = content.match(/^title:\s*"?([^"\n]+)"?/m);
    const tagsMatch = content.match(/^tags:\s*\[([^\]]*)\]/m);
    if (titleMatch) {
      const title = titleMatch[1].trim().replace(/\\"/g, '"');
      const tags = tagsMatch ? tagsMatch[1].replace(/"/g, '').split(',').map(t => t.trim()).filter(Boolean) : [];
      // A URL pública usa o slug COMPLETO (com prefixo en-/es-), igual ao que o
      // Astro gera em getStaticPaths (params.slug = nome do arquivo). Não remover
      // o prefixo — isso gerava links /en/posts/<base> que dão 404.
      const basePath = locale === 'pt' ? '' : `/${locale}`;
      posts.push({ title, slug, tags, url: `${basePath}/posts/${slug}` });
    }
  }
  return posts;
}

export function addLinksToBody(body, terms, postLinks, maxGlossaryLinks = 3, maxPostLinks = 2, totalCap = 8, toolLinks = [], allTermNames = null) {
  // BLINDAGEM: mascara imagens e links markdown JÁ existentes (e os recém-inseridos)
  // para que um termo NUNCA case dentro do texto ou da URL de um link — era isso que
  // gerava links aninhados/corrompidos (ex.: `5-[dicas](/posts/...)-para-...`).
  const spans = [];
  const mask = md => { spans.push(md); return `\u0000L${spans.length - 1}\u0000`; };
  // Comentários HTML (ex.: <!-- SCHEMA_AUTO:{...} -->) são mascarados PRIMEIRO:
  // carregam JSON com links markdown dentro de strings e são intocáveis.
  let result = body.replace(/<!--[\s\S]*?-->/g, mask);
  result = result.replace(/!?\[[^\]\n]*\]\([^)\n]*\)/g, mask);
  // Só spans de link markdown contam como "URL existente" (comentários ficam fora)
  const linkSpans = spans.filter(s => s.startsWith('[') || s.startsWith('!['));
  const existingUrls = new Set(linkSpans.map(s => (s.match(/\(([^)]*)\)/) || [])[1]).filter(Boolean));

  // TETO TOTAL por documento: conta os links internos JÁ existentes no corpo
  // (glossário/posts/ferramentas, inclusive /en/ e /es/). Orçamento da execução
  // = teto − existentes; se já está no teto, nada é adicionado (idempotência).
  const existingInternal = linkSpans.filter(s => {
    if (s.startsWith('!')) return false; // imagem
    const url = (s.match(/\(([^)]*)\)/) || [])[1] || '';
    return INTERNAL_URL_RE.test(url);
  }).length;
  let budget = Math.max(0, totalCap - existingInternal);

  let glossaryLinked = 0;
  let postLinked = 0;

  // Nomes dos termos do glossário: âncora igual a nome de termo nunca vira
  // link de POST (o alvo certo é o glossário). allTermNames cobre o caso do
  // glossário, onde `terms` vem sem o próprio termo (anti auto-link) — sem isso
  // a página en-selic.md voltava a ganhar [Selic](/en/posts/...) via tag.
  const termNames = new Set((allTermNames || terms.map(t => t.term)).map(n => n.toLowerCase()));

  // Ferramentas primeiro (prioridade): no máximo 1 link de ferramenta por documento
  let hasToolLink = [...existingUrls].some(u => /^\/(?:en\/|es\/)?ferramentas\//.test(u));
  for (const tool of toolLinks) {
    if (hasToolLink || budget <= 0) break;
    if (existingUrls.has(tool.url)) continue;
    for (const kw of tool.keywords) {
      const escapedKw = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // (?<!#[^\n]*) → nunca linkar dentro de heading (linha que contém '#' antes)
      const regex = new RegExp(`(?<!#[^\\n]*)(?<!\\[)\\b(${escapedKw})\\b(?![\\]\\(])`, 'i');
      const match = result.match(regex);
      if (match) {
        result = result.replace(regex, mask(`[${match[1]}](${tool.url})`));
        existingUrls.add(tool.url);
        hasToolLink = true;
        budget--;
        break;
      }
    }
  }

  // Glossary links first
  for (const { term, url } of terms) {
    if (glossaryLinked >= maxGlossaryLinks || budget <= 0) break;
    if (existingUrls.has(url)) continue;

    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // (?<!#[^\n]*) → nunca linkar dentro de heading. MESMA guarda do caminho de
    // ferramenta acima (l.164). Antes daqui era `(?<![\[#])`, lookbehind de UM
    // caractere: em `## Risks` o caractere anterior é um espaço, logo não
    // protegia nada. Medido em 30/07: 51 ficheiros com um heading que É apenas
    // um link e 227 com link dentro de heading — o padrão dominante era
    // `## [Risks](/en/posts/en-cdb-vs-treasury-selic-...)`. Agravante: a guarda
    // correta só vivia no caminho de ferramenta, e TOOL_LINKS não tem chaves
    // en/es, portanto esse caminho nunca corre em EN/ES.
    const regex = new RegExp(
      `(?<!#[^\\n]*)(?<!\\[)\\b(${escapedTerm})\\b(?![\\]\\(])`,
      'i'
    );

    const match = result.match(regex);
    if (match) {
      result = result.replace(regex, mask(`[${match[1]}](${url})`));
      existingUrls.add(url);
      glossaryLinked++;
      budget--;
    }
  }

  // Cross-post links (match post titles or key phrases from tags)
  for (const post of postLinks) {
    if (postLinked >= maxPostLinks || budget <= 0) break;
    if (existingUrls.has(post.url)) continue;

    // Try to match significant tags (3+ chars) in the body
    // COERÊNCIA DE ÂNCORA: tag igual a nome de termo do glossário não vira link
    // de post (era isso que gerava [Selic](/posts/cotacoes-...)); âncoras
    // genéricas de 1 palavra também não (ex.: [dinheiro](/posts/cashback-...)).
    for (const tag of post.tags.filter(t =>
      t.length >= 5 &&
      !termNames.has(t.toLowerCase()) &&
      !GENERIC_POST_ANCHORS.has(t.toLowerCase())
    )) {
      const escapedTag = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // (?<!#[^\n]*) → nunca linkar dentro de heading (ver nota em l.183).
      const regex = new RegExp(
        `(?<!#[^\\n]*)(?<!\\[)\\b(${escapedTag})\\b(?![\\]\\(])`,
        'i'
      );
      const match = result.match(regex);
      if (match) {
        result = result.replace(regex, mask(`[${match[1]}](${post.url})`));
        existingUrls.add(post.url);
        postLinked++;
        budget--;
        break;
      }
    }
  }

  // Restaura tudo que foi mascarado (links originais + recém-inseridos).
  return result.replace(/\u0000L(\d+)\u0000/g, (m, i) => spans[+i]);
}

function getPostLocale(filename) {
  if (filename.startsWith('en-')) return 'en';
  if (filename.startsWith('es-')) return 'es';
  return 'pt';
}

function main() {
  // Escopo: --glossario (só glossário) | --posts (só posts) | default (ambos).
  const SCOPE = process.argv.includes('--glossario') ? 'glossario'
    : process.argv.includes('--posts') ? 'posts' : 'all';
  console.log(`🔗 Adicionando internal links (escopo: ${SCOPE}) ...\n`);

  const termsByLocale = {
    pt: getGlossaryTerms('pt'),
    en: getGlossaryTerms('en'),
    es: getGlossaryTerms('es')
  };
  console.log(`📚 Termos: PT=${termsByLocale.pt.length}, EN=${termsByLocale.en.length}, ES=${termsByLocale.es.length}`);

  // ── Posts ──
  if (SCOPE !== 'glossario') {
    const postFiles = readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));
    let modified = 0;
    for (const file of postFiles) {
      const filePath = join(POSTS_DIR, file);
      const { fm, body } = parseFrontmatter(readFileSync(filePath, 'utf-8'));
      if (!fm) continue; // sem frontmatter detectado → nunca processar (evita linkar metadados)
      const locale = getPostLocale(file);
      const terms = termsByLocale[locale];
      const postLinks = getPostLinks(locale, file.replace('.md', ''));
      if (!terms || terms.length === 0) continue;
      // Sub-cap de posts = teto: o último loop consegue consumir o orçamento
      // restante numa ÚNICA execução → a execução seguinte é no-op (idempotência).
      const newBody = addLinksToBody(body, terms, postLinks, 6, 8, 8, TOOL_LINKS[locale] || []);
      if (newBody !== body) { writeFileSync(filePath, fm + newBody, 'utf-8'); modified++; console.log(`✅ (post) ${file}`); }
    }
    console.log(`📊 Posts: ${modified} de ${postFiles.length} modificados`);
  }

  // ── Glossário ── (definições curtas: caps menores; linka a OUTROS termos + posts)
  if (SCOPE !== 'posts') {
    const glossFiles = readdirSync(GLOSSARIO_DIR).filter(f => f.endsWith('.md'));
    let gmod = 0;
    for (const file of glossFiles) {
      const filePath = join(GLOSSARIO_DIR, file);
      const { fm, body } = parseFrontmatter(readFileSync(filePath, 'utf-8'));
      if (!fm) continue; // sem frontmatter detectado → nunca processar (evita linkar metadados)
      const locale = getPostLocale(file);
      const slug = file.replace('.md', '');
      const terms = (termsByLocale[locale] || []).filter(t => t.slug !== slug); // não linkar a si mesmo
      const postLinks = getPostLinks(locale, '');
      if (!terms.length && !postLinks.length) continue;
      const allTermNames = (termsByLocale[locale] || []).map(t => t.term);
      const newBody = addLinksToBody(body, terms, postLinks, 4, 6, 6, TOOL_LINKS[locale] || [], allTermNames);
      if (newBody !== body) { writeFileSync(filePath, fm + newBody, 'utf-8'); gmod++; console.log(`✅ (glossário) ${file}`); }
    }
    console.log(`📊 Glossário: ${gmod} de ${glossFiles.length} modificados`);
  }
}

// Só executa quando chamado diretamente (node internal-linking.js) — permite
// importar addLinksToBody em testes sem varrer/escrever os posts.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
