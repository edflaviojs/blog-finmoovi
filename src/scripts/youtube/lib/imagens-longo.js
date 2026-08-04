/**
 * O DIRETOR DE IMAGEM DO VÍDEO LONGO — a imagem nasce do TEXTO (04/08/2026).
 *
 * ═══ POR QUE ESTE FICHEIRO EXISTE ═══
 * O dono viu o primeiro vídeo longo e apontou três coisas, e as três têm a MESMA raiz:
 *   · *"às vezes fala R$ 1.200 mas está mostrando um b-roll de R$ 5.000"*
 *   · *"tem muito b-roll, um atrás do outro, isso cansa muito"*
 *   · *"esses cards informativos poderiam ser usados mais, noutros formatos"*
 *
 * A raiz, medida no código que estava a correr: o escolhedor de imagens **nunca lia o
 * texto**. Era uma roda de 16 telas do catálogo — a cena 1 levava a primeira, a cena 2
 * a segunda — com uma única regra: não repetir a de trás. Trinta cenas, trinta telas do
 * app, nenhuma ligada ao que estava a ser dito. E as telas do catálogo têm números
 * gravados há meses (fatura R$ 1.240, limite R$ 5.000, saldo R$ 6.604,93), portanto
 * enquanto a voz dizia "mil e duzentos" o ecrã dizia outra coisa — literalmente.
 *
 * ═══ A REGRA NOVA, E VEM DA DESTILAÇÃO DO VOX (§16) ═══
 * *"lá todas as imagens e palavras é realmente o que aparece na tela"*.
 * Aqui isso traduz-se em duas metades, e a divisão é a regra da casa (§ verdade x gosto):
 *   · a VERDADE é de código: o número que vai ao ecrã sai da **lista fechada de valores
 *     do mapa** — nenhum outro pode aparecer, e há prova que o confere;
 *   · o GOSTO (qual das sete famílias de imagem, e por que ordem) é de código também,
 *     mas por REGRAS ESCRITAS, não por sorteio: o mesmo guião dá sempre o mesmo vídeo,
 *     e um defeito visual que só acontece "às vezes" é o pior tempo que se pode gastar.
 *
 * ═══ AS SETE FAMÍLIAS ═══
 *  1. `numero`   — o valor a nascer no ecrã no instante em que é dito (a 1ª vez que ele
 *                  aparece na história; as vezes seguintes viram ETIQUETA, ver abaixo)
 *  2. `conta`    — a ficha de dívida a construir-se linha a linha. É o **plano que o
 *                  vídeo quer que se lembre** (a destilação #9 do VOX), e acontece UMA vez
 *  3. `app`      — o app com os números DA HISTÓRIA, no capítulo que o mapa escolheu
 *  4. `frase`    — uma frase que o guião JÁ declara (título de capítulo, promessa, laço
 *                  aberto, resposta, bordão, a chamada). Nunca uma frase inventada aqui
 *  5. `metafora` — o ator do fio condutor, que hoje só vive 8 segundos na capa
 *  6. `palavras` — as palavras ditas, grandes, como imagem. É o cavalo de carga, e é o
 *                  que mais se aproxima do "o que se ouve é o que se lê"
 *  7. `broll`    — o app a sério, só nas cenas que falam de ver tudo num sítio só, e só
 *                  as composições que NÃO mostram dinheiro que contradiga a história
 *
 * ⚠️ **A ETIQUETA.** "mil e duzentos" é dito quatro vezes neste guião. Quatro cartões
 * grandes iguais seriam a monotonia de volta por outra porta. Por isso só a PRIMEIRA
 * vez tem cartão; as outras põem o valor como uma chapa pequena por cima da imagem que
 * lá estiver. O número continua sempre certo no ecrã — que é o que o dono pediu.
 *
 * ⚠️ **O QUE ESTE FICHEIRO NÃO FAZ:** não escreve texto novo, não chama IA nenhuma, não
 * gasta um cêntimo, e não toca em nada do Short.
 */

import { valoresEmDinheiro } from './schema-longo.js';

