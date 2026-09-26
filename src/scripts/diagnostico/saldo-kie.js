/**
 * saldo-kie.js — "quanto resta na conta que PAGA os roteiros?"
 *
 * Por que existe (26/09/2026): o escritor pago (`kie/gpt-5-2`) parou de
 * entregar a 18/09 e **ninguém soube durante 9 dias**. Não houve erro nenhum:
 * ele devolve "resposta vazia", a fila cai nos gratuitos, e a corrida segue —
 * só que o roteiro passa a ser escrito por quem escreve pior. As reprovações
 * do robô dos Shorts saltaram de zero para 93%.
 *
 * A causa era saldo a zero. E **este projeto gastava dinheiro sem nunca olhar
 * para o saldo**: varrido o repositório, não havia uma única chamada à conta.
 * Família de [[backup-do-app-perdia-o-cartao]] — a avaria silenciosa dura o
 * tempo que se levar a ir ver.
 *
 * Não escreve nada, não publica nada: só pergunta e conta.
 *
 * Uso:  node src/scripts/diagnostico/saldo-kie.js
 * Sai 0 se conseguiu ler o saldo; 1 se não conseguiu (ou se não há chave).
 */

const CHAVE = process.env.KIE_AI_KEY;

/**
 * As portas candidatas, por ordem.
 *
 * ⚠️ NÃO INVENTAR A PORTA. A primeira está registada como a certa desde
 * 02/08/2026; as outras são tentativas honestas para o caso de eles a terem
 * mudado — o que já aconteceu com metade dos fornecedores desta casa. Cada uma
 * diz o que respondeu, para o registo servir de prova e não de palpite.
 */
const PORTAS = [
  'https://api.kie.ai/api/v1/chat/credit',
  'https://api.kie.ai/api/v1/common/credit',
  'https://api.kie.ai/api/v1/credit',
];

/** 1 crédito = US$ 0,005 — medido em 02/08/2026 contra a fatura real, ao cêntimo. */
const DOLAR_POR_CREDITO = 0.005;

/**
 * O saldo pode vir em sítios diferentes do corpo conforme a versão da API.
 * Procura o primeiro número plausível em vez de exigir um formato exacto —
 * um saldo lido é melhor que um erro de formato.
 */
function extrairSaldo(corpo) {
  if (corpo == null) return null;
  if (typeof corpo === 'number' && Number.isFinite(corpo)) return corpo;
  if (typeof corpo !== 'object') return null;
  for (const campo of ['credits', 'credit', 'balance', 'remaining', 'amount']) {
    const v = corpo[campo];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
  }
  for (const campo of ['data', 'result', 'response']) {
    const achado = extrairSaldo(corpo[campo]);
    if (achado !== null) return achado;
  }
  return null;
}

async function main() {
  console.log('💰 Saldo da conta que paga os roteiros (kie.ai)\n');

  if (!CHAVE) {
    // ⚠️ A chave certa é KIE_AI_KEY. A KIE_API_KEY existe em ~25 workflows e
    // aponta para o GROQ — usá-la aqui mandaria a chave do Groq à porta errada.
    console.log('❌ Não há KIE_AI_KEY neste ambiente — nada a medir.');
    console.log('   (Atenção: KIE_API_KEY é OUTRA coisa; essa é do Groq.)');
    process.exit(1);
  }

  for (const porta of PORTAS) {
    let r, texto;
    try {
      r = await fetch(porta, {
        method: 'GET',
        headers: { Authorization: `Bearer ${CHAVE}`, 'Content-Type': 'application/json' },
      });
      texto = await r.text();
    } catch (err) {
      console.log(`   ✗ ${porta} — erro de rede (${err.message})`);
      continue;
    }

    if (!r.ok) {
      console.log(`   ✗ ${porta} — HTTP ${r.status}: ${texto.slice(0, 120)}`);
      continue;
    }

    let corpo;
    try { corpo = JSON.parse(texto); } catch { corpo = texto; }
    const saldo = extrairSaldo(corpo);

    if (saldo === null) {
      // Respondeu 200 mas não se achou número: mostrar o corpo CRU, porque é
      // isso que permite corrigir o leitor da próxima vez.
      console.log(`   ⚠️ ${porta} — respondeu 200 mas não achei o saldo no corpo:`);
      console.log(`      ${texto.slice(0, 300)}`);
      continue;
    }

    const dolares = saldo * DOLAR_POR_CREDITO;
    console.log(`✅ porta: ${porta}`);
    console.log(`\n   SALDO: ${saldo} créditos  ≈  US$ ${dolares.toFixed(2)}`);
    console.log(`   (1 crédito = US$ ${DOLAR_POR_CREDITO} — medido contra a fatura real em 02/08/2026)`);

    // A régua que interessa ao dono não é o número: é "dá para quantos dias?".
    // Um vídeo curto custa ~3,4 créditos (escritor + leitor + repetições),
    // medido em 02/08. São 3 vídeos por dia (16s de manhã, 16s à noite, 50s).
    const porVideo = 3.4;
    const videosPorDia = 3;
    const dias = saldo / (porVideo * videosPorDia);
    console.log(`\n   Ao ritmo de ${videosPorDia} vídeos/dia a ~${porVideo} créditos cada,`);
    console.log(`   isto dá para ~${dias.toFixed(1)} dia(s).`);
    if (saldo <= 0) {
      console.log('\n🔴 SALDO A ZERO. É por isto que o escritor devolve "resposta vazia"');
      console.log('   e os roteiros caem nos fornecedores gratuitos, que escrevem pior.');
    } else if (dias < 3) {
      console.log('\n⚠️ Menos de 3 dias de folga — carregar antes que caia em silêncio.');
    }
    process.exit(0);
  }

  console.log('\n❌ Nenhuma das portas conhecidas devolveu o saldo.');
  console.log('   As respostas de cada uma estão acima — é por aí que se corrige.');
  process.exit(1);
}

main();
