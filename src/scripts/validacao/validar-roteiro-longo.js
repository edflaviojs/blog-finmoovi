/**
 * A PROVA DE MESA DO VÍDEO LONGO — corre sem rede, sem chave e sem gastar um cêntimo.
 *
 * ═══ O QUE ELA EXISTE PARA IMPEDIR ═══
 * A 16ª ocorrência de **"o prompt manda escrever exatamente o que o validador pune"**.
 * Nas quinze anteriores o defeito nunca deu erro: o gerador simplesmente falhava todos
 * os dias, ou publicava lixo, e ninguém sabia porquê. A cura não é lembrar-se — já
 * falhei quatro vezes num só dia a lembrar-me. A cura é esta prova:
 *
 *   **TODO exemplo ✓ escrito num prompt é submetido às travas DESSE MESMO prompt.**
 *   Se um exemplo não passa, o exemplo está errado (ou a trava está errada), e a prova
 *   fica vermelha ANTES de qualquer geração paga.
 *
 * ═══ A ÚNICA EXCEÇÃO, E ESTÁ EXPLICADA ═══
 * A trava ANTI-CÓPIA compara o texto gerado com os exemplos. Um exemplo comparado
 * consigo próprio reprova sempre — isso não é defeito, é a definição da trava. Por isso
 * os exemplos são medidos SEM a anti-cópia… e logo a seguir a prova 4 submete-os COM
 * ela, exigindo que reprovem. As duas metades juntas provam que o exemplo é válido E
 * que copiá-lo custa caro.
 *
 * ═══ E PROVA CONTRA DADOS REAIS, NÃO INVENTADOS ═══
 * Os títulos de capítulo são medidos contra os **64 capítulos REAIS** de sete vídeos
 * longos de finanças (`.github/data/youtube-capitulos.json`). A lição é de 03/08: o
 * filtro de marca passou em provas sintéticas e falhava metade dos casos reais.
 *
 * Uso: node src/scripts/validacao/validar-roteiro-longo.js
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

/** A raiz do projeto — para as provas que leem ficheiros a sério (o guião montado). */
const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

import {
  validarMapa, validarAbertura, validarCapitulo, validarChamada, validarFecho, validarLongo,
  contarPalavras, ORCAMENTO, MAX_PALAVRAS_TITULO, PARTES_DO_CAPITULO, valoresEmDinheiro, nomeDePessoa,
} from '../youtube/lib/schema-longo.js';
import {
  EXEMPLO_DE_MAPA, EXEMPLO_DE_ABERTURA, EXEMPLO_DE_CAPITULO, EXEMPLO_DE_FECHO,
  EXEMPLO_DE_CHAMADA, EXEMPLO_PARA_COMPARAR, EXEMPLO_DE_DEMONSTRACAO,
  buildPromptMapa, buildPromptAbertura, buildPromptCapitulo, buildPromptChamada, buildPromptFecho,
} from '../youtube/roteiro-longo.js';
import { BORDAO } from '../youtube/lib/schema-short.js';
// ⚠️ A ASSINATURA DO ECRÃ VEM DA PRODUÇÃO. Ver a nota em `lib/imagens-longo.js`: havia
//    aqui uma cópia mais grosseira, as duas divergiram, e a prova reprovava cenas boas.
import { assinaturaDoEcra } from '../youtube/lib/imagens-longo.js';
import { montarFichaDeDivida } from '../youtube/lib/simulador.js';
// ⚠️ A MESMA função que alimenta o caderno de cenas. É de propósito: o que ela lê nos
//    exemplos é exactamente o que ela vai proibir no vídeo seguinte. Uma conta, um sítio.
import {
  cenariosDoTexto, ELENCOS, FUNCOES_DO_APP, RAIO_DE_CENARIOS,
  escolherElenco, escolherFuncaoDoApp, elencosGastos,
} from '../youtube/lib/cenarios-do-longo.js';
import { buildPromptLeitorBloco, buildPromptLeitorCapitulo } from '../youtube/lib/leitor-longo.js';

let passou = 0;
let falhou = 0;
const falhas = [];

function ok(nome, condicao, detalhe = '') {
  if (condicao) {
    passou++;
    console.log(`  ✅ ${nome}`);
  } else {
    falhou++;
    falhas.push(`${nome}${detalhe ? ` — ${detalhe}` : ''}`);
    console.log(`  ❌ ${nome}${detalhe ? ` — ${detalhe}` : ''}`);
  }
}

const semCopia = (v) => ({ ...v, erros: v.erros.filter((e) => !/copiou o exemplo/.test(e)) });
const passa = (v) => semCopia(v).erros.length === 0;
const porque = (v) => semCopia(v).erros.join(' | ');

// ═══ 1. OS EXEMPLOS DOS PROMPTS PASSAM NAS TRAVAS DOS PROMPTS ════════════════
console.log('\n1️⃣  OS EXEMPLOS ✓ DOS PROMPTS PASSAM NAS PRÓPRIAS TRAVAS');
console.log('   (é a prova que impede a 16ª ocorrência de prompt-contra-validador)\n');

{
  const v = validarMapa(EXEMPLO_DE_MAPA);
  ok('o mapa-exemplo passa em validarMapa()', v.ok, v.erros.join(' | '));
}
{
  const v = validarAbertura(EXEMPLO_DE_ABERTURA.fala, { promessa: EXEMPLO_DE_ABERTURA.promessa });
  ok('a abertura-exemplo passa em validarAbertura()', passa(v), porque(v));
  ok(
    `a abertura-exemplo cabe no orçamento (${contarPalavras(EXEMPLO_DE_ABERTURA.fala)} palavras, faixa ${ORCAMENTO.abertura.min}-${ORCAMENTO.abertura.max})`,
    contarPalavras(EXEMPLO_DE_ABERTURA.fala) >= ORCAMENTO.abertura.min
      && contarPalavras(EXEMPLO_DE_ABERTURA.fala) <= ORCAMENTO.abertura.max,
  );
}
/**
 * O PLANO DE UM CAPÍTULO, montado a partir do MAPA — é o que o gerador faz em
 * produção, e a prova tem de o fazer igual. Se aqui se inventasse um plano à mão, as
 * travas novas (o número-espinha, a lista fechada de valores, quem demonstra o app)
 * não estariam a ser testadas de todo — passariam por não ter dados.
 */
const planoDoExemplo = (i) => ({
  ...EXEMPLO_DE_MAPA.capitulos[i],
  numeroEspinha: EXEMPLO_DE_MAPA.numeroEspinha,
  valoresPermitidos: EXEMPLO_DE_MAPA.valores.map((v) => v.valor),
  temDemonstracao: EXEMPLO_DE_MAPA.capituloDaDemonstracao === i + 1,
});