/** Sem acentos e em minúsculas — para as pistas abaixo casarem com fala real. */
const semAcento = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * 🔴 AS COMPOSIÇÕES DO CATÁLOGO QUE PODEM ENTRAR NUM VÍDEO DE DÍVIDA — e são ZERO.
 *
 * A primeira versão desta lista tinha três, e eu escrevi ao lado a razão: "usam a
 * gravação real com os telemóveis pequenos, lê-se «é o app», não se lê um número".
 * **Estava errado, e só se viu ao OLHAR O FOTOGRAMA** — que é a regra desta casa desde
 * 31/07 (§16.10), e é a segunda vez que ela apanha uma suposição minha.
 *
 * No fotograma do `AppCarrosselLong` a 1920×1080 lê-se, com todas as letras:
 * **"Fatura Atual a Pagar R$ 999,90"**, "Limite Total R$ 2.500,00", "Compra IPHONE
 * -R$ 950,00", "Seguro Carro -R$ 350,00". Num vídeo cuja história é uma fatura de
 * R$ 1.200, isso é exatamente a queixa do dono outra vez — *"fala R$ 1.200 mas está
 * mostrando um b-roll de R$ 5.000"* — só que agora com R$ 999,90.
 *
 * Fui ver as 16 composições do catálogo à procura de uma que não mostre dinheiro:
 *  · Cartões, Extrato, Balanço, Fluxo, Compras, Dashboard e `AppNumeros` — todas têm
 *    valores gravados, em letra grande;
 *  · Mosaico, Carrossel e Quadro — usam a gravação do ecrã, e os valores lêem-se;
 *  · **só o `SmartCapture3DLong`** (o menu dos quatro modos de captura) não tem dinheiro
 *    nenhum — mas fala de registar uma despesa em segundos, que não é o assunto de
 *    nenhuma cena deste guião. Pô-lo lá seria trocar um erro de número por um erro de
 *    assunto.
 *
 * **Então este vídeo fica sem b-roll do catálogo.** O app aparece na demonstração, que é
 * desenhada de raiz com os números da história (`TelaDoApp`, em `longo/telas.tsx`).
 * ⚠️ A família continua a existir e é o único sítio onde se acrescenta: no dia em que as
 * telas do catálogo souberem receber os valores do guião, elas voltam para aqui.
 */
export const BROLL_PERMITIDO = [];

/** Quantas vezes o b-roll do catálogo pode aparecer num vídeo. */
const TETO_DE_BROLL = 3;

/**
 * ⚠️ O TETO DA METÁFORA — e ele nasceu de uma corrida a sério, não de bom senso.
 * Sem teto, a pista do peso disparou **sete** vezes num guião de 933 palavras: é uma
 * história sobre carregar dívida, portanto "peso", "apertar" e "respirar" estão em toda
 * a parte. Sete aparições do mesmo ator seriam a monotonia de volta pela porta do lado —
 * e, pior, o ator deixaria de ser um MOMENTO para passar a ser o fundo do vídeo.
 * Quatro, com pelo menos três cenas de intervalo, mantém-no como pontuação.
 */
/**
 * ⚠️ DOIS, E NÃO QUATRO — baixado depois de o dono ver o vídeo:
 * *"essa animação do boneco aparece várias vezes repetidas, nós temos muitas outras,
 * não tem como encaixar as outras também, algo que faça sentido?"*
 *
 * Ele tem razão e a minha regra estava a puxar para o lado errado. A ideia do objeto
 * condutor (a destilação #1 do VOX) é que ele REGRESSE — mas quatro regressos em seis
 * minutos, sempre com o mesmo desenho, deixam de ser um regresso e passam a ser o
 * papel de parede. **Duas aparições fazem dele um momento: uma na abertura, outra na
 * virada.** Os lugares que sobram vão para as OUTRAS 32, que estavam paradas.
 */
const TETO_DE_METAFORA = 2;
const INTERVALO_DA_METAFORA = 3;

/** Quantos desenhos diferentes tem a família `palavras`. Ver `telas.tsx`. */
const VARIANTES_DE_PALAVRAS = 3;

/**
 * AS PISTAS. Cada família tem as suas palavras-gatilho, e elas foram tiradas do guião
 * aprovado — não são um palpite sobre português em geral.
 */
// "num lugar só", "tudo junto", "pulando de um app pro outro", "espalhado"
const PISTA_TUDO_JUNTO = /num (so |unico )?(lugar|sitio|lado)|num lugar so|tudo (num|em um|junto)|de uma vez so|pulando de|espalhad|todas as cobrancas|a conta inteira|mesmo lugar/;

/**
 * ⚠️ AS PISTAS DO PESO SÃO DUAS LISTAS, E A SEPARAÇÃO SAIU DE UMA CORRIDA A SÉRIO.
 *
 * Com uma lista só, a metáfora era gasta pelas pistas FRACAS antes de chegar à forte.
 * Medido no guião aprovado: o ator entrava na pergunta do capítulo 3 por causa de um
 * *"apertar as contas de casa"* e, três cenas depois, quando a narração dizia *"foi
 * igual levantar uma caixa pesada do jeito certo"* — que é **a** imagem do vídeo, a
 * virada inteira — já não havia orçamento nem intervalo para ele aparecer.
 *
 * Agora escolhe-se em duas passagens: primeiro reservam-se lugares para as FORTES (a
 * metáfora física, dita com todas as letras), e só o que sobrar vai para as FRACAS.
 */
const PISTA_PESO_FORTE = /peso|pesad|carreg|arrast|levantar|caixa|nas costas|mochila|pedra/;
const PISTA_PESO_FRACA = /sufoco|apert|respir|aliviad|em cima|preso|presa/;

