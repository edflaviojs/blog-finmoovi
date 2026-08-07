/**
 * O ROBÔ QUE OLHA O VÍDEO ANTES DE ELE IR AO AR (07/08/2026).
 *
 * ═══ POR QUE EXISTE ═══
 * Até hoje **ninguém olhava o vídeo**. Há provas de mesa para os metadados, travas
 * para o texto, validação para o roteiro — e zero para a única coisa que o público vê.
 * Todos os defeitos visuais deste canal foram apanhados por acaso, dias depois. Um
 * deles (texto em português de Portugal na tela final) ia sair num vídeo por semana
 * para sempre.
 *
 * Método destilado da skill de motion design do Danilo Gato — o MÉTODO, não o código:
 * a dela é Python + Gemini + HyperFrames; esta é Node + Remotion, e a lista de
 * perguntas foi reescrita para o que ESTE canal precisa.
 *
 * ═══ 🔑 A DECISÃO QUE FAZ ISTO FUNCIONAR HOJE: FOTOGRAMAS, NÃO VÍDEO ═══
 * A skill de origem manda o MP4 inteiro ao Gemini. Tentou-se, e a conta do Google do
 * dono **não tem direito à camada gratuita**: varreram-se os 42 modelos com duas
 * chaves de dois projectos diferentes — 21 responderam `403 denied` e 21 responderam
 * `429 sem cota`. Nenhum funcionou. Não era o projecto; era a conta.
 *
 * Em vez de pedir ao dono para abrir a carteira, mediu-se o que se perdia: o próprio
 * manual do Gemini avisa que ele **amostra ~1 fotograma por segundo** — num vídeo de
 * 16s, ~16 imagens. Se o avaliador de qualquer forma vê fotogramas soltos, então
 * fotogramas soltos é o que se lhe manda. E aí serve **a IA que já pagamos**
 * (`gpt-5-2` pelo kie.ai), que aceita imagem e respondeu à primeira.
 *
 * O que se perde com isto, dito às claras: ele **não ouve o som** e **não vê o
 * movimento** entre um fotograma e o seguinte. O que se ganha: funciona hoje, custa o
 * que já se paga, e apanha a classe de defeito que mais nos morde — texto cortado,
 * texto por cima de texto, tela vazia, legenda tapada, e a emenda do loop.
 *
 * ═══ 🔴 A REGRA QUE NÃO SE NEGOCEIA: ELE AVISA, NUNCA TRAVA ═══
 * A skill original BLOQUEIA a entrega quando reprova. Aqui não pode. Ordem do dono:
 * *"não podemos correr o risco de não ter vídeo postado no dia"* — e o canal já ficou
 * dois dias sem vídeo por causa de uma trava. **Este programa sai sempre com sucesso.**
 *
 * Uso:
 *   node src/scripts/youtube/qa-visual.js --video=youtube-render/out/x.mp4
 *   node src/scripts/youtube/qa-visual.js --slug=loop-fatura-maior-nunca-faca
 *   node src/scripts/youtube/qa-visual.js --slug=... --so-a-tira     (nem chama a IA)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const REGISTO = join(ROOT, '.github', 'data', 'youtube-qa.json');

/**
 * O leitor. É o MESMO modelo que escreve os roteiros (gpt-5-2 pelo kie.ai), e a chave
 * é a que já está no repositório.
 *
 * ⚠️ Não passa pelo `generateText` de `apis/kie-ai.js` de propósito: aquela função
 * recebe o pedido como TEXTO, e uma imagem precisa da forma em lista
 * (`content: [{type:'text'}, {type:'image_url'}]`). Mudar a assinatura dela mexeria
 * nos 27 robôs do blog que a usam. Vinte linhas aqui valem mais que esse risco.
 */
const LEITOR = { url: 'https://api.kie.ai/gpt-5-2/v1/chat/completions', model: 'gpt-5-2' };

/** Abaixo disto o vídeo leva aviso no log. Não trava nada. */
export const NOTA_DE_AVISO = 7;

/** Oito fotogramas, em duas filas de quatro. */
const N_FOTOGRAMAS = 8;

// ─── a prova barata: A GRELHA DE FOTOGRAMAS ───────────────────────────────────

/**
 * Oito fotogramas do vídeo numa imagem só, em duas filas.
 *
 * ⚠️ **AS PONTAS SÃO SAGRADAS.** O primeiro fotograma é o 2 e o último é o
 * penúltimo — não o 0 e não o último. Motivo: no fotograma 0 as animações ainda não
 * arrancaram e no último podem já estar a sair, e era exactamente aí que se ia julgar
 * a emenda do loop. Julgar o loop por um fotograma vazio dava um veredito falso.
 *
 * Nunca lança: sem ffmpeg, devolve o motivo e o programa segue.
 */
