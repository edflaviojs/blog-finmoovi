/**
 * A PALAVRA-CHAVE FALADA — e por que vive num ficheiro só dela (02/08/2026).
 *
 * ═══ O DEFEITO QUE ISTO CONSERTA, E ERA GRAVE ═══
 * Esta função nasceu dentro de `coreografia.js` (passagem 2). Em 01/08 às 10:41 a
 * passagem 1 passou a precisar dela e importou-a de lá:
 *     roteiro-narrativa.js  ──importa──▶  coreografia.js
 * Só que `coreografia.js`, quando é executado diretamente (que é como o robô diário o
 * corre), termina com uma espera no fim do ficheiro para ir buscar a passagem 1:
 *     coreografia.js  ──espera por──▶  roteiro-narrativa.js
 * As duas ficam à espera uma da outra. **O ficheiro nunca chega a arrancar** — não dá
 * erro, não escreve nada, fica pendurado e o processo morre em silêncio.
 *
 * ⚠️ **O ROBÔ DIÁRIO CHAMA EXATAMENTE ESSE COMANDO** (`coreografia.js --gravar`, ver
 * `.github/workflows/youtube-short-render.yml`). O defeito entrou às 10:41 de 01/08 —
 * **4h39m DEPOIS de o robô ter sido desligado às 06:02**. Por isso nunca correu, e
 * por isso ninguém deu por nada. Se o robô tivesse sido religado, o canal ficaria
 * sem vídeo nenhum, todos os dias, sem uma única mensagem de erro que se percebesse.
 *
 * ═══ A CORREÇÃO ═══
 * Não se remenda a espera: tira-se a razão do círculo. A função passa a viver AQUI,
 * num sítio que não importa ninguém, e as duas passagens vão buscá-la ao mesmo lado.
 * É a regra de sempre deste repositório: **uma regra, um sítio** — e um sítio que não
 * dependa de ninguém não pode fechar círculo com ninguém.
 */

/** Palavras que não servem de palavra-chave por serem vazias de assunto. */
const VAZIAS = new Set(['que', 'com', 'para', 'por', 'uma', 'umas', 'uns', 'dos', 'das', 'nos', 'nas',
  'pelo', 'pela', 'seu', 'sua', 'voce', 'mes', 'todo', 'toda', 'cada', 'mais', 'menos', 'isso',
  'esse', 'essa', 'aquilo', 'como', 'quando', 'onde', 'quanto', 'custam', 'custa', 'ganha', 'vale', 'pena']);

export const semAcento = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * A FRASE DA CAPA (02/08/2026): é a 1ª frase falada E o texto que aparece na tela.
 * Dezoito palavras a 2,76 palavras/s = 6,5s, e a capa está desenhada para durar
 * exatamente isso (`CAPA_FRAMES_V3 = 223` em Short.tsx) — os dois números são o
 * MESMO facto; mexer num sem mexer no outro faz a capa sair a meio da frase.
 * ⚠️ Já foi 13 e reprovava a frase que o próprio dono escreveu como modelo — o
 * número sai da frase dele, não de gosto.
 *
 * VIVE AQUI (03/08/2026) porque o escritor (roteiro-narrativa) e o segundo leitor
 * (segundo-leitor) precisam do MESMO número: o leitor dizia "13" enquanto a trava
 * exigia 18 — o padrão prompt-contra-validador outra vez. Uma regra, um sítio, e o
 * sítio é a folha que não importa ninguém.
 */
export const MAX_PALAVRAS_CAPA = 18;

/**
 * A PALAVRA-CHAVE TEM DE SER UMA QUE FOI MESMO DITA (erro apanhado em 31/07).
 *
 * O validador exige que `keyword` apareça na narração do gancho. A 1ª versão punha
 * `keyword = t.term` — mas num tema editorial o `term` é a frase inteira
 * ("3 erros de cartão que te custam R$ 500/mês"), que nenhuma narração vai conter.
 * Resultado: reprovou 4 tentativas seguidas com um erro que **o modelo não podia
 * corrigir**, porque a narração vem fechada da passagem 1. Pêndulo garantido.
 *
 * ⚠️ ALARGADA EM 03/08/2026 — e a causa foi MEDIDA no roteiro-modelo do dono.
 * A versão anterior exigia a palavra INTEIRA do tema dentro da fala: com o tema
 * "parcelamento", uma fala que dissesse "parcela" não contava (medido: devolvia
 * null nos dois blocos do roteiro D). A trava reprovava o modelo que o dono deu.
 * Agora casa também por FAMÍLIA da palavra, por duas portas estreitas:
 *   1. singular/plural — "erros"↔"erro", "cartões"↔"cartão" ("ões"→"ão" e "s" final);
 *   2. prefixo comum ≥6 letras — "parcela"↔"parcelamento", "investe"↔"investimento".
 * Estreitas de propósito: "cartas"↔"cartão" NÃO casa (nem plural um do outro, nem
 * 6 de prefixo — prefixo comum é "carta", 5). Falsos positivos assumidos e de dano
 * baixo: a família "financ-" casa entre si, "investir"↔"investigar".
 * E siglas de 3 letras sem vogal ("cdb", "cdi") passam a ser candidatas — antes o
 * filtro de 4 letras deixava esses temas SEM candidata nenhuma, erro incorrigível.
 *
 * O RETORNO: quando a fala tem a palavra do tema inteira, devolve-se a palavra do
 * TEMA (como sempre); quando o casamento é por família, devolve-se a palavra que
 * foi FALADA — é ela que existe na narração, e é isso que os validadores a jusante
 * (schema-short) conferem por substring.
 */