/**
 * ═══ AS 32 ILUSTRAÇÕES QUE ESTAVAM PARADAS (04/08/2026, tarde) ═══
 *
 * O dono pediu: *"temos que criar mais variações de telas, e sermos mais ilustrativos,
 * não precisa ser em todo o vídeo, mas em certos pontos isso não deixa a audiência
 * sair"*. Antes de mandar gerar seja o que for, fui ver o que já existe: **o render do
 * Short tem 32 cenas animadas** — o ralo, a ampulheta, a ratoeira, a bola de ferro, a
 * areia movediça, o dominó, o castelo de cartas, a corda bamba, a escada, o cofre… E o
 * vídeo longo usava **uma**.
 *
 * ⚠️ ESTA TABELA É CURTA DE PROPÓSITO, e a razão é a queixa nº 1 dele. Uma tabela larga
 * acerta em mais cenas e ENGANA-SE em algumas — e uma ilustração que não bate com o que
 * se diz é exatamente o defeito que passámos o dia a consertar, só que agora em desenho
 * em vez de número. Aqui só entram pistas que não têm outra leitura possível. Quando
 * nenhuma casa, a cena fica nas palavras, que é sempre verdade.
 */
const ILUSTRACOES = [
  { figura: 'ratoeira', pista: /armadilha|caiu na|cai na|preso nessa|presa nessa|sem saida/ },
  // ⚠️ "vai saindo da conta" entrou depois de eu LER o guião aprovado em vez de imaginar
  // como as pessoas falam: a frase que abre este vídeo é *"o dinheiro vai saindo da
  // conta"* e a minha lista, escrita de cabeça, não a apanhava.
  { figura: 'ralo', pista: /vai saindo|sai da conta|vai embora|foi embora|escorre|sumindo|some do nada|escapa|vazando/ },
  { figura: 'buraco', pista: /buraco|fundo do poco|afunda|afundando/ },
  { figura: 'ampulheta', pista: /demora|demorei|leva tempo|com o tempo|foi passando|meses passa/ },
  { figura: 'relogio', pista: /todo mes|todo dia|virou costume|virou parte do meu dia|de novo e de novo|sempre na mesma/ },
  { figura: 'bifurcacao', pista: /escolher|escolhi|decidir|decisao|por qual|por onde comecar/ },
  { figura: 'escada', pista: /passo a passo|um de cada vez|aos poucos|degrau|primeiro passo/ },
  { figura: 'avalanche', pista: /bola de neve|foi crescendo|nao parava de crescer|nao para de crescer|acumul|amontoa|engordando/ },
  { figura: 'areia-movedica', pista: /nao sai(a|r)? do lugar|caladinho|sem fazer barulho|sem perceber|bem devagar|patinando/ },
  { figura: 'castelo-cartas', pista: /desmorona|desaba|veio tudo abaixo|caiu tudo/ },
  { figura: 'domino', pista: /um puxa o outro|em cadeia|uma atras da outra|efeito domino/ },
  { figura: 'boia', pista: /respirar|respirou|aliviad|folga no mes|voltar a tona/ },
  { figura: 'cofre', pista: /guardar|guardei|reserva|proteger|protege/ },
  { figura: 'balde-furado', pista: /furad|nao para em pe|nao sobra nada|ta furado/ },
];

/**
 * SEIS — subido de quatro no mesmo momento em que a metáfora desceu para dois.
 * É a mesma decisão vista do outro lado: o dono quer **variedade de desenhos**, não
 * ausência deles. Aqui cada aparição é uma figura DIFERENTE (há 32 e nunca se repete
 * uma), portanto seis não cansam como quatro do mesmo boneco cansavam.
 */
const TETO_DE_ILUSTRACOES = 6;
const INTERVALO_DA_ILUSTRACAO = 3;

/** Os nomes por que se apresenta cada valor da ficha de dívida quando ele vai ao ecrã. */
const ROTULOS_DA_FICHA = {
  fatura: 'a fatura do cartão',
  minimoPago: 'pagando só o mínimo',
  sobra: 'o que fica sem pagar',
  jurosDoRotativo: 'juros de um mês só',
  saldoParaParcelar: 'o que vira dívida',
  parcela: 'cada parcela, 12 vezes',
  totalPago: 'o total pago no fim',
  aMais: 'a mais do que a fatura',
};

/**
 * O DICIONÁRIO DE VALORES DO VÍDEO — valor → como se chama.
 * Sai do mapa (a lista fechada que o gerador já validou) e da ficha de dívida. Um valor
 * que não esteja aqui NÃO PODE ir ao ecrã: por definição, é de outra história.
 */
export function dicionarioDeValores(mapa = {}) {
  const dic = new Map();
  for (const v of mapa.valores || []) {
    if (Number.isFinite(v?.valor)) dic.set(v.valor, v.nome || 'o valor');
  }
  const ficha = mapa.fichaDeDivida;
  if (ficha) {
    for (const [campo, rotulo] of Object.entries(ROTULOS_DA_FICHA)) {
      const v = ficha[campo];
      // ⚠️ o que já está no mapa MANDA: o nome que o guião deu ao valor é o nome que a
      // pessoa vai ouvir, e o ecrã não pode chamar-lhe outra coisa.
      if (Number.isFinite(v) && !dic.has(v)) dic.set(v, rotulo);
    }
  }
  return dic;
}