export function tirarAGrelha(video, destino) {
  try {
    const dur = Number(String(execFileSync('ffprobe', [
      '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', video,
    ])).trim());
    if (!Number.isFinite(dur) || dur <= 0) throw new Error('duração ilegível');

    const total = Math.max(N_FOTOGRAMAS, Math.round(dur * 30));
    const numeros = [];
    for (let i = 0; i < N_FOTOGRAMAS; i++) {
      const bruto = Math.round((i / (N_FOTOGRAMAS - 1)) * (total - 1));
      numeros.push(Math.min(total - 3, Math.max(2, bruto)));
    }

    const seleccao = numeros.map((n) => `eq(n\\,${n})`).join('+');
    mkdirSync(dirname(destino), { recursive: true });
    execFileSync('ffmpeg', [
      '-loglevel', 'error', '-i', video,
      '-vf', `select='${seleccao}',scale=380:-1,tile=4x2`,
      '-frames:v', '1', '-q:v', '4', '-y', destino,
    ]);

    return {
      ok: true,
      caminho: destino,
      duracaoSec: dur,
      segundos: numeros.map((n) => +(n / 30).toFixed(1)),
    };
  } catch (err) {
    return { ok: false, motivo: err.message };
  }
}

// ─── a pergunta ───────────────────────────────────────────────────────────────

/**
 * A LISTA DE PERGUNTAS — reescrita para este canal. As três primeiras não existem na
 * skill de origem e são as que mais nos interessam: o loop, a faixa que o telemóvel
 * tapa, e o texto por cima de texto.
 */
export function montarPergunta({ formato, segundos, contexto }) {
  const ehLoop = formato === 'loop16';
  const mapa = segundos && segundos.length
    ? `\nOs ${segundos.length} quadros são, pela ordem de leitura (da esquerda para a direita, de cima para baixo), os segundos: ${segundos.join('s · ')}s.`
    : '';

  return `Você é um DIRETOR DE VÍDEO experiente. A imagem que recebeu são ${N_FOTOGRAMAS} quadros de um vídeo vertical curto de finanças pessoais, feito para o YouTube Shorts e o Instagram Reels. O público é uma família brasileira de classe média/baixa.${mapa}

⚠️ Você está vendo QUADROS PARADOS, não o vídeo. Não julgue som, nem movimento, nem transição — você não tem como ver isso. Julgue só o que um quadro parado mostra. Se não der para saber, diga "não dá para saber pelos quadros".

Dê nota de 0 a 10 e uma justificativa CURTA em cada ponto:

${ehLoop
    ? `1. O LOOP. Este vídeo foi feito para reiniciar sem a pessoa perceber. Compare o PRIMEIRO quadro com o ÚLTIMO: mostram a mesma coisa, no mesmo lugar? Se não, o que está diferente?`
    : `1. O PRIMEIRO QUADRO. Faria alguém parar de rolar o feed? O que ele promete?`}
2. A FAIXA DE BAIXO. Num celular, a interface cobre a parte inferior da tela (título, nome do canal, botões). Olhando o terço de baixo de cada quadro: há texto ou informação importante caindo aí?
3. TEXTO POR CIMA DE TEXTO. Em algum quadro há duas frases sobrepostas, ou uma palavra cortada, ou texto encostado na borda?
4. LEGIBILIDADE: tamanho de letra, contraste, texto pequeno demais para celular.
5. A TELA ESTÁ VIVA OU VAZIA? Em algum quadro há uma área grande sem nada?
6. COERÊNCIA: os quadros parecem do mesmo vídeo? A história avança de um para o outro?
7. TESTE CENTRAL: isto parece um VÍDEO PROFISSIONAL ou parecem SLIDES? Justifique numa frase.

Termine com, exactamente neste formato:

NOTA GERAL: <número de 0 a 10>
PROBLEMA 1: <o mais grave, dizendo em que quadro/segundo>
PROBLEMA 2: <...>
PROBLEMA 3: <...>
PRIMEIRA COISA A MUDAR: <uma frase>

Responda em português do Brasil, simples e direto.${contexto ? `\n\nO QUE ESTE VÍDEO DEVERIA ENTREGAR: ${contexto}` : ''}`;
}

// ─── a conversa com o leitor ──────────────────────────────────────────────────

async function perguntarAoLeitor(imagem, pergunta) {
  const chave = (process.env.KIE_AI_KEY || '').trim();
  if (!chave) throw new Error('sem KIE_AI_KEY no ambiente');

  const b64 = readFileSync(imagem).toString('base64');
  const r = await fetch(LEITOR.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${chave}` },
    body: JSON.stringify({
      model: LEITOR.model,
      max_tokens: 1200,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: pergunta },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${b64}` } },
        ],
      }],
    }),
  });

  const bruto = await r.text();
  let j;
  try { j = JSON.parse(bruto); } catch { throw new Error(`resposta ilegível (HTTP ${r.status})`); }

  /**
   * ⚠️ O kie.ai devolve HTTP 200 com um corpo de erro (medido: `{"code":422,...}` com
   * estado 200). Sem esta linha, uma falha passaria por sucesso e o veredito ficaria
   * vazio — que é exactamente o defeito "resposta da IA cortada em silêncio" já
   * registado neste repositório.
   */
  if (j.code && j.code >= 400) throw new Error(`o leitor recusou (${j.code}): ${j.msg || ''}`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);

  const texto = j.choices?.[0]?.message?.content;
  if (!texto || !String(texto).trim()) throw new Error('o leitor respondeu vazio');
  return String(texto).trim();
}

