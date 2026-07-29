import { config } from '../../site.config';

/**
 * Normalização de URL para SEO.
 *
 * PORQUÊ: o build do Astro usa format 'directory' e o Cloudflare Pages serve
 * TODA página com barra final (`/posts/x/`). Uma requisição sem a barra recebe
 * HTTP 308. Se o sitemap ou o hreflang apontarem para a forma sem barra, o
 * Google vê 505 URLs que redirecionam e trata o hreflang como inválido —
 * risco de descartar o cluster i18n inteiro.
 *
 * Por isso canonical, sitemap e hreflang têm de beber TODOS da mesma fonte:
 * as duas funções abaixo.
 */

/**
 * Normaliza um caminho para a forma servida pelo Cloudflare: barra inicial,
 * sem barras duplicadas e com exatamente uma barra final.
 *
 * Querystring e hash são preservados intactos — só a parte do path é
 * normalizada (o site não usa hoje, mas a função não pode corrompê-los).
 *
 * @param path Caminho relativo à raiz do site (ex.: `/posts/x`, `posts/x`).
 *             NÃO aceita URL absoluta — use somente caminhos.
 * @returns Caminho normalizado, sempre iniciado e terminado por `/`.
 * @example
 * canonicalPath('')            // '/'
 * canonicalPath('/')           // '/'  (nunca '//')
 * canonicalPath('/posts/x')    // '/posts/x/'
 * canonicalPath('/posts/x/')   // '/posts/x/'  (idempotente)
 * canonicalPath('//en//a')     // '/en/a/'
 * canonicalPath('/a?b=1')      // '/a/?b=1'
 */
export function canonicalPath(path: string): string {
  const input = path ?? '';

  // Isola ?query / #hash: só o path define o redirect do Cloudflare.
  const cut = input.search(/[?#]/);
  const rawPath = cut === -1 ? input : input.slice(0, cut);
  const suffix = cut === -1 ? '' : input.slice(cut);

  const normalized = `/${rawPath}`   // garante barra inicial
    .replace(/\/{2,}/g, '/')         // colapsa barras duplicadas internas
    .replace(/\/+$/, '');            // remove barras finais para recolocar UMA

  return `${normalized}/${suffix}`;
}

/**
 * Monta a URL absoluta canônica de um caminho do site.
 *
 * Trata `siteUrl` com ou sem barra final para nunca gerar `https://host//path`.
 *
 * @param path Caminho relativo à raiz do site. NÃO aceita URL absoluta.
 * @returns URL absoluta com barra final (ex.: `https://blog.finmoovi.com/posts/x/`).
 * @example
 * absUrl('/posts/x')  // 'https://blog.finmoovi.com/posts/x/'
 * absUrl('/')         // 'https://blog.finmoovi.com/'
 */
export function absUrl(path: string): string {
  const origin = config.siteUrl.replace(/\/+$/, '');
  return `${origin}${canonicalPath(path)}`;
}
