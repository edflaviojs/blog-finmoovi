/**
 * A PROMESSA DE "GRÁTIS", CORRIGIDA NO TEXTO QUE JÁ ESTÁ NO AR — 12/08/2026.
 *
 * ═══ POR QUE EXISTE ═══
 * O FinMoovi **não é grátis**: é um teste de sete dias, e passado o prazo o app
 * tranca. Durante meses a fala, a legenda, a descrição e o selo diziam só *"é de
 * graça"* — e **chegaram duas queixas de propaganda enganosa**. O robô já não erra
 * assim (as travas entraram no mesmo dia), mas os vídeos que foram ao ar antes disso
 * continuam com o texto antigo na descrição e no primeiro comentário.
 *
 * ═══ POR QUE É CIRÚRGICO, E NÃO UMA DESCRIÇÃO NOVA ═══
 * Já existe o `corrigir-descricoes.js`, que **regenera** a descrição inteira com IA.
 * Não serve aqui, e por três razões:
 *   · muda muito mais do que o problema — títulos, hashtags, links, tudo;
 *   · depende de o roteiro estar em disco, e alguns vídeos antigos já não têm;
 *   · gasta IA para reescrever texto que está bom, quando o que está errado são
 *     três palavras.
 * Aqui troca-se **só a promessa**, e o resto do texto fica byte a byte como estava.
 *
 * ═══ O QUE NÃO SE TOCA, E É DE PROPÓSITO ═══
 * As **calculadoras e ferramentas do blog são mesmo grátis**. Uma correção que as
 * apanhasse curava uma mentira criando outra — por isso todas as regras aqui exigem
 * que a palavra esteja colada ao APP, e as provas no fim deste ficheiro guardam
 * exatamente esse caso.
 *
 * Correr as provas (não toca na rede):
 *   node src/scripts/youtube/lib/promessa-gratis.js --provar
 */

/**
 * As trocas, da mais específica para a mais geral — e **a ordem importa**: se a
 * regra genérica corresse primeiro, "o app é grátis e abre no navegador" ficava
 * "o app tem 7 dias grátis e abre no navegador" por dois caminhos diferentes e o
 * resultado dependia da sorte. Específico primeiro, sempre.
 */
