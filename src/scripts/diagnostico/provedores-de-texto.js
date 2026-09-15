/**
 * provedores-de-texto.js — porque é que a Cerebras e o Groq devolvem "resposta vazia".
 *
 * MOTIVO DE EXISTIR (medido em 15/09/2026, corrida 35027081232 do `gsc-otimizar-ctr`):
 * das 23 páginas candidatas a reescrita de title/meta, **22 foram puladas** e 5 delas
 * com `título rejeitado (comprimento 0)`. O log mostrou, em TODAS as tentativas:
 *
 *     ⚠️ cerebras: resposta vazia — tentando próximo provedor...
 *     ⚠️ groq: resposta vazia — tentando próximo provedor...
 *
 * Os dois usam `gpt-oss-120b`, que RACIOCINA antes de responder. O `gsc-otimizar-ctr`
 * pede `maxTokens: 400` — o segundo valor mais baixo dos 27 robôs (os outros pedem
 * 2000 a 5000). A hipótese é que o raciocínio consome o orçamento e o campo
 * `message.content` volta vazio, com `finish_reason: "length"`.
 *
 * ISTO NÃO ESCREVE NADA. Só mede e imprime. Não commita, não toca em conteúdo.
 *
 * ⚠️ POR QUE UM DIAGNÓSTICO E NÃO UMA LEITURA DO CÓDIGO: `generateText` colapsa
 * qualquer corpo sem `choices[0].message.content` na mesma frase — "resposta vazia".
 * Chave errada, modelo retirado, orçamento curto e filtro de conteúdo dão todos a
 * MESMA mensagem. Só o corpo cru da resposta separa as quatro.
 */

const PROMPT_REAL =
  'Você é editor de SEO. Reescreva o TÍTULO e a META DESCRIÇÃO de um artigo para ' +
  'AUMENTAR o CTR na busca do Google, em português do Brasil.\n' +
  'Busca principal que traz esta página: "como reduzir gastos mensais"\n' +
  'Título atual: "Como organizar suas despesas mensais com facilidade e segurança"\n\n' +
  'REGRAS: mantenha o MESMO tema; título com 50–60 caracteres; meta com 150–160 ' +
  'caracteres. Não use aspas.\n\n' +
  'Formato EXATO:\n---TITULO---\n[título]\n---META---\n[meta]';

/** O controle FALSO: se ISTO também vier vazio, a causa não é o orçamento. */
const PROMPT_TRIVIAL = 'Responda apenas com a palavra: funcionando';

function provedores() {
  const out = [];
  if (process.env.CEREBRAS_API_KEY) {
    out.push({
      nome: 'cerebras', modelo: 'gpt-oss-120b',
      url: 'https://api.cerebras.ai/v1/chat/completions', chave: process.env.CEREBRAS_API_KEY,
    });
  }
  const groq = process.env.GROQ_API_KEY || process.env.KIE_API_KEY;
  if (groq) {
    out.push({
      nome: 'groq', modelo: 'openai/gpt-oss-120b',
      url: 'https://api.groq.com/openai/v1/chat/completions', chave: groq,
    });
  }
  return out;
}

