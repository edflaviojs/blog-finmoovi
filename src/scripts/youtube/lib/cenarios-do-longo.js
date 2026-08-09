/**
 * 🔴 O CADERNO DE CENÁRIOS DO VÍDEO LONGO — para dois vídeos nunca contarem a mesma cena.
 *
 * ═══ POR QUE ISTO EXISTE (08/08/2026) ═══
 * Palavras do dono, ao ver o segundo vídeo longo: *"já corrigir para nunca mais repetir
 * as cenas num vídeo atrás do outro. Exemplo: no vídeo passado foi falado de fatura do
 * cartão, falado sobre num domingo, e agora está se repetindo. Isso não pode acontecer
 * num raio de uns 5 vídeos de intervalo — tem que se criar outras cenas e momentos."*
 *
 * Ele tem razão e a causa era simples: **nada olhava para os vídeos anteriores.** A
 * única memória que o gerador tinha era a lista de IMAGENS já usadas (`proibidas`).
 * A HISTÓRIA — o cenário, o objeto, o dia da semana, o momento — não tinha memória
 * nenhuma. Dois vídeos seguidos sobre assuntos diferentes acabavam os dois num domingo,
 * a olhar a fatura do cartão.
 *
 * ═══ O QUE ESTE FICHEIRO É, E O QUE NÃO É ═══
 * Ele **não julga se o texto é bom**. Isso é gosto, e gosto não se mede com listas —
 * é a regra da casa (ver `verdade-versus-gosto` e `prompt-versus-validador`).
 *
 * O que ele faz é **VERDADE, e mede-se**: que cenários os últimos vídeos usaram. Essa
 * lista entra no prompt como proibição, exactamente como já acontece com as imagens.
 * Proibir o que já se usou é diferente de julgar o que se escreveu.
 *
 * ⚠️ **A LIÇÃO QUE ESTE FICHEIRO NÃO PODE ESQUECER:** uma trava que ordena o contrário
 * do prompt produz oito tentativas falhadas seguidas. Por isso aqui **NÃO HÁ TRAVA
 * NENHUMA** — os cenários entram no PEDIDO como "já foram usados, escolha outros", e
 * o gerador não é reprovado por os usar. Se o modelo insistir num cenário gasto, isso
 * aparece no relatório e resolve-se no prompt, não a partir uma corrida ao meio.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

const RAIZ = process.cwd();
export const CADERNO_DE_CENARIOS = join(RAIZ, '.github', 'data', 'longo-cenarios.json');

/**
 * Quantos vídeos para trás se olha.
 * O dono disse *"um raio de uns 5 vídeos"*. Fica **6**, um a mais: o vídeo sai uma vez
 * por semana, portanto seis vídeos são mês e meio — tempo de sobra para uma cena
 * deixar de soar repetida a quem acompanha o canal toda semana.
 */
export const RAIO_DE_CENARIOS = 6;

/**
 * As coisas concretas de uma história, que são as que se repetem e se notam.
 *
 * ⚠️ Não é uma lista de palavras proibidas — é uma lista do que **procurar** no texto
 * de um vídeo já feito, para depois dizer ao seguinte "estes já saíram". Cada entrada
 * é uma família: se o vídeo passado falou em "fatura", o seguinte não fala em fatura
 * nem em boleto do cartão.
 */
const FAMILIAS = [
  { nome: 'a fatura do cartão', procura: /\bfatura|cart[ãa]o de cr[ée]dito|rotativo\b/i },
  { nome: 'o domingo', procura: /\bdomingo/i },
  { nome: 'o boleto', procura: /\bboleto/i },
  { nome: 'a conta de luz', procura: /\bconta de luz|energia el[ée]trica/i },
  { nome: 'o mercado', procura: /\bmercado|supermercado|carrinho de compras/i },
  { nome: 'o aluguel', procura: /\baluguel/i },
  { nome: 'o empréstimo', procura: /\bempr[ée]stimo|consignado/i },
  { nome: 'o salário que cai na conta', procura: /\bsal[áa]rio ca(i|iu)|dia do pagamento|dia cinco\b/i },
  { nome: 'a aposentadoria', procura: /\baposentad/i },
  { nome: 'o carro', procura: /\bcarro|financiamento do (carro|ve[íi]culo)/i },
  { nome: 'a escola das crianças', procura: /\bmatr[íi]cula|material escolar|escola d(os|as)/i },
  { nome: 'o plano de saúde', procura: /\bplano de sa[úu]de/i },
  { nome: 'o celular novo', procura: /\bcelular novo|parcela do celular/i },
  { nome: 'as assinaturas esquecidas', procura: /\bassinatura/i },
  { nome: 'a viagem', procura: /\bviagem|f[ée]rias\b/i },
  { nome: 'o décimo terceiro', procura: /\bd[ée]cimo terceiro|13[ºo]/i },
  { nome: 'a geladeira', procura: /\bgeladeira/i },
  { nome: 'o ônibus', procura: /\b[ôo]nibus/i },
  { nome: 'a obra em casa', procura: /\breforma|obra em casa|banheiro/i },
  { nome: 'a dívida com um amigo', procura: /\bemprestei|devo (pro|para o) (meu )?(amigo|irm)/i },
];

