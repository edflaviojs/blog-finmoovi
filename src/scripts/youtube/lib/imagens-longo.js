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

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { valoresEmDinheiro, CHAMADA_NO_ECRA, CHAMADA_ETIQUETA_ECRA } from './schema-longo.js';

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
/**
 * ═══ ✅ 10/08/2026 — O B-ROLL VOLTOU, E O NÚMERO É O DA HISTÓRIA ═══
 *
 * Ordem do dono: *"não temos b-rolls separados em formatos de vídeos longos??? são esses
 * que você tem que usar!"*. Tem razão — e a nota acima já dizia o que faltava: *"no dia
 * em que as telas do catálogo souberem receber os valores do guião, elas voltam para
 * aqui"*. Aprenderam (`youtube-render/src/broll/valores-da-historia.tsx`).
 *
 * ⚠️ **O SHORT DIÁRIO NÃO PODE MUDAR, e não muda por construção.** As telas leem os
 * números de um envelope que só o vídeo longo abre; sem envelope devolve-se o objeto
 * original, campo a campo. É a mesma forma que fez o Short de 16s não mudar um único
 * pixel de 2.073.600 em 08/08.
 *
 * ⚠️ **SÓ ENTRAM AS QUE SABEM RECEBER OS VALORES, e são estas.** As que usam a GRAVAÇÃO
 * do ecrã (Mosaico, Carrossel, Quadro) ficam de fora para sempre: lá o número está dentro
 * do vídeo gravado e nenhum parâmetro o muda. Balanço, Fluxo e Compras ainda não foram
 * ensinadas — entram quando forem, e não antes.
 *
 * ⚠️ **`SmartCapture3DLong` entra sem envelope nenhum** e é de propósito: é o menu dos
 * quatro modos de captura e **não tem dinheiro nenhum no ecrã**. Foi a única que já podia
 * ter entrado desde sempre.
 */
/**
 * ═══ 🔴 A `pista` ESTAVA ESCRITA AQUI E NINGUÉM A LIA — 10/08/2026 ═══
 *
 * ═══ O QUE SE MEDIU, no vídeo `onde-o-salario-some` ═══
 * A escolha era `BROLL_PERMITIDO[i++ % 4]` — **rodízio cego**, nos dois sítios que
 * escolhem b-roll. O campo `pista`, que diz quando cada tela faz sentido, nunca era
 * consultado. Resultado medido, com a demonstração deste vídeo na tela **das Contas**:
 *
 * | tela que aparecia | o que a voz dizia | |
 * |---|---|---|
 * | Captura de recibo | *"quando você olha uma conta de cada vez…"* | ❌ |
 * | Captura por voz | *"eu e minha avó olhávamos para o dinheiro…"* | ❌ |
 * | **Cartão de crédito** | *"o app somou tudo e mostrou o total de mil e duzentos"* | ❌ |
 * | Extrato | *"quatrocentos mais trezentos…"* | ✅ |
 * | **Cartão de crédito** | *"dinheiro espalhado em mais de uma conta"* | ❌ |
 * | Extrato | *"quando você coloca tudo no mesmo lugar"* | ✅ |
 *
 * **Quatro em seis erradas, e um cartão de crédito duas vezes numa história que não tem
 * cartão nenhum.** São as duas queixas mais repetidas do dono ao mesmo tempo: *"o roteiro
 * só ataca sobre cartão"* e *"o ecrã diz uma coisa enquanto a voz diz outra"*.
 *
 * ═══ 🔑 A FAMÍLIA DE DEFEITO, QUE É A COISA A LEVAR DAQUI ═══
 * **Um campo de dados que descreve uma regra, escrito, e nenhum código o lê.** Não dá
 * erro, não fica vermelho, e só se vê OLHANDO o fotograma. Já mordeu quatro vezes:
 *   · `METAPHOR_MEANINGS` — 32 significados escritos, e o ilustrador usava `regex` (§67.3);
 *   · `fioCondutor` — a metáfora do vídeo, e a capa nunca a usou (09/08);
 *   · `numeroEspinha` — no caderno, e a capa procurava-o no ficheiro errado (10/08);
 *   · `pista` do b-roll — aqui.
 *
 * **A cura não é ler a `pista`: é a TRAVA.** Ver `conferirImagens`, alínea (e): uma tela
 * que a história não comporta é agora um ERRO, e há prova que a faz morder. Ler o campo
 * conserta hoje; a trava é que impede a quinta vez.
 *
 * ⚠️ **`exige` é o que a história tem de ter para a tela poder aparecer.** Não é gosto:
 * é `verdade-versus-gosto` — ou o mapa tem uma conta de cartão, ou não tem.
 */
export const BROLL_PERMITIDO = [
  {
    comp: 'CartoesCountUpLong',
    frames: 210,
    familia: 'cartoes',
    pista: /fatura|cartao|limite|parcel/i,
    // 🔴 Sem uma conta de cartão na história, esta tela mostra uma dívida que ninguém tem.
    //    E sem números da história, mostraria a fatura da GRAVAÇÃO (R$ 1.240).
    exige: (mapa) => (Boolean(mapa?.contaDoCartao) || Boolean(mapa?.fichaDeDivida)) && temDinheiroNaHistoria(mapa),
    porqueNao: 'esta história não tem cartão de crédito nenhum',
  },
  {
    comp: 'ExtratoListaLong',
    frames: 210,
    familia: 'extrato',
    // ⚠️ **`junt` saiu daqui, e é uma lição.** Ao alargar a pista para esta tela "casar
    //    mais", ela passou a casar com quase tudo — porque `juntar tudo` é justamente a
    //    frase que MANDA entrar b-roll. Resultado medido: o Extrato quatro vezes em seis.
    //    Uma pista que casa com tudo não é uma pista; é o rodízio cego outra vez.
    pista: /extrato|entrou|saiu|lancament|conta do banco|saldo|somou/i,
    // O extrato serve qualquer história de dinheiro — mas **só se ela tiver números**.
    // 🔴 Sem eles, esta tela sai com o saldo e as linhas da GRAVAÇÃO (R$ 3.754,91,
    //    aluguel de R$ 1.500…), que é o defeito que ela própria existe para não ter.
    exige: (mapa) => temDinheiroNaHistoria(mapa),
    porqueNao: 'esta história não tem números com que encher a tela',
  },
  {
    /**
     * ═══ A ROSCA DO BALANÇO — 12/08/2026 ═══
     * Ordem do dono: mais telas do app, para as seis cenas de b-roll deixarem de girar
     * entre quatro. Esta é a única das três que faltavam que se pode encher **sem
     * inventar** — ver `somaUsavel` e a nota em `broll/balanco.ts`.
     *
     * ⚠️ **`junt` está de fora da pista de propósito.** Foi tirado do Extrato pela mesma
     * razão: *"juntar tudo"* é justamente a frase que MANDA entrar b-roll, e uma pista
     * que casa com tudo não é uma pista.
     */
    comp: 'BalancoDonutLong',
    frames: 210,
    familia: 'balanco',
    pista: /soma|somad|somand|no total|ao todo|para onde (foi|vai)|dividid|reparti|fatia|percent|por cento/i,
    // 🔴 Sem uma soma DECLARADA no mapa, uma rosca desenha pedaços de um todo que
    //    ninguém disse existir — e os rótulos chamariam "despesas" ao que a voz não
    //    chamou de nada. Ver `somaUsavel`.
    exige: (mapa) => Boolean(somaUsavel(mapa)),
    porqueNao: 'esta história não declarou nenhuma soma (que valores fazem parte de qual total)',
  },
  {
    comp: 'SmartCapture3DLong',
    frames: 210,
    familia: null,
    pista: /registrar|anotar|lancar|foto do recibo|nota fiscal|recibo|comprovante/i,
    exige: () => true,
  },
  {
    comp: 'SmartCaptureVozLong',
    frames: 210,
    familia: null,
    pista: /falar|por voz|ditar|dizer para o app/i,
    exige: () => true,
  },
];

/**
 * As telas que ESTE vídeo pode mostrar. **Nunca devolve vazio** — se a história não
 * comportar nenhuma, o vídeo sai sem b-roll do catálogo, que é melhor do que sair com uma
 * tela que a contradiz.
 */
export function brollDoVideo(mapa) {
  return BROLL_PERMITIDO.filter((b) => b.exige(mapa));
}

