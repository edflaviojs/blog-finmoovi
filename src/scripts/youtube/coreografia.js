/**
 * PASSAGEM 2 — A COREOGRAFIA (IMPLEMENTACAO20 §20.3).
 *
 * Recebe a narração JÁ APROVADA pela passagem 1 e escreve SÓ o visual: que imagem
 * entra, em que palavra, com que som. Zero regras de narrativa — o texto está
 * fechado e não se toca nele.
 *
 * ═══ A DECISÃO QUE JUSTIFICA ESTE FICHEIRO ═══
 * MEDIDO nos últimos 6 vídeos de produção: **5 tiveram erro de palavra-âncora**, e
 * em 2 deles um shot foi APAGADO do vídeo ("âncora X não aparece na narração —
 * shot REMOVIDO"). O modelo escrevia a palavra de cabeça e inventava.
 *
 * A correção não é mais uma trava: é **tirar-lhe a caneta**. Aqui ele recebe a
 * narração com as palavras NUMERADAS e escolhe o NÚMERO. O código converte o
 * número na palavra real. **É impossível inventar uma âncora que não existe.**
 * Mesmo princípio do simulador de números (§19.3): o que pode ser calculado não
 * se pede ao modelo.
 *
 * Pela mesma razão, a DURAÇÃO de cada cena é calculada aqui (palavras ÷ 2,6 — a
 * taxa medida no TTS real), não pedida.
 *
 * Uso:
 *   node src/scripts/youtube/coreografia.js --slug=EDITORIAL:erros-cartao-credito
 * (corre a passagem 1 e a 2, imprime o roteiro completo e o resultado do validador
 *  — NÃO renderiza, NÃO publica, NÃO commita)
 */

import { generateText } from '../apis/kie-ai.js';
// A música deste vídeo sai daqui, do TEMA — não se pergunta ao modelo. Ver `musica.js`.
import { escolherTrilha } from './lib/musica.js';
import { keywordFalada, semAcento } from './lib/palavras.js';
import { readFileSync as lerFicheiro } from 'node:fs';
import { join as joinPath } from 'node:path';
import {
  validateShortScript, VISUAL_TYPES, METAPHORS, ICONS, SFX, APP_SCREENS, MAX_SHOTS, MAX_TOTAL_SEC,
} from './lib/schema-short.js';

// A mesma taxa MEDIDA no log real do TTS que a passagem 1 usa (§19.5).
const PALAVRAS_POR_SEGUNDO = 2.6;

// Os 6 blocos da passagem 1, na ordem, e o papel de cena que cada um vira.
// O validador exige: 1 "hook" (1ª), 1 "cta" (penúltima), 1 "outro" (última), ≥1 "beat".
const PAPEL_DA_CENA = {
  gancho: 'hook', empatia: 'beat', virada: 'beat', demonstracao: 'beat', convite: 'cta', fecho: 'outro',
};
const ORDEM_DOS_BLOCOS = ['gancho', 'empatia', 'virada', 'demonstracao', 'convite', 'fecho'];

/**
 * As palavras que podem servir de âncora, NUMERADAS.
 * Só entram palavras com 4+ caracteres: "de", "o", "que" não são âncoras — a imagem
 * tem de entrar numa palavra com peso. O número é a posição nesta lista, e a lista
 * segue a ordem da fala, o que garante de graça a regra "shots na ordem em que as
 * palavras são ditas".
 */
export function palavrasAncoraveis(fala) {
  const lista = [];
  for (const bruto of String(fala || '').split(/\s+/).filter(Boolean)) {
    const limpa = bruto.replace(/[^\p{L}\p{N}$%]/gu, '');
    if (limpa.length >= 4) lista.push({ n: lista.length + 1, palavra: limpa });
  }
  return lista;
}