/** Os valores DECLARADOS que esta cena diz, pela ordem em que aparecem no texto. */
export function valoresDitosNaCena(narration, dic) {
  return valoresEmDinheiro(narration).filter((v) => dic.has(v));
}

/** Quantas palavras seguidas bastam para dizer "esta frase está mesmo a ser dita". */
const PALAVRAS_PARA_RECONHECER = 6;

/**
 * A CENA ESTÁ MESMO A DIZER ESTA FRASE DECLARADA?
 *
 * O guião declara frases inteiras — a promessa, a resposta da promessa, o laço aberto —
 * e é ouro para pôr no ecrã: são frases já escritas, já revistas, já na voz do canal. O
 * problema é que o narrador nunca as diz à letra (na abertura a promessa ganha um
 * "Neste vídeo," à frente; no fecho, "fica possível" vira "dá pra").
 *
 * ⚠️ Por isso a régua é **seis palavras seguidas em comum**, e não a frase inteira. Com
 * a frase inteira nunca casava nada e a família ficava morta; com duas ou três palavras
 * casava a esmo ("o seu mês" aparece em todo o lado) e o ecrã prometia uma coisa que a
 * voz não estava a dizer. Seis é o ponto em que só casa quando é mesmo a mesma frase —
 * provado contra o guião aprovado: acerta na promessa e na resposta, e **recusa** o laço
 * aberto, que o fecho de facto parafraseou em vez de dizer.
 */
export function cenaDizFraseDeclarada(narration, frase) {
  const palavras = (t) => semAcento(t).replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
  const alvo = palavras(frase);
  const dito = palavras(narration).join(' ');
  if (alvo.length < PALAVRAS_PARA_RECONHECER) return false;
  for (let i = 0; i + PALAVRAS_PARA_RECONHECER <= alvo.length; i++) {
    if (dito.includes(alvo.slice(i, i + PALAVRAS_PARA_RECONHECER).join(' '))) return true;
  }
  return false;
}

/**
 * AS LINHAS DA CONTA — o plano-revelação, e cada linha é uma frase que a narração diz.
 * Repare que nenhuma delas é inventada aqui: saem todas da ficha do Banco Central que o
 * gerador já calculou, e todas estão na lista de valores permitidos.
 */
export function linhasDaConta(ficha) {
  if (!ficha) return [];
  return [
    { rotulo: 'A fatura', valor: ficha.fatura, tom: 'neutro' },
    { rotulo: 'Você paga o mínimo', valor: ficha.minimoPago, tom: 'bom' },
    { rotulo: 'Fica sem pagar', valor: ficha.sobra, tom: 'mau' },
    { rotulo: 'Um mês depois', valor: ficha.saldoParaParcelar, tom: 'mau' },
    { rotulo: '12 parcelas de', valor: ficha.parcela, tom: 'mau' },
    { rotulo: 'Você pagou, no fim', valor: ficha.totalPago, tom: 'mau', forte: true },
    { rotulo: 'A mais do que devia', valor: ficha.aMais, tom: 'alerta', forte: true },
  ].filter((l) => Number.isFinite(l.valor));
}

/**
 * AS FRASES QUE O MAPA DECLARA E QUE PODEM IR AO ECRÃ, pela ordem em que se tentam.
 * ⚠️ Só estas. Uma frase que não esteja aqui não é escrita no ecrã por este ficheiro —
 * a conferência (f) rejeita qualquer texto que o guião não tenha declarado.
 */
const DECLARADAS_NO_MAPA = [
  ['promessa', 'o que você vai levar deste vídeo'],
  ['respostaDaPromessa', 'a resposta'],
  ['lacoAberto', 'e ainda tem isto'],
];

/**
 * OS LUGARES DA METÁFORA — escolhidos em duas passagens, as fortes primeiro.
 * Devolve um mapa `índice da cena → estágio` (1, 2, 3…), porque o ator CRESCE ao longo
 * do vídeo e o render precisa de saber em que ponto da história ele está.
 */
export function escolherLugaresDaMetafora(cenas, fio) {
  const lugares = new Map();
  if (!fio) return lugares;

  const escolhidos = [];
  const cabe = (i) => escolhidos.every((j) => Math.abs(i - j) >= INTERVALO_DA_METAFORA);
  // ⚠️ as cenas em que o ator não pode entrar porque a imagem já está decidida por
  // VERDADE (um número dito, a conta, o app) — essas mandam sempre.
  const livre = (c) => c.parte !== 'demonstracao' && c.parte !== 'chamada';

  for (const pista of [PISTA_PESO_FORTE, PISTA_PESO_FRACA]) {
    cenas.forEach((c, i) => {
      if (escolhidos.length >= TETO_DE_METAFORA) return;
      if (escolhidos.includes(i) || !livre(c) || !pista.test(semAcento(c.narration)) || !cabe(i)) return;
      escolhidos.push(i);
    });
  }

  escolhidos.sort((a, b) => a - b).forEach((i, n) => lugares.set(i, n + 1));
  return lugares;
}

