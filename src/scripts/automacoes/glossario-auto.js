/**
 * Glossário Automático
 * Executa via GitHub Actions 3x/semana (terça, quinta, sábado às 4h)
 * Gera termos do glossário financeiro via Kie.AI
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

async function main() {
  console.log('🚀 Gerando termo do glossário...');

  try {
    // Check which terms already exist
    if (!existsSync(GLOSSARIO_DIR)) {
      mkdirSync(GLOSSARIO_DIR, { recursive: true });
    }

    const existingFiles = readdirSync(GLOSSARIO_DIR).map(f => f.replace('.md', ''));

    // Find next term to generate
    const pendingTerms = TERMS_POOL.filter(t => {
      const slug = t.term
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      return !existingFiles.includes(slug);
    });

    if (pendingTerms.length === 0) {
      console.log('✅ Todos os termos já foram gerados!');
      return;
    }

    const termData = pendingTerms[0];
    console.log(`📝 Gerando: ${termData.term}`);

    // Generate content
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

    // Parse result
    const defMatch = result.match(/---DEFINICAO---\s*([\s\S]*?)(?=---RELACIONADOS---|---CONTEUDO---|$)/);
    const relMatch = result.match(/---RELACIONADOS---\s*([\s\S]*?)(?=---CONTEUDO---|$)/);
    const contentMatch = result.match(/---CONTEUDO---\s*([\s\S]*?)$/);

    const definition = defMatch ? defMatch[1].trim() : `Explicação sobre ${termData.term} no contexto financeiro brasileiro.`;
    const relatedTerms = relMatch ? relMatch[1].trim().split(',').map(t => t.trim()) : [];
    const content = contentMatch ? contentMatch[1].trim() : result;

    const slug = termData.term
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const today = new Date().toISOString().split('T')[0];

    const frontmatter = `---
term: "${termData.term}"
definition: "${definition.replace(/"/g, '\\"')}"
category: "${termData.category}"
relatedTerms: ${JSON.stringify(relatedTerms)}
publishedAt: ${today}
---

${content}
`;

    const filePath = join(GLOSSARIO_DIR, `${slug}.md`);
    writeFileSync(filePath, frontmatter, 'utf-8');
    console.log(`📄 Termo salvo: ${filePath}`);

    // Git commit
    execSync(`git add "${filePath}"`, { stdio: 'inherit' });
    execSync(`git commit -m "glossário: ${termData.term}"`, { stdio: 'inherit' });

    console.log(`✅ Termo "${termData.term}" publicado!`);
  } catch (error) {
    console.error('❌ Erro ao gerar glossário:', error.message);
    process.exit(1);
  }
}

main();
