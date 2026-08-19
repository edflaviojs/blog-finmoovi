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

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { generateText } from '../apis/kie-ai.js';
import { generateAIImage } from '../apis/image-router.js';
import { temLetras, olhosDisponiveis } from '../lib/guardiao-da-capa.js';

const PERGUNTA = 'Responda apenas com a palavra: ok';

/**
 * A TRAVA ANTI-LETRAS provada contra amostras reais.
 *
 * PORQUE VIVE AQUI E NÃO NOS TESTES: a trava precisa de IA de visão, e não há
 * chave de visão na máquina do dono (medido em 19/08/2026: a do Gemini responde
 * 403 e a KIE_API_KEY é de teste). O CI dos testes também não tem. Este
 * diagnóstico é o único lugar da casa onde o `GROQ_API_KEY` existe — logo é aqui
 * que se prova.
 *
 * PORQUE IMPORTA PROVAR TODO O DIA: a regra "capa sem letras" já foi quebrada
 * quatro vezes em três meses, sempre em silêncio, e quem descobria era o dono ao
 * abrir o site. Se um dia a trava deixar de funcionar — modelo de visão
 * aposentado, formato de resposta mudado, cota esgotada — isto avisa antes de
 * saírem capas erradas.
 *
 * As amostras são as próprias imagens que falharam em 19/08 e estão guardadas em
 * tests/amostras/. A prova é dupla de propósito: tem de RECUSAR a que tem letras
 * E ACEITAR a que não tem. Só metade não prova nada — um detector que reprova
 * tudo passaria no primeiro caso.
 */
async function provaDaTravaDeLetras() {
  console.log('\n🛡️  A trava anti-letras das capas (a regra que já se quebrou 4x).\n');

  const olhos = olhosDisponiveis();
  if (olhos.length === 0) {
    console.log('❌ Nenhuma IA de visão configurada — a trava está CEGA nesta corrida.');
    console.log('   As capas continuam a sair (a trava nunca bloqueia a publicação),');
    console.log('   mas ninguém está a olhar para elas. Faltam CLOUDFLARE_* ou GROQ_API_KEY.');
    return false;
  }
  console.log(`Olhos disponíveis: ${olhos.join(' → ')}`);

  const dir = join(process.cwd(), 'tests', 'amostras');
  const casos = [
    { ficheiro: 'capa-com-letras.webp', esperado: true, descricao: 'a capa de 19/08 com o título desenhado por cima' },
    { ficheiro: 'capa-boa.webp', esperado: false, descricao: 'uma capa correcta, sem nada escrito' },
  ];

  let acertos = 0;
  for (const caso of casos) {
    const caminho = join(dir, caso.ficheiro);
    if (!existsSync(caminho)) {
      console.log(`⚠️ falta a amostra ${caso.ficheiro} — sem ela isto não prova nada`);
      continue;
    }
    try {
      const r = await temLetras(readFileSync(caminho));
      const certo = r.reprovada === caso.esperado;
      if (certo) acertos++;
      console.log(`${certo ? '✅' : '❌'} ${caso.ficheiro} — ${caso.descricao}`);
      console.log(`     esperado ${caso.esperado ? 'RECUSAR' : 'ACEITAR'}, obtido ${r.reprovada ? 'RECUSAR' : 'ACEITAR'}` +
        ` (nível "${r.nivel}"${r.amostra ? `, leu: "${r.amostra}"` : ''}, via ${r.quem || 'ninguém'})`);
    } catch (erro) {
      console.log(`❌ ${caso.ficheiro}: ${erro.message}`);
    }
  }

  const ok = acertos === casos.length;
  console.log(ok
    ? '\n✅ A trava anti-letras está a funcionar: recusa o que tem letras e aceita o que não tem.'
    : '\n🚨 A TRAVA ANTI-LETRAS NÃO ESTÁ DE PÉ — capas com texto podem voltar a ser publicadas.');
  return ok;
}

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

  /** `--so-trava` prova apenas a trava anti-letras. Útil para conferir depressa. */
  if (process.argv.includes('--so-trava')) {
    const ok = await provaDaTravaDeLetras();
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
    await provaDaTravaDeLetras();
    process.exit(1);
  }

  // A fila das imagens corre mesmo quando a do texto correu bem: são independentes.
  const imagemOk = await provaDaImagem();
  // A trava também: uma coisa é a imagem SAIR, outra é ela estar em condições.
  // Foi essa a distinção que faltou em 19/08 — as capas saíram todas, verdes, e
  // com letras. A trava não pode derrubar o diagnóstico do que é a fila em si,
  // por isso o código de saída continua a ser o da fila.
  const travaOk = await provaDaTravaDeLetras();
  if (imagemOk && !travaOk) {
    console.log('\n⚠️ A fila das imagens está de pé, mas a trava anti-letras não —');
    console.log('   ou seja: as capas saem, e ninguém garante que saem sem texto.');
  }
  process.exit(imagemOk ? 0 : 1);
}

main();
