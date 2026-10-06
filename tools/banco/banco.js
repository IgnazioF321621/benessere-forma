// Banco di prova: carica zona-tracker.html in jsdom con un finto client Supabase
// che serve fixture in memoria. Nessuna rete.
const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');

// 'a.eq.x,b.eq."y, z"' → [['a','x'],['b','y, z']]: le virgole dentro le virgolette non separano
function orPostgrest(espr){
  const parti = []; let cur = '', inQ = false;
  for(let i = 0; i < espr.length; i++){
    const ch = espr[i];
    if(ch === '\\' && inQ){ cur += espr[++i]; continue; }
    if(ch === '"'){ inQ = !inQ; continue; }
    if(ch === ',' && !inQ){ parti.push(cur); cur = ''; continue; }
    cur += ch;
  }
  parti.push(cur);
  return parti.map(p => { const m = /^([^.]+)\.eq\.(.*)$/.exec(p.trim()); return m ? [m[1], m[2]] : [p, undefined]; });
}

function makeSupaMock(tables){
  // tables: { nomeTabella: [righe] }
  const calls = [];
  function builder(table, op){
    const st = { table, op, filters: [], orders: [], limit: null, single:false };
    const api = {};
    const chain = (fn) => (...a) => { fn(...a); return api; };
    // select('id', { count:'exact', head:true }) come PostgREST: la risposta porta `count` (righe che
    // passano i filtri, prima di range/limit) e con head niente righe. Senza count, come prima.
    api.select = chain((cols, opts)=>{ st.cols = cols; st.count = !!(opts && opts.count); st.head = !!(opts && opts.head); });
    api.insert = chain((p)=>{ st.payload = p; });
    api.update = chain((p)=>{ st.payload = p; });
    api.delete = chain(()=>{});
    api.upsert = chain((p, o)=>{ st.payload = p; st.upsertOpts = o || {}; });
    ['eq','neq','lt','lte','gt','gte','like','ilike','is','in','contains'].forEach(f=>{
      api[f] = chain((col,val)=>{ st.filters.push([f,col,val]); });
    });
    // .or('a.eq.x,b.eq."y"') come PostgREST: solo uguaglianze, valori fra virgolette ammessi
    api.or = chain((espr)=>{ st.filters.push(['or', null, espr]); });
    api.order = chain((col,opt)=>{ st.orders.push([col, opt && opt.ascending===false ? 'desc':'asc']); });
    api.limit = chain((n)=>{ st.limit = n; });
    api.range = chain((a,b)=>{ st.range=[a,b]; });
    api.maybeSingle = () => { st.single = true; st.maybe = true; return run(); };
    api.single = () => { st.single = true; return run(); };
    api.then = (res, rej) => run().then(res, rej);
    // tables.__attesa = () => Promise: ogni risposta aspetta quella promessa (per contare le ondate di letture)
    function run(){ const r = runOra(); return tables.__attesa ? tables.__attesa().then(() => r) : r; }
    function runOra(){
      calls.push(st);
      // tables.__assenti = ['nome']: la tabella non esiste (migrazione non eseguita) → PGRST205
      if((tables.__assenti || []).includes(table)) return Promise.resolve({ data:null, error:{ code:'PGRST205', message:`Could not find the table 'public.${table}' in the schema cache` } });
      // tables.__rifiuta = { tabella: { code, message } }: le scritture su quella tabella rispondono con quell'errore dell'API
      if(st.op !== 'select' && tables.__rifiuta && tables.__rifiuta[table]) return Promise.resolve({ data:null, error:{ ...tables.__rifiuta[table] } });
      let rows = (tables[table] || []).slice();
      if(st.op === 'upsert' && st.upsertOpts.onConflict){
        // upsert vero in memoria: chiave onConflict, ignoreDuplicates rispettato
        const keys = st.upsertOpts.onConflict.split(',').map(k=>k.trim());
        const t = tables[table] || (tables[table] = []);
        (Array.isArray(st.payload) ? st.payload : [st.payload]).forEach(row => {
          const i = t.findIndex(r => keys.every(k => String(r[k]) === String(row[k])));
          if(i === -1) t.push({ id:'fake-'+t.length, ...row });
          else if(!st.upsertOpts.ignoreDuplicates) t[i] = { ...t[i], ...row };
        });
        return Promise.resolve({ data:null, error:null });
      }
      // tables.__rete = false: la rete non risponde (supabase-js riporta un fetch fallito senza codice)
      if(tables.__rete === false) return Promise.resolve({ data:null, error:{ message:'TypeError: Failed to fetch', details:'', hint:'', code:'' } });
      if(st.op === 'insert'){
        // le righe inserite restano in tabella; un id gia' presente risponde 23505 come Postgres
        const t = tables[table] || (tables[table] = []);
        const righe = Array.isArray(st.payload) ? st.payload : [st.payload];
        if(righe.some(r => r && r.id != null && t.some(x => String(x.id) === String(r.id)))) return Promise.resolve({ data:null, error:{ code:'23505', message:'duplicate key value violates unique constraint' } });
        righe.forEach(r => t.push({ id:'fake-' + t.length, ...r }));
        return Promise.resolve({ data: righe.map(r => ({ id:'fake-id', ...r })), error:null });
      }
      if(st.op !== 'select'){ return Promise.resolve({ data:[{id:'fake-id'}], error:null }); }
      // Join come PostgREST: select('..., meals!inner(date)') porta con se' la riga del pasto
      // (rows[i].meals = {date}) e scarta le righe senza pasto; i filtri 'meals.date' guardano li'.
      // tables.__joinRotto = true: il join risponde con un errore (per provare il ripiego).
      const join = /,\s*(\w+)!inner\(([^)]*)\)/.exec(String(st.cols || ''));
      if(join){
        if(tables.__joinRotto) return Promise.resolve({ data:null, error:{ code:'PGRST200', message:'Could not find a relationship (finto banco)' } });
        const [, padre, campi] = join;
        const colonne = campi.split(',').map(c => c.trim());
        const chiave = padre === 'meals' ? 'meal_id' : padre.replace(/s$/, '') + '_id';
        rows = rows.map(r => {
          const p = (tables[padre] || []).find(x => String(x.id) === String(r[chiave]));
          if(!p) return null;
          const e = {}; colonne.forEach(c => { e[c] = p[c]; });
          return { ...r, [padre]: e };
        }).filter(Boolean);
      }
      const valore = (r, col) => col.includes('.') ? col.split('.').reduce((o, k) => (o == null ? o : o[k]), r) : r[col];
      for(const [f,col,val] of st.filters){
        if(col.includes('.')) {
          if(f==='gte') rows = rows.filter(r=>valore(r,col) >= val);
          else if(f==='lt') rows = rows.filter(r=>valore(r,col) < val);
          else if(f==='gt') rows = rows.filter(r=>valore(r,col) > val);
          else if(f==='lte') rows = rows.filter(r=>valore(r,col) <= val);
          else if(f==='eq') rows = rows.filter(r=>String(valore(r,col))===String(val));
          continue;
        }
        if(f==='or'){ const alt = orPostgrest(val); rows = rows.filter(r => alt.some(([c, v]) => String(r[c]) === String(v))); continue; }
        if(f==='eq') rows = rows.filter(r=>String(r[col])===String(val));
        else if(f==='neq') rows = rows.filter(r=>String(r[col])!==String(val));
        else if(f==='lt') rows = rows.filter(r=>r[col] < val);
        else if(f==='lte') rows = rows.filter(r=>r[col] <= val);
        else if(f==='gt') rows = rows.filter(r=>r[col] > val);
        else if(f==='gte') rows = rows.filter(r=>r[col] >= val);
        else if(f==='in') rows = rows.filter(r=>val.includes(r[col]));
        else if(f==='is') rows = rows.filter(r=>r[col]===val);
      }
      for(let i=st.orders.length-1;i>=0;i--){
        const [col,dir] = st.orders[i];
        rows.sort((a,b)=>{ const x=a[col], y=b[col]; if(x===y) return 0; return (x>y?1:-1)*(dir==='desc'?-1:1); });
      }
      const totale = rows.length;
      if(st.range) rows = rows.slice(st.range[0], st.range[1]+1);
      else if(st.limit != null) rows = rows.slice(0, st.limit);
      else rows = rows.slice(0, 1000); // PostgREST default
      if(st.count) return Promise.resolve({ data: st.head ? null : rows, error:null, count: totale });
      // .single() senza righe: PostgREST risponde con l'errore PGRST116, non con null (.maybeSingle() si')
      if(st.single && !st.maybe && !rows.length) return Promise.resolve({ data:null, error:{ code:'PGRST116', message:'JSON object requested, multiple (or no) rows returned' } });
      if(st.single) return Promise.resolve({ data: rows[0] || null, error:null });
      return Promise.resolve({ data: rows, error:null });
    }
    return api;
  }
  const client = {
    from: (t) => {
      const proxyTarget = {};
      // op dedotto dal primo metodo chiamato
      return new Proxy(proxyTarget, {
        get(_, prop){
          if(prop==='select') { const b = builder(t,'select'); return b.select; }
          if(prop==='insert') { const b = builder(t,'insert'); return b.insert; }
          if(prop==='update') { const b = builder(t,'update'); return b.update; }
          if(prop==='delete') { const b = builder(t,'delete'); return b.delete; }
          if(prop==='upsert') { const b = builder(t,'upsert'); return b.upsert; }
          return undefined;
        }
      });
    },
    auth: {
      // tables.__sessione = { user:{ id, email } }: la pagina trova una persona già entrata (il BOOTSTRAP parte da solo)
      getSession: async()=>({ data:{session: tables.__sessione || null}, error:null }),
      onAuthStateChange: ()=>({ data:{ subscription:{ unsubscribe(){} } } }),
      signInWithOtp: async()=>({error:null}), verifyOtp: async()=>({error:null}),
      signOut: async()=>({error:null}), getUser: async()=>({data:{user: (tables.__sessione || {}).user || null}}),
    },
    // storage.upload, storage.remove e rpc registrano la chiamata in _calls (table 'storage:<bucket>' / 'rpc:<funzione>');
    // tables.__storage = { bucket:['<cartella>/<file>', …] } sono i file presenti: list(cartella) li elenca, upload li aggiunge, remove li toglie;
    // tables.__rete = false fa fallire upload e remove come un fetch fallito; tables.__rifiuta = { 'storage:<bucket>':{code, message} } li rifiuta con quell'errore;
    // tables.__rpc = { funzione: { data, error } } decide la risposta
    storage: { from: (bucket)=>{
      const nome = 'storage:' + bucket;
      const presenti = () => { const st = tables.__storage || (tables.__storage = {}); return st[bucket] || (st[bucket] = []); };
      const guasto = () => tables.__rete === false ? { message:'TypeError: Failed to fetch' } : ((tables.__rifiuta || {})[nome] ? { ...tables.__rifiuta[nome] } : null);
      return {
        createSignedUrl: async()=>({data:null}),
        list: async(cartella)=>({ data: presenti().filter(f => f.startsWith(cartella + '/')).map(f => ({ name: f.slice(cartella.length + 1) })), error:null }),
        upload: async(percorso, corpo, opzioni)=>{
          calls.push({ table:nome, op:'upload', payload:{ percorso, tipo: corpo && corpo.type, byte: corpo && corpo.size, opzioni: opzioni || {} }, filters:[] });
          const e = guasto(); if(e) return { data:null, error:e };
          if(!presenti().includes(percorso)) presenti().push(percorso);
          return { data:{ path:percorso }, error:null };
        },
        remove: async(paths)=>{
          calls.push({ table:nome, op:'remove', payload:paths, filters:[] });
          const e = guasto(); if(e) return { data:null, error:e };
          tables.__storage = tables.__storage || {}; tables.__storage[bucket] = presenti().filter(f => !paths.includes(f));
          return { data:paths, error:null };
        },
      };
    } },
    rpc: (fn, args) => { calls.push({ table:'rpc:' + fn, op:'rpc', payload:args || null, filters:[] }); const r = (tables.__rpc || {})[fn]; return Promise.resolve(r ? { ...r } : { data:null, error:null }); },
  };
  client._calls = calls;
  return client;
}

