/**
 * OS TEMAS DO VÍDEO LONGO, TIRADOS DO QUE ESTÁ A BOMBAR (05/08/2026).
 *
 * ═══ A ORDEM DO DONO ═══
 * *"sobre os temas dos vídeos quero continuar usando a fonte que criamos da pesquisa da
 * api do youtube… quero que busque os mais virais e crie tudo com base nisso"*.
 *
 * ═══ 🔴 A DESCOBERTA QUE TORNA ISTO QUASE DE GRAÇA ═══
 * O detetive de tendências corre **todos os dias às 04:00** e guarda, entre outras
 * coisas, uma lista chamada **`topLongos`: os dez vídeos LONGOS de finanças mais vistos
 * dos últimos 60 dias**. Fui ver quem a lê: **ninguém**.
 *
 * O conversor do Short usa `topShorts` primeiro e depois a lista geral — e faz bem, com
 * um motivo escrito lá: *"um título de vídeo longo vende um CLIQUE; num Short o vídeo já
 * está a tocar antes de alguém ler o título — são jogos diferentes"*. **Só que agora nós
 * temos o outro jogo.** A lista certa para o vídeo longo estava recolhida há dias, a
 * ninguém, à espera. Zero chamadas novas à API do YouTube.
 *
 * ═══ O QUE ESTA PEÇA FAZ ═══
 *   1. lê os virais LONGOS já recolhidos;
 *   2. deita fora o que já está na fila ou já foi publicado;
 *   3. passa-os pelo **filtro de critérios da marca** que já existe (determinístico, e
 *      cada recusa fica com o motivo escrito no registo);
 *   4. pede à IA para extrair o CONCEITO e escrever o tema, o ângulo e o TÍTULO;
 *   5. **confere a resposta com código** antes de a aceitar;
 *   6. escreve na fila do vídeo longo, com o vídeo de origem registado ao lado.
 *
 * ⚠️ **APROVEITA-SE A FORMA, NUNCA O ASSUNTO.** É a regra que já governa o caminho do
 * Short, e aqui vale ainda mais: um vídeo longo de 20 minutos de outra pessoa não é um
 * molde para copiar, é uma prova de que aquela TENSÃO prende gente. O assunto tem de ser
 * nosso, com números nossos.
 *
 * ⚠️ **NÃO TOCA EM NADA DO SHORT.** Não lê nem escreve `youtube-topics.json` (a fila do
 * Short) nem `youtube-published.json` (o caderno dele). Importa o filtro da marca e o
 * transporte da IA — importar não é tocar.
 *
 * Uso:
 *   node src/scripts/youtube/temas-longo.js --ensaio     (não escreve nada)
 *   node src/scripts/youtube/temas-longo.js
 *   node src/scripts/youtube/temas-longo.js --quantos=2
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { avaliarViral, lerEstrutura } from './lib/filtro-de-marca.js';

const ROOT = process.cwd();
const TENDENCIAS = join(ROOT, '.github', 'data', 'youtube-trends.json');
const FILA = join(ROOT, '.github', 'data', 'youtube-longos.json');
const CADERNO = join(ROOT, '.github', 'data', 'youtube-longos-published.json');
const GLOSSARIO_DIR = join(ROOT, 'src', 'content', 'glossario');

const args = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => {
    const [k, ...v] = a.slice(2).split('=');
    return [k, v.join('=') || true];
  }),
);
const ENSAIO = Boolean(args.ensaio || args['dry-run']);

/**
 * Quantos temas entram por corrida.
 *
 * ⚠️ **DOIS, e o número sai de uma conta, não do gosto.** Sai **um** vídeo longo por
 * semana. Se entrassem cinco por corrida, a fila enchia-se de assuntos que estavam a
 * bombar há dois meses e o canal passava a perseguir o passado — que é exatamente o
 * defeito que fez o detetive passar de semanal a diário (IMPL24 §3.2). Com dois, há
 * sempre um de reserva se o dono reprovar o primeiro, e nada envelhece na prateleira.
 */
const QUANTOS_POR_CORRIDA = Number(args.quantos) > 0 ? Number(args.quantos) : 2;

/** O teto do YouTube para um título é 100. Este canal usa menos, e há uma razão abaixo. */
const MAX_TITULO = 70;
const MIN_TITULO = 30;

