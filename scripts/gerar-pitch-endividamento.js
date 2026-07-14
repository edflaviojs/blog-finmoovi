/**
 * gerar-pitch-endividamento.js — Gera RASCUNHOS de e-mail de divulgação (imprensa)
 * do Índice FinMoovi de Endividamento, já personalizados por veículo, a partir dos
 * dados REAIS em src/data/endividamento.json.
 *
 * NÃO envia nada. Escreve:
 *   - press/rascunhos-divulgacao.md   (e-mails prontos p/ copiar, revisar e enviar)
 *   - press/endividamento-serie.csv   (série histórica real, para anexar ao pitch)
 *
 * Envio é MANUAL de propósito (e-mail frio em massa vira spam, queima o domínio e
 * é ignorado). Personalize [nome do jornalista] e confirme o contato no site do
 * veículo antes de enviar. 1 veículo por vez.
 *
 * Uso: node scripts/gerar-pitch-endividamento.js
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { SITE_URL, BRAND_NAME, BLOG_NAME } from './lib/site.js';
import { defaultAuthor } from '../src/data/authors.ts';

const ROOT = process.cwd();
const DATA = join(ROOT, 'src', 'data', 'endividamento.json');
const PRESS_DIR = join(ROOT, 'press');
// ⚙️ MÓDULO DE NICHO (finanças): o estudo de endividamento é específico deste nicho.
// Ao replicar o template, substitua/remova este módulo (fetch-endividamento + pitch + página).
const STUDY_URL = `${SITE_URL}/estudos/endividamento-das-familias`;

const fmt = v => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const monthYear = iso => new Date(iso).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

// ── Veículos-alvo (edite à vontade). angle ∈ macro | pessoal | dados ──
const OUTLETS = [
  { name: 'InfoMoney', beat: 'finanças pessoais e mercado', angle: 'pessoal' },
  { name: 'Valor Investe', beat: 'economia e investimentos', angle: 'macro' },
  { name: 'Seu Dinheiro', beat: 'finanças pessoais', angle: 'pessoal' },
  { name: 'Exame Invest', beat: 'economia e investimentos', angle: 'macro' },
  { name: 'E-Investidor (Estadão)', beat: 'finanças pessoais', angle: 'pessoal' },
  { name: 'UOL Economia', beat: 'economia', angle: 'macro' },
  { name: 'CNN Brasil Business', beat: 'economia', angle: 'macro' },
  { name: 'Money Times', beat: 'mercado e economia', angle: 'dados' },
  { name: 'InvestNews', beat: 'economia e finanças', angle: 'dados' },
  { name: 'Você S/A', beat: 'finanças pessoais e carreira', angle: 'pessoal' },
  { name: 'Nexo Jornal', beat: 'jornalismo de dados', angle: 'dados' },
  { name: 'Poder360', beat: 'dados e política econômica', angle: 'dados' },
];

function subject(angle, d) {
  const endiv = fmt(d.endividamento.latest.value);
  if (angle === 'macro') return `Endividamento das famílias sobe a ${endiv}% da renda — série histórica (dados BC)`;
  if (angle === 'dados') return `Dado + série histórica: endividamento do brasileiro em ${endiv}% (planilha e gráficos prontos)`;
  return `Pauta: ${endiv}% da renda do brasileiro está comprometida com dívidas`;
}

function body(outlet, d) {
  const endiv = fmt(d.endividamento.latest.value);
  const compr = fmt(d.comprometimento.latest.value);
  const first = d.endividamento.series[0];
  const deltaPP = fmt(d.endividamento.latest.value - first.value);
  const firstYear = first.date.slice(0, 4);
  const when = monthYear(d.endividamento.latest.date);

  const gancho = {
    macro: `o endividamento das famílias em relação à renda anual chegou a ${endiv}% em ${when} — alta de ${deltaPP} pontos desde ${firstYear}`,
    pessoal: `praticamente metade da renda anual do brasileiro (${endiv}%) já está comprometida com dívidas, e ${compr}% da renda mensal vai para o serviço da dívida`,
    dados: `tenho a série histórica mensal desde ${firstYear} (endividamento e comprometimento de renda) já organizada, com gráficos e planilha prontos`,
  }[outlet.angle];

  const oferta = {
    macro: 'Posso enviar recortes por período, a planilha e um comentário para citação.',
    pessoal: 'Posso passar um checklist prático para quem está endividado e um comentário para citação.',
    dados: 'Anexo a planilha (CSV) com a série completa; posso gerar o gráfico no formato que preferirem.',
  }[outlet.angle];

  return `Assunto: ${subject(outlet.angle, d)}

Olá, [nome do jornalista],

Acompanho as pautas de ${outlet.beat} no ${outlet.name}. Compilei um levantamento que pode render pauta: ${gancho}. Os dados são do Banco Central (Sistema Gerenciador de Séries Temporais, séries 29037 e 29034) e a página se atualiza a cada nova divulgação.

Estudo completo (com série histórica e gráficos): ${STUDY_URL}

${oferta} Fico à disposição.

Abraço,
${defaultAuthor.name} — editor, ${BLOG_NAME}
[seu e-mail/telefone]`;
}

function buildCSV(d) {
  const map = {};
  for (const p of d.endividamento.series) map[p.date] = { endiv: p.value, compr: '' };
  for (const p of d.comprometimento.series) { (map[p.date] ||= { endiv: '', compr: '' }).compr = p.value; }
  const rows = Object.keys(map).sort().map(date => `${date},${map[date].endiv},${map[date].compr}`);
  return 'data,endividamento_pct_renda_anual,comprometimento_renda_pct\n' + rows.join('\n') + '\n';
}

function main() {
  if (!existsSync(DATA)) {
    console.error('❌ src/data/endividamento.json não existe. Rode antes: node scripts/fetch-endividamento.js');
    process.exitCode = 1;
    return;
  }
  const d = JSON.parse(readFileSync(DATA, 'utf-8'));
  if (!existsSync(PRESS_DIR)) mkdirSync(PRESS_DIR, { recursive: true });

  const endiv = fmt(d.endividamento.latest.value);
  const compr = fmt(d.comprometimento.latest.value);
  const when = monthYear(d.endividamento.latest.date);

  let md = `# Rascunhos de divulgação — Índice ${BRAND_NAME} de Endividamento\n\n`;
  md += `> Gerado automaticamente a partir dos dados reais do BCB. **Não enviado.**\n`;
  md += `> Antes de enviar: personalize \`[nome do jornalista]\`, confirme o contato de pauta no site do veículo, e envie **1 por vez**. Anexe \`endividamento-serie.csv\`.\n\n`;
  md += `**Números atuais:** endividamento ${endiv}% da renda anual (${when}); comprometimento de renda ${compr}%. Estudo: ${STUDY_URL}\n\n---\n\n`;

  for (const outlet of OUTLETS) {
    md += `## ${outlet.name}  \n_(ângulo: ${outlet.angle} · editoria: ${outlet.beat})_\n\n`;
    md += '```\n' + body(outlet, d) + '\n```\n\n';
  }

  writeFileSync(join(PRESS_DIR, 'rascunhos-divulgacao.md'), md);
  writeFileSync(join(PRESS_DIR, 'endividamento-serie.csv'), buildCSV(d));

  console.log(`✅ Gerados ${OUTLETS.length} rascunhos → press/rascunhos-divulgacao.md`);
  console.log(`✅ Série histórica → press/endividamento-serie.csv (${d.endividamento.series.length} linhas)`);
  console.log('   Revise, personalize [nome do jornalista] e envie manualmente (1 por vez).');
  process.exitCode = 0;
}

main();
