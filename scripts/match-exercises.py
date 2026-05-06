import json

my_exercises = [
    {"id": 1, "it": "Trazioni alla sbarra", "keywords": ["pull-up", "pull up"]},
    {"id": 2, "it": "Chest press in piedi con elastico", "keywords": ["band chest press", "resistance band chest"]},
    {"id": 3, "it": "Shoulder press in piedi con elastico", "keywords": ["band shoulder press", "band overhead press"]},
    {"id": 4, "it": "Row in piedi con elastico", "keywords": ["band row", "resistance band row"]},
    {"id": 5, "it": "Face pull con elastico", "keywords": ["band face pull", "face pull"]},
    {"id": 6, "it": "Inverted row con elastico", "keywords": ["inverted row", "band inverted row"]},
    {"id": 7, "it": "Chest press inclinata su panca", "keywords": ["incline bench press", "incline dumbbell press"]},
    {"id": 8, "it": "Lateral raise con elastico", "keywords": ["band lateral raise", "lateral raise"]},
    {"id": 9, "it": "Row inclinato in piedi busto 45 gradi", "keywords": ["bent over row", "bent-over row"]},
    {"id": 10, "it": "Curl bicipiti con elastico", "keywords": ["band curl", "biceps curl band"]},
    {"id": 11, "it": "Tricipiti overhead con elastico", "keywords": ["band overhead extension", "triceps overhead band"]},
    {"id": 12, "it": "Bulgarian split squat con elastico", "keywords": ["bulgarian split squat", "rear foot elevated split squat"]},
    {"id": 13, "it": "Romanian deadlift con elastico", "keywords": ["romanian deadlift", "band rdl"]},
    {"id": 14, "it": "Hip thrust con elastico", "keywords": ["hip thrust", "band hip thrust"]},
    {"id": 15, "it": "Glute bridge isometrico con cavigliera", "keywords": ["glute bridge", "ankle weight glute bridge"]},
    {"id": 16, "it": "Squat con elastico e talloni rialzati", "keywords": ["heels elevated squat", "band squat"]},
    {"id": 17, "it": "Single leg Romanian deadlift con elastico", "keywords": ["single leg romanian deadlift", "single leg rdl"]},
    {"id": 18, "it": "Hip thrust con elastico TUT alto", "keywords": ["hip thrust", "band hip thrust"]},
    {"id": 19, "it": "Leg curl con elastico sulla fitball", "keywords": ["stability ball leg curl", "swiss ball leg curl"]},
    {"id": 20, "it": "Calf raise con elastico", "keywords": ["calf raise", "band calf raise"]}
]

with open('/Users/ignaziofiorito/benessere-forma/scripts/exercisedb-catalog.json') as f:
    catalog_raw = json.load(f)

if isinstance(catalog_raw, list):
    catalog = catalog_raw
elif 'data' in catalog_raw:
    catalog = catalog_raw['data']
elif 'exercises' in catalog_raw:
    catalog = catalog_raw['exercises']
else:
    catalog = catalog_raw

print(f"Catalogo: {len(catalog)} esercizi totali\n")
print(f"{'ID':<3} {'Esercizio (IT)':<45} {'Match'}")
print("-" * 100)

for ex in my_exercises:
    matches = []
    for entry in catalog:
        name = entry.get('name', '').lower()
        for kw in ex['keywords']:
            if kw.lower() in name:
                matches.append({
                    'name': entry.get('name'),
                    'id': entry.get('exerciseId') or entry.get('id'),
                    'gif': entry.get('gifUrl', '')
                })
                break

    seen = set()
    unique = []
    for m in matches:
        if m['name'] not in seen:
            seen.add(m['name'])
            unique.append(m)
    top = unique[:3]

    if top:
        status = f"{len(unique)} match: " + ", ".join([m['name'] for m in top])
    else:
        status = "NESSUN MATCH"

    print(f"{ex['id']:<3} {ex['it'][:44]:<45} {status[:50]}")

results = []
for ex in my_exercises:
    matches = []
    for entry in catalog:
        name = entry.get('name', '').lower()
        for kw in ex['keywords']:
            if kw.lower() in name:
                matches.append({
                    'name': entry.get('name'),
                    'id': entry.get('exerciseId') or entry.get('id'),
                    'gifUrl': entry.get('gifUrl', ''),
                    'equipments': entry.get('equipments', []),
                    'targetMuscles': entry.get('targetMuscles', [])
                })
                break
    seen = set()
    unique = [m for m in matches if not (m['name'] in seen or seen.add(m['name']))]
    results.append({**ex, 'matches': unique[:5]})

with open('/Users/ignaziofiorito/benessere-forma/scripts/match-results.json', 'w') as f:
    json.dump(results, f, indent=2)
print(f"\nRisultati completi salvati in: scripts/match-results.json")
