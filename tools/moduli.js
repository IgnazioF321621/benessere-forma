// Moduli condivisi fra app e Worker: la fonte è shared/*.js, UNA sola.
// Dal 2 ottobre 2026 (Fondamenta 035, tappa 2) l'app non ne tiene più una copia incollata:
// la pagina li carica direttamente con <script src="shared/…">, prima del proprio codice.
// Il Worker li importa (worker/src → ../../shared). Non c'è più niente da copiare.
//
//   node tools/moduli.js   (anche con --verifica, come lo chiama il pre-commit hook)
// controlla che la pagina carichi tutti i moduli, una volta sola, prima del codice dell'app,
// e che non ci sia rimasta dentro una copia. Esce con 1 se qualcosa non torna.
const fs = require('fs'), path = require('path');
const REPO = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(REPO, 'zona-tracker.html'), 'utf8');
const MODULI = fs.readdirSync(path.join(REPO, 'shared')).filter(f => f.endsWith('.js')).sort().map(f => 'shared/' + f);
// Il codice dell'app comincia al primo <script> senza src dopo i richiami.
const inizioApp = html.search(/<script>\s*\n\/\/ ═+\s*\n\/\/ CONFIG/);
let ko = 0;
const errore = (t) => { console.error('✗ ' + t); ko++; };
if(inizioApp === -1) errore('non trovo l\'inizio del codice dell\'app in zona-tracker.html');
for(const m of MODULI){
  const richiami = [...html.matchAll(new RegExp('<script src="' + m.replace('.', '\\.') + '(?:\\?v=[^"]*)?"></script>', 'g'))];
  if(richiami.length !== 1){ errore(`${m}: richiamato ${richiami.length} volte dalla pagina (deve essere 1)`); continue; }
  if(richiami[0].index > inizioApp){ errore(`${m}: richiamato dopo il codice dell'app`); continue; }
  const nome = (fs.readFileSync(path.join(REPO, m), 'utf8').match(/^(?:var|const) (ZT\w+) = /m) || [])[1];
  if(!nome){ errore(`${m}: non dichiara «var ZT… =» in cima, la pagina non lo vedrebbe`); continue; }
  if(new RegExp('^(?:var|const) ' + nome + ' = ', 'm').test(html)){ errore(`${m}: ${nome} è dichiarato anche dentro zona-tracker.html (copia rimasta)`); continue; }
  console.log(`✓ ${m} → ${nome}`);
}
if(/⟦MODULO /.test(html)) errore('in zona-tracker.html c\'è ancora un blocco ⟦MODULO …⟧ incollato');
process.exit(ko ? 1 : 0);
