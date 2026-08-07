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
  REDES, REDE_DE_FORA, REDE_TIKTOK, midiasDaRede, opcoesDaRede, montarPedido, oQueFalta,
  encaixarNoLimite, cortarNaPalavra, MAX_TITULO_TIKTOK, falaPedeComentario,
  numerosEmAlgarismo, lerNumeral, topicosDoRoteiro, montarLegenda,
  linkDoVideo, topicosSemOProduto, comoLista, MAX_ETIQUETAS_LINKEDIN,
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

/**
 * ═══ AS OITO REDES (07/08/2026) ═══
 *
 * O mesmo vídeo passou a sair em oito sítios. Tudo o que se prova daqui para baixo foi
 * MEDIDO no servidor em 07/08 — nada foi deduzido do código-fonte público do Postiz, que
 * é outra versão. (Essa lição custou duas respostas erradas em 06/08.)
 */
const ROTEIRO = {
  term: '3 erros de cartão que te custam R$ 500 por mês',
  keyword: 'cartão',
  category: 'credito',
  intro: { frase: 'Sabe quais três erros no cartão tiram quinhentos reais do seu bolso todo mês?' },
  scenes: [
    { role: 'beat', narration: 'O primeiro leva cento e cinquenta reais, o outro duzentos, e o saque mais cento e cinquenta.' },
    { role: 'beat', narration: 'Eu joguei isso no FinMoovi e ele me mostrou que o saque ficou no topo da lista.' },
  ],
};
// ⚠️ O TikTok está FORA de `REDES` (ordem do dono) mas continua a ser medido — por isso
// esta busca também olha para ele. Ver `REDE_TIKTOK`.
const rede = (id) => (id === 'tiktok' ? REDE_TIKTOK : REDES.find((r) => r.id === id));

console.log('\n6. A TABELA DAS OITO REDES — quem entra, quem não, e a que horas');

{
  ok('são sete redes a receber', REDES.length === 7, `são ${REDES.length}`);
  ok('e são exatamente as combinadas',
    REDES.map((r) => r.id).join(',') === 'instagram,facebook,linkedin-page,threads,telegram,pinterest,bluesky',
    REDES.map((r) => r.id).join(','));
  /**
   * 🔴 O X FICA DE FORA POR ORDEM DO DONO (07/08): desde 02/2026 cobra US$ 0,20 por post
   * COM LINK, e os daqui têm link. Ele continua LIGADO no painel — só não recebe daqui.
   * Esta prova acende no dia em que alguém o puser na tabela sem falar com ele.
   */
  ok('🔴 o X NÃO recebe nada — ele cobra por publicação',
    !REDES.some((r) => r.id === 'x') && Boolean(REDE_DE_FORA.x));
  ok('e está escrito PORQUÊ, não só que não entra', /0,20|link/i.test(REDE_DE_FORA.x));
  /**
   * 🔴 E O TIKTOK TAMBÉM NÃO, POR ORDEM DIRETA DO DONO (07/08): *"não quero enviar nada
   * até eles nos dar autorização para postar"* — **nem em privado**. Isto revoga o §12-C,
   * que permitia 1 por dia em `SELF_ONLY`.
   *
   * ⚠️ Esta prova é a fechadura. Se alguém repuser o TikTok na tabela a olhar para o
   * §12-C (que continua escrito no documento), ela acende antes de sair um vídeo.
   */
  ok('🔴 o TikTok NÃO recebe nada enquanto a auditoria não sair — nem em privado',
    !REDES.some((r) => r.id === 'tiktok') && Boolean(REDE_DE_FORA.tiktok));
  ok('e está escrito que é ordem do dono, e que vale para o privado também',
    /dono/i.test(REDE_DE_FORA.tiktok) && /privado/i.test(REDE_DE_FORA.tiktok));
  /**
   * ⚠️ MAS ELE FICA PRONTO. As opções dele continuam medidas aqui em baixo — senão, no dia
   * em que a auditoria passasse, religava-se um TikTok que ninguém provava há meses.
   */
  ok('⏸️ o TikTok continua guardado e pronto para voltar ao minuto 12',
    REDE_TIKTOK.id === 'tiktok' && REDE_TIKTOK.minutos === 12 && typeof REDE_TIKTOK.legenda === 'function');

  ok('o Instagram é a âncora das 19h (minuto zero)', rede('instagram').minutos === 0);
  const minutos = REDES.map((r) => r.minutos);
  ok('as horas sobem sempre, nunca voltam atrás',
    minutos.every((m, i) => i === 0 || m > minutos[i - 1]), minutos.join(', '));
  /**
   * ⚠️ INTERVALOS DESIGUAIS DE PROPÓSITO. Oito posts de quinze em quinze minutos
   * certinhos é a assinatura de um robô — foi o próprio dono que o disse.
   */
  const gaps = minutos.slice(1).map((m, i) => m - minutos[i]);
  ok('nunca dois intervalos IGUAIS seguidos (é isso que soa a robô)',
    gaps.every((g, i) => i === 0 || g !== gaps[i - 1]), gaps.join(', '));
  ok('e nenhum é menor que 10 minutos', gaps.every((g) => g >= 10), gaps.join(', '));
  /**
   * A última tem de caber no horário nobre do Brasil. Com a âncora às 19h, 107 minutos
   * dão 20h47 — se alguém alargar os intervalos sem pensar, isto acende.
   */
  ok('🔴 a última ainda sai dentro do horário nobre (antes das 22h)',
    19 * 60 + minutos[minutos.length - 1] < 22 * 60,
    `a última sai às ${Math.floor((19 * 60 + minutos[minutos.length - 1]) / 60)}h`);
}

