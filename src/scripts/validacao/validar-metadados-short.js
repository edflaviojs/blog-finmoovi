/**
 * A PROVA DE MESA DOS METADADOS DO SHORT — sem rede, sem chave, sem custo.
 *
 * ═══ POR QUE NASCEU (06/08/2026) ═══
 * O Short publica **todos os dias** e era o único formato **sem uma única prova de mesa**:
 * a única forma de ver o que ele ia escrever era gastar uma corrida de IA na nuvem. As
 * três regras novas do dono — título curto, palavra-chave em maiúsculas, três hashtags —
 * são exatamente o tipo de coisa que se parte em silêncio e só se descobre no Studio.
 *
 * ⚠️ **NÃO CHAMA A IA.** Prova o que é NOSSO: o corte, a contagem, a escolha. O que a IA
 * escreve é medido pelo `youtube-metadados-prova.yml`, que gasta.
 *
 * Uso: node src/scripts/validacao/validar-metadados-short.js
 */

import {
  titularOShort, escolherEtiquetas, variacoesDaEtiqueta,
  buildMetadata, deterministicMeta, respostaCortada, MAX_PALAVRAS_TITULO_SHORT,
} from '../youtube/upload-short.js';
import { avaliarRetencao, RETENCAO_MINIMA } from '../youtube/retencao.js';
import { prateleirasDoVideo, PLAYLIST_GERAL } from '../youtube/lib/playlists.js';
import { inserirNoShort, inserirNoLongo, conferirOportunidade, fazerSlugDoDono } from '../../../functions/api/_oportunidade-fila.js';
import { proximoLongo } from '../youtube/pick-next-longo.js';
import { validarNarrativa } from '../youtube/roteiro-narrativa.js';
import { jaSaiuVideoNoDia } from '../youtube/outbox.js';

let passou = 0;
let falhou = 0;
const falhas = [];
const ok = (nome, cond, det = '') => {
  if (cond) { passou++; console.log(`  ✅ ${nome}`); }
  else { falhou++; falhas.push(`${nome}${det ? ` — ${det}` : ''}`); console.log(`  ❌ ${nome}${det ? ` — ${det}` : ''}`); }
};
const calado = () => {};

console.log('\n1. O TÍTULO — curto, e só a palavra-chave a gritar');