function log(m) { console.log(m); }

function lerJson(caminho, porOmissao) {
  if (!existsSync(caminho)) return porOmissao;
  try { return JSON.parse(readFileSync(caminho, 'utf-8')) || porOmissao; }
  catch { return porOmissao; }
}

/** Sem acentos e em minúsculas — para comparar temas sem tropeçar na grafia. */
const semAcento = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Uma assinatura curta do tema, para não entrar duas vezes o mesmo assunto com outras palavras. */
function assinaturaDoTema(texto) {
  return semAcento(texto).replace(/[^a-z0-9 ]/g, ' ').split(/\s+/)
    .filter((p) => p.length > 3).slice(0, 6).sort().join('-');
}

/** As palavras do glossário que existem MESMO, em português. */
function glossarioDisponivel() {
  if (!existsSync(GLOSSARIO_DIR)) return new Set();
  return new Set(readdirSync(GLOSSARIO_DIR)
    .filter((f) => f.endsWith('.md') && !f.startsWith('en-') && !f.startsWith('es-'))
    .map((f) => f.replace(/\.md$/, '')));
}

// ═══════════════════════════════════════════════════════════════════════════════
// O PEDIDO À IA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * O aviso de contexto sobre o viral que se está a ler.
 * ⚠️ Ao contrário do Short, aqui o viral é do MESMO formato que o nosso — e isso é uma
 * vantagem que se diz por escrito, para o modelo a usar.
 */
function contextoDoViral(v) {
  const linhas = [];
  const min = Math.round((v.duracaoSeg || 0) / 60);
  linhas.push(`Este viral e um VIDEO LONGO de ${min} minutos — o MESMO formato que o nosso. O titulo dele foi escrito para vender um CLIQUE numa miniatura, e conseguiu: ${Number(v.views || 0).toLocaleString('pt-BR')} visualizacoes.`);
  if (v.idioma && !String(v.idioma).startsWith('pt')) {
    linhas.push(`ATENCAO: este viral NAO e em portugues (${v.idioma}). Aproveite a FORMA, mas confirme que o assunto faz sentido na vida de quem vive no Brasil.`);
  }
  if (Number(v.duracaoSeg) > 45 * 60) {
    linhas.push('ATENCAO: este viral e uma ENTREVISTA ou live longa. O nosso video tem 6 minutos e e narrado — aproveite so a TENSAO do titulo, nunca a estrutura.');
  }
  return linhas.join('\n');
}

