/**
 * Gerador de Glossário com Imagens Automáticas
 * Gera termos financeiros com imagens de capa e imagens explicativas
 */

import { generateImage, generateText } from '../apis/kie-ai.js';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const GLOSSARIO_DIR = join(process.cwd(), 'src', 'content', 'glossario');
const IMAGES_DIR = join(process.cwd(), 'public', 'images', 'glossario');

async function generateGlossaryTerm(term, language = 'pt') {
  console.log(`📚 Gerando glossário para: ${term} (${language})`);

  try {
    // Gerar imagem de capa
    const coverImage = generateImage(term, 'cover');

    // Gerar imagens explicativas (uma para cada seção principal)
    const explanatoryImages = await generateExplanatoryImages(term);

    // Gerar conteúdo com base no idioma
    const content = await generateGlossaryContent(term, language);

    // Inserir imagens no conteúdo
    const contentWithImages = insertImagesIntoContent(content, explanatoryImages);

    return {
      title: getLocalizedTitle(term, language),
      description: getLocalizedDescription(term, language),
      image: coverImage,
      content: contentWithImages,
      keywords: getLocalizedKeywords(term, language)
    };
  } catch (error) {
    console.error(`❌ Erro ao gerar glossário para ${term}:`, error.message);
    throw error;
  }
}

async function generateExplanatoryImages(term) {
  const sections = [
    'definição',
    'funcionamento',
    'vantagens',
    'riscos',
    'exemplos'
  ];

  const images = [];

  for (let i = 0; i < sections.length; i += 2) {
    const sectionTopic = `${term} - ${sections[i]}`;
    const imageUrl = generateImage(sectionTopic, 'inline');
    images.push({
      afterHeading: i,
      url: imageUrl,
      alt: sections[i]
    });
  }

  return images;
}

async function generateGlossaryContent(term, language) {
  const langPrompts = {
    pt: `
Gere um glossário financeiro detalhado sobre "${term}".

REGRAS:
- Comece com uma definição clara e concisa
- Inclua seções sobre: O que é, Como funciona, Vantagens, Riscos, Exemplos práticos
- Use exemplos com valores reais em R$
- Inclua pelo menos 3 dicas práticas em negrito
- Termo deve ter 800-1000 palavras
- Use headers H2 para cada seção
- Termos técnicos como CDI, ETF, IPCA devem ser explicados

Formato markdown com headers H2.
`,
    en: `
Generate a detailed financial glossary about "${term}".

RULES:
- Start with a clear and concise definition
- Include sections: What it is, How it works, Advantages, Risks, Practical examples
- Use examples with real BRL values
- Include at least 3 practical tips in bold
- Term should be 800-1000 words
- Use H2 headers for each section
- Technical terms like CDI, ETF, IPCA should be explained

Markdown format with H2 headers.
`,
    es: `
Genere un glosario financiero detallado sobre "${term}".

REGLAS:
- Comience con una definición clara y concisa
- Incluya secciones: Qué es, Cómo funciona, Ventajas, Riesgos, Ejemplos prácticos
- Use ejemplos con valores reales en R$
- Incluya al menos 3 consejos prácticos en negrita
- El término debe tener 800-1000 palabras
- Use encabezados H2 para cada sección
- Términos técnicos como CDI, ETF, IPCA deben ser explicados

Formato markdown con encabezados H2.
`
  };

  return await generateText(langPrompts[language], { maxTokens: 2000, temperature: 0.3 });
}

function insertImagesIntoContent(content, images) {
  let contentWithImages = content;

  // Inserir imagens após cada 2º H2
  for (let i = images.length - 1; i >= 0; i--) {
    const img = images[i];
    const headingPattern = new RegExp(`^## .+$`, 'gm');
    const headings = content.match(headingPattern);

    if (headings && img.afterHeading < headings.length) {
      const headingText = headings[img.afterHeading].replace('## ', '');
      const headingPattern = `## ${headingText}`;
      const headingIndex = contentWithImages.indexOf(headingPattern);

      if (headingIndex !== -1) {
        // Encontrar o final do primeiro parágrafo após este heading
        const afterHeading = contentWithImages.indexOf('\n\n', headingIndex + headingPattern.length);
        if (afterHeading !== -1) {
          const imgMarkdown = `\n\n![${img.alt}](${img.url})\n\n`;
          contentWithImages = contentWithImages.slice(0, afterHeading) + imgMarkdown + contentWithImages.slice(afterHeading);
        }
      }
    }
  }

  return contentWithImages;
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