/**
 * OS LUGARES DAS ILUSTRAÇÕES — escolhidos depois dos da metáfora, e nunca por cima.
 *
 * ⚠️ Três guardas, e cada uma tem um motivo:
 *  · **nunca a figura do fio condutor** — essa é o objeto condutor do vídeo e tem
 *    família própria; repetida aqui deixava de ser um regresso e passava a ser mobília;
 *  · **nunca a mesma figura duas vezes** no mesmo vídeo, pela mesma razão;
 *  · **teto e intervalo**, porque quatro ilustrações espalhadas são pontuação e dez
 *    seguidas são a monotonia outra vez, só que às cores.
 */
/**
 * ⚠️ `ocupados` É O PARÂMETRO QUE FALTAVA, e faltar custou duas ilustrações de três.
 *
 * A 1ª versão escolhia os lugares olhando só para o TEXTO, sem saber quais as cenas que
 * as regras de cima já iam levar. Medido no guião aprovado: escolheu três lugares e
 * **dois deles eram cenas que já tinham dono** (um re-gancho e o fecho, ambos com frase
 * declarada). O vídeo ficou com UMA ilustração das quatro possíveis — e ninguém se
 * queixava, porque nada estava errado, só desperdiçado.
 * Agora recebe a lista do que já está tomado e escolhe apenas entre o que sobra.
 */
export function escolherLugaresDaIlustracao(cenas, lugaresDaMetafora = new Map(), fio = null, ocupados = new Set()) {
  const lugares = new Map();
  const usadas = new Set(fio ? [fio] : []);
  const escolhidos = [];
  // ⚠️ O intervalo entre ILUSTRAÇÕES é 3, mas para a METÁFORA basta 2 — e a diferença é
  // deliberada. Duas ilustrações perto uma da outra lêem-se como "o vídeo agora é de
  // desenhos"; uma ilustração ao lado do ator lê-se como duas coisas diferentes, que é o
  // que se quer. Com 3 dos dois lados, este guião só arranjava lugar para duas.
  const cabe = (i) => escolhidos.every((j) => Math.abs(i - j) >= INTERVALO_DA_ILUSTRACAO)
    && ![...lugaresDaMetafora.keys()].some((j) => Math.abs(i - j) < 2);
  const livre = (c, i) => !lugaresDaMetafora.has(i) && !ocupados.has(i)
    && c.parte !== 'demonstracao' && c.parte !== 'chamada';

  cenas.forEach((c, i) => {
    if (escolhidos.length >= TETO_DE_ILUSTRACOES) return;
    if (!livre(c, i) || !cabe(i)) return;
    const texto = semAcento(c.narration);
    const achada = ILUSTRACOES.find((x) => !usadas.has(x.figura) && x.pista.test(texto));
    if (!achada) return;
    usadas.add(achada.figura);
    escolhidos.push(i);
    lugares.set(i, achada.figura);
  });

  return lugares;
}

/**
 * ═══ O DIRETOR ═══
 * Recebe as cenas já partidas e o mapa do guião; devolve as mesmas cenas com um campo
 * `visual` cada. Determinístico: o mesmo guião dá sempre o mesmo vídeo.
 */
