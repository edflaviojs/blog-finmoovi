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

    // Gerar conteúdo com base no idioma
    const content = await generateGlossaryContent(term, language);

    // Inserir 2 imagens inline no conteúdo
    console.log('🖼️ Inserindo imagens inline...');
    const contentWithImages = await insertInlineImages(content, slug, term);

    return {
      title: getLocalizedTitle(term, language),
      description: getLocalizedDescription(term, language),
      image: localImagePath,
      content: contentWithImages,
      keywords: getLocalizedKeywords(term, language)
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
- Seções: O que é, Como funciona, Vantagens, Riscos, Exemplos práticos, Como começar
- Use exemplos com valores reais em R$ (salários entre R$3.000-R$8.000)
- Inclua pelo menos 3 dicas práticas em negrito (ex: **Dica prática:** ...)
- Use listas com bullet points quando listar itens
- Termos técnicos devem ser explicados inline
- Tom conversacional mas informativo — como um amigo que entende de finanças
- Último H2 deve ser "Comece hoje" com parágrafo motivacional curto

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
- Sections: What it is, How it works, Advantages, Risks, Practical examples, How to start
- Use examples with real BRL values (salaries between R$3,000-R$8,000)
- Include at least 3 practical tips in bold (e.g.: **Practical tip:** ...)
- Use bullet point lists when listing items
- Technical terms should be explained inline
- Conversational but informative tone — like a friend who understands finance
- Last H2 should be "Start today" with a short motivational paragraph

Format: pure markdown, no code blocks, no HTML.
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
- Secciones: Qué es, Cómo funciona, Ventajas, Riesgos, Ejemplos prácticos, Cómo empezar
- Use ejemplos con valores reales en R$ (salarios entre R$3.000-R$8.000)
- Incluya al menos 3 consejos prácticos en negrita (ej: **Consejo práctico:** ...)
- Use listas con viñetas al listar elementos
- Los términos técnicos deben explicarse inline
- Tono conversacional pero informativo — como un amigo que entiende de finanzas
- Último H2 debe ser "Empieza hoy" con párrafo motivacional corto

Formato: markdown puro, sin bloques de código, sin HTML.
`
  };

  // lang-guard (prevenção): EN/ES são gerados direto no idioma alvo — se o LLM
  // responder em PT, refaz 1x; persistindo, publica com ::warning:: visível.
  const content = await guardedTranslate(
    () => generateText(langPrompts[language], { maxTokens: 2000, temperature: 0.3 }),
    language,
    `glossário "${term}"`
  );

  // Post-process: clean up extra blank lines for consistent formatting
  return content
    .replace(/\n{3,}/g, '\n\n')           // Max 2 newlines (1 blank line)
    .replace(/^## (.+)\n\n\n/gm, '## $1\n\n')  // No extra lines after headers
    .trim();
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
    pt: `Entenda o que é ${term}, como funciona, vantagens, riscos e exemplos práticos de aplicação no mercado financeiro brasileiro.`,
    en: `Understand what ${term} is, how it works, advantages, risks and practical examples of application in the Brazilian financial market.`,
    es: `Entienda qué es ${term}, cómo funciona, ventajas, riesgos y ejemplos prácticos de aplicación en el mercado financiero brasileño.`
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