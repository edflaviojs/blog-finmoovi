/**
 * A OPORTUNIDADE DO DONO — a conta pura, sem tocar em disco (06/08/2026, IMPL20 §60).
 *
 * ⚠️ **ESTE FICHEIRO NÃO IMPORTA NADA DO NODE, E É A RAZÃO DE ELE EXISTIR.** Ele corre em
 * dois sítios muito diferentes: no robô do GitHub (Node) e **dentro da Cloudflare**, que
 * não tem `fs` nem nada do Node. Uma segunda cópia da conta na Cloudflare seria a mesma
 * regra escrita duas vezes — e o dia em que uma mudasse sem a outra, o tema do dono
 * entrava na fila de maneira diferente conforme o caminho. Uma regra, um sítio.
 *
 * Quem mexe em ficheiros:
 *   · `src/scripts/youtube/oportunidade.js`  (o robô, com `fs`)
 *   · `functions/api/oportunidade.js`        (a Cloudflare, pela API do GitHub)
 */

/** O que o vídeo longo exige antes de deixar um tema entrar. */
export const MIN_TITULO_LONGO = 20;
export const MAX_TITULO_LONGO = 70;
export const MIN_TEMA = 10;
export const MAX_TEMA = 300;

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
 *
 * 🔴 **O TÍTULO DO VÍDEO LONGO É EXIGIDO, e recusar aqui vale uma semana.** O robô que
 * publica recusa-se a subir um vídeo longo sem título aprovado — *"um título mau é a coisa
 * mais cara que este canal pode pôr no ar"*. Sem esta trava, o tema entrava na fila e a
 * corrida de sábado de madrugada falhava, com o dono a dormir. **Recusar enquanto ele está
 * a olhar é barato; recusar de madrugada custa uma semana sem vídeo.**
 */
export function conferirOportunidade({ formato, tema, titulo }) {
  const queixas = [];
  const t = String(tema || '').trim();
  const tit = String(titulo || '').trim();
  if (!['short', 'longo', 'ambos'].includes(formato)) queixas.push('o formato tem de ser short, longo ou ambos');
  if (t.length < MIN_TEMA) queixas.push('o tema está curto de mais — escreva a ideia numa frase');
  if (t.length > MAX_TEMA) queixas.push(`o tema está comprido de mais (máximo ${MAX_TEMA} letras)`);
  if (formato !== 'short') {
    if (!tit) queixas.push('o vídeo longo precisa de um título — é ele que fica na lista do canal para sempre');
    else if (tit.length < MIN_TITULO_LONGO) queixas.push(`o título do vídeo longo tem de ter pelo menos ${MIN_TITULO_LONGO} letras`);
    else if (tit.length > MAX_TITULO_LONGO) queixas.push(`o título do vídeo longo não pode passar das ${MAX_TITULO_LONGO} letras`);
  }
  return queixas;
}

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
