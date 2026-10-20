// ═══════════════════════════════════════════════════════════
// shared/coach_rules.js — Pirsi propone (Fase 3, 13 settembre 2026)
// ═══════════════════════════════════════════════════════════
// Modulo condiviso fra l'app e il Worker: una fonte sola, questo file.
// La pagina lo carica con <script src="shared/coach_rules.js"> prima del proprio codice
// (dal 2 ottobre 2026, Fondamenta 035, non è più copiato dentro); il Worker lo importa.
//
// buildProposals(picture, history, profile, opts) → [proposta] (0-3, in ordine)
//   picture  quadro della settimana CHIUSA (buildWeeklyPicture, versione ≥ 2)
//   history  quadri delle settimane prima (weekly_pictures), in qualunque ordine
//   profile  obiettivo, goal_weight_kg, target_kcal/protein/carbs/fat,
//            giorni_allenamento, train_start_date
//   opts     { proposals: righe passate di coach_proposals (kind, status, week_start),
//              supportedDays: giorni per cui esiste una rotazione (default [4, 5]) }
//
// Funzione PURA e deterministica: niente rete, niente orologio, niente stato.
// Stessi ingressi → stesse proposte, sul telefono e nel cron.
//
// Pirsi propone, l'utente decide: qui si scrive COSA proporre e PERCHÉ, mai si
// applica niente. Ogni proposta porta i numeri che l'hanno generata.
//
// Forma di una proposta:
//   { kind, title, reason, evidence: { numeri: [{ label, value }], …dati grezzi }, change | null }
var ZTCoachRules = (function(){
  'use strict';

  var RULES_VERSION = '2026-10-14';   // Pirsi 080: regole incrociate cibo · allenamento · corpo
  var KCAL_MIN = 1500, KCAL_MAX = 3500;
  var MAX_PROPOSTE = 3;
  var ADERENZA_MIN = 0.7;           // 70% dei giorni registrati dentro il target ±10%
  var RAFFREDDAMENTO_SETT = 4;      // check, esami, volume, scarico: non si ripropongono prima di 4 settimane
  var ORDINE = { weigh_in: 0, logging: 1, kcal: 10, protein: 11, keep: 12, eat_first: 19, training_volume: 20, deload: 21, check: 30, blood_test: 31 };
  var PESATE_CONSIGLIATE = 3;       // «pesati almeno 3 volte»: sotto 3 lo si ricorda, sotto 2 non si decide niente sulle calorie
  var PESATE_MIN = 2;
  var FATICA_DURE_MIN = 0.5;        // metà o più delle sedute dette «dure» (Training 060)
  var KCAL_SOTTO_RATIO = 0.9;       // calorie medie sotto il 90% dell'obiettivo = «mangi poco»
  var VITA_CALO_CM = 1;             // vita giù di almeno 1 cm (medie di 2 settimane contro le 2 prima)
  var GRASSO_CALO_PCT = 0.5;        // grasso % giù di almeno mezzo punto, stessa regola
  var GIORNI = ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica'];

  // ── numeri in italiano: virgola decimale, punto delle migliaia, segno vero ──
  function num(v, dec){
    if(v == null || !isFinite(v)) return '—';
    var parti = Math.abs(Number(v)).toFixed(dec || 0).split('.');
    return (Number(v) < 0 ? '−' : '') + parti[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (parti[1] ? ',' + parti[1] : '');
  }
  function segno(v, dec){ return v == null || !isFinite(v) ? '—' : (v > 0 ? '+' : '') + num(v, dec); }
  function r2(x){ return x == null || !isFinite(x) ? null : Math.round(x * 100) / 100; }
  function media(arr){ var v = arr.filter(function(x){ return x != null && isFinite(x); }); return v.length ? v.reduce(function(a, b){ return a + b; }, 0) / v.length : null; }
  function addDays(key, n){ var d = new Date(key + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function pct(x){ return x == null ? '—' : Math.round(x * 100) + '%'; }

  // Direzione dall'obiettivo del profilo (CSV di OBJ_ADAPT, chiavi vecchie comprese).
  // Ricomposizione non dice una direzione di peso: la dice l'obiettivo di peso, con 1 kg di tolleranza.
  function direzione(profile, pesoAttuale){
    var chiavi = String(profile && profile.obiettivo || '').split(',').map(function(s){ return s.trim(); });
    var ha = function(k){ return chiavi.indexOf(k) !== -1; };
    if(ha('dimagrimento') || ha('perdita_peso')) return 'dimagrire';
    if(ha('ipertrofia') || ha('massa_muscolare')) return 'massa';
    if(ha('ricomposizione')){
      var goal = profile.goal_weight_kg != null ? Number(profile.goal_weight_kg) : null;
      var w = pesoAttuale != null ? pesoAttuale : (profile.weight_kg != null ? Number(profile.weight_kg) : null);
      if(goal != null && w != null && isFinite(goal) && isFinite(w)){
        if(goal < w - 1) return 'dimagrire';
        if(goal > w + 1) return 'massa';
      }
    }
    return 'mantenere';
  }

  function buildProposals(picture, history, profile, opts){
    var o = opts || {};
    var prof = profile || {};
    if(!picture || !picture.meta || !picture.meta.week_start) return [];
    var ws = picture.meta.week_start;
    var perSettimana = {};
    (history || []).forEach(function(p){ if(p && p.meta && p.meta.week_start && p.meta.week_start < ws) perSettimana[p.meta.week_start] = p; });
    var sett = function(k){ return k === 0 ? picture : (perSettimana[addDays(ws, -7 * k)] || null); };
    var passate = (o.proposals || []).filter(function(p){ return p && p.week_start < ws; });
    var supportati = o.supportedDays || [4, 5];
    var out = [];
    var aggiungi = function(p){ if(!out.some(function(x){ return x.kind === p.kind; })) out.push(p); };
    // Una proposta di questo tipo decisa (accettata o no) nelle ultime n settimane
    var decisaDaPoco = function(kind, nSett, soloAccettate){
      var da = addDays(ws, -7 * nSett);
      return passate.some(function(p){
        return p.kind === kind && p.week_start >= da && (soloAccettate ? p.status === 'accepted' : (p.status === 'accepted' || p.status === 'rejected'));
      });
    };

    var w = picture.weight, n = picture.nutrition, t = picture.training, b = picture.body, bl = picture.blood;
    var pesoAttuale = w ? (w.weight_last != null ? w.weight_last : w.weight_avg) : null;

    // ══ 1. Qualità dei dati: se scatta, niente proposte su calorie e proteine ══
    // Titolo e soglia allineati (Pirsi 080): sotto 3 pesate lo si ricorda, sotto 2 non si decide niente sulle calorie.
    var datiSporchi = false;
    // Metodo 210: in una settimana con la pausa delle pesate o del cibo non si chiede di più
    if(w && (w.weight_n || 0) < PESATE_CONSIGLIATE && !(w.pause_days > 0)){
      var poche = (w.weight_n || 0) < PESATE_MIN;
      if(poche) datiSporchi = true;
      aggiungi({
        kind: 'weigh_in',
        title: 'Pesati almeno 3 volte a settimana',
        reason: 'Pesati almeno 3 volte a settimana, al mattino: ' + (poche ? 'senza pesate non posso guidarti.' : 'con più pesate il ritmo del peso è più sicuro.') + ' Questa settimana ' +
          (w.weight_n === 2 ? 'ne ho viste due.' : w.weight_n ? 'ne ho vista una sola.' : 'non ne ho vista nessuna.'),
        evidence: { numeri: [ { label: 'Pesate della settimana', value: String(w.weight_n || 0) }, { label: 'Minimo per decidere', value: String(PESATE_MIN) } ],
          weight_n: w.weight_n || 0 },
        change: null,
      });
    }
    if(n && (n.days_logged < 4 || n.partial) && !(n.pause_days > 0)){
      datiSporchi = true;
      var registrati = n.logged_dates || [];
      var mancanti = [0,1,2,3,4,5,6].filter(function(i){ return registrati.indexOf(addDays(ws, i)) === -1; }).map(function(i){ return GIORNI[i]; });
      var reason;
      if(n.days_logged < 4){
        reason = 'Registra i pasti anche nei giorni ' + (mancanti.length > 1 ? mancanti.slice(0, -1).join(', ') + ' e ' + mancanti[mancanti.length - 1] : mancanti.join('')) +
          ': questa settimana ho visto solo ' + (n.days_logged === 1 ? '1 giorno' : n.days_logged + ' giorni') + '.';
        if(n.days_logged === 0) reason = 'Registra i pasti: questa settimana non ne ho visto nessuno, e senza non posso dirti niente sulle calorie.';
      } else {
        reason = 'Registra colazione, pranzo e cena: in ' + n.days_partial + ' giorni su ' + n.days_logged + ' ne mancano almeno due, e con giornate a metà le calorie sembrano più basse di quelle vere.';
      }
      aggiungi({
        kind: 'logging',
        title: 'Registra tutti i pasti',
        reason: reason,
        evidence: { numeri: [ { label: 'Giorni registrati', value: n.days_logged + ' / 7' }, { label: 'Giorni con meno di 2 pasti su 3', value: String(n.days_partial || 0) } ],
          days_logged: n.days_logged, days_partial: n.days_partial || 0, partial: !!n.partial, logged_dates: registrati },
        change: null,
      });
    }

    // ══ 2. Peso contro obiettivo: media di 2 settimane contro le 2 precedenti ══
    // ritmo(k) = (media sett. k e k+1 − media sett. k+2 e k+3) / 2, in kg a settimana
    var mediaPeso = function(k){ var p = sett(k); return p && p.weight ? p.weight.weight_avg : null; };
    var ritmo = function(k){
      var a = media([mediaPeso(k), mediaPeso(k + 1)]), c = media([mediaPeso(k + 2), mediaPeso(k + 3)]);
      return a == null || c == null ? null : r2((a - c) / 2);
    };
    var aderenza = function(k){ var p = sett(k); return p && p.nutrition ? p.nutrition.adherence_kcal : null; };
    var dir = direzione(prof, pesoAttuale);
    var r0 = ritmo(0), r1 = ritmo(1), a0 = aderenza(0), a1 = aderenza(1);
    var tk = prof.target_kcal != null ? Number(prof.target_kcal) : null;
    var numeriPeso = function(){
      return [
        { label: 'Ritmo peso', value: segno(r0, 2) + ' kg/sett' },
        { label: 'Ritmo sett. prima', value: segno(r1, 2) + ' kg/sett' },
        { label: 'Medie peso, 4 sett.', value: [0,1,2,3].map(function(k){ return num(mediaPeso(k), 1); }).join(' · ') },
        { label: 'Giorni nel target', value: pct(a0) + (a1 != null ? ' · sett. prima ' + pct(a1) : '') },
      ];
    };
    var datiPeso = function(){ return { direzione: dir, ritmo: r0, ritmo_prec: r1, medie_peso: [0,1,2,3].map(mediaPeso), aderenza: a0, aderenza_prec: a1, target_kcal: tk }; };
    var propostaKcal = function(delta, perche){
      if(tk == null || !isFinite(tk)) return;
      var to = Math.max(KCAL_MIN, Math.min(KCAL_MAX, tk + delta));
      if(to === tk) return;                                  // al limite: non c'è niente da proporre
      var fermo = fermaKcal(delta);
      if(fermo){                                             // Pirsi 080: il contesto vince sul peso
        aggiungi({ kind: 'keep', title: 'Non cambio le calorie', reason: fermo,
          evidence: { numeri: numeriPeso().concat(numeriContesto()), dati: Object.assign(datiPeso(), { contesto: datiContesto() }) }, change: null });
        return;
      }
      if(decisaDaPoco('kcal', 1, true)){                    // una correzione ogni 2 settimane
        aggiungi({ kind: 'keep', title: 'Non cambio le calorie', reason: 'Le calorie le abbiamo cambiate la settimana scorsa: prima di toccarle di nuovo aspetto di vederne l\'effetto.',
          evidence: { numeri: numeriPeso(), dati: datiPeso() }, change: null });
        return;
      }
      aggiungi({
        kind: 'kcal',
        title: 'Da ' + num(tk) + ' a ' + num(to) + ' kcal al giorno',
        reason: perche + (to !== tk + delta ? ' Mi fermo a ' + num(to) + ': sotto i ' + num(KCAL_MIN) + ' e sopra i ' + num(KCAL_MAX) + ' non vado.' : ''),
        evidence: { numeri: numeriPeso(), dati: datiPeso() },
        change: { target_kcal: { from: tk, to: to } },
      });
    };
    var attesa = null;              // il peso chiede una correzione, ma non ancora per due settimane
    var fotoMigliorate = !!(b && b.ai_overall === 'migliorato' && b.ai_confidence === 'alta');

    // ══ Pirsi 080: il contesto che le calorie devono guardare prima di muoversi ══
    // Scarico: le calorie non si toccano. Infortunio: nessun taglio. Fatica alta con calorie sotto
    // l'obiettivo: prima mangia (niente taglio, niente scarico). Peso fermo ma vita o grasso % in calo:
    // stai ricomponendo, non taglio. Ogni fatto che manca (null) non scatta.
    var scarico = !!(t && t.is_deload);
    var infortunio = !!(t && (t.injury_active || t.injury_days > 0));
    var feel = t && t.feel;
    var seduteDure = !!(feel && feel.n >= 2 && feel.dura / feel.n >= FATICA_DURE_MIN);
    var rirCedimento = !!(t && t.avg_rir != null && t.avg_rir <= 0.5);
    var fatica = seduteDure || rirCedimento;
    var pocheCalorie = !!(n && tk && n.kcal_avg != null && n.days_logged >= 4 && n.kcal_avg < tk * KCAL_SOTTO_RATIO);
    var mangiaPrima = fatica && pocheCalorie;
    // vita e grasso %: medie di 2 settimane contro le 2 prima, come il ritmo del peso
    var mediaDi = function(k, campo){ var p = sett(k); return p && p.body && p.body[campo] != null ? p.body[campo] : null; };
    var calo = function(campo){
      var a = media([mediaDi(0, campo), mediaDi(1, campo)]), c = media([mediaDi(2, campo), mediaDi(3, campo)]);
      return a == null || c == null ? null : r2(a - c);
    };
    var caloVita = calo('waist_avg'), caloGrasso = calo('bf_avg');
    // anche il metro del check: ultimo check nella settimana chiusa, vita giù rispetto al check prima
    var vitaCheck = (b && b.last_measurements && b.last_measurements.waist_cm && b.last_check_date && b.last_check_date >= ws) ? b.last_measurements.waist_cm.delta : null;
    var ricomponi = (caloVita != null && caloVita <= -VITA_CALO_CM) || (caloGrasso != null && caloGrasso <= -GRASSO_CALO_PCT) || (vitaCheck != null && vitaCheck <= -VITA_CALO_CM);
    var numeriContesto = function(){
      var righe = [];
      if(feel) righe.push({ label: 'Sedute dure', value: feel.dura + ' / ' + feel.n });
      if(t && t.avg_rir != null) righe.push({ label: 'RIR medio', value: num(t.avg_rir, 1) });
      if(n && n.kcal_avg != null) righe.push({ label: 'Kcal medie', value: num(n.kcal_avg) + (tk ? ' / ' + num(tk) : '') });
      if(caloVita != null) righe.push({ label: 'Vita, 2 sett. contro le 2 prima', value: segno(caloVita, 1) + ' cm' });
      if(caloGrasso != null) righe.push({ label: 'Grasso %, 2 sett. contro le 2 prima', value: segno(caloGrasso, 1) + ' punti' });
      if(vitaCheck != null) righe.push({ label: 'Vita al check', value: segno(vitaCheck, 1) + ' cm' });
      return righe;
    };
    var datiContesto = function(){ return { scarico: scarico, infortunio: infortunio, fatica: fatica, sedute_dure: feel ? [feel.dura, feel.n] : null, poche_calorie: pocheCalorie, calo_vita: caloVita, calo_grasso: caloGrasso, vita_check: vitaCheck, ricomposizione: ricomponi }; };
    // Vale per ogni correzione delle calorie: torna il motivo per cui NON si tocca, o null se si può.
    var fermaKcal = function(delta){
      if(scarico) return 'Questa è una settimana di scarico: le calorie non si toccano, il peso in scarico non dice niente di affidabile.';
      if(delta < 0 && infortunio) return 'Hai un infortunio in corso: non taglio le calorie, il corpo deve riparare.';
      if(delta < 0 && n && n.pause_days > 0) return 'Sei in pausa anche col cibo (' + n.pause_days + (n.pause_days === 1 ? ' giorno' : ' giorni') + ' questa settimana): non taglio le calorie su una settimana così.';
      if(delta < 0 && mangiaPrima) return 'Le sedute ti pesano (' + (seduteDure ? feel.dura + ' su ' + feel.n + ' dette «dure»' : 'RIR medio ' + num(t.avg_rir, 1)) + ') e mangi sotto l\'obiettivo (' + num(n.kcal_avg) + ' kcal su ' + num(tk) + '): prima mangia, non taglio.';
      if(delta < 0 && ricomponi) return 'Il peso è fermo ma ' + (caloVita != null && caloVita <= -VITA_CALO_CM ? 'la vita scende (' + segno(caloVita, 1) + ' cm)' : caloGrasso != null && caloGrasso <= -GRASSO_CALO_PCT ? 'il grasso scende (' + segno(caloGrasso, 1) + ' punti)' : 'la vita al check scende (' + segno(vitaCheck, 1) + ' cm)') + ': stai ricomponendo, non taglio le calorie.';
      return null;
    };
    var keepFoto = function(){
      aggiungi({ kind: 'keep', title: 'Non cambio nulla',
        reason: 'Peso fermo ma foto migliorate: probabile ricomposizione, non cambio nulla. Il ritmo è ' + segno(r0, 2) + ' kg a settimana e la lettura delle foto del ' + (b.ai_check_date || '') + ' dice «migliorato» con affidabilità alta.',
        evidence: { numeri: numeriPeso().concat([{ label: 'Lettura delle foto', value: 'migliorato · alta' }]), dati: datiPeso() }, change: null });
    };

    if(!datiSporchi && w && r0 != null){
      var ritmoTxt = segno(r0, 2) + ' kg a settimana';
      if(dir === 'dimagrire'){
        if(r0 < -0.7){
          propostaKcal(100, 'Stai perdendo troppo in fretta (' + ritmoTxt + ', il ritmo giusto è fra 0,3 e 0,7): aggiungo 100 kcal.');
          aggiungi({ kind: 'keep', title: 'Proteine come sono',
            reason: 'Le proteine restano ' + (prof.target_protein ? 'a ' + num(prof.target_protein) + ' g' : 'come sono') + ': quando si scende in fretta sono quelle che proteggono il muscolo.',
            evidence: { numeri: numeriPeso(), dati: datiPeso() }, change: null });
        } else if(r0 <= -0.3){
          aggiungi({ kind: 'keep', title: 'Non cambio nulla',
            reason: 'Stai scendendo di ' + num(Math.abs(r0), 2) + ' kg a settimana, dentro il ritmo giusto (0,3-0,7): non cambio nulla.',
            evidence: { numeri: numeriPeso(), dati: datiPeso() }, change: null });
        } else if(r0 <= 0.2){
          if(fotoMigliorate) keepFoto();
          else if(r1 != null && r1 > -0.3 && r1 <= 0.2 && a0 != null && a1 != null && a0 >= ADERENZA_MIN && a1 >= ADERENZA_MIN){
            propostaKcal(-150, 'Da due settimane il peso è fermo (' + ritmoTxt + ', una settimana fa ' + segno(r1, 2) + ') e hai centrato il target nel ' + pct(a0) + ' dei giorni: tolgo 150 kcal.');
          } else {
            attesa = (r1 != null && r1 > -0.3 && r1 <= 0.2)
              ? 'il peso è fermo (' + ritmoTxt + '), ma il target l\'hai centrato solo nel ' + pct(a0) + ' dei giorni: prima di togliere calorie voglio giornate in target'
              : 'il peso è fermo da una settimana sola (' + ritmoTxt + '): aspetto la prossima prima di toccare le calorie';
          }
        } else {
          if(fotoMigliorate) keepFoto();
          else if(a0 != null && a0 >= ADERENZA_MIN){
            propostaKcal(-200, 'Il peso sale (' + ritmoTxt + ') anche se hai centrato il target nel ' + pct(a0) + ' dei giorni: tolgo 200 kcal.');
          } else {
            aggiungi({ kind: 'logging', title: 'Prima di tagliare, registriamo tutto',
              reason: 'Il peso sale (' + ritmoTxt + '), ma il target l\'hai centrato solo nel ' + pct(a0) + ' dei giorni: prima di togliere calorie voglio vedere giornate complete.',
              evidence: { numeri: numeriPeso(), dati: datiPeso() }, change: null });
          }
        }
      } else if(dir === 'massa'){
        if(r0 > 0.5){
          propostaKcal(-100, 'Stai salendo troppo in fretta (' + ritmoTxt + ', il ritmo giusto è fra 0,2 e 0,4): tolgo 100 kcal per non mettere solo grasso.');
        } else if(r0 >= 0.2){
          aggiungi({ kind: 'keep', title: 'Non cambio nulla',
            reason: 'Stai salendo di ' + num(r0, 2) + ' kg a settimana, ' + (r0 <= 0.4 ? 'dentro il ritmo giusto (0,2-0,4)' : 'appena sopra il ritmo giusto, ma non abbastanza da correggere') + ': non cambio nulla.',
            evidence: { numeri: numeriPeso(), dati: datiPeso() }, change: null });
        } else if(fotoMigliorate){
          keepFoto();
        } else if(r1 == null || r1 >= 0.2){
          attesa = 'il peso sale meno del previsto da una settimana sola (' + ritmoTxt + '): aspetto la prossima prima di toccare le calorie';
        } else {
          if(a0 != null && a1 != null && a0 >= ADERENZA_MIN && a1 >= ADERENZA_MIN){
            propostaKcal(150, 'Da due settimane il peso non sale (' + ritmoTxt + ', una settimana fa ' + segno(r1, 2) + ') e hai centrato il target nel ' + pct(a0) + ' dei giorni: aggiungo 150 kcal.');
          } else {
            aggiungi({ kind: 'logging', title: 'Prima di aggiungere, registriamo tutto',
              reason: 'Il peso non sale (' + ritmoTxt + '), ma il target l\'hai centrato solo nel ' + pct(a0) + ' dei giorni: prima di aggiungere calorie voglio vedere giornate complete.',
              evidence: { numeri: numeriPeso(), dati: datiPeso() }, change: null });
          }
        }
      } else {
        if(r1 != null && r0 > 0.3 && r1 > 0.3){
          propostaKcal(-100, 'Da due settimane il peso sale (' + ritmoTxt + ', una settimana fa ' + segno(r1, 2) + ') e l\'obiettivo è mantenerlo: tolgo 100 kcal.');
        } else if(r1 != null && r0 < -0.3 && r1 < -0.3){
          propostaKcal(100, 'Da due settimane il peso scende (' + ritmoTxt + ', una settimana fa ' + segno(r1, 2) + ') e l\'obiettivo è mantenerlo: aggiungo 100 kcal.');
        } else if(Math.abs(r0) <= 0.3){
          aggiungi({ kind: 'keep', title: 'Non cambio nulla',
            reason: 'Il peso si muove di ' + ritmoTxt + ', dentro ±0,3: per mantenere va bene così.',
            evidence: { numeri: numeriPeso(), dati: datiPeso() }, change: null });
        } else {
          attesa = 'il peso si è spostato di ' + ritmoTxt + ', ma da una settimana sola: aspetto la prossima prima di toccare le calorie';
        }
      }
    }

    // ── Proteine: sotto 1,6 g/kg per 2 settimane → target a 1,8 g/kg (arrotondato a 5 g) ──
    if(!datiSporchi && n && pesoAttuale != null){
      var soglia = 1.6 * pesoAttuale;
      var prima = sett(1) && sett(1).nutrition ? sett(1).nutrition.protein_avg : null;
      var nuovo = Math.round(1.8 * pesoAttuale / 5) * 5;
      var attuale = prof.target_protein != null ? Number(prof.target_protein) : null;
      // Solo se il target va davvero ALZATO: se è già sopra 1,8 g/kg il problema è mangiarle, non il numero.
      if(n.protein_avg != null && prima != null && n.protein_avg < soglia && prima < soglia && (attuale == null || nuovo > attuale)){
        aggiungi({
          kind: 'protein',
          title: 'Proteine a ' + num(nuovo) + ' g al giorno',
          reason: 'Da due settimane mangi in media ' + num(n.protein_avg) + ' g di proteine (una settimana fa ' + num(prima) + '), sotto 1,6 g per kg: con ' + num(pesoAttuale, 1) + ' kg il target giusto è 1,8 g per kg.',
          evidence: { numeri: [ { label: 'Proteine medie', value: num(n.protein_avg) + ' g · sett. prima ' + num(prima) + ' g' },
                                { label: 'Soglia 1,6 g/kg', value: num(soglia) + ' g' }, { label: 'Peso', value: num(pesoAttuale, 1) + ' kg' } ],
            protein_avg: n.protein_avg, protein_avg_prec: prima, peso: pesoAttuale, g_per_kg: 1.8 },
          change: { target_protein: { from: attuale, to: nuovo } },
        });
      }
    }

    // ══ 3. Allenamento ══
    var t1 = sett(1) && sett(1).training;
    // Pirsi 080: fatica alta e calorie sotto l'obiettivo → prima mangia, poi (se serve) lo scarico
    if(mangiaPrima && !scarico){
      aggiungi({ kind: 'eat_first', title: 'Prima mangia, poi lo scarico',
        reason: 'Le sedute ti pesano (' + (seduteDure ? feel.dura + ' su ' + feel.n + ' dette «dure»' : 'RIR medio ' + num(t.avg_rir, 1)) + ') ma mangi sotto l\'obiettivo: ' + num(n.kcal_avg) + ' kcal al giorno su ' + num(tk) + '. Prima di scaricare, mangia quello che hai come obiettivo per una settimana: la fatica spesso è fame.',
        evidence: { numeri: numeriContesto(), dati: datiContesto() }, change: null });
    }
    // Una settimana con infortunio o con giorni di pausa programmata (Training 350) non dice niente
    // sul volume che la persona regge: non si propone «meno giorni» guardandola.
    var senzaInfortunio = function(x){ return x && !x.injury_active && !(x.injury_days > 0) && !(x.pause_days > 0); };
    if(t && t1 && t.sessions_planned != null && t.sessions_planned > 3 && t1.sessions_planned != null &&
       t.sessions_done < t.sessions_planned && t1.sessions_done < t1.sessions_planned &&
       senzaInfortunio(t) && senzaInfortunio(t1) && !decisaDaPoco('training_volume', RAFFREDDAMENTO_SETT, true)){
      var nuoviGiorni = t.sessions_planned - 1;
      aggiungi({
        kind: 'training_volume',
        title: num(nuoviGiorni) + ' allenamenti a settimana invece di ' + num(t.sessions_planned),
        reason: 'Meglio ' + nuoviGiorni + ' fatte che ' + t.sessions_planned + ' previste: nelle ultime due settimane ne hai fatte ' + t.sessions_done + ' e ' + t1.sessions_done + ' su ' + t.sessions_planned + ', senza infortuni di mezzo.' +
          (supportati.indexOf(nuoviGiorni) === -1 ? ' La scheda a ' + nuoviGiorni + ' giorni non c\'è ancora: per ora tieni la tua e fanne ' + nuoviGiorni + '.' : ''),
        evidence: { numeri: [ { label: 'Sessioni fatte', value: t.sessions_done + ' / ' + t.sessions_planned + ' · sett. prima ' + t1.sessions_done + ' / ' + t1.sessions_planned } ],
          sessions_done: [t.sessions_done, t1.sessions_done], sessions_planned: t.sessions_planned, rotation_exists: supportati.indexOf(nuoviGiorni) !== -1 },
        change: { giorni_allenamento: { from: t.sessions_planned, to: nuoviGiorni } },
      });
    }
    if(t && !t.is_deload && t.block_week !== 6 && !mangiaPrima && !decisaDaPoco('deload', RAFFREDDAMENTO_SETT, true)){
      var rirBasso = t.avg_rir != null && t.avg_rir <= 0.5 && t1 && t1.avg_rir != null && t1.avg_rir <= 0.5;
      var infortunioTardi = !!t.injury_active && t.block_week != null && t.block_week >= 4;
      if(rirBasso || infortunioTardi){
        aggiungi({
          kind: 'deload',
          title: 'Scarico da questa settimana',
          reason: rirBasso
            ? 'Da due settimane chiudi le serie quasi a cedimento (RIR medio ' + num(t.avg_rir, 1) + ' e ' + num(t1.avg_rir, 1) + '): anticipo lo scarico. Stessi esercizi e serie, carichi più leggeri.'
            : 'Sei alla settimana ' + t.block_week + ' del blocco con un infortunio in corso: anticipo lo scarico. Stessi esercizi e serie, carichi più leggeri.',
          evidence: { numeri: [ { label: 'RIR medio', value: num(t.avg_rir, 1) + (t1 ? ' · sett. prima ' + num(t1.avg_rir, 1) : '') },
                                { label: 'Settimana del blocco', value: String(t.block_week != null ? t.block_week : '—') },
                                { label: 'Infortunio', value: t.injury_active ? 'in corso' : 'no' } ],
            avg_rir: [t.avg_rir, t1 ? t1.avg_rir : null], block_week: t.block_week, injury_active: !!t.injury_active },
          change: { cycle_week: { from: t.block_week, to: 6 } },
        });
      }
    }
    var numeriCheck = function(){ return [ { label: 'Ultimo check', value: b && b.last_check_date ? b.last_check_date + ' · ' + b.days_since_check + ' giorni fa' : 'mai' } ]; };
    if(t && t.block_week === 6 && b && (b.days_since_check == null || b.days_since_check >= 28) && !decisaDaPoco('check', RAFFREDDAMENTO_SETT)){
      aggiungi({ kind: 'check', title: 'Fai il check fisico',
        reason: 'Blocco finito: fai il check fisico prima di ripartire. ' + (b.last_check_date ? 'L\'ultimo è di ' + b.days_since_check + ' giorni fa.' : 'Non ne hai ancora fatto uno.'),
        evidence: { numeri: numeriCheck().concat([{ label: 'Settimana del blocco', value: '6 di 6' }]), days_since_check: b.days_since_check, block_week: 6 }, change: null });
    }

    // ══ 4. Corpo ed esami ══
    if(b && ((b.days_since_check != null && b.days_since_check >= 42) || (b.days_since_check == null && b.check_due)) && !decisaDaPoco('check', RAFFREDDAMENTO_SETT)){
      aggiungi({ kind: 'check', title: 'Fai il check fisico',
        reason: b.last_check_date ? 'Sono passati ' + b.days_since_check + ' giorni dall\'ultimo check: è il momento di rifarlo, misure e foto.' : 'Non hai ancora fatto un check fisico: misure e foto sono il punto di partenza per vedere i cambiamenti.',
        evidence: { numeri: numeriCheck(), days_since_check: b.days_since_check }, change: null });
    }
    if(bl && (bl.test_count === 0 || (bl.days_since_test != null && bl.days_since_test >= 180)) && !decisaDaPoco('blood_test', RAFFREDDAMENTO_SETT)){
      var mesi = bl.days_since_test != null ? Math.floor(bl.days_since_test / 30) : null;
      aggiungi({ kind: 'blood_test', title: 'Esami del sangue',
        reason: bl.test_count === 0 ? 'Non hai ancora registrato esami del sangue: parlane con il medico.' : 'Sono passati ' + mesi + ' mesi dagli ultimi esami: parlane con il medico.',
        evidence: { numeri: [ { label: 'Ultimi esami', value: bl.last_test_date ? bl.last_test_date + ' · ' + bl.days_since_test + ' giorni fa' : 'nessuno registrato' } ],
          test_count: bl.test_count, days_since_test: bl.days_since_test }, change: null });
    }

    // ══ Regola generale: nulla da proporre → un "keep" che dice perché ══
    if(!out.length){
      var righe = [];
      if(w && w.weight_avg != null) righe.push({ label: 'Peso medio', value: num(w.weight_avg, 1) + ' kg' + (r0 != null ? ' · ' + segno(r0, 2) + ' kg/sett' : '') });
      if(n && n.kcal_avg != null) righe.push({ label: 'Kcal medie', value: num(n.kcal_avg) + (tk ? ' / ' + num(tk) : '') });
      if(t && t.sessions_planned != null) righe.push({ label: 'Sessioni', value: t.sessions_done + ' / ' + t.sessions_planned });
      var motivi = [];
      if(attesa) motivi.push(attesa);
      else if(r0 == null && w) motivi.push('per il ritmo del peso mi servono ancora un paio di settimane di pesate');
      else motivi.push('peso, pasti e allenamenti sono in linea');
      aggiungi({ kind: 'keep', title: 'Questa settimana non cambio nulla',
        reason: 'Questa settimana non cambio nulla: ' + motivi.join(', ') + '.',
        evidence: { numeri: righe, dati: datiPeso() }, change: null });
    }

    out.sort(function(a, b){ return ORDINE[a.kind] - ORDINE[b.kind]; });
    return out.slice(0, MAX_PROPOSTE).map(function(p){
      p.evidence = Object.assign({ rules_version: RULES_VERSION, week_start: ws }, p.evidence);
      return p;
    });
  }

  // ── La variante più facile (Training 330, 11 ottobre 2026) ──────────────────
  // Quando la progressione dice «variante più facile» il coach deve dire QUALE esercizio
  // e come si fa. La scelta è una regola pura sulle righe del catalogo, senza rete:
  //   1. le «alternativa» scritte a catalogo (codici EX###, mai sé stesso), nell'ordine in cui
  //      sono scritte, se la persona le può fare (luogo e attrezzi);
  //   2. altrimenti un esercizio dello stesso schema di movimento (per isolamenti e core anche
  //      stesso gruppo bersaglio), di livello più basso, che la persona può fare, fuori dalla scheda;
  //      prima i livelli più bassi, poi per codice, così la scelta è sempre la stessa.
  // Chi può fare cosa: le stesse regole del generatore (luogo con alias aperto↔libero, bypass del
  // surrogato a casa; a casa un attrezzo nativo posseduto o tutti quelli del surrogato; all'aperto
  // la lista dei portatili; in palestra tutto).
  var VF_LIVELLI = { principiante: 1, intermedio: 2, avanzato: 3 };
  var VF_APERTO = ['corpo_libero', 'elastico', 'banda', 'sbarra', 'cavigliere', 'trx'];
  var VF_RIGA_MAX = 140;

  function vfNorm(s){ return String(s || '').toLowerCase().trim(); }
  function vfAttrezzo(s){ return vfNorm(s).replace(/\s+/g, '_'); }
  function vfLista(s, sep){ return vfNorm(s).split(sep).map(function(x){ return x.trim(); }).filter(Boolean); }
  function vfLivello(ex){ var l = vfNorm(ex && ex.livello); return VF_LIVELLI[l] || (/avanz/.test(l) ? 3 : /interm/.test(l) ? 2 : /princ/.test(l) ? 1 : 0); }

  // true se la persona può fare l'esercizio con il suo luogo e i suoi attrezzi.
  function puoFare(ex, opts){
    var luogo = vfNorm(opts && opts.tipoAllen) || 'casa';
    var alias = luogo === 'aperto' ? 'libero' : luogo === 'libero' ? 'aperto' : null;
    var attrezzi = {};
    ((opts && opts.attrezzatura) || []).forEach(function(a){ attrezzi[vfAttrezzo(a)] = true; });
    var luoghi = vfLista(ex.luogo, ';');
    var surrogati = vfLista(ex.surrogato_attrezzo, '+').map(vfAttrezzo);
    var luogoOk = !luoghi.length || luoghi.indexOf('qualsiasi') !== -1 || luoghi.indexOf(luogo) !== -1
      || (alias && luoghi.indexOf(alias) !== -1) || (luogo === 'casa' && surrogati.length > 0);
    if(!luogoOk) return false;
    var nativi = vfLista(vfAttrezzo(ex.attrezzo), ';');
    if(luogo === 'palestra') return true;
    if(luogo === 'casa'){
      if(nativi.some(function(a){ return attrezzi[a]; })) return true;
      return surrogati.length > 0 && surrogati.every(function(a){ return attrezzi[a]; });
    }
    return nativi.some(function(a){ return VF_APERTO.indexOf(a) !== -1; });
  }

  // Le due righe «come si fa»: la prima frase del setup e la prima dell'esecuzione del catalogo.
  function comeSiFa(ex){
    var prima = function(t){
      var s = String(t || '').replace(/\s+/g, ' ').trim();
      if(!s) return '';
      var m = s.match(/^(.+?[.!?])(\s|$)/);
      s = m ? m[1] : s;
      return s.length > VF_RIGA_MAX ? s.slice(0, VF_RIGA_MAX - 1).replace(/\s+\S*$/, '') + '…' : s;
    };
    return [prima(ex && ex.setup), prima(ex && ex.esecuzione)].filter(Boolean);
  }

  // attuale: riga di catalogo dell'esercizio in corso · catalogo: righe fra cui scegliere (anche
  // tutte) · opts: { tipoAllen, attrezzatura, inScheda: [codici] }. → { codice, nome, come, via } | null
  function varianteFacile(attuale, catalogo, opts){
    if(!attuale || !attuale.codice) return null;
    var righe = (catalogo || []).filter(function(ex){ return ex && ex.codice && ex.codice !== attuale.codice; });
    var perCodice = {};
    righe.forEach(function(ex){ perCodice[ex.codice] = ex; });
    var o = opts || {};
    var inScheda = {};
    (o.inScheda || []).forEach(function(c){ inScheda[c] = true; });
    var esito = function(ex, via){ return { codice: ex.codice, nome: ex.nome || ex.codice, come: comeSiFa(ex), via: via }; };

    var scritte = (String(attuale.alternativa || '').match(/\bEX\d{3}\b/g) || []);
    for(var i = 0; i < scritte.length; i++){
      var alt = perCodice[scritte[i]];
      if(alt && alt.codice !== attuale.codice && puoFare(alt, o)) return esito(alt, 'alternativa');
    }

    var pat = vfNorm(attuale.pattern);
    if(!pat) return null;
    var perGruppo = pat === 'isolamento' || pat === 'core';
    var gruppi = vfLista(attuale.gruppo_target, ';');
    var livAttuale = vfLivello(attuale) || 2;
    var cand = righe.filter(function(ex){
      if(inScheda[ex.codice] || vfNorm(ex.pattern) !== pat) return false;
      if(perGruppo && !vfLista(ex.gruppo_target, ';').some(function(g){ return gruppi.indexOf(g) !== -1; })) return false;
      var l = vfLivello(ex);
      return l > 0 && l < livAttuale && puoFare(ex, o);
    }).sort(function(a, b){ return (vfLivello(a) - vfLivello(b)) || String(a.codice).localeCompare(String(b.codice)); });
    return cand.length ? esito(cand[0], 'livello') : null;
  }

  // ── La variante più difficile (Training 430, 20 ottobre 2026) ───────────────
  // Quando la via di progressione è «variante più difficile» il coach dice QUALE. Il catalogo non ha
  // ancora una colonna per questo (chiesta a ZT-Catalogo, scelta di Ignazio): finché non c'è vale una
  // regola, sempre nella stessa famiglia (la prima parola del nome, Nomenclatura regola 11) e di livello
  // più alto, fra gli esercizi che la persona può fare e che non sono già nella seduta:
  //   0. la colonna `variante_difficile` (codice EX###) quando il foglio la scrive: vince lei;
  //   1. le «alternativa» scritte nella riga, se più difficili;
  //   2. le righe che hanno questo esercizio come «alternativa» (il gradino sopra rimanda a quello sotto);
  //   3. lo stesso schema di movimento, il livello subito sopra, poi per codice.
  // → { codice, nome, come, via } | null (nessuna: il coach lo dice e resta su più ripetizioni)
  function vfFamiglia(ex){ return vfNorm(ex && ex.nome).split(/\s+/)[0] || ''; }
  function varianteDifficile(attuale, catalogo, opts){
    if(!attuale || !attuale.codice) return null;
    var righe = (catalogo || []).filter(function(ex){ return ex && ex.codice && ex.codice !== attuale.codice; });
    var perCodice = {};
    righe.forEach(function(ex){ perCodice[ex.codice] = ex; });
    var o = opts || {};
    var inScheda = {};
    (o.inScheda || []).forEach(function(c){ inScheda[c] = true; });
    var esito = function(ex, via){ return { codice: ex.codice, nome: ex.nome || ex.codice, come: comeSiFa(ex), via: via }; };
    var codici = function(s){ return String(s || '').match(/\bEX\d{3}\b/g) || []; };

    var scelta = codici(attuale.variante_difficile)[0];
    if(scelta && perCodice[scelta] && puoFare(perCodice[scelta], o)) return esito(perCodice[scelta], 'foglio');

    var fam = vfFamiglia(attuale);
    var livAttuale = vfLivello(attuale) || 2;
    var buona = function(ex){ return !inScheda[ex.codice] && vfFamiglia(ex) === fam && vfLivello(ex) > livAttuale && puoFare(ex, o); };
    var ordina = function(a, b){ return (vfLivello(a) - vfLivello(b)) || String(a.codice).localeCompare(String(b.codice)); };

    var scritte = codici(attuale.alternativa);
    for(var i = 0; i < scritte.length; i++){
      var alt = perCodice[scritte[i]];
      if(alt && buona(alt)) return esito(alt, 'alternativa');
    }
    var rimandi = righe.filter(function(ex){ return codici(ex.alternativa).indexOf(attuale.codice) !== -1 && buona(ex); }).sort(ordina);
    if(rimandi.length) return esito(rimandi[0], 'rimando');
    var pat = vfNorm(attuale.pattern);
    if(!pat) return null;
    var cand = righe.filter(function(ex){ return vfNorm(ex.pattern) === pat && buona(ex); }).sort(ordina);
    return cand.length ? esito(cand[0], 'livello') : null;
  }

  // ── La voce di Pirsi (Pirsi 040, 13 ottobre 2026): una sola identità e un solo registro, scritti qui e basta ──
  // Ogni prompt che parla alla persona inizia con voce(): cue del recupero, nota di scheda, annuncio del piano,
  // 14 pasti, consiglio sul pasto, lettura delle foto nel Worker. Prima ogni prompt si presentava a modo suo
  // («coach di forza e ipertrofia», «coach nutrizionale esperto in dieta a Zona 40-30-30»…) e il registro era
  // copiato a mano in cinque posti. Il nome è scritto per esteso: nel prompt il modello lo legge come testo,
  // non come dato (docs/COACH.md); fuori dai prompt vale COACH_NAME. Età, note di salute, luogo e attrezzi
  // non stanno qui: arrivano dal ritratto (shared/ritratto.js), così il consiglio è di chi lo riceve.
  var IDENTITA = 'Sei Pirsi, il coach di Zona Tracker: segui la stessa persona nell\'allenamento, nel cibo e in come sta. ' +
    'Parla sempre in prima persona e dai del tu: non nominarti in terza persona, non firmarti, non ripetere il tuo nome nel testo. ' +
    'Calorie e macro giusti sono quelli dell\'obiettivo della persona, come li trovi nel ritratto: nessuna formula fissa.';
  var REGISTRO = 'REGISTRO (vale sempre): parli come un amico diretto e schietto. Quando i dati sono buoni lo dici senza enfasi. Quando sono cattivi dici prima il fatto, poi una riga di spinta: il fatto non va nascosto dietro la frase di incoraggiamento, e non ti fermi al fatto nudo. Resta concreto: se hai numeri o eventi reali usa quelli, invece di riempire con frasi motivazionali generiche.';
  // voce({ registro:false }) per i cue del recupero: tre parole a fiato corto, lì Pirsi non ha voce (docs/COACH.md).
  function voce(opts){
    return (opts && opts.registro === false) ? IDENTITA : IDENTITA + '\n\n' + REGISTRO;
  }

  return { RULES_VERSION: RULES_VERSION, KCAL_MIN: KCAL_MIN, KCAL_MAX: KCAL_MAX, direzione: direzione, buildProposals: buildProposals,
    varianteFacile: varianteFacile, varianteDifficile: varianteDifficile, comeSiFa: comeSiFa, puoFare: puoFare, voce: voce, IDENTITA: IDENTITA, REGISTRO: REGISTRO };
})();
if(typeof module === 'object' && module && module.exports) module.exports = ZTCoachRules;
