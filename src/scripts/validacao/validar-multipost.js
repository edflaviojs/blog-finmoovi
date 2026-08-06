/**
 * A PROVA DE MESA DA ENTREGA AO INSTAGRAM — sem rede, sem chave, sem custo.
 *
 * ═══ POR QUE ISTO NASCEU (06/08/2026) ═══
 * O dono perguntou se a capa do Reel estava mesmo a ser enviada, porque o "Editor" da
 * capa aparecia **vazio** no painel. **Não estava** — e a causa levou duas conclusões
 * erradas pelo caminho (ver o cabeçalho de `capaParaOInstagram`). A verdadeira: **não
 * havia ficheiro de capa no artefato**, porque o vídeo desse dia foi produzido doze
 * horas antes de a capa passar a ser tirada na produção.
 *
 * ⚠️ **O QUE ESTA PROVA NÃO SABE:** se o servidor aceita um campo. Isso só ele sabe, e
 * pergunta-se-lhe com `entregar.js --inspecionar`. **Foi ele que ditou a forma da capa
 * que está aqui fixada** (`cover` com `id` e `path`, ambos obrigatórios) — o código-
 * -fonte público do Postiz diz outra coisa, porque é outra versão. *A um servidor
 * pergunta-se; não se lê o código de outro parecido.*
 *
 * Uso: node src/scripts/validacao/validar-multipost.js
 */

import { existsSync } from 'fs';
import { join } from 'path';
import {
  corpoDoAgendamento, corpoDoStory, capaParaOInstagram, oQueVaiNoStory,
  duracaoDoMp4, primeiraLinha, STORY_MAX_SEG, MINUTOS_ATE_O_STORY,
} from '../multipost/entregar.js';

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
  legenda: 'O gancho do vídeo\n\nE o resto da legenda.',
  quandoUTC: new Date('2026-08-07T22:00:00.000Z'),
};

console.log('\n1. A CAPA DO REEL — na forma que o SERVIDOR disse aceitar');

{
  const settings = corpoDoAgendamento(PEDIDO).posts[0].settings;
  /**
   * A forma veio do próprio servidor, com `--inspecionar` em 06/08:
   *   cover: { id (obrigatório), path (obrigatório), alt?, thumbnail? }
   */
  ok('a capa vai em `cover`, com identificador e endereço',
    settings.cover?.id === CAPA.id && settings.cover?.path === CAPA.path,
    JSON.stringify(settings.cover));
  ok('e o vídeo continua a ser o vídeo',
    corpoDoAgendamento(PEDIDO).posts[0].value[0].image[0].path === MEDIA.path);

  /**
   * ⚠️ Nada de imagem pode derrubar a publicação do dia. Uma capa sem identificador ou
   * com endereço incompleto é **deitada fora**, não enviada — o servidor valida-a e o
   * agendamento INTEIRO falharia com 400.
   */
  const avisos = [];
  ok('uma capa com endereço incompleto é deitada fora',
    capaParaOInstagram({ id: 'c2', path: '/uploads/capa.jpg' }, (m) => avisos.push(m)) === null);
  ok('uma capa sem identificador também',
    capaParaOInstagram({ path: 'https://pub-abc.r2.dev/capa.jpg' }, (m) => avisos.push(m)) === null);
  ok('e diz-se porquê nas duas, para não ser um silêncio', avisos.length === 2);
  ok('sem capa nenhuma, o pedido continua válido e sem campo vazio',
    corpoDoAgendamento({ ...PEDIDO, capa: null }).posts[0].settings.cover === undefined);
}

console.log('\n2. O REEL DE TESTE (ordem do dono, 06/08)');

{
  const settings = corpoDoAgendamento(PEDIDO).posts[0].settings;
  ok('o Reel sai marcado como Reel de teste', settings.is_trial_reel === true);
  /**
   * 🔴 A GRADUAÇÃO TEM DE SER AUTOMÁTICA. Na opção manual é preciso alguém carregar num
   * botão para o vídeo chegar aos seguidores — ficaria um Reel por semana preso, sem
   * ninguém dar por nada. Uma regra que depende de alguém se lembrar não é uma regra.
   */
  ok('🔴 e gradua SOZINHO — nunca à espera de um clique',
    settings.graduation_strategy === 'SS_PERFORMANCE', settings.graduation_strategy);
  // ⚠️ O Instagram não aceita convidados num Reel de teste — as duas coisas juntas dão erro.
  ok('e não leva convidados, que o Instagram proíbe num Reel de teste',
    settings.collaborators === undefined);
  ok('continua a ser Reel/feed, não Story', settings.post_type === 'post');
}

console.log('\n3. O STORY, MINUTOS DEPOIS DO REEL');

