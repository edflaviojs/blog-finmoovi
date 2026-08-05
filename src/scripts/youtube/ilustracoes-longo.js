/**
 * AS ILUSTRAÇÕES GERADAS DO VÍDEO LONGO (04/08/2026, tarde).
 *
 * ═══ O PEDIDO ═══
 * *"aqui onde fala: Eu sentei com o celular na mão… aqui a IA podia ter uma
 * inteligência e criar uma imagem de um homem, pode ser realista ou ilustrado, de um
 * homem realmente sentado com um celular na mão num domingo qualquer… e essa imagem com
 * algum movimento como um zoom. Se criarmos 2 ou 3 desses momentos no vídeo já acho que
 * mudaria a cara dele."* — e o dono autorizou **duas por vídeo, para avaliar primeiro**.
 *
 * ═══ TRÊS DECISÕES, E CADA UMA TEM MOTIVO ═══
 *
 * **1. ILUSTRADO, NÃO REALISTA.** Recomendação minha, aceite por ele. Uma fotografia
 * realista ao lado dos bonecos de néon do canal lê-se como dois canais colados; e o
 * YouTube obriga a pôr rótulo de "conteúdo gerado por IA" em imagens realistas — num
 * canal de finanças, esse rótulo custa confiança (é o mesmo raciocínio do §26.1, que já
 * tinha matado o LTX-Video por esta razão).
 *
 * **2. CUSTO ZERO NA AVALIAÇÃO.** Eu tinha orçado ~R$ 1,30 por vídeo. Ao procurar o
 * caminho, encontrei o `image-router.js` do blog, que já tem **três fornecedores, e um
 * deles é grátis e sem chave** (Pollinations, FLUX). Para duas imagens de teste não há
 * razão para gastar. ⚠️ Se a qualidade não servir, a porta paga continua aberta.
 *
 * **3. A LISTA NEGATIVA É OBRIGATÓRIA.** É a destilação #11 do VOX (§16.3): *"lista
 * NEGATIVO fixa em todo prompt visual — proibir texto legível, porque a IA erra letras"*.
 * Uma imagem com letras tortas ao lado de um vídeo que fala de rigor é um tiro no pé.
 *
 * ⚠️ **GERA-SE UMA VEZ E GUARDA-SE.** A imagem fica em `public/ilustracoes/` e o render
 * volta a usá-la. Gerar a cada render daria um vídeo diferente de cada vez — e um vídeo
 * que não se consegue reproduzir igual é impossível de depurar.
 *
 * Uso: node src/scripts/youtube/ilustracoes-longo.js --slug=sair-do-vermelho
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, '..', '..', '..');
const DESTINO = join(RAIZ, 'youtube-render', 'public', 'ilustracoes');

const args = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => {
    const [k, ...v] = a.slice(2).split('=');
    return [k, v.join('=') || true];
  }),
);

/**
 * O CONTRATO DE ESTILO — colado a TODAS as imagens, e é o equivalente grátis da
 * "chave de estilo" do VOX (destilação #16): a mesma cola visual em todos os planos,
 * para as imagens novas parecerem do mesmo vídeo e não de um banco de imagens.
 */
/**
 * ⚠️ CURTO. E isto foi APRENDIDO A OLHAR TRÊS PARES DE IMAGENS, não decidido de cabeça.
 *
 * A minha 1ª versão tinha seis linhas de estilo com códigos de cor, "rim light",
 * "cinematic wide composition" — e o resultado foi imprestável: uma fotografia
 * desfocada de uma pessoa num sofá, e uma forma azul abstrata em vez de peças de puzzle.
 * Na 2ª pus o estilo à FRENTE do pedido e piorou: **as duas imagens saíram iguais**, sem
 * relação nenhuma com o que era pedido.
 * Na 3ª escrevi *"flat vector illustration of a man sitting on a sofa looking at his
 * phone, dark blue background, neon cyan and violet accents, minimal"* — e saiu o que
 * se queria.
 *
 * **A regra: o ASSUNTO primeiro, e depois cinco ou seis palavras de estilo. Não mais.**
 * O modelo divide a atenção pelo prompt todo; um contrato de estilo comprido afoga a
 * única coisa que interessa, que é o que está a acontecer na imagem.
 */
export const ESTILO = 'flat vector illustration, dark navy background, neon cyan and violet accents, minimal';

/** A lista NEGATIVA. Destilação #11 do VOX: a IA erra letras, portanto nada de letras. */
export const NEGATIVO = [
  'text, letters, words, numbers, writing, labels, captions, subtitles, typography',
  'watermarks, logos, signatures, ui, interface, buttons',
  'photorealistic, photograph, 3d render, realistic skin, deformed hands, extra fingers',
  'cluttered, busy background, low contrast',
].join(', ');

/**
 * ⚠️ OS MOMENTOS SÃO DECLARADOS À MÃO, e é de propósito nesta primeira volta.
 *
 * O caminho "certo" seria uma passagem de IA a escolher as cenas e a escrever os
 * pedidos. Mas o dono pediu **duas para avaliar primeiro** — e escolher automaticamente
 * antes de saber se o RESULTADO serve seria automatizar uma coisa que ainda não sabemos
 * se queremos. Os dois momentos aqui saem do que ele próprio apontou e de uma releitura
 * do guião: são as duas frases que descrevem uma CENA FÍSICA que nenhuma das 32
 * ilustrações do catálogo sabe desenhar.
 * ⚠️ Quando isto for aprovado, a escolha passa a ser feita por um leitor de IA com a
 * regra da casa: a IA propõe (gosto), o código confere que a cena existe e que o pedido
 * não tem texto nem número (verdade).
 */
