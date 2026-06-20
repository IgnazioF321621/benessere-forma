// Cloudflare Worker — Zona Tracker AI Proxy + Exercise Media cache
// Routes:
//   POST /                 -> proxy Groq (compat backwards: tutto il traffico esistente)
//   GET  /exercise-media   -> lookup cache Supabase + auto-fill da ExerciseDB
//                            params: ?name=<nome_italiano>  (20 storici)
//                                    ?code=<EX###>          (39 nuovi, catalogo)

const SUPABASE_URL = 'https://qxiyeiahpoiliwpqslpr.supabase.co';
const STORAGE_BUCKET = 'exercise-media';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Match approvati esercizio-per-esercizio da Ignazio — lookup per NOME (20 storici).
// Storage layout: cached_url punta a {edbId}.gif (1 GIF per exerciseId, riuso fra
// piu' nomi italiani che mappano allo stesso esercizio ExerciseDB).
const MATCH_DATA = {
  'Trazioni alla sbarra': {
    edbId: 'lBDjFxJ',
    edbName: 'pull-up',
    gifUrl: 'https://static.exercisedb.dev/media/lBDjFxJ.gif',
    equipments: ['body weight'],
    targetMuscles: ['lats'],
    isSurrogate: false,
    surrogateNote: null,
  },
  'Chest press in piedi con elastico': {
    edbId: '4x5Okof',
    edbName: 'resistance band seated chest press',
    gifUrl: 'https://static.exercisedb.dev/media/4x5Okof.gif',
    equipments: ['resistance band'],
    targetMuscles: ['pectorals'],
    isSurrogate: true,
    surrogateNote: 'Movimento simile, qui mostrato seduto. Eseguilo in piedi.',
  },
  'Row in piedi con elastico': {
    edbId: '4f8RXP8',
    edbName: 'cable standing row (v-bar)',
    gifUrl: 'https://static.exercisedb.dev/media/4f8RXP8.gif',
    equipments: ['cable'],
    targetMuscles: ['upper back'],
    isSurrogate: true,
    surrogateNote: 'Esegui con barra lunga e presa larga pronata (la GIF mostra presa stretta a V).',
  },
  'Face pull con elastico': {
    edbId: 'ZfyAGhK',
    edbName: 'cable standing rear delt row (with rope)',
    gifUrl: 'https://static.exercisedb.dev/media/ZfyAGhK.gif',
    equipments: ['cable'],
    targetMuscles: ['delts'],
    isSurrogate: false,
    surrogateNote: null,
  },
  'Shoulder press in piedi con elastico': {
    edbId: 'peAeMR3',
    edbName: 'band shoulder press',
    gifUrl: 'https://static.exercisedb.dev/media/peAeMR3.gif',
    equipments: ['band'],
    targetMuscles: ['delts'],
    isSurrogate: true,
    surrogateNote: "Eseguilo con entrambi i piedi sull'elastico per maggiore tensione e stabilita.",
  },
  'Bulgarian split squat con elastico': {
    edbId: 'y8bYM8w',
    edbName: 'band single leg split squat',
    gifUrl: 'https://static.exercisedb.dev/media/y8bYM8w.gif',
    equipments: ['band'],
    targetMuscles: ['quads'],
    isSurrogate: true,
    surrogateNote: 'Aggiungi tallone posteriore sulla panca e tallone anteriore rialzato 3-5 cm per la versione bulgara.',
  },
  'Romanian deadlift con elastico': {
    edbId: 'kuMiR2T',
    edbName: 'band stiff leg deadlift',
    gifUrl: 'https://static.exercisedb.dev/media/kuMiR2T.gif',
    equipments: ['band'],
    targetMuscles: ['glutes'],
    isSurrogate: true,
    surrogateNote: 'Tu impugna la barra modulare davanti alle cosce, presa pronata.',
  },
  'Hip thrust con elastico': {
    edbId: 'qKBpF7I',
    edbName: 'barbell glute bridge',
    gifUrl: 'https://static.exercisedb.dev/media/qKBpF7I.gif',
    equipments: ['barbell'],
    targetMuscles: ['glutes'],
    isSurrogate: true,
    surrogateNote: 'Spalle sulla panca, elastico sopra le anche.',
  },
  'Glute bridge isometrico con cavigliera': {
    edbId: 'u0cNiij',
    edbName: 'low glute bridge on floor',
    gifUrl: 'https://static.exercisedb.dev/media/u0cNiij.gif',
    equipments: ['body weight'],
    targetMuscles: ['glutes'],
    isSurrogate: true,
    surrogateNote: "Tenuta isometrica 30 sec con cavigliera al ginocchio ed elastico ancorato dal lato opposto. Una gamba per volta.",
  },
  'Inverted row con elastico': {
    edbId: 'Nu7jqFE',
    edbName: 'resistance band seated straight back row',
    gifUrl: 'https://static.exercisedb.dev/media/Nu7jqFE.gif',
    equipments: ['resistance band'],
    targetMuscles: ['upper back'],
    isSurrogate: true,
    surrogateNote: "Tu in piedi col busto inclinato 45°, elastico ancorato basso.",
  },
  'Chest press inclinata su panca': {
    edbId: 'Vh0GsK4',
    edbName: 'cable incline bench press',
    gifUrl: 'https://static.exercisedb.dev/media/Vh0GsK4.gif',
    equipments: ['cable'],
    targetMuscles: ['pectorals'],
    isSurrogate: true,
    surrogateNote: "Tu sdraiato su panca inclinata 30-45° con elastico ancorato basso.",
  },
  'Lateral raise con elastico': {
    edbId: 'DsgkuIt',
    edbName: 'dumbbell lateral raise',
    gifUrl: 'https://static.exercisedb.dev/media/DsgkuIt.gif',
    equipments: ['dumbbell'],
    targetMuscles: ['delts'],
    isSurrogate: true,
    surrogateNote: "Elastico sotto i piedi al posto dei manubri.",
  },
  'Row inclinato in piedi busto 45°': {
    edbId: 'eZyBC3j',
    edbName: 'barbell bent over row',
    gifUrl: 'https://static.exercisedb.dev/media/eZyBC3j.gif',
    equipments: ['barbell'],
    targetMuscles: ['upper back'],
    isSurrogate: true,
    surrogateNote: "Barra modulare con elastico al posto del bilanciere.",
  },
  'Curl bicipiti con elastico': {
    edbId: 'XFc3vpY',
    edbName: 'resistance band seated biceps curl',
    gifUrl: 'https://static.exercisedb.dev/media/XFc3vpY.gif',
    equipments: ['resistance band'],
    targetMuscles: ['biceps'],
    isSurrogate: true,
    surrogateNote: "Tu in piedi sopra l'elastico al posto che seduto.",
  },
  'Tricipiti overhead con elastico': {
    edbId: '2IxROQ1',
    edbName: 'cable overhead triceps extension (rope attachment)',
    gifUrl: 'https://static.exercisedb.dev/media/2IxROQ1.gif',
    equipments: ['cable'],
    targetMuscles: ['triceps'],
    isSurrogate: false,
    surrogateNote: null,
  },
  'Squat con elastico e talloni rialzati': {
    edbId: 'zG0zs85',
    edbName: 'barbell front squat',
    gifUrl: 'https://static.exercisedb.dev/media/zG0zs85.gif',
    equipments: ['barbell'],
    targetMuscles: ['glutes'],
    isSurrogate: true,
    surrogateNote: "Tu con 2 maniglie elastico in front rack e talloni su rialzo 3-5 cm.",
  },
  'Single leg Romanian deadlift con elastico': {
    edbId: 'gKozT8X',
    edbName: 'dumbbell single leg deadlift',
    gifUrl: 'https://static.exercisedb.dev/media/gKozT8X.gif',
    equipments: ['dumbbell'],
    targetMuscles: ['glutes'],
    isSurrogate: true,
    surrogateNote: "Elastico sotto il piede d'appoggio. Maniglia nella mano opposta alla gamba d'appoggio.",
  },
  'Hip thrust con elastico TUT alto': {
    edbId: 'qKBpF7I',
    edbName: 'barbell glute bridge',
    gifUrl: 'https://static.exercisedb.dev/media/qKBpF7I.gif',
    equipments: ['barbell'],
    targetMuscles: ['glutes'],
    isSurrogate: true,
    surrogateNote: "Spalle sulla panca, elastico sopra le anche. TUT alto = tempo sotto tensione lungo: eccentrica 4 sec in discesa, niente rebound.",
  },
  'Leg curl con elastico sulla fitball': {
    edbId: 'GOJKFfO',
    edbName: 'exercise ball one legged diagonal kick hamstring curl',
    gifUrl: 'https://static.exercisedb.dev/media/GOJKFfO.gif',
    equipments: ['stability ball'],
    targetMuscles: ['hamstrings'],
    isSurrogate: true,
    surrogateNote: "Movimento bilaterale: entrambe le gambe trascinano la palla verso i glutei, niente kick diagonale.",
  },
  'Calf raise con elastico': {
    edbId: 'jl6uxZV',
    edbName: 'band two legs calf raise (band under both legs)',
    gifUrl: 'https://static.exercisedb.dev/media/jl6uxZV.gif',
    equipments: ['band'],
    targetMuscles: ['calves'],
    isSurrogate: true,
    surrogateNote: "Avampiede su rialzo per range maggiore. Elastico ai fianchi con maniglie, oppure dietro le spalle se troppo lungo.",
  },
};

