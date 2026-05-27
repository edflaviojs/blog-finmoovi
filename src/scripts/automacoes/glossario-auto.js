/**
 * Glossário Automático (PT + EN + ES)
 * Executa via GitHub Actions 3x/semana (terça, quinta, sábado às 4h)
 * Gera termos do glossário financeiro em 3 idiomas via Groq
 */

import { generateText } from '../apis/kie-ai.js';
import { writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const GLOSSARIO_DIR = join(process.cwd(), 'src', 'content', 'glossario');

// Pool of financial terms to generate
const TERMS_POOL = [
  { term: 'Tesouro Direto', category: 'investimentos' },
  { term: 'CDB', category: 'investimentos' },
  { term: 'LCI e LCA', category: 'investimentos' },
  { term: 'Fundos Imobiliários', category: 'investimentos' },
  { term: 'Ações', category: 'investimentos' },
  { term: 'Dividendos', category: 'investimentos' },
  { term: 'ETF', category: 'investimentos' },
  { term: 'Renda Fixa', category: 'investimentos' },
  { term: 'Renda Variável', category: 'investimentos' },
  { term: 'IPCA', category: 'basico' },
  { term: 'Selic', category: 'basico' },
  { term: 'IOF', category: 'impostos' },
  { term: 'Imposto de Renda', category: 'impostos' },
  { term: 'Come-Cotas', category: 'impostos' },
  { term: 'Spread Bancário', category: 'credito' },
  { term: 'Score de Crédito', category: 'credito' },
  { term: 'Amortização', category: 'credito' },
  { term: 'Tabela SAC vs Price', category: 'credito' },
  { term: 'Diversificação', category: 'investimentos' },
  { term: 'Volatilidade', category: 'mercado' },
  { term: 'Bull Market e Bear Market', category: 'mercado' },
  { term: 'P/L (Preço/Lucro)', category: 'mercado' },
  { term: 'Dividend Yield', category: 'mercado' },
  { term: 'Alavancagem', category: 'mercado' },
  { term: 'Hedge', category: 'mercado' },
  { term: 'Câmbio', category: 'basico' },
  { term: 'Poupança', category: 'basico' },
  { term: 'Cheque Especial', category: 'credito' },
  { term: 'Consórcio', category: 'credito' },
  { term: 'Previdência Privada', category: 'investimentos' },
];

function createSlug(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function generateTermContent(termData) {
  const prompt = `
Escreva uma explicação completa para o glossário financeiro sobre: "${termData.term}"

Requisitos:
- Definição curta (1-2 frases) para o campo "definition"
- Explicação detalhada (300-500 palavras)
- Use headers H2 para organizar
- Inclua exemplos práticos com valores em R$
- Inclua uma tabela comparativa se relevante
- Tom: educativo, simples, sem jargão desnecessário
- Sugira 3 termos relacionados

Formato de saída:
---DEFINICAO---
[definição curta aqui]
---RELACIONADOS---
[termo1, termo2, termo3]
---CONTEUDO---
[conteúdo em markdown aqui]
`;

  const result = await generateText(prompt, { maxTokens: 2000, temperature: 0.6 });

  const defMatch = result.match(/---DEFINICAO---\s*([\s\S]*?)(?=---RELACIONADOS---|---CONTEUDO---|$)/);
  const relMatch = result.match(/---RELACIONADOS---\s*([\s\S]*?)(?=---CONTEUDO---|$)/);
  const contentMatch = result.match(/---CONTEUDO---\s*([\s\S]*?)$/);

  return {
    definition: defMatch ? defMatch[1].trim() : `Explicação sobre ${termData.term} no contexto financeiro brasileiro.`,
    relatedTerms: relMatch ? relMatch[1].trim().split(',').map(t => t.trim()) : [],
    content: contentMatch ? contentMatch[1].trim() : result,
  };
}

async function translateTerm(termData, ptContent, targetLang) {
  const langNames = { en: 'English', es: 'Spanish' };
  const langName = langNames[targetLang];

  const prompt = `
Translate the following financial glossary entry to ${langName}.
Keep the same structure and formatting. Keep financial term names that are universal (CDI, ETF, IPCA) as-is.
Convert R$ examples to approximate USD equivalents for English, or keep R$ for Spanish.

Original term: ${termData.term}
Original definition: ${ptContent.definition}
Original content:
${ptContent.content}

Respond in this exact format:
---TERM---
[translated term name, or keep original if it's a universal acronym]
---DEFINICAO---
[translated definition]
---CONTEUDO---
[translated content in markdown]
`;

  const result = await generateText(prompt, { maxTokens: 2000, temperature: 0.3 });

  const termMatch = result.match(/---TERM---\s*([\s\S]*?)(?=---DEFINICAO---|$)/);
  const defMatch = result.match(/---DEFINICAO---\s*([\s\S]*?)(?=---CONTEUDO---|$)/);
  const contentMatch = result.match(/---CONTEUDO---\s*([\s\S]*?)$/);

  return {
    term: termMatch ? termMatch[1].trim() : termData.term,
    definition: defMatch ? defMatch[1].trim() : ptContent.definition,
    content: contentMatch ? contentMatch[1].trim() : ptContent.content,
  };
}

function saveGlossaryTerm(slug, data) {
  const frontmatter = `---
term: "${data.term.replace(/"/g, '\\"')}"
definition: "${data.definition.replace(/"/g, '\\"')}"
category: "${data.category}"
locale: "${data.locale}"
relatedTerms: ${JSON.stringify(data.relatedTerms || [])}
publishedAt: ${data.today}
---

${data.content}
`;

  const filePath = join(GLOSSARIO_DIR, `${slug}.md`);
  writeFileSync(filePath, frontmatter, 'utf-8');
  return filePath;
}

async function main() {
  console.log('🚀 Gerando termo do glossário (PT + EN + ES)...');

  try {
    if (!existsSync(GLOSSARIO_DIR)) {
      mkdirSync(GLOSSARIO_DIR, { recursive: true });
    }

    const existingFiles = readdirSync(GLOSSARIO_DIR).map(f => f.replace('.md', ''));

    // Find next term to generate (check PT slug only)
    const pendingTerms = TERMS_POOL.filter(t => {
      const slug = createSlug(t.term);
      return !existingFiles.includes(slug);
    });

    if (pendingTerms.length === 0) {
      console.log('✅ Todos os termos já foram gerados!');
      return;
    }

    const termData = pendingTerms[0];
    const slugPt = createSlug(termData.term);
    const today = new Date().toISOString().split('T')[0];

    console.log(`📝 Gerando: ${termData.term}`);

    // 1. Generate PT content
    const ptContent = await generateTermContent(termData);
    console.log(`✅ PT gerado: ${termData.term}`);

    // 2. Save PT
    const ptPath = saveGlossaryTerm(slugPt, {
      term: termData.term,
      definition: ptContent.definition,
      category: termData.category,
      locale: 'pt',
      relatedTerms: ptContent.relatedTerms,
      today,
      content: ptContent.content,
    });
    console.log(`📄 PT salvo: ${ptPath}`);

    // 3. Translate to EN
    console.log('🌐 Traduzindo para inglês...');
    const enContent = await translateTerm(termData, ptContent, 'en');
    const slugEn = 'en-' + createSlug(enContent.term);

    const enPath = saveGlossaryTerm(slugEn, {
      term: enContent.term,
      definition: enContent.definition,
      category: termData.category,
      locale: 'en',
      relatedTerms: ptContent.relatedTerms,
      today,
      content: enContent.content,
    });
    console.log(`📄 EN salvo: ${enPath}`);

    // 4. Translate to ES
    console.log('🌐 Traduzindo para espanhol...');
    const esContent = await translateTerm(termData, ptContent, 'es');
    const slugEs = 'es-' + createSlug(esContent.term);

    const esPath = saveGlossaryTerm(slugEs, {
      term: esContent.term,
      definition: esContent.definition,
      category: termData.category,
      locale: 'es',
      relatedTerms: ptContent.relatedTerms,
      today,
      content: esContent.content,
    });
    console.log(`📄 ES salvo: ${esPath}`);

    // 5. Git commit all
    execSync(`git add "${GLOSSARIO_DIR}"`, { stdio: 'inherit' });
    execSync(`git commit -m "glossário: ${termData.term} [PT/EN/ES]"`, { stdio: 'inherit' });

    console.log(`✅ Termo "${termData.term}" publicado em 3 idiomas!`);
  } catch (error) {
    console.error('❌ Erro ao gerar glossário:', error.message);
    process.exit(1);
  }
}

main();
