/**
 * A PROVA DE MESA DA CAIXA DE ENTRADA DAS REDES — sem rede, sem chave, sem custo.
 *
 * ═══ POR QUE ISTO NASCEU (11/08/2026) ═══
 * O robô responde SOZINHO a quem escreve FINMOOVI. Isso é bom quando a pessoa está a
 * pedir o app — e é um desastre quando ela está a reclamar dele. O dono foi explícito em
 * 07/08: *o robô a responder "Que bom que gostou! 😊" a quem escreveu "esse app cobrou
 * errado" vira print*.
 *
 * 🔴 **Não há como medir isto no mundo real antes de acontecer** — quando o comentário
 * mau chegar, já foi respondido. Por isso a única defesa é aqui, com casos escritos à mão.
 *
 * ⚠️ **O que esta prova NÃO sabe:** se a resposta é boa. Isso é gosto, e gosto não se mede
 * com regex (a regra desta casa). O que ela mede é a DECISÃO: quem é respondido sozinho,
 * quem espera pelo dono, e quem nunca pode ser respondido por uma máquina.
 *
 * Uso: node src/scripts/validacao/validar-comentarios-redes.js
 */

import {
  pedeOApp, ehQueixa, oQueFazerCom, respostaDaVez, RESPOSTAS,
  rascunhoDeReserva, promptDoRascunho, escreverRascunho,
  comentariosDoBluesky, respostasDaArvore,
} from '../redes/comentarios-redes.js';

let passou = 0;
let falhou = 0;
const falhas = [];
function ok(nome, condicao, detalhe = '') {
  if (condicao) { passou++; console.log(`  ✅ ${nome}`); }
  else { falhou++; falhas.push(`${nome}${detalhe ? ` — ${detalhe}` : ''}`); console.log(`  ❌ ${nome}${detalhe ? ` — ${detalhe}` : ''}`); }
}

console.log('\n1. QUEM PEDE O APP — e as mil maneiras de escrever o nome');

{
  /**
   * ⚠️ A MESMA REGRA DO ROBÔ DO YOUTUBE: compara-se sem acentos, sem espaços e sem
   * pontuação. Quem escreve no telemóvel escreve de todas estas formas, e todas são
   * pessoas que fizeram exactamente o que o vídeo pediu.
   */
  for (const t of ['FINMOOVI', 'finmoovi', 'Fin Moovi', 'fin-moovi', 'finmoovi!!!', 'quero o FinMoovi', 'FINMOOVI 🙏']) {
    ok(`"${t}" conta como pedido`, pedeOApp(t) === true);
  }
  ok('e um comentário sem o nome NÃO conta', pedeOApp('adorei o vídeo, muito bom') === false);
  ok('nem um parecido: "finmove"', pedeOApp('manda o finmove aí') === false);
}

console.log('\n2. 🔴 A QUEIXA — o print que o dono não quer');

{
  /**
   * 🔴 ESTAS SÃO AS QUE NÃO PODEM SER RESPONDIDAS POR UMA MÁQUINA. Repare que em todas a
   * palavra FINMOOVI está lá: sem esta trava, todas receberiam "Boa! 🚀 aqui está o link".
   */
  const queixas = [
    'o FinMoovi cobrou errado no meu cartão',
    'FINMOOVI é um golpe, cuidado',
    'o finmoovi travou e sumiu com meus lançamentos',
    'péssimo, o FinMoovi não funciona no meu celular',
    'vou no Procon por causa do FinMoovi',
    'FinMoovi deu erro na hora de salvar',
  ];
  for (const t of queixas) {
    const d = oQueFazerCom({ id: 'x', texto: t });
    ok(`🔴 "${t.slice(0, 42)}…" NÃO é respondida sozinha`, d.automatica === false, JSON.stringify(d));
  }
  ok('e ela vai para o painel, nunca para o silêncio',
    oQueFazerCom({ id: 'x', texto: 'o FinMoovi cobrou errado' }).accao === 'rascunho');
  /**
   * ⚠️ E O CONTRÁRIO TAMBÉM TEM DE SER VERDADE, senão a trava mata o robô inteiro: um
   * pedido normal continua a ser respondido sozinho. Uma trava que apanha tudo é o mesmo
   * que não ter robô nenhum.
   */
  for (const t of ['como eu baixo o FINMOOVI?', 'FINMOOVI', 'quero o finmoovi por favor', 'me manda o FinMoovi aí']) {
    ok(`"${t}" continua a ser respondido sozinho`, oQueFazerCom({ id: 'x', texto: t }).automatica === true);
  }
}

