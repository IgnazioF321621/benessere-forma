// La pagina dell'app è divisa in più file (Fondamenta 035): zona-tracker.html più i file in app/.
// Il banco gira senza rete e senza server, quindi qui la pagina si RICOMPONE: ogni file locale
// richiamato dalla pagina viene rimesso dentro, nello stesso punto e nello stesso ordine.
// Un file richiamato che non esiste ferma tutto: mai una pagina a metà scambiata per buona.
const fs = require('fs'), path = require('path');
const REPO = path.join(__dirname, '..', '..');
const RE_STILE = /<link rel="stylesheet" href="(app\/[^"]+)"\/>/g;

function leggiLocale(rel, accanto){
  // prima accanto al file caricato (una copia «di prima» può avere i suoi), poi nel repo
  for(const base of [accanto, REPO]){
    const f = path.join(base, rel);
    if(fs.existsSync(f)) return fs.readFileSync(f, 'utf8');
  }
  throw new Error('pagina divisa: manca il file ' + rel);
}
function fileLocali(html){
  return [...html.matchAll(RE_STILE)].map(m => m[1]);
}
function assembla(file){
  const accanto = path.dirname(file);
  const html = fs.readFileSync(file, 'utf8');
  return html.replace(RE_STILE, (_, rel) => '<style>\n' + leggiLocale(rel, accanto) + '</style>');
}
module.exports = { assembla, fileLocali, REPO };
