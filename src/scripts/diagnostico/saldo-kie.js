/**
 * saldo-kie.js — "quanto resta na conta que PAGA os roteiros?"
 *
 * Por que existe (26/09/2026): o escritor pago (`kie/gpt-5-2`) parou de
 * entregar a 18/09 e **ninguém soube durante 9 dias**. Não houve erro nenhum:
 * ele devolve "resposta vazia", a fila cai nos gratuitos, e a corrida segue —
 * só que o roteiro passa a ser escrito por quem escreve pior. As reprovações
 * do robô dos Shorts saltaram de zero para 93%.
 *
 * A causa era saldo a zero (medido: **-0,54 créditos**). E **este projeto
 * gastava dinheiro sem nunca olhar para o saldo**: varrido o repositório, não
 * havia uma única chamada à conta. Família de [[backup-do-app-perdia-o-cartao]]
 * — a avaria silenciosa dura o tempo que se levar a ir ver.
 *
 * Não escreve nada, não publica nada: só pergunta e conta.
 *
 * Serve dois donos, e por isso exporta `lerSaldoKie()`:
 *   · o `diagnostico-ia.yml`, à mão, quando se quer saber já;
 *   · o `relatorio-gastos.js`, todos os dias, para o saldo entrar no e-mail
 *     das 7h — que é o único sítio onde o dono ia olhar sem ter de lembrar-se.
 *
 * Uso à mão:  node src/scripts/diagnostico/saldo-kie.js
 * Sai 0 se conseguiu ler o saldo; 1 se não conseguiu (ou se não há chave).
 */

/**
 * As portas candidatas, por ordem.
 *
 * ⚠️ NÃO INVENTAR A PORTA. A primeira está registada como a certa desde
 * 02/08/2026 e foi reconfirmada a 26/09; as outras são tentativas honestas para
 * o caso de eles a mudarem — o que já aconteceu com metade dos fornecedores
 * desta casa. Cada uma diz o que respondeu, para o registo servir de prova e
 * não de palpite.
 */
const PORTAS = [
  'https://api.kie.ai/api/v1/chat/credit',
  'https://api.kie.ai/api/v1/common/credit',
  'https://api.kie.ai/api/v1/credit',
];

/** 1 crédito = US$ 0,005 — medido em 02/08/2026 contra a fatura real, ao cêntimo. */
export const DOLAR_POR_CREDITO = 0.005;

/**
 * O ritmo real da casa, para traduzir o saldo em DIAS.
 * ~3,4 créditos por vídeo (escritor + leitor + repetições), medido em 02/08.
 * 3 vídeos por dia: 16s de manhã, 16s à noite, e o de 50s.
 */
export const CREDITOS_POR_VIDEO = 3.4;
export const VIDEOS_POR_DIA = 3;

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

/**
 * Pergunta o saldo à conta.
 *
 * ⚠️ NUNCA LANÇA. Quem o chama é, entre outros, o relatório diário — e um
 * e-mail que deixa de sair por causa de uma consulta de saldo é uma avaria
 * pior do que a que se queria evitar.
 *
 * @returns {Promise<{ok: boolean, saldo?: number, dolares?: number,
 *   dias?: number, porta?: string, motivo?: string, tentativas?: string[]}>}
 */
export async function lerSaldoKie(chave = process.env.KIE_AI_KEY) {
  // ⚠️ A chave certa é KIE_AI_KEY. A KIE_API_KEY existe em ~25 workflows e
  // aponta para o GROQ — usá-la aqui mandaria a chave do Groq à porta errada.
  if (!chave) return { ok: false, motivo: 'sem KIE_AI_KEY no ambiente' };

  const tentativas = [];
  for (const porta of PORTAS) {
    let r, texto;
    try {
      r = await fetch(porta, {
        method: 'GET',
        headers: { Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json' },
      });
      texto = await r.text();
    } catch (err) {
      tentativas.push(`${porta} — erro de rede (${err.message})`);
      continue;
    }
    if (!r.ok) {
      tentativas.push(`${porta} — HTTP ${r.status}: ${texto.slice(0, 120)}`);
      continue;
    }
    let corpo;
    try { corpo = JSON.parse(texto); } catch { corpo = texto; }
    const saldo = extrairSaldo(corpo);
    if (saldo === null) {
      // Respondeu 200 mas não se achou número: guardar o corpo CRU, porque é
      // isso que permite corrigir o leitor da próxima vez.
      tentativas.push(`${porta} — 200 sem saldo reconhecível: ${texto.slice(0, 200)}`);
      continue;
    }
    return {
      ok: true,
      saldo,
      dolares: saldo * DOLAR_POR_CREDITO,
      dias: saldo / (CREDITOS_POR_VIDEO * VIDEOS_POR_DIA),
      porta,
      tentativas,
    };
  }
  return { ok: false, motivo: 'nenhuma porta conhecida devolveu o saldo', tentativas };
}

/**
 * Uma linha de texto pronta a entrar num relatório.
 * **Não diz só o número: diz para quantos DIAS dá.** Saldo é um número;
 * "três dias" é uma decisão.
 */
export function linhaDoSaldo(s) {
  if (!s || !s.ok) return `💳 Saldo kie.ai: não foi possível ler (${s?.motivo || 'motivo desconhecido'}).`;
  const base = `💳 Saldo kie.ai: ${s.saldo.toFixed(2)} créditos (US$ ${s.dolares.toFixed(2)}) — dá para ~${s.dias.toFixed(1)} dia(s)`;
  if (s.saldo <= 0) return `${base}\n   🔴 A ZERO: o escritor devolve "resposta vazia" e os roteiros caem nos gratuitos, que escrevem pior.`;
  if (s.dias < 3) return `${base}\n   ⚠️ Menos de 3 dias de folga — carregar antes que caia em silêncio.`;
  return base;
}

async function main() {
  console.log('💰 Saldo da conta que paga os roteiros (kie.ai)\n');
  const s = await lerSaldoKie();
  for (const t of s.tentativas || []) console.log(`   ✗ ${t}`);
  if (s.ok) {
    console.log(`✅ porta: ${s.porta}\n`);
    console.log(`   ${linhaDoSaldo(s)}`);
    console.log(`\n   (1 crédito = US$ ${DOLAR_POR_CREDITO}, medido contra a fatura real em 02/08/2026;`);
    console.log(`    ritmo de ${VIDEOS_POR_DIA} vídeos/dia a ~${CREDITOS_POR_VIDEO} créditos cada.)`);
    process.exit(0);
  }
  console.log(`\n❌ ${s.motivo}.`);
  if (s.tentativas?.length) console.log('   As respostas de cada porta estão acima — é por aí que se corrige.');
  process.exit(1);
}

// Só corre quando é este o ficheiro lançado — o relatório diário importa-o.
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('saldo-kie.js')) {
  main().catch((e) => { console.error(`💥 ${e.message}`); process.exit(1); });
}