export function dirigirImagens(cenas, mapa = {}) {
  const dic = dicionarioDeValores(mapa);
  const ficha = mapa.fichaDeDivida;
  const capituloDoApp = mapa.capituloDaDemonstracao;
  const fio = mapa.fioCondutor || null;

  const jaMostrado = new Set(); // valores que já tiveram cartão grande
  let contaFeita = false;
  let brollUsado = 0;
  let iBroll = 0;
  let passoDoApp = 0;

  /**
   * A 1ª PASSAGEM DA METÁFORA — decidida ANTES de se desenhar cena nenhuma.
   * Sem isto, quem chegasse primeiro levava o lugar, e quem chega primeiro num texto
   * sobre dívida é sempre uma pista fraca. Aqui as fortes escolhem primeiro.
   */
  const lugaresDaMetafora = escolherLugaresDaMetafora(cenas, fio);

  const primeiraPassagem = cenas.map((c, indice) => {
    const texto = semAcento(c.narration);
    const ditos = valoresDitosNaCena(c.narration, dic);
    const novos = ditos.filter((v) => !jaMostrado.has(v));

    /** A etiqueta que acompanha a imagem quando o valor JÁ teve o seu cartão. */
    const etiquetaDe = (v) => (Number.isFinite(v) ? { valor: v, rotulo: dic.get(v) } : null);

    // 1. A DEMONSTRAÇÃO — o app, com os números da história. Um capítulo só, e é o
    //    mapa que o escolhe (§35.2): nos outros o nome do app nem pode ser dito.
    //    ⚠️ O parágrafo da demonstração tem ~73 palavras, portanto dá DUAS cenas. Elas
    //    não podem mostrar a mesma coisa: o `passo` faz o ecrã crescer com a narração —
    //    primeiro a fatura a aparecer, depois a linha do que ainda falta e as cobranças
    //    a juntarem-se num sítio só, que é exatamente o que a voz descreve.
    if (c.parte === 'demonstracao' || (c.capitulo === capituloDoApp && /finmoovi/.test(texto))) {
      const valor = ditos[0] ?? mapa.numeroEspinha;
      ditos.forEach((v) => jaMostrado.add(v));
      passoDoApp += 1;
      return { ...c, visual: { tipo: 'app', passo: passoDoApp, valor, rotulo: dic.get(valor) || 'a fatura do cartão' } };
    }

    // 2. A CONTA — uma vez por vídeo, na cena que diz quanto se paga A MAIS. É o
    //    plano-revelação: a única imagem que este vídeo quer que fique na memória.
    if (!contaFeita && ficha && ditos.includes(ficha.aMais)) {
      contaFeita = true;
      ditos.forEach((v) => jaMostrado.add(v));
      return { ...c, visual: { tipo: 'conta', linhas: linhasDaConta(ficha), destaque: ficha.aMais } };
    }

    // 3. O CARTÃO DE NÚMERO — só na PRIMEIRA vez que o valor entra na história.
    if (novos.length) {
      const valor = novos[0];
      jaMostrado.add(valor);
      ditos.forEach((v) => jaMostrado.add(v));
      return { ...c, visual: { tipo: 'numero', valor, rotulo: dic.get(valor) } };
    }

    const etiqueta = etiquetaDe(ditos[0]);

    // 4. A CHAMADA — a palavra que a pessoa tem de escrever no comentário PRECISA de
    //    estar escrita no ecrã. No Short está; no longo não estava.
    if (c.parte === 'chamada') {
      return { ...c, visual: { tipo: 'frase', texto: 'Comenta FINMOOVI', etiquetaTexto: 'aqui nos comentários', variante: 'chamada' } };
    }

    // 5. A METÁFORA — o ator do fio condutor, nos lugares reservados na 1ª passagem.
    //    É a destilação #1 do VOX: o objeto condutor que atravessa o vídeo e escala.
    if (lugaresDaMetafora.has(indice)) {
      return { ...c, visual: { tipo: 'metafora', fio, estagio: lugaresDaMetafora.get(indice), etiqueta } };
    }

    // 6. UMA FRASE QUE O GUIÃO JÁ DECLARA e que esta cena está mesmo a dizer — a
    //    promessa, a resposta da promessa, o laço aberto. É o pedido do dono de usar
    //    mais os cartões, sem inventar uma linha de texto que ninguém reviu.
    for (const [chave, etiquetaTexto] of DECLARADAS_NO_MAPA) {
      const frase = mapa[chave];
      if (frase && cenaDizFraseDeclarada(c.narration, frase)) {
        return { ...c, visual: { tipo: 'frase', texto: frase, etiquetaTexto, variante: chave, etiqueta } };
      }
    }

    // 7. O B-ROLL DO APP — só onde a narração fala de juntar tudo num sítio, e no
    //    máximo três vezes no vídeo inteiro.
    if (BROLL_PERMITIDO.length && PISTA_TUDO_JUNTO.test(texto) && brollUsado < TETO_DE_BROLL) {
      const escolha = BROLL_PERMITIDO[iBroll++ % BROLL_PERMITIDO.length];
      brollUsado++;
      return { ...c, visual: { tipo: 'broll', comp: escolha.comp, brollFrames: escolha.frames, etiqueta } };
    }

    // 8. O RE-GANCHO — o que fica em aberto está escrito no mapa, capítulo a capítulo.
    if (c.parte === 'regancho' && c.capitulo) {
      const aberto = mapa.capitulos?.[c.capitulo - 1]?.oQueFicaEmAberto;
      if (aberto) return { ...c, visual: { tipo: 'frase', texto: aberto, etiquetaTexto: 'o que vem a seguir', variante: 'gancho', etiqueta } };
    }

    // 9. O CAVALO DE CARGA — as palavras ditas, grandes, como imagem.
    return { ...c, visual: { tipo: 'palavras', etiqueta } };
  });

  /**
   * A 2ª PASSAGEM — as ilustrações entram SÓ onde sobrou lugar.
   *
   * ⚠️ Tinha de ser depois, e a razão está medida: escolhidas antes, elas caíam em cenas
   * que as regras de cima já iam levar (um re-gancho e o fecho, ambos com frase
   * declarada), e o vídeo ficava com uma ilustração das quatro possíveis. Só as cenas
   * que acabaram em `palavras` estão mesmo livres — são as que não têm número para
   * mostrar nem frase escrita para citar, e por isso são exatamente as que mais
   * beneficiam de um desenho.
   */
  const livres = new Set(primeiraPassagem.map((c, i) => (c.visual.tipo === 'palavras' ? i : -1)).filter((i) => i >= 0));
  const ocupados = new Set(cenas.map((_, i) => i).filter((i) => !livres.has(i)));
  const lugaresDaIlustracao = escolherLugaresDaIlustracao(cenas, lugaresDaMetafora, fio, ocupados);

  const dirigida = primeiraPassagem.map((c, i) => (
    lugaresDaIlustracao.has(i)
      ? { ...c, visual: { tipo: 'ilustracao', figura: lugaresDaIlustracao.get(i), etiqueta: c.visual.etiqueta } }
      : c
  ));

  return numerarVariantes(equilibrar(dirigida, { fio }));
}