console.log('\n3. O QUE VAI PARA O PAINEL, E O QUE NÃO VOLTA A APARECER');

{
  ok('um elogio sem pedido vira rascunho (o dono decide o que dizer)',
    oQueFazerCom({ id: 'a', texto: 'muito bom, parabéns pelo trabalho' }).accao === 'rascunho');
  ok('e diz-se porquê — nunca em silêncio',
    /não pede o app/.test(oQueFazerCom({ id: 'a', texto: 'top demais' }).motivo));
  /**
   * 🔴 O CADERNO É O QUE IMPEDE A MESMA PESSOA DE SER RESPONDIDA DUAS VEZES. Sem isto,
   * cada corrida respondia outra vez a toda a gente — de hora a hora.
   */
  ok('🔴 quem já foi respondido não é tocado outra vez',
    oQueFazerCom({ id: 'ja', texto: 'FINMOOVI' }, new Set(['ja'])).accao === 'ja-respondido');
  ok('e nem sequer volta ao painel', oQueFazerCom({ id: 'ja', texto: 'FINMOOVI' }, new Set(['ja'])).automatica === false);
}

console.log('\n4. AS RESPOSTAS AUTOMÁTICAS — rodam, e levam o link');

{
  ok('há mais do que uma, para não sair sempre a mesma', RESPOSTAS.length >= 5);
  ok('todas levam o endereço do app', RESPOSTAS.every((r) => r.includes('finmoovi.com')));
  ok('todas dizem que é grátis', RESPOSTAS.every((r) => /gr[áa]tis|gra[çc]a|gratuito/i.test(r)));
  ok('e rodam pela lista', respostaDaVez(0) !== respostaDaVez(1) && respostaDaVez(0) === respostaDaVez(RESPOSTAS.length));
  /**
   * ⚠️ NENHUMA PODE MANDAR CLICAR NUM LINK QUE NÃO É CLICÁVEL. Aqui é resposta a
   * comentário, onde o endereço é clicável — mas a frase continua a servir se não for.
   */
  ok('nenhuma promete resposta privada (isso não existe em todas as redes)',
    RESPOSTAS.every((r) => !/dm|direct|privado|inbox/i.test(r)));
}

console.log('\n5. O RASCUNHO — e o dia em que a IA não corre');

{
  /**
   * 🔴 SEM ISTO, UM DIA SEM IA DAVA UM PAINEL COM COMENTÁRIOS E NENHUMA SUGESTÃO — e o
   * dono ficava com a folha em branco no momento em que ia usá-la.
   */
  ok('🔴 uma queixa tem rascunho de reserva próprio, que reconhece e pergunta',
    /me conta|aconteceu/i.test(rascunhoDeReserva({ texto: 'o app cobrou errado' })));
  ok('e um elogio tem outro, curto', rascunhoDeReserva({ texto: 'muito bom' }).length < 40);

  const prompt = promptDoRascunho({ rede: 'Bluesky', texto: 'como faço pra começar?' });
  ok('o pedido à IA leva o texto da pessoa', prompt.includes('como faço pra começar?'));
  ok('e leva a rede, porque o tom muda de uma para a outra', prompt.includes('Bluesky'));
  /**
   * 🔑 AS PROIBIÇÕES QUE MAIS INTERESSAM, e estão no prompt de propósito: não empurrar o
   * app a quem não pediu, e não inventar. Um rascunho que promete o que não existe é o
   * defeito que este projeto mais já pagou.
   */
  ok('🔑 o prompt proíbe oferecer o app a quem não pediu', /NÃO ofereça o app/.test(prompt));
  ok('🔑 e proíbe inventar número ou promessa', /NÃO invente/.test(prompt));
  ok('e manda ser curto — comentário comprido ninguém lê', /2 frases/.test(prompt));

  // A IA a falhar não pode derrubar nada.
  const rebentar = async () => { throw new Error('sem chave'); };
  ok('🔴 se a IA falhar, fica o rascunho de reserva e a corrida segue',
    (await escreverRascunho({ rede: 'Bluesky', texto: 'muito bom' }, rebentar)).length > 0);
  const vazio = async () => '   ';
  ok('e uma resposta vazia da IA também cai na reserva',
    (await escreverRascunho({ rede: 'Bluesky', texto: 'muito bom' }, vazio)) === rascunhoDeReserva({ texto: 'muito bom' }));
  const comAspas = async () => '"Valeu demais pelo carinho!"';
  ok('as aspas que o modelo põe à volta são tiradas',
    (await escreverRascunho({ rede: 'Bluesky', texto: 'top' }, comAspas)) === 'Valeu demais pelo carinho!');
}

