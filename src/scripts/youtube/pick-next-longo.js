/**
 * QUAL É O VÍDEO LONGO DESTA SEMANA (05/08/2026).
 *
 * ═══ POR QUE ISTO TEM DE EXISTIR ═══
 * O gerador do vídeo longo tem **um** tema escrito lá dentro — o do piloto. Sem esta
 * peça, um robô semanal faria **o mesmo vídeo todas as semanas**, e o registo diria
 * sucesso todas as vezes. Não é uma hipótese: é o que acontece hoje se alguém ligar o
 * relógio sem mais nada.
 *
 * ═══ O QUE ELE FAZ, E O QUE SE RECUSA A FAZER ═══
 * Lê a fila (`.github/data/youtube-longos.json`), salta o que já foi feito, e escreve o
 * nome do primeiro que falta. **Não escolhe temas, não inventa títulos, não fala com
 * IA nenhuma.** A fila é escrita à mão e o dono aprova cada linha — é ele que decide o
 * que o canal diz, e um título é a única coisa que ninguém consegue desfazer depois de
 * a lista o mostrar.
 *
 * ⚠️ **FILA VAZIA NÃO É ERRO.** Devolve 78 — o mesmo *"nada a fazer hoje"* do irmão do
 * Short. Um robô que falha a vermelho quando não tem trabalho ensina toda a gente a
 * ignorar os avisos, e este canal já pagou por avisos ignorados.
 *
 * ⚠️ **NÃO TOCA NA FILA DO SHORT** (`youtube-topics.json`) nem no caderno dele
 * (`youtube-published.json`). Ficheiros próprios, dos dois lados.
 *
 * Uso:
 *   node src/scripts/youtube/pick-next-longo.js
 *   node src/scripts/youtube/pick-next-longo.js --como-argumentos
 *   node src/scripts/youtube/pick-next-longo.js --como-argumentos --slug=sair-do-vermelho
 *   node src/scripts/youtube/pick-next-longo.js --lista
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const FILA = join(ROOT, '.github', 'data', 'youtube-longos.json');
const CADERNO = join(ROOT, '.github', 'data', 'youtube-longos-published.json');

/** Os estados que dizem "este já está tratado, salta". */
const JA_TRATADOS = new Set(['publicado', 'publicado-a-mao', 'agendado', 'reprovado', 'suspenso']);

const args = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => {
    const [k, ...v] = a.slice(2).split('=');
    return [k, v.join('=') || true];
  }),
);

function lerJson(caminho, porOmissao) {
  if (!existsSync(caminho)) return porOmissao;
  try { return JSON.parse(readFileSync(caminho, 'utf-8')) || porOmissao; }
  catch { return porOmissao; }
}

/**
 * O primeiro vídeo por fazer, ou nada.
 *
 * ⚠️ **DUAS RÉGUAS, E AS DUAS SÃO PRECISAS.** O `estado` na fila é o que o dono escreveu;
 * o caderno é o que o robô fez. Se só se olhasse ao `estado`, uma corrida que subiu o
 * vídeo mas morreu antes de guardar o caderno faria o vídeo outra vez na semana seguinte.
 * Se só se olhasse ao caderno, um tema que o dono suspendeu voltaria a entrar.
 */
export function proximoLongo({ fila = lerJson(FILA, { videos: [] }), caderno = lerJson(CADERNO, {}) } = {}) {
  const porFazer = (fila.videos || []).filter((v) => v && v.slug
    && !JA_TRATADOS.has(String(v.estado || '').toLowerCase())
    && !caderno[v.slug]);
  /**
   * ♦ 06/08/2026 — A OPORTUNIDADE DO DONO FURA A FILA (IMPL20 §60).
   * ⚠️ **A marca, e não só a posição.** O tema do dono é escrito à cabeça do ficheiro, e
   * só isso já bastaria hoje — mas basta alguém reordenar a fila à mão para a regra se
   * perder em silêncio. A marca sobrevive a qualquer arrumação. Havendo mais do que um,
   * ganha o mais antigo: a ordem por que ele os escreveu.
   */
  const doDono = porFazer
    .filter((v) => v.prioridade)
    .sort((a, b) => String(a.criadoEm || '').localeCompare(String(b.criadoEm || '')));
  return doDono[0] || porFazer[0] || null;
}

