/**
 * A DESCRIÇÃO DO VÍDEO LONGO — com capítulos de verdade, e sem uma linha de IA.
 *
 * ═══ POR QUE NÃO HÁ IA AQUI ═══
 * Em 03/08 descobrimos que **5 das 9 descrições geradas por IA que estavam no ar
 * acabavam a meio da palavra** — a resposta vinha cortada e ninguém olhava para o
 * motivo da paragem (IMPLEMENTACAO20 §33.3). Uma descrição é uma lista de coisas que
 * já sabemos: o título, os capítulos, o link certo, as hashtags e o crédito da
 * música. **O que se calcula não se pede ao modelo** — e o que se monta com uma
 * lista não pode sair cortado.
 *
 * ═══ OS CAPÍTULOS SÃO A RAZÃO DE ISTO EXISTIR ═══
 * Foi a leitura de 64 capítulos reais (§33.5) que desenhou este vídeo, e é a
 * descrição que os torna capítulos de verdade no YouTube. A regra do YouTube: o
 * primeiro tem de ser 00:00 e tem de haver pelo menos três.
 *
 * ⚠️ ESPELHAMENTO — leia antes de mexer. Os tempos abaixo são calculados com as
 * MESMAS constantes que `youtube-render/src/Long.tsx` usa para montar o vídeo
 * (`VOZ_ENTRA_FRAMES` e `RESPIRO_SEC`). Mudar uma sem mudar a outra faz os capítulos
 * apontarem para o sítio errado. É o mesmo modo de falha já documentado entre
 * `Short.tsx` e `srt-short.js` — e a defesa é a mesma: conferir o RESULTADO no vídeo
 * renderizado, não confiar no cálculo.
 *
 * Uso: node src/scripts/youtube/descricao-longo.js --slug=sair-do-vermelho
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { escolherTrilha, creditoDaMusica } from './lib/musica.js';

const AQUI = dirname(fileURLToPath(import.meta.url));
const ROTEIRO_DIR = join(process.cwd(), 'youtube-render', 'public', 'roteiro');
const AUDIO_DIR = join(process.cwd(), 'youtube-render', 'public', 'audio');
const OUTPUT_DIR = join(AQUI, 'output');

// ⚠️ ESPELHADOS de youtube-render/src/Long.tsx — ver o aviso no cabeçalho.
const VOZ_ENTRA_SEG = 27 / 30;
const RESPIRO_SEC = 0.35;

const args = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => {
    const [k, ...v] = a.slice(2).split('=');
    return [k, v.join('=') || true];
  }),
);

const mmss = (seg) => {
  const s = Math.max(0, Math.floor(seg));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

const semAcento = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * As calculadoras que EXISTEM no blog, com os termos que as chamam. A tabela é a
 * MESMA ideia do `upload-short.js`: escolher o link é VERDADE, não gosto.
 * ⚠️ O endereço leva barra no fim — o Cloudflare serve COM barra final.
 */
const BLOG_TOOLS_URL = 'https://blog.finmoovi.com/ferramentas/';
const CALCULADORAS = [
  { pagina: 'calculadora-financiamento', termos: ['divida', 'vermelho', 'financiamento', 'amortiza', 'parcela', 'emprestimo', 'credito', 'cartao', 'fatura'] },
  { pagina: 'calculadora-juros-compostos', termos: ['juros compostos', 'render', 'rendimento', 'tesouro', 'poupanca'] },
  { pagina: 'simulador-investimento', termos: ['investi', 'cdb', 'acoes', 'renda fixa', 'etf', 'dividendo'] },
  { pagina: 'calculadora-reserva', termos: ['reserva', 'emergencia', 'imprevisto'] },
  { pagina: 'calculadora-aposentadoria', termos: ['aposenta', 'previdencia', 'inss'] },
  { pagina: 'calculadora-orcamento', termos: ['orcamento', 'gasto', 'salario', 'inflacao', 'economizar', 'controle', 'conta', 'dinheiro'] },
  { pagina: 'conversor-moedas', termos: ['dolar', 'euro', 'cambio', 'moeda'] },
];

export function linkDaCalculadora(texto) {
  const t = semAcento(texto);
  for (const c of CALCULADORAS) {
    if (c.termos.some((termo) => t.includes(termo))) return `${BLOG_TOOLS_URL}${c.pagina}/`;
  }
  return BLOG_TOOLS_URL;
}

/**
 * Os tempos de cada capítulo. Se houver `timing.json` (a voz já foi gerada), usa a
 * duração MEDIDA de cada cena; senão usa a autoral, e diz que é uma estimativa —
 * porque um capítulo apontado para o sítio errado é pior do que capítulo nenhum.
 */
