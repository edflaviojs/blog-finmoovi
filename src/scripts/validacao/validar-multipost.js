/**
 * A PROVA DE MESA DA ENTREGA AO INSTAGRAM — sem rede, sem chave, sem custo.
 *
 * ═══ POR QUE ISTO NASCEU (06/08/2026) ═══
 * A capa do Reel foi entregue durante duas semanas **num campo que não existe**
 * (`settings.cover`), e **nada se queixou**: o Multipost deita fora em silêncio o que
 * não conhece, e o robô acabava a verde todos os dias. Só se descobriu porque o dono
 * reparou que o "Editor" da capa, no painel, estava **vazio**.
 *
 * ⚠️ **Esta prova NÃO pode dizer se o servidor aceita um campo** — isso só ele sabe, e
 * pergunta-se-lhe com `entregar.js --inspecionar`. O que ela garante é o que está do
 * nosso lado: que a capa vai no sítio que a documentação manda, que o Reel de teste
 * gradua sozinho, e que **nenhuma imagem consegue derrubar a publicação do dia**.
 *
 * Uso: node src/scripts/validacao/validar-multipost.js
 */

import { corpoDoAgendamento, objetoDaMedia } from '../multipost/entregar.js';

let passou = 0;
let falhou = 0;
const falhas = [];

function ok(nome, condicao, detalhe = '') {
  if (condicao) { passou++; console.log(`  ✅ ${nome}`); }
  else { falhou++; falhas.push(`${nome}${detalhe ? ` — ${detalhe}` : ''}`); console.log(`  ❌ ${nome}${detalhe ? ` — ${detalhe}` : ''}`); }
}

const MEDIA = { id: 'm1', path: 'https://pub-abc.r2.dev/video.mp4' };
const CAPA = { id: 'c1', path: 'https://pub-abc.r2.dev/capa.jpg' };
const PEDIDO = {
  canalId: 'canal-1',
  media: MEDIA,
  capa: CAPA,
  legenda: 'Uma legenda\ncom duas linhas.',
  quandoUTC: new Date('2026-08-07T22:00:00.000Z'),
};

console.log('\n1. A CAPA DO REEL — no sítio certo, e nunca a derrubar o dia');

{
  const corpo = corpoDoAgendamento(PEDIDO);
  const imagem = corpo.posts[0].value[0].image[0];
  const settings = corpo.posts[0].settings;

  ok('a capa viaja JUNTO DO VÍDEO, no campo que a documentação manda',
    imagem.thumbnail === CAPA.path, JSON.stringify(imagem));
  /**
   * 🔴 A PROVA QUE ACENDE SE ALGUÉM VOLTAR A PÔR A CAPA NAS OPÇÕES.
   * Foi assim durante duas semanas, e o servidor nunca se queixou uma única vez.
   */
  ok('🔴 e NÃO vai nas opções do Instagram (foi lá que se perdeu duas semanas)',
    settings.cover === undefined && !JSON.stringify(settings).match(/cover/i),
    JSON.stringify(settings));
  ok('o vídeo continua a ser o vídeo (a capa não lhe toma o lugar)',
    imagem.path === MEDIA.path && imagem.id === MEDIA.id);

  /**
   * ⚠️ O servidor valida o endereço da capa como URL. Um caminho relativo faria o
   * agendamento INTEIRO falhar — ou seja, **um dia sem publicação por causa de uma
   * imagem**. A regra da casa é a inversa: nada de imagem derruba a publicação.
   */
  const avisos = [];
  const mau = objetoDaMedia(MEDIA, { id: 'c2', path: '/uploads/capa.jpg' }, (m) => avisos.push(m));
  ok('uma capa com endereço incompleto é DEITADA FORA, não enviada',
    mau.thumbnail === undefined && mau.path === MEDIA.path);
  ok('e diz-se porquê no registo, para não ser um silêncio',
    avisos.length === 1 && /capa/i.test(avisos[0]), avisos.join(' | '));
  ok('sem capa nenhuma, a entrega continua a ser válida',
    objetoDaMedia(MEDIA, null).thumbnail === undefined
      && objetoDaMedia(MEDIA, null).path === MEDIA.path);
}

console.log('\n2. O REEL DE TESTE (ordem do dono, 06/08)');

{
  const settings = corpoDoAgendamento(PEDIDO).posts[0].settings;
  ok('o Reel sai marcado como Reel de teste', settings.is_trial_reel === true);
  /**
   * 🔴 A GRADUAÇÃO TEM DE SER AUTOMÁTICA. Na opção manual é preciso alguém carregar num
   * botão para o vídeo chegar aos seguidores — e ficaria um Reel por semana preso, sem
   * ninguém dar por nada. Uma regra que depende de alguém se lembrar não é uma regra.
   */
  ok('🔴 e gradua SOZINHO — nunca à espera de um clique',
    settings.graduation_strategy === 'SS_PERFORMANCE', settings.graduation_strategy);
  /**
   * ⚠️ O Instagram NÃO deixa convidados num Reel de teste. Se um dia alguém acrescentar
   * uma parceria sem tirar o Reel de teste, a publicação é recusada — e isto avisa antes.
   */
  ok('e não leva convidados, que o Instagram proíbe num Reel de teste',
    settings.collaborators === undefined);
  ok('continua a ser Reel/feed, não Story', settings.post_type === 'post');
  ok('e o canal declarado é o Instagram', settings.__type === 'instagram');
}

console.log('\n3. O RESTO DO PEDIDO CONTINUA COMO ESTAVA');

{
  const corpo = corpoDoAgendamento(PEDIDO);
  ok('é um agendamento, não uma publicação imediata', corpo.type === 'schedule');
  ok('a hora vai em tempo universal', corpo.date === '2026-08-07T22:00:00.000Z');
  ok('vai para o canal pedido', corpo.posts[0].integration.id === 'canal-1');
  ok('há exatamente um vídeo (o Instagram recusa capa em carrossel)',
    corpo.posts[0].value[0].image.length === 1);
  /**
   * ⚠️ CADA LINHA VIRA UM PARÁGRAFO, e não um `<br>`. Foi medido: mandada crua, ou com
   * `<br>`, a legenda inteira **colava-se numa linha só** no Instagram. Esta prova fixa a
   * forma que funcionou, porque a que não funciona parece igualmente razoável no código.
   */
  const html = corpo.posts[0].value[0].content;
  ok('cada linha da legenda vai como um parágrafo próprio',
    html === '<p>Uma legenda</p><p>com duas linhas.</p>', html);
}

console.log(`\n${'═'.repeat(72)}`);
console.log(`  ${passou} provas verdes · ${falhou} vermelhas`);
if (falhou) {
  console.log('\n  ❌ AS QUE FALHARAM:');
  falhas.forEach((f) => console.log(`     · ${f}`));
}
console.log(`${'═'.repeat(72)}\n`);
process.exit(falhou ? 1 : 0);
