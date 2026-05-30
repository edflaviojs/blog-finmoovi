/**
 * Gerador Automático de Glossário por Letra
 * Executa diariamente via GitHub Actions
 * Gera termos de A-Z, um por dia, com imagens e tradução automática
 */

import { generateGlossaryTerm } from './glossario-com-imagens.js';
import { writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const GLOSSARIO_DIR = join(process.cwd(), 'src', 'content', 'glossario');
const POSTS_DIR = join(process.cwd(), 'src', 'content', 'posts');

// Letras do abecedário
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// Termos populares por categoria (para os primeiros termos)
const POPULAR_TERMS = {
  A: ['ações', 'aplicação', 'ativo', 'alavancagem', 'inflação'],
  B: ['bolsa de valores', 'bitcoin', 'dividendos', 'bônus', 'balança comercial'],
  C: ['cdb', 'crédito', 'capital', 'custo', 'câmbio'],
  D: ['diversificação', 'dívida', 'derivativos', 'despesa', 'depreciação'],
  E: ['etf', 'empréstimo', 'economia', 'exportação', 'equity'],
  F: ['fundos', 'finanças', 'fundo de investimento', 'futuros', 'fluxo de caixa'],
  G: ['governança', 'giro', 'garantia', 'gráfico', 'gestão'],
  H: ['hedge', 'hipoteca', 'holding', 'high yield', 'home broker'],
  I: ['imposto de renda', 'inflação', 'investimento', 'índice', 'imobilizado'],
  J: ['juros', 'juros compostos', 'juros simples', 'jurídico', 'juro real'],
  K: ['kyc', 'know your customer', 'key performance indicator', 'kill switch', 'kit de investimento'],
  L: ['lc', 'lca', 'liquidez', 'long', 'leilão'],
  M: ['moeda', 'mercado', 'margem', 'mercado de capitais', 'montante'],
  N: ['nubank', 'negociação', 'nfp', 'nyse', 'nasdaq'],
  O: ['opcão', 'obrigação', 'open interest', 'offshore', 'otc'],
  P: ['poupança', 'pix', 'patrimônio', 'plano de saúde', 'previdência'],
  Q: ['qualidade', 'quantidade', 'quociente', 'quick ratio', 'quantitative easing'],
  R: ['renda fixa', 'renda variável', 'risco', 'reserva', 'robo advisor'],
  S: ['selic', 'stock', 'swaps', 'spread', 'sustentabilidade'],
  T: ['tesouro direto', 'taxa', 'trading', 'trust', 'ticker'],
  U: ['usura', 'uro', 'underlying', 'uptick', 'utilidade'],
  V: ['valor', 'volatilidade', 'venda a descoberto', 'varejo', 'venda'],
  W: ['webull', 'wall street', 'warrant', 'whale', 'withdrawal'],
  X: ['xepa financeira', 'xing ling', 'xero', 'xrp', 'xetra'],
  Y: ['yield', 'yahoo finance', 'yuan', 'yield curve', 'young investor'],
  Z: ['zero coupon', 'z-score', 'zone de conforto', 'zero day', 'zimbábue']
};

// Letra atual (persistente entre execuções)
let currentLetter = 'A';

function getCurrentLetter() {
  try {
    const letterFile = join(process.cwd(), '.current-letter');
    if (existsSync(letterFile)) {
      const content = readFileSync(letterFile, 'utf-8');
      return content.trim();
    }
  } catch (error) {
    // Se não conseguir ler, começa do A
  }
  return 'A';
}

function saveCurrentLetter(letter) {
  try {
    const letterFile = join(process.cwd(), '.current-letter');
    writeFileSync(letterFile, letter, 'utf-8');
  } catch (error) {
    console.warn('Não consegui salvar letra atual:', error.message);
  }
}

async function main() {
  console.log('🚀 Iniciando geração automática de glossário...');

  try {
    // Garantir que diretórios existam
    if (!existsSync(GLOSSARIO_DIR)) {
      mkdirSync(GLOSSARIO_DIR, { recursive: true });
    }
    if (!existsSync(join(process.cwd(), 'public', 'images', 'glossario'))) {
      mkdirSync(join(process.cwd(), 'public', 'images', 'glossario'), { recursive: true });
    }

    // Obter letra atual
    currentLetter = getCurrentLetter();
    console.log(`📍 Letra atual: ${currentLetter}`);

    // Gerar termos para a letra atual
    const terms = POPULAR_TERMS[currentLetter] || [`${currentLetter}termo financeiro`];
    const selectedTerm = terms[0]; // Pega o primeiro termo da lista

    console.log(`📚 Gerando glossário para: ${selectedTerm}`);

    // Gerar post principal em português
    const ptPost = await generateGlossaryTerm(selectedTerm, 'pt');

    // Criar arquivo PT
    const ptFilename = `${selectedTerm.toLowerCase().replace(/\s+/g, '-')}.md`;
    const ptPath = join(GLOSSARIO_DIR, ptFilename);
    writeFileSync(ptPath, `---
title: "${ptPost.title}"
description: "${ptPost.description}"
image: "${ptPost.image}"
category: "basico"
tags: [${ptPost.keywords.map(k => `"${k}"`).join(', ')}]
author: "FinMoovi"
publishedAt: ${new Date().toISOString().split('T')[0]}
readingTime: 5
locale: "pt"
translationKey: "glossario-${selectedTerm.toLowerCase().replace(/\s+/g, '-')}"
seo:
  metaTitle: "${ptPost.title}"
  metaDescription: "${ptPost.description}"
  keywords: [${ptPost.keywords.map(k => `"${k}"`).join(', ')}]
---

${ptPost.content}

---

*Este termo foi gerado automaticamente pela IA com imagens explicativas. Quer sugerir uma melhoria? [Comente aqui](https://finmoovi.com/contato).*
`, 'utf-8');

    // Gerar versões em inglês e espanhol
    const enPost = await generateGlossaryTerm(selectedTerm, 'en');
    const esPost = await generateGlossaryTerm(selectedTerm, 'es');

    // Criar arquivos EN e ES
    const enFilename = `en-${selectedTerm.toLowerCase().replace(/\s+/g, '-')}.md`;
    const esFilename = `es-${selectedTerm.toLowerCase().replace(/\s+/g, '-')}.md`;

    writeFileSync(join(GLOSSARIO_DIR, enFilename), `---
title: "${enPost.title}"
description: "${enPost.description}"
image: "${enPost.image}"
category: "basico"
tags: [${enPost.keywords.map(k => `"${k}"`).join(', ')}]
author: "FinMoovi"
publishedAt: ${new Date().toISOString().split('T')[0]}
readingTime: 5
locale: "en"
translationKey: "glossario-${selectedTerm.toLowerCase().replace(/\s+/g, '-')}"
seo:
  metaTitle: "${enPost.title}"
  metaDescription: "${enPost.description}"
  keywords: [${enPost.keywords.map(k => `"${k}"`).join(', ')}]
---

${enPost.content}

---

*This term was automatically generated by AI with explanatory images. Want to suggest an improvement? [Comment here](https://finmoovi.com/contato).*
`, 'utf-8');

    writeFileSync(join(GLOSSARIO_DIR, esFilename), `---
title: "${esPost.title}"
description: "${esPost.description}"
image: "${esPost.image}"
category: "basico"
tags: [${esPost.keywords.map(k => `"${k}"`).join(', ')}]
author: "FinMoovi"
publishedAt: ${new Date().toISOString().split('T')[0]}
readingTime: 5
locale: "es"
translationKey: "glossario-${selectedTerm.toLowerCase().replace(/\s+/g, '-')}"
seo:
  metaTitle: "${esPost.title}"
  metaDescription: "${esPost.description}"
  keywords: [${esPost.keywords.map(k => `"${k}"`).join(', ')}]
---

${esPost.content}

---

*Este término fue generado automáticamente por IA con imágenes explicativas. ¿Quieres sugerir una mejora? [Comenta aquí](https://finmoovi.com/contato).*
`, 'utf-8');

    console.log(`✅ Glossário gerado para ${currentLetter}: ${selectedTerm}`);
    console.log(`🖼️ Imagens geradas: capa + ${Math.floor(5/2)} imagens explicativas`);

    // Próxima letra
    const currentIndex = LETTERS.indexOf(currentLetter);
    const nextIndex = (currentIndex + 1) % LETTERS.length;
    const nextLetter = LETTERS[nextIndex];

    // Salvar próxima letra
    saveCurrentLetter(nextLetter);
    console.log(`🔄 Próxima letra: ${nextLetter}`);

    // Commit automático
    execSync('git add src/content/glossario/ public/images/glossario/', { stdio: 'inherit' });
    execSync(`git commit -m "glossário: ${selectedTerm} (${currentLetter}) - automático"`, { stdio: 'inherit' });
    execSync('git push', { stdio: 'inherit' });

    console.log(`✅ Glossário gerado com sucesso! Próxima letra: ${nextLetter}`);
  } catch (error) {
    console.error('❌ Erro na geração automática:', error.message);
    process.exit(1);
  }
}

main();