/**
 * ⚠️ **NENHUMA TELA MAIS DO QUE DUAS VEZES, e o número é a conta.** São 6 cenas de b-roll
 * e 3 telas disponíveis num vídeo sem cartão: 2 cada dá exactamente 6.
 * ⚠️ **12/08: com a rosca do Balanço são 4** numa história que declare uma soma — e aí o
 * teto deixa de ser o que aperta (4 × 2 = 8 para 6 cenas). Fica em dois na mesma: o que
 * ele impede é a MESMA tela sair três vezes, e isso não muda com o catálogo a crescer.
 *
 * 🔴 **Isto nasceu de um erro meu, no mesmo dia.** Ao pôr a `pista` a mandar, sem contar
 * as repetições, o vídeo saiu com o **Extrato quatro vezes em seis** — troquei "tela
 * errada" por "tela repetida", que é o mesmo defeito com outra roupa (a monotonia
 * mede-se em repetição do MESMO ecrã). A fala manda **entre as que ainda têm vez**.
 */
const TETO_POR_TELA = 2;

/**
 * Qual tela para esta cena: **a que a fala pede**, entre as que ainda têm vez; e só
 * quando nenhuma pede é que se escolhe a menos usada.
 *
 * ⚠️ **O rodízio FICA como rede, e é de propósito.** A passagem do equilíbrio mete b-roll
 * em cenas escolhidas por serem a terceira igual seguida — essas podem não falar de nada
 * que uma tela peça. Aí é melhor uma tela genérica do que a terceira tela de palavras.
 * O que não pode é o rodízio passar à frente de uma tela que a fala PEDIU.
 *
 * @param usos Map ou objeto `comp -> quantas vezes já saiu neste vídeo`.
 */
export function escolherBroll(texto, permitidas, usos = {}) {
  if (!permitidas.length) return null;
  const quantas = (b) => Number((usos instanceof Map ? usos.get(b.comp) : usos[b.comp]) || 0);
  // ⚠️ Se o teto já apanhou todas, ele cede — repetir é melhor do que não haver tela.
  const comVez = permitidas.filter((b) => quantas(b) < TETO_POR_TELA);
  const candidatas = comVez.length ? comVez : permitidas;
  const pedidas = candidatas.filter((b) => b.pista.test(semAcento(String(texto || ''))));
  const lista = pedidas.length ? pedidas : candidatas;
  // A menos usada; empate desfeito pela ordem da lista, que é estável.
  return lista.reduce((a, b) => (quantas(b) < quantas(a) ? b : a), lista[0]);
}

/**
 * OS NÚMEROS DESTA HISTÓRIA, no formato que as telas do catálogo esperam.
 *
 * 🔴 **NÃO INVENTA NEM CALCULA NENHUM VALOR FALADO** — é a regra mais antiga deste
 * ficheiro. Só usa números que já estão na lista fechada do mapa (`mapa.valores`) ou o
 * número-espinha, que são os únicos que a voz diz. Sem número nenhum devolve `null`, e a
 * tela sai com os números da gravação — que é o comportamento de sempre.
 *
 * ⚠️ **O limite e o disponível são DERIVADOS**, e isso é desenho, não conteúdo: um limite
 * tem de ser maior do que a fatura, senão a barra aparece cheia e conta uma história que
 * a voz não contou. A régua é o dobro arredondado à centena de cima. **Nunca é falado.**
 */
/**
 * O rótulo de uma linha, curto o bastante para caber na tela.
 *
 * ⚠️ **Corta em palavra inteira e deixa reticências**, e a diferença importa: um rótulo
 * de lista com "…" lê-se como continuação; um cortado a meio da palavra lê-se como um
 * defeito. (Uma miniatura é outro caso — lá não se corta de todo. Ver `tituloDaCapa`.)
 */
function rotuloCurto(texto, maximo = 30) {
  const t = String(texto || '').trim().replace(/\s+/g, ' ');
  if (t.length <= maximo) return t;
  const cortado = t.slice(0, maximo);
  return `${cortado.slice(0, cortado.lastIndexOf(' ')).replace(/[,;:.]$/, '')}…`;
}

/**
 * ═══ 🔴 AS LINHAS DE LANÇAMENTO TAMBÉM MOSTRAVAM DINHEIRO DE OUTRA HISTÓRIA — 10/08 ═══
 *
 * De manhã, esta função ensinou o **saldo grande** da tela do Extrato a receber o número
 * da história. **As quatro linhas por baixo dele continuaram com os valores da gravação**
 * — R$ 1.500,00 de aluguel, R$ 159,20 de luz, R$ 235,89 de supermercado — e só se viu
 * **olhando o fotograma** do vídeo já renderizado, ao fim do dia.
 *
 * É a queixa nº 1 do dono um andar abaixo de onde ela foi consertada. E é a lição de que
 * **consertar "o número" não é o mesmo que consertar "os números"**: o sítio onde se
 * olhou ficou certo e o do lado ficou como estava.
 *
 * ⚠️ **As linhas passam a ser os OUTROS valores da história**, sem sinal (`neutro`): a
 * história dá saldos, não movimentos, e pintar um saldo de verde com um `+` seria dizer
 * que entrou dinheiro — informação que a voz não deu. Ver `ExtratoLista.tsx`.
 */
