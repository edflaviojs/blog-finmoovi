import { config } from '../../../site.config.ts';
/**
 * Cotações Semanal
 * Executa via GitHub Actions 1x/semana (segunda às 7h)
 * Gera um resumo semanal do mercado financeiro
 */

import { generateText, generateCoverImage, generateInlineImage } from '../apis/kie-ai.js';
import { getTickerRates } from '../apis/exchange-rate.js';
import { getSelic, getIpca12m, pt as bcbPt } from '../apis/bcb.js';
import { writeFileSync, mkdirSync, existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const POSTS_DIR = join(process.cwd(), 'src', 'content', 'posts');
const IMAGES_DIR = join(process.cwd(), 'public', 'images', 'posts');

/**
 * Números que aparecem ao lado de "Selic" e NÃO são a taxa — são a regra.
 *
 * `0,5` e `70` são a fórmula da poupança (0,5% ao mês, ou 70% da Selic);
 * `8,5` é o limiar entre as duas; `0,10` é a distância habitual do CDI à Selic;
 * `100` é "100% da Selic". Sem esta lista a trava reprovaria texto correto —
 * e régua grossa demais inventa defeito.
 */
const NUMEROS_DE_REGRA = new Set(['0,5', '0,50', '70', '70,0', '8,5', '8,50', '0,1', '0,10', '100']);

/**
 * Lê as percentagens que o texto atribui a um indicador e devolve as que não
 * batem com o valor oficial.
 *
 * ⚠️ O `[  ]` NÃO É ZELO. Em 15/09/2026 o modelo escreveu `13,75` seguido
 * de um ESPAÇO ESTREITO INVISÍVEL (U+202F) antes do `%`, e por causa disso a
 * primeira varredura encontrou 3 posts errados quando eram 6. Qualquer busca de
 * número neste repositório tem de aceitar os dois espaços invisíveis, senão mede
 * menos do que parece medir.
 *
 * @param {string} texto - o markdown gerado
 * @param {{selic: {valor:number}|null, ipca: {valor:number}|null}} indicadores
 * @returns {string[]} descrições dos desvios; vazio = texto limpo
 */
function conferirIndicadores(texto, indicadores) {
  const erros = [];
  const alvos = [
    { nome: 'Selic', rotulo: /Selic/i, oficial: indicadores?.selic?.valor },
    // `Tesouro IPCA` é o nome de um título, não o índice. Sem o `(?<!Tesouro\s)`
    // a frase correta *"60 % em renda fixa (CDBs, Tesouro IPCA) e 40 % em renda
    // variável"* é lida como "IPCA … 40 %" e reprovada — foi o que a varredura
    // de 22/09/2026 encontrou no post `cotacoes-semana-3-julho-2026`. Este
    // falso positivo estava escondido: enquanto o ramo `IPCA` estava partido
    // pela alternância (ver abaixo), ele nunca chegava a acusar nada.
    { nome: 'IPCA', rotulo: /(?<!Tesouro\s)IPCA|infla[çc][ãa]o/i, oficial: indicadores?.ipca?.valor },
  ];

  for (const alvo of alvos) {
    if (typeof alvo.oficial !== 'number') continue;
    const esperado = bcbPt(alvo.oficial);

    // Uma percentagem até 60 caracteres depois do nome do indicador.
    //
    // O `\b` à frente do número NÃO é decoração: sem ele, "100% da Selic" era
    // lido como "00%" e a trava reprovava uma frase correta. Régua grossa demais
    // inventa defeito — e um medidor que se engana manda refazer trabalho bom.
    //
    // 🔴 O `(?:…)` À VOLTA DO RÓTULO TAMBÉM NÃO É ZELO — foi o que partiu esta
    // automação em 21/09/2026 com `Cannot read properties of undefined (reading
    // 'replace')`. O rótulo do IPCA é uma ALTERNÂNCIA (`IPCA|inflação`) e, colada
    // sem parênteses, o `|` abraçava a expressão inteira: o padrão passava a ser
    // "a palavra IPCA sozinha" OU "inflação seguida de percentagem". Quando o
    // modelo escrevia `IPCA`, casava o primeiro ramo, não havia grupo 1, e o
    // `m[1].replace` logo abaixo estourava.
    //
    // Duas consequências, e a segunda é pior que a falha: a trava do IPCA só
    // funcionava quando o texto dizia "inflação" — pela palavra `IPCA`, que é a
    // mais provável, ela nunca chegou a comparar nada. Metade da proteção não
    // existia, em silêncio.
    const re = new RegExp(`(?:${alvo.rotulo.source})[^.\\n]{0,60}?\\b(\\d{1,2}(?:[,.]\\d{1,2})?)\\s*[\\u202F\\u00A0 ]*%`, 'gi');
    for (const m of texto.matchAll(re)) {
      const bruto = m[1].replace('.', ',');
      if (NUMEROS_DE_REGRA.has(bruto)) continue;
      // Aceita 14, 14,0 e 14,00 como o mesmo número.
      if (Number(bruto.replace(',', '.')) === alvo.oficial) continue;
      erros.push(`${alvo.nome} escrita como ${bruto}% — o Banco Central diz ${esperado}%`);
    }
  }

  // Afirmar uma decisão do Copom é inventar um facto que nenhuma API nos deu.
  //
  // ⚠️ A PRIMEIRA VERSÃO DESTA LINHA SÓ APANHAVA O PASSADO (`reduziu a Selic`) e
  // DEIXAVA PASSAR A FRASE QUE CAUSOU TODO O PROBLEMA: *"o Copom decidiu REDUZIR
  // a Selic"* — infinitivo, não passado. Uma trava só vale depois de ser testada
  // contra o texto real que ela devia ter apanhado.
  // A busca é por FRASE, e não pelo texto todo, e o nome do indicador pode vir
  // antes OU depois da palavra do movimento. A primeira versão exigia a ordem
  // "cortou a Selic" e por isso deixava passar *"Selic em foco: corte de 0,5 %"*,
  // que é o título real do post que inventou o corte.
  //
  // `alta` e `baixa` ficam de fora da lista como adjetivos soltos: são comuns
  // ("a Selic alta mantém a renda fixa atrativa") e reprovariam texto correto.
  // `baixa` entra só na forma "em baixa", que é afirmação de movimento.
  //
  // ── A REVISÃO DE 22/09/2026: a régua acusava o inocente e deixava passar o réu
  //
  // A versão anterior perguntava só duas coisas — "a frase fala da Selic?" e
  // "a frase tem uma palavra de movimento?" — e juntava as duas respostas ainda
  // que se referissem a coisas diferentes. Medido nos 30 posts publicados:
  //
  //   FALSO POSITIVO  "a QUEDA do dólar … graças à taxa Selic ainda alta"
  //                   (a queda é do dólar, a 60 caracteres de distância)
  //   FALSO POSITIVO  "uma taxa Selic mais alta … pode AUMENTAR os rendimentos"
  //                   (o que aumenta são os rendimentos, e é hipótese)
  //   FALSO POSITIVO  "expectativa de novo AUMENTO da Selic" (expectativa ≠ facto)
  //
  // E o pior: no post que tinha o erro DE VERDADE — *"um recorte na taxa Selic"*
  // e *"a Selic seria reduzida já na próxima reunião"* — nenhuma dessas duas
  // frases era apanhada. `recorte` não estava na lista, e `reduzida` também não
  // (só `reduziu`/`reduzir`). O post foi acusado por outra frase, inocente.
  // **A régua dava o alarme certo pelo motivo errado.** Prima da lição de que
  // régua grossa demais inventa defeito — e de que uma trava só vale depois de
  // ser corrida contra o texto real que ela devia ter apanhado.
  //
  // Agora são três perguntas, nesta ordem:
  //   1. o movimento está COLADO à Selic? (janela de 40 caracteres à volta dela)
  //      — é isto que separa "a queda do dólar" de "a queda da Selic";
  //   2. a frase afirma um FACTO CONSUMADO ou uma DECISÃO? então acusa, mesmo
  //      que traga um "pode" mais à frente ("decidiu cortar a Selic, o que pode…");
  //   3. senão, é HIPÓTESE ("pode", "caso", "expectativa")? então deixa passar.
  // Fora destes casos, acusa — na dúvida, não publicar.
  const JANELA = 40;
  const MOVIMENTO = /\b(reduzi(?:u|r|ram|d[ao]s?)|cort(?:ou|ar|e|es|ad[ao]s?)|recortes?|elev(?:ou|ar|a[çc][ãa]o)|aument(?:ou|ar|o)|sub(?:iu|ir|ida)|redu[çc][ãa]o|queda|ca(?:iu|ir|ia)|baixou|em baixa)\b/i;
  const CONSUMADO = /\b(reduziu|reduzid[ao]s?|cortou|cortad[ao]s?|elevou|elevad[ao]s?|aumentou|subiu|caiu|recuou|decidiu|anunciou|definiu|aprovou)\b/i;
  const HIPOTESE = /\b(pode|podem|poder[áã]|poderia|dever[áã]|caso|se|expectativas?|espera(?:-se)?|esperad[ao]|tende[m]?|previs[ãa]o|proje[çc][ãa]o|cen[áa]rio|analistas)\b/i;

  for (const frase of texto.split(/[.\n]/)) {
    let acusar = false;
    for (const hit of frase.matchAll(/Selic/gi)) {
      const ini = Math.max(0, hit.index - JANELA);
      const vizinhanca = frase.slice(ini, hit.index + 'Selic'.length + JANELA);
      if (!MOVIMENTO.test(vizinhanca)) continue;          // 1. movimento é de outra coisa
      if (CONSUMADO.test(frase)) { acusar = true; break; } // 2. facto ou decisão
      if (HIPOTESE.test(frase)) continue;                  // 3. hipótese é permitida
      acusar = true;
      break;
    }
    if (acusar) {
      erros.push('o texto afirma um movimento da Selic (corte/aumento) que nenhum dado sustenta');
      break;
    }
  }

  return [...new Set(erros)];
}

/**
 * @param {{selic: {valor:number,data:string}|null, ipca: {valor:number,data:string}|null}} indicadores
 *   Indicadores lidos do Banco Central. Quando um deles é `null`, o pedido
 *   correspondente sai do prompt — ver o bloco de regras mais abaixo.
 */
async function generatePost(locale, rates, weekStart, today, weekNum, dateStr, imagePath, indicadores) {
  const monthNames = {
    pt: ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'],
    en: ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'],
    es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  };

  const monthName = monthNames[locale][today.getMonth()];

  const titles = {
    pt: `Resumo Semanal: Dólar a R$ ${rates.USDBRL} — Semana ${weekNum} de ${monthName}`,
    en: `Weekly Summary: Dollar at R$ ${rates.USDBRL} — Week ${weekNum} of ${monthName}`,
    es: `Resumen Semanal: Dólar a R$ ${rates.USDBRL} — Semana ${weekNum} de ${monthName}`
  };

  const descriptions = {
    pt: `Resumo semanal do mercado financeiro: dólar, euro, Selic e dicas para investidores. Semana ${weekNum} de ${monthName} ${today.getFullYear()}.`,
    en: `Weekly financial market summary: dollar, euro, Selic and tips for investors. Week ${weekNum} of ${monthName} ${today.getFullYear()}.`,
    es: `Resumen semanal del mercado financiero: dólar, euro, Selic y consejos para inversores. Semana ${weekNum} de ${monthName} ${today.getFullYear()}.`
  };

  const tags = {
    pt: ["cotações", "dólar", "euro", "mercado financeiro", "selic"],
    en: ["quotes", "dollar", "euro", "financial market", "selic"],
    es: ["cotizaciones", "dólar", "euro", "mercado financiero", "selic"]
  };

  // ── OS NÚMEROS ENTRAM NO PROMPT, OU A SECÇÃO NÃO EXISTE ────────────────────
  //
  // Até 15/09/2026 este prompt mandava "Comentário sobre a Selic" e NÃO dava a
  // Selic. O modelo obedecia e inventava um valor — todas as semanas, nos três
  // idiomas. O pior caso publicado afirmava um corte do Copom que nunca houve
  // ("reduziu de 11,25% para 10,75%", quando a taxa estava em 14,00% parada).
  //
  // Duas mudanças, e a segunda é a que importa:
  //   1. a Selic e o IPCA vêm do Banco Central e são INJETADOS aqui;
  //   2. quando o Banco Central não responde, o item desaparece do pedido.
  //      Sem dado, não se pede comentário — porque pedir comentário sem dado é
  //      exatamente o que produziu a mentira.
  //
  // As REGRAS abaixo são texto fixo e nunca são cortadas. E não trazem nenhum
  // número de exemplo de propósito: neste repositório, todo exemplo escrito num
  // prompt acaba copiado à letra pelo modelo.
  const temSelic = Boolean(indicadores?.selic);
  const temIpca = Boolean(indicadores?.ipca);

  const linhasIndicadores = {
    pt: [
      temSelic ? `- Selic (meta do Copom): ${bcbPt(indicadores.selic.valor)}% ao ano, dado de ${indicadores.selic.data}` : null,
      temIpca ? `- IPCA acumulado em 12 meses: ${bcbPt(indicadores.ipca.valor)}%, dado de ${indicadores.ipca.data}` : null,
    ].filter(Boolean).join('\n'),
    en: [
      temSelic ? `- Selic (Copom target rate): ${bcbPt(indicadores.selic.valor)}% per year, as of ${indicadores.selic.data}` : null,
      temIpca ? `- IPCA, 12-month accumulated: ${bcbPt(indicadores.ipca.valor)}%, as of ${indicadores.ipca.data}` : null,
    ].filter(Boolean).join('\n'),
    es: [
      temSelic ? `- Selic (meta del Copom): ${bcbPt(indicadores.selic.valor)}% anual, dato del ${indicadores.selic.data}` : null,
      temIpca ? `- IPCA acumulado en 12 meses: ${bcbPt(indicadores.ipca.valor)}%, dato del ${indicadores.ipca.data}` : null,
    ].filter(Boolean).join('\n'),
  };

  const itemSelic = {
    pt: temSelic ? '\n2. Comentário sobre a Selic e impacto nos investimentos' : '',
    en: temSelic ? '\n2. Comment on Selic and impact on investments' : '',
    es: temSelic ? '\n2. Comentario sobre la Selic e impacto en las inversiones' : '',
  };

  const regras = {
    pt: `
REGRAS OBRIGATÓRIAS SOBRE NÚMEROS — o texto é reprovado se forem quebradas:
- Só pode escrever um número de indicador económico (Selic, IPCA, juros de banco central) se ele estiver na lista "Dados desta semana" acima. Copie-o exatamente como está.
- É proibido inventar, estimar, arredondar ou atualizar qualquer desses números.
- É proibido afirmar que houve reunião, decisão, corte ou aumento de juros. Os dados acima dizem qual é a taxa, não dizem o que aconteceu numa reunião.
- Se faltar um dado de que precisaria, escreva o texto sem ele. Não preencha o buraco.
- Em "o que esperar", fale de cenários e do que observar. É proibido prever um valor.`,
    en: `
MANDATORY RULES ABOUT NUMBERS — the text is rejected if these are broken:
- You may only write an economic indicator figure (Selic, IPCA, central bank rates) if it appears in the "Data for this week" list above. Copy it exactly as given.
- You must not invent, estimate, round or update any of those figures.
- You must not claim that a meeting, decision, rate cut or rate hike happened. The data above states the rate, not what happened at any meeting.
- If a figure you would need is missing, write the text without it. Do not fill the gap.
- In "what to expect", discuss scenarios and what to watch. Forecasting a specific figure is forbidden.`,
    es: `
REGLAS OBLIGATORIAS SOBRE NÚMEROS — el texto se rechaza si se incumplen:
- Solo puede escribir una cifra de indicador económico (Selic, IPCA, tipos de un banco central) si aparece en la lista "Datos de esta semana" de arriba. Cópiela exactamente.
- Está prohibido inventar, estimar, redondear o actualizar cualquiera de esas cifras.
- Está prohibido afirmar que hubo una reunión, decisión, recorte o subida de tipos. Los datos de arriba dicen cuál es la tasa, no lo que ocurrió en una reunión.
- Si falta un dato que necesitaría, escriba el texto sin él. No rellene el hueco.
- En "qué esperar", hable de escenarios y de qué observar. Está prohibido pronosticar una cifra.`,
  };

  const prompts = {
    pt: `
Escreva um resumo semanal do mercado financeiro brasileiro para a semana de ${weekStart.toLocaleDateString('pt-BR')} a ${today.toLocaleDateString('pt-BR')}.

Dados desta semana (os ÚNICOS números que pode afirmar):
- USD/BRL: R$ ${rates.USDBRL}
- EUR/BRL: R$ ${rates.EURBRL}
${linhasIndicadores.pt}
${regras.pt}

Inclua:
1. Resumo do dólar e euro (tendência da semana)${itemSelic.pt}
3. Dica prática para o investidor pessoa física
4. O que esperar para a próxima semana

Formato: artigo de blog com 400-600 palavras, headers H2, tom informativo mas acessível.
Mencione que o ${config.app.name} ajuda a acompanhar investimentos em múltiplas moedas.
`,
    en: `
Write a weekly summary of the Brazilian financial market for the week of ${weekStart.toLocaleDateString('en-US')} to ${today.toLocaleDateString('en-US')}.

Data for this week (the ONLY figures you may state):
- USD/BRL: R$ ${rates.USDBRL}
- EUR/BRL: R$ ${rates.EURBRL}
${linhasIndicadores.en}
${regras.en}

Include:
1. Summary of dollar and euro (weekly trend)${itemSelic.en}
3. Practical tip for individual investors
4. What to expect for next week

Format: blog article with 400-600 words, H2 headers, informative but accessible tone.
Mention that ${config.app.name} helps track investments in multiple currencies.
`,
    es: `
Escriba un resumen semanal del mercado financiero brasileño para la semana del ${weekStart.toLocaleDateString('es-ES')} al ${today.toLocaleDateString('es-ES')}.

Datos de esta semana (las ÚNICAS cifras que puede afirmar):
- USD/BRL: R$ ${rates.USDBRL}
- EUR/BRL: R$ ${rates.EURBRL}
${linhasIndicadores.es}
${regras.es}

Incluya:
1. Resumen del dólar y euro (tendencia de la semana)${itemSelic.es}
3. Consejo práctico para el inversor individual
4. Qué esperar para la próxima semana

Formato: artículo de blog con 400-600 palabras, encabezados H2, tono informativo pero accesible.
Mencione que ${config.app.name} ayuda a seguir inversiones en múltiples monedas.
`
  };

  // ── A TRAVA: o que sair tem de bater com o Banco Central ───────────────────
  //
  // O prompt acima ORDENA copiar o número; esta trava PUNE quem não copiar. As
  // duas vivem neste mesmo ficheiro de propósito — a família de defeito nº1 desta
  // casa é prompt e validador em sítios diferentes, a mandar coisas opostas.
  //
  // Repara uma vez e só depois desiste: `generateText` é caro, e um único
  // deslize do modelo não justifica ficar sem o post da semana. Se falhar as
  // duas, ABORTA — publicar um número de juros inventado é pior que não publicar.
  let content = null;
  for (let tentativa = 1; tentativa <= 2; tentativa++) {
    content = await generateText(prompts[locale], { maxTokens: 2000, temperature: 0.6 });
    const erros = conferirIndicadores(content, indicadores);
    if (erros.length === 0) break;

    console.warn(`::warning::[${locale}] tentativa ${tentativa}: ${erros.join(' | ')}`);
    if (tentativa === 2) {
      throw new Error(
        `[${locale}] o texto afirma indicador que não bate com o Banco Central: ${erros.join(' | ')}`
      );
    }
  }
  const title = titles[locale];

  // Tabela determinística com os valores + linha de fonte datada (citável por
  // leitores e IAs generativas — não depende do LLM incluir os números).
  const dateLocales = { pt: 'pt-BR', en: 'en-US', es: 'es-ES' };
  const ratesDate = today.toLocaleDateString(dateLocales[locale]);
  const ratesTables = {
    pt: `| Moeda | Cotação |\n| --- | --- |\n| Dólar (USD/BRL) | R$ ${rates.USDBRL} |\n| Euro (EUR/BRL) | R$ ${rates.EURBRL} |\n\n*Fonte: AwesomeAPI — cotações de ${ratesDate}*`,
    en: `| Currency | Rate |\n| --- | --- |\n| Dollar (USD/BRL) | R$ ${rates.USDBRL} |\n| Euro (EUR/BRL) | R$ ${rates.EURBRL} |\n\n*Source: AwesomeAPI — rates as of ${ratesDate}*`,
    es: `| Moneda | Cotización |\n| --- | --- |\n| Dólar (USD/BRL) | R$ ${rates.USDBRL} |\n| Euro (EUR/BRL) | R$ ${rates.EURBRL} |\n\n*Fuente: AwesomeAPI — cotizaciones del ${ratesDate}*`,
  };
  const ratesTable = ratesTables[locale];
  const weekWord = locale === 'pt' ? 'semana' : locale === 'en' ? 'week' : 'semana';

  // Mês SEM acento, e só para o endereço e a chave. `março` é o único mês
  // acentuado das três listas, e sem isto o post de março nasceria com o nome
  // `cotacoes-semana-1-março-2026`: o endereço vai para o mundo percent-encoded
  // (`mar%C3%A7o`), feio ao partilhar e diferente de todos os outros slugs do
  // blog, que são ASCII. Preventivo — em 06/08/2026 não havia um único nome de
  // ficheiro acentuado no repo, e o próximo março é o de 2027.
  // O TÍTULO continua a usar `monthName` com a cedilha, que é como se escreve.
  const semAcento = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
  const monthSlug = semAcento(monthName);
  const monthSlugPt = semAcento(monthNames['pt'][today.getMonth()]);

  const slug = `${locale === 'pt' ? 'cotacoes' : locale === 'en' ? 'en-quotes' : 'es-cotizaciones'}-${weekWord}-${weekNum}-${monthSlug}-${today.getFullYear()}`;

  // A chave de tradução É, por definição, o slug do post PT — é ela que casa
  // PT↔EN↔ES no seletor de idioma e nas tags hreflang.
  //
  // Estava errada desde sempre: era montada a partir da COTAÇÃO DO DÓLAR
  // (`resumo-semanal-dolar-r-5-18-semana-1-julho-2026`), uma string que nunca
  // correspondeu a ficheiro nenhum e que muda toda semana com o câmbio.
  // Resultado: 3 posts órfãos por semana — 24 dos 30 encontrados em 06/08/2026.
  // Escrita aqui, ao lado do slug, para que as duas não possam voltar a divergir.
  const translationKey = `cotacoes-semana-${weekNum}-${monthSlugPt}-${today.getFullYear()}`;

  // Insert 2 inline AI images into content
  console.log(`🖼️ Inserindo imagens inline (${locale})...`);
  const contentWithImages = await insertInlineImages(content, slug);

  const frontmatter = `---
title: "${title}"
description: "${descriptions[locale]}"
image: "${imagePath || ''}"
category: "cotacoes"
tags: ${JSON.stringify(tags[locale])}
author: "${config.content.defaultAuthor}"
publishedAt: ${dateStr}
readingTime: 3
featured: false
locale: "${locale}"
translationKey: "${translationKey}"
scope: "br-only"
seo:
  metaTitle: "${locale === 'pt' ? `Cotações Semana ${weekNum} ${monthName} ${today.getFullYear()}: Dólar R$ ${rates.USDBRL}` : locale === 'en' ? `Quotes Week ${weekNum} ${monthName} ${today.getFullYear()}: Dollar R$ ${rates.USDBRL}` : `Cotizaciones Semana ${weekNum} ${monthName} ${today.getFullYear()}: Dólar R$ ${rates.USDBRL}`}"
  metaDescription: "${locale === 'pt' ? `Resumo semanal: dólar a R$ ${rates.USDBRL}, euro a R$ ${rates.EURBRL}. Análise e dicas para investidores.` : locale === 'en' ? `Weekly summary: dollar at R$ ${rates.USDBRL}, euro at R$ ${rates.EURBRL}. Analysis and tips for investors.` : `Resumen semanal: dólar a R$ ${rates.USDBRL}, euro a R$ ${rates.EURBRL}. Análisis y consejos para inversores.`}"
  keywords: ["${locale === 'pt' ? 'cotação dólar hoje' : locale === 'en' ? 'dollar quote today' : 'cotización dólar hoy'}", "${locale === 'pt' ? 'cotação euro' : locale === 'en' ? 'euro quote' : 'cotización euro'}", "${locale === 'pt' ? 'resumo mercado financeiro' : locale === 'en' ? 'financial market summary' : 'resumen mercado financiero'}", "selic"]
---

${ratesTable}

${contentWithImages}

${locale === 'pt' ? `
---
**Pronto para acompanhar seus investimentos? [Experimente o ${config.app.name} grátis por 7 dias](${config.app.url}) — em 5 minutos você terá uma visão clara de para onde está indo seu dinheiro.**
` : locale === 'en' ? `
---
**Ready to track your investments? [Try ${config.app.name} free for 7 days](${config.app.url}) — in 5 minutes you'll have a clear view of where your money is going.**
` : `
---
**¿Listo para seguir tus inversiones? [Prueba ${config.app.name} gratis por 7 días](${config.app.url}) — en 5 minutos tendrás una visión clara de a dónde va tu dinero.**
`}
`;

  return { slug, frontmatter };
}

async function insertInlineImages(content, slugBase) {
  const h2Matches = content.match(/^## .+$/gm) || [];
  if (h2Matches.length < 2) return content;

  const headings = h2Matches.map(h => h.replace('## ', ''));
  let result = content;

  // Insert 2 images: after 1st and 3rd heading (or last available)
  const positions = [0, Math.min(2, headings.length - 1)];

  for (let idx = positions.length - 1; idx >= 0; idx--) {
    const i = positions[idx];
    const sectionTopic = `financial market ${headings[i]}`;
    const imgPath = await generateInlineImage(sectionTopic, `${slugBase}-inline-${i + 1}`, 'posts');
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

async function main() {
  console.log('🚀 Gerando resumo semanal de cotações...');

  try {
    // Guard: check if a cotação was already generated today (prevent duplicates)
    const todayStr = new Date().toISOString().split('T')[0];
    const existingFiles = readdirSync(POSTS_DIR).filter(f => f.startsWith('cotacoes-') && f.endsWith('.md'));
    for (const file of existingFiles) {
      const content = readFileSync(join(POSTS_DIR, file), 'utf-8');
      if (content.includes(`publishedAt: ${todayStr}`)) {
        console.log(`⚠️ Já existe uma cotação gerada hoje (${file}). Abortando para evitar duplicata.`);
        return;
      }
    }

    // Get current rates
    const rates = await getTickerRates();
    console.log(`💱 USD/BRL: ${rates.USDBRL} | EUR/BRL: ${rates.EURBRL}`);

    // Indicadores oficiais. Se o Banco Central não responder, seguem `null` e a
    // secção correspondente sai do pedido — a semana fica sem comentário de
    // Selic, que é infinitamente melhor que uma Selic inventada.
    const [selic, ipca] = await Promise.all([getSelic(), getIpca12m()]);
    const indicadores = { selic, ipca };
    console.log(
      `🏦 Selic: ${selic ? `${bcbPt(selic.valor)}% (${selic.data})` : 'indisponível — secção removida'}` +
      ` | IPCA 12m: ${ipca ? `${bcbPt(ipca.valor)}% (${ipca.data})` : 'indisponível'}`
    );

    // Generate cover image (SVG local, shared across all 3 locales)
    console.log('🖼️ Gerando imagem de capa...');
    const imageSlug = `cotacoes-semana-${new Date().toISOString().split('T')[0]}`;
    const imagePath = await generateCoverImage('financial market weekly summary currency exchange rates', imageSlug, 'posts');

    // Generate posts for all languages
    const locales = ['pt', 'en', 'es'];
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 7);
    const dateStr = today.toISOString().split('T')[0];
    const weekNum = Math.ceil((today.getDate()) / 7);

    for (const locale of locales) {
      console.log(`📄 Gerando post em ${locale}...`);
      const { slug, frontmatter } = await generatePost(locale, rates, weekStart, today, weekNum, dateStr, imagePath, indicadores);

      const postPath = join(POSTS_DIR, `${slug}.md`);
      if (!existsSync(POSTS_DIR)) {
        mkdirSync(POSTS_DIR, { recursive: true });
      }
      writeFileSync(postPath, frontmatter, 'utf-8');
      console.log(`✅ Post salvo: ${postPath}`);

      execSync(`git add "${postPath}"`, { stdio: 'inherit' });

      // Wait 30s between locales to avoid Groq rate limit
      if (locale !== 'es') {
        console.log('⏳ Aguardando 30s para evitar rate limit...');
        await new Promise(r => setTimeout(r, 30000));
      }
    }

    // Add image and commit all
    if (imagePath) {
      execSync(`git add "${IMAGES_DIR}"`, { stdio: 'inherit' });
    }

    // Add internal links (glossary terms)
    console.log('🔗 Adicionando internal links...');
    execSync('node src/scripts/automacoes/internal-linking.js', { stdio: 'inherit' });
    execSync(`git add "${POSTS_DIR}"`, { stdio: 'inherit' });

    execSync(`git commit -m "cotações: semana ${weekNum} - ${today.toISOString().split('T')[0]} [PT/EN/ES]"`, { stdio: 'inherit' });

    console.log('✅ Resumo semanal publicado em todos os idiomas!');
  } catch (error) {
    console.error('❌ Erro ao gerar cotações:', error.message);
    process.exit(1);
  }
}

main();