{
  ok('a palavra-chave sai em maiúsculas',
    titularOShort('Inflação: 3 erros que te custam caro', 'inflação', calado)
      === 'INFLAÇÃO: 3 erros que te custam caro');
  ok('e apanha-a mesmo no meio da frase',
    titularOShort('3 erros de inflação que te custam caro', 'inflação', calado)
      === '3 erros de INFLAÇÃO que te custam caro');
  ok('funciona com palavra-chave de duas palavras',
    titularOShort('Tesouro Direto com R$ 100 vale a pena?', 'Tesouro Direto', calado)
      .startsWith('TESOURO DIRETO'));
  /**
   * 🔴 **SÓ A PALAVRA-CHAVE, NUNCA A FRASE.** O canal tem uma trava escrita contra títulos
   * aos berros (*"um título aos berros é recusado"*) — metade dos virais que servem de
   * modelo GRITAM, e este canal decidiu não gritar. Esta prova acende se alguém, um dia,
   * resolver pôr o título todo em maiúsculas "para destacar mais".
   */
  const t = titularOShort('Inflação: 3 erros que te custam caro', 'inflação', calado);
  ok('🔴 e o RESTO do título continua em minúsculas', t !== t.toUpperCase());
  ok('uma palavra-chave que não está no título não estraga nada',
    titularOShort('Como sobrar dinheiro no fim do mês', 'bitcoin', calado)
      === 'Como sobrar dinheiro no fim do mês');
  ok('sem palavra-chave, devolve o título tal e qual',
    titularOShort('Um título qualquer', '', calado) === 'Um título qualquer');

  /**
   * 🔴 **O TÍTULO QUE O DONO ESCREVE NA /status VAI À LETRA.** Ele escreveu-o para ir
   * assim: sem a IA, sem o teto das 8 palavras, sem maiúsculas postas por nós. As nossas
   * regras existem para quando é a MÁQUINA a escrever — aplicá-las ao que uma pessoa
   * decidiu seria mudar-lhe a decisão sem lhe dizer.
   * ⚠️ Esta prova nasceu de uma pergunta dele: *"esse título que eu vou colocar lá na
   * /status realmente vai ser gerado, ou é somente para um teste?"* — e a resposta, no
   * código, era **metade**: o título era guardado na fila e nunca chegava ao YouTube.
   */
  const comDono = { keyword: 'inflação', term: 'inflação', category: 'x', cta: { text: 'y' }, tituloDoDono: 'Eu escrevi este título exatamente assim e com mais de oito palavras' };
  const metaDono = buildMetadata(deterministicMeta(comDono), comDono);
  ok('🔴 o título do dono vai à letra, sem a IA lhe tocar',
    metaDono.snippet.title === comDono.tituloDoDono, metaDono.snippet.title);
  ok('e nem o teto de 8 palavras nem as maiúsculas lhe são aplicados',
    metaDono.snippet.title.split(/\s+/).length > MAX_PALAVRAS_TITULO_SHORT
      && !metaDono.snippet.title.includes('INFLAÇÃO'));
  const semDono = { keyword: 'inflação', term: 'inflação', category: 'x', cta: { text: 'y' } };
  ok('sem título do dono, tudo continua como sempre foi',
    buildMetadata({ ...deterministicMeta(semDono), title: 'Inflação: 3 erros que custam caro' }, semDono)
      .snippet.title === 'INFLAÇÃO: 3 erros que custam caro');

  /**
   * ⚠️ **O TÍTULO COMPRIDO É REJEITADO, NÃO CORTADO** — e o pedido à IA manda o mesmo
   * número que a trava exige. É a regra contra o defeito mais repetido deste projeto: o
   * prompt a mandar escrever o que o leitor a seguir recusa.
   */
  const bases = { description: 'Uma frase.', hashtagsRaw: '#a #b', tagsRaw: 'a,b' };
  ok(`um título com ${MAX_PALAVRAS_TITULO_SHORT + 1} palavras é recusado`,
    /o teto são/.test(respostaCortada({ ...bases, title: 'Um titulo bem comprido com nove palavras aqui dentro' }) || ''));
  ok(`um título com ${MAX_PALAVRAS_TITULO_SHORT} palavras passa`,
    respostaCortada({ ...bases, title: 'Um titulo com exatamente oito palavras aqui' }) === null);
  ok('o teto combinado com o dono são 8 palavras', MAX_PALAVRAS_TITULO_SHORT === 8);
  /**
   * ⚠️ E o texto de reserva TAMBÉM tem de caber: é nos dias maus que ele é usado, e não
   * pode ser ele a partir a regra que a IA é obrigada a cumprir.
   */
  for (const kw of ['inflação', 'aplicação financeira', 'erro ao usar amortização price']) {
    const d = deterministicMeta({ keyword: kw, term: kw, category: 'x', cta: { text: 'y' } });
    ok(`o texto de reserva cabe nas 8 palavras ("${kw}")`,
      d.title.split(/\s+/).length <= MAX_PALAVRAS_TITULO_SHORT, `${d.title.split(/\s+/).length}: ${d.title}`);
  }
}

console.log('\n2. AS HASHTAGS — três, e #Shorts é uma delas');

{
  const script = { keyword: 'inflação', term: 'inflação', category: 'economia', cta: { text: 'x' } };
  const meta = buildMetadata(deterministicMeta(script), script);
  const linha = meta.snippet.description.split('\n').find((l) => l.trim().startsWith('#')) || '';
  const tags = linha.trim().split(/\s+/).filter(Boolean);
  ok('saem exatamente 3 hashtags', tags.length === 3, linha);
  ok('e #Shorts é sempre a última', tags[tags.length - 1] === '#Shorts');
  ok('a primeira é a do tema', tags[0].toLowerCase().includes('inflação'.toLowerCase()));
}

console.log('\n3. AS ETIQUETAS — encher os 500 caracteres, sem inventar palavras');

