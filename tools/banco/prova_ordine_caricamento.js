// Fondamenta 035: l'ordine di caricamento regge.
// La pagina è fatta di più script, letti dal browser uno dopo l'altro. Dentro UNO script una
// funzione si può usare prima del punto in cui è scritta; fra script diversi no: se un pezzo
// eseguito subito, al caricamento, usa un nome dichiarato in uno script che viene DOPO, la
// pagina resta bianca. Questa prova legge tutti gli script della pagina nell'ordine vero e
// cerca esattamente quel caso, più i nomi dichiarati due volte in script diversi.
//
// «Eseguito subito» = fuori da ogni funzione, oppure dentro una funzione chiamata subito
// (seguita anche attraverso le funzioni che chiama). Le funzioni passate a chi le esegue più
// tardi (addEventListener, setTimeout, then…) non contano. Nel dubbio la prova segnala.
//
//   node tools/banco/prova_ordine_caricamento.js [file.html]      (serve acorn, fuori dal repo: npm install acorn)
//   node tools/banco/prova_ordine_caricamento.js --elenco         # stampa ogni pezzo eseguito subito e cosa usa
process.env.TZ = 'Europe/Rome';
const fs = require('fs'), path = require('path');
const acorn = require('acorn');
const { REPO } = require('./pagina');
const args = process.argv.slice(2);
const elenco = args.includes('--elenco');
const file = args.find(a => !a.startsWith('--')) || path.join(REPO, 'zona-tracker.html');
const html = fs.readFileSync(file, 'utf8');
const accanto = path.dirname(file);

// 1) gli script della pagina, nell'ordine in cui il browser li esegue (quelli esterni di rete si saltano)
const script = [];
const RE = /<script(?:\s+src="([^"]+)")?>([\s\S]*?)<\/script>/g;
let m;
while((m = RE.exec(html))){
  if(m[1]){
    if(/^https?:/.test(m[1])) continue;
    const rel = m[1].split('?')[0];
    const f = [path.join(accanto, rel), path.join(REPO, rel)].find(x => fs.existsSync(x));
    if(!f) throw new Error('manca ' + rel);
    script.push({ nome: rel, codice: fs.readFileSync(f, 'utf8'), riga0: 0 });
  } else {
    script.push({ nome: 'pagina (riga ' + (html.slice(0, m.index).split('\n').length) + ')', codice: m[2], riga0: html.slice(0, m.index).split('\n').length - 1 });
  }
}

