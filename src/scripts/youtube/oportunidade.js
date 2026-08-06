/**
 * A OPORTUNIDADE DO DONO — o tema que fura a fila (06/08/2026, IMPL20 §60).
 *
 * ═══ O PEDIDO, NAS PALAVRAS DELE ═══
 * *"Quando eu ver algum vídeo tema que na minha visão é excelente, eu tenha esse campo e
 * insiro ali manualmente, e esse vídeo entre na fila prioritária para ser o próximo vídeo
 * a ser gerado e publicado. Se já tiver um vídeo em andamento, então esse que eu coloquei
 * deve ser o seguinte. Depois que gera esse vídeo segue a nossa sequência normalmente."*
 *
 * ═══ O DESENHO, E POR QUE NÃO HÁ FILA NOVA ═══
 * A tentação era criar um ficheiro "fila prioritária". **Não se criou, e é de propósito:**
 * duas filas obrigam os dois selecionadores a saber de duas coisas, e o dia em que uma
 * delas for esquecida num deles ninguém dá por nada. O tema do dono entra **na fila que já
 * existe**, à cabeça, com uma marca `prioridade`. Uma fila, um sítio.
 *
 * ⚠️ **E NÃO SALTA À FRENTE DE UM VÍDEO EM ANDAMENTO** — nem podia: quando o robô arranca,
 * já escolheu. O tema do dono é o PRÓXIMO a ser escolhido, que é exatamente o que ele
 * pediu.
 *
 * ⚠️ **A CONTA VIVE NOUTRO FICHEIRO** (`lib/oportunidade-fila.js`), sem nada do Node, para
 * a Cloudflare poder usar A MESMA. Aqui só se lê e escreve em disco. Ver o aviso lá.
 *
 * Este caminho é a REDE POR BAIXO: no dia a dia quem escreve na fila é a página /status,
 * direto. Isto serve para o dia em que a página estiver em baixo — e para o robô do
 * GitHub, que também sabe correr isto à mão.
 *
 * Uso:
 *   node src/scripts/youtube/oportunidade.js --formato=short --tema="..." [--titulo="..."]
 *   node src/scripts/youtube/oportunidade.js --formato=longo --tema="..." --titulo="..."
 *   node src/scripts/youtube/oportunidade.js --formato=ambos --tema="..." --titulo="..."
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { conferirOportunidade, inserirNoShort, inserirNoLongo } from '../../../functions/api/_oportunidade-fila.js';

const ROOT = process.cwd();
const TOPICS = join(ROOT, '.github', 'data', 'youtube-topics.json');
const LONGOS = join(ROOT, '.github', 'data', 'youtube-longos.json');

const lerJson = (caminho, vazio) => {
  if (!existsSync(caminho)) return vazio;
  try { return JSON.parse(readFileSync(caminho, 'utf-8')) || vazio; } catch { return vazio; }
};

// ─── execução direta ─────────────────────────────────────────────────────────

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('youtube/oportunidade.js')) {
  const args = Object.fromEntries(
    process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => {
      const [k, ...v] = a.slice(2).split('=');
      return [k, v.join('=') || true];
    }),
  );
  const formato = String(args.formato || 'short');
  const tema = String(args.tema || '');
  const titulo = String(args.titulo || '');

  const queixas = conferirOportunidade({ formato, tema, titulo });
  if (queixas.length) {
    console.error(`\n❌ o tema não entrou:\n   · ${queixas.join('\n   · ')}\n`);
    process.exit(1);
  }

  const quando = new Date().toISOString();
  const feito = [];

  if (formato === 'short' || formato === 'ambos') {
    const r = inserirNoShort(lerJson(TOPICS, { topics: [] }), { tema, titulo, quando });
    writeFileSync(TOPICS, `${JSON.stringify(r.dados, null, 2)}\n`, 'utf-8');
    feito.push(`Short: "${r.entrada.id}" à cabeça da fila`);
  }
  if (formato === 'longo' || formato === 'ambos') {
    const r = inserirNoLongo(lerJson(LONGOS, { videos: [] }), { tema, titulo, quando });
    writeFileSync(LONGOS, `${JSON.stringify(r.dados, null, 2)}\n`, 'utf-8');
    feito.push(`Vídeo longo: "${r.entrada.slug}" à cabeça da fila`);
  }

  console.log(`\n✅ oportunidade do dono registada:\n   · ${feito.join('\n   · ')}\n`);
  console.log('   O próximo vídeo a ser feito é este. Depois a fila segue como estava.\n');
}
