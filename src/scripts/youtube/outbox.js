/**
 * A FILA DE SAÍDA (outbox) — a ponte entre PRODUZIR e PUBLICAR (03/08/2026).
 *
 * ═══ POR QUE EXISTE (IMPLEMENTACAO20 §32 / IMPLEMENTACAO24) ═══
 * O robô fazia tudo num fôlego às 06:30 UTC — ou seja, PUBLICAVA às 03:30 da
 * manhã no Brasil, o pior horário possível. A separação (decisão do dono,
 * 03/08): a PRODUÇÃO continua de madrugada (máquinas folgadas, e se falhar há
 * horas para repetir antes da entrega), e a PUBLICAÇÃO ganha um gatilho próprio
 * no horário nobre BR. O vídeo pronto viaja como ARTEFATO do run de produção;
 * este ficheiro é o bilhete que diz ao carteiro onde ele está.
 *
 * O estado vive em `.github/data/youtube-outbox.json`:
 *   [ { "fileSlug": "...", "runId": "...", "producedAt": "...", "artifact": "short-<slug>" } ]
 *
 * Comandos (sempre por aqui — DOIS workflows escrevem no mesmo ficheiro, e uma
 * regra num sítio só é a regra da casa):
 *   node src/scripts/youtube/outbox.js enqueue --file-slug=X --run-id=N
 *   node src/scripts/youtube/outbox.js next            → imprime JSON do mais antigo (ou nada, exit 78)
 *   node src/scripts/youtube/outbox.js done --file-slug=X
 *   node src/scripts/youtube/outbox.js pending         → imprime os fileSlugs pendentes (1 por linha)
 *
 * ⚠️ exit 78 em `next` sem pendentes = o MESMO código "nada a fazer" que o
 * pick-next-short já usa — o workflow trata como sucesso neutro, não falha.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

const OUTBOX = join(process.cwd(), '.github', 'data', 'youtube-outbox.json');
const NOTHING_TO_DO = 78;

function lerFila() {
  if (!existsSync(OUTBOX)) return [];
  try {
    const data = JSON.parse(readFileSync(OUTBOX, 'utf-8'));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function gravarFila(fila) {
  mkdirSync(dirname(OUTBOX), { recursive: true });
  writeFileSync(OUTBOX, `${JSON.stringify(fila, null, 2)}\n`);
}

/** Os fileSlugs pendentes — usado pelo pick-next-short para não produzir 2× o mesmo tema. */
export function listOutboxPending() {
  return lerFila().map((e) => e.fileSlug).filter(Boolean);
}

// ─── execução direta (CLI dos workflows) ─────────────────────────────────────
const executadoDireto = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('outbox.js');
if (executadoDireto) {
  const [comando] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const flags = Object.fromEntries(
    process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => {
      const [k, ...v] = a.slice(2).split('=');
      return [k, v.join('=')];
    }),
  );
  const fila = lerFila();

  if (comando === 'enqueue') {
    const { 'file-slug': fileSlug, 'run-id': runId } = flags;
    if (!fileSlug || !runId) { console.error('enqueue exige --file-slug e --run-id'); process.exit(1); }
    // idempotente: re-rodar a produção do mesmo slug substitui o bilhete (o
    // artefato mais novo é o que vale), nunca duplica.
    const semEste = fila.filter((e) => e.fileSlug !== fileSlug);
    semEste.push({ fileSlug, runId: String(runId), producedAt: new Date().toISOString(), artifact: `short-${fileSlug}` });
    gravarFila(semEste);
    console.log(`📬 na fila de saída: ${fileSlug} (run ${runId}) — ${semEste.length} pendente(s)`);
  } else if (comando === 'next') {
    if (!fila.length) { console.error('📭 fila de saída vazia — nada a publicar.'); process.exit(NOTHING_TO_DO); }
    console.log(JSON.stringify(fila[0]));
  } else if (comando === 'done') {
    const { 'file-slug': fileSlug } = flags;
    if (!fileSlug) { console.error('done exige --file-slug'); process.exit(1); }
    gravarFila(fila.filter((e) => e.fileSlug !== fileSlug));
    console.log(`✅ entregue e fora da fila: ${fileSlug}`);
  } else if (comando === 'pending') {
    for (const s of listOutboxPending()) console.log(s);
  } else {
    console.error('comando desconhecido — use: enqueue | next | done | pending');
    process.exit(1);
  }
}
