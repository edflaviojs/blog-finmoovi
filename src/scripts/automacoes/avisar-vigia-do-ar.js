/**
 * AVISAR VIGIA DO AR — o alarme que CHEGA.
 *
 * PORQUE EXISTE (14/09/2026):
 * O "Vigia do ar" esteve vermelho CINCO NOITES SEGUIDAS (09 a 13/09). Era a
 * unica corrida vermelha de cada um desses dias, e o relatorio diario ate a
 * registou pelo nome. Mesmo assim o blog passou cinco dias sem publicar e
 * ninguem agiu: nove posts PT mais as versoes EN/ES ficaram escritos no repo e
 * nunca chegaram ao ar.
 *
 * A licao NAO e "falta um alarme". O alarme existia, mediu certo e tocou cinco
 * vezes. O que falhou foi a ENTREGA: ficar vermelho e contar com o e-mail
 * automatico do GitHub nao chega quando ha dezenas de robos a mandar e-mail
 * todos os dias. Um aviso que se dilui e um aviso que nao existe.
 *
 * Este script manda um e-mail proprio, com assunto que nao se confunde com
 * nada, a dizer o que esta fora do ar e onde olhar. Corre SO quando o vigia
 * falha (`if: failure()` no workflow).
 *
 * FAIL-LOUD de proposito: se o laudo nao existir — porque o job rebentou antes
 * de o vigia correr — manda e-mail na mesma, a dizer que nao conseguiu medir.
 * Silencio e exatamente o defeito que este script veio consertar.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { config } from '../../../site.config.ts';

const RELATORIO = process.env.VIGIA_RELATORIO || join(process.cwd(), '.vigia-do-ar.json');
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const PARA = process.env.DIGEST_TO || 'finmoovi@gmail.com';
const REPO = process.env.GITHUB_REPOSITORY || 'edflaviojs/blog-finmoovi';
const RUN_ID = process.env.GITHUB_RUN_ID || '';
const LINK_CORRIDA = RUN_ID ? `https://github.com/${REPO}/actions/runs/${RUN_ID}` : `https://github.com/${REPO}/actions`;

/**
 * O laudo do vigia, ou null se nao existir/nao der para ler.
 *
 * Tira o BOM antes de interpretar: um ficheiro gravado por outra ferramenta
 * (PowerShell, por exemplo) comeca por um caracter invisivel que rebenta o
 * JSON.parse. Sem isto, o aviso dizia "nao consegui medir" com o laudo ao lado,
 * bem gravado — e um aviso que descreve o problema errado e quase tao mau como
 * nao haver aviso.
 *
 * Nao lanca: o e-mail tem de sair de qualquer maneira. Mas diz alto no registo
 * da corrida porque e que ficou sem laudo.
 */
function lerLaudo() {
  try {
    if (!existsSync(RELATORIO)) {
      console.error(`⚠️ Sem laudo em ${RELATORIO} — o vigia nao chegou a escrever.`);
      return null;
    }
    // ﻿ escrito como codigo, nao colado: um BOM literal no ficheiro fonte e
    // invisivel no editor e nao sobrevive a uma copia — foi assim que este
    // conserto falhou a primeira tentativa.
    return JSON.parse(readFileSync(RELATORIO, 'utf-8').replace(/^\uFEFF/, ''));
  } catch (e) {
    console.error(`⚠️ Laudo ilegivel (${e.message}) — aviso segue sem a lista.`);
    return null;
  }
}