const TROCAS = [
  // ── o app dito grátis, nas formas exatas que foram ao ar ──
  [/\bO FinMoovi é grátis\b/g, 'O FinMoovi tem 7 dias grátis'],
  [/\bO FinMoovi faz essa conta de graça\b/g, 'O FinMoovi faz essa conta — 7 dias grátis'],
  /**
   * ⚠️ "TEM", e não "com" — outra que veio de um ensaio. A frase real era *"o app é
   * grátis e funciona no navegador"*; trocar por "com" dava *"o app com 7 dias grátis
   * e funciona"*, que não é português. O verbo tem de continuar lá.
   */
  /**
   * ⚠️ **O SUJEITO NO SINGULAR PEDE "TEM", NUNCA "SÃO"** — e isto veio do ensaio
   * contra o canal a sério: a descrição real dizia *"O app FinMoovi é grátis e
   * funciona no navegador"*, a regra varrida lá em baixo apanhou-a primeiro e saía
   * **"O app FinMoovi são 7 dias grátis"**. Por isso esta regra aceita o que vier
   * entre "o app" e o "é" (o nome, um adjetivo), e corre ANTES das varridas.
   */
  [/\b(o app[^.\n]{0,20}?) é gr[áa]tis\b/gi, '$1 tem 7 dias grátis'],
  [/\bO app é gratuito\b/g, 'O app tem 7 dias grátis'],
  // Tópico de descrição: aqui a promessa não faz falta nenhuma — tira-se a palavra
  // em vez de inventar uma frase nova.
  [/\bapp gratuito\b/gi, 'app'],
  [/\breceba o app gr[áa]tis\b/gi, 'receba o app com 7 dias grátis'],
  [/\bapp FinMoovi grátis\b/g, 'app FinMoovi com 7 dias grátis'],
  [/\bApp [Gg]rátis em\b/g, 'App com 7 dias grátis em'],
  // Título de capítulo: aqui o prazo não cabe nem faz falta — tira-se a palavra.
  [/\bno app gr[áa]tis\b/gi, 'no app'],

  // ── "de graça" ligado ao app ou ao envio do app ──
  [/\bte mando o app de graça\b/g, 'te mando o app com 7 dias grátis'],
  [/\bte mando o aplicativo de graça\b/g, 'te mando o aplicativo com 7 dias grátis'],
  [/\bProcura o? ?FinMoovi\.? É de graça\.?/g, 'Procura FinMoovi. São 7 dias grátis.'],
  [/\bProcura o? ?FinMoovi — é de graça\b/g, 'Procura FinMoovi — são 7 dias grátis'],
  [/\bTá aqui, de graça\b/g, 'Tá aqui, com 7 dias grátis'],
  /**
   * ⚠️ As três seguintes são as VARRIDAS, e correm por último de propósito: apanham o
   * que as formas exatas não apanharam ("É de graça e roda no navegador…", "Pode
   * entrar por aqui, é grátis…"). São seguras porque tudo o que é MESMO grátis — as
   * calculadoras, as ferramentas, o blog, o glossário — já está guardado no cofre
   * antes destas correrem.
   */
  /**
   * 🔴 **REPARE QUE NÃO HÁ `\b` ANTES DO "é" — E ISSO CUSTOU UMA SOBRA NO ENSAIO.**
   * Em JavaScript, `\b` só conhece letras sem acento: entre o espaço e o "é" não há
   * fronteira nenhuma, por isso `/\bé grátis/` **nunca casa**. A frase real
   * *"Pode entrar por aqui, é grátis"* passou intacta por causa disto. O lookbehind
   * faz o trabalho que o `\b` não faz: exige que antes venha espaço ou pontuação.
   */
  [/(?<=^|[\s,;:—-])É de graça\b/g, 'São 7 dias grátis'],
  [/(?<=^|[\s,;:—-])é de graça\b/g, 'são 7 dias grátis'],
  [/(?<=^|[\s,;:—-])é gr[áa]tis\b/gi, 'são 7 dias grátis'],
  /**
   * ⚠️ **"DE GRAÇA" NO FIM DA FRASE PEDE TRAVESSÃO, NÃO "COM".** Terceira coisa que
   * só o ensaio contra o canal mostrou: a descrição real acabava em *"use o app
   * FinMoovi pra simular sua dívida de graça"*, e o "com" colava o prazo à DÍVIDA —
   * *"simular sua dívida com 7 dias grátis"*. Com travessão o prazo volta a ser do
   * app, que é de quem ele é.
   */
  [/ de graça(?=[.!?]|$)/gim, ' — são 7 dias grátis'],
  [/(?<!dias )\bde graça\b/gi, 'com 7 dias grátis'],

  /**
   * ── a linha do link, que aparece em quase todas as descrições ──
   *
   * ⚠️ **O `(?<!dias )` NÃO É ENFEITE — foi uma prova vermelha.** Em
   * *"O FinMoovi é grátis e abre direto no navegador"* batem DUAS regras: a de cima
   * põe o prazo, e esta punha-o outra vez. Saía *"tem 7 dias 7 dias grátis"*. Pôr as
   * regras por ordem não chegava; é preciso a regra genérica recusar-se a correr onde
   * o prazo já está.
   */
  [/\(grátis, sem instalar\)/g, '(7 dias grátis, sem instalar)'],
  [/(?<!dias )\bgrátis e abre direto no navegador\b/g, '7 dias grátis e abre direto no navegador'],
  [/(?<!dias )\bgrátis e abre no navegador\b/g, '7 dias grátis e abre no navegador'],
  [/(?<!dias )\bgrátis e sem instalar\b/g, '7 dias grátis e sem instalar'],
];

/**
 * A REDE POR BAIXO. Mesmo com os `(?<!dias )`, duas regras futuras podem voltar a
 * cruzar-se — e o defeito seria invisível numa descrição de 4000 caracteres. Isto
 * apanha a repetição seja qual for o caminho que a produziu, e tem prova própria.
 */
function limparRepeticao(t) {
  return t
    .replace(/\b(7|sete) dias (?:7|sete) dias\b/gi, '$1 dias')
    .replace(/\b(7|sete) dias grátis grátis\b/gi, '$1 dias grátis');
}

/**
 * ⚠️ O QUE ESTÁ PROTEGIDO. Estes trechos são VERDADE e não podem ser tocados: as
 * calculadoras, as ferramentas e o conteúdo do blog são mesmo de borla. São postos
 * de lado antes das trocas e repostos no fim — assim nem a regra mais genérica lhes
 * chega. (É a mesma ideia da anti-cópia dos roteiros: proteger o que é legítimo em
 * vez de confiar que a expressão regular nunca se engana.)
 */
