/**
 * O SEGUNDO LEITOR — quem lê o roteiro como espectador e reescreve o que soa a robô.
 *
 * ═══ POR QUE EXISTE (a pergunta do dono, 01/08/2026) ═══
 * *"não existe uma outra forma de corrigirmos isso definitivamente, sobre como ele
 * deve escrever na linguagem que queremos e como se fosse um humano escrevendo? por
 * essas tentativas e erros não vejo como algo seguro pro futuro."*
 *
 * Ele tinha razão, e a prova estava medida: quatro tentativas seguidas, quatro
 * regras diferentes a falhar, nada a convergir. Eu tentava medir GOSTO com listas
 * de palavras — e uma lista só sabe dizer "esta palavra é proibida". Escrever bem
 * não é a ausência de palavras más.
 *
 * ═══ O QUE MUDA ═══
 * O escritor deixa de ter de acertar tudo à primeira. Ele escreve a HISTÓRIA; este
 * leitor arruma a FALA. São dois trabalhos diferentes e muito mais fáceis
 * separados — a mesma ideia que já tinha resolvido a narração e a coreografia.
 *
 * ═══ AS TRÊS REGRAS QUE TORNAM ISTO SEGURO ═══
 * 1. Ele só pode MEXER NAS PALAVRAS. Não inventa facto, não mexe em número, não
 *    troca a imagem, não mexe no bordão. Diz-se-lhe isso, e confere-se depois.
 * 2. O resultado volta a passar pelas travas de VERDADE. Se a reescrita partir
 *    alguma, **fica o original** — o leitor nunca pode piorar o roteiro.
 * 3. Se a chamada de IA falhar, devolve-se o original sem drama. Ele é um lucro,
 *    nunca um ponto de falha: um vídeo com fala mediana é melhor que nenhum vídeo.
 */

import { generateText } from '../../apis/kie-ai.js';
import { PERSONA, VICIOS, O_QUE_PRESERVAR } from './voz-do-canal.js';
// ⚠️ O bordão VAI ESCRITO no prompt do leitor desde 02/08/2026. Antes dizia-se-lhe
// "não mexa no bordão" sem nunca lhe dizer QUAL era a frase — e ele reescreveu-a
// ("Dinheiro sem controle acaba indo para o outro lado"). Não se pede a alguém que
// preserve à letra uma frase que não lhe foi mostrada.
import { BORDAO } from './schema-short.js';
// ⚠️ O limite da capa vem do MESMO sítio que a trava usa (03/08/2026). Este prompt
// dizia "13 palavras" enquanto a trava exigia 18 — o leitor encolhia a capa que o
// escritor tinha acertado. Prompt e trava leem a mesma constante, da mesma folha.
import { MAX_PALAVRAS_CAPA } from './palavras.js';

const ORDEM = ['gancho', 'empatia', 'virada', 'demonstracao', 'convite', 'fecho'];

