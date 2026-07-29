/**
 * TRAVA DEFINITIVA: Validacao de Sincronizacao i18n do Blog
 * 
 * Este script BLOQUEIA o build se detectar:
 * 1. Posts sem campo locale
 * 2. translationKey sem cobertura nos 3 idiomas (pt, en, es)
 * 3. Titulos/descriptions em idioma errado (PT em arquivos EN/ES)
 * 4. SEO fields em idioma incorreto
 * 
 * Executado automaticamente antes de cada build via npm run build
 */

import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";
import { config } from "../site.config.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const POSTS_DIR = path.resolve(__dirname, "../src/content/posts");
const GLOSSARIO_DIR = path.resolve(__dirname, "../src/content/glossario");

// T8: locales exigidos vêm do config (modo 1 idioma valida só o(s) configurado(s))
const LOCALES = [...config.locales];

const PT_WORDS_BLOCKED_IN_EN = [
  "metodo", "orcamento", "financeiro", "financeira", "planilha", "dicas",
  "investimentos", "iniciantes", "autonomos", "contas", "fixas", "descontos",
  "negociar", "cotacoes", "glossario", "resumo", "semanal", "mercado",
  "previdencia", "privada", "investir", "conta", "propria", "qual", "vale",
  "mais", "pena", "escolha", "certa", "futuro", "aprenda", "migrando",
  "dolar", "analise", "planejamento", "financas", "pessoais", "economizar",
  "poupar", "gastar", "controlar", "gastos", "organizar", "reserva",
  "emergencia", "renda", "semana"
];

const PT_WORDS_BLOCKED_IN_ES = [
  "planilha", "planilhas", "financeiro", "financeiros", "dicas",
  "iniciantes", "orcamento", "investimentos", "autonomos", "glossario",
  "resumo", "aprenda", "app financeiro"
];

// ⚙️ AJUSTE POR NICHO: termos técnicos PT permitidos em EN/ES (+ a marca, sempre dinâmica).
const ALLOWED_PT_TERMS = ["tesouro direto", "selic", "cdi", "ipca", "pgbl", "vgbl", config.brand.name.toLowerCase()];

// IMPLEMENTACAO23 Fase 6 — GUARD anti-âncora-local em peças `universal`.
// Só padrões de ALTA PRECISÃO (evita falso positivo). NÃO inclui "real/reais"
// (ambíguo: "ganho real", "tempo real") nem produtos BR (PIX/Selic/CDB) que podem
// aparecer legitimamente como exemplo regional num verbete universal (REGRA 17).
const LOCAL_ANCHORS = [
  ["R$ (moeda fixa)", /R\$\s?\d/],
  ["Brasil",          /\bBrasil\b/i],
  ["brasileiro/a",    /\bbrasileir[oa]s?\b/i],
];
// Rollout: nasce WARNING (não bloqueia). Virar `true` só APÓS a campanha de limpeza/
// reclassificação das peças acusadas (ver IMPLEMENTACAO23 Fase 6 / item G). Enquanto
// false, apenas reporta (arquivo:linha — termo) sem empurrar para errors[].
const ANCHOR_GUARD_BLOCKING = false;
let anchorHits = []; // { path, file, line, label, text }

// IMPLEMENTACAO23 Fase 6.1 — enforcement "só o novo": o que a mudança ACRESCENTOU
// bloqueia; o legado permanece WARNING. `ANCHOR_GUARD_BLOCKING=true` continua
// sendo o override que bloqueia TUDO (pós-faxina).
//
// 29/07/2026 — CONSERTO. A primeira versão media ARQUIVO: bastava constar do
// `git diff --name-only` para TODAS as âncoras do arquivo virarem bloqueantes,
// incluindo as que estavam lá há meses. Dois commits do dia que só reescreveram
// a URL dentro de links markdown acusaram 179 e 240 ocorrências pré-existentes.
// O custo disso não é o e-mail de falha: é ensinar toda a gente a ignorar gate
// vermelho, e aí o dia em que ele acusar algo verdadeiro passa batido.
//
// Agora a granularidade é OCORRÊNCIA: o arquivo é comparado com a sua própria
// versão na base (ANCHOR_BASE_REF) e só o EXCEDENTE por (arquivo, label) bloqueia.
const ANCHOR_BASE_REF = (process.env.ANCHOR_BASE_REF || "").trim();