// Match approvati per CODICE catalogo (EX###). 39 voci — lookup via ?code=EX###.
// DB key = il codice stesso (exercise_name_it = 'EX001' ecc.), no collisione con nomi italiani.
// GIF Storage path = {edbId}.gif (riuso trasparente se lo stesso edbId e' gia' in cache).
// Esercizi deliberatamente senza GIF (risposta 'missing'):
//   EX021 Plank, EX030 Band pull apart, EX036 Bird dog,
//   EX051 Squat a corpo libero, EX053 Shadow boxing.
//   EX034 usa immagine statica Wger (nessuna GIF disponibile su ExerciseDB).
const MATCH_BY_CODE = {
  'EX001': { edbId: '4x5Okof',  gifUrl: 'https://static.exercisedb.dev/media/4x5Okof.gif',  isSurrogate: false, surrogateNote: null },
  'EX002': { edbId: 'EIeI8Vf',  gifUrl: 'https://static.exercisedb.dev/media/EIeI8Vf.gif',  isSurrogate: false, surrogateNote: null },
  'EX003': { edbId: '7E06s6d',  gifUrl: 'https://static.exercisedb.dev/media/7E06s6d.gif',  isSurrogate: true,  surrogateNote: "Nella GIF c'è un tocco al petto: tu fai il push-up normale, senza toccare." },
  'EX006': { edbId: 'A6wtbuL',  gifUrl: 'https://static.exercisedb.dev/media/A6wtbuL.gif',  isSurrogate: false, surrogateNote: null },
  'EX008': { edbId: '0V2YQjW',  gifUrl: 'https://static.exercisedb.dev/media/0V2YQjW.gif',  isSurrogate: false, surrogateNote: null },
  'EX009': { edbId: '4c9BhzB',  gifUrl: 'https://static.exercisedb.dev/media/4c9BhzB.gif',  isSurrogate: false, surrogateNote: null },
  'EX011': { edbId: 'BJ0Hz5L',  gifUrl: 'https://static.exercisedb.dev/media/BJ0Hz5L.gif',  isSurrogate: false, surrogateNote: null },
  'EX013': { edbId: 'DhMl549',  gifUrl: 'https://static.exercisedb.dev/media/DhMl549.gif',  isSurrogate: false, surrogateNote: null },
  'EX015': { edbId: 'IZVHb27',  gifUrl: 'https://static.exercisedb.dev/media/IZVHb27.gif',  isSurrogate: false, surrogateNote: null },
  'EX016': { edbId: '10Z2DXU',  gifUrl: 'https://static.exercisedb.dev/media/10Z2DXU.gif',  isSurrogate: false, surrogateNote: null },
  'EX017': { edbId: 'qKBpF7I',  gifUrl: 'https://static.exercisedb.dev/media/qKBpF7I.gif',  isSurrogate: false, surrogateNote: null },
  'EX018': { edbId: 'wQ2c4XD',  gifUrl: 'https://static.exercisedb.dev/media/wQ2c4XD.gif',  isSurrogate: false, surrogateNote: null },
  'EX022': { edbId: 'iny3m5y',  gifUrl: 'https://static.exercisedb.dev/media/iny3m5y.gif',  isSurrogate: false, surrogateNote: null },
  'EX023': { edbId: '9pa4H5m',  gifUrl: 'https://static.exercisedb.dev/media/9pa4H5m.gif',  isSurrogate: false, surrogateNote: null },
  'EX024': { edbId: 'NbVPDMW',  gifUrl: 'https://static.exercisedb.dev/media/NbVPDMW.gif',  isSurrogate: false, surrogateNote: null },
  'EX026': { edbId: 'gAwDzB3',  gifUrl: 'https://static.exercisedb.dev/media/gAwDzB3.gif',  isSurrogate: false, surrogateNote: null },
  'EX028': { edbId: 'bJYHBIN',  gifUrl: 'https://static.exercisedb.dev/media/bJYHBIN.gif',  isSurrogate: false, surrogateNote: null },
  'EX031': { edbId: 'RJgzwny',  gifUrl: 'https://static.exercisedb.dev/media/RJgzwny.gif',  isSurrogate: false, surrogateNote: null },
  'EX037': { edbId: '5VXmnV5',  gifUrl: 'https://static.exercisedb.dev/media/5VXmnV5.gif',  isSurrogate: false, surrogateNote: null },
  'EX041': { edbId: 'aXtJhlg',  gifUrl: 'https://static.exercisedb.dev/media/aXtJhlg.gif',  isSurrogate: false, surrogateNote: null },
  'EX043': { edbId: 'GOJKFfO',  gifUrl: 'https://static.exercisedb.dev/media/GOJKFfO.gif',  isSurrogate: false, surrogateNote: null },
  'EX047': { edbId: '9E25EOx',  gifUrl: 'https://static.exercisedb.dev/media/9E25EOx.gif',  isSurrogate: true,  surrogateNote: "Nella GIF il piede posteriore è a terra; tu lo tieni rialzato su una panca (Bulgarian)." },
  'EX048': { edbId: '1g5bPpA',  gifUrl: 'https://static.exercisedb.dev/media/1g5bPpA.gif',  isSurrogate: false, surrogateNote: null },
  'EX049': { edbId: 'ealLwvX',  gifUrl: 'https://static.exercisedb.dev/media/ealLwvX.gif',  isSurrogate: false, surrogateNote: null },
  'EX050': { edbId: 'zfNHMN9',  gifUrl: 'https://static.exercisedb.dev/media/zfNHMN9.gif',  isSurrogate: false, surrogateNote: null },
  'EX052': { edbId: 'kMzUs9Y',  gifUrl: 'https://static.exercisedb.dev/media/kMzUs9Y.gif',  isSurrogate: false, surrogateNote: null },
  'EX054': { edbId: 'dK9394r',  gifUrl: 'https://static.exercisedb.dev/media/dK9394r.gif',  isSurrogate: false, surrogateNote: null },
  'EX055': { edbId: 'DsgkuIt',  gifUrl: 'https://static.exercisedb.dev/media/DsgkuIt.gif',  isSurrogate: false, surrogateNote: null },
  'EX057': { edbId: 'fTlkJop',  gifUrl: 'https://static.exercisedb.dev/media/fTlkJop.gif',  isSurrogate: false, surrogateNote: null },
  'EX059': { edbId: 'EAs3xL9',  gifUrl: 'https://static.exercisedb.dev/media/EAs3xL9.gif',  isSurrogate: false, surrogateNote: null },
  'EX061': { edbId: 'hacCyUv',  gifUrl: 'https://static.exercisedb.dev/media/hacCyUv.gif',  isSurrogate: false, surrogateNote: null },
  'EX062': { edbId: 'en550rk',  gifUrl: 'https://static.exercisedb.dev/media/en550rk.gif',  isSurrogate: false, surrogateNote: null },
  'EX064': { edbId: 'C5jncD2',  gifUrl: 'https://static.exercisedb.dev/media/C5jncD2.gif',  isSurrogate: false, surrogateNote: null },
  'EX066': { edbId: '9JprnPh',  gifUrl: 'https://static.exercisedb.dev/media/9JprnPh.gif',  isSurrogate: false, surrogateNote: null },
  'EX098': { edbId: 'P9ZRyLT',  gifUrl: 'https://static.exercisedb.dev/media/P9ZRyLT.gif',  isSurrogate: false, surrogateNote: null },
  'EX101': { edbId: 'x306lCW',  gifUrl: 'https://static.exercisedb.dev/media/x306lCW.gif',  isSurrogate: false, surrogateNote: null },
  'EX117': { edbId: 'DFGXwZr',  gifUrl: 'https://static.exercisedb.dev/media/DFGXwZr.gif',  isSurrogate: false, surrogateNote: null },
  'EX119': { edbId: '7WaDzyL',  gifUrl: 'https://static.exercisedb.dev/media/7WaDzyL.gif',  isSurrogate: false, surrogateNote: null },
  'EX120': { edbId: 'K9VL0Jq',  gifUrl: 'https://static.exercisedb.dev/media/K9VL0Jq.gif',  isSurrogate: false, surrogateNote: null },
  'EX034': { edbId: null,       gifUrl: 'https://wger.de/media/exercise-images/454/447f3c17-405f-46e0-b138-65c2a8caaab0.png', isSurrogate: true, surrogateNote: 'Immagine illustrativa Wger (CC BY-SA 4.0) — stesso movimento: posizione a V, testa verso il basso, gomiti si piegano e risalgono.' },
};

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