function montarPedido(v, glossarios, caudasUsadas = []) {
  const estrutura = lerEstrutura(v) || 'sem forma reconhecida';
  /**
   * ⚠️ **AS CAUDAS JÁ USADAS VÃO DENTRO DO PEDIDO, e não só dentro da trava.**
   * É a regra desta casa, escrita depois de vinte ocorrências do mesmo defeito: *o prompt
   * costuma ordenar exatamente aquilo que o validador pune*. Se a trava recusa uma cauda
   * repetida e o pedido nunca a proíbe, o modelo gasta tentativas a ser castigado por
   * obedecer. Aqui as duas metades dizem a mesma coisa.
   */
  const caudasProibidas = caudasUsadas.map((c) => c.split(' ').slice(-4).join(' ')).filter(Boolean).slice(0, 6);
  return `Voce e o editor de um canal brasileiro de educacao financeira no YouTube. Recebe o TITULO de um video de financas que VIRALIZOU, e transforma-o num TEMA para um video NOSSO de 6 minutos, narrado na primeira pessoa, SEMPRE em portugues do Brasil.

TITULO VIRAL: "${v.title}"
FORMA QUE FEZ ESSE TITULO FUNCIONAR: ${estrutura}
${contextoDoViral(v)}

🔴 A REGRA QUE MANDA EM TUDO: APROVEITE A FORMA, NUNCA O ASSUNTO.
Se o viral funcionou por mostrar uma perda a acontecer agora, o nosso tambem mostra dinheiro a sair agora. Se funcionou por ser uma lista numerada, o nosso tambem promete um numero. MAS O ASSUNTO TEM DE SER NOSSO, e tem de ser sobre o dinheiro de quem assiste.

O QUE O NOSSO CANAL E:
- fala com quem ganha entre 2 e 6 mil reais por mes e nunca ve o dinheiro sobrar;
- ensina com CONTAS FEITAS e numeros em reais, nunca com promessas;
- o narrador conta na primeira pessoa uma coisa que viveu — nunca inventa uma personagem com nome;
- tem um app (FinMoovi, com sete dias gratis para testar) que aparece UMA vez, a fazer a conta.

O QUE O CANAL RECUSA, e nao se negoceia:
- promessa de ficar rico depressa, segredo, urgencia inventada;
- aposta, day trade, cripto do momento;
- explicar dinheiro por etnia, religiao ou politica;
- depender de uma pessoa ou empresa com nome (influenciador, banco, corretora);
- medo sem saida.

RESPONDA APENAS COM UM JSON, sem comentarios e sem blocos de codigo:
{
  "foraDoTema": false,
  "tema": "a frase que descreve o video, ate 90 caracteres",
  "angulo": "2 a 3 frases: qual e a dor, o que se mostra, e o que a pessoa leva no fim. Diga o CENARIO concreto (valores em reais) que o video vai usar.",
  "titulo": "o titulo do YouTube",
  "glossario": "um dos slugs da lista abaixo, ou null",
  "palavrasChave": ["4 a 6 termos de busca, cada um com 2 a 4 palavras"]
}

REGRAS DO TITULO (e o que mais decide se alguem clica):
- entre ${MIN_TITULO} e ${MAX_TITULO} caracteres;
- a PALAVRA-CHAVE do assunto vem A FRENTE, porque e por ela que se procura;
- a seguir, a OBJECAO REMOVIDA — aquilo que a pessoa teme ter de fazer e nao vai ter ("sem apertar mais o mes", "sem cortar o cafezinho", "sem ganhar mais");
- em portugues do Brasil, sem emojis, SEM PALAVRAS TODAS EM MAIUSCULAS;
- nao pode prometer enriquecer, nem dizer "segredo", "ninguem te conta", "o que os bancos escondem";
- EXEMPLO DO PADRAO ACEITE (de outro assunto): "Dívida do cartão: como sair do vermelho sem apertar mais o mês".
  🔴 COPIE A FORMA DESSE EXEMPLO, NUNCA AS PALAVRAS. A objecao do seu titulo TEM DE SER OUTRA — nao escreva "sem apertar mais o mes". Escreva a objecao que ESTE assunto levanta: "sem cortar o cafezinho", "sem ganhar mais", "sem vender nada", "sem depender de sorte", "com o salario que voce ja tem". Um titulo que acaba como o exemplo e recusado por codigo.${caudasProibidas.length ? `\n  🔴 E NAO PODE ACABAR COMO NENHUM DESTES, que ja estao na fila do canal: ${caudasProibidas.map((c) => `"…${c}"`).join(', ')}.` : ''}

SE o titulo viral for sobre uma pessoa com nome, uma empresa, uma aposta, ou nao for sobre o dinheiro de quem assiste, responda {"foraDoTema": true}.

SLUGS DE GLOSSARIO POSSIVEIS: ${glossarios.join(', ')}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// A CONFERÊNCIA — o que a IA responde não entra sem passar por código
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * As formas de título que este canal recusa por escrito.
 * ⚠️ São de VERDADE, não de gosto: cada uma promete uma coisa que o canal não entrega.
 */
const TITULOS_PROIBIDOS = [
  { re: /\bsegredo?s?\b/i, porque: 'promete um segredo — o canal ensina, não guarda' },
  { re: /ningu[ée]m (te )?(conta|fala|diz)/i, porque: '"ninguém te conta" é falso segredo' },
  { re: /(banco|governo)s? (esconde|n[ãa]o quer)/i, porque: 'teoria da conspiração não é educação financeira' },
  { re: /\bfique?\s+rico\b|\benriquec\w*\s+(r[áa]pido|em\s+\d)/i, porque: 'promete enriquecer depressa' },
  { re: /\bganhe?\s+(r\$\s*)?[\d.]+\s*(mil|reais)?\s*(por|em)\s+(dia|semana|m[êe]s)/i, porque: 'promete um ganho com prazo' },
  { re: /\burgente\b|\b[úu]ltima chance\b|\bcorra\b/i, porque: 'urgência inventada' },
  { re: /\bchoque\w*|\bchocante\b|\bvoc[êe] n[ãa]o vai acreditar\b/i, porque: 'sensacionalismo vazio' },
];

/**
 * Diz porque é que um tema NÃO serve — ou nada, se servir.
 *
 * ⚠️ **CONFERIR O RESULTADO, NUNCA O CÓDIGO DE SAÍDA.** A IA responde sempre alguma
 * coisa; o que decide se ela entra na fila é isto. É a mesma lição das descrições que
 * foram ao ar cortadas a meio da palavra (§33.3): uma resposta que chega não é uma
 * resposta que serve.
 */
/**
 * A CAUDA DE UM TÍTULO — a objeção removida, que é a parte depois dos dois pontos.
 * *"Dívida do cartão: **como sair do vermelho sem apertar mais o mês**"*.
 */
export function caudaDoTitulo(titulo) {
  const t = String(titulo || '');
  const depois = t.includes(':') ? t.slice(t.indexOf(':') + 1) : t;
  return semAcento(depois).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * 🔴 A CAUDA DO EXEMPLO QUE O PEDIDO MOSTRA.
 *
 * **Apanhado no primeiro ensaio, a 05/08, e é a 21ª vez que este defeito aparece nesta
 * casa.** O pedido dá um exemplo de OUTRO assunto — como manda a regra — e mesmo assim o
 * modelo copiou-lhe a cauda: os dois primeiros títulos propostos acabavam ambos em
 * *"sem apertar mais o mês"*. Um deles até era sobre cortar gastos, nada a ver com dívida.
 *
 * > **O exemplo ensina a FORMA e o modelo copia as PALAVRAS.** Dois vídeos seguidos na
 * > lista do canal a acabar na mesma frase não parecem um padrão: parecem um defeito.
 */
const CAUDA_DO_EXEMPLO = caudaDoTitulo('Dívida do cartão: como sair do vermelho sem apertar mais o mês');

/**
 * Duas caudas dizem o mesmo — e são precisas DUAS réguas, porque a primeira sozinha
 * deixou passar o defeito outra vez.
 *
 * 🔴 **A 1ª versão media quatro palavras seguidas em qualquer sítio da cauda, e no
 * segundo ensaio saíram estes dois títulos:**
 * *"Educação financeira: como fazer o salário render **sem ganhar mais**"* e
 * *"Dinheiro: 10 gastos que cortar **sem ganhar mais**"*.
 * Não partilham quatro palavras seguidas em lado nenhum — e acabam exatamente na mesma
 * frase. **A objeção tem três palavras, não quatro**, e é justamente o FIM do título que
 * se lê como repetição quando os vídeos ficam lado a lado na lista do canal.
 *
 * Portanto: quatro palavras seguidas em qualquer sítio **ou** as três últimas iguais.
 */
function caudasBatem(a, b) {
  const pa = a.split(' ').filter(Boolean);
  const pb = b.split(' ').filter(Boolean);
  if (pa.length >= 3 && pb.length >= 3
    && pa.slice(-3).join(' ') === pb.slice(-3).join(' ')) return true;
  const janelas = new Set();
  for (let i = 0; i + 4 <= pb.length; i++) janelas.add(pb.slice(i, i + 4).join(' '));
  for (let i = 0; i + 4 <= pa.length; i++) if (janelas.has(pa.slice(i, i + 4).join(' '))) return true;
  return false;
}

export function conferirTema(t, { glossarios = new Set(), caudasUsadas = [] } = {}) {
  const queixas = [];
  const titulo = String(t?.titulo || '').trim();
  const tema = String(t?.tema || '').trim();

  if (!tema) queixas.push('sem tema');
  if (!titulo) queixas.push('sem título');
  if (!String(t?.angulo || '').trim()) queixas.push('sem ângulo — o escritor não saberia o que dizer');

  if (titulo) {
    if (titulo.length < MIN_TITULO) queixas.push(`o título tem ${titulo.length} caracteres e o mínimo é ${MIN_TITULO}`);
    if (titulo.length > MAX_TITULO) queixas.push(`o título tem ${titulo.length} caracteres e o máximo é ${MAX_TITULO}`);
    for (const p of TITULOS_PROIBIDOS) {
      if (p.re.test(titulo)) queixas.push(`o título ${p.porque}`);
    }
    /**
     * ⚠️ PALAVRAS TODAS EM MAIÚSCULAS. Metade dos virais que servem de modelo gritam —
     * *"PARE DE SER ESCRAVO DAS DÍVIDAS"* — e o modelo copia o que vê. Este canal não
     * grita, e essa decisão já está tomada: a capa é que chama a atenção, o título
     * explica. Uma sigla (CDB, IPCA) não conta.
     */
    const aosBerros = titulo.split(/\s+/).filter((p) => p.length > 4 && p === p.toUpperCase() && /[A-ZÀ-Ú]/.test(p));
    if (aosBerros.length) queixas.push(`o título grita: ${aosBerros.join(', ')}`);
    if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(titulo)) queixas.push('o título tem emojis');

    // 🔴 A cauda copiada — ver o comentário em `CAUDA_DO_EXEMPLO`.
    const cauda = caudaDoTitulo(titulo);
    if (caudasBatem(cauda, CAUDA_DO_EXEMPLO)) {
      queixas.push('o título copia a objeção do exemplo do pedido ("…sem apertar mais o mês")');
    }
    for (const usada of caudasUsadas) {
      if (usada && caudasBatem(cauda, usada)) {
        queixas.push(`o título acaba como outro que já está na fila ("…${usada.split(' ').slice(-4).join(' ')}")`);
        break;
      }
    }
  }

  // O glossário tem de EXISTIR. Um slug inventado faz o escritor trabalhar sem material
  // de apoio e ninguém dá por isso — é uma perda silenciosa.
  if (t?.glossario && glossarios.size && !glossarios.has(String(t.glossario))) {
    queixas.push(`o glossário "${t.glossario}" não existe`);
  }

  const chaves = Array.isArray(t?.palavrasChave) ? t.palavrasChave : [];
  if (chaves.some((p) => String(p).length > 60)) queixas.push('há palavra-chave grande demais');

  return queixas;
}

/** Lê o JSON da resposta, mesmo que venha embrulhado em texto ou em bloco de código. */
function lerResposta(cru) {
  const semCerca = String(cru || '').replace(/```(?:json)?/gi, '');
  const m = semCerca.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('a resposta não trouxe JSON nenhum');
  return JSON.parse(m[0]);
}

