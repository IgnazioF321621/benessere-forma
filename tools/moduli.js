// Moduli condivisi fra app e Worker: la fonte è shared/*.js, l'app ne tiene una copia
// incollata dentro zona-tracker.html fra due marcatori (l'app resta un file solo).
//   node tools/moduli.js            riscrive le copie nell'app
//   node tools/moduli.js --verifica esce con 1 se una copia non coincide (pre-commit hook)
// Il Worker invece li importa direttamente (worker/src → ../../shared).
const fs = require('fs'), path = require('path');
const REPO = path.join(__dirname, '..');
const APP = path.join(REPO, 'zona-tracker.html');
const MODULI = ['shared/nutrizione.js', 'shared/quadro.js', 'shared/coach_rules.js'];
const inizio = (m) => `// ⟦MODULO ${m} — copia generata da tools/moduli.js: si modifica ${m}, non qui⟧`;
const fine = (m) => `// ⟦FINE ${m}⟧`;
const verifica = process.argv.includes('--verifica');
let html = fs.readFileSync(APP, 'utf8');
let diversi = 0, scritti = 0;
for(const m of MODULI){
  const src = path.join(REPO, m);
  if(!fs.existsSync(src)) continue;
  const a = html.indexOf(inizio(m)), b = html.indexOf(fine(m));
  if(a === -1 || b === -1 || b < a){
    console.error(`✗ ${m}: marcatori assenti in zona-tracker.html`);
    diversi++;
    continue;
  }
  const codice = fs.readFileSync(src, 'utf8').replace(/\s+$/, '');
  const blocco = inizio(m) + '\n' + codice + '\n' + fine(m);
  const attuale = html.slice(a, b + fine(m).length);
  if(attuale === blocco){ console.log(`✓ ${m}`); continue; }
  diversi++;
  if(verifica){ console.error(`✗ ${m}: la copia in zona-tracker.html non coincide — lancia node tools/moduli.js`); continue; }
  html = html.slice(0, a) + blocco + html.slice(b + fine(m).length);
  scritti++;
  console.log(`↻ ${m} copiato nell'app`);
}
if(!verifica && scritti) fs.writeFileSync(APP, html);
process.exit(verifica && diversi ? 1 : 0);
