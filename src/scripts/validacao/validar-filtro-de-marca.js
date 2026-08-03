/**
 * PROVA DO FILTRO DE MARCA — o portão que decide o que este canal pode falar.
 *
 * ═══ POR QUE EXISTE ═══
 * O filtro é escrito em expressões regulares, e a primeira versão dele tinha um
 * defeito que teria passado despercebido: `\b` no FIM de uma alternativa mata
 * todos os prefixos — `/\binvest\b/` NÃO casa com "investimentos". Resultado:
 * recusava metade dos vídeos de finanças pelo motivo "não é sobre finanças".
 * Só se viu porque foi corrido contra dados REAIS. Este ficheiro fixa isso: as
 * frases abaixo são casos verdadeiros, e qualquer mexida nas listas tem de
 * continuar a passar aqui.
 *
 * ⚠️ Estes casos são POLÍTICA EDITORIAL, não afinação técnica. Mudar um
 * "recusa" para "aceita" é mudar o que o canal pode falar — é decisão do dono.
 *
 * Uso: node src/scripts/validacao/validar-filtro-de-marca.js
 */

import { avaliarViral, lerEstrutura } from '../youtube/lib/filtro-de-marca.js';

// [título, tem de entrar?, porquê este caso existe, nome do canal (opcional)]
//
// ⚠️ O filtro lê o TÍTULO **e o NOME DO CANAL** — é o que o detetive traz. Um
// título metafórico ("Corrida dos Ratos") não tem uma palavra de dinheiro e só
// passa porque vem de um canal de finanças. Foi assim que aconteceu nos dados
// reais, e é por isso que este caso leva o canal: uma prova que mente sobre a
// entrada não prova nada.
const CASOS = [
  // ── tem de RECUSAR ────────────────────────────────────────────────────────
  ['5 Princípios Financeiros que fazem o Povo Judeu PROSPERAR', false, 'dinheiro explicado por etnia (caso real, top 4 de 02/08)'],
  ['Segui as dicas do PRIMO POBRE por 1 ano e isso aconteceu', false, 'depende de um canal que não é nosso (caso real, top 2)'],
  ['Como o método secreto dos ricos te faz ficar rico em 2 anos', false, 'promessa de enriquecimento rápido'],
  ['8 FONTES DE RENDA EXTRA para GANHAR R$ 200 por dia no PIX!', false, 'promessa de ganho diário — a forma da fraude'],
  ['Ganhei R$ 5 mil no tigrinho em uma noite', false, 'aposta'],
  ['O que a Bíblia ensina sobre dinheiro', false, 'religião'],
  ['Nubank vs Itaú: qual cartão vale mais a pena', false, 'nomeia bancos'],
  ['Influencer morreu devendo R$ 2 milhões', false, 'sensacionalismo'],
  ['Como plantar tomate na varanda', false, 'fora do nicho'],

  // ── tem de ACEITAR ────────────────────────────────────────────────────────
  ['OS 5 MELHORES INVESTIMENTOS PARA QUEM QUER COMEÇAR DO ZERO EM 2026', true, 'o defeito do \\b matava este'],
  ['pessoas sem o mínimo de educação financeira', true, 'o defeito do \\b matava este'],
  ['POUPAR NÃO FUNCIONA! 5 DICAS PARA VOCÊ JUNTAR R$ 50 MIL', true, 'caso real, legítimo'],
  ['Guarde R$ 5 por dia e veja o que acontece em 1 ano', true, '🔴 o oposto da fraude: guardar, não ganhar — não pode ser recusado'],
  ['POR QUE SOBRA TÃO POUCO DINHEIRO? 💸🤔 #shorts', true, 'caso real, legítimo'],
  ['RENDA MENSAL DE R$ 300 INVESTINDO POUCO NESSES 3 FIIS!', true, 'caso real, legítimo'],
  ['Você Escapou da Corrida dos Ratos. Ninguém Percebeu.', true, 'metafórico: só passa pelo nome do canal', 'Manual do Investidor'],
  ['Você Escapou da Corrida dos Ratos. Ninguém Percebeu.', false, 'o MESMO título sem canal de finanças não tem sinal nenhum', ''],
];

// A leitura da FORMA (é ela que viaja para o gerador de roteiro).
const CASOS_ESTRUTURA = [
  ['5 erros que te custam R$ 800 por mês', 'lista numerada'],
  ['Por que sobra tão pouco dinheiro?', 'pergunta dirigida'],
  ['A inflação te ROUBA sem você perceber', 'perda em curso'],
  ['Segui as dicas por 1 ano e isso aconteceu', 'experiência vivida'],
];

let falhas = 0;

console.log('\n── O QUE O CANAL PODE FALAR ──');
for (const [titulo, deveEntrar, porque, canal] of CASOS) {
  const r = avaliarViral({ title: titulo, channel: canal || '' });
  const ok = r.entra === deveEntrar;
  if (!ok) falhas++;
  console.log(`${ok ? '✅' : '❌'} ${deveEntrar ? 'aceita' : 'recusa'}  "${titulo.slice(0, 58)}"`);
  if (!ok) console.log(`      esperava ${deveEntrar ? 'ACEITAR' : 'RECUSAR'} (${porque}) · obtive: ${r.entra ? 'aceite' : `recusado por ${r.criterio}`}`);
}

console.log('\n── A FORMA QUE FEZ O TÍTULO FUNCIONAR ──');
for (const [titulo, esperado] of CASOS_ESTRUTURA) {
  const pecas = lerEstrutura({ title: titulo }).join(' | ');
  const ok = pecas.includes(esperado);
  if (!ok) falhas++;
  console.log(`${ok ? '✅' : '❌'} "${titulo.slice(0, 44)}" → ${pecas.slice(0, 70)}`);
  if (!ok) console.log(`      esperava reconhecer: ${esperado}`);
}

console.log(`\n${falhas === 0 ? `✅ ${CASOS.length + CASOS_ESTRUTURA.length} provas passaram` : `❌ ${falhas} falha(s)`}`);
process.exit(falhas === 0 ? 0 : 1);
