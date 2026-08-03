/**
 * O FILTRO DE CRITÉRIOS DA MARCA — a peça que faltava ao detetive de virais
 * (03/08/2026, IMPLEMENTACAO24 §3.2).
 *
 * ═══ POR QUE EXISTE ═══
 * O detetive traz o que está a bombar no YouTube de finanças. Até hoje, a ÚNICA
 * coisa que decidia se um viral entrava na nossa fila era uma pergunta feita à
 * IA ("isto é sobre finanças?"). Ou seja: **um juízo de opinião, sem nenhum
 * critério escrito**, e a decidir por um canal de finanças que fala com dinheiro
 * de gente real.
 *
 * Basta olhar para a colheita de 02/08 para ver o risco. Entre os 20 mais
 * virais estava *"5 Princípios Financeiros que fazem o Povo Judeu PROSPERAR"*.
 * O tema é de finanças — a pergunta da IA deixaria passar — mas nenhum canal
 * sério de educação financeira quer o seu nome colado a um vídeo que explica
 * dinheiro por etnia. Não é uma questão de gosto: é a marca.
 *
 * ═══ O DESENHO ═══
 * · **Determinístico e antes da IA.** Cada recusa tem um motivo escrito, que vai
 *   para o registo. Nada morre em silêncio, e não se gasta uma chamada de IA
 *   naquilo que já sabíamos que ia ser recusado.
 * · **Só recusa; nunca aprova sozinho.** O que passa aqui continua a ser lido
 *   pela IA, que ainda pode marcar como fora do tema. Este filtro é o primeiro
 *   portão, não o único.
 * · **Corre sobre o TÍTULO e o NOME DO CANAL** — é tudo o que o detetive traz.
 *
 * ⚠️ Quem mexer nas listas está a mexer no que o canal PODE falar. É uma decisão
 * editorial do dono, não uma afinação técnica.
 */