/**
 * Executa git dentro do repositório.
 * @param {string[]} args Argumentos do git.
 * @returns {string|null} stdout, ou null em qualquer falha (git ausente, ref
 *   inválida, caminho inexistente no commit).
 */
function git(args) {
  try {
    return execFileSync("git", args, {
      cwd: REPO_ROOT,
      encoding: "utf-8",
      maxBuffer: 64 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    return null;
  }
}

// A base é confiável? Verificamos UMA vez, e isso prova três coisas de uma vez:
// que há git, que estamos num work tree e que a ref existe. A partir daqui, uma
// falha de `git show <ref>:<caminho>` só pode significar "esse arquivo não existia
// na base" (arquivo novo) — distinção que decide entre bloquear tudo e não
// bloquear nada, e que não pode ficar por conta de adivinhar mensagem de erro.
// Sem base confiável (execução local, `npm run build` no Cloudflare, force-push,
// primeiro push da branch) => NADA bloqueia; o guard degrada para WARNING puro.
const ANCHOR_BASE_OK = Boolean(
  ANCHOR_BASE_REF &&
    git(["rev-parse", "--is-inside-work-tree"]) &&
    git(["rev-parse", "--verify", "--quiet", ANCHOR_BASE_REF + "^{commit}"])
);

/**
 * Lê o inventário de arquivos alterados publicado pelo i18n-gate.
 * Aceita, na mesma variável (um registro por linha ou separados por vírgula):
 *   - caminho puro  -> "src/content/posts/x.md"          (base = o mesmo caminho)
 *   - saída de `git diff --name-status -M`:
 *       "M<TAB>src/content/posts/x.md"                   (base = o mesmo caminho)
 *       "A<TAB>src/content/posts/x.md"                   (base = nenhuma)
 *       "R096<TAB>glossario/en-juros.md<TAB>glossario/en-interest.md"
 *                                                        (base = o caminho ANTIGO)
 * O caso R importa de verdade: este blog já renomeou 185 arquivos de conteúdo
 * para des-aportuguesar slugs EN/ES. Sem seguir o rename, cada um deles seria
 * lido como arquivo novo e despejaria todo o seu legado como bloqueante.
 * @param {string} raw Conteúdo da variável de ambiente.
 * @returns {Map<string, string|null>} caminho ATUAL -> caminho na BASE (null = novo).
 */
function parseStrictFiles(raw) {
  const norm = (p) => p.replace(/\\/g, "/").replace(/^\.\//, "");
  const map = new Map();

  for (const rawLine of String(raw || "").split(/[\n,]/)) {
    const cols = rawLine
      .split("\t")
      .map((c) => c.trim())
      .filter(Boolean);
    if (cols.length === 0) continue;

    if (cols.length === 1) {
      map.set(norm(cols[0]), norm(cols[0])); // caminho puro: assume alteração
      continue;
    }

    const status = cols[0].toUpperCase();
    if ((status.startsWith("R") || status.startsWith("C")) && cols.length >= 3) {
      map.set(norm(cols[2]), norm(cols[1]));
    } else {
      map.set(norm(cols[1]), status.startsWith("A") ? null : norm(cols[1]));
    }
  }
  return map;
}

const ANCHOR_STRICT_FILES = ANCHOR_BASE_OK
  ? parseStrictFiles(process.env.ANCHOR_STRICT_FILES)
  : new Map();

let errors = [];
let warnings = [];

function removeAccents(str) {
  return str.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function parseFrontmatter(content) {
  // Normalize CRLF to LF
  content = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const yaml = match[1];
  const data = {};

  const localeMatch = yaml.match(/^locale:\s*"?(\w+)"?\s*$/m);
  if (localeMatch) data.locale = localeMatch[1];

  const tkMatch = yaml.match(/^translationKey:\s*"?([^"\n]+)"?\s*$/m);
  if (tkMatch) data.translationKey = tkMatch[1].trim();

  // IMPLEMENTACAO23 §2.2 — scope governa se o grupo exige par EN/ES. Ausente = 'universal'.
  const scopeMatch = yaml.match(/^scope:\s*"?([\w-]+)"?\s*$/m);
  data.scope = scopeMatch ? scopeMatch[1] : "universal";

  // IMPLEMENTACAO23 Fase 6 — opt-out por peça: exemplo regional intencional
  // aprovado em revisão editorial isenta a peça do guard de âncora local.
  data.allowLocalAnchors = /^allowLocalAnchors:\s*true\s*$/m.test(yaml);

  const titleMatch = yaml.match(/^title:\s*(?:"([^"]+)"|'([^']+)'|(.+))\s*$/m);
  if (titleMatch) data.title = (titleMatch[1] || titleMatch[2] || titleMatch[3]).trim();

  const descMatch = yaml.match(/^description:\s*(?:"([^"]+)"|'([^']+)'|(.+))\s*$/m);
  if (descMatch) data.description = (descMatch[1] || descMatch[2] || descMatch[3]).trim();

  data.seo = {};
  const seoTitleMatch = yaml.match(/metaTitle:\s*"([^"]+)"/m);
  if (seoTitleMatch) data.seo.metaTitle = seoTitleMatch[1];
  const seoDescMatch = yaml.match(/metaDescription:\s*"([^"]+)"/m);
  if (seoDescMatch) data.seo.metaDescription = seoDescMatch[1];

  return data;
}

function containsBlockedWords(text, blockedWords, allowedTerms) {
  if (!text) return [];
  let lower = removeAccents(text.toLowerCase());
  // Remove allowed terms from text before checking blocked words
  for (const allowed of allowedTerms) {
    lower = lower.replaceAll(allowed, "");
  }
  const found = [];
  for (const word of blockedWords) {
    const regex = new RegExp("\\b" + word + "\\b", "i");
    if (regex.test(lower)) {
      found.push(word);
    }
  }
  return found;
}

/**
 * Extrai o corpo (markdown após o frontmatter) de um arquivo, CRLF-safe.
 * @param {string} content Conteúdo bruto do arquivo.
 * @returns {string} Corpo sem o bloco de frontmatter.
 */
function extractBody(content) {
  const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const m = normalized.match(/^---\n[\s\S]*?\n---\n?([\s\S]*)$/);
  return m ? m[1] : normalized;
}

/**
 * Fase 6 — ÚNICA função de detecção de âncoras locais (R$/Brasil/brasileiro).
 *
 * É aplicada ao arquivo em disco E à sua versão na base (`git show`), de
 * propósito: dois detectores com regras ligeiramente diferentes é exatamente o
 * buraco por onde o erro passa, e a comparação "antes x depois" só vale se os
 * dois lados forem medidos com a mesma régua.
 *
 * Devolve [] para peças ISENTAS — scope != universal, `allowLocalAnchors: true`,
 * ou frontmatter ilegível. A isenção vive DENTRO da detecção e não em quem chama,
 * senão um arquivo que troca `scope: br-only` por `universal` teria base idêntica
 * ao atual e as âncoras que ele acabou de assumir escapariam sem bloquear.
 *
 * @param {string} content Conteúdo bruto do arquivo (frontmatter incluído).
 * @returns {{ line: number, label: string, text: string }[]} Ocorrências encontradas.
 */
function detectAnchors(content) {
  const data = parseFrontmatter(content);
  if (!data) return [];
  if ((data.scope || "universal") !== "universal") return [];
  if (data.allowLocalAnchors) return [];

  const hits = [];
  const lines = extractBody(content).split("\n");
  for (let i = 0; i < lines.length; i++) {
    for (const [label, re] of LOCAL_ANCHORS) {
      if (re.test(lines[i])) hits.push({ line: i + 1, label, text: lines[i].trim() });
    }
  }
  return hits;
}

/**
 * Aplica `detectAnchors` ao arquivo em disco e arquiva as ocorrências.
 * @param {string} relPath Caminho relativo à raiz do repo (barras normais).
 * @param {string} file Nome do arquivo (para exibição).
 * @param {string} content Conteúdo bruto do arquivo.
 */
function collectAnchors(relPath, file, content) {
  for (const hit of detectAnchors(content)) anchorHits.push({ path: relPath, file, ...hit });
}

function validateDir(dir, useTranslationKey) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir).filter(f => f.endsWith(".md"));
  const translationGroups = {};
  const groupScope = {}; // groupKey -> scope da peça-mae (PT); default 'universal'

  for (const file of files) {
    const content = fs.readFileSync(path.join(dir, file), "utf-8");
    const data = parseFrontmatter(content);
    if (!data) { errors.push("[ERRO] " + file + ": Frontmatter invalido"); continue; }

    if (!data.locale) {
      errors.push("[ERRO] " + file + ": Campo locale AUSENTE no frontmatter");
      continue;
    }

    if (file.startsWith("en-") && data.locale !== "en")
      errors.push("[ERRO] " + file + ": Prefixo en- mas locale=" + data.locale);
    if (file.startsWith("es-") && data.locale !== "es")
      errors.push("[ERRO] " + file + ": Prefixo es- mas locale=" + data.locale);
    if (!file.startsWith("en-") && !file.startsWith("es-") && data.locale !== "pt")
      errors.push("[ERRO] " + file + ": Sem prefixo mas locale=" + data.locale + " (deveria ser pt)");

    // Determine grouping key
    let groupKey;
    if (useTranslationKey) {
      if (!data.translationKey) {
        errors.push("[ERRO] " + file + ": Campo translationKey AUSENTE");
        continue;
      }
      groupKey = data.translationKey;
    } else {
      // Glossario: use filename without locale prefix as group key
      groupKey = file.replace(/^(en-|es-)/, "").replace(/\.md$/, "");
    }

    if (!translationGroups[groupKey]) translationGroups[groupKey] = {};
    if (translationGroups[groupKey][data.locale])
      errors.push("[ERRO] " + file + ": chave " + groupKey + " duplicada para locale " + data.locale);
    translationGroups[groupKey][data.locale] = file;
    // O scope da peça-mãe (o locale padrão do blog) define se o grupo exige par.
    // config.defaultLocale, e não "pt" hardcoded: este é um template reutilizável
    // e um blog com idioma-base diferente nunca preencheria o groupScope — todo
    // grupo cairia no default "universal" e as peças locais voltariam a exigir
    // par. Mesmo contrato de validar-i18n.js e lib/i18n-sync.js, que já leem o
    // config.
    if (data.locale === config.defaultLocale) groupScope[groupKey] = data.scope || "universal";

    // IMPLEMENTACAO23 Fase 6 — âncora local proibida em peça universal (TODOS os
    // locales; PT universal também deve usar valores relativos, REGRA 17).
    // Peças br-only/pt-only e as marcadas allowLocalAnchors são isentas — a
    // isenção é decidida dentro de detectAnchors, para valer igual no arquivo
    // atual e na sua versão-base.
    collectAnchors(
      path.relative(REPO_ROOT, path.join(dir, file)).replace(/\\/g, "/"),
      file,
      content
    );

    if (data.locale === "en") {
      const fields = [
        ["title", data.title],
        ["description", data.description],
        ["seo.metaTitle", data.seo.metaTitle],
        ["seo.metaDescription", data.seo.metaDescription]
      ];
      for (const [field, value] of fields) {
        const issues = containsBlockedWords(value, PT_WORDS_BLOCKED_IN_EN, ALLOWED_PT_TERMS);
        if (issues.length > 0)
          warnings.push("[WARN] " + file + ": " + field + " contem palavras em PORTUGUES: [" + issues.join(", ") + "]");
      }
    }

    if (data.locale === "es") {
      const fields = [
        ["title", data.title],
        ["description", data.description],
        ["seo.metaTitle", data.seo.metaTitle],
        ["seo.metaDescription", data.seo.metaDescription]
      ];
      for (const [field, value] of fields) {
        const issues = containsBlockedWords(value, PT_WORDS_BLOCKED_IN_ES, ALLOWED_PT_TERMS);
        if (issues.length > 0)
          warnings.push("[WARN] " + file + ": " + field + " contem palavras em PORTUGUES: [" + issues.join(", ") + "]");
      }
    }
  }

  for (const [key, locales] of Object.entries(translationGroups)) {
    // Peças br-only/pt-only (§2.2) não exigem par EN/ES.
    if ((groupScope[key] || "universal") !== "universal") continue;
    const missing = LOCALES.filter(l => !locales[l]);
    if (missing.length > 0)
      errors.push("[ERRO] translationKey " + key + ": FALTANDO idiomas [" + missing.join(", ") + "]");
  }
}