/**
 * Os argumentos com que o escritor do guião é chamado, **um por linha**.
 *
 * ⚠️ Um por linha, e não numa linha só, por uma razão prática: os temas trazem dois
 * pontos, vírgulas e aspas (*"Sair do vermelho: o plano de três passos…"*), e uma linha
 * só obrigaria quem a lê a adivinhar onde acaba cada argumento. Já houve neste projeto um
 * comando partido em dois por causa de um espaço num caminho (§34.3 defeito 10) — não se
 * repete o erro por causa de um dois-pontos.
 */
export function comoArgumentos(v) {
  const linhas = [];
  if (v.tema) linhas.push(`--tema=${v.tema}`);
  if (v.angulo) linhas.push(`--angulo=${v.angulo}`);
  if (v.glossario) linhas.push(`--glossario=${v.glossario}`);
  return linhas;
}

function principal() {
  const fila = lerJson(FILA, { videos: [] });
  const caderno = lerJson(CADERNO, {});

  if (args.lista) {
    const linhas = (fila.videos || []).map((v) => {
      /**
       * ⚠️ **"NO AR" SÓ SE ESTIVER MESMO NO AR.** A 1ª versão escrevia "no ar" para tudo
       * o que estivesse no caderno — e o caderno também guarda **reservas**: dias já
       * tomados por um vídeo que ainda não subiu. Quem lesse a lista dava por publicado
       * um vídeo que não existe. É a mesma família do erro que a nota do caderno conta.
       */
      const j = caderno[v.slug];
      const feito = j?.videoId ? 'no ar' : (j ? `${j.estado || 'reservado'} para ${String(j.publishAt || '').slice(0, 10)}` : (v.estado || 'por fazer'));
      return `  ${caderno[v.slug] || JA_TRATADOS.has(String(v.estado || '').toLowerCase()) ? '✓' : '·'} ${v.slug} — ${feito}\n      "${v.titulo || '(SEM TÍTULO APROVADO — este não pode subir)'}"`;
    });
    console.log(`\nA fila do vídeo longo (${(fila.videos || []).length} temas):\n${linhas.join('\n') || '  (vazia)'}\n`);
    return;
  }

  // Com --slug, é o dono a mandar: devolve-se ESSE, tratado ou não.
  const pedido = args.slug && args.slug !== true ? String(args.slug) : null;
  const escolhido = pedido
    ? (fila.videos || []).find((v) => v.slug === pedido)
    : proximoLongo({ fila, caderno });

  if (!escolhido) {
    if (pedido) {
      console.error(`❌ "${pedido}" não está na fila de temas do vídeo longo.`);
      process.exit(1);
    }
    console.error('📭 a fila de temas do vídeo longo está vazia — nada a fazer.');
    process.exit(78); // "nada a fazer" — sucesso neutro, como no irmão do Short
  }

  if (args['como-argumentos']) {
    const linhas = comoArgumentos(escolhido);
    if (!linhas.length) {
      console.error(`❌ "${escolhido.slug}" não traz tema nem ângulo na fila — o escritor não saberia o que escrever.`);
      process.exit(1);
    }
    console.log(linhas.join('\n'));
    return;
  }

  // Sem mais nada, escreve só o nome — é assim que o robô o lê.
  console.log(escolhido.slug);
}

/** ⚠️ Só corre quando é chamado pelo nome. */
const chamadoPeloNome = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (chamadoPeloNome) {
  try { principal(); }
  catch (err) { console.error(`\n❌ ${err.message}\n`); process.exit(1); }
}
