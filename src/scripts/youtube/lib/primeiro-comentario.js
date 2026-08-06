/**
 * O PRIMEIRO COMENTÁRIO — o link em cima, escrito pelo próprio canal (IMPL20 §54).
 *
 * ═══ POR QUE EXISTE ═══
 * A descrição de um Short **quase não se vê**: no ecrã do telemóvel ela fica atrás de
 * um toque. O comentário do criador, esse, aparece na conversa — e é o sítio onde o
 * público espera encontrar o link. Sem ele, a descrição pode estar impecável e não
 * servir de nada.
 *
 * ⚠️ **NÃO DÁ PARA FIXAR POR ROBÔ, E ISSO NÃO É UM DEFEITO NOSSO.**
 * A API do YouTube sabe escrever, listar, editar e moderar comentários — mas **não
 * tem nenhum comando para os fixar**. Fixar é uma ação só do Studio, à mão. É a
 * primeira coisa que se deve saber antes de contar com isto:
 *   • o robô ESCREVE o comentário sozinho, em todos os vídeos;
 *   • FIXAR são dois cliques por vídeo, no Studio, e é decisão de quem publica.
 * Um comentário do dono do canal já aparece com o avatar do canal e costuma subir
 * sozinho — fixar melhora, mas não é obrigatório para ele existir.
 *
 * ⚠️ E É O `commentThreads` QUE ABRE CONVERSA NOVA.
 * O `comments.insert` só serve para RESPONDER a uma conversa existente (é o que o
 * robô de respostas usa). Trocar os dois dá 400 sem explicação útil.
 *
 * Falhar aqui nunca derruba nada: o vídeo já está no ar, e um vídeo sem o primeiro
 * comentário é um vídeo com um comentário a menos — não é um vídeo perdido.
 */

const COMMENT_THREADS_URL = 'https://www.googleapis.com/youtube/v3/commentThreads?part=snippet';

const APP_URL = 'https://finmoovi.com';
const BLOG_URL = 'https://blog.finmoovi.com/';

/**
 * O texto. Curto de propósito: o YouTube corta o comentário em ~2 linhas e põe um
 * "Ler mais". O que interessa — o que é e o link — tem de caber antes do corte.
 */
export function textoDoPrimeiroComentario({ ferramentaUrl, palavraChave } = {}) {
  const linhas = [
    '📲 O FinMoovi é grátis e abre direto no navegador, sem instalar nada:',
    APP_URL,
    '',
  ];
  if (ferramentaUrl) {
    linhas.push('🔗 A calculadora deste vídeo:', ferramentaUrl, '');
  } else if (palavraChave) {
    linhas.push(`📚 Mais sobre ${palavraChave}:`, BLOG_URL, '');
  }
  linhas.push('💬 Comenta FINMOOVI aqui embaixo que eu te mando o app — eu respondo um por um.');
  return linhas.join('\n');
}

/** Escreve o comentário no vídeo, em nome do canal. Devolve o id do comentário. */
export async function escreverPrimeiroComentario(accessToken, videoId, texto) {
  const res = await fetch(COMMENT_THREADS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      snippet: { videoId, topLevelComment: { snippet: { textOriginal: texto } } },
    }),
  });
  const corpo = await res.text();
  if (!res.ok) {
    throw new Error(`${res.status}: ${corpo.slice(0, 240)}`);
  }
  const criado = JSON.parse(corpo);
  return criado?.id || null;
}