/** Sem acentos e em minúsculas — as listas escrevem-se sem acento. */
function normalizar(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Os critérios, por ordem de gravidade. Cada um diz o que recusa e PORQUÊ —
 * a explicação é a parte que se lê daqui a seis meses.
 */
/**
 * ⚠️ ARMADILHA JÁ APANHADA (03/08/2026, na primeira prova contra dados reais):
 * `\b` no FIM de uma alternativa mata todos os prefixos — `/\binvest\b/` NÃO
 * casa com "investimentos", porque depois de "invest" não há fronteira nenhuma.
 * A primeira versão deste ficheiro recusava metade dos vídeos de finanças por
 * causa disso. Onde a intenção é um prefixo, escreve-se `\w*` à vista.
 */
export const CRITERIOS = [
  {
    nome: 'identidade',
    porque: 'explicar dinheiro por etnia, religião ou política divide o público e cola a marca a um terreno que não é o nosso',
    padrao: /\b(judeu|judeus|judaic\w*|mucul\w*|islam\w*|crist(a|ao|aos|ãos)|evangelic\w*|catolic\w*|igreja|biblia|biblic\w*|deus|espiritual\w*|orac(ao|oes)|macumba|astrolog\w*|signo|signos|horoscopo|esquerda|direita|lula|bolsonaro|comunis\w*|socialis\w*)\b/,
  },
  {
    nome: 'enriquecimento-rapido',
    porque: 'promessa de ficar rico depressa é o oposto do que este canal ensina, e é o terreno das fraudes',
    // ⚠️ "R$ X por dia" só é recusado quando vem colado a GANHAR/RECEBER. É
    // essa a forma da fraude ("ganhe R$ 200 por dia"). Sem essa condição,
    // matava-se o oposto — "guarde R$ 5 por dia" é dos melhores temas que este
    // canal tem.
    padrao: /\b(fica(r)? rico|ficar milionario|enriquec\w*|primeiro milhao|milionario em|renda extra garantida|dinheiro facil|ganhar dinheiro (rapido|facil|dormindo)|(ganhar|ganhe|receber|receba|faturar|fature|lucrar|lucre) r\$ ?[\d.,]+ (por|ao) dia|sem sair de casa|metodo secreto|segredo dos ricos|formula (secreta|magica)|mudar de vida em)\b/,
  },
  {
    nome: 'aposta-e-especulacao',
    porque: 'aposta, cripto de momento e day trade não são educação financeira e trariam gente que não é nossa',
    // "bet" fica com fronteira nos dois lados de propósito: sem ela apanharia
    // "beta", que é palavra legítima de investimento.
    padrao: /\b(aposta|apostas|apostar|bet|betano|blaze|tigrinho|cassino|loteria|mega ?sena|day ?trade|opcoes binarias|memecoin|shitcoin|bitcoin vai|cripto vai|100x|1000x)\b/,
  },
  {
    nome: 'nomeia-terceiros',
    porque: 'o vídeo dependeria de uma pessoa ou empresa que não é nossa — e o canal fala de dinheiro, não de gente',
    padrao: /\b(primo (rico|pobre)|nath finan\w*|me poupe|nubank|itau|bradesco|santander|xp investimentos|binance|mercado (pago|bitcoin)|c6 ?bank|picpay|will ?bank|banco do brasil)\b/,
  },
  {
    nome: 'sensacionalismo',
    porque: 'reagir a tragédia, morte ou escândalo é o contrário do tom deste canal',
    padrao: /\b(morreu|morte|assassin\w*|tragedia|acidente|processad\w*|preso|cadeia|escandalo|chocante|revoltante)\b/,
  },
  {
    nome: 'fora-do-nicho',
    porque: 'não é sobre o dinheiro de quem assiste',
    // Único critério em POSITIVO: exige pelo menos um sinal de finanças. Corre
    // por último e é PERMISSIVO de propósito — o detetive já procura em
    // consultas de finanças, então este só existe para apanhar um desgarrado.
    // Sem fronteira no fim: aqui, deixar passar a mais é inofensivo.
    // Inclui sinais em ESPANHOL de propósito: o detetive apanha muito viral em
    // espanhol e o desenho do canal é traduzir o CONCEITO (decisão 14.1.3 do
    // IMPL20). Sem eles, "Las 5 Reglas de las Familias Ricas" era recusado por
    // "não é sobre finanças" — e é (apanhado na colheita de 03/08).
    exigeUmDe: /\b(dinheiro|financ|invest|poupan|salario|divida|gasto|economi|orcament|renda|juros|cartao|credito|banco|conta|aposentad|reserva|emergencia|inflacao|imposto|pix|tesouro|cdb|fii|bolsa|acoes|aluguel|milha|custo|preco|caro|barato|pagar|parcel|compra|ric[ao]s?|pobre|milionario|patrimonio|centavo|real|reais|r\$|dinero|ahorr|invers|deuda|sueldo|riqueza|millonari|presupuesto|tarjeta)/,
  },
];

/**
 * Decide se um vídeo viral pode virar tema do canal.
 * @param {{title?: string, channel?: string}} video
 * @returns {{entra: boolean, criterio: string|null, motivo: string}}
 */
export function avaliarViral(video) {
  const titulo = normalizar(video?.title);
  const canal = normalizar(video?.channel);
  const texto = `${titulo} ${canal}`;

  if (!titulo) return { entra: false, criterio: 'sem-titulo', motivo: 'o vídeo veio sem título' };

  for (const criterio of CRITERIOS) {
    if (criterio.padrao) {
      const achado = texto.match(criterio.padrao);
      if (achado) {
        return {
          entra: false,
          criterio: criterio.nome,
          motivo: `"${achado[0]}" — ${criterio.porque}`,
        };
      }
    }
    if (criterio.exigeUmDe && !criterio.exigeUmDe.test(texto)) {
      return { entra: false, criterio: criterio.nome, motivo: criterio.porque };
    }
  }

  return { entra: true, criterio: null, motivo: 'passa nos critérios da marca' };
}

/**
 * Lê a FORMA do título que funcionou — não o assunto.
 *
 * É esta a diferença entre copiar o tema de um viral e aprender com ele: o que
 * fez o dedo parar foi a estrutura (uma pergunta? um número? uma promessa de
 * perda?), e essa estrutura serve a QUALQUER assunto nosso.
 */
export function lerEstrutura(video) {
  const t = String(video?.title || '');
  const n = normalizar(t);
  const pecas = [];

  const numero = t.match(/\b\d+([.,]\d+)?\s*(mil|milh(a|õ)o|milhões|%|reais|r\$)?/i);
  if (/^\s*\d+\s/.test(t) || /\b\d+\s+(coisas|erros|dicas|passos|habitos|hábitos|motivos|formas|maneiras)\b/i.test(n)) {
    pecas.push('lista numerada (o número está no início e promete quantas coisas vêm)');
  } else if (numero) {
    pecas.push(`número concreto no título ("${numero[0].trim()}")`);
  }
  if (/\?/.test(t)) pecas.push('pergunta dirigida a quem assiste');
  if (/\b(voce|vc|teu|seu|sua)\b/.test(n)) pecas.push('fala directamente com "você"');
  if (/\b(nunca|pare|evite|erro|erros|deixe de|nao faca)\b/.test(n)) pecas.push('aviso de erro a evitar (o que NÃO fazer)');
  if (/\b(rouba|perde|perdendo|custa|sumindo|drena|escapa|vazamento)\b/.test(n)) pecas.push('perda em curso — mostra dinheiro a sair agora');
  if (/\b(por (1|um) ano|durante|testei|segui|fiz|tentei)\b/.test(n)) pecas.push('experiência vivida em primeira pessoa');
  if (/[A-ZÀ-Ú]{4,}/.test(t)) pecas.push('uma palavra em maiúsculas a marcar o tom');

  return pecas.length ? pecas : ['título afirmativo simples, sem número nem pergunta'];
}