const PROTEGIDOS = [
  /\b(?:a |as |da |das )?calculadoras?[^.\n!?]{0,40}?gr[áa]tis/gi,
  /\b(?:a |as |da |das )?ferramentas?[^.\n!?]{0,40}?gr[áa]tis/gi,
  /\bCalculadora grátis\b/gi,
  /\bgrátis do blog\b/gi,
  /\bconteúdo[^.\n!?]{0,30}?gr[áa]tis/gi,
  // O blog, o glossário e a newsletter são mesmo de borla — e as regras varridas lá
  // em baixo são largas o bastante para lhes chegarem se não estivessem guardados.
  /\b(?:o |do |no )?blog[^.\n!?]{0,30}?gr[áa]tis/gi,
  /\bglossário[^.\n!?]{0,30}?gr[áa]tis/gi,
  /\bnewsletter[^.\n!?]{0,30}?gr[áa]tis/gi,
];

/**
 * Corrige um texto. Devolve `{ texto, mudou, sobras }`.
 *
 * `sobras` são as passagens que AINDA falam de grátis sem dizer o prazo depois de
 * tudo trocado. Existem porque uma lista de regras nunca cobre tudo o que uma IA
 * escreveu ao longo de meses: em vez de fingir que cobriu, o script mostra-as e
 * manda olhar à mão. **Um "0 sobras" é a única prova de que ficou limpo.**
 */
export function corrigirPromessa(original) {
  const entrada = String(original || '');
  if (!entrada) return { texto: entrada, mudou: false, sobras: [] };

  // 1) pôr o que é verdade a salvo
  const cofre = [];
  let t = entrada;
  for (const p of PROTEGIDOS) {
    t = t.replace(p, (m) => {
      cofre.push(m);
      return ` P${cofre.length - 1} `;
    });
  }

  // 2) trocar a promessa
  for (const [de, para] of TROCAS) t = t.replace(de, para);

  // 3) apanhar qualquer prazo escrito duas vezes, venha ele de onde vier
  t = limparRepeticao(t);

  // 4) devolver o que estava a salvo
  t = t.replace(/ P(\d+) /g, (_, i) => cofre[Number(i)]);

  // 5) o que sobrou a falar de grátis sem prazo — para olhar à mão
  const sobras = [];
  const frases = t.split(/\n|(?<=[.!?])\s+/);
  for (const f of frases) {
    if (!/\b(gr[áa]tis|gratuit[oa]s?|de graça)\b/i.test(f)) continue;
    if (/\b(?:7|sete)\s*dias\b/i.test(f)) continue;              // já diz o prazo
    if (/calculadora|ferramenta|blog|glossário|newsletter/i.test(f)) continue; // é verdade
    sobras.push(f.trim());
  }

  return { texto: t, mudou: t !== entrada, sobras };
}

// ─────────────────────────────────────────────────────────────────────────────
// AS PROVAS — correm sem rede: `node .../promessa-gratis.js --provar`
// ─────────────────────────────────────────────────────────────────────────────