{
  /**
   * ⚠️ A LISTA DE PARTIDA É A DE VERDADE — a do texto de reserva, que é o pior caso: nos
   * dias bons a IA manda mais palavras do que estas. Uma prova com uma lista inventada,
   * mais curta do que a real, mediria um vídeo que não existe.
   */
  const script = { keyword: 'dívida do cartão', term: 'dívida do cartão', category: 'economia', cta: { text: 'x' } };
  const e = escolherEtiquetas(deterministicMeta(script).tags);
  const chars = e.join(',').length;
  ok('enche pelo menos 350 caracteres (era 199 antes de 06/08)', chars >= 350, `${chars}`);
  // 🔴 A ORDEM: se o orçamento acabar, quem fica de fora é uma VARIAÇÃO, nunca uma
  // palavra que o dono aprovou. Por isso as originais entram todas primeiro.
  const chaves = ['sair do vermelho', 'dívida do cartão', 'juros do rotativo'];
  const ordenadas = escolherEtiquetas(chaves);
  /** ⚠️ 480 e não 500: nunca se encosta ao limite de outra pessoa. */
  ok('e nunca passa dos 480, que deixa folga para os 500 do YouTube', chars <= 480, `${chars}`);
  ok('as palavras do dono vêm TODAS à frente das variações',
    chaves.every((c, i) => ordenadas[i] === c), ordenadas.slice(0, chaves.length).join(' | '));
  ok('nenhuma etiqueta se repete', new Set(e.map((x) => x.toLowerCase())).size === e.length);
  ok('nenhuma etiqueta é uma frase — ninguém procura frases',
    e.every((t) => t.split(' ').length <= 5), e.filter((t) => t.split(' ').length > 5).join(' | '));
  ok('nenhuma etiqueta acaba a meio de uma palavra', e.every((t) => t.length < 60));
  /**
   * ⚠️ **AS VARIAÇÕES SÃO TRÊS, E ESCOLHIDAS PELA GRAMÁTICA.** A palavra-chave tanto pode
   * ser um nome ("dívida do cartão") como uma ação ("sair do vermelho"): *"como fazer sair
   * do vermelho"* não é português. Estas lêem-se bem com as duas formas.
   */
  ok('as variações lêem-se bem com um NOME e com uma AÇÃO',
    variacoesDaEtiqueta('sair do vermelho').join('|') === 'sair do vermelho|o que é sair do vermelho|sair do vermelho na prática|sair do vermelho 2026');
  ok('uma lista vazia não rebenta', escolherEtiquetas([]).length === 0 && escolherEtiquetas(null).length === 0);
}

console.log('\n4. O AVISO DOS 70% (ordem do dono, 06/08)');

{
  const v = (slug, percentagemMedia, views) => ({ slug, videoId: slug, percentagemMedia, views });
  const r = avaliarRetencao([
    v('mau', 0.46, 50), v('bom', 0.92, 50), v('na-risca', 0.70, 50),
    v('poucas-views', 0.30, 3), v('sem-dados', null, 100),
  ]);
  ok('um vídeo com 46% e audiência entra no aviso', r.abaixo.some((x) => x.slug === 'mau'));
  ok('um com 92% não entra', r.acima.some((x) => x.slug === 'bom'));
  ok('exatamente 70% conta como bom (a régua é "abaixo de")', r.acima.some((x) => x.slug === 'na-risca'));
  /**
   * 🔴 A TRAVA QUE IMPEDE UM ALARME QUE DISPARA SEMPRE. Um vídeo com 3 visualizações e
   * 30% não diz nada — bastou uma pessoa fechar cedo. Sem isto, o aviso acendia em quase
   * todos os vídeos do canal e ninguém o leria ao fim de duas semanas.
   */
  ok('🔴 um vídeo com 3 visualizações NÃO é julgado', r.semAudiencia.some((x) => x.slug === 'poucas-views'));
  ok('e um sem número nenhum também não', r.semAudiencia.some((x) => x.slug === 'sem-dados'));
  ok('o pior aparece em primeiro lugar', r.abaixo[0]?.slug === 'mau');
  ok('a régua combinada com o dono são 70%', RETENCAO_MINIMA === 0.70);
  ok('uma lista vazia não rebenta', avaliarRetencao([]).abaixo.length === 0 && avaliarRetencao(null).abaixo.length === 0);
  /**
   * ⚠️ Em Shorts a percentagem **pode passar de 100%** — o vídeo repete em ciclo e quem
   * revê conta outra vez. É o melhor sinal que existe, e o aviso não o pode confundir
   * com um erro.
   */
  ok('passar dos 100% é BOM, não é erro', avaliarRetencao([v('viral', 1.3, 500)]).acima.length === 1);
}

