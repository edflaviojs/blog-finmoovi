/**
 * Edicao cirurgica do frontmatter CIENTE DE ESCALAR EM BLOCO do YAML.
 *
 * PORQUE ISTO EXISTE (25/08/2026 — o blog parou 3 dias):
 *
 * Quando um valor nao cabe na linha (caminho de capa com mais de ~80
 * caracteres, um alt comprido), quem re-serializa com js-yaml escreve-o
 * dobrado. Isto e YAML perfeitamente VALIDO:
 *
 *     image: >-
 *       /images/posts/nome-muito-comprido.webp
 *
 * A chave esta numa linha e o VALOR na seguinte. Qualquer robo que edite o
 * frontmatter com um `replace` de uma linha so parte o ficheiro:
 *
 *   - gerar-alt-imagens.js metia o `imageAlt` ENTRE a chave e o valor. Partiu
 *     6 posts (2 PT + 2 EN + 2 ES) em 22/08 e derrubou o build do site. O blog
 *     ficou 3 dias sem publicar e nenhum robo ficou vermelho por isso.
 *   - regenerar-capas-glossario.js apagava so a linha `imageAlt:` e deixaria
 *     as linhas indentadas ORFAS — o mesmo estrago, ainda por acontecer.
 *
 * Estas funcoes tratam a linha da chave e o bloco indentado que a segue como
 * UMA UNIDADE. Trabalham por linhas (nunca regex sobre o ficheiro inteiro) e
 * preservam o fim-de-linha original.
 *
 * NAO re-serializam o frontmatter: manter o resto do ficheiro byte a byte e
 * deliberado — evita que um robo de alt reescreva aspas, ordem de campos e
 * datas de tudo o que toca.
 *
 * Testes: tests/frontmatter-bloco.test.js (rodar: npm test)
 */

/** Fim-de-linha do ficheiro, para nao converter CRLF em LF sem querer. */
export function quebraDeLinha(raw) {
  return raw.includes('\r\n') ? '\r\n' : '\n';
}

/**
 * Indice da ULTIMA linha que ainda pertence ao valor da chave em `lines[i]`.
 * Chave normal -> a propria linha `i`.
 * Escalar em bloco (`>`, `>-`, `|`, `|-`, `>2`...) -> a ultima linha indentada
 * que se lhe segue.
 */
export function fimDoValor(lines, i) {
  if (!/^[A-Za-z0-9_-]+:\s*[>|][-+]?\d*\s*$/.test(lines[i])) return i;
  let fim = i;
  for (let j = i + 1; j < lines.length; j++) {
    if (/^[ \t]+\S/.test(lines[j])) fim = j;    // continuacao do bloco
    else if (lines[j].trim() === '') continue;   // linha vazia pode ser do bloco
    else break;                                  // linha nao indentada: acabou
  }
  return fim;
}

/**
 * Indice da linha da chave. Procura SO no frontmatter (entre os dois `---`),
 * para nunca casar com algo parecido no corpo do artigo.
 */
export function indiceDaChave(lines, chave) {
  const re = new RegExp(`^${chave}:`);
  const fimFm = lines.indexOf('---', 1);
  const limite = fimFm === -1 ? lines.length : fimFm;
  for (let i = 0; i < limite; i++) if (re.test(lines[i])) return i;
  return -1;
}

/** Insere `linhaNova` LOGO DEPOIS do valor completo de `chave`. */
export function inserirDepoisDe(raw, chave, linhaNova) {
  const eol = quebraDeLinha(raw);
  const lines = raw.split(/\r?\n/);
  const i = indiceDaChave(lines, chave);
  if (i === -1) return raw;
  lines.splice(fimDoValor(lines, i) + 1, 0, linhaNova);
  return lines.join(eol);
}

/** Troca a chave (e o bloco todo, se houver) por `linhaNova`. */
export function substituirCampo(raw, chave, linhaNova) {
  const eol = quebraDeLinha(raw);
  const lines = raw.split(/\r?\n/);
  const i = indiceDaChave(lines, chave);
  if (i === -1) return raw;
  lines.splice(i, fimDoValor(lines, i) - i + 1, linhaNova);
  return lines.join(eol);
}

/** Apaga a chave E o bloco todo — nunca deixa linhas indentadas orfas. */
export function apagarCampo(raw, chave) {
  const eol = quebraDeLinha(raw);
  const lines = raw.split(/\r?\n/);
  const i = indiceDaChave(lines, chave);
  if (i === -1) return raw;
  lines.splice(i, fimDoValor(lines, i) - i + 1);
  return lines.join(eol);
}
