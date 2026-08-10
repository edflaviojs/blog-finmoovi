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

/**
 * ═══ 🔴 QUEM VIVE A HISTÓRIA — 10/08/2026, ordem do dono ═══
 *
 * Palavras dele, ao ver o segundo vídeo seguido sobre dois homens: *"Sempre fala dos dois
 * homens, isso tem que ser dinâmico, no vídeo anterior a história foi de 2 homens, agora
 * não pode se repetir… poderia ser um homem, uma mulher, ou um homem e uma mulher, ou
 * poderia ser dois irmãos, poderia ser um avô, poderia um pai, uma mãe, entendeu?"* E a
 * seguir: *"quanto mais variações, melhor"*.
 *
 * ⚠️ **O CADERNO GUARDAVA A CENA E A IMAGEM, E NÃO GUARDAVA A PESSOA.** Por isso o
 * domingo e a fatura pararam de se repetir em 10/08 — e os dois homens continuaram. A
 * trava só sabe proibir aquilo que sabe medir, e ninguém lhe tinha ensinado a olhar para
 * quem é o dono da história.
 *
 * ⚠️ **É VERDADE, e não gosto** (`verdade-versus-gosto`): o elenco é ESCOLHIDO por nós e
 * escrito no pedido como ordem — não se lê do texto com adivinhação, nem se julga se
 * ficou bom. Manda-se, grava-se, e o seguinte não pode repetir.
 *
 * ⚠️ **Nenhum tem NOME**, e é regra antiga desta casa: neste canal só existem "eu" e
 * "você". O elenco diz de QUEM é a história, não como se chama.
 */
export const ELENCOS = [
  'você mesmo, contando a sua própria história em primeira pessoa, sem comparar com ninguém',
  'uma mãe de família, que faz a conta da casa e sabe de cor o que falta',
  'um pai de família, que recebe no dia cinco e vê o dinheiro sumir antes do vinte',
  'um casal, que discute o mesmo dinheiro por dois pontos de vista diferentes',
  'duas irmãs, com o mesmo começo e escolhas diferentes',
  'dois irmãos, com o mesmo começo e escolhas diferentes',
  'uma avó e uma neta, duas gerações a olhar para o mesmo problema',
  'um avô e um neto, duas gerações a olhar para o mesmo problema',
  'uma mãe e uma filha já adulta, cada uma na sua fase da vida',
  'duas amigas de trabalho, que ganham o mesmo e vivem diferente',
  'um jovem no primeiro emprego, que ainda tem tudo pela frente',
  'uma pessoa que acabou de se aposentar, olhando para trás',
  'uma mulher que sustenta a casa sozinha',
  'um homem que trabalha por conta própria, com renda que muda todo mês',
  'um casal recém-casado, a juntar duas vidas financeiras numa só',
  'uma família com filhos pequenos, onde cada gasto é uma escolha',
];

/**
 * ═══ 🔴 A FUNÇÃO DO APP QUE ESTE VÍDEO MOSTRA — 10/08/2026, ordem do dono ═══
 *
 * Palavras dele: *"fala que jogou na calculadora do FinMoovi, igualzinho os anteriores, o
 * FinMoovi tem centenas de funcionalidades e o roteiro só ataca sobre cartão??? já falei
 * isso milhares de vezes"*.
 *
 * ⚠️ **A LISTA SAIU DAS TELAS QUE O APP TEM MESMO** (`client/src/pages` do FinMoovi), e
 * não de imaginação. Uma lista inventada poria o vídeo a prometer uma tela que não existe
 * — e isso o canal não faz.
 *
 * ⚠️ **UMA POR VÍDEO, e é decisão do dono** (10/08): a demonstração mostra UMA função,
 * fica gravada no caderno, e não se repete nos próximos ${RAIO_DE_CENARIOS} vídeos.
 */
