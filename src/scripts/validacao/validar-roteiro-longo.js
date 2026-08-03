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
  contarPalavras, ORCAMENTO, MAX_PALAVRAS_TITULO, PARTES_DO_CAPITULO,
} from '../youtube/lib/schema-longo.js';
import {
  EXEMPLO_DE_MAPA, EXEMPLO_DE_ABERTURA, EXEMPLO_DE_CAPITULO, EXEMPLO_DE_FECHO,
  EXEMPLO_DE_CHAMADA, EXEMPLO_PARA_COMPARAR,
  buildPromptMapa, buildPromptAbertura, buildPromptCapitulo, buildPromptChamada, buildPromptFecho,
} from '../youtube/roteiro-longo.js';
import { BORDAO } from '../youtube/lib/schema-short.js';

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
{
  const v = validarCapitulo(EXEMPLO_DE_CAPITULO, 0, { plano: EXEMPLO_DE_CAPITULO });
  const n = PARTES_DO_CAPITULO.map((p) => EXEMPLO_DE_CAPITULO[p]).join(' ');
  ok('o capítulo-exemplo passa em validarCapitulo()', passa(v), porque(v));
  ok(
    `o capítulo-exemplo cabe no orçamento (${contarPalavras(n)} palavras, faixa ${ORCAMENTO.capitulo.min}-${ORCAMENTO.capitulo.max})`,
    contarPalavras(n) >= ORCAMENTO.capitulo.min && contarPalavras(n) <= ORCAMENTO.capitulo.max,
  );
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
  // O exemplo do CAPÍTULO tem de bater com o exemplo do MAPA na única coisa que os
  // liga: a soma. Se um dia alguém mexer num sem mexer no outro, isto acende.
  const soma = EXEMPLO_DE_CAPITULO.somaDe.reduce((a, b) => a + b, 0);
  ok(`a soma do capítulo-exemplo bate (${EXEMPLO_DE_CAPITULO.somaDe.join(' + ')} = ${soma})`, soma === EXEMPLO_DE_CAPITULO.numeroChave);
  const c2 = EXEMPLO_DE_MAPA.capitulos[1];
  ok(`a soma do mapa-exemplo bate (${c2.somaDe.join(' + ')} = ${c2.somaDe.reduce((a, b) => a + b, 0)})`, c2.somaDe.reduce((a, b) => a + b, 0) === c2.numeroChave);
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
  'mapa: dois capítulos com o MESMO número-chave',
  validarMapa({ ...EXEMPLO_DE_MAPA, capitulos: EXEMPLO_DE_MAPA.capitulos.map((c) => ({ ...c, numeroChave: 100, somaDe: undefined })) }),
  'já é o número-chave de outro capítulo',
);
reprova(
  'mapa: um capítulo chamado "Introdução"',
  validarMapa({ ...EXEMPLO_DE_MAPA, capitulos: EXEMPLO_DE_MAPA.capitulos.map((c, i) => (i === 0 ? { ...c, titulo: 'Introdução' } : c)) }),
  'não promete nada',
);
reprova(
  'mapa: a soma NÃO bate com o número-chave',
  validarMapa({ ...EXEMPLO_DE_MAPA, capitulos: EXEMPLO_DE_MAPA.capitulos.map((c, i) => (i === 1 ? { ...c, somaDe: [39, 90, 61] } : c)) }),
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
    0, { plano: EXEMPLO_DE_CAPITULO },
  ),
  'PERCENTAGEM',
);
reprova(
  'capítulo: promete rendimento sem conta calculada',
  validarCapitulo(
    { ...EXEMPLO_DE_CAPITULO, regancho: 'Esse dinheiro rende duzentos e cinquenta reais por ano se você guardar.' },
    0, { plano: EXEMPLO_DE_CAPITULO },
  ),
  'soe a rendimento com número',
);
reprova(
  'capítulo: não diz o número-chave que o mapa marcou',
  validarCapitulo(
    { ...EXEMPLO_DE_CAPITULO, desenvolvimento: 'E olha, não é desleixo seu. A gente faz a compra grande no sábado e no meio da semana a vida muda tudo. Um dia você sai tarde do trabalho, no outro come na rua, no outro o menino não quer aquilo. Aí a verdura murcha, a carne passa do prazo, o pão endurece, e ninguém soma nada disso porque cada perda parece pequena sozinha quando você olha para ela de longe e sem calma nenhuma.' },
    0, { plano: EXEMPLO_DE_CAPITULO },
  ),
  'NÃO é dito na fala',
);
reprova(
  'capítulo: a demonstração não nomeia o app',
  validarCapitulo(
    { ...EXEMPLO_DE_CAPITULO, demonstracao: EXEMPLO_DE_CAPITULO.demonstracao.replace(/FinMoovi/g, 'aplicativo') },
    0, { plano: EXEMPLO_DE_CAPITULO },
  ),
  'não diz FinMoovi',
);
reprova(
  'capítulo: pede inscrição (o erro que mata o formato longo)',
  validarCapitulo(
    { ...EXEMPLO_DE_CAPITULO, regancho: 'Se inscreve aqui que a próxima parte é a mais simples das três.' },
    0, { plano: EXEMPLO_DE_CAPITULO },
  ),
  'o pedido acontece UMA vez',
);
reprova(
  'capítulo: a parte "pergunta" não abre com pergunta',
  validarCapitulo(
    { ...EXEMPLO_DE_CAPITULO, pergunta: 'Eu abri a geladeira num domingo e achei comida estragada lá no fundo. Naquela vez eu parei pra contar quanto tinha custado.' },
    0, { plano: EXEMPLO_DE_CAPITULO },
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
  const v = validarCapitulo(EXEMPLO_DE_CAPITULO, 0, { plano: EXEMPLO_DE_CAPITULO, exemploParaComparar: EXEMPLO_PARA_COMPARAR });
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

const roteiroBom = {
  abertura: EXEMPLO_DE_ABERTURA.fala,
  capitulos: [
    { ...EXEMPLO_DE_CAPITULO, numeroChave: 260 },
    {
      titulo: 'O que o supermercado não conta na entrada',
      numeroChave: 410,
      pergunta: 'Quantas vezes você entrou pra comprar cinco coisas e saiu com o carrinho cheio? Comigo era toda semana.',
      desenvolvimento: 'A loja está montada pra isso. O pão fica no fundo, o corredor do meio vende o que ninguém foi buscar, e a fila tem chocolate à altura do braço do seu filho. Contei um mês inteiro do que entrou no carrinho sem estar na lista, e deu quatrocentos e dez reais.',
      demonstracao: 'Passei a montar a lista no FinMoovi antes de sair de casa, e ele vai somando enquanto eu marco os itens. Bateu no meu limite, aparece na tela ali mesmo, no corredor.',
      regancho: 'E ainda falta a parte mais difícil de todas, que é o que fazer com o dinheiro que sobra dessa faxina.',
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
  repetido.capitulos[1].desenvolvimento += ' E olha, não é desleixo seu. A gente faz a compra grande no sábado.';
  const v = validarLongo(repetido);
  ok('dois capítulos que repetem a mesma frase são apanhados', !v.ok && v.erros.some((e) => /repetem a mesma frase/.test(e)), v.erros.join(' | '));
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
  const mesmoNumero = JSON.parse(JSON.stringify(roteiroBom));
  mesmoNumero.capitulos[1].numeroChave = 260;
  const v = validarLongo(mesmoNumero);
  ok('dois capítulos à volta do mesmo número são apanhados', !v.ok && v.erros.some((e) => /mesmo número/.test(e)), v.erros.join(' | '));
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