console.log("");
console.log("============================================================");
console.log("  TRAVA i18n: Validando sincronizacao entre idiomas...");
console.log("============================================================");
console.log("");

validateDir(POSTS_DIR, true);
validateDir(GLOSSARIO_DIR, true);

/**
 * IMPLEMENTACAO23 Fase 6.1 — separa o que a mudança ACRESCENTOU (bloqueia) do
 * que já lá estava (WARNING).
 *
 * Granularidade: contagem por (arquivo, label). Para cada arquivo alterado,
 * comparamos quantas ocorrências de cada termo existem agora com quantas
 * existiam na versão-base; só o excedente bloqueia. Igual ou menor => o autor
 * não piorou a peça => WARNING, como o legado.
 *
 * Por que contagem, e não comparação do texto da linha: o caso que motivou este
 * conserto foi trocar a URL DENTRO de um link markdown em linhas que já
 * continham "R$". Comparar texto de linha marcaria cada uma dessas como âncora
 * nova e reproduziria o falso alarme. Por que por LABEL, e não total do arquivo:
 * assim, trocar um "Brasil" por um "R$ 500" continua bloqueando (o total não
 * mexe, mas a contagem de R$ sobe).
 *
 * @returns {{ strict: object[], legacy: object[] }} Ocorrências classificadas.
 */
