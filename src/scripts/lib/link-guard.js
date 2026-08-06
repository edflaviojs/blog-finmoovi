/**
 * link-guard.js — guarda anti-link-inventado para conteudo gerado por LLM.
 *
 * PROBLEMA (incidente de 05/08/2026, blog parado ~20h sem ninguem notar):
 * o prompt partilhado (translation-prompt.js) manda, na regra 2, trocar o nome
 * visivel de produtos brasileiros pelo equivalente internacional
 * ("Selic" -> "tasa base del banco central", "Tesouro Direto" -> "bonos del
 * gobierno"). O modelo troca o TEXTO do link e, a seguir, reescreve tambem a
 * URL para combinar com o texto novo — inventando um slug que nao existe:
 *
 *   antes:  [Selic](/es/glossario/es-selic)                    <- destino real
 *   depois: [bonos del gobierno](/es/glossario/es-bonos-gobierno)  <- inventado
 *
 * A regra 6 do mesmo prompt promete que "internal link URLs will be updated
 * separately". Nao ha nenhum passo que faca isso: a promessa era falsa.
 *
 * POR QUE DOI TANTO: o `npm run build` termina em validate-internal-links, que
 * reprova destino inexistente. O Cloudflare Pages roda o mesmo comando — logo
 * um link inventado = build vermelho = o blog PARA de publicar, em silencio,
 * enquanto os 27 robos continuam a fazer push como se estivesse tudo bem.
 *
 * A CORRECAO E CODIGO, NAO PROMPT: "o destino existe?" e verdade verificavel
 * (ver [[verdade-versus-gosto]] e [[prompt-versus-validador]] — o prompt costuma
 * ordenar o que o validador pune). Este modulo mede, nao pede.
 *
 * Modulo PURO no nucleo (deterministico, sem rede, nunca lanca):
 *   - fixInternalLinks(text, destinos): desembrulha o link cujo destino nao
 *     existe, PRESERVANDO o texto visivel. Nunca inventa destino novo.
 *   - carregarDestinos(root): le src/content e devolve o conjunto de URLs reais.
 *
 * Mesmo estilo/module-system (ESM) de year-guard.js, fact-guard.js e seo-guard.js.
 */

import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Links markdown com destino interno (comeca por "/").
 * O `(?<!!)` exclui imagens `![alt](/images/...)`: ali o "link" e a imagem e
 * desembrulhar destruiria o conteudo.
 */
const LINK_RE = /(?<!!)\[([^\]\n]*)\]\((\/[^)\s]*)\)/g;

/**
 * So policiamos o que sabemos enumerar com CERTEZA: posts e glossario, nos tres
 * idiomas. Sao colecoes de conteudo — um ficheiro por URL, sem excecao.
 * Qualquer outro link interno (/ferramentas/*, /categorias/*, /app, ancoras...)
 * fica INTACTO: dessas nao temos lista fechada aqui, e uma guarda que adivinha
 * e pior do que guarda nenhuma. Essas continuam cobertas pelo
 * validate-internal-links.js no fim do build.
 */
const POLICIADO_RE = /^(?:\/(?:en|es))?\/(?:posts|glossario)\/[^/]+\/?$/;

/**
 * Reduz o href ao CAMINHO comparavel: corta ancora/query e a barra final.
 * A ancora importa: `/glossario/pix#exemplos` e um link VALIDO, e comparar a
 * string inteira nao acharia destino e desfaria um link bom. Comparamos a base
 * (`/glossario/pix`); se a base nao existir, ai sim o link foi inventado.
 * (O `_redirects` e o sitemap servem COM barra final — daqui sai sempre SEM.)
 */
function caminhoBase(href) {
  const semAncora = href.split(/[#?]/)[0];
  return semAncora.length > 1 && semAncora.endsWith('/') ? semAncora.slice(0, -1) : semAncora;
}

/**
 * Desembrulha links internos de posts/glossario cujo destino nao existe.
 *
 * Deterministico, sem rede, nunca lanca: em qualquer erro devolve o texto
 * original com changed=false.
 *
 * @param {string} text        Corpo markdown a verificar.
 * @param {Set<string>} destinos Conjunto de URLs reais (ver carregarDestinos).
 * @returns {{text:string, changed:boolean, desembrulhados:Array<{label:string, href:string}>}}
 */
export function fixInternalLinks(text, destinos) {
  const desembrulhados = [];
  try {
    if (typeof text !== 'string' || text === '') {
      return { text, changed: false, desembrulhados };
    }
    if (!(destinos instanceof Set) || destinos.size === 0) {
      // Sem lista de destinos nao ha como decidir — nao mexe (falha segura).
      return { text, changed: false, desembrulhados };
    }
    const fixed = text.replace(LINK_RE, (match, label, href) => {
      const base = caminhoBase(href);
      if (!POLICIADO_RE.test(base)) return match;   // fora do escopo: intacto
      if (destinos.has(base)) return match;         // destino real: intacto
      desembrulhados.push({ label, href });
      return label;                                 // fica o texto, cai a URL
    });
    return { text: fixed, changed: desembrulhados.length > 0, desembrulhados };
  } catch {
    return { text, changed: false, desembrulhados: [] };
  }
}

/**
 * Le src/content e devolve o conjunto de URLs que EXISTEM de facto.
 *
 * A URL sai do prefixo do slug (`en-` -> /en/..., `es-` -> /es/..., resto -> pt),
 * a mesma regra que o sitemap-index.xml.ts e as rotas [slug].astro usam.
 * Ficheiros com `draft: true` NAO entram: nao chegam ao build, logo linkar para
 * eles da 404 igual a inventar.
 *
 * @param {string} [root] Raiz do repo (default: cwd).
 * @returns {Set<string>} URLs sem barra final, ex. '/en/glossario/en-kyc'.
 */
export function carregarDestinos(root = process.cwd()) {
  const destinos = new Set();
  for (const colecao of ['posts', 'glossario']) {
    const dir = join(root, 'src', 'content', colecao);
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir)) {
      if (!file.endsWith('.md') && !file.endsWith('.mdx')) continue;
      const slug = file.replace(/\.mdx?$/, '');
      try {
        const raw = readFileSync(join(dir, file), 'utf-8');
        if (/^draft:\s*true\s*$/m.test(raw)) continue;
      } catch { /* ilegivel: trata como existente, para nao desembrulhar a torto */ }
      const prefixo = slug.startsWith('en-') ? '/en' : slug.startsWith('es-') ? '/es' : '';
      destinos.add(`${prefixo}/${colecao}/${slug}`);
    }
  }
  return destinos;
}

export default { fixInternalLinks, carregarDestinos };
