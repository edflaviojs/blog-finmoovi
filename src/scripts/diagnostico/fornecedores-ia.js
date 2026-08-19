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
import { generateAIImage } from '../apis/image-router.js';

const PERGUNTA = 'Responda apenas com a palavra: ok';

/**
 * A fila das IMAGENS também é testada — foi o dono quem exigiu que isto
 * abraçasse tudo, não só o texto: *"tem que abraçar todos os formatos"*.
 *
 * E no dia seguinte deu-lhe razão: a Together desligou o
 * `black-forest-labs/FLUX.1-schnell` em 19/08/2026 e o modelo teve de ser
 * trocado sem haver chave nesta máquina para ensaiar. Sem esta prova, a única
 * forma de saber se a troca pegou era esperar que um robô de conteúdo
 * PUBLICASSE alguma coisa.
 *
 * A imagem é gerada na máquina descartável do GitHub e morre com ela: este
 * workflow não tem permissão de escrita e não commita nada.
 */
async function provaDaImagem() {
  console.log('\n🖼️  Agora a fila das IMAGENS (Cloudflare → Together → Pollinations → desenho).\n');
  const inicio = Date.now();
  try {
    const caminho = await generateAIImage('teste de diagnóstico', `diagnostico-${process.pid}`, 'glossario', 'glossary');
    console.log(`\n✅ Imagem gerada em ${((Date.now() - inicio) / 1000).toFixed(1)}s → ${caminho}`);
    console.log('   (a linha "[...] Image saved" acima diz QUAL fornecedor a fez;');
    console.log('    se disser "SVG", então TODOS os geradores de imagem falharam)');
    return true;
  } catch (erro) {
    console.log(`\n❌ A fila das imagens falhou por inteiro: ${erro.message}`);
    return false;
  }
}

async function main() {
  console.log('🩺 Diagnóstico dos fornecedores de IA\n');

  /**
   * `--so-imagem` salta a prova do texto.
   *
   * Serve para uma coisa concreta: o roteador PARA no primeiro fornecedor que
   * responder, portanto enquanto a Cloudflare funcionar a Together nunca chega
   * a ser experimentada — e foi justamente a Together que mudou de modelo em
   * 19/08/2026. O workflow corre este ficheiro uma segunda vez SEM as chaves da
   * Cloudflare: como cada arranque monta a lista de fornecedores de novo, a
   * Together passa a ser a primeira e fica provada. Sem truques no código de
   * produção.
   */
  if (process.argv.includes('--so-imagem')) {
    const ok = await provaDaImagem();
    process.exit(ok ? 0 : 1);
  }

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
    // ⚠️ `maxTokens` FOLGADO de propósito. A primeira versão pedia 10 e o Groq
    // devolvia "resposta vazia" — não estava avariado: o gpt-oss-120b gasta
    // fichas a raciocinar ANTES de escrever, e em 10 não sobrava nenhuma para a
    // resposta. Uma régua curta demais inventa avaria onde não há.
    const resposta = await generateText(PERGUNTA, { maxTokens: 300, temperature: 0 });
    console.log(`\n✅ Respondeu em ${((Date.now() - inicio) / 1000).toFixed(1)}s: "${String(resposta).trim().slice(0, 60)}"`);
    console.log('   (a linha "Texto gerado via ..." acima diz QUEM respondeu)');
  } catch (erro) {
    console.log(`\n❌ NENHUM fornecedor de TEXTO respondeu.\n${erro.message}`);
    await provaDaImagem();
    process.exit(1);
  }

  // A fila das imagens corre mesmo quando a do texto correu bem: são independentes.
  const imagemOk = await provaDaImagem();
  process.exit(imagemOk ? 0 : 1);
}

main();
