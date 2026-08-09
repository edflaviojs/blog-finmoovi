/**
 * O EMAIL DO GUARDA DO CANAL — 09/08/2026, IMPLEMENTACAO20 §64.
 *
 * ═══ POR QUE ISTO EXISTE ═══
 * O vídeo piloto deixou de estar agendado sozinho e o canal ficou sem vídeo ao domingo.
 * Hoje o guarda olha o canal INTEIRO — o longo, o Short de 50s e o de 16s.
 * O sinal existiu — o YouTube respondia "PÚBLICO" a quem lhe perguntasse — mas ficou
 * dentro do separador "Actions", que ninguém abre todos os dias.
 *
 * ⚠️ **É PELO MESMO CAMINHO DO RELATÓRIO DIÁRIO (Resend), de propósito.** É o único
 * canal desta casa que já se sabe que chega ao dono. Inventar um segundo caminho era
 * inventar um segundo sítio onde as coisas se perdem.
 *
 * ⚠️ **ELE NÃO PODE DERRUBAR O ROBÔ.** Se a chave do Resend faltar ou a rede falhar,
 * escreve-se o motivo e sai-se a verde: o passo seguinte já fica vermelho de propósito,
 * e perder o email é mau, mas perder também o alarme do GitHub por causa dele é pior.
 *
 * Lê tudo do ambiente: ALARMES (uma linha por alarme), DIGEST_TO, RESEND_API_KEY, CORRIDA.
 */

const CHAVE = process.env.RESEND_API_KEY;
const PARA = process.env.DIGEST_TO || 'finmoovi@gmail.com';
const DE = 'FinMoovi Blog <blog@email.finmoovi.com>';
const CORRIDA = process.env.CORRIDA || '';
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
    <p style="margin:0 0 4px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#8b949e;">FinMoovi · canal do YouTube</p>
    <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#f85149;">Há vídeo fora do combinado no canal</h1>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#c9d1d9;">
      Todos os dias eu pergunto ao YouTube se o próximo vídeo longo continua privado e com a
      estreia marcada. Hoje a resposta não bateu certo:
    </p>
    <div style="background:#161b22;border:1px solid #30363d;border-left:3px solid #f85149;border-radius:8px;padding:16px 18px;margin:0 0 24px;">
      ${alarmes.map((a) => `<p style="margin:0 0 10px;font-size:14px;line-height:1.55;color:#e6edf3;">${esc(a)}</p>`).join('')}
    </div>
    <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#8b949e;">
      Eu não mexi em nada. Republicar, remarcar ou mudar a privacidade são decisões suas —
      um robô que arruma sozinho o que não entende faz mais estrago do que conserto.
    </p>
    <p style="margin:0 0 28px;font-size:14px;line-height:1.6;color:#8b949e;">
      <strong style="color:#e6edf3;">O que conferir:</strong> abra o Studio, veja se o vídeo
      está como "Programado" para o domingo às 19h. Se estiver público antes da hora, a estreia
      combinada já não vai acontecer.
    </p>
    ${CORRIDA ? `<a href="${esc(CORRIDA)}" style="display:inline-block;padding:12px 28px;background:#238636;color:#fff;font-weight:600;font-size:14px;text-decoration:none;border-radius:8px;">Ver o registo completo</a>` : ''}
    <p style="margin:28px 0 0;font-size:12px;line-height:1.5;color:#6e7681;border-top:1px solid #21262d;padding-top:16px;">
      Este aviso existe porque em 09/08/2026 o canal ficou sem vídeo no domingo e ninguém deu por isso.
    </p>
  </div>
</body></html>`;

const texto = `Há vídeo fora do combinado no canal.\n\n${alarmes.map((a) => `· ${a}`).join('\n')}\n\n${CORRIDA}`;

try {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${CHAVE}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: DE, to: [PARA], subject: '🔴 FinMoovi — há vídeo fora do combinado no canal', html, text: texto,
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