const CASOS = [
  {
    nome: 'a linha do link da descrição',
    de: '📲 *Organize suas finanças (grátis, sem instalar):* https://finmoovi.com',
    esperado: '📲 *Organize suas finanças (7 dias grátis, sem instalar):* https://finmoovi.com',
  },
  {
    nome: 'o primeiro comentário do canal',
    de: '📲 O FinMoovi é grátis e abre direto no navegador, sem instalar nada:',
    esperado: '📲 O FinMoovi tem 7 dias grátis e abre direto no navegador, sem instalar nada:',
  },
  {
    nome: 'a resposta a quem pede o app',
    de: 'Boa! 🚀 O FinMoovi é grátis e abre direto no navegador, sem instalar nada: https://finmoovi.com',
    esperado: 'Boa! 🚀 O FinMoovi tem 7 dias grátis e abre direto no navegador, sem instalar nada: https://finmoovi.com',
  },
  {
    nome: '"de graça" na chamada do vídeo longo',
    de: 'Comenta FINMOOVI aqui embaixo que eu te mando o app de graça.',
    esperado: 'Comenta FINMOOVI aqui embaixo que eu te mando o app com 7 dias grátis.',
  },
  {
    nome: 'a descrição da playlist',
    de: 'sem palavra difícil. App grátis em https://app.finmoovi.com',
    esperado: 'sem palavra difícil. App com 7 dias grátis em https://app.finmoovi.com',
  },
  {
    nome: '🔴 a calculadora do blog NÃO pode ser tocada (é mesmo grátis)',
    de: '🔗 *Calculadora grátis:* https://blog.finmoovi.com/ferramentas/',
    esperado: '🔗 *Calculadora grátis:* https://blog.finmoovi.com/ferramentas/',
  },
  {
    nome: '🔴 as ferramentas do blog também não',
    de: 'Coloque em prática com as ferramentas grátis do blog FinMoovi.',
    esperado: 'Coloque em prática com as ferramentas grátis do blog FinMoovi.',
  },
  {
    nome: 'texto que já diz o prazo fica intacto (não leva o prazo duas vezes)',
    de: 'O FinMoovi tem 7 dias grátis e abre direto no navegador.',
    esperado: 'O FinMoovi tem 7 dias grátis e abre direto no navegador.',
  },
  {
    // ♦ Esta prova nasceu VERMELHA, em 12/08: duas regras batiam na mesma frase e
    //   saía "tem 7 dias 7 dias grátis". Fica aqui para nunca mais voltar.
    nome: '🔴 a frase onde DUAS regras batem não leva o prazo a dobrar',
    de: 'O FinMoovi é grátis e abre direto no navegador, sem instalar nada.',
    esperado: 'O FinMoovi tem 7 dias grátis e abre direto no navegador, sem instalar nada.',
  },
  {
    // ♦ E esta apanhou o `\b` que não funciona antes de letra acentuada.
    nome: '🔴 "é grátis" depois de vírgula (o \\b não chega a letra acentuada)',
    de: 'Fechou! Pode entrar por aqui, é grátis: https://finmoovi.com ✅',
    esperado: 'Fechou! Pode entrar por aqui, são 7 dias grátis: https://finmoovi.com ✅',
  },
  {
    nome: '"É de graça" a abrir a frase',
    de: 'Prontinho! É de graça e roda no navegador: https://finmoovi.com 🙌',
    esperado: 'Prontinho! São 7 dias grátis e roda no navegador: https://finmoovi.com 🙌',
  },
  {
    // ♦ Vinda do ensaio contra o canal real: saía "O app FinMoovi são 7 dias grátis".
    nome: '🔴 sujeito no singular leva "tem", não "são"',
    de: '📲 O app FinMoovi é grátis e funciona no navegador, sem instalar nada:',
    esperado: '📲 O app FinMoovi tem 7 dias grátis e funciona no navegador, sem instalar nada:',
  },
  {
    nome: 'tópico da descrição perde a promessa em vez de ganhar frase nova',
    de: '• Usar app gratuito para controlar despesas',
    esperado: '• Usar app para controlar despesas',
  },
  {
    nome: 'o convite do comentário',
    de: 'Comenta FINMOOVI e receba o app grátis.',
    esperado: 'Comenta FINMOOVI e receba o app com 7 dias grátis.',
  },
  {
    // ♦ Do ensaio contra o canal: com "com", o prazo colava-se à DÍVIDA.
    nome: '🔴 "de graça" a fechar a frase leva travessão, senão o prazo muda de dono',
    de: 'Entenda a diferença entre SAC e Price e use o app FinMoovi pra simular sua dívida de graça.',
    esperado: 'Entenda a diferença entre SAC e Price e use o app FinMoovi pra simular sua dívida — são 7 dias grátis.',
  },
];

if (process.argv.includes('--provar')) {
  let verdes = 0;
  let vermelhas = 0;
  console.log('\n🧪 AS TROCAS DA PROMESSA DE "GRÁTIS"\n');
  for (const c of CASOS) {
    const { texto } = corrigirPromessa(c.de);
    if (texto === c.esperado) {
      console.log(`  ✅ ${c.nome}`);
      verdes++;
    } else {
      console.log(`  ❌ ${c.nome}`);
      console.log(`       esperado: ${c.esperado}`);
      console.log(`       deu     : ${texto}`);
      vermelhas++;
    }
  }
  // E a outra ponta: o que fica por corrigir tem de ser DENUNCIADO, não escondido.
  const r = corrigirPromessa('Baixe o app financeiro gratuito e organize tudo.');
  if (r.sobras.length === 1) {
    console.log('  ✅ o que as regras não apanham é denunciado como sobra');
    verdes++;
  } else {
    console.log(`  ❌ o que as regras não apanham devia ser denunciado — sobras: ${r.sobras.length}`);
    vermelhas++;
  }
  console.log(`\n${'─'.repeat(56)}`);
  console.log(`${verdes} provas verdes · ${vermelhas} vermelhas`);
  process.exit(vermelhas ? 1 : 0);
}
