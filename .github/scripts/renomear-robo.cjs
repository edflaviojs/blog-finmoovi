// Uso: node .github/scripts/renomear-robo.cjs .github/workflows/a.yml ... (06/11/2026, nomes sem travessao)
// Troca o travessão SÓ na linha "name:" do topo de cada robô e confere o YAML.
const fs = require('fs');
const yaml = require(require.resolve('js-yaml', { paths: [process.cwd()] }));
let erro = 0;
for (const f of process.argv.slice(2)) {
  const antes = fs.readFileSync(f, 'utf8');
  const nomeAntes = yaml.load(antes).name;
  const depois = antes.replace(/^(name:[^\n]*?) [\u2013\u2014] /m, '$1 · ');
  const y = yaml.load(depois); // lança se partir
  const linhasMudadas = antes.split('\n').filter((l, i) => l !== depois.split('\n')[i]).length;
  if (linhasMudadas !== 1 || !y.name || /[\u2013\u2014]/.test(y.name) || !y.on && !y[true] || !y.jobs) { console.log('❌', f, linhasMudadas); erro = 1; continue; }
  fs.writeFileSync(f, depois);
  console.log('✅', f.split('/').pop(), '|', nomeAntes, '=>', y.name);
}
process.exit(erro);
