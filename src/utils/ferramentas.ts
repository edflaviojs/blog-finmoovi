/**
 * As calculadoras do blog, e como escolher a certa para um texto.
 *
 * POR QUE ISTO EXISTE (15/09/2026): medido no repositório, **100 dos 119 verbetes e
 * 96 dos 150 posts em português não apontavam para calculadora nenhuma**. O
 * glossário e os posts são o que recebe visita; as calculadoras são o ativo (só a de
 * juros compostos disputa 141 mil buscas/mês). As páginas que recebem gente não
 * mandavam ninguém para as páginas que importam.
 *
 * A tabela vive aqui, e não dentro de um componente, porque **dois componentes a
 * usam** — o do glossário (mapa termo a termo, escrito à mão) e o dos posts (por
 * palavra no título). Duas cópias da mesma tabela seriam duas tabelas diferentes
 * daqui a um mês.
 *
 * ⚠️ SÓ EM PORTUGUÊS. As calculadoras existem apenas em `/ferramentas/`. Quem
 * chama tem de garantir o idioma — ver os dois componentes.
 */

/** Slug de cada calculadora, tal como está em `/ferramentas/<slug>/`. */
export type FerramentaSlug =
  | 'calculadora-juros-compostos'
  | 'calculadora-financiamento'
  | 'simulador-amortizacao'
  | 'calculadora-aposentadoria'
  | 'calculadora-reserva'
  | 'simulador-investimento'
  | 'calculadora-ir-investimentos'
  | 'calculadora-desconto'
  | 'calculadora-orcamento'
  | 'conversor-moedas'
  | 'rachar-conta';

export interface Ferramenta {
  /** Nome como aparece no link. */
  nome: string;
  /** O que ela responde, em uma linha — é isto que faz alguém clicar. */
  promessa: string;
}

/**
 * As 11 calculadoras. A `promessa` é o que cada uma tem de diferente das outras
 * que existem por aí — não é descrição genérica.
 */
export const FERRAMENTAS: Record<FerramentaSlug, Ferramenta> = {
  'calculadora-juros-compostos': {
    nome: 'Calculadora de Juros Compostos',
    promessa: 'veja o mês exato em que os juros passam a render mais que o seu aporte',
  },
  'calculadora-financiamento': {
    nome: 'Calculadora de Financiamento',
    promessa: 'compare SAC e Price e veja o mês em que uma parcela cruza a outra',
  },
  'simulador-amortizacao': {
    nome: 'Simulador de Amortização',
    promessa: 'reduzir prazo ou reduzir parcela? Veja a diferença em reais',
  },
  'calculadora-aposentadoria': {
    nome: 'Calculadora de Aposentadoria',
    promessa: 'descubra quanto precisa juntar e quando o patrimônio passa a render sozinho',
  },
  'calculadora-reserva': {
    nome: 'Calculadora de Reserva de Emergência',
    promessa: 'quantos meses você aguenta hoje sem receber nada',
  },
  'simulador-investimento': {
    nome: 'Simulador de Investimento',
    promessa: 'veja o preço da pressa: quanto 3 anos a mais mudam o aporte necessário',
  },
  'calculadora-ir-investimentos': {
    nome: 'Calculadora de IR sobre Investimentos',
    promessa: 'o dia em que a alíquota cai de 22,5% para 15%, e quanto sobra líquido',
  },
  'calculadora-desconto': {
    nome: 'Calculadora de Desconto',
    promessa: 'desconto sobre desconto não soma: 30% + 20% dá 44%, não 50%',
  },
  'calculadora-orcamento': {
    nome: 'Calculadora de Orçamento',
    promessa: 'descubra se você passou dos 50% com o essencial',
  },
  'conversor-moedas': {
    nome: 'Conversor de Moedas',
    promessa: 'converta com a cotação do dia e veja a variação',
  },
  'rachar-conta': {
    nome: 'Rachar a Conta',
    promessa: 'divide a conta e separa a bebida de quem bebeu',
  },
};

/**
 * Regras de escolha por palavra, do MAIS específico para o mais genérico.
 *
 * ⚠️ A ORDEM É A REGRA. "Como investir pensando na aposentadoria" tem as duas
 * palavras; ganha a aposentadoria porque vem antes. Se o genérico viesse primeiro,
 * quase tudo cairia em orçamento — que é o último de propósito, por ser o mais
 * abrangente.
 */
const REGRAS: ReadonlyArray<{ re: RegExp; ferramenta: FerramentaSlug }> = [
  { re: /amortiz|saldo devedor|quita(r|ção) antecipad/i, ferramenta: 'simulador-amortizacao' },
  { re: /financ(iamento|iar)|tabela sac|\bsac\b|\bprice\b|hipotec|cons[óo]rcio|empr[ée]stimo|cheque especial|juros abusiv|financiar (um )?(carro|im[óo]vel|casa)/i, ferramenta: 'calculadora-financiamento' },
  { re: /juros compostos|juro composto|bola de neve dos juros/i, ferramenta: 'calculadora-juros-compostos' },
  { re: /imposto de renda|\birrf\b|come-cotas|al[íi]quota|tributa[çc]/i, ferramenta: 'calculadora-ir-investimentos' },
  { re: /aposentad|previd[êe]ncia|independ[êe]ncia financeira|primeiro milh[ãa]o|viver de renda/i, ferramenta: 'calculadora-aposentadoria' },
  { re: /reserva de emerg[êe]ncia|fundo de emerg[êe]ncia|colch[ãa]o financeiro/i, ferramenta: 'calculadora-reserva' },
  { re: /desconto|cashback|black friday|promo[çc][ãa]o|promo[çc][õo]es|cupom|cupons|liquida[çc][ãa]o/i, ferramenta: 'calculadora-desconto' },
  { re: /rachar|dividir a conta|dividir as contas|vaquinha|churrasco/i, ferramenta: 'rachar-conta' },
  { re: /d[óo]lar|euro|c[âa]mbio|moeda estrangeira|cota[çc][ãa]o|remessa|multi-moeda/i, ferramenta: 'conversor-moedas' },
  { re: /investi|renda fixa|renda vari[áa]vel|\bcdb\b|tesouro|a[çc][õo]es|bolsa|\betf\b|\bfii\b|dividendo|poupan[çc]a|selic|\bcdi\b|carteira/i, ferramenta: 'simulador-investimento' },
  { re: /or[çc]amento|gasto|despesa|economizar|economia|planilha|controle financeiro|planejamento financeiro|lista de compras|conta de luz|conta de [áa]gua|fatura|50-30-20|cart[ãa]o de cr[ée]dito/i, ferramenta: 'calculadora-orcamento' },
];

/**
 * Escolhe a calculadora que serve um texto, ou `null` quando nenhuma serve.
 *
 * ⚠️ DEVOLVER `null` É O COMPORTAMENTO CERTO, não uma falha. Um post sobre
 * "governança corporativa" não tem calculadora nossa, e inventar uma ligação só
 * para encher o número seria enfeite — movimento que não conta nada não conta.
 *
 * @param texto - título, slug e etiquetas do conteúdo, juntos numa string
 * @returns o slug da calculadora, ou `null`
 * @example
 * escolherFerramenta('Como amortizar o financiamento') // 'simulador-amortizacao'
 * escolherFerramenta('Wall Street explicada')          // null
 */
export function escolherFerramenta(texto: string): FerramentaSlug | null {
  for (const regra of REGRAS) {
    if (regra.re.test(texto)) return regra.ferramenta;
  }
  return null;
}