// ═══════════════════════════════════════════════════════════════════════════════
export async function proporTemas({ quantos = QUANTOS_POR_CORRIDA, ensaio = false } = {}) {
  const tendencias = lerJson(TENDENCIAS, null);
  if (!tendencias) throw new Error('não há colheita do detetive de tendências — corra-o primeiro.');

  /**
   * ⚠️ `topLongos` PRIMEIRO, e a lista geral só como rede.
   * A lista geral mistura Shorts e longos; se um Short entrasse aqui, estaríamos a
   * aprender a forma de um jogo com as regras do outro — que é precisamente o erro que o
   * conversor do Short evita ao pôr `topShorts` à frente.
   */
  const longos = Array.isArray(tendencias.topLongos) ? tendencias.topLongos : [];
  const rede = (Array.isArray(tendencias.topVideos) ? tendencias.topVideos : [])
    .filter((v) => Number(v?.duracaoSeg) > 3 * 60);
  const vistos = new Set();
  const candidatosBrutos = [...longos, ...rede].filter((v) => {
    if (!v?.videoId || !v?.title || vistos.has(v.videoId)) return false;
    vistos.add(v.videoId);
    return true;
  });

  log(`\n🔎 colheita de ${tendencias.generatedAt?.slice(0, 10) || '?'} — ${candidatosBrutos.length} vídeos longos virais`);
  if (!candidatosBrutos.length) return { novos: [], recusados: [] };

  const fila = lerJson(FILA, { videos: [] });
  const caderno = lerJson(CADERNO, {});
  const jaNaFila = new Set((fila.videos || []).map((v) => v.slug));
  const idsDeOrigem = new Set((fila.videos || []).map((v) => v.viralRef?.videoId).filter(Boolean));
  const assinaturas = new Set((fila.videos || []).map((v) => assinaturaDoTema(v.tema || v.titulo)));
  const caudasUsadas = (fila.videos || []).map((v) => caudaDoTitulo(v.titulo)).filter(Boolean);

  // ── o portão da marca, antes de gastar uma chamada de IA ──
  const recusados = [];
  const candidatos = [];
  for (const v of candidatosBrutos) {
    if (idsDeOrigem.has(v.videoId) || caderno[`viral-${v.videoId}`]) continue; // já foi lido
    const veredito = avaliarViral(v);
    if (veredito.entra) candidatos.push(v);
    else recusados.push({ titulo: v.title, criterio: veredito.criterio, motivo: veredito.motivo });
  }
  log(`   ${candidatos.length} passam o filtro da marca · ${recusados.length} recusados`);
  for (const r of recusados) log(`   ❌ "${String(r.titulo).slice(0, 60)}" — ${r.criterio}`);
  if (!candidatos.length) return { novos: [], recusados };

  const { generateText } = await import('../apis/kie-ai.js');
  const glossarios = glossarioDisponivel();
  const listaGlossario = [...glossarios].slice(0, 60);

  const novos = [];
  for (const v of candidatos) {
    if (novos.length >= quantos) break;
    log(`\n📺 "${String(v.title).slice(0, 70)}"  (${Math.round(v.viewsPerDay || 0).toLocaleString('pt-BR')} vistas/dia)`);
    /**
     * ⚠️ **DUAS TENTATIVAS, E A SEGUNDA RECEBE A QUEIXA POR ESCRITO.**
     *
     * Apanhado no ensaio de 05/08: o melhor candidato do dia — o viral com 24 mil vistas
     * POR DIA — foi deitado fora porque o título tinha **79 caracteres e o teto é 70**.
     * Nove caracteres a matar o melhor tema da semana, e sem ninguém lhe dizer isso.
     *
     * É exatamente a lição da §34.3 (defeito 3): *"a queixa de tamanho não dizia o que
     * fazer"* — o modelo convergia às cegas até gastar as tentativas. Assim que a queixa
     * passou a dizer **"CORTE 26 palavras"**, cinco dos seis blocos passaram à primeira.
     * Aqui vale o mesmo, e custa uma chamada de fracções de cêntimo.
     */
    let proposta = null;
    let queixas = [];
    let corretivo = '';
    for (let tentativa = 1; tentativa <= 2; tentativa++) {
      let cru;
      try {
        /**
         * ⚠️ **VAI PELO MODELO PAGO, e a razão é de proporção.** O caminho do Short usa a
         * rede gratuita, e faz bem: são sete vídeos por semana e o título de um Short quase
         * não é lido — o vídeo já está a tocar. **Aqui é um por semana, e o título é a
         * coisa que mais decide se alguém clica.** É o mesmo modelo que escreve o guião do
         * canal, portanto o título sai na mesma voz. Custa fracções de cêntimo por tema, e
         * a rede gratuita continua por baixo se a chave paga faltar.
         */
        cru = await generateText(
          montarPedido(v, listaGlossario, caudasUsadas) + corretivo,
          { maxTokens: 900, temperature: 0.7, pago: 'escritor' },
        );
      } catch (err) {
        log(`   ⚠️ a IA não respondeu (${err.message.split('\n')[0]})`);
        proposta = null;
        break;
      }
      try {
        proposta = lerResposta(cru);
      } catch (err) {
        queixas = [err.message];
        corretivo = '\n\n🔴 A SUA RESPOSTA ANTERIOR NAO ERA JSON. Responda APENAS com o objecto JSON pedido.';
        proposta = null;
        continue;
      }
      if (proposta.foraDoTema === true) break;

      queixas = conferirTema(proposta, { glossarios, caudasUsadas });
      if (!queixas.length) break;
      if (tentativa === 1) {
        log(`   ↻ a 1ª proposta não passou (${queixas.join(' · ')}) — a pedir a correção`);
        corretivo = `\n\n🔴 A SUA RESPOSTA ANTERIOR FOI RECUSADA. O titulo que escreveu foi: "${proposta.titulo || ''}" (${String(proposta.titulo || '').length} caracteres).\nMotivos: ${queixas.join(' · ')}.\nCorrija SO isso e responda outra vez o JSON inteiro. O titulo tem de ficar entre ${MIN_TITULO} e ${MAX_TITULO} caracteres.`;
      }
    }

    if (!proposta) {
      recusados.push({ titulo: v.title, criterio: 'sem resposta', motivo: queixas.join(' · ') || 'a IA não respondeu' });
      continue;
    }
    if (proposta.foraDoTema === true) {
      log('   ⏭️  a IA disse que está fora do que o canal fala');
      recusados.push({ titulo: v.title, criterio: 'fora-do-tema (IA)', motivo: 'a IA recusou' });
      continue;
    }
    if (queixas.length) {
      log(`   ❌ a proposta não passa, nem à segunda: ${queixas.join(' · ')}`);
      recusados.push({ titulo: v.title, criterio: 'proposta reprovada', motivo: queixas.join(' · ') });
      continue;
    }

    const assinatura = assinaturaDoTema(proposta.tema);
    if (assinaturas.has(assinatura)) {
      log('   ⏭️  já há na fila um tema que diz o mesmo com outras palavras');
      continue;
    }
    assinaturas.add(assinatura);

    const slug = fazerSlug(proposta.titulo, jaNaFila);
    jaNaFila.add(slug);
    const entrada = {
      slug,
      titulo: String(proposta.titulo).trim(),
      tema: String(proposta.tema).trim(),
      angulo: String(proposta.angulo).trim(),
      glossario: proposta.glossario && proposta.glossario !== 'null' ? String(proposta.glossario) : null,
      palavrasChave: (Array.isArray(proposta.palavrasChave) ? proposta.palavrasChave : []).map(String).slice(0, 6),
      estado: 'proposto',
      // De onde veio, para se poder responder daqui a um mês à pergunta que interessa:
      // que FORMA de título é que nos rende audiência?
      viralRef: {
        videoId: v.videoId,
        title: v.title,
        views: v.views,
        viewsPerDay: Math.round(v.viewsPerDay || 0),
        estrutura: lerEstrutura(v),
      },
      propostoEm: tendencias.generatedAt || null,
    };
    novos.push(entrada);
    // ⚠️ Entra JÁ na lista de caudas: senão o segundo tema desta mesma corrida podia
    // acabar exatamente como o primeiro, e a trava só o apanharia na semana seguinte.
    caudasUsadas.push(caudaDoTitulo(entrada.titulo));
    log(`   ✅ TÍTULO: ${entrada.titulo}  (${entrada.titulo.length} caracteres)`);
    log(`      tema:     ${entrada.tema}`);
    log(`      ângulo:   ${entrada.angulo}`);
    log(`      glossário: ${entrada.glossario || '(nenhum)'} · busca: ${entrada.palavrasChave.join(' / ')}`);
    log(`      nome curto: ${entrada.slug}`);
  }

  if (!ensaio && novos.length) {
    fila.videos = [...(fila.videos || []), ...novos];
    writeFileSync(FILA, `${JSON.stringify(fila, null, 2)}\n`, 'utf-8');
    log(`\n💾 ${novos.length} tema(s) na fila — ${FILA}`);
  } else if (ensaio) {
    log('\n(ensaio — nada foi escrito)');
  }
  return { novos, recusados };
}

/** Um nome curto e único a partir do título. */
function fazerSlug(titulo, jaUsados = new Set()) {
  const base = semAcento(titulo)
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    .split('-').filter((p) => p.length > 2).slice(0, 4).join('-') || 'video-longo';
  let slug = base;
  let n = 2;
  while (jaUsados.has(slug)) { slug = `${base}-${n}`; n += 1; }
  return slug;
}

// ─── execução direta ─────────────────────────────────────────────────────────
const chamadoPeloNome = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (chamadoPeloNome) {
  proporTemas({ ensaio: ENSAIO })
    .then(({ novos }) => {
      if (!novos.length) {
        log('\n📭 nenhum tema novo desta vez.');
        process.exit(78); // "nada a fazer" — sucesso neutro, como no resto da casa
      }
      log('');
    })
    .catch((err) => { console.error(`\n❌ ${err.message}\n`); process.exit(1); });
}

export { fazerSlug, assinaturaDoTema, TITULOS_PROIBIDOS, MAX_TITULO, MIN_TITULO };
