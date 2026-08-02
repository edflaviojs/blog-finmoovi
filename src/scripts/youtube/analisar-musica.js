// Mede o CARÁCTER de uma faixa: tonalidade (maior/menor), andamento e brilho.
// Uso: node analisar-musica.mjs caminho.wav
import { readFileSync } from 'fs';

const ficheiro = process.argv[2];
const b = readFileSync(ficheiro);
// cabeçalho WAV: procurar o bloco "data"
let p = 12;
let taxa = 44100; let canais = 1; let bits = 16;
while (p < b.length - 8) {
  const id = b.toString('ascii', p, p + 4);
  const tam = b.readUInt32LE(p + 4);
  if (id === 'fmt ') { canais = b.readUInt16LE(p + 10); taxa = b.readUInt32LE(p + 12); bits = b.readUInt16LE(p + 22); }
  if (id === 'data') { p += 8; break; }
  p += 8 + tam + (tam % 2);
}
const passo = (bits / 8) * canais;
const n = Math.floor((b.length - p) / passo);
const x = new Float64Array(n);
for (let i = 0; i < n; i++) x[i] = b.readInt16LE(p + i * passo) / 32768;
console.log(`ficheiro: ${ficheiro.split(/[\\/]/).pop()}  ·  ${(n / taxa).toFixed(1)}s  ·  ${taxa} Hz`);

// ─── 1. CHROMA: quanta energia em cada uma das 12 notas ──────────────────────
const NOMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const chroma = new Float64Array(12);
const goertzel = (freq, ini, len) => {
  const w = 2 * Math.PI * freq / taxa;
  const c = 2 * Math.cos(w);
  let s1 = 0; let s2 = 0;
  for (let i = 0; i < len; i++) { const s = x[ini + i] + c * s1 - s2; s2 = s1; s1 = s; }
  return Math.sqrt(s1 * s1 + s2 * s2 - c * s1 * s2) / len;
};
const JANELA = Math.round(taxa * 0.35);
for (let ini = 0; ini + JANELA < n; ini += JANELA * 3) {
  for (let pc = 0; pc < 12; pc++) {
    for (let oct = 2; oct <= 6; oct++) {
      const f = 440 * Math.pow(2, (pc - 9) / 12 + (oct - 4));
      if (f > taxa / 2.2) continue;
      chroma[pc] += goertzel(f, ini, JANELA);
    }
  }
}
const maxc = Math.max(...chroma);
console.log('\nnotas mais presentes:');
[...chroma].map((v, i) => [NOMES[i], v / maxc]).sort((a, b2) => b2[1] - a[1]).slice(0, 6)
  .forEach(([nome, v]) => console.log(`   ${nome.padEnd(3)} ${'█'.repeat(Math.round(v * 30))} ${(v * 100).toFixed(0)}%`));

// ─── 2. MAIOR ou MENOR: correlação com os perfis clássicos (Krumhansl) ───────
const MAIOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MENOR = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
const corr = (a, b2) => {
  const ma = a.reduce((s, v) => s + v, 0) / 12; const mb = b2.reduce((s, v) => s + v, 0) / 12;
  let num = 0; let da = 0; let db = 0;
  for (let i = 0; i < 12; i++) { const u = a[i] - ma; const v = b2[i] - mb; num += u * v; da += u * u; db += v * v; }
  return num / Math.sqrt(da * db);
};
let melhor = { r: -2 };
for (let t = 0; t < 12; t++) {
  const rod = Array.from({ length: 12 }, (_, i) => chroma[(i + t) % 12]);
  const rM = corr(rod, MAIOR); const rm = corr(rod, MENOR);
  if (rM > melhor.r) melhor = { r: rM, tom: NOMES[t], modo: 'MAIOR' };
  if (rm > melhor.r) melhor = { r: rm, tom: NOMES[t], modo: 'menor' };
}
console.log(`\n🎼 tonalidade: ${melhor.tom} ${melhor.modo}   (confiança ${(melhor.r * 100).toFixed(0)}%)`);
console.log(`   → ${melhor.modo === 'MAIOR' ? 'ALEGRE / luminosa' : 'melancólica / triste'}`);

// ─── 3. ANDAMENTO: energia dos ataques ───────────────────────────────────────
const H = 512;
const env = [];
for (let i = 0; i + H < n; i += H) { let s = 0; for (let k = 0; k < H; k++) s += x[i + k] * x[i + k]; env.push(Math.sqrt(s / H)); }
const fluxo = env.map((v, i) => (i ? Math.max(0, v - env[i - 1]) : 0));
let bpmMelhor = 0; let scoreMelhor = 0;
for (let bpm = 55; bpm <= 160; bpm += 0.5) {
  const per = (60 / bpm) * taxa / H;
  let s = 0;
  for (let i = 0; i < fluxo.length; i++) { const j = Math.round(i + per); if (j < fluxo.length) s += fluxo[i] * fluxo[j]; }
  if (s > scoreMelhor) { scoreMelhor = s; bpmMelhor = bpm; }
}
console.log(`\n🥁 andamento: ~${bpmMelhor.toFixed(0)} batidas por minuto`);

// ─── 4. BRILHO: centro de gravidade do espectro ──────────────────────────────
let num = 0; let den = 0;
for (let f = 100; f < 6000; f *= 1.12) {
  let e = 0;
  for (let ini = 0; ini + JANELA < n; ini += JANELA * 5) e += goertzel(f, ini, JANELA);
  num += f * e; den += e;
}
const centro = num / den;
console.log(`✨ brilho (centro do espectro): ${centro.toFixed(0)} Hz  → ${centro > 900 ? 'CLARA/cristalina' : centro > 550 ? 'média' : 'escura/abafada'}`);
let soma = 0; for (let i = 0; i < n; i++) soma += x[i] * x[i];
console.log(`🔊 volume médio: ${Math.sqrt(soma / n).toFixed(3)}`);