export function buildPromptLeitor(narrativa, termo) {
  const blocos = narrativa.blocos
    .map((b, i) => `${i + 1}. [${b.papel.toUpperCase()}] ${b.fala}`)
    .join('\n');

  return `Você é o EDITOR de um canal brasileiro de finanças. Alguém já escreveu a narração deste vídeo curto. O seu trabalho NÃO é reescrever a história — é fazer com que ela soe como UMA PESSOA FALANDO.

QUEM FALA, E COM QUEM: ${PERSONA}

TEMA DO VÍDEO: "${termo}"

════════ A NARRAÇÃO A EDITAR ════════
${blocos}

════════ COMO SE LÊ ISTO ════════
Leia em voz alta, como quem tá vendo o vídeo no celular, uma vez só, sem poder voltar atrás.
Em cada frase pergunte: **uma pessoa fala assim com outra pessoa?** Se a resposta for não, reescreva ESSA frase.

**O TESTE DO SENHOR DE 70 ANOS — faça-o palavra a palavra, é o mais importante daqui.**
Está a ler em voz alta para um senhor de setenta anos que saiu cedo da escola e nunca estudou finanças.
**Se ele parasse para perguntar "o que é isso?", a palavra está errada** — troque-a pela do dia a dia, sem mudar o sentido.
   ✗ "a parte restante" → ✓ "o que sobrou"
   ✗ "o valor remanescente" → ✓ "o resto"
   ✗ "efetuar o pagamento" → ✓ "pagar"
Não é uma lista fechada: **é o teste que manda**. Qualquer palavra que só se escreva, e não se diga, cai por aqui.

════════ A PRIMEIRA FRASE É A CAPA — E É A QUE MAIS IMPORTA ════════
A 1ª frase do bloco 1 aparece ESCRITA na tela ao mesmo tempo que é dita. É a única coisa que a pessoa lê antes de decidir se fica ou se passa o dedo.
**Ela é uma PERGUNTA que dói** — de dor, de vergonha ou de provocação — e a frase logo a seguir dá o choque ou a resposta. É o padrão do canal: pergunta que incomoda, resposta na cara. **Nunca a transforme em afirmação, e nunca deixe a pergunta sem a resposta colada nela.**
⚠️ E a resposta NÃO repete a pergunta para responder — ela responde direto ("Quantas assinaturas você paga? / Se você travou agora, esse vídeo é pra você.").
Se a pergunta estiver morna, reescreva — mas **sem inventar facto novo, sem número novo, terminando em "?", e no máximo ${MAX_PALAVRAS_CAPA} palavras**.
🔴 **E ELA TEM DE SER ENTENDIDA À PRIMEIRA, OUVINDO UMA VEZ SÓ.** É aqui que este canal mais falha. Palavra que um senhor de setenta anos não entenderia, troque.

════════ OS SEIS PRINCÍPIOS DESTE CANAL — é contra eles que você julga ════════
1. UMA ideia por vídeo. Se um bloco abrir assunto novo, corte o desvio, não a ideia.
2. Um NÚMERO que se transforma à frente de quem ouve (antes → depois). É a transformação que prende, não enfeite.
3. O app aparece FAZENDO a conta, na 1ª pessoa ("eu joguei isso no FinMoovi e ele me mostrou…"), nunca citado de passagem.
4. Metáfora quase não existe. Se houver uma comparação, é com coisa que a pessoa JÁ conhece, uma vez só. Duas metáforas = corte uma.
5. Nenhuma pergunta fica pendurada. Perguntou, respondeu.
6. Frases curtas, sujeito e verbo. "Ela cresceu." "A cabeça não guarda isso."
⚠️ Se aparecer uma conta de rendimento (dinheiro que "vira" mais dinheiro) que não veio de conta calculada, reescreva a frase para o número sair da tela do app ("o FinMoovi me mostrou…"), sem mudar o número — é história de quem conta, não promessa do canal.

🇧🇷 **PORTUGUÊS DO BRASIL FALADO.** Nada de "está a fazer" (no Brasil é "tá fazendo"), nada de "ecrã" nem "telemóvel".

════════ OS VÍCIOS A CAÇAR ════════
${VICIOS}

════════ O QUE NÃO SE TOCA ════════
${O_QUE_PRESERVAR}

════════ AS SUAS ALGEMAS — leia duas vezes ════════
⛔ NÃO invente factos, números, valores ou promessas. Nenhum número novo. Nenhum número alterado.
⛔ Se houver uma comparação na fala, NÃO a troque por outra nem acrescente novas — e não invente metáfora onde não há (o padrão do canal é quase sem metáfora).
⛔ NÃO mexa no BORDÃO DO CANAL, nem o mude de sítio. É esta frase, e vai copiada à letra, palavra por palavra: "${BORDAO}"
   Não é uma frase para melhorar — é a assinatura do canal, igual em todos os vídeos. Reescrevê-la reprova a sua versão inteira.
⛔ NÃO mexa na palavra FINMOOVI nem no pedido de comentário.
⛔ NÃO acrescente nem tire blocos: são seis, na mesma ordem, com os mesmos papéis.
⛔ Mantenha o tamanho parecido — no máximo mais 5% de palavras que o original.
✓ Se um bloco já soa a gente, **deixe-o exatamente como está**. Editar de menos é melhor que editar de mais.

Responda APENAS com JSON válido, sem markdown:
{
  "blocos": [
    { "papel": "gancho", "fala": "..." },
    { "papel": "empatia", "fala": "..." },
    { "papel": "virada", "fala": "..." },
    { "papel": "demonstracao", "fala": "..." },
    { "papel": "convite", "fala": "..." },
    { "papel": "fecho", "fala": "..." }
  ],
  "mexi": ["<em poucas palavras, o que mudou e porque. SEM aspas dentro do texto.>"]
}`;
}

/**
 * Extrai o "blocos" à força, mesmo que o resto do JSON venha partido.
 *
 * ⚠️ MEDIDO À PRIMEIRA CORRIDA: o leitor devolveu JSON inválido e a revisão foi
 * inteiramente deitada fora — por causa do campo `mexi`, que é só um comentário
 * para o log. O modelo escreveu aspas dentro das explicações e partiu o array.
 * Perder a EDIÇÃO por causa de uma NOTA é absurdo, por isso a leitura passa a ser
 * em duas fases: tenta o JSON todo; se falhar, vai buscar só o array que interessa,
 * contando parênteses (e respeitando aspas e escapes, senão um "]" dentro de uma
 * frase fechava o array cedo demais).
 */
