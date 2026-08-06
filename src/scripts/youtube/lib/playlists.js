/**
 * AS PLAYLISTS — o vídeo entra sozinho na prateleira certa (06/08/2026).
 *
 * ═══ POR QUE ISTO VALE A PENA ═══
 * Uma playlist faz o YouTube **encadear um vídeo no seguinte sem a pessoa escolher**. É a
 * diferença entre alguém ver um vídeo e alguém ficar meia hora no canal — e é das poucas
 * coisas nesta lista que a API **deixa mesmo** fazer (a tela final não deixa, os posts da
 * comunidade não deixam, o teste A/B não deixa).
 *
 * ═══ A ESCOLHA DA PRATELEIRA É UMA TABELA, NÃO UMA IA ═══
 * Mesma ideia das calculadoras e das capas: **escolher onde arrumar é VERDADE, não
 * gosto.** Uma lista fechada, com os termos que chamam cada prateleira, lida de cima para
 * baixo — a primeira que casar ganha. Se nenhuma casar, o vídeo vai só para a prateleira
 * geral, que é sempre melhor do que ficar sem nenhuma.
 *
 * ⚠️ **NADA AQUI PODE DERRUBAR UMA PUBLICAÇÃO.** Quando isto corre, o vídeo já está no
 * YouTube. Uma playlist que falha é uma prateleira vazia; um robô que rebenta depois de
 * publicar é um vídeo no ar que o caderno diz que não existe. Por isso quem chama
 * apanha o erro e segue — é a mesma regra da capa e do primeiro comentário.
 *
 * ⚠️ **CUSTO DE COTA:** criar uma playlist são 50 unidades, meter um vídeo lá dentro são
 * outras 50, e listar são 1. O dia do YouTube tem 10.000 e uma subida gasta ~1600. Isto
 * cabe de sobra — mas a lista é pedida UMA vez por corrida e guardada, para não pagar
 * duas vezes pela mesma resposta.
 */

const API = 'https://www.googleapis.com/youtube/v3';

/**
 * A prateleira geral, onde TUDO entra. É esta que a tela final do vídeo longo aponta —
 * por isso ela não pode depender do tema: tem de existir sempre e estar sempre cheia.
 */
export const PLAYLIST_GERAL = {
  chave: 'geral',
  titulo: 'FinMoovi — Educação financeira na prática',
  descricao: 'Todos os vídeos do FinMoovi: dívidas, investimento e organização do dinheiro, com contas em reais e sem palavra difícil. App grátis em https://app.finmoovi.com',
};

/**
 * As prateleiras por assunto. ⚠️ **Poucas de propósito.** Vinte playlists com dois vídeos
 * cada não encadeiam nada — o valor de uma playlist é ter fila. Quatro assuntos largos
 * enchem-se depressa e continuam a fazer sentido daqui a um ano.
 */
export const PLAYLISTS = [
  {
    chave: 'dividas',
    titulo: 'Sair das dívidas',
    descricao: 'Dívida do cartão, juros do rotativo, financiamento e como pagar sem apertar mais o mês.',
    termos: ['divida', 'vermelho', 'cartao', 'fatura', 'rotativo', 'financiamento', 'emprestimo', 'parcela', 'amortiza', 'cheque especial', 'quitar', 'inadimpl'],
  },
  {
    chave: 'investir',
    titulo: 'Investir do zero',
    descricao: 'Onde pôr o dinheiro que sobra: tesouro, CDB, ações, fundos e juros compostos, explicados do princípio.',
    termos: ['investi', 'tesouro', 'cdb', 'acoes', 'acao', 'renda fixa', 'renda variavel', 'juros compostos', 'dividendo', 'fundo', 'etf', 'poupanca', 'bitcoin', 'aplicacao'],
  },
  {
    chave: 'organizar',
    titulo: 'Organizar o mês',
    descricao: 'Orçamento, gastos que não se veem, reserva de emergência e como fazer o salário chegar ao fim do mês.',
    termos: ['orcamento', 'gasto', 'salario', 'reserva', 'emergencia', 'economizar', 'controle', 'planilha', 'mesada', 'bolso', 'sobra', 'fim do mes'],
  },
  {
    chave: 'entender',
    titulo: 'Entender o dinheiro',
    descricao: 'Inflação, IPCA, câmbio, impostos e as palavras que aparecem no noticiário — traduzidas.',
    termos: ['inflacao', 'ipca', 'selic', 'cdi', 'cambio', 'dolar', 'euro', 'imposto', 'iof', 'aposenta', 'previdencia', 'inss', 'educacao financeira'],
  },
];

const semAcento = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * Em que prateleiras este vídeo entra: a do assunto (se alguma casar) e SEMPRE a geral.
 * ⚠️ A geral vem em último de propósito: se a cota acabar a meio, a prateleira que
 * interessa ao espectador é a do assunto.
 */