{
  const v = validarCapitulo(EXEMPLO_DE_CAPITULO, 0, { plano: planoDoExemplo(0) });
  const n = PARTES_DO_CAPITULO.map((p) => EXEMPLO_DE_CAPITULO[p]).join(' ');
  ok('o capítulo-exemplo (ato 1, sem o app) passa em validarCapitulo()', passa(v), porque(v));
  ok(
    `o capítulo-exemplo cabe no orçamento (${contarPalavras(n)} palavras, faixa ${ORCAMENTO.capitulo.min}-${ORCAMENTO.capitulo.max})`,
    contarPalavras(n) >= ORCAMENTO.capitulo.min && contarPalavras(n) <= ORCAMENTO.capitulo.max,
  );
  /**
   * E O ATO QUE LEVA A DEMONSTRAÇÃO — com o orçamento PRÓPRIO dele.
   * ⚠️ A 1ª versão desta prova encurtava o desenvolvimento à mão para caber nas 240
   * palavras dos outros atos, e essa gambiarra escondia o defeito real: o ato com
   * demonstração tem QUATRO partes e nunca coube nesse orçamento. Foi por isso que o
   * capítulo 2 saiu com 243 numa corrida a sério. A cura foi dar-lhe orçamento próprio;
   * a prova agora mede as quatro partes inteiras, como elas vão ao ar.
   */
  const ato2 = { ...EXEMPLO_DE_CAPITULO, demonstracao: EXEMPLO_DE_DEMONSTRACAO };
  const v2 = validarCapitulo(ato2, 1, { plano: planoDoExemplo(1) });
  ok('a demonstração-exemplo passa no ato que a leva', passa(v2), porque(v2));
}
{
  const v = validarChamada(EXEMPLO_DE_CHAMADA);
  ok('a chamada-exemplo passa em validarChamada()', v.ok, v.erros.join(' | '));
}
{
  const v = validarFecho(EXEMPLO_DE_FECHO, { promessa: EXEMPLO_DE_ABERTURA.promessa });
  ok('o fecho-exemplo passa em validarFecho()', passa(v), porque(v));
  ok(
    `o fecho-exemplo cabe no orçamento (${contarPalavras(EXEMPLO_DE_FECHO)} palavras, faixa ${ORCAMENTO.fecho.min}-${ORCAMENTO.fecho.max})`,
    contarPalavras(EXEMPLO_DE_FECHO) >= ORCAMENTO.fecho.min && contarPalavras(EXEMPLO_DE_FECHO) <= ORCAMENTO.fecho.max,
  );
}
{
  /**
   * O QUE LIGA O MAPA-EXEMPLO AO CAPÍTULO-EXEMPLO: o dinheiro.
   * Se um dia alguém mexer num sem mexer no outro, isto acende — e é o defeito mais
   * caro que este vídeo pode ter, porque produz duas histórias no mesmo guião.
   */
  const valorDe = (nome) => EXEMPLO_DE_MAPA.valores.find((v) => v.nome === nome)?.valor;
  const s = EXEMPLO_DE_MAPA.somas[0];
  const soma = s.de.map(valorDe).reduce((a, b) => a + b, 0);
  ok(`a soma do mapa-exemplo bate (${s.de.map(valorDe).join(' + ')} = ${valorDe(s.da)})`, soma === valorDe(s.da));
  ok(
    `o número-espinha (${EXEMPLO_DE_MAPA.numeroEspinha}) está na lista de valores`,
    EXEMPLO_DE_MAPA.valores.some((v) => v.valor === EXEMPLO_DE_MAPA.numeroEspinha),
  );

  const ditosNoAto1 = valoresEmDinheiro(PARTES_DO_CAPITULO.map((p) => EXEMPLO_DE_CAPITULO[p]).join(' '));
  const permitidos = EXEMPLO_DE_MAPA.valores.map((v) => v.valor);
  ok(
    `o capítulo-exemplo só diz dinheiro da lista (disse ${ditosNoAto1.join(', ')})`,
    ditosNoAto1.every((v) => permitidos.includes(v)),
  );
  ok(
    `e diz o número-espinha (${EXEMPLO_DE_MAPA.numeroEspinha})`,
    ditosNoAto1.includes(EXEMPLO_DE_MAPA.numeroEspinha),
  );
}

// ═══ 1-bis. A FICHA DE DÍVIDA ════════════════════════════════════════════════
console.log('\n1️⃣-bis  A FICHA DE DÍVIDA — a conta que o vídeo vai ensinar');
console.log('   (é um número financeiro que vai ao ar: a aritmética tem de fechar)\n');

{
  const f = montarFichaDeDivida(1200);
  if (!f) {
    ok('há taxas de dívida colhidas do Banco Central', false, 'corra scripts/update-divida.js');
  } else {
    ok(`a ficha é calculada (fatura de ${f.fatura})`, true);
    ok(`o mínimo mais o que sobra dá a fatura (${f.minimoPago} + ${f.sobra} = ${f.fatura})`, f.minimoPago + f.sobra === f.fatura);
    ok(`o que sobra mais os juros do mês dá o saldo (${f.sobra} + ${f.jurosDoRotativo} = ${f.saldoParaParcelar})`, Math.abs(f.sobra + f.jurosDoRotativo - f.saldoParaParcelar) <= 1);
    ok(`as parcelas mais o mínimo dão o total pago (${f.parcela}×${f.meses} + ${f.minimoPago} ≈ ${f.totalPago})`, Math.abs((f.parcela * f.meses) + f.minimoPago - f.totalPago) <= f.meses);
    ok(`o "a mais" é o total menos a fatura (${f.totalPago} − ${f.fatura} = ${f.aMais})`, f.totalPago - f.fatura === f.aMais);
    ok('pagar só o mínimo sai MAIS caro que pagar a fatura', f.totalPago > f.fatura);
    /**
     * ⚠️ A PROVA QUE IMPEDE UMA MENTIRA FINANCEIRA.
     * A versão dramática desta história seria "o rotativo rola para sempre e a dívida
     * dobra". **A lei brasileira proíbe isso desde 2017** (Resolução CMN 4.549: depois
     * de um mês o banco é obrigado a parcelar). Se um dia alguém trocar o modelo por
     * uma bola de neve infinita, o total dispara e esta prova acende.
     */
    ok(
      `o modelo NÃO é bola de neve infinita — o total (${f.totalPago}) fica abaixo do dobro da fatura`,
      f.totalPago < f.fatura * 2.5,
      'um rotativo infinito daria muito mais — e seria falso desde 2017',
    );
    ok('a ficha declara a fonte e o que o número é', /Banco Central/.test(f.texto) && /mediana/.test(f.texto));
    ok('a ficha NÃO deixa a percentagem entrar nos valores que se podem dizer', !f.permitidos.includes(16) && !f.permitidos.includes(15));
    console.log(`     ↳ ${f.texto.split('\n').slice(-2, -1)[0]}`);
  }
}

// ═══ 2. OS DADOS REAIS ═══════════════════════════════════════════════════════
console.log('\n2️⃣  OS TÍTULOS DE CAPÍTULO, MEDIDOS CONTRA OS VÍDEOS REAIS');
console.log('   (a lição de 03/08: prova sintética passa, o caso real falha)\n');

{
  const caminho = join(process.cwd(), '.github', 'data', 'youtube-capitulos.json');
  const dados = JSON.parse(readFileSync(caminho, 'utf-8'));
  const titulos = dados.videos.flatMap((v) => v.capitulos.map((c) => c.titulo));

  const comprido = titulos.filter((t) => contarPalavras(t) > MAX_PALAVRAS_TITULO);
  ok(
    `nenhum dos ${titulos.length} títulos reais é reprovado por comprimento (teto ${MAX_PALAVRAS_TITULO})`,
    comprido.length === 0,
    comprido.join(' · '),
  );

  // Um mapa é construído com cada título real, para o validador o julgar de verdade.
  const mapaCom = (titulo) => validarMapa({
    ...EXEMPLO_DE_MAPA,
    capitulos: EXEMPLO_DE_MAPA.capitulos.map((c, i) => (i === 0 ? { ...c, titulo } : c)),
  });
  const recusados = titulos.filter((t) => !mapaCom(t).ok);
  const esperados = titulos.filter((t) => /^(introdu|conclus)/i.test(t.trim()));
  ok(
    `os títulos recusados são EXATAMENTE os genéricos (${recusados.length} recusados, ${esperados.length} genéricos reais)`,
    recusados.length === esperados.length && recusados.every((t) => esperados.includes(t)),
    `recusados: ${recusados.join(' · ')}`,
  );
  console.log(`     ↳ recusados (e bem): ${recusados.join(' · ')}`);
}

// ═══ 3. OS CASOS MAUS TÊM DE REPROVAR ════════════════════════════════════════
console.log('\n3️⃣  OS CASOS MAUS REPROVAM (uma trava que não morde não é trava)\n');

const reprova = (nome, v, agulha) => ok(
  nome,
  !v.ok && v.erros.some((e) => e.toLowerCase().includes(agulha.toLowerCase())),
  `erros: ${v.erros.join(' | ') || '(nenhum!)'}`,
);

// — o mapa —
reprova(
  'mapa: o número-espinha não está na lista de valores',
  validarMapa({ ...EXEMPLO_DE_MAPA, numeroEspinha: 777 }),
  'não está na lista de valores',
);
reprova(
  'mapa: sem lista de valores (nada travaria o dinheiro inventado)',
  validarMapa({ ...EXEMPLO_DE_MAPA, valores: [] }),
  'sem "valores"',
);
reprova(
  'mapa: o app demonstrado em capítulo nenhum',
  validarMapa({ ...EXEMPLO_DE_MAPA, capituloDaDemonstracao: 0 }),
  'tem de ser 1, 2 ou 3',
);
reprova(
  'mapa: um ato que não acrescenta nada à história',
  validarMapa({ ...EXEMPLO_DE_MAPA, capitulos: EXEMPLO_DE_MAPA.capitulos.map((c, i) => (i === 1 ? { ...c, oQueAcrescenta: '' } : c)) }),
  'senão o vídeo dá voltas',
);
reprova(
  'mapa: um capítulo chamado "Introdução"',
  validarMapa({ ...EXEMPLO_DE_MAPA, capitulos: EXEMPLO_DE_MAPA.capitulos.map((c, i) => (i === 0 ? { ...c, titulo: 'Introdução' } : c)) }),
  'não promete nada',
);
reprova(
  'mapa: a soma NÃO bate (por um real que seja)',
  validarMapa({
    ...EXEMPLO_DE_MAPA,
    valores: EXEMPLO_DE_MAPA.valores.map((v) => (v.nome === 'o jogo do celular' ? { ...v, valor: 61 } : v)),
  }),
  'a conta tem de bater',
);
reprova(
  'mapa: o fim não responde ao que a promessa prometeu',
  validarMapa({ ...EXEMPLO_DE_MAPA, respostaDaPromessa: 'Guardar dinheiro todo mês muda a vida de qualquer pessoa' }),
  'não fala de nada do que a promessa prometeu',
);
reprova(
  'mapa: a promessa vem como pergunta',
  validarMapa({ ...EXEMPLO_DE_MAPA, promessa: 'Você sabe quantas assinaturas você paga sem usar todo mês?' }),
  'a promessa termina em "?"',
);
reprova(
  'mapa: o laço aberto promete um próximo vídeo',
  validarMapa({ ...EXEMPLO_DE_MAPA, lacoAberto: 'e no próximo vídeo eu te mostro como cancelar tudo de uma vez' }),
  'promete um próximo vídeo',
);