/**
 * ⚠️ O EQUILÍBRIO — e é ele que ataca a segunda queixa do dono ("um atrás do outro").
 *
 * As regras de cima decidem cena a cena e não sabem o que veio antes; sem esta passagem,
 * cinco cenas seguidas de história davam cinco ecrãs de `palavras` iguais, que é o mesmo
 * defeito de antes com outra roupa. A regra: **três iguais seguidas nunca**, e a do meio
 * troca para a alternativa mais barata que existir — a metáfora se houver fio condutor,
 * senão o b-roll, senão fica como está (nunca se estraga uma imagem certa por variedade).
 */
export function equilibrar(cenas, { fio = null } = {}) {
  const fioReal = fio || cenas.find((c) => c.visual?.fio)?.visual?.fio || null;
  const saida = cenas.map((c) => ({ ...c }));
  let estagio = Math.max(0, ...saida.map((c) => c.visual?.estagio || 0));
  let ultimaMetafora = saida.reduce((a, c, i) => (c.visual?.tipo === 'metafora' ? i : a), -Infinity);
  let brollUsado = saida.filter((c) => c.visual?.tipo === 'broll').length;
  let iBroll = brollUsado;

  for (let i = 2; i < saida.length; i++) {
    const t = saida[i].visual?.tipo;
    if (!t) continue;
    if (saida[i - 1].visual?.tipo !== t || saida[i - 2].visual?.tipo !== t) continue;
    // a do MEIO é a que troca: mexer na última faria a próxima cena começar já em dívida
    const meio = saida[i - 1];
    // ⚠️ OS TETOS VALEM AQUI TAMBÉM, e isto não é detalhe: sem eles esta passagem
    // desfazia sozinha o limite de quatro metáforas que a de cima acabou de respeitar.
    if (fioReal && estagio < TETO_DE_METAFORA && (i - 1) - ultimaMetafora >= INTERVALO_DA_METAFORA) {
      estagio += 1;
      ultimaMetafora = i - 1;
      meio.visual = { ...meio.visual, tipo: 'metafora', fio: fioReal, estagio };
    } else if (BROLL_PERMITIDO.length && brollUsado < TETO_DE_BROLL) {
      const escolha = BROLL_PERMITIDO[iBroll++ % BROLL_PERMITIDO.length];
      brollUsado++;
      meio.visual = { ...meio.visual, tipo: 'broll', comp: escolha.comp, brollFrames: escolha.frames };
    }
    // Se os dois orçamentos acabaram, a cena FICA como está. Trocar uma imagem certa
    // por uma errada só para haver variedade é o defeito, não a cura — e a família
    // `palavras` tem três desenhos diferentes, que é o que a passagem abaixo trata.
  }
  return saida;
}

/**
 * OS TRÊS DESENHOS DAS PALAVRAS — a última defesa contra a mancha cinzenta.
 *
 * Quando os orçamentos da metáfora e do b-roll acabam, sobra uma corrida de cenas de
 * `palavras`. Elas não são iguais: há três desenhos (centrado · alinhado à esquerda com
 * barra de acento · com a palavra-chave destacada em cima), e a variante roda pela
 * ORDEM em que as cenas aparecem — portanto duas seguidas nunca têm o mesmo desenho.
 * É o mínimo honesto: o ecrã muda mesmo, não é uma desculpa escrita no validador.
 */
export function numerarVariantes(cenas) {
  let n = 0;
  return cenas.map((c) => {
    if (c.visual?.tipo !== 'palavras') return c;
    const variante = n++ % VARIANTES_DE_PALAVRAS;
    return { ...c, visual: { ...c.visual, variante } };
  });
}

/**
 * A CONFERÊNCIA — o que esta é e o que não é.
 * Ela NÃO julga se a imagem é bonita (isso é gosto, e mede-se olhando o fotograma).
 * Ela julga o que é VERDADE e se pode provar com o guião na mão.
 */
