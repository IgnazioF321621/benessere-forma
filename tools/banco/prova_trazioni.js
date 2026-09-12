const { boot } = require('./banco');
const fs = require('fs');
const { win } = boot({});
const f = win.isPullUpExercise;
// i 23 nomi che iniziano per "trazion" nel catalogo (docs/STATO.json, 1 set 2026)
const stato = JSON.parse(fs.readFileSync(require('path').join(__dirname,'..','..','docs','STATO.json'),'utf8'));
const trazioni = stato._catalogo_righe.filter(r => String(r.nome||'').toLowerCase().startsWith('trazion'));
let banda=[], nonBanda=[];
trazioni.forEach(r => (f(r.nome) ? banda : nonBanda).push(r.codice+' '+r.nome));
console.log('A BANDA ('+banda.length+'):'); banda.forEach(x=>console.log('  '+x));
console.log('NON a banda ('+nonBanda.length+'):'); nonBanda.forEach(x=>console.log('  '+x));
// falsi positivi: nomi NON-trazione che passano
const falsi = stato._catalogo_righe.filter(r => f(r.nome) && !String(r.nome).toLowerCase().startsWith('trazion'));
console.log('falsi positivi fuori prefisso:', falsi.length);
// casi limite
const casi = ['Trazioni','trazioni sbarra presa neutra','  TRAZIONI SBARRA  ','Trazione al cavo alto','Lat machine frontale','Trazioni sbarra zavorrate','Trazioni sbarra gravitron in ginocchio', null, ''];
casi.forEach(c => console.log(JSON.stringify(c), '->', f(c)));
