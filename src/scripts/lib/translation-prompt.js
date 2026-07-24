/**
 * Shared translation prompt for all blog generator scripts.
 * Instructs the LLM to adapt content for international audiences,
 * not just translate literally from Portuguese.
 */

/**
 * @param {string} targetLang - 'English' or 'Spanish'
 * @param {object} options
 * @param {string} options.brandName - e.g. 'FinMoovi'
 * @param {string} options.appUrl - e.g. 'app.finmoovi.com'
 * @param {string} [options.extraInstructions] - additional context per script
 * @returns {string} The full translation prompt instructions
 */
export function getTranslationInstructions(targetLang, options = {}) {
  const { brandName = 'FinMoovi', appUrl = 'app.finmoovi.com', extraInstructions = '' } = options;
  const currency = targetLang === 'English' ? 'USD ($)' : 'EUR (€)';
  const salaryRange = targetLang === 'English' ? '$2,000-$5,000/month' : '€1,500-€4,000/month';

  return `Translate AND ADAPT the following blog post to ${targetLang}.
Do NOT just translate literally — adapt for an international audience.

CRITICAL ADAPTATION RULES:
1. CURRENCY: Replace ALL "R$" values with approximate ${currency} equivalents.
   - R$ 1.000 → ${targetLang === 'English' ? '$200' : '€180'}
   - R$ 5.000 → ${targetLang === 'English' ? '$1,000' : '€900'}
   - Salary ranges: use ${salaryRange} as reference.

2. FINANCIAL PRODUCTS: Replace Brazil-specific products with international equivalents:
   - "Tesouro Direto" → ${targetLang === 'English' ? '"government bonds"' : '"bonos del gobierno"'}
   - "CDB" → ${targetLang === 'English' ? '"certificates of deposit (CDs)"' : '"certificados de depósito"'}
   - "CDI" → ${targetLang === 'English' ? '"interbank rate"' : '"tasa interbancaria"'}
   - "FGTS" → ${targetLang === 'English' ? '"severance guarantee fund"' : '"fondo de garantía"'}
   - "Selic" → ${targetLang === 'English' ? '"central bank base rate"' : '"tasa base del banco central"'}
   - "IPCA" → ${targetLang === 'English' ? '"consumer price index"' : '"índice de precios al consumidor"'}

3. INSTITUTIONS: Replace with generic equivalents:
   - "Receita Federal" → ${targetLang === 'English' ? '"tax authority"' : '"autoridad fiscal"'}
   - "Serasa/SPC" → ${targetLang === 'English' ? '"credit bureaus"' : '"burós de crédito"'}
   - "IBGE" → ${targetLang === 'English' ? '"national statistics office"' : '"oficina de estadísticas"'}

4. GEOGRAPHIC: Remove or generalize Brazil-specific references:
   - "brasileiros" → ${targetLang === 'English' ? '"people"' : '"personas"'}
   - "no Brasil" → remove or ${targetLang === 'English' ? '"in many countries"' : '"en muchos países"'}
   - Do NOT mention specific Brazilian regions (Nordeste, Sudeste, etc.)

5. HOLIDAYS: Adapt to international calendar:
   - "Dia dos Namorados" (Jun 12) → ${targetLang === 'English' ? '"Valentine\'s Day" (Feb 14)' : '"Día de San Valentín" (14 feb)'}
   - "Dia dos Pais" (Aug BR) → ${targetLang === 'English' ? '"Father\'s Day" (3rd Sunday of June)' : '"Día del Padre"'}
   - "13º salário" → ${targetLang === 'English' ? '"year-end bonus"' : '"paga extra"'}

6. KEEP UNCHANGED:
   - Brand name: ${brandName}
   - App URL: ${appUrl}
   - Markdown formatting
   - Image paths (![alt](url))
   - Internal link URLs (they will be updated separately)

7. TONE: Keep the same helpful, practical tone. The reader should feel this was WRITTEN for them, not translated from another language.

${extraInstructions}

Respond in this exact format:
---TITULO---
[translated and adapted title, SEO-friendly in ${targetLang}]
---META---
[translated and adapted meta description, max 155 chars]
---HEADLINE---
[translated ticker headline, max 40 characters]
---KEYWORDS---
[translated keywords in ${targetLang}, comma separated]
---CONTEUDO---
[translated and adapted content in markdown]`;
}