/**
 * 🔴 O TERMO TEM DE COMEÇAR UMA PALAVRA — e esta linha nasceu de um defeito que a prova
 * de mesa apanhou no primeiro minuto: **"inflação" contém "ação"**, e um vídeo sobre
 * inflação ia parar à prateleira dos investimentos. Procurar um pedaço de texto dentro de
 * outro é o erro clássico, e neste caso mandava o vídeo para o sítio errado sem nada a
 * queixar-se.
 * ⚠️ O fim fica solto de propósito: os termos são **raízes** ("investi" apanha investir,
 * investimento, investidor; "amortiza" apanha amortização). O que não pode ficar solto é
 * o princípio.
 */
function comecaPalavra(texto, termo) {
  const escapado = termo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escapado}`, 'u').test(texto);
}

export function prateleirasDoVideo(texto) {
  const t = semAcento(texto);
  const achada = PLAYLISTS.find((p) => p.termos.some((termo) => comecaPalavra(t, termo)));
  return achada ? [achada, PLAYLIST_GERAL] : [PLAYLIST_GERAL];
}

async function pedir(chave, url, opcoes = {}) {
  const r = await fetch(url, {
    ...opcoes,
    headers: { Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json', ...(opcoes.headers || {}) },
  });
  const texto = await r.text();
  if (!r.ok) throw new Error(`${r.status}: ${texto.slice(0, 250)}`);
  return texto ? JSON.parse(texto) : {};
}

/**
 * As playlists que o canal já tem, por TÍTULO.
 * ⚠️ Pelo título e não por um identificador guardado num ficheiro nosso: um caderno com
 * identificadores fica a mentir no dia em que alguém apaga uma playlist no Studio, e
 * ninguém dá por nada. **A verdade está no YouTube.**
 */
export async function playlistsDoCanal(chave) {
  const mapa = new Map();
  let pagina = '';
  do {
    const d = await pedir(chave, `${API}/playlists?part=snippet&mine=true&maxResults=50${pagina ? `&pageToken=${pagina}` : ''}`);
    for (const p of d.items || []) mapa.set(String(p.snippet?.title || '').trim().toLowerCase(), p.id);
    pagina = d.nextPageToken || '';
  } while (pagina);
  return mapa;
}

/** Cria a playlist, ou devolve a que já existe com aquele título. */
export async function garantirPlaylist(chave, prateleira, existentes) {
  const id = existentes.get(prateleira.titulo.trim().toLowerCase());
  if (id) return { id, criada: false };
  const d = await pedir(chave, `${API}/playlists?part=snippet,status`, {
    method: 'POST',
    body: JSON.stringify({
      snippet: { title: prateleira.titulo, description: prateleira.descricao, defaultLanguage: 'pt-BR' },
      status: { privacyStatus: 'public' },
    }),
  });
  if (!d.id) throw new Error('o YouTube criou a playlist mas não devolveu identificador');
  existentes.set(prateleira.titulo.trim().toLowerCase(), d.id);
  return { id: d.id, criada: true };
}

/** Mete o vídeo na playlist. Se já lá estiver, o YouTube aceita e fica com ele duas vezes — por isso confere-se antes. */
export async function meterNaPlaylist(chave, playlistId, videoId) {
  const d = await pedir(chave, `${API}/playlistItems?part=snippet&playlistId=${encodeURIComponent(playlistId)}&videoId=${encodeURIComponent(videoId)}&maxResults=1`);
  if ((d.items || []).length) return false;
  await pedir(chave, `${API}/playlistItems?part=snippet`, {
    method: 'POST',
    body: JSON.stringify({ snippet: { playlistId, resourceId: { kind: 'youtube#video', videoId } } }),
  });
  return true;
}

/**
 * O caminho completo: arruma um vídeo nas prateleiras dele.
 * Devolve o que fez, para o registo poder dizê-lo. **Nunca lança** — ver o aviso do topo.
 */
export async function arrumarNasPlaylists(chave, videoId, texto, registar = () => {}) {
  const feito = [];
  try {
    const existentes = await playlistsDoCanal(chave);
    for (const prateleira of prateleirasDoVideo(texto)) {
      try {
        const { id, criada } = await garantirPlaylist(chave, prateleira, existentes);
        const entrou = await meterNaPlaylist(chave, id, videoId);
        feito.push({ titulo: prateleira.titulo, criada, entrou });
        registar(`📚 ${criada ? 'playlist criada e vídeo posto' : (entrou ? 'vídeo posto na playlist' : 'o vídeo já lá estava')}: ${prateleira.titulo}`);
      } catch (e) {
        registar(`⚠️ a playlist "${prateleira.titulo}" falhou (${e.message}) — o vídeo já está no ar, segue.`);
      }
    }
  } catch (e) {
    registar(`⚠️ não deu para listar as playlists (${e.message}) — o vídeo já está no ar, segue.`);
  }
  return feito;
}
