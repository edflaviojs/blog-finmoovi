/**
 * fornecedores-ia.js — "quem é que está de pé?"
 *
 * Faz UMA pergunta minúscula ao motor de texto e diz qual fornecedor respondeu.
 * Não escreve nada, não publica nada, não commita nada.
 *
 * Por que existe (18/08/2026): a Cerebras passou a devolver HTTP 402 e a única
 * forma de saber se tinha voltado era esperar que um robô de conteúdo corresse
 * por acaso — e os robôs de conteúdo PUBLICAM. Ficava-se a publicar coisas só
 * para medir um fornecedor. Isto responde em segundos e não deixa rasto.
 *
 * A ordem dos fornecedores está em ../apis/kie-ai.js. Como a chamada pára no
 * primeiro que responder, o que este teste prova com certeza é o estado do
 * PRIMEIRO da fila — que é justamente o que costuma faltar saber. Os que forem
 * recusando antes dele aparecem no registo, com o motivo que o servidor deu.
 *
 * Uso: node src/scripts/diagnostico/fornecedores-ia.js
 * Sai 0 se algum fornecedor respondeu; 1 se NENHUM respondeu.
 */

import { generateText } from '../apis/kie-ai.js';

const PERGUNTA = 'Responda apenas com a palavra: ok';

async function main() {
  console.log('🩺 Diagnóstico dos fornecedores de texto\n');

  const chaves = [
    ['CEREBRAS_API_KEY', 'cerebras'],
    ['GROQ_API_KEY', 'groq'],
    ['KIE_API_KEY', 'groq (chave alternativa)'],
    ['CLOUDFLARE_AI_TOKEN', 'cloudflare'],
  ];
  console.log('Chaves presentes nesta corrida:');
  for (const [env, nome] of chaves) {
    console.log(`   ${process.env[env] ? '✅' : '❌'} ${nome} (${env})`);
  }
  console.log('\nA fazer uma pergunta minúscula. As linhas abaixo são do próprio');
  console.log('motor: quem recusou, porquê, e quem acabou por responder.\n');

  const inicio = Date.now();
  try {
    const resposta = await generateText(PERGUNTA, { maxTokens: 10, temperature: 0 });
    console.log(`\n✅ Respondeu em ${((Date.now() - inicio) / 1000).toFixed(1)}s: "${String(resposta).trim().slice(0, 60)}"`);
    console.log('   (a linha "Texto gerado via ..." acima diz QUEM respondeu)');
    process.exit(0);
  } catch (erro) {
    console.log(`\n❌ NENHUM fornecedor respondeu.\n${erro.message}`);
    process.exit(1);
  }
}

main();