console.log('\n5. AS PLAYLISTS — a prateleira certa, escolhida por tabela');

{
  const nomes = (texto) => prateleirasDoVideo(texto).map((p) => p.titulo);
  ok('um vídeo de dívida vai para "Sair das dívidas"',
    nomes('Dívida do cartão: como sair do vermelho')[0] === 'Sair das dívidas');
  ok('um de tesouro vai para "Investir do zero"',
    nomes('Tesouro Direto com R$ 100 vale a pena')[0] === 'Investir do zero');
  ok('um de orçamento vai para "Organizar o mês"',
    nomes('Como fazer o salário chegar ao fim do mês')[0] === 'Organizar o mês');
  ok('um de inflação vai para "Entender o dinheiro"',
    nomes('Inflação: 3 erros que te custam caro')[0] === 'Entender o dinheiro');
  /**
   * ⚠️ **TUDO ENTRA NA PRATELEIRA GERAL**, sem exceção — é ela que a tela final do vídeo
   * longo vai apontar, e uma prateleira com buracos manda o espectador para o vazio.
   */
  ok('e TODOS entram também na prateleira geral',
    ['dívida', 'tesouro', 'salário', 'inflação', 'um assunto que não casa com nada']
      .every((t) => nomes(t).includes(PLAYLIST_GERAL.titulo)));
  ok('um assunto que não casa com nenhuma vai SÓ para a geral',
    nomes('um assunto que não casa com nada').length === 1);
  ok('os acentos não estragam a escolha (divida = dívida)',
    nomes('divida do cartao')[0] === 'Sair das dívidas');
  /**
   * 🔴 A PROVA QUE APANHOU UM DEFEITO NO PRIMEIRO MINUTO: **"inflação" contém "ação"**, e
   * o vídeo sobre inflação ia parar à prateleira dos investimentos — sem nada a queixar-se.
   * Um termo só conta quando COMEÇA uma palavra.
   */
  ok('🔴 "inflação" não é confundido com "ações"',
    !nomes('Inflação: 3 erros que te custam caro').includes('Investir do zero'));
  ok('mas "ações" continua a ser apanhado',
    nomes('Ações: como transformar R$50 em R$75')[0] === 'Investir do zero');
  ok('e as raízes continuam a funcionar (investi → investimento)',
    nomes('O melhor investimento para começar')[0] === 'Investir do zero');
  ok('nunca há prateleiras repetidas',
    new Set(nomes('dívida do cartão')).size === nomes('dívida do cartão').length);
}

console.log('\n6. A OPORTUNIDADE DO DONO (ordem dele, 06/08)');