function escapar(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Assunto e corpo. Sempre devolve algo: nao saber tambem e noticia. */
function montarEmail(laudo) {
  const rodape = `
      <p style="color:#8b949e;font-size:13px;line-height:1.6;margin:24px 0 0;">
        <strong style="color:#f0f6fc;">Onde olhar, por esta ordem:</strong><br>
        1. O build do blog (<code style="color:#79c0ff;">npm run build</code>) — se estiver vermelho, o Cloudflare nao publica nada.<br>
        2. O ultimo deploy no Cloudflare Pages.<br>
        3. A corrida deste vigia: <a href="${LINK_CORRIDA}" style="color:#58a6ff;">ver o registo completo</a>
      </p>
      <p style="color:#484f58;font-size:11px;margin:24px 0 0;">
        Em 09/09/2026 este vigia ficou vermelho cinco noites seguidas e ninguem viu. Este e-mail existe por causa disso.
      </p>`;

  if (!laudo) {
    return {
      subject: '🚨 BLOG: o vigia do ar nao conseguiu medir',
      corpo: `
      <p style="color:#f0f6fc;font-size:15px;line-height:1.6;margin:0 0 16px;">
        A corrida do vigia falhou <strong>antes</strong> de conseguir comparar o site com o repositorio,
        entao nao ha laudo. Nao saber se o blog esta a publicar e tao grave como saber que nao esta.
      </p>${rodape}`,
    };
  }

  // Ensaio pedido a mao: o alarme esta a ser TESTADO, nao disparado. Assunto
  // inconfundivel — um e-mail de treino que pareca avaria e pior do que nenhum.
  if (laudo.ensaio) {
    return {
      subject: '🧪 ENSAIO do alarme do blog — esta tudo bem',
      corpo: `
      <p style="color:#f0f6fc;font-size:15px;line-height:1.6;margin:0 0 16px;">
        Este e-mail e um <strong>teste pedido a mao</strong>. Nao ha nada partido:
        o vigia mediu ${escapar(laudo.analisados || 0)} ficheiros e <strong>nenhum</strong> esta fora do ar.
      </p>
      <p style="color:#8b949e;font-size:14px;line-height:1.6;margin:0 0 8px;">
        Se recebeu isto, o caminho do aviso funciona: no dia em que o blog parar de publicar a serio,
        chega um e-mail igual a este, com o assunto <strong style="color:#f85149;">BLOG PAROU DE PUBLICAR</strong>
        e a lista do que ficou por sair.
      </p>${rodape}`,
    };
  }

  if (laudo.estado === 'sem-sitemap') {
    return {
      subject: '🚨 BLOG: o site nao respondeu ao vigia',
      corpo: `
      <p style="color:#f0f6fc;font-size:15px;line-height:1.6;margin:0 0 16px;">
        O vigia nao conseguiu ler o mapa do site em <strong>${escapar(laudo.site || '')}</strong>.
        O blog pode estar fora do ar.
      </p>
      <p style="color:#8b949e;font-size:13px;margin:0;">Motivo tecnico: ${escapar(laudo.motivo || 'desconhecido')}</p>${rodape}`,
    };
  }

  if (laudo.estado === 'nao-mediu') {
    return {
      subject: '🚨 BLOG: o vigia correu sem analisar nada',
      corpo: `
      <p style="color:#f0f6fc;font-size:15px;line-height:1.6;margin:0 0 16px;">
        O vigia nao analisou ficheiro nenhum, o que significa que nao mediu de verdade.
        Um vigia que nao ve nada e um vigia desligado.
      </p>${rodape}`,
    };
  }

  const emFalta = Array.isArray(laudo.emFalta) ? laudo.emFalta : [];
  const mostrar = emFalta.slice(0, 25);
  const linhas = mostrar.map(e => `
        <tr>
          <td style="padding:6px 10px;border-bottom:1px solid #21262d;color:#f0f6fc;font-size:13px;">${escapar(e.rel || e)}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #21262d;color:#8b949e;font-size:12px;">${escapar(e.motivo || '')}</td>
        </tr>`).join('');

  return {
    subject: `🚨 BLOG PAROU DE PUBLICAR — ${emFalta.length} ficheiro(s) fora do ar`,
    corpo: `
      <p style="color:#f0f6fc;font-size:15px;line-height:1.6;margin:0 0 16px;">
        Ha <strong>${emFalta.length}</strong> ficheiro(s) escritos no repositorio que <strong>nao estao no site</strong>.
        Foi assim que o blog ficou 3 dias parado em 22/08 e 5 dias em 09/09.
      </p>
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;margin:0 0 8px;">${linhas}</table>
      </div>
      ${emFalta.length > mostrar.length ? `<p style="color:#8b949e;font-size:12px;margin:0;">… e mais ${emFalta.length - mostrar.length}. A lista completa esta no registo da corrida.</p>` : ''}
      ${rodape}`,
  };
}

async function main() {
  const laudo = lerLaudo();
  const { subject, corpo } = montarEmail(laudo);

  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0d1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:640px;margin:0 auto;padding:40px 20px;">
    <div style="background:#161b22;border:1px solid #f85149;border-radius:12px;padding:32px;">
      <h1 style="color:#f85149;font-size:20px;margin:0 0 20px;">${escapar(subject)}</h1>
      ${corpo}
    </div>
  </div>
</body></html>`;

  // Sem chave nao ha e-mail: diz alto e deixa o job vermelho na mesma.
  if (!RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY em falta — o aviso do vigia NAO foi enviado.');
    console.error(`   Assunto que se perdeu: ${subject}`);
    process.exit(1);
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: config.email.from, to: [PARA], subject, html }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    console.error(`❌ Resend ${res.status}: ${txt}`);
    process.exit(1);
  }

  console.log(`📧 Aviso enviado para ${PARA}: ${subject}`);
}

main().catch((e) => {
  console.error(`❌ Falhei a avisar: ${e.message}`);
  process.exit(1);
});