function classifyAnchorHits() {
  // Override pós-faxina: bloqueia TUDO, sem consultar base.
  if (ANCHOR_GUARD_BLOCKING) return { strict: anchorHits.slice(), legacy: [] };

  const strict = [];
  const legacy = [];

  const byPath = new Map();
  for (const hit of anchorHits) {
    if (!byPath.has(hit.path)) byPath.set(hit.path, []);
    byPath.get(hit.path).push(hit);
  }

  for (const [relPath, hits] of byPath) {
    // Arquivo intocado por esta mudança (ou sem base confiável): legado.
    if (!ANCHOR_STRICT_FILES.has(relPath)) {
      legacy.push(...hits);
      continue;
    }

    // Arquivo NOVO (basePath null) ou ausente na base => baseline vazia, logo
    // TUDO o que ele traz é ocorrência nova e bloqueia.
    const basePath = ANCHOR_STRICT_FILES.get(relPath);
    const baseContent = basePath === null ? null : git(["show", ANCHOR_BASE_REF + ":" + basePath]);
    const baseHits = baseContent === null ? [] : detectAnchors(baseContent);

    const baseTextsByLabel = new Map();
    for (const b of baseHits) {
      if (!baseTextsByLabel.has(b.label)) baseTextsByLabel.set(b.label, []);
      baseTextsByLabel.get(b.label).push(b.text);
    }

    const hitsByLabel = new Map();
    for (const hit of hits) {
      if (!hitsByLabel.has(hit.label)) hitsByLabel.set(hit.label, []);
      hitsByLabel.get(hit.label).push(hit);
    }

    for (const [label, labelHits] of hitsByLabel) {
      const baseTexts = baseTextsByLabel.get(label) || [];
      const added = labelHits.length - baseTexts.length;
      if (added <= 0) {
        legacy.push(...labelHits);
        continue;
      }

      // A DECISÃO é a contagem (acima). O texto da linha serve só para ESCOLHER
      // quais linhas apontar no relatório: preferimos as que não existiam
      // literalmente na base — são as candidatas mais prováveis a serem as novas.
      // `novel.length >= added` sempre (as linhas casadas nunca passam do total
      // da base), então esta escolha nunca muda quantas bloqueiam.
      const unmatchedBase = baseTexts.slice();
      const novel = [];
      for (const hit of labelHits) {
        const i = unmatchedBase.indexOf(hit.text);
        if (i === -1) novel.push(hit);
        else unmatchedBase.splice(i, 1);
      }

      const blocking = new Set(novel.slice(0, added));
      for (const hit of labelHits) (blocking.has(hit) ? strict : legacy).push(hit);
    }
  }

  return { strict, legacy };
}

