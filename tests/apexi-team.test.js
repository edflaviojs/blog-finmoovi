/**
 * A porta dos robôs do Apexi Team (06/11/2026). Tudo sem internet: um Team de mentira
 * (`fetchFn`) responde no lugar do verdadeiro.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mandarTarefa, perguntarTarefa, paraChave } from '../src/scripts/lib/apexi-team.js';
import { chaveDoLembrete, tarefaDoLembrete, lembretesNoTeam } from '../src/scripts/lib/lembretes-team.js';
import { montarTarefaDosPosts, semanaIso } from '../src/scripts/youtube/posts-semana.js';

const CHAVE = 'apx_' + 'a'.repeat(48);

/** Um Team de mentira: guarda os pedidos e responde o que a tabela mandar. */
function teamFalso(respostas) {
  const pedidos = [];
  const fetchFn = async (url, opcoes = {}) => {
    pedidos.push({ url, metodo: opcoes.method || 'GET', corpo: opcoes.body ? JSON.parse(opcoes.body) : null, cab: opcoes.headers });
    const r = respostas(url, opcoes.method || 'GET');
    return { status: r.status, text: async () => JSON.stringify(r.corpo || {}) };
  };
  return { fetchFn, pedidos };
}

const POSTS = [
  { dia: 'segunda', texto: 'Post de segunda', cena: 'O boneco-palito abre a carteira vazia na cozinha, com cara de susto.' },
  { dia: 'terça', texto: 'Qual conta pesa mais?', opcoes: ['Luz', 'Mercado', 'Aluguel'] },
  { dia: 'quarta', texto: 'Post de quarta', cena: 'O boneco-palito segura um boleto na mão, sentado no sofá, preocupado.' },
  { dia: 'quinta', texto: 'Post de quinta', cena: 'O boneco-palito fecha o chuveiro mais cedo e sorri aliviado.' },
  { dia: 'sexta', texto: 'Onde vai o dinheiro do fim de semana?', opcoes: ['Lazer', 'Mercado'] },
  { dia: 'sábado', texto: 'Post de sábado', cena: 'O boneco-palito olha pela janela à espera de domingo, curioso.' },
];
const ANTERIOR = { titulo: 'Vídeo de domingo', videoId: 'abc123' };
const PROXIMO = { titulo: 'Vídeo seguinte', videoId: 'xyz' };
const SEGUNDA = new Date(2026, 10, 9); // segunda 09/11/2026

test('semana ISO: 09/11/2026 é a semana 46; 04/01/2027 é a semana 1 de 2027', () => {
  assert.deepEqual(semanaIso(new Date(2026, 10, 9)), { ano: 2026, semana: 46 });
  assert.deepEqual(semanaIso(new Date(2027, 0, 4)), { ano: 2027, semana: 1 });
  assert.deepEqual(semanaIso(new Date(2026, 11, 28)), { ano: 2026, semana: 53 });
});

test('a tarefa dos posts: chave, tipo, prazo segunda 12h de Brasília e 10 passos', () => {
  const t = montarTarefaDosPosts(POSTS, ANTERIOR, PROXIMO, SEGUNDA);
  assert.equal(t.chave_unica, 'finmoovi-posts-2026-w46');
  assert.equal(t.tipo, 'posts-da-semana');
  assert.equal(t.prazo, '2026-11-09T12:00:00-03:00');
  // 6 posts + 4 imagens (as 2 enquetes não levam imagem)
  assert.deepEqual(t.passos.map((p) => p.codigo), ['SEG', 'SEG-IMG', 'TER', 'QUA', 'QUA-IMG', 'QUI', 'QUI-IMG', 'SEX', 'SAB', 'SAB-IMG']);
});

test('cada passo tem o que se copia: post com link do vídeo, enquete com opções, prompt da imagem', () => {
  const t = montarTarefaDosPosts(POSTS, ANTERIOR, PROXIMO, SEGUNDA);
  const p = Object.fromEntries(t.passos.map((x) => [x.codigo, x]));
  assert.match(p.SEG.copiar, /^Post de segunda\n\n▶️ https:\/\/youtu\.be\/abc123$/);
  assert.match(p.SEG.texto, /Segunda 09\/11, agendar para as 12h/);
  assert.equal(p.TER.copiar, 'Qual conta pesa mais?\n\n1. Luz\n2. Mercado\n3. Aluguel');
  assert.match(p['SEG-IMG'].copiar, /carteira vazia/);
  assert.match(p['SEG-IMG'].copiar, /NÃO tem nenhuma letra/);
  assert.equal(p['SAB-IMG'].ficheiro, 'post-2026-11-14-sab.png');
  assert.ok(p.QUA.links.some((l) => l.url === 'https://blog.finmoovi.com/posts-youtube/'));
});

test('mandarTarefa: manda a chave só no cabeçalho e lê criada/url', async () => {
  const { fetchFn, pedidos } = teamFalso(() => ({ status: 200, corpo: { tarefa: 't1', criada: true, url: 'https://app/x' } }));
  const r = await mandarTarefa({ chave_unica: 'finmoovi-teste', tipo: 'lembrete' }, { chave: CHAVE, fetchFn });
  assert.deepEqual(r, { ok: true, criada: true, url: 'https://app/x' });
  assert.equal(pedidos[0].metodo, 'POST');
  assert.equal(pedidos[0].cab.Authorization, `Bearer ${CHAVE}`);
  assert.ok(!JSON.stringify(pedidos[0].corpo).includes(CHAVE));
});