export const FUNCOES_DO_APP = [
  { chave: 'contas', nome: 'as Contas', oQueFaz: 'ver o saldo de todas as contas do banco num sítio só, somado' },
  { chave: 'cartoes', nome: 'os Cartões de Crédito', oQueFaz: 'ver a fatura de cada cartão e quanto do limite já foi usado' },
  { chave: 'extrato', nome: 'o Extrato', oQueFaz: 'ver tudo o que entrou e saiu, lançamento a lançamento' },
  { chave: 'fluxo-de-caixa', nome: 'o Fluxo de Caixa', oQueFaz: 'ver o que ainda vai entrar e sair até ao fim do mês' },
  { chave: 'categorias', nome: 'as Categorias', oQueFaz: 'ver em que é que o dinheiro foi parar, por tipo de gasto' },
  { chave: 'balanco-mensal', nome: 'o Balanço do Mês', oQueFaz: 'ver quanto entrou e quanto saiu no mês, lado a lado' },
  { chave: 'planejamento', nome: 'o Planejamento do Mês', oQueFaz: 'dizer antes quanto se pode gastar em cada coisa, e acompanhar' },
  { chave: 'relatorios', nome: 'os Relatórios', oQueFaz: 'ver a evolução de vários meses num gráfico' },
  { chave: 'compras', nome: 'o Relatório de Compras', oQueFaz: 'ver o que se comprou e onde, item a item' },
  { chave: 'lembretes', nome: 'os Lembretes', oQueFaz: 'ser avisado antes de a conta vencer' },
  { chave: 'recibos', nome: 'a Captura de Recibos', oQueFaz: 'tirar uma foto do recibo e ele lançar-se sozinho' },
  { chave: 'multi-moeda', nome: 'as Três Moedas', oQueFaz: 'ter dinheiro em real, dólar e euro, e ver tudo convertido' },
  { chave: 'sincronizacao', nome: 'a Sincronização', oQueFaz: 'lançar no telemóvel e aparecer no computador na hora' },
  { chave: 'partilha', nome: 'a Partilha', oQueFaz: 'a casa toda a ver e lançar nas mesmas contas' },
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
/**
 * ⚠️ **O SLUG DESTE VÍDEO NÃO CONTA COMO GASTO** — 10/08/2026.
 * Refazer um vídeo lia o caderno com a linha DELE lá dentro, e o gerador via como
 * proibido o elenco e a função que ele próprio tinha escolhido na corrida anterior.
 * Ninguém dá por isso: sai outro elenco, e parece uma escolha.
 */
const semEste = (caderno, slug, raio) =>
  (caderno.videos || []).filter((v) => v.slug !== slug).slice(-raio);

/** Que elencos os últimos vídeos usaram. */
export function elencosGastos({ caderno = lerCaderno(), raio = RAIO_DE_CENARIOS, slug = null } = {}) {
  return [...new Set(semEste(caderno, slug, raio).map((v) => v.elenco).filter(Boolean))];
}

/** Que funções do app os últimos vídeos mostraram. */
export function funcoesGastas({ caderno = lerCaderno(), raio = RAIO_DE_CENARIOS, slug = null } = {}) {
  return [...new Set(semEste(caderno, slug, raio).map((v) => v.funcaoDoApp).filter(Boolean))];
}

/**
 * Escolhe o que este vídeo vai usar, evitando o que os últimos usaram.
 *
 * ⚠️ **Determinista pelo nome do vídeo, nunca por sorteio nem pela hora** — é a mesma
 * regra das capas e das fotografias: o mesmo vídeo pedido duas vezes tem de dar a mesma
 * história. Um sorteio faria uma corrida de repescagem contar outra coisa.
 *
 * ⚠️ **Se estiverem todos gastos, escolhe à mesma** — repetir é melhor do que parar, e é
 * a regra da casa desde 09/08. Com 16 elencos e 14 funções para uma janela de 6, isso
 * não acontece tão cedo.
 */
function escolherDeterminista(lista, slug, gastos, chaveDe = (x) => x) {
  const livres = lista.filter((x) => !gastos.includes(chaveDe(x)));
  const pool = livres.length ? livres : lista;
  let soma = 0;
  for (const c of String(slug || '')) soma = (soma + c.codePointAt(0)) % 100000;
  return pool[soma % pool.length];
}

export function escolherElenco(slug, gastos = []) {
  return escolherDeterminista(ELENCOS, slug, gastos);
}

export function escolherFuncaoDoApp(slug, gastos = []) {
  /** ⚠️ O deslocamento existe para o elenco e a função não andarem sempre ao par: sem ele,
   *  o mesmo nome de vídeo cairia sempre no mesmo par das duas listas. */
  return escolherDeterminista(FUNCOES_DO_APP, `${slug}::app`, gastos, (x) => x.chave);
}

export function guardarCenarios(slug, texto, { caminho = CADERNO_DE_CENARIOS, fio = null, promessa = null, elenco = null, funcaoDoApp = null } = {}) {
  const caderno = lerCaderno(caminho);
  const cenarios = cenariosDoTexto(texto);
  /**
   * 🔴 O QUE JÁ ESTAVA GRAVADO NESTA LINHA NÃO SE PERDE — 10/08/2026.
   *
   * ═══ O DEFEITO ═══
   * Esta função apaga a linha do vídeo e escreve uma nova. Só que **o molde da capa é
   * escrito noutro momento e por outro programa** (`guardarMolde`, no `capa-manus.js`),
   * na MESMA linha deste caderno — de propósito, para haver um caderno só. Ao regravar
   * sem o trazer, **o molde desaparecia** e a rotação das capas perdia a memória.
   *
   * ⚠️ **No robô isto não morde**, porque o guião é escrito antes da capa. Morde quando
   * se refaz o guião de um vídeo que já tem capa — e não dá erro nenhum: o caderno fica
   * simplesmente a dizer que aquele vídeo não teve molde, e o vídeo seguinte pode repetir
   * exactamente o enquadramento que acabou de sair.
   *
   * ⚠️ **Guarda-se o que lá estava, não uma lista de campos escrita à mão.** Uma lista
   * teria de ser lembrada por quem acrescentar o próximo campo — que é como este defeito
   * nasceu.
   */
  const jaLaEstava = (caderno.videos || []).find((v) => v.slug === slug) || {};
  const videos = (caderno.videos || []).filter((v) => v.slug !== slug);
  videos.push({
    ...jaLaEstava,
    slug,
    cenarios,
    ...(fio ? { fio } : {}),
    ...(elenco ? { elenco } : {}),
    ...(funcaoDoApp ? { funcaoDoApp } : {}),
    ...(promessa ? { promessa: String(promessa).trim() } : {}),
    em: new Date().toISOString().slice(0, 10),
  });
  mkdirSync(dirname(caminho), { recursive: true });
  writeFileSync(caminho, `${JSON.stringify({ videos }, null, 2)}\n`, 'utf-8');
  return cenarios;
}