console.log('\n7. A MÍDIA DE CADA REDE — e a ORDEM, que no Pinterest é a regra');

{
  /**
   * 🔴 O PINTEREST EXIGE DUAS MÍDIAS E A ORDEM CONTA. Medido em 07/08: com a capa em 1º
   * o post ficou preso na fila; com o vídeo em 1º, publicou. O aviso deles fala das duas
   * mídias mas não diz uma palavra sobre a ordem.
   */
  const pin = midiasDaRede(rede('pinterest'), { media: MEDIA, capa: CAPA });
  ok('🔴 Pinterest: o VÍDEO vai primeiro e a capa depois',
    pin.midias[0] === MEDIA && pin.midias[1] === CAPA && pin.midias.length === 2,
    JSON.stringify(pin.midias));
  ok('e sem capa o Pinterest NÃO sai — em vez de sair errado',
    midiasDaRede(rede('pinterest'), { media: MEDIA, capa: null }).midias === null);
  ok('e diz-se porquê, para não ser um silêncio',
    /capa/i.test(midiasDaRede(rede('pinterest'), { media: MEDIA, capa: null }).motivo));

  /**
   * 🔴 O BLUESKY NÃO PUBLICA VÍDEO, e o diagnóstico está FECHADO (IMPL26 §10-B): quatro
   * provas mostram que o download, a rede, o GET e o POST funcionam — o defeito está no
   * código do Multipost, em `bluesky.provider.ts:97`. Não repetir a investigação.
   */
  const CAPA_LARGA = { id: 'cw', path: 'https://pub-abc.r2.dev/capa-yt.jpg' };
  const bs = midiasDaRede(rede('bluesky'), { media: MEDIA, capa: CAPA, capaLarga: CAPA_LARGA });
  ok('🔴 Bluesky: vai uma CAPA, nunca o vídeo', bs.midias.length === 1 && bs.midias[0] !== MEDIA);
  /**
   * 🔑 E É A DEITADA. A produção tira duas fotografias do mesmo instante: uma em pé
   * (1080×1920) e uma deitada (1280×720) — a deitada não é a em pé cortada, tem desenho
   * próprio. A em pé tem uma faixa vazia a ocupar quase um terço da imagem: em tela cheia
   * é respiro, num feed de texto é o que fica à vista.
   */
  ok('🔑 Bluesky: vai a capa DEITADA, não a do Instagram', bs.midias[0] === CAPA_LARGA, JSON.stringify(bs.midias[0]));
  // ⚠️ Vídeos ANTIGOS não têm a deitada (ela nasceu depois). Nesses vai a em pé.
  ok('num vídeo antigo, sem a deitada, vai a em pé — melhor que imagem nenhuma',
    midiasDaRede(rede('bluesky'), { media: MEDIA, capa: CAPA }).midias[0] === CAPA);
  ok('e o registo diz SEMPRE qual das duas foi',
    /deitada/i.test(bs.motivo) && /em pé/i.test(midiasDaRede(rede('bluesky'), { media: MEDIA, capa: CAPA }).motivo));
  ok('e sem capa nenhuma ele ainda sai — só texto e link (o Bluesky aceita)',
    midiasDaRede(rede('bluesky'), { media: MEDIA, capa: null }).midias.length === 0);
  // ⚠️ O Pinterest continua com a EM PÉ: ali o formato alto é o que ocupa mais tela.
  ok('🔑 mas o Pinterest continua com a capa EM PÉ',
    midiasDaRede(rede('pinterest'), { media: MEDIA, capa: CAPA, capaLarga: CAPA_LARGA }).midias[1] === CAPA);

  for (const id of ['instagram', 'tiktok', 'facebook', 'linkedin-page', 'threads', 'telegram']) {
    const m = midiasDaRede(rede(id), { media: MEDIA, capa: CAPA });
    ok(`${id}: leva só o vídeo`, m.midias.length === 1 && m.midias[0] === MEDIA);
  }
}

