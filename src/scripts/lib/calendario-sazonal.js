/**
 * calendario-sazonal.js — calendário de datas UNIVERSAIS por mercado (Seção 42.15B).
 *
 * O blog mira BR, PT, ES, EUA e Reino Unido. Muitas datas existem em vários
 * mercados MAS em dias diferentes (Dia dos Pais: BR 2º dom ago, PT/ES 19 mar,
 * EUA/UK 3º dom jun). Modelo escolhido: UM post forte por feriado, disparado antes
 * da data MAIS PRÓXIMA entre os mercados, com o corpo citando a data de cada país,
 * nos 3 idiomas (evita canibalização e serve todos os mercados).
 *
 * Datas móveis (nº-ésimo domingo, Black Friday, Páscoa) são CALCULADAS — nada de
 * data fixa inventada. Módulo puro.
 */

// ── Helpers de data ──
/** N-ésima ocorrência de um weekday (0=dom) num mês. year, month(1-12), weekday, n. */
export function nthWeekday(year, month, weekday, n) {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const shift = (weekday - first.getUTCDay() + 7) % 7;
  return new Date(Date.UTC(year, month - 1, 1 + shift + (n - 1) * 7));
}
/** Black Friday = sexta após a 4ª quinta de novembro (dia seguinte ao Thanksgiving). */
export function blackFriday(year) {
  const thanksgiving = nthWeekday(year, 11, 4, 4); // 4ª quinta (weekday 4)
  return new Date(thanksgiving.getTime() + 86400000);
}
/** Domingo de Páscoa (Gregoriano, algoritmo de Meeus/Jones/Butcher). */
export function easter(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

/** Resolve a data de um mercado num ano (fixed | nth | black-friday | easter). */
export function resolveDate(spec, year) {
  switch (spec.type) {
    case 'fixed': return new Date(Date.UTC(year, spec.month - 1, spec.day));
    case 'nth': return nthWeekday(year, spec.month, spec.weekday, spec.n);
    case 'black-friday': return blackFriday(year);
    case 'easter': return easter(year);
    default: throw new Error(`Tipo de data desconhecido: ${spec.type}`);
  }
}

// ── Feriados universais (datas por mercado) ──
// weekday: 0=domingo. Fontes das datas: convenções oficiais de cada país.
export const HOLIDAYS = [
  {
    id: 'ano-novo', label: 'Ano Novo (planejamento financeiro)',
    ptTopic: 'como planejar as finanças para o ano novo e definir metas realistas',
    keywords: ['planejamento financeiro', 'metas financeiras', 'ano novo finanças'],
    markets: { BR: { type: 'fixed', month: 1, day: 1 }, PT: { type: 'fixed', month: 1, day: 1 }, ES: { type: 'fixed', month: 1, day: 1 }, US: { type: 'fixed', month: 1, day: 1 }, UK: { type: 'fixed', month: 1, day: 1 } },
  },
  {
    id: 'namorados', label: 'Dia dos Namorados / Valentine\'s',
    ptTopic: 'como comemorar o Dia dos Namorados gastando pouco e sem dívidas',
    keywords: ['dia dos namorados', 'presente barato namorados', 'valentine budget'],
    markets: { BR: { type: 'fixed', month: 6, day: 12 }, PT: { type: 'fixed', month: 2, day: 14 }, ES: { type: 'fixed', month: 2, day: 14 }, US: { type: 'fixed', month: 2, day: 14 }, UK: { type: 'fixed', month: 2, day: 14 } },
  },
  {
    id: 'dia-das-maes', label: 'Dia das Mães / Mother\'s Day',
    ptTopic: 'como economizar no Dia das Mães sem comprometer o orçamento',
    keywords: ['dia das mães', 'presente dia das mães', 'mother\'s day budget'],
    // UK (Mothering Sunday) é baseado na Páscoa — omitido aqui para não inventar; demais usam domingos de maio.
    markets: { BR: { type: 'nth', month: 5, weekday: 0, n: 2 }, US: { type: 'nth', month: 5, weekday: 0, n: 2 }, PT: { type: 'nth', month: 5, weekday: 0, n: 1 }, ES: { type: 'nth', month: 5, weekday: 0, n: 1 } },
  },
  {
    id: 'dia-dos-pais', label: 'Dia dos Pais / Father\'s Day',
    ptTopic: 'como planejar os gastos do Dia dos Pais sem apertar o orçamento',
    keywords: ['dia dos pais', 'presente dia dos pais', 'father\'s day budget'],
    markets: { BR: { type: 'nth', month: 8, weekday: 0, n: 2 }, PT: { type: 'fixed', month: 3, day: 19 }, ES: { type: 'fixed', month: 3, day: 19 }, US: { type: 'nth', month: 6, weekday: 0, n: 3 }, UK: { type: 'nth', month: 6, weekday: 0, n: 3 } },
  },
  {
    id: 'pascoa', label: 'Páscoa / Easter',
    ptTopic: 'como aproveitar a Páscoa sem gastar demais com chocolate e viagens',
    keywords: ['páscoa econômica', 'economizar páscoa', 'easter budget'],
    markets: { BR: { type: 'easter' }, PT: { type: 'easter' }, ES: { type: 'easter' }, US: { type: 'easter' }, UK: { type: 'easter' } },
  },
  {
    id: 'volta-as-aulas', label: 'Volta às aulas / Back to school',
    ptTopic: 'como economizar na volta às aulas e planejar os gastos escolares',
    keywords: ['volta às aulas', 'material escolar barato', 'back to school budget'],
    // Estação (não é dia fixo): datas representativas por mercado.
    markets: { BR: { type: 'fixed', month: 1, day: 25 }, US: { type: 'fixed', month: 8, day: 20 }, UK: { type: 'fixed', month: 9, day: 1 }, PT: { type: 'fixed', month: 9, day: 10 }, ES: { type: 'fixed', month: 9, day: 10 } },
  },
  {
    id: 'black-friday', label: 'Black Friday',
    ptTopic: 'como aproveitar a Black Friday sem cair em armadilhas e comprar com consciência',
    keywords: ['black friday', 'black friday dicas', 'black friday ofertas reais'],
    markets: { BR: { type: 'black-friday' }, PT: { type: 'black-friday' }, ES: { type: 'black-friday' }, US: { type: 'black-friday' }, UK: { type: 'black-friday' } },
  },
  {
    id: 'natal', label: 'Natal / Christmas',
    ptTopic: 'como organizar as finanças para o Natal e evitar dívidas no fim do ano',
    keywords: ['natal sem dívidas', 'economizar natal', 'christmas budget'],
    markets: { BR: { type: 'fixed', month: 12, day: 25 }, PT: { type: 'fixed', month: 12, day: 25 }, ES: { type: 'fixed', month: 12, day: 25 }, US: { type: 'fixed', month: 12, day: 25 }, UK: { type: 'fixed', month: 12, day: 25 } },
  },
];

const MARKET_LABEL = {
  BR: 'no Brasil', PT: 'em Portugal', ES: 'na Espanha', US: 'nos Estados Unidos', UK: 'no Reino Unido',
};
const fmtBR = d => `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;

/**
 * Para um feriado e um "agora", devolve a MENOR distância (em dias) até alguma data
 * de mercado (considerando este ano e o próximo), + o texto das datas por mercado.
 */
export function holidayProximity(holiday, now) {
  const y = now.getUTCFullYear();
  let soonest = Infinity, soonestMarket = null;
  const perMarket = [];
  for (const [market, spec] of Object.entries(holiday.markets)) {
    let date = resolveDate(spec, y);
    if (date.getTime() < now.getTime()) date = resolveDate(spec, y + 1);
    const days = Math.ceil((date.getTime() - now.getTime()) / 86400000);
    if (days < soonest) { soonest = days; soonestMarket = market; }
    perMarket.push({ market, date, label: `${MARKET_LABEL[market]}: ${fmtBR(date)}` });
  }
  return { soonest, soonestMarket, perMarket };
}

/**
 * Devolve o feriado "devido" (a data mais próxima entre os mercados dentro da janela
 * [leadMin, leadMax] dias). now é injetável para testes. null se nenhum.
 */
export function getDueHoliday(now = new Date(), { leadMin = 10, leadMax = 15 } = {}) {
  const due = HOLIDAYS
    .map(h => ({ holiday: h, prox: holidayProximity(h, now) }))
    .filter(x => x.prox.soonest >= leadMin && x.prox.soonest <= leadMax)
    .sort((a, b) => a.prox.soonest - b.prox.soonest);
  return due[0] || null;
}

export default { HOLIDAYS, resolveDate, nthWeekday, blackFriday, easter, holidayProximity, getDueHoliday };
