// Training 370 (16 novembre 2026): il blocco nuovo di Ignazio e gli attrezzi che ha davvero. Una riga con un CARICO e un
// appoggio («manubri;panca», «cavo;maniglie») passava come nativa con il solo appoggio: «Rematore manubri panca piana» nella
// sua scheda si faceva sulla panca senza carico. 41 righe del catalogo del 16 novembre per la sua attrezzatura
// (tools/banco/dati/catalogo_carico_appoggio_20261116.json). La regola resta una, ZTCoachRules.attrezziCasa.
//   node tools/banco/prova_training_370.js
const fs = require('fs'), path = require('path');
const R = require('../../shared/coach_rules.js');
let ko = 0;
const atteso = (nome, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if(!ok) ko++;
  console.log((ok ? '  OK  ' : '  KO  ') + nome.padEnd(92), JSON.stringify(got), ok ? '' : '≠ atteso ' + JSON.stringify(exp));
};
const RIGHE = JSON.parse(fs.readFileSync(path.join(__dirname, 'dati', 'catalogo_carico_appoggio_20261116.json'), 'utf8'));
const MISTE = JSON.parse(fs.readFileSync(path.join(__dirname, 'dati', 'catalogo_righe_miste_20261101.json'), 'utf8'));
// l'attrezzatura vera di Ignazio (profilo del 16 novembre)
const IGNAZIO = ['elastico', 'barra', 'sbarra', 'panca', 'fitball', 'corpo libero', 'corda doppia', 'cavigliere', 'maniglie', 'barra_corta', 'barra_lunga'];
const ha = (lista) => { const s = new Set(R.attrezziConAlias(lista)); return (t) => s.has(t); };
const casa = (ex, lista) => R.attrezziCasa(ex, ha(lista));
// la regola fino al 15 novembre (Training 550), copiata, per dire cosa cambia e cosa no
const prima = (ex, h0) => {
  const h = (a) => a === 'corpo_libero' || h0(a);
  const lista = (s, sep) => String(s || '').toLowerCase().split(sep).map(x => x.trim()).filter(Boolean);
  const nativi = lista(String(ex.attrezzo || '').toLowerCase().trim().replace(/\s+/g, '_'), ';');
  const surr = lista(ex.surrogato_attrezzo, '+').map(a => a.replace(/\s+/g, '_'));
  const surrOk = surr.length > 0 && surr.every(h);
  const col = (ok) => ok ? { ok: true, surrogato: false } : surrOk ? { ok: true, surrogato: true } : { ok: false, surrogato: false };
  if(!(nativi.includes('corpo_libero') && nativi.length > 1)) return col(nativi.some(h));
  const app = nativi.filter(a => ['panca', 'fitball', 'sbarra', 'trx', 'parallele'].includes(a));
  if(!app.every(h)) return col(false);
  const car = nativi.filter(a => R.CARICHI.includes(a));
  if(car.length && !car.some(h) && surrOk) return { ok: true, surrogato: true };
  return { ok: true, surrogato: false };
};