async function supabaseSelectByName(env, name) {
  const q = new URL(`${SUPABASE_URL}/rest/v1/exercise_media`);
  q.searchParams.set('exercise_name_it', `eq.${name}`);
  q.searchParams.set('select', '*');
  q.searchParams.set('limit', '1');
  const r = await fetch(q.toString(), {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  if (!r.ok) throw new Error(`Supabase select failed: ${r.status} ${(await r.text()).slice(0, 200)}`);
  const rows = await r.json();
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

async function supabaseUpsertRow(env, row) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/exercise_media?on_conflict=exercise_name_it`, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(row),
  });
  if (!r.ok) throw new Error(`Supabase upsert failed: ${r.status} ${(await r.text()).slice(0, 200)}`);
  const data = await r.json();
  return Array.isArray(data) ? data[0] : data;
}

async function supabasePatchByName(env, name, fields) {
  const url = `${SUPABASE_URL}/rest/v1/exercise_media?exercise_name_it=eq.${encodeURIComponent(name)}`;
  const r = await fetch(url, {
    method: 'PATCH',
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(fields),
  });
  if (!r.ok) throw new Error(`Supabase patch failed: ${r.status} ${(await r.text()).slice(0, 200)}`);
  const data = await r.json();
  return Array.isArray(data) ? data[0] : data;
}

async function uploadToStorage(env, path, buffer, contentType) {
  const url = `${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${path}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': contentType || 'application/octet-stream',
      'x-upsert': 'true',
    },
    body: buffer,
  });
  if (!r.ok) throw new Error(`Storage upload failed: ${r.status} ${(await r.text()).slice(0, 200)}`);
  return `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`;
}