{
  const story = corpoDoStory({ canalId: 'canal-1', media: MEDIA, legenda: 'O gancho', quandoUTC: new Date('2026-08-07T22:05:00.000Z') });
  const s = story.posts[0].settings;
  ok('o Story é declarado como Story', s.post_type === 'story');
  // ⚠️ Reel de teste e capa são coisas do Reel: num Story o Instagram recusa-as.
  ok('e não leva Reel de teste nem capa (o Instagram recusa num Story)',
    s.is_trial_reel === undefined && s.cover === undefined && s.graduation_strategy === undefined);
  ok('sai DEPOIS do Reel, não ao mesmo tempo', new Date(story.date) > new Date(PEDIDO.quandoUTC));
  ok('e o intervalo é o combinado', MINUTOS_ATE_O_STORY === 5);

  /**
   * 🔴 O TETO DE 60 SEGUNDOS DA META. Medido: um dos Shorts no ar tem **1:05**, e um
   * vídeo mais comprido faz o Instagram recusar o Story. Quando não cabe, vai a CAPA —
   * um Story que mostra o gancho é melhor do que um Story que não sai.
   */
  ok('um vídeo que cabe vai como vídeo',
    oQueVaiNoStory({ duracaoSeg: 59, media: MEDIA, capa: CAPA }).tipo === 'vídeo');
  ok('exatamente 60 segundos ainda cabe',
    oQueVaiNoStory({ duracaoSeg: STORY_MAX_SEG, media: MEDIA, capa: CAPA }).tipo === 'vídeo');
  ok('🔴 um vídeo de 1:05 NÃO vai como vídeo — vai a capa',
    oQueVaiNoStory({ duracaoSeg: 65, media: MEDIA, capa: CAPA }).tipo === 'capa');
  ok('e se nem a duração se conseguiu medir, também vai a capa (o lado seguro)',
    oQueVaiNoStory({ duracaoSeg: null, media: MEDIA, capa: CAPA }).tipo === 'capa');
  ok('sem capa e com vídeo grande, não sai Story nenhum — e diz-se porquê',
    oQueVaiNoStory({ duracaoSeg: 65, media: MEDIA, capa: null }).media === null);
  ok('a escolha traz sempre o motivo escrito',
    [59, 65, null].every((d) => oQueVaiNoStory({ duracaoSeg: d, media: MEDIA, capa: CAPA }).motivo.length > 10));

  ok('a legenda do Story é só o gancho, não a legenda inteira',
    primeiraLinha(PEDIDO.legenda) === 'O gancho do vídeo');
}

console.log('\n4. A DURAÇÃO LIDA DO FICHEIRO, SEM FFPROBE');

{
  /**
   * ⚠️ Este robô corre num computador emprestado do GitHub que **não traz o ffmpeg**.
   * A duração é lida de um cabeçalho do próprio MP4. Aqui prova-se contra um ficheiro
   * a sério — e o número foi conferido contra o ffprobe: 59,158 contra 59,157.
   */
  const exemplo = join(process.cwd(), 'youtube-render', 'out', 'erros-cartao-credito.mp4');
  if (existsSync(exemplo)) {
    const d = duracaoDoMp4(exemplo);
    ok('lê a duração de um MP4 verdadeiro', d !== null && Math.abs(d - 59.157) < 0.01, `deu ${d}`);
  } else {
    console.log('  ⏭️  o vídeo de exemplo não está nesta máquina — a prova contra ficheiro real fica de fora');
  }
  ok('um ficheiro que não existe devolve "não sei" em vez de rebentar',
    duracaoDoMp4('/nao/existe/isto.mp4') === null);
  ok('e lixo que não é MP4 também', duracaoDoMp4('x', () => Buffer.from('nada disto e um video')) === null);
}

console.log('\n5. O RESTO DO PEDIDO CONTINUA COMO ESTAVA');

{
  const corpo = corpoDoAgendamento(PEDIDO);
  ok('é um agendamento, não uma publicação imediata', corpo.type === 'schedule');
  ok('a hora vai em tempo universal', corpo.date === '2026-08-07T22:00:00.000Z');
  ok('vai para o canal pedido', corpo.posts[0].integration.id === 'canal-1');
  ok('há exatamente um vídeo (o Instagram recusa capa em carrossel)',
    corpo.posts[0].value[0].image.length === 1);
  /**
   * ⚠️ CADA LINHA VIRA UM PARÁGRAFO, e não um `<br>`. Foi medido: com `<br>`, a legenda
   * inteira **colava-se numa linha só** no Instagram. Esta prova fixa a forma que
   * funcionou, porque a que não funciona parece igualmente razoável no código.
   */
  ok('cada linha da legenda vai como um parágrafo próprio',
    corpo.posts[0].value[0].content === '<p>O gancho do vídeo</p><p></p><p>E o resto da legenda.</p>',
    corpo.posts[0].value[0].content);
}

console.log(`\n${'═'.repeat(72)}`);
console.log(`  ${passou} provas verdes · ${falhou} vermelhas`);
if (falhou) {
  console.log('\n  ❌ AS QUE FALHARAM:');
  falhas.forEach((f) => console.log(`     · ${f}`));
}
console.log(`${'═'.repeat(72)}\n`);
process.exit(falhou ? 1 : 0);
