/**
 * Gerador de Glossário com Imagens Automáticas
 * Gera termos financeiros com imagens de capa e imagens explicativas
 * Usa SVG gerado localmente (sem dependência de API externa)
 */

import { generateText, generateCoverImage, generateInlineImage } from '../apis/kie-ai.js';
import { guardedTranslate } from '../lib/lang-guard.js';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const GLOSSARIO_DIR = join(process.cwd(), 'src', 'content', 'glossario');
const IMAGES_DIR = join(process.cwd(), 'public', 'images', 'glossario');

/**
 * Sanitize string for use as filename
 */
function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 60);
}

async function generateGlossaryTerm(term, language = 'pt') {
  console.log(`📚 Gerando glossário para: ${term} (${language})`);

  try {
    // Gerar imagem de capa via IA
    const slug = slugify(term);
    console.log('🖼️ Gerando imagem de capa...');
    const localImagePath = await generateCoverImage(term, slug, 'glossario');
    console.log(`✅ Imagem salva: ${localImagePath}`);

    // Gerar conteúdo com base no idioma (EN/ES devolvem o termo já traduzido)
    const { term: localizedTerm, content } = await generateGlossaryContent(term, language);

    // Inserir 2 imagens inline no conteúdo
    console.log('🖼️ Inserindo imagens inline...');
    const contentWithImages = await insertInlineImages(content, slug, localizedTerm);

    return {
      term: localizedTerm,
      title: getLocalizedTitle(localizedTerm, language),
      description: getLocalizedDescription(localizedTerm, language),
      image: localImagePath,
      content: contentWithImages,
      keywords: getLocalizedKeywords(localizedTerm, language)
    };
  } catch (error) {
    console.error(`❌ Erro ao gerar glossário para ${term}:`, error.message);
    throw error;
  }
}