// 2) per ogni script: dichiarazioni in cima e pezzi eseguiti subito
const DOPO = new Set(['addEventListener', 'setTimeout', 'setInterval', 'then', 'catch', 'finally', 'requestAnimationFrame', 'requestIdleCallback']);
const dich = new Map();      // nome → { s, pos, funzione, nodo }
const doppi = [];
const pezzi = [];            // { s, pos, riga, nodo }
script.forEach((sc, s) => {
  sc.ast = acorn.parse(sc.codice, { ecmaVersion: 'latest', sourceType: 'script', locations: true });
  sc.ast.body.forEach((st, pos) => {
    const nomi = [];
    if(st.type === 'FunctionDeclaration' || st.type === 'ClassDeclaration') nomi.push([st.id.name, st.type === 'FunctionDeclaration', st]);
    else if(st.type === 'VariableDeclaration') st.declarations.forEach(d => nomiDi(d.id).forEach(n => nomi.push([n, false, st])));
    nomi.forEach(([n, funzione, nodo]) => {
      if(dich.has(n) && dich.get(n).s !== s) doppi.push(`${n}: dichiarato in «${script[dich.get(n).s].nome}» e in «${sc.nome}»`);
      if(!dich.has(n) || funzione) dich.set(n, { s, pos, funzione, nodo, riga: st.loc.start.line + sc.riga0 });
    });
    if(st.type !== 'FunctionDeclaration') pezzi.push({ s, pos, riga: st.loc.start.line + sc.riga0, nodo: st });
  });
});
function nomiDi(p){
  if(!p) return [];
  if(p.type === 'Identifier') return [p.name];
  if(p.type === 'ObjectPattern') return p.properties.flatMap(x => nomiDi(x.value || x.argument));
  if(p.type === 'ArrayPattern') return p.elements.flatMap(nomiDi);
  if(p.type === 'AssignmentPattern') return nomiDi(p.left);
  if(p.type === 'RestElement') return nomiDi(p.argument);
  return [];
}
// nomi locali di una funzione (parametri e dichiarazioni al suo interno): coprono quelli globali
function locali(fn){
  const out = new Set(fn.params.flatMap(nomiDi));
  (function giro(n, dentro){
    if(!n || typeof n.type !== 'string') return;
    if(dentro && /Function/.test(n.type)){ if(n.id) out.add(n.id.name); return; }
    if(n.type === 'VariableDeclaration') n.declarations.forEach(d => nomiDi(d.id).forEach(x => out.add(x)));
    if(n.type === 'CatchClause' && n.param) nomiDi(n.param).forEach(x => out.add(x));
    for(const k in n){ const v = n[k]; if(k === 'loc') continue; if(Array.isArray(v)) v.forEach(x => giro(x, true)); else if(v && typeof v === 'object') giro(v, true); }
  })(fn.body, false);
  return out;
}
// nomi globali usati SUBITO da un nodo; segue le funzioni in cima chiamate subito
function usatiSubito(nodo, coperti, viste, out){
  (function giro(n, gen, chiave, cop){
    if(!n || typeof n.type !== 'string') return;
    switch(n.type){
      case 'Identifier': {
        if(gen && ((gen.type === 'MemberExpression' && chiave === 'property' && !gen.computed) ||
                   ((gen.type === 'Property' || gen.type === 'MethodDefinition' || gen.type === 'PropertyDefinition') && chiave === 'key' && !gen.computed) ||
                   (gen.type === 'VariableDeclarator' && chiave === 'id') || gen.type === 'LabeledStatement' || gen.type === 'BreakStatement' || gen.type === 'ContinueStatement')) return;
        if(cop.has(n.name) || !dich.has(n.name)) return;
        out.add(n.name);
        return;
      }
      case 'FunctionExpression': case 'ArrowFunctionExpression': case 'FunctionDeclaration': {
        // eseguita subito solo se chiamata sul posto, o passata a chi la esegue subito (map, forEach, …)
        const sulPosto = gen && gen.type === 'CallExpression' && chiave === 'callee';
        const passata = gen && (gen.type === 'CallExpression' || gen.type === 'NewExpression') && chiave === 'arguments' &&
          !(gen.callee.type === 'MemberExpression' && DOPO.has(gen.callee.property.name)) && !(gen.callee.type === 'Identifier' && DOPO.has(gen.callee.name));
        if(!sulPosto && !passata) return;
        const c2 = new Set([...cop, ...locali(n)]);
        giro(n.body, n, 'body', c2);
        return;
      }
      case 'CallExpression': case 'NewExpression': {
        if(n.callee.type === 'Identifier' && !cop.has(n.callee.name) && dich.has(n.callee.name) && dich.get(n.callee.name).funzione && !viste.has(n.callee.name)){
          viste.add(n.callee.name);
          const f = dich.get(n.callee.name).nodo;
          usatiSubito(f.body, locali(f), viste, out);
        }
        break;
      }
    }
    for(const k in n){ const v = n[k]; if(k === 'loc') continue; if(Array.isArray(v)) v.forEach(x => giro(x, n, k, cop)); else if(v && typeof v === 'object') giro(v, n, k, cop); }
  })(nodo, null, null, coperti);
  return out;
}

// 3) la regola
const guai = [];
pezzi.forEach(p => {
  const usati = [...usatiSubito(p.nodo, new Set(), new Set(), new Set())];
  const dettagli = [];
  usati.forEach(n => {
    const d = dich.get(n);
    if(d.s === p.s && d.pos === p.pos) return;
    const dopo = d.s > p.s || (d.s === p.s && d.pos > p.pos && !d.funzione);
    dettagli.push(n + (d.s !== p.s ? ' ← ' + script[d.s].nome : ''));
    if(dopo) guai.push(`${script[p.s].nome}, riga ${p.riga}: usa subito «${n}», dichiarato ${d.s > p.s ? 'in uno script che viene dopo («' + script[d.s].nome + '», riga ' + d.riga + ')' : 'più sotto nello stesso script (riga ' + d.riga + '), e non è una funzione'}`);
  });
  if(elenco && dettagli.length) console.log(`  ${script[p.s].nome} · riga ${p.riga}: ${dettagli.join(', ')}`);
});

console.log(`${script.length} script · ${dich.size} nomi dichiarati in cima · ${pezzi.length} pezzi eseguiti al caricamento`);
script.forEach((sc, i) => console.log(`   ${i + 1}. ${sc.nome} — ${sc.ast.body.length} dichiarazioni e pezzi`));
let ko = 0;
const esito = (nome, lista) => { if(lista.length) ko++; console.log((lista.length ? '  KO  ' : '  OK  ') + nome + (lista.length ? ': ' + lista.length : '')); lista.forEach(x => console.log('        ✗ ' + x)); };
esito('nessun pezzo usa subito un nome che arriva dopo', guai);
esito('nessun nome dichiarato in due script diversi', doppi);
console.log(ko ? `\n${ko} KO` : '\ntutto OK');
process.exit(ko ? 1 : 0);
