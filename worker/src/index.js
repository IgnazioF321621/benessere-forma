// Cloudflare Worker — Zona Tracker AI Proxy + Exercise Media cache
// Routes:
//   POST /                 -> proxy Groq (compat backwards: tutto il traffico esistente)
//   GET  /exercise-media   -> lookup cache Supabase + auto-fill da ExerciseDB

const SUPABASE_URL = 'https://qxiyeiahpoiliwpqslpr.supabase.co';
const STORAGE_BUCKET = 'exercise-media';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Match approvati esercizio-per-esercizio da Ignazio.
// Storage layout: cached_url punta a {edbId}.gif (1 GIF per exerciseId, riuso fra
// piu' nomi italiani che mappano allo stesso esercizio ExerciseDB).
// Per aggiungere un esercizio: append qui dopo conferma manuale.
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

async function handleExerciseMedia(request, env) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }
  if (request.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const url = new URL(request.url);
  const name = url.searchParams.get('name');
  if (!name) return jsonResponse({ error: 'Missing query param: name' }, 400);

  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, 500);
  }

  try {
    // 1) MATCH_DATA = source of truth. Nessuna approvazione manuale = missing
    //    (NIENTE insert speculativo in DB: cosi se in futuro aggiungiamo il match,
    //     la riga viene scritta solo come 'cached' al primo trigger).
    const match = MATCH_DATA[name];
    if (!match) {
      return jsonResponse({ status: 'missing', message: 'No approved match for this name yet' });
    }

    // 2) DB cache: fast-path SOLO se stato 'cached' E exercisedb_id allineato al match
    //    corrente (se MATCH_DATA cambia edbId, la riga va riprocessata).
    //    Metadata sync: se is_surrogate o surrogate_note in DB differiscono da MATCH_DATA,
    //    PATCH soli quei campi (no re-download). Cosi cambi di nota/flag si propagano da soli.
    const existing = await supabaseSelectByName(env, name);
    if (existing && existing.status === 'cached' && existing.exercisedb_id === match.edbId) {
      const matchSurrogate = !!match.isSurrogate;
      const matchNote = match.surrogateNote ?? null;
      const dbSurrogate = !!existing.is_surrogate;
      const dbNote = existing.surrogate_note ?? null;
      const metaDrift = (dbSurrogate !== matchSurrogate) || (dbNote !== matchNote);

      let row = existing;
      let metaSynced = false;
      if (metaDrift) {
        row = await supabasePatchByName(env, name, {
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

    // 3) Storage path = {edbId}.gif (riuso fra nomi italiani con stesso esercizio EDB)
    const storagePath = `${match.edbId}.gif`;
    const cachedUrl = `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${storagePath}`;

    // 4) HEAD check: se la GIF e' gia' su Storage (caricata da una mapping precedente),
    //    saltiamo download da ExerciseDB e upload.
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
      await uploadToStorage(env, storagePath, gifBuffer, 'image/gif');
    }

    // 5) Upsert riga DB (cached_url punta sempre a {edbId}.gif)
    const inserted = await supabaseUpsertRow(env, {
      exercise_name_it: name,
      exercisedb_id: match.edbId,
      cached_url: cachedUrl,
      status: 'cached',
      is_surrogate: match.isSurrogate ?? false,
      surrogate_note: match.surrogateNote ?? null,
      source: 'exercisedb',
    });

    return jsonResponse({
      status: 'cached',
      cached_url: cachedUrl,
      is_surrogate: match.isSurrogate ?? false,
      surrogate_note: match.surrogateNote ?? null,
      exercisedb_match: match.edbName,
      exercisedb_id: match.edbId,
      gif_size_bytes: bytesUploaded,
      reused_existing_file: reusedExisting,
      from_cache: false,
      db_row: inserted,
    });
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