async function umaCorrida(prov, prompt, maxTokens, etiqueta, extra = {}) {
  const corpo = {
    model: prov.modelo,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: maxTokens,
    temperature: 0.7,
    ...extra,
  };
  let r;
  try {
    r = await fetch(prov.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${prov.chave}` },
      body: JSON.stringify(corpo),
    });
  } catch (e) {
    console.log(`  ${etiqueta}: ERRO DE REDE — ${e.message}`);
    return;
  }

  if (!r.ok) {
    const txt = await r.text().catch(() => '');
    console.log(`  ${etiqueta}: HTTP ${r.status} — ${txt.slice(0, 200)}`);
    return;
  }

  const d = await r.json();
  const msg = d.choices?.[0]?.message || {};
  const fim = d.choices?.[0]?.finish_reason ?? '(sem finish_reason)';
  const conteudo = msg.content || '';
  // O nome do campo de raciocínio varia por fornecedor — procura-se qualquer um.
  const campoRaciocinio = ['reasoning', 'reasoning_content', 'thinking']
    .find(k => typeof msg[k] === 'string' && msg[k].length > 0);
  const raciocinio = campoRaciocinio ? msg[campoRaciocinio] : '';

  console.log(`  ${etiqueta}:`);
  console.log(`     finish_reason .......... ${fim}`);
  console.log(`     content ................ ${conteudo.length} caracteres${conteudo.length === 0 ? '  <-- É AQUI QUE DÁ "resposta vazia"' : ''}`);
  console.log(`     campo de raciocínio .... ${campoRaciocinio || '(nenhum)'}${raciocinio ? ` — ${raciocinio.length} caracteres` : ''}`);
  if (d.usage) {
    console.log(`     fichas ................. entrada ${d.usage.prompt_tokens} · saída ${d.usage.completion_tokens}`);
    const raciocinioFichas = d.usage.completion_tokens_details?.reasoning_tokens;
    if (raciocinioFichas !== undefined) console.log(`     fichas SÓ de raciocínio  ${raciocinioFichas}`);
  }
  if (conteudo) console.log(`     tem o formato ---TITULO---? ${/---TITULO---/.test(conteudo) ? 'SIM' : 'NÃO'}`);
  if (conteudo) console.log(`     primeiros 120 car. ...... ${JSON.stringify(conteudo.slice(0, 120))}`);
  if (!conteudo && campoRaciocinio) {
    console.log(`     ↳ o modelo FALOU (${raciocinio.length} car. de raciocínio) mas não escreveu resposta.`);
  }
}

async function main() {
  const ps = provedores();
  if (!ps.length) { console.log('ℹ️ Sem chaves de IA no ambiente. Nada a medir (exit 0).'); return; }

  console.log('🔬 Diagnóstico dos provedores de texto');
  console.log(`   provedores com chave: ${ps.map(p => p.nome).join(', ')}\n`);

  for (const p of ps) {
    console.log(`━━━ ${p.nome} (${p.modelo}) ━━━`);
    // 1. Exatamente o que o robô de CTR faz hoje. Deve reproduzir a falha.
    await umaCorrida(p, PROMPT_REAL, 400, 'A) prompt real, 400 fichas (o que o robô faz HOJE)');
    // 2. A mesma coisa com orçamento folgado. Se AQUI vier conteúdo, a causa é o orçamento.
    await umaCorrida(p, PROMPT_REAL, 2000, 'B) prompt real, 2000 fichas (a hipótese)');
    // 3. CONTROLE FALSO: pergunta trivial e orçamento pequeno. Se isto vier vazio,
    //    a causa NÃO é o orçamento nem o raciocínio — é chave, modelo ou conta.
    await umaCorrida(p, PROMPT_TRIVIAL, 400, 'C) CONTROLE — pergunta trivial, 400 fichas');
    // 4. A CURA CANDIDATA. Na 1ª corrida (15/09) o A veio vazio nos dois e o B só
    //    salvou o Groq: a Cerebras gastou 1997 das 2000 fichas a raciocinar e ficou
    //    outra vez truncada. Subir o orçamento trata o sintoma e paga raciocínio a
    //    peso. O `reasoning_effort` do gpt-oss corta o raciocínio na origem —
    //    escrever um título de 60 caracteres não precisa de 5.660 de pensamento.
    await umaCorrida(p, PROMPT_REAL, 400, 'D) CURA — prompt real, 400 fichas + reasoning_effort:low', { reasoning_effort: 'low' });
    await umaCorrida(p, PROMPT_REAL, 1000, 'E) CURA — prompt real, 1000 fichas + reasoning_effort:low', { reasoning_effort: 'low' });
    console.log('');
  }

  console.log('COMO LER:');
  console.log('  A vazio + B com texto  -> o orçamento de 400 fichas é a causa.');
  console.log('  A vazio + B vazio + C com texto -> o modelo raciocina demais para este prompt.');
  console.log('  C vazio também -> não é orçamento: é chave, modelo retirado ou conta.');
  console.log('  D com texto -> a cura é cortar o raciocínio, e nem precisa de mais fichas.');
  console.log('  D vazio + E com texto -> precisa das duas coisas: cortar E dar mais folga.');
}

main().catch(e => { console.error('❌ diagnóstico:', e.message); process.exit(1); });