function boot(tables, opts={}){
  const html = require('./pagina').assembla(opts.file || process.env.BANCO_FILE || require('path').join(__dirname, '..', '..', 'zona-tracker.html'));
  const vc = new VirtualConsole();
  const logs = [];
  vc.on('jsdomError', e => logs.push(['jsdomError', e.message]));
  ['error','warn'].forEach(l => vc.on(l, (...a)=>logs.push([l, a.map(String).join(' ')])));
  const supa = makeSupaMock(tables);
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    url: 'https://ignaziof321621.github.io/benessere-forma/zona-tracker.html?test=0',
    virtualConsole: vc,
    pretendToBeVisual: true,
    beforeParse(win){
      if(opts.now){
        // Orologio fermo: new Date() e Date.now() danno sempre opts.now, le date esplicite restano vere.
        const Real = win.Date, T = new Real(opts.now).getTime();
        win.Date = class extends Real { constructor(...a){ if(a.length) super(...a); else super(T); } static now(){ return T; } };
      }
      win.supabase = { createClient: () => supa };
      // opts.locale = { chiave: valore }: localStorage già pieno prima che la pagina parta (la copia locale dell'app)
      Object.entries(opts.locale || {}).forEach(([k, v]) => win.localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)));
      // Gli intervalli della pagina (il controllo degli aggiornamenti ogni 3 minuti, Fondamenta 140) non devono
      // tenere in vita il processo: una prova senza process.exit finirebbe solo dopo 3 minuti. Timer di Node, unref.
      win.setInterval = (fn, ms, ...a) => { const t = setInterval(() => fn(...a), ms); if(t.unref) t.unref(); return t; };
      win.clearInterval = (t) => clearInterval(t);
      win.matchMedia = win.matchMedia || (()=>({matches:false, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){}}));
      win.scrollTo = ()=>{};
      win.AudioContext = function(){ return { createOscillator:()=>({connect(){},start(){},stop(){},frequency:{setValueAtTime(){}} }), createGain:()=>({connect(){},gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}}}), currentTime:0, destination:{}, state:'running', resume(){} }; };
      win.webkitAudioContext = win.AudioContext;
      win.navigator.serviceWorker = undefined;
    }
  });
  // La pagina parte da sola (il BOOTSTRAP non aspetta più, Fondamenta 100): con tables.__sessione entra,
  // senza mostra l'accesso. Una prova che avvia a mano (loadAndStart) e poi guarda le schermate aspetta
  // prima `await avviato`, altrimenti la partenza automatica le arriva sopra.
  return { dom, win: dom.window, supa, logs, avviato: new Promise(r => dom.window.setTimeout(r, 0)) };
}
module.exports = { boot, makeSupaMock };