console.log('\n8. AS OPÇÕES DE CADA REDE — perguntadas ao servidor, não deduzidas');

{
  const tk = opcoesDaRede(rede('tiktok'), { titulo: 'Um título qualquer' });
  /**
   * 🔴 ENQUANTO A AUDITORIA NÃO SAIR, O TIKTOK SÓ ACEITA PRIVADO. Não é excesso de zelo:
   * foi a segunda parede de 07/08 — "App not approved for public posting". Se alguém
   * puser PUBLIC_TO_EVERYONE antes da aprovação, volta a falhar todos os dias em silêncio.
   */
  ok('🔴 TikTok: privado enquanto a auditoria não sair', tk.privacy_level === 'SELF_ONLY');
  // ⚠️ Ligado + privado = recusa. Medido.
  ok('🔴 TikTok: "conteúdo de marca" DESLIGADO (ligado + privado = recusa)',
    tk.brand_content_toggle === false && tk.brand_organic_toggle === false);
  // "UPLOAD" deixaria um rascunho à espera de alguém pegar no telemóvel.
  ok('TikTok: publica direto, não deixa rascunho', tk.content_posting_method === 'DIRECT_POST');
  ok('TikTok: declara que tem IA (a voz é sintetizada)', tk.video_made_with_ai === true);
  /**
   * As OITO opções que o servidor respondeu que EXIGE. Faltar uma dá 400 — e este servidor
   * costuma preferir o silêncio ao erro, por isso a prova é aqui.
   */
  const exigidasPeloTikTok = ['privacy_level', 'duet', 'stitch', 'comment', 'autoAddMusic', 'brand_content_toggle', 'brand_organic_toggle', 'content_posting_method'];
  ok('TikTok: manda TODAS as oito opções obrigatórias',
    exigidasPeloTikTok.every((c) => tk[c] !== undefined),
    exigidasPeloTikTok.filter((c) => tk[c] === undefined).join(', '));
  ok('TikTok: o título é cortado no limite dele, sem partir palavra',
    opcoesDaRede(rede('tiktok'), { titulo: 'palavra '.repeat(40) }).title.length <= MAX_TITULO_TIKTOK);

  const pin = opcoesDaRede(rede('pinterest'), { titulo: 'T', quadroDoPinterest: '110528' });
  ok('Pinterest: leva o quadro, que é obrigatório', pin.board === '110528');
  ok('Pinterest: leva o link, que é o que faz o pin valer', /finmoovi\.com/.test(pin.link));

  /**
   * ⚠️ O `__type` TEM DE SER O IDENTIFICADOR DO PROVEDOR. É por ele que o servidor sabe a
   * que canal aquelas opções pertencem — e ele deita fora EM SILÊNCIO o que não reconhece.
   */
  for (const r of REDES) {
    const o = r.id === 'instagram'
      ? corpoDoAgendamento({ ...PEDIDO, canalId: 'c' }).posts[0].settings
      : opcoesDaRede(r, { titulo: 'T', quadroDoPinterest: 'q' });
    ok(`${r.id}: o __type é o nome do provedor`, o.__type === r.id, o.__type);
  }
}

console.log('\n9. O TEXTO DE CADA REDE — cabe no limite, e o LINK nunca cai');