// IMPLEMENTACAO23 Fase 6.1 — saída do guard (arquivo:linha — termo).
if (anchorHits.length > 0) {
  const { strict, legacy } = classifyAnchorHits();

  if (legacy.length > 0) {
    console.log("");
    console.log("  ANCORAS LOCAIS em pecas universal LEGADAS (WARNING - nao bloqueia): " + legacy.length + " ocorrencia(s):");
    legacy.slice(0, 20).forEach(({ file, line, label }) =>
      console.log("   [ANCHOR] " + file + ":" + line + " - [" + label + "]"));
    if (legacy.length > 20) console.log("   ... e mais " + (legacy.length - 20) + " ocorrencia(s).");
  }

  if (strict.length > 0) {
    console.log("");
    console.log("  ANCORAS LOCAIS INTRODUZIDAS por esta mudanca (BLOQUEANTE): " + strict.length + " ocorrencia(s):");
    strict.forEach(({ file, line, label }) =>
      console.log("   [ANCHOR] " + file + ":" + line + " - [" + label + "]"));
    errors.push("Guard de ancora local: " + strict.length + " ocorrencia(s) ACRESCENTADA(S) por esta mudanca. " +
      "Peca universal NAO pode ganhar R$/Brasil/brasileiro (use valores relativos, ou marque scope: br-only / allowLocalAnchors: true). " +
      "As ocorrencias antigas do mesmo arquivo continuam como WARNING - so o que aumentou bloqueia.");
  }
}