async function storageObjectExists(publicUrl) {
  const r = await fetch(publicUrl, { method: 'HEAD' });
  return r.ok;
}

// Logica condivisa per name-lookup e code-lookup.
// key  = exercise_name_it usato come chiave DB (nome italiano oppure codice EX###)
// match = { edbId, gifUrl, isSurrogate, surrogateNote }
async function handleMediaLookup(env, key, match) {
  // 1) DB cache: fast-path SOLO se stato 'cached' E exercisedb_id allineato al match
  //    corrente (se il match cambia edbId, la riga va riprocessata).
  //    Metadata sync: se is_surrogate o surrogate_note in DB differiscono, PATCH soli quei
  //    campi (no re-download). Cosi cambi di nota/flag si propagano da soli.
  const existing = await supabaseSelectByName(env, key);
  if (existing && existing.status === 'cached' && existing.exercisedb_id === match.edbId) {
    const matchSurrogate = !!match.isSurrogate;
    const matchNote = match.surrogateNote ?? null;
    const dbSurrogate = !!existing.is_surrogate;
    const dbNote = existing.surrogate_note ?? null;
    const metaDrift = (dbSurrogate !== matchSurrogate) || (dbNote !== matchNote);

    let row = existing;
    let metaSynced = false;
    if (metaDrift) {
      row = await supabasePatchByName(env, key, {
        is_surrogate: matchSurrogate,
        surrogate_note: matchNote,
        last_updated: new Date().toISOString(),
      });
      metaSynced = true;
    }

    return jsonResponse({
      status: 'cached',
      cached_url: row.cached_url,
      is_surrogate: row.is_surrogate ?? false,
      surrogate_note: row.surrogate_note ?? null,
      source: row.source ?? 'exercisedb',
      from_cache: true,
      meta_synced: metaSynced,
    });
  }
  // existing null / status non-cached / exercisedb_id mismatch -> riprocessa (overwrite)

  // 2) Storage path: {edbId}.{ext} se edbId presente, altrimenti filename da gifUrl.
  //    Supporta sia GIF (ExerciseDB) che PNG (Wger e altre fonti statiche).
  const mediaExt = (match.gifUrl.split('.').pop().split('?')[0] || 'gif').toLowerCase();
  const storagePath = match.edbId
    ? `${match.edbId}.${mediaExt}`
    : match.gifUrl.split('/').pop().split('?')[0];
  const cachedUrl = `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${storagePath}`;

  // 3) HEAD check: se la GIF e' gia' su Storage (caricata da mapping precedente),
  //    salta download da ExerciseDB e upload.
  const reusedExisting = await storageObjectExists(cachedUrl);

  let bytesUploaded = null;
  if (!reusedExisting) {
    const gifResp = await fetch(match.gifUrl);
    if (!gifResp.ok) {
      return jsonResponse({
        error: 'GIF download failed',
        gifUrl: match.gifUrl,
        status: gifResp.status,
      }, 502);
    }
    const gifBuffer = await gifResp.arrayBuffer();
    bytesUploaded = gifBuffer.byteLength;
    const contentType = mediaExt === 'png' ? 'image/png' : 'image/gif';
    await uploadToStorage(env, storagePath, gifBuffer, contentType);
  }

  // 4) Upsert riga DB (cached_url punta sempre a {edbId}.gif)
  const inserted = await supabaseUpsertRow(env, {
    exercise_name_it: key,
    exercisedb_id: match.edbId,
    cached_url: cachedUrl,
    status: 'cached',
    is_surrogate: match.isSurrogate ?? false,
    surrogate_note: match.surrogateNote ?? null,
    source: match.edbId ? 'exercisedb' : 'wger',
  });

  return jsonResponse({
    status: 'cached',
    cached_url: cachedUrl,
    is_surrogate: match.isSurrogate ?? false,
    surrogate_note: match.surrogateNote ?? null,
    exercisedb_id: match.edbId,
    gif_size_bytes: bytesUploaded,
    reused_existing_file: reusedExisting,
    from_cache: false,
    db_row: inserted,
  });
}

