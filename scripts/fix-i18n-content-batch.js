/**
 * fix-i18n-content-batch.js — Daily batch content correction for i18n posts.
 *
 * Reads audit-content-results.json, picks the next BATCH_SIZE files, calls the
 * LLM to re-adapt their body (fix R$, BR institutions, brands, geo refs), and
 * writes the corrected content back.
 *
 * A fila vem de src/scripts/lib/i18n-queue.js e a regra é: entra quem ainda tem
 * defeito E ainda tem tentativas por gastar. Depois de escrever, o ficheiro é
 * RE-MEDIDO com o mesmo detector da auditoria — é isso que distingue este robô
 * do que existia até 06/08/2026, que marcava "feito" sem nunca conferir.
 *
 * O workflow regenera audit-content-results.json ANTES desta corrida. Sem isso a
 * fila é montada contra uma foto velha: em 06/08/2026 a auditoria tinha um único
 * commit em toda a história, 52 entradas mortas, e 96 ficheiros do disco que nem
 * sequer lá estavam.
 *
 * Env vars:
 *   BATCH_SIZE      — files per run (default 20)
 *   MAX_TENTATIVAS  — passagens pelo mesmo ficheiro antes de pedir humano (default 3)
 *   DRY_RUN         — 'true' to skip writing (default 'false')
 *   GROQ_API_KEY / CEREBRAS_API_KEY — LLM credentials (at least one required)
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { generateText } from '../src/scripts/apis/kie-ai.js';
import { getTranslationInstructions } from '../src/scripts/lib/translation-prompt.js';
import { fixInternalLinks, carregarDestinos } from '../src/scripts/lib/link-guard.js';
import {
  montarFila,
  lerProgresso,
  serializarProgresso,
  registarTentativa,
} from '../src/scripts/lib/i18n-queue.js';
import { analisarConteudo } from './audit-content-i18n.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '20', 10);
const DRY_RUN = process.env.DRY_RUN === 'true';
// Passagens pelo mesmo ficheiro antes de desistir e pedir humano. Ver
// src/scripts/lib/i18n-queue.js para o porquê de haver um tecto.
const MAX_TENTATIVAS = parseInt(process.env.MAX_TENTATIVAS || '3', 10);

const AUDIT_FILE = join(__dirname, 'audit-content-results.json');
const PROGRESS_FILE = join(__dirname, 'fix-i18n-progress.json');

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Splits a markdown file into frontmatter (with delimiters) and body.
 * @param {string} content - Full file content
 * @returns {{ frontmatter: string, body: string } | null}
 */
function splitContent(content) {
  const firstDash = content.indexOf('---');
  if (firstDash === -1) return null;
  const secondDash = content.indexOf('---', firstDash + 3);
  if (secondDash === -1) return null;
  const fmEnd = secondDash + 3;
  return {
    frontmatter: content.slice(0, fmEnd),
    body: content.slice(fmEnd).trim(),
  };
}

/**
 * Extracts a scalar YAML field value from frontmatter text.
 * Handles both quoted and unquoted values.
 * @param {string} fm - Raw frontmatter string
 * @param {string} key - Field name
 * @returns {string | null}
 */
function getFmField(fm, key) {
  const re = new RegExp(`^${key}:\\s*['"]?(.+?)['"]?\\s*$`, 'm');
  const m = fm.match(re);
  return m ? m[1] : null;
}

/**
 * Replaces a scalar YAML field value in frontmatter.
 * Only replaces if the field exists.
 * @param {string} fm - Raw frontmatter string
 * @param {string} key - Field name
 * @param {string} newValue - New value (will be quoted)
 * @returns {string} Updated frontmatter
 */
function setFmField(fm, key, newValue) {
  const re = new RegExp(`^(\\s*${key}:\\s*)(['"]?).*?\\2\\s*$`, 'm');
  if (!re.test(fm)) return fm;
  return fm.replace(re, `$1"${newValue.replace(/"/g, '\\"')}"`);
}

/**
 * Checks if a string contains Portuguese-specific markers that indicate
 * it needs adaptation (R$, BR institution names, geographic references).
 * @param {string} text
 * @returns {boolean}
 */
function needsAdaptation(text) {
  if (!text) return false;
  const markers = /R\$|Tesouro Direto|Serasa|SPC|Receita Federal|IBGE|CDI|Selic|IPCA|FGTS|no Brasil|brasileir/i;
  return markers.test(text);
}