// — a abertura —
/**
 * 🔴 ESTA PROVA VIROU-SE AO CONTRÁRIO EM 08/08/2026, e é isso que ela agora garante.
 *
 * Até aqui ela exigia que a 1ª frase FOSSE uma pergunta. O dono viu o vídeo pronto e
 * disse: *"ele faz uma pergunta muito longa logo de início, isso não é nada
 * chamativo"*, e mandou dois vídeos de referência — os dois abrem com uma CENA.
 * A ordem passou a ser CENA → PERGUNTA → PROMESSA, e a prova acompanha.
 */
/**
 * ⚠️ **E NO MESMO DIA A REGRA AFROUXOU**, também por ordem dele: *"não precisa
 * necessariamente trocar o início e retirar a pergunta, eu quero que o texto seja mais
 * leve, mais simples, mais do dia a dia"*. O que o incomodava não era a pergunta — era
 * a pergunta LONGA e VAGA. Por isso uma pergunta curta na 1ª frase **passa**, e é isto
 * que esta prova garante: que ninguém volte a proibi-la sem ler esta linha.
 */
const aberturaComPerguntaCurtaNaCapa = EXEMPLO_DE_ABERTURA.fala.replace(
  'Todo dia dez a conta de luz chega na caixa do correio da minha mãe.',
  'Por que a conta de luz sobe sozinha todo mês?',
);
{
  // ⚠️ `passa()` e não `.length`: `validarAbertura` devolve `{ ok, erros }`, e a
  //    anti-cópia reprova sempre um exemplo comparado consigo próprio.
  const v = validarAbertura(aberturaComPerguntaCurtaNaCapa, { promessa: EXEMPLO_DE_ABERTURA.promessa });
  ok('abertura: uma PERGUNTA CURTA na 1ª frase é permitida (o que se proíbe é ser comprida)', passa(v), porque(v));
}
/**
 * A queixa exacta do dono sobre o vídeo que ele viu: *"ele começa dizendo 'um deles
 * para de trabalhar'... mas quem é um deles? Não se falou nada de ninguém antes."*
 */
const aberturaComPronomeSolto = EXEMPLO_DE_ABERTURA.fala.replace(
  'Todo dia dez a conta de luz chega na caixa do correio da minha mãe.',
  'Um deles para de trabalhar e respira.',
);
reprova(
  'abertura: começa a apontar para quem ainda não foi apresentado',
  validarAbertura(aberturaComPronomeSolto, { promessa: EXEMPLO_DE_ABERTURA.promessa }),
  'ainda não foi apresentado',
);
/**
 * 🔴 O CANAL É ANÓNIMO — 08/08/2026, correcção do dono.
 * Os dois vídeos que ele deu como referência dão nomes aos personagens (Norberto e
 * Célia). O gerador copiou a ideia e saiu *"por que o João se aposentou e o Carlos
 * ainda pega ônibus"*. Ele corrigiu: *"não temos nada que fale sobre colocar nomes de
 * pessoas, o nosso ecossistema é anónimo, aquilo era um exemplo"*.
 */
const aberturaComNome = EXEMPLO_DE_ABERTURA.fala.replace(
  'Todo dia dez a conta de luz chega na caixa do correio da minha mãe.',
  'Todo dia dez a conta de luz chega na casa do João.',
);
reprova(
  'abertura: dá nome a uma pessoa (o canal é anónimo)',
  validarAbertura(aberturaComNome, { promessa: EXEMPLO_DE_ABERTURA.promessa }),
  'este canal é ANÓNIMO',
);
{
  // E o que NÃO pode ser confundido com nome de pessoa.
  const seguros = ['A taxa do Banco Central subiu', 'Joguei tudo no FinMoovi', 'O meu vizinho parou', 'A moça do caixa disse'];
  ok('nenhuma marca ou pessoa-sem-nome é confundida com nome próprio', seguros.every((s) => !nomeDePessoa(s)));
}

const aberturaSemPergunta = EXEMPLO_DE_ABERTURA.fala.replace('Então o que mudou?', 'Então alguma coisa mudou.');
reprova(
  'abertura: a cena está lá mas nunca chega a haver pergunta',
  validarAbertura(aberturaSemPergunta, { promessa: EXEMPLO_DE_ABERTURA.promessa }),
  'não há nenhuma pergunta',
);
reprova(
  'abertura: a capa é comprida demais para caber na tela',
  validarAbertura(
    `Você por acaso já parou um minuto para pensar em qual é mesmo o aparelho da sua casa que gasta mais luz do que a geladeira velha? ${EXEMPLO_DE_ABERTURA.fala}`,
    { promessa: EXEMPLO_DE_ABERTURA.promessa },
  ),
  'palavras (máximo',
);
reprova(
  'abertura: pede o comentário (o pedido é uma vez só, e não é aqui)',
  validarAbertura(`${EXEMPLO_DE_ABERTURA.fala} Comenta aqui embaixo o que você achou.`, { promessa: EXEMPLO_DE_ABERTURA.promessa }),
  'o pedido é UMA vez só',
);
reprova(
  'abertura: diz o bordão antes do fim',
  validarAbertura(`${EXEMPLO_DE_ABERTURA.fala} ${BORDAO}`, { promessa: EXEMPLO_DE_ABERTURA.promessa }),
  'só pode aparecer no FECHO',
);

// — o capítulo —
reprova(
  'capítulo: cita uma percentagem por extenso',
  validarCapitulo(
    { ...EXEMPLO_DE_CAPITULO, regancho: 'E olha que isso é quase treze por cento do mercado do mês.' },
    0, { plano: planoDoExemplo(0) },
  ),
  'PERCENTAGEM',
);
reprova(
  'capítulo: promete rendimento sem conta calculada',
  validarCapitulo(
    { ...EXEMPLO_DE_CAPITULO, regancho: 'Esse dinheiro rende duzentos e cinquenta reais por ano se você guardar.' },
    0, { plano: planoDoExemplo(0) },
  ),
  'soe a rendimento com número',
);
reprova(
  'capítulo: NÃO diz o número deste vídeo (era o defeito nº1 do 1º vídeo)',
  validarCapitulo(
    {
      ...EXEMPLO_DE_CAPITULO,
      desenvolvimento: EXEMPLO_DE_CAPITULO.desenvolvimento.replace(/e deu cento e oitenta e nove reais/, 'e deu um susto'),
      regancho: EXEMPLO_DE_CAPITULO.regancho.replace(/cento e oitenta e nove reais/, 'esse dinheiro'),
    },
    0, { plano: planoDoExemplo(0) },
  ),
  'NÃO é dito neste ato',
);
reprova(
  'capítulo: inventa dinheiro que não está na lista do mapa',
  validarCapitulo(
    { ...EXEMPLO_DE_CAPITULO, regancho: 'E no ano passado isso já tinha me custado dois mil e trezentos reais sem eu ver.' },
    0, { plano: planoDoExemplo(0) },
  ),
  'esse dinheiro NÃO existe nesta história',
);
reprova(
  'capítulo: nomeia o app num ato que não é o da demonstração',
  validarCapitulo(
    { ...EXEMPLO_DE_CAPITULO, regancho: `${EXEMPLO_DE_CAPITULO.regancho} Foi o FinMoovi que me mostrou isso.` },
    0, { plano: planoDoExemplo(0) },
  ),
  'o app NÃO é demonstrado neste capítulo',
);
reprova(
  'capítulo: é o da demonstração e não a escreveu',
  validarCapitulo({ ...EXEMPLO_DE_CAPITULO }, 1, { plano: planoDoExemplo(1) }),
  'falta a parte "demonstracao"',
);
reprova(
  'capítulo: a demonstração não nomeia o app',
  validarCapitulo(
    { ...EXEMPLO_DE_CAPITULO, demonstracao: EXEMPLO_DE_DEMONSTRACAO.replace(/FinMoovi/g, 'aplicativo') },
    1, { plano: planoDoExemplo(1) },
  ),
  'não diz FinMoovi',
);
reprova(
  'capítulo: pede inscrição (o erro que mata o formato longo)',
  validarCapitulo(
    { ...EXEMPLO_DE_CAPITULO, regancho: 'Se inscreve aqui que a próxima parte é a mais simples das três.' },
    0, { plano: planoDoExemplo(0) },
  ),
  'o pedido acontece UMA vez',
);
reprova(
  'capítulo: a parte "pergunta" não abre com pergunta',
  validarCapitulo(
    { ...EXEMPLO_DE_CAPITULO, pergunta: 'Eu abri a geladeira num domingo e achei comida estragada lá no fundo. Naquela vez eu parei pra contar quanto tinha custado.' },
    0, { plano: planoDoExemplo(0) },
  ),
  'tem de ABRIR com uma pergunta',
);