async function handleExerciseMedia(request, env) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }
  if (request.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const name = url.searchParams.get('name');

  if (!code && !name) {
    return jsonResponse({ error: 'Missing query param: name or code' }, 400);
  }

  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, 500);
  }

  try {
    // --- Lookup per CODICE (EX###) ---
    if (code) {
      const match = MATCH_BY_CODE[code];
      if (!match) {
        return jsonResponse({ status: 'missing', message: 'No approved match for this code yet' });
      }
      // Il codice stesso e' la chiave DB (exercise_name_it = 'EX001' ecc.)
      return await handleMediaLookup(env, code, match);
    }

    // --- Lookup per NOME (20 storici, comportamento invariato) ---
    const match = MATCH_DATA[name];
    if (!match) {
      return jsonResponse({ status: 'missing', message: 'No approved match for this name yet' });
    }
    return await handleMediaLookup(env, name, match);
  } catch (e) {
    return jsonResponse({ error: e.message }, 500);
  }
}

async function handleGroqProxy(request, env) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await request.json();
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: body.messages,
        max_tokens: body.max_tokens || 400,
        temperature: 0.3,
      }),
    });
    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    return jsonResponse({ content: [{ type: 'text', text }] });
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/exercise-media') {
      return handleExerciseMedia(request, env);
    }
    return handleGroqProxy(request, env);
  },
};