{
  /**
   * 🔴 O SERVIDOR CORTA EM SILÊNCIO o que passa do limite dele — não devolve erro. Um
   * post do Bluesky que passasse dos 300 sairia sem o endereço e ninguém saberia: é a
   * única coisa que aquele post tem para dar.
   */
  // ⚠️ O TikTok entra aqui mesmo estando fora da entrega: ele volta um dia, e o texto dele
  // tem de continuar a caber sem ninguém ter de se lembrar de o medir nesse dia.
  for (const r of [...REDES, REDE_TIKTOK]) {
    const texto = r.legenda(ROTEIRO, r.limite);
    ok(`${r.id}: o texto cabe nos ${r.limite}`, texto.length <= r.limite, `deu ${texto.length}`);
  }

  // O caso a sério: um gancho comprido de mais obriga a cortar. O link tem de sobreviver.
  const comprido = { ...ROTEIRO, intro: { frase: `${'uma frase muito comprida que não acaba nunca '.repeat(20)}?` } };
  for (const id of ['bluesky', 'pinterest', 'threads']) {
    const texto = rede(id).legenda(comprido, rede(id).limite);
    ok(`🔴 ${id}: mesmo com o texto a estourar, o LINK sobrevive`,
      texto.includes('finmoovi.com') && texto.length <= rede(id).limite,
      `${texto.length} caracteres`);
  }

  /**
   * 🔴 A CHAMADA "comenta FINMOOVI" SÓ PODE EXISTIR ONDE HÁ ROBÔ A RESPONDER — Instagram
   * (mensagem privada) e YouTube (`comentarios.js`). Nas outras SETE ninguém responde, e
   * uma promessa quebrada é pior do que chamada nenhuma. Ver IMPL26 §12-A.
   */
  ok('🔴 o Instagram MANTÉM o "comenta FINMOOVI" (a automação dele existe)',
    /comenta FINMOOVI/i.test(rede('instagram').legenda(ROTEIRO, 2200)));
  for (const r of REDES.filter((x) => x.id !== 'instagram')) {
    ok(`🔴 ${r.id} NÃO pede comentário — lá ninguém responderia`,
      !/coment/i.test(r.legenda(ROTEIRO, r.limite)),
      r.legenda(ROTEIRO, r.limite));
  }
  /**
   * ⚠️ E o link só se ANUNCIA onde ele é clicável. No Instagram e no TikTok o endereço na
   * legenda é texto morto — por isso lá a frase manda PROCURAR o nome.
   */
  ok('🔴 no TikTok a chamada manda PROCURAR, não clicar',
    /procura FinMoovi/i.test(rede('tiktok').legenda(ROTEIRO, 2000))
    && !/https:\/\//.test(rede('tiktok').legenda(ROTEIRO, 2000)));
  /**
   * ⚠️ O endereço deixou de ser sempre `finmoovi.com`: o LinkedIn e o Pinterest passaram a
   * apontar para a CALCULADORA daquele tema, no blog (§13). O que esta prova cobra é que
   * **haja um endereço nosso e clicável** — qual deles é decisão de cada rede.
   */
  for (const id of ['facebook', 'linkedin-page', 'telegram', 'threads', 'pinterest', 'bluesky']) {
    ok(`${id}: leva um endereço nosso, que ali é clicável`,
      /https:\/\/(blog\.)?finmoovi\.com/.test(rede(id).legenda(ROTEIRO, rede(id).limite)));
  }

  /**
   * ⚠️ ESTA PROVA APANHOU UM DEFEITO A SÉRIO: a 1ª versão comia sempre a última palavra,
   * mesmo quando o corte calhava exatamente no fim de uma. Num Bluesky de 300, três
   * caracteres deitados fora de graça contam.
   */
  ok('cortar aproveita a palavra que cabe INTEIRA', cortarNaPalavra('uma frase de teste aqui', 12) === 'uma frase de',
    cortarNaPalavra('uma frase de teste aqui', 12));
  ok('e quando cai no meio de uma palavra, recua até ao espaço',
    cortarNaPalavra('uma frase de teste aqui', 15) === 'uma frase de');
  ok('e o que já cabe volta intacto', cortarNaPalavra('curto', 50) === 'curto');
  ok('encaixar deita fora os dispensáveis antes de cortar o texto',
    encaixarNoLimite([{ texto: 'gancho', essencial: true }, { texto: 'x'.repeat(500) }, { texto: 'LINK', essencial: true }], 50)
      === 'gancho\n\nLINK');
}

console.log('\n10. O CADERNO COM OITO REDES — a retoma que antes não existia');

{
  // ⚠️ Contado a partir de `REDES`, não escrito à mão: assim isto não precisa de ser
  // mexido no dia em que o TikTok voltar à tabela.
  ok('sem registo nenhum, faltam todas', oQueFalta(undefined).faltam.length === REDES.length);
  /**
   * ⚠️ UM REGISTO ANTIGO (sem `redes`) É DIA FECHADO. Ele é de quando só havia Instagram;
   * tratá-lo como "faltam sete" mandaria um vídeo de há uma semana para sete redes de uma
   * vez, todas no mesmo minuto.
   */
  const antigo = oQueFalta({ postId: 'p1', agendadoEm: '2026-08-06T10:00:00Z' });
  ok('🔴 um registo ANTIGO conta como dia fechado, não como sete em falta',
    antigo.antigo === true && antigo.faltam.length === 0);

  const meio = oQueFalta({ redes: { instagram: { postId: 'a' }, facebook: { postId: 'b' } } });
  ok('com duas feitas, faltam as outras', meio.feitas.length === 2 && meio.faltam.length === REDES.length - 2);
  ok('🔑 e a retoma tenta SÓ as que faltaram — não republica as feitas',
    !meio.faltam.includes('instagram') && !meio.faltam.includes('facebook'));

  const todas = oQueFalta({ redes: Object.fromEntries(REDES.map((r) => [r.id, { postId: 'x' }])) });
  ok('com todas feitas, não falta nenhuma', todas.faltam.length === 0 && todas.feitas.length === REDES.length);
}

/**
 * ═══ A TRAVA DO VÍDEO ANTIGO ═══
 *
 * 🔴 **O CASO REAL.** No dia em que isto passou de uma rede para oito, havia DOIS vídeos
 * já produzidos à espera na fila — e os dois FALAM *"comenta FINMOOVI aqui embaixo que eu
 * te mando o aplicativo"*. Mandá-los para as sete redes novas seria recriar, logo no
 * primeiro dia, a promessa quebrada que este trabalho veio consertar.
 *
 * ⚠️ Ela **desliga-se sozinha** a partir do primeiro vídeo com a fala nova — por isso pode
 * ficar para sempre, sem custo e sem ninguém ter de se lembrar de a tirar.
 */
console.log('\n11. A TRAVA DO VÍDEO ANTIGO — o que fala "comenta" só sai no Instagram');

{
  // As falas dos dois vídeos que estavam mesmo na fila em 07/08.
  ok('🔴 apanha o vídeo que ainda pede comentário na FALA',
    falaPedeComentario({ scenes: [{ role: 'cta', narration: 'Pra ver o seu caso, comenta FINMOOVI aqui embaixo que eu te mando o aplicativo de graça.' }] }));
  // ⚠️ E também o que só o pede na TELA — o texto da pastilha conta tanto como a voz.
  ok('🔴 e o que só pede na TELA (a pastilha conta como a voz)',
    falaPedeComentario({ scenes: [{ role: 'cta', narration: 'Procura FinMoovi.' }], cta: { text: 'Comente FINMOOVI agora' } }));

  ok('✅ o vídeo com a fala NOVA passa — e as oito redes recebem',
    !falaPedeComentario({ scenes: [{ role: 'cta', narration: 'Quer ver o seu? Procura FinMoovi. É de graça.' }], cta: { text: 'Procura FinMoovi' } }));

  /**
   * ⚠️ SÓ A CENA DA CHAMADA CONTA. A palavra "comentário" noutro sítio da história não é
   * uma promessa a quem assiste — puni-la era barrar vídeos bons por uma palavra solta.
   */
  ok('a palavra "comentários" no meio da história NÃO trava o vídeo',
    !falaPedeComentario({ scenes: [{ role: 'beat', narration: 'Vi nos comentários que muita gente paga isso.' }, { role: 'cta', narration: 'Procura FinMoovi.' }] }));
  ok('e um roteiro sem cena de chamada não rebenta', falaPedeComentario({}) === false);
}

/**
 * ═══ OS NÚMEROS DA LEGENDA (07/08/2026) ═══
 *
 * 🔴 **O DEFEITO ESTAVA NO AR.** As legendas copiam frases da NARRAÇÃO, e a narração é
 * escrita para ser FALADA — os números vão por extenso de propósito (a voz lia "R$ 500"
 * como *"erre cifrão quinhentos"*). Numa legenda escrita isso sai
 * *"cento e cinquenta reais"* em vez de *"R$ 150"*. Saiu assim no Instagram durante dias.
 *
 * ⚠️ **Esta secção é a mais perigosa do ficheiro:** um número convertido errado numa
 * legenda é pior do que o defeito original. Por isso mede-se os dois lados — o que TEM de
 * ser convertido, e sobretudo **o que NÃO PODE ser tocado**.
 */
console.log('\n12. OS NÚMEROS DA LEGENDA — de "cento e cinquenta reais" para "R$ 150"');

{
  const N = numerosEmAlgarismo;

  // ── o que tem de converter ──────────────────────────────────────────────────
  ok('🔴 o caso real: "cento e cinquenta reais" → "R$ 150"',
    N('O primeiro leva cento e cinquenta reais.') === 'O primeiro leva R$ 150.', N('O primeiro leva cento e cinquenta reais.'));
  ok('"quinhentos reais" → "R$ 500"',
    N('tiram quinhentos reais do seu bolso') === 'tiram R$ 500 do seu bolso', N('tiram quinhentos reais do seu bolso'));
  ok('"cem reais" → "R$ 100"', N('cem reais por mês') === 'R$ 100 por mês');
  ok('o milhar leva ponto: "quatro mil reais" → "R$ 4.000"',
    N('ganha quatro mil reais') === 'ganha R$ 4.000', N('ganha quatro mil reais'));
  /**
   * 🔑 O NUMERAL COMPOSTO TEM DE SER LIDO INTEIRO. "dois mil seiscentos e noventa e nove"
   * é UM número (2699), não quatro pedaços — a mesma regra que o validador da narração
   * aprendeu à força do outro lado do pipeline.
   */
  ok('🔑 "dois mil seiscentos e noventa e nove reais" → "R$ 2.699"',
    N('dá dois mil seiscentos e noventa e nove reais') === 'dá R$ 2.699', N('dá dois mil seiscentos e noventa e nove reais'));
  /**
   * 🔴 A FAMÍLIA QUE MORDEU. Esta prova nasceu de um defeito REAL apanhado aqui: o
   * "seiscentos" era lido como "seis" + "centos" e a legenda saía **"2.006centos e noventa
   * e R$ 9"**. A causa é que "seis" vem antes de "seiscentos" na lista, e o regex fica com
   * a primeira alternativa que serve. São seis palavras com o mesmo problema — se alguém
   * mexer na construção do padrão, é aqui que acende.
   */
  for (const [frase, esperado] of [
    ['seiscentos reais', 'R$ 600'], ['setecentos reais', 'R$ 700'], ['oitocentos reais', 'R$ 800'],
    ['novecentos reais', 'R$ 900'], ['quatrocentos reais', 'R$ 400'], ['dezessete reais', 'R$ 17'],
  ]) {
    ok(`🔴 "${frase}" → "${esperado}" (e não partido ao meio)`, N(frase) === esperado, N(frase));
  }
  ok('a percentagem também: "quinze por cento" → "15%"',
    N('rende quinze por cento ao ano') === 'rende 15% ao ano', N('rende quinze por cento ao ano'));
  ok('sem unidade, mas de 100 para cima, converte: "duzentos" → "200"',
    N('o outro duzentos, e o resto some') === 'o outro 200, e o resto some', N('o outro duzentos, e o resto some'));

  // ── 🔴 o que NÃO pode ser tocado ────────────────────────────────────────────
  /**
   * 🔴 "UM" É ARTIGO MUITO MAIS VEZES DO QUE É NÚMERO. Se isto falhar, sai "1 erro" e
   * "as 2 coisas" nas legendas de todas as redes.
   */
  ok('🔴 "um erro" NÃO vira "1 erro"', N('cometeu um erro grave') === 'cometeu um erro grave');
  ok('🔴 "as duas coisas" NÃO vira "as 2 coisas"', N('as duas coisas juntas') === 'as duas coisas juntas');
  ok('🔴 "três erros" fica por extenso (abaixo do piso e sem unidade)',
    N('são três erros no cartão') === 'são três erros no cartão');
  ok('"dez anos" fica como está — lê-se bem assim', N('em dez anos') === 'em dez anos');
  /**
   * 🔴 A ENUMERAÇÃO. "em um, cinco e dez anos" é uma LISTA, não o número 16 — foi
   * exatamente essa soma que matou o Short de 07/08, do outro lado do pipeline. Aqui o
   * piso de 100 protege sozinho: nenhum deles chega lá, nenhum é tocado.
   */
  ok('🔴 "um, cinco e dez anos" fica INTEIRO — é lista, não é o número 16',
    N('olha em um, cinco e dez anos') === 'olha em um, cinco e dez anos', N('olha em um, cinco e dez anos'));
  ok('e a lista continua intacta mesmo com "e" no meio',
    N('cinco e dez') === 'cinco e dez');

  // ── a leitura por baixo, medida à parte ─────────────────────────────────────
  ok('o leitor desce no numeral composto e soma certo',
    lerNumeral(['dois', 'mil', 'seiscentos', 'e', 'noventa', 'e', 'nove']).valor === 2699);
  ok('🔑 e PARA quando o número sobe (é lista, não é soma)',
    lerNumeral(['cinco', 'e', 'dez']).valor === 5, JSON.stringify(lerNumeral(['cinco', 'e', 'dez'])));
  ok('"mil" sozinho vale mil', lerNumeral(['mil']).valor === 1000);
  ok('e uma palavra que não é número devolve nada', lerNumeral(['cartão']) === null);

  // ── o texto à volta não pode mexer-se ───────────────────────────────────────
  /**
   * ⚠️ O conversor reescreve o texto: se ele comer uma vírgula, um acento ou um espaço,
   * a legenda sai estragada de uma forma que nenhuma outra prova apanha.
   */
  const original = 'Sabe quais três erros no cartão tiram quinhentos reais do seu bolso todo mês?';
  ok('🔴 só o número muda — pontuação, acentos e espaços ficam iguais',
    N(original) === 'Sabe quais três erros no cartão tiram R$ 500 do seu bolso todo mês?', N(original));
  ok('texto sem número nenhum volta idêntico',
    N('Uma frase inteira sem número nenhum, com vírgula.') === 'Uma frase inteira sem número nenhum, com vírgula.');
  ok('e texto vazio não rebenta', N('') === '' && N(null) === '' && N(undefined) === '');
  // ⚠️ "cem" dentro de outra palavra não pode ser apanhado.
  ok('"centavos" e "cenário" não são números', N('uns centavos no cenário') === 'uns centavos no cenário');

  // ── e o efeito onde interessa: as legendas ──────────────────────────────────
  const topicos = topicosDoRoteiro(ROTEIRO);
  ok('🔑 os TÓPICOS da legenda saem com algarismos',
    topicos.some((t) => /R\$ \d/.test(t)) && !topicos.some((t) => /cento e cinquenta/i.test(t)),
    topicos.join(' | '));
  ok('🔑 e o GANCHO também, em todas as redes',
    REDES.every((r) => !/quinhentos reais/i.test(r.legenda(ROTEIRO, r.limite))));
  ok('🔴 incluindo o Instagram, que é onde o defeito estava no ar',
    /R\$ 500/.test(montarLegenda(ROTEIRO)) && !/quinhentos reais/.test(montarLegenda(ROTEIRO)));
}

/**
 * ═══ O LINK QUE CADA POST LEVA (07/08/2026) ═══
 *
 * 🔑 O repositório **já sabia** achar a calculadora daquele tema (`resolveToolUrl`, usada
 * no primeiro comentário do YouTube) — e as redes estavam todas a mandar para a porta da
 * frente do site. No Pinterest isso é caro: quem procura "juros do cartão" quer a CONTA,
 * não a página de entrada.
 */
console.log('\n13. O LINK CERTO — a calculadora do tema, não a porta da frente');

{
  const alvo = linkDoVideo(ROTEIRO);
  ok('🔑 um vídeo sobre cartão aponta para a calculadora de financiamento',
    alvo.url === 'https://blog.finmoovi.com/ferramentas/calculadora-financiamento/', alvo.url);
  ok('e sabe que o link é ESPECÍFICO', alvo.especifica === true);
  /**
   * ⚠️ Quando o tema não tem calculadora própria, cai no índice — e aí a frase NÃO pode
   * dizer "a calculadora deste tema", porque não há uma. Prometer o que não existe é o
   * defeito que este projeto mais já pagou.
   */
  const semTema = linkDoVideo({ cta: { target: 'app' } });
  ok('🔴 sem tema, cai no índice — e ASSUME que não é específico',
    semTema.url.endsWith('/ferramentas/') && semTema.especifica === false, JSON.stringify(semTema));
  ok('e o texto acompanha: sem calculadora própria, não se promete uma',
    !/calculadora deste tema/i.test(rede('pinterest').legenda({ ...ROTEIRO, keyword: '', term: '', category: '' }, 500)));
  ok('nenhuma rede continua a mandar para a porta da frente sozinha',
    !/finmoovi\.com\/?$/m.test(rede('pinterest').legenda(ROTEIRO, 500)));
}

/**
 * ═══ O PINTEREST É UM BUSCADOR (07/08/2026) ═══
 *
 * 🔴 A primeira versão usava **187 dos 500** caracteres e mandava para `finmoovi.com`.
 * Eram 313 caracteres de texto pesquisável deitados fora todos os dias — e é o ÚNICO sítio
 * da lista onde a descrição comprida rende de verdade, porque o pin é encontrado meses
 * depois pela busca.
 */
console.log('\n14. O PINTEREST — descrição cheia, porque ali o texto é que traz gente');

{
  const texto = rede('pinterest').legenda(ROTEIRO, 500);
  ok('🔴 usa pelo menos 400 dos 500 (antes usava 187)', texto.length >= 400, `usa ${texto.length}`);
  ok('e continua a caber', texto.length <= 500);
  ok('leva os tópicos do vídeo — é neles que estão as palavras do tema', /•/.test(texto));
  ok('leva o endereço da calculadora, não o do site',
    texto.includes('ferramentas/calculadora-financiamento/'));
  ok('e as etiquetas todas (aqui elas cabem)',
    (texto.match(/#/g) || []).length >= 5, `tem ${(texto.match(/#/g) || []).length}`);

  /**
   * ⚠️ O `link` das OPÇÕES é o destino do clique — coisa diferente do endereço escrito na
   * descrição. Os dois têm de apontar para o mesmo sítio, senão o pin promete uma coisa e
   * entrega outra.
   */
  const opcoes = opcoesDaRede(rede('pinterest'), { titulo: ROTEIRO.term, link: linkDoVideo(ROTEIRO).url, quadroDoPinterest: 'q' });
  ok('🔑 o destino do clique é o MESMO que está escrito na descrição',
    opcoes.link === linkDoVideo(ROTEIRO).url && texto.includes(opcoes.link));
}

/**
 * ═══ O LINKEDIN GANHOU TEXTO PRÓPRIO (07/08/2026) ═══
 *
 * É o único público que repara em texto malcuidado — e era ele que estava a receber, como
 * tópico, uma frase de vídeo na primeira pessoa: *"Eu joguei isso no FinMoovi e ele me
 * mostrou…"*. Funciona dito em voz alta, não funciona num post.
 */
console.log('\n15. O LINKEDIN — sem fala de vídeo disfarçada de tópico');

{
  const texto = rede('linkedin-page').legenda(ROTEIRO, 3000);
  /**
   * 🔴 A REGRA É DE ESTRUTURA, NÃO DE GOSTO: por desenho do roteiro, o bloco da
   * demonstração é o único que nomeia o produto, e é escrito na primeira pessoa. Aqui o
   * produto entra UMA vez, no fecho — não disfarçado de índice.
   */
  ok('🔴 nenhum tópico do LinkedIn nomeia o produto',
    !/• .*FinMoovi/i.test(texto), texto);
  ok('mas o produto continua lá, uma vez, no fecho',
    /FinMoovi|calculadora/i.test(texto));
  ok('🔴 e a frase falada na 1ª pessoa não aparece',
    !/Eu joguei isso/i.test(texto), texto);
  ok(`no máximo ${MAX_ETIQUETAS_LINKEDIN} etiquetas (seis lê-se como enchimento)`,
    (texto.match(/#/g) || []).length <= MAX_ETIQUETAS_LINKEDIN, `tem ${(texto.match(/#/g) || []).length}`);
  /**
   * ⚠️ AS DUAS PRIMEIRAS LINHAS SÃO TUDO O QUE SE VÊ antes do "…ver mais". Se um dia
   * alguém puser o link ou as etiquetas à frente, isto acende.
   */
  const antesDoVerMais = texto.slice(0, 200);
  ok('🔑 o título e o gancho cabem antes do "ver mais"',
    antesDoVerMais.includes(ROTEIRO.term.slice(0, 20)) && !antesDoVerMais.includes('http'), antesDoVerMais);
  ok('e o link é o da calculadora, não o do site', texto.includes('ferramentas/calculadora-financiamento/'));

  // ⚠️ O Facebook NÃO foi tocado: ele é mais informal e a frase na 1ª pessoa cabe lá.
  ok('o Facebook continua como estava, com a frase do produto',
    /FinMoovi/i.test(rede('facebook').legenda(ROTEIRO, 63206)));

  /**
   * 🔴 O ESCAPE QUE ANULAVA A REGRA. A 1ª versão dizia "se sobrar só um tópico, fica com
   * os dois" — e os roteiros têm normalmente DOIS, um deles a demonstração. Ou seja: o
   * escape disparava sempre e a frase falada continuava lá. Só se viu ao olhar o texto.
   */
  ok('🔴 o filtro tira mesmo o tópico do produto, sem escape',
    topicosSemOProduto(ROTEIRO).every((t) => !/finmoovi/i.test(t))
    && topicosSemOProduto(ROTEIRO).length < topicosDoRoteiro(ROTEIRO).length);
  // ⚠️ UM item não é uma lista: vai como frase corrida, sem marcador.
  ok('um item só não leva marcador de lista', comoLista(['só este']) === 'só este');
  ok('dois ou mais levam', comoLista(['a', 'b']) === '• a\n• b');
  ok('e nenhum não deixa bloco nenhum', comoLista([]) === '');
}

console.log('\n16. O ENVELOPE — a data fica FORA da lista de redes');

{
  const corpo = montarPedido({
    canalId: 'c1', midias: [MEDIA, CAPA], legenda: 'linha', quandoUTC: new Date('2026-08-07T22:00:00.000Z'),
    settings: { __type: 'pinterest' },
  });
  /**
   * 🔴 É ISTO QUE OBRIGA A UMA CHAMADA POR REDE. A `date` vale para o pedido inteiro, não
   * por post: as oito na mesma chamada sairiam todas no mesmo minuto — precisamente o que
   * o dono não quer. Está medido no contrato do servidor (`/api/docs-json`).
   */
  ok('🔴 a hora é do PEDIDO, não de cada post',
    corpo.date === '2026-08-07T22:00:00.000Z' && corpo.posts[0].date === undefined);
  ok('as duas mídias mantêm a ordem em que foram postas',
    corpo.posts[0].value[0].image.map((m) => m.id).join(',') === 'm1,c1');
  ok('e a legenda continua a ir com um parágrafo por linha',
    corpo.posts[0].value[0].content === '<p>linha</p>');
}

console.log(`\n${'═'.repeat(72)}`);
console.log(`  ${passou} provas verdes · ${falhou} vermelhas`);
if (falhou) {
  console.log('\n  ❌ AS QUE FALHARAM:');
  falhas.forEach((f) => console.log(`     · ${f}`));
}
console.log(`${'═'.repeat(72)}\n`);
process.exit(falhou ? 1 : 0);