function extrairArrayBlocos(s) {
  const marca = s.indexOf('"blocos"');
  if (marca === -1) return null;
  const ini = s.indexOf('[', marca);
  if (ini === -1) return null;
  let profundidade = 0;
  let dentroDeAspas = false;
  let escapado = false;
  for (let i = ini; i < s.length; i++) {
    const c = s[i];
    if (escapado) { escapado = false; continue; }
    if (c === '\\') { escapado = true; continue; }
    if (c === '"') { dentroDeAspas = !dentroDeAspas; continue; }
    if (dentroDeAspas) continue;
    if (c === '[') profundidade++;
    else if (c === ']') {
      profundidade--;
      if (profundidade === 0) {
        try { return JSON.parse(s.slice(ini, i + 1)); } catch { return null; }
      }
    }
  }
  return null;
}

function extrairJson(texto) {
  let s = String(texto).trim();
  const cerca = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (cerca) s = cerca[1].trim();
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a !== -1 && b !== -1) {
    try { return JSON.parse(s.slice(a, b + 1)); } catch { /* cai para o plano B */ }
  }
  const blocos = extrairArrayBlocos(s);
  if (blocos) return { blocos, mexi: ['(a nota do leitor veio partida e foi ignorada)'] };
  throw new Error('nenhum JSON aproveitável na resposta do leitor');
}

/**
 * Passa a narração pelo segundo leitor.
 *
 * @param narrativa  a narração aprovada pela passagem 1
 * @param termo      o tema do vídeo
 * @param validar    função que devolve { ok, erros } — as travas de VERDADE
 * @returns { narrativa, mexi[], usada: 'leitor'|'original', motivo? }
 *
 * NUNCA lança. O pior caso devolve o original — ver a regra 3 lá em cima.
 */
export async function revisarFala(narrativa, termo, validar, { tentativas = 2, limpar = (x) => x } = {}) {
  const original = { narrativa, mexi: [], usada: 'original' };
  const base = buildPromptLeitor(narrativa, termo);
  let ultimoMotivo = 'não foi possível usar o leitor';

  // ⚠️ DUAS TENTATIVAS, e não uma. Na 1ª corrida a leitura falhou por um detalhe de
  // formatação e a edição inteira foi deitada fora. Uma 2ª chamada custa segundos e
  // recupera a maior parte desses casos. Mais do que duas seria teimosia: se ele
  // erra duas vezes, o original vai na mesma e o vídeo sai à mesma.
  for (let i = 1; i <= tentativas; i++) {
    const prompt = i === 1 ? base : `${base}\n\n⚠️ A SUA RESPOSTA ANTERIOR FOI RECUSADA: ${ultimoMotivo}\nResponda só com o JSON pedido, sem aspas dentro dos textos.`;

    let bruto;
    try {
      // `pago: 'leitor'` = claude-sonnet-5 pelo kie.ai. Ele julga o TOM, e é aqui que a
      // qualidade paga — o leitor é a parte pequena do gasto. Gratuitos ficam por baixo.
      bruto = await generateText(prompt, { maxTokens: 2000, temperature: 0.7, pago: 'leitor' });
    } catch (err) {
      ultimoMotivo = `a chamada ao leitor falhou (${err.message})`;
      continue;
    }

    let lido;
    try {
      lido = extrairJson(bruto);
    } catch (err) {
      ultimoMotivo = `o leitor não devolveu JSON (${err.message})`;
      continue;
    }

    const blocos = Array.isArray(lido.blocos) ? lido.blocos : [];
    if (blocos.length !== ORDEM.length) {
      ultimoMotivo = `o leitor devolveu ${blocos.length} blocos em vez de ${ORDEM.length}`;
      continue;
    }
    // os papéis têm de continuar na ordem — o leitor não reorganiza o vídeo
    const malFormado = ORDEM.findIndex((papel, k) => !blocos[k]
      || blocos[k].papel !== papel
      || typeof blocos[k].fala !== 'string'
      || !blocos[k].fala.trim());
    if (malFormado !== -1) {
      ultimoMotivo = `o bloco ${malFormado + 1} veio mal formado do leitor`;
      continue;
    }

    // ⚠️ A limpeza mecânica corre ANTES de julgar. Quem chama passa-a em `limpar` (ver o
    // comentário em `gerarNarrativa`): sem isto, a edição do leitor era deitada fora por
    // um defeito de grafia ou de nome que o código conserta sozinho, sem custar nada.
    const revista = limpar({ ...narrativa, blocos: blocos.map((b) => ({ papel: b.papel, fala: b.fala.trim() })) });

    // ⚠️ A REDE POR BAIXO: a versão editada volta a passar pelas travas de VERDADE.
    // Se o leitor partiu alguma (mexeu num número, tirou o bordão, esticou o texto),
    // fica o original. Ele só pode melhorar a fala — nunca piorar o roteiro.
    const v = validar(revista);
    if (!v.ok) {
      ultimoMotivo = `a versão do leitor foi recusada pelas travas: ${v.erros.join(' | ')}`;
      continue;
    }

    return {
      narrativa: revista,
      mexi: Array.isArray(lido.mexi) ? lido.mexi.filter((m) => typeof m === 'string') : [],
      usada: 'leitor',
      tentativa: i,
    };
  }

  return { ...original, motivo: ultimoMotivo };
}
