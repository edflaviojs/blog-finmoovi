/**
 * prompt-post.js — Núcleo editorial reutilizável dos geradores de POST.
 *
 * IMPLEMENTACAO23 Fase 2: centraliza (DRY) o estilo "situação-primeiro" +
 * neutralidade geográfica + amarração com feature real + linhas editoriais.
 * Espelha o padrão já aceito de `translation-prompt.js`.
 *
 * ⚠️ REGRA CRÍTICA: este núcleo NÃO contém marcadores de formato
 * (---TITULO---, ---META---, ---HEADLINE---, ---KEYWORDS---, ---CONTEUDO---).
 * Cada gerador mantém seu próprio bloco de marcadores — o parser depende deles.
 * Aqui só entram REGRAS DE ESTILO (prosa), nunca o formato de saída.
 */

/**
 * Bloco de regras editoriais universal, injetável em qualquer prompt de geração
 * de post. Deve ser interpolado na seção de REGRAS (antes do bloco de formato).
 *
 * @param {object} opts
 * @param {string} opts.appName Nome do app (ex.: config.app.name) para o gancho de feature.
 * @returns {string} Bloco de instruções de estilo (sem marcadores de formato).
 */
export function postCoreRules({ appName }) {
  const app = appName || 'FinMoovi';
  return `
ABERTURA (situação-primeiro, obrigatória):
- Comece com um APERTO real que o leitor reconhece — uma cena/dor concreta do dia a dia. NUNCA abra com "X é...", "No cenário atual" ou "Você já se perguntou".
- O gancho de abertura é um PARÁGRAFO corrido (texto normal), NUNCA um heading: não use "#", "##" nem "###" na primeira linha do conteúdo.
- Explique o conceito ATRAVÉS dessa situação (não como verbete de dicionário).
- Mostre o ${app} resolvendo o problema de forma orgânica, e feche com uma micro-ação de 5 minutos dentro do app.

NEUTRALIDADE GEOGRÁFICA (obrigatória):
- Público UNIVERSAL (Brasil, Portugal, falantes de inglês e espanhol). NÃO escreva "no Brasil"/"brasileiro", NÃO use R$ nem qualquer moeda fixa.
- Use valores RELATIVOS ("cerca de um aluguel", "o preço de um café por dia", "um salário mínimo") em vez de números em moeda.
- Se citar fontes externas, prefira as UNIVERSAIS (ex.: Investopedia, OECD, World Bank) em vez de órgãos de um único país.

AMARRAÇÃO COM FEATURE REAL (escolha 1 natural ao tema, de forma orgânica):
- Captura inteligente (foto de nota fiscal / por voz) + categorização automática
- Multimoeda (BRL / USD / EUR)
- Fluxo de caixa e relatórios
- Planejamento mensal / metas
- Cartões de crédito / fatura
- Modo compras (lista + total em tempo real)
- Lembretes / alertas de saldo
- Offline / PWA / sincronização

LINHAS EDITORIAIS PREFERENCIAIS: compra por impulso; orçamento visual (categorias); paz mental × finanças; desafios práticos (30 dias / os "primeiros 500"); bastidores do app (resolver em 3 cliques).
`;
}

/**
 * Regras de tratamento da KEYWORD-SEMENTE vinda da fila (manual/GSC/autocomplete).
 * Keywords de ferramenta de SEO chegam em ordem "telegrama" ("poupar dinheiro
 * dicas") e, coladas literalmente, produzem títulos em português quebrado.
 *
 * @param {string} keyword A semente vinda da fila.
 * @param {object} [opts]
 * @param {'titulo'|'verbete'} [opts.mode] 'titulo' = post/vídeo; 'verbete' = glossário.
 * @returns {string} Bloco de regras (vazio se não houver keyword).
 */
export function seedKeywordRules(keyword, { mode = 'titulo' } = {}) {
  const kw = String(keyword || '').trim();
  if (!kw) return '';
  if (mode === 'verbete') {
    return `
SEMENTE DE BUSCA — "${kw}" (NÃO é o nome do verbete):
- Extraia o CONCEITO financeiro por trás dela e use-o como termo do verbete.
- O verbete é um SUBSTANTIVO/expressão nominal ("Amortização", "Tabela Price"),
  NUNCA uma frase de busca ("como poupar dinheiro dicas").
- É PROIBIDO usar a semente literal como nome do verbete.
`;
  }
  return `
SEMENTE DE BUSCA — "${kw}" (NÃO é um título):
- Ela veio de ferramenta de SEO e costuma estar em ordem "telegrama"
  ("poupar dinheiro dicas"), que NÃO é português natural.
- É PROIBIDO colá-la literalmente no título, na meta, no headline ou em heading.
- Reescreva em português natural PRESERVANDO os termos de busca: reordene e
  acrescente conectores/artigos. Ex.: "poupar dinheiro dicas" → "dicas para
  poupar dinheiro" ou "como poupar dinheiro no dia a dia".
- No corpo, os termos aparecem de forma orgânica e FLEXIONADOS conforme a frase
  pedir (plural/singular, verbo). A busca tolera a variação; o leitor NÃO tolera
  texto quebrado.
`;
}
