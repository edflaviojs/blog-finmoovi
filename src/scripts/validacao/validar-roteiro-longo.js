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

import { readFileSync } from 'fs';
import { join } from 'path';

import {
  validarMapa, validarAbertura, validarCapitulo, validarChamada, validarFecho, validarLongo,
  contarPalavras, ORCAMENTO, MAX_PALAVRAS_TITULO, PARTES_DO_CAPITULO, valoresEmDinheiro,
} from '../youtube/lib/schema-longo.js';
import {
  EXEMPLO_DE_MAPA, EXEMPLO_DE_ABERTURA, EXEMPLO_DE_CAPITULO, EXEMPLO_DE_FECHO,
  EXEMPLO_DE_CHAMADA, EXEMPLO_PARA_COMPARAR, EXEMPLO_DE_DEMONSTRACAO,
  buildPromptMapa, buildPromptAbertura, buildPromptCapitulo, buildPromptChamada, buildPromptFecho,
} from '../youtube/roteiro-longo.js';
import { BORDAO } from '../youtube/lib/schema-short.js';
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
const aberturaAfirmando = EXEMPLO_DE_ABERTURA.fala.replace(
  'Você sabe qual aparelho da sua casa gasta mais luz do que a geladeira?',
  'O aparelho da sua casa que gasta mais luz não é a geladeira.',
);
reprova(
  'abertura: a capa não é pergunta',
  validarAbertura(aberturaAfirmando, { promessa: EXEMPLO_DE_ABERTURA.promessa }),
  'tem de ser uma PERGUNTA',
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
    ['a capa é pergunta e cabe na tela', ['abertura'], /PERGUNTA que dói/],
    ['o título de capítulo não é genérico', ['mapa'], /Introdução/],
    ['a chamada diz FINMOOVI', ['chamada'], /FINMOOVI/],
    ['o capítulo abre com pergunta', ['capitulo'], /PERGUNTA que dói/],
    ['a demonstração nomeia o app', ['capitulo'], /FinMoovi/],
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

// ═══ RESULTADO ═══════════════════════════════════════════════════════════════
console.log(`\n${'═'.repeat(72)}`);
console.log(`  ${passou} provas verdes · ${falhou} vermelhas`);
if (falhou) {
  console.log('\n  ❌ AS QUE FALHARAM:');
  falhas.forEach((f) => console.log(`     · ${f}`));
}
console.log(`${'═'.repeat(72)}\n`);
process.exit(falhou ? 1 : 0);