const singularizar = (s) => s.replace(/oes$/, 'ao').replace(/aes$/, 'ao').replace(/aos$/, 'ao').replace(/s$/, '');

export function keywordFalada(termo, falaDoGancho) {
  const gancho = semAcento(falaDoGancho);
  // ⚠️ Os tokens ORIGINAIS (com acento) andam lado a lado com os normalizados:
  // a keyword vai para o TÍTULO público do YouTube (upload-short.js), e devolver
  // "cartoes" sem acento estragava o título — apanhado na revisão pós-execução.
  const tokensOriginais = String(falaDoGancho || '').split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const candidatas = String(termo || '')
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => (w.length >= 4 || (w.length === 3 && !/[aeiou]/.test(semAcento(w)))) && !VAZIAS.has(semAcento(w)))
    .sort((a, b) => b.length - a.length);
  for (const w of candidatas) {
    const alvo = semAcento(w);
    if (gancho.includes(alvo)) return w; // a porta de sempre: palavra inteira na fala
    for (const original of tokensOriginais) {
      const f = semAcento(original);
      if (f.length < 4) continue;
      if (singularizar(f) === singularizar(alvo)) return original.toLocaleLowerCase('pt-BR'); // singular/plural
      let p = 0;
      while (p < f.length && p < alvo.length && f[p] === alvo[p]) p++;
      if (p >= 6) return original.toLocaleLowerCase('pt-BR'); // radical comum ("parcela" ↔ "parcelamento")
    }
  }
  return null;
}

/**
 * 🔴 O ASSUNTO CURTO DE UM VÍDEO — 09/08/2026.
 *
 * ═══ O DEFEITO QUE ISTO TAPA, MEDIDO NO VÍDEO 2 ═══
 * O campo `tema` da fila tem DOIS papéis que ninguém separou: é a ENCOMENDA que a IA lê
 * (e por isso pode ser um parágrafo) e é o ASSUNTO que aparece na descrição, nas
 * etiquetas e na capa (e por isso tem de ser curto). Nos temas que o robô cria sozinho
 * os dois papéis calham na mesma frase de 70 caracteres, e nunca se viu o problema.
 *
 * Nos temas que o dono manda pela página /status, não: ele escreve a ideia por extenso.
 * O do vídeo 2 tem 425 caracteres, e o resultado foi este, à letra, na descrição:
 *
 *     03:11 Na prática: Dois homens, mesma idade, mesmo trabalho, mesmo salário,
 *     durante 30 anos. Um deles acaba de se aposentar (…) igualmente. no app grátis
 *
 * E nas etiquetas: "Dois homens", "mesma idade", "o que é mesmo trabalho",
 * "mesmo salário 2026" — 433 caracteres que ninguém procura.
 *
 * ═══ A REGRA ═══
 * Procura-se um assunto **curto** por esta ordem: o tema até ao primeiro dois-pontos ou
 * ponto final, depois o título até ao primeiro dois-pontos. Ganha o primeiro que caiba
 * em `MAX_PALAVRAS_ASSUNTO`. Se nenhum couber, corta-se o melhor deles.
 *
 * ⚠️ **NUNCA DEVOLVE UM PARÁGRAFO**, e é esse o contrato. Um assunto comprido não é um
 * assunto mau — é um assunto que quebra três sítios de uma vez sem ninguém dar por nada.
 */
export const MAX_PALAVRAS_ASSUNTO = 6;

export function assuntoCurto({ tema = '', titulo = '' } = {}) {
  const limpar = (s) => String(s || '')
    .replace(/[“”"'*]/g, '')
    .split(/[\n:.!?]/)[0]
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[,;–—-]+$/, '');

  const candidatos = [limpar(tema), limpar(titulo)].filter(Boolean);
  const cabe = candidatos.find((c) => c.split(/\s+/).length <= MAX_PALAVRAS_ASSUNTO);
  if (cabe) return cabe;
  const melhor = candidatos[0] || '';
  return melhor.split(/\s+/).slice(0, MAX_PALAVRAS_ASSUNTO).join(' ').replace(/[,;–—-]+$/, '');
}
