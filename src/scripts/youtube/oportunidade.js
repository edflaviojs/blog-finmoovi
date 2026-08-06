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
 * ⚠️ **O VÍDEO LONGO EXIGE TÍTULO, e isto não é capricho:** o `upload-longo.js` recusa-se
 * a publicar sem um título aprovado, porque *"um título mau é a coisa mais cara que este
 * canal pode pôr no ar"*. Um tema longo sem título entraria na fila e faria a corrida de
 * sábado falhar — por isso é recusado **aqui**, onde o dono ainda está a olhar, e não lá,
 * de madrugada.
 *
 * Uso (é o robô que chama, não uma pessoa):
 *   node src/scripts/youtube/oportunidade.js --formato=short --tema="..." [--titulo="..."]
 *   node src/scripts/youtube/oportunidade.js --formato=longo --tema="..." --titulo="..."
 *   node src/scripts/youtube/oportunidade.js --formato=ambos --tema="..." --titulo="..."
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const TOPICS = join(ROOT, '.github', 'data', 'youtube-topics.json');
const LONGOS = join(ROOT, '.github', 'data', 'youtube-longos.json');

/** O que o vídeo longo exige antes de deixar um tema entrar. Ver o aviso do topo. */
export const MIN_TITULO_LONGO = 20;
export const MAX_TITULO_LONGO = 70;

export function fazerSlugDoDono(tema, usados = new Set()) {
  const base = String(tema || '')
    .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .split('-').filter(Boolean).slice(0, 6).join('-') || 'tema';
  let slug = `dono-${base}`;
  let n = 2;
  while (usados.has(slug)) { slug = `dono-${base}-${n}`; n += 1; }
  return slug;
}

/**
 * As queixas sobre o que o dono escreveu — ou nada, se estiver bom.
 * ⚠️ **Recusar aqui é barato; recusar de madrugada custa uma semana.**
 */
export function conferirOportunidade({ formato, tema, titulo }) {
  const queixas = [];
  const t = String(tema || '').trim();
  const tit = String(titulo || '').trim();
  if (!['short', 'longo', 'ambos'].includes(formato)) queixas.push('o formato tem de ser short, longo ou ambos');
  if (t.length < 10) queixas.push('o tema está curto de mais — escreva a ideia numa frase');
  if (t.length > 300) queixas.push('o tema está comprido de mais (máximo 300 letras)');
  if (formato !== 'short') {
    if (!tit) queixas.push('o vídeo longo precisa de um título — é ele que fica na lista do canal para sempre');
    else if (tit.length < MIN_TITULO_LONGO) queixas.push(`o título do vídeo longo tem de ter pelo menos ${MIN_TITULO_LONGO} letras`);
    else if (tit.length > MAX_TITULO_LONGO) queixas.push(`o título do vídeo longo não pode passar das ${MAX_TITULO_LONGO} letras`);
  }
  return queixas;
}

const lerJson = (caminho, vazio) => {
  if (!existsSync(caminho)) return vazio;
  try { return JSON.parse(readFileSync(caminho, 'utf-8')) || vazio; } catch { return vazio; }
};

/**
 * Põe o tema à CABEÇA da fila dos Shorts, com a marca de prioridade.
 * ⚠️ À cabeça E com a marca: a marca é o que manda (o selecionador do Short ordena por
 * pontuação, não por posição), e a posição é para quem abrir o ficheiro perceber.
 */
export function inserirNoShort(dados, { tema, titulo, quando }) {
  const topics = Array.isArray(dados?.topics) ? dados.topics : [];
  const usados = new Set(topics.map((t) => t?.id).filter(Boolean));
  const id = fazerSlugDoDono(tema, usados);
  const novo = {
    id,
    theme: String(tema).trim(),
    angle: `Ideia do dono: ${String(tema).trim()}`,
    pillar: 'dono',
    source: 'dono',
    status: 'pending',
    prioridade: true,
    ...(String(titulo || '').trim() ? { tituloDoDono: String(titulo).trim() } : {}),
    criadoEm: quando,
  };
  return { dados: { ...dados, topics: [novo, ...topics] }, entrada: novo };
}

/**
 * Põe o tema à CABEÇA da fila do vídeo longo.
 * ⚠️ Aqui a posição é que manda mesmo: `proximoLongo` devolve **o primeiro por fazer**.
 */
export function inserirNoLongo(dados, { tema, titulo, quando }) {
  const videos = Array.isArray(dados?.videos) ? dados.videos : [];
  const usados = new Set(videos.map((v) => v?.slug).filter(Boolean));
  const slug = fazerSlugDoDono(tema, usados);
  const novo = {
    slug,
    titulo: String(titulo).trim(),
    tema: String(tema).trim(),
    angulo: `Ideia do dono: ${String(tema).trim()}`,
    /**
     * ⚠️ SEM `glossario`, de propósito. O `conferirTema` exige que o glossário exista, e
     * o dono não tem de saber os nomes dos ficheiros do blog. O escritor do guião trata
     * um tema sem glossário como trata os temas vindos dos virais.
     */
    estado: 'proposto',
    prioridade: true,
    origem: 'dono',
    criadoEm: quando,
  };
  return { dados: { ...dados, videos: [novo, ...videos] }, entrada: novo };
}

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
