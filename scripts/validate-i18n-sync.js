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
import { fileURLToPath } from "url";
import { config } from "../site.config.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
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

let errors = [];

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

  const titleMatch = yaml.match(/^title:\s*"([^"]+)"/m);
  if (titleMatch) data.title = titleMatch[1];

  const descMatch = yaml.match(/^description:\s*"([^"]+)"/m);
  if (descMatch) data.description = descMatch[1];

  data.seo = {};
  const seoTitleMatch = yaml.match(/metaTitle:\s*"([^"]+)"/m);
  if (seoTitleMatch) data.seo.metaTitle = seoTitleMatch[1];
  const seoDescMatch = yaml.match(/metaDescription:\s*"([^"]+)"/m);
  if (seoDescMatch) data.seo.metaDescription = seoDescMatch[1];

  return data;
}

function containsBlockedWords(text, blockedWords, allowedTerms) {
  if (!text) return [];
  const lower = removeAccents(text.toLowerCase());
  for (const allowed of allowedTerms) {
    if (lower.includes(allowed)) return [];
  }
  const found = [];
  for (const word of blockedWords) {
    const regex = new RegExp("\b" + word + "\b", "i");
    if (regex.test(lower)) {
      found.push(word);
    }
  }
  return found;
}

function validateDir(dir, useTranslationKey) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir).filter(f => f.endsWith(".md"));
  const translationGroups = {};

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
          errors.push("[ERRO] " + file + ": " + field + " contem palavras em PORTUGUES: [" + issues.join(", ") + "]");
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
          errors.push("[ERRO] " + file + ": " + field + " contem palavras em PORTUGUES: [" + issues.join(", ") + "]");
      }
    }
  }

  for (const [key, locales] of Object.entries(translationGroups)) {
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
validateDir(GLOSSARIO_DIR, false);

if (errors.length > 0) {
  console.log("");
  console.log("  " + errors.length + " ERRO(S) - BUILD BLOQUEADO:");
  console.log("");
  errors.forEach(e => console.log("   " + e));
  console.log("");
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
  console.log("");
}