async function generateGlossaryContent(term, language) {
  const langPrompts = {
    pt: `
Escreva um texto educativo completo sobre o termo financeiro "${term}".

REGRAS DE FORMATAÇÃO (obrigatórias):
- Use headers H2 para cada seção principal
- NUNCA deixe linhas em branco extras entre o header e o primeiro parágrafo
- Após cada ## header, coloque exatamente UMA linha em branco e inicie o texto
- Entre parágrafos, use exatamente UMA linha em branco
- Listas devem vir logo após o parágrafo introdutório (sem linha extra)
- NÃO use "Introdução" ou "Conclusão" como headers
- Comece direto com o conteúdo, sem frases genéricas

REGRAS DE CONTEÚDO:
- 800-1000 palavras no total
- Público UNIVERSAL (Brasil, Portugal e falantes de inglês/espanhol). NÃO escreva "no Brasil"/"brasileiro", NÃO use R$ nem qualquer moeda fixa. Use valores RELATIVOS ("cerca de um aluguel", "o preço de um café por dia").
- Abra pela situação real (a dor que a pessoa reconhece); explique o conceito através dela; depois mostre o FinMoovi resolvendo, amarrando de forma orgânica a UMA funcionalidade real: captura inteligente (foto de nota / voz) + categorização automática; multimoeda (BRL/USD/EUR); fluxo de caixa e relatórios; planejamento mensal / metas; cartões de crédito / fatura; modo compras (lista + total em tempo real); lembretes / alertas de saldo; offline / PWA / sincronização.
- Inclua pelo menos 3 dicas práticas em negrito (ex: **Dica prática:** ...)
- Use listas com bullet points quando listar itens
- Termos técnicos devem ser explicados inline
- Tom conversacional mas informativo — como um amigo que entende de finanças
- Último H2 deve ser "Comece hoje" com uma micro-ação de 5 minutos dentro do app

Formato: markdown puro, sem code blocks, sem HTML.
`,
    en: `
Write a complete educational text about the financial term "${term}".

FORMATTING RULES (mandatory):
- Use H2 headers for each main section
- NEVER leave extra blank lines between the header and the first paragraph
- After each ## header, place exactly ONE blank line and start the text
- Between paragraphs, use exactly ONE blank line
- Lists should come right after the introductory paragraph (no extra line)
- Do NOT use "Introduction" or "Conclusion" as headers
- Start directly with content, no generic phrases

CONTENT RULES:
- 800-1000 words total
- UNIVERSAL audience — do NOT write "in Brazil"/"Brazilian", do NOT use R$ or any fixed currency. Use RELATIVE values ("about one month's rent", "the price of a daily coffee").
- Open with the real situation (the pain the reader recognizes); explain the concept through it; then show FinMoovi solving it, tying it organically to ONE real feature: smart capture (photo of a receipt / voice) + automatic categorization; multi-currency (BRL/USD/EUR); cash flow and reports; monthly planning / goals; credit cards / bill; shopping mode (list + real-time total); reminders / balance alerts; offline / PWA / sync.
- Include at least 3 practical tips in bold (e.g.: **Practical tip:** ...)
- Use bullet point lists when listing items
- Technical terms should be explained inline
- Conversational but informative tone — like a friend who understands finance
- Last H2 should be "Start today" with a 5-minute micro-action inside the app

OUTPUT FORMAT (mandatory) — respond EXACTLY in this format and nothing else:
---TERM---
[the term "${term}" translated to English, or keep it as-is if it is a universal acronym like CDB/ETF/IPCA]
---CONTEUDO---
[the full markdown text following all rules above — pure markdown, no code blocks, no HTML]
`,
    es: `
Escriba un texto educativo completo sobre el término financiero "${term}".

REGLAS DE FORMATO (obligatorias):
- Use encabezados H2 para cada sección principal
- NUNCA deje líneas en blanco extra entre el encabezado y el primer párrafo
- Después de cada ## encabezado, coloque exactamente UNA línea en blanco e inicie el texto
- Entre párrafos, use exactamente UNA línea en blanco
- Las listas deben venir justo después del párrafo introductorio (sin línea extra)
- NO use "Introducción" o "Conclusión" como encabezados
- Comience directamente con el contenido, sin frases genéricas

REGLAS DE CONTENIDO:
- 800-1000 palabras en total
- Público UNIVERSAL — NO escribas "en Brasil"/"brasileño", NO uses R$ ni ninguna moneda fija. Usa valores RELATIVOS ("cerca de un alquiler", "el precio de un café al día").
- Abre con la situación real (el dolor que la persona reconoce); explica el concepto a través de ella; luego muestra a FinMoovi resolviéndolo, ligándolo de forma orgánica a UNA función real: captura inteligente (foto de recibo / voz) + categorización automática; multimoneda (BRL/USD/EUR); flujo de caja e informes; planificación mensual / metas; tarjetas de crédito / factura; modo compras (lista + total en tiempo real); recordatorios / alertas de saldo; offline / PWA / sincronización.
- Incluya al menos 3 consejos prácticos en negrita (ej: **Consejo práctico:** ...)
- Use listas con viñetas al listar elementos
- Los términos técnicos deben explicarse inline
- Tono conversacional pero informativo — como un amigo que entiende de finanzas
- Último H2 debe ser "Empieza hoy" con una micro-acción de 5 minutos dentro de la app

FORMATO DE SALIDA (obligatorio) — responde EXACTAMENTE en este formato y nada más:
---TERM---
[el término "${term}" traducido al español, o mantenlo si es una sigla universal como CDB/ETF/IPCA]
---CONTEUDO---
[el texto completo en markdown siguiendo todas las reglas anteriores — markdown puro, sin bloques de código, sin HTML]
`
  };

  // lang-guard (prevenção): EN/ES são gerados direto no idioma alvo — se o LLM
  // responder em PT, refaz 1x; persistindo, publica com ::warning:: visível.
  const raw = await guardedTranslate(
    () => generateText(langPrompts[language], { maxTokens: 2000, temperature: 0.3 }),
    language,
    `glossário "${term}"`
  );

  // PT é a peça-mãe: o termo não é traduzido (o corpo já sai sem marcadores).
  // EN/ES saem no formato ---TERM---/---CONTEUDO---: extrai o termo traduzido e o
  // corpo (fallback para o termo/texto original se o parse falhar). Os marcadores
  // são idênticos aos usados em glossario-auto.js — não renomear.
  let localizedTerm = term;
  let body = raw;
  if (language !== 'pt') {
    const termMatch = raw.match(/---TERM---\s*([\s\S]*?)(?=---CONTEUDO---|$)/);
    const contentMatch = raw.match(/---CONTEUDO---\s*([\s\S]*?)$/);
    if (termMatch && termMatch[1].trim()) localizedTerm = termMatch[1].trim();
    if (contentMatch) body = contentMatch[1];
  }

  // Post-process: clean up extra blank lines for consistent formatting
  const content = body
    .replace(/\n{3,}/g, '\n\n')           // Max 2 newlines (1 blank line)
    .replace(/^## (.+)\n\n\n/gm, '## $1\n\n')  // No extra lines after headers
    .trim();

  return { term: localizedTerm, content };
}

async function insertInlineImages(content, slugBase, term) {
  const h2Matches = content.match(/^## .+$/gm) || [];
  if (h2Matches.length < 2) return content;

  const headings = h2Matches.map(h => h.replace('## ', ''));
  let result = content;

  // Insert 2 images: after 1st and 3rd heading (or last available)
  const positions = [0, Math.min(2, headings.length - 1)];

  for (let idx = positions.length - 1; idx >= 0; idx--) {
    const i = positions[idx];
    const sectionTopic = `financial glossary ${term} ${headings[i]}`;
    const imgPath = await generateInlineImage(sectionTopic, `${slugBase}-inline-${i + 1}`, 'glossario');
    const headingText = headings[i];
    const headingPattern = `## ${headingText}`;
    const headingIndex = result.indexOf(headingPattern);

    if (headingIndex !== -1) {
      const afterHeading = result.indexOf('\n\n', headingIndex + headingPattern.length);
      if (afterHeading !== -1) {
        const nextParagraphEnd = result.indexOf('\n\n', afterHeading + 2);
        const insertAt = nextParagraphEnd !== -1 ? nextParagraphEnd : afterHeading;
        const imgMarkdown = `\n\n![${headingText}](${imgPath})\n\n`;
        result = result.slice(0, insertAt) + imgMarkdown + result.slice(insertAt);
      }
    }
  }

  return result;
}

function getLocalizedTitle(term, language) {
  const titles = {
    pt: `${term} - Glossário Financeiro`,
    en: `${term} - Financial Glossary`,
    es: `${term} - Glosario Financiero`
  };
  return titles[language];
}

function getLocalizedDescription(term, language) {
  const descriptions = {
    pt: `O que é ${term} e como isso aparece no seu dia a dia — explicado de forma simples, com um jeito prático de acompanhar no FinMoovi.`,
    en: `What ${term} is and how it shows up in your everyday money — explained simply, with a practical way to track it in FinMoovi.`,
    es: `Qué es ${term} y cómo aparece en tu día a día — explicado de forma simple, con una manera práctica de seguirlo en FinMoovi.`
  };
  return descriptions[language];
}

function getLocalizedKeywords(term, language) {
  const baseKeywords = [term, 'glossário', 'finanças'];

  if (language === 'en') {
    return [...baseKeywords, 'glossary', 'finance', 'brazil'];
  } else if (language === 'es') {
    return [...baseKeywords, 'glosario', 'finanzas', 'brasil'];
  }

  return baseKeywords;
}

export { generateGlossaryTerm };