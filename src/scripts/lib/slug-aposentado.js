/**
 * slug-aposentado.js — guarda de URL JÁ APOSENTADA.
 *
 * O QUE ISTO EVITA (14/09/2026, custou 5 dias de blog parado):
 *
 * Em 06/08/2026 juntaram-se verbetes canibais: "know your customer" foi fundido
 * em "kyc" e o endereço antigo passou a ser ORIGEM de um redirect no
 * `public/_redirects`. Em 09/09/2026 o robô do glossário escreveu "know your
 * customer" OUTRA VEZ — o ficheiro já não existia, e o único filtro que havia
 * era `existsSync(<slug>.md)`. O verbete nasceu numa URL que é origem de
 * redirect; o `validate-internal-links` recusou (regra da casa: link interno
 * aponta para a URL FINAL, nunca para origem de redirect); o build morreu; e o
 * Cloudflare deixou de publicar. Nove posts PT mais as versões EN/ES ficaram
 * escritos no repositório e nunca chegaram ao ar — e ninguém viu durante cinco
 * dias, porque os robôs continuaram a correr verdes.
 *
 * A LIÇÃO: "há ficheiro com este nome?" e "esta URL pode voltar a existir?" são
 * perguntas DIFERENTES. Fundir um verbete apaga o ficheiro mas NÃO liberta a
 * URL: ela fica com dono (o redirect) para sempre.
 *
 * Módulo de custo zero (sem IA, sem rede) e que NUNCA lança: guarda que rebenta
 * deixa o robô a não fazer nada em silêncio, e esta casa já foi mordida por
 * isso. Se o `_redirects` não puder ser lido, avisa alto e deixa passar — a
 * alternativa seria o glossário parar de crescer sem explicação.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Caminho do ficheiro de redirects servido pelo Cloudflare. */
export const REDIRECTS_FILE = join(process.cwd(), 'public', '_redirects');

/** Cache por caminho: o robô corre uma vez, mas o teste passa ficheiros vários. */
const cache = new Map();

/**
 * Lê o `_redirects` e devolve as ORIGENS que são páginas de glossário.
 *
 * Chave `<idioma>:<slug>` (ex.: `pt:know-your-customer`,
 * `en:en-know-your-customer`), valor = destino final declarado.
 * Ignora a barra final: o Cloudflare compara a origem literalmente e o ficheiro
 * costuma declarar as duas formas.
 *
 * @param {string} [caminho] Caminho do `_redirects`.
 * @returns {Map<string, string>} Vazio se o ficheiro não existir ou não for legível.
 */
export function slugsAposentados(caminho = REDIRECTS_FILE) {
  if (cache.has(caminho)) return cache.get(caminho);

  const mapa = new Map();
  try {
    if (!existsSync(caminho)) {
      console.warn(`⚠️ slug-aposentado: ${caminho} não existe — a guarda fica INERTE nesta corrida.`);
      cache.set(caminho, mapa);
      return mapa;
    }
    for (const linha of readFileSync(caminho, 'utf-8').split('\n')) {
      const l = linha.trim();
      if (!l || l.startsWith('#')) continue;
      const [origem, destino] = l.split(/\s+/);
      if (!origem || !destino) continue;
      const m = /^\/(?:(en|es)\/)?glossario\/([^/?#]+)\/?$/.exec(origem);
      if (!m) continue;
      const idioma = m[1] || 'pt';
      mapa.set(`${idioma}:${m[2]}`, destino);
    }
  } catch (erro) {
    console.warn(`⚠️ slug-aposentado: não consegui ler ${caminho} (${erro.message}) — guarda INERTE nesta corrida.`);
  }

  cache.set(caminho, mapa);
  return mapa;
}

/**
 * Motivo pelo qual este termo NÃO pode ser escrito — ou null se estiver livre.
 *
 * Verifica SÓ o slug português, e isso é uma decisão, não um esquecimento.
 *
 * A primeira versão desta guarda verificava também `en-<slug>` e `es-<slug>`,
 * por o irmão inglês (`en-know-your-customer`) ter partido o build junto com o
 * PT em 09/09. O teste apanhou o preço disso: `acoes` é um verbete VIVO, mas o
 * irmão dele foi renomeado de `en-acoes` para `en-stocks` — logo `en-acoes` é
 * origem de redirect, e a guarda recusava um verbete saudável. Falso positivo
 * aqui não dá erro nenhum: faz o robô saltar a letra e o glossário para de
 * crescer em silêncio, que é o defeito de que esta casa mais sofre.
 *
 * O slug PT chega: no caso real, `/glossario/know-your-customer/` já era ele
 * próprio origem de redirect. O irmão traduzido nasce do termo INGLÊS (não do
 * slug PT), por isso não é previsível aqui; quem o apanha é o
 * `validate-internal-links` no build.
 *
 * @param {string} slugPt Slug português do verbete, sem barras (ex.: `know-your-customer`).
 * @param {string} [caminho] Caminho do `_redirects`.
 * @returns {string|null} Frase pronta para o log, ou null se puder escrever.
 */
export function motivoDeSlugAposentado(slugPt, caminho = REDIRECTS_FILE) {
  const slug = String(slugPt || '').trim().replace(/^\/+|\/+$/g, '');
  if (!slug) return null;

  const destino = slugsAposentados(caminho).get(`pt:${slug}`);
  return destino ? `URL aposentada: /glossario/${slug}/ já redireciona para ${destino}` : null;
}

/** Só para teste: esquece o que foi lido. */
export function limparCacheDeAposentados() {
  cache.clear();
}

export default { REDIRECTS_FILE, slugsAposentados, motivoDeSlugAposentado, limparCacheDeAposentados };
