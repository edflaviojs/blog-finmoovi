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

/**
 * O PROMPT DO ROBÔ, PALAVRA POR PALAVRA.
 *
 * ⚠️ NA 1ª VERSÃO DESTE FICHEIRO EU ENCURTEI-O — e deixei de fora precisamente a
 * linha que PROÍBE abrir a meta com "Descubra". As cinco respostas bem-sucedidas
 * abriram todas com "Descubra", e eu quase concluí que o modelo desobedece à
 * proibição. Nunca lha tinha enviado. Um teste com prompt aproximado mede o
 * modelo a responder a OUTRA pergunta.
 *
 * Mantido em sincronia com `gsc-otimizar-ctr.js`. Se o prompt de lá mudar, este
 * muda no mesmo commit — senão o diagnóstico volta a medir outra coisa.
 */
const LANG_PT = 'português do Brasil';
const PROMPT_REAL =
  `Você é editor de SEO. Reescreva o TÍTULO e a META DESCRIÇÃO de um artigo para AUMENTAR o CTR na busca do Google, em ${LANG_PT}.\n` +
  `Busca principal que traz esta página: "como reduzir gastos mensais"\nTítulo atual: "Como organizar suas despesas mensais com facilidade e segurança"\n\n` +
  `REGRAS: mantenha o MESMO tema/assunto (não invente novo); título com 50–60 caracteres, keyword no início, atraente e honesto (sem clickbait falso, sem inventar números/estatísticas); meta com 150–160 caracteres, clara e com chamada para ação suave. Não use aspas.\n` +
  `PROIBIDO abrir a meta com "Descubra", "Aprenda", "Saiba" ou "Entenda" — são aberturas vazias e já estão em metade do blog. A meta tem de dizer o que o leitor leva dali: a coisa concreta que o artigo entrega (quantos passos, qual a conta, o que muda). Se o artigo tiver um número, use ESSE número; se não tiver, não invente nenhum.\n\n` +
  `Formato EXATO:\n---TITULO---\n[título]\n---META---\n[meta]`;

/** A trava de verdade do robô, copiada de `gsc-otimizar-ctr.js`. */
const ABERTURA_VAZIA = /^\s*(descubr|aprend|saib|entend|conhe[çc]|veja como|discover|learn how|find out|understand|conoce|aprende|descubre)/i;

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
  if (!conteudo && campoRaciocinio) {
    console.log(`     ↳ o modelo FALOU (${raciocinio.length} car. de raciocínio) mas não escreveu resposta.`);
    return;
  }
  if (!conteudo) return;

  // ── O QUE IMPORTA: o ROBÔ teria aceitado isto? ──────────────────────────────
  // Ter texto não é ter entrega. Na corrida real de 15/09 o robô recebeu texto da
  // rede de segurança e rejeitou-o em 5 páginas. Medir só "veio conteúdo" responde
  // à pergunta errada — as travas do robô é que decidem se a página muda.
  const mt = conteudo.match(/---TITULO---\s*([\s\S]*?)(?=---META---|$)/);
  const mm = conteudo.match(/---META---\s*([\s\S]*?)$/);
  const titulo = mt ? mt[1].trim().replace(/\s+/g, ' ') : '';
  const meta = mm ? mm[1].trim().replace(/\s+/g, ' ') : '';

  const okFormato = Boolean(mt && mm);
  const okTitulo = titulo.length >= 20 && titulo.length <= 65;
  const okMeta = meta.length >= 80 && meta.length <= 165;
  const okAbertura = meta ? !ABERTURA_VAZIA.test(meta) : false;
  const passa = okFormato && okTitulo && okMeta && okAbertura;

  console.log(`     formato ---TITULO---/---META--- ... ${okFormato ? 'OK' : 'FALTA'}`);
  console.log(`     título ${titulo.length} car. (20–65) ......... ${okTitulo ? 'OK' : 'REPROVA'}`);
  console.log(`     meta ${meta.length} car. (80–165) .......... ${okMeta ? 'OK' : 'REPROVA'}`);
  console.log(`     abertura da meta .................. ${okAbertura ? 'OK' : `REPROVA — abre com "${meta.split(' ')[0]}"`}`);
  console.log(`     >>> O ROBÔ TERIA ACEITADO? ....... ${passa ? '✅ SIM' : '❌ NÃO'}`);
  console.log(`     título .... ${JSON.stringify(titulo)}`);
  console.log(`     meta ...... ${JSON.stringify(meta.slice(0, 170))}`);
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
    // 4. A CURA CANDIDATA, REPETIDA 3×.
    //
    //    Na 2ª corrida o `reasoning_effort:low` com 400 fichas salvou a Cerebras
    //    (27 fichas de raciocínio) e NÃO salvou o Groq (398 — vazio outra vez),
    //    mas com 1000 fichas o Groq gastou 30. Mesmos parâmetros, resultados
    //    diferentes: há VARIAÇÃO, e com temperatura 0.7 o raciocínio também varia.
    //    Uma corrida verde não prova cura — por isso 3× cada.
    for (const n of [1, 2, 3]) {
      await umaCorrida(p, PROMPT_REAL, 400, `D${n}) CURA — 400 fichas + reasoning_effort:low`, { reasoning_effort: 'low' });
    }
    for (const n of [1, 2, 3]) {
      await umaCorrida(p, PROMPT_REAL, 1000, `E${n}) CURA — 1000 fichas + reasoning_effort:low`, { reasoning_effort: 'low' });
    }
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