// — a chamada —
reprova('chamada: não diz FINMOOVI', validarChamada('Quer ver quanto a sua casa está levando por mês? Comenta aqui embaixo que eu te mando o app de graça hoje.'), 'não diz FINMOOVI');
reprova('chamada: não pede nada', validarChamada('Quer ver quanto a sua casa está levando por mês nessas coisas pequenas? O FinMoovi faz essa conta em dois toques, de graça.'), 'não pede nada');

// — o fecho —
reprova('fecho: sem o bordão', validarFecho(EXEMPLO_DE_FECHO.replace(BORDAO, 'E é isso.'), { promessa: EXEMPLO_DE_ABERTURA.promessa }), 'não foi dito');
reprova(
  'fecho: o bordão foi reescrito',
  validarFecho(EXEMPLO_DE_FECHO.replace(BORDAO, 'Dinheiro sem controle acaba indo para o outro lado.'), { promessa: EXEMPLO_DE_ABERTURA.promessa }),
  'foi ALTERADO',
);
reprova(
  'fecho: cita o app (rouba o lugar da resposta)',
  validarFecho(EXEMPLO_DE_FECHO.replace('E ainda tem a bandeira', 'E o app ainda mostra a bandeira'), { promessa: EXEMPLO_DE_ABERTURA.promessa }),
  'fala de',
);
reprova(
  'fecho: promete o próximo vídeo (não há fila travada)',
  validarFecho(EXEMPLO_DE_FECHO.replace(BORDAO, `No próximo vídeo eu te mostro a bandeira. ${BORDAO}`), { promessa: EXEMPLO_DE_ABERTURA.promessa }),
  'promete',
);

// ═══ 4. A ANTI-CÓPIA TEM DENTES ══════════════════════════════════════════════
console.log('\n4️⃣  A ANTI-CÓPIA MORDE QUEM COPIAR O EXEMPLO');
console.log('   (registado 13 vezes: todo exemplo escrito num prompt é copiado à letra)\n');

{
  const v = validarCapitulo(EXEMPLO_DE_CAPITULO, 0, { plano: planoDoExemplo(0), exemploParaComparar: EXEMPLO_PARA_COMPARAR });
  ok('o capítulo-exemplo entregue tal e qual é REPROVADO por cópia', !v.ok && v.erros.some((e) => /copiou o exemplo/.test(e)), v.erros.join(' | '));
}
{
  const v = validarAbertura(EXEMPLO_DE_ABERTURA.fala, { promessa: EXEMPLO_DE_ABERTURA.promessa, exemploParaComparar: EXEMPLO_PARA_COMPARAR });
  ok('a abertura-exemplo entregue tal e qual é REPROVADA por cópia', !v.ok && v.erros.some((e) => /copiou o exemplo/.test(e)), v.erros.join(' | '));
}
{
  const v = validarFecho(EXEMPLO_DE_FECHO, { promessa: EXEMPLO_DE_ABERTURA.promessa, exemploParaComparar: EXEMPLO_PARA_COMPARAR.replace(BORDAO, '') });
  ok('o fecho-exemplo entregue tal e qual é REPROVADO por cópia', !v.ok && v.erros.some((e) => /copiou o exemplo/.test(e)), v.erros.join(' | '));
}
{
  // ⚠️ E A OUTRA METADE, QUE É A QUE JÁ NOS MORDEU: a anti-cópia NÃO pode reprovar o
  // molde que o próprio prompt manda usar. A chamada é esse molde, e por isso está
  // FORA da comparação. Se alguém a puser lá dentro, esta prova acende.
  const v = validarChamada(EXEMPLO_DE_CHAMADA);
  const contaminado = /Comenta FINMOOVI aqui embaixo/.test(EXEMPLO_PARA_COMPARAR);
  ok('a chamada (o molde ordenado pelo prompt) NÃO entra na anti-cópia', !contaminado && v.ok, v.erros.join(' | '));
}
{
  // E o BORDÃO também não — é obrigatório e vai à letra.
  ok('o bordão NÃO entra na anti-cópia do fecho', !EXEMPLO_PARA_COMPARAR.includes(BORDAO));
}

// ═══ 5. AS TRAVAS GLOBAIS ════════════════════════════════════════════════════
console.log('\n5️⃣  AS TRAVAS GLOBAIS (o que só se vê olhando o vídeo inteiro)\n');

/**
 * ⚠️ UM VÍDEO NO MODELO NOVO: a mesma história nos dois atos, o mesmo dinheiro, e o
 * app nomeado NUMA VEZ SÓ. Antes deste conserto, esta peça de prova tinha um número
 * diferente por capítulo e uma demonstração em cada — ou seja, reproduzia fielmente
 * o defeito que o dono apanhou no primeiro vídeo. Uma prova que valida o defeito é
 * pior do que não ter prova.
 */
const roteiroBom = {
  abertura: EXEMPLO_DE_ABERTURA.fala,
  capitulos: [
    { ...EXEMPLO_DE_CAPITULO },
    {
      titulo: 'O que aparece quando você põe tudo no mesmo lugar',
      // ⚠️ Esta frase foi reescrita porque a trava anti-repetição a apanhou a ECOAR o
      // fim do ato anterior ("há quanto tempo é que isso já…"). Retomar não é ecoar —
      // e a trava provou o seu valor apanhando o defeito na peça de prova de quem a
      // escreveu.
      pergunta: 'Você alguma vez foi ver desde quando aquilo saía da sua conta? Eu fui, e o que encontrei é pior do que a soma.',
      desenvolvimento: 'Peguei as faturas dos meses anteriores, uma a uma. O streaming vinha desde o inverno. A academia, desde que eu troquei de emprego. O jogo, desde as férias do meu filho. Multipliquei os cento e oitenta e nove reais pelos meses em que ninguém tinha olhado, e o número que saiu dali não cabia numa margem de papel.',
      demonstracao: 'Foi quando eu pus as três no FinMoovi que aquilo parou de ser um susto e virou uma linha na tela, com a data em que cada cobrança tinha começado.',
      regancho: 'Só que saber há quanto tempo aquilo sai não devolve um real. A pergunta que interessa é outra: quais delas saem hoje?',
    },
  ],
  chamada: EXEMPLO_DE_CHAMADA,
  fecho: EXEMPLO_DE_FECHO,
};