test('mandarTarefa: erro do Team NÃO deixa a chave escapar na mensagem, e não lança', async () => {
  const { fetchFn } = teamFalso(() => ({ status: 401, corpo: { ok: false, erro: 'chave_invalida' } }));
  const r = await mandarTarefa({ chave_unica: 'finmoovi-teste' }, { chave: CHAVE, fetchFn });
  assert.equal(r.ok, false);
  assert.match(r.erro, /401: chave_invalida/);
  assert.ok(!r.erro.includes(CHAVE));
  const caiu = await mandarTarefa({ chave_unica: 'x' }, { chave: CHAVE, fetchFn: async () => { throw new Error('rede'); } });
  assert.equal(caiu.ok, false);
});

test('sem chave não sai pedido nenhum', async () => {
  const { fetchFn, pedidos } = teamFalso(() => ({ status: 200 }));
  const r = await mandarTarefa({ chave_unica: 'x' }, { chave: '', fetchFn });
  assert.equal(r.ok, false);
  assert.equal(pedidos.length, 0);
});

test('perguntarTarefa: 404 = não existe; 200 lê "fechada"; controlo: aberta não conta como fechada', async () => {
  const { fetchFn } = teamFalso((url) => (url.endsWith('/nao-ha') ? { status: 404, corpo: { erro: 'tarefa_nao_existe' } }
    : url.endsWith('/fechou') ? { status: 200, corpo: { ok: true, fechada: true } }
      : { status: 200, corpo: { ok: true, fechada: false } }));
  assert.deepEqual(await perguntarTarefa('nao-ha', { chave: CHAVE, fetchFn }), { ok: true, existe: false, fechada: false });
  assert.deepEqual(await perguntarTarefa('fechou', { chave: CHAVE, fetchFn }), { ok: true, existe: true, fechada: true });
  assert.deepEqual(await perguntarTarefa('aberta', { chave: CHAVE, fetchFn }), { ok: true, existe: true, fechada: false });
});

test('a chave do lembrete: sem acentos, com data e título', () => {
  assert.equal(paraChave('TikTok: cobrar resposta da auditoria'), 'tiktok-cobrar-resposta-da-auditoria');
  assert.equal(chaveDoLembrete({ data: '2026-11-20', titulo: 'Desligar o e-mail dos posts' }), 'lembrete-2026-11-20-desligar-o-e-mail-dos-posts');
  assert.equal(chaveDoLembrete({ id: 'meu-id', data: '2026-11-20', titulo: 'x' }), 'lembrete-meu-id');
  const t = tarefaDoLembrete({ data: '2026-11-20', titulo: 'Ação', texto: 'fazer' });
  assert.equal(t.tipo, 'lembrete');
  assert.equal(t.prazo, '2026-11-20T09:00:00-03:00');
});

test('lembretes: cria o que falta, só pergunta o que existe, devolve os fechados, ignora os feitos', async () => {
  const lembretes = [
    { data: '2026-08-26', titulo: 'Velho', feito: true },
    { data: '2026-11-20', titulo: 'Novo' },
    { data: '2026-11-01', titulo: 'Ja fechou' },
    { data: '2026-11-02', titulo: 'Ainda aberto' },
  ];
  const { fetchFn, pedidos } = teamFalso((url, metodo) => {
    if (metodo === 'POST') return { status: 200, corpo: { criada: true } };
    if (url.includes('novo')) return { status: 404 };
    if (url.includes('ja-fechou')) return { status: 200, corpo: { fechada: true } };
    return { status: 200, corpo: { fechada: false } };
  });
  const r = await lembretesNoTeam(lembretes, { chave: CHAVE, fetchFn });
  assert.deepEqual([...r.fechados], ['lembrete-2026-11-01-ja-fechou']);
  assert.deepEqual(r.criados, ['lembrete-2026-11-20-novo']);
  assert.equal(pedidos.filter((p) => p.metodo === 'POST').length, 1); // o aberto NÃO é mandado de novo
  assert.ok(!pedidos.some((p) => p.url.includes('velho'))); // o feito nem é perguntado
});

test('lembretes: Team fora do ar = nada fechado (o lembrete fica no e-mail)', async () => {
  const r = await lembretesNoTeam([{ data: '2026-11-01', titulo: 'X' }], { chave: CHAVE, fetchFn: async () => { throw new Error('rede'); } });
  assert.equal(r.fechados.size, 0);
  assert.equal(r.problemas.length, 1);
});

test('sem travessão nos ficheiros da porta do Team (regra do Ed, 23/10/2026)', () => {
  const ficheiros = [
    'src/scripts/lib/apexi-team.js',
    'src/scripts/lib/lembretes-team.js',
    'src/scripts/youtube/posts-semana.js',
    'src/scripts/automacoes/digest-diario-conteudo.js',
    '.github/workflows/youtube-posts-semana.yml',
    '.github/workflows/digest-diario-conteudo.yml',
    '.github/data/lembretes.json',
    'tests/apexi-team.test.js',
  ];
  assert.ok(/[\u2013\u2014]/.test('caso de controlo \u2014 tem de ser apanhado'));
  for (const f of ficheiros) {
    const linhas = readFileSync(f, 'utf-8').split('\n');
    const achados = linhas.map((l, i) => (/[\u2013\u2014]/.test(l) ? i + 1 : 0)).filter(Boolean);
    assert.deepEqual(achados, [], `${f} tem travessão nas linhas ${achados.join(', ')}`);
  }
});
