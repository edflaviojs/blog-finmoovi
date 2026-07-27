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