// 1 · la scheda di Ignazio e le 41 righe
{
  const ex076 = RIGHE.find(r => r.codice === 'EX076');
  atteso('1 · Rematore manubri panca piana senza manubri: prima nativo (panca), ora col surrogato elastico+panca', [prima(ex076, ha(IGNAZIO)), casa(ex076, IGNAZIO)], [{ ok:true, surrogato:false }, { ok:true, surrogato:true }]);
  const esito = RIGHE.map(r => [r.codice, casa(r, IGNAZIO)]);
  atteso('1 · nessuna delle 41 righe passa più come nativa con il solo appoggio', esito.filter(([, e]) => e.ok && !e.surrogato).map(([c]) => c), []);
  atteso('1 · quelle col surrogato vanno con l\'elastico (27)', esito.filter(([, e]) => e.surrogato).length, 27);
  atteso('1 · quelle senza surrogato non si fanno senza manubri (14)', esito.filter(([, e]) => !e.ok).map(([c]) => c), ['EX010', 'EX065', 'EX330', 'EX336', 'EX343', 'EX525', 'EX526', 'EX531', 'EX532', 'EX535', 'EX536', 'EX537', 'EX543', 'EX544']);
  atteso('1 · prima passavano tutte e 41 come native', RIGHE.filter(r => { const e = prima(r, ha(IGNAZIO)); return e.ok && !e.surrogato; }).length, 41);
  atteso('1 · Wrist curl (manubri;panca;corda doppia): la corda doppia non basta, va con l\'elastico', casa(RIGHE.find(r => r.codice === 'EX069'), IGNAZIO), { ok:true, surrogato:true });
  atteso('1 · Pushdown al cavo con le sole maniglie: con l\'elastico', casa(RIGHE.find(r => r.codice === 'EX554'), IGNAZIO), { ok:true, surrogato:true });
}
// 2 · chi ha il carico e l'appoggio fa il nativo; chi ha il carico senza l'appoggio sceglibile no
{
  const ex076 = RIGHE.find(r => r.codice === 'EX076');
  atteso('2 · manubri e panca: il nativo', casa(ex076, ['manubri', 'panca']), { ok:true, surrogato:false });
  atteso('2 · manubri senza panca: l\'appoggio serve, e il surrogato (elastico+panca) neanche', casa(ex076, ['manubri', 'elastico']), { ok:false, surrogato:false });
  atteso('2 · palestra: tutto, come prima', R.puoFare({ ...ex076, luogo:'palestra' }, { tipoAllen:'palestra', attrezzatura:[] }), true);
}
// 3 · cosa non cambia: un attrezzo solo, soli carichi, le righe miste del 550
{
  const singole = [{ attrezzo:'manubri', surrogato_attrezzo:'elastico' }, { attrezzo:'sbarra' }, { attrezzo:'elastico;manubri' }, { attrezzo:'elastico;barra' }, { attrezzo:'macchina', surrogato_attrezzo:'elastico+panca' }, { attrezzo:'corpo libero' }, { attrezzo:'conetti', surrogato_attrezzo:'corpo libero' }, { attrezzo:'panca;foam roller' }];
  const insiemi = [[], ['elastico'], ['manubri'], ['panca'], IGNAZIO, ['manubri', 'panca', 'elastico']];
  const diversi = [];
  singole.concat(MISTE).forEach(r => insiemi.forEach(s => { if(JSON.stringify(prima(r, ha(s))) !== JSON.stringify(casa(r, s))) diversi.push((r.codice || r.attrezzo) + '[' + s.join('+') + ']'); }));
  atteso('3 · un attrezzo solo, soli carichi, le righe miste del 550: come prima', diversi, []);
}
// 4 · gli accessori degli elastici e la corda doppia
{
  const tok = (a) => ({ attrezzo: a });
  atteso('4 · barra corta e barra lunga aprono la barra (alias), le maniglie le maniglie, la corda doppia sé stessa', [R.puoFare({ attrezzo:'barra', luogo:'casa' }, { tipoAllen:'casa', attrezzatura:['barra_corta'] }), R.puoFare({ attrezzo:'barra', luogo:'casa' }, { tipoAllen:'casa', attrezzatura:['barra_lunga'] }), casa(tok('maniglie'), ['maniglie']).ok, casa(tok('corda doppia'), ['corda doppia']).ok], [true, true, true, true]);
  // le parole del catalogo del 16 novembre come attrezzo (solo quelle che servono): cavigliere e cavigliera non ci sono
  const catalogo = ['barra', 'maniglie', 'corda doppia', 'elastico', 'panca', 'sbarra', 'fitball', 'corda', 'manubri'].map((a, i) => ({ codice: 'X' + i, attrezzo: a }));
  atteso('4 · con l\'attrezzatura di Ignazio l\'unico che non apre niente sono le cavigliere (L2)', R.attrezziInerti(IGNAZIO, catalogo), ['cavigliere']);
}
console.log(ko ? `\n  ${ko} KO` : '\n  tutto verde');
process.exit(ko ? 1 : 0);