{
  const quando = '2026-08-06T12:00:00.000Z';
  const fila = { topics: [{ id: 'a', status: 'pending' }, { id: 'b', status: 'pending' }] };
  const r = inserirNoShort(fila, { tema: 'Pagar a fatura antes do fecho dá 30 dias sem juros', titulo: '', quando });
  ok('o tema entra à cabeça da fila', r.dados.topics[0].id === r.entrada.id);
  ok('e leva a marca de prioridade', r.entrada.prioridade === true);
  ok('a fila que já lá estava não se perde', r.dados.topics.length === 3);
  ok('o nome sai limpo, sem acentos nem espaços', /^dono-[a-z0-9-]+$/.test(r.entrada.id), r.entrada.id);
  ok('dois temas iguais não geram o mesmo nome',
    fazerSlugDoDono('mesmo tema', new Set(['dono-mesmo-tema'])) === 'dono-mesmo-tema-2');

  const l = inserirNoLongo({ videos: [{ slug: 'x' }] }, { tema: 'Como sair do cheque especial sem empréstimo', titulo: 'Cheque especial: como sair sem pedir empréstimo', quando });
  ok('no vídeo longo também entra à cabeça', l.dados.videos[0].slug === l.entrada.slug);
  ok('e o título do dono vai à letra', l.entrada.titulo === 'Cheque especial: como sair sem pedir empréstimo');

  /**
   * 🔴 **O TÍTULO DO VÍDEO LONGO É EXIGIDO, e recusar aqui vale uma semana.** O robô que
   * publica recusa-se a subir um vídeo longo sem título aprovado — *"um título mau é a
   * coisa mais cara que este canal pode pôr no ar"*. Sem esta trava, o tema entrava na
   * fila e a corrida de sábado de madrugada falhava, com o dono a dormir.
   */
  ok('🔴 um vídeo longo sem título é RECUSADO logo, e não de madrugada',
    conferirOportunidade({ formato: 'longo', tema: 'uma ideia qualquer aqui', titulo: '' }).some((q) => q.includes('título')));
  ok('mas um Short sem título passa (a IA escreve-o)',
    conferirOportunidade({ formato: 'short', tema: 'uma ideia qualquer aqui', titulo: '' }).length === 0);
  ok('um tema curto de mais é recusado',
    conferirOportunidade({ formato: 'short', tema: 'curto' }).length > 0);
  ok('um formato inventado é recusado',
    conferirOportunidade({ formato: 'tiktok', tema: 'uma ideia qualquer aqui' }).some((q) => q.includes('formato')));
  ok('um título de vídeo longo comprido de mais é recusado',
    conferirOportunidade({ formato: 'longo', tema: 'uma ideia qualquer aqui', titulo: 'x'.repeat(80) }).length > 0);

  /**
   * 🔴 A MARCA GANHA À PONTUAÇÃO. A tentação era somar 100 pontos ao tema do dono — mas
   * um bónus é uma aposta: basta a pontuação de outro subir e a escolha dele fica para
   * trás **sem ninguém dar por nada**. Havendo dois, ganha o mais antigo.
   */
  const escolha = proximoLongo({
    fila: { videos: [
      { slug: 'normal', estado: 'proposto' },
      { slug: 'dono-novo', estado: 'proposto', prioridade: true, criadoEm: '2026-08-06T12:00:00Z' },
      { slug: 'dono-antigo', estado: 'proposto', prioridade: true, criadoEm: '2026-08-05T12:00:00Z' },
    ] },
    caderno: {},
  });
  ok('🔴 o tema do dono fura a fila mesmo estando no fim do ficheiro', String(escolha.slug).startsWith('dono-'), escolha.slug);
  ok('e entre dois do dono ganha o mais antigo', escolha.slug === 'dono-antigo', escolha.slug);
  ok('um do dono JÁ PUBLICADO não fura fila nenhuma',
    proximoLongo({ fila: { videos: [{ slug: 'normal', estado: 'proposto' }, { slug: 'dono-feito', prioridade: true, estado: 'publicado' }] }, caderno: {} }).slug === 'normal');
  ok('sem nenhum do dono, a fila segue como sempre',
    proximoLongo({ fila: { videos: [{ slug: 'primeiro', estado: 'proposto' }, { slug: 'segundo', estado: 'proposto' }] }, caderno: {} }).slug === 'primeiro');
}

/**
 * ═══ A TRAVA DOS NÚMEROS DA NARRAÇÃO (07/08/2026) ═══
 *
 * 🔴 **POR QUE ESTA SECÇÃO EXISTE.** A trava de "conta de rendimento" corria todos os
 * dias sem uma única prova, e no dia 07/08 INVENTOU um número: leu *"em um, cinco e dez
 * anos"* como o valor **16** (somava a enumeração porque partia a frase por tudo o que
 * não fosse letra, e a vírgula desaparecia). Reprovou 2 das 4 tentativas por causa dele,
 * o Short do dia morreu e o canal ficou sem vídeo.
 *
 * ⚠️ Estas provas LANÇAM `validarNarrativa` — o MESMO caminho que o robô lança. É a
 * lição que este repositório já pagou duas vezes: prova que não corre o comando de
 * verdade não apanha o defeito de verdade.
 *
 * Filtra-se só o erro da conta: as narrativas de mesa aqui em baixo não tentam ser
 * roteiros válidos (não têm capa-pergunta, nem bordão, nem tamanho), e é de propósito —
 * o que se mede é a leitura dos números, não o resto.
 */
console.log('\n8. OS NÚMEROS DA NARRAÇÃO — o que a trava lê antes de reprovar');