/**
 * Um valor devolvido pelo LLM só pode entrar no frontmatter se passar aqui.
 *
 * Motivado por dano REAL: em 30/07/2026 o batch escreveu
 * `description: "...for diversifying your portfolio. (155 chars)"` em
 * src/content/posts/en-quotes-semana-3-july-2026.md — o placeholder do formato do
 * prompt (translation-prompt.js, "[... max 155 chars]") vazou para o valor publicado.
 *
 * Rejeita três classes:
 *  1. resíduo de instrução do prompt;
 *  2. newline ou `---` dentro do valor — parte o YAML do frontmatter e pode
 *     derrubar o `astro build`, ou seja o deploy do site INTEIRO (o workflow que
 *     causaria isso já fez push e fica verde; não há validação nem rollback);
 *  3. valor vazio ou absurdamente longo.
 *
 * Limites medidos no corpus em 30/07 (474 ficheiros): título mais longo 85 chars,
 * descrição mais longa 186. Os tetos abaixo dão folga e produziram 0 falsos
 * positivos em títulos e 1 em descrições — justamente a contaminada.
 */
function fieldLooksClean(value, maxLen) {
  if (!value) return false;
  const v = value.trim();
  if (!v || v.length > maxLen) return false;
  if (/[\r\n]/.test(v) || v.includes('---')) return false;
  if (/\(\s*\d+\s*chars?\s*\)|max \d+ chars|\[translated|\[adapted/i.test(v)) return false;
  return true;
}

/**
 * Delays execution for the given milliseconds.
 * @param {number} ms
 */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  // Load audit results
  if (!existsSync(AUDIT_FILE)) {
    console.error('ERROR: audit-content-results.json not found. Run audit-content-i18n.js first.');
    process.exit(1);
  }
  const auditResults = JSON.parse(readFileSync(AUDIT_FILE, 'utf-8'));

  // Load progress tracker (aceita o formato antigo — lista de nomes — e o novo)
  const progresso = lerProgresso(
    existsSync(PROGRESS_FILE) ? JSON.parse(readFileSync(PROGRESS_FILE, 'utf-8')) : []
  );

  const caminhoDe = (entry) =>
    join(ROOT, entry.dir === 'posts' ? 'src/content/posts' : 'src/content/glossario', entry.file);

  // A fila deixou de ser "quem ainda não foi processado" e passou a ser "quem
  // ainda tem defeito e ainda tem tentativas". Ver src/scripts/lib/i18n-queue.js.
  const { fila, desistidos, mortos } = montarFila({
    auditoria: auditResults,
    progresso,
    maxTentativas: MAX_TENTATIVAS,
    existe: (entry) => existsSync(caminhoDe(entry)),
  });

  const batch = fila.slice(0, BATCH_SIZE);

  console.log(`=== Fix i18n Content Batch ===`);
  console.log(`Pending: ${fila.length} files`);
  console.log(`Batch:   ${batch.length} files (menos tentativas primeiro, depois severidade)`);
  console.log(`DRY RUN: ${DRY_RUN}`);
  console.log(`Max tentativas por ficheiro: ${MAX_TENTATIVAS}`);
  if (mortos.length > 0) {
    console.log(`Entradas mortas ignoradas (ficheiro não existe): ${mortos.length}`);
  }
  console.log('');

  // Em voz alta, nunca em silêncio: estes esgotaram as tentativas e a IA não os
  // resolveu. Ficam fora da fila para não queimarem um lugar do lote todos os
  // dias, mas aparecem aqui em TODAS as corridas até alguém lhes tocar.
  if (desistidos.length > 0) {
    console.log(`⚠️  PRECISAM DE HUMANO — ${desistidos.length} ficheiro(s) com ${MAX_TENTATIVAS} tentativas gastas e defeito por resolver:`);
    for (const d of desistidos) {
      console.log(`     severidade ${d.severity}  ${d.dir}/${d.file}`);
    }
    console.log('');
  }

  if (batch.length === 0) {
    console.log('Nothing to fix — nenhum ficheiro com defeito e tentativas por gastar.');
    return;
  }

  let fixed = 0;
  let errors = 0;
  let skipped = 0;
  let linksDesfeitos = 0;
  let naoBaixou = 0;

  /**
   * Grava o progresso em disco. Chamado a cada ficheiro para uma corrida
   * interrompida não perder a contagem de tentativas.
   */
  const gravarProgresso = () => {
    if (DRY_RUN) return;
    writeFileSync(PROGRESS_FILE, JSON.stringify(serializarProgresso(progresso), null, 2), 'utf-8');
  };

  // Destinos reais de posts/glossario, lidos UMA vez: este script só altera
  // ficheiros existentes, nunca cria, logo a lista não muda durante a corrida.
  const destinosValidos = carregarDestinos(ROOT);
  console.log(`Destinos internos reais (posts + glossário): ${destinosValidos.size}`);
  console.log('');

  for (let i = 0; i < batch.length; i++) {
    const entry = batch[i];
    const dir = entry.dir === 'posts' ? 'src/content/posts' : 'src/content/glossario';
    const filePath = join(ROOT, dir, entry.file);

    if (!existsSync(filePath)) {
      // Guarda defensiva. montarFila() já retira as entradas mortas, e desde
      // 06/08/2026 o workflow regenera a auditoria antes de cada corrida, por
      // isso isto praticamente não dispara. Fica porque em 30/07/2026, com a
      // auditoria congelada, 10 dos 20 lugares do lote eram queimados em
      // ficheiros que já não existiam — TODOS OS DIAS.
      console.log(`  [SKIP] ${entry.file} — não existe em disco`);
      skipped++;
      continue;
    }

    const content = readFileSync(filePath, 'utf-8');
    const locale = entry.file.startsWith('en-') ? 'en' : 'es';
    const langName = locale === 'en' ? 'English' : 'Spanish';

    const parts = splitContent(content);
    if (!parts) {
      // Conta tentativa: o frontmatter está partido, repetir amanhã dá o mesmo.
      // Ao fim de MAX_TENTATIVAS entra na lista "precisa de humano".
      console.log(`  [SKIP] ${entry.file} — could not parse frontmatter`);
      registarTentativa(progresso, entry.file, entry.severity);
      gravarProgresso();
      errors++;
      continue;
    }

    const { frontmatter, body } = parts;

    try {
      // Build prompt using shared translation instructions
      const instructions = getTranslationInstructions(langName, {
        brandName: 'FinMoovi',
        appUrl: 'app.finmoovi.com',
        extraInstructions: `
IMPORTANT: You are RE-ADAPTING an existing translation that has localization issues.
The text is already partially in ${langName} but contains:
- Brazilian Real (R$) currency that needs conversion to ${locale === 'en' ? 'USD ($)' : 'EUR (€)'}
- Brazilian institution/product names that need international equivalents
- Geographic references to Brazil that need to be generalized

Fix ONLY the localization issues. Keep the existing structure, markdown, and flow intact.
Do NOT rewrite the entire article — just fix the specific cultural adaptation issues.
If the content is already properly adapted, return it unchanged.
Return ONLY the fixed body content in the ---CONTEUDO--- section.
For ---TITULO---, ---META---, ---HEADLINE---, ---KEYWORDS--- just return the existing values
unless they contain R$ or Brazilian-specific terms that need adaptation.`,
      });

      // O título e a descrição TÊM de ir no prompt. Antes só ia o corpo, e o
      // `extraInstructions` acima pedia ao modelo para "devolver os valores
      // existentes" de campos que ele nunca recebia — resultado: quando devolvia
      // um título, estava a INVENTÁ-LO a partir do corpo. Foi assim que nasceu o
      // título trocado em en-quotes-semana-3-july-2026.md em 30/07/2026.
      // Formato `Title:`/`Meta:`/`Content:` = o mesmo que translatePost() usa em
      // src/scripts/automacoes/gerar-post-investimentos.js.
      const currentTitle = getFmField(frontmatter, 'title') || '';
      const currentMeta = getFmField(frontmatter, 'description') || '';

      const prompt = `${instructions}

---ORIGINAL POST (${langName})---
Title: ${currentTitle}
Meta: ${currentMeta}
Content:
${body}`;

      console.log(`  [${i + 1}/${batch.length}] Processing: ${entry.file} (severity: ${entry.severity})...`);

      const response = await generateText(prompt, {
        maxTokens: 8000,
        temperature: 0.2,
      });

      // Parse the structured response
      const fixedBody = extractSection(response, 'CONTEUDO');
      const fixedTitle = extractSection(response, 'TITULO');
      const fixedMeta = extractSection(response, 'META');

      // As três recusas abaixo (resposta sem CONTEUDO, corpo curto demais, campo
      // contaminado) contam tentativa. O ficheiro NÃO é escrito e volta à fila,
      // como antes — a diferença é que agora a repetição é limitada. Sem tecto,
      // um ficheiro que o modelo devolve sempre mal queima um lugar do lote
      // todos os dias, para sempre, e ninguém fica a saber.
      if (!fixedBody) {
        console.log(`  [ERROR] ${entry.file} — could not parse LLM response (no CONTEUDO section)`);
        registarTentativa(progresso, entry.file, entry.severity);
        gravarProgresso();
        errors++;
        continue;
      }

      // Safety: reject suspiciously short bodies (likely LLM failure)
      if (fixedBody.length < 100) {
        console.log(`  [ERROR] ${entry.file} — LLM returned body too short (${fixedBody.length} chars), skipping`);
        registarTentativa(progresso, entry.file, entry.severity);
        gravarProgresso();
        errors++;
        continue;
      }

      // Guarda anti-link-inventado (src/scripts/lib/link-guard.js).
      // A regra 2 do prompt manda trocar o nome VISÍVEL dos produtos brasileiros
      // pelo equivalente internacional ("Selic" → "tasa base del banco central").
      // O modelo troca o texto do link e, a seguir, reescreve a URL para combinar
      // — inventando um slug que não existe. Em 05/08/2026 isso reprovou o build e
      // o blog PAROU de publicar durante ~20h sem ninguém notar. O link fica sem
      // URL (o texto é preservado); nunca se inventa destino de substituição.
      const guardado = fixInternalLinks(fixedBody, destinosValidos);
      if (guardado.changed) {
        for (const d of guardado.desembrulhados) {
          console.log(`  [LINK-GUARD] ${entry.file} — destino não existe, link desfeito: [${d.label}](${d.href})`);
        }
        linksDesfeitos += guardado.desembrulhados.length;
      }
      const bodySeguro = guardado.text;

      // Rebuild the file
      let newFrontmatter = frontmatter;

      // Only update frontmatter fields if they needed adaptation
      const willWriteTitle = Boolean(fixedTitle && needsAdaptation(getFmField(frontmatter, 'title')));
      const willWriteMeta = Boolean(fixedMeta && needsAdaptation(getFmField(frontmatter, 'description')));

      // Guarda de contaminação. Rejeita o FICHEIRO INTEIRO, não só o campo: uma
      // resposta que contamina o título não merece confiança no corpo tão-pouco,
      // e escrever metade deixaria a página num estado que ninguém pediu.
      // Não escrevendo nada, o ficheiro volta à fila e é retentado — até
      // MAX_TENTATIVAS, e depois aparece na lista "precisa de humano".
      if (willWriteTitle && !fieldLooksClean(fixedTitle, 120)) {
        console.log(`  [ERROR] ${entry.file} — título devolvido contaminado/inválido; ficheiro NÃO alterado, volta à fila`);
        registarTentativa(progresso, entry.file, entry.severity);
        gravarProgresso();
        errors++;
        continue;
      }
      if (willWriteMeta && !fieldLooksClean(fixedMeta, 200)) {
        console.log(`  [ERROR] ${entry.file} — descrição devolvida contaminada/inválida; ficheiro NÃO alterado, volta à fila`);
        registarTentativa(progresso, entry.file, entry.severity);
        gravarProgresso();
        errors++;
        continue;
      }

      if (willWriteTitle) {
        newFrontmatter = setFmField(newFrontmatter, 'title', fixedTitle.trim());
      }
      if (willWriteMeta) {
        newFrontmatter = setFmField(newFrontmatter, 'description', fixedMeta.trim());
      }
      // NOTA (30/07/2026): os campos aninhados `seo.metaTitle`/`seo.metaDescription`
      // são INERTES aqui — `getFmField` não aceita indentação, logo devolve null e
      // estes dois `if` nunca disparam. É DELIBERADO, não um bug a corrigir: medido,
      // destrancá-los alcançaria 31 ficheiros, dos quais 4 são inúteis (a página de
      // glossário ignora estes campos — ver src/pages/en/glossario/[slug].astro:73-95)
      // e 16 são as séries de cotações/custo de vida, que são sobre o mercado
      // brasileiro POR DESENHO. Ganho líquido ~11 ficheiros, em troca de pôr texto de
      // IA no <h1> de páginas indexadas (seo.metaTitle vence o title em
      // src/pages/en/posts/[slug].astro) num pipeline sem validação nem rollback.
      // Decisão do dono: não destrancar.
      if (fixedTitle && needsAdaptation(getFmField(frontmatter, 'metaTitle'))) {
        newFrontmatter = setFmField(newFrontmatter, 'metaTitle', fixedTitle.trim());
      }
      if (fixedMeta && needsAdaptation(getFmField(frontmatter, 'metaDescription'))) {
        newFrontmatter = setFmField(newFrontmatter, 'metaDescription', fixedMeta.trim());
      }

      const newContent = newFrontmatter + '\n\n' + bodySeguro.trim() + '\n';

      // ── O CONSERTO DE 06/08/2026 ──
      // Conferir o RESULTADO em vez de marcar "feito" e nunca mais olhar. Antes,
      // o robô escrevia e dava o ficheiro por arrumado; medido nesse dia, 110
      // ficheiros marcados como feitos continuavam defeituosos e nenhum deles
      // podia voltar à fila. A medição corre com o MESMO detector da auditoria,
      // é local e não gasta chamada à IA — o único custo é ler o texto que já
      // temos em memória.
      const depois = analisarConteudo(entry.file, newContent, entry.dir);

      if (!DRY_RUN) {
        writeFileSync(filePath, newContent, 'utf-8');
      }
      // A tentativa é registada mesmo em DRY_RUN só na memória desta corrida:
      // gravarProgresso() não escreve nada quando DRY_RUN está ligado.
      const registo = registarTentativa(progresso, entry.file, depois.severity);
      gravarProgresso();

      const restam = Math.max(0, MAX_TENTATIVAS - registo.tentativas);

      if (depois.severity === 0) {
        fixed++;
        console.log(`  [${DRY_RUN ? 'DRY' : 'FIXED'}] ${entry.file} — severidade ${entry.severity} → 0`);
      } else if (depois.severity < entry.severity) {
        fixed++;
        console.log(`  [${DRY_RUN ? 'DRY' : 'FIXED'}] ${entry.file} — severidade ${entry.severity} → ${depois.severity}; volta à fila (restam ${restam})`);
      } else {
        naoBaixou++;
        console.log(`  [PARCIAL] ${entry.file} — severidade continua ${depois.severity}; tentativa gasta (restam ${restam})`);
      }

      // Rate limit: 60 seconds between API calls (safe margin for Groq)
      if (i < batch.length - 1) {
        console.log(`  ... waiting 60s (rate limit) ...`);
        await sleep(60000);
      }
    } catch (err) {
      // Falha de rede/quota NÃO conta tentativa: o defeito não é do ficheiro, e
      // gastar tentativas num dia em que a IA está em baixo mandaria ficheiros
      // bons para a lista "precisa de humano" sem nunca terem sido tentados.
      console.error(`  [ERROR] ${entry.file}: ${err.message} (falha da API — não conta tentativa)`);
      errors++;
      // Wait longer on error (possible rate limit)
      if (i < batch.length - 1) {
        await sleep(90000);
      }
    }
  }

  gravarProgresso();

  console.log('');
  console.log(`=== Done ===`);
  console.log(`Resolvidos/melhorados: ${fixed}`);
  console.log(`Sem melhoria (tentativa gasta): ${naoBaixou}`);
  console.log(`Skipped:   ${skipped} (ficheiro não existe)`);
  console.log(`Errors:    ${errors}`);
  console.log(`Links inventados desfeitos: ${linksDesfeitos}`);
  console.log(`Precisam de humano (${MAX_TENTATIVAS} tentativas gastas): ${desistidos.length}`);
  console.log(`Remaining: ${Math.max(0, fila.length - batch.length)} na fila para as próximas corridas`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Response parsing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extracts a named section from the LLM structured response.
 * Sections are delimited by ---SECTION_NAME--- markers.
 * @param {string} response - Full LLM response
 * @param {string} section - Section name (e.g. 'CONTEUDO', 'TITULO')
 * @returns {string | null}
 */
function extractSection(response, section) {
  const startMarker = `---${section}---`;
  const startIdx = response.indexOf(startMarker);
  if (startIdx === -1) return null;

  const contentStart = startIdx + startMarker.length;

  // Find the next section marker or end of string
  const nextMarkerMatch = response.slice(contentStart).match(/\n---[A-Z]+---/);
  const endIdx = nextMarkerMatch
    ? contentStart + nextMarkerMatch.index
    : response.length;

  const extracted = response.slice(contentStart, endIdx).trim();
  return extracted || null;
}

// ─────────────────────────────────────────────────────────────────────────────

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
