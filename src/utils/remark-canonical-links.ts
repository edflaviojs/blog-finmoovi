import { canonicalPath } from './url';

/**
 * Plugin remark: normaliza os links INTERNOS escritos no corpo dos markdowns
 * (`[texto](/glossario/x)`) para a forma com barra final.
 *
 * PORQUÊ AQUI E NÃO NOS ARQUIVOS: o conteúdo é gerado diariamente pelo bot, que
 * escreve `](/glossario/x)`. Corrigir os 462 markdowns de hoje resolveria hoje e
 * quebraria amanhã (o guard de barra final barraria o deploy do post novo).
 * Normalizando no build, a regra vale para todo markdown — o que já existe e o
 * que o bot ainda vai escrever — e bebe da MESMA fonte que sitemap, canonical e
 * hreflang: canonicalPath().
 *
 * NÃO toca em:
 *  - links externos (`http://`, `https://`, `//host`, `mailto:`, `tel:`);
 *  - âncoras puras (`#secao`) e caminhos relativos;
 *  - a raiz (`/`), que já é canônica;
 *  - arquivos (`.png`, `.pdf`, `.xml`...) — arquivo não leva barra final, e
 *    acrescentá-la geraria 404;
 *  - imagens (nó `image` do mdast) — só `link` e `definition` são navegação.
 *
 * Querystring e âncora são preservadas pelo próprio canonicalPath
 * (`/a?b=1` → `/a/?b=1`; `/a#b` → `/a/#b`).
 */

/** Extensões de arquivo servidas como asset — nunca recebem barra final. */
const ASSET_EXTENSION =
  /\.(css|js|mjs|xml|txt|json|png|jpg|jpeg|webp|avif|svg|ico|woff|woff2|pdf)$/i;

/** Nó mínimo do mdast que este plugin precisa enxergar. */
interface MdastNode {
  type: string;
  url?: string;
  children?: MdastNode[];
}

/**
 * Decide se uma URL de markdown é link interno de navegação normalizável.
 * @param url Valor bruto do link no markdown.
 */
function isNormalizableInternalLink(url: string): boolean {
  if (!url.startsWith('/')) return false; // externo, âncora, relativo, mailto:, tel:
  if (url.startsWith('//')) return false; // protocol-relative = outro host

  const cut = url.search(/[?#]/);
  const path = cut === -1 ? url : url.slice(0, cut);

  if (path === '' || path === '/') return false; // raiz ou só query/âncora
  if (ASSET_EXTENSION.test(path)) return false; // arquivo
  if (path.endsWith('/')) return false; // já normalizado

  return true;
}

/** Percorre a árvore aplicando canonicalPath aos links internos. */
function normalizeTree(node: MdastNode): void {
  if ((node.type === 'link' || node.type === 'definition') && typeof node.url === 'string') {
    if (isNormalizableInternalLink(node.url)) {
      node.url = canonicalPath(node.url);
    }
  }

  if (node.children) {
    for (const child of node.children) normalizeTree(child);
  }
}

/** Fábrica do plugin, no formato esperado por `markdown.remarkPlugins`. */
export function remarkCanonicalLinks() {
  return (tree: MdastNode): void => {
    normalizeTree(tree);
  };
}
