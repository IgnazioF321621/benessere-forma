// Banco di prova: carica zona-tracker.html in jsdom con un finto client Supabase
// che serve fixture in memoria. Nessuna rete.
const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');

function makeSupaMock(tables){
  // tables: { nomeTabella: [righe] }
  const calls = [];
  function builder(table, op){
    const st = { table, op, filters: [], orders: [], limit: null, single:false };
    const api = {};
    const chain = (fn) => (...a) => { fn(...a); return api; };
    api.select = chain((cols)=>{ st.cols = cols; });
    api.insert = chain((p)=>{ st.payload = p; });
    api.update = chain((p)=>{ st.payload = p; });
    api.delete = chain(()=>{});
    api.upsert = chain((p)=>{ st.payload = p; });
    ['eq','neq','lt','lte','gt','gte','like','ilike','is','in','contains'].forEach(f=>{
      api[f] = chain((col,val)=>{ st.filters.push([f,col,val]); });
    });
    api.order = chain((col,opt)=>{ st.orders.push([col, opt && opt.ascending===false ? 'desc':'asc']); });
    api.limit = chain((n)=>{ st.limit = n; });
    api.range = chain((a,b)=>{ st.range=[a,b]; });
    api.maybeSingle = () => { st.single = true; return run(); };
    api.single = () => { st.single = true; return run(); };
    api.then = (res, rej) => run().then(res, rej);
    function run(){
      calls.push(st);
      let rows = (tables[table] || []).slice();
      if(st.op !== 'select'){ return Promise.resolve({ data:[{id:'fake-id'}], error:null }); }
      for(const [f,col,val] of st.filters){
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
      if(st.range) rows = rows.slice(st.range[0], st.range[1]+1);
      else if(st.limit != null) rows = rows.slice(0, st.limit);
      else rows = rows.slice(0, 1000); // PostgREST default
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
      getSession: async()=>({ data:{session:null}, error:null }),
      onAuthStateChange: ()=>({ data:{ subscription:{ unsubscribe(){} } } }),
      signInWithOtp: async()=>({error:null}), verifyOtp: async()=>({error:null}),
      signOut: async()=>({error:null}), getUser: async()=>({data:{user:null}}),
    },
    storage: { from: ()=>({ createSignedUrl: async()=>({data:null}), list: async()=>({data:[]}) }) },
  };
  client._calls = calls;
  return client;
}

function boot(tables, opts={}){
  const html = fs.readFileSync(opts.file || process.env.BANCO_FILE || require('path').join(__dirname, '..', '..', 'zona-tracker.html'),'utf8');
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
      win.supabase = { createClient: () => supa };
      win.matchMedia = win.matchMedia || (()=>({matches:false, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){}}));
      win.scrollTo = ()=>{};
      win.AudioContext = function(){ return { createOscillator:()=>({connect(){},start(){},stop(){},frequency:{setValueAtTime(){}} }), createGain:()=>({connect(){},gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}}}), currentTime:0, destination:{}, state:'running', resume(){} }; };
      win.webkitAudioContext = win.AudioContext;
      win.navigator.serviceWorker = undefined;
    }
  });
  return { dom, win: dom.window, supa, logs };
}
module.exports = { boot, makeSupaMock };
