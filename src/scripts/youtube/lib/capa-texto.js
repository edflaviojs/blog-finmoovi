/**
 * O TEXTO DA CAPA — o que a máquina lê no roteiro e põe na fotografia (IMPL20 §52).
 *
 * ═══ O PROBLEMA ═══
 * A capa tem três linhas: o ASSUNTO em cima, o NÚMERO em grande, e a CONSEQUÊNCIA em
 * baixo. Nenhuma das três existe escrita no roteiro — têm de ser extraídas.
 *
 * ═══ ONDE ESTÁ O NÚMERO (e onde NÃO está) ═══
 * ⚠️ **Não está na narração.** A narração é texto para ser LIDO EM VOZ ALTA, e por
 * isso os números aparecem por extenso: *"num salário de quatro mil, são duzentos
 * reais que somem"*. Procurar algarismos aí não encontra nada.
 * O sítio certo é o `term` — o título do vídeo, escrito para o olho: *"A inflação te
 * rouba R$ 2 mil por ano"*. E, se lá não houver, a frase de abertura.
 *
 * ═══ A REGRA DA CONSEQUÊNCIA ═══
 * Depois de tirar o número, sobra a frase partida em duas: o que vinha antes e o que
 * vinha depois. Usa-se **o que vem depois**, porque a frase foi escrita a caminhar
 * para a conclusão. Mas se depois não sobrar nada (o número era o fim), usa-se o que
 * vinha antes. Testado contra os 15 roteiros que existem.
 *
 * ⚠️ E quando não há número nenhum, a capa **não fica com um buraco**: o título sobe
 * para o lugar do número. Uma capa sem número é pior; uma capa com um vazio no meio
 * é um defeito.
 */

/** Os assuntos, para quando a palavra-chave é uma frase e não serve de etiqueta. */
const NOME_DA_CATEGORIA = {
  basico: 'O BÁSICO',
  controle: 'CONTROLE',
  credito: 'CRÉDITO',
  investimento: 'INVESTIMENTO',
  mercado: 'MERCADO',
  mindset: 'MENTALIDADE',
};

const MAX_PALAVRAS_NO_TEMA = 2;

/**
 * Os moldes do número, por ordem de preferência.
 * Dinheiro ganha a percentagem, e a percentagem ganha a contagem — porque é isso que
 * trava o dedo: "R$ 200 mil" pesa mais do que "3 erros".
 */
const MOLDES = [
  // R$ 2 mil · R$ 500/mês · R$ 1.240,50 · R$ 30 mil
  /R\$\s?\d[\d.,]*(?:\s*(?:mil|milhões|milhão|bilhões|bilhão))?(?:\s*\/\s*(?:mês|mes|ano|dia|semana))?/i,
  // 12% · 0,5%
  /\d[\d.,]*\s?%/,
  // "3 erros", "5 coisas" — a contagem que abre o título
  /^\d+\s+[A-Za-zÀ-ÿ]+/,
];

/**
 * ⚠️ OS "???" TÊM DE MORRER AQUI. Os roteiros trazem-nos ("podem virar R$ 3,2
 * MILHÕES???") porque no vídeo eles são ênfase falada. Numa capa parada, três pontos
 * de interrogação lêem-se como amadorismo — e uma capa é a primeira coisa que se vê
 * do canal.
 */
const limpar = (t) => String(t || '')
  .replace(/\*/g, '')
  .replace(/([!?])\1+/g, '$1')
  .replace(/\s+/g, ' ')
  .trim();

/** Um remate comprido não cabe: parte em quatro linhas e engole o número. */
const MAX_REMATE = 90;
/** Abaixo disto não é uma frase, é um resto. */
const MIN_PALAVRAS_NO_REMATE = 2;

/** Tira pontuação solta que ficou pendurada quando o número foi retirado do meio. */
const aparar = (t) => limpar(t)
  .replace(/^[\s,;:.–—-]+/, '')
  .replace(/[\s,;:–—-]+$/, '')
  .trim();

/** Procura o número numa frase. Devolve o que encontrou e o que ficou de cada lado. */
export function acharNumero(frase) {
  const texto = limpar(frase);
  for (const molde of MOLDES) {
    const m = texto.match(molde);
    if (!m) continue;
    return {
      numero: m[0].trim(),
      antes: texto.slice(0, m.index),
      depois: texto.slice(m.index + m[0].length),
    };
  }
  return null;
}

/** A etiqueta do assunto: a palavra-chave quando é curta, a categoria quando não é. */
export function temaDoRoteiro(roteiro) {
  const chave = limpar(roteiro.keyword);
  const palavras = chave.split(/\s+/).filter(Boolean);
  if (palavras.length && palavras.length <= MAX_PALAVRAS_NO_TEMA) return chave.toUpperCase();
  return NOME_DA_CATEGORIA[roteiro.category] || 'FINANÇAS';
}

export function textoDaCapa(roteiro) {
  const titulo = limpar(roteiro.term) || limpar(roteiro.keyword);
  const gancho = limpar(roteiro.intro?.frase);

  // primeiro no título (escrito para o olho), depois na abertura
  const achado = acharNumero(titulo) || acharNumero(gancho);

  const conta = (t) => aparar(t).split(/\s+/).filter(Boolean).length;

  let numero = '';
  let remate = '';
  if (achado) {
    numero = achado.numero.toUpperCase();
    const depois = aparar(achado.depois);
    const antes = aparar(achado.antes);
    // o que vem DEPOIS, se for uma frase; senão o que vinha antes
    if (conta(depois) >= MIN_PALAVRAS_NO_REMATE) remate = depois;
    else if (conta(antes) >= MIN_PALAVRAS_NO_REMATE) remate = antes;
    // ⚠️ e se NENHUM dos lados sobrou (o título ERA o número, como em "5 erros
    // financeiros"), o remate seria vazio e a capa ficava com o número sozinho a
    // pairar. Nesse caso usa-se o gancho, que é sempre uma frase inteira.
    else remate = gancho || titulo;
  } else {
    // sem número: o título ocupa o lugar do remate, para a capa não ficar oca
    remate = titulo;
  }

  remate = aparar(remate);
  if (remate.length > MAX_REMATE) remate = `${remate.slice(0, MAX_REMATE - 1).trim()}…`;

  return {
    metaphor: roteiro.fioCondutor || null,
    tema: temaDoRoteiro(roteiro),
    numero,
    remate,
  };
}
