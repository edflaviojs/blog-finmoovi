/**
 * O SEGUNDO LEITOR DO VÍDEO LONGO — o polidor, capítulo a capítulo (04/08/2026).
 *
 * ═══ POR QUE É UM FICHEIRO NOVO E NÃO O `segundo-leitor.js` ═══
 * O leitor do Short está desenhado à volta dos SEIS blocos dele (gancho, empatia,
 * virada, demonstração, convite, fecho) e recusa qualquer coisa com outra forma. Um
 * capítulo do vídeo longo tem QUATRO partes e regras próprias (não pode pedir nada,
 * não pode assinar, tem de acabar a puxar o capítulo seguinte). Forçar o formato de
 * um no outro era partir o leitor que corre todos os dias em produção — e esse
 * ficheiro está fora de alcance esta noite, de propósito.
 *
 * ═══ O QUE É REAPROVEITADO, QUE É O QUE IMPORTA ═══
 * A VOZ. `lib/voz-do-canal.js` continua a ser o sítio único da persona, dos vícios e
 * do que não se toca — lido pelo escritor do Short, pelo leitor do Short e por este.
 * Se um dia a voz mudar, muda num sítio e muda para os três.
 *
 * ═══ AS TRÊS REGRAS QUE TORNAM ISTO SEGURO (as mesmas, sem uma vírgula a menos) ═══
 * 1. Só mexe nas PALAVRAS: não inventa facto, não mexe em número, não toca no bordão.
 * 2. O resultado volta a passar pelas travas de VERDADE. Se as partir, fica o original.
 * 3. Se a chamada falhar, devolve o original sem drama. É um lucro, nunca um risco.
 *
 * ═══ E POR CAPÍTULO, NUNCA PELO VÍDEO INTEIRO ═══
 * É a lição das âncoras (§26.3 L1) aplicada à revisão: dar-lhe seis minutos de texto
 * de uma vez é convidá-lo a reescrever tudo, e a reescrita total é o pêndulo que já
 * nos custou dias. Ele lê ~200 palavras, arruma-as, e devolve-as.
 */

import { generateText } from '../../apis/kie-ai.js';
import { PERSONA, VICIOS, O_QUE_PRESERVAR } from './voz-do-canal.js';
import { BORDAO } from './schema-short.js';
import { PARTES_DO_CAPITULO } from './schema-longo.js';

function extrairJson(texto) {
  let s = String(texto).trim();
  const cerca = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (cerca) s = cerca[1].trim();
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a === -1 || b === -1) throw new Error('nenhum JSON na resposta do leitor');
  return JSON.parse(s.slice(a, b + 1));
}

export function buildPromptLeitorCapitulo(capitulo, { titulo, promessa, posicao, total }) {
  const partes = PARTES_DO_CAPITULO
    .map((p) => `[${p.toUpperCase()}]\n${capitulo[p]}`)
    .join('\n\n');

  return `Você é o EDITOR de um canal brasileiro de finanças. Alguém já escreveu o capítulo ${posicao} de ${total} de um vídeo de seis minutos. O seu trabalho NÃO é reescrever a história — é fazer com que ela soe como UMA PESSOA FALANDO.

QUEM FALA, E COM QUEM: ${PERSONA}

O VÍDEO PROMETEU ISTO: "${promessa}"
ESTE CAPÍTULO CHAMA-SE: "${titulo}"

════════ O CAPÍTULO A EDITAR ════════
${partes}

════════ COMO SE LÊ ISTO ════════
Leia em voz alta, como quem está a ver o vídeo, uma vez só, sem poder voltar atrás.
Em cada frase pergunte: **uma pessoa fala assim com outra pessoa?** Se a resposta for não, reescreva ESSA frase.

**O TESTE DO SENHOR DE 70 ANOS — faça-o palavra a palavra, é o mais importante daqui.**
Está a ler em voz alta para um senhor de setenta anos que saiu cedo da escola e nunca estudou finanças.
**Se ele parasse para perguntar "o que é isso?", a palavra está errada** — troque-a pela do dia a dia, sem mudar o sentido.
   ✗ "a parte restante" → ✓ "o que sobrou"
   ✗ "o valor remanescente" → ✓ "o resto"
   ✗ "efetuar o pagamento" → ✓ "pagar"

════════ O QUE ESTE CAPÍTULO TEM DE FAZER ════════
1. ABRIR com uma pergunta que dói, e responder-lhe já.
2. Mostrar UM número que se transforma à frente de quem ouve. Se há uma soma, quem ouve tem de conseguir somar junto.
3. O app aparece FAZENDO a conta, na primeira pessoa ("eu joguei isso no FinMoovi e ele me mostrou…"), nunca citado de passagem.
4. FECHAR deixando uma ponta no ar, para o capítulo seguinte a agarrar. Sem prometer nada que não seja deste vídeo.
5. Frases curtas, sujeito e verbo. Metáfora quase não existe — no máximo UMA comparação, com coisa que a pessoa já conhece.

════════ OS VÍCIOS A CAÇAR ════════
${VICIOS}

════════ O QUE NÃO SE TOCA ════════
${O_QUE_PRESERVAR}

════════ AS SUAS ALGEMAS — leia duas vezes ════════
⛔ NÃO invente factos, números, valores ou promessas. Nenhum número novo. Nenhum número alterado. Se há uma soma, ela continua a bater.
⛔ NÃO peça NADA a quem assiste: nem comentário, nem inscrição, nem curtir, nem link. Isso acontece uma única vez no vídeo, noutro bloco. Neste capítulo é proibido.
⛔ NÃO escreva o bordão do canal. Ele é a assinatura e vive só no último bloco. A frase é esta, e não é para usar aqui: "${BORDAO}"
⛔ NÃO cite percentagens nem taxas. Este vídeo não tem conta calculada.
⛔ NÃO acrescente nem tire partes: são quatro, com estes nomes e nesta ordem.
⛔ Mantenha o tamanho parecido — no máximo mais 5% de palavras que o original.
✓ Se uma parte já soa a gente, **deixe-a exatamente como está**. Editar de menos é melhor que editar de mais.

🇧🇷 **PORTUGUÊS DO BRASIL FALADO.** Nada de "está a fazer" (no Brasil é "tá fazendo"), nada de "ecrã" nem "telemóvel".

Responda APENAS com JSON válido, sem markdown:
{
  "pergunta": "...",
  "desenvolvimento": "...",
  "demonstracao": "...",
  "regancho": "...",
  "mexi": ["<em poucas palavras, o que mudou e porquê. SEM aspas dentro do texto.>"]
}`;
}