export function conferirImagens(cenas, mapa = {}) {
  const erros = [];
  const dic = dicionarioDeValores(mapa);

  // (a) TODO número que vai ao ecrã tem de estar na lista fechada do mapa
  for (const c of cenas) {
    const v = c.visual || {};
    const numerosNoEcra = [
      ...(Number.isFinite(v.valor) ? [v.valor] : []),
      ...(v.etiqueta && Number.isFinite(v.etiqueta.valor) ? [v.etiqueta.valor] : []),
      ...((v.linhas || []).map((l) => l.valor)),
    ];
    for (const n of numerosNoEcra) {
      if (!dic.has(n)) erros.push(`cena ${c.id}: o ecrã mostra ${n}, que não está na lista de valores do mapa`);
    }
  }

  // (b) o app aparece num CAPÍTULO só — o que o mapa escolheu.
  // ⚠️ A régua é o capítulo, não a cena: o parágrafo da demonstração tem ~73 palavras e
  // parte-se em duas cenas. Contar cenas reprovava a montagem certa, que é o defeito
  // que esta casa já apanhou vinte vezes — a trava a punir o que o desenho manda fazer.
  const apps = cenas.filter((c) => c.visual?.tipo === 'app');
  const capitulosComApp = [...new Set(apps.map((c) => c.capitulo))];
  if (capitulosComApp.length > 1) {
    erros.push(`o app aparece nos capítulos ${capitulosComApp.join(' e ')} — o mapa dá-lhe um`);
  }
  for (const a of apps) {
    if (mapa.capituloDaDemonstracao && a.capitulo !== mapa.capituloDaDemonstracao) {
      erros.push(`cena ${a.id}: o app aparece no capítulo ${a.capitulo}, e o mapa escolheu o ${mapa.capituloDaDemonstracao}`);
    }
  }

  // (c) a conta é o plano-revelação: uma, e só uma
  const contas = cenas.filter((c) => c.visual?.tipo === 'conta').length;
  if (contas > 1) erros.push(`a conta aparece ${contas} vezes — ela é o plano que o vídeo quer que se lembre, e isso é uma vez`);

  // (d) nunca três imagens IGUAIS seguidas.
  // ⚠️ "iguais" mede-se pelo que aparece no ecrã, não pelo nome da família: três cenas
  // de `palavras` com desenhos diferentes são três ecrãs diferentes, e reprová-las seria
  // a trava a punir o que o desenho já resolveu (a armadilha nº 1 desta casa).
  const assinatura = (v = {}) => `${v.tipo}${v.tipo === 'palavras' ? `/${v.variante}` : ''}`;
  for (let i = 2; i < cenas.length; i++) {
    const a = assinatura(cenas[i].visual);
    if (!cenas[i].visual) continue;
    if (assinatura(cenas[i - 1].visual) === a && assinatura(cenas[i - 2].visual) === a) {
      erros.push(`cenas ${cenas[i - 2].id}, ${cenas[i - 1].id} e ${cenas[i].id} mostram a mesma coisa ("${a}") — três iguais seguidas cansam`);
    }
  }

  // (d2) os tetos da metáfora e do b-roll
  const metaforas = cenas.filter((c) => c.visual?.tipo === 'metafora');
  if (metaforas.length > TETO_DE_METAFORA) {
    erros.push(`${metaforas.length} cenas com o ator do fio condutor — o teto é ${TETO_DE_METAFORA}, senão ele deixa de ser um momento e passa a ser o fundo`);
  }

  // (d3) as ilustrações: teto, nunca repetidas, e nunca a figura do fio condutor
  const ilustracoes = cenas.filter((c) => c.visual?.tipo === 'ilustracao');
  if (ilustracoes.length > TETO_DE_ILUSTRACOES) {
    erros.push(`${ilustracoes.length} ilustrações — o teto é ${TETO_DE_ILUSTRACOES}`);
  }
  const figuras = ilustracoes.map((c) => c.visual.figura);
  const repetida = figuras.find((f, i) => figuras.indexOf(f) !== i);
  if (repetida) erros.push(`a ilustração "${repetida}" aparece mais do que uma vez — há 32 desenhadas, não é preciso repetir`);
  const fioDoVideo = mapa.fioCondutor;
  if (fioDoVideo && figuras.includes(fioDoVideo)) {
    erros.push(`a ilustração "${fioDoVideo}" é o fio condutor do vídeo — ela tem família própria e não pode entrar como ilustração avulsa`);
  }

  // (e) o b-roll do catálogo tem teto
  const brolls = cenas.filter((c) => c.visual?.tipo === 'broll');
  if (brolls.length > TETO_DE_BROLL) erros.push(`${brolls.length} cenas de b-roll do catálogo — o teto é ${TETO_DE_BROLL}`);
  for (const b of brolls) {
    if (!BROLL_PERMITIDO.some((x) => x.comp === b.visual.comp)) {
      erros.push(`cena ${b.id}: "${b.visual.comp}" não está na lista de b-roll permitido (as outras mostram dinheiro de outra história)`);
    }
  }

  // (f) toda frase que vai ao ecrã foi ESCRITA pelo guião, não inventada aqui
  const declaradas = new Set([
    'Comenta FINMOOVI',
    ...(mapa.capitulos || []).flatMap((c) => [c.titulo, c.oQueFicaEmAberto, c.oQueAcrescenta]).filter(Boolean),
    mapa.promessa, mapa.lacoAberto, mapa.respostaDaPromessa,
  ].filter(Boolean));
  for (const c of cenas.filter((x) => x.visual?.tipo === 'frase')) {
    if (!declaradas.has(c.visual.texto)) {
      erros.push(`cena ${c.id}: a frase no ecrã ("${String(c.visual.texto).slice(0, 40)}…") não está declarada no guião`);
    }
  }

  return erros;
}
