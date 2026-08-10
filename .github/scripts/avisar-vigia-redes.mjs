/**
 * O EMAIL DO VIGIA DAS REDES — 10/08/2026, IMPLEMENTACAO26 §14.
 *
 * ═══ POR QUE ISTO EXISTE ═══
 * O Reel do Instagram falhou três dias seguidos (08, 09 e 10/08) e ninguém soube. O sinal
 * existia — o servidor guardava a frase *"This account doesn't support Trial Reels"* — mas
 * estava dentro do Multipost, que ninguém abre todos os dias, e a corrida do GitHub tinha
 * acabado a **verde** sete horas antes de a publicação sequer ser tentada.
 *
 * ⚠️ **PELO MESMO CAMINHO DO GUARDA DO CANAL (Resend), de propósito.** É o único canal
 * desta casa que já se sabe que chega ao dono. Inventar um segundo caminho era inventar um
 * segundo sítio onde as coisas se perdem.
 *
 * ⚠️ **ELE NÃO PODE DERRUBAR O ROBÔ.** Se a chave do Resend faltar ou a rede falhar,
 * escreve-se o motivo e sai-se a verde: o passo seguinte já fica vermelho de propósito, e
 * perder o email é mau, mas perder também o alarme do GitHub por causa dele é pior.
 *
 * Lê tudo do ambiente: ALARMES (uma linha por alarme), DIGEST_TO, RESEND_API_KEY, CORRIDA.
 */

const CHAVE = process.env.RESEND_API_KEY;
const PARA = process.env.DIGEST_TO || 'finmoovi@gmail.com';
const DE = 'FinMoovi Blog <blog@email.finmoovi.com>';
const CORRIDA = process.env.CORRIDA || '';
const PAINEL = 'https://multipost.help4desk.com';
const alarmes = String(process.env.ALARMES || '').split('\n').map((l) => l.trim()).filter(Boolean);

if (!alarmes.length) {
  console.log('sem alarmes para contar — nada a enviar.');
  process.exit(0);
}
if (!CHAVE) {
  console.log('⚠️ não há RESEND_API_KEY — o email não sai. O alarme vai pelo vermelho da corrida.');
  process.exit(0);
}

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#0d1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 24px;color:#e6edf3;">
    <p style="margin:0 0 4px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#8b949e;">FinMoovi · redes sociais</p>
    <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#f85149;">${alarmes.length === 1 ? 'Uma publicação não saiu' : `${alarmes.length} publicações não saíram`}</h1>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#c9d1d9;">
      Todos os dias eu pergunto ao Multipost, post a post, se o vídeo do dia foi mesmo publicado
      em cada rede. Estas não foram:
    </p>
    <div style="background:#161b22;border:1px solid #30363d;border-left:3px solid #f85149;border-radius:8px;padding:16px 18px;margin:0 0 24px;">
      ${alarmes.map((a) => `<p style="margin:0 0 10px;font-size:14px;line-height:1.55;color:#e6edf3;">${esc(a)}</p>`).join('')}
    </div>
    <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#8b949e;">
      Eu não mexi em nada. Reagendar ou apagar são decisões suas — um robô que arruma sozinho
      o que não entende faz mais estrago do que conserto.
    </p>
    <p style="margin:0 0 28px;font-size:14px;line-height:1.6;color:#8b949e;">
      <strong style="color:#e6edf3;">Onde olhar:</strong> a frase acima já é o motivo real, lido
      do servidor. O painel do Multipost mostra só <em>"An error occurred while publishing this
      post"</em>, que não diz nada — não vale a pena procurar a explicação por lá.
    </p>
    ${CORRIDA ? `<a href="${esc(CORRIDA)}" style="display:inline-block;padding:12px 28px;background:#238636;color:#fff;font-weight:600;font-size:14px;text-decoration:none;border-radius:8px;">Ver o registo completo</a>` : ''}
    <a href="${PAINEL}" style="display:inline-block;padding:12px 28px;margin-left:8px;background:#21262d;color:#c9d1d9;font-weight:600;font-size:14px;text-decoration:none;border-radius:8px;border:1px solid #30363d;">Abrir o Multipost</a>
    <p style="margin:28px 0 0;font-size:12px;line-height:1.5;color:#6e7681;border-top:1px solid #21262d;padding-top:16px;">
      Este aviso existe porque de 08 a 10/08/2026 o Reel do Instagram falhou três dias seguidos
      e ninguém deu por isso: a entrega corre ao meio-dia e acaba verde, e a publicação só é
      tentada às 19h.
    </p>
  </div>
</body></html>`;

const texto = `${alarmes.length} publicação(ões) não saíram nas redes.\n\n${alarmes.map((a) => `· ${a}`).join('\n')}\n\n${CORRIDA}`;

try {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${CHAVE}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: DE, to: [PARA], subject: '🔴 FinMoovi — publicação não saiu nas redes', html, text: texto,
    }),
  });
  if (!res.ok) {
    console.log(`⚠️ o Resend recusou (${res.status}): ${String(await res.text()).slice(0, 300)}`);
    process.exit(0);
  }
  console.log(`✅ aviso enviado para ${PARA} — ${alarmes.length} alarme(s).`);
} catch (err) {
  console.log(`⚠️ não deu para enviar o email (${err.message}). O alarme vai pelo vermelho da corrida.`);
}