/** Tira a nota de dentro do texto. Sem nota, devolve null — e null não é zero. */
export function lerNota(texto) {
  const m = /NOTA\s*GERAL\s*:?\s*\**\s*([0-9]+(?:[.,][0-9]+)?)/i.exec(String(texto || ''));
  if (!m) return null;
  const n = Number(String(m[1]).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** O registo histórico — é o que depois se cruza com a retenção real. */
function guardar(entrada) {
  let lista = [];
  if (existsSync(REGISTO)) {
    try {
      const d = JSON.parse(readFileSync(REGISTO, 'utf-8'));
      if (Array.isArray(d)) lista = d;
    } catch { /* ilegível: recomeça — não vale falhar por isto */ }
  }
  lista = lista.filter((e) => e.slug !== entrada.slug);
  lista.push(entrada);
  mkdirSync(dirname(REGISTO), { recursive: true });
  writeFileSync(REGISTO, `${JSON.stringify(lista, null, 2)}\n`);
}

// ─── execução directa ─────────────────────────────────────────────────────────

const executadoDireto = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('qa-visual.js');
if (executadoDireto) {
  const flags = Object.fromEntries(
    process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => {
      const [k, ...v] = a.slice(2).split('=');
      return [k, v.join('=') || true];
    }),
  );

  const slug = typeof flags.slug === 'string' ? flags.slug : '';
  const video = typeof flags.video === 'string'
    ? flags.video
    : (slug ? join('youtube-render', 'out', `${slug}.mp4`) : '');

  (async () => {
    if (!video) {
      console.error('❌ diga qual vídeo: --video=<caminho.mp4> ou --slug=<slug>');
      process.exit(1);
    }
    if (!existsSync(video)) {
      console.error(`❌ vídeo não encontrado: ${video}`);
      process.exit(1);
    }

    const nome = slug || basename(video, '.mp4');
    const grelha = tirarAGrelha(video, join(ROOT, 'youtube-render', 'out', `qa-${nome}.jpg`));

    if (!grelha.ok) {
      console.log(`⚠️  não consegui tirar os fotogramas: ${grelha.motivo}`);
      console.log('    O vídeo segue na mesma — o QA nunca trava a publicação.');
      process.exit(0);
    }

    console.log(`🖼️  ${N_FOTOGRAMAS} fotogramas (${grelha.duracaoSec.toFixed(1)}s de vídeo): ${grelha.caminho}`);
    if (flags['so-a-tira']) process.exit(0);

    // O formato sai do roteiro, se existir — muda as perguntas.
    let formato = 'short50';
    const roteiro = join(ROOT, 'src', 'scripts', 'youtube', 'output', `${slug}.script.json`);
    if (slug && existsSync(roteiro)) {
      try { formato = JSON.parse(readFileSync(roteiro, 'utf-8')).formato || 'short50'; } catch { /* padrão */ }
    }

    try {
      const veredito = await perguntarAoLeitor(grelha.caminho, montarPergunta({
        formato,
        segundos: grelha.segundos,
        contexto: typeof flags.contexto === 'string' ? flags.contexto : '',
      }));

      const nota = lerNota(veredito);
      console.log('\n────────── O QUE O LEITOR VIU ──────────\n');
      console.log(veredito);
      console.log('\n────────────────────────────────────────');

      guardar({
        slug: nome, formato, nota, leitor: LEITOR.model,
        fotogramas: grelha.segundos, veredito,
        quando: new Date().toISOString(),
      });

      if (nota === null) {
        console.log('\n⚠️  o leitor não deu nota no formato pedido — fica só o texto.');
      } else if (nota < NOTA_DE_AVISO) {
        // Aviso do GitHub Actions: visível na corrida, SEM a pôr a vermelho.
        console.log(`\n::warning::o vídeo ${nome} levou ${nota}/10 do leitor (abaixo de ${NOTA_DE_AVISO}) — vale a pena olhar`);
      } else {
        console.log(`\n✅ nota ${nota}/10.`);
      }
    } catch (err) {
      /**
       * ⚠️ AQUI TAMBÉM NÃO SE FALHA. Chave em falta, provedor em baixo, cota
       * esgotada — nada disso pode custar o vídeo do dia. Diz-se alto e segue-se.
       */
      console.log(`\n⚠️  o leitor não deu resposta: ${err.message}`);
      console.log('    Os fotogramas ficaram gravados na mesma, e o vídeo segue — o QA nunca trava a publicação.');
    }
    process.exit(0);
  })();
}