export function tempoDosCapitulos(plano, timing) {
  const medido = (id) => timing?.scenes?.find((s) => String(s.id) === String(id))?.durationSec;
  const marcas = [];
  let t = VOZ_ENTRA_SEG;
  plano.scenes.forEach((cena, i) => {
    if (cena.abreCapitulo && cena.capitulo) {
      marcas.push({ numero: cena.capitulo, titulo: cena.tituloCapitulo, seg: t });
    }
    const dur = medido(cena.id) || cena.durationSec;
    t += dur + (i < plano.scenes.length - 1 ? RESPIRO_SEC : 0);
  });
  return { marcas, totalSeg: t };
}

export function montarDescricao(plano, timing) {
  const { marcas, totalSeg } = tempoDosCapitulos(plano, timing);
  const trilha = escolherTrilha(plano.fioCondutor, 0);
  const credito = creditoDaMusica(trilha);
  const link = linkDaCalculadora(`${plano.tema} ${plano.promessa}`);
  const estimado = !timing;

  const linhas = [
    plano.capa,
    '',
    plano.promessa,
    '',
    '⏱️ CAPÍTULOS',
    '00:00 ' + (plano.capa.length > 70 ? `${plano.capa.slice(0, 67)}...` : plano.capa),
    ...marcas.map((m) => `${mmss(m.seg)} ${m.titulo}`),
    '',
    '📲 O app FinMoovi é grátis e funciona no navegador, sem instalar nada:',
    'https://app.finmoovi.com',
    '',
    '🧮 Faça a conta do seu caso na calculadora grátis:',
    link,
    '',
    '👉 Quer que eu veja o SEU caso? Escreva FINMOOVI nos comentários.',
    '',
  ];
  if (credito) linhas.push(credito, '');
  linhas.push('#SairDoVermelho #Dívidas #ControleFinanceiro #FinançasPessoais #FinMoovi');

  return {
    texto: linhas.join('\n'),
    marcas,
    totalSeg,
    estimado,
    link,
    credito,
  };
}

// ─── execução direta ─────────────────────────────────────────────────────────

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('youtube/descricao-longo.js')) {
  const slug = String(args.slug && args.slug !== true ? args.slug : 'sair-do-vermelho');
  const plano = JSON.parse(readFileSync(join(ROTEIRO_DIR, `${slug}.json`), 'utf-8'));

  const caminhoTiming = join(AUDIO_DIR, slug, 'timing.json');
  const timing = existsSync(caminhoTiming) ? JSON.parse(readFileSync(caminhoTiming, 'utf-8')) : null;

  const d = montarDescricao(plano, timing);

  if (d.estimado) {
    console.log('\n⚠️ AINDA NÃO HÁ VOZ GERADA — os tempos abaixo são ESTIMATIVA pelo número de palavras.');
    console.log('   Volte a correr isto depois do TTS para os capítulos apontarem para o sítio certo.\n');
  }
  // A regra do YouTube: o primeiro capítulo tem de ser 00:00 e têm de existir 3+.
  const validos = d.marcas.length >= 2; // 00:00 + os capítulos nomeados = 3 ou mais
  console.log(validos
    ? `✅ ${d.marcas.length + 1} capítulos (o YouTube exige 3 e o primeiro em 00:00)`
    : `❌ só ${d.marcas.length + 1} capítulos — o YouTube não os vai mostrar`);
  console.log(`⏱️  duração falada: ${mmss(d.totalSeg)}`);
  console.log(`🔗 calculadora: ${d.link}`);
  console.log(`🎵 ${d.credito || '(esta faixa não exige crédito)'}`);

  // A descrição INTEIRA é montada por lista, então nunca sai cortada — mas confere-se
  // à mesma, porque foi exatamente isso que ninguém fez com as 9 primeiras.
  // ⚠️ A verificação ignora a linha das hashtags. A 1ª versão acusava a descrição de
  // "acabar a meio da palavra" porque ela termina em "#FinMoovi" — uma letra. Um
  // alarme que dispara sempre é um alarme que ninguém lê, e este canal já tem a
  // experiência de avisos ignorados a custarem vídeos.
  const semHashtags = d.texto.trim().split('\n').filter((l) => !l.trim().startsWith('#')).join('\n').trim();
  const acabaEmLetra = /[\p{L}]$/u.test(semHashtags);
  console.log(acabaEmLetra ? '⚠️ a descrição acaba numa letra — confira' : '✅ a descrição acaba completa');

  const destino = join(OUTPUT_DIR, `${slug}.descricao.txt`);
  writeFileSync(destino, d.texto, 'utf-8');
  console.log(`\n💾 ${destino}\n`);
  console.log(`${'─'.repeat(72)}\n${d.texto}\n${'─'.repeat(72)}\n`);
}