export const MOMENTOS = {
  'sair-do-vermelho': [
    {
      cena: 5,
      porque: 'a única cena do vídeo que descreve uma pessoa a fazer uma coisa concreta',
      // ⚠️ CURTO E CONCRETO. A versão comprida deste mesmo pedido (com ângulo de câmara,
      // luz de candeeiro e postura dos ombros) deu uma fotografia desfocada; esta dá a
      // ilustração. Menos instruções, mais imagem.
      pedido: 'a man sitting alone on a sofa looking down at his phone with worry',
    },
    {
      cena: 15,
      porque: 'a comparação que o guião faz em voz alta e que nenhuma figura do catálogo tem',
      pedido: 'jigsaw puzzle pieces scattered far apart on the floor of a room',
    },
  ],
};

/**
 * O FORNECEDOR GRÁTIS E SEM CHAVE. É o terceiro da lista do `image-router.js` do blog,
 * e para duas imagens de avaliação chega. ⚠️ Não se importa aquele ficheiro de propósito:
 * ele arrasta o `sharp`, a configuração do site e as pastas do blog, e é usado por 27
 * robôs que correm todos os dias. Uma chamada de dez linhas não justifica esse risco.
 */
async function gerar(pedido, destino) {
  /**
   * ⚠️ O ESTILO VAI À FRENTE DO PEDIDO, e isto foi corrigido a OLHAR o resultado.
   * Na 1ª tentativa o prompt era `pedido. estilo` e saíram duas imagens imprestáveis:
   * uma fotografia desfocada de uma pessoa num sofá (o modelo ignorou "vetor plano" e
   * a paleta) e uma forma azul abstrata que não tinha nada a ver com peças de puzzle.
   * Estes modelos pesam muito mais as primeiras palavras — pôr o traço primeiro é a
   * diferença entre pedir um estilo e sugeri-lo.
   */
  // ⚠️ O ASSUNTO PRIMEIRO. Ver o comentário do `ESTILO`: a ordem contrária deu duas
  // imagens IGUAIS para dois pedidos completamente diferentes.
  // ⚠️ E SEM `seed` fixa: com ela, o modelo devolvia literalmente a mesma imagem para
  // pedidos diferentes. Cada momento tem de ter o direito à sua própria imagem.
  const prompt = `${pedido}, ${ESTILO}`;
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`
    + `?width=1280&height=720&model=flux&nologo=true`
    + `&negative=${encodeURIComponent(NEGATIVO)}`;

  const resposta = await fetch(url, { headers: { 'User-Agent': 'FinMoovi/1.0' } });
  if (!resposta.ok) throw new Error(`o gerador respondeu ${resposta.status}`);
  const bytes = Buffer.from(await resposta.arrayBuffer());
  // ⚠️ Um "sucesso" de 2 KB é uma página de erro disfarçada de imagem. Já nos mordeu no
  // TTS (§ do áudio partido) e a cura é a mesma: conferir o TAMANHO, não o código.
  if (bytes.length < 20000) throw new Error(`veio uma imagem de ${bytes.length} bytes — é erro disfarçado`);
  writeFileSync(destino, bytes);
  return bytes.length;
}

// ─── execução direta ─────────────────────────────────────────────────────────

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('youtube/ilustracoes-longo.js')) {
  const slug = String(args.slug && args.slug !== true ? args.slug : 'sair-do-vermelho');
  const momentos = MOMENTOS[slug];
  if (!momentos) {
    console.log(`\n❌ não há momentos declarados para "${slug}".\n`);
    process.exit(1);
  }

  mkdirSync(DESTINO, { recursive: true });
  console.log(`\n🖼️  ILUSTRAÇÕES GERADAS — "${slug}"`);
  console.log(`   ${momentos.length} imagens · estilo ilustrado do canal · sem texto\n`);

  let feitas = 0;
  for (const [i, m] of momentos.entries()) {
    const nome = `${slug}-${i + 1}.jpg`;
    const destino = join(DESTINO, nome);
    if (existsSync(destino) && !args.refazer) {
      console.log(`   ♻️  ${nome} já existe — não se gera duas vezes (use --refazer)`);
      feitas += 1;
      continue;
    }
    process.stdout.write(`   ⏳ cena ${m.cena}: ${m.porque}… `);
    try {
      const bytes = await gerar(m.pedido, destino);
      console.log(`✓ ${Math.round(bytes / 1024)} KB`);
      feitas += 1;
    } catch (err) {
      console.log(`✗ ${err.message}`);
    }
  }

  console.log(`\n${feitas}/${momentos.length} em ${DESTINO}`);
  console.log('👉 OLHE PARA ELAS antes de as pôr no vídeo. Se o traço não servir, o');
  console.log('   caminho pago (kie.ai, ~R$ 1,30/vídeo) continua aberto.\n');
}
