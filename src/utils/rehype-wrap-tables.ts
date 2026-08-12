/**
 * Plugin rehype: mete cada `<table>` do markdown dentro de uma caixa que rola
 * na horizontal (`<div class="table-scroll">`).
 *
 * ═══ O DEFEITO QUE ISTO CURA ═══
 * Medido em 12/08/2026 num telemóvel a sério (perfil iPhone 13, ecrã de 390px):
 * **90 das 555 páginas do blog ficavam mais largas que o ecrã** — mediana 69px a
 * mais, pior caso 474px. Em 89 delas a causa era UMA só: uma tabela.
 *
 * A cadeia é esta. O artigo é um item de `display: grid` (`.layout-with-sidebar`),
 * e um item de grid nasce com `min-width: auto` — recusa-se a encolher abaixo da
 * largura mínima do seu conteúdo. Uma tabela de comparação com 4 colunas tem
 * largura mínima de 828px. Logo a coluna inteira ia a 828px, a página ia atrás, e
 * o `width: 100%` da tabela não impedia nada — 100% de uma coluna já esticada.
 *
 * ═══ AS DUAS CONSEQUÊNCIAS, E A SEGUNDA É A GRAVE ═══
 * 1. O texto do artigo era cortado no lado direito. O leitor lia «Enquanto você
 *    folheia a fatura do cartão e ten…» e a frase acabava ali.
 * 2. **O aviso de privacidade saía do ecrã.** Quando a página fica mais larga que
 *    o ecrã, o navegador alarga a *layout viewport*, e tudo o que é
 *    `position: fixed; bottom: 0` é empurrado para fora da vista — medido na
 *    altura 1201 num ecrã de 664. O leitor nunca via o aviso e nunca escolhia, e
 *    essa escolha é obrigação legal.
 *
 * ═══ PORQUÊ AQUI E NÃO NOS 90 FICHEIROS ═══
 * Pela mesma razão do `remark-canonical-links`: o conteúdo é escrito todos os dias
 * por um robô. Consertar os 90 markdowns de hoje resolvia hoje e voltava a partir
 * amanhã, na primeira tabela nova. No build, a regra vale para o que já existe e
 * para o que ainda vai ser escrito.
 *
 * ⚠️ **PORQUÊ UM `<div>` À VOLTA E NÃO `display: block` NA PRÓPRIA TABELA.** O
 * truque conhecido — `table { display: block; overflow-x: auto }` — é uma linha de
 * CSS e não precisaria deste ficheiro. Mas `display: block` numa `<table>` faz o
 * VoiceOver do Safari deixar de a anunciar como tabela: perdem-se os cabeçalhos de
 * coluna, e quem ouve a página deixa de saber a que coluna pertence cada número.
 * A caixa por fora rola na mesma e a tabela continua tabela.
 *
 * ⚠️ **`tabindex="0"` NÃO É ENFEITE.** Uma caixa que rola e não recebe foco só se
 * usa com o dedo ou com o rato — quem navega por teclado nunca chega ao resto da
 * tabela. É a regra `scrollable-region-focusable` do axe. Sem `role`, de
 * propósito: `role="region"` exigiria um nome acessível, e o nome teria de vir nos
 * três idiomas, coisa que este plugin não tem como saber.
 */

/** Nó mínimo do hast que este plugin precisa de enxergar. */
interface HastNode {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

/**
 * Envolve as tabelas de UM nível de filhos, e desce no resto da árvore.
 *
 * Percorre de trás para a frente porque a lista é alterada durante a passagem:
 * a posição `i` deixa de ser a tabela e passa a ser o `<div>` que a embrulha.
 * A subir, o índice já visitado nunca muda.
 */
function envolverTabelas(no: HastNode): void {
  const filhos = no.children;
  if (!Array.isArray(filhos)) return;

  for (let i = filhos.length - 1; i >= 0; i--) {
    const filho = filhos[i];
    if (!filho || filho.type !== 'element') continue;

    if (filho.tagName === 'table') {
      filhos[i] = {
        type: 'element',
        tagName: 'div',
        properties: { className: ['table-scroll'], tabIndex: 0 },
        children: [filho],
      };
      // Não se desce: markdown não gera tabela dentro de tabela, e descer aqui
      // só criaria a hipótese de embrulhar duas vezes a mesma coisa.
      continue;
    }

    envolverTabelas(filho);
  }
}

/** Fábrica no formato que o unified/Astro espera (`() => (tree) => void`). */
export function rehypeWrapTables() {
  return (arvore: HastNode): void => {
    envolverTabelas(arvore);
  };
}
