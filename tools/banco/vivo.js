// Banco dal vivo: zona-tracker.html in jsdom col client Supabase VERO.
// Chiave di servizio letta da worker/.dev.vars, mai stampata. Serve dal Mac (L46 al contrario:
// qui la rete c'è, e il file vero gira sui dati veri). Dipendenze fuori dal repo:
//   npm install jsdom @supabase/supabase-js
process.env.TZ = 'Europe/Rome';
const fs = require('fs'), path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
const { createClient } = require('@supabase/supabase-js');
const REPO = path.join(__dirname, '..', '..');
const vars = Object.fromEntries(fs.readFileSync(REPO + '/worker/.dev.vars','utf8').split('\n').filter(l=>/^[A-Z_]+=/.test(l)).map(l=>[l.split('=')[0], l.slice(l.indexOf('=')+1).trim()]));
const URL_SB = 'https://qxiyeiahpoiliwpqslpr.supabase.co';
function bootVivo(file){
  const html = fs.readFileSync(file || REPO + '/zona-tracker.html', 'utf8');
  const vc = new VirtualConsole(); const logs = [];
  vc.on('jsdomError', e => logs.push(['jsdomError', e.message]));
  ['error','warn'].forEach(l => vc.on(l, (...a)=>logs.push([l, a.map(String).join(' ')])));
  const real = createClient(URL_SB, vars.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession:false, autoRefreshToken:false } });
  const dom = new JSDOM(html, { runScripts:'dangerously', url:'https://ignaziof321621.github.io/benessere-forma/zona-tracker.html?test=0', virtualConsole: vc, pretendToBeVisual:true,
    beforeParse(win){
      win.supabase = { createClient: () => real };
      win.matchMedia = ()=>({matches:false, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){}});
      win.scrollTo = ()=>{};
      win.AudioContext = function(){ return { createOscillator:()=>({connect(){},start(){},stop(){},frequency:{setValueAtTime(){}} }), createGain:()=>({connect(){},gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}}}), currentTime:0, destination:{}, state:'running', resume(){} }; };
      win.navigator.serviceWorker = undefined;
    }});
  return { win: dom.window, real, logs };
}
module.exports = { bootVivo };