console.log('\n6. O BLUESKY — ler a árvore sem trazer a nossa própria voz');

{
  const EU = 'finmoovi.bsky.social';
  const feed = {
    feed: [
      { post: { uri: 'at://meu/1', cid: 'c1', author: { handle: EU }, record: { text: 'vídeo do dia' }, replyCount: 2 } },
      { post: { uri: 'at://outro/9', cid: 'c9', author: { handle: 'alguem.bsky.social' }, record: { text: 'post de outro' }, replyCount: 5 } },
    ],
  };
  /**
   * 🔴 O FEED TRAZ REPOSTS E POSTS DE OUTROS. Sem este filtro, o robô iria buscar as
   * respostas de posts que não são nossos — e responderia em nome do canal na casa dos
   * outros.
   */
  const meus = comentariosDoBluesky(feed.feed, EU);
  ok('🔴 só os posts DO canal entram', meus.length === 1 && meus[0].uri === 'at://meu/1');

  const arvore = {
    replies: [
      {
        post: {
          uri: 'at://a/1', cid: 'ca', author: { handle: 'pessoa.bsky.social' },
          record: { text: 'como pego o FINMOOVI?', createdAt: '2026-08-11T10:00:00Z', reply: { root: { uri: 'at://meu/1', cid: 'c1' } } },
        },
        replies: [
          // ⚠️ a nossa própria resposta, que NÃO pode voltar como comentário novo
          { post: { uri: 'at://eu/2', cid: 'ce', author: { handle: EU }, record: { text: 'aqui está!' } }, replies: [] },
          { post: { uri: 'at://b/3', cid: 'cb', author: { handle: 'outra.bsky.social' }, record: { text: 'valeu!' } }, replies: [] },
        ],
      },
    ],
  };
  const respostas = respostasDaArvore(arvore, EU);
  ok('as respostas de respostas também são apanhadas', respostas.length === 2);
  /**
   * 🔴 A NOSSA PRÓPRIA RESPOSTA NÃO PODE VOLTAR COMO COMENTÁRIO. Se voltasse, o robô
   * responderia a si próprio — para sempre, de hora a hora.
   */
  ok('🔴 e a nossa própria voz fica de fora', !respostas.some((r) => r.autor === EU));
  ok('cada uma traz o link para o dono abrir', respostas.every((r) => r.link.startsWith('https://bsky.app/profile/')));
  ok('e traz onde responder, sem voltar a perguntar ao servidor',
    respostas[0].raiz?.uri === 'at://meu/1' && respostas[0].pai?.uri === 'at://a/1');
  ok('a rede vem escrita, porque o painel junta várias', respostas.every((r) => r.rede === 'Bluesky'));
}

console.log(`\n${'═'.repeat(72)}`);
console.log(`  ${passou} provas verdes · ${falhou} vermelhas`);
if (falhou) {
  console.log('\n  ❌ AS QUE FALHARAM:');
  falhas.forEach((f) => console.log(`     · ${f}`));
}
console.log(`${'═'.repeat(72)}\n`);
process.exitCode = falhou ? 1 : 0;
