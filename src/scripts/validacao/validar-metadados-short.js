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
  estreiaMarcada, agendadosPorConferir,
} from '../youtube/upload-short.js';
import { avaliarRetencao, RETENCAO_MINIMA } from '../youtube/retencao.js';
/**
 * ⚠️ **IMPORTAR A COREOGRAFIA NÃO CHAMA IA NENHUMA.** Ela só corre quando é chamada
 * pelo nome (o `executadoDireto` no fim do ficheiro) — a mesma guarda do `capa-manus.js`,
 * e pela mesma razão: um `import` de teste não pode gastar dinheiro.
 */
import { esticarTelaDoApp, montarRoteiro, palavrasAncoraveis } from '../youtube/coreografia.js';
import { validateShortScript } from '../youtube/lib/schema-short.js';
import { prateleirasDoVideo, PLAYLIST_GERAL } from '../youtube/lib/playlists.js';
import { inserirNoShort, inserirNoLongo, conferirOportunidade, fazerSlugDoDono } from '../../../functions/api/_oportunidade-fila.js';
import { proximoLongo } from '../youtube/pick-next-longo.js';
import { validarNarrativa, buildPromptNarrativa } from '../youtube/roteiro-narrativa.js';
import { jaSaiuVideoNoDia, produziuNoDia } from '../youtube/outbox.js';
import { readFileSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

/** A raiz do projeto — para as provas que leem o workflow a sério. */
const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

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

  /**
   * 🔴 **A CONTA QUE VALE É A DO YOUTUBE, NÃO A NOSSA** (07/08/2026).
   *
   * ⚠️ O `chars` aqui em cima é `join(',').length` — e foi ele que deixou passar o
   * defeito que impediu a publicação de 06 e 07/08. O YouTube envolve em **aspas**
   * qualquer etiqueta com espaço, e essas aspas contam para os 500. Neste canal é
   * quase toda: as chaves são expressões e as variações têm espaço por construção.
   *
   * MEDIDO: as mesmas 23 etiquetas davam **478** pela conta antiga (verde em todas as
   * provas) e **524** pela conta do YouTube — `400 invalidTags`, Short não publicado.
   *
   * Esta prova mede como a API mede. Não confiar na nossa aritmética é o ponto dela.
   */
  const custoNoYouTube = (lista) => lista.reduce((a, t) => a + t.length + (t.includes(' ') ? 2 : 0) + 1, 0);
  ok('🔴 pela conta do YOUTUBE (aspas nas etiquetas com espaço) cabe nos 500',
    custoNoYouTube(e) <= 500, `${custoNoYouTube(e)} — o limite da API é 500`);

  // O pior caso real: doze expressões, TODAS com espaço. Foi este o vídeo recusado.
  const piorCaso = escolherEtiquetas([
    'saldo devedor', 'cartao de credito', 'divida do cartao', 'juros do rotativo',
    'fatura do cartao', 'pagar o minimo', 'parcelar a fatura', 'saque no cartao',
    'financas pessoais', 'educacao financeira', 'sair das dividas', 'organizar as contas',
  ]);
  ok('🔴 e cabe TAMBÉM quando todas as etiquetas têm espaço (o caso que foi recusado)',
    custoNoYouTube(piorCaso) <= 500, `${custoNoYouTube(piorCaso)}`);
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

/**
 * ═══ A CHAMADA DA FALA — a que passou a servir OITO redes (07/08/2026) ═══
 *
 * 🔴 **O QUE MUDOU E PORQUÊ.** Até aqui a fala pedia *"comenta FINMOOVI"*, e isso era
 * verdade em dois sítios: no Instagram (a automação manda mensagem privada) e no YouTube
 * (`src/scripts/youtube/comentarios.js` responde no próprio comentário, de hora a hora,
 * porque no YouTube não existe mensagem privada). A partir de hoje o MESMO ficheiro sai
 * também em TikTok, Facebook, LinkedIn, Threads, Telegram, Pinterest e Bluesky — **sete
 * sítios onde ninguém responde.** Quem comentasse não recebia nada.
 *
 * ✅ A decisão do dono (IMPL26 §12-A): a FALA fica neutra — *"quer ver o seu? procura
 * FinMoovi, é de graça"* — e o "comenta FINMOOVI" passa a viver só na LEGENDA do
 * Instagram e do YouTube. Funciona porque as duas automações disparam pelo COMENTÁRIO,
 * não pelo áudio: elas nem sabem o que o vídeo disse.
 *
 * ⚠️ **E porquê "procura o nome" e não "o link tá aqui embaixo":** no Instagram e no
 * TikTok o endereço escrito na legenda **não é clicável**. Mandar procurar é a única
 * frase que continua verdadeira nas nove.
 */
console.log('\n10. A CHAMADA DA FALA — uma só, verdadeira nas oito redes');

{
  // Só os erros DESTA regra: as narrativas de mesa aqui em baixo não tentam ser roteiros
  // válidos (não têm capa-pergunta, nem bordão, nem tamanho) — é de propósito.
  const AGULHA = /manda clicar em link|não diz o nome FinMoovi|sai em oito redes/;
  const errosDaChamada = (convite, resto = {}) => {
    const blocos = Array.from({ length: 6 }, (_, i) => ({ papel: '', fala: resto[i] || 'enchimento.' }));
    blocos[4].fala = convite;
    return (validarNarrativa({ blocos }).erros || []).filter((e) => AGULHA.test(e));
  };

  /**
   * 🔑 A PROVA QUE CRUZA O PROMPT COM A TRAVA — a mesma que o vídeo longo já tinha.
   * O molde sai do PRÓPRIO prompt, não de uma cópia escrita aqui: é a única forma de os
   * dois nunca divergirem. Se alguém mudar o molde lá e esquecer a trava (ou o contrário),
   * esta prova fica vermelha. É o defeito nº 1 deste repositório, medido 16 vezes.
   */
  const prompt = buildPromptNarrativa({ term: 'tema de prova', angle: '', definition: '', body: '' }, [], []);
  const molde = (prompt.match(/✓ "(Quer ver o seu\?[^"]*)"/) || [])[1] || '';
  ok('🔑 o molde da chamada existe no prompt', Boolean(molde), `veio: "${molde}"`);
  ok('🔑 e o molde que o prompt manda usar PASSA na trava',
    Boolean(molde) && errosDaChamada(molde).length === 0,
    errosDaChamada(molde)[0]);

  // 🔴 O QUE DEIXOU DE PODER — a promessa que sete redes não cumpririam.
  ok('🔴 "Comenta FINMOOVI aqui embaixo" reprova',
    errosDaChamada('Comenta FINMOOVI aqui embaixo que eu te mando o app.').length === 1);
  // 🔴 E a frase que parece a solução óbvia, mas é falsa no Instagram e no TikTok.
  ok('🔴 "o link tá aqui embaixo" reprova',
    errosDaChamada('Quer ver o seu? O link tá aqui embaixo, é de graça.').length === 1);

  // O nome continua obrigatório: é ele que a pessoa vai digitar.
  ok('um convite que não diz o nome do app reprova',
    errosDaChamada('Quer ver o seu? Procura ali e vê, é de graça.').length === 1);

  /**
   * ⚠️ A REGRA VALE PARA O VÍDEO INTEIRO, não só para o bloco do convite. Um "comenta aí"
   * solto no meio da história quebra a mesma promessa nas mesmas sete redes.
   */
  ok('pedir comentário em QUALQUER bloco reprova, não só no convite',
    errosDaChamada('Quer ver o seu? Procura FinMoovi. É de graça.', { 2: 'Comenta aqui o seu número.' }).length === 1);

  /**
   * 🔴 UMA PALAVRA, UM ERRO. O fecho já tinha uma trava que barrava "comentário"; com a
   * nova, a mesma palavra acendia DOIS erros com explicações diferentes — e é assim que
   * nasce o pêndulo (o modelo conserta uma queixa e parte a outra). Por isso "coment*"
   * saiu da lista do fecho.
   */
  const noFecho = validarNarrativa({
    blocos: Array.from({ length: 6 }, (_, i) => ({
      papel: '', fala: i === 5 ? 'E é isso que muda o seu comentário.' : 'enchimento.',
    })),
  }).erros.filter((e) => /coment|sai em oito redes|fala de "/.test(e));
  ok('🔴 "comentário" no fecho acende UM erro, não dois', noFecho.length === 1, noFecho.join(' | '));

  /**
   * E o alinhamento: uma trava que o prompt não ensina é uma armadilha. Se alguém
   * acrescentar a regra sem a escrever no prompt, isto fica vermelho.
   */
  ok('a regra está ENSINADA no prompt: não pedir comentário',
    /NÃO PEÇA COMENTÁRIO/.test(prompt));
  ok('a regra está ENSINADA no prompt: mandar procurar o nome',
    /PROCURAR o app pelo nome/.test(prompt));
  ok('e o prompt explica PORQUÊ (as oito redes)',
    /OITO redes/.test(prompt));
}

// ═══ 🔴 O TEMPO DE TELA DO APP CONSERTA-SE, EM VEZ DE MATAR O DIA — 12/08/2026 ═══
/**
 * ⚠️ **O DIA QUE ISTO CUSTOU.** Corrida 31576147535: quatro tentativas em TRÊS temas,
 * doze ao todo, todas mortas no mesmo muro — *"app «calculadora» segura só ~2,3s de
 * tela (mínimo 2,5s)"*. Dois décimos de segundo, e o canal sem Short novo.
 *
 * ⚠️ **ESTAS PROVAS SÃO DE COMPORTAMENTO.** Constroem um plano com o defeito, chamam o
 * conserto e voltam a medir com o **validador de produção**. Uma prova que procurasse a
 * palavra "esticar" no ficheiro ficaria verde com o conserto a não fazer nada.
 */
console.log('\n⏱️  O TEMPO DE TELA DO APP — conserta-se em vez de reprovar\n');
{
  const NARRATIVA = {
    fioCondutor: 'ralo',
    blocos: [
      { papel: 'gancho', fala: 'Você paga o mínimo da fatura todo mês e acha que está resolvendo alguma coisa?' },
      { papel: 'empatia', fala: 'Ela pagava certinho todo mês e mesmo assim a conta nunca diminuía de verdade.' },
      { papel: 'virada', fala: 'Quando ela somou tudo, descobriu que estava pagando quase o dobro sem perceber.' },
      { papel: 'demonstracao', fala: 'Joguei esses pagamentos dentro do FinMoovi e ele mostrou na hora quanto sobrava mesmo.' },
      { papel: 'convite', fala: 'Quer fazer essa conta com a sua dívida? Procura o app FinMoovi. É de graça.' },
      { papel: 'fecho', fala: 'Pagando um pouco a mais por mês, o peso diminui rápido. Dinheiro sem controle é dinheiro dos outros.' },
    ],
  };
  const T = { slug: 'prova-tempo-de-tela', term: 'pagar o mínimo da fatura', category: 'basico' };
  const shot = (n, visual, sfx) => (sfx ? { ancoraIndice: n, visual, sfx } : { ancoraIndice: n, visual });
  /**
   * O bloco da demonstração com a tela do app **espremida**: ela entra na palavra 1 e o
   * shot seguinte entra logo na 2 — exactamente a forma do defeito de hoje.
   */
  const planoDoente = () => ({
    introFrase: 'Você paga o mínimo?',
    ctaTexto: 'Procura o FinMoovi',
    blocos: [
      { shots: [shot(1, { type: 'text', text: 'paga o mínimo?' }), shot(5, { type: 'icon', icon: 'question' })] },
      { shots: [shot(1, { type: 'text', text: 'todo mês' }), shot(6, { type: 'metaphor', metaphor: 'ralo' })] },
      { shots: [shot(1, { type: 'text', text: 'o dobro' }), shot(6, { type: 'icon', icon: 'warning' })] },
      { shots: [shot(1, { type: 'app', app: 'calculadora' }), shot(2, { type: 'text', text: 'na hora' })] },
      { shots: [shot(1, { type: 'text', text: 'é de graça' }), shot(6, { type: 'icon', icon: 'question' })] },
      { shots: [shot(1, { type: 'text', text: 'diminui rápido' }), shot(6, { type: 'icon', icon: 'warning' })] },
    ],
  });

  const doente = planoDoente();
  const antes = validateShortScript(montarRoteiro(T, NARRATIVA, doente));
  const erroDoApp = (v) => (v.errors || []).filter((e) => /segura só ~/.test(e));
  ok('🔴 o plano doente reproduz o defeito de 12/08 (a tela do app espremida)',
    erroDoApp(antes).length === 1, erroDoApp(antes).join(' | ') || 'não reproduziu');

  const { plano: curado, consertos } = esticarTelaDoApp(T, NARRATIVA, planoDoente(), validateShortScript);
  const depoisRoteiro = montarRoteiro(T, NARRATIVA, curado);
  const depois = validateShortScript(depoisRoteiro);
  ok('✅ e o conserto tira-o, sem precisar de outra tentativa de IA',
    erroDoApp(depois).length === 0, erroDoApp(depois).join(' | '));
  ok('e diz o que fez', consertos.length >= 1, consertos.join(' · '));
  ok('🔴 o total de erros DESCE (não se troca um defeito por outro)',
    (depois.errors || []).length < (antes.errors || []).length,
    `${(antes.errors || []).length} → ${(depois.errors || []).length}`);

  /**
   * 🔴 **A PROVA QUE GUARDA A FRONTEIRA:** o conserto mexe no NÚMERO da âncora e em
   * mais nada. Se um dia alguém o puser a reescrever narração, imagem ou som para
   * fazer a conta bater, isto acende.
   */
  const antesRoteiro = montarRoteiro(T, NARRATIVA, planoDoente());
  ok('🔴 a NARRAÇÃO não muda uma letra',
    JSON.stringify(depoisRoteiro.scenes.map((s) => s.narration)) === JSON.stringify(antesRoteiro.scenes.map((s) => s.narration)));
  ok('🔴 as IMAGENS e os SONS não mudam',
    JSON.stringify(depoisRoteiro.scenes.map((s) => s.shots.map((x) => [x.visual, x.sfx])))
      === JSON.stringify(antesRoteiro.scenes.map((s) => s.shots.map((x) => [x.visual, x.sfx]))));
  ok('e o número de shots é o mesmo (nenhum foi deitado fora)',
    JSON.stringify(depoisRoteiro.scenes.map((s) => s.shots.length))
      === JSON.stringify(antesRoteiro.scenes.map((s) => s.shots.length)));

  /**
   * 🔴 **O MOVIMENTO TEM DE SER O MENOR QUE RESOLVE — e é isto que protege o vídeo.**
   *
   * Empurrar o shot seguinte para o fim da fala dava tela ao app **e deixava o shot
   * seguinte a piscar**: nenhuma regra pune um shot de texto curto, portanto o total de
   * erros não subia e o conserto passaria por bom. O que impede isso é os candidatos
   * serem tentados **por ordem, do menor para o maior**, ficando com o primeiro que
   * resolve. Sem esta prova, essa ordem é uma intenção — com ela, é uma regra.
   */
  {
    const { plano: curado } = esticarTelaDoApp(T, NARRATIVA, planoDoente(), validateShortScript);
    const parou = Number(curado.blocos[3].shots[1].ancoraIndice);
    /**
     * ⚠️ **A MINHA 1ª VERSÃO DESTA PROVA ESTAVA ERRADA** — media se "vindo de mais perto
     * mexe menos", e o destino é ABSOLUTO: a palavra onde os 2,5s se cumprem é a mesma,
     * venha-se de onde se vier. A propriedade certa é esta: **um passo antes ainda não
     * resolvia.** É a terceira vez hoje que uma prova minha reprova código bom.
     */
    const umPassoAntes = planoDoente();
    umPassoAntes.blocos[3].shots[1].ancoraIndice = parou - 1;
    const aindaFalha = validateShortScript(montarRoteiro(T, NARRATIVA, umPassoAntes))
      .errors.some((e) => /segura só ~/.test(e));
    ok('🔴 e parou no MENOR movimento que resolve (um passo antes ainda falhava)',
      aindaFalha, `parou em ${parou}; em ${parou - 1} ${aindaFalha ? 'ainda falhava' : 'JÁ CHEGAVA — mexeu de mais'}`);
    ok('e nunca atira o shot seguinte para o fim da fala (ele ficaria a piscar)',
      parou < palavrasAncoraveis(NARRATIVA.blocos[3].fala).length,
      `${parou} de ${palavrasAncoraveis(NARRATIVA.blocos[3].fala).length} palavras`);
  }

  /**
   * ⚠️ **E NUM PLANO SÃO NÃO MEXE NADA.** Um conserto que "arruma" o que já estava bom
   * é a maneira mais rápida de estragar um vídeo aprovado.
   */
  const sao = planoDoente();
  sao.blocos[3].shots[1].ancoraIndice = 8;
  const saoAntes = JSON.stringify(sao);
  const { consertos: nenhum } = esticarTelaDoApp(T, NARRATIVA, sao, validateShortScript);
  ok('⚠️ num plano sem o defeito, não toca em nada',
    nenhum.length === 0 && JSON.stringify(sao) === saoAntes, nenhum.join(' · '));
}

// ═══ 🛟 O GUARDIÃO DA PRODUÇÃO — 12/08/2026 ═══════════════════════════════════
/**
 * ⚠️ **A REPESCAGEM QUE JÁ EXISTIA É DA ENTREGA, NÃO DA PRODUÇÃO.** Em 12/08 a fábrica
 * não produziu nada e a repescagem das 17h não tinha o que entregar. Estas provas
 * guardam a segunda ronda de PRODUÇÃO, e sobretudo o alinhamento entre o horário dela
 * e a guarda que a trava — o defeito que já mordeu no Short de 16s: *um formato novo
 * desligava a rede de segurança do outro, em silêncio.*
 */
console.log('\n🛟 O GUARDIÃO DA PRODUÇÃO — a segunda ronda, e o que a impede de duplicar\n');
{
  const wf = readFileSync(join(RAIZ, '.github', 'workflows', 'youtube-short-render.yml'), 'utf-8');
  const crons = [...wf.matchAll(/^\s*-\s*cron:\s*'([^']+)'/gm)].map((m) => m[1]);
  ok('🔴 a produção passa a ter DUAS rondas por dia', crons.length === 2, crons.join(' · '));

  const CRON_GUARDIAO = crons[1];
  /**
   * 🔴 **A PROVA QUE VALE MAIS DESTE BLOCO.** A guarda compara `github.event.schedule`
   * com a hora do cron ESCRITA À MÃO. Se alguém mudar o horário e esquecer a guarda,
   * ela deixa de reconhecer a ronda: a repescagem passa a produzir TODOS OS DIAS, um
   * segundo vídeo por cima do primeiro, sem erro nenhum. Aqui as duas são comparadas.
   */
  ok('🔴 e a guarda conhece a hora exacta da segunda (mudar o cron sem mudar a guarda acende isto)',
    wf.includes(`"\${{ github.event.schedule }}" = "${CRON_GUARDIAO}"`), CRON_GUARDIAO);

  ok('a segunda ronda PERGUNTA se a fábrica já produziu hoje',
    /outbox\.js produzido-hoje/.test(wf));
  ok('e quando a resposta é "sim", acaba ali (sem gastar IA)',
    /produzido-hoje\)" = "sim" \]; then[\s\S]{0,220}skip=true/.test(wf));
  /**
   * ⚠️ **A ORDEM IMPORTA:** a pergunta tem de vir ANTES de escolher o tema. Depois de
   * `pick-next-short` a fila já se mexeu — e um dia normal gastaria um tema à toa.
   */
  ok('🔴 e pergunta ANTES de escolher o tema (senão a fila mexe-se num dia normal)',
    wf.indexOf('produzido-hoje') < wf.indexOf('pick-next-short.js'));

  // ── e a pergunta responde certo (comportamento, não texto) ──
  const HOJE = '2026-08-12';
  ok('sem nada produzido hoje, responde que não',
    produziuNoDia(HOJE, [{ fileSlug: 'a', producedAt: '2026-08-11T07:53:35.075Z' }]) === false);
  ok('com um vídeo feito hoje, responde que sim',
    produziuNoDia(HOJE, [{ fileSlug: 'a', producedAt: '2026-08-12T06:40:00.000Z' }]) === true);
  ok('⚠️ e com a fila VAZIA responde que não (é o caso do dia que falhou)',
    produziuNoDia(HOJE, []) === false);
  /**
   * ⚠️ **O CASO QUE ENGANA:** a fila tem um vídeo — mas é o de ONTEM, que sobrou. O dia
   * está coberto para a entrega e a fábrica continua parada. Foi exactamente isto que
   * aconteceu em 12/08, e é por isto que esta pergunta olha o `producedAt` e não "a
   * fila tem alguma coisa".
   */
  ok('🔴 um vídeo de ONTEM na fila NÃO conta como produção de hoje',
    produziuNoDia(HOJE, [{ fileSlug: 'viral-jc7rFQLtrJg', producedAt: '2026-08-11T07:53:35.075Z' }]) === false);
}

// ═══ 📅 PRIVADO, COM A HORA MARCADA — 12/08/2026 ══════════════════════════════
/**
 * Ordem do dono: *"quero que ele entre como privado e agendado nos horários corretos…
 * mas não podemos correr o risco de ficar vídeo sem ser postado"*.
 *
 * ⚠️ **AS DUAS METADES DESTAS PROVAS SÃO DIFERENTES.** Uma guarda que o agendamento
 * ACONTECE; a outra guarda que ele **desiste a tempo** — porque o cron do GitHub atrasa,
 * e uma hora marcada que já passou deixaria o vídeo privado para sempre.
 */
console.log('\n📅 O ENVIO PRIVADO COM HORA MARCADA — e a trava que nunca deixa um vídeo por publicar\n');
{
  const AGORA = new Date('2026-08-12T12:00:00.000Z');

  const daqui3h = estreiaMarcada('15:00', AGORA);
  ok('🔴 com três horas pela frente, marca a estreia',
    daqui3h.estreia instanceof Date && daqui3h.estreia.toISOString() === '2026-08-12T15:00:00.000Z',
    daqui3h.porque);
  ok('e diz quantos minutos de antecedência ficaram', /180 min de antecedência/.test(daqui3h.porque), daqui3h.porque);

  /**
   * 🔴 **A TRAVA QUE VALE O VÍDEO DO DIA.** O cron do GitHub já atrasou 112 minutos nesta
   * casa. Se a ronda das 12:00 só arrancar depois das 15:00, a hora marcada JÁ PASSOU —
   * e o YouTube recusa um `publishAt` no passado. Sem isto, o vídeo ficava privado para
   * sempre com a corrida a VERDE.
   */
  const jaPassou = estreiaMarcada('15:00', new Date('2026-08-12T15:20:00.000Z'));
  ok('🔴 se a hora JÁ PASSOU, sobe público na hora (nunca fica por publicar)',
    jaPassou.estreia === null && /JÁ PASSOU/.test(jaPassou.porque), jaPassou.porque);
  const emCima = estreiaMarcada('15:00', new Date('2026-08-12T14:55:00.000Z'));
  ok('e se faltam 5 minutos também (agendar aí não dá aviso nenhum ao YouTube)',
    emCima.estreia === null, emCima.porque);
  /**
   * ⚠️ **MAS 40 MINUTOS AINDA SE AGENDA.** Quarenta minutos de aviso ao YouTube é melhor
   * do que nenhum — só se desiste quando a hora está mesmo em cima. Uma trava que
   * desistisse cedo de mais deitava fora o que o dono pediu.
   */
  const apertado = estreiaMarcada('15:00', new Date('2026-08-12T14:20:00.000Z'));
  ok('⚠️ mas com 40 minutos ainda agenda (desistir cedo demais deitava fora o pedido)',
    apertado.estreia instanceof Date, apertado.porque);
  ok('sem hora nenhuma, é o comportamento de sempre: público já',
    estreiaMarcada('', AGORA).estreia === null && estreiaMarcada(undefined, AGORA).estreia === null);

  // ── o que se manda ao YouTube ──
  const scriptFalso = { slug: 's', term: 'juros compostos', keyword: 'juros compostos', category: 'basico', scenes: [], cta: {} };
  const cruo = deterministicMeta(scriptFalso);
  const agendado = buildMetadata(cruo, scriptFalso, new Date('2026-08-12T15:00:00.000Z'));
  ok('🔴 agendado vai `private` COM `publishAt` (as duas andam juntas)',
    agendado.status.privacyStatus === 'private' && agendado.status.publishAt === '2026-08-12T15:00:00.000Z',
    JSON.stringify(agendado.status));
  const publico = buildMetadata(cruo, scriptFalso);
  ok('⚠️ e sem hora marcada NADA muda — sobe público, como desde 03/08',
    publico.status.privacyStatus === 'public' && !('publishAt' in publico.status),
    JSON.stringify(publico.status));

  // ── o guardião do agendado ──
  const HOJE = new Date('2026-08-12T20:00:00.000Z');
  const caderno = {
    'ja-passou': { videoId: 'aaa', publishAt: '2026-08-12T15:00:00.000Z' },
    'ainda-vem': { videoId: 'bbb', publishAt: '2026-08-12T21:40:00.000Z' },
    'publico-de-sempre': { videoId: 'ccc', uploadedAt: '2026-08-11T15:00:00.000Z' },
    'velho-de-mais': { videoId: 'ddd', publishAt: '2026-08-01T15:00:00.000Z' },
  };
  const porConferir = agendadosPorConferir(caderno, HOJE).map((p) => p.slug);
  ok('🔴 o guardião pergunta pelos que já deviam estar no ar',
    porConferir.includes('ja-passou'), porConferir.join(' · '));
  ok('e não pelos que ainda não chegou a hora', !porConferir.includes('ainda-vem'));
  ok('🔴 nem toca nos que subiram públicos (esses nunca tiveram hora marcada)',
    !porConferir.includes('publico-de-sempre'));
  ok('⚠️ nem em vídeos antigos (um privado à mão pelo dono não é para mexer)',
    !porConferir.includes('velho-de-mais'), porConferir.join(' · '));
}

// ═══ 🔴 OS HORÁRIOS TÊM DE ANDAR TODOS JUNTOS ════════════════════════════════
/**
 * **É a armadilha desta casa, e já mordeu hoje de manhã no guardião da produção.** Três
 * coisas separadas guardam a mesma hora: o `cron`, o `case` que reconhece o turno, e a
 * hora que vai marcada no upload. Mudar uma sem as outras não dá erro nenhum — dá um
 * turno inválido, ou um vídeo agendado para a hora errada.
 */
console.log('\n🕐 OS HORÁRIOS — o cron, o turno e a estreia têm de bater\n');
{
  const wf16 = readFileSync(join(RAIZ, '.github', 'workflows', 'youtube-short16-publish.yml'), 'utf-8');
  const crons16 = [...wf16.matchAll(/^\s*-\s*cron:\s*'([^']+)'/gm)].map((m) => m[1]);
  ok('o de 16s continua com duas entregas por dia', crons16.length === 2, crons16.join(' · '));
  for (const c of crons16) {
    ok(`  🔴 o \`case\` do turno conhece o cron "${c}"`, wf16.includes(`"${c}")`));
  }
  /** A estreia de cada turno tem de ser exactamente TRÊS horas depois do envio. */
  const horaDoCron = (c) => { const [m, h] = c.split(' '); return Number(h) * 60 + Number(m); };
  const estreias = [...wf16.matchAll(/(manha|noite%?)\)\s*ESTREIA=(\d{1,2}):(\d{2})/g)]
    .map((m) => Number(m[2]) * 60 + Number(m[3]));
  ok('🔴 e cada estreia é 3 horas depois do seu envio',
    estreias.length === 2
    && estreias[0] - horaDoCron(crons16[0]) === 180
    && estreias[1] - horaDoCron(crons16[1]) === 180,
    `envios ${crons16.map(horaDoCron).join('/')} · estreias ${estreias.join('/')} (minutos)`);

  const wf50 = readFileSync(join(RAIZ, '.github', 'workflows', 'youtube-short-publish.yml'), 'utf-8');
  const crons50 = [...wf50.matchAll(/^\s*-\s*cron:\s*'([^']+)'/gm)].map((m) => m[1]);
  ok('o de 50s continua com envio + repescagem', crons50.length === 2, crons50.join(' · '));
  ok('🔴 o envio das 12:00 leva a estreia das 15:00 (três horas)',
    /"\$\{\{ github\.event\.schedule \}\}" = "0 12 \* \* \*" \]; then ESTREIA="--estreia=15:00"/.test(wf50));
  /**
   * 🔴 **A REPESCAGEM NÃO PODE LEVAR HORA MARCADA.** Ela só corre quando a entrega
   * falhou; ali o que está em causa é o vídeo existir hoje, não a antecedência. Dar-lhe
   * estreia empurrava o vídeo do dia para ainda mais tarde.
   */
  ok('🔴 e a repescagem NÃO leva estreia nenhuma (a rede de segurança não tem condições)',
    !new RegExp(`= "${crons50[1].replace(/\*/g, '\\*')}" \\]; then ESTREIA=`).test(wf50), crons50[1]);

  // ── o guardião do agendado está nos dois, e antes do npm ci ──
  /**
   * ⚠️ **A MINHA 1ª VERSÃO DESTA PROVA MEDIA O MEU PRÓPRIO COMENTÁRIO.** Ela procurava
   * `npm ci` no ficheiro — e o comentário que explica *"corre ANTES do npm ci"* aparece
   * antes do passo. Ficou vermelha com o workflow certo. Agora compara os PASSOS: o nome
   * de um contra o `run:` do outro.
   */
  for (const [nome, wf] of [['16s', wf16], ['50s', wf50]]) {
    ok(`  o guardião do agendado corre no ${nome}`, /--conferir-agendados/.test(wf));
    ok(`  e o passo dele vem ANTES do passo que instala (corre nos dias sem entrega)`,
      wf.indexOf('- name: O guardião do agendado') < wf.indexOf('run: npm ci'),
      `guardião em ${wf.indexOf('- name: O guardião do agendado')}, npm ci em ${wf.indexOf('run: npm ci')}`);
  }
}

console.log(`\n${'═'.repeat(72)}`);
console.log(`  ${passou} provas verdes · ${falhou} vermelhas`);
if (falhou) {
  console.log('\n  ❌ AS QUE FALHARAM:');
  falhas.forEach((f) => console.log(`     · ${f}`));
}
console.log(`${'═'.repeat(72)}\n`);
process.exit(falhou ? 1 : 0);