/** Lê o caderno. Nunca lança — sem caderno, é como se nenhum vídeo tivesse saído. */
export function lerCaderno(caminho = CADERNO_DE_CENARIOS) {
  try {
    if (!existsSync(caminho)) return { videos: [] };
    const d = JSON.parse(readFileSync(caminho, 'utf-8'));
    return Array.isArray(d?.videos) ? d : { videos: [] };
  } catch {
    return { videos: [] };
  }
}

/**
 * Que cenários um texto usa. É a mesma função que alimenta o caderno e que se usa nas
 * provas — uma conta, um sítio.
 */
export function cenariosDoTexto(texto) {
  const t = String(texto || '');
  return FAMILIAS.filter((f) => f.procura.test(t)).map((f) => f.nome);
}

/**
 * O que os últimos `RAIO_DE_CENARIOS` vídeos já usaram. É esta lista que vai ao prompt.
 */
export function cenariosGastos({ caderno = lerCaderno(), raio = RAIO_DE_CENARIOS } = {}) {
  const recentes = (caderno.videos || []).slice(-raio);
  return [...new Set(recentes.flatMap((v) => v.cenarios || []))];
}

/**
 * 🔴 AS IMAGENS QUE OS ÚLTIMOS VÍDEOS LONGOS JÁ USARAM — 09/08/2026.
 *
 * ═══ O BURACO QUE ISTO TAPA ═══
 * `roteiro-longo.js` perguntava "que imagens já usei?" ao `loadRecentPublishedContext()`
 * — que lê o caderno dos **SHORTS** (`youtube-published.json`, formato `short50`). Ou
 * seja: **o vídeo longo nunca via a imagem que o vídeo longo anterior usou.** Dois
 * longos seguidos podiam abrir com o mesmo fio condutor, e a única coisa que os
 * impedia era o acaso.
 *
 * ⚠️ **A lista dos Shorts continua a valer e a somar-se a esta.** Não é substituir: o
 * canal é um só, e uma imagem vista num Short ontem também já foi vista. O que faltava
 * era o outro lado.
 *
 * ⚠️ **E vive AQUI, no caderno próprio dos longos, e não a ler ficheiros de guião.**
 * Os guiões dos longos são derivados e nem sequer vão para o repositório (`.gitignore`),
 * portanto ler deles seria uma janela que na nuvem devolve sempre vazio — o mesmo modo
 * de falha silenciosa que já mordeu esta casa.
 */
export function fiosGastos({ caderno = lerCaderno(), raio = RAIO_DE_CENARIOS } = {}) {
  const recentes = (caderno.videos || []).slice(-raio);
  return [...new Set(recentes.map((v) => v.fio).filter(Boolean))];
}

/**
 * 🔴 O QUE OS VÍDEOS ANTERIORES PROMETERAM — 09/08/2026, ordem do dono: *"cada vídeo
 * tem que ser exemplos e histórias totalmente diferentes"*.
 *
 * ⚠️ **Uma lista de cenas proibidas diz o que NÃO fazer; isto diz o que JÁ FOI FEITO.**
 * São coisas diferentes, e a segunda é a que muda o resultado. Sem ela o modelo evita
 * a palavra "fatura" e escreve outra vez a mesma história com outro objeto — que foi
 * exactamente a queixa do dono ao ver o segundo vídeo.
 */
export function promessasGastas({ caderno = lerCaderno(), raio = RAIO_DE_CENARIOS } = {}) {
  return (caderno.videos || []).slice(-raio).map((v) => v.promessa).filter(Boolean);
}

/**
 * Guarda o que este vídeo usou: as cenas da história e a imagem que o conduz.
 * ⚠️ Se o slug já lá estiver, SUBSTITUI em vez de acrescentar — refazer um vídeo não
 * pode fazer o caderno pensar que saíram dois.
 */
export function guardarCenarios(slug, texto, { caminho = CADERNO_DE_CENARIOS, fio = null, promessa = null } = {}) {
  const caderno = lerCaderno(caminho);
  const cenarios = cenariosDoTexto(texto);
  const videos = (caderno.videos || []).filter((v) => v.slug !== slug);
  videos.push({
    slug,
    cenarios,
    ...(fio ? { fio } : {}),
    ...(promessa ? { promessa: String(promessa).trim() } : {}),
    em: new Date().toISOString().slice(0, 10),
  });
  mkdirSync(dirname(caminho), { recursive: true });
  writeFileSync(caminho, `${JSON.stringify({ videos }, null, 2)}\n`, 'utf-8');
  return cenarios;
}