export function valoresDoBroll(escolha, mapa) {
  if (!escolha?.familia || !mapa) return null;
  const entradas = (mapa.valores || [])
    .map((v) => ({ nome: String(v.nome || '').trim(), valor: Number(v.valor) }))
    .filter((v) => Number.isFinite(v.valor) && v.valor > 0);
  const daLista = entradas.map((v) => v.valor);
  const espinha = Number(mapa.numeroEspinha);
  const valor = daLista.length ? Math.max(...daLista) : (Number.isFinite(espinha) ? espinha : null);
  if (!valor) return null;

  const dinheiro = (n) => `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (escolha.familia === 'cartoes') {
    const limite = Math.ceil((valor * 2) / 100) * 100;
    return {
      cartoes: {
        fatura: dinheiro(valor),
        faturaValue: valor,
        limiteTotal: dinheiro(limite),
        limiteTotalValue: limite,
        limiteDisponivel: dinheiro(limite - valor),
        limiteDisponivelValue: limite - valor,
      },
    };
  }
  if (escolha.familia === 'extrato') {
    /**
     * ⚠️ **O MAIOR VALOR É O SALDO GRANDE, e sai da lista das linhas** — senão o mesmo
     * número aparecia duas vezes no ecrã, uma vez em cima e outra na lista.
     * ⚠️ **Tira-se UMA ocorrência e não todas as iguais:** se a história tiver dois
     * valores de 300, os dois continuam a ser ditos pela voz e os dois podem aparecer.
     */
    const linhas = [...entradas];
    const iMaior = linhas.findIndex((v) => v.valor === valor);
    if (iMaior >= 0) linhas.splice(iMaior, 1);
    return {
      extrato: {
        saldoAtualValue: valor,
        // ⚠️ Quatro é o que cabe na tela sem encolher a letra. Se a história tiver mais,
        //    entram os quatro primeiros — nenhum inventado, apenas menos.
        transacoes: linhas.slice(0, 4).map((v) => ({
          nome: rotuloCurto(v.nome) || 'valor da história',
          // ⚠️ Sem categoria: a história não dá nenhuma, e inventar uma é inventar.
          cat: '',
          valor: dinheiro(v.valor),
          tipo: 'neutro',
        })),
      },
    };
  }
  if (escolha.familia === 'balanco') {
    const soma = somaUsavel(mapa);
    if (!soma) return null;
    /**
     * ⚠️ **AS PARTES SÃO AS DA `somas`, e não os valores todos da história.** Uma rosca
     * mostra *pedaços de um todo* — e a única coisa que declara essa relação é a `somas`
     * do mapa (*"estes valores dão aquele total"*). Encher a rosca com valores soltos
     * seria desenhar uma conta que ninguém fez.
     *
     * ⚠️ **E OS DOIS RÓTULOS TÊM DE MUDAR COM ELA.** A tela diz *"Maiores Despesas"* e
     * *"Despesas"* no meio — a história não declarou que estes valores são despesas, e
     * chamá-los assim é inventar. O título passa a ser o NOME do total, que são as
     * palavras da própria história; o do meio passa a *"Total"*, que é o que ele é.
     */
    const CORES = ['#22d3ee', '#84cc16', '#8b5cf6', '#ef4444', '#d6219c'];
    const partes = [...soma.partes].sort((a, b) => b.valor - a.valor);
    // ⚠️ Cinco é o que a legenda mostra sem encolher a letra — e o resto NÃO se deita
    //    fora: vai para "Outros", senão a rosca fica com um buraco e a conta deixa de
    //    fechar. É o mesmo que a tela já faz com os dados da gravação.
    const cabem = partes.slice(0, 5);
    const sobra = partes.slice(5).reduce((a, p) => a + p.valor, 0);
    const pct = (v) => Math.round((v / soma.total) * 1000) / 10;
    const categorias = cabem.map((p, i) => ({
      nome: rotuloCurto(p.nome, 22) || 'valor da história',
      pct: pct(p.valor),
      valor: dinheiro(p.valor),
      cor: CORES[i % CORES.length],
    }));
    if (sobra > 0) categorias.push({ nome: 'Outros', pct: pct(sobra), valor: '', cor: '#475569' });
    return {
      balanco: {
        tituloDaTela: rotuloCurto(soma.nomeDoTotal, 34) || 'O que isto soma',
        rotuloDoCentro: 'Total',
        // ⚠️ Sem mês: a história não diz nenhum, e "Julho 2026" é da gravação.
        subtitulo: 'Balanço',
        totalDespesas: dinheiro(soma.total),
        despesasValue: soma.total,
        categorias,
      },
    };
  }
  return null;
}

/**
 * A soma que esta história DECLAROU: as partes, o total, e o nome do total.
 *
 * ⚠️ **`somas` é o único sítio do mapa que diz que uns valores fazem parte de outro.**
 * O resto é uma lista plana de `{nome, valor}` — sem ela, não há como saber que 400, 300
 * e 500 são pedaços de 1200 em vez de três coisas soltas. Sem soma declarada, devolve
 * `null` e esta tela não entra.
 */
function somaUsavel(mapa) {
  const valores = (mapa?.valores || [])
    .map((v) => ({ nome: String(v?.nome || '').trim(), valor: Number(v?.valor) }))
    .filter((v) => v.nome && Number.isFinite(v.valor) && v.valor > 0);
  const achar = (nome) => valores.find((v) => v.nome.toLowerCase() === String(nome || '').trim().toLowerCase());
  for (const s of (mapa?.somas || [])) {
    const total = achar(s?.da);
    const partes = (Array.isArray(s?.de) ? s.de : []).map(achar).filter(Boolean);
    // ⚠️ Duas partes é o mínimo para uma rosca dizer alguma coisa; uma fatia só é um círculo.
    if (total && partes.length >= 2 && total.valor > 0) {
      return { partes, total: total.valor, nomeDoTotal: total.nome };
    }
  }
  return null;
}

/**
 * A história tem números com que encher uma tela de dinheiro?
 *
 * ⚠️ **É isto que fecha o buraco de vez.** Sem valores, `valoresDoBroll` devolvia `null`,
 * o envelope ia vazio, e a tela saía com os números da GRAVAÇÃO — exactamente o defeito
 * que se estava a consertar, só que num vídeo diferente. Agora, uma tela que mostra
 * dinheiro só entra quando a história tem dinheiro para lhe pôr.
 */
function temDinheiroNaHistoria(mapa) {
  const daLista = (mapa?.valores || []).map((v) => Number(v.valor)).filter((n) => Number.isFinite(n) && n > 0);
  return daLista.length > 0 || Number.isFinite(Number(mapa?.numeroEspinha));
}

/**
 * ⚠️ TRÊS PASSOU A SEIS — 10/08/2026, e é a conta dos 35%.
 * O alvo do dono é a letra na tela cair de 70% para 35%. Num guião de ~55 cenas isso quer
 * dizer ~19 cenas de `palavras` — e as outras famílias têm de dar as restantes 36. Com o
 * teto em três, faltavam três cenas para lá chegar.
 * ⚠️ Seis aparições de **quatro composições diferentes** não é o mesmo que seis da mesma:
 * a monotonia mede-se em repetição do MESMO ecrã, e o `equilibrar` roda-as.
 */
const TETO_DE_BROLL = 6;

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

  /**
   * ═══ 🔴 AS DEZOITO QUE ESTAVAM PAGAS E INALCANÇÁVEIS — 10/08/2026 ═══
   *
   * ═══ O QUE O DONO VIU ═══
   * *"Esses trechos só têm letras, não tem socos, não tem mudança de imagens, isso é
   * ponto de fuga dos espectadores… usar mais nossos b-rolls."*
   *
   * ═══ O QUE A MEDIÇÃO DISSE ═══
   * O vídeo de 10/08 gasta **70% do tempo em `palavras`** — letra na tela — contra **6%
   * em ilustração**. Os dois piores buracos que ele apontou (01:13 e 02:36, trinta e
   * vinte e sete segundos sem nada) são **os dois cenas de `palavras`**.
   *
   * ═══ A CAUSA, E NÃO ERA O TETO ═══
   * O teto era 6 e entraram 3 — logo o teto não estava a apertar. **Estavam apertadas as
   * PISTAS: catorze figuras tinham pista escrita, e as figuras são trinta e três.** As
   * outras dezanove nunca podiam ser escolhidas, por mais que a narração pedisse, porque
   * nada as sabia procurar. Estavam pagas, prontas, e fora de alcance.
   *
   * ⚠️ **AS PISTAS SAEM DO SIGNIFICADO, e o significado já estava escrito** —
   * `METAPHOR_MEANINGS` em `lib/schema-short.js` diz o que cada figura quer dizer
   * (*bola-de-ferro: "a dívida que prende e pesa"*). Não se inventou nenhuma leitura
   * nova: traduziu-se cada significado para as palavras com que uma pessoa o diz.
   *
   * ⚠️ **E continua a valer a lição do `ralo`:** uma pista que não casa com fala nenhuma
   * é uma figura morta na mesma. Por isso são frases do dia a dia — *"nunca mais consegui
   * sair disso"*, *"achei que ia dar certo"* — e não termos de banco.
   */
  { figura: 'bola-neve', pista: /bola de neve|foi virando|de pouquinho em pouquinho|comeca pequen|vai somando|vira uma montanha/ },
  { figura: 'escorregao', pista: /escorregu|tropec|vacil|dei mole|deslize|foi so uma vez/ },
  { figura: 'foguete', pista: /disparou|decolou|subiu rapido|foi la pra cima|dobrou de/ },
  { figura: 'semente', pista: /plantar|planta|semente|comeca(r)? pequeno|daqui a (uns |alguns )?anos|no longo prazo|com o tempo (rende|cresce)/ },
  { figura: 'montanha-russa', pista: /sobe e desce|um mes sim outro nao|nunca sei quanto|instavel|vai e volta/ },
  { figura: 'bolha', pista: /estour(a|ou)|nao era bem assim|era so promessa|parecia bom demais|furou/ },
  { figura: 'balanca', pista: /comparar|de um lado.*do outro|vale mais a pena|qual dos dois|pesa mais/ },
  { figura: 'bola-de-ferro', pista: /arrastando|preso|nao consigo sair|amarrado|me segura|arrasto isso/ },
  { figura: 'guarda-chuva', pista: /imprevisto|se acontecer alguma coisa|emergencia|pegar de surpresa|quando chove/ },
  { figura: 'mochila-pedras', pista: /carreg|peso nas costas|pesado demais|aguentando|nas costas/ },
  { figura: 'gangorra', pista: /um sobe (e )?o outro desce|troca de lugar|nunca ficam iguais|desequilibr/ },
  { figura: 'corda-bamba', pista: /no limite|sem margem|qualquer coisa derruba|no fio|apertadinho|sem rede/ },
  { figura: 'vela', pista: /esperando|enquanto isso|o tempo passa(ndo)?|adiar|deixar pra depois|fui empurrando/ },
  { figura: 'trem-perdido', pista: /perdi a chance|ja passou|era so ter|se eu tivesse|tarde demais|perdi o tempo/ },
  { figura: 'duas-portas', pista: /so da pra escolher um|ou um ou outro|abrir mao|tem que abrir mao|nao da pros dois/ },
  { figura: 'semaforo', pista: /parar ou seguir|hora de parar|sinal de alerta|luz vermelha|pisou no freio/ },
  { figura: 'escudo', pista: /aguent(a|ei)|segurou o tranco|nao me derrub|protegid|blindad/ },
  { figura: 'fumaca', pista: /virou fumaca|sumiu|evapor|nao sobrou nada|foi embora sem/ },
];

/**
 * SEIS — subido de quatro no mesmo momento em que a metáfora desceu para dois.
 * É a mesma decisão vista do outro lado: o dono quer **variedade de desenhos**, não
 * ausência deles. Aqui cada aparição é uma figura DIFERENTE (há 32 e nunca se repete
 * uma), portanto seis não cansam como quatro do mesmo boneco cansavam.
 */
/**
 * ═══ 🔴 SEIS PASSOU A CATORZE — 10/08/2026, ordem do dono com o número à frente ═══
 *
 * O vídeo media **70% do tempo em letra na tela**. O alvo que ele aprovou é **35%**, e
 * seis ilustrações não chegavam nem perto de lá: mesmo que as seis entrassem, sobravam
 * mais de trinta cenas de `palavras`.
 *
 * ⚠️ **Catorze não é um palpite: é a conta.** Um guião longo dá ~55 cenas. Para a letra
 * ficar em 35% é preciso que ~19 cenas mudem de família. As metáforas dão 2, as
 * fotografias 3, o app 5 e o b-roll do catálogo 3 — sobram ~14 para as ilustrações. É
 * exactamente isto.
 *
 * ⚠️ **E o intervalo desceu de 3 para 2 pela MESMA conta.** Com 3 cenas de intervalo
 * obrigatório, catorze ilustrações precisam de 42 cenas de espaço e o guião tem 55 —
 * não cabiam, e o teto novo não passaria de enfeite no código. Duas de intervalo ainda
 * garante que nunca há duas coladas, que era o que a regra queria dizer.
 *
 * ⚠️ **Cada aparição continua a ser uma figura DIFERENTE** (nunca se repete uma no mesmo
 * vídeo), e são 33 no catálogo — portanto catorze cabem sem repetir nenhuma. Era ESTA a
 * razão de o teto poder subir: o que cansa é o mesmo boneco, não haver desenhos.
 */
/**
 * ⚠️ **EXPORTADO de propósito, e não por arrumação (12/08/2026).** Quem PEDE os desenhos
 * ao leitor (`ilustrador-longo.js`) precisa de dizer quantos quer, e esse número é este.
 * Escrevê-lo lá outra vez seria a mesma constante em dois ficheiros — a família de defeito
 * nº1 desta casa (o respiro em §67.7 vivia em QUATRO). Muda-se aqui, muda em todo o lado.
 */
export const TETO_DE_ILUSTRACOES = 14;
const INTERVALO_DA_ILUSTRACAO = 2;

/**
 * ═══ 📸 AS TRÊS FOTOGRAFIAS DA MANUS (04/08/2026, fim) ═══
 *
 * O dono: *"quero que entrem as 3 imagens no vídeo, mas quero que elas fiquem com
 * movimento — uma pode ser um zoom out, outra zoom in ou outro qualquer"*.
 *
 * ⚠️ 🔴 **A TABELA É POR VÍDEO, E ISSO NÃO É ARRUMAÇÃO — É UMA TRAVA.**
 * A 1ª versão tinha uma lista só, sem dono. Num vídeo NOVO cujo texto casasse com as
 * mesmas pistas — e "o valor não parava de crescer" é uma frase que qualquer vídeo sobre
 * dívida pode ter — o montador iria buscar **as fotografias DESTE vídeo**. Seria a
 * queixa nº 1 do dono outra vez (§36.2), e da pior maneira: uma fotografia de outra
 * história a ilustrar esta. Sem o `slug`, **nenhuma fotografia entra** — que é o
 * comportamento certo para um vídeo que ainda não tem as suas.
 *
 * ⚠️ Três linhas por vídeo, e são feitas à medida dele. Quando o próximo vídeo longo for
 * feito, geram-se as dele e acrescenta-se uma chave nova aqui.
 *
 * ⚠️ **AS PISTAS SAÍRAM DE LER O GUIÃO, não de imaginar como as pessoas falam.** É a
 * lição do `ralo`: a minha primeira lista de ilustrações, escrita de cabeça, não
 * apanhava a frase que ABRE este vídeo.
 *   · o susto → *"eu sentei com o celular na mão e resolvi olhar a fatura com calma"*
 *   · o número → *"o valor não parava de crescer"* (é a cena do juro)
 *   · a virada → *"consegui pagar a conta sem desistir no meio do caminho"*
 */
const FOTOS_POR_VIDEO = {
  'sair-do-vermelho': [
  {
    ficheiro: 'manus/sair-do-vermelho/imagem-1-o-susto.jpg',
    nome: 'o susto',
    movimento: 'aproxima',
    pista: /celular na mao|olhar a fatura com calma|sentei com o celular/,
  },
  {
    ficheiro: 'manus/sair-do-vermelho/imagem-2-o-numero.jpg',
    nome: 'o juro do rotativo',
    movimento: 'cartaz',
    pista: /nao parava de crescer|valor nao parava|nao para de crescer/,
  },
  {
    ficheiro: 'manus/sair-do-vermelho/imagem-3-a-virada.jpg',
    nome: 'a virada',
    movimento: 'aproxima-lento',
    pista: /sem desistir no meio do caminho|foi a primeira vez/,
  },
  ],
};

/** Quantas cenas de distância uma fotografia guarda de outra imagem grande. */
const INTERVALO_DA_FOTO = 2;

/**
 * Escolhe onde entram as fotografias — **antes** das ilustrações, e a ordem importa.
 *
 * São três e são específicas: se as ilustrações escolhessem primeiro, podiam levar
 * justamente a cena que a fotografia descreve, e a fotografia ficava sem casa. As
 * ilustrações são catorze pistas para seis lugares — têm por onde escolher; estas não.
 */
/**
 * AS FOTOGRAFIAS QUE O ROBÔ FEZ SOZINHO, para os vídeos que não são o piloto.
 *
 * ⚠️ **A tabela escrita à mão em cima fica intocada.** Ela é do vídeo que já foi
 * aprovado, renderizado e entregue — mexer nela agora seria arriscar o que está feito por
 * causa do que ainda não está. O catálogo automático é **lido a seguir** e só acrescenta.
 *
 * ⚠️ E a regra que trava tudo continua igual: **sem entrada para este vídeo, nenhuma
 * fotografia entra.** Um vídeo sem fotografias suas não leva as de outro.
 */
export function fotosDoCatalogo(slug, catalogoDeMesa = null) {
  if (!slug) return [];
  try {
    // ⚠️ O segundo parâmetro existe só para as PROVAS poderem medir isto sem escrever no
    // disco. Uma prova que precisa de criar e apagar ficheiros para correr é uma prova
    // que um dia deixa lixo — e a lição do `rmSync` desta casa é que apagar falha calado.
    let catalogo = catalogoDeMesa;
    if (!catalogo) {
      const p = join(process.cwd(), '.github', 'data', 'fotos-do-longo.json');
      if (!existsSync(p)) return [];
      catalogo = JSON.parse(readFileSync(p, 'utf-8'));
    }
    const doVideo = catalogo?.videos?.[slug];
    if (!Array.isArray(doVideo)) return [];
    // A pista chega como texto (escrita por quem gerou a imagem) e vira a mesma coisa que
    // as escritas à mão: uma expressão a procurar na narração da cena.
    return doVideo
      .filter((f) => f && f.ficheiro && f.pista)
      .map((f) => ({ ...f, pista: f.pista instanceof RegExp ? f.pista : new RegExp(String(f.pista)) }));
  } catch (err) {
    /**
     * 🔴 O RESGUARDO TEM DE FALAR, E ISTO QUASE ME MORDEU AO ESCREVÊ-LO.
     *
     * A 1ª versão desta função usava peças que este ficheiro **não importava**, e o
     * resguardo engolia o erro: devolvia lista vazia, o vídeo saía sem fotografias, e
     * **nada se queixava**. Era o modo de falha desta casa na sua forma mais pura — a
     * coisa que desaparece em silêncio.
     *
     * Um catálogo mal formado não pode derrubar o render (um vídeo sem fotografias é
     * melhor do que vídeo nenhum), mas **tem de deixar rasto**.
     */
    console.log(`⚠️ não deu para ler o catálogo de fotografias (${err.message}) — este vídeo sai sem elas.`);
    return [];
  }
}

export function escolherLugaresDaFoto(cenas, ocupados = new Set(), slug = null, catalogoDeMesa = null) {
  const lugares = new Map();
  // ⚠️ Sem slug, ou com um slug que ainda não tem fotografias suas, isto devolve VAZIO.
  // É de propósito: melhor um vídeo sem fotografias do que um vídeo com as de outro.
  const doVideo = FOTOS_POR_VIDEO[String(slug || '')] || fotosDoCatalogo(slug, catalogoDeMesa);
  if (!doVideo.length) return lugares;
  const escolhidos = [];
  cenas.forEach((c, i) => {
    if (ocupados.has(i)) return;
    if (escolhidos.some((j) => Math.abs(i - j) < INTERVALO_DA_FOTO)) return;
    const texto = semAcento(c.narration);
    const achada = doVideo.find((f) => ![...lugares.values()].includes(f) && f.pista.test(texto));
    if (!achada) return;
    escolhidos.push(i);
    lugares.set(i, achada);
  });
  return lugares;
}

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
/**
 * ═══ 🔴 O QUE UM LEITOR DE IA ESCOLHEU PARA CADA CENA — 10/08/2026 ═══
 *
 * ═══ POR QUE AS PISTAS NÃO CHEGAM, E ESTÁ MEDIDO ═══
 * Abriram-se as 33 figuras (eram 14 alcançáveis) e subiu-se o teto de 6 para 14. O vídeo
 * passou de **3 ilustrações para 5**, em 55 cenas. O teto nunca foi o travão: **é o
 * casamento por palavra-gatilho que não escala.** Uma pista escrita à mão só apanha a
 * cena que calhe de usar aquelas palavras, e uma narração de seis minutos quase nunca as
 * usa. Continuar a escrever pistas era continuar a adivinhar como as pessoas falam — a
 * lição do `ralo`, agora pela terceira vez.
 *
 * ═══ POR QUE ISTO NÃO É "GOSTO A FINGIR DE VERDADE" ═══
 * Regra da casa (`verdade-versus-gosto`): o que se mede, mede-se com código; **o que é
 * julgamento mede-se com um segundo leitor de IA.** *"Esta figura combina com esta
 * frase?"* é julgamento — nunca foi outra coisa, e escrevê-lo em `regex` era fingir que
 * era conta. O significado de cada figura já está escrito há meses em
 * `METAPHOR_MEANINGS`; o leitor lê a narração, lê os significados, e escolhe.
 *
 * ⚠️ **E O RESULTADO É GRAVADO, por isso o montador continua determinista.** É a MESMA
 * forma das fotografias: quem paga a IA é um passo à parte (`ilustrador-longo.js`), que
 * escreve um ficheiro; o montador só lê. Correr o montador duas vezes dá o mesmo vídeo.
 *
 * ⚠️ **Sem ficheiro, ou com um slug que ainda não passou pelo ilustrador, isto devolve
 * VAZIO** e as pistas escritas à mão continuam a valer. Nunca se leva a escolha de outro
 * vídeo — é a mesma trava das fotografias, e pela mesma razão.
 */
export function ilustracoesDoCatalogo(slug, catalogoDeMesa = null) {
  if (!slug) return new Map();
  try {
    let catalogo = catalogoDeMesa;
    if (!catalogo) {
      const p = join(process.cwd(), '.github', 'data', 'ilustracoes-do-longo.json');
      if (!existsSync(p)) return new Map();
      catalogo = JSON.parse(readFileSync(p, 'utf-8'));
    }
    const doVideo = catalogo?.videos?.[slug];
    if (!Array.isArray(doVideo)) return new Map();
    const conhecidas = new Set(ILUSTRACOES.map((x) => x.figura));
    const fora = [];
    const mapa = new Map();
    for (const e of doVideo) {
      if (!e || e.cena === undefined || !e.figura) continue;
      /**
       * ⚠️ **UMA FIGURA QUE NÃO EXISTE NÃO ENTRA, E DIZ-SE.** O leitor devolve texto; um
       * nome trocado ("relógio" em vez de "relogio") daria uma cena sem desenho nenhum e
       * ninguém saberia porquê. Cair fora em silêncio é o modo de falha desta casa.
       */
      if (!conhecidas.has(String(e.figura))) { fora.push(e.figura); continue; }
      mapa.set(String(e.cena), String(e.figura));
    }
    if (fora.length) console.log(`⚠️ o ilustrador nomeou ${fora.length} figura(s) que não existem e foram ignoradas: ${[...new Set(fora)].join(', ')}`);
    return mapa;
  } catch (err) {
    console.log(`⚠️ não deu para ler as ilustrações escolhidas (${err.message}) — valem as pistas escritas à mão.`);
    return new Map();
  }
}

export function escolherLugaresDaIlustracao(cenas, lugaresDaMetafora = new Map(), fio = null, ocupados = new Set(), lugaresDaFoto = new Map(), escolhidasPorLeitor = new Map()) {
  const lugares = new Map();
  const usadas = new Set(fio ? [fio] : []);
  const escolhidos = [];
  // ⚠️ O intervalo entre ILUSTRAÇÕES é 3, mas para a METÁFORA basta 2 — e a diferença é
  // deliberada. Duas ilustrações perto uma da outra lêem-se como "o vídeo agora é de
  // desenhos"; uma ilustração ao lado do ator lê-se como duas coisas diferentes, que é o
  // que se quer. Com 3 dos dois lados, este guião só arranjava lugar para duas.
  const cabe = (i) => escolhidos.every((j) => Math.abs(i - j) >= INTERVALO_DA_ILUSTRACAO)
    && ![...lugaresDaMetafora.keys()].some((j) => Math.abs(i - j) < 2)
    && ![...lugaresDaFoto.keys()].some((j) => Math.abs(i - j) < INTERVALO_DA_FOTO);
  const livre = (c, i) => !lugaresDaMetafora.has(i) && !ocupados.has(i)
    && c.parte !== 'demonstracao' && c.parte !== 'chamada';

  cenas.forEach((c, i) => {
    if (escolhidos.length >= TETO_DE_ILUSTRACOES) return;
    if (!livre(c, i) || !cabe(i)) return;
    /**
     * ⚠️ **O LEITOR MANDA, A PISTA É A RESERVA** — e a ordem não é indiferente.
     * A pista é uma adivinhação sobre como as pessoas falam; o leitor leu a frase mesmo.
     * Mas as três guardas continuam a valer para os dois: nunca a figura do fio condutor,
     * nunca a mesma figura duas vezes, e nunca duas coladas. Uma escolha do leitor que
     * parta uma dessas regras é DESCARTADA — ele escolhe a figura, não a montagem.
     */
    const doLeitor = escolhidasPorLeitor.get(String(c.id));
    const achada = (doLeitor && !usadas.has(doLeitor))
      ? { figura: doLeitor }
      : ILUSTRACOES.find((x) => !usadas.has(x.figura) && x.pista.test(semAcento(c.narration)));
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
/**
 * 🔴 O QUE ESTÁ NO ECRÃ, EM UMA LINHA — e é **exportada de propósito**, 09/08/2026.
 *
 * ═══ POR QUE SAIU DE DENTRO DA `conferirImagens` ═══
 * Ela vivia lá dentro, e a prova de mesa `validar-roteiro-longo.js` tinha uma **cópia
 * mais grosseira** — `${tipo}` para tudo menos `palavras`. As duas divergiram, e a
 * divergência custou uma prova vermelha falsa hoje:
 *
 * A produção diz que `app/1`, `app/2`, `app/3` são **três ecrãs diferentes** (o app a
 * crescer passo a passo, que é o desenho). A prova, com a assinatura grosseira, via
 * três `app` seguidos e gritava. **É a 22ª vez nesta casa que uma trava castiga o que o
 * desenho manda fazer** — e desta vez porque a trava e o desenho tinham duas versões
 * da mesma pergunta.
 *
 * O conserto de 08/08 (juntar o `passo` à assinatura) foi feito só de um lado. Agora há
 * um sítio só, e quem prova importa-o em vez de o reescrever.
 */
export const assinaturaDoEcra = (v = {}) => {
  switch (v.tipo) {
    case 'palavras': return `palavras/${v.variante}`;
    case 'numero': return `numero/${v.valor}`;
    case 'app': return `app/${v.passo}`;
    case 'frase': return `frase/${v.variante}`;
    case 'ilustracao': return `ilustracao/${v.figura}`;
    case 'metafora': return `metafora/${v.fio}/${v.estagio}`;
    case 'foto': return `foto/${v.ficheiro}`;
    default: return String(v.tipo);
  }
};

export function dirigirImagens(cenas, mapa = {}, slug = null) {
  const dic = dicionarioDeValores(mapa);
  const ficha = mapa.fichaDeDivida;
  const capituloDoApp = mapa.capituloDaDemonstracao;
  const fio = mapa.fioCondutor || null;

  const jaMostrado = new Set(); // valores que já tiveram cartão grande

  /**
   * 🔴 UM CARTÃO POR BLOCO, E NÃO UM POR CENA — 09/08/2026.
   *
   * ═══ O DEFEITO, QUE NASCEU HOJE E FOI APANHADO A MEDIR ═══
   * As regras da CHAMADA e do RE-GANCHO diziam `if (c.parte === 'chamada')` — ou seja,
   * **todas** as cenas daquele bloco levavam o mesmo cartão. Enquanto um bloco dava uma
   * cena só, isso era a mesma coisa e ninguém notou.
   *
   * Ao baixar o teto de palavras por cena de 40 para 26, a chamada passou a dar DUAS
   * cenas — e o vídeo ficou com **"Comenta FINMOOVI" duas vezes seguidas**, e o gancho
   * do capítulo 3 com **a mesma frase duas vezes seguidas**. Medido no plano montado.
   *
   * ⚠️ **É a família de defeito nº 1 desta casa**: uma regra escrita quando a estrutura
   * era outra continua a correr, sem se queixar, depois de a estrutura mudar.
   *
   * A cura: só a PRIMEIRA cena de cada (bloco + parte) leva o cartão. As seguintes caem
   * no cavalo de carga — as palavras ditas, que é o que elas estão mesmo a dizer.
   */
  const primeiraDoBloco = new Set();
  {
    const vistos = new Set();
    cenas.forEach((c, i) => {
      const chave = `${c.bloco}|${c.parte}`;
      if (vistos.has(chave)) return;
      vistos.add(chave);
      primeiraDoBloco.add(i);
    });
  }
  let contaFeita = false;
  let brollUsado = 0;
  /** Quantas vezes cada tela do app já saiu — é o que impede o Extrato quatro vezes. */
  const usosDoBroll = {};
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

    /**
     * 3. O CARTÃO DE NÚMERO — na primeira vez que **cada** valor entra na história.
     *
     * ═══ 🔴 OS NÚMEROS QUE PERDIAM A VEZ PARA SEMPRE — 10/08/2026 ═══
     *
     * Ordem do dono, olhando o que o Short de 16s faz: *"o número na tela, grande,
     * sozinho. No longo os valores aparecem no meio do texto. Uma tela só com R$ 236
     * por 2 segundos vale mais que uma frase que o diz."*
     *
     * ⚠️ **O defeito não era faltar a família — era ela desistir.** Esta cena escolhia
     * `novos[0]` para o cartão e a seguir marcava **TODOS** os valores ditos como já
     * mostrados. Consequência: uma cena que diz *"os duzentos e trinta e seis e os
     * cinquenta do remédio"* dava cartão ao primeiro e **queimava o segundo para o resto
     * do vídeo** — ele nunca mais podia ter o seu ecrã, mesmo aparecendo sozinho três
     * cenas à frente.
     *
     * Agora só o valor que RECEBEU o cartão fica marcado. Os outros continuam à espera
     * da sua vez, e ganham-na na primeira cena em que forem o número novo.
     *
     * ⚠️ **A regra "um cartão por valor" continua de pé** — o que muda é que ela deixa
     * de castigar valores por terem sido ditos na frase errada. Repetir o mesmo número
     * em dois ecrãs continua proibido, e é o que impede isto de virar uma enxurrada.
     */
    if (novos.length) {
      const valor = novos[0];
      jaMostrado.add(valor);
      return { ...c, visual: { tipo: 'numero', valor, rotulo: dic.get(valor) } };
    }

    const etiqueta = etiquetaDe(ditos[0]);

    // 4. A CHAMADA — a palavra que a pessoa tem de escrever no comentário PRECISA de
    //    estar escrita no ecrã. No Short está; no longo não estava.
    // ⚠️ `primeiraDoBloco` — ver a nota acima: com a chamada partida em duas cenas,
    //    o cartao saia DUAS VEZES SEGUIDAS.
    if (c.parte === 'chamada' && primeiraDoBloco.has(indice)) {
      return { ...c, visual: { tipo: 'frase', texto: CHAMADA_NO_ECRA, etiquetaTexto: CHAMADA_ETIQUETA_ECRA, variante: 'chamada' } };
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
    // ⚠️ `escolherBroll` — a tela que a FALA pede, e só depois o rodízio. E `brollDoVideo`
    //    tira as que a história não comporta. Ver a nota em `BROLL_PERMITIDO`.
    const podeUsar = brollDoVideo(mapa);
    if (podeUsar.length && PISTA_TUDO_JUNTO.test(texto) && brollUsado < TETO_DE_BROLL) {
      const escolha = escolherBroll(texto, podeUsar, usosDoBroll);
      usosDoBroll[escolha.comp] = (usosDoBroll[escolha.comp] || 0) + 1;
      brollUsado++;
      return { ...c, visual: { tipo: 'broll', comp: escolha.comp, brollFrames: escolha.frames, valores: valoresDoBroll(escolha, mapa), etiqueta } };
    }

    // 8. O RE-GANCHO — o que fica em aberto está escrito no mapa, capítulo a capítulo.
    // ⚠️ `primeiraDoBloco` pela MESMA razao da chamada.
    if (c.parte === 'regancho' && c.capitulo && primeiraDoBloco.has(indice)) {
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

  /**
   * A 2ª PASSAGEM E MEIA — as FOTOGRAFIAS, antes das ilustrações.
   * São três e cada uma serve uma cena só; as ilustrações têm catorze pistas para seis
   * lugares. Quem tem menos por onde escolher escolhe primeiro.
   */
  const lugaresDaFoto = escolherLugaresDaFoto(cenas, ocupados, slug);
  for (const i of lugaresDaFoto.keys()) ocupados.add(i);

  /**
   * A 3ª PASSAGEM — as ilustrações entram no que ainda sobrou, e guardam distância das
   * fotografias pela mesma razão que já guardavam da metáfora: duas imagens grandes
   * coladas lêem-se como "agora o vídeo é de imagens", em vez de duas coisas diferentes.
   */
  const lugaresDaIlustracao = escolherLugaresDaIlustracao(cenas, lugaresDaMetafora, fio, ocupados, lugaresDaFoto, ilustracoesDoCatalogo(slug));

  const dirigida = primeiraPassagem.map((c, i) => {
    if (lugaresDaFoto.has(i)) {
      const f = lugaresDaFoto.get(i);
      return { ...c, visual: { tipo: 'foto', ficheiro: f.ficheiro, nome: f.nome, movimento: f.movimento, etiqueta: c.visual.etiqueta } };
    }
    return lugaresDaIlustracao.has(i)
      ? { ...c, visual: { tipo: 'ilustracao', figura: lugaresDaIlustracao.get(i), etiqueta: c.visual.etiqueta } }
      : c;
  });

  return numerarVariantes(equilibrar(dirigida, { fio, mapa }));
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
export function equilibrar(cenas, { fio = null, mapa = null } = {}) {
  const fioReal = fio || cenas.find((c) => c.visual?.fio)?.visual?.fio || null;
  const saida = cenas.map((c) => ({ ...c }));
  let estagio = Math.max(0, ...saida.map((c) => c.visual?.estagio || 0));
  let ultimaMetafora = saida.reduce((a, c, i) => (c.visual?.tipo === 'metafora' ? i : a), -Infinity);
  let brollUsado = saida.filter((c) => c.visual?.tipo === 'broll').length;
  /**
   * ⚠️ **CONTA AS QUE JÁ ESTÃO NO GUIÃO, e não começa do zero.** Esta passagem corre
   * depois da de cima; se ela não visse o que já saiu, podia pôr uma terceira e uma
   * quarta cópia da mesma tela — que é exactamente o defeito que o teto por tela existe
   * para impedir.
   */
  const usosDoBroll = {};
  for (const c of saida) {
    if (c.visual?.tipo === 'broll' && c.visual.comp) usosDoBroll[c.visual.comp] = (usosDoBroll[c.visual.comp] || 0) + 1;
  }

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
    } else if (brollDoVideo(mapa).length && brollUsado < TETO_DE_BROLL) {
      // ⚠️ Aqui a cena foi escolhida por ser a terceira igual seguida, e o texto dela pode
      //    não pedir tela nenhuma — mas a `pista` continua a mandar quando pede, e a tela
      //    que a história não comporta continua fora. Ver `BROLL_PERMITIDO`.
      const escolha = escolherBroll(meio.narration, brollDoVideo(mapa), usosDoBroll);
      usosDoBroll[escolha.comp] = (usosDoBroll[escolha.comp] || 0) + 1;
      brollUsado++;
      meio.visual = { ...meio.visual, tipo: 'broll', comp: escolha.comp, brollFrames: escolha.frames, valores: valoresDoBroll(escolha, mapa) };
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
// ⚠️ `catalogoDeMesa` é o MESMO recurso que `escolherLugaresDaFoto` já tinha, e pelo
//    mesmo motivo: deixar as provas medirem isto sem escrever no disco. Quem chama a
//    sério (o `montar-longo.js`) continua a passar três argumentos e a ler o catálogo.
export function conferirImagens(cenas, mapa = {}, slugDoVideo = null, catalogoDeMesa = null) {
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
  /**
   * 🔴 A ASSINATURA MEDIA O NOME DA FAMÍLIA, NÃO O ECRÃ — e isso partiu o primeiro vídeo
   * que o robô tentou fazer sozinho (05/08/2026, na nuvem).
   *
   * A regra em baixo tinha a intenção certa e o comentário certo: *"iguais mede-se pelo
   * que aparece no ecrã, não pelo nome da família"*. Só que isso **só estava implementado
   * para a família `palavras`**. Todas as outras eram comparadas pelo nome.
   *
   * O que ela reprovou no guião novo, e nenhuma das duas era repetição nenhuma:
   *
   * | cenas | o que a trava disse | o que estava mesmo no ecrã |
   * |---|---|---|
   * | 6, 7, 8 | *"mostram a mesma coisa (numero)"* | **R$ 3.500** (o salário), **R$ 220** (o cafezinho), **R$ 180** (as compras por impulso) — três números e três etiquetas diferentes |
   * | 17, 18, 19 | *"mostram a mesma coisa (app)"* | o app nos **passos 1, 2 e 3** da conta: a fatura a aparecer, a linha do que falta, as cobranças a juntarem-se |
   *
   * > **É a 22ª vez que a trava castiga aquilo que o desenho manda fazer.** O `passo` do
   * > app existe precisamente para o ecrã crescer com a narração — está escrito duas
   * > linhas acima, no código que o cria — e o cartão de número entra de propósito na
   * > PRIMEIRA vez que cada valor aparece na história. Três valores novos em três cenas
   * > seguidas são três cartões, e isso é o desenho a funcionar.
   *
   * ⚠️ **E porque é que isto não apareceu no primeiro vídeo:** lá o parágrafo da
   * demonstração deu DUAS cenas e os números novos nunca calharam três seguidos. *Uma
   * trava que só foi provada contra um vídeo é uma trava provada contra um vídeo.*
   *
   * Agora a assinatura leva **o que muda no ecrã** de cada família.
   */
  for (let i = 2; i < cenas.length; i++) {
    const a = assinaturaDoEcra(cenas[i].visual);
    if (!cenas[i].visual) continue;
    if (assinaturaDoEcra(cenas[i - 1].visual) === a && assinaturaDoEcra(cenas[i - 2].visual) === a) {
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

  /**
   * (d-bis) AS FOTOGRAFIAS — cada uma no seu sítio, e nenhuma duas vezes.
   * ⚠️ A prova que interessa é a última: **a fotografia tem de cair numa cena cujo texto
   * a chamou.** Sem isto, bastava alguém mexer numa pista para uma fotografia de mãos a
   * abrir uma fatura aterrar no fecho do vídeo — e seria outra vez a queixa nº 1 do dono,
   * o ecrã a mostrar uma coisa e a voz a dizer outra.
   */
  /**
   * 🔴 QUEM CONFERE TEM DE OLHAR PARA A MESMA LISTA DE QUEM ESCOLHE — 08/08/2026.
   *
   * Isto dizia `FOTOS_POR_VIDEO[slug] || []`, e o `escolherLugaresDaFoto` (linha 288)
   * diz `FOTOS_POR_VIDEO[slug] || fotosDoCatalogo(slug)`. Duas listas diferentes para
   * a mesma pergunta.
   *
   * `FOTOS_POR_VIDEO` é escrita à mão e só conhece **um** vídeo: o piloto
   * `sair-do-vermelho`. Portanto, em qualquer outro vídeo, quem escolhe via as
   * fotografias (pelo catálogo) e punha-as nas cenas, e quem confere via ZERO e
   * reprovava-as todas.
   *
   * ⚠️ **Isto reprovava TODO vídeo longo que não fosse o piloto.** Não se tinha visto
   * porque o piloto foi o único longo que chegou a esta fase — o de 08/08 foi o
   * primeiro a seguir, e morreu aqui com as duas fotografias já feitas e aprovadas em
   * disco: *"2 fotografias — só existem 0 feitas para este vídeo"*.
   */
  const doVideo = FOTOS_POR_VIDEO[String(slugDoVideo || '')] || fotosDoCatalogo(slugDoVideo, catalogoDeMesa);
  const fotos = cenas.filter((c) => c.visual?.tipo === 'foto');
  if (fotos.length > doVideo.length) {
    erros.push(`${fotos.length} fotografias — só existem ${doVideo.length} feitas para este vídeo`);
  }
  const ficheiros = fotos.map((c) => c.visual.ficheiro);
  const fotoRepetida = ficheiros.find((f, i) => ficheiros.indexOf(f) !== i);
  if (fotoRepetida) erros.push(`a fotografia "${fotoRepetida}" aparece mais do que uma vez`);
  for (const c of fotos) {
    const dona = doVideo.find((f) => f.ficheiro === c.visual.ficheiro);
    if (!dona) {
      erros.push(`a fotografia "${c.visual.ficheiro}" não está na lista deste vídeo`);
      continue;
    }
    if (!dona.pista.test(semAcento(c.narration))) {
      erros.push(`a fotografia "${dona.nome}" caiu numa cena que não a chamou: "${String(c.narration).slice(0, 60)}…"`);
    }
  }

  // (e) o b-roll do catálogo tem teto
  const brolls = cenas.filter((c) => c.visual?.tipo === 'broll');
  if (brolls.length > TETO_DE_BROLL) erros.push(`${brolls.length} cenas de b-roll do catálogo — o teto é ${TETO_DE_BROLL}`);
  for (const b of brolls) {
    const tela = BROLL_PERMITIDO.find((x) => x.comp === b.visual.comp);
    if (!tela) {
      erros.push(`cena ${b.id}: "${b.visual.comp}" não está na lista de b-roll permitido (as outras mostram dinheiro de outra história)`);
      continue;
    }
    /**
     * 🔴 **A TRAVA QUE IMPEDE A QUINTA VEZ — 10/08/2026.**
     *
     * Ler a `pista` conserta o vídeo de hoje; **é esta linha que impede o defeito de
     * voltar.** Sem ela, qualquer refactor que volte ao rodízio cego passa despercebido —
     * e foi exactamente assim que um cartão de crédito apareceu duas vezes num vídeo sem
     * cartão nenhum, atravessou uma aprovação, e só se viu **olhando o fotograma**.
     *
     * ⚠️ **É VERDADE e não gosto** (`verdade-versus-gosto`): não se pergunta a ninguém se
     * a tela combina. Ou o mapa tem uma conta de cartão, ou não tem.
     */
    if (!tela.exige(mapa)) {
      erros.push(`cena ${b.id}: a tela "${b.visual.comp}" não pode entrar neste vídeo — ${tela.porqueNao || 'a história não tem o que ela mostra'}`);
    }
  }
  /**
   * ⚠️ **A REGRA CERTA É "PASSOU À FRENTE DE UMA MELHOR", e não "nenhuma casou".**
   *
   * 🔴 **A minha primeira versão desta trava dava ALARME FALSO, e foi medida a dar.** Ela
   * dizia: *"zero telas pedidas pela fala = a escolha voltou ao rodízio cego"*. Mas zero
   * também acontece quando **nenhuma tela do catálogo serve** — e é o caso do vídeo
   * `onde-o-salario-some`, cuja história é sobre juntar contas e cujo catálogo, sem a
   * tela de cartão, só tem Extrato e as duas Capturas.
   *
   * ⚠️ **Uma trava que morde num caso legítimo ensina quem a lê a ignorá-la** — é a lição
   * escrita em `prompt-versus-validador`, e por pouco ficava aqui dentro.
   *
   * A regra precisa: **a tela escolhida não foi pedida pela fala, E havia outra que foi,
   * E essa outra ainda tinha vez.** Aí sim, a escolha passou à frente de uma melhor —
   * que é a assinatura exacta do rodízio cego, e nada mais.
   */
  const usados = {};
  for (const b of brolls) usados[b.visual.comp] = (usados[b.visual.comp] || 0) + 1;
  for (const b of brolls) {
    const tela = BROLL_PERMITIDO.find((x) => x.comp === b.visual.comp);
    if (!tela || tela.pista.test(semAcento(String(b.narration || '')))) continue;
    const melhor = brollDoVideo(mapa).find((x) => x.comp !== b.visual.comp
      && x.pista.test(semAcento(String(b.narration || '')))
      && (usados[x.comp] || 0) < TETO_POR_TELA);
    if (melhor) {
      erros.push(`cena ${b.id}: entrou "${b.visual.comp}" quando a fala pedia "${melhor.comp}" — a escolha passou à frente da tela certa`);
    }
  }

  // (f) toda frase que vai ao ecrã foi ESCRITA pelo guião, não inventada aqui
  const declaradas = new Set([
    CHAMADA_NO_ECRA,
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

/**
 * 🔴 O ECRÃ QUE MENTE CONSERTA-SE; O ECRÃ QUE CANSA PASSA COM AVISO — 09/08/2026.
 *
 * ═══ POR QUE ISTO EXISTE ═══
 * Ordem do dono, depois de o canal ficar sem vídeo ao domingo: *"nunca parar e não
 * gerar o vídeo"*. O `montar-longo.js` chamava `conferirImagens` e, à primeira queixa,
 * fazia `process.exit(1)` — e a corrida de 08/08 morreu exactamente assim, com as
 * fotografias já pagas e aprovadas no disco.
 *
 * ═══ A LINHA QUE SEPARA AS DUAS FAMÍLIAS DE QUEIXA ═══
 * Elas não são iguais e não podem ter o mesmo destino:
 *
 *  · **MENTIRA NO ECRÃ** — um número que não está na lista do mapa, uma fotografia numa
 *    cena que não a chamou, o app fora do capítulo que o mapa lhe deu, uma frase que o
 *    guião nunca escreveu, b-roll de outra história. Isto **conserta-se sempre**, e o
 *    conserto é tirar a mentira: a cena passa a mostrar as palavras que estão a ser
 *    ditas, que é o desenho neutro da casa e nunca contradiz a voz. **O ecrã fica mais
 *    verdadeiro do que estava, nunca menos.**
 *
 *  · **CANSAÇO VISUAL** — três iguais seguidas, ilustrações acima do teto, metáforas a
 *    mais. Isto é o vídeo ficar mais pobre, não mais falso. **Passa com aviso**, porque
 *    um vídeo mais pobre é melhor do que não haver vídeo. Fica escrito no registo para
 *    se emendar quem ESCOLHE as imagens — nunca para matar a corrida.
 *
 * ⚠️ **CONSERTAR É SEMPRE TIRAR, NUNCA INVENTAR.** Nenhuma linha aqui escolhe uma
 * imagem nova, um número novo ou uma frase nova. Só rebaixa para `palavras` o que
 * estava a dizer o que não devia.
 */
export function consertarImagens(cenas, mapa = {}, slugDoVideo = null, catalogoDeMesa = null) {
  const consertos = [];
  const dic = dicionarioDeValores(mapa);
  const saida = cenas.map((c) => ({ ...c, visual: c.visual ? { ...c.visual } : c.visual }));

  /** Rebaixar é isto: a cena passa a mostrar as palavras que estão a ser ditas. */
  const rebaixar = (c, porque) => {
    consertos.push(`cena ${c.id}: ${porque} — passou a mostrar as palavras ditas`);
    c.visual = { tipo: 'palavras' };
  };

  // (a) TODO número no ecrã tem de estar na lista fechada do mapa
  for (const c of saida) {
    const v = c.visual;
    if (!v) continue;
    if (v.etiqueta && Number.isFinite(v.etiqueta.valor) && !dic.has(v.etiqueta.valor)) {
      consertos.push(`cena ${c.id}: a etiqueta mostrava R$ ${v.etiqueta.valor}, que não está na lista do mapa — foi tirada`);
      delete v.etiqueta;
    }
    if (Array.isArray(v.linhas)) {
      const boas = v.linhas.filter((l) => !Number.isFinite(l.valor) || dic.has(l.valor));
      if (boas.length !== v.linhas.length) {
        consertos.push(`cena ${c.id}: ${v.linhas.length - boas.length} linha(s) mostravam números fora da lista do mapa — foram tiradas`);
        v.linhas = boas;
      }
    }
    if (Number.isFinite(v.valor) && !dic.has(v.valor)) {
      rebaixar(c, `o ecrã mostrava R$ ${v.valor}, que não está na lista do mapa`);
    }
  }

  /**
   * (b) O APP NUM CAPÍTULO SÓ — o que o mapa escolheu.
   * Sem escolha no mapa, manda o primeiro capítulo onde ele já aparece: é uma decisão
   * que não inventa nada e mantém a demonstração inteira num sítio.
   */
  const apps = saida.filter((c) => c.visual?.tipo === 'app');
  if (apps.length) {
    const capDoApp = Number(mapa.capituloDaDemonstracao) || apps[0].capitulo;
    for (const a of apps) {
      if (a.capitulo !== capDoApp) rebaixar(a, `o app aparecia no capítulo ${a.capitulo} e o dele é o ${capDoApp}`);
    }
  }

  // (c) a conta é o plano-revelação: uma, e só uma. Fica a primeira.
  let jaHouveConta = false;
  for (const c of saida) {
    if (c.visual?.tipo !== 'conta') continue;
    if (jaHouveConta) rebaixar(c, 'a conta já tinha aparecido, e ela é uma só');
    jaHouveConta = true;
  }

  /**
   * (d-bis) AS FOTOGRAFIAS — cada uma no seu sítio, nenhuma duas vezes, e só as deste
   * vídeo. Uma fotografia numa cena que não a chamou é a queixa nº 1 do dono: o ecrã a
   * mostrar uma coisa enquanto a voz diz outra.
   */
  const doVideo = FOTOS_POR_VIDEO[String(slugDoVideo || '')] || fotosDoCatalogo(slugDoVideo, catalogoDeMesa);
  const jaUsadas = new Set();
  for (const c of saida) {
    if (c.visual?.tipo !== 'foto') continue;
    const dona = doVideo.find((f) => f.ficheiro === c.visual.ficheiro);
    if (!dona) { rebaixar(c, `a fotografia "${c.visual.ficheiro}" não é deste vídeo`); continue; }
    if (jaUsadas.has(c.visual.ficheiro)) { rebaixar(c, `a fotografia "${dona.nome}" já tinha aparecido`); continue; }
    if (!dona.pista.test(semAcento(c.narration))) {
      rebaixar(c, `a fotografia "${dona.nome}" caiu numa cena que não a chamou`);
      continue;
    }
    jaUsadas.add(c.visual.ficheiro);
  }

  // (d3) as ilustrações: nunca repetidas, e nunca a figura do fio condutor
  const figurasVistas = new Set();
  for (const c of saida) {
    if (c.visual?.tipo !== 'ilustracao') continue;
    if (mapa.fioCondutor && c.visual.figura === mapa.fioCondutor) {
      rebaixar(c, `a ilustração "${c.visual.figura}" é o fio condutor e tem família própria`);
      continue;
    }
    if (figurasVistas.has(c.visual.figura)) { rebaixar(c, `a ilustração "${c.visual.figura}" já tinha aparecido`); continue; }
    figurasVistas.add(c.visual.figura);
  }

  // (e) o b-roll de fora da lista mostra dinheiro de OUTRA história
  for (const c of saida) {
    if (c.visual?.tipo !== 'broll') continue;
    if (!BROLL_PERMITIDO.some((x) => x.comp === c.visual.comp)) {
      rebaixar(c, `"${c.visual.comp}" não está no b-roll permitido (mostra dinheiro de outra história)`);
    }
  }

  // (f) toda frase no ecrã foi ESCRITA pelo guião
  const declaradas = new Set([
    CHAMADA_NO_ECRA,
    ...(mapa.capitulos || []).flatMap((c) => [c.titulo, c.oQueFicaEmAberto, c.oQueAcrescenta]).filter(Boolean),
    mapa.promessa, mapa.lacoAberto, mapa.respostaDaPromessa,
  ].filter(Boolean));
  for (const c of saida) {
    if (c.visual?.tipo !== 'frase') continue;
    if (!declaradas.has(c.visual.texto)) {
      rebaixar(c, `a frase "${String(c.visual.texto).slice(0, 40)}…" não está escrita no guião`);
    }
  }

  return { cenas: saida, consertos, restantes: conferirImagens(saida, mapa, slugDoVideo, catalogoDeMesa) };
}
