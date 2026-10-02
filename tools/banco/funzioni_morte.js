// Funzioni dichiarate e mai chiamate (Fondamenta 180): stampa quante sono e quali. Si lancia dalla radice del repo.
//   node tools/banco/funzioni_morte.js
// Restano per scelta: loadDailyLog, getDailyLog, saveDailyLog (il diario del giorno, Fondamenta 050, usato da prova_diario.js) e misuraCache (si chiama dalla console).
// Funzioni dichiarate (function nome / async function nome / window.nome = ) e numero di occorrenze del nome in tutti i file dell'app
const fs=require('fs');
const files=['zona-tracker.html',...fs.readdirSync('app').map(f=>'app/'+f),...fs.readdirSync('shared').map(f=>'shared/'+f),'sw.js'];
const src={}; files.forEach(f=>src[f]=fs.readFileSync(f,'utf8'));
const tutti=Object.values(src).join('\n');
const decl=[];
for(const f of files){ for(const m of src[f].matchAll(/^\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm)) decl.push([m[1],f]); for(const m of src[f].matchAll(/^window\.([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function|\()/gm)) decl.push([m[1],f]); }
const out=[];
for(const [n,f] of decl){ const re=new RegExp('(?<![\\w$])'+n.replace(/\$/g,'\\$')+'(?![\\w$])','g'); const c=(tutti.match(re)||[]).length; if(c<=1) out.push(n+'  '+f); }
console.log(out.length); console.log(out.join('\n'));