if (errors.length > 0) {
  console.log("");
  console.log("  " + errors.length + " ERRO(S) - BUILD BLOQUEADO:");
  console.log("");
  errors.forEach(e => console.log("   " + e));
  console.log("");
  if (warnings.length > 0) {
    console.log("  " + warnings.length + " WARNING(S) de conteudo (nao bloqueantes):");
    warnings.forEach(w => console.log("   " + w));
    console.log("");
  }
  console.log("============================================================");
  console.log("  BUILD BLOQUEADO por problemas de sincronizacao i18n.");
  console.log("  Corrija os erros acima antes de fazer deploy.");
  console.log("============================================================");
  console.log("");
  process.exit(1);
} else {
  const postCount = fs.existsSync(POSTS_DIR) ? fs.readdirSync(POSTS_DIR).filter(f => f.endsWith(".md")).length : 0;
  const glossCount = fs.existsSync(GLOSSARIO_DIR) ? fs.readdirSync(GLOSSARIO_DIR).filter(f => f.endsWith(".md")).length : 0;
  console.log("  Validacao i18n PASSOU - " + postCount + " posts + " + glossCount + " glossario verificados.");
  console.log("  Todos sincronizados corretamente nos 3 idiomas.");
  if (warnings.length > 0) {
    console.log("");
    console.log("  " + warnings.length + " WARNING(S) de conteudo (corrigidos paulatinamente pelo workflow diario):");
    warnings.slice(0, 10).forEach(w => console.log("   " + w));
    if (warnings.length > 10) console.log("   ... e mais " + (warnings.length - 10) + " warnings");
  }
  console.log("");
}
