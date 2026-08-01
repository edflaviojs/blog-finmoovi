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

const ORDEM = ['gancho', 'empatia', 'virada', 'demonstracao', 'convite', 'fecho'];

export function buildPromptLeitor(narrativa, termo) {
  const blocos = narrativa.blocos
    .map((b, i) => `${i + 1}. [${b.papel.toUpperCase()}] ${b.fala}`)
    .join('\n');

  return `Você é o EDITOR de um canal brasileiro de finanças. Alguém já escreveu a narração deste vídeo curto. O seu trabalho NÃO é reescrever a história — é fazer com que ela soe a UMA PESSOA A FALAR.

QUEM FALA, E COM QUEM: ${PERSONA}

TEMA DO VÍDEO: "${termo}"

════════ A NARRAÇÃO A EDITAR ════════
${blocos}

════════ COMO SE LÊ ISTO ════════
Leia em voz alta, como quem está a ver o vídeo no telemóvel, uma vez só, sem poder voltar atrás.
Em cada frase pergunte: **uma pessoa diria isto assim, a outra pessoa?** Se a resposta for não, reescreva ESSA frase.

════════ OS VÍCIOS A CAÇAR ════════
${VICIOS}

════════ O QUE NÃO SE TOCA ════════
${O_QUE_PRESERVAR}

════════ AS SUAS ALGEMAS — leia duas vezes ════════
⛔ NÃO invente factos, números, valores ou promessas. Nenhum número novo. Nenhum número alterado.
⛔ NÃO troque a imagem do vídeo por outra, nem a tire de onde ela está.
⛔ NÃO mexa na frase do bordão do canal, nem a mude de sítio.
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
  "mexi": ["<em poucas palavras, o que mudou e porquê — um item por bloco alterado>"]
}`;
}

function extrairJson(texto) {
  let s = String(texto).trim();
  const cerca = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (cerca) s = cerca[1].trim();
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a === -1 || b === -1) throw new Error('nenhum JSON na resposta do leitor');
  return JSON.parse(s.slice(a, b + 1));
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
export async function revisarFala(narrativa, termo, validar) {
  const original = { narrativa, mexi: [], usada: 'original' };
  let bruto;
  try {
    bruto = await generateText(buildPromptLeitor(narrativa, termo), { maxTokens: 2000, temperature: 0.7 });
  } catch (err) {
    return { ...original, motivo: `a chamada ao leitor falhou (${err.message})` };
  }

  let lido;
  try {
    lido = extrairJson(bruto);
  } catch (err) {
    return { ...original, motivo: `o leitor não devolveu JSON (${err.message})` };
  }

  const blocos = Array.isArray(lido.blocos) ? lido.blocos : [];
  if (blocos.length !== ORDEM.length) {
    return { ...original, motivo: `o leitor devolveu ${blocos.length} blocos em vez de ${ORDEM.length}` };
  }
  // os papéis têm de continuar na ordem — o leitor não reorganiza o vídeo
  for (let i = 0; i < ORDEM.length; i++) {
    if (!blocos[i] || blocos[i].papel !== ORDEM[i] || typeof blocos[i].fala !== 'string' || !blocos[i].fala.trim()) {
      return { ...original, motivo: `o bloco ${i + 1} veio mal formado do leitor` };
    }
  }

  const revista = { ...narrativa, blocos: blocos.map((b) => ({ papel: b.papel, fala: b.fala.trim() })) };

  // ⚠️ A REDE POR BAIXO: a versão editada volta a passar pelas travas de VERDADE.
  // Se o leitor partiu alguma (mexeu num número, tirou o bordão, esticou o texto),
  // fica o original. Ele só pode melhorar a fala — nunca piorar o roteiro.
  const v = validar(revista);
  if (!v.ok) {
    return { ...original, motivo: `a versão do leitor foi recusada pelas travas: ${v.erros.join(' | ')}` };
  }

  return {
    narrativa: revista,
    mexi: Array.isArray(lido.mexi) ? lido.mexi.filter((m) => typeof m === 'string') : [],
    usada: 'leitor',
  };
}