{
  const v = validarLongo(roteiroBom);
  ok('um vídeo bem montado passa nas travas globais', v.ok, v.erros.join(' | '));
  console.log(`     ↳ ${v.palavras} palavras ≈ ${Math.round(v.segundos)}s de fala`);
}
{
  const repetido = JSON.parse(JSON.stringify(roteiroBom));
  repetido.capitulos[1].desenvolvimento += ' Naquele domingo eu sentei com ela na mão e fui descendo linha por linha.';
  const v = validarLongo(repetido);
  ok('dois capítulos que repetem a mesma frase são apanhados', !v.ok && v.erros.some((e) => /repetem a mesma frase/.test(e)), v.erros.join(' | '));
}
{
  /**
   * ⚠️ E A OUTRA METADE, que é a que faltava e custou a 18ª ocorrência:
   * dizer o MESMO NÚMERO nos três atos é OBRIGATÓRIO, e não pode ser lido como
   * repetição. Se alguém voltar a pôr os números na comparação, esta prova acende.
   */
  const mesmoNumero = JSON.parse(JSON.stringify(roteiroBom));
  mesmoNumero.capitulos[1].regancho += ' E os cento e oitenta e nove reais continuavam lá.';
  const v = validarLongo(mesmoNumero);
  ok('dizer o MESMO número nos dois atos NÃO é lido como repetição', v.ok, v.erros.join(' | '));
}
{
  const pedeDuasVezes = JSON.parse(JSON.stringify(roteiroBom));
  pedeDuasVezes.capitulos[0].regancho += ' Se inscreve no canal que já vem a próxima parte.';
  const v = validarLongo(pedeDuasVezes);
  ok('o pedido fora do bloco da chamada é apanhado', !v.ok && v.erros.some((e) => /o pedido \(comentar/.test(e)), v.erros.join(' | '));
}
{
  const assinaDuasVezes = JSON.parse(JSON.stringify(roteiroBom));
  assinaDuasVezes.abertura += ` ${BORDAO}`;
  const v = validarLongo(assinaDuasVezes);
  ok('o bordão fora do fecho é apanhado', !v.ok && v.erros.some((e) => /bordão do canal aparece/.test(e)), v.erros.join(' | '));
}
{
  /**
   * 🔴 A TRAVA QUE SUBSTITUIU A DO "MESMO NÚMERO" — e a substituição é o coração do
   * conserto de 04/08. A antiga exigia números DIFERENTES por capítulo e foi ela que
   * produziu três histórias no mesmo vídeo. A nova garante o contrário: o produto
   * aparece uma vez, e a história é uma só.
   */
  const appDuasVezes = JSON.parse(JSON.stringify(roteiroBom));
  appDuasVezes.capitulos[0].regancho += ' Eu vi isso tudo no FinMoovi.';
  const v = validarLongo(appDuasVezes);
  ok('o app nomeado em DOIS capítulos é apanhado', !v.ok && v.erros.some((e) => /nomeado nos capítulos/.test(e)), v.erros.join(' | '));
}

// ═══ 6. CADA TRAVA ESTÁ ESCRITA NO PROMPT QUE A DEVIA ENSINAR ════════════════
console.log('\n6️⃣  CADA TRAVA ESTÁ ESCRITA NO PROMPT QUE A DEVIA ENSINAR');
console.log('   (a prova nasceu de uma falha REAL: a trava punia "moedinha" e o prompt nunca a proibiu)\n');

{
  const tema = { term: 'tema de prova', angle: 'ângulo de prova', definition: '', body: '' };
  const prompts = {
    mapa: buildPromptMapa(tema, []),
    abertura: buildPromptAbertura(tema, EXEMPLO_DE_MAPA, []),
    capitulo: buildPromptCapitulo(tema, EXEMPLO_DE_MAPA, 0, ''),
    chamada: buildPromptChamada(tema, EXEMPLO_DE_MAPA, ''),
    fecho: buildPromptFecho(tema, EXEMPLO_DE_MAPA, ''),
  };

  /**
   * Cada linha é: uma trava que existe no código, e a palavra que TEM de aparecer no
   * prompt para quem escreve saber dela. Se alguém acrescentar uma trava sem ensinar
   * a regra, esta prova fica vermelha — que é exatamente o que faltou nas quinze
   * ocorrências anteriores deste defeito.
   */
  const alinhamento = [
    ['percentagem proibida', ['capitulo', 'abertura', 'fecho', 'mapa'], /percentagem/i],
    ['rendimento sem ficha', ['capitulo', 'abertura', 'fecho', 'mapa'], /prometer rendimento/i],
    ['soma tem de bater', ['capitulo', 'mapa'], /soma/i],
    ['não rebaixar o dinheiro', ['capitulo', 'abertura', 'fecho'], /moedinha|rebaixe o dinheiro/i],
    ['brindes que não existem', ['capitulo', 'chamada'], /planilha/i],
    ['diga "vídeo", nunca "Short"', ['capitulo', 'abertura', 'fecho'], /nunca "Short"/i],
    ['o pedido é uma vez só', ['capitulo', 'abertura'], /NÃO PEÇA NADA|Não peça NADA/],
    ['o bordão só no fecho', ['capitulo', 'abertura'], /bordão/i],
    ['o bordão é a última frase', ['fecho'], /última frase do vídeo é o bordão|assinar/i],
    ['o fecho não cita fonte', ['fecho'], /NÃO CITA FONTE/],
    ['não prometer o próximo vídeo', ['fecho', 'mapa'], /pr[óo]ximo v[íi]deo/i],
    // 🔴 Virou-se ao contrário em 08/08/2026 — ver a prova da abertura, mais acima.
    ['a 1ª frase não pode ser comprida e vaga', ['abertura'], /comprida e vaga/],
    ['fale como se fala na cozinha', ['abertura'], /COMO SE FALA NESTE CANAL/],
    ['ninguém tem nome neste canal', ['abertura', 'capitulo', 'fecho'], /NINGUÉM TEM NOME NESTE CANAL/],
    ['ninguém é "um deles" antes de ser apresentado', ['abertura'], /antes de dizer o que fazem/],
    ['o título de capítulo não é genérico', ['mapa'], /Introdução/],
    ['a chamada diz FINMOOVI', ['chamada'], /FINMOOVI/],
    ['o capítulo abre com pergunta', ['capitulo'], /PERGUNTA que dói/],
    ['a demonstração nomeia o app', ['capitulo'], /FinMoovi/],
    ['trata por "você", nunca por "o senhor"', ['capitulo', 'abertura', 'fecho', 'chamada', 'mapa'], /NUNCA por "o senhor"/],
    ['a abertura não gasta os números da história', ['abertura'], /NÃO GASTA OS NÚMEROS DA HISTÓRIA/],
    ['os três atos têm nome e papel', ['capitulo', 'mapa'], /O SUSTO[\s\S]*A ARMADILHA[\s\S]*A VIRADA/],
  ];

  for (const [nome, onde, agulha] of alinhamento) {
    const faltam = onde.filter((p) => !agulha.test(prompts[p]));
    ok(`"${nome}" está escrito no(s) prompt(s): ${onde.join(', ')}`, faltam.length === 0, `falta em: ${faltam.join(', ')}`);
  }

  // E o inverso, que é o outro lado da mesma moeda: o prompt não pode ORDENAR o que a
  // trava pune. O molde da chamada é o caso vivo — ele está no prompt E tem de passar.
  const v = validarChamada(EXEMPLO_DE_CHAMADA);
  ok('o molde que o prompt da chamada manda usar PASSA na trava da chamada', v.ok, v.erros.join(' | '));

  /**
   * 🔴 A 17ª OCORRÊNCIA, E ESTA ESCAPOU A TODAS AS PROVAS DE CIMA — 10/08/2026.
   *
   * ═══ O QUE ACONTECEU ═══
   * O caderno de cenas (`lib/cenarios-do-longo.js`) entra no pedido do mapa a dizer
   * *"o domingo já saiu, não pode voltar"*. E o vídeo seguinte escreveu à mesma
   * **"Até que eu parei num domingo"**. Não foi desobediência: a palavra *domingo*
   * aparecia CINCO vezes no que o modelo lê, e duas delas como exemplo do que é BOM
   * (o capítulo-exemplo que ele é mandado copiar, e a lista "o que faz isto prender").
   *
   * As provas de cima só olham para um lado — *"a regra está escrita no pedido?"*. Esta
   * olha para o outro: **o pedido está a ENSINAR o que o caderno proíbe?**
   *
   * ═══ A RÉGUA, E PORQUE ELA NÃO É GOSTO ═══
   * `cenariosDoTexto()` é a MESMA função que alimenta o caderno — logo, o que ela lê nos
   * exemplos é exactamente o que ela vai proibir no vídeo seguinte. Uma conta, um sítio.
   *
   * ⚠️ **O ASSUNTO do exemplo está isento, e o enfeite não.** O exemplo declara-se como
   * sendo de outro vídeo (*"o assunto é de OUTRO vídeo de propósito"*) e o modelo é
   * avisado disso; o que ele copia sem pensar é o DETALHE pequeno, porque é esse que se
   * lhe manda copiar quando se diz *"copie a FORMA"*. Por isso `a fatura do cartão` está
   * na lista dos permitidos (é o assunto: três assinaturas caem numa fatura) e mais nada.
   *
   * ⚠️ **Ao acrescentar um permitido aqui, escreva porquê.** Cada nome nesta lista é uma
   * cena que os vídeos vão continuar a repetir — e foi disso que o dono se queixou.
   */
  {
    /**
     * ⚠️ **SÓ O ASSUNTO DECLARADO DE CADA EXEMPLO ENTRA AQUI.** O capítulo-exemplo conta
     * três assinaturas esquecidas que caem numa fatura de cartão; o de abertura conta uma
     * conta de luz. São as histórias deles, ditas ao modelo como sendo *"de OUTRO vídeo
     * de propósito"*. Tudo o resto que apareça é enfeite — e enfeite é o que se copia sem
     * pensar, porque é isso que se pede quando se diz *"copie a FORMA"*.
     *
     * ⚠️ **É por prompt, e não uma lista só.** Uma lista global deixaria a conta de luz
     * passar no pedido do capítulo, onde ela seria uma fuga a sério.
     */
    const ASSUNTO_DO_EXEMPLO = ['a fatura do cartão', 'as assinaturas esquecidas'];
    const ASSUNTO_POR_PEDIDO = {
      capitulo: ASSUNTO_DO_EXEMPLO,
      mapa: ASSUNTO_DO_EXEMPLO,
      abertura: [...ASSUNTO_DO_EXEMPLO, 'a conta de luz'],
    };
    const enfeites = (nome, texto) => {
      const achadas = cenariosDoTexto(texto).filter((c) => !ASSUNTO_DO_EXEMPLO.includes(c));
      ok(
        `o exemplo "${nome}" não ensina nenhuma cena que o caderno vai proibir`,
        achadas.length === 0,
        achadas.length ? `ensina: ${achadas.join(' · ')}` : '',
      );
    };
    enfeites('capítulo', [
      EXEMPLO_DE_CAPITULO.titulo,
      EXEMPLO_DE_CAPITULO.pergunta,
      EXEMPLO_DE_CAPITULO.desenvolvimento,
      EXEMPLO_DE_CAPITULO.regancho,
    ].join(' '));
    enfeites('mapa', (EXEMPLO_DE_MAPA.capitulos || []).map((c) => c.titulo).join(' '));

    /**
     * E o pedido em si — as listas de "o que faz isto prender" e o "repare" que fecha o
     * exemplo são instruções diretas, e foi de lá que o domingo saiu duas das cinco vezes.
     * ⚠️ Aqui NÃO há isenção nenhuma: uma instrução não tem "assunto de outro vídeo".
     */
    for (const [nome, texto] of [['capitulo', prompts.capitulo], ['mapa', prompts.mapa], ['abertura', prompts.abertura]]) {
      const achadas = cenariosDoTexto(texto).filter((c) => !ASSUNTO_POR_PEDIDO[nome].includes(c));
      ok(
        `o pedido do ${nome} não dá como bom exemplo uma cena que o caderno proíbe`,
        achadas.length === 0,
        achadas.length ? `ensina: ${achadas.join(' · ')}` : '',
      );
    }
  }

  /**
   * ⚠️ E O POLIDOR TAMBÉM CONTA — ele reescreve, logo pode partir uma trava.
   * O polidor dos blocos de parágrafo único (abertura, chamada, fecho) foi ligado em
   * 04/08 por ordem do dono. Se o prompt DELE não repetir as regras de verdade de
   * cada bloco, ele vai reescrever à vontade, a versão vai ser recusada pelas travas,
   * e o bloco fica áspero **sem ninguém perceber porquê** — porque o polidor falha em
   * silêncio de propósito (é um lucro, nunca um ponto de falha).
   */
  const promptsDoPolidor = {
    abertura: buildPromptLeitorBloco('texto de prova', { papel: 'abertura', promessa: 'promessa de prova', tema: 'tema de prova' }),
    chamada: buildPromptLeitorBloco('texto de prova', { papel: 'chamada', promessa: 'promessa de prova', tema: 'tema de prova' }),
    fecho: buildPromptLeitorBloco('texto de prova', { papel: 'fecho', promessa: 'promessa de prova', tema: 'tema de prova' }),
  };
  const alinhamentoDoPolidor = [
    ['a capa continua pergunta e cabe na tela', 'abertura', /PERGUNTA que dói.*"\?"/s],
    ['a abertura não pede nada', 'abertura', /NÃO peça nada/],
    ['a abertura não diz o bordão', 'abertura', /NÃO escreva o bordão/],
    ['a chamada mantém FINMOOVI e o pedido', 'chamada', /FINMOOVI e a pedir o comentário/],
    ['a chamada não diz o bordão', 'chamada', /NÃO escreva o bordão/],
    ['o fecho acaba no bordão à letra', 'fecho', /ÚLTIMA frase é o bordão do canal, à letra/],
    ['o fecho não cita fonte', 'fecho', /NÃO cite fonte nenhuma/],
    ['o fecho não promete próximo vídeo', 'fecho', /NÃO prometa um próximo vídeo/],
    ['nenhum dos três cita percentagem', 'abertura', /NÃO cite percentagens/],
    ['nenhum dos três rebaixa o dinheiro', 'fecho', /NÃO rebaixe o dinheiro/],
  ];
  for (const [nome, papel, agulha] of alinhamentoDoPolidor) {
    ok(`polidor · "${nome}" está escrito no prompt do bloco "${papel}"`, agulha.test(promptsDoPolidor[papel]));
  }

  /**
   * 🔴 E O POLIDOR DOS CAPÍTULOS TEM DE SABER QUAL DELES LEVA O APP.
   * Sem isto ele mandava, em TODOS os capítulos, "o app aparece FAZENDO a conta" —
   * e nos dois que não demonstram, a trava proíbe até o nome. Seria o prompt a
   * ordenar exatamente o que o validador reprova, com um agravante: o polidor falha
   * em silêncio, portanto o capítulo ficaria áspero e ninguém saberia porquê.
   */
  const capSemDemo = buildPromptLeitorCapitulo(
    { pergunta: 'P?', desenvolvimento: 'D', regancho: 'R' },
    { titulo: 'T', promessa: 'X', posicao: 1, total: 3, temDemo: false },
  );
  const capComDemo = buildPromptLeitorCapitulo(
    { pergunta: 'P?', desenvolvimento: 'D', demonstracao: 'M', regancho: 'R' },
    { titulo: 'T', promessa: 'X', posicao: 2, total: 3, temDemo: true },
  );
  ok('polidor · o ato SEM app é proibido de escrever o nome do produto', /proibido escrever a palavra FinMoovi/.test(capSemDemo));
  ok('polidor · o ato SEM app não pede "demonstracao" no JSON', !/"demonstracao": "/.test(capSemDemo));
  ok('polidor · o ato COM app pede "demonstracao" no JSON', /"demonstracao": "/.test(capComDemo));
  ok(
    `polidor · cada ato recebe o SEU orçamento (${ORCAMENTO.capitulo.min}-${ORCAMENTO.capitulo.max} · ${ORCAMENTO.capituloComDemo.min}-${ORCAMENTO.capituloComDemo.max})`,
    new RegExp(`${ORCAMENTO.capitulo.min} e ${ORCAMENTO.capitulo.max} palavras`).test(capSemDemo)
      && new RegExp(`${ORCAMENTO.capituloComDemo.min} e ${ORCAMENTO.capituloComDemo.max} palavras`).test(capComDemo),
  );
  ok('polidor · avisa que encurtar abaixo do mínimo faz a versão ser recusada', /ABAIXO do mínimo/.test(capSemDemo));
}

// ═══ 7. O DIRETOR DE IMAGEM ═══════════════════════════════════════════════════
/**
 * ⚠️ ESTAS PROVAS NASCERAM DE UM DEFEITO REAL, e não de zelo.
 *
 * O dono viu o primeiro vídeo longo e disse: *"às vezes fala R$ 1.200 mas está mostrando
 * um b-roll de R$ 5.000"*. A causa era que a escolha de imagens **nunca lia o texto**.
 * A cura foi o `lib/imagens-longo.js`; estas provas são a rede por baixo dele.
 *
 * E a PRIMEIRA delas é a mais importante, porque apanha um defeito que já tinha
 * acontecido e que ninguém teria visto: a montagem estava a **perder 73 palavras do
 * guião** — o parágrafo inteiro em que o app faz a conta — porque o montador percorria
 * três partes do capítulo e o guião passara a ter quatro. Nada dava erro. O vídeo saía
 * mais curto e sem a demonstração, e só se descobriu por acaso.
 */
console.log('\n7️⃣  O DIRETOR DE IMAGEM (a imagem nasce do texto)');
console.log('   (a 1ª prova apanha a montagem a PERDER parágrafos do guião, em silêncio)\n');
{
  const { montarCenas } = await import('../youtube/montar-longo.js');
  const {
    dirigirImagens, conferirImagens, cenaDizFraseDeclarada, escolherLugaresDaMetafora,
    dicionarioDeValores, BROLL_PERMITIDO,
  } = await import('../youtube/lib/imagens-longo.js');

  const mapaDeProva = {
    ...EXEMPLO_DE_MAPA,
    fichaDeDivida: montarFichaDeDivida(EXEMPLO_DE_MAPA.numeroEspinha),
  };
  const guiaoDeProva = {
    tema: 'prova de mesa',
    promessa: EXEMPLO_DE_MAPA.promessa,
    fioCondutor: EXEMPLO_DE_MAPA.fioCondutor,
    abertura: EXEMPLO_DE_ABERTURA,
    capitulos: [1, 2, 3].map((n) => ({
      ...EXEMPLO_DE_CAPITULO,
      titulo: EXEMPLO_DE_MAPA.capitulos[n - 1].titulo,
      ...(n === EXEMPLO_DE_MAPA.capituloDaDemonstracao ? { demonstracao: EXEMPLO_DE_DEMONSTRACAO } : {}),
    })),
    chamada: EXEMPLO_DE_CHAMADA,
    fecho: EXEMPLO_DE_FECHO,
    mapa: mapaDeProva,
  };

  // (a) A MONTAGEM NÃO PERDE UMA PALAVRA — a prova do defeito das 73 palavras
  const cenas = montarCenas(guiaoDeProva);
  const noGuiao = contarPalavras([
    guiaoDeProva.abertura,
    ...guiaoDeProva.capitulos.flatMap((c) => [c.pergunta, c.desenvolvimento, c.demonstracao, c.regancho].filter(Boolean)),
    guiaoDeProva.chamada,
    guiaoDeProva.fecho,
  ].join(' '));
  const nasCenas = cenas.reduce((a, c) => a + c.palavras, 0);
  ok(
    `a montagem leva TODAS as palavras do guião ao vídeo (${nasCenas} de ${noGuiao})`,
    nasCenas === noGuiao,
    `faltam ${noGuiao - nasCenas} palavras — alguma parte do capítulo não está a ser montada`,
  );
  ok(
    'a demonstração do app CHEGA às cenas (é a parte que se perdia)',
    cenas.some((c) => c.parte === 'demonstracao'),
  );

  // (b) o guião de exemplo passa a conferência inteira
  const queixas = conferirImagens(cenas, mapaDeProva);
  ok('o guião de exemplo passa a conferência das imagens', queixas.length === 0, queixas.join(' | '));

  // (c) TODO número no ecrã está na lista fechada do mapa
  const dic = dicionarioDeValores(mapaDeProva);
  const foraDaLista = cenas.flatMap((c) => {
    const v = c.visual || {};
    return [v.valor, v.etiqueta?.valor, ...(v.linhas || []).map((l) => l.valor)]
      .filter((n) => Number.isFinite(n) && !dic.has(n));
  });
  ok('nenhum número no ecrã está fora da lista de valores do mapa', foraDaLista.length === 0, foraDaLista.join(', '));

  // (d) o app aparece num capítulo só, e é o que o mapa escolheu
  const capsComApp = [...new Set(cenas.filter((c) => c.visual?.tipo === 'app').map((c) => c.capitulo))];
  ok(
    `o app aparece só no capítulo ${mapaDeProva.capituloDaDemonstracao}`,
    capsComApp.length === 1 && capsComApp[0] === mapaDeProva.capituloDaDemonstracao,
    `apareceu em ${capsComApp.join(', ')}`,
  );

  // (e) nunca três ecrãs iguais seguidos
  // ⚠️ IMPORTADA da producao, nunca copiada. A copia que estava aqui era mais
  //    grosseira (so `tipo`) e reprovava as cenas do app nos passos 1, 2 e 3 -- que sao
  //    TRES ecras diferentes. Ver `assinaturaDoEcra` em lib/imagens-longo.js.
  const assinatura = (c) => assinaturaDoEcra(c.visual);
  const trioIgual = cenas.some((_, i) => i >= 2 && assinatura(cenas[i]) === assinatura(cenas[i - 1]) && assinatura(cenas[i]) === assinatura(cenas[i - 2]));
  ok('nunca há três ecrãs iguais seguidos', !trioIgual);

  // (f) OS CASOS MAUS REPROVAM — uma conferência que não morde não é conferência
  const mau = (visualExtra, base = cenas) => conferirImagens(
    base.map((c, i) => (i === 4 ? { ...c, visual: { ...c.visual, ...visualExtra } } : c)),
    mapaDeProva,
  );
  ok('reprova um número que não está no mapa', mau({ tipo: 'numero', valor: 4321, rotulo: 'x' }).some((q) => /não está na lista/.test(q)));
  ok('reprova uma frase que o guião não declarou', mau({ tipo: 'frase', texto: 'compre agora com desconto' }).some((q) => /não está declarada/.test(q)));
  ok('reprova b-roll fora da lista permitida', mau({ tipo: 'broll', comp: 'AppNumerosLong' }).some((q) => /b-roll permitido|teto/.test(q)));
  ok(
    'reprova o app num segundo capítulo',
    conferirImagens(
      cenas.map((c) => (c.parte === 'regancho' && c.capitulo === 1 ? { ...c, visual: { tipo: 'app', valor: mapaDeProva.numeroEspinha } } : c)),
      mapaDeProva,
    ).some((q) => /capítulos/.test(q)),
  );

  // (g) ⚠️ O B-ROLL DO CATÁLOGO ESTÁ VAZIO DE PROPÓSITO — e a prova diz porquê, para
  //     ninguém o voltar a encher sem medir. Ver o comentário em `imagens-longo.js`.
  ok('a lista de b-roll do catálogo está vazia (todas as telas mostram dinheiro de outra história)', BROLL_PERMITIDO.length === 0);

  // (h) A RÉGUA DAS SEIS PALAVRAS — reconhece a frase mesmo reescrita, e recusa a
  //     parafraseada. Provado com o caso REAL que motivou a régua.
  ok(
    'reconhece a promessa mesmo com palavras à frente',
    cenaDizFraseDeclarada('Neste vídeo, eu vou te mostrar como achar as assinaturas que você paga sem usar e cortar as maiores ainda hoje.', EXEMPLO_DE_MAPA.promessa),
  );
  ok(
    'NÃO reconhece uma frase só parecida (senão o ecrã promete o que a voz não diz)',
    !cenaDizFraseDeclarada('Tem um hábito pequeno que muita gente deixa pra lá.', 'Tem um hábito simples que faz muita gente voltar para a mesma dívida sem perceber.'),
  );

  // (i) A METÁFORA: a pista FORTE escolhe primeiro. Foi medido numa corrida real que,
  //     sem isto, o ator era gasto num "apertar as contas" e já não havia lugar para o
  //     "levantar uma caixa pesada", que é a imagem da virada.
  const cenasDeProva = [
    { id: 1, parte: 'desenvolvimento', narration: 'Eu vivia apertado com as contas de casa.' },
    { id: 2, parte: 'desenvolvimento', narration: 'Era tudo igual.' },
    { id: 3, parte: 'desenvolvimento', narration: 'Nada de especial aqui.' },
    { id: 4, parte: 'desenvolvimento', narration: 'Foi igual levantar uma caixa pesada do jeito certo.' },
  ];
  const lugares = escolherLugaresDaMetafora(cenasDeProva, 'mochila-pedras');
  ok('a pista forte da metáfora entra mesmo quando vem depois da fraca', lugares.has(3));
  ok('a metáfora respeita o intervalo mínimo entre aparições', [...lugares.keys()].every((i, n, todos) => n === 0 || i - todos[n - 1] >= 3));

  /**
   * (i-bis) AS TRÊS FOTOGRAFIAS DA MANUS.
   *
   * ⚠️ A prova que mais importa é a terceira: **a fotografia tem de cair numa cena cujo
   * texto a chamou.** É a queixa nº 1 do dono posta em código — o ecrã não pode mostrar
   * uma coisa enquanto a voz diz outra. Sem isto, bastava alguém afinar uma pista para
   * as mãos a abrir uma fatura aterrarem no fecho do vídeo.
   */
  // ⚠️ O bloco leva NOME para se poder sair só DELE quando o guião do piloto não está
  // montado. Um `return` aqui sairia da função inteira e levaria com ele a prova (j) — o
  // determinismo — sem ninguém dar por nada. É o modo de falha desta casa: a coisa que
  // desaparece em silêncio.
  fotografias: {
    const { escolherLugaresDaFoto } = await import('../youtube/lib/imagens-longo.js');
    /**
     * 🔴 ESTE BLOCO LÊ O GUIÃO DO PILOTO JÁ MONTADO — E ISSO PAROU O ROBÔ DUAS VEZES.
     *
     * O ficheiro não vai para o repositório (é derivado), portanto **num clone limpo não
     * existe**. Na nuvem, a 1ª corrida morreu aqui em 46 segundos; movi as provas para
     * depois do montador e a 2ª passou — **mas só porque essa corrida calhou de estar a
     * fazer o vídeo do piloto.** À terceira, com um tema novo, o montador escreveu o guião
     * DESSE vídeo e este ficheiro voltou a não existir.
     *
     * > **Eu tinha tratado o sintoma, não a causa.** A causa é esta: uma prova não pode
     * > exigir que o vídeo que está a ser feito seja um vídeo em particular.
     *
     * Agora ela diz que não correu, em vez de derrubar a corrida. E o robô monta o guião
     * do piloto antes das provas — dois segundos — para a cobertura não se perder na nuvem.
     */
    const caminhoDoPiloto = join(RAIZ, 'youtube-render', 'public', 'roteiro', 'sair-do-vermelho.json');
    if (!existsSync(caminhoDoPiloto)) {
      console.log('  ⏭️  o guião do piloto não está montado nesta máquina — as 7 provas das fotografias ficam de fora');
      break fotografias;
    }
    const cenasReais = JSON.parse(readFileSync(caminhoDoPiloto, 'utf-8')).scenes;
    const fotos = cenasReais.filter((c) => c.visual?.tipo === 'foto');

    ok('as três fotografias entram no vídeo', fotos.length === 3, `entraram ${fotos.length}`);
    ok(
      'nenhuma fotografia se repete',
      new Set(fotos.map((c) => c.visual.ficheiro)).size === fotos.length,
    );
    ok(
      'cada fotografia cai numa cena cujo TEXTO a chamou',
      fotos.every((c) => {
        const t = String(c.narration).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
        const esperado = {
          'imagem-1-o-susto': /celular na mao|olhar a fatura com calma|sentei com o celular/,
          'imagem-2-o-numero': /nao parava de crescer|valor nao parava|nao para de crescer/,
          'imagem-3-a-virada': /sem desistir no meio do caminho|foi a primeira vez/,
        }[String(c.visual.ficheiro).split('/').pop().replace(/\.\w+$/, '')];
        return Boolean(esperado && esperado.test(t));
      }),
    );
    ok(
      'a imagem com TEXTO aparece inteira, nunca cortada (modo cartaz)',
      fotos.every((c) => (String(c.visual.ficheiro).includes('o-numero') ? c.visual.movimento === 'cartaz' : c.visual.movimento !== 'cartaz')),
    );
    ok(
      'as fotografias que o vídeo usa existem mesmo no disco',
      fotos.every((c) => existsSync(join(RAIZ, 'youtube-render', 'public', c.visual.ficheiro))),
    );
    ok(
      'um vídeo SEM fotografias suas não leva as de outro',
      escolherLugaresDaFoto(cenasReais, new Set(), 'outro-video-qualquer').size === 0,
    );
    ok(
      'as fotografias escolhem ANTES das ilustrações (senão ficavam sem casa)',
      escolherLugaresDaFoto(cenasReais, new Set(), 'sair-do-vermelho').size === 3,
    );
  }

  // (j) determinismo: o mesmo guião dá sempre o mesmo vídeo
  const outraVez = dirigirImagens(cenas.map((c) => ({ ...c, visual: undefined })), mapaDeProva);
  ok(
    'o mesmo guião dá sempre exatamente as mesmas imagens',
    JSON.stringify(outraVez.map((c) => c.visual)) === JSON.stringify(cenas.map((c) => c.visual)),
  );
}

// ═══ O ELENCO E A FUNÇÃO DO APP RODAM ════════════════════════════════════════
console.log('\nO ELENCO E A FUNÇÃO DO APP NÃO SE REPETEM');

{
  /**
   * 🔴 10/08/2026 — as duas queixas do dono viradas em conta.
   *
   * *"Sempre fala dos dois homens, isso tem que ser dinâmico"* e *"o FinMoovi tem
   * centenas de funcionalidades e o roteiro só ataca sobre cartão??? já falei isso
   * milhares de vezes"*.
   *
   * ⚠️ A régua não é "o texto ficou variado" — isso é gosto. É: **em seis vídeos
   * seguidos, saem seis elencos diferentes e seis funções diferentes?** Isso conta-se.
   */
  ok('há elencos que cheguem para a janela de 6 vídeos', ELENCOS.length >= RAIO_DE_CENARIOS, `${ELENCOS.length} elencos`);
  ok('há funções do app que cheguem para a janela de 6 vídeos', FUNCOES_DO_APP.length >= RAIO_DE_CENARIOS, `${FUNCOES_DO_APP.length} funções`);

  const slugs = ['a-um', 'b-dois', 'c-tres', 'd-quatro', 'e-cinco', 'f-seis'];
  const ge = [];
  const gf = [];
  for (const s of slugs) {
    ge.push(escolherElenco(s, ge));
    gf.push(escolherFuncaoDoApp(s, gf).chave);
  }
  ok('seis vídeos seguidos dão seis elencos DIFERENTES', new Set(ge).size === ge.length, ge.map((e) => e.slice(0, 24)).join(' | '));
  ok('seis vídeos seguidos dão seis funções do app DIFERENTES', new Set(gf).size === gf.length, gf.join(' · '));

  /**
   * ⚠️ **Determinista, e isto não é preciosismo:** uma repescagem de sábado tem de contar
   * a MESMA história que a corrida de sexta contaria. Um sorteio faria o vídeo mudar de
   * elenco entre duas tentativas do mesmo vídeo.
   */
  ok('o mesmo vídeo pedido duas vezes dá o mesmo elenco', escolherElenco('x-igual', []) === escolherElenco('x-igual', []));
  ok('e a mesma função do app', escolherFuncaoDoApp('x-igual', []).chave === escolherFuncaoDoApp('x-igual', []).chave);

  /**
   * 🔴 A ARMADILHA QUE ISTO APANHA, e ela já mordeu duas vezes nesta casa (o caderno de
   * cenas em 09/08, o cache do render em 10/08): **refazer um vídeo lê o caderno com a
   * linha DELE lá dentro.** Sem esta guarda, a repescagem via o próprio elenco como
   * gasto, escolhia outro, e ninguém dava por nada — parecia uma escolha.
   */
  ok(
    'refazer um vídeo NÃO conta o elenco dele próprio como gasto',
    escolherElenco('x-igual', elencosGastos({ caderno: { videos: [{ slug: 'x-igual', elenco: escolherElenco('x-igual', []) }] }, slug: 'x-igual' })) === escolherElenco('x-igual', []),
  );

  /**
   * ⚠️ E as duas listas não podem andar ao par: se o mesmo nome caísse sempre no mesmo
   * índice das duas, "família com filhos" viria sempre com a mesma tela do app.
   */
  const pares = slugs.map((s) => `${ELENCOS.indexOf(escolherElenco(s, []))}:${FUNCOES_DO_APP.findIndex((f) => f.chave === escolherFuncaoDoApp(s, []).chave)}`);
  ok('o elenco e a função não andam sempre ao par', new Set(pares.map((p) => p.split(':')[0] === p.split(':')[1])).size <= 2 && !pares.every((p) => p.split(':')[0] === p.split(':')[1]), pares.join(' '));

  /** ⚠️ Regra antiga da casa: neste canal ninguém tem nome. O elenco diz de QUEM é a história. */
  ok(
    'nenhum elenco traz um nome próprio',
    ELENCOS.every((e) => !/\b(cláudia|claudia|antônio|antonio|joão|joao|maria|josé|jose|pedro)\b/i.test(e)),
  );
}

// ═══ RESULTADO ═══════════════════════════════════════════════════════════════
console.log(`\n${'═'.repeat(72)}`);
console.log(`  ${passou} provas verdes · ${falhou} vermelhas`);
if (falhou) {
  console.log('\n  ❌ AS QUE FALHARAM:');
  falhas.forEach((f) => console.log(`     · ${f}`));
}
console.log(`${'═'.repeat(72)}\n`);
process.exit(falhou ? 1 : 0);