/**
 * ⚠️ `keywordFalada` E `semAcento` MUDARAM-SE PARA `lib/palavras.js` (02/08/2026),
 * e isso desfez um **círculo que impedia o robô diário de arrancar**.
 *
 * Em 01/08 a passagem 1 passou a importar esta função daqui, e este ficheiro, quando
 * corre sozinho (que é como o robô o chama), espera no fim para ir buscar a passagem
 * 1. As duas ficavam à espera uma da outra: o processo morria em silêncio, sem erro.
 * O defeito entrou 4h39m DEPOIS de o robô ter sido desligado, por isso nunca correu.
 * A explicação completa está no cabeçalho de `lib/palavras.js`.
 *
 * Continua a ser re-exportada daqui para quem já a importava deste sítio.
 */
export { keywordFalada };

/** Duração da cena a partir das palavras — calculada, nunca pedida ao modelo. */
export function duracaoDoBloco(fala) {
  const palavras = String(fala || '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round((palavras / PALAVRAS_POR_SEGUNDO) * 10) / 10);
}

// ─── o prompt ────────────────────────────────────────────────────────────────
// SÓ VISUAL. Nada de estrutura narrativa, funil, bordão ou fio condutor — isso já
// foi decidido e aprovado na passagem 1. É a separação que a §19.1 mediu: o prompt
// antigo gastava 11.702 chars a ensinar a animar e só 2.965 a escrever.
export function buildPromptCoreografia(t, narrativa) {
  const blocos = narrativa.blocos.map((b) => {
    const palavras = palavrasAncoraveis(b.fala);
    return [
      `── ${b.papel.toUpperCase()} (cena ${ORDEM_DOS_BLOCOS.indexOf(b.papel) + 1}, ~${duracaoDoBloco(b.fala)}s) ──`,
      `fala: "${b.fala}"`,
      `palavras disponíveis: ${palavras.map((p) => `${p.n}=${p.palavra}`).join('  ')}`,
    ].join('\n');
  }).join('\n\n');

  return `Você é DIRETOR DE ARTE de um canal brasileiro de finanças. A narração já está escrita e APROVADA — você NÃO a altera, nem uma vírgula.

SUA ÚNICA TAREFA: dizer o que aparece na TELA e que som toca, em cada momento da fala.

TEMA: "${t.term}"
IMAGEM DO VÍDEO (o fio condutor, já escolhido): ${narrativa.fioCondutor}

════════ A NARRAÇÃO, COM AS PALAVRAS NUMERADAS ════════
${blocos}

════════ COMO SE ESCOLHE O MOMENTO ════════
Cada shot entra na tela no instante em que uma palavra é FALADA. Você escolhe essa palavra pelo NÚMERO da lista de cima — nunca escrevendo a palavra.
⛔ Os números de um bloco têm de ir SEMPRE A SUBIR (2, 5, 9). Nunca repetir, nunca voltar atrás.
⛔ Só números que existem na lista daquele bloco.

════════ QUANTOS SHOTS ════════
**2 a 4 shots por bloco.** Menos que 2 e a tela fica parada; mais que 4 num bloco de 10 segundos e vira pisca-pisca. Máximo absoluto: ${MAX_SHOTS}.

════════ O QUE PODE APARECER NA TELA ════════
- {"type":"statement","text":"<até 6 palavras>"} — uma frase curta na tela
- {"type":"number","text":"R$ 500"} — um valor em destaque, MACRO
- {"type":"counter","from":<n>,"to":<n>,"prefix":"R$"} — um número que sobe sozinho
- {"type":"metaphor","metaphor":"<nome do catálogo>"} — a imagem física animada
- {"type":"icon","icon":"<nome do catálogo>"} — um ícone simples
- {"type":"app","app":"<tela do catálogo>","note":"<o que se vê>"} — o app FinMoovi de verdade
- {"type":"chart","text":"<legenda>"} · {"type":"list","text":"…"} · {"type":"formula","text":"…"}

CATÁLOGOS (fora deles o roteiro é rejeitado):
· imagens: ${METAPHORS.join(', ')}
· ícones: ${ICONS.join(', ')}
· telas do app: ${APP_SCREENS.join(', ')}
· sons: ${SFX.join(', ')}

════════ AS QUATRO REGRAS QUE REPROVAM ════════
1. **A imagem do vídeo é "${narrativa.fioCondutor}" e só ela.** Cada vez que ela for MENCIONADA na fala, ponha UM shot {"type":"metaphor","metaphor":"${narrativa.fioCondutor}"}. Nunca use outra imagem do catálogo neste vídeo.
   ⛔ **UM shot por MENÇÃO, não um por palavra.** O nome da imagem pode ocupar várias palavras seguidas ("mochila de pedras" são três). Isso é UMA menção: escolha **só uma** dessas palavras — a mais forte — e ignore as outras.
   ⛔ **Nunca dois shots seguidos com o mesmo visual.** A animação recomeçaria do zero à frente de quem assiste e você desperdiçaria um lugar de imagem. Entre duas aparições da imagem tem de haver outra coisa na tela.
2. **O bloco CONVITE termina com** {"type":"metaphor","metaphor":"clique-link"} — é a mãozinha que toca no botão de comentar. Som "click".
3. **O bloco DEMONSTRACAO precisa de UM shot do app**, e ele entra numa das PRIMEIRAS palavras do bloco: a tela do app tem de ficar visível uns 4 segundos, e se entrar no fim do bloco não dá tempo.
4. **O som é TEMPERO: no MÁXIMO METADE dos shots leva som.** Se todos tocarem alguma coisa, cansa — o dono já reclamou disto. E o mesmo som não pode aparecer mais de 3× no vídeo inteiro. Para deixar em silêncio, basta omitir o campo "sfx".

════════ ONDE O APP PODE E NÃO PODE ENTRAR ════════
· A tela do app precisa de **~4 segundos de fala à frente dela**, senão mal aparece.
· ⛔ **Nunca ponha o app no CONVITE nem no FECHO** — são os blocos mais curtos e não dão esse tempo. O roteiro seria rejeitado.
· ⛔ Nunca ponha o app na última palavra de um bloco, pela mesma razão.
· Um segundo shot do app é bem-vindo, mas só num bloco LONGO (VIRADA ou DEMONSTRACAO).

════════ TEXTO NA TELA ════════
Curto. A pessoa lê de relance, no telemóvel, enquanto ouve. Até 6 palavras.
⛔ O texto da tela NÃO repete a frase falada — ou destaca a parte que importa, ou mostra o número.

Responda APENAS com JSON válido, sem markdown:
{
  "introFrase": "<a PRIMEIRA FRASE do bloco 1, COPIADA À LETRA, sem tirar nem pôr uma palavra — só com a parte forte entre *asteriscos*. NÃO invente uma frase nova: o que está escrito na capa é o que a voz diz nesse instante>",
  "ctaTexto": "<até 7 palavras, o título que aparece por cima do botão de comentar>",
  "blocos": [
    { "papel": "gancho", "shots": [ { "ancoraIndice": 2, "visual": { "type": "statement", "text": "…" }, "sfx": "boom" } ] },
    { "papel": "empatia", "shots": [] },
    { "papel": "virada", "shots": [] },
    { "papel": "demonstracao", "shots": [] },
    { "papel": "convite", "shots": [] },
    { "papel": "fecho", "shots": [] }
  ]
}`;
}

/**
 * A "impressão digital" de um shot — o que o espectador vê.
 *
 * Dois shots com a MESMA chave, um a seguir ao outro, são o defeito que o dono
 * apanhou no vídeo de 31/07 (§21.6): a animação recomeça do zero à frente dele e
 * um lugar de imagem vai ao lixo.
 *
 * Imagens/ícones/telas comparam-se pelo NOME. Os visuais de texto só contam como
 * repetição quando dizem EXATAMENTE o mesmo — dois "statement" com frases
 * diferentes são cortes legítimos e não podem ser reprovados.
 */
export function chaveVisual(v) {
  if (!v || typeof v !== 'object') return null;
  if (v.type === 'metaphor') return `imagem "${v.metaphor}"`;
  if (v.type === 'icon') return `ícone "${v.icon}"`;
  if (v.type === 'app') return `tela do app "${v.app}"`;
  const texto = typeof v.text === 'string' ? v.text.trim().toLowerCase() : '';
  return texto ? `${v.type} "${texto}"` : null;
}

// ─── validação do PLANO (antes de virar roteiro) ─────────────────────────────
// Só o que é mecânico e local. O resto (sons repetidos, tempo de tela do app,
// duração total) fica para o `validateShortScript`, que já existe e é bom.
export function validarPlano(plano, narrativa) {
  const erros = [];
  if (!plano || typeof plano !== 'object') return { ok: false, erros: ['resposta não é objeto'] };

  const blocos = Array.isArray(plano.blocos) ? plano.blocos : [];
  if (blocos.length !== ORDEM_DOS_BLOCOS.length) {
    erros.push(`precisa de ${ORDEM_DOS_BLOCOS.length} blocos (veio ${blocos.length})`);
  }

  blocos.forEach((b, i) => {
    const papel = ORDEM_DOS_BLOCOS[i];
    const tag = `bloco ${i + 1} (${papel})`;
    if (!b || b.papel !== papel) { erros.push(`${tag}: papel deve ser "${papel}" (veio "${b?.papel}")`); return; }

    const shots = Array.isArray(b.shots) ? b.shots : [];
    if (shots.length < 2) erros.push(`${tag}: ${shots.length} shot(s) — o mínimo é 2, senão a tela fica parada`);
    if (shots.length > 4) erros.push(`${tag}: ${shots.length} shots — o máximo é 4, senão vira pisca-pisca`);

    const disponiveis = palavrasAncoraveis(narrativa.blocos[i]?.fala);
    let anterior = 0;
    shots.forEach((s, j) => {
      const stag = `${tag} shot ${j + 1}`;
      const idx = Number(s?.ancoraIndice);
      if (!Number.isInteger(idx) || idx < 1 || idx > disponiveis.length) {
        erros.push(`${stag}: ancoraIndice ${s?.ancoraIndice} não existe (este bloco vai de 1 a ${disponiveis.length})`);
      } else if (idx <= anterior) {
        erros.push(`${stag}: ancoraIndice ${idx} não sobe (o anterior foi ${anterior}) — os shots seguem a ordem da fala`);
      } else {
        anterior = idx;
      }

      const v = s?.visual;
      if (!v || !VISUAL_TYPES.includes(v.type)) { erros.push(`${stag}: visual.type inválido`); return; }
      if (v.type === 'metaphor' && !METAPHORS.includes(v.metaphor)) erros.push(`${stag}: metáfora "${v.metaphor}" fora do catálogo`);
      if (v.type === 'icon' && !ICONS.includes(v.icon)) erros.push(`${stag}: ícone "${v.icon}" fora do catálogo`);
      if (v.type === 'app' && !APP_SCREENS.includes(v.app)) erros.push(`${stag}: tela "${v.app}" fora do catálogo`);
      if (s.sfx && !SFX.includes(s.sfx)) erros.push(`${stag}: som "${s.sfx}" fora do catálogo`);

      // A REGRA 1 com dentes: neste vídeo só existe UMA imagem física.
      if (v.type === 'metaphor' && v.metaphor !== narrativa.fioCondutor && v.metaphor !== 'clique-link') {
        erros.push(`${stag}: imagem "${v.metaphor}" — o fio condutor deste vídeo é "${narrativa.fioCondutor}" e não se troca no meio`);
      }
    });
  });

  // A REGRA 3 com dentes.
  const demo = blocos[ORDEM_DOS_BLOCOS.indexOf('demonstracao')];
  if (demo && !(demo.shots || []).some((s) => s?.visual?.type === 'app')) {
    erros.push('o bloco "demonstracao" não tem shot do app — todo vídeo do canal mostra o FinMoovi a agir');
  }
  // A REGRA 2 com dentes.
  const convite = blocos[ORDEM_DOS_BLOCOS.indexOf('convite')];
  const ultimoDoConvite = convite && (convite.shots || [])[(convite.shots || []).length - 1];
  if (!ultimoDoConvite || ultimoDoConvite.visual?.metaphor !== 'clique-link') {
    erros.push('o bloco "convite" não termina com a mãozinha ("clique-link") a tocar no botão de comentar');
  }

  // A REGRA 1 com dentes, parte 2 — O MESMO VISUAL DUAS VEZES SEGUIDAS (§21.6).
  // MEDIDO no vídeo de 31/07: aconteceu em 4 das 6 cenas. "mochila de pedras" são
  // duas palavras seguidas na lista de âncoras e o modelo pôs um shot em CADA uma.
  // Não era desobediência: a regra 1 dizia "SEMPRE que ela for falada, ponha um
  // shot" — o prompt mandava fazer exatamente o que agora se reprova. Por isso a
  // regra 1 foi reescrita no MESMO commit que esta trava (lição do §19.9).
  // Não é sistémico de uma imagem só: 9 das 32 do catálogo têm nome de duas ou mais
  // palavras (bola de neve, castelo de cartas, areia movediça…), logo isto voltaria
  // a acontecer sozinho.
  // A varredura é sobre a SEQUÊNCIA INTEIRA, não bloco a bloco: o último shot de um
  // bloco e o primeiro do seguinte também aparecem colados na tela.
  const seguidos = blocos.flatMap((b, i) => (Array.isArray(b?.shots) ? b.shots : []).map((s, j) => ({
    chave: chaveVisual(s?.visual), onde: `bloco ${i + 1} (${ORDEM_DOS_BLOCOS[i]}) shot ${j + 1}`,
  })));
  for (let i = 1; i < seguidos.length; i++) {
    const atual = seguidos[i];
    const anterior = seguidos[i - 1];
    if (atual.chave && atual.chave === anterior.chave) {
      erros.push(
        `${atual.onde}: ${atual.chave} outra vez logo a seguir ao ${anterior.onde} — `
        + 'a animação recomeça do zero e gasta um lugar de imagem. Se a imagem tem várias '
        + 'palavras no nome, escolha SÓ UMA delas e use as outras âncoras para outro visual.',
      );
    }
  }

  /**
   * A CAPA DIZ O QUE A VOZ DIZ (02/08/2026) — ideia do dono, e tem conta por trás.
   *
   * Até aqui a capa mostrava uma frase INVENTADA aqui, e a voz dizia outra coisa por
   * cima. O dono, ao ver o vídeo: *"o gancho correto pro início deveria ser falar o
   * que está escrito na primeira cena… e com o homem caindo, isso sim seria um gancho
   * de respeito"*.
   *
   * A conta dá-lhe razão: a capa fica **3,5s** no ecrã e a voz entra aos **0,9s** —
   * são 2,6s de voz sobre a capa, que a 2,76 palavras/s dão **~7 palavras**. Ou seja,
   * a primeira frase falada CABE inteira na capa. Ler e ouvir a mesma coisa ao mesmo
   * tempo bate com muito mais força do que ler uma e ouvir outra.
   *
   * Por isso a frase da capa deixa de ser inventada: é a 1ª frase do bloco 1, copiada.
   * O modelo só escolhe qual a palavra a destacar (os *asteriscos*) — e o código
   * confere que não mexeu em mais nada. Uma fonte, um sítio.
   */
  if (!plano.introFrase || typeof plano.introFrase !== 'string') erros.push('sem "introFrase"');
  else {
    const primeiraFrase = String(narrativa?.blocos?.[0]?.fala || '').split(/(?<=[.!?…])\s+/)[0] || '';
    const limpar = (s) => String(s).replace(/\*/g, '').replace(/\s+/g, ' ').trim().toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (primeiraFrase && limpar(plano.introFrase) !== limpar(primeiraFrase)) {
      erros.push(
        `"introFrase" não é a 1ª frase do bloco 1. Copie-a à letra e ponha só os *asteriscos*: "${primeiraFrase}" `
        + `(veio: "${plano.introFrase}")`,
      );
    }
  }
  if (!plano.ctaTexto || typeof plano.ctaTexto !== 'string') erros.push('sem "ctaTexto"');

  return { ok: erros.length === 0, erros };
}

/**
 * Quantos vídeos o canal já publicou. Serve só de roda-dentada para os temas cujo
 * clima não se conhece — assim as três faixas saem por igual sem guardar estado novo
 * em lado nenhum: o registo de publicações já existe e já é a contagem.
 * Se o ficheiro não existir (máquina limpa, primeiro vídeo), devolve 0 sem drama.
 */
function contarPublicados() {
  try {
    const p = joinPath(process.cwd(), '.github', 'data', 'youtube-published.json');
    return Object.keys(JSON.parse(lerFicheiro(p, 'utf-8'))).length;
  } catch { return 0; }
}

// ─── montagem do roteiro final ───────────────────────────────────────────────
/** Converte o plano (índices) no roteiro que o render e o TTS consomem. */
export function montarRoteiro(t, narrativa, plano) {
  const scenes = narrativa.blocos.map((b, i) => {
    const disponiveis = palavrasAncoraveis(b.fala);
    const shotsDoPlano = (plano.blocos[i]?.shots) || [];
    return {
      id: i + 1,
      role: PAPEL_DA_CENA[b.papel],
      narration: b.fala,
      durationSec: duracaoDoBloco(b.fala),
      shots: shotsDoPlano.map((s) => {
        const shot = {
          // AQUI é onde o número vira palavra. O modelo nunca escreveu esta string.
          anchor: disponiveis[Number(s.ancoraIndice) - 1]?.palavra,
          visual: s.visual,
        };
        if (s.sfx) shot.sfx = s.sfx;
        return shot;
      }),
    };
  });

  return {
    slug: t.slug,
    term: t.term,
    category: t.category || 'basico',
    // a âncora falada, não o tema inteiro (ver `keywordFalada`)
    keyword: keywordFalada(t.term, narrativa.blocos[0]?.fala) || t.term,
    nextVideoTitle: '',
    intro: { style: 'pergunta', frase: plano.introFrase },
    /**
     * A MÚSICA DESTE VÍDEO — decidida aqui e GRAVADA no roteiro (02/08/2026).
     *
     * Fica escrita no ficheiro por duas razões: quem monta o vídeo sabe qual tocar
     * sem adivinhar, e quem escreve a descrição credita a faixa CERTA. Com três
     * faixas a rodar, um crédito fixo estaria errado em dois vídeos em cada três.
     * A escolha vem do tema, pela imagem do vídeo — sem chamada de IA nenhuma.
     */
    music: escolherTrilha(narrativa.fioCondutor, contarPublicados()),
    scenes,
    cta: { text: plano.ctaTexto, target: 'app' },
    totalDurationSec: Math.round(scenes.reduce((a, s) => a + s.durationSec, 0) * 10) / 10,
  };
}

function extrairJson(texto) {
  let s = String(texto).trim();
  const cerca = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (cerca) s = cerca[1].trim();
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a === -1 || b === -1) throw new Error('nenhum JSON na resposta do modelo');
  return JSON.parse(s.slice(a, b + 1));
}

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

