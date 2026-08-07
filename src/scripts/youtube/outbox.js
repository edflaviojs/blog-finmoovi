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
 *   node src/scripts/youtube/outbox.js saiu-hoje       → `sim`/`nao` (a repescagem do fim da tarde)
 *
 * ⚠️ exit 78 em `next` sem pendentes = o MESMO código "nada a fazer" que o
 * pick-next-short já usa — o workflow trata como sucesso neutro, não falha.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

const DATA_DIR = join(process.cwd(), '.github', 'data');
const FILA_PADRAO = 'youtube-outbox.json';
const NOTHING_TO_DO = 78;

/**
 * ♦ 05/08/2026 — HÁ MAIS DE UMA FILA, PORQUE HÁ MAIS DE UM CARTEIRO.
 *
 * O mesmo vídeo é entregue em dois sítios a horas diferentes: no YouTube ao meio-dia
 * e no Instagram às 19h. Cada carteiro tem de rasgar o SEU bilhete sem rasgar o do
 * outro — se partilhassem a fila, o primeiro a entregar apagava o trabalho do segundo.
 *
 * O que NÃO se fez: copiar este ficheiro para uma segunda fila. As regras de uma fila
 * (idempotência no enqueue, o mais antigo primeiro, o 78 quando está vazia) já foram
 * aprendidas à custa de erros — duplicá-las seria garantir que só uma das cópias
 * recebia a próxima correção.
 */
function caminhoDaFila(nome = FILA_PADRAO) {
  return join(DATA_DIR, nome);
}

function lerFila(nome) {
  const ficheiro = caminhoDaFila(nome);
  if (!existsSync(ficheiro)) return [];
  try {
    const data = JSON.parse(readFileSync(ficheiro, 'utf-8'));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function gravarFila(fila, nome) {
  const ficheiro = caminhoDaFila(nome);
  mkdirSync(dirname(ficheiro), { recursive: true });
  writeFileSync(ficheiro, `${JSON.stringify(fila, null, 2)}\n`);
}

/**
 * Os fileSlugs pendentes — usado pelo pick-next-short para não produzir 2× o mesmo tema.
 * ⚠️ Continua a olhar SÓ para a fila do YouTube, de propósito: é a entrega no YouTube
 * que define se um tema já foi tratado. Um tema à espera do Instagram não impede nada.
 */
export function listOutboxPending() {
  return lerFila(FILA_PADRAO).map((e) => e.fileSlug).filter(Boolean);
}

/**
 * ♦ 07/08/2026 — A REPESCAGEM (ordem do dono: *"não podemos correr o risco de não ter
 * vídeo postado no dia"*).
 *
 * ⚠️ **A FILA SOBREVIVE, A CADÊNCIA NÃO.** Em 06/08 o vídeo foi produzido, entrou na
 * fila — e o carteiro das 12h nunca chegou a receber máquina do GitHub (pane; o job
 * morreu com zero passos ao fim de 15 minutos). O bilhete ficou intacto, que é o que a
 * fila promete, mas o canal ficou DOIS DIAS sem Short. Guardar o trabalho não é o
 * mesmo que entregá-lo no dia.
 *
 * Por isso há uma segunda ronda ao fim da tarde. Ela só age se HOJE ainda não saiu
 * nada: sem esta pergunta, um dia com fila atrasada despejaria dois vídeos seguidos.
 *
 * O dia mede-se em UTC — é o relógio do cron, e é o mesmo que carimba o `uploadedAt`.
 */
export function jaSaiuVideoNoDia(diaUTC, tracking) {
  return Object.values(tracking || {}).some(
    (v) => String((v && v.uploadedAt) || '').slice(0, 10) === diaUTC,
  );
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
  // --fila=instagram-outbox.json escolhe a fila do outro carteiro; sem ela, a do YouTube.
  const nomeDaFila = flags.fila || FILA_PADRAO;
  const fila = lerFila(nomeDaFila);

  if (comando === 'enqueue') {
    const { 'file-slug': fileSlug, 'run-id': runId } = flags;
    if (!fileSlug || !runId) { console.error('enqueue exige --file-slug e --run-id'); process.exit(1); }
    // idempotente: re-rodar a produção do mesmo slug substitui o bilhete (o
    // artefato mais novo é o que vale), nunca duplica.
    const semEste = fila.filter((e) => e.fileSlug !== fileSlug);
    semEste.push({ fileSlug, runId: String(runId), producedAt: new Date().toISOString(), artifact: `short-${fileSlug}` });
    gravarFila(semEste, nomeDaFila);
    console.log(`📬 na fila ${nomeDaFila}: ${fileSlug} (run ${runId}) — ${semEste.length} pendente(s)`);
  } else if (comando === 'next') {
    if (!fila.length) { console.error(`📭 fila ${nomeDaFila} vazia — nada a publicar.`); process.exit(NOTHING_TO_DO); }
    console.log(JSON.stringify(fila[0]));
  } else if (comando === 'done') {
    const { 'file-slug': fileSlug } = flags;
    if (!fileSlug) { console.error('done exige --file-slug'); process.exit(1); }
    gravarFila(fila.filter((e) => e.fileSlug !== fileSlug), nomeDaFila);
    console.log(`✅ entregue e fora da fila ${nomeDaFila}: ${fileSlug}`);
  } else if (comando === 'pending') {
    for (const s of listOutboxPending()) console.log(s);
  } else if (comando === 'saiu-hoje') {
    // Imprime `sim` ou `nao` e sai sempre a 0 — o workflow LÊ a resposta em vez de a
    // adivinhar num código de saída. Aqui um exit diferente de 0 seria confundido com
    // avaria, e a repescagem é justamente o passo que não pode falhar por engano.
    const TRACKING = join(DATA_DIR, 'youtube-published.json');
    let tracking = {};
    try { tracking = JSON.parse(readFileSync(TRACKING, 'utf-8')); } catch { /* sem tracking = nada saiu */ }
    const hoje = flags.dia || new Date().toISOString().slice(0, 10);
    console.log(jaSaiuVideoNoDia(hoje, tracking) ? 'sim' : 'nao');
  } else {
    console.error('comando desconhecido — use: enqueue | next | done | pending | saiu-hoje');
    process.exit(1);
  }
}