/**
 * Passa UM capítulo pelo polidor.
 * @param validar função que devolve { ok, erros } — as travas de VERDADE deste capítulo
 * @param limpar  a limpeza mecânica (números por extenso, travessões…) — corre ANTES de julgar,
 *                senão a edição inteira é deitada fora por um defeito que o código conserta sozinho
 * @returns { capitulo, mexi[], usada: 'leitor'|'original', motivo? } — NUNCA lança
 */
export async function polirCapitulo(capitulo, contexto, validar, { tentativas = 2, limpar = (x) => x } = {}) {
  const original = { capitulo, mexi: [], usada: 'original' };
  const base = buildPromptLeitorCapitulo(capitulo, contexto);
  let ultimoMotivo = 'não foi possível usar o polidor';

  for (let i = 1; i <= tentativas; i++) {
    const prompt = i === 1
      ? base
      : `${base}\n\n⚠️ A SUA RESPOSTA ANTERIOR FOI RECUSADA: ${ultimoMotivo}\nResponda só com o JSON pedido, sem aspas dentro dos textos.`;

    let bruto;
    try {
      // `pago: 'leitor'` = a fila claude-sonnet-5 → gemini-3-pro → gpt-5-2. Quem relê
      // não deve ser da família de quem escreveu (o escritor é o gpt-5-2), e por isso
      // o Gemini vem antes dele. Ver `provedoresPagos` em apis/kie-ai.js.
      bruto = await generateText(prompt, { maxTokens: 2000, temperature: 0.7, pago: 'leitor' });
    } catch (err) {
      ultimoMotivo = `a chamada ao polidor falhou (${err.message})`;
      continue;
    }

    let lido;
    try {
      lido = extrairJson(bruto);
    } catch (err) {
      ultimoMotivo = `o polidor não devolveu JSON (${err.message})`;
      continue;
    }

    const emFalta = PARTES_DO_CAPITULO.filter((p) => typeof lido[p] !== 'string' || !lido[p].trim());
    if (emFalta.length) {
      ultimoMotivo = `o polidor devolveu o capítulo sem as partes: ${emFalta.join(', ')}`;
      continue;
    }

    const revisto = limpar({
      ...capitulo,
      ...Object.fromEntries(PARTES_DO_CAPITULO.map((p) => [p, String(lido[p]).trim()])),
    });

    // A REDE POR BAIXO: a versão polida volta a passar pelas travas de VERDADE.
    const v = validar(revisto);
    if (!v.ok) {
      ultimoMotivo = `a versão do polidor foi recusada pelas travas: ${v.erros.join(' | ')}`;
      continue;
    }

    return {
      capitulo: revisto,
      mexi: Array.isArray(lido.mexi) ? lido.mexi.filter((m) => typeof m === 'string') : [],
      usada: 'leitor',
      tentativa: i,
    };
  }

  return { ...original, motivo: ultimoMotivo };
}
