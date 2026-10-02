// La pagina dell'app è divisa in più file (Fondamenta 035): zona-tracker.html, i file in app/
// e i moduli condivisi col Worker in shared/.
// Il banco gira senza rete e senza server, quindi qui la pagina si RICOMPONE: ogni file locale
// richiamato dalla pagina viene rimesso dentro, nello stesso punto e nello stesso ordine.
// Un file richiamato che non esiste ferma tutto: mai una pagina a metà scambiata per buona.
const fs = require('fs'), path = require('path');
const REPO = path.join(__dirname, '..', '..');
// La coda «?v=…» la mette il rilascio (tools/rilascio/versione.sh, Metodo 045): qui si ignora,
// per gli stili e per il codice allo stesso modo.
const RE_STILE = /<link rel="stylesheet" href="(app\/[^"?]+)(?:\?v=[^"]*)?"\/>/g;
const RE_CODICE = /<script src="((?:app|shared)\/[^"?]+)(?:\?v=[^"]*)?"><\/script>/g;

function leggiLocale(rel, accanto){
  // prima accanto al file caricato (una copia «di prima» può avere i suoi), poi nel repo
  for(const base of [accanto, REPO]){
    const f = path.join(base, rel);
    if(fs.existsSync(f)) return fs.readFileSync(f, 'utf8');
  }
  throw new Error('pagina divisa: manca il file ' + rel);
}
// Tutti i file locali richiamati, nell'ordine in cui la pagina li carica.
function fileLocali(html){
  return [...html.matchAll(RE_STILE), ...html.matchAll(RE_CODICE)].sort((a, b) => a.index - b.index).map(m => m[1]);
}
// Richiami a file locali scritti in una forma che qui sopra non si riconosce: resterebbero
// fuori dalla pagina ricomposta e dall'elenco del service worker senza che nessuno se ne accorga.
function richiamiNonRiconosciuti(html){
  // Il manifest e le icone (Fondamenta 190) non entrano nella pagina ne' nell'elenco del service worker: non sono codice
  const tutti = [...html.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)="(?!https?:|data:|\/\/)([^"]+)"[^>]*>/g)].filter(m => !/\brel="(?:manifest|icon|apple-touch-icon)"/.test(m[0])).map(m => m[1].split('?')[0]);
  const noti = new Set(fileLocali(html));
  return tutti.filter(f => !noti.has(f));
}
function assembla(file){
  const accanto = path.dirname(file);
  const html = fs.readFileSync(file, 'utf8');
  return html
    .replace(RE_STILE, (_, rel) => '<style>\n' + leggiLocale(rel, accanto) + '</style>')
    .replace(RE_CODICE, (_, rel) => '<script>\n' + leggiLocale(rel, accanto).replace(/<\/script/gi, '<\\/script') + '\n</script>');
}
module.exports = { assembla, fileLocali, richiamiNonRiconosciuti, REPO };
