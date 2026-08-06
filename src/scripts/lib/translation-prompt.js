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
   - "LTN" / "NTN" → ${targetLang === 'English' ? '"short-term / inflation-linked government bonds"' : '"bonos del gobierno a corto plazo / indexados"'}
   - "CDB" → ${targetLang === 'English' ? '"certificates of deposit (CDs)"' : '"certificados de depósito"'}
   - "LCI" / "LCA" → ${targetLang === 'English' ? '"tax-exempt bank notes"' : '"bonos bancarios exentos de impuestos"'}
   - "CDI" → ${targetLang === 'English' ? '"interbank rate"' : '"tasa interbancaria"'}
   - "FGTS" → ${targetLang === 'English' ? '"severance guarantee fund"' : '"fondo de garantía"'}
   - "INSS" → ${targetLang === 'English' ? '"the public pension system"' : '"el sistema público de pensiones"'}
   - "PGBL" / "VGBL" → ${targetLang === 'English' ? '"tax-deferred retirement plans"' : '"planes de pensiones con ventajas fiscales"'}
   - "Selic" → ${targetLang === 'English' ? '"central bank base rate"' : '"tasa base del banco central"'}
   - "IPCA" → ${targetLang === 'English' ? '"consumer price index"' : '"índice de precios al consumidor"'}
   - "Pix" → ${targetLang === 'English' ? '"instant bank transfers"' : '"transferencias bancarias instantáneas"'}
   - "IPVA" → ${targetLang === 'English' ? '"annual vehicle tax"' : '"impuesto anual de circulación"'}
   - "IPTU" → ${targetLang === 'English' ? '"property tax"' : '"impuesto sobre bienes inmuebles"'}
   - "CPF" / "CNPJ" → ${targetLang === 'English' ? '"tax ID number"' : '"número de identificación fiscal"'}

3. INSTITUTIONS: Replace with generic equivalents:
   - "Receita Federal" → ${targetLang === 'English' ? '"tax authority"' : '"autoridad fiscal"'}
   - "Serasa/SPC" → ${targetLang === 'English' ? '"credit bureaus"' : '"burós de crédito"'}
   - "IBGE" → ${targetLang === 'English' ? '"national statistics office"' : '"oficina de estadísticas"'}
   - "Banco Central do Brasil" / "BCB" → ${targetLang === 'English' ? '"the central bank"' : '"el banco central"'}
   - "CVM" / "ANBIMA" / "SUSEP" → ${targetLang === 'English' ? '"the financial regulator"' : '"el regulador financiero"'}
   - "B3" / "Bovespa" → ${targetLang === 'English' ? '"the stock exchange"' : '"la bolsa de valores"'}

3b. COMPANY NAMES: NEVER name a Brazilian company as an example. Use a generic
   description instead, so the reader is not sent looking for a bank they cannot open.
   - "Nubank" / "PicPay" / "Mercado Pago" → ${targetLang === 'English' ? '"a digital bank"' : '"un banco digital"'}
   - "Itaú" / "Bradesco" / "Banco do Brasil" / "Caixa Econômica" → ${targetLang === 'English' ? '"a major bank"' : '"un banco grande"'}
   - "XP Investimentos" → ${targetLang === 'English' ? '"a brokerage"' : '"una correduría"'}
   - "Magazine Luiza" → ${targetLang === 'English' ? '"a large retailer"' : '"una gran cadena minorista"'}

4. GEOGRAPHIC: Remove or generalize Brazil-specific references:
   - "brasileiros" / "brasileiro" / "brasileiras" → ${targetLang === 'English' ? '"people"' : '"personas"'}
   - "no Brasil" → remove or ${targetLang === 'English' ? '"in many countries"' : '"en muchos países"'}
   - "no mercado brasileiro" → ${targetLang === 'English' ? '"in the market"' : '"en el mercado"'}
   - "economia brasileira" → ${targetLang === 'English' ? '"the economy"' : '"la economía"'}
   - Do NOT mention specific Brazilian regions (Nordeste, Sudeste, etc.)

4b. NO PORTUGUESE LEFTOVERS: every word of the final text must be ${targetLang},
   including the VISIBLE TEXT of links. These are the ones that keep slipping through:
   - "ações" / "ação" → ${targetLang === 'English' ? '"stocks" / "share"' : '"acciones" / "acción"'}
   - "valor" → ${targetLang === 'English' ? '"value"' : '"valor" (already Spanish, keep)'}
   - "dívida" / "dívidas" → ${targetLang === 'English' ? '"debt" / "debts"' : '"deuda" / "deudas"'}
   - "poupança" → ${targetLang === 'English' ? '"savings"' : '"ahorro"'}
   - "investimentos" → ${targetLang === 'English' ? '"investments"' : '"inversiones"'}
   - "reais" (the currency) → follow rule 1 and convert the amount
   Translating the visible text of a link does NOT authorise touching its URL — see 6b.

5. HOLIDAYS: Adapt to international calendar:
   - "Dia dos Namorados" (Jun 12) → ${targetLang === 'English' ? '"Valentine\'s Day" (Feb 14)' : '"Día de San Valentín" (14 feb)'}
   - "Dia dos Pais" (Aug BR) → ${targetLang === 'English' ? '"Father\'s Day" (3rd Sunday of June)' : '"Día del Padre"'}
   - "13º salário" → ${targetLang === 'English' ? '"year-end bonus"' : '"paga extra"'}

6. KEEP UNCHANGED:
   - Brand name: ${brandName}
   - App URL: ${appUrl}
   - Markdown formatting
   - Image paths (![alt](url))

6b. INTERNAL LINK URLs — COPY THEM CHARACTER FOR CHARACTER. NEVER INVENT ONE.
   Rule 2 above changes the VISIBLE TEXT of a link. It must NEVER change the URL.
   The URL is a real file that exists; a URL you compose from the new wording does
   not exist, and it breaks the site build.
   - CORRECT:   [Selic](/es/glossario/es-selic)
                → [tasa base del banco central](/es/glossario/es-selic)
   - FORBIDDEN: [Selic](/es/glossario/es-selic)
                → [tasa base del banco central](/es/glossario/es-banco-central)
   If a term has no link in the original, write it as PLAIN TEXT with no link.
   Never add a link that was not already there.

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