export async function gerarCoreografia(t, narrativa, { tentativas = 4 } = {}) {
  // ═══ FALHAR DEPRESSA NO QUE A PASSAGEM 2 NÃO PODE CONSERTAR (31/07/2026) ═══
  // Medido: um roteiro reprovou 4 vezes seguidas por "a palavra-chave precisa ser
  // FALADA na narração do hook". O modelo NÃO PODIA corrigir — a narração vem
  // fechada da passagem 1 e ele só escreve o visual. Quatro chamadas de IA
  // queimadas e uma mensagem de erro que apontava para o sítio errado.
  // Estas verificações correm ANTES do ciclo e dizem qual é a causa real.
  const kw = keywordFalada(t.term, narrativa.blocos[0]?.fala);
  if (!kw) {
    throw new Error(
      `o gancho não diz nenhuma palavra do tema ("${t.term}") — o defeito é da PASSAGEM 1. `
      + 'A passagem 2 só escreve o visual e não tem como consertar isto reescrevendo shots.',
    );
  }
  const totalSec = narrativa.blocos.reduce((a, b) => a + duracaoDoBloco(b.fala), 0);
  if (totalSec > MAX_TOTAL_SEC) {
    throw new Error(
      `a narração dá ${Math.round(totalSec)}s e o máximo de um Short é ${MAX_TOTAL_SEC}s — o defeito é do TAMANHO na passagem 1.`,
    );
  }

  const base = buildPromptCoreografia(t, narrativa);
  const exigencias = [];
  let corretivo = '';

  for (let i = 1; i <= tentativas; i++) {
    if (i > 1) await dormir(20000);
    // `pago: 'escritor'` = gpt-5-2 pelo kie.ai, com os três gratuitos como rede por
    // baixo (ver `provedorPago` em apis/kie-ai.js). É a terceira e última chamada do
    // vídeo: ~0,4 cêntimos. Ela decide ONDE cada imagem entra e em que palavra — o
    // texto pode estar perfeito e o vídeo continuar sem sentido se isto falhar.
    const bruto = await generateText(corretivo ? `${base}\n\n${corretivo}` : base, { maxTokens: 4000, temperature: 0.6, pago: 'escritor' });

    let plano;
    try {
      plano = extrairJson(bruto);
    } catch (err) {
      exigencias.push(`- devolva JSON válido (${err.message})`);
      corretivo = `⚠️ A TENTATIVA ANTERIOR FOI REJEITADA. Corrija TUDO isto:\n${[...new Set(exigencias)].join('\n')}`;
      continue;
    }

    const local = validarPlano(plano, narrativa);
    if (!local.ok) {
      exigencias.push(...local.erros.map((e) => `- ${e}`));
      corretivo = `⚠️ A TENTATIVA ANTERIOR FOI REJEITADA. Corrija TUDO isto:\n${[...new Set(exigencias)].join('\n')}`;
      console.log(`  ⚠ tentativa ${i}/${tentativas} reprovada (plano): ${local.erros.join(' | ')}`);
      continue;
    }

    // Só agora vira roteiro e passa pelo validador de sempre — reaproveitado, não
    // reescrito: ele já sabe de sons repetidos, tempo de tela do app e duração.
    const roteiro = montarRoteiro(t, narrativa, plano);
    const v = validateShortScript(roteiro);
    if (v.ok) return { roteiro, avisos: v.warnings || [], tentativa: i };

    exigencias.push(...v.errors.map((e) => `- ${e}`));
    corretivo = `⚠️ A TENTATIVA ANTERIOR FOI REJEITADA. Corrija TUDO isto:\n${[...new Set(exigencias)].join('\n')}`;
    console.log(`  ⚠ tentativa ${i}/${tentativas} reprovada (roteiro): ${v.errors.join(' | ')}`);
  }

  throw new Error(`coreografia não passou na validação após ${tentativas} tentativas`);
}