{
  const errosDeConta = (frases, { tema = '', apoio = '', ficha = null } = {}) => {
    const blocos = Array.from({ length: 6 }, (_, i) => ({ papel: '', fala: frases[i] || 'enchimento.' }));
    const v = validarNarrativa({ blocos }, [], ficha, tema, null, apoio);
    return (v.erros || []).filter((e) => /conta de rendimento/.test(e));
  };

  // 🔴 O DEFEITO QUE MATOU O SHORT DE 07/08 — a enumeração somada.
  ok('🔴 "um, cinco e dez anos" NÃO vira o número 16',
    errosDeConta(['Poupança, Tesouro Direto e CDB seguem caminhos diferentes quando você olha um, cinco e dez anos.']).length === 0,
    errosDeConta(['Poupança, Tesouro Direto e CDB seguem caminhos diferentes quando você olha um, cinco e dez anos.'])[0]);

  // Um PRAZO não é dinheiro. A ficha andava a autorizar `meses/12` só para isto passar.
  ok('"em dez anos" é prazo, não é uma promessa de rendimento',
    errosDeConta(['O Tesouro rende mais em dez anos.']).length === 0);

  // 🔴 O NÚMERO DO PRÓPRIO TÍTULO. Outra trava OBRIGA o arranque a dizer o assunto —
  // se o assunto tem um valor, esta não pode castigar quem o diz.
  ok('🔴 o valor que está no TÍTULO pode ser dito na fala',
    errosDeConta(['Com três mil reais, você pode começar a investir.'], { tema: 'Ganho R$ 3 mil por mês — como investir?' }).length === 0,
    errosDeConta(['Com três mil reais, você pode começar a investir.'], { tema: 'Ganho R$ 3 mil por mês — como investir?' })[0]);

  // ⚠️ E A TRAVA CONTINUA A TRAVAR. Sem esta, os três consertos acima seriam um buraco.
  ok('mas um valor que NÃO está em fonte nenhuma continua a reprovar',
    errosDeConta(['Você investe e isso vira oitenta mil reais.'], { tema: 'Ganho R$ 3 mil por mês — como investir?' }).length === 1);

  // O numeral composto tem de continuar a ser lido INTEIRO (o defeito de 03/08).
  ok('"dois mil seiscentos e noventa e nove" continua a ser UM número, e bate com a ficha',
    errosDeConta(['Investir isso dá dois mil seiscentos e noventa e nove reais.'], { ficha: { permitidos: [2699] } }).length === 0);

  ok('e com ficha calculada, um valor fora dela continua a reprovar',
    errosDeConta(['Investir isso dá cinco mil reais.'], { ficha: { permitidos: [2699] } }).length === 1);
}

/**
 * ═══ A REPESCAGEM DO FIM DA TARDE (07/08/2026) ═══
 * Em 06/08 o vídeo estava pronto e guardado na fila, e mesmo assim o canal ficou dois
 * dias sem Short: o carteiro das 12h nunca recebeu máquina do GitHub. A segunda ronda
 * existe para isso — e a pergunta que ela faz tem de estar certa nos dois sentidos: se
 * hoje já saiu, ela NÃO pode publicar de novo.
 */
console.log('\n9. A REPESCAGEM — a segunda ronda do carteiro');

{
  const tracking = {
    'a': { uploadedAt: '2026-08-05T16:25:56.346Z' },
    'b': { uploadedAt: '2026-08-07T15:02:11.000Z' },
  };
  ok('vê que hoje JÁ saiu vídeo — e a repescagem fica quieta',
    jaSaiuVideoNoDia('2026-08-07', tracking) === true);
  ok('🔴 vê o dia em que NÃO saiu nada — e a repescagem entrega',
    jaSaiuVideoNoDia('2026-08-06', tracking) === false);
  ok('tracking vazio conta como "não saiu"', jaSaiuVideoNoDia('2026-08-07', {}) === false);
  ok('e um registo sem data não engana a conta',
    jaSaiuVideoNoDia('2026-08-07', { c: { videoId: 'x' } }) === false);
}

console.log(`\n${'═'.repeat(72)}`);
console.log(`  ${passou} provas verdes · ${falhou} vermelhas`);
if (falhou) {
  console.log('\n  ❌ AS QUE FALHARAM:');
  falhas.forEach((f) => console.log(`     · ${f}`));
}
console.log(`${'═'.repeat(72)}\n`);
process.exit(falhou ? 1 : 0);
