/**
 * APAGAR UM VÍDEO LONGO JÁ AGENDADO, PARA SUBIR DE NOVO — 20/10/2026, pedido do Ed
 * (*"pode mudar"*), depois de ouvir falas por cima de falas no longo de 25/10.
 *
 *   node src/scripts/youtube/apagar-longo.js --slug=<slug> --video=<videoId>
 *
 * O YouTube não deixa trocar o ficheiro de um vídeo: apaga-se e sobe-se outro.
 * Isto apaga o vídeo e devolve a linha do caderno a RESERVA (o mesmo domingo e a mesma
 * hora), para a próxima corrida do vídeo longo o subir como se fosse a primeira vez.
 *
 * ⚠️ O `--video` é obrigatório e tem de ser IGUAL ao do caderno — a guarda contra
 * apagar o vídeo errado. Só apaga vídeo PRIVADO (agendado): um que já foi ao ar, nunca.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { getAccessToken } from './upload-short.js';

const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1];
const slug = arg('slug'), video = arg('video');
if (!slug || !video) { console.error('uso: apagar-longo.js --slug=<slug> --video=<videoId>'); process.exit(2); }

const CADERNO = '.github/data/youtube-longos-published.json';
const FILA = '.github/data/youtube-longos.json';
const caderno = JSON.parse(readFileSync(CADERNO, 'utf-8'));
const linha = caderno[slug];
if (!linha?.videoId) { console.error(`❌ "${slug}" não tem vídeo no caderno.`); process.exit(1); }
if (linha.videoId !== video) { console.error(`❌ o caderno diz ${linha.videoId}, não ${video}. Nada apagado.`); process.exit(1); }

const chave = await getAccessToken();
const API = 'https://www.googleapis.com/youtube/v3/videos';
const ver = await fetch(`${API}?part=status&id=${video}`, { headers: { Authorization: `Bearer ${chave}` } });
if (!ver.ok) { console.error(`❌ o YouTube não respondeu (${ver.status}) — nada apagado, caderno intacto.`); process.exit(1); }
const item = (await ver.json()).items?.[0];
if (item && item.status?.privacyStatus !== 'private') {
  console.error(`❌ ${video} está "${item.status?.privacyStatus}" — só se apaga vídeo ainda privado. Nada apagado.`);
  process.exit(1);
}
if (item) {
  const r = await fetch(`${API}?id=${video}`, { method: 'DELETE', headers: { Authorization: `Bearer ${chave}` } });
  if (r.status !== 204) { console.error(`❌ o YouTube recusou apagar (${r.status}): ${(await r.text()).slice(0, 300)}`); process.exit(1); }
  console.log(`🗑️  apagado do YouTube: ${video}`);
} else console.log(`ℹ️  ${video} já não existia no YouTube.`);

caderno[slug] = { estado: 'reservado', publishAt: linha.publishAt, reservadoEm: new Date().toISOString(), apagadoAntes: video };
writeFileSync(CADERNO, `${JSON.stringify(caderno, null, 2)}\n`, 'utf-8');
const fila = JSON.parse(readFileSync(FILA, 'utf-8'));
const lista = Array.isArray(fila) ? fila : fila.videos || [];
for (const t of lista) if (t.slug === slug && t.videoId === video) { delete t.videoId; delete t.publicadoEm; }
writeFileSync(FILA, `${JSON.stringify(fila, null, 2)}\n`, 'utf-8');
console.log(`📌 "${slug}" voltou a reserva para ${linha.publishAt} — a próxima corrida sobe o vídeo novo.`);