// ─── execução direta: passagem 1 + passagem 2, só imprime ────────────────────
const executadoDireto = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('coreografia.js');
if (executadoDireto) {
  const { lerTema, gerarNarrativa, escolherImagens } = await import('./roteiro-narrativa.js');
  const { loadRecentPublishedContext } = await import('./roteiro-short.js');
  const { montarFichaDeNumeros } = await import('./lib/simulador.js');

  const args = Object.fromEntries(
    process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => {
      const [k, ...v] = a.slice(2).split('=');
      return [k, v.join('=') || true];
    }),
  );
  const slug = args.slug && args.slug !== true ? String(args.slug) : 'juros-compostos';
  const t = lerTema(slug);
  console.log(`\n🎬 PASSAGEM 1 + 2 — "${t.term}"${t.angle ? ` (ângulo: ${t.angle})` : ''}\n`);

  const recentes = loadRecentPublishedContext();
  const proibidas = [...new Set(recentes.flatMap((r) => r.metaphors || []))].filter((m) => m !== 'clique-link');
  const escolha = escolherImagens(`${t.term} ${t.angle || ''} ${t.definition || ''}`, proibidas);
  console.log(`🖼️  família: ${escolha.familia || '(aberta)'} → ${escolha.lista.join(', ')}`);
  if (escolha.aviso) console.log(`⚠️  ${escolha.aviso}`);

  const ficha = montarFichaDeNumeros(`${t.term} ${t.angle || ''}`);
  console.log(ficha ? '🧮 ficha de números calculada.\n' : '🧮 sem cenário numérico — números proibidos fora do apoio.\n');

  const p1 = await gerarNarrativa(t, { proibidas, frasesRecentes: recentes.flatMap((r) => r.stories || []).slice(0, 4), ficha });
  console.log(`✅ PASSAGEM 1 na tentativa ${p1.tentativa} — ${p1.palavras} palavras · fio "${p1.narrativa.fioCondutor}"\n`);
  for (const b of p1.narrativa.blocos) console.log(`[${b.papel.toUpperCase()}] ${b.fala}`);

  console.log('\n🎨 PASSAGEM 2 — a coreografia…\n');
  const p2 = await gerarCoreografia(t, p1.narrativa);
  console.log(`✅ PASSAGEM 2 na tentativa ${p2.tentativa} — roteiro APROVADO pelo validador de produção\n`);
  console.log(`🎞️  intro: ${p2.roteiro.intro.frase}`);
  console.log(`📣 cta: ${p2.roteiro.cta.text}`);
  console.log(`⏱️  total: ${p2.roteiro.totalDurationSec}s\n`);
  console.log('─'.repeat(72));
  for (const s of p2.roteiro.scenes) {
    console.log(`\n[cena ${s.id} · ${s.role} · ${s.durationSec}s]`);
    console.log(`  fala: ${s.narration}`);
    for (const sh of s.shots) {
      const v = sh.visual;
      const detalhe = v.metaphor || v.icon || v.app || v.text || '';
      console.log(`   · na palavra "${sh.anchor}" → ${v.type}${detalhe ? ` (${detalhe})` : ''}${sh.sfx ? ` + som ${sh.sfx}` : ''}`);
    }
  }
  console.log(`\n${'─'.repeat(72)}`);
  if (p2.avisos.length) {
    console.log('\n⚠️ avisos do validador (não reprovam):');
    p2.avisos.forEach((a) => console.log(`   · ${a}`));
  }
  // Só com --gravar o roteiro vai para o disco. Sem a bandeira isto continua a ser
  // um teste que não deixa rasto (fase C-1); com ela, alimenta o render (fase C-2).
  if (args.gravar) {
    const { writeFileSync, mkdirSync } = await import('fs');
    const { join, dirname } = await import('path');
    const destino = join(process.cwd(), 'src', 'scripts', 'youtube', 'output', `${p2.roteiro.slug}.script.json`);
    mkdirSync(dirname(destino), { recursive: true });
    writeFileSync(destino, `${JSON.stringify(p2.roteiro, null, 2)}\n`, 'utf-8');
    console.log(`\n💾 roteiro gravado em ${destino}`);
  } else {
    console.log('\n📄 ROTEIRO COMPLETO (JSON):\n');
    console.log(JSON.stringify(p2.roteiro, null, 2));
  }
}
